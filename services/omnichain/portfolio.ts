/**
 * TONAIAgent - Cross-Chain Portfolio Engine
 *
 * Unified portfolio management across multiple blockchains.
 * Provides real-time balance tracking, exposure analysis,
 * and portfolio risk metrics.
 *
 * Features:
 * - Multi-chain balance aggregation
 * - Real-time portfolio valuation
 * - Chain and asset allocation tracking
 * - Exposure and concentration analysis
 * - Portfolio risk metrics (VaR, drawdown)
 */

import {
  CrossChainPortfolio,
  CrossChainHolding,
  ChainAllocation,
  ExposureMetrics,
  PortfolioRiskMetrics,
  ChainId,
  Asset,
  PortfolioConfig,
  OmnichainEvent,
  OmnichainEventCallback,
  ActionResult,
} from './types';

// ============================================================================
// Portfolio Engine Interface
// ============================================================================

export interface PortfolioEngine {
  // Portfolio operations
  getPortfolio(userId: string, agentId?: string): Promise<ActionResult<CrossChainPortfolio>>;
  syncPortfolio(userId: string, agentId?: string): Promise<ActionResult<CrossChainPortfolio>>;

  // Holdings operations
  getHoldings(userId: string, chainId?: ChainId): Promise<ActionResult<CrossChainHolding[]>>;
  getHolding(userId: string, assetId: string): Promise<ActionResult<CrossChainHolding | null>>;
  updateHolding(userId: string, holding: Partial<CrossChainHolding>): Promise<ActionResult<void>>;

  // Allocation analysis
  getChainAllocations(userId: string): Promise<ActionResult<ChainAllocation[]>>;
  getExposure(userId: string): Promise<ActionResult<ExposureMetrics>>;
  getRiskMetrics(userId: string): Promise<ActionResult<PortfolioRiskMetrics>>;

  // Valuation
  getTotalValue(userId: string): Promise<ActionResult<{ usd: number; ton: number }>>;
  getHistoricalValue(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<ActionResult<PortfolioSnapshot[]>>;

  // Events
  onEvent(callback: OmnichainEventCallback): void;
}

export interface PortfolioEngineConfig extends Partial<PortfolioConfig> {}

export interface PortfolioSnapshot {
  timestamp: Date;
  totalValueUsd: number;
  totalValueTon: number;
  chainAllocations: Record<ChainId, number>;
  topHoldings: Array<{ asset: string; percent: number }>;
}

// ============================================================================
// Default Portfolio Engine Implementation
// ============================================================================

export class DefaultPortfolioEngine implements PortfolioEngine {
  private readonly config: PortfolioConfig;
  private readonly portfolios: Map<string, CrossChainPortfolio> = new Map();
  private readonly holdings: Map<string, CrossChainHolding[]> = new Map();
  private readonly eventCallbacks: OmnichainEventCallback[] = [];
  private readonly historicalData: Map<string, PortfolioSnapshot[]> = new Map();
  private readonly assets: Map<string, Asset> = new Map();

  constructor(config: PortfolioEngineConfig = {}) {
    this.config = {
      syncIntervalMinutes: config.syncIntervalMinutes ?? 5,
      staleThresholdMinutes: config.staleThresholdMinutes ?? 15,
      enableRealtimeUpdates: config.enableRealtimeUpdates ?? true,
      trackHistoricalData: config.trackHistoricalData ?? true,
      retentionDays: config.retentionDays ?? 90,
    };

    // Initialize with some default assets for demonstration
    this.initializeDefaultAssets();
  }

  // ==========================================================================
  // Portfolio Operations
  // ==========================================================================

  async getPortfolio(
    userId: string,
    agentId?: string
  ): Promise<ActionResult<CrossChainPortfolio>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId, agentId);

