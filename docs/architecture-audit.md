# TONAIAgent — Repository Architecture Audit

> Issue #241 · Deliverable 1 of 6

---

## Executive Summary

The TONAIAgent repository has grown rapidly through 241+ issues and feature implementations into a **complex, multi-language, multi-stack monorepo** serving as:

- A TypeScript core library (exported as `@tonaiagent/core`)
- A PHP backend application (Telegram Mini App + installer)
- Multiple frontend deployments (Next.js, static HTML, vanilla JS Mini App)
- Deployment infrastructure (AWS, Kubernetes, Docker, Vercel)
- Comprehensive documentation and examples

This audit evaluates the current structure, identifies inconsistencies, maps existing components to the target architecture, and provides actionable recommendations.

---

## 1. Current Repository Inventory

### Top-Level Structure

```
TONAIAgent/
├── src/              Core TypeScript library (82 modules, 659+ .ts files)
├── tests/            Test suite (81 directories, 95+ test files)
├── deploy/           Multi-cloud deployment configs (AWS, K8s, Docker, Vercel, Global)
├── docs/             Documentation (52 markdown files, ~1.4 MB)
├── website/          Next.js marketing/product site (TypeScript/React)
├── static-website/   Static HTML alternative deployment
├── telegram-miniapp/ PHP backend for Telegram Mini App
├── miniapp/          Vanilla JS/HTML frontend for Mini App
├── php-app/          Full-stack PHP web application
├── installer/        Multi-step PHP installer
├── scripts/          Utility scripts (backtesting runner)
├── examples/         9 TypeScript developer examples
├── experiments/      PHP and TS research experiments
├── .github/          GitHub Actions CI/CD + issue templates
├── package.json      Root: @tonaiagent/core v2.40.0, 66 exports, 582 lines
├── tsconfig.json     TypeScript configuration
├── *.zip             Pre-bundled deployment artifacts
└── README.md, CONTRIBUTING.md, .env.example, .eslintrc.js
```

### Language Distribution

| Language | Location | Purpose |
|----------|----------|---------|
| TypeScript | `src/`, `tests/`, `examples/`, `scripts/` | Core platform library |
| TypeScript/TSX | `website/` | Next.js marketing site |
| PHP | `telegram-miniapp/`, `php-app/`, `installer/`, `experiments/` | Backend apps + installer |
| HTML/CSS/JS | `miniapp/`, `static-website/` | Frontend deployments |
| HCL (Terraform) | `deploy/aws/`, `deploy/global/` | Infrastructure as code |
| YAML | `deploy/kubernetes/`, `.github/` | K8s + CI/CD configs |
| Shell | `deploy/scripts/` | Deployment scripts |
| SQL | `deploy/docker/`, `telegram-miniapp/` | Database schemas |

### Key Metrics

| Metric | Count |
|--------|-------|
| TypeScript modules (`src/`) | 82 |
| TypeScript files (`src/`) | 659+ |
| Test files | 95+ |
| Exported package entry points | 66 |
| Documentation files | 52 |
| Deployment targets | 6 (AWS, K8s, Docker, Vercel, Global, GitHub Actions) |
| Languages in use | 7 |
| Zipped deployment artifacts at root | 4 |

---

## 2. Module Classification

### 2.1 Core Platform Components (Production-ready)

These modules form the working heart of the platform and are tested, exported, and documented:

#### Agents Layer
| Module | Path | Status |
|--------|------|--------|
| Agent Runtime | `src/agent-runtime/` | ✅ Core — 9-step execution pipeline |
| Agent Orchestrator | `src/agent-orchestrator/` | ✅ Core — coordination layer |
| Agent Control API | `src/agent-control/` | ✅ Core — REST management API |
| Lifecycle Orchestrator | `src/lifecycle-orchestrator/` | ✅ Core — state machine |
| Multi-Agent Framework | `src/multi-agent/` | ✅ Core — 16 files, delegation + governance |

