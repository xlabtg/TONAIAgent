/**
 * TONAIAgent - AGFN AI Coordination Layer
 *
 * Provides AI-managed coordination across the Autonomous Global Financial Network,
 * including global liquidity balancing, risk cluster detection, autonomous capital
 * reallocation, and crisis mitigation planning.
 *
 * This is Component 4 of the Autonomous Global Financial Network (AGFN).
 */

import {
  GlobalLiquidityBalance,
  NodeLiquiditySnapshot,
  JurisdictionLiquiditySnapshot,
  ChainLiquiditySnapshot,
  LiquidityRebalanceAction,
  RiskCluster,
  CapitalReallocation,
  CrisisMitigationPlan,
  MitigationStep,
  NodeId,
  JurisdictionCode,
  ChainId,
  RiskClusterType,
  AICoordinationConfig,
  AGFNEvent,
  AGFNEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_AI_COORDINATION_CONFIG: AICoordinationConfig = {
  enableAutoLiquidityBalancing: true,
  enableRiskClusterDetection: true,
  enableAutoCapitalReallocation: false, // Requires governance approval by default
  enableCrisisMitigation: true,
  liquidityImbalanceThreshold: 30, // 0-100 imbalance score
  riskClusterAlertThreshold: 65, // 0-100 risk score
  autoRebalanceMaxAmountUSD: 10_000_000, // $10M max auto-rebalance
  coordinationCycleMs: 60_000, // 1 minute
};

// ============================================================================
// AI Coordination Layer Interface
// ============================================================================

export interface AICoordinationLayer {
  readonly config: AICoordinationConfig;

  // Liquidity Balancing
  computeGlobalLiquidityBalance(nodeSnapshots: NodeLiquiditySnapshot[]): GlobalLiquidityBalance;
  getLatestLiquidityBalance(): GlobalLiquidityBalance | undefined;
  listLiquidityBalances(): GlobalLiquidityBalance[];
  triggerLiquidityRebalance(balanceId: string): LiquidityRebalanceAction[];

  // Risk Cluster Detection
  detectRiskClusters(params: DetectRiskClustersParams): RiskCluster[];
  getRiskCluster(id: string): RiskCluster | undefined;
  listRiskClusters(filters?: RiskClusterFilters): RiskCluster[];
  resolveRiskCluster(id: string, resolution: string): RiskCluster;
  escalateRiskCluster(id: string): RiskCluster;

  // Capital Reallocation
  proposeCapitalReallocation(params: ProposeReallocationParams): CapitalReallocation;
  getCapitalReallocation(id: string): CapitalReallocation | undefined;
  listCapitalReallocations(filters?: ReallocationFilters): CapitalReallocation[];
  approveCapitalReallocation(id: string): CapitalReallocation;
  executeCapitalReallocation(id: string): CapitalReallocation;
  cancelCapitalReallocation(id: string, reason: string): CapitalReallocation;

  // Crisis Mitigation
  createCrisisMitigationPlan(params: CrisisMitigationParams): CrisisMitigationPlan;
  getCrisisMitigationPlan(id: string): CrisisMitigationPlan | undefined;
  listCrisisMitigationPlans(filters?: CrisisFilters): CrisisMitigationPlan[];
  activateCrisisMitigationPlan(id: string): CrisisMitigationPlan;
  completeMitigationStep(planId: string, stepNumber: number, outcome: string): MitigationStep;
  resolveCrisis(planId: string): CrisisMitigationPlan;

  // Events
  onEvent(callback: AGFNEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface DetectRiskClustersParams {
  nodeIds: NodeId[];
  jurisdictions: JurisdictionCode[];
  chains: ChainId[];
  sensitivityLevel?: 'low' | 'medium' | 'high';
}

export interface RiskClusterFilters {
  clusterType?: RiskClusterType;
  status?: RiskCluster['status'];
  minRiskScore?: number;
  jurisdiction?: JurisdictionCode;
  chain?: ChainId;
}

export interface ProposeReallocationParams {
  trigger: string;
  sourceNodes: NodeId[];
  destinationNodes: NodeId[];
  totalCapitalUSD: number;
  reason: string;
  requiresGovernanceApproval?: boolean;
}

export interface ReallocationFilters {
  status?: CapitalReallocation['status'];
  requiresGovernanceApproval?: boolean;
}

export interface CrisisMitigationParams {
  crisisTrigger: string;
  severity: CrisisMitigationPlan['severity'];
  affectedNodes: NodeId[];
  estimatedImpactUSD: number;
  mitigationSteps: Omit<MitigationStep, 'completedAt' | 'outcome'>[];
}

export interface CrisisFilters {
  status?: CrisisMitigationPlan['status'];
  severity?: CrisisMitigationPlan['severity'];
}

export interface CoordinationDashboard {
  liquidityImbalanceScore: number;
  activeRiskClusters: number;
  pendingReallocations: number;
  activeCrises: number;
  recentRebalanceActions: number;
  systemHealthScore: number; // 0-100
  generatedAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAICoordinationLayer implements AICoordinationLayer {
  readonly config: AICoordinationConfig;

  private readonly liquidityBalances = new Map<string, GlobalLiquidityBalance>();
  private readonly riskClusters = new Map<string, RiskCluster>();
  private readonly capitalReallocations = new Map<string, CapitalReallocation>();
  private readonly crisisMitigationPlans = new Map<string, CrisisMitigationPlan>();
  private readonly eventCallbacks: AGFNEventCallback[] = [];
  private idCounter = 0;
  private latestBalanceId: string | undefined;

  constructor(config?: Partial<AICoordinationConfig>) {
    this.config = { ...DEFAULT_AI_COORDINATION_CONFIG, ...config };
  }

  // ============================================================================
  // Liquidity Balancing
  // ============================================================================

  computeGlobalLiquidityBalance(nodeSnapshots: NodeLiquiditySnapshot[]): GlobalLiquidityBalance {
    const totalNetworkLiquidityUSD = nodeSnapshots.reduce(
      (sum, n) => sum + n.availableLiquidityUSD, 0
    );

    // Group by jurisdiction (simplified: use nodeId prefix as jurisdiction)
    const jurisdictionMap = new Map<string, NodeLiquiditySnapshot[]>();
    for (const snapshot of nodeSnapshots) {
      const jurisdiction = `JUR_${snapshot.nodeId.slice(0, 3)}`;
      if (!jurisdictionMap.has(jurisdiction)) {
        jurisdictionMap.set(jurisdiction, []);
      }
      jurisdictionMap.get(jurisdiction)!.push(snapshot);
    }

    const byJurisdiction: JurisdictionLiquiditySnapshot[] = Array.from(jurisdictionMap.entries()).map(
      ([jurisdiction, nodes]) => {
        const totalLiquidityUSD = nodes.reduce((sum, n) => sum + n.availableLiquidityUSD, 0);
        const averageUtilization = nodes.length > 0
          ? nodes.reduce((sum, n) => sum + n.utilization, 0) / nodes.length
          : 0;

        let liquidityStatus: JurisdictionLiquiditySnapshot['liquidityStatus'] = 'adequate';
        if (averageUtilization > 0.9) liquidityStatus = 'scarce';
        else if (averageUtilization > 0.75) liquidityStatus = 'tight';
        else if (averageUtilization < 0.3) liquidityStatus = 'abundant';

        return {
          jurisdiction,
          totalLiquidityUSD,
          activeNodesCount: nodes.length,
          averageUtilization,
          liquidityStatus,
        };
      }
    );

    const byChain: ChainLiquiditySnapshot[] = [
      {
        chain: 'ton',
        totalLiquidityUSD: totalNetworkLiquidityUSD * 0.4,
        bridgeLiquidityUSD: totalNetworkLiquidityUSD * 0.1,
        nativeLiquidityUSD: totalNetworkLiquidityUSD * 0.3,
        utilizationRate: 0.6,
      },
    ];

    // Calculate imbalance score
    const utilizations = nodeSnapshots.map(n => n.utilization);
    const avgUtilization = utilizations.length > 0
      ? utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length
      : 0;
    const variance = utilizations.length > 0
      ? utilizations.reduce((sum, u) => sum + Math.pow(u - avgUtilization, 2), 0) / utilizations.length
      : 0;
    const imbalanceScore = Math.min(100, Math.sqrt(variance) * 200);

    // Generate rebalance actions for high-utilization nodes
    const recommendedRebalanceActions: LiquidityRebalanceAction[] = [];
    const surplusNodes = nodeSnapshots.filter(n => n.utilization < 0.3);
    const deficitNodes = nodeSnapshots.filter(n => n.utilization > 0.85);

    for (let i = 0; i < Math.min(surplusNodes.length, deficitNodes.length); i++) {
      const surplus = surplusNodes[i];
      const deficit = deficitNodes[i];
      const amountUSD = Math.min(
        Math.abs(surplus.liquidityGapUSD),
        Math.abs(deficit.liquidityGapUSD),
        this.config.autoRebalanceMaxAmountUSD
      );

      if (amountUSD > 0) {
        recommendedRebalanceActions.push({
          actionId: this.generateId('rebal'),
          fromNodeId: surplus.nodeId,
          toNodeId: deficit.nodeId,
          amountUSD,
          priority: deficit.utilization > 0.95 ? 'urgent' : 'high',
          estimatedImprovementScore: Math.min(30, amountUSD / 1_000_000),
          reason: `Rebalance from low-utilization node (${(surplus.utilization * 100).toFixed(0)}%) to high-utilization node (${(deficit.utilization * 100).toFixed(0)}%)`,
        });
      }
    }

    const autoRebalanceTriggered = imbalanceScore >= this.config.liquidityImbalanceThreshold
      && this.config.enableAutoLiquidityBalancing;

    const balance: GlobalLiquidityBalance = {
      id: this.generateId('balance'),
      timestamp: new Date(),
      totalNetworkLiquidityUSD,
      byNode: nodeSnapshots,
      byJurisdiction,
      byChain,
      imbalanceScore,
      recommendedRebalanceActions,
      autoRebalanceTriggered,
    };

    this.liquidityBalances.set(balance.id, balance);
    this.latestBalanceId = balance.id;

    if (autoRebalanceTriggered) {
      this.emitEvent({
        id: this.generateId('evt'),
        type: 'liquidity_balanced',
        severity: 'info',
        source: 'AICoordinationLayer',
        message: `Auto liquidity rebalance triggered. Imbalance score: ${imbalanceScore.toFixed(1)}`,
        data: { balanceId: balance.id, imbalanceScore, actionsCount: recommendedRebalanceActions.length },
        timestamp: new Date(),
      });
    }

    return balance;
  }

  getLatestLiquidityBalance(): GlobalLiquidityBalance | undefined {
    if (!this.latestBalanceId) return undefined;
    return this.liquidityBalances.get(this.latestBalanceId);
  }

  listLiquidityBalances(): GlobalLiquidityBalance[] {
    return Array.from(this.liquidityBalances.values());
  }

  triggerLiquidityRebalance(balanceId: string): LiquidityRebalanceAction[] {
    const balance = this.liquidityBalances.get(balanceId);
    if (!balance) throw new Error(`Liquidity balance not found: ${balanceId}`);

    return balance.recommendedRebalanceActions;
  }

  // ============================================================================
  // Risk Cluster Detection
  // ============================================================================

  detectRiskClusters(params: DetectRiskClustersParams): RiskCluster[] {
    const sensitivity = params.sensitivityLevel ?? 'medium';
    const threshold = sensitivity === 'high' ? 40 : sensitivity === 'medium' ? 55 : 70;

    const detectedClusters: RiskCluster[] = [];

    // Detect concentration risk if many nodes in few jurisdictions
    if (params.jurisdictions.length < 3 && params.nodeIds.length > 10) {
      const riskScore = Math.min(100, 90 - params.jurisdictions.length * 10);
      if (riskScore >= threshold) {
        const cluster: RiskCluster = {
          id: this.generateId('cluster'),
          clusterType: 'concentration',
          affectedNodes: params.nodeIds,
          affectedJurisdictions: params.jurisdictions,
          affectedChains: params.chains,
          riskScore,
          contagionProbability: riskScore / 150,
          estimatedExposureUSD: params.nodeIds.length * 10_000_000,
          detectedAt: new Date(),
          mitigationActions: ['Diversify node deployment across more jurisdictions', 'Reduce per-jurisdiction exposure limits'],
          status: 'active',
        };

        this.riskClusters.set(cluster.id, cluster);
        detectedClusters.push(cluster);

        if (riskScore >= this.config.riskClusterAlertThreshold) {
          this.emitEvent({
            id: this.generateId('evt'),
            type: 'risk_cluster_detected',
            severity: 'warning',
            source: 'AICoordinationLayer',
            message: `Risk cluster detected: ${cluster.clusterType} (score: ${riskScore})`,
            data: { clusterId: cluster.id, type: cluster.clusterType, riskScore },
            timestamp: new Date(),
          });
        }
      }
    }

    // Detect correlation risk if all nodes on same chains
    if (params.chains.length === 1 && params.nodeIds.length > 5) {
      const riskScore = 75;
      if (riskScore >= threshold) {
        const cluster: RiskCluster = {
          id: this.generateId('cluster'),
          clusterType: 'correlation',
          affectedNodes: params.nodeIds,
          affectedJurisdictions: params.jurisdictions,
          affectedChains: params.chains,
          riskScore,
          contagionProbability: 0.6,
          estimatedExposureUSD: params.nodeIds.length * 5_000_000,
          detectedAt: new Date(),
          mitigationActions: ['Distribute nodes across multiple chains', 'Enable cross-chain bridging protocols'],
          status: 'active',
        };

        this.riskClusters.set(cluster.id, cluster);
        detectedClusters.push(cluster);
      }
    }

    return detectedClusters;
  }

  getRiskCluster(id: string): RiskCluster | undefined {
    return this.riskClusters.get(id);
  }

  listRiskClusters(filters?: RiskClusterFilters): RiskCluster[] {
    let results = Array.from(this.riskClusters.values());

    if (filters?.clusterType) results = results.filter(c => c.clusterType === filters.clusterType);
    if (filters?.status) results = results.filter(c => c.status === filters.status);
    if (filters?.minRiskScore !== undefined) results = results.filter(c => c.riskScore >= filters.minRiskScore!);
    if (filters?.jurisdiction) results = results.filter(c => c.affectedJurisdictions.includes(filters.jurisdiction!));
    if (filters?.chain) results = results.filter(c => c.affectedChains.includes(filters.chain!));

    return results;
  }

  resolveRiskCluster(id: string, resolution: string): RiskCluster {
    const cluster = this.riskClusters.get(id);
    if (!cluster) throw new Error(`Risk cluster not found: ${id}`);

    cluster.status = 'resolved';
    cluster.resolvedAt = new Date();
    cluster.mitigationActions.push(`Resolved: ${resolution}`);

    return cluster;
  }

  escalateRiskCluster(id: string): RiskCluster {
    const cluster = this.riskClusters.get(id);
    if (!cluster) throw new Error(`Risk cluster not found: ${id}`);

    cluster.status = 'escalated';
    cluster.riskScore = Math.min(100, cluster.riskScore + 15);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'risk_cluster_detected',
      severity: 'critical',
      source: 'AICoordinationLayer',
      message: `Risk cluster escalated: ${cluster.clusterType} (score: ${cluster.riskScore})`,
      data: { clusterId: id, type: cluster.clusterType, riskScore: cluster.riskScore },
      timestamp: new Date(),
    });

    return cluster;
  }

  // ============================================================================
  // Capital Reallocation
  // ============================================================================

  proposeCapitalReallocation(params: ProposeReallocationParams): CapitalReallocation {
    const reallocation: CapitalReallocation = {
      id: this.generateId('realloc'),
      trigger: params.trigger,
      sourceNodes: params.sourceNodes,
      destinationNodes: params.destinationNodes,
      totalCapitalMovedUSD: params.totalCapitalUSD,
      reallocationReason: params.reason,
      aiConfidenceScore: 85,
      expectedImpactScore: 70,
      requiresGovernanceApproval: params.requiresGovernanceApproval ?? true,
      status: 'proposed',
    };

    this.capitalReallocations.set(reallocation.id, reallocation);
    return reallocation;
  }

  getCapitalReallocation(id: string): CapitalReallocation | undefined {
    return this.capitalReallocations.get(id);
  }

  listCapitalReallocations(filters?: ReallocationFilters): CapitalReallocation[] {
    let results = Array.from(this.capitalReallocations.values());

    if (filters?.status) results = results.filter(r => r.status === filters.status);
    if (filters?.requiresGovernanceApproval !== undefined) {
      results = results.filter(r => r.requiresGovernanceApproval === filters.requiresGovernanceApproval);
    }

    return results;
  }

  approveCapitalReallocation(id: string): CapitalReallocation {
    const reallocation = this.capitalReallocations.get(id);
    if (!reallocation) throw new Error(`Capital reallocation not found: ${id}`);
    if (reallocation.status !== 'proposed') {
      throw new Error(`Cannot approve reallocation with status: ${reallocation.status}`);
    }

    reallocation.status = 'approved';
    reallocation.approvedAt = new Date();
    return reallocation;
  }

  executeCapitalReallocation(id: string): CapitalReallocation {
    const reallocation = this.capitalReallocations.get(id);
    if (!reallocation) throw new Error(`Capital reallocation not found: ${id}`);
    if (reallocation.status !== 'approved' && reallocation.status !== 'proposed') {
      throw new Error(`Cannot execute reallocation with status: ${reallocation.status}`);
    }

    reallocation.status = 'executing';
    reallocation.executedAt = new Date();

    // Simulate successful execution
    reallocation.status = 'completed';

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'capital_reallocated',
      severity: 'info',
      source: 'AICoordinationLayer',
      message: `Capital reallocation executed: $${reallocation.totalCapitalMovedUSD.toLocaleString()} USD`,
      data: { reallocationId: id, amountUSD: reallocation.totalCapitalMovedUSD },
      timestamp: new Date(),
    });

    return reallocation;
  }

  cancelCapitalReallocation(id: string, reason: string): CapitalReallocation {
    const reallocation = this.capitalReallocations.get(id);
    if (!reallocation) throw new Error(`Capital reallocation not found: ${id}`);
    if (reallocation.status === 'completed') {
      throw new Error('Cannot cancel a completed reallocation');
    }

    reallocation.status = 'cancelled';
    return reallocation;
  }

  // ============================================================================
  // Crisis Mitigation
  // ============================================================================

  createCrisisMitigationPlan(params: CrisisMitigationParams): CrisisMitigationPlan {
    const steps: MitigationStep[] = params.mitigationSteps.map((step, index) => ({
      ...step,
      stepNumber: index + 1,
    }));

    const plan: CrisisMitigationPlan = {
      id: this.generateId('crisis'),
      crisisTrigger: params.crisisTrigger,
      severity: params.severity,
      affectedNodes: params.affectedNodes,
      estimatedImpactUSD: params.estimatedImpactUSD,
      mitigationSteps: steps,
      activatedAt: new Date(),
      status: 'planning',
    };

    this.crisisMitigationPlans.set(plan.id, plan);
    return plan;
  }

  getCrisisMitigationPlan(id: string): CrisisMitigationPlan | undefined {
    return this.crisisMitigationPlans.get(id);
  }

  listCrisisMitigationPlans(filters?: CrisisFilters): CrisisMitigationPlan[] {
    let results = Array.from(this.crisisMitigationPlans.values());

    if (filters?.status) results = results.filter(p => p.status === filters.status);
    if (filters?.severity) results = results.filter(p => p.severity === filters.severity);

    return results;
  }

  activateCrisisMitigationPlan(id: string): CrisisMitigationPlan {
    const plan = this.crisisMitigationPlans.get(id);
    if (!plan) throw new Error(`Crisis mitigation plan not found: ${id}`);
    if (plan.status !== 'planning') {
      throw new Error(`Cannot activate plan with status: ${plan.status}`);
    }

    plan.status = 'active';

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'crisis_mitigation_triggered',
      severity: 'critical',
      source: 'AICoordinationLayer',
      message: `Crisis mitigation activated: ${plan.crisisTrigger} (${plan.severity})`,
      data: { planId: id, trigger: plan.crisisTrigger, severity: plan.severity },
      timestamp: new Date(),
    });

    return plan;
  }

  completeMitigationStep(planId: string, stepNumber: number, outcome: string): MitigationStep {
    const plan = this.crisisMitigationPlans.get(planId);
    if (!plan) throw new Error(`Crisis mitigation plan not found: ${planId}`);

    const step = plan.mitigationSteps.find(s => s.stepNumber === stepNumber);
    if (!step) throw new Error(`Mitigation step ${stepNumber} not found in plan ${planId}`);

    step.completedAt = new Date();
    step.outcome = outcome;

    return step;
  }

  resolveCrisis(planId: string): CrisisMitigationPlan {
    const plan = this.crisisMitigationPlans.get(planId);
    if (!plan) throw new Error(`Crisis mitigation plan not found: ${planId}`);

    plan.status = 'resolved';
    plan.resolvedAt = new Date();

    return plan;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFNEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFNEvent): void {
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

export function createAICoordinationLayer(
  config?: Partial<AICoordinationConfig>
): DefaultAICoordinationLayer {
  return new DefaultAICoordinationLayer(config);
}

export default DefaultAICoordinationLayer;
