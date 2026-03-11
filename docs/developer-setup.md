# Developer Setup Guide

This guide will help you set up your local development environment for the TON AI Agent platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Running the Development Server](#running-the-development-server)
5. [Running the Telegram Mini App](#running-the-telegram-mini-app)
6. [Running Tests](#running-tests)
7. [Project Structure](#project-structure)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | >= 18.0.0 | Runtime for TypeScript modules |
| npm | >= 8.0.0 | Package management |
| Git | >= 2.30.0 | Version control |

### Optional (for full stack development)

| Software | Version | Purpose |
|----------|---------|---------|
| PHP | >= 8.0.0 | Backend API |
| MySQL/MariaDB | >= 8.0.0 / 10.3+ | Database |
| Docker | >= 20.0.0 | Containerized development |

### Verify Installation

```bash
# Check Node.js version
node --version  # Should show v18.x.x or higher

# Check npm version
npm --version   # Should show 8.x.x or higher

# Check Git version
git --version   # Should show 2.30.x or higher
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/xlabtg/TONAIAgent.git
cd TONAIAgent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Installation

```bash
# Run the test suite to verify everything works
npm test
```

You should see output indicating all tests pass (5755+ tests across 78+ files).

### 4. Start Development

```bash
# Start the development server (if applicable)
npm run dev

# Or run TypeScript compilation in watch mode
npm run build -- --watch
```

---

## Environment Configuration

### Creating Your Environment File

```bash
# Copy the example environment file
cp .env.example .env
```

### Required Environment Variables

Edit `.env` with your configuration:

```bash
# Application
NODE_ENV=development
APP_URL=http://localhost:3000

# Telegram Bot (get from @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# AI Provider (choose one)
GROQ_API_KEY=your_groq_api_key
# Or
OPENAI_API_KEY=your_openai_api_key
# Or
ANTHROPIC_API_KEY=your_anthropic_api_key

# Database (for PHP backend)
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=tonaiagent
DB_USERNAME=root
DB_PASSWORD=your_password

# Market Data (optional - uses public APIs by default)
COINGECKO_API_KEY=your_coingecko_api_key
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key
```

### Getting API Keys

| Service | URL | Purpose |
|---------|-----|---------|
| Telegram Bot | https://t.me/BotFather | Bot token for Telegram integration |
| Groq | https://console.groq.com | AI provider (recommended) |
| OpenAI | https://platform.openai.com | Alternative AI provider |
| CoinGecko | https://www.coingecko.com/api | Market data (optional) |

---

## Running the Development Server

### TypeScript Development

```bash
# Compile TypeScript
npm run build

# Watch mode (recompile on changes)
npm run build -- --watch

# Type checking only
npx tsc --noEmit
```

### Using the MVP Platform

```typescript
import { createMVPPlatform } from '@tonaiagent/core/mvp-platform';

// Create and start the platform
const platform = createMVPPlatform({ environment: 'simulation' });
platform.start();

// Create a test agent
const agent = await platform.createAgent({
  userId: 'dev_user_123',
  name: 'Development Agent',
  strategy: 'trend',
  budgetTon: 1000,
  riskLevel: 'low',
});

console.log('Agent created:', agent.agentId);

// Run a strategy cycle
const cycle = await platform.executeAgentCycle(agent.agentId);
console.log('Signal:', cycle.signal);

// Clean up
platform.stop();
```

### PHP Backend (Optional)

If you're working on the PHP backend:

```bash
cd php-app

# Install PHP dependencies (if using Composer)
composer install

# Start PHP built-in server
php -S localhost:8080 -t public/
```

---

## Running the Telegram Mini App

### Local Development

The Mini App is located in the `miniapp/` directory and consists of static HTML, CSS, and JavaScript files.

```bash
# Serve the mini app locally
cd miniapp
npx serve .

# Or use Python's built-in server
python3 -m http.server 3000
```

### Testing with Telegram

To test the Mini App with Telegram:

1. Set up a test bot with [@BotFather](https://t.me/BotFather)
2. Configure the Mini App URL in BotFather
3. Use [ngrok](https://ngrok.com/) or similar to expose your local server:

```bash
ngrok http 3000
```

4. Set the ngrok URL as your Mini App URL in BotFather

### Mini App Structure

```
miniapp/
├── index.html          # Main dashboard
├── styles/
│   └── main.css       # Styling
├── scripts/
│   └── app.js         # Main application logic
└── components/
    ├── agents.js      # Agent management
    ├── strategies.js  # Strategy selection
    └── analytics.js   # Portfolio analytics
```

---

## Running Tests

### Full Test Suite

```bash
# Run all tests
npm test

# Run with verbose output
npm test -- --verbose

# Run with coverage report
npm test -- --coverage
```

### Running Specific Tests

```bash
# Test a specific module
npm test -- --grep "strategy-engine"

# Test a specific file
npm test -- tests/strategy-engine/trend-strategy.test.ts

# Run tests in watch mode
npm test -- --watch
```

### Test Structure

```
tests/
├── agent-control/         # Agent API tests
├── agent-runtime/         # Runtime pipeline tests
├── market-data/           # Data provider tests
├── mvp-platform/          # Integration tests
├── plugins/               # Plugin system tests
├── portfolio-analytics/   # Analytics tests
├── strategy-engine/       # Strategy tests
└── trading-engine/        # Trading simulation tests
```

---

## Project Structure

### Core Modules

```
src/
├── agent-runtime/          # Agent execution pipeline
│   ├── runtime.ts         # Main runtime implementation
│   ├── types.ts           # Type definitions
│   └── index.ts           # Public exports
│
├── strategy-engine/        # Strategy framework
│   ├── interface.ts       # StrategyInterface contract
│   ├── registry.ts        # Strategy registration
│   ├── loader.ts          # Strategy loading
│   ├── execution-engine.ts # Execution pipeline
│   ├── strategies/        # Built-in strategies
│   │   ├── trend-strategy.ts
│   │   ├── arbitrage-strategy.ts
│   │   └── ai-signal-strategy.ts
│   └── types.ts
│
├── market-data/            # Market data layer
│   ├── providers/         # Data providers
│   │   ├── coingecko.ts
│   │   └── binance.ts
│   ├── cache.ts           # In-memory caching
│   └── types.ts
│
├── trading-engine/         # Trade execution
│   ├── simulator.ts       # Simulation mode
│   ├── executor.ts        # Trade execution
│   └── types.ts
│
├── portfolio-analytics/    # Analytics
│   ├── calculator.ts      # Metrics calculation
│   ├── tracker.ts         # Position tracking
│   └── types.ts
│
├── agent-control/          # REST API
│   ├── api.ts             # API handlers
│   ├── manager.ts         # Agent lifecycle
│   └── registry.ts        # Agent registry
│
├── plugins/                # Plugin system
│   ├── registry.ts        # Plugin registration
│   ├── runtime.ts         # Plugin execution
│   └── tools/             # Core plugin tools
│
└── mvp-platform/           # Integration layer
    ├── platform.ts        # Main platform
    └── types.ts
```

### Supporting Directories

```
php-app/                    # PHP backend
├── app/
│   ├── api/               # API controllers
│   ├── agents/            # Agent management
│   └── models/            # Database models
├── config/                # Configuration
├── database/              # Migrations and schema
└── public/                # Web root

miniapp/                    # Telegram Mini App
├── index.html
├── styles/
├── scripts/
└── components/

installer/                  # Deployment wizard
├── index.php
├── steps/
└── templates/

deploy/                     # Deployment configs
├── docker/                # Docker setup
├── kubernetes/            # K8s manifests
├── aws/                   # AWS Terraform
└── scripts/               # Deployment scripts
```

---

## Common Tasks

### Creating a New Strategy

1. Create a new file in `src/strategy-engine/strategies/`:

```typescript
// src/strategy-engine/strategies/my-strategy.ts
import { BaseStrategy } from '../interface';
import type { MarketData, StrategyMetadata, StrategyParams, TradeSignal } from '../types';

export class MyStrategy extends BaseStrategy {
  getMetadata(): StrategyMetadata {
    return {
      id: 'my-strategy',
      name: 'My Custom Strategy',
      description: 'Description of what this strategy does',
      version: '1.0.0',
      params: [
        // Define configurable parameters
      ],
      supportedAssets: ['TON'],
    };
  }

  async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
    // Implement strategy logic
  }
}
```

2. Register the strategy in the loader (if needed)
3. Add tests in `tests/strategy-engine/`

See [Strategy Development Guide](strategy-development.md) for detailed instructions.

### Creating a New Plugin

1. Define the plugin manifest
2. Implement tool handlers
3. Register with the plugin manager

See [Plugin Development Guide](plugin-development.md) for detailed instructions.

### Adding a New API Endpoint

1. Add the route handler in `src/agent-control/api.ts`
2. Add corresponding PHP handler in `php-app/app/api/`
3. Add tests in `tests/agent-control/`
4. Update API documentation

---

## Troubleshooting

### Common Issues

#### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and try again
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript compilation errors

```bash
# Check for type errors
npx tsc --noEmit

# Rebuild from scratch
rm -rf dist
npm run build
```

#### Tests fail to run

```bash
# Ensure all dependencies are installed
npm install

# Check Node.js version
node --version  # Must be >= 18.0.0

# Run tests with verbose output
npm test -- --verbose
```

#### Port already in use

```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Getting Help

- Check the [GitHub Issues](https://github.com/xlabtg/TONAIAgent/issues)
- Review existing [Pull Requests](https://github.com/xlabtg/TONAIAgent/pulls)
- Read the [Documentation](../README.md)

---

## Next Steps

- Read the [Contributing Guide](../CONTRIBUTING.md)
- Explore the [Strategy Development Guide](strategy-development.md)
- Learn about [Plugin Development](plugin-development.md)
- Review the [MVP Architecture](mvp-architecture.md)
