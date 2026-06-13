# LOGIC-27 — resetDailyLimits re-enables trading for agents still in breach (latent)

**Severity:** 🟡 Low
**Area:** Financial
**Stage:** Stage 1 — Safety re-wiring & fail-open access control
**Suggested labels:** `bug`, `severity:low`, `area:financial`, `stage:1-safety-rewiring`, `audit:logic-review-v2`
**Location:** `core/risk-engine/trade-validator.ts:426-440`
**Filed as:** [#437](https://github.com/xlabtg/TONAIAgent/issues/437)

## Problem

`resetDailyLimits()` clears `tradingDisabled` for daily records without checking whether the record being
cleared belongs to the *current* day / is still in breach. If invoked while a record is still over its limit
(e.g. a record keyed to today, or a scheduling skew), it unblocks an agent that should remain disabled. There
is currently no production caller, so this is latent — but it is a foot-gun that will fire the moment a reset
scheduler is wired up.

## Evidence

```ts
// clears the breach flag without verifying the record is from a *prior* day:
for (const record of this.dailyRecords.values()) {
  record.tradingDisabled = false;
  // ... resets counters
}
```

## Impact

Once a daily-reset job is added, an agent that tripped its daily-loss breaker could be re-enabled prematurely,
allowing it to keep trading past the loss limit the breaker was meant to enforce.

## Suggested fix

Only reset records strictly older than the current day boundary, and never clear `tradingDisabled` for a record
that is still over its limit for the active period. Key daily records by date and roll over rather than mutate
in place.

## Acceptance criteria

- [ ] Resetting does not clear `tradingDisabled` on a record that is still in breach for the current day.
- [ ] Only records from prior periods are reset.
- [ ] Regression test: a breached current-day record survives a reset; a prior-day record is cleared.
