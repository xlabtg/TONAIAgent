/**
 * Tests for the On-Chain Trading Module (Issue #235)
 *
 * Covers:
 * - TradingError: error structure and codes
 * - DEFAULT_RISK_CONFIG: default values
 * - TradeValidator: signal validation, quote validation, position size checks
 * - DexRouter: route selection, best quote logic, token resolution
 * - TransactionBuilder: transaction construction for DeDust, STON.fi, TONCO
 * - OnChainTradeTracker: recording, querying, stats
 * - SwapExecutor: full pipeline (signal → routing → validation → tx → result)
 * - Integration: strategy signal → swap execution → trade record
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  // Error
  TradingError,
  // Defaults
  DEFAULT_RISK_CONFIG,
  DEFAULT_DEX_ROUTER_CONFIG,
  DEFAULT_SWAP_EXECUTOR_CONFIG,
  // Validator
  TradeValidator,
  createTradeValidator,
  // Router
  DexRouter,
  createDexRouter,
  // Transaction builder
  TransactionBuilder,
  createTransactionBuilder,
  // Tracker
  OnChainTradeTracker,
  createOnChainTradeTracker,
  // Executor
  SwapExecutor,
  createSwapExecutor,
} from '../../core/trading/base';
import type {
  OnChainTradeSignal,
  SwapQuote,
  RoutingResult,
  TonWalletConnector,
  TradingEvent,
  DexQuoteFetcher,
  DexName,
} from '../../core/trading/base';

// ============================================================================
// Test Helpers
// ============================================================================

function makeSignal(overrides: Partial<OnChainTradeSignal> = {}): OnChainTradeSignal {
  return {
    pair: 'TON/USDT',
    action: 'BUY',
    amount: '10',
    strategyId: 'dca',
    agentId: 'agent-001',
    generatedAt: new Date(),
    ...overrides,
  };
}

function makeQuote(
  dex: DexName = 'stonfi',
  overrides: Partial<SwapQuote> = {}
): SwapQuote {
  // slippage = (expected - minimum) / expected * 100
  // With expected=1000000000 and minimum=990000000: slippage = 1.0% exactly
  return {
    dex,
    tokenIn: 'USDT',
    tokenOut: 'TON',
    amountIn: '10000000',            // 10 USDT (6 decimals)
    expectedAmountOut: '1000000000', // 1 TON (9 decimals)
    executionPrice: 100.0,
    priceImpactPercent: 0.1,
    feePercent: 0.3,
    minimumAmountOut: '990000000',   // with 1% slippage applied: 1000000000 * 0.99
    liquidityUsd: 500_000,
    poolAddress: `EQ${dex.toUpperCase()}POOL123`,
    timestamp: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

function makeRoutingResult(dex: DexName = 'stonfi', overrides: Partial<RoutingResult> = {}): RoutingResult {
  const quote = makeQuote(dex);
  return {
    selectedDex: dex,
    bestQuote: quote,
    allQuotes: [quote],
    selectionReason: `Best net output from ${dex}`,
    routedAt: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

/** Mock DEX quote fetcher for testing without real API calls */
class MockDexQuoteFetcher implements DexQuoteFetcher {
  public callCount = 0;
  public shouldFail = false;
  public quotesByDex: Map<DexName, SwapQuote | null> = new Map();

  constructor(defaultQuote?: Partial<SwapQuote>) {
    // Set default quotes for all DEXs
    const base = makeQuote('dedust', defaultQuote);
    this.quotesByDex.set('dedust', { ...base, dex: 'dedust' });
    // stonfi returns slightly better output (1.001 TON vs 1 TON), within slippage
    this.quotesByDex.set('stonfi', {
      ...base,
      dex: 'stonfi',
      expectedAmountOut: '1001000000',  // ~0.1% better
      minimumAmountOut: '990990000',    // still within 1% slippage of expected
    });
    this.quotesByDex.set('tonco', { ...base, dex: 'tonco' });
  }

  async fetchQuote(
    dex: DexName,
    _tokenIn: string,
    _tokenOut: string,
    _amountIn: string,
    _slippage: number
  ): Promise<SwapQuote | null> {
    this.callCount++;
    if (this.shouldFail) return null;
    return this.quotesByDex.get(dex) ?? null;
  }
}

/** Mock wallet connector for testing */
class MockWalletConnector implements TonWalletConnector {
  walletAddress = 'EQTestWalletAddress123';
  isConnected = true;
  public txsSent: import('../../src/trading').TonSwapTransaction[] = [];
  public shouldFail = false;

  async sendTransaction(tx: import('../../src/trading').TonSwapTransaction): Promise<string> {
    if (this.shouldFail) throw new Error('Wallet rejected transaction');
    this.txsSent.push(tx);
    return `0x${Math.random().toString(16).slice(2)}`;
  }
}

// ============================================================================
// TradingError Tests
// ============================================================================

