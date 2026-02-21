/**
 * TONAIAgent - Collateral Management
 *
 * Real-time collateral monitoring and automation including margin alerts,
 * collateral top-ups, hedging strategies, and liquidation prevention.
 */

import {
  CollateralManagementConfig,
  HedgingStrategy,
  CollateralPosition,
  ManagedCollateralAsset,
  CollateralMonitoringAlert,
  CollateralAlertType,
  CollateralMetrics,
  CollateralHedging,
  HedgePosition,
  AutoTopUpConfig,
  AutoRebalanceConfig,
  CollateralAllocationTarget,
  AutoWithdrawConfig,
  AICreditEvent,
  AICreditEventCallback,
} from './types';

// ============================================================================
// Collateral Manager Interface
// ============================================================================

export interface CollateralManager {
  readonly config: CollateralManagementConfig;

  // Position Management
  createPosition(loanId: string, userId: string, assets: CollateralAssetInput[]): Promise<CollateralPosition>;
  getPosition(positionId: string): Promise<CollateralPosition>;
  getPositionByLoan(loanId: string): Promise<CollateralPosition | undefined>;
  getUserPositions(userId: string): Promise<CollateralPosition[]>;

  // Asset Operations
  addAsset(positionId: string, asset: CollateralAssetInput): Promise<CollateralPosition>;
  removeAsset(positionId: string, symbol: string, amount: string): Promise<CollateralPosition>;
  rebalanceAssets(positionId: string, targets: CollateralAllocationTarget[]): Promise<CollateralPosition>;

  // Monitoring
  startMonitoring(positionId: string): Promise<void>;
  stopMonitoring(positionId: string): Promise<void>;
  checkPosition(positionId: string): Promise<CollateralMetrics>;
  getAlerts(positionId?: string): Promise<CollateralMonitoringAlert[]>;
  acknowledgeAlert(alertId: string): Promise<void>;

  // Automation
  configureAutoTopUp(positionId: string, config: Partial<AutoTopUpConfig>): Promise<void>;
  configureAutoRebalance(positionId: string, config: Partial<AutoRebalanceConfig>): Promise<void>;
  configureAutoWithdraw(positionId: string, config: Partial<AutoWithdrawConfig>): Promise<void>;
  executeAutoTopUp(positionId: string): Promise<void>;

  // Hedging
  enableHedging(positionId: string, strategy: HedgingStrategy): Promise<void>;
  disableHedging(positionId: string): Promise<void>;
  getHedgingStatus(positionId: string): Promise<CollateralHedging | undefined>;

  // Price Updates
  updatePrices(prices: Record<string, string>): Promise<void>;

  // Statistics
  getStats(): Promise<CollateralStats>;

  // Events
  onEvent(callback: AICreditEventCallback): void;
}

export interface CollateralAssetInput {
  symbol: string;
  name?: string;
  amount: string;
  priceUSD?: string;
}

export interface CollateralStats {
  totalPositions: number;
  totalValueUSD: string;
  positionsAtRisk: number;
  averageHealthFactor: number;
  totalHedgeValue: string;
  alertsActive: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultCollateralManager implements CollateralManager {
  readonly config: CollateralManagementConfig;

  private positions: Map<string, CollateralPosition> = new Map();
  private loanToPosition: Map<string, string> = new Map();
  private alerts: Map<string, CollateralMonitoringAlert> = new Map();
  private prices: Map<string, string> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private eventCallbacks: AICreditEventCallback[] = [];

  constructor(config?: Partial<CollateralManagementConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      autoMonitoring: config?.autoMonitoring ?? true,
      monitoringInterval: config?.monitoringInterval ?? 60, // 60 seconds
      autoTopUpEnabled: config?.autoTopUpEnabled ?? true,
      autoTopUpThreshold: config?.autoTopUpThreshold ?? 0.75,
      autoTopUpAmount: config?.autoTopUpAmount ?? '1000',
      hedgingEnabled: config?.hedgingEnabled ?? false,
      hedgingStrategy: config?.hedgingStrategy ?? 'none',
      alertThresholds: config?.alertThresholds ?? {
        marginWarning: 0.7,
        marginCritical: 0.8,
        liquidationImminent: 0.85,
        volatilitySpike: 0.3,
      },
    };

    // Initialize default prices
    this.initializeDefaultPrices();
  }

