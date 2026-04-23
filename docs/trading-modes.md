# Trading Modes

TONAIAgent supports two trading modes per agent: **simulation** and **live**.

## Overview

| Mode       | Funds at risk | Default | Reversible |
|------------|---------------|---------|------------|
| simulation | No            | Yes     | —          |
| live       | Yes           | No      | Yes        |

Mode is stored **server-side** in the agent record (`tradingMode` field). The client
`localStorage` key `tonai_live_trading_enabled` is a read-cache only; it is refreshed
from the server on every page load. A modified or malicious client cannot bypass the
server gate.

## Enabling Live Trading

### Requirements

1. **KYC tier ≥ standard** — the owning user must hold at minimum a `standard` KYC approval.
2. **Checklist acknowledgements** — all three flags must be explicitly `true` in the API payload:
   - `acknowledgeRealFunds` — user confirms real funds will be at risk.
   - `acknowledgeMainnetChecklist` — user confirms mainnet readiness checklist is complete.
   - `acknowledgeRiskAccepted` — user explicitly accepts the financial risk.

### API

```http
POST /agents/:id/enable-live-trading
Content-Type: application/json

{
  "acknowledgeRealFunds": true,
  "acknowledgeMainnetChecklist": true,
  "acknowledgeRiskAccepted": true
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "agentId": "agent_abc",
    "previousMode": "simulation",
    "newMode": "live",
    "auditId": "txn_l_1a2b3c4d_1714000000000",
    "transitionedAt": "2026-04-23T00:00:00.000Z"
  }
}
```

**Failure (422) — missing KYC:**
```json
{
  "success": false,
  "error": "KYC verification required to enable live trading",
  "code": "LIVE_TRADING_KYC_REQUIRED"
}
```

**Failure (422) — checklist incomplete:**
```json
{
  "success": false,
  "error": "acknowledgeRealFunds must be true — user must confirm real funds are at risk",
  "code": "LIVE_TRADING_CHECKLIST_INCOMPLETE"
}
```

**Failure (422) — regulatory freeze:**
```json
{
  "success": false,
  "error": "Account frozen for compliance review (case: CASE-001)",
  "code": "LIVE_TRADING_REGULATORY_FREEZE"
}
```

## Disabling Live Trading (Back to Simulation)

This direction is always allowed — no KYC or checklist required.

```http
POST /agents/:id/disable-live-trading
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "agentId": "agent_abc",
    "previousMode": "live",
    "newMode": "simulation",
    "auditId": "txn_s_deadbeef_1714000001000",
    "transitionedAt": "2026-04-23T00:01:00.000Z"
  }
}
```

## Audit Trail

Every mode transition writes an entry to the orchestrator's audit log:

| Action                        | Description                        |
|-------------------------------|------------------------------------|
| `trading_mode_enabled_live`   | Successful simulation → live       |
| `trading_mode_disabled_live`  | Successful live → simulation       |

The entry captures: `timestamp`, `userId`, `agentId`, `auditId`, `ip`, `userAgent`,
and the three acknowledgement values.

## Metrics

Counter: `tonaiagent_trading_mode_transitions_total{from, to, result}`

| `from`       | `to`         | `result`           | Meaning                         |
|--------------|--------------|--------------------|---------------------------------|
| `simulation` | `live`       | `success`          | Transition approved             |
| `simulation` | `live`       | `rejected_checklist` | Incomplete acknowledgements  |
| `simulation` | `live`       | `rejected_kyc`     | KYC requirement not met         |
| `live`       | `simulation` | `success`          | Transition to simulation        |
| `live`       | `live`       | `noop`             | Already in live mode            |
| `simulation` | `simulation` | `noop`             | Already in simulation mode      |

## UI Integration

The Telegram Mini App reads the server-side `tradingMode` from `GET /agents/:id` on init
and after every transition. `localStorage.tonai_live_trading_enabled` is a cache of the
last known server state and is always overwritten after a successful API call.

```
Init → GET /agents/:id → read tradingMode → update localStorage + banner

Switch to Live:
  UI modal (3 checkboxes) → POST /agents/:id/enable-live-trading
    → success: update localStorage=true, update banner
    → failure: show error from server, keep banner unchanged

Switch to Simulation:
  POST /agents/:id/disable-live-trading
    → success: update localStorage=false, update banner
```

## Security Properties

- Simulation is the safe default for every new agent.
- The server never trusts the client's stated mode; it always reads its own record.
- KYC enforcement can be toggled via `KYC_ENFORCEMENT_ENABLED` env var (default: on).
- Frozen accounts cannot enter live mode; existing live-mode agents should be monitored
  for forced reversion by a separate compliance job.
