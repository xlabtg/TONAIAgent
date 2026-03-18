/**
 * TONAIAgent - Capital Efficiency Module
 *
 * Idle capital optimization, yield stacking, cross-fund liquidity,
 * internal liquidity routing. If Agent A is short BTC and Agent B is long BTC,
 * net exposure is optimized internally to maximize capital efficiency.
 */

import {
  IdleCapitalReport,
  FundIdleCapital,
  CapitalOpportunity,
  YieldStack,
  InternalLiquidityRoute,
  CrossFundLiquidityPool,
  FundLiquidityContribution,
  InternalRates,
  CapitalEfficiencyConfig,
  FundId,
  AgentId,
  AssetId,
  PrimeBrokerageEvent,
  PrimeBrokerageEventCallback,
} from './types';

// ============================================================================
// Capital Efficiency Module Interface
// ============================================================================

export interface CapitalEfficiencyModule {
  readonly config: CapitalEfficiencyConfig;

  // Idle Capital Analysis
  analyzeIdleCapital(fundCapitals: FundCapitalSnapshot[]): IdleCapitalReport;
  getIdleCapitalReport(): IdleCapitalReport | undefined;
  identifyOpportunities(idleCapital: number, riskTolerance: number): CapitalOpportunity[];

  // Yield Stacking
  createYieldStack(params: CreateYieldStackParams): YieldStack;
  getYieldStack(stackId: string): YieldStack | undefined;
  listYieldStacks(fundId?: FundId): YieldStack[];
  calculateOptimalYieldStack(assetId: AssetId, capital: number): YieldStackOptimization;

  // Internal Liquidity
  createLiquidityPool(participatingFunds: FundId[], contributions: FundContribution[]): CrossFundLiquidityPool;
  getLiquidityPool(poolId: string): CrossFundLiquidityPool | undefined;
  listLiquidityPools(): CrossFundLiquidityPool[];
  contributeToPool(poolId: string, fundId: FundId, amount: number): FundLiquidityContribution;
  borrowFromPool(poolId: string, fundId: FundId, amount: number): BorrowingRecord;

  // Internal Liquidity Routing
  routeLiquidity(params: RoutingRequest): InternalLiquidityRoute;
  getInternalRoutes(fundId?: FundId): InternalLiquidityRoute[];
  calculateInternalNetting(positions: NettablePosition[]): NettingOptimization;

  // Capital Optimization
  getCapitalEfficiencyScore(): CapitalEfficiencyScore;
  generateOptimizationReport(): CapitalOptimizationReport;

  // Events
  onEvent(callback: PrimeBrokerageEventCallback): void;
}

export interface FundCapitalSnapshot {
  fundId: FundId;
  fundName: string;
  totalCapital: number;
  deployedCapital: number;
  idleCapital: number;
  pendingDeployment: number;
  currency: string;
}

export interface FundContribution {
  fundId: FundId;
  amount: number;
}

export interface BorrowingRecord {
  id: string;
  poolId: string;
  borrowerId: FundId;
  amount: number;
  rate: number;
  borrowedAt: Date;
  dueAt?: Date;
  status: 'active' | 'repaid' | 'overdue';
}

export interface RoutingRequest {
  fromFundId: FundId;
  toFundId: FundId;
  fromAgentId?: AgentId;
  toAgentId?: AgentId;
  assetId: AssetId;
  amount: number;
  reason: string;
}

export interface NettablePosition {
  agentId: AgentId;
  fundId: FundId;
  assetId: AssetId;
  direction: 'long' | 'short';
  size: number;
  value: number;
}

export interface NettingOptimization {
  beforeGrossExposure: number;
  afterNetExposure: number;
  capitalFreed: number;
  efficiencyGainPercent: number;
  internalRoutes: InternalRouteRecommendation[];
  externalCostSaved: number;
}

export interface InternalRouteRecommendation {
  fromAgentId: AgentId;
  toAgentId: AgentId;
  assetId: AssetId;
  amount: number;
  reason: string;
  externalCostSaved: number;
}

export interface YieldStackOptimization {
  assetId: AssetId;
  capital: number;
  baseYield: number;
  layers: YieldLayer[];
  totalOptimalYield: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  estimatedImplementationCost: number;
}

