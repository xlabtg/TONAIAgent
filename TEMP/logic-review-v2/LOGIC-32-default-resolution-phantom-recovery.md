# LOGIC-32 — Loss socialization zeroes the full deficit while honouring a cap → phantom recovery

**Severity:** 🔴 High
**Area:** Financial
**Stage:** Stage 2 — Funds & accounting correctness
**Suggested labels:** `bug`, `severity:high`, `area:financial`, `stage:2-funds-correctness`, `audit:logic-review-v2`
**Location:** `services/clearing-house/default-resolution.ts:570-599`
**Filed as:** [#442](https://github.com/xlabtg/TONAIAgent/issues/442)

## Problem

`socializeLoss` computes `lossPercent` capped at `maxSocializedLossPercent`, but then unconditionally records
`amountRecovered: event.totalDeficit`, sets `event.socializedLoss = event.totalDeficit` and
`event.totalDeficit = 0`. The capped percentage is reported, yet the books show the **entire** deficit as
recovered and the remaining deficit as zero — even when the cap means only part of it could actually be
socialized.

## Evidence

```ts
const lossPercent = Math.min(
  this.config.maxSocializedLossPercent,
  event.totalDeficit / (participantIds.length * 1_000_000)
);
const step = { action: 'socialize_loss', amountRecovered: event.totalDeficit, remainingDeficit: 0, ... };
event.socializedLoss = event.totalDeficit;
event.totalDeficit = 0;          // full deficit cleared regardless of the cap
```

## Impact

The clearing house believes a default has been fully resolved when, under the socialized-loss cap, a residual
deficit should remain (to be covered by the default fund / further steps). Real losses are hidden, and the
default-waterfall stops early, leaving the shortfall unfunded.

## Suggested fix

Compute the actually-socialized amount from the cap (e.g. `socialized = min(totalDeficit, cap * basis)`), set
`socializedLoss = socialized`, `amountRecovered = socialized`, and `totalDeficit -= socialized` so any residual
deficit remains and drives the next waterfall step.

## Acceptance criteria

- [ ] When the socialized-loss cap binds, `totalDeficit` is reduced only by the actually-socialized amount, leaving a residual.
- [ ] `amountRecovered`/`socializedLoss` equal the capped amount, not the full deficit.
- [ ] Regression test with a deficit larger than the cap asserts a non-zero residual deficit remains.
