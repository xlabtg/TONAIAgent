/**
 * TONAIAgent - Agent Execution Loop
 * Issue #212: Agent Execution Loop (Core Runtime Engine)
 *
 * Core execution loop that processes:
 * 1. Market Data -> 2. Strategy Signals -> 3. Risk Validation ->
 * 4. Trade Execution -> 5. Portfolio Update -> 6. Performance Metrics
 *
 * Each agent runs its own independent execution loop.
 */

import type {
  AgentConfig,
  AgentMetrics,
  AgentRuntimeState,
  AssetPrice,
  ExecutionCycleResult,
  ExecutionStep,
  MarketDataSnapshot,
  PortfolioUpdate,
  RiskCheck,
  RiskValidationResult,
  RuntimeEvent,
  RuntimeEventHandler,
  RuntimeUnsubscribe,
  TradeRecord,
  TradeSignal,
} from './types';
import { RuntimeError } from './types';

// ============================================================================
// Execution Loop Configuration
// ============================================================================

export interface ExecutionLoopConfig {
  /** Enable verbose logging */
  verbose: boolean;
  /** Maximum retries for market data fetch */
  maxMarketDataRetries: number;
  /** Timeout for strategy execution in ms */
  strategyTimeoutMs: number;
  /** Enable trade simulation mode */
  simulationMode: boolean;
}

export const DEFAULT_EXECUTION_LOOP_CONFIG: ExecutionLoopConfig = {
  verbose: false,
  maxMarketDataRetries: 3,
  strategyTimeoutMs: 5000,
  simulationMode: true,
};

// ============================================================================
// Market Data Provider Interface
// ============================================================================

export interface MarketDataProvider {
  getPrice(asset: string): Promise<AssetPrice | null>;
  getSnapshot(assets: string[]): Promise<MarketDataSnapshot>;
}

// ============================================================================
// Strategy Engine Interface
// ============================================================================

export interface StrategyExecutor {
  execute(
    strategyId: string,
    marketData: MarketDataSnapshot,
    params?: Record<string, unknown>
  ): Promise<TradeSignal>;
}

// ============================================================================
// Risk Validator Interface
// ============================================================================

export interface RiskValidator {
  validate(
    signal: TradeSignal,
    agentState: AgentRuntimeState
  ): Promise<RiskValidationResult>;
}

// ============================================================================
// Trade Executor Interface
// ============================================================================

export interface TradeExecutor {
  execute(
    signal: TradeSignal,
    agentState: AgentRuntimeState,
    simulationMode: boolean
  ): Promise<TradeRecord>;
}

// ============================================================================
// Default Implementations
// ============================================================================

/**
 * Default market data provider using simulated data.
 */
export class DefaultMarketDataProvider implements MarketDataProvider {
  private readonly basePrices: Record<string, number> = {
    TON: 5.25,
    USDT: 1.0,
    BTC: 65000,
    ETH: 3500,
  };

  async getPrice(asset: string): Promise<AssetPrice | null> {
    const basePrice = this.basePrices[asset];
    if (!basePrice) return null;

    // Add small random fluctuation
    const fluctuation = 1 + (Math.random() - 0.5) * 0.02; // +/- 1%
    const price = basePrice * fluctuation;

    return {
      asset,
      price,
      volume24h: 1_000_000 + Math.random() * 500_000,
      change24h: (Math.random() - 0.5) * 10,
      timestamp: new Date(),
    };
  }

  async getSnapshot(assets: string[]): Promise<MarketDataSnapshot> {
    const prices: Record<string, AssetPrice> = {};

    for (const asset of assets) {
      const price = await this.getPrice(asset);
      if (price) {
        prices[asset] = price;
      }
    }

    return {
      prices,
      source: 'simulation',
      fetchedAt: new Date(),
    };
  }
}

/**
 * Default strategy executor using simple momentum-like logic.
 */
export class DefaultStrategyExecutor implements StrategyExecutor {
  private readonly priceHistory: Record<string, number[]> = {};

