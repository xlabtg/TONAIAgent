/**
 * TONAIAgent - Fund Investor Demo Stage Executors (Issue #153)
 *
 * Each function here executes one of the six stages of the Investor Demo Flow.
 * All stages are simulation-only — no real funds, no real API calls.
 *
 * Stages:
 *   1. Strategy Discovery
 *   2. AI Fund Creation
 *   3. Agent Deployment
 *   4. Live Execution Simulation
 *   5. Performance Monitoring
 *   6. Rebalancing Demonstration
 */

import type {
  FundInvestorDemoConfig,
  DemoMarketplaceStrategy,
  StrategyDiscoveryResult,
  FundCreationResult,
  AgentDeploymentResult,
  DeployedStrategyAgent,
  LiveExecutionResult,
  SimulatedTrade,
  SimulatedMarketEvent,
  PerformanceMonitoringResult,
  StrategyPerformanceSnapshot,
  RebalancingResult,
  RebalancingAction,
} from './fund-demo-types';

// ============================================================================
// Simulation Helpers
// ============================================================================

/** Generate a deterministic-looking simulated address */
function simAddress(seed: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let h = seed.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0xdeadbeef);
  let addr = 'EQ';
  for (let i = 0; i < 44; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    addr += chars[h % chars.length];
  }
  return addr;
}