#### Trading Layer
| Module | Path | Status |
|--------|------|--------|
| Strategy Engine | `src/strategy-engine/` | ✅ Core — SMA, Arbitrage, AI Signal |
| Trading Engine | `src/trading-engine/` | ✅ Core — execution + PnL |
| Market Data | `src/market-data/` | ✅ Core — CoinGecko, Binance, DEX |
| Portfolio Analytics | `src/portfolio-analytics/` | ✅ Core — metrics + monitoring |
| Backtesting | `src/backtesting/` | ✅ Core — historical simulation |
| Live Trading | `src/live-trading/` | ✅ Core — live execution mode |
| Risk Engine | `src/risk-engine/` | ✅ Core — VaR, stress testing |

#### Strategy Layer
| Module | Path | Status |
|--------|------|--------|
| Strategy | `src/strategy/` | ✅ Core — base types + utilities |
| Strategies | `src/strategies/` | ✅ Core — registry + publishing |
| Strategy Marketplace | `src/strategy-marketplace/` | ✅ Core — discovery + listing |
| Marketplace | `src/marketplace/` | ✅ Core — full marketplace (16 files) |
| Reputation | `src/reputation/` | ✅ Core — performance scoring |
| Revenue | `src/revenue/` | ✅ Core — revenue distribution |

#### Infrastructure Layer
| Module | Path | Status |
|--------|------|--------|
| Protocol | `src/protocol/` | ✅ Core — identity, messaging, cross-chain |
| Security | `src/security/` | ✅ Core — key management, custody |
| Plugins | `src/plugins/` | ✅ Core — plugin registry + runtime |
| Runtime | `src/runtime/` | ✅ Core — runtime management |
| Distributed Scheduler | `src/distributed-scheduler/` | ✅ Core — fault-tolerant cron |
| Monitoring | `src/monitoring/` | ✅ Core — health, metrics, alerts |

#### AI Layer
| Module | Path | Status |
|--------|------|--------|
| AI | `src/ai/` | ✅ Core — multi-provider routing (Groq, Anthropic, OpenAI, xAI) |
| AI Safety | `src/ai-safety/` | ✅ Core — guardrails + alignment |

#### MVP / Product Layer
| Module | Path | Status |
|--------|------|--------|
| MVP | `src/mvp/` | ✅ Core — Mini App, Marketplace, Agents, Dashboard, Revenue |
| MVP Platform | `src/mvp-platform/` | ✅ Core — platform abstractions |
| Production Mini App | `src/production-miniapp/` | ✅ Core — wallet, trading, portfolio |
| Superapp | `src/superapp/` | ✅ Core — TON Super App (wallet, agents, social) |

### 2.2 Advanced / Extended Components (Post-MVP)

Modules that are architecturally complete but represent advanced features beyond the initial MVP:

| Module | Category | Notes |
|--------|----------|-------|
| `src/omnichain/` | Cross-chain | Cross-chain infrastructure |
| `src/cross-chain-liquidity/` | DeFi | Multi-chain arbitrage |
| `src/liquidity-network/` | DeFi | Institutional liquidity |
| `src/liquidity-router/` | DeFi | Smart order routing |
| `src/clearing-house/` | Finance | CCP clearing, netting |
| `src/prime-brokerage/` | Finance | Multi-fund custody, leverage |
| `src/hedgefund/` | Finance | Autonomous hedge fund |
| `src/fund-manager/` | Finance | Fund lifecycle |
| `src/ecosystem-fund/` | Finance | Ecosystem grants |
| `src/investment/` | Finance | Investment framework |
| `src/institutional/` | Finance | Compliance, KYC/AML |
| `src/institutional-network/` | Finance | Global partnerships |
| `src/rwa/` | DeFi | Real-world assets |
| `src/payments/` | Product | Autonomous payments |
| `src/growth/` | Product | Viral growth, referrals |
| `src/dao-governance/` | Governance | DAO mechanisms |
| `src/protocol-constitution/` | Governance | Constitutional framework |
| `src/monetary-policy/` | Infrastructure | Programmable central bank |