  async execute(
    strategyId: string,
    marketData: MarketDataSnapshot,
    params?: Record<string, unknown>
  ): Promise<TradeSignal> {
    // Extract the primary asset from the first price
    const assets = Object.keys(marketData.prices);
    const primaryAsset = assets.find((a) => a !== 'USDT' && a !== 'USD') ?? assets[0];
    const currentPrice = marketData.prices[primaryAsset]?.price ?? 0;

    // Track price history
    if (!this.priceHistory[primaryAsset]) {
      this.priceHistory[primaryAsset] = [];
    }
    this.priceHistory[primaryAsset].push(currentPrice);

    // Keep only last 20 prices
    if (this.priceHistory[primaryAsset].length > 20) {
      this.priceHistory[primaryAsset].shift();
    }

    const history = this.priceHistory[primaryAsset];
    const avgPrice = history.reduce((a, b) => a + b, 0) / history.length;

    // Simple momentum strategy
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.5;
    let reason = 'Price within normal range';

    const deviation = (currentPrice - avgPrice) / avgPrice;

    if (deviation < -0.02 && history.length >= 5) {
      // Price is 2% below average - buy signal
      action = 'BUY';
      confidence = 0.6 + Math.abs(deviation) * 2;
      reason = `Price ${(deviation * 100).toFixed(2)}% below moving average - buy opportunity`;
    } else if (deviation > 0.02 && history.length >= 5) {
      // Price is 2% above average - sell signal
      action = 'SELL';
      confidence = 0.6 + Math.abs(deviation) * 2;
      reason = `Price ${(deviation * 100).toFixed(2)}% above moving average - take profit`;
    }

    // Cap confidence at 0.95
    confidence = Math.min(confidence, 0.95);

    // Calculate position size based on confidence
    const baseSize = (params?.['baseSize'] as number) ?? 100;
    const size = action === 'HOLD' ? 0 : baseSize * confidence;

    return {
      action,
      pair: `${primaryAsset}/USDT`,
      size,
      confidence,
      reason,
      strategyId,
      generatedAt: new Date(),
    };
  }
}

/**
 * Default risk validator.
 */
export class DefaultRiskValidator implements RiskValidator {
  async validate(
    signal: TradeSignal,
    agentState: AgentRuntimeState
  ): Promise<RiskValidationResult> {
    const checks: RiskCheck[] = [];
    const warnings: string[] = [];
    const rejectionReasons: string[] = [];
    const limits = agentState.config.riskLimits;

    // Position size check
    const positionValue = signal.size * (agentState.positions['USDT'] ?? 0) / 100;
    const maxPositionValue = agentState.portfolioValue * (limits.maxPositionSizePercent / 100);
    const positionSizeOk = signal.action === 'HOLD' || positionValue <= maxPositionValue;

    checks.push({
      name: 'position_size',
      passed: positionSizeOk,
      currentValue: positionValue,
      limitValue: maxPositionValue,
      message: positionSizeOk
        ? 'Position size within limits'
        : `Position size ${positionValue.toFixed(2)} exceeds max ${maxPositionValue.toFixed(2)}`,
    });

    if (!positionSizeOk) {
      rejectionReasons.push('Position size exceeds maximum allowed');
    }

    // Daily trade count check
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTrades = agentState.tradeHistory.filter(
      (t) => t.executedAt >= todayStart
    ).length;
    const tradeCountOk = todayTrades < limits.maxTradesPerDay;

    checks.push({
      name: 'daily_trade_count',
      passed: tradeCountOk,
      currentValue: todayTrades,
      limitValue: limits.maxTradesPerDay,
      message: tradeCountOk
        ? `${todayTrades}/${limits.maxTradesPerDay} trades today`
        : 'Daily trade limit reached',
    });

    if (!tradeCountOk && signal.action !== 'HOLD') {
      rejectionReasons.push('Daily trade limit reached');
    }

    // Exposure check
    const primaryAsset = signal.pair.split('/')[0];
    const currentExposure = ((agentState.positions[primaryAsset] ?? 0) / agentState.portfolioValue) * 100;
    const exposureOk = currentExposure <= limits.maxPortfolioExposurePercent;

    checks.push({
      name: 'portfolio_exposure',
      passed: exposureOk,
      currentValue: currentExposure,
      limitValue: limits.maxPortfolioExposurePercent,
      message: exposureOk
        ? `Exposure ${currentExposure.toFixed(2)}% within limit`
        : `Exposure ${currentExposure.toFixed(2)}% exceeds ${limits.maxPortfolioExposurePercent}%`,
    });

    if (!exposureOk && signal.action === 'BUY') {
      warnings.push('Portfolio exposure near maximum');
    }

    // Determine approval
    const approved = rejectionReasons.length === 0;

    // Adjust signal if needed (cap position size)
    let adjustedSignal: TradeSignal | undefined;
    if (approved && !positionSizeOk && signal.action !== 'HOLD') {
      adjustedSignal = {
        ...signal,
        size: (maxPositionValue / agentState.portfolioValue) * 100,
      };
    }

    return {
      approved,
      originalSignal: signal,
      adjustedSignal,
      checks,
      warnings,
      rejectionReasons,
    };
  }
}

