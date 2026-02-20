/**
 * TONAIAgent - Portfolio Agent
 *
 * Manages capital allocation, portfolio construction, and rebalancing
 * for the autonomous hedge fund.
 */

import {
  PortfolioAgentConfig,
  PortfolioState,
  PortfolioPosition,
  PortfolioPerformance,
  RebalanceOrder,
  HedgeFundEvent,
  HedgeFundEventCallback,
} from './types';

// ============================================================================
// Portfolio Agent Interface
// ============================================================================

export interface PortfolioAgent {
  readonly config: PortfolioAgentConfig;
  readonly state: PortfolioState;

  // Configuration
  configure(config: Partial<PortfolioAgentConfig>): Promise<void>;

  // Portfolio operations
  getState(): PortfolioState;
  getPositions(): PortfolioPosition[];
  getPosition(asset: string): PortfolioPosition | undefined;
  getAllocation(): Record<string, number>;

  // Rebalancing
  checkRebalanceNeeded(): RebalanceCheck;
  calculateRebalanceOrders(): RebalanceOrder[];
  executeRebalance(): Promise<RebalanceResult>;

  // Performance
  getPerformance(): PortfolioPerformance;
  calculateMetrics(): PortfolioMetrics;

  // Allocation optimization
  optimizeAllocation(constraints?: OptimizationConstraints): Promise<OptimalAllocation>;

  // Events
  onEvent(callback: HedgeFundEventCallback): void;
}

export interface RebalanceCheck {
  needed: boolean;
  reason?: string;
  drifts: AllocationDrift[];
  totalDrift: number;
  nextScheduledRebalance?: Date;
}

export interface AllocationDrift {
  asset: string;
  targetPercent: number;
  currentPercent: number;
  drift: number;
  driftPercent: number;
}

export interface RebalanceResult {
  success: boolean;
  ordersExecuted: number;
  ordersFailed: number;
  totalTraded: number;
  fees: number;
  newAllocation: Record<string, number>;
  duration: number;
  errors?: string[];
}

export interface PortfolioMetrics {
  totalValue: number;
  cash: number;
  invested: number;
  unrealizedPnL: number;
  realizedPnL: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  treynorRatio: number;
  volatility: number;
  downstideDeviation: number;
}

export interface OptimizationConstraints {
  targetReturn?: number;
  maxVolatility?: number;
  maxDrawdown?: number;
  minSharpe?: number;
  customConstraints?: Record<string, unknown>;
}

export interface OptimalAllocation {
  allocations: Record<string, number>;
  expectedReturn: number;
  expectedVolatility: number;
  expectedSharpe: number;
  confidence: number;
  method: string;
}

// ============================================================================
// Default Portfolio Agent Implementation
// ============================================================================

export class DefaultPortfolioAgent implements PortfolioAgent {
  private _config: PortfolioAgentConfig;
  private _state: PortfolioState;
  private readonly eventCallbacks: HedgeFundEventCallback[] = [];
  private historicalReturns: number[] = [];

  constructor(config?: Partial<PortfolioAgentConfig>) {
    this._config = {
      enabled: true,
      targetAllocation: {},
      rebalanceThreshold: 0.05,
      rebalanceFrequency: 'daily',
      constraints: {
        maxSingleAsset: 0.25,
        maxSingleStrategy: 0.35,
        maxCorrelation: 0.70,
        minLiquidity: 0.10,
        maxLeverage: 1.0,
        longOnly: true,
      },
      optimizationMethod: 'mean_variance',
      parameters: {},
      ...config,
    };

    this._state = {
      totalValue: 0,
      cash: 0,
      positions: [],
      allocation: {},
      performance: this.createEmptyPerformance(),
    };
  }

  get config(): PortfolioAgentConfig {
    return { ...this._config };
  }

  get state(): PortfolioState {
    return { ...this._state };
  }

  async configure(config: Partial<PortfolioAgentConfig>): Promise<void> {
    this._config = { ...this._config, ...config };
    this.emitEvent('info', 'portfolio_agent', 'Portfolio agent configuration updated');
  }

  getState(): PortfolioState {
    return { ...this._state };
  }

  getPositions(): PortfolioPosition[] {
    return [...this._state.positions];
  }

  getPosition(asset: string): PortfolioPosition | undefined {
    return this._state.positions.find(p => p.asset === asset);
  }

  getAllocation(): Record<string, number> {
    return { ...this._state.allocation };
  }

