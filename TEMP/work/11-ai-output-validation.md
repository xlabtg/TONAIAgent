# Task: Add AI Output Schema Validation and Response Filtering

**Priority:** 🟡 MEDIUM
**Effort:** ~1 week
**Related Issue:** #325 (re-audit finding §7)
**Suggested labels:** `security`, `ai-safety`, `validation`

## Problem

PR #317 implemented **input** sanitization (`sanitize.ts`) but did not add output validation. AI responses are currently trusted — if a prompt injection succeeds (or if the model hallucinates), the response can contain:

- Fabricated tool-call instructions
- Structured output in an unexpected schema
- PII or secret leakage from training data
- HTML/script tags that get rendered in the UI

Any action derived from an AI response should be validated against an expected schema and filtered before being executed or displayed.

## Acceptance Criteria

- [ ] For every AI call, define a Zod schema for the expected response shape.
- [ ] Validate the response against the schema; on mismatch, log + drop + retry (with backoff) up to N times, then surface a structured error.
- [ ] Add a content filter layer for AI responses that are rendered in the UI:
  - Strip HTML (allow-list only `<b>`, `<i>`, `<code>` if needed)
  - Strip obvious injection markers the same way input sanitization does
  - Detect suspicious patterns: credentials (`sk-…`, `AKIA…`), long base64 blobs, internal hostnames
- [ ] For AI outputs that trigger actions (e.g. proposed trades), require a second-stage validator that checks business invariants:
  - Amount is within configured limits
  - Token pair is in the whitelist
  - DEX address is known
- [ ] Log the raw AI response + the validated/filtered version + the validator verdict to the audit trail.
- [ ] Tests:
  - Schema mismatch → rejection
  - Suspicious pattern → redacted in UI
  - Proposed action outside limits → rejected before execution

## Implementation Notes

- Prefer structured-output model APIs (OpenAI function-calling / Anthropic tool use / JSON mode) — they reduce but do not eliminate the need for schema validation.
- The validator must be deterministic and **not** use an LLM to validate another LLM's output (that creates a compounding failure mode).

## Files to Create/Modify

- `core/ai/output-validator.ts` (new)
- `core/ai/output-filter.ts` (new)
- `core/ai/schemas/*.ts` (new — one per AI call)
- `core/ai/prompt-builder.ts` — consider returning a typed response via the schema
- `services/ai/**` — route responses through the validator
- `tests/ai/output-validation.test.ts`
- `docs/ai-safety.md` — update with output-side hardening section

## References

- Re-audit report §7: AI Safety & Prompt Injection
- PR #317 (merged)
- [OWASP LLM02 — Insecure Output Handling](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
