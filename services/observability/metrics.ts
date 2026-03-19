/**
 * TONAIAgent - Metrics Collection System
 *
 * Tracks trading, agent, marketplace, and system metrics.
 * Implements Issue #275: Observability, Monitoring & Production Readiness
 *
 * Metric categories:
 *   Trading  — total trades, success/fail rate, avg execution time, slippage avg
 *   Agents   — active/stopped agents, avg confidenceScore
 *   Marketplace — active subscriptions, top strategies, revenue per strategy
 *   System   — API latency, errors/sec, memory usage
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A single counter that only increments.
 */
export interface Counter {
  /** Current value */
  readonly value: number;
  /** Increment by `amount` (default 1) */
  increment(amount?: number): void;
  /** Reset to zero */
  reset(): void;
}

/**
 * A gauge that can be set to any numeric value.
 */
export interface Gauge {
  /** Current value */
  readonly value: number;
  /** Set to an absolute value */
  set(value: number): void;
  /** Increment (default 1) */
  increment(amount?: number): void;
  /** Decrement (default 1) */
  decrement(amount?: number): void;
}

/**
 * A histogram that tracks a distribution of values.
 */
export interface Histogram {
  /** All observed values */
  readonly values: readonly number[];
  /** Number of observations */
  readonly count: number;
  /** Sum of all observations */
  readonly sum: number;
  /** Arithmetic mean */
  readonly mean: number;
  /** Minimum value observed */
  readonly min: number;
  /** Maximum value observed */
  readonly max: number;
  /** Record an observation */
  observe(value: number): void;
  /** Reset all observations */
  reset(): void;
}

// ============================================================================
// Metric implementations
// ============================================================================

export class SimpleCounter implements Counter {
  private _value = 0;

  get value(): number {
    return this._value;
  }

  increment(amount = 1): void {
    this._value += amount;
  }

  reset(): void {
    this._value = 0;
  }
}

export class SimpleGauge implements Gauge {
  private _value: number;

  constructor(initialValue = 0) {
    this._value = initialValue;
  }

  get value(): number {
    return this._value;
  }

  set(value: number): void {
    this._value = value;
  }

  increment(amount = 1): void {
    this._value += amount;
  }

  decrement(amount = 1): void {
    this._value -= amount;
  }
}

export class SimpleHistogram implements Histogram {
  private _values: number[] = [];

  get values(): readonly number[] {
    return this._values;
  }

  get count(): number {
    return this._values.length;
  }

  get sum(): number {
    return this._values.reduce((a, b) => a + b, 0);
  }

  get mean(): number {
    if (this._values.length === 0) return 0;
    return this.sum / this._values.length;
  }

  get min(): number {
    if (this._values.length === 0) return 0;
    return Math.min(...this._values);
  }

  get max(): number {
    if (this._values.length === 0) return 0;
    return Math.max(...this._values);
  }

  observe(value: number): void {
    this._values.push(value);
  }

  reset(): void {
    this._values = [];
  }
}

// ============================================================================
// Trading Metrics
// ============================================================================

/**
 * Aggregated trading metrics snapshot.
 */
export interface TradingMetrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  successRate: number;
  avgExecutionTimeMs: number;
  avgSlippageBps: number;
}

/**
 * Tracks trading-related metrics.
 */
export class TradingMetricsCollector {
  readonly totalTrades = new SimpleCounter();
  readonly successfulTrades = new SimpleCounter();
  readonly failedTrades = new SimpleCounter();
  readonly executionTimeMs = new SimpleHistogram();
  readonly slippageBps = new SimpleHistogram();

  /** Record a successful trade */
  recordSuccess(executionTimeMs: number, slippageBps: number): void {
    this.totalTrades.increment();
    this.successfulTrades.increment();
    this.executionTimeMs.observe(executionTimeMs);
    this.slippageBps.observe(slippageBps);
  }

