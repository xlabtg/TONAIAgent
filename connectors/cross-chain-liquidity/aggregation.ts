/**
 * TONAIAgent - Cross-Chain Liquidity Aggregation Layer
 *
 * Aggregates liquidity from DEX pools, bridges, and DeFi protocols across
 * multiple chains. Routes orders to the most efficient liquidity source
 * based on price, gas cost, slippage, and execution speed.
 */

import type {
  SupportedChainId,
  AggregationMode,
  LiquiditySource,
  LiquidityPool,
  CrossChainToken,
  CrossChainTokenPrice,
  RouteLeg,
  TradeRoute,
  AggregatedQuote,
} from './types';

import type {
  CrossChainConnectorRegistry,
} from './connector';

// ============================================================================
// Aggregation Engine Interface
// ============================================================================

/** Interface for the liquidity aggregation engine */
export interface LiquidityAggregationEngine {
  /** Get all available liquidity sources across chains */
  getSources(): LiquiditySource[];

  /** Get pools for a token pair across all chains */
  getPools(tokenA: string, tokenB: string): Promise<LiquidityPool[]>;

  /** Get best price quote for a cross-chain trade */
  getQuote(
    fromToken: CrossChainToken,
    toToken: CrossChainToken,
    amountIn: number,
    mode?: AggregationMode
  ): Promise<AggregatedQuote>;

  /** Refresh liquidity source data */
  refresh(): Promise<void>;

  /** Get price for a token across all connected chains */
  getTokenPrice(symbol: string): Promise<CrossChainTokenPrice[]>;
}

// ============================================================================
// Aggregation Engine Implementation
// ============================================================================

export class DefaultLiquidityAggregationEngine implements LiquidityAggregationEngine {
  private readonly registry: CrossChainConnectorRegistry;
  private readonly mode: AggregationMode;
  private readonly sources: LiquiditySource[] = [];
  private lastRefreshed?: Date;

  constructor(
    registry: CrossChainConnectorRegistry,
    mode: AggregationMode = 'best_price'
  ) {
    this.registry = registry;
    this.mode = mode;
    this.initSources();
  }

  private initSources(): void {
    const chainDexMap: Record<string, string[]> = {
      ton: ['DeDust', 'STON.fi', 'Megaton'],
      ethereum: ['Uniswap V3', 'Curve', 'Balancer'],
      bnb: ['PancakeSwap', 'Biswap', 'ApeSwap'],
      solana: ['Raydium', 'Orca', 'Jupiter'],
      polygon: ['QuickSwap', 'Uniswap V3', 'Balancer'],
      avalanche: ['TraderJoe', 'Pangolin', 'SushiSwap'],
      arbitrum: ['Uniswap V3', 'Camelot', 'SushiSwap'],
      optimism: ['Uniswap V3', 'Velodrome', 'Synthetix'],
    };

    const connectedChains = this.registry.getConnectedChains();

    for (const chainId of connectedChains) {
      const dexes = chainDexMap[chainId] ?? ['GenericDex'];
      for (const dex of dexes) {
        this.sources.push({
          id: `${chainId}-${dex.toLowerCase().replace(/\s/g, '-')}`,
          name: dex,
          chainId,
          type: 'dex',
          supportsNativeSwaps: true,
          supportsCrossChain: false,
          feePercent: 0.3,
          minTradeUsd: 1,
          maxTradeUsd: 1_000_000,
          liquidityUsd: Math.random() * 50_000_000 + 5_000_000,
          responseTimeMs: Math.random() * 200 + 50,
          successRate: 0.97 + Math.random() * 0.03,
        });
      }

      // Add bridge sources for cross-chain capability
      this.sources.push({
        id: `${chainId}-stargate-bridge`,
        name: 'Stargate Bridge',
        chainId,
        type: 'bridge',
        supportsNativeSwaps: false,
        supportsCrossChain: true,
        feePercent: 0.06,
        minTradeUsd: 5,
        maxTradeUsd: 500_000,
        liquidityUsd: 100_000_000,
        responseTimeMs: 15000,
        successRate: 0.995,
      });
    }
  }

  getSources(): LiquiditySource[] {
    return [...this.sources];
  }

  async getPools(tokenA: string, tokenB: string): Promise<LiquidityPool[]> {
    const allPools: LiquidityPool[] = [];
    const connectors = this.registry.getAll();

    await Promise.allSettled(
      connectors
        .filter(c => c.getStatus().status === 'connected')
        .map(async c => {
          try {
            const pools = await c.getLiquidityPools({ tokenA, tokenB });
            allPools.push(...pools);
          } catch {
            // Skip failed connectors
          }
        })
    );

    return allPools.sort((a, b) => b.totalLiquidityUsd - a.totalLiquidityUsd);
  }

