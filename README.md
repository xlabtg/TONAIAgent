# TON AI Agent Platform

> **AI-Native Autonomous Finance Infrastructure for The Open Network**

[![Version](https://img.shields.io/badge/version-2.6.0-blue.svg)](https://github.com/xlabtg/TONAIAgent/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0.0-blue.svg)](https://www.typescriptlang.org/)

TON AI Agent is a production-grade platform for deploying autonomous AI agents on the TON blockchain. The platform combines multi-provider AI orchestration (Groq-first), institutional-grade security, and a comprehensive strategy engine to enable intelligent, self-operating financial agents.

> **🚀 MVP Status**: The current development focus is the MVP — delivering the core demo flow end-to-end. See the [MVP Architecture](docs/mvp-architecture.md) and [MVP Feature Checklist](docs/mvp-checklist.md) for scope and priorities.

---

## Table of Contents

1. [MVP Overview](#mvp-overview)
2. [Overview](#overview)
3. [Key Features](#key-features)
4. [System Architecture](#system-architecture)
5. [Core Modules](#core-modules)
6. [Technology Stack](#technology-stack)
7. [Prerequisites](#prerequisites)
8. [Installation](#installation)
9. [Configuration](#configuration)
10. [Quick Start](#quick-start)
11. [Telegram Integration](#telegram-integration)
12. [Admin Dashboard](#admin-dashboard)
13. [Security Best Practices](#security-best-practices)
14. [Contributing](#contributing)
15. [Roadmap](#roadmap)
16. [Community](#community)
17. [License](#license)

---

## MVP Overview

> **MVP Vision**: "Create and deploy your own AI crypto agent in under 3 minutes."

The TON AI Agent MVP is a focused, end-to-end demo of the core agent creation and execution flow. It is designed to be demo-ready, investor-ready, and deployable without any Phase 2+ features.

### MVP Demo Flow

```
User
  │
  ▼ POST /agent/create (name, strategy, budget, risk)
Agent Created (simulation mode)
  │
  ▼ POST /agent/start
Agent Running — 9-step execution pipeline:
  fetch_data → call_ai (Groq) → validate_risk → execute_strategy
  │
  ▼ Telegram notification sent
  ▼ Trade logged to history
  ▼ Metrics updated (PnL, drawdown)
  │
  ▼ GET /agent/status | GET /agent/metrics
Agent Dashboard (Admin panel, status, trade history)
```

### MVP Architecture Documents

| Document | Description |
|---|---|
| [MVP Feature Checklist](docs/mvp-checklist.md) | Finalized list of in-scope and out-of-scope features |
| [MVP Architecture Diagram](docs/mvp-architecture.md) | System diagram, data flow, deployment topology |
| [MVP Module List](docs/mvp-modules.md) | Module-by-module inclusion/exclusion table |
| [MVP Refactoring Plan](docs/mvp-refactoring.md) | Required refactoring before production |

### MVP Scope Summary

**In scope (MVP)**:
- Single-command agent creation via REST API
- 4 strategy templates: DCA, Yield, Grid, Arbitrage
- Agent runtime with 9-step execution pipeline
- Simulation mode (no real funds required)
- TON wallet creation and basic payments
- Telegram bot: commands + notifications
- Admin dashboard: monitoring + risk controls + RBAC

**Out of scope (Phase 2+)**:
- Strategy Marketplace, Copy Trading, Multi-Agent Swarms
- Institutional Suite, Hedge Fund, Ecosystem Fund
- TONAI Tokenomics and Governance
- Omnichain / Multi-chain support
- AI Credit, Regulatory Compliance, Super App

---

## Overview

### Mission

Build the foundational infrastructure for AI-native autonomous finance, enabling anyone to deploy intelligent agents that operate 24/7 on the TON blockchain.

### Vision

Create a world where autonomous AI agents democratize access to sophisticated financial strategies, operating transparently and securely within the TON ecosystem.

### What is TON AI Agent?

TON AI Agent is a comprehensive platform that enables:

- **Autonomous Agents**: Deploy AI-powered agents that execute trading strategies, manage portfolios, and optimize yields without manual intervention
- **Multi-Provider AI**: Leverage the best AI models from Groq, Anthropic, OpenAI, Google, and xAI with intelligent routing and automatic failover
- **Institutional Security**: MPC key management, HSM integration, and multi-layer authorization ensure your assets remain secure
- **Strategy Marketplace**: Discover, copy, and monetize trading strategies through a decentralized marketplace
- **Telegram-Native UX**: Interact with your agents through a familiar Telegram interface with Mini App support

---

## Key Features

### AI Layer

| Feature | Description |
|---------|-------------|
| **Multi-Provider Support** | Groq (primary), Anthropic, OpenAI, Google, xAI, OpenRouter |
| **Intelligent Routing** | Dynamic model selection based on task type, cost, and latency |
| **Automatic Failover** | Circuit breaker pattern with graceful provider fallback |
| **Memory System** | Short-term, long-term, and semantic memory for context retention |
| **Safety Guardrails** | Prompt injection detection, content filtering, risk validation |

### Strategy Engine

| Feature | Description |
|---------|-------------|
| **Strategy DSL** | JSON-based domain-specific language for strategy definition |
| **Backtesting** | Historical simulation with Monte Carlo analysis |
| **Optimization** | Grid search, Bayesian, and genetic algorithm parameter tuning |
| **Risk Controls** | Stop-loss, take-profit, trailing stops, position limits |
| **AI Generation** | Generate strategies from natural language descriptions |

### Security

| Feature | Description |
|---------|-------------|
| **MPC Wallets** | 2-of-3 threshold signing with distributed key shares |
| **HSM Integration** | Hardware security modules for platform key management |
| **8-Layer Authorization** | Intent validation, risk scoring, policy checks, simulation |
| **Audit Logging** | Tamper-proof event logging with integrity verification |
| **Emergency Controls** | Kill switch, agent pause, and recovery mechanisms |

### Multi-Agent Coordination

| Feature | Description |
|---------|-------------|
| **Swarm Intelligence** | Coordinate multiple specialized agents |
| **Role-Based Agents** | Strategist, Executor, Risk, Data, Portfolio, Coordinator |
| **Shared Memory** | Distributed state with versioning and conflict resolution |
| **Task Delegation** | Intelligent routing and workload distribution |

### Marketplace & Copy Trading

| Feature | Description |
|---------|-------------|
| **Strategy Discovery** | Browse and filter strategies by performance metrics |
| **One-Click Copy** | Mirror successful traders with configurable allocation |
| **Creator Monetization** | Earn from strategy subscriptions and performance fees |
| **Reputation System** | Multi-factor scoring with fraud detection |

### Tokenomics & Governance

| Feature | Description |
|---------|-------------|
| **TONAI Token** | Governance, staking, fee discounts, access control |
| **Staking Rewards** | Earn up to 20% APY with tiered lock periods |
| **DAO Governance** | Proposal creation, voting, and execution |
| **Anti-Exploit** | Sybil resistance, rate limiting, emission controls |

### Protocol Constitution & Governance Charter

The Protocol Constitution is the foundational constitutional layer that defines the protocol's governance structure, AI authority boundaries, and immutable protections.

```
Token Holders (DAO)
      ↓
Governance Proposals → AI Advisory Analysis → Risk Oversight Review
      ↓
Vote & Timelock → On-chain Execution
      ↓
Constitutional Limits (Hard limits · AI prohibition list · Immutable clauses)
```

| Section | Description |
|---------|-------------|
| **Foundational Principles** | Protocol purpose, economic mission, risk tolerance, decentralization commitment |
| **Governance Architecture** | Token holder DAO, treasury council, risk oversight council, emergency committee, AI advisory layer |
| **AI Authority Spec** | Bounded autonomous actions, advisory-only actions, and absolutely prohibited actions |
| **Risk Boundaries** | Immutable hard limits (max leverage, systemic exposure, insurance reserve floor) |
| **Monetary Governance Rules** | Emission policy, inflation/deflation bounds, AI monetary adjustment limits |
| **Emergency Framework** | Trigger conditions, emergency powers, auto-sunset (max 7 days), post-emergency review |
| **Amendment Process** | Community review → audit → DAO vote → timelock → enactment; supermajority for constitutional changes |
| **Institutional Compliance** | KYC/AML, custody standards, RWA regulatory mapping, jurisdiction-aware rules |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           User Interaction Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Telegram Bot   │  │ Telegram Mini   │  │    Notification Service     │  │
│  │                 │  │      App        │  │                             │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                          │                  │
└───────────┼────────────────────┼──────────────────────────┼──────────────────┘
            │                    │                          │
            ▼                    ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend Core                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ API Gateway │  │   Agent     │  │  Strategy   │  │    Event Bus        │  │
│  │             │  │Orchestrator │  │   Engine    │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                │                     │             │
└─────────┼────────────────┼────────────────┼─────────────────────┼─────────────┘
          │                │                │                     │
          ▼                ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               AI Layer                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  AI Router  │  │   Memory    │  │   Safety    │  │   Orchestration     │  │
│  │             │  │   System    │  │   Manager   │  │      Engine         │  │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                                     │
│  ┌──────▼──────────────────────────────────────────────────────────────────┐  │
│  │  Groq (P1)  │  Anthropic (P2)  │  OpenAI (P3)  │  Google  │  xAI  │  OR │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Security Layer                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │     Key     │  │    MPC      │  │    Risk     │  │      Audit          │  │
│  │  Management │  │   Service   │  │   Engine    │  │      Logger         │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Blockchain Layer                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Wallet    │  │    Agent    │  │    Vault    │  │      Jetton         │  │
│  │ Abstraction │  │  Contracts  │  │  Contracts  │  │      Handler        │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

---

## Core Modules

> **Legend**: ✅ MVP Core — 🔧 MVP Support — 🚧 Partial (limited MVP scope) — ❌ Phase 2+
>
> See [docs/mvp-modules.md](docs/mvp-modules.md) for the full module inclusion/exclusion list.

| Module | MVP Status | Description | Documentation |
|--------|-----------|-------------|---------------|
| **Demo Agent** | ✅ MVP Core | Agent REST API, 4 strategies, risk manager | (src/demo-agent) |
| **Agent Runtime** | ✅ MVP Core | 9-step pipeline, lifecycle state machine | (src/agent-runtime) |
| **AI Layer** | ✅ MVP Core | Multi-provider AI orchestration with Groq-first routing | [docs/ai-layer.md](docs/ai-layer.md) |
| **TON Factory** | ✅ MVP Core | Wallet creation, smart contracts, transactions | (src/ton-factory) |
| **Admin Dashboard** | ✅ MVP Core | Agent monitoring, risk controls, RBAC | (src/mvp/admin-dashboard) |
| **Security** | 🔧 MVP Support | Key management, auth, audit logging | [docs/security.md](docs/security.md) |
| **SDK** | 🔧 MVP Support | TypeScript types and client helpers | [docs/protocol-sdk.md](docs/protocol-sdk.md) |
| **Strategy Engine** | 🚧 Partial (MVP) | DCA, Yield, Grid, Arbitrage strategies | [docs/strategy.md](docs/strategy.md) |
| **Payments** | 🚧 Partial (MVP) | Agent funding and basic payment logic | [docs/payments.md](docs/payments.md) |
| **Multi-Agent** | ❌ Phase 2 | Swarm coordination, shared memory, task delegation | [docs/multi-agent.md](docs/multi-agent.md) |
| **Marketplace** | ❌ Phase 2 | Strategy discovery, copy trading, creator monetization | [docs/marketplace.md](docs/marketplace.md) |
| **Tokenomics** | ❌ Phase 2 | TONAI token, staking, governance, reputation | [docs/tokenomics.md](docs/tokenomics.md) |
| **Institutional** | ❌ Phase 2 | KYC/AML, compliance, reporting, custody | [docs/institutional.md](docs/institutional.md) |
| **Hedge Fund** | ❌ Phase 2 | Autonomous fund management with AI strategies | [docs/hedgefund.md](docs/hedgefund.md) |
| **Ecosystem Fund** | ❌ Phase 2 | Grants, incubation, capital allocation | [docs/ecosystem-fund.md](docs/ecosystem-fund.md) |
| **AI Credit** | ❌ Phase 2 | Lending, underwriting, CoinRabbit integration | [docs/ai-credit.md](docs/ai-credit.md) |
| **No-Code Builder** | ❌ Phase 2 | Visual strategy construction without coding | [docs/no-code.md](docs/no-code.md) |
| **Mobile UX** | ❌ Phase 2 | Telegram-native mobile-first experience | [docs/mobile-ux.md](docs/mobile-ux.md) |
| **Omnichain** | ❌ Phase 3 | Cross-chain operations via ChangeNOW integration | [docs/omnichain.md](docs/omnichain.md) |
| **Protocol** | ❌ Phase 3 | Open Agent Protocol (OAP) specification | [docs/protocol.md](docs/protocol.md) |
| **Plugins** | ❌ Phase 3 | Extensible tool and integration system | [docs/plugins.md](docs/plugins.md) |
| **Data Platform** | ❌ Phase 3 | Market data, signals, oracles, analytics | [docs/data-platform.md](docs/data-platform.md) |
| **Launchpad** | ❌ Phase 3 | Agent creation, funding, treasury management | [docs/launchpad.md](docs/launchpad.md) |
| **AI Safety** | ❌ Phase 3 | Alignment, guardrails, anomaly detection | [docs/ai-safety.md](docs/ai-safety.md) |
| **Super App** | ❌ Phase 3 | Wallet, agents, social layer, Telegram integration | [docs/superapp.md](docs/superapp.md) |
| **Regulatory** | ❌ Phase 3 | Global compliance and jurisdictional framework | [docs/regulatory-strategy.md](docs/regulatory-strategy.md) |
| **Token Strategy** | ❌ Phase 3 | Launch, liquidity flywheel, valuation modeling | [docs/token-strategy.md](docs/token-strategy.md) |
| **Growth** | ❌ Phase 4 | Viral mechanics, gamification, referrals | [docs/growth.md](docs/growth.md) |
| **Personal Finance** | ❌ Phase 4 | AI-native wealth management and financial literacy | [docs/personal-finance.md](docs/personal-finance.md) |
| **Institutional Network** | ❌ Phase 4 | Funds, banks, custodians, liquidity providers | [docs/institutional-network.md](docs/institutional-network.md) |
| **Liquidity Network** | ❌ Phase 4 | Aggregated pools, smart routing, vaults, internal liquidity | [docs/liquidity-network.md](docs/liquidity-network.md) |
| **Protocol Constitution** | ❌ Phase 4 | Governance charter, AI authority spec, risk hard limits, emergency framework | (src/protocol-constitution) |

---

## Institutional Infrastructure Layer

> Built on The Open Network for institutional-grade autonomous finance

The platform provides a comprehensive institutional infrastructure stack integrating Prime Brokerage, a decentralized Liquidity Network, Risk Engine, RWA tokenization, and Clearing capabilities.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Institutional Infrastructure Layer                      │
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │  Prime          │  │  Liquidity      │  │  Risk Engine    │               │
│  │  Brokerage      │  │  Network        │  │                 │               │
│  │                 │  │                 │  │  - VaR/Stress   │               │
│  │  - Custody      │  │  - Aggregation  │  │  - Margin       │               │
│  │  - Margin       │  │  - Smart Route  │  │  - Limits       │               │
│  │  - Capital Eff. │  │  - Vaults       │  │  - Exposure     │               │
│  │  - Securities   │  │  - Int. Pools   │  │                 │               │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘               │
│           │                    │                     │                       │
│  ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐               │
│  │  RWA &          │  │  Institutional  │  │  Clearing &     │               │
│  │  Tokenized      │  │  Network        │  │  Settlement     │               │
│  │  Funds          │  │  (Partners)     │  │                 │               │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘               │
│                                                                               │
│  Architecture:                                                                │
│  Agents/Funds → Prime Brokerage → Liquidity Network → DEX / OTC / Cross-chain│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Prime Brokerage (`src/prime-brokerage`)

Institutional-grade prime brokerage for autonomous AI funds:

| Component | Description |
|-----------|-------------|
| **Multi-Fund Custody** | Centralized capital pools, multi-agent allocation, internal clearing |
| **Margin & Leverage** | Risk-based leverage, dynamic margin, volatility-adjusted collateral |
| **Risk Aggregation** | Portfolio-level exposure, systemic risk modeling, VaR and stress tests |
| **Capital Efficiency** | Idle capital optimization, yield stacking, cross-fund routing |
| **Institutional Reporting** | NAV calculations, risk exposure reports, audit logs |
| **Securities Lending** | Token lending, agent-to-agent liquidity, RWA-backed lending |
| **Cross-Chain Brokerage** | Multi-chain capital, cross-chain collateral, bridge-aware margin |

### Liquidity Network (`src/liquidity-network`)

Deep liquidity infrastructure for institutional capital routing:

| Component | Description |
|-----------|-------------|
| **Aggregation Layer** | DEXs, OTC desks, agent liquidity, cross-chain bridges |
| **Smart Order Routing** | Slippage optimization, gas-aware routing, latency optimization |
| **Internal Pools** | Agent-to-agent lending, treasury-to-fund routing, capital reuse |
| **Deep Liquidity Vaults** | Stablecoin, RWA, and hedging pool infrastructure |
| **Risk-Controlled Execution** | Prime brokerage limits, real-time exposure checks, circuit breakers |

### Risk Engine

Integrated across Prime Brokerage and Liquidity Network:
- Pre-trade risk validation with configurable limits
- Real-time pair exposure and concentration monitoring
- Post-trade volume tracking and daily limit enforcement
- Automated suspension on limit breach

### RWA & Tokenized Funds (`src/rwa`)

Real-world asset tokenization and fund infrastructure:
- Asset-backed token management
- Proof of reserves and audit trails
- Secondary market liquidity
- Cross-chain RWA bridging

---

## Technology Stack

### Backend

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js 18+ |
| **Language** | TypeScript 5.0+ |
| **Build** | tsup |
| **Testing** | Vitest |
| **Linting** | ESLint |
| **Formatting** | Prettier |

### AI Providers

| Provider | Priority | Use Case |
|----------|----------|----------|
| **Groq** | Primary | Ultra-low latency inference |
| **Anthropic** | Fallback 1 | Complex reasoning tasks |
| **OpenAI** | Fallback 2 | Wide compatibility |
| **Google** | Fallback 3 | 2M context window |
| **xAI** | Fallback 4 | Alternative reasoning |
| **OpenRouter** | Fallback 5 | 300+ model access |

### TON Integration

| Component | Technology |
|-----------|------------|
| **Blockchain** | TON (The Open Network) |
| **Wallets** | TON Connect, MPC wallets |
| **Smart Contracts** | FunC / Tact |
| **DNS** | TON DNS |
| **Storage** | TON Storage |

### Infrastructure

| Category | Technology |
|----------|------------|
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Queue** | Apache Kafka |
| **Object Storage** | S3-compatible |
| **Vector DB** | For semantic memory |
| **Oracles** | RedStone, Pyth Network |

---

## Prerequisites

Before installing TON AI Agent, ensure you have:

### Required

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 (or yarn/pnpm)
- **Git** for cloning the repository

### Optional (for production)

- **Docker** and Docker Compose
- **TON Wallet** for blockchain operations
- **Telegram Bot Token** for bot integration
- **API Keys** for AI providers (Groq, Anthropic, OpenAI, etc.)

### API Keys

| Provider | Required | Purpose |
|----------|----------|---------|
| **Groq** | Recommended | Primary AI inference |
| **Anthropic** | Optional | Fallback AI provider |
| **OpenAI** | Optional | Fallback AI provider |
| **Google AI** | Optional | Fallback AI provider |
| **xAI** | Optional | Fallback AI provider |
| **OpenRouter** | Optional | Multi-model access |
| **Telegram** | Required | Bot and Mini App |

---

## Installation

### Local Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/xlabtg/TONAIAgent.git
cd TONAIAgent
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# AI Providers (Groq is primary)
GROQ_API_KEY=your-groq-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-api-key
XAI_API_KEY=your-xai-api-key
OPENROUTER_API_KEY=your-openrouter-api-key

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_MINI_APP_URL=https://t.me/YourBot/app

# Security
KEY_ENCRYPTION_KEY=your-encryption-key
MPC_THRESHOLD=2
MPC_TOTAL_PARTIES=3

# Risk Management
MAX_TRANSACTION_TON=1000
MAX_DAILY_TON=5000
MAX_RISK_SCORE=80
```

4. **Build the project**

```bash
npm run build
```

5. **Run tests**

```bash
npm test
```

6. **Start development server**

```bash
npm run dev
```

### Production Deployment

For production deployment with Docker:

1. **Build Docker image**

```bash
docker build -t tonaiagent:latest .
```

2. **Run with Docker Compose**

```bash
docker-compose up -d
```

3. **Configure monitoring**

```bash
# Set up Prometheus metrics endpoint
# Configure Grafana dashboards
# Set up alerting rules
```

---

## Configuration

### Full Configuration Example

```typescript
import { createAIService } from '@tonaiagent/core/ai';
import { createSecurityManager } from '@tonaiagent/core/security';
import { createStrategyEngine } from '@tonaiagent/core/strategy';

// AI Service Configuration
const ai = createAIService({
  providers: {
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      defaultModel: 'llama-3.3-70b-versatile',
      priority: 1,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: 'claude-sonnet-4-20250514',
      priority: 2,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: 'gpt-4o',
      priority: 3,
    },
  },
  routing: {
    mode: 'balanced',
    primaryProvider: 'groq',
    fallbackChain: ['anthropic', 'openai', 'google'],
  },
  safety: {
    enabled: true,
    inputValidation: { detectPromptInjection: true },
    riskThresholds: { maxTransactionValueTon: 1000 },
  },
});

// Security Configuration
const security = createSecurityManager({
  enabled: true,
  custody: {
    mode: 'mpc',
    userOwned: true,
    platformManaged: true,
    recoveryEnabled: true,
  },
  mpc: {
    threshold: 2,
    totalParties: 3,
  },
  risk: {
    enabled: true,
    maxRiskScore: 80,
  },
  emergency: {
    killSwitchEnabled: true,
    autoResponseEnabled: true,
  },
  audit: {
    enabled: true,
    retentionDays: 365,
    signEvents: true,
  },
});

// Strategy Engine Configuration
const strategy = createStrategyEngine({
  enabled: true,
  maxActiveStrategies: 20,
  backtestingEnabled: true,
  optimizationEnabled: true,
  aiIntegrationEnabled: true,
  simulationMode: true, // Start in simulation mode
});
```

### Environment Variables Reference

See the [Configuration](#configuration) section for a complete list of environment variables.

---

## Quick Start

### Running Your First AI Agent

```typescript
import { createAIService } from '@tonaiagent/core/ai';
import { createStrategyEngine, StrategySpec } from '@tonaiagent/core/strategy';

// 1. Initialize AI Service
const ai = createAIService({
  providers: {
    groq: { apiKey: process.env.GROQ_API_KEY },
  },
});

// 2. Initialize Strategy Engine
const engine = createStrategyEngine({
  enabled: true,
  simulationMode: true, // Start with simulation
});

// 3. Define a simple DCA strategy
const dcaStrategy: StrategySpec = {
  triggers: [{
    id: 'daily',
    type: 'schedule',
    name: 'Daily DCA',
    enabled: true,
    config: { type: 'schedule', cron: '0 9 * * *' },
  }],
  conditions: [],
  actions: [{
    id: 'buy',
    type: 'swap',
    name: 'Buy TON',
    priority: 1,
    config: {
      type: 'swap',
      fromToken: 'USDT',
      toToken: 'TON',
      amount: { type: 'fixed', value: 100 },
      slippageTolerance: 0.5,
    },
  }],
  riskControls: [{
    id: 'stop_loss',
    type: 'stop_loss',
    name: 'Stop Loss 15%',
    enabled: true,
    config: { type: 'stop_loss', percentage: 15 },
    action: { type: 'notify' },
  }],
  parameters: [],
  capitalAllocation: {
    mode: 'fixed',
    allocatedAmount: 100,
    minCapital: 10,
    reservePercentage: 20,
  },
};

// 4. Create and activate the strategy
const strategy = await engine.manager.createStrategy({
  name: 'My First DCA Strategy',
  description: 'Dollar-cost averaging into TON',
  type: 'rule_based',
  userId: 'user_123',
  agentId: 'agent_123',
  definition: dcaStrategy,
});

// 5. Validate and activate
await engine.manager.validateStrategy(strategy.id);
await engine.manager.activateStrategy(strategy.id);

// 6. Monitor the agent
engine.onEvent((event) => {
  console.log(`[${event.type}]`, event.data);
});

console.log('Agent deployed successfully!');
```

### Funding Your Agent

1. Connect your TON wallet to the platform
2. Deposit funds to your agent's smart contract wallet
3. Set spending limits and permissions
4. Monitor activity through the dashboard

### Monitoring Your Agent

```typescript
// Get agent status
const status = await engine.manager.getStrategy(strategy.id);
console.log('Status:', status.status);
console.log('Performance:', status.performance);

// Get execution history
const executions = await engine.getExecutions(strategy.id);
executions.forEach(exec => {
  console.log(`${exec.startedAt}: ${exec.status}`);
});

// Stop the agent
await engine.manager.pauseStrategy(strategy.id, 'User requested pause');
```

---

## Telegram Integration

### Bot Setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Set up commands:
   - `/start` - Initialize user account
   - `/agents` - List your agents
   - `/create` - Create new agent
   - `/portfolio` - View portfolio
   - `/help` - Get help

### Mini App Deployment

The Mini App provides a rich UI within Telegram:

```typescript
import { createSuperAppService } from '@tonaiagent/core/superapp';

const superApp = createSuperAppService({
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    miniAppUrl: 'https://t.me/YourBot/app',
  },
});

// Handle Telegram authentication
const user = await superApp.validateTelegramAuth(initData);

// Create agent from Mini App
const agent = await superApp.agentDashboard.createAgent({
  userId: user.id,
  name: 'My Trading Agent',
  strategyId: 'dca_ton',
  capitalAllocated: 1000,
});
```

### UX Customization

- Themes (light/dark mode)
- Language localization
- Notification preferences
- Dashboard widgets

---

## Admin Dashboard

### Features

| Feature | Description |
|---------|-------------|
| **User Management** | View, search, and manage user accounts |
| **Agent Control** | Monitor, pause, and restart agents |
| **Security** | View audit logs, manage permissions |
| **Compliance** | KYC status, risk flags, reporting |
| **System Monitoring** | Health checks, metrics, alerts |

### Access Control

```typescript
// Admin dashboard access levels
const adminLevels = {
  viewer: ['read_users', 'read_agents', 'read_metrics'],
  operator: ['...viewer', 'pause_agents', 'view_logs'],
  admin: ['...operator', 'manage_users', 'manage_agents'],
  superadmin: ['...admin', 'manage_admins', 'emergency_actions'],
};
```

---

## Security Best Practices

### Key Management

- **Never store private keys in code** - Use environment variables or HSM
- **Use MPC wallets** - Distribute key shares across multiple parties
- **Enable key rotation** - Rotate keys every 90 days
- **Backup recovery keys** - Store recovery shares securely offline

### Agent Permissions

```typescript
// Start with conservative permissions
const permissions = {
  capabilities: {
    trading: { enabled: true, maxSlippage: 0.01 },
    transfers: { enabled: true, whitelistOnly: true },
    staking: { enabled: true },
    nft: { enabled: false },
  },
  limits: {
    perTransaction: 100,
    daily: 500,
    weekly: 2000,
  },
};
```

### Monitoring

- Enable all security features in production
- Set up alerting for suspicious activities
- Review audit logs regularly
- Configure auto-response triggers

### Risk Controls

- Set appropriate transaction limits
- Enable multi-layer authorization
- Configure fraud detection
- Implement emergency kill switch

---

## Contributing

We welcome contributions from the community! Please read our contributing guidelines before submitting a pull request.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit with a clear message
7. Push and create a pull request

### Code Standards

- Follow TypeScript best practices
- Write comprehensive tests
- Document public APIs
- Use meaningful commit messages

### Issue Workflow

1. Check existing issues before creating new ones
2. Use issue templates for bugs, features, and discussions
3. Provide clear reproduction steps for bugs
4. Include relevant logs and context

---

## Roadmap

### MVP (Current Focus)

> "Create and deploy your own AI crypto agent in under 3 minutes."

- [x] Agent creation REST API (single entrypoint)
- [x] 4 strategy templates: DCA, Yield, Grid, Arbitrage
- [x] 9-step agent execution pipeline
- [x] Simulation mode (no real funds)
- [x] TON wallet creation and basic payments
- [x] Telegram bot: commands + status notifications
- [x] Admin dashboard: monitoring, risk controls, RBAC
- [ ] Unified MVP entrypoint (`src/index.ts`)
- [ ] Complete unit test coverage for MVP modules
- [ ] End-to-end demo scenario (#90)
- [ ] One-click agent creation API (#91)
- [ ] Production deployment framework (#93)

See [docs/mvp-checklist.md](docs/mvp-checklist.md) for the full checklist and acceptance criteria.

### Phase 1: Foundation (Completed)

- [x] Multi-provider AI layer (Groq-first)
- [x] Security and key management
- [x] Strategy engine and DSL
- [x] Agent runtime orchestrator
- [x] Demo agent with simulation mode
- [x] Build system and CI/CD pipeline

### Phase 2: Expansion (Q2 2026)

- [ ] Strategy Marketplace (public)
- [ ] Copy Trading
- [ ] Multi-Agent Swarms
- [ ] Institutional Suite
- [ ] TONAI Token and Governance
- [ ] AI Credit and Lending
- [ ] Mobile UX / Telegram Mini App

### Phase 3: Scale (Q3-Q4 2026)

- [ ] Omnichain / Multi-chain support
- [ ] Protocol layer (Open Agent Protocol)
- [ ] Plugin marketplace
- [ ] Launchpad
- [ ] Super App layer
- [ ] Regulatory compliance engine

### Phase 4: Ecosystem (2027+)

- [ ] Institutional Network
- [ ] Personal Finance AI
- [ ] Growth and referral engine
- [ ] Decentralized AI training
- [ ] Agent-to-agent economy
- [ ] Full decentralization

---

## Community

### Connect With Us

| Platform | Link |
|----------|------|
| **Telegram** | [t.me/xlab_tg](https://t.me/xlab_tg) |
| **GitHub** | [github.com/xlabtg/TONAIAgent](https://github.com/xlabtg/TONAIAgent) |
| **Documentation** | [Documentation](docs/) |

### Developer Resources

- [Documentation](docs/)
- [SDK Reference](docs/protocol-sdk.md)
- [Plugin Development](docs/plugins.md)
- [Strategy DSL Guide](docs/strategy.md)

### Getting Help

- Open an [issue](https://github.com/xlabtg/TONAIAgent/issues) for bugs
- Join our Telegram for community support
- Check the documentation for guides

---

## License

TON AI Agent is open source software licensed under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2026 TON AI Agent Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<p align="center">
  <strong>Built with ❤️ for the TON Ecosystem</strong>
</p>
