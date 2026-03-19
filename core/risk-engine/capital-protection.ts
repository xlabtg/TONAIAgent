/**
 * Risk Engine — Capital Protection & Hardened Risk Config
 * Issue #269: Risk Engine Hardening & Capital Protection Layer
 *
 * Extends the existing risk engine with institutional-grade capital protection:
 *   - HardenedRiskConfig with full set of protection parameters
 *   - RollingLossTracker for 24h/7d rolling loss windows
 *   - DrawdownTracker for real-time portfolio drawdown tracking
 *   - ConcentrationRiskCalculator extending HHI for intra-portfolio concentration
 *   - CapitalProtectionEvaluator — main evaluation entry point
 *
 * Standardized failure reasons (Issue #269):
 *   RISK_MAX_DRAWDOWN, RISK_DAILY_LOSS, RISK_POSITION_TOO_LARGE,
 *   RISK_OVEREXPOSURE, RISK_TOO_FREQUENT, RISK_SYSTEM_HALT
 */

import type { RiskEngineEvent, RiskEngineEventCallback } from './types';

// ============================================================================
// Hardened Risk Config (Issue #269 upgrade)
// ============================================================================

/**
 * Production-grade risk configuration covering all protection layers.
 */
export interface HardenedRiskConfig {
  // --- Capital protection ---
  /** Maximum portfolio drawdown before halting trades (percent, e.g. 15) */
  maxDrawdownPercent: number;
  /** Maximum single position size as percent of portfolio (e.g. 5) */
  maxPositionSizePercent: number;
  /** Maximum total portfolio exposure percent (e.g. 80) */
  maxPortfolioExposurePercent: number;
  /** Maximum number of trades in the rolling window */
  maxTradesPerWindow: number;
  /** Rolling window duration in milliseconds (default: 3600000 = 1 hour) */
  tradeWindowMs: number;
  /** Maximum cumulative daily loss in USD */
  maxDailyLossUsd: number;
  /** Maximum allowed slippage in basis points (e.g. 100 = 1%) */
  maxSlippageBps: number;

  // --- Autonomous agent safeguards ---
  /** Consecutive loss count before forcing conservative mode */
  consecutiveLossThreshold: number;
  /** Number of consecutive losses to trigger agent stop */
  consecutiveLossStopThreshold: number;
  /** Drawdown above this triggers aggressive→conservative mode change (percent) */
  aggressivenessDowngradeDrawdownPercent: number;

  // --- Rolling loss windows ---
  /** Maximum loss over 24h rolling window in USD */
  maxLoss24hUsd: number;
  /** Maximum loss over 7d rolling window in USD */
  maxLoss7dUsd: number;
}

export const DEFAULT_HARDENED_RISK_CONFIG: HardenedRiskConfig = {
  maxDrawdownPercent: 15,
  maxPositionSizePercent: 5,
  maxPortfolioExposurePercent: 80,
  maxTradesPerWindow: 10,
  tradeWindowMs: 60 * 60 * 1000, // 1 hour
  maxDailyLossUsd: 500,
  maxSlippageBps: 100,
  consecutiveLossThreshold: 3,
  consecutiveLossStopThreshold: 5,
  aggressivenessDowngradeDrawdownPercent: 10,
  maxLoss24hUsd: 600,
  maxLoss7dUsd: 2000,
};

// ============================================================================
// Standardized Failure Reasons (Issue #269)
// ============================================================================

export type HardenedRiskFailureReason =
  | 'RISK_MAX_DRAWDOWN'
  | 'RISK_DAILY_LOSS'
  | 'RISK_POSITION_TOO_LARGE'
  | 'RISK_OVEREXPOSURE'
  | 'RISK_TOO_FREQUENT'
  | 'RISK_SYSTEM_HALT'
  | 'RISK_SLIPPAGE_TOO_HIGH'
  | 'RISK_ROLLING_LOSS_24H'
  | 'RISK_ROLLING_LOSS_7D';

// ============================================================================
// Rolling Loss Tracker
// ============================================================================

interface LossEntry {
  timestamp: number;
  lossUsd: number;
}

/**
 * Tracks rolling cumulative losses over configurable windows (24h, 7d).
 */
export class RollingLossTracker {
  private readonly entries: LossEntry[] = [];

  /**
   * Record a loss event. Only losses (positive values) are tracked.
   * Gains (negative values) reduce the rolling loss total.
   */
  record(lossUsd: number, at = Date.now()): void {
    this.entries.push({ timestamp: at, lossUsd });
    this.prune(at);
  }

