/**
 * TONAIAgent - CoinRabbit API Adapter
 *
 * Integration with CoinRabbit's crypto-backed lending platform.
 * Provides instant loans without credit checks, flexible LTV ratios,
 * and automated collateral monitoring.
 *
 * CoinRabbit API Documentation: https://documenter.getpostman.com/view/18567220/UVeNnP5y
 */

import {
  CoinRabbitConfig,
  CoinRabbitLoan,
  CoinRabbitQuote,
  CoinRabbitPaymentAddress,
  AICreditEvent,
  AICreditEventCallback,
} from './types';

// ============================================================================
// API Types
// ============================================================================

export interface CoinRabbitAPIConfig {
  baseUrl: string;
  apiKey?: string;
  partnerId?: string;
  sandbox: boolean;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface CoinRabbitCoin {
  symbol: string;
  name: string;
  network: string;
  minLoan: string;
  maxLoan: string;
  minCollateral: string;
  enabled: boolean;
}

interface CoinRabbitRate {
  collateralCoin: string;
  loanCoin: string;
  ltv: number;
  interestRate: number;
  liquidationLtv: number;
}

interface CoinRabbitLoanCreate {
  collateralCoin: string;
  collateralAmount: string;
  loanCoin: string;
  loanAmount: string;
  ltv: number;
  walletAddress: string;
  email?: string;
  refundAddress?: string;
}

interface CoinRabbitRepaymentInfo {
  loanId: string;
  repaymentAmount: string;
  repaymentCoin: string;
  paymentAddress: string;
  paymentMemo?: string;
  deadline: string;
}

// ============================================================================
// Adapter Interface
// ============================================================================

export interface CoinRabbitAdapter {
  readonly config: CoinRabbitAPIConfig;
  readonly connected: boolean;

  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;

  // Coin and Rate Information
  getSupportedCoins(): Promise<CoinRabbitCoin[]>;
  getRates(collateralCoin: string, loanCoin: string): Promise<CoinRabbitRate>;
  getAllRates(): Promise<CoinRabbitRate[]>;

  // Quote
  getQuote(
    collateralCoin: string,
    collateralAmount: string,
    loanCoin: string,
    ltv?: number
  ): Promise<CoinRabbitQuote>;

  // Loan Management
  createLoan(params: CoinRabbitLoanCreate): Promise<CoinRabbitLoan>;
  getLoan(loanId: string): Promise<CoinRabbitLoan>;
  getUserLoans(userId?: string): Promise<CoinRabbitLoan[]>;
  getActiveLoans(): Promise<CoinRabbitLoan[]>;

  // Repayment
  getRepaymentInfo(loanId: string): Promise<CoinRabbitRepaymentInfo>;
  initializeRepayment(loanId: string, amount: string): Promise<CoinRabbitPaymentAddress>;

  // Collateral
  getCollateralTopUpAddress(loanId: string): Promise<CoinRabbitPaymentAddress>;
  requestCollateralWithdraw(loanId: string, amount: string, address: string): Promise<void>;

  // Price Information
  getPrice(coin: string): Promise<string>;
  getPrices(coins: string[]): Promise<Record<string, string>>;
  getLiquidationPrice(loanId: string): Promise<string>;

