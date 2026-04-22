# Task: Remove or Document Legacy JS Factory Simulation Layer

**Priority:** 🟡 MEDIUM
**Effort:** ~3 days
**Related Issue:** #325 (re-audit finding §3)
**Suggested labels:** `smart-contracts`, `refactor`, `technical-debt`

## Problem

`connectors/ton-factory/factory-contract.ts` contains the original JavaScript simulation of factory/wallet behaviour. PR #321 added real Tact contracts, but the old JS simulation was **not removed** and the migration path is **not documented**. This creates two risks:

1. A developer can accidentally call the JS simulation instead of the on-chain contract, thinking it is a test harness — producing results that diverge from real on-chain behaviour.
2. The two implementations can drift — a security fix in the Tact contract that is not mirrored in the JS simulator silently fails tests that use the simulator.

## Acceptance Criteria

Pick one of the two paths:

### Option A — Remove the JS simulation (preferred long-term)
- [ ] Replace every caller of `connectors/ton-factory/factory-contract.ts` with calls through the typed wrapper (see [`18-contract-wrappers.md`](./18-contract-wrappers.md)) targeting either a sandboxed contract (Blueprint sandbox) or testnet.
- [ ] Delete `connectors/ton-factory/factory-contract.ts` and related simulation files.
- [ ] Update tests that relied on the simulator to use Blueprint sandbox instead.

### Option B — Keep it, scoped as a test double
- [ ] Rename the file / move to `tests/fakes/` so it is clearly a test double, not a runtime dependency.
- [ ] Assert in code that it is never imported from non-test code (ESLint rule).
- [ ] Add a `SIMULATION_VERSION` constant; every test verifies it matches the Tact contract's version so drift is loud.
- [ ] Document the split in `contracts/README.md`.

## Acceptance Criteria (both options)

- [ ] A new `docs/contracts-migration.md` explains the transition from the old JS simulator to on-chain contracts.
- [ ] No production code path references the JS simulator.
- [ ] CI fails if the simulator is imported from anything other than `tests/`.

## Files to Modify

- `connectors/ton-factory/factory-contract.ts` (delete or relocate)
- `services/agent-control/**` / `core/agents/**` — call sites
- `tests/**` — migrate tests
- `docs/contracts-migration.md` (new)

## References

- Re-audit report §3: TON Smart Contracts
- PR #321 (merged)
