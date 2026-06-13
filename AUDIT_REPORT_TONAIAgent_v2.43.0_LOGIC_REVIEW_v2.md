# 📄 LOGIC RE-REVIEW & CODE AUDIT (v2) — TONAIAgent v2.43.0

**Audit Type:** Full Application Logic Re-Review (correctness, financial, security, reliability)
**Prepared For:** xlabtg/TONAIAgent (Issue [#431](https://github.com/xlabtg/TONAIAgent/issues/431) — "Check via Claude Fable")
**Audited Version:** v2.43.0 (branch: `issue-431-c0be08c13d26`)
**Auditor:** Automated AI Logic Audit (konard / AI Issue Solver)

---

## Executive Summary

This is a **second, independent logic-focused pass** over the entire TONAIAgent codebase (~976 TypeScript
files, plus Tact contracts), requested by Issue #431. It deliberately **does not re-report** the first
review's findings: LOGIC-01..22 (issues [#386–#407](https://github.com/xlabtg/TONAIAgent/issues/386)) were verified as
**fixed** in the current tree before this pass began (spot-checked: the daily-loss breaker is now wired into
`validate()`; the Telegram HMAC now uses `timingSafeEqual`). New numbering continues at **LOGIC-23**.

The dominant pattern from the first review — *"built but not wired"* safety controls — **recurs**. Several
guards exist and are unit-tested, yet the runtime path that should make them fire is broken (PII redaction that
never triggers, a signature threshold that counts unverified signatures, a human-approval quorum that one person
can satisfy). Alongside these, this pass surfaces a cluster of **funds-accounting** defects (a treasury that
disburses without debiting, non-idempotent collateral release, an allocator that over-allocates capital, loss
socialization that hides residual deficits) and **runtime reliability** defects (an iceberg execution that can
loop forever, a worker pool that over-subscribes, unbounded retry history).

**Overall assessment:** ⚠️ **14 High, 12 Medium, 3 Low** genuine logic defects, every one confirmed against the
source. As with the prior report, severities are rated for the current (largely simulation-default) posture;
several **High** findings escalate to *Critical* under live funds (e.g. LOGIC-28 over-allocation, LOGIC-29
treasury disbursement, LOGIC-31 cross-chain phantom legs, LOGIC-24 unverified-signature threshold).

| Category | High | Medium | Low | Total |
|----------|:----:|:------:|:---:|:-----:|
| Financial / Trading correctness | 5 | 6 | 2 | 13 |
| Security / Access control / Crypto | 3 | 0 | 0 | 3 |
| Regulatory / Compliance | 1 | 1 | 0 | 2 |
| Strategy / Backtest / Optimizer | 1 | 2 | 0 | 3 |
| Reliability / Runtime / Concurrency | 4 | 3 | 1 | 8 |
| **Total** | **14** | **12** | **3** | **29** |

---

## Methodology

**Scope:** Full static analysis of the TypeScript source, partitioned into five subsystems analysed in
parallel (Financial/Trading, Security/Auth/Crypto, AI/Strategies/Backtesting, Services/Connectors/Contracts,
Runtime/Agents/Concurrency), mirroring the first review's structure.

**Verification:** Every finding includes a file path + line reference, an exact code excerpt, and a concrete
failure scenario. Each agent-surfaced candidate was **re-read against the source before filing**; one candidate
(`services/regulatory/ai-governance.ts` "fail-open") was dropped after verification showed it fails *closed*.

**Limitations:** No dynamic/penetration testing or on-chain execution. This is not a substitute for a
professional human security audit before any real-fund deployment.

---

## Findings Index

Each finding has a self-contained issue document under [`TEMP/logic-review-v2/`](./TEMP/logic-review-v2/) with
acceptance criteria, suggested labels, and an implementation stage. IDs (`LOGIC-NN`) are stable references. See
the [`LOGIC-NN → issue` mapping](./TEMP/logic-review-v2/README.md).

### High severity

| ID | Title | Area | File |
|----|-------|------|------|
| LOGIC-23 | Multi-party approval quorum can be satisfied by a single approver (no dedup / no authority check) | Security | `core/ai-safety/human-oversight.ts` |
| LOGIC-24 | Threshold signing counts unverified signatures toward the required-signature quorum | Security | `core/security/key-management.ts` |
| LOGIC-25 | PII redaction never fires: detector emits `warn` while the engine only redacts on `block` | Security | `core/ai/safety/guardrails.ts` |
| LOGIC-26 | capturePayment accepts `pending` payments, bypassing the authorization step | Financial | `services/payments/payment-gateway.ts` |
| LOGIC-28 | Portfolio allocator never re-normalizes after the minFraction floor → capital over-allocation | Financial | `services/portfolio-allocator/index.ts` |
| LOGIC-29 | executeDisbursement never debits the treasury balance / allocated balance | Financial | `services/ecosystem-fund/treasury.ts` |
| LOGIC-30 | releaseCollateral is not idempotent → margin debited twice on repeat release | Financial | `services/clearing-house/collateral-management.ts` |
| LOGIC-31 | Cross-chain waitForConfirmation reports success on missing connector / still-pending tx | Reliability | `connectors/cross-chain-liquidity/execution.ts` |
| LOGIC-32 | Loss socialization zeroes the full deficit while honouring a cap → phantom recovery | Financial | `services/clearing-house/default-resolution.ts` |
| LOGIC-36 | Sanctions screening flags only when category contains the substring "sanction"; risk score & cluster ignored | Regulatory | `services/regulatory/providers/chainalysis.ts` |
| LOGIC-40 | Backtest trades never carry per-trade pnl → win rate, expectancy and returns are always zero | Strategy | `core/strategies/engine/backtesting.ts` |
| LOGIC-45 | Worker pool hands out a busy worker when the pool is exhausted (over-subscription) | Reliability | `services/distributed-scheduler/worker-pool.ts` |
| LOGIC-46 | Retry-engine execution history grows unbounded; retention config is never applied | Reliability | `services/distributed-scheduler/retry-engine.ts` |
| LOGIC-47 | Iceberg execution loops forever on an unfilled resting limit order | Reliability | `core/trading/live/execution-engine.ts` |

### Medium severity

| ID | Title | Area | File |
|----|-------|------|------|
| LOGIC-33 | refundPayment has no upper-bound guard → refund can exceed the captured amount | Financial | `services/payments/payment-gateway.ts` |
| LOGIC-34 | Daily-loss percent uses peak value as denominator → loss% understated, breaker trips late | Financial | `core/risk-engine/portfolio-protection.ts` |
| LOGIC-35 | Live risk-controls use a single trade notional as the portfolio-value proxy | Financial | `core/trading/live/risk-controls.ts` |
| LOGIC-37 | Downloaded sanctions lists are never integrity-validated (checksum computed but unused) | Regulatory | `services/regulatory/providers/list-downloader.ts` |
| LOGIC-38 | Agent-commerce authorization checks blocked merchant/category after the large-amount approval branch | Financial | `services/payments/agent-commerce.ts` |
| LOGIC-39 | reportUsage ignores its idempotencyKey → duplicate usage events double-bill | Financial | `services/payments/subscription-engine.ts` |
| LOGIC-41 | Partial capital allocation favours the lowest-priority requests (priority semantics inverted) | Strategy | `core/multi-agent/resources/capital-manager.ts` |
| LOGIC-42 | Genetic optimizer terminates immediately when maxIterations < populationSize | Strategy | `core/strategies/engine/optimization.ts` |
| LOGIC-43 | Shared-memory read locks overwrite each other (single map entry per key) | Reliability | `core/multi-agent/memory/shared-memory.ts` |
| LOGIC-48 | triggerJobManually has no running-state guard → concurrent double execution | Reliability | `services/distributed-scheduler/scheduler.ts` |
| LOGIC-49 | Runtime telemetry double-counts each agent cycle (explicit recordEvent + forwarded loop event) | Reliability | `core/runtime/agent-manager.ts` |
| LOGIC-50 | Liquidity router falls back to unfiltered quotes, bypassing liquidity/impact safety filters | Financial | `connectors/liquidity-router/price_comparator.ts` |

### Low severity

| ID | Title | Area | File |
|----|-------|------|------|
| LOGIC-27 | resetDailyLimits re-enables trading for agents still in breach (latent) | Financial | `core/risk-engine/trade-validator.ts` |
| LOGIC-44 | Capital-contention detection off-by-one misses two-agent contention | Reliability | `core/multi-agent/resources/conflict-resolver.ts` |
| LOGIC-51 | Liquidity-risk metric saturates at 1, losing resolution for severe undercollateralization | Financial | `services/clearing-house/audit.ts` |

---

## Cross-cutting theme: "Built but not wired" (still)

The single highest-leverage observation from the first review holds again: safety controls are present and
tested, but the path that activates them is broken.

- **LOGIC-25** — PII redaction is implemented and configurable, but the detector emits `warn` exactly when
  redaction is enabled, while the engine only redacts on `block`; the redaction routine is dead in the default
  config.
- **LOGIC-24** — threshold signing computes per-signature `verified`, then ignores it and counts array length.
- **LOGIC-23** — the human-approval quorum counts rows, so one approver can satisfy an N-of-M gate.
- **LOGIC-31 / LOGIC-45 / LOGIC-47** — confirmation, worker acquisition, and iceberg slicing all have a
  "best-effort / TODO" shortcut (synthetic success, busy-worker reuse, fill-only termination) that silently
  defeats the intended guarantee.

These share a root cause (a guard reading state nothing maintains, or a code path that returns success on a
not-success condition) and should be prioritised together in Stage 1 / Stage 5.

---

## Recommended remediation stages

| Stage | Theme | Findings |
|-------|-------|----------|
| **Stage 1 — Safety re-wiring & fail-open access control** | Make existing safety/access controls actually fire | LOGIC-23, LOGIC-24, LOGIC-25, LOGIC-26, LOGIC-27 |
| **Stage 2 — Funds & accounting correctness** | Money math, balances & settlement | LOGIC-28, LOGIC-29, LOGIC-30, LOGIC-31, LOGIC-32, LOGIC-33, LOGIC-34, LOGIC-35 |
| **Stage 3 — Compliance & sanctions hardening** | Sanctions/compliance & idempotency | LOGIC-36, LOGIC-37, LOGIC-38, LOGIC-39 |
| **Stage 4 — Strategy / backtest / optimizer integrity** | Trustworthy strategy/optimizer/backtest numbers | LOGIC-40, LOGIC-41, LOGIC-42, LOGIC-43, LOGIC-44 |
| **Stage 5 — Runtime reliability & resource hygiene** | Liveness, concurrency & resource hygiene | LOGIC-45, LOGIC-46, LOGIC-47, LOGIC-48, LOGIC-49, LOGIC-50, LOGIC-51 |

Each finding doc contains acceptance criteria scoped to a single PR; items within a stage can be parallelised.

---

## References

- Issue [#431](https://github.com/xlabtg/TONAIAgent/issues/431) — "Check via Claude Fable"
- First logic review: [`AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW.md`](./AUDIT_REPORT_TONAIAgent_v2.43.0_LOGIC_REVIEW.md) (LOGIC-01..22, #386–#407)
- Ready-to-file issue documents: [`TEMP/logic-review-v2/`](./TEMP/logic-review-v2/)

---

*This report was generated by automated AI logic analysis. It does not constitute a professional security audit
and should be supplemented with human expert review before any real-fund deployment. Every finding was verified
against the source at the stated path and line range on branch `issue-431-c0be08c13d26`.*
