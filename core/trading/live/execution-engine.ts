/**
 * TONAIAgent - Order Execution Engine
 *
 * The execution engine bridges AI agent strategy decisions with real liquidity venues.
 * It handles:
 *   - Order routing across connected exchanges
 *   - Slippage control and protection
 *   - Execution retries with exponential backoff
 *   - Partial fill tracking and aggregation
 *   - Algorithmic execution strategies (TWAP, VWAP, Iceberg)
 *
 * Flow:
 *   Agent Strategy → Execution Engine → Exchange Connector → Liquidity Venue
 */

import {
  ExecutionRequest,
  ExecutionResult,
  ExecutionStatus,
  RoutingDecision,
  RoutingAlternative,
  PriceFeed,
  OrderResult,
  OrderStatus,
  LiveTradingEvent,
  LiveTradingEventCallback,
} from './types';
import { ConnectorRegistry, isTerminalOrderStatus } from './connector';
import { KycAmlManager } from '../../../services/regulatory/kyc-aml';
import { isAmlEnforcementEnabled } from '../../../services/regulatory/compliance-flags';

// ============================================================================
// Execution Engine Configuration
// ============================================================================

export interface ExecutionEngineConfig {
  /** Default slippage tolerance as a percentage (0-100) */
  defaultSlippageTolerance: number;
  /** Maximum execution retry attempts */
  maxRetryAttempts: number;
  /** Initial retry delay in milliseconds */
  retryDelayMs: number;
  /** Backoff multiplier for retries */
  retryBackoffMultiplier: number;
  /** Maximum retry delay in milliseconds */
  maxRetryDelayMs: number;
  /** Whether to split large orders across exchanges */
  enableCrossSplitting: boolean;
  /** Minimum order size to trigger splitting */
  splitThresholdUSD: number;
  /** Whether simulation mode is active */
  simulationMode: boolean;
  /** Whether AML transaction checks are enforced before execution */
  enforceAmlChecks: boolean;
}

/**
 * Default execution engine configuration.
 *
 * `enforceAmlChecks` defaults to **on** so that any deployment which does not
 * explicitly opt out runs in the safe, mainnet-compliant configuration. Opt
 * out by setting `AML_ENFORCEMENT_ENABLED=false` for local dev / unit tests
 * (see services/regulatory/compliance-flags.ts).
 */
export const DEFAULT_CONFIG: ExecutionEngineConfig = {
  defaultSlippageTolerance: 0.5,
  maxRetryAttempts: 3,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2,
  maxRetryDelayMs: 10000,
  enableCrossSplitting: false,
  splitThresholdUSD: 10000,
  simulationMode: false,
  enforceAmlChecks: isAmlEnforcementEnabled(),
};

// ============================================================================
// Execution Engine Interface
// ============================================================================

export interface ExecutionEngine {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  cancelExecution(executionId: string): Promise<boolean>;
  getExecution(executionId: string): ExecutionResult | undefined;
  getActiveExecutions(): ExecutionResult[];
  getMetrics(): ExecutionMetrics;
  onEvent(callback: LiveTradingEventCallback): void;
}

export interface ExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  partialExecutions: number;
  averageSlippage: number;
  averageExecutionTimeMs: number;
  totalVolumeUSD: number;
  updatedAt: Date;
}

// ============================================================================
// Default Execution Engine Implementation
// ============================================================================

