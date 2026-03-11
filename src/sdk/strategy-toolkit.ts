/**
 * TONAIAgent - Strategy Development Toolkit
 *
 * Templates, example algorithms, risk configuration helpers, and execution
 * utilities for building strategies on the TON AI Agent platform.
 *
 * The toolkit provides:
 *   - Pre-built strategy templates (DCA, Grid, Momentum, Arbitrage, Yield)
 *   - Risk configuration helpers with sensible defaults
 *   - Execution utilities (moving averages, RSI, position sizing)
 *   - Agent definition builders for common patterns
 *
 * @example
 * ```typescript
 * import {
 *   StrategyDevelopmentToolkit,
 *   createStrategyToolkit,
 *   RiskConfigHelper,
 * } from '@tonaiagent/core/sdk';
 *
 * const toolkit = createStrategyToolkit();
 *
 * // Get a DCA strategy template
 * const dcaTemplate = toolkit.getTemplate('dca');
 * console.log('DCA template:', dcaTemplate.description);
 *
 * // Build a risk configuration
 * const risk = new RiskConfigHelper()
 *   .conservative()
 *   .withStopLoss(5)
 *   .withMaxDailyLoss(100)
 *   .build();
 *
 * // Use execution utilities
 * const prices = [1.0, 1.1, 1.05, 1.2, 1.15];
 * const ma = toolkit.utils.simpleMovingAverage(prices, 3);
 * const rsi = toolkit.utils.rsi(prices, 14);
 *
 * // Calculate position size
 * const size = toolkit.utils.positionSize({
 *   portfolioValue: 10000,
 *   riskPercent: 2,
 *   entryPrice: 2.5,
 *   stopLossPrice: 2.25,
 * });
 * ```
 */

import type {
  AgentDefinition,
  AgentStrategySpec,
  AgentRiskRules,
  AgentConfiguration,
  AgentEventHandlers,
  AgentExecutionContext,
} from './agent-framework';

// ============================================================================
// Strategy Templates
// ============================================================================

/** A strategy template for rapid development */
export interface StrategyTemplate {
  /** Template identifier */
  id: string;

  /** Template name */
  name: string;

  /** Detailed description */
  description: string;

  /** Strategy type this template implements */
  type: string;

  /** Pre-configured strategy specification */
  strategy: AgentStrategySpec;

  /** Recommended risk rules */
  recommendedRiskRules: AgentRiskRules;

  /** Recommended configuration */
  recommendedConfiguration: AgentConfiguration;

  /** Example usage as code string */
  example: string;

  /** Complexity level */
  complexity: 'beginner' | 'intermediate' | 'advanced';

  /** Tags */
  tags: string[];
}

// ============================================================================
// Risk Configuration Helper
// ============================================================================

/**
 * Fluent builder for agent risk configurations.
 *
 * @example
 * ```typescript
 * const risk = new RiskConfigHelper()
 *   .conservative()
 *   .withStopLoss(5)
 *   .withMaxDailyLoss(200)
 *   .build();
 * ```
 */
export class RiskConfigHelper {
  private config: AgentRiskRules = {};

  /** Apply conservative preset (small positions, tight stops) */
  conservative(): this {
    this.config = {
      maxPositionSize: 500,
      maxDailyLoss: 50,
      stopLossPercent: 3,
      takeProfitPercent: 6,
      maxExposurePercent: 30,
      circuitBreaker: { enabled: true, maxConsecutiveFailures: 3 },
    };
    return this;
  }

  /** Apply moderate preset (balanced risk/reward) */
  moderate(): this {
    this.config = {
      maxPositionSize: 2000,
      maxDailyLoss: 200,
      stopLossPercent: 7,
      takeProfitPercent: 15,
      maxExposurePercent: 60,
      circuitBreaker: { enabled: true, maxConsecutiveFailures: 5 },
    };
    return this;
  }

