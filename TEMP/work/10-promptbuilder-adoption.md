# Task: Adopt `PromptBuilder` Across All AI Call Paths

**Priority:** 🟡 MEDIUM
**Effort:** ~1 week
**Related Issue:** #325 (re-audit finding §7)
**Suggested labels:** `security`, `ai-safety`, `prompt-injection`, `refactor`

## Problem

PR #317 introduced `PromptBuilder`, which enforces that user-controlled data is JSON-serialized into the user role and never concatenated into the system prompt. The class is tested and correct, but nothing in the existing codebase is required to use it. Any AI invocation that still builds its prompt via string concatenation can leak the protection.

## Acceptance Criteria

- [ ] Audit all AI call sites — grep for `openai`, `anthropic`, `chat.completions`, `messages.create`, `LLM`, and any custom model wrapper — and list them in `docs/ai-call-sites.md`.
- [ ] Refactor every call site to build its request via `PromptBuilder`.
- [ ] Add an ESLint rule (or `eslint-plugin-local-rules`) that flags direct template-literal concatenation in files that import an AI SDK.
- [ ] Add a CI step that fails the build if `PromptBuilder.build()` is bypassed in any file under `core/ai/` or `services/ai/`.
- [ ] Add regression tests for each refactored call site that feed known prompt-injection strings (from `tests/ai/prompt-injection.test.ts`) through the full path.
- [ ] Update `docs/ai-safety.md` with the "how to add a new AI call" guide that points developers at `PromptBuilder`.

## Implementation Notes

- Prefer a typed API over stringly-typed prompts — e.g. `promptBuilder.withSystem(SYSTEM_PROMPTS.STRATEGY_ADVICE).withUser({ strategy, context }).build()`.
- Static system prompts should live in a `core/ai/prompts/` directory, one export per prompt, reviewed like code.
- For streaming responses, ensure the sanitization of the *response* happens at the stream boundary (see [`11-ai-output-validation.md`](./11-ai-output-validation.md)).

## Files to Modify / Create

- `core/ai/prompt-builder.ts` — existing (from PR #317)
- `core/ai/prompts/*.ts` — one file per static system prompt
- `services/ai/**` and `core/ai/**` — refactor call sites
- `.eslintrc.js` or `eslint.config.mjs` — add custom rule
- `tests/ai/call-sites/*.test.ts` — one regression test per migrated call
- `docs/ai-safety.md`

## References

- Re-audit report §7: AI Safety & Prompt Injection
- PR #317 (merged)
- [OWASP LLM Top 10 — LLM01 Prompt Injection](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
