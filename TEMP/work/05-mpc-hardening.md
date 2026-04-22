# Task: Harden MPC Threshold Signing — Remove Coordinator Trust, Add FROST Binding Factors

**Priority:** 🟠 HIGH
**Effort:** ~4–6 weeks
**Related Issue:** #325 (re-audit finding §2)
**Suggested labels:** `security`, `cryptography`, `mpc`, `mainnet-blocker`

## Problem

PR #322 replaced the fake `mpc_sig_<base64>` placeholder with real Ed25519 threshold signing using Shamir's Secret Sharing and a FROST-like aggregation. The signatures are valid, but the implementation has three architectural weaknesses that prevent it from being a true self-custody MPC:

1. **Centralized coordinator** — the `MPCCoordinator` server holds all party nonces in memory at aggregation time. A compromise of the coordinator reveals per-session secrets.
2. **Missing FROST binding factor** — the documented protocol is "simplified FROST-like." Without the binding factor that binds each signer's nonce to the message and participant list, the scheme is weaker and can be vulnerable to attacks analysed in the FROST paper (Wagner's generalized birthday, rogue-key variants).
3. **Key reconstruction possible at coordinator** — `shamirSplit` / `lagrangeCoefficient` make full private-key reconstruction possible if the coordinator ever holds ≥ threshold shares simultaneously.

## Acceptance Criteria

- [ ] Design document in `docs/mpc-architecture-v2.md` covering:
  - Party communication protocol (pairwise, authenticated, without a trusted aggregator in the key-reconstruction position)
  - Nonce commitment protocol (parties commit before revealing, per FROST)
  - Binding factor derivation (`ρᵢ = H(i, m, B)` with `B` the list of commitments)
  - Threat model (what happens if 1, t-1, t, or t+1 parties are compromised)
- [ ] Implement the binding factor in `core/security/mpc/` and update all partial-signature computations.
- [ ] Implement pairwise signed channels between parties (e.g. libp2p noise, or a simple TLS mutual-auth mesh).
- [ ] Refactor `MPCCoordinator` into a **coordinator** (orchestrates rounds, never sees raw shares/nonces) + **signers** (hold shares, produce partial signatures).
- [ ] Assert in code (runtime) and in tests that the coordinator never has access to ≥ threshold shares.
- [ ] Expand the test suite:
  - Rogue-key attack resistance
  - Wagner's attack resistance
  - Byzantine-signer tests (signer returns malformed partial signature)
  - Fuzz tests on nonce commitments
- [ ] External cryptographic review (at least informal, ideally formal) before mainnet.
- [ ] Update `docs/mpc-architecture.md` (current) with a clear "v1 vs v2" section.

## Migration Path

- v1 stays as-is for testnet and low-value operations until v2 lands.
- Provide a migration script for existing keys (generate new t-of-n shares under v2, rotate).

## Files to Modify

- `core/security/mpc/coordinator.ts`
- `core/security/mpc/signer.ts` (new — extract from coordinator)
- `core/security/mpc/protocol.ts` (new — message schemas)
- `core/security/mpc/binding-factor.ts` (new)
- `docs/mpc-architecture-v2.md` (new)
- `docs/mpc-architecture.md` (update)
- `tests/security/mpc-threshold.test.ts` (expand)
- `tests/security/mpc-attacks.test.ts` (new)

## References

- Re-audit report §2: MPC Threshold Signatures
- [FROST Protocol paper](https://eprint.iacr.org/2020/852.pdf)
- [FROST IETF draft](https://datatracker.ietf.org/doc/draft-irtf-cfrg-frost/)
- [@noble/curves](https://github.com/paulmillr/noble-curves)
- PR #322 (merged)
