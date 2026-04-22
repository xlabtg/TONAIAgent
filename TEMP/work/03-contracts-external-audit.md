# Task: Externally Audit and Deploy Tact Smart Contracts

**Priority:** 🟠 HIGH — Blocks mainnet contract deployment
**Effort:** ~6–8 weeks (external audit + testnet soak + mainnet deploy)
**Related Issue:** #325 (re-audit finding §3)
**Suggested labels:** `security`, `smart-contracts`, `audit`, `mainnet-blocker`

## Problem

PR #321 added three Tact contracts — `agent-wallet.tact`, `agent-factory.tact`, and `strategy-executor.tact` — with 42+ Blueprint tests and security features (per-trade limits, DEX whitelist, time-locks, replay protection). The PR itself explicitly acknowledges that:

1. The contracts have **not** been externally audited.
2. The contracts have **not** been deployed to TON testnet for integration testing.
3. The contracts have **not** been deployed to TON mainnet.

Any bug in these contracts is an on-chain, real-fund exposure that cannot be rolled back.

## Acceptance Criteria

### Phase 1 — Internal preparation (1 week)
- [ ] Freeze the contract source on a dedicated audit branch (`contracts/audit-v1`)
- [ ] Produce a self-assessment document: threat model, invariants, known limitations, test coverage report
- [ ] Confirm all Blueprint tests pass on a clean checkout
- [ ] Run static analysis (TON-specific linters, e.g. `ton-contract-executor` sanity checks)

### Phase 2 — External audit (3–4 weeks)
- [ ] Select an audit firm with TON / FunC / Tact experience (e.g. CertiK, Trail of Bits, OtterSec, Certora, Ackee Blockchain)
- [ ] Scope engagement: all three contracts + upgrade patterns + emergency controls
- [ ] Address every Critical / High finding before proceeding
- [ ] Publish the audit report (redacted if necessary) alongside the contracts

### Phase 3 — Testnet deploy + soak (2 weeks)
- [ ] Deploy to TON testnet via `scripts/deploy-testnet.ts`
- [ ] Run end-to-end flows: create wallet → fund → execute trade → daily-limit reset → emergency pause → upgrade
- [ ] Run fuzz tests and chaos tests on the deployed contracts (randomized traders, failed transactions)
- [ ] Confirm audit trail correctness on-chain

### Phase 4 — Mainnet deploy (1 week)
- [ ] Prepare deployment runbook with abort criteria
- [ ] Deploy behind feature flag so only whitelisted agents can use live contracts first
- [ ] Monitor for 72h before widening access

## Files / Artifacts

- `contracts/AUDIT_REPORT_v1.md` (new — received from auditor)
- `contracts/SELF_ASSESSMENT.md` (new)
- `scripts/deploy-testnet.ts` / `scripts/deploy-mainnet.ts` (already exist; verify mainnet gates)
- `docs/contracts-deployment.md` (new — deployment runbook)

## Non-Goals

- Feature additions beyond what PR #321 shipped — the audit is on the *current* code.
- Re-implementing in FunC — Tact is the chosen language for v1.

## References

- Re-audit report §3: TON Smart Contracts
- PR #321 (merged)
- [Tact documentation](https://docs.tact-lang.org/)
- [TON Security Best Practices](https://docs.ton.org/contract-dev/security)
- Firms with TON audit experience: CertiK, Trail of Bits, OtterSec, Ackee Blockchain
