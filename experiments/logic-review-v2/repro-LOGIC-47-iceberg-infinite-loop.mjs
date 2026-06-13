#!/usr/bin/env node
/**
 * Reproduction for LOGIC-47 — executeIceberg loops forever on an unfilled resting
 * limit order. Mirrors core/trading/live/execution-engine.ts:471-500.
 *
 * The real loop has `await sleep(1000)` per slice, so a true reproduction would
 * hang forever. We cap iterations and detect that the termination conditions are
 * never met for a resting limit order (status 'open', filledQuantity 0).
 *
 * Run: node experiments/logic-review-v2/repro-LOGIC-47-iceberg-infinite-loop.mjs
 */
const ITERATION_CAP = 100_000;   // stand-in for "forever" (real code sleeps 1s each)

// A connector whose limit orders rest unfilled (not marketable): open, 0 filled.
function placeOrder() {
  return { status: 'open', filledQuantity: 0 };
}

let remainingQuantity = 10;          // total order size
let executionStatus = 'working';     // never becomes 'cancelled' on its own
let iterations = 0;
let ordersPlaced = 0;

while (remainingQuantity > 0 && executionStatus !== 'cancelled') {
  if (++iterations > ITERATION_CAP) break;   // safety cap; real code has none
  const order = placeOrder();
  ordersPlaced++;
  remainingQuantity -= order.filledQuantity; // -= 0  => no progress
  if (order.status === 'rejected' || order.status === 'expired') break;
  // 'open' / 'new' never breaks; remainingQuantity stays at 10 forever
}

const looped = iterations > ITERATION_CAP;
console.log(`remainingQuantity   : ${remainingQuantity}  (never decreases)`);
console.log(`orders placed       : ${ordersPlaced.toLocaleString()} in ${iterations.toLocaleString()} iterations`);
console.log(`hit iteration cap   : ${looped ? 'YES' : 'no'}`);
console.log(`\nINFINITE LOOP       : ${looped ? 'YES — BUG REPRODUCED (would spin forever, placing a new resting order every 1s)' : 'no'}`);

process.exit(looped ? 1 : 0);
