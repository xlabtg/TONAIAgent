/**
 * TONAIAgent - Securities Lending & Yield
 *
 * Future-ready securities lending infrastructure: token lending,
 * agent-to-agent liquidity, RWA-backed lending, structured yield products.
 * Enables prime brokerage revenue generation through lending operations.
 */

import {
  LendableToken,
  LendingAgreement,
  StructuredYieldProduct,
  AgentToAgentLoan,
  SecuritiesLendingConfig,
  CollateralPosition,
  LendingStatus,
  CollateralType,
  AgentId,
  FundId,
  AssetId,
  PrimeBrokerageEvent,
  PrimeBrokerageEventCallback,
} from './types';

// ============================================================================
// Securities Lending Manager Interface
// ============================================================================

export interface SecuritiesLendingManager {
  readonly config: SecuritiesLendingConfig;

  // Token Lending Registry
  listToken(params: ListTokenParams): LendableToken;
  delistToken(tokenId: string): LendableToken;
  getLendableToken(tokenId: string): LendableToken | undefined;
  listLendableTokens(filters?: TokenFilters): LendableToken[];
  updateLendingRate(tokenId: string, newRate: number): LendableToken;

  // Lending Agreements
  initiateLending(params: InitiateLendingParams): LendingAgreement;
  recallLoan(agreementId: string, reason?: string): LendingAgreement;
  repayLoan(agreementId: string): LendingAgreement;
  accrueInterest(agreementId: string): LendingAgreement;
  getLendingAgreement(agreementId: string): LendingAgreement | undefined;
  listLendingAgreements(filters?: AgreementFilters): LendingAgreement[];

  // Agent-to-Agent Loans
  createAgentLoan(params: CreateAgentLoanParams): AgentToAgentLoan;
  getAgentLoan(loanId: string): AgentToAgentLoan | undefined;
  listAgentLoans(agentId?: AgentId): AgentToAgentLoan[];
  settleAgentLoan(loanId: string): AgentToAgentLoan;

  // Structured Yield Products
  createStructuredProduct(params: CreateStructuredProductParams): StructuredYieldProduct;
  subscribeToProduct(productId: string, amount: number, investorId: string): SubscriptionResult;
  getStructuredProduct(productId: string): StructuredYieldProduct | undefined;
  listStructuredProducts(filters?: ProductFilters): StructuredYieldProduct[];
  matureProduct(productId: string): MaturityResult;

  // Analytics
  getLendingRevenue(fromDate?: Date, toDate?: Date): LendingRevenueReport;
  getTokenUtilizationReport(): TokenUtilizationReport;

  // Events
  onEvent(callback: PrimeBrokerageEventCallback): void;
}

export interface ListTokenParams {
  assetId: AssetId;
  assetName: string;
  ownerId: string;
  ownerType: 'fund' | 'agent';
  availableQuantity: number;
  minimumLendingRate: number;
  maxLendingTerm?: number;
  collateralRequired: CollateralType[];
}

export interface TokenFilters {
  assetId?: AssetId;
  ownerId?: string;
  minRate?: number;
  maxRate?: number;
  status?: LendingStatus;
  minQuantity?: number;
}

export interface InitiateLendingParams {
  lenderId: string;
  borrowerId: string;
  tokenId: string;
  quantity: number;
  agreedRate: number;
  termDays: number;
  collateral: Omit<CollateralPosition, 'id' | 'isLocked' | 'depositedAt' | 'updatedAt'>;
}

