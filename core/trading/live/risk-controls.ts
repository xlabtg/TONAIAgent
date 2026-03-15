/**
 * TONAIAgent - Risk Control Module
 *
 * Safety guardrails for live trading execution. All risk checks happen
 * BEFORE order execution to prevent unsafe trades.
 *
 * Enforced limits:
 *   - Maximum position size (per token/strategy)
 *   - Slippage limits
 *   - Stop-loss triggers
 *   - Exposure limits per strategy
 *   - Daily loss limits
 *   - Velocity limits (max trades per hour)
 */

import {
  RiskProfile,
  RiskLimit,
  RiskViolationType,
  RiskCheckRequest,
  RiskCheckResult,
  RiskViolation,
  RiskWarning,
  PortfolioState,
  ExecutionRequest,
  PriceFeed,
  LiveTradingEvent,
  LiveTradingEventCallback,
  RiskControlDefaults,
} from './types';

// ============================================================================
// Risk Controls Service Interface
// ============================================================================

export interface RiskControlsService {
  setRiskProfile(agentId: string, profile: RiskProfile): void;
  getRiskProfile(agentId: string): RiskProfile | undefined;
  checkExecution(request: RiskCheckRequest): RiskCheckResult;
  recordTrade(agentId: string, value: number, pnl: number): void;
  resetDailyCounters(agentId: string): void;
  triggerStopLoss(agentId: string): void;
  getAgentRiskStatus(agentId: string): AgentRiskStatus;
  onEvent(callback: LiveTradingEventCallback): void;
}

export interface AgentRiskStatus {
  agentId: string;
  profile: RiskProfile | undefined;
  dailyTrades: number;
  dailyLossUSD: number;
  stopLossTriggered: boolean;
  hourlyTradeCount: number;
  tradesLastHour: Date[];
  lastUpdated: Date;
}

// ============================================================================
// Agent Risk State (internal tracking)
// ============================================================================

interface AgentRiskState {
  agentId: string;
  profile: RiskProfile;
  dailyTrades: number;
  dailyLossUSD: number;
  stopLossTriggered: boolean;
  tradesLastHour: Date[];
  lastResetAt: Date;
}

// ============================================================================
// Default Risk Controls Implementation
// ============================================================================

export class DefaultRiskControlsService implements RiskControlsService {
  private readonly profiles = new Map<string, RiskProfile>();
  private readonly agentStates = new Map<string, AgentRiskState>();
  private readonly eventCallbacks: LiveTradingEventCallback[] = [];
  private readonly defaults: RiskControlDefaults;

  constructor(defaults?: Partial<RiskControlDefaults>) {
    this.defaults = {
      maxPositionSizePercent: defaults?.maxPositionSizePercent ?? 20,
      maxStrategyExposurePercent: defaults?.maxStrategyExposurePercent ?? 50,
      maxSlippageTolerance: defaults?.maxSlippageTolerance ?? 1.0,
      maxDailyLossPercent: defaults?.maxDailyLossPercent ?? 5,
      maxTradesPerHour: defaults?.maxTradesPerHour ?? 10,
    };
  }

