/**
 * SDACL Component 1 — CBDC Integration Interface
 *
 * Standardized interface for sovereign digital asset integration:
 * issuer verification, supply validation, jurisdiction rule enforcement,
 * cross-border settlement routing, and authority reporting.
 *
 * Supports CBDCs, sovereign tokenized bonds, and state-backed RWA instruments.
 */

import {
  SovereignAsset,
  SovereignAssetId,
  SovereignAssetType,
  AssetStatus,
  IssuerId,
  JurisdictionCode,
  IssuerVerificationResult,
  SupplyValidationResult,
  SettlementRoute,
  SettlementStatus,
  AuthorityReport,
  CBDCIntegrationStatus,
  SDACLEvent,
  SDACLEventCallback,
} from './types';

// ============================================================================
// CBDC Integration Interface (SovereignAssetModule)
// ============================================================================

export interface SovereignAssetModule {
  // Core interface methods (per issue specification)
  verifyIssuer(issuerId: IssuerId, jurisdictionCode: JurisdictionCode): IssuerVerificationResult;
  validateSupply(assetId: SovereignAssetId): SupplyValidationResult;
  enforceJurisdictionRules(assetId: SovereignAssetId, targetJurisdiction: JurisdictionCode): JurisdictionRuleEnforcement;
  routeSettlement(params: RouteSettlementParams): SettlementRoute;
  reportToAuthority(params: ReportToAuthorityParams): AuthorityReport;

  // Asset lifecycle management
  registerSovereignAsset(params: RegisterSovereignAssetParams): SovereignAsset;
  getSovereignAsset(assetId: SovereignAssetId): SovereignAsset | undefined;
  listSovereignAssets(filters?: SovereignAssetFilters): SovereignAsset[];
  updateAssetStatus(assetId: SovereignAssetId, status: AssetStatus): void;

  // Settlement management
  getSettlementRoute(settlementId: string): SettlementRoute | undefined;
  listSettlementRoutes(filters?: SettlementFilters): SettlementRoute[];
  finalizeSettlement(settlementId: string): SettlementRoute;

  // Reports
  getReport(reportId: string): AuthorityReport | undefined;
  listReports(issuerId?: IssuerId): AuthorityReport[];

  getComponentStatus(): CBDCIntegrationStatus;
  onEvent(callback: SDACLEventCallback): void;
}

export interface RegisterSovereignAssetParams {
  issuerId: IssuerId;
  issuerName: string;
  assetType: SovereignAssetType;
  symbol: string;
  name: string;
  jurisdictionCode: JurisdictionCode;
  totalSupply: number;
  reserveRatio: number;
  chainId: string;
  settlementChains?: string[];
  metadata?: Record<string, unknown>;
}

export interface RouteSettlementParams {
  assetId: SovereignAssetId;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  amount: number;
}

export interface ReportToAuthorityParams {
  assetId: SovereignAssetId;
  reportingIssuerId: IssuerId;
  reportType: AuthorityReport['reportType'];
  periodFrom: Date;
  periodTo: Date;
}

export interface JurisdictionRuleEnforcement {
  assetId: SovereignAssetId;
  targetJurisdiction: JurisdictionCode;
  allowed: boolean;
  appliedRules: string[];
  restrictions: string[];
  requiresAdditionalCompliance: boolean;
  checkedAt: Date;
}

export interface SovereignAssetFilters {
  assetType?: SovereignAssetType;
  jurisdictionCode?: JurisdictionCode;
  status?: AssetStatus;
  issuerId?: IssuerId;
}

export interface SettlementFilters {
  assetId?: SovereignAssetId;
  sourceJurisdiction?: JurisdictionCode;
  destinationJurisdiction?: JurisdictionCode;
  status?: SettlementStatus;
}

// ============================================================================
// Verified Issuer Registry (known sovereign issuers)
// ============================================================================

