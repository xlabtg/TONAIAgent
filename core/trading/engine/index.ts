/**
 * TONAIAgent - Trading Engine v1 (Simulation Layer)
 *
 * Execution layer that receives TradeSignal objects from the Strategy Engine,
 * simulates buy/sell trades at the current market price, tracks per-agent
 * portfolio balances, records trade history, and calculates PnL.
 *
 * Architecture:
 * ```
 *   Strategy Engine
 *         |
 *   Trading Engine          ← this module
 *         |
 *    ┌────┴─────┐
 *    |          |
 * Portfolio   Trade
 * Manager   Executor (Simulation)
 *    |
 * Trade History Repository
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   createTradingEngine,
 * } from '@tonaiagent/core/trading-engine';
 *
 * // 1. Create and start the engine
 * const engine = createTradingEngine();
 * engine.start();
 *
 * // 2. Initialize an agent's portfolio
 * engine.initPortfolio('agent-001', { USD: 10000, BTC: 0, ETH: 0, TON: 0 });
 *
 * // 3. Process a BUY signal from the Strategy Engine
 * const result = await engine.processSignal(
 *   {
 *     action: 'BUY',
 *     asset: 'BTC',
 *     amount: '0.01',
 *     confidence: 0.8,
 *     reason: 'Trend strategy: upward momentum detected',
 *     strategyId: 'trend',
 *     generatedAt: new Date(),
 *   },
 *   'agent-001',
 *   { BTC: 65000 }  // current prices from Market Data Layer
 * );
 *
 * console.log(result.status);         // 'executed'
 * console.log(result.trade?.value);   // 650 (0.01 BTC × $65,000)
 *
 * // 4. Check portfolio
 * const portfolio = engine.getPortfolio('agent-001');
 * console.log(portfolio.balances);    // { USD: 9350, BTC: 0.01, ETH: 0, TON: 0 }
 *
 * // 5. Calculate PnL
 * const pnl = engine.calculatePnL('agent-001', { BTC: 66000 });
 * console.log(pnl.unrealizedPnl);     // 10 (0.01 BTC × $1000 price increase)
 * console.log(pnl.roiPercent);        // 0.1 (10/10000 × 100)
 * ```
 *
 * ## Integration with Strategy Engine
 *
 * ```typescript
 * import {
 *   createStrategyRegistry,
 *   createStrategyLoader,
 *   createStrategyExecutionEngine,
 * } from '@tonaiagent/core/strategy-engine';
 * import { createTradingEngine } from '@tonaiagent/core/trading-engine';
 *
 * // Set up strategy pipeline
 * const registry = createStrategyRegistry();
 * const loader = createStrategyLoader(registry);
 * loader.loadBuiltIns();
 *
 * const strategyEngine = createStrategyExecutionEngine(registry);
 * strategyEngine.start();
 *
 * const tradingEngine = createTradingEngine();
 * tradingEngine.start();
 * tradingEngine.initPortfolio('agent-001', { USD: 10000 });
 *
 * // Execute a strategy and forward signal to trading engine
 * const executionResult = await strategyEngine.execute({
 *   strategyId: 'trend',
 *   agentId: 'agent-001',
 *   marketData: {
 *     prices: { TON: { asset: 'TON', price: 5.25, volume24h: 1_000_000, timestamp: new Date() } },
 *     source: 'live',
 *     fetchedAt: new Date(),
 *   },
 * });
 *
 * const tradeResult = await tradingEngine.processSignal(
 *   executionResult.signal,
 *   'agent-001',
 *   { TON: 5.25 }
 * );
 *
 * console.log(tradeResult.status); // 'executed' | 'skipped' | 'rejected'
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Re-exported from strategy-engine for convenience
  TradeSignal,
  SignalAction,
  // Portfolio types
  TradingAsset,
  PortfolioBalance,
  Portfolio,
  // Trade types
  TradeRecord,
  // Execution result types
  TradeExecutionStatus,
  TradeExecutionResult,
  // PnL types
  PnLSummary,
  // Config types
  TradingEngineConfig,
  TradingEngineMetrics,
  // Event types
  TradingEngineEventType,
  TradingEngineEvent,
  TradingEngineEventHandler,
  TradingEngineUnsubscribe,
  // Error types
  TradingEngineErrorCode,
  // Interface types
  PortfolioManagerInterface,
  TradeHistoryRepositoryInterface,
} from './types';

export { TradingEngineError } from './types';

// ============================================================================
// Portfolio Manager
// ============================================================================

export { DefaultPortfolioManager, createPortfolioManager, DEFAULT_INITIAL_BALANCES } from './portfolio-manager';

// ============================================================================
// Trade History Repository
// ============================================================================

export { DefaultTradeHistoryRepository, createTradeHistoryRepository } from './trade-history-repository';

// ============================================================================
// Trade Executor
// ============================================================================

export { SimulationTradeExecutor, createSimulationTradeExecutor } from './trade-executor';

// ============================================================================
// Trading Engine
// ============================================================================

export {
  TradingEngine,
  createTradingEngine,
  DEFAULT_TRADING_ENGINE_CONFIG,
  BASELINE_PRICES,
} from './trading-engine';
