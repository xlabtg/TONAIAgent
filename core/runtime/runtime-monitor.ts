/**
 * TONAIAgent - Runtime Monitor
 * Issue #212: Agent Execution Loop (Core Runtime Engine)
 *
 * Provides telemetry, health monitoring, and alerting for the agent runtime.
 * Exposes metrics for dashboards and monitoring systems.
 */

import type {
  AgentMetrics,
  AgentRuntimeState,
  AgentState,
  AgentStatus,
  RuntimeEvent,
  RuntimeEventHandler,
  RuntimeTelemetry,
  RuntimeUnsubscribe,
} from './types';

// ============================================================================
// Monitor Configuration
// ============================================================================

export interface RuntimeMonitorConfig {
  /** Enable telemetry collection */
  enableTelemetry: boolean;
  /** Telemetry update interval in ms */
  telemetryIntervalMs: number;
  /** Maximum events to retain in history */
  maxEventHistory: number;
  /** Enable alerting */
  enableAlerting: boolean;
  /** Alert thresholds */
  alertThresholds: {
    /** Maximum consecutive errors before alert */
    maxConsecutiveErrors: number;
    /** Maximum error rate (percentage) before alert */
    maxErrorRate: number;
    /** Maximum cycle latency in ms before alert */
    maxCycleLatencyMs: number;
    /** Minimum success rate (percentage) before alert */
    minSuccessRate: number;
  };
}

export const DEFAULT_MONITOR_CONFIG: RuntimeMonitorConfig = {
  enableTelemetry: true,
  telemetryIntervalMs: 5000,
  maxEventHistory: 1000,
  enableAlerting: true,
  alertThresholds: {
    maxConsecutiveErrors: 5,
    maxErrorRate: 20,
    maxCycleLatencyMs: 10000,
    minSuccessRate: 80,
  },
};

// ============================================================================
// Alert Types
// ============================================================================

export interface RuntimeAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'error_rate' | 'consecutive_errors' | 'high_latency' | 'low_success_rate' | 'agent_error';
  /** Severity */
  severity: 'warning' | 'critical';
  /** Alert message */
  message: string;
  /** Agent ID (if applicable) */
  agentId?: string;
  /** Current value that triggered the alert */
  currentValue: number;
  /** Threshold value */
  thresholdValue: number;
  /** Timestamp */
  timestamp: Date;
  /** Whether alert has been acknowledged */
  acknowledged: boolean;
}

export type AlertHandler = (alert: RuntimeAlert) => void;

// ============================================================================
// Runtime Monitor
// ============================================================================

/**
 * RuntimeMonitor - Provides observability for the agent runtime.
 *
 * Features:
 * - Real-time telemetry collection
 * - Agent status tracking
 * - Performance metrics aggregation
 * - Alerting on anomalies
 * - Event history
 *
 * @example
 * ```typescript
 * const monitor = new RuntimeMonitor();
 * monitor.start();
 *
 * // Get current telemetry
 * const telemetry = monitor.getTelemetry();
 * console.log(telemetry.activeAgents);
 *
 * // Get agent status
 * const status = monitor.getAgentStatus('agent-001');
 *
 * // Subscribe to alerts
 * monitor.onAlert((alert) => {
 *   console.log(`Alert: ${alert.message}`);
 * });
 *
 * monitor.stop();
 * ```
 */
export class RuntimeMonitor {
  private readonly config: RuntimeMonitorConfig;
  private readonly agentStates = new Map<string, AgentRuntimeState>();
  private readonly eventHistory: RuntimeEvent[] = [];
  private readonly alerts: RuntimeAlert[] = [];
  private readonly alertHandlers = new Set<AlertHandler>();
  private readonly eventHandlers = new Set<RuntimeEventHandler>();

  private telemetry: RuntimeTelemetry;
  private telemetryTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private startTime: Date | null = null;

  // Metrics accumulators
  private totalCycles = 0;
  private successfulCycles = 0;
  private failedCycles = 0;
  private totalTrades = 0;
  private totalVolumeProcessed = 0;
  private cycleDurations: number[] = [];

  constructor(config: Partial<RuntimeMonitorConfig> = {}) {
    this.config = {
      ...DEFAULT_MONITOR_CONFIG,
      ...config,
      alertThresholds: {
        ...DEFAULT_MONITOR_CONFIG.alertThresholds,
        ...config.alertThresholds,
      },
    };

    this.telemetry = this.createInitialTelemetry();
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the runtime monitor.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = new Date();

    if (this.config.enableTelemetry) {
      this.telemetryTimer = setInterval(() => {
        this.updateTelemetry();
      }, this.config.telemetryIntervalMs);
    }
  }

  /**
   * Stop the runtime monitor.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
  }

  /**
   * Check if monitor is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Agent State Tracking
  // ============================================================================

  /**
   * Register an agent for monitoring.
   */
  registerAgent(state: AgentRuntimeState): void {
    this.agentStates.set(state.agentId, { ...state });
    this.updateTelemetry();
  }

