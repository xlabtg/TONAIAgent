/**
 * TONAIAgent — Capital Protection Layer
 * Issue #269: Risk Engine Hardening & Capital Protection Layer
 *
 * Provides a global capital protection service that evaluates every trade
 * request against institutional-grade risk controls before it reaches the
 * execution engine.
 *
 * Architecture:
 * ```
 *   Strategy / Agent Decision
 *          ↓
 *   RiskControlService.evaluate()   ← THIS MODULE
 *          ↓
 *   SmartExecutionEngine
 *          ↓
 *   OnChainExecutor / Simulation
 * ```
 *
 * Risk controls enforced:
 *   - MAX_DRAWDOWN_EXCEEDED   — portfolio drawdown > maxDrawdownPercent
 *   - DAILY_LOSS_LIMIT        — daily loss > maxDailyLossUsd
 *   - OVEREXPOSED_PORTFOLIO   — portfolio exposure > maxPortfolioExposurePercent
 *   - TRADE_FREQUENCY_LIMIT   — too many trades in rolling window
 *   - POSITION_TOO_LARGE      — single position > maxPositionSizePercent
 *   - SLIPPAGE_TOO_HIGH       — requested slippage > maxSlippageBps
 *   - RISK_SYSTEM_HALT        — global kill-switch active
 */

// ============================================================================
// Risk Control Configuration
// ============================================================================

/**
 * Production-grade risk configuration.
 * All percentage fields are in percent (e.g. 15 = 15%).
 * USD fields are in US dollars.
 * Basis-point fields are in bps (e.g. 100 = 1%).
 */
export interface RiskConfig {
  /** Maximum portfolio drawdown allowed before halting (percent, e.g. 15) */
  maxDrawdownPercent: number;
  /** Maximum single position size as fraction of portfolio (percent, e.g. 5) */
  maxPositionSizePercent: number;
  /** Maximum total portfolio exposure percent (e.g. 80) */
  maxPortfolioExposurePercent: number;
  /** Maximum number of trades in the rolling window */
  maxTradesPerWindow: number;
  /** Rolling window duration in milliseconds (default: 60 minutes) */
  tradeWindowMs: number;
  /** Maximum cumulative daily loss in USD */
  maxDailyLossUsd: number;
  /** Maximum allowed slippage in basis points (e.g. 100 = 1%) */
  maxSlippageBps: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxDrawdownPercent: 15,
  maxPositionSizePercent: 5,
  maxPortfolioExposurePercent: 80,
  maxTradesPerWindow: 10,
  tradeWindowMs: 60 * 60 * 1000, // 1 hour
  maxDailyLossUsd: 500,
  maxSlippageBps: 100,
};

// ============================================================================
// Risk Control Request / Result Types
// ============================================================================

/** A snapshot of portfolio state at evaluation time. */
export interface PortfolioContext {
  /** Total portfolio value in USD */
  totalValueUsd: number;
  /** Current drawdown from peak (percent, 0–100) */
  currentDrawdownPercent: number;
  /** Current total exposure as percent of portfolio (0–100) */
  currentExposurePercent: number;
  /** Cumulative realized + unrealized loss today in USD (positive = loss) */
  dailyLossUsd: number;
  /** Peak portfolio value in USD (for drawdown computation) */
  peakValueUsd: number;
}

/** Request to evaluate before execution. */
export interface RiskEvaluationRequest {
  /** Unique identifier for this evaluation request */
  requestId: string;
  /** Agent or user identifier */
  agentId: string;
  /** Trade direction */
  action: 'BUY' | 'SELL';
  /** Trade pair (e.g. "TON/USDT") */
  pair: string;
  /** Position size as percent of portfolio (0–100) */
  positionSizePercent: number;
  /** Trade amount in USD */
  amountUsd: number;
  /** Requested slippage in basis points */
  slippageBps?: number;
}

/** Standardized failure reasons. */
export type RiskFailureReason =
  | 'RISK_MAX_DRAWDOWN'
  | 'RISK_DAILY_LOSS'
  | 'RISK_POSITION_TOO_LARGE'
  | 'RISK_OVEREXPOSURE'
  | 'RISK_TOO_FREQUENT'
  | 'RISK_SYSTEM_HALT'
  | 'RISK_SLIPPAGE_TOO_HIGH';

