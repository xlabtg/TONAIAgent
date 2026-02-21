/**
 * TONAIAgent - Sandbox Environment
 *
 * Provides simulation and testing environments for strategies
 * with backtesting, paper trading, and safe experimentation.
 */

import {
  SandboxConfig,
  SandboxState,
  SandboxBalance,
  SandboxPosition,
  SandboxTransaction,
  SandboxPerformance,
  OperationType,
  ExecutionResult,
  ExecutionStatus,
  SDKEvent,
  SDKEventCallback,
} from './types';

// ============================================================================
// Market Data Types
// ============================================================================

export interface MarketDataPoint {
  timestamp: Date;
  asset: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

export interface MarketDataProvider {
  getPrice(asset: string, timestamp?: Date): Promise<number>;
  getOHLCV(
    asset: string,
    interval: string,
    start: Date,
    end: Date
  ): Promise<MarketDataPoint[]>;
  subscribe(asset: string, callback: (data: MarketDataPoint) => void): () => void;
}

// ============================================================================
// Sandbox Configuration
// ============================================================================

const DEFAULT_SANDBOX_CONFIG: Required<SandboxConfig> = {
  name: 'Default Sandbox',
  initialBalance: 10000,
  speedMultiplier: 1,
  marketDataSource: 'synthetic',
  startTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  endTimestamp: new Date(),
  enableTransactions: true,
  enableSlippage: true,
  slippagePercent: 0.1,
  enableGas: true,
  timeoutMs: 60000,
};

// ============================================================================
// Sandbox Environment
// ============================================================================

export class SandboxEnvironment {
  readonly id: string;
  readonly name: string;
  private readonly config: Required<SandboxConfig>;
  private status: SandboxState['status'] = 'running';
  private readonly createdAt: Date;
  private currentTimestamp: Date;

  // State
  private balance: SandboxBalance;
  private positions: Map<string, SandboxPosition> = new Map();
  private transactions: SandboxTransaction[] = [];
  private prices: Map<string, number> = new Map();

  // Market data
  private marketDataProvider: MarketDataProvider;
  private subscriptions: Set<() => void> = new Set();

  // Events
  private eventCallbacks: Set<SDKEventCallback> = new Set();

