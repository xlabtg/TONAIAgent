/**
 * TONAIAgent Regulatory Strategy - Regulatory Risk Engine
 * AI-powered regulatory risk monitoring, suspicious activity detection,
 * and compliance automation.
 */

import {
  EntityRiskAssessment,
  TransactionRiskAssessment,
  RiskFactor,
  RiskIndicator,
  SarDetectionConfig,
  SuspiciousActivityAnalysis,
  DetectedPattern,
  RegulatoryChange,
  RegulatoryImpactAssessment,
  AffectedArea,
  ComplianceGap,
  RemediationPlanItem,
  JurisdictionCode,
  RegulatoryEvent,
  RegulatoryEventCallback,
  RiskLevel,
  AlertThresholds,
} from './types';

// ============================================================================
// Risk Engine Implementation
// ============================================================================

export interface RegulatoryRiskEngineConfig {
  enabled?: boolean;
  aiPowered?: boolean;
  realTimeMonitoring?: boolean;
  alertThresholds?: Partial<AlertThresholds>;
  sarAutoFile?: boolean;
  regulatoryMonitoring?: {
    enabled?: boolean;
    jurisdictions?: JurisdictionCode[];
    alertOnChange?: boolean;
  };
}

export interface AssessEntityRiskParams {
  entityId: string;
  entityType: string;
  jurisdiction: string;
  activities: string[];
  transactionHistory?: {
    volume30d: number;
    frequency30d: number;
    uniqueCounterparties: number;
  };
}

export interface AssessTransactionRiskParams {
  transactionId: string;
  amount: number;
  currency: string;
  source: string;
  destination: string;
  jurisdiction?: {
    source: string;
    destination: string;
  };
}

export interface AnalyzeSuspiciousActivityParams {
  entityId: string;
  timeWindow: string;
}

const HIGH_RISK_JURISDICTIONS = new Set(['IR', 'KP', 'SY', 'RU', 'BY', 'MM', 'VE']);
const ELEVATED_RISK_JURISDICTIONS = new Set(['PA', 'PH', 'PK', 'NI', 'NG', 'JM', 'HT']);

// ============================================================================
// SAR Detection Patterns
// ============================================================================

const DEFAULT_SAR_PATTERNS = [
  {
    name: 'structuring',
    description: 'Multiple transactions just below reporting threshold',
    riskScore: 85,
  },
  {
    name: 'rapid_movement',
    description: 'Quick in-out transactions (layering)',
    riskScore: 75,
  },
  {
    name: 'round_tripping',
    description: 'Funds returning to originator after multiple hops',
    riskScore: 80,
  },
  {
    name: 'high_velocity',
    description: 'Unusual transaction frequency',
    riskScore: 60,
  },
  {
    name: 'dormant_activation',
    description: 'Sudden activity after long dormancy',
    riskScore: 55,
  },
  {
    name: 'high_risk_destination',
    description: 'Transactions to high-risk jurisdictions or addresses',
    riskScore: 90,
  },
];

export class RegulatoryRiskEngine {
  private readonly _config: Required<RegulatoryRiskEngineConfig>;
  private entityAssessments: Map<string, EntityRiskAssessment> = new Map();
  private regulatoryChanges: Map<string, RegulatoryChange> = new Map();
  private _sarPatterns: typeof DEFAULT_SAR_PATTERNS;
  private eventListeners: RegulatoryEventCallback[] = [];

  /** Get the current configuration */
  get config(): Required<RegulatoryRiskEngineConfig> {
    return this._config;
  }

  /** Get the configured SAR patterns */
  get sarPatterns(): typeof DEFAULT_SAR_PATTERNS {
    return this._sarPatterns;
  }

