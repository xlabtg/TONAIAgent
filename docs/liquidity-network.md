# Institutional Liquidity Network

> **Deep liquidity infrastructure layer for institutional capital routing on TON**

The Institutional Liquidity Network provides a comprehensive, institutional-grade liquidity fabric enabling aggregated pools, cross-fund capital routing, smart order routing, and risk-controlled execution — all built on The Open Network.

---

## Architecture

```
Agents / Funds
      │
      ▼
Prime Brokerage Layer
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Liquidity Network                             │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────────┐                  │
│  │ Aggregation     │  │ Smart Order Routing  │                  │
│  │ Layer           │  │ Engine               │                  │
│  └────────┬────────┘  └──────────┬───────────┘                  │
│           │                      │                              │
│  ┌────────▼────────┐  ┌──────────▼───────────┐                  │
│  │ Internal        │  │ Deep Liquidity       │                  │
│  │ Liquidity Pools │  │ Vaults               │                  │
│  └─────────────────┘  └──────────────────────┘                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Risk-Controlled Execution                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
DEX / OTC Desk / Cross-Chain Bridge / Agent Liquidity
```

---

## Core Components

### 1. Liquidity Aggregation Layer

Aggregates liquidity from multiple institutional and decentralized sources:

- **On-chain DEXs** — TON-native decentralized exchanges for permissionless liquidity
- **Institutional OTC Desks** — High-volume bilateral trading with reduced market impact
- **Internal Agent Liquidity** — Agent-contributed capital pooled for reuse
- **Cross-Chain Bridges** — Multi-chain capital routing via bridge protocols

Each liquidity source is managed with:
- Priority-based and weight-based routing configuration
- Per-source fee structures (maker/taker/settlement fees)
- Per-source trading limits (daily/weekly/monthly/per-trade)
- Real-time metrics tracking (volume, spread, fill rate, latency, uptime)

**Key classes:**
- `DefaultLiquidityAggregationManager` — source and pool management
- `AggregationPool` — grouped liquidity sources with a unified strategy

### 2. Smart Order Routing Engine

Optimizes order execution across aggregated liquidity sources:

- **Slippage optimization** — routes orders to minimize price impact
- **Cross-venue execution** — splits orders across sources for best fill
- **Gas-aware routing** — accounts for bridge and settlement fees
- **Latency optimization** — prioritizes low-latency sources for time-sensitive orders
- **TWAP/VWAP support** — algorithmic order types for large institutional orders

Supported order types: `market`, `limit`, `ioc`, `fok`, `twap`, `vwap`

**Key classes:**
- `DefaultSmartOrderRoutingEngine` — route computation, simulation, validation, and execution
- `OrderRoute` — computed multi-leg route with cost estimates
- `OrderExecution` — execution result with fill details and statistics

### 3. Internal Liquidity Pooling

Enables capital reuse and peer-to-peer lending within the platform:

- **Agent-to-agent liquidity** — agents can lend and borrow from each other
- **Treasury-to-fund routing** — treasury capital can be routed to active funds
- **Capital reuse** — idle capital earns interest through internal lending
- **Internal settlement** — reduces on-chain settlement costs for internal transfers

**Key classes:**
- `DefaultInternalLiquidityPoolManager` — pool, participant, and loan management
- `InternalLiquidityPool` — shared liquidity pool with interest accrual
- `InternalLiquidityLoan` — peer lending agreement between participants

### 4. Deep Liquidity Vaults

Institutional yield-bearing vault infrastructure:

- **Stablecoin Vaults** — stable liquidity reserves (USDT, USDC) earning yield
- **RWA Liquidity Pools** — liquidity backed by real-world asset tokens
- **Hedging Pools** — dedicated capital for risk management and hedging strategies
- **Share-based accounting** — ERC-4626-style share price mechanism

Vaults support deposits, withdrawals, APY management, and portfolio tracking.

**Key classes:**
- `DefaultDeepLiquidityVaultManager` — vault lifecycle, deposits, withdrawals
- `LiquidityVault` — vault state with shares and assets
- `VaultPortfolioSummary` — participant holdings across all vaults

### 5. Risk-Controlled Execution

Pre-trade and post-trade risk enforcement:

