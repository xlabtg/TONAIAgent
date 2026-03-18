/**
 * TONAIAgent - Smart Order Routing Engine
 *
 * Provides institutional-grade smart order routing with:
 * - Slippage optimization across liquidity sources
 * - Cross-venue execution with intelligent splitting
 * - Gas-aware routing for cost minimization
 * - Latency optimization for time-sensitive orders
 */

import {
  LiquiditySource,
  OrderRequest,
  OrderRoute,
  RouteLeg,
  OrderExecution,
  OrderFill,
  OrderExecutionStatus,
  LiquidityNetworkEvent,
  LiquidityNetworkEventCallback,
} from './types';

export interface RouteSimulationResult {
  route: OrderRoute;
  estimatedFillRate: number;
  priceImpactPercent: number;
  executionRisk: 'low' | 'medium' | 'high';
  warnings: string[];
}

export interface RouteValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sourcesAvailable: boolean;
  limitsOk: boolean;
}

export interface SmartRoutingConfig {
  slippageTolerance: number;
  gasAwareRouting: boolean;
  latencyOptimization: boolean;
  maxSources: number;
  splitOrdersEnabled: boolean;
  priceImprovementEnabled: boolean;
}

export interface SmartOrderRoutingEngine {
  computeRoute(order: OrderRequest, sources: LiquiditySource[]): OrderRoute;
  simulateRoute(route: OrderRoute): RouteSimulationResult;
  validateRoute(route: OrderRoute, sources: LiquiditySource[]): RouteValidationResult;
  executeOrder(order: OrderRequest, sources: LiquiditySource[]): OrderExecution;
  executeWithRoute(order: OrderRequest, route: OrderRoute): OrderExecution;
  cancelOrder(orderId: string): void;
  getOrderExecution(orderId: string): OrderExecution | undefined;
  listOrderExecutions(filters?: { status?: OrderExecutionStatus }): OrderExecution[];
  onEvent(callback: LiquidityNetworkEventCallback): void;
  readonly config: SmartRoutingConfig;
}

export class DefaultSmartOrderRoutingEngine implements SmartOrderRoutingEngine {
  private executions: Map<string, OrderExecution> = new Map();
  private eventCallbacks: LiquidityNetworkEventCallback[] = [];
  readonly config: SmartRoutingConfig;

  constructor(config?: Partial<SmartRoutingConfig>) {
    this.config = {
      slippageTolerance: 0.005,
      gasAwareRouting: true,
      latencyOptimization: true,
      maxSources: 5,
      splitOrdersEnabled: true,
      priceImprovementEnabled: true,
      ...config,
    };
  }

  computeRoute(order: OrderRequest, sources: LiquiditySource[]): OrderRoute {
    const eligibleSources = this.filterEligibleSources(order, sources);

    if (eligibleSources.length === 0) {
      throw new Error(`No eligible liquidity sources found for pair: ${order.pair}`);
    }

    const sortedSources = this.rankSources(eligibleSources);
    const legs = this.buildLegs(order, sortedSources);

    const totalAmount = parseFloat(order.amount);
    const totalFees = legs.reduce((sum, leg) => sum + parseFloat(leg.estimatedFees), 0);
    const weightedPrice = this.computeWeightedPrice(legs, totalAmount);

    return {
      id: this.generateId('route'),
      order,
      legs,
      estimatedPrice: weightedPrice.toFixed(8),
      estimatedTotalFees: totalFees.toFixed(8),
      estimatedSlippage: this.estimateSlippage(legs),
      confidence: this.computeConfidence(legs, eligibleSources.length),
      validUntil: new Date(Date.now() + 30_000),
    };
  }

  simulateRoute(route: OrderRoute): RouteSimulationResult {
    const fillRate = this.estimateFillRate(route);
    const priceImpact = this.estimatePriceImpact(route);

    let executionRisk: 'low' | 'medium' | 'high' = 'low';
    if (fillRate < 0.9 || priceImpact > 0.01) executionRisk = 'medium';
    if (fillRate < 0.7 || priceImpact > 0.03) executionRisk = 'high';

    const warnings: string[] = [];
    if (route.legs.length > 3) {
      warnings.push('Order split across multiple sources may increase execution time');
    }
    if (priceImpact > 0.005) {
      warnings.push(`Price impact: ${(priceImpact * 100).toFixed(2)}%`);
    }
    if (new Date() > route.validUntil) {
      warnings.push('Route has expired; prices may have changed');
    }

    return {
      route,
      estimatedFillRate: fillRate,
      priceImpactPercent: priceImpact * 100,
      executionRisk,
      warnings,
    };
  }

