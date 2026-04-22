# Task: Resolve Ed25519/TON Incompatibility in HSM Signing Path

**Priority:** 🔴 CRITICAL — Blocks HSM-backed mainnet custody
**Effort:** ~3 weeks (depends on chosen path)
**Related Issue:** #325 (re-audit finding NEW-02, §1)
**Suggested labels:** `security`, `cryptography`, `critical`, `mainnet-blocker`

## Problem

The HSM integration merged in PR #323 wires AWS KMS and Azure Key Vault as production HSM providers. Both services expose **ECDSA P-256** (and other NIST curves) but **not Ed25519**. The TON blockchain **requires Ed25519 signatures** for all on-chain operations.

As a result, the HSM-backed signing path in production **cannot produce TON-valid signatures**, even though the code runs and produces structurally valid HSM signatures.

```
MPC path      (PR #322): Ed25519 ✅ (TON-compatible, but centralized coordinator)
HSM mock      (PR #323): Ed25519 ✅ (dev only)
HSM AWS KMS   (PR #323): ECDSA P-256 ❌ TON-incompatible
HSM Azure KV  (PR #323): ECDSA P-256 ❌ TON-incompatible
```

## Acceptance Criteria

Pick **one** of the three resolution paths, document the decision, and implement it end-to-end.

### Option A — Hardware HSM that supports Ed25519 (recommended)

- [ ] Select a hardware HSM with native Ed25519 support (YubiHSM 2, Thales Luna Network HSM 7, Entrust nShield Connect XC)
- [ ] Add a new adapter (e.g. `YubiHSMAdapter`) in `core/security/hsm/`
- [ ] Implement `generateKeyPair / sign / getPublicKey` using the vendor SDK or PKCS#11
- [ ] Add integration tests gated behind a hardware flag (e.g. `YUBIHSM_TEST=true`)
- [ ] Update `docs/hsm-setup.md` with the hardware procurement and deployment procedure
- [ ] Remove or mark AWS/Azure adapters as **not supported for TON signing** (keep them only for non-TON auxiliary keys)

### Option B — MPC-only for TON, HSM for auxiliary keys

- [ ] Explicitly document that MPC (PR #322) is the TON custody path.
- [ ] Narrow the HSM adapters' contract: they **must not** be used to sign TON transactions.
- [ ] Add a runtime check that rejects `sign()` calls for `algorithm: 'ed25519'` on any non-Ed25519 provider.
- [ ] Route TON signing exclusively through `MPCCoordinator`; keep HSM for session tokens, encryption keys, etc.
- [ ] Update `docs/hsm-setup.md` and `docs/mpc-architecture.md` to reflect the split.

### Option C — Ed25519 key wrapping via KMS-held P-256 key

- [ ] Design a scheme where an Ed25519 private key is encrypted by a KMS-held P-256 key and decrypted only inside a short-lived enclave or memory for each signing operation.
- [ ] Document the threat model clearly — this reduces but does not eliminate the benefit of an HSM.
- [ ] Implement key unwrap + Ed25519 sign in a dedicated signing service.
- [ ] Add tests and benchmarks (latency, key-exposure window).

## Required Regardless of Option

- [ ] Add a `supportsAlgorithm(alg): boolean` capability on every HSM adapter and assert compatibility at startup.
- [ ] Fail fast in production when a TON-signing code path is wired to a provider that does not support Ed25519.
- [ ] Update the cryptography assessment table in `RE_AUDIT_REPORT_TONAIAgent_v2.35.1.md` once the fix is in.
- [ ] Update `docs/security.md` with the final TON signing topology diagram.

## Files to Modify

- `core/security/hsm/` — new adapter(s), or narrowed contracts
- `core/security/key-management.ts` — capability check
- `core/security/mpc/` — if Option B, adjust routing
- `docs/hsm-setup.md`
- `docs/mpc-architecture.md`
- `docs/security.md`
- `tests/security/hsm-integration.test.ts`

## Risks

- Hardware HSMs add operational cost and procurement time.
- Key wrapping (Option C) reduces HSM security guarantees and must be threat-modeled carefully.
- Option B concentrates risk on the MPC coordinator, so issue [`05-mpc-hardening.md`](./05-mpc-hardening.md) becomes more urgent.

## References

- Re-audit report §1: HSM Key Management
- Re-audit report §New Findings: NEW-02
- [TON signing docs (Ed25519)](https://docs.ton.org/contract-dev/signing)
- [AWS KMS supported algorithms](https://docs.aws.amazon.com/kms/latest/developerguide/asymmetric-key-specs.html)
- [YubiHSM 2 Ed25519](https://developers.yubico.com/YubiHSM2/Commands/Sign_Eddsa.html)
- PR #322 (MPC), PR #323 (HSM)
