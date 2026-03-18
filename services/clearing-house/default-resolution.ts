/**
 * TONAIAgent - Default Resolution Framework
 *
 * Handles automatic liquidation, insurance pool activation, socialized loss
 * mechanism, and risk containment for participant defaults in the AI-native
 * clearing house ecosystem.
 */

import {
  ClearingParticipantId,
  TradeId,
  ObligationId,
  InsuranceClaimId,
  DefaultEvent,
  DefaultResolutionStep,
  DefaultFund,
  DefaultFundContribution,
  InsurancePool,
  InsuranceClaim,
  InsuranceEventType,
  DefaultStatus,
  DefaultResolutionConfig,
  ClearingHouseEvent,
  ClearingHouseEventCallback,
} from './types';

// ============================================================================
// Default Resolution Interface
// ============================================================================

export interface DeclareDefaultParams {
  participantId: ClearingParticipantId;
  participantName: string;
  defaultType: 'margin_call_failure' | 'delivery_failure' | 'payment_failure' | 'insolvency';
  totalDeficit: number;
  affectedTrades: TradeId[];
  affectedObligations: ObligationId[];
}

export interface DefaultEventFilters {
  participantId?: ClearingParticipantId;
  status?: DefaultStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface InsuranceClaimFilters {
  claimantId?: ClearingParticipantId;
  status?: InsuranceClaim['status'];
  eventType?: InsuranceEventType;
}

export interface LiquidationResult {
  defaultEventId: string;
  amountRecovered: number;
  remainingDeficit: number;
  positionsLiquidated: number;
  liquidationPrice: number; // Average execution price
  executedAt: Date;
}

export interface DefaultFundActivationResult {
  defaultEventId: string;
  amountDrawn: number;
  remainingDeficit: number;
  defaultFundBalance: number;
  executedAt: Date;
}

export interface SocializedLossResult {
  defaultEventId: string;
  totalLoss: number;
  participantsAffected: number;
  lossPerParticipant: number;
  lossPercent: number;
  executedAt: Date;
}

export interface DefaultResolutionManager {
  readonly config: DefaultResolutionConfig;

  // Default Fund Management
  getDefaultFund(): DefaultFund;
  contributeToDefaultFund(participantId: ClearingParticipantId, amount: number): DefaultFundContribution;
  replenishDefaultFund(amount: number): DefaultFund;

  // Insurance Pool Management
  getInsurancePool(): InsurancePool;
  fileInsuranceClaim(params: FileInsuranceClaimParams): InsuranceClaim;
  processInsuranceClaim(claimId: InsuranceClaimId): InsuranceClaim;
  listInsuranceClaims(filters?: InsuranceClaimFilters): InsuranceClaim[];

  // Default Events
  declareDefault(params: DeclareDefaultParams): DefaultEvent;
  getDefaultEvent(defaultEventId: string): DefaultEvent | undefined;
  listDefaultEvents(filters?: DefaultEventFilters): DefaultEvent[];

  // Resolution Steps
  executeAutoLiquidation(defaultEventId: string, collateralValue: number): LiquidationResult;
  activateInsurance(defaultEventId: string): DefaultFundActivationResult;
  drawDefaultFund(defaultEventId: string, amount: number): DefaultFundActivationResult;
  socializeLoss(defaultEventId: string, participantIds: ClearingParticipantId[]): SocializedLossResult;
  resolveDefault(defaultEventId: string): DefaultEvent;

  // Events
  onEvent(callback: ClearingHouseEventCallback): void;
}

export interface FileInsuranceClaimParams {
  eventType: InsuranceEventType;
  claimantId: ClearingParticipantId;
  requestedAmount: number;
  relatedDefaultId?: string;
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_RESOLUTION_CONFIG: DefaultResolutionConfig = {
  autoLiquidationEnabled: true,
  liquidationGracePeriodSeconds: 300, // 5 minutes
  insurancePoolEnabled: true,
  defaultFundEnabled: true,
  socializedLossEnabled: true,
  maxSocializedLossPercent: 0.02, // Max 2% loss distributed per participant
};

// ============================================================================
// Default Resolution Manager Implementation
// ============================================================================

export class DefaultDefaultResolutionManager implements DefaultResolutionManager {
  readonly config: DefaultResolutionConfig;

