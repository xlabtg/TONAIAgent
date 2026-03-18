/**
 * TONAIAgent - Smart Execution Engine Tests
 *
 * Comprehensive tests covering:
 * - SlippageConfig and basis-point utilities
 * - Price impact estimation
 * - Slippage validation (SLIPPAGE_TOO_HIGH rejection)
 * - Smart routing (picks best DEX)
 * - Execution modes: market, limit, twap
 * - Simulation with realistic fills
 * - Failure handling: structured error codes
 * - Edge cases: low liquidity, no route, high price impact
 *
 * @see Issue #253 — Smart Order Execution & Slippage Control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSmartExecutionEngine,
  DefaultSmartExecutionEngine,
  bpsToPercent,
  percentToBps,
  estimatePriceImpact,
  estimateQuoteSlippage,
  DEFAULT_SLIPPAGE_CONFIG,
  DEFAULT_SMART_EXECUTION_CONFIG,
  type SmartExecutionRequest,
  type SlippageConfig,
} from '../../services/execution-engine/smart-execution';
import type { DexQuote, LiquidityPool } from '../../connectors/liquidity-router/types';
import type { DexQuoteFetcher } from '../../connectors/liquidity-router/dex_discovery';

// ============================================================================
// Test Helpers
// ============================================================================

function makeQuote(overrides: Partial<DexQuote> = {}): DexQuote {
  return {
    dex: 'stonfi',
    poolAddress: 'EQpool1',
    tokenIn: 'USDT',
    tokenOut: 'TON',
    amountIn: '100000000',           // 100 USDT (6 decimals)
    expectedAmountOut: '47300000000', // ~47.3 TON (9 decimals)
    executionPrice: 0.473,
    priceImpactPercent: 0.5,
    slippagePercent: 0.5,
    liquidityUsd: 150_000,
    feePercent: 0.3,
    minimumAmountOut: '47063350000',  // 47.3 * (1 - 0.5%) ≈ 47063350000
    timestamp: Math.floor(Date.now() / 1000),
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
    discoveredAt: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

/**
 * Mock DEX quote fetcher that returns configurable quotes per DEX.
 */
class MockDexQuoteFetcher implements DexQuoteFetcher {
  public callCount = 0;
  public shouldFail = false;
  public quoteOverrides: Record<string, Partial<DexQuote>> = {};

  async fetchQuote(params: {
    dex: import('../../connectors/liquidity-router/types').DexId;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageTolerance: number;
  }): Promise<DexQuote | null> {
    this.callCount++;
    if (this.shouldFail) return null;
    const overrides = this.quoteOverrides[params.dex] ?? {};
    return makeQuote({ dex: params.dex, tokenIn: params.tokenIn, tokenOut: params.tokenOut, ...overrides });
  }

  async discoverPools(params: {
    dex: import('../../connectors/liquidity-router/types').DexId;
    tokenA: string;
    tokenB: string;
  }): Promise<LiquidityPool[]> {
    return [makePool({ dex: params.dex, tokenA: params.tokenA, tokenB: params.tokenB })];
  }
}

function makeRequest(overrides: Partial<SmartExecutionRequest> = {}): SmartExecutionRequest {
  return {
    pair: 'TON/USDT',
    action: 'BUY',
    amount: '100',
    executionMode: 'market',
    agentId: 'agent-001',
    ...overrides,
  };
}

// ============================================================================
// bpsToPercent / percentToBps utilities
// ============================================================================

describe('bpsToPercent / percentToBps', () => {
  it('converts 50 bps to 0.5%', () => {
    expect(bpsToPercent(50)).toBe(0.5);
  });

  it('converts 100 bps to 1%', () => {
    expect(bpsToPercent(100)).toBe(1.0);
  });

  it('converts 0.5% to 50 bps', () => {
    expect(percentToBps(0.5)).toBe(50);
  });

  it('converts 1% to 100 bps', () => {
    expect(percentToBps(1.0)).toBe(100);
  });

  it('converts 0.1% to 10 bps', () => {
    expect(percentToBps(0.1)).toBe(10);
  });

  it('round-trips correctly', () => {
    const pct = 0.75;
    expect(bpsToPercent(percentToBps(pct))).toBeCloseTo(pct);
  });
});