const KNOWN_SOVEREIGN_ISSUERS: Record<string, { type: IssuerVerificationResult['issuerType']; rating: string; score: number }> = {
  ECB: { type: 'central_bank', rating: 'AAA', score: 98 },
  FED: { type: 'central_bank', rating: 'AAA', score: 97 },
  BOE: { type: 'central_bank', rating: 'AA+', score: 96 },
  PBC: { type: 'central_bank', rating: 'A+', score: 88 },
  RBI: { type: 'central_bank', rating: 'BBB-', score: 75 },
  BIS: { type: 'central_bank', rating: 'AAA', score: 99 },
  IMF: { type: 'state_entity', rating: 'AAA', score: 99 },
  US_TREASURY: { type: 'treasury', rating: 'AA+', score: 96 },
  UK_DMO: { type: 'treasury', rating: 'AA-', score: 93 },
  EU_COMMISSION: { type: 'state_entity', rating: 'AA+', score: 95 },
};

// ============================================================================
// Default CBDC Integration Manager
// ============================================================================

export class DefaultCBDCIntegrationManager implements SovereignAssetModule {
  private readonly assets: Map<SovereignAssetId, SovereignAsset> = new Map();
  private readonly settlements: Map<string, SettlementRoute> = new Map();
  private readonly reports: Map<string, AuthorityReport> = new Map();
  private readonly eventCallbacks: SDACLEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  verifyIssuer(issuerId: IssuerId, jurisdictionCode: JurisdictionCode): IssuerVerificationResult {
    const known = KNOWN_SOVEREIGN_ISSUERS[issuerId.toUpperCase()];
    const verified = !!known;

    const result: IssuerVerificationResult = {
      issuerId,
      verified,
      issuerType: known?.type ?? 'state_entity',
      jurisdictionCode,
      creditRating: known?.rating,
      baisScorecard: known?.score,
      verifiedAt: new Date(),
      reason: verified ? undefined : `Issuer ${issuerId} not found in sovereign registry`,
    };

    this.emitEvent('issuer_verified', 1, {
      issuerId,
      verified,
      jurisdictionCode,
      creditRating: result.creditRating,
    });

    return result;
  }

  validateSupply(assetId: SovereignAssetId): SupplyValidationResult {
    const asset = this.assets.get(assetId);
    if (!asset) {
      return {
        assetId,
        valid: false,
        reportedSupply: 0,
        verifiedSupply: 0,
        reserveRatio: 0,
        reserveAdequate: false,
        validatedAt: new Date(),
        reason: `Asset ${assetId} not found`,
      };
    }

    const reserveAdequate = asset.reserveRatio >= 0.8;
    const valid = asset.circulatingSupply <= asset.totalSupply && reserveAdequate;

    const result: SupplyValidationResult = {
      assetId,
      valid,
      reportedSupply: asset.totalSupply,
      verifiedSupply: asset.circulatingSupply,
      reserveRatio: asset.reserveRatio,
      reserveAdequate,
      validatedAt: new Date(),
      reason: !valid
        ? reserveAdequate
          ? 'Circulating supply exceeds total supply'
          : `Reserve ratio ${asset.reserveRatio} below required 0.8`
        : undefined,
    };

    this.emitEvent('supply_validated', 1, {
      assetId,
      valid,
      reserveRatio: asset.reserveRatio,
    });

    return result;
  }

