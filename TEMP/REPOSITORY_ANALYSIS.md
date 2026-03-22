# TONAIAgent — Repository Analysis

> Generated for Issue #283 · Version 2.43.0

---

## Executive Summary

**TONAIAgent** is an AI-native autonomous trading platform built on the TON blockchain. It enables users to deploy intelligent trading agents, discover algorithmic strategies, and participate in a decentralized strategy marketplace—all accessible directly through Telegram. The platform combines multi-provider AI (Groq-first with automatic fallback), autonomous agent execution, strategy management, portfolio analytics, risk controls, and a modular plugin ecosystem into a production-ready system designed for mass adoption.

**Platform Vision**: "Launch your own AI crypto agent in Telegram in under 3 minutes."

**Key Statistics:**
- **Version:** 2.43.0
- **Language:** TypeScript (100%), Node.js >= 18.0.0
- **Test Coverage:** 7500+ tests across 95+ modules
- **Architecture Layers:** 4 (Apps → Services → Core → Connectors)
- **Module Count:** 150+ across MVP, Extended, and Research tiers

---

## 1. Directory Structure

```
TONAIAgent/
├── apps/                          # User-facing applications (4)
│   ├── telegram-miniapp/          # Primary Telegram Mini App UI (MVP)
│   ├── mvp-platform/              # MVP integration entry point
│   ├── web-dashboard/             # Agent & portfolio dashboard (Extended)
│   └── marketing-website/         # Public product site (Extended)
│
├── core/                          # Domain logic (17 modules)
│   ├── agent/                     # Legacy agent wrapper
│   ├── agents/                    # Agent runtime, orchestrator, lifecycle
│   ├── ai/                        # Multi-provider AI layer
│   ├── ai-safety/                 # AI safety & alignment framework
│   ├── market-data/               # Price feeds, caching, providers
│   ├── multi-agent/               # Agent coordination & communication
│   ├── plugins/                   # Plugin system, TON-native tools
│   ├── portfolio/                 # Portfolio types, analytics, multi-user
│   ├── protocol/                  # Cross-chain, identity, governance
│   ├── protocol-constitution/     # Foundational governance charter
│   ├── referrals/                 # Referral tracking and rewards
│   ├── risk-engine/               # Risk validation, stop-loss, monitoring
│   ├── runtime/                   # Core execution runtime, event bus
│   ├── security/                  # Key management, MPC, authorization
│   ├── strategies/                # Strategy engine, marketplace, backtesting
│   ├── trading/                   # Trade execution, DEX routing
│   └── user/                      # User management
│
├── services/                      # Business logic services (37)
│   ├── api/                       # REST API gateway
│   ├── analytics/                 # Trade history, performance
│   ├── auth/                      # Telegram auth, RBAC, API keys
│   ├── execution-engine/          # Trade execution management
│   ├── monitoring/                # Agent health dashboard
│   ├── observability/             # Metrics, logging, tracing
│   ├── reputation/                # Strategy scoring & ranking
│   ├── revenue/                   # On-chain revenue distribution
│   ├── rewards/                   # Referral rewards engine
│   ├── scheduler/                 # Distributed cron, event triggers
│   └── ... (27 more services)
│
├── connectors/                    # External integrations (9)
│   ├── dex/                       # StonFi, DeDust, ChangeNOW adapters
│   ├── market-data/               # CoinGecko, Binance providers
│   ├── signals/                   # External signal sources
│   ├── wallets/                   # TON Connect 2.0, MPC wallets
│   ├── cross-chain-liquidity/     # Cross-chain bridge connectors
│   ├── liquidity-network/         # Liquidity aggregation
│   ├── liquidity-router/          # Smart order routing
│   └── ton-factory/               # TON-native tools factory
│
├── extended/                      # Phase 2+ post-MVP features (16 modules)
│   ├── dao-governance/
│   ├── fund-manager/
│   ├── growth/
│   ├── hedgefund/
│   ├── institutional/
│   ├── launchpad/
│   ├── marketplace/
│   ├── mobile-ux/
│   ├── monetary-policy/
│   ├── mvp/
│   ├── no-code/
│   ├── personal-finance/
│   ├── production-miniapp/
│   ├── rwa/
│   ├── superapp/
│   └── tokenomics/
│
├── research/                      # Experimental, non-production (8)
│   ├── acms/                      # Autonomous Capital Markets Stack
│   ├── agfi/                      # AI-native Global Financial Infrastructure
│   ├── agfn/                      # Agent Financial Network
│   ├── aifos/                     # AI Financial Operating System
│   ├── gaamp/                     # Global AI Agent Marketplace Platform
│   ├── gaei/                      # Global AI Economic Infrastructure
│   ├── grif/                      # Global Regulatory Infrastructure
│   └── sgia/                      # Systemic Growth & Integration Architecture
│
├── packages/                      # Shared utilities (3)
│   ├── sdk/                       # Developer SDK & agent framework
│   ├── shared-types/              # Common TypeScript type definitions
│   └── utils/                     # Shared utility functions
│
├── tests/                         # Test suite (95+ modules, 7500+ tests)
│   └── (mirrors source structure)
│
├── docs/                          # Documentation (60+ markdown files)
├── examples/                      # Developer examples (12 files)
├── experiments/                   # Experimental scripts
├── infrastructure/                # Deployment scripts and tooling
├── package.json                   # Root package manifest (v2.43.0)
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.strict.json           # Strict type-checking config
├── CONTRIBUTING.md
└── README.md
```