export interface YieldLayer {
  name: string;
  type: 'staking' | 'lending' | 'liquidity_provision' | 'structured';
  additionalYield: number;
  riskScore: number;
  liquidityLockDays: number;
  protocol: string;
}

export interface CapitalEfficiencyScore {
  overallScore: number; // 0-100
  idleCapitalScore: number;
  yieldOptimizationScore: number;
  nettingEfficiencyScore: number;
  poolUtilizationScore: number;
  benchmarkComparison: number; // vs industry avg
  computedAt: Date;
}

export interface CapitalOptimizationReport {
  generatedAt: Date;
  totalCapitalUnderManagement: number;
  idleCapital: number;
  idleCapitalPercent: number;
  potentialYieldIncrease: number; // In absolute terms
  potentialYieldIncreasePercent: number;
  topOpportunities: CapitalOpportunity[];
  internalNettingSavings: number;
  poolEfficiency: number;
  recommendations: string[];
}

// ============================================================================
// Default Capital Efficiency Module Implementation
// ============================================================================

const DEFAULT_EFFICIENCY_CONFIG: CapitalEfficiencyConfig = {
  idleCapitalThreshold: 0.05, // 5% threshold
  yieldStackingEnabled: true,
  crossFundLendingEnabled: true,
  internalRoutingEnabled: true,
  minYieldForDeployment: 0.03, // 3% minimum APY
  maxRiskScoreForDeployment: 60,
};

const YIELD_STACK_PROTOCOLS: YieldLayer[] = [
  {
    name: 'TON Staking',
    type: 'staking',
    additionalYield: 0.04, // 4% APY
    riskScore: 15,
    liquidityLockDays: 0,
    protocol: 'TON Validators',
  },
  {
    name: 'STON.fi LP',
    type: 'liquidity_provision',
    additionalYield: 0.08,
    riskScore: 35,
    liquidityLockDays: 0,
    protocol: 'STON.fi',
  },
  {
    name: 'DeDust Yield Vault',
    type: 'structured',
    additionalYield: 0.06,
    riskScore: 30,
    liquidityLockDays: 7,
    protocol: 'DeDust',
  },
  {
    name: 'Token Lending',
    type: 'lending',
    additionalYield: 0.05,
    riskScore: 25,
    liquidityLockDays: 1,
    protocol: 'Internal PB',
  },
];

export class DefaultCapitalEfficiencyModule implements CapitalEfficiencyModule {
  readonly config: CapitalEfficiencyConfig;

  private readonly yieldStacks: Map<string, YieldStack> = new Map();
  private readonly liquidityPools: Map<string, CrossFundLiquidityPool> = new Map();
  private readonly borrowingRecords: Map<string, BorrowingRecord> = new Map();
  private readonly internalRoutes: InternalLiquidityRoute[] = [];
  private latestIdleCapitalReport?: IdleCapitalReport;
  private readonly eventCallbacks: PrimeBrokerageEventCallback[] = [];

  constructor(config?: Partial<CapitalEfficiencyConfig>) {
    this.config = { ...DEFAULT_EFFICIENCY_CONFIG, ...config };
  }

  // ============================================================================
  // Idle Capital Analysis
  // ============================================================================

  analyzeIdleCapital(fundCapitals: FundCapitalSnapshot[]): IdleCapitalReport {
    const totalIdleCapital = fundCapitals.reduce((sum, f) => sum + f.idleCapital, 0);
    const totalCapital = fundCapitals.reduce((sum, f) => sum + f.totalCapital, 0);
    const idlePercent = totalCapital > 0 ? totalIdleCapital / totalCapital : 0;

    const idleByFund: FundIdleCapital[] = fundCapitals.map(f => ({
      fundId: f.fundId,
      fundName: f.fundName,
      idleAmount: f.idleCapital,
      idlePercent: f.totalCapital > 0 ? f.idleCapital / f.totalCapital : 0,
      deployableAmount: Math.max(0, f.idleCapital - f.totalCapital * this.config.idleCapitalThreshold),
    }));

    const deployableTotal = idleByFund.reduce((sum, f) => sum + f.deployableAmount, 0);
    const opportunities = this.identifyOpportunities(deployableTotal, 0.5);

    const report: IdleCapitalReport = {
      timestamp: new Date(),
      totalIdleCapital,
      idleByFund,
      idlePercent,
      optimizationOpportunities: opportunities,
    };

    this.latestIdleCapitalReport = report;

    if (idlePercent > this.config.idleCapitalThreshold * 3) {
      this.emitEvent('warning', 'capital_efficiency', `High idle capital: ${(idlePercent * 100).toFixed(2)}%`, {
        totalIdleCapital,
        idlePercent,
        deployableAmount: deployableTotal,
      });
    }

    return report;
  }

