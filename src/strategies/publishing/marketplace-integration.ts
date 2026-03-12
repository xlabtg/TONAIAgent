/**
 * TONAIAgent - Strategy Publishing Marketplace Integration
 *
 * Integrates the Strategy Publishing System with the Strategy Marketplace (#216).
 * Enables published strategies to appear in the marketplace for discovery.
 *
 * Key features:
 * - Sync published strategies to marketplace listings
 * - Convert strategy metadata to marketplace format
 * - Update marketplace metrics from publishing metrics
 * - Unified strategy discovery across both systems
 *
 * Implements Issue #217: Strategy Publishing System
 */

import type {
  StrategyMetadata,
  StrategyPerformanceMetrics,
  PublishingEventCallback,
  PublishingEvent,
} from './types';

import type {
  MarketplaceStrategyListing,
  MarketplaceStrategyCategory,
  MarketplaceRiskLevel,
} from '../../strategy-marketplace';

import { InMemoryStrategyRegistry } from '../registry';
import { DefaultStrategyMarketplace, createStrategyMarketplace } from '../../strategy-marketplace';

// ============================================================================
// Category and Risk Level Mappings
// ============================================================================

/**
 * Map publishing categories to marketplace categories
 */
const CATEGORY_MAP: Record<string, MarketplaceStrategyCategory> = {
  momentum: 'momentum',
  mean_reversion: 'mean_reversion',
  arbitrage: 'arbitrage',
  grid_trading: 'grid_trading',
  yield_farming: 'yield_farming',
  trend_following: 'trend_following',
  dca: 'momentum', // Map DCA to momentum
  scalping: 'arbitrage', // Map scalping to arbitrage
  swing_trading: 'trend_following', // Map swing trading to trend following
  experimental: 'experimental',
};

/**
 * Map publishing risk levels to marketplace risk levels
 */
const RISK_LEVEL_MAP: Record<string, MarketplaceRiskLevel> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
};

// ============================================================================
// Marketplace Integration Interface
// ============================================================================

/**
 * Interface for marketplace integration operations
 */
export interface MarketplaceIntegration {
  /** Sync a published strategy to the marketplace */
  syncToMarketplace(strategyId: string): Promise<MarketplaceStrategyListing>;

  /** Remove a strategy from the marketplace (when hidden/deprecated) */
  removeFromMarketplace(strategyId: string): Promise<void>;

  /** Update marketplace listing metrics */
  updateMarketplaceMetrics(strategyId: string): Promise<void>;

  /** Get the marketplace listing for a published strategy */
  getMarketplaceListing(strategyId: string): Promise<MarketplaceStrategyListing | null>;

  /** List all strategies in marketplace (including published via this system) */
  listMarketplaceStrategies(): Promise<MarketplaceStrategyListing[]>;
}

// ============================================================================
// Default Marketplace Integration
// ============================================================================

/**
 * Default implementation of marketplace integration.
 * Bridges the publishing system with the marketplace.
 */
export class DefaultMarketplaceIntegration implements MarketplaceIntegration {
  private readonly registry: InMemoryStrategyRegistry;
  private readonly marketplace: DefaultStrategyMarketplace;

  constructor(registry: InMemoryStrategyRegistry, marketplace?: DefaultStrategyMarketplace) {
    this.registry = registry;
    this.marketplace = marketplace ?? createStrategyMarketplace();

    // Subscribe to registry events to auto-sync
    this.registry.onEvent(this.handleRegistryEvent.bind(this));
  }

