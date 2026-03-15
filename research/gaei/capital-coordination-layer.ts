/**
 * TONAIAgent - GAEI Capital Coordination Layer
 *
 * Extends the existing Liquidity Network, Clearing House, and Monetary Policy
 * modules into a macro-level capital allocation and global efficiency optimization system.
 *
 * Capabilities:
 * - Macro-level capital allocation modeling
 * - Global capital efficiency optimization
 * - AI-assisted resource routing
 * - Cross-border capital flow management
 */

import {
  GAEIId,
  CapitalFlowId,
  EconomicNodeId,
  JurisdictionCode,
  CapitalFlowType,
  GlobalCapitalAllocation,
  MacroCapitalModel,
  RegionalCapitalDistribution,
  SectorCapitalDistribution,
  CapitalRoutingOptimization,
  CapitalCoordinationLayerConfig,
  GAEIEvent,
  GAEIEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface InitiateCapitalFlowParams {
  sourceNodeId: EconomicNodeId;
  destinationNodeId: EconomicNodeId;
  flowType: CapitalFlowType;
  amount: number;
  currency: string;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  allocationPurpose: string;
  priority?: 'standard' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}

export interface CapitalFlowFilters {
  sourceNodeId?: EconomicNodeId;
  destinationNodeId?: EconomicNodeId;
  flowType?: CapitalFlowType;
  status?: GlobalCapitalAllocation['status'];
  sourceJurisdiction?: JurisdictionCode;
  destinationJurisdiction?: JurisdictionCode;
  minAmount?: number;
  maxAmount?: number;
}

export interface ComputeRoutingParams {
  sourceNodeId: EconomicNodeId;
  destinationNodeId: EconomicNodeId;
  amount: number;
  optimizeFor?: 'cost' | 'speed' | 'efficiency';
}

export interface MacroModelFilters {
  minCapital?: number;
  maxCapital?: number;
}

export interface CapitalCoordinationLayerStatus {
  totalCapitalManaged: number;
  activeCapitalFlows: number;
  pendingCapitalFlows: number;
  settledCapitalFlows24h: number;
  averageSettlementTime: number;
  allocationEfficiencyIndex: number;
  crossBorderVolume24h: number;
}

export interface CapitalCoordinationLayer {
  // Capital Flow Management
  initiateCapitalFlow(params: InitiateCapitalFlowParams): GlobalCapitalAllocation;
  getCapitalFlow(flowId: CapitalFlowId): GlobalCapitalAllocation | undefined;
  listCapitalFlows(filters?: CapitalFlowFilters): GlobalCapitalAllocation[];
  settleCapitalFlow(flowId: CapitalFlowId): GlobalCapitalAllocation;
  cancelCapitalFlow(flowId: CapitalFlowId, reason: string): GlobalCapitalAllocation;

  // Macro Capital Modeling
  createMacroModel(name: string): MacroCapitalModel;
  getMacroModel(modelId: string): MacroCapitalModel | undefined;
  listMacroModels(filters?: MacroModelFilters): MacroCapitalModel[];
  updateMacroModel(modelId: string, updates: Partial<MacroCapitalModel>): MacroCapitalModel;
  optimizeMacroModel(modelId: string): MacroCapitalModel;

  // AI Routing Optimization
  computeOptimalRoute(params: ComputeRoutingParams): CapitalRoutingOptimization;
  listRoutingOptimizations(): CapitalRoutingOptimization[];

  // Regional & Sector Analysis
  getRegionalDistribution(): RegionalCapitalDistribution[];
  getSectorDistribution(): SectorCapitalDistribution[];
  rebalanceRegionalAllocation(region: string, targetPercent: number): void;

  // Layer Status & Events
  getLayerStatus(): CapitalCoordinationLayerStatus;
  onEvent(callback: GAEIEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultCapitalCoordinationLayer implements CapitalCoordinationLayer {
  private readonly capitalFlows: Map<CapitalFlowId, GlobalCapitalAllocation> = new Map();
  private readonly macroModels: Map<string, MacroCapitalModel> = new Map();
  private readonly routingOptimizations: Map<string, CapitalRoutingOptimization> = new Map();
  private readonly eventCallbacks: GAEIEventCallback[] = [];
  private readonly config: CapitalCoordinationLayerConfig;

  constructor(config?: Partial<CapitalCoordinationLayerConfig>) {
    this.config = {
      enableMacroModeling: true,
      enableAIOptimization: true,
      maxCrossBorderSettlementMinutes: 60,
      minAllocationEfficiencyScore: 70,
      capitalVelocityTarget: 0.8,
      reoptimizationFrequency: 'daily',
      ...config,
    };
  }

  // ============================================================================
  // Capital Flow Management
  // ============================================================================

  initiateCapitalFlow(params: InitiateCapitalFlowParams): GlobalCapitalAllocation {
    const flowId = `flow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Compute efficiency score based on route and parameters
    const efficiencyScore = this.computeEfficiencyScore(params);

    const flow: GlobalCapitalAllocation = {
      id: flowId,
      sourceNodeId: params.sourceNodeId,
      destinationNodeId: params.destinationNodeId,
      flowType: params.flowType,
      amount: params.amount,
      currency: params.currency,
      sourceJurisdiction: params.sourceJurisdiction,
      destinationJurisdiction: params.destinationJurisdiction,
      allocationPurpose: params.allocationPurpose,
      efficiencyScore,
      riskAdjustedReturn: this.computeRiskAdjustedReturn(params),
      status: 'pending',
      aiOptimized: this.config.enableAIOptimization,
      routingPath: this.computeRoutingPath(params),
      estimatedSettlementTime: this.estimateSettlementTime(params),
      initiatedAt: new Date(),
      metadata: params.metadata ?? {},
    };

    this.capitalFlows.set(flowId, flow);
    this.emitEvent('capital_flow_initiated', 'info', `Capital flow ${flowId} initiated`, { flow });

    return flow;
  }

  getCapitalFlow(flowId: CapitalFlowId): GlobalCapitalAllocation | undefined {
    return this.capitalFlows.get(flowId);
  }

  listCapitalFlows(filters?: CapitalFlowFilters): GlobalCapitalAllocation[] {
    let flows = Array.from(this.capitalFlows.values());

    if (filters) {
      if (filters.sourceNodeId) {
        flows = flows.filter((f) => f.sourceNodeId === filters.sourceNodeId);
      }
      if (filters.destinationNodeId) {
        flows = flows.filter((f) => f.destinationNodeId === filters.destinationNodeId);
      }
      if (filters.flowType) {
        flows = flows.filter((f) => f.flowType === filters.flowType);
      }
      if (filters.status) {
        flows = flows.filter((f) => f.status === filters.status);
      }
      if (filters.sourceJurisdiction) {
        flows = flows.filter((f) => f.sourceJurisdiction === filters.sourceJurisdiction);
      }
      if (filters.destinationJurisdiction) {
        flows = flows.filter((f) => f.destinationJurisdiction === filters.destinationJurisdiction);
      }
      if (filters.minAmount !== undefined) {
        flows = flows.filter((f) => f.amount >= filters.minAmount!);
      }
      if (filters.maxAmount !== undefined) {
        flows = flows.filter((f) => f.amount <= filters.maxAmount!);
      }
    }

    return flows;
  }

  settleCapitalFlow(flowId: CapitalFlowId): GlobalCapitalAllocation {
    const flow = this.capitalFlows.get(flowId);
    if (!flow) {
      throw new Error(`Capital flow ${flowId} not found`);
    }

    const settledFlow: GlobalCapitalAllocation = {
      ...flow,
      status: 'settled',
      actualSettlementTime: Math.floor((Date.now() - flow.initiatedAt.getTime()) / 60000),
      settledAt: new Date(),
    };

    this.capitalFlows.set(flowId, settledFlow);
    this.emitEvent('capital_flow_completed', 'info', `Capital flow ${flowId} settled`, { flow: settledFlow });

    return settledFlow;
  }

  cancelCapitalFlow(flowId: CapitalFlowId, reason: string): GlobalCapitalAllocation {
    const flow = this.capitalFlows.get(flowId);
    if (!flow) {
      throw new Error(`Capital flow ${flowId} not found`);
    }

    const cancelledFlow: GlobalCapitalAllocation = {
      ...flow,
      status: 'cancelled',
      metadata: { ...flow.metadata, cancellationReason: reason },
    };

    this.capitalFlows.set(flowId, cancelledFlow);
    return cancelledFlow;
  }

  // ============================================================================
  // Macro Capital Modeling
  // ============================================================================

  createMacroModel(name: string): MacroCapitalModel {
    const modelId = `model_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const model: MacroCapitalModel = {
      id: modelId,
      name,
      totalCapitalManaged: 0,
      capitalByRegion: [],
      capitalBySector: [],
      allocationEfficiencyIndex: 0,
      crossBorderFlowVolume: 0,
      averageSettlementTime: 0,
      capitalVelocity: 0,
      utilizationRate: 0,
      lastOptimizedAt: new Date(),
      nextOptimizationAt: this.computeNextOptimizationTime(),
    };

    this.macroModels.set(modelId, model);
    return model;
  }

  getMacroModel(modelId: string): MacroCapitalModel | undefined {
    return this.macroModels.get(modelId);
  }

  listMacroModels(filters?: MacroModelFilters): MacroCapitalModel[] {
    let models = Array.from(this.macroModels.values());

    if (filters) {
      if (filters.minCapital !== undefined) {
        models = models.filter((m) => m.totalCapitalManaged >= filters.minCapital!);
      }
      if (filters.maxCapital !== undefined) {
        models = models.filter((m) => m.totalCapitalManaged <= filters.maxCapital!);
      }
    }

    return models;
  }

  updateMacroModel(modelId: string, updates: Partial<MacroCapitalModel>): MacroCapitalModel {
    const model = this.macroModels.get(modelId);
    if (!model) {
      throw new Error(`Macro model ${modelId} not found`);
    }

    const updatedModel = { ...model, ...updates };
    this.macroModels.set(modelId, updatedModel);
    return updatedModel;
  }

  optimizeMacroModel(modelId: string): MacroCapitalModel {
    const model = this.macroModels.get(modelId);
    if (!model) {
      throw new Error(`Macro model ${modelId} not found`);
    }

    // Simulate AI optimization
    const optimizedModel: MacroCapitalModel = {
      ...model,
      allocationEfficiencyIndex: Math.min(100, model.allocationEfficiencyIndex + 5),
      capitalVelocity: Math.min(1, model.capitalVelocity + 0.05),
      utilizationRate: Math.min(1, model.utilizationRate + 0.03),
      lastOptimizedAt: new Date(),
      nextOptimizationAt: this.computeNextOptimizationTime(),
    };

    this.macroModels.set(modelId, optimizedModel);
    return optimizedModel;
  }

  // ============================================================================
  // AI Routing Optimization
  // ============================================================================

  computeOptimalRoute(params: ComputeRoutingParams): CapitalRoutingOptimization {
    const routeId = `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const optimization: CapitalRoutingOptimization = {
      routeId,
      sourceNodeId: params.sourceNodeId,
      destinationNodeId: params.destinationNodeId,
      amount: params.amount,
      optimalPath: [params.sourceNodeId, 'clearing_hub', params.destinationNodeId],
      alternativePaths: [
        [params.sourceNodeId, 'liquidity_pool', params.destinationNodeId],
        [params.sourceNodeId, 'direct', params.destinationNodeId],
      ],
      estimatedCost: params.amount * 0.001, // 0.1% base cost
      estimatedTime: 30, // Minutes
      efficiencyGain: 15, // 15% improvement
      riskFactors: ['cross_border_regulatory', 'settlement_delay'],
      computedAt: new Date(),
    };

    this.routingOptimizations.set(routeId, optimization);
    return optimization;
  }

  listRoutingOptimizations(): CapitalRoutingOptimization[] {
    return Array.from(this.routingOptimizations.values());
  }

  // ============================================================================
  // Regional & Sector Analysis
  // ============================================================================

  getRegionalDistribution(): RegionalCapitalDistribution[] {
    const regions = ['North America', 'Europe', 'Asia Pacific', 'Middle East', 'Latin America', 'Africa'];
    const totalCapital = Array.from(this.capitalFlows.values())
      .filter((f) => f.status === 'settled')
      .reduce((sum, f) => sum + f.amount, 0);

    return regions.map((region, index) => ({
      region,
      jurisdictions: this.getJurisdictionsForRegion(region),
      totalCapital: totalCapital * (0.3 - index * 0.05),
      percentOfGlobal: 30 - index * 5,
      netFlowDirection: index % 2 === 0 ? 'inflow' : 'outflow' as const,
      averageYield: 5 + index * 0.5,
      riskScore: 20 + index * 10,
    }));
  }

  getSectorDistribution(): SectorCapitalDistribution[] {
    const sectors = ['Technology', 'Finance', 'Energy', 'Healthcare', 'Infrastructure', 'Commodities'];
    const totalCapital = Array.from(this.capitalFlows.values())
      .filter((f) => f.status === 'settled')
      .reduce((sum, f) => sum + f.amount, 0);

    return sectors.map((sector, index) => ({
      sector,
      totalCapital: totalCapital * (0.25 - index * 0.03),
      percentOfGlobal: 25 - index * 3,
      growthRate: 8 - index,
      riskAdjustedReturn: 12 - index * 1.5,
      liquidityScore: 90 - index * 5,
    }));
  }

  rebalanceRegionalAllocation(region: string, targetPercent: number): void {
    // Emit rebalancing event
    this.emitEvent('capital_flow_initiated', 'info', `Regional rebalancing triggered for ${region}`, {
      region,
      targetPercent,
    });
  }

  // ============================================================================
  // Layer Status & Events
  // ============================================================================

  getLayerStatus(): CapitalCoordinationLayerStatus {
    const flows = Array.from(this.capitalFlows.values());
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const settledFlows = flows.filter(
      (f) => f.status === 'settled' && f.settledAt && f.settledAt >= oneDayAgo
    );
    const activeFlows = flows.filter((f) => f.status === 'routing');
    const pendingFlows = flows.filter((f) => f.status === 'pending');

    const avgSettlementTime =
      settledFlows.length > 0
        ? settledFlows.reduce((sum, f) => sum + (f.actualSettlementTime ?? 0), 0) / settledFlows.length
        : 0;

    return {
      totalCapitalManaged: flows.reduce((sum, f) => sum + f.amount, 0),
      activeCapitalFlows: activeFlows.length,
      pendingCapitalFlows: pendingFlows.length,
      settledCapitalFlows24h: settledFlows.length,
      averageSettlementTime: avgSettlementTime,
      allocationEfficiencyIndex: this.computeGlobalEfficiencyIndex(),
      crossBorderVolume24h: settledFlows
        .filter((f) => f.sourceJurisdiction !== f.destinationJurisdiction)
        .reduce((sum, f) => sum + f.amount, 0),
    };
  }

  onEvent(callback: GAEIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private computeEfficiencyScore(params: InitiateCapitalFlowParams): number {
    let score = 80; // Base score

    // Cross-border penalty
    if (params.sourceJurisdiction !== params.destinationJurisdiction) {
      score -= 10;
    }

    // Amount bonus for larger flows (economies of scale)
    if (params.amount > 1000000) {
      score += 5;
    }

    // AI optimization bonus
    if (this.config.enableAIOptimization) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  private computeRiskAdjustedReturn(params: InitiateCapitalFlowParams): number {
    const baseReturn = 8; // Base 8% return
    const riskPenalty = params.sourceJurisdiction !== params.destinationJurisdiction ? 1 : 0;
    return baseReturn - riskPenalty;
  }

  private computeRoutingPath(params: InitiateCapitalFlowParams): string[] {
    if (params.sourceJurisdiction === params.destinationJurisdiction) {
      return [params.sourceNodeId, 'local_clearing', params.destinationNodeId];
    }
    return [params.sourceNodeId, 'cross_border_hub', 'fx_settlement', params.destinationNodeId];
  }

  private estimateSettlementTime(params: InitiateCapitalFlowParams): number {
    const baseTime = 15; // 15 minutes base
    const crossBorderPenalty = params.sourceJurisdiction !== params.destinationJurisdiction ? 30 : 0;
    return Math.min(baseTime + crossBorderPenalty, this.config.maxCrossBorderSettlementMinutes);
  }

  private computeNextOptimizationTime(): Date {
    const now = new Date();
    switch (this.config.reoptimizationFrequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private computeGlobalEfficiencyIndex(): number {
    const flows = Array.from(this.capitalFlows.values());
    if (flows.length === 0) return 0;

    const avgEfficiency = flows.reduce((sum, f) => sum + f.efficiencyScore, 0) / flows.length;
    return Math.round(avgEfficiency);
  }

  private getJurisdictionsForRegion(region: string): JurisdictionCode[] {
    const regionMap: Record<string, JurisdictionCode[]> = {
      'North America': ['US', 'CA', 'MX'],
      'Europe': ['GB', 'DE', 'FR', 'CH', 'NL'],
      'Asia Pacific': ['SG', 'HK', 'JP', 'AU', 'KR'],
      'Middle East': ['AE', 'SA', 'QA', 'BH'],
      'Latin America': ['BR', 'AR', 'CL', 'CO'],
      'Africa': ['ZA', 'NG', 'KE', 'EG'],
    };
    return regionMap[region] ?? [];
  }

  private emitEvent(
    type: GAEIEvent['type'],
    severity: GAEIEvent['severity'],
    message: string,
    data: Record<string, unknown>
  ): void {
    const event: GAEIEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      severity,
      source: 'capital_coordination_layer',
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

export function createCapitalCoordinationLayer(
  config?: Partial<CapitalCoordinationLayerConfig>
): DefaultCapitalCoordinationLayer {
  return new DefaultCapitalCoordinationLayer(config);
}
