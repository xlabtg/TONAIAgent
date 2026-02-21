/**
 * TONAIAgent Regulatory Strategy - AI Governance Module
 * Provides EU AI Act compliance, model governance, explainability,
 * human oversight, and algorithmic auditing capabilities.
 */

import {
  AiRiskClass,
  AiSystemClassification,
  AiModelRegistration,
  ExplainabilityConfig,
  ExplainabilityLevel,
  DecisionExplanation,
  ExplanationFactor,
  AlternativeAction,
  DecisionRiskAssessment,
  HumanOversightConfig,
  HumanOversightLevel,
  OversightCheckResult,
  AlgorithmicAudit,
  AuditResults,
  TrainingDataInfo,
  ModelLimitations,
  ModelPerformance,
  AuditStatus,
  RegulatoryEvent,
  RegulatoryEventCallback,
  RiskLevel,
} from './types';

const HIGH_RISK_DOMAINS = [
  'financial_services',
  'healthcare',
  'employment',
  'education',
  'law_enforcement',
  'critical_infrastructure',
];

const HIGH_RISK_CAPABILITIES = [
  'autonomous_trading',
  'credit_scoring',
  'risk_assessment',
  'investment_decisions',
  'margin_liquidation',
];

// ============================================================================
// AI Governance Manager Implementation
// ============================================================================

export interface AiGovernanceManagerConfig {
  enabled?: boolean;
  frameworks?: string[];
  riskClassification?: 'automatic' | 'manual';
  humanOversight?: {
    required?: boolean;
    level?: HumanOversightLevel;
  };
  explainability?: {
    level?: ExplainabilityLevel;
    logging?: boolean;
    retentionDays?: number;
  };
  modelGovernance?: {
    versionControl?: boolean;
    auditSchedule?: string;
    biasMonitoring?: boolean;
  };
}

export interface ClassifyAiSystemParams {
  systemName: string;
  purpose: string;
  domain: string;
  capabilities: string[];
  autonomyLevel: 'low' | 'medium' | 'high' | 'full';
  humanInLoop: boolean;
  affectedParties: string[];
}

export interface RegisterModelParams {
  modelId: string;
  version: string;
  type: string;
  architecture: string;
  trainingData: TrainingDataInfo;
  capabilities: Record<string, boolean>;
  limitations: ModelLimitations;
  performance: ModelPerformance;
  auditStatus: AuditStatus;
}

export interface ExplainDecisionParams {
  decisionId: string;
  modelId: string;
  detailLevel: 'minimal' | 'basic' | 'detailed' | 'comprehensive';
}

export interface RecordDecisionParams {
  decisionId: string;
  modelId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  confidence: number;
  reasoning: string[];
  alternativesConsidered: Array<{ action: string; reason: string }>;
  riskAssessment: { level: RiskLevel; factors: string[] };
  timestamp?: Date;
}

export class AiGovernanceManager {
  private readonly _config: Required<AiGovernanceManagerConfig>;
  private models: Map<string, AiModelRegistration> = new Map();
  private classifications: Map<string, AiSystemClassification> = new Map();
  private explainabilityConfigs: Map<string, ExplainabilityConfig> = new Map();
  private oversightConfigs: Map<string, HumanOversightConfig> = new Map();
  private audits: Map<string, AlgorithmicAudit> = new Map();
  private decisions: Map<string, RecordDecisionParams> = new Map();
  private eventListeners: RegulatoryEventCallback[] = [];

  /** Get the current configuration */
  get config(): Required<AiGovernanceManagerConfig> {
    return this._config;
  }

  constructor(config: AiGovernanceManagerConfig = {}) {
    this._config = {
      enabled: config.enabled ?? true,
      frameworks: config.frameworks ?? ['eu_ai_act', 'nist_ai_rmf', 'oecd_principles'],
      riskClassification: config.riskClassification ?? 'automatic',
      humanOversight: {
        required: config.humanOversight?.required ?? true,
        level: config.humanOversight?.level ?? 'meaningful',
      },
      explainability: {
        level: config.explainability?.level ?? 'detailed',
        logging: config.explainability?.logging ?? true,
        retentionDays: config.explainability?.retentionDays ?? 2555,
      },
      modelGovernance: {
        versionControl: config.modelGovernance?.versionControl ?? true,
        auditSchedule: config.modelGovernance?.auditSchedule ?? 'semi_annual',
        biasMonitoring: config.modelGovernance?.biasMonitoring ?? true,
      },
    };
  }

  // ============================================================================
  // AI System Classification
  // ============================================================================

