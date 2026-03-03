/**
 * TONAIAgent - Cross-Chain Prime Brokerage
 *
 * Multi-chain capital management, cross-chain collateral,
 * bridge-aware margin logic for prime brokerage operations
 * spanning TON and other major blockchain networks.
 */

import {
  CrossChainCapitalPosition,
  ChainProtocolPosition,
  CrossChainCollateral,
  BridgeAwareMarginLogic,
  MultiChainCapitalRouter,
  CrossChainBrokerageConfig,
  ChainId,
  FundId,
  AssetId,
  PrimeBrokerageEvent,
  PrimeBrokerageEventCallback,
} from './types';

// ============================================================================
// Cross-Chain Prime Brokerage Interface
// ============================================================================

export interface CrossChainPrimeBrokerageManager {
  readonly config: CrossChainBrokerageConfig;

  // Multi-Chain Capital Positions
  registerChainPosition(params: RegisterChainPositionParams): CrossChainCapitalPosition;
  updateChainPosition(positionId: string, update: ChainPositionUpdate): CrossChainCapitalPosition;
  getChainPosition(positionId: string): CrossChainCapitalPosition | undefined;
  listChainPositions(fundId?: FundId, chain?: ChainId): CrossChainCapitalPosition[];
  getConsolidatedCapital(fundId: FundId): ConsolidatedCapital;

  // Cross-Chain Collateral
  bridgeCollateral(params: BridgeCollateralParams): CrossChainCollateral;
  recallCrossChainCollateral(collateralId: string): CrossChainCollateral;
  getCrossChainCollateral(collateralId: string): CrossChainCollateral | undefined;
  listCrossChainCollateral(filters?: CollateralBridgeFilters): CrossChainCollateral[];

  // Bridge-Aware Margin Logic
  calculateBridgeAwareMargin(
    assetId: AssetId,
    sourceChain: ChainId,
    targetChain: ChainId
  ): BridgeAwareMarginLogic;
  getBridgeAwareMarginLogic(assetId: AssetId): BridgeAwareMarginLogic | undefined;

  // Multi-Chain Capital Routing
  routeCapital(params: RouteCapitalParams): MultiChainCapitalRouter;
  getCapitalRoute(routeId: string): MultiChainCapitalRouter | undefined;
  listCapitalRoutes(filters?: RouteFilters): MultiChainCapitalRouter[];
  cancelCapitalRoute(routeId: string): MultiChainCapitalRouter;

  // Analytics & Optimization
  getMultiChainSummary(): MultiChainSummary;
  getBridgeCostAnalysis(sourceChain: ChainId, targetChain: ChainId, assetId: AssetId, amount: number): BridgeCostAnalysis;
  getOptimalBridgeRoute(sourceChain: ChainId, targetChain: ChainId, assetId: AssetId): BridgeRouteRecommendation;

  // Events
  onEvent(callback: PrimeBrokerageEventCallback): void;
}

export interface RegisterChainPositionParams {
  fundId: FundId;
  chain: ChainId;
  totalCapital: number;
  availableCapital: number;
  currency: string;
  protocols?: ChainProtocolPosition[];
}

export interface ChainPositionUpdate {
  totalCapital?: number;
  availableCapital?: number;
  protocols?: ChainProtocolPosition[];
}

export interface BridgeCollateralParams {
  assetId: AssetId;
  sourceChain: ChainId;
  targetChain: ChainId;
  amount: number;
  bridgeName?: string;
}

export interface CollateralBridgeFilters {
  sourceChain?: ChainId;
  targetChain?: ChainId;
  assetId?: AssetId;
  status?: CrossChainCollateral['status'];
}

export interface RouteCapitalParams {
  fundId: FundId;
  sourceChain: ChainId;
  targetChain: ChainId;
  assetId: AssetId;
  amount: number;
  reason: string;
  urgency?: 'immediate' | 'normal' | 'low';
}

export interface RouteFilters {
  fundId?: FundId;
  sourceChain?: ChainId;
  targetChain?: ChainId;
  status?: MultiChainCapitalRouter['status'];
}

