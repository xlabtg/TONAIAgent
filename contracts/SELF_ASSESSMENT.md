# TONAIAgent Smart Contracts — Internal Self-Assessment

**Document version:** 1.0  
**Contracts version:** 1.0.0 (factory version `100`)  
**Assessment date:** 2026-04-22  
**Author:** TONAIAgent core team  
**Status:** Ready for external audit

---

## 1. Scope

This document covers the three Tact smart contracts introduced in PR #321:

| File | Contract | Responsibility |
|------|----------|----------------|
| `contracts/agent-wallet.tact` | `AgentWallet` | Custodial wallet with per-trade and daily spending limits |
| `contracts/agent-factory.tact` | `AgentFactory` | Deploys and registers `AgentWallet` instances |
| `contracts/strategy-executor.tact` | `StrategyExecutor` | Validates and dispatches AI trading signals |

**Out of scope:** FunC standard library contracts, `@stdlib/deploy`, `@stdlib/ownable`.

---

## 2. Threat Model

### 2.1 Assets at Risk

| Asset | Held by | Risk if Compromised |
|-------|---------|---------------------|
| User TON balance | `AgentWallet` | Direct fund loss |
| Deployment fees (treasury) | Transit via `AgentFactory` | Protocol revenue loss |
| Agent trading authority | `AgentWallet.agent` address | Unauthorised trades up to daily limit |
| Orchestrator authority | `StrategyExecutor.authorizedOrchestrator` | Unauthorised strategy execution |
| Owner keys | All three contracts | Complete contract takeover |

### 2.2 Actors and Trust Levels

| Actor | Trust Level | Capabilities |
|-------|-------------|-------------|
| Contract owner | Full trust | Pause, drain, upgrade, change all parameters |
| Agent address | Limited trust | Execute trades within configured limits only |
| Authorized orchestrator | Limited trust | Register/start/stop strategies, execute signals |
| Any other address | Zero trust | Deposit TON to `AgentWallet` only |
| AgentFactory | Deployment context | Creates `AgentWallet` instances |
| StrategyExecutor | Execution context | Forwards trades to `AgentWallet` via `AgentExecute` |

### 2.3 Threat Scenarios

#### T-01: Stolen Agent Key
An attacker obtains the private key for `AgentWallet.agent`.

**Mitigations:**
- Trades capped at `maxTradeSizeNano` per transaction
- Daily aggregate capped at `dailyLimitNano`
- DEX whitelist restricts trade destinations when configured
- Owner can pause the wallet and rotate the agent address via `SetAgent`
- Emergency drain moves all funds to pre-set `safeAddress`

**Residual risk:** Up to one day's `dailyLimitNano` can be extracted before the owner detects and pauses.

#### T-02: Stolen Orchestrator Key
An attacker obtains the private key for `StrategyExecutor.authorizedOrchestrator`.

**Mitigations:**
- Signals are forwarded to `AgentWallet`, which enforces its own spending limits as a second layer
- Owner can call `EmergencyHalt` to stop all strategy execution
- Owner can rotate the orchestrator address via `SetOrchestrator`

**Residual risk:** Attacker can drain funds up to the per-wallet limits across all registered strategies.

#### T-03: Stolen Owner Key
An attacker obtains the owner private key.

**Mitigations:** None — owner is fully trusted. For mainnet, owner **must** be a multi-sig wallet.

**Residual risk:** Complete contract takeover. Mitigated by requiring multi-sig ownership in deployment runbook.

#### T-04: Replay Attack on Trading Signals
An attacker captures a valid `ExecuteSignal` message and retransmits it.

**Mitigations:**
- `signalNonce` must be strictly monotonically increasing per strategy
- Duplicate or out-of-order nonces are rejected with `"StrategyExecutor: replayed or out-of-order signal"`

**Residual risk:** None if orchestrator nonce management is correct.

#### T-05: Replay Attack on Withdrawals
An attacker replays a `WithdrawRequest` message.

**Mitigations:**
- TON's message deduplication (bounce + seqno in wallet contract) prevents literal replays at the network level
- Time-locked withdrawals use an incrementing `withdrawalNonce`; a consumed nonce is deleted from `pendingWithdrawals`

**Residual risk:** Low. Standard TON wallet seqno protection applies.

