/**
 * TONAIAgent - Monitoring Metrics Service
 *
 * Aggregates data from Agent Manager API and Portfolio Engine to provide
 * comprehensive metrics for the monitoring dashboard.
 *
 * Implements Issue #215: Agent Monitoring Dashboard
 */

import type {
  AgentDashboardSummary,
  AgentMetrics,
  AgentMonitoringStatus,
  DashboardOverview,
  EquityCurveResponse,
  EquityPoint,
  MonitoringConfig,
  MonitoringPosition,
  MonitoringTrade,
  MonitoringUpdate,
  MonitoringUpdateHandler,
  MonitoringUnsubscribe,
  PositionsResponse,
  RiskIndicators,
  RiskLevel,
  TradeHistoryResponse,
} from './types';

import { DEFAULT_MONITORING_CONFIG, MonitoringError } from './types';

// ============================================================================
// Demo Data
// ============================================================================

/**
 * Generate demo agent data for testing and demonstration.
 */
function createDemoAgents(): AgentDashboardSummary[] {
  const now = new Date();
  return [
    {
      agentId: 'agent_001',
      name: 'Momentum Agent',
      status: 'RUNNING',
      strategy: 'momentum',
      portfolioValue: 10420,
      roi: 4.2,
      ownerId: 'user_001',
      updatedAt: now,
    },
    {
      agentId: 'agent_002',
      name: 'Mean Reversion',
      status: 'PAUSED',
      strategy: 'mean_reversion',
      portfolioValue: 9800,
      roi: -2.0,
      ownerId: 'user_001',
      updatedAt: now,
    },
    {
      agentId: 'agent_003',
      name: 'AI Trader',
      status: 'RUNNING',
      strategy: 'ai_trading',
      portfolioValue: 12100,
      roi: 21.0,
      ownerId: 'user_002',
      updatedAt: now,
    },
    {
      agentId: 'agent_004',
      name: 'Arbitrage Bot',
      status: 'STOPPED',
      strategy: 'arbitrage',
      portfolioValue: 10000,
      roi: 0,
      ownerId: 'user_003',
      updatedAt: now,
    },
    {
      agentId: 'agent_005',
      name: 'Yield Optimizer',
      status: 'ERROR',
      strategy: 'yield_farming',
      portfolioValue: 9500,
      roi: -5.0,
      ownerId: 'user_001',
      updatedAt: now,
    },
  ];
}

/**
 * Generate demo positions for an agent.
 */
function createDemoPositions(agentId: string): MonitoringPosition[] {
  const now = new Date();
  const positions: Record<string, MonitoringPosition[]> = {
    'agent_001': [
      {
        positionId: 'pos_001',
        agentId: 'agent_001',
        asset: 'TON',
        size: 200,
        entryPrice: 5.21,
        currentPrice: 5.34,
        unrealizedPnl: 26,
        unrealizedPnlPct: 2.5,
        openedAt: new Date(now.getTime() - 86400000), // 1 day ago
      },
      {
        positionId: 'pos_002',
        agentId: 'agent_001',
        asset: 'BTC',
        size: 0.05,
        entryPrice: 65000,
        currentPrice: 67500,
        unrealizedPnl: 125,
        unrealizedPnlPct: 3.85,
        openedAt: new Date(now.getTime() - 172800000), // 2 days ago
      },
    ],
    'agent_002': [
      {
        positionId: 'pos_003',
        agentId: 'agent_002',
        asset: 'ETH',
        size: 2.5,
        entryPrice: 3400,
        currentPrice: 3300,
        unrealizedPnl: -250,
        unrealizedPnlPct: -2.94,
        openedAt: new Date(now.getTime() - 259200000), // 3 days ago
      },
    ],
    'agent_003': [
      {
        positionId: 'pos_004',
        agentId: 'agent_003',
        asset: 'TON',
        size: 500,
        entryPrice: 4.80,
        currentPrice: 5.50,
        unrealizedPnl: 350,
        unrealizedPnlPct: 14.58,
        openedAt: new Date(now.getTime() - 604800000), // 7 days ago
      },
      {
        positionId: 'pos_005',
        agentId: 'agent_003',
        asset: 'USDT',
        size: 5000,
        entryPrice: 1.0,
        currentPrice: 1.0,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        openedAt: new Date(now.getTime() - 86400000),
      },
    ],
  };
  return positions[agentId] ?? [];
}

