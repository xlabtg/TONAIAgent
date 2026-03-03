/**
 * TONAIAgent - Margin & Leverage Engine
 *
 * Risk-based leverage calculation, dynamic margin requirements,
 * volatility-adjusted collateral, real-time liquidation protection.
 * AI-powered safe leverage level calculation, borrowing cost optimization,
 * and cascade risk prevention.
 */

import {
  MarginAccount,
  MarginPosition,
  LeverageParameters,
  DynamicMarginRequirement,
  LiquidationProtectionConfig,
  LiquidationEvent,
  BorrowingCostOptimization,
  BorrowingSource,
  MarginEngineConfig,
  AgentId,
  FundId,
  AssetId,
  PrimeBrokerageEvent,
  PrimeBrokerageEventCallback,
} from './types';

// ============================================================================
// Margin & Leverage Engine Interface
// ============================================================================

export interface MarginAndLeverageEngine {
  readonly config: MarginEngineConfig;

  // Margin Account Management
  createMarginAccount(ownerId: string, ownerType: 'fund' | 'agent', fundId?: FundId): MarginAccount;
  getMarginAccount(accountId: string): MarginAccount | undefined;
  listMarginAccounts(fundId?: FundId): MarginAccount[];
  updateMarginAccount(accountId: string, update: MarginAccountUpdate): MarginAccount;

  // Position Management
  addPosition(accountId: string, position: Omit<MarginPosition, 'positionId'>): MarginPosition;
  removePosition(accountId: string, positionId: string): void;
  updatePositionPrice(accountId: string, positionId: string, currentPrice: number): MarginPosition;

  // Leverage Calculation
  calculateSafeLeverage(agentId: AgentId, volatility: number, collateralQuality: number): LeverageParameters;
  getLeverageParameters(agentId: AgentId): LeverageParameters | undefined;
  updateLeverageParameters(agentId: AgentId): LeverageParameters;

  // Dynamic Margin
  calculateDynamicMargin(assetId: AssetId, volatility: number, liquidity: number): DynamicMarginRequirement;
  getDynamicMarginRequirement(assetId: AssetId): DynamicMarginRequirement | undefined;

  // Liquidation Protection
  checkLiquidationRisk(accountId: string): LiquidationRiskAssessment;
  triggerLiquidation(accountId: string, reason: string): LiquidationEvent;
  getLiquidationHistory(agentId?: AgentId): LiquidationEvent[];

  // Borrowing Cost Optimization
  optimizeBorrowingCost(agentId: AgentId, requiredCapital: number): BorrowingCostOptimization;
  getAvailableBorrowingSources(): BorrowingSource[];

  // System-wide Risk
  getSystemLeverageMetrics(): SystemLeverageMetrics;
  runCascadeRiskCheck(): CascadeRiskResult;

  // Events
  onEvent(callback: PrimeBrokerageEventCallback): void;
}

export interface MarginAccountUpdate {
  totalEquity?: number;
  usedMargin?: number;
}

export interface LiquidationRiskAssessment {
  accountId: string;
  isAtRisk: boolean;
  marginLevel: number;
  currentLeverage: number;
  maxSafeLeverage: number;
  marginCallDistance: number; // % until margin call
  liquidationDistance: number; // % until liquidation
  recommendedActions: string[];
  urgency: 'none' | 'monitor' | 'action_required' | 'immediate';
}

export interface SystemLeverageMetrics {
  totalGrossExposure: number;
  totalNetExposure: number;
  averageLeverage: number;
  maxLeverage: number;
  accountsInWarning: number;
  accountsInMarginCall: number;
  accountsInLiquidation: number;
  systemLeverageRatio: number;
  updatedAt: Date;
}

export interface CascadeRiskResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  vulnerableAccounts: string[];
  estimatedCascadeLoss: number;
  cascadeScenarios: CascadeScenario[];
  recommendations: string[];
  assessedAt: Date;
}

export interface CascadeScenario {
  trigger: string;
  affectedAccounts: number;
  estimatedLoss: number;
  probability: number;
}

// ============================================================================
// Default Margin & Leverage Engine Implementation
// ============================================================================