#### T-06: Contract Storage Exhaustion (DoS via Map Growth)
An attacker registers many strategies or pending withdrawals to inflate on-chain storage costs.

**Mitigations:**
- `AgentFactory.maxAgentsPerUser` caps per-user deployments (default enforced in constructor)
- Strategy registration requires owner or orchestrator privilege, preventing public spam
- Pending withdrawals require owner to initiate; there is no limit on the map size itself

**Known limitation:** If the owner initiates many time-locked withdrawals without claiming them, `pendingWithdrawals` can grow. Recommend adding a configurable cap.

#### T-07: Integer Overflow / Underflow
Arithmetic operations on `coins` (uint128) or other integer types.

**Mitigations:**
- Tact uses checked arithmetic by default; overflow triggers a contract abort rather than wrapping
- `MIN_TON_RESERVE` guards prevent sending more than the available balance

**Residual risk:** Overflow is not possible in normal operation; underflow would trigger an abort.

#### T-08: Front-Running on Upgrades
An attacker observes an `ApproveUpgrade` transaction and front-runs it.

**Mitigations:**
- Only the owner can propose or approve upgrades
- The upgrade mechanism records the new code hash but defers the actual `set_code()` call to off-chain tooling, minimising the on-chain attack surface during the transition window

**Known limitation:** The multi-sig upgrade mechanism uses `ApproveUpgrade` messages from the single owner address. It does not currently enforce that distinct signers approve — multiple `ApproveUpgrade` messages from the same owner will each increment `approvalCount`. This effectively makes `approvalsRequired` a non-enforced parameter.

#### T-09: AgentFactory Registry Address Placeholder
The `agentRegistry` stores `msg.ownerAddress` as `contractAddress` — this is explicitly marked as a placeholder in a comment (`// placeholder: real address computed by deployer`).

**Known limitation:** The factory does not perform the actual StateInit deployment; it only records a placeholder address. Off-chain tooling must perform the real deployment. This is a significant functional gap that must be addressed before mainnet.

#### T-10: DEX Whitelist Bypass (Empty Map Semantics)
The DEX whitelist check in `AgentWallet.receive(AgentExecute)` uses:
```tact
let isAllowed: Bool? = self.allowedDexes.get(msg.to);
require(
    isAllowed == null || isAllowed!! == true,
    "AgentWallet: DEX not in whitelist"
);
```
When `allowedDexes` is empty, `isAllowed` is always `null`, so the check passes for **any** destination. The whitelist is only enforced once at least one address has been added.

**Known limitation:** This "opt-in whitelist" semantics is intentional per the current design but must be clearly documented. If the intended semantics is "default-deny once any DEX is added", the current implementation is correct. Recommend explicit documentation and a getter that distinguishes "whitelist disabled" from "whitelist empty".

---

## 3. Security Invariants

The following invariants must hold at all times for a correctly operating contract:

### AgentWallet Invariants

| ID | Invariant |
|----|-----------|
| AW-I-01 | `myBalance() >= MIN_TON_RESERVE` after every outbound message |
| AW-I-02 | Only `self.owner` can initiate withdrawals, change limits, or change the agent address |
| AW-I-03 | `AgentExecute` is only accepted from `self.agent` |
| AW-I-04 | `dailySpent <= dailyLimitNano` within any 24-hour window |
| AW-I-05 | Each `AgentExecute` sends no more than `maxTradeSizeNano` |
| AW-I-06 | When `isPaused == true`, no outbound transfers occur |
| AW-I-07 | When `timeLockSeconds > 0` and `amount > maxTradeSizeNano`, withdrawals are time-locked |
| AW-I-08 | A claimed `pendingWithdrawal` nonce is deleted and cannot be claimed twice |

### AgentFactory Invariants

| ID | Invariant |
|----|-----------|
| AF-I-01 | Only `self.owner` can pause, update fees, update treasury, or propose/approve upgrades |
| AF-I-02 | `userAgentCount[user] <= maxAgentsPerUser` |
| AF-I-03 | `deploymentFee` is forwarded to `self.treasury` on every successful `DeployAgent` |
| AF-I-04 | New deployments are rejected when `isPaused == true` |
| AF-I-05 | `totalAgentsDeployed` increases monotonically |

