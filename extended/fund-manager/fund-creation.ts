/**
 * TONAIAgent - Fund Creation Framework
 *
 * Manages creation, lifecycle, and configuration of AI-managed investment funds.
 * Each fund allocates capital across multiple strategies from the Strategy Marketplace,
 * executed through the Production Agent Runtime.
 */

import {
  FundConfig,
  FundLifecycleState,
  FundManagerError,
  FundManagerEvent,
  FundManagerEventHandler,
  FundManagerEventType,
  FundManagerUnsubscribe,
  FundPortfolio,
  RebalancingRules,
  StrategyAllocation,
} from './types';

// ============================================================================
// Fund Creation Manager
// ============================================================================

/** Input for creating a new fund */
export interface CreateFundInput {
  /** Human-readable fund name */
  name: string;
  /** Fund description */
  description: string;
  /** Creator identifier */
  creatorId: string;
  /** Fund type */
  type: FundConfig['type'];
  /** Base asset for capital accounting */
  baseAsset: FundConfig['baseAsset'];
  /** Strategy allocations (weights must sum to 100) */
  strategyAllocations: Array<{ strategyId: string; targetWeightPercent: number }>;
  /** Risk profile */
  riskProfile: FundConfig['riskProfile'];
  /** Optional rebalancing rules (defaults applied if omitted) */
  rebalancingRules?: Partial<RebalancingRules>;
  /** Minimum investment amount in base units (default: 10 TON = 10_000_000_000 nanoTON) */
  minInvestmentAmount?: bigint;
  /** Maximum fund size in base units (0 = unlimited) */
  maxFundSize?: bigint;
  /** Management fee in percent */
  managementFeePercent?: number;
  /** Performance fee in percent */
  performanceFeePercent?: number;
}

/** Input for updating a fund's configuration */
export interface UpdateFundInput {
  /** Fund ID to update */
  fundId: string;
  /** Updated name */
  name?: string;
  /** Updated description */
  description?: string;
  /** Updated strategy allocations */
  strategyAllocations?: Array<{ strategyId: string; targetWeightPercent: number }>;
  /** Updated rebalancing rules */
  rebalancingRules?: Partial<RebalancingRules>;
  /** Updated risk profile */
  riskProfile?: FundConfig['riskProfile'];
}

/** Configuration for the FundCreationManager */
export interface FundCreationManagerConfig {
  /** Maximum number of funds a single creator can own */
  maxFundsPerCreator: number;
  /** Whether to require strategy validation before fund creation */
  requireStrategyValidation: boolean;
  /** Default minimum investment amount */
  defaultMinInvestmentAmount: bigint;
  /** Default rebalancing rules */
  defaultRebalancingRules: RebalancingRules;
}

const DEFAULT_REBALANCING_RULES: RebalancingRules = {
  driftThresholdPercent: 5,
  minIntervalSeconds: 3600, // 1 hour
  maxIntervalSeconds: 86400, // 24 hours
  rebalanceOnVolatility: true,
  volatilityThresholdPercent: 30,
};

const DEFAULT_CONFIG: FundCreationManagerConfig = {
  maxFundsPerCreator: 10,
  requireStrategyValidation: false,
  defaultMinInvestmentAmount: BigInt(10_000_000_000), // 10 TON
  defaultRebalancingRules: DEFAULT_REBALANCING_RULES,
};

export class FundCreationManager {
  private readonly config: FundCreationManagerConfig;
  private readonly funds = new Map<string, FundConfig>();
  private readonly fundStates = new Map<string, FundLifecycleState>();
  private readonly fundPortfolios = new Map<string, FundPortfolio>();
  private readonly eventHandlers = new Set<FundManagerEventHandler>();

