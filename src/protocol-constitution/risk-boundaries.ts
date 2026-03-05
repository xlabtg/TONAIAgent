/**
 * TONAIAgent - Protocol Constitution: Risk Boundaries (Issue #126)
 *
 * Manages the protocol's hard and soft risk limits — the immutable safety
 * guardrails that protect the system from catastrophic failure. Hard limits
 * require supermajority (or are permanently immutable) to change.
 */

import type {
  RiskBoundaryDefinitions,
  HardLimit,
  SoftLimit,
  ConstitutionEvent,
  ConstitutionEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface RiskBoundaryManager {
  // Boundary access
  getRiskBoundaries(): RiskBoundaryDefinitions;
  getHardLimit(parameterId: string): HardLimit | undefined;
  getSoftLimit(parameterId: string): SoftLimit | undefined;
  getAllHardLimits(): HardLimit[];
  getAllSoftLimits(): SoftLimit[];

  // Validation
  validateParameter(parameterId: string, proposedValue: number): RiskValidationResult;
  isWithinHardLimit(parameterId: string, value: number): boolean;
  isWithinSoftLimit(parameterId: string, value: number): boolean;
  checkSystemicExposure(currentExposurePercent: number): RiskValidationResult;
  checkInsuranceReserve(currentReservePercent: number): RiskValidationResult;

  // Updates (restricted — hard limits require supermajority)
  updateSoftLimit(parameterId: string, newValue: number, authorizedBy: string): SoftLimit;
  updateHardLimit(parameterId: string, newValue: number, authorizedBy: string): HardLimit;

  // Events
  onEvent(callback: ConstitutionEventCallback): () => void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface RiskValidationResult {
  valid: boolean;
  parameterId: string;
  proposedValue: number;
  currentValue?: number;
  limitType: 'hard' | 'soft' | 'system';
  violation?: string;
  warningLevel: 'none' | 'warning' | 'critical';
  recommendation?: string;
}

// ============================================================================
// Default Risk Boundaries
// ============================================================================

const DEFAULT_HARD_LIMITS: Omit<HardLimit, 'id' | 'establishedAt'>[] = [
  {
    name: 'Maximum Leverage Ceiling',
    description: 'Hard ceiling on leverage across all protocol strategies. Cannot exceed this ratio.',
    parameterKey: 'max_leverage_ratio',
    currentValue: 10,             // 10x leverage maximum
    unit: 'ratio',
    immutable: false,
    amendmentRequirement: 'supermajority',
    rationale: 'Prevents catastrophic losses from over-leveraged positions in volatile markets',
  },
  {
    name: 'Maximum Single Strategy Exposure',
    description: 'Maximum percentage of total TVL that can be allocated to any single strategy',
    parameterKey: 'max_single_strategy_exposure_pct',
    currentValue: 30,             // 30% max in any single strategy
    unit: 'percent',
    immutable: false,
    amendmentRequirement: 'supermajority',
    rationale: 'Ensures concentration risk is bounded even if a single strategy fails',
  },
  {
    name: 'Maximum Systemic Exposure',
    description: 'Maximum percentage of TVL exposed across all correlated high-risk strategies',
    parameterKey: 'max_systemic_exposure_pct',
    currentValue: 50,             // 50% max in high-risk strategies
    unit: 'percent',
    immutable: false,
    amendmentRequirement: 'supermajority',
    rationale: 'Limits protocol-wide risk during correlated market downturns',
  },
  {
    name: 'Insurance Reserve Minimum',
    description: 'Minimum percentage of TVL that must be held in insurance reserve at all times',
    parameterKey: 'insurance_reserve_min_pct',
    currentValue: 5,              // 5% minimum insurance reserve
    unit: 'percent',
    immutable: false,
    amendmentRequirement: 'supermajority',
    rationale: 'Ensures the protocol can cover unexpected losses without insolvency',
  },
  {
    name: 'Absolute Insurance Reserve Floor',
    description: 'The insurance reserve can never go below this constitutional floor — immutable',
    parameterKey: 'insurance_reserve_floor_pct',
    currentValue: 2,              // 2% absolute floor — cannot be changed
    unit: 'percent',
    immutable: true,
    amendmentRequirement: 'immutable',
    rationale: 'Constitutional protection — the protocol must always maintain a minimum safety net',
  },
  {
    name: 'Treasury Reserve Ratio',
    description: 'Minimum percentage of treasury kept in liquid reserves (not deployed to strategies)',
    parameterKey: 'treasury_reserve_ratio_pct',
    currentValue: 20,             // 20% kept liquid
    unit: 'percent',
    immutable: false,
    amendmentRequirement: 'supermajority',
    rationale: 'Ensures protocol can meet redemption demands and emergency needs',
  },
  {
    name: 'Maximum Daily Withdrawal Limit',
    description: 'Maximum percentage of total TVL that can be withdrawn in a single day',
    parameterKey: 'max_daily_withdrawal_pct',
    currentValue: 10,             // 10% per day maximum
    unit: 'percent',
    immutable: false,
    amendmentRequirement: 'supermajority',
    rationale: 'Prevents bank-run scenarios that could cascade into insolvency',
  },
];

const DEFAULT_SOFT_LIMITS: Omit<SoftLimit, 'id'>[] = [
  {
    name: 'Target Liquidity Reserve',
    parameterKey: 'target_liquidity_reserve_pct',
    currentValue: 25,
    unit: 'percent',
    allowedRange: { min: 20, max: 50 },
    amendmentRequirement: 'standard',
  },
  {
    name: 'Rebalance Trigger Threshold',
    parameterKey: 'rebalance_trigger_pct',
    currentValue: 5,
    unit: 'percent',
    allowedRange: { min: 2, max: 15 },
    amendmentRequirement: 'standard',
  },
  {
    name: 'AI Risk Parameter Adjustment Bound',
    parameterKey: 'ai_risk_param_max_change_pct',
    currentValue: 10,
    unit: 'percent',
    allowedRange: { min: 5, max: 20 },
    amendmentRequirement: 'standard',
  },
  {
    name: 'Circuit Breaker Drawdown Threshold',
    parameterKey: 'circuit_breaker_drawdown_pct',
    currentValue: 20,
    unit: 'percent',
    allowedRange: { min: 10, max: 35 },
    amendmentRequirement: 'standard',
  },
  {
    name: 'Emergency Exit Drawdown Threshold',
    parameterKey: 'emergency_exit_drawdown_pct',
    currentValue: 30,
    unit: 'percent',
    allowedRange: { min: 20, max: 50 },
    amendmentRequirement: 'standard',
  },
];

// ============================================================================
// Implementation
// ============================================================================

export class DefaultRiskBoundaryManager implements RiskBoundaryManager {
  private boundaries: RiskBoundaryDefinitions;
  private readonly hardLimits = new Map<string, HardLimit>();
  private readonly softLimits = new Map<string, SoftLimit>();
  private readonly eventCallbacks: ConstitutionEventCallback[] = [];

  constructor(initialBoundaries?: Partial<RiskBoundaryDefinitions>) {
    const now = new Date();

    // Initialize hard limits
    for (let i = 0; i < DEFAULT_HARD_LIMITS.length; i++) {
      const limit: HardLimit = {
        id: `hl-${i + 1}`,
        ...DEFAULT_HARD_LIMITS[i],
        establishedAt: now,
      };
      this.hardLimits.set(limit.parameterKey, limit);
    }

    // Initialize soft limits
    for (let i = 0; i < DEFAULT_SOFT_LIMITS.length; i++) {
      const limit: SoftLimit = {
        id: `sl-${i + 1}`,
        ...DEFAULT_SOFT_LIMITS[i],
      };
      this.softLimits.set(limit.parameterKey, limit);
    }

    this.boundaries = {
      id: this.generateId(),
      version: '1.0.0',
      hardLimits: Array.from(this.hardLimits.values()),
      softLimits: Array.from(this.softLimits.values()),
      insuranceReserveMinimum: this.hardLimits.get('insurance_reserve_min_pct')?.currentValue ?? 5,
      treasuryReserveRatio: this.hardLimits.get('treasury_reserve_ratio_pct')?.currentValue ?? 20,
      maxSystemicExposure: this.hardLimits.get('max_systemic_exposure_pct')?.currentValue ?? 50,
      adoptedAt: now,
      updatedAt: now,
      ...initialBoundaries,
    };
  }

  // --------------------------------------------------------------------------
  // Boundary Access
  // --------------------------------------------------------------------------

  getRiskBoundaries(): RiskBoundaryDefinitions {
    return {
      ...this.boundaries,
      hardLimits: Array.from(this.hardLimits.values()),
      softLimits: Array.from(this.softLimits.values()),
    };
  }

  getHardLimit(parameterId: string): HardLimit | undefined {
    return this.hardLimits.get(parameterId);
  }

  getSoftLimit(parameterId: string): SoftLimit | undefined {
    return this.softLimits.get(parameterId);
  }

  getAllHardLimits(): HardLimit[] {
    return Array.from(this.hardLimits.values());
  }

  getAllSoftLimits(): SoftLimit[] {
    return Array.from(this.softLimits.values());
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  validateParameter(parameterId: string, proposedValue: number): RiskValidationResult {
    const hardLimit = this.hardLimits.get(parameterId);
    if (hardLimit) {
      const valid = proposedValue <= hardLimit.currentValue;
      return {
        valid,
        parameterId,
        proposedValue,
        currentValue: hardLimit.currentValue,
        limitType: 'hard',
        violation: valid ? undefined : `Exceeds hard limit: ${proposedValue} > ${hardLimit.currentValue} ${hardLimit.unit}`,
        warningLevel: valid ? 'none' : 'critical',
        recommendation: valid ? undefined : `Reduce to at most ${hardLimit.currentValue} ${hardLimit.unit}`,
      };
    }

    const softLimit = this.softLimits.get(parameterId);
    if (softLimit) {
      return this.checkSoftLimitResult(softLimit, proposedValue);
    }

    return {
      valid: true,
      parameterId,
      proposedValue,
      limitType: 'system',
      warningLevel: 'none',
    };
  }

  isWithinHardLimit(parameterId: string, value: number): boolean {
    const limit = this.hardLimits.get(parameterId);
    if (!limit) return true;
    return value <= limit.currentValue;
  }

  isWithinSoftLimit(parameterId: string, value: number): boolean {
    const limit = this.softLimits.get(parameterId);
    if (!limit) return true;
    return value >= limit.allowedRange.min && value <= limit.allowedRange.max;
  }

  checkSystemicExposure(currentExposurePercent: number): RiskValidationResult {
    const limit = this.boundaries.maxSystemicExposure;
    const valid = currentExposurePercent <= limit;
    const warningThreshold = limit * 0.85; // Warn at 85% of limit
    return {
      valid,
      parameterId: 'max_systemic_exposure_pct',
      proposedValue: currentExposurePercent,
      currentValue: limit,
      limitType: 'hard',
      violation: valid ? undefined : `Systemic exposure ${currentExposurePercent}% exceeds constitutional limit ${limit}%`,
      warningLevel: valid
        ? (currentExposurePercent >= warningThreshold ? 'warning' : 'none')
        : 'critical',
      recommendation: valid ? undefined : `Reduce systemic exposure below ${limit}%`,
    };
  }

  checkInsuranceReserve(currentReservePercent: number): RiskValidationResult {
    const minimum = this.boundaries.insuranceReserveMinimum;
    const floor = this.hardLimits.get('insurance_reserve_floor_pct')?.currentValue ?? 2;
    const effectiveMin = Math.max(minimum, floor);

    const valid = currentReservePercent >= effectiveMin;
    return {
      valid,
      parameterId: 'insurance_reserve_min_pct',
      proposedValue: currentReservePercent,
      currentValue: effectiveMin,
      limitType: 'hard',
      violation: valid ? undefined : `Insurance reserve ${currentReservePercent}% is below minimum ${effectiveMin}%`,
      warningLevel: valid
        ? (currentReservePercent < effectiveMin * 1.2 ? 'warning' : 'none')
        : 'critical',
      recommendation: valid ? undefined : `Increase insurance reserve to at least ${effectiveMin}%`,
    };
  }

  // --------------------------------------------------------------------------
  // Updates
  // --------------------------------------------------------------------------

  updateSoftLimit(parameterId: string, newValue: number, authorizedBy: string): SoftLimit {
    const limit = this.softLimits.get(parameterId);
    if (!limit) throw new Error(`Soft limit not found: ${parameterId}`);
    if (!authorizedBy) throw new Error('Authorization required');

    if (newValue < limit.allowedRange.min || newValue > limit.allowedRange.max) {
      throw new Error(
        `Value ${newValue} outside allowed range [${limit.allowedRange.min}, ${limit.allowedRange.max}] for ${parameterId}`
      );
    }

    const updated: SoftLimit = { ...limit, currentValue: newValue };
    this.softLimits.set(parameterId, updated);

    this.emit({
      type: 'constitution.amended',
      data: { section: 'risk_boundaries', limitType: 'soft', parameterId, newValue, authorizedBy },
      timestamp: new Date(),
    });

    return updated;
  }

  updateHardLimit(parameterId: string, newValue: number, authorizedBy: string): HardLimit {
    const limit = this.hardLimits.get(parameterId);
    if (!limit) throw new Error(`Hard limit not found: ${parameterId}`);
    if (!authorizedBy) throw new Error('Authorization required');

    if (limit.immutable) {
      throw new Error(`Hard limit '${parameterId}' is constitutionally immutable and cannot be changed`);
    }

    // Check the immutable floor
    const floorLimit = this.hardLimits.get('insurance_reserve_floor_pct');
    if (parameterId === 'insurance_reserve_min_pct' && floorLimit) {
      if (newValue < floorLimit.currentValue) {
        throw new Error(
          `Cannot set insurance reserve below constitutional floor of ${floorLimit.currentValue}%`
        );
      }
    }

    const updated: HardLimit = {
      ...limit,
      currentValue: newValue,
      lastAmendedAt: new Date(),
    };
    this.hardLimits.set(parameterId, updated);

    this.emit({
      type: 'risk_boundary.hard_limit_approached',
      data: { section: 'risk_boundaries', limitType: 'hard', parameterId, newValue, authorizedBy },
      timestamp: new Date(),
    });

    return updated;
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: ConstitutionEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private checkSoftLimitResult(limit: SoftLimit, value: number): RiskValidationResult {
    const inRange = value >= limit.allowedRange.min && value <= limit.allowedRange.max;
    const nearMax = value > limit.allowedRange.max * 0.9;
    return {
      valid: inRange,
      parameterId: limit.parameterKey,
      proposedValue: value,
      currentValue: limit.currentValue,
      limitType: 'soft',
      violation: inRange
        ? undefined
        : `Value ${value} outside allowed range [${limit.allowedRange.min}, ${limit.allowedRange.max}]`,
      warningLevel: inRange ? (nearMax ? 'warning' : 'none') : 'critical',
    };
  }

  private emit(event: ConstitutionEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `rb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createRiskBoundaryManager(
  initialBoundaries?: Partial<RiskBoundaryDefinitions>
): DefaultRiskBoundaryManager {
  return new DefaultRiskBoundaryManager(initialBoundaries);
}