  /** Apply aggressive preset (large positions, wide stops) */
  aggressive(): this {
    this.config = {
      maxPositionSize: 10000,
      maxDailyLoss: 1000,
      stopLossPercent: 15,
      takeProfitPercent: 30,
      maxExposurePercent: 90,
      circuitBreaker: { enabled: true, maxConsecutiveFailures: 10 },
    };
    return this;
  }

  /** Set maximum position size */
  withMaxPositionSize(size: number): this {
    this.config.maxPositionSize = size;
    return this;
  }

  /** Set maximum daily loss */
  withMaxDailyLoss(loss: number): this {
    this.config.maxDailyLoss = loss;
    return this;
  }

  /** Set stop-loss percentage */
  withStopLoss(percent: number): this {
    this.config.stopLossPercent = percent;
    return this;
  }

  /** Set take-profit percentage */
  withTakeProfit(percent: number): this {
    this.config.takeProfitPercent = percent;
    return this;
  }

  /** Set maximum exposure percentage */
  withMaxExposure(percent: number): this {
    this.config.maxExposurePercent = percent;
    return this;
  }

  /** Enable/configure circuit breaker */
  withCircuitBreaker(maxConsecutiveFailures: number): this {
    this.config.circuitBreaker = { enabled: true, maxConsecutiveFailures };
    return this;
  }

  /** Add custom risk rule */
  withCustomRule(key: string, value: unknown): this {
    this.config.custom = { ...this.config.custom, [key]: value };
    return this;
  }

  /** Build the final risk rules object */
  build(): AgentRiskRules {
    return { ...this.config };
  }
}

// ============================================================================
// Execution Utilities
// ============================================================================

/** Position sizing parameters */
export interface PositionSizeParams {
  /** Total portfolio value */
  portfolioValue: number;

  /** Percentage of portfolio to risk on this trade */
  riskPercent: number;

  /** Entry price */
  entryPrice: number;

  /** Stop-loss price */
  stopLossPrice: number;
}

/** Technical indicator utilities for strategy logic */
export interface ExecutionUtils {
  /**
   * Calculate Simple Moving Average.
   * Returns the average of the last `period` values.
   */
  simpleMovingAverage(prices: number[], period: number): number;

  /**
   * Calculate Exponential Moving Average.
   * Gives more weight to recent prices.
   */
  exponentialMovingAverage(prices: number[], period: number): number;

  /**
   * Calculate Relative Strength Index (RSI).
   * Returns a value between 0–100. >70 = overbought, <30 = oversold.
   */
  rsi(prices: number[], period?: number): number;

  /**
   * Calculate Bollinger Bands.
   * Returns upper, middle, and lower bands.
   */
  bollingerBands(prices: number[], period?: number, stdDevMultiplier?: number): BollingerBands;

  /**
   * Calculate MACD (Moving Average Convergence Divergence).
   */
  macd(prices: number[], fastPeriod?: number, slowPeriod?: number, signalPeriod?: number): MACDResult;

  /**
   * Calculate optimal position size using the risk-based method.
   * Position size = (Portfolio * riskPercent) / (entryPrice - stopLoss)
   */
  positionSize(params: PositionSizeParams): number;

  /**
   * Determine if prices show an upward crossover (fast crosses above slow).
   */
  isCrossover(fast: number[], slow: number[]): boolean;

  /**
   * Determine if prices show a downward crossunder (fast crosses below slow).
   */
  isCrossunder(fast: number[], slow: number[]): boolean;

  /**
   * Calculate percentage change between two values.
   */
  percentChange(from: number, to: number): number;

  /**
   * Clamp a value between min and max.
   */
  clamp(value: number, min: number, max: number): number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

/** Default implementation of execution utilities */
const executionUtils: ExecutionUtils = {
  simpleMovingAverage(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] ?? 0;
    const slice = prices.slice(-period);
    return slice.reduce((sum, p) => sum + p, 0) / period;
  },

  exponentialMovingAverage(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
  },