/**
 * Generate demo trades for an agent.
 */
function createDemoTrades(agentId: string): MonitoringTrade[] {
  const now = new Date();
  const allTrades: Record<string, MonitoringTrade[]> = {
    'agent_001': [
      {
        tradeId: 'trade_001',
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        price: 5.21,
        quantity: 200,
        value: 1042,
        realizedPnl: 0,
        timestamp: new Date(now.getTime() - 3600000), // 1 hour ago
      },
      {
        tradeId: 'trade_002',
        agentId: 'agent_001',
        pair: 'BTC/USDT',
        side: 'BUY',
        price: 65000,
        quantity: 0.05,
        value: 3250,
        realizedPnl: 0,
        timestamp: new Date(now.getTime() - 7200000), // 2 hours ago
      },
      {
        tradeId: 'trade_003',
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'SELL',
        price: 5.35,
        quantity: 100,
        value: 535,
        realizedPnl: 14,
        timestamp: new Date(now.getTime() - 1800000), // 30 mins ago
      },
    ],
    'agent_002': [
      {
        tradeId: 'trade_004',
        agentId: 'agent_002',
        pair: 'ETH/USDT',
        side: 'BUY',
        price: 3400,
        quantity: 2.5,
        value: 8500,
        realizedPnl: 0,
        timestamp: new Date(now.getTime() - 259200000), // 3 days ago
      },
    ],
    'agent_003': [
      {
        tradeId: 'trade_005',
        agentId: 'agent_003',
        pair: 'TON/USDT',
        side: 'BUY',
        price: 4.80,
        quantity: 500,
        value: 2400,
        realizedPnl: 0,
        timestamp: new Date(now.getTime() - 604800000), // 7 days ago
      },
      {
        tradeId: 'trade_006',
        agentId: 'agent_003',
        pair: 'TON/USDT',
        side: 'SELL',
        price: 5.30,
        quantity: 200,
        value: 1060,
        realizedPnl: 100,
        timestamp: new Date(now.getTime() - 172800000), // 2 days ago
      },
    ],
  };
  return allTrades[agentId] ?? [];
}

/**
 * Generate demo metrics for an agent.
 */
function createDemoMetrics(agentId: string): AgentMetrics {
  const now = new Date();
  const metricsMap: Record<string, AgentMetrics> = {
    'agent_001': {
      agentId: 'agent_001',
      portfolioValue: 10420,
      initialCapital: 10000,
      totalProfit: 420,
      roi: 4.2,
      maxDrawdown: -3.1,
      currentDrawdown: -1.2,
      tradeCount: 24,
      winningTrades: 15,
      losingTrades: 9,
      winRate: 62.5,
      avgProfit: 35,
      avgLoss: -22,
      profitFactor: 1.89,
      totalFees: 24.50,
      calculatedAt: now,
    },
    'agent_002': {
      agentId: 'agent_002',
      portfolioValue: 9800,
      initialCapital: 10000,
      totalProfit: -200,
      roi: -2.0,
      maxDrawdown: -5.2,
      currentDrawdown: -2.0,
      tradeCount: 12,
      winningTrades: 4,
      losingTrades: 8,
      winRate: 33.3,
      avgProfit: 50,
      avgLoss: -50,
      profitFactor: 0.5,
      totalFees: 15.00,
      calculatedAt: now,
    },
    'agent_003': {
      agentId: 'agent_003',
      portfolioValue: 12100,
      initialCapital: 10000,
      totalProfit: 2100,
      roi: 21.0,
      maxDrawdown: -2.5,
      currentDrawdown: 0,
      tradeCount: 42,
      winningTrades: 30,
      losingTrades: 12,
      winRate: 71.4,
      avgProfit: 85,
      avgLoss: -35,
      profitFactor: 2.43,
      totalFees: 52.00,
      calculatedAt: now,
    },
  };

  return metricsMap[agentId] ?? {
    agentId,
    portfolioValue: 10000,
    initialCapital: 10000,
    totalProfit: 0,
    roi: 0,
    maxDrawdown: 0,
    currentDrawdown: 0,
    tradeCount: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    avgProfit: 0,
    avgLoss: 0,
    profitFactor: 0,
    totalFees: 0,
    calculatedAt: now,
  };
}

