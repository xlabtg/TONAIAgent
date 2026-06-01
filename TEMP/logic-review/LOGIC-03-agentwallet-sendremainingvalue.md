# LOGIC-03 — AgentWallet over-sends funds / bypasses limits via `SendRemainingValue` + explicit value

**Severity:** 🔴 High
**Area:** Smart contracts (Tact)
**Stage:** 2 — Funds correctness
**Suggested labels:** `bug`, `severity:high`, `area:contracts`
**Location:** `contracts/agent-wallet.tact:244-249` (same pattern at `:191-197` `WithdrawRequest`, `:209-214` `ClaimWithdrawal`)

## Problem

In Tact/TON, `SendRemainingValue` forwards the remaining balance of the **inbound** message (after gas)
**in addition to** the explicit `value`. Combining `value: msg.amount` with
`mode: SendRemainingValue | SendIgnoreErrors` means the outgoing message carries `msg.amount` **plus** the
leftover inbound value. All the protective accounting — the daily-limit check
(`self.dailySpent + msg.amount <= self.dailyLimitNano`), the `dailySpent` increment, the per-trade cap
(`msg.amount <= self.maxTradeSizeNano`), and the `MIN_TON_RESERVE` balance check — is expressed only in
terms of `msg.amount`. The actual TON leaving the wallet exceeds `msg.amount`.

## Evidence

```tact
// AgentExecute
self.dailySpent = self.dailySpent + msg.amount;

send(SendParameters{
    to: msg.to,
    value: msg.amount,
    mode: SendRemainingValue | SendIgnoreErrors,   // forwards inbound remainder on top of value
    body: msg.payload != null ? msg.payload!! : emptyCell()
});
```

## Impact

A caller can drain more TON than `maxTradeSizeNano` / `dailyLimitNano` allow by inflating the inbound
message value — the excess rides along via `SendRemainingValue` and is never counted against the limits.
The bounded, rate-limited delegated-spending guarantee of the wallet is defeated, and `MIN_TON_RESERVE`
can be undershot.

## Suggested fix

Send a fixed amount: use `mode: SendIgnoreErrors` (optionally `| SendPayGasSeparately`) with
`value: msg.amount`, **without** `SendRemainingValue`. If returning leftover gas to the original sender is
desired, do it in a separate explicit message rather than folding it into the trade/withdrawal output.
Apply to all three handlers (`AgentExecute`, `WithdrawRequest`/`ClaimWithdrawal`).

## Acceptance criteria

- [ ] No handler combines `SendRemainingValue` with an explicit `value: msg.amount`.
- [ ] Blueprint test: a trade with large attached inbound value sends exactly `msg.amount` to the target.
- [ ] Blueprint test: daily-limit and max-trade-size limits hold regardless of inbound message value.