  rsi(prices: number[], period = 14): number {
    if (prices.length < period + 1) return 50;

    const changes = prices.slice(1).map((p, i) => p - prices[i]);
    const recent = changes.slice(-period);

    const gains = recent.filter(c => c > 0);
    const losses = recent.filter(c => c < 0).map(c => Math.abs(c));

    const avgGain = gains.length > 0 ? gains.reduce((sum, g) => sum + g, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, l) => sum + l, 0) / period : 0;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  },

  bollingerBands(prices: number[], period = 20, stdDevMultiplier = 2): BollingerBands {
    const middle = executionUtils.simpleMovingAverage(prices, period);
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const upper = middle + stdDevMultiplier * stdDev;
    const lower = middle - stdDevMultiplier * stdDev;
    return {
      upper,
      middle,
      lower,
      bandwidth: middle > 0 ? (upper - lower) / middle : 0,
    };
  },

  macd(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MACDResult {
    const fast = executionUtils.exponentialMovingAverage(prices, fastPeriod);
    const slow = executionUtils.exponentialMovingAverage(prices, slowPeriod);
    const macd = fast - slow;

    // Simplified signal (EMA of MACD over last signalPeriod points)
    const macdValues = [];
    for (let i = signalPeriod; i >= 1; i--) {
      const slice = prices.slice(0, prices.length - i + 1);
      const f = executionUtils.exponentialMovingAverage(slice, fastPeriod);
      const s = executionUtils.exponentialMovingAverage(slice, slowPeriod);
      macdValues.push(f - s);
    }
    macdValues.push(macd);

    const signal = executionUtils.exponentialMovingAverage(macdValues, signalPeriod);
    return { macd, signal, histogram: macd - signal };
  },

  positionSize(params: PositionSizeParams): number {
    const { portfolioValue, riskPercent, entryPrice, stopLossPrice } = params;
    const riskAmount = portfolioValue * (riskPercent / 100);
    const riskPerUnit = Math.abs(entryPrice - stopLossPrice);
    if (riskPerUnit === 0) return 0;
    return riskAmount / riskPerUnit;
  },

  isCrossover(fast: number[], slow: number[]): boolean {
    if (fast.length < 2 || slow.length < 2) return false;
    const prevFast = fast[fast.length - 2];
    const currFast = fast[fast.length - 1];
    const prevSlow = slow[slow.length - 2];
    const currSlow = slow[slow.length - 1];
    return prevFast <= prevSlow && currFast > currSlow;
  },

  isCrossunder(fast: number[], slow: number[]): boolean {
    if (fast.length < 2 || slow.length < 2) return false;
    const prevFast = fast[fast.length - 2];
    const currFast = fast[fast.length - 1];
    const prevSlow = slow[slow.length - 2];
    const currSlow = slow[slow.length - 1];
    return prevFast >= prevSlow && currFast < currSlow;
  },

  percentChange(from: number, to: number): number {
    if (from === 0) return 0;
    return ((to - from) / from) * 100;
  },

  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  },
};

// ============================================================================
// Example Algorithms
// ============================================================================

