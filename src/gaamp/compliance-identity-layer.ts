/**
 * TONAIAgent - GAAMP Compliance & Identity Layer
 *
 * Implements the Compliance & Identity Layer of the Global Autonomous Asset
 * Management Protocol. Provides institutional onboarding, KYC/AML screening,
 * jurisdiction-aware logic, permissioned fund classes, and audit transparency.
 *
 * Capabilities:
 * - Participant registration and identity management
 * - KYC/AML screening with multi-level checks
 * - Jurisdiction classification and access control
 * - Permissioned fund class access
 * - Tamper-proof audit trail
 * - Compliance reporting
 */

import {
  ParticipantId,
  FundId,
  FundClass,
  ProtocolParticipant,
  KYCRecord,
  KYCLevel,
  AMLRecord,
  AMLRiskLevel,
  JurisdictionRecord,
  JurisdictionClass,
  ParticipantPermissions,
  InstitutionalType,
  AuditTrailEntry,
  ComplianceReport,
  ComplianceFinding,
  ComplianceLayerConfig,
  GAMPEvent,
  GAMPEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_COMPLIANCE_LAYER_CONFIG: ComplianceLayerConfig = {
  kycRequired: true,
  amlScreeningEnabled: true,
  auditTrailEnabled: true,
  jurisdictionChecksEnabled: true,
  reportingEnabled: true,
};

// Jurisdictions blocked by default (OFAC + standard sanctions list)
const DEFAULT_BLOCKED_JURISDICTIONS: string[] = ['KP', 'IR', 'CU', 'SY'];

// Fund class minimum KYC requirements
const FUND_CLASS_KYC_REQUIREMENTS: Record<FundClass, KYCLevel> = {
  retail: 'basic',
  accredited: 'standard',
  institutional: 'enhanced',
  dao_members: 'standard',
};

// ============================================================================
// Interfaces
// ============================================================================

export interface ComplianceIdentityLayer {
  readonly config: ComplianceLayerConfig;

  // Participant management
  registerParticipant(params: RegisterParticipantParams): ProtocolParticipant;
  getParticipant(participantId: ParticipantId): ProtocolParticipant | undefined;
  listParticipants(filters?: ParticipantFilters): ProtocolParticipant[];
  deactivateParticipant(participantId: ParticipantId, reason?: string): void;

  // KYC management
  updateKYC(participantId: ParticipantId, kyc: Partial<KYCRecord>): ProtocolParticipant;
  approveKYC(participantId: ParticipantId, level: KYCLevel): ProtocolParticipant;
  rejectKYC(participantId: ParticipantId, reason: string): ProtocolParticipant;
  isKYCValid(participantId: ParticipantId): boolean;

  // AML management
  screenParticipant(participantId: ParticipantId): AMLRecord;
  updateAMLRecord(participantId: ParticipantId, aml: Partial<AMLRecord>): ProtocolParticipant;
  isAMLClean(participantId: ParticipantId): boolean;

  // Access control
  canAccessFundClass(participantId: ParticipantId, fundClass: FundClass): boolean;
  isJurisdictionAllowed(jurisdiction: string): boolean;
  getPermissions(participantId: ParticipantId): ParticipantPermissions | undefined;
  updatePermissions(participantId: ParticipantId, permissions: Partial<ParticipantPermissions>): ProtocolParticipant;

  // Audit trail
  recordAuditEntry(params: RecordAuditParams): AuditTrailEntry;
  getAuditTrail(filters?: AuditTrailFilters): AuditTrailEntry[];

  // Compliance reports
  generateComplianceReport(params: GenerateReportParams): ComplianceReport;
  listComplianceReports(filters?: ReportFilters): ComplianceReport[];

  onEvent(callback: GAMPEventCallback): void;
}

export interface RegisterParticipantParams {
  name: string;
  type: ProtocolParticipant['type'];
  institutionalType?: InstitutionalType;
  primaryJurisdiction: string;
  additionalJurisdictions?: string[];
}

export interface ParticipantFilters {
  type?: ProtocolParticipant['type'];
  kycLevel?: KYCLevel;
  kycStatus?: KYCRecord['status'];
  amlRisk?: AMLRiskLevel;
  jurisdiction?: string;
  jurisdictionClass?: JurisdictionClass;
}

export interface RecordAuditParams {
  participantId: ParticipantId;
  action: string;
  entityType: AuditTrailEntry['entityType'];
  entityId: string;
  details?: Record<string, unknown>;
  chainId?: string;
  transactionHash?: string;
}

export interface AuditTrailFilters {
  participantId?: ParticipantId;
  entityType?: AuditTrailEntry['entityType'];
  action?: string;
  from?: Date;
  to?: Date;
}

export interface GenerateReportParams {
  fundId?: FundId;
  participantId?: ParticipantId;
  jurisdiction: string;
  period: { from: Date; to: Date };
  reportType: ComplianceReport['reportType'];
}

export interface ReportFilters {
  fundId?: FundId;
  participantId?: ParticipantId;
  jurisdiction?: string;
  status?: ComplianceReport['status'];
  reportType?: ComplianceReport['reportType'];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultComplianceIdentityLayer implements ComplianceIdentityLayer {
  readonly config: ComplianceLayerConfig;
  private readonly participants: Map<ParticipantId, ProtocolParticipant> = new Map();
  private readonly auditTrail: AuditTrailEntry[] = [];
  private readonly complianceReports: Map<string, ComplianceReport> = new Map();
  private readonly eventCallbacks: GAMPEventCallback[] = [];
  private readonly blockedJurisdictions: Set<string>;
  private counter = 0;

  constructor(config?: Partial<ComplianceLayerConfig>, blockedJurisdictions?: string[]) {
    this.config = { ...DEFAULT_COMPLIANCE_LAYER_CONFIG, ...config };
    this.blockedJurisdictions = new Set(blockedJurisdictions ?? DEFAULT_BLOCKED_JURISDICTIONS);
  }

  // ============================================================================
  // Participant Management
  // ============================================================================

  registerParticipant(params: RegisterParticipantParams): ProtocolParticipant {
    const id = this.generateId('part');
    const now = new Date();

    const jurisdictionClass = this.classifyJurisdiction(params.primaryJurisdiction);

    const participant: ProtocolParticipant = {
      id,
      name: params.name,
      type: params.type,
      institutionalType: params.institutionalType,
      kyc: {
        level: 'none',
        status: 'pending',
        documentTypes: [],
      },
      aml: {
        riskLevel: 'medium',
        sanctions: false,
        pep: false,
        adverseMedia: false,
      },
      jurisdiction: {
        primaryJurisdiction: params.primaryJurisdiction,
        additionalJurisdictions: params.additionalJurisdictions,
        jurisdictionClass,
      },
      permissions: this.defaultPermissions(params.type, jurisdictionClass),
      registeredAt: now,
      updatedAt: now,
    };

    if (jurisdictionClass === 'blocked') {
      throw new Error(
        `Jurisdiction '${params.primaryJurisdiction}' is blocked — participant registration denied`
      );
    }

    this.participants.set(id, participant);

    this.emitEvent('participant_registered', {
      participantId: id,
      name: params.name,
      type: params.type,
      jurisdiction: params.primaryJurisdiction,
    });

    if (this.config.auditTrailEnabled) {
      this.recordAuditEntry({
        participantId: id,
        action: 'participant_registered',
        entityType: 'compliance',
        entityId: id,
        details: { name: params.name, type: params.type },
      });
    }

    return participant;
  }

  getParticipant(participantId: ParticipantId): ProtocolParticipant | undefined {
    return this.participants.get(participantId);
  }

  listParticipants(filters?: ParticipantFilters): ProtocolParticipant[] {
    let result = Array.from(this.participants.values());

    if (filters) {
      if (filters.type) result = result.filter(p => p.type === filters.type);
      if (filters.kycLevel) result = result.filter(p => p.kyc.level === filters.kycLevel);
      if (filters.kycStatus) result = result.filter(p => p.kyc.status === filters.kycStatus);
      if (filters.amlRisk) result = result.filter(p => p.aml.riskLevel === filters.amlRisk);
      if (filters.jurisdiction) {
        result = result.filter(p => p.jurisdiction.primaryJurisdiction === filters.jurisdiction);
      }
      if (filters.jurisdictionClass) {
        result = result.filter(p => p.jurisdiction.jurisdictionClass === filters.jurisdictionClass);
      }
    }

    return result;
  }

  deactivateParticipant(participantId: ParticipantId, reason?: string): void {
    const participant = this.requireParticipant(participantId);

    const updated: ProtocolParticipant = {
      ...participant,
      permissions: {
        ...participant.permissions,
        tradingEnabled: false,
        canCreateFund: false,
        canDeployAgent: false,
        crossChainEnabled: false,
      },
      updatedAt: new Date(),
    };

    this.participants.set(participantId, updated);

    if (this.config.auditTrailEnabled) {
      this.recordAuditEntry({
        participantId,
        action: 'participant_deactivated',
        entityType: 'compliance',
        entityId: participantId,
        details: { reason },
      });
    }
  }

  // ============================================================================
  // KYC Management
  // ============================================================================

  updateKYC(participantId: ParticipantId, kyc: Partial<KYCRecord>): ProtocolParticipant {
    const participant = this.requireParticipant(participantId);
    return this.updateParticipant(participantId, {
      kyc: { ...participant.kyc, ...kyc },
    });
  }

  approveKYC(participantId: ParticipantId, level: KYCLevel): ProtocolParticipant {
    const now = new Date();
    const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    const updated = this.updateKYC(participantId, {
      level,
      status: 'approved',
      verifiedAt: now,
      expiresAt: expires,
    });

    this.emitEvent('kyc_approved', { participantId, level });

    if (this.config.auditTrailEnabled) {
      this.recordAuditEntry({
        participantId,
        action: 'kyc_approved',
        entityType: 'compliance',
        entityId: participantId,
        details: { level },
      });
    }

    return updated;
  }

  rejectKYC(participantId: ParticipantId, reason: string): ProtocolParticipant {
    const updated = this.updateKYC(participantId, { status: 'rejected' });

    this.emitEvent('kyc_rejected', { participantId, reason });

    if (this.config.auditTrailEnabled) {
      this.recordAuditEntry({
        participantId,
        action: 'kyc_rejected',
        entityType: 'compliance',
        entityId: participantId,
        details: { reason },
      });
    }

    return updated;
  }

  isKYCValid(participantId: ParticipantId): boolean {
    if (!this.config.kycRequired) return true;

    const participant = this.participants.get(participantId);
    if (!participant) return false;

    const kyc = participant.kyc;
    if (kyc.status !== 'approved') return false;
    if (kyc.expiresAt && kyc.expiresAt < new Date()) return false;

    return true;
  }

  // ============================================================================
  // AML Management
  // ============================================================================

  screenParticipant(participantId: ParticipantId): AMLRecord {
    const participant = this.requireParticipant(participantId);

    // Simulate AML screening (production would integrate with actual AML providers)
    const jurisdiction = participant.jurisdiction.primaryJurisdiction;
    const isHighRisk = ['AF', 'MM', 'YE', 'SS'].includes(jurisdiction);

    const aml: AMLRecord = {
      ...participant.aml,
      screenedAt: new Date(),
      nextScreeningAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      riskLevel: isHighRisk ? 'high' : participant.aml.riskLevel,
      source: 'gaamp_aml_engine',
    };

    this.updateParticipant(participantId, { aml });

    if (this.config.auditTrailEnabled) {
      this.recordAuditEntry({
        participantId,
        action: 'aml_screened',
        entityType: 'compliance',
        entityId: participantId,
        details: { riskLevel: aml.riskLevel },
      });
    }

    return aml;
  }

  updateAMLRecord(participantId: ParticipantId, aml: Partial<AMLRecord>): ProtocolParticipant {
    const participant = this.requireParticipant(participantId);
    return this.updateParticipant(participantId, {
      aml: { ...participant.aml, ...aml },
    });
  }

  isAMLClean(participantId: ParticipantId): boolean {
    if (!this.config.amlScreeningEnabled) return true;

    const participant = this.participants.get(participantId);
    if (!participant) return false;

    const aml = participant.aml;
    return !aml.sanctions && !aml.pep && aml.riskLevel !== 'very_high';
  }

  // ============================================================================
  // Access Control
  // ============================================================================

  canAccessFundClass(participantId: ParticipantId, fundClass: FundClass): boolean {
    const participant = this.participants.get(participantId);
    if (!participant) return false;

    if (!participant.permissions.allowedFundClasses.includes(fundClass)) {
      return false;
    }

    if (!this.isKYCValid(participantId)) return false;
    if (!this.isAMLClean(participantId)) return false;

    const requiredKYC = FUND_CLASS_KYC_REQUIREMENTS[fundClass];
    return this.kycLevelSufficient(participant.kyc.level, requiredKYC);
  }

  isJurisdictionAllowed(jurisdiction: string): boolean {
    if (!this.config.jurisdictionChecksEnabled) return true;
    return !this.blockedJurisdictions.has(jurisdiction);
  }

  getPermissions(participantId: ParticipantId): ParticipantPermissions | undefined {
    return this.participants.get(participantId)?.permissions;
  }

  updatePermissions(
    participantId: ParticipantId,
    permissions: Partial<ParticipantPermissions>
  ): ProtocolParticipant {
    const participant = this.requireParticipant(participantId);
    return this.updateParticipant(participantId, {
      permissions: { ...participant.permissions, ...permissions },
    });
  }

  // ============================================================================
  // Audit Trail
  // ============================================================================

  recordAuditEntry(params: RecordAuditParams): AuditTrailEntry {
    const entry: AuditTrailEntry = {
      id: this.generateId('audit'),
      participantId: params.participantId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details ?? {},
      chainId: params.chainId,
      transactionHash: params.transactionHash,
      timestamp: new Date(),
    };

    if (this.config.auditTrailEnabled) {
      this.auditTrail.push(entry);
    }

    return entry;
  }

  getAuditTrail(filters?: AuditTrailFilters): AuditTrailEntry[] {
    let result = [...this.auditTrail];

    if (filters) {
      if (filters.participantId) result = result.filter(e => e.participantId === filters.participantId);
      if (filters.entityType) result = result.filter(e => e.entityType === filters.entityType);
      if (filters.action) result = result.filter(e => e.action === filters.action);
      if (filters.from) result = result.filter(e => e.timestamp >= filters.from!);
      if (filters.to) result = result.filter(e => e.timestamp <= filters.to!);
    }

    return result;
  }

  // ============================================================================
  // Compliance Reports
  // ============================================================================

  generateComplianceReport(params: GenerateReportParams): ComplianceReport {
    if (!this.config.reportingEnabled) {
      throw new Error('Compliance reporting is disabled');
    }

    const findings = this.analyzeCompliance(params);
    const id = this.generateId('rpt');

    const report: ComplianceReport = {
      id,
      fundId: params.fundId,
      participantId: params.participantId,
      period: params.period,
      jurisdiction: params.jurisdiction,
      reportType: params.reportType,
      findings,
      generatedAt: new Date(),
      status: 'draft',
    };

    this.complianceReports.set(id, report);
    return report;
  }

  listComplianceReports(filters?: ReportFilters): ComplianceReport[] {
    let result = Array.from(this.complianceReports.values());

    if (filters) {
      if (filters.fundId) result = result.filter(r => r.fundId === filters.fundId);
      if (filters.participantId) result = result.filter(r => r.participantId === filters.participantId);
      if (filters.jurisdiction) result = result.filter(r => r.jurisdiction === filters.jurisdiction);
      if (filters.status) result = result.filter(r => r.status === filters.status);
      if (filters.reportType) result = result.filter(r => r.reportType === filters.reportType);
    }

    return result;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: GAMPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private classifyJurisdiction(jurisdiction: string): JurisdictionClass {
    if (this.blockedJurisdictions.has(jurisdiction)) return 'blocked';
    // Simplified classification — production would use a comprehensive jurisdiction database
    const restricted = ['RU', 'BY', 'VE'];
    if (restricted.includes(jurisdiction)) return 'restricted';
    const permissioned = ['CN', 'IN', 'SA'];
    if (permissioned.includes(jurisdiction)) return 'permissioned';
    return 'unrestricted';
  }

  private defaultPermissions(
    type: ProtocolParticipant['type'],
    jurisdictionClass: JurisdictionClass
  ): ParticipantPermissions {
    const isBlocked = jurisdictionClass === 'blocked';
    const isRestricted = jurisdictionClass === 'restricted';

    return {
      canCreateFund: !isBlocked && !isRestricted && (type === 'institution' || type === 'dao'),
      canDeployAgent: !isBlocked,
      canVote: !isBlocked,
      canProposeGovernance: !isBlocked && type !== 'individual',
      allowedFundClasses: isBlocked
        ? []
        : isRestricted
        ? ['retail']
        : ['retail', 'accredited', 'institutional', 'dao_members'],
      tradingEnabled: !isBlocked,
      crossChainEnabled: !isBlocked && !isRestricted,
    };
  }

  private kycLevelSufficient(current: KYCLevel, required: KYCLevel): boolean {
    const levels: KYCLevel[] = ['none', 'basic', 'standard', 'enhanced', 'institutional'];
    return levels.indexOf(current) >= levels.indexOf(required);
  }

  private analyzeCompliance(params: GenerateReportParams): ComplianceFinding[] {
    const findings: ComplianceFinding[] = [];

    if (params.participantId) {
      const participant = this.participants.get(params.participantId);

      if (participant) {
        if (!this.isKYCValid(params.participantId)) {
          findings.push({
            severity: 'critical',
            category: 'kyc',
            description: 'KYC is not valid or expired',
            recommendation: 'Complete KYC verification',
            regulatoryReference: 'AML/KYC Directive',
          });
        }

        if (participant.aml.sanctions) {
          findings.push({
            severity: 'critical',
            category: 'sanctions',
            description: 'Participant appears on sanctions list',
            recommendation: 'Freeze account and report to authorities',
            regulatoryReference: 'OFAC / UN Sanctions',
          });
        }

        if (participant.aml.riskLevel === 'high' || participant.aml.riskLevel === 'very_high') {
          findings.push({
            severity: 'warning',
            category: 'aml',
            description: `High AML risk level: ${participant.aml.riskLevel}`,
            recommendation: 'Perform enhanced due diligence',
          });
        }

        const lastScreening = participant.aml.nextScreeningAt;
        if (lastScreening && lastScreening < new Date()) {
          findings.push({
            severity: 'warning',
            category: 'aml',
            description: 'AML screening is overdue',
            recommendation: 'Initiate AML re-screening',
          });
        }
      }
    }

    if (findings.length === 0) {
      findings.push({
        severity: 'info',
        category: 'general',
        description: 'No compliance issues detected for the period',
      });
    }

    return findings;
  }

  private requireParticipant(participantId: ParticipantId): ProtocolParticipant {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }
    return participant;
  }

  private updateParticipant(
    participantId: ParticipantId,
    updates: Partial<ProtocolParticipant>
  ): ProtocolParticipant {
    const participant = this.requireParticipant(participantId);
    const updated: ProtocolParticipant = {
      ...participant,
      ...updates,
      updatedAt: new Date(),
    };
    this.participants.set(participantId, updated);
    return updated;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.counter}`;
  }

  private emitEvent(type: GAMPEvent['type'], payload: Record<string, unknown>): void {
    const event: GAMPEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      chain: 'ton',
      payload,
      timestamp: new Date(),
    };

    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createComplianceIdentityLayer(
  config?: Partial<ComplianceLayerConfig>,
  blockedJurisdictions?: string[]
): DefaultComplianceIdentityLayer {
  return new DefaultComplianceIdentityLayer(config, blockedJurisdictions);
}

export { DEFAULT_BLOCKED_JURISDICTIONS, FUND_CLASS_KYC_REQUIREMENTS };
export default DefaultComplianceIdentityLayer;