---

## 2. Architecture

### Four-Layer Design

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 1: APPS  (User-facing interfaces)                  │
│  Telegram Mini App · Web Dashboard · Marketing Site       │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  LAYER 2: SERVICES  (Business logic, 37 services)         │
│  API · Auth · Scheduler · Analytics · Execution Engine    │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  LAYER 3: CORE  (Domain logic, 17 modules)                │
│  Agents · Strategies · Trading · Portfolio · Risk         │
│  Market Data · AI · Security · Protocol · Multi-Agent     │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  LAYER 4: CONNECTORS  (External integrations)             │
│  DEX (StonFi, DeDust) · CoinGecko · Binance · TON Connect │
└──────────────────────────────────────────────────────────┘
```

### Module Tiers

| Tier | Location | Description | Usage |
|------|----------|-------------|-------|
| **MVP** | `core/`, `services/` | Production-ready | Default |
| **Extended** | `extended/` | Phase 2+ features | `ENABLE_EXTENDED=true` |
| **Research** | `research/` | Experimental | Not for production |

**Strict Dependency Rule:** MVP modules cannot import from `extended/` or `research/`. Validated via `npm run validate:mvp`.

---

## 3. Core Components

### 3.1 Agent Runtime

The heart of the platform. Every agent follows a deterministic **9-step execution pipeline**:

| Step | Name | Description |
|------|------|-------------|
| 1 | `fetch_market_data` | Retrieve latest prices from CoinGecko/Binance |
| 2 | `load_agent_memory` | Restore agent state, history, and context |
| 3 | `call_ai_model` | Invoke AI provider for signal generation |
| 4 | `validate_risk` | Enforce position size, drawdown, exposure limits |
| 5 | `generate_trade_plan` | Produce buy/sell/hold decision |
| 6 | `simulate_transaction` | Dry-run execution against simulator |
| 7 | `execute_trade` | Submit trade to DEX (simulation or live) |
| 8 | `record_results` | Persist outcome to database |
| 9 | `update_analytics` | Recalculate PnL, ROI, portfolio metrics |

**Agent Lifecycle States:**
```
CREATED → ACTIVE → RUNNING ↔ PAUSED → STOPPED
                      ↓
                    ERROR
