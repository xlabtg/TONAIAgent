/**
 * ACMS Layer 1 — Asset Layer
 *
 * Manages all assets in the Autonomous Capital Markets Stack:
 * crypto assets, RWA tokenization, tokenized funds, and structured products.
 * Provides issuance, listing, pricing, and lifecycle management for all
 * asset types that flow through the ACMS.
 */

import {
  Asset,
  AssetId,
  AssetIssuanceRequest,
  AssetLayerStatus,
  AssetStatus,
  AssetType,
  AgentId,
  StructuredProduct,
  TokenizedFund,
  ACMSEvent,
  ACMSEventCallback,
} from './types';

// ============================================================================
// Asset Layer Manager Interface
// ============================================================================

export interface AssetLayerManager {
  issueAsset(request: AssetIssuanceRequest): Asset;
  listAsset(assetId: AssetId): void;
  delistAsset(assetId: AssetId): void;
  getAsset(assetId: AssetId): Asset | undefined;
  listAssets(filters?: AssetFilters): Asset[];
  updatePrice(assetId: AssetId, priceUsd: number): void;
  createTokenizedFund(params: CreateTokenizedFundParams): TokenizedFund;
  createStructuredProduct(params: CreateStructuredProductParams): StructuredProduct;
  getLayerStatus(): AssetLayerStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export interface AssetFilters {
  type?: AssetType;
  status?: AssetStatus;
  chainId?: string;
  minMarketCapUsd?: number;
}

export interface CreateTokenizedFundParams {
  fundManagerId: AgentId;
  name: string;
  symbol: string;
  chainId: string;
  initialNavPerShare: number;
  initialShares: number;
  managementFeeRate: number;
  performanceFeeRate: number;
  redemptionNoticeDays: number;
  strategyDescription: string;
}

export interface CreateStructuredProductParams {
  issuerAgentId: AgentId;
  name: string;
  symbol: string;
  chainId: string;
  underlyingAssets: AssetId[];
  maturityDate: Date;
  principalProtected: boolean;
  targetYield: number;
  riskRating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
  notionalAmount: number;
}

// ============================================================================
// Default Asset Layer Manager
// ============================================================================

export class DefaultAssetLayerManager implements AssetLayerManager {
  private readonly assets: Map<AssetId, Asset> = new Map();
  private readonly eventCallbacks: ACMSEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  issueAsset(request: AssetIssuanceRequest): Asset {
    const asset: Asset = {
      id: this.generateId('asset'),
      symbol: request.symbol,
      name: request.name,
      type: request.assetType,
      chainId: request.chainId,
      decimals: 9,
      totalSupply: request.initialSupply,
      circulatingSupply: request.initialSupply,
      priceUsd: 1.0,
      marketCapUsd: request.initialSupply,
      status: 'active',
      metadata: request.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assets.set(asset.id, asset);
    this.emitEvent('asset_issued', 1, { assetId: asset.id, symbol: asset.symbol, type: asset.type });
    return asset;
  }

  listAsset(assetId: AssetId): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);
    this.assets.set(assetId, { ...asset, status: 'active', updatedAt: new Date() });
  }

  delistAsset(assetId: AssetId): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);
    this.assets.set(assetId, { ...asset, status: 'delisted', updatedAt: new Date() });
  }

  getAsset(assetId: AssetId): Asset | undefined {
    return this.assets.get(assetId);
  }

  listAssets(filters?: AssetFilters): Asset[] {
    let result = Array.from(this.assets.values());
    if (filters?.type) result = result.filter(a => a.type === filters.type);
    if (filters?.status) result = result.filter(a => a.status === filters.status);
    if (filters?.chainId) result = result.filter(a => a.chainId === filters.chainId);
    if (filters?.minMarketCapUsd !== undefined) {
      result = result.filter(a => a.marketCapUsd >= filters.minMarketCapUsd!);
    }
    return result;
  }

  updatePrice(assetId: AssetId, priceUsd: number): void {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);
    const marketCapUsd = asset.circulatingSupply * priceUsd;
    this.assets.set(assetId, { ...asset, priceUsd, marketCapUsd, updatedAt: new Date() });
  }

  createTokenizedFund(params: CreateTokenizedFundParams): TokenizedFund {
    const totalSupply = params.initialShares;
    const aum = params.initialNavPerShare * totalSupply;
    const fund: TokenizedFund = {
      id: this.generateId('fund_token'),
      symbol: params.symbol,
      name: params.name,
      type: 'tokenized_fund',
      chainId: params.chainId,
      decimals: 9,
      totalSupply,
      circulatingSupply: totalSupply,
      priceUsd: params.initialNavPerShare,
      marketCapUsd: aum,
      status: 'active',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      fundManagerId: params.fundManagerId,
      navPerShare: params.initialNavPerShare,
      totalAssets: aum,
      aum,
      managementFeeRate: params.managementFeeRate,
      performanceFeeRate: params.performanceFeeRate,
      redemptionNotice: params.redemptionNoticeDays,
      strategyDescription: params.strategyDescription,
    };
    this.assets.set(fund.id, fund);
    this.emitEvent('asset_issued', 1, { assetId: fund.id, symbol: fund.symbol, type: 'tokenized_fund' });
    return fund;
  }

  createStructuredProduct(params: CreateStructuredProductParams): StructuredProduct {
    const product: StructuredProduct = {
      id: this.generateId('struct_prod'),
      symbol: params.symbol,
      name: params.name,
      type: 'structured_product',
      chainId: params.chainId,
      decimals: 9,
      totalSupply: params.notionalAmount,
      circulatingSupply: params.notionalAmount,
      priceUsd: 1.0,
      marketCapUsd: params.notionalAmount,
      status: 'active',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      underlyingAssets: params.underlyingAssets,
      maturityDate: params.maturityDate,
      principalProtected: params.principalProtected,
      targetYield: params.targetYield,
      riskRating: params.riskRating,
      issuerAgentId: params.issuerAgentId,
    };
    this.assets.set(product.id, product);
    this.emitEvent('asset_issued', 1, { assetId: product.id, symbol: product.symbol, type: 'structured_product' });
    return product;
  }

  getLayerStatus(): AssetLayerStatus {
    const all = Array.from(this.assets.values());
    const active = all.filter(a => a.status === 'active');
    return {
      totalAssets: all.length,
      activeAssets: active.length,
      totalMarketCapUsd: active.reduce((s, a) => s + a.marketCapUsd, 0),
      tokenizedFunds: all.filter(a => a.type === 'tokenized_fund').length,
      structuredProducts: all.filter(a => a.type === 'structured_product').length,
      rwasTokenized: all.filter(a => a.type === 'rwa_token').length,
    };
  }

  onEvent(callback: ACMSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: ACMSEvent['type'], layer: ACMSEvent['layer'], data: Record<string, unknown>): void {
    const event: ACMSEvent = { type, layer, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createAssetLayerManager(): DefaultAssetLayerManager {
  return new DefaultAssetLayerManager();
}
