// Reproduction for LOGIC-02 — netting engine always nets to zero.
//
// Source: services/clearing-house/netting-engine.ts:132-159
// The per-asset accumulation adds the SAME notional to both `buy` and `sell`:
//   entry.buy  += trade.quantity * trade.price;
//   entry.sell += trade.quantity * trade.price;   // <-- should depend on trade.side
// Therefore buy === sell for every asset, and netPayable = buy - sell is always 0.
//
// Run: node experiments/logic-review-netting-bug.mjs

// Minimal trades: 3 BUYs and 1 SELL of the same asset. A correct netting engine
// nets the directional notionals; the buggy one ignores direction entirely.
const trades = [
  { assetId: 'TON', side: 'buy', quantity: 100, price: 5 }, // +500
  { assetId: 'TON', side: 'buy', quantity: 50, price: 5 }, // +250
  { assetId: 'TON', side: 'sell', quantity: 30, price: 5 }, // -150
];

// --- Buggy logic, copied verbatim from netting-engine.ts ---
function buggyNetPayable(trades) {
  const entry = { buy: 0, sell: 0 };
  for (const trade of trades) {
    entry.buy += trade.quantity * trade.price;
    entry.sell += trade.quantity * trade.price; // BUG: ignores trade.side
  }
  return entry.buy - entry.sell;
}

// --- Correct logic: direction-aware netting ---
function correctNetPayable(trades) {
  const entry = { buy: 0, sell: 0 };
  for (const trade of trades) {
    const notional = trade.quantity * trade.price;
    if (trade.side === 'buy') entry.buy += notional;
    else entry.sell += notional;
  }
  return entry.buy - entry.sell;
}

const buggy = buggyNetPayable(trades);
const correct = correctNetPayable(trades);

console.log('Buggy   netPayable:', buggy); // 0
console.log('Correct netPayable:', correct); // 600 (750 buy - 150 sell)

if (buggy === 0 && correct !== 0) {
  console.log('\n✗ BUG REPRODUCED: net obligation collapses to 0 regardless of trade direction.');
  process.exit(0);
} else {
  console.log('\n(unexpected) bug not reproduced');
  process.exit(1);
}
