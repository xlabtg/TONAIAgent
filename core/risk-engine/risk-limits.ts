/**
 * Risk Engine v1 — Risk Limits Enforcement
 * Issue #154: Risk Engine v1
 *
 * Enforces configurable risk limits for maximum position size, maximum leverage,
 * maximum portfolio drawdown, and maximum allocation per strategy.
 *
 * When limits are exceeded, actions include:
 *   - blocking new trades
 *   - reducing exposure
 *   - triggering rebalancing
 */

import type {
  RiskLimit,
  RiskLimitType,
  RiskLimitViolation,
  RiskLimitWarning,
  RiskLimitCheckResult,
  RecommendedAction,
  RiskLimitsConfig,
  RiskEngineEvent,
  RiskEngineEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_LIMITS_CONFIG: RiskLimitsConfig = {
  maxPositionSizePercent: 20,     // 20% of portfolio per single position
  maxLeverageRatio: 5,            // 5x maximum leverage
  maxPortfolioDrawdownPercent: 15, // 15% max portfolio drawdown
  maxStrategyAllocationPercent: 30, // 30% of fund capital per strategy
};

// ============================================================================
// Check Input
// ============================================================================

export interface RiskLimitsCheckInput {
  entityId: string;
  entityType: 'agent' | 'strategy' | 'fund';
  positionSizePercent?: number;   // current position as % of portfolio
  leverageRatio?: number;          // current leverage multiplier
  portfolioDrawdownPercent?: number; // current drawdown from peak as %
  strategyAllocationPercent?: number; // capital allocated to strategy as %
}

// ============================================================================
// Risk Limits Enforcer Interface
// ============================================================================

export interface RiskLimitsEnforcer {
  check(input: RiskLimitsCheckInput): RiskLimitCheckResult;
  getLimits(): RiskLimit[];
  updateLimit(limitType: RiskLimitType, value: number): void;
  onEvent(callback: RiskEngineEventCallback): void;
}

// ============================================================================
// Default Risk Limits Enforcer Implementation
// ============================================================================

export class DefaultRiskLimitsEnforcer implements RiskLimitsEnforcer {
  private readonly limits: Map<RiskLimitType, RiskLimit>;
  private readonly eventCallbacks: RiskEngineEventCallback[] = [];

  constructor(config?: Partial<RiskLimitsConfig>) {
    const cfg = { ...DEFAULT_LIMITS_CONFIG, ...config };

    this.limits = new Map([
      [
        'max_position_size',
        {
          id: 'limit_max_position_size',
          type: 'max_position_size',
          enabled: true,
          value: cfg.maxPositionSizePercent,
          action: 'reduce',
          description: `Maximum single position size: ${cfg.maxPositionSizePercent}% of portfolio`,
        },
      ],
      [
        'max_leverage',
        {
          id: 'limit_max_leverage',
          type: 'max_leverage',
          enabled: true,
          value: cfg.maxLeverageRatio,
          action: 'block',
          description: `Maximum leverage ratio: ${cfg.maxLeverageRatio}x`,
        },
      ],
      [
        'max_portfolio_drawdown',
        {
          id: 'limit_max_drawdown',
          type: 'max_portfolio_drawdown',
          enabled: true,
          value: cfg.maxPortfolioDrawdownPercent,
          action: 'rebalance',
          description: `Maximum portfolio drawdown: ${cfg.maxPortfolioDrawdownPercent}%`,
        },
      ],
      [
        'max_strategy_allocation',
        {
          id: 'limit_max_strategy_allocation',
          type: 'max_strategy_allocation',
          enabled: true,
          value: cfg.maxStrategyAllocationPercent,
          action: 'reduce',
          description: `Maximum capital per strategy: ${cfg.maxStrategyAllocationPercent}%`,
        },
      ],
    ]);
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

  check(input: RiskLimitsCheckInput): RiskLimitCheckResult {
    const violations: RiskLimitViolation[] = [];
    const warnings: RiskLimitWarning[] = [];
    const recommendedActions: RecommendedAction[] = [];

    // ---- Check: max position size ----
    const positionLimit = this.limits.get('max_position_size');
    if (positionLimit?.enabled && input.positionSizePercent !== undefined) {
      const { violations: pv, warnings: pw } = this.checkLimit(
        positionLimit,
        input.positionSizePercent,
        '%',
      );
      violations.push(...pv);
      warnings.push(...pw);
    }

    // ---- Check: max leverage ----
    const leverageLimit = this.limits.get('max_leverage');
    if (leverageLimit?.enabled && input.leverageRatio !== undefined) {
      const { violations: lv, warnings: lw } = this.checkLimit(
        leverageLimit,
        input.leverageRatio,
        'x',
      );
      violations.push(...lv);
      warnings.push(...lw);
    }

    // ---- Check: max portfolio drawdown ----
    const drawdownLimit = this.limits.get('max_portfolio_drawdown');
    if (drawdownLimit?.enabled && input.portfolioDrawdownPercent !== undefined) {
      const { violations: dv, warnings: dw } = this.checkLimit(
        drawdownLimit,
        input.portfolioDrawdownPercent,
        '%',
      );
      violations.push(...dv);
      warnings.push(...dw);
    }

    // ---- Check: max strategy allocation ----
    const allocationLimit = this.limits.get('max_strategy_allocation');
    if (allocationLimit?.enabled && input.strategyAllocationPercent !== undefined) {
      const { violations: av, warnings: aw } = this.checkLimit(
        allocationLimit,
        input.strategyAllocationPercent,
        '%',
      );
      violations.push(...av);
      warnings.push(...aw);
    }

    // Build recommended actions from violations
    for (const violation of violations) {
      const action = buildRecommendedAction(violation);
      if (action) recommendedActions.push(action);
    }

    const passed = violations.length === 0;

    if (!passed) {
      this.emitEvent({
        type: 'limit_violated',
        payload: {
          entityId: input.entityId,
          entityType: input.entityType,
          violations: violations.map(v => ({ type: v.limitType, message: v.message })),
        },
      });
    }

    return { passed, violations, warnings, recommendedActions };
  }

  getLimits(): RiskLimit[] {
    return Array.from(this.limits.values());
  }

  updateLimit(limitType: RiskLimitType, value: number): void {
    const limit = this.limits.get(limitType);
    if (limit) {
      this.limits.set(limitType, { ...limit, value });
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private checkLimit(
    limit: RiskLimit,
    currentValue: number,
    unit: string,
  ): { violations: RiskLimitViolation[]; warnings: RiskLimitWarning[] } {
    const violations: RiskLimitViolation[] = [];
    const warnings: RiskLimitWarning[] = [];

    if (currentValue > limit.value) {
      violations.push({
        limitId: limit.id,
        limitType: limit.type,
        currentValue,
        limitValue: limit.value,
        action: limit.action,
        message: `${limitTypeLabel(limit.type)} ${currentValue.toFixed(2)}${unit} exceeds limit of ${limit.value}${unit}. Action: ${limit.action}.`,
      });
    } else if (currentValue > limit.value * 0.8) {
      // Warn when approaching 80% of the limit
      warnings.push({
        limitType: limit.type,
        currentValue,
        limitValue: limit.value,
        message: `${limitTypeLabel(limit.type)} ${currentValue.toFixed(2)}${unit} is approaching limit of ${limit.value}${unit}.`,
        severity: 'medium',
      });
    }

    return { violations, warnings };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRiskLimitsEnforcer(
  config?: Partial<RiskLimitsConfig>,
): DefaultRiskLimitsEnforcer {
  return new DefaultRiskLimitsEnforcer(config);
}

// ============================================================================
// Helpers
// ============================================================================

function limitTypeLabel(type: RiskLimitType): string {
  const labels: Record<RiskLimitType, string> = {
    max_position_size: 'Position size',
    max_leverage: 'Leverage ratio',
    max_portfolio_drawdown: 'Portfolio drawdown',
    max_strategy_allocation: 'Strategy allocation',
  };
  return labels[type] ?? type;
}

function buildRecommendedAction(
  violation: RiskLimitViolation,
): RecommendedAction | null {
  switch (violation.action) {
    case 'block':
      return {
        type: 'block_trade',
        message: `Block new trades: ${violation.message}`,
        priority: 'high',
      };
    case 'reduce':
      return {
        type: 'reduce_exposure',
        message: `Reduce exposure: ${violation.message}`,
        priority: 'high',
      };
    case 'rebalance':
      return {
        type: 'rebalance',
        message: `Rebalance portfolio: ${violation.message}`,
        priority: 'medium',
      };
    case 'warn':
      return null;
    default:
      return null;
  }
}