export interface AgreementFilters {
  lenderId?: string;
  borrowerId?: string;
  assetId?: AssetId;
  status?: LendingStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface CreateAgentLoanParams {
  lenderAgentId: AgentId;
  borrowerAgentId: AgentId;
  lenderFundId: FundId;
  borrowerFundId: FundId;
  assetId: AssetId;
  quantity: number;
  lendingRate: number;
  collateral: Omit<CollateralPosition, 'id' | 'isLocked' | 'lockedFor' | 'depositedAt' | 'updatedAt'>;
  termDays: number;
  reason: string;
}

export interface CreateStructuredProductParams {
  name: string;
  strategy: StructuredYieldProduct['strategy'];
  minInvestment: number;
  targetYield: number;
  maturityDays: number;
  backedBy: string[];
  riskRating: StructuredYieldProduct['riskRating'];
  totalCapacity: number;
}

export interface SubscriptionResult {
  success: boolean;
  productId: string;
  investorId: string;
  amount: number;
  sharesAllotted: number;
  confirmedAt: Date;
  maturityDate: Date;
  error?: string;
}

export interface ProductFilters {
  strategy?: StructuredYieldProduct['strategy'];
  riskRating?: StructuredYieldProduct['riskRating'];
  status?: StructuredYieldProduct['status'];
  minYield?: number;
  maxMinInvestment?: number;
}

export interface MaturityResult {
  productId: string;
  finalYield: number;
  principalReturned: number;
  interestPaid: number;
  investorCount: number;
  maturedAt: Date;
}

export interface LendingRevenueReport {
  fromDate: Date;
  toDate: Date;
  totalInterestEarned: number;
  totalFeeRevenue: number;
  totalRevenue: number;
  byAgreement: AgreementRevenue[];
  byAsset: AssetRevenue[];
}

export interface AgreementRevenue {
  agreementId: string;
  assetId: AssetId;
  interestEarned: number;
  durationDays: number;
}

export interface AssetRevenue {
  assetId: AssetId;
  assetName: string;
  totalInterestEarned: number;
  totalQuantityLent: number;
  avgRate: number;
}

export interface TokenUtilizationReport {
  totalTokensListed: number;
  totalTokensOnLoan: number;
  utilizationRate: number;
  byAsset: AssetUtilization[];
  avgLendingRate: number;
  totalCapitalDeployed: number;
}

export interface AssetUtilization {
  assetId: AssetId;
  assetName: string;
  listedQuantity: number;
  loanedQuantity: number;
  utilizationRate: number;
  currentRate: number;
}

// ============================================================================
// Default Securities Lending Manager Implementation
// ============================================================================

const DEFAULT_LENDING_CONFIG: SecuritiesLendingConfig = {
  enabled: true,
  agentToAgentLendingEnabled: true,
  maxLendingDuration: 90, // 90 days
  minCollateralizationRatio: 1.5, // 150%
  autoRecallEnabled: true,
  autoRecallTrigger: 'margin_call',
};

export class DefaultSecuritiesLendingManager implements SecuritiesLendingManager {
  readonly config: SecuritiesLendingConfig;

  private readonly lendableTokens: Map<string, LendableToken> = new Map();
  private readonly lendingAgreements: Map<string, LendingAgreement> = new Map();
  private readonly agentLoans: Map<string, AgentToAgentLoan> = new Map();
  private readonly structuredProducts: Map<string, StructuredYieldProduct> = new Map();
  private readonly productSubscriptions: Map<string, { investorId: string; amount: number }[]> = new Map();
  private readonly eventCallbacks: PrimeBrokerageEventCallback[] = [];

  constructor(config?: Partial<SecuritiesLendingConfig>) {
    this.config = { ...DEFAULT_LENDING_CONFIG, ...config };
  }

  // ============================================================================
  // Token Lending Registry
  // ============================================================================

  listToken(params: ListTokenParams): LendableToken {
    const token: LendableToken = {
      id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId: params.assetId,
      assetName: params.assetName,
      ownerId: params.ownerId,
      ownerType: params.ownerType,
      availableQuantity: params.availableQuantity,
      lendedQuantity: 0,
      currentLendingRate: params.minimumLendingRate,
      minimumLendingRate: params.minimumLendingRate,
      maxLendingTerm: params.maxLendingTerm ?? this.config.maxLendingDuration,
      collateralRequired: params.collateralRequired,
      status: 'available',
      listedAt: new Date(),
    };

    this.lendableTokens.set(token.id, token);

    this.emitEvent('info', 'securities_lending', `Token listed for lending: ${params.assetName}`, {
      tokenId: token.id,
      assetId: params.assetId,
      quantity: params.availableQuantity,
      rate: params.minimumLendingRate,
    });

    return token;
  }