/** Result of a risk evaluation. */
export type RiskEvaluationResult =
  | {
      allowed: true;
      /** Current portfolio drawdown for metadata */
      currentDrawdown: number;
      /** Risk score at time of evaluation (0–100) */
      riskScore: number;
    }
  | {
      allowed: false;
      reason: RiskFailureReason;
      message: string;
      /** Current portfolio drawdown for metadata */
      currentDrawdown: number;
      /** Risk score at time of evaluation (0–100) */
      riskScore: number;
    };

// ============================================================================
// Trade Frequency Throttle
// ============================================================================

/** Per-agent trade timestamp window for frequency throttling. */
interface TradeWindow {
  timestamps: number[];
}

// ============================================================================
// Risk Control Service Interface
// ============================================================================

export interface RiskControlService {
  /**
   * Evaluate whether a trade request is allowed under current risk controls.
   * Returns `{ allowed: true }` or `{ allowed: false, reason, message }`.
   */
  evaluate(
    request: RiskEvaluationRequest,
    portfolio: PortfolioContext,
    context?: Record<string, unknown>
  ): RiskEvaluationResult;

  /**
   * Activate the global kill-switch — all future trades are blocked.
   * Used for emergency halts.
   */
  activateKillSwitch(reason: string): void;

  /**
   * Deactivate the global kill-switch to resume trading.
   */
  deactivateKillSwitch(): void;

  /** True if the kill-switch is currently active. */
  isHalted(): boolean;

  /** Returns the current kill-switch reason, or null if not halted. */
  getHaltReason(): string | null;

  /** Returns current risk configuration. */
  getConfig(): RiskConfig;

  /** Update risk configuration (partial update). */
  updateConfig(patch: Partial<RiskConfig>): void;

  /** Record that a trade was approved and executed (for frequency tracking). */
  recordExecution(agentId: string): void;
}

// ============================================================================
// Default Capital Protection Implementation
// ============================================================================

export class DefaultRiskControlService implements RiskControlService {
  private config: RiskConfig;
  private killSwitchActive = false;
  private killSwitchReason: string | null = null;
  private readonly tradeWindows = new Map<string, TradeWindow>();

