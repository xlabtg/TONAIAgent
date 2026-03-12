/**
 * TONAIAgent - Strategy Marketplace MVP
 *
 * Unified integration layer that connects:
 * - Strategy Engine (trading strategies)
 * - Marketplace (discovery, deployment, reputation)
 * - Agent Runtime (execution)
 *
 * This module provides:
 * - Pre-registered marketplace strategies
 * - Strategy metadata for marketplace listing
 * - Strategy deployment to agents
 * - Performance tracking integration
 *
 * @example
 * ```typescript
 * import {
 *   createStrategyMarketplace,
 *   MarketplaceStrategyType,
 * } from '@tonaiagent/core/strategy-marketplace';
 *
 * const marketplace = createStrategyMarketplace();
 *
 * // List available strategies
 * const strategies = await marketplace.listStrategies();
 *
 * // Deploy a strategy to an agent
 * const agent = await marketplace.deployStrategy({
 *   strategyId: 'momentum-trader',
 *   userId: 'user_123',
 *   capitalTON: 100,
 *   simulationMode: true,
 * });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type MarketplaceStrategyCategory =
  | 'momentum'
  | 'mean_reversion'
  | 'arbitrage'
  | 'grid_trading'
  | 'yield_farming'
  | 'trend_following'
  | 'experimental';

export type MarketplaceRiskLevel = 'low' | 'medium' | 'high';

/**
 * Strategy metadata for marketplace listing
 */
export interface MarketplaceStrategyListing {
  /** Unique strategy ID */
  id: string;
  /** Display name */
  name: string;
  /** Strategy description */
  description: string;
  /** Strategy author/creator */
  author: string;
  /** Author ID */
  authorId: string;
  /** Strategy category for filtering */
  category: MarketplaceStrategyCategory;
  /** Risk level assessment */
  riskLevel: MarketplaceRiskLevel;
  /** Assets this strategy supports */
  supportedAssets: string[];
  /** Semantic version */
  version: string;
  /** Whether the strategy is verified */
  verified: boolean;
  /** 30-day ROI percentage */
  roi30d: number;
  /** Win rate percentage */
  winRate: number;
  /** Total trades executed */
  totalTrades: number;
  /** Maximum drawdown percentage */
  maxDrawdown: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Reputation score (0-10) */
  reputationScore: number;
  /** Number of active users */
  activeUsers: number;
  /** Minimum capital requirement in TON */
  minCapital: number;
  /** When the strategy was published */
  publishedAt: Date;
  /** Tags for search */
  tags: string[];
}

/**
 * Input for deploying a strategy
 */
export interface DeployMarketplaceStrategyInput {
  /** Strategy ID to deploy */
  strategyId: string;
  /** User deploying the strategy */
  userId: string;
  /** Capital to allocate in TON */
  capitalTON: number;
  /** Whether to run in simulation mode */
  simulationMode?: boolean;
  /** Custom agent name */
  agentName?: string;
  /** Custom strategy parameters */
  parameters?: Record<string, unknown>;
}

/**
 * Deployed strategy agent result
 */
export interface MarketplaceDeployedAgent {
  /** Unique agent ID */
  agentId: string;
  /** Strategy ID being executed */
  strategyId: string;
  /** Strategy name */
  strategyName: string;
  /** Owner user ID */
  userId: string;
  /** Agent name */
  name: string;
  /** Allocated capital in TON */
  capitalAllocated: number;
  /** Whether running in simulation */
  simulationMode: boolean;
  /** Agent status */
  status: 'running' | 'paused' | 'stopped' | 'error';
  /** When deployed */
  deployedAt: Date;
}

/**
 * Filter options for listing strategies
 */