/** Pre-built example execution logic functions */
export const ExampleAlgorithms = {
  /**
   * Dollar-Cost Averaging (DCA) algorithm.
   * Buys a fixed amount of an asset at each execution.
   */
  dca(asset: string, amountPerExecution: number): (context: AgentExecutionContext) => Promise<void> {
    return async (context) => {
      context.logger.info(`DCA: Buying ${amountPerExecution} worth of ${asset}`);
      const portfolio = await context.getPortfolio();
      if (portfolio.availableBalance < amountPerExecution) {
        context.logger.warn(`DCA: Insufficient balance (${portfolio.availableBalance}), skipping`);
        return;
      }
      const marketData = await context.getMarketData(asset);
      const amount = amountPerExecution / marketData.current;
      await context.placeOrder({ asset, side: 'buy', amount, type: 'market' });
      context.logger.info(`DCA: Placed buy order for ${amount.toFixed(4)} ${asset} at ${marketData.current}`);
    };
  },

  /**
   * Momentum strategy.
   * Buys when RSI < oversoldThreshold, sells when RSI > overboughtThreshold.
   */
  momentum(
    asset: string,
    oversoldThreshold = 30,
    overboughtThreshold = 70,
    positionPercent = 10
  ): (context: AgentExecutionContext) => Promise<void> {
    return async (context) => {
      const marketData = await context.getMarketData(asset);
      const portfolio = await context.getPortfolio();

      if (!marketData.rsi14) {
        context.logger.warn('Momentum: RSI not available, skipping');
        return;
      }

      const rsi = marketData.rsi14;
      const existingPosition = portfolio.positions.find(p => p.asset === asset);

      if (rsi < oversoldThreshold && !existingPosition) {
        const amount = (portfolio.availableBalance * positionPercent / 100) / marketData.current;
        context.logger.info(`Momentum: RSI ${rsi.toFixed(1)} < ${oversoldThreshold} — buying ${asset}`);
        await context.placeOrder({ asset, side: 'buy', amount, type: 'market' });
      } else if (rsi > overboughtThreshold && existingPosition) {
        context.logger.info(`Momentum: RSI ${rsi.toFixed(1)} > ${overboughtThreshold} — selling ${asset}`);
        await context.placeOrder({ asset, side: 'sell', amount: existingPosition.amount, type: 'market' });
      } else {
        context.logger.debug(`Momentum: RSI ${rsi.toFixed(1)} — holding`);
      }
    };
  },

  /**
   * Moving Average Crossover strategy.
   * Buys when fast MA crosses above slow MA, sells when it crosses below.
   */
  maCrossover(
    asset: string,
    fastPeriod = 10,
    slowPeriod = 20,
    positionPercent = 20
  ): (context: AgentExecutionContext) => Promise<void> {
    const priceHistory: number[] = [];

    return async (context) => {
      const marketData = await context.getMarketData(asset);
      priceHistory.push(marketData.current);

      // Keep only enough history
      if (priceHistory.length > slowPeriod + 5) {
        priceHistory.shift();
      }

      if (priceHistory.length < slowPeriod + 2) {
        context.logger.debug(`MA Crossover: Building history (${priceHistory.length}/${slowPeriod + 2})`);
        return;
      }

      const fastMAs = priceHistory.map((_, i) =>
        i >= fastPeriod - 1
          ? executionUtils.simpleMovingAverage(priceHistory.slice(0, i + 1), fastPeriod)
          : 0
      ).filter(v => v > 0);

      const slowMAs = priceHistory.map((_, i) =>
        i >= slowPeriod - 1
          ? executionUtils.simpleMovingAverage(priceHistory.slice(0, i + 1), slowPeriod)
          : 0
      ).filter(v => v > 0);

      const portfolio = await context.getPortfolio();
      const existingPosition = portfolio.positions.find(p => p.asset === asset);

      if (executionUtils.isCrossover(fastMAs, slowMAs) && !existingPosition) {
        const amount = (portfolio.availableBalance * positionPercent / 100) / marketData.current;
        context.logger.info(`MA Crossover: Fast MA crossed above slow MA — buying ${asset}`);
        await context.placeOrder({ asset, side: 'buy', amount, type: 'market' });
      } else if (executionUtils.isCrossunder(fastMAs, slowMAs) && existingPosition) {
        context.logger.info(`MA Crossover: Fast MA crossed below slow MA — selling ${asset}`);
        await context.placeOrder({ asset, side: 'sell', amount: existingPosition.amount, type: 'market' });
      }
    };
  },
};

// ============================================================================
// Strategy Development Toolkit
// ============================================================================

