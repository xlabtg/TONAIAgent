/**
 * TONAIAgent - Alert System
 *
 * Detects anomalies and triggers alerts for risk events.
 * Implements Issue #275: Observability, Monitoring & Production Readiness
 *
 * Alert triggers:
 *   🚨 high drawdown
 *   🚨 execution failures spike
 *   🚨 API errors spike
 *   🚨 abnormal agent behaviour
 *
 * Outputs:
 *   - In-memory event bus (subscribe/unsubscribe)
 *   - Structured log entry (via Logger)
 *   - Optional Telegram notifications (configurable)
 */

import { createLogger } from '../observability/logger';
import type { Logger } from '../observability/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Severity of the alert.
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Named categories for alert triggers.
 */
export type AlertType =
  | 'high_drawdown'
  | 'execution_failure_spike'
  | 'api_error_spike'
  | 'abnormal_agent_behavior'
  | 'low_success_rate'
  | 'high_slippage';

/**
 * A fired alert event.
 */
export interface AlertEvent {
  /** Unique alert identifier */
  alertId: string;
  /** Alert category */
  type: AlertType;
  /** Severity level */
  severity: AlertSeverity;
  /** Human-readable description */
  message: string;
  /** Related agent (if applicable) */
  agentId?: string;
  /** Related strategy (if applicable) */
  strategyId?: string;
  /** Additional context data */
  context: Record<string, unknown>;
  /** ISO-8601 timestamp */
  firedAt: string;
}

/**
 * Handler called when an alert fires.
 */
export type AlertHandler = (alert: AlertEvent) => void;

/**
 * Unsubscribe function.
 */
export type AlertUnsubscribe = () => void;

/**
 * Thresholds that determine when alerts fire.
 */
export interface AlertThresholds {
  /** Drawdown percentage that triggers a high-drawdown alert (e.g. -5 for -5%) */
  maxDrawdownPct: number;
  /** Number of failures in `failureWindowMs` that trigger a spike alert */
  executionFailureSpike: number;
  /** Time window (ms) for counting failures */
  failureWindowMs: number;
  /** Number of API errors in `apiErrorWindowMs` that trigger a spike alert */
  apiErrorSpike: number;
  /** Time window (ms) for counting API errors */
  apiErrorWindowMs: number;
  /** Win rate % below which an abnormal-behaviour alert fires */
  minWinRatePct: number;
  /** Average slippage bps above which a high-slippage alert fires */
  maxAvgSlippageBps: number;
}

/** Default alert thresholds */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  maxDrawdownPct: -5,
  executionFailureSpike: 5,
  failureWindowMs: 60_000, // 1 minute
  apiErrorSpike: 10,
  apiErrorWindowMs: 60_000, // 1 minute
  minWinRatePct: 20,
  maxAvgSlippageBps: 100,
};

// ============================================================================
// AlertService
// ============================================================================

let _alertIdCounter = 0;
function generateAlertId(): string {
  return `alert_${Date.now()}_${++_alertIdCounter}`;
}

/**
 * Alert service — evaluates conditions and fires alert events.
 *
 * @example
 * ```typescript
 * const alerts = createAlertService();
 *
 * // Subscribe to all alerts
 * const unsub = alerts.subscribe(alert => {
 *   console.log('ALERT:', alert.type, alert.message);
 * });
 *
 * // Check drawdown
 * alerts.checkDrawdown('agent_001', -8.5);  // fires if below threshold
 *
 * unsub();
 * ```
 */
export class AlertService {
  private readonly thresholds: AlertThresholds;
  private readonly logger: Logger;
  private readonly handlers = new Set<AlertHandler>();
  private readonly recentFailures: number[] = [];
  private readonly recentApiErrors: number[] = [];
  private readonly firedAlerts: AlertEvent[] = [];

  constructor(thresholds?: Partial<AlertThresholds>, logger?: Logger) {
    this.thresholds = { ...DEFAULT_ALERT_THRESHOLDS, ...thresholds };
    this.logger = logger ?? createLogger('alert-service');
  }

  // --------------------------------------------------------------------------
  // Subscriptions
  // --------------------------------------------------------------------------

