/**
 * TONAIAgent - Production Monitoring Service
 *
 * Implements the monitoring service layer with:
 *   - collectMetrics()    — aggregate metrics snapshot
 *   - getSystemHealth()   — health-check endpoint data
 *   - detectAnomalies()   — detect unusual conditions
 *
 * Also exposes:
 *   GET /api/health   — system health endpoint
 *   GET /api/metrics  — metrics snapshot endpoint
 *
 * Implements Issue #275: Observability, Monitoring & Production Readiness
 */

import type { AllMetrics } from '../observability/metrics';
import { MetricsCollector, createMetricsCollector } from '../observability/metrics';
import { createLogger } from '../observability/logger';
import type { Logger } from '../observability/logger';
import { AlertService, createAlertService } from '../alerts/alerts';
import type { AlertEvent } from '../alerts/alerts';
import type { MonitoringApiRequest, MonitoringApiResponse } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * System health status.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * System health response (GET /api/health).
 */
export interface SystemHealthResponse {
  /** Overall health status */
  status: HealthStatus;
  /** Process uptime in milliseconds */
  uptimeMs: number;
  /** Number of currently active agents */
  agentsActive: number;
  /** Current risk level aggregated across agents */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** ISO-8601 timestamp */
  checkedAt: string;
  /** Individual component statuses */
  components: Record<string, HealthStatus>;
}

/**
 * A detected anomaly.
 */
export interface Anomaly {
  /** Anomaly category */
  type: string;
  /** Human-readable description */
  description: string;
  /** Severity */
  severity: 'warning' | 'critical';
  /** ISO-8601 timestamp */
  detectedAt: string;
  /** Context data */
  context: Record<string, unknown>;
}

/**
 * Result of anomaly detection.
 */
export interface AnomalyDetectionResult {
  /** Whether any anomalies were found */
  hasAnomalies: boolean;
  /** List of detected anomalies */
  anomalies: Anomaly[];
  /** ISO-8601 timestamp */
  checkedAt: string;
}

/**
 * Configuration for the production monitoring service.
 */
export interface ProductionMonitoringConfig {
  /** Service name for logging */
  serviceName: string;
  /** Error rate (errors/sec) that triggers degraded status */
  degradedErrorRateThreshold: number;
  /** Error rate (errors/sec) that triggers unhealthy status */
  unhealthyErrorRateThreshold: number;
  /** API latency (ms) that triggers a latency anomaly */
  highLatencyThresholdMs: number;
  /** Memory usage (bytes) that triggers a memory anomaly */
  highMemoryThresholdBytes: number;
}

export const DEFAULT_PRODUCTION_MONITORING_CONFIG: ProductionMonitoringConfig = {
  serviceName: 'production-monitor',
  degradedErrorRateThreshold: 1,
  unhealthyErrorRateThreshold: 5,
  highLatencyThresholdMs: 1000,
  highMemoryThresholdBytes: 512 * 1024 * 1024, // 512 MB
};

// ============================================================================
// ProductionMonitoringService
// ============================================================================

/**
 * Production monitoring service — collects metrics, checks health, detects anomalies.
 *
 * @example
 * ```typescript
 * const monitor = createProductionMonitoringService();
 *
 * // Collect metrics
 * const metrics = monitor.collectMetrics();
 *
 * // Check system health
 * const health = monitor.getSystemHealth();
 * console.log(health.status); // 'healthy'
 *
 * // Detect anomalies
 * const result = monitor.detectAnomalies();
 * if (result.hasAnomalies) {
 *   console.log(result.anomalies);
 * }
 *
 * // Handle HTTP requests
 * const res = await monitor.handle({ method: 'GET', path: '/api/health' });
 * ```
 */
export class ProductionMonitoringService {
  readonly metrics: MetricsCollector;
  readonly alerts: AlertService;
  private readonly logger: Logger;
  private readonly config: ProductionMonitoringConfig;
  private readonly startedAt = Date.now();

  constructor(
    config?: Partial<ProductionMonitoringConfig>,
    metricsCollector?: MetricsCollector,
    alertService?: AlertService
  ) {
    this.config = { ...DEFAULT_PRODUCTION_MONITORING_CONFIG, ...config };
    this.metrics = metricsCollector ?? createMetricsCollector();
    this.alerts = alertService ?? createAlertService();
    this.logger = createLogger(this.config.serviceName);
  }

  // --------------------------------------------------------------------------
  // Core API
  // --------------------------------------------------------------------------

  /**
   * Collect and return a snapshot of all metrics.
   */
  collectMetrics(): AllMetrics {
    this.metrics.system.captureProcessMemory();
    return this.metrics.snapshot();
  }

  /**
   * Get current system health status.
   */
  getSystemHealth(): SystemHealthResponse {
    const snapshot = this.collectMetrics();
    const errorsPerSec = snapshot.system.errorsPerSec;
    const activeAgents = snapshot.agents.activeAgents;

    // Determine overall status
    let status: HealthStatus = 'healthy';
    if (errorsPerSec >= this.config.unhealthyErrorRateThreshold) {
      status = 'unhealthy';
    } else if (errorsPerSec >= this.config.degradedErrorRateThreshold) {
      status = 'degraded';
    }

    // Aggregate risk level (simple heuristic based on trading success rate)
    const successRate = snapshot.trading.successRate;
    let riskLevel: SystemHealthResponse['riskLevel'] = 'low';
    if (successRate < 50) {
      riskLevel = 'critical';
    } else if (successRate < 70) {
      riskLevel = 'high';
    } else if (successRate < 85) {
      riskLevel = 'medium';
    }

    const components: Record<string, HealthStatus> = {
      metrics: 'healthy',
      agents: activeAgents > 0 ? 'healthy' : 'degraded',
      trading: successRate >= 70 ? 'healthy' : successRate >= 50 ? 'degraded' : 'unhealthy',
    };

    return {
      status,
      uptimeMs: Date.now() - this.startedAt,
      agentsActive: activeAgents,
      riskLevel,
      checkedAt: new Date().toISOString(),
      components,
    };
  }

