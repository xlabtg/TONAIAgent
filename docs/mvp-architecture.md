# TON AI Agent — MVP Architecture

> **MVP Vision**: "Launch your own AI crypto agent in Telegram in under 3 minutes."

This document defines the **official MVP architecture freeze** as established in Issue #178. From this point forward, all development must align with this architecture. Non-MVP features are postponed to future milestones.

---

## Architecture Overview

The MVP delivers a Telegram-native AI Agent platform. Users interact entirely through Telegram — the bot as an entry point and the Mini App as the primary UI.

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

---

## Core System Components

### 1. Telegram Bot Interface

Primary entry point for users. Handles:
- **Onboarding** — `/start` command opens the Mini App
- **Bot Commands** — `/agents`, `/create_agent`, `/analytics`
- **Notifications** — trade events, strategy updates, performance alerts
- **Mini App Launch** — inline keyboard button to open the Mini App

### 2. Telegram Mini App (Primary UI)

The main user-facing interface. Screens:
- **Dashboard** — portfolio value, active agents, performance summary
- **Create Agent** — select strategy, allocate capital, launch agent
- **Strategy Marketplace** — browse and select from available strategies
- **Agent Analytics** — performance graphs, trade history, portfolio growth

Runs on standard web hosting via HTTPS, embedded in Telegram.

### 3. Backend API

Central PHP backend service. Responsibilities:
- Agent creation and lifecycle management
- Strategy execution coordination
- Portfolio analytics computation
- Telegram Mini App data service
- Telegram webhook processing

**Core Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/agents/create` | Create a new AI agent |
| `POST` | `/agents/start` | Start agent execution |
| `POST` | `/agents/stop` | Stop agent execution |
| `GET`  | `/agents` | List all user agents |
| `GET`  | `/agents/{id}/stats` | Get agent performance stats |

### 4. Agent Manager

Handles the full agent lifecycle:
- Creating agents with configuration (strategy, capital allocation)
- Managing lifecycle state machine
- Scheduling periodic strategy execution
- Tracking and persisting agent state

**Agent States:**

```
CREATED → RUNNING ↔ PAUSED → STOPPED
                              ERROR
```

| State | Description |
|-------|-------------|
| `CREATED` | Agent configured but not yet started |
| `RUNNING` | Agent actively executing strategy |
| `PAUSED` | Agent execution temporarily suspended |
| `STOPPED` | Agent execution terminated |
| `ERROR` | Agent encountered a critical error |

### 5. Strategy Engine v1

Executes the three initial strategies:

| Strategy | Description |
|----------|-------------|
| **Trend Following** | Buys when price trends up, sells on reversal |
| **Basic Arbitrage** | Identifies and simulates price differences across pairs |
| **AI Signal Strategy** | Uses AI (Groq) to generate buy/sell signals from market data |

Strategies are:
- **Configurable** — risk level, capital allocation, frequency
- **Modular** — each strategy is a self-contained class
- **Compatible** — all strategies share the Agent Runtime interface

### 6. Trading Simulator

For the MVP, real trading is not required. The simulator:
- Executes simulated trades using real-time prices from public APIs
- Price sources: CoinGecko API, Binance public market data
- Produces realistic trade history and PnL calculations
- Prevents any real funds from being moved without explicit opt-in

### 7. Portfolio Analytics

Core metrics tracked per agent and across all agents:

| Metric | Description |
|--------|-------------|
| **Portfolio Value** | Total simulated value of all holdings |
| **PnL** | Profit and loss over time |
| **Strategy Allocation** | Capital split per strategy |
| **Agent Performance** | Per-agent return, trade count, win rate |

Charts generated:
- Portfolio value over time
- Strategy contribution to total return

### 8. Installer System

Simple one-click installer for anyone to deploy on standard hosting:

**Requirements:**
- PHP 8.0+
- MySQL 8.0+ or MariaDB 10.3+
- HTTPS (required for Telegram)
- Apache with mod_rewrite or Nginx

**Installer handles:**
- Database configuration and schema creation
- Telegram bot token setup
- Webhook registration with Telegram
- Application file configuration and permissions
- Admin account creation

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TELEGRAM LAYER                               │
│                                                                     │
│   ┌────────────────────┐          ┌──────────────────────────────┐  │
│   │   Telegram Bot     │          │   Telegram Mini App          │  │
│   │                    │          │   (Primary UI)               │  │
│   │  /start            │          │                              │  │
│   │  /agents           │          │  Dashboard                   │  │
│   │  /create_agent     │◄────────►│  Create Agent                │  │
│   │  /analytics        │          │  Strategy Marketplace        │  │
│   │  Notifications     │          │  Agent Analytics             │  │
│   └────────────────────┘          └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND API (PHP + MySQL)                     │
│                                                                     │
│   POST /agents/create    POST /agents/start    POST /agents/stop    │
│   GET /agents            GET /agents/{id}/stats                     │
│   POST /api/webhook/telegram                                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
┌──────────────────┐ ┌───────────────┐ ┌──────────────────────────┐
│  Agent Manager   │ │ Strategy      │ │  Portfolio Analytics     │
│                  │ │ Engine v1     │ │                          │
│  Lifecycle       │ │               │ │  Portfolio Value         │
│  Scheduling      │ │  Trend Follow │ │  PnL                     │
│  State tracking  │ │  Arbitrage    │ │  Strategy Allocation     │
│                  │ │  AI Signal    │ │  Charts                  │
└──────────────────┘ └───────┬───────┘ └──────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Trading Simulator  │
                  │                      │
                  │  CoinGecko API       │
                  │  Binance Market Data │
                  │  Simulated Trades    │
                  │  Trade History       │
                  └──────────────────────┘
```

