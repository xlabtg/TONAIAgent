/**
 * TONAIAgent - AGFI Autonomous Monetary Infrastructure
 *
 * Expands the protocol treasury, emission control, and stability buffers into a
 * comprehensive multi-asset treasury, cross-chain reserve management, and
 * yield-backed stabilization system. Functions as the "AI Central Bank" for the
 * AGFI ecosystem.
 *
 * This is Pillar 4 of the AI-native Global Financial Infrastructure (AGFI).
 */

import {
  MultiAssetReserve,
  CrossChainReservePosition,
  YieldBackedStabilization,
  EmissionControl,
  ChainId,
  AutonomousMonetaryConfig,
  AGFIEvent,
  AGFIEventCallback,
  MonetaryAdjustmentType,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_MONETARY_CONFIG: AutonomousMonetaryConfig = {
  enableEmissionControl: true,
  enableCrossChainReserves: true,
  enableYieldBackedStabilization: true,
  reserveRebalanceFrequency: 'daily',
  maxSingleChainExposurePercent: 40,
  minStabilityScore: 60,
};

// ============================================================================
// Autonomous Monetary Infrastructure Interface
// ============================================================================

export interface AutonomousMonetaryInfrastructure {
  readonly config: AutonomousMonetaryConfig;

  // Multi-Asset Reserve Management
  createReserve(params: CreateReserveParams): MultiAssetReserve;
  getReserve(id: string): MultiAssetReserve | undefined;
  listReserves(): MultiAssetReserve[];
  addReserveAsset(reserveId: string, params: AddReserveAssetParams): MultiAssetReserve;
  rebalanceReserve(reserveId: string): RebalanceReserveResult;
  getReserveSummary(): ReserveSummary;

  // Cross-Chain Reserve Positions
  createChainPosition(params: CreateChainPositionParams): CrossChainReservePosition;
  getChainPosition(id: string): CrossChainReservePosition | undefined;
  listChainPositions(filters?: ChainPositionFilters): CrossChainReservePosition[];
  withdrawChainPosition(id: string, amount: number): CrossChainReservePosition;

  // Yield-Backed Stabilization
  createStabilizationPool(params: CreateStabilizationPoolParams): YieldBackedStabilization;
  getStabilizationPool(id: string): YieldBackedStabilization | undefined;
  deployStabilizationCapital(poolId: string, amount: number, reason: string): StabilizationDeployment;
  harvestYield(poolId: string): YieldHarvestResult;

  // Emission Control
  createEmissionControl(params: CreateEmissionControlParams): EmissionControl;
  getEmissionControl(id: string): EmissionControl | undefined;
  listEmissionControls(): EmissionControl[];
  adjustEmission(id: string, newRate: number, reason: string): EmissionAdjustmentResult;
  triggerMonetaryAdjustment(params: MonetaryAdjustmentParams): MonetaryAdjustmentResult;

  // Analytics
  getMonetaryHealthScore(): MonetaryHealthScore;

  // Events
  onEvent(callback: AGFIEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface CreateReserveParams {
  name: string;
  initialAssets?: AddReserveAssetParams[];
  rebalanceThreshold?: number;
}

export interface AddReserveAssetParams {
  assetId: string;
  assetName: string;
  chain: ChainId;
  amount: number;
  usdValue: number;
  targetPercent: number;
  yieldRate?: number;
  custodian?: string;
}

export interface RebalanceReserveResult {
  reserveId: string;
  rebalancedAt: Date;
  assetAdjustments: AssetAdjustment[];
  totalValueBefore: number;
  totalValueAfter: number;
  stabilityScoreChange: number;
}

export interface AssetAdjustment {
  assetId: string;
  assetName: string;
  previousPercent: number;
  newPercent: number;
  targetPercent: number;
  amountAdjusted: number;
  action: 'buy' | 'sell' | 'hold';
}

export interface ReserveSummary {
  totalValueUSD: number;
  reserveCount: number;
  avgStabilityScore: number;
  avgLiquidityScore: number;
  avgDiversificationScore: number;
  needsRebalancing: number;
  generatedAt: Date;
}

export interface CreateChainPositionParams {
  chain: ChainId;
  protocol: string;
  assetId: string;
  amount: number;
  usdValue: number;
  yieldRate?: number;
  lockupPeriod?: number;
  withdrawalTime?: number;
  purpose?: CrossChainReservePosition['purpose'];
}

export interface ChainPositionFilters {
  chain?: ChainId;
  purpose?: CrossChainReservePosition['purpose'];
  minYieldRate?: number;
  maxRiskScore?: number;
}

export interface CreateStabilizationPoolParams {
  initialYieldReserve?: number;
  targetStabilizationRatio?: number;
  yieldSources?: Array<{
    protocolName: string;
    chain: ChainId;
    assetId: string;
    deployedCapital: number;
    annualYieldRate: number;
  }>;
}

export interface StabilizationDeployment {
  poolId: string;
  amount: number;
  reason: string;
  deployedAt: Date;
  expectedRecovery: Date;
  outcome: string;
}

export interface YieldHarvestResult {
  poolId: string;
  harvestedAt: Date;
  yieldSources: Array<{ protocol: string; harvested: number }>;
  totalHarvested: number;
  addedToStabilizationReserve: number;
}

export interface CreateEmissionControlParams {
  tokenAddress: string;
  chain: ChainId;
  currentEmissionRate: number;
  maxEmissionRate: number;
  minEmissionRate: number;
  adjustmentStep?: number;
  adjustmentFrequency?: EmissionControl['adjustmentFrequency'];
}

export interface EmissionAdjustmentResult {
  emissionControlId: string;
  previousRate: number;
  newRate: number;
  reason: string;
  adjustedAt: Date;
  projectedImpact: string;
}

export interface MonetaryAdjustmentParams {
  adjustmentType: MonetaryAdjustmentType;
  targetReserveId?: string;
  amount?: number;
  rateChange?: number;
  rationale: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
}

export interface MonetaryAdjustmentResult {
  id: string;
  adjustmentType: MonetaryAdjustmentType;
  executedAt: Date;
  amountAffected: number;
  rationale: string;
  outcome: string;
  metrics: Record<string, number>;
}

export interface MonetaryHealthScore {
  overallScore: number; // 0-100
  reserveStability: number; // 0-100
  emissionHealth: number; // 0-100
  yieldCoverage: number; // 0-100
  crossChainBalance: number; // 0-100
  issues: string[];
  recommendations: string[];
  generatedAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAutonomousMonetaryInfrastructure implements AutonomousMonetaryInfrastructure {
  readonly config: AutonomousMonetaryConfig;

  private readonly reserves = new Map<string, MultiAssetReserve>();
  private readonly chainPositions = new Map<string, CrossChainReservePosition>();
  private readonly stabilizationPools = new Map<string, YieldBackedStabilization>();
  private readonly emissionControls = new Map<string, EmissionControl>();
  private readonly eventCallbacks: AGFIEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<AutonomousMonetaryConfig>) {
    this.config = { ...DEFAULT_MONETARY_CONFIG, ...config };
  }

  // ============================================================================
  // Multi-Asset Reserve Management
  // ============================================================================

  createReserve(params: CreateReserveParams): MultiAssetReserve {
    const reserve: MultiAssetReserve = {
      id: this.generateId('res'),
      name: params.name,
      totalValueUSD: 0,
      assets: [],
      allocationTargets: [],
      rebalanceThreshold: params.rebalanceThreshold ?? 0.05,
      nextReviewAt: new Date(Date.now() + 86400000), // Tomorrow
      stabilityScore: 100,
      liquidityScore: 100,
      diversificationScore: 0,
    };

    if (params.initialAssets) {
      for (const asset of params.initialAssets) {
        this.addReserveAssetInternal(reserve, asset);
      }
    }

    this.reserves.set(reserve.id, reserve);
    return reserve;
  }

  getReserve(id: string): MultiAssetReserve | undefined {
    return this.reserves.get(id);
  }

  listReserves(): MultiAssetReserve[] {
    return Array.from(this.reserves.values());
  }

  addReserveAsset(reserveId: string, params: AddReserveAssetParams): MultiAssetReserve {
    const reserve = this.reserves.get(reserveId);
    if (!reserve) throw new Error(`Reserve not found: ${reserveId}`);
    return this.addReserveAssetInternal(reserve, params);
  }

  rebalanceReserve(reserveId: string): RebalanceReserveResult {
    const reserve = this.reserves.get(reserveId);
    if (!reserve) throw new Error(`Reserve not found: ${reserveId}`);

    const totalValue = reserve.totalValueUSD;
    const adjustments: AssetAdjustment[] = [];
    let stabilityChange = 0;

    for (const asset of reserve.assets) {
      const currentPct = totalValue > 0 ? (asset.usdValue / totalValue) * 100 : 0;
      const drift = Math.abs(currentPct - asset.targetPercent);

      if (drift > reserve.rebalanceThreshold * 100) {
        const targetValue = totalValue * (asset.targetPercent / 100);
        const amountDelta = targetValue - asset.usdValue;

        adjustments.push({
          assetId: asset.assetId,
          assetName: asset.assetName,
          previousPercent: currentPct,
          newPercent: asset.targetPercent,
          targetPercent: asset.targetPercent,
          amountAdjusted: Math.abs(amountDelta),
          action: amountDelta > 0 ? 'buy' : 'sell',
        });

        asset.usdValue = targetValue;
        asset.currentPercent = asset.targetPercent;
        stabilityChange += 2;
      }
    }

    reserve.stabilityScore = Math.min(100, reserve.stabilityScore + stabilityChange);
    reserve.lastRebalancedAt = new Date();
    reserve.nextReviewAt = new Date(Date.now() + 86400000);

    return {
      reserveId,
      rebalancedAt: new Date(),
      assetAdjustments: adjustments,
      totalValueBefore: totalValue,
      totalValueAfter: reserve.totalValueUSD,
      stabilityScoreChange: stabilityChange,
    };
  }

  getReserveSummary(): ReserveSummary {
    const reserves = Array.from(this.reserves.values());
    const totalValue = reserves.reduce((sum, r) => sum + r.totalValueUSD, 0);
    const avgStability = reserves.length > 0
      ? reserves.reduce((sum, r) => sum + r.stabilityScore, 0) / reserves.length
      : 0;
    const avgLiquidity = reserves.length > 0
      ? reserves.reduce((sum, r) => sum + r.liquidityScore, 0) / reserves.length
      : 0;
    const avgDiversification = reserves.length > 0
      ? reserves.reduce((sum, r) => sum + r.diversificationScore, 0) / reserves.length
      : 0;
    const needsRebalancing = reserves.filter(r => {
      const maxDrift = Math.max(...r.assets.map(a => Math.abs(a.currentPercent - a.targetPercent)));
      return maxDrift > r.rebalanceThreshold * 100;
    }).length;

    return {
      totalValueUSD: totalValue,
      reserveCount: reserves.length,
      avgStabilityScore: avgStability,
      avgLiquidityScore: avgLiquidity,
      avgDiversificationScore: avgDiversification,
      needsRebalancing,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Cross-Chain Reserve Positions
  // ============================================================================

  createChainPosition(params: CreateChainPositionParams): CrossChainReservePosition {
    const position: CrossChainReservePosition = {
      id: this.generateId('cpos'),
      chain: params.chain,
      protocol: params.protocol,
      assetId: params.assetId,
      amount: params.amount,
      usdValue: params.usdValue,
      yieldRate: params.yieldRate ?? 0,
      lockupPeriod: params.lockupPeriod ?? 0,
      withdrawalTime: params.withdrawalTime ?? 1,
      riskScore: this.estimatePositionRiskScore(params),
      purpose: params.purpose ?? 'liquidity_reserve',
      createdAt: new Date(),
    };

    this.chainPositions.set(position.id, position);
    return position;
  }

  getChainPosition(id: string): CrossChainReservePosition | undefined {
    return this.chainPositions.get(id);
  }

  listChainPositions(filters?: ChainPositionFilters): CrossChainReservePosition[] {
    let results = Array.from(this.chainPositions.values());

    if (filters?.chain) results = results.filter(p => p.chain === filters.chain);
    if (filters?.purpose) results = results.filter(p => p.purpose === filters.purpose);
    if (filters?.minYieldRate !== undefined) results = results.filter(p => p.yieldRate >= filters.minYieldRate!);
    if (filters?.maxRiskScore !== undefined) results = results.filter(p => p.riskScore <= filters.maxRiskScore!);

    return results;
  }

  withdrawChainPosition(id: string, amount: number): CrossChainReservePosition {
    const position = this.chainPositions.get(id);
    if (!position) throw new Error(`Chain position not found: ${id}`);
    if (amount > position.amount) throw new Error(`Withdrawal amount exceeds position: ${amount} > ${position.amount}`);

    position.amount -= amount;
    position.usdValue = position.amount > 0 ? (position.usdValue / (position.amount + amount)) * position.amount : 0;

    return position;
  }

  // ============================================================================
  // Yield-Backed Stabilization
  // ============================================================================

  createStabilizationPool(params: CreateStabilizationPoolParams): YieldBackedStabilization {
    const yieldSources = (params.yieldSources ?? []).map(s => ({
      ...s,
      accruedYield: 0,
    }));

    const totalCapital = yieldSources.reduce((sum, s) => sum + s.deployedCapital, 0);
    const estimatedAnnualYield = yieldSources.reduce((sum, s) => sum + s.deployedCapital * s.annualYieldRate, 0);
    const initialReserve = params.initialYieldReserve ?? estimatedAnnualYield;

    const pool: YieldBackedStabilization = {
      id: this.generateId('stab'),
      totalYieldReserve: initialReserve,
      deployedForStabilization: 0,
      availableForDeployment: initialReserve,
      yieldSources,
      stabilizationHistory: [],
      targetStabilizationRatio: params.targetStabilizationRatio ?? 0.05,
      currentStabilizationRatio: totalCapital > 0 ? initialReserve / totalCapital : 0,
    };

    this.stabilizationPools.set(pool.id, pool);
    return pool;
  }

  getStabilizationPool(id: string): YieldBackedStabilization | undefined {
    return this.stabilizationPools.get(id);
  }

  deployStabilizationCapital(poolId: string, amount: number, reason: string): StabilizationDeployment {
    const pool = this.stabilizationPools.get(poolId);
    if (!pool) throw new Error(`Stabilization pool not found: ${poolId}`);
    if (amount > pool.availableForDeployment) throw new Error(`Insufficient stabilization capital`);

    pool.deployedForStabilization += amount;
    pool.availableForDeployment -= amount;

    const event = {
      id: this.generateId('stev'),
      timestamp: new Date(),
      trigger: reason,
      capitalDeployed: amount,
      impact: 'Stabilization capital deployed',
      outcome: 'successful' as const,
    };
    pool.stabilizationHistory.push(event);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'monetary_adjustment_executed',
      severity: 'info',
      source: 'AutonomousMonetaryInfrastructure',
      message: `Stabilization capital deployed: ${amount} USD. Reason: ${reason}`,
      data: { poolId, amount, reason },
      timestamp: new Date(),
    });

    return {
      poolId,
      amount,
      reason,
      deployedAt: new Date(),
      expectedRecovery: new Date(Date.now() + 7 * 86400000), // 7 days
      outcome: 'Capital deployed for stabilization',
    };
  }

  harvestYield(poolId: string): YieldHarvestResult {
    const pool = this.stabilizationPools.get(poolId);
    if (!pool) throw new Error(`Stabilization pool not found: ${poolId}`);

    const harvestResults: Array<{ protocol: string; harvested: number }> = [];
    let totalHarvested = 0;

    for (const source of pool.yieldSources) {
      const daysSinceLastHarvest = source.lastHarvestAt
        ? (Date.now() - source.lastHarvestAt.getTime()) / 86400000
        : 30;
      const accruedYield = source.deployedCapital * (source.annualYieldRate / 365) * daysSinceLastHarvest;

      harvestResults.push({ protocol: source.protocolName, harvested: accruedYield });
      totalHarvested += accruedYield;
      source.accruedYield = 0;
      source.lastHarvestAt = new Date();
    }

    pool.totalYieldReserve += totalHarvested;
    pool.availableForDeployment += totalHarvested;

    return {
      poolId,
      harvestedAt: new Date(),
      yieldSources: harvestResults,
      totalHarvested,
      addedToStabilizationReserve: totalHarvested,
    };
  }

  // ============================================================================
  // Emission Control
  // ============================================================================

  createEmissionControl(params: CreateEmissionControlParams): EmissionControl {
    const control: EmissionControl = {
      id: this.generateId('emi'),
      tokenAddress: params.tokenAddress,
      chain: params.chain,
      currentEmissionRate: params.currentEmissionRate,
      targetEmissionRate: params.currentEmissionRate,
      maxEmissionRate: params.maxEmissionRate,
      minEmissionRate: params.minEmissionRate,
      adjustmentStep: params.adjustmentStep ?? 0.05,
      adjustmentFrequency: params.adjustmentFrequency ?? 'daily',
      triggerMetrics: [],
      nextReviewAt: new Date(Date.now() + 86400000),
    };

    this.emissionControls.set(control.id, control);
    return control;
  }

  getEmissionControl(id: string): EmissionControl | undefined {
    return this.emissionControls.get(id);
  }

  listEmissionControls(): EmissionControl[] {
    return Array.from(this.emissionControls.values());
  }

  adjustEmission(id: string, newRate: number, reason: string): EmissionAdjustmentResult {
    const control = this.emissionControls.get(id);
    if (!control) throw new Error(`Emission control not found: ${id}`);

    if (newRate < control.minEmissionRate || newRate > control.maxEmissionRate) {
      throw new Error(`New rate ${newRate} outside allowed range [${control.minEmissionRate}, ${control.maxEmissionRate}]`);
    }

    const previousRate = control.currentEmissionRate;
    control.currentEmissionRate = newRate;
    control.targetEmissionRate = newRate;
    control.lastAdjustedAt = new Date();
    control.nextReviewAt = new Date(Date.now() + 86400000);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'monetary_adjustment_executed',
      severity: 'info',
      source: 'AutonomousMonetaryInfrastructure',
      message: `Emission rate adjusted: ${previousRate} → ${newRate} tokens/day`,
      data: { emissionControlId: id, previousRate, newRate, reason },
      timestamp: new Date(),
    });

    return {
      emissionControlId: id,
      previousRate,
      newRate,
      reason,
      adjustedAt: new Date(),
      projectedImpact: `Annual supply change: ${Math.round((newRate - previousRate) * 365)} tokens`,
    };
  }

  triggerMonetaryAdjustment(params: MonetaryAdjustmentParams): MonetaryAdjustmentResult {
    const result: MonetaryAdjustmentResult = {
      id: this.generateId('madj'),
      adjustmentType: params.adjustmentType,
      executedAt: new Date(),
      amountAffected: params.amount ?? params.rateChange ?? 0,
      rationale: params.rationale,
      outcome: `${params.adjustmentType} executed successfully`,
      metrics: {},
    };

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'monetary_adjustment_executed',
      severity: params.priority === 'emergency' ? 'critical' : 'info',
      source: 'AutonomousMonetaryInfrastructure',
      message: `Monetary adjustment executed: ${params.adjustmentType}`,
      data: { adjustmentId: result.id, type: params.adjustmentType, priority: params.priority },
      timestamp: new Date(),
    });

    return result;
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  getMonetaryHealthScore(): MonetaryHealthScore {
    const reserves = Array.from(this.reserves.values());
    const stabilizationPools = Array.from(this.stabilizationPools.values());

    const reserveStability = reserves.length > 0
      ? reserves.reduce((sum, r) => sum + r.stabilityScore, 0) / reserves.length
      : 100;

    const emissionControls = Array.from(this.emissionControls.values());
    const emissionHealth = emissionControls.length > 0
      ? emissionControls.reduce((sum, e) => {
          const withinBounds = e.currentEmissionRate >= e.minEmissionRate && e.currentEmissionRate <= e.maxEmissionRate;
          return sum + (withinBounds ? 100 : 0);
        }, 0) / emissionControls.length
      : 100;

    const totalYieldReserve = stabilizationPools.reduce((sum, p) => sum + p.totalYieldReserve, 0);
    const totalReserveValue = reserves.reduce((sum, r) => sum + r.totalValueUSD, 0);
    const yieldCoverage = totalReserveValue > 0 ? Math.min(100, (totalYieldReserve / totalReserveValue) * 2000) : 50;

    const chainPositions = Array.from(this.chainPositions.values());
    const totalPositionValue = chainPositions.reduce((sum, p) => sum + p.usdValue, 0);
    const chainConcentration = this.computeChainConcentration(chainPositions, totalPositionValue);
    const crossChainBalance = Math.max(0, 100 - chainConcentration);

    const overallScore = (reserveStability + emissionHealth + yieldCoverage + crossChainBalance) / 4;

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (reserveStability < 60) {
      issues.push('Reserve stability is below target');
      recommendations.push('Rebalance reserves to align with target allocations');
    }
    if (yieldCoverage < 30) {
      issues.push('Yield coverage is insufficient for stabilization needs');
      recommendations.push('Increase yield-generating positions');
    }
    if (chainConcentration > 60) {
      issues.push('High chain concentration risk detected');
      recommendations.push('Diversify across additional chains');
    }

    return {
      overallScore,
      reserveStability,
      emissionHealth,
      yieldCoverage,
      crossChainBalance,
      issues,
      recommendations,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFIEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private addReserveAssetInternal(reserve: MultiAssetReserve, params: AddReserveAssetParams): MultiAssetReserve {
    const totalBefore = reserve.totalValueUSD;
    reserve.totalValueUSD += params.usdValue;

    reserve.assets.push({
      assetId: params.assetId,
      assetName: params.assetName,
      chain: params.chain,
      amount: params.amount,
      usdValue: params.usdValue,
      targetPercent: params.targetPercent,
      currentPercent: reserve.totalValueUSD > 0 ? (params.usdValue / reserve.totalValueUSD) * 100 : 100,
      yieldRate: params.yieldRate ?? 0,
      liquidityDepth: 'medium',
      custodian: params.custodian,
    });

    // Recalculate current percentages for all assets
    for (const asset of reserve.assets) {
      asset.currentPercent = reserve.totalValueUSD > 0 ? (asset.usdValue / reserve.totalValueUSD) * 100 : 0;
    }

    // Update diversification score
    reserve.diversificationScore = Math.min(100, reserve.assets.length * 10);

    // Reduce stability if adding unbalanced assets
    const drift = Math.abs(params.targetPercent - (reserve.totalValueUSD > 0 ? (params.usdValue / reserve.totalValueUSD) * 100 : 0));
    reserve.stabilityScore = Math.max(0, reserve.stabilityScore - drift);

    void totalBefore; // acknowledge param
    return reserve;
  }

  private estimatePositionRiskScore(params: CreateChainPositionParams): number {
    let score = 20; // Base risk
    if (params.chain !== 'ton') score += 10; // Cross-chain risk
    if (params.lockupPeriod && params.lockupPeriod > 30) score += 20; // Lockup risk
    if (params.withdrawalTime && params.withdrawalTime > 24) score += 15; // Illiquidity risk
    return Math.min(100, score);
  }

  private computeChainConcentration(positions: CrossChainReservePosition[], total: number): number {
    if (total === 0) return 0;
    const chainTotals = new Map<ChainId, number>();
    for (const pos of positions) {
      chainTotals.set(pos.chain, (chainTotals.get(pos.chain) ?? 0) + pos.usdValue);
    }
    const percentages = Array.from(chainTotals.values()).map(v => (v / total) * 100);
    const maxConcentration = Math.max(...percentages, 0);
    return maxConcentration;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAutonomousMonetaryInfrastructure(
  config?: Partial<AutonomousMonetaryConfig>
): DefaultAutonomousMonetaryInfrastructure {
  return new DefaultAutonomousMonetaryInfrastructure(config);
}

export default DefaultAutonomousMonetaryInfrastructure;