/** Built-in strategy templates */
const BUILT_IN_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'dca-basic',
    name: 'Basic DCA',
    description: 'Dollar-cost average into TON at regular intervals. Safe, beginner-friendly strategy that reduces timing risk.',
    type: 'dca',
    strategy: {
      type: 'dca',
      parameters: { asset: 'TON', amountPerExecution: 50, currency: 'USDT' },
      intervalMs: 24 * 60 * 60 * 1000, // daily
    },
    recommendedRiskRules: new RiskConfigHelper().conservative().build(),
    recommendedConfiguration: { environment: 'sandbox', simulationMode: true, initialCapital: 1000 },
    example: `
const agent = framework.defineAgent({
  id: 'my-dca-agent',
  name: 'Daily TON DCA',
  version: '1.0.0',
  strategy: { type: 'dca', parameters: { asset: 'TON', amountPerExecution: 50 } },
  risk_rules: toolkit.buildRiskRules().conservative().withMaxDailyLoss(100).build(),
  execution_logic: ExampleAlgorithms.dca('TON', 50),
  configuration: { environment: 'sandbox', simulationMode: true },
  event_handlers: {},
});`.trim(),
    complexity: 'beginner',
    tags: ['dca', 'ton', 'beginner', 'safe'],
  },
  {
    id: 'momentum-rsi',
    name: 'RSI Momentum',
    description: 'Buy when RSI indicates oversold conditions (<30), sell when overbought (>70). Classic momentum strategy.',
    type: 'momentum',
    strategy: {
      type: 'momentum',
      parameters: { asset: 'TON', oversoldThreshold: 30, overboughtThreshold: 70, positionPercent: 10 },
      entryConditions: [{ id: 'rsi-oversold', type: 'indicator', operator: 'lt', value: 30 }],
      exitConditions: [{ id: 'rsi-overbought', type: 'indicator', operator: 'gt', value: 70 }],
    },
    recommendedRiskRules: new RiskConfigHelper().moderate().withStopLoss(7).build(),
    recommendedConfiguration: { environment: 'sandbox', simulationMode: true, initialCapital: 5000 },
    example: `
const agent = framework.defineAgent({
  id: 'rsi-momentum',
  name: 'RSI Momentum Agent',
  version: '1.0.0',
  strategy: { type: 'momentum', parameters: { asset: 'TON' } },
  risk_rules: toolkit.buildRiskRules().moderate().build(),
  execution_logic: ExampleAlgorithms.momentum('TON', 30, 70, 10),
  configuration: { environment: 'sandbox', simulationMode: true },
  event_handlers: { onError: (err) => console.error(err) },
});`.trim(),
    complexity: 'intermediate',
    tags: ['momentum', 'rsi', 'ton', 'intermediate'],
  },
  {
    id: 'ma-crossover',
    name: 'Moving Average Crossover',
    description: 'Buy when fast MA (10) crosses above slow MA (20), sell on crossunder. Classic trend-following strategy.',
    type: 'momentum',
    strategy: {
      type: 'momentum',
      parameters: { asset: 'TON', fastPeriod: 10, slowPeriod: 20, positionPercent: 20 },
    },
    recommendedRiskRules: new RiskConfigHelper().moderate().withStopLoss(10).build(),
    recommendedConfiguration: { environment: 'sandbox', simulationMode: true, initialCapital: 5000 },
    example: `
const agent = framework.defineAgent({
  id: 'ma-crossover',
  name: 'MA Crossover Agent',
  version: '1.0.0',
  strategy: { type: 'momentum', parameters: { fastPeriod: 10, slowPeriod: 20 } },
  risk_rules: toolkit.buildRiskRules().moderate().build(),
  execution_logic: ExampleAlgorithms.maCrossover('TON', 10, 20, 20),
  configuration: { environment: 'sandbox', simulationMode: true },
  event_handlers: {},
});`.trim(),
    complexity: 'intermediate',
    tags: ['moving-average', 'trend', 'ton', 'intermediate'],
  },
  {
    id: 'yield-optimizer',
    name: 'Yield Optimizer',
    description: 'Allocate capital to the highest-yielding TON DeFi protocols. Rebalances weekly.',
    type: 'yield',
    strategy: {
      type: 'yield',
      parameters: { assets: ['TON', 'USDT'], minYieldPercent: 5, rebalanceThresholdPercent: 2 },
      intervalMs: 7 * 24 * 60 * 60 * 1000, // weekly
    },
    recommendedRiskRules: new RiskConfigHelper().conservative().withMaxExposure(80).build(),
    recommendedConfiguration: { environment: 'sandbox', simulationMode: true, initialCapital: 10000 },
    example: `
const agent = framework.defineAgent({
  id: 'yield-optimizer',
  name: 'Yield Optimizer',
  version: '1.0.0',
  strategy: { type: 'yield', parameters: { assets: ['TON', 'USDT'], minYieldPercent: 5 } },
  risk_rules: toolkit.buildRiskRules().conservative().build(),
  execution_logic: async (ctx) => {
    const portfolio = await ctx.getPortfolio();
    // Allocate to highest-yield pool
    await ctx.allocateCapital({ asset: 'TON', amount: portfolio.availableBalance * 0.5, mode: 'fixed' });
  },
  configuration: { environment: 'sandbox', simulationMode: true },
  event_handlers: {},
});`.trim(),
    complexity: 'advanced',
    tags: ['yield', 'defi', 'ton', 'advanced'],
  },
];

