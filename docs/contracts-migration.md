# TON Smart Contracts Migration Guide

This document explains the transition from the legacy JavaScript factory
simulation to the on-chain Tact contracts introduced in PR #321.

## Background

TONAIAgent's factory and wallet logic originally ran entirely in-process via a
JavaScript simulation (`connectors/ton-factory/factory-contract.ts`). PR #321
added real Tact contracts (`contracts/agent-factory.tact`,
`contracts/agent-wallet.tact`, `contracts/strategy-executor.tact`) but did not
remove the old simulator. Issue #367 tracks the clean-up.

## Current State (Option B — Simulation as Test Double)

The JS simulation is retained as an explicit **test double** rather than
deleted immediately, because the Blueprint-generated contract wrappers (Issue
#18) must be completed before production call-sites can be migrated to real
on-chain calls.

### File locations

| File | Purpose |
|------|---------|
| `connectors/ton-factory/factory-contract.ts` | In-process simulation (NOT a real on-chain call). Used by `DefaultTonFactoryService` until on-chain wrappers are ready. |
| `tests/fakes/factory-contract.fake.ts` | Explicit test double — re-exports the simulation. Test files that want to use the simulation **must** import from here, not from the connector directly. |
| `contracts/agent-factory.tact` | Real on-chain Tact contract. |
| `contracts/wrappers/AgentFactory.ts` | Blueprint-generated TypeScript wrapper (generated from the Tact source — see contracts/wrappers/README.md). |

### Version drift guard

`connectors/ton-factory/factory-contract.ts` exports a `SIMULATION_VERSION`
integer constant encoded as `major * 100 + minor` (e.g. 100 = v1.0). It must
always match `self.version` in `contracts/agent-factory.tact`. The test in
`tests/ton-factory/ton-factory.test.ts` (`Simulation Version Drift Guard`)
asserts this. Any version bump to the Tact contract without updating
`SIMULATION_VERSION` causes CI to fail.

### ESLint guard

The `no-sim-import` ESLint rule (configured in `eslint.config.mjs`) prevents
production code (`config/`, `core/`, `services/`, `connectors/`, etc.) from
importing `tests/fakes/factory-contract.fake`. Only `*.test.ts` and `*.spec.ts`
files may use it.

## Migration Path (Option A — long-term goal)

Once the Blueprint sandbox wrappers (Issue #18) are merged, migrate each
production call-site:

1. **Replace `FactoryContractManager` usage** in `connectors/ton-factory/index.ts`
   (`DefaultTonFactoryService`) with calls through `contracts/wrappers/AgentFactory.ts`
   targeting either the Blueprint sandbox (for tests) or testnet/mainnet.

2. **Update tests** that currently use the simulation to use Blueprint sandbox
   contracts instead:
   ```typescript
   import { AgentFactory } from '../../contracts/wrappers/AgentFactory';
   import { Blockchain } from '@ton/sandbox';

   const blockchain = await Blockchain.create();
   const factory = blockchain.openContract(
     await AgentFactory.fromInit(owner.address, treasury.address, ...)
   );
   ```

3. **Delete** `connectors/ton-factory/factory-contract.ts` and
   `tests/fakes/factory-contract.fake.ts` once all callers are migrated.

4. **Remove** the `no-sim-import` ESLint rule and the `SIMULATION_VERSION`
   drift guard test once the fake files are gone.

5. **Update** this document to reflect the completed migration.

## References

- Issue #367 — JS simulation layer clean-up
- Issue #18 — TypeScript wrappers for Tact contracts
- PR #321 — Tact contracts (merged)
- [Blueprint documentation](https://github.com/ton-org/blueprint)
- [Tact language](https://tact-lang.org/)
- `contracts/README.md` — contract architecture overview