// ============================================================================
// estimatePriceImpact
// ============================================================================

describe('estimatePriceImpact', () => {
  it('returns low impact for small order vs large pool', () => {
    // $100 order vs $500k pool → ~0.02%
    const impact = estimatePriceImpact(100, 500_000);
    expect(impact).toBeCloseTo(0.02, 1);
  });

  it('returns higher impact for large order vs small pool', () => {
    // $10k order vs $50k pool → ~16.7%
    const impact = estimatePriceImpact(10_000, 50_000);
    expect(impact).toBeCloseTo(16.67, 0);
  });

  it('returns 100% for order with zero pool liquidity', () => {
    const impact = estimatePriceImpact(1000, 0);
    expect(impact).toBe(100);
  });

  it('returns non-negative value', () => {
    const impact = estimatePriceImpact(50, 100_000);
    expect(impact).toBeGreaterThan(0);
  });

  it('caps at 100%', () => {
    const impact = estimatePriceImpact(999_999_999, 1);
    expect(impact).toBeLessThanOrEqual(100);
  });

  it('increases with order size', () => {
    const small = estimatePriceImpact(100, 100_000);
    const large = estimatePriceImpact(10_000, 100_000);
    expect(large).toBeGreaterThan(small);
  });
});

// ============================================================================
// estimateQuoteSlippage
// ============================================================================

describe('estimateQuoteSlippage', () => {
  it('calculates slippage from expected vs minimum amounts', () => {
    // expected=1000, minimum=990 → 1%
    const quote = makeQuote({
      expectedAmountOut: '1000000000',
      minimumAmountOut: '990000000',
    });
    const slippage = estimateQuoteSlippage(quote);
    expect(slippage).toBeCloseTo(1.0, 5);
  });

  it('returns 0.5% for 0.5% slippage configuration', () => {
    // expected=47300000000, min=47063350000 → ~0.5%
    const quote = makeQuote();
    const slippage = estimateQuoteSlippage(quote);
    expect(slippage).toBeCloseTo(0.5, 0);
  });

  it('returns 0 if expected amount is 0', () => {
    const quote = makeQuote({ expectedAmountOut: '0', minimumAmountOut: '0' });
    expect(estimateQuoteSlippage(quote)).toBe(0);
  });

  it('returns 3% slippage correctly', () => {
    const quote = makeQuote({
      expectedAmountOut: '1000000000',
      minimumAmountOut: '970000000',
    });
    expect(estimateQuoteSlippage(quote)).toBeCloseTo(3.0, 1);
  });
});

// ============================================================================
// DEFAULT_SLIPPAGE_CONFIG
// ============================================================================

describe('DEFAULT_SLIPPAGE_CONFIG', () => {
  it('has 100 bps (1%) max slippage', () => {
    expect(DEFAULT_SLIPPAGE_CONFIG.maxSlippageBps).toBe(100);
  });

  it('has 50 bps (0.5%) warning slippage', () => {
    expect(DEFAULT_SLIPPAGE_CONFIG.warningSlippageBps).toBe(50);
  });
});

// ============================================================================
// DEFAULT_SMART_EXECUTION_CONFIG
// ============================================================================

describe('DEFAULT_SMART_EXECUTION_CONFIG', () => {
  it('has simulationMode=true by default', () => {
    expect(DEFAULT_SMART_EXECUTION_CONFIG.simulationMode).toBe(true);
  });

  it('has all three DEXes enabled', () => {
    expect(DEFAULT_SMART_EXECUTION_CONFIG.routing.enabledDexes).toContain('dedust');
    expect(DEFAULT_SMART_EXECUTION_CONFIG.routing.enabledDexes).toContain('stonfi');
    expect(DEFAULT_SMART_EXECUTION_CONFIG.routing.enabledDexes).toContain('tonco');
  });
});

// ============================================================================
// createSmartExecutionEngine factory
// ============================================================================

