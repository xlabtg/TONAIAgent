/**
 * TONAIAgent - Open Agent Protocol Reputation Module
 *
 * Reputation and Trust Layer for the Open Agent Protocol.
 * Handles agent reputation scoring, performance tracking, and verification.
 */

import {
  AgentId,
  AgentReputation,
  ComponentScore,
  ReputationHistory,
  VerificationBadge,
  PerformanceMetrics,
} from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Reputation manager configuration
 */
export interface ReputationManagerConfig {
  /** Weight for performance component */
  performanceWeight: number;

  /** Weight for reliability component */
  reliabilityWeight: number;

  /** Weight for risk management component */
  riskManagementWeight: number;

  /** Weight for compliance component */
  complianceWeight: number;

  /** Weight for endorsements component */
  endorsementsWeight: number;

  /** History retention (number of entries) */
  historyRetention: number;

  /** Minimum sample size for confidence */
  minSampleSize: number;
}

/**
 * Performance update input
 */
export interface PerformanceUpdate {
  /** Agent ID */
  agentId: AgentId;

  /** Trade result */
  tradeResult?: {
    profit: number;
    duration: number;
    success: boolean;
  };

  /** Task completion */
  taskCompletion?: {
    completed: boolean;
    executionTime: number;
  };

  /** Risk event */
  riskEvent?: {
    type: 'drawdown' | 'slippage' | 'failure';
    severity: number;
  };
}

/**
 * Endorsement input
 */
export interface EndorsementInput {
  /** Agent to endorse */
  agentId: AgentId;

  /** Endorser */
  endorser: string;

  /** Endorsement type */
  type: 'performance' | 'reliability' | 'trust';

  /** Rating (1-5) */
  rating: number;

  /** Comment */
  comment?: string;
}

/**
 * Endorsement record
 */
export interface Endorsement {
  /** Endorsement ID */
  id: string;

  /** Agent ID */
  agentId: AgentId;

  /** Endorser */
  endorser: string;

  /** Type */
  type: 'performance' | 'reliability' | 'trust';

  /** Rating */
  rating: number;

  /** Comment */
  comment?: string;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Reputation event types
 */
export type ReputationEventType =
  | 'reputation.updated'
  | 'reputation.badge_awarded'
  | 'reputation.badge_revoked'
  | 'reputation.endorsement_added';

/**
 * Reputation event
 */
export interface ReputationEvent {
  /** Event type */
  type: ReputationEventType;

  /** Agent ID */
  agentId: AgentId;

  /** Event data */
  data: Record<string, unknown>;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Reputation event handler
 */
export type ReputationEventHandler = (event: ReputationEvent) => void;

// ============================================================================
// Reputation Manager Interface
// ============================================================================

/**
 * Reputation manager interface
 */
export interface ReputationManager {
  /** Get reputation for agent */
  getReputation(agentId: AgentId): Promise<AgentReputation | undefined>;

  /** Update reputation with performance data */
  updatePerformance(update: PerformanceUpdate): Promise<void>;

  /** Add endorsement */
  addEndorsement(endorsement: EndorsementInput): Promise<Endorsement>;

  /** Get endorsements for agent */
  getEndorsements(agentId: AgentId): Promise<Endorsement[]>;

  /** Award badge */
  awardBadge(agentId: AgentId, badge: VerificationBadge): Promise<void>;

  /** Revoke badge */
  revokeBadge(agentId: AgentId, badgeType: string): Promise<boolean>;

  /** Get performance metrics */
  getPerformanceMetrics(agentId: AgentId, period: string): Promise<PerformanceMetrics | undefined>;

  /** Get reputation history */
  getHistory(agentId: AgentId, limit?: number): Promise<ReputationHistory[]>;

  /** Get top agents by reputation */
  getTopAgents(limit?: number): Promise<AgentReputation[]>;