  constructor(config: RegulatoryRiskEngineConfig = {}) {
    this._config = {
      enabled: config.enabled ?? true,
      aiPowered: config.aiPowered ?? true,
      realTimeMonitoring: config.realTimeMonitoring ?? true,
      alertThresholds: {
        critical: config.alertThresholds?.critical ?? 90,
        high: config.alertThresholds?.high ?? 70,
        medium: config.alertThresholds?.medium ?? 50,
        low: config.alertThresholds?.low ?? 30,
      },
      sarAutoFile: config.sarAutoFile ?? false,
      regulatoryMonitoring: {
        enabled: config.regulatoryMonitoring?.enabled ?? true,
        jurisdictions: config.regulatoryMonitoring?.jurisdictions ?? ['CH', 'US', 'SG', 'GB'],
        alertOnChange: config.regulatoryMonitoring?.alertOnChange ?? true,
      },
    };

    this._sarPatterns = [...DEFAULT_SAR_PATTERNS];
  }

  // ============================================================================
  // Entity Risk Assessment
  // ============================================================================

  async assessEntityRisk(params: AssessEntityRiskParams): Promise<EntityRiskAssessment> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Jurisdiction risk
    const jurisdictionRisk = this.assessJurisdictionRisk(params.jurisdiction);
    factors.push(jurisdictionRisk);
    totalScore += jurisdictionRisk.score * jurisdictionRisk.weight;
    totalWeight += jurisdictionRisk.weight;

    // Activity risk
    const activityRisk = this.assessActivityRisk(params.activities);
    factors.push(activityRisk);
    totalScore += activityRisk.score * activityRisk.weight;
    totalWeight += activityRisk.weight;

    // Entity type risk
    const entityTypeRisk = this.assessEntityTypeRisk(params.entityType);
    factors.push(entityTypeRisk);
    totalScore += entityTypeRisk.score * entityTypeRisk.weight;
    totalWeight += entityTypeRisk.weight;

    // Transaction history risk
    if (params.transactionHistory) {
      const txHistoryRisk = this.assessTransactionHistoryRisk(params.transactionHistory);
      factors.push(txHistoryRisk);
      totalScore += txHistoryRisk.score * txHistoryRisk.weight;
      totalWeight += txHistoryRisk.weight;
    }

    const overallScore = Math.round(totalScore / totalWeight);
    const riskLevel = this.getRiskLevel(overallScore);

    const assessment: EntityRiskAssessment = {
      entityId: params.entityId,
      entityType: params.entityType,
      overallScore,
      riskLevel,
      factors,
      recommendations: this.generateEntityRecommendations(riskLevel, factors),
      requiredActions: this.getRequiredActions(riskLevel),
      assessedAt: new Date(),
      nextAssessmentDue: this.calculateNextAssessmentDate(riskLevel),
    };

    this.entityAssessments.set(params.entityId, assessment);

    // Emit event if high risk
    if (riskLevel === 'high' || riskLevel === 'critical') {
      this.emitEvent({
        type: 'risk.threshold_breached',
        timestamp: new Date(),
        payload: {
          entityId: params.entityId,
          riskLevel,
          score: overallScore,
        },
        source: 'regulatory-risk-engine',
      });
    }

