/**
 * TONAIAgent - Fund Infrastructure
 *
 * AI-managed fund structures enabling multi-strategy portfolios,
 * capital inflows/outflows, and automated rebalancing for DAOs
 * and institutional investors.
 */

import {
  ManagedFund,
  FundType,
  FundStrategy,
  FundInvestor,
  FundPerformance,
  FundFees,
  FundCompliance,
  NavDataPoint,
  LaunchpadEvent,
  LaunchpadEventCallback,
} from './types';

// ============================================================================
// Fund Manager Interface
// ============================================================================

export interface FundManager {
  // Fund CRUD
  createFund(input: CreateFundInput): Promise<ManagedFund>;
  getFund(fundId: string): ManagedFund | undefined;
  updateFund(fundId: string, updates: UpdateFundInput): Promise<ManagedFund>;
  closeFund(fundId: string, reason: string): Promise<boolean>;
  listFunds(organizationId: string): ManagedFund[];

  // Fund lifecycle
  launchFund(fundId: string): Promise<LaunchResult>;
  pauseFund(fundId: string, reason: string): Promise<void>;
  resumeFund(fundId: string): Promise<void>;

  // Investor management
  addInvestor(input: AddInvestorInput): Promise<FundInvestor>;
  removeInvestor(fundId: string, investorId: string, reason: string): Promise<boolean>;
  getInvestor(fundId: string, investorId: string): FundInvestor | undefined;
  listInvestors(fundId: string): FundInvestor[];
  processInvestment(fundId: string, investorId: string, amount: number): Promise<InvestmentResult>;
  processRedemption(input: RedemptionInput): Promise<RedemptionResult>;

  // NAV management
  calculateNav(fundId: string): Promise<NavCalculation>;
  updateNav(fundId: string, nav: number): Promise<void>;
  getNavHistory(fundId: string, days: number): NavDataPoint[];

  // Fee management
  accruesFees(fundId: string): Promise<FeeAccrual>;
  collectFees(fundId: string): Promise<FeeCollection>;

