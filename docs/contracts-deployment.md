# TONAIAgent Smart Contracts — Deployment Runbook

**Version:** 1.0  
**Last updated:** 2026-04-22  
**Related issue:** #335

---

## Overview

This runbook covers the full lifecycle from an audited contract code-freeze through
testnet soak testing to mainnet launch. It must be followed in order. **Do not skip
phases.** Each phase has explicit abort criteria that must halt the process if triggered.

---

## Prerequisites

### Tooling

```bash
# Node.js 18+
node --version

# Install Blueprint and TON SDK
npm install -D @ton/blueprint
npm install @ton/ton @ton/core @ton/crypto

# Compile all contracts
npx blueprint build
```

### Required Environment Variables

| Variable | Description | Required for |
|----------|-------------|-------------|
| `TON_MNEMONIC` | 24-word BIP39 mnemonic for the deployer wallet | Testnet + Mainnet |
| `TON_TESTNET_API_KEY` | API key from https://testnet.toncenter.com | Testnet |
| `TON_MAINNET_API_KEY` | API key from https://toncenter.com | Mainnet |
| `FACTORY_OWNER_ADDRESS` | Owner address (multi-sig on mainnet) | Testnet + Mainnet |
| `FACTORY_TREASURY_ADDRESS` | Treasury address (multi-sig on mainnet) | Testnet + Mainnet |
| `STRATEGY_ORCHESTRATOR_ADDRESS` | Authorized orchestrator address | Testnet + Mainnet |
| `NETWORK` | Must be `mainnet` to unlock mainnet deployment | Mainnet only |
| `CONFIRM_MAINNET` | Must be `yes` to confirm mainnet deployment | Mainnet only |

---

## Phase 1 — Internal Preparation

**Duration:** ~1 week  
**Owner:** Core development team

### Steps

1. **Freeze contract source on audit branch**

   ```bash
   git checkout -b contracts/audit-v1
   git push origin contracts/audit-v1
   ```

2. **Verify all Blueprint tests pass on a clean checkout**

   ```bash
   git clone <repo> tonaiagent-audit
   cd tonaiagent-audit
   npm install
   npx blueprint build
   npx blueprint test
   ```

   Expected: all tests pass with no failures or skips.

3. **Record canonical file hashes**

   ```bash
   sha256sum contracts/agent-wallet.tact \
             contracts/agent-factory.tact \
             contracts/strategy-executor.tact
   ```

   Record the output in `contracts/AUDIT_REPORT_v1.md` under "Audit Baseline Hashes".

4. **Complete self-assessment**

   Review `contracts/SELF_ASSESSMENT.md` and ensure all known limitations (KL-01 through KL-08) are understood and communicated to the audit firm.

### Abort Criteria

- Any Blueprint test failure on the clean checkout.
- File hashes do not match between the working copy and the audit branch.

---

## Phase 2 — External Audit

**Duration:** ~3–4 weeks  
**Owner:** Selected audit firm + core team

### Steps