  private initializeDefaultPrices(): void {
    this.prices.set('BTC', '65000');
    this.prices.set('ETH', '3500');
    this.prices.set('TON', '6.50');
    this.prices.set('USDT', '1');
    this.prices.set('USDC', '1');
    this.prices.set('BNB', '580');
    this.prices.set('SOL', '150');
    this.prices.set('MATIC', '0.90');
  }

  // ============================================================================
  // Position Management
  // ============================================================================

  async createPosition(
    loanId: string,
    userId: string,
    assets: CollateralAssetInput[]
  ): Promise<CollateralPosition> {
    const managedAssets = await this.createManagedAssets(assets);
    const totalValueUSD = this.calculateTotalValue(managedAssets);

    const position: CollateralPosition = {
      id: this.generateId('pos'),
      userId,
      loanId,
      status: 'healthy',
      assets: managedAssets,
      totalValue: this.calculateTotalAmount(managedAssets),
      totalValueUSD,
      healthFactor: 1.5, // Initial healthy state
      monitoring: {
        enabled: this.config.autoMonitoring,
        lastCheck: new Date(),
        nextCheck: new Date(Date.now() + this.config.monitoringInterval * 1000),
        checkInterval: this.config.monitoringInterval,
        alerts: [],
        metrics: this.calculateMetrics(managedAssets, 0.5), // Assume 50% LTV
      },
      automation: {
        autoTopUp: {
          enabled: this.config.autoTopUpEnabled,
          triggerThreshold: this.config.autoTopUpThreshold,
          topUpAsset: assets[0]?.symbol ?? 'USDT',
          topUpSource: 'wallet',
          maxTopUpAmount: this.config.autoTopUpAmount,
          minTopUpAmount: '100',
        },
        autoRebalance: {
          enabled: false,
          targetAllocation: [],
          rebalanceThreshold: 0.1,
          frequency: 'on_trigger',
        },
        autoWithdraw: {
          enabled: false,
          withdrawThreshold: 1.8,
          withdrawAsset: 'USDT',
          withdrawDestination: 'wallet',
        },
      },
      history: [
        {
          id: this.generateId('hist'),
          timestamp: new Date(),
          type: 'deposited',
          description: 'Initial collateral deposit',
          data: { assets: assets.map((a) => ({ symbol: a.symbol, amount: a.amount })) },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.positions.set(position.id, position);
    this.loanToPosition.set(loanId, position.id);

    // Start monitoring if enabled
    if (this.config.autoMonitoring) {
      await this.startMonitoring(position.id);
    }

    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'collateral_deposited',
      category: 'collateral',
      userId,
      loanId,
      data: { positionId: position.id, totalValueUSD },
      metadata: {},
    });

    return position;
  }

  private async createManagedAssets(assets: CollateralAssetInput[]): Promise<ManagedCollateralAsset[]> {
    const totalValue = assets.reduce((sum, asset) => {
      const price = parseFloat(asset.priceUSD ?? this.prices.get(asset.symbol) ?? '0');
      return sum + parseFloat(asset.amount) * price;
    }, 0);

    return assets.map((asset) => {
      const price = parseFloat(asset.priceUSD ?? this.prices.get(asset.symbol) ?? '0');
      const valueUSD = parseFloat(asset.amount) * price;
      const weight = totalValue > 0 ? valueUSD / totalValue : 1 / assets.length;

      return {
        id: this.generateId('asset'),
        symbol: asset.symbol,
        name: asset.name ?? asset.symbol,
        amount: asset.amount,
        valueUSD: valueUSD.toFixed(2),
        priceUSD: price.toFixed(2),
        weight,
        volatility24h: this.getAssetVolatility(asset.symbol),
        volatility7d: this.getAssetVolatility(asset.symbol) * 2,
        priceChange24h: (Math.random() - 0.5) * 0.1, // Simulated
        riskTier: this.getAssetRiskTier(asset.symbol),
      };
    });
  }

  async getPosition(positionId: string): Promise<CollateralPosition> {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }
    return { ...position };
  }