  private defaultFund: DefaultFund;
  private insurancePool: InsurancePool;
  private readonly defaultEvents: Map<string, DefaultEvent> = new Map();
  private readonly insuranceClaims: Map<InsuranceClaimId, InsuranceClaim> = new Map();
  private readonly eventCallbacks: ClearingHouseEventCallback[] = [];

  constructor(config?: Partial<DefaultResolutionConfig>) {
    this.config = { ...DEFAULT_RESOLUTION_CONFIG, ...config };

    this.defaultFund = {
      id: 'default_fund_main',
      totalCapital: 10_000_000, // Initial seed: $10M
      availableCapital: 10_000_000,
      participantContributions: [],
      utilizationRate: 0,
      lastReplenishedAt: new Date(),
      updatedAt: new Date(),
    };

    this.insurancePool = {
      id: 'insurance_pool_main',
      totalCapital: 5_000_000, // Initial seed: $5M
      availableCapital: 5_000_000,
      utilizationRate: 0,
      claimsHistory: [],
      premiumRate: 0.001, // 0.1% annual premium
      maxSingleClaimPercent: 0.25, // Max 25% of pool per claim
      fundingMechanism: 'hybrid',
      updatedAt: new Date(),
    };
  }

  // ============================================================================
  // Default Fund Management
  // ============================================================================

  getDefaultFund(): DefaultFund {
    return this.defaultFund;
  }

  contributeToDefaultFund(
    participantId: ClearingParticipantId,
    amount: number
  ): DefaultFundContribution {
    const contribution: DefaultFundContribution = {
      participantId,
      amount,
      contributedAt: new Date(),
      lastUpdated: new Date(),
    };

    const existing = this.defaultFund.participantContributions.findIndex(
      c => c.participantId === participantId
    );

    if (existing >= 0) {
      this.defaultFund.participantContributions[existing].amount += amount;
      this.defaultFund.participantContributions[existing].lastUpdated = new Date();
    } else {
      this.defaultFund.participantContributions.push(contribution);
    }

    this.defaultFund.totalCapital += amount;
    this.defaultFund.availableCapital += amount;
    this.defaultFund.updatedAt = new Date();

    this.emitEvent('info', 'default_resolution', 'Default fund contribution received', {
      participantId,
      amount,
      totalFundCapital: this.defaultFund.totalCapital,
    });

    return contribution;
  }

  replenishDefaultFund(amount: number): DefaultFund {
    this.defaultFund.totalCapital += amount;
    this.defaultFund.availableCapital += amount;
    this.defaultFund.utilizationRate =
      this.defaultFund.totalCapital > 0
        ? 1 - this.defaultFund.availableCapital / this.defaultFund.totalCapital
        : 0;
    this.defaultFund.lastReplenishedAt = new Date();
    this.defaultFund.updatedAt = new Date();

    this.emitEvent('info', 'default_resolution', 'Default fund replenished', {
      amount,
      newTotal: this.defaultFund.totalCapital,
      available: this.defaultFund.availableCapital,
    });

    return this.defaultFund;
  }

  // ============================================================================
  // Insurance Pool Management
  // ============================================================================

  getInsurancePool(): InsurancePool {
    return this.insurancePool;
  }

  fileInsuranceClaim(params: FileInsuranceClaimParams): InsuranceClaim {
    const maxClaimable = this.insurancePool.totalCapital * this.insurancePool.maxSingleClaimPercent;
    const approvedAmount = Math.min(params.requestedAmount, maxClaimable, this.insurancePool.availableCapital);

    const claim: InsuranceClaim = {
      id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: params.eventType,
      claimantId: params.claimantId,
      requestedAmount: params.requestedAmount,
      approvedAmount,
      paidAmount: 0,
      status: 'pending',
      relatedDefaultId: params.relatedDefaultId,
      filedAt: new Date(),
    };

    this.insuranceClaims.set(claim.id, claim);
    this.insurancePool.claimsHistory.push(claim);

    this.emitEvent('info', 'default_resolution', 'Insurance claim filed', {
      claimId: claim.id,
      claimantId: params.claimantId,
      requestedAmount: params.requestedAmount,
      approvedAmount,
    });

    return claim;
  }