```

### 3.2 Strategy Engine

Three built-in production strategies:

| Strategy | Logic | Signals |
|----------|-------|---------|
| **Trend Following** | SMA-based buy on uptrend, sell on reversal | Price moving averages |
| **Arbitrage** | Multi-exchange spread detection | Price differentials |
| **AI Signal Strategy** | RSI/MACD with AI overlay | Buy RSI < 30, Sell RSI > 70 |

Strategies are defined in a JSON DSL, making them configurable and portable. The `StrategyRegistry` handles auto-registration and discovery. The `backtesting/` module enables historical simulation before live deployment.

### 3.3 AI Layer

Multi-provider system with automatic failover:

| Priority | Provider | Role |
|----------|----------|------|
| 1 | **Groq** | Primary (ultra-low latency) |
| 2 | **Anthropic** | Fallback |
| 3 | **OpenAI** | Fallback |
| 4 | **Google** | Fallback |
| 5 | **xAI** | Fallback |
| 6 | **OpenRouter** | Fallback |

Features: circuit breaker pattern, user model selection, safety guardrails (prompt injection detection, content filtering), short/long-term/semantic memory.

### 3.4 Risk Engine

**Default Risk Limits (configurable per agent):**
- Position size: max 5% of portfolio per trade
- Portfolio exposure: max 20% per asset
- Max drawdown: auto-pause agent at 15%
- Stop-loss: automatic position exit at threshold

**Emergency Controls:**
- Kill switch: stop all agents immediately
- Pause/resume: temporary suspension with state preservation
- Recovery procedures: multi-factor recovery

### 3.5 Security Architecture

- **Zero-Trust:** AI never has direct access to private keys
- **Custody Models:** Non-custodial, Smart Contract (multisig), MPC (threshold signatures)
- **Key Derivation:** BIP-32/44 standards; no plaintext key storage
- **Transaction Authorization:** 8-step validation pipeline (intent → amount → risk → policy → rate limit → anomaly → MPC → approval)
- **Authentication:** Telegram HMAC-SHA256 `initData` verification; scoped API keys

### 3.6 Market Data Layer

| Provider | Data |
|----------|------|
| **CoinGecko** | Market cap, price history |
| **Binance** | Real-time prices, order books |
| **DEX feeds (planned)** | DeDust, STON.fi, TONCO |

In-memory cache with 30-second TTL. Automatic provider fallback. Unified `MarketDataSnapshot` output consumed by the Strategy Engine.

### 3.7 Portfolio Analytics

**Computed Metrics:** Total value, PnL, ROI, Win rate, Sharpe ratio, Max drawdown, Volatility, Equity curve, Trade history, Strategy contribution.

---

## 4. Technology Stack

| Category | Technology |
|----------|-----------|
| **Language** | TypeScript 5.0+ |
| **Runtime** | Node.js 18.0+ |
| **Module System** | ES2022 / NodeNext (ESM + CommonJS dual) |
| **Blockchain** | TON (primary), Ethereum/BNB/Solana via ChangeNOW |
| **Wallet Standard** | TON Connect 2.0 |
| **DEX** | StonFi, DeDust, ChangeNOW (200+ chains, 1200+ assets) |
| **Database (prod)** | PostgreSQL / MySQL 8.0+ |
| **Cache (prod)** | Redis (optional) |
| **Message Queue** | Kafka (optional) |
| **Testing** | Vitest |
| **Linting** | ESLint |
| **Error Tracking** | Sentry (optional) |

---

## 5. Services Overview (37 services)

### Core MVP Services

| Service | Responsibility |
|---------|---------------|
| `api` | REST API gateway, endpoint routing |
| `auth` | Telegram auth, RBAC, API key management |
| `execution-engine` | Trade execution coordination |
| `scheduler` | Distributed cron, event-based triggers |
| `analytics` | Trade history, performance metrics |
| `monitoring` | Agent health and status dashboard |
| `observability` | Metrics, structured logging, distributed tracing |
| `reputation` | Strategy scoring and ranking |
| `revenue` | On-chain revenue distribution |
| `rewards` | Referral rewards engine |
| `growth-api` | Growth, referral, leaderboard API |

### Advanced Services (26 more)

`agent-context`, `agent-decision`, `ai-credit`, `alerts`, `autonomous-discovery`, `clearing-house`, `distributed-scheduler`, `ecosystem-fund`, `global-infrastructure`, `institutional-network`, `investment`, `market-data-stream`, `multi-tenant`, `omnichain`, `payments`, `portfolio-allocator`, `prime-brokerage`, `regulatory`, `risk-control`, `sdacl`, `signal-aggregator`, `strategy-marketplace`, `strategy-optimizer`, `systemic-risk`, `token-strategy`, `token-utility-economy`

---

## 6. Key Workflows

### User Creates an Agent

```
User opens Telegram → /start → Mini App launches
  → Select strategy (Trend / Arbitrage / AI Signal)
  → Set budget (TON amount) + risk level
  → Agent Orchestrator provisions:
      - Agent record (DB)
      - Initial portfolio (simulated)
      - Risk limits profile
      - Wallet address
  → Agent state: CREATED
  → Scheduler registers execution cycle
