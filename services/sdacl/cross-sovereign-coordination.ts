/**
 * SDACL Component 3 — Cross-Sovereign Coordination Engine
 *
 * AI-assisted coordination of cross-border capital flows, liquidity balancing,
 * risk concentration management, and settlement timing.
 *
 * Ensures no systemic spillover, compliance-aware routing, and stability
 * index protection across sovereign jurisdictions.
 */

import {
  CrossBorderFlow,
  FlowType,
  RiskLevel,
  LiquidityBalance,
  CoordinationSession,
  CoordinationId,
  SovereignAssetId,
  JurisdictionCode,
  CrossSovereignCoordinationStatus,
  SDACLEvent,
  SDACLEventCallback,
} from './types';

// ============================================================================
// Cross-Sovereign Coordination Engine Interface
// ============================================================================

export interface CrossSovereignCoordinationManager {
  // Capital flow coordination
  initiateFlow(params: InitiateFlowParams): CrossBorderFlow;
  getFlow(flowId: CoordinationId): CrossBorderFlow | undefined;
  listFlows(filters?: FlowFilters): CrossBorderFlow[];
  approveFlow(flowId: CoordinationId): CrossBorderFlow;
  blockFlow(flowId: CoordinationId, reason: string): CrossBorderFlow;
  executeFlow(flowId: CoordinationId): CrossBorderFlow;

  // Liquidity balancing
  computeLiquidityBalance(jurisdictionCode: JurisdictionCode, availableUsd: number, requiredUsd: number): LiquidityBalance;
  getLiquidityBalance(jurisdictionCode: JurisdictionCode): LiquidityBalance | undefined;
  listLiquidityBalances(): LiquidityBalance[];
  suggestRebalancing(jurisdictionCodes: JurisdictionCode[]): RebalancingSuggestion[];

  // Coordination sessions
  openSession(params: OpenSessionParams): CoordinationSession;
  concludeSession(sessionId: string, stabilityIndexAfter: number): CoordinationSession;
  suspendSession(sessionId: string, reason: string): void;
  getSession(sessionId: string): CoordinationSession | undefined;
  listSessions(activeOnly?: boolean): CoordinationSession[];

  // Risk assessment
  assessFlowRisk(params: AssessRiskParams): FlowRiskAssessment;
  getSystemicRiskSummary(): SystemicRiskSummary;

  getComponentStatus(): CrossSovereignCoordinationStatus;
  onEvent(callback: SDACLEventCallback): void;
}

export interface InitiateFlowParams {
  flowType: FlowType;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  assetId: SovereignAssetId;
  amountUsd: number;
  complianceVerified?: boolean;
}

export interface FlowFilters {
  flowType?: FlowType;
  sourceJurisdiction?: JurisdictionCode;
  destinationJurisdiction?: JurisdictionCode;
  riskLevel?: RiskLevel;
  status?: CrossBorderFlow['status'];
}

export interface OpenSessionParams {
  participatingJurisdictions: JurisdictionCode[];
  sessionType: CoordinationSession['sessionType'];
  objective: string;
  currentStabilityIndex: number;
}

export interface AssessRiskParams {
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  amountUsd: number;
  assetId?: SovereignAssetId;
}

export interface FlowRiskAssessment {
  riskScore: number;
  riskLevel: RiskLevel;
  concentrationRisk: boolean;
  spilloverRisk: boolean;
  aiRecommendation: string;
  mitigationSuggestions: string[];
  assessedAt: Date;
}

