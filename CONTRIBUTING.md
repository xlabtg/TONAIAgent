# Contributing to TON AI Agent

Thank you for your interest in contributing to the TON AI Agent platform! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Project Philosophy](#project-philosophy)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Branching Strategy](#branching-strategy)
5. [Pull Request Guidelines](#pull-request-guidelines)
6. [Code Standards](#code-standards)
7. [Testing Requirements](#testing-requirements)
8. [Issue Workflow](#issue-workflow)
9. [Contributor Roles](#contributor-roles)
10. [Security Guidelines](#security-guidelines)

---

## Project Philosophy

The TON AI Agent platform is evolving from a single-developer project into an **open developer ecosystem**. Our guiding principles are:

1. **MVP First** — Every contribution must map to a core component. Check the [MVP Architecture](docs/mvp-architecture.md) before starting work.
2. **Simple and Stable** — Prefer simple, working code over clever or complex solutions.
3. **Deployable** — Every change must be deployable on standard PHP + MySQL hosting via the installer.
4. **Telegram-Native** — The primary user interface is the Telegram Mini App. Design all user-facing features for mobile Telegram usage.
5. **Extensible** — Build with plugins and strategies in mind. The platform is designed to support a marketplace ecosystem.

---

## Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm >= 8.0.0
```

### Quick Start

```bash
# Clone the repository
git clone https://github.com/xlabtg/TONAIAgent.git
cd TONAIAgent

# Install dependencies
npm install

# Run tests to verify setup
npm test

# Start development
npm run dev
```

For detailed setup instructions, see [docs/developer-setup.md](docs/developer-setup.md).

---

## Development Setup

### Repository Structure

```
TONAIAgent/
├── src/                      # Core TypeScript modules
│   ├── agent-runtime/        # 9-step agent execution pipeline
│   ├── strategy-engine/      # Trading strategy framework
│   ├── market-data/          # CoinGecko/Binance price feeds
│   ├── trading-engine/       # Simulated trade execution
│   ├── portfolio-analytics/  # PnL, ROI, equity tracking
│   ├── agent-control/        # REST API for agent management
│   ├── plugins/              # Plugin system and core plugins
│   ├── demo-agent/           # Preconfigured demo strategies
│   └── mvp-platform/         # Unified MVP integration layer
├── php-app/                  # PHP backend APIs
├── miniapp/                  # Telegram Mini App (HTML/CSS/JS)
├── telegram-miniapp/         # Mini App deployment package
├── installer/                # One-click PHP installer
├── deploy/                   # Deployment configs (Docker, K8s, AWS)
├── docs/                     # Documentation
├── tests/                    # Test suites
└── examples/                 # Usage examples
```

### Module Responsibilities

| Directory | Purpose |
|-----------|---------|
| `src/agent-runtime/` | Core AI agent execution pipeline (9 steps: fetch_data → load_memory → call_ai → validate_risk → generate_plan → simulate_tx → execute_onchain → record_outcome → update_analytics) |
| `src/strategy-engine/` | Strategy framework with registry, loader, and execution engine |
| `src/market-data/` | Unified market data layer with CoinGecko and Binance providers |
| `src/trading-engine/` | Simulated buy/sell execution and portfolio tracking |
| `src/portfolio-analytics/` | Portfolio metrics, PnL calculation, equity curves |
| `src/agent-control/` | REST API for agent lifecycle management |
| `src/plugins/` | Plugin system with TON wallet, jetton, and NFT plugins |
| `php-app/` | Backend API endpoints and Telegram webhook handler |
| `miniapp/` | Dashboard, agent creation, strategy selection UI |
| `installer/` | Deployment wizard for PHP hosting |
| `deploy/` | Infrastructure configurations for Docker, Kubernetes, AWS |

---

## Branching Strategy

### Branch Naming

Use descriptive branch names following this pattern:

```
<type>/<issue-number>-<short-description>
```

**Types:**
- `feat/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code refactoring
- `test/` — Test additions or fixes
- `chore/` — Maintenance tasks

**Examples:**
```
feat/198-developer-contribution-framework
fix/199-agent-restart-bug
docs/200-strategy-development-guide
```

### Workflow

1. Create a branch from `main`
2. Make your changes with clear, atomic commits
3. Open a pull request when ready for review
4. Address review feedback
5. Merge after approval

### Commit Messages

Follow the conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Examples:**
```
feat(strategy-engine): add momentum crossover strategy
fix(agent-control): handle restart from error state
docs(readme): update MVP Architecture section
```

---

## Pull Request Guidelines

### Before Opening a PR

1. Confirm your change maps to an MVP component
2. Run all tests locally: `npm test`
3. Run linting: `npm run lint` (if available)
4. Ensure `git status` shows a clean working tree
5. Merge latest `main` into your branch and resolve conflicts

### PR Structure

Include in your PR description:

```markdown
## Summary
Brief description of what changed and why.

## Changes
- Bullet points of specific changes
- Include new files, modified files
- Note any breaking changes

## Test Plan
- [ ] Tests added/updated
- [ ] Manual testing performed
- [ ] CI checks passing

## Issue Reference
Fixes #<issue-number>
```

### Review Process

- PRs require at least one approval before merging
- Address all review comments
- Keep PRs focused and small when possible
- Large features should be split into multiple PRs

---

## Code Standards

### TypeScript

- Use TypeScript 5.0+ features
- Enable strict mode (`strict: true` in tsconfig.json)
- Export types alongside implementations
- Use interfaces for public APIs, types for internal use
- Document public functions with JSDoc comments

```typescript
/**
 * Creates a new trading agent with the specified configuration.
 *
 * @param config - Agent configuration options
 * @returns The created agent instance
 * @throws {AgentError} If the configuration is invalid
 */
export function createAgent(config: AgentConfig): Agent {
  // Implementation
}
```

### PHP

- PHP 8.0+ syntax (match expressions, named arguments, enums)
- PSR-12 coding style
- All database queries use PDO prepared statements
- All user input is sanitized before use
- Sensitive config values in `.env`, never committed

### JavaScript (Mini App)

- Vanilla JS for the Mini App (no framework required for MVP)
- Use the Telegram WebApp API: `window.Telegram.WebApp`
- Verify `initData` signature on every API call
- No API keys in frontend JavaScript

### Database

- All schema changes in `database/schema.sql`
- Use `utf8mb4` charset for all tables
- Index foreign keys and frequently queried columns

---

## Testing Requirements

### Test Categories

| Category | Purpose | Location |
|----------|---------|----------|
| Unit Tests | Test individual functions and classes | `tests/<module>/*.test.ts` |
| Integration Tests | Test component interactions | `tests/integration/*.test.ts` |
| Strategy Tests | Test strategy signal generation | `tests/strategy-engine/*.test.ts` |
| API Tests | Test REST endpoints | `tests/agent-control/*.test.ts` |

### Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific module
npm test -- --grep "strategy-engine"

# Run tests with coverage
npm test -- --coverage
```

### Running Contract Tests

Smart contract tests live in `contracts/tests/` and use the [Blueprint](https://github.com/ton-org/blueprint) test runner together with `@ton/sandbox`. They are intentionally excluded from the main vitest suite because they require the Tact compiler toolchain and compiled contract wrappers.

**Locally:**

```bash
# From the repository root
npx blueprint test --chdir contracts
```

**In CI:**

A dedicated workflow (`.github/workflows/contracts.yml`) runs `npx blueprint test` inside the `contracts/` directory on every pull request that modifies `contracts/**` and on every push to `main`. This job is a required status check on the `main` branch protection rules, so contract regressions block merges automatically.

### Writing Tests

- Write tests for all new functionality
- Cover edge cases and error conditions
- Use descriptive test names
- Mock external dependencies (APIs, databases)

```typescript
describe('TrendStrategy', () => {
  it('should generate BUY signal when price is above SMA', async () => {
    const strategy = new TrendStrategy();
    const marketData = createMockMarketData({ TON: 5.50 });

    // Simulate price history
    for (let i = 0; i < 14; i++) {
      await strategy.execute(marketData, {});
    }

    const signal = await strategy.execute(
      createMockMarketData({ TON: 6.00 }), // Above average
      {}
    );

    expect(signal.action).toBe('BUY');
    expect(signal.confidence).toBeGreaterThan(0.5);
  });
});
```

---

## Issue Workflow

### Creating Issues

Use the appropriate issue template:

- **Feature Request** — New functionality
- **Bug Report** — Something is broken
- **Documentation** — Documentation improvements
- **Research** — Investigation or analysis needed

### Issue Labels

**By Component:**
- `telegram-bot` — Bot commands and webhook
- `mini-app` — Telegram Mini App UI
- `backend-api` — PHP/TypeScript API endpoints
- `agent-manager` — Agent lifecycle management
- `strategy-engine` — Trading strategies
- `simulator` — Trading simulation
- `analytics` — Portfolio analytics
- `installer` — Deployment system

**By Type:**
- `feat` — New feature
- `bug` — Bug fix
- `docs` — Documentation
- `chore` — Maintenance

**By Priority:**
- `phase-1` — MVP scope
- `phase-2` — Platform expansion
- `phase-3` — Infrastructure scale

### Lifecycle

```
Issue Created
      ↓
Discussion & Clarification
      ↓
Development Branch Created
      ↓
Implementation
      ↓
Pull Request Opened
      ↓
Review & Feedback
      ↓
Merge to Main
      ↓
Issue Closed
```

---

## Contributor Roles

The project supports different types of contributions:

### Core Developers

- Work on the agent runtime, strategy engine, and core infrastructure
- Review and merge pull requests
- Maintain project architecture and standards

### Strategy Developers

- Create new trading strategies
- See [docs/strategy-development.md](docs/strategy-development.md)
- Register strategies with the Strategy Registry

### Plugin Developers

- Build plugins for data sources, integrations, and tools
- See [docs/plugin-development.md](docs/plugin-development.md)
- Follow the plugin manifest and permission system

### UI Contributors

- Improve the Telegram Mini App
- Work on the web dashboard
- Follow Telegram WebApp API guidelines

### Documentation Writers

- Improve documentation clarity
- Add examples and tutorials
- Keep docs in sync with code changes

---

## Security Guidelines

All contributions must follow these security requirements:

1. **Authentication** — Every API endpoint (except `/health` and `/api/webhook/telegram`) requires valid authentication
2. **Input Validation** — Validate and sanitize all input
3. **SQL Injection Prevention** — Use PDO prepared statements exclusively
4. **CSRF Protection** — Include CSRF tokens in state-changing forms
5. **Rate Limiting** — Apply rate limiting to all API endpoints
6. **HTTPS Required** — The application requires HTTPS
7. **Telegram Signature** — Verify Telegram `initData` HMAC signature
8. **No Secrets in Code** — All credentials in `.env` only

### Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** open a public issue
2. Email the security team directly (contact info in repository)
3. Include detailed steps to reproduce
4. Allow time for a fix before public disclosure

---

## Additional Resources

- [Developer Setup Guide](docs/developer-setup.md)
- [Strategy Development Guide](docs/strategy-development.md)
- [Plugin Development Guide](docs/plugin-development.md)
- [MVP Architecture](docs/mvp-architecture.md)
- [Development Guidelines](docs/development-guidelines.md)
- [SDK Documentation](docs/developer.md)

---

## Questions?

- Open a [GitHub Discussion](https://github.com/xlabtg/TONAIAgent/discussions)
- Check existing [Issues](https://github.com/xlabtg/TONAIAgent/issues)
- Review the [Documentation](docs/)

Thank you for contributing to TON AI Agent!