  async getPositionByLoan(loanId: string): Promise<CollateralPosition | undefined> {
    const positionId = this.loanToPosition.get(loanId);
    if (!positionId) return undefined;
    return this.getPosition(positionId);
  }

  async getUserPositions(userId: string): Promise<CollateralPosition[]> {
    return Array.from(this.positions.values())
      .filter((p) => p.userId === userId)
      .map((p) => ({ ...p }));
  }

  // ============================================================================
  // Asset Operations
  // ============================================================================

  async addAsset(positionId: string, asset: CollateralAssetInput): Promise<CollateralPosition> {
    const position = await this.getPosition(positionId);

    // Check if asset already exists
    const existingIndex = position.assets.findIndex((a) => a.symbol === asset.symbol);

    if (existingIndex >= 0) {
      // Add to existing asset
      const existing = position.assets[existingIndex];
      const newAmount = (parseFloat(existing.amount) + parseFloat(asset.amount)).toFixed(8);
      const price = parseFloat(this.prices.get(asset.symbol) ?? '0');
      const newValueUSD = (parseFloat(newAmount) * price).toFixed(2);

      position.assets[existingIndex] = {
        ...existing,
        amount: newAmount,
        valueUSD: newValueUSD,
      };
    } else {
      // Add new asset
      const newAssets = await this.createManagedAssets([asset]);
      position.assets.push(...newAssets);
    }

    // Recalculate weights and totals
    this.recalculatePosition(position);

    // Add history
    position.history.push({
      id: this.generateId('hist'),
      timestamp: new Date(),
      type: 'deposited',
      description: `Added ${asset.amount} ${asset.symbol}`,
      data: { symbol: asset.symbol, amount: asset.amount },
    });

    position.updatedAt = new Date();
    this.positions.set(positionId, position);

    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'collateral_topped_up',
      category: 'collateral',
      loanId: position.loanId,
      data: { asset: asset.symbol, amount: asset.amount },
      metadata: {},
    });

    return position;
  }

  async removeAsset(positionId: string, symbol: string, amount: string): Promise<CollateralPosition> {
    const position = await this.getPosition(positionId);

    const assetIndex = position.assets.findIndex((a) => a.symbol === symbol);
    if (assetIndex < 0) {
      throw new Error(`Asset not found in position: ${symbol}`);
    }

    const asset = position.assets[assetIndex];
    const currentAmount = parseFloat(asset.amount);
    const removeAmount = parseFloat(amount);

    if (removeAmount > currentAmount) {
      throw new Error(`Insufficient asset balance: ${currentAmount} < ${removeAmount}`);
    }

    if (removeAmount >= currentAmount) {
      // Remove entire asset
      position.assets.splice(assetIndex, 1);
    } else {
      // Reduce amount
      const newAmount = (currentAmount - removeAmount).toFixed(8);
      const price = parseFloat(asset.priceUSD);
      const newValueUSD = (parseFloat(newAmount) * price).toFixed(2);

      position.assets[assetIndex] = {
        ...asset,
        amount: newAmount,
        valueUSD: newValueUSD,
      };
    }

    // Recalculate weights and totals
    this.recalculatePosition(position);

    // Add history
    position.history.push({
      id: this.generateId('hist'),
      timestamp: new Date(),
      type: 'withdrawn',
      description: `Removed ${amount} ${symbol}`,
      data: { symbol, amount },
    });

    position.updatedAt = new Date();
    this.positions.set(positionId, position);

    return position;
  }

  async rebalanceAssets(
    positionId: string,
    targets: CollateralAllocationTarget[]
  ): Promise<CollateralPosition> {
    const position = await this.getPosition(positionId);

    // Calculate current total value
    const totalValue = parseFloat(position.totalValueUSD);

    // Calculate target allocations
    for (const target of targets) {
      const assetIndex = position.assets.findIndex((a) => a.symbol === target.asset);
      if (assetIndex < 0) continue;

      const asset = position.assets[assetIndex];
      const targetValue = totalValue * target.targetWeight;
      const price = parseFloat(asset.priceUSD);
      const targetAmount = targetValue / price;

      position.assets[assetIndex] = {
        ...asset,
        amount: targetAmount.toFixed(8),
        valueUSD: targetValue.toFixed(2),
        weight: target.targetWeight,
      };
    }

    // Add history
    position.history.push({
      id: this.generateId('hist'),
      timestamp: new Date(),
      type: 'rebalanced',
      description: 'Assets rebalanced to target allocation',
      data: { targets },
    });

    position.updatedAt = new Date();
    this.positions.set(positionId, position);

    return position;
  }

  private recalculatePosition(position: CollateralPosition): void {
    const totalValue = position.assets.reduce(
      (sum, a) => sum + parseFloat(a.valueUSD),
      0
    );

    // Update weights
    for (const asset of position.assets) {
      asset.weight = totalValue > 0 ? parseFloat(asset.valueUSD) / totalValue : 0;
    }

    position.totalValueUSD = totalValue.toFixed(2);
    position.totalValue = this.calculateTotalAmount(position.assets);
    position.monitoring.metrics = this.calculateMetrics(
      position.assets,
      position.monitoring.metrics.currentLTV
    );
  }

  // ============================================================================
  // Monitoring
  // ============================================================================

  async startMonitoring(positionId: string): Promise<void> {
    const position = await this.getPosition(positionId);

    if (this.monitoringIntervals.has(positionId)) {
      return; // Already monitoring
    }

    const interval = setInterval(
      () => this.runMonitoringCheck(positionId),
      this.config.monitoringInterval * 1000
    );

    this.monitoringIntervals.set(positionId, interval);

    position.monitoring.enabled = true;
    position.monitoring.lastCheck = new Date();
    position.monitoring.nextCheck = new Date(
      Date.now() + this.config.monitoringInterval * 1000
    );
    this.positions.set(positionId, position);
  }

  async stopMonitoring(positionId: string): Promise<void> {
    const interval = this.monitoringIntervals.get(positionId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(positionId);
    }

    const position = this.positions.get(positionId);
    if (position) {
      position.monitoring.enabled = false;
      this.positions.set(positionId, position);
    }
  }

  private async runMonitoringCheck(positionId: string): Promise<void> {
    try {
      const position = this.positions.get(positionId);
      if (!position) return;

      // Update prices and recalculate
      await this.refreshPositionPrices(position);

      // Check metrics
      const metrics = position.monitoring.metrics;
      const newAlerts: CollateralMonitoringAlert[] = [];

      // Check LTV thresholds
      if (metrics.currentLTV >= this.config.alertThresholds.liquidationImminent) {
        newAlerts.push(this.createMonitoringAlert(
          positionId,
          'liquidation_risk',
          'critical',
          `Liquidation imminent! LTV at ${(metrics.currentLTV * 100).toFixed(1)}%`
        ));
        position.status = 'liquidating';
      } else if (metrics.currentLTV >= this.config.alertThresholds.marginCritical) {
        newAlerts.push(this.createMonitoringAlert(
          positionId,
          'health_factor_low',
          'critical',
          `Critical margin level! LTV at ${(metrics.currentLTV * 100).toFixed(1)}%`
        ));
        position.status = 'critical';
      } else if (metrics.currentLTV >= this.config.alertThresholds.marginWarning) {
        newAlerts.push(this.createMonitoringAlert(
          positionId,
          'health_factor_low',
          'warning',
          `Warning: LTV approaching margin call at ${(metrics.currentLTV * 100).toFixed(1)}%`
        ));
        position.status = 'warning';
      } else {
        position.status = 'healthy';
      }

      // Check volatility
      const avgVolatility = position.assets.reduce((sum, a) => sum + a.volatility24h, 0) / position.assets.length;
      if (avgVolatility >= this.config.alertThresholds.volatilitySpike) {
        newAlerts.push(this.createMonitoringAlert(
          positionId,
          'volatility_spike',
          'warning',
          `High volatility detected: ${(avgVolatility * 100).toFixed(1)}% 24h`
        ));
      }

      // Check concentration risk
      const maxWeight = Math.max(...position.assets.map((a) => a.weight));
      if (maxWeight > 0.8) {
        newAlerts.push(this.createMonitoringAlert(
          positionId,
          'concentration_risk',
          'info',
          'High concentration in single asset - consider diversifying'
        ));
      }

      // Add new alerts
      for (const alert of newAlerts) {
        position.monitoring.alerts.push(alert);
        this.alerts.set(alert.id, alert);

        this.emitEvent({
          id: this.generateId('evt'),
          timestamp: new Date(),
          type: 'alert_triggered',
          category: 'collateral',
          loanId: position.loanId,
          data: { alert },
          metadata: {},
        });
      }

      // Execute auto top-up if needed
      if (
        position.automation.autoTopUp.enabled &&
        metrics.currentLTV >= position.automation.autoTopUp.triggerThreshold
      ) {
        await this.executeAutoTopUp(positionId);
      }

      // Update monitoring state
      position.monitoring.lastCheck = new Date();
      position.monitoring.nextCheck = new Date(
        Date.now() + this.config.monitoringInterval * 1000
      );

      this.positions.set(positionId, position);
    } catch {
      // Log error but don't stop monitoring
    }
  }

  private createMonitoringAlert(
    _positionId: string,
    type: CollateralAlertType,
    severity: 'info' | 'warning' | 'critical',
    message: string
  ): CollateralMonitoringAlert {
    return {
      id: this.generateId('alert'),
      type,
      severity,
      message,
      triggeredAt: new Date(),
    };
  }

  async checkPosition(positionId: string): Promise<CollateralMetrics> {
    const position = await this.getPosition(positionId);
    return position.monitoring.metrics;
  }

  async getAlerts(positionId?: string): Promise<CollateralMonitoringAlert[]> {
    if (positionId) {
      const position = await this.getPosition(positionId);
      return position.monitoring.alerts;
    }
    return Array.from(this.alerts.values());
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledgedAt = new Date();
      this.alerts.set(alertId, alert);
    }
  }

  // ============================================================================
  // Automation
  // ============================================================================

  async configureAutoTopUp(positionId: string, config: Partial<AutoTopUpConfig>): Promise<void> {
    const position = await this.getPosition(positionId);
    position.automation.autoTopUp = {
      ...position.automation.autoTopUp,
      ...config,
    };
    this.positions.set(positionId, position);
  }

  async configureAutoRebalance(positionId: string, config: Partial<AutoRebalanceConfig>): Promise<void> {
    const position = await this.getPosition(positionId);
    position.automation.autoRebalance = {
      ...position.automation.autoRebalance,
      ...config,
    };
    this.positions.set(positionId, position);
  }

  async configureAutoWithdraw(positionId: string, config: Partial<AutoWithdrawConfig>): Promise<void> {
    const position = await this.getPosition(positionId);
    position.automation.autoWithdraw = {
      ...position.automation.autoWithdraw,
      ...config,
    };
    this.positions.set(positionId, position);
  }

  async executeAutoTopUp(positionId: string): Promise<void> {
    const position = await this.getPosition(positionId);
    const config = position.automation.autoTopUp;

    if (!config.enabled) return;

    // Simulate top-up (in production, would interact with user's wallet)
    await this.addAsset(positionId, {
      symbol: config.topUpAsset,
      amount: config.minTopUpAmount,
    });

    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'collateral_topped_up',
      category: 'collateral',
      loanId: position.loanId,
      data: {
        asset: config.topUpAsset,
        amount: config.minTopUpAmount,
        automated: true,
      },
      metadata: {},
    });
  }

  // ============================================================================
  // Hedging
  // ============================================================================

  async enableHedging(positionId: string, strategy: HedgingStrategy): Promise<void> {
    const position = await this.getPosition(positionId);

    if (!position.hedging) {
      position.hedging = {
        enabled: true,
        strategy,
        positions: [],
        totalCost: '0',
        effectiveCoverage: 0,
      };
    } else {
      position.hedging.enabled = true;
      position.hedging.strategy = strategy;
    }

    // Simulate hedge positions based on strategy
    if (strategy !== 'none') {
      position.hedging.positions = this.createHedgePositions(position.assets, strategy);
      position.hedging.totalCost = this.calculateHedgeCost(position.hedging.positions);
      position.hedging.effectiveCoverage = 0.8; // Simulated coverage
    }

    position.history.push({
      id: this.generateId('hist'),
      timestamp: new Date(),
      type: 'hedged',
      description: `Enabled ${strategy} hedging strategy`,
      data: { strategy },
    });

    this.positions.set(positionId, position);

    this.emitEvent({
      id: this.generateId('evt'),
      timestamp: new Date(),
      type: 'collateral_deposited', // Using closest event type
      category: 'collateral',
      loanId: position.loanId,
      data: { hedgingEnabled: true, strategy },
      metadata: {},
    });
  }

  async disableHedging(positionId: string): Promise<void> {
    const position = await this.getPosition(positionId);

    if (position.hedging) {
      position.hedging.enabled = false;
      position.hedging.positions = [];

      position.history.push({
        id: this.generateId('hist'),
        timestamp: new Date(),
        type: 'hedge_closed',
        description: 'Disabled hedging',
        data: {},
      });
    }

    this.positions.set(positionId, position);
  }

  async getHedgingStatus(positionId: string): Promise<CollateralHedging | undefined> {
    const position = await this.getPosition(positionId);
    return position.hedging;
  }

  private createHedgePositions(
    assets: ManagedCollateralAsset[],
    strategy: HedgingStrategy
  ): HedgePosition[] {
    const positions: HedgePosition[] = [];

    for (const asset of assets) {
      if (asset.riskTier === 'low') continue; // Don't hedge low-risk assets

      const hedgeType = strategy === 'protective_puts' ? 'put_option' : 'short_future';
      const size = (parseFloat(asset.amount) * 0.5).toFixed(8); // Hedge 50%

      positions.push({
        id: this.generateId('hedge'),
        type: hedgeType,
        asset: asset.symbol,
        size,
        entryPrice: asset.priceUSD,
        currentPrice: asset.priceUSD,
        pnl: '0',
        expiresAt: strategy === 'protective_puts'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : undefined,
      });
    }

    return positions;
  }

  private calculateHedgeCost(positions: HedgePosition[]): string {
    // Simulate hedge cost as ~2% of position value
    const totalValue = positions.reduce((sum, p) => {
      return sum + parseFloat(p.size) * parseFloat(p.entryPrice);
    }, 0);
    return (totalValue * 0.02).toFixed(2);
  }

  // ============================================================================
  // Price Updates
  // ============================================================================

  async updatePrices(prices: Record<string, string>): Promise<void> {
    for (const [symbol, price] of Object.entries(prices)) {
      this.prices.set(symbol, price);
    }

    // Update all positions with new prices
    for (const position of this.positions.values()) {
      await this.refreshPositionPrices(position);
    }
  }

  private async refreshPositionPrices(position: CollateralPosition): Promise<void> {
    let totalValue = 0;

    for (const asset of position.assets) {
      const newPrice = this.prices.get(asset.symbol);
      if (newPrice) {
        const oldPrice = parseFloat(asset.priceUSD);
        const currentPrice = parseFloat(newPrice);
        const priceChange = oldPrice > 0 ? (currentPrice - oldPrice) / oldPrice : 0;

        asset.priceUSD = newPrice;
        asset.valueUSD = (parseFloat(asset.amount) * currentPrice).toFixed(2);
        asset.priceChange24h = priceChange;

        totalValue += parseFloat(asset.valueUSD);
      }
    }

    // Recalculate weights
    for (const asset of position.assets) {
      asset.weight = totalValue > 0 ? parseFloat(asset.valueUSD) / totalValue : 0;
    }

    position.totalValueUSD = totalValue.toFixed(2);
    position.monitoring.metrics = this.calculateMetrics(
      position.assets,
      position.monitoring.metrics.currentLTV
    );

    this.positions.set(position.id, position);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getStats(): Promise<CollateralStats> {
    const allPositions = Array.from(this.positions.values());

    let totalValue = 0;
    let totalHealthFactor = 0;
    let positionsAtRisk = 0;
    let totalHedgeValue = 0;
    let alertsActive = 0;

    for (const position of allPositions) {
      totalValue += parseFloat(position.totalValueUSD);
      totalHealthFactor += position.healthFactor;

      if (['warning', 'critical', 'liquidating'].includes(position.status)) {
        positionsAtRisk++;
      }

      if (position.hedging?.enabled) {
        totalHedgeValue += parseFloat(position.hedging.totalCost);
      }

      alertsActive += position.monitoring.alerts.filter((a) => !a.acknowledgedAt).length;
    }

    return {
      totalPositions: allPositions.length,
      totalValueUSD: totalValue.toFixed(2),
      positionsAtRisk,
      averageHealthFactor: allPositions.length > 0 ? totalHealthFactor / allPositions.length : 0,
      totalHedgeValue: totalHedgeValue.toFixed(2),
      alertsActive,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateTotalValue(assets: ManagedCollateralAsset[]): string {
    return assets.reduce((sum, a) => sum + parseFloat(a.valueUSD), 0).toFixed(2);
  }

  private calculateTotalAmount(assets: ManagedCollateralAsset[]): string {
    // Return weighted average or primary asset amount
    if (assets.length === 0) return '0';
    if (assets.length === 1) return assets[0].amount;

    // For multiple assets, return total USD value as primary metric
    return this.calculateTotalValue(assets);
  }

  private calculateMetrics(assets: ManagedCollateralAsset[], ltv: number): CollateralMetrics {
    const totalValue = parseFloat(this.calculateTotalValue(assets));
    const avgVolatility = assets.length > 0
      ? assets.reduce((sum, a) => sum + a.volatility24h, 0) / assets.length
      : 0;

    const diversificationScore = this.calculateDiversificationScore(assets);
    const healthFactor = ltv > 0 ? 0.85 / ltv : 2;
    const liquidationDistance = ltv > 0 ? (0.85 - ltv) / ltv : 1;
    const valueAtRisk = (totalValue * avgVolatility * 2.33).toFixed(2); // 99% VaR

    return {
      currentLTV: ltv,
      healthFactor,
      volatilityIndex: avgVolatility,
      diversificationScore,
      liquidationDistance,
      valueAtRisk,
    };
  }

  private calculateDiversificationScore(assets: ManagedCollateralAsset[]): number {
    if (assets.length <= 1) return 0;

    // Herfindahl-Hirschman Index based diversification
    const hhi = assets.reduce((sum, a) => sum + Math.pow(a.weight, 2), 0);
    // Convert to score (lower HHI = better diversification)
    return Math.max(0, 1 - hhi);
  }

  private getAssetVolatility(symbol: string): number {
    const volatilities: Record<string, number> = {
      BTC: 0.04,
      ETH: 0.05,
      TON: 0.08,
      BNB: 0.05,
      SOL: 0.08,
      MATIC: 0.07,
      USDT: 0.001,
      USDC: 0.001,
    };
    return volatilities[symbol] ?? 0.1;
  }

  private getAssetRiskTier(symbol: string): 'low' | 'medium' | 'high' {
    const lowRisk = ['USDT', 'USDC', 'DAI'];
    const mediumRisk = ['BTC', 'ETH'];

    if (lowRisk.includes(symbol)) return 'low';
    if (mediumRisk.includes(symbol)) return 'medium';
    return 'high';
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

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCollateralManager(
  config?: Partial<CollateralManagementConfig>
): DefaultCollateralManager {
  return new DefaultCollateralManager(config);
}

export default DefaultCollateralManager;
