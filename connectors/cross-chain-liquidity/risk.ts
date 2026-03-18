/**
 * TONAIAgent - Cross-Chain Risk Controls
 *
 * Monitors bridge risks, liquidity fragmentation, transaction delays,
 * slippage anomalies, and other cross-chain risk factors. Generates
 * alerts and enforces risk limits for all cross-chain operations.
 */

import type {
  SupportedChainId,
  RiskCategory,
  RiskSeverity,
  RiskAlert,
  CrossChainRiskLimits,
  RiskMetrics,
  TradeRoute,
  TradeRequest,
  CrossChainLiquidityEvent,
  CrossChainLiquidityEventCallback,
} from './types';

import type { CrossChainConnectorRegistry } from './connector';

// ============================================================================
// Risk Monitor Interface
// ============================================================================

/** Interface for cross-chain risk monitoring */
export interface CrossChainRiskMonitor {
  /** Validate a trade against risk limits before execution */
  validateTrade(request: TradeRequest, route: TradeRoute): RiskValidationResult;

  /** Get current risk metrics for a chain */
  getChainRiskMetrics(chainId: SupportedChainId): RiskMetrics;

  /** Get all active risk alerts */
  getActiveAlerts(): RiskAlert[];

  /** Get all risk alerts (including resolved) */
  getAllAlerts(): RiskAlert[];

  /** Resolve a risk alert */
  resolveAlert(alertId: string): void;

  /** Update risk limits */
  updateLimits(limits: Partial<CrossChainRiskLimits>): void;

  /** Get current risk limits */
  getLimits(): CrossChainRiskLimits;

  /** Run a full risk scan across all connected chains */
  runRiskScan(): Promise<RiskAlert[]>;

  /** Subscribe to risk events */
  onEvent(callback: CrossChainLiquidityEventCallback): void;
}

/** Result of pre-trade risk validation */
export interface RiskValidationResult {
  approved: boolean;
  violations: RiskViolation[];
  warnings: string[];
  riskScore: number;
}

/** A specific limit violation found during risk validation */
export interface RiskViolation {
  field: string;
  limit: number;
  actual: number;
  message: string;
}

// ============================================================================
// Default Risk Limits
// ============================================================================

const DEFAULT_RISK_LIMITS: CrossChainRiskLimits = {
  maxSlippagePercent: 1.0,
  maxBridgeTimeMs: 600_000,       // 10 minutes
  maxSingleTradeUsd: 500_000,
  maxDailyVolumeUsd: 5_000_000,
  maxPositionConcentrationPercent: 30,
  minLiquidityPoolUsd: 100_000,
  blacklistedBridges: [],
  blacklistedChains: [],
};

// ============================================================================
// Risk Monitor Implementation
// ============================================================================

export class DefaultCrossChainRiskMonitor implements CrossChainRiskMonitor {
  private limits: CrossChainRiskLimits;
  private readonly alerts: Map<string, RiskAlert> = new Map();
  private readonly registry: CrossChainConnectorRegistry;
  private readonly eventCallbacks: CrossChainLiquidityEventCallback[] = [];
  private alertCounter = 0;
  private dailyVolume = 0;
  private dailyVolumeResetAt: Date = new Date();

  constructor(
    registry: CrossChainConnectorRegistry,
    limits: Partial<CrossChainRiskLimits> = {}
  ) {
    this.registry = registry;
    this.limits = { ...DEFAULT_RISK_LIMITS, ...limits };
    this.resetDailyVolumeIfNeeded();
  }

  // ============================================================================
  // Trade Validation
  // ============================================================================