```

### Agent Executes a Cycle

```
Scheduler trigger
  → fetch_market_data (CoinGecko/Binance)
  → load_agent_memory (DB restore)
  → call_ai_model (Groq → fallback chain)
  → validate_risk (position, exposure, drawdown)
  → generate_trade_plan (buy/sell/hold)
  → simulate_transaction (dry-run)
  → execute_trade (DEX, simulation mode by default)
  → record_results (DB persist)
  → update_analytics (PnL, ROI recalculation)
```

### User Views Portfolio

```
Mini App Dashboard opens
  → services/analytics calculates:
      - Total portfolio value
      - PnL and ROI percentage
      - Active agent count, win rate
  → Renders: equity curve, strategy contribution,
             trade history, agent performance cards
```

---

## 7. Deployment Options

| Platform | Setup Time | Best For |
|----------|-----------|---------|
| **PHP Hosting (Installer)** | < 5 min | MVP, personal/small deployments |
| **Vercel** | < 2 min | Frontend/Mini App |
| **Docker** | < 5 min | Self-hosted |
| **AWS** | 5–10 min | Full production backend |
| **Kubernetes** | 10–15 min | Enterprise, multi-region |

**Minimum Requirements:** Node.js 18+, npm 8+

**Production Requirements:** HTTPS (required for Telegram Mini App), MySQL 8.0+/PostgreSQL, optional Redis + Kafka

The `infrastructure/` directory contains deployment configurations for all platforms. The PHP installer in `apps/telegram-miniapp/` provides a one-click web-based setup for shared hosting.

---

## 8. Testing and Quality

| Metric | Value |
|--------|-------|
| Total tests | 7500+ |
| Test modules | 95+ |
| Architecture | Mirrors source directory structure |
| Philosophy | Zero-regression |

**Key Commands:**
```bash
npm test               # Full test suite
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run lint           # ESLint
npm run typecheck      # TypeScript type check
npm run validate:mvp   # Verify MVP boundary (no extended imports in core)
```

---

## 9. Known Technical Debt

From `docs/technical-debt.md` (as of v2.40.0):

### Critical
- **TD-S1** 🔴 — PHP installer stores credentials in flat files without documented rotation procedures

### High Priority
- **TD-A1** 🟠 — Binary ZIP artifacts committed to git (inflate clone size)
- **TD-A2** 🟠 — 82 `src/` modules at flat depth (pre-restructuring state; now organized under `core/`, `extended/`, `research/`)
- **TD-A3** 🟠 — Duplicate Mini App implementations (vanilla JS, PHP, TypeScript)
- **TD-A5** 🟠 — Research modules mixed with production code (partially resolved in current structure)
- **TD-C5** 🟠 — PHP installer is non-standard for a TypeScript project
- **TD-T1** 🟠 — No enforced test coverage threshold in CI
- **TD-D1** 🟠 — No single developer onboarding guide

### Medium Priority
- **TD-C2** 🟡 — TypeScript strict mode not enforced by default in `tsconfig.json`
- **TD-T3** 🟡 — No end-to-end (E2E) tests for Mini App UI or agent flows
- **TD-S2** 🟡 — No `SECURITY.md` vulnerability disclosure policy

---

## 10. MVP Completion Status

From `docs/mvp-checklist.md`. MVP is complete when all boxes are checked:

### Incomplete MVP Features (still pending)

**Telegram Bot Interface:**
- [ ] `/start`, `/agents`, `/create_agent`, `/analytics` commands
- [ ] Telegram notifications for trade events and agent state changes
- [ ] Bot webhook configured and operational

**Telegram Mini App:**
- [ ] Dashboard, Create Agent, Strategy Marketplace, Agent Analytics screens
- [ ] Telegram Mini App authentication (WebApp init data verification)

**Backend API:**
- [ ] Core CRUD endpoints for agents (`POST /agents/create`, `GET /agents`, etc.)
- [ ] Input validation and prepared statements on all endpoints

**Agent Manager:**
- [ ] Full lifecycle state machine persisted to database
- [ ] Periodic strategy execution scheduling

**Trading Simulator:**
- [ ] Simulated trades with realistic slippage and fees
- [ ] Trade history recorded to database

**Portfolio Analytics:**
- [ ] PnL, ROI, Win Rate, Portfolio Value, Trade History

**Installer:**
- [ ] One-click installer with database setup and Telegram webhook registration

### MVP Acceptance Criteria
1. Deploy via installer on PHP + MySQL hosting
2. User opens Telegram bot and launches Mini App
3. User creates an AI agent through Mini App
4. Agent executes a strategy in simulation mode
5. Simulated trades recorded in Portfolio Analytics
6. Bot sends at least one notification during agent lifecycle
7. Simulation mode prevents any real on-chain transactions

---

## 11. Logical Development Steps

Based on thorough analysis of the codebase, documentation, and identified gaps, here are the recommended next development steps in priority order:

---

### Phase 1: MVP Completion (Immediate)

These steps complete the core user-facing MVP described in `docs/mvp-checklist.md`.

#### 1.1 Implement Telegram Bot Commands
**Location:** `apps/telegram-miniapp/` (PHP backend)
**Effort:** 1–2 days

Implement the four core bot commands:
- `/start` — launch Mini App onboarding flow
- `/agents` — list user's active agents with status
- `/create_agent` — guided agent creation wizard
- `/analytics` — portfolio summary in chat

Also implement outbound notifications:
- Trade executed notification
- Agent state change notification (RUNNING → PAUSED, etc.)
- Performance alert (daily PnL, drawdown warnings)

#### 1.2 Build Telegram Mini App Frontend Screens
**Location:** `apps/telegram-miniapp/frontend/`
**Effort:** 1–2 weeks

Implement the four core screens (mobile-first, Telegram-native design):
1. **Dashboard** — portfolio value, active agent count, PnL summary
2. **Create Agent** — strategy selector, budget input, risk level, launch button
3. **Strategy Marketplace** — browse built-in strategies (Trend, Arbitrage, AI Signal)
4. **Agent Analytics** — performance charts, trade history, equity curve

Connect each screen to the PHP backend API endpoints.

#### 1.3 Implement Backend API Endpoints
**Location:** `apps/telegram-miniapp/backend/`
**Effort:** 3–5 days

Complete all CRUD endpoints:
```
POST /agents/create          → create agent (strategy, capital, risk level)
POST /agents/{id}/start      → start agent execution
POST /agents/{id}/stop       → stop agent execution
POST /agents/{id}/pause      → pause agent
GET  /agents                 → list user's agents
GET  /agents/{id}/stats      → agent performance stats
GET  /portfolio              → portfolio summary
POST /api/webhook/telegram   → Telegram bot webhook handler
```

All endpoints must use prepared statements and validate Telegram `initData` HMAC-SHA256.

#### 1.4 Implement Persistent Agent Scheduler
**Location:** `services/scheduler/`
**Effort:** 2–3 days

Wire up the distributed scheduler to execute agent cycles at configured intervals (default: every 5 minutes per agent). Scheduler must:
- Persist scheduled jobs to database (survive restart)
- Execute agent 9-step pipeline for each active agent on schedule
- Handle errors gracefully (log, record in DB, do not crash other agents)

#### 1.5 Complete Trading Simulator
**Location:** `core/trading/`
**Effort:** 2–3 days

Ensure simulation mode is fully functional:
- Realistic slippage calculation (0.1–0.3% default)
- Fee simulation (0.2% DEX fee)
- Fake balance management per agent
- Confirm no real on-chain transactions can be triggered in simulation mode

#### 1.6 Complete PHP Installer
**Location:** `infrastructure/` or `apps/telegram-miniapp/`
**Effort:** 1–2 days

The installer must complete all MVP setup in one flow:
1. Database connection test + schema creation
2. Telegram bot token entry + webhook registration
3. Admin account creation
4. Environment file generation
5. Self-delete or warning after completion

Document the `.env` file security requirement in installer UI.

---

### Phase 2: Quality and Reliability (Short-Term, 2–4 Weeks)

#### 2.1 Add Test Coverage Threshold (TD-T1)
**Location:** `vitest.config.ts`
**Effort:** 2 hours

```typescript
coverage: {
  thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 }
}
```

Enforce in CI via `.github/workflows/`.

#### 2.2 Add Security Policy File (TD-S2)
**Location:** `SECURITY.md` (repository root)
**Effort:** 1 hour

Create `SECURITY.md` with:
- Supported versions
- Vulnerability disclosure process
- Contact information
- Secret rotation procedures (addresses TD-S1)

#### 2.3 Create Developer Onboarding Guide (TD-D1)
**Location:** `docs/developer-onboarding.md`
**Effort:** 3 hours

Single document covering:
- Prerequisites and local setup
- Repository structure orientation
- Running tests
- Making first contribution (example issue walkthrough)
- Module classification guide (MVP vs Extended vs Research)

#### 2.4 Add E2E Tests (TD-T3)
**Location:** `tests/e2e/`
**Effort:** 2–3 weeks

Use Playwright for Mini App UI tests and integration tests for agent execution flows:
- Agent creation flow
- Strategy selection and configuration
- Agent execution cycle (mock external APIs)
- Portfolio analytics render

#### 2.5 Enable TypeScript Strict Mode (TD-C2)
**Location:** `tsconfig.json`
**Effort:** 1–2 weeks

Enable `"strict": true` in the main `tsconfig.json` and resolve all resulting type errors. This prevents silent `any` type usage in production code.

---

### Phase 3: Architecture Improvements (Medium-Term, 1–2 Months)

These follow the ordered plan in `docs/refactoring-roadmap.md`:

#### 3.1 Remove Binary Artifacts from Git (H1-1 / TD-A1)
**Effort:** 30 minutes

```bash
git rm --cached *.zip
# Update .gitignore to include *.zip, dist/, build/
```

Generate ZIPs in CI and publish as GitHub release artifacts.

#### 3.2 Resolve Duplicate Mini App Implementations (TD-A3)
**Effort:** 2 hours (documentation) + months (full migration)

Immediate: document which files are canonical for production (likely `apps/telegram-miniapp/frontend/` + `apps/telegram-miniapp/backend/`).

Long-term: migrate PHP backend to TypeScript (NestJS or Hono + Drizzle ORM) per `docs/refactoring-roadmap.md H3-3`.

#### 3.3 Consolidate Module Duplication (H2-2 through H2-5)
**Effort:** 4–8 hours per domain

Consolidate fragmented domain modules per the roadmap:
- `portfolio/` + `portfolio-analytics/` + `multi-user-portfolio/` → single `core/portfolio/`
- `trading/` + `trading-engine/` + `live-trading/` → single `core/trading/`
- `strategy/` + `strategies/` + `strategy-engine/` → single `core/strategies/`
- All agent modules → single `core/agents/`

#### 3.4 Organize Documentation (H1-4 / TD-D2)
**Effort:** 3 hours

Restructure `docs/` into subdirectories:
```
docs/
├── architecture/    # System design docs
├── guides/          # Developer how-tos
├── modules/         # Module-level documentation
├── roadmap/         # Planning documents
└── README.md        # Navigation index
```

#### 3.5 Add `connectors/` as Independently Versioned Packages (H3-2)
**Effort:** 1 week

Extract each DEX and data provider into independent connector packages:
```
connectors/dex/stonfi/
connectors/dex/dedust/
connectors/market-data/coingecko/
connectors/market-data/binance/
```

This enables independent versioning and testing of each connector.

---

### Phase 4: Extended Features (Post-MVP)

To be enabled via `ENABLE_EXTENDED=true` feature flag. Follow dependency rules strictly (no extended imports from core).

#### 4.1 Strategy Marketplace
**Location:** `extended/marketplace/`

Public marketplace for user-submitted strategies. Features: strategy publishing, versioning, discovery, reputation scoring, community ratings.

#### 4.2 Growth and Referral Engine
**Location:** `extended/growth/`

Viral growth mechanics:
- Referral tracking with unique invite links
- Reward distribution to referrers
- Leaderboards and gamification
- Social proof notifications ("X agents created today")

#### 4.3 Copy Trading
**Not yet implemented**

Allow users to copy an existing agent's strategy and allocate capital proportionally. Requires: strategy versioning, performance attribution, proportional execution logic.

#### 4.4 No-Code Strategy Builder
**Location:** `extended/no-code/`

Visual drag-and-drop strategy builder that generates the JSON DSL. Lowers barrier to entry for non-technical users.

#### 4.5 Advanced Tokenomics (TONAI Token)
**Location:** `extended/tokenomics/`

TONAI token utility: staking for premium features, governance voting, fee discounts, liquidity mining rewards.

#### 4.6 Hedge Fund Infrastructure
**Location:** `extended/hedgefund/`

Autonomous hedge fund: pooled capital, multi-strategy allocation, performance fees, investor dashboards, regulatory reporting.

---

### Phase 5: Infrastructure and Scale (Long-Term)

#### 5.1 Replace PHP Installer with TypeScript CLI (H3-1 / TD-C5)
**Package:** `packages/cli/` → published as `@tonaiagent/create`
**Effort:** 2–3 weeks

```bash
npx @tonaiagent/create
```

Interactive setup using `inquirer` or `clack`. Eliminates PHP runtime dependency.

#### 5.2 Full Monorepo Tooling (H3-4)
**Effort:** 1 week

Adopt Turborepo or Nx for:
- Task orchestration with dependency graph
- Build and test caching (local + remote)
- Affected module detection for PRs

#### 5.3 Live Trading Integration
**Location:** `core/trading/live/`
**Effort:** 2–4 weeks

Enable real on-chain trade execution (currently all simulated):
- Finalize StonFi and DeDust connector implementations
- Implement wallet signing flow (TON Connect 2.0 approval)
- Add live/simulation mode toggle per agent
- Comprehensive safety checks before any live mode activation

#### 5.4 Multi-Chain Support
**Location:** `services/omnichain/`, `connectors/cross-chain-liquidity/`

Extend beyond TON to Ethereum, BNB Chain, Solana via ChangeNOW bridge. Already partially architected in `extended/`.

#### 5.5 Institutional Compliance Layer
**Location:** `extended/institutional/`

KYC/AML integration for institutional users. Regulatory reporting. Compliance data export.

---

## 12. Development Principles

Derived from `CONTRIBUTING.md` and `docs/development-guidelines.md`:

1. **MVP First** — Every change must map to a core MVP component unless explicitly targeting Extended
2. **Simple & Stable** — Prefer clarity over cleverness; avoid premature abstractions
3. **Deployable** — Must work on PHP + MySQL shared hosting (lowest common denominator)
4. **Telegram-Native** — Mobile-first, Telegram Mini App UX as primary interface
5. **Extensible** — Plugin and marketplace mindset; use adapter patterns for connectors
6. **Agent-First Design** — All features flow through the deterministic 9-step pipeline
7. **Zero-Trust Security** — AI never touches keys; all transactions require explicit validation

---

## 13. Environment Configuration

Key environment variables from `.env.example`:

```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
ENABLE_EXTENDED=false

