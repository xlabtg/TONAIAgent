# Task: Wire `initConfig()` / `SecretsLoader` to Application Startup

**Priority:** 🟡 MEDIUM
**Effort:** ~3 days
**Related Issue:** #325 (re-audit finding §5)
**Suggested labels:** `backend`, `configuration`, `secrets`, `integration`

## Problem

PR #319 shipped a full `SecretsLoader` implementation — AWS Secrets Manager, HashiCorp Vault, env-fallback, cache, audit callbacks, health check, strict mode — but `initConfig()` is **not called from any entry point in the codebase**. The running application therefore still reads secrets directly from `process.env`, and none of the features (rotation pickup, audit log, strict production checks) are active.

Additionally, the re-audit flagged that the AWS and Vault backend call sites may be incomplete stubs (`GetSecretValueCommand` not fully implemented). This task covers both wiring and verification.

## Acceptance Criteria

- [ ] Call `await initConfig({ backend: ..., strict: NODE_ENV === 'production' })` at every entry point before any business logic runs:
  - `apps/api/src/index.ts` (once it exists — see [`08-http-server-wiring.md`](./08-http-server-wiring.md))
  - `scripts/deploy-*.ts`
  - Any worker / cron process entry points
- [ ] Replace direct `process.env.X` access for secret values with `getSecret('X')`. Non-secret config (feature flags, hostnames) can stay on `process.env` unless it crosses a trust boundary.
- [ ] Verify AWS backend — confirm `GetSecretValueCommand` is wired with pagination / versioning; add a real integration test gated by `AWS_SECRETS_TEST=true`.
- [ ] Verify Vault backend — confirm HTTP token auth + KV v2 path handling; add a real integration test gated by `VAULT_TEST=true`.
- [ ] Wire the `onAudit()` callback to the audit log sink (same sink used by KYC/AML events).
- [ ] Wire `getHealth()` into `/readyz` so the process does not start serving traffic until secrets are loaded.
- [ ] Add a startup log line: `secrets loaded via <backend>, <N> keys, audit callback registered: <bool>`.
- [ ] Add `strict` mode tests: missing secret in prod → fatal, missing secret in dev → warning + fallback.

## Migration Notes

- Keep `process.env` fallback for a deprecation window (one minor release) to avoid a hard flag day.
- Log every direct `process.env.X_SECRET` access during the window so remaining call sites surface in observability.

## Files to Modify

- `config/secrets.ts` — confirm backends + add any missing logic
- `apps/api/src/index.ts` (new, from issue 08)
- `scripts/deploy-*.ts`
- `services/**` — replace direct `process.env.*_SECRET` / `*_KEY` / `*_TOKEN` lookups
- `docs/secrets-management.md` — operational guide
- `.env.example` — document which values are secrets (and therefore go through the loader)

## References

- Re-audit report §5: Production Secrets Management
- PR #319 (merged)
- [AWS Secrets Manager — GetSecretValue](https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html)
- [Vault KV v2 API](https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2)