export interface MarketplaceStrategyFilter {
  /** Filter by category */
  category?: MarketplaceStrategyCategory;
  /** Filter by risk level */
  riskLevel?: MarketplaceRiskLevel;
  /** Filter by minimum ROI */
  minRoi?: number;
  /** Filter by maximum drawdown */
  maxDrawdown?: number;
  /** Text search query */
  search?: string;
  /** Sort field */
  sortBy?: 'roi' | 'sharpe' | 'popularity' | 'newest';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Strategy Marketplace interface
 */
export interface StrategyMarketplace {
  /** List available strategies with optional filters */
  listStrategies(filter?: MarketplaceStrategyFilter): Promise<MarketplaceStrategyListing[]>;
  /** Get a specific strategy by ID */
  getStrategy(strategyId: string): Promise<MarketplaceStrategyListing | null>;
  /** Get top strategies by a metric */
  getTopStrategies(
    metric: 'roi' | 'sharpe' | 'popularity',
    limit?: number
  ): Promise<MarketplaceStrategyListing[]>;
  /** Deploy a strategy to create an agent */
  deployStrategy(input: DeployMarketplaceStrategyInput): Promise<MarketplaceDeployedAgent>;
  /** Stop a deployed agent */
  stopAgent(agentId: string): Promise<void>;
  /** Get deployed agents for a user */
  getUserAgents(userId: string): Promise<MarketplaceDeployedAgent[]>;
}

// ============================================================================
// Built-in Marketplace Strategies
// ============================================================================

/**
 * Pre-configured marketplace strategies
 * These represent the initial strategies available in the marketplace MVP
 */
const BUILTIN_STRATEGIES: MarketplaceStrategyListing[] = [
  {
    id: 'momentum-trader',
    name: 'Momentum Trader',
    description:
      'Captures short-term price momentum using moving average crossovers and volume confirmation. ' +
      'Ideal for trending markets with clear directional moves.',
    author: 'TONAIAgent',
    authorId: 'platform',
    category: 'momentum',
    riskLevel: 'medium',
    supportedAssets: ['TON', 'BTC', 'ETH'],
    version: '1.0.0',
    verified: true,
    roi30d: 8.2,
    winRate: 68.5,
    totalTrades: 124,
    maxDrawdown: 5.8,
    sharpeRatio: 1.82,
    reputationScore: 8.7,
    activeUsers: 342,
    minCapital: 10,
    publishedAt: new Date('2026-02-15T10:30:00Z'),
    tags: ['momentum', 'trend', 'moving-average', 'beginner-friendly'],
  },
  {
    id: 'mean-reversion-pro',
    name: 'Mean Reversion Pro',
    description:
      'Exploits price mean reversion patterns using statistical analysis and Bollinger Bands. ' +
      'Best for range-bound markets with predictable oscillations.',
    author: 'QuantLab',
    authorId: 'creator_quantlab',
    category: 'mean_reversion',
    riskLevel: 'low',
    supportedAssets: ['TON', 'BTC', 'ETH'],
    version: '2.1.0',
    verified: true,
    roi30d: 5.4,
    winRate: 72.1,
    totalTrades: 89,
    maxDrawdown: 3.2,
    sharpeRatio: 2.14,
    reputationScore: 9.1,
    activeUsers: 518,
    minCapital: 50,
    publishedAt: new Date('2026-01-20T08:15:00Z'),
    tags: ['mean-reversion', 'bollinger', 'low-risk', 'statistical'],
  },
  {
    id: 'dex-arbitrage-hunter',
    name: 'DEX Arbitrage Hunter',
    description:
      'Identifies and executes arbitrage opportunities across TON DEX protocols (STON.fi, DeDust). ' +
      'Requires quick execution and higher capital for profitability.',
    author: 'ArbitrageKing',
    authorId: 'creator_arbking',
    category: 'arbitrage',
    riskLevel: 'high',
    supportedAssets: ['TON', 'USDT', 'USDC'],
    version: '1.2.0',
    verified: true,
    roi30d: 12.7,
    winRate: 61.3,
    totalTrades: 456,
    maxDrawdown: 8.5,
    sharpeRatio: 1.45,
    reputationScore: 7.8,
    activeUsers: 156,
    minCapital: 100,
    publishedAt: new Date('2026-02-01T14:45:00Z'),
    tags: ['arbitrage', 'dex', 'high-frequency', 'advanced'],
  },
  {
    id: 'grid-trading-bot',
    name: 'Grid Trading Bot',
    description:
      'Automated grid trading strategy for ranging markets. Places buy and sell orders at ' +
      'predefined price levels to profit from price oscillations.',
    author: 'GridMaster',
    authorId: 'creator_gridmaster',
    category: 'grid_trading',
    riskLevel: 'medium',
    supportedAssets: ['TON', 'BTC', 'ETH', 'SOL'],
    version: '1.5.0',
    verified: true,
    roi30d: 6.8,
    winRate: 65.2,
    totalTrades: 312,
    maxDrawdown: 4.7,
    sharpeRatio: 1.68,
    reputationScore: 8.2,
    activeUsers: 289,
    minCapital: 25,
    publishedAt: new Date('2026-02-10T11:20:00Z'),
    tags: ['grid', 'range-trading', 'automated', 'passive'],
  },
  {
    id: 'yield-optimizer',
    name: 'Yield Optimizer',
    description:
      'Maximizes DeFi yields by automatically rebalancing across TON yield protocols. ' +
      'Focuses on stable returns with minimal active management.',
    author: 'YieldHunter',
    authorId: 'creator_yieldhunter',
    category: 'yield_farming',
    riskLevel: 'low',
    supportedAssets: ['TON', 'USDT', 'USDC'],
    version: '3.0.0',
    verified: true,
    roi30d: 4.2,
    winRate: 85.6,
    totalTrades: 67,
    maxDrawdown: 2.1,
    sharpeRatio: 2.45,
    reputationScore: 9.4,
    activeUsers: 723,
    minCapital: 100,
    publishedAt: new Date('2025-12-05T09:00:00Z'),
    tags: ['yield', 'defi', 'passive', 'stable'],
  },
  {
    id: 'trend-following-alpha',
    name: 'Trend Following Alpha',
    description:
      'Multi-timeframe trend following strategy with dynamic position sizing. ' +
      'Adapts to market conditions using volatility-adjusted entry/exit rules.',
    author: 'AlphaTrader',
    authorId: 'creator_alphatrader',
    category: 'trend_following',
    riskLevel: 'medium',
    supportedAssets: ['TON', 'BTC', 'ETH'],
    version: '1.1.0',
    verified: false,
    roi30d: 9.5,
    winRate: 58.9,
    totalTrades: 78,
    maxDrawdown: 7.2,
    sharpeRatio: 1.52,
    reputationScore: 7.2,
    activeUsers: 98,
    minCapital: 20,
    publishedAt: new Date('2026-03-01T16:30:00Z'),
    tags: ['trend', 'multi-timeframe', 'adaptive', 'intermediate'],
  },
];

// ============================================================================
// Default Strategy Marketplace Implementation
// ============================================================================

export class DefaultStrategyMarketplace implements StrategyMarketplace {
  private readonly strategies: Map<string, MarketplaceStrategyListing> = new Map();
  private readonly deployedAgents: Map<string, MarketplaceDeployedAgent> = new Map();