### StrategyExecutor Invariants

| ID | Invariant |
|----|-----------|
| SE-I-01 | Only `self.owner` can halt, update the orchestrator, or stop strategies via `StopStrategy` |
| SE-I-02 | Only `self.authorizedOrchestrator` (or owner) can register/start/stop strategies |
| SE-I-03 | `ExecuteSignal` is only accepted from `self.authorizedOrchestrator` |
| SE-I-04 | `signalNonce` is strictly increasing per strategy (replay protection) |
| SE-I-05 | `executionCount <= maxExecutions` (when `maxExecutions > 0`) |
| SE-I-06 | `amount <= maxPositionNano` per signal |
| SE-I-07 | Cumulative projected loss does not exceed `maxLossNano` (when `maxLossNano > 0`) |
| SE-I-08 | When `isHalted == true`, no signals are executed |
| SE-I-09 | `ExecuteSignal` is rejected for strategies not in `STATUS_RUNNING` |

---

## 4. Known Limitations

| ID | Severity | Description | Recommended Fix |
|----|----------|-------------|-----------------|
| KL-01 | High | `AgentFactory` records a placeholder `ownerAddress` as `contractAddress` instead of the real deployed `AgentWallet` address. Actual deployment must be performed off-chain. | Implement proper StateInit deployment in the `DeployAgent` handler. |
| KL-02 | Medium | Upgrade approval mechanism does not enforce distinct signers — the same owner can increment `approvalCount` multiple times. | Maintain a `map<Address, Bool>` of approvers per proposal; reject duplicate approvals from the same address. |
| KL-03 | Medium | No cap on `pendingWithdrawals` map size. Repeated large owner withdrawals without claiming could inflate storage costs indefinitely. | Add a configurable `maxPendingWithdrawals` constant. |
| KL-04 | Low | DEX whitelist is "opt-in" (disabled when empty). If the operator forgets to add at least one DEX, the agent can send to any destination. | Provide a dedicated `whitelistEnabled: Bool` flag that defaults to `false` and must be explicitly enabled. |
| KL-05 | Low | `StrategyExecutor.auditKey` uses bit-shifting: `(strategyId << 32) | seqno`. If `seqno` exceeds 2³² or `strategyId` overflows, keys could collide. | Use a hash-based key (e.g., `sha256(strategyId ++ seqno)`) for robust uniqueness. |
| KL-06 | Low | `ReportOutcome` patches the audit log at `executionCount` (the current count), not at the `signalNonce` from the message. If outcomes are reported out of order, they may update the wrong entry. | Include `seqno` explicitly in `ReportOutcome` and use it as the audit log key lookup. |
| KL-07 | Informational | `AgentWallet.receive(WithdrawRequest)` uses `SendRemainingValue` mode. If multiple outbound messages are sent in the same transaction (not possible in the current code, but possible after future modifications), the remaining value semantics could be unexpected. | Document the mode choice and add a guard comment. |
| KL-08 | Informational | `timeLockSeconds` of 0 disables time-locks entirely, meaning large owner withdrawals are immediate. This is intentional for the no-lock configuration but should be clearly documented. | Add a comment to `WithdrawRequest` handler. |

---

## 5. Test Coverage Report

### 5.1 Summary

| Contract | Test File | Test Cases | Scenarios Covered |
|----------|-----------|-----------|-------------------|
| `AgentWallet` | `tests/agent-wallet.spec.ts` | 14 | Deposit, withdraw, time-lock, daily limit, DEX whitelist, agent execute, emergency drain, pause |
| `AgentFactory` | `tests/agent-factory.spec.ts` | 10 | Deploy agent, fee validation, per-user limit, pause/resume, fee update, upgrade proposal |
| `StrategyExecutor` | `tests/strategy-executor.spec.ts` | 13 | Register, start, stop, execute signal, replay protection, position limit, max executions, emergency halt, outcome reporting |

**Total: 37 test cases**

### 5.2 Coverage by Security Property

