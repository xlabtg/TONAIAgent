#!/usr/bin/env node
/**
 * Reproduction for LOGIC-28 — portfolio allocator never re-normalizes after the
 * minFraction floor, so the sum of allocation fractions can exceed 1 and the
 * allocator hands out more capital than totalBalance.
 *
 * This mirrors the arithmetic of services/portfolio-allocator/index.ts:159-188
 * (the `const normalised = fractions;` step that skips the documented re-normalization).
 *
 * Run: node experiments/logic-review-v2/repro-LOGIC-28-portfolio-overallocation.mjs
 */
const minFraction = 0.05;            // default floor
const maxExposure = 1.0;             // per-agent cap (generous)
const totalBalance = 1_000_000;

// 30 low-score agents — softmax-ish weights are tiny, all get floored to minFraction.
const n = 30;
const rawScores = Array.from({ length: n }, () => 0.001);
const sum0 = rawScores.reduce((a, b) => a + b, 0);
let fractions = rawScores.map((s) => s / sum0);   // normalized to sum 1

// Step 4 in the source: apply minFraction floor...
for (let i = 0; i < n; i++) {
  const lo = Math.min(minFraction, maxExposure);
  if (fractions[i] < lo) fractions[i] = lo;
}

// ...then the BUG: `const normalised = fractions;` — no re-normalization.
const normalised = fractions;

const sumFractions = normalised.reduce((a, b) => a + b, 0);
const totalCapital = normalised.reduce((a, f) => a + f * totalBalance, 0);

console.log(`agents              : ${n}`);
console.log(`minFraction         : ${minFraction}`);
console.log(`sum(fractions)      : ${sumFractions.toFixed(4)}  (should be <= 1)`);
console.log(`totalBalance        : ${totalBalance.toLocaleString()}`);
console.log(`sum(capitalAmount)  : ${Math.round(totalCapital).toLocaleString()}  (should be <= totalBalance)`);

const overAllocated = sumFractions > 1 + 1e-9;
console.log(`\nOVER-ALLOCATED      : ${overAllocated ? 'YES — BUG REPRODUCED' : 'no'}`);
console.log(`excess capital      : ${Math.round(totalCapital - totalBalance).toLocaleString()}`);

process.exit(overAllocated ? 1 : 0);