  /** Record a failed trade */
  recordFailure(executionTimeMs: number): void {
    this.totalTrades.increment();
    this.failedTrades.increment();
    this.executionTimeMs.observe(executionTimeMs);
  }

  /** Get snapshot */
  snapshot(): TradingMetrics {
    const total = this.totalTrades.value;
    return {
      totalTrades: total,
      successfulTrades: this.successfulTrades.value,
      failedTrades: this.failedTrades.value,
      successRate: total > 0 ? (this.successfulTrades.value / total) * 100 : 0,
      avgExecutionTimeMs: this.executionTimeMs.mean,
      avgSlippageBps: this.slippageBps.mean,
    };
  }

  reset(): void {
    this.totalTrades.reset();
    this.successfulTrades.reset();
    this.failedTrades.reset();
    this.executionTimeMs.reset();
    this.slippageBps.reset();
  }
}

// ============================================================================
// Agent Metrics
// ============================================================================

/**
 * Aggregated agent metrics snapshot.
 */
export interface AgentSystemMetrics {
  activeAgents: number;
  stoppedAgents: number;
  totalAgents: number;
  avgConfidenceScore: number;
}

/**
 * Tracks agent-level system metrics.
 */
export class AgentMetricsCollector {
  readonly activeAgents = new SimpleGauge();
  readonly stoppedAgents = new SimpleGauge();
  readonly confidenceScores = new SimpleHistogram();

  /** Record a confidence score observation */
  recordConfidenceScore(score: number): void {
    this.confidenceScores.observe(score);
  }

  snapshot(): AgentSystemMetrics {
    return {
      activeAgents: this.activeAgents.value,
      stoppedAgents: this.stoppedAgents.value,
      totalAgents: this.activeAgents.value + this.stoppedAgents.value,
      avgConfidenceScore: this.confidenceScores.mean,
    };
  }

  reset(): void {
    this.activeAgents.set(0);
    this.stoppedAgents.set(0);
    this.confidenceScores.reset();
  }
}

// ============================================================================
// Marketplace Metrics
// ============================================================================

/**
 * Aggregated marketplace metrics snapshot.
 */
export interface MarketplaceSystemMetrics {
  activeSubscriptions: number;
  topStrategies: Array<{ strategyId: string; subscriptions: number }>;
  revenuePerStrategy: Record<string, number>;
  totalRevenue: number;
}

/**
 * Tracks marketplace metrics.
 */
export class MarketplaceMetricsCollector {
  readonly activeSubscriptions = new SimpleGauge();
  private readonly strategySubscriptions = new Map<string, number>();
  private readonly strategyRevenue = new Map<string, number>();

  /** Record a new subscription */
  recordSubscription(strategyId: string): void {
    this.activeSubscriptions.increment();
    this.strategySubscriptions.set(
      strategyId,
      (this.strategySubscriptions.get(strategyId) ?? 0) + 1
    );
  }

  /** Record a subscription cancellation */
  recordUnsubscription(strategyId: string): void {
    this.activeSubscriptions.decrement();
    const current = this.strategySubscriptions.get(strategyId) ?? 0;
    this.strategySubscriptions.set(strategyId, Math.max(0, current - 1));
  }

  /** Record revenue for a strategy */
  recordRevenue(strategyId: string, amount: number): void {
    this.strategyRevenue.set(
      strategyId,
      (this.strategyRevenue.get(strategyId) ?? 0) + amount
    );
  }

  snapshot(): MarketplaceSystemMetrics {
    const sorted = Array.from(this.strategySubscriptions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([strategyId, subscriptions]) => ({ strategyId, subscriptions }));

    const revenuePerStrategy: Record<string, number> = {};
    let totalRevenue = 0;
    for (const [strategyId, revenue] of this.strategyRevenue) {
      revenuePerStrategy[strategyId] = revenue;
      totalRevenue += revenue;
    }

    return {
      activeSubscriptions: this.activeSubscriptions.value,
      topStrategies: sorted,
      revenuePerStrategy,
      totalRevenue,
    };
  }