1. **Select audit firm**

   Recommended firms with TON / Tact experience:
   - OtterSec (https://osec.io)
   - Ackee Blockchain (https://ackee.xyz/blockchain)
   - CertiK (https://certik.com)
   - Trail of Bits (https://trailofbits.com)

2. **Provide audit package**

   Share with the firm:
   - `contracts/audit-v1` branch access
   - `contracts/SELF_ASSESSMENT.md` (threat model and known limitations)
   - Blueprint test suite and results
   - This deployment runbook

3. **Track and resolve findings**

   | Severity | Action Required |
   |----------|----------------|
   | Critical | Must be fixed and re-audited before proceeding |
   | High | Must be fixed before testnet deployment |
   | Medium | Must be fixed before mainnet deployment |
   | Low | Fix or acknowledge before mainnet deployment |
   | Informational | Fix at team's discretion |

4. **Publish audit report**

   Replace the placeholder in `contracts/AUDIT_REPORT_v1.md` with the final report from the auditor. Commit to `contracts/audit-v1` and merge to `main`.

### Abort Criteria

- Any unresolved Critical finding.
- Any unresolved High finding at the start of Phase 3.
- Audit firm refuses to sign off.

---

## Phase 3 — Testnet Deployment and Soak Testing

**Duration:** ~2 weeks  
**Owner:** Core development team

### 3.1 Deploy to TON Testnet

```bash
# Fund deployer testnet wallet via https://t.me/testgiver_ton_bot

# Set environment variables
export TON_MNEMONIC="word1 word2 ... word24"
export TON_TESTNET_API_KEY="<your-testnet-api-key>"
export FACTORY_OWNER_ADDRESS="<testnet-owner-address>"
export FACTORY_TREASURY_ADDRESS="<testnet-treasury-address>"
export STRATEGY_ORCHESTRATOR_ADDRESS="<testnet-orchestrator-address>"

# Deploy
npx ts-node scripts/deploy-testnet.ts
```

Record the deployed addresses:

| Contract | Testnet Address |
|----------|----------------|
| `AgentFactory` | _(fill in)_ |
| `StrategyExecutor` | _(fill in)_ |

### 3.2 End-to-End Flow Verification

Run through each of the following flows and verify on https://testnet.tonscan.org:

- [ ] **Create wallet:** Call `DeployAgent` on the factory; confirm new `AgentWallet` appears at the expected address.
- [ ] **Fund wallet:** Send TON to the `AgentWallet`; confirm balance updates.
- [ ] **Execute trade:** Call `AgentExecute` within limits; confirm outbound message to target DEX.
- [ ] **Daily limit reset:** Execute trades up to `dailyLimitNano`; confirm next trade fails; wait 24h (or advance testnet time); confirm trade succeeds again.
- [ ] **Emergency pause:** Call `SetPaused`; confirm subsequent agent actions are blocked.
- [ ] **Emergency drain:** Call `EmergencyDrain`; confirm funds move to `safeAddress` and wallet is paused.
- [ ] **Upgrade proposal:** Propose upgrade; approve; confirm `executed = true` in the proposal record.
- [ ] **Strategy lifecycle:** Register → Start → ExecuteSignal (multiple) → Stop; verify audit log entries on-chain.
- [ ] **Replay protection:** Re-submit a used `signalNonce`; confirm rejection.
- [ ] **Emergency halt:** Call `EmergencyHalt` on executor; confirm all signals are blocked.

### 3.3 Fuzz and Chaos Testing

```bash
# Run property-based tests (if implemented)
npx blueprint test --grep "fuzz"

# Chaos scenarios to test manually:
# - Submit transactions with max-size payloads
# - Attempt to exhaust gas by submitting large Cell payloads
# - Rapidly alternate pause/unpause while trades are in flight
# - Register 255 strategies (near-max uint8 for riskLevel/status fields)
```

### 3.4 Audit Trail Verification

For each `ExecuteSignal` transaction on testnet:

- Verify the `AuditEntry` is stored at the correct key `(strategyId << 32 | seqno)`.
- Verify `ReportOutcome` correctly patches `actualPnlNano` and `gasUsedNano`.
- Confirm off-chain indexers can reconstruct the full execution history.

### Abort Criteria

- Any end-to-end flow fails to produce the expected on-chain state.
- Fuzz testing reveals an exploitable condition.
- Audit trail entries are missing or incorrect.
- Gas costs exceed 0.1 TON per trade execution.

---

## Phase 4 — Mainnet Deployment

**Duration:** ~1 week  
**Owner:** Core development team + at least one additional reviewer

### Pre-Deployment Checklist

All items must be checked off before running `deploy-mainnet.ts`:

**Audit**
- [ ] External audit report received and reviewed
- [ ] All Critical findings resolved
- [ ] All High findings resolved
- [ ] Medium/Low findings resolved or acknowledged with risk acceptance

**Keys and Wallets**
- [ ] `FACTORY_OWNER_ADDRESS` is a multi-sig wallet (not a single private key)
- [ ] `FACTORY_TREASURY_ADDRESS` is a multi-sig wallet
- [ ] `TON_MNEMONIC` is stored in a hardware wallet or HSM
- [ ] Emergency drain `safeAddress` is configured and tested on testnet

**Testnet Validation**
- [ ] All Phase 3 end-to-end flows completed successfully
- [ ] Soak test ran for at least 72 hours without issues
- [ ] Fuzz tests passed

**Review**
- [ ] At least 2 team members have reviewed `scripts/deploy-mainnet.ts`
- [ ] Deployment parameters match the testnet-validated configuration
- [ ] This runbook has been reviewed and updated

### 4.1 Deploy to TON Mainnet

```bash
# Set environment variables (use hardware wallet / HSM for mnemonic)
export TON_MNEMONIC="word1 word2 ... word24"
export TON_MAINNET_API_KEY="<your-mainnet-api-key>"
export FACTORY_OWNER_ADDRESS="<mainnet-multisig-owner-address>"
export FACTORY_TREASURY_ADDRESS="<mainnet-multisig-treasury-address>"
export STRATEGY_ORCHESTRATOR_ADDRESS="<mainnet-orchestrator-address>"
export NETWORK=mainnet
export CONFIRM_MAINNET=yes

# Deploy (script will prompt for confirmation)
npx ts-node scripts/deploy-mainnet.ts
```

Record the deployed addresses:

| Contract | Mainnet Address |
|----------|----------------|
| `AgentFactory` | _(fill in)_ |
| `StrategyExecutor` | _(fill in)_ |

Update `connectors/ton-factory/factory-contract.ts` with the mainnet addresses.

### 4.2 Feature-Flag Rollout

Deploy behind the `ton_contracts_live` feature flag so only whitelisted agents
can use live contracts initially:

1. Enable the feature flag for internal team wallets only.
2. Run the same end-to-end flows from Phase 3 on mainnet (small amounts).
3. Monitor for 72 hours on https://tonscan.org.
4. Gradually widen access: alpha users → beta users → public.

### 4.3 Post-Deployment Monitoring

Monitor the following for 72 hours after each rollout stage:

- [ ] Contract balances and treasury inflows on https://tonscan.org
- [ ] Error rates in application logs
- [ ] Alert if any emergency pause or drain is triggered
- [ ] Verify audit trail entries are being created correctly

### Abort Criteria (Rollback Triggers)

If any of the following occur, immediately:
1. Call `SetPaused(true)` on all `AgentWallet` instances (via owner multi-sig)
2. Call `SetAcceptingDeployments(false)` on `AgentFactory`
3. Call `EmergencyHalt` on `StrategyExecutor`
4. Open an incident and notify all affected users

**Triggers:**
- Any unexpected fund movement from the treasury or any agent wallet
- Any on-chain transaction that bypasses an enforced limit
- A security researcher reports a vulnerability
- Any contract error rate exceeds 1% of total transactions
- A Critical or High severity finding is discovered post-deployment

---

## Appendix A: Contract Address Registry

| Network | Contract | Address | Deployed At |
|---------|----------|---------|------------|
| Testnet | AgentFactory | _(fill in)_ | _(date)_ |
| Testnet | StrategyExecutor | _(fill in)_ | _(date)_ |
| Mainnet | AgentFactory | _(fill in)_ | _(date)_ |
| Mainnet | StrategyExecutor | _(fill in)_ | _(date)_ |

---

## Appendix B: Contact List

| Role | Name / Handle | Contact |
|------|--------------|---------|
| Technical lead | _(name)_ | _(email / Telegram)_ |
| Security lead | _(name)_ | _(email / Telegram)_ |
| Audit firm contact | _(name)_ | _(email)_ |
| Multi-sig signers | _(list)_ | _(contact)_ |

---

## Appendix C: Related Documents

- `contracts/SELF_ASSESSMENT.md` — internal threat model and invariants
- `contracts/AUDIT_REPORT_v1.md` — external audit report (placeholder until received)
- `docs/mainnet-readiness-checklist.md` — broader mainnet readiness checklist
- `docs/incident-response.md` — incident response procedures
- `docs/secrets-management.md` — key management guidelines
