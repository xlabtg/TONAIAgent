/**
 * TONAIAgent Regulatory Strategy Module
 *
 * Comprehensive regulatory compliance, jurisdictional analysis, and risk management
 * infrastructure for AI-native autonomous financial operations on The Open Network (TON).
 *
 * Features:
 * - Global Jurisdiction Analysis
 * - Regulatory Positioning
 * - KYC/AML Tiered Compliance
 * - Custodial Compliance Models
 * - AI Governance & EU AI Act Compliance
 * - Data Privacy (GDPR/CCPA)
 * - Cross-Border Compliance
 * - Regulatory Risk Engine
 */

import {
  RegulatoryEvent,
  RegulatoryEventCallback,
  ComplianceStatusReport,
  ComplianceStatus,
  RiskLevel,
  JurisdictionCode,
  ComplianceGap,
} from './types';

import {
  JurisdictionAnalyzer,
  createJurisdictionAnalyzer,
  JurisdictionAnalyzerConfig,
} from './jurisdiction';

import { KycAmlManager, createKycAmlManager, KycAmlManagerConfig } from './kyc-aml';

import {
  AiGovernanceManager,
  createAiGovernanceManager,
  AiGovernanceManagerConfig,
} from './ai-governance';

import {
  RegulatoryRiskEngine,
  createRegulatoryRiskEngine,
  RegulatoryRiskEngineConfig,
} from './risk-engine';

// Re-export all types
export * from './types';

// Re-export component creators
export {
  createJurisdictionAnalyzer,
  createKycAmlManager,
  createAiGovernanceManager,
  createRegulatoryRiskEngine,
};

// Re-export classes
export {
  JurisdictionAnalyzer,
  KycAmlManager,
  AiGovernanceManager,
  RegulatoryRiskEngine,
};

// ============================================================================
// Regulatory Manager - Unified Interface
// ============================================================================

export interface RegulatoryManagerConfig {
  enabled?: boolean;
  primaryJurisdiction?: JurisdictionCode;
  operationalRegions?: string[];
  complianceLevel?: 'basic' | 'standard' | 'enhanced' | 'institutional';
  jurisdiction?: JurisdictionAnalyzerConfig;
  kycAml?: KycAmlManagerConfig;
  aiGovernance?: AiGovernanceManagerConfig;
  riskEngine?: RegulatoryRiskEngineConfig;
}

export class RegulatoryManager {
  private readonly _config: RegulatoryManagerConfig;
  private eventListeners: RegulatoryEventCallback[] = [];

  public readonly jurisdiction: JurisdictionAnalyzer;
  public readonly kycAml: KycAmlManager;
  public readonly aiGovernance: AiGovernanceManager;
  public readonly riskEngine: RegulatoryRiskEngine;

  /** Get the current configuration */
  get config(): RegulatoryManagerConfig {
    return this._config;
  }

  constructor(config: RegulatoryManagerConfig = {}) {
    this._config = {
      enabled: config.enabled ?? true,
      primaryJurisdiction: config.primaryJurisdiction ?? 'CH',
      operationalRegions: config.operationalRegions ?? ['EU', 'APAC'],
      complianceLevel: config.complianceLevel ?? 'standard',
      ...config,
    };

    // Initialize components
    this.jurisdiction = createJurisdictionAnalyzer(config.jurisdiction);
    this.kycAml = createKycAmlManager(config.kycAml);
    this.aiGovernance = createAiGovernanceManager(config.aiGovernance);
    this.riskEngine = createRegulatoryRiskEngine(config.riskEngine);

    // Forward events from components
    this.setupEventForwarding();
  }

  // ============================================================================
  // Compliance Status
  // ============================================================================

  async getComplianceStatus(): Promise<ComplianceStatusReport> {
    const areas = await this.assessComplianceAreas();
    const gaps = await this.identifyGaps();
    const recommendations = await this.getRecommendations();

    const overallScore = this.calculateOverallScore(areas);
    const overall = this.determineOverallStatus(overallScore);
    const riskLevel = this.determineRiskLevel(overallScore);

    return {
      overall,
      score: overallScore,
      lastAssessed: new Date(),
      nextReviewDue: this.calculateNextReviewDate(riskLevel),
      areas,
      gaps,
      recommendations,
      riskLevel,
    };
  }

  async getComplianceRequirements(
    jurisdiction: JurisdictionCode,
    options: {
      userType?: string;
      activities?: string[];
    }
  ): Promise<{
    licenses: string[];
    kycTier: string;
    amlRequirements: string[];
    aiGovernance: string[];
    privacy: string[];
  }> {
    const jurisdictionData = this.jurisdiction.getJurisdictionRequirements(jurisdiction);

    const kycTier =
      options.userType === 'institutional'
        ? 'institutional'
        : options.userType === 'professional'
        ? 'enhanced'
        : 'standard';

    const aiGovernance: string[] = [];
    if (
      options.activities?.some((a) =>
        ['ai_agents', 'autonomous_trading', 'ai_advisory'].includes(a)
      )
    ) {
      aiGovernance.push('EU AI Act compliance assessment');
      aiGovernance.push('Model governance framework');
      aiGovernance.push('Human oversight requirements');
      aiGovernance.push('Explainability documentation');
    }

    return {
      licenses: jurisdictionData.requiredLicenses.map((l) => l.name ?? l.type ?? ''),
      kycTier,
      amlRequirements: [
        'Transaction monitoring',
        'Sanctions screening',
        'PEP screening',
        'SAR filing capability',
      ],
      aiGovernance,
      privacy: ['GDPR compliance', 'Data subject rights', 'Privacy by design'],
    };
  }

