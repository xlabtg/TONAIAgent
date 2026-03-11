/**
 * TONAIAgent - Cross-Chain Trade Execution Module
 *
 * Executes cross-chain swaps, liquidity routing, and arbitrage strategies
 * through atomic swaps, bridge transfers, and multi-step execution workflows.
 */

import type {
  SupportedChainId,
  TradeType,
  TradePriority,
  TradeRequest,
  TradeStatus,
  TradeExecution,
  TradeRoute,
  TransactionDetails,
  ArbitrageOpportunity,
  CrossChainToken,
  CrossChainLiquidityEvent,
  CrossChainLiquidityEventCallback,
} from './types';

import type { LiquidityAggregationEngine } from './aggregation';
import type { CrossChainConnectorRegistry } from './connector';

// ============================================================================
// Trade Executor Interface
// ============================================================================

/** Interface for the cross-chain trade executor */
export interface CrossChainTradeExecutor {
  /** Execute a trade using the given route */
  executeTrade(request: TradeRequest, route: TradeRoute): Promise<TradeExecution>;

  /** Cancel a pending trade */
  cancelTrade(tradeId: string): Promise<boolean>;

  /** Get a trade by ID */
  getTrade(tradeId: string): TradeExecution | undefined;

  /** Get all active trades */
  getActiveTrades(): TradeExecution[];

  /** Get trade history */
  getTradeHistory(limit?: number): TradeExecution[];

  /** Scan for arbitrage opportunities */
  scanArbitrageOpportunities(
    tokens: CrossChainToken[]
  ): Promise<ArbitrageOpportunity[]>;

  /** Execute an arbitrage opportunity */
  executeArbitrage(opportunity: ArbitrageOpportunity): Promise<TradeExecution>;

  /** Subscribe to trade events */
  onEvent(callback: CrossChainLiquidityEventCallback): void;
}

// ============================================================================
// Trade Executor Implementation
// ============================================================================

export class DefaultCrossChainTradeExecutor implements CrossChainTradeExecutor {
  private readonly trades: Map<string, TradeExecution> = new Map();
  private readonly eventCallbacks: CrossChainLiquidityEventCallback[] = [];
  private readonly aggregator: LiquidityAggregationEngine;
  private readonly registry: CrossChainConnectorRegistry;
  private tradeCounter = 0;

  constructor(
    aggregator: LiquidityAggregationEngine,
    registry: CrossChainConnectorRegistry
  ) {
    this.aggregator = aggregator;
    this.registry = registry;
  }

  // ============================================================================
  // Trade Execution
  // ============================================================================