  async getTokenPrice(symbol: string): Promise<CrossChainTokenPrice[]> {
    const prices: CrossChainTokenPrice[] = [];
    const connectors = this.registry.getAll();

    await Promise.allSettled(
      connectors
        .filter(c => c.getStatus().status === 'connected')
        .map(async c => {
          try {
            const results = await c.getTokenPrices([symbol]);
            prices.push(...results);
          } catch {
            // Skip failed connectors
          }
        })
    );

    return prices;
  }

  async getQuote(
    fromToken: CrossChainToken,
    toToken: CrossChainToken,
    amountIn: number,
    mode: AggregationMode = this.mode
  ): Promise<AggregatedQuote> {
    const isCrossChain = fromToken.chainId !== toToken.chainId;
    const routes = isCrossChain
      ? await this.buildCrossChainRoutes(fromToken, toToken, amountIn, mode)
      : await this.buildSameChainRoutes(fromToken, toToken, amountIn, mode);

    const scoredRoutes = routes
      .map(r => ({ ...r, score: this.scoreRoute(r, mode) }))
      .sort((a, b) => b.score - a.score);

    const bestRoute = scoredRoutes[0] ?? this.buildFallbackRoute(fromToken, toToken, amountIn);

    return {
      inputToken: fromToken,
      outputToken: toToken,
      inputAmount: amountIn,
      routes: scoredRoutes,
      bestRoute,
      quotedAt: new Date(),
      expiresAt: new Date(Date.now() + 30_000),
    };
  }

  async refresh(): Promise<void> {
    this.sources.length = 0;
    this.initSources();
    this.lastRefreshed = new Date();
  }

  // ============================================================================
  // Private Route Building
  // ============================================================================

  private async buildSameChainRoutes(
    fromToken: CrossChainToken,
    toToken: CrossChainToken,
    amountIn: number,
    mode: AggregationMode
  ): Promise<TradeRoute[]> {
    const chainSources = this.sources.filter(
      s => s.chainId === fromToken.chainId && s.type === 'dex'
    );

    return chainSources.slice(0, 3).map((source, i) => {
      const slippage = 0.005 * (i + 1); // Simulate varying slippage per source
      const fee = source.feePercent / 100;
      const amountOut = amountIn * (1 - fee) * (1 - slippage);
      const gasUsd = 0.5 + i * 0.2;

      const leg: RouteLeg = {
        sourceId: source.id,
        fromChainId: fromToken.chainId,
        toChainId: toToken.chainId,
        fromToken,
        toToken,
        amountIn,
        amountOut,
        feeUsd: amountIn * fee,
        estimatedTimeMs: source.responseTimeMs + 12000,
        priceImpact: slippage,
      };

      const routeId = `route_${fromToken.chainId}_${i}_${Date.now()}`;
      return {
        id: routeId,
        legs: [leg],
        totalAmountIn: amountIn,
        totalAmountOut: amountOut,
        totalFeeUsd: leg.feeUsd,
        totalGasUsd: gasUsd,
        estimatedTimeMs: leg.estimatedTimeMs,
        priceImpact: slippage,
        mode,
        score: 0,
        createdAt: new Date(),
      } satisfies TradeRoute;
    });
  }

