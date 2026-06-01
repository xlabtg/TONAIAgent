# LOGIC-02 — Bilateral netting computes buy == sell, so every net obligation is zero

**Severity:** 🔴 High
**Area:** Financial / Clearing house
**Stage:** 2 — Funds correctness
**Suggested labels:** `bug`, `severity:high`, `area:financial`
**Location:** `services/clearing-house/netting-engine.ts:132-159`

## Problem

Inside each participant-pair group, both `entry.buy` and `entry.sell` are incremented by the **same**
`trade.quantity * trade.price` for **every** trade, ignoring which side of the trade each participant is
on. The trade carries `buyerParticipantId` / `sellerParticipantId` (`types.ts:163-183`) but direction is
never consulted. Therefore `buy === sell` for every asset, and `netPayable = buy - sell` /
`netReceivable = sell - buy` are identically `0`.

## Evidence

```ts
for (const trade of pairTrades) {
  const entry = assetMap.get(trade.assetId) ?? { buy: 0, sell: 0, tradeIds: [] };
  entry.buy += trade.quantity * trade.price;
  entry.sell += trade.quantity * trade.price;   // same increment as buy
  entry.tradeIds.push(trade.id);
  assetMap.set(trade.assetId, entry);
}

for (const [assetId, { buy, sell, tradeIds }] of assetMap.entries()) {
  const netPayable = buy - sell;        // always 0
  const netReceivable = sell - buy;     // always 0
  ...
  totalNetExposure += Math.abs(netPayable); // always 0
}
```

## Impact

Bilateral netting never produces a real net obligation. Every obligation has `netPayable = 0` /
`netReceivable = 0`, `netQuantity = 0`, and `totalNetExposure = 0`. Downstream settlement and margin
processes settle nothing while reporting 100% netting efficiency, masking real counterparty exposure.

## Suggested fix

Determine each participant's direction per trade and accumulate the two legs separately relative to a
fixed reference participant in the pair: if the reference is the buyer, add to `buy`; if the seller, add to
`sell`. Then `netPayable = buy - sell` reflects the true net cash leg.

## Acceptance criteria

- [ ] `buy` and `sell` are accumulated using `buyerParticipantId` / `sellerParticipantId`, not identically.
- [ ] A pair with mixed buy/sell trades whose true net is non-zero produces a non-zero obligation.
- [ ] `totalNetExposure` reflects real residual exposure.
- [ ] Test covering at least one mixed-direction pair and one fully-offsetting pair (net = 0).