export interface RebalancingSuggestion {
  fromJurisdiction: JurisdictionCode;
  toJurisdiction: JurisdictionCode;
  suggestedAmountUsd: number;
  expectedImpact: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SystemicRiskSummary {
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  highRiskFlows: number;
  systemicSpilloverRisk: boolean;
  recommendations: string[];
  generatedAt: Date;
}

// ============================================================================
// AI-driven risk scoring helpers
// ============================================================================

function computeRiskScore(params: AssessRiskParams, completedFlows: CrossBorderFlow[]): number {
  let score = 20; // base score

  // Cross-border flows carry inherent risk
  if (params.sourceJurisdiction !== params.destinationJurisdiction) {
    score += 15;
  }

  // Large transfers carry more risk
  if (params.amountUsd > 1_000_000_000) score += 30;
  else if (params.amountUsd > 100_000_000) score += 20;
  else if (params.amountUsd > 10_000_000) score += 10;

  // Concentration: same corridor already heavily used
  const corridorFlows = completedFlows.filter(
    f =>
      f.sourceJurisdiction === params.sourceJurisdiction &&
      f.destinationJurisdiction === params.destinationJurisdiction &&
      f.status === 'completed'
  );
  if (corridorFlows.length > 10) score += 15;
  else if (corridorFlows.length > 5) score += 8;

  return Math.min(score, 100);
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function buildAiRecommendation(riskLevel: RiskLevel, concentrationRisk: boolean, spilloverRisk: boolean): string {
  if (riskLevel === 'critical') {
    return 'Flow requires emergency committee approval and systemic risk review before execution.';
  }
  if (riskLevel === 'high') {
    return spilloverRisk
      ? 'Route through multiple corridors to reduce spillover risk. Enhanced monitoring required.'
      : 'Phased execution recommended. Monitor stability index throughout.';
  }
  if (concentrationRisk) {
    return 'Diversify routing path to reduce concentration risk in this corridor.';
  }
  return 'Standard compliance-aware routing approved. Monitor settlement confirmation.';
}

// ============================================================================
// Default Cross-Sovereign Coordination Manager
// ============================================================================

export class DefaultCrossSovereignCoordinationManager implements CrossSovereignCoordinationManager {
  private readonly flows: Map<CoordinationId, CrossBorderFlow> = new Map();
  private readonly blockedReasons: Map<CoordinationId, string> = new Map();
  private readonly liquidityBalances: Map<JurisdictionCode, LiquidityBalance> = new Map();
  private readonly sessions: Map<string, CoordinationSession> = new Map();
  private readonly suspendedReasons: Map<string, string> = new Map();
  private readonly eventCallbacks: SDACLEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  initiateFlow(params: InitiateFlowParams): CrossBorderFlow {
    const completedFlows = Array.from(this.flows.values());
    const riskAssessment = this.assessFlowRisk({
      sourceJurisdiction: params.sourceJurisdiction,
      destinationJurisdiction: params.destinationJurisdiction,
      amountUsd: params.amountUsd,
      assetId: params.assetId,
    });

    const stabilityImpact = riskAssessment.riskScore > 60 ? -(riskAssessment.riskScore * 0.1) : 0;

    const flow: CrossBorderFlow = {
      id: this.generateId('flow'),
      flowType: params.flowType,
      sourceJurisdiction: params.sourceJurisdiction,
      destinationJurisdiction: params.destinationJurisdiction,
      assetId: params.assetId,
      amountUsd: params.amountUsd,
      riskScore: riskAssessment.riskScore,
      riskLevel: riskAssessment.riskLevel,
      aiRecommendation: riskAssessment.aiRecommendation,
      complianceVerified: params.complianceVerified ?? false,
      systemicRiskChecked: true,
      stabilityIndexImpact: stabilityImpact,
      status: 'pending',
      createdAt: new Date(),
    };

    this.flows.set(flow.id, flow);

    this.emitEvent('cross_border_flow_initiated', 3, {
      flowId: flow.id,
      flowType: flow.flowType,
      sourceJurisdiction: flow.sourceJurisdiction,
      destinationJurisdiction: flow.destinationJurisdiction,
      amountUsd: flow.amountUsd,
      riskLevel: flow.riskLevel,
    });

    // Track completedFlows length just to suppress unused var warning
    void completedFlows;

    return flow;
  }

  getFlow(flowId: CoordinationId): CrossBorderFlow | undefined {
    return this.flows.get(flowId);
  }

  listFlows(filters?: FlowFilters): CrossBorderFlow[] {
    let result = Array.from(this.flows.values());
    if (filters?.flowType) result = result.filter(f => f.flowType === filters.flowType);
    if (filters?.sourceJurisdiction) result = result.filter(f => f.sourceJurisdiction === filters.sourceJurisdiction);
    if (filters?.destinationJurisdiction) result = result.filter(f => f.destinationJurisdiction === filters.destinationJurisdiction);
    if (filters?.riskLevel) result = result.filter(f => f.riskLevel === filters.riskLevel);
    if (filters?.status) result = result.filter(f => f.status === filters.status);
    return result;
  }

  approveFlow(flowId: CoordinationId): CrossBorderFlow {
    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow ${flowId} not found`);
    if (flow.status !== 'pending') throw new Error(`Flow ${flowId} is not pending`);

    const approved: CrossBorderFlow = { ...flow, status: 'approved' };
    this.flows.set(flowId, approved);
    return approved;
  }

  blockFlow(flowId: CoordinationId, reason: string): CrossBorderFlow {
    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow ${flowId} not found`);

    const blocked: CrossBorderFlow = { ...flow, status: 'blocked' };
    this.flows.set(flowId, blocked);
    this.blockedReasons.set(flowId, reason);
    return blocked;
  }

  executeFlow(flowId: CoordinationId): CrossBorderFlow {
    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow ${flowId} not found`);
    if (flow.status !== 'approved') throw new Error(`Flow ${flowId} must be approved before execution`);

    const completed: CrossBorderFlow = {
      ...flow,
      status: 'completed',
      completedAt: new Date(),
    };
    this.flows.set(flowId, completed);

    this.emitEvent('cross_border_flow_completed', 3, {
      flowId,
      amountUsd: flow.amountUsd,
      sourceJurisdiction: flow.sourceJurisdiction,
      destinationJurisdiction: flow.destinationJurisdiction,
    });

    return completed;
  }

  computeLiquidityBalance(
    jurisdictionCode: JurisdictionCode,
    availableUsd: number,
    requiredUsd: number
  ): LiquidityBalance {
    const liquidityRatio = requiredUsd > 0 ? availableUsd / requiredUsd : 1;
    const imbalanceUsd = availableUsd - requiredUsd;
    const rebalancingRecommended = liquidityRatio < 0.9 || liquidityRatio > 1.5;

    let aiSuggestedAction: string | undefined;
    if (liquidityRatio < 0.9) {
      aiSuggestedAction = `Increase liquidity allocation to ${jurisdictionCode} by ${Math.abs(imbalanceUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
    } else if (liquidityRatio > 1.5) {
      aiSuggestedAction = `Redistribute excess liquidity from ${jurisdictionCode} to under-served corridors`;
    }

    const balance: LiquidityBalance = {
      jurisdictionCode,
      availableLiquidityUsd: availableUsd,
      requiredLiquidityUsd: requiredUsd,
      liquidityRatio,
      imbalanceUsd,
      rebalancingRecommended,
      aiSuggestedAction,
    };

    this.liquidityBalances.set(jurisdictionCode, balance);
    return balance;
  }

  getLiquidityBalance(jurisdictionCode: JurisdictionCode): LiquidityBalance | undefined {
    return this.liquidityBalances.get(jurisdictionCode);
  }

  listLiquidityBalances(): LiquidityBalance[] {
    return Array.from(this.liquidityBalances.values());
  }

  suggestRebalancing(jurisdictionCodes: JurisdictionCode[]): RebalancingSuggestion[] {
    const suggestions: RebalancingSuggestion[] = [];
    const balances = jurisdictionCodes
      .map(jc => this.liquidityBalances.get(jc))
      .filter((b): b is LiquidityBalance => !!b);

    const surplusJurisdictions = balances.filter(b => b.liquidityRatio > 1.3);
    const deficitJurisdictions = balances.filter(b => b.liquidityRatio < 0.85);

    for (const surplus of surplusJurisdictions) {
      for (const deficit of deficitJurisdictions) {
        const transferAmount = Math.min(
          surplus.availableLiquidityUsd - surplus.requiredLiquidityUsd,
          deficit.requiredLiquidityUsd - deficit.availableLiquidityUsd
        );

        if (transferAmount > 0) {
          suggestions.push({
            fromJurisdiction: surplus.jurisdictionCode,
            toJurisdiction: deficit.jurisdictionCode,
            suggestedAmountUsd: transferAmount,
            expectedImpact: `Improve ${deficit.jurisdictionCode} liquidity ratio from ${deficit.liquidityRatio.toFixed(2)} to ~1.0`,
            priority: deficit.liquidityRatio < 0.7 ? 'high' : 'medium',
          });
        }
      }
    }

    return suggestions;
  }

  openSession(params: OpenSessionParams): CoordinationSession {
    const session: CoordinationSession = {
      id: this.generateId('session'),
      participatingJurisdictions: params.participatingJurisdictions,
      sessionType: params.sessionType,
      objective: params.objective,
      status: 'active',
      stabilityIndexBefore: params.currentStabilityIndex,
      startedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  concludeSession(sessionId: string, stabilityIndexAfter: number): CoordinationSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Coordination session ${sessionId} not found`);
    if (session.status !== 'active') throw new Error(`Session ${sessionId} is not active`);

    const concluded: CoordinationSession = {
      ...session,
      status: 'concluded',
      stabilityIndexAfter,
      concludedAt: new Date(),
    };
    this.sessions.set(sessionId, concluded);
    return concluded;
  }

  suspendSession(sessionId: string, reason: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Coordination session ${sessionId} not found`);

    this.sessions.set(sessionId, { ...session, status: 'suspended' });
    this.suspendedReasons.set(sessionId, reason);
  }

  getSession(sessionId: string): CoordinationSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(activeOnly = false): CoordinationSession[] {
    const all = Array.from(this.sessions.values());
    if (activeOnly) return all.filter(s => s.status === 'active');
    return all;
  }

  assessFlowRisk(params: AssessRiskParams): FlowRiskAssessment {
    const completedFlows = Array.from(this.flows.values());
    const riskScore = computeRiskScore(params, completedFlows);
    const riskLevel = scoreToLevel(riskScore);

    const concentrationRisk = completedFlows.filter(
      f =>
        f.sourceJurisdiction === params.sourceJurisdiction &&
        f.destinationJurisdiction === params.destinationJurisdiction
    ).length > 8;

    const spilloverRisk = riskScore > 60;
    const aiRecommendation = buildAiRecommendation(riskLevel, concentrationRisk, spilloverRisk);

    const mitigationSuggestions: string[] = [];
    if (concentrationRisk) mitigationSuggestions.push('Diversify routing across multiple corridors');
    if (riskScore > 40) mitigationSuggestions.push('Enable real-time stability index monitoring');
    if (params.amountUsd > 100_000_000) mitigationSuggestions.push('Use phased execution with intermediate settlement checkpoints');
    if (spilloverRisk) mitigationSuggestions.push('Coordinate with cross-sovereign session before execution');

    return {
      riskScore,
      riskLevel,
      concentrationRisk,
      spilloverRisk,
      aiRecommendation,
      mitigationSuggestions,
      assessedAt: new Date(),
    };
  }

  getSystemicRiskSummary(): SystemicRiskSummary {
    const flows = Array.from(this.flows.values());
    const activeFlows = flows.filter(f => f.status !== 'completed' && f.status !== 'blocked');
    const highRiskFlows = activeFlows.filter(f => f.riskLevel === 'high' || f.riskLevel === 'critical').length;
    const avgScore = activeFlows.length > 0
      ? activeFlows.reduce((sum, f) => sum + f.riskScore, 0) / activeFlows.length
      : 0;

    const overallRiskLevel = scoreToLevel(avgScore);
    const systemicSpilloverRisk = highRiskFlows > 3 || avgScore > 65;

    const recommendations: string[] = [];
    if (systemicSpilloverRisk) recommendations.push('Activate emergency coordination session');
    if (highRiskFlows > 0) recommendations.push(`Review ${highRiskFlows} high-risk flows before execution`);
    if (avgScore > 50) recommendations.push('Increase stability index monitoring frequency');
    if (recommendations.length === 0) recommendations.push('System operating within normal risk parameters');

    return {
      overallRiskScore: Math.round(avgScore),
      overallRiskLevel,
      highRiskFlows,
      systemicSpilloverRisk,
      recommendations,
      generatedAt: new Date(),
    };
  }

  getComponentStatus(): CrossSovereignCoordinationStatus {
    const flows = Array.from(this.flows.values());
    const activeFlows = flows.filter(f => f.status === 'pending' || f.status === 'approved' || f.status === 'executing');
    const completedFlows = flows.filter(f => f.status === 'completed');
    const totalVolumeUsd = completedFlows.reduce((sum, f) => sum + f.amountUsd, 0);
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.status === 'active').length;
    const jurisdictionsMonitored = new Set([
      ...flows.map(f => f.sourceJurisdiction),
      ...flows.map(f => f.destinationJurisdiction),
      ...Array.from(this.liquidityBalances.keys()),
    ]).size;

    const avgRiskScore = flows.length > 0
      ? flows.reduce((sum, f) => sum + f.riskScore, 0) / flows.length
      : 0;

    const systemicSpilloverEvents = flows.filter(f => f.riskLevel === 'critical').length;

    return {
      activeFlows: activeFlows.length,
      completedFlows: completedFlows.length,
      totalCoordinatedVolumeUsd: totalVolumeUsd,
      activeSessions,
      jurisdictionsMonitored,
      averageRiskScore: Math.round(avgRiskScore),
      systemicSpilloverEvents,
    };
  }

  onEvent(callback: SDACLEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: SDACLEvent['type'], component: SDACLEvent['component'], data: Record<string, unknown>): void {
    const event: SDACLEvent = { type, component, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createCrossSovereignCoordinationManager(): DefaultCrossSovereignCoordinationManager {
  return new DefaultCrossSovereignCoordinationManager();
}
