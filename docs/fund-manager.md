# AI Fund Manager

> AI-native hedge fund infrastructure built on TON blockchain.

The AI Fund Manager enables creation and management of AI-driven investment funds that:

- Allocate capital across multiple strategies from the Strategy Marketplace
- Rebalance portfolios automatically based on drift, schedule, or market conditions
- Manage risk exposure with fund-level controls (drawdown limits, strategy concentration, daily loss limits)
- Track performance metrics (returns, Sharpe ratio, max drawdown, win rate)
- Distribute fees to fund creators, strategy developers, and the platform treasury
- Support investor participation (open, private, institutional fund models)

---

## Architecture

```
Investors
    ↓
AI Fund Manager
    ↓
Allocation Engine        ← capital distribution by target weights
    ↓
Rebalancing Engine       ← automatic drift correction
    ↓
Risk Management          ← drawdown limits, concentration caps, emergency stop
    ↓
Strategy Agents          ← via Production Agent Runtime
    ↓
Live Trading Infrastructure
```

---

## Core Components

### 1. Fund Creation Framework (`fund-creation.ts`)

Manages fund lifecycle from creation to closure.

**Fund Configuration:**
```typescript
fund.name                 // human-readable name
fund.creatorId            // fund owner
fund.type                 // 'open' | 'private' | 'institutional'
fund.baseAsset            // 'TON' | 'USDT' | 'USDC'
fund.strategyAllocations  // weights must sum to 100
fund.riskProfile          // 'conservative' | 'moderate' | 'aggressive'
fund.rebalancingRules     // drift threshold, min/max interval, volatility trigger
fund.fees                 // management fee %, performance fee %
```

**Lifecycle States:**
```
pending → active ↔ paused → closed
active → emergency_stopped
```

### 2. Portfolio Allocation Engine (`allocation-engine.ts`)

Distributes investor capital across strategies according to target weights.

- Applies a cash buffer (default 2% of AUM) for operational needs
- Only allocates above a minimum threshold per strategy (default 1 TON)
- Proportional deallocations on withdrawal

### 3. Rebalancing Engine (`rebalancing.ts`)

Automatically detects when rebalancing is needed and executes plans.

**Triggers:**
| Trigger | Description |
|---------|-------------|
| `drift_threshold` | Weight drift exceeds configured percent |
| `scheduled_interval` | Time since last rebalance exceeds max interval |
| `volatility_spike` | Market volatility exceeds threshold |
| `risk_threshold` | Risk limits are close to breach |
| `manual` | Operator-triggered rebalancing |

**Minimum interval** prevents excessive rebalancing (default: 1 hour between rebalances).

### 4. Risk Management (`risk-management.ts`)

Fund-level risk controls that complement the system-wide Systemic Risk Framework.

**Risk Limits (defaults):**
| Limit | Default |
|-------|---------|
| Max strategy exposure | 50% |
| Max drawdown | 25% |
| Max asset concentration | 40% |
| Daily loss limit | 5% |

**Emergency Stop:** Automatically triggered when drawdown exceeds the configured limit. Halts all fund operations and notifies investors.

### 5. Investor Participation (`investor-participation.ts`)

Three fund types:
- **Open**: Any investor can participate
- **Private**: Whitelist of approved investors
- **Institutional**: Accredited investor verification required

**Shares Model:** Each deposit issues shares at the current NAV per share. Withdrawals redeem shares at current NAV, calculating realized P&L.

### 6. Performance Tracking (`performance-tracking.ts`)

**Metrics calculated:**
| Metric | Formula |
|--------|---------|
| Total return | (current NAV / initial NAV - 1) × 100 |
| Annualized return | CAGR over period |
| Sharpe ratio | (excess return over risk-free) / volatility |
| Sortino ratio | excess return / downside deviation |
| Max drawdown | Peak-to-trough NAV decline |
| Win rate | % of days with positive return |
| Volatility | Annualized std dev of daily returns |

**Risk-free rate:** Default 4.0% annual (configurable).

### 7. Fee Distribution (`fee-distribution.ts`)

**Management Fee:**
- Charged annually as a percent of AUM
- Accrued daily (annual fee / 365)
- Default: 2% per year

**Performance Fee:**
- Charged on profits above the high-water mark (HWM)
- HWM prevents double-charging on recovery from drawdowns
- Default: 20% of profits above HWM

**Distribution:**
```
Management Fee → 70% to fund creator + 30% to platform treasury
Performance Fee → 70% to fund creator + 30% to platform treasury
```
(Configurable per fund — can include strategy developer allocations)

---

## Quick Start

