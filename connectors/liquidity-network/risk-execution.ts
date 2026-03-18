/**
 * TONAIAgent - Risk-Controlled Execution
 *
 * Provides institutional-grade risk controls for liquidity network execution:
 * - Prime brokerage risk limit enforcement
 * - Real-time exposure monitoring and checks
 * - Pre-trade and post-trade risk validation
 * - Automated circuit breakers and suspension
 */

import {
  ExecutionRiskProfile,
  ExecutionRiskLimits,
  ExecutionRiskCheck,
  LiquidityNetworkEvent,
  LiquidityNetworkEventCallback,
} from './types';

export interface CreateRiskProfileParams {
  name: string;
  ownerId: string;
  limits?: Partial<ExecutionRiskLimits>;
}

export interface UpdateRiskLimitsParams {
  maxOrderSize?: string;
  maxDailyVolume?: string;
  maxExposurePerPair?: string;
  maxSlippage?: number;
  maxConcentrationPercent?: number;
  priceDeviationThreshold?: number;
}

export interface PreTradeRiskCheckParams {
  profileId: string;
  pair: string;
  orderAmount: string;
  estimatedSlippage: number;
  estimatedPrice: string;
  referencePrice?: string;
}

export interface PostTradeUpdateParams {
  profileId: string;
  pair: string;
  filledAmount: string;
  actualSlippage: number;
}

export interface RiskSummary {
  profileId: string;
  ownerId: string;
  utilizationPercent: number;
  currentDailyVolume: string;
  maxDailyVolume: string;
  pairsAtConcentrationLimit: string[];
  status: ExecutionRiskProfile['status'];
  generatedAt: Date;
}

export interface RiskControlledExecutionManager {
  createProfile(params: CreateRiskProfileParams): ExecutionRiskProfile;
  getProfile(profileId: string): ExecutionRiskProfile | undefined;
  listProfiles(): ExecutionRiskProfile[];
  updateLimits(profileId: string, params: UpdateRiskLimitsParams): ExecutionRiskProfile;
  suspendProfile(profileId: string, reason?: string): void;
  reactivateProfile(profileId: string): void;

  checkPreTrade(params: PreTradeRiskCheckParams): ExecutionRiskCheck;
  recordPostTrade(params: PostTradeUpdateParams): void;

  getRiskSummary(profileId: string): RiskSummary;
  resetDailyVolume(profileId: string): void;

  onEvent(callback: LiquidityNetworkEventCallback): void;
}

export class DefaultRiskControlledExecutionManager implements RiskControlledExecutionManager {
  private profiles: Map<string, ExecutionRiskProfile> = new Map();
  private eventCallbacks: LiquidityNetworkEventCallback[] = [];

