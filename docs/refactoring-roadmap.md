# TONAIAgent — Refactoring Roadmap

> Issue #241 · Deliverable 3 of 6

---

## Overview

This roadmap defines the ordered sequence of refactoring work required to evolve TONAIAgent from its current structure to the target production-grade monorepo architecture. Work is organized into three horizons aligned with the project's MVP timeline.

Each task includes: **effort estimate**, **risk level**, **dependencies**, and **acceptance criteria**.

---

## Horizon 1 — Foundation (Pre-MVP, Immediate)

These tasks improve clarity and hygiene without requiring any code changes. They can be executed in parallel by any contributor.

### H1-1: Remove Build Artifacts from Repository

**Effort**: 30 minutes
**Risk**: Low
**Dependencies**: None

**Tasks**:
1. Delete committed ZIP files from root:
   - `installer.zip`
   - `php-app.zip`
   - `telegram-miniapp.zip`
   - `static-website.zip`
2. Add exclusion patterns to `.gitignore`:
   ```
   *.zip
   dist/
   build/
   *.tsbuildinfo
   ```
3. Run `git rm --cached` for any cached artifacts.

**Acceptance Criteria**: Repository root contains no binary files; `git ls-files | grep .zip` returns empty.

---

### H1-2: Add Module Classification Comments to `src/index.ts`

**Effort**: 2 hours
**Risk**: Low
**Dependencies**: H1-1

**Tasks**:
1. Add section comments to `src/index.ts` grouping exports by classification:
   - `// === CORE PRODUCTION MODULES ===`
   - `// === EXTENDED FEATURES (POST-MVP) ===`
   - `// === RESEARCH & EXPERIMENTAL ===`
2. Document each group briefly.

**Acceptance Criteria**: A developer reading `src/index.ts` can immediately identify which modules are production-ready.

---

### H1-3: Create `research/` Directory with README

**Effort**: 2 hours
**Risk**: Low
**Dependencies**: H1-2

**Tasks**:
1. Create `research/README.md` explaining the research vs. production distinction.
2. Move research modules (maintaining git history via `git mv`):
   - `src/agfi/` → `research/agfi/`
   - `src/agfn/` → `research/agfn/`
   - `src/gaei/` → `research/gaei/`
   - `src/gaamp/` → `research/gaamp/`
   - `src/grif/` → `research/grif/`
   - `src/sgia/` → `research/sgia/`
   - `src/aifos/` → `research/aifos/`
   - `src/acms/` → `research/acms/`
3. Add re-exports from old `src/` paths for backward compatibility.
4. Update `package.json` exports to point to `research/` paths.
5. Run full test suite.

**Acceptance Criteria**: `npm test` passes; `npm run build` succeeds; research modules accessible via existing import paths.

---

### H1-4: Organize Documentation Directory

**Effort**: 3 hours
**Risk**: Low
**Dependencies**: None (can run in parallel with H1-1..H1-3)

**Tasks**:
1. Create subdirectories:
   - `docs/architecture/`
   - `docs/guides/`
   - `docs/modules/`
   - `docs/roadmap/`
2. Move files:
   - `docs/architecture.md` → `docs/architecture/overview.md`
   - `docs/mvp-architecture.md` → `docs/architecture/mvp.md`
   - `docs/autonomous-economy.md` → `docs/architecture/autonomous-economy.md`
   - `docs/developer.md` → `docs/guides/developer.md`
   - `docs/developer-setup.md` → `docs/guides/developer-setup.md`
   - `docs/development-guidelines.md` → `docs/guides/development-guidelines.md`
   - `docs/deployment.md` → `docs/guides/deployment.md`
   - `docs/backtesting.md` → `docs/guides/backtesting.md`
   - `docs/strategy-development.md` → `docs/guides/strategy-development.md`
   - `docs/plugin-development.md` → `docs/guides/plugin-development.md`
   - Domain docs (`agent-runtime.md`, `trading*.md`, etc.) → `docs/modules/`
   - Planning docs → `docs/roadmap/`
3. Update all cross-references in docs and README.
4. Add a `docs/README.md` index.

**Acceptance Criteria**: No broken cross-references; `docs/README.md` provides clear navigation.

---

### H1-5: Move Example/Demo Modules Out of `src/`

**Effort**: 1 hour
**Risk**: Low
**Dependencies**: None

**Tasks**:
1. Move `src/demo-agent/` → `examples/demo-agent/`
2. Move `src/investor-demo/` → `examples/investor-demo/`
3. Update `package.json` — remove these from exported entries if they are not public API.
4. Update any test files that import from these paths.

