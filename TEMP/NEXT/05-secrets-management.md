# Task: Implement Production Secrets Management

**Priority:** HIGH  
**Effort:** ~1 week  
**Related Issue:** #304

## Problem

Critical secrets are loaded directly from environment variables (`process.env`) without:
- Rotation support
- Access audit trail
- Centralized management
- Leak detection

Key secrets in `.env.example`:
- `KEY_ENCRYPTION_KEY` — encrypts all stored keys
- `JWT_SECRET` — signs all session tokens
- `GROQ_API_KEY`, `OPENAI_API_KEY` — AI provider access
- `MPC_*` — MPC configuration

## Acceptance Criteria

- [ ] Integrate AWS Secrets Manager (or HashiCorp Vault for self-hosted)
- [ ] All secrets loaded from secrets manager at startup, not .env
- [ ] Implement secret rotation without downtime (via secret versioning)
- [ ] Add audit log for all secret reads
- [ ] Add secrets health check in readiness probe
- [ ] Implement automatic API key rotation for AI providers
- [ ] Ensure secrets never appear in logs, error messages, or stack traces

## Implementation Approach

### Option A: AWS Secrets Manager (recommended for cloud deployments)

```typescript
// config/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export async function loadSecrets(): Promise<AppSecrets> {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const { SecretString } = await client.send(new GetSecretValueCommand({
    SecretId: `tonaiagent/${process.env.NODE_ENV}/secrets`,
  }));
  return JSON.parse(SecretString!) as AppSecrets;
}
```

### Option B: HashiCorp Vault (self-hosted)

```typescript
import vault from 'node-vault';
const client = vault({ apiVersion: 'v1', endpoint: process.env.VAULT_ADDR });
const secrets = await client.read('secret/tonaiagent');
```

## Secret Categorization

| Secret | Rotation Period | Who Needs It |
|--------|----------------|--------------|
| `KEY_ENCRYPTION_KEY` | 90 days | Key management service only |
| `JWT_SECRET` | 30 days | Auth service only |
| `GROQ_API_KEY` | 60 days | AI layer only |
| `OPENAI_API_KEY` | 60 days | AI layer only |
| `BOT_TOKEN` | On compromise | Telegram service only |

## Files to Create/Modify

- `config/secrets.ts` — secrets loader with caching and rotation
- `config/secrets.types.ts` — AppSecrets interface
- `config/index.ts` — integrate secrets into app startup
- `.env.example` — update to document which vars are needed for local dev only
- `docs/secrets-management.md` — operational runbook

## Security Notes

- Use IAM roles (not access keys) in production AWS deployments
- Rotate `KEY_ENCRYPTION_KEY` with key re-encryption process — document this carefully
- Consider using separate secrets per service (principle of least privilege)
