# LOGIC-18 — Cross-border high-value transfers reported compliant; `BigInt()` throws on decimals

**Severity:** 🟠 Medium
**Area:** Financial / Payments
**Stage:** 2 — Funds correctness
**Suggested labels:** `bug`, `severity:medium`, `area:financial`
**Location:** `services/payments/cross-border.ts:907-945` (compliance), `:508` (`getExchangeRate`)

## Problem

Two issues in cross-border payments:

1. **High-value transfers are reported compliant.** The high-value branch (`amount >= 10000`) only
   appends to `documentsNeeded`; it never adds a `requiredAction` or a `critical` issue. Since
   `compliant = issues.every(i => i.severity !== 'critical') && requiredActions.length === 0`, a
   high-value transfer with a valid purpose is returned `compliant: true` despite requiring
   `proof_of_funds` / `purpose_declaration` that have not been provided.
2. **`BigInt()` throws on decimal amounts.** `BigInt(params.amount)` and `BigInt(sourceAmount)` throw a
   `SyntaxError` if the amount is a decimal string like `"100.5"`, crashing compliance and quoting for any
   non-integer amount.

## Evidence

```ts
const amount = BigInt(params.amount);            // throws on "100.5"
const highValueThreshold = BigInt('10000');
if (amount >= highValueThreshold) {
  documentsNeeded.push('proof_of_funds');
  documentsNeeded.push('purpose_declaration');   // but no requiredAction / critical issue
}
...
const compliant = issues.every(i => i.severity !== 'critical') && requiredActions.length === 0;
// → true for a high-value transfer with a valid purpose
```

## Impact

High-value cross-border transfers bypass the documentation gate (reported `compliant: true` without the
required KYC documents), and decimal amounts crash the quote/compliance path. Both are regulatory/UX
defects on a money-movement path.

## Suggested fix

- When high-value documents are required and not yet provided, set `compliant = false` (add a
  `requiredAction` such as "Provide proof of funds and purpose declaration").
- Normalize/validate the amount before `BigInt` (reject or scale decimals to smallest units), or parse with
  a decimal-aware type. Clarify the unit convention of `amount` (the `10000` threshold suggests smallest
  units, which deserves a documented constant).

## Acceptance criteria

- [ ] A high-value transfer without provided documents returns `compliant: false`.
- [ ] Decimal amount input does not throw; it is validated/normalized.
- [ ] Tests for high-value-without-docs and decimal-amount cases.