  getIdleCapitalReport(): IdleCapitalReport | undefined {
    return this.latestIdleCapitalReport;
  }

  identifyOpportunities(idleCapital: number, riskTolerance: number): CapitalOpportunity[] {
    const maxRisk = Math.round(riskTolerance * 100);
    const opportunities: CapitalOpportunity[] = [];

    if (!this.config.yieldStackingEnabled && !this.config.crossFundLendingEnabled) {
      return opportunities;
    }

    // Yield stacking opportunity
    if (this.config.yieldStackingEnabled && idleCapital > 1000) {
      opportunities.push({
        id: `opp_yield_${Date.now()}`,
        type: 'yield_stacking',
        description: 'Deploy idle capital into multi-layer yield stacking strategy',
        estimatedYield: 0.12, // 12% APY blended
        estimatedCapital: idleCapital * 0.6,
        riskScore: 35,
        timeHorizon: 'short_term',
        recommendedAction: 'Activate TON Staking + STON.fi LP yield stack',
      });
    }

    // Cross-fund lending opportunity
    if (this.config.crossFundLendingEnabled && idleCapital > 5000) {
      opportunities.push({
        id: `opp_lending_${Date.now()}`,
        type: 'cross_fund_lending',
        description: 'Lend idle capital to other funds via internal liquidity pool',
        estimatedYield: 0.06, // 6% APY
        estimatedCapital: idleCapital * 0.3,
        riskScore: 20,
        timeHorizon: 'immediate',
        recommendedAction: 'Add capital to internal cross-fund lending pool',
      });
    }

    // Strategy deployment
    if (idleCapital > 10000) {
      opportunities.push({
        id: `opp_strategy_${Date.now()}`,
        type: 'strategy_deployment',
        description: 'Deploy capital into arbitrage or yield farming strategy',
        estimatedYield: 0.15,
        estimatedCapital: idleCapital * 0.4,
        riskScore: Math.min(maxRisk, 50),
        timeHorizon: 'short_term',
        recommendedAction: 'Allocate to delta-neutral arbitrage strategy',
      });
    }

    // Collateral optimization
    opportunities.push({
      id: `opp_collateral_${Date.now()}`,
      type: 'collateral_optimization',
      description: 'Use idle capital as collateral to increase system leverage',
      estimatedYield: 0.03, // Indirect benefit via reduced borrowing costs
      estimatedCapital: idleCapital * 0.2,
      riskScore: 10,
      timeHorizon: 'immediate',
      recommendedAction: 'Add to collateral pool to reduce borrowing costs',
    });

    // Filter by risk tolerance
    return opportunities.filter(o => o.riskScore <= maxRisk);
  }

  // ============================================================================
  // Yield Stacking
  // ============================================================================

