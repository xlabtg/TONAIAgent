# HSM Setup Guide

This guide explains how to configure Hardware Security Module (HSM) key storage for TONAIAgent in production environments.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Registry (Persistence)](#key-registry-persistence)
3. [Provider Selection](#provider-selection)
4. [AWS KMS Setup](#aws-kms-setup)
5. [Azure Key Vault Setup](#azure-key-vault-setup)
6. [Mock HSM (CI / Local Dev)](#mock-hsm-ci--local-dev)
7. [Health Check & Readiness Probe](#health-check--readiness-probe)
8. [Key Rotation](#key-rotation)
9. [Environment Variables Reference](#environment-variables-reference)
10. [Troubleshooting](#troubleshooting)

---

## Overview

TONAIAgent uses an HSM (or equivalent cloud KMS) to ensure that **private key material never leaves secure hardware**. The `HSMKeyStorage` class in `core/security/key-management.ts` wraps provider-specific adapters behind a common interface.

```
┌──────────────────────────┐
│  SecureKeyManager        │
│  (key lifecycle, MPC…)   │
└────────────┬─────────────┘
             │ uses
┌────────────▼─────────────┐
│  HSMKeyStorage           │
│  (provider-agnostic API) │
└────────────┬─────────────┘
             │ delegates to
      ┌──────┴───────┐
      │              │
 AwsKmsAdapter  AzureKeyVaultAdapter
 (AWS KMS /     (Azure Key Vault
  CloudHSM)      Managed HSM)
```

### Algorithm Support

| Provider      | Ed25519 | secp256k1 | Notes |
|---------------|---------|-----------|-------|
| AWS KMS       | ✗ blocked by capability guard | ✓ native (`ECC_SECG_P256K1`) | CloudHSM PKCS#11 supports Ed25519 |
| Azure Key Vault | ✗ blocked by capability guard | ✗ blocked by capability guard | Managed HSM — no TON-compatible algorithms today |
| Mock (dev/CI) | ✓ | ✓ | `node:crypto` — real crypto, no hardware |

> **TON signing topology (issue #332):** TON blockchain requires **Ed25519** signatures. AWS KMS and Azure Key Vault cannot produce native Ed25519 today — earlier revisions of these adapters silently fell back to P-256, which is **not TON-verifiable**. Every `HSMProviderAdapter` now exposes a `supportsAlgorithm(alg)` capability, and both `HSMKeyStorage.generateKeyPair` and `SecureKeyManager.generateKey` **fail fast** when an Ed25519 key is requested on a provider that does not support it. Production TON signing must go through [`MPCCoordinator`](./mpc-architecture.md); HSM adapters remain available for auxiliary (non-TON) keys such as session tokens or `secp256k1` material.

### TON Custody Decision (issue #332)

| Path | Algorithm | Who uses it |
|------|-----------|-------------|
| MPC (PR #322) | Ed25519 ✅ | **All TON transactions** |
| HSM mock (PR #323) | Ed25519 ✅ | CI / local dev only (`NODE_ENV !== production`) |
| HSM AWS KMS (PR #323) | `secp256k1` only | Auxiliary keys (session tokens, non-TON signing) |
| HSM Azure Key Vault (PR #323) | ✗ | Not supported for TON or auxiliary keys — use AWS KMS or MPC |
| Future: YubiHSM 2, Thales Luna, AWS CloudHSM PKCS#11 | Ed25519 ✅ | Hardware-backed TON custody (see [Future Providers](#future-providers)) |

The runtime guard makes this decision enforced by code rather than documentation: attempting to generate `ed25519` on AWS KMS throws, and attempting to `createSigningRequest` against an Ed25519 key without MPC shares on an HSM that cannot produce Ed25519 also throws.

---

## Key Registry (Persistence)

### The Problem

`AwsKmsAdapter` and `AzureKeyVaultAdapter` previously maintained the mapping from
application-level `keyId` to the KMS ARN / Azure key name in an **in-memory `Map`**.
If the process restarted, this mapping was destroyed.  Every existing key then became
inaccessible — even though the key material remained intact inside the HSM — because
there was no way to route signing requests to the correct ARN.  For a production wallet
service this could render user funds un-spendable.

Issue [#343](https://github.com/xlabtg/TONAIAgent/issues/343) introduced a pluggable
`KeyRegistry` interface and three backends to fix this.

### Architecture

```
AwsKmsAdapter / AzureKeyVaultAdapter
         │
         │ reads/writes
         ▼
    KeyRegistry  ◄──── NODE_HSM_REGISTRY=postgres|file|memory
         │
    ┌────┴─────────────────────┐
    │  MemoryKeyRegistry       │  (dev/CI — NOT production)
    │  FileKeyRegistry         │  (single-node staging)
    │  PostgresKeyRegistry     │  (recommended for production)
    └──────────────────────────┘
```

### Backend Selection

Set `NODE_HSM_REGISTRY` (or pass `registryType` in `HSMConfig`):

| Value      | Suitable for | Notes |
|------------|-------------|-------|
| `memory`   | Dev / CI    | Lost on restart. Warns in `NODE_ENV=production` |
| `file`     | Single-node staging | Atomic writes; survives restarts |
| `postgres` | Production  | Transactional; multi-node safe |

```bash
# Staging
NODE_HSM_REGISTRY=file
NODE_HSM_REGISTRY_FILE=/var/lib/tonaiagent/hsm-registry.json

# Production
NODE_HSM_REGISTRY=postgres
NODE_HSM_REGISTRY_PG_URL=postgres://user:pass@host:5432/tonaiagent
NODE_HSM_REGISTRY_PG_TABLE=hsm_key_registry   # default
```

Or in TypeScript config:

```typescript
const manager = createKeyManager({
  storageType: 'hsm',
  hsm: {
    provider: 'aws_kms',
    operationTimeout: 10000,
    awsRegion: 'us-east-1',
    registryType: 'postgres',   // 'file' | 'postgres' | 'memory'
  },
});
```

### Postgres Schema

The Postgres backend creates the table automatically on first use:

```sql
CREATE TABLE IF NOT EXISTS hsm_key_registry (
  key_id       TEXT        PRIMARY KEY,
  provider_ref TEXT        NOT NULL,
  provider     TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ
);
```

The `provider_ref` column stores the KMS ARN or Azure key name.  The ARN itself is
not secret (IAM policies protect access), but you may wish to restrict SELECT access
on this table to the TONAIAgent service account only.

### Migration from In-Memory Mappings

If you were running with the old in-memory registry and have a JSON backup of your
key mappings, use the migration utility:

```typescript
import { migrateFromJsonFile } from 'core/security/hsm/registry/migrate';

// backup.json format:
// { "entries": [{ "keyId": "...", "providerRef": "arn:...", "provider": "aws_kms" }] }
await migrateFromJsonFile('./backup.json');
```

Or from the command line:

```bash
NODE_HSM_REGISTRY=postgres NODE_HSM_REGISTRY_PG_URL=postgres://... \
  node -e "require('./core/security/hsm/registry/migrate').migrateFromJsonFile('./backup.json')"
```

### Disaster Recovery

- **Postgres**: Standard PostgreSQL backup (pg_dump) captures the registry.  
  Restore procedure: restore DB, restart TONAIAgent — the ARN lookups resume automatically.
- **File**: Back up `NODE_HSM_REGISTRY_FILE` alongside other service data.  
  Copy to the new host; set `NODE_HSM_REGISTRY_FILE` to its path.
- **Memory** (dev only): No DR — registry is ephemeral by design.

---

## Provider Selection

Set the `provider` field in `HSMConfig`, or set the `NODE_HSM_PROVIDER` environment variable:

```typescript
import { createKeyManager } from '@tonaiagent/core/security';

const manager = createKeyManager({
  storageType: 'hsm',
  hsm: {
    provider: 'aws_kms',   // or 'azure_hsm', 'mock'
    operationTimeout: 10000,
    awsRegion: 'us-east-1',
  },
});
```

---

## AWS KMS Setup

### Prerequisites

- AWS account with KMS access
- IAM role/user with permissions:
  - `kms:CreateKey`
  - `kms:Sign`
  - `kms:GetPublicKey`
  - `kms:ScheduleKeyDeletion`
  - `kms:ListKeys` (for health check)
- Node.js package: `npm install @aws-sdk/client-kms`

### IAM Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:CreateKey",
        "kms:Sign",
        "kms:GetPublicKey",
        "kms:ScheduleKeyDeletion",
        "kms:ListKeys",
        "kms:TagResource"
      ],
      "Resource": "*"
    }
  ]
}
```

### Configuration

```typescript
const manager = createKeyManager({
  storageType: 'hsm',
  hsm: {
    provider: 'aws_kms',
    operationTimeout: 10000,
    awsRegion: process.env.AWS_REGION,
    // Explicit credentials (prefer IAM roles / env vars in production)
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
```

The adapter uses the AWS SDK's default credential chain when `awsAccessKeyId` / `awsSecretAccessKey` are not provided — this means ECS task roles, EC2 instance profiles, and environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`) all work automatically.

### AWS CloudHSM (Custom Key Store)

Use `provider: 'aws_cloudhsm'` — this uses the same AWS KMS SDK but routes operations through a KMS custom key store backed by CloudHSM:

1. Create a CloudHSM cluster.
2. Create a KMS custom key store pointing at the cluster.
3. Set `clusterId` in the config to the custom key store ID.

```typescript
hsm: {
  provider: 'aws_cloudhsm',
  clusterId: 'kmsckstore-xxxxxxxxxxxxxxxxxxxx',
  awsRegion: 'us-east-1',
}
```

---

## Azure Key Vault Setup

### Prerequisites

- Azure subscription with Key Vault (Premium tier or Managed HSM)
- Service principal with role: `Key Vault Crypto Officer`
- Node.js packages: `npm install @azure/keyvault-keys @azure/identity`

### Create Key Vault (Azure CLI)

```bash
# Create resource group
az group create --name rg-tonaiagent --location eastus

# Create Key Vault (Premium tier for HSM-backed keys)
az keyvault create \
  --name kv-tonaiagent-prod \
  --resource-group rg-tonaiagent \
  --location eastus \
  --sku Premium

# Create service principal
az ad sp create-for-rbac --name sp-tonaiagent-kv --skip-assignment

# Assign role
az keyvault set-policy \
  --name kv-tonaiagent-prod \
  --spn <SP_APP_ID> \
  --key-permissions create get sign delete list
```

### Configuration

```typescript
hsm: {
  provider: 'azure_hsm',
  operationTimeout: 15000,
  azureKeyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
  azureTenantId: process.env.AZURE_TENANT_ID,
  azureClientId: process.env.AZURE_CLIENT_ID,
  azureClientSecret: process.env.AZURE_CLIENT_SECRET,
}
```

When `azureTenantId`/`azureClientId`/`azureClientSecret` are omitted, the `DefaultAzureCredential` is used — supporting managed identities, environment variables, and Azure CLI authentication automatically.

---

## Mock HSM (CI / Local Dev)

The `mock` provider uses `node:crypto` in-process and is the default when no provider is explicitly configured (outside of production). It is suitable for:

- Unit and integration tests
- Local development

```typescript
// Development / CI — no extra dependencies needed
const manager = createKeyManager({
  storageType: 'hsm',
  hsm: { provider: 'mock', operationTimeout: 1000 },
});
```

The mock provider is **blocked in `NODE_ENV=production`** unless `mockAllowProduction: true` is set (never do this for real deployments).

### Running HSM Tests

```bash
# Mock tests (always run, no credentials needed)
npm test tests/security/hsm-integration.test.ts

# AWS KMS tests (requires valid AWS credentials)
AWS_KMS_TEST=true AWS_REGION=us-east-1 npm test tests/security/hsm-integration.test.ts

# Azure Key Vault tests (requires valid Azure credentials)
AZURE_KV_TEST=true \
  AZURE_KEY_VAULT_URL=https://kv-tonaiagent-prod.vault.azure.net \
  AZURE_TENANT_ID=<tenant> \
  AZURE_CLIENT_ID=<clientId> \
  AZURE_CLIENT_SECRET=<secret> \
  npm test tests/security/hsm-integration.test.ts
```

---

## Health Check & Readiness Probe

`HSMKeyStorage.healthCheck()` calls the HSM provider to verify connectivity:

| Provider | Health Check Operation |
|----------|------------------------|
| mock     | Always returns `true`  |
| aws_kms  | `kms:ListKeys` (limit 1) |
| azure_hsm | First item of `listPropertiesOfKeys()` |

The `SecureKeyManager.getHealth()` method surfaces this as `hsmConnected`:

```typescript
const health = await manager.getHealth();
// { available: true, hsmConnected: true, ... }
```

Expose this in your readiness probe endpoint (`/health/ready`):

```typescript
app.get('/health/ready', async (req, res) => {
  const health = await keyManager.getHealth();
  if (!health.available || !health.hsmConnected) {
    return res.status(503).json({ status: 'not_ready', health });
  }
  res.json({ status: 'ready', health });
});
```

---

## Key Rotation

Key rotation is handled by `SecureKeyManager.rotateKey(keyId)`:

1. Existing key status → `pending_rotation`
2. New key pair generated in HSM
3. Old key status → `rotated`
4. New key returned as active

```typescript
const newKey = await manager.rotateKey(existingKeyId);
```

Schedule periodic rotation using a cron job or your infrastructure's secret rotation service.

**AWS KMS**: KMS does not auto-rotate asymmetric keys. Trigger rotation via the above API.

**Azure Key Vault**: Key rotation policies can be configured natively in the portal or via CLI — these operate independently and should be reconciled with TONAIAgent's metadata store.

---

## Environment Variables Reference

| Variable | Provider | Description |
|---|---|---|
| `NODE_HSM_PROVIDER` | all | Default HSM provider: `aws_kms`, `azure_hsm`, `mock` |
| `AWS_REGION` | AWS | AWS region (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS | AWS access key (prefer IAM roles) |
| `AWS_SECRET_ACCESS_KEY` | AWS | AWS secret key (prefer IAM roles) |
| `AWS_SESSION_TOKEN` | AWS | AWS session token (for temporary credentials) |
| `AZURE_KEY_VAULT_URL` | Azure | Key Vault URL, e.g. `https://kv-name.vault.azure.net` |
| `AZURE_TENANT_ID` | Azure | Azure Active Directory tenant ID |
| `AZURE_CLIENT_ID` | Azure | Service principal / app client ID |
| `AZURE_CLIENT_SECRET` | Azure | Service principal client secret |
| `AWS_KMS_TEST` | CI | Set to `true` to run AWS KMS integration tests |
| `AZURE_KV_TEST` | CI | Set to `true` to run Azure Key Vault integration tests |
| `NODE_HSM_REGISTRY` | all | Key registry backend: `postgres` \| `file` \| `memory` (default) |
| `NODE_HSM_REGISTRY_FILE` | file | Path to the JSON registry file (default: `./hsm-key-registry.json`) |
| `NODE_HSM_REGISTRY_PG_URL` | postgres | PostgreSQL connection string |
| `NODE_HSM_REGISTRY_PG_TABLE` | postgres | Registry table name (default: `hsm_key_registry`) |
| `NODE_HSM_REGISTRY_ALLOW_MEMORY_IN_PROD` | memory | Set to `true` to suppress the in-memory production warning |

---

## Troubleshooting

### `@aws-sdk/client-kms` not found

```
Error: AWS KMS adapter requires @aws-sdk/client-kms. Install it with: npm install @aws-sdk/client-kms
```

Install the optional dependency:

```bash
npm install @aws-sdk/client-kms
```

### `@azure/keyvault-keys` not found

```bash
npm install @azure/keyvault-keys @azure/identity
```

### `mock provider is not allowed in production`

Set a real HSM provider in your production environment config. Never use the mock provider with live funds.

### AWS KMS `AccessDeniedException`

Ensure the IAM policy grants the required KMS permissions (see [IAM Policy Example](#iam-policy-example) above).

### Azure `AuthenticationRequiredError`

Verify `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` are set, or that a managed identity is assigned to the compute resource.

---

## Future Providers

- **YubiHSM 2**: Ed25519 native via `yubihsm-shell` / `pkcs11` bindings. Ideal for smaller deployments.
- **Thales Luna**: Enterprise HSM. Requires vendor PKCS#11 library.
- **AWS CloudHSM (direct PKCS#11)**: Full Ed25519 support without KMS custom key store overhead.

Contributions are welcome — implement the `HSMProviderAdapter` interface (see
`core/security/hsm/aws-kms.ts` for the canonical example), pass a `KeyRegistry`
to the constructor, and add tests in `tests/security/hsm-integration.test.ts`.
