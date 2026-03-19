# TONAIAgent

> AI-native autonomous trading platform built on TON

[![Version](https://img.shields.io/badge/version-2.43.0-blue.svg)](https://github.com/xlabtg/TONAIAgent/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0.0-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-7500%2B-success.svg)](#testing)

TONAIAgent is an AI-native autonomous trading platform built on TON. The platform enables users to deploy intelligent trading agents, discover algorithmic strategies, and participate in a decentralized strategy marketplace — all accessible directly through Telegram.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Key Features](#key-features)
4. [Quick Start](#quick-start)
5. [Import Structure](#import-structure)
6. [Testing](#testing)
7. [Security & Risk](#security--risk)
8. [MVP Scope](#mvp-scope)
9. [Production Readiness](#production-readiness)
10. [Contributing](#contributing)
11. [License](#license)

---

## Project Overview

**TONAIAgent** is an AI trading platform and autonomous agent system built on the TON blockchain.

**Core idea:** Autonomous AI agents operate 24/7 on behalf of users — executing strategies, managing risk, tracking performance — while a decentralized strategy marketplace connects developers and traders. Everything is accessible natively through Telegram.

- **AI Agents** — configurable autonomous agents that run on any strategy
- **TON Integration** — on-chain identity, wallet connectivity, and settlement
- **Strategy Marketplace** — publish, discover, and monetize trading strategies
- **Telegram-native** — no separate app needed; fully embedded in Telegram Mini App

---

## Architecture

### Directory Structure

```
TONAIAgent/
├── core/                   Core TypeScript library (@tonaiagent/core)
│   ├── agents/             Agent runtime, orchestrator, control, lifecycle
│   ├── strategies/         Strategy engine, implementations, marketplace, backtesting
│   ├── trading/            Trade execution, engine, live trading
│   ├── portfolio/          Portfolio tracking and analytics
│   ├── market-data/        Price feeds (CoinGecko, Binance), data platform
│   ├── risk-engine/        Risk limits, trade validation, stop-loss
│   ├── ai/                 Multi-provider AI routing (Groq-first)
│   ├── security/           Key management, auth, audit logging
│   ├── protocol/           Open Agent Protocol
│   ├── runtime/            Core execution runtime
│   ├── multi-agent/        Agent coordination framework
│   ├── plugins/            Plugin and tooling system
│   ├── referrals/          Referral tracking and rewards
│   └── user/               User management
│
├── services/               Business logic layer
│   ├── api/                REST API gateway and agent control
│   ├── execution-engine/   Trade execution management
│   ├── scheduler/          Distributed cron and event triggers
│   ├── auth/               Telegram auth, RBAC, API key management
│   ├── analytics/          Trade history, performance, portfolio metrics
│   ├── monitoring/         Agent monitoring dashboard
│   ├── observability/      Metrics, logging, distributed tracing
│   ├── reputation/         Strategy scoring and ranking engine
│   ├── revenue/            On-chain revenue distribution
│   ├── rewards/            Rewards engine for referral system
│   ├── growth-api/         Growth, referral, and leaderboard REST API
│   └── ... (30+ service modules)
│
├── apps/                   User-facing interfaces
│   ├── telegram-miniapp/   Telegram Mini App (primary interface)
│   ├── mvp-platform/       MVP integration entry point
│   ├── web-dashboard/      Web-based dashboard
│   └── marketing-website/  Marketing and product website
│
├── connectors/             External integrations
│   ├── dex/                StonFi, DeDust adapters
│   ├── wallets/            TON Connect, MPC, smart contract wallets
│   ├── market-data/        CoinGecko, Binance providers
│   └── signals/            External signal integrations
│
├── extended/               Post-MVP modules (Phase 2+) — not in MVP runtime
│   ├── marketplace/        Public strategy marketplace
│   ├── growth/             Viral growth engine (referrals, gamification)
│   ├── hedgefund/          Autonomous hedge fund infrastructure
│   ├── tokenomics/         TONAI staking and governance
│   ├── dao-governance/     DAO treasury and on-chain governance
│   └── ... (16 extended modules)
│
├── packages/               Shared packages
│   ├── sdk/                Developer SDK and agent framework
│   ├── shared-types/       Common TypeScript types
│   └── utils/              Shared utilities
│
├── research/               Experimental research modules
│   └── agfi, agfn, gaamp, gaei, grif, sgia, aifos, acms
│
├── infrastructure/         Deployment and tooling scripts
├── docs/                   Architecture, guides, module documentation
├── tests/                  Test suite (mirrors top-level structure, 95+ modules)
└── examples/               Developer examples
```

### Layer Overview

```
┌─────────────────────────────────────────────────────────┐
│  APPS LAYER                                             │
│  apps/telegram-miniapp · apps/web-dashboard             │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  SERVICES LAYER (business logic)                        │
│  api · execution-engine · scheduler · auth              │
│  analytics · monitoring · observability                  │
│  reputation · revenue · rewards · growth-api            │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  CORE LAYER (domain logic)                              │
│  agents · strategies · trading · portfolio              │
│  market-data · risk-engine · ai · security              │
│  protocol · runtime · multi-agent · plugins             │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  CONNECTORS LAYER (external integrations)               │
│  dex · wallets · market-data · signals                  │
└─────────────────────────────────────────────────────────┘
```

For the full dependency map and module classification see [docs/module-dependencies.md](docs/module-dependencies.md).
For the architectural audit and restructuring plan see [docs/architecture-audit.md](docs/architecture-audit.md).
For deeper technical details see [docs/architecture.md](docs/architecture.md).

---

## Key Features

### 🤖 Autonomous AI Agents

Deploy intelligent trading agents that operate 24/7 without manual intervention. Each agent follows a deterministic 9-step execution pipeline:

```
fetch_market_data → load_agent_memory → call_ai_model → validate_risk
→ generate_trade_plan → simulate_transaction → execute_trade
→ record_results → update_analytics
```

Agents are configurable with strategy type, risk level, budget, and execution schedule.

### 📊 Real-Time Market Data Streaming

- **CoinGecko** — price feeds and market cap data
- **Binance** — real-time prices and order book data
- 30-second TTL cache with automatic provider fallback
- Planned DEX integrations: DeDust, STON.fi, TONCO
- Signal aggregator for external data sources

### ⚡ Smart Execution & Slippage Control

- Trade execution with slippage monitoring and control
- Multi-DEX routing (StonFi, DeDust adapters)
- Simulated and live execution modes
- Execution engine with retry and error handling

### 🛡 Risk & Capital Protection

The Risk Engine sits between the Strategy Engine and Trading Engine and provides:

- **Position Size Limits** — max 5% of portfolio per trade
- **Portfolio Exposure Limits** — max 20% per asset
- **Stop-Loss Protection** — automatic exit at configurable levels
- **Max Drawdown Protection** — agent pause at 15% drawdown
- **Trade Validator** — validates all trades before execution
- **Kill Switch** — emergency stop for all agent activity

### 👥 Multi-User + RBAC

- Telegram-native authentication (HMAC-SHA256 `initData` verification)
- API key management with scoped permissions
- Role-Based Access Control (RBAC)
- Multi-tenant isolation

### 🧠 Memory + Context Awareness

- Persistent agent memory (`core/agent/memory.ts`)
- Agent context service (`services/agent-context/`)
- Agent decision history and replay (`services/agent-decision/`)

### 🌐 External Signals Integration

- Signal aggregator (`services/signal-aggregator/`)
- Configurable external signal connectors (`connectors/signals/`)

### 💰 Strategy Marketplace

- Browse, deploy, and publish algorithmic strategies
- Performance-based reputation scoring
- Revenue sharing for strategy authors
- Strategy lifecycle: Create → Test → Publish → Rank → Monetize
- Filter by risk level, return, reputation, asset class, and strategy type

### 📈 Analytics & Performance Tracking

- Portfolio value, PnL, ROI, equity curve, trade history
- Win rate, max drawdown, volatility, Sharpe ratio
- Per-agent and portfolio-level metrics
- Trade history analytics with slippage and DEX data

### 🔗 TON Wallet Integration (On-Chain)

- TON Connect 2.0 compatible wallet module
- Supported wallets: Tonkeeper, OpenMask, MyTonWallet, TON Space
- Two-layer identity: Telegram user ID + on-chain wallet address
- On-chain revenue distribution for strategy authors

### 📡 Observability & Monitoring

- Real-time agent monitoring dashboard (`services/monitoring/`)
- Structured metrics and logging (`services/observability/`)
- Health endpoints and alerting (`services/alerts/`)
- Production metrics export (`services/observability/production.ts`)

### 🚀 Growth & Referral System

- Referral code generation and claim flow
- Multi-level reward distribution (`services/rewards/`)
- Referral leaderboard
- Growth metrics and analytics

---

## Quick Start

### Prerequisites

```bash
node >= 18.0.0
npm >= 8.0.0
```

### Install

```bash
git clone https://github.com/xlabtg/TONAIAgent.git
cd TONAIAgent
npm install
```

### Environment

```bash
cp .env.example .env
# Fill in your API keys and configuration
```

### Run

```typescript
import { createMVPPlatform } from '@tonaiagent/core/mvp-platform';

// Initialize the platform
const platform = createMVPPlatform({ environment: 'simulation' });
platform.start();

// Create an AI agent
const agent = await platform.createAgent({
  userId: 'telegram_user_123',
  name: 'My Trend Agent',
  strategy: 'trend',       // 'trend' | 'arbitrage' | 'ai-signal'
  budgetTon: 1000,
  riskLevel: 'medium',     // 'low' | 'medium' | 'high'
});

// Start the agent
await platform.startAgent(agent.agentId);

// Execute a strategy cycle
const cycle = await platform.executeAgentCycle(agent.agentId);
console.log('Signal:', cycle.signal, '— trade executed:', cycle.tradeExecuted);

// Monitor portfolio
const metrics = await platform.getPortfolioMetrics(agent.agentId);
console.log('Portfolio value:', metrics.portfolioValue, 'TON');
console.log('PnL:', metrics.pnl, 'TON (', metrics.roi.toFixed(2), '% ROI)');

// Stop the agent
await platform.stopAgent(agent.agentId);
platform.stop();
```

### Test

```bash
npm test          # run full test suite
npm run test:coverage  # with coverage report
```

### Telegram Mini App Deployment

```bash
cd apps/telegram-miniapp

# 1. Configure credentials
cp .env.example .env && nano .env

# 2. Deploy frontend
./scripts/deploy-miniapp.sh vercel       # → Vercel
./scripts/deploy-miniapp.sh cloudflare   # → Cloudflare Pages
./scripts/deploy-miniapp.sh docker       # → Docker + Nginx

# 3. Set up Telegram bot
./scripts/setup-bot.sh
```

See [docs/deployment.md](docs/deployment.md) for full cloud deployment instructions.

---

## Import Structure

All public modules are exported from `@tonaiagent/core` with sub-path imports for specific modules:

```typescript
// Platform entry point
import { createMVPPlatform } from '@tonaiagent/core/mvp-platform';

// Core domain modules
import { createStrategyEngine } from '@tonaiagent/core/strategy-engine';
import { createMarketplace } from '@tonaiagent/core/strategy-marketplace';
import { createRiskEngine } from '@tonaiagent/core/risk-engine';

// Extended modules (post-MVP, must be explicitly imported)
import { createGrowthEngine } from '@tonaiagent/core/growth';
import { createHedgeFund } from '@tonaiagent/core/hedgefund';
import { createTokenomics } from '@tonaiagent/core/tokenomics';
```

**Dependency rules:**

- MVP modules **MUST NOT** import from `extended/` or `research/`
- Extended modules **MAY** import from MVP core modules
- Validate with: `npm run validate:mvp`
- Set `ENABLE_EXTENDED=true` in `.env` to load extended modules at runtime (default: `false`)

---

## Testing

The platform includes **7500+ tests** across all modules with a **zero regression philosophy**.

```bash
npm test                # run all tests (vitest)
npm run test:watch      # watch mode
npm run test:coverage   # with coverage report
```

Test suite mirrors the top-level directory structure across 95+ test modules covering:

- Unit tests for all core domain modules
- Integration tests for service interactions
- Agent runtime and execution pipeline tests
- Strategy engine tests (trend, arbitrage, AI signal)
- Risk engine validation tests
- API endpoint tests
- Growth and analytics tests

All PRs must keep the test suite passing with no regressions.

---

## Security & Risk

### Risk Engine

The Risk Engine (`core/risk-engine/`) is a production-grade safeguard between strategy signals and actual trade execution:

| Component | Description |
|-----------|-------------|
| **Trade Validator** | Validates every trade before execution |
| **Stop-Loss Manager** | Automatic stop-loss at configurable thresholds |
| **Portfolio Protection** | Coordinated portfolio-level protection |
| **Exposure Monitor** | Continuous real-time exposure tracking |
| **Risk Scorer** | Dynamic risk scores per agent and strategy |
| **Risk Dashboard** | Transparent metrics for observability |

### Kill Switch

Emergency controls are built into the agent lifecycle. Agents can be stopped immediately via:

```typescript
await platform.stopAgent(agentId);          // stop individual agent
await platform.handleControlRequest('POST', '/api/agents/stop-all'); // stop all
```

### Authentication Safeguards

- Telegram `initData` verified via HMAC-SHA256 on every request
- API keys scoped by permission (e.g. `agent:execute`, `agent:read`)
- RBAC enforced at service layer
- Audit logging for all access decisions (`core/security/`)
- No private keys ever stored — only public wallet addresses

See [docs/security.md](docs/security.md) for the full security model.

---

## MVP Scope

The platform is organized into two clear layers following Issue #247.

### ✅ MVP Modules (Production-Critical)

These modules form the end-to-end trading flow and are production-ready:

| Layer | Modules |
|-------|---------|
| **Apps** | `apps/telegram-miniapp`, `apps/mvp-platform` |
| **Core** | `core/agents`, `core/strategies`, `core/trading`, `core/portfolio`, `core/market-data`, `core/risk-engine`, `core/ai`, `core/security`, `core/protocol`, `core/runtime`, `core/multi-agent`, `core/plugins` |
| **Services** | `services/api`, `services/execution-engine`, `services/scheduler`, `services/auth`, `services/analytics`, `services/monitoring`, `services/reputation`, `services/revenue` |
| **Connectors** | `connectors/dex`, `connectors/wallets`, `connectors/market-data` |
| **Packages** | `packages/sdk`, `packages/shared-types`, `packages/utils` |

MVP modules are tagged with `@mvp` in their JSDoc headers.

### ❌ Extended Modules (Post-MVP)

These modules are deferred to Phase 2+. They live under `extended/` and **must not** be imported by MVP modules:

```
extended/
  marketplace        — Public strategy marketplace
  growth             — Referral, social trading, gamification
  hedgefund          — Autonomous hedge fund infrastructure
  tokenomics         — TONAI staking and governance
  dao-governance     — DAO treasury and on-chain governance
  institutional      — Institutional compliance (KYC/AML)
  rwa                — Real-world asset integration
  fund-manager       — AI-driven investment fund management
  launchpad          — Agent launchpad for DAOs and funds
  no-code            — Visual strategy builder
  superapp           — TON Super App (wallet, social, finance)
  monetary-policy    — AI-driven emission and treasury control
  mobile-ux          — Telegram-native mobile-first UX
  personal-finance   — AI-native personal finance
  production-miniapp — Production Mini App configuration
  mvp                — Extended MVP features
```

See [docs/mvp-modules.md](docs/mvp-modules.md) for the full module classification.

---

## Production Readiness

### Monitoring

Real-time agent and platform monitoring is available via the monitoring dashboard:

```
GET  /api/monitoring/dashboard      — overview of all agents and metrics
GET  /api/monitoring/agents/:id     — per-agent status and portfolio
GET  /api/monitoring/metrics        — platform-wide performance metrics
```

### Metrics & Observability

- Structured logging with configurable log levels (`services/observability/logger.ts`)
- Metrics collection and export (`services/observability/metrics.ts`)
- Production metrics endpoint (`services/observability/production.ts`)
- Alert rules and notification routing (`services/alerts/`)

### Health Endpoints

```
GET  /api/agents           — list all agents with status
GET  /api/agents/:id       — agent details and current metrics
POST /api/agents/:id/start — start agent
POST /api/agents/:id/stop  — stop agent
```

### Deployment

See [docs/deployment.md](docs/deployment.md) for production hosting instructions including Docker, Vercel, AWS, Kubernetes, and standard PHP hosting.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/development-guidelines.md](docs/development-guidelines.md) before opening a pull request.

### Quick Setup

```bash
git clone https://github.com/xlabtg/TONAIAgent.git
cd TONAIAgent
npm install
npm test
```

### Before Submitting a PR

```bash
npm run lint           # ESLint
npm run typecheck      # TypeScript type check
npm test               # full test suite
npm run validate:mvp   # verify MVP dependency rules
```

### Developer Resources

| Document | Description |
|----------|-------------|
| [Architecture Overview](docs/architecture.md) | System architecture and design decisions |
| [MVP Architecture](docs/mvp-architecture.md) | MVP module boundaries and dependency rules |
| [MVP Modules](docs/mvp-modules.md) | Full module classification (MVP vs Extended vs Research) |
| [Developer Guide](docs/developer.md) | SDK overview, API reference, examples |
| [Development Guidelines](docs/development-guidelines.md) | Code style, testing, contribution standards |
| [Strategy Development](docs/strategy-development.md) | How to build custom strategies |
| [Plugin Development](docs/plugin-development.md) | Extending the platform with plugins |
| [Security](docs/security.md) | Security model and safeguards |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
