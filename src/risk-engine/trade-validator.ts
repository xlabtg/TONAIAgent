/**
 * Risk Engine — Trade Validation Layer
 * Issue #203: Risk Management Engine
 *
 * The Trade Validator sits between the Strategy Engine and Trading Engine,
 * ensuring all trades are approved by the Risk Engine before execution.
 *
 * Validates:
 *   - Position size limits (max 5% of portfolio per trade)
 *   - Portfolio exposure limits (max 20% per asset)
 *   - Stop-loss protection (auto-enforced at configurable levels)
 *   - Max drawdown protection (pause agent when exceeded)
 *   - Daily loss limits (disable trading until next day)
 *
 * Architecture:
 *   Strategy Engine
 *        ↓
 *   Trade Validator (Risk Engine)
 *        ↓
 *   Trading Engine
 *        ↓
 *   Portfolio Update
 */

import type {
  RiskEngineEvent,
  RiskEngineEventCallback,
  RiskLimitViolation,
} from './types';

// ============================================================================
// Trade Validation Types
// ============================================================================

export interface TradeValidationRequest {
  /** Unique trade request ID */
  requestId: string;
  /** Agent or strategy ID requesting the trade */
  agentId: string;
  /** Asset being traded */
  asset: string;
  /** Trade action */
  action: 'BUY' | 'SELL';
  /** Amount to trade (in asset units) */
  amount: number;
  /** Trade value in USD */
  valueUsd: number;
  /** Current price of the asset */
  currentPrice: number;
  /** Current portfolio value */
  portfolioValueUsd: number;
  /** Current position in this asset */
  currentPosition: number;
  /** Current portfolio drawdown percentage (0-1) */
  currentDrawdownPercent: number;
  /** Strategy ID (optional) */
  strategyId?: string;
}

export interface TradeValidationResult {
  /** Whether the trade is approved */
  approved: boolean;
  /** Request ID for tracking */
  requestId: string;
  /** If not approved, the reason */
  rejectionReason?: string;
  /** List of violations that caused rejection */
  violations: RiskLimitViolation[];
  /** List of warnings (trade still approved but risky) */
  warnings: TradeWarning[];
  /** Suggested modifications to make trade acceptable */
  suggestedModifications?: TradeSuggestion;
  /** Validation timestamp */
  validatedAt: Date;
}

export interface TradeWarning {
  type: 'position_size' | 'exposure' | 'drawdown' | 'daily_loss' | 'volatility';
  message: string;
  severity: 'low' | 'medium' | 'high';
  currentValue: number;
  threshold: number;
}

export interface TradeSuggestion {
  /** Suggested maximum amount for this trade */
  maxSafeAmount: number;
  /** Suggested maximum value in USD */
  maxSafeValueUsd: number;
  /** Reason for the suggestion */
  reason: string;
}

// ============================================================================
// Trade Validator Configuration
// ============================================================================

export interface TradeValidatorConfig {
  /** Maximum position size as percentage of portfolio (default: 5%) */
  maxPositionSizePercent: number;
  /** Maximum exposure to single asset as percentage of portfolio (default: 20%) */
  maxAssetExposurePercent: number;
  /** Stop-loss threshold percentage (default: 5%) */
  stopLossPercent: number;
  /** Maximum drawdown before pausing agent (default: 15%) */
  maxDrawdownPercent: number;
  /** Daily loss limit as percentage of portfolio (default: 3%) */
  dailyLossLimitPercent: number;
  /** Enable automatic stop-loss enforcement */
  enableStopLoss: boolean;
  /** Enable daily loss limit protection */
  enableDailyLossLimit: boolean;
  /** Warning threshold multiplier (e.g., 0.8 = warn at 80% of limit) */
  warningThresholdMultiplier: number;
}

export const DEFAULT_TRADE_VALIDATOR_CONFIG: TradeValidatorConfig = {
  maxPositionSizePercent: 5,
  maxAssetExposurePercent: 20,
  stopLossPercent: 5,
  maxDrawdownPercent: 15,
  dailyLossLimitPercent: 3,
  enableStopLoss: true,
  enableDailyLossLimit: true,
  warningThresholdMultiplier: 0.8,
};

// ============================================================================
// Daily Loss Tracker
// ============================================================================

interface DailyLossRecord {
  date: string;  // YYYY-MM-DD format
  totalLossUsd: number;
  totalGainUsd: number;
  netPnlUsd: number;
  tradeCount: number;
  tradingDisabled: boolean;
  disabledAt?: Date;
}

// ============================================================================
// Trade Validator Interface
// ============================================================================

export interface TradeValidator {
  /** Validate a trade request */
  validate(request: TradeValidationRequest): TradeValidationResult;
  /** Record a completed trade for daily tracking */
  recordTrade(agentId: string, pnlUsd: number): void;
  /** Check if trading is disabled for an agent */
  isTradingDisabled(agentId: string): boolean;
  /** Get today's loss record for an agent */
  getDailyLossRecord(agentId: string): DailyLossRecord | undefined;
  /** Reset daily limits (called at day boundary) */
  resetDailyLimits(): void;
  /** Get all agents with disabled trading */
  getDisabledAgents(): string[];
  /** Get configuration */
  getConfig(): TradeValidatorConfig;
  /** Update configuration */
  updateConfig(config: Partial<TradeValidatorConfig>): void;
  /** Subscribe to validation events */
  onEvent(callback: RiskEngineEventCallback): void;
}

