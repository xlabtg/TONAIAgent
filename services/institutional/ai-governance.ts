/**
 * TONAIAgent - AI Governance & Explainability Module
 *
 * Implements institutional AI governance:
 * - Model transparency
 * - Explainable outputs
 * - Decision traceability
 * - Safety guardrails
 * - Human oversight
 */

import {
  AIGovernanceConfig,
  ExplainabilityLevel,
  HumanOversightConfig,
  ModelConstraints,
  SafetyGuardrails,
  AIDecisionRecord,
  DecisionInput,
  DecisionOutput,
  DecisionExplanation,
  ExplanationFactor,
  AIRiskAssessment,
  RiskFactorAssessment,
  InstitutionalRole,
  InstitutionalEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface AIGovernanceManager {
  // Configuration
  configureGovernance(
    accountId: string,
    config: Partial<AIGovernanceConfig>
  ): Promise<AIGovernanceConfig>;
  getConfig(accountId: string): Promise<AIGovernanceConfig | null>;
  updateOversight(
    accountId: string,
    config: Partial<HumanOversightConfig>
  ): Promise<HumanOversightConfig>;
  updateConstraints(
    accountId: string,
    constraints: Partial<ModelConstraints>
  ): Promise<ModelConstraints>;
  updateSafetyGuardrails(
    accountId: string,
    guardrails: Partial<SafetyGuardrails>
  ): Promise<SafetyGuardrails>;

  // Decision Recording
  recordDecision(
    accountId: string,
    agentId: string,
    decision: DecisionRecordInput
  ): Promise<AIDecisionRecord>;
  getDecision(decisionId: string): Promise<AIDecisionRecord | null>;
  listDecisions(accountId: string, filters?: DecisionFilters): Promise<AIDecisionRecord[]>;

  // Explainability
  generateExplanation(
    decision: AIDecisionRecord,
    level: ExplainabilityLevel
  ): Promise<DecisionExplanation>;
  getExplanation(decisionId: string): Promise<DecisionExplanation | null>;

  // Human Review
  requiresHumanReview(decision: AIDecisionRecord): Promise<HumanReviewRequirement>;
  submitForReview(decisionId: string): Promise<void>;
  reviewDecision(
    decisionId: string,
    review: HumanReviewInput
  ): Promise<AIDecisionRecord>;
  getPendingReviews(accountId: string, role?: InstitutionalRole): Promise<AIDecisionRecord[]>;

  // Outcome Recording
  recordOutcome(decisionId: string, outcome: DecisionOutcomeInput): Promise<void>;

  // Safety Checks
  checkSafetyConstraints(
    accountId: string,
    proposedDecision: ProposedDecision
  ): Promise<SafetyCheckResult>;

  // Analytics
  getDecisionAnalytics(accountId: string, period: AnalyticsPeriod): Promise<DecisionAnalytics>;
  getModelPerformance(accountId: string, agentId?: string): Promise<ModelPerformanceMetrics>;

  // Events
  onEvent(callback: InstitutionalEventCallback): void;
}

export interface DecisionRecordInput {
  decisionType: string;
  input: DecisionInput;
  output: DecisionOutput;
  confidence: number;
  modelId?: string;
  modelVersion?: string;
}

export interface DecisionFilters {
  agentId?: string;
  decisionType?: string;
  startDate?: Date;
  endDate?: Date;
  minConfidence?: number;
  maxConfidence?: number;
  requiresReview?: boolean;
  reviewed?: boolean;
  limit?: number;
}

export interface HumanReviewRequirement {
  required: boolean;
  reasons: string[];
  reviewerRoles: InstitutionalRole[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  deadline?: Date;
}

export interface HumanReviewInput {
  reviewerId: string;
  reviewerRole: InstitutionalRole;
  decision: 'approved' | 'rejected' | 'modified';
  modifications?: Record<string, unknown>;
  comments: string;
}

export interface DecisionOutcomeInput {
  actualResult: Record<string, unknown>;
  returnRealized: number;
  riskRealized: number;
}

export interface ProposedDecision {
  type: string;
  action: string;
  parameters: Record<string, unknown>;
  expectedImpact: {
    portfolioChange: number;
    riskChange: number;
  };
  confidence: number;
}

export interface SafetyCheckResult {
  passed: boolean;
  violations: SafetyViolation[];
  warnings: SafetyWarning[];
  recommendations: string[];
}

export interface SafetyViolation {
  type: string;
  description: string;
  severity: 'warning' | 'critical' | 'blocking';
  constraint: string;
  value: unknown;
  limit: unknown;
}

export interface SafetyWarning {
  type: string;
  message: string;
  recommendation: string;
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
}

export interface DecisionAnalytics {
  accountId: string;
  period: AnalyticsPeriod;
  totalDecisions: number;
  approvedDecisions: number;
  rejectedDecisions: number;
  modifiedDecisions: number;
  averageConfidence: number;
  accuracyRate: number;
  avgReturnRealized: number;
  avgRiskRealized: number;
  decisionsByType: Record<string, number>;
  decisionsByOutcome: Record<string, number>;
  reviewMetrics: ReviewMetrics;
}

export interface ReviewMetrics {
  totalReviewed: number;
  averageReviewTime: number;
  approvalRate: number;
  modificationRate: number;
  rejectionRate: number;
  byReviewer: Record<string, number>;
}

export interface ModelPerformanceMetrics {
  accountId: string;
  agentId?: string;
  period: AnalyticsPeriod;
  totalPredictions: number;
  accuracyRate: number;
  avgConfidence: number;
  calibrationScore: number;
  profitFactor: number;
  winRate: number;
  avgReturnPerDecision: number;
  sharpeRatio: number;
  maxConsecutiveLosses: number;
  performanceByType: Record<string, TypePerformance>;
}

export interface TypePerformance {
  count: number;
  accuracy: number;
  avgReturn: number;
  avgConfidence: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_GOVERNANCE_CONFIG: Omit<AIGovernanceConfig, 'accountId'> = {
  enabled: true,
  explainabilityLevel: 'standard',
  decisionLogging: true,
  humanOversight: {
    requiredForHighRisk: true,
    requiredAboveAmount: 100000,
    requiredForNewStrategies: true,
    reviewerRoles: ['risk_manager', 'compliance_officer'],
  },
  modelConstraints: {
    allowedModels: ['*'],
    maxConfidenceThreshold: 0.99,
    minConfidenceThreshold: 0.6,
    maxDecisionsPerHour: 100,
    maxPortfolioChangePercent: 5,
  },
  safetyGuardrails: {
    enabled: true,
    maxLossPerDecision: 10000,
    maxConsecutiveLosses: 5,
    emergencyStopThreshold: 50000,
    requiresHumanApproval: false,
  },
};

// ============================================================================
// AI Governance Manager Implementation
// ============================================================================

export class DefaultAIGovernanceManager implements AIGovernanceManager {
  private readonly configs = new Map<string, AIGovernanceConfig>();
  private readonly decisions = new Map<string, AIDecisionRecord>();
  private readonly decisionsByAccount = new Map<string, Set<string>>();
  private readonly explanations = new Map<string, DecisionExplanation>();
  private readonly pendingReviews = new Map<string, Set<string>>();
  private readonly eventCallbacks: InstitutionalEventCallback[] = [];
  private decisionCounter = 0;

  async configureGovernance(
    accountId: string,
    config: Partial<AIGovernanceConfig>
  ): Promise<AIGovernanceConfig> {
    const existing = this.configs.get(accountId);

    const newConfig: AIGovernanceConfig = {
      accountId,
      enabled: config.enabled ?? existing?.enabled ?? DEFAULT_GOVERNANCE_CONFIG.enabled,
      explainabilityLevel:
        config.explainabilityLevel ??
        existing?.explainabilityLevel ??
        DEFAULT_GOVERNANCE_CONFIG.explainabilityLevel,
      decisionLogging:
        config.decisionLogging ??
        existing?.decisionLogging ??
        DEFAULT_GOVERNANCE_CONFIG.decisionLogging,
      humanOversight: {
        ...DEFAULT_GOVERNANCE_CONFIG.humanOversight,
        ...existing?.humanOversight,
        ...config.humanOversight,
      },
      modelConstraints: {
        ...DEFAULT_GOVERNANCE_CONFIG.modelConstraints,
        ...existing?.modelConstraints,
        ...config.modelConstraints,
      },
      safetyGuardrails: {
        ...DEFAULT_GOVERNANCE_CONFIG.safetyGuardrails,
        ...existing?.safetyGuardrails,
        ...config.safetyGuardrails,
      },
    };

    this.configs.set(accountId, newConfig);
    return newConfig;
  }

  async getConfig(accountId: string): Promise<AIGovernanceConfig | null> {
    return this.configs.get(accountId) ?? null;
  }

  async updateOversight(
    accountId: string,
    config: Partial<HumanOversightConfig>
  ): Promise<HumanOversightConfig> {
    const governance = this.configs.get(accountId);
    if (!governance) {
      throw new Error(`Governance config not found for account: ${accountId}`);
    }

    governance.humanOversight = { ...governance.humanOversight, ...config };
    return governance.humanOversight;
  }

  async updateConstraints(
    accountId: string,
    constraints: Partial<ModelConstraints>
  ): Promise<ModelConstraints> {
    const governance = this.configs.get(accountId);
    if (!governance) {
      throw new Error(`Governance config not found for account: ${accountId}`);
    }

    governance.modelConstraints = { ...governance.modelConstraints, ...constraints };
    return governance.modelConstraints;
  }

  async updateSafetyGuardrails(
    accountId: string,
    guardrails: Partial<SafetyGuardrails>
  ): Promise<SafetyGuardrails> {
    const governance = this.configs.get(accountId);
    if (!governance) {
      throw new Error(`Governance config not found for account: ${accountId}`);
    }

    governance.safetyGuardrails = { ...governance.safetyGuardrails, ...guardrails };
    return governance.safetyGuardrails;
  }

  async recordDecision(
    accountId: string,
    agentId: string,
    decision: DecisionRecordInput
  ): Promise<AIDecisionRecord> {
    const config = this.configs.get(accountId);
    if (!config?.decisionLogging) {
      throw new Error(`Decision logging not enabled for account: ${accountId}`);
    }

    const decisionId = this.generateDecisionId();

    // Generate risk assessment
    const riskAssessment = this.assessDecisionRisk(decision);

    // Generate explanation based on configured level
    const explanation = await this.generateExplanation(
      {
        id: decisionId,
        accountId,
        agentId,
        timestamp: new Date(),
        decisionType: decision.decisionType,
        input: decision.input,
        output: decision.output,
        explanation: { summary: '', factors: [], reasoning: [], confidenceBreakdown: {}, limitations: [] },
        confidence: decision.confidence,
        riskAssessment,
      },
      config.explainabilityLevel
    );

    const record: AIDecisionRecord = {
      id: decisionId,
      accountId,
      agentId,
      timestamp: new Date(),
      decisionType: decision.decisionType,
      input: decision.input,
      output: decision.output,
      explanation,
      confidence: decision.confidence,
      riskAssessment,
    };

    this.decisions.set(decisionId, record);
    this.explanations.set(decisionId, explanation);

    if (!this.decisionsByAccount.has(accountId)) {
      this.decisionsByAccount.set(accountId, new Set());
    }
    this.decisionsByAccount.get(accountId)!.add(decisionId);

    // Check if human review is required
    const reviewReq = await this.requiresHumanReview(record);
    if (reviewReq.required) {
      if (!this.pendingReviews.has(accountId)) {
        this.pendingReviews.set(accountId, new Set());
      }
      this.pendingReviews.get(accountId)!.add(decisionId);
    }

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'ai_decision_made',
      accountId,
      actorId: agentId,
      actorRole: 'trader',
      action: 'record_decision',
      resource: 'ai_decision',
      resourceId: decisionId,
      details: {
        decisionType: decision.decisionType,
        confidence: decision.confidence,
        requiresReview: reviewReq.required,
      },
      metadata: {},
    });

    return record;
  }

  async getDecision(decisionId: string): Promise<AIDecisionRecord | null> {
    return this.decisions.get(decisionId) ?? null;
  }

  async listDecisions(accountId: string, filters?: DecisionFilters): Promise<AIDecisionRecord[]> {
    const decisionIds = this.decisionsByAccount.get(accountId);
    if (!decisionIds) {
      return [];
    }

    let decisions = Array.from(decisionIds)
      .map((id) => this.decisions.get(id))
      .filter((d): d is AIDecisionRecord => d !== undefined);

    if (filters?.agentId) {
      decisions = decisions.filter((d) => d.agentId === filters.agentId);
    }
    if (filters?.decisionType) {
      decisions = decisions.filter((d) => d.decisionType === filters.decisionType);
    }
    if (filters?.startDate) {
      decisions = decisions.filter((d) => d.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      decisions = decisions.filter((d) => d.timestamp <= filters.endDate!);
    }
    if (filters?.minConfidence !== undefined) {
      decisions = decisions.filter((d) => d.confidence >= filters.minConfidence!);
    }
    if (filters?.maxConfidence !== undefined) {
      decisions = decisions.filter((d) => d.confidence <= filters.maxConfidence!);
    }
    if (filters?.requiresReview !== undefined) {
      const pendingIds = this.pendingReviews.get(accountId) ?? new Set();
      decisions = decisions.filter(
        (d) => pendingIds.has(d.id) === filters.requiresReview
      );
    }
    if (filters?.reviewed !== undefined) {
      decisions = decisions.filter(
        (d) => (d.humanReview !== undefined) === filters.reviewed
      );
    }
    if (filters?.limit) {
      decisions = decisions.slice(0, filters.limit);
    }

    return decisions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async generateExplanation(
    decision: AIDecisionRecord,
    level: ExplainabilityLevel
  ): Promise<DecisionExplanation> {
    const factors: ExplanationFactor[] = [];
    const reasoning: string[] = [];
    const confidenceBreakdown: Record<string, number> = {};
    const limitations: string[] = [];

    // Extract factors from input signals
    for (const signal of decision.input.signals ?? []) {
      factors.push({
        name: signal.source,
        importance: signal.confidence,
        contribution: signal.value * signal.confidence,
        description: `Signal from ${signal.source} with value ${signal.value}`,
      });
      confidenceBreakdown[signal.source] = signal.confidence;
    }

    // Generate reasoning based on decision type
    reasoning.push(`Decision type: ${decision.decisionType}`);
    reasoning.push(`Action selected: ${decision.output.action}`);
    reasoning.push(`Expected return: ${decision.output.expectedOutcome.expectedReturn}%`);
    reasoning.push(`Expected risk: ${decision.output.expectedOutcome.expectedRisk}%`);

    // Add alternative analysis if detailed level
    if (level === 'detailed' || level === 'full') {
      for (const alt of decision.output.alternatives ?? []) {
        reasoning.push(
          `Alternative "${alt.action}" not selected: ${alt.reasonNotSelected}`
        );
      }
    }

    // Add limitations
    limitations.push('Model predictions are based on historical data');
    limitations.push('Market conditions may change rapidly');
    if (decision.confidence < 0.8) {
      limitations.push('Confidence level indicates uncertainty in prediction');
    }

    const summary = this.generateSummary(decision, level);

    return {
      summary,
      factors,
      reasoning,
      confidenceBreakdown,
      limitations,
    };
  }

  async getExplanation(decisionId: string): Promise<DecisionExplanation | null> {
    return this.explanations.get(decisionId) ?? null;
  }

  async requiresHumanReview(decision: AIDecisionRecord): Promise<HumanReviewRequirement> {
    const config = this.configs.get(decision.accountId);
    if (!config) {
      return { required: false, reasons: [], reviewerRoles: [], priority: 'low' };
    }

    const oversight = config.humanOversight;
    const reasons: string[] = [];
    let priority: 'low' | 'normal' | 'high' | 'urgent' = 'low';

    // Check risk level
    if (oversight.requiredForHighRisk && decision.riskAssessment.overallRisk === 'high') {
      reasons.push('High-risk decision');
      priority = 'high';
    }
    if (decision.riskAssessment.overallRisk === 'critical') {
      reasons.push('Critical-risk decision');
      priority = 'urgent';
    }

    // Check amount threshold
    const amount = decision.output.parameters?.amount as number | undefined;
    if (amount !== undefined && amount > oversight.requiredAboveAmount) {
      reasons.push(`Amount exceeds threshold (${amount} > ${oversight.requiredAboveAmount})`);
      if (priority === 'low') priority = 'normal';
    }

    // Check confidence level
    const constraints = config.modelConstraints;
    if (decision.confidence < constraints.minConfidenceThreshold) {
      reasons.push(`Confidence below minimum threshold (${decision.confidence} < ${constraints.minConfidenceThreshold})`);
      priority = priority === 'urgent' ? 'urgent' : 'high';
    }

    // Check safety guardrails
    if (config.safetyGuardrails.requiresHumanApproval) {
      reasons.push('All decisions require human approval');
      if (priority === 'low') priority = 'normal';
    }

    return {
      required: reasons.length > 0,
      reasons,
      reviewerRoles: oversight.reviewerRoles,
      priority,
      deadline:
        priority === 'urgent'
          ? new Date(Date.now() + 60 * 60 * 1000) // 1 hour
          : priority === 'high'
          ? new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
          : undefined,
    };
  }

  async submitForReview(decisionId: string): Promise<void> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    if (!this.pendingReviews.has(decision.accountId)) {
      this.pendingReviews.set(decision.accountId, new Set());
    }
    this.pendingReviews.get(decision.accountId)!.add(decisionId);
  }

  async reviewDecision(
    decisionId: string,
    review: HumanReviewInput
  ): Promise<AIDecisionRecord> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    decision.humanReview = {
      reviewerId: review.reviewerId,
      reviewerRole: review.reviewerRole,
      timestamp: new Date(),
      decision: review.decision,
      modifications: review.modifications,
      comments: review.comments,
    };

    // Remove from pending reviews
    this.pendingReviews.get(decision.accountId)?.delete(decisionId);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'ai_decision_reviewed',
      accountId: decision.accountId,
      actorId: review.reviewerId,
      actorRole: review.reviewerRole,
      action: 'review_decision',
      resource: 'ai_decision',
      resourceId: decisionId,
      details: {
        decision: review.decision,
        hasModifications: review.modifications !== undefined,
      },
      metadata: {},
    });

    return decision;
  }

  async getPendingReviews(
    accountId: string,
    role?: InstitutionalRole
  ): Promise<AIDecisionRecord[]> {
    const pendingIds = this.pendingReviews.get(accountId);
    if (!pendingIds) {
      return [];
    }

    let decisions = Array.from(pendingIds)
      .map((id) => this.decisions.get(id))
      .filter((d): d is AIDecisionRecord => d !== undefined);

    if (role) {
      // Filter by reviewer role
      const promises = decisions.map(async (d) => {
        const req = await this.requiresHumanReview(d);
        return req.reviewerRoles.includes(role) ? d : null;
      });
      const results = await Promise.all(promises);
      decisions = results.filter((d): d is AIDecisionRecord => d !== null);
    }

    return decisions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async recordOutcome(decisionId: string, outcome: DecisionOutcomeInput): Promise<void> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    const expectedReturn = decision.output.expectedOutcome.expectedReturn;
    const actualReturn = outcome.returnRealized;

    // Calculate performance score (how close actual was to expected)
    const error = Math.abs(actualReturn - expectedReturn);
    const performanceScore = Math.max(0, 1 - error / Math.abs(expectedReturn || 1));

    decision.outcome = {
      actualResult: outcome.actualResult,
      returnRealized: outcome.returnRealized,
      riskRealized: outcome.riskRealized,
      evaluatedAt: new Date(),
      performanceScore,
    };
  }

  async checkSafetyConstraints(
    accountId: string,
    proposedDecision: ProposedDecision
  ): Promise<SafetyCheckResult> {
    const config = this.configs.get(accountId);
    if (!config || !config.safetyGuardrails.enabled) {
      return { passed: true, violations: [], warnings: [], recommendations: [] };
    }

    const guardrails = config.safetyGuardrails;
    const constraints = config.modelConstraints;
    const violations: SafetyViolation[] = [];
    const warnings: SafetyWarning[] = [];
    const recommendations: string[] = [];

    // Check confidence threshold
    if (proposedDecision.confidence < constraints.minConfidenceThreshold) {
      violations.push({
        type: 'low_confidence',
        description: 'Decision confidence below minimum threshold',
        severity: 'warning',
        constraint: 'minConfidenceThreshold',
        value: proposedDecision.confidence,
        limit: constraints.minConfidenceThreshold,
      });
    }

    // Check portfolio change limit
    if (
      Math.abs(proposedDecision.expectedImpact.portfolioChange) >
      constraints.maxPortfolioChangePercent
    ) {
      violations.push({
        type: 'portfolio_change',
        description: 'Proposed change exceeds maximum portfolio change limit',
        severity: 'blocking',
        constraint: 'maxPortfolioChangePercent',
        value: proposedDecision.expectedImpact.portfolioChange,
        limit: constraints.maxPortfolioChangePercent,
      });
    }

    // Check max loss per decision
    const potentialLoss = proposedDecision.expectedImpact.riskChange;
    if (potentialLoss > guardrails.maxLossPerDecision) {
      violations.push({
        type: 'potential_loss',
        description: 'Potential loss exceeds maximum allowed per decision',
        severity: 'blocking',
        constraint: 'maxLossPerDecision',
        value: potentialLoss,
        limit: guardrails.maxLossPerDecision,
      });
    }

    // Check emergency stop
    // This would check cumulative losses in production
    if (potentialLoss > guardrails.emergencyStopThreshold) {
      violations.push({
        type: 'emergency_threshold',
        description: 'Cumulative losses approaching emergency stop threshold',
        severity: 'critical',
        constraint: 'emergencyStopThreshold',
        value: potentialLoss,
        limit: guardrails.emergencyStopThreshold,
      });
    }

    // Generate warnings
    if (proposedDecision.confidence < 0.8 && proposedDecision.confidence >= constraints.minConfidenceThreshold) {
      warnings.push({
        type: 'moderate_confidence',
        message: 'Decision confidence is moderate',
        recommendation: 'Consider reducing position size or seeking additional confirmation',
      });
    }

    // Generate recommendations
    if (violations.length === 0) {
      recommendations.push('Decision passes all safety checks');
    } else {
      if (violations.some((v) => v.type === 'low_confidence')) {
        recommendations.push('Wait for higher confidence signals');
      }
      if (violations.some((v) => v.type === 'portfolio_change')) {
        recommendations.push('Split into smaller transactions');
      }
      if (violations.some((v) => v.type === 'potential_loss')) {
        recommendations.push('Apply tighter stop-loss or reduce position size');
      }
    }

    return {
      passed: violations.filter((v) => v.severity === 'blocking' || v.severity === 'critical').length === 0,
      violations,
      warnings,
      recommendations,
    };
  }

  async getDecisionAnalytics(
    accountId: string,
    period: AnalyticsPeriod
  ): Promise<DecisionAnalytics> {
    const decisions = await this.listDecisions(accountId, {
      startDate: period.start,
      endDate: period.end,
    });

    const reviewed = decisions.filter((d) => d.humanReview !== undefined);
    const withOutcomes = decisions.filter((d) => d.outcome !== undefined);

    const decisionsByType: Record<string, number> = {};
    const decisionsByOutcome: Record<string, number> = {};
    let totalConfidence = 0;
    let totalReturn = 0;
    let totalRisk = 0;
    let accurate = 0;

    for (const decision of decisions) {
      decisionsByType[decision.decisionType] =
        (decisionsByType[decision.decisionType] ?? 0) + 1;
      totalConfidence += decision.confidence;

      if (decision.outcome) {
        decisionsByOutcome[decision.outcome.returnRealized >= 0 ? 'profit' : 'loss'] =
          (decisionsByOutcome[decision.outcome.returnRealized >= 0 ? 'profit' : 'loss'] ?? 0) + 1;
        totalReturn += decision.outcome.returnRealized;
        totalRisk += decision.outcome.riskRealized;

        // Check accuracy (if actual return matches expected direction)
        const expectedPositive = decision.output.expectedOutcome.expectedReturn >= 0;
        const actualPositive = decision.outcome.returnRealized >= 0;
        if (expectedPositive === actualPositive) accurate++;
      }
    }

    const reviewedApproved = reviewed.filter(
      (d) => d.humanReview!.decision === 'approved'
    ).length;
    const reviewedModified = reviewed.filter(
      (d) => d.humanReview!.decision === 'modified'
    ).length;
    const reviewedRejected = reviewed.filter(
      (d) => d.humanReview!.decision === 'rejected'
    ).length;

    const byReviewer: Record<string, number> = {};
    for (const decision of reviewed) {
      const reviewer = decision.humanReview!.reviewerId;
      byReviewer[reviewer] = (byReviewer[reviewer] ?? 0) + 1;
    }

    return {
      accountId,
      period,
      totalDecisions: decisions.length,
      approvedDecisions: reviewedApproved,
      rejectedDecisions: reviewedRejected,
      modifiedDecisions: reviewedModified,
      averageConfidence: decisions.length > 0 ? totalConfidence / decisions.length : 0,
      accuracyRate: withOutcomes.length > 0 ? accurate / withOutcomes.length : 0,
      avgReturnRealized: withOutcomes.length > 0 ? totalReturn / withOutcomes.length : 0,
      avgRiskRealized: withOutcomes.length > 0 ? totalRisk / withOutcomes.length : 0,
      decisionsByType,
      decisionsByOutcome,
      reviewMetrics: {
        totalReviewed: reviewed.length,
        averageReviewTime: 0, // Would calculate from timestamps in production
        approvalRate: reviewed.length > 0 ? reviewedApproved / reviewed.length : 0,
        modificationRate: reviewed.length > 0 ? reviewedModified / reviewed.length : 0,
        rejectionRate: reviewed.length > 0 ? reviewedRejected / reviewed.length : 0,
        byReviewer,
      },
    };
  }

  async getModelPerformance(
    accountId: string,
    agentId?: string
  ): Promise<ModelPerformanceMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const decisions = await this.listDecisions(accountId, {
      agentId,
      startDate: thirtyDaysAgo,
      endDate: now,
    });

    const withOutcomes = decisions.filter((d) => d.outcome !== undefined);

    let totalConfidence = 0;
    let totalReturn = 0;
    let accurate = 0;
    let profitable = 0;
    let consecutiveLosses = 0;
    let maxConsecutiveLosses = 0;
    const performanceByType: Record<string, TypePerformance> = {};

    for (const decision of withOutcomes) {
      totalConfidence += decision.confidence;
      totalReturn += decision.outcome!.returnRealized;

      const expectedPositive = decision.output.expectedOutcome.expectedReturn >= 0;
      const actualPositive = decision.outcome!.returnRealized >= 0;

      if (expectedPositive === actualPositive) accurate++;
      if (decision.outcome!.returnRealized >= 0) {
        profitable++;
        consecutiveLosses = 0;
      } else {
        consecutiveLosses++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
      }

      // Track by type
      if (!performanceByType[decision.decisionType]) {
        performanceByType[decision.decisionType] = {
          count: 0,
          accuracy: 0,
          avgReturn: 0,
          avgConfidence: 0,
        };
      }
      const type = performanceByType[decision.decisionType];
      type.count++;
      type.avgReturn =
        (type.avgReturn * (type.count - 1) + decision.outcome!.returnRealized) / type.count;
      type.avgConfidence =
        (type.avgConfidence * (type.count - 1) + decision.confidence) / type.count;
      if (expectedPositive === actualPositive) {
        type.accuracy = ((type.accuracy * (type.count - 1)) + 1) / type.count;
      } else {
        type.accuracy = (type.accuracy * (type.count - 1)) / type.count;
      }
    }

    // Calculate calibration score (how well confidence predicts accuracy)
    const calibrationBuckets = new Map<number, { correct: number; total: number }>();
    for (const decision of withOutcomes) {
      const bucket = Math.floor(decision.confidence * 10) / 10;
      const existing = calibrationBuckets.get(bucket) ?? { correct: 0, total: 0 };
      existing.total++;
      const expectedPositive = decision.output.expectedOutcome.expectedReturn >= 0;
      const actualPositive = decision.outcome!.returnRealized >= 0;
      if (expectedPositive === actualPositive) existing.correct++;
      calibrationBuckets.set(bucket, existing);
    }

    let calibrationError = 0;
    for (const [bucket, stats] of calibrationBuckets) {
      const actualAccuracy = stats.correct / stats.total;
      calibrationError += Math.abs(bucket - actualAccuracy) * stats.total;
    }
    const calibrationScore = withOutcomes.length > 0 ? 1 - calibrationError / withOutcomes.length : 0;

    // Profit factor
    const profits = withOutcomes
      .filter((d) => d.outcome!.returnRealized > 0)
      .reduce((sum, d) => sum + d.outcome!.returnRealized, 0);
    const losses = Math.abs(
      withOutcomes
        .filter((d) => d.outcome!.returnRealized < 0)
        .reduce((sum, d) => sum + d.outcome!.returnRealized, 0)
    );
    const profitFactor = losses > 0 ? profits / losses : profits > 0 ? Infinity : 0;

    return {
      accountId,
      agentId,
      period: { start: thirtyDaysAgo, end: now },
      totalPredictions: withOutcomes.length,
      accuracyRate: withOutcomes.length > 0 ? accurate / withOutcomes.length : 0,
      avgConfidence: withOutcomes.length > 0 ? totalConfidence / withOutcomes.length : 0,
      calibrationScore,
      profitFactor,
      winRate: withOutcomes.length > 0 ? profitable / withOutcomes.length : 0,
      avgReturnPerDecision: withOutcomes.length > 0 ? totalReturn / withOutcomes.length : 0,
      sharpeRatio: 0, // Would calculate properly in production
      maxConsecutiveLosses,
      performanceByType,
    };
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private generateDecisionId(): string {
    this.decisionCounter++;
    return `decision_${Date.now()}_${this.decisionCounter.toString(36)}`;
  }

  private assessDecisionRisk(decision: DecisionRecordInput): AIRiskAssessment {
    const riskFactors: RiskFactorAssessment[] = [];

    // Assess confidence risk
    if (decision.confidence < 0.7) {
      riskFactors.push({
        factor: 'low_confidence',
        level: 'high',
        score: 0.8,
        description: 'Decision made with low confidence',
      });
    } else if (decision.confidence < 0.85) {
      riskFactors.push({
        factor: 'moderate_confidence',
        level: 'medium',
        score: 0.4,
        description: 'Decision made with moderate confidence',
      });
    }

    // Assess expected outcome risk
    const expectedReturn = decision.output.expectedOutcome.expectedReturn;
    const expectedRisk = decision.output.expectedOutcome.expectedRisk;

    if (expectedRisk > 5) {
      riskFactors.push({
        factor: 'high_expected_risk',
        level: 'high',
        score: expectedRisk / 10,
        description: `High expected risk: ${expectedRisk}%`,
      });
    }

    if (Math.abs(expectedReturn) > 10) {
      riskFactors.push({
        factor: 'extreme_return_expectation',
        level: 'medium',
        score: 0.5,
        description: `Extreme return expectation: ${expectedReturn}%`,
      });
    }

    // Calculate overall risk
    const avgScore =
      riskFactors.length > 0
        ? riskFactors.reduce((sum, f) => sum + f.score, 0) / riskFactors.length
        : 0;

    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    if (avgScore < 0.25) overallRisk = 'low';
    else if (avgScore < 0.5) overallRisk = 'medium';
    else if (avgScore < 0.75) overallRisk = 'high';
    else overallRisk = 'critical';

    return {
      overallRisk,
      riskFactors,
      mitigations: this.generateMitigations(riskFactors),
      recommendations: this.generateRiskRecommendations(riskFactors),
    };
  }

  private generateMitigations(factors: RiskFactorAssessment[]): string[] {
    const mitigations: string[] = [];

    for (const factor of factors) {
      switch (factor.factor) {
        case 'low_confidence':
          mitigations.push('Reduce position size proportionally to confidence');
          break;
        case 'high_expected_risk':
          mitigations.push('Apply stop-loss orders to limit downside');
          break;
        case 'extreme_return_expectation':
          mitigations.push('Verify signal quality and consider partial execution');
          break;
      }
    }

    return mitigations;
  }

  private generateRiskRecommendations(factors: RiskFactorAssessment[]): string[] {
    const recommendations: string[] = [];

    if (factors.some((f) => f.level === 'high' || f.level === 'medium')) {
      recommendations.push('Consider human review before execution');
    }

    if (factors.some((f) => f.factor === 'low_confidence')) {
      recommendations.push('Wait for stronger signals if possible');
    }

    return recommendations;
  }

  private generateSummary(decision: AIDecisionRecord, level: ExplainabilityLevel): string {
    let summary = `AI agent ${decision.agentId} made a ${decision.decisionType} decision `;
    summary += `with ${Math.round(decision.confidence * 100)}% confidence. `;
    summary += `Action: ${decision.output.action}. `;

    if (level !== 'minimal') {
      summary += `Expected return: ${decision.output.expectedOutcome.expectedReturn}%. `;
      summary += `Expected risk: ${decision.output.expectedOutcome.expectedRisk}%. `;
    }

    if (level === 'detailed' || level === 'full') {
      summary += `Risk level: ${decision.riskAssessment.overallRisk}. `;
      if (decision.output.alternatives.length > 0) {
        summary += `${decision.output.alternatives.length} alternatives considered. `;
      }
    }

    return summary;
  }

  private emitEvent(event: Parameters<InstitutionalEventCallback>[0]): void {
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

export function createAIGovernanceManager(): DefaultAIGovernanceManager {
  return new DefaultAIGovernanceManager();
}
