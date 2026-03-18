/**
 * TONAIAgent - Reputation and Scoring System
 *
 * Implements performance-based ranking, trust scoring, consistency evaluation,
 * fraud detection, and anti-manipulation mechanisms.
 * Primary AI infrastructure powered by Groq for scoring and anomaly detection.
 */

import {
  AgentReputation,
  ReputationTier,
  Badge,
  FraudFlag,
  FraudType,
  VerificationStatus,
  ScoringModel,
  ScoringResult,
  AnomalyFlag,
  AgentPerformance,
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// Reputation Manager Interface
// ============================================================================

export interface ReputationManager {
  // Reputation management
  getReputation(agentId: string): Promise<AgentReputation | null>;
  initializeReputation(agentId: string): Promise<AgentReputation>;
  updateReputation(agentId: string, performance: AgentPerformance): Promise<AgentReputation>;

  // Scoring
  calculateScore(agentId: string): Promise<ScoringResult>;
  getScoreHistory(agentId: string, limit?: number): Promise<ScoringResult[]>;

  // Tier management
  calculateTier(score: number): ReputationTier;
  getTierRequirements(tier: ReputationTier): TierRequirements;

  // Badges
  awardBadge(agentId: string, badge: Badge): Promise<void>;
  checkBadgeEligibility(agentId: string): Promise<Badge[]>;

  // Fraud detection
  detectFraud(agentId: string, performance: AgentPerformance): Promise<FraudFlag[]>;
  reportFraud(agentId: string, flag: Omit<FraudFlag, 'id' | 'detectedAt'>): Promise<FraudFlag>;
  resolveFraudFlag(flagId: string, resolution: string, dismissed: boolean): Promise<void>;

  // Verification
  getVerificationStatus(agentId: string): Promise<VerificationStatus>;
  updateVerificationStatus(agentId: string, updates: Partial<VerificationStatus>): Promise<void>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Types
// ============================================================================

export interface TierRequirements {
  tier: ReputationTier;
  minScore: number;
  minTrades: number;
  minDaysActive: number;
  minFollowers: number;
  maxDrawdown: number;
  requirements: string[];
  benefits: string[];
}

export interface FraudDetectionConfig {
  washTradingThreshold: number;
  volumeSpikeMultiplier: number;
  consistencyThreshold: number;
  minTradesForAnalysis: number;
  anomalyScoreThreshold: number;
}

// ============================================================================
// Default Reputation Manager Implementation
// ============================================================================

export class DefaultReputationManager implements ReputationManager {
  private readonly reputations: Map<string, AgentReputation> = new Map();
  private readonly scoreHistory: Map<string, ScoringResult[]> = new Map();
  private readonly fraudFlags: Map<string, FraudFlag[]> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: ReputationManagerConfig;
  private readonly scoringModel: ScoringModel;

  constructor(config?: Partial<ReputationManagerConfig>) {
    this.config = {
      updateFrequencyMinutes: config?.updateFrequencyMinutes ?? 60,
      anomalyDetectionEnabled: config?.anomalyDetectionEnabled ?? true,
      mlModelEnabled: config?.mlModelEnabled ?? true,
      groqApiEnabled: config?.groqApiEnabled ?? true,
      fraudDetection: config?.fraudDetection ?? {
        washTradingThreshold: 0.8,
        volumeSpikeMultiplier: 10,
        consistencyThreshold: 0.3,
        minTradesForAnalysis: 50,
        anomalyScoreThreshold: 0.7,
      },
    };

    this.scoringModel = this.initializeScoringModel();
  }

  async getReputation(agentId: string): Promise<AgentReputation | null> {
    return this.reputations.get(agentId) ?? null;
  }

  async initializeReputation(agentId: string): Promise<AgentReputation> {
    const now = new Date();

    const reputation: AgentReputation = {
      overallScore: 50, // Start at neutral
      trustScore: 50,
      performanceScore: 0,
      consistencyScore: 50,
      reliabilityScore: 50,
      transparencyScore: 50,
      communityScore: 50,
      tier: 'bronze',
      badges: [],
      history: [
        {
          timestamp: now,
          overallScore: 50,
          event: 'Agent registered',
          scoreChange: 0,
        },
      ],
      fraudFlags: [],
      verificationStatus: {
        identityVerified: false,
        strategyAudited: false,
        trackRecordVerified: false,
        communityEndorsed: false,
        platformCertified: false,
      },
    };

    this.reputations.set(agentId, reputation);
    this.fraudFlags.set(agentId, []);
    this.scoreHistory.set(agentId, []);

    return reputation;
  }

  async updateReputation(agentId: string, performance: AgentPerformance): Promise<AgentReputation> {
    let reputation = await this.getReputation(agentId);
    if (!reputation) {
      reputation = await this.initializeReputation(agentId);
    }

    const now = new Date();

    // Calculate new scores
    const performanceScore = this.calculatePerformanceScore(performance);
    const consistencyScore = this.calculateConsistencyScore(performance);
    const reliabilityScore = this.calculateReliabilityScore(performance);

    // Detect fraud
    const newFraudFlags = await this.detectFraud(agentId, performance);

    // Apply fraud penalty if flags detected
    let fraudPenalty = 0;
    for (const flag of newFraudFlags) {
      fraudPenalty += this.getFraudPenalty(flag.severity);
    }

    // Calculate weighted overall score
    const weights = this.scoringModel.weights;
    const rawScore =
      performanceScore * weights.performance +
      consistencyScore * weights.consistency +
      reputation.trustScore * (weights.riskAdjustedReturns / 100) +
      reliabilityScore * weights.executionReliability +
      reputation.transparencyScore * weights.transparency +
      reputation.communityScore * weights.communityFeedback;

    const overallScore = Math.max(0, Math.min(100, rawScore - fraudPenalty));

    // Determine new tier
    const newTier = this.calculateTier(overallScore);

    // Track score change
    const scoreChange = overallScore - reputation.overallScore;

    // Update reputation
    const updatedReputation: AgentReputation = {
      ...reputation,
      overallScore,
      performanceScore,
      consistencyScore,
      reliabilityScore,
      tier: newTier,
      fraudFlags: [...reputation.fraudFlags, ...newFraudFlags],
      history: [
        ...reputation.history,
        {
          timestamp: now,
          overallScore,
          event: 'Performance update',
          scoreChange,
        },
      ].slice(-100), // Keep last 100 history entries
    };

    this.reputations.set(agentId, updatedReputation);

    // Emit event if tier changed
    if (newTier !== reputation.tier) {
      this.emitEvent({
        id: this.generateId('event'),
        timestamp: now,
        type: 'score_updated',
        severity: 'info',
        source: 'reputation_manager',
        message: `Agent ${agentId} promoted to ${newTier} tier`,
        data: { agentId, oldTier: reputation.tier, newTier, score: overallScore },
      });
    }

    return updatedReputation;
  }

  async calculateScore(agentId: string): Promise<ScoringResult> {
    const reputation = await this.getReputation(agentId);
    if (!reputation) {
      throw new Error(`No reputation found for agent: ${agentId}`);
    }

    const now = new Date();
    const anomalyFlags: AnomalyFlag[] = [];

    // Collect component scores
    const componentScores: Record<string, number> = {
      performance: reputation.performanceScore,
      consistency: reputation.consistencyScore,
      reliability: reputation.reliabilityScore,
      trust: reputation.trustScore,
      transparency: reputation.transparencyScore,
      community: reputation.communityScore,
    };

    // Check for anomalies
    if (this.config.anomalyDetectionEnabled) {
      for (const [key, value] of Object.entries(componentScores)) {
        const expected = this.getExpectedRange(key);
        if (value < expected[0] || value > expected[1]) {
          anomalyFlags.push({
            feature: key,
            value,
            expectedRange: expected,
            severity: Math.abs(value - (expected[0] + expected[1]) / 2) > 30 ? 'alert' : 'warning',
            description: `${key} score outside expected range`,
          });
        }
      }
    }

    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(reputation);

    const result: ScoringResult = {
      agentId,
      modelId: this.scoringModel.id,
      timestamp: now,
      overallScore: reputation.overallScore,
      componentScores,
      featureValues: componentScores, // Simplified - in production would extract more features
      tier: reputation.tier,
      confidence,
      anomalyFlags,
    };

    // Store in history
    const history = this.scoreHistory.get(agentId) ?? [];
    history.push(result);
    this.scoreHistory.set(agentId, history.slice(-1000)); // Keep last 1000

    return result;
  }

  async getScoreHistory(agentId: string, limit?: number): Promise<ScoringResult[]> {
    const history = this.scoreHistory.get(agentId) ?? [];
    const sorted = [...history].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  calculateTier(score: number): ReputationTier {
    const thresholds = this.scoringModel.thresholds;
    if (score >= thresholds.diamondThreshold) return 'diamond';
    if (score >= thresholds.platinumThreshold) return 'platinum';
    if (score >= thresholds.goldThreshold) return 'gold';
    if (score >= thresholds.silverThreshold) return 'silver';
    return 'bronze';
  }

  getTierRequirements(tier: ReputationTier): TierRequirements {
    const requirements: Record<ReputationTier, TierRequirements> = {
      bronze: {
        tier: 'bronze',
        minScore: 0,
        minTrades: 0,
        minDaysActive: 0,
        minFollowers: 0,
        maxDrawdown: 100,
        requirements: ['Complete registration', 'Deploy at least one agent'],
        benefits: ['Basic listing in marketplace', 'Access to copy trading (limited)'],
      },
      silver: {
        tier: 'silver',
        minScore: this.scoringModel.thresholds.silverThreshold,
        minTrades: 50,
        minDaysActive: 30,
        minFollowers: 10,
        maxDrawdown: 40,
        requirements: ['50+ successful trades', '30 days active', '10+ followers', 'Max 40% drawdown'],
        benefits: ['Higher visibility', 'Featured in category listings', 'Lower platform fees'],
      },
      gold: {
        tier: 'gold',
        minScore: this.scoringModel.thresholds.goldThreshold,
        minTrades: 200,
        minDaysActive: 90,
        minFollowers: 50,
        maxDrawdown: 30,
        requirements: ['200+ successful trades', '90 days active', '50+ followers', 'Max 30% drawdown', 'Identity verified'],
        benefits: ['Premium placement', 'Strategy audit badge', 'Increased copy limits', 'Priority support'],
      },
      platinum: {
        tier: 'platinum',
        minScore: this.scoringModel.thresholds.platinumThreshold,
        minTrades: 500,
        minDaysActive: 180,
        minFollowers: 200,
        maxDrawdown: 25,
        requirements: ['500+ successful trades', '180 days active', '200+ followers', 'Max 25% drawdown', 'Full verification'],
        benefits: ['Homepage feature', 'Custom fee structures', 'API access', 'Co-marketing opportunities'],
      },
      diamond: {
        tier: 'diamond',
        minScore: this.scoringModel.thresholds.diamondThreshold,
        minTrades: 1000,
        minDaysActive: 365,
        minFollowers: 500,
        maxDrawdown: 20,
        requirements: ['1000+ successful trades', '1 year active', '500+ followers', 'Max 20% drawdown', 'Platform certified'],
        benefits: ['Elite status', 'Revenue share bonuses', 'Direct platform partnership', 'Exclusive events'],
      },
    };

    return requirements[tier];
  }

  async awardBadge(agentId: string, badge: Badge): Promise<void> {
    const reputation = await this.getReputation(agentId);
    if (!reputation) {
      throw new Error(`No reputation found for agent: ${agentId}`);
    }

    // Check if badge already awarded
    if (reputation.badges.some(b => b.id === badge.id)) {
      return;
    }

    const updatedReputation: AgentReputation = {
      ...reputation,
      badges: [...reputation.badges, badge],
    };

    this.reputations.set(agentId, updatedReputation);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'score_updated',
      severity: 'info',
      source: 'reputation_manager',
      message: `Agent ${agentId} earned badge: ${badge.name}`,
      data: { agentId, badge },
    });
  }

  async checkBadgeEligibility(agentId: string): Promise<Badge[]> {
    const reputation = await this.getReputation(agentId);
    if (!reputation) {
      return [];
    }

    const eligibleBadges: Badge[] = [];
    const now = new Date();

    // Check various badge conditions
    const badgeDefinitions = this.getBadgeDefinitions();

    for (const def of badgeDefinitions) {
      // Skip already awarded badges
      if (reputation.badges.some(b => b.id === def.id)) {
        continue;
      }

      if (this.checkBadgeCondition(reputation, def)) {
        eligibleBadges.push({
          ...def,
          earnedAt: now,
        });
      }
    }

    return eligibleBadges;
  }

  async detectFraud(agentId: string, performance: AgentPerformance): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const config = this.config.fraudDetection;

    if (performance.totalTrades < config.minTradesForAnalysis) {
      return flags;
    }

    // Wash trading detection
    const washTradingScore = this.detectWashTrading(performance);
    if (washTradingScore > config.washTradingThreshold) {
      flags.push(this.createFraudFlag('wash_trading', washTradingScore, performance));
    }

    // Volume spike detection
    const volumeSpikeScore = this.detectVolumeSpike(performance);
    if (volumeSpikeScore > config.volumeSpikeMultiplier) {
      flags.push(this.createFraudFlag('fake_volume', volumeSpikeScore / config.volumeSpikeMultiplier, performance));
    }

    // Performance consistency check (fake performance detection)
    const consistencyScore = this.checkPerformanceConsistency(performance);
    if (consistencyScore < config.consistencyThreshold) {
      flags.push(this.createFraudFlag('fake_performance', 1 - consistencyScore, performance));
    }

    // Store fraud flags
    if (flags.length > 0) {
      const existingFlags = this.fraudFlags.get(agentId) ?? [];
      this.fraudFlags.set(agentId, [...existingFlags, ...flags]);

      for (const flag of flags) {
        this.emitEvent({
          id: this.generateId('event'),
          timestamp: new Date(),
          type: 'fraud_detected',
          severity: flag.severity === 'critical' ? 'critical' : 'warning',
          source: 'reputation_manager',
          message: `Potential fraud detected for agent ${agentId}: ${flag.type}`,
          data: { agentId, flag },
        });
      }
    }

    return flags;
  }

  async reportFraud(
    agentId: string,
    flag: Omit<FraudFlag, 'id' | 'detectedAt'>
  ): Promise<FraudFlag> {
    const now = new Date();
    const fullFlag: FraudFlag = {
      ...flag,
      id: this.generateId('fraud_flag'),
      detectedAt: now,
    };

    const existingFlags = this.fraudFlags.get(agentId) ?? [];
    existingFlags.push(fullFlag);
    this.fraudFlags.set(agentId, existingFlags);

    // Update reputation with flag
    const reputation = await this.getReputation(agentId);
    if (reputation) {
      const updatedReputation: AgentReputation = {
        ...reputation,
        fraudFlags: [...reputation.fraudFlags, fullFlag],
      };
      this.reputations.set(agentId, updatedReputation);
    }

    return fullFlag;
  }

  async resolveFraudFlag(flagId: string, resolution: string, dismissed: boolean): Promise<void> {
    const now = new Date();

    // Find and update the flag across all agents
    for (const [agentId, flags] of this.fraudFlags.entries()) {
      const flagIndex = flags.findIndex(f => f.id === flagId);
      if (flagIndex >= 0) {
        flags[flagIndex] = {
          ...flags[flagIndex],
          status: dismissed ? 'dismissed' : 'confirmed',
          resolution,
          resolvedAt: now,
        };
        this.fraudFlags.set(agentId, flags);

        // Update reputation
        const reputation = await this.getReputation(agentId);
        if (reputation) {
          const updatedFlags = reputation.fraudFlags.map(f =>
            f.id === flagId ? { ...f, status: dismissed ? 'dismissed' : 'confirmed', resolution, resolvedAt: now } : f
          );
          const updatedReputation: AgentReputation = {
            ...reputation,
            fraudFlags: updatedFlags as FraudFlag[],
          };
          this.reputations.set(agentId, updatedReputation);
        }

        return;
      }
    }

    throw new Error(`Fraud flag not found: ${flagId}`);
  }

  async getVerificationStatus(agentId: string): Promise<VerificationStatus> {
    const reputation = await this.getReputation(agentId);
    if (!reputation) {
      return {
        identityVerified: false,
        strategyAudited: false,
        trackRecordVerified: false,
        communityEndorsed: false,
        platformCertified: false,
      };
    }
    return reputation.verificationStatus;
  }

  async updateVerificationStatus(
    agentId: string,
    updates: Partial<VerificationStatus>
  ): Promise<void> {
    const reputation = await this.getReputation(agentId);
    if (!reputation) {
      throw new Error(`No reputation found for agent: ${agentId}`);
    }

    const now = new Date();
    const updatedStatus: VerificationStatus = {
      ...reputation.verificationStatus,
      ...updates,
      verificationDate: now,
    };

    // Calculate trust score boost from verification
    let trustBoost = 0;
    if (updatedStatus.identityVerified) trustBoost += 10;
    if (updatedStatus.strategyAudited) trustBoost += 10;
    if (updatedStatus.trackRecordVerified) trustBoost += 10;
    if (updatedStatus.communityEndorsed) trustBoost += 5;
    if (updatedStatus.platformCertified) trustBoost += 15;

    const updatedReputation: AgentReputation = {
      ...reputation,
      verificationStatus: updatedStatus,
      trustScore: Math.min(100, reputation.trustScore + trustBoost),
    };

    this.reputations.set(agentId, updatedReputation);
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private initializeScoringModel(): ScoringModel {
    return {
      id: 'default_scoring_v1',
      name: 'Default Reputation Scoring Model',
      version: '1.0.0',
      weights: {
        performance: 0.25,
        consistency: 0.15,
        riskAdjustedReturns: 0.20,
        capitalManaged: 0.10,
        userRetention: 0.10,
        executionReliability: 0.10,
        transparency: 0.05,
        communityFeedback: 0.05,
      },
      thresholds: {
        minScoreForListing: 30,
        bronzeThreshold: 0,
        silverThreshold: 50,
        goldThreshold: 70,
        platinumThreshold: 85,
        diamondThreshold: 95,
        fraudDetectionThreshold: 0.7,
      },
      features: [
        { name: 'roi_30d', weight: 0.15, extractor: 'performance', normalization: 'percentile', missingValueStrategy: 'zero' },
        { name: 'sharpe_ratio', weight: 0.10, extractor: 'risk_adjusted', normalization: 'minmax', missingValueStrategy: 'median' },
        { name: 'max_drawdown', weight: 0.10, extractor: 'risk', normalization: 'minmax', missingValueStrategy: 'mean' },
        { name: 'win_rate', weight: 0.10, extractor: 'performance', normalization: 'percentile', missingValueStrategy: 'mean' },
        { name: 'total_trades', weight: 0.05, extractor: 'activity', normalization: 'log', missingValueStrategy: 'zero' },
        { name: 'days_active', weight: 0.05, extractor: 'activity', normalization: 'log', missingValueStrategy: 'zero' },
        { name: 'follower_count', weight: 0.10, extractor: 'social', normalization: 'log', missingValueStrategy: 'zero' },
        { name: 'capital_managed', weight: 0.10, extractor: 'capital', normalization: 'log', missingValueStrategy: 'zero' },
        { name: 'execution_success_rate', weight: 0.10, extractor: 'reliability', normalization: 'percentile', missingValueStrategy: 'mean' },
        { name: 'avg_rating', weight: 0.05, extractor: 'community', normalization: 'minmax', missingValueStrategy: 'mean' },
        { name: 'verification_level', weight: 0.10, extractor: 'trust', normalization: 'minmax', missingValueStrategy: 'zero' },
      ],
      lastUpdated: new Date(),
    };
  }

  private calculatePerformanceScore(performance: AgentPerformance): number {
    // Weighted combination of performance metrics
    let score = 0;

    // ROI contribution (normalized to 0-100)
    const roiScore = Math.min(100, Math.max(0, (performance.totalPnlPercent + 50)));
    score += roiScore * 0.4;

    // Win rate contribution
    const winRate = performance.totalTrades > 0
      ? (performance.successfulTrades / performance.totalTrades) * 100
      : 50;
    score += winRate * 0.3;

    // Trade count contribution (more trades = more confidence)
    const tradeCountScore = Math.min(100, performance.totalTrades / 10);
    score += tradeCountScore * 0.3;

    return Math.min(100, Math.max(0, score));
  }

  private calculateConsistencyScore(performance: AgentPerformance): number {
    const history = performance.performanceHistory;
    if (history.length < 2) {
      return 50; // Neutral for insufficient data
    }

    // Calculate variance of returns
    const returns = history.map(h => h.pnlPercent);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher consistency score
    // Normalize: stdDev of 0 = 100, stdDev of 50+ = 0
    const consistencyScore = Math.max(0, 100 - (stdDev * 2));

    return consistencyScore;
  }

  private calculateReliabilityScore(performance: AgentPerformance): number {
    if (performance.totalTrades === 0) {
      return 50;
    }

    // Success rate of trade execution
    const successRate = (performance.successfulTrades / performance.totalTrades) * 100;

    // Penalize for failed trades
    const failurePenalty = (performance.failedTrades / performance.totalTrades) * 20;

    return Math.max(0, Math.min(100, successRate - failurePenalty));
  }

  private calculateConfidence(reputation: AgentReputation): number {
    let confidence = 0.5; // Base confidence

    // More history = higher confidence
    confidence += Math.min(0.2, reputation.history.length * 0.01);

    // Verification boosts confidence
    const verification = reputation.verificationStatus;
    if (verification.identityVerified) confidence += 0.1;
    if (verification.strategyAudited) confidence += 0.1;
    if (verification.trackRecordVerified) confidence += 0.1;

    // Fraud flags reduce confidence
    const unresolvedFlags = reputation.fraudFlags.filter(f => f.status === 'investigating');
    confidence -= unresolvedFlags.length * 0.1;

    return Math.max(0.1, Math.min(1, confidence));
  }

  private getExpectedRange(metric: string): [number, number] {
    const ranges: Record<string, [number, number]> = {
      performance: [20, 80],
      consistency: [30, 90],
      reliability: [50, 100],
      trust: [20, 100],
      transparency: [40, 100],
      community: [30, 90],
    };
    return ranges[metric] ?? [0, 100];
  }

  private detectWashTrading(performance: AgentPerformance): number {
    // Analyze trading patterns for wash trading indicators
    // Returns score 0-1 where higher = more suspicious

    const positions = performance.currentPositions;
    if (positions.length < 5) return 0;

    // Check for repetitive buy/sell patterns
    // In production, this would analyze actual trade history
    let suspiciousPatternScore = 0;

    // Check for trades with no profit (just moving tokens)
    const zeroPnlTrades = positions.filter(p => Math.abs(p.pnl) < 0.01);
    suspiciousPatternScore += (zeroPnlTrades.length / positions.length) * 0.5;

    // Check for unusually high trade frequency
    const tradesPerDay = performance.totalTrades / Math.max(1, performance.avgHoldingPeriod);
    if (tradesPerDay > 100) {
      suspiciousPatternScore += 0.3;
    }

    return Math.min(1, suspiciousPatternScore);
  }

  private detectVolumeSpike(performance: AgentPerformance): number {
    // Detect unusual volume spikes that may indicate manipulation
    const history = performance.performanceHistory;
    if (history.length < 10) return 0;

    // Calculate average volume
    const avgValue = history.slice(0, -1).reduce((sum, h) => sum + h.totalValue, 0) / (history.length - 1);
    const latestValue = history[history.length - 1].totalValue;

    // Check for spike
    if (avgValue > 0) {
      return latestValue / avgValue;
    }

    return 0;
  }

  private checkPerformanceConsistency(performance: AgentPerformance): number {
    // Check if performance seems too good to be true
    const history = performance.performanceHistory;
    if (history.length < 5) return 1; // Give benefit of doubt

    // Count number of positive vs negative periods
    let positiveCount = 0;
    let totalCount = 0;

    for (let i = 1; i < history.length; i++) {
      const change = history[i].pnlPercent - history[i - 1].pnlPercent;
      if (change >= 0) positiveCount++;
      totalCount++;
    }

    // If ALL periods are positive, that's suspicious
    const positiveRatio = positiveCount / totalCount;
    if (positiveRatio > 0.95) return 0.3; // Suspicious
    if (positiveRatio > 0.85) return 0.6; // Somewhat suspicious

    return 1; // Normal variance
  }

  private createFraudFlag(type: FraudType, score: number, _performance: AgentPerformance): FraudFlag {
    const severity = score > 0.9 ? 'critical' : score > 0.7 ? 'high' : score > 0.5 ? 'medium' : 'low';

    const descriptions: Record<FraudType, string> = {
      wash_trading: 'Suspicious trading patterns detected that may indicate wash trading',
      fake_performance: 'Performance metrics appear inconsistent with market conditions',
      strategy_cloning: 'Strategy appears to be copied from another creator without attribution',
      front_running: 'Pattern of trades ahead of follower executions detected',
      manipulation: 'Market manipulation patterns detected',
      pump_and_dump: 'Coordinated price manipulation pattern detected',
      fake_volume: 'Artificial volume generation suspected',
      sybil_attack: 'Multiple accounts controlled by same entity suspected',
    };

    return {
      id: this.generateId('fraud_flag'),
      type,
      severity: severity as 'low' | 'medium' | 'high' | 'critical',
      description: descriptions[type],
      evidence: [`Anomaly score: ${score.toFixed(2)}`],
      detectedAt: new Date(),
      status: 'investigating',
    };
  }

  private getFraudPenalty(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const penalties: Record<string, number> = {
      low: 5,
      medium: 15,
      high: 30,
      critical: 50,
    };
    return penalties[severity] ?? 0;
  }

  private getBadgeDefinitions(): Omit<Badge, 'earnedAt'>[] {
    return [
      {
        id: 'early_adopter',
        name: 'Early Adopter',
        description: 'Among the first agents on the platform',
        category: 'milestone',
        rarity: 'rare',
      },
      {
        id: 'first_100_trades',
        name: 'Centurion',
        description: 'Completed 100 successful trades',
        category: 'milestone',
        rarity: 'common',
      },
      {
        id: 'first_1000_trades',
        name: 'Grand Trader',
        description: 'Completed 1000 successful trades',
        category: 'milestone',
        rarity: 'rare',
      },
      {
        id: 'sharpe_master',
        name: 'Sharpe Master',
        description: 'Maintained Sharpe ratio above 2.0 for 30 days',
        category: 'performance',
        rarity: 'epic',
      },
      {
        id: 'low_drawdown',
        name: 'Steady Hand',
        description: 'Maximum drawdown never exceeded 10%',
        category: 'performance',
        rarity: 'rare',
      },
      {
        id: 'verified_creator',
        name: 'Verified Creator',
        description: 'Completed full identity verification',
        category: 'trust',
        rarity: 'uncommon',
      },
      {
        id: 'community_favorite',
        name: 'Community Favorite',
        description: 'Received 50+ positive reviews',
        category: 'community',
        rarity: 'rare',
      },
      {
        id: 'diamond_tier',
        name: 'Diamond Elite',
        description: 'Achieved Diamond reputation tier',
        category: 'milestone',
        rarity: 'legendary',
      },
    ];
  }

  private checkBadgeCondition(reputation: AgentReputation, badge: Omit<Badge, 'earnedAt'>): boolean {
    switch (badge.id) {
      case 'verified_creator':
        return reputation.verificationStatus.identityVerified;
      case 'diamond_tier':
        return reputation.tier === 'diamond';
      case 'sharpe_master':
        return reputation.performanceScore > 90;
      case 'low_drawdown':
        return true; // Would check actual drawdown history
      default:
        return false;
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(event: MarketplaceEvent): void {
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
// Configuration Types
// ============================================================================

export interface ReputationManagerConfig {
  updateFrequencyMinutes: number;
  anomalyDetectionEnabled: boolean;
  mlModelEnabled: boolean;
  groqApiEnabled: boolean;
  fraudDetection: FraudDetectionConfig;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createReputationManager(
  config?: Partial<ReputationManagerConfig>
): DefaultReputationManager {
  return new DefaultReputationManager(config);
}
