/**
 * TONAIAgent - RWA Tokenization Framework
 *
 * On-chain representation of off-chain assets, legal and compliance mapping,
 * asset-backed token standards, proof of reserves, audit trails, and
 * custodian integrations.
 */

import {
  RWAAsset,
  RWAAssetClass,
  TokenizationStatus,
  TokenizationRequest,
  TokenizationResult,
  LegalDocument,
  AuditReport,
  ProofOfReserves,
  ReserveBreakdown,
  TokenizationConfig,
  RWAEvent,
  RWAEventCallback,
} from './types';

// ============================================================================
// Tokenization Manager Interface
// ============================================================================

export interface TokenizationManager {
  readonly config: TokenizationConfig;

  // Asset management
  tokenizeAsset(request: TokenizationRequest): Promise<TokenizationResult>;
  getAsset(assetId: string): RWAAsset | undefined;
  listAssets(filters?: AssetFilters): RWAAsset[];
  updateAsset(assetId: string, updates: Partial<RWAAsset>): Promise<RWAAsset>;
  suspendAsset(assetId: string, reason: string): Promise<void>;
  reactivateAsset(assetId: string): Promise<void>;

  // Legal documents
  addLegalDocument(assetId: string, document: Omit<LegalDocument, 'id' | 'uploadedAt'>): Promise<LegalDocument>;
  getLegalDocuments(assetId: string): LegalDocument[];
  verifyDocument(documentId: string): Promise<boolean>;

  // Audit and compliance
  addAuditReport(assetId: string, report: Omit<AuditReport, 'id'>): Promise<AuditReport>;
  getAuditReports(assetId: string): AuditReport[];
  updateProofOfReserves(assetId: string, proof: Omit<ProofOfReserves, 'assetId'>): Promise<ProofOfReserves>;
  getProofOfReserves(assetId: string): ProofOfReserves | undefined;

  // Lifecycle
  activateAsset(assetId: string): Promise<void>;
  redeemAsset(assetId: string, amount: number): Promise<void>;
  updatePrice(assetId: string, newPrice: number): Promise<void>;
  distributeYield(assetId: string): Promise<YieldDistributionResult>;

  // Events
  onEvent(callback: RWAEventCallback): void;
}

export interface AssetFilters {
  assetClass?: RWAAssetClass[];
  status?: TokenizationStatus[];
  jurisdiction?: string[];
  minYield?: number;
  maxYield?: number;
  minValue?: number;
  maxValue?: number;
  issuer?: string;
}

export interface YieldDistributionResult {
  assetId: string;
  distributedAt: Date;
  totalDistributed: number;
  recipientCount: number;
  perTokenAmount: number;
}

// ============================================================================
// Default Tokenization Manager
// ============================================================================

export class DefaultTokenizationManager implements TokenizationManager {
  private _config: TokenizationConfig;
  private readonly assets: Map<string, RWAAsset> = new Map();
  private readonly eventCallbacks: RWAEventCallback[] = [];

  constructor(config?: Partial<TokenizationConfig>) {
    this._config = {
      requireAuditBeforeActivation: true,
      proofOfReservesFrequency: 'daily',
      auditRefreshDays: 90,
      supportedJurisdictions: ['US', 'EU', 'UK', 'SG', 'CH'],
      ...config,
    };
  }

  get config(): TokenizationConfig {
    return { ...this._config };
  }

