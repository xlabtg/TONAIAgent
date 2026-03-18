/**
 * TONAIAgent - Cross-DEX Liquidity Router Tests
 *
 * Comprehensive tests covering:
 * - DEX Discovery (concurrent quote fetching, partial failures)
 * - Price Comparator (ranking, quality filters)
 * - Route Optimizer (single-hop, multi-hop, scoring)
 * - LiquidityRouter (end-to-end routing, pair resolution, execution plan)
 *
 * @see Issue #237 — Cross-DEX Liquidity Router
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createDexDiscovery,
  createPriceComparator,
  createRouteOptimizer,
  createLiquidityRouter,
  LiquidityRouterError,
  DEFAULT_LIQUIDITY_ROUTER_CONFIG,
  type DexQuoteFetcher,
  type DexQuote,
  type LiquidityPool,
  type PriceComparison,
} from '../../connectors/liquidity-router/index';

// ============================================================================
// Test Fixtures
// ============================================================================

function makeQuote(overrides: Partial<DexQuote> = {}): DexQuote {
  return {
    dex: 'stonfi',
    poolAddress: 'EQpool1',
    tokenIn: 'USDT',
    tokenOut: 'TON',
    amountIn: '100000000',        // 100 USDT (6 decimals)
    expectedAmountOut: '47300000000', // 47.3 TON (9 decimals)
    executionPrice: 0.473,
    priceImpactPercent: 0.5,
    slippagePercent: 0.5,
    liquidityUsd: 150_000,
    feePercent: 0.3,
    minimumAmountOut: '47063350000',
    timestamp: 1710000000,
    ...overrides,
  };
}

function makePool(overrides: Partial<LiquidityPool> = {}): LiquidityPool {
  return {
    poolAddress: 'EQpool1',
    dex: 'stonfi',
    tokenA: 'USDT',
    tokenB: 'TON',
    tvlUsd: 150_000,
    volume24hUsd: 50_000,
    feePercent: 0.3,
    discoveredAt: 1710000000,
    ...overrides,
  };
}

/** Mock DexQuoteFetcher that returns configurable responses per DEX. */
function makeMockFetcher(
  quotesByDex: Record<string, DexQuote | null>,
  poolsByDex: Record<string, LiquidityPool[]> = {}
): DexQuoteFetcher {
  return {
    fetchQuote: vi.fn(async ({ dex }) => quotesByDex[dex] ?? null),
    discoverPools: vi.fn(async ({ dex }) => poolsByDex[dex] ?? []),
  };
}

// ============================================================================
// DexDiscovery Tests
// ============================================================================