  createYieldStack(params: CreateYieldStackParams): YieldStack {
    const stack: YieldStack = {
      id: `ys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fundId: params.fundId,
      assetId: params.assetId,
      baseYield: params.baseYield,
      stakingYield: params.stakingYield ?? 0,
      lendingYield: params.lendingYield ?? 0,
      liquidityYield: params.liquidityYield ?? 0,
      totalYield: params.baseYield + (params.stakingYield ?? 0) + (params.lendingYield ?? 0) + (params.liquidityYield ?? 0),
      capital: params.capital,
      createdAt: new Date(),
    };

    this.yieldStacks.set(stack.id, stack);

    this.emitEvent('info', 'capital_efficiency', `Yield stack created: ${stack.id}`, {
      fundId: params.fundId,
      assetId: params.assetId,
      totalYield: stack.totalYield,
      capital: params.capital,
    });

    return stack;
  }

  getYieldStack(stackId: string): YieldStack | undefined {
    return this.yieldStacks.get(stackId);
  }

  listYieldStacks(fundId?: FundId): YieldStack[] {
    const all = Array.from(this.yieldStacks.values());
    if (fundId) {
      return all.filter(s => s.fundId === fundId);
    }
    return all;
  }

  calculateOptimalYieldStack(assetId: AssetId, capital: number): YieldStackOptimization {
    const baseYield = 0.02; // Assumed 2% base yield from holding
    const suitableLayers = YIELD_STACK_PROTOCOLS.filter(
      l => l.riskScore <= this.config.maxRiskScoreForDeployment
    );

    const totalAdditionalYield = suitableLayers.reduce((sum, l) => sum + l.additionalYield, 0);
    const totalYield = baseYield + totalAdditionalYield;

    const implementationCost = capital * 0.005; // Estimated 0.5% one-time cost

    return {
      assetId,
      capital,
      baseYield,
      layers: suitableLayers,
      totalOptimalYield: totalYield,
      implementationComplexity: suitableLayers.length > 3 ? 'high' : suitableLayers.length > 1 ? 'medium' : 'low',
      estimatedImplementationCost: implementationCost,
    };
  }

  // ============================================================================
  // Internal Liquidity
  // ============================================================================

  createLiquidityPool(participatingFunds: FundId[], contributions: FundContribution[]): CrossFundLiquidityPool {
    const totalLiquidity = contributions.reduce((sum, c) => sum + c.amount, 0);

    const fundContributions: FundLiquidityContribution[] = contributions.map(c => ({
      fundId: c.fundId,
      contributed: c.amount,
      borrowed: 0,
      netPosition: c.amount,
    }));

    const rates: InternalRates = {
      borrowingRate: 0.04, // 4% APY
      lendingRate: 0.05, // 5% APY
      spreadPercent: 1.0, // 100bps spread
    };

    const pool: CrossFundLiquidityPool = {
      id: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participatingFunds,
      totalLiquidity,
      availableLiquidity: totalLiquidity,
      utilizationRate: 0,
      contributions: fundContributions,
      internalRates: rates,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.liquidityPools.set(pool.id, pool);

    this.emitEvent('info', 'capital_efficiency', `Cross-fund liquidity pool created: ${pool.id}`, {
      participatingFunds: participatingFunds.length,
      totalLiquidity,
    });

    return pool;
  }

  getLiquidityPool(poolId: string): CrossFundLiquidityPool | undefined {
    return this.liquidityPools.get(poolId);
  }

  listLiquidityPools(): CrossFundLiquidityPool[] {
    return Array.from(this.liquidityPools.values());
  }

  contributeToPool(poolId: string, fundId: FundId, amount: number): FundLiquidityContribution {
    const pool = this.liquidityPools.get(poolId);
    if (!pool) {
      throw new Error(`Liquidity pool not found: ${poolId}`);
    }

    const existing = pool.contributions.find(c => c.fundId === fundId);
    if (existing) {
      existing.contributed += amount;
      existing.netPosition = existing.contributed - existing.borrowed;
    } else {
      pool.contributions.push({
        fundId,
        contributed: amount,
        borrowed: 0,
        netPosition: amount,
      });
    }

    pool.totalLiquidity += amount;
    pool.availableLiquidity += amount;
    pool.utilizationRate = (pool.totalLiquidity - pool.availableLiquidity) / pool.totalLiquidity;
    pool.updatedAt = new Date();
    this.liquidityPools.set(poolId, pool);

    return pool.contributions.find(c => c.fundId === fundId)!;
  }

  borrowFromPool(poolId: string, fundId: FundId, amount: number): BorrowingRecord {
    const pool = this.liquidityPools.get(poolId);
    if (!pool) {
      throw new Error(`Liquidity pool not found: ${poolId}`);
    }

    if (amount > pool.availableLiquidity) {
      throw new Error(`Insufficient pool liquidity: requested ${amount}, available ${pool.availableLiquidity}`);
    }

    const contribution = pool.contributions.find(c => c.fundId === fundId);
    if (contribution) {
      contribution.borrowed += amount;
      contribution.netPosition = contribution.contributed - contribution.borrowed;
    } else {
      pool.contributions.push({
        fundId,
        contributed: 0,
        borrowed: amount,
        netPosition: -amount,
      });
    }

    pool.availableLiquidity -= amount;
    pool.utilizationRate = (pool.totalLiquidity - pool.availableLiquidity) / pool.totalLiquidity;
    pool.updatedAt = new Date();
    this.liquidityPools.set(poolId, pool);

    const record: BorrowingRecord = {
      id: `borrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      poolId,
      borrowerId: fundId,
      amount,
      rate: pool.internalRates.borrowingRate,
      borrowedAt: new Date(),
      status: 'active',
    };

    this.borrowingRecords.set(record.id, record);

    this.emitEvent('info', 'capital_efficiency', `Capital borrowed from pool: ${poolId}`, {
      poolId,
      borrowerId: fundId,
      amount,
      rate: pool.internalRates.borrowingRate,
    });

    return record;
  }

