/**
 * TONAIAgent - GAEI Multi-Layer Monetary Coordination
 *
 * Supports:
 * - Protocol token economy
 * - Sovereign digital assets
 * - Treasury reserves
 * - Yield-backed instruments
 * - Cross-chain asset baskets
 *
 * Ensures:
 * - Controlled inflation dynamics
 * - Systemic stability
 * - Adaptive liquidity supply
 */

import {
  JurisdictionCode,
  ChainId,
  MonetaryLayerType,
  MonetaryLayer,
  ProtocolTokenEconomy,
  SovereignDigitalAsset,
  SovereignReserve,
  TreasuryReserveLayer,
  TreasuryAsset,
  TreasuryAllocationTarget,
  YieldBackedInstrument,
  CrossChainAssetBasket,
  BasketAsset,
  MonetaryCoordinationConfig,
  GAEIEvent,
  GAEIEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateMonetaryLayerParams {
  layerType: MonetaryLayerType;
  name: string;
  totalSupply: number;
  reserveBacking?: number;
  inflationRate?: number;
  yieldRate?: number;
  stabilityMechanism: string;
  chains: ChainId[];
  governanceModel: MonetaryLayer['governanceModel'];
}

export interface MonetaryLayerFilters {
  layerType?: MonetaryLayerType;
  status?: MonetaryLayer['status'];
  chain?: ChainId;
}

export interface CreateProtocolTokenParams {
  tokenAddress: string;
  chain: ChainId;
  totalSupply: number;
  emissionRate: number;
  burnRate?: number;
  inflationTarget: number;
}

export interface CreateSovereignAssetParams {
  name: string;
  symbol: string;
  issuingAuthority: string;
  jurisdiction: JurisdictionCode;
  totalSupply: number;
  reserves: SovereignReserve[];
  peggingMechanism: SovereignDigitalAsset['peggingMechanism'];
  pegTarget: string;
  interoperableChains?: ChainId[];
}

export interface SovereignAssetFilters {
  jurisdiction?: JurisdictionCode;
  status?: SovereignDigitalAsset['status'];
}

export interface CreateTreasuryReserveParams {
  name: string;
  initialValue: number;
  assets: TreasuryAsset[];
  targetAllocation: TreasuryAllocationTarget[];
  rebalanceThreshold?: number;
}

export interface TreasuryReserveFilters {
  minValue?: number;
  maxValue?: number;
}

export interface CreateYieldInstrumentParams {
  name: string;
  principalAmount: number;
  yieldSource: string;
  yieldRate: number;
  maturityDate?: Date;
  collateral: string;
  collateralRatio: number;
  tokenize?: boolean;
  chain?: ChainId;
}

export interface YieldInstrumentFilters {
  status?: YieldBackedInstrument['status'];
  chain?: ChainId;
}

export interface CreateCrossChainBasketParams {
  name: string;
  assets: BasketAsset[];
  rebalanceFrequency: CrossChainAssetBasket['rebalanceFrequency'];
  managementFee: number;
  primaryChain: ChainId;
}

export interface BasketFilters {
  chain?: ChainId;
  status?: CrossChainAssetBasket['status'];
}

export interface MonetaryCoordinationLayerStatus {
  activeMonetaryLayers: number;
  totalMonetarySupply: number;
  totalReserveBacking: number;
  activeSovereignAssets: number;
  totalTreasuryValue: number;
  activeYieldInstruments: number;
  activeBaskets: number;
  systemInflationRate: number;
  systemStabilityScore: number;
}

export interface MonetaryCoordinationLayer {
  // Monetary Layer Management
  createMonetaryLayer(params: CreateMonetaryLayerParams): MonetaryLayer;
  getMonetaryLayer(layerId: string): MonetaryLayer | undefined;
  listMonetaryLayers(filters?: MonetaryLayerFilters): MonetaryLayer[];
  updateMonetaryLayer(layerId: string, updates: Partial<MonetaryLayer>): MonetaryLayer;

  // Protocol Token Economy
  registerProtocolToken(params: CreateProtocolTokenParams): ProtocolTokenEconomy;
  getProtocolToken(tokenAddress: string): ProtocolTokenEconomy | undefined;
  listProtocolTokens(): ProtocolTokenEconomy[];
  adjustEmissionRate(tokenAddress: string, newRate: number): ProtocolTokenEconomy;
  executeBurn(tokenAddress: string, amount: number): ProtocolTokenEconomy;

  // Sovereign Digital Assets
  createSovereignAsset(params: CreateSovereignAssetParams): SovereignDigitalAsset;
  getSovereignAsset(assetId: string): SovereignDigitalAsset | undefined;
  listSovereignAssets(filters?: SovereignAssetFilters): SovereignDigitalAsset[];
  updateSovereignReserves(assetId: string, reserves: SovereignReserve[]): SovereignDigitalAsset;

  // Treasury Reserves
  createTreasuryReserve(params: CreateTreasuryReserveParams): TreasuryReserveLayer;
  getTreasuryReserve(reserveId: string): TreasuryReserveLayer | undefined;
  listTreasuryReserves(filters?: TreasuryReserveFilters): TreasuryReserveLayer[];
  rebalanceTreasuryReserve(reserveId: string): TreasuryReserveLayer;

  // Yield-Backed Instruments
  createYieldInstrument(params: CreateYieldInstrumentParams): YieldBackedInstrument;
  getYieldInstrument(instrumentId: string): YieldBackedInstrument | undefined;
  listYieldInstruments(filters?: YieldInstrumentFilters): YieldBackedInstrument[];

  // Cross-Chain Asset Baskets
  createCrossChainBasket(params: CreateCrossChainBasketParams): CrossChainAssetBasket;
  getCrossChainBasket(basketId: string): CrossChainAssetBasket | undefined;
  listCrossChainBaskets(filters?: BasketFilters): CrossChainAssetBasket[];
  rebalanceBasket(basketId: string): CrossChainAssetBasket;

  // Layer Status & Events
  getLayerStatus(): MonetaryCoordinationLayerStatus;
  onEvent(callback: GAEIEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultMonetaryCoordinationLayer implements MonetaryCoordinationLayer {
  private readonly monetaryLayers: Map<string, MonetaryLayer> = new Map();
  private readonly protocolTokens: Map<string, ProtocolTokenEconomy> = new Map();
  private readonly sovereignAssets: Map<string, SovereignDigitalAsset> = new Map();
  private readonly treasuryReserves: Map<string, TreasuryReserveLayer> = new Map();
  private readonly yieldInstruments: Map<string, YieldBackedInstrument> = new Map();
  private readonly crossChainBaskets: Map<string, CrossChainAssetBasket> = new Map();
  private readonly eventCallbacks: GAEIEventCallback[] = [];
  private readonly config: MonetaryCoordinationConfig;

  constructor(config?: Partial<MonetaryCoordinationConfig>) {
    this.config = {
      enableProtocolTokenEconomy: true,
      enableSovereignDigitalAssets: true,
      enableTreasuryReserves: true,
      enableYieldBackedInstruments: true,
      enableCrossChainBaskets: true,
      inflationTarget: 0.02, // 2%
      stabilityThreshold: 70,
      ...config,
    };
  }

  // ============================================================================
  // Monetary Layer Management
  // ============================================================================

  createMonetaryLayer(params: CreateMonetaryLayerParams): MonetaryLayer {
    const layerId = `mlayer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const layer: MonetaryLayer = {
      id: layerId,
      layerType: params.layerType,
      name: params.name,
      totalSupply: params.totalSupply,
      circulatingSupply: params.totalSupply * 0.8, // 80% initially circulating
      reserveBacking: params.reserveBacking ?? 0,
      collateralizationRatio: params.reserveBacking ? params.reserveBacking / params.totalSupply : 0,
      inflationRate: params.inflationRate ?? this.config.inflationTarget,
      deflationMechanism: undefined,
      yieldRate: params.yieldRate ?? 0,
      stabilityMechanism: params.stabilityMechanism,
      chains: params.chains,
      governanceModel: params.governanceModel,
      status: 'active',
      createdAt: new Date(),
    };

    this.monetaryLayers.set(layerId, layer);
    this.emitEvent('monetary_coordination_action', 'info', `Monetary layer ${layerId} created`, { layer });

    return layer;
  }

  getMonetaryLayer(layerId: string): MonetaryLayer | undefined {
    return this.monetaryLayers.get(layerId);
  }

  listMonetaryLayers(filters?: MonetaryLayerFilters): MonetaryLayer[] {
    let layers = Array.from(this.monetaryLayers.values());

    if (filters) {
      if (filters.layerType) {
        layers = layers.filter((l) => l.layerType === filters.layerType);
      }
      if (filters.status) {
        layers = layers.filter((l) => l.status === filters.status);
      }
      if (filters.chain) {
        layers = layers.filter((l) => l.chains.includes(filters.chain!));
      }
    }

    return layers;
  }

  updateMonetaryLayer(layerId: string, updates: Partial<MonetaryLayer>): MonetaryLayer {
    const layer = this.monetaryLayers.get(layerId);
    if (!layer) {
      throw new Error(`Monetary layer ${layerId} not found`);
    }

    const updatedLayer = { ...layer, ...updates };
    this.monetaryLayers.set(layerId, updatedLayer);
    return updatedLayer;
  }

  // ============================================================================
  // Protocol Token Economy
  // ============================================================================

  registerProtocolToken(params: CreateProtocolTokenParams): ProtocolTokenEconomy {
    const token: ProtocolTokenEconomy = {
      tokenAddress: params.tokenAddress,
      chain: params.chain,
      totalSupply: params.totalSupply,
      circulatingSupply: params.totalSupply * 0.6, // 60% initial circulation
      stakedSupply: params.totalSupply * 0.2, // 20% staked
      treasuryHoldings: params.totalSupply * 0.2, // 20% treasury
      emissionRate: params.emissionRate,
      burnRate: params.burnRate ?? 0,
      inflationTarget: params.inflationTarget,
      currentInflation: params.emissionRate / params.totalSupply,
      velocityMetric: 2.5, // Circulating supply turnover rate
      utilityDemand: 0.7, // 70% utility demand score
      governanceWeight: 1.0, // Standard governance weight
    };

    this.protocolTokens.set(params.tokenAddress, token);
    return token;
  }

  getProtocolToken(tokenAddress: string): ProtocolTokenEconomy | undefined {
    return this.protocolTokens.get(tokenAddress);
  }

  listProtocolTokens(): ProtocolTokenEconomy[] {
    return Array.from(this.protocolTokens.values());
  }

  adjustEmissionRate(tokenAddress: string, newRate: number): ProtocolTokenEconomy {
    const token = this.protocolTokens.get(tokenAddress);
    if (!token) {
      throw new Error(`Protocol token ${tokenAddress} not found`);
    }

    const updatedToken: ProtocolTokenEconomy = {
      ...token,
      emissionRate: newRate,
      currentInflation: newRate / token.totalSupply,
    };

    this.protocolTokens.set(tokenAddress, updatedToken);
    return updatedToken;
  }

  executeBurn(tokenAddress: string, amount: number): ProtocolTokenEconomy {
    const token = this.protocolTokens.get(tokenAddress);
    if (!token) {
      throw new Error(`Protocol token ${tokenAddress} not found`);
    }

    const updatedToken: ProtocolTokenEconomy = {
      ...token,
      totalSupply: token.totalSupply - amount,
      circulatingSupply: token.circulatingSupply - amount,
      burnRate: token.burnRate + amount,
    };

    this.protocolTokens.set(tokenAddress, updatedToken);
    return updatedToken;
  }

  // ============================================================================
  // Sovereign Digital Assets
  // ============================================================================

  createSovereignAsset(params: CreateSovereignAssetParams): SovereignDigitalAsset {
    const assetId = `sda_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const asset: SovereignDigitalAsset = {
      id: assetId,
      name: params.name,
      symbol: params.symbol,
      issuingAuthority: params.issuingAuthority,
      jurisdiction: params.jurisdiction,
      totalSupply: params.totalSupply,
      reserves: params.reserves,
      peggingMechanism: params.peggingMechanism,
      pegTarget: params.pegTarget,
      pegDeviation: 0, // Initially on target
      crossBorderEnabled: true,
      interoperableChains: params.interoperableChains ?? ['ton'],
      status: 'pilot',
    };

    this.sovereignAssets.set(assetId, asset);
    this.emitEvent('sovereign_integration', 'info', `Sovereign digital asset ${assetId} created`, { asset });

    return asset;
  }

  getSovereignAsset(assetId: string): SovereignDigitalAsset | undefined {
    return this.sovereignAssets.get(assetId);
  }

  listSovereignAssets(filters?: SovereignAssetFilters): SovereignDigitalAsset[] {
    let assets = Array.from(this.sovereignAssets.values());

    if (filters) {
      if (filters.jurisdiction) {
        assets = assets.filter((a) => a.jurisdiction === filters.jurisdiction);
      }
      if (filters.status) {
        assets = assets.filter((a) => a.status === filters.status);
      }
    }

    return assets;
  }

  updateSovereignReserves(assetId: string, reserves: SovereignReserve[]): SovereignDigitalAsset {
    const asset = this.sovereignAssets.get(assetId);
    if (!asset) {
      throw new Error(`Sovereign asset ${assetId} not found`);
    }

    const updatedAsset: SovereignDigitalAsset = {
      ...asset,
      reserves,
    };

    this.sovereignAssets.set(assetId, updatedAsset);
    return updatedAsset;
  }

  // ============================================================================
  // Treasury Reserves
  // ============================================================================

  createTreasuryReserve(params: CreateTreasuryReserveParams): TreasuryReserveLayer {
    const reserveId = `treasury_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const reserve: TreasuryReserveLayer = {
      id: reserveId,
      name: params.name,
      totalValue: params.initialValue,
      composition: params.assets,
      targetAllocation: params.targetAllocation,
      rebalanceThreshold: params.rebalanceThreshold ?? 5, // 5% default threshold
      stabilityScore: this.computeStabilityScore(params.assets),
      liquidityScore: this.computeLiquidityScore(params.assets),
      yieldGeneration: this.computeYieldGeneration(params.assets),
      lastRebalancedAt: new Date(),
      nextReviewAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    };

    this.treasuryReserves.set(reserveId, reserve);
    return reserve;
  }

  getTreasuryReserve(reserveId: string): TreasuryReserveLayer | undefined {
    return this.treasuryReserves.get(reserveId);
  }

  listTreasuryReserves(filters?: TreasuryReserveFilters): TreasuryReserveLayer[] {
    let reserves = Array.from(this.treasuryReserves.values());

    if (filters) {
      if (filters.minValue !== undefined) {
        reserves = reserves.filter((r) => r.totalValue >= filters.minValue!);
      }
      if (filters.maxValue !== undefined) {
        reserves = reserves.filter((r) => r.totalValue <= filters.maxValue!);
      }
    }

    return reserves;
  }

  rebalanceTreasuryReserve(reserveId: string): TreasuryReserveLayer {
    const reserve = this.treasuryReserves.get(reserveId);
    if (!reserve) {
      throw new Error(`Treasury reserve ${reserveId} not found`);
    }

    // Rebalance assets to match target allocation
    const rebalancedAssets = reserve.composition.map((asset) => {
      const target = reserve.targetAllocation.find((t) => t.category === asset.assetType);
      if (target) {
        const targetValue = reserve.totalValue * (target.targetPercent / 100);
        return {
          ...asset,
          value: targetValue,
          percentOfTotal: target.targetPercent,
        };
      }
      return asset;
    });

    const updatedReserve: TreasuryReserveLayer = {
      ...reserve,
      composition: rebalancedAssets,
      stabilityScore: this.computeStabilityScore(rebalancedAssets),
      liquidityScore: this.computeLiquidityScore(rebalancedAssets),
      lastRebalancedAt: new Date(),
      nextReviewAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    this.treasuryReserves.set(reserveId, updatedReserve);
    return updatedReserve;
  }

  // ============================================================================
  // Yield-Backed Instruments
  // ============================================================================

  createYieldInstrument(params: CreateYieldInstrumentParams): YieldBackedInstrument {
    const instrumentId = `yield_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const instrument: YieldBackedInstrument = {
      id: instrumentId,
      name: params.name,
      principalAmount: params.principalAmount,
      yieldSource: params.yieldSource,
      yieldRate: params.yieldRate,
      maturityDate: params.maturityDate,
      collateral: params.collateral,
      collateralRatio: params.collateralRatio,
      tokenContract: params.tokenize ? `0x${Math.random().toString(16).substring(2, 42)}` : undefined,
      chain: params.chain,
      status: 'active',
    };

    this.yieldInstruments.set(instrumentId, instrument);
    return instrument;
  }

  getYieldInstrument(instrumentId: string): YieldBackedInstrument | undefined {
    return this.yieldInstruments.get(instrumentId);
  }

  listYieldInstruments(filters?: YieldInstrumentFilters): YieldBackedInstrument[] {
    let instruments = Array.from(this.yieldInstruments.values());

    if (filters) {
      if (filters.status) {
        instruments = instruments.filter((i) => i.status === filters.status);
      }
      if (filters.chain) {
        instruments = instruments.filter((i) => i.chain === filters.chain);
      }
    }

    return instruments;
  }

  // ============================================================================
  // Cross-Chain Asset Baskets
  // ============================================================================

  createCrossChainBasket(params: CreateCrossChainBasketParams): CrossChainAssetBasket {
    const basketId = `basket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const totalValue = params.assets.reduce((sum, a) => sum + a.value, 0);
    const chains = [...new Set(params.assets.map((a) => a.chain))];

    const basket: CrossChainAssetBasket = {
      id: basketId,
      name: params.name,
      totalValue,
      assets: params.assets,
      rebalanceFrequency: params.rebalanceFrequency,
      managementFee: params.managementFee,
      chains,
      tokenContract: `0x${Math.random().toString(16).substring(2, 42)}`,
      primaryChain: params.primaryChain,
      status: 'active',
    };

    this.crossChainBaskets.set(basketId, basket);
    return basket;
  }

  getCrossChainBasket(basketId: string): CrossChainAssetBasket | undefined {
    return this.crossChainBaskets.get(basketId);
  }

  listCrossChainBaskets(filters?: BasketFilters): CrossChainAssetBasket[] {
    let baskets = Array.from(this.crossChainBaskets.values());

    if (filters) {
      if (filters.chain) {
        baskets = baskets.filter((b) => b.chains.includes(filters.chain!));
      }
      if (filters.status) {
        baskets = baskets.filter((b) => b.status === filters.status);
      }
    }

    return baskets;
  }

  rebalanceBasket(basketId: string): CrossChainAssetBasket {
    const basket = this.crossChainBaskets.get(basketId);
    if (!basket) {
      throw new Error(`Cross-chain basket ${basketId} not found`);
    }

    // Rebalance to target weights
    const rebalancedAssets = basket.assets.map((asset) => ({
      ...asset,
      weight: asset.targetWeight,
      value: basket.totalValue * asset.targetWeight,
    }));

    const updatedBasket: CrossChainAssetBasket = {
      ...basket,
      assets: rebalancedAssets,
      status: 'active',
    };

    this.crossChainBaskets.set(basketId, updatedBasket);
    return updatedBasket;
  }

  // ============================================================================
  // Layer Status & Events
  // ============================================================================

  getLayerStatus(): MonetaryCoordinationLayerStatus {
    const layers = Array.from(this.monetaryLayers.values());
    const tokens = Array.from(this.protocolTokens.values());
    const sovereignAssets = Array.from(this.sovereignAssets.values());
    const treasuries = Array.from(this.treasuryReserves.values());
    const yields = Array.from(this.yieldInstruments.values());
    const baskets = Array.from(this.crossChainBaskets.values());

    const totalSupply = layers.reduce((sum, l) => sum + l.totalSupply, 0) +
                        tokens.reduce((sum, t) => sum + t.totalSupply, 0);
    const totalReserve = layers.reduce((sum, l) => sum + l.reserveBacking, 0);
    const avgInflation = tokens.length > 0
      ? tokens.reduce((sum, t) => sum + t.currentInflation, 0) / tokens.length
      : this.config.inflationTarget;

    return {
      activeMonetaryLayers: layers.filter((l) => l.status === 'active').length,
      totalMonetarySupply: totalSupply,
      totalReserveBacking: totalReserve,
      activeSovereignAssets: sovereignAssets.filter((a) => a.status !== 'restricted').length,
      totalTreasuryValue: treasuries.reduce((sum, t) => sum + t.totalValue, 0),
      activeYieldInstruments: yields.filter((y) => y.status === 'active').length,
      activeBaskets: baskets.filter((b) => b.status === 'active').length,
      systemInflationRate: avgInflation,
      systemStabilityScore: this.computeSystemStabilityScore(),
    };
  }

  onEvent(callback: GAEIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private computeStabilityScore(assets: TreasuryAsset[]): number {
    if (assets.length === 0) return 0;

    // Higher proportion of stable assets = higher score
    const stableAssetTypes = ['stablecoin', 'treasury_bond', 'liquid_yield'];
    const stableValue = assets
      .filter((a) => stableAssetTypes.includes(a.assetType))
      .reduce((sum, a) => sum + a.value, 0);
    const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

    return totalValue > 0 ? Math.round((stableValue / totalValue) * 100) : 0;
  }

  private computeLiquidityScore(assets: TreasuryAsset[]): number {
    if (assets.length === 0) return 0;

    const liquidityWeights: Record<TreasuryAsset['liquidityClass'], number> = {
      instant: 100,
      same_day: 80,
      multi_day: 50,
      locked: 20,
    };

    const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
    if (totalValue === 0) return 0;

    const weightedScore = assets.reduce((sum, a) => {
      return sum + (a.value / totalValue) * liquidityWeights[a.liquidityClass];
    }, 0);

    return Math.round(weightedScore);
  }

  private computeYieldGeneration(assets: TreasuryAsset[]): number {
    if (assets.length === 0) return 0;

    const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
    if (totalValue === 0) return 0;

    const weightedYield = assets.reduce((sum, a) => {
      return sum + (a.value / totalValue) * a.yieldRate;
    }, 0);

    return weightedYield;
  }

  private computeSystemStabilityScore(): number {
    const treasuries = Array.from(this.treasuryReserves.values());
    if (treasuries.length === 0) return this.config.stabilityThreshold;

    const avgStability = treasuries.reduce((sum, t) => sum + t.stabilityScore, 0) / treasuries.length;
    return Math.round(avgStability);
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
      source: 'monetary_coordination_layer',
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

export function createMonetaryCoordinationLayer(
  config?: Partial<MonetaryCoordinationConfig>
): DefaultMonetaryCoordinationLayer {
  return new DefaultMonetaryCoordinationLayer(config);
}
