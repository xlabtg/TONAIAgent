# TON AI Agent Platform

> **AI-Native Autonomous Finance Infrastructure for The Open Network**

[![Version](https://img.shields.io/badge/version-2.6.0-blue.svg)](https://github.com/xlabtg/TONAIAgent/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0.0-blue.svg)](https://www.typescriptlang.org/)

TON AI Agent is a production-grade platform for deploying autonomous AI agents on the TON blockchain. The platform combines multi-provider AI orchestration (Groq-first), institutional-grade security, and a comprehensive strategy engine to enable intelligent, self-operating financial agents.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Core Modules](#core-modules)
5. [Technology Stack](#technology-stack)
6. [Prerequisites](#prerequisites)
7. [Installation](#installation)
8. [Configuration](#configuration)
9. [Quick Start](#quick-start)
10. [Telegram Integration](#telegram-integration)
11. [Admin Dashboard](#admin-dashboard)
12. [Security Best Practices](#security-best-practices)
13. [Contributing](#contributing)
14. [Roadmap](#roadmap)
15. [Community](#community)
16. [License](#license)

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

| Module | Description | Documentation |
|--------|-------------|---------------|
| **AI Layer** | Multi-provider AI orchestration with Groq-first routing | [docs/ai-layer.md](docs/ai-layer.md) |
| **Security** | MPC wallets, HSM, authorization pipeline, audit logging | [docs/security.md](docs/security.md) |
| **Strategy Engine** | DSL parser, backtesting, optimization, risk controls | [docs/strategy.md](docs/strategy.md) |
| **Multi-Agent** | Swarm coordination, shared memory, task delegation | [docs/multi-agent.md](docs/multi-agent.md) |
| **Marketplace** | Strategy discovery, copy trading, creator monetization | [docs/marketplace.md](docs/marketplace.md) |
| **Tokenomics** | TONAI token, staking, governance, reputation | [docs/tokenomics.md](docs/tokenomics.md) |
| **No-Code Builder** | Visual strategy construction without coding | [docs/no-code.md](docs/no-code.md) |
| **Plugins** | Extensible tool and integration system | [docs/plugins.md](docs/plugins.md) |
| **Institutional** | KYC/AML, compliance, reporting, custody | [docs/institutional.md](docs/institutional.md) |
| **Omnichain** | Cross-chain operations via ChangeNOW integration | [docs/omnichain.md](docs/omnichain.md) |
| **Launchpad** | Agent creation, funding, treasury management | [docs/launchpad.md](docs/launchpad.md) |
| **Hedge Fund** | Autonomous fund management with AI strategies | [docs/hedgefund.md](docs/hedgefund.md) |
| **Data Platform** | Market data, signals, oracles, analytics | [docs/data-platform.md](docs/data-platform.md) |
| **Growth** | Viral mechanics, gamification, referrals | [docs/growth.md](docs/growth.md) |
| **AI Safety** | Alignment, guardrails, anomaly detection | [docs/ai-safety.md](docs/ai-safety.md) |
| **Ecosystem Fund** | Grants, incubation, capital allocation | [docs/ecosystem-fund.md](docs/ecosystem-fund.md) |
| **Super App** | Wallet, agents, social layer, Telegram integration | [docs/superapp.md](docs/superapp.md) |
| **Mobile UX** | Telegram-native mobile-first experience | [docs/mobile-ux.md](docs/mobile-ux.md) |
| **Personal Finance** | AI-native wealth management and financial literacy | [docs/personal-finance.md](docs/personal-finance.md) |
| **Protocol** | Open Agent Protocol (OAP) specification | [docs/protocol.md](docs/protocol.md) |
| **SDK** | Enterprise SDK and developer platform | [docs/protocol-sdk.md](docs/protocol-sdk.md) |
| **Token Strategy** | Launch, liquidity flywheel, valuation modeling | [docs/token-strategy.md](docs/token-strategy.md) |
| **Payments** | AI-native payments and commerce layer | [docs/payments.md](docs/payments.md) |
| **Regulatory** | Global compliance and jurisdictional framework | [docs/regulatory-strategy.md](docs/regulatory-strategy.md) |
| **Institutional Network** | Funds, banks, custodians, liquidity providers | [docs/institutional-network.md](docs/institutional-network.md) |
| **AI Credit** | Lending, underwriting, CoinRabbit integration | [docs/ai-credit.md](docs/ai-credit.md) |

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

### Phase 1: Foundation (Current)

- [x] Multi-provider AI layer
- [x] Security and key management
- [x] Strategy engine and DSL
- [x] Multi-agent coordination
- [x] Marketplace and copy trading
- [x] Tokenomics framework

### Phase 2: Expansion (Q2 2026)

- [ ] Mobile app release
- [ ] Additional blockchain support
- [ ] Advanced AI models
- [ ] Institutional partnerships
- [ ] Regulatory compliance expansion

### Phase 3: Scale (Q3-Q4 2026)

- [ ] Million-user milestone
- [ ] Cross-chain bridges
- [ ] Autonomous hedge fund
- [ ] DAO governance activation
- [ ] Global market expansion

### Phase 4: Ecosystem (2027+)

- [ ] Decentralized AI training
- [ ] Agent-to-agent economy
- [ ] Custom model fine-tuning
- [ ] Enterprise white-label
- [ ] Full decentralization

---

## Community

### Connect With Us

| Platform | Link |
|----------|------|
| **Telegram** | [t.me/TONAIAgent](https://t.me/TONAIAgent) |
| **GitHub** | [github.com/xlabtg/TONAIAgent](https://github.com/xlabtg/TONAIAgent) |
| **Documentation** | [docs.tonaiagent.com](https://docs.tonaiagent.com) |

### Developer Resources

- [API Documentation](docs/api.md)
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