const DEFAULT_MARGIN_CONFIG: MarginEngineConfig = {
  defaultInitialMarginPercent: 0.1, // 10%
  defaultMaintenanceMarginPercent: 0.05, // 5%
  defaultLiquidationThresholdPercent: 0.025, // 2.5%
  maxSystemLeverage: 10,
  volatilityWindow: 30,
  leverageStrategy: 'conservative',
  liquidationProtection: {
    enabled: true,
    warningThresholdPercent: 150, // Alert at 150% margin level
    autoDeleverage: true,
    autoCollateralTopup: false,
    hardLiquidationThresholdPercent: 110,
    gracePeriodSeconds: 300, // 5 minutes
  },
};

const KNOWN_BORROWING_SOURCES: BorrowingSource[] = [
  {
    name: 'Internal Cross-Fund Pool',
    rate: 0.04, // 4% APY
    availableAmount: 10000000,
    maxLeverage: 5,
    collateralRequired: ['ton', 'usdt', 'usdc'],
  },
  {
    name: 'STON.fi Lending',
    rate: 0.06,
    availableAmount: 5000000,
    maxLeverage: 3,
    collateralRequired: ['ton', 'usdt'],
  },
  {
    name: 'DeDust Yield Protocol',
    rate: 0.055,
    availableAmount: 8000000,
    maxLeverage: 4,
    collateralRequired: ['ton', 'usdt', 'eth'],
  },
  {
    name: 'External DeFi Lender',
    rate: 0.08,
    availableAmount: 20000000,
    maxLeverage: 8,
    collateralRequired: ['btc', 'eth', 'ton'],
  },
];

export class DefaultMarginAndLeverageEngine implements MarginAndLeverageEngine {
  readonly config: MarginEngineConfig;

  private readonly marginAccounts: Map<string, MarginAccount> = new Map();
  private readonly leverageParameters: Map<AgentId, LeverageParameters> = new Map();
  private readonly dynamicMarginRequirements: Map<AssetId, DynamicMarginRequirement> = new Map();
  private readonly liquidationHistory: LiquidationEvent[] = [];
  private readonly eventCallbacks: PrimeBrokerageEventCallback[] = [];

  constructor(config?: Partial<MarginEngineConfig>) {
    this.config = {
      ...DEFAULT_MARGIN_CONFIG,
      ...config,
      liquidationProtection: {
        ...DEFAULT_MARGIN_CONFIG.liquidationProtection,
        ...config?.liquidationProtection,
      },
    };
  }

  // ============================================================================
  // Margin Account Management
  // ============================================================================

