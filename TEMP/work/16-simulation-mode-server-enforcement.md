# Task: Enforce Simulation / Live Mode Server-Side

**Priority:** 🟡 MEDIUM
**Effort:** ~1 week
**Related Issue:** #325 (re-audit finding §9)
**Suggested labels:** `security`, `backend`, `simulation`

## Problem

PR #324 added the simulation/live toggle in the Telegram Mini App UI, with a banner, confirmation modal, and the state stored in `localStorage`. This is **client-side only** — the backend has no awareness of the user's selected mode, which means:

- A malicious or modified client can bypass the modal and set the live-trading flag directly.
- A browser cache / local-storage corruption can silently switch modes.
- Other entry points (API, CLI, scripts) do not share the same toggle.

Simulation vs live is a financial-risk boundary and must be enforced server-side.

## Acceptance Criteria

- [ ] Add a `tradingMode` field to the user/agent record, defaulting to `simulation`.
- [ ] All trade-execution endpoints check `tradingMode` before routing to the simulated or live engine.
- [ ] Transition from `simulation → live` requires:
  - User KYC at the required tier (see issue [`01-kyc-aml-defaults.md`](./01-kyc-aml-defaults.md))
  - Completion acknowledgement of the mainnet readiness checklist (see [`17-checklist-enforcement.md`](./17-checklist-enforcement.md))
  - Explicit API call `POST /agents/:id/enable-live-trading` with the same three acknowledgements from the UI modal sent as payload
  - Audit log entry with timestamp, user, IP, user-agent
- [ ] Transition from `live → simulation` is allowed at any time (safer direction).
- [ ] The UI reads the server-side `tradingMode` and renders accordingly; `localStorage` is a cache at most.
- [ ] Metric: `tonaiagent_trading_mode_transitions_total{from,to,result}`.
- [ ] Tests:
  - Client claims live, server says simulation → trade goes to sim engine
  - Transition without KYC → rejected
  - Transition without checklist → rejected
  - Regulatory freeze → forced back to simulation

## Files to Create/Modify

- `core/agents/trading-mode.ts` (new)
- `core/agents/orchestrator/orchestrator.ts` — read `tradingMode` per request
- `services/api/routes/agents.ts` — new endpoints for mode transitions
- `apps/mini-app/**` — fetch mode from server; drop `localStorage` as source of truth
- `tests/integration/trading-mode.test.ts`
- `docs/trading-modes.md`

## References

- Re-audit report §9: Security Documentation
- PR #324 (merged)
