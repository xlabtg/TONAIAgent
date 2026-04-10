# HSM Setup Guide

This guide explains how to configure Hardware Security Module (HSM) key storage for TONAIAgent in production environments.

---

## Table of Contents

1. [Overview](#overview)
2. [Provider Selection](#provider-selection)
3. [AWS KMS Setup](#aws-kms-setup)
4. [Azure Key Vault Setup](#azure-key-vault-setup)
5. [Mock HSM (CI / Local Dev)](#mock-hsm-ci--local-dev)
6. [Health Check & Readiness Probe](#health-check--readiness-probe)
7. [Key Rotation](#key-rotation)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Troubleshooting](#troubleshooting)

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
| AWS KMS       | ✗ (P-256 used) | ✓ (ECC_SECG_P256K1) | CloudHSM PKCS#11 supports Ed25519 |
| Azure Key Vault | ✗ (P-256 used) | ✓ (P-256K preview) | Managed HSM required for secp256k1 |
| Mock (dev/CI) | ✓ | ✓ | node:crypto — real crypto, no hardware |

> **TON Note:** TON uses Ed25519 natively. For cloud deployments, P-256/ECDSA is used as a managed-HSM-safe alternative with equivalent security. For full Ed25519 support, use AWS CloudHSM with PKCS#11 or a YubiHSM 2 (see [Future Providers](#future-providers)).

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

Contributions are welcome — implement the `HSMProviderAdapter` interface in `core/security/key-management.ts` and add tests in `tests/security/hsm-integration.test.ts`.