  enforceJurisdictionRules(assetId: SovereignAssetId, targetJurisdiction: JurisdictionCode): JurisdictionRuleEnforcement {
    const asset = this.assets.get(assetId);
    const appliedRules: string[] = [];
    const restrictions: string[] = [];
    let allowed = true;
    let requiresAdditionalCompliance = false;

    if (!asset) {
      return {
        assetId,
        targetJurisdiction,
        allowed: false,
        appliedRules: ['asset_existence_check'],
        restrictions: [`Asset ${assetId} not registered`],
        requiresAdditionalCompliance: false,
        checkedAt: new Date(),
      };
    }

    // Rule: Asset must be active
    appliedRules.push('asset_status_check');
    if (asset.status !== 'active') {
      allowed = false;
      restrictions.push(`Asset status is ${asset.status}`);
    }

    // Rule: Settlement chain must include the target jurisdiction chain
    appliedRules.push('settlement_chain_check');
    if (
      asset.settlementChains.length > 0 &&
      !asset.settlementChains.includes(targetJurisdiction) &&
      !asset.settlementChains.includes('*')
    ) {
      requiresAdditionalCompliance = true;
      restrictions.push(`Target jurisdiction ${targetJurisdiction} requires cross-chain settlement setup`);
    }

    // Rule: CBDC assets require matching jurisdiction
    appliedRules.push('cbdc_jurisdiction_check');
    if (asset.assetType === 'cbdc' && asset.jurisdictionCode !== targetJurisdiction) {
      requiresAdditionalCompliance = true;
      restrictions.push('Cross-jurisdiction CBDC transfer requires bilateral agreement');
    }

    return {
      assetId,
      targetJurisdiction,
      allowed,
      appliedRules,
      restrictions,
      requiresAdditionalCompliance,
      checkedAt: new Date(),
    };
  }

  routeSettlement(params: RouteSettlementParams): SettlementRoute {
    const { assetId, sourceJurisdiction, destinationJurisdiction, amount } = params;

    const isCrossBorder = sourceJurisdiction !== destinationJurisdiction;
    const routingPath = isCrossBorder
      ? [sourceJurisdiction, 'ton-bridge', destinationJurisdiction]
      : [sourceJurisdiction];

    const estimatedFeeBps = isCrossBorder ? 15 : 3;
    const estimatedSettlementMs = isCrossBorder ? 5000 : 1000;

    const route: SettlementRoute = {
      id: this.generateId('settlement'),
      assetId,
      sourceJurisdiction,
      destinationJurisdiction,
      amount,
      routingPath,
      estimatedFeeBps,
      estimatedSettlementMs,
      complianceChecked: true,
      status: 'routing',
      createdAt: new Date(),
    };

    this.settlements.set(route.id, route);

    this.emitEvent('settlement_routed', 1, {
      settlementId: route.id,
      assetId,
      sourceJurisdiction,
      destinationJurisdiction,
      amount,
    });

    return route;
  }

  reportToAuthority(params: ReportToAuthorityParams): AuthorityReport {
    const { assetId, reportingIssuerId, reportType, periodFrom, periodTo } = params;

    const relevantSettlements = Array.from(this.settlements.values()).filter(
      s => s.assetId === assetId &&
        s.createdAt >= periodFrom &&
        s.createdAt <= periodTo
    );

    const totalVolumeUsd = relevantSettlements.reduce((sum, s) => sum + s.amount, 0);
    const crossBorderVolume = relevantSettlements
      .filter(s => s.sourceJurisdiction !== s.destinationJurisdiction)
      .reduce((sum, s) => sum + s.amount, 0);

    const report: AuthorityReport = {
      id: this.generateId('report'),
      assetId,
      reportingIssuerId,
      reportType,
      period: { from: periodFrom, to: periodTo },
      totalSettlements: relevantSettlements.length,
      totalVolumeUsd,
      crossBorderVolume,
      complianceViolations: 0,
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);

    this.emitEvent('authority_report_generated', 1, {
      reportId: report.id,
      assetId,
      reportType,
      totalSettlements: report.totalSettlements,
    });

    return report;
  }