  /**
   * Get total cumulative loss within the given window in ms.
   */
  getTotalLoss(windowMs: number, now = Date.now()): number {
    const cutoff = now - windowMs;
    return this.entries
      .filter(e => e.timestamp > cutoff && e.lossUsd > 0)
      .reduce((sum, e) => sum + e.lossUsd, 0);
  }

  /**
   * Get total net PnL (loss - gain) within the given window.
   */
  getNetLoss(windowMs: number, now = Date.now()): number {
    const cutoff = now - windowMs;
    return this.entries
      .filter(e => e.timestamp > cutoff)
      .reduce((sum, e) => sum + e.lossUsd, 0);
  }

  /**
   * Remove entries older than 7 days to bound memory usage.
   */
  private prune(now: number): void {
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const cutoff = now - maxAge;
    const first = this.entries.findIndex(e => e.timestamp > cutoff);
    if (first > 0) this.entries.splice(0, first);
  }
}

// ============================================================================
// Drawdown Tracker
// ============================================================================

/**
 * Real-time portfolio drawdown tracker.
 * Computes drawdown as (peak - current) / peak * 100.
 */
export class DrawdownTracker {
  private peakValueUsd = 0;

  /**
   * Update the portfolio value. Returns current drawdown percent.
   */
  update(currentValueUsd: number): number {
    if (currentValueUsd > this.peakValueUsd) {
      this.peakValueUsd = currentValueUsd;
    }
    return this.getCurrentDrawdown(currentValueUsd);
  }

  /**
   * Returns current drawdown percent without updating the peak.
   */
  getCurrentDrawdown(currentValueUsd: number): number {
    if (this.peakValueUsd <= 0) return 0;
    const drawdown = ((this.peakValueUsd - currentValueUsd) / this.peakValueUsd) * 100;
    return Math.max(0, drawdown);
  }

  /** Returns the peak portfolio value seen so far. */
  getPeak(): number {
    return this.peakValueUsd;
  }

  /** Reset the peak (e.g. on new fund period). */
  resetPeak(): void {
    this.peakValueUsd = 0;
  }
}

// ============================================================================
// Concentration Risk (HHI Extension)
// ============================================================================

export interface AssetExposureInput {
  assetId: string;
  valueUsd: number;
}

/**
 * Compute Herfindahl-Hirschman Index (HHI) for concentration risk.
 * Returns 0–10000. Higher = more concentrated.
 *   < 1500: well-diversified
 *   1500–2500: moderate concentration
 *   > 2500: high concentration
 */
export function computeHHI(assets: AssetExposureInput[]): number {
  const total = assets.reduce((s, a) => s + a.valueUsd, 0);
  if (total <= 0) return 0;
  return assets.reduce((hhi, a) => {
    const share = (a.valueUsd / total) * 100;
    return hhi + share * share;
  }, 0);
}

/**
 * Returns a normalized HHI score 0–1 where 1 = fully concentrated.
 */
export function normalizedHHI(assets: AssetExposureInput[]): number {
  return Math.min(1, computeHHI(assets) / 10000);
}

// ============================================================================
// Capital Protection Evaluation Request / Result
// ============================================================================

export interface CapitalProtectionRequest {
  requestId: string;
  agentId: string;
  action: 'BUY' | 'SELL';
  pair: string;
  positionSizePercent: number;
  amountUsd: number;
  slippageBps?: number;
}

export interface CapitalProtectionPortfolio {
  /** Total portfolio value in USD */
  totalValueUsd: number;
  /** Current drawdown percent (0–100) */
  currentDrawdownPercent: number;
  /** Current total exposure percent of portfolio (0–100) */
  currentExposurePercent: number;
  /** Cumulative daily loss in USD (positive = loss) */
  dailyLossUsd: number;
}

export type CapitalProtectionResult =
  | {
      approved: true;
      currentDrawdown: number;
      riskScore: number;
      reason?: never;
      message?: never;
    }
  | {
      approved: false;
      reason: HardenedRiskFailureReason;
      message: string;
      currentDrawdown: number;
      riskScore: number;
    };

// ============================================================================
// Capital Protection Evaluator
// ============================================================================

/**
 * Main capital protection evaluator for the hardened risk engine.
 * Integrates with RollingLossTracker and DrawdownTracker.
 */