  async executeTrade(
    request: TradeRequest,
    route: TradeRoute
  ): Promise<TradeExecution> {
    const executionId = `exec_${++this.tradeCounter}_${Date.now()}`;

    const execution: TradeExecution = {
      id: executionId,
      request,
      route,
      status: 'pending',
      transactions: [],
      amountIn: request.amountIn,
      amountOut: 0,
      totalFeeUsd: 0,
      totalGasUsd: 0,
      priceImpact: 0,
      slippage: 0,
      executedAt: new Date(),
    };

    this.trades.set(executionId, execution);
    this.emitEvent('trade_started', { tradeId: executionId, type: request.type });

    try {
      execution.status = 'routing';

      // Execute each leg of the route
      const transactions: TransactionDetails[] = [];
      let currentAmountIn = request.amountIn;
      let totalFees = 0;
      let totalGas = 0;

      for (const leg of route.legs) {
        if ((execution.status as TradeStatus) === 'cancelled') break;

        const isBridgeLeg = leg.fromChainId !== leg.toChainId;
        execution.status = isBridgeLeg ? 'bridging' : 'executing';

        const connector = this.registry.get(leg.fromChainId);
        if (!connector || connector.getStatus().status !== 'connected') {
          throw new Error(`Connector not available for chain: ${leg.fromChainId}`);
        }

        const swapResult = await connector.executeSwap({
          fromToken: leg.fromToken,
          toToken: leg.toToken,
          amountIn: currentAmountIn,
          slippageTolerance: request.slippageTolerance,
        });

        const txDetails: TransactionDetails = {
          hash: swapResult.transactionHash,
          chainId: leg.fromChainId,
          status: swapResult.status,
          confirmations: 0,
          submittedAt: new Date(),
        };

        // Poll for confirmation
        const confirmed = await this.waitForConfirmation(
          leg.fromChainId,
          swapResult.transactionHash,
          isBridgeLeg ? 30 : 5
        );

        txDetails.status = confirmed.status;
        txDetails.blockNumber = confirmed.blockNumber;
        txDetails.confirmations = confirmed.confirmations;
        txDetails.confirmedAt = confirmed.confirmedAt;
        txDetails.gasUsed = confirmed.gasUsed;
        txDetails.gasUsd = confirmed.gasUsd ?? 0;

        transactions.push(txDetails);
        currentAmountIn = swapResult.amountOut;
        totalFees += leg.feeUsd;
        totalGas += swapResult.gasUsd;

        if (txDetails.status === 'failed') {
          throw new Error(`Transaction failed: ${txDetails.hash}`);
        }
      }

      execution.status = 'confirming';

      // Calculate final metrics
      const actualAmountOut = currentAmountIn;

      // Use route price impact as the actual slippage estimate — route.totalAmountOut is in
      // normalized units and cannot be compared directly to actual swap output which is in
      // destination token units, so we rely on the route's pre-computed price impact field.
      const actualSlippage = route.priceImpact;

      // Check minimum output (in destination token units)
      if (request.minAmountOut > 0 && actualAmountOut < request.minAmountOut) {
        throw new Error(
          `Output below minimum: ${actualAmountOut} < ${request.minAmountOut}`
        );
      }

      execution.status = 'completed';
      execution.transactions = transactions;
      execution.amountOut = actualAmountOut;
      execution.totalFeeUsd = totalFees;
      execution.totalGasUsd = totalGas;
      execution.priceImpact = route.priceImpact;
      execution.slippage = actualSlippage;
      execution.completedAt = new Date();

      this.emitEvent('trade_completed', {
        tradeId: executionId,
        amountOut: actualAmountOut,
        fees: totalFees,
      });
    } catch (err) {
      execution.status = 'failed';
      execution.error = err instanceof Error ? err.message : 'Trade execution failed';
      execution.completedAt = new Date();

      this.emitEvent(
        'trade_failed',
        { tradeId: executionId, error: execution.error },
        'error'
      );
    }

    this.trades.set(executionId, execution);
    return execution;
  }

  async cancelTrade(tradeId: string): Promise<boolean> {
    const execution = this.trades.get(tradeId);
    if (!execution) return false;

    if (execution.status === 'pending' || execution.status === 'routing') {
      execution.status = 'cancelled';
      this.trades.set(tradeId, execution);
      return true;
    }

    return false;
  }

  getTrade(tradeId: string): TradeExecution | undefined {
    return this.trades.get(tradeId);
  }

  getActiveTrades(): TradeExecution[] {
    const activeStatuses: TradeStatus[] = [
      'pending', 'routing', 'executing', 'bridging', 'confirming',
    ];
    return Array.from(this.trades.values()).filter(t =>
      activeStatuses.includes(t.status)
    );
  }

  getTradeHistory(limit = 50): TradeExecution[] {
    const terminal: TradeStatus[] = ['completed', 'failed', 'cancelled'];
    return Array.from(this.trades.values())
      .filter(t => terminal.includes(t.status))
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
      .slice(0, limit);
  }

  // ============================================================================
  // Arbitrage
  // ============================================================================

