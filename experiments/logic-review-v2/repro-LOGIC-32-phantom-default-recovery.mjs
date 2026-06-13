#!/usr/bin/env node
/**
 * Reproduction for LOGIC-32 — loss socialization honours the maxSocializedLossPercent
 * cap when computing lossPercent, but then unconditionally zeroes the entire deficit
 * (amountRecovered = totalDeficit; socializedLoss = totalDeficit; totalDeficit = 0).
 *
 * Mirrors services/clearing-house/default-resolution.ts:570-588.
 *
 * Run: node experiments/logic-review-v2/repro-LOGIC-32-phantom-default-recovery.mjs
 */
const maxSocializedLossPercent = 0.10;   // cap: at most 10% can be socialized
const participantIds = ['p1', 'p2', 'p3'];
const basis = participantIds.length * 1_000_000;  // 3_000_000

const event = { totalDeficit: 5_000_000, socializedLoss: 0 };

// Capped percentage (as in source):
const lossPercent = Math.min(maxSocializedLossPercent, event.totalDeficit / basis);

// BUG: full deficit treated as recovered/socialized regardless of the cap.
const step = { action: 'socialize_loss', amountRecovered: event.totalDeficit, remainingDeficit: 0 };
event.socializedLoss = event.totalDeficit;
event.totalDeficit = 0;

// What SHOULD have happened, given the cap:
const reallySocializable = Math.min(5_000_000, maxSocializedLossPercent * basis); // 300_000
const expectedResidual = 5_000_000 - reallySocializable;                          // 4_700_000

console.log(`lossPercent (capped)        : ${(lossPercent * 100).toFixed(1)}%`);
console.log(`reported amountRecovered    : ${step.amountRecovered.toLocaleString()}`);
console.log(`reported socializedLoss     : ${event.socializedLoss.toLocaleString()}`);
console.log(`reported remaining deficit  : ${event.totalDeficit.toLocaleString()}`);
console.log(`\nactually socializable (cap) : ${reallySocializable.toLocaleString()}`);
console.log(`expected residual deficit   : ${expectedResidual.toLocaleString()}`);

const phantom = event.totalDeficit === 0 && expectedResidual > 0;
console.log(`\nPHANTOM RECOVERY            : ${phantom ? `YES — BUG REPRODUCED (${expectedResidual.toLocaleString()} of unfunded loss hidden)` : 'no'}`);

process.exit(phantom ? 1 : 0);
