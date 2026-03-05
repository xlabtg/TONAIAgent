/**
 * Insurance & Stability Fund
 * System-level insurance pool, emergency liquidity backstop, loss absorption,
 * tiered risk tranching, and safety buffer management.
 */

import {
  type FundId,
  type InsuranceTranche,
  type InsuranceClaimStatus,
  type InsuranceContribution,
  type InsuranceClaim,
  type InsuranceFundState,
  type EmergencyLiquidityEvent,
  type InsuranceFundConfig,
  type CircuitBreakerEvent,
  type SystemicRiskEvent,
  type SystemicRiskEventCallback,
} from './types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ContributeParams {
  contributorId: string;
  contributorType: 'fund' | 'agent' | 'protocol';
  amount: number;
  tranche: InsuranceTranche;
  lockPeriodDays?: number;
}

export interface SubmitClaimParams {
  claimantId: string;
  claimantType: 'fund' | 'agent';
  amount: number;
  reason: string;
  triggerEvent: string;
}

export interface InsuranceAndStabilityFund {
  getState(): InsuranceFundState;
  contribute(params: ContributeParams): InsuranceContribution;
  submitClaim(params: SubmitClaimParams): InsuranceClaim;
  approveClaim(claimId: string, approvedAmount?: number): InsuranceClaim;
  rejectClaim(claimId: string, reason: string): InsuranceClaim;
  getClaim(claimId: string): InsuranceClaim | undefined;
  listClaims(status?: InsuranceClaimStatus): InsuranceClaim[];
  triggerEmergencyLiquidity(
    circuitBreakerEvent: CircuitBreakerEvent,
    fundsToSupport: FundId[],
    liquidityAmount: number,
  ): EmergencyLiquidityEvent;
  resolveEmergencyLiquidity(eventId: string): void;
  getTotalPool(): number;
  getCoverageRatio(totalSystemExposure: number): number;
  getEmergencyLiquidityHistory(): EmergencyLiquidityEvent[];
  onEvent(callback: SystemicRiskEventCallback): void;
}

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_INSURANCE_CONFIG: InsuranceFundConfig = {
  targetCoverageRatio: 0.05,    // 5% of total system
  juniorTranchePct: 0.20,       // 20% — absorbs first losses
  mezzanineTranchePct: 0.30,    // 30%
  seniorTranchePct: 0.50,       // 50% — safest, last to absorb
  maxSingleClaimPct: 0.20,      // max 20% of pool per claim
  minPoolSize: 100_000,         // 100k USD minimum
};

// ─── Implementation ───────────────────────────────────────────────────────────

