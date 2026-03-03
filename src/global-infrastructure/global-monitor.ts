/**
 * TONAIAgent - Global Observability & Monitoring
 *
 * Real-time monitoring of the global edge fleet including health status,
 * latency tracking, uptime calculation, agent performance metrics, and
 * regional analytics. Provides the data backbone for the Global Dashboard.
 *
 * Issue #100: Global Infrastructure & Edge Deployment
 */

import type {
  GlobalHealthStatus,
  RegionHealthStatus,
  GlobalMetricsSummary,
  RegionMetrics,
  EdgeNodeMetrics,
  RegionCode,
  GlobalInfraEvent,
  GlobalInfraEventCallback,
} from './types';

import type { EdgeNodeRegistry } from './edge-node-registry';
import { REGION_ZONE_MAP } from './edge-node-registry';

// ============================================================================
// Global Monitor
// ============================================================================

export class GlobalMonitor {
  private readonly metricsSnapshots: GlobalMetricsSummary[] = [];
  private readonly uptimeTracker = new Map<RegionCode, { upSince: Date; downtimeMs: number }>();
  private readonly eventCallbacks: GlobalInfraEventCallback[] = [];
  private healthCheckIntervalId?: ReturnType<typeof setInterval>;
  private readonly HEALTH_CHECK_INTERVAL_MS = 15_000; // 15 seconds
  private readonly MAX_SNAPSHOTS = 5_760; // 24h of 15s intervals

  // Alert thresholds
  private readonly LATENCY_ALERT_MS = 100;
  private readonly UPTIME_ALERT_PCT = 99.9;

  constructor(private readonly registry: EdgeNodeRegistry) {}