  async scanArbitrageOpportunities(
    tokens: CrossChainToken[]
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    const connectedChains = this.registry.getConnectedChains();

    if (connectedChains.length < 2) return opportunities;

    for (const token of tokens) {
      // Fetch prices across all chains
      const pricePairs: Array<{ chainId: SupportedChainId; priceUsd: number; dex: string }> = [];

      for (const chainId of connectedChains) {
        const connector = this.registry.get(chainId);
        if (!connector || connector.getStatus().status !== 'connected') continue;

        try {
          const prices = await connector.getTokenPrices([token.symbol]);
          if (prices.length > 0) {
            const p = prices[0];
            pricePairs.push({
              chainId,
              priceUsd: p.priceUsd,
              dex: p.sources[0]?.dex ?? 'Unknown',
            });
          }
        } catch {
          // Skip chain if price fetch fails
        }
      }

      // Find arbitrage pairs (buy low, sell high)
      for (let i = 0; i < pricePairs.length; i++) {
        for (let j = i + 1; j < pricePairs.length; j++) {
          const a = pricePairs[i];
          const b = pricePairs[j];

          const [buyChain, sellChain] =
            a.priceUsd < b.priceUsd ? [a, b] : [b, a];

          const spread = (sellChain.priceUsd - buyChain.priceUsd) / buyChain.priceUsd;
          if (spread < 0.005) continue; // Less than 0.5% spread — skip

          const tradeSize = 10000; // $10k example size
          const grossProfit = tradeSize * spread;
          const estimatedCost = tradeSize * 0.005; // ~0.5% in fees/gas

          if (grossProfit <= estimatedCost) continue;

          const tokenOnBuyChain: CrossChainToken = { ...token, chainId: buyChain.chainId };
          const tokenOnSellChain: CrossChainToken = { ...token, chainId: sellChain.chainId };

          opportunities.push({
            id: `arb_${token.symbol}_${buyChain.chainId}_${sellChain.chainId}_${Date.now()}`,
            token: tokenOnBuyChain,
            buyChainId: buyChain.chainId,
            sellChainId: sellChain.chainId,
            buyDex: buyChain.dex,
            sellDex: sellChain.dex,
            buyPriceUsd: buyChain.priceUsd,
            sellPriceUsd: sellChain.priceUsd,
            spreadPercent: spread * 100,
            estimatedProfitUsd: grossProfit,
            estimatedCostUsd: estimatedCost,
            netProfitUsd: grossProfit - estimatedCost,
            confidence: Math.min(0.95, 0.5 + spread * 10),
            discoveredAt: new Date(),
            expiresAt: new Date(Date.now() + 30_000),
          });
        }
      }
    }

    // Sort by net profit descending
    return opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  }

  async executeArbitrage(
    opportunity: ArbitrageOpportunity
  ): Promise<TradeExecution> {
    if (new Date() > opportunity.expiresAt) {
      throw new Error('Arbitrage opportunity has expired');
    }

    // Build trade request for buy side
    const tradeSize = opportunity.estimatedProfitUsd / opportunity.spreadPercent * 100;

    const buyToken: CrossChainToken = {
      ...opportunity.token,
      chainId: opportunity.buyChainId,
    };

    const sellToken: CrossChainToken = {
      ...opportunity.token,
      chainId: opportunity.sellChainId,
    };

    const request: TradeRequest = {
      id: `arb_req_${Date.now()}`,
      type: 'arbitrage',
      fromToken: buyToken,
      toToken: sellToken,
      amountIn: tradeSize / opportunity.buyPriceUsd,
      minAmountOut: (tradeSize / opportunity.sellPriceUsd) * 0.99,
      slippageTolerance: 0.01,
      priority: 'high',
      metadata: { opportunityId: opportunity.id },
    };

    const quote = await this.aggregator.getQuote(buyToken, sellToken, request.amountIn);
    const route = quote.bestRoute;

    this.emitEvent('arbitrage_executed', {
      opportunityId: opportunity.id,
      netProfitUsd: opportunity.netProfitUsd,
    });

    return this.executeTrade(request, route);
  }

  onEvent(callback: CrossChainLiquidityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async waitForConfirmation(
    chainId: SupportedChainId,
    txHash: string,
    maxAttempts: number
  ): Promise<TransactionDetails> {
    const connector = this.registry.get(chainId);
    if (!connector) {
      return {
        hash: txHash,
        chainId,
        status: 'confirmed',
        confirmations: 1,
        submittedAt: new Date(),
      };
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const details = await connector.checkTransactionStatus(txHash);
      if (details.status === 'confirmed' || details.status === 'failed') {
        return details;
      }
      // In real implementation, this would wait for block time
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return connector.checkTransactionStatus(txHash);
  }

  private emitEvent(
    type: CrossChainLiquidityEvent['type'],
    data: Record<string, unknown>,
    severity: CrossChainLiquidityEvent['severity'] = 'info'
  ): void {
    const event: CrossChainLiquidityEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      timestamp: new Date(),
      data,
      severity,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a cross-chain trade executor.
 */
export function createCrossChainTradeExecutor(
  aggregator: LiquidityAggregationEngine,
  registry: CrossChainConnectorRegistry
): DefaultCrossChainTradeExecutor {
  return new DefaultCrossChainTradeExecutor(aggregator, registry);
}

export type { TradeStatus };