**Acceptance Criteria**: `npm test` passes; `src/` no longer contains example/demo code.

---

## Horizon 2 — Structure (MVP, Short-Term)

These tasks create the `apps/` layer and prepare for monorepo workspace configuration. They require careful coordination with active development.

### H2-1: Create `apps/` Layer

**Effort**: 4 hours
**Risk**: Medium
**Dependencies**: H1-4

**Tasks**:
1. Create `apps/` directory.
2. Move `website/` → `apps/web-dashboard/` using `git mv`.
3. Move `static-website/` → `apps/marketing-website/` using `git mv`.
4. Create `apps/telegram-miniapp/` with subdirectory structure:
   - `apps/telegram-miniapp/frontend/` ← `miniapp/`
   - `apps/telegram-miniapp/backend/` ← `telegram-miniapp/`
5. Update `.github/workflows/` paths.
6. Verify Vercel, K8s, Docker configs reference new paths.

**Acceptance Criteria**: All app deployments still work from new paths; CI passes.

---

### H2-2: Consolidate `portfolio` modules

**Effort**: 3 hours
**Risk**: Medium
**Dependencies**: Full test suite passing

**Tasks**:
1. Create unified `src/portfolio-core/` (or rename `src/portfolio-analytics/` to be the main module).
2. Merge `src/portfolio/` into `src/portfolio-analytics/`.
3. Merge `src/multi-user-portfolio/` into `src/portfolio-analytics/` as a submodule.
4. Add backward-compatible re-exports from old paths.
5. Update all internal imports.
6. Run full test suite.

**Acceptance Criteria**: Single `src/portfolio-analytics/` module; old import paths still work via re-exports; all tests pass.

---

### H2-3: Consolidate `trading` modules

**Effort**: 4 hours
**Risk**: Medium
**Dependencies**: H2-2

**Tasks**:
1. Merge `src/trading/` utilities into `src/trading-engine/`.
2. Merge `src/live-trading/` into `src/trading-engine/` as a submodule.
3. Add backward-compatible re-exports from old paths.
4. Update all internal imports.
5. Run full test suite.

**Acceptance Criteria**: Single `src/trading-engine/` module; all tests pass.

---

### H2-4: Consolidate `strategy` modules

**Effort**: 6 hours
**Risk**: Medium
**Dependencies**: H2-3

**Tasks**:
1. Create `src/strategy-core/` as the unified strategy module.
2. Migrate into it:
   - `src/strategy/` — base types and utilities
   - `src/strategies/` — publishing, registry, validation
   - `src/strategy-engine/` — execution pipeline
   - `src/strategy-marketplace/` — discovery and listing
   - `src/backtesting/` — as `src/strategy-core/backtesting/`
3. Maintain re-exports from old paths.
4. Update all internal imports.
5. Run full test suite.

**Acceptance Criteria**: Single `src/strategy-core/` module; all tests pass; backward-compatible exports.

---

### H2-5: Consolidate `agent` modules

**Effort**: 8 hours
**Risk**: High
**Dependencies**: H2-4 (most complex consolidation — do this last)

**Tasks**:
1. Create `src/agent-core/` as the unified agent module with subdirectories:
   - `src/agent-core/runtime/` — 9-step execution pipeline
   - `src/agent-core/orchestrator/` — coordination layer
   - `src/agent-core/control/` — REST API
   - `src/agent-core/lifecycle/` — state machine
   - `src/agent-core/base/` — base agent classes
2. Migrate from:
   - `src/agents/`
   - `src/agent-runtime/`
   - `src/agent-orchestrator/`
   - `src/agent-control/`
   - `src/lifecycle-orchestrator/`
3. Maintain backward-compatible re-exports.
4. Update all imports across `src/`, `tests/`, `examples/`.
5. Run full test suite and integration tests.

**Acceptance Criteria**: Single `src/agent-core/` module; all 95+ tests pass; backward-compatible exports maintained.

---

### H2-6: Add `packages/` Layer

**Effort**: 4 hours
**Risk**: Low
**Dependencies**: H2-2..H2-5

**Tasks**:
1. Create `packages/sdk/` — move `src/sdk/` here; update imports.
2. Create `packages/shared-types/` — extract common TypeScript interfaces from `src/index.ts`.
3. Create `packages/utils/` — extract utility functions used by 3+ modules.
4. Add workspace configuration to root `package.json`:
   ```json
   {
     "workspaces": ["apps/*", "packages/*", "core/*"]
   }
   ```

