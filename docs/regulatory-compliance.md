# Regulatory Compliance — KYC/AML Enforcement

This document describes the KYC/AML enforcement layer introduced in issue #311. It covers:

- The KYC tier system and what each tier unlocks
- How to configure enforcement for testnet vs. mainnet
- The KYC flow a user follows in the Telegram Mini App
- Account freeze / unfreeze procedures
- Sanctions screening and how to load external lists
- Audit trail and how to query it

---

## KYC Tier System

| Tier | Requirements | Single Transaction Limit | Daily Limit | Monthly Limit |
|------|-------------|-------------------------|-------------|---------------|
| **basic** | Email verification, sanctions check | $500 | $1,000 | $5,000 |
| **standard** | ID document + address proof, PEP check | $25,000 | $50,000 | $200,000 |
| **enhanced** | Source of funds/wealth, adverse media, ongoing monitoring | $500,000 | $1,000,000 | $10,000,000 |
| **institutional** | Full entity verification, beneficial ownership, AML policy | Unlimited | Unlimited | Unlimited |

All limits are denominated in USD equivalent.

---

## Configuring Enforcement

Enforcement is controlled via `KycEnforcementConfig`:

```typescript
import { KYC_ENFORCEMENT_DEFAULTS } from './services/regulatory/kyc-aml';

// Pre-defined configurations:
KYC_ENFORCEMENT_DEFAULTS.testnet  // minimum tier: basic
KYC_ENFORCEMENT_DEFAULTS.mainnet  // minimum tier: standard
```

### Agent Orchestrator

Enable the KYC gate on agent creation by passing `kycEnforcement` to the orchestrator:

```typescript
import { AgentOrchestrator } from './core/agents/orchestrator/orchestrator';
import { createKycAmlManager } from './services/regulatory/kyc-aml';

const kycManager = createKycAmlManager({ enabled: true });

const orchestrator = new AgentOrchestrator(
  {
    kycEnforcement: {
      enabled: true,       // set false to disable (advisory only)
      mode: 'mainnet',     // 'testnet' requires basic tier; 'mainnet' requires standard
    },
  },
  kycManager,
);
```

**Demo strategy bypass:** Agents created with `strategy: 'demo'` always bypass the KYC gate. This allows safe onboarding demonstrations without requiring real identity documents.

### Execution Engine

Enable AML transaction checks on the execution engine:

```typescript
import { createExecutionEngine } from './core/trading/live/execution-engine';
import { createConnectorRegistry } from './core/trading/live/connector';

const registry = createConnectorRegistry();
const engine = createExecutionEngine(
  registry,
  { enforceAmlChecks: true },
  kycManager,               // pass the shared KycAmlManager instance
);
```

When `enforceAmlChecks` is `true`, every call to `engine.execute()` first runs `kycManager.checkTransaction()`. If the AML check returns `approved: false` (e.g. destination is blacklisted), the execution is rejected with status `failed` and error message prefixed `AML check blocked`.

---

## User-Facing KYC Flow (Telegram Mini App)

1. **Onboarding screen** — User opens the Mini App for the first time. The app detects `kycStatus === 'none'` and presents a compliance notice explaining that KYC is required for live trading.

2. **Tier selection** — User selects the tier appropriate to their use case (Basic for small amounts, Standard for retail trading).