  private async buildCrossChainRoutes(
    fromToken: CrossChainToken,
    toToken: CrossChainToken,
    amountIn: number,
    mode: AggregationMode
  ): Promise<TradeRoute[]> {
    const bridges = this.sources.filter(
      s => s.chainId === fromToken.chainId && s.type === 'bridge'
    );

    if (bridges.length === 0) return [];

    return bridges.slice(0, 2).map((bridge, i) => {
      const bridgeFee = bridge.feePercent / 100;
      const swapFee = 0.003;
      const bridgeSlippage = 0.002;
      const swapSlippage = 0.005 * (i + 1);

      // Leg 1: swap on source chain to bridge token
      const bridgeAmountIn = amountIn * (1 - swapFee);
      const leg1: RouteLeg = {
        sourceId: `${fromToken.chainId}-source-dex`,
        fromChainId: fromToken.chainId,
        toChainId: fromToken.chainId,
        fromToken,
        toToken: { ...fromToken, symbol: 'USDC', name: 'USD Coin', address: '0xusdc' },
        amountIn,
        amountOut: bridgeAmountIn,
        feeUsd: amountIn * swapFee,
        estimatedTimeMs: 15000,
        priceImpact: swapSlippage,
      };

      // Leg 2: bridge transfer
      const afterBridge = bridgeAmountIn * (1 - bridgeFee) * (1 - bridgeSlippage);
      const leg2: RouteLeg = {
        sourceId: bridge.id,
        fromChainId: fromToken.chainId,
        toChainId: toToken.chainId,
        fromToken: leg1.toToken,
        toToken: { ...leg1.toToken, chainId: toToken.chainId },
        amountIn: bridgeAmountIn,
        amountOut: afterBridge,
        feeUsd: bridgeAmountIn * bridgeFee,
        estimatedTimeMs: bridge.responseTimeMs,
        priceImpact: bridgeSlippage,
      };

      // Leg 3: swap on destination chain
      const finalAmount = afterBridge * (1 - swapFee) * (1 - swapSlippage);
      const leg3: RouteLeg = {
        sourceId: `${toToken.chainId}-dest-dex`,
        fromChainId: toToken.chainId,
        toChainId: toToken.chainId,
        fromToken: leg2.toToken,
        toToken,
        amountIn: afterBridge,
        amountOut: finalAmount,
        feeUsd: afterBridge * swapFee,
        estimatedTimeMs: 12000,
        priceImpact: swapSlippage,
      };

      const totalFee = leg1.feeUsd + leg2.feeUsd + leg3.feeUsd;
      const totalGas = 2.5 + i * 0.5;
      const totalTime = leg1.estimatedTimeMs + leg2.estimatedTimeMs + leg3.estimatedTimeMs;

      const routeId = `xchain_route_${i}_${Date.now()}`;
      return {
        id: routeId,
        legs: [leg1, leg2, leg3],
        totalAmountIn: amountIn,
        totalAmountOut: finalAmount,
        totalFeeUsd: totalFee,
        totalGasUsd: totalGas,
        estimatedTimeMs: totalTime,
        priceImpact: swapSlippage + bridgeSlippage,
        mode,
        score: 0,
        createdAt: new Date(),
      } satisfies TradeRoute;
    });
  }

  private buildFallbackRoute(
    fromToken: CrossChainToken,
    toToken: CrossChainToken,
    amountIn: number
  ): TradeRoute {
    const leg: RouteLeg = {
      sourceId: 'fallback',
      fromChainId: fromToken.chainId,
      toChainId: toToken.chainId,
      fromToken,
      toToken,
      amountIn,
      amountOut: amountIn * 0.99,
      feeUsd: amountIn * 0.003,
      estimatedTimeMs: 30000,
      priceImpact: 0.005,
    };

    return {
      id: `fallback_${Date.now()}`,
      legs: [leg],
      totalAmountIn: amountIn,
      totalAmountOut: leg.amountOut,
      totalFeeUsd: leg.feeUsd,
      totalGasUsd: 1.0,
      estimatedTimeMs: leg.estimatedTimeMs,
      priceImpact: leg.priceImpact,
      mode: 'best_price',
      score: 0,
      createdAt: new Date(),
    };
  }

  private scoreRoute(route: TradeRoute, mode: AggregationMode): number {
    // Higher score = better route
    const outputScore = route.totalAmountOut / route.totalAmountIn;
    const feeScore = 1 - route.totalFeeUsd / route.totalAmountIn;
    const gasScore = 1 - Math.min(route.totalGasUsd / route.totalAmountIn, 0.1);
    const speedScore = 1 - Math.min(route.estimatedTimeMs / 300_000, 1);
    const impactScore = 1 - Math.min(route.priceImpact, 0.1);

    switch (mode) {
      case 'best_price':
        return outputScore * 0.6 + feeScore * 0.2 + gasScore * 0.1 + impactScore * 0.1;
      case 'lowest_gas':
        return gasScore * 0.5 + feeScore * 0.3 + outputScore * 0.2;
      case 'min_slippage':
        return impactScore * 0.5 + outputScore * 0.3 + feeScore * 0.2;
      case 'split_optimal':
        return outputScore * 0.4 + feeScore * 0.3 + gasScore * 0.15 + impactScore * 0.15;
      case 'max_liquidity':
        return outputScore * 0.5 + feeScore * 0.25 + gasScore * 0.25;
      default:
        return outputScore;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a liquidity aggregation engine.
 */
export function createLiquidityAggregationEngine(
  registry: CrossChainConnectorRegistry,
  mode?: AggregationMode
): DefaultLiquidityAggregationEngine {
  return new DefaultLiquidityAggregationEngine(registry, mode);
}