/** Generate an ID with a given prefix and seed */
function simId(prefix: string, seed: string): string {
  const hash = seed.split('').reduce((acc, c) => acc ^ c.charCodeAt(0), 0x5a5a);
  return `${prefix}_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

/** Build a broader marketplace catalog to present during discovery */
function buildMarketplaceCatalog(selected: DemoMarketplaceStrategy[]): DemoMarketplaceStrategy[] {
  const extra: DemoMarketplaceStrategy[] = [
    {
      id: 'strategy_mom_004',
      name: 'TON Momentum Rider',
      creator: 'TrendLab',
      category: 'momentum',
      annualReturn: 41.2,
      maxDrawdown: 22.5,
      sharpeRatio: 1.6,
      riskLevel: 'high',
      allocationPercent: 0,
      description: 'Captures short-term price momentum on TON and major assets.',
    },
    {
      id: 'strategy_grid_005',
      name: 'Grid Range Trader',
      creator: 'GridMaster',
      category: 'grid',
      annualReturn: 15.8,
      maxDrawdown: 6.3,
      sharpeRatio: 2.0,
      riskLevel: 'low',
      allocationPercent: 0,
      description: 'Places buy/sell grid orders to profit from sideways price action.',
    },
  ];
  return [...selected, ...extra];
}

// ============================================================================
// Stage 1: Strategy Discovery
// ============================================================================

/**
 * Execute Stage 1 — Strategy Discovery
 *
 * Simulates an investor browsing the Strategy Marketplace, reviewing
 * performance metrics, and selecting strategies for a fund.
 */
export function executeStrategyDiscoveryStage(
  config: FundInvestorDemoConfig,
): StrategyDiscoveryResult {
  const allStrategies = buildMarketplaceCatalog(config.strategies);
  const selected = config.strategies;

  // Find top performer by annual return
  const topPerformer = [...selected].sort((a, b) => b.annualReturn - a.annualReturn)[0];

  const totalAllocationPercent = selected.reduce((sum, s) => sum + s.allocationPercent, 0);

  return {
    type: 'strategy_discovery',
    totalStrategiesAvailable: allStrategies.length,
    strategiesBrowsed: allStrategies,
    strategiesSelected: selected,
    topPerformer,
    totalAllocationPercent,
    discoveryDurationMs: 800 + Math.floor(Math.random() * 400),
  };
}

// ============================================================================
// Stage 2: AI Fund Creation
// ============================================================================

/**
 * Execute Stage 2 — AI Fund Creation
 *
 * Creates the fund with investor-specified strategies and capital allocation.
 * Deploys it through the AI Fund Manager.
 */
export function executeFundCreationStage(
  config: FundInvestorDemoConfig,
): FundCreationResult {
  const fundId = simId('fund', config.fundName + Date.now().toString());
  const fundManagerAgentId = simId('fund_manager_agent', fundId);
  const contractAddress = simAddress(fundId);
  const createdAt = new Date();

  const allocationBreakdown = config.strategies.map((s) => ({
    strategyName: s.name,
    percent: s.allocationPercent,
    amountUsd: Math.round(config.fundCapitalUsd * (s.allocationPercent / 100)),
  }));

  return {
    type: 'fund_creation',
    fundId,
    fundName: config.fundName,
    capitalUsd: config.fundCapitalUsd,
    allocationBreakdown,
    createdAt,
    fundManagerAgentId,
    deployed: true,
    contractAddress,
  };
}

// ============================================================================
// Stage 3: Agent Deployment
// ============================================================================

/**
 * Execute Stage 3 — Agent Deployment
 *
 * Launches one strategy agent per selected strategy via the Production
 * Agent Runtime. Each agent receives its capital allocation.
 */
export function executeAgentDeploymentStage(
  fundCreation: FundCreationResult,
  config: FundInvestorDemoConfig,
): AgentDeploymentResult {
  const deployedAgents: DeployedStrategyAgent[] = config.strategies.map((strategy, idx) => {
    const capitalUsd = Math.round(config.fundCapitalUsd * (strategy.allocationPercent / 100));
    const agentId = simId(`agent_${strategy.category}`, fundCreation.fundId + idx.toString());

    return {
      agentId,
      strategyId: strategy.id,
      strategyName: strategy.name,
      capitalUsd,
      allocationPercent: strategy.allocationPercent,
      status: 'active' as const,
    };
  });

  const totalCapitalDeployedUsd = deployedAgents.reduce((sum, a) => sum + a.capitalUsd, 0);

  return {
    type: 'agent_deployment',
    fundId: fundCreation.fundId,
    deployedAgents,
    agentCount: deployedAgents.length,
    totalCapitalDeployedUsd,
    deploymentDurationMs: 200 + Math.floor(Math.random() * 300),
    allAgentsActive: deployedAgents.every((a) => a.status === 'active'),
  };
}

// ============================================================================
// Stage 4: Live Execution Simulation
// ============================================================================

/**
 * Execute Stage 4 — Live Execution Simulation
 *
 * Simulates market events and trading activity across all deployed strategy
 * agents. Shows realistic trade flow and portfolio updates.
 */
export function executeLiveExecutionStage(
  agentDeployment: AgentDeploymentResult,
  config: FundInvestorDemoConfig,
): LiveExecutionResult {
  const trades: SimulatedTrade[] = [];
  const events: SimulatedMarketEvent[] = [];
  const now = new Date();

  // Generate simulated trades and events for each deployed agent
  agentDeployment.deployedAgents.forEach((agent, agentIdx) => {
    const strategy = config.strategies.find((s) => s.id === agent.strategyId);
    if (!strategy) return;

    // Market event for this strategy
    const eventTypes: SimulatedMarketEvent['type'][] = [
      'price_change', 'yield_accrual', 'arbitrage_opportunity', 'price_change',
    ];
    events.push({
      type: eventTypes[agentIdx % eventTypes.length],
      description: buildEventDescription(strategy.category, agentIdx),
      impact: agentIdx % 3 === 2 ? 'neutral' : 'positive',
      timestamp: new Date(now.getTime() + agentIdx * 1_000),
    });

    // 1–2 trades per agent
    const tradeCount = 1 + (agentIdx % 2);
    for (let t = 0; t < tradeCount; t++) {
      const amountUsd = Math.round(agent.capitalUsd * (0.05 + t * 0.03));
      const priceUsd = 5.5 + Math.random() * 0.5;
      const pnlUsd = amountUsd * 0.01 * (1 + agentIdx * 0.5);

      trades.push({
        id: simId('trade', agent.agentId + t.toString()),
        agentId: agent.agentId,
        strategyName: agent.strategyName,
        type: t % 2 === 0 ? 'buy' : 'sell',
        symbol: buildTradeSymbol(strategy.category),
        amountUsd,
        priceUsd,
        isSimulated: true,
        executedAt: new Date(now.getTime() + agentIdx * 2_000 + t * 500),
        pnlUsd: t % 2 === 1 ? pnlUsd : undefined,
      });
    }
  });

  const totalVolumeUsd = trades.reduce((sum, t) => sum + t.amountUsd, 0);
  const unrealizedPnlUsd = trades
    .filter((t) => t.pnlUsd !== undefined)
    .reduce((sum, t) => sum + (t.pnlUsd ?? 0), 0);
  const currentValueUsd = config.fundCapitalUsd + unrealizedPnlUsd;

  return {
    type: 'live_execution',
    tradesExecuted: trades,
    marketEvents: events,
    totalVolumeUsd,
    currentValueUsd,
    unrealizedPnlUsd,
    executionDurationMs: config.executionDurationMs > 0 ? config.executionDurationMs : 0,
  };
}

function buildEventDescription(category: string, idx: number): string {
  const descriptions: Record<string, string[]> = {
    dca: ['TON/USDT price dropped 2.1% — DCA interval triggered', 'Scheduled DCA purchase executed at optimal price'],
    yield: ['New yield opportunity detected: 22.5% APY on STON.fi', 'Yield compounded into position'],
    arbitrage: ['1.2% price differential detected between STON.fi and DeDust', 'Arbitrage opportunity captured'],
    grid: ['Price entered buy grid zone at $5.42', 'Grid sell order filled at $5.61'],
    momentum: ['Bullish momentum signal: RSI > 70', 'Momentum trade entered'],
  };
  const opts = descriptions[category] ?? descriptions.dca;
  return opts[idx % opts.length];
}

function buildTradeSymbol(category: string): string {
  const symbols: Record<string, string> = {
    dca: 'TON/USDT',
    yield: 'STON/USDT',
    arbitrage: 'TON/USDT',
    grid: 'TON/USDT',
    momentum: 'TON/USDT',
  };
  return symbols[category] ?? 'TON/USDT';
}

// ============================================================================
// Stage 5: Performance Monitoring
// ============================================================================

/**
 * Execute Stage 5 — Performance Monitoring
 *
 * Computes the current portfolio state and builds the investor dashboard
 * snapshot. Shows per-strategy performance, overall P&L, and allocation.
 */
export function executePerformanceMonitoringStage(
  fundCreation: FundCreationResult,
  agentDeployment: AgentDeploymentResult,
  liveExecution: LiveExecutionResult,
): PerformanceMonitoringResult {
  // Distribute unrealized PnL proportionally across strategies
  const totalUsd = fundCreation.capitalUsd;
  const totalPnlUsd = liveExecution.unrealizedPnlUsd;

  const strategyPerformance: StrategyPerformanceSnapshot[] = agentDeployment.deployedAgents.map(
    (agent) => {
      const allocated = agent.capitalUsd;
      const pnl = (allocated / totalUsd) * totalPnlUsd;
      const currentValue = allocated + pnl;
      const returnPercent = (pnl / allocated) * 100;
      const trades = liveExecution.tradesExecuted.filter((t) => t.agentId === agent.agentId);

      return {
        strategyId: agent.strategyId,
        strategyName: agent.strategyName,
        allocatedCapitalUsd: allocated,
        currentValueUsd: parseFloat(currentValue.toFixed(2)),
        pnlUsd: parseFloat(pnl.toFixed(2)),
        returnPercent: parseFloat(returnPercent.toFixed(2)),
        tradesCount: trades.length,
      };
    },
  );

  const currentValueUsd = liveExecution.currentValueUsd;
  const totalReturnPercent = totalUsd > 0 ? (totalPnlUsd / totalUsd) * 100 : 0;

  // Current allocation percentages (may drift from target after execution)
  const allocationBreakdown = agentDeployment.deployedAgents.map((agent, idx) => {
    const snap = strategyPerformance[idx];
    const currentPercent = currentValueUsd > 0 ? (snap.currentValueUsd / currentValueUsd) * 100 : 0;
    return {
      strategyName: agent.strategyName,
      currentPercent: parseFloat(currentPercent.toFixed(1)),
      targetPercent: agent.allocationPercent,
    };
  });

  const bestPerformingStrategy = [...strategyPerformance].sort(
    (a, b) => b.returnPercent - a.returnPercent,
  )[0]?.strategyName ?? '';

  const dashboardUrl = `https://tonaiagent.com/funds/${fundCreation.fundId}/dashboard`;

  return {
    type: 'performance_monitoring',
    totalCapitalUsd: fundCreation.capitalUsd,
    currentValueUsd: parseFloat(currentValueUsd.toFixed(2)),
    totalPnlUsd: parseFloat(totalPnlUsd.toFixed(2)),
    totalReturnPercent: parseFloat(totalReturnPercent.toFixed(2)),
    strategyPerformance,
    allocationBreakdown,
    bestPerformingStrategy,
    dashboardUrl,
  };
}

