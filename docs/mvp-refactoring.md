# TON AI Agent MVP Refactoring Plan

This document outlines the refactoring work needed to bring the codebase to MVP-ready state, based on the [MVP Architecture](./mvp-architecture.md) and [Module Inclusion/Exclusion List](./mvp-modules.md).

---

## 🎯 Refactoring Goals

1. **Clarity**: The MVP entrypoint and flow must be immediately obvious to a new developer
2. **Confidence**: Non-MVP modules must not be imported or invoked in the MVP execution path
3. **Build stability**: The build system must produce a clean, type-correct MVP bundle
4. **Test coverage**: Every MVP Core module must have unit tests before demo day
5. **Documentation**: All MVP public APIs must be documented inline (JSDoc)

---

## 🔴 High Priority (Required Before MVP Demo)

### 1. Create Unified MVP Entrypoint

**Problem**: There is no single `src/index.ts` or `main.ts` that bootstraps the full MVP flow. A developer needs to understand multiple modules to run the agent.

**Action**:
- Create `src/index.ts` as the unified MVP entrypoint
- Export: `createAgent`, `startAgent`, `pauseAgent`, `getAgentStatus` from a clean top-level API
- Import only from MVP Core modules (`demo-agent`, `agent-runtime`, `ton-factory`, `payments`, `security`, `ai`)

**Affected files**:
- New: `src/index.ts`

---

### 2. Add MVP Quick-Start Example

**Problem**: `examples/basic-usage.ts` exists but may not reflect the MVP flow end-to-end.

**Action**:
- Update `examples/basic-usage.ts` to demonstrate the full 4-step MVP demo flow:
  1. Create agent (DCA strategy, 10 TON budget, simulation mode)
  2. Start agent execution
  3. Poll status and metrics
  4. Stop agent

**Affected files**:
- Update: `examples/basic-usage.ts`

---

### 3. Isolate Non-MVP Module Imports

**Problem**: The `src/mvp/index.ts` currently exports `strategy-marketplace`, `revenue`, `agent-ranking`, and `telegram-app` — modules that are not MVP Core. If imported accidentally, they increase bundle size and may cause runtime errors on missing dependencies.

**Action**:
- Move non-MVP exports from `src/mvp/index.ts` to a separate `src/mvp/phase2.ts`
- Keep only `admin-dashboard` in the main `src/mvp/index.ts`
- Add a JSDoc comment to `phase2.ts`: `/** Phase 2 modules — not included in MVP bundle **/`

**Affected files**:
- `src/mvp/index.ts`
- New: `src/mvp/phase2.ts`

---

### 4. Add MVP Build Target

**Problem**: The current build system produces a full bundle including all 32 modules. The MVP bundle should only include MVP Core modules.

**Action**:
- Add a `build:mvp` script to `package.json` using tsup with explicit entry points for MVP Core modules only
- Entry points: `src/index.ts`, `src/demo-agent/index.ts`, `src/agent-runtime/index.ts`, `src/ton-factory/index.ts`, `src/payments/index.ts`, `src/security/index.ts`, `src/ai/index.ts`

**Affected files**:
- `package.json`

---

## 🟡 Medium Priority (Required Before Production)

### 5. Standardize Error Handling in API Layer

**Problem**: `demo-agent/api.ts` defines `ApiRequest`/`ApiResponse` but error responses are not consistently structured. Some handlers may return untyped error objects.

**Action**:
- Define a standard `ApiError` type: `{ code: string; message: string; details?: unknown }`
- Update all route handlers in `demo-agent/api.ts` to return typed `ApiError` on failure
- Add 400 (validation), 404 (not found), 500 (internal) cases

**Affected files**:
- `src/demo-agent/api.ts`
- `src/demo-agent/types.ts`

---

### 6. Add Input Validation to Agent Creation

**Problem**: `POST /agent/create` accepts user-provided budget, strategy type, and risk level. There is no validation layer before the values reach the orchestrator.

