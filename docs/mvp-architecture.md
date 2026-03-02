# TON AI Agent MVP Architecture

> **MVP Vision**: "Create and deploy your own AI crypto agent in under 3 minutes."

This document defines the official MVP architecture — the target system design for the initial production release.

---

## 🏗 MVP System Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════╗
║                        USER INTERACTION LAYER                        ║
║                                                                      ║
║   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  ║
║   │   Telegram Bot  │   │   REST API      │   │  Admin Dashboard│  ║
║   │  (commands +    │   │  (agent CRUD,   │   │  (monitoring +  │  ║
║   │  notifications) │   │   status, logs) │   │   risk control) │  ║
║   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘  ║
╚════════════╪════════════════════╪════════════════════╪═════════════╝
             │                    │                    │
             ▼                    ▼                    ▼
╔══════════════════════════════════════════════════════════════════════╗
║                       API / ORCHESTRATOR LAYER                       ║
║                                                                      ║
║   ┌──────────────────────────────────────────────────────────────┐  ║
║   │                    Agent Orchestrator                         │  ║
║   │  • Agent creation, lifecycle management (create/start/pause) │  ║
║   │  • Request routing to runtime                                │  ║
║   │  • Event aggregation                                         │  ║
║   │  • Authentication & authorization (API keys, RBAC)          │  ║
║   └────────────────────────────┬─────────────────────────────────┘  ║
╚════════════════════════════════╪════════════════════════════════════╝
                                 │
                                 ▼
╔══════════════════════════════════════════════════════════════════════╗
║                        AGENT RUNTIME LAYER                           ║
║                                                                      ║
║   ┌──────────────────────────────────────────────────────────────┐  ║
║   │                 9-Step Execution Pipeline                     │  ║
║   │                                                              │  ║
║   │  1. fetch_data → 2. load_memory → 3. call_ai                │  ║
║   │  4. validate_risk → 5. generate_plan → 6. simulate_tx       │  ║
║   │  7. execute_onchain → 8. record_outcome → 9. update_analytics│  ║
║   └──────────┬───────────────────────────────┬───────────────────┘  ║
║              │                               │                      ║
║   ┌──────────▼──────────┐       ┌────────────▼─────────────────┐   ║
║   │   Risk Manager      │       │       Strategy Engine         │   ║
║   │  • Max budget cap   │       │  • DCA (dollar-cost average)  │   ║
║   │  • Max drawdown     │       │  • Yield simulation           │   ║
║   │  • Kill switch      │       │  • Grid trading               │   ║
║   │  • Auto-pause       │       │  • Arbitrage (simulation)     │   ║
║   │  • Stop-loss        │       └──────────────────────────────┘   ║
║   └─────────────────────┘                                          ║
╚═════════════════════════════╪════════════════════════════════════════╝
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
╔════════════════════╗ ╔══════════════╗ ╔═══════════════════╗
║  TON WALLET LAYER  ║ ║  AI LAYER    ║ ║  SECURITY LAYER   ║
║                    ║ ║              ║ ║                   ║
║ • Wallet creation  ║ ║ • Groq (P1)  ║ ║ • Secure key mgmt ║
║ • Balance tracking ║ ║ • Anthropic  ║ ║ • Input validation║
║ • Transactions     ║ ║   (P2)       ║ ║ • Emergency stops ║
║ • Smart contracts  ║ ║ • OpenAI (P3)║ ║ • Audit logging   ║
║ • Basic payments   ║ ║ • Fallback   ║ ║                   ║
╚════════════════════╝ ╚══════════════╝ ╚═══════════════════╝
```

---

## 📦 MVP Module Map

| Layer | Module | Purpose |
|---|---|---|
| User Interaction | `demo-agent/api` | REST API endpoints for agent CRUD and control |
| User Interaction | Telegram Integration | Bot commands + agent status notifications |
| User Interaction | `mvp/admin-dashboard` | Operator monitoring and risk controls |
| Orchestration | `agent-runtime/orchestrator` | Lifecycle management, pipeline execution |
| Strategy | `demo-agent/strategies` | DCA, Yield, Grid, Arbitrage implementations |
| Risk | `demo-agent/risk` | Risk validation, kill switches, drawdown protection |
| AI | `ai/` providers | Groq-first AI routing for agent decisions |
| Blockchain | `ton-factory/` | TON wallet, smart contract deployment |
| Blockchain | `payments/` | Basic payment logic, agent funding |
| Security | `security/` | Key management, auth, audit logging |

---

## 🔄 Agent Lifecycle State Machine

```
          ┌─────────┐
          │ created │  ← POST /agent/create
          └────┬────┘
               │ fund()
               ▼
          ┌─────────┐
          │ funded  │
          └────┬────┘
               │ start()
               ▼
          ┌─────────┐   pause()   ┌────────┐
          │ active  │◄───────────►│ paused │
          └────┬────┘             └────────┘
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
  ┌──────────┐ ┌──────────┐ ┌────────────┐
  │suspended │ │ migrated │ │ terminated │
  └──────────┘ └──────────┘ └────────────┘
