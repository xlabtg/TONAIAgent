# Task: Implement TypeScript Wrappers for Tact Contracts

**Priority:** 🟡 MEDIUM
**Effort:** ~1 week
**Related Issue:** #325 (re-audit finding §3)
**Suggested labels:** `smart-contracts`, `typescript`, `integration`

## Problem

PR #321 added the Tact contracts but `contracts/wrappers/` currently contains only a README. Off-chain TypeScript code cannot talk to deployed contracts without typed wrappers — every call site would have to build cell payloads by hand, which is error-prone and loses compile-time safety.

## Acceptance Criteria

- [ ] Generate typed wrappers for each of the three contracts using the Tact compiler's built-in wrapper generator (`tact --with-decompilation` or the Blueprint scaffolding):
  - `contracts/wrappers/AgentWallet.ts`
  - `contracts/wrappers/AgentFactory.ts`
  - `contracts/wrappers/StrategyExecutor.ts`
- [ ] For each wrapper, expose:
  - `fromAddress(addr)` / `fromInit(...)` constructors
  - Typed methods for every `getter` in the Tact source
  - Typed `send*` methods for every `receive` message
  - Exported `Opcodes` / message ABI constants
- [ ] Regenerate on every `contracts/*.tact` change — add `npm run contracts:build` that produces both the compiled `.boc` and the TS wrappers.
- [ ] Commit the generated wrappers so downstream consumers don't need a Tact toolchain.
- [ ] Document the regeneration flow in `contracts/wrappers/README.md`.
- [ ] Replace any hand-written cell construction in `connectors/ton-factory/` / `services/agent-control/` with wrapper calls.

## Implementation Notes

- Prefer the Blueprint-style wrapper output for consistency with the rest of the TON ecosystem.
- Keep wrappers side-effect-free — no provider/sender calls in constructors.
- Version the wrappers alongside the contract artifact to avoid ABI drift.

## Files to Create/Modify

- `contracts/wrappers/*.ts` (generated)
- `contracts/wrappers/README.md`
- `package.json` — add `"contracts:build"` script
- `services/agent-control/**` — replace hand-rolled message construction

## References

- Re-audit report §3: TON Smart Contracts
- PR #321 (merged)
- [Blueprint wrapper generation](https://github.com/ton-org/blueprint)
- [Tact documentation](https://docs.tact-lang.org/)
