# Task: Enforce KYC/AML Checks on All Trading Operations

**Priority:** HIGH (Regulatory compliance)  
**Effort:** ~2 weeks  
**Related Issue:** #304

## Problem

`services/regulatory/kyc-aml.ts` has a comprehensive KYC tier system and AML configuration but **does not enforce compliance on transactions**. The framework is advisory — no evidence that unverified users are blocked from trading.

## Current State

The module defines:
- KYC tiers: `none`, `basic`, `standard`, `enhanced`, `institutional`
- AML config: position limits, velocity limits, screening requirements
- Verification status tracking

But no middleware or hooks block:
- Users without KYC from initiating agents
- Transactions exceeding AML limits
- Addresses on sanctions lists

## Acceptance Criteria

- [ ] Gate `createAgent` on minimum KYC level (configurable, suggest `basic` for testnet, `standard` for mainnet)
- [ ] Block trades that exceed per-tier position limits
- [ ] Integrate sanctions screening (OFAC SDN, EU Consolidated list) — either via API service (ComplyAdvantage, Chainalysis) or periodic list download
- [ ] Add ongoing monitoring: flag unusual transaction patterns
- [ ] Log all AML decisions with audit trail
- [ ] Implement `freeze_account` mechanism for compliance holds
- [ ] Document user-facing KYC flow in Telegram Mini App

## Implementation Plan

### Phase 1: Gate Trading on KYC Level (1 week)

```typescript
// services/agent-control/agent-control.ts — BEFORE creating agent
async createAgent(userId: string, config: AgentConfig): Promise<Agent> {
  const kycStatus = await this.kycService.getStatus(userId);
  if (kycStatus.tier === 'none') {
    throw new Error('KYC verification required before creating trading agents');
  }
  // ...
}
```

### Phase 2: Sanctions Screening (1 week)

```typescript
// services/regulatory/sanctions.ts
export class SanctionsScreener {
  async screenAddress(address: string): Promise<SanctionsResult> {
    // Check against Chainalysis or ComplyAdvantage API
    // Cache results for 24h (addresses rarely removed from lists)
  }
}
```

### Phase 3: Transaction AML Check

```typescript
// Integrate into trade execution pipeline
const amlResult = await this.amlService.checkTransaction({
  userId, amount, toAddress, fromAddress
});
if (amlResult.blocked) {
  throw new ComplianceError(amlResult.reason);
}
```

## Files to Create/Modify

- `services/regulatory/kyc-aml.ts` — add enforcement methods
- `services/regulatory/sanctions.ts` — new sanctions screening service
- `services/agent-control/agent-control.ts` — add KYC gate
- `core/trading/live/execution-engine.ts` — add AML check before trade
- `tests/regulatory/kyc-enforcement.test.ts` — new test file
- `docs/regulatory-compliance.md` — user-facing compliance documentation

## External Services

- [Chainalysis KYT](https://www.chainalysis.com/chainalysis-kyt/) — on-chain AML
- [ComplyAdvantage](https://complyadvantage.com/) — KYC/AML data
- [Elliptic](https://www.elliptic.co/) — crypto AML screening

## Notes

- Consult legal counsel for jurisdiction-specific requirements
- Consider phased rollout: testnet without KYC, mainnet with KYC
- Keep KYC data encrypted and separate from trading data (data minimization)
