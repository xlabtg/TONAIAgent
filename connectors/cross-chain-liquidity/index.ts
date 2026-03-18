/**
 * TONAIAgent - Cross-Chain Liquidity Integration Layer
 *
 * Enables AI agents and strategies to access liquidity from multiple
 * blockchain ecosystems (TON, Ethereum, BNB Chain, Solana, and more).
 *
 * Components:
 *   CrossChainConnectorRegistry  — Modular connector framework for each blockchain
 *   LiquidityAggregationEngine   — Aggregates DEX pools, bridges, DeFi protocols
 *   CrossChainTradeExecutor      — Cross-chain swaps, routing, and arbitrage
 *   MultiChainPortfolioTracker   — Multi-chain balances, LP positions, history
 *   CrossChainRiskMonitor        — Bridge risks, slippage, fragmentation controls
 *   CrossChainPluginLayer        — Agent plugin system integration
 *   CrossChainLiquidityManager   — Unified manager orchestrating all components
 *
 * @example
 * ```typescript
 * import { createCrossChainLiquidityManager } from './cross-chain-liquidity';
 *
 * const manager = createCrossChainLiquidityManager({
 *   connectors: [
 *     { chainId: 'ton', enabled: true },
 *     { chainId: 'ethereum', enabled: true },
 *     { chainId: 'bnb', enabled: true },
 *     { chainId: 'solana', enabled: true },
 *   ],
 *   defaultAggregationMode: 'best_price',
 *   autoArbitrage: false,
 *   riskMonitoringEnabled: true,
 * });
 *
 * // Connect to all chains
 * const statuses = await manager.connect();
 *
 * // Get a quote for a cross-chain trade
 * const quote = await manager.getQuote(tonToken, ethToken, 1000);
 *
 * // Execute the trade
 * const trade = await manager.executeTrade(quote.bestRoute);
 *
 * // Track portfolio across chains
 * const portfolio = await manager.syncPortfolio('my-agent-id');
 *
 * // Scan for arbitrage
 * const opportunities = await manager.scanArbitrage([tonToken, ethToken]);
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export * from './types';

// ============================================================================
// Connector Exports
// ============================================================================

export {
  BaseChainConnector,
  SimulatedChainConnector,
  CrossChainConnectorRegistry,
  createSimulatedConnector,
  createConnectorRegistry,
  CHAIN_METADATA,
  type CrossChainConnector,
} from './connector';

// ============================================================================
// Aggregation Exports
// ============================================================================

export {
  DefaultLiquidityAggregationEngine,
  createLiquidityAggregationEngine,
  type LiquidityAggregationEngine,
} from './aggregation';

// ============================================================================
// Execution Exports
// ============================================================================

export {
  DefaultCrossChainTradeExecutor,
  createCrossChainTradeExecutor,
  type CrossChainTradeExecutor,
} from './execution';

// ============================================================================
// Portfolio Exports
// ============================================================================

export {
  DefaultMultiChainPortfolioTracker,
  createMultiChainPortfolioTracker,
  type MultiChainPortfolioTracker,
} from './portfolio';

// ============================================================================
// Risk Exports
// ============================================================================

export {
  DefaultCrossChainRiskMonitor,
  createCrossChainRiskMonitor,
  DEFAULT_RISK_LIMITS,
  type CrossChainRiskMonitor,
  type RiskValidationResult,
  type RiskViolation,
} from './risk';

// ============================================================================
// Plugin Layer Exports
// ============================================================================

export {
  ArbitrageScannerPlugin,
  LiquidityScannerPlugin,
  CrossChainAnalyticsPlugin,
  CrossChainPluginLayer,
  createCrossChainPluginLayer,
  BUILT_IN_PLUGINS,
  ARBITRAGE_SCANNER_MANIFEST,
  LIQUIDITY_SCANNER_MANIFEST,
  ANALYTICS_PLUGIN_MANIFEST,
  type CrossChainPlugin,
  type CrossChainPluginContext,
} from './plugin-layer';

// ============================================================================
// Unified Manager
// ============================================================================

import type {
  CrossChainLiquidityConfig,
  CrossChainLiquidityHealth,
  CrossChainLiquidityStats,
  CrossChainLiquidityEventCallback,
  ConnectorStatus,
  AggregatedQuote,
  TradeRoute,
  TradeExecution,
  TradeRequest,
  ArbitrageOpportunity,
  MultiChainPortfolio,
  CrossChainToken,
  CrossChainRiskLimits,
  AggregationMode,
} from './types';

import {
  CrossChainConnectorRegistry,
  createConnectorRegistry,
} from './connector';

import {
  DefaultLiquidityAggregationEngine,
  createLiquidityAggregationEngine,
} from './aggregation';

import {
  DefaultCrossChainTradeExecutor,
  createCrossChainTradeExecutor,
} from './execution';

import {
  DefaultMultiChainPortfolioTracker,
  createMultiChainPortfolioTracker,
} from './portfolio';

import {
  DefaultCrossChainRiskMonitor,
  createCrossChainRiskMonitor,
} from './risk';

import {
  CrossChainPluginLayer,
  createCrossChainPluginLayer,
} from './plugin-layer';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CROSS_CHAIN_CONFIG: CrossChainLiquidityConfig = {
  connectors: [
    { chainId: 'ton', enabled: true },
    { chainId: 'ethereum', enabled: true },
    { chainId: 'bnb', enabled: true },
    { chainId: 'solana', enabled: true },
  ],
  defaultAggregationMode: 'best_price',
  riskLimits: {
    maxSlippagePercent: 1.0,
    maxBridgeTimeMs: 600_000,
    maxSingleTradeUsd: 500_000,
    maxDailyVolumeUsd: 5_000_000,
    maxPositionConcentrationPercent: 30,
    minLiquidityPoolUsd: 100_000,
    blacklistedBridges: [],
    blacklistedChains: [],
  },
  portfolioSyncIntervalMs: 300_000,  // 5 minutes
  arbitrageScanIntervalMs: 60_000,   // 1 minute
  autoArbitrage: false,
  minArbitrageProfitUsd: 50,
  riskMonitoringEnabled: true,
  maxConcurrentTrades: 5,
  quoteExpiryMs: 30_000,
};

// ============================================================================
// Unified Manager Interface
// ============================================================================

/** Unified interface for the cross-chain liquidity integration layer */
export interface CrossChainLiquidityManager {
  readonly config: CrossChainLiquidityConfig;

