# LOGIC-11 — BUY balance check ignores trading fee → balance can go negative

**Severity:** 🟠 Medium
**Area:** Financial / Trading
**Stage:** 2 — Funds correctness
**Suggested labels:** `bug`, `severity:medium`, `area:financial`
**Location:** `core/trading/engine/trade-executor.ts:157-169`, `:187-191`

## Problem

The BUY sufficiency check compares the quote balance against `tradeValue`, but the actual deduction is
`tradeValue + fee`. When `feeRate > 0`, an agent holding exactly (or slightly above) `tradeValue` passes
the check and is then debited more than it has. Default `feeRate` is 0, but it is a configurable field
documented with a non-zero example (`feeRate: 0.001` in `trading-engine.ts:453`), so this is reachable in
normal configuration.

## Evidence

```ts
if (signal.action === 'BUY') {
  const usdBalance = this.portfolioManager.getBalance(agentId, quoteCurrency);
  if (usdBalance < tradeValue) {            // checks tradeValue only
    return { success: false, status: 'rejected', ... };
  }
}
...
const fee = tradeValue * this.config.feeRate;
...
this.portfolioManager.updateBalance(agentId, quoteCurrency, -(tradeValue + fee)); // deducts tradeValue + fee
```

## Impact

The quote-currency balance can be driven negative, producing phantom debt / inconsistent portfolio
accounting and bypassing the "insufficient funds" guard. (The SELL branch is unaffected — its fee is
subtracted from proceeds.)

## Suggested fix

Compute the fee before the check and require `usdBalance >= tradeValue + fee`:

```ts
const fee = tradeValue * this.config.feeRate;
if (usdBalance < tradeValue + fee) { /* reject */ }
```

## Acceptance criteria

- [ ] BUY rejects when balance is insufficient to cover `tradeValue + fee`.
- [ ] Balance can never go negative after a successful BUY with `feeRate > 0`.
- [ ] Test with `feeRate > 0` and balance exactly equal to `tradeValue` asserting rejection.
