/**
 * TONAIAgent - GRIF Audit & Attestation Layer
 *
 * Enables:
 * - Third-party audit integration
 * - On-chain proof-of-reserve attestations
 * - Risk attestations
 * - Compliance attestations
 * - Zero-knowledge disclosure modes
 *
 * This is Component 5 of the Global Regulatory Integration Framework (GRIF).
 */

import {
  AuditRecord,
  AuditFinding,
  Attestation,
  AttestationType,
  ProofOfReserveAttestation,
  RiskAttestation,
  ComplianceAttestation,
  GRIFJurisdictionCode,
  GRIFRiskLevel,
  RegulatoryStatus,
  GRIFEvent,
  GRIFEventCallback,
} from './types';

import { createHash } from 'crypto';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_AUDIT_CONFIG: AuditAttestationConfig = {
  enabled: true,
  autoScheduleAudits: false,
  attestationTtlDays: 90,
  enableZKProofs: false,
  retentionYears: 7,
};

// ============================================================================
// Interface
// ============================================================================

export interface AuditAttestationConfig {
  enabled?: boolean;
  autoScheduleAudits?: boolean;
  attestationTtlDays?: number;
  enableZKProofs?: boolean;
  retentionYears?: number;
}

export interface ScheduleAuditParams {
  auditType: string;
  auditor: string;
  scope: string[];
  jurisdiction?: GRIFJurisdictionCode;
  startDate: Date;
}

export interface CompleteAuditParams {
  auditId: string;
  findings: Omit<AuditFinding, 'resolved'>[];
  reportUrl?: string;
}

export interface IssueProofOfReserveParams {
  issuer: string;
  reserveAmount: number;
  currency: string;
  chain?: string;
  jurisdiction?: GRIFJurisdictionCode;
  zkProof?: boolean;
}

export interface IssueRiskAttestationParams {
  issuer: string;
  subject: string;
  riskScore: number;
  riskFactors: string[];
  assessmentMethodology: string;
  jurisdiction?: GRIFJurisdictionCode;
}

export interface IssueComplianceAttestationParams {
  issuer: string;
  subject: string;
  complianceFramework: string;
  regulatoryStatus: RegulatoryStatus;
  coveredJurisdictions: GRIFJurisdictionCode[];
  complianceScore: number;
  zkProof?: boolean;
}

export interface AuditFilters {
  status?: AuditRecord['status'];
  auditType?: string;
  jurisdiction?: GRIFJurisdictionCode;
  auditor?: string;
}

export interface AttestationFilters {
  type?: AttestationType;
  issuer?: string;
  jurisdiction?: GRIFJurisdictionCode;
  verified?: boolean;
  expiredAfter?: Date;
}

// ============================================================================
// Audit & Attestation Layer Implementation
// ============================================================================

export class AuditAttestationLayer {
  private readonly _config: AuditAttestationConfig;
  private audits: Map<string, AuditRecord> = new Map();
  private attestations: Map<string, Attestation> = new Map();
  private eventListeners: GRIFEventCallback[] = [];

  get config(): AuditAttestationConfig {
    return this._config;
  }

  constructor(config: AuditAttestationConfig = {}) {
    this._config = { ...DEFAULT_AUDIT_CONFIG, ...config };
  }

  // ============================================================================
  // Audit Management
  // ============================================================================

  scheduleAudit(params: ScheduleAuditParams): AuditRecord {
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const audit: AuditRecord = {
      id,
      auditType: params.auditType,
      auditor: params.auditor,
      scope: params.scope,
      jurisdiction: params.jurisdiction,
      startDate: params.startDate,
      status: 'scheduled',
      findings: [],
      createdAt: new Date(),
    };
    this.audits.set(id, audit);
    this.emitEvent({
      type: 'audit_completed',
      timestamp: new Date(),
      data: { action: 'scheduled', auditId: id, auditor: params.auditor },
    });
    return audit;
  }

  startAudit(auditId: string): AuditRecord {
    const audit = this.getAuditOrThrow(auditId);
    if (audit.status !== 'scheduled') {
      throw new Error(`Audit ${auditId} cannot be started (status: ${audit.status})`);
    }
    const updated: AuditRecord = { ...audit, status: 'in_progress' };
    this.audits.set(auditId, updated);
    return updated;
  }

