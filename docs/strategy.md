# TONAIAgent - Autonomous Strategy Engine

## Overview

The TONAIAgent Strategy Engine provides a comprehensive, production-ready framework for autonomous agents to create, execute, optimize, and evolve financial strategies on the TON blockchain. It supports rule-based, AI-driven, and hybrid strategies with full backtesting, optimization, and risk management capabilities.

### Key Features

- **Strategy Abstraction**: Define strategies as rule-based, AI-driven, or hybrid models
- **Domain-Specific Language (DSL)**: JSON-based strategy configuration with validation
- **Real-time Execution**: Scheduler with cron-based triggers and event-driven execution
- **Comprehensive Monitoring**: Metrics tracking, execution history, and alerting
- **Backtesting Engine**: Historical simulation with Monte Carlo analysis
- **Continuous Optimization**: Grid search, Bayesian, and genetic algorithm methods
- **Risk Management**: Stop-loss, take-profit, trailing stops, and position limits
- **AI Integration**: Strategy generation, analysis, and improvement suggestions

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Strategy Definition](#strategy-definition)
4. [DSL Reference](#dsl-reference)
5. [Execution Engine](#execution-engine)
6. [Backtesting](#backtesting)
7. [Optimization](#optimization)
8. [AI Integration](#ai-integration)
9. [Risk Controls](#risk-controls)
10. [Configuration](#configuration)
11. [API Reference](#api-reference)
12. [Best Practices](#best-practices)

---

## Quick Start

### Installation

```bash
npm install @tonaiagent/core
```

### Basic Usage

```typescript
import { createStrategyEngine, StrategySpec } from '@tonaiagent/core/strategy';

// Create the strategy engine
const engine = createStrategyEngine({
  enabled: true,
  maxActiveStrategies: 10,
  simulationMode: true,
});

// Define a simple DCA strategy
const dcaStrategy: StrategySpec = {
  triggers: [{
    id: 'daily_trigger',
    type: 'schedule',
    name: 'Daily DCA',
    enabled: true,
    config: { type: 'schedule', cron: '0 9 * * *' }, // 9 AM daily
  }],
  conditions: [],
  actions: [{
    id: 'buy_ton',
    type: 'swap',
    name: 'Buy TON',
    priority: 1,
    config: {
      type: 'swap',
      fromToken: 'USDT',
      toToken: 'TON',
      amount: { type: 'fixed', value: 100 },
      slippageTolerance: 0.5,
    },
  }],
  riskControls: [{
    id: 'stop_loss',
    type: 'stop_loss',
    name: 'Emergency Stop',
    enabled: true,
    config: { type: 'stop_loss', percentage: 15 },
    action: { type: 'notify' },
  }],
  parameters: [],
  capitalAllocation: {
    mode: 'fixed',
    allocatedAmount: 100,
    minCapital: 10,
    reservePercentage: 20,
  },
};

// Create and activate the strategy
const strategy = await engine.manager.createStrategy({
  name: 'Daily TON DCA',
  description: 'Dollar-cost averaging into TON daily',
  type: 'rule_based',
  userId: 'user_123',
  agentId: 'agent_123',
  definition: dcaStrategy,
});

await engine.manager.validateStrategy(strategy.id);
await engine.manager.activateStrategy(strategy.id);
engine.scheduler.schedule(strategy);
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Strategy Engine                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Strategy   │  │    DSL      │  │  Execution  │  │    Optimization     │  │
│  │   Manager   │  │   Parser    │  │   Engine    │  │       Engine        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                │                     │             │
│  ┌──────▼────────────────▼────────────────▼─────────────────────▼─────────┐  │
│  │                          Core Strategy API                              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Backtesting   │  │    Monitoring   │  │       AI Integration        │  │
│  │     Engine      │  │    & Metrics    │  │   (Generation & Analysis)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Risk Management Layer                               │
│  ┌───────────┐ ┌───────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │ Stop Loss │ │Take Profit│ │Trailing Stop │ │Max Position │ │Velocity  │ │
│  └───────────┘ └───────────┘ └──────────────┘ └─────────────┘ │  Limit   │ │
│                                                                └──────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Strategy Manager** | Lifecycle management, versioning, CRUD operations |
| **DSL Parser** | Parse and validate JSON/YAML strategy definitions |
| **Execution Engine** | Scheduler, executor, and condition evaluator |
| **Optimization Engine** | Parameter tuning with multiple methods |
| **Backtesting Engine** | Historical simulation and analysis |
| **AI Integration** | Strategy generation and improvement suggestions |
| **Risk Management** | Real-time risk controls and position limits |

---

## Strategy Definition

### Strategy Structure

```typescript
interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'rule_based' | 'ai_driven' | 'hybrid' | 'template_based';
  version: number;
  status: StrategyStatus;
  userId: string;
  agentId: string;
  definition: StrategySpec;
  createdAt: Date;
  updatedAt: Date;
  performance?: StrategyPerformance;
  tags: string[];
  metadata: Record<string, unknown>;
}
```

### Strategy Status Lifecycle

```
draft → validating → validated → backtesting → backtested → active → paused → stopped → archived
                                                              ↓
                                                            error
```

| Status | Description |
|--------|-------------|
| `draft` | Initial state, strategy is being defined |
| `validating` | Strategy validation in progress |
| `validated` | Strategy passed all validation checks |
| `backtesting` | Historical backtest running |
| `backtested` | Backtest completed with results |
| `active` | Strategy is live and executing |
| `paused` | Temporarily paused by user |
| `stopped` | Permanently stopped |
| `archived` | Archived for historical reference |
| `error` | Strategy encountered an error |

---

## DSL Reference

### Strategy Spec

```typescript
interface StrategySpec {
  triggers: StrategyTrigger[];    // When to execute
  conditions: StrategyCondition[]; // Prerequisites
  actions: StrategyAction[];       // What to do
  riskControls: RiskControl[];     // Safety limits
  parameters: StrategyParameter[]; // Configurable values
  capitalAllocation: CapitalAllocation; // Budget settings
}
```

### Trigger Types

#### Schedule Trigger
```typescript
{
  id: 'hourly_check',
  type: 'schedule',
  name: 'Hourly Check',
  enabled: true,
  config: {
    type: 'schedule',
    cron: '0 * * * *',  // Every hour
    timezone: 'UTC'
  }
}
```

#### Price Trigger
```typescript
{
  id: 'ton_price_alert',
  type: 'price',
  name: 'TON Price Alert',
  enabled: true,
  config: {
    type: 'price',
    token: 'TON',
    operator: 'less_than',
    value: 2.50
  }
}
```

#### Volume Trigger
```typescript
{
  id: 'high_volume',
  type: 'volume',
  name: 'High Volume Alert',
  enabled: true,
  config: {
    type: 'volume',
    token: 'TON',
    period: '24h',
    threshold: 1000000,
    operator: 'greater_than'
  }
}
```

#### Indicator Trigger
```typescript
{
  id: 'rsi_oversold',
  type: 'indicator',
  name: 'RSI Oversold',
  enabled: true,
  config: {
    type: 'indicator',
    indicator: 'rsi',
    period: 14,
    value: 30,
    operator: 'less_than'
  }
}
```

#### Event Trigger
```typescript
{
  id: 'liquidity_event',
  type: 'event',
  name: 'Liquidity Added',
  enabled: true,
  config: {
    type: 'event',
    eventType: 'liquidity_added',
    source: 'dedust',
    filters: { pool: 'TON/USDT' }
  }
}
```

### Condition Types

#### Balance Condition
```typescript
{
  id: 'balance_check',
  name: 'Sufficient Balance',
  type: 'balance',
  rules: [{
    id: 'min_balance',
    field: 'portfolio.balance(\'USDT\')',
    operator: 'greater_than',
    value: 100,
    valueType: 'static'
  }],
  required: true,
  operator: 'and'
}
```

#### Portfolio Condition
```typescript
{
  id: 'allocation_check',
  name: 'Max TON Allocation',
  type: 'portfolio',
  rules: [{
    id: 'ton_allocation',
    field: 'portfolio.allocation(\'TON\')',
    operator: 'less_than',
    value: 0.5,  // 50%
    valueType: 'static'
  }],
  required: true
}
```

### Action Types

#### Swap Action
```typescript
{
  id: 'buy_ton',
  type: 'swap',
  name: 'Buy TON',
  priority: 1,
  config: {
    type: 'swap',
    fromToken: 'USDT',
    toToken: 'TON',
    amount: { type: 'fixed', value: 100 },
    slippageTolerance: 0.5,
    dex: 'dedust'
  }
}
```

#### Transfer Action
```typescript
{
  id: 'send_ton',
  type: 'transfer',
  name: 'Send TON',
  priority: 1,
  config: {
    type: 'transfer',
    token: 'TON',
    amount: { type: 'fixed', value: 10 },
    destination: 'UQ...'
  }
}
```

#### Stake Action
```typescript
{
  id: 'stake_ton',
  type: 'stake',
  name: 'Stake TON',
  priority: 1,
  config: {
    type: 'stake',
    token: 'TON',
    amount: { type: 'percentage', value: 50 },
    protocol: 'tonstakers'
  }
}
```

#### Liquidity Action
```typescript
{
  id: 'add_liquidity',
  type: 'liquidity',
  name: 'Add Liquidity',
  priority: 1,
  config: {
    type: 'liquidity',
    operation: 'add',
    tokenA: 'TON',
    tokenB: 'USDT',
    amountA: { type: 'fixed', value: 100 },
    protocol: 'dedust'
  }
}
```

#### Rebalance Action
```typescript
{
  id: 'rebalance_portfolio',
  type: 'rebalance',
  name: 'Monthly Rebalance',
  priority: 1,
  config: {
    type: 'rebalance',
    targetAllocations: [
      { token: 'TON', percentage: 50 },
      { token: 'USDT', percentage: 30 },
      { token: 'NOT', percentage: 20 }
    ],
    tolerance: 5
  }
}
```

---

## Execution Engine

### Scheduler

The scheduler manages strategy execution timing based on triggers.

```typescript
// Schedule a strategy
engine.scheduler.schedule(strategy);

// Unschedule a strategy
engine.scheduler.unschedule(strategy.id);

// Manual trigger
const execution = await engine.scheduler.triggerManually(strategy);

// Get scheduled jobs
const jobs = engine.scheduler.getScheduledJobs();
```

### Execution Flow

1. **Trigger Evaluation**: Check if trigger conditions are met
2. **Condition Checking**: Evaluate all required conditions
3. **Risk Control Pre-check**: Verify risk limits before execution
4. **Action Execution**: Execute actions in priority order
5. **Post-execution Checks**: Run risk controls after execution
6. **Metrics Recording**: Update execution metrics and history

### Execution Result

```typescript
interface StrategyExecution {
  id: string;
  strategyId: string;
  triggerId: string;
  status: 'executing' | 'completed' | 'partially_completed' | 'failed' | 'cancelled' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  triggerContext: TriggerContext;
  conditionResults: ConditionResult[];
  actionResults: ActionResult[];
  error?: ExecutionError;
  metadata: Record<string, unknown>;
}
```

---

## Backtesting

### Running a Backtest

```typescript
const config: BacktestConfig = {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-06-30'),
  initialCapital: 10000,
  timeframe: '1h',
  slippageModel: {
    type: 'volume_based',
    baseSlippage: 0.1,
    volumeImpactFactor: 0.001,
  },
  feeModel: {
    tradingFee: 0.3,
    gasCost: 0.05,
    networkFee: 0.01,
  },
  monteCarloSimulations: 100,
};

const result = await engine.backtester.runBacktest(strategy, config);

console.log('Total Return:', result.performance.metrics.totalReturn);
console.log('Sharpe Ratio:', result.performance.metrics.sharpeRatio);
console.log('Max Drawdown:', result.performance.metrics.maxDrawdown);
```

### Backtest Results

```typescript
interface BacktestResult {
  id: string;
  strategyId: string;
  config: BacktestConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;

  // Results
  performance: StrategyPerformance;
  equityCurve: EquityPoint[];
  trades: SimulatedTrade[];
  monteCarloResults?: MonteCarloResult;
  warnings: BacktestWarning[];
}
```

### Performance Metrics

| Metric | Description |
|--------|-------------|
| `totalReturn` | Overall percentage return |
| `annualizedReturn` | Return normalized to yearly |
| `sharpeRatio` | Risk-adjusted return |
| `sortinoRatio` | Downside risk-adjusted return |
| `maxDrawdown` | Maximum peak-to-trough decline |
| `winRate` | Percentage of profitable trades |
| `profitFactor` | Gross profit / Gross loss |
| `averageTradeReturn` | Mean return per trade |

---

## Optimization

### Optimization Methods

The engine supports multiple optimization methods:

| Method | Description | Best For |
|--------|-------------|----------|
| `grid_search` | Exhaustive parameter grid | Small parameter spaces |
| `random_search` | Random sampling | Large parameter spaces |
| `bayesian` | Gaussian process optimization | Complex landscapes |
| `genetic` | Evolutionary algorithm | Multi-objective optimization |

### Running Optimization

```typescript
const config: OptimizationConfig = {
  parameters: [{
    parameterId: 'param_amount',
    range: { min: 50, max: 500, step: 50 },
  }],
  method: 'bayesian',
  objective: 'max_sharpe',
  maxIterations: 100,
  constraints: {
    minSharpe: 1.0,
    maxDrawdown: 0.2,
    minWinRate: 0.5,
  },
  backtestConfig: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    initialCapital: 10000,
    timeframe: '1h',
  },
};

const result = await engine.optimizer.optimize(strategy, config);

console.log('Best Parameters:', result.bestParameters);
console.log('Best Performance:', result.bestPerformance);
console.log('Recommendations:', result.recommendations);
```

### Optimization Result

```typescript
interface OptimizationResult {
  id: string;
  strategyId: string;
  config: OptimizationConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';

  // Results
  bestParameters: ParameterSet;
  bestPerformance: StrategyPerformance;
  allEvaluations: EvaluationResult[];
  convergenceHistory: ConvergencePoint[];
  parameterSensitivity: ParameterSensitivity[];
  recommendations: OptimizationRecommendation[];

  startedAt: Date;
  completedAt?: Date;
}
```

---

## AI Integration

### Generate Strategy

```typescript
const request: StrategyGenerationRequest = {
  userProfile: {
    riskTolerance: 'medium',
    investmentHorizon: 'long',
    experience: 'intermediate',
    preferences: ['dca', 'passive'],
    availableCapital: 10000,
  },
  marketConditions: {
    trend: 'bullish',
    volatility: 'medium',
    liquidity: 'high',
  },
  constraints: {
    maxComplexity: 'moderate',
    allowedActions: ['swap', 'stake'],
    maxRiskLevel: 'medium',
  },
};

const response = await engine.aiGenerator.generateStrategy(request);
console.log('Generated Strategy:', response.strategy);
console.log('Confidence:', response.confidence);
```

### Analyze Strategy

```typescript
const analysis = await engine.aiGenerator.analyzeStrategy({
  strategyId: strategy.id,
  aspects: ['risk', 'performance', 'complexity', 'market_fit'],
});

console.log('Risk Assessment:', analysis.analysis?.riskAssessment);
console.log('Strengths:', analysis.analysis?.strengths);
console.log('Weaknesses:', analysis.analysis?.weaknesses);
```

### Get Improvement Suggestions

```typescript
const improvements = await engine.aiGenerator.suggestImprovements({
  strategyId: strategy.id,
  performanceData: recentPerformance,
  goals: ['improve_returns', 'reduce_risk'],
});

console.log('Suggestions:', improvements.suggestions);
```

### Explain Strategy

```typescript
const explanation = engine.aiGenerator.explainStrategy(strategy);
console.log(explanation);
// "This rule_based strategy focuses on steady accumulation through
// scheduled executions. It includes risk management with stop_loss
// controls to limit downside..."
```

---

## Risk Controls

### Risk Control Types

| Type | Description |
|------|-------------|
| `stop_loss` | Close position at percentage loss |
| `take_profit` | Close position at percentage gain |
| `trailing_stop` | Dynamic stop that follows price |
| `max_position` | Maximum position size limit |
| `max_drawdown` | Maximum portfolio drawdown limit |
| `velocity_limit` | Maximum trade frequency |

### Configuration Examples

#### Stop Loss
```typescript
{
  id: 'stop_loss',
  type: 'stop_loss',
  name: 'Stop Loss 10%',
  enabled: true,
  config: {
    type: 'stop_loss',
    percentage: 10,
    token: 'TON'  // Optional: applies to specific token
  },
  action: {
    type: 'close_position',
    config: { percentage: 100 }
  }
}
```

#### Take Profit
```typescript
{
  id: 'take_profit',
  type: 'take_profit',
  name: 'Take Profit 20%',
  enabled: true,
  config: {
    type: 'take_profit',
    percentage: 20
  },
  action: {
    type: 'close_position',
    config: { percentage: 50 }  // Partial close
  }
}
```

#### Trailing Stop
```typescript
{
  id: 'trailing_stop',
  type: 'trailing_stop',
  name: 'Trailing Stop 5%',
  enabled: true,
  config: {
    type: 'trailing_stop',
    trailingPercentage: 5,
    activationPercentage: 10  // Activate after 10% gain
  },
  action: { type: 'close_position' }
}
```

#### Position Limit
```typescript
{
  id: 'max_position',
  type: 'max_position',
  name: 'Max TON Position',
  enabled: true,
  config: {
    type: 'max_position',
    token: 'TON',
    maxPercentage: 50,
    maxAbsolute: 10000
  },
  action: { type: 'reject' }
}
```

#### Velocity Limit
```typescript
{
  id: 'velocity_limit',
  type: 'velocity_limit',
  name: 'Trade Limit',
  enabled: true,
  config: {
    type: 'velocity_limit',
    maxTradesPerHour: 5,
    maxVolumePerDay: 10000
  },
  action: { type: 'pause', duration: 3600 }
}
```

---

## Configuration

### Engine Configuration

```typescript
interface StrategyEngineConfig {
  enabled: boolean;              // Enable/disable engine
  maxActiveStrategies: number;   // Max concurrent active strategies
  maxExecutionsPerMinute: number; // Rate limiting
  defaultSlippage: number;       // Default slippage tolerance (%)
  defaultGasBuffer: number;      // Gas buffer multiplier
  backtestingEnabled: boolean;   // Enable backtesting
  optimizationEnabled: boolean;  // Enable optimization
  aiIntegrationEnabled: boolean; // Enable AI features
  simulationMode: boolean;       // Run in simulation (no real trades)
  dataRetentionDays: number;     // Days to keep execution history
}
```

### Default Configuration

```typescript
const engine = createStrategyEngine({
  enabled: true,
  maxActiveStrategies: 20,
  maxExecutionsPerMinute: 60,
  defaultSlippage: 0.5,
  defaultGasBuffer: 1.2,
  backtestingEnabled: true,
  optimizationEnabled: true,
  aiIntegrationEnabled: true,
  simulationMode: true,  // Start in simulation
  dataRetentionDays: 90,
});
```

---

## API Reference

### Strategy Manager

```typescript
// Create strategy
const strategy = await engine.manager.createStrategy(options);

// Get strategy
const strategy = await engine.manager.getStrategy(id);

// Update strategy
const updated = await engine.manager.updateStrategy(id, updates);

// Delete strategy
await engine.manager.deleteStrategy(id);

// Validate strategy
const validation = await engine.manager.validateStrategy(id);

// Lifecycle operations
await engine.manager.activateStrategy(id);
await engine.manager.pauseStrategy(id, reason);
await engine.manager.stopStrategy(id, reason);

// Clone strategy
const clone = await engine.manager.cloneStrategy(id, options);

// Query strategies
const results = await engine.manager.queryStrategies({
  userId: 'user_123',
  status: 'active',
  type: 'rule_based',
  limit: 10,
});
```

### DSL Parser

```typescript
// Parse JSON/YAML strategy
const definition = engine.dslParser.parse(dslInput);

// Serialize to DSL format
const dsl = engine.dslParser.serialize(definition, 'Strategy Name');

// Validate DSL
const validation = engine.dslValidator.validate(dslInput);

// Analyze strategy
const analysis = engine.dslValidator.analyze(definition);
```

### Events

```typescript
// Subscribe to strategy events
engine.onEvent((event) => {
  switch (event.type) {
    case 'strategy_created':
    case 'strategy_activated':
    case 'strategy_paused':
    case 'execution_started':
    case 'execution_completed':
    case 'execution_failed':
    case 'condition_evaluated':
    case 'action_executed':
    case 'risk_control_triggered':
    case 'backtest_completed':
    case 'optimization_completed':
      // Handle event
      break;
  }
});
```

### Health Check

```typescript
const health = await engine.getHealth();
console.log('Status:', health.overall);
console.log('Components:', health.components);
console.log('Active Strategies:', health.activeStrategies);
console.log('Pending Executions:', health.pendingExecutions);
```

---

## Best Practices

### Strategy Design

1. **Start Simple**: Begin with rule-based strategies before adding complexity
2. **Test Thoroughly**: Always backtest before activating
3. **Set Risk Controls**: Configure stop-loss and position limits
4. **Monitor Performance**: Track metrics and adjust as needed
5. **Version Changes**: Use cloning for major strategy changes

### Execution

1. **Use Simulation Mode**: Test strategies without real trades first
2. **Set Cooldowns**: Prevent over-trading with trigger cooldowns
3. **Handle Failures**: Configure retry policies and error handling
4. **Monitor Metrics**: Watch execution success rates and latency

### Optimization

1. **Define Constraints**: Set minimum performance requirements
2. **Use Appropriate Methods**: Grid search for small spaces, Bayesian for complex
3. **Validate Results**: Out-of-sample testing after optimization
4. **Avoid Overfitting**: Don't optimize on too many parameters

### Security

1. **Validate Inputs**: All strategy definitions are validated
2. **Limit Permissions**: Strategies run with minimal required permissions
3. **Audit Trail**: All executions are logged for compliance
4. **Risk Limits**: Multiple layers of risk controls

---

## Integration with AI Layer

The Strategy Engine integrates seamlessly with the TONAIAgent AI Layer:

```typescript
import { createAIService } from '@tonaiagent/core/ai';
import { createStrategyEngine } from '@tonaiagent/core/strategy';

// Create AI service
const ai = createAIService({
  providers: {
    groq: { apiKey: process.env.GROQ_API_KEY },
  },
});

// Create strategy engine with AI integration
const engine = createStrategyEngine({
  aiIntegrationEnabled: true,
});

// AI-generated strategy based on user profile
const response = await engine.aiGenerator.generateStrategy({
  userProfile: {
    riskTolerance: 'low',
    investmentHorizon: 'long',
    experience: 'beginner',
    preferences: ['passive', 'dca'],
    availableCapital: 5000,
  },
});

if (response.strategy) {
  const strategy = await engine.manager.createStrategy({
    name: 'AI-Generated Conservative DCA',
    description: response.explanation ?? 'AI-generated strategy',
    type: 'ai_driven',
    userId: 'user_123',
    agentId: 'agent_123',
    definition: response.strategy,
  });
}
```

---

## Integration with Security Layer

The Strategy Engine respects the Security Layer's authorization and risk controls:

```typescript
import { createSecurityManager } from '@tonaiagent/core/security';
import { createStrategyEngine } from '@tonaiagent/core/strategy';

// Security layer validates all transactions
const security = createSecurityManager({
  enabled: true,
  custody: { mode: 'mpc' },
  risk: { enabled: true },
});

// Strategy engine respects security policies
const engine = createStrategyEngine({
  enabled: true,
  simulationMode: false, // Real execution
});

// Strategies are executed within security constraints
engine.onEvent(async (event) => {
  if (event.type === 'action_executed') {
    // Log to audit trail
    security.audit.log({
      eventType: 'strategy_action',
      actor: { type: 'agent', id: event.data.agentId },
      action: event.data.actionType,
      resource: { type: 'strategy', id: event.strategyId },
      outcome: 'success',
      severity: 'info',
      details: event.data,
    });
  }
});
```
