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

### Default-on enforcement (Issue #330)

Both compliance gates default to **enabled** so that any deployment which does
not explicitly opt out runs in the safe, mainnet-compliant configuration:

| Gate                     | Code surface                                            | Env opt-out                  |
|--------------------------|---------------------------------------------------------|------------------------------|
| KYC on agent creation    | `DEFAULT_ORCHESTRATOR_CONFIG.kycEnforcement.enabled`    | `KYC_ENFORCEMENT_ENABLED=false` |
| AML on every trade       | `DEFAULT_CONFIG.enforceAmlChecks` (execution engine)    | `AML_ENFORCEMENT_ENABLED=false` |

Resolution rule: a flag is treated as **enabled** unless its env var is set to
the case-insensitive literal `"false"`. Any other value (including unset)
resolves to enabled. This biases the system toward safe-by-default behaviour
for production / mainnet operation.

#### Opt-out procedure for lower environments

Local development and unit tests may opt out by exporting the variables before
starting the process:

```bash
# Local dev / unit tests only — never set in production!
export KYC_ENFORCEMENT_ENABLED=false
export AML_ENFORCEMENT_ENABLED=false
npm test
```

The values are also documented in `.env.example`.

#### Production / mainnet enforcement

Two automated guards refuse to operate when either gate has been disabled:

1. **Deploy-time** — `scripts/deploy-mainnet.ts` calls
   `assertComplianceGatesEnabled()` and aborts with a clear error message
   before any contract deployment if either env var resolves to `false`.
2. **Startup-time** — when `NODE_ENV=production`, `MVPPlatform.start()` runs
   the same assertion and exits with `process.exit(1)` after logging a
   `FATAL` error if either gate is disabled.

Both helpers live in `services/regulatory/compliance-flags.ts` and may be
reused from any other production entry point.

### Per-instance overrides

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

**Demo strategy policy (Issue #369):** Agents created with a system-defined demo strategy bypass the KYC gate. This is granted by the server-side `isDemoStrategy: true` flag in the orchestrator's `STRATEGY_REGISTRY`, never by matching the strategy name string supplied by a user. User payloads that attempt to set `isDemoStrategy` are rejected by schema validation (`CreateAgentSchema` and `ConfigureAgentSchema` use `.strict()` to block unknown fields). Demo strategies are also restricted to simulation mode — they cannot trade real funds regardless of the user's KYC tier.

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

Configure live providers via `SanctionsScreenerConfig`. API keys must be loaded
from `SecretsLoader` — never from `process.env` directly.

#### Chainalysis KYT (on-chain address screening)

```typescript
import { createSanctionsScreener } from './services/regulatory/sanctions';
import { createSecretsLoader } from './config/secrets';

const secrets = createSecretsLoader({ backend: { provider: 'env' } });
await secrets.load();

const screener = createSanctionsScreener({
  provider: 'chainalysis',
  chainalysis: {
    apiKey: await secrets.get('CHAINALYSIS_API_KEY'),
  },
  failClosed: true,   // block trade when provider is unreachable
});
```

Required env var: `CHAINALYSIS_API_KEY`

**Estimated cost:** Chainalysis KYT charges per-address screening call. Expect ~$0.01–$0.05 per call. At 10 000 screenings/month ≈ $100–$500/month depending on plan tier. Contact Chainalysis for volume pricing.

#### OpenSanctions (entity name screening)

```typescript
const screener = createSanctionsScreener({
  openSanctions: {
    apiKey: await secrets.get('OPENSANCTIONS_API_KEY'),
    minScore: 80,   // minimum fuzzy-match score (0-100)
  },
});
```

Required env var: `OPENSANCTIONS_API_KEY`

**Estimated cost:** OpenSanctions offers a free bulk data download tier and a paid API. API calls are ~$0.001–$0.01 each. Bulk monthly snapshots are available from ~$250/month.

#### Provider selection rationale

| Need | Recommended provider |
|------|---------------------|
| On-chain crypto address screening | **Chainalysis KYT** (primary) |
| Entity / name list screening (OFAC, EU, UN, UK HMT) | **OpenSanctions** (primary) |
| Alternative on-chain screening | Elliptic |
| Alternative name screening | ComplyAdvantage |

Use Chainalysis for all blockchain-address checks and OpenSanctions for KYC name/entity checks. Both should be enabled in production.

### Fail-closed policy

When `failClosed: true` (the default):
- If Chainalysis KYT is unreachable during address screening, the screener returns `isMatch: true` with `providerError: true` — blocking the trade.
- If OpenSanctions is unreachable during entity screening, the screener returns `isMatch: true` with `providerError: true`.
- The event `aml.transaction_blocked` is emitted with `reason: 'provider_error'`.

When `failClosed: false`:
- The screener falls back to the internal in-memory list. This means trades may pass if the provider is down and the address/entity is not in the local list.
- **Only appropriate for development/testnet environments.**

### Scheduled list downloader

For supplementary local screening (OFAC SDN, EU, UN, UK HMT name lists):

```typescript
import { createListDownloader } from './services/regulatory/providers/list-downloader';

const downloader = createListDownloader({
  storagePath: '/data/sanctions',
  staleAlertThresholdMs: 48 * 60 * 60 * 1000,  // 48 hours
  onStaleAlert: (list, lastSuccessAt) => {
    alertOpsTeam(`Sanctions list ${list} stale since ${lastSuccessAt}`);
  },
});

// Run daily via cron
await downloader.refreshAll();

// Load results into the screener
for (const list of ['ofac_sdn', 'eu_consolidated', 'un_security_council', 'uk_hm_treasury']) {
  const entries = downloader.toSanctionsEntries(list);
  screener.loadSanctionsList(list, entries);
  screener.setListVersion(downloader.getSnapshot(list)?.version ?? 'unknown');
}
```

The downloader stores a versioned, SHA-256-checksummed JSON snapshot for each list in `storagePath`. On startup call `downloader.loadFromDisk()` to restore the last good snapshot without waiting for a network download. The `onStaleAlert` callback fires when a list has not been successfully refreshed within `staleAlertThresholdMs` (default 48h).

### Data flow

```
[Chainalysis KYT] ──┐
                     ├──► SanctionsScreener ──► result (isMatch / riskScore)
[OpenSanctions]  ──┤         │
                     │         └──► audit log entry on positive hit
[ListDownloader] ──┘              └──► aml.transaction_blocked event
     (OFAC/EU/UN/UK)
```

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
