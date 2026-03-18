# TONAIAgent MVP Module Classification

> **Issue #247** — Define MVP Boundary & Extract Extended Layer

This document defines the official MVP boundary for TONAIAgent. All modules are
classified as either MVP (production-critical) or Extended (post-MVP, Phase 2+).

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ **MVP** | Required for the end-to-end MVP trading flow — must be production-ready |
| ❌ **Extended** | Deferred to Phase 2+ — lives under `extended/`, not in MVP runtime |
| 🔬 **Research** | Experimental — lives under `research/`, not in MVP runtime |

---

## MVP = End-to-End Trading Flow via Telegram

```
User (Telegram)
→ Mini App
→ AI Agent
→ Strategy
→ Risk Engine
→ Market Data
→ Execution (DEX)
→ Portfolio Tracking
```

---

## ✅ MVP Modules

### Apps

| Module | Path | Notes |
|--------|------|-------|
| Telegram Mini App | `apps/telegram-miniapp` | Primary user-facing interface |
| MVP Platform | `apps/mvp-platform` | Integration entry point for MVP |

### Core

| Module | Path | Notes |
|--------|------|-------|
| Agents | `core/agents` | Agent runtime, orchestrator, control, lifecycle |
| Strategies | `core/strategies` | Strategy engine, implementations, marketplace, backtesting |
| Trading | `core/trading` | Trading base, engine, live trading |
| Portfolio | `core/portfolio` | Portfolio tracking, analytics |
| Market Data | `core/market-data` | Price feeds (CoinGecko, Binance), data platform |
| Risk Engine | `core/risk-engine` | Risk limits, trade validation, stop-loss |
| AI | `core/ai` | Multi-provider AI routing (Groq-first) |
| Security | `core/security` | Key management, auth, audit logging |
| Protocol | `core/protocol` | Open Agent Protocol |
| Runtime | `core/runtime` | Core execution runtime |
| Multi-Agent | `core/multi-agent` | Agent coordination framework |
| Plugins | `core/plugins` | Plugin and tooling system |

### Services

| Module | Path | Notes |
|--------|------|-------|
| API | `services/api` | REST API gateway, agent control |
| Execution Engine | `services/execution-engine` | Trade execution management |
| Scheduler | `services/scheduler` | Distributed cron and event triggers |

### Connectors

| Module | Path | Notes |
|--------|------|-------|
| DEX | `connectors/dex` | StonFi, DeDust adapters |
| Wallets | `connectors/wallets` | TON Connect, MPC, smart contract wallets |
| Market Data | `connectors/market-data` | CoinGecko, Binance providers |

### Packages

| Module | Path | Notes |
|--------|------|-------|
| SDK | `packages/sdk` | Developer SDK and agent framework |
| Shared Types | `packages/shared-types` | Common TypeScript types |
| Utils | `packages/utils` | Shared utility functions |

---

## ❌ Extended Modules (Post-MVP)

All extended modules are located under `extended/`. They MUST NOT be imported
by any MVP module. Available via dedicated import paths only.

| Module | Path | Phase | Import Path |
|--------|------|-------|-------------|
| Hedge Fund | `extended/hedgefund` | Phase 2 | `@tonaiagent/core/hedgefund` |
| Tokenomics | `extended/tokenomics` | Phase 2 | `@tonaiagent/core/tokenomics` |
| DAO Governance | `extended/dao-governance` | Phase 2 | `@tonaiagent/core/dao-governance` |
| Institutional | `extended/institutional` | Phase 2 | `@tonaiagent/core/institutional` |
| RWA | `extended/rwa` | Phase 3 | `@tonaiagent/core/rwa` |
| Fund Manager | `extended/fund-manager` | Phase 2 | `@tonaiagent/core/fund-manager` |
| Growth | `extended/growth` | Phase 4 | `@tonaiagent/core/growth` |
| Launchpad | `extended/launchpad` | Phase 3 | `@tonaiagent/core/launchpad` |
| No-Code Builder | `extended/no-code` | Phase 2 | `@tonaiagent/core/no-code` |
| Super App | `extended/superapp` | Phase 3 | `@tonaiagent/core/superapp` |
| Marketplace | `extended/marketplace` | Phase 2 | `@tonaiagent/core/marketplace` |
| Monetary Policy | `extended/monetary-policy` | Phase 3 | `@tonaiagent/core/monetary-policy` |
| Mobile UX | `extended/mobile-ux` | Phase 2 | `@tonaiagent/core/mobile-ux` |
| Personal Finance | `extended/personal-finance` | Phase 4 | `@tonaiagent/core/personal-finance` |

---

## 🔬 Research Modules (Unchanged)

Research modules are located under `research/`. No changes required.
These are experimental and should not be imported by MVP or Extended modules.

| Module | Path |
|--------|------|
| ACMS | `research/acms` |
| AGFI | `research/agfi` |
| AGFN | `research/agfn` |
| GAAMP | `research/gaamp` |
| GAEI | `research/gaei` |
| GRIF | `research/grif` |
| SGIA | `research/sgia` |
| AIFOS | `research/aifos` |

---

## Dependency Rules

```
MVP modules ──────────────┐
                          ▼
                   [FORBIDDEN]
                          │
                  extended/ modules
                  research/ modules
```

**Rule**: MVP modules MUST NOT import from `extended/` or `research/`.

Validate with:
```bash
npm run validate:mvp
```

---

## Feature Flag

To load extended modules at runtime:

```env
ENABLE_EXTENDED=true   # default: false
```

---

## Annotation Convention

MVP modules are tagged with `@mvp` in their index file JSDoc headers:

```typescript
/**
 * Module Name
 * @mvp MVP module — description of role in MVP
 */
```

---

## 🔗 Related Documents

- [MVP Architecture](./mvp-architecture.md)
- [MVP Feature Checklist](./mvp-checklist.md)
- [MVP Refactoring Plan](./mvp-refactoring.md)
- [Module Dependencies](./module-dependencies.md)
