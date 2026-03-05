/**
 * ACMS Layer 7 — Monetary & Treasury Layer
 *
 * AI-driven monetary policy and treasury management for the ACMS:
 * token emission control, treasury allocation, incentive management,
 * and dynamic monetary policy adjustment based on system metrics.
 * Implements the AI Monetary Policy & Treasury Layer (Issue #123).
 */

import {
  AssetId,
  ProposalId,
  MonetaryPolicy,
  MonetaryPolicyAction,
  EmissionSchedule,
  TreasuryAllocation,
  MonetaryTreasuryLayerStatus,
  ACMSEvent,
  ACMSEventCallback,
} from './types';

// ============================================================================
// Monetary & Treasury Layer Interfaces
// ============================================================================

export interface MonetaryTreasuryLayerManager {
  createMonetaryPolicy(params: CreateMonetaryPolicyParams): MonetaryPolicy;
  updateMonetaryPolicy(policyId: string, updates: Partial<MonetaryPolicy>): MonetaryPolicy;
  executeMonetaryAction(policyId: string, action: MonetaryPolicyAction, amountUsd?: number): MonetaryActionResult;
  getMonetaryPolicy(policyId: string): MonetaryPolicy | undefined;
  listMonetaryPolicies(): MonetaryPolicy[];

  createEmissionSchedule(params: CreateEmissionScheduleParams): EmissionSchedule;
  advanceEpoch(scheduleId: string): EmissionSchedule;
  pauseEmission(scheduleId: string): void;
  resumeEmission(scheduleId: string): void;
  getEmissionSchedule(scheduleId: string): EmissionSchedule | undefined;
  listEmissionSchedules(): EmissionSchedule[];

  allocateTreasury(params: TreasuryAllocationParams): TreasuryAllocation;
  spendTreasuryAllocation(allocationId: string, amountUsd: number, description: string): void;
  getTreasuryAllocation(allocationId: string): TreasuryAllocation | undefined;
  listTreasuryAllocations(): TreasuryAllocation[];
  getTotalTreasuryValueUsd(): number;
  depositToTreasury(amountUsd: number): void;

  getLayerStatus(): MonetaryTreasuryLayerStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export interface CreateMonetaryPolicyParams {
  name: string;
  targetInflationRate: number;
  initialEmissionRate: number;
  reserveRatio: number;
  collateralizationRatio: number;
  stabilizationBuffer: number;
}

export interface CreateEmissionScheduleParams {
  assetId: AssetId;
  epochDurationDays: number;
  initialEpochEmission: number;
  totalScheduledEmission: number;
  decayRate: number;  // % reduction per epoch
}

export interface TreasuryAllocationParams {
  purpose: TreasuryAllocation['purpose'];
  amountUsd: number;
  approvedBy: ProposalId;
  expiresInDays?: number;
}

export interface MonetaryActionResult {
  policyId: string;
  action: MonetaryPolicyAction;
  amount: number;
  previousEmissionRate: number;
  newEmissionRate: number;
  previousReserveRatio: number;
  newReserveRatio: number;
  executedAt: Date;
}

export interface TreasurySpendRecord {
  allocationId: string;
  amount: number;
  description: string;
  spentAt: Date;
}

// ============================================================================
// Default Monetary & Treasury Layer Manager
// ============================================================================

export class DefaultMonetaryTreasuryLayerManager implements MonetaryTreasuryLayerManager {
  private readonly policies: Map<string, MonetaryPolicy> = new Map();
  private readonly emissionSchedules: Map<string, EmissionSchedule> = new Map();
  private readonly allocations: Map<string, TreasuryAllocation> = new Map();
  private readonly spendRecords: TreasurySpendRecord[] = [];
  private readonly eventCallbacks: ACMSEventCallback[] = [];
  private readonly pausedSchedules: Set<string> = new Set();
  private treasuryBalanceUsd = 50_000_000;  // Initial treasury
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  createMonetaryPolicy(params: CreateMonetaryPolicyParams): MonetaryPolicy {
    const policy: MonetaryPolicy = {
      id: this.generateId('policy'),
      name: params.name,
      targetInflationRate: params.targetInflationRate,
      currentEmissionRate: params.initialEmissionRate,
      reserveRatio: params.reserveRatio,
      collateralizationRatio: params.collateralizationRatio,
      stabilizationBuffer: params.stabilizationBuffer,
      activeActions: [],
      lastReviewAt: new Date(),
    };
    this.policies.set(policy.id, policy);
    return policy;
  }