  async tokenizeAsset(request: TokenizationRequest): Promise<TokenizationResult> {
    const assetId = this.generateId('asset');

    const asset: RWAAsset = {
      id: assetId,
      name: request.name,
      symbol: request.symbol,
      assetClass: request.assetClass,
      description: request.description,
      issuer: request.issuer,
      custodian: request.custodian,
      jurisdiction: request.jurisdiction,
      totalSupply: request.tokenSupply,
      circulatingSupply: 0,
      faceValue: request.totalValue / request.tokenSupply,
      currentPrice: request.totalValue / request.tokenSupply,
      currency: request.currency,
      maturityDate: request.maturityDate,
      yieldRate: request.yieldRate,
      status: 'draft',
      legalDocuments: [],
      auditReports: [],
      metadata: request.metadata ?? {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add initial legal documents if provided
    if (request.legalDocuments) {
      for (const doc of request.legalDocuments) {
        const document: LegalDocument = {
          ...doc,
          id: this.generateId('doc'),
          uploadedAt: new Date(),
        };
        asset.legalDocuments.push(document);
      }
    }

    this.assets.set(assetId, asset);

    // Determine next steps
    const nextSteps: string[] = ['Submit legal documents for review'];
    if (this._config.requireAuditBeforeActivation) {
      nextSteps.push('Schedule independent audit');
    }
    nextSteps.push('Set up proof of reserves verification');
    nextSteps.push('Complete compliance review');

    this.emitEvent('info', 'tokenization', `Asset tokenization initiated: ${request.name}`, {
      assetId,
      assetClass: request.assetClass,
    });

    // Move to pending_legal status
    asset.status = 'pending_legal';
    asset.updatedAt = new Date();

    return {
      assetId,
      status: 'pending_legal',
      estimatedActivationDate: this.estimateActivationDate(request),
      nextSteps,
    };
  }

  getAsset(assetId: string): RWAAsset | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;
    return this.cloneAsset(asset);
  }

  listAssets(filters?: AssetFilters): RWAAsset[] {
    let assets = Array.from(this.assets.values());

    if (filters) {
      if (filters.assetClass?.length) {
        assets = assets.filter(a => filters.assetClass!.includes(a.assetClass));
      }
      if (filters.status?.length) {
        assets = assets.filter(a => filters.status!.includes(a.status));
      }
      if (filters.jurisdiction?.length) {
        assets = assets.filter(a => filters.jurisdiction!.includes(a.jurisdiction));
      }
      if (filters.minYield !== undefined) {
        assets = assets.filter(a => (a.yieldRate ?? 0) >= filters.minYield!);
      }
      if (filters.maxYield !== undefined) {
        assets = assets.filter(a => (a.yieldRate ?? Infinity) <= filters.maxYield!);
      }
      if (filters.minValue !== undefined) {
        assets = assets.filter(a => a.currentPrice * a.circulatingSupply >= filters.minValue!);
      }
      if (filters.maxValue !== undefined) {
        assets = assets.filter(a => a.currentPrice * a.circulatingSupply <= filters.maxValue!);
      }
      if (filters.issuer) {
        assets = assets.filter(a => a.issuer === filters.issuer);
      }
    }

    return assets.map(a => this.cloneAsset(a));
  }

  async updateAsset(assetId: string, updates: Partial<RWAAsset>): Promise<RWAAsset> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    // Prevent updating immutable fields
    const { id, createdAt, ...allowedUpdates } = updates as Partial<RWAAsset> & { id?: string; createdAt?: Date };

    Object.assign(asset, allowedUpdates);
    asset.updatedAt = new Date();

    this.emitEvent('info', 'tokenization', `Asset updated: ${asset.name}`, { assetId });

    return this.cloneAsset(asset);
  }

  async suspendAsset(assetId: string, reason: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    asset.status = 'suspended';
    asset.updatedAt = new Date();
    asset.metadata = { ...asset.metadata, suspensionReason: reason, suspendedAt: new Date() };

    this.emitEvent('warning', 'tokenization', `Asset suspended: ${asset.name} - ${reason}`, { assetId, reason });
  }

  async reactivateAsset(assetId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (asset.status !== 'suspended') {
      throw new Error(`Asset is not suspended: ${assetId}`);
    }

    asset.status = 'active';
    asset.updatedAt = new Date();

    this.emitEvent('info', 'tokenization', `Asset reactivated: ${asset.name}`, { assetId });
  }

  async addLegalDocument(
    assetId: string,
    document: Omit<LegalDocument, 'id' | 'uploadedAt'>
  ): Promise<LegalDocument> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const newDoc: LegalDocument = {
      ...document,
      id: this.generateId('doc'),
      uploadedAt: new Date(),
    };

    asset.legalDocuments.push(newDoc);
    asset.updatedAt = new Date();

    // Check if we should move from draft to pending_legal
    if (asset.status === 'draft') {
      asset.status = 'pending_legal';
    }

    this.emitEvent('info', 'tokenization', `Legal document added: ${document.type}`, {
      assetId,
      documentId: newDoc.id,
      documentType: document.type,
    });

