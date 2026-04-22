# Task: Invert KYC/AML Enforcement Defaults for Mainnet

**Priority:** 🔴 CRITICAL — Blocks Mainnet Launch
**Effort:** ~2 days (config + assertions) / ~1 week (with tests and deploy-time checks)
**Related Issue:** #325 (re-audit finding NEW-01, §6)
**Suggested labels:** `security`, `compliance`, `critical`, `mainnet-blocker`

## Problem

The KYC/AML enforcement code merged in PR #318 is fully implemented, but **both enforcement gates are disabled by default**:

- `core/agents/orchestrator/orchestrator.ts` — `DEFAULT_ORCHESTRATOR_CONFIG.kycEnforcement.enabled = false`
- `core/trading/live/execution-engine.ts` — `DEFAULT_CONFIG.enforceAmlChecks = false`

This means that a staging, canary, or misconfigured mainnet deployment that does **not** override these defaults will silently allow unverified users to trade with real funds. For a regulated financial product this is a critical compliance exposure.

## Root Cause

The defaults were set to `false` to keep the merge-time test suite green without requiring every test to set up KYC fixtures. That choice is reasonable for development but unsafe as a production default.

## Acceptance Criteria

- [ ] Flip defaults for mainnet profile: `kycEnforcement.enabled = true`, `enforceAmlChecks = true` (either in the default config or via a `mainnet` profile override).
- [ ] Add explicit environment-driven override so local dev and unit tests can opt out (`KYC_ENFORCEMENT_ENABLED`, `AML_ENFORCEMENT_ENABLED`).
- [ ] Add a deploy-time assertion in `scripts/deploy-mainnet.ts` (or equivalent mainnet deploy entry point) that **refuses to proceed** unless both flags resolve to `true` in the effective config.
- [ ] Add a startup-time assertion in the application entry point that logs a **fatal** error and exits when `NODE_ENV=production` and either flag is `false`.
- [ ] Update `docs/regulatory-compliance.md` to document the new defaults and the opt-out procedure for lower environments.
- [ ] Update `docs/mainnet-readiness-checklist.md` — the item "KYC/AML defaults verified" should describe the expected effective values.
- [ ] Add tests asserting that the mainnet profile has both flags enabled.

## Proposed Implementation

```typescript
// core/agents/orchestrator/orchestrator.ts
export const DEFAULT_ORCHESTRATOR_CONFIG = {
  kycEnforcement: {
    enabled: process.env.KYC_ENFORCEMENT_ENABLED !== 'false', // default ON
    // ...
  },
};

// core/trading/live/execution-engine.ts
export const DEFAULT_CONFIG = {
  enforceAmlChecks: process.env.AML_ENFORCEMENT_ENABLED !== 'false', // default ON
  // ...
};

// scripts/deploy-mainnet.ts
function assertComplianceGates() {
  const kyc = process.env.KYC_ENFORCEMENT_ENABLED;
  const aml = process.env.AML_ENFORCEMENT_ENABLED;
  if (kyc === 'false' || aml === 'false') {
    throw new Error(
      `Mainnet deploy refused: KYC_ENFORCEMENT_ENABLED=${kyc}, AML_ENFORCEMENT_ENABLED=${aml}. ` +
      `Both must be explicitly true for mainnet.`
    );
  }
}
```

## Files to Modify

- `core/agents/orchestrator/orchestrator.ts` — `DEFAULT_ORCHESTRATOR_CONFIG`
- `core/trading/live/execution-engine.ts` — `DEFAULT_CONFIG`
- `scripts/deploy-mainnet.ts` (or equivalent)
- `apps/*/bootstrap.ts` (application entry point)
- `docs/regulatory-compliance.md`
- `docs/mainnet-readiness-checklist.md`
- `tests/regulatory/kyc-defaults.test.ts` (new)
- `.env.example` — add the two env vars with comments

## Non-Goals

- Changing the underlying KYC/AML logic (already verified in re-audit).
- Adding new tiers or sanctions providers (tracked in separate issues).

## References

- Re-audit report §6: KYC/AML Enforcement
- Re-audit report §New Findings: NEW-01
- Original audit HIGH-07
- PR #318 (merged)