  updateMonetaryPolicy(policyId: string, updates: Partial<MonetaryPolicy>): MonetaryPolicy {
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error(`Policy ${policyId} not found`);
    const updated = { ...policy, ...updates, id: policy.id, lastReviewAt: new Date() };
    this.policies.set(policyId, updated);
    return updated;
  }

  executeMonetaryAction(policyId: string, action: MonetaryPolicyAction, amountUsd = 0): MonetaryActionResult {
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error(`Policy ${policyId} not found`);

    const prevRate = policy.currentEmissionRate;
    const prevReserve = policy.reserveRatio;
    let newRate = prevRate;
    let newReserve = prevReserve;

    switch (action) {
      case 'emission_increase':
        newRate = prevRate * 1.1;
        break;
      case 'emission_decrease':
        newRate = prevRate * 0.9;
        break;
      case 'emission_halt':
        newRate = 0;
        break;
      case 'liquidity_injection':
        newReserve = Math.max(0, prevReserve - 0.01);
        this.treasuryBalanceUsd += amountUsd;
        break;
      case 'liquidity_withdrawal':
        newReserve = Math.min(1, prevReserve + 0.01);
        this.treasuryBalanceUsd = Math.max(0, this.treasuryBalanceUsd - amountUsd);
        break;
      case 'buyback':
        this.treasuryBalanceUsd = Math.max(0, this.treasuryBalanceUsd - amountUsd);
        break;
      case 'burn':
        newRate = prevRate * 0.95;
        break;
    }

    const activeActions = [...policy.activeActions.filter(a => a !== action), action];
    this.policies.set(policyId, { ...policy, currentEmissionRate: newRate, reserveRatio: newReserve, activeActions });
    this.emitEvent('monetary_policy_updated', 7, { policyId, action, newEmissionRate: newRate });

    return {
      policyId,
      action,
      amount: amountUsd,
      previousEmissionRate: prevRate,
      newEmissionRate: newRate,
      previousReserveRatio: prevReserve,
      newReserveRatio: newReserve,
      executedAt: new Date(),
    };
  }

  getMonetaryPolicy(policyId: string): MonetaryPolicy | undefined {
    return this.policies.get(policyId);
  }

  listMonetaryPolicies(): MonetaryPolicy[] {
    return Array.from(this.policies.values());
  }

  createEmissionSchedule(params: CreateEmissionScheduleParams): EmissionSchedule {
    const schedule: EmissionSchedule = {
      id: this.generateId('emission'),
      assetId: params.assetId,
      epochDurationDays: params.epochDurationDays,
      currentEpoch: 1,
      epochEmission: params.initialEpochEmission,
      totalScheduledEmission: params.totalScheduledEmission,
      emittedToDate: 0,
      nextEmissionAt: new Date(Date.now() + params.epochDurationDays * 24 * 60 * 60 * 1000),
      decayRate: params.decayRate,
    };
    this.emissionSchedules.set(schedule.id, schedule);
    return schedule;
  }

  advanceEpoch(scheduleId: string): EmissionSchedule {
    const schedule = this.emissionSchedules.get(scheduleId);
    if (!schedule) throw new Error(`Emission schedule ${scheduleId} not found`);
    if (this.pausedSchedules.has(scheduleId)) throw new Error(`Emission schedule ${scheduleId} is paused`);

    const newEpoch = schedule.currentEpoch + 1;
    const newEpochEmission = schedule.epochEmission * (1 - schedule.decayRate / 100);
    const newEmittedToDate = schedule.emittedToDate + schedule.epochEmission;
    const updated: EmissionSchedule = {
      ...schedule,
      currentEpoch: newEpoch,
      epochEmission: Math.round(newEpochEmission),
      emittedToDate: newEmittedToDate,
      nextEmissionAt: new Date(Date.now() + schedule.epochDurationDays * 24 * 60 * 60 * 1000),
    };
    this.emissionSchedules.set(scheduleId, updated);
    return updated;
  }