/**
 * Strategy Development Toolkit
 *
 * The complete developer toolkit for building trading strategies.
 * Access templates, utilities, and builders in one place.
 */
export class StrategyDevelopmentToolkit {
  /** Technical analysis and execution utilities */
  readonly utils: ExecutionUtils = executionUtils;

  /** Pre-built example algorithms */
  readonly examples = ExampleAlgorithms;

  /**
   * Get a strategy template by ID.
   */
  getTemplate(id: string): StrategyTemplate | undefined {
    return BUILT_IN_TEMPLATES.find(t => t.id === id);
  }

  /**
   * List all available templates, optionally filtered by type or complexity.
   */
  listTemplates(filter?: { type?: string; complexity?: StrategyTemplate['complexity'] }): StrategyTemplate[] {
    let templates = [...BUILT_IN_TEMPLATES];
    if (filter?.type) {
      templates = templates.filter(t => t.type === filter.type);
    }
    if (filter?.complexity) {
      templates = templates.filter(t => t.complexity === filter.complexity);
    }
    return templates;
  }

  /**
   * Create a fluent risk configuration builder.
   *
   * @example
   * ```typescript
   * const risk = toolkit.buildRiskRules()
   *   .conservative()
   *   .withStopLoss(5)
   *   .build();
   * ```
   */
  buildRiskRules(): RiskConfigHelper {
    return new RiskConfigHelper();
  }

  /**
   * Create a complete agent definition from a template with overrides.
   *
   * @example
   * ```typescript
   * const agent = toolkit.fromTemplate('dca-basic', {
   *   id: 'my-dca',
   *   name: 'My DCA Bot',
   *   version: '1.0.0',
   *   execution_logic: ExampleAlgorithms.dca('TON', 100),
   *   event_handlers: {},
   * });
   * ```
   */
  fromTemplate(
    templateId: string,
    overrides: Partial<AgentDefinition> & Pick<AgentDefinition, 'id' | 'name' | 'version' | 'execution_logic' | 'event_handlers'>
  ): AgentDefinition {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found. Available: ${BUILT_IN_TEMPLATES.map(t => t.id).join(', ')}`);
    }

    return {
      id: overrides.id,
      name: overrides.name,
      description: overrides.description ?? template.description,
      version: overrides.version,
      strategy: overrides.strategy ?? template.strategy,
      risk_rules: overrides.risk_rules ?? template.recommendedRiskRules,
      execution_logic: overrides.execution_logic,
      configuration: overrides.configuration ?? template.recommendedConfiguration,
      event_handlers: overrides.event_handlers,
      tags: overrides.tags ?? template.tags,
      metadata: overrides.metadata,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Strategy Development Toolkit instance.
 *
 * @example
 * ```typescript
 * import { createStrategyToolkit } from '@tonaiagent/core/sdk';
 *
 * const toolkit = createStrategyToolkit();
 * const template = toolkit.getTemplate('dca-basic');
 * ```
 */
export function createStrategyToolkit(): StrategyDevelopmentToolkit {
  return new StrategyDevelopmentToolkit();
}
