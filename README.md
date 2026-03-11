# TON AI Agent Platform

> **AI-Native Global Financial Infrastructure (AGFI) — The Next Generation of Capital Coordination**

[![Version](https://img.shields.io/badge/version-2.28.0-blue.svg)](https://github.com/xlabtg/TONAIAgent/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0.0-blue.svg)](https://www.typescriptlang.org/)

TON AI Agent is an institutional-grade platform for global AI-native capital coordination on the TON blockchain. The platform implements the **AI-native Global Financial Infrastructure (AGFI)** — comparable in systemic importance to SWIFT, IMF, and BIS, but with AI-coordination, on-chain transparency, programmability, and borderless design.

> **🏛️ AGFI Status**: The platform has been formalized as global AI-native financial infrastructure. The AGFI module implements all six architectural pillars: Global Capital Layer, Global Liquidity Fabric, AI Systemic Coordination, Autonomous Monetary Infrastructure, Governance & Institutional Alignment, and Interoperability & Global Integration. See [docs/agfi.md](docs/agfi.md) for the complete AGFI specification.

> **🚀 MVP Status**: The current development focus is the MVP — delivering the core demo flow end-to-end. See the [MVP Architecture](docs/mvp-architecture.md) and [MVP Feature Checklist](docs/mvp-checklist.md) for scope and priorities.

---

## Table of Contents

1. [AGFI: AI-native Global Financial Infrastructure](#agfi-ai-native-global-financial-infrastructure)
2. [GAEI: Global Autonomous Economic Infrastructure](#gaei-global-autonomous-economic-infrastructure)
3. [MVP Overview](#mvp-overview)
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
24. [Strategy Marketplace](#strategy-marketplace)
25. [Live Trading Infrastructure](#live-trading-infrastructure)
26. [AI Fund Manager](#ai-fund-manager)
27. [Investor Demo](#investor-demo)
28. [Strategy Backtesting](#strategy-backtesting)
29. [Community](#community)
30. [Risk Engine](#risk-engine)
31. [License](#license)

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

<p align="center">
  <strong>Built with ❤️ for the TON Ecosystem</strong>
</p>