  // ============================================================================
  // Internal Liquidity Routing
  // ============================================================================

  routeLiquidity(params: RoutingRequest): InternalLiquidityRoute {
    const externalCost = params.amount * 0.003; // 30bps external trading cost
    const internalCost = params.amount * 0.0005; // 5bps internal routing cost
    const savings = externalCost - internalCost;

    const route: InternalLiquidityRoute = {
      id: `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromFundId: params.fromFundId,
      toFundId: params.toFundId,
      fromAgentId: params.fromAgentId,
      toAgentId: params.toAgentId,
      assetId: params.assetId,
      amount: params.amount,
      notionalValue: params.amount, // Simplified: value = amount
      reason: params.reason,
      savingsVsExternal: savings,
      executedAt: new Date(),
    };

    this.internalRoutes.push(route);

    this.emitEvent('info', 'capital_efficiency', 'Internal liquidity routed', {
      fromFundId: params.fromFundId,
      toFundId: params.toFundId,
      amount: params.amount,
      savings,
    });

    return route;
  }

  getInternalRoutes(fundId?: FundId): InternalLiquidityRoute[] {
    if (fundId) {
      return this.internalRoutes.filter(
        r => r.fromFundId === fundId || r.toFundId === fundId
      );
    }
    return [...this.internalRoutes];
  }

  calculateInternalNetting(positions: NettablePosition[]): NettingOptimization {
    // Group positions by asset
    const byAsset = new Map<AssetId, { longs: NettablePosition[]; shorts: NettablePosition[] }>();

    for (const pos of positions) {
      const existing = byAsset.get(pos.assetId) ?? { longs: [], shorts: [] };
      if (pos.direction === 'long') {
        existing.longs.push(pos);
      } else {
        existing.shorts.push(pos);
      }
      byAsset.set(pos.assetId, existing);
    }

    const routes: InternalRouteRecommendation[] = [];
    let totalCapitalFreed = 0;
    let externalCostSaved = 0;

    for (const [assetId, { longs, shorts }] of byAsset.entries()) {
      const totalLong = longs.reduce((sum, p) => sum + p.value, 0);
      const totalShort = shorts.reduce((sum, p) => sum + p.value, 0);
      const nettableAmount = Math.min(totalLong, totalShort);

      if (nettableAmount > 0) {
        totalCapitalFreed += nettableAmount * 2; // Both long and short capital is freed
        const cost = nettableAmount * 0.003; // 30bps external cost avoided
        externalCostSaved += cost;

        // Create routing recommendations
        for (const long of longs) {
          for (const short of shorts) {
            if (long.fundId !== short.fundId) {
              const routeAmount = Math.min(long.value, short.value);
              routes.push({
                fromAgentId: short.agentId,
                toAgentId: long.agentId,
                assetId,
                amount: routeAmount,
                reason: `Internal netting: offsetting ${assetId} exposure between funds`,
                externalCostSaved: routeAmount * 0.003,
              });
              break;
            }
          }
        }
      }
    }

    const beforeGross = positions.reduce((sum, p) => sum + p.value, 0);
    const afterNet = beforeGross - totalCapitalFreed;
    const efficiencyGain = beforeGross > 0 ? ((beforeGross - afterNet) / beforeGross) * 100 : 0;

    return {
      beforeGrossExposure: beforeGross,
      afterNetExposure: afterNet,
      capitalFreed: totalCapitalFreed,
      efficiencyGainPercent: efficiencyGain,
      internalRoutes: routes,
      externalCostSaved,
    };
  }

  // ============================================================================
  // Capital Optimization
  // ============================================================================

  getCapitalEfficiencyScore(): CapitalEfficiencyScore {
    const report = this.latestIdleCapitalReport;
    const idleCapitalScore = report
      ? Math.max(0, 100 - report.idlePercent * 500) // Penalize idle capital
      : 50;

    const yieldStacks = Array.from(this.yieldStacks.values());
    const yieldScore = yieldStacks.length > 0
      ? Math.min(100, yieldStacks.reduce((sum, s) => sum + s.totalYield * 100, 0) / yieldStacks.length * 5)
      : 30;

    const pools = Array.from(this.liquidityPools.values());
    const poolScore = pools.length > 0
      ? Math.min(100, pools.reduce((sum, p) => sum + p.utilizationRate * 100, 0) / pools.length)
      : 20;

    const routes = this.internalRoutes;
    const totalSavings = routes.reduce((sum, r) => sum + r.savingsVsExternal, 0);
    const nettingScore = Math.min(100, totalSavings / 1000 * 100); // Scale with savings

    const overall = (idleCapitalScore + yieldScore + poolScore + nettingScore) / 4;

    return {
      overallScore: overall,
      idleCapitalScore,
      yieldOptimizationScore: yieldScore,
      nettingEfficiencyScore: nettingScore,
      poolUtilizationScore: poolScore,
      benchmarkComparison: overall - 50, // vs 50 industry average
      computedAt: new Date(),
    };
  }

  generateOptimizationReport(): CapitalOptimizationReport {
    const report = this.latestIdleCapitalReport;
    const totalCapital = report?.idleByFund.reduce((sum, f) => sum + f.idleAmount / (f.idlePercent || 1), 0) ?? 0;
    const idleCapital = report?.totalIdleCapital ?? 0;
    const idlePercent = report?.idlePercent ?? 0;

    const pools = Array.from(this.liquidityPools.values());
    const poolEfficiency = pools.length > 0
      ? pools.reduce((sum, p) => sum + p.utilizationRate, 0) / pools.length
      : 0;

    const routes = this.internalRoutes;
    const totalSavings = routes.reduce((sum, r) => sum + r.savingsVsExternal, 0);

    const yieldStacks = Array.from(this.yieldStacks.values());
    const potentialYield = idleCapital * 0.1; // Estimated 10% APY potential

    const recommendations: string[] = [];
    if (idlePercent > 0.1) {
      recommendations.push('Reduce idle capital by deploying into yield stacking strategies');
    }
    if (poolEfficiency < 0.5) {
      recommendations.push('Increase cross-fund liquidity pool utilization');
    }
    if (routes.length === 0) {
      recommendations.push('Enable internal liquidity routing to reduce external trading costs');
    }
    if (yieldStacks.length === 0) {
      recommendations.push('Consider yield stacking for stable capital positions');
    }

    return {
      generatedAt: new Date(),
      totalCapitalUnderManagement: totalCapital,
      idleCapital,
      idleCapitalPercent: idlePercent * 100,
      potentialYieldIncrease: potentialYield,
      potentialYieldIncreasePercent: totalCapital > 0 ? potentialYield / totalCapital * 100 : 0,
      topOpportunities: report?.optimizationOpportunities.slice(0, 5) ?? [],
      internalNettingSavings: totalSavings,
      poolEfficiency,
      recommendations,
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
      type: 'yield_stacked',
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

export interface CreateYieldStackParams {
  fundId: FundId;
  assetId: AssetId;
  capital: number;
  baseYield: number;
  stakingYield?: number;
  lendingYield?: number;
  liquidityYield?: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCapitalEfficiencyModule(
  config?: Partial<CapitalEfficiencyConfig>
): DefaultCapitalEfficiencyModule {
  return new DefaultCapitalEfficiencyModule(config);
}
