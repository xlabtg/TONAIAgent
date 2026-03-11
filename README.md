# TON AI Agent Platform

> **AI-Native Global Financial Infrastructure (AGFI) — The Next Generation of Capital Coordination**

[![Version](https://img.shields.io/badge/version-2.31.0-blue.svg)](https://github.com/xlabtg/TONAIAgent/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0.0-blue.svg)](https://www.typescriptlang.org/)

TON AI Agent is an institutional-grade platform for global AI-native capital coordination on the TON blockchain. The platform implements the **AI-native Global Financial Infrastructure (AGFI)** — comparable in systemic importance to SWIFT, IMF, and BIS, but with AI-coordination, on-chain transparency, programmability, and borderless design.

> **🏛️ AGFI Status**: The platform has been formalized as global AI-native financial infrastructure. The AGFI module implements all six architectural pillars: Global Capital Layer, Global Liquidity Fabric, AI Systemic Coordination, Autonomous Monetary Infrastructure, Governance & Institutional Alignment, and Interoperability & Global Integration. See [docs/agfi.md](docs/agfi.md) for the complete AGFI specification.

> **🚀 MVP Architecture Freeze**: The MVP architecture has been defined and frozen as of Issue #178. The MVP delivers a Telegram-native AI Agent platform deployable on standard PHP + MySQL hosting. See the [MVP Architecture](docs/mvp-architecture.md) and [MVP Feature Checklist](docs/mvp-checklist.md) for full scope and priorities.

---

## Table of Contents

1. [AGFI: AI-native Global Financial Infrastructure](#agfi-ai-native-global-financial-infrastructure)
2. [GAEI: Global Autonomous Economic Infrastructure](#gaei-global-autonomous-economic-infrastructure)
3. [MVP Architecture](#mvp-architecture)
4. [Overview](#overview)
5. [Key Features](#key-features)
6. [System Architecture](#system-architecture)
7. [Core Modules](#core-modules)
8. [Technology Stack](#technology-stack)
9. [Prerequisites](#prerequisites)
10. [Installation](#installation)
11. [Configuration](#configuration)
12. [Quick Start](#quick-start)
13. [Telegram Integration](#telegram-integration)
14. [Admin Dashboard](#admin-dashboard)
15. [Security Best Practices](#security-best-practices)
16. [Contributing](#contributing)
17. [Global Autonomous Asset Management Protocol (GAAMP)](#global-autonomous-asset-management-protocol-gaamp)
18. [Sovereign-Grade Institutional Alignment (SGIA)](#sovereign-grade-institutional-alignment-sgia)
19. [Global Regulatory Integration Framework (GRIF)](#global-regulatory-integration-framework-grif)
20. [Autonomous Global Financial Network (AGFN)](#autonomous-global-financial-network-agfn)
21. [AI-native Financial Operating System (AIFOS)](#ai-native-financial-operating-system-aifos)
22. [Sovereign Digital Asset Coordination Layer (SDACL)](#sovereign-digital-asset-coordination-layer-sdacl)
23. [Production Agent Runtime](#production-agent-runtime)
24. [Agent Plugin System](#agent-plugin-system)
25. [Strategy Marketplace](#strategy-marketplace)
26. [Strategy Reputation System](#strategy-reputation-system)
27. [Live Trading Infrastructure](#live-trading-infrastructure)
28. [AI Fund Manager](#ai-fund-manager)
29. [Investor Demo](#investor-demo)
30. [Strategy Backtesting](#strategy-backtesting)
31. [Community](#community)
32. [Risk Engine](#risk-engine)
33. [License](#license)

---

## AGFI: AI-native Global Financial Infrastructure

> **From Protocol → Infrastructure**: TON AI Agent is now formalized as institutional-grade global capital coordination infrastructure — AI-native, on-chain transparent, programmable, and borderless.

### What is AGFI?

The AI-native Global Financial Infrastructure (AGFI) transforms the platform from a DeFi protocol into a candidate architecture for next-generation global financial coordination, comparable to:

| Traditional System | AGFI Equivalent | Key Capability |
|---|---|---|
| SWIFT | Global Liquidity Fabric + Interoperability | Cross-chain settlement corridors |
| IMF | AI Systemic Coordination Layer | Global exposure mapping & stabilization |
| BIS | Autonomous Monetary Infrastructure | Multi-asset reserves & emission control |
| DTCC | Global Capital Layer | Institutional clearing & custody |

### Six Architectural Pillars

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               AGFI - AI-native Global Financial Infrastructure               │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Global Capital Layer      │  Sovereign funds, institutional allocators  │
│  2. Global Liquidity Fabric   │  Cross-chain corridors, RWA bridges         │
│  3. AI Systemic Coordination  │  Exposure mapping, capital adequacy         │
│  4. Autonomous Monetary       │  Multi-asset treasury, emission control     │
│  5. Governance & Alignment    │  Jurisdiction modules, sovereign onboarding │
│  6. Interoperability          │  Cross-chain messaging, bank connectors     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quick AGFI Example

```typescript
import { createAGFIManager } from '@tonaiagent/core/agfi';

const agfi = createAGFIManager();

// Onboard a sovereign wealth fund
const fund = agfi.globalCapital.onboardInstitution({
  name: 'Norges Bank Investment Management',
  type: 'sovereign_fund',
  jurisdiction: 'NO',
  aum: 1_400_000_000_000, // $1.4T
  complianceTier: 'sovereign',
});

// Open a cross-chain liquidity corridor
const corridor = agfi.globalLiquidity.openCorridor({
  name: 'TON-ETH Institutional',
  sourceChain: 'ton',
  destinationChain: 'ethereum',
  corridorType: 'institutional_corridor',
  initialLiquidity: 500_000_000,
});

// Run a systemic risk simulation
const stress = agfi.systemicCoordination.runStressSimulation({
  scenarioName: 'Global Credit Event',
  scenarioType: 'market_crash',
  shockMagnitude: 30,
});

// Get full system status
const status = agfi.getSystemStatus();
console.log('Risk Level:', status.systemicRiskLevel);
console.log('Active Corridors:', status.activeLiquidityCorridors);
```

**Full AGFI Documentation**: [docs/agfi.md](docs/agfi.md)

**Institutional Capabilities**:
- Cross-border capital flows with jurisdiction-aware compliance
- Real-time systemic risk monitoring and automated stabilization
- Sovereign-grade onboarding with multi-stage due diligence
- Basel-equivalent capital adequacy modeling
- Yield-backed stabilization reserves
- SWIFT/SEPA/Fedwire bank connectivity
- RWA custodial mapping and verification
- Multi-signature governance with quorum voting

---

## GAEI: Global Autonomous Economic Infrastructure

> **From Financial Infrastructure → Economic Infrastructure**: GAEI expands the platform from financial coordination to comprehensive AI-coordinated global economic infrastructure.

### What is GAEI?

The Global Autonomous Economic Infrastructure (GAEI) is a distributed, AI-coordinated economic layer that:

- **Manages capital flows** at a macro level across jurisdictions
- **Coordinates digital assets** with real economy integration
- **Supports sovereign systems** through dedicated economic nodes
- **Enables AI-driven production & allocation** with governance bounds
- **Operates across jurisdictions** with compliance-aware routing
- **Integrates financial and real economy layers** including trade finance, infrastructure, and supply chains

### Evolution Path

```
Phase 1: Autonomous Capital Markets Stack (ACMS)
    ↓
Phase 2: AI-native Global Financial Infrastructure (AGFI)
    ↓
Phase 3: Global Autonomous Economic Infrastructure (GAEI)
```

### Six Core Infrastructure Domains

```
┌─────────────────────────────────────────────────────────────────────────────┐
│             GAEI - Global Autonomous Economic Infrastructure                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Capital Coordination Layer     │  Macro-level capital allocation        │
│  2. Real Economy Integration       │  RWA, commodities, trade finance       │
│  3. AI Economic Orchestration      │  Stress simulations, risk modeling     │
│  4. Monetary Coordination          │  Sovereign assets, treasury reserves   │
│  5. Economic Node Architecture     │  Sovereign, institutional, AI nodes    │
│  6. Stability Dashboard            │  Global monitoring, alerts, trends     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quick GAEI Example

```typescript
import { createGAEIManager } from '@tonaiagent/core/gaei';

const gaei = createGAEIManager();

// Register a sovereign economic node
const sovereignNode = gaei.nodeArchitecture.registerSovereignNode({
  name: 'Central Bank Digital Hub',
  nodeType: 'sovereign_node',
  jurisdiction: 'SG',
  parentNetwork: 'AGFN',
  initialCapital: 50_000_000_000,
  sovereignType: 'central_bank',
  countryCode: 'SG',
  regulatoryAuthority: 'MAS',
  reserveHoldings: 30_000_000_000,
  monetaryPolicyRole: 'Monetary authority',
});

// Create tokenized infrastructure financing
const project = gaei.realEconomyIntegration.createInfrastructureFinancing({
  projectName: 'ASEAN Digital Payment Rail',
  projectType: 'digital',
  totalInvestment: 200_000_000,
  jurisdiction: 'SG',
  expectedReturn: 7.5,
  projectDurationYears: 7,
  riskRating: 'AA',
  tokenize: true,
  chain: 'ton',
});

// Run macro stress simulation
const stressTest = gaei.aiOrchestration.runStressSimulation({
  scenarioName: 'Regional Liquidity Stress',
  scenarioType: 'currency_crisis',
  shockMagnitude: 15,
});

// Generate stability dashboard
const dashboard = gaei.stabilityDashboard.generateDashboard();
console.log('Stability Score:', dashboard.overallStabilityScore);
console.log('Stability Level:', dashboard.stabilityLevel);

// Get full system status
const status = gaei.getSystemStatus();
console.log('GAEI v' + status.version);
console.log('Total Capital Managed:', status.totalCapitalManaged);
console.log('Active Nodes:', status.activeNodes);
```

**Full GAEI Documentation**: [docs/gaei.md](docs/gaei.md)

**Key Capabilities**:
- Macro-level capital flow coordination across jurisdictions
- Real economy integration (RWA, commodities, infrastructure, trade finance)
- AI-driven economic orchestration with stress testing and risk modeling
- Multi-layer monetary coordination with sovereign digital assets
- Global economic node architecture for sovereign and institutional participants
- Real-time stability dashboard with alerts and trend analysis

---

## MVP Architecture

> **MVP Vision**: "Launch your own AI crypto agent in Telegram in under 3 minutes."

The TON AI Agent MVP delivers a **Telegram-native AI Agent platform** where users can create an AI agent, select a trading strategy, launch it, and monitor portfolio analytics — all inside Telegram. The system is designed to be simple, stable, and deployable on standard PHP hosting.

### Architecture Diagram

```
Telegram Bot
      │
      ▼
Telegram Mini App (Primary UI)
      │
      ▼
Backend API (PHP 8+ / MySQL)
      │
      ▼
Agent Manager
      │
      ▼
Strategy Engine v1
      │
      ▼
Trading Simulator
      │
      ▼
Portfolio Analytics
```

### Core System Components

| Component | Description |
|---|---|
| **Telegram Bot** | Primary entry point — `/start`, `/agents`, `/create_agent`, `/analytics` commands and notifications |
| **Telegram Mini App** | Main UI — Dashboard, Create Agent, Strategy Marketplace, Agent Analytics screens |
| **Backend API** | PHP backend — `POST /agents/create`, `POST /agents/start`, `POST /agents/stop`, `GET /agents`, `GET /agents/{id}/stats` |
| **Agent Manager** | Agent lifecycle — creates, schedules, and tracks agents through states: CREATED → RUNNING ↔ PAUSED → STOPPED / ERROR |
| **Strategy Engine v1** | Three strategies: Trend Following, Basic Arbitrage, AI Signal Strategy |
| **Trading Simulator** | Simulated trades using CoinGecko and Binance public APIs — no real funds required for MVP |
| **Portfolio Analytics** | Portfolio Value, PnL, Strategy Allocation, Agent Performance metrics and charts |
| **Installer System** | One-click installer for PHP 8+ / MySQL hosting — sets up database, Telegram webhook, and application |

### Deployment Requirements

- PHP 8.0 or higher
- MySQL 8.0+ or MariaDB 10.3+
- HTTPS (required for Telegram Mini Apps)
- Apache with mod_rewrite or Nginx
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### User Workflow

1. Open Telegram and send `/start` to the bot
2. Click "Open App" to launch the Telegram Mini App
3. Navigate to **Create Agent**
4. Select a strategy and configure capital allocation
5. Click **Launch** — agent begins simulated trading
6. Monitor performance on the **Analytics** screen

### MVP Architecture Documents

| Document | Description |
|---|---|
| [MVP Architecture](docs/mvp-architecture.md) | Full system diagram, components, deployment topology |
| [MVP Feature Checklist](docs/mvp-checklist.md) | In-scope and out-of-scope features |
| [MVP Module List](docs/mvp-modules.md) | Module-by-module inclusion/exclusion table |
| [MVP Refactoring Plan](docs/mvp-refactoring.md) | Required refactoring before production |
| [Development Guidelines](docs/development-guidelines.md) | Contribution and development guidelines |

### MVP Scope Summary

**In scope (MVP)**:
- Telegram Bot as primary user entry point
- Telegram Mini App as primary UI (Dashboard, Create Agent, Analytics)
- Backend API deployed on PHP + MySQL standard hosting
- Agent Manager with full lifecycle state machine
- Strategy Engine v1: Trend Following, Basic Arbitrage, AI Signal Strategy
- Trading Simulator using public market data APIs
- Portfolio Analytics: PnL, portfolio value, performance charts
- One-click Installer for standard PHP hosting

**Out of scope (MVP — deferred to future milestones)**:
- DAO governance
- Hedge fund infrastructure
- Global liquidity networks
- Cross-chain liquidity
- Clearing house systems
- Institutional compliance layers

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

### AI Monetary Policy & Treasury Layer

| Feature | Description |
|---------|-------------|
| **Protocol Treasury Vault** | Multi-category reserves: liquidity buffer, insurance fund, strategic capital, stabilization fund |
| **AI Monetary Engine** | Continuously analyzes stability index, liquidity depth, market volatility to generate policy recommendations |
| **Adaptive Emission Control** | Phase-based tokenomics: inflation (growth), deflation (stress), burn (profit), incentive boost (liquidity gap) |
| **Treasury Capital Allocator** | Strategic deployment of reserves with AI-auto / multisig / DAO-vote approval tiers |
| **Stability-Linked Incentives** | Reward multipliers and yield boosts tied to protocol health and participant behavior |
| **Monetary Governance** | AI Analysis → DAO Proposal → Vote → Smart Contract Execution with emergency override support |

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
| **AGFI** | ✅ Phase 2 | AI-native Global Financial Infrastructure (6 pillars) | [docs/agfi.md](docs/agfi.md) |
| **GAEI** | ✅ Phase 3 | Global Autonomous Economic Infrastructure (6 domains) | [docs/gaei.md](docs/gaei.md) |
| **Demo Agent** | ✅ MVP Core | Agent REST API, 4 strategies, risk manager | (src/demo-agent) |
| **Agent Runtime** | ✅ MVP Core | 9-step pipeline, lifecycle state machine, simulation mode, risk controls | [Production Agent Runtime](#production-agent-runtime) |
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
| **Monetary Policy** | ❌ Phase 2 | AI-driven emission control, treasury management, DAO monetary governance | (src/monetary-policy) |
| **Institutional** | ❌ Phase 2 | KYC/AML, compliance, reporting, custody | [docs/institutional.md](docs/institutional.md) |
| **Hedge Fund** | ❌ Phase 2 | Autonomous fund management with AI strategies | [docs/hedgefund.md](docs/hedgefund.md) |
| **Ecosystem Fund** | ❌ Phase 2 | Grants, incubation, capital allocation | [docs/ecosystem-fund.md](docs/ecosystem-fund.md) |
| **AI Credit** | ❌ Phase 2 | Lending, underwriting, CoinRabbit integration | [docs/ai-credit.md](docs/ai-credit.md) |
| **No-Code Builder** | ❌ Phase 2 | Visual strategy construction without coding | [docs/no-code.md](docs/no-code.md) |
| **Mobile UX** | ❌ Phase 2 | Telegram-native mobile-first experience | [docs/mobile-ux.md](docs/mobile-ux.md) |
| **Omnichain** | ❌ Phase 3 | Cross-chain operations via ChangeNOW integration | [docs/omnichain.md](docs/omnichain.md) |
| **Protocol** | ❌ Phase 3 | Open Agent Protocol (OAP) specification | [docs/protocol.md](docs/protocol.md) |
| **Plugins** | ✅ Phase 3 | Extensible tool and integration system, sandboxed execution, permission model, marketplace framework | [Agent Plugin System](#agent-plugin-system) |
| **Data Platform** | ❌ Phase 3 | Market data, signals, oracles, analytics | [docs/data-platform.md](docs/data-platform.md) |
| **Launchpad** | ❌ Phase 3 | Agent creation, funding, treasury management | [docs/launchpad.md](docs/launchpad.md) |
| **AI Safety** | ❌ Phase 3 | Alignment, guardrails, anomaly detection | [docs/ai-safety.md](docs/ai-safety.md) |
| **Super App** | ❌ Phase 3 | Wallet, agents, social layer, Telegram integration | [docs/superapp.md](docs/superapp.md) |
| **Regulatory** | ❌ Phase 3 | Global compliance and jurisdictional framework | [docs/regulatory-strategy.md](docs/regulatory-strategy.md) |
| **Token Strategy** | ❌ Phase 3 | Launch, liquidity flywheel, valuation modeling | [docs/token-strategy.md](docs/token-strategy.md) |
| **Growth** | ❌ Phase 4 | Viral mechanics, gamification, referrals | [docs/growth.md](docs/growth.md) |
| **Personal Finance** | ❌ Phase 4 | AI-native wealth management and financial literacy | [docs/personal-finance.md](docs/personal-finance.md) |
| **Institutional Network** | ❌ Phase 4 | Funds, banks, custodians, liquidity providers | [docs/institutional-network.md](docs/institutional-network.md) |
| **GAAMP** | ❌ Phase 3 | Global Autonomous Asset Management Protocol — open protocol standard | [docs/gaamp.md](docs/gaamp.md) |
| **Liquidity Network** | ❌ Phase 4 | Aggregated pools, smart routing, vaults, internal liquidity | [docs/liquidity-network.md](docs/liquidity-network.md) |
| **Clearing House** | ❌ Phase 4 | AI-native CCP: netting, settlement, default resolution | (src/clearing-house) |
| **Systemic Risk & Stability** | ❌ Phase 4 | Protocol-wide risk containment, circuit breakers, insurance fund, GAAMP Stability Index | (src/systemic-risk) |
| **Inter-Protocol Liquidity Standard (IPLS)** | ❌ Phase 4 | Cross-protocol liquidity routing, risk-aware capital allocation, clearing, and institutional interoperability | (src/ipls) |
| **ACMS** | ❌ Phase 4 | Autonomous Capital Markets Stack — 9-layer unified infrastructure | [docs/acms.md](docs/acms.md) |
| **Protocol Constitution** | ❌ Phase 4 | Governance charter, AI authority spec, risk hard limits, emergency framework | (src/protocol-constitution) |
| **GRIF** | ❌ Phase 4 | Global Regulatory Integration Framework — jurisdiction-aware deployment, compliance modules, transparency portal, audit & attestation | [docs/grif.md](docs/grif.md) |

---

## Institutional Infrastructure Layer

> Built on The Open Network for institutional-grade autonomous finance

The platform provides a comprehensive institutional infrastructure stack integrating Prime Brokerage, a decentralized Liquidity Network, Risk Engine, RWA tokenization, Clearing capabilities, and a Systemic Risk & Stability Framework.

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
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                   Systemic Risk & Stability Framework                   │  │
│  │  Leverage Governor | Circuit Breakers | Insurance Fund | Stability Index│  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  Architecture:                                                                │
│  Agents/Funds → Prime Brokerage → Clearing House → Systemic Risk Engine → Finality│
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

### Clearing House (`src/clearing-house`)

AI-native Central Counterparty Clearing (CCP) for autonomous AI funds:

| Component | Description |
|-----------|-------------|
| **Central Clearing Layer** | Trade registration, obligation matching, settlement tracking, default management. Acts as a CCP guaranteeing settlement between AI participants. |
| **AI Risk Netting Engine** | Aggregates exposures, calculates net obligations via bilateral/multilateral/cross-asset netting, detects concentration risk. Frees capital through compression. |
| **Collateral Management** | Initial/maintenance margin, dynamic volatility-adjusted margin models, real-time liquidation prevention, automated collateral rebalancing. |
| **Default Resolution** | Automatic liquidation pipeline, insurance pool activation, default fund draw-down, socialized loss mechanism for risk containment. |
| **Real-Time Settlement** | Near-instant settlement via DvP, atomic multi-leg settlement, cross-chain bridge settlement orchestration, RWA legal settlement mapping. |
| **Audit & Transparency** | Immutable audit logs with cryptographic signatures, exposure dashboards, systemic risk snapshots, compliance-ready institutional reports. |

### Systemic Risk & Stability (`src/systemic-risk`)

Protocol-wide risk containment and stability controls:

| Component | Description |
|-----------|-------------|
| **Global Exposure Monitoring** | Real-time cross-fund/agent/asset tracking, heat maps, concentration alerts, risk clustering detection |
| **Dynamic Leverage Governor** | Volatility-adjusted limits, market-stress-triggered reductions (crisis: 2x, bear: 5x, neutral: 8x, bull: 10x) |
| **Circuit Breaker System** | 6 rules: extreme volatility, liquidity evaporation, oracle failure, large liquidation wave, cascade risk, insurance depleted |
| **Insurance & Stability Fund** | Tiered tranche pool (junior→mezzanine→senior), claim lifecycle, emergency liquidity backstop |
| **AI Stress Testing Engine** | 5 built-in scenarios: 2008 crisis, exchange failure, stablecoin depeg, RWA illiquidity, black swan correlation |
| **GAAMP Stability Index** | Public 0–100 score with AAA–D grade, 5 weighted components, trend tracking |

---

## Inter-Protocol Liquidity Standard (IPLS)

IPLS v1 is a standardized cross-protocol liquidity and interoperability framework that enables any compliant protocol on The Open Network to act as a `LiquidityProvider` or `LiquidityConsumer` with institutional-grade trust guarantees.

### Architecture

```
GAAMP → Liquidity Network → IPLS Layer → External Protocols → Cross-chain Liquidity
```

### Components

| Component | Description |
|-----------|-------------|
| **LiquidityStandard** | IPLS v1 provider/consumer interfaces — deposit, withdraw, quote, route, reportExposure, requestLiquidity, returnLiquidity, reportRisk |
| **CrossProtocolRisk** | External protocol exposure assessment, liquidity depth analysis, volatility scoring, smart contract risk, AI-driven capital allocation |
| **LiquidityPassport** | On-chain capital origin verification, risk scoring, compliance status, jurisdictional flags, credit history, endorsements |
| **AdapterLayer** | Cross-chain vault management, bridge abstraction, gas-aware routing, circuit-breaker failover |
| **ProtocolAPI** | Capital request standards, reporting format, risk disclosure, governance hooks |

### Quick Start

```typescript
import { createIPLSManager } from '@tonaiagent/core/ipls';

const ipls = createIPLSManager({
  version: '1.0.0',
  crossChainEnabled: true,
  aiRiskEnabled: true,
  governanceEnabled: true,
});

// Register a liquidity provider
const provider = await ipls.liquidity.registerProvider({
  name: 'TON AMM Pool',
  type: 'dex',
  chainIds: ['ton'],
  supportedAssets: ['ton', 'usdt', 'usdc'],
});
await ipls.liquidity.updateProviderStatus(provider.id, 'active');
await ipls.liquidity.deposit(provider.id, 'usdt', '1000000', 'ton');

// Issue a Liquidity Passport
const passport = await ipls.passport.issuePassport({
  holderId: provider.id,
  holderName: provider.name,
  capitalOrigin: { primaryChain: 'ton', capitalType: 'native' },
  compliance: { status: 'compliant', kycLevel: 'institutional' },
});

// Assess cross-protocol risk with AI insights
const assessment = await ipls.risk.assessProtocol({
  protocolId: provider.id,
  protocolName: provider.name,
  includeAIInsights: true,
});
console.log(`Risk Tier: ${assessment.riskTier}, Score: ${assessment.overallScore}`);

// Register a cross-chain adapter
const adapter = await ipls.adapter.registerAdapter({
  name: 'TON↔ETH Bridge',
  bridgeType: 'lock_mint',
  supportedChains: ['ton', 'ethereum'],
  supportedAssets: ['usdt', 'usdc'],
  config: {},
});
await ipls.adapter.setAdapterStatus(adapter.id, 'active');

// Request liquidity (consumer side)
const consumer = await ipls.liquidity.registerConsumer({
  name: 'Derivatives Protocol',
  type: 'derivatives',
  requestedChains: ['ton'],
  preferredAssets: ['usdt'],
});
await ipls.liquidity.updateConsumerStatus(consumer.id, 'active');

const response = await ipls.liquidity.requestLiquidity(consumer.id, {
  id: 'req_001',
  consumerId: consumer.id,
  asset: 'usdt',
  amount: '50000',
  targetChain: 'ton',
  urgency: 'standard',
  strategy: 'ai_optimized',
  maxFeeBps: 50,
  deadline: new Date(Date.now() + 3600000),
  createdAt: new Date(),
});
console.log(`Liquidity ${response.approved ? 'approved' : 'rejected'}: ${response.allocatedAmount}`);

// Submit a governance proposal
const proposal = await ipls.api.proposeGovernanceAction({
  action: 'fee_adjustment',
  targetModule: 'liquidity_standard',
  proposedBy: provider.id,
  parameters: { newFeesBps: 8 },
  rationale: 'Reduce fees to improve capital efficiency',
  quorumRequired: 50,
  votingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

console.log('IPLS Health:', ipls.getHealth());
```

### Key IPLS Features

- **Standardized Interfaces**: `LiquidityProvider` and `LiquidityConsumer` follow IPLS v1 spec with defined deposit/withdraw/quote/route/expose methods
- **Cross-Protocol Risk Scoring**: Multi-dimensional risk assessment covering smart contract safety, liquidity depth, volatility, concentration, and operational risk
- **AI-Driven Allocation**: ML-based capital allocation recommendations with scenario analysis and contagion risk modeling
- **Liquidity Passport**: On-chain verifiable protocol identity with capital origin proof, credit history, compliance status, and peer endorsements
- **Adapter Abstraction**: Unified bridge API supporting lock-mint, burn-mint, atomic swap, optimistic, and ZK-proof bridge types
- **Gas-Aware Routing**: Dynamic gas price estimation with configurable buffers, chain-specific limits, and failover adapter support
- **Clearing Compatibility**: Bilateral and multilateral netting, portable collateral, configurable haircuts, and settlement finality guarantees
- **Governance Hooks**: On-chain parameter governance with quorum voting, proposal lifecycle, and execution via multi-sig

---

## Autonomous Capital Markets Stack (ACMS)

TONAIAgent implements the **Autonomous Capital Markets Stack** — a vertically integrated, AI-native capital markets infrastructure that replaces the fragmented traditional financial system with a unified, programmable, AI-coordinated protocol on TON.

### Institutional Comparison

| ACMS Layer | Replaces |
|---|---|
| Asset Layer (L1) + Agent/Fund Layer (L2) | BlackRock / Global Asset Managers |
| Liquidity Layer (L3) | NASDAQ / Institutional Liquidity Venues |
| Prime Brokerage Layer (L4) | Goldman Sachs / Prime Brokers |
| Clearing & Settlement Layer (L5) | DTCC / Central Counterparties (CCPs) |
| Risk & Stability Layer (L6) | Basel Committee / Prudential Regulators |
| Monetary & Treasury Layer (L7) | Federal Reserve / Central Banks |
| Inter-Protocol Layer (L8) | SWIFT / BIS Cross-border Infrastructure |
| Governance Layer (L9) | SEC / CFTC / Protocol DAO |

### Stack Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 9: Governance         — DAO governance, parameter tuning      │
│  Layer 8: Inter-Protocol     — IPLS, cross-chain routing, passports  │
│  Layer 7: Monetary/Treasury  — Emission control, treasury allocation  │
│  Layer 6: Risk & Stability   — Circuit breakers, Stability Index      │
│  Layer 5: Clearing/Settlement— AI netting, collateral, default rescue │
│  Layer 4: Prime Brokerage    — Margin, leverage, capital efficiency   │
│  Layer 3: Liquidity          — Smart routing, cross-chain liquidity   │
│  Layer 2: Agent & Fund       — AI hedge funds, strategy agents        │
│  Layer 1: Asset              — Crypto, RWA tokenization, funds        │
└──────────────────────────────────────────────────────────────────────┘
```

### Quick Start

```typescript
import { createACMSManager } from '@tonaiagent/core/acms';

const acms = createACMSManager({ networkId: 'ton-mainnet', environment: 'mainnet' });

// Layer 1: Issue a tokenized fund
const fund = acms.assetLayer.createTokenizedFund({ ... });

// Layer 2: Deploy AI agents
const agent = acms.agentFundLayer.deployAgent({ type: 'arbitrage_agent', ... });

// Layer 3: Route a large order
const route = acms.liquidityLayer.routeOrder({ orderType: 'twap', amountIn: 1_000_000, ... });

// Layer 6: Monitor stability
const stability = acms.riskStabilityLayer.computeStabilityIndex({ liquidityScore: 85, ... });
console.log('Stability Index:', stability.score, stability.riskLevel);

// Full stack status
const status = acms.getStackStatus();
```

See [docs/acms.md](docs/acms.md) for full documentation.

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

## Telegram SuperApp

The TONAIAgent Telegram SuperApp provides a complete mobile-first investment platform directly within Telegram. It combines a bot interface, Mini App UI, real-time notifications, and seamless wallet integration.

### Architecture

```
Telegram Bot → Telegram Mini App → Platform API → Agent Runtime → Trading Infrastructure
```

### Bot Commands

| Command | Description | Auth Required |
|---------|-------------|--------------|
| `/start` | Initialize account & welcome message | No |
| `/portfolio` | View your investment portfolio | Yes |
| `/strategies` | Browse strategy marketplace | Yes |
| `/create_fund` | Create a new investment fund | Yes |
| `/analytics` | View portfolio analytics & risk | Yes |

### Quick Start

```typescript
import { createTelegramSuperAppManager } from '@tonaiagent/core/superapp';

const superApp = createTelegramSuperAppManager({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  miniAppUrl: 'https://t.me/TONAIAgentBot/app',
  maxFundsPerUser: 10,
  minFundCapital: 10,
  riskAlertThresholds: {
    drawdown: 15,      // Alert when drawdown exceeds 15%
    volatility: 30,    // Alert when volatility exceeds 30%
    concentration: 50, // Alert when concentration exceeds 50%
  },
});

// Handle /start command — onboards new users, welcomes returning users
const result = await superApp.handleStart(telegramUserId, startParam);
await bot.sendMessage(chatId, result.message, { reply_markup: result.keyboard });
```

### User Onboarding

```typescript
// Onboard or retrieve existing user
const user = await superApp.onboardUser({
  telegramId: 123456789,
  username: 'alice_trader',
  firstName: 'Alice',
  isPremium: true,
  languageCode: 'en',
});

// Link TON wallet
const wallet = await superApp.linkWallet({
  userId: user.userId,
  telegramId: user.telegramId,
  walletAddress: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
  walletType: 'ton_connect',
  tonBalance: 150.5,
  usdtBalance: 1000,
});
```

### Strategy Marketplace

```typescript
// Browse strategies (filtered by risk level)
const strategies = await superApp.getStrategies({
  riskLevel: 'moderate',
  limit: 10,
});

// Get AI-powered personalized recommendations
const recommended = await superApp.getRecommendedStrategies(user.userId);

// Create an investment fund
const fund = await superApp.createFund({
  userId: user.userId,
  name: 'My DeFi Fund',
  strategyId: 'strategy_defi_yield',
  capitalAllocated: 500,
  currency: 'USDT',
});
```

### Fund Management (Agent Interaction Commands)

```typescript
// Pause a running strategy
await superApp.handlePauseStrategy(userId, fundId, 'Taking profits');

// Resume a paused strategy
await superApp.handleStartStrategy(userId, fundId);

// Adjust capital allocation
await superApp.handleAdjustAllocation(userId, fundId, 750);

// Get performance summary
const summary = await superApp.handlePerformanceSummary(userId, fundId);
```

### Portfolio Analytics

```typescript
// Full portfolio analytics
const analytics = await superApp.getPortfolioAnalytics(userId);
console.log(`Total Value: $${analytics.totalValue}`);
console.log(`P&L: ${analytics.totalPnlPercent.toFixed(2)}%`);
console.log(`Risk Score: ${analytics.riskScore}/100`);

// Performance summary for specific period
const summary = await superApp.getPerformanceSummary(userId, '30d');
```

### Real-Time Notifications & Risk Monitoring

```typescript
// Monitor portfolio risk
const riskMonitor = await superApp.getRiskMonitor(userId);
if (riskMonitor.overallRiskLevel === 'extreme') {
  // Send critical alert
  const alerts = await superApp.getRiskAlerts(userId);
  for (const alert of alerts) {
    await bot.sendMessage(chatId, `⚠️ ${alert.title}\n${alert.message}`);
  }
}

// Trigger portfolio rebalancing
const rebalanceEvent = await superApp.triggerRebalance(userId, fundId, 'drift');
await bot.sendMessage(chatId,
  `🔄 Rebalancing ${rebalanceEvent.fundName}...\nEst. cost: $${rebalanceEvent.estimatedCost.toFixed(2)}`
);

// Subscribe to all platform events
superApp.onEvent((event) => {
  if (event.type === 'superapp_fund_created') {
    console.log(`New fund created: ${JSON.stringify(event.data)}`);
  }
  if (event.type === 'superapp_rebalance_triggered') {
    console.log(`Rebalance triggered: ${JSON.stringify(event.data)}`);
  }
});
```

### Supported Strategy Categories

| Category | Description | Risk |
|----------|-------------|------|
| `dca` | Dollar-Cost Averaging | Conservative |
| `yield` | DeFi Yield Farming | Moderate |
| `trading` | AI-Powered Momentum | Aggressive |
| `arbitrage` | Cross-exchange Arb | Moderate |
| `index` | Ecosystem Index | Moderate |

### Wallet Integration

TONAIAgent SuperApp supports three wallet types for maximum flexibility:

| Wallet Type | Description | Security |
|------------|-------------|----------|
| `ton_connect` | External TON wallet via TON Connect | User-controlled |
| `mpc` | Multi-Party Computation wallet | Highest security |
| `smart_contract` | On-chain smart contract wallet | Programmable |

### Mobile-First UX

The Mini App is optimized for mobile with:
- **Inline keyboards** for quick navigation and actions
- **Deep linking** to specific views (`/portfolio`, `/fund/:id`, `/strategies`)
- **Contextual menus** based on user state (no wallet, empty portfolio, active funds)
- **Rich notifications** with action buttons (view agent, approve, dismiss)
- **Dark/light theme** following Telegram's native color scheme

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

## AI Monetary Policy & Treasury Layer

The AI Monetary Policy & Treasury Layer is a programmable central bank for the TON AI Agent ecosystem. Inspired conceptually by the Federal Reserve, ECB, and IMF — but transparent, algorithmic, AI-managed, and DAO-governed.

### How Emissions Are Controlled

The **Adaptive Emission Controller** replaces fixed tokenomics with a phase-based adaptive model:

```
Market Conditions
       ↓
AI Monetary Engine (Stability Index + Liquidity + Volatility + Growth)
       ↓
Emission Phase Decision:
  • Growth Phase  → Inflation: boost emissions to incentivize participation
  • Stress Phase  → Deflation: reduce emissions to stabilize token price
  • Profit Phase  → Burn: destroy tokens to increase long-term value
  • Gap Phase     → Incentive Boost: attract liquidity providers
  • Stable Phase  → Maintain: keep current emission rate
       ↓
Adaptive Emission Controller (clamped to min/max bounds)
```

### How Reserves Are Managed

The **Protocol Treasury Vault** maintains five reserve categories:

| Reserve | Target Allocation | Purpose |
|---------|------------------|---------|
| Liquidity Buffer | 30% | Short-term liquidity for withdrawals and operations |
| Insurance Fund | 20% | Backstop against unexpected losses |
| Strategic Capital | 20% | Long-term strategic investments and co-investments |
| Stabilization Fund | 15% | Ecosystem stability interventions |
| Protocol Reserves | 15% | Core protocol operations and upgrades |

Revenue flows from performance fees, marketplace fees, RWA yield, prime brokerage revenue, and token issuance.

The **Treasury Capital Allocator** deploys reserves with a three-tier approval system:
- **AI Auto-deploy** (≤5% of treasury): For low-urgency, small deployments
- **Multi-sig** (5–10%): Requires multiple authorized signers
- **DAO Vote** (>10%): Full governance vote required

### How Stability Is Enforced

The **Stability-Linked Incentive System** ties rewards to protocol health:

```
Stability Score + Liquidity Depth + Risk Exposure + Agent Performance
                              ↓
                    Incentive Multiplier (0.5x – 2.0x)
                              ↓
              Base Yield × Multiplier + Tier Yield Boost
```

Reward tiers encourage conservative, long-term, capital-disciplined behavior:
- **Conservative** (≤5% drawdown, 90+ day hold) → +3% yield boost
- **Balanced** (≤15% drawdown, 30+ day hold) → +1.5% yield boost
- **Growth** (≤25% drawdown, 7+ day hold) → +0.5% yield boost
- **Aggressive** → Base yield only

### Why the Token Model Is Sustainable

The adaptive emission model ensures long-term sustainability through:

1. **Demand-driven supply**: Emissions increase when protocol growth demands more participation incentives and decrease when markets are stressed
2. **Revenue-backed reserves**: Treasury grows from protocol revenue, not token inflation
3. **Deflationary mechanisms**: Burns reduce supply during high profitability, creating long-term value accrual
4. **AI-optimized allocation**: Treasury capital is continuously redeployed to maximize yield and minimize risk
5. **DAO governance**: Token holders vote on major monetary policy changes, ensuring community alignment

### Monetary Governance Flow

```
AI Analysis (Monetary Policy Engine)
            ↓
  Monetary Proposal (type, recommendation, rationale)
            ↓
        DAO Vote (7-day voting period, 51% threshold)
            ↓
  Execution Smart Contract (2-day timelock)
            ↓
  Protocol-wide Economic Impact
```

Emergency overrides (emission pause, treasury freeze, yield cap) are available for critical situations that cannot wait for the standard governance cycle.

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

## Global Autonomous Asset Management Protocol (GAAMP)

> Transforming the platform from an AI agent product into **infrastructure for autonomous global asset management**.

GAAMP is an open, standardized, protocol-level infrastructure built on The Open Network (TON) and designed for global cross-chain expansion. It enables creation of AI-managed funds, on-chain clearing & settlement, cross-chain capital orchestration, institutional-grade compliance, and DAO-governed capital systems.

### Vision

Comparable to the world's largest financial infrastructure — but autonomous, AI-native, programmable, and decentralized:

| Institution | Scale | GAAMP Equivalent |
|-------------|-------|------------------|
| **BlackRock** | Asset management at scale | AI-native AUM at global scale |
| **DTCC** | Clearing backbone | On-chain AI netting & settlement |
| **Vanguard** | Systemic capital management | Programmable autonomous fund management |

### Architecture

```
Users / Institutions
        ↓
  AI Funds  ←────────── Agent Layer (allocate/rebalance/hedge/report/shutdown)
        ↓
  Prime Brokerage  ←─── Prime & Liquidity Layer (aggregation + smart routing)
        ↓
  Liquidity Network
        ↓
  Clearing House  ←──── Clearing & Settlement Layer (AI netting + finality)
        ↓
  Settlement Layer
        ↓
  Protocol Governance ← Governance Layer (DAO parameter tuning + upgrades)
        ↑
  Compliance Layer  ←── Compliance & Identity Layer (KYC/AML + audit)
```

### Protocol Layers

| Layer | Module | Description |
|-------|--------|-------------|
| **1. Agent Layer** | `src/gaamp/agent-layer.ts` | Standardized AI agent interface v1: allocate, rebalance, hedge, report, shutdown |
| **2. Fund Layer** | `src/gaamp/fund-layer.ts` | Tokenized funds, DAO funds, institutional vehicles — NAV + performance tracking |
| **3. Prime & Liquidity** | `src/gaamp/prime-liquidity-layer.ts` | AI-optimized routing, liquidity aggregation, internal netting |
| **4. Clearing & Settlement** | `src/gaamp/clearing-settlement-layer.ts` | AI netting engine, margin management, default resolution, settlement finality |
| **5. Governance** | `src/gaamp/governance-layer.ts` | DAO voting, protocol parameters, insurance pools, upgrade mechanisms |
| **6. Compliance & Identity** | `src/gaamp/compliance-identity-layer.ts` | KYC/AML, jurisdiction-aware access, audit trail, compliance reporting |

### Quick Start

```typescript
import { createGAAMPProtocol } from '@tonaiagent/core/gaamp';

const protocol = createGAAMPProtocol({ chainId: 'ton' });

// Register participant
const participant = protocol.compliance.registerParticipant({
  name: 'Alpha Capital',
  type: 'institution',
  institutionalType: 'hedge_fund',
  primaryJurisdiction: 'US',
});
protocol.compliance.approveKYC(participant.id, 'institutional');

// Create AI fund
const fund = protocol.fundLayer.createFund({
  name: 'TON Alpha AI Fund',
  type: 'hedge',
  fundClass: 'institutional',
  chain: 'ton',
  initialCapital: 10_000_000,
});

// Deploy trading agent
const agent = protocol.agentLayer.registerAgent({
  name: 'Alpha Bot',
  type: 'trading',
  fundId: fund.id,
});
protocol.agentLayer.activateAgent(agent.id);

// System status
const status = protocol.getSystemStatus();
console.log('GAAMP v1:', status);
```

For full documentation, see [docs/gaamp.md](docs/gaamp.md).

---

## Sovereign-Grade Institutional Alignment (SGIA)

> Formalizing the protocol as **sovereign-grade infrastructure** accessible to central banks, sovereign wealth funds, national regulators, institutional custodians, and Tier-1 financial institutions.

SGIA is a comprehensive compliance, custody, and governance framework that enables the world's most sophisticated institutional participants to interact with the protocol in a structured, auditable, and jurisdictionally-compliant manner.

### Institutional Coverage

| Institution Type | Examples | SGIA Mode |
|-----------------|----------|-----------|
| **Sovereign Wealth Funds** | NBIM, GIC, ADIA, Temasek | Strategic Partner / Allocator |
| **Central Banks** | Fed, ECB, PBoC, BoE | Regulatory Node / Observer |
| **National Regulators** | SEC, FCA, BaFin, MAS | Regulatory Node / Observer |
| **Tier-1 Banks** | JPMorgan, Goldman, HSBC | Allocator / Custodian Partner |
| **Institutional Custodians** | BNY Mellon, State Street, Clearstream | Custodian Partner |

### Six Alignment Domains

```
┌─────────────────────────────────────────────────────────────────────────────┐
│          SGIA - Sovereign-Grade Institutional Alignment Framework            │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Sovereign Integration     │  Tokenized vaults, permissioned fund classes │
│  2. Regulatory Compatibility  │  KYC/AML plug-ins, jurisdiction-aware deploy │
│  3. Custody Alignment         │  Multi-sig vaults, custodian API compat.     │
│  4. Transparency & Audit      │  On-chain dashboards, real-time reporting    │
│  5. Capital Adequacy          │  Reserve requirements, liquidity buffers     │
│  6. Sovereign Participation   │  Observer / Allocator / Strategic Partner    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module Architecture

| Domain | Module | Description |
|--------|--------|-------------|
| **1. Sovereign Integration** | `src/sgia/sovereign-integration.ts` | Tokenized institutional vaults, permissioned fund classes, multi-sig |
| **2. Regulatory Compatibility** | `src/sgia/regulatory-compatibility.ts` | KYC/AML plug-in modules, jurisdiction deployment profiles |
| **3. Custody Alignment** | `src/sgia/custody-alignment.ts` | Custodian registration, multi-sig vault configs, proof of reserve |
| **4. Transparency & Audit** | `src/sgia/transparency-audit.ts` | On-chain audit records, real-time dashboards, compliance scoring |
| **5. Capital Adequacy** | `src/sgia/capital-adequacy.ts` | Basel III modeling, reserve requirements, liquidity stress tests |
| **6. Sovereign Participation** | `src/sgia/sovereign-participation.ts` | Observer / Allocator / Strategic Partner participation modes |

### Participation Modes

| Mode | Privileges | Governance Weight | Target Participants |
|------|-----------|------------------|---------------------|
| **Observer** | Read-only, public reports | None | Regulators, auditors |
| **Allocator** | Allocate capital, fund access | 5 | Pension funds, family offices |
| **Strategic Partner** | Full access, governance proposals | 20 | Sovereign wealth funds, Tier-1 banks |
| **Regulatory Node** | Compliance data, veto rights | 10 | Central banks, national regulators |
| **Custodian Partner** | Vault management, transfers | 3 | Institutional custodians |

### Quick Start

```typescript
import { createSGIAManager } from '@tonaiagent/core/sgia';

const sgia = createSGIAManager();

// Register KYC/AML module for a jurisdiction
const kycModule = sgia.regulatoryCompatibility.registerKycModule({
  name: 'EU Sovereign KYC Module',
  jurisdiction: 'EU',
  kycTier: 'sovereign_grade',
  supportedEntityTypes: ['central_bank', 'sovereign_wealth_fund'],
});

// Create a permissioned fund class
const fundClass = sgia.sovereignIntegration.createFundClass({
  name: 'Sovereign Reserved Class A',
  fundClass: 'sovereign_reserved',
  description: 'Reserved for sovereign wealth funds and central banks',
  minimumInvestmentUSD: 100_000_000,
  lockupPeriodDays: 90,
  redemptionNoticeDays: 30,
  allowedJurisdictions: ['US', 'EU', 'GB', 'NO', 'SG'],
  eligibilityCriteria: {
    requiredEntityTypes: ['sovereign_wealth_fund', 'central_bank'],
    requiredKycTier: 'sovereign_grade',
    requiresSovereignClassification: true,
    minimumAUMUSD: 10_000_000_000,
  },
});

// Create sovereign vault
const vault = sgia.sovereignIntegration.createVault({
  name: 'NBIM Digital Reserve Vault',
  vaultType: 'sovereign_vault',
  fundClass: 'sovereign_reserved',
  ownerEntityId: 'nbim-001',
  jurisdictions: ['NO', 'EU'],
  minimumSignatures: 3,
});

// Register institutional custodian
const custodian = sgia.custodyAlignment.registerCustodian({
  name: 'BNY Mellon Digital',
  custodianType: 'traditional',
  jurisdiction: 'US',
  regulatoryLicenses: ['OCC_TRUST_CHARTER', 'NYDFS_BITLICENSE'],
  supportedAssets: ['BTC', 'ETH', 'USDC', 'TON'],
  supportedChains: ['bitcoin', 'ethereum', 'ton'],
  segregationModel: 'full_segregation',
  insuranceCoverageUSD: 500_000_000,
});

// Configure Basel III capital adequacy model
const capitalModel = sgia.capitalAdequacy.createCapitalModel({
  entityId: 'nbim-001',
  entityName: 'Norges Bank Investment Management',
  modelType: 'sovereign_grade',
  totalCapitalUSD: 1_400_000_000_000,
  tier1CapitalUSD: 1_200_000_000_000,
  tier2CapitalUSD: 200_000_000_000,
  riskWeightedAssetsUSD: 5_000_000_000_000,
  liquidityCoverageRatio: 250,
  netStableFundingRatio: 200,
});

// Register as Strategic Partner
const participant = sgia.sovereignParticipation.registerParticipant({
  entityId: 'nbim-001',
  entityName: 'Norges Bank Investment Management',
  entityType: 'sovereign_wealth_fund',
  participationMode: 'strategic_partner',
});

// Get system status
const status = sgia.getSystemStatus();
console.log('SGIA Status:', status);
// {
//   activeVaults: 1,
//   activeKycModules: 1,
//   activeParticipants: 1,
//   strategicPartnerCount: 1,
//   totalCapitalModels: 1,
//   ...
// }
```

---

## Autonomous Global Financial Network (AGFN)

> Transforming infrastructure into a **globally connected autonomous financial network**.

The Autonomous Global Financial Network (AGFN) extends AGFI capabilities into a distributed, AI-coordinated network that connects multiple jurisdictions, integrates sovereign and institutional nodes, routes global liquidity, and executes AI-managed capital flows 24/7.

### Vision

Comparable in systemic role to the world's largest financial networks — but AI-managed, on-chain native, and governance-bounded:

| Traditional System | AGFN Equivalent | Key Capability |
|---|---|---|
| **SWIFT** | Global Node Architecture + Settlement Mesh | Cross-jurisdiction capital routing |
| **CLS Group** | Global Settlement Mesh | Multi-region FX settlement |
| **Visa Inc** | Cross-Jurisdiction Routing | Real-time transaction routing |
| **BIS** | AI Coordination Layer | Global systemic risk coordination |

### Network Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              AGFN - Autonomous Global Financial Network                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Global Node Architecture    │  Sovereign, institutional, custodian      │
│  2. Cross-Jurisdiction Routing  │  Compliance-aware, liquidity passport     │
│  3. Global Settlement Mesh      │  Multi-region, atomic transfers           │
│  4. AI Coordination Layer       │  Liquidity balance, risk clusters         │
│  5. Multi-Reserve Treasury      │  Regional pools, multi-asset vaults       │
│  6. Global Stability Dashboard  │  Exposure, liquidity, stability index     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Network Components

| Component | Module | Description |
|-----------|--------|-------------|
| **1. Global Node Architecture** | `src/agfn/global-node-architecture.ts` | Sovereign, institutional, custodian, liquidity, clearing, and AI computation nodes with defined permissions and capital exposure limits |
| **2. Cross-Jurisdiction Routing** | `src/agfn/cross-jurisdiction-routing.ts` | Compliance-aware capital routing, liquidity passport validation, jurisdiction-aware execution |
| **3. Global Settlement Mesh** | `src/agfn/global-settlement-mesh.ts` | Multi-region settlement, cross-chain finality, atomic cross-jurisdiction transfers, time-zone independent settlement |
| **4. AI Coordination Layer** | `src/agfn/ai-coordination-layer.ts` | Global liquidity balancing, risk cluster detection, autonomous capital reallocation, crisis mitigation coordination |
| **5. Multi-Reserve Treasury** | `src/agfn/multi-reserve-treasury.ts` | Regional reserve pools, multi-asset treasury vaults, cross-chain reserve management, stability buffers |
| **6. Global Stability Dashboard** | `src/agfn/global-stability-dashboard.ts` | Public-facing metrics: global exposure, regional capital allocation, liquidity depth, leverage levels, stability index |

### Quick Start

```typescript
import { createAGFNManager } from '@tonaiagent/core/agfn';

// Initialize AGFN
const agfn = createAGFNManager();

// Register a sovereign node
const ecbNode = agfn.nodeArchitecture.registerNode({
  name: 'ECB Primary Node',
  type: 'sovereign',
  jurisdiction: 'EU',
  chain: 'ethereum',
  operatorId: 'ecb_001',
  capacityUSD: 500_000_000_000, // $500B
  complianceLevel: 'sovereign',
});

// Register an institutional node
const jpMorganNode = agfn.nodeArchitecture.registerNode({
  name: 'JPMorgan Custody Node',
  type: 'institutional',
  jurisdiction: 'US',
  chain: 'ton',
  operatorId: 'jpm_001',
  capacityUSD: 100_000_000_000, // $100B
  complianceLevel: 'enhanced',
});

// Compute cross-jurisdiction capital route
const route = agfn.capitalRouting.computeRoute({
  sourceNodeId: ecbNode.id,
  destinationNodeId: jpMorganNode.id,
  amount: 1_000_000_000, // $1B
  currency: 'USD',
  strategy: 'compliance_first',
});

// Execute settlement
const settlement = agfn.settlementMesh.initiateSettlement({
  routeId: route.id,
  settlementType: 'atomic',
  sourceNodeId: route.sourceNodeId,
  destinationNodeId: route.destinationNodeId,
  amount: route.finalAmount,
  currency: route.currency,
});

// Monitor global stability
const status = agfn.getSystemStatus();
console.log('AGFN Network Status:', {
  activeNodes: status.activeNodes,
  sovereignNodes: status.sovereignNodes,
  institutionalNodes: status.institutionalNodes,
  activeRiskClusters: status.activeRiskClusters,
  stabilityIndex: status.stabilityIndex,
  stabilityIndicator: status.stabilityIndicator,
});
```

### Node Types

| Node Type | Description | Typical Operators |
|-----------|-------------|-------------------|
| **Sovereign** | Central bank and government-backed nodes | ECB, Fed, BoJ, PBoC |
| **Institutional** | Large financial institution nodes | JPMorgan, Goldman, BlackRock |
| **Custodian** | Qualified custodian nodes | State Street, BNY Mellon |
| **Liquidity** | Market maker and liquidity provider nodes | Citadel, Jump, Jane Street |
| **Clearing** | Central counterparty clearing nodes | DTCC, LCH, CME |
| **AI Computation** | AI model inference and coordination nodes | AGFN AI Infrastructure |

### Key Capabilities

- **Cross-Border Capital Flows**: Compliance-aware routing across 190+ jurisdictions
- **AI-Managed Liquidity**: Real-time global liquidity balancing and optimization
- **Risk Cluster Detection**: Proactive identification of concentration, correlation, and contagion risks
- **Atomic Multi-Region Settlement**: Time-zone independent cross-chain settlement
- **Crisis Mitigation**: Autonomous crisis detection and coordinated response
- **Multi-Reserve Treasury**: Regional reserve pools with stability buffers
- **Public Transparency**: Real-time stability dashboard with institutional visibility

For full documentation, see [docs/agfn.md](docs/agfn.md).


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
- [x] GAAMP v1 — Global Autonomous Asset Management Protocol (6-layer stack)
- [x] Agent Plugin System (Issue #161) — Plugin Architecture, Runtime Integration, Manifest Standard, Sandbox Execution, Permission Model, Marketplace Framework
- [ ] Launchpad
- [ ] Super App layer
- [ ] Regulatory compliance engine

### Phase 4: Ecosystem (2027+)

- [ ] Institutional Network
- [ ] Personal Finance AI
- [ ] Growth and referral engine
- [ ] Decentralized AI training
- [ ] Agent-to-agent economy
- [x] Systemic Risk & Stability Framework (Issue #122) — Global Exposure Monitor, Dynamic Leverage Governor, Circuit Breaker, Insurance Fund, AI Stress Testing, GAAMP Stability Index
- [x] Global Regulatory Integration Framework (Issue #139) — Jurisdiction-Aware Deployment, Regulatory Mapping Matrix, Compliance Module Interface, Transparency Portal, Audit & Attestation, Regulatory Dialogue
- [x] AGFN v1 — Autonomous Global Financial Network (Issue #141) — Global Node Architecture, Cross-Jurisdiction Capital Routing, Global Settlement Mesh, AI Coordination Layer, Multi-Reserve Treasury, Global Stability Dashboard
- [x] AIFOS v1 — AI-native Financial Operating System (Issue #143) — Financial Kernel, Financial Modules, AI Orchestration Layer, Application Layer, Permission & Identity Layer, Interoperability Layer
- [x] GAEI v1 — Global Autonomous Economic Infrastructure (Issue #147) — Capital Coordination Layer, Real Economy Integration, AI Economic Orchestration, Monetary Coordination, Economic Node Architecture, Stability Dashboard
- [x] Production Agent Runtime (Issue #149) — Agent Execution Engine, Agent State Management, Event & Trigger System, Observability & Monitoring, Security & Isolation, Integration Interfaces
- [ ] Full decentralization

---

## Global Regulatory Integration Framework (GRIF)

> **Regulation-compatible by architecture, not by exception.**

The Global Regulatory Integration Framework (GRIF) enables the TONAIAgent protocol to operate as compliant, jurisdiction-aware infrastructure across all major financial regions — without sacrificing decentralization or autonomy.

### Why GRIF?

The goal is not to avoid regulation. The goal is to become **regulation-compatible infrastructure** — comparable to how institutions engage with:

- Financial Stability Board (FSB)
- Bank for International Settlements (BIS)
- International Organization of Securities Commissions (IOSCO)

But implemented transparently and on-chain.

### Architecture

```
Global Regulators
       ↓
Regulatory Transparency Portal  ← Stability Index, Capital Adequacy, Reserves, Clearing Stats
       ↓
Compliance Modules              ← KYC, AML, Custodian Hooks, RWA Compliance, Reporting
       ↓
Jurisdiction Deployment Layer   ← Region Configs, Fund Classes, Permissioned Pools
       ↓
GAAMP / AGFI Infrastructure     ← Liquidity / Clearing / Treasury / Risk
```

### Six Core Components

| Component | Description |
|-----------|-------------|
| **Jurisdiction-Aware Deployment** | Configurable compliance modules, region-specific fund classes, permissioned pools, restricted participation rules |
| **Regulatory Mapping Matrix** | Per-jurisdiction coverage: EU, US, MENA, APAC — securities classification, custody, capital reserves, KYC/AML |
| **Compliance Module Interface** | Plug-in modules: `verifyParticipant()`, `validateAsset()`, `enforceRestrictions()`, `generateReport()` |
| **Regulatory Transparency Portal** | Live visibility into stability index, capital adequacy, treasury reserves, clearing statistics |
| **Audit & Attestation Layer** | Third-party audit integration, on-chain proof-of-reserve, risk attestations, ZK disclosure modes |
| **Regulatory Dialogue Framework** | Structured document management and regulator engagement tracking |

### How the Protocol Adapts Per Jurisdiction

| Region | Key Framework | Fund Classes | Reporting |
|--------|--------------|--------------|-----------|
| **EU** | MiCA, FINMA, BaFin | Public, Institutional, RWA | Quarterly XBRL |
| **US** | SEC, FinCEN, BSA | Accredited Investor, Institutional | Real-time SAR/CTR |
| **MENA** | VARA, MAS-DFSA | Sovereign, Institutional | Quarterly VARA |
| **APAC** | MAS, FSA, SFC | All classes with MAS KYC | Monthly/Quarterly |

### How Institutions Comply

```typescript
import { createGRIFManager } from '@tonaiagent/core/grif';

const grif = createGRIFManager({
  primaryJurisdiction: 'CH',
  operationalRegions: ['EU', 'APAC', 'MENA'],
  complianceLevel: 'institutional',
});

// Enable jurisdictions
grif.activateJurisdiction('CH');
grif.activateJurisdiction('SG');
grif.activateJurisdiction('AE');

// Register institutional fund class
const fundClass = grif.jurisdictionDeployment.registerFundClass({
  name: 'Sovereign RWA Fund',
  type: 'sovereign',
  eligibleJurisdictions: ['CH', 'SG', 'AE'],
  minimumInvestment: 10_000_000,
});

// Verify institutional participant
const verification = await grif.complianceModules.verifyParticipant({
  participantId: 'institution-001',
  participantType: 'institutional',
  jurisdiction: 'CH',
});

// Issue proof-of-reserve attestation
const attestation = grif.auditAttestation.issueProofOfReserve({
  issuer: 'TONAIAgent',
  reserveAmount: 100_000_000,
  currency: 'USD',
  chain: 'ton',
  zkProof: true, // Zero-knowledge disclosure mode
});

// Check transparency dashboard
const dashboard = grif.transparencyPortal.getDashboard();
console.log('Regulatory status:', dashboard.status);
// → { status: 'healthy', metrics: { stabilityScore: 92, capitalAdequacyStatus: 'adequate', ... } }
```

### How Transparency Is Provided

The Regulatory Transparency Portal exposes on-chain data without requiring central control:

- **Stability Index** — Protocol-wide health score from the Systemic Risk Framework
- **Capital Adequacy** — Tier 1/2 ratios, leverage ratio, liquidity coverage
- **Treasury Reserves** — Real-time reserve composition with proof-of-reserve hashes
- **Clearing Statistics** — Settlement volume, success rates, jurisdiction breakdown

### Sustainable Long-Term Model

The GRIF makes the protocol sustainable across regulatory jurisdictions by:

1. **Proactive engagement** — Document-driven regulator dialogue (whitepapers, risk reports, governance disclosures)
2. **Pluggable compliance** — Jurisdiction-specific modules can be updated as laws evolve
3. **Cryptographic attestations** — Third-party auditable, on-chain verifiable, ZK-private when required
4. **No single point of control** — Transparency without centralization

**Full GRIF Documentation**: [docs/grif.md](docs/grif.md)

---

## Sovereign Digital Asset Coordination Layer (SDACL)

> **Infrastructure designed to coordinate — not disrupt — sovereign systems.**

The Sovereign Digital Asset Coordination Layer (SDACL) enables CBDCs, sovereign tokenized bonds, national digital treasuries, and state-backed RWA instruments to integrate, interoperate, and coordinate within the AIFOS stack.

Initially built on The Open Network with multi-chain compatibility.

### Strategic Vision

CBDCs and sovereign digital assets are being explored by institutions connected to:

- Bank for International Settlements (BIS)
- International Monetary Fund (IMF)
- Central banks worldwide

SDACL positions the protocol as a **coordination layer** — not a replacement — for sovereign monetary systems.

### Architecture

```
Sovereign Digital Assets
          ↓
Sovereign Asset Module (CBDC Integration)
          ↓
Financial OS (Kernel)
          ↓
Liquidity / Clearing / Risk
          ↓
Global Financial Network
```

### Five Core Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│            SDACL — Sovereign Digital Asset Coordination Layer               │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. CBDC Integration Interface    │ Issuer verify, supply validate, settle  │
│  2. Sovereign Treasury Bridge     │ Treasury alloc, bond issuance, reserves │
│  3. Cross-Sovereign Coordination  │ AI capital flows, liquidity balancing   │
│  4. Jurisdiction Enforcement      │ Geo restrict, eligibility, sanctions    │
│  5. Sovereign Transparency        │ Exposure metrics, compliance, alerts    │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Component | Description |
|-----------|-------------|
| **CBDC Integration Interface** | Issuer verification, supply validation, jurisdiction rule enforcement, settlement routing, authority reporting |
| **Sovereign Treasury Bridge** | National treasury allocations, sovereign fund participation, bond issuance integration, configurable reserve visibility |
| **Cross-Sovereign Coordination** | AI-assisted cross-border capital flows, liquidity balancing, risk concentration management, settlement timing |
| **Jurisdiction Enforcement Layer** | Geographic restrictions, participant eligibility, sovereign asset isolation, sanction-aware routing |
| **Sovereign Transparency Dashboard** | Exposure metrics, liquidity depth, risk index, compliance reporting (observer/allocator/strategic partner modes) |

### Quick Start

```typescript
import { createSDACLService } from '@tonaiagent/core/sdacl';

const sdacl = createSDACLService({
  networkId: 'ton-mainnet',
  environment: 'sandbox',
  sanctionCheckEnabled: true,
  crossBorderRoutingEnabled: true,
});

// Register a CBDC
const cbdc = sdacl.cbdcIntegration.registerSovereignAsset({
  issuerId: 'ECB',
  issuerName: 'European Central Bank',
  assetType: 'cbdc',
  symbol: 'EURC',
  name: 'Digital Euro',
  jurisdictionCode: 'EU',
  totalSupply: 1_000_000_000,
  reserveRatio: 1.0,
  chainId: 'ton',
});

// Verify issuer
const verification = sdacl.cbdcIntegration.verifyIssuer('ECB', 'EU');
console.log('ECB verified:', verification.verified);
// → ECB verified: true

// Create treasury allocation
const allocation = sdacl.treasuryBridge.createAllocation({
  sovereignFundId: 'GPFG',
  sovereignFundName: 'Government Pension Fund Global',
  jurisdictionCode: 'NO',
  allocationAmountUsd: 500_000_000,
  allocationCurrency: 'NOK',
  targetAssetId: cbdc.id,
});

// Initiate cross-border flow with AI risk assessment
const flow = sdacl.crossSovereignCoordination.initiateFlow({
  flowType: 'capital_transfer',
  sourceJurisdiction: 'EU',
  destinationJurisdiction: 'NO',
  assetId: cbdc.id,
  amountUsd: 10_000_000,
  complianceVerified: true,
});
console.log('Risk level:', flow.riskLevel);
console.log('AI recommendation:', flow.aiRecommendation);

// Check participant eligibility with sanction screening
const eligibility = sdacl.jurisdictionEnforcement.checkParticipantEligibility({
  participantId: 'inst-001',
  jurisdictionCode: 'EU',
  kycLevel: 'institutional',
});

// Generate transparency dashboard
const dashboard = sdacl.sovereignTransparency.generateDashboardSnapshot();
console.log('Stability score:', dashboard.stabilityScore);
console.log('Compliance rate:', dashboard.complianceRate);

// Get full system status
const status = sdacl.getSystemStatus();
console.log('System stability index:', status.systemStabilityIndex);
```

### How Sovereign Assets Integrate

1. **Issuer Verification** — Central banks and treasuries are verified against a sovereign registry (BIS, IMF scorecards)
2. **Supply Validation** — Circulating supply and reserve ratios are continuously validated
3. **Settlement Routing** — Cross-border settlements are routed through TON bridge infrastructure with compliance checks
4. **Authority Reporting** — Automated generation of daily position, settlement summary, and reserve attestation reports

### How Risk Is Contained

- **AI Risk Assessment** — Every cross-border flow is scored for concentration risk, spillover risk, and systemic impact
- **Stability Index Protection** — High-risk flows require emergency committee approval
- **Systemic Spillover Detection** — AI monitors for cascade effects across jurisdictions
- **Circuit Breakers** — Automatic flow blocking when stability thresholds are exceeded

### How Cross-Border Routing Works

```
Source Jurisdiction
        ↓
Liquidity Balance Check → AI Rebalancing Suggestion
        ↓
Compliance Verification (KYC, AML, Sanctions)
        ↓
Risk Assessment (Concentration, Spillover, Systemic)
        ↓
Settlement Routing (TON Bridge Infrastructure)
        ↓
Destination Jurisdiction
        ↓
Authority Reporting & Transparency Dashboard Update
```

### How Compliance Boundaries Are Enforced

The Jurisdiction Enforcement Layer implements:

| Restriction Type | Description |
|-----------------|-------------|
| **Geographic** | Block or flag transactions from/to specific regions |
| **Participant Eligibility** | KYC tier requirements, institutional-only access |
| **Asset Isolation** | Restrict certain assets to specific jurisdictions |
| **Sanction-Aware Routing** | Screen against OFAC, EU Sanctions, and other lists |
| **Volume Limits** | Daily/transaction caps per jurisdiction |
| **KYC Thresholds** | Enhanced verification for high-value transactions |

### Why the Protocol Is Sovereign-Compatible

SDACL is designed to **coordinate with** — not replace — sovereign monetary systems:

1. **Neutral Infrastructure** — No monetary policy interference; pure coordination layer
2. **Jurisdiction Respect** — Full opt-in enforcement rules per jurisdiction
3. **Transparency Without Centralization** — On-chain dashboards without central control
4. **Pluggable Compliance** — Adaptable to evolving regulatory requirements
5. **AI-Managed Risk** — Stability protection without human intervention delays

---

## AI-native Financial Operating System (AIFOS)

> **From Financial Network → Financial Operating System**: The AIFOS abstracts the entire infrastructure into a programmable, modular, AI-coordinated financial OS — comparable to Windows/iOS/Linux, but for capital markets & global finance.

### What is AIFOS?

The AI-native Financial Operating System (AIFOS) transforms the platform from a global financial network into a programmable financial operating system that:

- **Manages capital** — Kernel-level capital state management with risk boundaries
- **Allocates liquidity** — Module-based liquidity routing and optimization
- **Executes strategies** — AI orchestration layer for agent decision coordination
- **Controls risk** — Immutable risk caps with stability index triggers
- **Enforces governance** — Constitutional governance with override mechanisms
- **Interfaces globally** — Cross-chain abstraction and external API integration

### OS Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                 AIFOS - AI-native Financial Operating System                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  Applications (Funds / DAOs / Sovereigns)                                    │
│                        ↓                                                     │
│  Financial Modules (Asset / Liquidity / Clearing / Treasury / Compliance)    │
│                        ↓                                                     │
│  AI Orchestration Layer (Agent decisions / Risk / Crisis response)           │
│                        ↓                                                     │
│  Financial Kernel (Capital state / Risk / Monetary / Governance)             │
│                        ↓                                                     │
│  Blockchain Infrastructure (TON + cross-chain)                               │
├──────────────────────────────────────────────────────────────────────────────┤
│  Permission & Identity Layer (across all layers)                             │
│  Interoperability Layer (cross-chain / external APIs / protocol bridges)     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Six Core Layers

| Layer | Description |
|-------|-------------|
| **1. Financial Kernel** | The immutable logic core — capital state management, risk boundaries enforcement, monetary parameter control, governance execution |
| **2. Financial Modules** | Plug-in modules with defined APIs: Asset, Liquidity, Clearing, Treasury, Compliance — each upgradeable within constitutional limits |
| **3. AI Orchestration Layer** | Coordinates agent decisions, risk recalibration, capital reallocation, crisis response — bounded by hard risk caps and governance overrides |
| **4. Application Layer** | Built on top of AIFOS: AI hedge funds, institutional vaults, sovereign allocation nodes, strategy marketplaces, retail finance apps |
| **5. Permission & Identity Layer** | Institutional role management, node permissions, governance delegation, compliance gating |
| **6. Interoperability Layer** | Extends IPLS and global routing — cross-chain abstraction, external API integration, protocol-to-protocol compatibility |

### Quick AIFOS Example

```typescript
import { createAIFOSManager } from '@tonaiagent/core/aifos';

// Initialize the Financial OS
const aifos = createAIFOSManager();

// Check kernel state
console.log('Kernel state:', aifos.kernel.getState());
// → 'active'

// Plug the liquidity module
const modules = aifos.modules.listModules({ moduleType: 'liquidity' });
console.log('Liquidity module:', modules[0].name);

// Run AI orchestration decision
const decision = aifos.orchestration.proposeDecision({
  agentId: 'agent-001',
  decisionType: 'capital_reallocation',
  rationale: 'Optimize yield across modules',
  targetModules: [modules[0].id],
  proposedActions: [],
  estimatedRiskImpact: -5,
  estimatedCapitalImpact: 1_000_000,
});

// Execute governance parameter update
const override = aifos.kernel.applyGovernanceOverride({
  overrideType: 'parameter_update',
  proposedBy: 'governance-council',
  approvalPercent: 67,
  targetParameter: 'globalRiskCap',
  targetValue: 'elevated',
  reason: 'Temporary risk appetite increase',
});

// Launch a demo application
const app = aifos.applications.registerApp({
  name: 'AI Hedge Fund Alpha',
  appType: 'ai_hedge_fund',
  developer: 'dev-001',
  version: '1.0.0',
  description: 'Autonomous hedge fund running on AIFOS',
  capitalBudget: 100_000_000,
});

// Get full system status
const status = aifos.getSystemStatus();
console.log('AIFOS Status:', status);
// → { kernelState: 'active', totalManagedCapitalUSD: ..., currentRiskLevel: ..., ... }
```

### Strategic Impact

With AIFOS, the project evolves from:

> **Global financial network** → **Programmable financial operating system**

This enables:

- **Ecosystem expansion** — Others can build applications on top without touching the core kernel
- **Institutional integration** — Institutions can integrate as modules with defined APIs
- **Sovereign deployment** — Sovereigns can deploy customized AIFOS instances
- **Developer extensibility** — Developers can extend functionality through the module system

### Governance Enforcement

The Financial Kernel enforces constitutional governance:

- **Hard risk caps** — Immutable boundaries that cannot be overridden
- **Stability index triggers** — Automatic actions when stability drops below thresholds
- **Governance quorum** — Parameter updates require constitutional approval (default: 51%)
- **Emergency halt** — Kernel can halt the entire system when critical thresholds are breached

### Module Interoperability

Each Financial Module:

- Has a **defined API** — Standard interface for operations
- Is **upgradeable** — Can be updated without kernel changes
- Operates within **constitutional limits** — Bounded by kernel parameters
- Emits **typed events** — All operations are auditable

---

## Production Agent Runtime

> **A production-grade execution environment for autonomous financial agents.**

The Production Agent Runtime (PAR) is the core execution layer where all AI financial agents operate on the TON blockchain. It transitions the platform from architectural specification to a real, runnable production environment — providing lifecycle management, execution pipelines, simulation mode, risk controls, and full observability.

### Why PAR?

All higher-level components of the ecosystem — trading agents, portfolio agents, treasury agents, governance agents — ultimately execute within this runtime. PAR provides:

- **Reliable** execution with deterministic lifecycle state transitions
- **Safe** operation via simulation mode and multi-layer risk controls
- **Observable** behavior with structured logging, metrics, and event streams
- **Scalable** infrastructure supporting up to 50 concurrent agents per instance

### Runtime Architecture

```
Agent Applications
        ↓
Agent Runtime API
        ↓
Execution Engine (9-step pipeline)
        ↓
Event Bus + Scheduler
        ↓
State Store (durable per-agent state)
        ↓
Financial Infrastructure (TON blockchain)
```

### Agent Lifecycle Management

Agents transition through a well-defined state machine:

```
Created → Funded → Active ↔ Paused
                  ↓
            Suspended | Migrated | Terminated
```

Each transition is recorded with full audit trail (actor, reason, timestamp, metadata).

### 9-Step Execution Pipeline

Every agent execution runs through a standardized pipeline:

| Step | Description |
|------|-------------|
| `fetch_data` | Fetch market prices and on-chain state |
| `load_memory` | Load agent memory and execution context |
| `call_ai` | Call AI model for autonomous decision |
| `validate_risk` | Enforce risk controls and daily limits |
| `generate_plan` | Generate transaction execution plan |
| `simulate_tx` | Simulate transactions before execution |
| `execute_onchain` | Execute on TON (or mock in simulation mode) |
| `record_outcome` | Record result to agent registry |
| `update_analytics` | Update performance analytics |

### Simulation Mode

Simulation mode is critical for safe MVP testing and demonstration without real funds:

- **Fake balances** — Simulated wallet with configurable nanoTON balance
- **Mock execution** — Full pipeline runs without on-chain transactions
- **Historical replay** — Backtest strategies against historical market data
- **Configurable slippage & latency** — Realistic simulation parameters

### Risk Controls

The runtime enforces multi-layer risk limits per agent:

- Maximum loss per execution
- Maximum daily loss
- Maximum daily gas budget
- Maximum transaction size
- Maximum daily transaction count
- Emergency suspension on consecutive failures

### Observability & Monitoring

Every runtime operation is observable:

- **Structured JSON logs** with configurable log levels (debug/info/warn/error)
- **Metrics** — agent counts, pipeline executions, transaction volumes, uptime
- **Health endpoint** — overall status, AI availability, TON factory availability
- **Event stream** — subscribe to all lifecycle, pipeline, and risk events

### Quick Start

```typescript
import {
  createAgentRuntimeOrchestrator,
} from '@tonaiagent/core/agent-runtime';

// Create and start the runtime
const runtime = createAgentRuntimeOrchestrator({
  observability: { enableLogging: true, logLevel: 'info' },
});
runtime.start();

// Subscribe to all events
runtime.subscribe((event) => {
  console.log(`[${event.type}]`, event.data);
});

// Register an agent in simulation mode
runtime.registerAgent({
  agentId: 'agent-001',
  name: 'DCA Bot',
  ownerId: 'telegram_user_123',
  ownerAddress: 'EQD...',
  strategyIds: ['dca-strategy-1'],
  simulation: {
    enabled: true,
    fakeBalance: BigInt(10_000_000_000), // 10 TON simulated
  },
  riskLimits: {
    maxLossPerExecutionNano: BigInt(1_000_000_000),   // 1 TON
    maxDailyLossNano: BigInt(5_000_000_000),           // 5 TON
    maxDailyGasBudgetNano: BigInt(500_000_000),        // 0.5 TON
    maxTransactionSizeNano: BigInt(2_000_000_000),     // 2 TON
    maxTransactionsPerDay: 100,
    maxConsecutiveFailures: 3,
  },
  maxConcurrentExecutions: 2,
  enableObservability: true,
});

// Fund and start the agent
runtime.fundAgent('agent-001', BigInt(5_000_000_000));
await runtime.startAgent('agent-001');

// Run a full pipeline execution
const result = await runtime.runPipeline('agent-001', 'dca-strategy-1');
console.log('Pipeline success:', result.success);
console.log('Steps:', result.steps.map(s => `${s.step}:${s.status}`).join(' → '));

// Check health and metrics
const health = runtime.getHealth();
const metrics = runtime.getMetrics();
console.log('Health:', health.overall);
console.log('Active agents:', metrics.activeAgents);

// Cleanup
runtime.stop();
```

### Multi-Agent Execution

Run multiple concurrent agents with full isolation:

```typescript
const agentTypes = ['trading', 'portfolio', 'risk', 'treasury', 'governance'];

for (const [index, type] of agentTypes.entries()) {
  runtime.registerAgent({
    agentId: `agent-${type}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
    ownerId: 'system',
    ownerAddress: `EQD...${index}`,
    strategyIds: [`${type}-strategy`],
    simulation: { enabled: true, fakeBalance: BigInt(10_000_000_000) },
    riskLimits: { /* per-agent risk limits */ },
    maxConcurrentExecutions: 2,
    enableObservability: true,
  });
  runtime.fundAgent(`agent-${type}`, BigInt(1_000_000_000));
  await runtime.startAgent(`agent-${type}`);
}

// Run all agents concurrently
const results = await Promise.all(
  agentTypes.map(type => runtime.runPipeline(`agent-${type}`))
);

console.log(`All ${results.filter(r => r.success).length}/${results.length} pipelines succeeded`);
```

### State Recovery After Restart

```typescript
// Save agent state snapshot before shutdown
const snapshot = runtime.getAgentState('agent-001');

// After restart — restore agent and resume from last known state
runtime.registerAgent(savedConfig);
// State is rehydrated; agent resumes from 'funded' state
```

**Full PAR Documentation**: [src/agent-runtime](src/agent-runtime)

---

## Agent Plugin System

> **Extend any AI agent with modular, sandboxed capabilities — without touching the core platform.**

The Agent Plugin System is the extensibility layer of the TONAIAgent platform. It allows developers to add new tools, data sources, DeFi integrations, and analytics capabilities to any AI agent by installing plugins — all with fine-grained permission control, sandboxed execution, and full observability.

### Why a Plugin System?

As the platform grows, the number of possible integrations, strategies, and tools expands combinatorially. Rather than hardcoding every capability, the plugin system:

- **Decouples** capabilities from the core platform — plugins can be installed, updated, and removed independently
- **Enables community extensions** — any developer can build a plugin following the standard manifest format
- **Enforces safety** — sandboxed execution, permission model, and rate limiting prevent malicious or runaway plugins
- **Powers the AI** — plugins expose tools in a standard function-calling format, so AI agents discover and use them automatically

### Plugin Architecture

```
AI Agent (PluginManager)
        ↓
Plugin Registry (install/activate/discover)
        ↓
Plugin Runtime (sandboxed execution, permissions, rate limiting)
        ↓
Plugin Tool Executor (AI function-calling bridge)
        ↓
Core Plugins: TON Wallet | Jettons | NFTs
```

### Plugin Manifest Standard

Every plugin is described by a `PluginManifest`:

```typescript
import { PluginManifest } from '@tonaiagent/core/plugins';

const myPlugin: PluginManifest = {
  id: 'my-analytics-plugin',
  name: 'My Analytics Plugin',
  version: '1.0.0',
  description: 'Provides on-chain analytics tools for AI agents',
  author: { name: 'Developer', email: 'dev@example.com' },
  category: 'analytics',
  trustLevel: 'community',
  keywords: ['analytics', 'on-chain', 'metrics'],
  license: 'MIT',
  permissions: [
    {
      scope: 'ton:read',
      reason: 'Read on-chain data for analytics',
      required: true,
    },
  ],
  capabilities: {
    tools: [
      {
        name: 'get_wallet_analytics',
        description: 'Returns analytics summary for a TON wallet address',
        category: 'analytics',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'TON wallet address' },
            days: { type: 'number', description: 'Analysis window in days', default: 30 },
          },
          required: ['address'],
        },
        requiredPermissions: ['ton:read'],
      },
    ],
  },
};
```

### Plugin Runtime Integration

The `PluginRuntime` provides sandboxed execution with:

| Feature | Description |
|---------|-------------|
| **Permission enforcement** | Each tool declares required permissions; denied scopes throw `PERMISSION_DENIED` |
| **Rate limiting** | Per-plugin sliding-window rate limiting (default: 100 req/min) |
| **Resource limits** | Max memory (128MB), CPU time (5s), execution time (30s), network requests (10) |
| **Audit trail** | Every execution records `execution_started`, `execution_completed`, or `execution_failed` entries |
| **Sandboxed context** | Plugins receive isolated `logger`, `storage`, `http`, and `ton` interfaces — no access to global state |
| **Dry run mode** | Execute any tool in simulation mode without side effects |

### Permission Model

22 fine-grained permission scopes across 6 categories:

| Category | Scopes |
|----------|--------|
| **TON Blockchain** | `ton:read`, `ton:write`, `ton:sign` |
| **Wallet** | `wallet:read`, `wallet:transfer` |
| **Jettons/DeFi** | `jettons:read`, `jettons:transfer`, `jettons:swap`, `defi:stake`, `defi:farm`, `defi:liquidity` |
| **NFTs** | `nft:read`, `nft:transfer`, `nft:mint` |
| **Platform** | `network:outbound`, `storage:read`, `storage:write`, `secrets:read`, `memory:read`, `memory:write`, `agent:communicate` |
| **Admin** | `admin:manage` |

Permission constraints allow fine-grained control:

```typescript
{
  scope: 'wallet:transfer',
  reason: 'Execute DCA orders',
  required: true,
  constraints: {
    maxTransactionValue: 10,  // Max 10 TON per transaction
    dailyLimit: 100,          // Max 100 TON per day
    allowedTokens: ['EQ...'], // Only specific tokens
  },
}
```

### Core Built-in Plugins

Three production-ready plugins are pre-installed with `trustLevel: 'core'`:

#### TON Wallet Plugin (`ton-wallet`)
7 tools: `ton_get_balance`, `ton_transfer`, `ton_batch_transfer`, `ton_get_account_info`, `ton_get_transactions`, `ton_simulate_transaction`, `ton_validate_address`

#### TON Jettons Plugin (`ton-jettons`)
9 tools: `jetton_get_info`, `jetton_get_balance`, `jetton_transfer`, `jetton_swap`, `jetton_get_swap_quote`, `jetton_stake`, `jetton_unstake`, `jetton_get_staking_info`, `jetton_get_portfolio`

#### TON NFT Plugin (`ton-nft`)
8 tools: `nft_get_info`, `nft_get_collection`, `nft_get_owned`, `nft_transfer`, `nft_list_for_sale`, `nft_cancel_listing`, `nft_buy`, `nft_search_listings`

### Quick Start

```typescript
import { createPluginManager } from '@tonaiagent/core/plugins';

// 1. Create manager (auto-installs core TON plugins)
const manager = createPluginManager();
await manager.initialize();

// 2. Get AI tool definitions (for function calling)
const tools = manager.getAIToolDefinitions();
// → array of { type: 'function', function: { name, description, parameters } }

// 3. Execute a tool
const result = await manager.executeTool(
  'ton_get_balance',
  { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
  { userId: 'u1', agentId: 'a1', sessionId: 's1', requestId: 'r1' }
);
// → { success: true, result: { balance: '1.5', formatted: '1.5 TON', ... } }

// 4. Health and metrics
const health = manager.getHealthSummary();
// → { total: 3, active: 3, healthy: 3, degraded: 0, unhealthy: 0, ... }
```

### Installing a Custom Plugin

```typescript
import { createPluginManager, type ToolHandler } from '@tonaiagent/core/plugins';

const manager = createPluginManager({ autoInstallCore: false });
await manager.initialize();

// Install custom plugin with handlers
const handler: ToolHandler = async (params, context) => {
  context.logger.info('Executing analytics', { address: params.address });
  // ... fetch and return data
  return { score: 95, transactions: 142, volume: '50000 TON' };
};

await manager.installPlugin(
  myPlugin,  // PluginManifest from above
  { get_wallet_analytics: handler },
  { activateImmediately: true }
);

// Tool is now available to AI
console.log(manager.isToolAvailable('get_wallet_analytics')); // true
```

### Plugin Marketplace Framework

The plugin system includes a `PluginRegistry` with built-in marketplace primitives:

| Feature | API |
|---------|-----|
| **Discovery** | `registry.search({ category, keyword, trustLevel, hasTool })` |
| **Lifecycle** | `install()`, `activate()`, `deactivate()`, `uninstall()`, `update()` |
| **Versioning** | Semver validation, auto-rollback on failed updates |
| **Trust levels** | `core`, `verified`, `community`, `experimental` |
| **Categories** | `ton-native`, `defi`, `trading`, `analytics`, `external`, `utility`, `security`, `communication`, `storage`, `custom` |
| **Events** | `plugin:installed`, `plugin:activated`, `plugin:deactivated`, `plugin:updated`, `plugin:uninstalled`, `plugin:error` |
| **Metrics** | Per-plugin execution counts, success rates, avg latency, per-tool breakdowns |
| **Health monitoring** | Automatic periodic health checks with `healthy`/`degraded`/`unhealthy` status |

### AI Integration

The `PluginToolExecutor` bridges the plugin system with the AI layer:

```typescript
// Get all tools formatted for AI function calling (OpenAI/Anthropic compatible)
const tools = manager.getAIToolDefinitions();

// Execute tool calls returned by the AI
const results = await manager.executeToolCallsParallel([
  { toolCallId: 'call_1', toolName: 'ton_get_balance', args: { address: 'EQ...' } },
  { toolCallId: 'call_2', toolName: 'jetton_get_portfolio', args: { walletAddress: 'EQ...' } },
], context);

// Format results as AI messages (role: 'tool')
const messages = executor.formatToolResultsAsMessages(results);

// Build system message listing available tools
const systemMsg = manager.buildToolsSystemMessage();
```

### Tests

All **59 plugin system tests** pass across 6 test suites:

| Suite | Tests | Coverage |
|-------|-------|----------|
| `PluginRegistry` | 22 | Installation, activation, discovery, tool management, config, metrics, events |
| `PluginRuntime` | 9 | Handler registration, execution, permission enforcement, audit trail |
| `PluginToolExecutor` | 12 | AI tool conversion, execution, parallel calls, confirmation flow |
| `Core Plugins` | 6 | Manifest validation, handler coverage, tool enumeration |
| `PluginManager` | 7 | Initialization, tool execution, health/metrics, graceful shutdown |
| `Integration` | 3 | End-to-end execution, concurrent calls, event emission |

```bash
npx vitest run tests/plugins/
# → 59 tests passed
```

**Full Plugin Documentation**: [src/plugins](src/plugins) | **Demo**: [examples/plugins-demo.ts](examples/plugins-demo.ts)

---

## Strategy Marketplace

> **The economic layer of the AI agent ecosystem.**

Strategy Marketplace v1 introduces the first economic flywheel for the TON AI Agent platform: developers monetize their trading strategies, users access AI-driven investment tools, and the platform scales through network effects. It becomes the foundation for AI hedge funds, automated portfolio management, and decentralized investment platforms.

### Why Strategy Marketplace?

The marketplace connects strategy creators with capital allocators through a transparent, permissionless infrastructure:

- **Creators** publish and monetize trading/investment strategies
- **Investors** discover, evaluate, and allocate capital to strategies
- **AI Agents** execute strategies autonomously via the Production Agent Runtime
- **Platform** earns a share while enabling a self-sustaining economic flywheel

### Marketplace Architecture

```
Strategy Creators
      ↓
Strategy Registry       ← stores metadata, performance, deployment config
      ↓
Marketplace API         ← unified interface for all marketplace operations
      ↓
Agent Runtime           ← executes strategies as autonomous AI agents
      ↓
Execution & Performance Tracking
```

### Core Components

#### Strategy Registry

Central store for all strategy metadata:

| Field | Description |
|-------|-------------|
| `id`, `creator`, `name`, `description` | Identity |
| `asset_types` | TON, Jetton, LP_Token, NFT, DeFi_Yield, RWA, Stablecoin, Cross_Chain |
| `strategy_type` | defi_yield, arbitrage, ai_trading, portfolio_management, dca, grid_trading, … |
| `risk_score` | 0–100, automatically calculated |
| `performance_metrics` | ROI, Sharpe ratio, max drawdown, win rate, historical returns |
| `deployment_config` | min/max capital, protocols, rebalance interval, stop-loss, slippage |
| `revenue_config` | Performance fee (20%), management fee (2%), creator share |
| `security_info` | Verification level, sandbox status, audit badge, verified creator |

#### Performance Tracking

Metrics are updated automatically by the Agent Runtime after each execution cycle:

- **ROI** — total, 30d, 90d, 365d return on investment
- **Sharpe ratio** — risk-adjusted return
- **Max drawdown** — largest peak-to-trough loss
- **Win rate** — percentage of profitable executions
- **Historical returns** — timestamped return snapshots (up to 365 data points)

#### Capital Allocation

Three allocation models are supported:

| Model | Description |
|-------|-------------|
| **Direct allocation** | Deploy strategy with your own capital as a dedicated AI agent |
| **Copy trading** | Copy a creator's strategy trades proportionally |
| **Fund-style pooling** | Pool capital with other users into a shared strategy fund |

#### Creator Revenue Model

Creators earn revenue automatically when their strategies generate returns:

| Fee Type | Default Rate | Description |
|----------|-------------|-------------|
| Performance fee | 20% | Applied to profits above high-water mark |
| Management fee | 2% / year | Applied to AUM monthly |
| Creator share | 80% | Creator's portion of collected fees |
| Platform share | 20% | Platform's portion of collected fees |

Fees are configurable per-strategy (performance fee max 30%, management fee max 5%).

#### Strategy Discovery

Filter and search strategies by:

- **Asset class** — TON, Jetton, LP tokens, RWA, stablecoins, cross-chain
- **Risk level** — risk score (0–100), max drawdown threshold
- **Performance** — minimum ROI, minimum Sharpe ratio, win rate
- **Strategy type** — DeFi yield, arbitrage, AI trading, portfolio management, DCA
- **Creator reputation** — verified creator only, verification level (unverified/basic/audited/certified)
- **Custom tags** — user-defined search tags

#### Strategy Security & Verification

Every strategy has a security profile:

| Level | Description |
|-------|-------------|
| `unverified` | Default — not reviewed |
| `basic` | Platform basic checks passed |
| `audited` | Third-party audit completed |
| `certified` | Full platform certification |

Additional security features:
- Sandbox execution (simulation mode before live deployment)
- Risk validation via Agent Runtime risk controls
- Code verification by platform
- Creator reputation scoring
- Verified creator badge

### Publishing a Strategy

```typescript
import { createMarketplaceAPI } from '@tonaiagent/core/marketplace';

const marketplace = createMarketplaceAPI();

// Step 1: Publish strategy to registry
const strategy = await marketplace.publishStrategy({
  creatorId: 'creator_alice',
  name: 'DeFi Yield Optimizer',
  description: 'Automated yield farming across TON DeFi protocols',
  category: 'yield_farming',
  strategyType: 'defi_yield',
  assetTypes: ['TON', 'Jetton', 'LP_Token'],
  deploymentConfig: {
    minCapital: 100,        // 100 TON minimum
    maxCapital: 500_000,    // 500K TON maximum
    protocols: ['STON.fi', 'DeDust', 'Tonstakers'],
    stopLossPercent: 10,
    maxSlippagePercent: 1,
    sandboxEnabled: true,
  },
  revenueConfig: {
    performanceFeePercent: 20,        // 20% performance fee
    managementFeeAnnualPercent: 2,    // 2% annual management fee
    creatorSharePercent: 80,          // creator keeps 80%
  },
  tags: ['yield', 'defi', 'automated'],
});

// Step 2: Make strategy live on marketplace
const active = await marketplace.activateStrategy(strategy.id);
console.log(`Strategy live: ${active.id}, status: ${active.status}`);
```

### Discovering Strategies

```typescript
// List strategies with filters
const results = await marketplace.listStrategies({
  categories: ['yield_farming', 'arbitrage'],
  assetTypes: ['TON'],
  minROI: 10,              // at least 10% ROI
  minSharpeRatio: 1.5,    // risk-adjusted quality filter
  maxDrawdownMax: 20,      // max 20% drawdown allowed
  verifiedCreatorOnly: true,
  sortBy: 'roi',
  sortOrder: 'desc',
  limit: 20,
});

console.log(`Found ${results.total} strategies`);
results.entries.forEach(s => {
  console.log(`  ${s.name}: ROI=${s.performanceMetrics.roi}%, Sharpe=${s.performanceMetrics.sharpeRatio}`);
});

// Get top strategies
const top5 = await marketplace.getTopStrategies('sharpe', 5);
```

### Allocating Capital

```typescript
// Allocate capital via copy trading
const allocation = await marketplace.allocateCapital({
  userId: 'investor_bob',
  strategyId: strategy.id,
  amountTON: 5000,
  allocationType: 'copy_trading',
});

// Or deploy strategy as dedicated AI agent
const agent = await marketplace.deployStrategy({
  strategyId: strategy.id,
  userId: 'investor_bob',
  capitalTON: 5000,
  simulationMode: false,   // set true for paper trading
  agentName: 'Bob\'s Yield Agent',
});

console.log(`Agent deployed: ${agent.agentId}, status: ${agent.status}`);
```

### Running a Strategy via AI Agent

After deployment, the agent runs autonomously via the Production Agent Runtime (PAR). The runtime executes the full 9-step pipeline on each cycle:

```
fetch_data → load_memory → call_ai → validate_risk →
generate_plan → simulate_tx → execute_onchain → record_outcome → update_analytics
```

Performance metrics are automatically pushed back to the Strategy Registry after each `update_analytics` step.

### Tracking Performance Metrics

```typescript
// Performance is updated automatically by the agent runtime
// You can also update manually (e.g., in tests or simulations):
await marketplace.updatePerformance(strategy.id, {
  roi: 25.5,
  roi30d: 8.2,
  sharpeRatio: 1.9,
  maxDrawdown: 11.3,
  winRate: 68.5,
  historicalReturnSnapshot: {
    timestamp: new Date(),
    cumulativeReturn: 25.5,
    periodReturn: 8.2,
  },
});

// Get current strategy with live metrics
const current = await marketplace.getStrategy(strategy.id);
console.log('ROI:', current.performanceMetrics.roi);
console.log('Sharpe:', current.performanceMetrics.sharpeRatio);
console.log('AUM:', current.capitalAllocation.totalAUM, 'TON');
```

### Creator Revenue Reporting

```typescript
// Calculate monthly creator revenue
const revenue = await marketplace.calculateCreatorRevenue('creator_alice', '2026-03');
revenue.forEach(r => {
  console.log(`Strategy ${r.strategyId}:`);
  console.log(`  Performance fees: ${r.performanceFees} TON`);
  console.log(`  Management fees: ${r.managementFees} TON`);
  console.log(`  Creator share (80%): ${r.creatorShare} TON`);
});
```

### Success Metrics

The marketplace tracks the following flywheel indicators:

| Metric | Description |
|--------|-------------|
| Strategies published | Number of live strategies in the registry |
| Active strategy agents | Number of AI agents currently executing strategies |
| Capital allocated | Total AUM across all strategies (in TON) |
| Creator revenue | Total fees generated and distributed to creators |
| Strategy performance transparency | Historical return data points stored per strategy |

**Full Marketplace Documentation**: [src/marketplace](src/marketplace)


---

## Strategy Reputation System

> **Trust and quality assurance for the Strategy Marketplace.**

The Strategy Reputation & Ranking System evaluates strategies based on performance, risk, reliability, and user feedback. It helps users identify high-quality strategies, avoid risky or unreliable ones, and compare performance across the marketplace.

### Why a Reputation System?

As the marketplace grows, users need a reliable way to evaluate strategies beyond raw performance numbers. The reputation system provides:

- **Objective scoring** — composite model weighing performance, risk, stability, and community trust
- **Badge recognition** — visual signals for Top Performer, Low Risk, Verified, Trending, Most Trusted
- **Sortable leaderboards** — four ranking categories with real-time updates
- **User feedback** — verified investor reviews with voting and moderation
- **Performance history** — monthly returns, volatility, and drawdown tracking for trust building

### Scoring Model

The overall reputation score is a weighted composite:

```
Overall Score = Performance Score × 35%
              + Risk Adjustment Score × 25%
              + Stability Score × 20%
              + Reputation Score × 20%
```

#### Performance Score (35%)

Evaluates ROI, Sharpe ratio, win rate, and profit factor:

| Metric | Weight | Notes |
|--------|--------|-------|
| 30-day ROI | 40% | Normalized: -50% → 0, +50% → 100 |
| Sharpe ratio | 30% | <0 → 0, 1.0 → 70, 2.0 → 100 |
| Win rate | 20% | Percentage of profitable executions |
| Profit factor | 10% | Total profit / total loss |

#### Risk Adjustment Score (25%)

Starts at 100 and subtracts penalties for risk factors sourced from Risk Engine v1:

| Risk Factor | Penalty |
|-------------|---------|
| Max drawdown 25% | -35 pts |
| Annualized volatility >20% | Up to -30 pts |
| Leverage >2× | Up to -20 pts |

#### Stability Score (20%)

Rewards longer, more consistent histories:

| Factor | Weight |
|--------|--------|
| History length (saturates at 24 months) | 50% |
| Positive months % | 30% |
| Sortino ratio | 20% |

#### Reputation Score (20%)

Aggregates user trust signals:

```
Reputation Score = User Rating (weighted by verified reviews)
                 + Active Investors (log-scaled)
                 + Strategy Age (months of operation)
```

### Ranking Tiers

| Tier | Requirements |
|------|-------------|
| **Emerging** | Score < 50 — New or unproven strategy |
| **Established** | Score ≥ 50 — Proven but limited history |
| **Trusted** | Score ≥ 70, ≥ 3 months history |
| **Elite** | Score ≥ 85, ≥ 3 months history, ≥ 50 active investors |

### Strategy Badges

| Badge | Criteria |
|-------|----------|
| **Top Performer** | Performance score ≥ 80 |
| **Low Risk** | Max drawdown ≤ 10% and annualized volatility ≤ 15% |
| **Verified** | ≥ 6 months history and ≥ 5 user reviews |
| **Trending** | ≥ 20 active investors |
| **Most Trusted** | Average rating ≥ 4.5 with ≥ 10 reviews |
| **Most Consistent** | Stability score ≥ 80 |
| **High AUM** | Total AUM ≥ 100,000 TON |

### Ranking Leaderboards

Four sortable leaderboard categories are always available:

| Category | Sort Field | Description |
|----------|-----------|-------------|
| **Top Performing** | Performance score | Highest ROI with good Sharpe ratios |
| **Lowest Risk** | Risk adjustment score | Best drawdown and volatility control |
| **Trending** | Active investors | Strategies gaining adoption quickly |
| **Most Trusted** | Reputation score | Highest-rated by verified investors |

### Quick Start

```typescript
import { createMarketplaceService } from '@tonaiagent/core/marketplace';

const marketplace = createMarketplaceService();

// Register a strategy for ranking
const score = marketplace.ranking.registerStrategy({
  strategyId: 'strategy_defi_001',
  strategyName: 'DeFi Yield Optimizer',
  creatorId: 'creator_alice',
  publishedAt: new Date('2025-09-01'),
  roi30d: 8.5,
  sharpeRatio: 1.8,
  maxDrawdown: 12.0,
  winRate: 68.0,
  volatility: 18.0,
  avgUserRating: 4.3,
  ratingCount: 15,
  activeInvestors: 42,
  totalAUM: 50_000,
  monthsOfHistory: 6,
  positiveMonthsPercent: 75,
});

console.log(`Overall score: ${score.overallScore}`);  // e.g. 72.4
console.log(`Tier: ${score.tier}`);                   // e.g. 'trusted'
console.log(`Badges: ${score.badges.join(', ')}`);    // e.g. 'verified, trending'

// Get leaderboards
const topPerforming = marketplace.ranking.getLeaderboard('top_performing');
const lowestRisk    = marketplace.ranking.getLeaderboard('lowest_risk');
const trending      = marketplace.ranking.getLeaderboard('trending');
const mostTrusted   = marketplace.ranking.getLeaderboard('most_trusted');

console.log('Top Performing Strategies:');
for (const entry of topPerforming.entries.slice(0, 5)) {
  console.log(`  #${entry.rank} ${entry.strategyName} — Score: ${entry.score.overallScore.toFixed(1)}`);
}
```

### Recording Performance History

```typescript
// Record monthly returns (feeds into stability and trust scoring)
await marketplace.performanceHistory.recordMonthlyReturn({
  strategyId: 'strategy_defi_001',
  year: 2026,
  month: 3,
  returnPercent: 7.2,
  benchmarkReturn: 3.1,    // optional: vs TON index
  volatility: 12.5,
  tradingDays: 22,
});

// Record drawdown events
await marketplace.performanceHistory.recordDrawdown({
  strategyId: 'strategy_defi_001',
  startDate: new Date('2026-02-10'),
  peakValue: 105_000,
  troughValue: 93_500,
  drawdownPercent: 10.95,
});

// Compute consistency metrics
const metrics = await marketplace.performanceHistory.computeConsistencyMetrics('strategy_defi_001');
console.log(`Positive months: ${metrics.positiveMonthsPercent.toFixed(0)}%`);
console.log(`Calmar ratio:    ${metrics.calmarRatio.toFixed(2)}`);
console.log(`Trust score:     ${metrics.trustScore.toFixed(1)}/100`);
```

### User Feedback & Reviews

```typescript
// Investors submit verified reviews
const feedback = await marketplace.userFeedback.submitFeedback({
  strategyId: 'strategy_defi_001',
  userId: 'investor_bob',
  rating: 5,
  title: 'Consistent yields with low drawdowns',
  content: 'Running this for 4 months with 5000 TON. Monthly returns have been steady and the drawdown never worried me. Highly recommended for conservative DeFi exposure.',
  capitalAllocated: 5000,
  holdingDays: 120,
  verified: true,    // Platform confirms this user deployed the strategy
});

// Vote on reviews
await marketplace.userFeedback.voteFeedback(feedback.id, 'investor_carol', true); // helpful

// Get feedback summary for a strategy
const summary = await marketplace.userFeedback.getFeedbackSummary('strategy_defi_001');
console.log(`Average rating: ${summary.averageRating.toFixed(1)}/5`);
console.log(`Verified reviews: ${summary.verifiedReviewCount}`);
console.log(`Trend: ${summary.recentTrend}`);  // 'improving' | 'stable' | 'declining'
```

### Architecture

```
Strategy Marketplace
        ↓
Performance Data (ROI, Sharpe, Drawdown, Win Rate)
        ↓
Risk Engine → Risk Adjustment Factor
        ↓
Reputation & Ranking Engine
  ├── Performance Score
  ├── Risk Adjustment Score
  ├── Stability Score (Performance History)
  └── Reputation Score (User Feedback + Investors + Age)
        ↓
Marketplace Leaderboards (Top Performing / Lowest Risk / Trending / Most Trusted)
```

**Full Reputation System Documentation**: [src/marketplace/ranking.ts](src/marketplace/ranking.ts), [src/marketplace/user-feedback.ts](src/marketplace/user-feedback.ts), [src/marketplace/performance-history.ts](src/marketplace/performance-history.ts)


---

## Live Trading Infrastructure

> **From Simulation to Real Capital**: The Live Trading Infrastructure enables AI agents to execute real trades through integrated liquidity venues, transitioning the platform from backtesting and simulation to live financial activity.

The platform is a **live AI-driven trading and investment infrastructure** — agents can now discover strategies in the marketplace, allocate capital, and execute real trades across DEX, CEX, and DeFi protocols.

### How AI Agents Execute Trades

```
AI Agent
     ↓
Strategy Engine
     ↓
Execution Engine
     ↓
Exchange Connectors
     ↓
DEX / CEX / DeFi Liquidity
```

1. **Strategy triggers** fire (price, schedule, on-chain event)
2. **Risk controls** validate the order pre-execution
3. **Execution Engine** routes the order to the best available liquidity venue
4. **Exchange Connector** submits to the real venue (DEX contract / CEX API)
5. **Portfolio Sync** updates balances, positions, and PnL in real time
6. **Marketplace metrics** are updated with live performance data

### Supported Liquidity Venues

| Type | Examples | Protocol |
|------|----------|----------|
| **DEX** | STON.fi, DeDust | TON AMM / smart contracts |
| **CEX** | Binance, OKX | REST / WebSocket API |
| **DeFi** | Lending pools, yield vaults | On-chain protocol calls |

### Execution Pipeline

```typescript
import { createLiveTradingInfrastructure, buildRiskProfile } from '@tonaiagent/core/live-trading';

const lti = createLiveTradingInfrastructure({ simulationMode: false });

// 1. Register exchange connector
const connector = lti.createSimulatedConnector({
  exchangeId: 'stonfi',
  name: 'STON.fi DEX',
  type: 'dex',
  network: 'ton',
  endpoint: 'https://app.ston.fi',
});
lti.registry.register(connector);
await lti.registry.connectAll();

// 2. Set agent risk profile
lti.riskControls.setRiskProfile('agent_001', buildRiskProfile('agent_001', {
  maxPositionSizePercent: 10,    // max 10% of portfolio per trade
  maxDailyLossPercent: 3,        // stop trading after 3% daily loss
  maxSlippageTolerance: 0.5,     // block orders with >0.5% slippage
  maxTradesPerHour: 5,           // velocity limit
}));

// 3. Get real-time market data
const price = await lti.marketData.getPrice('TON/USDT');
const orderBook = await lti.marketData.getOrderBook('TON/USDT', 10);

// 4. Check risk before execution
const riskCheck = lti.riskControls.checkExecution({
  agentId: 'agent_001',
  executionRequest: { id: 'exec_1', agentId: 'agent_001', symbol: 'TON/USDT', side: 'buy',
    quantity: 100, slippageTolerance: 0.3, executionStrategy: 'direct' },
  currentPortfolio: lti.portfolio.getPortfolio('agent_001'),
  marketData: price,
});

if (riskCheck.passed) {
  // 5. Execute trade
  const result = await lti.executionEngine.execute({
    id: 'exec_1',
    agentId: 'agent_001',
    symbol: 'TON/USDT',
    side: 'buy',
    quantity: 100,
    slippageTolerance: 0.3,
    executionStrategy: 'twap',  // Time-Weighted Average Price
  });

  // 6. Update portfolio
  lti.portfolio.syncFromExecution('agent_001', result);
  const summary = lti.portfolio.getAgentSummary('agent_001');
  console.log('Realized PnL:', summary.realizedPnl);
}
```

### Risk Controls

All risk checks happen **before** order execution:

| Control | Description | Action |
|---------|-------------|--------|
| **Max Position Size** | Limit per-trade as % of portfolio | Reduce or block |
| **Slippage Limit** | Maximum tolerated execution slippage | Block |
| **Stop-Loss** | Halt trading after cumulative loss threshold | Block all |
| **Daily Loss Limit** | Maximum loss per day as % of portfolio | Block |
| **Velocity Limit** | Maximum trades per hour | Block |
| **Exposure Limit** | Maximum strategy exposure as % of portfolio | Block |

### Portfolio Tracking

Continuously synchronized with:
- **Token balances** per exchange/wallet
- **Open positions** with real-time unrealized PnL
- **Realized PnL** aggregated per agent
- **Fee tracking** cumulative fees paid
- **Daily PnL history** for performance metrics

### Secure Key Management

API keys and private keys are **never exposed to agent logic**:

```typescript
import { createKeyManagementService } from '@tonaiagent/core/live-trading';

const keyManager = createKeyManagementService({ enableAuditLog: true });

// Store encrypted — agent receives only a credential ID
const cred = keyManager.storeCredential({
  agentId: 'agent_001',
  exchangeId: 'binance',
  keyType: 'api_key',
  plainTextValue: process.env.BINANCE_API_KEY!,
  permissions: ['read_balance', 'place_orders', 'cancel_orders'],
  // Never grant 'withdraw' to automated agents
});

// Keys are decrypted only during execution, never logged
const decrypted = keyManager.getCredential(cred.id, 'agent_001');
```

### Market Data Feeds

Real-time data for informed trading decisions:

```typescript
// Subscribe to live price feed
const sub = lti.marketData.subscribe('price', 'TON/USDT', (feed) => {
  console.log(`TON/USDT: ${feed.price} (${feed.changePercent24h.toFixed(2)}%)`);
});

// Get volatility metrics
const volatility = await lti.marketData.getVolatility('TON/USDT', '24h');
console.log('24h ATR:', volatility.atr);
```

---

## AI Fund Manager

> **From strategy marketplace to AI-native hedge fund infrastructure.**

The AI Fund Manager transforms the platform from a strategy marketplace into a **full investment platform** — enabling AI-managed investment funds built from multiple strategies and managed through autonomous agents.

Each fund allocates capital across strategies, rebalances portfolios automatically, manages risk exposure, tracks performance metrics, and distributes returns to investors.

### Architecture

```
Investors
    ↓
AI Fund Manager
    ↓
Allocation Engine
    ↓
Strategy Agents (via Agent Runtime)
    ↓
Live Trading Infrastructure
```

### Core Components

| Component | Description |
|-----------|-------------|
| **Fund Creation Framework** | Create and configure AI-managed funds with strategy allocations, risk profiles, and fee structures |
| **Allocation Engine** | Distributes investor capital across strategies according to target weights |
| **Rebalancing Engine** | Automatically rebalances on drift, schedule, volatility, or risk triggers |
| **Risk Management** | Fund-level controls: max drawdown, strategy exposure, daily loss limits, emergency stop |
| **Investor Participation** | Open/private/institutional fund models with deposit, withdraw, and position tracking |
| **Performance Tracking** | Returns, Sharpe ratio, Sortino ratio, max drawdown, win rate, volatility |
| **Fee Distribution** | Management (2% annual) and performance (20% of profits) fees distributed to creators, developers, and treasury |

### Fund Creation

```typescript
import { createAIFundManager } from '@tonaiagent/core/fund-manager';

const manager = createAIFundManager({ enabled: true });
manager.start();

// Create a multi-strategy AI fund
const fund = manager.funds.createFund({
  name: 'Alpha Growth Fund',
  description: 'AI-managed diversified DeFi fund on TON',
  creatorId: 'creator_001',
  type: 'open',           // open | private | institutional
  baseAsset: 'TON',
  strategyAllocations: [
    { strategyId: 'dca-strategy-1',       targetWeightPercent: 40 },
    { strategyId: 'yield-optimizer-1',    targetWeightPercent: 35 },
    { strategyId: 'grid-trading-1',       targetWeightPercent: 25 },
  ],
  riskProfile: 'moderate',        // conservative | moderate | aggressive
  managementFeePercent: 2.0,      // 2% annual management fee
  performanceFeePercent: 20.0,    // 20% performance fee on profits
});

// Activate the fund to accept investor capital
manager.funds.activateFund(fund.fundId);
```

### Capital Allocation

```typescript
// Investor deposits 100 TON into the fund
const portfolio = manager.funds.getFundPortfolio(fund.fundId)!;
const deposit = manager.investors.deposit(
  {
    fundId: fund.fundId,
    investorId: 'investor_001',
    investorAddress: 'EQD...',
    amount: BigInt(100_000_000_000), // 100 TON in nanoTON
  },
  fund,
  portfolio
);
console.log('Shares issued:', deposit.sharesIssued.toString());

// Allocate capital across strategies
const { updatedPortfolio, result } = manager.allocation.allocateDeposit(
  portfolio, fund, BigInt(100_000_000_000)
);
console.log('Capital allocated to strategies:');
for (const alloc of result.allocations) {
  console.log(`  ${alloc.strategyId}: ${alloc.amountAllocated} nanoTON (${alloc.weightPercent}%)`);
}
```

### Automatic Rebalancing

```typescript
// Check if rebalancing is needed
const trigger = manager.rebalancing.shouldRebalance(fund, updatedPortfolio);
// Returns: 'drift_threshold' | 'scheduled_interval' | 'volatility_spike' | null

if (trigger) {
  // Generate rebalancing plan
  const plan = manager.rebalancing.generatePlan(fund, updatedPortfolio, trigger);
  console.log('Rebalancing actions:', plan.actions.length);
  console.log('Estimated gas:', plan.estimatedGasCost.toString());

  // Execute plan — moves capital between strategy agents
  const { result } = await manager.rebalancing.executePlan(plan, updatedPortfolio);
  console.log('Rebalanced:', result.actionsCompleted, 'actions completed');
}
```

### Risk Management

```typescript
// Assess fund risk status
const riskStatus = manager.riskManagement.assessRisk(fund, updatedPortfolio);
console.log('Risk score:', riskStatus.riskScore, '/ 100');
console.log('Drawdown:', riskStatus.currentDrawdownPercent.toFixed(2) + '%');
console.log('Breached limits:', riskStatus.breachedLimits);

// Check for emergency stop condition
const emergency = manager.riskManagement.checkEmergencyStop(fund, updatedPortfolio);
if (emergency) {
  manager.funds.emergencyStop(fund.fundId, emergency.reason);
  console.log('Fund emergency stopped:', emergency.reason);
}
```

### Performance Tracking

```typescript
// Record daily AUM snapshot
manager.performance.recordSnapshot(updatedPortfolio, investorCount);

// Calculate performance metrics
const metrics = manager.performance.calculateMetrics(fund.fundId, 'all_time');
console.log('Total return:', metrics.totalReturnPercent.toFixed(2) + '%');
console.log('Sharpe ratio:', metrics.sharpeRatio.toFixed(2));
console.log('Max drawdown:', metrics.maxDrawdownPercent.toFixed(2) + '%');
console.log('Win rate:', metrics.winRatePercent.toFixed(1) + '%');
```

### Fee Distribution

```typescript
// Collect management fee (accrued daily, 2% annual)
const mgmtFee = manager.fees.collectManagementFee(fund, updatedPortfolio);
if (mgmtFee) {
  console.log('Management fee collected:', mgmtFee.totalAmount.toString());
  for (const dist of mgmtFee.distributions) {
    console.log(`  ${dist.recipientType}: ${dist.amount} (${dist.sharePercent}%)`);
  }
}

// Collect performance fee (only on new all-time highs above high-water mark)
const perfFee = manager.fees.collectPerformanceFee(fund, updatedPortfolio);
if (perfFee) {
  console.log('Performance fee collected:', perfFee.totalAmount.toString());
}
```

### Fee Structure

```
Management Fee: 2% annually (default)
Performance Fee: 20% of profits above high-water mark (default)

Fee Distribution:
  Fund Creator:        70% of fees
  Platform Treasury:   30% of fees
```

---

## Investor Demo

The Investor Demo Flow provides a structured, interactive demonstration of the platform's
full end-to-end investment lifecycle — from discovering strategies in the marketplace to
monitoring a live AI-managed fund. The demo runs in **5–10 minutes** and is suitable
for investor presentations, fundraising, partnership discussions, and community onboarding.

### How the Demo Works

The demo orchestrates six stages that mirror the real platform workflow:

```
Strategy Marketplace → AI Fund Manager → Agent Runtime → Live Trading Infrastructure
```

1. **Strategy Discovery** — Browse strategies in the Strategy Marketplace. Each strategy
   shows its creator, performance metrics (annual return, Sharpe ratio, max drawdown), and
   risk level. Investors select the strategies they want included in their fund.

2. **AI Fund Creation** — Configure the fund with selected strategies, capital allocation
   percentages, and initial capital. The AI Fund Manager automatically deploys the fund
   and creates an on-chain smart contract.

3. **Agent Deployment** — One strategy agent is launched per selected strategy via the
   Production Agent Runtime. Capital is distributed according to the allocation breakdown.
   Flow: `Investor → AI Fund Manager → Agent Runtime → Strategy Agents`

4. **Live Execution Simulation** — Market events and trading activity are simulated across
   all deployed agents. The demo shows executed trades, capital allocation changes, and
   real-time strategy performance.

5. **Performance Monitoring** — Investors see a dashboard with portfolio value, per-strategy
   performance, allocation breakdown, and profit and loss. Example output:
   ```
   Total Capital:  $100,000
   Current Value:  $104,200
   Return:         +4.20%
   ```

6. **Rebalancing Demonstration** — Shows automatic portfolio rebalancing triggered by
   performance drift. Adjusts strategy allocations and updates risk exposure — highlighting
   the platform's autonomous management capability.

### How Strategies Are Selected

Strategies are discovered in the Strategy Marketplace, which displays:

| Field | Description |
|-------|-------------|
| **Name** | Strategy display name |
| **Creator** | Strategy author / organization |
| **Annual Return** | Historical or simulated annualized return (%) |
| **Max Drawdown** | Worst peak-to-trough loss (%) |
| **Sharpe Ratio** | Risk-adjusted return metric |
| **Risk Level** | `low` / `medium` / `high` |

The default demo configuration includes three strategies with a total allocation of 100%:

| Strategy | Creator | Allocation | Risk |
|----------|---------|-----------|------|
| TON DCA Accumulator | AlphaLab | 40% | Low |
| DeFi Yield Optimizer | YieldDAO | 35% | Low |
| Cross-DEX Arbitrage | Quant42 | 25% | Medium |

### How Funds Are Created

```typescript
import { createFundInvestorDemoManager } from '@tonaiagent/core/investor-demo';

const demo = createFundInvestorDemoManager();

// Run the full 6-stage demo (investor presentation mode)
const session = await demo.runFullDemo({
  fundName: 'TON AI Diversified Fund',
  fundCapitalUsd: 100_000,
  includeRebalancing: true,
});

console.log('Fund ID:', session.summary?.fundId);
console.log('Return:', session.summary?.totalReturnPercent + '%');
console.log('Agents deployed:', session.summary?.agentCount);
```

You can also step through the demo stage by stage:

```typescript
const demo = createFundInvestorDemoManager();
const session = await demo.startSession({ fundCapitalUsd: 100_000 });

// Stage 1: Strategy Discovery
await demo.nextStage(session.sessionId);

// Stage 2: Fund Creation
await demo.nextStage(session.sessionId);

// ... continue for all 6 stages
```

### How Agents Execute Strategies

Once the fund is created, the AI Fund Manager deploys strategy agents through the
Production Agent Runtime. Each agent:

1. Receives its allocated capital from the fund
2. Loads its strategy configuration
3. Begins the 9-step execution pipeline (fetch market data → AI decision → risk validation → execute → log)
4. Reports performance metrics back to the Fund Manager

The demo simulates this entire flow with realistic trade data, market events, and
performance metrics — all in simulation mode (no real funds).

### How Performance Is Monitored

The performance dashboard provides real-time visibility into:

- **Portfolio value** — current total value vs. initial capital
- **Strategy performance** — per-agent P&L, return %, and trade count
- **Allocation breakdown** — current vs. target allocation percentages
- **Rebalancing status** — drift detection and automatic correction

Access the simulated dashboard at:
```
https://tonaiagent.com/funds/{fundId}/dashboard
```

### Running the Demo Locally

```bash
# Install dependencies
npm install

# Run the fund investor demo example
npx tsx examples/fund-investor-demo.ts
```

For the original 7-step individual agent demo (Issue #90):
```bash
npx tsx examples/investor-demo.ts
```

---

## Strategy Backtesting

> **Validate Before You Deploy**: The Strategy Backtesting Framework enables AI agents and developers to test strategies against historical data before committing live capital, generating structured performance reports and risk evaluations.

### Overview

The backtesting framework provides a complete pipeline from raw historical data to actionable strategy reports:

```
Historical Market Data (OHLCV, Trades, Order Books, Volatility)
                    |
          Historical Data Manager
                    |
         Market Replay Engine
       (event-driven sequential replay)
                    |
    Strategy Logic via onCandle() callback
                    |
       Simulated Trading Engine
  (slippage, fees, P&L tracking)
                    |
         Performance Analysis
   (Sharpe, Sortino, drawdown, VaR)
                    |
     Risk Evaluation (Risk Engine v1)
  (drawdown scenarios, concentration, grade)
                    |
       Structured Backtest Reports
```

### How Strategies Are Tested

Strategies are defined as an event-driven callback that receives each historical candle sequentially:

```typescript
import { createBacktestingFramework, DEFAULT_SLIPPAGE_MODEL, DEFAULT_FEE_MODEL, DEFAULT_FILL_MODEL } from '@tonaiagent/core/backtesting';

const framework = createBacktestingFramework();

const result = await framework.run({
  strategyId: 'dca_ton',
  strategyName: 'DCA TON',
  strategySpec: {
    assets: ['TON'],
    onCandle: async (candle, portfolio, placeOrder) => {
      // Buy $100 of TON each day
      if (portfolio.cash >= 100) {
        await placeOrder({ asset: 'TON', side: 'buy', type: 'market', amount: 100, amountType: 'usd' });
      }
    },
  },
  dataConfig: {
    type: 'synthetic',
    assets: ['TON'],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    granularity: '1d',
  },
  simulationConfig: {
    initialCapital: 10000,
    currency: 'USD',
    slippageModel: DEFAULT_SLIPPAGE_MODEL,
    feeModel: DEFAULT_FEE_MODEL,
    fillModel: DEFAULT_FILL_MODEL,
  },
  riskEvaluation: true,
  generateReport: true,
});
```

### How Historical Data Is Replayed

The Market Replay Engine processes data in strict chronological order:

1. Load OHLCV candles for all requested assets
2. Merge candles across assets and sort by timestamp
3. For each time step, call the strategy's `onCandle` callback with current prices
4. Strategy places simulated orders through the `placeOrder` API
5. Orders are executed against current prices with slippage and fees applied

**Supported data sources:** synthetic (Geometric Brownian Motion), JSON/CSV, external APIs.

### How Performance Metrics Are Calculated

| Metric | Description |
|--------|-------------|
| **Total Return** | `(ending_capital - starting_capital) / starting_capital × 100` |
| **Annualized Return** | Normalized to 365 days: `(1 + total)^(365/days) - 1` |
| **Sharpe Ratio** | Risk-adjusted return: `(R_p - R_f) / σ_p` |
| **Max Drawdown** | Largest peak-to-trough equity decline |
| **Win Rate** | Percentage of trades that were profitable |
| **Profit Factor** | Gross profit divided by gross loss |
| **VaR 95%** | Maximum loss at 95% confidence level |
| **Sortino Ratio** | Return per unit of downside risk only |

### How Risk Evaluation Is Performed

Risk evaluation integrates with Risk Engine v1 to assess:

1. **Drawdown Scenarios**: Simulates strategy survival through Market Correction (20%), Bear Market (40%), Crypto Crash (60%), and Flash Crash (30%) scenarios
2. **Asset Concentration Risk**: Flags allocations that exceed portfolio concentration limits
3. **Exposure Volatility**: Measures each asset's contribution to overall portfolio volatility
4. **Risk Grading**: Assigns A/B/C/D/F grade based on composite risk score (0-100)

```typescript
// Risk evaluation results
console.log(`Risk Grade: ${result.riskEvaluation.riskGrade}`);  // 'A' | 'B' | 'C' | 'D' | 'F'
console.log(`Passed: ${result.riskEvaluation.passed}`);
for (const rec of result.riskEvaluation.recommendations) {
  console.log(`[${rec.severity}] ${rec.description}`);
}
```

### Sample Backtest Report

```
Capital Start: 10,000 / Capital End: 13,450 / Return: +34.5% / Max Drawdown: -7.2% / Sharpe Ratio: 1.85

BACKTEST REPORT: DCA TON
===============================================================
PERFORMANCE METRICS
  Total Return:        34.50%
  Annualized Return:   70.21%
  Sharpe Ratio:        1.850
  Sortino Ratio:       2.100
  Max Drawdown:        7.20%
  Volatility (ann.):   22.50%

TRADE STATISTICS
  Total Trades:        182
  Win Rate:            60.4%
  Profit Factor:       2.18
  Total Fees Paid:     $120.50

RISK EVALUATION
  Risk Grade:          A
  Risk Score:          82/100
  Evaluation Status:   PASSED
```

### Marketplace Integration

The backtesting framework generates marketplace-ready metrics for the Strategy Marketplace:
- **Strategy Rating** (1–5 stars) based on backtested performance
- **Risk Category**: conservative / moderate / aggressive / speculative
- **Minimum Capital** requirements
- **Backtest Score** (0–100 composite)
- **Consistency Score** (0–100 return consistency)

**Full Backtesting Documentation**: [docs/backtesting.md](docs/backtesting.md)

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

## Risk Engine

> **Risk-Aware AI Investment Infrastructure**: The Risk Engine v1 introduces a critical safety layer for the TON AI Agent platform. It enables the platform to safely support AI hedge funds, automated portfolio management, institutional capital allocation, and large-scale strategy marketplaces — ensuring autonomous agents operate within **strict and transparent risk boundaries**.

The engine continuously evaluates risk exposure and enforces safety limits before and during trade execution.

### Architecture

```
AI Agents
     ↓
Live Trading Infrastructure
     ↓
Risk Engine
     ↓
Execution Approval / Rejection
```

Risk checks occur **before trade execution** and **during runtime monitoring**.

### Core Components

#### 1. Strategy Risk Evaluator (`src/risk-engine/strategy-risk-evaluator.ts`)

Evaluates each strategy's risk profile before deployment using weighted composite scoring:

| Metric | Weight | Description |
|--------|--------|-------------|
| **Volatility** | 25% | Annualized price volatility |
| **Max Drawdown** | 30% | Maximum historical drawdown |
| **Leverage Usage** | 20% | Current leverage multiplier |
| **Asset Concentration** | 15% | Top asset concentration fraction |
| **Historical Stability** | 10% | Inverted: lower stability = higher risk |

#### 2. Real-Time Exposure Monitor (`src/risk-engine/exposure-monitor.ts`)

Continuously tracks portfolio exposure per asset, strategy allocations within funds, capital concentration risks, and unrealized losses. Emits alerts when thresholds are exceeded.

#### 3. Risk Limits Enforcer (`src/risk-engine/risk-limits.ts`)

Enforces configurable limits:

| Limit | Default | Action |
|-------|---------|--------|
| **Max position size** | 20% of portfolio | Reduce |
| **Max leverage** | 5x | Block |
| **Max portfolio drawdown** | 15% | Rebalance |
| **Max strategy allocation** | 30% of fund | Reduce |

#### 4. Automated Risk Response (`src/risk-engine/risk-response.ts`)

When risk thresholds are breached, the engine triggers automated responses:

- **Rebalancing** — restore asset allocation targets
- **Position Reduction** — reduce oversized positions
- **Strategy Pause** — halt strategy execution temporarily
- **Emergency Shutdown** — full agent shutdown for critical risk

Response thresholds:

| Risk Score | Category | Triggered Response |
|------------|----------|--------------------|
| 0–30 | Low | No response |
| 31–60 | Moderate | No response |
| 61–80 | High | Pause strategy + reduce position |
| 81–100 | Critical | Emergency shutdown + pause strategy |

#### 5. Risk Scoring Model (`src/risk-engine/risk-scorer.ts`)

Maintains dynamic risk scores for strategies, funds, and agent portfolios:

```
Risk Score:
  0–30   → Low Risk
  31–60  → Moderate Risk
  61–80  → High Risk
  81–100 → Critical Risk
```

Scores update continuously based on current market conditions and exposure.

#### 6. Risk Dashboard Integration (`src/risk-engine/risk-dashboard.ts`)

Exposes risk metrics for transparency:

- Portfolio risk exposure per agent
- Strategy risk ratings
- Drawdown alerts
- Leverage monitoring
- Overall system risk score

### Quick Example

```typescript
import { createRiskEngine } from '@tonaiagent/core/risk-engine';

const riskEngine = createRiskEngine({
  riskLimits: {
    maxPositionSizePercent: 20,
    maxLeverageRatio: 5,
    maxPortfolioDrawdownPercent: 15,
    maxStrategyAllocationPercent: 30,
  },
  autoResponse: {
    enableAutoRebalance: true,
    enableAutoPauseStrategy: true,
    enableEmergencyShutdown: true,
    criticalScoreThreshold: 81,
  },
});

// Evaluate a strategy before deployment
const profile = riskEngine.strategyEvaluator.evaluate({
  strategyId: 'strategy_001',
  volatility: 0.25,
  maxDrawdown: 0.15,
  leverageRatio: 2.0,
  assetConcentration: 0.40,
  historicalStability: 0.80,
});
console.log('Risk score:', profile.riskScore.value, '/', 100);
// Risk score: 28 / 100 (low)

// Monitor portfolio exposure in real-time
riskEngine.exposureMonitor.update({
  agentId: 'agent_001',
  totalValue: 100000,
  assetExposures: [
    { assetId: 'TON', value: 40000 },
    { assetId: 'USDT', value: 60000 },
  ],
  unrealizedLosses: 5000,
});

// Check risk limits before trade execution
const limitCheck = riskEngine.riskLimits.check({
  entityId: 'agent_001',
  entityType: 'agent',
  positionSizePercent: 25,  // exceeds 20% limit
  leverageRatio: 3,
});

if (!limitCheck.passed) {
  console.log('Trade blocked:', limitCheck.violations[0].message);
  // Trade blocked: Position size 25.00% exceeds limit of 20%. Action: reduce.
}

// Subscribe to risk events
riskEngine.onEvent(event => {
  if (event.type === 'risk_response_triggered') {
    console.log('Automated risk response:', event.payload);
  }
});
```

### Demo Flow

The risk engine can be demonstrated by:

1. Launching strategies with different risk levels (low / moderate / high / critical)
2. Triggering simulated market volatility (increasing drawdown and leverage)
3. Exceeding a risk threshold (e.g., leverage > 5x)
4. Watching automatic risk responses (position reduction, strategy pause, or emergency shutdown)

This proves the platform can **protect investor capital automatically**.

---

## Developer SDK

The Agent Developer SDK (Issue #158) provides a complete, standardized framework for building, testing, and deploying autonomous trading agents on the TON AI Agent platform.

### Architecture

```
Developer → Agent SDK → Agent Runtime API → Production Agent Runtime → Trading Infrastructure
```

### Core Components

| Component | Description |
|-----------|-------------|
| **Agent Development Framework** | Standardized agent structure: strategy, risk_rules, execution_logic, configuration, event_handlers |
| **Runtime Integration API** | `getMarketData()`, `placeOrder()`, `getPortfolio()`, `allocateCapital()`, `getRiskMetrics()` |
| **Strategy Development Toolkit** | Templates, example algorithms, risk configuration helpers, execution utilities |
| **Backtesting Compatibility Layer** | `simulate()`, `analyze()`, `validate()` agents against historical data |

### Creating an Agent

Every agent follows a standardized five-pillar structure:

```typescript
import {
  createAgentFramework,
  createStrategyToolkit,
  ExampleAlgorithms,
  type AgentDefinition,
} from '@tonaiagent/core/sdk';

const framework = createAgentFramework();
const toolkit = createStrategyToolkit();

const agent: AgentDefinition = framework.defineAgent({
  id: 'my-dca-agent',
  name: 'Daily DCA Bot',
  version: '1.0.0',
  author: { name: 'Your Name' },

  // 1. Strategy — what the agent does
  strategy: {
    type: 'dca',
    parameters: { asset: 'TON', amountPerExecution: 100 },
    intervalMs: 24 * 60 * 60 * 1000, // daily
  },

  // 2. Risk rules — safety guardrails
  risk_rules: toolkit.buildRiskRules()
    .conservative()
    .withStopLoss(5)
    .withMaxDailyLoss(200)
    .build(),

  // 3. Execution logic — the actual trading function
  execution_logic: ExampleAlgorithms.dca('TON', 100),

  // 4. Configuration — environment and runtime settings
  configuration: {
    environment: 'sandbox',
    simulationMode: true,
    initialCapital: 10000,
  },

  // 5. Event handlers — lifecycle and monitoring
  event_handlers: {
    onStart: () => console.log('Agent started'),
    onStop: () => console.log('Agent stopped'),
    onError: (err) => console.error('Error:', err),
  },
});
```

### Strategy Integration

The Runtime Integration API gives your execution logic access to live market data and trading operations:

```typescript
import { createRuntimeAPI } from '@tonaiagent/core/sdk';

// Simulation mode (safe for development)
const api = createRuntimeAPI({ simulationMode: true, initialSimulationBalance: 10000 });

// In your execution_logic:
const agent = framework.defineAgent({
  // ...
  execution_logic: async (context) => {
    // Get real-time market data
    const ton = await context.getMarketData('TON');
    console.log('TON price:', ton.current, 'RSI:', ton.rsi14);

    // Get current portfolio
    const portfolio = await context.getPortfolio();
    console.log('Available balance:', portfolio.availableBalance);

    // Place orders based on strategy signals
    if (ton.rsi14 && ton.rsi14 < 30) {
      await context.placeOrder({
        asset: 'TON',
        side: 'buy',
        amount: 100,
        type: 'market',
      });
    }

    // Check risk metrics
    const risk = await context.getRiskMetrics();
    if (risk.circuitBreakerActive) {
      console.warn('Circuit breaker active — halting execution');
    }
  },
  // ...
});
```

### Runtime API Reference

| Function | Description |
|----------|-------------|
| `getMarketData(asset)` | Current price, RSI, moving averages, volume, bid/ask |
| `placeOrder(order)` | Execute buy/sell orders with slippage control |
| `getPortfolio()` | Balances, positions, realized/unrealized PnL |
| `allocateCapital(allocation)` | Smart capital distribution (fixed or percent mode) |
| `getRiskMetrics()` | Drawdown, VaR, Sharpe ratio, circuit breaker status |

### Strategy Templates

Pre-built templates accelerate development:

```typescript
import { createStrategyToolkit, ExampleAlgorithms } from '@tonaiagent/core/sdk';

const toolkit = createStrategyToolkit();

// List available templates
const templates = toolkit.listTemplates();
// [dca-basic, momentum-rsi, ma-crossover, yield-optimizer]

// Create agent from template
const agent = toolkit.fromTemplate('momentum-rsi', {
  id: 'my-momentum',
  name: 'RSI Momentum Bot',
  version: '1.0.0',
  execution_logic: ExampleAlgorithms.momentum('TON', 30, 70, 10),
  event_handlers: {},
});
```

**Available Templates:**

| Template ID | Strategy | Complexity |
|-------------|----------|------------|
| `dca-basic` | Dollar-Cost Averaging | Beginner |
| `momentum-rsi` | RSI Momentum (buy oversold, sell overbought) | Intermediate |
| `ma-crossover` | Moving Average Crossover (trend following) | Intermediate |
| `yield-optimizer` | Yield farming with weekly rebalancing | Advanced |

### Execution Utilities

Technical analysis functions for strategy logic:

```typescript
const toolkit = createStrategyToolkit();

// Technical indicators
const prices = [2.5, 2.6, 2.4, 2.7, 2.8, 2.65];
const sma20 = toolkit.utils.simpleMovingAverage(prices, 20);
const ema12 = toolkit.utils.exponentialMovingAverage(prices, 12);
const rsi = toolkit.utils.rsi(prices, 14);
const bands = toolkit.utils.bollingerBands(prices, 20, 2);
const macd = toolkit.utils.macd(prices, 12, 26, 9);

// Position sizing (risk-based)
const units = toolkit.utils.positionSize({
  portfolioValue: 10000,
  riskPercent: 2,     // risk 2% of portfolio
  entryPrice: 2.50,
  stopLossPrice: 2.25,
});
// units = 80 (risk $200 / $0.25 per unit)

// Signal detection
const isBullish = toolkit.utils.isCrossover(fastMAs, slowMAs);
const isBearish = toolkit.utils.isCrossunder(fastMAs, slowMAs);
```

### Backtesting

Test your agent against historical data before deploying:

```typescript
import { createBacktestingCompat } from '@tonaiagent/core/sdk';

const backtester = createBacktestingCompat();

// Run backtest
const result = await backtester.simulate(agent, {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-31'),
  initialBalance: 10000,
  assets: ['TON'],
  stepMs: 24 * 60 * 60 * 1000,   // daily steps
  tradingFeePercent: 0.1,          // 0.1% fee
});

// Analyze results
console.log(backtester.analyze(result));
// Backtest Analysis: my-dca-agent
// ────────────────────────────────────────
// Period: Mon Jan 01 2024 → Sun Mar 31 2024
// Final Value: 10850.00 (+8.50%)
// Sharpe Ratio: 1.42
// Max Drawdown: 6.30%
// Win Rate: 62.5%

// Validate before deploying to production
const validation = backtester.validate(result, {
  minSharpeRatio: 1.0,
  maxDrawdownPercent: 15,
  minWinRate: 0.45,
});

if (validation.passed) {
  console.log('Ready for production deployment!');
  const deployment = await framework.deploy(agent, { mode: 'production' });
}
```

### Marketplace Publishing

Deploy your agent to the Strategy Marketplace:

```typescript
// 1. Define and validate your agent
const validation = framework.validate(agent);
if (!validation.valid) throw new Error(validation.errors.map(e => e.message).join(', '));

// 2. Run and pass backtesting validation
const result = await backtester.simulate(agent, { ... });
const btValidation = backtester.validate(result, { minSharpeRatio: 1.0, maxDrawdownPercent: 20 });

// 3. Deploy to sandbox for live testing
const sandboxDeploy = await framework.deploy(agent, { mode: 'sandbox' });

// 4. Promote to production and publish to marketplace
const prodDeploy = await framework.deploy(agent, { mode: 'production' });
// Now visible in Strategy Marketplace for copy trading
```

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

## Autonomous Strategy Discovery

> **Self-Improving Strategy Ecosystem**: The Autonomous Strategy Discovery Engine uses AI models to continuously generate, test, and evaluate new investment strategies — creating a living, self-evolving financial laboratory.

The engine operates as a closed-loop autonomous pipeline:

```
AI Strategy Generator
        ↓
Backtesting Framework (#155)
        ↓
Risk Engine (#154)
        ↓
Strategy Ranking System (#159)
        ↓
Strategy Marketplace (#150)
```

### How AI Generates Strategies

The **Strategy Generation Engine** produces candidate strategies using four AI-driven approaches:

| Approach | Description |
|----------|-------------|
| `evolutionary` | Combines RSI, momentum, and volume indicators with genetic mutation |
| `parameter_optimization` | Tunes DCA parameters (buy amount, intervals) for optimal performance |
| `ai_rule_generation` | Creates MACD + trend-confirmation hybrid strategies |
| `template_mutation` | Mutates existing portfolio rebalancing templates |

Each approach generates strategies with dynamically adjusted risk controls, capital allocation, and position sizing based on the configured risk level (`low`, `medium`, `high`, `critical`).

### How Strategies Are Tested Automatically

Every generated candidate passes through the **Discovery Pipeline**:

1. **Backtesting** — Runs a 90-day historical simulation using the `BacktestingEngine` with synthetic price data (or real data if a `HistoricalDataProvider` is configured)
2. **Risk Filtering** — Applies configurable drawdown, stability, and leverage filters
3. **Performance Evaluation** — Scores candidates using a weighted composite metric: ROI (30%), Sharpe ratio (30%), max drawdown (25%), win rate (15%)

Only strategies meeting all thresholds advance to the next stage.

### How Risk Filtering Works

The **Risk Filter** applies three independent checks:

| Check | Default | Description |
|-------|---------|-------------|
| Max drawdown | 35% | Rejects strategies with excessive loss exposure |
| Stability score | 0.3 | Requires minimum return consistency (Sharpe + drawdown derived) |
| Min thresholds | ROI ≥ 5%, Sharpe ≥ 0.5 | Evaluates against configurable performance thresholds |

Strategies failing any check are discarded with a labeled rejection reason (`excessive_drawdown`, `unstable_returns`, `low_sharpe`, etc.).

### How Successful Strategies Appear in the Marketplace

The **Strategy Publisher** automatically publishes top-scoring strategies to the marketplace:

- Only strategies with `status === 'passed'` and score above `publishThreshold` (default: 65) are submitted
- Published strategies include full backtest metadata (ROI, Sharpe, drawdown, win rate)
- The publisher integrates with any `MarketplacePublisher`-compatible interface (including `DefaultMarketplaceService`)
- Unpublished strategies remain in the **Elite Pool** for future evolutionary cycles

### Continuous Learning System

The engine improves over time by tracking:

- **Successful strategies**: Records which approaches and risk levels produce the best results
- **Market condition correlation**: Links strategy performance to inferred market conditions (bullish/bearish/volatile)
- **Sample merging**: Aggregates learning across multiple strategies with weighted averaging

Insights from the learning system guide candidate generation in subsequent cycles — the engine learns which approaches work best and biases generation accordingly.

### Quick Start

```typescript
import { createAutonomousDiscoveryEngine } from '@tonaiagent/core/autonomous-discovery';

const engine = createAutonomousDiscoveryEngine({
  maxCandidatesPerCycle: 10,
  cycleIntervalMs: 3600000, // 1 hour
  autoPublish: true,
  publishThreshold: 70,
  evaluationThresholds: {
    minROI: 5,
    minSharpe: 0.5,
    maxDrawdown: 30,
    minWinRate: 0.4,
    minTrades: 5,
  },
});

// Subscribe to discovery events
engine.onEvent((event) => {
  console.log(`[${event.type}]`, event.data);
});

// Run a single discovery cycle
const cycle = await engine.runCycle();
console.log(`Generated: ${cycle.candidatesGenerated}, Passed: ${cycle.evaluationsPassed}, Published: ${cycle.published}`);

// Start automatic cycling (every hour)
engine.start();

// Access the elite pool of best strategies
const elite = engine.getElitePool();

// Get learning insights
const insights = engine.getLearningInsights();
console.log('Best approaches:', insights.topApproaches);

engine.stop();
```

### Success Metrics

| Metric | Description |
|--------|-------------|
| Strategies generated | Total candidates produced per cycle |
| Pass rate | Percentage passing risk + evaluation filters |
| Elite pool size | Number of top strategies retained across cycles |
| Published strategies | Strategies submitted to the marketplace |
| Learning records | Insights accumulated for self-improvement |

---

## Cross-Chain Liquidity

The Cross-Chain Liquidity Integration Layer enables AI agents and strategies to access, aggregate, and trade liquidity across multiple blockchain ecosystems — TON, Ethereum, BNB Chain, Solana, Polygon, Avalanche, Arbitrum, and Optimism.

### Architecture

```
Multi-Chain DEXes ──┐
Cross-Chain Bridges ─┤──► LiquidityAggregator ──► TradeExecutor ──► Portfolio
DeFi Protocols ─────┘          ▲                      │               │
                                │                      ▼               ▼
                          ConnectorRegistry      RiskMonitor    PerformanceMetrics
                                │
                         TON / ETH / BNB / SOL
```

### Components

| Component | Description |
|-----------|-------------|
| `CrossChainConnectorRegistry` | Modular connector framework; each chain implements `connect()`, `getLiquidityPools()`, `getTokenPrices()`, `executeSwap()`, `checkTransactionStatus()` |
| `LiquidityAggregationEngine` | Aggregates DEX pools, bridges, and DeFi protocols; routes orders by `best_price`, `lowest_gas`, `min_slippage`, `split_optimal`, or `max_liquidity` |
| `CrossChainTradeExecutor` | Executes single-chain swaps, cross-chain swaps (bridge + swap), and arbitrage strategies; tracks all trades with full execution history |
| `MultiChainPortfolioTracker` | Tracks token balances, LP positions, cross-chain transaction history, and per-chain strategy performance |
| `CrossChainRiskMonitor` | Enforces risk limits (slippage, trade size, daily volume, bridge time); scans for bridge risks, liquidity fragmentation, and oracle deviation |
| `CrossChainPluginLayer` | Agent plugin system integration; includes built-in arbitrage scanner, liquidity scanner, and analytics plugins |

### Quick Start

```typescript
import { createCrossChainLiquidityManager } from '@tonaiagent/core/cross-chain-liquidity';

// Create manager with 4 chains
const manager = createCrossChainLiquidityManager({
  connectors: [
    { chainId: 'ton',      enabled: true },
    { chainId: 'ethereum', enabled: true },
    { chainId: 'bnb',      enabled: true },
    { chainId: 'solana',   enabled: true },
  ],
  defaultAggregationMode: 'best_price',
  riskMonitoringEnabled: true,
  autoArbitrage: false,
  minArbitrageProfitUsd: 50,
});

// Connect to all chains
const statuses = await manager.connect();
console.log('Connected chains:', statuses.filter(s => s.status === 'connected').map(s => s.chainId));

// Get quote for a cross-chain swap
const tonToken  = { address: 'native', chainId: 'ton',      symbol: 'TON',  name: 'Toncoin',   decimals: 9  };
const ethToken  = { address: 'native', chainId: 'ethereum', symbol: 'ETH',  name: 'Ether',     decimals: 18 };

const quote = await manager.getQuote(tonToken, ethToken, 1000 /* USD */);
console.log('Best route:', quote.bestRoute.legs.map(l => `${l.fromChainId} → ${l.toChainId}`).join(', '));
console.log('Amount out:', quote.bestRoute.totalAmountOut.toFixed(6), 'ETH');

// Execute the trade
const trade = await manager.executeTrade(
  {
    id: 'trade-1',
    type: 'cross_chain_swap',
    fromToken: tonToken,
    toToken: ethToken,
    amountIn: 1000,
    minAmountOut: 0.25,
    slippageTolerance: 0.01,
    priority: 'high',
  },
  quote.bestRoute
);
console.log('Trade status:', trade.status, '— received', trade.amountOut.toFixed(6), 'ETH');

// Sync portfolio across all chains
const portfolio = await manager.syncPortfolio('my-agent-id');
console.log('Total portfolio value:', portfolio.totalValueUsd.toFixed(2), 'USD');
console.log('Chain allocations:', portfolio.chainAllocations.map(
  a => `${a.chainId}: ${(a.percent * 100).toFixed(1)}%`
).join(', '));

// Scan for arbitrage opportunities
const opportunities = await manager.scanArbitrage([tonToken, ethToken]);
const profitable = opportunities.filter(o => o.netProfitUsd > 50);
console.log(`Found ${profitable.length} profitable arbitrage opportunities`);

// System health
const health = manager.getHealth();
console.log('Chains online:', health.connectedChains.length);
console.log('Total liquidity:', health.totalLiquidityUsd.toLocaleString(), 'USD');
console.log('Active risk alerts:', health.riskAlerts.length);
```

### Plugin Integration

The plugin layer integrates with the AI agent system, exposing cross-chain capabilities as plugins:

```typescript
// Using built-in plugins
const pluginLayer = manager.getPluginLayer();

const context = {
  agentId: 'my-agent',
  chainIds: ['ton', 'ethereum', 'bnb', 'solana'],
  tokens: [tonToken, ethToken],
  executor: manager.getExecutor(),
  aggregator: manager.getAggregator(),
  portfolioTracker: manager.getPortfolioTracker(),
  riskMonitor: manager.getRiskMonitor(),
};

// Run arbitrage scanner
const arbResult = await pluginLayer.execute('cross-chain-arbitrage-scanner', context);
console.log('Arbitrage opportunities:', arbResult.data.opportunitiesFound);

// Run liquidity scanner
const liqResult = await pluginLayer.execute('cross-chain-liquidity-scanner', context);
console.log('Total liquidity found:', liqResult.data.totalLiquidityUsd, 'USD');

// Run cross-chain analytics
const analyticsResult = await pluginLayer.execute('cross-chain-analytics', context);
console.log('Portfolio tracked:', analyticsResult.data.portfolioValueUsd, 'USD');
```

### Risk Controls

The risk monitor validates every trade before execution and continuously scans for risks:

| Risk Category | Description | Action |
|---------------|-------------|--------|
| Bridge Risk | Smart contract or liquidity risk on bridges | Alert + block trade |
| Liquidity Fragmentation | Insufficient pool depth | Alert + reroute |
| Transaction Delay | Slow cross-chain confirmations | Alert + warn |
| Slippage Risk | Excessive price impact | Block trade |
| Oracle Deviation | Price feed discrepancy | Alert |
| Smart Contract Risk | DEX/bridge vulnerability | Alert |

### Observability

| Metric | Description |
|--------|-------------|
| Connected chains | Number of active chain connections |
| Total liquidity | Aggregated USD liquidity across all sources |
| Active trades | Currently in-progress trade executions |
| Arbitrage found | Opportunities identified (lifetime) |
| Success rate | Ratio of completed vs. total trades |
| Average trade time | Mean execution time in milliseconds |

---

## Strategy Engine

The Strategy Engine v1 is the decision-making layer that sits between the Agent Runtime Core and the Trading Engine. It enables agents to load configurable trading strategies, process market data, and generate trade signals that trigger simulated (or real) trades.

### Architecture

```
Agent Runtime
      |
Strategy Engine
      |
 TrendStrategy   ArbitrageStrategy   AISignalStrategy
      |
Trading Engine
```

### Core Components

| Component | Description |
|-----------|-------------|
| **StrategyInterface** | Common contract all strategies must implement — `getMetadata()` and `execute(marketData, params)` returning a `TradeSignal` |
| **StrategyRegistry** | Maintains a registry of available strategy classes, powering agent creation and future marketplace integration |
| **StrategyLoader** | Discovers and loads strategy classes, auto-registering the three built-in core strategies |
| **StrategyExecutionEngine** | Pipeline: Receive Market Data → Load Strategy → Run Strategy Logic → Generate Signal → Send to Trading Engine |
| **Strategy Parameter System** | Each strategy declares typed, validated parameters with defaults — `asset`, `movingAveragePeriods`, `rsiPeriod`, etc. |

### Three Built-in Strategies

#### TrendStrategy (`id: "trend"`)
Buy if the current price is above the simple moving average; sell if below.

```typescript
import { createStrategyRegistry, createStrategyLoader, createStrategyExecutionEngine } from '@tonaiagent/core/strategy-engine';

const registry = createStrategyRegistry();
const loader = createStrategyLoader(registry);
loader.loadBuiltIns(); // registers: trend, arbitrage, ai-signal

const engine = createStrategyExecutionEngine(registry);
engine.start();

const result = await engine.execute({
  strategyId: 'trend',
  agentId: 'agent-001',
  marketData: {
    prices: { TON: { asset: 'TON', price: 2.85, volume24h: 1_000_000, timestamp: new Date() } },
    source: 'live',
    fetchedAt: new Date(),
  },
  params: { movingAveragePeriods: 14, asset: 'TON' },
});

console.log(result.signal);
// { action: 'BUY', asset: 'TON', amount: '100000000', confidence: 0.72, reason: '...' }
```

Parameters:
- `asset` (string, default: `"TON"`) — asset to trade
- `movingAveragePeriods` (number, default: `14`) — SMA window size
- `tradeAmount` (string, default: `"100000000"`) — trade size in nanoTON

#### ArbitrageStrategy (`id: "arbitrage"`)
Detects price differences between simulated exchanges and generates a BUY signal when a profitable spread exceeds the threshold.

Parameters:
- `asset` (string, default: `"TON"`) — asset to scan
- `minSpreadPct` (number, default: `0.1`) — minimum spread % to trigger BUY
- `tradeAmount` (string, default: `"100000000"`) — trade size in nanoTON

#### AISignalStrategy (`id: "ai-signal"`)
Uses RSI and MACD technical indicators: BUY if RSI < 30 (oversold), SELL if RSI > 70 (overbought). MACD crossover confirmation adjusts confidence.

Parameters:
- `asset` (string, default: `"TON"`) — asset to analyze
- `rsiPeriod` (number, default: `14`) — RSI window size
- `oversoldThreshold` (number, default: `30`) — RSI BUY trigger
- `overboughtThreshold` (number, default: `70`) — RSI SELL trigger
- `tradeAmount` (string, default: `"100000000"`) — trade size in nanoTON

### Trade Signal Format

All strategies return a `TradeSignal`:

```typescript
{
  action: 'BUY' | 'SELL' | 'HOLD';
  asset: string;           // e.g. "TON"
  amount: string;          // in nanoTON, as string for precision
  confidence: number;      // 0–1
  reason: string;          // human-readable explanation
  strategyId: string;      // e.g. "trend"
  generatedAt: Date;
  metadata?: Record<string, unknown>; // indicators, prices, etc.
}
```

### Custom Strategies

Implement `StrategyInterface` (or extend `BaseStrategy`) and register with the loader:

```typescript
import { BaseStrategy, createStrategyLoader } from '@tonaiagent/core/strategy-engine';

class MyStrategy extends BaseStrategy {
  getMetadata() {
    return {
      id: 'my-strategy',
      name: 'My Custom Strategy',
      description: 'A custom trading strategy',
      version: '1.0.0',
      params: [{ name: 'threshold', type: 'number', defaultValue: 0.5, description: 'Signal threshold' }],
      supportedAssets: ['TON'],
    };
  }

  async execute(marketData, params) {
    const resolved = this.mergeParams(params);
    const price = this.getPrice(marketData, 'TON');
    return {
      action: price > resolved.threshold ? 'BUY' : 'HOLD',
      asset: 'TON',
      amount: '100000000',
      confidence: 0.75,
      reason: `Price ${price} vs threshold ${resolved.threshold}`,
      strategyId: this.getMetadata().id,
      generatedAt: new Date(),
    };
  }
}

const loader = createStrategyLoader(registry);
loader.registerCustom(MyStrategy);
```

### Integration with Agent Runtime

```typescript
import { createAgentRuntimeOrchestrator } from '@tonaiagent/core/agent-runtime';
import { createStrategyRegistry, createStrategyLoader, createStrategyExecutionEngine } from '@tonaiagent/core/strategy-engine';

const registry = createStrategyRegistry();
const loader = createStrategyLoader(registry);
loader.loadBuiltIns();

const strategyEngine = createStrategyExecutionEngine(registry);
strategyEngine.start();

const runtime = createAgentRuntimeOrchestrator();
runtime.start();

runtime.registerAgent({
  agentId: 'agent-001',
  name: 'Trend Bot',
  ownerId: 'tg_user_123',
  ownerAddress: 'EQD...',
  strategyIds: ['trend'],
  simulation: { enabled: true, fakeBalance: BigInt(10_000_000_000) },
  riskLimits: { /* ... */ },
  maxConcurrentExecutions: 2,
  enableObservability: true,
});

runtime.fundAgent('agent-001', BigInt(5_000_000_000));
await runtime.startAgent('agent-001');
const result = await runtime.runPipeline('agent-001', 'trend');
```


---

## Market Data Layer

The Market Data Layer is the **data backbone of the platform** — a unified system for fetching, normalizing, caching, and distributing real-time cryptocurrency price data to agents and strategies.

### Architecture

```
External APIs (CoinGecko, Binance)
         |
Market Data Providers
         |
Data Normalizer (built into each provider)
         |
Cache Layer (30s TTL in-memory cache)
         |
Market Data Service
         |
Strategy Engine
```

### How Market Data is Fetched

The  orchestrates provider selection with automatic fallback:

1. **Cache check** — if a fresh price is cached (within TTL), return immediately
2. **Primary provider** — fetch from CoinGecko (default) or Binance
3. **Automatic fallback** — if the primary provider fails, transparently switch to the secondary provider
4. **Cache store** — save the result to avoid redundant API calls

```typescript
import { createMarketDataService } from '@tonaiagent/core/market-data';

const service = createMarketDataService();
service.start();

// Fetch a single asset price
const result = await service.getPrice('BTC');
console.log(result.price);
// { asset: 'BTC', price: 65000, volume24h: 25000000000, source: 'coingecko', timestamp: 1710000000 }
console.log(result.fromCache); // false (first call)
console.log(result.usedFallback); // false

// Second call within TTL returns from cache
const cached = await service.getPrice('BTC');
console.log(cached.fromCache); // true
```

### Supported Providers

#### CoinGecko (default primary)

Simple and free price data from the public CoinGecko API.

- Endpoint: 
- Docs: https://www.coingecko.com/en/api/documentation
- Auth: None required (free-tier public API)

```typescript
import { createCoinGeckoProvider } from '@tonaiagent/core/market-data';

const provider = createCoinGeckoProvider();
const price = await provider.getPrice('TON');
const ticker = await provider.getTicker('BTC'); // includes high/low/volume
```

#### Binance (default fallback)

Exchange-level price data from the Binance public API.

- Endpoint: 
- Docs: https://binance-docs.github.io/apidocs/spot/en/
- Auth: None required (public endpoints)

```typescript
import { createBinanceProvider } from '@tonaiagent/core/market-data';

const provider = createBinanceProvider();
const price = await provider.getPrice('BTC');
```

### Caching Mechanism

The cache layer prevents excessive API calls using an in-memory store with configurable TTL:

| Parameter | Default | Description |
|-----------|---------|-------------|
|  |  | How long a cached price is considered fresh |
|  |  | Maximum cache entries (oldest evicted at capacity) |

```typescript
import { createMarketDataService } from '@tonaiagent/core/market-data';

const service = createMarketDataService({
  primaryProvider: 'coingecko',
  fallbackProvider: 'binance',
  cache: { ttlSeconds: 60, maxEntries: 200 },
});
```

### Supported Assets (MVP)

| Symbol | CoinGecko ID | Binance Pair |
|--------|-------------|--------------|
| BTC |  |  |
| ETH |  |  |
| TON |  |  |
| SOL |  |  |
| USDT |  |  |

### Normalized Data Format

All providers normalize their responses to the common  format:

```typescript
{
  asset: 'BTC',              // asset symbol
  price: 65000,              // current price in USD
  volume24h: 25000000000,    // 24h trading volume in USD
  priceChange24h: 1.5,       // 24h price change %
  marketCap: 1200000000000,  // market cap in USD (if available)
  timestamp: 1710000000,     // UNIX timestamp (seconds)
  source: 'coingecko',       // data provider name
}
```

### Integration with Strategy Engine

The  method returns a  that is directly compatible with the Strategy Engine's  type:

```typescript
import { createMarketDataService } from '@tonaiagent/core/market-data';
import {
  createStrategyRegistry,
  createStrategyLoader,
  createStrategyExecutionEngine,
} from '@tonaiagent/core/strategy-engine';

// Set up market data
const marketDataService = createMarketDataService();
marketDataService.start();

// Set up strategy engine
const registry = createStrategyRegistry();
const loader = createStrategyLoader(registry);
loader.loadBuiltIns();

const engine = createStrategyExecutionEngine(registry);
engine.start();

// Fetch live market data and feed it to the strategy engine
const snapshot = await marketDataService.getSnapshot();

const result = await engine.execute({
  strategyId: 'trend',
  agentId: 'agent-001',
  marketData: snapshot, // ← MarketDataSnapshot is compatible with MarketData
  params: { asset: 'TON', movingAveragePeriods: 14 },
});

console.log(result.signal);
// { action: 'BUY', asset: 'TON', amount: '100000000', confidence: 0.72, ... }
```

### Custom Providers

Implement  (or extend ) to add a new data source:

```typescript
import { BaseMarketDataProvider } from '@tonaiagent/core/market-data';
import type { NormalizedPrice, Ticker } from '@tonaiagent/core/market-data';

class MyProvider extends BaseMarketDataProvider {
  getName() { return 'coingecko' as const; }

  async getPrice(asset: string): Promise<NormalizedPrice> {
    this.validateAsset(asset); // throws ASSET_NOT_SUPPORTED if invalid
    // ... fetch and normalize
    return { asset, price: ..., volume24h: ..., timestamp: this.nowSeconds(), source: 'my-provider' };
  }

  async getTicker(asset: string): Promise<Ticker> { ... }

  getSupportedAssets(): string[] {
    return ['BTC', 'ETH', 'TON', 'SOL', 'USDT'];
  }
}

const service = createMarketDataService({}, { coingecko: new MyProvider() });
```

---

## Trading Engine

The Trading Engine is the **execution layer** that sits between the Strategy Engine and the Portfolio Manager. It simulates trades in real-time, updates portfolio balances, and records every trade for analytics.

### Architecture

```
Strategy Engine
      |
Trading Engine         ← simulation layer
      |
 ┌────┴─────┐
 |          |
Portfolio   Trade
Manager   Executor (Simulation)
      |
Trade History Repository
      |
Portfolio Analytics
```

### Quick Start

```typescript
import { createTradingEngine } from '@tonaiagent/core/trading-engine';

const engine = createTradingEngine();
engine.start();

engine.initPortfolio('agent-001', { USD: 10000, BTC: 0, ETH: 0 });

const result = await engine.processSignal(
  { action: 'BUY', asset: 'BTC', amount: '0.01', confidence: 0.8,
    reason: 'Trend detected', strategyId: 'trend', generatedAt: new Date() },
  'agent-001',
  { BTC: 65000 }
);
// result.status === 'executed'
// result.trade.value === 650

const pnl = engine.calculatePnL('agent-001', { BTC: 66000 });
// pnl.unrealizedPnl === 10  (0.01 BTC × $1000 price increase)
// pnl.roiPercent === 0.1
```

### Components

| File | Description |
|---|---|
| `types.ts` | All type definitions: `Portfolio`, `TradeRecord`, `TradeExecutionResult`, `PnLSummary`, `TradingEngineConfig`, events, errors |
| `portfolio-manager.ts` | `DefaultPortfolioManager` — per-agent in-memory balance tracking with snapshot, delta updates, and event pub/sub |
| `trade-history-repository.ts` | `DefaultTradeHistoryRepository` — in-memory trade record storage with per-agent limits and query methods |
| `trade-executor.ts` | `SimulationTradeExecutor` — executes BUY/SELL signals at market price, validates balance, records trades |
| `trading-engine.ts` | `TradingEngine` — core orchestrator: signal processing pipeline, portfolio initialization, PnL calculation, metrics, events |
| `index.ts` | Module entry point with JSDoc quick-start examples and integration guide |

---

## Portfolio & Analytics

The Portfolio Analytics layer is the **data interface between backend and UI**. It exposes structured portfolio data via REST API, computes advanced performance metrics, and powers dashboards, investor reports, and strategy rankings.

### Architecture

```
Agent Runtime
      │
Trading Engine
      │
Portfolio Manager
      │
Portfolio API          ← REST endpoints
      │
Analytics Engine       ← metrics computation
      │
Frontend (Telegram Mini App)
```

### REST API Endpoints

#### Portfolio API

| Endpoint | Description |
|---|---|
| `GET /api/portfolio` | Portfolio overview: value, profit, ROI, strategy count |
| `GET /api/portfolio/value` | Real-time value breakdown by asset: `Σ(balance × price)` |
| `GET /api/portfolio/trades` | Paginated trade history with filters and sorting |
| `GET /api/portfolio/metrics` | Full performance metrics + per-strategy stats |

Example response — `GET /api/portfolio`:

```json
{
  "agent_id": "agent_001",
  "portfolio_value": 15500,
  "profit": 2500,
  "roi": "19.23%",
  "day_change": 150,
  "day_change_percent": "0.98%",
  "strategy_count": 2,
  "last_updated": "2024-03-10T12:00:00Z"
}
```

Example response — `GET /api/portfolio/value`:

```json
{
  "portfolio_value": 15500,
  "quote_currency": "USD",
  "assets": [
    { "asset": "BTC", "balance": 0.1, "price": 65000, "value": 6500 },
    { "asset": "ETH", "balance": 2.0, "price": 3500, "value": 7000 },
    { "asset": "USD", "balance": 2000, "price": 1,     "value": 2000 }
  ],
  "timestamp": "2024-03-10T12:00:00Z"
}
```

#### Trade History API

| Endpoint | Description |
|---|---|
| `GET /api/trades` | All trades — paginated, filterable by asset/action/date, sortable |
| `GET /api/trades/summary` | Aggregated statistics: win rate, volume, fees, best/worst trade |
| `GET /api/trades/{id}` | Single trade record by ID |

Query parameters for `GET /api/trades`:

```
page       — page number (default: 1)
per_page   — results per page (default: 20, max: 100)
asset      — filter by asset symbol (e.g. BTC)
action     — filter by BUY or SELL
sort       — asc or desc (default: desc by timestamp)
from       — ISO-8601 date lower bound
to         — ISO-8601 date upper bound
min_value  — minimum trade value in USD
max_value  — maximum trade value in USD
```

Example response — `GET /api/trades`:

```json
{
  "trades": [
    {
      "id": "trade_agent_001_0",
      "agent_id": "agent_001",
      "asset": "BTC",
      "action": "BUY",
      "price": 65000,
      "amount": 0.01,
      "value": 650,
      "fee": 0,
      "pnl": 52,
      "strategy_id": "strategy_0",
      "confidence": 0.65,
      "timestamp": 1710000000
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 15, "pages": 1 }
}
```

### Portfolio Metrics Engine

`GET /api/portfolio/metrics` computes:

```json
{
  "portfolio_value": 15500,
  "profit": 2500,
  "roi": "19.23%",
  "total_trades": 15,
  "win_rate": "66.7%",
  "max_drawdown": "3.2%",
  "avg_trade_profit": 166.67,
  "strategies": [
    {
      "strategy_id": "strategy_0",
      "strategy_name": "Default Strategy",
      "profit": 1800,
      "roi": "18.0%",
      "win_rate": "70.0%",
      "trades_count": 10,
      "drawdown": "2.1%",
      "avg_trade_profit": 180.0,
      "total_volume": 10000
    }
  ]
}
```

Metrics computed:

| Metric | Description |
|---|---|
| `portfolio_value` | `Σ(asset_balance × asset_price)` |
| `profit` | Total realized + unrealized PnL |
| `roi` | Return on investment as percentage |
| `win_rate` | Percentage of profitable trades |
| `max_drawdown` | Maximum peak-to-trough decline |
| `avg_trade_profit` | Average PnL per trade |

### Strategy Performance Stats

Each strategy within a portfolio has its own metrics:

| Metric | Description |
|---|---|
| `profit` | Total PnL for this strategy |
| `roi` | Return on capital allocated to this strategy |
| `win_rate` | Win rate for this strategy's trades |
| `trades_count` | Total number of trades executed |
| `drawdown` | Maximum drawdown for this strategy |

These metrics power:
- **Strategy Marketplace** rankings
- **Agent leaderboards**
- **Investor reporting**

### PHP Classes

| Class | File | Description |
|---|---|---|
| `PortfolioAnalytics` | `app/analytics/PortfolioAnalytics.php` | Core analytics engine: portfolio value, trade history, metrics, max drawdown computation. Works with database or in demo mode. |
| `StrategyMetrics` | `app/analytics/StrategyMetrics.php` | Per-strategy performance stats: profit, ROI, win rate, trades count, drawdown. |
| `PortfolioController` | `app/api/PortfolioController.php` | REST controller for `GET /api/portfolio`, `/value`, `/trades`, `/metrics`. |
| `TradeController` | `app/api/TradeController.php` | REST controller for `GET /api/trades`, `/summary`, `/{id}`. |

### TypeScript Module

```typescript
import {
  createPortfolioAnalyticsDashboard,
  createPortfolioDataModel,
  createAnalyticsEngine,
  createRiskMonitor,
  createStrategyComparison,
  createTradeHistoryManager,
} from '@tonaiagent/core/portfolio-analytics';

const dashboard = createPortfolioAnalyticsDashboard({
  drawdownAlertThreshold: 10,
  concentrationAlertThreshold: 30,
});

// Record portfolio data
dashboard.updatePortfolioValue('agent-001', 100000, 10000);
dashboard.recordEquityPoint('agent-001', { timestamp: new Date(), value: 100000, pnl: 10000, pnlPercent: 10 });

// Get analytics
const metrics = await dashboard.getDashboardMetrics('agent-001', '30d');
console.log(metrics.risk.riskGrade);        // 'A'
console.log(metrics.overview.totalValue);   // 100000

// Get chart data for UI
const chart = dashboard.getChartData('equity_curve', 'agent-001', '30d');

// Generate report
const report = dashboard.generateReport('agent-001', '30d', 'json');
```

### PHP Usage Example

```php
$analytics = new PortfolioAnalytics($db);
$metrics   = PortfolioAnalytics::calculate($analytics->getPortfolio('agent_001'));
// => ['portfolio_value' => 15500, 'profit' => 2500, 'roi' => '19.23%', ...]

$portfolio = $analytics->getPortfolio('agent_001');
$metrics   = PortfolioAnalytics::calculate($portfolio);
```

---

<p align="center">
  <strong>Built with ❤️ for the TON Ecosystem</strong>
</p>