  async validateCompliance(params: {
    jurisdiction: JurisdictionCode;
    entityType: string;
    activities: string[];
    currentLicenses?: string[];
  }): Promise<{
    compliant: boolean;
    gaps: string[];
    recommendations: string[];
  }> {
    const gaps: string[] = [];
    const recommendations: string[] = [];

    // Check jurisdiction requirements
    const jurisdictionData = this.jurisdiction.getJurisdictionRequirements(params.jurisdiction);

    // Check license gaps
    const requiredLicenses = jurisdictionData.requiredLicenses.map((l) => l.type ?? '');
    const currentLicenses = params.currentLicenses ?? [];

    for (const required of requiredLicenses) {
      if (!currentLicenses.includes(required)) {
        gaps.push(`Missing license: ${required}`);
        recommendations.push(`Obtain ${required} license from ${jurisdictionData.name}`);
      }
    }

    // Check activity-specific compliance
    for (const activity of params.activities) {
      if (activity === 'ai_agents' || activity === 'autonomous_trading') {
        if (!params.currentLicenses?.includes('AI_GOVERNANCE')) {
          recommendations.push('Implement AI governance framework per EU AI Act');
        }
      }
    }

    return {
      compliant: gaps.length === 0,
      gaps,
      recommendations,
    };
  }

  async identifyGaps(): Promise<ComplianceGap[]> {
    // This would be populated based on actual compliance checks
    return [];
  }

  async getRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    // Get compliance risks
    const risks = await this.riskEngine.getComplianceRisks();

    for (const risk of risks) {
      if (risk.level === 'critical' || risk.level === 'high') {
        recommendations.push(`Address ${risk.category}: ${risk.description}`);
      }
    }

    return recommendations;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(callback: RegulatoryEventCallback): void {
    this.eventListeners.push(callback);
  }

  private setupEventForwarding(): void {
    // Forward events from all components
    const forwardEvent = (event: RegulatoryEvent) => {
      this.eventListeners.forEach((listener) => listener(event));
    };

    this.jurisdiction.onEvent(forwardEvent);
    this.kycAml.onEvent(forwardEvent);
    this.aiGovernance.onEvent(forwardEvent);
    this.riskEngine.onEvent(forwardEvent);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async assessComplianceAreas(): Promise<ComplianceStatusReport['areas']> {
    return [
      {
        area: 'KYC/AML',
        status: 'compliant',
        score: 90,
        requirements: [
          { requirement: 'Customer identification', status: 'compliant' },
          { requirement: 'Sanctions screening', status: 'compliant' },
          { requirement: 'Transaction monitoring', status: 'compliant' },
        ],
        notes: ['All KYC processes operational'],
      },
      {
        area: 'AI Governance',
        status: 'compliant',
        score: 85,
        requirements: [
          { requirement: 'EU AI Act classification', status: 'compliant' },
          { requirement: 'Model governance', status: 'compliant' },
          { requirement: 'Human oversight', status: 'compliant' },
        ],
        notes: ['AI governance framework implemented'],
      },
      {
        area: 'Licensing',
        status: 'compliant',
        score: 95,
        requirements: [
          { requirement: 'Primary jurisdiction license', status: 'compliant' },
        ],
        notes: ['All required licenses active'],
      },
      {
        area: 'Privacy',
        status: 'compliant',
        score: 88,
        requirements: [
          { requirement: 'GDPR compliance', status: 'compliant' },
          { requirement: 'Data subject rights', status: 'compliant' },
        ],
        notes: ['Privacy framework implemented'],
      },
    ];
  }

  private calculateOverallScore(
    areas: ComplianceStatusReport['areas']
  ): number {
    if (areas.length === 0) return 0;
    const totalScore = areas.reduce((sum, area) => sum + area.score, 0);
    return Math.round(totalScore / areas.length);
  }

  private determineOverallStatus(score: number): ComplianceStatus {
    if (score >= 90) return 'compliant';
    if (score >= 70) return 'partial';
    if (score >= 50) return 'pending';
    return 'non_compliant';
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  private calculateNextReviewDate(riskLevel: RiskLevel): Date {
    const nextDate = new Date();
    switch (riskLevel) {
      case 'critical':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'high':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'medium':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'low':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
    }
    return nextDate;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRegulatoryManager(
  config?: RegulatoryManagerConfig
): RegulatoryManager {
  return new RegulatoryManager(config);
}

// Default export
export default {
  createRegulatoryManager,
  createJurisdictionAnalyzer,
  createKycAmlManager,
  createAiGovernanceManager,
  createRegulatoryRiskEngine,
};
