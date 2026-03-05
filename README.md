# TON AI Agent Platform

> **AI-Native Global Financial Infrastructure (AGFI) — The Next Generation of Capital Coordination**

[![Version](https://img.shields.io/badge/version-2.19.0-blue.svg)](https://github.com/xlabtg/TONAIAgent/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0.0-blue.svg)](https://www.typescriptlang.org/)

TON AI Agent is an institutional-grade platform for global AI-native capital coordination on the TON blockchain. The platform implements the **AI-native Global Financial Infrastructure (AGFI)** — comparable in systemic importance to SWIFT, IMF, and BIS, but with AI-coordination, on-chain transparency, programmability, and borderless design.

> **🏛️ AGFI Status**: The platform has been formalized as global AI-native financial infrastructure. The AGFI module implements all six architectural pillars: Global Capital Layer, Global Liquidity Fabric, AI Systemic Coordination, Autonomous Monetary Infrastructure, Governance & Institutional Alignment, and Interoperability & Global Integration. See [docs/agfi.md](docs/agfi.md) for the complete AGFI specification.

> **🚀 MVP Status**: The current development focus is the MVP — delivering the core demo flow end-to-end. See the [MVP Architecture](docs/mvp-architecture.md) and [MVP Feature Checklist](docs/mvp-checklist.md) for scope and priorities.

---

## Table of Contents

1. [AGFI: AI-native Global Financial Infrastructure](#agfi-ai-native-global-financial-infrastructure)
2. [MVP Overview](#mvp-overview)
3. [Overview](#overview)
4. [Key Features](#key-features)
5. [System Architecture](#system-architecture)
6. [Core Modules](#core-modules)
7. [Technology Stack](#technology-stack)
8. [Prerequisites](#prerequisites)
9. [Installation](#installation)
10. [Configuration](#configuration)
11. [Quick Start](#quick-start)
12. [Telegram Integration](#telegram-integration)
13. [Admin Dashboard](#admin-dashboard)
14. [Security Best Practices](#security-best-practices)
15. [Contributing](#contributing)
16. [Global Autonomous Asset Management Protocol (GAAMP)](#global-autonomous-asset-management-protocol-gaamp)
17. [Autonomous Global Financial Network (AGFN)](#autonomous-global-financial-network-agfn)
18. [Roadmap](#roadmap)
19. [Community](#community)
20. [License](#license)

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
- [x] AGFN v1 — Autonomous Global Financial Network (Issue #141) — Global Node Architecture, Cross-Jurisdiction Capital Routing, Global Settlement Mesh, AI Coordination Layer, Multi-Reserve Treasury, Global Stability Dashboard
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
