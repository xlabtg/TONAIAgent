/**
 * TONAIAgent - DAO Risk Governance Module (Issue #103)
 *
 * Risk governance for the DAO treasury. Enforces exposure limits,
 * strategy whitelists, circuit breakers, and emergency shutdown.
 */

import type {
  TreasuryRiskParameters,
  TreasuryRiskAssessment,
  CircuitBreakerState,
  EmergencyAction,
  TreasuryAllocation,
  DaoEvent,
  DaoEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface RiskGovernanceManager {
  // Risk assessment
  assessAllocationRisk(
    strategyId: string,
    requestedAmount: number,
    currentAllocations: TreasuryAllocation[],
    totalTreasuryValue: number
  ): TreasuryRiskAssessment;

  // Parameter management
  getRiskParameters(): TreasuryRiskParameters;
  updateRiskParameters(params: Partial<TreasuryRiskParameters>): void;

  // Strategy whitelist
  whitelistStrategy(strategyId: string, riskScore: number): void;
  removeFromWhitelist(strategyId: string): void;
  isStrategyWhitelisted(strategyId: string): boolean;
  getWhitelistedStrategies(): Array<{ strategyId: string; riskScore: number; addedAt: Date }>;

  // Circuit breaker
  getCircuitBreakerState(): CircuitBreakerState;
  triggerCircuitBreaker(reason: string, triggeredBy: string, drawdown: number): void;
  resetCircuitBreaker(resetBy: string): void;

  // Emergency controls
  triggerEmergencyAction(
    type: EmergencyAction['type'],
    triggeredBy: string,
    reason: string,
    affectedStrategies: string[]
  ): EmergencyAction;
  resolveEmergencyAction(actionId: string, resolvedBy: string): boolean;
  getActiveEmergencies(): EmergencyAction[];

  // Portfolio risk monitoring
  checkPortfolioRisk(allocations: TreasuryAllocation[], totalValue: number): RiskCheckReport;

  // Events
  onEvent(callback: DaoEventCallback): () => void;
}

export interface RiskCheckReport {
  passed: boolean;
  riskScore: number;
  violations: RiskViolation[];
  warnings: string[];
  circuitBreakerActive: boolean;
}

export interface RiskViolation {
  rule: string;
  description: string;
  severity: 'warning' | 'error' | 'critical';
  currentValue: number;
  limit: number;
}

// ============================================================================
// Configuration & Defaults
// ============================================================================

export interface RiskGovernanceConfig {
  initialRiskParameters?: Partial<TreasuryRiskParameters>;
  initialWhitelist?: Array<{ strategyId: string; riskScore: number }>;
}

const DEFAULT_RISK_PARAMETERS: TreasuryRiskParameters = {
  maxSingleStrategyExposure: 30,   // Max 30% to any single strategy
  maxTotalRiskyExposure: 50,       // Max 50% in high-risk strategies
  maxDrawdownBeforePause: 15,      // Pause if >15% drawdown
  circuitBreakerThreshold: 20,     // Circuit breaker at 20% drawdown
  emergencyExitThreshold: 30,      // Emergency exit at 30% drawdown
  minLiquidityReserve: 20,         // Keep 20% liquid minimum
  rebalanceThreshold: 5,           // Rebalance if allocation drifts >5%
  dailyWithdrawalLimit: 10,        // Max 10% withdrawal per day
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultRiskGovernanceManager implements RiskGovernanceManager {
  private riskParameters: TreasuryRiskParameters;
  private readonly whitelist = new Map<string, { strategyId: string; riskScore: number; addedAt: Date }>();
  private circuitBreaker: CircuitBreakerState = { triggered: false };
  private readonly emergencies = new Map<string, EmergencyAction>();
  private readonly eventCallbacks: DaoEventCallback[] = [];

  constructor(config: RiskGovernanceConfig = {}) {
    this.riskParameters = {
      ...DEFAULT_RISK_PARAMETERS,
      ...(config.initialRiskParameters ?? {}),
    };

    if (config.initialWhitelist) {
      for (const entry of config.initialWhitelist) {
        this.whitelistStrategy(entry.strategyId, entry.riskScore);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Risk Assessment
  // --------------------------------------------------------------------------

  assessAllocationRisk(
    strategyId: string,
    requestedAmount: number,
    currentAllocations: TreasuryAllocation[],
    totalTreasuryValue: number
  ): TreasuryRiskAssessment {
    const recommendations: string[] = [];
    const warnings: string[] = [];
    let requiresApproval = false;

    // Check if strategy is whitelisted
    const whitelistEntry = this.whitelist.get(strategyId);
    const strategyRiskScore = whitelistEntry?.riskScore ?? 75;

    // Concentration risk: what % is this allocation?
    const allocationPercent = totalTreasuryValue > 0
      ? (requestedAmount / totalTreasuryValue) * 100
      : 100;

    if (allocationPercent > this.riskParameters.maxSingleStrategyExposure) {
      warnings.push(
        `Allocation of ${allocationPercent.toFixed(1)}% exceeds single-strategy limit ` +
        `of ${this.riskParameters.maxSingleStrategyExposure}%`
      );
      requiresApproval = true;
    }

    // Total risky exposure after this allocation
    const currentRiskyExposure = currentAllocations
      .filter(a => a.riskScore >= 70)
      .reduce((sum, a) => sum + a.currentValue, 0);
    const newRiskyExposure = strategyRiskScore >= 70
      ? currentRiskyExposure + requestedAmount
      : currentRiskyExposure;
    const newRiskyPercent = totalTreasuryValue > 0
      ? (newRiskyExposure / totalTreasuryValue) * 100
      : 0;

    if (newRiskyPercent > this.riskParameters.maxTotalRiskyExposure) {
      warnings.push(
        `Total high-risk exposure would be ${newRiskyPercent.toFixed(1)}%, ` +
        `exceeding limit of ${this.riskParameters.maxTotalRiskyExposure}%`
      );
      requiresApproval = true;
    }

    // Liquidity check
    const currentAllocated = currentAllocations.reduce((s, a) => s + a.currentValue, 0);
    const afterAvailable = totalTreasuryValue - currentAllocated - requestedAmount;
    const afterLiquidityPercent = totalTreasuryValue > 0
      ? (afterAvailable / totalTreasuryValue) * 100
      : 0;

    if (afterLiquidityPercent < this.riskParameters.minLiquidityReserve) {
      warnings.push(
        `Liquidity would drop to ${afterLiquidityPercent.toFixed(1)}%, ` +
        `below minimum of ${this.riskParameters.minLiquidityReserve}%`
      );
      requiresApproval = true;
    }

    // Recommendations
    if (!whitelistEntry) {
      recommendations.push('Strategy is not whitelisted — governance approval required before allocation');
      requiresApproval = true;
    }
    if (allocationPercent > 20) {
      recommendations.push('Consider splitting allocation across multiple strategies to reduce concentration risk');
    }
    if (strategyRiskScore >= 70) {
      recommendations.push('High-risk strategy: monitor drawdown closely and set stop-loss triggers');
    }

    // Compute composite risk score (0-100)
    const concentrationRisk = Math.min(100, (allocationPercent / this.riskParameters.maxSingleStrategyExposure) * 100);
    const liquidityRisk = Math.max(0, 100 - (afterLiquidityPercent / this.riskParameters.minLiquidityReserve) * 100);
    const marketRisk = strategyRiskScore;
    const counterpartyRisk = whitelistEntry ? 20 : 60;  // Higher if not whitelisted
    const compositeScore = (concentrationRisk * 0.3 + liquidityRisk * 0.2 + marketRisk * 0.3 + counterpartyRisk * 0.2);

    let riskLevel: TreasuryRiskAssessment['riskLevel'];
    if (compositeScore < 30) riskLevel = 'low';
    else if (compositeScore < 60) riskLevel = 'medium';
    else if (compositeScore < 80) riskLevel = 'high';
    else riskLevel = 'critical';

    return {
      riskScore: compositeScore,
      riskLevel,
      concentrationRisk,
      liquidityRisk,
      marketRisk,
      counterpartyRisk,
      recommendations,
      warnings,
      approvalRequired: requiresApproval,
      assessedAt: new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // Risk Parameters
  // --------------------------------------------------------------------------

  getRiskParameters(): TreasuryRiskParameters {
    return { ...this.riskParameters };
  }

  updateRiskParameters(params: Partial<TreasuryRiskParameters>): void {
    this.riskParameters = { ...this.riskParameters, ...params };
  }

  // --------------------------------------------------------------------------
  // Strategy Whitelist
  // --------------------------------------------------------------------------

  whitelistStrategy(strategyId: string, riskScore: number): void {
    this.whitelist.set(strategyId, { strategyId, riskScore, addedAt: new Date() });
  }

  removeFromWhitelist(strategyId: string): void {
    this.whitelist.delete(strategyId);
  }

  isStrategyWhitelisted(strategyId: string): boolean {
    return this.whitelist.has(strategyId);
  }

  getWhitelistedStrategies(): Array<{ strategyId: string; riskScore: number; addedAt: Date }> {
    return Array.from(this.whitelist.values());
  }

  // --------------------------------------------------------------------------
  // Circuit Breaker
  // --------------------------------------------------------------------------

  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  triggerCircuitBreaker(reason: string, triggeredBy: string, drawdown: number): void {
    if (this.circuitBreaker.triggered) return;

    this.circuitBreaker = {
      triggered: true,
      triggeredAt: new Date(),
      triggerReason: reason,
      triggeredBy,
      drawdownAtTrigger: drawdown,
    };

    this.emit({
      type: 'risk.circuit_breaker_triggered',
      data: { reason, triggeredBy, drawdown },
      timestamp: new Date(),
    });
  }

  resetCircuitBreaker(resetBy: string): void {
    if (!this.circuitBreaker.triggered) return;

    this.circuitBreaker = {
      triggered: false,
      resetAt: new Date(),
      resetBy,
    };

    this.emit({ type: 'risk.circuit_breaker_reset', data: { resetBy }, timestamp: new Date() });
  }

  // --------------------------------------------------------------------------
  // Emergency Controls
  // --------------------------------------------------------------------------

  triggerEmergencyAction(
    type: EmergencyAction['type'],
    triggeredBy: string,
    reason: string,
    affectedStrategies: string[]
  ): EmergencyAction {
    const action: EmergencyAction = {
      id: this.generateId(),
      type,
      triggeredBy,
      reason,
      affectedStrategies,
      timestamp: new Date(),
      resolved: false,
    };

    this.emergencies.set(action.id, action);

    this.emit({ type: 'risk.emergency_action', data: { action }, timestamp: new Date() });

    return action;
  }

  resolveEmergencyAction(actionId: string, resolvedBy: string): boolean {
    const action = this.emergencies.get(actionId);
    if (!action || action.resolved) return false;

    action.resolved = true;
    action.resolvedAt = new Date();
    action.resolvedBy = resolvedBy;

    return true;
  }

  getActiveEmergencies(): EmergencyAction[] {
    return Array.from(this.emergencies.values()).filter(a => !a.resolved);
  }

  // --------------------------------------------------------------------------
  // Portfolio Risk Monitoring
  // --------------------------------------------------------------------------

  checkPortfolioRisk(allocations: TreasuryAllocation[], totalValue: number): RiskCheckReport {
    const violations: RiskViolation[] = [];
    const warnings: string[] = [];

    // Check circuit breaker
    if (this.circuitBreaker.triggered) {
      violations.push({
        rule: 'circuit_breaker',
        description: `Circuit breaker is active: ${this.circuitBreaker.triggerReason}`,
        severity: 'critical',
        currentValue: this.circuitBreaker.drawdownAtTrigger ?? 0,
        limit: this.riskParameters.circuitBreakerThreshold,
      });
    }

    // Check single-strategy concentration
    for (const alloc of allocations) {
      const percent = totalValue > 0 ? (alloc.currentValue / totalValue) * 100 : 0;
      if (percent > this.riskParameters.maxSingleStrategyExposure) {
        violations.push({
          rule: 'max_single_strategy_exposure',
          description: `Strategy ${alloc.strategyId} has ${percent.toFixed(1)}% exposure`,
          severity: 'error',
          currentValue: percent,
          limit: this.riskParameters.maxSingleStrategyExposure,
        });
      }
    }

    // Check total high-risk exposure
    const riskyExposure = allocations
      .filter(a => a.riskScore >= 70)
      .reduce((s, a) => s + a.currentValue, 0);
    const riskyPercent = totalValue > 0 ? (riskyExposure / totalValue) * 100 : 0;

    if (riskyPercent > this.riskParameters.maxTotalRiskyExposure) {
      violations.push({
        rule: 'max_total_risky_exposure',
        description: `Total high-risk exposure ${riskyPercent.toFixed(1)}% exceeds limit`,
        severity: 'error',
        currentValue: riskyPercent,
        limit: this.riskParameters.maxTotalRiskyExposure,
      });
    }

    // Check for drawdown on individual strategies
    for (const alloc of allocations) {
      if (alloc.pnlPercent < -this.riskParameters.maxDrawdownBeforePause) {
        violations.push({
          rule: 'max_drawdown_before_pause',
          description: `Strategy ${alloc.strategyId} has ${alloc.pnlPercent.toFixed(1)}% drawdown`,
          severity: 'warning',
          currentValue: Math.abs(alloc.pnlPercent),
          limit: this.riskParameters.maxDrawdownBeforePause,
        });
      }
      if (alloc.pnlPercent < -this.riskParameters.circuitBreakerThreshold) {
        violations.push({
          rule: 'circuit_breaker_threshold',
          description: `Strategy ${alloc.strategyId} near circuit breaker threshold`,
          severity: 'error',
          currentValue: Math.abs(alloc.pnlPercent),
          limit: this.riskParameters.circuitBreakerThreshold,
        });
      }
    }

    // General warnings
    if (allocations.length === 0) {
      warnings.push('No active allocations — treasury is fully liquid but generating no yield');
    }
    if (allocations.length === 1 && totalValue > 0) {
      warnings.push('Portfolio has zero diversification — consider multiple strategies');
    }

    const totalRiskScore = allocations.length > 0
      ? allocations.reduce((s, a) => s + a.riskScore, 0) / allocations.length
      : 0;

    return {
      passed: violations.filter(v => v.severity === 'error' || v.severity === 'critical').length === 0,
      riskScore: totalRiskScore,
      violations,
      warnings,
      circuitBreakerActive: this.circuitBreaker.triggered,
    };
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: DaoEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private emit(event: DaoEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createRiskGovernanceManager(config?: RiskGovernanceConfig): DefaultRiskGovernanceManager {
  return new DefaultRiskGovernanceManager(config);
}