  /**
   * Sync a published strategy to the marketplace
   */
  async syncToMarketplace(strategyId: string): Promise<MarketplaceStrategyListing> {
    const strategy = await this.registry.getStrategy(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (strategy.status !== 'published') {
      throw new Error('Can only sync published strategies to marketplace');
    }

    const metrics = await this.registry.getMetrics(strategyId);
    const listing = this.convertToMarketplaceListing(strategy, metrics);

    // Register in marketplace
    this.marketplace.registerStrategy(listing);

    return listing;
  }

  /**
   * Remove a strategy from the marketplace
   */
  async removeFromMarketplace(strategyId: string): Promise<void> {
    // The marketplace doesn't have a direct remove method,
    // but we can update the strategy to be hidden by modifying its state
    // For now, we'll just not sync hidden/deprecated strategies
    const existing = await this.marketplace.getStrategy(strategyId);
    if (existing) {
      // Mark as deprecated in marketplace by updating metadata
      const deprecatedListing: MarketplaceStrategyListing = {
        ...existing,
        activeUsers: 0,
        verified: false,
      };
      this.marketplace.registerStrategy(deprecatedListing);
    }
  }

  /**
   * Update marketplace listing metrics
   */
  async updateMarketplaceMetrics(strategyId: string): Promise<void> {
    const strategy = await this.registry.getStrategy(strategyId);
    if (!strategy || strategy.status !== 'published') {
      return;
    }

    const metrics = await this.registry.getMetrics(strategyId);
    if (!metrics) {
      return;
    }

    const existing = await this.marketplace.getStrategy(strategyId);
    if (existing) {
      const updatedListing: MarketplaceStrategyListing = {
        ...existing,
        roi30d: metrics.avg_roi,
        winRate: metrics.avg_win_rate,
        totalTrades: metrics.trade_count,
        maxDrawdown: metrics.avg_drawdown,
        sharpeRatio: metrics.sharpe_ratio,
        reputationScore: this.calculateReputationScore(metrics),
        activeUsers: metrics.agents_using,
      };
      this.marketplace.registerStrategy(updatedListing);
    }
  }

  /**
   * Get the marketplace listing for a published strategy
   */
  async getMarketplaceListing(strategyId: string): Promise<MarketplaceStrategyListing | null> {
    return this.marketplace.getStrategy(strategyId);
  }

  /**
   * List all strategies in marketplace
   */
  async listMarketplaceStrategies(): Promise<MarketplaceStrategyListing[]> {
    return this.marketplace.listStrategies();
  }

  /**
   * Expose the underlying marketplace
   */
  getMarketplace(): DefaultStrategyMarketplace {
    return this.marketplace;
  }

  // ============================================================================
  // Event Handler
  // ============================================================================

  private handleRegistryEvent(event: PublishingEvent): void {
    switch (event.type) {
      case 'strategy_published':
        if (event.strategy_id) {
          this.syncToMarketplace(event.strategy_id).catch(() => {
            // Log error but don't throw
          });
        }
        break;

      case 'strategy_deprecated':
      case 'strategy_hidden':
        if (event.strategy_id) {
          this.removeFromMarketplace(event.strategy_id).catch(() => {
            // Log error but don't throw
          });
        }
        break;

      case 'metrics_updated':
        if (event.strategy_id) {
          this.updateMarketplaceMetrics(event.strategy_id).catch(() => {
            // Log error but don't throw
          });
        }
        break;
    }
  }

  // ============================================================================
  // Conversion Helpers
  // ============================================================================

  private convertToMarketplaceListing(
    strategy: StrategyMetadata,
    metrics: StrategyPerformanceMetrics | null
  ): MarketplaceStrategyListing {
    const category = this.mapCategory(strategy.category);
    const riskLevel = this.mapRiskLevel(strategy.risk_level);

    return {
      id: strategy.strategy_id,
      name: strategy.name,
      description: strategy.description,
      author: strategy.author_name,
      authorId: strategy.author,
      category,
      riskLevel,
      supportedAssets: this.extractAssets(strategy.supported_pairs),
      version: strategy.version,
      verified: strategy.verified,
      roi30d: metrics?.avg_roi ?? 0,
      winRate: metrics?.avg_win_rate ?? 0,
      totalTrades: metrics?.trade_count ?? 0,
      maxDrawdown: metrics?.avg_drawdown ?? 0,
      sharpeRatio: metrics?.sharpe_ratio ?? 0,
      reputationScore: metrics ? this.calculateReputationScore(metrics) : 5.0,
      activeUsers: metrics?.agents_using ?? 0,
      minCapital: strategy.recommended_capital,
      publishedAt: strategy.published_at ?? strategy.created_at,
      tags: strategy.tags,
    };
  }

  private mapCategory(category: string): MarketplaceStrategyCategory {
    return CATEGORY_MAP[category] ?? 'experimental';
  }

  private mapRiskLevel(riskLevel: string): MarketplaceRiskLevel {
    return RISK_LEVEL_MAP[riskLevel] ?? 'medium';
  }

  private extractAssets(pairs: string[]): string[] {
    const assets = new Set<string>();
    for (const pair of pairs) {
      const [base, quote] = pair.split('/');
      if (base) assets.add(base);
      if (quote) assets.add(quote);
    }
    return Array.from(assets);
  }

  private calculateReputationScore(metrics: StrategyPerformanceMetrics): number {
    // Calculate reputation score based on multiple factors (0-10 scale)
    let score = 5.0; // Base score

    // ROI contribution (0-2 points)
    if (metrics.avg_roi > 20) score += 2;
    else if (metrics.avg_roi > 10) score += 1.5;
    else if (metrics.avg_roi > 5) score += 1;
    else if (metrics.avg_roi > 0) score += 0.5;

    // Win rate contribution (0-1.5 points)
    if (metrics.avg_win_rate > 70) score += 1.5;
    else if (metrics.avg_win_rate > 60) score += 1;
    else if (metrics.avg_win_rate > 50) score += 0.5;

    // User adoption contribution (0-1 points)
    if (metrics.agents_using > 100) score += 1;
    else if (metrics.agents_using > 50) score += 0.75;
    else if (metrics.agents_using > 10) score += 0.5;

    // User rating contribution (0-0.5 points)
    if (metrics.rating_count > 0) {
      score += (metrics.avg_rating / 5) * 0.5;
    }

    // Drawdown penalty
    if (metrics.avg_drawdown > 20) score -= 1;
    else if (metrics.avg_drawdown > 10) score -= 0.5;

    // Clamp to 0-10 range
    return Math.max(0, Math.min(10, score));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a marketplace integration instance
 */
export function createMarketplaceIntegration(
  registry: InMemoryStrategyRegistry,
  marketplace?: DefaultStrategyMarketplace
): DefaultMarketplaceIntegration {
  return new DefaultMarketplaceIntegration(registry, marketplace);
}

// ============================================================================
// Exports
// ============================================================================

export type { MarketplaceIntegration };
