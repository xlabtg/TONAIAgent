/**
 * TONAIAgent - Trade Executor (Simulation Mode)
 *
 * Simulates trade execution at the current market price.
 * On BUY: deducts the USD cost from the portfolio and credits the asset.
 * On SELL: deducts the asset from the portfolio and credits USD proceeds.
 * On HOLD: skips execution and returns a skipped result.
 *
 * All trades are executed at the price provided in the market data snapshot.
 * Fees are set to 0 for the simulation MVP.
 */

import type {
  TradeSignal,
  TradeRecord,
  TradeExecutionResult,
  TradingEngineConfig,
} from './types';
import { TradingEngineError } from './types';
import type { DefaultPortfolioManager } from './portfolio-manager';
import type { DefaultTradeHistoryRepository } from './trade-history-repository';

// ============================================================================
// Simulation Trade Executor
// ============================================================================

/**
 * SimulationTradeExecutor processes trade signals in simulation mode.
 *
 * It coordinates with the PortfolioManager (for balance reads/updates)
 * and the TradeHistoryRepository (for persisting trade records).
 *
 * @example
 * ```typescript
 * const executor = new SimulationTradeExecutor(portfolioManager, historyRepo, config);
 *
 * const result = await executor.execute(signal, 'agent-001', { BTC: 65000 });
 * if (result.status === 'executed') {
 *   console.log('Trade executed:', result.trade);
 * }
 * ```
 */
export class SimulationTradeExecutor {
  constructor(
    private readonly portfolioManager: DefaultPortfolioManager,
    private readonly historyRepository: DefaultTradeHistoryRepository,
    private readonly config: TradingEngineConfig
  ) {}

  /**
   * Execute a trade signal.
   *
   * Pipeline:
   * 1. Skip HOLD signals immediately
   * 2. Validate signal (action, asset, amount)
   * 3. Look up current price from provided prices map
   * 4. Check portfolio balance (auto-initialize if missing)
   * 5. Validate sufficient balance for the trade
   * 6. Apply balance updates atomically
   * 7. Record the trade in history
   * 8. Return the execution result
   *
   * @param signal - The trade signal from the Strategy Engine
   * @param agentId - The agent executing the trade
   * @param prices - Map of asset → current USD price
   * @returns TradeExecutionResult
   */
  async execute(
    signal: TradeSignal,
    agentId: string,
    prices: Record<string, number>
  ): Promise<TradeExecutionResult> {
    const startedAt = Date.now();

    // Skip HOLD signals — no trade needed
    if (signal.action === 'HOLD') {
      return {
        success: true,
        status: 'skipped',
        signal,
        message: 'Signal action is HOLD — no trade executed',
        agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startedAt,
      };
    }

    // Validate action
    if (signal.action !== 'BUY' && signal.action !== 'SELL') {
      return {
        success: false,
        status: 'error',
        signal,
        message: `Unknown signal action: '${signal.action}'`,
        agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startedAt,
      };
    }

    // Parse and validate amount
    const amount = parseFloat(signal.amount);
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        status: 'rejected',
        signal,
        message: `Invalid trade amount: '${signal.amount}'. Must be a positive number.`,
        agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startedAt,
      };
    }

    const asset = signal.asset.toUpperCase();

    // Look up price
    const price = prices[asset];
    if (price === undefined || price <= 0) {
      return {
        success: false,
        status: 'rejected',
        signal,
        message: `Price not available for asset '${asset}'`,
        agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startedAt,
      };
    }

    const tradeValue = amount * price;

    // Enforce minimum trade value
    if (tradeValue < this.config.minTradeValueUsd) {
      return {
        success: false,
        status: 'rejected',
        signal,
        message: `Trade value $${tradeValue.toFixed(2)} is below minimum $${this.config.minTradeValueUsd}`,
        agentId,
        executedAt: new Date(),
        durationMs: Date.now() - startedAt,
      };
    }

    // Auto-initialize portfolio if agent has no portfolio yet
    if (!this.portfolioManager.hasPortfolio(agentId)) {
      this.portfolioManager.initPortfolio(agentId);
    }

    // Snapshot balances before the trade
    const balanceBefore = this.portfolioManager.snapshotBalances(agentId);

    // Check sufficient balance
    const quoteCurrency = this.config.quoteCurrency;

    if (signal.action === 'BUY') {
      const usdBalance = this.portfolioManager.getBalance(agentId, quoteCurrency);
      if (usdBalance < tradeValue) {
        return {
          success: false,
          status: 'rejected',
          signal,
          message: `Insufficient ${quoteCurrency} balance. Required: $${tradeValue.toFixed(2)}, Available: $${usdBalance.toFixed(2)}`,
          agentId,
          executedAt: new Date(),
          durationMs: Date.now() - startedAt,
        };
      }
    } else {
      // SELL
      const assetBalance = this.portfolioManager.getBalance(agentId, asset);
      if (assetBalance < amount) {
        return {
          success: false,
          status: 'rejected',
          signal,
          message: `Insufficient ${asset} balance. Required: ${amount}, Available: ${assetBalance}`,
          agentId,
          executedAt: new Date(),
          durationMs: Date.now() - startedAt,
        };
      }
    }

    // Apply fee (0 in simulation MVP)
    const fee = tradeValue * this.config.feeRate;

    // Apply balance changes
    if (signal.action === 'BUY') {
      this.portfolioManager.updateBalance(agentId, quoteCurrency, -(tradeValue + fee));
      this.portfolioManager.updateBalance(agentId, asset, amount);
    } else {
      // SELL
      this.portfolioManager.updateBalance(agentId, asset, -amount);
      this.portfolioManager.updateBalance(agentId, quoteCurrency, tradeValue - fee);
    }

    const balanceAfter = this.portfolioManager.snapshotBalances(agentId);

    // Create trade record
    const trade: TradeRecord = {
      tradeId: this.generateTradeId(),
      agentId,
      action: signal.action,
      asset,
      amount,
      price,
      value: tradeValue,
      fee,
      strategyId: signal.strategyId,
      confidence: signal.confidence,
      timestamp: new Date(),
      balanceBefore,
      balanceAfter,
    };

    // Save to history
    this.historyRepository.save(trade);

    return {
      success: true,
      status: 'executed',
      signal,
      trade,
      message: `${signal.action} ${amount} ${asset} at $${price} (total: $${tradeValue.toFixed(2)})`,
      agentId,
      executedAt: new Date(),
      durationMs: Date.now() - startedAt,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateTradeId(): string {
    return `trade-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Simulation Trade Executor.
 *
 * @example
 * ```typescript
 * const executor = createSimulationTradeExecutor(portfolioManager, historyRepo, config);
 * ```
 */
export function createSimulationTradeExecutor(
  portfolioManager: DefaultPortfolioManager,
  historyRepository: DefaultTradeHistoryRepository,
  config: TradingEngineConfig
): SimulationTradeExecutor {
  return new SimulationTradeExecutor(portfolioManager, historyRepository, config);
}
