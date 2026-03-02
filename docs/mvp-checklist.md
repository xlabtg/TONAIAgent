# TON AI Agent MVP Feature Checklist

> **MVP Vision**: "Create and deploy your own AI crypto agent in under 3 minutes."

This document defines the finalized MVP feature checklist, distinguishing what is **in scope** for the MVP from what is deferred to future phases.

---

## ✅ MVP Feature Checklist

### 1. Agent Creation (Single Entrypoint API)

- [x] `POST /agent/create` — Create agent with name, strategy, budget, risk level
- [x] `POST /agent/start` — Start agent execution loop
- [x] `POST /agent/pause` — Pause agent execution
- [x] `GET /agent/status` — Query agent lifecycle state
- [x] `GET /agent/metrics` — Query agent performance metrics
- [x] `GET /agent/history` — Query agent trade history
- [x] Strategy templates: DCA, Yield, Grid, Arbitrage
- [x] Risk level selection: Low / Medium / High
- [x] Budget configuration (TON amount)
- [x] Telegram bot integration per agent

### 2. Agent Runtime

- [x] 9-step execution pipeline:
  1. Fetch market data
  2. Load memory context
  3. Call AI provider (Groq-first)
  4. Validate risk constraints
  5. Generate action plan
  6. Simulate transaction
  7. Execute on-chain (or simulation)
  8. Record outcome
  9. Update analytics
- [x] Agent lifecycle state machine: `created → funded → active ↔ paused → suspended | migrated | terminated`
- [x] Simulation mode (no real funds at risk)
- [x] Risk controls: max budget cap, max drawdown, kill switch, auto-pause on failure, stop-loss
- [x] Concurrent agent management (up to 50 agents)
- [x] Event-driven observability (lifecycle events, pipeline events)

### 3. On-Chain Integration (TON)

- [x] TON wallet creation and management
- [x] TON transaction execution (in simulation + live mode)
- [x] Basic payment logic for agent funding
- [x] Smart contract factory for agent contracts
- [x] Real-time balance tracking

### 4. Demo Flow

- [x] User creates agent via API or Telegram
- [x] Agent connects to Telegram bot (notifications + commands)
- [x] Agent allocates TON wallet budget
- [x] Agent executes a strategy action (simulated or live)
- [x] Trade is logged and visible in metrics/history
- [x] Full end-to-end runnable in simulation mode

### 5. Security (Minimum Viable)

- [x] API key / authentication for agent endpoints
- [x] Secure key handling (no raw private keys in memory longer than needed)
- [x] Kill switch (immediate emergency stop per agent or globally)
- [x] Input validation on all agent creation parameters

### 6. Observability & Admin

- [x] Admin dashboard: agent monitoring, risk control, emergency controls
- [x] Role-based access control: viewer / operator / admin / superadmin
- [x] Basic fraud detection flags
- [x] Strategy performance metrics (PnL, drawdown, trade count)

---

## ❌ Out of MVP Scope (Deferred to Phase 2+)

| Feature | Deferred To |
|---|---|
| Institutional Suite | Phase 2 |
| Hedge Fund module | Phase 2 |
| Ecosystem Fund | Phase 2 |
| Strategy Marketplace (public) | Phase 2 |
| Copy Trading | Phase 2 |
| AI Credit Scoring / Lending | Phase 2 |
| Advanced Tokenomics (TONAI staking, governance) | Phase 2 |
| Multi-chain / Omnichain Orchestration | Phase 3 |
| Super App Layer | Phase 3 |
| Launchpad (VC fund management) | Phase 3 |
| AI Safety advanced modules | Phase 3 |
| Regulatory Compliance Engine | Phase 3 |
| Data Platform | Phase 3 |
| Institutional Network | Phase 4 |
| Growth / Referral Engine | Phase 4 |
| Personal Finance AI Assistant | Phase 4 |

---

## 📋 MVP Acceptance Criteria

- [ ] A new user can create and start an agent in **under 3 minutes** via the API
- [ ] Agent runs the full 9-step execution pipeline at least once (simulation mode)
- [ ] Agent sends at least one Telegram notification during its lifecycle
- [ ] Agent performs at least one TON wallet operation
- [ ] Admin can view agent status and apply emergency stop
- [ ] All MVP endpoints return correct HTTP status codes and typed responses
- [ ] Simulation mode prevents any real on-chain transactions until explicitly enabled
- [ ] All MVP modules pass unit test suite (`npm test`)

---

## 🔗 Related Issues

- **#89** — This issue (MVP Architecture Definition)
- **#90** — Demo Scenario
- **#91** — One-Click Agent Creation API
- **#92** — Agent Lifecycle Cloud Orchestrator
- **#93** — Production Deployment Framework
