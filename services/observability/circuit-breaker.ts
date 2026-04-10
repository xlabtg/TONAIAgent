/**
 * TONAIAgent - Trading Circuit Breaker
 *
 * Implements automatic trading halts when system metrics breach critical thresholds.
 * Wires the EmergencyController to real-time metric checks so anomalies
 * trigger an emergency stop without human intervention.
 *
 * Implements Issue #313: Monitoring, Alerting, and Incident Response
 *
 * Thresholds (all configurable):
 *   Agent error rate  — warning >5% / critical >20% in a rolling window
 *   Portfolio drawdown — warning >10% / critical >20% in 1 h
 *   Trade volume anomaly — warning 3x avg / critical 10x avg
 *   Key-management errors — any occurrence → immediate critical alert
 *   API response time  — warning >2 s p99 / critical >5 s p99
 */

import type { EmergencyController } from '../../core/security/emergency';
import type { EmergencyType } from '../../core/security/types';
import { createLogger } from './logger';
import type { Logger } from './logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Metric snapshot consumed by the circuit breaker on each evaluation cycle.
 */
export interface CircuitBreakerMetrics {
  /** Error rate (0–1) measured over the last evaluation window */
  agentErrorRate: number;
  /** IDs of agents currently experiencing errors */
  affectedAgentIds: string[];
  /** Portfolio drawdown percentage (negative, e.g. -15 for -15%) */
  portfolioDrawdownPct: number;
  /** Ratio of current trade volume vs rolling average (e.g. 3.5 for 3.5x avg) */
  tradeVolumeRatio: number;
  /** Number of key-management errors observed */
  keyManagementErrors: number;
  /** API response time at the 99th percentile (ms) */
  apiLatencyP99Ms: number;
}

/** Severity of a circuit-breaker trip. */
export type TripSeverity = 'warning' | 'critical';

/** Reason a circuit-breaker was tripped. */
export type TripReason =
  | 'agent_error_rate_warning'
  | 'agent_error_rate_critical'
  | 'portfolio_drawdown_warning'
  | 'portfolio_drawdown_critical'
  | 'trade_volume_warning'
  | 'trade_volume_critical'
  | 'key_management_error'
  | 'api_latency_warning'
  | 'api_latency_critical';

/**
 * Emitted when the circuit breaker trips.
 */
export interface CircuitTripEvent {
  /** Unique event ID */
  tripId: string;
  /** Human-readable reason */
  reason: TripReason;
  /** Severity */
  severity: TripSeverity;
  /** Metric value that triggered the trip */
  metricValue: number;
  /** Configured threshold that was breached */
  threshold: number;
  /** Agent IDs affected (may be empty for system-wide trips) */
  affectedAgentIds: string[];
  /** ISO-8601 timestamp */
  trippedAt: string;
  /** Whether the emergency controller was invoked */
  emergencyTriggered: boolean;
}

/** Subscriber callback. */
export type TripHandler = (event: CircuitTripEvent) => void;

/** Returns an unsubscribe function. */
export type TripUnsubscribe = () => void;

/**
 * Thresholds that govern circuit-breaker behaviour.
 * All thresholds are configurable; defaults match the issue spec.
 */
export interface CircuitBreakerThresholds {
  /** Error rate (0–1) that fires a warning */
  agentErrorRateWarning: number;
  /** Error rate (0–1) that fires a critical trip and pauses agents */
  agentErrorRateCritical: number;
  /** Drawdown % that fires a warning (negative, e.g. -10) */
  portfolioDrawdownWarning: number;
  /** Drawdown % that fires a critical trip and stops trading (negative, e.g. -20) */
  portfolioDrawdownCritical: number;
  /** Trade volume ratio (vs avg) that fires a warning */
  tradeVolumeWarning: number;
  /** Trade volume ratio (vs avg) that fires a critical alert */
  tradeVolumeCritical: number;
  /** API latency (p99 ms) that fires a warning */
  apiLatencyWarningMs: number;
  /** API latency (p99 ms) that fires a critical alert */
  apiLatencyCriticalMs: number;
}

/** Default thresholds from the issue spec. */
export const DEFAULT_CIRCUIT_BREAKER_THRESHOLDS: CircuitBreakerThresholds = {
  agentErrorRateWarning: 0.05, // 5%
  agentErrorRateCritical: 0.20, // 20%
  portfolioDrawdownWarning: -10, // -10%
  portfolioDrawdownCritical: -20, // -20%
  tradeVolumeWarning: 3, // 3x average
  tradeVolumeCritical: 10, // 10x average
  apiLatencyWarningMs: 2_000, // 2 s
  apiLatencyCriticalMs: 5_000, // 5 s
};