---

## Deployment Architecture

The MVP runs on any standard PHP hosting provider.

```
Internet
   │
   ▼
┌──────────────────────────────────────┐
│   Standard Web Hosting (PHP + MySQL) │
│                                      │
│   ├── /public          Web root      │
│   │     ├── index.php  Entry point   │
│   │     └── miniapp/   Mini App UI   │
│   ├── /app             PHP backend   │
│   │     ├── agents/    Agent logic   │
│   │     ├── strategies/  Strategies  │
│   │     └── analytics/ Analytics     │
│   └── /database        MySQL         │
└──────────────────────────────────────┘
         │                │
         ▼                ▼
┌─────────────┐  ┌───────────────────────┐
│  Telegram   │  │  Public Market APIs   │
│  Bot API    │  │  (CoinGecko / Binance)│
└─────────────┘  └───────────────────────┘
```

---

## User Workflow

1. User sends `/start` to the Telegram bot
2. Bot sends a welcome message with a button to open the Mini App
3. User opens the Telegram Mini App
4. User navigates to **Create Agent**
5. User selects a strategy (Trend Following, Arbitrage, or AI Signal)
6. User sets capital allocation and risk level
7. User clicks **Launch Agent**
8. Agent Manager creates the agent in the database (`CREATED` state)
9. User clicks **Start** — agent transitions to `RUNNING`
10. Strategy Engine fetches market data and simulates trades
11. Portfolio Analytics updates PnL and performance metrics
12. Telegram bot sends notifications for trade events
13. User monitors portfolio on the **Analytics** screen

---

## Out of Scope for MVP

The following features are **not included** in the MVP and are postponed to future milestones:

| Feature | Future Phase |
|---------|-------------|
| DAO governance | Phase 2+ |
| Hedge fund infrastructure | Phase 2+ |
| Global liquidity networks | Phase 2+ |
| Cross-chain liquidity | Phase 2+ |
| Clearing house systems | Phase 2+ |
| Institutional compliance layers | Phase 2+ |
| Multi-chain / Omnichain support | Phase 3 |
| Advanced AI safety modules | Phase 3 |
| Regulatory Compliance Engine | Phase 3 |
| Strategy Marketplace (public submissions) | Phase 2 |
| Copy Trading | Phase 2 |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 8.0+ |
| Database | MySQL 8.0+ / MariaDB 10.3+ |
| Frontend | Telegram Mini App (HTML/CSS/JS) |
| Bot | Telegram Bot API |
| Market Data | CoinGecko API, Binance public API |
| AI Provider | Groq (primary), OpenAI/Anthropic (fallback) |
| Hosting | Standard PHP web hosting |
| HTTPS | Required for Telegram Mini Apps |

---

## MVP Demo Script

A working MVP must demonstrate the following in under 5 minutes:

1. **Launch the bot** — send `/start` to the Telegram bot
2. **Open the Mini App** — click the "Open App" button
3. **Create an AI agent** — navigate to Create Agent, select strategy, configure
4. **Run a strategy** — start the agent, watch simulated trades execute
5. **Display analytics** — navigate to Analytics, view portfolio performance

---

## Success Criteria

The MVP is considered successful when:

- [ ] The system can be deployed via the installer on standard PHP hosting
- [ ] A user can create and run an AI agent through the Telegram Mini App
- [ ] Simulated trading produces visible analytics and PnL results
- [ ] The platform runs stably inside Telegram
- [ ] The Telegram bot sends notifications for agent events
- [ ] All core API endpoints return correct responses
- [ ] Portfolio analytics render correctly in the Mini App

---

## Related Documents

- [MVP Feature Checklist](./mvp-checklist.md)
- [MVP Module List](./mvp-modules.md)
- [MVP Refactoring Plan](./mvp-refactoring.md)
- [Development Guidelines](./development-guidelines.md)
- [Full Architecture Reference](./architecture.md)
