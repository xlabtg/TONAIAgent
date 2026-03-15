/**
 * TONAIAgent - On-Chain Trade Tracker
 *
 * Records and queries on-chain trade execution results with a full audit trail.
 * Each recorded trade includes:
 * - trade_id: unique identifier
 * - wallet_address: the signing wallet
 * - strategy_id: originating strategy
 * - dex_used: which DEX executed the swap
 * - pair: trading pair (e.g. "TON/USDT")
 * - amount_in / amount_out: actual amounts swapped
 * - tx_hash: on-chain transaction hash
 * - timestamp: execution time
 * - status: pending | confirmed | failed
 *
 * @see Issue #235 — On-Chain Trading Integration (TON DEX Execution)
 */

import type {
  OnChainTradeRecord,
  OnChainTradeSignal,
  RoutingResult,
  TonSwapTransaction,
  DexName,
} from './types';

// ============================================================================
// On-Chain Trade Tracker
// ============================================================================

/**
 * OnChainTradeTracker — stores and retrieves on-chain trade records.
 *
 * In-memory implementation (MVP). Production would persist to a database.
 *
 * @example
 * ```typescript
 * const tracker = createOnChainTradeTracker();
 *
 * // Record a simulated trade
 * const tradeId = await tracker.recordSimulatedTrade(signal, routing, tx, wallet);
 *
 * // Look up by agent
 * const trades = tracker.getTradesByAgent('agent-001');
 *
 * // Look up by tx hash
 * const trade = tracker.getTradeByTxHash('0xabc...');
 * ```
 */
export class OnChainTradeTracker {
  private readonly trades: Map<string, OnChainTradeRecord> = new Map();
  private tradeCounter = 0;

  /**
   * Records a simulated trade (testnet / dry-run mode).
   * The tx_hash is a synthetic identifier for tracking purposes.
   *
   * @returns The generated trade ID
   */
  async recordSimulatedTrade(
    signal: OnChainTradeSignal,
    routingResult: RoutingResult,
    transaction: TonSwapTransaction,
    walletAddress: string
  ): Promise<string> {
    const tradeId = this.generateTradeId();
    const { bestQuote } = routingResult;

    // Simulate confirmed: in testnet mode we mark as confirmed immediately
    const syntheticTxHash = `sim-${transaction.txId}-${Date.now()}`;

    const record: OnChainTradeRecord = {
      tradeId,
      agentId: signal.agentId,
      walletAddress,
      strategyId: signal.strategyId,
      dexUsed: routingResult.selectedDex,
      pair: signal.pair,
      tokenIn: bestQuote.tokenIn,
      tokenOut: bestQuote.tokenOut,
      amountIn: bestQuote.amountIn,
      amountOut: bestQuote.minimumAmountOut, // Use minimum as expected simulated output
      executionPrice: bestQuote.executionPrice,
      slippagePercent: this.calculateSlippage(bestQuote.expectedAmountOut, bestQuote.minimumAmountOut),
      txHash: syntheticTxHash,
      network: transaction.network,
      status: 'confirmed', // Simulated trades are immediately "confirmed"
      timestamp: new Date(),
      confirmedAt: new Date(),
    };

    this.trades.set(tradeId, record);
    return tradeId;
  }

  /**
   * Records a submitted live trade.
   * Initial status is 'pending' until confirmed on-chain.
   *
   * @returns The generated trade ID
   */
  async recordSubmittedTrade(
    signal: OnChainTradeSignal,
    routingResult: RoutingResult,
    transaction: TonSwapTransaction,
    walletAddress: string,
    txHash: string
  ): Promise<string> {
    const tradeId = this.generateTradeId();
    const { bestQuote } = routingResult;

    const record: OnChainTradeRecord = {
      tradeId,
      agentId: signal.agentId,
      walletAddress,
      strategyId: signal.strategyId,
      dexUsed: routingResult.selectedDex,
      pair: signal.pair,
      tokenIn: bestQuote.tokenIn,
      tokenOut: bestQuote.tokenOut,
      amountIn: bestQuote.amountIn,
      amountOut: '0', // Actual amount unknown until confirmed
      executionPrice: bestQuote.executionPrice,
      slippagePercent: 0, // Unknown until confirmed
      txHash,
      network: transaction.network,
      status: 'pending',
      timestamp: new Date(),
    };

    this.trades.set(tradeId, record);
    return tradeId;
  }

  /**
   * Updates a trade record with on-chain confirmation data.
   * Called when a pending trade is confirmed on the blockchain.
   */
  confirmTrade(
    tradeId: string,
    confirmedData: {
      amountOut: string;
      executionPrice: number;
      slippagePercent: number;
      blockNumber?: number;
      feePaid?: string;
    }
  ): void {
    const record = this.trades.get(tradeId);
    if (!record) return;

    const updated: OnChainTradeRecord = {
      ...record,
      amountOut: confirmedData.amountOut,
      executionPrice: confirmedData.executionPrice,
      slippagePercent: confirmedData.slippagePercent,
      blockNumber: confirmedData.blockNumber,
      feePaid: confirmedData.feePaid,
      status: 'confirmed',
      confirmedAt: new Date(),
    };

    this.trades.set(tradeId, updated);
  }

