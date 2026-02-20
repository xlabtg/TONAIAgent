/**
 * TONAIAgent - Omnichain Monitoring and Observability
 *
 * Comprehensive monitoring system for cross-chain operations.
 * Provides execution logging, metrics collection, and real-time alerts.
 *
 * Features:
 * - Execution logging with full audit trail
 * - Real-time metrics collection
 * - Alert management and notifications
 * - Performance dashboards
 * - Transaction history tracking
 */

import {
  OmnichainEvent,
  OmnichainEventType,
  OmnichainEventCallback,
  OmnichainMetrics,
  ApiLatencyMetrics,
  ExecutionLog,
  ExecutionStep,
  MonitoringConfig,
  AlertChannel,
  ChainId,
  CrossChainTransactionStatus,
  ActionResult,
} from './types';

// ============================================================================
// Monitoring Service Interface
// ============================================================================

export interface MonitoringService {
  // Event logging
  logEvent(event: Omit<OmnichainEvent, 'id' | 'timestamp'>): void;
  getEvents(filters?: EventFilters): Promise<ActionResult<OmnichainEvent[]>>;
  clearEvents(olderThan?: Date): Promise<ActionResult<number>>;

  // Execution logging
  startExecution(transactionId: string, step: ExecutionStep): string;
  completeExecution(logId: string, success: boolean, details?: Record<string, unknown>): void;
  getExecutionLogs(transactionId: string): Promise<ActionResult<ExecutionLog[]>>;

  // Metrics
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  getMetrics(): Promise<ActionResult<OmnichainMetrics>>;
  getApiLatency(): Promise<ActionResult<ApiLatencyMetrics>>;

  // Transaction tracking
  trackTransaction(
    transactionId: string,
    status: CrossChainTransactionStatus,
    metadata?: Record<string, unknown>
  ): void;
  getTransactionHistory(
    filters?: TransactionHistoryFilters
  ): Promise<ActionResult<TransactionHistoryEntry[]>>;

  // Alerts
  createAlert(alert: CreateAlertInput): Promise<ActionResult<AlertEntry>>;
  getAlerts(filters?: AlertFilters): Promise<ActionResult<AlertEntry[]>>;
  acknowledgeAlert(alertId: string): Promise<ActionResult<void>>;
  resolveAlert(alertId: string, resolution: string): Promise<ActionResult<void>>;

  // Dashboard data
  getDashboardData(): Promise<ActionResult<DashboardData>>;

  // Configuration
  configureAlertChannel(channel: AlertChannel): Promise<ActionResult<void>>;
  getAlertChannels(): AlertChannel[];

  // Events subscription
  onEvent(callback: OmnichainEventCallback): void;
}

export interface EventFilters {
  type?: OmnichainEventType;
  source?: string;
  chainId?: ChainId;
  severity?: OmnichainEvent['severity'];
  since?: Date;
  until?: Date;
  limit?: number;
}

export interface TransactionHistoryFilters {
  userId?: string;
  agentId?: string;
  chainId?: ChainId;
  status?: CrossChainTransactionStatus;
  since?: Date;
  until?: Date;
  limit?: number;
}

export interface TransactionHistoryEntry {
  transactionId: string;
  status: CrossChainTransactionStatus;
  timestamps: StatusTimestamp[];
  metadata: Record<string, unknown>;
}