    try {
      let portfolio = this.portfolios.get(portfolioKey);

      if (!portfolio) {
        // Create new portfolio
        portfolio = this.createEmptyPortfolio(userId, agentId);
        this.portfolios.set(portfolioKey, portfolio);
      }

      // Check if portfolio is stale
      const isStale = this.isPortfolioStale(portfolio);
      if (isStale) {
        portfolio.syncStatus = 'stale';
      }

      return {
        success: true,
        data: portfolio,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async syncPortfolio(
    userId: string,
    agentId?: string
  ): Promise<ActionResult<CrossChainPortfolio>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId, agentId);

    try {
      let portfolio = this.portfolios.get(portfolioKey);

      if (!portfolio) {
        portfolio = this.createEmptyPortfolio(userId, agentId);
      }

      portfolio.syncStatus = 'syncing';
      this.portfolios.set(portfolioKey, portfolio);

      this.emitEvent('info', 'portfolio_synced', {
        userId,
        agentId,
        status: 'syncing',
      });

      // Get all holdings for this user
      const userHoldings = this.holdings.get(portfolioKey) || [];

      // Calculate totals
      let totalValueUsd = 0;
      let totalValueTon = 0;

      for (const holding of userHoldings) {
        totalValueUsd += holding.balanceUsd;
        totalValueTon += holding.balanceTon;
      }

      // Calculate chain allocations
      const chainAllocations = this.calculateChainAllocations(userHoldings, totalValueUsd);

      // Calculate exposure metrics
      const exposure = this.calculateExposure(userHoldings, totalValueUsd);

      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(userHoldings, exposure);

      // Update portfolio
      portfolio = {
        ...portfolio,
        totalValueUsd,
        totalValueTon,
        holdings: userHoldings,
        chainAllocations,
        exposure,
        riskMetrics,
        lastUpdated: new Date(),
        syncStatus: 'synced',
      };

      this.portfolios.set(portfolioKey, portfolio);

      // Store historical snapshot
      if (this.config.trackHistoricalData) {
        this.storeSnapshot(portfolioKey, portfolio);
      }

      this.emitEvent('info', 'portfolio_synced', {
        userId,
        agentId,
        totalValueUsd,
        holdingsCount: userHoldings.length,
      });

      return {
        success: true,
        data: portfolio,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      // Mark as error state
      const portfolio = this.portfolios.get(portfolioKey);
      if (portfolio) {
        portfolio.syncStatus = 'error';
        this.portfolios.set(portfolioKey, portfolio);
      }
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Holdings Operations
  // ==========================================================================

  async getHoldings(
    userId: string,
    chainId?: ChainId
  ): Promise<ActionResult<CrossChainHolding[]>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId);

    try {
      let holdings = this.holdings.get(portfolioKey) || [];

      if (chainId) {
        holdings = holdings.filter(h => h.asset.chainId === chainId);
      }

      return {
        success: true,
        data: holdings,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getHolding(
    userId: string,
    assetId: string
  ): Promise<ActionResult<CrossChainHolding | null>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId);

    try {
      const holdings = this.holdings.get(portfolioKey) || [];
      const holding = holdings.find(h => h.asset.id === assetId) || null;

      return {
        success: true,
        data: holding,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async updateHolding(
    userId: string,
    holdingUpdate: Partial<CrossChainHolding> & { asset: Asset }
  ): Promise<ActionResult<void>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId);

    try {
      let holdings = this.holdings.get(portfolioKey) || [];
      const existingIndex = holdings.findIndex(
        h => h.asset.id === holdingUpdate.asset.id
      );

      const now = new Date();

      if (existingIndex >= 0) {
        // Update existing holding
        holdings[existingIndex] = {
          ...holdings[existingIndex],
          ...holdingUpdate,
          lastSyncedAt: now,
        };
      } else {
        // Add new holding
        const newHolding: CrossChainHolding = {
          asset: holdingUpdate.asset,
          balance: holdingUpdate.balance || '0',
          balanceUsd: holdingUpdate.balanceUsd || 0,
          balanceTon: holdingUpdate.balanceTon || 0,
          percentOfPortfolio: 0, // Will be calculated during sync
          lastSyncedAt: now,
          isLocked: holdingUpdate.isLocked || false,
        };
        holdings.push(newHolding);
      }

      this.holdings.set(portfolioKey, holdings);

      this.emitEvent('info', 'holding_updated', {
        userId,
        assetId: holdingUpdate.asset.id,
      });

      return {
        success: true,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Allocation Analysis
  // ==========================================================================

  async getChainAllocations(
    userId: string
  ): Promise<ActionResult<ChainAllocation[]>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId);

    try {
      const portfolio = this.portfolios.get(portfolioKey);

      if (!portfolio) {
        return {
          success: true,
          data: [],
          executionTime: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: portfolio.chainAllocations,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getExposure(userId: string): Promise<ActionResult<ExposureMetrics>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId);

    try {
      const portfolio = this.portfolios.get(portfolioKey);

      if (!portfolio) {
        return {
          success: true,
          data: this.createEmptyExposure(),
          executionTime: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: portfolio.exposure,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getRiskMetrics(userId: string): Promise<ActionResult<PortfolioRiskMetrics>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId);

    try {
      const portfolio = this.portfolios.get(portfolioKey);

      if (!portfolio) {
        return {
          success: true,
          data: this.createEmptyRiskMetrics(),
          executionTime: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: portfolio.riskMetrics,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Valuation
  // ==========================================================================

  async getTotalValue(
    userId: string
  ): Promise<ActionResult<{ usd: number; ton: number }>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId);

    try {
      const portfolio = this.portfolios.get(portfolioKey);

      return {
        success: true,
        data: {
          usd: portfolio?.totalValueUsd || 0,
          ton: portfolio?.totalValueTon || 0,
        },
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getHistoricalValue(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<ActionResult<PortfolioSnapshot[]>> {
    const startTime = Date.now();
    const portfolioKey = this.getPortfolioKey(userId);

    try {
      const snapshots = this.historicalData.get(portfolioKey) || [];

      const now = new Date();
      const periodMs = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
      };

      const cutoff = new Date(now.getTime() - periodMs[period]);
      const filtered = snapshots.filter(s => s.timestamp >= cutoff);

      return {
        success: true,
        data: filtered,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  onEvent(callback: OmnichainEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private getPortfolioKey(userId: string, agentId?: string): string {
    return agentId ? `${userId}:${agentId}` : userId;
  }

  private createEmptyPortfolio(userId: string, agentId?: string): CrossChainPortfolio {
    return {
      id: this.generateId(),
      userId,
      agentId,
      totalValueUsd: 0,
      totalValueTon: 0,
      holdings: [],
      chainAllocations: [],
      exposure: this.createEmptyExposure(),
      riskMetrics: this.createEmptyRiskMetrics(),
      lastUpdated: new Date(),
      syncStatus: 'synced',
    };
  }

  private createEmptyExposure(): ExposureMetrics {
    return {
      stablecoinPercent: 0,
      volatilePercent: 0,
      defiExposurePercent: 0,
      nativeTokenPercent: 0,
      largestPositionPercent: 0,
      top3PositionsPercent: 0,
      chainConcentration: {},
      assetConcentration: {},
    };
  }

  private createEmptyRiskMetrics(): PortfolioRiskMetrics {
    return {
      overallRiskScore: 0,
      chainRiskScore: 0,
      assetRiskScore: 0,
      concentrationRiskScore: 0,
      liquidityRiskScore: 0,
      volatilityScore: 0,
      correlationRisk: 0,
      maxDrawdown24h: 0,
      maxDrawdown7d: 0,
      valueAtRisk95: 0,
      lastCalculated: new Date(),
    };
  }

  private calculateChainAllocations(
    holdings: CrossChainHolding[],
    totalValueUsd: number
  ): ChainAllocation[] {
    const chainMap = new Map<ChainId, ChainAllocation>();

    for (const holding of holdings) {
      const chainId = holding.asset.chainId;
      const existing = chainMap.get(chainId);

      if (existing) {
        existing.valueUsd += holding.balanceUsd;
        existing.valueTon += holding.balanceTon;
        existing.assetCount++;
      } else {
        chainMap.set(chainId, {
          chainId,
          chainName: this.getChainName(chainId),
          valueUsd: holding.balanceUsd,
          valueTon: holding.balanceTon,
          percentOfPortfolio: 0,
          assetCount: 1,
          isWhitelisted: true,
        });
      }
    }

    // Calculate percentages
    const allocations = Array.from(chainMap.values());
    for (const allocation of allocations) {
      allocation.percentOfPortfolio =
        totalValueUsd > 0 ? (allocation.valueUsd / totalValueUsd) * 100 : 0;
    }

    return allocations.sort((a, b) => b.valueUsd - a.valueUsd);
  }

  private calculateExposure(
    holdings: CrossChainHolding[],
    totalValueUsd: number
  ): ExposureMetrics {
    if (totalValueUsd === 0 || holdings.length === 0) {
      return this.createEmptyExposure();
    }

    let stablecoinValue = 0;
    let volatileValue = 0;
    let nativeTokenValue = 0;
    const chainConcentration: Record<ChainId, number> = {};
    const assetConcentration: Record<string, number> = {};

    // Sort holdings by value for top positions
    const sortedHoldings = [...holdings].sort((a, b) => b.balanceUsd - a.balanceUsd);

    for (const holding of holdings) {
      const percent = (holding.balanceUsd / totalValueUsd) * 100;

      // Track concentrations
      const chainId = holding.asset.chainId;
      chainConcentration[chainId] = (chainConcentration[chainId] || 0) + percent;
      assetConcentration[holding.asset.symbol] = percent;

      // Categorize assets
      if (holding.asset.isStablecoin) {
        stablecoinValue += holding.balanceUsd;
      } else {
        volatileValue += holding.balanceUsd;
      }

      if (holding.asset.isNative) {
        nativeTokenValue += holding.balanceUsd;
      }
    }

    const largestPositionPercent =
      sortedHoldings.length > 0
        ? (sortedHoldings[0].balanceUsd / totalValueUsd) * 100
        : 0;

    const top3Value = sortedHoldings
      .slice(0, 3)
      .reduce((sum, h) => sum + h.balanceUsd, 0);
    const top3PositionsPercent = (top3Value / totalValueUsd) * 100;

    return {
      stablecoinPercent: (stablecoinValue / totalValueUsd) * 100,
      volatilePercent: (volatileValue / totalValueUsd) * 100,
      defiExposurePercent: 0, // Would need DeFi position tracking
      nativeTokenPercent: (nativeTokenValue / totalValueUsd) * 100,
      largestPositionPercent,
      top3PositionsPercent,
      chainConcentration,
      assetConcentration,
    };
  }

  private calculateRiskMetrics(
    holdings: CrossChainHolding[],
    exposure: ExposureMetrics
  ): PortfolioRiskMetrics {
    // Calculate concentration risk (higher when fewer assets hold more value)
    const concentrationRiskScore = Math.min(
      exposure.largestPositionPercent / 10, // 100% in one asset = 10/10 risk
      10
    );

    // Calculate chain risk based on concentration
    const maxChainConcentration = Math.max(
      ...Object.values(exposure.chainConcentration),
      0
    );
    const chainRiskScore = Math.min(maxChainConcentration / 10, 10);

    // Calculate asset risk based on stablecoin percentage
    // Higher stablecoin % = lower risk
    const assetRiskScore = Math.max(0, 10 - exposure.stablecoinPercent / 10);

    // Calculate volatility score (placeholder - would need price data)
    const volatilityScore = (exposure.volatilePercent / 100) * 7; // 0-7 scale

    // Liquidity risk (placeholder - would need liquidity data)
    const liquidityRiskScore = 3; // Default moderate

    // Overall risk score (weighted average)
    const overallRiskScore =
      concentrationRiskScore * 0.25 +
      chainRiskScore * 0.2 +
      assetRiskScore * 0.25 +
      volatilityScore * 0.2 +
      liquidityRiskScore * 0.1;

    // VaR calculation (simplified - would need historical data)
    const totalValue = holdings.reduce((sum, h) => sum + h.balanceUsd, 0);
    const valueAtRisk95 = totalValue * (overallRiskScore / 100) * 2; // Rough estimate

    return {
      overallRiskScore: Math.round(overallRiskScore * 10) / 10,
      chainRiskScore: Math.round(chainRiskScore * 10) / 10,
      assetRiskScore: Math.round(assetRiskScore * 10) / 10,
      concentrationRiskScore: Math.round(concentrationRiskScore * 10) / 10,
      liquidityRiskScore: Math.round(liquidityRiskScore * 10) / 10,
      volatilityScore: Math.round(volatilityScore * 10) / 10,
      correlationRisk: 5, // Placeholder
      maxDrawdown24h: 0, // Would need historical data
      maxDrawdown7d: 0,
      valueAtRisk95: Math.round(valueAtRisk95 * 100) / 100,
      lastCalculated: new Date(),
    };
  }

  private isPortfolioStale(portfolio: CrossChainPortfolio): boolean {
    const staleMs = this.config.staleThresholdMinutes * 60 * 1000;
    return Date.now() - portfolio.lastUpdated.getTime() > staleMs;
  }

  private storeSnapshot(portfolioKey: string, portfolio: CrossChainPortfolio): void {
    const snapshots = this.historicalData.get(portfolioKey) || [];

    const snapshot: PortfolioSnapshot = {
      timestamp: new Date(),
      totalValueUsd: portfolio.totalValueUsd,
      totalValueTon: portfolio.totalValueTon,
      chainAllocations: portfolio.chainAllocations.reduce(
        (acc, alloc) => {
          acc[alloc.chainId] = alloc.percentOfPortfolio;
          return acc;
        },
        {} as Record<ChainId, number>
      ),
      topHoldings: portfolio.holdings
        .sort((a, b) => b.balanceUsd - a.balanceUsd)
        .slice(0, 5)
        .map(h => ({
          asset: h.asset.symbol,
          percent: h.percentOfPortfolio,
        })),
    };

    snapshots.push(snapshot);

    // Clean up old snapshots
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - retentionMs);
    const filtered = snapshots.filter(s => s.timestamp >= cutoff);

    this.historicalData.set(portfolioKey, filtered);
  }

  private getChainName(chainId: ChainId): string {
    const names: Record<string, string> = {
      ton: 'The Open Network',
      eth: 'Ethereum',
      sol: 'Solana',
      bnb: 'BNB Chain',
      polygon: 'Polygon',
      arbitrum: 'Arbitrum',
      optimism: 'Optimism',
      avalanche: 'Avalanche',
      base: 'Base',
      fantom: 'Fantom',
      cosmos: 'Cosmos',
      tron: 'TRON',
    };
    return names[chainId] || chainId;
  }

  private initializeDefaultAssets(): void {
    const defaultAssets: Asset[] = [
      {
        id: 'ton',
        symbol: 'TON',
        name: 'Toncoin',
        chainId: 'ton',
        decimals: 9,
        isNative: true,
        isStablecoin: false,
        hasExternalId: true,
        externalId: 'ton',
      },
      {
        id: 'eth',
        symbol: 'ETH',
        name: 'Ethereum',
        chainId: 'eth',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        hasExternalId: true,
        externalId: 'eth',
      },
      {
        id: 'usdt-ton',
        symbol: 'USDT',
        name: 'Tether USD',
        chainId: 'ton',
        decimals: 6,
        isNative: false,
        isStablecoin: true,
        hasExternalId: true,
        externalId: 'usdtton',
      },
      {
        id: 'usdt-eth',
        symbol: 'USDT',
        name: 'Tether USD',
        chainId: 'eth',
        decimals: 6,
        contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        isNative: false,
        isStablecoin: true,
        hasExternalId: true,
        externalId: 'usdt',
      },
      {
        id: 'usdc-eth',
        symbol: 'USDC',
        name: 'USD Coin',
        chainId: 'eth',
        decimals: 6,
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        isNative: false,
        isStablecoin: true,
        hasExternalId: true,
        externalId: 'usdc',
      },
      {
        id: 'sol',
        symbol: 'SOL',
        name: 'Solana',
        chainId: 'sol',
        decimals: 9,
        isNative: true,
        isStablecoin: false,
        hasExternalId: true,
        externalId: 'sol',
      },
      {
        id: 'bnb',
        symbol: 'BNB',
        name: 'BNB',
        chainId: 'bnb',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        hasExternalId: true,
        externalId: 'bnb',
      },
    ];

    for (const asset of defaultAssets) {
      this.assets.set(asset.id, asset);
    }
  }

  private emitEvent(
    severity: OmnichainEvent['severity'],
    type: string,
    data: Record<string, unknown>
  ): void {
    const event: OmnichainEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: type as OmnichainEvent['type'],
      source: 'portfolio_engine',
      severity,
      message: `Portfolio: ${type}`,
      data,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private handleError(error: unknown, startTime: number): ActionResult<never> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message,
        retryable: false,
      },
      executionTime: Date.now() - startTime,
    };
  }

  private generateId(): string {
    return `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPortfolioEngine(
  config?: PortfolioEngineConfig
): DefaultPortfolioEngine {
  return new DefaultPortfolioEngine(config);
}

export default DefaultPortfolioEngine;