### 2.3 Experimental / Research Modules

Modules representing advanced research or long-term vision:

| Module | Category | Notes |
|--------|----------|-------|
| `src/agfi/` | Research | AI-native Global Financial Infrastructure |
| `src/agfn/` | Research | AI Global Finance Network |
| `src/gaei/` | Research | Global AI Economic Infrastructure |
| `src/gaamp/` | Research | Global AI Agent Management Platform |
| `src/grif/` | Research | Global Risk Infrastructure |
| `src/sgia/` | Research | Systemic Global Intelligence Architecture |
| `src/aifos/` | Research | AI-native Financial Operating System |
| `src/acms/` | Research | Autonomous Capital Markets Stack |
| `src/systemic-risk/` | Research | Systemic risk monitoring |
| `src/global-infrastructure/` | Infrastructure | Global edge deployment |

### 2.4 Utility / Support Modules

| Module | Category | Notes |
|--------|----------|-------|
| `src/sdk/` | Developer | Enterprise SDK |
| `src/data-platform/` | Data | Global data and signal platform |
| `src/multi-tenant/` | Infrastructure | Multi-tenant support |
| `src/no-code/` | Product | Visual strategy builder |
| `src/personal-finance/` | Product | AI-native wealth management |
| `src/mobile-ux/` | Product | Mobile-first UX, onboarding |
| `src/token-strategy/` | Tokenomics | Token launch + valuation |
| `src/tokenomics/` | Tokenomics | Token economy design |
| `src/token-utility-economy/` | Tokenomics | Utility token mechanics |
| `src/regulatory/` | Compliance | Regulatory framework |
| `src/sdacl/` | Security | Smart data access control |
| `src/ipls/` | Protocol | Inter-Protocol Liquidity System |
| `src/ai-credit/` | Finance | AI-powered lending |
| `src/autonomous-discovery/` | Discovery | Autonomous discovery |
| `src/ton-factory/` | Blockchain | TON smart contract factory |
| `src/launchpad/` | Product | Agent launchpad for DAOs |
| `src/demo-agent/` | Examples | Autonomous TON strategy example |
| `src/investor-demo/` | Examples | End-to-end investor demo |
| `src/portfolio/` | Utilities | Portfolio utilities |
| `src/multi-user-portfolio/` | Finance | Multi-user portfolio |
| `src/agents/` | Agents | Base + specialized agents |
| `src/trading/` | Trading | Trading utilities |
| `src/strategy-engine/strategies/` | Strategies | Concrete strategy implementations |

---

## 3. Structural Issues Identified

### 3.1 Root-Level Clutter

**Problem**: Zip artifacts (`installer.zip`, `php-app.zip`, `telegram-miniapp.zip`, `static-website.zip`) are committed at the root. These are binary build outputs that should be excluded from version control or stored in CI/CD artifacts.

**Impact**: Inflates repository size; confuses contributors about what is source vs build output.

### 3.2 Mixed Language Stacks Without Clear Boundaries

**Problem**: The repository contains TypeScript, PHP, HTML/JS, Terraform, YAML, and Shell in a flat top-level layout without explicit boundary markers.

**Impact**: New contributors cannot quickly identify which stack handles which concern. A backend PHP developer and a TypeScript library developer operate in completely different parts of the tree with no visual separation.

### 3.3 Duplicate / Parallel Implementations

**Problem**: Three parallel Mini App implementations exist:
- `miniapp/` — vanilla JS frontend (current production UI)
- `telegram-miniapp/` — PHP backend
- `src/production-miniapp/` — TypeScript module with production-quality components

**Impact**: Unclear which is the canonical implementation. All three evolve independently, creating potential inconsistency.

**Problem**: Two website implementations:
- `website/` — Next.js site (React)
- `static-website/` — plain HTML alternative