// ============================================================================
// Stage 6: Rebalancing Demonstration
// ============================================================================

/**
 * Execute Stage 6 — Rebalancing Demonstration
 *
 * Simulates automatic portfolio rebalancing triggered by performance drift.
 * Adjusts strategy allocations and updates risk exposure.
 */
export function executeRebalancingStage(
  performanceMonitoring: PerformanceMonitoringResult,
  config: FundInvestorDemoConfig,
): RebalancingResult {
  if (!config.includeRebalancing) {
    return {
      type: 'rebalancing',
      rebalanceReason: 'performance_drift',
      rebalancingActions: [],
      portfolioValueBeforeUsd: performanceMonitoring.currentValueUsd,
      portfolioValueAfterUsd: performanceMonitoring.currentValueUsd,
      newAllocations: performanceMonitoring.allocationBreakdown.map((a) => ({
        strategyName: a.strategyName,
        newPercent: a.targetPercent,
      })),
      riskExposureBefore: 'medium',
      riskExposureAfter: 'medium',
      successful: true,
    };
  }

  // Calculate drift (current vs target allocation)
  const actions: RebalancingAction[] = performanceMonitoring.allocationBreakdown.map((a) => {
    const drift = a.currentPercent - a.targetPercent;
    const direction: RebalancingAction['direction'] =
      Math.abs(drift) < 0.5 ? 'unchanged' : drift < 0 ? 'increase' : 'decrease';
    const capitalMovedUsd = Math.abs(
      (Math.abs(drift) / 100) * performanceMonitoring.currentValueUsd,
    );

    return {
      strategyId: a.strategyName.toLowerCase().replace(/\s+/g, '_'),
      strategyName: a.strategyName,
      previousPercent: a.currentPercent,
      newPercent: a.targetPercent,
      capitalMovedUsd: parseFloat(capitalMovedUsd.toFixed(2)),
      direction,
    };
  });

  const newAllocations = actions.map((a) => ({
    strategyName: a.strategyName,
    newPercent: a.newPercent,
  }));

  return {
    type: 'rebalancing',
    rebalanceReason: 'performance_drift',
    rebalancingActions: actions,
    portfolioValueBeforeUsd: performanceMonitoring.currentValueUsd,
    portfolioValueAfterUsd: performanceMonitoring.currentValueUsd, // value preserved during rebalance
    newAllocations,
    riskExposureBefore: 'medium',
    riskExposureAfter: 'low',
    successful: true,
  };
}
