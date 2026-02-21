/**
 * TONAIAgent - Lending Manager
 *
 * Core lending management service that orchestrates loan operations
 * across multiple providers (CoinRabbit, DeFi protocols, institutional).
 * Supports autonomous borrowing agents and AI-driven loan optimization.
 */

import {
  LendingConfig,
  BorrowingConfig,
  Loan,
  LoanStatus,
  LendingProvider,
  CollateralInfo,
  RepaymentSchedule,
  LoanAlert,
  LoanAlertType,
  CreateLoanRequest,
  RepayLoanRequest,
  AddCollateralRequest,
  WithdrawCollateralRequest,
  RefinanceLoanRequest,
  GetQuoteRequest,
  QuoteResponse,
  AICreditEvent,
  AICreditEventCallback,
} from './types';

import { createCoinRabbitAdapter } from './coinrabbit-adapter';

// ============================================================================
// Manager Interface
// ============================================================================

export interface LendingManager {
  readonly config: LendingConfig;
  readonly borrowingConfig: BorrowingConfig;
  readonly providers: Map<LendingProvider, ProviderAdapter>;

  // Provider Management
  registerProvider(provider: LendingProvider, adapter: ProviderAdapter): void;
  getProvider(provider: LendingProvider): ProviderAdapter | undefined;
  getAvailableProviders(): LendingProvider[];

  // Quote Operations
  getQuote(request: GetQuoteRequest): Promise<QuoteResponse>;
  getBestQuote(request: GetQuoteRequest): Promise<QuoteResponse>;
  getAllQuotes(request: GetQuoteRequest): Promise<QuoteResponse[]>;

  // Loan Operations
  createLoan(request: CreateLoanRequest): Promise<Loan>;
  getLoan(loanId: string): Promise<Loan>;
  getUserLoans(userId: string): Promise<Loan[]>;
  getActiveLoans(userId?: string): Promise<Loan[]>;

  // Repayment
  repayLoan(request: RepayLoanRequest): Promise<Loan>;
  getRepaymentSchedule(loanId: string): Promise<RepaymentSchedule>;

  // Collateral Management
  addCollateral(request: AddCollateralRequest): Promise<Loan>;
  withdrawCollateral(request: WithdrawCollateralRequest): Promise<Loan>;
  getCollateralInfo(loanId: string): Promise<CollateralInfo>;

  // Refinancing
  refinanceLoan(request: RefinanceLoanRequest): Promise<Loan>;
  getRefinanceOptions(loanId: string): Promise<QuoteResponse[]>;

  // Risk Monitoring
  checkLoanHealth(loanId: string): Promise<LoanHealthCheck>;
  getAlerts(loanId?: string): Promise<LoanAlert[]>;
  acknowledgeAlert(alertId: string): Promise<void>;

  // Statistics
  getStats(): Promise<LendingStats>;

  // Events
  onEvent(callback: AICreditEventCallback): void;
}

export interface ProviderAdapter {
  readonly provider: LendingProvider;
  readonly connected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;

  getQuote(
    collateralAsset: string,
    collateralAmount: string,
    borrowAsset: string,
    ltv?: number
  ): Promise<QuoteResponse>;

  createLoan(request: CreateLoanRequest): Promise<Loan>;
  getLoan(loanId: string): Promise<Loan>;
  repay(loanId: string, amount: string): Promise<void>;
  addCollateral(loanId: string, asset: string, amount: string): Promise<void>;
  withdrawCollateral(loanId: string, asset: string, amount: string): Promise<void>;
}

export interface LoanHealthCheck {
  loanId: string;
  health: 'healthy' | 'warning' | 'critical' | 'liquidation_risk';
  ltv: number;
  healthFactor: number;
  liquidationDistance: number;
  alerts: LoanAlert[];
  recommendations: string[];
}