export interface ConsolidatedCapital {
  fundId: FundId;
  totalCapitalAllChains: number;
  availableCapitalAllChains: number;
  currency: string;
  byChain: {
    chain: ChainId;
    totalCapital: number;
    availableCapital: number;
    percentOfTotal: number;
    bridgeCostToMainChain: number;
  }[];
  crossChainCollateralValue: number;
  effectiveLeverage: number;
  updatedAt: Date;
}

export interface MultiChainSummary {
  enabledChains: ChainId[];
  totalCapitalAllChains: number;
  totalPositionsAllChains: number;
  pendingBridgeTransactions: number;
  avgBridgeFeePercent: number;
  capitalByChain: Record<ChainId, number>;
  bridgeUtilization: BridgeUtilization[];
  updatedAt: Date;
}

export interface BridgeUtilization {
  bridgeName: string;
  sourceChain: ChainId;
  targetChain: ChainId;
  volumeLast24h: number;
  transactionCount: number;
  avgFeePercent: number;
  avgTimeMinutes: number;
}

export interface BridgeCostAnalysis {
  sourceChain: ChainId;
  targetChain: ChainId;
  assetId: AssetId;
  amount: number;
  estimatedFee: number;
  estimatedFeePercent: number;
  estimatedTimeMinutes: number;
  alternatives: BridgeAlternative[];
  recommendation: string;
}

export interface BridgeAlternative {
  bridgeName: string;
  fee: number;
  feePercent: number;
  timeMinutes: number;
  securityScore: number;
}

export interface BridgeRouteRecommendation {
  sourceChain: ChainId;
  targetChain: ChainId;
  recommendedBridge: string;
  estimatedFee: number;
  estimatedFeePercent: number;
  estimatedTimeMinutes: number;
  securityScore: number;
  reasoning: string;
}

// ============================================================================
// Known Bridge Data
// ============================================================================

interface BridgeData {
  name: string;
  sourceChain: ChainId;
  targetChain: ChainId;
  feePercent: number; // Basis points / 100
  timeMinutes: number;
  securityScore: number;
  maxTransferUSD: number;
}

const KNOWN_BRIDGES: BridgeData[] = [
  {
    name: 'TON Bridge (Official)',
    sourceChain: 'ton',
    targetChain: 'ethereum',
    feePercent: 0.001, // 10bps
    timeMinutes: 30,
    securityScore: 95,
    maxTransferUSD: 10000000,
  },
  {
    name: 'TON Bridge (Official)',
    sourceChain: 'ethereum',
    targetChain: 'ton',
    feePercent: 0.001,
    timeMinutes: 30,
    securityScore: 95,
    maxTransferUSD: 10000000,
  },
  {
    name: 'Orbit Bridge',
    sourceChain: 'ton',
    targetChain: 'polygon',
    feePercent: 0.002,
    timeMinutes: 15,
    securityScore: 80,
    maxTransferUSD: 5000000,
  },
  {
    name: 'LayerZero',
    sourceChain: 'ethereum',
    targetChain: 'polygon',
    feePercent: 0.0015,
    timeMinutes: 5,
    securityScore: 90,
    maxTransferUSD: 50000000,
  },
  {
    name: 'Stargate Finance',
    sourceChain: 'ethereum',
    targetChain: 'arbitrum',
    feePercent: 0.0006,
    timeMinutes: 10,
    securityScore: 88,
    maxTransferUSD: 30000000,
  },
];

// ============================================================================
// Default Cross-Chain Prime Brokerage Manager Implementation
// ============================================================================

const DEFAULT_CROSSCHAIN_CONFIG: CrossChainBrokerageConfig = {
  enabledChains: ['ton', 'ethereum', 'polygon', 'arbitrum'],
  maxBridgeFeePercent: 0.005, // 50bps max
  maxBridgeTimeMinutes: 120,
  crossChainCollateralEnabled: true,
  crossChainMarginCreditFactor: 0.85, // 15% discount for cross-chain collateral
  preferredBridges: {
    'ton_ethereum': 'TON Bridge (Official)',
    'ethereum_polygon': 'Stargate Finance',
    'ethereum_arbitrum': 'Stargate Finance',
  },
};

export class DefaultCrossChainPrimeBrokerageManager implements CrossChainPrimeBrokerageManager {
  readonly config: CrossChainBrokerageConfig;

