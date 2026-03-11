/**
 * TONAIAgent - Portfolio Analytics Data Model
 *
 * Manages the aggregation and storage of portfolio analytics data,
 * consolidating data from portfolio state, strategy performance,
 * trade history, and risk metrics.
 */

import {
  PortfolioOverview,
  AllocationBreakdown,
  AllocationTimelinePoint,
  StrategyAllocation,
  TradeActivity,
  TradeActivityHistory,
  RebalancingEvent,
  EquityCurvePoint,
  DailyReturn,
  AnalyticsPeriod,
  PortfolioAnalyticsConfig,
  PortfolioAnalyticsEvent,
  PortfolioAnalyticsEventCallback,
} from './types';

// ============================================================================
// Portfolio Data Model Interface
// ============================================================================

export interface PortfolioDataModel {
  // Portfolio overview
  getPortfolioOverview(agentId: string): PortfolioOverview;
  updatePortfolioValue(agentId: string, totalValue: number, pnl: number): void;
  updateDayChange(agentId: string, dayChange: number, dayChangePercent: number): void;

  // Strategy allocations
  updateStrategyAllocation(agentId: string, allocation: StrategyAllocation): void;
  removeStrategyAllocation(agentId: string, strategyId: string): void;
  getAllocationBreakdown(agentId: string): AllocationBreakdown;
  recordAllocationSnapshot(agentId: string): void;

  // Trade activity
  recordTradeActivity(agentId: string, activity: TradeActivity): void;
  recordRebalancingEvent(agentId: string, event: RebalancingEvent): void;
  getTradeHistory(agentId: string, period: AnalyticsPeriod): TradeActivityHistory;

  // Equity curve data
  recordEquityPoint(agentId: string, point: EquityCurvePoint): void;
  getEquityCurve(agentId: string, period: AnalyticsPeriod): EquityCurvePoint[];
  getDailyReturns(agentId: string, period: AnalyticsPeriod): DailyReturn[];

  // Events
  onEvent(callback: PortfolioAnalyticsEventCallback): void;
}

// ============================================================================
// Portfolio Data Model Configuration
// ============================================================================

export interface PortfolioDataModelConfig {
  maxEquityPoints: number;
  maxTradeHistory: number;
  maxAllocationTimelinePoints: number;
  maxRebalancingEvents: number;
}

const DEFAULT_DATA_MODEL_CONFIG: PortfolioDataModelConfig = {
  maxEquityPoints: 1000,
  maxTradeHistory: 500,
  maxAllocationTimelinePoints: 365,
  maxRebalancingEvents: 100,
};

// ============================================================================
// Default Portfolio Data Model Implementation
// ============================================================================

export class DefaultPortfolioDataModel implements PortfolioDataModel {
  private readonly config: PortfolioDataModelConfig;
  private readonly analyticsConfig: PortfolioAnalyticsConfig;
  private readonly eventCallbacks: PortfolioAnalyticsEventCallback[] = [];

  // Per-agent storage
  private readonly overviews = new Map<string, PortfolioOverview>();
  private readonly allocations = new Map<string, Map<string, StrategyAllocation>>();
  private readonly allocationTimelines = new Map<string, AllocationTimelinePoint[]>();
  private readonly equityCurves = new Map<string, EquityCurvePoint[]>();
  private readonly tradeActivities = new Map<string, TradeActivity[]>();
  private readonly rebalancingEvents = new Map<string, RebalancingEvent[]>();

  constructor(
    analyticsConfig: PortfolioAnalyticsConfig,
    config: Partial<PortfolioDataModelConfig> = {}
  ) {
    this.analyticsConfig = analyticsConfig;
    this.config = { ...DEFAULT_DATA_MODEL_CONFIG, ...config };
  }

