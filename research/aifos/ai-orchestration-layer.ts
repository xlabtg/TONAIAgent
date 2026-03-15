/**
 * TONAIAgent - AIFOS AI Orchestration Layer
 *
 * Coordinates AI agents operating within the Financial OS, bounded by:
 * - Hard risk caps from the kernel
 * - Governance override authority
 * - Stability index triggers
 *
 * Responsibilities:
 * - Agent decision coordination
 * - Risk recalibration
 * - Capital reallocation
 * - Crisis response
 *
 * This is Pillar 3 of AIFOS.
 */

import {
  ProcessId,
  ModuleId,
  OrchestrationMode,
  RiskCapLevel,
  AgentDecision,
  AgentAction,
  RiskRecalibrationEvent,
  CrisisResponsePlan,
  OrchestrationBoundary,
  AIOrchestrationConfig,
  AIFOSEvent,
  AIFOSEventCallback,
  AIFOSEventType,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_ORCHESTRATION_CONFIG: AIOrchestrationConfig = {
  mode: 'supervised',
  maxAutonomousCapitalUSD: 10_000_000,      // $10M without approval
  riskCapHardStop: 'critical',
  stabilityIndexHardStop: 20,
  enableCrisisAutoResponse: true,
  decisionAuditEnabled: true,
  maxDecisionsPerHour: 500,
};

// ============================================================================
// AI Orchestration Layer Interface
// ============================================================================

export interface AIOrchestrationLayer {
  readonly config: AIOrchestrationConfig;

  // Mode management
  getMode(): OrchestrationMode;
  setMode(mode: OrchestrationMode, reason: string): void;

  // Agent decisions
  proposeDecision(params: ProposeDecisionParams): AgentDecision;
  approveDecision(decisionId: ProcessId, approvedBy: string): AgentDecision;
  rejectDecision(decisionId: ProcessId, reason: string): AgentDecision;
  executeDecision(decisionId: ProcessId): DecisionExecutionResult;
  rollbackDecision(decisionId: ProcessId, reason: string): void;
  getDecision(id: ProcessId): AgentDecision | undefined;
  listDecisions(filters?: DecisionFilters): AgentDecision[];

  // Risk recalibration
  triggerRiskRecalibration(params: RecalibrationParams): RiskRecalibrationEvent;
  listRecalibrationEvents(filters?: RecalibrationFilters): RiskRecalibrationEvent[];

  // Capital reallocation
  proposeCapitalReallocation(params: CapitalReallocationParams): CapitalReallocationProposal;
  executeCapitalReallocation(proposalId: string): CapitalReallocationResult;

  // Crisis response
  registerCrisisResponsePlan(params: RegisterCrisisParams): CrisisResponsePlan;
  activateCrisisPlan(planId: string): CrisisActivationResult;
  getCrisisPlan(id: string): CrisisResponsePlan | undefined;
  listCrisisPlans(filters?: CrisisPlanFilters): CrisisResponsePlan[];

  // Orchestration boundaries
  checkBoundary(type: OrchestrationBoundary['boundaryType'], value: number): BoundaryCheckResult;
  listBoundaries(): OrchestrationBoundary[];
  updateBoundary(type: OrchestrationBoundary['boundaryType'], threshold: number): void;

  // Metrics
  getOrchestrationMetrics(): OrchestrationMetrics;

  // Events
  onEvent(callback: AIFOSEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface ProposeDecisionParams {
  agentId: string;
  decisionType: AgentDecision['decisionType'];
  rationale: string;
  targetModules: ModuleId[];
  proposedActions: AgentAction[];
  estimatedRiskImpact: number;
  estimatedCapitalImpact: number;
}

export interface DecisionFilters {
  agentId?: string;
  decisionType?: AgentDecision['decisionType'];
  status?: AgentDecision['status'];
  requiresApproval?: boolean;
}

export interface DecisionExecutionResult {
  decisionId: ProcessId;
  success: boolean;
  actionsExecuted: number;
  actionsFailedCount: number;
  capitalMoved?: number;
  riskImpact?: RiskCapLevel;
  executedAt: Date;
  rollbackAvailable: boolean;
}

export interface RecalibrationParams {
  trigger: RiskRecalibrationEvent['trigger'];
  currentRiskLevel: RiskCapLevel;
  targetRiskLevel: RiskCapLevel;
  stabilityIndexBefore: number;
}

export interface RecalibrationFilters {
  trigger?: RiskRecalibrationEvent['trigger'];
  resolved?: boolean;
}

export interface CapitalReallocationParams {
  requestedBy: string;
  sourceModuleId: ModuleId;
  targetModuleId: ModuleId;
  amount: number;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
}

export interface CapitalReallocationProposal {
  id: string;
  requestedBy: string;
  sourceModuleId: ModuleId;
  targetModuleId: ModuleId;
  amount: number;
  reason: string;
  priority: string;
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  requiresApproval: boolean;
  proposedAt: Date;
}

export interface CapitalReallocationResult {
  proposalId: string;
  success: boolean;
  amountMoved: number;
  executedAt: Date;
}

export interface RegisterCrisisParams {
  scenarioType: CrisisResponsePlan['scenarioType'];
  severityThreshold: RiskCapLevel;
  automatedActions: AgentAction[];
  requiresGovernanceApproval: boolean;
  estimatedResponseTimeMs: number;
}

export interface CrisisActivationResult {
  planId: string;
  activated: boolean;
  actionsTriggered: string[];
  activatedAt: Date;
}

export interface CrisisPlanFilters {
  scenarioType?: CrisisResponsePlan['scenarioType'];
  isActive?: boolean;
}

export interface BoundaryCheckResult {
  withinBounds: boolean;
  boundary?: OrchestrationBoundary;
  enforcement?: OrchestrationBoundary['enforcement'];
  message?: string;
}

export interface OrchestrationMetrics {
  totalDecisions: number;
  decisionsLastHour: number;
  autoApprovedDecisions: number;
  humanApprovedDecisions: number;
  rejectedDecisions: number;
  rolledBackDecisions: number;
  avgDecisionLatencyMs: number;
  capitalReallocatedTotal: number;
  crisisEventsHandled: number;
  currentMode: OrchestrationMode;
  uptimeSeconds: number;
}

// ============================================================================
// Default AI Orchestration Layer Implementation
// ============================================================================

export class DefaultAIOrchestrationLayer implements AIOrchestrationLayer {
  readonly config: AIOrchestrationConfig;

  private mode: OrchestrationMode;
  private readonly decisions = new Map<ProcessId, AgentDecision>();
  private readonly recalibrations: RiskRecalibrationEvent[] = [];
  private readonly reallocationProposals = new Map<string, CapitalReallocationProposal>();
  private readonly crisisPlans = new Map<string, CrisisResponsePlan>();
  private readonly eventCallbacks: AIFOSEventCallback[] = [];

  private decisionCounter = 0;
  private recalibrationCounter = 0;
  private proposalCounter = 0;
  private crisisCounter = 0;
  private decisionsThisHour = 0;
  private startedAt = Date.now();

  private readonly boundaries: Map<OrchestrationBoundary['boundaryType'], OrchestrationBoundary>;

  constructor(config?: Partial<AIOrchestrationConfig>) {
    this.config = { ...DEFAULT_ORCHESTRATION_CONFIG, ...config };
    this.mode = this.config.mode;

    this.boundaries = new Map([
      ['risk_cap', {
        boundaryType: 'risk_cap',
        threshold: 80,  // score of 80 triggers hard stop
        enforcement: 'hard_stop',
        isTriggered: false,
        description: 'Hard stop when risk score exceeds 80/100',
      }],
      ['stability_trigger', {
        boundaryType: 'stability_trigger',
        threshold: this.config.stabilityIndexHardStop,
        enforcement: 'auto_recalibrate',
        isTriggered: false,
        description: `Auto-recalibrate when stability index falls below ${this.config.stabilityIndexHardStop}`,
      }],
      ['capital_limit', {
        boundaryType: 'capital_limit',
        threshold: this.config.maxAutonomousCapitalUSD,
        enforcement: 'alert',
        isTriggered: false,
        description: `Alert when autonomous capital movement exceeds $${this.config.maxAutonomousCapitalUSD.toLocaleString()}`,
      }],
      ['governance_override', {
        boundaryType: 'governance_override',
        threshold: 0,
        enforcement: 'hard_stop',
        isTriggered: false,
        description: 'Governance override suspends autonomous decisions',
      }],
    ]);

    // Register default crisis response plans
    this.registerCrisisResponsePlan({
      scenarioType: 'liquidity_crisis',
      severityThreshold: 'high',
      automatedActions: [
        {
          actionType: 'suspend_non_essential_operations',
          targetModuleId: 'module-liquidity-*',
          parameters: { scope: 'non_essential' },
          expectedOutcome: 'Preserve liquidity reserves',
          rollbackAvailable: true,
        },
      ],
      requiresGovernanceApproval: false,
      estimatedResponseTimeMs: 5000,
    });
  }

  getMode(): OrchestrationMode {
    return this.mode;
  }

  setMode(mode: OrchestrationMode, reason: string): void {
    const previous = this.mode;
    this.mode = mode;
    this.emitEvent('agent_decision_executed', 'info', 'Orchestration', `Mode changed: ${previous} → ${mode} (${reason})`, {
      previousMode: previous,
      newMode: mode,
      reason,
    });
  }

  proposeDecision(params: ProposeDecisionParams): AgentDecision {
    const id: ProcessId = `decision-${++this.decisionCounter}-${Date.now()}`;
    const requiresApproval =
      this.mode === 'supervised' ||
      this.mode === 'manual' ||
      Math.abs(params.estimatedCapitalImpact) > this.config.maxAutonomousCapitalUSD;

    const decision: AgentDecision = {
      id,
      agentId: params.agentId,
      decisionType: params.decisionType,
      rationale: params.rationale,
      targetModules: params.targetModules,
      proposedActions: params.proposedActions,
      estimatedRiskImpact: params.estimatedRiskImpact,
      estimatedCapitalImpact: params.estimatedCapitalImpact,
      requiresHumanApproval: requiresApproval,
      status: requiresApproval ? 'proposed' : 'approved',
      proposedAt: new Date(),
    };

    this.decisions.set(id, decision);
    this.decisionsThisHour++;

    this.emitEvent('agent_decision_executed', 'info', 'Orchestration',
      `Decision proposed: ${params.decisionType} by agent ${params.agentId}`, {
        decisionId: id,
        requiresApproval,
        estimatedCapitalImpact: params.estimatedCapitalImpact,
      });

    return { ...decision };
  }

  approveDecision(decisionId: ProcessId, approvedBy: string): AgentDecision {
    const d = this.decisions.get(decisionId);
    if (!d) throw new Error(`Decision not found: ${decisionId}`);

    const updated = { ...d, status: 'approved' as const, decidedAt: new Date() };
    this.decisions.set(decisionId, updated);

    this.emitEvent('agent_decision_executed', 'info', 'Orchestration', `Decision approved by ${approvedBy}`, {
      decisionId,
      approvedBy,
    });

    return { ...updated };
  }

  rejectDecision(decisionId: ProcessId, reason: string): AgentDecision {
    const d = this.decisions.get(decisionId);
    if (!d) throw new Error(`Decision not found: ${decisionId}`);

    const updated = { ...d, status: 'rejected' as const, decidedAt: new Date() };
    this.decisions.set(decisionId, updated);

    this.emitEvent('agent_decision_executed', 'warning', 'Orchestration', `Decision rejected: ${reason}`, {
      decisionId,
      reason,
    });

    return { ...updated };
  }

  executeDecision(decisionId: ProcessId): DecisionExecutionResult {
    const d = this.decisions.get(decisionId);
    if (!d) throw new Error(`Decision not found: ${decisionId}`);
    if (d.status !== 'approved') throw new Error(`Decision not approved: ${d.status}`);

    // Check boundaries
    const capitalBound = this.checkBoundary('capital_limit', Math.abs(d.estimatedCapitalImpact));
    if (!capitalBound.withinBounds && capitalBound.enforcement === 'hard_stop') {
      throw new Error(`Capital boundary violated: ${capitalBound.message}`);
    }

    const executing = { ...d, status: 'executing' as const, executedAt: new Date() };
    this.decisions.set(decisionId, executing);

    // Simulate execution
    const result: DecisionExecutionResult = {
      decisionId,
      success: true,
      actionsExecuted: d.proposedActions.length,
      actionsFailedCount: 0,
      capitalMoved: Math.abs(d.estimatedCapitalImpact),
      executedAt: new Date(),
      rollbackAvailable: d.proposedActions.every(a => a.rollbackAvailable),
    };

    const completed = { ...executing, status: 'completed' as const };
    this.decisions.set(decisionId, completed);

    this.emitEvent('capital_reallocated', 'info', 'Orchestration', `Decision executed: ${d.decisionType}`, {
      decisionId,
      actionsExecuted: result.actionsExecuted,
      capitalMoved: result.capitalMoved,
    });

    return result;
  }

  rollbackDecision(decisionId: ProcessId, reason: string): void {
    const d = this.decisions.get(decisionId);
    if (!d) throw new Error(`Decision not found: ${decisionId}`);

    const rolled = { ...d, status: 'rolled_back' as const };
    this.decisions.set(decisionId, rolled);

    this.emitEvent('agent_decision_executed', 'warning', 'Orchestration', `Decision rolled back: ${reason}`, {
      decisionId,
      reason,
    });
  }

  getDecision(id: ProcessId): AgentDecision | undefined {
    const d = this.decisions.get(id);
    return d ? { ...d } : undefined;
  }

  listDecisions(filters?: DecisionFilters): AgentDecision[] {
    let list = Array.from(this.decisions.values());
    if (filters?.agentId) list = list.filter(d => d.agentId === filters.agentId);
    if (filters?.decisionType) list = list.filter(d => d.decisionType === filters.decisionType);
    if (filters?.status) list = list.filter(d => d.status === filters.status);
    if (filters?.requiresApproval !== undefined) list = list.filter(d => d.requiresHumanApproval === filters.requiresApproval);
    return list.map(d => ({ ...d }));
  }

  triggerRiskRecalibration(params: RecalibrationParams): RiskRecalibrationEvent {
    const id = `recal-${++this.recalibrationCounter}-${Date.now()}`;
    const actions: string[] = [];

    // Determine automated actions based on risk direction
    const levelOrder: RiskCapLevel[] = ['minimal', 'low', 'moderate', 'elevated', 'high', 'critical'];
    const currentIdx = levelOrder.indexOf(params.currentRiskLevel);
    const targetIdx = levelOrder.indexOf(params.targetRiskLevel);

    if (targetIdx < currentIdx) {
      actions.push('Suspended non-essential agent operations');
      actions.push('Increased monitoring frequency');
    }

    const event: RiskRecalibrationEvent = {
      id,
      trigger: params.trigger,
      previousRiskLevel: params.currentRiskLevel,
      newRiskLevel: params.targetRiskLevel,
      stabilityIndexBefore: params.stabilityIndexBefore,
      stabilityIndexAfter: Math.min(100, params.stabilityIndexBefore + (targetIdx < currentIdx ? 10 : -5)),
      actionsTriggered: actions,
      triggeredAt: new Date(),
    };

    this.recalibrations.push(event);

    this.emitEvent('risk_cap_triggered', 'warning', 'Orchestration',
      `Risk recalibration: ${params.currentRiskLevel} → ${params.targetRiskLevel}`, {
        recalibrationId: id,
        trigger: params.trigger,
        actions,
      });

    return { ...event };
  }

  listRecalibrationEvents(filters?: RecalibrationFilters): RiskRecalibrationEvent[] {
    let list = [...this.recalibrations];
    if (filters?.trigger) list = list.filter(e => e.trigger === filters.trigger);
    if (filters?.resolved !== undefined) {
      list = list.filter(e => (e.resolvedAt !== undefined) === filters.resolved);
    }
    return list.map(e => ({ ...e }));
  }

  proposeCapitalReallocation(params: CapitalReallocationParams): CapitalReallocationProposal {
    const id = `realloc-${++this.proposalCounter}-${Date.now()}`;

    const proposal: CapitalReallocationProposal = {
      id,
      requestedBy: params.requestedBy,
      sourceModuleId: params.sourceModuleId,
      targetModuleId: params.targetModuleId,
      amount: params.amount,
      reason: params.reason,
      priority: params.priority,
      status: 'pending',
      requiresApproval: params.amount > this.config.maxAutonomousCapitalUSD || this.mode !== 'autonomous',
      proposedAt: new Date(),
    };

    this.reallocationProposals.set(id, proposal);

    this.emitEvent('capital_reallocated', 'info', 'Orchestration',
      `Capital reallocation proposed: $${params.amount.toLocaleString()} (${params.reason})`, {
        proposalId: id,
        amount: params.amount,
        priority: params.priority,
      });

    return { ...proposal };
  }

  executeCapitalReallocation(proposalId: string): CapitalReallocationResult {
    const p = this.reallocationProposals.get(proposalId);
    if (!p) throw new Error(`Proposal not found: ${proposalId}`);
    if (p.status !== 'pending' && p.status !== 'approved') {
      throw new Error(`Proposal not executable: ${p.status}`);
    }

    const updated = { ...p, status: 'executed' as const };
    this.reallocationProposals.set(proposalId, updated);

    this.emitEvent('capital_reallocated', 'info', 'Orchestration',
      `Capital reallocation executed: $${p.amount.toLocaleString()}`, {
        proposalId,
        amountMoved: p.amount,
        sourceModule: p.sourceModuleId,
        targetModule: p.targetModuleId,
      });

    return {
      proposalId,
      success: true,
      amountMoved: p.amount,
      executedAt: new Date(),
    };
  }

  registerCrisisResponsePlan(params: RegisterCrisisParams): CrisisResponsePlan {
    const id = `crisis-${++this.crisisCounter}-${Date.now()}`;

    const plan: CrisisResponsePlan = {
      id,
      scenarioType: params.scenarioType,
      severityThreshold: params.severityThreshold,
      automatedActions: params.automatedActions,
      requiresGovernanceApproval: params.requiresGovernanceApproval,
      estimatedResponseTimeMs: params.estimatedResponseTimeMs,
      isActive: true,
    };

    this.crisisPlans.set(id, plan);
    return { ...plan };
  }

  activateCrisisPlan(planId: string): CrisisActivationResult {
    const plan = this.crisisPlans.get(planId);
    if (!plan) throw new Error(`Crisis plan not found: ${planId}`);

    const actions = plan.automatedActions.map(a => a.actionType);

    this.emitEvent('emergency_halt_triggered', 'critical', 'Orchestration',
      `Crisis response activated: ${plan.scenarioType}`, {
        planId,
        scenarioType: plan.scenarioType,
        actionsTriggered: actions,
      });

    return {
      planId,
      activated: true,
      actionsTriggered: actions,
      activatedAt: new Date(),
    };
  }

  getCrisisPlan(id: string): CrisisResponsePlan | undefined {
    const p = this.crisisPlans.get(id);
    return p ? { ...p } : undefined;
  }

  listCrisisPlans(filters?: CrisisPlanFilters): CrisisResponsePlan[] {
    let list = Array.from(this.crisisPlans.values());
    if (filters?.scenarioType) list = list.filter(p => p.scenarioType === filters.scenarioType);
    if (filters?.isActive !== undefined) list = list.filter(p => p.isActive === filters.isActive);
    return list.map(p => ({ ...p }));
  }

  checkBoundary(type: OrchestrationBoundary['boundaryType'], value: number): BoundaryCheckResult {
    const boundary = this.boundaries.get(type);
    if (!boundary) return { withinBounds: true };

    const triggered = value > boundary.threshold;

    if (triggered) {
      boundary.isTriggered = true;
      boundary.triggeredAt = new Date();
    }

    return {
      withinBounds: !triggered,
      boundary: { ...boundary },
      enforcement: boundary.enforcement,
      message: triggered ? `${type} boundary exceeded: ${value} > ${boundary.threshold}` : undefined,
    };
  }

  listBoundaries(): OrchestrationBoundary[] {
    return Array.from(this.boundaries.values()).map(b => ({ ...b }));
  }

  updateBoundary(type: OrchestrationBoundary['boundaryType'], threshold: number): void {
    const b = this.boundaries.get(type);
    if (b) {
      b.threshold = threshold;
    }
  }

  getOrchestrationMetrics(): OrchestrationMetrics {
    const all = Array.from(this.decisions.values());
    return {
      totalDecisions: all.length,
      decisionsLastHour: this.decisionsThisHour,
      autoApprovedDecisions: all.filter(d => !d.requiresHumanApproval).length,
      humanApprovedDecisions: all.filter(d => d.requiresHumanApproval && d.status === 'approved').length,
      rejectedDecisions: all.filter(d => d.status === 'rejected').length,
      rolledBackDecisions: all.filter(d => d.status === 'rolled_back').length,
      avgDecisionLatencyMs: 120,
      capitalReallocatedTotal: Array.from(this.reallocationProposals.values())
        .filter(p => p.status === 'executed')
        .reduce((sum, p) => sum + p.amount, 0),
      crisisEventsHandled: this.recalibrations.length,
      currentMode: this.mode,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  onEvent(callback: AIFOSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private emitEvent(
    type: AIFOSEventType,
    severity: AIFOSEvent['severity'],
    source: string,
    message: string,
    data: Record<string, unknown>,
  ): void {
    const event: AIFOSEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAIOrchestrationLayer(config?: Partial<AIOrchestrationConfig>): DefaultAIOrchestrationLayer {
  return new DefaultAIOrchestrationLayer(config);
}

export default DefaultAIOrchestrationLayer;
