# Secrets Management — Operational Runbook

This document describes how TONAIAgent manages production secrets, covering:

- Backend options (AWS Secrets Manager, HashiCorp Vault, env fallback)
- Secret rotation procedures
- Audit logging
- Health monitoring
- Emergency revocation

---

## Overview

In production, **all sensitive secrets are loaded from a secrets manager at startup**, not from environment variables or `.env` files. Environment variables are used only for local development.

The secrets manager integration lives in `config/secrets.ts` and is initialized once at application startup via `initSecrets()` / `initConfig()`.

### Secrets Inventory

| Secret | Rotation Period | Who Needs It |
|--------|----------------|--------------|
| `KEY_ENCRYPTION_KEY` | 90 days | Key management service only |
| `JWT_SECRET` | 30 days | Auth service only |
| `GROQ_API_KEY` | 60 days | AI layer only |
| `OPENAI_API_KEY` | 60 days | AI layer only |
| `ANTHROPIC_API_KEY` | 60 days | AI layer only |
| `GOOGLE_API_KEY` | 60 days | AI layer only |
| `XAI_API_KEY` | 60 days | AI layer only |
| `OPENROUTER_API_KEY` | 60 days | AI layer only |
| `TELEGRAM_BOT_TOKEN` | On compromise | Telegram service only |
| `TELEGRAM_WEBHOOK_SECRET` | 90 days | Telegram service only |
| `TONCENTER_API_KEY` | 60 days | TON chain layer only |

---

## Backend Options

### Option A: AWS Secrets Manager (recommended for cloud deployments)

**Prerequisites:**
- AWS account with Secrets Manager enabled
- IAM role for the application with `secretsmanager:GetSecretValue` permission on the target secret
- AWS SDK: `npm install @aws-sdk/client-secrets-manager`

**Create the secret (one-time setup):**

```bash
# Create the secret as a JSON object
aws secretsmanager create-secret \
  --name "tonaiagent/production/secrets" \
  --region us-east-1 \
  --secret-string '{
    "KEY_ENCRYPTION_KEY": "<openssl rand -hex 32>",
    "JWT_SECRET": "<openssl rand -hex 32>",
    "GROQ_API_KEY": "<your-groq-key>",
    "ANTHROPIC_API_KEY": "<your-anthropic-key>",
    "OPENAI_API_KEY": "<your-openai-key>",
    "GOOGLE_API_KEY": "<your-google-key>",
    "XAI_API_KEY": "<your-xai-key>",
    "OPENROUTER_API_KEY": "<your-openrouter-key>",
    "TELEGRAM_BOT_TOKEN": "<your-bot-token>",
    "TELEGRAM_WEBHOOK_SECRET": "<your-webhook-secret>",
    "TONCENTER_API_KEY": "<your-toncenter-key>"
  }'
```

**Required environment variables:**

```bash
SECRETS_BACKEND=aws
AWS_REGION=us-east-1
# SECRETS_ID defaults to tonaiagent/<NODE_ENV>/secrets if not set
SECRETS_ID=tonaiagent/production/secrets
```

**IAM policy (minimum required permissions):**

```json
{
  "Effect": "Allow",
  "Action": ["secretsmanager:GetSecretValue"],
  "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:tonaiagent/production/secrets*"
}
```

> **Security note:** Use IAM roles attached to your EC2/ECS/Lambda instance — not static access keys. Static keys in environment variables defeat the purpose of a secrets manager.

---

### Option B: HashiCorp Vault (self-hosted)

**Prerequisites:**
- Vault server running and unsealed
- Vault token with `read` access to the secret path
- Vault client: `npm install node-vault`

**Store the secret:**

```bash
vault kv put secret/tonaiagent \
  KEY_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  GROQ_API_KEY="your-groq-key" \
  TELEGRAM_BOT_TOKEN="your-bot-token"
  # ... add all remaining secrets
```

**Required environment variables:**

```bash
SECRETS_BACKEND=vault
VAULT_ADDR=https://vault.yourdomain.com:8200
VAULT_TOKEN=your-vault-token
# VAULT_SECRET_PATH defaults to secret/tonaiagent if not set
VAULT_SECRET_PATH=secret/tonaiagent
```

---

### Option C: Environment Variables (local development only)

No `SECRETS_BACKEND` variable needed. Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
# Edit .env with your local development credentials
```

> **Warning:** Never use the env backend in production. It lacks rotation support, audit trails, and centralized management.

---

## Application Startup Integration

Initialize secrets once at application startup before accessing any sensitive value:

```typescript
import { initConfig, appConfig } from './config';

// At the top of main.ts / index.ts:
await initConfig();

// Access non-secret config synchronously:
console.log(`Starting on port ${appConfig.port}`);

