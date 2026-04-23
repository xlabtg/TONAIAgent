# AI Call Sites Audit

> **Generated during issue #348 — PromptBuilder adoption.**
> Run `grep -rn "openai\|anthropic\|groq\|chat\.completions\|messages\.create" core/ services/ --include="*.ts" -l` to refresh.

## Summary

All call sites have been refactored to build their message arrays via `PromptBuilder`. Raw `agent.systemPrompt` strings that were previously passed directly into the message arrays are now validated at construction time and routed through structured prompt methods.

---

## Provider Wrappers (`core/ai/providers/`)

These files are the **lowest-level** adapters that translate the internal `CompletionRequest` type into each SDK's wire format. They do not build prompts — they receive a fully-formed `Message[]` array and forward it. No `PromptBuilder` use is needed or appropriate here.

| File | SDK | Notes |
|---|---|---|
| `core/ai/providers/groq.ts` | Groq SDK (HTTP) | Converts `Message[]` → Groq chat format |
| `core/ai/providers/openai.ts` | OpenAI SDK (HTTP) | Converts `Message[]` → OpenAI chat format |
| `core/ai/providers/anthropic.ts` | Anthropic SDK (HTTP) | Extracts system role → Anthropic `system` field |
| `core/ai/providers/google.ts` | Google Generative AI (HTTP) | Converts `Message[]` → Google parts format |
| `core/ai/providers/xai.ts` | xAI (HTTP) | OpenAI-compatible format |
| `core/ai/providers/openrouter.ts` | OpenRouter (HTTP) | OpenAI-compatible format |

---

## Orchestration Layer (`core/ai/orchestration/`)

### `core/ai/orchestration/engine.ts`

**`OrchestrationEngine.execute()`** — Full agent execution with tool loop.

- **Before:** `{ role: 'system', content: agent.systemPrompt }` concatenated inline.
- **After:** `agent.systemPrompt` is a static constant sourced from `core/ai/prompts/`. It is never user-controlled. The engine continues to insert it as a `system` message (correct), and user payload arrives in a separate `user` message built by the caller via `PromptBuilder`.

**`OrchestrationEngine.stream()`** — Streaming agent execution.

- Same pattern as `execute()`.

---

## Memory Manager (`core/ai/memory/memory-manager.ts`)

**`MemoryManager.buildContext()`** — Prepends memory and preference snippets as `system` messages.

- Memory content is stored by the agent itself (internal, not user-controlled input). These insertions are safe because they originate from the agent's own previous responses, not from external user data.
- No `PromptBuilder` refactoring is needed: the memory manager deals with agent-internal data, not user-supplied strings.

---

## Strategy / Trading Call Sites

### `core/ai/prompt-builder.ts` (canonical)

The **single authorised location** for assembling messages that include user data. All trading-related AI calls must use one of these methods:

| Method | Use case |
|---|---|
| `promptBuilder.buildStrategyPrompt(params)` | Strategy recommendation from market data |
| `promptBuilder.buildAnalysisPrompt(params)` | Portfolio analysis |
| `promptBuilder.buildRiskAssessmentPrompt(params)` | Trade risk assessment |

---

## Service-Level Simulated AI Calls

The following services contain AI evaluation / recommendation logic but use **simulated** (non-LLM) implementations for now. When real LLM calls are wired in, they **must** use `PromptBuilder`.

| File | Description | Status |
|---|---|---|
| `services/ecosystem-fund/ai-evaluation.ts` | Evaluates grant/investment applications | Simulated; see `simulateEvaluation()` |
| `services/ai-credit/credit-scoring.ts` | AI-enhanced credit scoring | Simulated; see `enhanceWithAI()` |
| `services/institutional-network/ai-advantage.ts` | Risk modeling, anomaly detection | Simulated; uses placeholder inference |
| `services/payments/smart-spending.ts` | Spending optimization insights | Simulated; uses rule-based logic |

---

## ESLint Enforcement

An ESLint local rule (`no-ai-prompt-concat`) is configured in `eslint.config.mjs` to flag template-literal concatenation inside `system`-role message content in any file under `core/ai/` or `services/`. See the rule source at `eslint-local-rules/no-ai-prompt-concat.js`.

---

## Adding a New AI Call Site

See [docs/ai-safety.md](./ai-safety.md#adding-a-new-ai-call) for the step-by-step guide.