  private readonly chainPositions: Map<string, CrossChainCapitalPosition> = new Map();
  private readonly crossChainCollateral: Map<string, CrossChainCollateral> = new Map();
  private readonly bridgeAwareMarginLogic: Map<AssetId, BridgeAwareMarginLogic> = new Map();
  private readonly capitalRoutes: Map<string, MultiChainCapitalRouter> = new Map();
  private readonly eventCallbacks: PrimeBrokerageEventCallback[] = [];

  constructor(config?: Partial<CrossChainBrokerageConfig>) {
    this.config = { ...DEFAULT_CROSSCHAIN_CONFIG, ...config };
  }

  // ============================================================================
  // Multi-Chain Capital Positions
  // ============================================================================

  registerChainPosition(params: RegisterChainPositionParams): CrossChainCapitalPosition {
    // Calculate bridge costs to TON (main chain)
    const bridgeCostEstimate = params.chain !== 'ton'
      ? params.totalCapital * 0.001 // 10bps to bridge back to TON
      : 0;

    const position: CrossChainCapitalPosition = {
      id: `chain_pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fundId: params.fundId,
      chain: params.chain,
      totalCapital: params.totalCapital,
      availableCapital: params.availableCapital,
      currency: params.currency,
      protocols: params.protocols ?? [],
      bridgeCosts: bridgeCostEstimate,
      lastSyncedAt: new Date(),
    };

    this.chainPositions.set(position.id, position);

    this.emitEvent('info', 'cross_chain_brokerage', `Chain position registered: ${params.chain}`, {
      positionId: position.id,
      fundId: params.fundId,
      chain: params.chain,
      totalCapital: params.totalCapital,
    });

    return position;
  }

  updateChainPosition(positionId: string, update: ChainPositionUpdate): CrossChainCapitalPosition {
    const position = this.chainPositions.get(positionId);
    if (!position) {
      throw new Error(`Chain position not found: ${positionId}`);
    }

    if (update.totalCapital !== undefined) position.totalCapital = update.totalCapital;
    if (update.availableCapital !== undefined) position.availableCapital = update.availableCapital;
    if (update.protocols !== undefined) position.protocols = update.protocols;
    position.lastSyncedAt = new Date();

    this.chainPositions.set(positionId, position);
    return position;
  }

  getChainPosition(positionId: string): CrossChainCapitalPosition | undefined {
    return this.chainPositions.get(positionId);
  }

  listChainPositions(fundId?: FundId, chain?: ChainId): CrossChainCapitalPosition[] {
    let positions = Array.from(this.chainPositions.values());

    if (fundId) {
      positions = positions.filter(p => p.fundId === fundId);
    }
    if (chain) {
      positions = positions.filter(p => p.chain === chain);
    }

    return positions;
  }

  getConsolidatedCapital(fundId: FundId): ConsolidatedCapital {
    const positions = this.listChainPositions(fundId);
    const collateral = Array.from(this.crossChainCollateral.values())
      .filter(c => c.status === 'active');

    const totalCapital = positions.reduce((sum, p) => sum + p.totalCapital, 0);
    const availableCapital = positions.reduce((sum, p) => sum + p.availableCapital, 0);
    const crossChainCollateralValue = collateral.reduce((sum, c) => sum + c.bridgedValue, 0);

    const byChain = positions.map(pos => ({
      chain: pos.chain,
      totalCapital: pos.totalCapital,
      availableCapital: pos.availableCapital,
      percentOfTotal: totalCapital > 0 ? (pos.totalCapital / totalCapital) * 100 : 0,
      bridgeCostToMainChain: pos.bridgeCosts,
    }));

    return {
      fundId,
      totalCapitalAllChains: totalCapital,
      availableCapitalAllChains: availableCapital,
      currency: 'USD',
      byChain,
      crossChainCollateralValue,
      effectiveLeverage: totalCapital > 0
        ? (totalCapital - availableCapital) / totalCapital
        : 0,
      updatedAt: new Date(),
    };
  }

  // ============================================================================
  // Cross-Chain Collateral
  // ============================================================================

  bridgeCollateral(params: BridgeCollateralParams): CrossChainCollateral {
    if (!this.config.crossChainCollateralEnabled) {
      throw new Error('Cross-chain collateral bridging is disabled');
    }

    const bridgeKey = `${params.sourceChain}_${params.targetChain}`;
    const preferredBridge = this.config.preferredBridges[bridgeKey];

    const bridgeData = KNOWN_BRIDGES.find(
      b =>
        b.sourceChain === params.sourceChain &&
        b.targetChain === params.targetChain &&
        (!params.bridgeName || b.name === params.bridgeName || b.name === preferredBridge)
    );

    const bridgeFeePercent = bridgeData?.feePercent ?? this.config.maxBridgeFeePercent;
    const bridgeFee = params.amount * bridgeFeePercent;
    const bridgedValue = params.amount - bridgeFee;
    const marginCredit = bridgedValue * this.config.crossChainMarginCreditFactor;

    const collateral: CrossChainCollateral = {
      id: `xchain_col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId: params.assetId,
      sourceChain: params.sourceChain,
      targetChain: params.targetChain,
      amount: params.amount,
      bridgedValue,
      bridgeFee,
      marginCredit,
      status: 'pending_bridge',
      initiatedAt: new Date(),
    };

    this.crossChainCollateral.set(collateral.id, collateral);

    // Simulate bridge completion (in production, would be async)
    setTimeout(() => {
      const col = this.crossChainCollateral.get(collateral.id);
      if (col && col.status === 'pending_bridge') {
        col.status = 'active';
        col.bridgedAt = new Date();
        this.crossChainCollateral.set(collateral.id, col);

        this.emitEvent('info', 'cross_chain_brokerage', `Cross-chain collateral bridged: ${collateral.id}`, {
          collateralId: collateral.id,
          sourceChain: params.sourceChain,
          targetChain: params.targetChain,
          bridgedValue,
          marginCredit,
        });
      }
    }, 100);

    this.emitEvent('info', 'cross_chain_brokerage', `Collateral bridging initiated: ${collateral.id}`, {
      assetId: params.assetId,
      sourceChain: params.sourceChain,
      targetChain: params.targetChain,
      amount: params.amount,
      bridgeFee,
    });

    return collateral;
  }