  /**
   * Marks a trade as failed.
   */
  failTrade(tradeId: string): void {
    const record = this.trades.get(tradeId);
    if (!record) return;

    this.trades.set(tradeId, { ...record, status: 'failed' });
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Returns a trade by its ID, or null if not found.
   */
  getTradeById(tradeId: string): OnChainTradeRecord | null {
    return this.trades.get(tradeId) ?? null;
  }

  /**
   * Returns a trade by its transaction hash, or null if not found.
   */
  getTradeByTxHash(txHash: string): OnChainTradeRecord | null {
    for (const trade of this.trades.values()) {
      if (trade.txHash === txHash) return trade;
    }
    return null;
  }

  /**
   * Returns all trades for a specific agent, newest first.
   */
  getTradesByAgent(agentId: string, limit?: number): OnChainTradeRecord[] {
    const agentTrades = Array.from(this.trades.values())
      .filter(t => t.agentId === agentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit !== undefined ? agentTrades.slice(0, limit) : agentTrades;
  }

  /**
   * Returns all trades for a specific strategy, newest first.
   */
  getTradesByStrategy(strategyId: string, limit?: number): OnChainTradeRecord[] {
    const strategyTrades = Array.from(this.trades.values())
      .filter(t => t.strategyId === strategyId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit !== undefined ? strategyTrades.slice(0, limit) : strategyTrades;
  }

  /**
   * Returns all trades for a specific DEX, newest first.
   */
  getTradesByDex(dex: DexName, limit?: number): OnChainTradeRecord[] {
    const dexTrades = Array.from(this.trades.values())
      .filter(t => t.dexUsed === dex)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit !== undefined ? dexTrades.slice(0, limit) : dexTrades;
  }

  /**
   * Returns all trades for a specific pair, newest first.
   */
  getTradesByPair(pair: string, limit?: number): OnChainTradeRecord[] {
    const pairTrades = Array.from(this.trades.values())
      .filter(t => t.pair === pair)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit !== undefined ? pairTrades.slice(0, limit) : pairTrades;
  }

  /**
   * Returns all trades, newest first.
   */
  getAllTrades(limit?: number): OnChainTradeRecord[] {
    const allTrades = Array.from(this.trades.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit !== undefined ? allTrades.slice(0, limit) : allTrades;
  }

  /**
   * Returns all pending trades (submitted but not yet confirmed).
   */
  getPendingTrades(): OnChainTradeRecord[] {
    return Array.from(this.trades.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // oldest first for polling
  }

  /**
   * Returns the total number of recorded trades.
   */
  totalCount(): number {
    return this.trades.size;
  }

  /**
   * Returns summary statistics for an agent's trading history.
   */
  getAgentStats(agentId: string): {
    totalTrades: number;
    confirmedTrades: number;
    pendingTrades: number;
    failedTrades: number;
    dexBreakdown: Record<DexName, number>;
    pairsTraded: string[];
  } {
    const agentTrades = this.getTradesByAgent(agentId);

    const dexBreakdown: Record<DexName, number> = { dedust: 0, stonfi: 0, tonco: 0 };
    const pairsSet = new Set<string>();

    for (const trade of agentTrades) {
      dexBreakdown[trade.dexUsed]++;
      pairsSet.add(trade.pair);
    }

    return {
      totalTrades: agentTrades.length,
      confirmedTrades: agentTrades.filter(t => t.status === 'confirmed').length,
      pendingTrades: agentTrades.filter(t => t.status === 'pending').length,
      failedTrades: agentTrades.filter(t => t.status === 'failed').length,
      dexBreakdown,
      pairsTraded: Array.from(pairsSet),
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Generates a unique trade ID.
   */
  private generateTradeId(): string {
    this.tradeCounter++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `onchain-trade-${timestamp}-${this.tradeCounter}-${random}`;
  }

  /**
   * Calculates slippage percentage from expected and actual amounts.
   */
  private calculateSlippage(expected: string, actual: string): number {
    const expectedVal = parseFloat(expected);
    const actualVal = parseFloat(actual);
    if (expectedVal <= 0) return 0;
    return Math.max(0, ((expectedVal - actualVal) / expectedVal) * 100);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an OnChainTradeTracker instance.
 *
 * @example
 * ```typescript
 * const tracker = createOnChainTradeTracker();
 * const tradeId = await tracker.recordSimulatedTrade(signal, routing, tx, wallet);
 * const trades = tracker.getTradesByAgent('agent-001');
 * ```
 */
export function createOnChainTradeTracker(): OnChainTradeTracker {
  return new OnChainTradeTracker();
}