// Access secrets asynchronously (with audit trail):
const encryptionKey = await appConfig.secrets.getRequired('KEY_ENCRYPTION_KEY');
const jwtSecret = await appConfig.secrets.getRequired('JWT_SECRET');
```

Or use the secrets singleton directly if you only need secrets:

```typescript
import { initSecrets, secrets } from './config/secrets';

await initSecrets(); // call once at startup

// Later, anywhere in the codebase:
const groqKey = await secrets.get('GROQ_API_KEY');
```

---

## Audit Logging

Every secret read emits an audit event with:
- Secret key name (never the value)
- Whether it was served from cache
- Timestamp
- Optional caller context string

Enable audit logging and subscribe to events:

```typescript
const loader = createSecretsLoader({
  backend: { provider: 'aws', region: 'us-east-1', secretId: '...' },
  auditLog: true,  // default: true in production
});

loader.onAudit((event) => {
  logger.info('Secret accessed', {
    key: event.secretKey,
    fromCache: event.fromCache,
    context: event.context,
    at: event.timestamp.toISOString(),
  });
});
```

Audit logging is **enabled by default in production** (`NODE_ENV=production`) and **disabled in development**.

---

## Secret Rotation

### Standard Rotation (API keys, JWT_SECRET)

For secrets that can be swapped atomically (no dependent encrypted data):

1. Generate a new secret value.
2. Update the secret in your secrets manager:
   ```bash
   # AWS
   aws secretsmanager update-secret \
     --secret-id tonaiagent/production/secrets \
     --secret-string "$(aws secretsmanager get-secret-value \
       --secret-id tonaiagent/production/secrets \
       --query SecretString --output text | \
       jq '.JWT_SECRET = "new-jwt-secret-value"')"
   
   # Vault
   vault kv patch secret/tonaiagent JWT_SECRET="new-jwt-secret-value"
   ```
3. Trigger a cache refresh on running instances:
   ```typescript
   await secrets.refresh();
   ```
   Or restart the application — secrets are reloaded at startup automatically.

### KEY_ENCRYPTION_KEY Rotation (requires key re-encryption)

`KEY_ENCRYPTION_KEY` encrypts all stored user keys. Rotating it requires a **re-encryption pass** — all stored key material must be decrypted with the old key and re-encrypted with the new key before the old key is retired.

> **Do not rotate KEY_ENCRYPTION_KEY without a data migration plan.** Premature rotation will make all stored user keys unreadable.

**Procedure:**

1. **Do not delete the old key yet.** Store it as a secondary key in the secrets manager under `KEY_ENCRYPTION_KEY_OLD`.
2. Run the re-encryption migration job (to be implemented in the key management service):
   ```bash
   # Future migration script:
   npm run migrate:reencrypt-keys
   ```
3. Verify all keys are successfully re-encrypted.
4. Remove `KEY_ENCRYPTION_KEY_OLD` from the secrets manager.
5. Update `KEY_ENCRYPTION_KEY` to the new value.

Until the migration tooling is implemented, **do not rotate `KEY_ENCRYPTION_KEY` without manual coordination**.

---

## Secrets Health Check (Readiness Probe)

Use `loader.getHealth()` in your `/health` or `/readiness` endpoint:

```typescript
import { appConfig } from './config';

app.get('/health/readiness', (req, res) => {
  const secretsHealth = appConfig.secrets.getHealth();

  if (!secretsHealth.healthy) {
    return res.status(503).json({
      status: 'not_ready',
      secrets: secretsHealth,
    });
  }

  res.json({ status: 'ready', secrets: secretsHealth });
});
```

Health response shape:
```json
{
  "healthy": true,
  "provider": "aws",
  "loaded": true,
  "lastRefreshedAt": "2026-04-10T12:00:00.000Z"
}
```

---

## Security Notes

- **Secrets never appear in logs**: The `SecretsLoader` only logs key names, never values. Ensure application code also never logs secrets.
- **Secrets never appear in error messages**: When throwing errors about missing secrets, only the key name is included, not the value.
- **Secrets never appear in stack traces**: The loader does not include secret values in thrown Error objects.
- **Cache TTL**: By default, secrets are cached for 5 minutes to reduce API calls. Adjust with `cacheTtlSeconds` in `SecretsLoaderOptions`.
- **Principle of least privilege**: In production, each service should ideally have access only to the secrets it needs. Consider creating separate Vault paths or AWS secrets per service.
- **Audit all secret access**: Enable audit logging in production and route events to your SIEM or logging platform.

---

## References

- [AWS Secrets Manager Developer Guide](https://docs.aws.amazon.com/secretsmanager/latest/userguide/)
- [HashiCorp Vault KV Secrets Engine](https://developer.hashicorp.com/vault/docs/secrets/kv)
- `config/secrets.ts` — SecretsLoader implementation
- `config/secrets.types.ts` — AppSecrets interface and type definitions
- `config/index.ts` — Application configuration entry point
- `tests/config/secrets.test.ts` — Unit tests
