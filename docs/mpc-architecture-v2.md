# MPC Threshold Signature Architecture — v2

> **Status:** Implementation complete (issue #339).
> This document supersedes the security-considerations section of
> [docs/mpc-architecture.md](./mpc-architecture.md) for mainnet deployments.

---

## Overview

v2 hardens the threshold EdDSA scheme by:

1. **Removing coordinator trust** — the coordinator orchestrates rounds but
   never holds Shamir share values or ephemeral nonce scalars.
2. **Adding FROST binding factors** — each signer's nonce is bound to the
   specific message and participant set, mitigating Wagner's attack and
   rogue-nonce forgeries.
3. **Enforcing signer isolation** — each MPCSigner holds exactly one share,
   produces partial signatures locally, and communicates only public values
   to the coordinator.

---

## Key Files

| File | Role |
|------|------|
| `core/security/mpc/protocol.ts` | Typed message schemas (Round 1/2 messages, session descriptor) |
| `core/security/mpc/binding-factor.ts` | FROST binding factor `ρ_i = H(i, m, B)` |
| `core/security/mpc/signer.ts` | `MPCSigner` — holds one share, performs Round 1 & 2 |
| `core/security/mpc/coordinator.ts` | `MPCCoordinatorV2` — orchestrates rounds, never sees shares |
| `tests/security/mpc-attacks.test.ts` | Attack resistance test suite |

---

## Party Communication Protocol

In a multi-process (production) deployment, the coordinator and signers
communicate over **mutually-authenticated TLS channels** or a **libp2p Noise**
encrypted mesh. Each signer endpoint exposes exactly two methods:

```
POST /round1/commit          → NonceCommitment
POST /round2/sign            → PartialSignature
```

The coordinator never calls any method that returns a raw share value.

### Message flow

```
Coordinator              Signer 1       Signer 2       Signer 3
    │                       │              │              │
    │── open_session ───────►              │              │
    │── open_session ──────────────────────►              │
    │                       │              │              │
    │◄── commitment_1 ──────│              │              │
    │◄── commitment_2 ─────────────────────│              │
    │                       │              │              │
    │── session_descriptor ─►              │              │
    │── session_descriptor ────────────────►              │
    │         (includes B = {C_1, C_2} and message m)    │
    │                       │              │              │
    │◄── partial_sig_1 ─────│              │              │
    │◄── partial_sig_2 ─────────────────────│              │
    │                       │              │              │
    │── aggregate_sig ──────────────────────────────────► (broadcast)
```

---

## Nonce Commitment Protocol (Round 1)

Per FROST, each signer pre-generates **two** nonce scalars before the message
is known:

```
d_i, e_i ← CSPRNG()
D_i = d_i · G        (hiding commitment)
E_i = e_i · G        (binding commitment)
```

The signer broadcasts `(D_i, E_i)` to the coordinator. These are **curve
points only** — the scalars never leave the signer.

---

## Binding Factor Derivation

After collecting all commitments, each party independently computes:

```
B   = sorted list of (i, D_i, E_i) for all participants
ρ_i = H("frost-bind-v1" ‖ u32BE(i) ‖ m ‖ serialise(B))  mod ℓ
```

This ties each party's effective nonce to:
- the specific message `m`,
- all participant commitments `B`,
- the party's own index `i`.

An adversary who controls one signer cannot choose their `E_j` to cancel
another party's nonce because the binding factor depends on the full
commitment list that is only finalized after all Round-1 messages arrive.

---

## Aggregate Nonce (Binding-factor weighted)

The aggregate nonce is:

```
R = Σ_i (D_i + ρ_i · E_i)
```

This replaces the naive `R = Σ_i D_i` used in v1, which was vulnerable to
nonce-cancellation attacks.

---

## Partial Signature Computation (Round 2)

Each signer receives the session descriptor (message `m` + commitment list
`B`) and computes:

```
ρ_i = H(i, m, B)                      (binding factor)
R   = Σ_j (D_j + ρ_j · E_j)           (aggregate nonce)
c   = H(R, A, m) mod ℓ                (Ed25519 challenge)
λ_i = Lagrange coefficient for party i
z_i = d_i + (e_i · ρ_i) + λ_i · y_i · c  (mod ℓ)
```

The signer transmits only `z_i`. The coordinator never sees `d_i`, `e_i`,
or `y_i`.

---

## Aggregation

The coordinator combines partial signatures:

```
S = Σ_i z_i  (mod ℓ)
σ = R ‖ S    (64-byte Ed25519 wire format)
```

The result is a standard Ed25519 signature verifiable by any conformant
implementation (including TON's).

---

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Coordinator compromise | Never holds shares or nonces — can only learn z_i post-signing |
| t-1 parties compromised | No signing possible without t participants |
| Rogue-nonce substitution | Binding factor ρ_i ties nonce to message and participant set |
| Wagner's birthday attack | Binding factors make cross-session nonce combination infeasible |
| Byzantine partial sig | Invalid z_i produces invalid final signature (detectable via verification) |
| Man-in-the-middle | Mutually-authenticated TLS / Noise between coordinator and signers |
| Replay attack | Per-session `sessionNonce` (16 bytes random) + session expiry |
| Share reconstruction at coordinator | Coordinator stores only z_i (masked by d_i + e_i·ρ_i) — cannot invert |

### Compromise scenarios

| Scenario | Impact |
|----------|--------|
| 1 party compromised | No signing, no key recovery |
| t-1 parties compromised | No signing, no key recovery |
| t parties compromised | Key compromise — requires rotating to new shares |
| t+1 parties compromised | Full compromise (same as t) |
| Coordinator compromised | Can learn partial scalars z_i but cannot reconstruct key without t shares |

---

## Pairwise Authenticated Channels

In production each signer-to-coordinator channel must be mutually
authenticated. Recommended options:

1. **TLS mutual auth** — signer presents a long-lived Ed25519 certificate;
   coordinator verifies against a pinned certificate store.
2. **libp2p Noise** — each node has a stable PeerId; connections are
   encrypted and mutually authenticated.

For testnet / CI the in-process reference implementation is used (all signers
and the coordinator run in the same process, which provides equivalent security
guarantees during testing).

---

## Security Invariant: Coordinator Never Holds ≥ t Shares

The `MPCCoordinatorV2.assertNoShareLeak(sessionId)` method can be called at
any point to verify that the coordinator's session state does not accumulate
raw share values. In the in-process reference implementation the signers'
internal state is the controlled boundary.

Tests in `tests/security/mpc-attacks.test.ts` verify this invariant for
every signing session.

---

## Migration from v1

v1 keys (generated by `MPCCoordinator`) use a simpler protocol without
binding factors and can be upgraded as follows:

1. Generate new t-of-n shares under v2 (`MPCCoordinatorV2.generateShares`).
2. Sign a migration transaction with the v1 key (authorized) that registers
   the new v2 public key on-chain.
3. Distribute new share values to each party's isolated environment.
4. Destroy old v1 shares after confirming v2 signatures are accepted.

v1 remains in `core/security/key-management.ts` (`MPCCoordinator`) for
testnet and backward compatibility. New keys should use `MPCCoordinatorV2`
from `core/security/mpc/`.

---

## External Review

Before mainnet deployment the threshold signing implementation should receive
a formal or semi-formal cryptographic review covering:

- Binding factor derivation correctness vs. FROST specification.
- Lagrange interpolation correctness over GF(ℓ).
- Absence of nonce reuse across sessions.
- Partial signature validation (z_i·G == D_i + ρ_i·E_i + c·λ_i·Y_i).

See the audit report template in `AUDIT_REPORT_TONAIAgent_v2.35.0.md`.

---

## References

- [FROST: Flexible Round-Optimized Schnorr Threshold Signatures](https://eprint.iacr.org/2020/852.pdf)
- [FROST IETF Draft](https://datatracker.ietf.org/doc/draft-irtf-cfrg-frost/)
- [RFC 8032: EdDSA](https://www.rfc-editor.org/rfc/rfc8032)
- [@noble/curves](https://github.com/paulmillr/noble-curves)
- v1 Architecture: [docs/mpc-architecture.md](./mpc-architecture.md)