  /**
   * Start the health monitoring loop.
   */
  start(): void {
    if (this.healthCheckIntervalId) return;
    this.healthCheckIntervalId = setInterval(() => {
      const status = this.computeGlobalHealth();
      this.checkHealthAlerts(status);
    }, this.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Stop the monitoring loop.
   */
  stop(): void {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = undefined;
    }
  }

  /**
   * Compute the current global health status.
   */
  computeGlobalHealth(): GlobalHealthStatus {
    const allNodes = this.registry.listNodes();
    const activeNodes = allNodes.filter((n) => n.status === 'active');
    const degradedNodes = allNodes.filter((n) => n.status === 'degraded');
    const offlineNodes = allNodes.filter((n) => n.status === 'offline');

    // Compute per-region status
    const regionCodes = [...new Set(allNodes.map((n) => n.region))];
    const regionStatus: Partial<Record<RegionCode, RegionHealthStatus>> = {};

    for (const region of regionCodes) {
      const regionNodes = allNodes.filter((n) => n.region === region);
      const activeRegionNodes = regionNodes.filter((n) => n.status === 'active');

      const avgLatency =
        activeRegionNodes.length > 0
          ? activeRegionNodes.reduce((s, n) => s + n.latencyMs, 0) /
            activeRegionNodes.length
          : 0;

      const totalAgents = activeRegionNodes.reduce(
        (s, n) => s + n.activeAgents, 0
      );

      const uptimeInfo = this.uptimeTracker.get(region);
      const uptimePct = uptimeInfo
        ? this.computeUptimePercent(uptimeInfo)
        : (activeRegionNodes.length > 0 ? 100 : 0);

      let regionHealthStatus: RegionHealthStatus['status'];
      if (activeRegionNodes.length === 0) {
        regionHealthStatus = 'offline';
      } else if (activeRegionNodes.length < regionNodes.length * 0.5) {
        regionHealthStatus = 'degraded';
      } else {
        regionHealthStatus = 'healthy';
      }

      regionStatus[region] = {
        region,
        zone: REGION_ZONE_MAP[region],
        status: regionHealthStatus,
        nodeCount: regionNodes.length,
        activeNodeCount: activeRegionNodes.length,
        p95LatencyMs: avgLatency * 1.5, // approximation
        activeAgents: totalAgents,
        uptimePercent: uptimePct,
        lastCheckedAt: new Date(),
      };
    }

    // Compute global P95 latency
    const globalP95 =
      activeNodes.length > 0
        ? activeNodes.reduce((s, n) => s + n.latencyMs, 0) / activeNodes.length * 1.5
        : 0;

    const totalActiveAgents = activeNodes.reduce(
      (s, n) => s + n.activeAgents, 0
    );

    // Determine overall status
    let overall: GlobalHealthStatus['overall'];
    if (offlineNodes.length > allNodes.length * 0.3) {
      overall = 'critical';
    } else if (
      degradedNodes.length > 0 ||
      offlineNodes.length > 0
    ) {
      overall = 'degraded';
    } else if (activeNodes.length < allNodes.length) {
      overall = 'partial_outage';
    } else {
      overall = 'healthy';
    }

    const globalUptimePct =
      activeNodes.length > 0
        ? (activeNodes.length / Math.max(1, allNodes.length)) * 100
        : 0;

    return {
      overall,
      totalNodes: allNodes.length,
      activeNodes: activeNodes.length,
      degradedNodes: degradedNodes.length,
      offlineNodes: offlineNodes.length,
      globalP95LatencyMs: Math.round(globalP95),
      globalUptimePercent: globalUptimePct,
      totalActiveAgents,
      regionStatus,
      lastUpdated: new Date(),
    };
  }

  /**
   * Record a batch of node metrics and aggregate a global snapshot.
   */
  recordNodeMetrics(nodeMetrics: EdgeNodeMetrics[]): void {
    // Register metrics with the registry
    for (const m of nodeMetrics) {
      try {
        this.registry.recordMetrics(m);
      } catch {
        // Node may have been deregistered
      }
    }

    // Build aggregated snapshot
    const snapshot = this.aggregateMetrics(nodeMetrics);
    this.metricsSnapshots.push(snapshot);
    if (this.metricsSnapshots.length > this.MAX_SNAPSHOTS) {
      this.metricsSnapshots.shift();
    }
  }

  /**
   * Get the latest global metrics summary.
   */
  getLatestSummary(): GlobalMetricsSummary | undefined {
    return this.metricsSnapshots.length > 0
      ? this.metricsSnapshots[this.metricsSnapshots.length - 1]
      : undefined;
  }

  /**
   * Get metrics snapshots for the given time period.
   */
  getMetricsHistory(period: '1m' | '5m' | '15m' | '1h' | '24h'): GlobalMetricsSummary[] {
    const periodMs: Record<string, number> = {
      '1m': 60_000,
      '5m': 5 * 60_000,
      '15m': 15 * 60_000,
      '1h': 60 * 60_000,
      '24h': 24 * 60 * 60_000,
    };
    const cutoff = new Date(Date.now() - (periodMs[period] ?? 60_000));
    return this.metricsSnapshots.filter((s) => s.timestamp >= cutoff);
  }

  /**
   * Track uptime status for a region.
   */
  trackRegionUptime(region: RegionCode, isUp: boolean): void {
    const existing = this.uptimeTracker.get(region);
    const now = new Date();

    if (!existing) {
      this.uptimeTracker.set(region, {
        upSince: now,
        downtimeMs: 0,
      });
      return;
    }

    if (!isUp) {
      // Accumulate downtime
      const elapsed = now.getTime() - existing.upSince.getTime();
      existing.downtimeMs += elapsed;
      existing.upSince = now;
    }
  }

  /**
   * Subscribe to monitoring events.
   */
  onEvent(callback: GlobalInfraEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private aggregateMetrics(nodeMetrics: EdgeNodeMetrics[]): GlobalMetricsSummary {
    const now = new Date();
    const byRegion: Partial<Record<RegionCode, RegionMetrics>> = {};
    let totalRequests = 0;
    let totalJobs = 0;
    let totalErrors = 0;
    let totalLatency = 0;
    let totalP99 = 0;
    let count = 0;

    for (const m of nodeMetrics) {
      const node = this.registry.getNode(m.nodeId);
      if (!node) continue;
      const region = node.region;

      totalRequests += m.requestsPerSecond;
      totalJobs += m.jobsExecutedLastMinute;
      totalErrors += m.errorRate * m.requestsPerSecond;
      totalLatency += m.p50LatencyMs;
      totalP99 += m.p99LatencyMs;
      count++;

      if (!byRegion[region]) {
        byRegion[region] = {
          region,
          requests: 0,
          jobsExecuted: 0,
          errorRate: 0,
          avgLatencyMs: 0,
          p95LatencyMs: 0,
          activeAgents: 0,
          computeUnitsUsed: 0,
        };
      }
      const regionMetrics = byRegion[region]!;
      regionMetrics.requests += m.requestsPerSecond;
      regionMetrics.jobsExecuted += m.jobsExecutedLastMinute;
      regionMetrics.errorRate = (regionMetrics.errorRate + m.errorRate) / 2;
      regionMetrics.avgLatencyMs = (regionMetrics.avgLatencyMs + m.p50LatencyMs) / 2;
      regionMetrics.p95LatencyMs = (regionMetrics.p95LatencyMs + m.p95LatencyMs) / 2;
      regionMetrics.activeAgents += m.activeAgents;
      regionMetrics.computeUnitsUsed += Math.round(m.cpuPercent);
    }

    const globalErrorRate = count > 0 ? totalErrors / Math.max(1, totalRequests) : 0;
    const avgLatencyMs = count > 0 ? totalLatency / count : 0;
    const p99LatencyMs = count > 0 ? totalP99 / count : 0;

    return {
      timestamp: now,
      period: '1m',
      totalRequests,
      totalJobsExecuted: totalJobs,
      globalErrorRate,
      avgLatencyMs: Math.round(avgLatencyMs),
      p99LatencyMs: Math.round(p99LatencyMs),
      byRegion,
    };
  }

  private computeUptimePercent(info: { upSince: Date; downtimeMs: number }): number {
    const totalMs = Date.now() - info.upSince.getTime() + info.downtimeMs;
    if (totalMs <= 0) return 100;
    const uptimePct = (1 - info.downtimeMs / totalMs) * 100;
    return Math.max(0, Math.min(100, uptimePct));
  }

  private checkHealthAlerts(status: GlobalHealthStatus): void {
    // Alert on high global latency
    if (status.globalP95LatencyMs > this.LATENCY_ALERT_MS) {
      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'health_check_failed',
        severity: 'warning',
        message:
          `Global P95 latency ${status.globalP95LatencyMs}ms exceeds ` +
          `${this.LATENCY_ALERT_MS}ms threshold`,
        data: { p95LatencyMs: status.globalP95LatencyMs },
      });
    }

    // Alert on low uptime
    if (status.globalUptimePercent < this.UPTIME_ALERT_PCT) {
      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'health_check_failed',
        severity: 'error',
        message:
          `Global uptime ${status.globalUptimePercent.toFixed(2)}% is below ` +
          `${this.UPTIME_ALERT_PCT}% target`,
        data: { uptimePercent: status.globalUptimePercent },
      });
    }

    // Alert on offline nodes
    if (status.offlineNodes > 0) {
      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'node_offline',
        severity: status.offlineNodes > 3 ? 'critical' : 'warning',
        message: `${status.offlineNodes} edge node(s) are offline`,
        data: { offlineCount: status.offlineNodes },
      });
    }
  }

  private emitEvent(event: GlobalInfraEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore
      }
    }
  }
}

export function createGlobalMonitor(registry: EdgeNodeRegistry): GlobalMonitor {
  return new GlobalMonitor(registry);
}
