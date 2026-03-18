/**
 * TONAIAgent - Adaptive Emission Controller (Issue #123)
 *
 * Replaces fixed tokenomics with an adaptive emission model. Handles:
 * - Inflation during growth phases
 * - Deflation during stress periods
 * - Token burns during high profitability
 * - Incentive boosts for liquidity gaps
 */

import type {
  EmissionState,
  EmissionPhase,
  EmissionEvent,
  EmissionControlConfig,
  EmissionAdjustment,
  EmissionMechanism,
  MonetaryPolicyEvent,
  MonetaryPolicyEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface AdaptiveEmissionController {
  // State
  getEmissionState(): EmissionState;
  getCurrentPhase(): EmissionPhase;

  // Apply policy output
  applyAdjustment(
    adjustment: EmissionAdjustment,
    policyOutputId?: string
  ): EmissionEvent;

  // Manual operations
  mintTokens(amount: number, reason: string, txHash?: string): EmissionEvent;
  burnTokens(amount: number, reason: string, txHash?: string): EmissionEvent;

  // History
  getEventHistory(limit?: number): EmissionEvent[];
  getTotalMinted(): number;
  getTotalBurned(): number;

  // Config
  getConfig(): EmissionControlConfig;
  updateConfig(config: Partial<EmissionControlConfig>): void;

  // Events
  onEvent(callback: MonetaryPolicyEventCallback): () => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_EMISSION_CONFIG: EmissionControlConfig = {
  baseDailyRate: 100_000,          // 100K tokens/day base rate
  maxDailyRate: 200_000,           // 200K tokens/day maximum
  minDailyRate: 10_000,            // 10K tokens/day minimum
  maxAdjustmentPercent: 30,        // Max 30% change per adjustment
  adjustmentFrequencyDays: 7,      // Weekly adjustments
  burnEnabled: true,
  maxBurnPercent: 20,              // Burn up to 20% of daily emission
  phaseThresholds: {
    growthStabilityIndex: 70,
    stressVolatility: 0.6,
    profitMargin: 0.5,
    liquidityGapDepth: 30,
  },
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAdaptiveEmissionController implements AdaptiveEmissionController {
  private config: EmissionControlConfig;
  private state: EmissionState;
  private readonly events: EmissionEvent[] = [];
  private readonly eventCallbacks: MonetaryPolicyEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<EmissionControlConfig>) {
    this.config = { ...DEFAULT_EMISSION_CONFIG, ...config };
    this.state = {
      currentDailyRate: this.config.baseDailyRate,
      currentInflationRate: this.annualizeRate(this.config.baseDailyRate, 1_000_000_000),
      totalMinted: 0,
      totalBurned: 0,
      netCirculating: 0,
      emissionPhase: 'stable',
      phaseSince: new Date(),
      nextReviewAt: new Date(Date.now() + this.config.adjustmentFrequencyDays * 24 * 60 * 60 * 1000),
    };
  }

  private nextId(): string {
    return `em-${++this.idCounter}-${Date.now()}`;
  }

  private emit(type: MonetaryPolicyEvent['type'], data: Record<string, unknown>): void {
    const event: MonetaryPolicyEvent = { type, data, timestamp: new Date() };
    for (const cb of this.eventCallbacks) cb(event);
  }

  private annualizeRate(dailyRate: number, totalSupply: number): number {
    return totalSupply > 0 ? ((dailyRate * 365) / totalSupply) * 100 : 0;
  }

  private mechanismToPhase(mechanism: EmissionMechanism): EmissionPhase {
    const map: Record<EmissionMechanism, EmissionPhase> = {
      inflation: 'growth',
      deflation: 'stress',
      burn: 'profit',
      incentive_boost: 'gap',
      stable: 'stable',
    };
    return map[mechanism];
  }

  private clampRate(rate: number): number {
    return Math.min(this.config.maxDailyRate, Math.max(this.config.minDailyRate, rate));
  }

  getEmissionState(): EmissionState {
    return { ...this.state };
  }

  getCurrentPhase(): EmissionPhase {
    return this.state.emissionPhase;
  }

  applyAdjustment(adjustment: EmissionAdjustment, policyOutputId?: string): EmissionEvent {
    const clampedAdjustment = Math.max(
      -this.config.maxAdjustmentPercent,
      Math.min(this.config.maxAdjustmentPercent, adjustment.adjustmentPercent)
    );

    const newRate = this.clampRate(
      this.state.currentDailyRate * (1 + clampedAdjustment / 100)
    );

    const prevPhase = this.state.emissionPhase;
    const newPhase = this.mechanismToPhase(adjustment.mechanism);

    this.state.currentDailyRate = newRate;
    this.state.currentInflationRate = this.annualizeRate(newRate, this.state.netCirculating || 1_000_000_000);
    this.state.emissionPhase = newPhase;
    this.state.nextReviewAt = new Date(
      Date.now() + this.config.adjustmentFrequencyDays * 24 * 60 * 60 * 1000
    );

    if (newPhase !== prevPhase) {
      this.state.phaseSince = new Date();
      this.emit('emission.phase_changed', {
        previousPhase: prevPhase,
        newPhase,
        adjustmentPercent: clampedAdjustment,
      });
    }

    const event: EmissionEvent = {
      id: this.nextId(),
      type: 'adjust',
      amount: Math.abs(newRate - (adjustment.currentRate || newRate)),
      mechanism: adjustment.mechanism,
      triggerReason: adjustment.rationale,
      policyOutputId,
      executedAt: new Date(),
    };
    this.events.push(event);

    this.emit('emission.adjusted', {
      eventId: event.id,
      previousRate: adjustment.currentRate,
      newRate,
      adjustmentPercent: clampedAdjustment,
      mechanism: adjustment.mechanism,
      phase: newPhase,
    });

    // Handle burn if applicable
    if (adjustment.mechanism === 'burn' && adjustment.burnAmount && this.config.burnEnabled) {
      const burnAmount = Math.min(
        adjustment.burnAmount,
        (newRate * this.config.maxBurnPercent) / 100
      );
      if (burnAmount > 0) {
        this.burnTokens(burnAmount, `Automatic burn from monetary policy: ${adjustment.rationale}`);
      }
    }

    return event;
  }

  mintTokens(amount: number, reason: string, txHash?: string): EmissionEvent {
    if (amount <= 0) throw new Error('Mint amount must be positive');

    this.state.totalMinted += amount;
    this.state.netCirculating += amount;

    const event: EmissionEvent = {
      id: this.nextId(),
      type: 'mint',
      amount,
      mechanism: this.state.emissionPhase === 'growth' ? 'inflation' : 'stable',
      triggerReason: reason,
      executedAt: new Date(),
      txHash,
    };
    this.events.push(event);

    this.emit('emission.tokens_minted', { eventId: event.id, amount, reason, txHash });
    return event;
  }

  burnTokens(amount: number, reason: string, txHash?: string): EmissionEvent {
    if (amount <= 0) throw new Error('Burn amount must be positive');
    if (!this.config.burnEnabled) throw new Error('Token burning is disabled');

    this.state.totalBurned += amount;
    this.state.netCirculating = Math.max(0, this.state.netCirculating - amount);

    const event: EmissionEvent = {
      id: this.nextId(),
      type: 'burn',
      amount,
      mechanism: 'burn',
      triggerReason: reason,
      executedAt: new Date(),
      txHash,
    };
    this.events.push(event);

    this.emit('emission.tokens_burned', { eventId: event.id, amount, reason, txHash });
    return event;
  }

  getEventHistory(limit?: number): EmissionEvent[] {
    const sorted = [...this.events].sort(
      (a, b) => b.executedAt.getTime() - a.executedAt.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getTotalMinted(): number {
    return this.state.totalMinted;
  }

  getTotalBurned(): number {
    return this.state.totalBurned;
  }

  getConfig(): EmissionControlConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<EmissionControlConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onEvent(callback: MonetaryPolicyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }
}

export function createAdaptiveEmissionController(
  config?: Partial<EmissionControlConfig>
): DefaultAdaptiveEmissionController {
  return new DefaultAdaptiveEmissionController(config);
}