export interface LendingStats {
  totalLoans: number;
  activeLoans: number;
  totalBorrowed: string;
  totalCollateral: string;
  averageLTV: number;
  averageInterestRate: number;
  loansAtRisk: number;
  defaultRate: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultLendingManager implements LendingManager {
  readonly config: LendingConfig;
  readonly borrowingConfig: BorrowingConfig;
  readonly providers: Map<LendingProvider, ProviderAdapter> = new Map();

  private loans: Map<string, Loan> = new Map();
  private alerts: Map<string, LoanAlert> = new Map();
  private eventCallbacks: AICreditEventCallback[] = [];

  constructor(
    lendingConfig?: Partial<LendingConfig>,
    borrowingConfig?: Partial<BorrowingConfig>
  ) {
    this.config = {
      enabled: lendingConfig?.enabled ?? true,
      defaultProvider: lendingConfig?.defaultProvider ?? 'coinrabbit',
      supportedAssets: lendingConfig?.supportedAssets ?? ['BTC', 'ETH', 'TON', 'USDT', 'USDC'],
      minLoanAmount: lendingConfig?.minLoanAmount ?? '100',
      maxLoanAmount: lendingConfig?.maxLoanAmount ?? '5000000',
      maxLTV: lendingConfig?.maxLTV ?? 0.75,
      defaultLTV: lendingConfig?.defaultLTV ?? 0.5,
      interestRateModel: lendingConfig?.interestRateModel ?? 'variable',
      autoRefinanceEnabled: lendingConfig?.autoRefinanceEnabled ?? true,
      marginCallThreshold: lendingConfig?.marginCallThreshold ?? 0.8,
      liquidationThreshold: lendingConfig?.liquidationThreshold ?? 0.85,
    };

    this.borrowingConfig = {
      enabled: borrowingConfig?.enabled ?? true,
      autonomousMode: borrowingConfig?.autonomousMode ?? false,
      maxAutonomousBorrow: borrowingConfig?.maxAutonomousBorrow ?? '10000',
      requireHumanApproval: borrowingConfig?.requireHumanApproval ?? true,
      approvalThreshold: borrowingConfig?.approvalThreshold ?? '5000',
      autoRepaymentEnabled: borrowingConfig?.autoRepaymentEnabled ?? true,
      autoCollateralTopUp: borrowingConfig?.autoCollateralTopUp ?? true,
      maxOpenLoans: borrowingConfig?.maxOpenLoans ?? 10,
      cooldownPeriod: borrowingConfig?.cooldownPeriod ?? 1,
    };

    // Initialize default CoinRabbit adapter
    this.initializeDefaultProviders();
  }

  private initializeDefaultProviders(): void {
    const coinRabbitAdapter = createCoinRabbitAdapter({ sandbox: true });

    // Wrap CoinRabbit adapter to match ProviderAdapter interface
    const wrappedAdapter: ProviderAdapter = {
      provider: 'coinrabbit',
      get connected() {
        return coinRabbitAdapter.connected;
      },
      connect: () => coinRabbitAdapter.connect(),
      disconnect: () => coinRabbitAdapter.disconnect(),
      healthCheck: () => coinRabbitAdapter.healthCheck(),
      getQuote: async (collateralAsset, collateralAmount, borrowAsset, ltv) => {
        const quote = await coinRabbitAdapter.getQuote(
          collateralAsset,
          collateralAmount,
          borrowAsset,
          ltv
        );
        return {
          provider: 'coinrabbit' as LendingProvider,
          collateral: {
            asset: quote.collateralCoin,
            amount: quote.collateralAmount,
            valueUSD: (
              parseFloat(quote.collateralAmount) *
              parseFloat(await coinRabbitAdapter.getPrice(quote.collateralCoin))
            ).toFixed(2),
          },
          loan: {
            asset: quote.loanCoin,
            amount: quote.loanAmount,
            valueUSD: (
              parseFloat(quote.loanAmount) *
              parseFloat(await coinRabbitAdapter.getPrice(quote.loanCoin))
            ).toFixed(2),
          },
          ltv: quote.ltv,
          interestRate: quote.interestRate,
          liquidationPrice: quote.liquidationPrice,
          fees: {
            origination: '0',
            maintenance: '0',
            lateFee: '0',
            liquidationFee: '0',
          },
          validUntil: quote.validUntil,
        };
      },
      createLoan: async (request) => {
        const crLoan = await coinRabbitAdapter.createLoan({
          collateralCoin: request.collateralAssets[0].symbol,
          collateralAmount: request.collateralAssets[0].amount,
          loanCoin: request.borrowAsset,
          loanAmount: request.borrowAmount,
          ltv: request.ltv ?? 0.5,
          walletAddress: 'user-wallet', // Would come from user context
        });

        return this.convertCoinRabbitLoan(crLoan);
      },
      getLoan: async (loanId) => {
        const crLoan = await coinRabbitAdapter.getLoan(loanId);
        return this.convertCoinRabbitLoan(crLoan);
      },
      repay: async (loanId, amount) => {
        await coinRabbitAdapter.simulateRepayment(loanId, amount);
      },
      addCollateral: async (loanId, _asset, amount) => {
        await coinRabbitAdapter.simulateCollateralTopUp(loanId, amount);
      },
      withdrawCollateral: async (loanId, _asset, amount) => {
        await coinRabbitAdapter.requestCollateralWithdraw(loanId, amount, 'user-address');
      },
    };

    this.providers.set('coinrabbit', wrappedAdapter);

    // Forward events from CoinRabbit adapter
    coinRabbitAdapter.onEvent((event) => {
      this.emitEvent(event);
    });
  }

  private convertCoinRabbitLoan(crLoan: any): Loan {
    return {
      id: crLoan.id,
      userId: 'user-1', // Would come from context
      provider: 'coinrabbit',
      externalId: crLoan.id,
      type: 'crypto_backed',
      status: this.mapCRStatus(crLoan.status),
      collateral: {
        assets: [
          {
            symbol: crLoan.collateral.coin,
            name: crLoan.collateral.coin,
            amount: crLoan.collateral.amount,
            valueUSD: crLoan.collateral.usdValue,
            weight: 1,
            volatility: 0.05,
            lockedAt: crLoan.createdAt,
          },
        ],
        totalValue: crLoan.collateral.amount,
        totalValueUSD: crLoan.collateral.usdValue,
        lockedValue: crLoan.collateral.amount,
        availableValue: '0',
        healthFactor: this.calculateHealthFactor(crLoan.ltv),
        riskScore: crLoan.ltv * 100,
      },
      principal: {
        asset: crLoan.loan.coin,
        amount: crLoan.loan.amount,
        valueUSD: crLoan.loan.usdValue,
        disbursedAmount: crLoan.loan.amount,
        remainingPrincipal: crLoan.loan.amount,
      },
      interest: {
        rate: crLoan.interestRate,
        type: 'variable',
        accrued: crLoan.interestAccrued,
        paid: '0',
        compoundingFrequency: 'daily',
      },
      ltv: {
        current: crLoan.ltv,
        initial: crLoan.ltv,
        max: 0.75,
        liquidation: 0.85,
        marginCall: 0.8,
        safeZone: 0.7,
      },
      terms: {
        earlyRepaymentAllowed: true,
        partialRepaymentAllowed: true,
        autoExtend: true,
        gracePeriod: 7,
        fees: {
          origination: '0',
          maintenance: '0',
          lateFee: '0',
          liquidationFee: '0',
        },
      },
      schedule: {
        type: 'flexible',
        payments: [],
        totalRemaining: (
          parseFloat(crLoan.loan.amount) + parseFloat(crLoan.interestAccrued)
        ).toFixed(8),
      },
      history: [
        {
          id: `hist-${Date.now()}`,
          timestamp: crLoan.createdAt,
          type: 'created',
          description: 'Loan created',
          data: {},
        },
      ],
      alerts: [],
      aiDecisions: [],
      createdAt: crLoan.createdAt,
      updatedAt: new Date(),
      metadata: {},
    };
  }

  private mapCRStatus(status: string): LoanStatus {
    const statusMap: Record<string, LoanStatus> = {
      pending: 'pending',
      active: 'active',
      margin_call: 'margin_call',
      liquidating: 'liquidation_pending',
      closed: 'closed',
      cancelled: 'cancelled',
    };
    return statusMap[status] ?? 'pending';
  }

  private calculateHealthFactor(ltv: number): number {
    // Health factor = liquidation threshold / current LTV
    const liquidationThreshold = 0.85;
    return liquidationThreshold / ltv;
  }

  // ============================================================================
  // Provider Management
  // ============================================================================

  registerProvider(provider: LendingProvider, adapter: ProviderAdapter): void {
    this.providers.set(provider, adapter);
  }

  getProvider(provider: LendingProvider): ProviderAdapter | undefined {
    return this.providers.get(provider);
  }

  getAvailableProviders(): LendingProvider[] {
    return Array.from(this.providers.keys());
  }

  // ============================================================================
  // Quote Operations
  // ============================================================================

  async getQuote(request: GetQuoteRequest): Promise<QuoteResponse> {
    const provider = this.providers.get(request.provider ?? this.config.defaultProvider);
    if (!provider) {
      throw new Error(`Provider not found: ${request.provider ?? this.config.defaultProvider}`);
    }

    if (!provider.connected) {
      await provider.connect();
    }

    return provider.getQuote(
      request.collateralAsset,
      request.collateralAmount,
      request.borrowAsset,
      request.ltv
    );
  }

  async getBestQuote(request: GetQuoteRequest): Promise<QuoteResponse> {
    const quotes = await this.getAllQuotes(request);
    if (quotes.length === 0) {
      throw new Error('No quotes available');
    }

    // Best quote = lowest interest rate
    return quotes.reduce((best, current) =>
      current.interestRate < best.interestRate ? current : best
    );
  }

  async getAllQuotes(request: GetQuoteRequest): Promise<QuoteResponse[]> {
    const quotes: QuoteResponse[] = [];

    for (const [provider, adapter] of this.providers) {
      try {
        if (!adapter.connected) {
          await adapter.connect();
        }
        const quote = await adapter.getQuote(
          request.collateralAsset,
          request.collateralAmount,
          request.borrowAsset,
          request.ltv
        );
        quotes.push({ ...quote, provider });
      } catch {
        // Skip providers that fail
      }
    }

    return quotes;
  }

  // ============================================================================
  // Loan Operations
  // ============================================================================

  async createLoan(request: CreateLoanRequest): Promise<Loan> {
    // Validate request
    this.validateCreateLoanRequest(request);

    // Check borrowing limits
    if (this.borrowingConfig.requireHumanApproval) {
      const borrowAmount = parseFloat(request.borrowAmount);
      const threshold = parseFloat(this.borrowingConfig.approvalThreshold);
      if (borrowAmount > threshold) {
        throw new Error(`Amount ${request.borrowAmount} requires human approval (threshold: ${threshold})`);
      }
    }

    // Get provider
    const provider = this.providers.get(request.provider ?? this.config.defaultProvider);
    if (!provider) {
      throw new Error(`Provider not found: ${request.provider ?? this.config.defaultProvider}`);
    }

    if (!provider.connected) {
      await provider.connect();
    }

    // Create loan through provider
    const loan = await provider.createLoan(request);

    // Store loan locally
    this.loans.set(loan.id, loan);

    // Emit event
    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'loan_requested',
      category: 'loan',
      userId: loan.userId,
      loanId: loan.id,
      data: {
        provider: loan.provider,
        borrowAmount: request.borrowAmount,
        borrowAsset: request.borrowAsset,
        collateral: request.collateralAssets,
      },
      metadata: {},
    });