**Impact**: Maintenance burden of keeping both in sync.

### 3.4 Over-Granular `src/` Module Fragmentation

**Problem**: 82 top-level modules in `src/` with overlapping concerns:
- `strategy`, `strategies`, `strategy-engine`, `strategy-marketplace` — 4 modules for the strategy domain
- `agents`, `agent-runtime`, `agent-orchestrator`, `agent-control`, `demo-agent` — 5 modules for the agent domain
- `trading`, `trading-engine`, `live-trading` — 3 modules for trading execution
- `portfolio`, `portfolio-analytics`, `multi-user-portfolio` — 3 modules for portfolio
- `mvp`, `mvp-platform`, `production-miniapp` — 3 modules for the MVP product

**Impact**: Cognitive overload; unclear where to add new logic; imports span multiple modules for a single feature.

### 3.5 Experimental Code Mixed with Production Code

**Problem**: Research modules (`agfi`, `agfn`, `gaei`, `gaamp`, `grif`, `sgia`, `aifos`, `acms`) exist alongside production modules in `src/` with no distinction.

**Impact**: New contributors cannot distinguish what is production-ready from what is exploratory.

### 3.6 `experiments/` Scope Too Narrow

**Problem**: The `experiments/` directory contains only 3 files (2 PHP, 1 TS), but many experimental TypeScript modules live in `src/` (e.g., `demo-agent`, `investor-demo`).

**Impact**: Inconsistent placement of experimental code.

### 3.7 Missing Top-Level Organization

**Problem**: No `apps/`, `core/`, `services/`, `connectors/`, `packages/` top-level directories. All code lives either at `src/` (TS library) or as named directories (`website/`, `telegram-miniapp/`, etc.).

**Impact**: Does not follow standard monorepo conventions that most contributors will recognize.

### 3.8 Test Structure Inconsistency

**Problem**: `tests/` has 81 directories but `src/` has 82 modules. The test coverage mapping is incomplete for several newer modules.

**Impact**: Gaps in test coverage are hard to detect; no enforced coverage requirement visible in CI config.

### 3.9 Deploy Directory Partially Out of Date

**Problem**: `deploy/github-actions/` contains workflow definitions, but the active workflows are in `.github/workflows/`. These two locations may diverge.

**Impact**: Confusion about which workflow files are authoritative.

### 3.10 `scripts/` Directory Scope Too Narrow

**Problem**: Only one file (`backtest.ts`) in `scripts/`. Other operational scripts (deployment, health-check, validate) live in `deploy/scripts/`.

**Impact**: Scripts scattered across two locations.

---

## 4. Component Mapping: Current → Target Architecture

The following table maps existing directories to the target monorepo structure proposed in issue #241:

