# TON AI Agent MVP Module Inclusion/Exclusion List

This document catalogs every module in the codebase and explicitly marks its MVP status.

---

## Legend

| Status | Meaning |
|---|---|
| ✅ **MVP Core** | Required for the MVP demo flow — must be production-ready |
| 🔧 **MVP Support** | Used by MVP Core modules but not directly user-facing |
| 🚧 **Partial** | Partially used by MVP; only the listed sub-features are in scope |
| ❌ **Excluded** | Deferred to Phase 2+ — not built or integrated in MVP |

---

## Module Status Table

### Core Runtime & Orchestration

| Module | Path | Status | Notes |
|---|---|---|---|
| Agent Runtime Orchestrator | `src/agent-runtime/` | ✅ **MVP Core** | 9-step pipeline, lifecycle state machine, event system |
| Demo Agent | `src/demo-agent/` | ✅ **MVP Core** | Primary agent implementation, REST API, strategies, risk |
| SDK | `src/sdk/` | 🔧 **MVP Support** | TypeScript types and client helpers for MVP modules |
| Multi-Agent | `src/multi-agent/` | ❌ **Excluded** | Agent swarms deferred to Phase 2 |

### AI & Strategy

| Module | Path | Status | Notes |
|---|---|---|---|
| AI Router + Providers | `src/ai/` | ✅ **MVP Core** | Groq-first routing for agent decisions |
| Strategy Engine | `src/strategy/` | 🚧 **Partial** | DCA, Yield, Grid, Arbitrage strategies only |
| No-Code Builder | `src/no-code/` | ❌ **Excluded** | Phase 2 |
| Token Strategy | `src/token-strategy/` | ❌ **Excluded** | Phase 3 |

### Blockchain & Payments

| Module | Path | Status | Notes |
|---|---|---|---|
| TON Factory | `src/ton-factory/` | ✅ **MVP Core** | Wallet creation, smart contract deployment, transactions |
| Payments | `src/payments/` | 🚧 **Partial** | Agent funding and basic payment logic only |
| Omnichain | `src/omnichain/` | ❌ **Excluded** | Multi-chain support is Phase 3 |

### Security

| Module | Path | Status | Notes |
|---|---|---|---|
| Security | `src/security/` | 🔧 **MVP Support** | Key management, auth, audit logging |
| AI Safety | `src/ai-safety/` | ❌ **Excluded** | Advanced AI safety tooling is Phase 3 |
| Protocol Security | `src/protocol/security/` | ❌ **Excluded** | Protocol-level security is Phase 3 |
| Regulatory | `src/regulatory/` | ❌ **Excluded** | Compliance engine is Phase 3 |

### User Interface & Experience

| Module | Path | Status | Notes |
|---|---|---|---|
| MVP Admin Dashboard | `src/mvp/admin-dashboard` | ✅ **MVP Core** | Agent monitoring, risk controls, RBAC |
| Telegram Integration | (via `demo-agent/agent.ts`) | ✅ **MVP Core** | Bot commands + notifications |
| Mobile UX | `src/mobile-ux/` | ❌ **Excluded** | Telegram Mini App UI is Phase 2 |
| MVP Module Index | `src/mvp/` (remaining) | ❌ **Excluded** | Strategy Marketplace, Revenue, Rankings — Phase 2 |

### Marketplace & Economy

| Module | Path | Status | Notes |
|---|---|---|---|
| Marketplace | `src/marketplace/` | ❌ **Excluded** | Public strategy marketplace is Phase 2 |
| Tokenomics | `src/tokenomics/` | ❌ **Excluded** | TONAI staking and governance are Phase 2 |
| Growth | `src/growth/` | ❌ **Excluded** | Referral and growth engine are Phase 4 |

### Institutional & Advanced Finance

| Module | Path | Status | Notes |
|---|---|---|---|
| Institutional | `src/institutional/` | ❌ **Excluded** | Phase 2 |
| Institutional Network | `src/institutional-network/` | ❌ **Excluded** | Phase 4 |
| Hedge Fund | `src/hedgefund/` | ❌ **Excluded** | Phase 2 |
| Launchpad | `src/launchpad/` | ❌ **Excluded** | Phase 3 |
| Ecosystem Fund | `src/ecosystem-fund/` | ❌ **Excluded** | Phase 2 |
| AI Credit | `src/ai-credit/` | ❌ **Excluded** | Phase 2 |
| Personal Finance | `src/personal-finance/` | ❌ **Excluded** | Phase 4 |

### Infrastructure & Protocol

| Module | Path | Status | Notes |
|---|---|---|---|
| Protocol | `src/protocol/` | ❌ **Excluded** | Full protocol layer is Phase 3 |
| Data Platform | `src/data-platform/` | ❌ **Excluded** | Phase 3 |
| Super App | `src/superapp/` | ❌ **Excluded** | Phase 3 |
| Plugins | `src/plugins/` | ❌ **Excluded** | Plugin marketplace is Phase 3 |

---

## MVP Module Dependency Graph

```
demo-agent (API + strategies + risk)
    ├── agent-runtime (orchestrator + lifecycle)
    │       ├── ai (Groq-first provider routing)
    │       ├── security (key mgmt + auth)
    │       └── ton-factory (wallet + contracts)
    ├── payments (agent funding)
    └── mvp/admin-dashboard (monitoring + RBAC)

Telegram Integration
    └── demo-agent (status updates + commands)
```

---

## Module Count Summary

| Status | Count |
|---|---|
| ✅ MVP Core | 6 |
| 🔧 MVP Support | 2 |
| 🚧 Partial (limited scope) | 2 |
| ❌ Excluded (Phase 2+) | 22 |
| **Total** | **32** |

**MVP delivers ~25% of total codebase modules** — focused, shippable, and demo-ready.

---

## 🔗 Related Documents

- [MVP Feature Checklist](./mvp-checklist.md)
- [MVP Architecture Diagram](./mvp-architecture.md)
- [MVP Refactoring Plan](./mvp-refactoring.md)