**Action**:
- Add a `validateAgentConfig(config: Partial<AgentConfig>): ValidationResult` function
- Check: budget > 0 and <= MAX_BUDGET_TON, strategy is a valid `DemoStrategyType`, risk level is valid `AgentRiskLevel`
- Call validation before passing to the orchestrator

**Affected files**:
- `src/demo-agent/api.ts`
- New: `src/demo-agent/validation.ts`

---

### 7. Extract Environment Configuration

**Problem**: AI provider keys, TON RPC endpoint, and Telegram bot token are likely read in multiple places. This creates configuration fragmentation.

**Action**:
- Create `src/config.ts` that reads all required environment variables once
- Export: `aiConfig`, `tonConfig`, `telegramConfig`, `runtimeConfig`
- Update MVP Core modules to import from `src/config.ts` instead of reading `process.env` directly

**Affected files**:
- New: `src/config.ts`
- Update: `src/ai/`, `src/ton-factory/`, `src/demo-agent/`

---

### 8. Improve Unit Test Coverage for MVP Modules

**Problem**: Test coverage for MVP Core modules is unknown. Before demo, all risk-critical paths must have tests.

**Action**:
- Add unit tests for `RiskManager` (all 5 risk controls with passing and failing cases)
- Add unit tests for the 4 strategies (DCA, Yield, Grid, Arbitrage)
- Add unit tests for `AgentRuntimeOrchestrator` lifecycle transitions
- Add integration test for the full 9-step pipeline in simulation mode

**Affected files**:
- `tests/demo-agent/risk.test.ts`
- `tests/demo-agent/strategies.test.ts`
- `tests/agent-runtime/orchestrator.test.ts`
- `tests/integration/mvp-pipeline.test.ts`

---

## 🟢 Low Priority (Nice to Have for Demo/Investors)

### 9. Add Structured Logging

**Problem**: Console logs in the pipeline are not structured, making it hard to trace agent execution in production.

**Action**:
- Add a lightweight logger (e.g., `pino` or a custom JSON logger) to `src/`
- Replace ad-hoc `console.log` calls in MVP Core modules with structured log entries including `agentId`, `step`, `timestamp`, `level`

---

### 10. Add API Rate Limiting

**Problem**: The public-facing API endpoints have no rate limiting. This is a basic security requirement for any production deployment.

**Action**:
- Add a simple in-memory rate limiter (sliding window, configurable per-route)
- Apply to `POST /agent/create` (max 10 per minute per IP) and `POST /agent/start` (max 5 per minute per agent)

---

## 📋 Refactoring Checklist

| Task | Priority | Status |
|---|---|---|
| Create unified MVP entrypoint (`src/index.ts`) | 🔴 High | ⏳ Pending |
| Update quick-start example | 🔴 High | ⏳ Pending |
| Isolate non-MVP exports in `src/mvp/` | 🔴 High | ⏳ Pending |
| Add `build:mvp` script | 🔴 High | ⏳ Pending |
| Standardize API error handling | 🟡 Medium | ⏳ Pending |
| Add input validation for agent creation | 🟡 Medium | ⏳ Pending |
| Extract environment configuration | 🟡 Medium | ⏳ Pending |
| Improve unit test coverage | 🟡 Medium | ⏳ Pending |
| Add structured logging | 🟢 Low | ⏳ Pending |
| Add API rate limiting | 🟢 Low | ⏳ Pending |

---

## 🔗 Related Documents

- [MVP Feature Checklist](./mvp-checklist.md)
- [MVP Architecture Diagram](./mvp-architecture.md)
- [MVP Module Inclusion/Exclusion List](./mvp-modules.md)

## 🔗 Follow-Up Issues

- **#90** — Demo Scenario (end-to-end runnable demo)
- **#91** — One-Click Agent Creation API
- **#92** — Agent Lifecycle Cloud Orchestrator
- **#93** — Production Deployment Framework