| Target Path | Current Location | Status |
|-------------|-----------------|--------|
| `apps/telegram-miniapp/` | `miniapp/` + `telegram-miniapp/` | Needs merge/clarity |
| `apps/web-dashboard/` | `website/` | Needs rename |
| `apps/marketing-website/` | `static-website/` | Needs rename |
| `core/agents/` | `src/agents/`, `src/agent-runtime/`, `src/agent-orchestrator/`, `src/agent-control/`, `src/lifecycle-orchestrator/` | Needs consolidation |
| `core/strategies/` | `src/strategy/`, `src/strategies/`, `src/strategy-engine/`, `src/strategy-marketplace/`, `src/backtesting/` | Needs consolidation |
| `core/trading/` | `src/trading/`, `src/trading-engine/`, `src/live-trading/` | Needs consolidation |
| `core/router/` | `src/liquidity-router/`, `src/market-data/` | Partial overlap |
| `core/portfolio/` | `src/portfolio/`, `src/portfolio-analytics/`, `src/multi-user-portfolio/` | Needs consolidation |
| `core/ai/` | `src/ai/`, `src/ai-safety/` | Clear boundary |
| `core/market-data/` | `src/market-data/`, `src/data-platform/` | Needs consolidation |
| `services/api/` | `src/agent-control/` + backend logic | Needs extraction |
| `services/execution-engine/` | `src/trading-engine/`, `src/live-trading/` | Partial |
| `services/scheduler/` | `src/distributed-scheduler/` | Clear boundary |
| `connectors/dex/` | `src/market-data/connectors/` | Already present |
| `connectors/wallets/` | Parts of `src/production-miniapp/`, `telegram-miniapp/` | Needs extraction |
| `connectors/market-data/` | `src/market-data/providers/` | Already present |
| `packages/sdk/` | `src/sdk/` | Clear boundary |
| `packages/shared-types/` | `src/index.ts` type exports | Needs extraction |
| `packages/utils/` | Scattered across modules | Needs extraction |
| `infrastructure/deploy/` | `deploy/` | Clear boundary |
| `infrastructure/docker/` | `deploy/docker/` | Needs move |
| `infrastructure/scripts/` | `deploy/scripts/`, `scripts/` | Needs consolidation |
| `docs/architecture/` | `docs/architecture.md` + related | Needs reorganization |
| `docs/developer-guide/` | `docs/developer.md`, `docs/developer-setup.md` | Needs merge |
| `tests/` | `tests/` | Already correct |

---

## 5. Assessment of Each Directory

### `src/` — Overall Score: 7/10
**Strengths**: Well-documented, tested, comprehensive TypeScript library with 66 export points.
**Weaknesses**: 82 modules are too granular; 7 research modules mixed with production code; strategy/agent/trading each fragmented into 3–5 sub-modules.

### `tests/` — Overall Score: 8/10
**Strengths**: Mirrors src/ structure, uses Vitest, good coverage breadth.
**Weaknesses**: Coverage gaps in newer modules; no enforced minimum coverage threshold visible in config.

### `miniapp/` — Overall Score: 6/10
**Strengths**: Self-contained, production-deployed, works inside Telegram.
**Weaknesses**: Vanilla JS in 2024/25 without framework; `production.js` (34 KB) and `app.js` (17 KB) are monolithic; no component tests.

### `telegram-miniapp/` — Overall Score: 6/10
**Strengths**: PHP backend with Vercel + Cloudflare Workers deployment, database schema.
**Weaknesses**: PHP in a primarily TypeScript project; installation via manual PHP installer is non-standard; overlaps with `miniapp/` frontend.

### `php-app/` — Overall Score: 5/10
**Strengths**: Complete PHP web app with installation support.
**Weaknesses**: Unclear relationship to `telegram-miniapp/`; PHP stack adds a second language runtime to maintain; no TypeScript integration.

### `website/` — Overall Score: 8/10
**Strengths**: Modern Next.js 15 App Router, component-based, multiple pages.
**Weaknesses**: Lives in `website/` not `apps/web/`; duplicate functionality with `static-website/`.

### `static-website/` — Overall Score: 5/10
**Strengths**: Zero-dependency static deployment.
**Weaknesses**: Duplicates `website/` content; manual HTML maintenance burden; 58 KB `index.html` is unmaintainable.

### `deploy/` — Overall Score: 8/10
**Strengths**: Multi-cloud coverage, Helm charts, Terraform, monitoring config.
**Weaknesses**: `deploy/github-actions/` duplicates `.github/workflows/`; mixed with actual active CI configs.

### `installer/` — Overall Score: 4/10
**Strengths**: Step-by-step guided installation for non-technical users.
**Weaknesses**: PHP-based; non-standard for a TypeScript project; should become a CLI installer or Docker-based setup.

### `docs/` — Overall Score: 7/10
**Strengths**: Extremely comprehensive (52 docs, 1.4 MB); covers all major subsystems.
**Weaknesses**: No clear structure (all files at root of `docs/`); some docs likely outdated as code evolves; no developer onboarding guide.