  async classifyAiSystem(params: ClassifyAiSystemParams): Promise<AiSystemClassification> {
    const euAiActClass = this.determineEuAiActClass(params);
    const riskLevel = this.determineRiskLevel(euAiActClass);
    const requiredControls = this.getRequiredControls(euAiActClass, params);
    const documentation = this.getRequiredDocumentation(euAiActClass);

    const classification: AiSystemClassification = {
      systemName: params.systemName,
      euAiActClass,
      riskLevel,
      requiredControls,
      documentation,
      assessmentDate: new Date(),
      nextReviewDate: this.calculateNextReviewDate(euAiActClass),
    };

    this.classifications.set(params.systemName, classification);

    return classification;
  }

  getClassification(systemName: string): AiSystemClassification | undefined {
    return this.classifications.get(systemName);
  }

  // ============================================================================
  // Model Registration
  // ============================================================================

  async registerModel(params: RegisterModelParams): Promise<AiModelRegistration> {
    const registration: AiModelRegistration = {
      modelId: params.modelId,
      version: params.version,
      type: params.type,
      architecture: params.architecture,
      trainingData: params.trainingData,
      capabilities: params.capabilities,
      limitations: params.limitations,
      performance: params.performance,
      auditStatus: params.auditStatus,
      status: 'development',
      registeredAt: new Date(),
      lastUpdated: new Date(),
    };

    this.models.set(params.modelId, registration);

    this.emitEvent({
      type: 'ai.model_registered',
      timestamp: new Date(),
      payload: { modelId: params.modelId, version: params.version },
      source: 'ai-governance-manager',
    });

    return registration;
  }

  async updateModelStatus(
    modelId: string,
    updates: {
      status?: AiModelRegistration['status'];
      deploymentDate?: Date;
      monitoringEnabled?: boolean;
    }
  ): Promise<AiModelRegistration> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    if (updates.status) {
      model.status = updates.status;
    }
    model.lastUpdated = new Date();