```

**Transition triggers:**
- `created → funded`: wallet funded with budget
- `funded → active`: `start()` called
- `active ↔ paused`: user command or risk trigger
- `active → suspended`: risk limit hit (drawdown / kill switch)
- `active → terminated`: explicit stop or critical error

---

## 🔑 Key Design Decisions

### 1. Simulation-First
All agents default to simulation mode. Live mode requires explicit opt-in. This prevents accidental fund loss during onboarding.

### 2. Groq-First AI
The AI routing layer prioritizes Groq for low-latency inference (typically < 200ms), with cascading fallback to Anthropic → OpenAI → Google → xAI → OpenRouter.

### 3. Framework-Agnostic API
The `demo-agent/api` module uses `ApiRequest`/`ApiResponse` types instead of framework-specific objects. This enables deployment on Vercel, Express, Fastify, or any serverless platform without code changes.

### 4. Event-Driven Observability
Every lifecycle transition and pipeline step emits a typed `RuntimeEvent`. This feeds the admin dashboard and Telegram notifications without tight coupling.

### 5. Risk-First Architecture
The `RiskManager` runs as a validation gate **before** any transaction is simulated or executed. Budget cap, drawdown limit, and kill switch checks cannot be bypassed.

---

## 🚀 Deployment Architecture (MVP)

```
Internet
   │
   ▼
┌──────────────────────┐
│   Vercel Serverless  │  ← API endpoints (stateless)
│   /api/agent/*       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Agent Runtime      │  ← Orchestrator (stateful, Node.js)
│   (Cloud VM / K8s)   │
└──────┬───────┬───────┘
       │       │
       ▼       ▼
┌──────────┐ ┌──────────────────────┐
│  TON RPC │ │  External AI APIs    │
│  Endpoint│ │  (Groq / Anthropic)  │
└──────────┘ └──────────────────────┘
```

For MVP, a single cloud VM or minimal Kubernetes deployment is sufficient. The Vercel layer handles external HTTP, while the runtime process manages agent state.

---

## 📐 Data Flow: Agent Execution Cycle

```
User Request
     │
     ▼
[API Gateway] ──validates──► [Auth / RBAC]
     │
     ▼
[Agent Orchestrator]
     │ dispatches pipeline
     ▼
[Step 1: fetch_data]      ← Market data from TON RPC / price feeds
     │
[Step 2: load_memory]     ← Recent trade history, agent config
     │
[Step 3: call_ai]         ← Groq: "Given context, what action to take?"
     │
[Step 4: validate_risk]   ← RiskManager: within budget? drawdown ok?
     │
[Step 5: generate_plan]   ← Strategy: translate AI decision to tx params
     │
[Step 6: simulate_tx]     ← SimulationManager: dry run, check slippage
     │
[Step 7: execute_onchain] ← TON wallet: sign + broadcast (or skip if sim)
     │
[Step 8: record_outcome]  ← Persist trade to history
     │
[Step 9: update_analytics]← Update PnL, drawdown, metrics
     │
     ▼
[Emit Events] ──► Telegram notification + Admin dashboard update
```

---

## 🔗 Related Documents

- [MVP Feature Checklist](./mvp-checklist.md)
- [MVP Module Inclusion/Exclusion List](./mvp-modules.md)
- [MVP Refactoring Plan](./mvp-refactoring.md)
- [Full Architecture Reference](./architecture.md)