  validateTrade(request: TradeRequest, route: TradeRoute): RiskValidationResult {
    this.resetDailyVolumeIfNeeded();

    const violations: RiskViolation[] = [];
    const warnings: string[] = [];

    // Check blacklisted chains
    if (this.limits.blacklistedChains.includes(request.fromToken.chainId)) {
      violations.push({
        field: 'fromChain',
        limit: 0,
        actual: 1,
        message: `Source chain ${request.fromToken.chainId} is blacklisted`,
      });
    }

    if (this.limits.blacklistedChains.includes(request.toToken.chainId)) {
      violations.push({
        field: 'toChain',
        limit: 0,
        actual: 1,
        message: `Destination chain ${request.toToken.chainId} is blacklisted`,
      });
    }

    // Check blacklisted bridges
    for (const leg of route.legs) {
      for (const bridge of this.limits.blacklistedBridges) {
        if (leg.sourceId.includes(bridge.toLowerCase())) {
          violations.push({
            field: 'bridge',
            limit: 0,
            actual: 1,
            message: `Bridge ${bridge} is blacklisted`,
          });
        }
      }
    }

    // Check slippage
    const slippagePercent = request.slippageTolerance * 100;
    if (slippagePercent > this.limits.maxSlippagePercent) {
      violations.push({
        field: 'slippage',
        limit: this.limits.maxSlippagePercent,
        actual: slippagePercent,
        message: `Slippage tolerance ${slippagePercent.toFixed(2)}% exceeds limit ${this.limits.maxSlippagePercent}%`,
      });
    }

    // Check trade size
    const tradeSizeUsd = request.amountIn; // Simplified: assuming amountIn is in USD-equivalent
    if (tradeSizeUsd > this.limits.maxSingleTradeUsd) {
      violations.push({
        field: 'tradeSize',
        limit: this.limits.maxSingleTradeUsd,
        actual: tradeSizeUsd,
        message: `Trade size $${tradeSizeUsd.toFixed(0)} exceeds limit $${this.limits.maxSingleTradeUsd.toFixed(0)}`,
      });
    }

    // Check daily volume
    if (this.dailyVolume + tradeSizeUsd > this.limits.maxDailyVolumeUsd) {
      violations.push({
        field: 'dailyVolume',
        limit: this.limits.maxDailyVolumeUsd,
        actual: this.dailyVolume + tradeSizeUsd,
        message: `Daily volume limit would be exceeded`,
      });
    }

    // Check bridge time
    const crossChainLegs = route.legs.filter(l => l.fromChainId !== l.toChainId);
    const totalBridgeTime = crossChainLegs.reduce(
      (s, l) => s + l.estimatedTimeMs,
      0
    );
    if (totalBridgeTime > this.limits.maxBridgeTimeMs) {
      violations.push({
        field: 'bridgeTime',
        limit: this.limits.maxBridgeTimeMs,
        actual: totalBridgeTime,
        message: `Bridge time ${(totalBridgeTime / 60000).toFixed(1)}min exceeds limit ${(this.limits.maxBridgeTimeMs / 60000).toFixed(1)}min`,
      });
    }

    // Warnings (non-blocking)
    if (route.priceImpact > 0.01) {
      warnings.push(`High price impact: ${(route.priceImpact * 100).toFixed(2)}%`);
    }

    if (route.totalFeeUsd / tradeSizeUsd > 0.02) {
      warnings.push(`High fee ratio: ${((route.totalFeeUsd / tradeSizeUsd) * 100).toFixed(2)}%`);
    }

    const riskScore = this.computeRiskScore(request, route, violations);

    return {
      approved: violations.length === 0,
      violations,
      warnings,
      riskScore,
    };
  }

  // ============================================================================
  // Risk Metrics
  // ============================================================================

  getChainRiskMetrics(chainId: SupportedChainId): RiskMetrics {
    const connector = this.registry.get(chainId);
    const isConnected = connector?.getStatus().status === 'connected';

    const chainAlerts = Array.from(this.alerts.values()).filter(
      a => a.chainId === chainId && !a.resolvedAt
    );

    // Simulate realistic metrics
    const baseSlippage = chainId === 'ethereum' ? 0.005 : 0.002;
    const baseBridgeLatency = chainId === 'ton' ? 5000 : 15000;
    const baseLiquidity = chainId === 'ethereum' ? 1_000_000_000 : 100_000_000;
    const baseVolatility = Math.random() * 3 + 1;

    const alertPenalty = chainAlerts.length * 10;

    return {
      chainId,
      currentSlippage: isConnected ? baseSlippage + Math.random() * 0.002 : 0,
      bridgeLatencyMs: isConnected ? baseBridgeLatency + Math.random() * 5000 : 0,
      liquidityDepthUsd: isConnected ? baseLiquidity * (0.8 + Math.random() * 0.4) : 0,
      volatility24h: baseVolatility,
      riskScore: Math.min(100, 20 + alertPenalty + baseVolatility * 5),
      alerts: chainAlerts,
      updatedAt: new Date(),
    };
  }