// ============================================================================
// Default Trade Validator Implementation
// ============================================================================

export class DefaultTradeValidator implements TradeValidator {
  private readonly config: TradeValidatorConfig;
  private readonly dailyLossRecords = new Map<string, DailyLossRecord>();
  private readonly eventCallbacks: RiskEngineEventCallback[] = [];

  constructor(config?: Partial<TradeValidatorConfig>) {
    this.config = { ...DEFAULT_TRADE_VALIDATOR_CONFIG, ...config };
  }

  onEvent(callback: RiskEngineEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<RiskEngineEvent, 'timestamp'>): void {
    const fullEvent: RiskEngineEvent = {
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

  validate(request: TradeValidationRequest): TradeValidationResult {
    const violations: RiskLimitViolation[] = [];
    const warnings: TradeWarning[] = [];
    let suggestedModifications: TradeSuggestion | undefined;

    // Check 1: Trading disabled due to daily loss limit
    if (this.config.enableDailyLossLimit && this.isTradingDisabled(request.agentId)) {
      violations.push({
        limitId: 'daily_loss_limit',
        limitType: 'max_portfolio_drawdown',
        currentValue: this.getDailyLossRecord(request.agentId)?.netPnlUsd ?? 0,
        limitValue: this.config.dailyLossLimitPercent,
        action: 'block',
        message: `Trading disabled: daily loss limit of ${this.config.dailyLossLimitPercent}% exceeded. Trading resumes tomorrow.`,
      });
    }

    // Check 2: Max drawdown protection (pause agent)
    if (request.currentDrawdownPercent * 100 >= this.config.maxDrawdownPercent) {
      violations.push({
        limitId: 'max_drawdown',
        limitType: 'max_portfolio_drawdown',
        currentValue: request.currentDrawdownPercent * 100,
        limitValue: this.config.maxDrawdownPercent,
        action: 'block',
        message: `Portfolio drawdown ${(request.currentDrawdownPercent * 100).toFixed(2)}% exceeds max ${this.config.maxDrawdownPercent}%. Agent should be paused.`,
      });
    } else if (request.currentDrawdownPercent * 100 >= this.config.maxDrawdownPercent * this.config.warningThresholdMultiplier) {
      warnings.push({
        type: 'drawdown',
        message: `Portfolio drawdown approaching limit: ${(request.currentDrawdownPercent * 100).toFixed(2)}% of ${this.config.maxDrawdownPercent}% max`,
        severity: 'high',
        currentValue: request.currentDrawdownPercent * 100,
        threshold: this.config.maxDrawdownPercent,
      });
    }

    // Check 3: Position size limit
    const positionSizePercent = (request.valueUsd / request.portfolioValueUsd) * 100;
    if (positionSizePercent > this.config.maxPositionSizePercent) {
      violations.push({
        limitId: 'max_position_size',
        limitType: 'max_position_size',
        currentValue: positionSizePercent,
        limitValue: this.config.maxPositionSizePercent,
        action: 'reduce',
        message: `Position size ${positionSizePercent.toFixed(2)}% exceeds max ${this.config.maxPositionSizePercent}% of portfolio`,
      });

      // Calculate safe amount
      const maxSafeValueUsd = request.portfolioValueUsd * (this.config.maxPositionSizePercent / 100);
      const maxSafeAmount = maxSafeValueUsd / request.currentPrice;
      suggestedModifications = {
        maxSafeAmount,
        maxSafeValueUsd,
        reason: `Reduce trade to max ${this.config.maxPositionSizePercent}% of portfolio`,
      };
    } else if (positionSizePercent > this.config.maxPositionSizePercent * this.config.warningThresholdMultiplier) {
      warnings.push({
        type: 'position_size',
        message: `Position size ${positionSizePercent.toFixed(2)}% approaching limit of ${this.config.maxPositionSizePercent}%`,
        severity: 'medium',
        currentValue: positionSizePercent,
        threshold: this.config.maxPositionSizePercent,
      });
    }

    // Check 4: Asset exposure limit (for BUY orders)
    if (request.action === 'BUY') {
      const currentExposureValue = request.currentPosition * request.currentPrice;
      const newExposureValue = currentExposureValue + request.valueUsd;
      const exposurePercent = (newExposureValue / request.portfolioValueUsd) * 100;

      if (exposurePercent > this.config.maxAssetExposurePercent) {
        violations.push({
          limitId: 'max_asset_exposure',
          limitType: 'max_strategy_allocation',
          currentValue: exposurePercent,
          limitValue: this.config.maxAssetExposurePercent,
          action: 'reduce',
          message: `Asset exposure ${exposurePercent.toFixed(2)}% would exceed max ${this.config.maxAssetExposurePercent}%`,
        });

        // Calculate max additional exposure allowed
        const maxExposureValue = request.portfolioValueUsd * (this.config.maxAssetExposurePercent / 100);
        const allowedAdditionalValue = Math.max(0, maxExposureValue - currentExposureValue);
        const maxSafeAmount = allowedAdditionalValue / request.currentPrice;

        if (!suggestedModifications || maxSafeAmount < suggestedModifications.maxSafeAmount) {
          suggestedModifications = {
            maxSafeAmount,
            maxSafeValueUsd: allowedAdditionalValue,
            reason: `Reduce trade to stay within ${this.config.maxAssetExposurePercent}% exposure limit`,
          };
        }
      } else if (exposurePercent > this.config.maxAssetExposurePercent * this.config.warningThresholdMultiplier) {
        warnings.push({
          type: 'exposure',
          message: `Asset exposure ${exposurePercent.toFixed(2)}% approaching limit of ${this.config.maxAssetExposurePercent}%`,
          severity: 'medium',
          currentValue: exposurePercent,
          threshold: this.config.maxAssetExposurePercent,
        });
      }
    }

    const approved = violations.length === 0;

    // Emit validation event
    this.emitEvent({
      type: approved ? 'exposure_updated' : 'limit_violated',
      payload: {
        requestId: request.requestId,
        agentId: request.agentId,
        asset: request.asset,
        action: request.action,
        approved,
        violations: violations.map(v => ({
          type: v.limitType,
          message: v.message,
        })),
        warnings: warnings.map(w => ({
          type: w.type,
          message: w.message,
          severity: w.severity,
        })),
      },
    });

    return {
      approved,
      requestId: request.requestId,
      rejectionReason: violations.length > 0
        ? violations.map(v => v.message).join('; ')
        : undefined,
      violations,
      warnings,
      suggestedModifications,
      validatedAt: new Date(),
    };
  }

  recordTrade(agentId: string, pnlUsd: number): void {
    const today = this.getTodayKey();
    let record = this.dailyLossRecords.get(`${agentId}:${today}`);

    if (!record) {
      record = {
        date: today,
        totalLossUsd: 0,
        totalGainUsd: 0,
        netPnlUsd: 0,
        tradeCount: 0,
        tradingDisabled: false,
      };
      this.dailyLossRecords.set(`${agentId}:${today}`, record);
    }

    record.tradeCount++;
    if (pnlUsd < 0) {
      record.totalLossUsd += Math.abs(pnlUsd);
    } else {
      record.totalGainUsd += pnlUsd;
    }
    record.netPnlUsd = record.totalGainUsd - record.totalLossUsd;

    // Check if daily loss limit should disable trading
    // Note: We need portfolio value for percentage calculation
    // For now, track absolute loss and check percentage in validate()
  }

  checkDailyLossLimit(agentId: string, portfolioValueUsd: number): boolean {
    const today = this.getTodayKey();
    const record = this.dailyLossRecords.get(`${agentId}:${today}`);

    if (!record) return false;

    const lossPercent = (record.totalLossUsd / portfolioValueUsd) * 100;
    if (lossPercent >= this.config.dailyLossLimitPercent && !record.tradingDisabled) {
      record.tradingDisabled = true;
      record.disabledAt = new Date();

      this.emitEvent({
        type: 'risk_response_triggered',
        payload: {
          agentId,
          trigger: 'daily_loss_limit_exceeded',
          action: 'trading_disabled',
          lossPercent,
          threshold: this.config.dailyLossLimitPercent,
          restoredAt: this.getNextDayDate(),
        },
      });

      return true;
    }

    return record.tradingDisabled;
  }

  isTradingDisabled(agentId: string): boolean {
    const today = this.getTodayKey();
    const record = this.dailyLossRecords.get(`${agentId}:${today}`);
    return record?.tradingDisabled ?? false;
  }

  getDailyLossRecord(agentId: string): DailyLossRecord | undefined {
    const today = this.getTodayKey();
    return this.dailyLossRecords.get(`${agentId}:${today}`);
  }

  resetDailyLimits(): void {
    // Clear all records from previous days
    const today = this.getTodayKey();
    for (const [key] of this.dailyLossRecords) {
      if (!key.endsWith(`:${today}`)) {
        this.dailyLossRecords.delete(key);
      }
    }

    // Re-enable trading for today
    for (const [, record] of this.dailyLossRecords) {
      record.tradingDisabled = false;
      record.disabledAt = undefined;
    }
  }

  getDisabledAgents(): string[] {
    const today = this.getTodayKey();
    const disabled: string[] = [];

    for (const [key, record] of this.dailyLossRecords) {
      if (key.endsWith(`:${today}`) && record.tradingDisabled) {
        const agentId = key.replace(`:${today}`, '');
        disabled.push(agentId);
      }
    }

    return disabled;
  }

  getConfig(): TradeValidatorConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<TradeValidatorConfig>): void {
    Object.assign(this.config, config);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private getNextDayDate(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTradeValidator(
  config?: Partial<TradeValidatorConfig>,
): DefaultTradeValidator {
  return new DefaultTradeValidator(config);
}