  /** Subscribe to events */
  subscribe(handler: ReputationEventHandler): () => void;
}

// ============================================================================
// Default Implementation
// ============================================================================

/**
 * Default reputation manager implementation
 */
export class DefaultReputationManager implements ReputationManager {
  private config: ReputationManagerConfig;
  private reputations: Map<AgentId, AgentReputation> = new Map();
  private endorsements: Map<AgentId, Endorsement[]> = new Map();
  private performanceData: Map<AgentId, PerformanceUpdate[]> = new Map();
  private eventHandlers: Set<ReputationEventHandler> = new Set();

  constructor(config: Partial<ReputationManagerConfig> = {}) {
    this.config = {
      performanceWeight: config.performanceWeight ?? 0.30,
      reliabilityWeight: config.reliabilityWeight ?? 0.25,
      riskManagementWeight: config.riskManagementWeight ?? 0.20,
      complianceWeight: config.complianceWeight ?? 0.15,
      endorsementsWeight: config.endorsementsWeight ?? 0.10,
      historyRetention: config.historyRetention ?? 100,
      minSampleSize: config.minSampleSize ?? 10,
    };
  }

  /**
   * Get reputation for agent
   */
  async getReputation(agentId: AgentId): Promise<AgentReputation | undefined> {
    let reputation = this.reputations.get(agentId);

    if (!reputation) {
      // Initialize reputation for new agent
      reputation = this.initializeReputation(agentId);
      this.reputations.set(agentId, reputation);
    }

    return reputation;
  }

  /**
   * Update reputation with performance data
   */
  async updatePerformance(update: PerformanceUpdate): Promise<void> {
    // Store performance data
    const data = this.performanceData.get(update.agentId) ?? [];
    data.push(update);

    // Keep bounded
    if (data.length > 1000) {
      data.splice(0, data.length - 1000);
    }

    this.performanceData.set(update.agentId, data);

    // Recalculate reputation
    await this.recalculateReputation(update.agentId);
  }

  /**
   * Add endorsement
   */
  async addEndorsement(input: EndorsementInput): Promise<Endorsement> {
    const endorsement: Endorsement = {
      id: this.generateEndorsementId(),
      agentId: input.agentId,
      endorser: input.endorser,
      type: input.type,
      rating: input.rating,
      comment: input.comment,
      timestamp: new Date(),
    };

    const existing = this.endorsements.get(input.agentId) ?? [];
    existing.push(endorsement);
    this.endorsements.set(input.agentId, existing);

    // Recalculate reputation
    await this.recalculateReputation(input.agentId);

    this.emitEvent({
      type: 'reputation.endorsement_added',
      agentId: input.agentId,
      data: { endorser: input.endorser, type: input.type, rating: input.rating },
      timestamp: new Date(),
    });

    return endorsement;
  }

  /**
   * Get endorsements for agent
   */
  async getEndorsements(agentId: AgentId): Promise<Endorsement[]> {
    return this.endorsements.get(agentId) ?? [];
  }

  /**
   * Award badge
   */
  async awardBadge(agentId: AgentId, badge: VerificationBadge): Promise<void> {
    const reputation = await this.getReputation(agentId);
    if (!reputation) return;

    // Remove existing badge of same type
    reputation.verification.badges = reputation.verification.badges.filter(
      b => b.type !== badge.type
    );

    // Add new badge
    reputation.verification.badges.push(badge);

    // Update verification status based on badges
    this.updateVerificationStatus(reputation);

    this.emitEvent({
      type: 'reputation.badge_awarded',
      agentId,
      data: { badge },
      timestamp: new Date(),
    });
  }