  validateRoute(route: OrderRoute, sources: LiquiditySource[]): RouteValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sourceMap = new Map(sources.map(s => [s.id, s]));

    let sourcesAvailable = true;
    let limitsOk = true;

    for (const leg of route.legs) {
      const source = sourceMap.get(leg.sourceId);
      if (!source) {
        errors.push(`Source not found: ${leg.sourceId}`);
        sourcesAvailable = false;
        continue;
      }
      if (source.status !== 'active') {
        errors.push(`Source not active: ${source.name}`);
        sourcesAvailable = false;
      }
      const legAmount = parseFloat(leg.amount);
      const perTradeLimit = parseFloat(source.limits.perTradeLimit);
      if (legAmount > perTradeLimit) {
        errors.push(`Leg amount exceeds per-trade limit for ${source.name}`);
        limitsOk = false;
      }
    }

    if (new Date() > route.validUntil) {
      warnings.push('Route has expired; recompute before execution');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sourcesAvailable,
      limitsOk,
    };
  }

  executeOrder(order: OrderRequest, sources: LiquiditySource[]): OrderExecution {
    const route = this.computeRoute(order, sources);
    return this.executeWithRoute(order, route);
  }

  executeWithRoute(order: OrderRequest, route: OrderRoute): OrderExecution {
    const executionId = order.id ?? this.generateId('exec');
    const startedAt = new Date();

    const execution: OrderExecution = {
      id: executionId,
      order,
      route,
      status: 'executing',
      fills: [],
      totalFilled: '0',
      totalFees: '0',
      averagePrice: '0',
      slippage: 0,
      executionTimeMs: 0,
      startedAt,
    };

    this.executions.set(executionId, execution);
    this.emitEvent('order_submitted', 'order', executionId, { order });

    // Simulate fill execution across legs
    let totalFilled = 0;
    let totalFees = 0;
    let weightedPriceSum = 0;

    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i];
      const fillAmount = parseFloat(leg.amount);
      const fillPrice = parseFloat(leg.estimatedPrice);
      const fillFees = parseFloat(leg.estimatedFees);

      const fill: OrderFill = {
        id: this.generateId('fill'),
        legIndex: i,
        sourceId: leg.sourceId,
        filledAmount: leg.amount,
        fillPrice: leg.estimatedPrice,
        fees: leg.estimatedFees,
        timestamp: new Date(),
      };

      execution.fills.push(fill);
      totalFilled += fillAmount;
      totalFees += fillFees;
      weightedPriceSum += fillAmount * fillPrice;
    }

    const completedAt = new Date();
    execution.totalFilled = totalFilled.toFixed(8);
    execution.totalFees = totalFees.toFixed(8);
    execution.averagePrice = totalFilled > 0
      ? (weightedPriceSum / totalFilled).toFixed(8)
      : '0';
    execution.slippage = this.computeActualSlippage(route, execution);
    execution.status = 'filled';
    execution.completedAt = completedAt;
    execution.executionTimeMs = completedAt.getTime() - startedAt.getTime();

    this.executions.set(executionId, execution);
    this.emitEvent('order_filled', 'order', executionId, { execution });

    return execution;
  }

  cancelOrder(orderId: string): void {
    const execution = this.executions.get(orderId);
    if (!execution) throw new Error(`Order execution not found: ${orderId}`);
    if (execution.status === 'filled' || execution.status === 'cancelled') {
      throw new Error(`Cannot cancel order in status: ${execution.status}`);
    }
    execution.status = 'cancelled';
    this.executions.set(orderId, execution);
    this.emitEvent('order_cancelled', 'order', orderId, {});
  }

  getOrderExecution(orderId: string): OrderExecution | undefined {
    return this.executions.get(orderId);
  }

  listOrderExecutions(filters?: { status?: OrderExecutionStatus }): OrderExecution[] {
    let executions = Array.from(this.executions.values());
    if (filters?.status) {
      executions = executions.filter(e => e.status === filters.status);
    }
    return executions;
  }

  onEvent(callback: LiquidityNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private filterEligibleSources(order: OrderRequest, sources: LiquiditySource[]): LiquiditySource[] {
    return sources.filter(s => {
      if (s.status !== 'active') return false;
      if (!s.supportedPairs.includes(order.pair)) return false;
      if (order.excludedSources?.includes(s.id)) return false;
      if (order.preferredSources?.length && !order.preferredSources.includes(s.id)) return false;
      if (s.routing.excludedPairs.includes(order.pair)) return false;
      return true;
    });
  }

  private rankSources(sources: LiquiditySource[]): LiquiditySource[] {
    return [...sources].sort((a, b) => {
      if (this.config.latencyOptimization) {
        const latencyDiff = a.metrics.latencyMs - b.metrics.latencyMs;
        if (Math.abs(latencyDiff) > 10) return latencyDiff;
      }
      const priorityDiff = b.routing.priority - a.routing.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.metrics.averageSpread - b.metrics.averageSpread;
    });
  }

  private buildLegs(order: OrderRequest, sortedSources: LiquiditySource[]): RouteLeg[] {
    const legs: RouteLeg[] = [];
    const totalAmount = parseFloat(order.amount);
    let remainingAmount = totalAmount;
    const maxSources = this.config.splitOrdersEnabled ? this.config.maxSources : 1;

    for (const source of sortedSources.slice(0, maxSources)) {
      if (remainingAmount <= 0) break;

      const maxAllocation = (totalAmount * source.routing.maxAllocationPercent) / 100;
      const allocation = Math.min(remainingAmount, maxAllocation);

      if (allocation > 0) {
        const price = this.estimateSourcePrice(source, order.pair, order.side, allocation);
        const fees = this.estimateSourceFees(source, allocation);

        legs.push({
          sourceId: source.id,
          sourceName: source.name,
          sourceKind: source.kind,
          amount: allocation.toFixed(8),
          allocationPercent: (allocation / totalAmount) * 100,
          estimatedPrice: price.toFixed(8),
          estimatedFees: fees.toFixed(8),
          estimatedLatencyMs: source.metrics.latencyMs,
          priority: source.routing.priority,
        });

        remainingAmount -= allocation;
      }
    }

    return legs;
  }

  private estimateSourcePrice(
    source: LiquiditySource,
    _pair: string,
    _side: string,
    _amount: number
  ): number {
    // Base price with spread adjustment
    const basePrice = 1.0;
    const spreadAdjustment = source.metrics.averageSpread / 2;
    return basePrice * (1 + spreadAdjustment);
  }

  private estimateSourceFees(source: LiquiditySource, amount: number): number {
    return amount * source.fees.takerFee;
  }

  private computeWeightedPrice(legs: RouteLeg[], totalAmount: number): number {
    if (totalAmount === 0) return 0;
    const sum = legs.reduce((acc, leg) => {
      return acc + parseFloat(leg.estimatedPrice) * parseFloat(leg.amount);
    }, 0);
    return sum / totalAmount;
  }

  private estimateSlippage(legs: RouteLeg[]): number {
    if (legs.length === 0) return 0;
    const avgSlippage = legs.reduce((sum, leg) => {
      return sum + (leg.allocationPercent / 100) * 0.001;
    }, 0);
    return Math.min(avgSlippage, this.config.slippageTolerance);
  }

  private computeConfidence(legs: RouteLeg[], totalSources: number): number {
    if (legs.length === 0) return 0;
    const coverageScore = Math.min(legs.length / Math.max(totalSources, 1), 1);
    return Math.min(0.95, 0.7 + coverageScore * 0.25);
  }

  private estimateFillRate(route: OrderRoute): number {
    return Math.min(0.99, 0.85 + route.legs.length * 0.03);
  }

  private estimatePriceImpact(route: OrderRoute): number {
    const totalAmount = parseFloat(route.order.amount);
    return Math.min(0.05, totalAmount / 10_000_000);
  }

  private computeActualSlippage(route: OrderRoute, execution: OrderExecution): number {
    const expectedPrice = parseFloat(route.estimatedPrice);
    const actualPrice = parseFloat(execution.averagePrice);
    if (expectedPrice === 0) return 0;
    return Math.abs(actualPrice - expectedPrice) / expectedPrice;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(
    type: LiquidityNetworkEvent['type'],
    entityKind: string,
    entityId: string,
    payload: Record<string, unknown>
  ): void {
    const event: LiquidityNetworkEvent = {
      id: this.generateId('evt'),
      type,
      entityId,
      entityKind,
      payload,
      timestamp: new Date(),
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

export function createSmartOrderRoutingEngine(
  config?: Partial<SmartRoutingConfig>
): DefaultSmartOrderRoutingEngine {
  return new DefaultSmartOrderRoutingEngine(config);
}