  /**
   * Run anomaly detection against current metrics.
   */
  detectAnomalies(): AnomalyDetectionResult {
    const snapshot = this.collectMetrics();
    const anomalies: Anomaly[] = [];
    const now = new Date().toISOString();

    // Check API latency
    if (snapshot.system.avgApiLatencyMs > this.config.highLatencyThresholdMs) {
      anomalies.push({
        type: 'high_api_latency',
        description: `Average API latency ${snapshot.system.avgApiLatencyMs.toFixed(0)}ms exceeds threshold ${this.config.highLatencyThresholdMs}ms`,
        severity: 'warning',
        detectedAt: now,
        context: {
          avgApiLatencyMs: snapshot.system.avgApiLatencyMs,
          threshold: this.config.highLatencyThresholdMs,
        },
      });
    }

    // Check memory usage
    if (snapshot.system.memoryUsageBytes > this.config.highMemoryThresholdBytes) {
      anomalies.push({
        type: 'high_memory_usage',
        description: `Memory usage ${(snapshot.system.memoryUsageBytes / 1024 / 1024).toFixed(0)}MB exceeds threshold`,
        severity: 'warning',
        detectedAt: now,
        context: {
          memoryUsageBytes: snapshot.system.memoryUsageBytes,
          threshold: this.config.highMemoryThresholdBytes,
        },
      });
    }

    // Check error rate
    if (snapshot.system.errorsPerSec >= this.config.unhealthyErrorRateThreshold) {
      anomalies.push({
        type: 'high_error_rate',
        description: `Error rate ${snapshot.system.errorsPerSec}/sec exceeds unhealthy threshold ${this.config.unhealthyErrorRateThreshold}/sec`,
        severity: 'critical',
        detectedAt: now,
        context: {
          errorsPerSec: snapshot.system.errorsPerSec,
          threshold: this.config.unhealthyErrorRateThreshold,
        },
      });
    } else if (snapshot.system.errorsPerSec >= this.config.degradedErrorRateThreshold) {
      anomalies.push({
        type: 'elevated_error_rate',
        description: `Error rate ${snapshot.system.errorsPerSec}/sec is elevated`,
        severity: 'warning',
        detectedAt: now,
        context: {
          errorsPerSec: snapshot.system.errorsPerSec,
          threshold: this.config.degradedErrorRateThreshold,
        },
      });
    }

    // Check trading success rate
    const totalTrades = snapshot.trading.totalTrades;
    if (totalTrades > 0 && snapshot.trading.successRate < 50) {
      anomalies.push({
        type: 'low_trading_success_rate',
        description: `Trading success rate ${snapshot.trading.successRate.toFixed(1)}% is critically low`,
        severity: 'critical',
        detectedAt: now,
        context: {
          successRate: snapshot.trading.successRate,
          totalTrades,
        },
      });
    }

    if (anomalies.length > 0) {
      this.logger.warn(`Anomaly detection found ${anomalies.length} anomalies`, {
        anomalyTypes: anomalies.map((a) => a.type),
      });
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
      checkedAt: now,
    };
  }

  // --------------------------------------------------------------------------
  // HTTP Handler
  // --------------------------------------------------------------------------

  /**
   * Handle GET /api/health and GET /api/metrics requests.
   */
  async handle(req: MonitoringApiRequest): Promise<MonitoringApiResponse> {
    const { method, path } = req;

    if (method === 'GET' && (path === '/api/health' || path === '/api/health/')) {
      return this.handleHealth();
    }

    if (method === 'GET' && (path === '/api/metrics' || path === '/api/metrics/')) {
      return this.handleMetrics();
    }

    return {
      statusCode: 404,
      body: { success: false, error: 'Route not found' },
    };
  }

  private handleHealth(): MonitoringApiResponse<SystemHealthResponse> {
    try {
      const health = this.getSystemHealth();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      return { statusCode, body: { success: true, data: health } };
    } catch {
      return {
        statusCode: 500,
        body: { success: false, error: 'Failed to compute health status' },
      };
    }
  }

  private handleMetrics(): MonitoringApiResponse<AllMetrics> {
    try {
      const metrics = this.collectMetrics();
      return { statusCode: 200, body: { success: true, data: metrics } };
    } catch {
      return {
        statusCode: 500,
        body: { success: false, error: 'Failed to collect metrics' },
      };
    }
  }

  // --------------------------------------------------------------------------
  // Alert integration helpers
  // --------------------------------------------------------------------------

  /**
   * Get all fired alerts from the underlying AlertService.
   */
  getAlertHistory(): readonly AlertEvent[] {
    return this.alerts.getHistory();
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a ProductionMonitoringService instance.
 */
export function createProductionMonitoringService(
  config?: Partial<ProductionMonitoringConfig>
): ProductionMonitoringService {
  return new ProductionMonitoringService(config);
}