  onEvent(callback: PortfolioAnalyticsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Portfolio Overview Methods
  // ============================================================================

  getPortfolioOverview(agentId: string): PortfolioOverview {
    return this.ensurePortfolioOverview(agentId);
  }

  updatePortfolioValue(agentId: string, totalValue: number, totalPnl: number): void {
    const overview = this.ensurePortfolioOverview(agentId);
    const previousValue = overview.totalValue;

    overview.totalValue = totalValue;
    overview.totalPnl = totalPnl;
    overview.totalPnlPercent = overview.totalCost > 0
      ? (totalPnl / overview.totalCost) * 100
      : 0;
    overview.lastUpdated = new Date();

    if (this.analyticsConfig.emitOnUpdate && previousValue !== totalValue) {
      this.emitEvent({
        type: 'metrics_updated',
        agentId,
        severity: 'info',
        message: `Portfolio value updated: ${totalValue}`,
        data: { totalValue, totalPnl, previousValue },
      });
    }
  }

  updateDayChange(agentId: string, dayChange: number, dayChangePercent: number): void {
    const overview = this.ensurePortfolioOverview(agentId);
    overview.dayChange = dayChange;
    overview.dayChangePercent = dayChangePercent;
    overview.lastUpdated = new Date();
  }

  // ============================================================================
  // Strategy Allocation Methods
  // ============================================================================

  updateStrategyAllocation(agentId: string, allocation: StrategyAllocation): void {
    let agentAllocations = this.allocations.get(agentId);
    if (!agentAllocations) {
      agentAllocations = new Map<string, StrategyAllocation>();
      this.allocations.set(agentId, agentAllocations);
    }

    const existed = agentAllocations.has(allocation.strategyId);
    agentAllocations.set(allocation.strategyId, allocation);

    // Update overview strategy count
    const overview = this.ensurePortfolioOverview(agentId);
    overview.strategyCount = agentAllocations.size;

    if (this.analyticsConfig.emitOnUpdate) {
      this.emitEvent({
        type: 'allocation_changed',
        agentId,
        severity: 'info',
        message: existed
          ? `Strategy allocation updated: ${allocation.strategyName}`
          : `New strategy allocation: ${allocation.strategyName}`,
        data: { strategyId: allocation.strategyId, allocation },
      });
    }
  }

  removeStrategyAllocation(agentId: string, strategyId: string): void {
    const agentAllocations = this.allocations.get(agentId);
    if (agentAllocations) {
      agentAllocations.delete(strategyId);

      const overview = this.ensurePortfolioOverview(agentId);
      overview.strategyCount = agentAllocations.size;
    }
  }

  getAllocationBreakdown(agentId: string): AllocationBreakdown {
    const agentAllocations = this.allocations.get(agentId);
    const strategies = agentAllocations ? Array.from(agentAllocations.values()) : [];

    const totalAllocated = strategies.reduce((sum, s) => sum + s.allocatedCapital, 0);
    const overview = this.ensurePortfolioOverview(agentId);
    const cashReserve = Math.max(0, overview.totalValue - totalAllocated);

    const timeline = this.allocationTimelines.get(agentId) ?? [];

    return {
      agentId,
      totalAllocated,
      cashReserve,
      strategies,
      timeline,
      lastUpdated: new Date(),
    };
  }

  recordAllocationSnapshot(agentId: string): void {
    const breakdown = this.getAllocationBreakdown(agentId);
    const point: AllocationTimelinePoint = {
      timestamp: new Date(),
      allocations: breakdown.strategies.map(s => ({
        strategyId: s.strategyId,
        strategyName: s.strategyName,
        percent: s.allocatedPercent,
        value: s.currentValue,
      })),
    };

    let timeline = this.allocationTimelines.get(agentId);
    if (!timeline) {
      timeline = [];
      this.allocationTimelines.set(agentId, timeline);
    }

    timeline.push(point);

    // Trim to max points
    if (timeline.length > this.config.maxAllocationTimelinePoints) {
      timeline.splice(0, timeline.length - this.config.maxAllocationTimelinePoints);
    }
  }

  // ============================================================================
  // Trade Activity Methods
  // ============================================================================

  recordTradeActivity(agentId: string, activity: TradeActivity): void {
    let activities = this.tradeActivities.get(agentId);
    if (!activities) {
      activities = [];
      this.tradeActivities.set(agentId, activities);
    }

    activities.push(activity);

    // Trim to max history
    if (activities.length > this.config.maxTradeHistory) {
      activities.splice(0, activities.length - this.config.maxTradeHistory);
    }

    if (this.analyticsConfig.emitOnUpdate) {
      this.emitEvent({
        type: 'metrics_updated',
        agentId,
        severity: 'info',
        message: `Trade activity recorded: ${activity.type}`,
        data: { activityId: activity.id, type: activity.type },
      });
    }
  }

  recordRebalancingEvent(agentId: string, event: RebalancingEvent): void {
    let events = this.rebalancingEvents.get(agentId);
    if (!events) {
      events = [];
      this.rebalancingEvents.set(agentId, events);
    }

    events.push(event);

    // Trim to max events
    if (events.length > this.config.maxRebalancingEvents) {
      events.splice(0, events.length - this.config.maxRebalancingEvents);
    }

    this.emitEvent({
      type: 'rebalancing_detected',
      agentId,
      severity: 'info',
      message: `Rebalancing event recorded: ${event.reason}`,
      data: { eventId: event.id, reason: event.reason },
    });
  }

  getTradeHistory(agentId: string, period: AnalyticsPeriod): TradeActivityHistory {
    const allActivities = this.tradeActivities.get(agentId) ?? [];
    const allRebalancings = this.rebalancingEvents.get(agentId) ?? [];

    const cutoff = this.getPeriodCutoff(period);
    const activities = cutoff
      ? allActivities.filter(a => a.timestamp >= cutoff)
      : allActivities;
    const rebalancingEvents = cutoff
      ? allRebalancings.filter(e => e.timestamp >= cutoff)
      : allRebalancings;

    const totalTrades = activities.filter(a =>
      a.type === 'trade_executed' || a.type === 'position_opened' || a.type === 'position_closed'
    ).length;

    const totalVolume = activities.reduce((sum, a) => sum + (a.value ?? 0), 0);
    const totalFees = activities.reduce((sum, a) => sum + (a.fees ?? 0), 0);

    return {
      agentId,
      period,
      activities,
      rebalancingEvents,
      totalTrades,
      totalVolume,
      totalFees,
      lastUpdated: new Date(),
    };
  }

  // ============================================================================
  // Equity Curve Methods
  // ============================================================================

  recordEquityPoint(agentId: string, point: EquityCurvePoint): void {
    let curve = this.equityCurves.get(agentId);
    if (!curve) {
      curve = [];
      this.equityCurves.set(agentId, curve);
    }

    curve.push(point);

    // Trim to max points
    if (curve.length > this.config.maxEquityPoints) {
      curve.splice(0, curve.length - this.config.maxEquityPoints);
    }
  }

  getEquityCurve(agentId: string, period: AnalyticsPeriod): EquityCurvePoint[] {
    const curve = this.equityCurves.get(agentId) ?? [];
    const cutoff = this.getPeriodCutoff(period);
    return cutoff ? curve.filter(p => p.timestamp >= cutoff) : curve;
  }

  getDailyReturns(agentId: string, period: AnalyticsPeriod): DailyReturn[] {
    const curve = this.getEquityCurve(agentId, period);
    if (curve.length < 2) return [];

    const dailyReturns: DailyReturn[] = [];
    const activities = this.tradeActivities.get(agentId) ?? [];

    for (let i = 1; i < curve.length; i++) {
      const prev = curve[i - 1]!;
      const curr = curve[i]!;

      const dayReturn = prev.value > 0
        ? ((curr.value - prev.value) / prev.value) * 100
        : 0;
      const absoluteReturn = curr.value - prev.value;

      // Count trades on this day
      const dayStart = new Date(curr.timestamp);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const tradeCount = activities.filter(a =>
        a.timestamp >= dayStart &&
        a.timestamp < dayEnd &&
        (a.type === 'trade_executed' || a.type === 'position_opened' || a.type === 'position_closed')
      ).length;

      dailyReturns.push({
        date: curr.timestamp,
        return: dayReturn,
        absoluteReturn,
        tradeCount,
      });
    }

    return dailyReturns;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private ensurePortfolioOverview(agentId: string): PortfolioOverview {
    let overview = this.overviews.get(agentId);
    if (!overview) {
      overview = {
        agentId,
        portfolioId: `portfolio_${agentId}`,
        totalValue: 0,
        totalCost: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        totalFeesPaid: 0,
        dayChange: 0,
        dayChangePercent: 0,
        openPositionCount: 0,
        strategyCount: 0,
        capitalUtilization: 0,
        lastUpdated: new Date(),
      };
      this.overviews.set(agentId, overview);
    }
    return overview;
  }

  private getPeriodCutoff(period: AnalyticsPeriod): Date | null {
    const now = new Date();
    const periodDays: Record<AnalyticsPeriod, number | null> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365,
      'all_time': null,
      'custom': null,
    };

    const days = periodDays[period];
    if (days === null) return null;

    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

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

export function createPortfolioDataModel(
  analyticsConfig: PortfolioAnalyticsConfig,
  config?: Partial<PortfolioDataModelConfig>
): DefaultPortfolioDataModel {
  return new DefaultPortfolioDataModel(analyticsConfig, config);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