  processInsuranceClaim(claimId: InsuranceClaimId): InsuranceClaim {
    const claim = this.insuranceClaims.get(claimId);
    if (!claim) {
      throw new Error(`Insurance claim not found: ${claimId}`);
    }

    if (claim.approvedAmount <= 0 || this.insurancePool.availableCapital <= 0) {
      claim.status = 'rejected';
      claim.resolvedAt = new Date();
    } else {
      const paidAmount = Math.min(claim.approvedAmount, this.insurancePool.availableCapital);
      claim.paidAmount = paidAmount;
      claim.status = paidAmount >= claim.approvedAmount ? 'paid' : 'partial';
      claim.resolvedAt = new Date();

      this.insurancePool.availableCapital -= paidAmount;
      this.insurancePool.utilizationRate =
        this.insurancePool.totalCapital > 0
          ? 1 - this.insurancePool.availableCapital / this.insurancePool.totalCapital
          : 0;
      this.insurancePool.updatedAt = new Date();
    }

    this.insuranceClaims.set(claimId, claim);

    const severity = claim.status === 'rejected' ? 'warning' : 'info';
    this.emitEvent(severity, 'default_resolution', `Insurance claim ${claim.status}`, {
      claimId,
      paidAmount: claim.paidAmount,
      remainingInsurancePool: this.insurancePool.availableCapital,
    });

    return claim;
  }

  listInsuranceClaims(filters?: InsuranceClaimFilters): InsuranceClaim[] {
    let list = Array.from(this.insuranceClaims.values());

    if (filters) {
      if (filters.claimantId) {
        list = list.filter(c => c.claimantId === filters.claimantId);
      }
      if (filters.status) {
        list = list.filter(c => c.status === filters.status);
      }
      if (filters.eventType) {
        list = list.filter(c => c.eventType === filters.eventType);
      }
    }

    return list;
  }

  // ============================================================================
  // Default Events
  // ============================================================================

