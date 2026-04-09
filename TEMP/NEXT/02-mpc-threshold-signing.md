# Task: Implement Real MPC Threshold Signature Scheme

**Priority:** CRITICAL — Blocks Mainnet Launch  
**Effort:** ~3 weeks  
**Related Issue:** #304

## Problem

`core/security/key-management.ts` — `MPCCoordinator.combineSignatures()` generates fake signatures:

```typescript
async combineSignatures(signingRequestId: string): Promise<string | null> {
  // In production, this would use actual threshold signature combination
  const combined = Array.from(signatures.values()).join('_');
  return `mpc_sig_${Buffer.from(combined).toString('base64').slice(0, 64)}`;
}
```

These signatures are **not valid** for blockchain transactions. No real threshold cryptography is implemented.

## Acceptance Criteria

- [ ] Implement Threshold ECDSA or Threshold EdDSA (TSS) for 2-of-3 signing
- [ ] Integrate an audited TSS library (recommended: `@noble/curves` + Shamir's secret sharing, or `tss-lib` port)
- [ ] Ensure each party's share is stored separately and never reconstructed in one place
- [ ] Implement distributed key generation (DKG) protocol
- [ ] Implement signing protocol with threshold verification
- [ ] Write unit and integration tests for threshold signing
- [ ] Verify generated signatures are valid for TON blockchain (Ed25519)
- [ ] Document MPC setup for platform operator and recovery service

## Implementation Notes

- TON uses Ed25519 for signatures — ensure TSS library supports threshold EdDSA
- Consider using `@tkey/core` (Torus Key Infrastructure) as reference implementation
- Party roles per codebase: `user`, `platform`, `recovery_service`
- Current config: 2-of-3 threshold (configurable via `MPC_THRESHOLD` and `MPC_TOTAL_PARTIES` env vars)
- Never combine key material in one process — use secure multi-party protocol

## Recommended Libraries

- `@noble/curves` — well-audited curve operations
- `shamir-secret-sharing` — for share generation/recovery
- Reference: [FROST threshold signature scheme](https://eprint.iacr.org/2020/852.pdf) for EdDSA

## Files to Modify

- `core/security/key-management.ts` — replace `MPCCoordinator.combineSignatures()` with real TSS
- `core/security/types.ts` — update `MPCConfig`, add DKG types
- `tests/security/mpc-threshold.test.ts` — new test file
- `docs/mpc-architecture.md` — new file documenting MPC design

## Security Considerations

- Partial signatures must not reveal information about other shares
- Protocol must be secure against malicious participants (1 of 3)
- Add replay protection on signing sessions
- Audit the chosen TSS library before production use
