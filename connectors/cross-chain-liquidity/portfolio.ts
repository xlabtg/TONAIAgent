/**
 * TONAIAgent - Multi-Chain Portfolio Tracker
 *
 * Tracks balances across chains, LP positions, cross-chain transaction
 * history, and per-network strategy performance for AI agents.
 */

import type {
  SupportedChainId,
  CrossChainToken,
  ChainBalance,
  LpPosition,
  MultiChainPortfolio,
  ChainAllocation,
  ChainPerformance,
  TransactionDetails,
  CrossChainLiquidityEvent,
  CrossChainLiquidityEventCallback,
} from './types';

import type { CrossChainConnectorRegistry } from './connector';
import type { LiquidityAggregationEngine } from './aggregation';

// ============================================================================
// Portfolio Tracker Interface
// ============================================================================

/** Interface for multi-chain portfolio tracking */
export interface MultiChainPortfolioTracker {
  /** Sync portfolio state from all connected chains */
  sync(agentId: string): Promise<MultiChainPortfolio>;

  /** Get current portfolio for an agent */
  getPortfolio(agentId: string): MultiChainPortfolio | undefined;

  /** Get balances for a specific chain */
  getChainBalances(agentId: string, chainId: SupportedChainId): ChainBalance[];

  /** Get all LP positions across chains */
  getLpPositions(agentId: string): LpPosition[];

  /** Get cross-chain transaction history */
  getTransactionHistory(
    agentId: string,
    options?: { limit?: number; chainId?: SupportedChainId }
  ): TransactionDetails[];

  /** Get performance metrics per chain */
  getChainPerformance(
    agentId: string,
    period?: ChainPerformance['period']
  ): ChainPerformance[];

  /** Record a completed transaction */
  recordTransaction(agentId: string, tx: TransactionDetails): void;

  /** Update performance for a chain */
  updateChainPerformance(agentId: string, performance: ChainPerformance): void;

  /** Subscribe to portfolio events */
  onEvent(callback: CrossChainLiquidityEventCallback): void;
}

// ============================================================================
// Portfolio Store
// ============================================================================

interface AgentPortfolioStore {
  portfolio: MultiChainPortfolio;
  transactions: TransactionDetails[];
  performanceByChain: Map<string, ChainPerformance>;
}

// ============================================================================
// Portfolio Tracker Implementation
// ============================================================================

export class DefaultMultiChainPortfolioTracker implements MultiChainPortfolioTracker {
  private readonly registry: CrossChainConnectorRegistry;
  private readonly aggregator: LiquidityAggregationEngine;
  private readonly stores: Map<string, AgentPortfolioStore> = new Map();
  private readonly eventCallbacks: CrossChainLiquidityEventCallback[] = [];

  constructor(
    registry: CrossChainConnectorRegistry,
    aggregator: LiquidityAggregationEngine
  ) {
    this.registry = registry;
    this.aggregator = aggregator;
  }

  // ============================================================================
  // Sync
  // ============================================================================