  delistToken(tokenId: string): LendableToken {
    const token = this.lendableTokens.get(tokenId);
    if (!token) {
      throw new Error(`Lendable token not found: ${tokenId}`);
    }

    if (token.lendedQuantity > 0) {
      throw new Error(`Cannot delist token with active loans: ${tokenId}`);
    }

    token.status = 'recalled';
    this.lendableTokens.set(tokenId, token);

    return token;
  }

  getLendableToken(tokenId: string): LendableToken | undefined {
    return this.lendableTokens.get(tokenId);
  }

  listLendableTokens(filters?: TokenFilters): LendableToken[] {
    let tokens = Array.from(this.lendableTokens.values());

    if (filters) {
      if (filters.assetId) {
        tokens = tokens.filter(t => t.assetId === filters.assetId);
      }
      if (filters.ownerId) {
        tokens = tokens.filter(t => t.ownerId === filters.ownerId);
      }
      if (filters.minRate !== undefined) {
        tokens = tokens.filter(t => t.currentLendingRate >= filters.minRate!);
      }
      if (filters.maxRate !== undefined) {
        tokens = tokens.filter(t => t.currentLendingRate <= filters.maxRate!);
      }
      if (filters.status) {
        tokens = tokens.filter(t => t.status === filters.status);
      }
      if (filters.minQuantity !== undefined) {
        tokens = tokens.filter(t => t.availableQuantity >= filters.minQuantity!);
      }
    }

    return tokens;
  }

  updateLendingRate(tokenId: string, newRate: number): LendableToken {
    const token = this.lendableTokens.get(tokenId);
    if (!token) {
      throw new Error(`Lendable token not found: ${tokenId}`);
    }

    if (newRate < token.minimumLendingRate) {
      throw new Error(`New rate ${newRate} is below minimum ${token.minimumLendingRate}`);
    }

    token.currentLendingRate = newRate;
    this.lendableTokens.set(tokenId, token);

    return token;
  }

  // ============================================================================
  // Lending Agreements
  // ============================================================================