  /**
   * Revoke badge
   */
  async revokeBadge(agentId: AgentId, badgeType: string): Promise<boolean> {
    const reputation = this.reputations.get(agentId);
    if (!reputation) return false;

    const initialLength = reputation.verification.badges.length;
    reputation.verification.badges = reputation.verification.badges.filter(
      b => b.type !== badgeType
    );

    if (reputation.verification.badges.length < initialLength) {
      this.updateVerificationStatus(reputation);

      this.emitEvent({
        type: 'reputation.badge_revoked',
        agentId,
        data: { badgeType },
        timestamp: new Date(),
      });

      return true;
    }

    return false;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    agentId: AgentId,
    period: string
  ): Promise<PerformanceMetrics | undefined> {
    const data = this.performanceData.get(agentId) ?? [];
    if (data.length === 0) return undefined;

    // Filter by period
    const now = new Date();
    const periodMs = this.getPeriodMs(period);
    const cutoff = new Date(now.getTime() - periodMs);

    const tradeResults = data
      .filter(d => d.tradeResult)
      .map(d => d.tradeResult!);

    const wins = tradeResults.filter(t => t.profit > 0);
    const losses = tradeResults.filter(t => t.profit < 0);

    const totalReturn = tradeResults.reduce((sum, t) => sum + t.profit, 0);
    const winRate = tradeResults.length > 0 ? wins.length / tradeResults.length : 0;
    const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.profit, 0) / losses.length) : 0;
    const profitFactor = averageLoss > 0 ? (averageWin * wins.length) / (averageLoss * losses.length) : 0;

    // Calculate drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const trade of tradeResults) {
      cumulative += trade.profit;
      if (cumulative > peak) peak = cumulative;
      const drawdown = (peak - cumulative) / Math.max(peak, 1);
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return {
      totalReturn,
      sharpeRatio: this.calculateSharpeRatio(tradeResults.map(t => t.profit)),
      sortinoRatio: this.calculateSortinoRatio(tradeResults.map(t => t.profit)),
      maxDrawdown: maxDrawdown * 100,
      winRate: winRate * 100,
      averageWin,
      averageLoss,
      profitFactor,
      totalTrades: tradeResults.length,
      tradingFrequency: tradeResults.length / (periodMs / (24 * 60 * 60 * 1000)),
      averageHoldTime: tradeResults.reduce((sum, t) => sum + t.duration, 0) / tradeResults.length / 3600000,
      volatility: this.calculateVolatility(tradeResults.map(t => t.profit)),
      varDaily: this.calculateVaR(tradeResults.map(t => t.profit)),
      betaToMarket: 1, // Simplified
      period: period as 'daily' | 'weekly' | 'monthly' | 'all_time',
      startDate: cutoff,
      endDate: now,
    };
  }

