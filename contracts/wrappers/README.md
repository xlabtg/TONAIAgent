# Contract Wrappers

Typed TypeScript wrappers for the three TONAIAgent Tact smart contracts.
Each wrapper exposes the full API surface in Blueprint style so that
off-chain code never needs to build cell payloads by hand.

## Files

| File | Contract source | Description |
|------|-----------------|-------------|
| `AgentWallet.ts` | `contracts/agent-wallet.tact` | Non-custodial AI-agent wallet with spend limits, DEX whitelist, and time-locked withdrawals |
| `AgentFactory.ts` | `contracts/agent-factory.tact` | Deterministic AgentWallet deployment, on-chain registry, multi-sig upgrades |
| `StrategyExecutor.ts` | `contracts/strategy-executor.tact` | AI signal validation, replay protection, audit log, auto-stop conditions |

## Quick start

```typescript
import { AgentWallet } from './contracts/wrappers/AgentWallet';
import { AgentFactory } from './contracts/wrappers/AgentFactory';
import { StrategyExecutor } from './contracts/wrappers/StrategyExecutor';
import { toNano, Address } from '@ton/core';

// Open an existing contract by address
const wallet = AgentFactory.fromAddress(Address.parse('EQD...'));

// Or derive address + StateInit from constructor args (for deployment)
const walletContract = await AgentWallet.fromInit(
  ownerAddress,
  agentAddress,
  safeAddress,
  toNano('10'),  // maxTradeSizeNano
  toNano('50'),  // dailyLimitNano
  0n,            // timeLockSeconds
);
```

## Wrapper API

Every wrapper provides:

- **`fromAddress(addr)`** — attach to an already-deployed contract.
- **`fromInit(...)`** — compute the deterministic address and StateInit from
  constructor parameters (needed for first deployment).
- **`getInit(...)`** — low-level StateInit builder.
- **`send<MessageName>(...)`** — one typed `send*` method for each
  `receive()` handler in the Tact source.
- **`get<GetterName>(...)`** — one typed getter method for each `get fun`
  in the Tact source.
- **`<ContractName>Opcodes`** — exported constant object with CRC-32 opcodes
  for every message type.

### AgentWallet

| Method | Description |
|--------|-------------|
| `sendDeposit` | Fund the wallet (any TON value) |
| `sendWithdrawRequest` | Owner requests withdrawal (may be time-locked) |
| `sendClaimWithdrawal` | Owner claims a time-locked withdrawal by nonce |
| `sendAgentExecute` | Agent submits a trade within configured limits |
| `sendUpdateLimits` | Owner updates maxTradeSize / dailyLimit / timeLock |
| `sendSetAllowedDex` | Owner adds / removes a DEX from the whitelist |
| `sendSetAgent` | Owner rotates the agent address |
| `sendSetPaused` | Owner pauses / resumes the wallet |
| `sendEmergencyDrain` | Owner drains all funds to safeAddress |
| `sendSetSafeAddress` | Owner updates the emergency safe address |
| `getBalance` | Current contract balance (nanoTON) |
| `getAgentAddress` | Active agent address |
| `getSafeAddr` | Emergency safe address |
| `getLimits` | `WalletLimits` struct (maxTradeSize / dailyLimit / timeLock) |
| `getPaused` | Whether the wallet is paused |
| `getDailySpentToday` | Cumulative agent spend in the current 24-hour window |
| `getPendingWithdrawal` | `PendingWithdrawal` by nonce (or null) |

### AgentFactory

| Method | Description |
|--------|-------------|
| `sendDeployAgent` | Deploy a new AgentWallet and register it on-chain |
| `sendSetAcceptingDeployments` | Pause / resume new deployments |
| `sendSetDeploymentFee` | Change the deployment fee (owner only) |
| `sendSetProtocolFeeBps` | Change the protocol fee in basis points |
| `sendSetMaxAgentsPerUser` | Change the per-user agent cap |
| `sendSetTreasury` | Update the treasury address |
| `sendProposeUpgrade` | Propose a code upgrade with multi-sig threshold |
| `sendApproveUpgrade` | Approve a pending upgrade proposal |
| `getStats` | `FactoryStats` (totalDeployed / feesCollected / version) |
| `getConfig` | `FactoryConfig` (fee / bps / maxAgents / accepting) |
| `getUserAgentCount` | Number of agents deployed for an owner address |
| `getUpgradeProposal` | `UpgradeProposal` by ID (or null) |

### StrategyExecutor

| Method | Description |
|--------|-------------|
| `sendRegisterStrategy` | Register a new strategy with risk parameters |
| `sendStartStrategy` | Activate a pending strategy |
| `sendStopStrategy` | Halt a running strategy |
| `sendExecuteSignal` | Orchestrator submits an AI signal for on-chain execution |
| `sendReportOutcome` | Orchestrator reports actual PnL / gas after execution |
| `sendSetOrchestrator` | Owner rotates the authorised orchestrator address |
| `sendEmergencyHalt` | Owner halts all strategy executions immediately |
| `getStrategy` | `StrategyRecord` by strategyId (or null) |
| `getAuditEntry` | `AuditEntry` by (strategyId, seqno) (or null) |
| `getHalted` | Whether the executor is halted |
| `getTotalStrategies` | Total strategies ever registered |
| `getOrchestrator` | Current authorised orchestrator address |

## Regenerating wrappers

The wrappers are hand-authored to match the Tact contract source.  
When a contract changes, regenerate with:

```bash
# From the repository root
npm run contracts:build
```

This runs `npx blueprint build --all` inside `contracts/`, which:

1. Compiles each `.tact` file with `@tact-lang/compiler`.
2. Emits compiled `.boc` artifacts under `contracts/build/`.
3. Produces wrapper stubs under `contracts/build/<Name>/<Name>_<Name>.ts`.

After a build you can optionally replace the hand-authored wrappers with the
generated output, or keep the hand-authored versions and update them manually
to preserve any additional documentation or helper code.

The wrappers are committed to the repository so that downstream consumers
(e.g. `connectors/ton-factory/`) do not need a Tact toolchain installed.

## Running tests

```bash
# From the contracts/ directory
npm test

# Or with Blueprint directly
npx blueprint test
```

## References

- [Blueprint documentation](https://github.com/ton-org/blueprint)
- [Tact language reference](https://tact-lang.org/)
- [TON sandbox](https://github.com/ton-org/sandbox)
- [TON security best practices](https://docs.ton.org/contract-dev/security)
