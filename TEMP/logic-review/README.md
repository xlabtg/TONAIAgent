# Logic Review — Ready-to-File Issue Breakdown

> Generated as part of Issue [#384](https://github.com/xlabtg/TONAIAgent/issues/384):
> "We need to check all the logic."
> Date: 2026-06-01 · Audited version: v2.43.0
> Companion report: [`AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW.md`](../../AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW.md)

This folder contains one **ready-to-file professional issue** per finding from the v2.43.0 logic review.
Each file is self-contained: problem statement, exact code location, evidence, impact, suggested fix,
acceptance criteria, suggested labels, and the implementation stage.

These mirror the structure of `TEMP/NEXT/` (which fed Issues #306–#314) so the team / `labtgbot` can
file them directly. The audit branch only has `pull` access, so the issues are **prepared here for the
maintainers to open** rather than created automatically.

## Suggested labels

The repository currently lacks severity/area labels. Recommend creating these before filing:

- Severity: `severity:high`, `severity:medium`, `severity:low`
- Area: `area:financial`, `area:security`, `area:contracts`, `area:strategy`, `area:reliability`
- Plus the existing `bug` label for all of these.

## Priority order & implementation stages

### Stage 1 — Safety re-wiring (make existing controls actually fire)

| # | Finding | Severity | File |
|---|---------|----------|------|
| 01 | [Daily loss limit never enforced](./LOGIC-01-daily-loss-limit-dead-code.md) | High | `core/risk-engine/trade-validator.ts` |
| 05 | [`consecutiveErrors` never incremented](./LOGIC-05-consecutive-errors-never-incremented.md) | High | `core/runtime/agent-manager.ts` |
| 06 | [Multi-sig escalation unreachable](./LOGIC-06-multisig-escalation-dead-code.md) | High | `core/ai/safety/guardrails.ts` |
| 22 | [`startHealthCheckLoop` is a no-op](./LOGIC-22-healthcheck-loop-noop.md) | Low | `core/agents/lifecycle/lifecycle-orchestrator.ts` |

### Stage 2 — Funds correctness

| # | Finding | Severity | File |
|---|---------|----------|------|
| 02 | [Bilateral netting net always zero](./LOGIC-02-netting-buy-equals-sell.md) | High | `services/clearing-house/netting-engine.ts` |
| 03 | [AgentWallet over-sends via SendRemainingValue](./LOGIC-03-agentwallet-sendremainingvalue.md) | High | `contracts/agent-wallet.tact` |
| 11 | [BUY balance check ignores fee](./LOGIC-11-buy-balance-ignores-fee.md) | Medium | `core/trading/engine/trade-executor.ts` |
| 14 | [ReportOutcome patches wrong audit entry](./LOGIC-14-reportoutcome-wrong-audit-entry.md) | Medium | `contracts/strategy-executor.tact` |
| 15 | [Multi-sig upgrade satisfiable by single owner](./LOGIC-15-factory-multisig-single-owner.md) | Medium | `contracts/agent-factory.tact` |
| 18 | [Cross-border BigInt / high-value compliance](./LOGIC-18-cross-border-bigint-compliance.md) | Medium | `services/payments/cross-border.ts` |

### Stage 3 — Auth hardening

| # | Finding | Severity | File |
|---|---------|----------|------|
| 04 | [Telegram HMAC non-constant-time compare](./LOGIC-04-telegram-hmac-timing.md) | High | `services/auth/auth-service.ts` |
| 08 | [Recovery failed-status resurrected (lockout bypass)](./LOGIC-08-recovery-status-overwrite.md) | High | `core/security/emergency.ts` |
| 10 | [Recovery verification checks shape, not secret](./LOGIC-10-recovery-verification-shape-only.md) | Medium | `core/security/emergency.ts` |
| 20 | [Predictable Math.random IDs in regulatory](./LOGIC-20-regulatory-math-random-ids.md) | Low | `services/regulatory/kyc-aml.ts` |

### Stage 4 — Strategy / backtest integrity

| # | Finding | Severity | File |
|---|---------|----------|------|
| 07 | [Backtest win/loss ignores cost basis](./LOGIC-07-performance-ignores-cost-basis.md) | High | `core/strategies/backtesting/performance-analysis.ts` |
| 12 | [Genetic optimizer treats 0 as unevaluated](./LOGIC-12-optimizer-zero-fitness.md) | Medium | `core/strategies/engine/optimization.ts` |
| 13 | [Backtest checkTriggers always true / crossover never fires](./LOGIC-13-backtest-triggers.md) | Medium | `core/strategies/engine/backtesting.ts` |
| 19 | [Early-stopping ignores invalid evaluations](./LOGIC-19-early-stopping-invalid-evals.md) | Low | `core/strategies/engine/optimization.ts` |

### Stage 5 — Runtime hygiene

| # | Finding | Severity | File |
|---|---------|----------|------|
| 09 | [triggerNow orphans scheduled timer](./LOGIC-09-triggernow-orphan-timer.md) | High | `core/runtime/agent-scheduler.ts` |
| 16 | [Promise.race timeout timer leak](./LOGIC-16-promise-race-timer-leak.md) | Medium | `core/runtime/agent-scheduler.ts` |
| 17 | [Full-jitter backoff returns 0 ms](./LOGIC-17-full-jitter-backoff-zero.md) | Medium | `services/distributed-scheduler/retry-engine.ts` |
| 21 | [Duplicate event-bus subscriptions](./LOGIC-21-duplicate-event-subscriptions.md) | Low | `services/distributed-scheduler/scheduler.ts` |

## Reproductions

Two of the financial findings ship with standalone, dependency-free reproduction scripts
(`.mjs`, so they are outside the vitest test glob and do not run in CI):

- `experiments/logic-review-netting-bug.mjs` — LOGIC-02 (net obligation always 0)
- `experiments/logic-review-fee-balance-bug.mjs` — LOGIC-11 (BUY balance overdraft via fee)

Run with `node experiments/logic-review-netting-bug.mjs` etc.; each exits `0` when the bug reproduces.

## Summary

| Severity | Count |
|----------|:-----:|
| High | 9 |
| Medium | 9 |
| Low | 4 |
| **Total** | **22** |