  /**
   * Get reputation history
   */
  async getHistory(agentId: AgentId, limit?: number): Promise<ReputationHistory[]> {
    const reputation = this.reputations.get(agentId);
    if (!reputation) return [];

    const history = reputation.history;
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get top agents by reputation
   */
  async getTopAgents(limit: number = 10): Promise<AgentReputation[]> {
    const all = Array.from(this.reputations.values());
    return all
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  /**
   * Subscribe to events
   */
  subscribe(handler: ReputationEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeReputation(agentId: AgentId): AgentReputation {
    return {
      agentId,
      overallScore: 500, // Start at 50%
      components: {
        performance: this.initializeComponent(),
        reliability: this.initializeComponent(),
        riskManagement: this.initializeComponent(),
        compliance: this.initializeComponent(),
        endorsements: this.initializeComponent(),
      },
      history: [],
      verification: {
        identityVerified: false,
        codeAudited: false,
        performanceVerified: false,
        badges: [],
      },
      updatedAt: new Date(),
    };
  }

  private initializeComponent(): ComponentScore {
    return {
      score: 500,
      confidence: 0,
      sampleSize: 0,
      trend: 'stable',
    };
  }

  private async recalculateReputation(agentId: AgentId): Promise<void> {
    const reputation = await this.getReputation(agentId);
    if (!reputation) return;

    const data = this.performanceData.get(agentId) ?? [];
    const endorsementList = this.endorsements.get(agentId) ?? [];

    const previousScore = reputation.overallScore;

    // Calculate performance component
    const tradeResults = data.filter(d => d.tradeResult).map(d => d.tradeResult!);
    if (tradeResults.length > 0) {
      const winRate = tradeResults.filter(t => t.success).length / tradeResults.length;
      const avgProfit = tradeResults.reduce((sum, t) => sum + t.profit, 0) / tradeResults.length;

      reputation.components.performance = {
        score: Math.min(1000, Math.max(0, 500 + (winRate - 0.5) * 500 + avgProfit * 10)),
        confidence: Math.min(1, tradeResults.length / this.config.minSampleSize),
        sampleSize: tradeResults.length,
        trend: this.calculateTrend(tradeResults.map(t => t.profit)),
      };
    }

    // Calculate reliability component
    const taskResults = data.filter(d => d.taskCompletion).map(d => d.taskCompletion!);
    if (taskResults.length > 0) {
      const completionRate = taskResults.filter(t => t.completed).length / taskResults.length;
      const avgTime = taskResults.reduce((sum, t) => sum + t.executionTime, 0) / taskResults.length;

      reputation.components.reliability = {
        score: Math.min(1000, Math.max(0, completionRate * 800 + (1 / (1 + avgTime / 10000)) * 200)),
        confidence: Math.min(1, taskResults.length / this.config.minSampleSize),
        sampleSize: taskResults.length,
        trend: this.calculateTrend(taskResults.map(t => t.completed ? 1 : 0)),
      };
    }

    // Calculate risk management component
    const riskEvents = data.filter(d => d.riskEvent).map(d => d.riskEvent!);
    const riskScore = riskEvents.length === 0
      ? 800
      : Math.max(0, 1000 - riskEvents.reduce((sum, e) => sum + e.severity * 100, 0) / riskEvents.length);

    reputation.components.riskManagement = {
      score: riskScore,
      confidence: Math.min(1, data.length / this.config.minSampleSize),
      sampleSize: riskEvents.length,
      trend: 'stable',
    };

    // Calculate endorsements component
    if (endorsementList.length > 0) {
      const avgRating = endorsementList.reduce((sum, e) => sum + e.rating, 0) / endorsementList.length;

      reputation.components.endorsements = {
        score: avgRating * 200,
        confidence: Math.min(1, endorsementList.length / 5),
        sampleSize: endorsementList.length,
        trend: 'stable',
      };
    }

    // Calculate overall score
    reputation.overallScore = Math.round(
      reputation.components.performance.score * this.config.performanceWeight +
      reputation.components.reliability.score * this.config.reliabilityWeight +
      reputation.components.riskManagement.score * this.config.riskManagementWeight +
      reputation.components.compliance.score * this.config.complianceWeight +
      reputation.components.endorsements.score * this.config.endorsementsWeight
    );

    // Add to history
    reputation.history.push({
      timestamp: new Date(),
      score: reputation.overallScore,
      delta: reputation.overallScore - previousScore,
    });

    // Trim history
    if (reputation.history.length > this.config.historyRetention) {
      reputation.history = reputation.history.slice(-this.config.historyRetention);
    }

    reputation.updatedAt = new Date();

    this.emitEvent({
      type: 'reputation.updated',
      agentId,
      data: { score: reputation.overallScore, delta: reputation.overallScore - previousScore },
      timestamp: new Date(),
    });
  }

  private updateVerificationStatus(reputation: AgentReputation): void {
    const badges = reputation.verification.badges;

    reputation.verification.identityVerified = badges.some(b => b.type === 'identity');
    reputation.verification.codeAudited = badges.some(b => b.type === 'audit');
    reputation.verification.performanceVerified = badges.some(b => b.type === 'performance');
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 5) return 'stable';

    const recent = values.slice(-5);
    const older = values.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = (recentAvg - olderAvg) / Math.abs(olderAvg || 1);

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;

    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length
    );

    return std === 0 ? 0 : avg / std;
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length < 2) return 0;

    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);

    if (negativeReturns.length === 0) return avg > 0 ? Infinity : 0;

    const downside = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    );

    return avg / downside;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;

    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private calculateVaR(returns: number[], confidence: number = 0.95): number {
    if (returns.length < 10) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);

    return Math.abs(sorted[index] || 0);
  }

  private getPeriodMs(period: string): number {
    switch (period) {
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      default: return Infinity;
    }
  }

  private generateEndorsementId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `end_${timestamp}_${random}`;
  }

  private emitEvent(event: ReputationEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in reputation event handler:', error);
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create reputation manager
 */
export function createReputationManager(
  config?: Partial<ReputationManagerConfig>
): ReputationManager {
  return new DefaultReputationManager(config);
}