  /**
   * Update agent state.
   */
  updateAgentState(state: AgentRuntimeState): void {
    this.agentStates.set(state.agentId, { ...state });

    // Check for alert conditions
    if (this.config.enableAlerting) {
      this.checkAgentAlerts(state);
    }

    this.updateTelemetry();
  }

  /**
   * Unregister an agent from monitoring.
   */
  unregisterAgent(agentId: string): void {
    this.agentStates.delete(agentId);
    this.updateTelemetry();
  }

  // ============================================================================
  // Event Recording
  // ============================================================================

  /**
   * Record a runtime event.
   */
  recordEvent(event: RuntimeEvent): void {
    this.eventHistory.push(event);

    // Trim history if needed
    while (this.eventHistory.length > this.config.maxEventHistory) {
      this.eventHistory.shift();
    }

    // Update metrics based on event type
    switch (event.type) {
      case 'cycle.completed':
        this.totalCycles++;
        this.successfulCycles++;
        if (typeof event.data['durationMs'] === 'number') {
          this.cycleDurations.push(event.data['durationMs']);
          // Keep only last 100 durations for average
          if (this.cycleDurations.length > 100) {
            this.cycleDurations.shift();
          }
        }
        break;

      case 'cycle.failed':
        this.totalCycles++;
        this.failedCycles++;
        if (typeof event.data['durationMs'] === 'number') {
          this.cycleDurations.push(event.data['durationMs']);
          if (this.cycleDurations.length > 100) {
            this.cycleDurations.shift();
          }
        }
        break;

      case 'trade.executed':
        this.totalTrades++;
        if (typeof event.data['value'] === 'number') {
          this.totalVolumeProcessed += event.data['value'];
        }
        break;
    }

    // Emit to handlers
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }

    // Update telemetry immediately after recording events
    this.updateTelemetry();
  }

  // ============================================================================
  // Telemetry
  // ============================================================================

  /**
   * Get current telemetry snapshot.
   */
  getTelemetry(): RuntimeTelemetry {
    return { ...this.telemetry };
  }

  /**
   * Get agent status summary.
   */
  getAgentStatus(agentId: string): AgentStatus | undefined {
    const state = this.agentStates.get(agentId);
    if (!state) return undefined;

    return {
      agentId: state.agentId,
      name: state.config.name,
      state: state.state,
      strategyId: state.config.strategyId,
      portfolioValue: state.portfolioValue,
      roi: state.metrics.roi,
      totalTrades: state.metrics.totalTrades,
      lastExecutionAt: state.lastExecutionAt,
      nextExecutionAt: state.nextExecutionAt,
      errorMessage: state.errorMessage,
    };
  }

  /**
   * Get all agent statuses.
   */
  getAllAgentStatuses(): AgentStatus[] {
    const statuses: AgentStatus[] = [];

    for (const state of this.agentStates.values()) {
      statuses.push({
        agentId: state.agentId,
        name: state.config.name,
        state: state.state,
        strategyId: state.config.strategyId,
        portfolioValue: state.portfolioValue,
        roi: state.metrics.roi,
        totalTrades: state.metrics.totalTrades,
        lastExecutionAt: state.lastExecutionAt,
        nextExecutionAt: state.nextExecutionAt,
        errorMessage: state.errorMessage,
      });
    }

    return statuses;
  }

  /**
   * Get event history.
   */
  getEventHistory(limit = 100): RuntimeEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get events for a specific agent.
   */
  getAgentEvents(agentId: string, limit = 100): RuntimeEvent[] {
    return this.eventHistory
      .filter((e) => e.agentId === agentId)
      .slice(-limit);
  }

  // ============================================================================
  // Alerting
  // ============================================================================

  /**
   * Subscribe to alerts.
   */
  onAlert(handler: AlertHandler): () => void {
    this.alertHandlers.add(handler);
    return () => this.alertHandlers.delete(handler);
  }

  /**
   * Get all active alerts.
   */
  getAlerts(): RuntimeAlert[] {
    return [...this.alerts];
  }

  /**
   * Get unacknowledged alerts.
   */
  getUnacknowledgedAlerts(): RuntimeAlert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  /**
   * Acknowledge an alert.
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    return true;
  }

  /**
   * Clear acknowledged alerts.
   */
  clearAcknowledgedAlerts(): number {
    const initialLength = this.alerts.length;
    const remaining = this.alerts.filter((a) => !a.acknowledged);
    this.alerts.length = 0;
    this.alerts.push(...remaining);
    return initialLength - this.alerts.length;
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to runtime events.
   */
  subscribe(handler: RuntimeEventHandler): RuntimeUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createInitialTelemetry(): RuntimeTelemetry {
    return {
      activeAgents: 0,
      runningAgents: 0,
      pausedAgents: 0,
      stoppedAgents: 0,
      errorAgents: 0,
      totalCycles: 0,
      successfulCycles: 0,
      failedCycles: 0,
      avgCycleLatencyMs: 0,
      totalTrades: 0,
      totalVolumeProcessed: 0,
      uptimeMs: 0,
      updatedAt: new Date(),
    };
  }

  private updateTelemetry(): void {
    const stateCounts: Record<AgentState, number> = {
      CREATED: 0,
      RUNNING: 0,
      PAUSED: 0,
      STOPPED: 0,
      ERROR: 0,
    };

    for (const state of this.agentStates.values()) {
      stateCounts[state.state]++;
    }

    const avgLatency = this.cycleDurations.length > 0
      ? this.cycleDurations.reduce((a, b) => a + b, 0) / this.cycleDurations.length
      : 0;

    const uptimeMs = this.startTime
      ? Date.now() - this.startTime.getTime()
      : 0;

    this.telemetry = {
      activeAgents: this.agentStates.size,
      runningAgents: stateCounts.RUNNING,
      pausedAgents: stateCounts.PAUSED,
      stoppedAgents: stateCounts.STOPPED,
      errorAgents: stateCounts.ERROR,
      totalCycles: this.totalCycles,
      successfulCycles: this.successfulCycles,
      failedCycles: this.failedCycles,
      avgCycleLatencyMs: avgLatency,
      totalTrades: this.totalTrades,
      totalVolumeProcessed: this.totalVolumeProcessed,
      uptimeMs,
      updatedAt: new Date(),
    };

    // Check global alert conditions
    if (this.config.enableAlerting) {
      this.checkGlobalAlerts();
    }
  }

  private checkAgentAlerts(state: AgentRuntimeState): void {
    const thresholds = this.config.alertThresholds;

    // Check consecutive errors
    if (state.consecutiveErrors >= thresholds.maxConsecutiveErrors) {
      this.raiseAlert({
        type: 'consecutive_errors',
        severity: state.consecutiveErrors >= thresholds.maxConsecutiveErrors * 2 ? 'critical' : 'warning',
        message: `Agent ${state.agentId} has ${state.consecutiveErrors} consecutive errors`,
        agentId: state.agentId,
        currentValue: state.consecutiveErrors,
        thresholdValue: thresholds.maxConsecutiveErrors,
      });
    }

    // Check agent error state
    if (state.state === 'ERROR') {
      this.raiseAlert({
        type: 'agent_error',
        severity: 'critical',
        message: `Agent ${state.agentId} is in ERROR state: ${state.errorMessage ?? 'Unknown error'}`,
        agentId: state.agentId,
        currentValue: 1,
        thresholdValue: 0,
      });
    }
  }

  private checkGlobalAlerts(): void {
    const thresholds = this.config.alertThresholds;

    // Check error rate
    if (this.totalCycles > 10) {
      const errorRate = (this.failedCycles / this.totalCycles) * 100;
      if (errorRate >= thresholds.maxErrorRate) {
        this.raiseAlert({
          type: 'error_rate',
          severity: errorRate >= thresholds.maxErrorRate * 1.5 ? 'critical' : 'warning',
          message: `Global error rate is ${errorRate.toFixed(1)}%`,
          currentValue: errorRate,
          thresholdValue: thresholds.maxErrorRate,
        });
      }
    }

    // Check average latency
    if (this.telemetry.avgCycleLatencyMs >= thresholds.maxCycleLatencyMs) {
      this.raiseAlert({
        type: 'high_latency',
        severity: 'warning',
        message: `Average cycle latency is ${this.telemetry.avgCycleLatencyMs.toFixed(0)}ms`,
        currentValue: this.telemetry.avgCycleLatencyMs,
        thresholdValue: thresholds.maxCycleLatencyMs,
      });
    }

    // Check success rate
    if (this.totalCycles > 10) {
      const successRate = (this.successfulCycles / this.totalCycles) * 100;
      if (successRate < thresholds.minSuccessRate) {
        this.raiseAlert({
          type: 'low_success_rate',
          severity: successRate < thresholds.minSuccessRate / 2 ? 'critical' : 'warning',
          message: `Success rate is ${successRate.toFixed(1)}%`,
          currentValue: successRate,
          thresholdValue: thresholds.minSuccessRate,
        });
      }
    }
  }

  private raiseAlert(alertData: Omit<RuntimeAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    // Check if similar unacknowledged alert already exists
    const existingAlert = this.alerts.find(
      (a) =>
        !a.acknowledged &&
        a.type === alertData.type &&
        a.agentId === alertData.agentId
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.currentValue = alertData.currentValue;
      existingAlert.severity = alertData.severity;
      existingAlert.message = alertData.message;
      existingAlert.timestamp = new Date();
      return;
    }

    const alert: RuntimeAlert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Notify handlers
    for (const handler of this.alertHandlers) {
      try {
        handler(alert);
      } catch {
        // Ignore handler errors
      }
    }

    // Emit as event
    this.recordEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type: 'monitor.alert',
      timestamp: new Date(),
      agentId: alert.agentId,
      data: {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
        message: alert.message,
      },
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new RuntimeMonitor instance.
 */
export function createRuntimeMonitor(config?: Partial<RuntimeMonitorConfig>): RuntimeMonitor {
  return new RuntimeMonitor(config);
}