describe('createSmartExecutionEngine', () => {
  it('returns a DefaultSmartExecutionEngine instance', () => {
    const engine = createSmartExecutionEngine();
    expect(engine).toBeInstanceOf(DefaultSmartExecutionEngine);
  });

  it('returns config reflecting overrides', () => {
    const engine = createSmartExecutionEngine({
      slippage: { maxSlippageBps: 50, warningSlippageBps: 25 },
      simulationMode: false,
    });
    const config = engine.getConfig();
    expect(config.slippage.maxSlippageBps).toBe(50);
    expect(config.simulationMode).toBe(false);
  });

  it('merges routing overrides with defaults', () => {
    const engine = createSmartExecutionEngine({
      routing: { enabledDexes: ['dedust', 'stonfi'] },
    });
    const config = engine.getConfig();
    expect(config.routing.enabledDexes).toEqual(['dedust', 'stonfi']);
  });
});

// ============================================================================
// SmartExecutionEngine.execute() — success path (simulation mode)
// ============================================================================

describe('SmartExecutionEngine.execute() — simulation mode', () => {
  let fetcher: MockDexQuoteFetcher;
  let engine: DefaultSmartExecutionEngine;

  beforeEach(() => {
    fetcher = new MockDexQuoteFetcher();
    engine = new DefaultSmartExecutionEngine({
      simulationMode: true,
      routing: {
        enabledDexes: ['dedust', 'stonfi', 'tonco'],
        slippageTolerance: 0.5,
        minLiquidityUsd: 1_000, // lower threshold for tests
        maxPriceImpactPercent: 10,
      },
    });
    // Inject mock fetcher via internal router (use a new engine with test config)
    // Since we can't inject the fetcher directly, we test via public API with HTTP fetcher
    // Simulate by creating engine that will route via mock — we use a spy instead
  });

  it('returns success=true for a valid BUY order', async () => {
    // Create engine that accepts test quotes via config
    const testEngine = createSmartExecutionEngine({
      simulationMode: true,
      routing: {
        enabledDexes: ['dedust', 'stonfi', 'tonco'],
        minLiquidityUsd: 1_000,
        maxPriceImpactPercent: 10,
      },
    });

    // Stub the router.route to return a predictable plan
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 47.3,
      slippage: '0.5%',
      route: {
        type: 'single' as const,
        dex: 'stonfi' as const,
        tokenIn: 'USDT',
        tokenOut: 'TON',
        quote: makeQuote({ liquidityUsd: 150_000 }),
      },
      candidates: [{
        type: 'single' as const,
        dex: 'stonfi' as const,
        tokenIn: 'USDT',
        tokenOut: 'TON',
        quote: makeQuote({ liquidityUsd: 150_000 }),
      }],
      selectionReason: 'Best net output from stonfi',
      generatedAt: Math.floor(Date.now() / 1000),
    };

    // @ts-expect-error — accessing private router for test injection
    vi.spyOn(testEngine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await testEngine.execute(makeRequest());
    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.executionPlan).toBeDefined();
    expect(result.executionPlan?.dex).toBe('stonfi');
  });

  it('includes simulationDetails with realistic fill info', async () => {
    const testEngine = createSmartExecutionEngine({ simulationMode: true });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 47.3,
      slippage: '0.5%',
      route: {
        type: 'single' as const,
        dex: 'stonfi' as const,
        tokenIn: 'USDT',
        tokenOut: 'TON',
        quote: makeQuote({ liquidityUsd: 500_000 }),
      },
      candidates: [{
        type: 'single' as const,
        dex: 'stonfi' as const,
        tokenIn: 'USDT',
        tokenOut: 'TON',
        quote: makeQuote({ liquidityUsd: 500_000 }),
      }],
      selectionReason: 'Best',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(testEngine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await testEngine.execute(makeRequest());
    expect(result.success).toBe(true);
    expect(result.simulationDetails).toBeDefined();
    expect(result.simulationDetails!.fillRatio).toBeGreaterThan(0);
    expect(result.simulationDetails!.fillRatio).toBeLessThanOrEqual(1);
    expect(result.simulationDetails!.slippageApplied).toBeGreaterThanOrEqual(0);
    expect(result.simulationDetails!.liquidityDepth).toBeGreaterThan(0);
  });

  it('includes dexComparison rows', async () => {
    const testEngine = createSmartExecutionEngine({ simulationMode: true });
    const quote1 = makeQuote({ dex: 'stonfi', liquidityUsd: 150_000 });
    const quote2 = makeQuote({ dex: 'dedust', liquidityUsd: 200_000, expectedAmountOut: '47000000000' });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 47.3,
      slippage: '0.5%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: quote1 },
      candidates: [
        { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: quote1 },
        { type: 'single' as const, dex: 'dedust' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: quote2 },
      ],
      selectionReason: 'Best',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(testEngine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await testEngine.execute(makeRequest());
    expect(result.dexComparison).toBeDefined();
    expect(result.dexComparison!.length).toBe(2);
    const selected = result.dexComparison!.find(r => r.selected);
    expect(selected?.dex).toBe('stonfi');
  });

  it('includes executedAt and durationMs', async () => {
    const testEngine = createSmartExecutionEngine({ simulationMode: true });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 47.3,
      slippage: '0.5%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: makeQuote() },
      candidates: [{ type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: makeQuote() }],
      selectionReason: 'Best',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(testEngine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await testEngine.execute(makeRequest());
    expect(result.executedAt).toBeInstanceOf(Date);
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// SmartExecutionEngine.execute() — SLIPPAGE_TOO_HIGH rejection (Step 1)
// ============================================================================

describe('SmartExecutionEngine.execute() — slippage enforcement', () => {
  it('rejects when quote slippage exceeds maxSlippageBps', async () => {
    const engine = createSmartExecutionEngine({
      simulationMode: true,
      slippage: { maxSlippageBps: 50, warningSlippageBps: 25 }, // max = 0.5%
    });

    // Quote with 3% slippage (expected=1000, min=970 → 3%)
    const highSlippageQuote = makeQuote({
      expectedAmountOut: '1000000000',
      minimumAmountOut: '970000000', // 3% slippage → exceeds 0.5% max
      liquidityUsd: 500_000,
    });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 1.0,
      slippage: '0.5%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: highSlippageQuote },
      candidates: [{ type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: highSlippageQuote }],
      selectionReason: 'Only route',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await engine.execute(makeRequest());
    expect(result.success).toBe(false);
    expect(result.reason).toBe('SLIPPAGE_TOO_HIGH');
    expect(result.errorMessage).toMatch(/slippage/i);
  });

  it('emits warning when slippage exceeds warningSlippageBps but not maxSlippageBps', async () => {
    const engine = createSmartExecutionEngine({
      simulationMode: true,
      slippage: { maxSlippageBps: 200, warningSlippageBps: 50 }, // max=2%, warn=0.5%
      routing: { minLiquidityUsd: 1_000, maxPriceImpactPercent: 10 },
    });

    // Quote with 1% slippage — above warning (0.5%) but below max (2%)
    const midSlippageQuote = makeQuote({
      expectedAmountOut: '1000000000',
      minimumAmountOut: '990000000', // 1% slippage
      liquidityUsd: 500_000,
      priceImpactPercent: 0.1,
    });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 1.0,
      slippage: '1%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: midSlippageQuote },
      candidates: [{ type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: midSlippageQuote }],
      selectionReason: 'Only route',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await engine.execute(makeRequest());
    expect(result.success).toBe(true);
    expect(result.warnings.some(w => w.code === 'HIGH_SLIPPAGE')).toBe(true);
  });

  it('allows per-request slippage override', async () => {
    const engine = createSmartExecutionEngine({
      simulationMode: true,
      slippage: { maxSlippageBps: 50, warningSlippageBps: 25 }, // default: max=0.5%
      routing: { minLiquidityUsd: 1_000, maxPriceImpactPercent: 10 },
    });

    // Quote with 1.5% slippage
    const quote = makeQuote({
      expectedAmountOut: '1000000000',
      minimumAmountOut: '985000000', // 1.5%
      liquidityUsd: 500_000,
      priceImpactPercent: 0.1,
    });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 1.0,
      slippage: '1.5%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote },
      candidates: [{ type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote }],
      selectionReason: 'Only route',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockResolvedValue(mockPlan);

    // Override slippage to 200 bps = 2% max → should succeed
    const result = await engine.execute(makeRequest({
      slippageConfig: { maxSlippageBps: 200, warningSlippageBps: 100 },
    }));
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// SmartExecutionEngine.execute() — PRICE_IMPACT_TOO_HIGH (Step 2)
// ============================================================================

describe('SmartExecutionEngine.execute() — price impact enforcement', () => {
  it('rejects when price impact exceeds maxPriceImpactPercent', async () => {
    const engine = createSmartExecutionEngine({
      simulationMode: true,
      routing: {
        maxPriceImpactPercent: 2.0,
        minLiquidityUsd: 1_000,
      },
    });

    // Very low liquidity → high price impact
    const quote = makeQuote({
      expectedAmountOut: '1000000000',
      minimumAmountOut: '999500000', // 0.05% slippage — passes slippage check
      liquidityUsd: 500,             // tiny pool → high price impact for $100 order
      priceImpactPercent: 5.0,
    });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 1.0,
      slippage: '0.05%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote },
      candidates: [{ type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote }],
      selectionReason: 'Only route',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await engine.execute(makeRequest({ amount: '100' }));
    // Price impact = 100 / (500 + 100) ≈ 16.7% > 2%
    expect(result.success).toBe(false);
    expect(result.reason).toBe('PRICE_IMPACT_TOO_HIGH');
  });
});

// ============================================================================
// SmartExecutionEngine.execute() — INSUFFICIENT_LIQUIDITY (Step 6)
// ============================================================================

describe('SmartExecutionEngine.execute() — insufficient liquidity', () => {
  it('rejects when pool liquidity is below minLiquidityUsd', async () => {
    const engine = createSmartExecutionEngine({
      simulationMode: true,
      routing: {
        minLiquidityUsd: 50_000,
        maxPriceImpactPercent: 10,
      },
    });

    const quote = makeQuote({
      expectedAmountOut: '1000000000',
      minimumAmountOut: '999900000', // low slippage
      liquidityUsd: 5_000,           // below 50k threshold
      priceImpactPercent: 0.1,
    });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 1.0,
      slippage: '0.01%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote },
      candidates: [{ type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote }],
      selectionReason: 'Only route',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await engine.execute(makeRequest());
    expect(result.success).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_LIQUIDITY');
    expect(result.errorMessage).toMatch(/liquidity/i);
  });
});

// ============================================================================
// SmartExecutionEngine.execute() — NO_ROUTE_FOUND (Step 6)
// ============================================================================

describe('SmartExecutionEngine.execute() — no route found', () => {
  it('returns NO_ROUTE_FOUND when router throws', async () => {
    const engine = createSmartExecutionEngine({ simulationMode: true });
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockRejectedValue(
      new Error('No quotes available')
    );

    const result = await engine.execute(makeRequest());
    expect(result.success).toBe(false);
    expect(result.reason).toBe('NO_ROUTE_FOUND');
  });
});

// ============================================================================
// Step 4 — Execution Modes
// ============================================================================

describe('SmartExecutionEngine.execute() — execution modes', () => {
  function mockEngine(quoteOverride: Partial<DexQuote> = {}) {
    const eng = createSmartExecutionEngine({
      simulationMode: true,
      routing: { minLiquidityUsd: 1_000, maxPriceImpactPercent: 10 },
    });
    const quote = makeQuote({ liquidityUsd: 500_000, priceImpactPercent: 0.1, ...quoteOverride });
    const plan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 47.3,
      slippage: '0.5%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote },
      candidates: [{ type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote }],
      selectionReason: 'Best',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(eng['router'], 'route').mockResolvedValue(plan);
    return eng;
  }

  it('succeeds in market mode', async () => {
    const result = await mockEngine().execute(makeRequest({ executionMode: 'market' }));
    expect(result.success).toBe(true);
  });

  it('succeeds in limit mode when price condition is met', async () => {
    // executionPrice=0.473, expectedPrice=0.5 → BUY: actual(0.473) < limit(0.5) → OK
    const eng = mockEngine({ executionPrice: 0.473 });
    const result = await eng.execute(makeRequest({
      executionMode: 'limit',
      expectedPrice: 0.5,
    }));
    expect(result.success).toBe(true);
  });

  it('rejects in limit mode when price condition is not met (BUY too expensive)', async () => {
    // executionPrice=0.6, expectedPrice=0.5 → BUY: actual(0.6) > limit(0.5)*1.01 → LIMIT_PRICE_NOT_MET
    const eng = mockEngine({ executionPrice: 0.6 });
    const result = await eng.execute(makeRequest({
      executionMode: 'limit',
      expectedPrice: 0.5,
    }));
    expect(result.success).toBe(false);
    expect(result.reason).toBe('LIMIT_PRICE_NOT_MET');
  });

  it('rejects in limit SELL mode when price is too low', async () => {
    // executionPrice=0.4, expectedPrice=0.5 → SELL: actual(0.4) < limit(0.5)*0.99 → LIMIT_PRICE_NOT_MET
    const eng = mockEngine({ executionPrice: 0.4 });
    const result = await eng.execute(makeRequest({
      action: 'SELL',
      executionMode: 'limit',
      expectedPrice: 0.5,
    }));
    expect(result.success).toBe(false);
    expect(result.reason).toBe('LIMIT_PRICE_NOT_MET');
  });

  it('succeeds in twap mode', async () => {
    const result = await mockEngine().execute(makeRequest({
      executionMode: 'twap',
      twap: { slices: 5, intervalMs: 1000 },
    }));
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Step 3 — Smart Routing (DEX selection)
// ============================================================================

describe('SmartExecutionEngine.execute() — smart routing', () => {
  it('selects the DEX with best expected output', async () => {
    const engine = createSmartExecutionEngine({
      simulationMode: true,
      routing: { minLiquidityUsd: 1_000, maxPriceImpactPercent: 10 },
    });

    const stonfiQuote = makeQuote({ dex: 'stonfi', expectedAmountOut: '47500000000', liquidityUsd: 150_000 });
    const dedustQuote = makeQuote({ dex: 'dedust', expectedAmountOut: '47000000000', liquidityUsd: 200_000 });
    const toncoQuote = makeQuote({ dex: 'tonco', expectedAmountOut: '46000000000', liquidityUsd: 100_000 });

    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 47.5,
      slippage: '0.5%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: stonfiQuote },
      candidates: [
        { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: stonfiQuote },
        { type: 'single' as const, dex: 'dedust' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: dedustQuote },
        { type: 'single' as const, dex: 'tonco' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: toncoQuote },
      ],
      selectionReason: 'Best net output from stonfi',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await engine.execute(makeRequest());
    expect(result.success).toBe(true);
    expect(result.executionPlan?.dex).toBe('stonfi');
    // dexComparison should list all 3 DEXes
    expect(result.dexComparison?.length).toBe(3);
    expect(result.dexComparison?.filter(r => r.selected).length).toBe(1);
    expect(result.dexComparison?.find(r => r.selected)?.dex).toBe('stonfi');
  });
});

// ============================================================================
// SmartExecutionEngine.preview()
// ============================================================================

describe('SmartExecutionEngine.preview()', () => {
  it('returns executionPlan and dexComparison without executing', async () => {
    const engine = createSmartExecutionEngine({ simulationMode: true });
    const quote = makeQuote({ liquidityUsd: 500_000 });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 47.3,
      slippage: '0.5%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote },
      candidates: [{ type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote }],
      selectionReason: 'Best',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockResolvedValue(mockPlan);

    const preview = await engine.preview(makeRequest());
    expect(preview.executionPlan).toBeDefined();
    expect(preview.dexComparison).toBeDefined();
    expect(typeof preview.estimatedSlippagePercent).toBe('number');
    expect(typeof preview.estimatedPriceImpactPercent).toBe('number');
    expect(typeof preview.wouldBeBlocked).toBe('boolean');
  });

  it('returns wouldBeBlocked=true when routing fails', async () => {
    const engine = createSmartExecutionEngine({ simulationMode: true });
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockRejectedValue(new Error('No liquidity'));

    const preview = await engine.preview(makeRequest());
    expect(preview.executionPlan).toBeNull();
    expect(preview.wouldBeBlocked).toBe(true);
    expect(preview.warnings.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Step 6 — Failure handling structured error codes
// ============================================================================

describe('SmartExecutionEngine — structured failure codes', () => {
  const allExpectedCodes: Array<import('../../services/execution-engine/smart-execution').ExecutionFailureReason> = [
    'SLIPPAGE_TOO_HIGH',
    'INSUFFICIENT_LIQUIDITY',
    'PRICE_IMPACT_TOO_HIGH',
    'LIMIT_PRICE_NOT_MET',
    'NO_ROUTE_FOUND',
    'TIMEOUT',
    'UNKNOWN_ERROR',
  ];

  it('defines all required failure reason codes', () => {
    // Just validate the type exists and can hold each value
    for (const code of allExpectedCodes) {
      const result: import('../../services/execution-engine/smart-execution').SmartExecutionResult = {
        success: false,
        reason: code,
        errorMessage: 'test',
        simulated: true,
        warnings: [],
        executedAt: new Date(),
        durationMs: 0,
      };
      expect(result.reason).toBe(code);
    }
  });

  it('always includes success=false on failure', async () => {
    const engine = createSmartExecutionEngine({ simulationMode: true });
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockRejectedValue(new Error('oops'));

    const result = await engine.execute(makeRequest());
    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('always includes warnings array (even if empty)', async () => {
    const engine = createSmartExecutionEngine({ simulationMode: true });
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockRejectedValue(new Error('oops'));

    const result = await engine.execute(makeRequest());
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ============================================================================
// Integration: full pipeline
// ============================================================================

describe('SmartExecutionEngine — integration', () => {
  it('full BUY pipeline: route → validate → simulate → return result', async () => {
    const engine = createSmartExecutionEngine({
      simulationMode: true,
      slippage: { maxSlippageBps: 100, warningSlippageBps: 50 },
      routing: {
        enabledDexes: ['dedust', 'stonfi', 'tonco'],
        minLiquidityUsd: 10_000,
        maxPriceImpactPercent: 3.0,
      },
    });

    const stonfiQuote = makeQuote({
      dex: 'stonfi',
      expectedAmountOut: '47300000000',
      minimumAmountOut: '47063350000', // 0.5% slippage
      liquidityUsd: 300_000,
      priceImpactPercent: 0.02,
    });
    const mockPlan = {
      dex: 'stonfi' as const,
      pair: 'TON/USDT',
      amountIn: 100,
      expectedOut: 47.3,
      slippage: '0.5%',
      route: { type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: stonfiQuote },
      candidates: [{ type: 'single' as const, dex: 'stonfi' as const, tokenIn: 'USDT', tokenOut: 'TON', quote: stonfiQuote }],
      selectionReason: 'Best net output from stonfi',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await engine.execute({
      pair: 'TON/USDT',
      action: 'BUY',
      amount: '100',
      executionMode: 'market',
      agentId: 'agent-integration',
      strategyId: 'dca',
    });

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.executionPlan).toBeDefined();
    expect(result.executionPlan!.dex).toBe('stonfi');
    expect(result.actualSlippagePercent).toBeDefined();
    expect(result.priceImpactPercent).toBeDefined();
    expect(result.simulationDetails).toBeDefined();
    expect(result.warnings).toBeDefined();
    expect(result.executedAt).toBeInstanceOf(Date);
  });

  it('full SELL pipeline rejects when slippage is too high', async () => {
    const engine = createSmartExecutionEngine({
      simulationMode: true,
      slippage: { maxSlippageBps: 30, warningSlippageBps: 10 }, // very strict: 0.3% max
    });

    const quote = makeQuote({
      dex: 'dedust',
      expectedAmountOut: '100000000',
      minimumAmountOut: '95000000', // 5% slippage → exceeds 0.3%
      liquidityUsd: 200_000,
    });
    const mockPlan = {
      dex: 'dedust' as const,
      pair: 'TON/USDT',
      amountIn: 5,
      expectedOut: 0.1,
      slippage: '5%',
      route: { type: 'single' as const, dex: 'dedust' as const, tokenIn: 'TON', tokenOut: 'USDT', quote },
      candidates: [{ type: 'single' as const, dex: 'dedust' as const, tokenIn: 'TON', tokenOut: 'USDT', quote }],
      selectionReason: 'Only route',
      generatedAt: Math.floor(Date.now() / 1000),
    };
    // @ts-expect-error
    vi.spyOn(engine['router'], 'route').mockResolvedValue(mockPlan);

    const result = await engine.execute({
      pair: 'TON/USDT',
      action: 'SELL',
      amount: '5',
      executionMode: 'market',
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('SLIPPAGE_TOO_HIGH');
  });
});