  // Events
  onEvent(callback: AICreditEventCallback): void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultCoinRabbitAdapter implements CoinRabbitAdapter {
  readonly config: CoinRabbitAPIConfig;
  private _connected: boolean = false;
  private eventCallbacks: AICreditEventCallback[] = [];
  private loans: Map<string, CoinRabbitLoan> = new Map();
  private coins: CoinRabbitCoin[] = [];
  private rates: CoinRabbitRate[] = [];
  private prices: Map<string, string> = new Map();

  constructor(config?: Partial<CoinRabbitConfig>) {
    this.config = {
      baseUrl: config?.sandbox
        ? 'https://api-sandbox.coinrabbit.io'
        : 'https://api.coinrabbit.io',
      apiKey: config?.apiKey,
      partnerId: config?.partnerId,
      sandbox: config?.sandbox ?? true,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    };

    // Initialize with default supported coins
    this.initializeDefaults();
  }

  get connected(): boolean {
    return this._connected;
  }

  private initializeDefaults(): void {
    // Default supported coins for simulation
    this.coins = [
      { symbol: 'BTC', name: 'Bitcoin', network: 'bitcoin', minLoan: '100', maxLoan: '5000000', minCollateral: '0.001', enabled: true },
      { symbol: 'ETH', name: 'Ethereum', network: 'ethereum', minLoan: '100', maxLoan: '5000000', minCollateral: '0.01', enabled: true },
      { symbol: 'TON', name: 'Toncoin', network: 'ton', minLoan: '100', maxLoan: '1000000', minCollateral: '10', enabled: true },
      { symbol: 'USDT', name: 'Tether', network: 'ethereum', minLoan: '100', maxLoan: '5000000', minCollateral: '100', enabled: true },
      { symbol: 'USDC', name: 'USD Coin', network: 'ethereum', minLoan: '100', maxLoan: '5000000', minCollateral: '100', enabled: true },
      { symbol: 'BNB', name: 'BNB', network: 'bsc', minLoan: '100', maxLoan: '2000000', minCollateral: '0.1', enabled: true },
      { symbol: 'SOL', name: 'Solana', network: 'solana', minLoan: '100', maxLoan: '2000000', minCollateral: '0.5', enabled: true },
      { symbol: 'MATIC', name: 'Polygon', network: 'polygon', minLoan: '100', maxLoan: '1000000', minCollateral: '50', enabled: true },
    ];

    // Default rates
    this.rates = [
      { collateralCoin: 'BTC', loanCoin: 'USDT', ltv: 0.5, interestRate: 0.12, liquidationLtv: 0.85 },
      { collateralCoin: 'ETH', loanCoin: 'USDT', ltv: 0.5, interestRate: 0.13, liquidationLtv: 0.83 },
      { collateralCoin: 'TON', loanCoin: 'USDT', ltv: 0.5, interestRate: 0.14, liquidationLtv: 0.80 },
      { collateralCoin: 'BNB', loanCoin: 'USDT', ltv: 0.5, interestRate: 0.13, liquidationLtv: 0.82 },
      { collateralCoin: 'SOL', loanCoin: 'USDT', ltv: 0.5, interestRate: 0.14, liquidationLtv: 0.80 },
      { collateralCoin: 'BTC', loanCoin: 'USDC', ltv: 0.5, interestRate: 0.12, liquidationLtv: 0.85 },
      { collateralCoin: 'ETH', loanCoin: 'USDC', ltv: 0.5, interestRate: 0.13, liquidationLtv: 0.83 },
    ];

    // Default prices (simulation)
    this.prices.set('BTC', '65000');
    this.prices.set('ETH', '3500');
    this.prices.set('TON', '6.50');
    this.prices.set('USDT', '1');
    this.prices.set('USDC', '1');
    this.prices.set('BNB', '580');
    this.prices.set('SOL', '150');
    this.prices.set('MATIC', '0.90');
  }

  async connect(): Promise<void> {
    // In production, this would establish connection and validate API key
    this._connected = true;
    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'provider_connected',
      category: 'system',
      data: { provider: 'coinrabbit', sandbox: this.config.sandbox },
      metadata: {},
    });
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'provider_disconnected',
      category: 'system',
      data: { provider: 'coinrabbit' },
      metadata: {},
    });
  }

  async healthCheck(): Promise<boolean> {
    return this._connected;
  }

  async getSupportedCoins(): Promise<CoinRabbitCoin[]> {
    this.ensureConnected();
    return [...this.coins];
  }

  async getRates(collateralCoin: string, loanCoin: string): Promise<CoinRabbitRate> {
    this.ensureConnected();
    const rate = this.rates.find(
      (r) => r.collateralCoin === collateralCoin && r.loanCoin === loanCoin
    );
    if (!rate) {
      throw new Error(`Rate not found for ${collateralCoin}/${loanCoin}`);
    }
    return { ...rate };
  }

  async getAllRates(): Promise<CoinRabbitRate[]> {
    this.ensureConnected();
    return [...this.rates];
  }

  async getQuote(
    collateralCoin: string,
    collateralAmount: string,
    loanCoin: string,
    ltv?: number
  ): Promise<CoinRabbitQuote> {
    this.ensureConnected();

    const rate = await this.getRates(collateralCoin, loanCoin);
    const collateralPrice = await this.getPrice(collateralCoin);
    const loanPrice = await this.getPrice(loanCoin);

    const collateralValueUSD =
      parseFloat(collateralAmount) * parseFloat(collateralPrice);
    const effectiveLTV = ltv ?? rate.ltv;
    const loanAmountUSD = collateralValueUSD * effectiveLTV;
    const loanAmount = loanAmountUSD / parseFloat(loanPrice);

    const liquidationPrice =
      (parseFloat(collateralAmount) > 0)
        ? (loanAmountUSD / rate.liquidationLtv / parseFloat(collateralAmount)).toFixed(2)
        : '0';

    return {
      id: this.generateId('quote'),
      collateralCoin,
      collateralAmount,
      loanCoin,
      loanAmount: loanAmount.toFixed(8),
      ltv: effectiveLTV,
      interestRate: rate.interestRate,
      liquidationPrice,
      validUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
  }

  async createLoan(params: CoinRabbitLoanCreate): Promise<CoinRabbitLoan> {
    this.ensureConnected();

    const quote = await this.getQuote(
      params.collateralCoin,
      params.collateralAmount,
      params.loanCoin,
      params.ltv
    );

    const collateralPrice = await this.getPrice(params.collateralCoin);
    const loanPrice = await this.getPrice(params.loanCoin);

    const loan: CoinRabbitLoan = {
      id: this.generateId('loan'),
      status: 'pending',
      collateral: {
        coin: params.collateralCoin,
        amount: params.collateralAmount,
        usdValue: (
          parseFloat(params.collateralAmount) * parseFloat(collateralPrice)
        ).toFixed(2),
      },
      loan: {
        coin: params.loanCoin,
        amount: params.loanAmount,
        usdValue: (
          parseFloat(params.loanAmount) * parseFloat(loanPrice)
        ).toFixed(2),
      },
      ltv: quote.ltv,
      interestRate: quote.interestRate,
      interestAccrued: '0',
      liquidationPrice: quote.liquidationPrice,
      createdAt: new Date(),
      expiresAt: undefined, // Open-ended loan
    };

    this.loans.set(loan.id, loan);

    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'loan_requested',
      category: 'loan',
      loanId: loan.id,
      data: {
        collateral: loan.collateral,
        loan: loan.loan,
        ltv: loan.ltv,
      },
      metadata: {},
    });

    // Simulate automatic approval after collateral confirmation
    // In production, this would happen via webhook when collateral is received
    setTimeout(() => {
      this.activateLoan(loan.id);
    }, 100);

    return loan;
  }

  private async activateLoan(loanId: string): Promise<void> {
    const loan = this.loans.get(loanId);
    if (loan && loan.status === 'pending') {
      loan.status = 'active';
      this.loans.set(loanId, loan);

      this.emitEvent({
        id: this.generateId('evt'),
        timestamp: new Date(),
        type: 'loan_disbursed',
        category: 'loan',
        loanId: loan.id,
        data: {
          amount: loan.loan.amount,
          coin: loan.loan.coin,
        },
        metadata: {},
      });
    }
  }

  async getLoan(loanId: string): Promise<CoinRabbitLoan> {
    this.ensureConnected();
    const loan = this.loans.get(loanId);
    if (!loan) {
      throw new Error(`Loan not found: ${loanId}`);
    }
    return { ...loan };
  }

  async getUserLoans(_userId?: string): Promise<CoinRabbitLoan[]> {
    this.ensureConnected();
    // In production, this would filter by user
    return Array.from(this.loans.values()).map((l) => ({ ...l }));
  }

  async getActiveLoans(): Promise<CoinRabbitLoan[]> {
    this.ensureConnected();
    return Array.from(this.loans.values())
      .filter((l) => l.status === 'active')
      .map((l) => ({ ...l }));
  }

  async getRepaymentInfo(loanId: string): Promise<CoinRabbitRepaymentInfo> {
    this.ensureConnected();
    const loan = await this.getLoan(loanId);

    const totalDue =
      parseFloat(loan.loan.amount) + parseFloat(loan.interestAccrued);

    return {
      loanId: loan.id,
      repaymentAmount: totalDue.toFixed(8),
      repaymentCoin: loan.loan.coin,
      paymentAddress: this.generateAddress(loan.loan.coin),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
  }

  async initializeRepayment(
    loanId: string,
    _amount: string
  ): Promise<CoinRabbitPaymentAddress> {
    this.ensureConnected();
    const loan = await this.getLoan(loanId);

    return {
      address: this.generateAddress(loan.loan.coin),
      coin: loan.loan.coin,
      network: this.getNetwork(loan.loan.coin),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };
  }

  async getCollateralTopUpAddress(loanId: string): Promise<CoinRabbitPaymentAddress> {
    this.ensureConnected();
    const loan = await this.getLoan(loanId);

    return {
      address: this.generateAddress(loan.collateral.coin),
      coin: loan.collateral.coin,
      network: this.getNetwork(loan.collateral.coin),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };
  }

  async requestCollateralWithdraw(
    loanId: string,
    amount: string,
    address: string
  ): Promise<void> {
    this.ensureConnected();
    const loan = await this.getLoan(loanId);

    // Validate withdrawal doesn't exceed safe LTV
    const collateralPrice = await this.getPrice(loan.collateral.coin);
    const newCollateralAmount =
      parseFloat(loan.collateral.amount) - parseFloat(amount);
    const newCollateralValue = newCollateralAmount * parseFloat(collateralPrice);
    const loanValue = parseFloat(loan.loan.usdValue);
    const newLTV = loanValue / newCollateralValue;

    if (newLTV > 0.7) {
      throw new Error('Withdrawal would exceed safe LTV threshold');
    }

    // Update loan collateral
    loan.collateral.amount = newCollateralAmount.toFixed(8);
    loan.collateral.usdValue = newCollateralValue.toFixed(2);
    loan.ltv = newLTV;
    this.loans.set(loanId, loan);

    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'collateral_withdrawn',
      category: 'collateral',
      loanId: loan.id,
      data: { amount, address, newLTV },
      metadata: {},
    });
  }

  async getPrice(coin: string): Promise<string> {
    this.ensureConnected();
    const price = this.prices.get(coin);
    if (!price) {
      throw new Error(`Price not found for ${coin}`);
    }
    return price;
  }

  async getPrices(coins: string[]): Promise<Record<string, string>> {
    this.ensureConnected();
    const result: Record<string, string> = {};
    for (const coin of coins) {
      const price = this.prices.get(coin);
      if (price) {
        result[coin] = price;
      }
    }
    return result;
  }

  async getLiquidationPrice(loanId: string): Promise<string> {
    this.ensureConnected();
    const loan = await this.getLoan(loanId);
    return loan.liquidationPrice;
  }

  // ============================================================================
  // Loan Simulation Methods (for testing and development)
  // ============================================================================

  async simulateRepayment(loanId: string, amount: string): Promise<void> {
    const loan = this.loans.get(loanId);
    if (!loan) {
      throw new Error(`Loan not found: ${loanId}`);
    }

    const repaymentAmount = parseFloat(amount);
    const interestAccrued = parseFloat(loan.interestAccrued);
    const principalRemaining = parseFloat(loan.loan.amount);

    // Pay interest first, then principal
    let interestPaid = Math.min(repaymentAmount, interestAccrued);
    let principalPaid = repaymentAmount - interestPaid;

    loan.interestAccrued = (interestAccrued - interestPaid).toFixed(8);
    loan.loan.amount = Math.max(0, principalRemaining - principalPaid).toFixed(8);

    // Check if fully repaid
    if (parseFloat(loan.loan.amount) <= 0 && parseFloat(loan.interestAccrued) <= 0) {
      loan.status = 'closed';
      this.emitEvent({
        id: this.generateId('evt'),
        timestamp: new Date(),
        type: 'loan_closed',
        category: 'loan',
        loanId: loan.id,
        data: { reason: 'fully_repaid' },
        metadata: {},
      });
    } else {
      this.emitEvent({
        id: this.generateId('evt'),
        timestamp: new Date(),
        type: 'loan_repayment',
        category: 'loan',
        loanId: loan.id,
        data: { amount, interestPaid, principalPaid },
        metadata: {},
      });
    }

    this.loans.set(loanId, loan);
  }

  async simulatePriceChange(coin: string, newPrice: string): Promise<void> {
    this.prices.set(coin, newPrice);

    // Check all active loans for margin calls
    for (const loan of this.loans.values()) {
      if (loan.status !== 'active') continue;
      if (loan.collateral.coin !== coin) continue;

      const collateralValue =
        parseFloat(loan.collateral.amount) * parseFloat(newPrice);
      const loanValue = parseFloat(loan.loan.usdValue);
      const newLTV = loanValue / collateralValue;

      loan.collateral.usdValue = collateralValue.toFixed(2);
      loan.ltv = newLTV;

      // Check for margin call (80% LTV threshold)
      if (newLTV >= 0.8 && loan.status === 'active') {
        loan.status = 'margin_call';
        this.emitEvent({
          id: this.generateId('evt'),
          timestamp: new Date(),
          type: 'margin_call_triggered',
          category: 'risk',
          loanId: loan.id,
          data: { ltv: newLTV, price: newPrice },
          metadata: {},
        });
      }

      // Check for liquidation (85% LTV threshold)
      if (newLTV >= 0.85) {
        loan.status = 'liquidating';
        this.emitEvent({
          id: this.generateId('evt'),
          timestamp: new Date(),
          type: 'liquidation_triggered',
          category: 'risk',
          loanId: loan.id,
          data: { ltv: newLTV, price: newPrice },
          metadata: {},
        });
      }

      this.loans.set(loan.id, loan);
    }
  }

  async simulateInterestAccrual(): Promise<void> {
    for (const loan of this.loans.values()) {
      if (loan.status !== 'active') continue;

      // Calculate daily interest
      const principal = parseFloat(loan.loan.amount);
      const dailyRate = loan.interestRate / 365;
      const interest = principal * dailyRate;

      loan.interestAccrued = (
        parseFloat(loan.interestAccrued) + interest
      ).toFixed(8);
      this.loans.set(loan.id, loan);
    }
  }

  async simulateCollateralTopUp(loanId: string, amount: string): Promise<void> {
    const loan = this.loans.get(loanId);
    if (!loan) {
      throw new Error(`Loan not found: ${loanId}`);
    }

    const collateralPrice = await this.getPrice(loan.collateral.coin);
    const newCollateralAmount =
      parseFloat(loan.collateral.amount) + parseFloat(amount);
    const newCollateralValue = newCollateralAmount * parseFloat(collateralPrice);
    const loanValue = parseFloat(loan.loan.usdValue);
    const newLTV = loanValue / newCollateralValue;

    loan.collateral.amount = newCollateralAmount.toFixed(8);
    loan.collateral.usdValue = newCollateralValue.toFixed(2);
    loan.ltv = newLTV;

    // Resolve margin call if LTV is safe again
    if (loan.status === 'margin_call' && newLTV < 0.7) {
      loan.status = 'active';
      this.emitEvent({
        id: this.generateId('evt'),
        timestamp: new Date(),
        type: 'margin_call_resolved',
        category: 'risk',
        loanId: loan.id,
        data: { newLTV, amount },
        metadata: {},
      });
    }

    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'collateral_topped_up',
      category: 'collateral',
      loanId: loan.id,
      data: { amount, newLTV },
      metadata: {},
    });

    this.loans.set(loanId, loan);
  }

  // ============================================================================
  // Event Handling
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
  // Helper Methods
  // ============================================================================

  private ensureConnected(): void {
    if (!this._connected) {
      throw new Error('CoinRabbit adapter not connected');
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateAddress(coin: string): string {
    // Generate a mock address based on coin type
    const chars = '0123456789abcdef';
    let address = '';

    switch (coin) {
      case 'BTC':
        address = '1' + Array(33).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
        break;
      case 'ETH':
      case 'USDT':
      case 'USDC':
        address = '0x' + Array(40).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
        break;
      case 'TON':
        address = 'EQ' + Array(46).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
        break;
      default:
        address = '0x' + Array(40).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    return address;
  }

  private getNetwork(coin: string): string {
    const coinInfo = this.coins.find((c) => c.symbol === coin);
    return coinInfo?.network ?? 'ethereum';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCoinRabbitAdapter(
  config?: Partial<CoinRabbitConfig>
): DefaultCoinRabbitAdapter {
  return new DefaultCoinRabbitAdapter(config);
}

export default DefaultCoinRabbitAdapter;