  pauseEmission(scheduleId: string): void {
    if (!this.emissionSchedules.has(scheduleId)) throw new Error(`Emission schedule ${scheduleId} not found`);
    this.pausedSchedules.add(scheduleId);
  }

  resumeEmission(scheduleId: string): void {
    if (!this.emissionSchedules.has(scheduleId)) throw new Error(`Emission schedule ${scheduleId} not found`);
    this.pausedSchedules.delete(scheduleId);
  }

  getEmissionSchedule(scheduleId: string): EmissionSchedule | undefined {
    return this.emissionSchedules.get(scheduleId);
  }

  listEmissionSchedules(): EmissionSchedule[] {
    return Array.from(this.emissionSchedules.values());
  }

  allocateTreasury(params: TreasuryAllocationParams): TreasuryAllocation {
    if (params.amountUsd > this.treasuryBalanceUsd) {
      throw new Error('Insufficient treasury balance for allocation');
    }
    const allocation: TreasuryAllocation = {
      id: this.generateId('alloc'),
      purpose: params.purpose,
      allocatedAmountUsd: params.amountUsd,
      spentAmountUsd: 0,
      remainingAmountUsd: params.amountUsd,
      approvedBy: params.approvedBy,
      expiresAt: params.expiresInDays
        ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
    };
    this.allocations.set(allocation.id, allocation);
    this.treasuryBalanceUsd -= params.amountUsd;
    return allocation;
  }

  spendTreasuryAllocation(allocationId: string, amountUsd: number, description: string): void {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) throw new Error(`Allocation ${allocationId} not found`);
    if (amountUsd > allocation.remainingAmountUsd) throw new Error('Insufficient allocation remaining');
    const updated: TreasuryAllocation = {
      ...allocation,
      spentAmountUsd: allocation.spentAmountUsd + amountUsd,
      remainingAmountUsd: allocation.remainingAmountUsd - amountUsd,
    };
    this.allocations.set(allocationId, updated);
    this.spendRecords.push({ allocationId, amount: amountUsd, description, spentAt: new Date() });
  }

  getTreasuryAllocation(allocationId: string): TreasuryAllocation | undefined {
    return this.allocations.get(allocationId);
  }

  listTreasuryAllocations(): TreasuryAllocation[] {
    return Array.from(this.allocations.values());
  }

  getTotalTreasuryValueUsd(): number {
    return this.treasuryBalanceUsd;
  }

  depositToTreasury(amountUsd: number): void {
    this.treasuryBalanceUsd += amountUsd;
  }

  getLayerStatus(): MonetaryTreasuryLayerStatus {
    const policies = Array.from(this.policies.values());
    const allocations = Array.from(this.allocations.values());
    const avgEmission = policies.length > 0
      ? policies.reduce((s, p) => s + p.currentEmissionRate, 0) / policies.length
      : 0;
    const avgReserve = policies.length > 0
      ? policies.reduce((s, p) => s + p.reserveRatio, 0) / policies.length
      : 0;
    const avgCollateralization = policies.length > 0
      ? policies.reduce((s, p) => s + p.collateralizationRatio, 0) / policies.length
      : 0;
    return {
      treasuryValueUsd: this.treasuryBalanceUsd,
      currentEmissionRate: avgEmission,
      reserveRatio: avgReserve,
      collateralizationRatio: avgCollateralization,
      allocationCount: allocations.length,
      activePolicies: policies.length,
    };
  }

  onEvent(callback: ACMSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: ACMSEvent['type'], layer: ACMSEvent['layer'], data: Record<string, unknown>): void {
    const event: ACMSEvent = { type, layer, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createMonetaryTreasuryLayerManager(): DefaultMonetaryTreasuryLayerManager {
  return new DefaultMonetaryTreasuryLayerManager();
}
