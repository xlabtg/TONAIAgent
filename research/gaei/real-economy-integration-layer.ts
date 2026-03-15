/**
 * TONAIAgent - GAEI Real Economy Integration Layer
 *
 * Enables integration between the financial infrastructure and the real economy:
 * - Tokenized RWA markets
 * - Commodity-backed assets
 * - Infrastructure financing
 * - Trade-finance flows
 * - Production financing
 * - Supply-chain liquidity
 * - Cross-border settlement
 */

import {
  RWAAssetId,
  CommodityId,
  TradeFinanceId,
  JurisdictionCode,
  ChainId,
  RealEconomyAssetType,
  RealEconomyAsset,
  CommodityBackedAsset,
  TradeFinanceInstrument,
  InfrastructureFinancing,
  SupplyChainLiquidity,
  RealEconomyIntegrationConfig,
  GAEIEvent,
  GAEIEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateRWAAssetParams {
  name: string;
  assetType: RealEconomyAssetType;
  underlyingValue: number;
  custodian: string;
  jurisdiction: JurisdictionCode;
  yieldRate?: number;
  maturityDate?: Date;
  collateralizationRatio?: number;
  tokenize?: boolean;
  chain?: ChainId;
  metadata?: Record<string, unknown>;
}

export interface RWAAssetFilters {
  assetType?: RealEconomyAssetType;
  jurisdiction?: JurisdictionCode;
  chain?: ChainId;
  verificationStatus?: RealEconomyAsset['verificationStatus'];
  minValue?: number;
  maxValue?: number;
}

export interface CreateCommodityAssetParams {
  commodityType: CommodityBackedAsset['commodityType'];
  commodityName: string;
  underlyingQuantity: number;
  unit: string;
  spotPrice: number;
  storageLocation: string;
  custodian: string;
  tokenize?: boolean;
  chain?: ChainId;
  deliverySupported?: boolean;
  settlementCurrency?: string;
}

export interface CommodityAssetFilters {
  commodityType?: CommodityBackedAsset['commodityType'];
  custodian?: string;
  chain?: ChainId;
  deliverySupported?: boolean;
}

export interface CreateTradeFinanceParams {
  instrumentType: TradeFinanceInstrument['instrumentType'];
  principalAmount: number;
  currency: string;
  issuer: string;
  beneficiary: string;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  maturityDate: Date;
  interestRate: number;
  collateral?: string;
  insuranceCoverage?: number;
  tokenize?: boolean;
  chain?: ChainId;
}

export interface TradeFinanceFilters {
  instrumentType?: TradeFinanceInstrument['instrumentType'];
  issuer?: string;
  status?: TradeFinanceInstrument['status'];
  sourceJurisdiction?: JurisdictionCode;
  destinationJurisdiction?: JurisdictionCode;
}

export interface CreateInfrastructureFinancingParams {
  projectName: string;
  projectType: InfrastructureFinancing['projectType'];
  totalInvestment: number;
  jurisdiction: JurisdictionCode;
  expectedReturn: number;
  projectDurationYears: number;
  riskRating: InfrastructureFinancing['riskRating'];
  tokenize?: boolean;
  chain?: ChainId;
}

export interface InfrastructureFilters {
  projectType?: InfrastructureFinancing['projectType'];
  jurisdiction?: JurisdictionCode;
  status?: InfrastructureFinancing['status'];
  riskRating?: InfrastructureFinancing['riskRating'];
}

export interface CreateSupplyChainLiquidityParams {
  supplyChainId: string;
  participants: string[];
  initialFinancing: number;
  averagePaymentTerm: number;
  chain?: ChainId;
}

export interface SupplyChainFilters {
  status?: SupplyChainLiquidity['status'];
  chain?: ChainId;
}

export interface RealEconomyLayerStatus {
  totalRWATokenized: number;
  totalCommodityBacked: number;
  totalTradeFinanceVolume: number;
  totalInfrastructureFinanced: number;
  totalSupplyChainLiquidity: number;
  activeRWAAssets: number;
  activeCommodityAssets: number;
  activeTradeFinanceInstruments: number;
  activeInfrastructureProjects: number;
  activeSupplyChains: number;
}

export interface RealEconomyIntegrationLayer {
  // RWA Asset Management
  createRWAAsset(params: CreateRWAAssetParams): RealEconomyAsset;
  getRWAAsset(assetId: RWAAssetId): RealEconomyAsset | undefined;
  listRWAAssets(filters?: RWAAssetFilters): RealEconomyAsset[];
  tokenizeRWAAsset(assetId: RWAAssetId, chain: ChainId): RealEconomyAsset;
  verifyRWAAsset(assetId: RWAAssetId): RealEconomyAsset;

  // Commodity-Backed Assets
  createCommodityAsset(params: CreateCommodityAssetParams): CommodityBackedAsset;
  getCommodityAsset(commodityId: CommodityId): CommodityBackedAsset | undefined;
  listCommodityAssets(filters?: CommodityAssetFilters): CommodityBackedAsset[];
  updateCommodityPrice(commodityId: CommodityId, newPrice: number): CommodityBackedAsset;

  // Trade Finance
  createTradeFinanceInstrument(params: CreateTradeFinanceParams): TradeFinanceInstrument;
  getTradeFinanceInstrument(instrumentId: TradeFinanceId): TradeFinanceInstrument | undefined;
  listTradeFinanceInstruments(filters?: TradeFinanceFilters): TradeFinanceInstrument[];
  settleTradeFinanceInstrument(instrumentId: TradeFinanceId): TradeFinanceInstrument;

  // Infrastructure Financing
  createInfrastructureFinancing(params: CreateInfrastructureFinancingParams): InfrastructureFinancing;
  getInfrastructureFinancing(projectId: string): InfrastructureFinancing | undefined;
  listInfrastructureFinancing(filters?: InfrastructureFilters): InfrastructureFinancing[];
  addInfrastructureInvestor(projectId: string, investorId: string, amount: number): InfrastructureFinancing;

  // Supply Chain Liquidity
  createSupplyChainLiquidity(params: CreateSupplyChainLiquidityParams): SupplyChainLiquidity;
  getSupplyChainLiquidity(liquidityId: string): SupplyChainLiquidity | undefined;
  listSupplyChainLiquidity(filters?: SupplyChainFilters): SupplyChainLiquidity[];
  provideSupplyChainFinancing(liquidityId: string, amount: number): SupplyChainLiquidity;

  // Layer Status & Events
  getLayerStatus(): RealEconomyLayerStatus;
  onEvent(callback: GAEIEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultRealEconomyIntegrationLayer implements RealEconomyIntegrationLayer {
  private readonly rwaAssets: Map<RWAAssetId, RealEconomyAsset> = new Map();
  private readonly commodityAssets: Map<CommodityId, CommodityBackedAsset> = new Map();
  private readonly tradeFinanceInstruments: Map<TradeFinanceId, TradeFinanceInstrument> = new Map();
  private readonly infrastructureProjects: Map<string, InfrastructureFinancing> = new Map();
  private readonly supplyChainLiquidityPools: Map<string, SupplyChainLiquidity> = new Map();
  private readonly eventCallbacks: GAEIEventCallback[] = [];
  private readonly config: RealEconomyIntegrationConfig;

  constructor(config?: Partial<RealEconomyIntegrationConfig>) {
    this.config = {
      enableRWATokenization: true,
      enableCommodityBacking: true,
      enableTradeFinance: true,
      enableInfrastructureFinancing: true,
      enableSupplyChainLiquidity: true,
      minCollateralizationRatio: 1.0,
      verificationFrequency: 'weekly',
      ...config,
    };
  }

  // ============================================================================
  // RWA Asset Management
  // ============================================================================

  createRWAAsset(params: CreateRWAAssetParams): RealEconomyAsset {
    const assetId = `rwa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const asset: RealEconomyAsset = {
      id: assetId,
      name: params.name,
      assetType: params.assetType,
      underlyingValue: params.underlyingValue,
      tokenizedValue: params.tokenize ? params.underlyingValue : 0,
      tokenContract: params.tokenize ? `0x${Math.random().toString(16).substring(2, 42)}` : undefined,
      chain: params.chain,
      custodian: params.custodian,
      jurisdiction: params.jurisdiction,
      yieldRate: params.yieldRate ?? 0,
      liquidityScore: this.computeRWALiquidityScore(params),
      maturityDate: params.maturityDate,
      collateralizationRatio: params.collateralizationRatio ?? this.config.minCollateralizationRatio,
      verificationStatus: 'pending',
      metadata: params.metadata ?? {},
    };

    this.rwaAssets.set(assetId, asset);
    this.emitEvent('rwa_tokenized', 'info', `RWA asset ${assetId} created`, { asset });

    return asset;
  }

  getRWAAsset(assetId: RWAAssetId): RealEconomyAsset | undefined {
    return this.rwaAssets.get(assetId);
  }

  listRWAAssets(filters?: RWAAssetFilters): RealEconomyAsset[] {
    let assets = Array.from(this.rwaAssets.values());

    if (filters) {
      if (filters.assetType) {
        assets = assets.filter((a) => a.assetType === filters.assetType);
      }
      if (filters.jurisdiction) {
        assets = assets.filter((a) => a.jurisdiction === filters.jurisdiction);
      }
      if (filters.chain) {
        assets = assets.filter((a) => a.chain === filters.chain);
      }
      if (filters.verificationStatus) {
        assets = assets.filter((a) => a.verificationStatus === filters.verificationStatus);
      }
      if (filters.minValue !== undefined) {
        assets = assets.filter((a) => a.underlyingValue >= filters.minValue!);
      }
      if (filters.maxValue !== undefined) {
        assets = assets.filter((a) => a.underlyingValue <= filters.maxValue!);
      }
    }

    return assets;
  }

  tokenizeRWAAsset(assetId: RWAAssetId, chain: ChainId): RealEconomyAsset {
    const asset = this.rwaAssets.get(assetId);
    if (!asset) {
      throw new Error(`RWA asset ${assetId} not found`);
    }

    const tokenizedAsset: RealEconomyAsset = {
      ...asset,
      tokenizedValue: asset.underlyingValue,
      tokenContract: `0x${Math.random().toString(16).substring(2, 42)}`,
      chain,
    };

    this.rwaAssets.set(assetId, tokenizedAsset);
    this.emitEvent('rwa_tokenized', 'info', `RWA asset ${assetId} tokenized on ${chain}`, { asset: tokenizedAsset });

    return tokenizedAsset;
  }

  verifyRWAAsset(assetId: RWAAssetId): RealEconomyAsset {
    const asset = this.rwaAssets.get(assetId);
    if (!asset) {
      throw new Error(`RWA asset ${assetId} not found`);
    }

    const verifiedAsset: RealEconomyAsset = {
      ...asset,
      verificationStatus: 'verified',
      lastVerifiedAt: new Date(),
    };

    this.rwaAssets.set(assetId, verifiedAsset);
    return verifiedAsset;
  }

  // ============================================================================
  // Commodity-Backed Assets
  // ============================================================================

  createCommodityAsset(params: CreateCommodityAssetParams): CommodityBackedAsset {
    const commodityId = `commodity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const asset: CommodityBackedAsset = {
      id: commodityId,
      commodityType: params.commodityType,
      commodityName: params.commodityName,
      underlyingQuantity: params.underlyingQuantity,
      unit: params.unit,
      spotPrice: params.spotPrice,
      tokenizedUnits: params.tokenize ? params.underlyingQuantity : 0,
      tokenContract: params.tokenize ? `0x${Math.random().toString(16).substring(2, 42)}` : undefined,
      chain: params.chain,
      storageLocation: params.storageLocation,
      custodian: params.custodian,
      verificationFrequency: this.config.verificationFrequency,
      lastVerifiedAt: new Date(),
      deliverySupported: params.deliverySupported ?? false,
      settlementCurrency: params.settlementCurrency ?? 'USD',
    };

    this.commodityAssets.set(commodityId, asset);
    this.emitEvent('commodity_trade_executed', 'info', `Commodity asset ${commodityId} created`, { asset });

    return asset;
  }

  getCommodityAsset(commodityId: CommodityId): CommodityBackedAsset | undefined {
    return this.commodityAssets.get(commodityId);
  }

  listCommodityAssets(filters?: CommodityAssetFilters): CommodityBackedAsset[] {
    let assets = Array.from(this.commodityAssets.values());

    if (filters) {
      if (filters.commodityType) {
        assets = assets.filter((a) => a.commodityType === filters.commodityType);
      }
      if (filters.custodian) {
        assets = assets.filter((a) => a.custodian === filters.custodian);
      }
      if (filters.chain) {
        assets = assets.filter((a) => a.chain === filters.chain);
      }
      if (filters.deliverySupported !== undefined) {
        assets = assets.filter((a) => a.deliverySupported === filters.deliverySupported);
      }
    }

    return assets;
  }

  updateCommodityPrice(commodityId: CommodityId, newPrice: number): CommodityBackedAsset {
    const asset = this.commodityAssets.get(commodityId);
    if (!asset) {
      throw new Error(`Commodity asset ${commodityId} not found`);
    }

    const updatedAsset: CommodityBackedAsset = {
      ...asset,
      spotPrice: newPrice,
      lastVerifiedAt: new Date(),
    };

    this.commodityAssets.set(commodityId, updatedAsset);
    return updatedAsset;
  }

  // ============================================================================
  // Trade Finance
  // ============================================================================

  createTradeFinanceInstrument(params: CreateTradeFinanceParams): TradeFinanceInstrument {
    const instrumentId = `tf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const instrument: TradeFinanceInstrument = {
      id: instrumentId,
      instrumentType: params.instrumentType,
      principalAmount: params.principalAmount,
      currency: params.currency,
      issuer: params.issuer,
      beneficiary: params.beneficiary,
      sourceJurisdiction: params.sourceJurisdiction,
      destinationJurisdiction: params.destinationJurisdiction,
      maturityDate: params.maturityDate,
      interestRate: params.interestRate,
      collateral: params.collateral,
      insuranceCoverage: params.insuranceCoverage ?? 0,
      tokenized: params.tokenize ?? false,
      tokenContract: params.tokenize ? `0x${Math.random().toString(16).substring(2, 42)}` : undefined,
      chain: params.chain,
      status: 'issued',
      createdAt: new Date(),
    };

    this.tradeFinanceInstruments.set(instrumentId, instrument);
    this.emitEvent('trade_finance_settlement', 'info', `Trade finance instrument ${instrumentId} created`, {
      instrument,
    });

    return instrument;
  }

  getTradeFinanceInstrument(instrumentId: TradeFinanceId): TradeFinanceInstrument | undefined {
    return this.tradeFinanceInstruments.get(instrumentId);
  }

  listTradeFinanceInstruments(filters?: TradeFinanceFilters): TradeFinanceInstrument[] {
    let instruments = Array.from(this.tradeFinanceInstruments.values());

    if (filters) {
      if (filters.instrumentType) {
        instruments = instruments.filter((i) => i.instrumentType === filters.instrumentType);
      }
      if (filters.issuer) {
        instruments = instruments.filter((i) => i.issuer === filters.issuer);
      }
      if (filters.status) {
        instruments = instruments.filter((i) => i.status === filters.status);
      }
      if (filters.sourceJurisdiction) {
        instruments = instruments.filter((i) => i.sourceJurisdiction === filters.sourceJurisdiction);
      }
      if (filters.destinationJurisdiction) {
        instruments = instruments.filter((i) => i.destinationJurisdiction === filters.destinationJurisdiction);
      }
    }

    return instruments;
  }

  settleTradeFinanceInstrument(instrumentId: TradeFinanceId): TradeFinanceInstrument {
    const instrument = this.tradeFinanceInstruments.get(instrumentId);
    if (!instrument) {
      throw new Error(`Trade finance instrument ${instrumentId} not found`);
    }

    const settledInstrument: TradeFinanceInstrument = {
      ...instrument,
      status: 'settled',
    };

    this.tradeFinanceInstruments.set(instrumentId, settledInstrument);
    this.emitEvent('trade_finance_settlement', 'info', `Trade finance instrument ${instrumentId} settled`, {
      instrument: settledInstrument,
    });

    return settledInstrument;
  }

  // ============================================================================
  // Infrastructure Financing
  // ============================================================================

  createInfrastructureFinancing(params: CreateInfrastructureFinancingParams): InfrastructureFinancing {
    const projectId = `infra_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const project: InfrastructureFinancing = {
      id: projectId,
      projectName: params.projectName,
      projectType: params.projectType,
      totalInvestment: params.totalInvestment,
      financedAmount: 0,
      jurisdiction: params.jurisdiction,
      expectedReturn: params.expectedReturn,
      projectDurationYears: params.projectDurationYears,
      riskRating: params.riskRating,
      tokenized: params.tokenize ?? false,
      tokenContract: params.tokenize ? `0x${Math.random().toString(16).substring(2, 42)}` : undefined,
      chain: params.chain,
      investors: [],
      status: 'planning',
      createdAt: new Date(),
    };

    this.infrastructureProjects.set(projectId, project);
    this.emitEvent('infrastructure_financing', 'info', `Infrastructure project ${projectId} created`, { project });

    return project;
  }

  getInfrastructureFinancing(projectId: string): InfrastructureFinancing | undefined {
    return this.infrastructureProjects.get(projectId);
  }

  listInfrastructureFinancing(filters?: InfrastructureFilters): InfrastructureFinancing[] {
    let projects = Array.from(this.infrastructureProjects.values());

    if (filters) {
      if (filters.projectType) {
        projects = projects.filter((p) => p.projectType === filters.projectType);
      }
      if (filters.jurisdiction) {
        projects = projects.filter((p) => p.jurisdiction === filters.jurisdiction);
      }
      if (filters.status) {
        projects = projects.filter((p) => p.status === filters.status);
      }
      if (filters.riskRating) {
        projects = projects.filter((p) => p.riskRating === filters.riskRating);
      }
    }

    return projects;
  }

  addInfrastructureInvestor(projectId: string, investorId: string, amount: number): InfrastructureFinancing {
    const project = this.infrastructureProjects.get(projectId);
    if (!project) {
      throw new Error(`Infrastructure project ${projectId} not found`);
    }

    const updatedProject: InfrastructureFinancing = {
      ...project,
      financedAmount: project.financedAmount + amount,
      investors: [...project.investors, investorId],
      status: project.financedAmount + amount >= project.totalInvestment ? 'financing' : project.status,
    };

    this.infrastructureProjects.set(projectId, updatedProject);
    return updatedProject;
  }

  // ============================================================================
  // Supply Chain Liquidity
  // ============================================================================

  createSupplyChainLiquidity(params: CreateSupplyChainLiquidityParams): SupplyChainLiquidity {
    const liquidityId = `scl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const liquidity: SupplyChainLiquidity = {
      id: liquidityId,
      supplyChainId: params.supplyChainId,
      participants: params.participants,
      totalFinanced: params.initialFinancing,
      outstandingAmount: params.initialFinancing,
      averagePaymentTerm: params.averagePaymentTerm,
      defaultRate: 0,
      liquidityPool: params.chain ? `pool_${liquidityId}` : undefined,
      chain: params.chain,
      status: 'active',
    };

    this.supplyChainLiquidityPools.set(liquidityId, liquidity);
    return liquidity;
  }

  getSupplyChainLiquidity(liquidityId: string): SupplyChainLiquidity | undefined {
    return this.supplyChainLiquidityPools.get(liquidityId);
  }

  listSupplyChainLiquidity(filters?: SupplyChainFilters): SupplyChainLiquidity[] {
    let pools = Array.from(this.supplyChainLiquidityPools.values());

    if (filters) {
      if (filters.status) {
        pools = pools.filter((p) => p.status === filters.status);
      }
      if (filters.chain) {
        pools = pools.filter((p) => p.chain === filters.chain);
      }
    }

    return pools;
  }

  provideSupplyChainFinancing(liquidityId: string, amount: number): SupplyChainLiquidity {
    const liquidity = this.supplyChainLiquidityPools.get(liquidityId);
    if (!liquidity) {
      throw new Error(`Supply chain liquidity pool ${liquidityId} not found`);
    }

    const updatedLiquidity: SupplyChainLiquidity = {
      ...liquidity,
      totalFinanced: liquidity.totalFinanced + amount,
      outstandingAmount: liquidity.outstandingAmount + amount,
    };

    this.supplyChainLiquidityPools.set(liquidityId, updatedLiquidity);
    return updatedLiquidity;
  }

  // ============================================================================
  // Layer Status & Events
  // ============================================================================

  getLayerStatus(): RealEconomyLayerStatus {
    const rwaAssets = Array.from(this.rwaAssets.values());
    const commodities = Array.from(this.commodityAssets.values());
    const tradeFinance = Array.from(this.tradeFinanceInstruments.values());
    const infrastructure = Array.from(this.infrastructureProjects.values());
    const supplyChain = Array.from(this.supplyChainLiquidityPools.values());

    return {
      totalRWATokenized: rwaAssets.reduce((sum, a) => sum + a.tokenizedValue, 0),
      totalCommodityBacked: commodities.reduce((sum, a) => sum + a.spotPrice * a.underlyingQuantity, 0),
      totalTradeFinanceVolume: tradeFinance.reduce((sum, i) => sum + i.principalAmount, 0),
      totalInfrastructureFinanced: infrastructure.reduce((sum, p) => sum + p.financedAmount, 0),
      totalSupplyChainLiquidity: supplyChain.reduce((sum, l) => sum + l.totalFinanced, 0),
      activeRWAAssets: rwaAssets.filter((a) => a.verificationStatus === 'verified').length,
      activeCommodityAssets: commodities.length,
      activeTradeFinanceInstruments: tradeFinance.filter((i) => i.status === 'active').length,
      activeInfrastructureProjects: infrastructure.filter((p) => p.status !== 'completed').length,
      activeSupplyChains: supplyChain.filter((l) => l.status === 'active').length,
    };
  }

  onEvent(callback: GAEIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private computeRWALiquidityScore(params: CreateRWAAssetParams): number {
    let score = 50; // Base score

    // Higher value = slightly more liquid
    if (params.underlyingValue > 10000000) {
      score += 10;
    }

    // Tokenization increases liquidity
    if (params.tokenize) {
      score += 20;
    }

    // Higher collateralization = more stable
    if ((params.collateralizationRatio ?? 1) > 1.5) {
      score += 10;
    }

    // Asset type impacts liquidity
    const liquidAssetTypes: RealEconomyAssetType[] = ['tokenized_rwa', 'commodity_backed', 'real_estate'];
    if (liquidAssetTypes.includes(params.assetType)) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private emitEvent(
    type: GAEIEvent['type'],
    severity: GAEIEvent['severity'],
    message: string,
    data: Record<string, unknown>
  ): void {
    const event: GAEIEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      severity,
      source: 'real_economy_integration_layer',
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

export function createRealEconomyIntegrationLayer(
  config?: Partial<RealEconomyIntegrationConfig>
): DefaultRealEconomyIntegrationLayer {
  return new DefaultRealEconomyIntegrationLayer(config);
}