  completeAudit(params: CompleteAuditParams): AuditRecord {
    const audit = this.getAuditOrThrow(params.auditId);
    if (audit.status !== 'in_progress') {
      throw new Error(`Audit ${params.auditId} is not in progress (status: ${audit.status})`);
    }

    const findings: AuditFinding[] = params.findings.map((f) => ({ ...f, resolved: false }));
    const updated: AuditRecord = {
      ...audit,
      status: 'completed',
      findings,
      reportUrl: params.reportUrl,
      completedAt: new Date(),
      endDate: new Date(),
    };
    this.audits.set(params.auditId, updated);

    this.emitEvent({
      type: 'audit_completed',
      timestamp: new Date(),
      data: {
        auditId: params.auditId,
        status: 'completed',
        findingCount: findings.length,
        criticalFindings: findings.filter((f) => f.severity === 'critical').length,
      },
    });

    return updated;
  }

  resolveAuditFinding(auditId: string, findingIndex: number): AuditRecord {
    const audit = this.getAuditOrThrow(auditId);
    if (findingIndex < 0 || findingIndex >= audit.findings.length) {
      throw new Error(`Finding index ${findingIndex} out of range`);
    }
    const findings = audit.findings.map((f, i) =>
      i === findingIndex ? { ...f, resolved: true } : f
    );
    const updated = { ...audit, findings };
    this.audits.set(auditId, updated);
    return updated;
  }

  getAudit(id: string): AuditRecord | undefined {
    return this.audits.get(id);
  }

  listAudits(filters?: AuditFilters): AuditRecord[] {
    let records = Array.from(this.audits.values());
    if (filters?.status) records = records.filter((a) => a.status === filters.status);
    if (filters?.auditType) records = records.filter((a) => a.auditType === filters.auditType);
    if (filters?.jurisdiction) records = records.filter((a) => a.jurisdiction === filters.jurisdiction);
    if (filters?.auditor) records = records.filter((a) => a.auditor === filters.auditor);
    return records;
  }

  // ============================================================================
  // Attestations
  // ============================================================================

  issueProofOfReserve(params: IssueProofOfReserveParams): ProofOfReserveAttestation {
    const id = `att-por-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const data: Record<string, unknown> = {
      reserveAmount: params.reserveAmount,
      currency: params.currency,
      chain: params.chain ?? 'ton',
    };

    const merkleRoot = this.computeMerkleRoot(data);
    const hashData = { ...data, merkleRoot };
    const proofHash = this.computeProofHash({ id, type: 'proof_of_reserve', data: hashData });
    const expiresAt = this.computeExpiry();

    const attestation: ProofOfReserveAttestation = {
      id,
      type: 'proof_of_reserve',
      issuer: params.issuer,
      subject: 'treasury_reserves',
      jurisdiction: params.jurisdiction,
      data: hashData,
      proofHash,
      issuedAt: new Date(),
      expiresAt,
      verified: true,
      reserveAmount: params.reserveAmount,
      currency: params.currency,
      merkleRoot,
      chain: params.chain,
      zkProof: params.zkProof ? this.generateZkProof(data) : undefined,
    };

    this.attestations.set(id, attestation);
    this.emitEvent({
      type: 'attestation_issued',
      timestamp: new Date(),
      data: { attestationId: id, type: 'proof_of_reserve', issuer: params.issuer },
    });

    return attestation;
  }

  issueRiskAttestation(params: IssueRiskAttestationParams): RiskAttestation {
    const id = `att-risk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const riskLevel = this.scoreToRiskLevel(params.riskScore);
    const data: Record<string, unknown> = {
      riskScore: params.riskScore,
      riskLevel,
      riskFactors: params.riskFactors,
      methodology: params.assessmentMethodology,
    };

    const proofHash = this.computeProofHash({ id, type: 'risk_attestation', data });

    const attestation: RiskAttestation = {
      id,
      type: 'risk_attestation',
      issuer: params.issuer,
      subject: params.subject,
      jurisdiction: params.jurisdiction,
      data,
      proofHash,
      issuedAt: new Date(),
      expiresAt: this.computeExpiry(),
      verified: true,
      riskScore: params.riskScore,
      riskLevel,
      riskFactors: params.riskFactors,
      assessmentMethodology: params.assessmentMethodology,
    };

    this.attestations.set(id, attestation);
    this.emitEvent({
      type: 'attestation_issued',
      timestamp: new Date(),
      data: { attestationId: id, type: 'risk_attestation', riskLevel },
    });

    return attestation;
  }