describe('DexDiscovery', () => {
  describe('successful discovery', () => {
    it('collects quotes from all enabled DEXs', async () => {
      const fetcher = makeMockFetcher({
        dedust: makeQuote({ dex: 'dedust', expectedAmountOut: '47100000000' }),
        stonfi: makeQuote({ dex: 'stonfi', expectedAmountOut: '47300000000' }),
        tonco: makeQuote({ dex: 'tonco', expectedAmountOut: '47500000000' }),
      });
      const discovery = createDexDiscovery(fetcher);

      const snapshot = await discovery.discover({
        tokenIn: 'USDT',
        tokenOut: 'TON',
        amountIn: '100000000',
        slippageTolerance: 0.5,
        enabledDexes: ['dedust', 'stonfi', 'tonco'],
      });

      expect(snapshot.quotes).toHaveLength(3);
      expect(snapshot.quotes.map(q => q.dex)).toEqual(
        expect.arrayContaining(['dedust', 'stonfi', 'tonco'])
      );
      expect(snapshot.discoveryDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('collects pool data from all enabled DEXs', async () => {
      const fetcher = makeMockFetcher(
        {
          stonfi: makeQuote({ dex: 'stonfi' }),
        },
        {
          stonfi: [makePool({ dex: 'stonfi' }), makePool({ dex: 'stonfi', poolAddress: 'EQpool2' })],
        }
      );
      const discovery = createDexDiscovery(fetcher);

      const snapshot = await discovery.discover({
        tokenIn: 'USDT',
        tokenOut: 'TON',
        amountIn: '100000000',
        slippageTolerance: 0.5,
        enabledDexes: ['stonfi'],
      });

      expect(snapshot.pools).toHaveLength(2);
    });

    it('handles partial failures gracefully (some DEXs return null)', async () => {
      const fetcher = makeMockFetcher({
        dedust: null,                  // DEX unreachable
        stonfi: makeQuote({ dex: 'stonfi' }),
        tonco: null,
      });
      const discovery = createDexDiscovery(fetcher);

      const snapshot = await discovery.discover({
        tokenIn: 'USDT',
        tokenOut: 'TON',
        amountIn: '100000000',
        slippageTolerance: 0.5,
        enabledDexes: ['dedust', 'stonfi', 'tonco'],
      });

      // Should succeed with the one quote that came back
      expect(snapshot.quotes).toHaveLength(1);
      expect(snapshot.quotes[0].dex).toBe('stonfi');
    });

    it('records discoveredAt as Unix timestamp', async () => {
      const beforeTs = Math.floor(Date.now() / 1000);
      const fetcher = makeMockFetcher({ stonfi: makeQuote({ dex: 'stonfi' }) });
      const discovery = createDexDiscovery(fetcher);

      const snapshot = await discovery.discover({
        tokenIn: 'USDT',
        tokenOut: 'TON',
        amountIn: '100000000',
        slippageTolerance: 0.5,
        enabledDexes: ['stonfi'],
      });

      expect(snapshot.discoveredAt).toBeGreaterThanOrEqual(beforeTs);
    });
  });

  describe('error handling', () => {
    it('throws DISCOVERY_FAILED when all DEXs return no quotes', async () => {
      const fetcher = makeMockFetcher({
        dedust: null,
        stonfi: null,
        tonco: null,
      });
      const discovery = createDexDiscovery(fetcher);

      await expect(
        discovery.discover({
          tokenIn: 'USDT',
          tokenOut: 'TON',
          amountIn: '100000000',
          slippageTolerance: 0.5,
          enabledDexes: ['dedust', 'stonfi', 'tonco'],
        })
      ).rejects.toThrow(LiquidityRouterError);

      await expect(
        discovery.discover({
          tokenIn: 'USDT',
          tokenOut: 'TON',
          amountIn: '100000000',
          slippageTolerance: 0.5,
          enabledDexes: ['dedust', 'stonfi', 'tonco'],
        })
      ).rejects.toMatchObject({ code: 'DISCOVERY_FAILED' });
    });
  });
});

// ============================================================================
// PriceComparator Tests
// ============================================================================

describe('PriceComparator', () => {
  let quotes: DexQuote[];

  beforeEach(() => {
    quotes = [
      makeQuote({ dex: 'dedust', expectedAmountOut: '47100000000', liquidityUsd: 200_000, priceImpactPercent: 0.3 }),
      makeQuote({ dex: 'stonfi', expectedAmountOut: '47300000000', liquidityUsd: 150_000, priceImpactPercent: 0.5 }),
      makeQuote({ dex: 'tonco',  expectedAmountOut: '47500000000', liquidityUsd: 50_000,  priceImpactPercent: 1.2 }),
    ];
  });

  describe('ranking', () => {
    it('ranks quotes by highest expected output', () => {
      const comparator = createPriceComparator({ minLiquidityUsd: 0 });
      const comparison = comparator.compare(quotes);

      // Highest output (47500) should be rank 1, but only if it passes filters
      expect(comparison.bestQuote.dex).toBe('tonco'); // highest output wins
      expect(comparison.rankedQuotes[0].dex).toBe('tonco');
    });

    it('filters out quotes below minimum liquidity threshold', () => {
      // Set minLiquidityUsd above tonco's liquidity
      const comparator = createPriceComparator({ minLiquidityUsd: 100_000 });
      const comparison = comparator.compare(quotes);

      // tonco ($50k) should be excluded; stonfi ($150k) wins
      expect(comparison.rankedQuotes.some(q => q.dex === 'tonco')).toBe(false);
    });

    it('falls back to unfiltered quotes when all fail quality check', () => {
      const comparator = createPriceComparator({
        minLiquidityUsd: 999_999_999, // impossibly high
      });

      // Should not throw - falls back to all quotes
      const comparison = comparator.compare(quotes);
      expect(comparison.rankedQuotes.length).toBeGreaterThan(0);
    });

    it('returns summary with correct rank numbers', () => {
      const comparator = createPriceComparator({ minLiquidityUsd: 0 });
      const comparison = comparator.compare(quotes);

      comparison.summary.forEach((row, index) => {
        expect(row.rank).toBe(index + 1);
      });
    });
  });

  describe('formatSummary', () => {
    it('produces a formatted table string', () => {
      const comparator = createPriceComparator({ minLiquidityUsd: 0 });
      const comparison = comparator.compare(quotes);
      const table = comparator.formatSummary(comparison);

      expect(typeof table).toBe('string');
      expect(table).toContain('DEX');
      expect(table).toContain('BEST');
    });
  });

  describe('error handling', () => {
    it('throws NO_ROUTES for empty quotes array', () => {
      const comparator = createPriceComparator();
      expect(() => comparator.compare([])).toThrow(LiquidityRouterError);
      expect(() => comparator.compare([])).toThrow(
        expect.objectContaining({ code: 'NO_ROUTES' })
      );
    });
  });

  describe('tie-breaking', () => {
    it('breaks tie by lowest price impact', () => {
      const tiedQuotes: DexQuote[] = [
        makeQuote({ dex: 'dedust', expectedAmountOut: '47300000000', priceImpactPercent: 0.8, liquidityUsd: 100_000 }),
        makeQuote({ dex: 'stonfi', expectedAmountOut: '47300000000', priceImpactPercent: 0.3, liquidityUsd: 100_000 }),
      ];
      const comparator = createPriceComparator({ minLiquidityUsd: 0 });
      const comparison = comparator.compare(tiedQuotes);

      expect(comparison.bestQuote.dex).toBe('stonfi'); // lower price impact wins
    });
  });
});

// ============================================================================
// RouteOptimizer Tests
// ============================================================================

describe('RouteOptimizer', () => {
  let comparison: PriceComparison;

  beforeEach(() => {
    const comparator = createPriceComparator({ minLiquidityUsd: 0 });
    comparison = comparator.compare([
      makeQuote({ dex: 'dedust', expectedAmountOut: '47100000000', liquidityUsd: 200_000 }),
      makeQuote({ dex: 'stonfi', expectedAmountOut: '47300000000', liquidityUsd: 150_000 }),
      makeQuote({ dex: 'tonco',  expectedAmountOut: '47500000000', liquidityUsd: 50_000  }),
    ]);
  });

  describe('single-hop optimization', () => {
    it('selects the route with highest net output', () => {
      const optimizer = createRouteOptimizer({ enableMultiHop: false });
      const result = optimizer.optimize(comparison);

      expect(result.bestRoute.type).toBe('single');
      if (result.bestRoute.type === 'single') {
        expect(result.bestRoute.quote.expectedAmountOut).toBe('47500000000');
      }
    });

    it('returns all candidate routes', () => {
      const optimizer = createRouteOptimizer({ enableMultiHop: false });
      const result = optimizer.optimize(comparison);

      // One single-hop route per DEX quote
      expect(result.candidates.length).toBeGreaterThanOrEqual(3);
    });

    it('includes a human-readable selection reason', () => {
      const optimizer = createRouteOptimizer({ enableMultiHop: false });
      const result = optimizer.optimize(comparison);

      expect(result.selectionReason).toBeTruthy();
      expect(typeof result.selectionReason).toBe('string');
    });
  });

  describe('multi-hop optimization', () => {
    it('builds multi-hop routes when enabled and leg2 quotes provided', () => {
      const optimizer = createRouteOptimizer({ enableMultiHop: true });

      // Leg 2: TON → NOT (requires TON as tokenIn)
      const leg2Quotes: DexQuote[] = [
        makeQuote({ dex: 'dedust', tokenIn: 'TON', tokenOut: 'NOT', amountIn: '47500000000', expectedAmountOut: '950000000000', liquidityUsd: 80_000 }),
      ];

      const result = optimizer.optimize(comparison, leg2Quotes);

      const multiHopRoutes = result.candidates.filter(r => r.type === 'multi');
      expect(multiHopRoutes.length).toBeGreaterThan(0);
    });

    it('does not build multi-hop when disabled', () => {
      const optimizer = createRouteOptimizer({ enableMultiHop: false });
      const leg2Quotes: DexQuote[] = [
        makeQuote({ dex: 'dedust', tokenIn: 'TON', tokenOut: 'NOT', amountIn: '47500000000', expectedAmountOut: '950000000000', liquidityUsd: 80_000 }),
      ];

      const result = optimizer.optimize(comparison, leg2Quotes);

      const multiHopRoutes = result.candidates.filter(r => r.type === 'multi');
      expect(multiHopRoutes.length).toBe(0);
    });
  });
});

// ============================================================================
// LiquidityRouter End-to-End Tests
// ============================================================================

describe('LiquidityRouter', () => {
  function makeRouter(quotesByDex: Record<string, DexQuote | null>) {
    const fetcher = makeMockFetcher(quotesByDex);
    return createLiquidityRouter({ minLiquidityUsd: 0 }, fetcher);
  }

  describe('BUY routing', () => {
    it('routes BUY TON/USDT correctly (spend USDT, receive TON)', async () => {
      const router = makeRouter({
        dedust: makeQuote({ dex: 'dedust', tokenIn: 'USDT', tokenOut: 'TON', expectedAmountOut: '47100000000' }),
        stonfi: makeQuote({ dex: 'stonfi', tokenIn: 'USDT', tokenOut: 'TON', expectedAmountOut: '47300000000' }),
        tonco:  makeQuote({ dex: 'tonco',  tokenIn: 'USDT', tokenOut: 'TON', expectedAmountOut: '47500000000' }),
      });

      const plan = await router.route({ pair: 'TON/USDT', action: 'BUY', amount: '100' });

      expect(plan.pair).toBe('TON/USDT');
      expect(plan.amountIn).toBe(100);
      expect(plan.expectedOut).toBeGreaterThan(0);
      expect(plan.slippage).toContain('%');
      expect(['dedust', 'stonfi', 'tonco']).toContain(plan.dex);
    });
  });

  describe('SELL routing', () => {
    it('routes SELL TON/USDT correctly (spend TON, receive USDT)', async () => {
      const router = makeRouter({
        dedust: makeQuote({ dex: 'dedust', tokenIn: 'TON', tokenOut: 'USDT', amountIn: '10000000000', expectedAmountOut: '21100000' }),
        stonfi: makeQuote({ dex: 'stonfi', tokenIn: 'TON', tokenOut: 'USDT', amountIn: '10000000000', expectedAmountOut: '21090000' }),
        tonco:  makeQuote({ dex: 'tonco',  tokenIn: 'TON', tokenOut: 'USDT', amountIn: '10000000000', expectedAmountOut: '21120000' }),
      });

      const plan = await router.route({ pair: 'TON/USDT', action: 'SELL', amount: '10' });

      expect(plan.pair).toBe('TON/USDT');
      expect(plan.amountIn).toBe(10);
    });
  });

  describe('execution plan structure', () => {
    it('returns a complete execution plan matching the issue spec', async () => {
      const router = makeRouter({
        stonfi: makeQuote({
          dex: 'stonfi',
          tokenIn: 'USDT',
          tokenOut: 'TON',
          expectedAmountOut: '47300000000',
          liquidityUsd: 150_000,
        }),
      });

      const plan = await router.route({ pair: 'TON/USDT', action: 'BUY', amount: '100' });

      // Fields required by issue spec
      expect(plan).toMatchObject({
        dex: expect.stringMatching(/^(dedust|stonfi|tonco)$/),
        pair: 'TON/USDT',
        amountIn: 100,
        expectedOut: expect.any(Number),
        slippage: expect.stringContaining('%'),
      });

      // Extended fields
      expect(plan.route).toBeDefined();
      expect(plan.candidates).toBeInstanceOf(Array);
      expect(plan.selectionReason).toBeTruthy();
      expect(plan.generatedAt).toBeGreaterThan(0);
    });
  });

  describe('default configuration', () => {
    it('uses all three DEXs by default', () => {
      const router = createLiquidityRouter();
      const config = router.getConfig();

      expect(config.enabledDexes).toEqual(
        expect.arrayContaining(['dedust', 'stonfi', 'tonco'])
      );
    });

    it('exposes correct default values', () => {
      const router = createLiquidityRouter();
      const config = router.getConfig();

      expect(config.slippageTolerance).toBe(DEFAULT_LIQUIDITY_ROUTER_CONFIG.slippageTolerance);
      expect(config.enableMultiHop).toBe(false);
    });
  });

  describe('slippage tolerance override', () => {
    it('respects per-request slippage override', async () => {
      const router = makeRouter({
        stonfi: makeQuote({ dex: 'stonfi', tokenIn: 'USDT', tokenOut: 'TON' }),
      });

      const plan = await router.route({
        pair: 'TON/USDT',
        action: 'BUY',
        amount: '100',
        slippageTolerance: 1.5,
      });

      expect(plan.slippage).toBe('1.5%');
    });
  });

  describe('error handling', () => {
    it('throws INVALID_PAIR for malformed pair format', async () => {
      const router = makeRouter({});

      await expect(
        router.route({ pair: 'TONUSDT', action: 'BUY', amount: '100' })
      ).rejects.toMatchObject({ code: 'INVALID_PAIR' });
    });

    it('throws DISCOVERY_FAILED when all DEXs fail', async () => {
      const router = makeRouter({
        dedust: null,
        stonfi: null,
        tonco: null,
      });

      await expect(
        router.route({ pair: 'TON/USDT', action: 'BUY', amount: '100' })
      ).rejects.toMatchObject({ code: 'DISCOVERY_FAILED' });
    });

    it('succeeds with partial DEX failures', async () => {
      const router = makeRouter({
        dedust: null,
        stonfi: makeQuote({ dex: 'stonfi', tokenIn: 'USDT', tokenOut: 'TON' }),
        tonco: null,
      });

      const plan = await router.route({ pair: 'TON/USDT', action: 'BUY', amount: '100' });
      expect(plan.dex).toBe('stonfi');
    });
  });

  describe('discoverLiquidity', () => {
    it('returns a liquidity snapshot without performing routing', async () => {
      const fetcher = makeMockFetcher(
        { stonfi: makeQuote({ dex: 'stonfi' }) },
        { stonfi: [makePool()] }
      );
      const router = createLiquidityRouter({ minLiquidityUsd: 0 }, fetcher);

      const snapshot = await router.discoverLiquidity('USDT', 'TON');

      expect(snapshot.quotes).toBeDefined();
      expect(snapshot.pools).toBeDefined();
      expect(snapshot.discoveredAt).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// LiquidityRouterError Tests
// ============================================================================

describe('LiquidityRouterError', () => {
  it('creates error with correct properties', () => {
    const err = new LiquidityRouterError(
      'No routes available',
      'NO_ROUTES',
      { pair: 'TON/USDT' }
    );

    expect(err.message).toBe('No routes available');
    expect(err.code).toBe('NO_ROUTES');
    expect(err.metadata).toEqual({ pair: 'TON/USDT' });
    expect(err.name).toBe('LiquidityRouterError');
  });

  it('is instanceof Error', () => {
    const err = new LiquidityRouterError('test', 'NO_ROUTES');
    expect(err instanceof Error).toBe(true);
  });
});