export interface StatusTimestamp {
  status: CrossChainTransactionStatus;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateAlertInput {
  severity: OmnichainEvent['severity'];
  category: string;
  title: string;
  message: string;
  chainId?: ChainId;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertEntry {
  id: string;
  severity: OmnichainEvent['severity'];
  category: string;
  title: string;
  message: string;
  chainId?: ChainId;
  transactionId?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolution?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertFilters {
  severity?: OmnichainEvent['severity'];
  category?: string;
  status?: AlertEntry['status'];
  chainId?: ChainId;
  since?: Date;
}

export interface DashboardData {
  summary: DashboardSummary;
  recentTransactions: TransactionSummary[];
  chainStatus: ChainStatusEntry[];
  alerts: AlertSummary;
  performance: PerformanceSummary;
  timestamp: Date;
}

export interface DashboardSummary {
  totalTransactions24h: number;
  successRate24h: number;
  totalVolumeUsd24h: number;
  activeStrategies: number;
  pendingTransactions: number;
}

export interface TransactionSummary {
  id: string;
  type: string;
  sourceChain: ChainId;
  destinationChain: ChainId;
  status: CrossChainTransactionStatus;
  amount: string;
  timestamp: Date;
}

export interface ChainStatusEntry {
  chainId: ChainId;
  chainName: string;
  status: 'operational' | 'degraded' | 'down';
  latencyMs: number;
  successRate: number;
  lastCheck: Date;
}

export interface AlertSummary {
  critical: number;
  error: number;
  warning: number;
  info: number;
  unacknowledged: number;
}

export interface PerformanceSummary {
  avgExecutionTimeMs: number;
  avgSlippagePercent: number;
  totalFeesUsd: number;
  profitLossUsd: number;
}

export interface MonitoringServiceConfig extends Partial<MonitoringConfig> {}

// ============================================================================
// Default Monitoring Service Implementation
// ============================================================================

export class DefaultMonitoringService implements MonitoringService {
  private readonly config: MonitoringConfig;
  private readonly events: OmnichainEvent[] = [];
  private readonly executionLogs: Map<string, ExecutionLog> = new Map();
  private readonly transactionHistory: Map<string, TransactionHistoryEntry> = new Map();
  private readonly alerts: Map<string, AlertEntry> = new Map();
  private readonly alertChannels: AlertChannel[] = [];
  private readonly eventCallbacks: OmnichainEventCallback[] = [];
  private readonly metrics: MetricsStore;

  constructor(config: MonitoringServiceConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      logLevel: config.logLevel ?? 'info',
      metricsEnabled: config.metricsEnabled ?? true,
      alertsEnabled: config.alertsEnabled ?? true,
      eventRetentionDays: config.eventRetentionDays ?? 30,
      alertChannels: config.alertChannels ?? [],
    };

    this.alertChannels = [...this.config.alertChannels];
    this.metrics = new MetricsStore();
  }

  // ==========================================================================
  // Event Logging
  // ==========================================================================

  logEvent(event: Omit<OmnichainEvent, 'id' | 'timestamp'>): void {
    if (!this.config.enabled) return;

    const severityLevels = { debug: 0, info: 1, warning: 2, error: 3, critical: 4 };
    const configLevel = severityLevels[this.config.logLevel];
    const eventLevel = severityLevels[event.severity];

    if (eventLevel < configLevel) return;

    const fullEvent: OmnichainEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.events.push(fullEvent);

    // Emit to subscribers
    for (const callback of this.eventCallbacks) {
      try {
        callback(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }

    // Update metrics
    if (this.config.metricsEnabled) {
      this.metrics.increment(`events.${event.type}`);
      this.metrics.increment(`events.severity.${event.severity}`);
    }

    // Check if alert should be created
    if (
      this.config.alertsEnabled &&
      (event.severity === 'error' || event.severity === 'critical')
    ) {
      this.createAlertFromEvent(fullEvent);
    }

    // Cleanup old events
    this.cleanupOldEvents();
  }

  async getEvents(filters?: EventFilters): Promise<ActionResult<OmnichainEvent[]>> {
    const startTime = Date.now();

    try {
      let events = [...this.events];

      if (filters?.type) {
        events = events.filter(e => e.type === filters.type);
      }

      if (filters?.source) {
        events = events.filter(e => e.source === filters.source);
      }

      if (filters?.chainId) {
        events = events.filter(e => e.chainId === filters.chainId);
      }

      if (filters?.severity) {
        events = events.filter(e => e.severity === filters.severity);
      }

      if (filters?.since) {
        events = events.filter(e => e.timestamp >= filters.since!);
      }

      if (filters?.until) {
        events = events.filter(e => e.timestamp <= filters.until!);
      }

      // Sort by timestamp descending
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      if (filters?.limit) {
        events = events.slice(0, filters.limit);
      }

      return {
        success: true,
        data: events,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async clearEvents(olderThan?: Date): Promise<ActionResult<number>> {
    const startTime = Date.now();

    try {
      const cutoff = olderThan || new Date(0);
      const initialCount = this.events.length;

      const remaining = this.events.filter(e => e.timestamp > cutoff);
      this.events.length = 0;
      this.events.push(...remaining);

      const clearedCount = initialCount - remaining.length;

      return {
        success: true,
        data: clearedCount,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Execution Logging
  // ==========================================================================

  startExecution(transactionId: string, step: ExecutionStep): string {
    const logId = this.generateId();
    const log: ExecutionLog = {
      id: logId,
      transactionId,
      timestamp: new Date(),
      step,
      status: 'started',
      durationMs: 0,
      details: {},
    };

    this.executionLogs.set(logId, log);

    this.logEvent({
      type: 'transaction_pending',
      source: 'monitoring',
      transactionId,
      severity: 'debug',
      message: `Execution started: ${step}`,
      data: { step },
    });

    return logId;
  }

  completeExecution(
    logId: string,
    success: boolean,
    details?: Record<string, unknown>
  ): void {
    const log = this.executionLogs.get(logId);
    if (!log) return;

    const now = new Date();
    log.status = success ? 'completed' : 'failed';
    log.durationMs = now.getTime() - log.timestamp.getTime();
    log.details = details || {};

    if (!success && details?.error) {
      log.error = String(details.error);
    }

    this.executionLogs.set(logId, log);

    // Update metrics
    if (this.config.metricsEnabled) {
      this.metrics.increment(`execution.${log.step}.${log.status}`);
      this.metrics.recordLatency(`execution.${log.step}`, log.durationMs);
    }

    this.logEvent({
      type: success ? 'transaction_completed' : 'transaction_failed',
      source: 'monitoring',
      transactionId: log.transactionId,
      severity: success ? 'info' : 'error',
      message: `Execution ${log.status}: ${log.step}`,
      data: { step: log.step, durationMs: log.durationMs, ...details },
    });
  }

  async getExecutionLogs(
    transactionId: string
  ): Promise<ActionResult<ExecutionLog[]>> {
    const startTime = Date.now();

    try {
      const logs = Array.from(this.executionLogs.values())
        .filter(l => l.transactionId === transactionId)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      return {
        success: true,
        data: logs,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Metrics
  // ==========================================================================

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.metricsEnabled) return;
    this.metrics.record(name, value, tags);
  }

  async getMetrics(): Promise<ActionResult<OmnichainMetrics>> {
    const startTime = Date.now();

    try {
      const metrics: OmnichainMetrics = {
        totalTransactions: this.metrics.getCount('transactions.total'),
        successfulTransactions: this.metrics.getCount('transactions.successful'),
        failedTransactions: this.metrics.getCount('transactions.failed'),
        pendingTransactions: this.metrics.getCount('transactions.pending'),
        totalVolumeUsd: this.metrics.getSum('volume.usd'),
        totalFeesUsd: this.metrics.getSum('fees.usd'),
        averageExecutionTimeMs: this.metrics.getAverageLatency('execution.overall'),
        averageSlippage: this.metrics.getAverage('slippage.percent'),
        chainUtilization: this.metrics.getChainUtilization(),
        assetVolumes: this.metrics.getAssetVolumes(),
        errorRates: this.metrics.getErrorRates(),
        apiLatency: this.getLatencyMetrics(),
        timestamp: new Date(),
      };

      return {
        success: true,
        data: metrics,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getApiLatency(): Promise<ActionResult<ApiLatencyMetrics>> {
    const startTime = Date.now();

    try {
      return {
        success: true,
        data: this.getLatencyMetrics(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Transaction Tracking
  // ==========================================================================

  trackTransaction(
    transactionId: string,
    status: CrossChainTransactionStatus,
    metadata?: Record<string, unknown>
  ): void {
    const existing = this.transactionHistory.get(transactionId);

    if (existing) {
      existing.status = status;
      existing.timestamps.push({
        status,
        timestamp: new Date(),
        metadata,
      });
      existing.metadata = { ...existing.metadata, ...metadata };
    } else {
      this.transactionHistory.set(transactionId, {
        transactionId,
        status,
        timestamps: [
          {
            status,
            timestamp: new Date(),
            metadata,
          },
        ],
        metadata: metadata || {},
      });
    }

    // Update metrics
    if (this.config.metricsEnabled) {
      this.metrics.increment(`transactions.${status}`);
      if (status === 'completed') {
        this.metrics.increment('transactions.successful');
      } else if (status === 'failed') {
        this.metrics.increment('transactions.failed');
      }
    }

    this.logEvent({
      type: `transaction_${status}` as OmnichainEventType,
      source: 'monitoring',
      transactionId,
      severity: status === 'failed' ? 'error' : 'info',
      message: `Transaction ${status}`,
      data: metadata || {},
    });
  }

  async getTransactionHistory(
    filters?: TransactionHistoryFilters
  ): Promise<ActionResult<TransactionHistoryEntry[]>> {
    const startTime = Date.now();

    try {
      let entries = Array.from(this.transactionHistory.values());

      if (filters?.status) {
        entries = entries.filter(e => e.status === filters.status);
      }

      if (filters?.since) {
        entries = entries.filter(e => {
          const firstTimestamp = e.timestamps[0]?.timestamp;
          return firstTimestamp && firstTimestamp >= filters.since!;
        });
      }

      // Sort by most recent activity
      entries.sort((a, b) => {
        const aLast = a.timestamps[a.timestamps.length - 1]?.timestamp;
        const bLast = b.timestamps[b.timestamps.length - 1]?.timestamp;
        return (bLast?.getTime() || 0) - (aLast?.getTime() || 0);
      });

      if (filters?.limit) {
        entries = entries.slice(0, filters.limit);
      }

      return {
        success: true,
        data: entries,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Alerts
  // ==========================================================================

  async createAlert(input: CreateAlertInput): Promise<ActionResult<AlertEntry>> {
    const startTime = Date.now();

    try {
      const alert: AlertEntry = {
        id: this.generateId(),
        severity: input.severity,
        category: input.category,
        title: input.title,
        message: input.message,
        chainId: input.chainId,
        transactionId: input.transactionId,
        status: 'active',
        createdAt: new Date(),
        metadata: input.metadata,
      };

      this.alerts.set(alert.id, alert);

      // Send to alert channels
      this.sendAlertToChannels(alert);

      return {
        success: true,
        data: alert,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getAlerts(filters?: AlertFilters): Promise<ActionResult<AlertEntry[]>> {
    const startTime = Date.now();

    try {
      let alerts = Array.from(this.alerts.values());

      if (filters?.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }

      if (filters?.category) {
        alerts = alerts.filter(a => a.category === filters.category);
      }

      if (filters?.status) {
        alerts = alerts.filter(a => a.status === filters.status);
      }

      if (filters?.chainId) {
        alerts = alerts.filter(a => a.chainId === filters.chainId);
      }

      if (filters?.since) {
        alerts = alerts.filter(a => a.createdAt >= filters.since!);
      }

      // Sort by creation time descending
      alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        success: true,
        data: alerts,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async acknowledgeAlert(alertId: string): Promise<ActionResult<void>> {
    const startTime = Date.now();

    try {
      const alert = this.alerts.get(alertId);

      if (!alert) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Alert ${alertId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      this.alerts.set(alertId, alert);

      return {
        success: true,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async resolveAlert(alertId: string, resolution: string): Promise<ActionResult<void>> {
    const startTime = Date.now();

    try {
      const alert = this.alerts.get(alertId);

      if (!alert) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Alert ${alertId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolution = resolution;
      this.alerts.set(alertId, alert);

      return {
        success: true,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Dashboard
  // ==========================================================================

  async getDashboardData(): Promise<ActionResult<DashboardData>> {
    const startTime = Date.now();

    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get recent transactions
      const historyResult = await this.getTransactionHistory({
        since: oneDayAgo,
        limit: 10,
      });

      // Calculate summary
      const allTransactions = Array.from(this.transactionHistory.values()).filter(
        t => t.timestamps[0]?.timestamp >= oneDayAgo
      );

      const successfulCount = allTransactions.filter(
        t => t.status === 'completed'
      ).length;

      const summary: DashboardSummary = {
        totalTransactions24h: allTransactions.length,
        successRate24h:
          allTransactions.length > 0
            ? (successfulCount / allTransactions.length) * 100
            : 0,
        totalVolumeUsd24h: this.metrics.getSum('volume.usd.24h'),
        activeStrategies: this.metrics.getCount('strategies.active'),
        pendingTransactions: this.metrics.getCount('transactions.pending'),
      };

      // Get chain statuses
      const chainStatus: ChainStatusEntry[] = [
        this.createChainStatus('ton', 'The Open Network'),
        this.createChainStatus('eth', 'Ethereum'),
        this.createChainStatus('sol', 'Solana'),
        this.createChainStatus('bnb', 'BNB Chain'),
        this.createChainStatus('polygon', 'Polygon'),
        this.createChainStatus('arbitrum', 'Arbitrum'),
      ];

      // Get alert summary
      const allAlerts = Array.from(this.alerts.values());
      const alertSummary: AlertSummary = {
        critical: allAlerts.filter(a => a.severity === 'critical').length,
        error: allAlerts.filter(a => a.severity === 'error').length,
        warning: allAlerts.filter(a => a.severity === 'warning').length,
        info: allAlerts.filter(a => a.severity === 'info').length,
        unacknowledged: allAlerts.filter(a => a.status === 'active').length,
      };

      // Performance summary
      const performance: PerformanceSummary = {
        avgExecutionTimeMs: this.metrics.getAverageLatency('execution.overall'),
        avgSlippagePercent: this.metrics.getAverage('slippage.percent'),
        totalFeesUsd: this.metrics.getSum('fees.usd'),
        profitLossUsd: this.metrics.getSum('pnl.usd'),
      };

      const dashboard: DashboardData = {
        summary,
        recentTransactions: (historyResult.data || []).map(t => ({
          id: t.transactionId,
          type: String(t.metadata.type || 'unknown'),
          sourceChain: String(t.metadata.sourceChain || 'unknown') as ChainId,
          destinationChain: String(t.metadata.destinationChain || 'unknown') as ChainId,
          status: t.status,
          amount: String(t.metadata.amount || '0'),
          timestamp: t.timestamps[t.timestamps.length - 1]?.timestamp || new Date(),
        })),
        chainStatus,
        alerts: alertSummary,
        performance,
        timestamp: now,
      };

      return {
        success: true,
        data: dashboard,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  async configureAlertChannel(channel: AlertChannel): Promise<ActionResult<void>> {
    const startTime = Date.now();

    try {
      const existingIndex = this.alertChannels.findIndex(
        c => c.type === channel.type && c.endpoint === channel.endpoint
      );

      if (existingIndex >= 0) {
        this.alertChannels[existingIndex] = channel;
      } else {
        this.alertChannels.push(channel);
      }

      return {
        success: true,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  getAlertChannels(): AlertChannel[] {
    return [...this.alertChannels];
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  onEvent(callback: OmnichainEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private createAlertFromEvent(event: OmnichainEvent): void {
    this.createAlert({
      severity: event.severity,
      category: event.type,
      title: `${event.type} Alert`,
      message: event.message,
      chainId: event.chainId,
      transactionId: event.transactionId,
      metadata: event.data,
    });
  }

  private sendAlertToChannels(alert: AlertEntry): void {
    const severityLevels: Record<string, number> = { info: 0, warning: 1, error: 2, critical: 3 };

    for (const channel of this.alertChannels) {
      if (!channel.enabled) continue;

      const alertLevel = severityLevels[alert.severity] ?? 0;
      const channelLevel = severityLevels[channel.minSeverity] ?? 0;

      if (alertLevel >= channelLevel) {
        // In a real implementation, this would send to the actual channel
        this.logEvent({
          type: 'risk_alert',
          source: 'monitoring',
          severity: 'debug',
          message: `Alert sent to ${channel.type}: ${alert.title}`,
          data: { channelType: channel.type, alertId: alert.id },
        });
      }
    }
  }

  private createChainStatus(chainId: ChainId, chainName: string): ChainStatusEntry {
    const latency = this.metrics.getAverageLatency(`chain.${chainId}.latency`);
    const successRate = this.metrics.getAverage(`chain.${chainId}.success_rate`) || 100;

    let status: ChainStatusEntry['status'] = 'operational';
    if (successRate < 90 || latency > 5000) {
      status = 'degraded';
    }
    if (successRate < 50 || latency > 30000) {
      status = 'down';
    }

    return {
      chainId,
      chainName,
      status,
      latencyMs: latency,
      successRate,
      lastCheck: new Date(),
    };
  }

  private getLatencyMetrics(): ApiLatencyMetrics {
    return {
      averageMs: this.metrics.getAverageLatency('api.overall'),
      p50Ms: this.metrics.getPercentileLatency('api.overall', 50),
      p95Ms: this.metrics.getPercentileLatency('api.overall', 95),
      p99Ms: this.metrics.getPercentileLatency('api.overall', 99),
      errorRate: this.metrics.getAverage('api.error_rate'),
      requestsPerMinute: this.metrics.getCount('api.requests.per_minute'),
    };
  }

  private cleanupOldEvents(): void {
    const retentionMs = this.config.eventRetentionDays * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - retentionMs);

    const remaining = this.events.filter(e => e.timestamp > cutoff);
    if (remaining.length < this.events.length) {
      this.events.length = 0;
      this.events.push(...remaining);
    }
  }

  private handleError(error: unknown, startTime: number): ActionResult<never> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message,
        retryable: false,
      },
      executionTime: Date.now() - startTime,
    };
  }

  private generateId(): string {
    return `mon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Metrics Store (Internal)
// ============================================================================

class MetricsStore {
  private counters: Map<string, number> = new Map();
  private sums: Map<string, number> = new Map();
  private latencies: Map<string, number[]> = new Map();
  private averages: Map<string, { sum: number; count: number }> = new Map();

  increment(key: string, amount: number = 1): void {
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + amount);
  }

  getCount(key: string): number {
    return this.counters.get(key) || 0;
  }

  record(name: string, value: number, _tags?: Record<string, string>): void {
    this.increment(name);
    const sumKey = `sum.${name}`;
    const current = this.sums.get(sumKey) || 0;
    this.sums.set(sumKey, current + value);

    const avg = this.averages.get(name) || { sum: 0, count: 0 };
    avg.sum += value;
    avg.count++;
    this.averages.set(name, avg);
  }

  getSum(key: string): number {
    return this.sums.get(`sum.${key}`) || this.sums.get(key) || 0;
  }

  getAverage(key: string): number {
    const avg = this.averages.get(key);
    if (!avg || avg.count === 0) return 0;
    return avg.sum / avg.count;
  }

  recordLatency(key: string, latencyMs: number): void {
    const latencies = this.latencies.get(key) || [];
    latencies.push(latencyMs);
    // Keep only last 1000 measurements
    if (latencies.length > 1000) {
      latencies.shift();
    }
    this.latencies.set(key, latencies);
  }

  getAverageLatency(key: string): number {
    const latencies = this.latencies.get(key);
    if (!latencies || latencies.length === 0) return 0;
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }

  getPercentileLatency(key: string, percentile: number): number {
    const latencies = this.latencies.get(key);
    if (!latencies || latencies.length === 0) return 0;

    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getChainUtilization(): Record<ChainId, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.counters) {
      if (key.startsWith('chain.') && key.endsWith('.transactions')) {
        const chainId = key.replace('chain.', '').replace('.transactions', '');
        result[chainId] = value;
      }
    }
    return result;
  }

  getAssetVolumes(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.sums) {
      if (key.startsWith('sum.asset.') && key.endsWith('.volume')) {
        const asset = key.replace('sum.asset.', '').replace('.volume', '');
        result[asset] = value;
      }
    }
    return result;
  }

  getErrorRates(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.averages) {
      if (key.endsWith('.error_rate')) {
        const component = key.replace('.error_rate', '');
        result[component] = value.count > 0 ? value.sum / value.count : 0;
      }
    }
    return result;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMonitoringService(
  config?: MonitoringServiceConfig
): DefaultMonitoringService {
  return new DefaultMonitoringService(config);
}

export default DefaultMonitoringService;
