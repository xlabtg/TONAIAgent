# LOGIC-25 — PII redaction never fires: detector emits `warn` while the engine only redacts on `block`

**Severity:** 🔴 High
**Area:** Security
**Stage:** Stage 1 — Safety re-wiring & fail-open access control
**Suggested labels:** `bug`, `security`, `severity:high`, `area:security`, `stage:1-safety-rewiring`, `audit:logic-review-v2`
**Location:** `core/ai/safety/guardrails.ts:296-307 + core/ai/orchestration/engine.ts:241-247`
**Filed as:** [#435](https://github.com/xlabtg/TONAIAgent/issues/435)

## Problem

`detectPii()` returns `action: this.config.redactSensitive ? 'warn' : 'block'`. With the default
`redactSensitive: true`, a PII hit yields `action: 'warn'`. The orchestration engine, however, only redacts
when it finds a check with `action === 'block'`. So precisely when redaction is enabled, the action is `warn`,
which the engine ignores — and the PII passes through unredacted. The two booleans are inverted relative to
each other, making the redaction path dead code.

## Evidence

```ts
// guardrails.ts — detectPii:
action: this.config.redactSensitive ? 'warn' : 'block',   // redaction ON => 'warn'

// engine.ts — only 'block' triggers redaction:
const blocked = outputChecks.find((c) => c.action === 'block');
if (blocked) {
  response.choices[0].message.content = this.safetyManager.redactOutput(...);
}
```

## Impact

Model output containing detected PII (emails, card numbers, etc.) is returned to the caller verbatim whenever
`redactSensitive` is enabled — the exact configuration intended to protect it. The `redactOutput()` routine is
implemented and tested but never invoked for PII in the default configuration.

## Suggested fix

Make the action consistent with intent: when `redactSensitive` is true the PII check should drive redaction.
Either emit a dedicated `redact` action that the engine honours, or have the engine redact on `warn`-with-PII,
or invert the detector so `redactSensitive` produces the action the engine actually acts upon. Add a test that
runs the full engine path.

## Acceptance criteria

- [ ] With `redactSensitive: true`, output containing PII is redacted before being returned by the engine.
- [ ] With `redactSensitive: false`, the response is blocked/failed (or handled per policy) rather than silently returned.
- [ ] Regression test exercises the engine end-to-end (not `redactOutput` in isolation) and asserts the PII is gone from the returned content.