/**
 * Generate demo equity curve for an agent.
 */
function createDemoEquityCurve(
  agentId: string,
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'all'
): EquityPoint[] {
  const now = new Date();
  const metrics = createDemoMetrics(agentId);
  const initialValue = metrics.initialCapital;
  const finalValue = metrics.portfolioValue;

  let pointCount: number;
  let intervalMs: number;

  switch (timeframe) {
    case 'hour':
      pointCount = 60; // 1 point per minute
      intervalMs = 60000;
      break;
    case 'day':
      pointCount = 288; // 1 point per 5 minutes
      intervalMs = 300000;
      break;
    case 'week':
      pointCount = 168; // 1 point per hour
      intervalMs = 3600000;
      break;
    case 'month':
      pointCount = 720; // 1 point per hour
      intervalMs = 3600000;
      break;
    case 'all':
    default:
      pointCount = 365; // 1 point per day
      intervalMs = 86400000;
      break;
  }

  const points: EquityPoint[] = [];
  const valueChange = finalValue - initialValue;

  for (let i = 0; i < pointCount; i++) {
    const progress = i / (pointCount - 1);
    // Add some random noise for realistic curve
    const noise = (Math.random() - 0.5) * Math.abs(valueChange) * 0.1;
    const value = initialValue + valueChange * progress + noise;
    const cumulativePnl = value - initialValue;
    const drawdown = value < initialValue ? ((initialValue - value) / initialValue) * -100 : 0;

    points.push({
      timestamp: new Date(now.getTime() - (pointCount - i) * intervalMs),
      value: Math.round(value * 100) / 100,
      cumulativePnl: Math.round(cumulativePnl * 100) / 100,
      drawdown: Math.round(drawdown * 100) / 100,
    });
  }

  return points;
}

/**
 * Generate demo risk indicators for an agent.
 */
function createDemoRiskIndicators(agentId: string): RiskIndicators {
  const now = new Date();
  const indicators: Record<string, RiskIndicators> = {
    'agent_001': {
      agentId: 'agent_001',
      riskLevel: 'medium',
      drawdown: -1.2,
      exposure: 18,
      concentration: 35,
      openPositions: 2,
      valueAtRisk: 520,
      dailyLossUsage: 15,
      calculatedAt: now,
    },
    'agent_002': {
      agentId: 'agent_002',
      riskLevel: 'high',
      drawdown: -5.2,
      exposure: 45,
      concentration: 65,
      openPositions: 1,
      valueAtRisk: 980,
      dailyLossUsage: 52,
      calculatedAt: now,
    },
    'agent_003': {
      agentId: 'agent_003',
      riskLevel: 'low',
      drawdown: 0,
      exposure: 25,
      concentration: 40,
      openPositions: 2,
      valueAtRisk: 605,
      dailyLossUsage: 0,
      calculatedAt: now,
    },
    'agent_005': {
      agentId: 'agent_005',
      riskLevel: 'critical',
      drawdown: -5.0,
      exposure: 80,
      concentration: 90,
      openPositions: 1,
      valueAtRisk: 1900,
      dailyLossUsage: 85,
      calculatedAt: now,
    },
  };

  return indicators[agentId] ?? {
    agentId,
    riskLevel: 'low',
    drawdown: 0,
    exposure: 0,
    concentration: 0,
    openPositions: 0,
    valueAtRisk: 0,
    dailyLossUsage: 0,
    calculatedAt: now,
  };
}

// ============================================================================
// Monitoring Metrics Service
// ============================================================================

/**
 * Service that aggregates metrics from Agent Manager and Portfolio Engine.
 *
 * @example
 * ```typescript
 * const service = createMonitoringMetricsService();
 *
 * // Get dashboard overview
 * const overview = service.getDashboardOverview();
 *
 * // Get agent metrics
 * const metrics = service.getAgentMetrics('agent_001');
 *
 * // Subscribe to real-time updates
 * const unsub = service.subscribe(update => {
 *   console.log('Update:', update);
 * });
 * ```
 */