  initiateLending(params: InitiateLendingParams): LendingAgreement {
    const token = this.lendableTokens.get(params.tokenId);
    if (!token) {
      throw new Error(`Lendable token not found: ${params.tokenId}`);
    }

    if (params.quantity > token.availableQuantity) {
      throw new Error(`Insufficient available quantity: ${token.availableQuantity}`);
    }

    if (params.agreedRate < token.minimumLendingRate) {
      throw new Error(`Agreed rate ${params.agreedRate} below minimum ${token.minimumLendingRate}`);
    }

    // Check collateralization ratio
    // Compare collateral USD value against loan quantity (unit: tokens)
    // Ratio = collateralValueUsd / loanQuantity (higher is better)
    const collateralValue = params.collateral.valueUsd;
    const collRatio = collateralValue / params.quantity;

    if (collRatio < this.config.minCollateralizationRatio) {
      throw new Error(
        `Insufficient collateral: ${collRatio.toFixed(2)} ratio, minimum ${this.config.minCollateralizationRatio}`
      );
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + params.termDays * 24 * 60 * 60 * 1000);

    const collateralPosition: CollateralPosition = {
      ...params.collateral,
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adjustedValue: params.collateral.valueUsd * (1 - 0.1), // 10% haircut
      isLocked: true,
      lockedFor: `lending_${Date.now()}`,
      depositedAt: new Date(),
      updatedAt: new Date(),
    };

    const agreement: LendingAgreement = {
      id: `agreement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lenderId: params.lenderId,
      borrowerId: params.borrowerId,
      assetId: token.assetId,
      quantity: params.quantity,
      lendingRate: params.agreedRate,
      startDate,
      endDate,
      collateralPosted: [collateralPosition],
      totalCollateralValue: collateralValue,
      collateralizationRatio: collRatio,
      status: 'on_loan',
      accruedInterest: 0,
      lastInterestAccrual: startDate,
    };

    this.lendingAgreements.set(agreement.id, agreement);

    // Update token availability
    token.availableQuantity -= params.quantity;
    token.lendedQuantity += params.quantity;
    token.status = token.availableQuantity === 0 ? 'on_loan' : 'available';
    this.lendableTokens.set(params.tokenId, token);

    this.emitEvent('info', 'securities_lending', `Lending agreement initiated: ${agreement.id}`, {
      lenderId: params.lenderId,
      borrowerId: params.borrowerId,
      assetId: token.assetId,
      quantity: params.quantity,
      rate: params.agreedRate,
      termDays: params.termDays,
    });

    return agreement;
  }

  recallLoan(agreementId: string, _reason?: string): LendingAgreement {
    const agreement = this.lendingAgreements.get(agreementId);
    if (!agreement) {
      throw new Error(`Lending agreement not found: ${agreementId}`);
    }

    // Accrue final interest
    this.accrueInterest(agreementId);

    agreement.status = 'recalled';
    agreement.endDate = new Date(); // Early termination
    this.lendingAgreements.set(agreementId, agreement);

    // Return tokens to lender
    this.returnTokens(agreement);

    this.emitEvent('warning', 'securities_lending', `Loan recalled: ${agreementId}`, {
      lenderId: agreement.lenderId,
      borrowerId: agreement.borrowerId,
      reason: _reason ?? 'auto_recall',
    });

    return agreement;
  }

  repayLoan(agreementId: string): LendingAgreement {
    const agreement = this.lendingAgreements.get(agreementId);
    if (!agreement) {
      throw new Error(`Lending agreement not found: ${agreementId}`);
    }

    // Accrue final interest
    this.accrueInterest(agreementId);

    agreement.status = 'settled';
    this.lendingAgreements.set(agreementId, agreement);

    // Return tokens to lender
    this.returnTokens(agreement);

    this.emitEvent('info', 'securities_lending', `Loan repaid: ${agreementId}`, {
      lenderId: agreement.lenderId,
      borrowerId: agreement.borrowerId,
      accruedInterest: agreement.accruedInterest,
    });

    return agreement;
  }

  accrueInterest(agreementId: string): LendingAgreement {
    const agreement = this.lendingAgreements.get(agreementId);
    if (!agreement) {
      throw new Error(`Lending agreement not found: ${agreementId}`);
    }

    const now = new Date();
    const daysSinceLastAccrual = (now.getTime() - agreement.lastInterestAccrual.getTime()) / (1000 * 60 * 60 * 24);
    const loanValue = agreement.quantity * 100; // Simplified price
    const dailyRate = agreement.lendingRate / 365;
    const interestAccrued = loanValue * dailyRate * daysSinceLastAccrual;

    agreement.accruedInterest += interestAccrued;
    agreement.lastInterestAccrual = now;
    this.lendingAgreements.set(agreementId, agreement);

    return agreement;
  }

  getLendingAgreement(agreementId: string): LendingAgreement | undefined {
    return this.lendingAgreements.get(agreementId);
  }

  listLendingAgreements(filters?: AgreementFilters): LendingAgreement[] {
    let agreements = Array.from(this.lendingAgreements.values());

    if (filters) {
      if (filters.lenderId) {
        agreements = agreements.filter(a => a.lenderId === filters.lenderId);
      }
      if (filters.borrowerId) {
        agreements = agreements.filter(a => a.borrowerId === filters.borrowerId);
      }
      if (filters.assetId) {
        agreements = agreements.filter(a => a.assetId === filters.assetId);
      }
      if (filters.status) {
        agreements = agreements.filter(a => a.status === filters.status);
      }
      if (filters.fromDate) {
        agreements = agreements.filter(a => a.startDate >= filters.fromDate!);
      }
      if (filters.toDate) {
        agreements = agreements.filter(a => a.startDate <= filters.toDate!);
      }
    }

    return agreements;
  }

  // ============================================================================
  // Agent-to-Agent Loans
  // ============================================================================

  createAgentLoan(params: CreateAgentLoanParams): AgentToAgentLoan {
    if (!this.config.agentToAgentLendingEnabled) {
      throw new Error('Agent-to-agent lending is disabled');
    }

    const collateral: CollateralPosition = {
      ...params.collateral,
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adjustedValue: params.collateral.valueUsd * 0.9, // 10% haircut
      isLocked: true,
      lockedFor: `agent_loan_${Date.now()}`,
      depositedAt: new Date(),
      updatedAt: new Date(),
    };

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + params.termDays * 24 * 60 * 60 * 1000);

    const loan: AgentToAgentLoan = {
      id: `a2a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lenderAgentId: params.lenderAgentId,
      borrowerAgentId: params.borrowerAgentId,
      lenderFundId: params.lenderFundId,
      borrowerFundId: params.borrowerFundId,
      assetId: params.assetId,
      quantity: params.quantity,
      lendingRate: params.lendingRate,
      collateral,
      term: params.termDays,
      startDate,
      endDate,
      status: 'on_loan',
      reason: params.reason,
    };

    this.agentLoans.set(loan.id, loan);

    this.emitEvent('info', 'securities_lending', `Agent-to-agent loan created: ${loan.id}`, {
      lenderAgentId: params.lenderAgentId,
      borrowerAgentId: params.borrowerAgentId,
      assetId: params.assetId,
      quantity: params.quantity,
      reason: params.reason,
    });

    return loan;
  }

