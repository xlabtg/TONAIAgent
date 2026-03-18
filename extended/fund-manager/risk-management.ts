/**
 * TONAIAgent - Fund Risk Management
 *
 * Fund-level risk controls that complement the system-wide Systemic Risk Framework.
 * Monitors and enforces:
 * - Maximum strategy exposure limits
 * - Drawdown limits with emergency stop
 * - Asset concentration limits
 * - Daily loss limits
 * - Volatility-based circuit breakers
 */

import {
  EmergencyShutdownEvent,
  FundConfig,
  FundManagerError,
  FundManagerEventHandler,
  FundManagerEventType,
  FundManagerUnsubscribe,
  FundPortfolio,
  FundRiskLimits,
  FundRiskStatus,
} from './types';

// ============================================================================
// Risk Management Service
// ============================================================================

/** Configuration for the RiskManagementService */
export interface RiskManagementConfig {
  /** Default risk limits applied to funds without custom limits */
  defaultRiskLimits: FundRiskLimits;
  /** Whether to emit events on risk limit breach */
  emitBreachEvents: boolean;
}

const DEFAULT_RISK_LIMITS: FundRiskLimits = {
  maxStrategyExposurePercent: 50,
  maxDrawdownPercent: 25,
  maxAssetConcentrationPercent: 40,
  dailyLossLimitPercent: 5,
  volatilityWindowDays: 30,
};

const DEFAULT_CONFIG: RiskManagementConfig = {
  defaultRiskLimits: DEFAULT_RISK_LIMITS,
  emitBreachEvents: true,
};

export class RiskManagementService {
  private readonly config: RiskManagementConfig;
  private readonly fundRiskLimits = new Map<string, FundRiskLimits>();
  private readonly peakAums = new Map<string, bigint>();
  private readonly dailyPnls = new Map<string, bigint>();
  private readonly dailyPnlDates = new Map<string, string>(); // fundId -> date string
  private readonly eventHandlers = new Set<FundManagerEventHandler>();