    return assessment;
  }

  getEntityRiskAssessment(entityId: string): EntityRiskAssessment | undefined {
    return this.entityAssessments.get(entityId);
  }

  // ============================================================================
  // Transaction Risk Assessment
  // ============================================================================

  async assessTransactionRisk(
    params: AssessTransactionRiskParams
  ): Promise<TransactionRiskAssessment> {
    const indicators: RiskIndicator[] = [];
    let totalScore = 0;

    // Amount-based risk
    const amountRisk = this.assessAmountRisk(params.amount);
    if (amountRisk.contribution > 0) {
      indicators.push(amountRisk);
      totalScore += amountRisk.contribution;
    }

    // Jurisdiction risk
    if (params.jurisdiction) {
      const sourceJurisdictionRisk = this.assessJurisdictionIndicator(
        params.jurisdiction.source,
        'source'
      );
      if (sourceJurisdictionRisk.contribution > 0) {
        indicators.push(sourceJurisdictionRisk);
        totalScore += sourceJurisdictionRisk.contribution;
      }

      const destJurisdictionRisk = this.assessJurisdictionIndicator(
        params.jurisdiction.destination,
        'destination'
      );
      if (destJurisdictionRisk.contribution > 0) {
        indicators.push(destJurisdictionRisk);
        totalScore += destJurisdictionRisk.contribution;
      }
    }

    const score = Math.min(Math.round(totalScore), 100);
    const riskLevel = this.getRiskLevel(score);
    const cleared = riskLevel !== 'critical' && riskLevel !== 'high';

    const assessment: TransactionRiskAssessment = {
      transactionId: params.transactionId,
      score,
      riskLevel,
      indicators,
      cleared,
      requiredReviews: this.getRequiredReviews(riskLevel),
      assessedAt: new Date(),
    };

    return assessment;
  }

  // ============================================================================
  // Suspicious Activity Detection
  // ============================================================================

  async configureSarDetection(config: Partial<SarDetectionConfig>): Promise<void> {
    if (config.patterns) {
      this._sarPatterns = config.patterns.map((p) => ({
        name: p.name,
        description: p.description,
        riskScore: p.riskScore,
      }));
    }
  }

  async analyzeForSuspiciousActivity(
    params: AnalyzeSuspiciousActivityParams
  ): Promise<SuspiciousActivityAnalysis> {
    // Simulate pattern detection
    const detectedPatterns: DetectedPattern[] = [];
    let aggregateRiskScore = 0;

    // In a real implementation, this would analyze actual transaction data
    // Here we simulate with random pattern detection for demonstration

    const entityAssessment = this.entityAssessments.get(params.entityId);
    if (entityAssessment && entityAssessment.riskLevel !== 'low') {
      // Simulate detecting patterns for higher-risk entities
      const pattern: DetectedPattern = {
        patternName: 'elevated_risk_activity',
        confidence: 0.6,
        occurrences: 3,
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        evidence: ['Multiple high-value transactions', 'New counterparties'],
      };
      detectedPatterns.push(pattern);
      aggregateRiskScore = entityAssessment.overallScore;
    }

    const sarRequired =
      aggregateRiskScore >= (this.config.alertThresholds as AlertThresholds).high &&
      detectedPatterns.length > 0;

    const analysis: SuspiciousActivityAnalysis = {
      entityId: params.entityId,
      patternsDetected: detectedPatterns,
      aggregateRiskScore,
      sarRequired,
      investigationNotes: this.generateInvestigationNotes(detectedPatterns),
      analyzedAt: new Date(),
    };

    // Emit event if SAR required
    if (sarRequired) {
      this.emitEvent({
        type: 'risk.sar_generated',
        timestamp: new Date(),
        payload: {
          entityId: params.entityId,
          patterns: detectedPatterns.map((p) => p.patternName),
          riskScore: aggregateRiskScore,
        },
        source: 'regulatory-risk-engine',
      });
    }

    return analysis;
  }

  // ============================================================================
  // Regulatory Change Monitoring
  // ============================================================================

  async monitorRegulatoryChanges(config: {
    jurisdictions: string[];
    topics: string[];
    sources: string[];
    alertOnChange: boolean;
  }): Promise<void> {
    // This would integrate with regulatory monitoring services
    // For now, we store the configuration
    this.config.regulatoryMonitoring = {
      enabled: true,
      jurisdictions: config.jurisdictions as JurisdictionCode[],
      alertOnChange: config.alertOnChange,
    };
  }

  async addRegulatoryChange(change: RegulatoryChange): Promise<void> {
    this.regulatoryChanges.set(change.id, change);

    if (this.config.regulatoryMonitoring?.alertOnChange) {
      this.emitEvent({
        type: 'risk.regulatory_change',
        timestamp: new Date(),
        payload: {
          changeId: change.id,
          jurisdiction: change.jurisdiction,
          type: change.type,
          effectiveDate: change.effectiveDate,
        },
        source: 'regulatory-risk-engine',
      });
    }
  }

  async getRecentRegulatoryChanges(params: {
    timeWindow: string;
    jurisdictions?: string[];
    impactLevel?: RiskLevel;
  }): Promise<RegulatoryChange[]> {
    let changes = Array.from(this.regulatoryChanges.values());

    // Filter by time window
    const windowMs = this.parseTimeWindow(params.timeWindow);
    const cutoff = new Date(Date.now() - windowMs);
    changes = changes.filter((c) => c.publishedDate >= cutoff);

    // Filter by jurisdictions
    if (params.jurisdictions) {
      changes = changes.filter((c) =>
        params.jurisdictions!.includes(c.jurisdiction)
      );
    }

    // Filter by impact level
    if (params.impactLevel) {
      const levelOrder: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
      const minIndex = levelOrder.indexOf(params.impactLevel);
      changes = changes.filter((c) => {
        const changeIndex = levelOrder.indexOf(c.impactLevel);
        return changeIndex <= minIndex;
      });
    }

    return changes.sort(
      (a, b) => b.publishedDate.getTime() - a.publishedDate.getTime()
    );
  }

  async assessRegulatoryImpact(params: {
    changeId: string;
    currentState: {
      licenses: string[];
      activities: string[];
      jurisdictions: string[];
    };
  }): Promise<RegulatoryImpactAssessment> {
    const change = this.regulatoryChanges.get(params.changeId);
    if (!change) {
      throw new Error(`Regulatory change not found: ${params.changeId}`);
    }

    const affectedAreas: AffectedArea[] = [];
    const complianceGaps: ComplianceGap[] = [];
    const remediationPlan: RemediationPlanItem[] = [];

    // Analyze affected areas
    for (const area of change.affectedAreas) {
      if (params.currentState.activities.some((a) => a.includes(area))) {
        affectedAreas.push({
          area,
          currentState: 'existing_operations',
          requiredState: 'compliance_required',
          gap: `${area} operations need to comply with ${change.name}`,
        });
      }
    }

    // Identify compliance gaps
    for (const action of change.requiredActions) {
      complianceGaps.push({
        requirement: action,
        currentCompliance: 'partial',
        gapDescription: `Action needed: ${action}`,
        remediationRequired: true,
      });
    }

    // Generate remediation plan
    for (let i = 0; i < change.requiredActions.length; i++) {
      const action = change.requiredActions[i];
      const deadline = new Date(change.effectiveDate);
      deadline.setDate(deadline.getDate() - 30 * (change.requiredActions.length - i));

      remediationPlan.push({
        action,
        responsible: 'compliance_team',
        deadline: deadline > new Date() ? deadline : new Date(),
        status: 'pending',
        dependencies: i > 0 ? [change.requiredActions[i - 1]] : [],
      });
    }

    const assessment: RegulatoryImpactAssessment = {
      changeId: params.changeId,
      impactLevel: change.impactLevel,
      affectedAreas,
      complianceGap: complianceGaps,
      remediationPlan,
      implementationTimeline: this.calculateImplementationTimeline(change.effectiveDate),
      estimatedCost: this.estimateComplianceCost(complianceGaps.length, change.impactLevel),
      assessedAt: new Date(),
    };

    return assessment;
  }

  // ============================================================================
  // Compliance Risk Monitoring
  // ============================================================================

  async getComplianceRisks(): Promise<
    Array<{
      category: string;
      level: RiskLevel;
      description: string;
      affectedEntities: number;
    }>
  > {
    const risks: Array<{
      category: string;
      level: RiskLevel;
      description: string;
      affectedEntities: number;
    }> = [];

    // Analyze entity assessments for compliance risks
    const highRiskEntities = Array.from(this.entityAssessments.values()).filter(
      (e) => e.riskLevel === 'high' || e.riskLevel === 'critical'
    );

    if (highRiskEntities.length > 0) {
      risks.push({
        category: 'Entity Risk',
        level: highRiskEntities.some((e) => e.riskLevel === 'critical') ? 'critical' : 'high',
        description: `${highRiskEntities.length} entities with elevated risk scores`,
        affectedEntities: highRiskEntities.length,
      });
    }

    // Analyze upcoming regulatory changes
    const upcomingChanges = Array.from(this.regulatoryChanges.values()).filter(
      (c) => c.effectiveDate > new Date() && c.impactLevel !== 'low'
    );

    if (upcomingChanges.length > 0) {
      risks.push({
        category: 'Regulatory Change',
        level: upcomingChanges.some((c) => c.impactLevel === 'critical') ? 'critical' :
               upcomingChanges.some((c) => c.impactLevel === 'high') ? 'high' : 'medium',
        description: `${upcomingChanges.length} regulatory changes requiring attention`,
        affectedEntities: 0,
      });
    }

    return risks;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(callback: RegulatoryEventCallback): void {
    this.eventListeners.push(callback);
  }

  private emitEvent(event: RegulatoryEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getRiskLevel(score: number): RiskLevel {
    const thresholds = this.config.alertThresholds as AlertThresholds;
    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    return 'low';
  }

  private assessJurisdictionRisk(jurisdiction: string): RiskFactor {
    let score = 20; // Base score
    const indicators: string[] = [];

    if (HIGH_RISK_JURISDICTIONS.has(jurisdiction)) {
      score = 95;
      indicators.push('FATF blacklist jurisdiction');
    } else if (ELEVATED_RISK_JURISDICTIONS.has(jurisdiction)) {
      score = 60;
      indicators.push('FATF greylist jurisdiction');
    } else {
      indicators.push('Standard jurisdiction');
    }

    return {
      category: 'Jurisdiction',
      score,
      weight: 0.3,
      indicators,
      details: `Jurisdiction: ${jurisdiction}`,
    };
  }

  private assessActivityRisk(activities: string[]): RiskFactor {
    const highRiskActivities = ['margin_trading', 'derivatives', 'lending', 'custody'];
    const mediumRiskActivities = ['trading', 'staking', 'defi'];

    let score = 20;
    const indicators: string[] = [];

    for (const activity of activities) {
      if (highRiskActivities.includes(activity)) {
        score = Math.max(score, 70);
        indicators.push(`High-risk activity: ${activity}`);
      } else if (mediumRiskActivities.includes(activity)) {
        score = Math.max(score, 45);
        indicators.push(`Medium-risk activity: ${activity}`);
      }
    }

    return {
      category: 'Activity',
      score,
      weight: 0.25,
      indicators,
      details: `Activities: ${activities.join(', ')}`,
    };
  }

  private assessEntityTypeRisk(entityType: string): RiskFactor {
    const riskScores: Record<string, number> = {
      individual: 30,
      corporation: 40,
      partnership: 45,
      trust: 55,
      foundation: 50,
      dao: 60,
      unknown: 80,
    };

    const score = riskScores[entityType.toLowerCase()] ?? 50;

    return {
      category: 'Entity Type',
      score,
      weight: 0.15,
      indicators: [`Entity type: ${entityType}`],
      details: `Entity classification: ${entityType}`,
    };
  }

  private assessTransactionHistoryRisk(history: {
    volume30d: number;
    frequency30d: number;
    uniqueCounterparties: number;
  }): RiskFactor {
    let score = 20;
    const indicators: string[] = [];

    // High volume
    if (history.volume30d > 1000000) {
      score += 25;
      indicators.push('High transaction volume');
    } else if (history.volume30d > 100000) {
      score += 10;
      indicators.push('Moderate transaction volume');
    }

    // High frequency
    if (history.frequency30d > 100) {
      score += 20;
      indicators.push('High transaction frequency');
    }

    // Many counterparties
    if (history.uniqueCounterparties > 50) {
      score += 15;
      indicators.push('Many unique counterparties');
    }

    return {
      category: 'Transaction History',
      score: Math.min(score, 100),
      weight: 0.3,
      indicators,
      details: `Volume: ${history.volume30d}, Frequency: ${history.frequency30d}, Counterparties: ${history.uniqueCounterparties}`,
    };
  }

  private assessAmountRisk(amount: number): RiskIndicator {
    let severity: RiskLevel = 'low';
    let contribution = 0;

    if (amount > 1000000) {
      severity = 'critical';
      contribution = 40;
    } else if (amount > 100000) {
      severity = 'high';
      contribution = 25;
    } else if (amount > 10000) {
      severity = 'medium';
      contribution = 15;
    } else if (amount > 1000) {
      severity = 'low';
      contribution = 5;
    }

    return {
      type: 'Amount',
      description: `Transaction amount: ${amount}`,
      severity,
      contribution,
    };
  }

  private assessJurisdictionIndicator(
    jurisdiction: string,
    type: 'source' | 'destination'
  ): RiskIndicator {
    let severity: RiskLevel = 'low';
    let contribution = 0;

    if (HIGH_RISK_JURISDICTIONS.has(jurisdiction)) {
      severity = 'critical';
      contribution = 50;
    } else if (ELEVATED_RISK_JURISDICTIONS.has(jurisdiction)) {
      severity = 'high';
      contribution = 25;
    }

    return {
      type: `${type.charAt(0).toUpperCase() + type.slice(1)} Jurisdiction`,
      description: `${type} jurisdiction: ${jurisdiction}`,
      severity,
      contribution,
    };
  }

  private generateEntityRecommendations(
    riskLevel: RiskLevel,
    factors: RiskFactor[]
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'critical':
        recommendations.push('Immediate compliance review required');
        recommendations.push('Consider terminating relationship');
        recommendations.push('File suspicious activity report');
        break;
      case 'high':
        recommendations.push('Enhanced due diligence required');
        recommendations.push('Increase monitoring frequency');
        recommendations.push('Review transaction limits');
        break;
      case 'medium':
        recommendations.push('Standard enhanced monitoring');
        recommendations.push('Periodic review recommended');
        break;
      case 'low':
        recommendations.push('Standard monitoring procedures');
        break;
    }

    // Factor-specific recommendations
    for (const factor of factors) {
      if (factor.category === 'Jurisdiction' && factor.score > 50) {
        recommendations.push('Additional documentation for jurisdiction');
      }
      if (factor.category === 'Activity' && factor.score > 60) {
        recommendations.push('Activity-specific controls required');
      }
    }

    return recommendations;
  }

  private getRequiredActions(riskLevel: RiskLevel): string[] {
    switch (riskLevel) {
      case 'critical':
        return [
          'Escalate to compliance officer',
          'Freeze account pending review',
          'Prepare SAR filing',
        ];
      case 'high':
        return [
          'Complete enhanced due diligence',
          'Obtain additional documentation',
          'Set up enhanced monitoring',
        ];
      case 'medium':
        return ['Update risk assessment', 'Review in 6 months'];
      case 'low':
        return ['No immediate action required'];
    }
  }

  private getRequiredReviews(riskLevel: RiskLevel): string[] {
    switch (riskLevel) {
      case 'critical':
        return ['compliance_officer', 'mlro', 'senior_management'];
      case 'high':
        return ['compliance_officer', 'mlro'];
      case 'medium':
        return ['compliance_analyst'];
      case 'low':
        return [];
    }
  }

  private calculateNextAssessmentDate(riskLevel: RiskLevel): Date {
    const nextDate = new Date();
    switch (riskLevel) {
      case 'critical':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'high':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'medium':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'low':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    return nextDate;
  }

  private parseTimeWindow(window: string): number {
    const match = window.match(/^(\d+)([dhm])$/);
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000; // Default 30 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private generateInvestigationNotes(patterns: DetectedPattern[]): string[] {
    const notes: string[] = [];

    if (patterns.length === 0) {
      notes.push('No suspicious patterns detected');
      return notes;
    }

    notes.push(`${patterns.length} pattern(s) detected requiring investigation`);

    for (const pattern of patterns) {
      notes.push(
        `Pattern: ${pattern.patternName} - ${pattern.occurrences} occurrences, ` +
        `confidence: ${Math.round(pattern.confidence * 100)}%`
      );
    }

    return notes;
  }

  private calculateImplementationTimeline(effectiveDate: Date): string {
    const now = new Date();
    const diffMs = effectiveDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Immediate implementation required';
    } else if (diffDays < 30) {
      return `${diffDays} days - urgent implementation`;
    } else if (diffDays < 90) {
      return `${diffDays} days - standard implementation`;
    } else {
      return `${diffDays} days - extended timeline`;
    }
  }

  private estimateComplianceCost(gapCount: number, impactLevel: RiskLevel): number {
    const baseCost: Record<RiskLevel, number> = {
      critical: 100000,
      high: 50000,
      medium: 20000,
      low: 5000,
    };

    return baseCost[impactLevel] * gapCount;
  }
}

export function createRegulatoryRiskEngine(
  config?: RegulatoryRiskEngineConfig
): RegulatoryRiskEngine {
  return new RegulatoryRiskEngine(config);
}