  getAgentLoan(loanId: string): AgentToAgentLoan | undefined {
    return this.agentLoans.get(loanId);
  }

  listAgentLoans(agentId?: AgentId): AgentToAgentLoan[] {
    const all = Array.from(this.agentLoans.values());
    if (agentId) {
      return all.filter(l => l.lenderAgentId === agentId || l.borrowerAgentId === agentId);
    }
    return all;
  }

  settleAgentLoan(loanId: string): AgentToAgentLoan {
    const loan = this.agentLoans.get(loanId);
    if (!loan) {
      throw new Error(`Agent loan not found: ${loanId}`);
    }

    loan.status = 'settled';
    loan.collateral.isLocked = false;
    this.agentLoans.set(loanId, loan);

    this.emitEvent('info', 'securities_lending', `Agent loan settled: ${loanId}`, {
      lenderAgentId: loan.lenderAgentId,
      borrowerAgentId: loan.borrowerAgentId,
    });

    return loan;
  }

  // ============================================================================
  // Structured Yield Products
  // ============================================================================

  createStructuredProduct(params: CreateStructuredProductParams): StructuredYieldProduct {
    const now = new Date();
    const matureAt = new Date(now.getTime() + params.maturityDays * 24 * 60 * 60 * 1000);

    const product: StructuredYieldProduct = {
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      strategy: params.strategy,
      minInvestment: params.minInvestment,
      targetYield: params.targetYield,
      maturityDays: params.maturityDays,
      backedBy: params.backedBy,
      riskRating: params.riskRating,
      totalCapacity: params.totalCapacity,
      subscribedAmount: 0,
      availableAmount: params.totalCapacity,
      status: 'active',
      createdAt: now,
      matureAt,
    };

    this.structuredProducts.set(product.id, product);
    this.productSubscriptions.set(product.id, []);

    this.emitEvent('info', 'securities_lending', `Structured yield product created: ${params.name}`, {
      productId: product.id,
      targetYield: params.targetYield,
      capacity: params.totalCapacity,
    });

    return product;
  }