/**
 * Default trade executor (simulation mode).
 */
export class DefaultTradeExecutor implements TradeExecutor {
  private tradeCounter = 0;

  async execute(
    signal: TradeSignal,
    agentState: AgentRuntimeState,
    simulationMode: boolean
  ): Promise<TradeRecord> {
    this.tradeCounter++;

    // Parse the trading pair
    const [baseAsset, quoteAsset] = signal.pair.split('/');

    // Calculate trade value (simplified)
    const price = 5.25; // Would come from market data in real implementation
    const value = signal.size * price;

    return {
      tradeId: `trade-${Date.now()}-${this.tradeCounter}`,
      agentId: agentState.agentId,
      action: signal.action,
      pair: signal.pair,
      size: signal.size,
      price,
      value,
      executedAt: new Date(),
      simulated: simulationMode,
      strategyId: signal.strategyId,
    };
  }
}

// ============================================================================
// Execution Loop
// ============================================================================

/**
 * ExecutionLoop - Core runtime loop for a single agent.
 *
 * Implements the execution cycle:
 * 1. Fetch Market Data
 * 2. Execute Strategy
 * 3. Validate Risk
 * 4. Execute Trade
 * 5. Update Portfolio
 * 6. Update Metrics
 *
 * @example
 * ```typescript
 * const loop = new ExecutionLoop({
 *   marketDataProvider: new DefaultMarketDataProvider(),
 *   strategyExecutor: new DefaultStrategyExecutor(),
 *   riskValidator: new DefaultRiskValidator(),
 *   tradeExecutor: new DefaultTradeExecutor(),
 * });
 *
 * const result = await loop.executeCycle(agentState);
 * console.log(result.success); // true
 * console.log(result.trade);   // { action: 'BUY', ... }
 * ```
 */
export class ExecutionLoop {
  private readonly config: ExecutionLoopConfig;
  private readonly marketDataProvider: MarketDataProvider;
  private readonly strategyExecutor: StrategyExecutor;
  private readonly riskValidator: RiskValidator;
  private readonly tradeExecutor: TradeExecutor;
  private readonly eventHandlers = new Set<RuntimeEventHandler>();

  constructor(options: {
    marketDataProvider?: MarketDataProvider;
    strategyExecutor?: StrategyExecutor;
    riskValidator?: RiskValidator;
    tradeExecutor?: TradeExecutor;
    config?: Partial<ExecutionLoopConfig>;
  } = {}) {
    this.config = { ...DEFAULT_EXECUTION_LOOP_CONFIG, ...options.config };
    this.marketDataProvider = options.marketDataProvider ?? new DefaultMarketDataProvider();
    this.strategyExecutor = options.strategyExecutor ?? new DefaultStrategyExecutor();
    this.riskValidator = options.riskValidator ?? new DefaultRiskValidator();
    this.tradeExecutor = options.tradeExecutor ?? new DefaultTradeExecutor();
  }

