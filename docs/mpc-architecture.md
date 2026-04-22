# MPC Threshold Signature Architecture

> **TON custody path (issue #332):** MPC is the **canonical production path for
> TON transaction signing**. TON requires Ed25519 signatures, and the
> cloud HSM adapters bundled with TONAIAgent (AWS KMS, Azure Key Vault) cannot
> produce native Ed25519 today. `SecureKeyManager.createSigningRequest` and
> `HSMKeyStorage.generateKeyPair` enforce this at runtime via the
> `supportsAlgorithm` capability check, so Ed25519 keys cannot accidentally be
> routed to a non-Ed25519-capable HSM. HSM adapters remain useful for auxiliary
> (non-TON) keys — session tokens, encryption keys, `secp256k1` material — and
> for future hardware appliances (YubiHSM 2, Thales Luna, AWS CloudHSM via
> PKCS#11) that do natively support Ed25519. See
> [docs/hsm-setup.md](./hsm-setup.md) for the runtime split.

## Overview

TONAIAgent uses a **2-of-3 threshold EdDSA scheme** to protect user funds.
No single party — not even the platform — can sign a blockchain transaction
unilaterally.  A minimum of two out of three key-share holders must cooperate
to produce a valid signature.

```
User Device         Platform Server        Recovery Service
    │                     │                      │
    │── Share 1 ──────────│── Share 2 ───────────│── Share 3
    │                     │                      │
    └──────────────── 2-of-3 threshold ──────────┘
                     (any 2 can sign)
```

---

## Cryptography

### Curve

TON blockchain uses **Ed25519** (Twisted Edwards curve over GF(2²⁵⁵ − 19)) with
group order **ℓ = 2²⁵² + 27742317777372353535851937790883648493**.

### Threshold Scheme

The implementation uses a **simplified FROST-like threshold EdDSA** protocol
built on top of **Shamir's Secret Sharing** (SSS).

#### Why Ed25519 + SSS?

- Ed25519 signatures have the form **(R, S)** where both components are
  **additively separable** — shares of R and S can be summed to form a valid
  aggregated signature.
- This allows partial signatures to be combined **without ever reconstructing
  the private key** in one place.

### Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `@noble/curves` | ≥ 2.0 | Ed25519 point arithmetic and signature verification |
| `@noble/hashes` | ≥ 2.0 | SHA-512 for challenge computation |

Both libraries are **well-audited**, zero-dependency, and widely used in the
Ethereum/TON ecosystem.

---

## Protocol Details

### Phase 1: Distributed Key Generation (DKG)

```
MPCCoordinator.generateShares(keyId)
```

1. Generate a fresh Ed25519 secret key `sk`.
2. Derive the **clamped scalar** `a` = `getExtendedPublicKey(sk).scalar`.
3. **Split `a`** using a degree-(t−1) polynomial over GF(ℓ):

   ```
   f(x) = a + c₁·x + c₂·x² + … + c_{t-1}·x^{t-1}  (mod ℓ)
   ```

   Shares: `{ x: i, y: f(i) }` for i = 1 … n.

4. Store the public key `A = a·G` for later signature verification.
5. Distribute share `i` to party `i`'s isolated environment.

**Security note**: After distribution, the coordinator must delete its copy of
the individual share values in a production system.  The reference
implementation keeps them in-memory for integration testing only.

### Phase 2: Signing Protocol

The signing protocol never reconstructs the private scalar `a`.

```
[Open session]
MPCCoordinator.openSigningSession(keyId, requestId, participantIndices?)

[Each party computes partial sig]
MPCCoordinator.computeAndCollectPartialSignature(requestId, shareId, message, pubKeyHex)

[Aggregate and finalise]
MPCCoordinator.combineSignatures(requestId)
```

#### Step-by-step

| Step | Action |
|------|--------|
| 1 | Each participating party `i` samples a random nonce `rᵢ ← ℤ_ℓ` |
| 2 | Commit: each party computes `Rᵢ = rᵢ·G` |
| 3 | Aggregate nonce: coordinator computes `R = Σ Rᵢ` |
| 4 | Challenge: `h = SHA-512(R ∥ A ∥ M) mod ℓ` (RFC 8032 §5.1.6) |
| 5 | Partial scalar: party `i` computes `sᵢ = rᵢ + h·λᵢ·yᵢ  (mod ℓ)` |
| 6 | Aggregate scalar: `S = Σ sᵢ  (mod ℓ)` |
| 7 | Signature: `σ = (R ∥ S)` in Ed25519 wire format (64 bytes) |

Where `λᵢ` is the **Lagrange coefficient** for party `i` in the participating set:

```
λᵢ = ∏_{j ≠ i} (0 − xⱼ) / (xᵢ − xⱼ)  (mod ℓ)
```

#### Correctness

For any threshold-sized subset `S` of parties, Lagrange interpolation ensures:

```
Σᵢ∈S  λᵢ · yᵢ  =  a    (mod ℓ)
```

Therefore:

```
S = Σ sᵢ = Σ(rᵢ + h·λᵢ·yᵢ) = r + h·a  (mod ℓ)
```

This is exactly the Ed25519 scalar component, so `verify(σ, M, A)` succeeds.

---

## Replay Protection

Each signing session generates a **unique 128-bit random nonce** (`sessionNonce`).
Parties must check this nonce against a list of used nonces before contributing
a partial signature.  Sessions are invalidated and cleared after completion or
timeout.

```typescript
const session = await coordinator.openSigningSession(keyId, requestId);
// session.sessionNonce — unique per-session value
```

---

## Party Roles

| Role | Share Index | Responsibility |
|------|-------------|---------------|
| `user` | 1 | End-user's device or Telegram client |
| `platform` | 2 | TONAIAgent backend server |
| `recovery_service` | 3 | Independent recovery provider |

**Normal operation** requires the user + platform (shares 1 + 2).

**Recovery** allows the recovery service to substitute for the user (shares 2 + 3)
when the user has lost access to their device.

---

## Operator Setup

### Configuration

Set via environment variables or the `MPCConfig` constructor:

```
MPC_THRESHOLD=2      # parties needed to sign (default: 2)
MPC_TOTAL_PARTIES=3  # total shares (default: 3)
```

### Key Generation

```typescript
import { MPCCoordinator } from './core/security/key-management';

const coordinator = new MPCCoordinator({ threshold: 2, totalShares: 3, ... });
const shares = await coordinator.generateShares('wallet_key_001');

// Distribute shares to each party's secure environment:
// shares[0] → user's encrypted storage
// shares[1] → platform HSM
// shares[2] → recovery service vault
```

### Signing a Transaction

```typescript
// High-level single-call API (suitable when all parties are co-located):
const signature = await coordinator.thresholdSign(keyId, transactionBytes);

// Low-level multi-party API (suitable for distributed deployments):
const session = await coordinator.openSigningSession(keyId, requestId);
// ... send session.aggregateRHex and session.sessionNonce to each party ...
await coordinator.computeAndCollectPartialSignature(requestId, 'share_key_1', msg, pubHex);
await coordinator.computeAndCollectPartialSignature(requestId, 'share_key_2', msg, pubHex);
const signature = await coordinator.combineSignatures(requestId);
coordinator.clearSignatures(requestId);
```

---

## Security Considerations

### What This Implementation Provides

- **Threshold security**: a single compromised party cannot sign.
- **No key reconstruction**: the full private scalar `a` is never assembled in
  one place during normal signing.
- **Replay protection**: unique session nonces prevent signature reuse attacks.
- **Verified output**: signatures are standard Ed25519 and can be verified by
  any Ed25519 implementation (including TON's).

### Production Hardening Requirements

Before mainnet deployment, the following must be addressed:

1. **Share distribution**: each party's share value must be encrypted at rest
   (e.g., AES-256-GCM with a key derived from a hardware root-of-trust)
   and transmitted over a mutually-authenticated TLS channel.

2. **No co-location**: in production, each party's share processing must run
   in a separate process/enclave (AWS Nitro, Intel SGX, YubiHSM).  The current
   reference implementation keeps all shares in-process for testing only.

3. **Nonce security**: the per-party nonces `rᵢ` must be generated by a
   CSPRNG in each party's isolated environment, never transmitted, and
   zeroized after use.

4. **Malicious participant defence**: the simplified FROST-like protocol used
   here is secure against **passive** adversaries (honest-but-curious).  Full
   resistance against **active** adversaries (malicious participants trying to
   extract key material from partial signatures) requires the complete
   [FROST protocol](https://eprint.iacr.org/2020/852.pdf) with binding factors
   and commitment verification.

5. **Audit**: the TSS implementation should be reviewed by a cryptography
   specialist before handling real funds.

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Single party compromise | Threshold: need 2-of-3 to sign |
| Man-in-the-middle on partial sig | Authenticated channels between parties |
| Replay attack | Per-session nonce |
| Side-channel on nonce | Constant-time scalar operations via @noble/curves |
| Nonce reuse | Fresh random nonce per session via `crypto.randomBytes` |

---

---

## v1 vs v2 Architecture

This document describes the **v1** simplified FROST-like protocol used for
testnet and low-value operations. The **v2** hardened implementation is
documented in [docs/mpc-architecture-v2.md](./mpc-architecture-v2.md).

| Property | v1 (this doc) | v2 |
|----------|--------------|-----|
| Coordinator role | Orchestrates AND holds nonces | Orchestrates only (no nonces) |
| Binding factor | Missing | ρ_i = H(i, m, B) per FROST §4.2 |
| Nonce commitment | None (single nonce per party) | Two nonces per party (d_i, e_i) |
| Share isolation | All shares in same process | Each share held by MPCSigner |
| Wagner's attack | Partially vulnerable | Mitigated via binding factor |
| Attack testing | Basic error paths | Full attack test suite |

**Migration**: v1 keys should be rotated to v2 shares before mainnet.
See [docs/mpc-architecture-v2.md](./mpc-architecture-v2.md) for the
migration path and `scripts/` for the rotation helper.

---

## References

- [FROST: Flexible Round-Optimized Schnorr Threshold Signatures](https://eprint.iacr.org/2020/852.pdf)
- [RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://www.rfc-editor.org/rfc/rfc8032)
- [@noble/curves documentation](https://github.com/paulmillr/noble-curves)
- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing)
- [MPC Architecture v2](./mpc-architecture-v2.md)
