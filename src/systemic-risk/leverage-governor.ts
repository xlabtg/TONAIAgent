/**
 * Dynamic Leverage Governor
 * Protocol-wide volatility-adjusted leverage limits, market-stress-triggered
 * reductions, and correlation-based scaling.
 */

import {
  type FundId,
  type AgentId,
  type AssetId,
  type MarketRegime,
  type LeverageAdjustmentReason,
  type ProtocolLeverageLimit,
  type LeverageGovernorState,
  type LeverageAdjustmentEvent,
  type LeverageGovernorConfig,
  type SystemicRiskEvent,
  type SystemicRiskEventCallback,
} from './types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LeverageCheckResult {
  agentId: AgentId;
  requestedLeverage: number;
  allowedLeverage: number;
  approved: boolean;
  reason: string;
}

export interface DynamicLeverageGovernor {
  getState(): LeverageGovernorState;
  getEffectiveMaxLeverage(assetId?: AssetId): number;
  checkLeverage(agentId: AgentId, requestedLeverage: number, assetId?: AssetId): LeverageCheckResult;
  updateMarketConditions(volatilityIndex: number, marketRegime: MarketRegime): void;
  updateAssetVolatility(assetId: AssetId, dailyVolatility: number): void;
  manualOverride(newMaxLeverage: number, affectedFunds: FundId[], affectedAgents: AgentId[]): void;
  getAdjustmentHistory(): LeverageAdjustmentEvent[];
  onEvent(callback: SystemicRiskEventCallback): void;
}

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_LEVERAGE_CONFIG: LeverageGovernorConfig = {
  baseMaxLeverage: 10,
  crisisMaxLeverage: 2,
  bearMaxLeverage: 5,
  neutralMaxLeverage: 8,
  bullMaxLeverage: 10,
  volatilityScalingFactor: 0.5,
  correlationScalingFactor: 0.3,
};

// ─── Implementation ───────────────────────────────────────────────────────────

export class DefaultDynamicLeverageGovernor implements DynamicLeverageGovernor {
  private readonly config: LeverageGovernorConfig;
  private volatilityIndex: number = 0.15;  // 15% annualised vol baseline
  private marketRegime: MarketRegime = 'neutral';
  private assetVolatilities: Map<AssetId, number> = new Map();
  private adjustmentHistory: LeverageAdjustmentEvent[] = [];
  private eventCallbacks: SystemicRiskEventCallback[] = [];
  private eventIdCounter = 0;
  private currentEffectiveMaxLeverage: number;

  constructor(config?: Partial<LeverageGovernorConfig>) {
    this.config = { ...DEFAULT_LEVERAGE_CONFIG, ...config };
    this.currentEffectiveMaxLeverage = this.config.neutralMaxLeverage;
  }

  getState(): LeverageGovernorState {
    const assetLimits = this.buildAssetLimits();
    return {
      globalMaxLeverage: this.config.baseMaxLeverage,
      currentEffectiveMaxLeverage: this.currentEffectiveMaxLeverage,
      marketRegime: this.marketRegime,
      volatilityIndex: this.volatilityIndex,
      adjustmentReason: this.deriveAdjustmentReason(),
      assetLimits,
      lastUpdated: Date.now(),
    };
  }

  getEffectiveMaxLeverage(assetId?: AssetId): number {
    if (assetId && this.assetVolatilities.has(assetId)) {
      const assetVol = this.assetVolatilities.get(assetId)!;
      return this.computeVolatilityAdjustedLeverage(this.currentEffectiveMaxLeverage, assetVol);
    }
    return this.currentEffectiveMaxLeverage;
  }

  checkLeverage(
    agentId: AgentId,
    requestedLeverage: number,
    assetId?: AssetId,
  ): LeverageCheckResult {
    const maxAllowed = this.getEffectiveMaxLeverage(assetId);
    const approved = requestedLeverage <= maxAllowed;
    return {
      agentId,
      requestedLeverage,
      allowedLeverage: Math.min(requestedLeverage, maxAllowed),
      approved,
      reason: approved
        ? 'Leverage within protocol limits'
        : `Requested ${requestedLeverage}x exceeds current limit of ${maxAllowed.toFixed(2)}x (regime: ${this.marketRegime})`,
    };
  }