  subscribeToProduct(productId: string, amount: number, investorId: string): SubscriptionResult {
    const product = this.structuredProducts.get(productId);
    if (!product) {
      return {
        success: false,
        productId,
        investorId,
        amount,
        sharesAllotted: 0,
        confirmedAt: new Date(),
        maturityDate: new Date(),
        error: 'Product not found',
      };
    }

    if (product.status !== 'active') {
      return {
        success: false,
        productId,
        investorId,
        amount,
        sharesAllotted: 0,
        confirmedAt: new Date(),
        maturityDate: product.matureAt,
        error: `Product is ${product.status}`,
      };
    }

    if (amount < product.minInvestment) {
      return {
        success: false,
        productId,
        investorId,
        amount,
        sharesAllotted: 0,
        confirmedAt: new Date(),
        maturityDate: product.matureAt,
        error: `Minimum investment is ${product.minInvestment}`,
      };
    }

    if (amount > product.availableAmount) {
      return {
        success: false,
        productId,
        investorId,
        amount,
        sharesAllotted: 0,
        confirmedAt: new Date(),
        maturityDate: product.matureAt,
        error: `Insufficient capacity: ${product.availableAmount} available`,
      };
    }

    // Process subscription
    product.subscribedAmount += amount;
    product.availableAmount -= amount;
    this.structuredProducts.set(productId, product);

    const subscriptions = this.productSubscriptions.get(productId) ?? [];
    subscriptions.push({ investorId, amount });
    this.productSubscriptions.set(productId, subscriptions);

    const sharesAllotted = amount / product.minInvestment;

    this.emitEvent('info', 'securities_lending', `Product subscription: ${productId}`, {
      productId,
      investorId,
      amount,
      sharesAllotted,
    });

    return {
      success: true,
      productId,
      investorId,
      amount,
      sharesAllotted,
      confirmedAt: new Date(),
      maturityDate: product.matureAt,
    };
  }

  getStructuredProduct(productId: string): StructuredYieldProduct | undefined {
    return this.structuredProducts.get(productId);
  }

  listStructuredProducts(filters?: ProductFilters): StructuredYieldProduct[] {
    let products = Array.from(this.structuredProducts.values());

    if (filters) {
      if (filters.strategy) {
        products = products.filter(p => p.strategy === filters.strategy);
      }
      if (filters.riskRating) {
        products = products.filter(p => p.riskRating === filters.riskRating);
      }
      if (filters.status) {
        products = products.filter(p => p.status === filters.status);
      }
      if (filters.minYield !== undefined) {
        products = products.filter(p => p.targetYield >= filters.minYield!);
      }
      if (filters.maxMinInvestment !== undefined) {
        products = products.filter(p => p.minInvestment <= filters.maxMinInvestment!);
      }
    }

    return products;
  }

