/**
 * TONAIAgent - Strategy Simulation Environment
 *
 * Sandbox environment with simulated capital allocation, simulated order
 * execution, and deterministic simulation results.
 *
 * Handles: order placement, position management, P&L tracking, risk controls.
 */

import {
  AssetSymbol,
  BacktestId,
  EquityCurvePoint,
  FeeModel,
  FillModel,
  PlaceOrderRequest,
  PortfolioState,
  SimulatedOrder,
  SimulatedPosition,
  SimulationConfig,
  SlippageModel,
} from './types';

// ============================================================================
// Simulation Environment
// ============================================================================

/**
 * Stateful simulation environment that tracks portfolio, orders, and P&L.
 * Processes order placement with realistic slippage, fees, and fill logic.
 */
export class SimulationEnvironment {
  private readonly sessionId: string;
  private readonly config: Required<SimulationConfig>;
  private portfolio: PortfolioState;
  private readonly orders: SimulatedOrder[] = [];
  private readonly equityCurve: EquityCurvePoint[] = [];
  private orderCounter: number = 0;

  constructor(backtestId: BacktestId, config: Omit<SimulationConfig, 'sessionId'>) {
    this.sessionId = backtestId;
    this.config = {
      sessionId: backtestId,
      initialCapital: config.initialCapital,
      currency: config.currency ?? 'USD',
      slippageModel: config.slippageModel,
      feeModel: config.feeModel,
      fillModel: config.fillModel,
      maxPositionSizePercent: config.maxPositionSizePercent ?? 100,
      maxDrawdownPercent: config.maxDrawdownPercent ?? 100,
      seed: config.seed ?? 0,
    };

    this.portfolio = this.initializePortfolio();
  }

  // ============================================================================
  // Portfolio Access
  // ============================================================================

  /**
   * Get current read-only portfolio state
   */
  getPortfolio(): Readonly<PortfolioState> {
    return this.portfolio;
  }

  /**
   * Get all executed orders
   */
  getOrders(): SimulatedOrder[] {
    return [...this.orders];
  }

  /**
   * Get equity curve data
   */
  getEquityCurve(): EquityCurvePoint[] {
    return [...this.equityCurve];
  }

  // ============================================================================
  // Order Execution
  // ============================================================================

  /**
   * Place a simulated order against the current market price.
   * Applies slippage, fees, and fill model rules.
   */
  async placeOrder(
    request: PlaceOrderRequest,
    currentPrices: Map<AssetSymbol, number>
  ): Promise<SimulatedOrder> {
    const { asset, side, type: orderType } = request;

    // Resolve current market price
    const marketPrice = currentPrices.get(asset);
    if (marketPrice === undefined || marketPrice <= 0) {
      return this.createRejectedOrder(request, `No price available for asset: ${asset}`);
    }

    // Resolve order amount
    const resolvedAmount = this.resolveAmount(request, marketPrice, side);
    if (resolvedAmount <= 0) {
      return this.createRejectedOrder(request, 'Order amount must be positive');
    }

    // Check position size limit
    if (side === 'buy') {
      const newPositionValue = resolvedAmount * marketPrice;
      const maxPositionValue = this.portfolio.totalValue * (this.config.maxPositionSizePercent / 100);
      const existingPosition = this.portfolio.positions.get(asset);
      const currentPositionValue = existingPosition
        ? existingPosition.amount * marketPrice
        : 0;
      if (currentPositionValue + newPositionValue > maxPositionValue) {
        return this.createRejectedOrder(
          request,
          `Order exceeds max position size limit (${this.config.maxPositionSizePercent}%)`
        );
      }
    }

    // Calculate execution price with slippage
    const executedPrice = this.applySlippage(
      marketPrice,
      resolvedAmount,
      side,
      this.config.slippageModel
    );

    // Calculate required capital
    const requiredCapital = resolvedAmount * executedPrice;

    // Check sufficient cash for buy orders
    if (side === 'buy' && requiredCapital > this.portfolio.cash) {
      return this.createRejectedOrder(
        request,
        `Insufficient cash: required ${requiredCapital.toFixed(2)}, available ${this.portfolio.cash.toFixed(2)}`
      );
    }

    // Apply fill model
    const fillAmount = this.applyFillModel(resolvedAmount, this.config.fillModel);
    const filledCapital = fillAmount * executedPrice;

    // Calculate fees
    const fees = this.calculateFees(filledCapital, this.config.feeModel);

    // Execute the trade
    const order: SimulatedOrder = {
      id: this.generateOrderId(),
      sessionId: this.sessionId,
      timestamp: new Date(),
      asset,
      side,
      type: orderType,
      requestedAmount: resolvedAmount,
      filledAmount: fillAmount,
      requestedPrice: request.limitPrice ?? marketPrice,
      executedPrice,
      fees,
      slippage: Math.abs(executedPrice - marketPrice) / marketPrice,
      status: fillAmount >= resolvedAmount ? 'filled' : 'partially_filled',
      metadata: request.metadata,
    };

    // Update portfolio
    this.applyOrderToPortfolio(order, currentPrices);

    // Record order
    this.orders.push(order);

    return order;
  }