# Telegram (required)
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_MINI_APP_URL=<HTTPS URL>

# AI Providers (Groq required; others optional fallbacks)
GROQ_API_KEY=<required>
ANTHROPIC_API_KEY=<optional>
OPENAI_API_KEY=<optional>

# Blockchain
TON_NETWORK=testnet
TON_RPC_ENDPOINT=<optional>

# Security
KEY_ENCRYPTION_KEY=<32+ chars>
JWT_SECRET=<32+ chars>
MPC_THRESHOLD=2
MPC_TOTAL_PARTIES=3

# Database (production)
DATABASE_URL=<MySQL or PostgreSQL>
REDIS_URL=<optional>
```

---

## 14. Related Documentation

All referenced documents exist in `docs/`:

| Document | Content |
|----------|---------|
| `docs/mvp-checklist.md` | MVP feature checklist and acceptance criteria |
| `docs/mvp-architecture.md` | MVP layer boundaries and design |
| `docs/mvp-modules.md` | Official module classification |
| `docs/technical-debt.md` | Full technical debt registry |
| `docs/refactoring-roadmap.md` | Ordered refactoring plan (Horizons 1–3) |
| `docs/architecture.md` | Full system architecture (4457 lines) |
| `docs/agent-runtime.md` | 9-step agent execution pipeline |
| `docs/ai-layer.md` | Multi-provider AI system |
| `docs/security.md` | Key management and security model |
| `docs/strategy.md` | Strategy system overview |
| `docs/strategy-development.md` | Writing custom strategies |
| `docs/deployment.md` | Deployment guides |
| `docs/developer-setup.md` | Local development setup |
| `docs/developer-onboarding.md` | New contributor onboarding |
| `docs/plugin-development.md` | Extending with plugins |
| `docs/tokenomics.md` | TONAI token economics |
| `docs/hedgefund.md` | Hedge fund infrastructure |
| `docs/growth.md` | Viral growth mechanics |

---

*Analysis generated from repository state at version 2.43.0. See individual documents in `docs/` for detailed specifications on each topic.*
