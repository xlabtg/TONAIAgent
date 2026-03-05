/**
 * TONAIAgent - AIFOS Financial Kernel
 *
 * The immutable logic core of the AI-native Financial Operating System.
 * Responsible for:
 * - Capital state management
 * - Risk boundaries enforcement
 * - Monetary parameter control
 * - Governance execution
 *
 * This is Pillar 1 of AIFOS — the kernel layer analogous to an OS kernel,
 * providing the foundational primitives all other layers build upon.
 */

import {
  KernelId,
  KernelState,
  KernelParameters,
  KernelCapitalState,
  KernelRiskState,
  KernelGovernanceState,
  KernelMonetaryState,
  KernelRiskFactor,
  RiskCapLevel,
  FinancialKernelConfig,
  GovernanceOverrideType,
  AIFOSEvent,
  AIFOSEventCallback,
  AIFOSEventType,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_KERNEL_PARAMETERS: KernelParameters = {
  maxSystemCapital: 10_000_000_000_000, // $10 Trillion
  globalRiskCap: 'moderate',
  stabilityIndexThreshold: 40,
  monetaryAdjustmentEnabled: true,
  governanceQuorum: 51,
  emergencyHaltEnabled: true,
  maxSingleModuleExposurePercent: 30,
  crossModuleRiskCorrelationLimit: 0.7,
};

const DEFAULT_KERNEL_CONFIG: FinancialKernelConfig = {
  parameters: {},
  enableConstitutionalBounds: true,
  enableRealTimeRiskMonitoring: true,
  riskAssessmentIntervalMs: 5000,
  capitalStateSnapshotIntervalMs: 10000,
};

// ============================================================================
// Financial Kernel Interface
// ============================================================================

export interface FinancialKernel {
  readonly id: KernelId;
  readonly config: FinancialKernelConfig;
  readonly parameters: KernelParameters;

  // State queries
  getState(): KernelState;
  getCapitalState(): KernelCapitalState;
  getRiskState(): KernelRiskState;
  getGovernanceState(): KernelGovernanceState;
  getMonetaryState(): KernelMonetaryState;

  // Capital management
  updateCapitalState(update: Partial<KernelCapitalState>): KernelCapitalState;
  validateCapitalOperation(amount: number, operationType: string): KernelValidationResult;

  // Risk management
  assessRisk(factors: KernelRiskFactor[]): KernelRiskState;
  enforceRiskBoundary(level: RiskCapLevel): KernelBoundaryResult;
  triggerStabilityAlert(stabilityIndex: number): void;

  // Monetary control
  updateMonetaryState(update: Partial<KernelMonetaryState>): KernelMonetaryState;
  applyMonetaryAdjustment(adjustment: MonetaryAdjustmentParams): MonetaryAdjustmentResult;

  // Governance
  applyGovernanceOverride(override: GovernanceOverrideParams): GovernanceOverrideResult;
  validateGovernanceQuorum(approvalPercent: number): boolean;
  updateKernelParameter(key: keyof KernelParameters, value: KernelParameters[typeof key]): void;

  // Lifecycle
  transition(state: KernelState, reason: string): void;
  halt(reason: string): void;

  // Events
  onEvent(callback: AIFOSEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface KernelValidationResult {
  valid: boolean;
  reason?: string;
  remainingCapacity?: number;
  riskImpact?: RiskCapLevel;
}

export interface KernelBoundaryResult {
  enforced: boolean;
  previousLevel: RiskCapLevel;
  newLevel: RiskCapLevel;
  triggeredActions: string[];
  enforcedAt: Date;
}

export interface MonetaryAdjustmentParams {
  adjustmentType: 'emission_rate' | 'reserve_ratio' | 'stability_buffer' | 'rate_adjustment';
  value: number;
  targetMetric: string;
  reason: string;
  requiresGovernanceApproval?: boolean;
}

export interface MonetaryAdjustmentResult {
  applied: boolean;
  adjustmentType: string;
  previousValue: number;
  newValue: number;
  appliedAt: Date;
  rollbackAvailable: boolean;
}

export interface GovernanceOverrideParams {
  overrideType: GovernanceOverrideType;
  proposedBy: string;
  approvalPercent: number;
  targetParameter?: keyof KernelParameters;
  targetValue?: unknown;
  reason: string;
  expiresAt?: Date;
}

export interface GovernanceOverrideResult {
  applied: boolean;
  overrideId: string;
  overrideType: GovernanceOverrideType;
  previousValue?: unknown;
  newValue?: unknown;
  appliedAt: Date;
  expiresAt?: Date;
}

// ============================================================================
// Default Financial Kernel Implementation
// ============================================================================

export class DefaultFinancialKernel implements FinancialKernel {
  readonly id: KernelId;
  readonly config: FinancialKernelConfig;
  readonly parameters: KernelParameters;

  private state: KernelState = 'initializing';
  private capitalState: KernelCapitalState;
  private riskState: KernelRiskState;
  private governanceState: KernelGovernanceState;
  private monetaryState: KernelMonetaryState;
  private readonly eventCallbacks: AIFOSEventCallback[] = [];
  private overrideCounter = 0;

  constructor(config?: Partial<FinancialKernelConfig>) {
    this.id = `kernel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.config = { ...DEFAULT_KERNEL_CONFIG, ...config };
    this.parameters = {
      ...DEFAULT_KERNEL_PARAMETERS,
      ...config?.parameters,
    };

    this.capitalState = {
      totalManagedCapital: 0,
      allocatedCapital: 0,
      reserveCapital: 0,
      pendingCapital: 0,
      lastUpdatedAt: new Date(),
    };

    this.riskState = {
      currentRiskLevel: 'minimal',
      stabilityIndex: 100,
      activeBreaches: 0,
      lastAssessedAt: new Date(),
      riskFactors: [],
    };

    this.governanceState = {
      pendingProposals: 0,
      activeOverrides: 0,
      constitutionVersion: '1.0.0',
    };

    this.monetaryState = {
      activeEmissionControls: 0,
      reserveStabilityScore: 100,
      totalReserveValueUSD: 0,
    };

    // Transition to running after initialization
    this.state = 'running';
    this.emitEvent('kernel_state_changed', 'info', 'Kernel', 'Financial kernel initialized and running', {
      kernelId: this.id,
      state: this.state,
    });
  }

  getState(): KernelState {
    return this.state;
  }

  getCapitalState(): KernelCapitalState {
    return { ...this.capitalState };
  }

  getRiskState(): KernelRiskState {
    return { ...this.riskState, riskFactors: [...this.riskState.riskFactors] };
  }

  getGovernanceState(): KernelGovernanceState {
    return { ...this.governanceState };
  }

  getMonetaryState(): KernelMonetaryState {
    return { ...this.monetaryState };
  }

  updateCapitalState(update: Partial<KernelCapitalState>): KernelCapitalState {
    this.capitalState = {
      ...this.capitalState,
      ...update,
      lastUpdatedAt: new Date(),
    };

    // Enforce capital cap
    if (this.config.enableConstitutionalBounds &&
        this.capitalState.totalManagedCapital > this.parameters.maxSystemCapital) {
      this.capitalState.totalManagedCapital = this.parameters.maxSystemCapital;
    }

    return this.getCapitalState();
  }

  validateCapitalOperation(amount: number, operationType: string): KernelValidationResult {
    const remaining = this.parameters.maxSystemCapital - this.capitalState.totalManagedCapital;

    if (this.state === 'halted') {
      return { valid: false, reason: 'Kernel halted — no capital operations permitted' };
    }

    if (this.state === 'emergency') {
      return { valid: false, reason: 'Kernel in emergency state — operations suspended' };
    }

    if (this.config.enableConstitutionalBounds && amount > remaining) {
      return {
        valid: false,
        reason: `Amount exceeds system capital capacity (available: $${remaining.toLocaleString()})`,
        remainingCapacity: remaining,
      };
    }

    const riskImpact = this.estimateRiskImpact(amount, operationType);

    return {
      valid: true,
      remainingCapacity: remaining - amount,
      riskImpact,
    };
  }

  assessRisk(factors: KernelRiskFactor[]): KernelRiskState {
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const weightedScore = totalWeight > 0
      ? factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight
      : 0;

    const stabilityIndex = Math.max(0, Math.min(100, 100 - weightedScore));
    const level = this.scoreToRiskLevel(weightedScore);

    const breaches = factors.filter(f => f.score > 75).length;

    this.riskState = {
      currentRiskLevel: level,
      stabilityIndex,
      activeBreaches: breaches,
      lastAssessedAt: new Date(),
      riskFactors: [...factors],
    };

    if (stabilityIndex < this.parameters.stabilityIndexThreshold) {
      this.triggerStabilityAlert(stabilityIndex);
    }

    return this.getRiskState();
  }

  enforceRiskBoundary(level: RiskCapLevel): KernelBoundaryResult {
    const previous = this.riskState.currentRiskLevel;
    const triggeredActions: string[] = [];

    const levelOrder: RiskCapLevel[] = ['minimal', 'low', 'moderate', 'elevated', 'high', 'critical'];
    const capIndex = levelOrder.indexOf(this.parameters.globalRiskCap);
    const requestedIndex = levelOrder.indexOf(level);

    const enforced = requestedIndex > capIndex;
    const newLevel = enforced ? this.parameters.globalRiskCap : level;

    if (enforced) {
      triggeredActions.push(`Risk capped at '${this.parameters.globalRiskCap}' per kernel parameters`);
      this.emitEvent('risk_cap_triggered', 'warning', 'Kernel', `Risk boundary enforced: ${level} → ${newLevel}`, {
        requestedLevel: level,
        enforcedLevel: newLevel,
      });
    }

    this.riskState.currentRiskLevel = newLevel;

    return {
      enforced,
      previousLevel: previous,
      newLevel,
      triggeredActions,
      enforcedAt: new Date(),
    };
  }

  triggerStabilityAlert(stabilityIndex: number): void {
    if (this.state === 'running') {
      this.state = stabilityIndex < 20 ? 'emergency' : 'degraded';
    }

    this.emitEvent(
      'stability_index_alert',
      stabilityIndex < 20 ? 'critical' : 'warning',
      'Kernel',
      `Stability index below threshold: ${stabilityIndex.toFixed(1)} (threshold: ${this.parameters.stabilityIndexThreshold})`,
      { stabilityIndex, threshold: this.parameters.stabilityIndexThreshold, kernelState: this.state },
    );
  }

  updateMonetaryState(update: Partial<KernelMonetaryState>): KernelMonetaryState {
    this.monetaryState = { ...this.monetaryState, ...update };
    return { ...this.monetaryState };
  }

  applyMonetaryAdjustment(adjustment: MonetaryAdjustmentParams): MonetaryAdjustmentResult {
    if (!this.parameters.monetaryAdjustmentEnabled) {
      return {
        applied: false,
        adjustmentType: adjustment.adjustmentType,
        previousValue: 0,
        newValue: 0,
        appliedAt: new Date(),
        rollbackAvailable: false,
      };
    }

    const previousValue = this.monetaryState.reserveStabilityScore;
    // Simulate adjustment — in real use, adjusts actual monetary parameter
    const newValue = Math.max(0, Math.min(100, previousValue + adjustment.value));

    this.monetaryState = {
      ...this.monetaryState,
      reserveStabilityScore: newValue,
      lastMonetaryAdjustmentAt: new Date(),
    };

    this.emitEvent('kernel_parameter_updated', 'info', 'Kernel', `Monetary adjustment applied: ${adjustment.adjustmentType}`, {
      adjustmentType: adjustment.adjustmentType,
      previousValue,
      newValue,
      reason: adjustment.reason,
    });

    return {
      applied: true,
      adjustmentType: adjustment.adjustmentType,
      previousValue,
      newValue,
      appliedAt: new Date(),
      rollbackAvailable: true,
    };
  }

  applyGovernanceOverride(override: GovernanceOverrideParams): GovernanceOverrideResult {
    if (!this.validateGovernanceQuorum(override.approvalPercent)) {
      return {
        applied: false,
        overrideId: '',
        overrideType: override.overrideType,
        appliedAt: new Date(),
      };
    }

    const overrideId = `override-${++this.overrideCounter}-${Date.now()}`;
    let previousValue: unknown;
    let newValue: unknown;

    if (override.targetParameter && override.targetValue !== undefined) {
      previousValue = this.parameters[override.targetParameter];
      (this.parameters as Record<string, unknown>)[override.targetParameter] = override.targetValue;
      newValue = override.targetValue;
    }

    this.governanceState = {
      ...this.governanceState,
      activeOverrides: this.governanceState.activeOverrides + 1,
      lastGovernanceActionAt: new Date(),
    };

    this.emitEvent('governance_override_applied', 'info', 'Kernel', `Governance override applied: ${override.overrideType}`, {
      overrideId,
      overrideType: override.overrideType,
      proposedBy: override.proposedBy,
      previousValue,
      newValue,
    });

    return {
      applied: true,
      overrideId,
      overrideType: override.overrideType,
      previousValue,
      newValue,
      appliedAt: new Date(),
      expiresAt: override.expiresAt,
    };
  }

  validateGovernanceQuorum(approvalPercent: number): boolean {
    return approvalPercent >= this.parameters.governanceQuorum;
  }

  updateKernelParameter(key: keyof KernelParameters, value: KernelParameters[typeof key]): void {
    (this.parameters as Record<string, unknown>)[key] = value;
    this.emitEvent('kernel_parameter_updated', 'info', 'Kernel', `Kernel parameter updated: ${key}`, {
      parameter: key,
      newValue: value,
    });
  }

  transition(state: KernelState, reason: string): void {
    const previous = this.state;
    this.state = state;
    this.emitEvent('kernel_state_changed', 'info', 'Kernel', `Kernel state: ${previous} → ${state} (${reason})`, {
      previousState: previous,
      newState: state,
      reason,
    });
  }

  halt(reason: string): void {
    if (this.parameters.emergencyHaltEnabled) {
      this.transition('halted', reason);
      this.emitEvent('emergency_halt_triggered', 'critical', 'Kernel', `Emergency halt: ${reason}`, { reason });
    }
  }

  onEvent(callback: AIFOSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private emitEvent(
    type: AIFOSEventType,
    severity: AIFOSEvent['severity'],
    source: string,
    message: string,
    data: Record<string, unknown>,
  ): void {
    const event: AIFOSEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }

  private scoreToRiskLevel(score: number): RiskCapLevel {
    if (score < 10) return 'minimal';
    if (score < 25) return 'low';
    if (score < 45) return 'moderate';
    if (score < 65) return 'elevated';
    if (score < 80) return 'high';
    return 'critical';
  }

  private estimateRiskImpact(amount: number, _operationType: string): RiskCapLevel {
    const totalCapital = this.capitalState.totalManagedCapital || 1;
    const percent = (amount / totalCapital) * 100;
    if (percent < 1) return 'minimal';
    if (percent < 5) return 'low';
    if (percent < 15) return 'moderate';
    if (percent < 30) return 'elevated';
    if (percent < 50) return 'high';
    return 'critical';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFinancialKernel(config?: Partial<FinancialKernelConfig>): DefaultFinancialKernel {
  return new DefaultFinancialKernel(config);
}

export default DefaultFinancialKernel;
