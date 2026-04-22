# Task: Persist AWS KMS / Azure KV Key Registry (Remove In-Memory Map)

**Priority:** 🟠 HIGH
**Effort:** ~1 week
**Related Issue:** #325 (re-audit finding §1)
**Suggested labels:** `security`, `reliability`, `hsm`

## Problem

`AwsKmsAdapter` maintains the mapping from application-level `keyId` to the corresponding KMS ARN in an in-memory `Map<string, string>`. The `AzureKeyVaultAdapter` has the same pattern for key vault URIs.

If the process restarts, the mapping is lost. Every existing key then becomes inaccessible unless the ARN/URI is manually re-entered or the key is re-generated. For a production wallet service, losing the key registry can result in user funds being un-spendable even though the key material itself is intact in KMS.

## Acceptance Criteria

- [ ] Design the persistent key registry interface (`KeyRegistry` with `put / get / list / delete`).
- [ ] Implement at least two backends:
  - Postgres (recommended for prod)
  - Filesystem with atomic writes (for small deployments / single-node staging)
- [ ] Make the backend pluggable via config (`NODE_HSM_REGISTRY=postgres|file|memory`).
- [ ] Keep the existing `memory` backend behind a warning — only allowed when `NODE_ENV !== 'production'`.
- [ ] Ensure all writes are:
  - Transactional (create-key + register happens atomically, or register-only with the caller recovering from a failed create)
  - Encrypted at rest for the registry row (optional but recommended — the ARN itself is not secret, but registry poisoning is a threat)
- [ ] Migration utility to import existing in-memory mappings (read from a JSON file).
- [ ] Tests:
  - Unit: each backend passes the same compliance suite
  - Integration: restart the process, confirm keys still resolve
- [ ] Docs in `docs/hsm-setup.md` explaining backend choice and DR expectations.

## Files to Create/Modify

- `core/security/hsm/registry/key-registry.ts` (new)
- `core/security/hsm/registry/postgres.ts` (new)
- `core/security/hsm/registry/file.ts` (new)
- `core/security/hsm/registry/memory.ts` (new — extracted from current adapter)
- `core/security/hsm/aws-kms.ts` — depend on `KeyRegistry` instead of internal `Map`
- `core/security/hsm/azure-kv.ts` — same
- `docs/hsm-setup.md`
- `tests/security/hsm-registry.test.ts`

## References

- Re-audit report §1: HSM Key Management
- PR #323 (merged)