export class MonitoringMetricsService {
  private readonly config: MonitoringConfig;
  private readonly agents: Map<string, AgentDashboardSummary>;
  private readonly subscribers: Set<MonitoringUpdateHandler>;
  private metricsCache: Map<string, { metrics: AgentMetrics; cachedAt: Date }>;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
    this.agents = new Map();
    this.subscribers = new Set();
    this.metricsCache = new Map();
  }

  // --------------------------------------------------------------------------
  // Dashboard Overview
  // --------------------------------------------------------------------------

  /**
   * Get the full dashboard overview with all agents.
   */
  getDashboardOverview(): DashboardOverview {
    const agents = Array.from(this.agents.values());

    const statusCounts: Record<AgentMonitoringStatus, number> = {
      CREATED: 0,
      RUNNING: 0,
      PAUSED: 0,
      STOPPED: 0,
      ERROR: 0,
    };

    for (const agent of agents) {
      statusCounts[agent.status]++;
    }

    return {
      agents,
      totalAgents: agents.length,
      statusCounts,
      generatedAt: new Date(),
    };
  }

  /**
   * Get a single agent's dashboard summary.
   */
  getAgentSummary(agentId: string): AgentDashboardSummary {
    this.validateAgentId(agentId);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new MonitoringError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        { agentId }
      );
    }

    return agent;
  }

  /**
   * Check if an agent exists.
   */
  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  // --------------------------------------------------------------------------
  // Metrics
  // --------------------------------------------------------------------------

  /**
   * Get comprehensive metrics for an agent.
   */
  getAgentMetrics(agentId: string): AgentMetrics {
    this.validateAgentId(agentId);

    if (!this.agents.has(agentId)) {
      throw new MonitoringError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        { agentId }
      );
    }

    // Check cache
    if (this.config.enableMetricsCache) {
      const cached = this.metricsCache.get(agentId);
      if (cached) {
        const age = Date.now() - cached.cachedAt.getTime();
        if (age < this.config.metricsCacheTtlMs) {
          return cached.metrics;
        }
      }
    }

    // Calculate fresh metrics
    const metrics = this.calculateMetrics(agentId);

    // Update cache
    if (this.config.enableMetricsCache) {
      this.metricsCache.set(agentId, { metrics, cachedAt: new Date() });
    }

    return metrics;
  }

  /**
   * Calculate metrics for an agent (internal).
   */
  private calculateMetrics(agentId: string): AgentMetrics {
    // In a real implementation, this would aggregate data from
    // PortfolioEngine and AgentManager
    return createDemoMetrics(agentId);
  }

  // --------------------------------------------------------------------------
  // Positions
  // --------------------------------------------------------------------------

  /**
   * Get active positions for an agent.
   */
  getPositions(agentId: string): PositionsResponse {
    this.validateAgentId(agentId);

    if (!this.agents.has(agentId)) {
      throw new MonitoringError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        { agentId }
      );
    }

    const positions = createDemoPositions(agentId);

    return {
      positions,
      total: positions.length,
      agentId,
    };
  }

  // --------------------------------------------------------------------------
  // Trades
  // --------------------------------------------------------------------------

  /**
   * Get trade history for an agent.
   */
  getTrades(
    agentId: string,
    limit: number = 100,
    offset: number = 0
  ): TradeHistoryResponse {
    this.validateAgentId(agentId);

    if (!this.agents.has(agentId)) {
      throw new MonitoringError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        { agentId }
      );
    }

    const allTrades = createDemoTrades(agentId);
    const trades = allTrades.slice(offset, offset + limit);

    return {
      trades,
      total: allTrades.length,
      limit,
      offset,
      agentId,
    };
  }

  // --------------------------------------------------------------------------
  // Equity Curve
  // --------------------------------------------------------------------------

  /**
   * Get equity curve for an agent.
   */
  getEquityCurve(
    agentId: string,
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'all' = 'day'
  ): EquityCurveResponse {
    this.validateAgentId(agentId);

    if (!this.agents.has(agentId)) {
      throw new MonitoringError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        { agentId }
      );
    }

    const validTimeframes = ['hour', 'day', 'week', 'month', 'all'];
    if (!validTimeframes.includes(timeframe)) {
      throw new MonitoringError(
        `Invalid timeframe: ${timeframe}`,
        'INVALID_TIMEFRAME',
        { timeframe, validTimeframes }
      );
    }

    const curve = createDemoEquityCurve(agentId, timeframe);

    // Limit points if needed
    const limitedCurve = curve.slice(-this.config.maxEquityCurvePoints);

    return {
      agentId,
      curve: limitedCurve,
      timeframe,
      pointCount: limitedCurve.length,
    };
  }

  // --------------------------------------------------------------------------
  // Risk Indicators
  // --------------------------------------------------------------------------

  /**
   * Get risk indicators for an agent.
   */
  getRiskIndicators(agentId: string): RiskIndicators {
    this.validateAgentId(agentId);

    if (!this.agents.has(agentId)) {
      throw new MonitoringError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        { agentId }
      );
    }

    return createDemoRiskIndicators(agentId);
  }

  // --------------------------------------------------------------------------
  // Agent Management
  // --------------------------------------------------------------------------

  /**
   * Register an agent for monitoring.
   */
  registerAgent(agent: AgentDashboardSummary): void {
    this.validateAgentId(agent.agentId);
    this.agents.set(agent.agentId, agent);
    this.emitUpdate({
      type: 'agent.status_changed',
      agentId: agent.agentId,
      timestamp: new Date(),
      data: { status: agent.status },
    });
  }

  /**
   * Update an agent's monitoring data.
   */
  updateAgent(agentId: string, updates: Partial<AgentDashboardSummary>): AgentDashboardSummary {
    this.validateAgentId(agentId);

    const existing = this.agents.get(agentId);
    if (!existing) {
      throw new MonitoringError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        { agentId }
      );
    }

    const updated: AgentDashboardSummary = {
      ...existing,
      ...updates,
      agentId, // Prevent ID from being changed
      updatedAt: new Date(),
    };

    this.agents.set(agentId, updated);

    // Emit appropriate update
    if (updates.status && updates.status !== existing.status) {
      this.emitUpdate({
        type: 'agent.status_changed',
        agentId,
        timestamp: new Date(),
        data: { previousStatus: existing.status, newStatus: updates.status },
      });
    }

    if (updates.portfolioValue && updates.portfolioValue !== existing.portfolioValue) {
      this.emitUpdate({
        type: 'portfolio.value_updated',
        agentId,
        timestamp: new Date(),
        data: { previousValue: existing.portfolioValue, newValue: updates.portfolioValue },
      });
    }

    return updated;
  }

  /**
   * Remove an agent from monitoring.
   */
  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.metricsCache.delete(agentId);
  }

  // --------------------------------------------------------------------------
  // Real-Time Updates
  // --------------------------------------------------------------------------

  /**
   * Subscribe to real-time monitoring updates.
   */
  subscribe(handler: MonitoringUpdateHandler): MonitoringUnsubscribe {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  /**
   * Emit an update to all subscribers.
   */
  private emitUpdate(update: MonitoringUpdate): void {
    if (!this.config.enableRealTimeUpdates) return;

    for (const handler of this.subscribers) {
      try {
        handler(update);
      } catch {
        // Ignore handler errors
      }
    }
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  /**
   * Validate an agent ID.
   */
  private validateAgentId(agentId: string): void {
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      throw new MonitoringError(
        'Invalid agent ID',
        'INVALID_AGENT_ID',
        { agentId }
      );
    }
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  /**
   * Get service statistics.
   */
  getStats(): { agents: number; subscribers: number; cachedMetrics: number } {
    return {
      agents: this.agents.size,
      subscribers: this.subscribers.size,
      cachedMetrics: this.metricsCache.size,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a MonitoringMetricsService instance.
 */
export function createMonitoringMetricsService(
  config?: Partial<MonitoringConfig>
): MonitoringMetricsService {
  return new MonitoringMetricsService(config);
}

/**
 * Create a MonitoringMetricsService with demo data.
 */
export function createDemoMonitoringMetricsService(
  config?: Partial<MonitoringConfig>
): MonitoringMetricsService {
  const service = new MonitoringMetricsService(config);

  // Register demo agents
  for (const agent of createDemoAgents()) {
    service.registerAgent(agent);
  }

  return service;
}