**Acceptance Criteria**: `packages/` contains shared code; `npm workspaces` resolves correctly.

---

### H2-7: Enforce Test Coverage Threshold

**Effort**: 2 hours
**Risk**: Low
**Dependencies**: H2-1..H2-6

**Tasks**:
1. Add coverage threshold to `vitest.config.*`:
   ```typescript
   coverage: {
     thresholds: {
       lines: 70,
       functions: 70,
       branches: 60,
       statements: 70,
     }
   }
   ```
2. Run `npm run test:coverage` and identify gaps.
3. Add missing tests for uncovered modules.

**Acceptance Criteria**: `npm run test:coverage` passes threshold; CI enforces coverage.

---

## Horizon 3 — Long-Term (Post-MVP)

These tasks represent significant architectural investments for scale.

### H3-1: Replace PHP Installer with TypeScript CLI

**Effort**: 2–3 weeks
**Risk**: Medium
**Dependencies**: Stable core API

**Tasks**:
1. Create `packages/cli/` with a `create-tonaiagent` CLI tool.
2. Implement interactive setup wizard using `inquirer` or `clack`.
3. Support: environment config, database setup, Telegram bot registration.
4. Replace `installer/` PHP multi-step installer.
5. Publish to npm as `@tonaiagent/create`.

**Acceptance Criteria**: New contributor can run `npx @tonaiagent/create` to bootstrap a local environment.

---

### H3-2: Split `src/market-data` into Separate Connector Packages

**Effort**: 1 week
**Risk**: Medium
**Dependencies**: H2-1..H2-6

**Tasks**:
1. Create `connectors/dex/stonfi/`, `connectors/dex/dedust/`, `connectors/dex/tonco/`.
2. Extract each DEX connector from `src/market-data/connectors/`.
3. Create `connectors/market-data/coingecko/`, `connectors/market-data/binance/`.
4. Version each connector package independently.

**Acceptance Criteria**: DEX connectors are independently versioned packages; easy to add new connectors.

---

### H3-3: Evaluate PHP → TypeScript Migration

**Effort**: 4–8 weeks
**Risk**: High
**Dependencies**: Product team decision

**Tasks**:
1. Audit PHP backend (`telegram-miniapp/`, `php-app/`) for feature completeness.
2. Design TypeScript equivalent API using NestJS or Hono.
3. Implement database layer (PostgreSQL + Drizzle ORM).
4. Migrate endpoints incrementally.
5. Run A/B deployment: PHP + TypeScript side-by-side.
6. Cut over when TypeScript implementation reaches parity.

**Acceptance Criteria**: Zero-PHP codebase; `telegram-miniapp/backend/` is TypeScript; feature parity verified.

---

### H3-4: Full Monorepo Tooling Setup

**Effort**: 1 week
**Risk**: Low
**Dependencies**: H2-6, H3-1..H3-3

**Tasks**:
1. Adopt Turborepo or Nx for monorepo task orchestration.
2. Configure caching for build and test tasks.
3. Set up `turbo run build --filter=@tonaiagent/core` style commands.
4. Configure remote caching (Vercel Remote Cache or Nx Cloud).

**Acceptance Criteria**: `turbo build` executes in < 60s from clean cache due to caching.

---

## Timeline Summary

| Horizon | Duration | Focus | Risk |
|---------|---------|-------|------|
| H1 — Foundation | 1–2 weeks | Hygiene, docs, research separation | Low |
| H2 — Structure | 4–6 weeks | Apps layer, module consolidation, packages | Medium |
| H3 — Long-Term | 3+ months | CLI, connector packages, PHP migration, tooling | High |

---

## Success Metrics

| Metric | Current | Target (H1) | Target (H2) | Target (H3) |
|--------|---------|-------------|-------------|-------------|
| `src/` module count | 82 | 74 (−8 moved to research) | ~45 (consolidated) | ~30 |
| Time to understand repo for new dev | 2–4 hours | 1–2 hours | 30–60 min | 15–30 min |
| Languages at root level | 7 | 7 | 5 | 3 (TS + infra) |
| Test coverage threshold enforced | No | No | Yes (70%) | Yes (80%) |
| Binary files in git | 4 ZIPs | 0 | 0 | 0 |
| Docs organization | Flat (52 files) | Subdirs | Subdirs + index | Full |

---

*See also: [architecture-audit.md](architecture-audit.md), [restructuring-plan.md](restructuring-plan.md), [technical-debt.md](technical-debt.md)*