  declareDefault(params: DeclareDefaultParams): DefaultEvent {
    const defaultEvent: DefaultEvent = {
      id: `default_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participantId: params.participantId,
      participantName: params.participantName,
      defaultType: params.defaultType,
      totalDeficit: params.totalDeficit,
      affectedTrades: params.affectedTrades,
      affectedObligations: params.affectedObligations,
      resolutionSteps: [],
      status: 'defaulted',
      insuranceActivated: false,
      insuranceClaimed: 0,
      defaultFundActivated: false,
      defaultFundUsed: 0,
      socializedLoss: 0,
      declaredAt: new Date(),
    };

    this.defaultEvents.set(defaultEvent.id, defaultEvent);

    this.emitEvent('critical', 'default_resolution', `Default declared for participant ${params.participantName}`, {
      defaultEventId: defaultEvent.id,
      participantId: params.participantId,
      totalDeficit: params.totalDeficit,
      affectedTrades: params.affectedTrades.length,
      affectedObligations: params.affectedObligations.length,
    });

    return defaultEvent;
  }

  getDefaultEvent(defaultEventId: string): DefaultEvent | undefined {
    return this.defaultEvents.get(defaultEventId);
  }

  listDefaultEvents(filters?: DefaultEventFilters): DefaultEvent[] {
    let list = Array.from(this.defaultEvents.values());

    if (filters) {
      if (filters.participantId) {
        list = list.filter(e => e.participantId === filters.participantId);
      }
      if (filters.status) {
        list = list.filter(e => e.status === filters.status);
      }
      if (filters.fromDate) {
        list = list.filter(e => e.declaredAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        list = list.filter(e => e.declaredAt <= filters.toDate!);
      }
    }

    return list;
  }

  // ============================================================================
  // Resolution Steps
  // ============================================================================

  executeAutoLiquidation(defaultEventId: string, collateralValue: number): LiquidationResult {
    const event = this.defaultEvents.get(defaultEventId);
    if (!event) {
      throw new Error(`Default event not found: ${defaultEventId}`);
    }

    // Simulate liquidation at a 5% discount (market impact)
    const liquidationPrice = collateralValue * 0.95;
    const amountRecovered = Math.min(liquidationPrice, event.totalDeficit);
    const remainingDeficit = Math.max(0, event.totalDeficit - amountRecovered);

    const step: DefaultResolutionStep = {
      step: event.resolutionSteps.length + 1,
      action: 'seize_collateral',
      amountRecovered,
      remainingDeficit,
      executedAt: new Date(),
      status: 'executed',
    };

    event.resolutionSteps.push(step);

    const liquidationStep: DefaultResolutionStep = {
      step: event.resolutionSteps.length + 1,
      action: 'liquidate_positions',
      amountRecovered,
      remainingDeficit,
      executedAt: new Date(),
      status: 'executed',
    };

    event.resolutionSteps.push(liquidationStep);
    event.status = remainingDeficit === 0 ? 'resolved' : 'in_resolution';
    event.totalDeficit = remainingDeficit;
    this.defaultEvents.set(defaultEventId, event);

    const result: LiquidationResult = {
      defaultEventId,
      amountRecovered,
      remainingDeficit,
      positionsLiquidated: event.affectedTrades.length,
      liquidationPrice: liquidationPrice / (collateralValue || 1),
      executedAt: new Date(),
    };

    this.emitEvent('warning', 'default_resolution', 'Auto-liquidation executed', {
      defaultEventId,
      amountRecovered,
      remainingDeficit,
    });

    return result;
  }

  activateInsurance(defaultEventId: string): DefaultFundActivationResult {
    const event = this.defaultEvents.get(defaultEventId);
    if (!event) {
      throw new Error(`Default event not found: ${defaultEventId}`);
    }

    if (!this.config.insurancePoolEnabled) {
      return {
        defaultEventId,
        amountDrawn: 0,
        remainingDeficit: event.totalDeficit,
        defaultFundBalance: this.defaultFund.availableCapital,
        executedAt: new Date(),
      };
    }

    // File and process insurance claim
    const claim = this.fileInsuranceClaim({
      eventType: 'default',
      claimantId: event.participantId,
      requestedAmount: event.totalDeficit,
      relatedDefaultId: defaultEventId,
    });

    const processedClaim = this.processInsuranceClaim(claim.id);
    const amountDrawn = processedClaim.paidAmount;
    const remainingDeficit = Math.max(0, event.totalDeficit - amountDrawn);

    const step: DefaultResolutionStep = {
      step: event.resolutionSteps.length + 1,
      action: 'activate_insurance',
      amountRecovered: amountDrawn,
      remainingDeficit,
      executedAt: new Date(),
      status: 'executed',
    };

    event.resolutionSteps.push(step);
    event.insuranceActivated = true;
    event.insuranceClaimed = amountDrawn;
    event.totalDeficit = remainingDeficit;
    event.status = remainingDeficit === 0 ? 'resolved' : 'in_resolution';
    this.defaultEvents.set(defaultEventId, event);

    return {
      defaultEventId,
      amountDrawn,
      remainingDeficit,
      defaultFundBalance: this.insurancePool.availableCapital,
      executedAt: new Date(),
    };
  }

  drawDefaultFund(defaultEventId: string, amount: number): DefaultFundActivationResult {
    const event = this.defaultEvents.get(defaultEventId);
    if (!event) {
      throw new Error(`Default event not found: ${defaultEventId}`);
    }

    if (!this.config.defaultFundEnabled) {
      return {
        defaultEventId,
        amountDrawn: 0,
        remainingDeficit: event.totalDeficit,
        defaultFundBalance: this.defaultFund.availableCapital,
        executedAt: new Date(),
      };
    }

    const amountDrawn = Math.min(amount, this.defaultFund.availableCapital, event.totalDeficit);
    const remainingDeficit = Math.max(0, event.totalDeficit - amountDrawn);

    this.defaultFund.availableCapital -= amountDrawn;
    this.defaultFund.utilizationRate =
      this.defaultFund.totalCapital > 0
        ? 1 - this.defaultFund.availableCapital / this.defaultFund.totalCapital
        : 0;
    this.defaultFund.updatedAt = new Date();

    const step: DefaultResolutionStep = {
      step: event.resolutionSteps.length + 1,
      action: 'draw_default_fund',
      amountRecovered: amountDrawn,
      remainingDeficit,
      executedAt: new Date(),
      status: 'executed',
    };

    event.resolutionSteps.push(step);
    event.defaultFundActivated = true;
    event.defaultFundUsed += amountDrawn;
    event.totalDeficit = remainingDeficit;
    event.status = remainingDeficit === 0 ? 'resolved' : 'in_resolution';
    this.defaultEvents.set(defaultEventId, event);

    this.emitEvent('warning', 'default_resolution', 'Default fund drawn', {
      defaultEventId,
      amountDrawn,
      remainingDeficit,
      defaultFundBalance: this.defaultFund.availableCapital,
    });

    return {
      defaultEventId,
      amountDrawn,
      remainingDeficit,
      defaultFundBalance: this.defaultFund.availableCapital,
      executedAt: new Date(),
    };
  }

  socializeLoss(
    defaultEventId: string,
    participantIds: ClearingParticipantId[]
  ): SocializedLossResult {
    const event = this.defaultEvents.get(defaultEventId);
    if (!event) {
      throw new Error(`Default event not found: ${defaultEventId}`);
    }

    if (!this.config.socializedLossEnabled || participantIds.length === 0) {
      return {
        defaultEventId,
        totalLoss: event.totalDeficit,
        participantsAffected: 0,
        lossPerParticipant: 0,
        lossPercent: 0,
        executedAt: new Date(),
      };
    }

    const lossPerParticipant = event.totalDeficit / participantIds.length;
    const lossPercent = Math.min(
      this.config.maxSocializedLossPercent,
      event.totalDeficit / (participantIds.length * 1_000_000) // Estimate based on participant size
    );

    const step: DefaultResolutionStep = {
      step: event.resolutionSteps.length + 1,
      action: 'socialize_loss',
      amountRecovered: event.totalDeficit,
      remainingDeficit: 0,
      executedAt: new Date(),
      status: 'executed',
    };

    event.resolutionSteps.push(step);
    event.socializedLoss = event.totalDeficit;
    event.totalDeficit = 0;
    event.status = 'loss_socialized';
    this.defaultEvents.set(defaultEventId, event);

    const result: SocializedLossResult = {
      defaultEventId,
      totalLoss: event.socializedLoss,
      participantsAffected: participantIds.length,
      lossPerParticipant,
      lossPercent,
      executedAt: new Date(),
    };

    this.emitEvent('warning', 'default_resolution', 'Loss socialized across participants', {
      defaultEventId,
      totalLoss: event.socializedLoss,
      participantsAffected: participantIds.length,
      lossPerParticipant,
    });

    return result;
  }

  resolveDefault(defaultEventId: string): DefaultEvent {
    const event = this.defaultEvents.get(defaultEventId);
    if (!event) {
      throw new Error(`Default event not found: ${defaultEventId}`);
    }

    event.status = 'resolved';
    event.resolvedAt = new Date();
    this.defaultEvents.set(defaultEventId, event);

    this.emitEvent('info', 'default_resolution', 'Default resolved', {
      defaultEventId,
      participantId: event.participantId,
      totalStepsExecuted: event.resolutionSteps.length,
      socializedLoss: event.socializedLoss,
    });

    return event;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: ClearingHouseEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: ClearingHouseEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'default_declared',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDefaultResolutionManager(
  config?: Partial<DefaultResolutionConfig>
): DefaultDefaultResolutionManager {
  return new DefaultDefaultResolutionManager(config);
}