  /**
   * Update portfolio valuations with current prices (call at each time step)
   */
  updatePrices(timestamp: Date, currentPrices: Map<AssetSymbol, number>): void {
    let totalUnrealized = 0;

    for (const [asset, position] of this.portfolio.positions) {
      const price = currentPrices.get(asset) ?? position.currentPrice;
      position.currentPrice = price;
      position.unrealizedPnl = (price - position.entryPrice) * position.amount;
      position.unrealizedPnlPercent =
        ((price - position.entryPrice) / position.entryPrice) * 100;
      position.positionValue = position.amount * price;
      totalUnrealized += position.unrealizedPnl;
    }

    this.portfolio.unrealizedPnl = totalUnrealized;
    this.portfolio.totalValue = this.portfolio.cash + this.calculatePositionsValue(currentPrices);
    this.portfolio.totalPnl = this.portfolio.realizedPnl + this.portfolio.unrealizedPnl;
    this.portfolio.timestamp = timestamp;

    // Track peak equity for drawdown calculation
    if (this.portfolio.totalValue > this.portfolio.peakEquity) {
      this.portfolio.peakEquity = this.portfolio.totalValue;
      this.portfolio.maxEquity = this.portfolio.totalValue;
    }

    const drawdown = this.portfolio.peakEquity > 0
      ? ((this.portfolio.peakEquity - this.portfolio.totalValue) / this.portfolio.peakEquity) * 100
      : 0;
    this.portfolio.drawdown = drawdown;

    // Record equity curve point
    this.equityCurve.push({
      timestamp,
      equity: this.portfolio.totalValue,
      drawdown,
      positions: Object.fromEntries(
        Array.from(this.portfolio.positions.entries()).map(([k, v]) => [k, v.amount])
      ),
      cash: this.portfolio.cash,
    });
  }

