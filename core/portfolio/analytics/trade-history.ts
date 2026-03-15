/**
 * TONAIAgent - Trade and Activity History
 *
 * Manages the complete history of executed trades, rebalancing events,
 * and allocation updates for the Portfolio Analytics Dashboard.
 * Provides filtering, pagination, and summary statistics.
 */

import {
  TradeActivity,
  TradeActivityType,
  TradeActivityHistory,
  RebalancingEvent,
  AnalyticsPeriod,
  StrategyAllocation,
  PortfolioAnalyticsConfig,
  PortfolioAnalyticsEvent,
  PortfolioAnalyticsEventCallback,
} from './types';
import { DefaultPortfolioDataModel } from './data-model';

// ============================================================================
// Trade History Filter
// ============================================================================

export interface TradeHistoryFilter {
  period?: AnalyticsPeriod;
  types?: TradeActivityType[];
  strategyId?: string;
  symbol?: string;
  minValue?: number;
  maxValue?: number;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Trade History Summary
// ============================================================================

export interface TradeHistorySummary {
  agentId: string;
  period: AnalyticsPeriod;
  totalActivities: number;
  totalTrades: number;
  totalRebalancings: number;
  totalVolume: number;
  totalFees: number;
  totalPnl: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgTradeValue: number;
  mostActiveStrategy?: string;
  lastActivityAt?: Date;
}

// ============================================================================
// Trade History Manager Interface
// ============================================================================

export interface TradeHistoryManager {
  // Recording
  recordTrade(
    agentId: string,
    trade: Omit<TradeActivity, 'id' | 'timestamp'>
  ): TradeActivity;

  recordRebalancing(
    agentId: string,
    reason: string,
    previousAllocations: StrategyAllocation[],
    newAllocations: StrategyAllocation[],
    totalValueBefore: number,
    totalValueAfter: number
  ): RebalancingEvent;

  recordAllocationUpdate(
    agentId: string,
    strategyId: string,
    strategyName: string,
    previousPercent: number,
    newPercent: number
  ): TradeActivity;

  // Querying
  getHistory(agentId: string, filter?: TradeHistoryFilter): TradeActivityHistory;
  getSummary(agentId: string, period: AnalyticsPeriod): TradeHistorySummary;
  getRecentActivities(agentId: string, limit: number): TradeActivity[];

  // Events
  onEvent(callback: PortfolioAnalyticsEventCallback): void;
}

// ============================================================================
// Default Trade History Manager Implementation
// ============================================================================

export class DefaultTradeHistoryManager implements TradeHistoryManager {
  private readonly config: PortfolioAnalyticsConfig;
  private readonly dataModel: DefaultPortfolioDataModel;
  private readonly eventCallbacks: PortfolioAnalyticsEventCallback[] = [];

  private tradeCounter = 0;
  private rebalancingCounter = 0;

  constructor(
    config: PortfolioAnalyticsConfig,
    dataModel: DefaultPortfolioDataModel
  ) {
    this.config = config;
    this.dataModel = dataModel;
  }