  createMarginAccount(ownerId: string, ownerType: 'fund' | 'agent', _fundId?: FundId): MarginAccount {
    const account: MarginAccount = {
      id: `margin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ownerId,
      ownerType,
      totalEquity: 0,
      usedMargin: 0,
      availableMargin: 0,
      marginLevel: Infinity,
      leverage: 1,
      maintenanceMargin: this.config.defaultMaintenanceMarginPercent,
      initialMargin: this.config.defaultInitialMarginPercent,
      marginCallLevel: 120, // 120% of maintenance margin
      liquidationLevel: 100, // 100% of maintenance margin
      status: 'healthy',
      positions: [],
      updatedAt: new Date(),
    };

    this.marginAccounts.set(account.id, account);

    this.emitEvent('info', 'margin_engine', `Margin account created for ${ownerType}: ${ownerId}`, {
      accountId: account.id,
      ownerId,
      ownerType,
    });

    return account;
  }

  getMarginAccount(accountId: string): MarginAccount | undefined {
    return this.marginAccounts.get(accountId);
  }

  listMarginAccounts(fundId?: FundId): MarginAccount[] {
    const accounts = Array.from(this.marginAccounts.values());
    // In a full implementation, we'd track which accounts belong to which fund
    // For now, filter by ownerType or return all
    if (fundId) {
      return accounts.filter(a => a.ownerId === fundId || a.ownerType === 'fund');
    }
    return accounts;
  }

  updateMarginAccount(accountId: string, update: MarginAccountUpdate): MarginAccount {
    const account = this.marginAccounts.get(accountId);
    if (!account) {
      throw new Error(`Margin account not found: ${accountId}`);
    }

    if (update.totalEquity !== undefined) {
      account.totalEquity = update.totalEquity;
    }
    if (update.usedMargin !== undefined) {
      account.usedMargin = update.usedMargin;
      account.availableMargin = account.totalEquity - account.usedMargin;
      account.marginLevel = account.usedMargin > 0
        ? (account.totalEquity / account.usedMargin) * 100
        : Infinity;
      account.leverage = account.totalEquity > 0 ? account.usedMargin / account.totalEquity : 0;
    }

    account.status = this.determineAccountStatus(account);
    account.updatedAt = new Date();
    this.marginAccounts.set(accountId, account);

    if (account.status === 'margin_call') {
      this.emitEvent('warning', 'margin_engine', `Margin call triggered for account: ${accountId}`, {
        accountId,
        ownerId: account.ownerId,
        marginLevel: account.marginLevel,
      });
    } else if (account.status === 'liquidating') {
      this.emitEvent('critical', 'margin_engine', `Liquidation triggered for account: ${accountId}`, {
        accountId,
        ownerId: account.ownerId,
        marginLevel: account.marginLevel,
      });
    }

    return account;
  }

  // ============================================================================
  // Position Management
  // ============================================================================

  addPosition(accountId: string, positionInput: Omit<MarginPosition, 'positionId'>): MarginPosition {
    const account = this.marginAccounts.get(accountId);
    if (!account) {
      throw new Error(`Margin account not found: ${accountId}`);
    }

    const position: MarginPosition = {
      ...positionInput,
      positionId: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    account.positions.push(position);
    account.usedMargin += position.marginRequired;
    account.availableMargin = account.totalEquity - account.usedMargin;
    account.marginLevel = account.usedMargin > 0
      ? (account.totalEquity / account.usedMargin) * 100
      : Infinity;
    account.leverage = account.totalEquity > 0
      ? account.positions.reduce((sum, p) => sum + p.notionalValue, 0) / account.totalEquity
      : 0;
    account.status = this.determineAccountStatus(account);
    account.updatedAt = new Date();
    this.marginAccounts.set(accountId, account);

    return position;
  }

  removePosition(accountId: string, positionId: string): void {
    const account = this.marginAccounts.get(accountId);
    if (!account) {
      throw new Error(`Margin account not found: ${accountId}`);
    }

    const posIdx = account.positions.findIndex(p => p.positionId === positionId);
    if (posIdx === -1) {
      throw new Error(`Position not found: ${positionId}`);
    }

    const removedMargin = account.positions[posIdx].marginRequired;
    account.positions.splice(posIdx, 1);
    account.usedMargin -= removedMargin;
    account.availableMargin = account.totalEquity - account.usedMargin;
    account.marginLevel = account.usedMargin > 0
      ? (account.totalEquity / account.usedMargin) * 100
      : Infinity;
    account.leverage = account.totalEquity > 0
      ? account.positions.reduce((sum, p) => sum + p.notionalValue, 0) / account.totalEquity
      : 0;
    account.status = this.determineAccountStatus(account);
    account.updatedAt = new Date();
    this.marginAccounts.set(accountId, account);
  }

  updatePositionPrice(accountId: string, positionId: string, currentPrice: number): MarginPosition {
    const account = this.marginAccounts.get(accountId);
    if (!account) {
      throw new Error(`Margin account not found: ${accountId}`);
    }

    const position = account.positions.find(p => p.positionId === positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    const priceDiff = currentPrice - position.currentPrice;
    position.currentPrice = currentPrice;
    position.unrealizedPnL = position.direction === 'long'
      ? priceDiff * position.size
      : -priceDiff * position.size;
    position.notionalValue = currentPrice * position.size;

    // Update account equity
    const totalPnL = account.positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const baseEquity = account.totalEquity - totalPnL + position.unrealizedPnL;
    account.totalEquity = baseEquity + totalPnL;
    account.marginLevel = account.usedMargin > 0
      ? (account.totalEquity / account.usedMargin) * 100
      : Infinity;
    account.status = this.determineAccountStatus(account);
    account.updatedAt = new Date();
    this.marginAccounts.set(accountId, account);

    return position;
  }

  // ============================================================================
  // Leverage Calculation
  // ============================================================================

  calculateSafeLeverage(agentId: AgentId, volatility: number, collateralQuality: number): LeverageParameters {
    // Base max leverage from strategy config
    const strategyMaxLeverage: Record<string, number> = {
      conservative: 3,
      moderate: 5,
      aggressive: 8,
      ultra_high: 10,
    };
    const baseMax = strategyMaxLeverage[this.config.leverageStrategy] ?? 3;

    // Volatility adjustment: reduce leverage when volatility is high
    // Assume volatility is annualized (e.g., 0.5 = 50%)
    const volatilityAdjustment = Math.max(0.3, 1 - (volatility - 0.1) * 2);

    // Collateral quality adjustment (0-1, 1 = best quality)
    const collateralQualityAdjustment = Math.max(0.5, collateralQuality);

    // Strategy risk factor (from stored parameters or default)
    const strategyRiskAdjustment = 0.8; // Default moderate risk

    const currentMaxLeverage = Math.min(
      baseMax * volatilityAdjustment * collateralQualityAdjustment * strategyRiskAdjustment,
      this.config.maxSystemLeverage
    );

    const params: LeverageParameters = {
      agentId,
      baseMaxLeverage: baseMax,
      currentMaxLeverage,
      currentLeverage: 0, // Will be updated from margin accounts
      volatilityAdjustment,
      collateralQualityAdjustment,
      strategyRiskAdjustment,
      calculatedAt: new Date(),
      nextRecalculation: new Date(Date.now() + 3600000), // 1 hour
    };

    this.leverageParameters.set(agentId, params);

    return params;
  }

  getLeverageParameters(agentId: AgentId): LeverageParameters | undefined {
    return this.leverageParameters.get(agentId);
  }

  updateLeverageParameters(agentId: AgentId): LeverageParameters {
    // Re-calculate with default values if no market data available
    return this.calculateSafeLeverage(agentId, 0.3, 0.8);
  }

  // ============================================================================
  // Dynamic Margin
  // ============================================================================

  calculateDynamicMargin(assetId: AssetId, volatility: number, liquidity: number): DynamicMarginRequirement {
    const baseInitial = this.config.defaultInitialMarginPercent;
    const baseMaintenance = this.config.defaultMaintenanceMarginPercent;

    // Volatility adjustment: higher vol → higher margin
    const volatilityAdjustedMargin = baseInitial * (1 + volatility * 2);

    // Liquidity adjustment: lower liquidity → higher margin
    // liquidity: 0-1 where 1 is very liquid
    const liquidityAdjustedMargin = volatilityAdjustedMargin * (1 + (1 - liquidity) * 0.5);

    const finalMargin = Math.min(liquidityAdjustedMargin, 0.5); // Cap at 50%

    const requirement: DynamicMarginRequirement = {
      assetId,
      baseInitialMargin: baseInitial,
      baseMaintenanceMargin: baseMaintenance,
      volatilityAdjustedMargin,
      liquidityAdjustedMargin: finalMargin,
      finalMarginRequirement: finalMargin,
      computedAt: new Date(),
    };

    this.dynamicMarginRequirements.set(assetId, requirement);

    return requirement;
  }

  getDynamicMarginRequirement(assetId: AssetId): DynamicMarginRequirement | undefined {
    return this.dynamicMarginRequirements.get(assetId);
  }

  // ============================================================================
  // Liquidation Protection
  // ============================================================================

  checkLiquidationRisk(accountId: string): LiquidationRiskAssessment {
    const account = this.marginAccounts.get(accountId);
    if (!account) {
      throw new Error(`Margin account not found: ${accountId}`);
    }

    const marginCallLevel = account.marginCallLevel;
    const liquidationLevel = account.liquidationLevel;
    const currentMarginLevel = account.marginLevel;

    const marginCallDistance = currentMarginLevel - marginCallLevel;
    const liquidationDistance = currentMarginLevel - liquidationLevel;
    const isAtRisk = marginCallDistance < 20; // Within 20% of margin call

    const recommendedActions: string[] = [];
    let urgency: LiquidationRiskAssessment['urgency'] = 'none';

    if (account.status === 'liquidating') {
      urgency = 'immediate';
      recommendedActions.push('Immediate liquidation in progress');
    } else if (account.status === 'margin_call') {
      urgency = 'action_required';
      recommendedActions.push('Deposit additional collateral immediately');
      recommendedActions.push('Reduce position size to decrease margin usage');
    } else if (isAtRisk) {
      urgency = 'monitor';
      recommendedActions.push('Consider reducing leverage');
      recommendedActions.push('Monitor position closely');
      recommendedActions.push('Prepare additional collateral');
    }

    const leverageParams = this.leverageParameters.get(account.ownerId);

    return {
      accountId,
      isAtRisk,
      marginLevel: currentMarginLevel,
      currentLeverage: account.leverage,
      maxSafeLeverage: leverageParams?.currentMaxLeverage ?? this.config.maxSystemLeverage / 2,
      marginCallDistance,
      liquidationDistance,
      recommendedActions,
      urgency,
    };
  }

  triggerLiquidation(accountId: string, reason: string): LiquidationEvent {
    const account = this.marginAccounts.get(accountId);
    if (!account) {
      throw new Error(`Margin account not found: ${accountId}`);
    }

    account.status = 'liquidating';
    account.updatedAt = new Date();

    const liquidatedPositions = account.positions.map(pos => ({
      positionId: pos.positionId,
      assetId: pos.assetId,
      size: pos.size,
      exitPrice: pos.currentPrice,
      realizedLoss: pos.unrealizedPnL < 0 ? Math.abs(pos.unrealizedPnL) : 0,
    }));

    const totalLoss = liquidatedPositions.reduce((sum, p) => sum + p.realizedLoss, 0);

    const event: LiquidationEvent = {
      id: `liq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      agentId: account.ownerType === 'agent' ? account.ownerId : '',
      fundId: account.ownerType === 'fund' ? account.ownerId : '',
      triggerType: reason.includes('emergency') ? 'emergency_stop' : 'forced_liquidation',
      positionsLiquidated: liquidatedPositions,
      totalLoss,
      remainingEquity: Math.max(0, account.totalEquity - totalLoss),
      timestamp: new Date(),
    };

    // Clear positions after liquidation
    account.positions = [];
    account.usedMargin = 0;
    account.availableMargin = event.remainingEquity;
    account.totalEquity = event.remainingEquity;
    account.marginLevel = Infinity;
    account.leverage = 0;
    account.status = 'healthy';
    this.marginAccounts.set(accountId, account);

    this.liquidationHistory.push(event);

    this.emitEvent('critical', 'margin_engine', `Liquidation completed for account: ${accountId}`, {
      accountId,
      reason,
      totalLoss,
      remainingEquity: event.remainingEquity,
    });

    return event;
  }