  createProfile(params: CreateRiskProfileParams): ExecutionRiskProfile {
    const profileId = this.generateId('risk');
    const now = new Date();
    const profile: ExecutionRiskProfile = {
      id: profileId,
      name: params.name,
      ownerId: params.ownerId,
      limits: {
        maxOrderSize: '1000000',
        maxDailyVolume: '10000000',
        maxExposurePerPair: '5000000',
        maxSlippage: 0.01,
        maxConcentrationPercent: 30,
        priceDeviationThreshold: 0.05,
        ...params.limits,
      },
      currentDailyVolume: '0',
      currentExposures: {},
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(profileId, profile);
    return profile;
  }

  getProfile(profileId: string): ExecutionRiskProfile | undefined {
    return this.profiles.get(profileId);
  }

  listProfiles(): ExecutionRiskProfile[] {
    return Array.from(this.profiles.values());
  }

  updateLimits(profileId: string, params: UpdateRiskLimitsParams): ExecutionRiskProfile {
    const profile = this.requireProfile(profileId);
    profile.limits = { ...profile.limits, ...params };
    profile.updatedAt = new Date();
    this.profiles.set(profileId, profile);
    return profile;
  }

  suspendProfile(profileId: string, reason?: string): void {
    const profile = this.requireProfile(profileId);
    profile.status = 'suspended';
    profile.updatedAt = new Date();
    this.profiles.set(profileId, profile);
    this.emitEvent('risk_limit_exceeded', 'risk_profile', profileId, { reason: reason ?? 'manual_suspension' });
  }

  reactivateProfile(profileId: string): void {
    const profile = this.requireProfile(profileId);
    profile.status = 'active';
    profile.updatedAt = new Date();
    this.profiles.set(profileId, profile);
  }

  checkPreTrade(params: PreTradeRiskCheckParams): ExecutionRiskCheck {
    const profile = this.requireProfile(params.profileId);
    const violations: string[] = [];
    const warnings: string[] = [];
    const now = new Date();

    if (profile.status !== 'active') {
      violations.push(`Risk profile is ${profile.status}`);
    }

    // Check order size
    const orderAmount = parseFloat(params.orderAmount);
    const maxOrderSize = parseFloat(profile.limits.maxOrderSize);
    if (orderAmount > maxOrderSize) {
      violations.push(
        `Order size ${params.orderAmount} exceeds max order size ${profile.limits.maxOrderSize}`
      );
    }

    // Check daily volume
    const dailyVolume = parseFloat(profile.currentDailyVolume);
    const maxDailyVolume = parseFloat(profile.limits.maxDailyVolume);
    if (dailyVolume + orderAmount > maxDailyVolume) {
      violations.push(
        `Order would exceed daily volume limit. Current: ${profile.currentDailyVolume}, Limit: ${profile.limits.maxDailyVolume}`
      );
    }

    // Check per-pair exposure
    const currentExposure = parseFloat(profile.currentExposures[params.pair] ?? '0');
    const maxPairExposure = parseFloat(profile.limits.maxExposurePerPair);
    if (currentExposure + orderAmount > maxPairExposure) {
      violations.push(
        `Pair exposure limit exceeded for ${params.pair}. Current: ${currentExposure}, Limit: ${profile.limits.maxExposurePerPair}`
      );
    }

    // Check slippage
    if (params.estimatedSlippage > profile.limits.maxSlippage) {
      violations.push(
        `Estimated slippage ${(params.estimatedSlippage * 100).toFixed(2)}% exceeds max allowed ${(profile.limits.maxSlippage * 100).toFixed(2)}%`
      );
    }

    // Check price deviation if reference price provided
    if (params.referencePrice) {
      const estimatedPrice = parseFloat(params.estimatedPrice);
      const referencePrice = parseFloat(params.referencePrice);
      if (referencePrice > 0) {
        const deviation = Math.abs(estimatedPrice - referencePrice) / referencePrice;
        if (deviation > profile.limits.priceDeviationThreshold) {
          violations.push(
            `Price deviation ${(deviation * 100).toFixed(2)}% exceeds threshold ${(profile.limits.priceDeviationThreshold * 100).toFixed(2)}%`
          );
        }
      }
    }

    // Concentration warnings
    const totalExposure = Object.values(profile.currentExposures).reduce(
      (sum, exp) => sum + parseFloat(exp),
      0
    );
    if (totalExposure > 0) {
      const pairConcentration = ((currentExposure + orderAmount) / (totalExposure + orderAmount)) * 100;
      if (pairConcentration > profile.limits.maxConcentrationPercent * 0.8) {
        warnings.push(
          `Pair concentration for ${params.pair} is approaching limit: ${pairConcentration.toFixed(1)}%`
        );
      }
      if (pairConcentration > profile.limits.maxConcentrationPercent) {
        violations.push(
          `Pair concentration for ${params.pair} would exceed ${profile.limits.maxConcentrationPercent}%`
        );
      }
    }

    const passed = violations.length === 0;
    if (!passed) {
      this.emitEvent('risk_limit_exceeded', 'risk_profile', params.profileId, {
        violations,
        pair: params.pair,
        orderAmount: params.orderAmount,
      });
    } else if (warnings.length > 0) {
      this.emitEvent('risk_warning', 'risk_profile', params.profileId, {
        warnings,
        pair: params.pair,
      });
    }

    return { passed, violations, warnings, checkedAt: now };
  }

  recordPostTrade(params: PostTradeUpdateParams): void {
    const profile = this.requireProfile(params.profileId);

    const filled = parseFloat(params.filledAmount);
    profile.currentDailyVolume = (parseFloat(profile.currentDailyVolume) + filled).toString();

    const currentExposure = parseFloat(profile.currentExposures[params.pair] ?? '0');
    profile.currentExposures[params.pair] = (currentExposure + filled).toString();

    profile.updatedAt = new Date();
    this.profiles.set(params.profileId, profile);
  }

  getRiskSummary(profileId: string): RiskSummary {
    const profile = this.requireProfile(profileId);

    const dailyVolume = parseFloat(profile.currentDailyVolume);
    const maxDailyVolume = parseFloat(profile.limits.maxDailyVolume);
    const utilizationPercent = maxDailyVolume > 0 ? (dailyVolume / maxDailyVolume) * 100 : 0;

    const maxPairExposure = parseFloat(profile.limits.maxExposurePerPair);
    const pairsAtConcentrationLimit = Object.entries(profile.currentExposures)
      .filter(([, exposure]) => parseFloat(exposure) >= maxPairExposure * 0.95)
      .map(([pair]) => pair);

    return {
      profileId,
      ownerId: profile.ownerId,
      utilizationPercent,
      currentDailyVolume: profile.currentDailyVolume,
      maxDailyVolume: profile.limits.maxDailyVolume,
      pairsAtConcentrationLimit,
      status: profile.status,
      generatedAt: new Date(),
    };
  }

  resetDailyVolume(profileId: string): void {
    const profile = this.requireProfile(profileId);
    profile.currentDailyVolume = '0';
    profile.currentExposures = {};
    profile.updatedAt = new Date();
    this.profiles.set(profileId, profile);
  }

  onEvent(callback: LiquidityNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private requireProfile(profileId: string): ExecutionRiskProfile {
    const profile = this.profiles.get(profileId);
    if (!profile) throw new Error(`Risk profile not found: ${profileId}`);
    return profile;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(
    type: LiquidityNetworkEvent['type'],
    entityKind: string,
    entityId: string,
    payload: Record<string, unknown>
  ): void {
    const event: LiquidityNetworkEvent = {
      id: this.generateId('evt'),
      type,
      entityId,
      entityKind,
      payload,
      timestamp: new Date(),
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

export function createRiskControlledExecutionManager(): DefaultRiskControlledExecutionManager {
  return new DefaultRiskControlledExecutionManager();
}
