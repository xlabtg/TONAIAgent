/**
 * TONAIAgent - On-Chain Trading Module (DEX Execution Layer)
 *
 * Enables AI agents to execute real on-chain swaps on TON DEXs:
 * DeDust, STON.fi, and TONCO.
 *
 * Architecture:
 * ```
 *   Strategy Engine
 *         |
 *   DEX Router          ← selects optimal DEX by price/liquidity/slippage
 *         |
 *   Trade Validator     ← risk controls: slippage, position size, allowed pairs
 *         |
 *   Transaction Builder ← constructs TON-compatible swap tx payloads
 *         |
 *   Swap Executor       ← submits tx via TON Connect wallet signing flow
 *         |
 *   On-Chain Trade Tracker ← records tx_hash, dex_used, amounts, timestamp
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   createSwapExecutor,
 * } from '@tonaiagent/core/trading';
 *
 * // 1. Create executor (testnet dry-run by default)
 * const executor = createSwapExecutor({
 *   network: 'testnet',
 *   submitTransactions: false,
 * });
 *
 * // 2. (Optional) Connect a TON wallet for live execution
 * executor.connectWallet(myTonConnectWallet);
 *
 * // 3. Execute a swap from a strategy signal
 * const result = await executor.executeSwap({
 *   pair: 'TON/USDT',
 *   action: 'BUY',
 *   amount: '10',              // 10 USDT to buy TON
 *   strategyId: 'dca',
 *   agentId: 'agent-001',
 *   generatedAt: new Date(),
 * });
 *
 * console.log(result.status);          // 'simulated' | 'submitted' | 'rejected'
 * console.log(result.routingResult?.selectedDex); // 'stonfi'
 * console.log(result.txHash);          // '0xabc...' (if live)
 *
 * // 4. Query trade history
 * const tracker = executor.getTracker();
 * const trades = tracker.getTradesByAgent('agent-001');
 * ```
 *
 * ## Risk Controls
 *
 * ```typescript
 * const executor = createSwapExecutor(
 *   { network: 'testnet', submitTransactions: false },
 *   {
 *     maxSlippagePercent: 1.0,     // 1% max slippage
 *     maxPositionPercent: 20.0,    // 20% max position size
 *     minLiquidityUsd: 10_000,     // $10k min liquidity
 *     maxPriceImpactPercent: 3.0,  // 3% max price impact
 *     allowedPairs: ['TON/USDT', 'TON/USDC'],
 *   }
 * );
 * ```
 *
 * ## Individual Components
 *
 * ```typescript
 * import {
 *   createDexRouter,
 *   createTradeValidator,
 *   createTransactionBuilder,
 *   createOnChainTradeTracker,
 * } from '@tonaiagent/core/trading';
 *
 * // Use components independently
 * const router = createDexRouter({ enabledDexes: ['dedust', 'stonfi'] });
 * const routingResult = await router.findBestRoute(signal);
 *
 * const validator = createTradeValidator({ maxSlippagePercent: 0.5 });
 * const validation = validator.validateQuote(routingResult.bestQuote);
 *
 * const builder = createTransactionBuilder({ network: 'testnet' });
 * const tx = builder.buildSwapTransaction(routingResult, walletAddress);
 * ```
 *
 * @see Issue #235 — On-Chain Trading Integration (TON DEX Execution)
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // DEX identifiers
  DexName,
  // Trade signal
  OnChainTradeSignal,
  // Routing
  SwapQuote,
  RoutingResult,
  // Transaction
  TonSwapTransaction,
  // Execution
  SwapExecutionStatus,
  SwapExecutionResult,
  // Trade record
  OnChainTradeRecord,
  // Validation
  TradeValidationResult,
  TradeValidationCheck,
  // Configuration
  TradingRiskConfig,
  DexRouterConfig,
  SwapExecutorConfig,
  // Events
  TradingEventType,
  TradingEvent,
  TradingEventHandler,
  TradingUnsubscribe,
  // Error
  TradingErrorCode,
  // Wallet
  TonWalletConnector,
} from './types';

export {
  DEFAULT_RISK_CONFIG,
  DEFAULT_DEX_ROUTER_CONFIG,
  DEFAULT_SWAP_EXECUTOR_CONFIG,
  TradingError,
} from './types';

// ============================================================================
// Trade Validator
// ============================================================================

export { TradeValidator, createTradeValidator } from './trade-validator';

// ============================================================================
// DEX Router
// ============================================================================

export {
  DexRouter,
  DefaultDexQuoteFetcher,
  createDexRouter,
  type DexQuoteFetcher,
} from './dex-router';

// ============================================================================
// Transaction Builder
// ============================================================================

export { TransactionBuilder, createTransactionBuilder } from './transaction-builder';

// ============================================================================
// On-Chain Trade Tracker
// ============================================================================

export { OnChainTradeTracker, createOnChainTradeTracker } from './on-chain-trade-tracker';

// ============================================================================
// Swap Executor (Unified Entry Point)
// ============================================================================

export { SwapExecutor, createSwapExecutor } from './swap-executor';