```typescript
import { createAIFundManager } from '@tonaiagent/core/fund-manager';

// 1. Initialize
const manager = createAIFundManager({ enabled: true });
manager.start();

// 2. Create fund
const fund = manager.funds.createFund({
  name: 'Alpha Growth Fund',
  description: 'AI-managed DeFi fund',
  creatorId: 'creator_001',
  type: 'open',
  baseAsset: 'TON',
  strategyAllocations: [
    { strategyId: 'dca-strategy-1',    targetWeightPercent: 40 },
    { strategyId: 'yield-optimizer-1', targetWeightPercent: 35 },
    { strategyId: 'grid-trading-1',    targetWeightPercent: 25 },
  ],
  riskProfile: 'moderate',
  managementFeePercent: 2.0,
  performanceFeePercent: 20.0,
});

// 3. Activate
manager.funds.activateFund(fund.fundId);

// 4. Accept deposit
const portfolio = manager.funds.getFundPortfolio(fund.fundId)!;
const deposit = manager.investors.deposit(
  { fundId: fund.fundId, investorId: 'inv_001', investorAddress: 'EQD...', amount: BigInt(100_000_000_000) },
  fund, portfolio
);

// 5. Allocate capital
const { updatedPortfolio } = manager.allocation.allocateDeposit(portfolio, fund, BigInt(100_000_000_000));
manager.funds.updateFundPortfolio(updatedPortfolio);

// 6. Check rebalancing
const trigger = manager.rebalancing.shouldRebalance(fund, updatedPortfolio);
if (trigger) {
  const plan = manager.rebalancing.generatePlan(fund, updatedPortfolio, trigger);
  await manager.rebalancing.executePlan(plan, updatedPortfolio);
}

// 7. Assess risk
const risk = manager.riskManagement.assessRisk(fund, updatedPortfolio);
console.log('Risk score:', risk.riskScore);

// 8. Track performance
manager.performance.recordSnapshot(updatedPortfolio, 1);
const metrics = manager.performance.calculateMetrics(fund.fundId, 'all_time');

// 9. Collect fees
manager.fees.collectManagementFee(fund, updatedPortfolio);

// 10. Health check
const health = manager.getHealth();
console.log('Status:', health.overall); // 'healthy'
```

---

## Integration with Agent Runtime

Each strategy in a fund runs as an agent through the Production Agent Runtime:

```typescript
import { createAgentRuntimeOrchestrator } from '@tonaiagent/core/agent-runtime';
import { createAIFundManager } from '@tonaiagent/core/fund-manager';

const runtime = createAgentRuntimeOrchestrator({ enabled: true });
const fundManager = createAIFundManager({ enabled: true });

runtime.start();
fundManager.start();

// Create fund
const fund = fundManager.funds.createFund({ ... });
fundManager.funds.activateFund(fund.fundId);

// Deploy one agent per strategy
for (const alloc of fund.strategyAllocations) {
  runtime.registerAgent({
    agentId: `fund-${fund.fundId}-${alloc.strategyId}`,
    name: `Fund Agent: ${alloc.strategyId}`,
    ownerId: fund.creatorId,
    ownerAddress: 'EQD...',
    strategyIds: [alloc.strategyId],
    simulation: { enabled: true, fakeBalance: alloc.allocatedCapital },
    riskLimits: { ... },
    maxConcurrentExecutions: 1,
    enableObservability: true,
  });
}
```

---

## Event Reference

| Event | Description |
|-------|-------------|
| `fund.created` | New fund created |
| `fund.activated` | Fund opened for investment |
| `fund.paused` | Fund paused (no new deposits) |
| `fund.resumed` | Fund resumed |
| `fund.closed` | Fund permanently closed |
| `fund.emergency_stopped` | Emergency stop triggered |
| `investor.deposited` | Investor made a deposit |
| `investor.withdrew` | Investor made a withdrawal |
| `allocation.executed` | Capital allocated to strategies |
| `rebalancing.triggered` | Rebalancing plan initiated |
| `rebalancing.completed` | Rebalancing plan executed |
| `rebalancing.failed` | Rebalancing plan failed |
| `risk.limit_breached` | Risk limit exceeded |
| `risk.emergency_stop` | Emergency stop triggered by risk |
| `fee.management_collected` | Management fee collected |
| `fee.performance_collected` | Performance fee collected |
| `performance.snapshot_taken` | AUM snapshot recorded |

---

## Related Modules

- **[Agent Runtime](../src/agent-runtime/)** — executes strategy agents for each fund
- **[Strategy Marketplace](../src/marketplace/)** — source of strategies allocated to funds
- **[Live Trading Infrastructure](../src/live-trading/)** — executes trades for strategy agents
- **[Systemic Risk Framework](../src/systemic-risk/)** — system-wide risk controls that complement fund-level controls