  getLiquidationHistory(agentId?: AgentId): LiquidationEvent[] {
    if (agentId) {
      return this.liquidationHistory.filter(e => e.agentId === agentId);
    }
    return [...this.liquidationHistory];
  }

  // ============================================================================
  // Borrowing Cost Optimization
  // ============================================================================

  optimizeBorrowingCost(agentId: AgentId, requiredCapital: number): BorrowingCostOptimization {
    const availableSources = KNOWN_BORROWING_SOURCES.filter(
      s => s.availableAmount >= requiredCapital
    );

    if (availableSources.length === 0) {
      // Return best available even if not enough
      const cheapest = [...KNOWN_BORROWING_SOURCES].sort((a, b) => a.rate - b.rate)[0];
      return {
        agentId,
        currentBorrowingRate: cheapest?.rate ?? 0.1,
        optimizedRate: cheapest?.rate ?? 0.1,
        savingsPercent: 0,
        recommendedSource: cheapest?.name ?? 'No suitable source',
        alternativeSources: [],
        computedAt: new Date(),
      };
    }

    const sorted = availableSources.sort((a, b) => a.rate - b.rate);
    const optimal = sorted[0];
    const currentRate = sorted[sorted.length - 1]?.rate ?? optimal.rate;

    return {
      agentId,
      currentBorrowingRate: currentRate,
      optimizedRate: optimal.rate,
      savingsPercent: currentRate > 0 ? ((currentRate - optimal.rate) / currentRate) * 100 : 0,
      recommendedSource: optimal.name,
      alternativeSources: sorted.slice(1),
      computedAt: new Date(),
    };
  }