  /** Connect to all configured chains */
  connect(): Promise<ConnectorStatus[]>;

  /** Disconnect from all chains */
  disconnect(): Promise<void>;

  /** Get a quote for a cross-chain trade */
  getQuote(
    fromToken: CrossChainToken,
    toToken: CrossChainToken,
    amountIn: number,
    mode?: AggregationMode
  ): Promise<AggregatedQuote>;

  /** Execute a trade using the given route */
  executeTrade(request: TradeRequest, route: TradeRoute): Promise<TradeExecution>;

  /** Sync portfolio across all chains for an agent */
  syncPortfolio(agentId: string): Promise<MultiChainPortfolio>;

  /** Scan for cross-chain arbitrage opportunities */
  scanArbitrage(tokens: CrossChainToken[]): Promise<ArbitrageOpportunity[]>;

  /** Execute an arbitrage opportunity */
  executeArbitrage(opportunity: ArbitrageOpportunity): Promise<TradeExecution>;

  /** Get system health */
  getHealth(): CrossChainLiquidityHealth;

  /** Get cumulative statistics */
  getStats(): CrossChainLiquidityStats;

  /** Get the connector registry */
  getConnectorRegistry(): CrossChainConnectorRegistry;

  /** Get the liquidity aggregator */
  getAggregator(): DefaultLiquidityAggregationEngine;

  /** Get the trade executor */
  getExecutor(): DefaultCrossChainTradeExecutor;