    return { ...newDoc };
  }

  getLegalDocuments(assetId: string): LegalDocument[] {
    const asset = this.assets.get(assetId);
    if (!asset) return [];
    return asset.legalDocuments.map(d => ({ ...d }));
  }

  async verifyDocument(documentId: string): Promise<boolean> {
    // Simulate document verification
    for (const asset of this.assets.values()) {
      const doc = asset.legalDocuments.find(d => d.id === documentId);
      if (doc) {
        // In a real implementation, this would verify the hash against a registry
        this.emitEvent('info', 'tokenization', `Document verified: ${documentId}`, { documentId });
        return true;
      }
    }
    return false;
  }

  async addAuditReport(
    assetId: string,
    report: Omit<AuditReport, 'id'>
  ): Promise<AuditReport> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const newReport: AuditReport = {
      ...report,
      id: this.generateId('audit'),
    };

    asset.auditReports.push(newReport);
    asset.updatedAt = new Date();

    // Check if we should move to pending_audit -> ready for activation
    if (asset.status === 'pending_audit' && report.reportType === 'compliance') {
      asset.status = 'pending_legal'; // Move back for final legal review
    }

    this.emitEvent('info', 'tokenization', `Audit report added: ${report.reportType}`, {
      assetId,
      reportId: newReport.id,
      auditor: report.auditor,
    });

    return { ...newReport };
  }

  getAuditReports(assetId: string): AuditReport[] {
    const asset = this.assets.get(assetId);
    if (!asset) return [];
    return asset.auditReports.map(r => ({ ...r }));
  }

  async updateProofOfReserves(
    assetId: string,
    proof: Omit<ProofOfReserves, 'assetId'>
  ): Promise<ProofOfReserves> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const newProof: ProofOfReserves = {
      ...proof,
      assetId,
    };

    asset.proofOfReserves = newProof;
    asset.updatedAt = new Date();

    this.emitEvent('info', 'tokenization', `Proof of reserves updated for ${asset.name}`, {
      assetId,
      collateralizationRatio: proof.collateralizationRatio,
    });

    return { ...newProof };
  }

  getProofOfReserves(assetId: string): ProofOfReserves | undefined {
    const asset = this.assets.get(assetId);
    if (!asset?.proofOfReserves) return undefined;
    return { ...asset.proofOfReserves };
  }

  async activateAsset(assetId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    // Validate prerequisites
    if (asset.legalDocuments.length === 0) {
      throw new Error('Cannot activate asset without legal documents');
    }

    if (this._config.requireAuditBeforeActivation && asset.auditReports.length === 0) {
      throw new Error('Cannot activate asset without audit reports');
    }

    if (!asset.proofOfReserves) {
      throw new Error('Cannot activate asset without proof of reserves');
    }

    if (asset.proofOfReserves.collateralizationRatio < 1.0) {
      throw new Error(`Insufficient collateralization: ${asset.proofOfReserves.collateralizationRatio}`);
    }

    asset.status = 'active';
    asset.circulatingSupply = asset.totalSupply;
    asset.updatedAt = new Date();

    this.emitEvent('info', 'tokenization', `Asset activated: ${asset.name}`, {
      assetId,
      totalSupply: asset.totalSupply,
    });
  }

  async redeemAsset(assetId: string, amount: number): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (asset.status !== 'active') {
      throw new Error(`Asset is not active: ${assetId}`);
    }

    if (amount > asset.circulatingSupply) {
      throw new Error(`Redemption amount exceeds circulating supply`);
    }

    asset.circulatingSupply -= amount;
    asset.updatedAt = new Date();

    if (asset.circulatingSupply === 0) {
      asset.status = 'redeemed';
    }

    this.emitEvent('info', 'tokenization', `Asset redeemed: ${amount} tokens of ${asset.name}`, {
      assetId,
      amount,
      remainingSupply: asset.circulatingSupply,
    });
  }

  async updatePrice(assetId: string, newPrice: number): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const oldPrice = asset.currentPrice;
    asset.currentPrice = newPrice;
    asset.updatedAt = new Date();

    const priceChange = (newPrice - oldPrice) / oldPrice;

    this.emitEvent('info', 'tokenization', `Price updated for ${asset.name}`, {
      assetId,
      oldPrice,
      newPrice,
      changePercent: priceChange * 100,
    });
  }

  async distributeYield(assetId: string): Promise<YieldDistributionResult> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (!asset.yieldRate) {
      throw new Error(`Asset has no yield rate: ${assetId}`);
    }

    // Calculate daily yield
    const dailyYieldRate = asset.yieldRate / 365;
    const totalValue = asset.currentPrice * asset.circulatingSupply;
    const totalDistributed = totalValue * dailyYieldRate;
    const perTokenAmount = asset.circulatingSupply > 0 ? totalDistributed / asset.circulatingSupply : 0;

    const result: YieldDistributionResult = {
      assetId,
      distributedAt: new Date(),
      totalDistributed,
      recipientCount: asset.circulatingSupply, // One per token (simplified)
      perTokenAmount,
    };

    this.emitEvent('info', 'tokenization', `Yield distributed for ${asset.name}`, {
      assetId,
      totalDistributed,
      perTokenAmount,
    });

    return result;
  }

  onEvent(callback: RWAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateActivationDate(request: TokenizationRequest): Date {
    // Estimate based on complexity
    const baseDays = 14; // 2 weeks minimum
    const legalDays = request.legalDocuments ? 7 : 21; // Extra time if no docs
    const auditDays = this._config.requireAuditBeforeActivation ? 14 : 0;

    const totalDays = baseDays + legalDays + auditDays;
    const date = new Date();
    date.setDate(date.getDate() + totalDays);
    return date;
  }

  private cloneAsset(asset: RWAAsset): RWAAsset {
    return {
      ...asset,
      legalDocuments: asset.legalDocuments.map(d => ({ ...d })),
      auditReports: asset.auditReports.map(r => ({ ...r })),
      proofOfReserves: asset.proofOfReserves ? { ...asset.proofOfReserves } : undefined,
    };
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: RWAEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'asset_tokenized',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

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

export function createTokenizationManager(
  config?: Partial<TokenizationConfig>
): DefaultTokenizationManager {
  return new DefaultTokenizationManager(config);
}