export class CapitalProtectionEvaluator {
  private config: HardenedRiskConfig;
  private haltActive = false;
  private haltReason: string | null = null;
  private readonly tradeTimestamps = new Map<string, number[]>();
  private readonly rollingLossTrackers = new Map<string, RollingLossTracker>();
  private readonly drawdownTrackers = new Map<string, DrawdownTracker>();
  private readonly eventCallbacks: RiskEngineEventCallback[] = [];

  constructor(config: Partial<HardenedRiskConfig> = {}) {
    this.config = { ...DEFAULT_HARDENED_RISK_CONFIG, ...config };
  }

  onEvent(callback: RiskEngineEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // --------------------------------------------------------------------------
  // Main evaluate method (Issue #269)
  // --------------------------------------------------------------------------

  /**
   * Evaluate a trade against all capital protection rules.
   * Returns `{ approved: true }` or `{ approved: false, reason, message }`.
   */
  evaluate(
    request: CapitalProtectionRequest,
    portfolio: CapitalProtectionPortfolio
  ): CapitalProtectionResult {
    const drawdown = portfolio.currentDrawdownPercent;
    const riskScore = this.computeRiskScore(portfolio, request);

    // 1. Global kill-switch
    if (this.haltActive) {
      return this.deny('RISK_SYSTEM_HALT', `Trading halted: ${this.haltReason ?? 'emergency stop'}`, drawdown, riskScore);
    }

    // 2. Max drawdown protection
    if (drawdown >= this.config.maxDrawdownPercent) {
      this.emitEvent('drawdown_alert', { agentId: request.agentId, drawdown, threshold: this.config.maxDrawdownPercent });
      return this.deny('RISK_MAX_DRAWDOWN',
        `Portfolio drawdown ${drawdown.toFixed(2)}% ≥ max ${this.config.maxDrawdownPercent}%`,
        drawdown, riskScore);
    }

    // 3. Daily loss cap
    if (portfolio.dailyLossUsd >= this.config.maxDailyLossUsd) {
      return this.deny('RISK_DAILY_LOSS',
        `Daily loss $${portfolio.dailyLossUsd.toFixed(2)} ≥ cap $${this.config.maxDailyLossUsd}`,
        drawdown, riskScore);
    }

    // 4. Rolling 24h loss
    const tracker24h = this.getOrCreateLossTracker(request.agentId);
    const loss24h = tracker24h.getTotalLoss(24 * 60 * 60 * 1000);
    if (loss24h >= this.config.maxLoss24hUsd) {
      return this.deny('RISK_ROLLING_LOSS_24H',
        `24h rolling loss $${loss24h.toFixed(2)} ≥ cap $${this.config.maxLoss24hUsd}`,
        drawdown, riskScore);
    }

    // 5. Rolling 7d loss
    const loss7d = tracker24h.getTotalLoss(7 * 24 * 60 * 60 * 1000);
    if (loss7d >= this.config.maxLoss7dUsd) {
      return this.deny('RISK_ROLLING_LOSS_7D',
        `7d rolling loss $${loss7d.toFixed(2)} ≥ cap $${this.config.maxLoss7dUsd}`,
        drawdown, riskScore);
    }

    // 6. Portfolio over-exposure
    if (portfolio.currentExposurePercent >= this.config.maxPortfolioExposurePercent) {
      return this.deny('RISK_OVEREXPOSURE',
        `Exposure ${portfolio.currentExposurePercent.toFixed(1)}% ≥ max ${this.config.maxPortfolioExposurePercent}%`,
        drawdown, riskScore);
    }

    // 7. Position size
    if (request.positionSizePercent > this.config.maxPositionSizePercent) {
      return this.deny('RISK_POSITION_TOO_LARGE',
        `Position ${request.positionSizePercent.toFixed(1)}% > max ${this.config.maxPositionSizePercent}%`,
        drawdown, riskScore);
    }

    // 8. Trade frequency
    if (this.isThrottled(request.agentId)) {
      return this.deny('RISK_TOO_FREQUENT',
        `Max ${this.config.maxTradesPerWindow} trades per ${Math.round(this.config.tradeWindowMs / 60000)} min`,
        drawdown, riskScore);
    }

    // 9. Slippage hard cap
    if (request.slippageBps !== undefined && request.slippageBps > this.config.maxSlippageBps) {
      return this.deny('RISK_SLIPPAGE_TOO_HIGH',
        `Slippage ${request.slippageBps} bps > hard cap ${this.config.maxSlippageBps} bps`,
        drawdown, riskScore);
    }

    return { approved: true, currentDrawdown: drawdown, riskScore };
  }

  // --------------------------------------------------------------------------
  // Kill-switch
  // --------------------------------------------------------------------------

  halt(reason: string): void {
    this.haltActive = true;
    this.haltReason = reason;
    this.emitEvent('risk_response_triggered', { trigger: 'kill_switch', reason });
  }

  resume(): void {
    this.haltActive = false;
    this.haltReason = null;
    this.emitEvent('risk_response_completed', { trigger: 'kill_switch_lifted' });
  }

  isHalted(): boolean {
    return this.haltActive;
  }

  getHaltReason(): string | null {
    return this.haltReason;
  }

  // --------------------------------------------------------------------------
  // Config
  // --------------------------------------------------------------------------

  getConfig(): HardenedRiskConfig {
    return { ...this.config };
  }

  updateConfig(patch: Partial<HardenedRiskConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  // --------------------------------------------------------------------------
  // Execution tracking (frequency + rolling loss)
  // --------------------------------------------------------------------------

  /**
   * Call after each approved-and-executed trade to track frequency and losses.
   */
  recordExecution(agentId: string, lossUsd = 0): void {
    // Frequency tracking
    this.pruneTrades(agentId);
    const arr = this.getOrCreateTimestamps(agentId);
    arr.push(Date.now());

    // Rolling loss tracking
    if (lossUsd > 0) {
      this.getOrCreateLossTracker(agentId).record(lossUsd);
    }
  }

  /**
   * Update portfolio drawdown tracker for an agent.
   */
  updateDrawdown(agentId: string, currentValueUsd: number): number {
    return this.getOrCreateDrawdownTracker(agentId).update(currentValueUsd);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private deny(
    reason: HardenedRiskFailureReason,
    message: string,
    currentDrawdown: number,
    riskScore: number
  ): CapitalProtectionResult {
    this.emitEvent('limit_violated', { reason, message, currentDrawdown, riskScore });
    return { approved: false, reason, message, currentDrawdown, riskScore };
  }

  private computeRiskScore(
    portfolio: CapitalProtectionPortfolio,
    request: CapitalProtectionRequest
  ): number {
    const drawdownScore = Math.min(40, (portfolio.currentDrawdownPercent / Math.max(1, this.config.maxDrawdownPercent)) * 40);
    const dailyLossScore = Math.min(25, (portfolio.dailyLossUsd / Math.max(1, this.config.maxDailyLossUsd)) * 25);
    const exposureScore = Math.min(20, (portfolio.currentExposurePercent / Math.max(1, this.config.maxPortfolioExposurePercent)) * 20);
    const positionScore = Math.min(15, (request.positionSizePercent / Math.max(1, this.config.maxPositionSizePercent)) * 15);
    return Math.min(100, Math.round(drawdownScore + dailyLossScore + exposureScore + positionScore));
  }

  private isThrottled(agentId: string): boolean {
    this.pruneTrades(agentId);
    const arr = this.getOrCreateTimestamps(agentId);
    return arr.length >= this.config.maxTradesPerWindow;
  }

  private pruneTrades(agentId: string): void {
    const arr = this.tradeTimestamps.get(agentId);
    if (!arr) return;
    const cutoff = Date.now() - this.config.tradeWindowMs;
    const pruned = arr.filter(t => t > cutoff);
    this.tradeTimestamps.set(agentId, pruned);
  }

  private getOrCreateTimestamps(agentId: string): number[] {
    let arr = this.tradeTimestamps.get(agentId);
    if (!arr) {
      arr = [];
      this.tradeTimestamps.set(agentId, arr);
    }
    return arr;
  }

  private getOrCreateLossTracker(agentId: string): RollingLossTracker {
    let tracker = this.rollingLossTrackers.get(agentId);
    if (!tracker) {
      tracker = new RollingLossTracker();
      this.rollingLossTrackers.set(agentId, tracker);
    }
    return tracker;
  }

  private getOrCreateDrawdownTracker(agentId: string): DrawdownTracker {
    let tracker = this.drawdownTrackers.get(agentId);
    if (!tracker) {
      tracker = new DrawdownTracker();
      this.drawdownTrackers.set(agentId, tracker);
    }
    return tracker;
  }

  private emitEvent(type: string, payload: unknown): void {
    const event: RiskEngineEvent = {
      type: type as RiskEngineEvent['type'],
      timestamp: new Date(),
      payload,
    };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createCapitalProtectionEvaluator(
  config?: Partial<HardenedRiskConfig>
): CapitalProtectionEvaluator {
  return new CapitalProtectionEvaluator(config);
}

export default CapitalProtectionEvaluator;