  constructor(config: Partial<RiskConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Core evaluation method
  // --------------------------------------------------------------------------

  evaluate(
    request: RiskEvaluationRequest,
    portfolio: PortfolioContext,
    _context?: Record<string, unknown>
  ): RiskEvaluationResult {
    const drawdown = portfolio.currentDrawdownPercent;
    const riskScore = this.computeRiskScore(portfolio, request);

    // 1. Global kill-switch (highest priority)
    if (this.killSwitchActive) {
      return {
        allowed: false,
        reason: 'RISK_SYSTEM_HALT',
        message: `Trading halted: ${this.killSwitchReason ?? 'emergency stop activated'}`,
        currentDrawdown: drawdown,
        riskScore,
      };
    }

    // 2. Max drawdown protection
    if (drawdown >= this.config.maxDrawdownPercent) {
      return {
        allowed: false,
        reason: 'RISK_MAX_DRAWDOWN',
        message: `Portfolio drawdown ${drawdown.toFixed(2)}% exceeds maximum ${this.config.maxDrawdownPercent}%`,
        currentDrawdown: drawdown,
        riskScore,
      };
    }

    // 3. Daily loss cap
    if (portfolio.dailyLossUsd >= this.config.maxDailyLossUsd) {
      return {
        allowed: false,
        reason: 'RISK_DAILY_LOSS',
        message: `Daily loss $${portfolio.dailyLossUsd.toFixed(2)} exceeds cap of $${this.config.maxDailyLossUsd}`,
        currentDrawdown: drawdown,
        riskScore,
      };
    }

    // 4. Portfolio over-exposure
    if (portfolio.currentExposurePercent >= this.config.maxPortfolioExposurePercent) {
      return {
        allowed: false,
        reason: 'RISK_OVEREXPOSURE',
        message: `Portfolio exposure ${portfolio.currentExposurePercent.toFixed(1)}% exceeds maximum ${this.config.maxPortfolioExposurePercent}%`,
        currentDrawdown: drawdown,
        riskScore,
      };
    }

    // 5. Position size check
    if (request.positionSizePercent > this.config.maxPositionSizePercent) {
      return {
        allowed: false,
        reason: 'RISK_POSITION_TOO_LARGE',
        message: `Position size ${request.positionSizePercent.toFixed(1)}% exceeds maximum ${this.config.maxPositionSizePercent}%`,
        currentDrawdown: drawdown,
        riskScore,
      };
    }

    // 6. Trade frequency throttle
    if (this.isFrequencyLimitExceeded(request.agentId)) {
      return {
        allowed: false,
        reason: 'RISK_TOO_FREQUENT',
        message: `Trade frequency limit: max ${this.config.maxTradesPerWindow} trades per ${Math.round(this.config.tradeWindowMs / 60000)} minutes`,
        currentDrawdown: drawdown,
        riskScore,
      };
    }

    // 7. Slippage hard cap
    if (
      request.slippageBps !== undefined &&
      request.slippageBps > this.config.maxSlippageBps
    ) {
      return {
        allowed: false,
        reason: 'RISK_SLIPPAGE_TOO_HIGH',
        message: `Requested slippage ${request.slippageBps} bps exceeds hard cap ${this.config.maxSlippageBps} bps`,
        currentDrawdown: drawdown,
        riskScore,
      };
    }

    return { allowed: true, currentDrawdown: drawdown, riskScore };
  }

  // --------------------------------------------------------------------------
  // Kill-switch
  // --------------------------------------------------------------------------

  activateKillSwitch(reason: string): void {
    this.killSwitchActive = true;
    this.killSwitchReason = reason;
  }

  deactivateKillSwitch(): void {
    this.killSwitchActive = false;
    this.killSwitchReason = null;
  }

  isHalted(): boolean {
    return this.killSwitchActive;
  }

  getHaltReason(): string | null {
    return this.killSwitchReason;
  }

  // --------------------------------------------------------------------------
  // Config management
  // --------------------------------------------------------------------------

  getConfig(): RiskConfig {
    return { ...this.config };
  }

  updateConfig(patch: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  // --------------------------------------------------------------------------
  // Execution recording (for frequency tracking)
  // --------------------------------------------------------------------------

  recordExecution(agentId: string): void {
    this.pruneTrades(agentId);
    const window = this.getOrCreateWindow(agentId);
    window.timestamps.push(Date.now());
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Compute a composite risk score (0–100) from portfolio and request state.
   * Higher = riskier. Used for metadata and UI display.
   */
  private computeRiskScore(
    portfolio: PortfolioContext,
    request: RiskEvaluationRequest
  ): number {
    const drawdownScore = Math.min(100, (portfolio.currentDrawdownPercent / this.config.maxDrawdownPercent) * 40);
    const dailyLossScore = Math.min(100, (portfolio.dailyLossUsd / Math.max(1, this.config.maxDailyLossUsd)) * 25);
    const exposureScore = Math.min(100, (portfolio.currentExposurePercent / this.config.maxPortfolioExposurePercent) * 20);
    const positionScore = Math.min(100, (request.positionSizePercent / this.config.maxPositionSizePercent) * 15);
    return Math.min(100, Math.round(drawdownScore + dailyLossScore + exposureScore + positionScore));
  }

  private isFrequencyLimitExceeded(agentId: string): boolean {
    this.pruneTrades(agentId);
    const window = this.getOrCreateWindow(agentId);
    return window.timestamps.length >= this.config.maxTradesPerWindow;
  }

  private pruneTrades(agentId: string): void {
    const window = this.tradeWindows.get(agentId);
    if (!window) return;
    const cutoff = Date.now() - this.config.tradeWindowMs;
    window.timestamps = window.timestamps.filter(t => t > cutoff);
  }

  private getOrCreateWindow(agentId: string): TradeWindow {
    let window = this.tradeWindows.get(agentId);
    if (!window) {
      window = { timestamps: [] };
      this.tradeWindows.set(agentId, window);
    }
    return window;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new Capital Protection service with optional configuration.
 *
 * @example
 * ```typescript
 * import { createRiskControlService } from '@tonaiagent/services/risk-control';
 *
 * const riskControl = createRiskControlService({
 *   maxDrawdownPercent: 20,
 *   maxDailyLossUsd: 1000,
 *   maxPositionSizePercent: 5,
 *   maxPortfolioExposurePercent: 80,
 *   maxTradesPerWindow: 15,
 *   maxSlippageBps: 150,
 * });
 *
 * const result = riskControl.evaluate(request, portfolio);
 * if (!result.allowed) {
 *   console.log('Trade blocked:', result.reason, result.message);
 * }
 * ```
 */
export function createRiskControlService(
  config?: Partial<RiskConfig>
): DefaultRiskControlService {
  return new DefaultRiskControlService(config);
}

// Default singleton export
export const riskControlService = createRiskControlService();
export default DefaultRiskControlService;
