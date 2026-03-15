/**
 * TONAIAgent - GAAMP Fund Layer
 *
 * Implements the Fund Layer of the Global Autonomous Asset Management Protocol.
 * Supports tokenized funds, DAO funds, institutional vehicles, and structured products.
 *
 * Capabilities:
 * - NAV accounting and share-based fund management
 * - Performance tracking (returns, Sharpe, drawdown)
 * - Risk profiling and limits
 * - Investment and redemption processing
 * - Fund lifecycle management
 */

import {
  FundId,
  AgentId,
  ParticipantId,
  AssetId,
  ChainId,
  ProtocolFund,
  FundType,
  FundStatus,
  FundClass,
  FundFees,
  FundPerformance,
  FundRiskProfile,
  FundConfig,
  RebalancingConfig,
  FundInvestment,
  FundRedemption,
  FundLayerConfig,
  GAMPEvent,
  GAMPEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_FUND_LAYER_CONFIG: FundLayerConfig = {
  fundRegistrationEnabled: true,
  requiresGovernanceApproval: false,
  minFundSize: 10_000,
  maxFundSize: Number.MAX_SAFE_INTEGER,
  allowedFundTypes: ['tokenized', 'dao', 'institutional', 'structured_product', 'index', 'hedge'],
};

const DEFAULT_FEES: FundFees = {
  managementFeePercent: 0.5,
  performanceFeePercent: 10,
  entryFeePercent: 0,
  exitFeePercent: 0,
};

const DEFAULT_RISK_PROFILE: FundRiskProfile = {
  riskCategory: 'medium',
  maxDrawdownLimit: 0.2,
  maxLeverage: 2.0,
  varLimit: 0.1,
  concentrationLimit: 0.4,
  liquidityMinimum: 0.1,
};

// ============================================================================
// Fund Layer Interface
// ============================================================================

export interface FundLayer {
  readonly config: FundLayerConfig;

  // Fund lifecycle
  createFund(params: CreateFundParams): ProtocolFund;
  closeFund(fundId: FundId, reason?: string): ProtocolFund;
  suspendFund(fundId: FundId, reason?: string): ProtocolFund;
  reactivateFund(fundId: FundId): ProtocolFund;
  getFund(fundId: FundId): ProtocolFund | undefined;
  listFunds(filters?: FundFilters): ProtocolFund[];

  // Agent management
  assignAgent(fundId: FundId, agentId: AgentId): void;
  removeAgent(fundId: FundId, agentId: AgentId): void;

  // NAV accounting
  updateNAV(fundId: FundId, newNav: number): ProtocolFund;
  calculateNAVPerShare(fundId: FundId): number;

  // Investment & redemption
  processInvestment(params: InvestmentParams): FundInvestment;
  processRedemption(params: RedemptionParams): FundRedemption;
  confirmRedemption(redemptionId: string): FundRedemption;
  listInvestments(fundId: FundId, filters?: TransactionFilters): FundInvestment[];
  listRedemptions(fundId: FundId, filters?: TransactionFilters): FundRedemption[];

  // Performance
  updatePerformance(fundId: FundId, metrics: Partial<FundPerformance>): void;

  // Events
  onEvent(callback: GAMPEventCallback): void;
}

export interface CreateFundParams {
  name: string;
  description: string;
  type: FundType;
  fundClass: FundClass;
  chain: ChainId;
  initialCapital?: number;
  fees?: Partial<FundFees>;
  riskProfile?: Partial<FundRiskProfile>;
  rebalancingConfig?: RebalancingConfig;
  config?: FundConfig;
}

export interface FundFilters {
  type?: FundType;
  status?: FundStatus;
  fundClass?: FundClass;
  chain?: ChainId;
  hasAgent?: AgentId;
  minAUM?: number;
  maxAUM?: number;
}

export interface InvestmentParams {
  fundId: FundId;
  participantId: ParticipantId;
  amount: number;
}

export interface RedemptionParams {
  fundId: FundId;
  participantId: ParticipantId;
  sharesToRedeem: number;
}

export interface TransactionFilters {
  status?: string;
  from?: Date;
  to?: Date;
  participantId?: ParticipantId;
}

// ============================================================================
// Default Fund Layer Implementation
// ============================================================================

export class DefaultFundLayer implements FundLayer {
  readonly config: FundLayerConfig;
  private readonly funds: Map<FundId, ProtocolFund> = new Map();
  private readonly investments: Map<string, FundInvestment> = new Map();
  private readonly redemptions: Map<string, FundRedemption> = new Map();
  private readonly eventCallbacks: GAMPEventCallback[] = [];
  private fundCounter = 0;
  private txCounter = 0;

  constructor(config?: Partial<FundLayerConfig>) {
    this.config = { ...DEFAULT_FUND_LAYER_CONFIG, ...config };
  }

  // ============================================================================
  // Fund Lifecycle
  // ============================================================================

  createFund(params: CreateFundParams): ProtocolFund {
    if (!this.config.fundRegistrationEnabled) {
      throw new Error('Fund registration is currently disabled');
    }

    if (!this.config.allowedFundTypes.includes(params.type)) {
      throw new Error(`Fund type '${params.type}' is not permitted`);
    }

    const initialCapital = params.initialCapital ?? 0;

    if (initialCapital < this.config.minFundSize && initialCapital > 0) {
      throw new Error(
        `Initial capital ${initialCapital} is below minimum ${this.config.minFundSize}`
      );
    }

    const id = this.generateFundId();
    const now = new Date();

    const fund: ProtocolFund = {
      id,
      name: params.name,
      description: params.description,
      type: params.type,
      fundClass: params.fundClass,
      status: 'registered',
      chain: params.chain,
      managingAgentIds: [],
      aum: initialCapital,
      currency: 'USD',
      nav: initialCapital,
      navPerShare: 100,
      totalShares: initialCapital > 0 ? initialCapital / 100 : 0,
      fees: { ...DEFAULT_FEES, ...params.fees },
      performance: this.emptyPerformance(),
      riskProfile: { ...DEFAULT_RISK_PROFILE, ...params.riskProfile },
      rebalancingConfig: params.rebalancingConfig ?? {
        strategy: 'threshold',
        thresholdPercent: 0.05,
        targetAllocations: {},
      },
      registeredAt: now,
      updatedAt: now,
      config: params.config ?? {},
    };

    this.funds.set(id, fund);
    this.emitEvent('fund_created', { fundId: id, name: params.name, type: params.type });

    return fund;
  }

  closeFund(fundId: FundId, reason?: string): ProtocolFund {
    const fund = this.requireFund(fundId);

    if (fund.status === 'closed') {
      throw new Error(`Fund ${fundId} is already closed`);
    }

    const updated = this.updateFund(fundId, { status: 'closed' });
    this.emitEvent('fund_closed', { fundId, reason });
    return updated;
  }

  suspendFund(fundId: FundId, reason?: string): ProtocolFund {
    this.requireFund(fundId);
    return this.updateFund(fundId, { status: 'suspended' });
  }

  reactivateFund(fundId: FundId): ProtocolFund {
    const fund = this.requireFund(fundId);

    if (fund.status !== 'suspended') {
      throw new Error(`Fund ${fundId} is not suspended (current status: ${fund.status})`);
    }

    return this.updateFund(fundId, { status: 'active' });
  }

  getFund(fundId: FundId): ProtocolFund | undefined {
    return this.funds.get(fundId);
  }

  listFunds(filters?: FundFilters): ProtocolFund[] {
    let result = Array.from(this.funds.values());

    if (filters) {
      if (filters.type !== undefined) {
        result = result.filter(f => f.type === filters.type);
      }
      if (filters.status !== undefined) {
        result = result.filter(f => f.status === filters.status);
      }
      if (filters.fundClass !== undefined) {
        result = result.filter(f => f.fundClass === filters.fundClass);
      }
      if (filters.chain !== undefined) {
        result = result.filter(f => f.chain === filters.chain);
      }
      if (filters.hasAgent !== undefined) {
        result = result.filter(f => f.managingAgentIds.includes(filters.hasAgent!));
      }
      if (filters.minAUM !== undefined) {
        result = result.filter(f => f.aum >= filters.minAUM!);
      }
      if (filters.maxAUM !== undefined) {
        result = result.filter(f => f.aum <= filters.maxAUM!);
      }
    }

    return result;
  }

  // ============================================================================
  // Agent Management
  // ============================================================================

  assignAgent(fundId: FundId, agentId: AgentId): void {
    const fund = this.requireFund(fundId);

    if (!fund.managingAgentIds.includes(agentId)) {
      this.updateFund(fundId, {
        managingAgentIds: [...fund.managingAgentIds, agentId],
      });
    }
  }

  removeAgent(fundId: FundId, agentId: AgentId): void {
    const fund = this.requireFund(fundId);

    this.updateFund(fundId, {
      managingAgentIds: fund.managingAgentIds.filter(id => id !== agentId),
    });
  }

  // ============================================================================
  // NAV Accounting
  // ============================================================================

  updateNAV(fundId: FundId, newNav: number): ProtocolFund {
    const fund = this.requireFund(fundId);

    const navPerShare = fund.totalShares > 0 ? newNav / fund.totalShares : fund.navPerShare;

    return this.updateFund(fundId, { nav: newNav, navPerShare, aum: newNav });
  }

  calculateNAVPerShare(fundId: FundId): number {
    const fund = this.requireFund(fundId);
    return fund.totalShares > 0 ? fund.nav / fund.totalShares : fund.navPerShare;
  }

  // ============================================================================
  // Investment & Redemption
  // ============================================================================

  processInvestment(params: InvestmentParams): FundInvestment {
    const fund = this.requireActiveFund(params.fundId);

    if (fund.config.minInvestment && params.amount < fund.config.minInvestment) {
      throw new Error(
        `Investment amount ${params.amount} is below minimum ${fund.config.minInvestment}`
      );
    }

    if (fund.config.maxInvestment && params.amount > fund.config.maxInvestment) {
      throw new Error(
        `Investment amount ${params.amount} exceeds maximum ${fund.config.maxInvestment}`
      );
    }

    const navPerShare = this.calculateNAVPerShare(params.fundId);
    const sharesIssued = params.amount / navPerShare;

    const investment: FundInvestment = {
      id: this.generateTxId('inv'),
      fundId: params.fundId,
      participantId: params.participantId,
      amount: params.amount,
      sharesIssued,
      navAtInvestment: navPerShare,
      investedAt: new Date(),
      status: 'confirmed',
    };

    this.investments.set(investment.id, investment);

    // Update fund AUM and shares
    const newAUM = fund.aum + params.amount;
    const newShares = fund.totalShares + sharesIssued;
    this.updateFund(params.fundId, { aum: newAUM, nav: newAUM, totalShares: newShares });

    this.emitEvent('investment_processed', {
      fundId: params.fundId,
      participantId: params.participantId,
      amount: params.amount,
      sharesIssued,
    });

    return investment;
  }

  processRedemption(params: RedemptionParams): FundRedemption {
    const fund = this.requireActiveFund(params.fundId);

    const navPerShare = this.calculateNAVPerShare(params.fundId);
    const redemptionValue = params.sharesToRedeem * navPerShare;

    if (redemptionValue > fund.nav) {
      throw new Error(
        `Redemption value ${redemptionValue} exceeds fund NAV ${fund.nav}`
      );
    }

    const redemption: FundRedemption = {
      id: this.generateTxId('red'),
      fundId: params.fundId,
      participantId: params.participantId,
      sharesRedeemed: params.sharesToRedeem,
      redemptionValue,
      navAtRedemption: navPerShare,
      requestedAt: new Date(),
      status: 'pending',
    };

    this.redemptions.set(redemption.id, redemption);
    return redemption;
  }

  confirmRedemption(redemptionId: string): FundRedemption {
    const redemption = this.redemptions.get(redemptionId);
    if (!redemption) {
      throw new Error(`Redemption not found: ${redemptionId}`);
    }

    if (redemption.status !== 'pending') {
      throw new Error(`Redemption ${redemptionId} is not pending (status: ${redemption.status})`);
    }

    const fund = this.requireFund(redemption.fundId);
    const newAUM = fund.aum - redemption.redemptionValue;
    const newShares = fund.totalShares - redemption.sharesRedeemed;
    this.updateFund(redemption.fundId, { aum: newAUM, nav: newAUM, totalShares: newShares });

    const confirmed: FundRedemption = {
      ...redemption,
      status: 'settled',
      settledAt: new Date(),
    };

    this.redemptions.set(redemptionId, confirmed);

    this.emitEvent('redemption_processed', {
      fundId: redemption.fundId,
      participantId: redemption.participantId,
      sharesRedeemed: redemption.sharesRedeemed,
      redemptionValue: redemption.redemptionValue,
    });

    return confirmed;
  }

  listInvestments(fundId: FundId, filters?: TransactionFilters): FundInvestment[] {
    let result = Array.from(this.investments.values()).filter(i => i.fundId === fundId);

    if (filters) {
      if (filters.status) result = result.filter(i => i.status === filters.status);
      if (filters.participantId) result = result.filter(i => i.participantId === filters.participantId);
      if (filters.from) result = result.filter(i => i.investedAt >= filters.from!);
      if (filters.to) result = result.filter(i => i.investedAt <= filters.to!);
    }

    return result;
  }

  listRedemptions(fundId: FundId, filters?: TransactionFilters): FundRedemption[] {
    let result = Array.from(this.redemptions.values()).filter(r => r.fundId === fundId);

    if (filters) {
      if (filters.status) result = result.filter(r => r.status === filters.status);
      if (filters.participantId) result = result.filter(r => r.participantId === filters.participantId);
      if (filters.from) result = result.filter(r => r.requestedAt >= filters.from!);
      if (filters.to) result = result.filter(r => r.requestedAt <= filters.to!);
    }

    return result;
  }

  // ============================================================================
  // Performance
  // ============================================================================

  updatePerformance(fundId: FundId, metrics: Partial<FundPerformance>): void {
    const fund = this.requireFund(fundId);
    this.updateFund(fundId, {
      performance: { ...fund.performance, ...metrics },
    });
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: GAMPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateFundId(): FundId {
    return `fund_${Date.now()}_${++this.fundCounter}`;
  }

  private generateTxId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.txCounter}`;
  }

  private emptyPerformance(): FundPerformance {
    return {
      totalReturn: 0,
      ytdReturn: 0,
      mtdReturn: 0,
      maxDrawdown: 0,
    };
  }

  private requireFund(fundId: FundId): ProtocolFund {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }
    return fund;
  }

  private requireActiveFund(fundId: FundId): ProtocolFund {
    const fund = this.requireFund(fundId);
    if (fund.status !== 'active' && fund.status !== 'registered') {
      throw new Error(`Fund ${fundId} is not active (status: ${fund.status})`);
    }
    return fund;
  }

  private updateFund(fundId: FundId, updates: Partial<ProtocolFund>): ProtocolFund {
    const fund = this.requireFund(fundId);
    const updated: ProtocolFund = {
      ...fund,
      ...updates,
      updatedAt: new Date(),
    };
    this.funds.set(fundId, updated);
    return updated;
  }

  private emitEvent(type: GAMPEvent['type'], payload: Record<string, unknown>): void {
    const event: GAMPEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      chain: 'ton',
      payload,
      timestamp: new Date(),
    };

    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFundLayer(config?: Partial<FundLayerConfig>): DefaultFundLayer {
  return new DefaultFundLayer(config);
}

export default DefaultFundLayer;