  recallCrossChainCollateral(collateralId: string): CrossChainCollateral {
    const collateral = this.crossChainCollateral.get(collateralId);
    if (!collateral) {
      throw new Error(`Cross-chain collateral not found: ${collateralId}`);
    }

    collateral.status = 'recalled';
    this.crossChainCollateral.set(collateralId, collateral);

    this.emitEvent('info', 'cross_chain_brokerage', `Cross-chain collateral recalled: ${collateralId}`, {
      collateralId,
      sourceChain: collateral.sourceChain,
      targetChain: collateral.targetChain,
    });

    return collateral;
  }

  getCrossChainCollateral(collateralId: string): CrossChainCollateral | undefined {
    return this.crossChainCollateral.get(collateralId);
  }

  listCrossChainCollateral(filters?: CollateralBridgeFilters): CrossChainCollateral[] {
    let collaterals = Array.from(this.crossChainCollateral.values());

    if (filters) {
      if (filters.sourceChain) {
        collaterals = collaterals.filter(c => c.sourceChain === filters.sourceChain);
      }
      if (filters.targetChain) {
        collaterals = collaterals.filter(c => c.targetChain === filters.targetChain);
      }
      if (filters.assetId) {
        collaterals = collaterals.filter(c => c.assetId === filters.assetId);
      }
      if (filters.status) {
        collaterals = collaterals.filter(c => c.status === filters.status);
      }
    }

    return collaterals;
  }

  // ============================================================================
  // Bridge-Aware Margin Logic
  // ============================================================================

  calculateBridgeAwareMargin(
    assetId: AssetId,
    sourceChain: ChainId,
    targetChain: ChainId
  ): BridgeAwareMarginLogic {
    const bridge = KNOWN_BRIDGES.find(
      b => b.sourceChain === sourceChain && b.targetChain === targetChain
    );

    const bridgeFeePercent = bridge?.feePercent ?? 0.002;
    const bridgeTimeHours = bridge ? bridge.timeMinutes / 60 : 2;

    // LTV discount based on bridge fee and time
    const feeImpact = 1 - bridgeFeePercent;
    const timeImpact = bridgeTimeHours > 4 ? 0.9 : bridgeTimeHours > 1 ? 0.95 : 1.0;
    const effectiveLTV = feeImpact * timeImpact * 0.75; // Base 75% LTV for cross-chain

    const marginCreditFactor = this.config.crossChainMarginCreditFactor;

    const logic: BridgeAwareMarginLogic = {
      assetId,
      nativeChain: sourceChain,
      targetChain,
      bridgeTime: bridgeTimeHours,
      bridgeFeePercent,
      effectiveLTV,
      marginCreditFactor,
    };

    this.bridgeAwareMarginLogic.set(assetId, logic);

    return logic;
  }