- **Prime brokerage risk limits** — per-profile order size, daily volume, exposure limits
- **Real-time exposure checks** — per-pair concentration limits
- **Slippage controls** — maximum allowed slippage per execution
- **Price deviation guards** — reject orders deviating too far from reference price
- **Automated circuit breakers** — profile suspension on limit breach

**Key classes:**
- `DefaultRiskControlledExecutionManager` — risk profile management, pre/post-trade checks
- `ExecutionRiskProfile` — per-participant risk configuration and tracking
- `ExecutionRiskCheck` — pre-trade check result with violations and warnings

---

## Quick Start

```typescript
import { createLiquidityNetworkManager } from '@tonaiagent/core/liquidity-network';

// Initialize the network
const ln = createLiquidityNetworkManager();

// ─────────────────────────────────────────────────────────
// 1. Add Liquidity Sources
// ─────────────────────────────────────────────────────────
const dex = ln.aggregation.addSource({
  name: 'TON DEX',
  kind: 'dex',
  supportedPairs: ['TON/USDT', 'TON/USDC'],
  routing: { priority: 80, maxAllocationPercent: 100 },
  fees: { makerFee: 0.001, takerFee: 0.002, settlementFee: 0 },
});
ln.aggregation.activateSource(dex.id);

const otc = ln.aggregation.addSource({
  name: 'Institutional OTC Desk',
  kind: 'otc_desk',
  supportedPairs: ['TON/USDT'],
  routing: { priority: 90, maxAllocationPercent: 70 },
});
ln.aggregation.activateSource(otc.id);

// ─────────────────────────────────────────────────────────
// 2. Create an Aggregation Pool
// ─────────────────────────────────────────────────────────
const pool = ln.aggregation.createPool({
  name: 'Primary Execution Pool',
  sourceIds: [dex.id, otc.id],
  strategy: 'best_execution',
});
console.log('Pool created:', pool.id, 'sources:', pool.sourceIds.length);

// ─────────────────────────────────────────────────────────
// 3. Set Up Internal Liquidity Pooling
// ─────────────────────────────────────────────────────────
const internalPool = ln.internalPools.createPool({
  name: 'Agent Liquidity Pool',
  assetId: 'TON',
  interestRate: 0.04,
});

// Funds and agents contribute liquidity
ln.internalPools.joinPool({
  poolId: internalPool.id,
  participantId: 'fund_alpha',
  kind: 'fund',
  name: 'Alpha AI Fund',
  contributionAmount: '500000',
});
ln.internalPools.joinPool({
  poolId: internalPool.id,
  participantId: 'agent_001',
  kind: 'agent',
  name: 'Arbitrage Agent',
  contributionAmount: '50000',
});

// Borrow from the pool (agent borrows from fund)
const loan = ln.internalPools.borrowFromPool({
  poolId: internalPool.id,
  borrowerId: 'agent_002',
  borrowerKind: 'agent',
  lenderId: 'fund_alpha',
  lenderKind: 'fund',
  amount: '100000',
  durationMs: 24 * 60 * 60 * 1000, // 24 hours
});
console.log('Loan created:', loan.id, 'amount:', loan.amount);

// ─────────────────────────────────────────────────────────
// 4. Set Up Deep Liquidity Vaults
// ─────────────────────────────────────────────────────────
const stableVault = ln.vaults.createVault({
  name: 'USDT Stable Reserve',
  kind: 'stablecoin',
  assetId: 'USDT',
  initialApy: 0.08,
});

const deposit = ln.vaults.deposit({
  vaultId: stableVault.id,
  depositorId: 'fund_alpha',
  amount: '5000000',
});
console.log('Deposited shares:', deposit.sharesMinted);

const rwaVault = ln.vaults.createVault({
  name: 'RWA Liquidity Pool',
  kind: 'rwa',
  assetId: 'RWA-TOKEN',
  initialApy: 0.12,
});

// ─────────────────────────────────────────────────────────
// 5. Configure Risk-Controlled Execution
// ─────────────────────────────────────────────────────────
const riskProfile = ln.riskExecution.createProfile({
  name: 'Fund Alpha Execution Risk',
  ownerId: 'fund_alpha',
  limits: {
    maxOrderSize: '500000',
    maxDailyVolume: '10000000',
    maxExposurePerPair: '2000000',
    maxSlippage: 0.01,
    maxConcentrationPercent: 40,
    priceDeviationThreshold: 0.05,
  },
});

// ─────────────────────────────────────────────────────────
// 6. Execute an Order with Full Risk Controls
// ─────────────────────────────────────────────────────────
const order = {
  pair: 'TON/USDT',
  side: 'buy' as const,
  amount: '100000',
  orderType: 'market' as const,
  slippageTolerance: 0.005,
};

// Pre-trade risk check
const preCheck = ln.riskExecution.checkPreTrade({
  profileId: riskProfile.id,
  pair: order.pair,
  orderAmount: order.amount,
  estimatedSlippage: 0.003,
  estimatedPrice: '5.0',
  referencePrice: '5.01',
});

if (!preCheck.passed) {
  console.error('Pre-trade check failed:', preCheck.violations);
} else {
  // Execute with smart routing
  const activeSources = ln.aggregation.listSources({ statuses: ['active'] });
  const execution = ln.routing.executeOrder(order, activeSources);
  console.log('Order filled:', execution.status);
  console.log('Average price:', execution.averagePrice);
  console.log('Total fees:', execution.totalFees);
  console.log('Slippage:', (execution.slippage * 100).toFixed(3) + '%');

  // Record post-trade
  ln.riskExecution.recordPostTrade({
    profileId: riskProfile.id,
    pair: order.pair,
    filledAmount: execution.totalFilled,
    actualSlippage: execution.slippage,
  });
}

// ─────────────────────────────────────────────────────────
// 7. Monitor Network Status
// ─────────────────────────────────────────────────────────
const status = ln.getNetworkStatus();
console.log('Network Status:', {
  activeSources: status.activeLiquiditySources,
  totalValueLocked: status.totalValueLocked,
  activeLoans: status.activeLoans,
  riskProfiles: status.riskProfiles,
});

// Subscribe to events
ln.onEvent(event => {
  console.log(`[${event.type}] ${event.entityKind}:${event.entityId}`);
});
```

