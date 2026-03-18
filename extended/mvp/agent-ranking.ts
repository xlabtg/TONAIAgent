/**
 * TONAIAgent - Agent Ranking MVP Service
 *
 * Key differentiation layer providing transparent, multi-factor
 * agent rankings based on performance, stability, risk, reputation,
 * and on-chain behavior.
 */

import type {
  RankingConfig,
  AgentRanking,
  RankingFactors,
  TelegramSignals,
  MVPEvent,
  MVPEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default ranking configuration
 */
export const defaultRankingConfig: RankingConfig = {
  enabled: true,
  updateFrequencyMinutes: 60, // Update rankings hourly
  performanceWeight: 0.35,
  stabilityWeight: 0.20,
  riskWeight: 0.20,
  reputationWeight: 0.15,
  onChainWeight: 0.10,
  minHistoryDays: 7,
  useTelegramSignals: false, // Requires user consent
};

// ============================================================================
// Agent Ranking Manager
// ============================================================================

/**
 * Agent Ranking Manager for MVP
 *
 * Calculates and maintains agent rankings based on multiple factors.
 * This is a key differentiation layer for the platform.
 */
export class AgentRankingManager {
  readonly config: RankingConfig;

  private readonly rankings: Map<string, AgentRanking> = new Map();
  private readonly factors: Map<string, RankingFactors> = new Map();
  private readonly telegramSignals: Map<string, TelegramSignals> = new Map();
  private readonly consentedUsers: Set<string> = new Set();
  private readonly eventCallbacks: MVPEventCallback[] = [];
  private lastUpdateTime: Date = new Date();

  constructor(config: Partial<RankingConfig> = {}) {
    this.config = {
      ...defaultRankingConfig,
      ...config,
    };
  }

  // ============================================================================
  // Ranking Retrieval
  // ============================================================================

  /**
   * Get current rankings (top N)
   */
  getTopRankings(limit: number = 100): AgentRanking[] {
    return Array.from(this.rankings.values())
      .sort((a, b) => a.rank - b.rank)
      .slice(0, limit);
  }

  /**
   * Get ranking for specific agent
   */
  getAgentRanking(agentId: string): AgentRanking | undefined {
    return this.rankings.get(agentId);
  }

  /**
   * Get rankings by category/filter
   */
  getRankingsByFilter(filter: RankingFilter): AgentRanking[] {
    let rankings = Array.from(this.rankings.values());

    if (filter.minApy !== undefined) {
      rankings = rankings.filter((r) => r.apy >= filter.minApy!);
    }
    if (filter.maxDrawdown !== undefined) {
      rankings = rankings.filter((r) => r.maxDrawdown <= filter.maxDrawdown!);
    }
    if (filter.minScore !== undefined) {
      rankings = rankings.filter((r) => r.score >= filter.minScore!);
    }
    if (filter.minUptime !== undefined) {
      rankings = rankings.filter((r) => r.uptime >= filter.minUptime!);
    }

    return rankings
      .sort((a, b) => {
        const sortBy = filter.sortBy ?? 'rank';
        const aVal = a[sortBy as keyof AgentRanking] as number;
        const bVal = b[sortBy as keyof AgentRanking] as number;
        return filter.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      })
      .slice(0, filter.limit ?? 50);
  }

  /**
   * Get ranking factors breakdown for agent
   */
  getRankingFactors(agentId: string): RankingFactors | undefined {
    return this.factors.get(agentId);
  }

  // ============================================================================
  // Ranking Calculation
  // ============================================================================

  /**
   * Calculate and update all rankings
   */
  async updateAllRankings(
    agentData: AgentDataForRanking[]
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    const newRankings: AgentRanking[] = [];

    for (const agent of agentData) {
      try {
        const factors = this.calculateFactors(agent);
        const score = this.calculateCompositeScore(factors, agent.userId);

        const ranking: Omit<AgentRanking, 'rank' | 'rankChange'> = {
          agentId: agent.agentId,
          agentName: agent.agentName,
          strategyName: agent.strategyName,
          ownerUsername: agent.ownerUsername,
          score,
          performanceScore: this.normalizeScore(
            factors.performance.apy +
              factors.performance.riskAdjustedReturns * 2 -
              factors.performance.maxDrawdown
          ),
          stabilityScore: this.normalizeScore(
            factors.stability.uptime * 0.5 +
              (100 - factors.stability.volatility) * 0.3 +
              factors.stability.consistency * 0.2
          ),
          riskScore: this.normalizeScore(
            (100 - factors.risk.exposure) * 0.4 +
              (100 - factors.risk.leverage) * 0.3 +
              (100 - factors.risk.concentration) * 0.3
          ),
          reputationScore: this.normalizeScore(
            factors.reputation.communityFeedback * 0.4 +
              factors.reputation.usage * 0.3 +
              factors.reputation.history * 0.3
          ),
          onChainScore: this.normalizeScore(
            factors.onChain.executionQuality * 0.4 +
              factors.onChain.gasEfficiency * 0.3 +
              factors.onChain.contractSecurity * 0.3
          ),
          apy: agent.apy,
          tvl: agent.tvl,
          maxDrawdown: agent.maxDrawdown,
          uptime: agent.uptime,
          updatedAt: new Date(),
        };

        this.factors.set(agent.agentId, factors);
        newRankings.push(ranking as AgentRanking);
      } catch (error) {
        errors.push(`Failed to rank agent ${agent.agentId}: ${(error as Error).message}`);
      }
    }

    // Sort by score and assign ranks
    newRankings.sort((a, b) => b.score - a.score);

    for (let i = 0; i < newRankings.length; i++) {
      const ranking = newRankings[i];
      const previousRanking = this.rankings.get(ranking.agentId);
      const previousRank = previousRanking?.rank ?? i + 1;

      ranking.rank = i + 1;
      ranking.rankChange = previousRank - ranking.rank; // Positive = improved

      this.rankings.set(ranking.agentId, ranking);
    }

    this.lastUpdateTime = new Date();

    this.emitEvent({
      type: 'ranking_updated',
      timestamp: new Date(),
      data: {
        totalRanked: newRankings.length,
        topAgent: newRankings[0]?.agentId,
        topScore: newRankings[0]?.score,
        errors: errors.length,
      },
    });

    return { updated: newRankings.length, errors };
  }

  /**
   * Calculate ranking factors for an agent
   */
  private calculateFactors(agent: AgentDataForRanking): RankingFactors {
    return {
      performance: {
        apy: agent.apy,
        riskAdjustedReturns: agent.sharpeRatio * 20, // Normalize to ~0-100
        maxDrawdown: agent.maxDrawdown,
        winRate: agent.winRate,
      },
      stability: {
        uptime: agent.uptime,
        volatility: agent.volatility,
        consistency: agent.consistencyScore,
      },
      risk: {
        exposure: agent.exposurePercent,
        leverage: agent.leverageUsed * 20, // 5x leverage = 100
        concentration: agent.concentrationRisk,
      },
      reputation: {
        communityFeedback: agent.communityRating * 20, // 5 stars = 100
        usage: Math.min(100, agent.totalCopiers / 10), // 1000 copiers = 100
        history: Math.min(100, agent.historyDays / 3.65), // 1 year = 100
      },
      onChain: {
        executionQuality: agent.executionQuality,
        gasEfficiency: agent.gasEfficiency,
        contractSecurity: agent.securityScore,
      },
    };
  }

  /**
   * Calculate composite score from factors
   */
  private calculateCompositeScore(
    factors: RankingFactors,
    userId?: string
  ): number {
    // Calculate individual category scores
    const performanceScore =
      (factors.performance.apy * 0.4 +
        factors.performance.riskAdjustedReturns * 0.35 +
        factors.performance.winRate * 0.15 -
        factors.performance.maxDrawdown * 0.1) / 100;

    const stabilityScore =
      (factors.stability.uptime * 0.5 +
        (100 - factors.stability.volatility) * 0.3 +
        factors.stability.consistency * 0.2) / 100;

    const riskScore =
      ((100 - factors.risk.exposure) * 0.4 +
        (100 - factors.risk.leverage) * 0.3 +
        (100 - factors.risk.concentration) * 0.3) / 100;

    const reputationScore =
      (factors.reputation.communityFeedback * 0.4 +
        factors.reputation.usage * 0.3 +
        factors.reputation.history * 0.3) / 100;

    const onChainScore =
      (factors.onChain.executionQuality * 0.4 +
        factors.onChain.gasEfficiency * 0.3 +
        factors.onChain.contractSecurity * 0.3) / 100;

    // Apply weights
    let score =
      performanceScore * this.config.performanceWeight +
      stabilityScore * this.config.stabilityWeight +
      riskScore * this.config.riskWeight +
      reputationScore * this.config.reputationWeight +
      onChainScore * this.config.onChainWeight;

    // Apply Telegram signals bonus if consented
    if (
      this.config.useTelegramSignals &&
      userId &&
      this.consentedUsers.has(userId)
    ) {
      const signals = this.telegramSignals.get(userId);
      if (signals && signals.hasConsented) {
        const signalBonus =
          (signals.engagement * 0.3 +
            signals.activity * 0.3 +
            signals.socialTrust * 0.2 +
            signals.communityParticipation * 0.2) /
          100;
        score = score * 0.95 + signalBonus * 0.05; // 5% max bonus from signals
      }
    }

    // Normalize to 0-100
    return Math.min(100, Math.max(0, score * 100));
  }

  /**
   * Normalize a value to 0-100 range
   */
  private normalizeScore(value: number): number {
    return Math.min(100, Math.max(0, value));
  }

  // ============================================================================
  // Telegram Signals (Requires Consent)
  // ============================================================================

  /**
   * Record user consent for Telegram signals
   */
  recordConsent(userId: string, consented: boolean): void {
    if (consented) {
      this.consentedUsers.add(userId);
    } else {
      this.consentedUsers.delete(userId);
      this.telegramSignals.delete(userId);
    }
  }

  /**
   * Check if user has consented to Telegram signals
   */
  hasConsent(userId: string): boolean {
    return this.consentedUsers.has(userId);
  }

  /**
   * Update Telegram signals for user (only if consented)
   */
  updateTelegramSignals(
    userId: string,
    signals: Omit<TelegramSignals, 'hasConsented'>
  ): void {
    if (!this.consentedUsers.has(userId)) {
      throw new Error('User has not consented to Telegram signals');
    }

    this.telegramSignals.set(userId, {
      ...signals,
      hasConsented: true,
    });
  }

  /**
   * Get Telegram signals for user
   */
  getTelegramSignals(userId: string): TelegramSignals | undefined {
    return this.telegramSignals.get(userId);
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Get ranking distribution statistics
   */
  getRankingStats(): RankingStats {
    const rankings = Array.from(this.rankings.values());

    if (rankings.length === 0) {
      return {
        totalRanked: 0,
        avgScore: 0,
        medianScore: 0,
        scoreDistribution: { excellent: 0, good: 0, average: 0, below: 0, poor: 0 },
        avgApy: 0,
        avgUptime: 0,
        lastUpdate: this.lastUpdateTime,
      };
    }

    const scores = rankings.map((r) => r.score).sort((a, b) => a - b);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const medianScore = scores[Math.floor(scores.length / 2)];

    const distribution = {
      excellent: rankings.filter((r) => r.score >= 80).length,
      good: rankings.filter((r) => r.score >= 60 && r.score < 80).length,
      average: rankings.filter((r) => r.score >= 40 && r.score < 60).length,
      below: rankings.filter((r) => r.score >= 20 && r.score < 40).length,
      poor: rankings.filter((r) => r.score < 20).length,
    };

    return {
      totalRanked: rankings.length,
      avgScore,
      medianScore,
      scoreDistribution: distribution,
      avgApy: rankings.reduce((sum, r) => sum + r.apy, 0) / rankings.length,
      avgUptime: rankings.reduce((sum, r) => sum + r.uptime, 0) / rankings.length,
      lastUpdate: this.lastUpdateTime,
    };
  }

  /**
   * Get movers (biggest rank changes)
   */
  getTopMovers(limit: number = 10): {
    gainers: AgentRanking[];
    losers: AgentRanking[];
  } {
    const rankings = Array.from(this.rankings.values());

    const gainers = [...rankings]
      .filter((r) => r.rankChange > 0)
      .sort((a, b) => b.rankChange - a.rankChange)
      .slice(0, limit);

    const losers = [...rankings]
      .filter((r) => r.rankChange < 0)
      .sort((a, b) => a.rankChange - b.rankChange)
      .slice(0, limit);

    return { gainers, losers };
  }

  /**
   * Get last update time
   */
  getLastUpdateTime(): Date {
    return this.lastUpdateTime;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to events
   */
  onEvent(callback: MVPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Emit event to subscribers
   */
  private emitEvent(event: MVPEvent): void {
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
// Supporting Types
// ============================================================================

/**
 * Agent data required for ranking calculation
 */
export interface AgentDataForRanking {
  agentId: string;
  agentName: string;
  strategyName: string;
  ownerUsername: string;
  userId?: string;
  apy: number;
  tvl: number;
  maxDrawdown: number;
  uptime: number;
  sharpeRatio: number;
  winRate: number;
  volatility: number;
  consistencyScore: number;
  exposurePercent: number;
  leverageUsed: number;
  concentrationRisk: number;
  communityRating: number; // 0-5
  totalCopiers: number;
  historyDays: number;
  executionQuality: number;
  gasEfficiency: number;
  securityScore: number;
}

/**
 * Filter for rankings
 */
export interface RankingFilter {
  minApy?: number;
  maxDrawdown?: number;
  minScore?: number;
  minUptime?: number;
  sortBy?: 'rank' | 'score' | 'apy' | 'tvl' | 'uptime';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Ranking statistics
 */
export interface RankingStats {
  totalRanked: number;
  avgScore: number;
  medianScore: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    average: number;
    below: number;
    poor: number;
  };
  avgApy: number;
  avgUptime: number;
  lastUpdate: Date;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create Agent Ranking Manager
 */
export function createAgentRankingManager(
  config?: Partial<RankingConfig>
): AgentRankingManager {
  return new AgentRankingManager(config);
}