  /**
   * Close all open positions at current prices (called at backtest end)
   */
  closeAllPositions(currentPrices: Map<AssetSymbol, number>): void {
    for (const [asset, position] of this.portfolio.positions) {
      const price = currentPrices.get(asset) ?? position.currentPrice;
      const value = position.amount * price;
      const pnl = (price - position.entryPrice) * position.amount;

      this.portfolio.cash += value;
      this.portfolio.realizedPnl += pnl;
      this.portfolio.positions.delete(asset);
    }

    this.portfolio.unrealizedPnl = 0;
    this.portfolio.totalValue = this.portfolio.cash;
    this.portfolio.totalPnl = this.portfolio.realizedPnl;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializePortfolio(): PortfolioState {
    return {
      sessionId: this.sessionId,
      timestamp: new Date(),
      cash: this.config.initialCapital,
      positions: new Map<AssetSymbol, SimulatedPosition>(),
      totalValue: this.config.initialCapital,
      unrealizedPnl: 0,
      realizedPnl: 0,
      totalPnl: 0,
      drawdown: 0,
      maxEquity: this.config.initialCapital,
      peakEquity: this.config.initialCapital,
    };
  }

  private resolveAmount(
    request: PlaceOrderRequest,
    marketPrice: number,
    side: 'buy' | 'sell'
  ): number {
    const { amount, amountType = 'units' } = request;

    if (amountType === 'units') {
      return amount;
    }

    if (amountType === 'usd') {
      return amount / marketPrice;
    }

    if (amountType === 'percent') {
      if (side === 'buy') {
        // Percentage of available cash
        return (this.portfolio.cash * (amount / 100)) / marketPrice;
      } else {
        // Percentage of held position
        const position = this.portfolio.positions.get(request.asset);
        return position ? position.amount * (amount / 100) : 0;
      }
    }

    return amount;
  }

  private applySlippage(
    price: number,
    amount: number,
    side: 'buy' | 'sell',
    model: SlippageModel
  ): number {
    let slippagePct: number;

    switch (model.type) {
      case 'fixed':
        slippagePct = model.baseSlippage / 10000; // basis points to decimal
        break;

      case 'volume_based': {
        const volumeImpact = (model.volumeImpactFactor ?? 0.001) * Math.log10(amount + 1);
        slippagePct = model.baseSlippage / 10000 + volumeImpact;
        break;
      }

      case 'market_impact': {
        const exponent = model.marketImpactExponent ?? 0.5;
        const impact = Math.pow(amount, exponent) * (model.volumeImpactFactor ?? 0.001);
        slippagePct = model.baseSlippage / 10000 + impact;
        break;
      }

      default:
        slippagePct = model.baseSlippage / 10000;
    }

    // Slippage is adverse: buy price increases, sell price decreases
    const direction = side === 'buy' ? 1 : -1;
    return price * (1 + direction * slippagePct);
  }

  private applyFillModel(requestedAmount: number, model: FillModel): number {
    if (model.type === 'immediate') {
      return requestedAmount;
    }

    if (model.type === 'limit') {
      // For limit orders, apply max fill percent
      const maxFill = model.maxFillPercent ?? 100;
      return requestedAmount * (maxFill / 100);
    }

    if (model.type === 'realistic') {
      // Probabilistic partial fill based on order size
      const partialProb = model.partialFillProbability ?? 0.1;
      if (Math.random() < partialProb) {
        const maxFill = model.maxFillPercent ?? 90;
        const fillPct = 50 + Math.random() * (maxFill - 50);
        return requestedAmount * (fillPct / 100);
      }
      return requestedAmount;
    }

    return requestedAmount;
  }

  private calculateFees(tradeValue: number, model: FeeModel): number {
    const tradingFee = tradeValue * (model.tradingFeePercent / 100);
    const gasCost = model.gasCostUsd;
    const protocolFee = model.protocolFeePercent
      ? tradeValue * (model.protocolFeePercent / 100)
      : 0;
    return tradingFee + gasCost + protocolFee;
  }

  private applyOrderToPortfolio(
    order: SimulatedOrder,
    currentPrices: Map<AssetSymbol, number>
  ): void {
    const { asset, side, filledAmount, executedPrice, fees } = order;
    const tradeCost = filledAmount * executedPrice;

    if (side === 'buy') {
      // Deduct cash
      this.portfolio.cash -= tradeCost + fees;

      // Add/update position
      const existing = this.portfolio.positions.get(asset);
      if (existing) {
        const totalAmount = existing.amount + filledAmount;
        const avgEntryPrice =
          (existing.entryPrice * existing.amount + executedPrice * filledAmount) / totalAmount;
        existing.amount = totalAmount;
        existing.entryPrice = avgEntryPrice;
        existing.currentPrice = executedPrice;
        existing.costBasis += tradeCost + fees;
      } else {
        this.portfolio.positions.set(asset, {
          asset,
          amount: filledAmount,
          entryPrice: executedPrice,
          currentPrice: executedPrice,
          entryTime: order.timestamp,
          unrealizedPnl: 0,
          unrealizedPnlPercent: 0,
          positionValue: tradeCost,
          costBasis: tradeCost + fees,
        });
      }
    } else if (side === 'sell') {
      const position = this.portfolio.positions.get(asset);
      if (!position) return;

      const actualSellAmount = Math.min(filledAmount, position.amount);
      const proceeds = actualSellAmount * executedPrice;
      const costOfSold = position.entryPrice * actualSellAmount;
      const realizedPnl = proceeds - costOfSold - fees;

      this.portfolio.cash += proceeds - fees;
      this.portfolio.realizedPnl += realizedPnl;

      position.amount -= actualSellAmount;
      position.costBasis -= costOfSold;

      if (position.amount <= 0.000001) {
        this.portfolio.positions.delete(asset);
      }
    }

    // Recalculate total value
    this.portfolio.totalValue =
      this.portfolio.cash + this.calculatePositionsValue(currentPrices);
  }

  private calculatePositionsValue(currentPrices: Map<AssetSymbol, number>): number {
    let total = 0;
    for (const [asset, position] of this.portfolio.positions) {
      const price = currentPrices.get(asset) ?? position.currentPrice;
      total += position.amount * price;
    }
    return total;
  }

  private createRejectedOrder(
    request: PlaceOrderRequest,
    reason: string
  ): SimulatedOrder {
    return {
      id: this.generateOrderId(),
      sessionId: this.sessionId,
      timestamp: new Date(),
      asset: request.asset,
      side: request.side,
      type: request.type,
      requestedAmount: request.amount,
      filledAmount: 0,
      requestedPrice: request.limitPrice,
      executedPrice: 0,
      fees: 0,
      slippage: 0,
      status: 'rejected',
      metadata: { ...request.metadata, rejectionReason: reason },
    };
  }

  private generateOrderId(): string {
    this.orderCounter++;
    return `order_${this.sessionId}_${this.orderCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSimulationEnvironment(
  backtestId: BacktestId,
  config: Omit<SimulationConfig, 'sessionId'>
): SimulationEnvironment {
  return new SimulationEnvironment(backtestId, config);
}

// ============================================================================
// Default Configs
// ============================================================================

export const DEFAULT_SLIPPAGE_MODEL: SlippageModel = {
  type: 'volume_based',
  baseSlippage: 10,            // 10 basis points = 0.1%
  volumeImpactFactor: 0.001,
};

export const DEFAULT_FEE_MODEL: FeeModel = {
  tradingFeePercent: 0.3,     // 0.3% trading fee
  gasCostUsd: 0.05,           // $0.05 gas per trade
  protocolFeePercent: 0.05,   // 0.05% protocol fee
};

export const DEFAULT_FILL_MODEL: FillModel = {
  type: 'immediate',
};