  onEvent(callback: LiveTradingEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<LiveTradingEvent, 'id' | 'timestamp'>): void {
    const fullEvent: LiveTradingEvent = {
      id: generateId(),
      timestamp: new Date(),
      ...event,
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore errors in callbacks
      }
    }
  }

  setRiskProfile(agentId: string, profile: RiskProfile): void {
    this.profiles.set(agentId, { ...profile });
    this.ensureAgentState(agentId, profile);
  }

  getRiskProfile(agentId: string): RiskProfile | undefined {
    return this.profiles.get(agentId);
  }

  checkExecution(request: RiskCheckRequest): RiskCheckResult {
    const { agentId, executionRequest, currentPortfolio, marketData } = request;

    const profile = this.profiles.get(agentId) ?? this.getDefaultProfile(agentId);
    const state = this.ensureAgentState(agentId, profile);

    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];
    let adjustedQuantity: number | undefined;

    // ---- Check 1: Stop-loss triggered ----
    if (state.stopLossTriggered) {
      violations.push({
        type: 'stop_loss',
        message: 'Stop-loss has been triggered. No new trades allowed until reset.',
        currentValue: state.dailyLossUSD,
        limitValue: 0,
        action: 'block',
      });
    }

    // ---- Check 2: Maximum position size ----
    const tradeValueUSD = executionRequest.quantity * (marketData?.price ?? 0);
    const portfolioValue = currentPortfolio.totalValue;

    if (portfolioValue > 0) {
      const positionSizePercent = (tradeValueUSD / portfolioValue) * 100;

      if (positionSizePercent > profile.maxPositionSizePercent) {
        // Allow but reduce to max position size
        const maxTradeValue = portfolioValue * (profile.maxPositionSizePercent / 100);
        const maxQuantity = marketData?.price ? maxTradeValue / marketData.price : executionRequest.quantity;

        violations.push({
          type: 'max_position_size',
          message: `Position size ${positionSizePercent.toFixed(2)}% exceeds limit of ${profile.maxPositionSizePercent}%. Order reduced.`,
          currentValue: positionSizePercent,
          limitValue: profile.maxPositionSizePercent,
          action: 'reduce',
        });

        adjustedQuantity = maxQuantity;
      } else if (positionSizePercent > profile.maxPositionSizePercent * 0.8) {
        warnings.push({
          type: 'position_size_warning',
          message: `Position size ${positionSizePercent.toFixed(2)}% approaching limit of ${profile.maxPositionSizePercent}%`,
          severity: 'medium',
        });
      }
    }

    // ---- Check 3: Slippage limit ----
    if (executionRequest.slippageTolerance > profile.maxSlippageTolerance) {
      violations.push({
        type: 'slippage_limit',
        message: `Requested slippage ${executionRequest.slippageTolerance}% exceeds limit of ${profile.maxSlippageTolerance}%`,
        currentValue: executionRequest.slippageTolerance,
        limitValue: profile.maxSlippageTolerance,
        action: 'block',
      });
    }

    // ---- Check 4: Daily loss limit ----
    if (portfolioValue > 0) {
      const dailyLossPercent = (state.dailyLossUSD / portfolioValue) * 100;
      const dailyLossLimit = this.getDailyLossLimitValue(profile);

      if (dailyLossLimit > 0 && dailyLossPercent >= dailyLossLimit) {
        violations.push({
          type: 'daily_loss_limit',
          message: `Daily loss ${dailyLossPercent.toFixed(2)}% has reached limit of ${dailyLossLimit}%.`,
          currentValue: dailyLossPercent,
          limitValue: dailyLossLimit,
          action: 'block',
        });
      } else if (dailyLossLimit > 0 && dailyLossPercent > dailyLossLimit * 0.75) {
        warnings.push({
          type: 'daily_loss_warning',
          message: `Daily loss ${dailyLossPercent.toFixed(2)}% approaching limit of ${dailyLossLimit}%`,
          severity: 'high',
        });
      }
    }

    // ---- Check 5: Velocity limit (max trades per hour) ----
    const maxTradesPerHour = this.getMaxTradesPerHour(profile);
    const hourlyTradeCount = this.getHourlyTradeCount(state);

    if (maxTradesPerHour > 0 && hourlyTradeCount >= maxTradesPerHour) {
      violations.push({
        type: 'velocity_limit',
        message: `Trades this hour (${hourlyTradeCount}) has reached limit of ${maxTradesPerHour} per hour.`,
        currentValue: hourlyTradeCount,
        limitValue: maxTradesPerHour,
        action: 'block',
      });
    } else if (maxTradesPerHour > 0 && hourlyTradeCount >= maxTradesPerHour * 0.8) {
      warnings.push({
        type: 'velocity_warning',
        message: `Trade velocity ${hourlyTradeCount}/${maxTradesPerHour} trades/hr approaching limit`,
        severity: 'low',
      });
    }

    // ---- Check 6: Exposure limit ----
    const exposureLimitViolation = this.checkExposureLimit(
      executionRequest,
      currentPortfolio,
      profile
    );
    if (exposureLimitViolation) {
      violations.push(exposureLimitViolation);
    }

    // Determine if execution can proceed
    const blockingViolations = violations.filter(v => v.action === 'block');
    const passed = blockingViolations.length === 0;

    if (!passed) {
      this.emitEvent({
        type: 'risk.violation',
        agentId,
        data: {
          executionId: executionRequest.id,
          violations: violations.map(v => ({ type: v.type, message: v.message })),
        },
        severity: 'warning',
      });
    }

    if (warnings.length > 0) {
      this.emitEvent({
        type: 'risk.warning',
        agentId,
        data: {
          executionId: executionRequest.id,
          warnings: warnings.map(w => ({ type: w.type, message: w.message })),
        },
        severity: 'info',
      });
    }

    return {
      passed,
      violations,
      warnings,
      adjustedQuantity,
    };
  }

  recordTrade(agentId: string, value: number, pnl: number): void {
    const profile = this.profiles.get(agentId) ?? this.getDefaultProfile(agentId);
    const state = this.ensureAgentState(agentId, profile);

    state.dailyTrades++;
    state.tradesLastHour.push(new Date());

    if (pnl < 0) {
      state.dailyLossUSD += Math.abs(pnl);
    }

    // Check if stop-loss should be triggered
    const portfolioValue = value; // Using current value as proxy
    const dailyLossLimit = this.getDailyLossLimitValue(profile);

    if (portfolioValue > 0 && dailyLossLimit > 0) {
      const dailyLossPercent = (state.dailyLossUSD / portfolioValue) * 100;
      if (dailyLossPercent >= dailyLossLimit) {
        this.triggerStopLoss(agentId);
      }
    }
  }

  resetDailyCounters(agentId: string): void {
    const state = this.agentStates.get(agentId);
    if (state) {
      state.dailyTrades = 0;
      state.dailyLossUSD = 0;
      state.stopLossTriggered = false;
      state.tradesLastHour = [];
      state.lastResetAt = new Date();
    }
  }

  triggerStopLoss(agentId: string): void {
    const state = this.agentStates.get(agentId);
    if (state && !state.stopLossTriggered) {
      state.stopLossTriggered = true;

      this.emitEvent({
        type: 'risk.violation',
        agentId,
        data: {
          violationType: 'stop_loss',
          dailyLossUSD: state.dailyLossUSD,
          message: 'Stop-loss triggered. All new trades are blocked.',
        },
        severity: 'critical',
      });
    }
  }

  getAgentRiskStatus(agentId: string): AgentRiskStatus {
    const profile = this.profiles.get(agentId);
    const state = this.agentStates.get(agentId);

    return {
      agentId,
      profile,
      dailyTrades: state?.dailyTrades ?? 0,
      dailyLossUSD: state?.dailyLossUSD ?? 0,
      stopLossTriggered: state?.stopLossTriggered ?? false,
      hourlyTradeCount: state ? this.getHourlyTradeCount(state) : 0,
      tradesLastHour: state?.tradesLastHour ?? [],
      lastUpdated: new Date(),
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private ensureAgentState(agentId: string, profile: RiskProfile): AgentRiskState {
    let state = this.agentStates.get(agentId);
    if (!state) {
      state = {
        agentId,
        profile,
        dailyTrades: 0,
        dailyLossUSD: 0,
        stopLossTriggered: false,
        tradesLastHour: [],
        lastResetAt: new Date(),
      };
      this.agentStates.set(agentId, state);
    }
    return state;
  }

  private getDefaultProfile(agentId: string): RiskProfile {
    return {
      agentId,
      limits: [
        { type: 'max_position_size', enabled: true, value: this.defaults.maxPositionSizePercent, action: 'reduce' },
        { type: 'slippage_limit', enabled: true, value: this.defaults.maxSlippageTolerance, action: 'block' },
        { type: 'daily_loss_limit', enabled: true, value: this.defaults.maxDailyLossPercent, action: 'block' },
        { type: 'velocity_limit', enabled: true, value: this.defaults.maxTradesPerHour, action: 'block' },
      ],
      maxPositionSizePercent: this.defaults.maxPositionSizePercent,
      maxStrategyExposurePercent: this.defaults.maxStrategyExposurePercent,
      maxSlippageTolerance: this.defaults.maxSlippageTolerance,
      maxDailyLossPercent: this.defaults.maxDailyLossPercent,
      maxTradesPerHour: this.defaults.maxTradesPerHour,
      updatedAt: new Date(),
    };
  }

  private getDailyLossLimitValue(profile: RiskProfile): number {
    const limit = profile.limits.find(l => l.type === 'daily_loss_limit');
    return limit?.enabled ? limit.value : profile.maxDailyLossPercent;
  }

  private getMaxTradesPerHour(profile: RiskProfile): number {
    const limit = profile.limits.find(l => l.type === 'velocity_limit');
    return limit?.enabled ? limit.value : profile.maxTradesPerHour;
  }

  private getHourlyTradeCount(state: AgentRiskState): number {
    const oneHourAgo = Date.now() - 3600000;
    return state.tradesLastHour.filter(t => t.getTime() > oneHourAgo).length;
  }

  private checkExposureLimit(
    request: ExecutionRequest,
    portfolio: PortfolioState,
    profile: RiskProfile
  ): RiskViolation | null {
    const exposureLimit = profile.limits.find(l => l.type === 'exposure_limit');
    if (!exposureLimit?.enabled) {
      return null;
    }

    // Check if the strategy already has too much exposure
    if (!request.strategyId || portfolio.totalValue === 0) {
      return null;
    }

    // This is a simplified check; in production, track per-strategy positions
    const maxExposureUSD = portfolio.totalValue * (profile.maxStrategyExposurePercent / 100);
    const openPositionsForStrategy = portfolio.openPositions.filter(
      p => p.agentId === request.agentId
    );
    const currentExposureUSD = openPositionsForStrategy.reduce(
      (sum, pos) => sum + Math.abs(pos.quantity * pos.currentPrice),
      0
    );

    if (currentExposureUSD >= maxExposureUSD) {
      return {
        type: 'exposure_limit',
        message: `Strategy exposure $${currentExposureUSD.toFixed(2)} has reached limit of $${maxExposureUSD.toFixed(2)}`,
        currentValue: currentExposureUSD,
        limitValue: maxExposureUSD,
        action: 'block',
      };
    }

    return null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRiskControlsService(
  defaults?: Partial<RiskControlDefaults>
): DefaultRiskControlsService {
  return new DefaultRiskControlsService(defaults);
}

// ============================================================================
// Risk Profile Builder
// ============================================================================

export function buildRiskProfile(
  agentId: string,
  options: {
    maxPositionSizePercent?: number;
    maxStrategyExposurePercent?: number;
    maxSlippageTolerance?: number;
    maxDailyLossPercent?: number;
    maxTradesPerHour?: number;
    limits?: Partial<RiskLimit>[];
  }
): RiskProfile {
  const defaults = {
    maxPositionSizePercent: 20,
    maxStrategyExposurePercent: 50,
    maxSlippageTolerance: 1.0,
    maxDailyLossPercent: 5,
    maxTradesPerHour: 10,
  };

  const merged = { ...defaults, ...options };

  const limits: RiskLimit[] = [
    { type: 'max_position_size', enabled: true, value: merged.maxPositionSizePercent, action: 'reduce' },
    { type: 'slippage_limit', enabled: true, value: merged.maxSlippageTolerance, action: 'block' },
    { type: 'daily_loss_limit', enabled: true, value: merged.maxDailyLossPercent, action: 'block' },
    { type: 'velocity_limit', enabled: true, value: merged.maxTradesPerHour, action: 'block' },
    { type: 'exposure_limit', enabled: true, value: merged.maxStrategyExposurePercent, action: 'block' },
    ...(options.limits ?? []).map(l => ({
      type: 'stop_loss' as RiskViolationType,
      enabled: true,
      value: 0,
      action: 'block' as const,
      ...l,
    })),
  ];

  return {
    agentId,
    limits,
    maxPositionSizePercent: merged.maxPositionSizePercent,
    maxStrategyExposurePercent: merged.maxStrategyExposurePercent,
    maxSlippageTolerance: merged.maxSlippageTolerance,
    maxDailyLossPercent: merged.maxDailyLossPercent,
    maxTradesPerHour: merged.maxTradesPerHour,
    updatedAt: new Date(),
  };
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
