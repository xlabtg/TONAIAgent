/**
 * TONAIAgent - SGIA Capital Adequacy & Reserve Model
 *
 * Manages capital adequacy frameworks, reserve requirements, and liquidity buffers
 * for sovereign-grade institutional participants. Implements Basel III-aligned
 * and sovereign-grade capital adequacy modeling with automated breach detection.
 *
 * This is Domain 5 of the Sovereign-Grade Institutional Alignment (SGIA) framework.
 */

import {
  CapitalAdequacyModel,
  ReserveRequirement,
  LiquidityBuffer,
  BufferAsset,
  LiquidityStressResult,
  CapitalModelId,
  SovereignEntityId,
  ReserveAssetClass,
  CapitalAdequacyConfig,
  SGIAEvent,
  SGIAEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CAPITAL_ADEQUACY_CONFIG: CapitalAdequacyConfig = {
  enableCapitalAdequacyModeling: true,
  enableReserveRequirements: true,
  enableLiquidityBuffers: true,
  minimumCARPercent: 8.0, // Basel III minimum
  minimumLiquidityBufferPercent: 10.0,
  enableStressTests: true,
  stressTestFrequency: 'weekly',
  breachAutoAction: 'alert',
};

// ============================================================================
// Interface
// ============================================================================

export interface CapitalAdequacyAndReserveModel {
  readonly config: CapitalAdequacyConfig;

  // Capital Adequacy Models
  createCapitalModel(params: CreateCapitalModelParams): CapitalAdequacyModel;
  getCapitalModel(id: CapitalModelId): CapitalAdequacyModel | undefined;
  getCapitalModelByEntity(entityId: SovereignEntityId): CapitalAdequacyModel | undefined;
  listCapitalModels(filters?: CapitalModelFilters): CapitalAdequacyModel[];
  updateCapitalModel(id: CapitalModelId, updates: Partial<CapitalAdequacyModel>): CapitalAdequacyModel;
  recalculateCapitalAdequacy(id: CapitalModelId): CapitalAdequacyModel;

  // Reserve Requirements
  setReserveRequirement(params: SetReserveRequirementParams): ReserveRequirement;
  getReserveRequirement(id: string): ReserveRequirement | undefined;
  listReserveRequirements(filters?: ReserveRequirementFilters): ReserveRequirement[];
  checkReserveRequirement(id: string, currentAmountUSD: number): ReserveRequirement;

  // Liquidity Buffers
  createLiquidityBuffer(params: CreateLiquidityBufferParams): LiquidityBuffer;
  getLiquidityBuffer(id: string): LiquidityBuffer | undefined;
  getLiquidityBufferByEntity(entityId: SovereignEntityId): LiquidityBuffer | undefined;
  listLiquidityBuffers(filters?: LiquidityBufferFilters): LiquidityBuffer[];
  addBufferAsset(bufferId: string, asset: BufferAsset): LiquidityBuffer;
  runStressTest(bufferId: string, scenario: string, shockPercent: number): LiquidityStressResult;

  // Monitoring
  getBreaches(): CapitalBreach[];
  resolveBreachAlert(entityId: SovereignEntityId): void;

  // Events
  onEvent(callback: SGIAEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface CreateCapitalModelParams {
  entityId: SovereignEntityId;
  entityName: string;
  modelType: CapitalAdequacyModel['modelType'];
  totalCapitalUSD: number;
  tier1CapitalUSD: number;
  tier2CapitalUSD: number;
  riskWeightedAssetsUSD: number;
  liquidityCoverageRatio: number;
  netStableFundingRatio: number;
  minimumCARRequired?: number;
}

export interface CapitalModelFilters {
  entityId?: SovereignEntityId;
  modelType?: CapitalAdequacyModel['modelType'];
  status?: CapitalAdequacyModel['status'];
}

export interface SetReserveRequirementParams {
  entityId: SovereignEntityId;
  requirementType: ReserveRequirement['requirementType'];
  minimumRatioPercent: number;
  minimumAmountUSD: number;
  assetClasses: ReserveAssetClass[];
  reviewFrequency?: ReserveRequirement['reviewFrequency'];
  enforced?: boolean;
}

export interface ReserveRequirementFilters {
  entityId?: SovereignEntityId;
  requirementType?: ReserveRequirement['requirementType'];
  isBreached?: boolean;
  enforced?: boolean;
}

export interface CreateLiquidityBufferParams {
  entityId: SovereignEntityId;
  bufferSizeUSD: number;
}

export interface LiquidityBufferFilters {
  entityId?: SovereignEntityId;
  isBreached?: boolean;
}

export interface CapitalBreach {
  entityId: SovereignEntityId;
  breachType: 'capital_adequacy' | 'reserve_requirement' | 'liquidity_buffer';
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  description: string;
  currentValue: number;
  requiredValue: number;
  detectedAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultCapitalAdequacyAndReserveModel implements CapitalAdequacyAndReserveModel {
  readonly config: CapitalAdequacyConfig;

  private readonly capitalModels = new Map<CapitalModelId, CapitalAdequacyModel>();
  private readonly capitalModelsByEntity = new Map<SovereignEntityId, CapitalModelId>();
  private readonly reserveRequirements = new Map<string, ReserveRequirement>();
  private readonly liquidityBuffers = new Map<string, LiquidityBuffer>();
  private readonly liquidityBuffersByEntity = new Map<SovereignEntityId, string>();
  private readonly breachAlerts = new Map<SovereignEntityId, CapitalBreach[]>();
  private readonly eventCallbacks: SGIAEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<CapitalAdequacyConfig>) {
    this.config = { ...DEFAULT_CAPITAL_ADEQUACY_CONFIG, ...config };
  }

  // ============================================================================
  // Capital Adequacy Models
  // ============================================================================

  createCapitalModel(params: CreateCapitalModelParams): CapitalAdequacyModel {
    const capitalAdequacyRatio = params.riskWeightedAssetsUSD > 0
      ? (params.totalCapitalUSD / params.riskWeightedAssetsUSD) * 100
      : 0;

    const tier1Ratio = params.riskWeightedAssetsUSD > 0
      ? (params.tier1CapitalUSD / params.riskWeightedAssetsUSD) * 100
      : 0;

    const leverageRatio = params.totalCapitalUSD > 0
      ? (params.tier1CapitalUSD / params.totalCapitalUSD) * 100
      : 0;

    const minimumCAR = params.minimumCARRequired ?? this.config.minimumCARPercent;
    const bufferCapital = Math.max(0, params.totalCapitalUSD - (params.riskWeightedAssetsUSD * minimumCAR / 100));

    const isBreachWarning = capitalAdequacyRatio < minimumCAR + 2.5; // 2.5% buffer
    const isBreachCritical = capitalAdequacyRatio < minimumCAR;

    let status: CapitalAdequacyModel['status'];
    if (isBreachCritical) status = 'breach';
    else if (isBreachWarning) status = 'warning';
    else status = 'compliant';

    const model: CapitalAdequacyModel = {
      id: this.generateId('cap'),
      entityId: params.entityId,
      entityName: params.entityName,
      modelType: params.modelType,
      totalCapitalUSD: params.totalCapitalUSD,
      tier1CapitalUSD: params.tier1CapitalUSD,
      tier2CapitalUSD: params.tier2CapitalUSD,
      riskWeightedAssetsUSD: params.riskWeightedAssetsUSD,
      capitalAdequacyRatio,
      tier1Ratio,
      leverageRatio,
      liquidityCoverageRatio: params.liquidityCoverageRatio,
      netStableFundingRatio: params.netStableFundingRatio,
      minimumCARRequired: minimumCAR,
      bufferCapitalUSD: bufferCapital,
      status,
      calculatedAt: new Date(),
      nextReviewAt: new Date(Date.now() + 30 * 86400000), // 30 days
    };

    this.capitalModels.set(model.id, model);
    this.capitalModelsByEntity.set(params.entityId, model.id);

    if (isBreachCritical) {
      this.recordBreach(params.entityId, {
        entityId: params.entityId,
        breachType: 'capital_adequacy',
        severity: 'critical',
        description: `Capital Adequacy Ratio (${capitalAdequacyRatio.toFixed(2)}%) is below minimum (${minimumCAR}%)`,
        currentValue: capitalAdequacyRatio,
        requiredValue: minimumCAR,
        detectedAt: new Date(),
      });

      this.emitEvent({
        id: this.generateId('evt'),
        type: 'reserve_breach_detected',
        severity: 'critical',
        source: 'CapitalAdequacyAndReserveModel',
        message: `Capital adequacy breach for entity ${params.entityId}: CAR=${capitalAdequacyRatio.toFixed(2)}%`,
        data: { entityId: params.entityId, ratio: capitalAdequacyRatio, minimum: minimumCAR },
        timestamp: new Date(),
      });
    } else {
      this.emitEvent({
        id: this.generateId('evt'),
        type: 'capital_model_created',
        severity: 'info',
        source: 'CapitalAdequacyAndReserveModel',
        message: `Capital adequacy model created for ${params.entityName}: CAR=${capitalAdequacyRatio.toFixed(2)}%`,
        data: { modelId: model.id, entityId: params.entityId, status },
        timestamp: new Date(),
      });
    }

    return model;
  }

  getCapitalModel(id: CapitalModelId): CapitalAdequacyModel | undefined {
    return this.capitalModels.get(id);
  }

  getCapitalModelByEntity(entityId: SovereignEntityId): CapitalAdequacyModel | undefined {
    const id = this.capitalModelsByEntity.get(entityId);
    return id ? this.capitalModels.get(id) : undefined;
  }

  listCapitalModels(filters?: CapitalModelFilters): CapitalAdequacyModel[] {
    let results = Array.from(this.capitalModels.values());

    if (filters?.entityId) results = results.filter(m => m.entityId === filters.entityId);
    if (filters?.modelType) results = results.filter(m => m.modelType === filters.modelType);
    if (filters?.status) results = results.filter(m => m.status === filters.status);

    return results;
  }

  updateCapitalModel(id: CapitalModelId, updates: Partial<CapitalAdequacyModel>): CapitalAdequacyModel {
    const model = this.capitalModels.get(id);
    if (!model) throw new Error(`Capital model not found: ${id}`);

    Object.assign(model, updates, { id });
    return model;
  }

  recalculateCapitalAdequacy(id: CapitalModelId): CapitalAdequacyModel {
    const model = this.capitalModels.get(id);
    if (!model) throw new Error(`Capital model not found: ${id}`);

    const newModel = this.createCapitalModel({
      entityId: model.entityId,
      entityName: model.entityName,
      modelType: model.modelType,
      totalCapitalUSD: model.totalCapitalUSD,
      tier1CapitalUSD: model.tier1CapitalUSD,
      tier2CapitalUSD: model.tier2CapitalUSD,
      riskWeightedAssetsUSD: model.riskWeightedAssetsUSD,
      liquidityCoverageRatio: model.liquidityCoverageRatio,
      netStableFundingRatio: model.netStableFundingRatio,
      minimumCARRequired: model.minimumCARRequired,
    });

    // Update the original model in place
    Object.assign(model, newModel, { id });
    this.capitalModels.delete(newModel.id);
    this.capitalModels.set(id, model);
    this.capitalModelsByEntity.set(model.entityId, id);

    return model;
  }

  // ============================================================================
  // Reserve Requirements
  // ============================================================================

  setReserveRequirement(params: SetReserveRequirementParams): ReserveRequirement {
    const requirement: ReserveRequirement = {
      id: this.generateId('resreq'),
      entityId: params.entityId,
      requirementType: params.requirementType,
      minimumRatioPercent: params.minimumRatioPercent,
      currentRatioPercent: 0,
      minimumAmountUSD: params.minimumAmountUSD,
      currentAmountUSD: 0,
      assetClasses: params.assetClasses,
      isBreached: false,
      enforced: params.enforced ?? true,
      reviewFrequency: params.reviewFrequency ?? 'daily',
      lastCheckedAt: new Date(),
    };

    this.reserveRequirements.set(requirement.id, requirement);
    return requirement;
  }

  getReserveRequirement(id: string): ReserveRequirement | undefined {
    return this.reserveRequirements.get(id);
  }

  listReserveRequirements(filters?: ReserveRequirementFilters): ReserveRequirement[] {
    let results = Array.from(this.reserveRequirements.values());

    if (filters?.entityId) results = results.filter(r => r.entityId === filters.entityId);
    if (filters?.requirementType) results = results.filter(r => r.requirementType === filters.requirementType);
    if (filters?.isBreached !== undefined) results = results.filter(r => r.isBreached === filters.isBreached);
    if (filters?.enforced !== undefined) results = results.filter(r => r.enforced === filters.enforced);

    return results;
  }

  checkReserveRequirement(id: string, currentAmountUSD: number): ReserveRequirement {
    const requirement = this.reserveRequirements.get(id);
    if (!requirement) throw new Error(`Reserve requirement not found: ${id}`);

    requirement.currentAmountUSD = currentAmountUSD;
    requirement.currentRatioPercent = requirement.minimumAmountUSD > 0
      ? (currentAmountUSD / requirement.minimumAmountUSD) * 100
      : 100;

    const wasBreached = requirement.isBreached;
    requirement.isBreached = currentAmountUSD < requirement.minimumAmountUSD;
    requirement.lastCheckedAt = new Date();

    if (requirement.isBreached) {
      const deficit = requirement.minimumAmountUSD - currentAmountUSD;
      requirement.breachSeverity = deficit > requirement.minimumAmountUSD * 0.5 ? 'critical'
        : deficit > requirement.minimumAmountUSD * 0.2 ? 'severe'
        : deficit > requirement.minimumAmountUSD * 0.1 ? 'moderate'
        : 'minor';

      if (!wasBreached) {
        this.recordBreach(requirement.entityId, {
          entityId: requirement.entityId,
          breachType: 'reserve_requirement',
          severity: requirement.breachSeverity,
          description: `Reserve requirement breach: ${requirement.requirementType}. Current: $${currentAmountUSD}, Required: $${requirement.minimumAmountUSD}`,
          currentValue: currentAmountUSD,
          requiredValue: requirement.minimumAmountUSD,
          detectedAt: new Date(),
        });

        this.emitEvent({
          id: this.generateId('evt'),
          type: 'reserve_breach_detected',
          severity: requirement.breachSeverity === 'critical' ? 'critical' : 'warning',
          source: 'CapitalAdequacyAndReserveModel',
          message: `Reserve requirement breach for entity ${requirement.entityId}: $${currentAmountUSD} < $${requirement.minimumAmountUSD}`,
          data: { requirementId: id, entityId: requirement.entityId, currentAmount: currentAmountUSD, minimumAmount: requirement.minimumAmountUSD },
          timestamp: new Date(),
        });
      }
    } else {
      requirement.breachSeverity = undefined;
    }

    return requirement;
  }

  // ============================================================================
  // Liquidity Buffers
  // ============================================================================

  createLiquidityBuffer(params: CreateLiquidityBufferParams): LiquidityBuffer {
    const buffer: LiquidityBuffer = {
      id: this.generateId('lbuf'),
      entityId: params.entityId,
      bufferSizeUSD: params.bufferSizeUSD,
      usedUSD: 0,
      availableUSD: params.bufferSizeUSD,
      utilizationRate: 0,
      highQualityLiquidAssets: [],
      lastUpdatedAt: new Date(),
    };

    this.liquidityBuffers.set(buffer.id, buffer);
    this.liquidityBuffersByEntity.set(params.entityId, buffer.id);
    return buffer;
  }

  getLiquidityBuffer(id: string): LiquidityBuffer | undefined {
    return this.liquidityBuffers.get(id);
  }

  getLiquidityBufferByEntity(entityId: SovereignEntityId): LiquidityBuffer | undefined {
    const id = this.liquidityBuffersByEntity.get(entityId);
    return id ? this.liquidityBuffers.get(id) : undefined;
  }

  listLiquidityBuffers(filters?: LiquidityBufferFilters): LiquidityBuffer[] {
    let results = Array.from(this.liquidityBuffers.values());

    if (filters?.entityId) results = results.filter(b => b.entityId === filters.entityId);
    if (filters?.isBreached !== undefined) {
      const minBuffer = this.config.minimumLiquidityBufferPercent / 100;
      results = results.filter(b =>
        filters.isBreached
          ? b.utilizationRate > (1 - minBuffer)
          : b.utilizationRate <= (1 - minBuffer)
      );
    }

    return results;
  }

  addBufferAsset(bufferId: string, asset: BufferAsset): LiquidityBuffer {
    const buffer = this.liquidityBuffers.get(bufferId);
    if (!buffer) throw new Error(`Liquidity buffer not found: ${bufferId}`);

    buffer.highQualityLiquidAssets.push(asset);
    buffer.bufferSizeUSD += asset.usdValue;
    buffer.availableUSD += asset.usdValue;
    buffer.utilizationRate = buffer.bufferSizeUSD > 0 ? buffer.usedUSD / buffer.bufferSizeUSD : 0;
    buffer.lastUpdatedAt = new Date();

    return buffer;
  }

  runStressTest(bufferId: string, scenario: string, shockPercent: number): LiquidityStressResult {
    const buffer = this.liquidityBuffers.get(bufferId);
    if (!buffer) throw new Error(`Liquidity buffer not found: ${bufferId}`);

    const haircut = shockPercent / 100;
    const stressedValue = buffer.highQualityLiquidAssets.reduce((acc, asset) => {
      return acc + asset.usdValue * (1 - haircut * (1 - asset.liquidityScore / 100));
    }, 0);

    const dailyOutflow = buffer.bufferSizeUSD * 0.05; // Assume 5% daily outflow
    const survivalDays = dailyOutflow > 0 ? Math.floor(stressedValue / dailyOutflow) : 999;
    const passed = survivalDays >= 30; // Must survive 30 days minimum

    const result: LiquidityStressResult = {
      scenario,
      stressedValueUSD: stressedValue,
      survivalDays,
      passed,
      deficitUSD: passed ? undefined : dailyOutflow * 30 - stressedValue,
      simulatedAt: new Date(),
    };

    buffer.stressTestResult = result;
    return result;
  }

  // ============================================================================
  // Monitoring
  // ============================================================================

  getBreaches(): CapitalBreach[] {
    const allBreaches: CapitalBreach[] = [];
    for (const breaches of this.breachAlerts.values()) {
      allBreaches.push(...breaches);
    }
    return allBreaches;
  }

  resolveBreachAlert(entityId: SovereignEntityId): void {
    this.breachAlerts.delete(entityId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private recordBreach(entityId: SovereignEntityId, breach: CapitalBreach): void {
    const existing = this.breachAlerts.get(entityId) ?? [];
    existing.push(breach);
    this.breachAlerts.set(entityId, existing);
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SGIAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: SGIAEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCapitalAdequacyAndReserveModel(
  config?: Partial<CapitalAdequacyConfig>
): DefaultCapitalAdequacyAndReserveModel {
  return new DefaultCapitalAdequacyAndReserveModel(config);
}

export default DefaultCapitalAdequacyAndReserveModel;