  getAvailableBorrowingSources(): BorrowingSource[] {
    return [...KNOWN_BORROWING_SOURCES];
  }

  // ============================================================================
  // System-wide Risk
  // ============================================================================

  getSystemLeverageMetrics(): SystemLeverageMetrics {
    const accounts = Array.from(this.marginAccounts.values());
    const totalGross = accounts.reduce(
      (sum, a) => sum + a.positions.reduce((s, p) => s + p.notionalValue, 0),
      0
    );
    const totalEquity = accounts.reduce((sum, a) => sum + a.totalEquity, 0);
    const avgLeverage = totalEquity > 0 ? totalGross / totalEquity : 0;
    const maxLev = Math.max(...accounts.map(a => a.leverage), 0);

    return {
      totalGrossExposure: totalGross,
      totalNetExposure: totalGross * 0.7, // Simplified: net is 70% of gross after netting
      averageLeverage: avgLeverage,
      maxLeverage: maxLev,
      accountsInWarning: accounts.filter(a => a.status === 'warning').length,
      accountsInMarginCall: accounts.filter(a => a.status === 'margin_call').length,
      accountsInLiquidation: accounts.filter(a => a.status === 'liquidating').length,
      systemLeverageRatio: avgLeverage,
      updatedAt: new Date(),
    };
  }