    return loan;
  }

  private validateCreateLoanRequest(request: CreateLoanRequest): void {
    if (!request.collateralAssets || request.collateralAssets.length === 0) {
      throw new Error('Collateral assets required');
    }
    if (!request.borrowAsset) {
      throw new Error('Borrow asset required');
    }
    if (!request.borrowAmount || parseFloat(request.borrowAmount) <= 0) {
      throw new Error('Valid borrow amount required');
    }

    const borrowAmount = parseFloat(request.borrowAmount);
    if (borrowAmount < parseFloat(this.config.minLoanAmount)) {
      throw new Error(`Amount below minimum: ${this.config.minLoanAmount}`);
    }
    if (borrowAmount > parseFloat(this.config.maxLoanAmount)) {
      throw new Error(`Amount above maximum: ${this.config.maxLoanAmount}`);
    }

    if (request.ltv && request.ltv > this.config.maxLTV) {
      throw new Error(`LTV ${request.ltv} exceeds maximum ${this.config.maxLTV}`);
    }
  }

  async getLoan(loanId: string): Promise<Loan> {
    const loan = this.loans.get(loanId);
    if (!loan) {
      throw new Error(`Loan not found: ${loanId}`);
    }
    return { ...loan };
  }

  async getUserLoans(userId: string): Promise<Loan[]> {
    return Array.from(this.loans.values())
      .filter((l) => l.userId === userId)
      .map((l) => ({ ...l }));
  }

  async getActiveLoans(userId?: string): Promise<Loan[]> {
    return Array.from(this.loans.values())
      .filter((l) => l.status === 'active' && (!userId || l.userId === userId))
      .map((l) => ({ ...l }));
  }

  // ============================================================================
  // Repayment
  // ============================================================================

  async repayLoan(request: RepayLoanRequest): Promise<Loan> {
    const loan = await this.getLoan(request.loanId);
    const provider = this.providers.get(loan.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${loan.provider}`);
    }

    await provider.repay(request.loanId, request.amount);

    // Update local loan state
    const updatedLoan = await provider.getLoan(request.loanId);
    this.loans.set(request.loanId, updatedLoan);

    // Add history entry
    updatedLoan.history.push({
      id: this.generateId('hist'),
      timestamp: new Date(),
      type: 'payment_made',
      description: `Repayment of ${request.amount}`,
      data: { amount: request.amount, type: request.paymentType },
    });

    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'loan_repayment',
      category: 'loan',
      loanId: loan.id,
      data: { amount: request.amount, type: request.paymentType },
      metadata: {},
    });

    return updatedLoan;
  }

  async getRepaymentSchedule(loanId: string): Promise<RepaymentSchedule> {
    const loan = await this.getLoan(loanId);
    return loan.schedule;
  }

  // ============================================================================
  // Collateral Management
  // ============================================================================

  async addCollateral(request: AddCollateralRequest): Promise<Loan> {
    const loan = await this.getLoan(request.loanId);
    const provider = this.providers.get(loan.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${loan.provider}`);
    }

    await provider.addCollateral(request.loanId, request.asset, request.amount);

    // Update local loan state
    const updatedLoan = await provider.getLoan(request.loanId);
    this.loans.set(request.loanId, updatedLoan);

    // Add history entry
    updatedLoan.history.push({
      id: this.generateId('hist'),
      timestamp: new Date(),
      type: 'collateral_added',
      description: `Added ${request.amount} ${request.asset} collateral`,
      data: { asset: request.asset, amount: request.amount },
    });

    return updatedLoan;
  }

  async withdrawCollateral(request: WithdrawCollateralRequest): Promise<Loan> {
    const loan = await this.getLoan(request.loanId);
    const provider = this.providers.get(loan.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${loan.provider}`);
    }

    await provider.withdrawCollateral(request.loanId, request.asset, request.amount);

    // Update local loan state
    const updatedLoan = await provider.getLoan(request.loanId);
    this.loans.set(request.loanId, updatedLoan);

    // Add history entry
    updatedLoan.history.push({
      id: this.generateId('hist'),
      timestamp: new Date(),
      type: 'collateral_removed',
      description: `Withdrawn ${request.amount} ${request.asset} collateral`,
      data: { asset: request.asset, amount: request.amount },
    });

    return updatedLoan;
  }

  async getCollateralInfo(loanId: string): Promise<CollateralInfo> {
    const loan = await this.getLoan(loanId);
    return loan.collateral;
  }

  // ============================================================================
  // Refinancing
  // ============================================================================

  async refinanceLoan(request: RefinanceLoanRequest): Promise<Loan> {
    const existingLoan = await this.getLoan(request.loanId);

    // Get refinance options
    const options = await this.getRefinanceOptions(request.loanId);
    if (options.length === 0) {
      throw new Error('No refinance options available');
    }

    // Find the target provider's quote
    const targetProvider = request.newProvider ?? this.config.defaultProvider;
    const quote = options.find((o) => o.provider === targetProvider);
    if (!quote) {
      throw new Error(`Refinance option not available for provider: ${targetProvider}`);
    }

    // Create new loan with same collateral
    const newLoan = await this.createLoan({
      provider: targetProvider,
      collateralAssets: existingLoan.collateral.assets.map((a) => ({
        symbol: a.symbol,
        amount: a.amount,
      })),
      borrowAsset: existingLoan.principal.asset,
      borrowAmount: existingLoan.principal.remainingPrincipal,
      ltv: request.newTerms?.ltv ?? existingLoan.ltv.current,
    });

    // Mark old loan as refinanced and closed
    existingLoan.status = 'closed';
    existingLoan.history.push({
      id: this.generateId('hist'),
      timestamp: new Date(),
      type: 'refinanced',
      description: `Refinanced to loan ${newLoan.id}`,
      data: { newLoanId: newLoan.id, newProvider: targetProvider },
    });
    this.loans.set(request.loanId, existingLoan);

    return newLoan;
  }

  async getRefinanceOptions(loanId: string): Promise<QuoteResponse[]> {
    const loan = await this.getLoan(loanId);

    // Get quotes from all providers for current loan terms
    return this.getAllQuotes({
      collateralAsset: loan.collateral.assets[0].symbol,
      collateralAmount: loan.collateral.assets[0].amount,
      borrowAsset: loan.principal.asset,
      borrowAmount: loan.principal.remainingPrincipal,
    });
  }

  // ============================================================================
  // Risk Monitoring
  // ============================================================================

  async checkLoanHealth(loanId: string): Promise<LoanHealthCheck> {
    const loan = await this.getLoan(loanId);
    const alerts: LoanAlert[] = [];
    const recommendations: string[] = [];

    let health: LoanHealthCheck['health'] = 'healthy';
    const ltv = loan.ltv.current;
    const healthFactor = this.calculateHealthFactor(ltv);
    const liquidationDistance = (loan.ltv.liquidation - ltv) / ltv;

    // Check LTV thresholds
    if (ltv >= loan.ltv.liquidation) {
      health = 'liquidation_risk';
      alerts.push(this.createAlert(loanId, 'liquidation_risk', 'critical', 'Liquidation imminent'));
      recommendations.push('Add collateral immediately or repay loan');
    } else if (ltv >= loan.ltv.marginCall) {
      health = 'critical';
      alerts.push(this.createAlert(loanId, 'margin_critical', 'critical', 'Margin call triggered'));
      recommendations.push('Add collateral to avoid liquidation');
      recommendations.push('Consider partial repayment');
    } else if (ltv >= loan.ltv.safeZone) {
      health = 'warning';
      alerts.push(this.createAlert(loanId, 'margin_warning', 'warning', 'LTV approaching margin call threshold'));
      recommendations.push('Monitor loan closely');
      recommendations.push('Consider adding collateral as buffer');
    }

    // Check for payment due
    if (loan.schedule.nextPayment) {
      const daysUntilPayment = Math.ceil(
        (loan.schedule.nextPayment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilPayment <= 3) {
        alerts.push(this.createAlert(loanId, 'payment_due', 'warning', `Payment due in ${daysUntilPayment} days`));
      }
    }

    // Check for refinance opportunities
    if (health === 'healthy' && this.config.autoRefinanceEnabled) {
      const options = await this.getRefinanceOptions(loanId);
      const betterRate = options.find((o) => o.interestRate < loan.interest.rate - 0.01);
      if (betterRate) {
        recommendations.push(`Refinance opportunity: ${(betterRate.interestRate * 100).toFixed(1)}% APR available`);
      }
    }

    // Store alerts
    for (const alert of alerts) {
      this.alerts.set(alert.id, alert);
      loan.alerts.push(alert);
    }
    this.loans.set(loanId, loan);

    return {
      loanId,
      health,
      ltv,
      healthFactor,
      liquidationDistance,
      alerts,
      recommendations,
    };
  }

  private createAlert(
    _loanId: string,
    type: LoanAlertType,
    severity: 'info' | 'warning' | 'critical',
    message: string
  ): LoanAlert {
    return {
      id: this.generateId('alert'),
      type,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false,
    };
  }

  async getAlerts(loanId?: string): Promise<LoanAlert[]> {
    if (loanId) {
      const loan = await this.getLoan(loanId);
      return loan.alerts;
    }
    return Array.from(this.alerts.values());
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      this.alerts.set(alertId, alert);
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getStats(): Promise<LendingStats> {
    const allLoans = Array.from(this.loans.values());
    const activeLoans = allLoans.filter((l) => l.status === 'active');

    let totalBorrowed = 0;
    let totalCollateral = 0;
    let totalLTV = 0;
    let totalRate = 0;
    let loansAtRisk = 0;
    let defaults = 0;

    for (const loan of allLoans) {
      totalBorrowed += parseFloat(loan.principal.valueUSD);
      totalCollateral += parseFloat(loan.collateral.totalValueUSD);

      if (loan.status === 'active') {
        totalLTV += loan.ltv.current;
        totalRate += loan.interest.rate;
      }

      if (['margin_call', 'liquidation_pending'].includes(loan.status)) {
        loansAtRisk++;
      }

      if (loan.status === 'defaulted') {
        defaults++;
      }
    }

    return {
      totalLoans: allLoans.length,
      activeLoans: activeLoans.length,
      totalBorrowed: totalBorrowed.toFixed(2),
      totalCollateral: totalCollateral.toFixed(2),
      averageLTV: activeLoans.length > 0 ? totalLTV / activeLoans.length : 0,
      averageInterestRate: activeLoans.length > 0 ? totalRate / activeLoans.length : 0,
      loansAtRisk,
      defaultRate: allLoans.length > 0 ? defaults / allLoans.length : 0,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AICreditEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AICreditEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLendingManager(
  lendingConfig?: Partial<LendingConfig>,
  borrowingConfig?: Partial<BorrowingConfig>
): DefaultLendingManager {
  return new DefaultLendingManager(lendingConfig, borrowingConfig);
}

export default DefaultLendingManager;
