# Task: Run Real Cloud HSM Adapters in CI (Nightly)

**Priority:** 🟡 MEDIUM
**Effort:** ~3 days
**Related Issue:** #325 (re-audit finding §1)
**Suggested labels:** `ci`, `hsm`, `testing`, `integration`

## Problem

Six real-cloud HSM tests (AWS KMS, Azure Key Vault) exist in `tests/security/hsm-integration.test.ts`, gated behind `AWS_KMS_TEST=true` / `AZURE_KV_TEST=true` environment variables. These flags are not set in standard CI, so the cloud integrations are **never exercised** by automated pipelines. SDK drift or IAM regressions can land on `main` without detection.

## Acceptance Criteria

- [ ] Add a dedicated `hsm-cloud` nightly CI workflow (separate from the standard `test` workflow to avoid blocking PRs).
- [ ] Configure CI secrets with a **dedicated test-only** AWS account and Azure subscription, with:
  - Narrow IAM/RBAC permissions (only `kms:CreateKey`, `kms:Sign`, `kms:GetPublicKey`, `kms:DeleteKey` and equivalents)
  - Budget alarms to catch runaway costs
  - Auto-cleanup of created test keys (they accrue storage cost)
- [ ] Run the gated tests with `AWS_KMS_TEST=true` and `AZURE_KV_TEST=true`.
- [ ] On failure, surface a meaningful error and page the security-engineering rotation.
- [ ] Add a matrix dimension for different regions (at minimum us-east-1 + eu-west-1) to catch region-specific SDK behavior.
- [ ] Keep runtime under 10 minutes.
- [ ] Add Ed25519-specific assertions — currently AWS/Azure fall back to P-256. Once [`02-hsm-ed25519-ton.md`](./02-hsm-ed25519-ton.md) is resolved, the matrix should include an Ed25519 path.

## Implementation Notes

- Use OIDC-based federated auth (AWS: GitHub OIDC provider, Azure: workload identity federation) — never long-lived static keys.
- Tag every test-created key with `tonaiagent-ci=true; ttl=24h` so a cleanup worker can reliably remove them.

## Files to Create/Modify

- `.github/workflows/hsm-nightly.yml` (new)
- `scripts/hsm-ci-cleanup.ts` (new — scheduled cleanup)
- `tests/security/hsm-integration.test.ts` — possibly split into real + mock files
- `docs/hsm-setup.md` — document the CI account setup

## References

- Re-audit report §1: HSM Key Management
- PR #323 (merged)
- [GitHub OIDC to AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
