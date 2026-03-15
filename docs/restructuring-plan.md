# TONAIAgent — Directory Restructuring Plan

> Issue #241 · Deliverable 2 of 6

---

## Overview

This document defines the target directory structure for TONAIAgent as a production-grade monorepo and specifies the migration path from the current layout to the target layout.

The restructuring is designed to be **incremental** — no migration requires a single "big bang" refactor. Each phase can be executed independently without breaking existing functionality.

---

## Target Directory Structure

```
TONAIAgent/
├── apps/                          # Deployable user-facing applications
│   ├── telegram-miniapp/          # Telegram Mini App (frontend + backend)
│   │   ├── frontend/              # Vanilla JS / TypeScript frontend (from miniapp/)
│   │   │   ├── src/
│   │   │   │   ├── components/
│   │   │   │   ├── screens/
│   │   │   │   ├── wallet/
│   │   │   │   ├── agents/
│   │   │   │   ├── portfolio/
│   │   │   │   └── api/
│   │   │   ├── index.html
│   │   │   └── styles.css
│   │   └── backend/               # PHP API backend (from telegram-miniapp/)
│   │       ├── app/
│   │       ├── public/
│   │       └── database/
│   ├── web-dashboard/             # Next.js product site (from website/)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   └── public/
│   └── marketing-website/         # Static HTML site (from static-website/)
│       ├── index.html
│       └── css/, js/, images/
│
├── core/                          # Core platform logic (TypeScript)
│   ├── agents/                    # Merged: agents, agent-runtime, agent-orchestrator,
│   │   │                          #         agent-control, lifecycle-orchestrator
│   │   ├── runtime/               # 9-step execution pipeline
│   │   ├── orchestrator/          # Coordination layer
│   │   ├── control/               # REST management API
│   │   ├── lifecycle/             # State machine management
│   │   └── types.ts
│   ├── strategies/                # Merged: strategy, strategies, strategy-engine,
│   │   │                          #         strategy-marketplace, backtesting
│   │   ├── engine/                # Execution pipeline
│   │   ├── implementations/       # SMA, Arbitrage, AI Signal
│   │   ├── marketplace/           # Discovery and publishing
│   │   ├── backtesting/           # Historical simulation
│   │   └── types.ts
│   ├── trading/                   # Merged: trading, trading-engine, live-trading
│   │   ├── engine/                # Trade execution + PnL
│   │   ├── live/                  # Live execution mode
│   │   └── types.ts
│   ├── portfolio/                 # Merged: portfolio, portfolio-analytics,
│   │   │                          #         multi-user-portfolio
│   │   ├── analytics/             # Metrics, equity curve, trade history
│   │   ├── multi-user/            # Multi-user portfolio tracking
│   │   └── types.ts
│   ├── ai/                        # Merged: ai, ai-safety
│   │   ├── providers/             # Groq, Anthropic, OpenAI, xAI, Google
│   │   ├── memory/                # Agent memory system
│   │   ├── safety/                # Guardrails, alignment, anomaly detection
│   │   └── types.ts
│   ├── risk/                      # Merged: risk-engine, systemic-risk (production parts)
│   │   ├── engine/                # VaR, stress testing
│   │   └── types.ts
│   └── market-data/               # Merged: market-data, data-platform
│       ├── providers/             # CoinGecko, Binance
│       ├── connectors/            # DEX: StonFi, DeDust, Tonco
│       ├── cache/                 # TTL-based caching
│       └── types.ts
│
├── services/                      # Runnable microservices
│   ├── api/                       # Main API gateway + agent control
│   ├── execution-engine/          # Trade execution service
│   └── scheduler/                 # Distributed cron + event triggers
│
├── connectors/                    # External integrations (stateless adapters)
│   ├── dex/                       # DEX connectors (StonFi, DeDust, Tonco)
│   ├── wallets/                   # TON Connect, wallet adapters
│   └── market-data/               # Price feeds, oracles
│
├── packages/                      # Shared internal packages
│   ├── sdk/                       # Enterprise SDK (from src/sdk/)
│   ├── shared-types/              # Common TypeScript interfaces (from src/index.ts)
│   └── utils/                     # Shared utilities (extracted from modules)
│
├── extended/                      # Advanced features (post-MVP)
│   ├── omnichain/                 # Cross-chain infrastructure
│   ├── cross-chain-liquidity/     # Multi-chain arbitrage
│   ├── liquidity-network/         # Institutional liquidity
│   ├── liquidity-router/          # Smart order routing
│   ├── clearing-house/            # CCP clearing, netting
│   ├── prime-brokerage/           # Multi-fund custody, leverage
│   ├── hedgefund/                 # Autonomous hedge fund
│   ├── fund-manager/              # Fund lifecycle
│   ├── ecosystem-fund/            # Ecosystem grants
│   ├── investment/                # Investment framework
│   ├── institutional/             # Compliance, KYC/AML
│   ├── institutional-network/     # Global partnerships
│   ├── rwa/                       # Real-world assets
│   ├── payments/                  # Autonomous payments
│   ├── growth/                    # Viral growth, referrals
│   ├── dao-governance/            # DAO mechanisms
│   ├── monetary-policy/           # Programmable monetary policy
│   └── protocol-constitution/     # Constitutional governance
│
├── research/                      # Long-term research modules (clearly marked)
│   ├── agfi/                      # AI-native Global Financial Infrastructure
│   ├── agfn/                      # AI Global Finance Network
│   ├── gaei/                      # Global AI Economic Infrastructure
│   ├── gaamp/                     # Global AI Agent Management Platform
│   ├── grif/                      # Global Risk Infrastructure
│   ├── sgia/                      # Systemic Global Intelligence Architecture
│   ├── aifos/                     # AI-native Financial Operating System
│   ├── acms/                      # Autonomous Capital Markets Stack
│   └── README.md                  # Explains research vs production distinction
│
├── infrastructure/                # Deployment and operations
│   ├── deploy/                    # Cloud deployment (from deploy/)
│   │   ├── aws/
│   │   ├── kubernetes/
│   │   ├── docker/
│   │   ├── vercel/
│   │   └── global/
│   ├── monitoring/                # Prometheus, Grafana (from deploy/monitoring/)
│   └── scripts/                   # All scripts consolidated
│       ├── deploy.sh
│       ├── health-check.sh
│       ├── validate.sh
│       └── backtest.ts
│
├── docs/                          # Organized documentation
│   ├── architecture/              # System design documents
│   │   ├── overview.md            # (from architecture.md)
│   │   ├── audit.md               # (new - architecture-audit.md)
│   │   └── module-dependencies.md # (new)
│   ├── guides/                    # How-to guides
│   │   ├── developer-onboarding.md # (new)
│   │   ├── developer-setup.md
│   │   ├── contributing.md
│   │   ├── deployment.md
│   │   ├── backtesting.md
│   │   └── strategy-development.md
│   ├── modules/                   # Per-module documentation
│   │   ├── agents.md
│   │   ├── trading.md
│   │   ├── strategies.md
│   │   ├── market-data.md
│   │   └── ... (one per core module)
│   └── roadmap/                   # Planning documents
│       ├── restructuring-plan.md  # (new - this file)
│       ├── refactoring-roadmap.md # (new)
│       └── technical-debt.md      # (new)
│
├── tests/                         # Mirrored test suite
│   ├── unit/                      # Fast, isolated unit tests
│   ├── integration/               # Integration tests (real dependencies)
│   ├── e2e/                       # End-to-end scenario tests
│   └── simulation/                # Agent simulation tests
│
├── examples/                      # Developer examples (keep as-is)
│   ├── basic-usage.ts
│   ├── backtesting-demo.ts
│   └── ... (existing examples)
│
├── experiments/                   # All experimental code (expanded)
│   ├── telegram/                  # PHP Telegram experiments
│   └── validation/                # Validation experiments
│
├── .github/                       # GitHub configuration (keep as-is)
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
│
├── package.json                   # Root workspace manifest
├── tsconfig.json                  # Root TypeScript config
├── .env.example                   # Environment template
├── .gitignore                     # Updated to exclude *.zip
├── README.md                      # Updated architecture section
└── CONTRIBUTING.md                # Contribution guidelines
```

