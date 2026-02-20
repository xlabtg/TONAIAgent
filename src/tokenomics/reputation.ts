/**
 * TONAIAgent - Reputation System
 *
 * Provides on-chain performance-based trust scores for users and agents.
 * Reputation affects access levels, fee discounts, and platform privileges.
 */

import {
  ReputationConfig,
  ReputationTier,
  ReputationScore,
  ReputationBreakdown,
  ReputationHistoryRequest,
  ReputationHistory,
  ReputationDataPoint,
  ReputationSummary,
  ReputationEvent,
  ReputationEventType,
  ReputationAccessCheck,
  ReputationAccessResult,
  ReputationRequirements,
  TokenomicsEvent,
  TokenomicsEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_REPUTATION_CONFIG: ReputationConfig = {
  enabled: true,
  minScore: 0,
  maxScore: 100,
  decayRate: 0.01, // 1% monthly decay
  updateFrequency: 'daily',
  factors: {
    performance: 0.30,
    reliability: 0.25,
    history: 0.20,
    community: 0.15,
    compliance: 0.10,
  },
};

// Tier thresholds
const TIER_THRESHOLDS: Record<ReputationTier, number> = {
  newcomer: 0,
  established: 21,
  trusted: 41,
  expert: 61,
  elite: 81,
};

// Feature requirements
const FEATURE_REQUIREMENTS: Record<string, ReputationRequirements> = {
  basic_trading: {
    feature: 'basic_trading',
    minScore: 0,
    minTier: 'newcomer',
    minHistory: 0,
  },
  advanced_trading: {
    feature: 'advanced_trading',
    minScore: 30,
    minTier: 'established',
    minHistory: 7,
  },
  deploy_public_strategy: {
    feature: 'deploy_public_strategy',
    minScore: 40,
    minTier: 'trusted',
    minHistory: 30,
  },
  institutional_copying: {
    feature: 'institutional_copying',
    minScore: 60,
    minTier: 'expert',
    minHistory: 60,
  },
  governance_proposals: {
    feature: 'governance_proposals',
    minScore: 50,
    minTier: 'trusted',
    minHistory: 30,
  },
  create_capital_pool: {
    feature: 'create_capital_pool',
    minScore: 70,
    minTier: 'expert',
    minHistory: 90,
  },
  premium_features: {
    feature: 'premium_features',
    minScore: 80,
    minTier: 'elite',
    minHistory: 180,
  },
};

// ============================================================================
// Interfaces
// ============================================================================

export interface ReputationSystem {
  readonly config: ReputationConfig;

  // Score management
  getScore(userId: string): Promise<ReputationScore>;
  updateScore(userId: string): Promise<ReputationScore>;
  calculateBreakdown(userId: string): Promise<ReputationBreakdown>;

  // History
  getHistory(request: ReputationHistoryRequest): Promise<ReputationHistory>;
  recordEvent(params: RecordEventParams): Promise<ReputationEvent>;

  // Access control
  checkAccess(params: ReputationAccessCheck): Promise<ReputationAccessResult>;
  getRequirements(feature: string): ReputationRequirements;

  // Tier management
  getTier(score: number): ReputationTier;
  getPercentile(userId: string): Promise<number>;

  // Events
  onEvent(callback: TokenomicsEventCallback): void;
}

export interface RecordEventParams {
  userId: string;
  eventType: ReputationEventType;
  impact: number; // -100 to +100
  details: Record<string, unknown>;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultReputationSystem implements ReputationSystem {
  readonly config: ReputationConfig;

  // Storage
  private readonly userScores: Map<string, ReputationScore> = new Map();
  private readonly userHistory: Map<string, ReputationDataPoint[]> = new Map();
  private readonly reputationEvents: Map<string, ReputationEvent[]> = new Map();
  private readonly userFactorScores: Map<string, ReputationBreakdown> = new Map();

  private readonly eventCallbacks: TokenomicsEventCallback[] = [];

  constructor(config: Partial<ReputationConfig> = {}) {
    this.config = { ...DEFAULT_REPUTATION_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Score Management
  // --------------------------------------------------------------------------

  async getScore(userId: string): Promise<ReputationScore> {
    let score = this.userScores.get(userId);

    if (!score) {
      // Create initial score for new user
      score = this.createInitialScore(userId);
      this.userScores.set(userId, score);
    }

    return score;
  }

  private createInitialScore(userId: string): ReputationScore {
    const initialBreakdown: ReputationBreakdown = {
      performance: 50, // Start at neutral
      reliability: 50,
      history: 0, // No history yet
      community: 50,
      compliance: 100, // Perfect until proven otherwise
    };

    const overall = this.calculateOverallScore(initialBreakdown);

    return {
      userId,
      overall,
      breakdown: initialBreakdown,
      tier: this.getTier(overall),
      percentile: 50, // Assume middle of pack initially
      trend: 'stable',
      lastUpdated: new Date(),
    };
  }

  async updateScore(userId: string): Promise<ReputationScore> {
    const breakdown = await this.calculateBreakdown(userId);
    const overall = this.calculateOverallScore(breakdown);

    // Get previous score for trend calculation
    const previousScore = this.userScores.get(userId);
    let trend: 'improving' | 'stable' | 'declining' = 'stable';

    if (previousScore) {
      const diff = overall - previousScore.overall;
      if (diff > 2) trend = 'improving';
      else if (diff < -2) trend = 'declining';
    }

    const score: ReputationScore = {
      userId,
      overall,
      breakdown,
      tier: this.getTier(overall),
      percentile: await this.getPercentile(userId),
      trend,
      lastUpdated: new Date(),
    };

    // Store score
    this.userScores.set(userId, score);

    // Add to history
    this.addToHistory(userId, score);

    // Emit event
    this.emitEvent({
      type: 'reputation_updated',
      category: 'reputation',
      data: {
        userId,
        overall,
        tier: score.tier,
        trend,
      },
      userId,
    });

    return score;
  }

  async calculateBreakdown(userId: string): Promise<ReputationBreakdown> {
    // Get cached factor scores or calculate
    let breakdown = this.userFactorScores.get(userId);

    if (!breakdown) {
      // Initialize with neutral scores
      breakdown = {
        performance: 50,
        reliability: 50,
        history: 0,
        community: 50,
        compliance: 100,
      };
      this.userFactorScores.set(userId, breakdown);
    }

    // Apply decay
    const now = new Date();
    const score = this.userScores.get(userId);
    if (score) {
      const daysSinceUpdate = (now.getTime() - score.lastUpdated.getTime()) / (24 * 60 * 60 * 1000);
      const monthsDecay = daysSinceUpdate / 30;
      const decayFactor = Math.pow(1 - this.config.decayRate, monthsDecay);

      // Apply decay to non-compliance factors
      breakdown.performance = Math.max(0, breakdown.performance * decayFactor);
      breakdown.reliability = Math.max(0, breakdown.reliability * decayFactor);
      breakdown.community = Math.max(0, breakdown.community * decayFactor);
    }

    return breakdown;
  }

  private calculateOverallScore(breakdown: ReputationBreakdown): number {
    const { factors } = this.config;

    const score =
      breakdown.performance * factors.performance +
      breakdown.reliability * factors.reliability +
      breakdown.history * factors.history +
      breakdown.community * factors.community +
      breakdown.compliance * factors.compliance;

    // Clamp to valid range
    return Math.max(this.config.minScore, Math.min(this.config.maxScore, Math.round(score)));
  }

  private addToHistory(userId: string, score: ReputationScore): void {
    if (!this.userHistory.has(userId)) {
      this.userHistory.set(userId, []);
    }

    const history = this.userHistory.get(userId)!;
    history.push({
      timestamp: score.lastUpdated,
      score: score.overall,
      breakdown: { ...score.breakdown },
    });

    // Keep last 365 days of history
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);

    while (history.length > 0 && history[0].timestamp < cutoffDate) {
      history.shift();
    }
  }

  // --------------------------------------------------------------------------
  // History
  // --------------------------------------------------------------------------

  async getHistory(request: ReputationHistoryRequest): Promise<ReputationHistory> {
    const history = this.userHistory.get(request.userId) ?? [];

    // Filter by period
    const periodDays = this.getPeriodDays(request.period);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    const filteredHistory = history.filter(h => h.timestamp >= cutoffDate);

    // Aggregate by granularity
    const aggregatedData = this.aggregateHistory(filteredHistory, request.granularity);

    // Calculate summary
    const summary = this.calculateHistorySummary(aggregatedData);

    return {
      userId: request.userId,
      period: request.period,
      dataPoints: aggregatedData,
      summary,
    };
  }

  private getPeriodDays(period: string): number {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '365d': return 365;
      case 'all': return 3650; // 10 years
      default: return 30;
    }
  }

  private aggregateHistory(
    history: ReputationDataPoint[],
    granularity: string
  ): ReputationDataPoint[] {
    if (history.length === 0) return [];

    // Group by time period based on granularity
    const groups = new Map<string, ReputationDataPoint[]>();

    for (const point of history) {
      const key = this.getTimeKey(point.timestamp, granularity);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(point);
    }

    // Average each group
    const result: ReputationDataPoint[] = [];
    for (const [, points] of groups) {
      const avgScore = points.reduce((sum, p) => sum + p.score, 0) / points.length;
      result.push({
        timestamp: points[points.length - 1].timestamp,
        score: Math.round(avgScore),
        breakdown: points[points.length - 1].breakdown,
      });
    }

    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private getTimeKey(date: Date, granularity: string): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hour = date.getHours();

    switch (granularity) {
      case 'hourly': return `${year}-${month}-${day}-${hour}`;
      case 'daily': return `${year}-${month}-${day}`;
      case 'weekly': return `${year}-${Math.floor((month * 30 + day) / 7)}`;
      case 'monthly': return `${year}-${month}`;
      default: return `${year}-${month}-${day}`;
    }
  }

  private calculateHistorySummary(dataPoints: ReputationDataPoint[]): ReputationSummary {
    if (dataPoints.length === 0) {
      return {
        averageScore: 0,
        minScore: 0,
        maxScore: 0,
        startScore: 0,
        endScore: 0,
        percentChange: 0,
        significantEvents: [],
      };
    }

    const scores = dataPoints.map(p => p.score);
    const startScore = scores[0];
    const endScore = scores[scores.length - 1];

    return {
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      startScore,
      endScore,
      percentChange: startScore > 0 ? ((endScore - startScore) / startScore) * 100 : 0,
      significantEvents: this.getSignificantEvents(dataPoints),
    };
  }

  private getSignificantEvents(dataPoints: ReputationDataPoint[]): ReputationEvent[] {
    // Find significant score changes
    const events: ReputationEvent[] = [];

    for (let i = 1; i < dataPoints.length; i++) {
      const prev = dataPoints[i - 1];
      const curr = dataPoints[i];
      const change = curr.score - prev.score;

      if (Math.abs(change) >= 5) {
        events.push({
          id: `evt_${i}`,
          userId: '',
          eventType: change > 0 ? 'milestone_achieved' : 'strategy_performance',
          impact: change,
          details: { previousScore: prev.score, newScore: curr.score },
          timestamp: curr.timestamp,
        });
      }
    }

    return events;
  }

  async recordEvent(params: RecordEventParams): Promise<ReputationEvent> {
    const event: ReputationEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: params.userId,
      eventType: params.eventType,
      impact: params.impact,
      details: params.details,
      timestamp: new Date(),
    };

    // Store event
    if (!this.reputationEvents.has(params.userId)) {
      this.reputationEvents.set(params.userId, []);
    }
    this.reputationEvents.get(params.userId)!.push(event);

    // Update factor scores based on event
    await this.applyEventImpact(params.userId, event);

    // Update overall score
    await this.updateScore(params.userId);

    return event;
  }

  private async applyEventImpact(userId: string, event: ReputationEvent): Promise<void> {
    let breakdown = this.userFactorScores.get(userId);
    if (!breakdown) {
      breakdown = {
        performance: 50,
        reliability: 50,
        history: 0,
        community: 50,
        compliance: 100,
      };
      this.userFactorScores.set(userId, breakdown);
    }

    // Apply impact based on event type
    const impactScale = event.impact / 100; // Normalize to 0-1 scale

    switch (event.eventType) {
      case 'strategy_performance':
        breakdown.performance = this.clampScore(breakdown.performance + impactScale * 20);
        break;
      case 'user_rating':
        breakdown.community = this.clampScore(breakdown.community + impactScale * 15);
        break;
      case 'protocol_violation':
        breakdown.compliance = this.clampScore(breakdown.compliance + impactScale * 30);
        breakdown.reliability = this.clampScore(breakdown.reliability + impactScale * 10);
        break;
      case 'governance_participation':
        breakdown.community = this.clampScore(breakdown.community + impactScale * 10);
        breakdown.history = this.clampScore(breakdown.history + 1); // Increment history
        break;
      case 'community_contribution':
        breakdown.community = this.clampScore(breakdown.community + impactScale * 15);
        break;
      case 'slashing':
        breakdown.compliance = this.clampScore(breakdown.compliance - 20);
        breakdown.reliability = this.clampScore(breakdown.reliability - 10);
        break;
      case 'milestone_achieved':
        breakdown.history = this.clampScore(breakdown.history + impactScale * 10);
        breakdown.performance = this.clampScore(breakdown.performance + impactScale * 5);
        break;
    }
  }

  private clampScore(score: number): number {
    return Math.max(this.config.minScore, Math.min(this.config.maxScore, score));
  }

  // --------------------------------------------------------------------------
  // Access Control
  // --------------------------------------------------------------------------

  async checkAccess(params: ReputationAccessCheck): Promise<ReputationAccessResult> {
    const score = await this.getScore(params.userId);
    const requirements = this.getRequirements(params.feature);

    const requiredScore = params.requiredScore ?? requirements.minScore;
    const requiredTier = params.requiredTier ?? requirements.minTier;

    // Check score requirement
    const scoreOk = score.overall >= requiredScore;

    // Check tier requirement
    const tierOk = this.compareTiers(score.tier, requiredTier) >= 0;

    // Check history requirement
    const history = this.userHistory.get(params.userId) ?? [];
    const accountAgeDays = history.length > 0
      ? (new Date().getTime() - history[0].timestamp.getTime()) / (24 * 60 * 60 * 1000)
      : 0;
    const historyOk = accountAgeDays >= requirements.minHistory;

    const allowed = scoreOk && tierOk && historyOk;

    return {
      allowed,
      reason: allowed ? undefined : this.getAccessDenialReason(scoreOk, tierOk, historyOk),
      currentScore: score.overall,
      requiredScore,
      currentTier: score.tier,
      requiredTier,
      scoreNeeded: scoreOk ? undefined : requiredScore - score.overall,
    };
  }

  private compareTiers(tier1: ReputationTier, tier2: ReputationTier): number {
    const order: ReputationTier[] = ['newcomer', 'established', 'trusted', 'expert', 'elite'];
    return order.indexOf(tier1) - order.indexOf(tier2);
  }

  private getAccessDenialReason(scoreOk: boolean, tierOk: boolean, historyOk: boolean): string {
    const reasons: string[] = [];
    if (!scoreOk) reasons.push('insufficient reputation score');
    if (!tierOk) reasons.push('tier requirement not met');
    if (!historyOk) reasons.push('account history too short');
    return reasons.join(', ');
  }

  getRequirements(feature: string): ReputationRequirements {
    return FEATURE_REQUIREMENTS[feature] ?? {
      feature,
      minScore: 0,
      minTier: 'newcomer',
      minHistory: 0,
    };
  }

  // --------------------------------------------------------------------------
  // Tier Management
  // --------------------------------------------------------------------------

  getTier(score: number): ReputationTier {
    if (score >= TIER_THRESHOLDS.elite) return 'elite';
    if (score >= TIER_THRESHOLDS.expert) return 'expert';
    if (score >= TIER_THRESHOLDS.trusted) return 'trusted';
    if (score >= TIER_THRESHOLDS.established) return 'established';
    return 'newcomer';
  }

  async getPercentile(userId: string): Promise<number> {
    const score = this.userScores.get(userId);
    if (!score) return 50;

    // Calculate percentile based on all scores
    const allScores = Array.from(this.userScores.values()).map(s => s.overall);
    if (allScores.length <= 1) return 50;

    const sortedScores = allScores.sort((a, b) => a - b);
    const position = sortedScores.indexOf(score.overall);
    const percentile = (position / (sortedScores.length - 1)) * 100;

    return Math.round(percentile);
  }

  // --------------------------------------------------------------------------
  // Event Functions
  // --------------------------------------------------------------------------

  onEvent(callback: TokenomicsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<TokenomicsEvent, 'id' | 'timestamp'>): void {
    const fullEvent: TokenomicsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      ...event,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // --------------------------------------------------------------------------
  // Internal: For testing/development
  // --------------------------------------------------------------------------

  /**
   * Set user factor scores directly (for testing)
   */
  setFactorScores(userId: string, breakdown: ReputationBreakdown): void {
    this.userFactorScores.set(userId, breakdown);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createReputationSystem(config?: Partial<ReputationConfig>): DefaultReputationSystem {
  return new DefaultReputationSystem(config);
}

export default DefaultReputationSystem;