  /** Get the portfolio tracker */
  getPortfolioTracker(): DefaultMultiChainPortfolioTracker;

  /** Get the risk monitor */
  getRiskMonitor(): DefaultCrossChainRiskMonitor;

  /** Get the plugin layer */
  getPluginLayer(): CrossChainPluginLayer;

  /** Subscribe to system events */
  onEvent(callback: CrossChainLiquidityEventCallback): void;
}

// ============================================================================
// Unified Manager Implementation
// ============================================================================

export class DefaultCrossChainLiquidityManager implements CrossChainLiquidityManager {
  readonly config: CrossChainLiquidityConfig;

  private readonly registry: CrossChainConnectorRegistry;
  private readonly aggregator: DefaultLiquidityAggregationEngine;
  private readonly executor: DefaultCrossChainTradeExecutor;
  private readonly portfolioTracker: DefaultMultiChainPortfolioTracker;
  private readonly riskMonitor: DefaultCrossChainRiskMonitor;
  private readonly pluginLayer: CrossChainPluginLayer;
  private readonly eventCallbacks: CrossChainLiquidityEventCallback[] = [];

  private totalTrades = 0;
  private totalVolumeUsd = 0;
  private totalFeesUsd = 0;
  private totalGasUsd = 0;
  private arbitrageFound = 0;
  private arbitrageExecuted = 0;
  private totalTradeTimeMs = 0;
  private successfulTrades = 0;

  constructor(config: Partial<CrossChainLiquidityConfig> = {}) {
    this.config = {
      ...DEFAULT_CROSS_CHAIN_CONFIG,
      ...config,
      riskLimits: {
        ...DEFAULT_CROSS_CHAIN_CONFIG.riskLimits,
        ...config.riskLimits,
      },
      connectors: config.connectors ?? DEFAULT_CROSS_CHAIN_CONFIG.connectors,
    };

    this.registry = createConnectorRegistry(this.config.connectors);
    this.aggregator = createLiquidityAggregationEngine(
      this.registry,
      this.config.defaultAggregationMode
    );
    this.executor = createCrossChainTradeExecutor(this.aggregator, this.registry);
    this.portfolioTracker = createMultiChainPortfolioTracker(
      this.registry,
      this.aggregator
    );
    this.riskMonitor = createCrossChainRiskMonitor(
      this.registry,
      this.config.riskLimits
    );
    this.pluginLayer = createCrossChainPluginLayer(true);

    this.setupEventForwarding();
  }

  // ============================================================================
  // Connectivity
  // ============================================================================

  async connect(): Promise<ConnectorStatus[]> {
    const statuses = await this.registry.connectAll();
    await this.aggregator.refresh();
    return statuses;
  }

  async disconnect(): Promise<void> {
    await this.pluginLayer.shutdownAll();
    await this.registry.disconnectAll();
  }

  // ============================================================================
  // Trading
  // ============================================================================

  async getQuote(
    fromToken: CrossChainToken,
    toToken: CrossChainToken,
    amountIn: number,
    mode?: AggregationMode
  ): Promise<AggregatedQuote> {
    return this.aggregator.getQuote(fromToken, toToken, amountIn, mode);
  }

  async executeTrade(
    request: TradeRequest,
    route: TradeRoute
  ): Promise<TradeExecution> {
    // Validate against risk limits before execution
    if (this.config.riskMonitoringEnabled) {
      const validation = this.riskMonitor.validateTrade(request, route);
      if (!validation.approved) {
        throw new Error(
          `Trade rejected by risk monitor: ${validation.violations.map(v => v.message).join('; ')}`
        );
      }
    }

    const start = Date.now();
    const execution = await this.executor.executeTrade(request, route);

    // Update stats
    this.totalTrades++;
    if (execution.status === 'completed') {
      this.successfulTrades++;
      this.totalVolumeUsd += execution.amountIn;
      this.totalFeesUsd += execution.totalFeeUsd;
      this.totalGasUsd += execution.totalGasUsd;
      this.totalTradeTimeMs += Date.now() - start;
    }

    return execution;
  }