  async sync(agentId: string): Promise<MultiChainPortfolio> {
    const connectedChains = this.registry.getConnectedChains();
    const allBalances: ChainBalance[] = [];
    const allLpPositions: LpPosition[] = [];

    // Fetch balances from each chain
    await Promise.allSettled(
      connectedChains.map(async chainId => {
        const connector = this.registry.get(chainId);
        if (!connector || connector.getStatus().status !== 'connected') return;

        try {
          // Get token prices for this chain (simulated for common tokens)
          const priceResults = await connector.getTokenPrices([
            'TON', 'ETH', 'BNB', 'SOL', 'USDT', 'USDC',
          ]);

          const meta = connector.getChainMetadata();
          const nativeSymbol = meta.nativeCurrency;

          // Simulate balance fetch (in production, would call chain RPC)
          const nativeToken: CrossChainToken = {
            address: 'native',
            chainId,
            symbol: nativeSymbol,
            name: nativeSymbol,
            decimals: 18,
          };

          const nativePrice = priceResults.find(
            p => p.token.symbol === nativeSymbol
          )?.priceUsd ?? 1;

          const simulatedNativeBalance = Math.random() * 100 + 10;

          allBalances.push({
            token: nativeToken,
            chainId,
            balance: simulatedNativeBalance,
            balanceUsd: simulatedNativeBalance * nativePrice,
            lockedBalance: 0,
            lastUpdated: new Date(),
          });

          // Add USDT balance simulation
          const usdtToken: CrossChainToken = {
            address: '0xusdt',
            chainId,
            symbol: 'USDT',
            name: 'Tether USD',
            decimals: 6,
          };

          const usdtBalance = Math.random() * 5000 + 500;
          allBalances.push({
            token: usdtToken,
            chainId,
            balance: usdtBalance,
            balanceUsd: usdtBalance,
            lockedBalance: 0,
            lastUpdated: new Date(),
          });

          // Fetch LP positions (simulated)
          const pools = await connector.getLiquidityPools();
          for (const pool of pools.slice(0, 2)) {
            if (Math.random() > 0.5) {
              const positionValue = Math.random() * 50000 + 1000;
              allLpPositions.push({
                pool,
                sharePercent: Math.random() * 0.1,
                tokenAAmount: positionValue / 2 / (pool.reserveA / pool.totalLiquidityUsd),
                tokenBAmount: positionValue / 2 / (pool.reserveB / pool.totalLiquidityUsd),
                positionValueUsd: positionValue,
                unclaimedFeesUsd: Math.random() * 100,
                enteredAt: new Date(Date.now() - Math.random() * 30 * 86400000),
                impermanentLossPercent: (Math.random() - 0.5) * 5,
              });
            }
          }
        } catch {
          // Skip chain on error
        }
      })
    );

    const totalValueUsd = allBalances.reduce((s, b) => s + b.balanceUsd, 0) +
      allLpPositions.reduce((s, p) => s + p.positionValueUsd, 0);

    const chainAllocations: ChainAllocation[] = connectedChains.map(chainId => {
      const chainValue = allBalances
        .filter(b => b.chainId === chainId)
        .reduce((s, b) => s + b.balanceUsd, 0) +
        allLpPositions
          .filter(p => p.pool.chainId === chainId)
          .reduce((s, p) => s + p.positionValueUsd, 0);

      return {
        chainId,
        valueUsd: chainValue,
        percent: totalValueUsd > 0 ? chainValue / totalValueUsd : 0,
      };
    });

    const store = this.getOrCreateStore(agentId);
    const performanceByChain = Array.from(store.performanceByChain.values());

    const portfolio: MultiChainPortfolio = {
      agentId,
      chains: connectedChains,
      balances: allBalances,
      lpPositions: allLpPositions,
      totalValueUsd,
      chainAllocations,
      crossChainTransactions: store.transactions.slice(-50),
      performanceByChain,
      lastSyncedAt: new Date(),
    };

    store.portfolio = portfolio;
    this.stores.set(agentId, store);

    this.emitEvent('portfolio_synced', {
      agentId,
      totalValueUsd,
      chainCount: connectedChains.length,
    });

    return portfolio;
  }

  // ============================================================================
  // Portfolio Access
  // ============================================================================

  getPortfolio(agentId: string): MultiChainPortfolio | undefined {
    return this.stores.get(agentId)?.portfolio;
  }

  getChainBalances(agentId: string, chainId: SupportedChainId): ChainBalance[] {
    return (
      this.stores.get(agentId)?.portfolio.balances.filter(
        b => b.chainId === chainId
      ) ?? []
    );
  }

  getLpPositions(agentId: string): LpPosition[] {
    return this.stores.get(agentId)?.portfolio.lpPositions ?? [];
  }

  getTransactionHistory(
    agentId: string,
    options: { limit?: number; chainId?: SupportedChainId } = {}
  ): TransactionDetails[] {
    const store = this.stores.get(agentId);
    if (!store) return [];

    let txs = store.transactions;
    if (options.chainId) {
      txs = txs.filter(t => t.chainId === options.chainId);
    }

    return txs
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, options.limit ?? 100);
  }

  getChainPerformance(
    agentId: string,
    period: ChainPerformance['period'] = 'all_time'
  ): ChainPerformance[] {
    const store = this.stores.get(agentId);
    if (!store) return [];

    return Array.from(store.performanceByChain.values()).filter(
      p => p.period === period
    );
  }

  recordTransaction(agentId: string, tx: TransactionDetails): void {
    const store = this.getOrCreateStore(agentId);
    store.transactions.push(tx);

    // Keep only last 500 transactions
    if (store.transactions.length > 500) {
      store.transactions.splice(0, store.transactions.length - 500);
    }

    this.stores.set(agentId, store);
  }

  updateChainPerformance(agentId: string, performance: ChainPerformance): void {
    const store = this.getOrCreateStore(agentId);
    const key = `${performance.chainId}-${performance.strategyId}-${performance.period}`;
    store.performanceByChain.set(key, performance);
    this.stores.set(agentId, store);
  }

  onEvent(callback: CrossChainLiquidityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getOrCreateStore(agentId: string): AgentPortfolioStore {
    const existing = this.stores.get(agentId);
    if (existing) return existing;

    const emptyPortfolio: MultiChainPortfolio = {
      agentId,
      chains: [],
      balances: [],
      lpPositions: [],
      totalValueUsd: 0,
      chainAllocations: [],
      crossChainTransactions: [],
      performanceByChain: [],
      lastSyncedAt: new Date(0),
    };

    const store: AgentPortfolioStore = {
      portfolio: emptyPortfolio,
      transactions: [],
      performanceByChain: new Map(),
    };

    this.stores.set(agentId, store);
    return store;
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
 * Create a multi-chain portfolio tracker.
 */
export function createMultiChainPortfolioTracker(
  registry: CrossChainConnectorRegistry,
  aggregator: LiquidityAggregationEngine
): DefaultMultiChainPortfolioTracker {
  return new DefaultMultiChainPortfolioTracker(registry, aggregator);
}