  getActiveAlerts(): RiskAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolvedAt);
  }

  getAllAlerts(): RiskAlert[] {
    return Array.from(this.alerts.values());
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolvedAt) {
      alert.resolvedAt = new Date();
      this.alerts.set(alertId, alert);
      this.emitEvent('risk_resolved', { alertId, category: alert.category });
    }
  }

  updateLimits(limits: Partial<CrossChainRiskLimits>): void {
    this.limits = { ...this.limits, ...limits };
  }

  getLimits(): CrossChainRiskLimits {
    return { ...this.limits };
  }

  // ============================================================================
  // Risk Scanning
  // ============================================================================

  async runRiskScan(): Promise<RiskAlert[]> {
    const newAlerts: RiskAlert[] = [];
    const connectedChains = this.registry.getConnectedChains();

    for (const chainId of connectedChains) {
      const metrics = this.getChainRiskMetrics(chainId);

      // Check liquidity fragmentation
      if (metrics.liquidityDepthUsd < this.limits.minLiquidityPoolUsd) {
        const alert = this.createAlert(
          'liquidity_fragmentation',
          'high',
          chainId,
          `Liquidity depth $${metrics.liquidityDepthUsd.toFixed(0)} below minimum $${this.limits.minLiquidityPoolUsd.toFixed(0)}`,
          'Consider reducing position sizes or switching to a more liquid chain'
        );
        newAlerts.push(alert);
      }

      // Check high slippage
      if (metrics.currentSlippage > this.limits.maxSlippagePercent / 100) {
        const alert = this.createAlert(
          'slippage_risk',
          'medium',
          chainId,
          `Current slippage ${(metrics.currentSlippage * 100).toFixed(2)}% above normal`,
          'Wait for lower network congestion or split trade into smaller batches'
        );
        newAlerts.push(alert);
      }

      // Check bridge latency
      if (metrics.bridgeLatencyMs > this.limits.maxBridgeTimeMs * 0.8) {
        const alert = this.createAlert(
          'transaction_delay',
          'medium',
          chainId,
          `Bridge latency ${(metrics.bridgeLatencyMs / 1000).toFixed(0)}s is elevated`,
          'Allow extra time for cross-chain transactions or use faster bridges'
        );
        newAlerts.push(alert);
      }

      // Check high volatility
      if (metrics.volatility24h > 5) {
        const alert = this.createAlert(
          'oracle_deviation',
          'low',
          chainId,
          `24h volatility ${metrics.volatility24h.toFixed(1)}% is elevated`,
          'Use tighter slippage tolerances and consider reducing position sizes'
        );
        newAlerts.push(alert);
      }
    }

    return newAlerts;
  }

  onEvent(callback: CrossChainLiquidityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private createAlert(
    category: RiskCategory,
    severity: RiskSeverity,
    chainId: SupportedChainId | undefined,
    description: string,
    recommendation: string
  ): RiskAlert {
    const alert: RiskAlert = {
      id: `alert_${++this.alertCounter}_${Date.now()}`,
      category,
      severity,
      chainId,
      description,
      recommendation,
      detectedAt: new Date(),
    };

    this.alerts.set(alert.id, alert);

    this.emitEvent(
      'risk_alert',
      { alertId: alert.id, category, severity, chainId },
      severity === 'critical' || severity === 'high' ? 'error' : 'warning'
    );

    return alert;
  }

  private computeRiskScore(
    request: TradeRequest,
    route: TradeRoute,
    violations: RiskViolation[]
  ): number {
    let score = 0;

    // Violations add the most risk
    score += violations.length * 30;

    // Cross-chain trades are riskier
    const isCrossChain = request.fromToken.chainId !== request.toToken.chainId;
    if (isCrossChain) score += 20;

    // High slippage adds risk
    score += request.slippageTolerance * 500;

    // High price impact adds risk
    score += route.priceImpact * 1000;

    // High fee ratio adds risk
    const feeRatio = route.totalFeeUsd / (request.amountIn || 1);
    score += feeRatio * 500;

    // High active alerts add risk
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    const highAlerts = activeAlerts.filter(a => a.severity === 'high');
    score += criticalAlerts.length * 15 + highAlerts.length * 5;

    return Math.min(100, Math.max(0, score));
  }

  private resetDailyVolumeIfNeeded(): void {
    const now = new Date();
    const hoursSinceReset =
      (now.getTime() - this.dailyVolumeResetAt.getTime()) / 3_600_000;

    if (hoursSinceReset >= 24) {
      this.dailyVolume = 0;
      this.dailyVolumeResetAt = now;
    }
  }

  private emitEvent(
    type: CrossChainLiquidityEvent['type'],
    data: Record<string, unknown>,
    severity: CrossChainLiquidityEvent['severity'] = 'info'
  ): void {
    const event: CrossChainLiquidityEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      timestamp: new Date(),
      data,
      severity,
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

/**
 * Create a cross-chain risk monitor.
 */
export function createCrossChainRiskMonitor(
  registry: CrossChainConnectorRegistry,
  limits?: Partial<CrossChainRiskLimits>
): DefaultCrossChainRiskMonitor {
  return new DefaultCrossChainRiskMonitor(registry, limits);
}

export { DEFAULT_RISK_LIMITS };
