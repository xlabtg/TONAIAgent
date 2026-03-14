/**
 * TONAIAgent - Swap Executor
 *
 * Orchestrates the full on-chain swap lifecycle:
 * 1. Validate the trade signal (risk controls)
 * 2. Route to the best DEX (DexRouter)
 * 3. Validate the selected quote (slippage, liquidity, price impact)
 * 4. Build the transaction (TransactionBuilder)
 * 5. Sign and submit via TON Connect wallet
 * 6. Return execution result for tracking
 *
 * In testnet/simulation mode, transactions are built but not submitted.
 * The result includes the transaction payload for inspection.
 *
 * @see Issue #235 — On-Chain Trading Integration (TON DEX Execution)
 */

import type {
  OnChainTradeSignal,
  SwapExecutionResult,
  SwapExecutorConfig,
  TradingRiskConfig,
  TonWalletConnector,
  TradingEventHandler,
  TradingUnsubscribe,
  TradingEvent,
} from './types';
import { DEFAULT_SWAP_EXECUTOR_CONFIG, TradingError } from './types';
import { TradeValidator, createTradeValidator } from './trade-validator';
import { DexRouter, createDexRouter, type DexQuoteFetcher } from './dex-router';
import { TransactionBuilder, createTransactionBuilder } from './transaction-builder';
import { OnChainTradeTracker, createOnChainTradeTracker } from './on-chain-trade-tracker';

// ============================================================================
// Swap Executor
// ============================================================================

/**
 * SwapExecutor — executes on-chain swaps on TON DEXs via the full pipeline.
 *
 * @example
 * ```typescript
 * const executor = createSwapExecutor({
 *   network: 'testnet',
 *   submitTransactions: false,  // dry-run
 * });
 *
 * // Connect a wallet
 * executor.connectWallet(myTonConnectWallet);
 *
 * // Execute a swap signal
 * const result = await executor.executeSwap({
 *   pair: 'TON/USDT',
 *   action: 'BUY',
 *   amount: '10',
 *   strategyId: 'dca',
 *   agentId: 'agent-001',
 *   generatedAt: new Date(),
 * });
 *
 * console.log(result.status);   // 'simulated' | 'submitted' | 'rejected'
 * console.log(result.txHash);   // '0xabc...' (if submitted)
 * ```
 */
export class SwapExecutor {
  private readonly config: SwapExecutorConfig;
  private readonly validator: TradeValidator;
  private readonly router: DexRouter;
  private readonly txBuilder: TransactionBuilder;
  private readonly tracker: OnChainTradeTracker;
  private wallet: TonWalletConnector | null = null;
  private readonly eventHandlers: TradingEventHandler[] = [];

  constructor(
    config: Partial<SwapExecutorConfig> = {},
    riskConfig: Partial<TradingRiskConfig> = {},
    quoteFetcher?: DexQuoteFetcher
  ) {
    this.config = { ...DEFAULT_SWAP_EXECUTOR_CONFIG, ...config };
    this.validator = createTradeValidator(riskConfig);
    this.router = createDexRouter(
      { slippageTolerance: riskConfig.maxSlippagePercent ?? 1.0 },
      quoteFetcher
    );
    this.txBuilder = createTransactionBuilder(this.config);
    this.tracker = createOnChainTradeTracker();
  }

  /**
   * Connects a TON wallet for transaction signing.
   * Required for live transaction submission.
   */
  connectWallet(wallet: TonWalletConnector): void {
    this.wallet = wallet;
  }

  /**
   * Disconnects the current wallet.
   */
  disconnectWallet(): void {
    this.wallet = null;
  }

  /**
   * Returns whether a wallet is currently connected.
   */
  isWalletConnected(): boolean {
    return this.wallet !== null && this.wallet.isConnected;
  }

  /**
   * Returns the current configuration.
   */
  getConfig(): SwapExecutorConfig {
    return { ...this.config };
  }

  /**
   * Returns the trade tracker for accessing trade history.
   */
  getTracker(): OnChainTradeTracker {
    return this.tracker;
  }