  onEvent(callback: PortfolioAnalyticsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  recordTrade(
    agentId: string,
    trade: Omit<TradeActivity, 'id' | 'timestamp'>
  ): TradeActivity {
    const activity: TradeActivity = {
      ...trade,
      id: `trade_${++this.tradeCounter}_${Date.now()}`,
      timestamp: new Date(),
    };

    this.dataModel.recordTradeActivity(agentId, activity);

    // Record equity point if value is provided
    if (trade.value !== undefined) {
      const overview = this.dataModel.getPortfolioOverview(agentId);
      if (overview.totalValue > 0) {
        this.dataModel.recordEquityPoint(agentId, {
          timestamp: activity.timestamp,
          value: overview.totalValue,
          pnl: overview.totalPnl,
          pnlPercent: overview.totalPnlPercent,
        });
      }
    }

    return activity;
  }

  recordRebalancing(
    agentId: string,
    reason: string,
    previousAllocations: StrategyAllocation[],
    newAllocations: StrategyAllocation[],
    totalValueBefore: number,
    totalValueAfter: number
  ): RebalancingEvent {
    const event: RebalancingEvent = {
      id: `rebalance_${++this.rebalancingCounter}_${Date.now()}`,
      agentId,
      reason,
      previousAllocations,
      newAllocations,
      executedTrades: [],
      totalValueBefore,
      totalValueAfter,
      timestamp: new Date(),
    };

    this.dataModel.recordRebalancingEvent(agentId, event);

    // Also record as a trade activity
    const activity: TradeActivity = {
      id: `act_rebalance_${Date.now()}`,
      agentId,
      type: 'rebalancing',
      description: `Portfolio rebalancing: ${reason}`,
      value: totalValueAfter,
      metadata: {
        rebalancingEventId: event.id,
        strategyCount: newAllocations.length,
        valueDelta: totalValueAfter - totalValueBefore,
      },
      timestamp: event.timestamp,
    };
    this.dataModel.recordTradeActivity(agentId, activity);

    this.emitEvent({
      type: 'rebalancing_detected',
      agentId,
      severity: 'info',
      message: `Portfolio rebalancing detected: ${reason}`,
      data: {
        rebalancingId: event.id,
        reason,
        totalValueBefore,
        totalValueAfter,
      },
    });

    return event;
  }

  recordAllocationUpdate(
    agentId: string,
    strategyId: string,
    strategyName: string,
    previousPercent: number,
    newPercent: number
  ): TradeActivity {
    const activity: TradeActivity = {
      id: `act_alloc_${++this.tradeCounter}_${Date.now()}`,
      agentId,
      strategyId,
      strategyName,
      type: 'allocation_update',
      description: `Allocation updated for ${strategyName}: ${previousPercent.toFixed(1)}% → ${newPercent.toFixed(1)}%`,
      metadata: {
        previousPercent,
        newPercent,
        delta: newPercent - previousPercent,
      },
      timestamp: new Date(),
    };

    this.dataModel.recordTradeActivity(agentId, activity);

    this.emitEvent({
      type: 'allocation_changed',
      agentId,
      severity: 'info',
      message: activity.description,
      data: { strategyId, strategyName, previousPercent, newPercent },
    });

    return activity;
  }

  getHistory(
    agentId: string,
    filter: TradeHistoryFilter = {}
  ): TradeActivityHistory {
    const period = filter.period ?? 'all_time';
    const base = this.dataModel.getTradeHistory(agentId, period);

    let activities = base.activities;

    // Apply filters
    if (filter.types && filter.types.length > 0) {
      activities = activities.filter(a => filter.types!.includes(a.type));
    }

    if (filter.strategyId) {
      activities = activities.filter(a => a.strategyId === filter.strategyId);
    }

    if (filter.symbol) {
      activities = activities.filter(a => a.symbol === filter.symbol);
    }

    if (filter.minValue !== undefined) {
      activities = activities.filter(a => (a.value ?? 0) >= filter.minValue!);
    }

    if (filter.maxValue !== undefined) {
      activities = activities.filter(a => (a.value ?? 0) <= filter.maxValue!);
    }

    // Sort by timestamp descending (most recent first)
    activities = [...activities].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    // Pagination
    if (filter.offset !== undefined) {
      activities = activities.slice(filter.offset);
    }

    if (filter.limit !== undefined) {
      activities = activities.slice(0, filter.limit);
    }

    const totalTrades = activities.filter(a =>
      a.type === 'trade_executed' ||
      a.type === 'position_opened' ||
      a.type === 'position_closed'
    ).length;

    return {
      agentId,
      period,
      activities,
      rebalancingEvents: base.rebalancingEvents,
      totalTrades,
      totalVolume: activities.reduce((sum, a) => sum + (a.value ?? 0), 0),
      totalFees: activities.reduce((sum, a) => sum + (a.fees ?? 0), 0),
      lastUpdated: new Date(),
    };
  }

  getSummary(agentId: string, period: AnalyticsPeriod): TradeHistorySummary {
    const history = this.dataModel.getTradeHistory(agentId, period);
    const tradeActivities = history.activities.filter(
      a =>
        a.type === 'trade_executed' ||
        a.type === 'position_opened' ||
        a.type === 'position_closed'
    );

    const winningTrades = tradeActivities.filter(a => (a.pnl ?? 0) > 0).length;
    const losingTrades = tradeActivities.filter(a => (a.pnl ?? 0) < 0).length;
    const winRate =
      tradeActivities.length > 0
        ? (winningTrades / tradeActivities.length) * 100
        : 0;

    const totalPnl = tradeActivities.reduce((sum, a) => sum + (a.pnl ?? 0), 0);
    const totalVolume = tradeActivities.reduce((sum, a) => sum + (a.value ?? 0), 0);
    const totalFees = tradeActivities.reduce((sum, a) => sum + (a.fees ?? 0), 0);
    const avgTradeValue = tradeActivities.length > 0 ? totalVolume / tradeActivities.length : 0;

    // Most active strategy
    const strategyActivityCounts = new Map<string, number>();
    for (const activity of history.activities) {
      if (activity.strategyId) {
        strategyActivityCounts.set(
          activity.strategyId,
          (strategyActivityCounts.get(activity.strategyId) ?? 0) + 1
        );
      }
    }

    let mostActiveStrategy: string | undefined;
    let maxCount = 0;
    for (const [id, count] of strategyActivityCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostActiveStrategy = id;
      }
    }

    const sortedActivities = [...history.activities].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    const lastActivityAt = sortedActivities[0]?.timestamp;

    return {
      agentId,
      period,
      totalActivities: history.activities.length,
      totalTrades: tradeActivities.length,
      totalRebalancings: history.rebalancingEvents.length,
      totalVolume,
      totalFees,
      totalPnl,
      winningTrades,
      losingTrades,
      winRate,
      avgTradeValue,
      mostActiveStrategy,
      lastActivityAt,
    };
  }

  getRecentActivities(agentId: string, limit: number): TradeActivity[] {
    const history = this.dataModel.getTradeHistory(agentId, 'all_time');
    return [...history.activities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private emitEvent(
    event: Omit<PortfolioAnalyticsEvent, 'id' | 'timestamp'>
  ): void {
    const fullEvent: PortfolioAnalyticsEvent = {
      id: generateId('evt'),
      timestamp: new Date(),
      ...event,
    };

    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTradeHistoryManager(
  config: PortfolioAnalyticsConfig,
  dataModel: DefaultPortfolioDataModel
): DefaultTradeHistoryManager {
  return new DefaultTradeHistoryManager(config, dataModel);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