---

## API Reference

### Liquidity Aggregation

| Method | Description |
|--------|-------------|
| `addSource(params)` | Register a new liquidity source |
| `activateSource(id)` | Set source status to active |
| `deactivateSource(id, reason?)` | Set source status to inactive |
| `updateSource(id, params)` | Update source configuration |
| `removeSource(id)` | Remove a liquidity source |
| `listSources(filters?)` | List sources with optional filtering |
| `updateSourceMetrics(id, metrics)` | Update real-time performance metrics |
| `createPool(params)` | Create an aggregation pool |
| `updatePool(id, params)` | Update pool strategy and sources |
| `removePool(id)` | Remove a pool |
| `listPools()` | List all aggregation pools |

### Smart Order Routing

| Method | Description |
|--------|-------------|
| `computeRoute(order, sources)` | Compute optimal multi-leg route |
| `simulateRoute(route)` | Simulate route for risk/impact analysis |
| `validateRoute(route, sources)` | Validate route feasibility |
| `executeOrder(order, sources)` | Execute order with routing |
| `executeWithRoute(order, route)` | Execute with precomputed route |
| `cancelOrder(orderId)` | Cancel a non-filled order |
| `getOrderExecution(id)` | Get execution by ID |
| `listOrderExecutions(filters?)` | List executions |

### Internal Liquidity Pools

| Method | Description |
|--------|-------------|
| `createPool(params)` | Create an internal liquidity pool |
| `closePool(id)` | Close a pool |
| `joinPool(params)` | Contribute liquidity to a pool |
| `leavePool(id, participantId, amount?)` | Withdraw from a pool |
| `borrowFromPool(params)` | Borrow from pool liquidity |
| `repayLoan(params)` | Repay a loan |
| `getLoan(id)` | Get loan by ID |
| `listLoans(filters?)` | List loans with optional filters |

### Deep Liquidity Vaults

| Method | Description |
|--------|-------------|
| `createVault(params)` | Create a liquidity vault |
| `pauseVault(id)` | Pause vault (no new deposits) |
| `deprecateVault(id)` | Deprecate a vault |
| `updateVaultApy(id, apy)` | Update vault APY |
| `deposit(params)` | Deposit assets and mint shares |
| `withdraw(params)` | Burn shares and receive assets |
| `getDeposits(vaultId, depositorId?)` | Get deposit history |
| `getWithdrawals(vaultId, withdrawerId?)` | Get withdrawal history |
| `getPortfolioSummary(participantId)` | Portfolio across all vaults |
| `getTotalValueLocked()` | Total TVL across active vaults |

