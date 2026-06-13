# LOGIC-28 — Portfolio allocator never re-normalizes after the minFraction floor → capital over-allocation

**Severity:** 🔴 High
**Area:** Financial
**Stage:** Stage 2 — Funds & accounting correctness
**Suggested labels:** `bug`, `severity:high`, `area:financial`, `stage:2-funds-correctness`, `audit:logic-review-v2`
**Location:** `services/portfolio-allocator/index.ts:159-188`
**Filed as:** [#438](https://github.com/xlabtg/TONAIAgent/issues/438)

## Problem

The `allocate()` docstring promises (step 4) "After clamping, fractions are re-normalised so they sum to ≤1."
The code applies the `minFraction` floor and then assigns `const normalised = fractions;` — no re-normalization
happens. Raising several agents up to `minFraction` can push `sum(fractions)` above 1, and the result is used
directly to compute `capitalAmount = fraction * totalBalance`.

## Evidence

```ts
// Step 4 — Apply minFraction floor (may cause sum > 1; absorbed proportionally)
for (let i = 0; i < agents.length; i++) {
  const lo = Math.min(minFrac, maxExposures[i]!);
  if (fractions[i]! < lo) fractions[i] = lo;
}

const normalised = fractions;   // <-- promised re-normalization is absent
```

## Impact

With enough low-score agents (each floored to `minFraction`, default 0.05), the fractions sum to more than 1
and the allocator hands out **more capital than `totalBalance`** — over-leveraging the portfolio. The comment
"absorbed proportionally" describes behaviour that is not implemented; `unallocated` clamps at 0 and hides it.

## Suggested fix

Implement the documented step 4: after the floor, if `sum(fractions) > 1`, scale all fractions by
`1 / sum` (respecting `maxExposure` caps where possible) so the total never exceeds 1. Add an invariant
assertion/test that `sum(allocationFraction) <= 1 + ε` and `sum(capitalAmount) <= totalBalance + ε`.

## Acceptance criteria

- [ ] After allocation, the sum of `allocationFraction` never exceeds 1 (within floating-point epsilon).
- [ ] The sum of `capitalAmount` never exceeds `totalBalance`.
- [ ] Regression test with many low-score agents (enough that `n * minFraction > 1`) asserts no over-allocation.