  /**
   * Execute a single cycle for an agent.
   */
  async executeCycle(agentState: AgentRuntimeState): Promise<ExecutionCycleResult> {
    const cycleId = `cycle-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const startedAt = new Date();
    const startTime = performance.now();

    let marketData: MarketDataSnapshot | null = null;
    let signal: TradeSignal | null = null;
    let riskValidation: RiskValidationResult | null = null;
    let trade: TradeRecord | null = null;
    let portfolioUpdate: PortfolioUpdate | null = null;
    let failedStep: ExecutionStep | undefined;
    let error: string | undefined;

    this.emitEvent('cycle.started', agentState.agentId, { cycleId });

    try {
      // Step 1: Fetch Market Data
      const assets = this.extractAssets(agentState.config.tradingPair);
      marketData = await this.fetchMarketData(assets);

      // Step 2: Execute Strategy
      signal = await this.executeStrategy(agentState, marketData);

      // Step 3: Skip further steps if HOLD
      if (signal.action === 'HOLD') {
        const completedAt = new Date();
        const durationMs = performance.now() - startTime;

        this.emitEvent('cycle.completed', agentState.agentId, {
          cycleId,
          action: 'HOLD',
          durationMs,
        });

        return {
          cycleId,
          agentId: agentState.agentId,
          success: true,
          startedAt,
          completedAt,
          durationMs,
          marketData,
          signal,
          riskValidation: null,
          trade: null,
          portfolioUpdate: null,
        };
      }

      // Step 3: Validate Risk
      riskValidation = await this.validateRisk(signal, agentState);

      if (!riskValidation.approved) {
        this.emitEvent('risk.rejected', agentState.agentId, {
          cycleId,
          signal,
          reasons: riskValidation.rejectionReasons,
        });

        const completedAt = new Date();
        const durationMs = performance.now() - startTime;

        return {
          cycleId,
          agentId: agentState.agentId,
          success: true, // Cycle succeeded, trade was just rejected
          startedAt,
          completedAt,
          durationMs,
          marketData,
          signal,
          riskValidation,
          trade: null,
          portfolioUpdate: null,
        };
      }

      // Use adjusted signal if available
      const finalSignal = riskValidation.adjustedSignal ?? signal;

      // Step 4: Execute Trade
      trade = await this.executeTrade(finalSignal, agentState);

      // Step 5: Update Portfolio
      portfolioUpdate = this.calculatePortfolioUpdate(agentState, trade, marketData);

      this.emitEvent('trade.executed', agentState.agentId, {
        cycleId,
        trade,
        portfolioUpdate,
      });

      const completedAt = new Date();
      const durationMs = performance.now() - startTime;

      this.emitEvent('cycle.completed', agentState.agentId, {
        cycleId,
        action: trade.action,
        durationMs,
        tradeValue: trade.value,
      });

      return {
        cycleId,
        agentId: agentState.agentId,
        success: true,
        startedAt,
        completedAt,
        durationMs,
        marketData,
        signal,
        riskValidation,
        trade,
        portfolioUpdate,
      };
    } catch (err) {
      const completedAt = new Date();
      const durationMs = performance.now() - startTime;
      error = err instanceof Error ? err.message : String(err);

      // Determine which step failed
      if (!marketData) {
        failedStep = 'fetch_market_data';
      } else if (!signal) {
        failedStep = 'execute_strategy';
      } else if (!riskValidation) {
        failedStep = 'validate_risk';
      } else if (!trade) {
        failedStep = 'execute_trade';
      } else {
        failedStep = 'update_portfolio';
      }

      this.emitEvent('cycle.failed', agentState.agentId, {
        cycleId,
        error,
        failedStep,
        durationMs,
      });

      return {
        cycleId,
        agentId: agentState.agentId,
        success: false,
        startedAt,
        completedAt,
        durationMs,
        marketData: marketData ?? {
          prices: {},
          source: 'error',
          fetchedAt: new Date(),
        },
        signal,
        riskValidation,
        trade,
        portfolioUpdate,
        error,
        failedStep,
      };
    }
  }

  /**
   * Subscribe to execution events.
   */
  subscribe(handler: RuntimeEventHandler): RuntimeUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private extractAssets(tradingPair: string): string[] {
    const parts = tradingPair.split('/');
    return [...new Set(parts)];
  }

  private async fetchMarketData(assets: string[]): Promise<MarketDataSnapshot> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxMarketDataRetries; attempt++) {
      try {
        return await this.marketDataProvider.getSnapshot(assets);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Brief delay before retry
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }

    throw new RuntimeError(
      `Failed to fetch market data after ${this.config.maxMarketDataRetries} attempts: ${lastError?.message}`,
      'MARKET_DATA_ERROR'
    );
  }

  private async executeStrategy(
    agentState: AgentRuntimeState,
    marketData: MarketDataSnapshot
  ): Promise<TradeSignal> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new RuntimeError('Strategy execution timeout', 'STRATEGY_ERROR')),
        this.config.strategyTimeoutMs
      );
    });

    const executePromise = this.strategyExecutor.execute(
      agentState.config.strategyId,
      marketData,
      agentState.config.strategyParams
    );

    return Promise.race([executePromise, timeoutPromise]);
  }

  private async validateRisk(
    signal: TradeSignal,
    agentState: AgentRuntimeState
  ): Promise<RiskValidationResult> {
    return this.riskValidator.validate(signal, agentState);
  }

  private async executeTrade(
    signal: TradeSignal,
    agentState: AgentRuntimeState
  ): Promise<TradeRecord> {
    return this.tradeExecutor.execute(
      signal,
      agentState,
      this.config.simulationMode
    );
  }

  private calculatePortfolioUpdate(
    agentState: AgentRuntimeState,
    trade: TradeRecord,
    marketData: MarketDataSnapshot
  ): PortfolioUpdate {
    const previousPositions = { ...agentState.positions };
    const newPositions = { ...agentState.positions };

    const [baseAsset, quoteAsset] = trade.pair.split('/');

    if (trade.action === 'BUY') {
      newPositions[baseAsset] = (newPositions[baseAsset] ?? 0) + trade.size;
      newPositions[quoteAsset] = (newPositions[quoteAsset] ?? 0) - trade.value;
    } else if (trade.action === 'SELL') {
      newPositions[baseAsset] = (newPositions[baseAsset] ?? 0) - trade.size;
      newPositions[quoteAsset] = (newPositions[quoteAsset] ?? 0) + trade.value;
    }

    // Calculate portfolio values
    let previousValue = 0;
    let newValue = 0;

    for (const [asset, amount] of Object.entries(previousPositions)) {
      const price = marketData.prices[asset]?.price ?? 1;
      previousValue += amount * price;
    }

    for (const [asset, amount] of Object.entries(newPositions)) {
      const price = marketData.prices[asset]?.price ?? 1;
      newValue += amount * price;
    }

    const realizedPnl = trade.pnl ?? 0;
    const unrealizedPnl = newValue - previousValue - realizedPnl;

    return {
      previousPositions,
      newPositions,
      previousValue,
      newValue,
      realizedPnl,
      unrealizedPnl,
    };
  }

  private emitEvent(
    type: RuntimeEvent['type'],
    agentId: string,
    data: Record<string, unknown>
  ): void {
    const event: RuntimeEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      timestamp: new Date(),
      agentId,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new ExecutionLoop instance.
 */
export function createExecutionLoop(options?: {
  marketDataProvider?: MarketDataProvider;
  strategyExecutor?: StrategyExecutor;
  riskValidator?: RiskValidator;
  tradeExecutor?: TradeExecutor;
  config?: Partial<ExecutionLoopConfig>;
}): ExecutionLoop {
  return new ExecutionLoop(options);
}