---

## Migration Phases

### Phase 0 — Repository Hygiene (No Code Changes)

**Goal**: Clean up the repository without touching any source code.

**Steps**:

1. **Remove ZIP artifacts from root**
   ```bash
   git rm installer.zip php-app.zip telegram-miniapp.zip static-website.zip
   ```

2. **Add ZIP pattern to `.gitignore`**
   ```gitignore
   # Build artifacts
   *.zip
   dist/
   *.tsbuildinfo
   ```

3. **Update `deploy/github-actions/` to reference actual CI files**
   - Either remove `deploy/github-actions/` (duplicate of `.github/workflows/`)
   - Or document that it contains reference copies for documentation purposes

**Risk**: Low — no source code changed.

---

### Phase 1 — Docs and Research Separation (Non-Breaking)

**Goal**: Separate experimental research modules from production code; organize docs.

**Steps**:

1. **Create `research/` directory** at repository root with a `README.md` explaining its purpose.

2. **Move research modules** from `src/` to `research/`:
   - `src/agfi/` → `research/agfi/`
   - `src/agfn/` → `research/agfn/`
   - `src/gaei/` → `research/gaei/`
   - `src/gaamp/` → `research/gaamp/`
   - `src/grif/` → `research/grif/`
   - `src/sgia/` → `research/sgia/`
   - `src/aifos/` → `research/aifos/`
   - `src/acms/` → `research/acms/`

3. **Update `package.json`** exports and `src/index.ts` to import from `research/` paths.

4. **Organize `docs/`** into subdirectories:
   - `docs/architecture/` — system design docs
   - `docs/guides/` — how-to guides
   - `docs/modules/` — per-module docs
   - `docs/roadmap/` — planning docs

5. **Move demo modules** from `src/` to `examples/`:
   - `src/demo-agent/` → `examples/demo-agent/`
   - `src/investor-demo/` → `examples/investor-demo/`

**Risk**: Low — exports are updated but functionality unchanged.

---