export class DefaultExecutionEngine implements ExecutionEngine {
  private readonly config: ExecutionEngineConfig;
  private readonly registry: ConnectorRegistry;
  private readonly kycAmlManager: KycAmlManager | undefined;
  private readonly executions = new Map<string, ExecutionResult>();
  private readonly eventCallbacks: LiveTradingEventCallback[] = [];
  private executionCounter = 0;
  private metrics: ExecutionMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    partialExecutions: 0,
    averageSlippage: 0,
    averageExecutionTimeMs: 0,
    totalVolumeUSD: 0,
    updatedAt: new Date(),
  };

  constructor(registry: ConnectorRegistry, config: Partial<ExecutionEngineConfig> = {}, kycAmlManager?: KycAmlManager) {
    this.registry = registry;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.kycAmlManager = kycAmlManager;
  }

  onEvent(callback: LiveTradingEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<LiveTradingEvent, 'id' | 'timestamp'>): void {
    const fullEvent: LiveTradingEvent = {
      id: generateId(),
      timestamp: new Date(),
      ...event,
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore errors in callbacks
      }
    }
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const executionId = `exec_${++this.executionCounter}_${Date.now()}`;
    const startedAt = new Date();

    // Create initial execution record
    const execution: ExecutionResult = {
      executionId,
      agentId: request.agentId,
      strategyId: request.strategyId,
      status: 'pending',
      request,
      orders: [],
      totalQuantity: request.quantity,
      filledQuantity: 0,
      averagePrice: 0,
      totalFees: 0,
      totalSlippage: 0,
      executionTimeMs: 0,
      startedAt,
      retryCount: 0,
    };

    this.executions.set(executionId, execution);
    this.metrics.totalExecutions++;

    this.emitEvent({
      type: 'execution.started',
      agentId: request.agentId,
      data: {
        executionId,
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        strategy: request.executionStrategy,
      },
      severity: 'info',
    });

    try {
      execution.status = 'routing';

      // AML transaction check — run before routing to catch blocked trades early
      if (this.config.enforceAmlChecks && this.kycAmlManager && request.agentId) {
        const amlResult = await this.kycAmlManager.checkTransaction({
          transactionId: executionId,
          userId: request.agentId,
          type: 'trade',
          amount: request.quantity * (request.priceLimit ?? 0),
          currency: 'USD',
          source: request.agentId,
          destination: request.symbol,
          timestamp: startedAt,
        });

        if (!amlResult.approved) {
          throw new ExecutionError(
            `AML check blocked transaction: ${amlResult.requiredActions.join('; ')}`,
            'AML_BLOCKED',
            executionId,
            false, // not retryable
          );
        }
      }

      // Select execution strategy
      switch (request.executionStrategy) {
        case 'twap':
          await this.executeTWAP(execution);
          break;
        case 'iceberg':
          await this.executeIceberg(execution);
          break;
        default:
          await this.executeDirect(execution);
      }

      execution.completedAt = new Date();
      execution.executionTimeMs = execution.completedAt.getTime() - startedAt.getTime();

      // Calculate aggregate metrics
      this.aggregateExecutionResults(execution);

      // Determine final status
      if (execution.filledQuantity >= execution.totalQuantity) {
        execution.status = 'completed';
        this.metrics.successfulExecutions++;
      } else if (execution.filledQuantity > 0) {
        execution.status = 'partially_completed';
        this.metrics.partialExecutions++;
      } else {
        execution.status = 'failed';
        this.metrics.failedExecutions++;
      }

      const eventType = execution.status === 'completed'
        ? 'execution.completed'
        : execution.status === 'partially_completed'
          ? 'execution.partial'
          : 'execution.failed';

      this.emitEvent({
        type: eventType,
        agentId: request.agentId,
        data: {
          executionId,
          status: execution.status,
          filledQuantity: execution.filledQuantity,
          averagePrice: execution.averagePrice,
          slippage: execution.totalSlippage,
        },
        severity: execution.status === 'failed' ? 'error' : 'info',
      });

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      execution.executionTimeMs = execution.completedAt.getTime() - startedAt.getTime();
      this.metrics.failedExecutions++;

      this.emitEvent({
        type: 'execution.failed',
        agentId: request.agentId,
        data: { executionId, error: execution.error },
        severity: 'error',
      });
    }

    this.updateMetrics(execution);
    return execution;
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status === 'completed' || execution.status === 'failed') {
      return false;
    }

    // Cancel all open orders
    const cancelPromises = execution.orders
      .filter(order => !isTerminalOrderStatus(order.status as OrderStatus))
      .map(async (order) => {
        const connector = this.registry.get(this.getExchangeIdFromOrder(order));
        if (connector) {
          try {
            await connector.cancelOrder(order.orderId);
          } catch {
            // Continue cancelling other orders
          }
        }
      });

    await Promise.allSettled(cancelPromises);

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    return true;
  }

  getExecution(executionId: string): ExecutionResult | undefined {
    return this.executions.get(executionId);
  }

  getActiveExecutions(): ExecutionResult[] {
    return Array.from(this.executions.values()).filter(
      e => e.status === 'pending' || e.status === 'routing' || e.status === 'executing'
    );
  }

  getMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }

  // ============================================================================
  // Private Execution Strategy Methods
  // ============================================================================

  private async executeDirect(execution: ExecutionResult): Promise<void> {
    execution.status = 'executing';
    const request = execution.request;

    const routing = this.routeOrder(request);

    if (!routing) {
      throw new ExecutionError('No connected exchange available for routing', 'NO_ROUTE', execution.executionId);
    }

    const connector = this.registry.get(routing.selectedExchangeId);
    if (!connector) {
      throw new ExecutionError(`Connector not found: ${routing.selectedExchangeId}`, 'CONNECTOR_NOT_FOUND', execution.executionId);
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= (request.maxRetries ?? this.config.maxRetryAttempts); attempt++) {
      if (attempt > 0) {
        const delay = Math.min(
          this.config.retryDelayMs * Math.pow(this.config.retryBackoffMultiplier, attempt - 1),
          this.config.maxRetryDelayMs
        );
        await sleep(delay);
        execution.retryCount++;
      }

      try {
        const order = await connector.placeOrder({
          symbol: request.symbol,
          side: request.side,
          type: request.priceLimit ? 'limit' : 'market',
          quantity: request.quantity,
          price: request.priceLimit,
          slippageTolerance: request.slippageTolerance ?? this.config.defaultSlippageTolerance,
        });

        execution.orders.push(order);

        this.emitEvent({
          type: 'order.placed',
          agentId: request.agentId,
          exchangeId: routing.selectedExchangeId,
          data: {
            executionId: execution.executionId,
            orderId: order.orderId,
            status: order.status,
          },
          severity: 'info',
        });

        return; // Successfully placed order
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < (request.maxRetries ?? this.config.maxRetryAttempts)) {
          continue; // Retry
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  private async executeTWAP(execution: ExecutionResult): Promise<void> {
    execution.status = 'executing';
    const request = execution.request;

    // Time-Weighted Average Price: split order into equal parts over time
    const numSlices = 5;
    const sliceQuantity = request.quantity / numSlices;
    const intervalMs = 5000; // 5 seconds between slices

    const routing = this.routeOrder(request);
    if (!routing) {
      throw new ExecutionError('No connected exchange available for routing', 'NO_ROUTE', execution.executionId);
    }

    const connector = this.registry.get(routing.selectedExchangeId);
    if (!connector) {
      throw new ExecutionError(`Connector not found: ${routing.selectedExchangeId}`, 'CONNECTOR_NOT_FOUND', execution.executionId);
    }

    for (let i = 0; i < numSlices; i++) {
      if ((execution.status as string) === 'cancelled') {
        break;
      }

      if (i > 0) {
        await sleep(intervalMs);
      }

      try {
        const order = await connector.placeOrder({
          symbol: request.symbol,
          side: request.side,
          type: 'market',
          quantity: sliceQuantity,
          slippageTolerance: request.slippageTolerance ?? this.config.defaultSlippageTolerance,
        });

        execution.orders.push(order);
      } catch {
        // Continue with next slice on failure
      }
    }
  }

  private async executeIceberg(execution: ExecutionResult): Promise<void> {
    execution.status = 'executing';
    const request = execution.request;

    // Iceberg: show only a small portion of the total order at a time
    const visibleQuantity = request.quantity * 0.1; // Show 10% at a time
    const routing = this.routeOrder(request);

    if (!routing) {
      throw new ExecutionError('No connected exchange available for routing', 'NO_ROUTE', execution.executionId);
    }

    const connector = this.registry.get(routing.selectedExchangeId);
    if (!connector) {
      throw new ExecutionError(`Connector not found: ${routing.selectedExchangeId}`, 'CONNECTOR_NOT_FOUND', execution.executionId);
    }

    let remainingQuantity = request.quantity;

    while (remainingQuantity > 0 && (execution.status as string) !== 'cancelled') {
      const batchQuantity = Math.min(visibleQuantity, remainingQuantity);

      try {
        const order = await connector.placeOrder({
          symbol: request.symbol,
          side: request.side,
          type: 'limit',
          quantity: batchQuantity,
          price: request.priceLimit,
          slippageTolerance: request.slippageTolerance ?? this.config.defaultSlippageTolerance,
        });

        execution.orders.push(order);
        remainingQuantity -= order.filledQuantity;

        if (order.status === 'rejected' || order.status === 'expired') {
          break;
        }

        // Brief pause between iceberg slices
        if (remainingQuantity > 0) {
          await sleep(1000);
        }
      } catch {
        break;
      }
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private routeOrder(request: ExecutionRequest): RoutingDecision | null {
    const connectors = this.registry.getConnected();

    if (connectors.length === 0) {
      return null;
    }

    // Filter by preferred exchanges if specified
    let candidates = connectors;
    if (request.preferredExchanges && request.preferredExchanges.length > 0) {
      const preferred = connectors.filter(c =>
        request.preferredExchanges!.includes(c.config.exchangeId)
      );
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    // Simple routing: pick the first connected exchange (can be made more sophisticated)
    const selected = candidates[0];
    const alternatives: RoutingAlternative[] = candidates.slice(1).map(c => ({
      exchangeId: c.config.exchangeId,
      expectedPrice: 0,
      expectedSlippage: this.config.defaultSlippageTolerance,
      estimatedFees: 0.001,
    }));

    return {
      selectedExchangeId: selected.config.exchangeId,
      expectedPrice: request.priceLimit ?? 0,
      expectedSlippage: this.config.defaultSlippageTolerance,
      estimatedFees: 0.001,
      confidence: 0.9,
      alternatives,
    };
  }

  private aggregateExecutionResults(execution: ExecutionResult): void {
    if (execution.orders.length === 0) {
      return;
    }

    let totalFilled = 0;
    let weightedPriceSum = 0;
    let totalFees = 0;

    for (const order of execution.orders) {
      totalFilled += order.filledQuantity;
      if (order.averageFilledPrice && order.filledQuantity > 0) {
        weightedPriceSum += order.averageFilledPrice * order.filledQuantity;
      }
      totalFees += order.fees;
    }

    execution.filledQuantity = totalFilled;
    execution.averagePrice = totalFilled > 0 ? weightedPriceSum / totalFilled : 0;
    execution.totalFees = totalFees;

    // Calculate slippage vs price limit
    if (execution.request.priceLimit && execution.averagePrice > 0) {
      const expectedPrice = execution.request.priceLimit;
      execution.totalSlippage = execution.request.side === 'buy'
        ? Math.max(0, (execution.averagePrice - expectedPrice) / expectedPrice * 100)
        : Math.max(0, (expectedPrice - execution.averagePrice) / expectedPrice * 100);
    }
  }

  private getExchangeIdFromOrder(order: OrderResult): string {
    // Extract exchange ID from the exchange order ID prefix (e.g., "binance_12345" → "binance")
    return order.exchangeOrderId.split('_')[0] ?? order.exchangeOrderId;
  }

  private updateMetrics(execution: ExecutionResult): void {
    const previousTotal = this.metrics.totalExecutions - 1;
    this.metrics.averageSlippage =
      (this.metrics.averageSlippage * previousTotal + execution.totalSlippage) / this.metrics.totalExecutions;
    this.metrics.averageExecutionTimeMs =
      (this.metrics.averageExecutionTimeMs * previousTotal + execution.executionTimeMs) / this.metrics.totalExecutions;
    this.metrics.totalVolumeUSD +=
      execution.filledQuantity * (execution.averagePrice || 0);
    this.metrics.updatedAt = new Date();
  }
}

// ============================================================================
// Error Types
// ============================================================================

export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly executionId: string,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createExecutionEngine(
  registry: ConnectorRegistry,
  config?: Partial<ExecutionEngineConfig>,
  kycAmlManager?: KycAmlManager,
): DefaultExecutionEngine {
  return new DefaultExecutionEngine(registry, config, kycAmlManager);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

