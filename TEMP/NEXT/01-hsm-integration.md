# Task: Implement Real HSM Key Management Integration

**Priority:** CRITICAL — Blocks Mainnet Launch  
**Effort:** ~2 weeks  
**Related Issue:** #304

## Problem

`core/security/key-management.ts` — `HSMKeyStorage` class (`~line 239`) throws `Error` on every operation:

```typescript
async generateKeyPair(...): Promise<{ publicKey: string }> {
  throw new Error(
    `HSM key generation requires actual HSM integration. ` +
    `Provider: ${this.config.provider}, KeyId: ${keyId}`
  );
}
```

Additionally, `SoftwareKeyStorage` is blocked in production:
```typescript
if (process.env.NODE_ENV === 'production') {
  throw new Error('SoftwareKeyStorage is not allowed in production. Use HSM or MPC custody.');
}
```

This means **no key generation is possible in production** without HSM.

## Acceptance Criteria

- [ ] Choose HSM provider (recommended: AWS CloudHSM, Azure Dedicated HSM, or YubiHSM 2 for smaller deployments)
- [ ] Implement `HSMKeyStorage.generateKeyPair()` using provider SDK
- [ ] Implement `HSMKeyStorage.sign()` using provider SDK
- [ ] Implement `HSMKeyStorage.getPublicKey()` using provider SDK
- [ ] Write integration tests (with mock HSM for CI, real HSM for staging)
- [ ] Document HSM setup procedure in `docs/hsm-setup.md`
- [ ] Add HSM health check to readiness probe
- [ ] Test key rotation with real HSM

## Implementation Notes

- AWS CloudHSM: Use `aws-cloudhsm-pkcs11` npm package or AWS KMS as stepping stone
- Azure Dedicated HSM: Use `@azure/keyvault-keys` SDK
- For Ed25519 keys (TON uses Ed25519): verify HSM provider supports this curve
- Keep `SoftwareKeyStorage` available for local dev with `NODE_ENV=development`

## Files to Modify

- `core/security/key-management.ts` — implement `HSMKeyStorage` methods
- `core/security/types.ts` — update `HSMConfig` with provider-specific fields
- `docs/hsm-setup.md` — new file with setup guide
- `.env.example` — add HSM-specific env vars
- `tests/security/hsm-integration.test.ts` — new integration test

## References

- [AWS CloudHSM Developer Guide](https://docs.aws.amazon.com/cloudhsm/latest/userguide/)
- [Azure Dedicated HSM](https://docs.microsoft.com/en-us/azure/dedicated-hsm/)
- [TON Ed25519 key format](https://docs.ton.org/contract-dev/signing)