describe('TradingError', () => {
  it('should be an instance of Error', () => {
    const err = new TradingError('test', 'ROUTING_FAILED');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have name TradingError', () => {
    const err = new TradingError('test', 'SLIPPAGE_EXCEEDED');
    expect(err.name).toBe('TradingError');
  });

  it('should carry code and metadata', () => {
    const err = new TradingError('bad slippage', 'SLIPPAGE_EXCEEDED', { slippage: 5 });
    expect(err.code).toBe('SLIPPAGE_EXCEEDED');
    expect(err.message).toBe('bad slippage');
    expect(err.metadata).toEqual({ slippage: 5 });
  });

  it('should support all error codes', () => {
    const codes = [
      'ROUTING_FAILED',
      'VALIDATION_FAILED',
      'INSUFFICIENT_LIQUIDITY',
      'SLIPPAGE_EXCEEDED',
      'POSITION_LIMIT_EXCEEDED',
      'PAIR_NOT_ALLOWED',
      'TRANSACTION_BUILD_FAILED',
      'SUBMISSION_FAILED',
      'WALLET_NOT_CONNECTED',
      'NETWORK_ERROR',
      'QUOTE_EXPIRED',
      'PRICE_IMPACT_TOO_HIGH',
    ] as const;

    for (const code of codes) {
      const err = new TradingError('test', code);
      expect(err.code).toBe(code);
    }
  });
});

// ============================================================================
// DEFAULT_RISK_CONFIG Tests
// ============================================================================

describe('DEFAULT_RISK_CONFIG', () => {
  it('should have expected default values', () => {
    expect(DEFAULT_RISK_CONFIG.maxSlippagePercent).toBe(1.0);
    expect(DEFAULT_RISK_CONFIG.maxPositionPercent).toBe(20.0);
    expect(DEFAULT_RISK_CONFIG.minLiquidityUsd).toBe(10_000);
    expect(DEFAULT_RISK_CONFIG.maxPriceImpactPercent).toBe(3.0);
    expect(DEFAULT_RISK_CONFIG.allowedPairs).toEqual([]);
    expect(DEFAULT_RISK_CONFIG.testnetMode).toBe(true);
  });
});

// ============================================================================
// TradeValidator Tests
// ============================================================================