  /** Subscribe to alert events */
  subscribe(handler: AlertHandler): AlertUnsubscribe {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  // --------------------------------------------------------------------------
  // Check methods
  // --------------------------------------------------------------------------

  /**
   * Check if drawdown exceeds the configured threshold and fire an alert.
   * @param agentId  Agent being checked
   * @param drawdownPct  Current drawdown percentage (negative, e.g. -7.2)
   */
  checkDrawdown(agentId: string, drawdownPct: number): void {
    if (drawdownPct <= this.thresholds.maxDrawdownPct) {
      this.fire({
        type: 'high_drawdown',
        severity: drawdownPct <= this.thresholds.maxDrawdownPct * 2 ? 'critical' : 'warning',
        message: `High drawdown detected for agent ${agentId}: ${drawdownPct.toFixed(2)}%`,
        agentId,
        context: {
          drawdownPct,
          threshold: this.thresholds.maxDrawdownPct,
        },
      });
    }
  }

  /**
   * Record an execution failure and check for a spike.
   * @param agentId  Agent that had a failure
   */
  recordExecutionFailure(agentId?: string): void {
    const now = Date.now();
    this.recentFailures.push(now);
    this.pruneWindow(this.recentFailures, this.thresholds.failureWindowMs);

    if (this.recentFailures.length >= this.thresholds.executionFailureSpike) {
      this.fire({
        type: 'execution_failure_spike',
        severity: 'critical',
        message: `Execution failure spike: ${this.recentFailures.length} failures in last ${this.thresholds.failureWindowMs / 1000}s`,
        agentId,
        context: {
          failureCount: this.recentFailures.length,
          windowMs: this.thresholds.failureWindowMs,
          threshold: this.thresholds.executionFailureSpike,
        },
      });
    }
  }

  /**
   * Record an API error and check for a spike.
   */
  recordApiError(): void {
    const now = Date.now();
    this.recentApiErrors.push(now);
    this.pruneWindow(this.recentApiErrors, this.thresholds.apiErrorWindowMs);

    if (this.recentApiErrors.length >= this.thresholds.apiErrorSpike) {
      this.fire({
        type: 'api_error_spike',
        severity: 'critical',
        message: `API error spike: ${this.recentApiErrors.length} errors in last ${this.thresholds.apiErrorWindowMs / 1000}s`,
        context: {
          errorCount: this.recentApiErrors.length,
          windowMs: this.thresholds.apiErrorWindowMs,
          threshold: this.thresholds.apiErrorSpike,
        },
      });
    }
  }

  /**
   * Check if an agent's win rate signals abnormal behaviour.
   * @param agentId  Agent being evaluated
   * @param winRatePct  Current win rate (0-100)
   */
  checkAgentWinRate(agentId: string, winRatePct: number): void {
    if (winRatePct < this.thresholds.minWinRatePct) {
      this.fire({
        type: 'abnormal_agent_behavior',
        severity: 'warning',
        message: `Abnormal agent behaviour: win rate ${winRatePct.toFixed(1)}% is below threshold`,
        agentId,
        context: {
          winRatePct,
          threshold: this.thresholds.minWinRatePct,
        },
      });
    }
  }

  /**
   * Check average slippage for a spike.
   * @param avgSlippageBps  Average slippage in basis points
   * @param agentId  Agent being evaluated
   */
  checkSlippage(avgSlippageBps: number, agentId?: string): void {
    if (avgSlippageBps > this.thresholds.maxAvgSlippageBps) {
      this.fire({
        type: 'high_slippage',
        severity: 'warning',
        message: `High slippage detected: ${avgSlippageBps.toFixed(0)} bps (threshold: ${this.thresholds.maxAvgSlippageBps} bps)`,
        agentId,
        context: {
          avgSlippageBps,
          threshold: this.thresholds.maxAvgSlippageBps,
        },
      });
    }
  }

  /**
   * Check trade success rate.
   * @param successRatePct  Success rate 0-100
   * @param agentId  Agent being evaluated
   */
  checkSuccessRate(successRatePct: number, agentId?: string): void {
    if (successRatePct < this.thresholds.minWinRatePct) {
      this.fire({
        type: 'low_success_rate',
        severity: 'warning',
        message: `Low execution success rate: ${successRatePct.toFixed(1)}%`,
        agentId,
        context: {
          successRatePct,
          threshold: this.thresholds.minWinRatePct,
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // History
  // --------------------------------------------------------------------------

  /** All fired alerts (in chronological order) */
  getHistory(): readonly AlertEvent[] {
    return [...this.firedAlerts];
  }

  /** Clear alert history */
  clearHistory(): void {
    this.firedAlerts.length = 0;
  }

  /** Get current thresholds */
  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private fire(
    partial: Omit<AlertEvent, 'alertId' | 'firedAt'>
  ): void {
    const alert: AlertEvent = {
      alertId: generateAlertId(),
      firedAt: new Date().toISOString(),
      ...partial,
    };

    this.firedAlerts.push(alert);

    // Log
    const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
    this.logger[logLevel](`[ALERT] ${alert.type}: ${alert.message}`, {
      agentId: alert.agentId,
      ...alert.context,
    });

    // Notify subscribers
    for (const handler of this.handlers) {
      try {
        handler(alert);
      } catch {
        // Ignore handler errors to avoid cascading failures
      }
    }
  }

  private pruneWindow(timestamps: number[], windowMs: number): void {
    const cutoff = Date.now() - windowMs;
    while (timestamps.length > 0 && (timestamps[0] ?? 0) < cutoff) {
      timestamps.shift();
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an AlertService with default thresholds.
 */
export function createAlertService(
  thresholds?: Partial<AlertThresholds>,
  logger?: Logger
): AlertService {
  return new AlertService(thresholds, logger);
}
