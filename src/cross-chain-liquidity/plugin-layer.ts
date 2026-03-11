/**
 * TONAIAgent - Cross-Chain Plugin Layer
 *
 * Agent plugin system integration for cross-chain liquidity operations.
 * Provides arbitrage plugins, cross-chain analytics tools, and liquidity
 * scanner plugins that integrate with the existing agent plugin system.
 */

import type {
  CrossChainToken,
  CrossChainPluginManifest,
  CrossChainPluginType,
  CrossChainPluginCapabilities,
  PluginExecutionResult,
  ArbitrageOpportunity,
  LiquidityPool,
  CrossChainLiquidityEvent,
  CrossChainLiquidityEventCallback,
  SupportedChainId,
} from './types';

import type { CrossChainTradeExecutor } from './execution';
import type { LiquidityAggregationEngine } from './aggregation';
import type { MultiChainPortfolioTracker } from './portfolio';
import type { CrossChainRiskMonitor } from './risk';

// ============================================================================
// Plugin Interfaces
// ============================================================================

/** Context passed to plugin executions */
export interface CrossChainPluginContext {
  agentId: string;
  chainIds: SupportedChainId[];
  tokens: CrossChainToken[];
  executor: CrossChainTradeExecutor;
  aggregator: LiquidityAggregationEngine;
  portfolioTracker: MultiChainPortfolioTracker;
  riskMonitor: CrossChainRiskMonitor;
}

/** Base interface for all cross-chain plugins */
export interface CrossChainPlugin {
  readonly manifest: CrossChainPluginManifest;

  /** Initialize the plugin */
  initialize(context: CrossChainPluginContext): Promise<void>;

  /** Execute the plugin's primary action */
  execute(context: CrossChainPluginContext): Promise<PluginExecutionResult>;

  /** Shutdown the plugin */
  shutdown(): Promise<void>;
}

// ============================================================================
// Built-in Plugin: Arbitrage Scanner
// ============================================================================

export const ARBITRAGE_SCANNER_MANIFEST: CrossChainPluginManifest = {
  id: 'cross-chain-arbitrage-scanner',
  name: 'Cross-Chain Arbitrage Scanner',
  version: '1.0.0',
  type: 'arbitrage',
  supportedChains: ['ton', 'ethereum', 'bnb', 'solana', 'polygon'],
  description:
    'Scans for price discrepancies across chains and surfaces arbitrage opportunities',
  capabilities: {
    scanArbitrage: true,
    trackLiquidity: false,
    monitorBridges: false,
    executeStrategies: false,
    reportAnalytics: true,
  },
};

export class ArbitrageScannerPlugin implements CrossChainPlugin {
  readonly manifest = ARBITRAGE_SCANNER_MANIFEST;
  private context?: CrossChainPluginContext;
  private initialized = false;

  async initialize(context: CrossChainPluginContext): Promise<void> {
    this.context = context;
    this.initialized = true;
  }