    return model;
  }

  getModel(modelId: string): AiModelRegistration | undefined {
    return this.models.get(modelId);
  }

  getAllModels(): AiModelRegistration[] {
    return Array.from(this.models.values());
  }

  // ============================================================================
  // Explainability
  // ============================================================================

  async configureExplainability(config: ExplainabilityConfig): Promise<void> {
    this.explainabilityConfigs.set(config.modelId, config);
  }

  async recordDecision(params: RecordDecisionParams): Promise<string> {
    const decisionId = params.decisionId || this.generateId('decision');
    this.decisions.set(decisionId, {
      ...params,
      decisionId,
      timestamp: params.timestamp ?? new Date(),
    });

    return decisionId;
  }

  async explainDecision(params: ExplainDecisionParams): Promise<DecisionExplanation> {
    const decision = this.decisions.get(params.decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${params.decisionId}`);
    }

    const keyFactors: ExplanationFactor[] = decision.reasoning.map((reason, index) => ({
      factor: `Factor ${index + 1}`,
      importance: 1 / decision.reasoning.length,
      direction: 'positive' as const,
      explanation: reason,
    }));

    const alternatives: AlternativeAction[] = decision.alternativesConsidered.map((alt) => ({
      action: alt.action,
      confidence: decision.confidence * 0.8,
      reasonNotChosen: alt.reason,
    }));

    const riskAssessment: DecisionRiskAssessment = {
      level: decision.riskAssessment.level,
      factors: decision.riskAssessment.factors,
      mitigations: this.generateMitigations(decision.riskAssessment.level),
    };

    const explanation: DecisionExplanation = {
      decisionId: params.decisionId,
      modelId: params.modelId,
      summary: this.generateSummary(decision),
      keyFactors,
      confidence: decision.confidence,
      alternatives,
      riskAssessment,
      naturalLanguage: this.generateNaturalLanguageExplanation(decision),
      timestamp: decision.timestamp ?? new Date(),
    };

    return explanation;
  }

  async generateExplanation(decisionId: string): Promise<DecisionExplanation> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    return this.explainDecision({
      decisionId,
      modelId: decision.modelId,
      detailLevel: 'detailed',
    });
  }

  // ============================================================================
  // Human Oversight
  // ============================================================================

  async configureHumanOversight(config: HumanOversightConfig): Promise<void> {
    this.oversightConfigs.set(config.modelId, config);
  }

  async checkOversightRequired(
    modelId: string,
    context: {
      type: string;
      amount?: number;
      confidence?: number;
      riskScore?: number;
      newStrategy?: boolean;
      newCounterparty?: boolean;
    }
  ): Promise<OversightCheckResult> {
    const config = this.oversightConfigs.get(modelId);

    // If no specific config, use default settings
    if (!config) {
      return this.checkDefaultOversight(context);
    }

    for (const trigger of config.triggers) {
      let matches = true;

      if (trigger.condition.transactionAmount && context.amount !== undefined) {
        if (trigger.condition.transactionAmount.gte !== undefined) {
          matches = matches && context.amount >= trigger.condition.transactionAmount.gte;
        }
      }

      if (trigger.condition.confidence && context.confidence !== undefined) {
        if (trigger.condition.confidence.lt !== undefined) {
          matches = matches && context.confidence < trigger.condition.confidence.lt;
        }
      }

      if (trigger.condition.riskScore && context.riskScore !== undefined) {
        if (trigger.condition.riskScore.gte !== undefined) {
          matches = matches && context.riskScore >= trigger.condition.riskScore.gte;
        }
      }

      if (trigger.condition.newStrategy !== undefined) {
        matches = matches && context.newStrategy === trigger.condition.newStrategy;
      }

      if (trigger.condition.newCounterparty !== undefined) {
        matches = matches && context.newCounterparty === trigger.condition.newCounterparty;
      }

      if (matches) {
        this.emitEvent({
          type: 'ai.oversight_triggered',
          timestamp: new Date(),
          payload: { modelId, trigger: trigger.condition, context },
          source: 'ai-governance-manager',
        });

        return {
          required: true,
          reason: `Triggered by condition: ${JSON.stringify(trigger.condition)}`,
          approvers: config.escalation.path,
          timeout: trigger.timeout,
          escalationPath: config.escalation.path,
        };
      }
    }

    return { required: false };
  }

  async checkHumanReviewRequired(
    modelId: string,
    params: {
      type: string;
      amount?: number;
      riskScore?: number;
    }
  ): Promise<{ required: boolean; reasons: string[] }> {
    const result = await this.checkOversightRequired(modelId, params);

    return {
      required: result.required,
      reasons: result.required && result.reason ? [result.reason] : [],
    };
  }

  // ============================================================================
  // Algorithmic Auditing
  // ============================================================================

  async scheduleAudit(params: {
    modelId: string;
    auditType: 'internal' | 'external' | 'comprehensive';
    scope: string[];
    auditor: { type: 'internal' | 'external'; firm?: string; credentials: string[] };
    frequency: string;
  }): Promise<AlgorithmicAudit> {
    const audit: AlgorithmicAudit = {
      auditId: this.generateId('audit'),
      modelId: params.modelId,
      auditType: params.auditType,
      scope: params.scope,
      auditor: params.auditor,
      frequency: params.frequency,
      status: 'scheduled',
      scheduledDate: this.calculateNextAuditDate(params.frequency),
    };

    this.audits.set(audit.auditId, audit);

    this.emitEvent({
      type: 'ai.audit_scheduled',
      timestamp: new Date(),
      payload: { auditId: audit.auditId, modelId: params.modelId },
      source: 'ai-governance-manager',
    });

    return audit;
  }

  async completeAudit(
    auditId: string,
    results: AuditResults
  ): Promise<AlgorithmicAudit> {
    const audit = this.audits.get(auditId);
    if (!audit) {
      throw new Error(`Audit not found: ${auditId}`);
    }

    audit.status = 'completed';
    audit.completedDate = new Date();
    audit.results = results;

    // Update model audit status
    const model = this.models.get(audit.modelId);
    if (model) {
      model.auditStatus = {
        lastAudit: new Date(),
        auditor: audit.auditor.firm ?? 'Internal',
        findings: results.status,
        nextAuditDue: this.calculateNextAuditDate(audit.frequency),
        auditType: audit.auditor.type,
      };
    }

    this.emitEvent({
      type: 'ai.audit_completed',
      timestamp: new Date(),
      payload: { auditId, modelId: audit.modelId, status: results.status },
      source: 'ai-governance-manager',
    });

    return audit;
  }

  async getAuditResults(auditId: string): Promise<AuditResults | undefined> {
    const audit = this.audits.get(auditId);
    return audit?.results;
  }

  getScheduledAudits(modelId?: string): AlgorithmicAudit[] {
    let audits = Array.from(this.audits.values());
    if (modelId) {
      audits = audits.filter((a) => a.modelId === modelId);
    }
    return audits.filter((a) => a.status === 'scheduled');
  }

  // ============================================================================
  // Safety Constraints
  // ============================================================================

  async checkSafetyConstraints(
    modelId: string,
    params: {
      type: string;
      amount?: number;
      action?: string;
      confidence?: number;
    }
  ): Promise<{
    passed: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    const model = this.models.get(modelId);
    if (!model) {
      return { passed: true, violations: [], warnings: ['Model not registered'] };
    }

    // Check amount limits
    if (model.limitations.maxPositionSize && params.amount !== undefined) {
      if (params.amount > model.limitations.maxPositionSize) {
        violations.push(`Amount ${params.amount} exceeds max position size ${model.limitations.maxPositionSize}`);
      }
    }

    // Check excluded assets
    if (model.limitations.excludedAssets && params.action) {
      if (model.limitations.excludedAssets.includes(params.action)) {
        violations.push(`Action "${params.action}" is in excluded list`);
      }
    }

    // Check confidence threshold
    if (params.confidence !== undefined && params.confidence < 0.6) {
      warnings.push(`Low confidence score: ${params.confidence}`);
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  // ============================================================================
  // Decision Analytics
  // ============================================================================

  async getDecisionAnalytics(
    modelId: string,
    _period: string // Reserved for future time-filtered analytics
  ): Promise<{
    totalDecisions: number;
    approvalRate: number;
    averageConfidence: number;
    humanReviewRate: number;
    riskDistribution: Record<RiskLevel, number>;
  }> {
    const decisions = Array.from(this.decisions.values()).filter(
      (d) => d.modelId === modelId
    );

    if (decisions.length === 0) {
      return {
        totalDecisions: 0,
        approvalRate: 0,
        averageConfidence: 0,
        humanReviewRate: 0,
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
      };
    }

    const totalDecisions = decisions.length;
    const averageConfidence =
      decisions.reduce((sum, d) => sum + d.confidence, 0) / totalDecisions;

    const riskDistribution: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const decision of decisions) {
      riskDistribution[decision.riskAssessment.level]++;
    }

    return {
      totalDecisions,
      approvalRate: 0.85, // Simulated
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      humanReviewRate: 0.15, // Simulated
      riskDistribution,
    };
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

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineEuAiActClass(params: ClassifyAiSystemParams): AiRiskClass {
    // Unacceptable risk check
    const unacceptableCapabilities = ['social_scoring', 'mass_surveillance', 'manipulation'];
    if (params.capabilities.some((c) => unacceptableCapabilities.includes(c))) {
      return 'unacceptable';
    }

    // High risk check
    const isHighRiskDomain = HIGH_RISK_DOMAINS.includes(params.domain);
    const hasHighRiskCapability = params.capabilities.some((c) =>
      HIGH_RISK_CAPABILITIES.includes(c)
    );

    if (isHighRiskDomain || hasHighRiskCapability) {
      // Financial services AI is typically high risk
      if (params.autonomyLevel === 'high' || params.autonomyLevel === 'full') {
        return 'high';
      }
      if (!params.humanInLoop) {
        return 'high';
      }
    }

    // Limited risk check
    if (params.affectedParties.length > 0 && params.autonomyLevel !== 'low') {
      return 'limited';
    }

    return 'minimal';
  }

  private determineRiskLevel(aiActClass: AiRiskClass): RiskLevel {
    switch (aiActClass) {
      case 'unacceptable':
        return 'critical';
      case 'high':
        return 'high';
      case 'limited':
        return 'medium';
      case 'minimal':
        return 'low';
    }
  }

  private getRequiredControls(
    aiActClass: AiRiskClass,
    params: ClassifyAiSystemParams
  ): string[] {
    const controls: string[] = [];

    if (aiActClass === 'unacceptable') {
      controls.push('SYSTEM PROHIBITED - DO NOT DEPLOY');
      return controls;
    }

    if (aiActClass === 'high') {
      controls.push('Risk management system');
      controls.push('Data governance and management');
      controls.push('Technical documentation');
      controls.push('Record-keeping');
      controls.push('Transparency and user information');
      controls.push('Human oversight');
      controls.push('Accuracy, robustness, and cybersecurity');
      controls.push('Quality management system');
      controls.push('Conformity assessment');
      controls.push('Registration in EU database');
    }

    if (aiActClass === 'limited') {
      controls.push('Transparency obligations');
      controls.push('User notification of AI interaction');
    }

    // Additional controls based on capabilities
    if (params.capabilities.includes('autonomous_trading')) {
      controls.push('Position limits enforcement');
      controls.push('Kill switch capability');
      controls.push('Real-time monitoring');
    }

    return controls;
  }

  private getRequiredDocumentation(aiActClass: AiRiskClass): string[] {
    const docs: string[] = [];

    if (aiActClass === 'high') {
      docs.push('System description and intended purpose');
      docs.push('Training data documentation');
      docs.push('Data governance procedures');
      docs.push('Risk management documentation');
      docs.push('Technical specifications');
      docs.push('Human oversight procedures');
      docs.push('Performance metrics and testing results');
      docs.push('Conformity declaration');
      docs.push('Instructions for use');
      docs.push('Contact information');
    }

    if (aiActClass === 'limited') {
      docs.push('User disclosure documentation');
      docs.push('Basic system description');
    }

    return docs;
  }

  private calculateNextReviewDate(aiActClass: AiRiskClass): Date {
    const reviewDate = new Date();
    switch (aiActClass) {
      case 'high':
        reviewDate.setMonth(reviewDate.getMonth() + 6);
        break;
      case 'limited':
        reviewDate.setFullYear(reviewDate.getFullYear() + 1);
        break;
      default:
        reviewDate.setFullYear(reviewDate.getFullYear() + 2);
    }
    return reviewDate;
  }

  private calculateNextAuditDate(frequency: string): Date {
    const auditDate = new Date();
    switch (frequency) {
      case 'quarterly':
        auditDate.setMonth(auditDate.getMonth() + 3);
        break;
      case 'semi_annual':
        auditDate.setMonth(auditDate.getMonth() + 6);
        break;
      case 'annual':
        auditDate.setFullYear(auditDate.getFullYear() + 1);
        break;
      default:
        auditDate.setMonth(auditDate.getMonth() + 6);
    }
    return auditDate;
  }

  private checkDefaultOversight(context: {
    type: string;
    amount?: number;
    confidence?: number;
    riskScore?: number;
  }): OversightCheckResult {
    // Default thresholds
    const defaultAmountThreshold = 50000;
    const defaultConfidenceThreshold = 0.7;
    const defaultRiskThreshold = 0.8;

    const reasons: string[] = [];

    if (context.amount !== undefined && context.amount >= defaultAmountThreshold) {
      reasons.push(`Amount ${context.amount} exceeds threshold ${defaultAmountThreshold}`);
    }

    if (context.confidence !== undefined && context.confidence < defaultConfidenceThreshold) {
      reasons.push(`Confidence ${context.confidence} below threshold ${defaultConfidenceThreshold}`);
    }

    if (context.riskScore !== undefined && context.riskScore >= defaultRiskThreshold) {
      reasons.push(`Risk score ${context.riskScore} exceeds threshold ${defaultRiskThreshold}`);
    }

    if (reasons.length > 0) {
      return {
        required: true,
        reason: reasons.join('; '),
        approvers: ['operator', 'risk_manager'],
        timeout: '1h',
      };
    }

    return { required: false };
  }

  private generateSummary(decision: RecordDecisionParams): string {
    const outputStr = JSON.stringify(decision.output);
    return `Decision made with ${Math.round(decision.confidence * 100)}% confidence. ` +
      `Output: ${outputStr.substring(0, 100)}${outputStr.length > 100 ? '...' : ''}`;
  }

  private generateNaturalLanguageExplanation(decision: RecordDecisionParams): string {
    const parts: string[] = [];

    parts.push(`The AI system made this decision with ${Math.round(decision.confidence * 100)}% confidence.`);

    if (decision.reasoning.length > 0) {
      parts.push(`Key reasoning: ${decision.reasoning.slice(0, 3).join('. ')}.`);
    }

    if (decision.alternativesConsidered.length > 0) {
      parts.push(
        `${decision.alternativesConsidered.length} alternative actions were considered but rejected.`
      );
    }

    parts.push(`Risk level: ${decision.riskAssessment.level}.`);

    return parts.join(' ');
  }

  private generateMitigations(riskLevel: RiskLevel): string[] {
    switch (riskLevel) {
      case 'critical':
        return [
          'Immediate human review required',
          'Consider blocking action',
          'Escalate to senior management',
        ];
      case 'high':
        return [
          'Human approval recommended',
          'Additional verification steps',
          'Enhanced monitoring',
        ];
      case 'medium':
        return [
          'Standard monitoring',
          'Periodic review',
        ];
      case 'low':
        return [
          'Routine monitoring',
        ];
    }
  }
}

export function createAiGovernanceManager(
  config?: AiGovernanceManagerConfig
): AiGovernanceManager {
  return new AiGovernanceManager(config);
}