  getBridgeAwareMarginLogic(assetId: AssetId): BridgeAwareMarginLogic | undefined {
    return this.bridgeAwareMarginLogic.get(assetId);
  }

  // ============================================================================
  // Multi-Chain Capital Routing
  // ============================================================================

  routeCapital(params: RouteCapitalParams): MultiChainCapitalRouter {
    const bridgeKey = `${params.sourceChain}_${params.targetChain}`;
    const preferredBridge = this.config.preferredBridges[bridgeKey];

    const bridge = KNOWN_BRIDGES.find(
      b =>
        b.sourceChain === params.sourceChain &&
        b.targetChain === params.targetChain &&
        (!preferredBridge || b.name === preferredBridge)
    );

    if (!bridge && params.sourceChain !== params.targetChain) {
      throw new Error(
        `No bridge found from ${params.sourceChain} to ${params.targetChain}`
      );
    }

    const bridgeFee = bridge ? params.amount * bridge.feePercent : 0;
    const estimatedTime = bridge?.timeMinutes ?? 0;

    const route: MultiChainCapitalRouter = {
      id: `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceChain: params.sourceChain,
      targetChain: params.targetChain,
      asset: params.assetId,
      amount: params.amount,
      estimatedBridgeFee: bridgeFee,
      estimatedTime,
      routeVia: bridge?.name ?? 'direct',
      reason: params.reason,
      status: 'routing',
      initiatedAt: new Date(),
    };

    this.capitalRoutes.set(route.id, route);

    // Simulate routing completion
    setTimeout(() => {
      const r = this.capitalRoutes.get(route.id);
      if (r && r.status === 'routing') {
        r.status = 'bridging';
        this.capitalRoutes.set(route.id, r);
      }
    }, 100);

    this.emitEvent('info', 'cross_chain_brokerage', `Capital routing initiated: ${route.id}`, {
      fundId: params.fundId,
      sourceChain: params.sourceChain,
      targetChain: params.targetChain,
      amount: params.amount,
      bridge: bridge?.name ?? 'direct',
      reason: params.reason,
    });

    return route;
  }

  getCapitalRoute(routeId: string): MultiChainCapitalRouter | undefined {
    return this.capitalRoutes.get(routeId);
  }

  listCapitalRoutes(filters?: RouteFilters): MultiChainCapitalRouter[] {
    let routes = Array.from(this.capitalRoutes.values());

    if (filters) {
      if (filters.fundId) {
        // In production, routes would track fundId
      }
      if (filters.sourceChain) {
        routes = routes.filter(r => r.sourceChain === filters.sourceChain);
      }
      if (filters.targetChain) {
        routes = routes.filter(r => r.targetChain === filters.targetChain);
      }
      if (filters.status) {
        routes = routes.filter(r => r.status === filters.status);
      }
    }

    return routes;
  }

  cancelCapitalRoute(routeId: string): MultiChainCapitalRouter {
    const route = this.capitalRoutes.get(routeId);
    if (!route) {
      throw new Error(`Capital route not found: ${routeId}`);
    }

    if (route.status === 'bridging' || route.status === 'completed') {
      throw new Error(`Cannot cancel route in status: ${route.status}`);
    }

    route.status = 'failed';
    this.capitalRoutes.set(routeId, route);

    return route;
  }

  // ============================================================================
  // Analytics & Optimization
  // ============================================================================

  getMultiChainSummary(): MultiChainSummary {
    const positions = Array.from(this.chainPositions.values());
    const routes = Array.from(this.capitalRoutes.values());
    const pending = routes.filter(r => r.status === 'routing' || r.status === 'bridging').length;

    const capitalByChain: Partial<Record<ChainId, number>> = {};
    for (const pos of positions) {
      capitalByChain[pos.chain] = (capitalByChain[pos.chain] ?? 0) + pos.totalCapital;
    }

    const totalCapital = Object.values(capitalByChain).reduce((sum, v) => sum + (v ?? 0), 0);

    const bridgeUtilization: BridgeUtilization[] = KNOWN_BRIDGES.slice(0, 3).map(b => ({
      bridgeName: b.name,
      sourceChain: b.sourceChain,
      targetChain: b.targetChain,
      volumeLast24h: totalCapital * 0.05,
      transactionCount: Math.floor(Math.random() * 20) + 5,
      avgFeePercent: b.feePercent * 100,
      avgTimeMinutes: b.timeMinutes,
    }));

    return {
      enabledChains: this.config.enabledChains,
      totalCapitalAllChains: totalCapital,
      totalPositionsAllChains: positions.length,
      pendingBridgeTransactions: pending,
      avgBridgeFeePercent: KNOWN_BRIDGES.reduce((sum, b) => sum + b.feePercent, 0) / KNOWN_BRIDGES.length * 100,
      capitalByChain: capitalByChain as Record<ChainId, number>,
      bridgeUtilization,
      updatedAt: new Date(),
    };
  }

  getBridgeCostAnalysis(
    sourceChain: ChainId,
    targetChain: ChainId,
    assetId: AssetId,
    amount: number
  ): BridgeCostAnalysis {
    const applicableBridges = KNOWN_BRIDGES.filter(
      b => b.sourceChain === sourceChain && b.targetChain === targetChain
    );

    if (applicableBridges.length === 0) {
      return {
        sourceChain,
        targetChain,
        assetId,
        amount,
        estimatedFee: amount * 0.005,
        estimatedFeePercent: 0.5,
        estimatedTimeMinutes: 60,
        alternatives: [],
        recommendation: 'No direct bridge available; consider using intermediate chain',
      };
    }

    const sorted = [...applicableBridges].sort((a, b) => a.feePercent - b.feePercent);
    const best = sorted[0];

    const alternatives: BridgeAlternative[] = sorted.slice(1).map(b => ({
      bridgeName: b.name,
      fee: amount * b.feePercent,
      feePercent: b.feePercent * 100,
      timeMinutes: b.timeMinutes,
      securityScore: b.securityScore,
    }));

    return {
      sourceChain,
      targetChain,
      assetId,
      amount,
      estimatedFee: amount * best.feePercent,
      estimatedFeePercent: best.feePercent * 100,
      estimatedTimeMinutes: best.timeMinutes,
      alternatives,
      recommendation: `Use ${best.name} for lowest fee (${(best.feePercent * 100).toFixed(2)}%)`,
    };
  }

  getOptimalBridgeRoute(
    sourceChain: ChainId,
    targetChain: ChainId,
    assetId: AssetId
  ): BridgeRouteRecommendation {
    const bridges = KNOWN_BRIDGES.filter(
      b => b.sourceChain === sourceChain && b.targetChain === targetChain
    );

    if (bridges.length === 0) {
      return {
        sourceChain,
        targetChain,
        recommendedBridge: 'none',
        estimatedFee: 0,
        estimatedFeePercent: 0,
        estimatedTimeMinutes: 0,
        securityScore: 0,
        reasoning: 'No bridge available for this route',
      };
    }

    // Score bridges: balance fee, time, and security
    const scored = bridges.map(b => ({
      bridge: b,
      score: b.securityScore * 0.5 - b.feePercent * 10000 * 0.3 - b.timeMinutes / 60 * 10 * 0.2,
    }));

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].bridge;

    return {
      sourceChain,
      targetChain,
      recommendedBridge: best.name,
      estimatedFee: best.feePercent,
      estimatedFeePercent: best.feePercent * 100,
      estimatedTimeMinutes: best.timeMinutes,
      securityScore: best.securityScore,
      reasoning: `${best.name} offers the best balance of security (${best.securityScore}/100), cost (${(best.feePercent * 100).toFixed(2)}%), and speed (${best.timeMinutes}min)`,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PrimeBrokerageEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: PrimeBrokerageEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'cross_chain_bridge',
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

export function createCrossChainPrimeBrokerageManager(
  config?: Partial<CrossChainBrokerageConfig>
): DefaultCrossChainPrimeBrokerageManager {
  return new DefaultCrossChainPrimeBrokerageManager(config);
}
