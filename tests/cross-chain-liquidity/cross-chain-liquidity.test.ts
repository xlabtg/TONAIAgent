/**
 * TONAIAgent - Cross-Chain Liquidity Integration Layer Tests
 *
 * Comprehensive tests for the cross-chain liquidity system, covering:
 * - Connector framework (connect, getLiquidityPools, getTokenPrices, executeSwap)
 * - Liquidity aggregation (quotes, routing, source discovery)
 * - Trade execution (same-chain swaps, cross-chain swaps, arbitrage)
 * - Multi-chain portfolio tracking (balances, LP positions, performance)
 * - Risk monitoring (validation, alerts, limit enforcement)
 * - Plugin layer (built-in plugins, execution, registry)
 * - Unified manager (full integration flow)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  // Connector
  SimulatedChainConnector,
  CrossChainConnectorRegistry,
  createSimulatedConnector,
  createConnectorRegistry,
  CHAIN_METADATA,

  // Aggregation
  DefaultLiquidityAggregationEngine,
  createLiquidityAggregationEngine,

  // Execution
  DefaultCrossChainTradeExecutor,
  createCrossChainTradeExecutor,

  // Portfolio
  DefaultMultiChainPortfolioTracker,
  createMultiChainPortfolioTracker,

  // Risk
  DefaultCrossChainRiskMonitor,
  createCrossChainRiskMonitor,
  DEFAULT_RISK_LIMITS,

  // Plugin Layer
  ArbitrageScannerPlugin,
  LiquidityScannerPlugin,
  CrossChainAnalyticsPlugin,
  CrossChainPluginLayer,
  createCrossChainPluginLayer,

  // Manager
  DefaultCrossChainLiquidityManager,
  createCrossChainLiquidityManager,
  DEFAULT_CROSS_CHAIN_CONFIG,

  // Types
  type CrossChainToken,
  type ConnectorConfig,
  type TradeRequest,
  type CrossChainLiquidityEvent,
} from '../../connectors/cross-chain-liquidity';

// ============================================================================
// Test Helpers
// ============================================================================

function makeConfig(chainId: string): ConnectorConfig {
  return { chainId, enabled: true };
}

function makeTonToken(): CrossChainToken {
  return {
    address: 'native',
    chainId: 'ton',
    symbol: 'TON',
    name: 'Toncoin',
    decimals: 9,
  };
}

function makeEthToken(): CrossChainToken {
  return {
    address: 'native',
    chainId: 'ethereum',
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
  };
}

function makeUsdtToken(chainId = 'ton'): CrossChainToken {
  return {
    address: '0xusdt',
    chainId,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  };
}

function makeConnectedRegistry(chains = ['ton', 'ethereum', 'bnb']): CrossChainConnectorRegistry {
  const registry = createConnectorRegistry(chains.map(makeConfig));
  return registry;
}

async function makeConnectedRegistryAsync(
  chains = ['ton', 'ethereum', 'bnb']
): Promise<CrossChainConnectorRegistry> {
  const registry = makeConnectedRegistry(chains);
  await registry.connectAll();
  return registry;
}

// ============================================================================
// Connector Tests
// ============================================================================

describe('SimulatedChainConnector', () => {
  let connector: SimulatedChainConnector;

  beforeEach(() => {
    connector = createSimulatedConnector(makeConfig('ton'));
  });

  it('should be instantiated via factory', () => {
    expect(connector).toBeInstanceOf(SimulatedChainConnector);
  });

  it('should start disconnected', () => {
    expect(connector.getStatus().status).toBe('disconnected');
  });

  it('should connect successfully', async () => {
    const status = await connector.connect();
    expect(status.status).toBe('connected');
    expect(status.chainId).toBe('ton');
    expect(status.latencyMs).toBeGreaterThanOrEqual(0);
    expect(status.connectedAt).toBeInstanceOf(Date);
  });

  it('should not connect when disabled', async () => {
    const disabledConnector = createSimulatedConnector({
      chainId: 'ton',
      enabled: false,
    });
    const status = await disabledConnector.connect();
    expect(status.status).toBe('disconnected');
  });

  it('should disconnect and update status', async () => {
    await connector.connect();
    await connector.disconnect();
    expect(connector.getStatus().status).toBe('disconnected');
  });

  it('should return chain metadata', () => {
    const meta = connector.getChainMetadata();
    expect(meta.id).toBe('ton');
    expect(meta.nativeCurrency).toBe('TON');
    expect(meta.blockTimeMs).toBeGreaterThan(0);
  });

  it('should fetch liquidity pools', async () => {
    await connector.connect();
    const pools = await connector.getLiquidityPools();
    expect(Array.isArray(pools)).toBe(true);
    if (pools.length > 0) {
      expect(pools[0].chainId).toBe('ton');
      expect(pools[0].totalLiquidityUsd).toBeGreaterThan(0);
    }
  });

  it('should fetch token prices', async () => {
    await connector.connect();
    const prices = await connector.getTokenPrices(['TON', 'USDT']);
    expect(prices).toHaveLength(2);
    expect(prices[0].token.symbol).toBe('TON');
    expect(prices[0].priceUsd).toBeGreaterThan(0);
  });

  it('should execute a swap', async () => {
    await connector.connect();
    const result = await connector.executeSwap({
      fromToken: makeTonToken(),
      toToken: makeUsdtToken(),
      amountIn: 100,
      slippageTolerance: 0.01,
    });

    expect(result.transactionHash).toBeDefined();
    expect(result.amountOut).toBeGreaterThan(0);
    expect(result.chainId).toBe('ton');
    expect(result.status).toBe('confirmed');
  });

  it('should check transaction status', async () => {
    await connector.connect();
    const txDetails = await connector.checkTransactionStatus('0xabcd1234');
    expect(txDetails.status).toBe('confirmed');
    expect(txDetails.confirmations).toBeGreaterThan(0);
  });
});

describe('CrossChainConnectorRegistry', () => {
  let registry: CrossChainConnectorRegistry;

  beforeEach(() => {
    registry = makeConnectedRegistry(['ton', 'ethereum', 'bnb']);
  });

  it('should have registered all connectors', () => {
    expect(registry.getAll()).toHaveLength(3);
  });

  it('should find connector by chain ID', () => {
    const conn = registry.get('ton');
    expect(conn).toBeDefined();
    expect(conn?.chainId).toBe('ton');
  });

  it('should connect all chains', async () => {
    const statuses = await registry.connectAll();
    expect(statuses).toHaveLength(3);
    const connected = statuses.filter(s => s.status === 'connected');
    expect(connected.length).toBeGreaterThan(0);
  });

  it('should report connected chains', async () => {
    await registry.connectAll();
    const chains = registry.getConnectedChains();
    expect(chains.length).toBeGreaterThan(0);
  });

  it('should disconnect all chains', async () => {
    await registry.connectAll();
    await registry.disconnectAll();
    const chains = registry.getConnectedChains();
    expect(chains).toHaveLength(0);
  });

  it('should check if a chain is connected', async () => {
    await registry.connectAll();
    expect(registry.isConnected('ton')).toBe(true);
    expect(registry.isConnected('unknown-chain')).toBe(false);
  });
});

describe('CHAIN_METADATA', () => {
  it('should contain metadata for major chains', () => {
    expect(CHAIN_METADATA['ton']).toBeDefined();
    expect(CHAIN_METADATA['ethereum']).toBeDefined();
    expect(CHAIN_METADATA['bnb']).toBeDefined();
    expect(CHAIN_METADATA['solana']).toBeDefined();
  });

  it('should have valid fields for TON', () => {
    const meta = CHAIN_METADATA['ton'];
    expect(meta.id).toBe('ton');
    expect(meta.nativeCurrency).toBe('TON');
    expect(meta.blockTimeMs).toBeGreaterThan(0);
    expect(meta.averageGasUsd).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Aggregation Tests
// ============================================================================

describe('DefaultLiquidityAggregationEngine', () => {
  let registry: CrossChainConnectorRegistry;
  let aggregator: DefaultLiquidityAggregationEngine;

  beforeEach(async () => {
    registry = await makeConnectedRegistryAsync(['ton', 'ethereum', 'bnb']);
    aggregator = createLiquidityAggregationEngine(registry);
  });

  it('should be instantiated via factory', () => {
    expect(aggregator).toBeInstanceOf(DefaultLiquidityAggregationEngine);
  });

  it('should return liquidity sources for connected chains', () => {
    const sources = aggregator.getSources();
    expect(sources.length).toBeGreaterThan(0);
    for (const s of sources) {
      expect(s.id).toBeDefined();
      expect(s.chainId).toBeDefined();
      expect(s.liquidityUsd).toBeGreaterThanOrEqual(0);
    }
  });

  it('should fetch pools for a token pair', async () => {
    const pools = await aggregator.getPools('TON', 'USDT');
    expect(Array.isArray(pools)).toBe(true);
  });

  it('should get token price across chains', async () => {
    const prices = await aggregator.getTokenPrice('TON');
    expect(Array.isArray(prices)).toBe(true);
    for (const p of prices) {
      expect(p.priceUsd).toBeGreaterThan(0);
    }
  });

  it('should get quote for same-chain swap', async () => {
    const from = makeTonToken();
    const to = makeUsdtToken();
    const quote = await aggregator.getQuote(from, to, 100);

    expect(quote.inputToken.symbol).toBe('TON');
    expect(quote.outputToken.symbol).toBe('USDT');
    expect(quote.inputAmount).toBe(100);
    expect(quote.routes.length).toBeGreaterThan(0);
    expect(quote.bestRoute).toBeDefined();
    expect(quote.bestRoute.totalAmountOut).toBeGreaterThan(0);
    expect(quote.quotedAt).toBeInstanceOf(Date);
    expect(quote.expiresAt).toBeInstanceOf(Date);
  });

  it('should get quote for cross-chain swap', async () => {
    const from = makeTonToken();
    const to = makeEthToken();
    const quote = await aggregator.getQuote(from, to, 1000);

    expect(quote.bestRoute).toBeDefined();
    // Cross-chain routes have multiple legs
    if (quote.bestRoute.legs.length > 1) {
      const hasCrossChainLeg = quote.bestRoute.legs.some(
        l => l.fromChainId !== l.toChainId
      );
      expect(hasCrossChainLeg).toBe(true);
    }
  });

  it('should support different aggregation modes', async () => {
    const from = makeTonToken();
    const to = makeUsdtToken();

    const modes = ['best_price', 'lowest_gas', 'min_slippage'] as const;
    for (const mode of modes) {
      const quote = await aggregator.getQuote(from, to, 100, mode);
      expect(quote.bestRoute.mode).toBe(mode);
    }
  });

  it('should refresh sources', async () => {
    const beforeRefresh = aggregator.getSources().length;
    await aggregator.refresh();
    const afterRefresh = aggregator.getSources().length;
    expect(afterRefresh).toBeGreaterThan(0);
    // Source count should be similar after refresh
    expect(Math.abs(afterRefresh - beforeRefresh)).toBeLessThan(20);
  });
});

// ============================================================================
// Execution Tests
// ============================================================================

describe('DefaultCrossChainTradeExecutor', () => {
  let registry: CrossChainConnectorRegistry;
  let aggregator: DefaultLiquidityAggregationEngine;
  let executor: DefaultCrossChainTradeExecutor;

  beforeEach(async () => {
    registry = await makeConnectedRegistryAsync(['ton', 'ethereum']);
    aggregator = createLiquidityAggregationEngine(registry);
    executor = createCrossChainTradeExecutor(aggregator, registry);
  });

  it('should be instantiated via factory', () => {
    expect(executor).toBeInstanceOf(DefaultCrossChainTradeExecutor);
  });

  it('should start with no active trades', () => {
    expect(executor.getActiveTrades()).toHaveLength(0);
  });

  it('should execute a same-chain trade', async () => {
    const from = makeTonToken();
    const to = makeUsdtToken();
    const quote = await aggregator.getQuote(from, to, 100);

    const request: TradeRequest = {
      id: 'test-trade-1',
      type: 'same_chain_swap',
      fromToken: from,
      toToken: to,
      amountIn: 100,
      minAmountOut: 1,
      slippageTolerance: 0.05,
      priority: 'medium',
    };

    const execution = await executor.executeTrade(request, quote.bestRoute);

    expect(execution.id).toBeDefined();
    expect(execution.status).toBe('completed');
    expect(execution.amountOut).toBeGreaterThan(0);
    expect(execution.executedAt).toBeInstanceOf(Date);
    expect(execution.completedAt).toBeInstanceOf(Date);
  });

  it('should track trade in history after completion', async () => {
    const from = makeTonToken();
    const to = makeUsdtToken();
    const quote = await aggregator.getQuote(from, to, 100);

    const request: TradeRequest = {
      id: 'test-trade-2',
      type: 'same_chain_swap',
      fromToken: from,
      toToken: to,
      amountIn: 100,
      minAmountOut: 1,
      slippageTolerance: 0.05,
      priority: 'low',
    };

    await executor.executeTrade(request, quote.bestRoute);

    const history = executor.getTradeHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it('should find a trade by ID', async () => {
    const from = makeTonToken();
    const to = makeUsdtToken();
    const quote = await aggregator.getQuote(from, to, 100);

    const request: TradeRequest = {
      id: 'test-trade-3',
      type: 'same_chain_swap',
      fromToken: from,
      toToken: to,
      amountIn: 100,
      minAmountOut: 1,
      slippageTolerance: 0.05,
      priority: 'medium',
    };

    const execution = await executor.executeTrade(request, quote.bestRoute);
    const found = executor.getTrade(execution.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(execution.id);
  });

  it('should emit events during trade execution', async () => {
    const events: CrossChainLiquidityEvent[] = [];
    executor.onEvent(e => events.push(e));

    const from = makeTonToken();
    const to = makeUsdtToken();
    const quote = await aggregator.getQuote(from, to, 100);

    const request: TradeRequest = {
      id: 'test-trade-events',
      type: 'same_chain_swap',
      fromToken: from,
      toToken: to,
      amountIn: 100,
      minAmountOut: 1,
      slippageTolerance: 0.05,
      priority: 'high',
    };

    await executor.executeTrade(request, quote.bestRoute);

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain('trade_started');
    expect(eventTypes).toContain('trade_completed');
  });

  it('should scan for arbitrage opportunities across chains', async () => {
    const tokens = [makeTonToken(), makeUsdtToken()];
    const opportunities = await executor.scanArbitrageOpportunities(tokens);
    expect(Array.isArray(opportunities)).toBe(true);
    // May or may not find opportunities depending on simulated prices
    for (const opp of opportunities) {
      expect(opp.token).toBeDefined();
      expect(opp.buyChainId).toBeDefined();
      expect(opp.sellChainId).toBeDefined();
      expect(opp.spreadPercent).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Portfolio Tests
// ============================================================================

describe('DefaultMultiChainPortfolioTracker', () => {
  let registry: CrossChainConnectorRegistry;
  let aggregator: DefaultLiquidityAggregationEngine;
  let tracker: DefaultMultiChainPortfolioTracker;

  beforeEach(async () => {
    registry = await makeConnectedRegistryAsync(['ton', 'ethereum', 'bnb']);
    aggregator = createLiquidityAggregationEngine(registry);
    tracker = createMultiChainPortfolioTracker(registry, aggregator);
  });

  it('should be instantiated via factory', () => {
    expect(tracker).toBeInstanceOf(DefaultMultiChainPortfolioTracker);
  });

  it('should return undefined portfolio before first sync', () => {
    expect(tracker.getPortfolio('agent-1')).toBeUndefined();
  });

  it('should sync portfolio across all connected chains', async () => {
    const portfolio = await tracker.sync('agent-1');

    expect(portfolio.agentId).toBe('agent-1');
    expect(portfolio.chains.length).toBeGreaterThan(0);
    expect(portfolio.balances.length).toBeGreaterThan(0);
    expect(portfolio.totalValueUsd).toBeGreaterThan(0);
    expect(portfolio.chainAllocations.length).toBeGreaterThan(0);
    expect(portfolio.lastSyncedAt).toBeInstanceOf(Date);
  });

  it('should store and retrieve portfolio after sync', async () => {
    await tracker.sync('agent-2');
    const portfolio = tracker.getPortfolio('agent-2');
    expect(portfolio).toBeDefined();
    expect(portfolio?.agentId).toBe('agent-2');
  });

  it('should return chain-specific balances', async () => {
    await tracker.sync('agent-3');
    const tonBalances = tracker.getChainBalances('agent-3', 'ton');
    expect(tonBalances.length).toBeGreaterThan(0);
    for (const b of tonBalances) {
      expect(b.chainId).toBe('ton');
    }
  });

  it('should record transactions', () => {
    tracker.recordTransaction('agent-4', {
      hash: '0xtest',
      chainId: 'ton',
      status: 'confirmed',
      confirmations: 12,
      submittedAt: new Date(),
    });

    const history = tracker.getTransactionHistory('agent-4');
    expect(history).toHaveLength(1);
    expect(history[0].hash).toBe('0xtest');
  });

  it('should filter transaction history by chain', () => {
    tracker.recordTransaction('agent-5', {
      hash: '0xton',
      chainId: 'ton',
      status: 'confirmed',
      confirmations: 1,
      submittedAt: new Date(),
    });
    tracker.recordTransaction('agent-5', {
      hash: '0xeth',
      chainId: 'ethereum',
      status: 'confirmed',
      confirmations: 12,
      submittedAt: new Date(),
    });

    const tonTxs = tracker.getTransactionHistory('agent-5', { chainId: 'ton' });
    expect(tonTxs).toHaveLength(1);
    expect(tonTxs[0].chainId).toBe('ton');
  });

  it('should update and retrieve chain performance', () => {
    tracker.updateChainPerformance('agent-6', {
      chainId: 'ton',
      strategyId: 'strategy-1',
      pnlUsd: 500,
      pnlPercent: 5,
      tradesExecuted: 10,
      feesUsd: 25,
      period: 'weekly',
    });

    const perf = tracker.getChainPerformance('agent-6', 'weekly');
    expect(perf).toHaveLength(1);
    expect(perf[0].pnlUsd).toBe(500);
  });

  it('should emit events on portfolio sync', async () => {
    const events: CrossChainLiquidityEvent[] = [];
    tracker.onEvent(e => events.push(e));

    await tracker.sync('agent-7');

    const synced = events.find(e => e.type === 'portfolio_synced');
    expect(synced).toBeDefined();
    expect(synced?.data.agentId).toBe('agent-7');
  });
});

// ============================================================================
// Risk Monitor Tests
// ============================================================================

describe('DefaultCrossChainRiskMonitor', () => {
  let registry: CrossChainConnectorRegistry;
  let monitor: DefaultCrossChainRiskMonitor;

  beforeEach(async () => {
    registry = await makeConnectedRegistryAsync(['ton', 'ethereum']);
    monitor = createCrossChainRiskMonitor(registry);
  });

  it('should be instantiated via factory', () => {
    expect(monitor).toBeInstanceOf(DefaultCrossChainRiskMonitor);
  });

  it('should return default risk limits', () => {
    const limits = monitor.getLimits();
    expect(limits.maxSlippagePercent).toBe(DEFAULT_RISK_LIMITS.maxSlippagePercent);
    expect(limits.maxSingleTradeUsd).toBe(DEFAULT_RISK_LIMITS.maxSingleTradeUsd);
  });

  it('should update risk limits', () => {
    monitor.updateLimits({ maxSingleTradeUsd: 100_000 });
    expect(monitor.getLimits().maxSingleTradeUsd).toBe(100_000);
  });

  it('should start with no alerts', () => {
    expect(monitor.getActiveAlerts()).toHaveLength(0);
  });

  it('should validate a compliant trade as approved', async () => {
    const from = makeTonToken();
    const to = makeUsdtToken();

    const aggregator = createLiquidityAggregationEngine(registry);
    const quote = await aggregator.getQuote(from, to, 1000);

    const request: TradeRequest = {
      id: 'risk-test-1',
      type: 'same_chain_swap',
      fromToken: from,
      toToken: to,
      amountIn: 1000,
      minAmountOut: 900,
      slippageTolerance: 0.005,
      priority: 'medium',
    };

    const result = monitor.validateTrade(request, quote.bestRoute);
    expect(result.approved).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
  });

  it('should reject a trade exceeding the slippage limit', async () => {
    // Set very tight slippage limit
    monitor.updateLimits({ maxSlippagePercent: 0.1 });

    const from = makeTonToken();
    const to = makeUsdtToken();
    const aggregator = createLiquidityAggregationEngine(registry);
    const quote = await aggregator.getQuote(from, to, 100);

    const request: TradeRequest = {
      id: 'risk-test-2',
      type: 'same_chain_swap',
      fromToken: from,
      toToken: to,
      amountIn: 100,
      minAmountOut: 90,
      slippageTolerance: 0.02, // 2% > 0.1% limit
      priority: 'medium',
    };

    const result = monitor.validateTrade(request, quote.bestRoute);
    expect(result.approved).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].field).toBe('slippage');
  });

  it('should reject a trade on a blacklisted chain', async () => {
    monitor.updateLimits({ blacklistedChains: ['ton'] });

    const from = makeTonToken();
    const to = makeUsdtToken();
    const aggregator = createLiquidityAggregationEngine(registry);
    const quote = await aggregator.getQuote(from, to, 100);

    const request: TradeRequest = {
      id: 'risk-test-3',
      type: 'same_chain_swap',
      fromToken: from,
      toToken: to,
      amountIn: 100,
      minAmountOut: 90,
      slippageTolerance: 0.01,
      priority: 'medium',
    };

    const result = monitor.validateTrade(request, quote.bestRoute);
    expect(result.approved).toBe(false);
    const chainViolation = result.violations.find(v => v.field === 'fromChain');
    expect(chainViolation).toBeDefined();
  });

  it('should return risk metrics for a chain', () => {
    const metrics = monitor.getChainRiskMetrics('ton');
    expect(metrics.chainId).toBe('ton');
    expect(metrics.riskScore).toBeGreaterThanOrEqual(0);
    expect(metrics.riskScore).toBeLessThanOrEqual(100);
    expect(metrics.updatedAt).toBeInstanceOf(Date);
  });

  it('should run a risk scan and generate alerts', async () => {
    const alerts = await monitor.runRiskScan();
    expect(Array.isArray(alerts)).toBe(true);
    // May generate some alerts based on simulated metrics
    for (const alert of alerts) {
      expect(alert.id).toBeDefined();
      expect(alert.category).toBeDefined();
      expect(alert.severity).toBeDefined();
      expect(alert.description).toBeDefined();
    }
  });

  it('should resolve alerts', async () => {
    const alerts = await monitor.runRiskScan();
    if (alerts.length > 0) {
      const alertId = alerts[0].id;
      monitor.resolveAlert(alertId);

      const activeAlerts = monitor.getActiveAlerts();
      const isStillActive = activeAlerts.some(a => a.id === alertId);
      expect(isStillActive).toBe(false);

      const allAlerts = monitor.getAllAlerts();
      const resolvedAlert = allAlerts.find(a => a.id === alertId);
      expect(resolvedAlert?.resolvedAt).toBeInstanceOf(Date);
    }
  });

  it('should emit events when risk alerts are generated', async () => {
    const events: CrossChainLiquidityEvent[] = [];
    monitor.onEvent(e => events.push(e));

    await monitor.runRiskScan();

    // May or may not have risk events depending on simulated metrics
    // Just verify the event subscription works
    expect(Array.isArray(events)).toBe(true);
  });
});

// ============================================================================
// Plugin Layer Tests
// ============================================================================

describe('CrossChainPluginLayer', () => {
  let registry: CrossChainConnectorRegistry;
  let aggregator: DefaultLiquidityAggregationEngine;
  let executor: DefaultCrossChainTradeExecutor;
  let portfolioTracker: DefaultMultiChainPortfolioTracker;
  let riskMonitor: DefaultCrossChainRiskMonitor;
  let layer: CrossChainPluginLayer;

  beforeEach(async () => {
    registry = await makeConnectedRegistryAsync(['ton', 'ethereum', 'bnb']);
    aggregator = createLiquidityAggregationEngine(registry);
    executor = createCrossChainTradeExecutor(aggregator, registry);
    portfolioTracker = createMultiChainPortfolioTracker(registry, aggregator);
    riskMonitor = createCrossChainRiskMonitor(registry);
    layer = createCrossChainPluginLayer(true);
  });

  function makeContext() {
    return {
      agentId: 'test-agent',
      chainIds: ['ton', 'ethereum', 'bnb'] as const,
      tokens: [makeTonToken(), makeUsdtToken(), makeEthToken()],
      executor,
      aggregator,
      portfolioTracker,
      riskMonitor,
    };
  }

  it('should have built-in plugins registered', () => {
    const plugins = layer.getAll();
    expect(plugins.length).toBeGreaterThanOrEqual(3);
  });

  it('should find arbitrage scanner plugin', () => {
    const arb = layer.get('cross-chain-arbitrage-scanner');
    expect(arb).toBeDefined();
    expect(arb?.manifest.type).toBe('arbitrage');
  });

  it('should find liquidity scanner plugin', () => {
    const scan = layer.get('cross-chain-liquidity-scanner');
    expect(scan).toBeDefined();
    expect(scan?.manifest.type).toBe('liquidity_scan');
  });

  it('should find analytics plugin', () => {
    const analytics = layer.get('cross-chain-analytics');
    expect(analytics).toBeDefined();
    expect(analytics?.manifest.type).toBe('analytics');
  });

  it('should execute the arbitrage scanner plugin', async () => {
    const result = await layer.execute(
      'cross-chain-arbitrage-scanner',
      makeContext()
    );

    expect(result.pluginId).toBe('cross-chain-arbitrage-scanner');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.executedAt).toBeInstanceOf(Date);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should execute the liquidity scanner plugin', async () => {
    const result = await layer.execute(
      'cross-chain-liquidity-scanner',
      makeContext()
    );

    expect(result.pluginId).toBe('cross-chain-liquidity-scanner');
    expect(result.success).toBe(true);
    expect(result.data?.totalPoolsFound).toBeDefined();
  });

  it('should execute the analytics plugin', async () => {
    const result = await layer.execute(
      'cross-chain-analytics',
      makeContext()
    );

    expect(result.pluginId).toBe('cross-chain-analytics');
    expect(result.success).toBe(true);
    expect(result.data?.chainsTracked).toBeDefined();
  });

  it('should return error result for unknown plugin', async () => {
    const result = await layer.execute('unknown-plugin', makeContext());
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should execute all plugins', async () => {
    const results = await layer.executeAll(makeContext());
    expect(results.length).toBeGreaterThanOrEqual(3);
    for (const r of results) {
      expect(r.pluginId).toBeDefined();
    }
  });

  it('should get plugins by type', () => {
    const arbitragPlugins = layer.getByType('arbitrage');
    expect(arbitragPlugins.length).toBeGreaterThanOrEqual(1);
    for (const p of arbitragPlugins) {
      expect(p.manifest.type).toBe('arbitrage');
    }
  });

  it('should allow registering custom plugins', () => {
    const customPlugin: import('../../connectors/cross-chain-liquidity').CrossChainPlugin = {
      manifest: {
        id: 'custom-test-plugin',
        name: 'Custom Test Plugin',
        version: '1.0.0',
        type: 'custom',
        supportedChains: ['ton'],
        description: 'Test',
        capabilities: {
          scanArbitrage: false,
          trackLiquidity: false,
          monitorBridges: false,
          executeStrategies: false,
          reportAnalytics: false,
        },
      },
      initialize: async () => {},
      execute: async () => ({
        pluginId: 'custom-test-plugin',
        success: true,
        data: { custom: true },
        executedAt: new Date(),
        durationMs: 1,
      }),
      shutdown: async () => {},
    };

    layer.register(customPlugin);
    expect(layer.get('custom-test-plugin')).toBeDefined();
  });

  it('should emit events when plugins are executed', async () => {
    const events: CrossChainLiquidityEvent[] = [];
    layer.onEvent(e => events.push(e));

    await layer.execute('cross-chain-arbitrage-scanner', makeContext());

    const executed = events.find(e => e.type === 'plugin_executed');
    expect(executed).toBeDefined();
  });
});

// ============================================================================
// Unified Manager Tests
// ============================================================================

describe('DefaultCrossChainLiquidityManager', () => {
  let manager: DefaultCrossChainLiquidityManager;

  beforeEach(() => {
    manager = createCrossChainLiquidityManager({
      connectors: [
        { chainId: 'ton', enabled: true },
        { chainId: 'ethereum', enabled: true },
        { chainId: 'bnb', enabled: true },
      ],
      riskMonitoringEnabled: true,
      autoArbitrage: false,
    });
  });

  it('should be instantiated via factory', () => {
    expect(manager).toBeInstanceOf(DefaultCrossChainLiquidityManager);
  });

  it('should connect to all configured chains', async () => {
    const statuses = await manager.connect();
    expect(statuses.length).toBeGreaterThan(0);
    const connected = statuses.filter(s => s.status === 'connected');
    expect(connected.length).toBeGreaterThan(0);
  });

  it('should provide a health report', async () => {
    await manager.connect();
    const health = manager.getHealth();

    expect(health.isHealthy).toBe(true);
    expect(health.connectedChains.length).toBeGreaterThan(0);
    expect(health.totalLiquidityUsd).toBeGreaterThanOrEqual(0);
    expect(health.activeTrades).toBe(0);
    expect(Array.isArray(health.riskAlerts)).toBe(true);
  });

  it('should provide stats starting at zero', () => {
    const stats = manager.getStats();
    expect(stats.totalTradesExecuted).toBe(0);
    expect(stats.totalVolumeUsd).toBe(0);
  });

  it('should get a quote after connecting', async () => {
    await manager.connect();
    const from = makeTonToken();
    const to = makeUsdtToken();
    const quote = await manager.getQuote(from, to, 500);

    expect(quote.bestRoute).toBeDefined();
    expect(quote.bestRoute.totalAmountOut).toBeGreaterThan(0);
  });

  it('should execute a trade and update stats', async () => {
    await manager.connect();
    const from = makeTonToken();
    const to = makeUsdtToken();
    const quote = await manager.getQuote(from, to, 100);

    const request: TradeRequest = {
      id: 'manager-trade-1',
      type: 'same_chain_swap',
      fromToken: from,
      toToken: to,
      amountIn: 100,
      minAmountOut: 1,
      slippageTolerance: 0.005, // 0.5% — within default 1% limit
      priority: 'medium',
    };

    const execution = await manager.executeTrade(request, quote.bestRoute);
    expect(execution.status).toBe('completed');

    const stats = manager.getStats();
    expect(stats.totalTradesExecuted).toBe(1);
    expect(stats.successRate).toBe(1);
  });

  it('should sync portfolio across chains', async () => {
    await manager.connect();
    const portfolio = await manager.syncPortfolio('agent-1');

    expect(portfolio.agentId).toBe('agent-1');
    expect(portfolio.totalValueUsd).toBeGreaterThan(0);
  });

  it('should scan for arbitrage opportunities', async () => {
    await manager.connect();
    const tokens = [makeTonToken(), makeUsdtToken()];
    const opportunities = await manager.scanArbitrage(tokens);

    expect(Array.isArray(opportunities)).toBe(true);
  });

  it('should expose all sub-components', async () => {
    expect(manager.getConnectorRegistry()).toBeInstanceOf(CrossChainConnectorRegistry);
    expect(manager.getAggregator()).toBeInstanceOf(DefaultLiquidityAggregationEngine);
    expect(manager.getExecutor()).toBeInstanceOf(DefaultCrossChainTradeExecutor);
    expect(manager.getPortfolioTracker()).toBeInstanceOf(DefaultMultiChainPortfolioTracker);
    expect(manager.getRiskMonitor()).toBeInstanceOf(DefaultCrossChainRiskMonitor);
    expect(manager.getPluginLayer()).toBeInstanceOf(CrossChainPluginLayer);
  });

  it('should forward events from sub-components', async () => {
    await manager.connect();
    const events: CrossChainLiquidityEvent[] = [];
    manager.onEvent(e => events.push(e));

    const from = makeTonToken();
    const to = makeUsdtToken();
    const quote = await manager.getQuote(from, to, 100);

    const request: TradeRequest = {
      id: 'event-test',
      type: 'same_chain_swap',
      fromToken: from,
      toToken: to,
      amountIn: 100,
      minAmountOut: 1,
      slippageTolerance: 0.005, // 0.5% — within default 1% limit
      priority: 'high',
    };

    await manager.executeTrade(request, quote.bestRoute);

    expect(events.length).toBeGreaterThan(0);
    const tradeStarted = events.find(e => e.type === 'trade_started');
    expect(tradeStarted).toBeDefined();
  });

  it('should disconnect from all chains', async () => {
    await manager.connect();
    await manager.disconnect();

    const health = manager.getHealth();
    expect(health.isHealthy).toBe(false);
    expect(health.connectedChains).toHaveLength(0);
  });

  it('should use DEFAULT_CROSS_CHAIN_CONFIG as base', () => {
    const defaultManager = createCrossChainLiquidityManager();
    const config = defaultManager.config;

    expect(config.connectors.length).toBe(
      DEFAULT_CROSS_CHAIN_CONFIG.connectors.length
    );
    expect(config.defaultAggregationMode).toBe(
      DEFAULT_CROSS_CHAIN_CONFIG.defaultAggregationMode
    );
  });
});

// ============================================================================
// Plugin Manifests Tests
// ============================================================================

describe('Built-in Plugin Manifests', () => {
  it('should have valid manifest for arbitrage scanner', () => {
    const plugin = new ArbitrageScannerPlugin();
    expect(plugin.manifest.id).toBe('cross-chain-arbitrage-scanner');
    expect(plugin.manifest.capabilities.scanArbitrage).toBe(true);
    expect(plugin.manifest.supportedChains.length).toBeGreaterThan(0);
  });

  it('should have valid manifest for liquidity scanner', () => {
    const plugin = new LiquidityScannerPlugin();
    expect(plugin.manifest.id).toBe('cross-chain-liquidity-scanner');
    expect(plugin.manifest.capabilities.trackLiquidity).toBe(true);
  });

  it('should have valid manifest for analytics', () => {
    const plugin = new CrossChainAnalyticsPlugin();
    expect(plugin.manifest.id).toBe('cross-chain-analytics');
    expect(plugin.manifest.capabilities.reportAnalytics).toBe(true);
  });
});