  matureProduct(productId: string): MaturityResult {
    const product = this.structuredProducts.get(productId);
    if (!product) {
      throw new Error(`Structured product not found: ${productId}`);
    }

    const interestPaid = product.subscribedAmount * product.targetYield * (product.maturityDays / 365);

    product.status = 'matured';
    product.actualYield = product.targetYield; // Simplified: assume target achieved
    this.structuredProducts.set(productId, product);

    const subscriptions = this.productSubscriptions.get(productId) ?? [];

    this.emitEvent('info', 'securities_lending', `Structured product matured: ${productId}`, {
      productId,
      subscribedAmount: product.subscribedAmount,
      interestPaid,
      investorCount: subscriptions.length,
    });

    return {
      productId,
      finalYield: product.targetYield,
      principalReturned: product.subscribedAmount,
      interestPaid,
      investorCount: subscriptions.length,
      maturedAt: new Date(),
    };
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  getLendingRevenue(fromDate?: Date, toDate?: Date): LendingRevenueReport {
    let agreements = Array.from(this.lendingAgreements.values());

    if (fromDate) agreements = agreements.filter(a => a.startDate >= fromDate);
    if (toDate) agreements = agreements.filter(a => a.startDate <= toDate);

    const byAgreement: AgreementRevenue[] = agreements.map(a => {
      const days = (Date.now() - a.startDate.getTime()) / (1000 * 60 * 60 * 24);
      return {
        agreementId: a.id,
        assetId: a.assetId,
        interestEarned: a.accruedInterest,
        durationDays: days,
      };
    });

    // Group by asset
    const assetMap = new Map<AssetId, { interest: number; quantity: number; rates: number[] }>();
    for (const a of agreements) {
      const existing = assetMap.get(a.assetId) ?? { interest: 0, quantity: 0, rates: [] };
      existing.interest += a.accruedInterest;
      existing.quantity += a.quantity;
      existing.rates.push(a.lendingRate);
      assetMap.set(a.assetId, existing);
    }

    const byAsset: AssetRevenue[] = [...assetMap.entries()].map(([assetId, data]) => ({
      assetId,
      assetName: assetId, // Simplified
      totalInterestEarned: data.interest,
      totalQuantityLent: data.quantity,
      avgRate: data.rates.reduce((sum, r) => sum + r, 0) / data.rates.length,
    }));

    const totalInterest = byAgreement.reduce((sum, a) => sum + a.interestEarned, 0);

    return {
      fromDate: fromDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      toDate: toDate ?? new Date(),
      totalInterestEarned: totalInterest,
      totalFeeRevenue: totalInterest * 0.1, // 10% of interest as fees
      totalRevenue: totalInterest * 1.1,
      byAgreement,
      byAsset,
    };
  }

  getTokenUtilizationReport(): TokenUtilizationReport {
    const tokens = Array.from(this.lendableTokens.values());
    const totalListed = tokens.reduce((sum, t) => sum + t.availableQuantity + t.lendedQuantity, 0);
    const totalLoaned = tokens.reduce((sum, t) => sum + t.lendedQuantity, 0);

    const byAsset: AssetUtilization[] = tokens.map(t => ({
      assetId: t.assetId,
      assetName: t.assetName,
      listedQuantity: t.availableQuantity + t.lendedQuantity,
      loanedQuantity: t.lendedQuantity,
      utilizationRate: (t.availableQuantity + t.lendedQuantity) > 0
        ? t.lendedQuantity / (t.availableQuantity + t.lendedQuantity)
        : 0,
      currentRate: t.currentLendingRate,
    }));

    const avgRate = tokens.length > 0
      ? tokens.reduce((sum, t) => sum + t.currentLendingRate, 0) / tokens.length
      : 0;

    return {
      totalTokensListed: tokens.length,
      totalTokensOnLoan: tokens.filter(t => t.lendedQuantity > 0).length,
      utilizationRate: totalListed > 0 ? totalLoaned / totalListed : 0,
      byAsset,
      avgLendingRate: avgRate,
      totalCapitalDeployed: totalLoaned * 100, // Simplified price
    };
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

  private returnTokens(agreement: LendingAgreement): void {
    // Find lendable token and return quantity
    for (const [tokenId, token] of this.lendableTokens.entries()) {
      if (token.assetId === agreement.assetId && token.ownerId === agreement.lenderId) {
        token.lendedQuantity -= agreement.quantity;
        token.availableQuantity += agreement.quantity;
        token.status = 'available';
        this.lendableTokens.set(tokenId, token);
        break;
      }
    }
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: PrimeBrokerageEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'lending_initiated',
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

export function createSecuritiesLendingManager(
  config?: Partial<SecuritiesLendingConfig>
): DefaultSecuritiesLendingManager {
  return new DefaultSecuritiesLendingManager(config);
}