  // ============================================================================
  // Portfolio
  // ============================================================================

  async syncPortfolio(agentId: string): Promise<MultiChainPortfolio> {
    return this.portfolioTracker.sync(agentId);
  }

  // ============================================================================
  // Arbitrage
  // ============================================================================

  async scanArbitrage(tokens: CrossChainToken[]): Promise<ArbitrageOpportunity[]> {
    const opportunities = await this.executor.scanArbitrageOpportunities(tokens);
    this.arbitrageFound += opportunities.length;
    return opportunities;
  }

  async executeArbitrage(
    opportunity: ArbitrageOpportunity
  ): Promise<TradeExecution> {
    const execution = await this.executor.executeArbitrage(opportunity);
    if (execution.status === 'completed') {
      this.arbitrageExecuted++;
    }
    return execution;
  }

  // ============================================================================
  // Observability
  // ============================================================================

  getHealth(): CrossChainLiquidityHealth {
    const connectedChains = this.registry.getConnectedChains();
    const allChains = this.config.connectors.map(c => c.chainId);
    const disconnectedChains = allChains.filter(
      id => !connectedChains.includes(id)
    );

    const allSources = this.aggregator.getSources();
    const totalLiquidity = allSources.reduce(
      (s, src) => s + src.liquidityUsd,
      0
    );

    const activeTrades = this.executor.getActiveTrades().length;
    const activeAlerts = this.riskMonitor.getActiveAlerts();

    return {
      isHealthy: connectedChains.length > 0,
      connectedChains,
      disconnectedChains,
      totalLiquidityUsd: totalLiquidity,
      activeTrades,
      pendingArbitrageOpportunities: 0,
      riskAlerts: activeAlerts,
    };
  }

  getStats(): CrossChainLiquidityStats {
    return {
      totalTradesExecuted: this.totalTrades,
      totalVolumeUsd: this.totalVolumeUsd,
      totalProfitUsd: 0, // Calculated from individual trade results
      totalFeesUsd: this.totalFeesUsd,
      totalGasUsd: this.totalGasUsd,
      arbitrageOpportunitiesFound: this.arbitrageFound,
      arbitrageExecuted: this.arbitrageExecuted,
      averageTradeTimeMs:
        this.successfulTrades > 0 ? this.totalTradeTimeMs / this.successfulTrades : 0,
      successRate:
        this.totalTrades > 0 ? this.successfulTrades / this.totalTrades : 0,
    };
  }

  // ============================================================================
  // Accessors
  // ============================================================================

  getConnectorRegistry(): CrossChainConnectorRegistry {
    return this.registry;
  }

  getAggregator(): DefaultLiquidityAggregationEngine {
    return this.aggregator;
  }

  getExecutor(): DefaultCrossChainTradeExecutor {
    return this.executor;
  }

  getPortfolioTracker(): DefaultMultiChainPortfolioTracker {
    return this.portfolioTracker;
  }

  getRiskMonitor(): DefaultCrossChainRiskMonitor {
    return this.riskMonitor;
  }

  getPluginLayer(): CrossChainPluginLayer {
    return this.pluginLayer;
  }

  onEvent(callback: CrossChainLiquidityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private setupEventForwarding(): void {
    const forward = (event: Parameters<CrossChainLiquidityEventCallback>[0]) => {
      for (const cb of this.eventCallbacks) {
        try {
          cb(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.executor.onEvent(forward);
    this.portfolioTracker.onEvent(forward);
    this.riskMonitor.onEvent(forward);
    this.pluginLayer.onEvent(forward);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a cross-chain liquidity manager.
 */
export function createCrossChainLiquidityManager(
  config?: Partial<CrossChainLiquidityConfig>
): DefaultCrossChainLiquidityManager {
  return new DefaultCrossChainLiquidityManager(config);
}

export { DEFAULT_CROSS_CHAIN_CONFIG };
