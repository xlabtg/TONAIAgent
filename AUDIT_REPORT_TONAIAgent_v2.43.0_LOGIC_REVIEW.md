# 📄 LOGIC REVIEW & CODE AUDIT — TONAIAgent v2.43.0

**Audit Type:** Full Application Logic Review (correctness, financial, security, reliability)
**Prepared For:** xlabtg/TONAIAgent (Issue [#384](https://github.com/xlabtg/TONAIAgent/issues/384))
**Audit Date:** 2026-06-01
**Audited Version:** v2.43.0 (branch: `main`)
**Auditor:** Automated AI Logic Audit (konard / AI Issue Solver)

---

## Executive Summary

This review is a **fresh, logic-focused pass** over the entire TONAIAgent codebase (973 TypeScript
files, ~400k LOC, plus Tact smart contracts). Unlike the previous security audits
([`AUDIT_REPORT_TONAIAgent_v2.35.0.md`](./AUDIT_REPORT_TONAIAgent_v2.35.0.md) and
[`RE_AUDIT_REPORT_TONAIAgent_v2.35.1.md`](./RE_AUDIT_REPORT_TONAIAgent_v2.35.1.md)), which concentrated on
mainnet-readiness *infrastructure gaps* (HSM, MPC, secrets wiring, KYC enforcement), this pass targets
**implementation-level logic defects**: incorrect math, dead safety code, broken state machines, timer
leaks, and access-control logic errors that survive in the current code.

The prior remediation work (Issues #304–#377, 33+ merged PRs) successfully built and wired most of the
*infrastructure*. However, several of those safety mechanisms **do not actually fire at runtime** because
of logic bugs in the code paths that are supposed to invoke them. In other words: the guards exist, but
the wiring that triggers them is broken.

**Overall assessment:** ⚠️ **Multiple high-impact logic defects in financial, safety, and contract code.**
None are stylistic; every finding below was confirmed by reading the actual code and, where practical,
reproduced.

| Category | Critical | High | Medium | Low | Total |
|----------|:--------:|:----:|:------:|:---:|:-----:|
| Financial / Trading correctness | 0 | 3 | 1 | 0 | 4 |
| Security / Access control | 0 | 3 | 2 | 1 | 6 |
| Smart contracts (Tact) | 0 | 1 | 2 | 0 | 3 |
| Strategy / Backtest / Optimizer | 0 | 1 | 2 | 1 | 4 |
| Reliability / Runtime | 0 | 1 | 2 | 2 | 5 |
| **Total** | **0** | **9** | **9** | **4** | **22** |

> Note on severity: there are no findings rated *Critical* because the platform currently defaults to
> simulation mode and several high-impact paths require live-fund wiring to be exploitable. Should the
> platform go live with real funds, several **High** findings (LOGIC-01, LOGIC-02, LOGIC-03, LOGIC-08)
> escalate to *Critical* in practice.

---

## Methodology

**Scope:** Full static analysis of all TypeScript source files plus the Tact smart contracts.

**Approach:** The codebase was partitioned into five subsystems and analyzed in parallel by dedicated
audit passes:

1. Financial & trading correctness — `core/risk-engine`, `core/trading`, `core/portfolio`,
   `core/market-data`, `services/execution-engine`, `services/portfolio-allocator`, `services/risk-control`
2. Security, auth & crypto — `core/security`, `services/auth`, `services/api`, `services/regulatory`
3. AI, strategies & backtesting — `core/ai`, `core/ai-safety`, `core/multi-agent`, `core/strategies`,
   `services/strategy-optimizer`, `services/strategy-marketplace`
4. Services, connectors & contracts — `services/omnichain`, `services/payments`, `services/clearing-house`,
   `services/ecosystem-fund`, `connectors/*`, `contracts/*.tact`
5. Runtime, agents & concurrency — `core/agents`, `core/runtime`, `core/observability`, `core/plugins`,
   `services/scheduler`, `services/distributed-scheduler`, `services/monitoring`, `services/alerts`

**Verification:** Every finding includes a file path and line reference, an exact code excerpt, and a
concrete failure scenario. The most impactful findings were re-read in full context and cross-checked
with `grep` to confirm the defect is live (e.g. confirming a method is never called outside tests).

**Limitations:** No dynamic penetration testing or on-chain execution was performed. Tact findings are
based on source review of the contract logic and TON message-mode semantics.

---

## Findings Index

Each finding has a corresponding issue document under
[`TEMP/logic-review/`](./TEMP/logic-review/) with full acceptance criteria, tags, and implementation
stage. IDs are stable references (`LOGIC-NN`). **All 22 findings have been filed as individual GitHub
issues #386–#407** — see the [`LOGIC-NN → issue` mapping](./TEMP/logic-review/README.md#filed-issues).

### High severity

| ID | Title | Area | File |
|----|-------|------|------|
| LOGIC-01 | Daily loss limit is never enforced (dead safety code) | Financial | `core/risk-engine/trade-validator.ts` |
| LOGIC-02 | Bilateral netting computes buy == sell → every net obligation is zero | Financial | `services/clearing-house/netting-engine.ts` |
| LOGIC-03 | AgentWallet over-sends funds / bypasses limits via `SendRemainingValue` + explicit value | Contract | `contracts/agent-wallet.tact` |
| LOGIC-04 | Telegram initData HMAC compared with non-constant-time `!==` | Security | `services/auth/auth-service.ts` |
| LOGIC-05 | `consecutiveErrors` never incremented → agents never auto-fail/pause | Reliability | `core/runtime/agent-manager.ts` |
| LOGIC-06 | Multi-sig escalation threshold is unreachable dead code | Security | `core/ai/safety/guardrails.ts` |
| LOGIC-07 | Backtest win/loss metrics ignore cost basis → ~100% win rate | Strategy | `core/strategies/backtesting/performance-analysis.ts` |
| LOGIC-08 | Failed recovery is silently resurrected → max-attempt lockout bypass | Security | `core/security/emergency.ts` |
| LOGIC-09 | `triggerNow()` orphans the scheduled timer → double execution + leak | Reliability | `core/runtime/agent-scheduler.ts` |

### Medium severity

| ID | Title | Area | File |
|----|-------|------|------|
| LOGIC-10 | Recovery verification checks input *shape* only, not the secret value | Security | `core/security/emergency.ts` |
| LOGIC-11 | BUY balance check ignores trading fee → balance can go negative | Financial | `core/trading/engine/trade-executor.ts` |
| LOGIC-12 | Genetic optimizer treats a zero objective value as "not yet evaluated" | Strategy | `core/strategies/engine/optimization.ts` |
| LOGIC-13 | Backtest `checkTriggers` always returns true; crossover triggers never fire | Strategy | `core/strategies/engine/backtesting.ts` |
| LOGIC-14 | `StrategyExecutor.ReportOutcome` patches the wrong audit entry | Contract | `contracts/strategy-executor.tact` |
| LOGIC-15 | AgentFactory multi-sig upgrade approval satisfiable by the single owner | Contract | `contracts/agent-factory.tact` |
| LOGIC-16 | `Promise.race` execution timeout leaks a live timer every cycle | Reliability | `core/runtime/agent-scheduler.ts`, `core/runtime/execution-loop.ts` |
| LOGIC-17 | Full-jitter backoff can return 0 ms, defeating exponential backoff | Reliability | `services/distributed-scheduler/retry-engine.ts` |
| LOGIC-18 | Cross-border `BigInt()` throws on decimal amounts; high-value transfers reported compliant | Financial | `services/payments/cross-border.ts` |

### Low severity

| ID | Title | Area | File |
|----|-------|------|------|
| LOGIC-19 | Optimizer early-stopping ignores invalid evaluations → patience never triggers | Strategy | `core/strategies/engine/optimization.ts` |
| LOGIC-20 | Predictable `Math.random()` IDs for KYC/AML & AI-governance records | Security | `services/regulatory/kyc-aml.ts`, `services/regulatory/ai-governance.ts` |
| LOGIC-21 | Event jobs subscribed twice (per-topic + global `*`) → latent double-trigger | Reliability | `services/distributed-scheduler/scheduler.ts` |
| LOGIC-22 | `startHealthCheckLoop()` is a no-op → `autoHealthChecks` silently disabled | Reliability | `core/agents/lifecycle/lifecycle-orchestrator.ts` |

---

## Cross-cutting theme: "Built but not wired" safety controls

A recurring pattern across the High findings is that a safety control is **present and tested in
isolation**, but the runtime path that should activate it is broken:

- **LOGIC-01** — `checkDailyLossLimit()` is correct, but only ever called from a unit test; `validate()`
  never invokes it, so the daily-loss circuit breaker is inert.
- **LOGIC-05** — the "5 consecutive errors → ERROR state + pause" guard reads a counter that is never
  incremented on cycle failure, so it never trips.
- **LOGIC-06** — the multi-sig escalation branch is unreachable because of threshold ordering, so the
  strongest control for the largest transactions never activates.
- **LOGIC-08 / LOGIC-10** — the recovery-flow lockout and the recovery verification both fail open.
- **LOGIC-22** — the auto health-check loop (which drives auto-suspend on critical risk) is never started.

These are the highest-leverage fixes: each restores a safety guarantee the project already believes it
has. They share a common root cause (a guard reading state that nothing updates / a code path that is
never reached) and should be prioritized together.

---

## Recommended remediation stages

The per-finding docs assign each item to a stage. Suggested ordering:

| Stage | Theme | Findings | Rationale |
|-------|-------|----------|-----------|
| **Stage 1 — Safety re-wiring** | Make existing safety controls actually fire | LOGIC-01, LOGIC-05, LOGIC-06, LOGIC-22 | Restores guarantees the team already assumes; low code churn, high impact |
| **Stage 2 — Funds correctness** | Money math & contract spend | LOGIC-02, LOGIC-03, LOGIC-11, LOGIC-14, LOGIC-15, LOGIC-18 | Prevents fund loss / accounting corruption before any live deployment |
| **Stage 3 — Auth hardening** | Constant-time & real verification | LOGIC-04, LOGIC-08, LOGIC-10, LOGIC-20 | Closes auth-bypass and timing channels |
| **Stage 4 — Strategy/backtest integrity** | Trustworthy performance numbers | LOGIC-07, LOGIC-12, LOGIC-13, LOGIC-19 | Backtests/marketplace rankings currently mislead users |
| **Stage 5 — Runtime hygiene** | Leaks & scheduling | LOGIC-09, LOGIC-16, LOGIC-17, LOGIC-21 | Stability under sustained load |

Each finding doc contains acceptance criteria suitable for a single PR. Several within a stage can be
parallelized.

---

## Reproductions

Standalone, dependency-free reproductions for the clearest financial defects are provided under
[`experiments/`](./experiments/):

- `experiments/logic-review-netting-bug.mjs` — demonstrates LOGIC-02 (net obligation always 0).
- `experiments/logic-review-fee-balance-bug.mjs` — demonstrates LOGIC-11 (BUY check ignores fee).

Run with `node experiments/<file>.mjs`.

---

## References

- Issue [#384](https://github.com/xlabtg/TONAIAgent/issues/384) — "We need to check all the logic"
- Prior audits: [`AUDIT_REPORT_TONAIAgent_v2.35.0.md`](./AUDIT_REPORT_TONAIAgent_v2.35.0.md),
  [`RE_AUDIT_REPORT_TONAIAgent_v2.35.1.md`](./RE_AUDIT_REPORT_TONAIAgent_v2.35.1.md)
- Remediation history: [`TEMP/work/WORK_REPORT.md`](./TEMP/work/WORK_REPORT.md)
- Ready-to-file issue documents: [`TEMP/logic-review/`](./TEMP/logic-review/)

---

*This report was generated by automated AI logic analysis. It does not constitute a professional security
audit and should be supplemented with human expert review before any real-fund deployment. Every finding
was verified against the source at the stated path and line range as of commit on branch
`issue-384-1900d0ee8d8b`.*