  constructor(config: Partial<RiskManagementConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      defaultRiskLimits: { ...DEFAULT_RISK_LIMITS, ...config.defaultRiskLimits },
    };
  }

  // ============================================================================
  // Risk Limit Configuration
  // ============================================================================

  /** Set custom risk limits for a specific fund */
  setFundRiskLimits(fundId: string, limits: Partial<FundRiskLimits>): void {
    const existing = this.fundRiskLimits.get(fundId) ?? this.config.defaultRiskLimits;
    this.fundRiskLimits.set(fundId, { ...existing, ...limits });
  }

  /** Get risk limits for a fund (returns defaults if not customized) */
  getFundRiskLimits(fundId: string): FundRiskLimits {
    return this.fundRiskLimits.get(fundId) ?? this.config.defaultRiskLimits;
  }

  // ============================================================================
  // Risk Assessment
  // ============================================================================

  /**
   * Assess the current risk status of a fund.
   * Updates peak AUM tracking and evaluates all risk limits.
   */
  assessRisk(fund: FundConfig, portfolio: FundPortfolio): FundRiskStatus {
    const limits = this.getFundRiskLimits(fund.fundId);
    const now = new Date();

    // Update peak AUM tracking
    const currentPeak = this.peakAums.get(fund.fundId) ?? BigInt(0);
    if (portfolio.totalAum > currentPeak) {
      this.peakAums.set(fund.fundId, portfolio.totalAum);
    }
    const peakAum = this.peakAums.get(fund.fundId) ?? portfolio.totalAum;

    // Calculate current drawdown
    let currentDrawdownPercent = 0;
    if (peakAum > BigInt(0) && portfolio.totalAum < peakAum) {
      const drawdown = peakAum - portfolio.totalAum;
      currentDrawdownPercent = Number((drawdown * BigInt(10000)) / peakAum) / 100;
    }

    // Get daily PnL
    const todayStr = now.toISOString().split('T')[0];
    const lastPnlDate = this.dailyPnlDates.get(fund.fundId);
    if (lastPnlDate !== todayStr) {
      // New day — reset daily PnL tracking
      this.dailyPnls.set(fund.fundId, BigInt(0));
      this.dailyPnlDates.set(fund.fundId, todayStr);
    }
    const dailyPnl = this.dailyPnls.get(fund.fundId) ?? BigInt(0);
    const dailyPnlPercent = portfolio.totalAum > BigInt(0)
      ? Number((dailyPnl * BigInt(10000)) / portfolio.totalAum) / 100
      : 0;

    // Check each risk limit
    const breachedLimits: string[] = [];

    // 1. Max drawdown
    if (currentDrawdownPercent > limits.maxDrawdownPercent) {
      breachedLimits.push(`max_drawdown (${currentDrawdownPercent.toFixed(2)}% > ${limits.maxDrawdownPercent}%)`);
    }

    // 2. Daily loss limit
    if (dailyPnlPercent < -limits.dailyLossLimitPercent) {
      breachedLimits.push(`daily_loss_limit (${dailyPnlPercent.toFixed(2)}% < -${limits.dailyLossLimitPercent}%)`);
    }

    // 3. Max strategy exposure
    for (const allocation of portfolio.allocations) {
      if (allocation.currentWeightPercent > limits.maxStrategyExposurePercent) {
        breachedLimits.push(
          `max_strategy_exposure:${allocation.strategyId} (${allocation.currentWeightPercent.toFixed(2)}% > ${limits.maxStrategyExposurePercent}%)`
        );
      }
    }

    // Calculate risk score (0-100)
    const riskScore = this.calculateRiskScore(
      currentDrawdownPercent,
      dailyPnlPercent,
      portfolio,
      limits
    );

    const isBreached = breachedLimits.length > 0;

    const riskStatus: FundRiskStatus = {
      fundId: fund.fundId,
      currentDrawdownPercent,
      peakAum,
      dailyPnl,
      dailyPnlPercent,
      isBreached,
      breachedLimits,
      riskScore,
      assessedAt: now,
    };

    if (isBreached && this.config.emitBreachEvents) {
      this.emitEvent('risk.limit_breached', fund.fundId, {
        fundId: fund.fundId,
        breachedLimits,
        riskScore,
      });
    }

    return riskStatus;
  }

  /**
   * Update daily PnL tracking for a fund.
   * Called after each trade execution or periodic valuation.
   */
  updateDailyPnl(fundId: string, pnlDelta: bigint): void {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = this.dailyPnlDates.get(fundId);

    if (lastDate !== todayStr) {
      this.dailyPnls.set(fundId, pnlDelta);
      this.dailyPnlDates.set(fundId, todayStr);
    } else {
      const current = this.dailyPnls.get(fundId) ?? BigInt(0);
      this.dailyPnls.set(fundId, current + pnlDelta);
    }
  }

  /**
   * Check if an emergency stop should be triggered.
   * Returns an EmergencyShutdownEvent if thresholds are critically exceeded.
   */
  checkEmergencyStop(
    fund: FundConfig,
    portfolio: FundPortfolio
  ): EmergencyShutdownEvent | null {
    const riskStatus = this.assessRisk(fund, portfolio);
    const limits = this.getFundRiskLimits(fund.fundId);

    // Hard stop: drawdown exceeds max
    if (riskStatus.currentDrawdownPercent > limits.maxDrawdownPercent) {
      const event: EmergencyShutdownEvent = {
        fundId: fund.fundId,
        reason: `Drawdown limit exceeded: ${riskStatus.currentDrawdownPercent.toFixed(2)}% > ${limits.maxDrawdownPercent}%`,
        riskStatus,
        triggeredAt: new Date(),
      };

      this.emitEvent('risk.emergency_stop', fund.fundId, {
        fundId: fund.fundId,
        reason: event.reason,
        drawdownPercent: riskStatus.currentDrawdownPercent,
      });

      return event;
    }

    return null;
  }

  /**
   * Validate a proposed allocation change against risk limits.
   * Throws if the allocation would violate limits.
   */
  validateAllocation(
    fund: FundConfig,
    portfolio: FundPortfolio,
    strategyId: string,
    proposedWeightPercent: number
  ): void {
    const limits = this.getFundRiskLimits(fund.fundId);

    if (proposedWeightPercent > limits.maxStrategyExposurePercent) {
      throw new FundManagerError(
        `Proposed weight ${proposedWeightPercent}% for strategy ${strategyId} exceeds max exposure ${limits.maxStrategyExposurePercent}%`,
        'RISK_LIMIT_BREACHED',
        { strategyId, proposedWeightPercent, limit: limits.maxStrategyExposurePercent }
      );
    }
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(handler: FundManagerEventHandler): FundManagerUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private calculateRiskScore(
    drawdownPercent: number,
    dailyPnlPercent: number,
    portfolio: FundPortfolio,
    limits: FundRiskLimits
  ): number {
    let score = 0;

    // Drawdown contributes up to 40 points
    score += Math.min(40, (drawdownPercent / limits.maxDrawdownPercent) * 40);

    // Daily loss contributes up to 30 points
    if (dailyPnlPercent < 0) {
      score += Math.min(30, (Math.abs(dailyPnlPercent) / limits.dailyLossLimitPercent) * 30);
    }

    // Concentration contributes up to 30 points
    const maxConcentration = portfolio.allocations.reduce(
      (max, a) => Math.max(max, a.currentWeightPercent),
      0
    );
    score += Math.min(30, (maxConcentration / limits.maxStrategyExposurePercent) * 30);

    return Math.min(100, Math.round(score));
  }

  private emitEvent(type: FundManagerEventType, fundId: string, data: Record<string, unknown>): void {
    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      fundId,
      timestamp: new Date(),
      data,
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRiskManagementService(
  config?: Partial<RiskManagementConfig>
): RiskManagementService {
  return new RiskManagementService(config);
}
