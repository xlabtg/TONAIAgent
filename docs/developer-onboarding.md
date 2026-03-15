# TONAIAgent — Developer Onboarding Guide

> Issue #241 · Deliverable 6 of 6

Welcome to TONAIAgent! This guide will take you from zero to your first contribution in under an hour.

---

## Table of Contents

1. [What is TONAIAgent?](#1-what-is-tonaiagent)
2. [Prerequisites](#2-prerequisites)
3. [Environment Setup](#3-environment-setup)
4. [Understanding the Codebase](#4-understanding-the-codebase)
5. [Running the Platform Locally](#5-running-the-platform-locally)
6. [Running Tests](#6-running-tests)
7. [Making Your First Change](#7-making-your-first-change)
8. [Where to Find What](#8-where-to-find-what)
9. [Common Tasks](#9-common-tasks)
10. [Getting Help](#10-getting-help)

---

## 1. What is TONAIAgent?

TONAIAgent is an **AI-native autonomous trading platform** built on the TON blockchain. It lets users deploy AI trading agents that operate 24/7 through a Telegram Mini App — no separate app installation required.

### The Three-Minute Architecture

The core loop:

```
User selects strategy in Telegram Mini App
              ↓
    Platform creates an AI Agent
              ↓
Agent runs 9-step execution loop (every N seconds):
  1. Fetch market data (CoinGecko / Binance / DEX)
  2. Load agent memory
  3. Call AI model (Groq / Anthropic / OpenAI)
  4. Validate risk limits
  5. Generate trade plan
  6. Simulate transaction
  7. Execute on-chain (or simulate in MVP mode)
  8. Record results
  9. Update analytics
              ↓
User sees live portfolio and performance in Mini App
```

### Repository Type

The repository is a **polyglot monorepo**:

| Layer | Technology | Location |
|-------|-----------|---------|
| Core library | TypeScript | `src/` |
| Mini App UI | HTML/CSS/JS | `miniapp/` |
| Mini App API | PHP | `telegram-miniapp/` |
| Marketing site | Next.js (TypeScript/React) | `website/` |
| Deployment | Terraform, Helm, Docker | `deploy/` |

---

## 2. Prerequisites

### Required

```bash
node >= 18.0.0     # TypeScript core library
npm >= 8.0.0       # Package management
git                # Version control
```

### For Mini App Backend

```bash
php >= 8.1         # Telegram Mini App backend
mysql >= 8.0       # (or PostgreSQL 14+)
```

### For Infrastructure Work

```bash
docker             # Container builds
terraform >= 1.5   # Infrastructure as code
kubectl            # Kubernetes deployment
```

### Recommended Tools

```bash
# VS Code extensions (install from .vscode/extensions.json if present)
- ESLint
- Prettier
- TypeScript + Language Service
- GitLens
```

---

## 3. Environment Setup

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/xlabtg/TONAIAgent.git
cd TONAIAgent

# Install Node.js dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Minimum required for development:
#   GROQ_API_KEY=       (get free key at console.groq.com)
#   TELEGRAM_BOT_TOKEN= (get from @BotFather on Telegram)
#   TON_NETWORK=testnet
```

### Step 3: Verify Setup

```bash
# Verify TypeScript compiles
npm run typecheck

# Run linter
npm run lint

# Run tests to confirm everything works
npm test
```

Expected output: all tests pass (95+ test files).

### Step 4: Build

```bash
# Build all modules (generates dist/ with ESM + CJS + types)
npm run build
```

---

## 4. Understanding the Codebase

### Module Classification

The `src/` directory contains **82 TypeScript modules** organized by concern. They fall into three categories:

#### Production Modules (build the MVP on these)

| Domain | Key Modules |
|--------|------------|
| **Agents** | `agent-runtime`, `agent-orchestrator`, `agent-control`, `lifecycle-orchestrator` |
| **Strategies** | `strategy`, `strategies`, `strategy-engine`, `strategy-marketplace`, `backtesting` |
| **Trading** | `trading`, `trading-engine`, `live-trading` |
| **Portfolio** | `portfolio`, `portfolio-analytics`, `multi-user-portfolio` |
| **Market Data** | `market-data`, `data-platform` |
| **AI** | `ai`, `ai-safety` |
| **Marketplace** | `marketplace`, `reputation`, `revenue` |
| **Platform** | `mvp`, `mvp-platform`, `superapp`, `production-miniapp` |
| **Infrastructure** | `protocol`, `security`, `plugins`, `runtime`, `multi-agent`, `monitoring` |

#### Extended Modules (post-MVP features)

`omnichain`, `cross-chain-liquidity`, `liquidity-network`, `hedgefund`, `fund-manager`, `institutional`, `institutional-network`, `dao-governance`, `payments`, `growth`, and more.

#### Research Modules (long-term vision, not production-ready)

`agfi`, `agfn`, `gaei`, `gaamp`, `grif`, `sgia`, `aifos`, `acms`

> **Tip**: Focus on Production Modules when building features. Extended and Research modules represent future roadmap items.

### Reading an Unknown Module

Every module in `src/` follows this pattern:

```
src/{module-name}/
├── index.ts          ← Entry point with exports and JSDoc overview
├── types.ts          ← TypeScript interfaces and types
├── {main-file}.ts    ← Core logic
└── ...               ← Additional files
```

Start with `index.ts` — it always has a module-level JSDoc comment explaining what the module does.

### Understanding the MVP Platform

The `src/mvp-platform/` module is the **integration entry point** that wires all core components together. Start here to understand how the platform works end-to-end:

```typescript
import { createMVPPlatform } from '@tonaiagent/core/mvp-platform';

const platform = createMVPPlatform({ environment: 'simulation' });
platform.start();
```

See `examples/basic-usage.ts` for a complete walkthrough.

---

## 5. Running the Platform Locally

### Option A: TypeScript Library (Simulation Mode)

The quickest way to run the platform — no Telegram bot or blockchain required:

```typescript
// examples/basic-usage.ts
import { createMVPPlatform } from '@tonaiagent/core/mvp-platform';

const platform = createMVPPlatform({ environment: 'simulation' });
platform.start();

const agent = await platform.createAgent({
  userId: 'test_user',
  name: 'My First Agent',
  strategy: 'trend',
  budgetTon: 1000,
  riskLevel: 'medium',
});

await platform.startAgent(agent.agentId);
const cycle = await platform.executeAgentCycle(agent.agentId);
console.log('Signal:', cycle.signal);

platform.stop();
```

Run with:

```bash
npx ts-node examples/basic-usage.ts
```

### Option B: Telegram Mini App (Full Stack)

To run the complete Telegram Mini App:

**Frontend** (`miniapp/`):
```bash
# Serve the miniapp directory with any static server
npx serve miniapp/
# OR: configure as your Telegram bot's Mini App URL
```

**Backend** (`telegram-miniapp/`):
```bash
# Requires PHP 8.1+ and MySQL
cd telegram-miniapp
cp .env.example .env
# Edit .env with your database and Telegram credentials
php -S localhost:8080 -t public/
```

**Installer** (first-time setup):
```bash
# Open in browser: http://localhost:8080/install.php
# Follow the step-by-step installer to configure the database
```

### Option C: Docker (Recommended for Production Testing)

```bash
cd deploy/docker
cp .env.example .env
# Edit .env with your credentials
docker compose up
```

This starts: application + worker + PostgreSQL + Redis.

---

## 6. Running Tests

### Run All Tests

```bash
npm test
```

### Run a Single Module's Tests

```bash
npm test -- tests/agent-runtime
npm test -- tests/strategy-engine
```

### Run with Coverage

```bash
npm run test:coverage
# Coverage report generated in coverage/
```

### Watch Mode (during development)

```bash
npm run test:watch
```

### Run Specific Example Scripts

```bash
# Backtesting example
npx ts-node examples/backtesting-demo.ts

# Fund manager demo
npx ts-node examples/fund-manager-demo.ts

# Plugin system
npx ts-node examples/plugins-demo.ts
```

---

## 7. Making Your First Change

### Setup Your Branch

```bash
# Create a feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

Branch naming convention: `feature/`, `fix/`, `docs/`, `refactor/`

### Code Style

The project uses ESLint + Prettier. Always run before committing:

```bash
npm run lint          # Check for lint errors
npm run lint:fix      # Auto-fix lint errors
npm run format        # Format with Prettier
npm run typecheck     # Verify TypeScript types
```

All four must pass before submitting a pull request.

### Test Requirements

Every code change must include tests:

```bash
# Tests live in tests/{module-name}/
# Create a matching test file for any new module
tests/
└── my-module/
    └── my-module.test.ts
```

Tests use **Vitest**. Example:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/my-module';

describe('myFunction', () => {
  it('should return expected value', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Commit Message Format

```
type(scope): description

Examples:
feat(agent-runtime): add retry logic for failed AI calls
fix(market-data): handle CoinGecko rate limit errors
docs(onboarding): add environment setup steps
refactor(strategy-engine): consolidate duplicate signal types
test(trading-engine): add edge cases for zero-balance scenarios
```

---

## 8. Where to Find What

### "I want to add a new trading strategy"

1. Read `src/strategy/types.ts` — understand the `Strategy` interface
2. Look at `src/strategy-engine/strategies/` — existing implementations
3. Add your strategy file: `src/strategy-engine/strategies/my-strategy.ts`
4. Register it in `src/strategy-engine/registry.ts`
5. Add tests in `tests/strategy-engine/`
6. Read [docs/guides/strategy-development.md](guides/strategy-development.md)

### "I want to modify the AI decision logic"

1. Read `src/ai/index.ts` — understand the AI module structure
2. Look at `src/agent-runtime/orchestrator.ts` — where AI is called
3. Review `src/ai-safety/` — understand guardrails before modifying AI calls
4. Add tests for any new AI behavior

### "I want to add a new market data provider"

1. Read `src/market-data/interface.ts` — the `MarketDataProvider` interface
2. Look at `src/market-data/providers/` — existing provider implementations
3. Add your provider: `src/market-data/providers/my-provider.ts`
4. Register in `src/market-data/service.ts`
5. Add tests in `tests/market-data/`

### "I want to modify the Telegram Mini App UI"

1. Files live in `miniapp/`
2. Main UI: `miniapp/index.html`
3. Application logic: `miniapp/app.js` and `miniapp/production.js`
4. Styles: `miniapp/styles.css`
5. Read [docs/superapp.md](../docs/superapp.md) for the full Mini App architecture

### "I want to modify the Mini App backend API"

1. Files live in `telegram-miniapp/`
2. API endpoints: `telegram-miniapp/app/api/`
3. Agent management: `telegram-miniapp/app/agents/`
4. Database schema: `telegram-miniapp/database.sql`

### "I want to add a new npm package export"

1. Add your module in `src/{module-name}/`
2. Export from your module's `index.ts`
3. Add to `src/index.ts` as a re-export
4. Add to `package.json` exports section:
   ```json
   "./my-module": {
     "import": "./dist/my-module/index.js",
     "require": "./dist/my-module/index.cjs",
     "types": "./dist/my-module/index.d.ts"
   }
   ```
5. Add to `tsconfig.build.json` entry points

### "I want to understand the full architecture"

- Start: [README.md Platform Architecture](../README.md#platform-architecture)
- Deep dive: [docs/architecture.md](architecture.md)
- Module map: [docs/module-dependencies.md](module-dependencies.md)
- Audit: [docs/architecture-audit.md](architecture-audit.md)

---

## 9. Common Tasks

### Add a Dependency

```bash
# Production dependency
npm install package-name

# Dev dependency
npm install -D package-name
```

### Update TypeScript Config

The project uses three tsconfig files:
- `tsconfig.json` — default (development, tests)
- `tsconfig.build.json` — production build (tsup)
- `tsconfig.strict.json` — strict mode (type checking CI)

### Run the Backtesting Script

```bash
npx ts-node scripts/backtest.ts
```

### Check Available NPM Scripts

```bash
npm run           # Lists all available scripts
```

Key scripts:

| Script | Purpose |
|--------|---------|
| `npm run build` | Compile all 66 entry points |
| `npm test` | Run full test suite |
| `npm run test:coverage` | Run with coverage report |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier formatting |
| `npm run typecheck` | TypeScript type check |
| `npm run typecheck:strict` | Strict mode type check |
| `npm run dev` | Watch mode build |

---

## 10. Getting Help

### Documentation

| Question | Where to Look |
|----------|--------------|
| How does the agent runtime work? | [docs/agent-runtime.md](agent-runtime.md) |
| How do I write a strategy? | [docs/guides/strategy-development.md](strategy-development.md) |
| How do plugins work? | [docs/guides/plugin-development.md](plugin-development.md) |
| How do I deploy? | [docs/guides/deployment.md](deployment.md) |
| How does backtesting work? | [docs/guides/backtesting.md](backtesting.md) |
| Full architecture? | [docs/architecture.md](architecture.md) |
| Module dependencies? | [docs/module-dependencies.md](module-dependencies.md) |
| Refactoring plans? | [docs/refactoring-roadmap.md](refactoring-roadmap.md) |
| Technical debt? | [docs/technical-debt.md](technical-debt.md) |

### Examples

The `examples/` directory contains 9 runnable TypeScript demos:

```
examples/
├── basic-usage.ts           ← Start here
├── backtesting-demo.ts      ← Backtest a strategy
├── fund-manager-demo.ts     ← Fund management flow
├── fund-investor-demo.ts    ← Investor perspective
├── investor-demo.ts         ← End-to-end investor journey
├── agfn-demo.ts             ← AI Global Finance Network
├── gaamp-demo.ts            ← Agent Management Platform
├── plugins-demo.ts          ← Plugin system
└── systemic-risk-demo.ts    ← Risk engine
```

### Contributing Guidelines

Read [CONTRIBUTING.md](../CONTRIBUTING.md) for:
- Branching strategy
- Pull request requirements
- Code review process
- Issue workflow

### Asking Questions

- Open a GitHub issue using the `feature` or `bug` template
- Review existing closed issues for prior context
- Tag issues with the relevant module name

---

*This guide was created as part of Issue #241 — Repository Architecture Audit & MVP Structure Refactor.*