  checkRebalanceNeeded(): RebalanceCheck {
    const drifts: AllocationDrift[] = [];
    let totalDrift = 0;

    // Calculate drift for each asset
    for (const [asset, targetPercent] of Object.entries(this._config.targetAllocation)) {
      const currentPercent = this._state.allocation[asset] || 0;
      const drift = Math.abs(currentPercent - targetPercent);
      const driftPercent = targetPercent > 0 ? drift / targetPercent : drift;

      drifts.push({
        asset,
        targetPercent,
        currentPercent,
        drift,
        driftPercent,
      });

      totalDrift += drift;
    }

    // Check if total drift exceeds threshold
    const needed = totalDrift > this._config.rebalanceThreshold;

    return {
      needed,
      reason: needed ? `Total drift (${(totalDrift * 100).toFixed(2)}%) exceeds threshold (${(this._config.rebalanceThreshold * 100).toFixed(2)}%)` : undefined,
      drifts,
      totalDrift,
      nextScheduledRebalance: this._state.nextRebalance,
    };
  }

  calculateRebalanceOrders(): RebalanceOrder[] {
    const orders: RebalanceOrder[] = [];
    const totalValue = this._state.totalValue;

    if (totalValue <= 0) {
      return orders;
    }

    // Calculate orders needed to reach target allocation
    for (const [asset, targetPercent] of Object.entries(this._config.targetAllocation)) {
      const currentPercent = this._state.allocation[asset] || 0;
      const diff = targetPercent - currentPercent;

      if (Math.abs(diff) < 0.001) {
        continue; // Skip negligible differences
      }

      const position = this.getPosition(asset);
      const currentPrice = position?.currentPrice || 1;
      const targetValue = totalValue * targetPercent;
      const currentValue = totalValue * currentPercent;
      const diffValue = targetValue - currentValue;
      const quantity = Math.abs(diffValue / currentPrice);

      orders.push({
        id: `rebalance_${asset}_${Date.now()}`,
        asset,
        side: diff > 0 ? 'buy' : 'sell',
        quantity,
        estimatedValue: Math.abs(diffValue),
        currentWeight: currentPercent,
        targetWeight: targetPercent,
        priority: Math.abs(diff) > 0.05 ? 1 : 2, // Higher priority for larger drifts
        reason: `Rebalance from ${(currentPercent * 100).toFixed(2)}% to ${(targetPercent * 100).toFixed(2)}%`,
      });
    }

    // Sort by priority (1 = highest)
    return orders.sort((a, b) => a.priority - b.priority);
  }

  async executeRebalance(): Promise<RebalanceResult> {
    const startTime = Date.now();
    const orders = this.calculateRebalanceOrders();

    if (orders.length === 0) {
      return {
        success: true,
        ordersExecuted: 0,
        ordersFailed: 0,
        totalTraded: 0,
        fees: 0,
        newAllocation: this.getAllocation(),
        duration: Date.now() - startTime,
      };
    }

    this.emitEvent('info', 'portfolio_agent', `Starting rebalance with ${orders.length} orders`);

    let ordersExecuted = 0;
    let ordersFailed = 0;
    let totalTraded = 0;
    let fees = 0;
    const errors: string[] = [];

    // Execute orders (simulated for now)
    for (const order of orders) {
      try {
        // In real implementation, this would call the execution agent
        totalTraded += order.estimatedValue;
        fees += order.estimatedValue * 0.003; // 0.3% fee estimate
        ordersExecuted++;

        // Update state
        this._state.allocation[order.asset] = order.targetWeight;
      } catch (error) {
        ordersFailed++;
        errors.push(`Failed to execute ${order.side} ${order.asset}: ${error}`);
      }
    }

    this._state.lastRebalance = new Date();
    this._state.nextRebalance = this.calculateNextRebalance();

    const result: RebalanceResult = {
      success: ordersFailed === 0,
      ordersExecuted,
      ordersFailed,
      totalTraded,
      fees,
      newAllocation: this.getAllocation(),
      duration: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined,
    };

    this.emitEvent(
      result.success ? 'info' : 'warning',
      'portfolio_agent',
      `Rebalance completed: ${ordersExecuted} orders executed, ${ordersFailed} failed`,
      { result }
    );

    return result;
  }

  getPerformance(): PortfolioPerformance {
    return { ...this._state.performance };
  }