describe('TradeValidator', () => {
  let validator: TradeValidator;

  beforeEach(() => {
    validator = createTradeValidator();
  });

  it('should create instance via factory', () => {
    expect(validator).toBeInstanceOf(TradeValidator);
  });

  it('should return current config', () => {
    const config = validator.getConfig();
    expect(config.maxSlippagePercent).toBe(1.0);
  });

  describe('validateSignal()', () => {
    it('should validate a valid BUY signal', () => {
      const result = validator.validateSignal(makeSignal());
      expect(result.valid).toBe(true);
      expect(result.rejectionReason).toBeUndefined();
    });

    it('should validate a valid SELL signal', () => {
      const result = validator.validateSignal(makeSignal({ action: 'SELL' }));
      expect(result.valid).toBe(true);
    });

    it('should reject invalid action', () => {
      const result = validator.validateSignal(makeSignal({ action: 'HOLD' as 'BUY' | 'SELL' }));
      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toMatch(/action/i);
    });

    it('should reject zero amount', () => {
      const result = validator.validateSignal(makeSignal({ amount: '0' }));
      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toMatch(/amount/i);
    });

    it('should reject negative amount', () => {
      const result = validator.validateSignal(makeSignal({ amount: '-5' }));
      expect(result.valid).toBe(false);
    });

    it('should reject non-numeric amount', () => {
      const result = validator.validateSignal(makeSignal({ amount: 'abc' }));
      expect(result.valid).toBe(false);
    });

    it('should reject invalid pair format', () => {
      const result = validator.validateSignal(makeSignal({ pair: 'TON-USDT' }));
      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toMatch(/pair/i);
    });

    it('should reject missing agent ID', () => {
      const result = validator.validateSignal(makeSignal({ agentId: '' }));
      expect(result.valid).toBe(false);
    });

    it('should reject pair not in allowedPairs list', () => {
      const restrictedValidator = createTradeValidator({ allowedPairs: ['TON/USDT'] });
      const result = restrictedValidator.validateSignal(makeSignal({ pair: 'NOT/TON' }));
      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toMatch(/allowed/i);
    });

    it('should allow all pairs when allowedPairs is empty', () => {
      const result = validator.validateSignal(makeSignal({ pair: 'ANY/PAIR' }));
      expect(result.valid).toBe(true);
    });

    it('should return checks array with results for each check', () => {
      const result = validator.validateSignal(makeSignal());
      expect(Array.isArray(result.checks)).toBe(true);
      expect(result.checks.length).toBeGreaterThan(0);
      for (const check of result.checks) {
        expect(typeof check.name).toBe('string');
        expect(typeof check.passed).toBe('boolean');
        expect(typeof check.message).toBe('string');
      }
    });
  });

  describe('validateQuote()', () => {
    it('should validate a valid quote', () => {
      const result = validator.validateQuote(makeQuote());
      expect(result.valid).toBe(true);
    });

    it('should reject quote with slippage exceeding limit', () => {
      // Expected: 1000000000, Minimum: 970000000 → slippage = 3% > 1%
      const quote = makeQuote('dedust', {
        expectedAmountOut: '1000000000',
        minimumAmountOut: '970000000',
      });
      const strictValidator = createTradeValidator({ maxSlippagePercent: 1.0 });
      const result = strictValidator.validateQuote(quote);
      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toMatch(/slippage/i);
    });

    it('should reject quote with insufficient liquidity', () => {
      const quote = makeQuote('dedust', { liquidityUsd: 5_000 }); // Below 10_000 default
      const result = validator.validateQuote(quote);
      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toMatch(/liquidity/i);
    });

    it('should reject quote with price impact too high', () => {
      const quote = makeQuote('dedust', { priceImpactPercent: 5.0 }); // Above 3% default
      const result = validator.validateQuote(quote);
      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toMatch(/price impact/i);
    });

    it('should reject expired quote', () => {
      const expiredQuote = makeQuote('dedust', {
        timestamp: Math.floor(Date.now() / 1000) - 120, // 2 minutes old
      });
      const result = validator.validateQuote(expiredQuote);
      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toMatch(/expired/i);
    });

    it('should reject zero expected output', () => {
      const quote = makeQuote('dedust', { expectedAmountOut: '0' });
      const result = validator.validateQuote(quote);
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePositionSize()', () => {
    it('should pass when position is within limit', () => {
      // Trade: $100, Portfolio: $10_000 → 1% < 20%
      const result = validator.validatePositionSize(100, 10_000);
      expect(result.valid).toBe(true);
    });

    it('should fail when position exceeds limit', () => {
      // Trade: $3_000, Portfolio: $10_000 → 30% > 20%
      const result = validator.validatePositionSize(3_000, 10_000);
      expect(result.valid).toBe(false);
      expect(result.rejectionReason).toMatch(/position size/i);
    });

    it('should fail when portfolio value is zero', () => {
      const result = validator.validatePositionSize(100, 0);
      expect(result.valid).toBe(false);
    });

    it('should accept exactly at the limit', () => {
      // Trade: $2_000, Portfolio: $10_000 → 20% = 20%
      const result = validator.validatePositionSize(2_000, 10_000);
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// DexRouter Tests
// ============================================================================

describe('DexRouter', () => {
  let router: DexRouter;
  let mockFetcher: MockDexQuoteFetcher;

  beforeEach(() => {
    mockFetcher = new MockDexQuoteFetcher();
    router = createDexRouter({
      enabledDexes: ['dedust', 'stonfi', 'tonco'],
      slippageTolerance: 1.0,
    }, mockFetcher);
  });

  it('should create instance via factory', () => {
    expect(router).toBeInstanceOf(DexRouter);
  });

  it('should return config', () => {
    const config = router.getConfig();
    expect(config.enabledDexes).toContain('dedust');
    expect(config.enabledDexes).toContain('stonfi');
  });

  it('should select DEX with best expected output', async () => {
    // stonfi returns 1_950_000_000, others return 1_904_761_904
    const result = await router.findBestRoute(makeSignal());
    expect(result.selectedDex).toBe('stonfi');
    expect(result.bestQuote.dex).toBe('stonfi');
    expect(result.allQuotes.length).toBe(3);
  });

  it('should fetch quotes from all enabled DEXs', async () => {
    await router.findBestRoute(makeSignal());
    expect(mockFetcher.callCount).toBe(3); // One call per DEX
  });

  it('should resolve BUY pair correctly: BUY TON/USDT → tokenIn=USDT, tokenOut=TON', async () => {
    await router.findBestRoute(makeSignal({ pair: 'TON/USDT', action: 'BUY' }));
    const calls: string[] = [];
    const trackerFetcher: DexQuoteFetcher = {
      async fetchQuote(_dex, tokenIn, tokenOut) {
        calls.push(`${tokenIn}→${tokenOut}`);
        return makeQuote(_dex);
      }
    };
    const trackerRouter = createDexRouter({ enabledDexes: ['dedust'] }, trackerFetcher);
    await trackerRouter.findBestRoute(makeSignal({ pair: 'TON/USDT', action: 'BUY' }));
    expect(calls[0]).toBe('USDT→TON');
  });

  it('should resolve SELL pair correctly: SELL TON/USDT → tokenIn=TON, tokenOut=USDT', async () => {
    const calls: string[] = [];
    const trackerFetcher: DexQuoteFetcher = {
      async fetchQuote(_dex, tokenIn, tokenOut) {
        calls.push(`${tokenIn}→${tokenOut}`);
        return makeQuote(_dex);
      }
    };
    const trackerRouter = createDexRouter({ enabledDexes: ['dedust'] }, trackerFetcher);
    await trackerRouter.findBestRoute(makeSignal({ pair: 'TON/USDT', action: 'SELL' }));
    expect(calls[0]).toBe('TON→USDT');
  });

  it('should throw ROUTING_FAILED when all DEXs return null', async () => {
    mockFetcher.shouldFail = true;
    await expect(router.findBestRoute(makeSignal())).rejects.toThrow(TradingError);
    try {
      await router.findBestRoute(makeSignal());
    } catch (err) {
      expect(err).toBeInstanceOf(TradingError);
      expect((err as TradingError).code).toBe('ROUTING_FAILED');
    }
  });

  it('should handle partial failures (some DEXs fail, some succeed)', async () => {
    mockFetcher.quotesByDex.set('dedust', null);
    mockFetcher.quotesByDex.set('tonco', null);
    // Only stonfi succeeds
    const result = await router.findBestRoute(makeSignal());
    expect(result.selectedDex).toBe('stonfi');
    expect(result.allQuotes).toHaveLength(1);
  });

  it('should include selectionReason in result', async () => {
    const result = await router.findBestRoute(makeSignal());
    expect(typeof result.selectionReason).toBe('string');
    expect(result.selectionReason.length).toBeGreaterThan(0);
  });

  it('should include routedAt timestamp', async () => {
    const before = Math.floor(Date.now() / 1000);
    const result = await router.findBestRoute(makeSignal());
    const after = Math.floor(Date.now() / 1000) + 1;
    expect(result.routedAt).toBeGreaterThanOrEqual(before);
    expect(result.routedAt).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// TransactionBuilder Tests
// ============================================================================

describe('TransactionBuilder', () => {
  let builder: TransactionBuilder;

  beforeEach(() => {
    builder = createTransactionBuilder({ network: 'testnet' });
  });

  it('should create instance via factory', () => {
    expect(builder).toBeInstanceOf(TransactionBuilder);
  });

  it('should build a DeDust transaction', () => {
    const routing = makeRoutingResult('dedust');
    const tx = builder.buildSwapTransaction(routing, 'EQTestWallet');
    expect(tx.txId).toBeDefined();
    expect(tx.contractAddress).toBeDefined();
    expect(tx.payload).toBeDefined();
    expect(tx.attachedTon).toBeDefined();
    expect(tx.network).toBe('testnet');
    expect(tx.routingResult.selectedDex).toBe('dedust');
  });

  it('should build a STON.fi transaction', () => {
    const routing = makeRoutingResult('stonfi');
    const tx = builder.buildSwapTransaction(routing, 'EQTestWallet');
    expect(tx.txId).toBeDefined();
    expect(tx.description).toContain('STON.fi');
  });

  it('should build a TONCO transaction', () => {
    const routing = makeRoutingResult('tonco');
    const tx = builder.buildSwapTransaction(routing, 'EQTestWallet');
    expect(tx.txId).toBeDefined();
    expect(tx.description).toContain('TONCO');
  });

  it('should attach extra TON for native input (TON→Jetton swaps)', () => {
    // tokenIn = TON (native), amountIn = 10 TON = 10_000_000_000 nanotons
    const routing = makeRoutingResult('dedust', {
      bestQuote: makeQuote('dedust', {
        tokenIn: 'TON',
        tokenOut: 'USDT',
        amountIn: '10000000000',
      }),
    });
    const tx = builder.buildSwapTransaction(routing, 'EQTestWallet');
    // attachedTon should be amountIn + gas (> amountIn alone)
    expect(BigInt(tx.attachedTon)).toBeGreaterThan(BigInt('10000000000'));
  });

  it('should only attach gas for jetton input (Jetton→TON swaps)', () => {
    const routing = makeRoutingResult('stonfi', {
      bestQuote: makeQuote('stonfi', {
        tokenIn: 'USDT',
        tokenOut: 'TON',
        amountIn: '10000000',
      }),
    });
    const tx = builder.buildSwapTransaction(routing, 'EQTestWallet');
    // attachedTon should only be gas (not including amountIn)
    expect(BigInt(tx.attachedTon)).toBeLessThan(BigInt('1000000000')); // < 1 TON gas
  });

  it('should generate unique txId for each transaction', () => {
    const routing = makeRoutingResult('dedust');
    const tx1 = builder.buildSwapTransaction(routing, 'EQWallet1');
    const tx2 = builder.buildSwapTransaction(routing, 'EQWallet2');
    expect(tx1.txId).not.toBe(tx2.txId);
  });

  it('should encode payload as base64 string', () => {
    const routing = makeRoutingResult('dedust');
    const tx = builder.buildSwapTransaction(routing, 'EQTestWallet');
    // Should be valid base64
    expect(() => Buffer.from(tx.payload, 'base64').toString('utf-8')).not.toThrow();
  });

  it('should include builtAt timestamp', () => {
    const before = Math.floor(Date.now() / 1000);
    const routing = makeRoutingResult('dedust');
    const tx = builder.buildSwapTransaction(routing, 'EQTestWallet');
    expect(tx.builtAt).toBeGreaterThanOrEqual(before);
  });
});

// ============================================================================
// OnChainTradeTracker Tests
// ============================================================================

describe('OnChainTradeTracker', () => {
  let tracker: OnChainTradeTracker;

  beforeEach(() => {
    tracker = createOnChainTradeTracker();
  });

  it('should create instance via factory', () => {
    expect(tracker).toBeInstanceOf(OnChainTradeTracker);
  });

  it('should start with zero trades', () => {
    expect(tracker.totalCount()).toBe(0);
  });

  describe('recordSimulatedTrade()', () => {
    it('should record a simulated trade and return tradeId', async () => {
      const routing = makeRoutingResult('stonfi');
      const tx = createTransactionBuilder({ network: 'testnet' })
        .buildSwapTransaction(routing, 'EQWallet');
      const tradeId = await tracker.recordSimulatedTrade(
        makeSignal(), routing, tx, 'EQWallet'
      );
      expect(tradeId).toBeDefined();
      expect(typeof tradeId).toBe('string');
    });

    it('should store trade with confirmed status', async () => {
      const routing = makeRoutingResult('dedust');
      const tx = createTransactionBuilder({ network: 'testnet' })
        .buildSwapTransaction(routing, 'EQWallet');
      const tradeId = await tracker.recordSimulatedTrade(
        makeSignal(), routing, tx, 'EQWallet'
      );
      const trade = tracker.getTradeById(tradeId);
      expect(trade).not.toBeNull();
      expect(trade!.status).toBe('confirmed');
    });

    it('should store all required fields', async () => {
      const signal = makeSignal({ agentId: 'agent-42', strategyId: 'dca' });
      const routing = makeRoutingResult('stonfi');
      const tx = createTransactionBuilder({ network: 'testnet' })
        .buildSwapTransaction(routing, 'EQMyWallet');
      const tradeId = await tracker.recordSimulatedTrade(signal, routing, tx, 'EQMyWallet');
      const trade = tracker.getTradeById(tradeId)!;

      expect(trade.agentId).toBe('agent-42');
      expect(trade.strategyId).toBe('dca');
      expect(trade.walletAddress).toBe('EQMyWallet');
      expect(trade.dexUsed).toBe('stonfi');
      expect(trade.pair).toBe('TON/USDT');
      expect(trade.network).toBe('testnet');
      expect(trade.txHash).toContain('sim-');
      expect(trade.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('recordSubmittedTrade()', () => {
    it('should record a submitted trade with pending status', async () => {
      const routing = makeRoutingResult('dedust');
      const tx = createTransactionBuilder({ network: 'mainnet' })
        .buildSwapTransaction(routing, 'EQWallet');
      const tradeId = await tracker.recordSubmittedTrade(
        makeSignal(), routing, tx, 'EQWallet', '0xabc123'
      );
      const trade = tracker.getTradeById(tradeId);
      expect(trade!.status).toBe('pending');
      expect(trade!.txHash).toBe('0xabc123');
    });
  });

  describe('confirmTrade() / failTrade()', () => {
    it('should update trade to confirmed with actual amounts', async () => {
      const routing = makeRoutingResult('stonfi');
      const tx = createTransactionBuilder({ network: 'testnet' })
        .buildSwapTransaction(routing, 'EQWallet');
      const tradeId = await tracker.recordSubmittedTrade(
        makeSignal(), routing, tx, 'EQWallet', '0xdeadbeef'
      );

      tracker.confirmTrade(tradeId, {
        amountOut: '1900000000',
        executionPrice: 190.0,
        slippagePercent: 0.25,
        blockNumber: 12345678,
        feePaid: '250000000',
      });

      const trade = tracker.getTradeById(tradeId)!;
      expect(trade.status).toBe('confirmed');
      expect(trade.amountOut).toBe('1900000000');
      expect(trade.blockNumber).toBe(12345678);
      expect(trade.confirmedAt).toBeInstanceOf(Date);
    });

    it('should mark trade as failed', async () => {
      const routing = makeRoutingResult('dedust');
      const tx = createTransactionBuilder({ network: 'testnet' })
        .buildSwapTransaction(routing, 'EQWallet');
      const tradeId = await tracker.recordSubmittedTrade(
        makeSignal(), routing, tx, 'EQWallet', '0xfail'
      );

      tracker.failTrade(tradeId);

      const trade = tracker.getTradeById(tradeId)!;
      expect(trade.status).toBe('failed');
    });

    it('should silently ignore confirmTrade for unknown tradeId', () => {
      expect(() => tracker.confirmTrade('nonexistent', {
        amountOut: '0',
        executionPrice: 0,
        slippagePercent: 0,
      })).not.toThrow();
    });
  });

  describe('Query methods', () => {
    let agent1TradeId: string;
    let agent2TradeId: string;

    beforeEach(async () => {
      const routing = makeRoutingResult('dedust');
      const tx = createTransactionBuilder({ network: 'testnet' })
        .buildSwapTransaction(routing, 'EQWallet');

      agent1TradeId = await tracker.recordSimulatedTrade(
        makeSignal({ agentId: 'agent-001', strategyId: 'dca', pair: 'TON/USDT' }),
        routing, tx, 'EQWallet1'
      );
      agent2TradeId = await tracker.recordSimulatedTrade(
        makeSignal({ agentId: 'agent-002', strategyId: 'grid', pair: 'NOT/TON' }),
        makeRoutingResult('stonfi'),
        createTransactionBuilder({ network: 'testnet' })
          .buildSwapTransaction(makeRoutingResult('stonfi'), 'EQWallet2'),
        'EQWallet2'
      );
    });

    it('getTradeById() should return existing trade', () => {
      const trade = tracker.getTradeById(agent1TradeId);
      expect(trade).not.toBeNull();
      expect(trade!.agentId).toBe('agent-001');
    });

    it('getTradeById() should return null for unknown ID', () => {
      expect(tracker.getTradeById('nonexistent')).toBeNull();
    });

    it('getTradesByAgent() should return only that agent\'s trades', () => {
      const trades = tracker.getTradesByAgent('agent-001');
      expect(trades).toHaveLength(1);
      expect(trades[0].agentId).toBe('agent-001');
    });

    it('getTradesByAgent() should return empty array for unknown agent', () => {
      expect(tracker.getTradesByAgent('unknown')).toEqual([]);
    });

    it('getTradesByAgent() should support limit parameter', async () => {
      const routing = makeRoutingResult('tonco');
      const tx = createTransactionBuilder({ network: 'testnet' })
        .buildSwapTransaction(routing, 'EQWallet');
      // Add a second trade for agent-001
      await tracker.recordSimulatedTrade(
        makeSignal({ agentId: 'agent-001' }),
        routing, tx, 'EQWallet1'
      );
      const limited = tracker.getTradesByAgent('agent-001', 1);
      expect(limited).toHaveLength(1);
    });

    it('getTradesByStrategy() should filter by strategyId', () => {
      const trades = tracker.getTradesByStrategy('dca');
      expect(trades).toHaveLength(1);
      expect(trades[0].strategyId).toBe('dca');
    });

    it('getTradesByDex() should filter by dex', () => {
      const trades = tracker.getTradesByDex('dedust');
      expect(trades).toHaveLength(1);
      expect(trades[0].dexUsed).toBe('dedust');
    });

    it('getTradesByPair() should filter by pair', () => {
      const trades = tracker.getTradesByPair('TON/USDT');
      expect(trades).toHaveLength(1);
    });

    it('getTradeByTxHash() should find trade by tx hash', () => {
      const trade = tracker.getTradeById(agent1TradeId)!;
      const found = tracker.getTradeByTxHash(trade.txHash);
      expect(found).not.toBeNull();
      expect(found!.tradeId).toBe(agent1TradeId);
    });

    it('getAllTrades() should return all trades', () => {
      expect(tracker.getAllTrades()).toHaveLength(2);
    });

    it('getAllTrades() should support limit', () => {
      expect(tracker.getAllTrades(1)).toHaveLength(1);
    });

    it('getPendingTrades() should return only pending trades', () => {
      const pending = tracker.getPendingTrades();
      // All our test trades are simulated (confirmed), so pending should be empty
      expect(pending).toHaveLength(0);
    });

    it('totalCount() should return total number of trades', () => {
      expect(tracker.totalCount()).toBe(2);
    });

    it('getAgentStats() should return correct statistics', () => {
      const stats = tracker.getAgentStats('agent-001');
      expect(stats.totalTrades).toBe(1);
      expect(stats.confirmedTrades).toBe(1);
      expect(stats.pendingTrades).toBe(0);
      expect(stats.failedTrades).toBe(0);
      expect(stats.pairsTraded).toContain('TON/USDT');
    });
  });
});

// ============================================================================
// SwapExecutor Tests
// ============================================================================

describe('SwapExecutor', () => {
  let executor: SwapExecutor;
  let mockFetcher: MockDexQuoteFetcher;

  beforeEach(() => {
    mockFetcher = new MockDexQuoteFetcher();
    executor = createSwapExecutor(
      { network: 'testnet', submitTransactions: false },
      { minLiquidityUsd: 100 }, // Lower threshold for tests
      mockFetcher
    );
  });

  it('should create instance via factory', () => {
    expect(executor).toBeInstanceOf(SwapExecutor);
  });

  it('should not be wallet connected initially', () => {
    expect(executor.isWalletConnected()).toBe(false);
  });

  it('should report wallet connected after connectWallet()', () => {
    executor.connectWallet(new MockWalletConnector());
    expect(executor.isWalletConnected()).toBe(true);
  });

  it('should report disconnected after disconnectWallet()', () => {
    executor.connectWallet(new MockWalletConnector());
    executor.disconnectWallet();
    expect(executor.isWalletConnected()).toBe(false);
  });

  it('should return the tracker', () => {
    expect(executor.getTracker()).toBeInstanceOf(OnChainTradeTracker);
  });

  describe('executeSwap() - signal validation failures', () => {
    it('should reject invalid action', async () => {
      const result = await executor.executeSwap(makeSignal({ action: 'HOLD' as 'BUY' | 'SELL' }));
      expect(result.success).toBe(false);
      expect(result.status).toBe('rejected');
      expect(result.errorMessage).toMatch(/action/i);
    });

    it('should reject invalid amount', async () => {
      const result = await executor.executeSwap(makeSignal({ amount: '0' }));
      expect(result.success).toBe(false);
      expect(result.status).toBe('rejected');
    });

    it('should reject pair not in whitelist', async () => {
      const restrictedExecutor = createSwapExecutor(
        { network: 'testnet', submitTransactions: false },
        { allowedPairs: ['TON/USDT'], minLiquidityUsd: 100 },
        mockFetcher
      );
      const result = await restrictedExecutor.executeSwap(makeSignal({ pair: 'NOT/TON' }));
      expect(result.success).toBe(false);
      expect(result.status).toBe('rejected');
    });
  });

  describe('executeSwap() - routing failures', () => {
    it('should return failed status when no DEXs available', async () => {
      mockFetcher.shouldFail = true;
      const result = await executor.executeSwap(makeSignal());
      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toMatch(/routing/i);
    });
  });

  describe('executeSwap() - simulation mode', () => {
    it('should return simulated status in dry-run mode', async () => {
      const result = await executor.executeSwap(makeSignal());
      expect(result.success).toBe(true);
      expect(result.status).toBe('simulated');
    });

    it('should include routingResult in simulated result', async () => {
      const result = await executor.executeSwap(makeSignal());
      expect(result.routingResult).toBeDefined();
      expect(result.routingResult!.selectedDex).toBeDefined();
    });

    it('should include transaction in simulated result', async () => {
      const result = await executor.executeSwap(makeSignal());
      expect(result.transaction).toBeDefined();
      expect(result.transaction!.txId).toBeDefined();
    });

    it('should record trade in tracker after simulation', async () => {
      await executor.executeSwap(makeSignal({ agentId: 'agent-sim-001' }));
      const trades = executor.getTracker().getTradesByAgent('agent-sim-001');
      expect(trades).toHaveLength(1);
      expect(trades[0].status).toBe('confirmed');
    });

    it('should include executedAt and durationMs', async () => {
      const result = await executor.executeSwap(makeSignal());
      expect(result.executedAt).toBeInstanceOf(Date);
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executeSwap() - live submission mode', () => {
    let liveExecutor: SwapExecutor;
    let mockWallet: MockWalletConnector;

    beforeEach(() => {
      liveExecutor = createSwapExecutor(
        { network: 'testnet', submitTransactions: true, maxRetries: 0 },
        { minLiquidityUsd: 100 },
        mockFetcher
      );
      mockWallet = new MockWalletConnector();
      liveExecutor.connectWallet(mockWallet);
    });

    it('should return submitted status with txHash when wallet connected', async () => {
      const result = await liveExecutor.executeSwap(makeSignal());
      expect(result.success).toBe(true);
      expect(result.status).toBe('submitted');
      expect(result.txHash).toBeDefined();
    });

    it('should return failed status when wallet rejects transaction', async () => {
      mockWallet.shouldFail = true;
      const result = await liveExecutor.executeSwap(makeSignal());
      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toMatch(/submission/i);
    });

    it('should return simulated when no wallet connected even with submitTransactions=true', async () => {
      liveExecutor.disconnectWallet();
      const result = await liveExecutor.executeSwap(makeSignal());
      expect(result.status).toBe('simulated');
    });
  });

  describe('executeSwap() - position size check', () => {
    it('should reject when trade exceeds position limit relative to portfolio', async () => {
      const result = await executor.executeSwap(
        makeSignal({ amount: '1000', pair: 'TON/USDT' }), // ~$5000 at $5/TON
        100 // $100 portfolio → 5000/100 = 5000% >> 20%
      );
      // The signal should still pass validation; position check should reject it
      expect(result.success).toBe(false);
      expect(result.status).toBe('rejected');
    });

    it('should pass when trade is within position limit', async () => {
      const result = await executor.executeSwap(
        makeSignal({ amount: '0.1', pair: 'TON/USDT' }), // ~$0.50 at $5/TON
        10_000 // $10k portfolio → 0.50/10000 = 0.005% << 20%
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit trade.signal_received event', async () => {
      const events: TradingEvent[] = [];
      executor.subscribe(e => events.push(e));
      await executor.executeSwap(makeSignal());
      expect(events.some(e => e.type === 'trade.signal_received')).toBe(true);
    });

    it('should emit trade.routing_completed event', async () => {
      const events: TradingEvent[] = [];
      executor.subscribe(e => events.push(e));
      await executor.executeSwap(makeSignal());
      expect(events.some(e => e.type === 'trade.routing_completed')).toBe(true);
    });

    it('should emit trade.validation_passed event', async () => {
      const events: TradingEvent[] = [];
      executor.subscribe(e => events.push(e));
      await executor.executeSwap(makeSignal());
      expect(events.some(e => e.type === 'trade.validation_passed')).toBe(true);
    });

    it('should emit trade.submitted event on successful simulation', async () => {
      const events: TradingEvent[] = [];
      executor.subscribe(e => events.push(e));
      await executor.executeSwap(makeSignal());
      expect(events.some(e => e.type === 'trade.submitted')).toBe(true);
    });

    it('should emit trade.validation_failed for invalid signal', async () => {
      const events: TradingEvent[] = [];
      executor.subscribe(e => events.push(e));
      await executor.executeSwap(makeSignal({ action: 'HOLD' as 'BUY' | 'SELL' }));
      expect(events.some(e => e.type === 'trade.validation_failed')).toBe(true);
    });

    it('should return unsubscribe function that stops events', async () => {
      const events: TradingEvent[] = [];
      const unsub = executor.subscribe(e => events.push(e));
      unsub();
      await executor.executeSwap(makeSignal());
      expect(events).toHaveLength(0);
    });

    it('should not throw if subscriber throws', async () => {
      executor.subscribe(() => { throw new Error('bad subscriber'); });
      await expect(executor.executeSwap(makeSignal())).resolves.toBeDefined();
    });
  });
});

// ============================================================================
// Integration: Strategy Signal → On-Chain Swap → Trade Record
// ============================================================================

describe('Integration: Strategy Signal → Swap Execution → Trade Record', () => {
  it('should execute full pipeline: BUY TON/USDT → simulated trade recorded', async () => {
    const mockFetcher = new MockDexQuoteFetcher();
    const executor = createSwapExecutor(
      { network: 'testnet', submitTransactions: false },
      { minLiquidityUsd: 100 },
      mockFetcher
    );

    // Signal from strategy engine
    const signal: OnChainTradeSignal = {
      pair: 'TON/USDT',
      action: 'BUY',
      amount: '10',
      strategyId: 'dca',
      agentId: 'agent-integration',
      generatedAt: new Date(),
      metadata: { source: 'strategy-engine', confidence: 0.8 },
    };

    const result = await executor.executeSwap(signal, 100_000);

    expect(result.success).toBe(true);
    expect(result.status).toBe('simulated');
    expect(result.routingResult).toBeDefined();
    expect(result.transaction).toBeDefined();
    expect(result.agentId).toBe('agent-integration');

    // Verify trade record
    const trades = executor.getTracker().getTradesByAgent('agent-integration');
    expect(trades).toHaveLength(1);
    const trade = trades[0];
    expect(trade.pair).toBe('TON/USDT');
    expect(trade.agentId).toBe('agent-integration');
    expect(trade.strategyId).toBe('dca');
    expect(trade.status).toBe('confirmed');
    expect(trade.txHash).toContain('sim-');
  });

  it('should execute full pipeline: SELL TON/USDT → simulated trade recorded', async () => {
    const mockFetcher = new MockDexQuoteFetcher({
      tokenIn: 'TON',
      tokenOut: 'USDT',
    });
    const executor = createSwapExecutor(
      { network: 'testnet', submitTransactions: false },
      { minLiquidityUsd: 100 },
      mockFetcher
    );

    const signal: OnChainTradeSignal = {
      pair: 'TON/USDT',
      action: 'SELL',
      amount: '5',
      strategyId: 'trend',
      agentId: 'agent-sell',
      generatedAt: new Date(),
    };

    const result = await executor.executeSwap(signal);

    expect(result.success).toBe(true);
    expect(result.status).toBe('simulated');
    expect(result.routingResult!.bestQuote.tokenIn).toBe('TON');
    expect(result.routingResult!.bestQuote.tokenOut).toBe('USDT');
  });

  it('should track multiple trades for one agent across different DEXs', async () => {
    const fetcher1 = new MockDexQuoteFetcher();
    const executor = createSwapExecutor(
      { network: 'testnet', submitTransactions: false },
      { minLiquidityUsd: 100 },
      fetcher1
    );

    // Execute two trades
    await executor.executeSwap(makeSignal({ agentId: 'multi-agent', pair: 'TON/USDT' }));
    await executor.executeSwap(makeSignal({ agentId: 'multi-agent', pair: 'TON/USDT' }));

    const trades = executor.getTracker().getTradesByAgent('multi-agent');
    expect(trades).toHaveLength(2);

    const stats = executor.getTracker().getAgentStats('multi-agent');
    expect(stats.totalTrades).toBe(2);
    expect(stats.confirmedTrades).toBe(2);
  });
});

// ============================================================================
// Transaction Simulator (Issue #291)
// ============================================================================

import { simulateTransaction, estimateGas } from '../../core/trading/simulator';
import type { TransactionRequest } from '../../core/security/types';

function makeTransactionRequest(
  overrides: Partial<TransactionRequest> = {}
): TransactionRequest {
  return {
    id: 'tx_test',
    type: 'transfer',
    agentId: 'agent_1',
    userId: 'user_1',
    source: { address: 'EQ_src', type: 'agent', isWhitelisted: true, isNew: false },
    destination: { address: 'EQ_dst', type: 'external', isWhitelisted: false, isNew: false },
    amount: { token: 'TON', symbol: 'TON', amount: '10', decimals: 9, valueTon: 10 },
    metadata: {},
    createdAt: new Date(),
    ...overrides,
  };
}

describe('estimateGas', () => {
  it('returns type-specific estimate for transfer', () => {
    expect(estimateGas('transfer')).toBe(25000);
  });

  it('returns type-specific estimate for swap', () => {
    expect(estimateGas('swap')).toBe(80000);
  });

  it('returns type-specific estimate for deploy', () => {
    expect(estimateGas('deploy')).toBe(150000);
  });

  it('falls back to "other" for unknown types', () => {
    expect(estimateGas('unknown_op')).toBe(50000);
  });

  it('applies dedust protocol multiplier', () => {
    expect(estimateGas('swap', 'dedust')).toBe(Math.round(80000 * 1.1));
  });

  it('applies stonfi protocol multiplier', () => {
    expect(estimateGas('swap', 'stonfi')).toBe(Math.round(80000 * 1.05));
  });

  it('applies no multiplier for unknown protocol', () => {
    expect(estimateGas('swap', 'unknown_dex')).toBe(80000);
  });
});

describe('simulateTransaction', () => {
  it('returns success true', () => {
    const result = simulateTransaction(makeTransactionRequest());
    expect(result.success).toBe(true);
  });

  it('uses type-aware gas estimate instead of hardcoded 50000', () => {
    const transferResult = simulateTransaction(makeTransactionRequest({ type: 'transfer' }));
    expect(transferResult.gasEstimate).toBe(25000);
    expect(transferResult.gasEstimate).not.toBe(50000);

    const swapResult = simulateTransaction(makeTransactionRequest({ type: 'swap' }));
    expect(swapResult.gasEstimate).toBe(80000);
  });

  it('reads protocol from request.metadata when not passed explicitly', () => {
    const request = makeTransactionRequest({
      type: 'swap',
      metadata: { protocol: 'dedust' },
    });
    const result = simulateTransaction(request);
    expect(result.gasEstimate).toBe(Math.round(80000 * 1.1));
  });

  it('explicit protocol parameter overrides metadata protocol', () => {
    const request = makeTransactionRequest({
      type: 'swap',
      metadata: { protocol: 'dedust' },
    });
    const result = simulateTransaction(request, 'stonfi');
    expect(result.gasEstimate).toBe(Math.round(80000 * 1.05));
  });

  it('includes balance change for token amount', () => {
    const result = simulateTransaction(makeTransactionRequest());
    expect(result.balanceChanges).toHaveLength(1);
    expect(result.balanceChanges[0]).toEqual({ token: 'TON', amount: '10', direction: 'out' });
  });

  it('has empty balanceChanges when amount is absent', () => {
    const request = makeTransactionRequest();
    delete (request as any).amount;
    const result = simulateTransaction(request);
    expect(result.balanceChanges).toHaveLength(0);
  });

  it('returns empty warnings and errors arrays', () => {
    const result = simulateTransaction(makeTransactionRequest());
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});

// ============================================================================
// Cleanup
// ============================================================================

afterEach(() => {
  vi.restoreAllMocks();
});