### `examples/` — Overall Score: 8/10
**Strengths**: 9 concrete TypeScript examples covering major features.
**Weaknesses**: `demo-agent` and `investor-demo` modules in `src/` perform same role; two locations.

### `experiments/` — Overall Score: 4/10
**Strengths**: Separates experimental code.
**Weaknesses**: Only 3 files; many experimental modules live in `src/` instead; PHP experiments alongside TypeScript experiments.

### `scripts/` — Overall Score: 5/10
**Strengths**: Has backtesting runner.
**Weaknesses**: Only 1 file; `deploy/scripts/` is a second scripts location.

### Root-level ZIP files — Overall Score: 1/10
**Issue**: `installer.zip`, `php-app.zip`, `telegram-miniapp.zip`, `static-website.zip` are build outputs that should not live in the source repository. They inflate `.git` history and confuse contributors.

---

## 6. Key Findings Summary

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| F1 | 82 `src/` modules are too granular — 7 domains each split into 3–5 sub-modules | High | Structure |
| F2 | Three Mini App implementations with unclear canonical ownership | High | Duplication |
| F3 | PHP stack (`telegram-miniapp/`, `php-app/`, `installer/`) inconsistent with TS-primary project | Medium | Stack |
| F4 | Research modules mixed with production code in `src/` | High | Clarity |
| F5 | ZIP build artifacts committed to root | Medium | Hygiene |
| F6 | `deploy/github-actions/` duplicates `.github/workflows/` | Low | Duplication |
| F7 | Two website implementations (`website/`, `static-website/`) | Medium | Duplication |
| F8 | Docs directory is flat with 52 files — no subdirectory organization | Medium | Docs |
| F9 | No developer onboarding guide | Medium | Docs |
| F10 | `scripts/` and `deploy/scripts/` are separate script locations | Low | Structure |
| F11 | No `apps/`, `core/`, `connectors/`, `packages/` top-level organization | High | Structure |
| F12 | Root `package.json` with 582 lines and 66 exports for a monorepo | Medium | Config |

---

## 7. Recommendations

### Immediate (Pre-MVP)

1. **Add `.gitignore` entries** for `*.zip` and remove committed ZIP files.
2. **Document module classification** — distinguish production, extended, and research modules in `src/` (e.g., via a `MODULES.md` or subdirectory).
3. **Consolidate strategy modules** — merge `strategy`, `strategies`, `strategy-engine`, `strategy-marketplace` into a single `src/strategy-engine/` module.
4. **Consolidate agent modules** — merge `agents`, `agent-runtime`, `agent-orchestrator`, `agent-control` into `src/agents/`.
5. **Create developer onboarding guide** — `docs/developer-onboarding.md`.

### Short-Term (MVP)

6. **Move research modules to `src/research/`** subfolder with clear README.
7. **Clarify Mini App ownership** — decide on canonical frontend stack (TS or PHP) and document the decision.
8. **Add docs subdirectories** — `docs/architecture/`, `docs/guides/`, `docs/modules/`.
9. **Remove or archive `static-website/`** — or move to `apps/static-website/`.
10. **Create `packages/` directory** — for shared types, SDK, and utilities.

### Long-Term (Post-MVP)

11. **Full monorepo migration** — adopt the target structure from issue #241.
12. **Replace PHP installer** — with TypeScript CLI or Docker-based setup.
13. **Consolidate portfolio modules** — `portfolio`, `portfolio-analytics`, `multi-user-portfolio` into one.
14. **Deduplicate trading modules** — `trading`, `trading-engine`, `live-trading` into `core/trading`.
15. **Enforce test coverage threshold** — add `coverage.threshold` to Vitest config.

---

*This document was produced as part of the architectural audit mandated by Issue #241.*
*See also: [restructuring-plan.md](restructuring-plan.md), [refactoring-roadmap.md](refactoring-roadmap.md), [technical-debt.md](technical-debt.md), [module-dependencies.md](module-dependencies.md)*
