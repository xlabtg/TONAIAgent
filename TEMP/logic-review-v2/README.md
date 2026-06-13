# Logic RE-Review — Ready-to-File Issue Breakdown (v2 / Issue #431)

> Generated as part of Issue [#431](https://github.com/xlabtg/TONAIAgent/issues/431): "Check via Claude Fable".
> Audited version: v2.43.0 · Branch: `issue-431-c0be08c13d26`
> Companion report: [`AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW_v2.md`](../../AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW_v2.md)

This folder contains one **ready-to-file professional issue** per finding from the v2.43.0 logic *re-audit*.
It is a fresh pass that **does not** overlap with the previous review (LOGIC-01..22, issues #386–#407, all
fixed); numbering continues at **LOGIC-23**. Each file is self-contained: problem statement, exact code
location, evidence, impact, suggested fix, acceptance criteria, suggested labels, and the implementation stage.

Every finding was confirmed by reading the actual source at the stated path/line range. One candidate
(`services/regulatory/ai-governance.ts` "fails open") was investigated and **dropped** as a false positive —
the missing-field branch leaves oversight *more* readily triggered (fail-closed), not less.

## Severity summary

| Severity | Count |
|----------|:-----:|
| 🔴 High | 14 |
| 🟠 Medium | 12 |
| 🟡 Low | 3 |
| **Total** | **29** |

## High severity

| ID | Title | Area | File | Issue |
|----|-------|------|------|-------|
| LOGIC-23 | [Multi-party approval quorum can be satisfied by a single approver (no dedup / no authority check)](./LOGIC-23-human-oversight-approval-no-dedup.md) | Security | `core/ai-safety/human-oversight.ts` | _(pending)_ |
| LOGIC-24 | [Threshold signing counts unverified signatures toward the required-signature quorum](./LOGIC-24-key-management-unverified-signature-count.md) | Security | `core/security/key-management.ts` | _(pending)_ |
| LOGIC-25 | [PII redaction never fires: detector emits `warn` while the engine only redacts on `block`](./LOGIC-25-guardrails-pii-redaction-dead.md) | Security | `core/ai/safety/guardrails.ts` | _(pending)_ |
| LOGIC-26 | [capturePayment accepts `pending` payments, bypassing the authorization step](./LOGIC-26-payment-capture-accepts-pending.md) | Financial | `services/payments/payment-gateway.ts` | _(pending)_ |
| LOGIC-28 | [Portfolio allocator never re-normalizes after the minFraction floor → capital over-allocation](./LOGIC-28-portfolio-allocator-no-renormalize.md) | Financial | `services/portfolio-allocator/index.ts` | _(pending)_ |
| LOGIC-29 | [executeDisbursement never debits the treasury balance / allocated balance](./LOGIC-29-treasury-disbursement-no-debit.md) | Financial | `services/ecosystem-fund/treasury.ts` | _(pending)_ |
| LOGIC-30 | [releaseCollateral is not idempotent → margin debited twice on repeat release](./LOGIC-30-collateral-release-not-idempotent.md) | Financial | `services/clearing-house/collateral-management.ts` | _(pending)_ |
| LOGIC-31 | [Cross-chain waitForConfirmation reports success on missing connector / still-pending tx](./LOGIC-31-cross-chain-confirmation-swallows-failures.md) | Reliability | `connectors/cross-chain-liquidity/execution.ts` | _(pending)_ |
| LOGIC-32 | [Loss socialization zeroes the full deficit while honouring a cap → phantom recovery](./LOGIC-32-default-resolution-phantom-recovery.md) | Financial | `services/clearing-house/default-resolution.ts` | _(pending)_ |
| LOGIC-36 | [Sanctions screening flags only when category contains the substring "sanction"; risk score & cluster ignored](./LOGIC-36-chainalysis-sanctioned-substring-only.md) | Regulatory | `services/regulatory/providers/chainalysis.ts` | _(pending)_ |
| LOGIC-40 | [Backtest trades never carry per-trade pnl → win rate, expectancy and returns are always zero](./LOGIC-40-backtest-trades-missing-pnl.md) | Strategy | `core/strategies/engine/backtesting.ts` | _(pending)_ |
| LOGIC-45 | [Worker pool hands out a busy worker when the pool is exhausted (over-subscription)](./LOGIC-45-worker-pool-returns-busy-worker.md) | Reliability | `services/distributed-scheduler/worker-pool.ts` | _(pending)_ |
| LOGIC-46 | [Retry-engine execution history grows unbounded; retention config is never applied](./LOGIC-46-retry-engine-unbounded-history.md) | Reliability | `services/distributed-scheduler/retry-engine.ts` | _(pending)_ |
| LOGIC-47 | [Iceberg execution loops forever on an unfilled resting limit order](./LOGIC-47-iceberg-execution-infinite-loop.md) | Reliability | `core/trading/live/execution-engine.ts` | _(pending)_ |

## Medium severity

| ID | Title | Area | File | Issue |
|----|-------|------|------|-------|
| LOGIC-33 | [refundPayment has no upper-bound guard → refund can exceed the captured amount](./LOGIC-33-refund-no-over-refund-guard.md) | Financial | `services/payments/payment-gateway.ts` | _(pending)_ |
| LOGIC-34 | [Daily-loss percent uses peak value as denominator → loss% understated, breaker trips late](./LOGIC-34-portfolio-protection-peak-denominator.md) | Financial | `core/risk-engine/portfolio-protection.ts` | _(pending)_ |
| LOGIC-35 | [Live risk-controls use a single trade notional as the portfolio-value proxy](./LOGIC-35-risk-controls-single-trade-as-portfolio.md) | Financial | `core/trading/live/risk-controls.ts` | _(pending)_ |
| LOGIC-37 | [Downloaded sanctions lists are never integrity-validated (checksum computed but unused)](./LOGIC-37-sanctions-list-checksum-unused.md) | Regulatory | `services/regulatory/providers/list-downloader.ts` | _(pending)_ |
| LOGIC-38 | [Agent-commerce authorization checks blocked merchant/category after the large-amount approval branch](./LOGIC-38-agent-commerce-block-after-amount.md) | Financial | `services/payments/agent-commerce.ts` | _(pending)_ |
| LOGIC-39 | [reportUsage ignores its idempotencyKey → duplicate usage events double-bill](./LOGIC-39-subscription-usage-ignores-idempotency.md) | Financial | `services/payments/subscription-engine.ts` | _(pending)_ |
| LOGIC-41 | [Partial capital allocation favours the lowest-priority requests (priority semantics inverted)](./LOGIC-41-capital-manager-priority-inverted.md) | Strategy | `core/multi-agent/resources/capital-manager.ts` | _(pending)_ |
| LOGIC-42 | [Genetic optimizer terminates immediately when maxIterations < populationSize](./LOGIC-42-genetic-optimizer-iteration-divided.md) | Strategy | `core/strategies/engine/optimization.ts` | _(pending)_ |
| LOGIC-43 | [Shared-memory read locks overwrite each other (single map entry per key)](./LOGIC-43-shared-memory-read-locks-not-shared.md) | Reliability | `core/multi-agent/memory/shared-memory.ts` | _(pending)_ |
| LOGIC-48 | [triggerJobManually has no running-state guard → concurrent double execution](./LOGIC-48-scheduler-manual-trigger-no-running-guard.md) | Reliability | `services/distributed-scheduler/scheduler.ts` | _(pending)_ |
| LOGIC-49 | [Runtime telemetry double-counts each agent cycle (explicit recordEvent + forwarded loop event)](./LOGIC-49-agent-manager-cycle-double-count.md) | Reliability | `core/runtime/agent-manager.ts` | _(pending)_ |
| LOGIC-50 | [Liquidity router falls back to unfiltered quotes, bypassing liquidity/impact safety filters](./LOGIC-50-price-comparator-unfiltered-fallback.md) | Financial | `connectors/liquidity-router/price_comparator.ts` | _(pending)_ |

## Low severity

| ID | Title | Area | File | Issue |
|----|-------|------|------|-------|
| LOGIC-27 | [resetDailyLimits re-enables trading for agents still in breach (latent)](./LOGIC-27-reset-daily-limits-reenables-breached.md) | Financial | `core/risk-engine/trade-validator.ts` | _(pending)_ |
| LOGIC-44 | [Capital-contention detection off-by-one misses two-agent contention](./LOGIC-44-conflict-resolver-contention-off-by-one.md) | Reliability | `core/multi-agent/resources/conflict-resolver.ts` | _(pending)_ |
| LOGIC-51 | [Liquidity-risk metric saturates at 1, losing resolution for severe undercollateralization](./LOGIC-51-clearing-audit-liquidity-risk-saturates.md) | Financial | `services/clearing-house/audit.ts` | _(pending)_ |

## Suggested labels

The repository lacks severity/area/stage labels and the audit account has `pull`-only (triage-less) access, so
labels can not be applied at filing time (this matched the prior round, #386–#407). Maintainers should create
and apply:

- Severity: `severity:high`, `severity:medium`, `severity:low`
- Area: `area:financial`, `area:security`, `area:regulatory`, `area:strategy`, `area:reliability`
- Stage: `stage:1-safety-rewiring` … `stage:5-runtime-hygiene`
- Plus the existing `bug` (and `security` for security/regulatory findings) and a grouping label `audit:logic-review-v2`.

Until then, every issue body carries its severity/area/stage as text.

## Priority order & implementation stages

### Stage 1 — Safety re-wiring & fail-open access control

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
| LOGIC-23 | [Multi-party approval quorum can be satisfied by a single approver (no dedup / no authority check)](./LOGIC-23-human-oversight-approval-no-dedup.md) | High | _(pending)_ |
| LOGIC-24 | [Threshold signing counts unverified signatures toward the required-signature quorum](./LOGIC-24-key-management-unverified-signature-count.md) | High | _(pending)_ |
| LOGIC-25 | [PII redaction never fires: detector emits `warn` while the engine only redacts on `block`](./LOGIC-25-guardrails-pii-redaction-dead.md) | High | _(pending)_ |
| LOGIC-26 | [capturePayment accepts `pending` payments, bypassing the authorization step](./LOGIC-26-payment-capture-accepts-pending.md) | High | _(pending)_ |
| LOGIC-27 | [resetDailyLimits re-enables trading for agents still in breach (latent)](./LOGIC-27-reset-daily-limits-reenables-breached.md) | Low | _(pending)_ |

### Stage 2 — Funds & accounting correctness

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
| LOGIC-28 | [Portfolio allocator never re-normalizes after the minFraction floor → capital over-allocation](./LOGIC-28-portfolio-allocator-no-renormalize.md) | High | _(pending)_ |
| LOGIC-29 | [executeDisbursement never debits the treasury balance / allocated balance](./LOGIC-29-treasury-disbursement-no-debit.md) | High | _(pending)_ |
| LOGIC-30 | [releaseCollateral is not idempotent → margin debited twice on repeat release](./LOGIC-30-collateral-release-not-idempotent.md) | High | _(pending)_ |
| LOGIC-31 | [Cross-chain waitForConfirmation reports success on missing connector / still-pending tx](./LOGIC-31-cross-chain-confirmation-swallows-failures.md) | High | _(pending)_ |
| LOGIC-32 | [Loss socialization zeroes the full deficit while honouring a cap → phantom recovery](./LOGIC-32-default-resolution-phantom-recovery.md) | High | _(pending)_ |
| LOGIC-33 | [refundPayment has no upper-bound guard → refund can exceed the captured amount](./LOGIC-33-refund-no-over-refund-guard.md) | Medium | _(pending)_ |
| LOGIC-34 | [Daily-loss percent uses peak value as denominator → loss% understated, breaker trips late](./LOGIC-34-portfolio-protection-peak-denominator.md) | Medium | _(pending)_ |
| LOGIC-35 | [Live risk-controls use a single trade notional as the portfolio-value proxy](./LOGIC-35-risk-controls-single-trade-as-portfolio.md) | Medium | _(pending)_ |

### Stage 3 — Compliance & sanctions hardening

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
| LOGIC-36 | [Sanctions screening flags only when category contains the substring "sanction"; risk score & cluster ignored](./LOGIC-36-chainalysis-sanctioned-substring-only.md) | High | _(pending)_ |
| LOGIC-37 | [Downloaded sanctions lists are never integrity-validated (checksum computed but unused)](./LOGIC-37-sanctions-list-checksum-unused.md) | Medium | _(pending)_ |
| LOGIC-38 | [Agent-commerce authorization checks blocked merchant/category after the large-amount approval branch](./LOGIC-38-agent-commerce-block-after-amount.md) | Medium | _(pending)_ |
| LOGIC-39 | [reportUsage ignores its idempotencyKey → duplicate usage events double-bill](./LOGIC-39-subscription-usage-ignores-idempotency.md) | Medium | _(pending)_ |

### Stage 4 — Strategy / backtest / optimizer integrity

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
| LOGIC-40 | [Backtest trades never carry per-trade pnl → win rate, expectancy and returns are always zero](./LOGIC-40-backtest-trades-missing-pnl.md) | High | _(pending)_ |
| LOGIC-41 | [Partial capital allocation favours the lowest-priority requests (priority semantics inverted)](./LOGIC-41-capital-manager-priority-inverted.md) | Medium | _(pending)_ |
| LOGIC-42 | [Genetic optimizer terminates immediately when maxIterations < populationSize](./LOGIC-42-genetic-optimizer-iteration-divided.md) | Medium | _(pending)_ |
| LOGIC-43 | [Shared-memory read locks overwrite each other (single map entry per key)](./LOGIC-43-shared-memory-read-locks-not-shared.md) | Medium | _(pending)_ |
| LOGIC-44 | [Capital-contention detection off-by-one misses two-agent contention](./LOGIC-44-conflict-resolver-contention-off-by-one.md) | Low | _(pending)_ |

### Stage 5 — Runtime reliability & resource hygiene

| ID | Finding | Severity | Issue |
|----|---------|----------|-------|
| LOGIC-45 | [Worker pool hands out a busy worker when the pool is exhausted (over-subscription)](./LOGIC-45-worker-pool-returns-busy-worker.md) | High | _(pending)_ |
| LOGIC-46 | [Retry-engine execution history grows unbounded; retention config is never applied](./LOGIC-46-retry-engine-unbounded-history.md) | High | _(pending)_ |
| LOGIC-47 | [Iceberg execution loops forever on an unfilled resting limit order](./LOGIC-47-iceberg-execution-infinite-loop.md) | High | _(pending)_ |
| LOGIC-48 | [triggerJobManually has no running-state guard → concurrent double execution](./LOGIC-48-scheduler-manual-trigger-no-running-guard.md) | Medium | _(pending)_ |
| LOGIC-49 | [Runtime telemetry double-counts each agent cycle (explicit recordEvent + forwarded loop event)](./LOGIC-49-agent-manager-cycle-double-count.md) | Medium | _(pending)_ |
| LOGIC-50 | [Liquidity router falls back to unfiltered quotes, bypassing liquidity/impact safety filters](./LOGIC-50-price-comparator-unfiltered-fallback.md) | Medium | _(pending)_ |
| LOGIC-51 | [Liquidity-risk metric saturates at 1, losing resolution for severe undercollateralization](./LOGIC-51-clearing-audit-liquidity-risk-saturates.md) | Low | _(pending)_ |