  async execute(context: CrossChainPluginContext): Promise<PluginExecutionResult> {
    const start = Date.now();

    try {
      if (!this.initialized) {
        await this.initialize(context);
      }

      const opportunities = await context.executor.scanArbitrageOpportunities(
        context.tokens
      );

      const profitable = opportunities.filter(o => o.netProfitUsd > 0);

      return {
        pluginId: this.manifest.id,
        success: true,
        data: {
          opportunitiesFound: opportunities.length,
          profitableOpportunities: profitable.length,
          topOpportunities: profitable.slice(0, 5).map(o => ({
            token: o.token.symbol,
            buyChain: o.buyChainId,
            sellChain: o.sellChainId,
            spreadPercent: o.spreadPercent.toFixed(2),
            netProfitUsd: o.netProfitUsd.toFixed(2),
          })),
          totalPotentialProfitUsd: profitable.reduce(
            (s, o) => s + o.netProfitUsd,
            0
          ),
        },
        executedAt: new Date(),
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        pluginId: this.manifest.id,
        success: false,
        error: err instanceof Error ? err.message : 'Arbitrage scan failed',
        executedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.context = undefined;
  }
}

// ============================================================================
// Built-in Plugin: Liquidity Scanner
// ============================================================================

export const LIQUIDITY_SCANNER_MANIFEST: CrossChainPluginManifest = {
  id: 'cross-chain-liquidity-scanner',
  name: 'Cross-Chain Liquidity Scanner',
  version: '1.0.0',
  type: 'liquidity_scan',
  supportedChains: ['ton', 'ethereum', 'bnb', 'solana', 'polygon', 'avalanche'],
  description:
    'Scans all connected chains for available liquidity pools and reports depth and APY',
  capabilities: {
    scanArbitrage: false,
    trackLiquidity: true,
    monitorBridges: false,
    executeStrategies: false,
    reportAnalytics: true,
  },
};

export class LiquidityScannerPlugin implements CrossChainPlugin {
  readonly manifest = LIQUIDITY_SCANNER_MANIFEST;
  private initialized = false;

  async initialize(_context: CrossChainPluginContext): Promise<void> {
    this.initialized = true;
  }

  async execute(context: CrossChainPluginContext): Promise<PluginExecutionResult> {
    const start = Date.now();

    try {
      if (!this.initialized) {
        await this.initialize(context);
      }

      const allPools: LiquidityPool[] = [];
      for (const token of context.tokens) {
        const pools = await context.aggregator.getPools(
          token.symbol,
          'USDT'
        );
        allPools.push(...pools);
      }

      // Deduplicate by pool ID
      const uniquePools = Array.from(
        new Map(allPools.map(p => [p.id, p])).values()
      );

      const byChain: Record<string, number> = {};
      for (const pool of uniquePools) {
        byChain[pool.chainId] = (byChain[pool.chainId] ?? 0) + pool.totalLiquidityUsd;
      }

      const topPools = uniquePools
        .sort((a, b) => b.totalLiquidityUsd - a.totalLiquidityUsd)
        .slice(0, 10);

      return {
        pluginId: this.manifest.id,
        success: true,
        data: {
          totalPoolsFound: uniquePools.length,
          totalLiquidityUsd: uniquePools.reduce(
            (s, p) => s + p.totalLiquidityUsd,
            0
          ),
          liquidityByChain: byChain,
          topPools: topPools.map(p => ({
            id: p.id,
            chainId: p.chainId,
            dex: p.dex,
            pair: `${p.tokenA.symbol}/${p.tokenB.symbol}`,
            liquidityUsd: p.totalLiquidityUsd.toFixed(0),
            apy: p.apy.toFixed(2),
          })),
        },
        executedAt: new Date(),
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        pluginId: this.manifest.id,
        success: false,
        error: err instanceof Error ? err.message : 'Liquidity scan failed',
        executedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }
}

// ============================================================================
// Built-in Plugin: Cross-Chain Analytics
// ============================================================================

export const ANALYTICS_PLUGIN_MANIFEST: CrossChainPluginManifest = {
  id: 'cross-chain-analytics',
  name: 'Cross-Chain Analytics',
  version: '1.0.0',
  type: 'analytics',
  supportedChains: ['ton', 'ethereum', 'bnb', 'solana', 'polygon', 'avalanche', 'arbitrum', 'optimism'],
  description:
    'Aggregates cross-chain portfolio analytics, performance metrics, and risk summaries',
  capabilities: {
    scanArbitrage: false,
    trackLiquidity: true,
    monitorBridges: true,
    executeStrategies: false,
    reportAnalytics: true,
  },
};

export class CrossChainAnalyticsPlugin implements CrossChainPlugin {
  readonly manifest = ANALYTICS_PLUGIN_MANIFEST;
  private initialized = false;

  async initialize(_context: CrossChainPluginContext): Promise<void> {
    this.initialized = true;
  }

  async execute(context: CrossChainPluginContext): Promise<PluginExecutionResult> {
    const start = Date.now();

    try {
      if (!this.initialized) {
        await this.initialize(context);
      }

      const portfolio = await context.portfolioTracker.sync(context.agentId);
      const alerts = context.riskMonitor.getActiveAlerts();
      const newRiskAlerts = await context.riskMonitor.runRiskScan();
      const sources = context.aggregator.getSources();

      const chainMetrics = context.chainIds.map(chainId => {
        const metrics = context.riskMonitor.getChainRiskMetrics(chainId);
        return {
          chainId,
          riskScore: metrics.riskScore,
          liquidityUsd: metrics.liquidityDepthUsd,
          activeAlerts: metrics.alerts.length,
          slippage: (metrics.currentSlippage * 100).toFixed(3),
        };
      });

      return {
        pluginId: this.manifest.id,
        success: true,
        data: {
          portfolioValueUsd: portfolio.totalValueUsd,
          chainsTracked: portfolio.chains.length,
          balancesTracked: portfolio.balances.length,
          lpPositionsTracked: portfolio.lpPositions.length,
          activeRiskAlerts: alerts.length,
          newRiskAlerts: newRiskAlerts.length,
          liquiditySourcesAvailable: sources.length,
          chainMetrics,
          chainAllocations: portfolio.chainAllocations.map(a => ({
            chainId: a.chainId,
            valueUsd: a.valueUsd.toFixed(0),
            percent: (a.percent * 100).toFixed(1),
          })),
        },
        executedAt: new Date(),
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        pluginId: this.manifest.id,
        success: false,
        error: err instanceof Error ? err.message : 'Analytics failed',
        executedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }
}

// ============================================================================
// Plugin Registry
// ============================================================================

/** Manages cross-chain plugins */
export class CrossChainPluginLayer {
  private readonly plugins: Map<string, CrossChainPlugin> = new Map();
  private readonly eventCallbacks: CrossChainLiquidityEventCallback[] = [];
  private executionCounter = 0;

  /** Register a plugin */
  register(plugin: CrossChainPlugin): void {
    this.plugins.set(plugin.manifest.id, plugin);
    this.emitEvent('plugin_loaded', {
      pluginId: plugin.manifest.id,
      type: plugin.manifest.type,
    });
  }

  /** Unregister a plugin */
  unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  /** Get a plugin by ID */
  get(pluginId: string): CrossChainPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /** Get all registered plugins */
  getAll(): CrossChainPlugin[] {
    return Array.from(this.plugins.values());
  }

  /** Get plugins by type */
  getByType(type: CrossChainPluginType): CrossChainPlugin[] {
    return this.getAll().filter(p => p.manifest.type === type);
  }

  /** Execute a specific plugin */
  async execute(
    pluginId: string,
    context: CrossChainPluginContext
  ): Promise<PluginExecutionResult> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return {
        pluginId,
        success: false,
        error: `Plugin not found: ${pluginId}`,
        executedAt: new Date(),
        durationMs: 0,
      };
    }

    const result = await plugin.execute(context);
    ++this.executionCounter;

    this.emitEvent('plugin_executed', {
      pluginId,
      success: result.success,
      durationMs: result.durationMs,
    });

    return result;
  }

  /** Execute all plugins of a given type */
  async executeByType(
    type: CrossChainPluginType,
    context: CrossChainPluginContext
  ): Promise<PluginExecutionResult[]> {
    const plugins = this.getByType(type);
    return Promise.all(plugins.map(p => this.execute(p.manifest.id, context)));
  }

  /** Execute all registered plugins */
  async executeAll(
    context: CrossChainPluginContext
  ): Promise<PluginExecutionResult[]> {
    return Promise.all(
      this.getAll().map(p => this.execute(p.manifest.id, context))
    );
  }

  /** Initialize all plugins with the given context */
  async initializeAll(context: CrossChainPluginContext): Promise<void> {
    await Promise.allSettled(
      this.getAll().map(p => p.initialize(context))
    );
  }

  /** Shutdown all plugins */
  async shutdownAll(): Promise<void> {
    await Promise.allSettled(
      this.getAll().map(p => p.shutdown())
    );
  }

  onEvent(callback: CrossChainLiquidityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getExecutionCount(): number {
    return this.executionCounter;
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
// Factory Functions
// ============================================================================

/** Default set of built-in plugins */
export const BUILT_IN_PLUGINS: CrossChainPlugin[] = [
  new ArbitrageScannerPlugin(),
  new LiquidityScannerPlugin(),
  new CrossChainAnalyticsPlugin(),
];

/**
 * Create a cross-chain plugin layer with the default built-in plugins.
 */
export function createCrossChainPluginLayer(
  includeBuiltIn = true
): CrossChainPluginLayer {
  const layer = new CrossChainPluginLayer();

  if (includeBuiltIn) {
    for (const plugin of BUILT_IN_PLUGINS) {
      layer.register(plugin);
    }
  }

  return layer;
}