  registerSovereignAsset(params: RegisterSovereignAssetParams): SovereignAsset {
    const asset: SovereignAsset = {
      id: this.generateId('sovereign_asset'),
      issuerId: params.issuerId,
      issuerName: params.issuerName,
      assetType: params.assetType,
      symbol: params.symbol,
      name: params.name,
      jurisdictionCode: params.jurisdictionCode,
      totalSupply: params.totalSupply,
      circulatingSupply: params.totalSupply,
      reserveRatio: params.reserveRatio,
      status: 'active',
      chainId: params.chainId,
      settlementChains: params.settlementChains ?? [params.chainId],
      metadata: params.metadata ?? {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.assets.set(asset.id, asset);

    this.emitEvent('sovereign_asset_registered', 1, {
      assetId: asset.id,
      symbol: asset.symbol,
      assetType: asset.assetType,
      jurisdictionCode: asset.jurisdictionCode,
    });

    return asset;
  }

  getSovereignAsset(assetId: SovereignAssetId): SovereignAsset | undefined {
    return this.assets.get(assetId);
  }

  listSovereignAssets(filters?: SovereignAssetFilters): SovereignAsset[] {
    let result = Array.from(this.assets.values());
    if (filters?.assetType) result = result.filter(a => a.assetType === filters.assetType);
    if (filters?.jurisdictionCode) result = result.filter(a => a.jurisdictionCode === filters.jurisdictionCode);
    if (filters?.status) result = result.filter(a => a.status === filters.status);
    if (filters?.issuerId) result = result.filter(a => a.issuerId === filters.issuerId);
    return result;
  }

  updateAssetStatus(assetId: SovereignAssetId, status: AssetStatus): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Sovereign asset ${assetId} not found`);
    this.assets.set(assetId, { ...asset, status, updatedAt: new Date() });
  }

  getSettlementRoute(settlementId: string): SettlementRoute | undefined {
    return this.settlements.get(settlementId);
  }

  listSettlementRoutes(filters?: SettlementFilters): SettlementRoute[] {
    let result = Array.from(this.settlements.values());
    if (filters?.assetId) result = result.filter(s => s.assetId === filters.assetId);
    if (filters?.sourceJurisdiction) result = result.filter(s => s.sourceJurisdiction === filters.sourceJurisdiction);
    if (filters?.destinationJurisdiction) result = result.filter(s => s.destinationJurisdiction === filters.destinationJurisdiction);
    if (filters?.status) result = result.filter(s => s.status === filters.status);
    return result;
  }

  finalizeSettlement(settlementId: string): SettlementRoute {
    const route = this.settlements.get(settlementId);
    if (!route) throw new Error(`Settlement ${settlementId} not found`);

    const finalized: SettlementRoute = {
      ...route,
      status: 'settled',
      settledAt: new Date(),
    };
    this.settlements.set(settlementId, finalized);

    this.emitEvent('settlement_completed', 1, {
      settlementId,
      assetId: route.assetId,
      amount: route.amount,
    });

    return finalized;
  }

  getReport(reportId: string): AuthorityReport | undefined {
    return this.reports.get(reportId);
  }

  listReports(issuerId?: IssuerId): AuthorityReport[] {
    const all = Array.from(this.reports.values());
    if (issuerId) return all.filter(r => r.reportingIssuerId === issuerId);
    return all;
  }

  getComponentStatus(): CBDCIntegrationStatus {
    const assets = Array.from(this.assets.values());
    const settlements = Array.from(this.settlements.values());
    const activeAssets = assets.filter(a => a.status === 'active');
    const verifiedSet = new Set(assets.map(a => a.issuerId));
    const pendingSettlements = settlements.filter(s => s.status === 'routing' || s.status === 'pending');
    const settledSettlements = settlements.filter(s => s.status === 'settled');
    const settledVolumeUsd = settledSettlements.reduce((sum, s) => sum + s.amount, 0);

    return {
      totalSovereignAssets: assets.length,
      activeSovereignAssets: activeAssets.length,
      verifiedIssuers: verifiedSet.size,
      pendingSettlements: pendingSettlements.length,
      settledVolumeUsd,
      totalReportsGenerated: this.reports.size,
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

export function createCBDCIntegrationManager(): DefaultCBDCIntegrationManager {
  return new DefaultCBDCIntegrationManager();
}