// ============================================================================
// TradingCircuitBreaker
// ============================================================================

/**
 * Evaluates system metrics on each call to `checkAndTrip` and, when a
 * threshold is breached, fires a structured trip event and optionally
 * triggers the EmergencyController to pause or stop all agents.
 *
 * Only critical-severity breaches invoke the EmergencyController (to avoid
 * noisy auto-stops on transient warnings).
 *
 * Usage:
 *   const cb = createCircuitBreaker(emergencyController);
 *   cb.onTrip(event => log.warn('Circuit tripped', event));
 *   await cb.checkAndTrip(currentMetrics);
 */
export class TradingCircuitBreaker {
  private readonly thresholds: CircuitBreakerThresholds;
  private readonly emergencyController: EmergencyController | null;
  private readonly handlers: Set<TripHandler> = new Set();
  private readonly log: Logger;
  private tripCount = 0;

  constructor(
    emergencyController: EmergencyController | null,
    thresholds: Partial<CircuitBreakerThresholds> = {},
    logger?: Logger
  ) {
    this.emergencyController = emergencyController;
    this.thresholds = { ...DEFAULT_CIRCUIT_BREAKER_THRESHOLDS, ...thresholds };
    this.log = logger ?? createLogger('circuit-breaker');
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Subscribe to trip events.
   * @returns An unsubscribe function.
   */
  onTrip(handler: TripHandler): TripUnsubscribe {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Evaluate the provided metrics against all thresholds.
   * Trips (and optionally triggers the emergency controller) for each breach.
   */
  async checkAndTrip(metrics: CircuitBreakerMetrics): Promise<void> {
    // Check all conditions in order of severity (critical first so we don't
    // emit a warning trip when a critical trip fires on the same metric).

    // 1. Agent error rate
    if (metrics.agentErrorRate >= this.thresholds.agentErrorRateCritical) {
      await this._trip({
        reason: 'agent_error_rate_critical',
        severity: 'critical',
        metricValue: metrics.agentErrorRate,
        threshold: this.thresholds.agentErrorRateCritical,
        affectedAgentIds: metrics.affectedAgentIds,
        emergencyType: 'anomaly_detected',
      });
    } else if (metrics.agentErrorRate >= this.thresholds.agentErrorRateWarning) {
      this._tripWarning({
        reason: 'agent_error_rate_warning',
        metricValue: metrics.agentErrorRate,
        threshold: this.thresholds.agentErrorRateWarning,
        affectedAgentIds: metrics.affectedAgentIds,
      });
    }

    // 2. Portfolio drawdown (negative values — lower is worse)
    if (metrics.portfolioDrawdownPct <= this.thresholds.portfolioDrawdownCritical) {
      await this._trip({
        reason: 'portfolio_drawdown_critical',
        severity: 'critical',
        metricValue: metrics.portfolioDrawdownPct,
        threshold: this.thresholds.portfolioDrawdownCritical,
        affectedAgentIds: metrics.affectedAgentIds,
        emergencyType: 'risk_limit_breach',
      });
    } else if (metrics.portfolioDrawdownPct <= this.thresholds.portfolioDrawdownWarning) {
      this._tripWarning({
        reason: 'portfolio_drawdown_warning',
        metricValue: metrics.portfolioDrawdownPct,
        threshold: this.thresholds.portfolioDrawdownWarning,
        affectedAgentIds: metrics.affectedAgentIds,
      });
    }

    // 3. Trade volume anomaly
    if (metrics.tradeVolumeRatio >= this.thresholds.tradeVolumeCritical) {
      await this._trip({
        reason: 'trade_volume_critical',
        severity: 'critical',
        metricValue: metrics.tradeVolumeRatio,
        threshold: this.thresholds.tradeVolumeCritical,
        affectedAgentIds: metrics.affectedAgentIds,
        emergencyType: 'suspicious_activity',
      });
    } else if (metrics.tradeVolumeRatio >= this.thresholds.tradeVolumeWarning) {
      this._tripWarning({
        reason: 'trade_volume_warning',
        metricValue: metrics.tradeVolumeRatio,
        threshold: this.thresholds.tradeVolumeWarning,
        affectedAgentIds: metrics.affectedAgentIds,
      });
    }

    // 4. Key-management errors — any occurrence is critical
    if (metrics.keyManagementErrors > 0) {
      await this._trip({
        reason: 'key_management_error',
        severity: 'critical',
        metricValue: metrics.keyManagementErrors,
        threshold: 0,
        affectedAgentIds: metrics.affectedAgentIds,
        emergencyType: 'security_breach',
      });
    }

    // 5. API response time
    if (metrics.apiLatencyP99Ms >= this.thresholds.apiLatencyCriticalMs) {
      await this._trip({
        reason: 'api_latency_critical',
        severity: 'critical',
        metricValue: metrics.apiLatencyP99Ms,
        threshold: this.thresholds.apiLatencyCriticalMs,
        affectedAgentIds: metrics.affectedAgentIds,
        emergencyType: 'system_failure',
      });
    } else if (metrics.apiLatencyP99Ms >= this.thresholds.apiLatencyWarningMs) {
      this._tripWarning({
        reason: 'api_latency_warning',
        metricValue: metrics.apiLatencyP99Ms,
        threshold: this.thresholds.apiLatencyWarningMs,
        affectedAgentIds: metrics.affectedAgentIds,
      });
    }
  }

  /** Current number of trips recorded (resets on `reset()`). */
  getTripCount(): number {
    return this.tripCount;
  }

  /** Active threshold configuration. */
  getThresholds(): Readonly<CircuitBreakerThresholds> {
    return this.thresholds;
  }

  /** Reset internal trip counter (does NOT restore paused agents). */
  reset(): void {
    this.tripCount = 0;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async _trip(opts: {
    reason: TripReason;
    severity: 'critical';
    metricValue: number;
    threshold: number;
    affectedAgentIds: string[];
    emergencyType: EmergencyType;
  }): Promise<void> {
    this.tripCount++;
    const tripId = `trip_${Date.now()}_${this.tripCount}`;

    this.log.error(`Circuit breaker tripped [${opts.reason}]`, {
      tripId,
      metricValue: opts.metricValue,
      threshold: opts.threshold,
      affectedAgentIds: opts.affectedAgentIds,
    });

    let emergencyTriggered = false;
    if (this.emergencyController) {
      try {
        await this.emergencyController.triggerEmergency(
          opts.emergencyType,
          'circuit_breaker',
          opts.affectedAgentIds
        );
        emergencyTriggered = true;
      } catch (err) {
        this.log.error('Failed to trigger emergency controller', {
          tripId,
          error: String(err),
        });
      }
    }

    const event: CircuitTripEvent = {
      tripId,
      reason: opts.reason,
      severity: opts.severity,
      metricValue: opts.metricValue,
      threshold: opts.threshold,
      affectedAgentIds: opts.affectedAgentIds,
      trippedAt: new Date().toISOString(),
      emergencyTriggered,
    };

    this._emit(event);
  }

  private _tripWarning(opts: {
    reason: TripReason;
    metricValue: number;
    threshold: number;
    affectedAgentIds: string[];
  }): void {
    this.tripCount++;
    const tripId = `trip_${Date.now()}_${this.tripCount}`;

    this.log.warn(`Circuit breaker warning [${opts.reason}]`, {
      tripId,
      metricValue: opts.metricValue,
      threshold: opts.threshold,
    });

    const event: CircuitTripEvent = {
      tripId,
      reason: opts.reason,
      severity: 'warning',
      metricValue: opts.metricValue,
      threshold: opts.threshold,
      affectedAgentIds: opts.affectedAgentIds,
      trippedAt: new Date().toISOString(),
      emergencyTriggered: false,
    };

    this._emit(event);
  }

  private _emit(event: CircuitTripEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Never let a subscriber break the circuit-breaker loop.
      }
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a TradingCircuitBreaker with optional emergency controller and
 * custom threshold overrides.
 *
 * Pass `null` for `emergencyController` to get a stand-alone circuit breaker
 * that fires events without triggering emergency stops (useful in tests or
 * environments without the security module).
 */
export function createCircuitBreaker(
  emergencyController: EmergencyController | null,
  thresholds: Partial<CircuitBreakerThresholds> = {}
): TradingCircuitBreaker {
  return new TradingCircuitBreaker(emergencyController, thresholds);
}