### Phase 2 — Apps Layer Creation (Non-Breaking)

**Goal**: Create the `apps/` layer with proper subproject separation.

**Steps**:

1. **Create `apps/` directory**

2. **Move website to `apps/web-dashboard/`**:
   - `website/` → `apps/web-dashboard/`
   - Update `website/package.json` to `apps/web-dashboard/package.json`

3. **Move static site to `apps/marketing-website/`**:
   - `static-website/` → `apps/marketing-website/`

4. **Create `apps/telegram-miniapp/`**:
   - `miniapp/` → `apps/telegram-miniapp/frontend/`
   - `telegram-miniapp/` → `apps/telegram-miniapp/backend/`

5. **Update CI/CD references** to new paths.

**Risk**: Medium — CI/CD paths need updating; no code changes.

---

### Phase 3 — Core Module Consolidation (Breaking for Internals)

**Goal**: Merge fragmented domain modules. This is the most significant step.

**Steps**:

1. **Consolidate Agent modules** → `core/agents/`:
   - Merge `src/agents/`, `src/agent-runtime/`, `src/agent-orchestrator/`, `src/agent-control/`, `src/lifecycle-orchestrator/` into `src/agents/` with internal subdirectories.
   - Update exports in `package.json`.

2. **Consolidate Strategy modules** → `core/strategies/`:
   - Merge `src/strategy/`, `src/strategies/`, `src/strategy-engine/`, `src/strategy-marketplace/`, `src/backtesting/`.

3. **Consolidate Trading modules** → `core/trading/`:
   - Merge `src/trading/`, `src/trading-engine/`, `src/live-trading/`.

4. **Consolidate Portfolio modules** → `core/portfolio/`:
   - Merge `src/portfolio/`, `src/portfolio-analytics/`, `src/multi-user-portfolio/`.

5. **Consolidate Market Data modules** → `core/market-data/`:
   - Merge `src/market-data/`, `src/data-platform/`.

6. **Update all imports** across `src/`, `tests/`, `examples/`.

**Risk**: High — requires broad import updates. Must be done with automated tooling (e.g., `ts-morph` or `sed` scripts) and verified by full test suite.

---

### Phase 4 — Services and Connectors Layer (Additive)

**Goal**: Extract runnable services and external integrations.

**Steps**:

1. **Create `services/api/`** — extract HTTP API layer from `src/agent-control/`.

2. **Create `connectors/dex/`** — move DEX connectors from `src/market-data/connectors/`.

3. **Create `connectors/wallets/`** — extract wallet adapter code.

4. **Create `packages/shared-types/`** — extract shared TypeScript interfaces from `src/index.ts`.

5. **Create `packages/utils/`** — extract common utility functions.

**Risk**: Medium — new directories, some refactoring of imports.

---

### Phase 5 — Infrastructure Consolidation (Non-Breaking)

**Goal**: Consolidate all deployment and scripts into `infrastructure/`.

**Steps**:

1. **Create `infrastructure/`** directory.

2. **Move `deploy/` → `infrastructure/deploy/`**

3. **Consolidate scripts**:
   - `scripts/` → `infrastructure/scripts/`
   - `deploy/scripts/` → `infrastructure/scripts/`

4. **Update `.github/workflows/`** with new paths.

**Risk**: Low — path-only changes, CI needs updating.

---

## Migration Constraints

### What Must Not Change

- Public API surface of `@tonaiagent/core` (all current exports must remain valid)
- Test file structure relative to source files (maintain 1:1 mirroring)
- Active CI/CD pipelines (update paths, but keep logic intact)
- `README.md` quick-start code examples (imports must remain valid)

### Backward Compatibility

During the transition, maintain re-exports from old paths:

```typescript
// src/agent-runtime/index.ts — transitional re-export
export * from '../agents/runtime';
```

These transitional re-exports can be removed once all consumers have been updated.

---

## File Count Impact

| Phase | Directories Created | Directories Moved | Files Changed |
|-------|--------------------|--------------------|---------------|
| Phase 0 | 0 | 0 | 4 (removed ZIPs) + 1 (.gitignore) |
| Phase 1 | 10 | 8 src/ modules + docs subdirs | ~20 exports |
| Phase 2 | 4 apps/ dirs | 4 top-level dirs | CI/CD paths |
| Phase 3 | 5 core/ modules | 17 src/ modules | ~300 imports |
| Phase 4 | 5 new dirs | 3 src/ modules | ~50 imports |
| Phase 5 | 1 infra/ dir | 2 script dirs | CI/CD paths |

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Keep PHP backend as-is for now | PHP → TypeScript migration requires product team decision |
| Retain `static-website/` until Next.js site is confirmed production | Avoid breaking live deployment |
| Move research modules before consolidating core | Lower risk, immediate clarity improvement |
| Keep `tests/` at root (not inside `core/`) | Maintains existing test runner configuration |
| Use `extended/` not `advanced/` | More neutral term — not all advanced features are equal priority |

---

*See also: [architecture-audit.md](architecture-audit.md), [refactoring-roadmap.md](refactoring-roadmap.md), [technical-debt.md](technical-debt.md)*
