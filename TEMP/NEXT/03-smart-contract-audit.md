# Task: Develop and Audit TON Smart Contracts (FunC/Tact)

**Priority:** CRITICAL — Blocks Mainnet Launch  
**Effort:** ~4 weeks  
**Related Issue:** #304

## Problem

The repository contains **no actual FunC or Tact smart contract source code**. All contract operations in `connectors/ton-factory/factory-contract.ts` are JavaScript simulations:

```typescript
export function deriveContractAddress(ownerAddress: TonAddress, salt: string, workchain: 0 | -1 = 0): TonAddress {
  // Simulate deterministic address: in real TON this uses hash(StateInit)
  const combined = `${ownerAddress}:${salt}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    ...
  }
  return `${workchain}:${hexHash}`;  // WRONG — not a valid TON address
}
```

## Acceptance Criteria

- [ ] Write FunC/Tact contract for **Agent Wallet** (holds user funds, delegates to agent with limits)
- [ ] Write FunC/Tact contract for **Factory** (deploys agent wallets deterministically)
- [ ] Write FunC/Tact contract for **Strategy Executor** (on-chain execution with guardrails)
- [ ] All contracts pass TON formal verification tooling
- [ ] Deploy to TON testnet and run integration tests
- [ ] Engage third-party smart contract auditor (CertiK, Halborn, or equivalent)
- [ ] Fix all Critical/High audit findings
- [ ] Deploy verified contracts to TON mainnet
- [ ] Update `connectors/ton-factory/factory-contract.ts` to use real contract addresses and SDK

## Default Configuration Fix (HIGH)

`connectors/ton-factory/factory-contract.ts` line ~32:
```typescript
export const DEFAULT_FACTORY_CONFIG: FactoryConfig = {
  owner: '0:0000000000000000000000000000000000000000000000000000000000000000',  // NULL ADDRESS
  treasury: '0:0000000000000000000000000000000000000000000000000000000000000000',
  ...
};
```

**Fix:** Require explicit `owner` and `treasury` at startup; throw if not configured.

## Contracts to Develop

1. **AgentWallet.fc** — custodial wallet with:
   - Owner can deposit/withdraw freely
   - Agent can trade within configured limits (max trade size, allowed DEXes)
   - Emergency pause by owner
   - Time-locked withdrawals for safety

2. **AgentFactory.fc** — factory with:
   - Deterministic deployment using StateInit hash
   - Registry of deployed agents per user
   - Upgrade mechanism (via proxy pattern if needed)

3. **StrategyExecutor.fc** — on-chain executor:
   - Validates AI signals before execution
   - Enforces position limits
   - Records all trades for audit trail

## Files to Create

- `contracts/agent-wallet.fc` (or `.tact`)
- `contracts/agent-factory.fc`
- `contracts/strategy-executor.fc`
- `contracts/tests/` — blueprint or ton-test test files
- `scripts/deploy-testnet.ts`
- `scripts/deploy-mainnet.ts`

## References

- [TON FunC documentation](https://docs.ton.org/languages/func/overview)
- [Tact language](https://tact-lang.org/)
- [Blueprint testing framework](https://github.com/ton-org/blueprint)
- [TON Security Best Practices](https://docs.ton.org/contract-dev/security)