### Risk-Controlled Execution

| Method | Description |
|--------|-------------|
| `createProfile(params)` | Create a risk profile |
| `updateLimits(id, params)` | Update risk limits |
| `suspendProfile(id, reason?)` | Suspend a risk profile |
| `reactivateProfile(id)` | Reactivate a suspended profile |
| `checkPreTrade(params)` | Run pre-trade risk check |
| `recordPostTrade(params)` | Record trade and update exposure |
| `getRiskSummary(id)` | Get profile utilization summary |
| `resetDailyVolume(id)` | Reset daily volume (end-of-day) |

---

## Supported Source Kinds

| Kind | Description |
|------|-------------|
| `dex` | On-chain decentralized exchange |
| `otc_desk` | Institutional OTC bilateral trading |
| `agent_liquidity` | Autonomous agent-contributed liquidity |
| `cross_chain_bridge` | Cross-chain bridge protocol |
| `market_maker` | Professional market maker |
| `internal_pool` | Internal platform liquidity |
| `rwa_pool` | Real-world asset backed pool |
| `stablecoin_vault` | Stablecoin reserve vault |
| `hedging_pool` | Dedicated hedging capital |

---

## Vault Types

| Kind | Use Case |
|------|----------|
| `stablecoin` | Stable liquidity reserves (USDT, USDC) |
| `rwa` | Real-world asset backed liquidity |
| `hedging` | Dedicated risk management capital |
| `mixed` | Multi-asset vault |

---

## Events

The network emits typed events for all state changes:

| Event | Description |
|-------|-------------|
| `source_added` | New liquidity source registered |
| `source_updated` | Source configuration changed |
| `source_activated` | Source became active |
| `source_deactivated` | Source deactivated |
| `source_removed` | Source removed |
| `pool_created` | Aggregation pool created |
| `pool_updated` | Aggregation pool updated |
| `vault_created` | Liquidity vault created |
| `vault_deposit` | Deposit recorded |
| `vault_withdrawal` | Withdrawal recorded |
| `order_submitted` | Order submitted for execution |
| `order_filled` | Order fully executed |
| `order_cancelled` | Order cancelled |
| `order_failed` | Order execution failed |
| `internal_loan_created` | Internal loan originated |
| `internal_loan_repaid` | Loan repaid |
| `risk_limit_exceeded` | Risk limit violation detected |
| `risk_warning` | Risk warning threshold reached |

---

## Integration with Prime Brokerage

The Liquidity Network is designed to integrate with the existing Prime Brokerage module:

```typescript
import { createPrimeBrokerageManager } from '@tonaiagent/core/prime-brokerage';
import { createLiquidityNetworkManager } from '@tonaiagent/core/liquidity-network';

const pb = createPrimeBrokerageManager();
const ln = createLiquidityNetworkManager();

// Prime Brokerage risk limits feed into Liquidity Network risk profiles
const pool = pb.custody.createCapitalPool('Main Pool', 10000000);
const fundAllocation = pb.custody.allocateToFund(pool.id, 'fund_alpha', 5000000, 'Alpha Fund');

// Create corresponding risk profile in liquidity network
const riskProfile = ln.riskExecution.createProfile({
  name: 'Fund Alpha Execution Risk',
  ownerId: 'fund_alpha',
  limits: {
    maxOrderSize: '500000',
    maxDailyVolume: String(fundAllocation.allocatedAmount * 0.2),
    maxSlippage: 0.01,
  },
});
```

---

## Module Path

```
src/liquidity-network/
├── types.ts          # All TypeScript types and interfaces
├── aggregation.ts    # Liquidity Aggregation Layer
├── smart-routing.ts  # Smart Order Routing Engine
├── internal-pool.ts  # Internal Liquidity Pooling
├── vaults.ts         # Deep Liquidity Vaults
├── risk-execution.ts # Risk-Controlled Execution
└── index.ts          # Unified manager and exports
```

Import path: `@tonaiagent/core/liquidity-network`
