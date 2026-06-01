// Reproduction for LOGIC-11 — BUY balance check excludes the fee that is then deducted.
//
// Source: core/trading/engine/trade-executor.ts:157-169, 187-191
//   if (usdBalance < tradeValue) { reject }      // checks tradeValue only
//   const fee = tradeValue * feeRate;
//   updateBalance(agentId, quote, -(tradeValue + fee));  // deducts tradeValue + fee
// When tradeValue <= balance < tradeValue + fee, the check passes but the balance
// goes negative after the fee is applied.
//
// Run: node experiments/logic-review-fee-balance-bug.mjs

const feeRate = 0.001; // 0.1%
const tradeValue = 1000; // cost of the asset being bought
const fee = tradeValue * feeRate; // 1
const balance = 1000; // exactly enough for tradeValue, but not for the fee

// --- Buggy gate, copied from trade-executor.ts ---
function buggyAccepts(balance, tradeValue) {
  return !(balance < tradeValue); // accepts when balance >= tradeValue
}

// --- Correct gate: must cover tradeValue + fee ---
function correctAccepts(balance, tradeValue, fee) {
  return !(balance < tradeValue + fee);
}

const accepted = buggyAccepts(balance, tradeValue);
const finalBalance = accepted ? balance - (tradeValue + fee) : balance;
const correctlyAccepted = correctAccepts(balance, tradeValue, fee);

console.log('Balance:', balance, ' tradeValue:', tradeValue, ' fee:', fee);
console.log('Buggy gate accepts trade:', accepted); // true
console.log('Resulting balance after fee:', finalBalance); // -1  (overdraft!)
console.log('Correct gate would accept :', correctlyAccepted); // false

if (accepted && finalBalance < 0 && !correctlyAccepted) {
  console.log('\n✗ BUG REPRODUCED: trade accepted but quote balance goes negative after fee.');
  process.exit(0);
} else {
  console.log('\n(unexpected) bug not reproduced');
  process.exit(1);
}