  reset(): void {
    this.activeSubscriptions.set(0);
    this.strategySubscriptions.clear();
    this.strategyRevenue.clear();
  }
}

// ============================================================================
// System Metrics
// ============================================================================

/**
 * Aggregated system metrics snapshot.
 */
export interface SystemMetrics {
  avgApiLatencyMs: number;
  errorsPerSec: number;
  memoryUsageBytes: number;
  uptimeMs: number;
}

/**
 * Tracks system-level metrics.
 */
export class SystemMetricsCollector {
  readonly apiLatencyMs = new SimpleHistogram();
  private readonly errorTimestamps: number[] = [];
  private readonly startedAt = Date.now();
  private _memoryUsageBytes = 0;

  /** Record an API call latency */
  recordApiLatency(latencyMs: number): void {
    this.apiLatencyMs.observe(latencyMs);
  }

  /** Record an error occurrence */
  recordError(): void {
    this.errorTimestamps.push(Date.now());
    // Keep only last 60 seconds of timestamps
    const cutoff = Date.now() - 60_000;
    while (this.errorTimestamps.length > 0 && (this.errorTimestamps[0] ?? 0) < cutoff) {
      this.errorTimestamps.shift();
    }
  }

  /** Update memory usage (bytes) */
  setMemoryUsage(bytes: number): void {
    this._memoryUsageBytes = bytes;
  }

  /** Capture current Node.js process memory (if available) */
  captureProcessMemory(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this._memoryUsageBytes = process.memoryUsage().heapUsed;
    }
  }

  snapshot(): SystemMetrics {
    const windowMs = 1_000; // 1 second window
    const now = Date.now();
    const recentErrors = this.errorTimestamps.filter((t) => t > now - windowMs).length;
    return {
      avgApiLatencyMs: this.apiLatencyMs.mean,
      errorsPerSec: recentErrors,
      memoryUsageBytes: this._memoryUsageBytes,
      uptimeMs: Date.now() - this.startedAt,
    };
  }

  reset(): void {
    this.apiLatencyMs.reset();
    this.errorTimestamps.length = 0;
    this._memoryUsageBytes = 0;
  }
}

// ============================================================================
// Unified MetricsCollector
// ============================================================================

/**
 * Aggregated snapshot of all metric categories.
 */
export interface AllMetrics {
  trading: TradingMetrics;
  agents: AgentSystemMetrics;
  marketplace: MarketplaceSystemMetrics;
  system: SystemMetrics;
  collectedAt: string;
}

/**
 * Unified metrics collector that aggregates all sub-collectors.
 *
 * @example
 * ```typescript
 * const metrics = createMetricsCollector();
 *
 * metrics.trading.recordSuccess(120, 5);
 * metrics.agents.activeAgents.set(12);
 * metrics.marketplace.recordSubscription('dca_strategy');
 * metrics.system.recordApiLatency(45);
 *
 * const snapshot = metrics.snapshot();
 * console.log(snapshot);
 * ```
 */
export class MetricsCollector {
  readonly trading = new TradingMetricsCollector();
  readonly agents = new AgentMetricsCollector();
  readonly marketplace = new MarketplaceMetricsCollector();
  readonly system = new SystemMetricsCollector();

  /** Collect a complete snapshot from all sub-collectors */
  snapshot(): AllMetrics {
    return {
      trading: this.trading.snapshot(),
      agents: this.agents.snapshot(),
      marketplace: this.marketplace.snapshot(),
      system: this.system.snapshot(),
      collectedAt: new Date().toISOString(),
    };
  }

  /** Reset all sub-collectors */
  reset(): void {
    this.trading.reset();
    this.agents.reset();
    this.marketplace.reset();
    this.system.reset();
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new MetricsCollector instance.
 */
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}
