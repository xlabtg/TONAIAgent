# LOGIC-06 — Multi-sig escalation threshold is unreachable dead code

**Severity:** 🔴 High
**Area:** Security / AI safety guardrails
**Stage:** 1 — Safety re-wiring
**Suggested labels:** `bug`, `severity:high`, `area:security`
**Location:** `core/ai/safety/guardrails.ts:400-420` (defaults at `:573-578`)

## Problem

`RiskValidator.validateTransaction` runs checks in order, each `return`ing. With default thresholds:

```ts
riskThresholds: {
  maxTransactionValueTon: 1000,
  requireConfirmationAbove: 100,
  requireMultiSigAbove: 1000,
},
```

- Any transaction `> maxTransactionValueTon` (1000) is hard-blocked at `:368`.
- Any transaction `> requireConfirmationAbove` (100) returns the confirmation result at `:401`.

So the multi-sig branch at `:412` (`valueTon > requireMultiSigAbove`, i.e. > 1000) can never run: such a
value is already blocked at `:368`, and everything ≤ 1000 returns at the confirmation check. The branch is
unreachable under the shipped config.

## Evidence

```ts
// Check if confirmation required
if (context.valueTon > this.thresholds.requireConfirmationAbove) {   // 100
  return { passed: true, action: 'escalate', metadata: { requireConfirmation: true }, ... };
}

// Check if multi-sig required  (DEAD: requireMultiSigAbove == maxTransactionValueTon)
if (context.valueTon > this.thresholds.requireMultiSigAbove) {       // 1000
  return { passed: true, action: 'escalate', metadata: { requireMultiSig: true }, ... };
}
```

## Impact

The strongest control for the largest transactions never activates. High-value transfers receive the
softer "requires confirmation" signal instead of "requires multi-signature", silently downgrading the
security posture for an operator relying on the multi-sig escalation flag.

## Suggested fix

Evaluate the multi-sig threshold **before** the confirmation threshold (most-severe first), and ensure
`requireMultiSigAbove < maxTransactionValueTon` so the band `[requireMultiSigAbove, maxTransactionValueTon]`
is reachable. Validate config invariants at construction time.

## Acceptance criteria

- [ ] A transaction in the multi-sig band returns `requireMultiSig: true`.
- [ ] Config validation rejects `requireMultiSigAbove >= maxTransactionValueTon` or orders checks correctly.
- [ ] Tests covering confirmation-band, multi-sig-band, and blocked-band values.