  calculateMetrics(): PortfolioMetrics {
    const totalValue = this._state.totalValue;
    const cash = this._state.cash;
    const invested = totalValue - cash;

    let unrealizedPnL = 0;
    for (const position of this._state.positions) {
      unrealizedPnL += position.unrealizedPnL;
    }

    // Calculate risk metrics
    const returns = this.historicalReturns;
    const volatility = this.calculateVolatility(returns);
    const downsideDeviation = this.calculateDownsideDeviation(returns);
    const riskFreeRate = 0.05; // 5% annual risk-free rate
    const dailyRiskFree = riskFreeRate / 365;

    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const excessReturn = avgReturn - dailyRiskFree;

    const sharpeRatio = volatility > 0 ? (excessReturn * Math.sqrt(365)) / volatility : 0;
    const sortinoRatio = downsideDeviation > 0 ? (excessReturn * Math.sqrt(365)) / downsideDeviation : 0;

    const maxDrawdown = this._state.performance.maxDrawdown;
    const currentDrawdown = this._state.performance.currentDrawdown;
    const annualizedReturn = avgReturn * 365;
    const calmarRatio = maxDrawdown !== 0 ? annualizedReturn / Math.abs(maxDrawdown) : 0;

    return {
      totalValue,
      cash,
      invested,
      unrealizedPnL,
      realizedPnL: 0, // Would be tracked separately
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown,
      currentDrawdown,
      beta: 1.0, // Would be calculated against benchmark
      alpha: 0, // Would be calculated against benchmark
      informationRatio: 0, // Would be calculated against benchmark
      treynorRatio: 0, // Would be calculated with beta
      volatility,
      downstideDeviation: downsideDeviation,
    };
  }

  async optimizeAllocation(constraints?: OptimizationConstraints): Promise<OptimalAllocation> {
    const method = this._config.optimizationMethod;

    // Get historical returns for assets
    const assets = Object.keys(this._config.targetAllocation);

    // For demonstration, we'll return a simple optimized allocation
    // In production, this would use proper portfolio optimization libraries
    let allocations: Record<string, number> = {};
    let expectedReturn = 0;
    let expectedVolatility = 0;

    switch (method) {
      case 'equal_weight':
        const equalWeight = 1 / assets.length;
        for (const asset of assets) {
          allocations[asset] = equalWeight;
        }
        break;

      case 'risk_parity':
        // Simplified risk parity - would use actual volatilities
        allocations = this.calculateRiskParityWeights(assets);
        break;

      case 'mean_variance':
      case 'black_litterman':
      default:
        // Use target allocation as starting point
        allocations = { ...this._config.targetAllocation };
        break;
    }

    // Apply constraints
    allocations = this.applyConstraints(allocations, constraints);

    // Estimate metrics
    expectedReturn = 0.15; // Placeholder
    expectedVolatility = 0.20; // Placeholder
    const expectedSharpe = expectedReturn / expectedVolatility;

    return {
      allocations,
      expectedReturn,
      expectedVolatility,
      expectedSharpe,
      confidence: 0.75,
      method,
    };
  }