  issueComplianceAttestation(params: IssueComplianceAttestationParams): ComplianceAttestation {
    const id = `att-comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const data: Record<string, unknown> = {
      complianceFramework: params.complianceFramework,
      regulatoryStatus: params.regulatoryStatus,
      coveredJurisdictions: params.coveredJurisdictions,
      complianceScore: params.complianceScore,
    };

    const proofHash = this.computeProofHash({ id, type: 'compliance_attestation', data });

    const attestation: ComplianceAttestation = {
      id,
      type: 'compliance_attestation',
      issuer: params.issuer,
      subject: params.subject,
      data,
      proofHash,
      issuedAt: new Date(),
      expiresAt: this.computeExpiry(),
      verified: true,
      complianceFramework: params.complianceFramework,
      regulatoryStatus: params.regulatoryStatus,
      coveredJurisdictions: params.coveredJurisdictions,
      complianceScore: params.complianceScore,
      zkProof: params.zkProof ? this.generateZkProof(data) : undefined,
    };

    this.attestations.set(id, attestation);
    this.emitEvent({
      type: 'attestation_issued',
      timestamp: new Date(),
      data: {
        attestationId: id,
        type: 'compliance_attestation',
        regulatoryStatus: params.regulatoryStatus,
        complianceScore: params.complianceScore,
      },
    });

    return attestation;
  }

  verifyAttestation(id: string): boolean {
    const att = this.attestations.get(id);
    if (!att) return false;
    if (att.expiresAt && att.expiresAt < new Date()) return false;
    // Re-compute proof hash and verify
    const expectedHash = this.computeProofHash({ id, type: att.type, data: att.data });
    return att.proofHash === expectedHash;
  }

  getAttestation(id: string): Attestation | undefined {
    return this.attestations.get(id);
  }

  listAttestations(filters?: AttestationFilters): Attestation[] {
    let atts = Array.from(this.attestations.values());
    if (filters?.type) atts = atts.filter((a) => a.type === filters.type);
    if (filters?.issuer) atts = atts.filter((a) => a.issuer === filters.issuer);
    if (filters?.jurisdiction) atts = atts.filter((a) => a.jurisdiction === filters.jurisdiction);
    if (filters?.verified !== undefined) atts = atts.filter((a) => a.verified === filters.verified);
    if (filters?.expiredAfter) {
      atts = atts.filter((a) => !a.expiresAt || a.expiresAt > filters.expiredAfter!);
    }
    return atts;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: GRIFEventCallback): void {
    this.eventListeners.push(callback);
  }

  private emitEvent(event: GRIFEvent): void {
    this.eventListeners.forEach((cb) => cb(event));
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getAuditOrThrow(id: string): AuditRecord {
    const audit = this.audits.get(id);
    if (!audit) throw new Error(`Audit ${id} not found`);
    return audit;
  }

  private computeMerkleRoot(data: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private computeProofHash(input: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex');
  }

  private generateZkProof(data: Record<string, unknown>): string {
    // Placeholder for actual ZK proof generation (e.g., using circom/snarkjs)
    return `zk_proof_${createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16)}`;
  }

  private computeExpiry(): Date {
    const d = new Date();
    d.setDate(d.getDate() + (this._config.attestationTtlDays ?? 90));
    return d;
  }

  private scoreToRiskLevel(score: number): GRIFRiskLevel {
    if (score <= 25) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'critical';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAuditAttestationLayer(
  config?: AuditAttestationConfig
): AuditAttestationLayer {
  return new AuditAttestationLayer(config);
}