  runCascadeRiskCheck(): CascadeRiskResult {
    const accounts = Array.from(this.marginAccounts.values());
    const vulnerableAccounts = accounts
      .filter(a => a.marginLevel < 200 && a.usedMargin > 0) // Less than 2x maintenance margin
      .map(a => a.id);

    const estimatedCascadeLoss = vulnerableAccounts.length > 0
      ? accounts
          .filter(a => vulnerableAccounts.includes(a.id))
          .reduce((sum, a) => sum + a.usedMargin * 0.3, 0) // Estimate 30% loss
      : 0;

    const scenarios: CascadeScenario[] = [
      {
        trigger: '20% market drop',
        affectedAccounts: Math.floor(accounts.length * 0.3),
        estimatedLoss: estimatedCascadeLoss * 1.5,
        probability: 0.05,
      },
      {
        trigger: 'Liquidity crisis in major asset',
        affectedAccounts: Math.floor(accounts.length * 0.2),
        estimatedLoss: estimatedCascadeLoss,
        probability: 0.03,
      },
    ];

    const riskLevel: CascadeRiskResult['riskLevel'] =
      vulnerableAccounts.length === 0 ? 'low'
      : vulnerableAccounts.length < 3 ? 'medium'
      : vulnerableAccounts.length < 10 ? 'high'
      : 'critical';

    const recommendations: string[] = [];
    if (riskLevel !== 'low') {
      recommendations.push('Reduce leverage across vulnerable accounts');
      recommendations.push('Increase collateral buffers');
      if (riskLevel === 'critical') {
        recommendations.push('Consider emergency deleveraging');
        recommendations.push('Activate liquidation protection protocols');
      }
    }

    const result: CascadeRiskResult = {
      riskLevel,
      vulnerableAccounts,
      estimatedCascadeLoss,
      cascadeScenarios: scenarios,
      recommendations,
      assessedAt: new Date(),
    };

    if (riskLevel === 'high' || riskLevel === 'critical') {
      this.emitEvent('warning', 'margin_engine', `Cascade risk detected: ${riskLevel}`, {
        vulnerableAccounts: vulnerableAccounts.length,
        estimatedLoss: estimatedCascadeLoss,
      });
    }

    return result;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PrimeBrokerageEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private determineAccountStatus(account: MarginAccount): MarginAccount['status'] {
    if (account.usedMargin === 0) {
      return 'healthy';
    }
    if (account.marginLevel <= account.liquidationLevel) {
      return 'liquidating';
    }
    if (account.marginLevel <= account.marginCallLevel) {
      return 'margin_call';
    }
    if (account.marginLevel <= account.marginCallLevel * 1.5) {
      return 'warning';
    }
    return 'healthy';
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: PrimeBrokerageEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'margin_call',
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

export function createMarginAndLeverageEngine(
  config?: Partial<MarginEngineConfig>
): DefaultMarginAndLeverageEngine {
  return new DefaultMarginAndLeverageEngine(config);
}