3. **Document upload** — For Standard and above, the user submits a government-issued ID (passport, national ID, or driver's licence) and a proof-of-address document (utility bill or bank statement).

4. **Sanctions & PEP screening** — Documents are automatically screened against OFAC SDN, EU Consolidated, UN, and UK HM Treasury lists. PEP checks run in parallel.

5. **Approval** — On approval (`kycStatus === 'approved'`), the user's `approvedTier` is stored. They can now create trading agents up to the tier limits.

6. **Ongoing monitoring** — Enhanced and Institutional tiers have ongoing monitoring enabled. Unusual patterns (large transactions, rapid succession, high-risk addresses) generate AML alerts for compliance review.

### Status messages to display

| Status | User message |
|--------|-------------|
| `none` | "Complete identity verification to start trading" |
| `pending` | "Verification in review — you'll be notified within 24 hours" |
| `additional_info_required` | "Additional documents needed — check your notifications" |
| `approved` | "Verified ✓" (show tier badge) |
| `rejected` | "Verification unsuccessful — contact support" |

---

## Enforcing Tier Limits on Trades

Before submitting a trade, call `enforceTierLimits`:

```typescript
const check = await kycManager.enforceTierLimits(
  userId,
  tradeAmountUsd,
  'singleTransaction',
);

if (!check.allowed) {
  throw new Error(check.reason);
}
```

The limit types map to:
- `singleTransaction` — per-order limit
- `dailyTransaction` — cumulative 24-hour limit (application-level tracking required)
- `monthlyTransaction` — cumulative 30-day limit (application-level tracking required)

> **Note:** `dailyTransaction` and `monthlyTransaction` checks require the caller to pass the cumulative amount for the period, not just the current transaction amount. The platform is responsible for tracking rolling totals.

---

## Account Freeze / Unfreeze

Compliance officers can freeze an account immediately:

```typescript
const frozenAccount = kycManager.freezeAccount(
  userId,
  'Suspicious activity — SAR filed',
  'compliance-officer-id',
);
// frozenAccount.caseId — unique case reference for the freeze event
```

A frozen account is blocked from:
- Creating new trading agents
- Executing any trades (if `enforceAmlChecks` is enabled)

To lift a freeze after investigation:

```typescript
kycManager.unfreezeAccount(userId, 'compliance-officer-id', 'Investigation complete — no action required');
```

Both operations emit regulatory events (`kyc.account_frozen` / `kyc.account_unfrozen`) and append to the audit log.

---

## Sanctions Screening

The `SanctionsScreener` provides address and entity screening:

```typescript
import { createSanctionsScreener } from './services/regulatory/sanctions';

const screener = createSanctionsScreener({
  lists: ['ofac_sdn', 'eu_consolidated', 'un_security_council', 'uk_hm_treasury'],
  matchThreshold: 85,  // minimum match score to consider a hit
});
```

### Loading external lists

Download OFAC/EU/UN list CSVs and bulk-load them:

```typescript
screener.loadSanctionsList('ofac_sdn', [
  {
    address: 'EQC_sanctioned_address...',
    match: {
      list: 'ofac_sdn',
      entityName: 'Blocked Entity LLC',
      entityType: 'entity',
      matchScore: 100,
      sanctionedSince: new Date('2023-06-01'),
      programs: ['CYBER2', 'DPRK'],
      aliases: [],
    },
  },
]);
```

Results are cached for 24 hours. Addresses are rarely removed from sanctions lists, so this cache duration is standard practice.

### Integrating with external providers

In production, replace the internal implementation in `SanctionsScreener.screenAddress()` with a call to your chosen provider:

- **Chainalysis KYT** — on-chain AML, real-time crypto transaction screening
- **ComplyAdvantage** — KYC/AML data, entity screening, adverse media
- **Elliptic** — crypto AML screening, wallet risk scoring

---

## Audit Trail

All KYC enforcement decisions are appended to an in-memory audit log. Query it by userId:

```typescript
const log = kycManager.getAuditLog(userId);
// Returns: [{ id, timestamp, action, userId, details }]
```

Actions include:
- `kyc_enforcement_allowed` / `kyc_enforcement_blocked` — agent creation gate decisions
- `tier_limit_allowed` / `tier_limit_blocked` — transaction limit checks
- `kyc_enforcement_blocked_frozen` — frozen account attempted action
- `account_frozen` / `account_unfrozen` — freeze/unfreeze events

In production, persist audit log entries to a write-once store (e.g. append-only database table, immutable S3 object) for regulatory reporting and SAR filings.

---

## Phased Rollout

| Phase | Environment | Minimum KYC | Notes |
|-------|------------|-------------|-------|
| Current | Testnet | basic | Advisory mode available |
| Mainnet launch | Mainnet | standard | Full enforcement required |
| Institutional | Mainnet | institutional | For hedge funds and family offices |

- **Testnet** (`mode: 'testnet'`): minimum tier is `basic` — requires only email verification and a sanctions check.
- **Mainnet** (`mode: 'mainnet'`): minimum tier is `standard` — requires ID document and address proof.

> **Legal note:** Consult qualified legal counsel for jurisdiction-specific requirements before go-live. Requirements vary significantly across EU, US, APAC, and MENA regions. Keep KYC data encrypted and separate from trading data (data minimization principle under GDPR Article 5).
