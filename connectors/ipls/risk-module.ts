/**
 * TONAIAgent - Cross-Protocol Risk Module
 *
 * Implements cross-protocol risk mapping, external protocol exposure assessment,
 * liquidity depth analysis, volatility scoring, smart contract risk evaluation,
 * and AI-driven capital allocation decisions for the IPLS framework (Issue #124).
 */

import {
  CrossProtocolRiskAssessment,
  RiskDimensions,
  RiskAlert,
  AIRiskInsights,
  CapitalAllocationRecommendation,
  RiskScenario,
  ProtocolExposure,
  ExposureReport,
  ProtocolId,
  RiskAssessmentId,
  RiskTier,
  ExposureType,
  IPLSEvent,
  IPLSEventCallback,
  RiskModuleConfig,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface CrossProtocolRiskManager {
  // Risk assessments
  assessProtocol(request: AssessProtocolRequest): Promise<CrossProtocolRiskAssessment>;
  getAssessment(assessmentId: RiskAssessmentId): Promise<CrossProtocolRiskAssessment | null>;
  getLatestAssessment(protocolId: ProtocolId): Promise<CrossProtocolRiskAssessment | null>;
  listAssessments(filters?: AssessmentFilters): Promise<CrossProtocolRiskAssessment[]>;
  refreshAssessment(assessmentId: RiskAssessmentId): Promise<CrossProtocolRiskAssessment>;

  // Exposure tracking
  recordExposureReport(report: ExposureReport): Promise<void>;
  getExposuresByProtocol(protocolId: ProtocolId): Promise<ProtocolExposure[]>;
  getNetworkExposureMap(): Promise<NetworkExposureMap>;
  getContagionRisk(protocolId: ProtocolId): Promise<ContagionAnalysis>;

  // Risk alerts
  getActiveAlerts(): Promise<RiskAlert[]>;
  getAlertsByProtocol(protocolId: ProtocolId): Promise<RiskAlert[]>;
  resolveAlert(alertId: string): Promise<void>;
  createAlert(alert: Omit<RiskAlert, 'id' | 'timestamp' | 'resolved'>): Promise<RiskAlert>;

  // AI risk insights
  generateAIInsights(protocolId: ProtocolId): Promise<AIRiskInsights>;
  getCapitalAllocationRecommendations(): Promise<CapitalAllocationRecommendation[]>;
  runStressTest(scenario: StressTestScenario): Promise<StressTestResult>;

  // Risk thresholds and configuration
  updateThresholds(thresholds: Partial<RiskThresholds>): Promise<void>;
  getThresholds(): RiskThresholds;

  // Analytics
  getRiskSummary(): RiskSummary;
  getRiskTrends(protocolId: ProtocolId, windowDays: number): Promise<RiskTrendData[]>;
  getSystemicRiskScore(): Promise<number>;

  // Events
  onEvent(callback: IPLSEventCallback): void;

  // Health
  getHealth(): RiskModuleHealth;
}

export interface AssessProtocolRequest {
  protocolId: ProtocolId;
  protocolName: string;
  exposures?: ProtocolExposure[];
  overrides?: Partial<RiskDimensionOverrides>;
  includeAIInsights?: boolean;
}

export interface RiskDimensionOverrides {
  riskScore?: number;
  auditsPassed?: number;
  criticalVulnerabilities?: number;
  totalValueLockedUsd?: string;
  avgDailyVolumeUsd?: string;
  uptimePercent?: number;
  incidentCount30d?: number;
  dailyVolatility30d?: number;
  maxDrawdown30d?: number;
}

export interface AssessmentFilters {
  protocolIds?: ProtocolId[];
  riskTiers?: RiskTier[];
  minScore?: number;
  maxScore?: number;
  isExpired?: boolean;
  limit?: number;
  offset?: number;
}

export interface NetworkExposureMap {
  timestamp: Date;
  totalNodes: number;
  totalEdges: number;
  totalExposureUsd: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusterRisk: ClusterRisk[];
  systemicRiskScore: number;
}

export interface NetworkNode {
  protocolId: ProtocolId;
  protocolName: string;
  riskTier: RiskTier;
  riskScore: number;
  totalExposureUsd: string;
  inDegree: number;
  outDegree: number;
  centrality: number;
}

export interface NetworkEdge {
  from: ProtocolId;
  to: ProtocolId;
  exposureUsd: string;
  asset: string;
  exposureType: ExposureType;
  collateralCoverage: number;
}

export interface ClusterRisk {
  clusterName: string;
  protocols: ProtocolId[];
  totalExposureUsd: string;
  internalExposureUsd: string;
  externalExposureUsd: string;
  concentrationRisk: number;
}

export interface ContagionAnalysis {
  protocolId: ProtocolId;
  directContagionRisk: number; // 0–1
  indirectContagionRisk: number; // 0–1
  contagionPaths: ContagionPath[];
  estimatedImpactUsd: string;
  affectedProtocols: ProtocolId[];
  circuitBreakerRecommended: boolean;
}

export interface ContagionPath {
  steps: ProtocolId[];
  totalExposureUsd: string;
  probability: number;
  estimatedLossUsd: string;
}

export interface StressTestScenario {
  name: string;
  description: string;
  shocks: MarketShock[];
  protocolFailures?: ProtocolId[];
  duration: number; // ms
  confidenceLevel: number;
}

export interface MarketShock {
  asset: string;
  priceChange: number; // percentage, negative = decline
  volatilityMultiplier: number;
  liquidityReduction: number; // 0–1
}

export interface StressTestResult {
  scenarioName: string;
  timestamp: Date;
  overallImpact: 'minimal' | 'moderate' | 'severe' | 'catastrophic';
  estimatedLossUsd: string;
  estimatedLossPercent: number;
  protocolResults: ProtocolStressResult[];
  systemicRiskIncrease: number;
  recommendations: string[];
  resilienceScore: number;
}

export interface ProtocolStressResult {
  protocolId: ProtocolId;
  protocolName: string;
  preShockExposureUsd: string;
  postShockExposureUsd: string;
  estimatedLossUsd: string;
  survivalProbability: number;
  marginCallTriggered: boolean;
  liquidationRequired: boolean;
}

export interface RiskThresholds {
  tier1MaxScore: number;
  tier2MaxScore: number;
  tier3MaxScore: number;
  alertWarningScore: number;
  alertCriticalScore: number;
  alertEmergencyScore: number;
  maxUncollateralizedExposureUsd: string;
  maxConcentrationRatio: number;
  maxSingleProtocolExposureUsd: string;
}

export interface RiskSummary {
  totalAssessments: number;
  tier1Protocols: number;
  tier2Protocols: number;
  tier3Protocols: number;
  unratedProtocols: number;
  activeAlerts: number;
  criticalAlerts: number;
  avgSystemicRiskScore: number;
  lastUpdated: Date;
}

export interface RiskTrendData {
  timestamp: Date;
  riskScore: number;
  riskTier: RiskTier;
  alerts: number;
}

export interface RiskModuleHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  assessmentsCount: number;
  activeAlertsCount: number;
  lastAssessmentAt?: Date;
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultCrossProtocolRiskManager implements CrossProtocolRiskManager {
  private assessments: Map<RiskAssessmentId, CrossProtocolRiskAssessment> = new Map();
  private latestAssessments: Map<ProtocolId, RiskAssessmentId> = new Map();
  private alerts: Map<string, RiskAlert> = new Map();
  private exposureReports: Map<string, ExposureReport> = new Map();
  private eventCallbacks: IPLSEventCallback[] = [];
  private thresholds: RiskThresholds;
  private config: RiskModuleConfig;

  constructor(config?: Partial<RiskModuleConfig>) {
    this.config = {
      enabled: true,
      assessmentIntervalMs: 3600000, // 1 hour
      alertThresholds: {},
      aiModelEnabled: true,
      historicalWindowDays: 30,
      stressTestEnabled: true,
      ...config,
    };

    this.thresholds = {
      tier1MaxScore: 25,
      tier2MaxScore: 55,
      tier3MaxScore: 80,
      alertWarningScore: 60,
      alertCriticalScore: 75,
      alertEmergencyScore: 90,
      maxUncollateralizedExposureUsd: '1000000',
      maxConcentrationRatio: 0.4,
      maxSingleProtocolExposureUsd: '5000000',
    };
  }

  async assessProtocol(request: AssessProtocolRequest): Promise<CrossProtocolRiskAssessment> {
    const assessmentId = this.generateId('assessment');
    const overrides = request.overrides || {};
    const now = new Date();

    const dimensions: RiskDimensions = this.computeRiskDimensions(request, overrides);
    const overallScore = this.aggregateRiskScore(dimensions);
    const riskTier = this.scoreToTier(overallScore);
    const alerts = this.generateAlerts(request.protocolId, overallScore, dimensions);

    let aiInsights: AIRiskInsights | undefined;
    if (request.includeAIInsights && this.config.aiModelEnabled) {
      aiInsights = await this.generateAIInsights(request.protocolId);
    }

    const assessment: CrossProtocolRiskAssessment = {
      id: assessmentId,
      subjectId: request.protocolId,
      assessorId: 'ipls_risk_module',
      timestamp: now,
      overallScore,
      riskTier,
      dimensions,
      alerts,
      recommendations: this.generateRecommendations(dimensions, overallScore),
      aiInsights,
      validUntil: new Date(now.getTime() + this.config.assessmentIntervalMs),
    };

    this.assessments.set(assessmentId, assessment);
    this.latestAssessments.set(request.protocolId, assessmentId);

    for (const alert of alerts) {
      this.alerts.set(alert.id, alert);
    }

    this.emitEvent('risk_assessed', request.protocolId, 'assess_protocol', {
      assessmentId,
      overallScore,
      riskTier,
    });

    return assessment;
  }

  async getAssessment(assessmentId: RiskAssessmentId): Promise<CrossProtocolRiskAssessment | null> {
    return this.assessments.get(assessmentId) || null;
  }

  async getLatestAssessment(protocolId: ProtocolId): Promise<CrossProtocolRiskAssessment | null> {
    const assessmentId = this.latestAssessments.get(protocolId);
    if (!assessmentId) return null;
    return this.assessments.get(assessmentId) || null;
  }

  async listAssessments(filters?: AssessmentFilters): Promise<CrossProtocolRiskAssessment[]> {
    let assessments = Array.from(this.assessments.values());

    if (filters) {
      if (filters.protocolIds?.length) {
        assessments = assessments.filter((a) => filters.protocolIds!.includes(a.subjectId));
      }
      if (filters.riskTiers?.length) {
        assessments = assessments.filter((a) => filters.riskTiers!.includes(a.riskTier));
      }
      if (filters.minScore !== undefined) {
        assessments = assessments.filter((a) => a.overallScore >= filters.minScore!);
      }
      if (filters.maxScore !== undefined) {
        assessments = assessments.filter((a) => a.overallScore <= filters.maxScore!);
      }
      if (filters.isExpired !== undefined) {
        const now = new Date();
        assessments = assessments.filter((a) =>
          filters.isExpired ? a.validUntil < now : a.validUntil >= now
        );
      }

      if (filters.offset !== undefined) {
        assessments = assessments.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        assessments = assessments.slice(0, filters.limit);
      }
    }

    return assessments;
  }

  async refreshAssessment(assessmentId: RiskAssessmentId): Promise<CrossProtocolRiskAssessment> {
    const existing = this.assessments.get(assessmentId);
    if (!existing) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    return this.assessProtocol({
      protocolId: existing.subjectId,
      protocolName: existing.subjectId,
      includeAIInsights: existing.aiInsights !== undefined,
    });
  }

  async recordExposureReport(report: ExposureReport): Promise<void> {
    this.exposureReports.set(report.reportId, report);
    this.emitEvent('risk_assessed', report.reporterId, 'record_exposure', {
      reportId: report.reportId,
    });
  }

  async getExposuresByProtocol(protocolId: ProtocolId): Promise<ProtocolExposure[]> {
    const exposures: ProtocolExposure[] = [];

    for (const report of this.exposureReports.values()) {
      if (report.reporterId === protocolId) {
        exposures.push(...report.exposures);
      }
    }

    return exposures;
  }

  async getNetworkExposureMap(): Promise<NetworkExposureMap> {
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    const protocolExposures: Map<ProtocolId, number> = new Map();
    const protocolConnections: Map<ProtocolId, Set<ProtocolId>> = new Map();

    for (const report of this.exposureReports.values()) {
      const reporterId = report.reporterId;

      if (!protocolConnections.has(reporterId)) {
        protocolConnections.set(reporterId, new Set());
      }

      for (const exp of report.exposures) {
        const current = protocolExposures.get(reporterId) || 0;
        protocolExposures.set(reporterId, current + parseFloat(exp.grossExposure));

        protocolConnections.get(reporterId)!.add(exp.counterpartyId);

        edges.push({
          from: reporterId,
          to: exp.counterpartyId,
          exposureUsd: exp.grossExposure,
          asset: exp.asset,
          exposureType: exp.exposureType,
          collateralCoverage: exp.collateralCoverage,
        });
      }
    }

    let totalExposure = 0;
    for (const [protocolId, exposure] of protocolExposures.entries()) {
      totalExposure += exposure;
      const assessment = await this.getLatestAssessment(protocolId);
      const connections = protocolConnections.get(protocolId) || new Set();

      nodes.push({
        protocolId,
        protocolName: protocolId,
        riskTier: assessment?.riskTier || 'unrated',
        riskScore: assessment?.overallScore || 50,
        totalExposureUsd: exposure.toString(),
        inDegree: edges.filter((e) => e.to === protocolId).length,
        outDegree: connections.size,
        centrality: Math.min(connections.size / Math.max(nodes.length, 1), 1),
      });
    }

    const systemicScore = await this.getSystemicRiskScore();

    return {
      timestamp: new Date(),
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalExposureUsd: totalExposure.toString(),
      nodes,
      edges,
      clusterRisk: this.computeClusterRisk(nodes, edges),
      systemicRiskScore: systemicScore,
    };
  }

  async getContagionRisk(protocolId: ProtocolId): Promise<ContagionAnalysis> {
    const directEdges = Array.from(this.exposureReports.values())
      .filter((r) => r.reporterId === protocolId)
      .flatMap((r) => r.exposures);

    const directContagion = Math.min(directEdges.length * 0.1, 1);

    const indirectEdges = Array.from(this.exposureReports.values())
      .filter((r) =>
        r.exposures.some((e) => e.counterpartyId === protocolId)
      )
      .flatMap((r) => r.exposures.filter((e) => e.counterpartyId === protocolId));

    const indirectContagion = Math.min(indirectEdges.length * 0.05, 1);

    const affectedProtocols = [
      ...new Set([
        ...directEdges.map((e) => e.counterpartyId),
        ...indirectEdges.map((e) => e.counterpartyId),
      ]),
    ];

    const totalImpact = directEdges.reduce(
      (sum, e) => sum + parseFloat(e.grossExposure),
      0
    );

    return {
      protocolId,
      directContagionRisk: directContagion,
      indirectContagionRisk: indirectContagion,
      contagionPaths: directEdges.slice(0, 5).map((e) => ({
        steps: [protocolId, e.counterpartyId],
        totalExposureUsd: e.grossExposure,
        probability: directContagion,
        estimatedLossUsd: (parseFloat(e.grossExposure) * 0.5).toString(),
      })),
      estimatedImpactUsd: totalImpact.toString(),
      affectedProtocols,
      circuitBreakerRecommended: directContagion + indirectContagion > 0.7,
    };
  }

  async getActiveAlerts(): Promise<RiskAlert[]> {
    return Array.from(this.alerts.values()).filter((a) => !a.resolved);
  }

  async getAlertsByProtocol(protocolId: ProtocolId): Promise<RiskAlert[]> {
    return Array.from(this.alerts.values()).filter(
      (a) => a.affectedProtocol === protocolId
    );
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.resolved = true;
    this.alerts.set(alertId, alert);
  }

  async createAlert(alert: Omit<RiskAlert, 'id' | 'timestamp' | 'resolved'>): Promise<RiskAlert> {
    const fullAlert: RiskAlert = {
      ...alert,
      id: this.generateId('alert'),
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.set(fullAlert.id, fullAlert);

    if (fullAlert.severity === 'critical' || fullAlert.severity === 'emergency') {
      this.emitEvent('risk_alert', fullAlert.affectedProtocol || 'system', 'create_alert', {
        alert: fullAlert,
      });
    }

    return fullAlert;
  }

  async generateAIInsights(protocolId: ProtocolId): Promise<AIRiskInsights> {
    const assessment = await this.getLatestAssessment(protocolId);
    const exposures = await this.getExposuresByProtocol(protocolId);

    const currentScore = assessment?.overallScore || 50;
    const trend =
      currentScore < 30 ? 'improving' : currentScore > 70 ? 'deteriorating' : 'stable';

    const keyFactors: string[] = [];
    if (assessment) {
      if (assessment.dimensions.smartContract.score > 60) {
        keyFactors.push('Elevated smart contract risk due to audit findings');
      }
      if (assessment.dimensions.liquidityDepth.utilizationRate > 0.8) {
        keyFactors.push('High TVL utilization approaching capacity limits');
      }
      if (assessment.dimensions.concentration.giniCoefficient > 0.7) {
        keyFactors.push('High liquidity concentration risk');
      }
      if (assessment.dimensions.volatility.recentMaxDrawdown > 0.2) {
        keyFactors.push('Significant recent drawdown observed');
      }
    }

    const totalExposure = exposures.reduce(
      (sum, e) => sum + parseFloat(e.grossExposure),
      0
    );
    const recommendedAlloc = Math.max(0, 1000000 - totalExposure * 0.1);

    const scenarios: RiskScenario[] = [
      {
        name: 'Market Stress',
        probability: 0.15,
        impact: 'medium',
        estimatedLossUsd: (totalExposure * 0.2).toString(),
        description: '20% market-wide liquidity decline',
        mitigationActions: ['Reduce leverage', 'Increase collateral buffers'],
      },
      {
        name: 'Smart Contract Exploit',
        probability: 0.05,
        impact: 'high',
        estimatedLossUsd: (totalExposure * 0.5).toString(),
        description: 'Critical vulnerability exploited',
        mitigationActions: ['Circuit breaker activation', 'Emergency withdrawal'],
      },
      {
        name: 'Regulatory Action',
        probability: 0.1,
        impact: 'medium',
        estimatedLossUsd: (totalExposure * 0.15).toString(),
        description: 'Regulatory restriction on protocol operations',
        mitigationActions: ['Diversify across jurisdictions', 'Compliance review'],
      },
    ];

    return {
      modelVersion: '1.0.0',
      confidenceScore: 0.75,
      predictedRiskTrend: trend,
      keyRiskFactors: keyFactors,
      capitalAllocationRecommendation: {
        providerId: protocolId,
        currentAllocationUsd: totalExposure.toString(),
        recommendedAllocationUsd: recommendedAlloc.toString(),
        allocationChange: totalExposure > 0 ? ((recommendedAlloc - totalExposure) / totalExposure) * 100 : 0,
        rationale: `Based on current risk score of ${currentScore} and trend: ${trend}`,
        confidence: 0.75,
      },
      scenarioAnalysis: scenarios,
      generatedAt: new Date(),
    };
  }

  async getCapitalAllocationRecommendations(): Promise<CapitalAllocationRecommendation[]> {
    const recommendations: CapitalAllocationRecommendation[] = [];

    for (const [protocolId] of this.latestAssessments) {
      const insights = await this.generateAIInsights(protocolId);
      recommendations.push(insights.capitalAllocationRecommendation);
    }

    return recommendations.sort(
      (a, b) => Math.abs(b.allocationChange) - Math.abs(a.allocationChange)
    );
  }

  async runStressTest(scenario: StressTestScenario): Promise<StressTestResult> {
    const protocolResults: ProtocolStressResult[] = [];
    let totalLoss = 0;

    for (const [protocolId] of this.latestAssessments) {
      const exposures = await this.getExposuresByProtocol(protocolId);
      const preExposure = exposures.reduce(
        (sum, e) => sum + parseFloat(e.grossExposure),
        0
      );

      let postExposure = preExposure;

      for (const shock of scenario.shocks) {
        const relevantExposures = exposures.filter((e) => e.asset === shock.asset);
        const exposureToShock = relevantExposures.reduce(
          (sum, e) => sum + parseFloat(e.grossExposure),
          0
        );
        postExposure -= exposureToShock * Math.abs(shock.priceChange / 100);
      }

      if (scenario.protocolFailures?.includes(protocolId)) {
        postExposure = 0;
      }

      const loss = Math.max(0, preExposure - postExposure);
      totalLoss += loss;

      const assessment = await this.getLatestAssessment(protocolId);
      const marginCallThreshold = preExposure * 0.7;

      protocolResults.push({
        protocolId,
        protocolName: protocolId,
        preShockExposureUsd: preExposure.toString(),
        postShockExposureUsd: postExposure.toString(),
        estimatedLossUsd: loss.toString(),
        survivalProbability: postExposure > 0 ? Math.min(postExposure / preExposure, 1) : 0,
        marginCallTriggered: postExposure < marginCallThreshold,
        liquidationRequired: postExposure <= 0 || (assessment?.overallScore || 50) > 85,
      });
    }

    const totalPreExposure = protocolResults.reduce(
      (sum, r) => sum + parseFloat(r.preShockExposureUsd),
      0
    );
    const lossPercent = totalPreExposure > 0 ? (totalLoss / totalPreExposure) * 100 : 0;

    let impact: StressTestResult['overallImpact'] = 'minimal';
    if (lossPercent > 5) impact = 'moderate';
    if (lossPercent > 20) impact = 'severe';
    if (lossPercent > 50) impact = 'catastrophic';

    return {
      scenarioName: scenario.name,
      timestamp: new Date(),
      overallImpact: impact,
      estimatedLossUsd: totalLoss.toString(),
      estimatedLossPercent: lossPercent,
      protocolResults,
      systemicRiskIncrease: lossPercent * 0.5,
      recommendations: this.generateStressTestRecommendations(impact, lossPercent),
      resilienceScore: Math.max(0, 100 - lossPercent),
    };
  }

  async updateThresholds(thresholds: Partial<RiskThresholds>): Promise<void> {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  getThresholds(): RiskThresholds {
    return { ...this.thresholds };
  }

  getRiskSummary(): RiskSummary {
    const assessments = Array.from(this.assessments.values());
    const latestAssessmentIds = new Set(this.latestAssessments.values());
    const latestAssessments = assessments.filter((a) => latestAssessmentIds.has(a.id));

    const activeAlerts = Array.from(this.alerts.values()).filter((a) => !a.resolved);
    const criticalAlerts = activeAlerts.filter(
      (a) => a.severity === 'critical' || a.severity === 'emergency'
    );

    const avgScore =
      latestAssessments.length > 0
        ? latestAssessments.reduce((sum, a) => sum + a.overallScore, 0) / latestAssessments.length
        : 0;

    return {
      totalAssessments: assessments.length,
      tier1Protocols: latestAssessments.filter((a) => a.riskTier === 'tier1').length,
      tier2Protocols: latestAssessments.filter((a) => a.riskTier === 'tier2').length,
      tier3Protocols: latestAssessments.filter((a) => a.riskTier === 'tier3').length,
      unratedProtocols: latestAssessments.filter((a) => a.riskTier === 'unrated').length,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      avgSystemicRiskScore: avgScore,
      lastUpdated: new Date(),
    };
  }

  async getRiskTrends(protocolId: ProtocolId, windowDays: number): Promise<RiskTrendData[]> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const protocolAssessments = Array.from(this.assessments.values())
      .filter(
        (a) => a.subjectId === protocolId && a.timestamp >= windowStart
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return protocolAssessments.map((a) => ({
      timestamp: a.timestamp,
      riskScore: a.overallScore,
      riskTier: a.riskTier,
      alerts: a.alerts.length,
    }));
  }

  async getSystemicRiskScore(): Promise<number> {
    const latestIds = new Set(this.latestAssessments.values());
    const latest = Array.from(this.assessments.values()).filter((a) => latestIds.has(a.id));

    if (latest.length === 0) return 0;

    const activeAlerts = Array.from(this.alerts.values()).filter((a) => !a.resolved);
    const criticalAlerts = activeAlerts.filter(
      (a) => a.severity === 'critical' || a.severity === 'emergency'
    ).length;

    const avgScore = latest.reduce((sum, a) => sum + a.overallScore, 0) / latest.length;
    const alertPenalty = Math.min(criticalAlerts * 5, 20);

    return Math.min(100, avgScore + alertPenalty);
  }

  onEvent(callback: IPLSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): RiskModuleHealth {
    const assessments = Array.from(this.assessments.values());
    const activeAlerts = Array.from(this.alerts.values()).filter((a) => !a.resolved);
    const issues: string[] = [];

    if (activeAlerts.filter((a) => a.severity === 'emergency').length > 0) {
      issues.push('Emergency-level risk alerts active');
    }
    if (activeAlerts.filter((a) => a.severity === 'critical').length > 0) {
      issues.push('Critical risk alerts require attention');
    }

    const lastAssessment = assessments.length > 0
      ? assessments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
      : undefined;

    return {
      status: issues.length === 0 ? 'healthy' : issues.some((i) => i.includes('Emergency')) ? 'unhealthy' : 'degraded',
      assessmentsCount: assessments.length,
      activeAlertsCount: activeAlerts.length,
      lastAssessmentAt: lastAssessment?.timestamp,
      issues,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    type: IPLSEvent['type'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: IPLSEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      severity: 'info',
      source: 'risk_module',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedProtocols: [sourceId],
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private computeRiskDimensions(
    request: AssessProtocolRequest,
    overrides: Partial<RiskDimensionOverrides>
  ): RiskDimensions {
    const tvl = parseFloat(overrides.totalValueLockedUsd || '1000000');
    const volume = parseFloat(overrides.avgDailyVolumeUsd || '100000');
    const uptime = overrides.uptimePercent || 99.5;
    const incidents = overrides.incidentCount30d || 0;
    const volatility = overrides.dailyVolatility30d || 0.05;
    const drawdown = overrides.maxDrawdown30d || 0.1;
    const auditsPassed = overrides.auditsPassed || 0;
    const criticalVulns = overrides.criticalVulnerabilities || 0;

    const utilizationRate = volume > 0 ? Math.min(volume / tvl, 1) : 0;

    const exposures = request.exposures || [];
    const totalExposure = exposures.reduce(
      (sum, e) => sum + parseFloat(e.grossExposure),
      0
    );
    const uncollateralized = exposures
      .filter((e) => e.collateralCoverage < 1)
      .reduce((sum, e) => sum + parseFloat(e.grossExposure) * (1 - e.collateralCoverage), 0);

    const exposureScore = Math.min(100, (totalExposure / 5000000) * 50 + (uncollateralized / 1000000) * 50);
    const depthScore = Math.min(100, utilizationRate * 80 + (tvl < 100000 ? 20 : 0));
    const volatilityScore = Math.min(100, volatility * 500 + drawdown * 200);
    const scRiskScore = Math.min(100, criticalVulns * 40 + (auditsPassed === 0 ? 30 : 0));
    const operationalScore = Math.min(100, (100 - uptime) * 10 + incidents * 15);

    // Concentration risk
    const concentrations = exposures.map((e) => (totalExposure > 0 ? parseFloat(e.grossExposure) / totalExposure : 0));
    const gini = this.computeGini(concentrations);
    const herfindahl = concentrations.reduce((sum, c) => sum + c * c, 0);
    const concentrationScore = Math.min(100, gini * 60 + herfindahl * 40);

    return {
      protocolExposure: {
        score: exposureScore,
        totalExposureUsd: totalExposure.toString(),
        largestSingleExposureUsd: exposures.length > 0
          ? Math.max(...exposures.map((e) => parseFloat(e.grossExposure))).toString()
          : '0',
        exposureConcentration: concentrations.length > 0 ? Math.max(...concentrations) : 0,
        uncollateralizedExposure: uncollateralized.toString(),
        details: `Total ${exposures.length} counterparties with ${uncollateralized.toFixed(0)} uncollateralized`,
      },
      liquidityDepth: {
        score: depthScore,
        depth24h: volume.toString(),
        utilizationRate,
        withdrawalConcentration: 0,
        liquidityCoverage: tvl > 0 ? Math.min(tvl / (volume * 7), 2) : 0,
        details: `TVL $${tvl.toFixed(0)}, util rate ${(utilizationRate * 100).toFixed(1)}%`,
      },
      volatility: {
        score: volatilityScore,
        impliedVolatility30d: volatility,
        recentMaxDrawdown: drawdown,
        correlationToSystemicRisk: 0.5,
        tailRiskScore: Math.min(100, drawdown * 300),
        details: `30d vol ${(volatility * 100).toFixed(1)}%, max drawdown ${(drawdown * 100).toFixed(1)}%`,
      },
      smartContract: {
        score: scRiskScore,
        auditScore: auditsPassed > 0 ? Math.min(100, auditsPassed * 25) : 0,
        upgradeabilityRisk: 30,
        composabilityRisk: 20,
        knownExploits: 0,
        details: `${auditsPassed} audits passed, ${criticalVulns} critical vulns`,
      },
      operational: {
        score: operationalScore,
        uptimePercent: uptime,
        incidentCount30d: incidents,
        meanTimeToRecovery: 60,
        backupSystems: false,
        details: `${uptime.toFixed(2)}% uptime, ${incidents} incidents in 30d`,
      },
      concentration: {
        score: concentrationScore,
        topProviderShare: concentrations.length > 0 ? Math.max(...concentrations) : 0,
        giniCoefficient: gini,
        herfindahlIndex: herfindahl,
        details: `Gini ${gini.toFixed(2)}, HHI ${herfindahl.toFixed(3)}`,
      },
      crossChain: {
        score: 20,
        bridgesUsed: 1,
        bridgeAuditScore: 70,
        crossChainExposure: (totalExposure * 0.3).toString(),
        bridgeFailureScenario: 'Bridge outage would affect 30% of cross-chain liquidity',
        details: 'Standard cross-chain exposure via audited bridge',
      },
    };
  }

  private aggregateRiskScore(dimensions: RiskDimensions): number {
    const weights = {
      protocolExposure: 0.2,
      liquidityDepth: 0.15,
      volatility: 0.15,
      smartContract: 0.25,
      operational: 0.1,
      concentration: 0.1,
      crossChain: 0.05,
    };

    return Math.round(
      dimensions.protocolExposure.score * weights.protocolExposure +
      dimensions.liquidityDepth.score * weights.liquidityDepth +
      dimensions.volatility.score * weights.volatility +
      dimensions.smartContract.score * weights.smartContract +
      dimensions.operational.score * weights.operational +
      dimensions.concentration.score * weights.concentration +
      dimensions.crossChain.score * weights.crossChain
    );
  }

  private scoreToTier(score: number): RiskTier {
    if (score <= this.thresholds.tier1MaxScore) return 'tier1';
    if (score <= this.thresholds.tier2MaxScore) return 'tier2';
    if (score <= this.thresholds.tier3MaxScore) return 'tier3';
    return 'unrated';
  }

  private generateAlerts(
    protocolId: ProtocolId,
    score: number,
    dimensions: RiskDimensions
  ): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    if (score >= this.thresholds.alertEmergencyScore) {
      alerts.push({
        id: this.generateId('alert'),
        severity: 'emergency',
        type: 'risk_score_critical',
        message: `Protocol ${protocolId} risk score ${score} exceeds emergency threshold`,
        affectedProtocol: protocolId,
        threshold: this.thresholds.alertEmergencyScore,
        currentValue: score,
        recommendedAction: 'Immediately halt new liquidity provision, activate circuit breaker',
        timestamp: new Date(),
        resolved: false,
      });
    } else if (score >= this.thresholds.alertCriticalScore) {
      alerts.push({
        id: this.generateId('alert'),
        severity: 'critical',
        type: 'risk_score_high',
        message: `Protocol ${protocolId} risk score ${score} exceeds critical threshold`,
        affectedProtocol: protocolId,
        threshold: this.thresholds.alertCriticalScore,
        currentValue: score,
        recommendedAction: 'Reduce exposure and increase monitoring frequency',
        timestamp: new Date(),
        resolved: false,
      });
    } else if (score >= this.thresholds.alertWarningScore) {
      alerts.push({
        id: this.generateId('alert'),
        severity: 'warning',
        type: 'risk_score_elevated',
        message: `Protocol ${protocolId} risk score ${score} exceeds warning threshold`,
        affectedProtocol: protocolId,
        threshold: this.thresholds.alertWarningScore,
        currentValue: score,
        recommendedAction: 'Review risk exposure and consider diversification',
        timestamp: new Date(),
        resolved: false,
      });
    }

    if (dimensions.smartContract.knownExploits > 0) {
      alerts.push({
        id: this.generateId('alert'),
        severity: 'critical',
        type: 'known_exploit',
        message: `Protocol ${protocolId} has ${dimensions.smartContract.knownExploits} known exploit(s)`,
        affectedProtocol: protocolId,
        recommendedAction: 'Halt liquidity provision pending security review',
        timestamp: new Date(),
        resolved: false,
      });
    }

    if (dimensions.liquidityDepth.utilizationRate > 0.9) {
      alerts.push({
        id: this.generateId('alert'),
        severity: 'warning',
        type: 'high_utilization',
        message: `Protocol ${protocolId} utilization rate ${(dimensions.liquidityDepth.utilizationRate * 100).toFixed(1)}% is critically high`,
        affectedProtocol: protocolId,
        threshold: 0.9,
        currentValue: dimensions.liquidityDepth.utilizationRate,
        recommendedAction: 'Limit additional liquidity requests until utilization decreases',
        timestamp: new Date(),
        resolved: false,
      });
    }

    return alerts;
  }

  private generateRecommendations(dimensions: RiskDimensions, score: number): string[] {
    const recs: string[] = [];

    if (score > 70) {
      recs.push('Consider reducing capital allocation to this protocol');
    }
    if (dimensions.smartContract.auditScore < 50) {
      recs.push('Request updated security audit before increasing exposure');
    }
    if (dimensions.liquidityDepth.utilizationRate > 0.7) {
      recs.push('Monitor liquidity depth; consider diversifying across providers');
    }
    if (dimensions.concentration.giniCoefficient > 0.6) {
      recs.push('Reduce concentration risk by distributing across multiple counterparties');
    }
    if (dimensions.volatility.recentMaxDrawdown > 0.15) {
      recs.push('Implement tighter stop-loss limits given recent volatility');
    }
    if (dimensions.operational.incidentCount30d > 2) {
      recs.push('Operational stability concerns: review incident reports');
    }

    return recs;
  }

  private generateStressTestRecommendations(
    impact: StressTestResult['overallImpact'],
    lossPercent: number
  ): string[] {
    const recs: string[] = [];

    if (impact === 'catastrophic') {
      recs.push('Activate emergency protocol: pause all new liquidity operations');
      recs.push('Initiate cross-protocol netting to reduce gross exposures');
    } else if (impact === 'severe') {
      recs.push('Reduce leverage ratios across affected protocols by 50%');
      recs.push('Increase collateral haircuts for volatile assets');
    } else if (impact === 'moderate') {
      recs.push('Review and adjust risk limits for affected protocols');
    }

    if (lossPercent > 0) {
      recs.push(`Build ${Math.ceil(lossPercent * 0.5)}% additional capital buffer`);
    }

    return recs;
  }

  private computeClusterRisk(nodes: NetworkNode[], edges: NetworkEdge[]): ClusterRisk[] {
    if (nodes.length === 0) return [];

    const tier1Nodes = nodes.filter((n) => n.riskTier === 'tier1').map((n) => n.protocolId);
    const tier2Nodes = nodes.filter((n) => n.riskTier === 'tier2').map((n) => n.protocolId);
    const tier3Nodes = nodes.filter((n) => n.riskTier === 'tier3').map((n) => n.protocolId);

    const clusters: ClusterRisk[] = [];

    const buildCluster = (name: string, protocols: ProtocolId[]): ClusterRisk => {
      const internalEdges = edges.filter(
        (e) => protocols.includes(e.from) && protocols.includes(e.to)
      );
      const externalEdges = edges.filter(
        (e) => protocols.includes(e.from) && !protocols.includes(e.to)
      );

      const internalExposure = internalEdges.reduce(
        (sum, e) => sum + parseFloat(e.exposureUsd),
        0
      );
      const externalExposure = externalEdges.reduce(
        (sum, e) => sum + parseFloat(e.exposureUsd),
        0
      );
      const totalExposure = internalExposure + externalExposure;

      return {
        clusterName: name,
        protocols,
        totalExposureUsd: totalExposure.toString(),
        internalExposureUsd: internalExposure.toString(),
        externalExposureUsd: externalExposure.toString(),
        concentrationRisk: totalExposure > 0 ? internalExposure / totalExposure : 0,
      };
    };

    if (tier1Nodes.length > 0) clusters.push(buildCluster('Tier 1 (Low Risk)', tier1Nodes));
    if (tier2Nodes.length > 0) clusters.push(buildCluster('Tier 2 (Medium Risk)', tier2Nodes));
    if (tier3Nodes.length > 0) clusters.push(buildCluster('Tier 3 (High Risk)', tier3Nodes));

    return clusters;
  }

  private computeGini(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (2 * (i + 1) - n - 1) * sorted[i];
    }
    const denominator = n * sorted.reduce((sum, v) => sum + v, 0);
    return denominator > 0 ? Math.abs(numerator / denominator) : 0;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCrossProtocolRiskManager(
  config?: Partial<RiskModuleConfig>
): DefaultCrossProtocolRiskManager {
  return new DefaultCrossProtocolRiskManager(config);
}

export default DefaultCrossProtocolRiskManager;