| Security Property | Test Coverage | Notes |
|-------------------|--------------|-------|
| Access control (owner-only operations) | ✅ Covered | All admin functions tested with both owner and non-owner |
| Access control (agent-only operations) | ✅ Covered | `AgentExecute` tested with non-agent sender |
| Access control (orchestrator-only signals) | ✅ Covered | `ExecuteSignal` tested with attacker sender |
| Daily spending limit | ✅ Covered | 5× trades that hit exact limit, then overflow |
| Per-trade size limit | ✅ Covered | Trade exceeding `maxTradeSizeNano` rejected |
| DEX whitelist enforcement | ✅ Covered | Allowed and blocked DEX tested |
| Time-lock queuing | ✅ Covered | Large withdrawal queued; early claim rejected |
| Emergency pause | ✅ Covered | Agent blocked after pause |
| Emergency drain | ✅ Covered | Balance transferred to safe address |
| Replay protection (signal nonce) | ✅ Covered | Same nonce rejected on second submission |
| Strategy state machine | ✅ Covered | Signal rejected in PENDING state; RUNNING→STOPPED transition |
| Max executions auto-complete | ✅ Covered | Strategy reaches `STATUS_COMPLETED` |
| Halt blocks all execution | ✅ Covered | Signal rejected after `EmergencyHalt` |
| Multi-sig upgrade approval | ✅ Covered | Single-approval auto-execute; non-owner rejected |
| Per-user agent limit | ✅ Covered | Overflow on (MAX_AGENTS+1)th deployment |
| Insufficient deployment fee | ✅ Covered | Fee below minimum rejected |
| Storage overflow (map growth) | ❌ Not tested | See KL-03 |
| Concurrent pending withdrawals | ❌ Not tested | Only a single time-locked withdrawal tested |
| Strategy expiry | ❌ Not tested | `expiresAt` path not exercised |
| Actual `set_code()` upgrade | ❌ Not tested | Upgrade records hash only; no live code swap |

### 5.3 How to Run Tests

```bash
# From the repository root
npm install

# Build contracts (requires Tact compiler via Blueprint)
npx blueprint build

# Run tests
npx blueprint test

# Or run individual test suites:
npx blueprint test contracts/tests/agent-wallet.spec.ts
npx blueprint test contracts/tests/agent-factory.spec.ts
npx blueprint test contracts/tests/strategy-executor.spec.ts
```

---

## 6. Static Analysis Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Tact compiler warnings | To verify | Run `npx blueprint build` and review output |
| Integer overflow potential | Low risk | Tact uses checked arithmetic |
| Reentrancy | Not applicable | TON actor model: one active message per contract at a time |
| Unchecked external calls | Low risk | `send()` uses `SendIgnoreErrors`; failures are silently ignored (see KL-07) |
| Access control on all state-mutating functions | ✅ Verified by inspection | All `receive` handlers checked |
| Uninitialized state | ✅ Verified | All fields initialized in `init()` |
| Division by zero | N/A | No division operations in contracts |
| Timestamp dependence | Low risk | `now()` used for time-lock and daily window; miners can skew ±15s but 86400s window makes this negligible |

---

## 7. Audit Firm Recommendations

For external audit, the following firms have demonstrated TON / FunC / Tact experience:

- **OtterSec** — https://osec.io
- **Ackee Blockchain** — https://ackee.xyz/blockchain
- **CertiK** — https://certik.com
- **Trail of Bits** — https://trailofbits.com
- **Certora** — https://certora.com (formal verification option)

Recommended scope for audit engagement:
1. All three Tact contract source files in `contracts/`
2. Upgrade patterns and emergency controls
3. Off-chain deployment scripts in `scripts/`
4. Interaction patterns between `StrategyExecutor → AgentWallet`

---

## 8. Appendix: Contract Source Hashes

Compute with:
```bash
sha256sum contracts/agent-wallet.tact contracts/agent-factory.tact contracts/strategy-executor.tact
```

Record the output here before sending to the auditor to establish a canonical audit baseline.

| File | SHA-256 |
|------|---------|
| `contracts/agent-wallet.tact` | `b46a280e7d2ebdce42eb8b05b152c31fea4de9263fbd6633fe827862362c0cfd` |
| `contracts/agent-factory.tact` | `4113f54e0c065ab03ac670357e8722612a0ae4379a4978dea927dfab4606bb83` |
| `contracts/strategy-executor.tact` | `4b7a4a391ef1b6f3da7b69c52824c187054fbcde40fade33cb9207b892e84627` |