export class DefaultInsuranceAndStabilityFund implements InsuranceAndStabilityFund {
  private readonly config: InsuranceFundConfig;
  private contributions: InsuranceContribution[] = [];
  private claims: InsuranceClaim[] = [];
  private emergencyLiquidityEvents: EmergencyLiquidityEvent[] = [];
  private eventCallbacks: SystemicRiskEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<InsuranceFundConfig>) {
    this.config = { ...DEFAULT_INSURANCE_CONFIG, ...config };
  }

  getState(): InsuranceFundState {
    const totalPool = this.computeTotalPool();
    const trancheBreakdown = this.computeTrancheTotals();
    const pendingClaims = this.claims.filter(c => c.status === 'pending').length;
    const activeClaims = this.claims.filter(c => ['pending', 'approved'].includes(c.status));
    const totalApprovedPending = activeClaims
      .filter(c => c.status === 'approved')
      .reduce((s, c) => s + (c.approvedAmount ?? 0), 0);
    const utilizationPct = totalPool > 0 ? totalApprovedPending / totalPool : 0;

    return {
      totalPool,
      trancheBreakdown,
      utilizationPct,
      pendingClaims,
      activeClaims,
      contributions: [...this.contributions],
      coverageRatio: 0,  // computed externally when totalSystemExposure is known
      lastUpdated: Date.now(),
    };
  }

  contribute(params: ContributeParams): InsuranceContribution {
    const contribution: InsuranceContribution = {
      id: `ins-contrib-${++this.idCounter}`,
      contributorId: params.contributorId,
      contributorType: params.contributorType,
      amount: params.amount,
      tranche: params.tranche,
      timestamp: Date.now(),
      lockPeriodDays: params.lockPeriodDays ?? 30,
    };
    this.contributions.push(contribution);
    return contribution;
  }

  submitClaim(params: SubmitClaimParams): InsuranceClaim {
    const maxClaim = this.computeTotalPool() * this.config.maxSingleClaimPct;
    const claimAmount = Math.min(params.amount, maxClaim);

    const claim: InsuranceClaim = {
      id: `ins-claim-${++this.idCounter}`,
      claimantId: params.claimantId,
      claimantType: params.claimantType,
      amount: claimAmount,
      reason: params.reason,
      triggerEvent: params.triggerEvent,
      status: 'pending',
      timestamp: Date.now(),
    };
    this.claims.push(claim);

    this.emit({
      type: 'insurance_claim_submitted',
      timestamp: Date.now(),
      payload: claim,
    });

    return claim;
  }

  approveClaim(claimId: string, approvedAmount?: number): InsuranceClaim {
    const claim = this.findClaim(claimId);
    if (!claim) throw new Error(`Claim ${claimId} not found`);
    if (claim.status !== 'pending') throw new Error(`Claim ${claimId} is not pending (status: ${claim.status})`);

    const pool = this.computeTotalPool();
    const maxPayout = pool * this.config.maxSingleClaimPct;
    const finalAmount = Math.min(approvedAmount ?? claim.amount, maxPayout, pool);

    claim.status = 'paid';
    claim.approvedAmount = finalAmount;
    claim.resolvedAt = Date.now();

    // Deduct from pool — use junior tranche first
    this.deductFromPool(finalAmount);

    this.emit({
      type: 'insurance_claim_resolved',
      timestamp: Date.now(),
      payload: claim,
    });

    return { ...claim };
  }

  rejectClaim(claimId: string, _reason: string): InsuranceClaim {
    const claim = this.findClaim(claimId);
    if (!claim) throw new Error(`Claim ${claimId} not found`);
    if (claim.status !== 'pending') throw new Error(`Claim ${claimId} is not pending`);

    claim.status = 'rejected';
    claim.resolvedAt = Date.now();

    this.emit({
      type: 'insurance_claim_resolved',
      timestamp: Date.now(),
      payload: claim,
    });

    return { ...claim };
  }

  getClaim(claimId: string): InsuranceClaim | undefined {
    return this.claims.find(c => c.id === claimId);
  }

  listClaims(status?: InsuranceClaimStatus): InsuranceClaim[] {
    if (status) return this.claims.filter(c => c.status === status);
    return [...this.claims];
  }

  triggerEmergencyLiquidity(
    circuitBreakerEvent: CircuitBreakerEvent,
    fundsToSupport: FundId[],
    liquidityAmount: number,
  ): EmergencyLiquidityEvent {
    const available = this.computeTotalPool();
    const provided = Math.min(liquidityAmount, available * 0.50);  // cap at 50% of pool

    const elEvent: EmergencyLiquidityEvent = {
      id: `el-${++this.idCounter}`,
      triggeredBy: circuitBreakerEvent,
      liquidityProvided: provided,
      fundsSupported: [...fundsToSupport],
      timestamp: Date.now(),
      resolved: false,
    };
    this.emergencyLiquidityEvents.push(elEvent);

    // Deduct provided liquidity from pool
    if (provided > 0) this.deductFromPool(provided);

    this.emit({
      type: 'emergency_liquidity_triggered',
      timestamp: Date.now(),
      payload: elEvent,
    });

    return elEvent;
  }

  resolveEmergencyLiquidity(eventId: string): void {
    const event = this.emergencyLiquidityEvents.find(e => e.id === eventId);
    if (event) event.resolved = true;
  }

  getTotalPool(): number {
    return this.computeTotalPool();
  }

  getCoverageRatio(totalSystemExposure: number): number {
    if (totalSystemExposure <= 0) return 1;
    return this.computeTotalPool() / totalSystemExposure;
  }

  getEmergencyLiquidityHistory(): EmergencyLiquidityEvent[] {
    return [...this.emergencyLiquidityEvents];
  }

  onEvent(callback: SystemicRiskEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private computeTotalPool(): number {
    return this.contributions.reduce((s, c) => s + c.amount, 0);
  }

  private computeTrancheTotals(): Record<InsuranceTranche, number> {
    return this.contributions.reduce(
      (acc, c) => {
        acc[c.tranche] = (acc[c.tranche] ?? 0) + c.amount;
        return acc;
      },
      { junior: 0, mezzanine: 0, senior: 0 } as Record<InsuranceTranche, number>,
    );
  }

  private deductFromPool(amount: number): void {
    // Absorb losses starting from junior tranche contributions
    let remaining = amount;
    const byTranche: InsuranceTranche[] = ['junior', 'mezzanine', 'senior'];

    for (const tranche of byTranche) {
      if (remaining <= 0) break;
      const trancheContribs = this.contributions.filter(c => c.tranche === tranche);
      for (const contrib of trancheContribs) {
        if (remaining <= 0) break;
        const deduct = Math.min(contrib.amount, remaining);
        contrib.amount -= deduct;
        remaining -= deduct;
      }
    }
  }

  private findClaim(claimId: string): InsuranceClaim | undefined {
    return this.claims.find(c => c.id === claimId);
  }

  private emit(event: SystemicRiskEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }
}

export function createInsuranceAndStabilityFund(
  config?: Partial<InsuranceFundConfig>,
): InsuranceAndStabilityFund {
  return new DefaultInsuranceAndStabilityFund(config);
}
