/**
 * TONAIAgent - Revenue Distribution Engine
 *
 * Implements on-chain revenue distribution logic for the Agent Marketplace Economy.
 * Handles automatic fee splits between creators, platform, referrers, and DAO treasury.
 *
 * Revenue Flow:
 *   User → Agent Execution → Profit → Automatic Fee Split
 *     ├── Creator Share (configurable, e.g. 70%)
 *     ├── Platform Share (configurable, e.g. 25%)
 *     ├── Referrer Share (optional, e.g. 5%)
 *     └── DAO Treasury (future governance, optional)
 *
 * Features:
 * - Smart contract-style revenue distribution
 * - Multi-party fee splits with validation
 * - High-water mark tracking for performance fees
 * - Pending distributions queue with batch processing
 * - On-chain transaction simulation
 * - Revenue analytics per period
 * - DAO treasury integration hook
 */

import {
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// Revenue Distribution Types
// ============================================================================

export type DistributionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'reversed';

export type RevenueSource =
  | 'performance_fee'
  | 'management_fee'
  | 'subscription_fee'
  | 'copy_trading_fee'
  | 'referral_bonus'
  | 'platform_fee';

export interface RevenueEvent {
  id: string;
  agentId: string;
  strategyId: string;
  creatorId: string;
  source: RevenueSource;
  grossAmount: number;
  currency: string;
  pnl?: number;
  capitalManaged?: number;
  periodDays?: number;
  highWaterMark?: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface Distribution {
  id: string;
  revenueEventId: string;
  agentId: string;
  creatorId: string;
  status: DistributionStatus;
  splits: DistributionSplit[];
  totalAmount: number;
  currency: string;
  txHash?: string;
  blockNumber?: number;
  createdAt: Date;
  processedAt?: Date;
  failureReason?: string;
}

export interface DistributionSplit {
  recipientId: string;
  recipientType: 'creator' | 'platform' | 'referrer' | 'dao_treasury' | 'staker';
  amount: number;
  percentage: number;
  txHash?: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface DistributionRule {
  id: string;
  agentId?: string;
  strategyId?: string;
  creatorId: string;
  splits: SplitRule[];
  highWaterMarkTracking: boolean;
  active: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}

export interface SplitRule {
  recipientId: string;
  recipientType: 'creator' | 'platform' | 'referrer' | 'dao_treasury' | 'staker';
  percentage: number;
  minAmount?: number;
  conditions?: SplitCondition[];
}

export interface SplitCondition {
  field: 'pnl' | 'capital_managed' | 'source' | 'creator_tier';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'in';
  value: number | string | string[];
}

export interface HighWaterMark {
  agentId: string;
  value: number;
  currency: string;
  lastUpdated: Date;
  allTimeHigh: number;
}

export interface RevenueStatement {
  agentId: string;
  creatorId: string;
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  totalGrossRevenue: number;
  totalDistributed: number;
  bySource: Record<RevenueSource, number>;
  byRecipient: Record<string, number>;
  distributions: Distribution[];
  pendingAmount: number;
  currency: string;
  generatedAt: Date;
}

export interface DAOTreasuryAllocation {
  period: string;
  totalAmount: number;
  agentCount: number;
  currency: string;
  distributionTxHash?: string;
  allocatedAt: Date;
}

export interface BatchDistributionResult {
  processed: number;
  successful: number;
  failed: number;
  totalAmount: number;
  distributions: Distribution[];
  errors: Array<{ distributionId: string; error: string }>;
}

// ============================================================================
// Revenue Distribution Engine Interface
// ============================================================================

export interface RevenueDistributionEngine {
  // Rule management
  createDistributionRule(rule: Omit<DistributionRule, 'id' | 'effectiveFrom'>): Promise<DistributionRule>;
  getDistributionRule(ruleId: string): Promise<DistributionRule | null>;
  getActiveRule(agentId: string): Promise<DistributionRule | null>;
  deactivateRule(ruleId: string): Promise<void>;

  // Revenue processing
  processRevenue(event: Omit<RevenueEvent, 'id' | 'timestamp'>): Promise<Distribution>;
  calculateSplits(amount: number, rule: DistributionRule): DistributionSplit[];
  processPendingDistributions(): Promise<BatchDistributionResult>;
  reverseDistribution(distributionId: string, reason: string): Promise<Distribution>;

  // High-water mark
  getHighWaterMark(agentId: string): Promise<HighWaterMark | null>;
  updateHighWaterMark(agentId: string, currentValue: number, currency: string): Promise<HighWaterMark>;
  calculateAboveHighWaterMark(agentId: string, currentValue: number): Promise<number>;

  // Analytics
  getDistributions(agentId: string, limit?: number): Promise<Distribution[]>;
  getRevenueStatement(agentId: string, start: Date, end: Date): Promise<RevenueStatement>;
  getCreatorRevenue(creatorId: string, start: Date, end: Date): Promise<number>;

  // DAO treasury
  allocateToDAOTreasury(period: string): Promise<DAOTreasuryAllocation>;
  getDAOAllocations(): Promise<DAOTreasuryAllocation[]>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Revenue Distribution Engine Config
// ============================================================================

export interface RevenueDistributionConfig {
  defaultPlatformId: string;
  defaultDAOTreasuryId: string;
  defaultPlatformFeePercent: number;
  defaultDAOFeePercent: number;
  minDistributionAmount: number;
  batchSize: number;
  currency: string;
}

// ============================================================================
// Default Revenue Distribution Engine Implementation
// ============================================================================

const DEFAULT_CONFIG: RevenueDistributionConfig = {
  defaultPlatformId: 'platform',
  defaultDAOTreasuryId: 'dao_treasury',
  defaultPlatformFeePercent: 2.5,
  defaultDAOFeePercent: 0.5,
  minDistributionAmount: 0.1,
  batchSize: 100,
  currency: 'TON',
};

function generateId(): string {
  return `revdist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function emitEvent(
  callbacks: MarketplaceEventCallback[],
  type: string,
  source: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  const event: MarketplaceEvent = {
    id: generateId(),
    timestamp: new Date(),
    type: type as MarketplaceEvent['type'],
    severity: 'info',
    source,
    message,
    data,
  };
  for (const cb of callbacks) {
    try {
      cb(event);
    } catch {
      // Ignore callback errors
    }
  }
}

export class DefaultRevenueDistributionEngine implements RevenueDistributionEngine {
  private readonly rules: Map<string, DistributionRule> = new Map();
  private readonly distributions: Map<string, Distribution> = new Map();
  private readonly revenueEvents: Map<string, RevenueEvent> = new Map();
  private readonly highWaterMarks: Map<string, HighWaterMark> = new Map();
  private readonly daoAllocations: DAOTreasuryAllocation[] = [];
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: RevenueDistributionConfig;

  constructor(config: Partial<RevenueDistributionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async createDistributionRule(
    rule: Omit<DistributionRule, 'id' | 'effectiveFrom'>
  ): Promise<DistributionRule> {
    // Validate splits
    this.validateSplits(rule.splits);

    const newRule: DistributionRule = {
      ...rule,
      id: generateId(),
      effectiveFrom: new Date(),
    };

    // Deactivate existing active rules for same agent/strategy/creator
    if (rule.agentId) {
      for (const existing of this.rules.values()) {
        if (existing.agentId === rule.agentId && existing.active) {
          existing.active = false;
          this.rules.set(existing.id, existing);
        }
      }
    }

    this.rules.set(newRule.id, newRule);

    emitEvent(
      this.eventCallbacks,
      'payout_processed',
      'revenue_distribution',
      `Distribution rule created for creator ${rule.creatorId}`,
      { ruleId: newRule.id, creatorId: rule.creatorId }
    );

    return newRule;
  }

  async getDistributionRule(ruleId: string): Promise<DistributionRule | null> {
    return this.rules.get(ruleId) ?? null;
  }

  async getActiveRule(agentId: string): Promise<DistributionRule | null> {
    const now = new Date();
    const activeRules = Array.from(this.rules.values()).filter(r =>
      r.active &&
      (r.agentId === agentId || !r.agentId) &&
      r.effectiveFrom <= now &&
      (!r.effectiveUntil || r.effectiveUntil > now)
    );

    if (activeRules.length === 0) return null;

    // Return the most specific rule (agent-specific over general)
    return activeRules.find(r => r.agentId === agentId) ?? activeRules[0];
  }

  async deactivateRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Distribution rule ${ruleId} not found`);
    }
    rule.active = false;
    rule.effectiveUntil = new Date();
    this.rules.set(ruleId, rule);
  }

  async processRevenue(
    eventData: Omit<RevenueEvent, 'id' | 'timestamp'>
  ): Promise<Distribution> {
    if (eventData.grossAmount < this.config.minDistributionAmount) {
      throw new Error(
        `Revenue amount ${eventData.grossAmount} is below minimum ${this.config.minDistributionAmount}`
      );
    }

    const revenueEvent: RevenueEvent = {
      ...eventData,
      id: generateId(),
      timestamp: new Date(),
    };
    this.revenueEvents.set(revenueEvent.id, revenueEvent);

    // Get distribution rule
    const rule = await this.getActiveRule(eventData.agentId);

    let splits: DistributionSplit[];
    if (rule) {
      splits = this.calculateSplits(eventData.grossAmount, rule);
    } else {
      // Use default platform split
      splits = this.calculateDefaultSplits(eventData.grossAmount, eventData.creatorId);
    }

    const distribution: Distribution = {
      id: generateId(),
      revenueEventId: revenueEvent.id,
      agentId: eventData.agentId,
      creatorId: eventData.creatorId,
      status: 'pending',
      splits,
      totalAmount: eventData.grossAmount,
      currency: this.config.currency,
      createdAt: new Date(),
    };

    this.distributions.set(distribution.id, distribution);

    emitEvent(
      this.eventCallbacks,
      'payout_processed',
      'revenue_distribution',
      `Revenue distribution created: ${eventData.grossAmount} ${this.config.currency}`,
      {
        distributionId: distribution.id,
        agentId: eventData.agentId,
        amount: eventData.grossAmount,
        source: eventData.source,
      }
    );

    return distribution;
  }

  calculateSplits(amount: number, rule: DistributionRule): DistributionSplit[] {
    this.validateSplits(rule.splits);

    return rule.splits.map(split => ({
      recipientId: split.recipientId,
      recipientType: split.recipientType,
      amount: (amount * split.percentage) / 100,
      percentage: split.percentage,
      status: 'pending' as const,
    }));
  }

  async processPendingDistributions(): Promise<BatchDistributionResult> {
    const pending = Array.from(this.distributions.values())
      .filter(d => d.status === 'pending')
      .slice(0, this.config.batchSize);

    const result: BatchDistributionResult = {
      processed: pending.length,
      successful: 0,
      failed: 0,
      totalAmount: 0,
      distributions: [],
      errors: [],
    };

    for (const distribution of pending) {
      try {
        // Simulate on-chain transaction
        distribution.status = 'processing';
        this.distributions.set(distribution.id, distribution);

        // Complete the distribution
        distribution.status = 'completed';
        distribution.processedAt = new Date();
        distribution.txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

        // Mark all splits as completed
        for (const split of distribution.splits) {
          split.status = 'completed';
          split.txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        }

        this.distributions.set(distribution.id, distribution);

        result.successful++;
        result.totalAmount += distribution.totalAmount;
        result.distributions.push(distribution);

        emitEvent(
          this.eventCallbacks,
          'payout_processed',
          'revenue_distribution',
          `Distribution ${distribution.id} completed`,
          {
            distributionId: distribution.id,
            amount: distribution.totalAmount,
            txHash: distribution.txHash,
          }
        );
      } catch (error) {
        distribution.status = 'failed';
        distribution.failureReason = String(error);
        this.distributions.set(distribution.id, distribution);

        result.failed++;
        result.errors.push({
          distributionId: distribution.id,
          error: String(error),
        });
      }
    }

    return result;
  }

  async reverseDistribution(distributionId: string, reason: string): Promise<Distribution> {
    const distribution = this.distributions.get(distributionId);
    if (!distribution) {
      throw new Error(`Distribution ${distributionId} not found`);
    }
    if (distribution.status !== 'completed') {
      throw new Error(`Can only reverse completed distributions, current status: ${distribution.status}`);
    }

    distribution.status = 'reversed';
    distribution.failureReason = `Reversed: ${reason}`;

    for (const split of distribution.splits) {
      split.status = 'failed';
    }

    this.distributions.set(distributionId, distribution);

    emitEvent(
      this.eventCallbacks,
      'payout_processed',
      'revenue_distribution',
      `Distribution ${distributionId} reversed: ${reason}`,
      { distributionId, reason }
    );

    return distribution;
  }

  async getHighWaterMark(agentId: string): Promise<HighWaterMark | null> {
    return this.highWaterMarks.get(agentId) ?? null;
  }

  async updateHighWaterMark(
    agentId: string,
    currentValue: number,
    currency: string
  ): Promise<HighWaterMark> {
    const existing = this.highWaterMarks.get(agentId);

    const hwm: HighWaterMark = {
      agentId,
      value: Math.max(currentValue, existing?.value ?? currentValue),
      currency,
      lastUpdated: new Date(),
      allTimeHigh: Math.max(currentValue, existing?.allTimeHigh ?? currentValue),
    };

    this.highWaterMarks.set(agentId, hwm);
    return hwm;
  }

  async calculateAboveHighWaterMark(agentId: string, currentValue: number): Promise<number> {
    const hwm = await this.getHighWaterMark(agentId);
    if (!hwm) return Math.max(0, currentValue);
    return Math.max(0, currentValue - hwm.value);
  }

  async getDistributions(agentId: string, limit = 100): Promise<Distribution[]> {
    return Array.from(this.distributions.values())
      .filter(d => d.agentId === agentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getRevenueStatement(
    agentId: string,
    start: Date,
    end: Date
  ): Promise<RevenueStatement> {
    const distributions = Array.from(this.distributions.values()).filter(d =>
      d.agentId === agentId &&
      d.createdAt >= start &&
      d.createdAt <= end
    );

    const revenueEvents = Array.from(this.revenueEvents.values()).filter(e =>
      e.agentId === agentId &&
      e.timestamp >= start &&
      e.timestamp <= end
    );

    const totalGrossRevenue = revenueEvents.reduce((sum, e) => sum + e.grossAmount, 0);
    const totalDistributed = distributions
      .filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + d.totalAmount, 0);
    const pendingAmount = distributions
      .filter(d => d.status === 'pending' || d.status === 'processing')
      .reduce((sum, d) => sum + d.totalAmount, 0);

    const bySource: Record<RevenueSource, number> = {
      performance_fee: 0,
      management_fee: 0,
      subscription_fee: 0,
      copy_trading_fee: 0,
      referral_bonus: 0,
      platform_fee: 0,
    };

    for (const event of revenueEvents) {
      bySource[event.source] = (bySource[event.source] ?? 0) + event.grossAmount;
    }

    const byRecipient: Record<string, number> = {};
    for (const dist of distributions.filter(d => d.status === 'completed')) {
      for (const split of dist.splits) {
        byRecipient[split.recipientId] = (byRecipient[split.recipientId] ?? 0) + split.amount;
      }
    }

    const creatorId = distributions[0]?.creatorId ?? revenueEvents[0]?.creatorId ?? 'unknown';

    return {
      agentId,
      creatorId,
      period: {
        start,
        end,
        label: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      },
      totalGrossRevenue,
      totalDistributed,
      bySource,
      byRecipient,
      distributions,
      pendingAmount,
      currency: this.config.currency,
      generatedAt: new Date(),
    };
  }

  async getCreatorRevenue(creatorId: string, start: Date, end: Date): Promise<number> {
    const completedDists = Array.from(this.distributions.values()).filter(d =>
      d.creatorId === creatorId &&
      d.status === 'completed' &&
      d.createdAt >= start &&
      d.createdAt <= end
    );

    let creatorTotal = 0;
    for (const dist of completedDists) {
      for (const split of dist.splits) {
        if (split.recipientType === 'creator') {
          creatorTotal += split.amount;
        }
      }
    }

    return creatorTotal;
  }

  async allocateToDAOTreasury(period: string): Promise<DAOTreasuryAllocation> {
    // Collect pending DAO allocations
    let totalDAOAmount = 0;
    const agentIds = new Set<string>();

    for (const dist of this.distributions.values()) {
      if (dist.status === 'completed') {
        for (const split of dist.splits) {
          if (split.recipientType === 'dao_treasury' && split.status === 'completed') {
            totalDAOAmount += split.amount;
            agentIds.add(dist.agentId);
          }
        }
      }
    }

    const allocation: DAOTreasuryAllocation = {
      period,
      totalAmount: totalDAOAmount,
      agentCount: agentIds.size,
      currency: this.config.currency,
      distributionTxHash: totalDAOAmount > 0
        ? `0x${Math.random().toString(16).substr(2, 64)}`
        : undefined,
      allocatedAt: new Date(),
    };

    this.daoAllocations.push(allocation);

    emitEvent(
      this.eventCallbacks,
      'payout_processed',
      'revenue_distribution',
      `DAO treasury allocation: ${totalDAOAmount} ${this.config.currency} for period ${period}`,
      { period, amount: totalDAOAmount, agentCount: agentIds.size }
    );

    return allocation;
  }

  async getDAOAllocations(): Promise<DAOTreasuryAllocation[]> {
    return [...this.daoAllocations];
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateSplits(splits: SplitRule[]): void {
    if (splits.length === 0) {
      throw new Error('At least one split rule is required');
    }

    const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(
        `Split percentages must total 100%, got ${totalPercentage.toFixed(2)}%`
      );
    }

    for (const split of splits) {
      if (split.percentage < 0 || split.percentage > 100) {
        throw new Error(
          `Invalid split percentage ${split.percentage} for recipient ${split.recipientId}`
        );
      }
    }
  }

  private calculateDefaultSplits(amount: number, creatorId: string): DistributionSplit[] {
    const platformPercent = this.config.defaultPlatformFeePercent;
    const daoPercent = this.config.defaultDAOFeePercent;
    const creatorPercent = 100 - platformPercent - daoPercent;

    return [
      {
        recipientId: creatorId,
        recipientType: 'creator',
        amount: (amount * creatorPercent) / 100,
        percentage: creatorPercent,
        status: 'pending',
      },
      {
        recipientId: this.config.defaultPlatformId,
        recipientType: 'platform',
        amount: (amount * platformPercent) / 100,
        percentage: platformPercent,
        status: 'pending',
      },
      {
        recipientId: this.config.defaultDAOTreasuryId,
        recipientType: 'dao_treasury',
        amount: (amount * daoPercent) / 100,
        percentage: daoPercent,
        status: 'pending',
      },
    ];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRevenueDistributionEngine(
  config?: Partial<RevenueDistributionConfig>
): DefaultRevenueDistributionEngine {
  return new DefaultRevenueDistributionEngine(config);
}

export default DefaultRevenueDistributionEngine;
