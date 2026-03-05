/**
 * TONAIAgent - GAEI AI Economic Orchestration Engine
 *
 * AI performs:
 * - Macro stress simulations
 * - Liquidity rebalancing
 * - Capital buffer management
 * - Risk contagion modeling
 * - Treasury reserve adjustments
 *
 * Bounded by:
 * - Constitutional governance
 * - Stability caps
 * - Sovereign integration rules
 */

import {
  EconomicNodeId,
  JurisdictionCode,
  StressScenarioType,
  RiskMitigationType,
  MacroStressSimulation,
  LiquidityRebalancingAction,
  CapitalBufferManagement,
  RiskContagionModel,
  ContagionPath,
  TreasuryReserveAdjustment,
  RiskMitigationAction,
  AIOrchestrationConfig,
  GAEIEvent,
  GAEIEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface RunStressSimulationParams {
  scenarioName: string;
  scenarioType: StressScenarioType;
  shockMagnitude: number;
  duration?: number;
  affectedRegions?: JurisdictionCode[];
  affectedSectors?: string[];
}

export interface SimulationFilters {
  scenarioType?: StressScenarioType;
  status?: MacroStressSimulation['status'];
}

export interface ProposeRebalancingParams {
  sourceNodeId: EconomicNodeId;
  targetNodeId: EconomicNodeId;
  amount: number;
  currency: string;
  trigger: string;
  priority?: LiquidityRebalancingAction['priority'];
}

export interface RebalancingFilters {
  sourceNodeId?: EconomicNodeId;
  targetNodeId?: EconomicNodeId;
  status?: LiquidityRebalancingAction['status'];
  priority?: LiquidityRebalancingAction['priority'];
}

export interface CreateBufferManagementParams {
  nodeId: EconomicNodeId;
  targetBuffer: number;
  minBuffer: number;
  maxBuffer: number;
}

export interface BufferFilters {
  nodeId?: EconomicNodeId;
}

export interface ModelContagionParams {
  sourceNode: EconomicNodeId;
  initialExposure: number;
}

export interface ProposeMitigationParams {
  actionType: RiskMitigationType;
  description: string;
  priority: RiskMitigationAction['priority'];
  estimatedCost: number;
  affectedNodes: EconomicNodeId[];
  autoExecute?: boolean;
}

export interface MitigationFilters {
  actionType?: RiskMitigationType;
  status?: RiskMitigationAction['status'];
  priority?: RiskMitigationAction['priority'];
}

export interface ProposeTreasuryAdjustmentParams {
  adjustmentType: TreasuryReserveAdjustment['adjustmentType'];
  sourceReserve?: string;
  targetReserve?: string;
  amount: number;
  currency: string;
  trigger: string;
}

export interface TreasuryAdjustmentFilters {
  adjustmentType?: TreasuryReserveAdjustment['adjustmentType'];
  status?: TreasuryReserveAdjustment['status'];
}

export interface AIOrchestrationLayerStatus {
  activeSimulations: number;
  completedSimulations: number;
  pendingRebalancingActions: number;
  executedRebalancingActions: number;
  managedBuffers: number;
  activeContagionModels: number;
  pendingMitigationActions: number;
  executedMitigationActions: number;
  pendingTreasuryAdjustments: number;
  aiHealthScore: number;
}

export interface AIEconomicOrchestrationEngine {
  // Macro Stress Simulations
  runStressSimulation(params: RunStressSimulationParams): MacroStressSimulation;
  getStressSimulation(simulationId: string): MacroStressSimulation | undefined;
  listStressSimulations(filters?: SimulationFilters): MacroStressSimulation[];

  // Liquidity Rebalancing
  proposeRebalancing(params: ProposeRebalancingParams): LiquidityRebalancingAction;
  approveRebalancing(actionId: string): LiquidityRebalancingAction;
  executeRebalancing(actionId: string): LiquidityRebalancingAction;
  listRebalancingActions(filters?: RebalancingFilters): LiquidityRebalancingAction[];

  // Capital Buffer Management
  createBufferManagement(params: CreateBufferManagementParams): CapitalBufferManagement;
  getBufferManagement(bufferId: string): CapitalBufferManagement | undefined;
  listBufferManagements(filters?: BufferFilters): CapitalBufferManagement[];
  drawdownBuffer(bufferId: string, amount: number, reason: string): CapitalBufferManagement;
  replenishBuffer(bufferId: string, amount: number): CapitalBufferManagement;

  // Risk Contagion Modeling
  modelContagion(params: ModelContagionParams): RiskContagionModel;
  getContagionModel(modelId: string): RiskContagionModel | undefined;
  listContagionModels(): RiskContagionModel[];

  // Risk Mitigation Actions
  proposeMitigation(params: ProposeMitigationParams): RiskMitigationAction;
  approveMitigation(actionId: string): RiskMitigationAction;
  executeMitigation(actionId: string): RiskMitigationAction;
  listMitigationActions(filters?: MitigationFilters): RiskMitigationAction[];

  // Treasury Reserve Adjustments
  proposeTreasuryAdjustment(params: ProposeTreasuryAdjustmentParams): TreasuryReserveAdjustment;
  approveTreasuryAdjustment(adjustmentId: string): TreasuryReserveAdjustment;
  executeTreasuryAdjustment(adjustmentId: string): TreasuryReserveAdjustment;
  listTreasuryAdjustments(filters?: TreasuryAdjustmentFilters): TreasuryReserveAdjustment[];

  // Layer Status & Events
  getLayerStatus(): AIOrchestrationLayerStatus;
  onEvent(callback: GAEIEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultAIEconomicOrchestrationEngine implements AIEconomicOrchestrationEngine {
  private readonly simulations: Map<string, MacroStressSimulation> = new Map();
  private readonly rebalancingActions: Map<string, LiquidityRebalancingAction> = new Map();
  private readonly bufferManagements: Map<string, CapitalBufferManagement> = new Map();
  private readonly contagionModels: Map<string, RiskContagionModel> = new Map();
  private readonly mitigationActions: Map<string, RiskMitigationAction> = new Map();
  private readonly treasuryAdjustments: Map<string, TreasuryReserveAdjustment> = new Map();
  private readonly eventCallbacks: GAEIEventCallback[] = [];
  private readonly config: AIOrchestrationConfig;

  constructor(config?: Partial<AIOrchestrationConfig>) {
    this.config = {
      enableMacroSimulations: true,
      enableLiquidityRebalancing: true,
      enableCapitalBufferManagement: true,
      enableContagionModeling: true,
      enableAutoMitigation: false, // Require governance approval by default
      simulationFrequency: 'daily',
      riskThreshold: 70,
      aiConfidenceMinimum: 80,
      ...config,
    };
  }

  // ============================================================================
  // Macro Stress Simulations
  // ============================================================================

  runStressSimulation(params: RunStressSimulationParams): MacroStressSimulation {
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Compute simulation results using AI modeling
    const simulationResults = this.computeStressSimulationResults(params);

    const simulation: MacroStressSimulation = {
      id: simulationId,
      scenarioName: params.scenarioName,
      scenarioType: params.scenarioType,
      shockMagnitude: params.shockMagnitude,
      duration: params.duration ?? 30,
      affectedRegions: params.affectedRegions ?? [],
      affectedSectors: params.affectedSectors ?? [],
      affectedNodes: simulationResults.affectedNodes,
      capitalImpact: simulationResults.capitalImpact,
      liquidityImpact: simulationResults.liquidityImpact,
      supplyChainImpact: simulationResults.supplyChainImpact,
      tradeFlowImpact: simulationResults.tradeFlowImpact,
      contagionProbability: simulationResults.contagionProbability,
      recoveryTimeEstimate: simulationResults.recoveryTimeEstimate,
      mitigationRecommendations: this.generateMitigationRecommendations(params, simulationResults),
      simulatedAt: new Date(),
      status: 'completed',
    };

    this.simulations.set(simulationId, simulation);
    this.emitEvent('stress_simulation_completed', 'info', `Stress simulation ${simulationId} completed`, {
      simulation,
    });

    // Auto-trigger mitigation if enabled and risk is high
    if (this.config.enableAutoMitigation && simulationResults.capitalImpact > this.config.riskThreshold) {
      this.autoTriggerMitigation(simulation);
    }

    return simulation;
  }

  getStressSimulation(simulationId: string): MacroStressSimulation | undefined {
    return this.simulations.get(simulationId);
  }

  listStressSimulations(filters?: SimulationFilters): MacroStressSimulation[] {
    let simulations = Array.from(this.simulations.values());

    if (filters) {
      if (filters.scenarioType) {
        simulations = simulations.filter((s) => s.scenarioType === filters.scenarioType);
      }
      if (filters.status) {
        simulations = simulations.filter((s) => s.status === filters.status);
      }
    }

    return simulations;
  }

  // ============================================================================
  // Liquidity Rebalancing
  // ============================================================================

  proposeRebalancing(params: ProposeRebalancingParams): LiquidityRebalancingAction {
    const actionId = `rebal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const action: LiquidityRebalancingAction = {
      id: actionId,
      sourceNodeId: params.sourceNodeId,
      targetNodeId: params.targetNodeId,
      amount: params.amount,
      currency: params.currency,
      trigger: params.trigger,
      priority: params.priority ?? 'medium',
      expectedImpact: this.estimateRebalancingImpact(params),
      status: 'proposed',
      aiConfidenceScore: this.computeAIConfidenceScore(params),
      proposedAt: new Date(),
    };

    this.rebalancingActions.set(actionId, action);
    return action;
  }

  approveRebalancing(actionId: string): LiquidityRebalancingAction {
    const action = this.rebalancingActions.get(actionId);
    if (!action) {
      throw new Error(`Rebalancing action ${actionId} not found`);
    }

    const approvedAction: LiquidityRebalancingAction = {
      ...action,
      status: 'approved',
    };

    this.rebalancingActions.set(actionId, approvedAction);
    return approvedAction;
  }

  executeRebalancing(actionId: string): LiquidityRebalancingAction {
    const action = this.rebalancingActions.get(actionId);
    if (!action) {
      throw new Error(`Rebalancing action ${actionId} not found`);
    }

    if (action.status !== 'approved') {
      throw new Error(`Rebalancing action ${actionId} must be approved before execution`);
    }

    const executedAction: LiquidityRebalancingAction = {
      ...action,
      status: 'completed',
      executedAt: new Date(),
    };

    this.rebalancingActions.set(actionId, executedAction);
    return executedAction;
  }

  listRebalancingActions(filters?: RebalancingFilters): LiquidityRebalancingAction[] {
    let actions = Array.from(this.rebalancingActions.values());

    if (filters) {
      if (filters.sourceNodeId) {
        actions = actions.filter((a) => a.sourceNodeId === filters.sourceNodeId);
      }
      if (filters.targetNodeId) {
        actions = actions.filter((a) => a.targetNodeId === filters.targetNodeId);
      }
      if (filters.status) {
        actions = actions.filter((a) => a.status === filters.status);
      }
      if (filters.priority) {
        actions = actions.filter((a) => a.priority === filters.priority);
      }
    }

    return actions;
  }

  // ============================================================================
  // Capital Buffer Management
  // ============================================================================

  createBufferManagement(params: CreateBufferManagementParams): CapitalBufferManagement {
    const bufferId = `buffer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const buffer: CapitalBufferManagement = {
      id: bufferId,
      nodeId: params.nodeId,
      currentBuffer: params.targetBuffer,
      targetBuffer: params.targetBuffer,
      minBuffer: params.minBuffer,
      maxBuffer: params.maxBuffer,
      utilizationRate: 0,
      replenishmentRate: 0.05, // 5% per period
      drawdownHistory: [],
      lastAdjustedAt: new Date(),
      nextReviewAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    };

    this.bufferManagements.set(bufferId, buffer);
    return buffer;
  }

  getBufferManagement(bufferId: string): CapitalBufferManagement | undefined {
    return this.bufferManagements.get(bufferId);
  }

  listBufferManagements(filters?: BufferFilters): CapitalBufferManagement[] {
    let buffers = Array.from(this.bufferManagements.values());

    if (filters) {
      if (filters.nodeId) {
        buffers = buffers.filter((b) => b.nodeId === filters.nodeId);
      }
    }

    return buffers;
  }

  drawdownBuffer(bufferId: string, amount: number, reason: string): CapitalBufferManagement {
    const buffer = this.bufferManagements.get(bufferId);
    if (!buffer) {
      throw new Error(`Buffer management ${bufferId} not found`);
    }

    if (buffer.currentBuffer - amount < buffer.minBuffer) {
      throw new Error(`Drawdown would breach minimum buffer level`);
    }

    const updatedBuffer: CapitalBufferManagement = {
      ...buffer,
      currentBuffer: buffer.currentBuffer - amount,
      utilizationRate: (buffer.targetBuffer - buffer.currentBuffer + amount) / buffer.targetBuffer,
      drawdownHistory: [
        ...buffer.drawdownHistory,
        {
          timestamp: new Date(),
          amount,
          reason,
        },
      ],
      lastAdjustedAt: new Date(),
    };

    this.bufferManagements.set(bufferId, updatedBuffer);
    return updatedBuffer;
  }

  replenishBuffer(bufferId: string, amount: number): CapitalBufferManagement {
    const buffer = this.bufferManagements.get(bufferId);
    if (!buffer) {
      throw new Error(`Buffer management ${bufferId} not found`);
    }

    const newBuffer = Math.min(buffer.currentBuffer + amount, buffer.maxBuffer);

    const updatedBuffer: CapitalBufferManagement = {
      ...buffer,
      currentBuffer: newBuffer,
      utilizationRate: (buffer.targetBuffer - newBuffer) / buffer.targetBuffer,
      lastAdjustedAt: new Date(),
    };

    this.bufferManagements.set(bufferId, updatedBuffer);
    return updatedBuffer;
  }

  // ============================================================================
  // Risk Contagion Modeling
  // ============================================================================

  modelContagion(params: ModelContagionParams): RiskContagionModel {
    const modelId = `contagion_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Simulate contagion paths
    const affectedNodes = this.computeContagionPaths(params);
    const totalExposure = affectedNodes.reduce((sum, n) => sum + n.exposureAmount, 0);
    const systemicRiskScore = this.computeSystemicRiskScore(affectedNodes, params.initialExposure);

    const model: RiskContagionModel = {
      id: modelId,
      sourceNode: params.sourceNode,
      affectedNodes,
      totalExposure,
      propagationSpeed: 5, // 5% per hour
      systemicRiskScore,
      circuitBreakerTriggered: systemicRiskScore > this.config.riskThreshold,
      modeledAt: new Date(),
    };

    this.contagionModels.set(modelId, model);

    if (model.circuitBreakerTriggered) {
      this.emitEvent('stability_alert', 'critical', `Circuit breaker triggered for contagion model ${modelId}`, {
        model,
      });
    }

    return model;
  }

  getContagionModel(modelId: string): RiskContagionModel | undefined {
    return this.contagionModels.get(modelId);
  }

  listContagionModels(): RiskContagionModel[] {
    return Array.from(this.contagionModels.values());
  }

  // ============================================================================
  // Risk Mitigation Actions
  // ============================================================================

  proposeMitigation(params: ProposeMitigationParams): RiskMitigationAction {
    const actionId = `mitigation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const action: RiskMitigationAction = {
      id: actionId,
      actionType: params.actionType,
      description: params.description,
      priority: params.priority,
      estimatedCost: params.estimatedCost,
      estimatedEffectiveness: this.estimateMitigationEffectiveness(params),
      affectedNodes: params.affectedNodes,
      autoExecute: params.autoExecute ?? false,
      requiresGovernance: !params.autoExecute,
      status: 'proposed',
      proposedAt: new Date(),
    };

    this.mitigationActions.set(actionId, action);
    this.emitEvent('risk_mitigation_triggered', 'info', `Mitigation action ${actionId} proposed`, { action });

    return action;
  }

  approveMitigation(actionId: string): RiskMitigationAction {
    const action = this.mitigationActions.get(actionId);
    if (!action) {
      throw new Error(`Mitigation action ${actionId} not found`);
    }

    const approvedAction: RiskMitigationAction = {
      ...action,
      status: 'approved',
    };

    this.mitigationActions.set(actionId, approvedAction);
    return approvedAction;
  }

  executeMitigation(actionId: string): RiskMitigationAction {
    const action = this.mitigationActions.get(actionId);
    if (!action) {
      throw new Error(`Mitigation action ${actionId} not found`);
    }

    if (action.requiresGovernance && action.status !== 'approved') {
      throw new Error(`Mitigation action ${actionId} requires governance approval`);
    }

    const executedAction: RiskMitigationAction = {
      ...action,
      status: 'completed',
      executedAt: new Date(),
    };

    this.mitigationActions.set(actionId, executedAction);
    return executedAction;
  }

  listMitigationActions(filters?: MitigationFilters): RiskMitigationAction[] {
    let actions = Array.from(this.mitigationActions.values());

    if (filters) {
      if (filters.actionType) {
        actions = actions.filter((a) => a.actionType === filters.actionType);
      }
      if (filters.status) {
        actions = actions.filter((a) => a.status === filters.status);
      }
      if (filters.priority) {
        actions = actions.filter((a) => a.priority === filters.priority);
      }
    }

    return actions;
  }

  // ============================================================================
  // Treasury Reserve Adjustments
  // ============================================================================

  proposeTreasuryAdjustment(params: ProposeTreasuryAdjustmentParams): TreasuryReserveAdjustment {
    const adjustmentId = `treasury_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const adjustment: TreasuryReserveAdjustment = {
      id: adjustmentId,
      adjustmentType: params.adjustmentType,
      sourceReserve: params.sourceReserve,
      targetReserve: params.targetReserve,
      amount: params.amount,
      currency: params.currency,
      trigger: params.trigger,
      aiRecommended: true,
      governanceApproved: false,
      expectedOutcome: this.predictTreasuryAdjustmentOutcome(params),
      status: 'proposed',
      proposedAt: new Date(),
    };

    this.treasuryAdjustments.set(adjustmentId, adjustment);
    return adjustment;
  }

  approveTreasuryAdjustment(adjustmentId: string): TreasuryReserveAdjustment {
    const adjustment = this.treasuryAdjustments.get(adjustmentId);
    if (!adjustment) {
      throw new Error(`Treasury adjustment ${adjustmentId} not found`);
    }

    const approvedAdjustment: TreasuryReserveAdjustment = {
      ...adjustment,
      governanceApproved: true,
      status: 'approved',
    };

    this.treasuryAdjustments.set(adjustmentId, approvedAdjustment);
    return approvedAdjustment;
  }

  executeTreasuryAdjustment(adjustmentId: string): TreasuryReserveAdjustment {
    const adjustment = this.treasuryAdjustments.get(adjustmentId);
    if (!adjustment) {
      throw new Error(`Treasury adjustment ${adjustmentId} not found`);
    }

    if (!adjustment.governanceApproved) {
      throw new Error(`Treasury adjustment ${adjustmentId} requires governance approval`);
    }

    const executedAdjustment: TreasuryReserveAdjustment = {
      ...adjustment,
      status: 'completed',
      executedAt: new Date(),
    };

    this.treasuryAdjustments.set(adjustmentId, executedAdjustment);
    return executedAdjustment;
  }

  listTreasuryAdjustments(filters?: TreasuryAdjustmentFilters): TreasuryReserveAdjustment[] {
    let adjustments = Array.from(this.treasuryAdjustments.values());

    if (filters) {
      if (filters.adjustmentType) {
        adjustments = adjustments.filter((a) => a.adjustmentType === filters.adjustmentType);
      }
      if (filters.status) {
        adjustments = adjustments.filter((a) => a.status === filters.status);
      }
    }

    return adjustments;
  }

  // ============================================================================
  // Layer Status & Events
  // ============================================================================

  getLayerStatus(): AIOrchestrationLayerStatus {
    const simulations = Array.from(this.simulations.values());
    const rebalancing = Array.from(this.rebalancingActions.values());
    const mitigation = Array.from(this.mitigationActions.values());
    const treasury = Array.from(this.treasuryAdjustments.values());

    return {
      activeSimulations: simulations.filter((s) => s.status === 'running').length,
      completedSimulations: simulations.filter((s) => s.status === 'completed').length,
      pendingRebalancingActions: rebalancing.filter((a) => a.status === 'proposed' || a.status === 'approved').length,
      executedRebalancingActions: rebalancing.filter((a) => a.status === 'completed').length,
      managedBuffers: this.bufferManagements.size,
      activeContagionModels: this.contagionModels.size,
      pendingMitigationActions: mitigation.filter((a) => a.status === 'proposed' || a.status === 'approved').length,
      executedMitigationActions: mitigation.filter((a) => a.status === 'completed').length,
      pendingTreasuryAdjustments: treasury.filter((a) => a.status === 'proposed' || a.status === 'approved').length,
      aiHealthScore: this.computeAIHealthScore(),
    };
  }

  onEvent(callback: GAEIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private computeStressSimulationResults(params: RunStressSimulationParams): {
    affectedNodes: EconomicNodeId[];
    capitalImpact: number;
    liquidityImpact: number;
    supplyChainImpact: number;
    tradeFlowImpact: number;
    contagionProbability: number;
    recoveryTimeEstimate: number;
  } {
    // Simulate impacts based on scenario type and shock magnitude
    const baseImpact = params.shockMagnitude;
    const scenarioMultiplier = this.getScenarioMultiplier(params.scenarioType);

    return {
      affectedNodes: [`node_${Math.random().toString(36).substring(2, 9)}`],
      capitalImpact: Math.min(100, baseImpact * scenarioMultiplier * 1.2),
      liquidityImpact: Math.min(100, baseImpact * scenarioMultiplier * 1.5),
      supplyChainImpact: Math.min(100, baseImpact * scenarioMultiplier * 0.8),
      tradeFlowImpact: Math.min(100, baseImpact * scenarioMultiplier * 1.0),
      contagionProbability: Math.min(1, (baseImpact / 100) * scenarioMultiplier),
      recoveryTimeEstimate: Math.ceil(baseImpact * scenarioMultiplier / 2),
    };
  }

  private getScenarioMultiplier(scenarioType: StressScenarioType): number {
    const multipliers: Record<StressScenarioType, number> = {
      global_credit_crunch: 1.5,
      commodity_shock: 1.2,
      supply_chain_disruption: 1.3,
      sovereign_default: 1.4,
      currency_crisis: 1.3,
      trade_war: 1.1,
      energy_crisis: 1.2,
      pandemic_impact: 1.4,
      geopolitical_conflict: 1.3,
      climate_disaster: 1.2,
    };
    return multipliers[scenarioType] ?? 1.0;
  }

  private generateMitigationRecommendations(
    params: RunStressSimulationParams,
    results: { capitalImpact: number; liquidityImpact: number }
  ): RiskMitigationAction[] {
    const recommendations: RiskMitigationAction[] = [];

    if (results.capitalImpact > 50) {
      recommendations.push({
        id: `rec_${Date.now()}_1`,
        actionType: 'capital_buffer_deployment',
        description: 'Deploy capital buffers to absorb shock',
        priority: results.capitalImpact > 70 ? 'emergency' : 'high',
        estimatedCost: results.capitalImpact * 10000,
        estimatedEffectiveness: 75,
        affectedNodes: [],
        autoExecute: false,
        requiresGovernance: true,
        status: 'proposed',
        proposedAt: new Date(),
      });
    }

    if (results.liquidityImpact > 40) {
      recommendations.push({
        id: `rec_${Date.now()}_2`,
        actionType: 'liquidity_injection',
        description: 'Inject liquidity to maintain market functioning',
        priority: results.liquidityImpact > 60 ? 'high' : 'medium',
        estimatedCost: results.liquidityImpact * 20000,
        estimatedEffectiveness: 80,
        affectedNodes: [],
        autoExecute: false,
        requiresGovernance: true,
        status: 'proposed',
        proposedAt: new Date(),
      });
    }

    return recommendations;
  }

  private autoTriggerMitigation(simulation: MacroStressSimulation): void {
    for (const recommendation of simulation.mitigationRecommendations) {
      if (recommendation.priority === 'emergency' && recommendation.autoExecute) {
        this.executeMitigation(recommendation.id);
      }
    }
  }

  private estimateRebalancingImpact(params: ProposeRebalancingParams): number {
    // Estimate improvement based on amount and priority
    const baseImpact = 10;
    const priorityMultiplier = params.priority === 'urgent' ? 2 : params.priority === 'high' ? 1.5 : 1;
    return Math.min(50, baseImpact * priorityMultiplier);
  }

  private computeAIConfidenceScore(params: ProposeRebalancingParams): number {
    // Higher amounts = more complex = slightly lower confidence
    const baseConfidence = 85;
    const amountPenalty = Math.min(10, params.amount / 10000000);
    return Math.max(this.config.aiConfidenceMinimum, baseConfidence - amountPenalty);
  }

  private computeContagionPaths(params: ModelContagionParams): ContagionPath[] {
    // Simulate contagion propagation
    const numAffectedNodes = Math.ceil(params.initialExposure / 1000000);
    const paths: ContagionPath[] = [];

    for (let i = 0; i < Math.min(numAffectedNodes, 10); i++) {
      paths.push({
        nodeId: `affected_node_${i}`,
        exposureAmount: params.initialExposure * (1 - i * 0.1),
        exposurePercentage: (1 - i * 0.1) * 100,
        timeToImpact: i * 2, // Hours
        severityLevel: i < 3 ? 'critical' : i < 6 ? 'high' : 'medium',
      });
    }

    return paths;
  }

  private computeSystemicRiskScore(affectedNodes: ContagionPath[], initialExposure: number): number {
    const baseScore = 50;
    const nodeCountFactor = Math.min(30, affectedNodes.length * 3);
    const exposureFactor = Math.min(20, initialExposure / 5000000);
    return Math.min(100, baseScore + nodeCountFactor + exposureFactor);
  }

  private estimateMitigationEffectiveness(params: ProposeMitigationParams): number {
    const baseEffectiveness: Record<RiskMitigationType, number> = {
      liquidity_injection: 80,
      capital_buffer_deployment: 75,
      treasury_reallocation: 70,
      cross_border_stabilization: 65,
      supply_chain_rerouting: 60,
      commodity_hedge: 70,
      sovereign_support: 85,
    };
    return baseEffectiveness[params.actionType] ?? 60;
  }

  private predictTreasuryAdjustmentOutcome(params: ProposeTreasuryAdjustmentParams): string {
    const outcomeMap: Record<TreasuryReserveAdjustment['adjustmentType'], string> = {
      increase: `Increase reserve by ${params.amount} ${params.currency} to strengthen stability buffer`,
      decrease: `Decrease reserve by ${params.amount} ${params.currency} to deploy capital`,
      reallocation: `Reallocate ${params.amount} ${params.currency} from ${params.sourceReserve} to ${params.targetReserve}`,
    };
    return outcomeMap[params.adjustmentType];
  }

  private computeAIHealthScore(): number {
    // AI health based on successful operations and accuracy
    const simulations = Array.from(this.simulations.values());
    const completedSimulations = simulations.filter((s) => s.status === 'completed').length;
    const totalSimulations = simulations.length;

    if (totalSimulations === 0) return 100;
    return Math.round((completedSimulations / totalSimulations) * 100);
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
      source: 'ai_economic_orchestration_engine',
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

export function createAIEconomicOrchestrationEngine(
  config?: Partial<AIOrchestrationConfig>
): DefaultAIEconomicOrchestrationEngine {
  return new DefaultAIEconomicOrchestrationEngine(config);
}