  constructor() {
    // Initialize with built-in strategies
    for (const strategy of BUILTIN_STRATEGIES) {
      this.strategies.set(strategy.id, strategy);
    }
  }

  async listStrategies(filter?: MarketplaceStrategyFilter): Promise<MarketplaceStrategyListing[]> {
    let results = Array.from(this.strategies.values());

    if (filter) {
      // Category filter
      if (filter.category) {
        results = results.filter((s) => s.category === filter.category);
      }

      // Risk level filter
      if (filter.riskLevel) {
        results = results.filter((s) => s.riskLevel === filter.riskLevel);
      }

      // Minimum ROI filter
      if (filter.minRoi !== undefined) {
        results = results.filter((s) => s.roi30d >= filter.minRoi!);
      }

      // Maximum drawdown filter
      if (filter.maxDrawdown !== undefined) {
        results = results.filter((s) => s.maxDrawdown <= filter.maxDrawdown!);
      }

      // Text search
      if (filter.search) {
        const q = filter.search.toLowerCase();
        results = results.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.author.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      // Sorting
      // sortOrder: 'desc' → -1 (descending: higher values first)
      //            'asc'  →  1 (ascending: lower values first)
      // Base comparison (a - b) is ascending, multiply by -1 for descending
      const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;
      switch (filter.sortBy) {
        case 'roi':
          results.sort((a, b) => (a.roi30d - b.roi30d) * sortOrder);
          break;
        case 'sharpe':
          results.sort((a, b) => (a.sharpeRatio - b.sharpeRatio) * sortOrder);
          break;
        case 'popularity':
          results.sort((a, b) => (a.activeUsers - b.activeUsers) * sortOrder);
          break;
        case 'newest':
          results.sort(
            (a, b) =>
              (a.publishedAt.getTime() - b.publishedAt.getTime()) * sortOrder
          );
          break;
      }

      // Pagination
      const offset = filter.offset ?? 0;
      const limit = filter.limit ?? 50;
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  async getStrategy(strategyId: string): Promise<MarketplaceStrategyListing | null> {
    return this.strategies.get(strategyId) ?? null;
  }

  async getTopStrategies(
    metric: 'roi' | 'sharpe' | 'popularity',
    limit = 10
  ): Promise<MarketplaceStrategyListing[]> {
    return this.listStrategies({
      sortBy: metric,
      sortOrder: 'desc',
      limit,
    });
  }

  async deployStrategy(
    input: DeployMarketplaceStrategyInput
  ): Promise<MarketplaceDeployedAgent> {
    const strategy = await this.getStrategy(input.strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${input.strategyId}`);
    }

    if (input.capitalTON < strategy.minCapital) {
      throw new Error(
        `Minimum capital for ${strategy.name} is ${strategy.minCapital} TON`
      );
    }

    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    const agent: MarketplaceDeployedAgent = {
      agentId,
      strategyId: input.strategyId,
      strategyName: strategy.name,
      userId: input.userId,
      name: input.agentName ?? `${strategy.name} Agent`,
      capitalAllocated: input.capitalTON,
      simulationMode: input.simulationMode ?? false,
      status: 'running',
      deployedAt: now,
    };

    this.deployedAgents.set(agentId, agent);

    // Update active users count (simulated)
    const updatedStrategy = { ...strategy, activeUsers: strategy.activeUsers + 1 };
    this.strategies.set(strategy.id, updatedStrategy);

    return agent;
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.deployedAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Update agent status
    const stoppedAgent: MarketplaceDeployedAgent = {
      ...agent,
      status: 'stopped',
    };
    this.deployedAgents.set(agentId, stoppedAgent);

    // Update active users count (simulated)
    const strategy = this.strategies.get(agent.strategyId);
    if (strategy && strategy.activeUsers > 0) {
      const updatedStrategy = { ...strategy, activeUsers: strategy.activeUsers - 1 };
      this.strategies.set(strategy.id, updatedStrategy);
    }
  }

  async getUserAgents(userId: string): Promise<MarketplaceDeployedAgent[]> {
    return Array.from(this.deployedAgents.values()).filter(
      (agent) => agent.userId === userId
    );
  }

  /**
   * Register a custom strategy to the marketplace
   */
  registerStrategy(strategy: MarketplaceStrategyListing): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Get marketplace statistics
   */
  getStats(): { totalStrategies: number; totalUsers: number; topRoi: number } {
    const strategies = Array.from(this.strategies.values());
    return {
      totalStrategies: strategies.length,
      totalUsers: strategies.reduce((sum, s) => sum + s.activeUsers, 0),
      topRoi: Math.max(...strategies.map((s) => s.roi30d), 0),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Strategy Marketplace instance
 */
export function createStrategyMarketplace(): DefaultStrategyMarketplace {
  return new DefaultStrategyMarketplace();
}

// ============================================================================
// Re-exports
// ============================================================================

export { BUILTIN_STRATEGIES };

// ============================================================================
// Backtesting Integration (Issue #202)
// ============================================================================

export {
  // Main backtester
  DefaultMarketplaceBacktester,
  createMarketplaceBacktester,
  // Types
  type BacktestTimeframe,
  type MarketplaceBacktestConfig,
  type BacktestResultSummary,
  type MarketplaceBacktestResult,
  type BacktestComparisonResult,
  type MarketplaceBacktester,
  type CLIBacktestConfig,
  // CLI utilities
  parseCLIBacktestArgs,
  runCLIBacktest,
  formatCLIBacktestResult,
} from './backtesting-integration';

// ============================================================================
// Marketplace API (Issue #216)
// ============================================================================

export {
  // API Handler
  MarketplaceApi,
  createMarketplaceApi,
  createDemoMarketplaceApi,
  // Types
  MarketplaceError,
  type MarketplaceApiRequest,
  type MarketplaceApiResponse,
  type MarketplaceApiResponseBody,
  type MarketplaceErrorCode,
  type StrategyListResponse,
  type StrategyDetailsResponse,
  type StrategyPerformanceData,
  type DeployStrategyRequest,
  type RateStrategyRequest,
  type CategoriesResponse,
  type TopStrategiesResponse,
} from './api';

// ============================================================================
// Marketplace Dashboard UI (Issue #216)
// ============================================================================

export {
  // Dashboard Component
  MarketplaceDashboard,
  createMarketplaceDashboard,
  // Renderers
  renderMarketplaceListing,
  renderStrategyCard,
  renderStrategyDetails,
  renderEquityCurve,
  renderDrawdownChart,
  renderTradeDistribution,
  renderMonthlyReturns,
  renderReviews,
  renderDeployedAgents,
  renderCategories,
  renderMarketplaceStats,
  // Utilities
  getRiskLevelEmoji,
  getRiskLevelText,
  getCategoryEmoji,
  getStarRating,
  formatPercent,
  formatCurrency,
  formatNumber,
  getAgentStatusEmoji,
} from './dashboard';

export default DefaultStrategyMarketplace;
