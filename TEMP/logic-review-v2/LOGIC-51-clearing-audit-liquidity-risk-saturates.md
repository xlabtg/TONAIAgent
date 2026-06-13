# LOGIC-51 — Liquidity-risk metric saturates at 1, losing resolution for severe undercollateralization

**Severity:** 🟡 Low
**Area:** Financial
**Stage:** Stage 5 — Runtime reliability & resource hygiene
**Suggested labels:** `bug`, `severity:low`, `area:financial`, `stage:5-runtime-hygiene`, `audit:logic-review-v2`
**Location:** `services/clearing-house/audit.ts:309-314`
**Filed as:** [#461](https://github.com/xlabtg/TONAIAgent/issues/461)

## Problem

The systemic liquidity-risk score is computed as roughly `required / posted` and capped at 1. Once posted
collateral falls to/below required, the metric pins at 1 and cannot distinguish "exactly at requirement" from
"severely undercollateralized" (e.g. posted is a tenth of required). Crisis-classification driven by this score
loses all resolution in the danger zone.

## Evidence

```ts
const liquidityRisk = Math.min(1, required / posted);   // saturates at 1; 1x vs 10x shortfall look identical
```

## Impact

Risk dashboards and any threshold logic keyed on this score treat a mild and a catastrophic collateral shortfall
identically, blunting escalation exactly when the shortfall is worst.

## Suggested fix

Use an unbounded (or higher-ceiling) shortfall ratio for the danger region, or a piecewise/normalized scale that
preserves resolution beyond 1× (e.g. report `required / posted` without the cap, or map to severity bands).

## Acceptance criteria

- [ ] The liquidity-risk metric distinguishes degrees of undercollateralization beyond 1×.
- [ ] Crisis classification escalates with worsening shortfall.
- [ ] Regression test asserts a 10× shortfall scores worse than a 1.1× shortfall.