  // Simulation
  private simulationInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: SandboxConfig = {}) {
    this.id = `sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    this.name = this.config.name;
    this.createdAt = new Date();
    this.currentTimestamp = this.config.startTimestamp;

    // Initialize balance
    this.balance = {
      ton: this.config.initialBalance,
      jettons: {},
      totalValueTon: this.config.initialBalance,
    };

    // Initialize market data provider
    this.marketDataProvider = this.createMarketDataProvider();

    // Set initial prices
    this.initializePrices();
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Start the sandbox simulation
   */
  start(): void {
    if (this.status !== 'running') {
      this.status = 'running';
    }

    this.emitEvent('sandbox:created', { sandboxId: this.id });

    // Start price updates if live or synthetic
    if (this.config.marketDataSource !== 'historical') {
      this.startPriceUpdates();
    }
  }

  /**
   * Pause the sandbox
   */
  pause(): void {
    if (this.status === 'running') {
      this.status = 'paused';
      this.stopPriceUpdates();
    }
  }

  /**
   * Resume the sandbox
   */
  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      if (this.config.marketDataSource !== 'historical') {
        this.startPriceUpdates();
      }
    }
  }

  /**
   * Stop and destroy the sandbox
   */
  destroy(): void {
    this.status = 'completed';
    this.stopPriceUpdates();

    // Unsubscribe from all market data
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();

    this.emitEvent('sandbox:destroyed', { sandboxId: this.id });
  }

  // ==========================================================================
  // Trading Operations
  // ==========================================================================

  /**
   * Execute a trade operation
   */
  async executeTrade(params: {
    operation: OperationType;
    asset: string;
    amount: number;
    price?: number;
    side?: 'buy' | 'sell';
  }): Promise<ExecutionResult> {
    if (!this.config.enableTransactions) {
      return this.createErrorResult('Transactions disabled in this sandbox');
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startedAt = new Date();

    try {
      const currentPrice = params.price || (await this.getPrice(params.asset));
      const effectivePrice = this.applySlippage(currentPrice, params.side || 'buy');
      const fee = this.calculateFee(params.amount, effectivePrice);

      // Execute based on operation type
      let result: unknown;
      switch (params.operation) {
        case 'trade':
          result = await this.executeBuySell(
            params.asset,
            params.amount,
            effectivePrice,
            params.side || 'buy',
            fee
          );
          break;
        case 'swap':
          result = await this.executeSwap(params.asset, params.amount, effectivePrice, fee);
          break;
        case 'stake':
          result = await this.executeStake(params.asset, params.amount);
          break;
        case 'unstake':
          result = await this.executeUnstake(params.asset, params.amount);
          break;
        case 'transfer':
          result = await this.executeTransfer(params.asset, params.amount, fee);
          break;
        default:
          result = { message: 'Operation completed' };
      }

      // Record transaction
      this.recordTransaction({
        id: executionId,
        type: params.operation,
        asset: params.asset,
        amount: params.amount,
        price: effectivePrice,
        fee,
        timestamp: this.currentTimestamp,
        status: 'success',
      });

      // Update portfolio value
      this.updatePortfolioValue();

      return {
        id: executionId,
        requestId: executionId,
        agentId: 'sandbox',
        status: 'completed' as ExecutionStatus,
        operation: params.operation,
        startedAt,
        completedAt: new Date(),
        result,
        txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        gasUsed: this.config.enableGas ? Math.floor(Math.random() * 100000) + 21000 : 0,
        metrics: {
          queueTimeMs: 0,
          executionTimeMs: Date.now() - startedAt.getTime(),
          totalTimeMs: Date.now() - startedAt.getTime(),
        },
      };
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Execution failed',
        executionId,
        startedAt
      );
    }
  }

  private async executeBuySell(
    asset: string,
    amount: number,
    price: number,
    side: 'buy' | 'sell',
    fee: number
  ): Promise<{ side: string; asset: string; amount: number; price: number; total: number }> {
    const total = amount * price + fee;

    if (side === 'buy') {
      // Check if enough TON
      if (this.balance.ton < total) {
        throw new Error('Insufficient TON balance');
      }

      // Deduct TON
      this.balance.ton -= total;

      // Add position or update existing
      const existing = this.positions.get(asset);
      if (existing) {
        // Average in
        const totalAmount = existing.amount + amount;
        const avgPrice =
          (existing.entryPrice * existing.amount + price * amount) / totalAmount;
        existing.amount = totalAmount;
        existing.entryPrice = avgPrice;
        existing.currentPrice = price;
      } else {
        this.positions.set(asset, {
          asset,
          amount,
          entryPrice: price,
          currentPrice: price,
          unrealizedPnl: 0,
          openedAt: this.currentTimestamp,
        });
      }

      // Update jetton balance
      this.balance.jettons[asset] = (this.balance.jettons[asset] || 0) + amount;
    } else {
      // Check if have the asset
      const position = this.positions.get(asset);
      if (!position || position.amount < amount) {
        throw new Error('Insufficient asset balance');
      }

      // Reduce position
      position.amount -= amount;
      if (position.amount === 0) {
        this.positions.delete(asset);
      }

      // Add TON (minus fee)
      this.balance.ton += amount * price - fee;

      // Update jetton balance
      this.balance.jettons[asset] = (this.balance.jettons[asset] || 0) - amount;
    }

    return { side, asset, amount, price, total };
  }

  private async executeSwap(
    asset: string,
    amount: number,
    price: number,
    fee: number
  ): Promise<{ asset: string; amount: number; received: number }> {
    // Simplified swap: TON to asset
    const received = (amount - fee) / price;

    if (this.balance.ton < amount) {
      throw new Error('Insufficient TON balance');
    }

    this.balance.ton -= amount;
    this.balance.jettons[asset] = (this.balance.jettons[asset] || 0) + received;

    return { asset, amount, received };
  }

  private async executeStake(
    asset: string,
    amount: number
  ): Promise<{ asset: string; amount: number; apr: number }> {
    const balance = asset === 'TON' ? this.balance.ton : this.balance.jettons[asset] || 0;

    if (balance < amount) {
      throw new Error('Insufficient balance for staking');
    }

    // Deduct balance
    if (asset === 'TON') {
      this.balance.ton -= amount;
    } else {
      this.balance.jettons[asset] -= amount;
    }

    // Add staked position
    const stakedKey = `staked_${asset}`;
    this.balance.jettons[stakedKey] = (this.balance.jettons[stakedKey] || 0) + amount;

    return { asset, amount, apr: 5.5 }; // Mock APR
  }

  private async executeUnstake(
    asset: string,
    amount: number
  ): Promise<{ asset: string; amount: number; rewards: number }> {
    const stakedKey = `staked_${asset}`;
    const stakedAmount = this.balance.jettons[stakedKey] || 0;

    if (stakedAmount < amount) {
      throw new Error('Insufficient staked balance');
    }

    // Calculate mock rewards (based on time staked)
    const rewards = amount * 0.01; // 1% reward for demo

    // Return to main balance
    this.balance.jettons[stakedKey] -= amount;

    if (asset === 'TON') {
      this.balance.ton += amount + rewards;
    } else {
      this.balance.jettons[asset] = (this.balance.jettons[asset] || 0) + amount + rewards;
    }

    return { asset, amount, rewards };
  }

  private async executeTransfer(
    asset: string,
    amount: number,
    fee: number
  ): Promise<{ asset: string; amount: number; fee: number }> {
    const total = amount + fee;

    if (asset === 'TON') {
      if (this.balance.ton < total) {
        throw new Error('Insufficient TON balance');
      }
      this.balance.ton -= total;
    } else {
      if ((this.balance.jettons[asset] || 0) < amount) {
        throw new Error('Insufficient asset balance');
      }
      this.balance.jettons[asset] -= amount;
      this.balance.ton -= fee; // Gas fee in TON
    }

    return { asset, amount, fee };
  }

  // ==========================================================================
  // State
  // ==========================================================================

  /**
   * Get current sandbox state
   */
  getState(): SandboxState {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      createdAt: this.createdAt,
      currentTimestamp: this.currentTimestamp,
      balance: { ...this.balance },
      positions: Array.from(this.positions.values()),
      transactions: [...this.transactions],
      performance: this.calculatePerformance(),
    };
  }

  /**
   * Get current balance
   */
  getBalance(): SandboxBalance {
    return { ...this.balance };
  }

  /**
   * Get all positions
   */
  getPositions(): SandboxPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get transaction history
   */
  getTransactions(): SandboxTransaction[] {
    return [...this.transactions];
  }

  /**
   * Get current price for an asset
   */
  async getPrice(asset: string): Promise<number> {
    return this.prices.get(asset) || (await this.marketDataProvider.getPrice(asset));
  }

  /**
   * Set price for an asset (for testing)
   */
  setPrice(asset: string, price: number): void {
    this.prices.set(asset, price);
    this.updatePositionPrices(asset, price);
  }

  // ==========================================================================
  // Performance
  // ==========================================================================

  /**
   * Calculate performance metrics
   */
  calculatePerformance(): SandboxPerformance {
    const initialValue = this.config.initialBalance;
    const currentValue = this.balance.totalValueTon;
    const totalPnl = currentValue - initialValue;
    const totalPnlPercent = (totalPnl / initialValue) * 100;

    // Calculate trade stats
    const trades = this.transactions.filter(
      (t) => t.type === 'trade' || t.type === 'swap'
    );
    const winningTrades = trades.filter((t) => this.isWinningTrade(t));

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown();

    // Calculate Sharpe ratio (simplified)
    const returns = this.calculateReturns();
    const sharpeRatio = this.calculateSharpeRatio(returns);

    return {
      totalPnl,
      totalPnlPercent,
      winRate: trades.length > 0 ? winningTrades.length / trades.length : 0,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: trades.length - winningTrades.length,
      maxDrawdown,
      sharpeRatio,
      avgTradeReturn:
        trades.length > 0 ? totalPnl / trades.length : 0,
    };
  }

  /**
   * Run backtest with a strategy
   */
  async runBacktest(
    strategy: (state: SandboxState, prices: Map<string, number>) => Promise<{
      action: 'buy' | 'sell' | 'hold';
      asset?: string;
      amount?: number;
    }>,
    options?: {
      stepMs?: number;
      assets?: string[];
    }
  ): Promise<SandboxPerformance> {
    const stepMs = options?.stepMs || 24 * 60 * 60 * 1000; // 1 day default
    const assets = options?.assets || ['TON'];

    // Initialize prices for assets
    for (const asset of assets) {
      if (!this.prices.has(asset)) {
        this.prices.set(asset, 1);
      }
    }

    // Run simulation
    while (
      this.currentTimestamp < this.config.endTimestamp &&
      this.status === 'running'
    ) {
      // Update prices
      await this.updatePricesForTimestamp(this.currentTimestamp);

      // Get strategy decision
      const state = this.getState();
      const decision = await strategy(state, this.prices);

      // Execute decision
      if (decision.action !== 'hold' && decision.asset && decision.amount) {
        await this.executeTrade({
          operation: 'trade',
          asset: decision.asset,
          amount: decision.amount,
          side: decision.action,
        });
      }

      // Advance time
      this.currentTimestamp = new Date(this.currentTimestamp.getTime() + stepMs);
    }

    return this.calculatePerformance();
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  /**
   * Subscribe to sandbox events
   */
  onEvent(callback: SDKEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private createMarketDataProvider(): MarketDataProvider {
    // Simple synthetic data provider
    return {
      getPrice: async (asset: string) => {
        return this.prices.get(asset) || this.generateSyntheticPrice(asset);
      },
      getOHLCV: async (asset, interval, start, end) => {
        const data: MarketDataPoint[] = [];
        let current = start.getTime();
        const stepMs = this.parseInterval(interval);

        while (current < end.getTime()) {
          const price = this.generateSyntheticPrice(asset, new Date(current));
          data.push({
            timestamp: new Date(current),
            asset,
            price,
            volume: Math.random() * 1000000,
            high: price * 1.01,
            low: price * 0.99,
            open: price * (0.99 + Math.random() * 0.02),
            close: price,
          });
          current += stepMs;
        }

        return data;
      },
      subscribe: (asset, callback) => {
        const interval = setInterval(() => {
          const price = this.generateSyntheticPrice(asset);
          this.prices.set(asset, price);
          callback({
            timestamp: new Date(),
            asset,
            price,
            volume: Math.random() * 100000,
            high: price * 1.001,
            low: price * 0.999,
            open: price,
            close: price,
          });
        }, 1000 * this.config.speedMultiplier);

        const unsubscribe = () => clearInterval(interval);
        this.subscriptions.add(unsubscribe);
        return unsubscribe;
      },
    };
  }

  private initializePrices(): void {
    // Set initial prices for common assets
    this.prices.set('TON', 1); // TON is base currency, always 1
    this.prices.set('USDT', 0.5); // Example: 1 USDT = 0.5 TON
    this.prices.set('BTC', 50000);
    this.prices.set('ETH', 3000);
  }

  private generateSyntheticPrice(asset: string, timestamp?: Date): number {
    const basePrices: Record<string, number> = {
      TON: 1,
      USDT: 0.5,
      BTC: 50000,
      ETH: 3000,
    };

    const base = basePrices[asset] || 1;

    // Add some randomness
    const volatility = 0.02; // 2% volatility
    const change = (Math.random() - 0.5) * 2 * volatility;

    // Add time-based trend if timestamp provided
    const trendFactor = timestamp
      ? Math.sin(timestamp.getTime() / (24 * 60 * 60 * 1000)) * 0.05
      : 0;

    return base * (1 + change + trendFactor);
  }

  private parseInterval(interval: string): number {
    const value = parseInt(interval);
    const unit = interval.replace(/\d/g, '');

    switch (unit) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000; // Default 1 hour
    }
  }

  private startPriceUpdates(): void {
    if (this.simulationInterval) return;

    this.simulationInterval = setInterval(() => {
      this.prices.forEach((_, asset) => {
        const newPrice = this.generateSyntheticPrice(asset);
        this.prices.set(asset, newPrice);
        this.updatePositionPrices(asset, newPrice);
      });
      this.updatePortfolioValue();
    }, 1000 / this.config.speedMultiplier);
  }

  private stopPriceUpdates(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  private async updatePricesForTimestamp(timestamp: Date): Promise<void> {
    this.prices.forEach((_, asset) => {
      const newPrice = this.generateSyntheticPrice(asset, timestamp);
      this.prices.set(asset, newPrice);
      this.updatePositionPrices(asset, newPrice);
    });
    this.updatePortfolioValue();
  }

  private updatePositionPrices(asset: string, price: number): void {
    const position = this.positions.get(asset);
    if (position) {
      position.currentPrice = price;
      position.unrealizedPnl = (price - position.entryPrice) * position.amount;
    }
  }

  private updatePortfolioValue(): void {
    let totalValue = this.balance.ton;

    this.positions.forEach((position) => {
      totalValue += position.amount * position.currentPrice;
    });

    this.balance.totalValueTon = totalValue;
  }

  private applySlippage(price: number, side: 'buy' | 'sell'): number {
    if (!this.config.enableSlippage) {
      return price;
    }

    const slippage = this.config.slippagePercent / 100;
    return side === 'buy' ? price * (1 + slippage) : price * (1 - slippage);
  }

  private calculateFee(amount: number, price: number): number {
    if (!this.config.enableGas) {
      return 0;
    }
    // Simple fee: 0.1% of transaction value
    return amount * price * 0.001;
  }

  private recordTransaction(tx: SandboxTransaction): void {
    this.transactions.push(tx);
  }

  private isWinningTrade(tx: SandboxTransaction): boolean {
    // Simplified: check if realized profit
    return tx.status === 'success' && tx.price > 0;
  }

  private calculateMaxDrawdown(): number {
    if (this.transactions.length === 0) return 0;

    let peak = this.config.initialBalance;
    let maxDrawdown = 0;

    // Simple approximation based on transactions
    let runningValue = this.config.initialBalance;
    for (const tx of this.transactions) {
      if (tx.type === 'trade') {
        runningValue += tx.amount * tx.price * (Math.random() - 0.5); // Simplified
      }

      if (runningValue > peak) {
        peak = runningValue;
      }

      const drawdown = (peak - runningValue) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateReturns(): number[] {
    // Simplified daily returns calculation
    const returns: number[] = [];
    let previousValue = this.config.initialBalance;

    for (let i = 0; i < 30; i++) {
      const currentValue = previousValue * (1 + (Math.random() - 0.5) * 0.02);
      returns.push((currentValue - previousValue) / previousValue);
      previousValue = currentValue;
    }

    return returns;
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);

    const riskFreeRate = 0.02 / 365; // 2% annual, daily
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
  }

  private createErrorResult(
    message: string,
    executionId?: string,
    startedAt?: Date
  ): ExecutionResult {
    const id = executionId || `exec_${Date.now()}`;
    const started = startedAt || new Date();

    return {
      id,
      requestId: id,
      agentId: 'sandbox',
      status: 'failed',
      operation: 'custom',
      startedAt: started,
      completedAt: new Date(),
      error: {
        code: 'EXECUTION_FAILED',
        message,
        retryable: false,
      },
      metrics: {
        queueTimeMs: 0,
        executionTimeMs: Date.now() - started.getTime(),
        totalTimeMs: Date.now() - started.getTime(),
      },
    };
  }

  private emitEvent(
    type: SDKEvent['type'],
    data: Record<string, unknown>,
    severity: SDKEvent['severity'] = 'info'
  ): void {
    const event: SDKEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type,
      source: 'sandbox',
      data,
      severity,
    };

    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new sandbox environment
 */
export function createSandbox(config?: SandboxConfig): SandboxEnvironment {
  const sandbox = new SandboxEnvironment(config);
  sandbox.start();
  return sandbox;
}

// ============================================================================
// Default Export
// ============================================================================

export default SandboxEnvironment;