  /**
   * Subscribes to trading events.
   * @returns Unsubscribe function
   */
  subscribe(handler: TradingEventHandler): TradingUnsubscribe {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index !== -1) this.eventHandlers.splice(index, 1);
    };
  }

  /**
   * Executes a swap for a given trade signal.
   *
   * Full pipeline:
   * 1. Validate signal (action, amount, pair, agent)
   * 2. Route to best DEX
   * 3. Validate quote (slippage, liquidity, impact)
   * 4. Build transaction
   * 5. Submit or simulate
   * 6. Record result
   *
   * @param signal - The trade signal from the strategy engine
   * @param portfolioValueUsd - Current portfolio value (for position size check)
   * @returns SwapExecutionResult with full audit trail
   */
  async executeSwap(
    signal: OnChainTradeSignal,
    portfolioValueUsd?: number
  ): Promise<SwapExecutionResult> {
    const startTime = Date.now();
    this.emit('trade.signal_received', signal.agentId, undefined, {
      pair: signal.pair,
      action: signal.action,
      amount: signal.amount,
      strategyId: signal.strategyId,
    });

    // Step 1: Validate signal
    const signalValidation = this.validator.validateSignal(signal);
    if (!signalValidation.valid) {
      this.emit('trade.validation_failed', signal.agentId, undefined, {
        reason: signalValidation.rejectionReason,
        checks: signalValidation.checks,
      });
      return {
        success: false,
        status: 'rejected',
        errorMessage: signalValidation.rejectionReason,
        agentId: signal.agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    }

    // Step 2: Route to best DEX
    let routingResult;
    try {
      routingResult = await this.router.findBestRoute(signal);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit('trade.failed', signal.agentId, undefined, { reason: message, stage: 'routing' });
      return {
        success: false,
        status: 'failed',
        errorMessage: `Routing failed: ${message}`,
        agentId: signal.agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    }

    this.emit('trade.routing_completed', signal.agentId, undefined, {
      selectedDex: routingResult.selectedDex,
      reason: routingResult.selectionReason,
      quotesCount: routingResult.allQuotes.length,
    });

    // Step 3: Validate quote
    const quoteValidation = this.validator.validateQuote(routingResult.bestQuote);
    if (!quoteValidation.valid) {
      this.emit('trade.validation_failed', signal.agentId, undefined, {
        reason: quoteValidation.rejectionReason,
        stage: 'quote_validation',
        checks: quoteValidation.checks,
      });
      return {
        success: false,
        status: 'rejected',
        errorMessage: quoteValidation.rejectionReason,
        routingResult,
        agentId: signal.agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    }

    // Step 3b: Position size check (if portfolio value provided)
    if (portfolioValueUsd !== undefined && portfolioValueUsd > 0) {
      const tradeValueUsd = this.estimateTradeValueUsd(signal);
      const positionValidation = this.validator.validatePositionSize(tradeValueUsd, portfolioValueUsd);
      if (!positionValidation.valid) {
        this.emit('trade.validation_failed', signal.agentId, undefined, {
          reason: positionValidation.rejectionReason,
          stage: 'position_size',
          tradeValueUsd,
          portfolioValueUsd,
        });
        return {
          success: false,
          status: 'rejected',
          errorMessage: positionValidation.rejectionReason,
          routingResult,
          agentId: signal.agentId,
          executedAt: new Date(),
          durationMs: Date.now() - startTime,
        };
      }
    }

    this.emit('trade.validation_passed', signal.agentId, undefined, {
      dex: routingResult.selectedDex,
      pair: signal.pair,
    });

    // Step 4: Build transaction
    const walletAddress = this.wallet?.walletAddress ?? 'simulation-wallet';
    let transaction;
    try {
      transaction = this.txBuilder.buildSwapTransaction(routingResult, walletAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit('trade.failed', signal.agentId, undefined, { reason: message, stage: 'build' });
      return {
        success: false,
        status: 'failed',
        errorMessage: `Transaction build failed: ${message}`,
        routingResult,
        agentId: signal.agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    }

    this.emit('trade.transaction_built', signal.agentId, transaction.txId, {
      txId: transaction.txId,
      dex: routingResult.selectedDex,
      contractAddress: transaction.contractAddress,
    });

    // Step 5: Submit or simulate
    if (!this.config.submitTransactions || !this.isWalletConnected()) {
      // Simulation/dry-run mode
      const tradeId = await this.tracker.recordSimulatedTrade(
        signal,
        routingResult,
        transaction,
        walletAddress
      );

      this.emit('trade.submitted', signal.agentId, tradeId, {
        mode: 'simulated',
        txId: transaction.txId,
        dex: routingResult.selectedDex,
      });

      return {
        success: true,
        status: 'simulated',
        transaction,
        routingResult,
        agentId: signal.agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    }

    // Live submission via wallet
    let txHash: string;
    try {
      txHash = await this.submitWithRetry(transaction);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit('trade.failed', signal.agentId, transaction.txId, {
        reason: message,
        stage: 'submission',
      });
      return {
        success: false,
        status: 'failed',
        errorMessage: `Submission failed: ${message}`,
        transaction,
        routingResult,
        agentId: signal.agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    }

    // Record the submitted trade
    const tradeId = await this.tracker.recordSubmittedTrade(
      signal,
      routingResult,
      transaction,
      walletAddress,
      txHash
    );

    this.emit('trade.submitted', signal.agentId, tradeId, {
      txHash,
      dex: routingResult.selectedDex,
      pair: signal.pair,
    });

    return {
      success: true,
      status: 'submitted',
      txHash,
      transaction,
      routingResult,
      agentId: signal.agentId,
      executedAt: new Date(),
      durationMs: Date.now() - startTime,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Submits a transaction with retry logic.
   */
  private async submitWithRetry(transaction: import('./types').TonSwapTransaction): Promise<string> {
    if (!this.wallet) {
      throw new TradingError('No wallet connected', 'WALLET_NOT_CONNECTED');
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
        return await this.wallet.sendTransaction(transaction);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw new TradingError(
      `Transaction submission failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`,
      'SUBMISSION_FAILED',
      { attempts: this.config.maxRetries + 1 }
    );
  }

  /**
   * Estimates trade value in USD (rough approximation for position size check).
   * For TON pairs, uses TON price approximation.
   */
  private estimateTradeValueUsd(signal: OnChainTradeSignal): number {
    const amount = parseFloat(signal.amount);
    const parts = signal.pair.split('/');
    const base = parts[0] ?? '';

    // Rough USD estimates for common tokens
    const prices: Record<string, number> = {
      TON: 5.0,
      BTC: 65000,
      ETH: 3500,
      USDT: 1.0,
      USDC: 1.0,
      NOT: 0.015,
    };

    return amount * (prices[base] ?? 1.0);
  }

  /**
   * Emits a trading event to all subscribers.
   */
  private emit(
    type: TradingEvent['type'],
    agentId: string | undefined,
    tradeId: string | undefined,
    data: Record<string, unknown>
  ): void {
    const event: TradingEvent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      timestamp: new Date(),
      agentId,
      tradeId,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  /**
   * Simple delay utility.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a SwapExecutor with optional config overrides.
 *
 * @example
 * ```typescript
 * // Testnet dry-run executor
 * const executor = createSwapExecutor({
 *   network: 'testnet',
 *   submitTransactions: false,
 * });
 *
 * // Live mainnet executor with custom risk config
 * const executor = createSwapExecutor(
 *   { network: 'mainnet', submitTransactions: true },
 *   { maxSlippagePercent: 0.5, allowedPairs: ['TON/USDT', 'TON/USDC'] }
 * );
 * ```
 */
export function createSwapExecutor(
  config?: Partial<SwapExecutorConfig>,
  riskConfig?: Partial<TradingRiskConfig>,
  quoteFetcher?: DexQuoteFetcher
): SwapExecutor {
  return new SwapExecutor(config, riskConfig, quoteFetcher);
}
