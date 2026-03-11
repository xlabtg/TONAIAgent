# TON AI Agent — MVP Feature Checklist

> **MVP Vision**: "Launch your own AI crypto agent in Telegram in under 3 minutes."

This document defines the finalized MVP feature checklist as established in Issue #178. It distinguishes what is **in scope** for the MVP from what is deferred to future phases.

---

## MVP Deliverables

- [ ] Finalized MVP architecture documentation
- [ ] Updated repository structure aligned with MVP
- [ ] Confirmation of core system components
- [ ] Documentation updates in README.md
- [ ] Development guidelines for upcoming issues

---

## MVP Feature Checklist

### 1. Telegram Bot Interface

- [ ] `/start` command — opens Mini App onboarding flow
- [ ] `/agents` command — lists user's active agents
- [ ] `/create_agent` command — guides user to create a new agent
- [ ] `/analytics` command — shows portfolio analytics summary
- [ ] Telegram notifications — trade events, agent state changes, performance alerts
- [ ] Bot webhook configured and operational

### 2. Telegram Mini App (Primary UI)

- [ ] **Dashboard screen** — portfolio value, active agent count, performance summary
- [ ] **Create Agent screen** — strategy selection, capital allocation, launch button
- [ ] **Strategy Marketplace screen** — browse and select available strategies
- [ ] **Agent Analytics screen** — performance charts, trade history, portfolio growth
- [ ] Telegram Mini App authentication (WebApp init data verification)
- [ ] Mobile-first design optimized for Telegram interface

### 3. Backend API (PHP + MySQL)

- [ ] `POST /agents/create` — create a new AI agent (name, strategy, capital, risk level)
- [ ] `POST /agents/start` — start agent execution
- [ ] `POST /agents/stop` — stop agent execution
- [ ] `GET /agents` — list all agents for authenticated user
- [ ] `GET /agents/{id}/stats` — get agent performance stats
- [ ] `POST /api/webhook/telegram` — handle Telegram bot webhook
- [ ] Authentication via Telegram WebApp init data
- [ ] Input validation and sanitization on all endpoints
- [ ] Prepared statements for all database queries

### 4. Agent Manager

- [ ] Agent creation with configuration (strategy, capital allocation, risk level)
- [ ] Agent lifecycle state machine:
  - `CREATED` → `RUNNING` (on start)
  - `RUNNING` ↔ `PAUSED` (on pause/resume)
  - `RUNNING` → `STOPPED` (on stop)
  - `RUNNING` → `ERROR` (on critical failure)
- [ ] Agent state persisted to MySQL database
- [ ] Periodic strategy execution scheduling
- [ ] Agent state queries return current status

### 5. Strategy Engine v1

- [ ] **Trend Following strategy** — configurable, modular implementation
- [ ] **Basic Arbitrage strategy** — simulates price difference across pairs
- [ ] **AI Signal Strategy** — calls AI provider (Groq primary) for buy/sell signals
- [ ] Strategies are configurable (risk level, frequency, capital allocation)
- [ ] All strategies compatible with Agent Manager interface
- [ ] Strategy selection stored per agent in database

### 6. Trading Simulator

- [ ] Fetch real-time prices from CoinGecko API
- [ ] Fetch real-time prices from Binance public market data
- [ ] Execute simulated trades (no real funds moved)
- [ ] Record trade history in database (pair, price, amount, timestamp, PnL)
- [ ] Simulate realistic slippage and fees
- [ ] Simulation mode prevents any real on-chain transactions

### 7. Portfolio Analytics

- [ ] **Portfolio Value** — total simulated value of all holdings
- [ ] **PnL (Profit and Loss)** — accumulated over time per agent and overall
- [ ] **Strategy Allocation** — capital distribution across active strategies
- [ ] **Agent Performance** — per-agent return rate, trade count, win rate
- [ ] Portfolio value over time chart data
- [ ] Strategy contribution to total return chart data

### 8. Installer System

- [ ] One-click installer accessible via web browser (`install.php`)
- [ ] Database configuration — creates tables and schema
- [ ] Telegram bot token configuration
- [ ] Telegram webhook registration via Telegram Bot API
- [ ] Application file configuration
- [ ] Admin account creation
- [ ] Installer self-deletes or warns to delete after setup
- [ ] Deployment checklist in documentation

---

## Out of MVP Scope (Deferred to Future Phases)

| Feature | Deferred To |
|---|---|
| DAO governance | Phase 2+ |
| Hedge fund infrastructure | Phase 2+ |
| Global liquidity networks | Phase 2+ |
| Cross-chain liquidity | Phase 2+ |
| Clearing house systems | Phase 2+ |
| Institutional compliance layers | Phase 2+ |
| Strategy Marketplace (public user submissions) | Phase 2 |
| Copy Trading | Phase 2 |
| AI Credit Scoring / Lending | Phase 2 |
| Advanced Tokenomics (staking, governance) | Phase 2 |
| Multi-chain / Omnichain support | Phase 3 |
| Super App Layer | Phase 3 |
| AI Safety advanced modules | Phase 3 |
| Regulatory Compliance Engine | Phase 3 |
| Data Platform | Phase 3 |
| Institutional Network | Phase 4 |
| Growth / Referral Engine | Phase 4 |
| Personal Finance AI Assistant | Phase 4 |

---

## MVP Acceptance Criteria

The MVP is considered complete when:

- [ ] The system can be deployed via the installer on standard PHP + MySQL hosting
- [ ] A user can open the Telegram bot and launch the Mini App
- [ ] A user can create an AI agent through the Mini App
- [ ] An agent can execute a strategy in simulation mode
- [ ] Simulated trades are recorded and reflected in Portfolio Analytics
- [ ] The Telegram bot sends at least one notification during the agent lifecycle
- [ ] Portfolio analytics render correctly in the Mini App
- [ ] All core API endpoints return correct HTTP status codes and typed responses
- [ ] Simulation mode prevents any real on-chain transactions until explicitly enabled

---

## MVP Demo Requirements

A working MVP must demonstrate the following in under 5 minutes:

1. Launching the Telegram bot (`/start`)
2. Opening the Mini App
3. Creating an AI agent (select strategy + configure)
4. Running a strategy (agent transitions to RUNNING, simulated trades execute)
5. Displaying portfolio analytics (PnL, trade history, portfolio value)

---

## Related Documents

- [MVP Architecture](./mvp-architecture.md)
- [MVP Module List](./mvp-modules.md)
- [MVP Refactoring Plan](./mvp-refactoring.md)
- [Development Guidelines](./development-guidelines.md)