  constructor(config: Partial<FundCreationManagerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      defaultRebalancingRules: {
        ...DEFAULT_REBALANCING_RULES,
        ...config.defaultRebalancingRules,
      },
    };
  }

  // ============================================================================
  // Fund CRUD
  // ============================================================================

  /**
   * Create a new AI-managed fund.
   * Validates weight allocation and initializes portfolio state.
   */
  createFund(input: CreateFundInput): FundConfig {
    this.validateWeights(input.strategyAllocations);

    const fundId = this.generateId('fund');
    const now = new Date();

    const strategyAllocations: StrategyAllocation[] = input.strategyAllocations.map((s) => ({
      strategyId: s.strategyId,
      targetWeightPercent: s.targetWeightPercent,
      currentWeightPercent: s.targetWeightPercent, // starts at target
      allocatedCapital: BigInt(0),
    }));

    const rebalancingRules: RebalancingRules = {
      ...this.config.defaultRebalancingRules,
      ...input.rebalancingRules,
    };

    const fund: FundConfig = {
      fundId,
      name: input.name,
      description: input.description,
      creatorId: input.creatorId,
      type: input.type,
      baseAsset: input.baseAsset,
      strategyAllocations,
      riskProfile: input.riskProfile,
      rebalancingRules,
      minInvestmentAmount: input.minInvestmentAmount ?? this.config.defaultMinInvestmentAmount,
      maxFundSize: input.maxFundSize ?? BigInt(0),
      fees: {
        managementFeePercent: input.managementFeePercent ?? 2.0,
        performanceFeePercent: input.performanceFeePercent ?? 20.0,
        highWaterMarkEnabled: true,
        feePaymentIntervalSeconds: 86400, // daily
        feeRecipients: [
          { recipientId: input.creatorId, recipientType: 'fund_creator', sharePercent: 70 },
          { recipientId: 'platform-treasury', recipientType: 'platform_treasury', sharePercent: 30 },
        ],
      },
      createdAt: now,
      updatedAt: now,
    };

    this.funds.set(fundId, fund);
    this.fundStates.set(fundId, 'pending');

    // Initialize empty portfolio
    this.fundPortfolios.set(fundId, {
      fundId,
      totalAum: BigInt(0),
      navPerShare: BigInt(1_000_000_000), // 1 TON = 1 share at launch
      totalSharesOutstanding: BigInt(0),
      allocations: strategyAllocations,
      cashBalance: BigInt(0),
      lastSyncedAt: now,
    });

    this.emitEvent('fund.created', fundId, { fundId, name: fund.name, creatorId: fund.creatorId });
    return fund;
  }

  /**
   * Update a fund's mutable configuration.
   * Cannot update fees or base asset after creation.
   */
  updateFund(input: UpdateFundInput): FundConfig {
    const fund = this.requireFund(input.fundId);
    const state = this.fundStates.get(input.fundId)!;

    if (state === 'closed' || state === 'emergency_stopped') {
      throw new FundManagerError(
        `Cannot update fund ${input.fundId} in state '${state}'`,
        'INVALID_FUND_STATE'
      );
    }

    if (input.strategyAllocations) {
      this.validateWeights(input.strategyAllocations);
      fund.strategyAllocations = input.strategyAllocations.map((s) => ({
        strategyId: s.strategyId,
        targetWeightPercent: s.targetWeightPercent,
        currentWeightPercent: s.targetWeightPercent,
        allocatedCapital: BigInt(0),
      }));
    }

    if (input.name) fund.name = input.name;
    if (input.description) fund.description = input.description;
    if (input.riskProfile) fund.riskProfile = input.riskProfile;
    if (input.rebalancingRules) {
      fund.rebalancingRules = { ...fund.rebalancingRules, ...input.rebalancingRules };
    }

    fund.updatedAt = new Date();
    return fund;
  }

  // ============================================================================
  // Fund Lifecycle
  // ============================================================================

  /** Activate a pending fund to accept investor capital */
  activateFund(fundId: string): void {
    const state = this.requireState(fundId, ['pending', 'paused']);
    const fund = this.requireFund(fundId);

    this.fundStates.set(fundId, 'active');
    this.emitEvent('fund.activated', fundId, { fundId, name: fund.name });
  }

  /** Pause an active fund (stops new investments and rebalancing) */
  pauseFund(fundId: string): void {
    this.requireState(fundId, ['active']);
    this.fundStates.set(fundId, 'paused');
    this.emitEvent('fund.paused', fundId, { fundId });
  }

  /** Resume a paused fund */
  resumeFund(fundId: string): void {
    this.requireState(fundId, ['paused']);
    this.fundStates.set(fundId, 'active');
    this.emitEvent('fund.resumed', fundId, { fundId });
  }

  /** Close a fund permanently */
  closeFund(fundId: string): void {
    this.requireState(fundId, ['active', 'paused']);
    this.fundStates.set(fundId, 'closed');
    this.emitEvent('fund.closed', fundId, { fundId });
  }

  /** Emergency stop — triggered by risk management */
  emergencyStop(fundId: string, reason: string): void {
    this.fundStates.set(fundId, 'emergency_stopped');
    this.emitEvent('fund.emergency_stopped', fundId, { fundId, reason });
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  getFund(fundId: string): FundConfig | undefined {
    return this.funds.get(fundId);
  }

  getFundState(fundId: string): FundLifecycleState | undefined {
    return this.fundStates.get(fundId);
  }

  getFundPortfolio(fundId: string): FundPortfolio | undefined {
    return this.fundPortfolios.get(fundId);
  }

  updateFundPortfolio(portfolio: FundPortfolio): void {
    this.fundPortfolios.set(portfolio.fundId, portfolio);
  }

  listFunds(): FundConfig[] {
    return Array.from(this.funds.values());
  }

  listActiveFunds(): FundConfig[] {
    return Array.from(this.funds.values()).filter(
      (f) => this.fundStates.get(f.fundId) === 'active'
    );
  }

  listFundsByCreator(creatorId: string): FundConfig[] {
    return Array.from(this.funds.values()).filter((f) => f.creatorId === creatorId);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(handler: FundManagerEventHandler): FundManagerUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private validateWeights(allocations: Array<{ targetWeightPercent: number }>): void {
    if (allocations.length === 0) {
      throw new FundManagerError('Fund must have at least one strategy allocation', 'INVALID_ALLOCATION');
    }

    const total = allocations.reduce((sum, a) => sum + a.targetWeightPercent, 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new FundManagerError(
        `Strategy allocation weights must sum to 100 (got ${total.toFixed(2)})`,
        'INVALID_WEIGHT_SUM'
      );
    }
  }

  private requireFund(fundId: string): FundConfig {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new FundManagerError(`Fund ${fundId} not found`, 'FUND_NOT_FOUND');
    }
    return fund;
  }

  private requireState(fundId: string, allowed: FundLifecycleState[]): FundLifecycleState {
    const state = this.fundStates.get(fundId);
    if (!state) {
      throw new FundManagerError(`Fund ${fundId} not found`, 'FUND_NOT_FOUND');
    }
    if (!allowed.includes(state)) {
      throw new FundManagerError(
        `Fund ${fundId} is in state '${state}', expected one of: ${allowed.join(', ')}`,
        'INVALID_FUND_STATE'
      );
    }
    return state;
  }

  emitEvent(type: FundManagerEventType, fundId: string, data: Record<string, unknown>): void {
    const event: FundManagerEvent = {
      id: this.generateId('evt'),
      type,
      fundId,
      timestamp: new Date(),
      data,
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFundCreationManager(
  config?: Partial<FundCreationManagerConfig>
): FundCreationManager {
  return new FundCreationManager(config);
}
