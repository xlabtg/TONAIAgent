/**
 * TONAIAgent - GRIF Structured Regulatory Dialogue Framework
 *
 * Manages the non-technical bridge between protocol and regulators:
 * - Whitepaper disclosures
 * - Risk reports
 * - Governance transparency documents
 * - Institutional presentations
 * - Regulator engagement tracking
 *
 * This is Component 6 of the Global Regulatory Integration Framework (GRIF).
 */

import {
  RegulatoryDocument,
  DialogueType,
  RegulatorEngagement,
  GRIFJurisdictionCode,
  GRIFEvent,
  GRIFEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_DIALOGUE_CONFIG: RegulatoryDialogueConfig = {
  enabled: true,
  autoPublish: false,
  retentionYears: 10,
  defaultAudience: ['regulators', 'institutions'],
};

// ============================================================================
// Interface
// ============================================================================

export interface RegulatoryDialogueConfig {
  enabled?: boolean;
  autoPublish?: boolean;
  retentionYears?: number;
  defaultAudience?: ('regulators' | 'institutions' | 'public')[];
}

export interface CreateDocumentParams {
  type: DialogueType;
  title: string;
  content: string;
  version?: string;
  targetAudience?: ('regulators' | 'institutions' | 'public')[];
  jurisdiction?: GRIFJurisdictionCode;
}

export interface UpdateDocumentParams {
  documentId: string;
  title?: string;
  content?: string;
  version?: string;
}

export interface RecordEngagementParams {
  regulatorName: string;
  jurisdiction: GRIFJurisdictionCode;
  engagementType: RegulatorEngagement['engagementType'];
  description: string;
  documents?: string[];
}

export interface UpdateEngagementParams {
  engagementId: string;
  status?: RegulatorEngagement['status'];
  notes?: string;
  documents?: string[];
}

export interface DocumentFilters {
  type?: DialogueType;
  jurisdiction?: GRIFJurisdictionCode;
  status?: RegulatoryDocument['status'];
}

export interface EngagementFilters {
  jurisdiction?: GRIFJurisdictionCode;
  status?: RegulatorEngagement['status'];
  engagementType?: RegulatorEngagement['engagementType'];
}

// ============================================================================
// Regulatory Dialogue Framework Implementation
// ============================================================================

export class RegulatoryDialogueFramework {
  private readonly _config: RegulatoryDialogueConfig;
  private documents: Map<string, RegulatoryDocument> = new Map();
  private engagements: Map<string, RegulatorEngagement> = new Map();
  private eventListeners: GRIFEventCallback[] = [];

  get config(): RegulatoryDialogueConfig {
    return this._config;
  }

  constructor(config: RegulatoryDialogueConfig = {}) {
    this._config = { ...DEFAULT_DIALOGUE_CONFIG, ...config };
    this.initializeDefaultDocuments();
  }

  // ============================================================================
  // Document Management
  // ============================================================================

  createDocument(params: CreateDocumentParams): RegulatoryDocument {
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const doc: RegulatoryDocument = {
      id,
      type: params.type,
      title: params.title,
      version: params.version ?? '1.0.0',
      targetAudience: params.targetAudience ?? this._config.defaultAudience ?? ['regulators'],
      jurisdiction: params.jurisdiction,
      content: params.content,
      status: this._config.autoPublish ? 'published' : 'draft',
      publishedAt: this._config.autoPublish ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.documents.set(id, doc);
    this.emitEvent({
      type: 'engagement_updated',
      timestamp: new Date(),
      data: {
        action: 'document_created',
        documentId: id,
        type: params.type,
        status: doc.status,
      },
    });
    return doc;
  }

  updateDocument(params: UpdateDocumentParams): RegulatoryDocument {
    const doc = this.getDocumentOrThrow(params.documentId);
    if (doc.status === 'archived') {
      throw new Error(`Document ${params.documentId} is archived and cannot be updated`);
    }
    const updated: RegulatoryDocument = {
      ...doc,
      title: params.title ?? doc.title,
      content: params.content ?? doc.content,
      version: params.version ?? doc.version,
      status: 'review',
      updatedAt: new Date(),
    };
    this.documents.set(params.documentId, updated);
    return updated;
  }

  publishDocument(documentId: string): RegulatoryDocument {
    const doc = this.getDocumentOrThrow(documentId);
    if (!['draft', 'review'].includes(doc.status)) {
      throw new Error(`Document ${documentId} cannot be published (status: ${doc.status})`);
    }
    const updated: RegulatoryDocument = {
      ...doc,
      status: 'published',
      publishedAt: new Date(),
      updatedAt: new Date(),
    };
    this.documents.set(documentId, updated);
    this.emitEvent({
      type: 'engagement_updated',
      timestamp: new Date(),
      data: { action: 'document_published', documentId, type: doc.type },
    });
    return updated;
  }

  archiveDocument(documentId: string): RegulatoryDocument {
    const doc = this.getDocumentOrThrow(documentId);
    const updated: RegulatoryDocument = { ...doc, status: 'archived', updatedAt: new Date() };
    this.documents.set(documentId, updated);
    return updated;
  }

  getDocument(id: string): RegulatoryDocument | undefined {
    return this.documents.get(id);
  }

  listDocuments(filters?: DocumentFilters): RegulatoryDocument[] {
    let docs = Array.from(this.documents.values());
    if (filters?.type) docs = docs.filter((d) => d.type === filters.type);
    if (filters?.jurisdiction) docs = docs.filter((d) => d.jurisdiction === filters.jurisdiction);
    if (filters?.status) docs = docs.filter((d) => d.status === filters.status);
    return docs;
  }

  // ============================================================================
  // Regulator Engagement Tracking
  // ============================================================================

  recordEngagement(params: RecordEngagementParams): RegulatorEngagement {
    const id = `eng-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const engagement: RegulatorEngagement = {
      id,
      regulatorName: params.regulatorName,
      jurisdiction: params.jurisdiction,
      engagementType: params.engagementType,
      status: 'pending',
      description: params.description,
      documents: params.documents ?? [],
      startedAt: new Date(),
    };
    this.engagements.set(id, engagement);
    this.emitEvent({
      type: 'engagement_updated',
      timestamp: new Date(),
      data: {
        action: 'engagement_recorded',
        engagementId: id,
        regulator: params.regulatorName,
        jurisdiction: params.jurisdiction,
        type: params.engagementType,
      },
    });
    return engagement;
  }

  updateEngagement(params: UpdateEngagementParams): RegulatorEngagement {
    const eng = this.getEngagementOrThrow(params.engagementId);
    const updated: RegulatorEngagement = {
      ...eng,
      status: params.status ?? eng.status,
      notes: params.notes ?? eng.notes,
      documents: params.documents ? [...eng.documents, ...params.documents] : eng.documents,
      resolvedAt:
        params.status === 'resolved' || params.status === 'closed' ? new Date() : eng.resolvedAt,
    };
    this.engagements.set(params.engagementId, updated);
    this.emitEvent({
      type: 'engagement_updated',
      timestamp: new Date(),
      data: {
        action: 'engagement_updated',
        engagementId: params.engagementId,
        status: updated.status,
      },
    });
    return updated;
  }

  getEngagement(id: string): RegulatorEngagement | undefined {
    return this.engagements.get(id);
  }

  listEngagements(filters?: EngagementFilters): RegulatorEngagement[] {
    let engs = Array.from(this.engagements.values());
    if (filters?.jurisdiction) engs = engs.filter((e) => e.jurisdiction === filters.jurisdiction);
    if (filters?.status) engs = engs.filter((e) => e.status === filters.status);
    if (filters?.engagementType) {
      engs = engs.filter((e) => e.engagementType === filters.engagementType);
    }
    return engs;
  }

  // ============================================================================
  // Regulatory Readiness Report
  // ============================================================================

  getRegulatoryReadinessReport(): {
    documentCoverage: Record<DialogueType, number>;
    openEngagements: number;
    resolvedEngagements: number;
    publishedDocuments: number;
    jurisdictionsCovered: GRIFJurisdictionCode[];
  } {
    const docs = Array.from(this.documents.values());
    const engs = Array.from(this.engagements.values());

    const documentCoverage: Partial<Record<DialogueType, number>> = {};
    const types: DialogueType[] = [
      'whitepaper_disclosure',
      'risk_report',
      'governance_transparency',
      'institutional_presentation',
      'regulatory_inquiry',
    ];
    for (const t of types) {
      documentCoverage[t] = docs.filter((d) => d.type === t && d.status === 'published').length;
    }

    const jurisdictionSet = new Set<GRIFJurisdictionCode>();
    for (const eng of engs) {
      jurisdictionSet.add(eng.jurisdiction);
    }
    for (const doc of docs) {
      if (doc.jurisdiction) jurisdictionSet.add(doc.jurisdiction);
    }

    return {
      documentCoverage: documentCoverage as Record<DialogueType, number>,
      openEngagements: engs.filter((e) => e.status === 'active' || e.status === 'pending').length,
      resolvedEngagements: engs.filter((e) => e.status === 'resolved' || e.status === 'closed')
        .length,
      publishedDocuments: docs.filter((d) => d.status === 'published').length,
      jurisdictionsCovered: Array.from(jurisdictionSet),
    };
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

  private getDocumentOrThrow(id: string): RegulatoryDocument {
    const doc = this.documents.get(id);
    if (!doc) throw new Error(`Document ${id} not found`);
    return doc;
  }

  private getEngagementOrThrow(id: string): RegulatorEngagement {
    const eng = this.engagements.get(id);
    if (!eng) throw new Error(`Engagement ${id} not found`);
    return eng;
  }

  private initializeDefaultDocuments(): void {
    // Seed with framework overview document
    const overview: RegulatoryDocument = {
      id: 'doc-grif-overview',
      type: 'whitepaper_disclosure',
      title: 'Global Regulatory Integration Framework Overview',
      version: '1.0.0',
      targetAudience: ['regulators', 'institutions', 'public'],
      content:
        'The GRIF enables the TONAIAgent protocol to operate as regulation-compatible infrastructure ' +
        'across jurisdictions. It provides jurisdiction-aware deployment, compliance module interfaces, ' +
        'regulatory transparency, audit & attestation, and structured regulatory dialogue.',
      status: 'published',
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.documents.set(overview.id, overview);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRegulatoryDialogueFramework(
  config?: RegulatoryDialogueConfig
): RegulatoryDialogueFramework {
  return new RegulatoryDialogueFramework(config);
}