  // Performance
  getPerformance(fundId: string): FundPerformance | undefined;
  calculateReturns(fundId: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Returns;

  // Compliance
  checkCompliance(fundId: string, userId: string): ComplianceCheck;
  updateCompliance(fundId: string, compliance: Partial<FundCompliance>): Promise<ManagedFund>;

  // Events
  onEvent(callback: LaunchpadEventCallback): void;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CreateFundInput {
  organizationId: string;
  name: string;
  description: string;
  type: FundType;
  strategy: Partial<FundStrategy>;
  fees: Partial<FundFees>;
  compliance: Partial<FundCompliance>;
  targetAum?: number;
  minInvestment?: number;
}

export interface UpdateFundInput {
  name?: string;
  description?: string;
  strategy?: Partial<FundStrategy>;
  fees?: Partial<FundFees>;
  compliance?: Partial<FundCompliance>;
}

export interface LaunchResult {
  success: boolean;
  fundId: string;
  launchedAt?: Date;
  initialNav: number;
  error?: string;
}

export interface AddInvestorInput {
  fundId: string;
  userId: string;
  initialInvestment: number;
  lockPeriodDays?: number;
}

export interface InvestmentResult {
  success: boolean;
  fundId: string;
  investorId: string;
  amount: number;
  sharesIssued: number;
  navAtPurchase: number;
  timestamp: Date;
  error?: string;
}

export interface RedemptionInput {
  fundId: string;
  investorId: string;
  shareAmount?: number; // Either shares or percentage
  percentage?: number;
  immediate?: boolean;
}

export interface RedemptionResult {
  success: boolean;
  fundId: string;
  investorId: string;
  sharesRedeemed: number;
  amountReturned: number;
  navAtRedemption: number;
  penaltyApplied: number;
  timestamp: Date;
  scheduledDate?: Date; // If not immediate
  error?: string;
}

export interface NavCalculation {
  fundId: string;
  totalAssets: number;
  totalLiabilities: number;
  nav: number;
  navPerShare: number;
  totalShares: number;
  calculatedAt: Date;
  breakdown: AssetBreakdown[];
}

export interface AssetBreakdown {
  asset: string;
  value: number;
  percentage: number;
  protocol?: string;
}

export interface FeeAccrual {
  fundId: string;
  managementFee: number;
  performanceFee: number;
  totalFees: number;
  period: { start: Date; end: Date };
  highWaterMark: number;
  currentNav: number;
}

export interface FeeCollection {
  fundId: string;
  managementFee: number;
  performanceFee: number;
  totalCollected: number;
  collectedAt: Date;
  recipientAddress: string;
}

export interface Returns {
  fundId: string;
  period: string;
  absoluteReturn: number;
  percentReturn: number;
  benchmarkReturn?: number;
  alpha?: number;
  sharpeRatio: number;
  startNav: number;
  endNav: number;
}

export interface ComplianceCheck {
  passed: boolean;
  fundId: string;
  userId: string;
  kycStatus: 'verified' | 'pending' | 'failed' | 'not_required';
  accreditedStatus: 'verified' | 'pending' | 'failed' | 'not_required';
  jurisdictionAllowed: boolean;
  minInvestmentMet: boolean;
  capacityAvailable: boolean;
  lockPeriodAcknowledged: boolean;
  violations: string[];
}

// ============================================================================
// Default Fund Manager Implementation
// ============================================================================

export interface FundManagerConfig {
  defaultManagementFee?: number;
  defaultPerformanceFee?: number;
  minNavUpdateInterval?: number; // in minutes
  maxInvestorsPerFund?: number;
}

export class DefaultFundManager implements FundManager {
  private funds: Map<string, ManagedFund> = new Map();
  private eventCallbacks: LaunchpadEventCallback[] = [];
  private config: FundManagerConfig;

  constructor(config: Partial<FundManagerConfig> = {}) {
    this.config = {
      defaultManagementFee: config.defaultManagementFee ?? 2.0,
      defaultPerformanceFee: config.defaultPerformanceFee ?? 20.0,
      minNavUpdateInterval: config.minNavUpdateInterval ?? 60,
      maxInvestorsPerFund: config.maxInvestorsPerFund ?? 1000,
    };
  }

  // ============================================================================
  // Fund CRUD
  // ============================================================================

  async createFund(input: CreateFundInput): Promise<ManagedFund> {
    const fundId = `fund_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    const fund: ManagedFund = {
      id: fundId,
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: 'fundraising',
      strategy: this.buildStrategy(input.strategy),
      aum: 0,
      nav: 100, // Initial NAV per share is 100
      totalShares: 0,
      investors: [],
      agents: [],
      performance: this.initializePerformance(),
      fees: this.buildFees(input.fees),
      compliance: this.buildCompliance(input.compliance),
      createdAt: now,
      updatedAt: now,
      inceptionDate: now,
    };

    this.funds.set(fundId, fund);

    this.emitEvent('organization_created', input.organizationId, undefined, {
      type: 'fund_created',
      fundId,
      fundName: input.name,
      fundType: input.type,
    });

    return fund;
  }

  getFund(fundId: string): ManagedFund | undefined {
    return this.funds.get(fundId);
  }

  async updateFund(fundId: string, updates: UpdateFundInput): Promise<ManagedFund> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }

    if (updates.name !== undefined) {
      fund.name = updates.name;
    }
    if (updates.description !== undefined) {
      fund.description = updates.description;
    }
    if (updates.strategy) {
      fund.strategy = { ...fund.strategy, ...updates.strategy };
    }
    if (updates.fees) {
      fund.fees = { ...fund.fees, ...updates.fees };
    }
    if (updates.compliance) {
      fund.compliance = { ...fund.compliance, ...updates.compliance };
    }

    fund.updatedAt = new Date();

    return fund;
  }

  async closeFund(fundId: string, reason: string): Promise<boolean> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      return false;
    }

    if (fund.investors.some((i) => i.status === 'active')) {
      throw new Error('Cannot close fund with active investors. Process all redemptions first.');
    }

    fund.status = 'closed';
    fund.updatedAt = new Date();

    this.emitEvent('organization_updated', fund.organizationId, undefined, {
      type: 'fund_closed',
      fundId,
      reason,
    });

    return true;
  }

  listFunds(organizationId: string): ManagedFund[] {
    return Array.from(this.funds.values()).filter(
      (fund) => fund.organizationId === organizationId
    );
  }

  // ============================================================================
  // Fund Lifecycle
  // ============================================================================

  async launchFund(fundId: string): Promise<LaunchResult> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      return { success: false, fundId, initialNav: 0, error: 'Fund not found' };
    }

    if (fund.status !== 'fundraising') {
      return {
        success: false,
        fundId,
        initialNav: 0,
        error: `Cannot launch fund in ${fund.status} status`,
      };
    }

    fund.status = 'active';
    fund.updatedAt = new Date();
    fund.inceptionDate = new Date();

    this.emitEvent('organization_updated', fund.organizationId, undefined, {
      type: 'fund_launched',
      fundId,
      aum: fund.aum,
    });

    return {
      success: true,
      fundId,
      launchedAt: fund.inceptionDate,
      initialNav: fund.nav,
    };
  }

  async pauseFund(fundId: string, reason: string): Promise<void> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }

    if (fund.status !== 'active') {
      throw new Error(`Cannot pause fund in ${fund.status} status`);
    }

    fund.status = 'paused';
    fund.updatedAt = new Date();

    this.emitEvent('organization_updated', fund.organizationId, undefined, {
      type: 'fund_paused',
      fundId,
      reason,
    });
  }

  async resumeFund(fundId: string): Promise<void> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }

    if (fund.status !== 'paused') {
      throw new Error(`Cannot resume fund in ${fund.status} status`);
    }

    fund.status = 'active';
    fund.updatedAt = new Date();
  }

  // ============================================================================
  // Investor Management
  // ============================================================================

  async addInvestor(input: AddInvestorInput): Promise<FundInvestor> {
    const fund = this.funds.get(input.fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${input.fundId}`);
    }

    // Check capacity
    if (fund.investors.length >= (this.config.maxInvestorsPerFund ?? 1000)) {
      throw new Error('Fund has reached maximum investor capacity');
    }

    // Check compliance
    const compliance = this.checkCompliance(input.fundId, input.userId);
    if (!compliance.passed) {
      throw new Error(`Compliance check failed: ${compliance.violations.join(', ')}`);
    }

    // Calculate shares
    const sharesIssued = input.initialInvestment / fund.nav;
    const lockExpiry = input.lockPeriodDays
      ? new Date(Date.now() + input.lockPeriodDays * 24 * 60 * 60 * 1000)
      : fund.compliance.lockPeriodDays > 0
        ? new Date(Date.now() + fund.compliance.lockPeriodDays * 24 * 60 * 60 * 1000)
        : undefined;

    const investor: FundInvestor = {
      id: `investor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: input.userId,
      fundId: input.fundId,
      shares: sharesIssued,
      sharePercent: 0, // Will be calculated
      investedCapital: input.initialInvestment,
      currentValue: input.initialInvestment,
      unrealizedPnl: 0,
      realizedPnl: 0,
      status: 'active',
      investedAt: new Date(),
      lastActivityAt: new Date(),
      lockExpiry,
    };

    fund.investors.push(investor);
    fund.totalShares += sharesIssued;
    fund.aum += input.initialInvestment;

    // Update share percentages
    this.updateSharePercentages(fund);

    fund.updatedAt = new Date();

    this.emitEvent('capital_contributed', fund.organizationId, undefined, {
      fundId: input.fundId,
      investorId: investor.id,
      amount: input.initialInvestment,
      shares: sharesIssued,
    });

    return investor;
  }

  async removeInvestor(fundId: string, investorId: string, _reason: string): Promise<boolean> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      return false;
    }

    const investorIndex = fund.investors.findIndex((i) => i.id === investorId);
    if (investorIndex === -1) {
      return false;
    }

    // Process full redemption
    const redemptionResult = await this.processRedemption({
      fundId,
      investorId,
      percentage: 100,
      immediate: true,
    });

    if (!redemptionResult.success) {
      throw new Error(`Failed to process redemption: ${redemptionResult.error}`);
    }

    return true;
  }

  getInvestor(fundId: string, investorId: string): FundInvestor | undefined {
    const fund = this.funds.get(fundId);
    return fund?.investors.find((i) => i.id === investorId);
  }

  listInvestors(fundId: string): FundInvestor[] {
    const fund = this.funds.get(fundId);
    return fund?.investors ?? [];
  }

  async processInvestment(
    fundId: string,
    investorId: string,
    amount: number
  ): Promise<InvestmentResult> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      return {
        success: false,
        fundId,
        investorId,
        amount: 0,
        sharesIssued: 0,
        navAtPurchase: 0,
        timestamp: new Date(),
        error: 'Fund not found',
      };
    }

    const investor = fund.investors.find((i) => i.id === investorId);
    if (!investor) {
      return {
        success: false,
        fundId,
        investorId,
        amount: 0,
        sharesIssued: 0,
        navAtPurchase: 0,
        timestamp: new Date(),
        error: 'Investor not found',
      };
    }

    // Issue new shares at current NAV
    const sharesIssued = amount / fund.nav;

    investor.shares += sharesIssued;
    investor.investedCapital += amount;
    investor.currentValue = investor.shares * fund.nav;
    investor.lastActivityAt = new Date();

    fund.totalShares += sharesIssued;
    fund.aum += amount;

    this.updateSharePercentages(fund);
    fund.updatedAt = new Date();

    this.emitEvent('capital_contributed', fund.organizationId, undefined, {
      fundId,
      investorId,
      amount,
      shares: sharesIssued,
    });

    return {
      success: true,
      fundId,
      investorId,
      amount,
      sharesIssued,
      navAtPurchase: fund.nav,
      timestamp: new Date(),
    };
  }

  async processRedemption(input: RedemptionInput): Promise<RedemptionResult> {
    const fund = this.funds.get(input.fundId);
    if (!fund) {
      return {
        success: false,
        fundId: input.fundId,
        investorId: input.investorId,
        sharesRedeemed: 0,
        amountReturned: 0,
        navAtRedemption: 0,
        penaltyApplied: 0,
        timestamp: new Date(),
        error: 'Fund not found',
      };
    }

    const investor = fund.investors.find((i) => i.id === input.investorId);
    if (!investor) {
      return {
        success: false,
        fundId: input.fundId,
        investorId: input.investorId,
        sharesRedeemed: 0,
        amountReturned: 0,
        navAtRedemption: 0,
        penaltyApplied: 0,
        timestamp: new Date(),
        error: 'Investor not found',
      };
    }

    // Check lock period
    if (investor.lockExpiry && new Date() < investor.lockExpiry && !input.immediate) {
      return {
        success: false,
        fundId: input.fundId,
        investorId: input.investorId,
        sharesRedeemed: 0,
        amountReturned: 0,
        navAtRedemption: 0,
        penaltyApplied: 0,
        timestamp: new Date(),
        error: `Lock period not expired. Locked until ${investor.lockExpiry.toISOString()}`,
      };
    }

    // Calculate shares to redeem
    let sharesToRedeem: number;
    if (input.shareAmount !== undefined) {
      sharesToRedeem = Math.min(input.shareAmount, investor.shares);
    } else if (input.percentage !== undefined) {
      sharesToRedeem = investor.shares * (input.percentage / 100);
    } else {
      sharesToRedeem = investor.shares;
    }

    // Calculate redemption value
    let amountReturned = sharesToRedeem * fund.nav;

    // Apply early exit penalty if during lock period
    let penaltyApplied = 0;
    if (investor.lockExpiry && new Date() < investor.lockExpiry) {
      penaltyApplied = amountReturned * (fund.fees.exitFeePercent / 100);
      amountReturned -= penaltyApplied;
    }

    // Calculate realized PnL
    const costBasis = (investor.investedCapital / investor.shares) * sharesToRedeem;
    const realizedPnl = amountReturned - costBasis;

    // Update investor
    investor.shares -= sharesToRedeem;
    investor.currentValue = investor.shares * fund.nav;
    investor.realizedPnl += realizedPnl;
    investor.lastActivityAt = new Date();

    if (investor.shares <= 0) {
      investor.status = 'exited';
    }

    // Update fund
    fund.totalShares -= sharesToRedeem;
    fund.aum -= amountReturned;
    this.updateSharePercentages(fund);
    fund.updatedAt = new Date();

    this.emitEvent('capital_withdrawn', fund.organizationId, undefined, {
      fundId: input.fundId,
      investorId: input.investorId,
      sharesRedeemed: sharesToRedeem,
      amountReturned,
    });

    return {
      success: true,
      fundId: input.fundId,
      investorId: input.investorId,
      sharesRedeemed: sharesToRedeem,
      amountReturned,
      navAtRedemption: fund.nav,
      penaltyApplied,
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // NAV Management
  // ============================================================================

  async calculateNav(fundId: string): Promise<NavCalculation> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }

    // In production, this would aggregate all agent holdings and DeFi positions
    // For now, use current AUM as total assets
    const totalAssets = fund.aum;
    const totalLiabilities = fund.fees.feesAccrued;
    const nav = totalAssets - totalLiabilities;
    const navPerShare = fund.totalShares > 0 ? nav / fund.totalShares : 100;

    return {
      fundId,
      totalAssets,
      totalLiabilities,
      nav,
      navPerShare,
      totalShares: fund.totalShares,
      calculatedAt: new Date(),
      breakdown: [
        { asset: 'TON', value: totalAssets * 0.4, percentage: 40 },
        { asset: 'USDT', value: totalAssets * 0.3, percentage: 30, protocol: 'TonSwap' },
        { asset: 'Yield Positions', value: totalAssets * 0.3, percentage: 30, protocol: 'Various' },
      ],
    };
  }

  async updateNav(fundId: string, nav: number): Promise<void> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }

    const previousNav = fund.nav;
    fund.nav = nav;

    // Update performance history
    const navPoint: NavDataPoint = {
      date: new Date(),
      nav,
      aum: fund.aum,
      change: nav - previousNav,
      changePercent: previousNav > 0 ? ((nav - previousNav) / previousNav) * 100 : 0,
    };
    fund.performance.navHistory.push(navPoint);

    // Update all investor current values
    for (const investor of fund.investors) {
      investor.currentValue = investor.shares * nav;
      const costBasis = investor.investedCapital;
      investor.unrealizedPnl = investor.currentValue - costBasis + investor.realizedPnl;
    }

    // Update high water mark if needed
    if (nav > fund.fees.highWaterMark) {
      fund.fees.highWaterMark = nav;
    }

    fund.performance.lastUpdated = new Date();
    fund.updatedAt = new Date();
  }

  getNavHistory(fundId: string, days: number): NavDataPoint[] {
    const fund = this.funds.get(fundId);
    if (!fund) {
      return [];
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return fund.performance.navHistory.filter((point) => point.date >= cutoff);
  }

  // ============================================================================
  // Fee Management
  // ============================================================================

  async accruesFees(fundId: string): Promise<FeeAccrual> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }

    const now = new Date();
    const lastCollection = fund.fees.lastFeeCollection;
    const daysSinceCollection = lastCollection
      ? (now.getTime() - lastCollection.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    // Calculate management fee (pro-rated daily)
    const annualManagementFee = fund.aum * (fund.fees.managementFeePercent / 100);
    const managementFee = (annualManagementFee / 365) * daysSinceCollection;

    // Calculate performance fee (above high water mark)
    let performanceFee = 0;
    if (fund.nav > fund.fees.highWaterMark && fund.fees.hurdleRate !== undefined) {
      const excessReturn = fund.nav - fund.fees.highWaterMark;
      const hurdleAdjusted = Math.max(0, excessReturn - fund.fees.hurdleRate);
      performanceFee = (hurdleAdjusted * fund.totalShares * fund.fees.performanceFeePercent) / 100;
    }

    const totalFees = managementFee + performanceFee;
    fund.fees.feesAccrued = totalFees;

    return {
      fundId,
      managementFee,
      performanceFee,
      totalFees,
      period: { start: lastCollection ?? fund.inceptionDate, end: now },
      highWaterMark: fund.fees.highWaterMark,
      currentNav: fund.nav,
    };
  }

  async collectFees(fundId: string): Promise<FeeCollection> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }

    const accrual = await this.accruesFees(fundId);

    // Reset accrued fees
    fund.fees.feesAccrued = 0;
    fund.fees.feesCollected += accrual.totalFees;
    fund.fees.lastFeeCollection = new Date();

    // Deduct fees from AUM
    fund.aum -= accrual.totalFees;

    this.emitEvent('fee_collected', fund.organizationId, undefined, {
      fundId,
      managementFee: accrual.managementFee,
      performanceFee: accrual.performanceFee,
      total: accrual.totalFees,
    });

    return {
      fundId,
      managementFee: accrual.managementFee,
      performanceFee: accrual.performanceFee,
      totalCollected: accrual.totalFees,
      collectedAt: new Date(),
      recipientAddress: '', // Would be configured in production
    };
  }

  // ============================================================================
  // Performance
  // ============================================================================

  getPerformance(fundId: string): FundPerformance | undefined {
    const fund = this.funds.get(fundId);
    return fund?.performance;
  }

  calculateReturns(fundId: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Returns {
    const fund = this.funds.get(fundId);
    if (!fund) {
      return {
        fundId,
        period,
        absoluteReturn: 0,
        percentReturn: 0,
        sharpeRatio: 0,
        startNav: 0,
        endNav: 0,
      };
    }

    const periodDays =
      period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;

    const history = this.getNavHistory(fundId, periodDays);
    if (history.length === 0) {
      return {
        fundId,
        period,
        absoluteReturn: 0,
        percentReturn: 0,
        sharpeRatio: 0,
        startNav: fund.nav,
        endNav: fund.nav,
      };
    }

    const startNav = history[0].nav;
    const endNav = fund.nav;
    const absoluteReturn = endNav - startNav;
    const percentReturn = startNav > 0 ? (absoluteReturn / startNav) * 100 : 0;

    // Calculate Sharpe ratio
    const returns = history.map((h) => h.changePercent / 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(365 / periodDays) : 0;

    return {
      fundId,
      period,
      absoluteReturn,
      percentReturn,
      sharpeRatio,
      startNav,
      endNav,
    };
  }

  // ============================================================================
  // Compliance
  // ============================================================================

  checkCompliance(fundId: string, userId: string): ComplianceCheck {
    const fund = this.funds.get(fundId);
    if (!fund) {
      return {
        passed: false,
        fundId,
        userId,
        kycStatus: 'not_required',
        accreditedStatus: 'not_required',
        jurisdictionAllowed: false,
        minInvestmentMet: false,
        capacityAvailable: false,
        lockPeriodAcknowledged: false,
        violations: ['Fund not found'],
      };
    }

    const violations: string[] = [];

    // Check KYC (simulated - would integrate with KYC provider)
    const kycStatus: ComplianceCheck['kycStatus'] = fund.compliance.kycRequired ? 'verified' : 'not_required';
    if (fund.compliance.kycRequired && kycStatus !== 'verified') {
      violations.push('KYC verification required');
    }

    // Check accreditation
    const accreditedStatus: ComplianceCheck['accreditedStatus'] = fund.compliance.accreditedOnly
      ? 'verified'
      : 'not_required';
    if (fund.compliance.accreditedOnly && accreditedStatus !== 'verified') {
      violations.push('Accredited investor verification required');
    }

    // Check capacity
    const capacityAvailable = fund.investors.length < fund.compliance.maxInvestors;
    if (!capacityAvailable) {
      violations.push('Fund has reached maximum capacity');
    }

    return {
      passed: violations.length === 0,
      fundId,
      userId,
      kycStatus,
      accreditedStatus,
      jurisdictionAllowed: true, // Simplified
      minInvestmentMet: true, // Would check actual investment
      capacityAvailable,
      lockPeriodAcknowledged: true,
      violations,
    };
  }

  async updateCompliance(
    fundId: string,
    compliance: Partial<FundCompliance>
  ): Promise<ManagedFund> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }

    fund.compliance = { ...fund.compliance, ...compliance };
    fund.updatedAt = new Date();

    return fund;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: LaunchpadEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private buildStrategy(input: Partial<FundStrategy>): FundStrategy {
    return {
      name: input.name ?? 'Default Strategy',
      description: input.description ?? 'Balanced portfolio strategy',
      type: input.type ?? 'balanced',
      targetApy: input.targetApy ?? 15,
      riskLevel: input.riskLevel ?? 'moderate',
      allocationStrategy: input.allocationStrategy ?? [],
      rebalanceFrequency: input.rebalanceFrequency ?? 'weekly',
    };
  }

  private buildFees(input: Partial<FundFees>): FundFees {
    return {
      managementFeePercent: input.managementFeePercent ?? this.config.defaultManagementFee ?? 2.0,
      performanceFeePercent: input.performanceFeePercent ?? this.config.defaultPerformanceFee ?? 20.0,
      entryFeePercent: input.entryFeePercent ?? 0,
      exitFeePercent: input.exitFeePercent ?? 0,
      highWaterMark: input.highWaterMark ?? 100,
      hurdleRate: input.hurdleRate,
      feesAccrued: 0,
      feesCollected: 0,
      lastFeeCollection: new Date(),
    };
  }

  private buildCompliance(input: Partial<FundCompliance>): FundCompliance {
    return {
      accreditedOnly: input.accreditedOnly ?? false,
      minInvestment: input.minInvestment ?? 100,
      maxInvestors: input.maxInvestors ?? 1000,
      lockPeriodDays: input.lockPeriodDays ?? 0,
      redemptionNoticeDays: input.redemptionNoticeDays ?? 7,
      redemptionFrequency: input.redemptionFrequency ?? 'weekly',
      kycRequired: input.kycRequired ?? false,
      jurisdictionRestrictions: input.jurisdictionRestrictions ?? [],
    };
  }

  private initializePerformance(): FundPerformance {
    return {
      totalReturns: 0,
      returnsYtd: 0,
      returns1y: 0,
      returns3y: 0,
      returnsInception: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      navHistory: [],
      lastUpdated: new Date(),
    };
  }

  private updateSharePercentages(fund: ManagedFund): void {
    for (const investor of fund.investors) {
      investor.sharePercent =
        fund.totalShares > 0 ? (investor.shares / fund.totalShares) * 100 : 0;
    }
  }

  private emitEvent(
    type: LaunchpadEvent['type'],
    organizationId: string,
    agentId?: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: LaunchpadEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      organizationId,
      agentId,
      timestamp: new Date(),
      data,
      severity: 'info',
      metadata: {},
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

export function createFundManager(config?: Partial<FundManagerConfig>): DefaultFundManager {
  return new DefaultFundManager(config);
}