  updateMarketConditions(volatilityIndex: number, marketRegime: MarketRegime): void {
    const previousMax = this.currentEffectiveMaxLeverage;
    this.volatilityIndex = volatilityIndex;
    this.marketRegime = marketRegime;
    this.currentEffectiveMaxLeverage = this.computeRegimeLeverage(marketRegime, volatilityIndex);

    if (Math.abs(this.currentEffectiveMaxLeverage - previousMax) > 0.01) {
      const event: LeverageAdjustmentEvent = {
        id: `lev-adj-${++this.eventIdCounter}`,
        timestamp: Date.now(),
        previousMaxLeverage: previousMax,
        newMaxLeverage: this.currentEffectiveMaxLeverage,
        reason: this.deriveAdjustmentReason(),
        marketRegime,
        volatilityIndex,
        affectedFunds: [],
        affectedAgents: [],
      };
      this.adjustmentHistory.push(event);
      this.emit({
        type: 'leverage_adjusted',
        timestamp: Date.now(),
        payload: event,
      });
    }
  }

  updateAssetVolatility(assetId: AssetId, dailyVolatility: number): void {
    this.assetVolatilities.set(assetId, dailyVolatility);
  }

  manualOverride(
    newMaxLeverage: number,
    affectedFunds: FundId[],
    affectedAgents: AgentId[],
  ): void {
    const previousMax = this.currentEffectiveMaxLeverage;
    this.currentEffectiveMaxLeverage = newMaxLeverage;

    const event: LeverageAdjustmentEvent = {
      id: `lev-adj-${++this.eventIdCounter}`,
      timestamp: Date.now(),
      previousMaxLeverage: previousMax,
      newMaxLeverage,
      reason: 'manual_override',
      marketRegime: this.marketRegime,
      volatilityIndex: this.volatilityIndex,
      affectedFunds,
      affectedAgents,
    };
    this.adjustmentHistory.push(event);
    this.emit({
      type: 'leverage_adjusted',
      timestamp: Date.now(),
      payload: event,
    });
  }

  getAdjustmentHistory(): LeverageAdjustmentEvent[] {
    return [...this.adjustmentHistory];
  }

  onEvent(callback: SystemicRiskEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private computeRegimeLeverage(regime: MarketRegime, volatilityIndex: number): number {
    let regimeMax: number;
    switch (regime) {
      case 'crisis': regimeMax = this.config.crisisMaxLeverage; break;
      case 'bear':   regimeMax = this.config.bearMaxLeverage;   break;
      case 'neutral': regimeMax = this.config.neutralMaxLeverage; break;
      case 'bull':   regimeMax = this.config.bullMaxLeverage;   break;
    }

    // Additional reduction for high volatility
    const volReduction = volatilityIndex * this.config.volatilityScalingFactor * regimeMax;
    const adjusted = regimeMax - volReduction;
    return Math.max(1, Math.min(regimeMax, adjusted));
  }

  private computeVolatilityAdjustedLeverage(baseLeverage: number, dailyVol: number): number {
    // Annualised vol approximation: dailyVol * sqrt(252)
    const annualisedVol = dailyVol * Math.sqrt(252);
    const reduction = annualisedVol * this.config.volatilityScalingFactor * baseLeverage;
    return Math.max(1, baseLeverage - reduction);
  }

  private buildAssetLimits(): ProtocolLeverageLimit[] {
    return Array.from(this.assetVolatilities.entries()).map(([assetId, dailyVol]) => {
      const volAdjMax = this.computeVolatilityAdjustedLeverage(
        this.currentEffectiveMaxLeverage,
        dailyVol,
      );
      return {
        assetId,
        maxLeverage: this.currentEffectiveMaxLeverage,
        currentVolatility: dailyVol,
        volatilityAdjustedMaxLeverage: volAdjMax,
        marketRegime: this.marketRegime,
      };
    });
  }

  private deriveAdjustmentReason(): LeverageAdjustmentReason {
    if (this.marketRegime === 'crisis') return 'market_stress';
    if (this.volatilityIndex > 0.40) return 'volatility_spike';
    if (this.marketRegime === 'bear') return 'market_stress';
    return 'normal_operations';
  }

  private emit(event: SystemicRiskEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }
}

export function createDynamicLeverageGovernor(
  config?: Partial<LeverageGovernorConfig>,
): DynamicLeverageGovernor {
  return new DefaultDynamicLeverageGovernor(config);
}