  onEvent(callback: HedgeFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // State Management
  // ============================================================================

  updateState(state: Partial<PortfolioState>): void {
    this._state = { ...this._state, ...state };

    // Recalculate allocation percentages
    if (state.positions || state.totalValue) {
      this.recalculateAllocation();
    }

    // Update performance metrics
    if (state.totalValue !== undefined) {
      this.updatePerformanceMetrics(state.totalValue);
    }
  }

  addPosition(position: PortfolioPosition): void {
    const existingIndex = this._state.positions.findIndex(p => p.asset === position.asset);
    if (existingIndex >= 0) {
      this._state.positions[existingIndex] = position;
    } else {
      this._state.positions.push(position);
    }
    this.recalculateAllocation();
  }

  removePosition(asset: string): void {
    this._state.positions = this._state.positions.filter(p => p.asset !== asset);
    delete this._state.allocation[asset];
    this.recalculateAllocation();
  }

  updatePositionPrice(asset: string, price: number): void {
    const position = this._state.positions.find(p => p.asset === asset);
    if (position) {
      position.currentPrice = price;
      position.marketValue = position.quantity * price;
      position.unrealizedPnL = position.marketValue - (position.quantity * position.averageCost);
      position.unrealizedPnLPercent = position.averageCost > 0
        ? (position.currentPrice - position.averageCost) / position.averageCost
        : 0;
      this.recalculateAllocation();
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private recalculateAllocation(): void {
    const totalValue = this._state.positions.reduce((sum, p) => sum + p.marketValue, 0) + this._state.cash;
    this._state.totalValue = totalValue;

    if (totalValue <= 0) {
      this._state.allocation = {};
      return;
    }

    const allocation: Record<string, number> = {};

    // Cash allocation
    allocation['cash'] = this._state.cash / totalValue;

    // Position allocations
    for (const position of this._state.positions) {
      allocation[position.asset] = position.marketValue / totalValue;
      position.weight = allocation[position.asset];
    }

    this._state.allocation = allocation;
  }

  private updatePerformanceMetrics(newTotalValue: number): void {
    const previousValue = this._state.performance.totalReturn > 0
      ? this._state.totalValue / (1 + this._state.performance.totalReturn)
      : this._state.totalValue;

    if (previousValue > 0) {
      const dailyReturn = (newTotalValue - previousValue) / previousValue;
      this.historicalReturns.push(dailyReturn);

      // Keep last 365 days
      if (this.historicalReturns.length > 365) {
        this.historicalReturns.shift();
      }
    }

    // Update performance object
    this._state.performance = {
      ...this._state.performance,
      totalReturn: previousValue > 0 ? (newTotalValue - previousValue) / previousValue : 0,
      sharpeRatio: this.calculateSharpe(this.historicalReturns),
      maxDrawdown: this.calculateMaxDrawdown(this.historicalReturns),
      currentDrawdown: this.calculateCurrentDrawdown(this.historicalReturns),
    };
  }

  private calculateNextRebalance(): Date {
    const now = new Date();
    switch (this._config.rebalanceFrequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (returns.length - 1);

    return Math.sqrt(variance);
  }

  private calculateDownsideDeviation(returns: number[], threshold = 0): number {
    const downsideReturns = returns.filter(r => r < threshold);
    if (downsideReturns.length < 2) return 0;

    const squaredDiffs = downsideReturns.map(r => Math.pow(r - threshold, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / downsideReturns.length;

    return Math.sqrt(variance);
  }

  private calculateSharpe(returns: number[], riskFreeRate = 0.05): number {
    if (returns.length < 2) return 0;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    const dailyRiskFree = riskFreeRate / 365;

    if (volatility === 0) return 0;

    return ((avgReturn - dailyRiskFree) * Math.sqrt(365)) / volatility;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let peak = 1;
    let maxDrawdown = 0;
    let cumReturn = 1;

    for (const ret of returns) {
      cumReturn *= (1 + ret);
      if (cumReturn > peak) {
        peak = cumReturn;
      }
      const drawdown = (peak - cumReturn) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateCurrentDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let peak = 1;
    let cumReturn = 1;

    for (const ret of returns) {
      cumReturn *= (1 + ret);
      if (cumReturn > peak) {
        peak = cumReturn;
      }
    }

    return (peak - cumReturn) / peak;
  }

  private calculateRiskParityWeights(assets: string[]): Record<string, number> {
    // Simplified risk parity - assumes equal volatility
    // In production, would use actual volatility estimates
    const equalWeight = 1 / assets.length;
    const weights: Record<string, number> = {};

    for (const asset of assets) {
      weights[asset] = equalWeight;
    }

    return weights;
  }

  private applyConstraints(
    allocations: Record<string, number>,
    _constraints?: OptimizationConstraints
  ): Record<string, number> {
    const result = { ...allocations };
    const maxSingle = this._config.constraints.maxSingleAsset;

    // Apply max single asset constraint
    for (const [asset, weight] of Object.entries(result)) {
      if (weight > maxSingle) {
        result[asset] = maxSingle;
      }
    }

    // Normalize to sum to 1
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    if (total > 0 && total !== 1) {
      for (const asset of Object.keys(result)) {
        result[asset] /= total;
      }
    }

    return result;
  }

  private createEmptyPerformance(): PortfolioPerformance {
    return {
      totalReturn: 0,
      totalReturnPercent: 0,
      dailyReturn: 0,
      weeklyReturn: 0,
      monthlyReturn: 0,
      yearToDateReturn: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
    };
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: HedgeFundEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fundId: '',
      type: 'rebalance_triggered',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPortfolioAgent(config?: Partial<PortfolioAgentConfig>): DefaultPortfolioAgent {
  return new DefaultPortfolioAgent(config);
}
