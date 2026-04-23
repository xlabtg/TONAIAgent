/**
 * Metrics route — exposes Prometheus-compatible text format.
 *
 * GET /metrics
 *
 * Converts the in-process MetricsCollector snapshot to the standard
 * Prometheus text exposition format (version 0.0.4).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createMetricsCollector } from '../../../../services/observability/metrics.js';

// Application-level metrics collector (shared; callers import and update it)
export const appMetrics = createMetricsCollector();

// ── Route ────────────────────────────────────────────────────────────────────

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/metrics', async (_req: FastifyRequest, reply: FastifyReply) => {
    const snap = appMetrics.snapshot();
    const lines: string[] = [];

    function counter(name: string, help: string, value: number): void {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    }

    function gauge(name: string, help: string, value: number): void {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    }

    function histogram(
      name: string,
      help: string,
      count: number,
      sum: number,
    ): void {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_count ${count}`);
      lines.push(`${name}_sum ${sum}`);
    }

    // Trading
    counter(
      'tonaiagent_trade_total',
      'Total number of trades attempted',
      snap.trading.totalTrades,
    );
    counter(
      'tonaiagent_trade_success_total',
      'Total number of successful trades',
      snap.trading.successfulTrades,
    );
    counter(
      'tonaiagent_trade_failure_total',
      'Total number of failed trades',
      snap.trading.failedTrades,
    );
    gauge(
      'tonaiagent_trade_success_rate',
      'Trade success rate (0-100)',
      snap.trading.successRate,
    );
    gauge(
      'tonaiagent_avg_execution_time_ms',
      'Average trade execution time in milliseconds',
      snap.trading.avgExecutionTimeMs,
    );

    // Agents
    gauge(
      'tonaiagent_active_agents',
      'Number of currently active agents',
      snap.agents.activeAgents,
    );
    gauge(
      'tonaiagent_stopped_agents',
      'Number of stopped agents',
      snap.agents.stoppedAgents,
    );
    gauge(
      'tonaiagent_total_agents',
      'Total number of registered agents',
      snap.agents.totalAgents,
    );

    // System
    gauge(
      'tonaiagent_api_latency_avg_ms',
      'Average API request latency in milliseconds',
      snap.system.avgApiLatencyMs,
    );
    gauge(
      'tonaiagent_errors_per_sec',
      'API errors per second (1-second rolling window)',
      snap.system.errorsPerSec,
    );
    gauge(
      'tonaiagent_memory_usage_bytes',
      'Process heap memory usage in bytes',
      snap.system.memoryUsageBytes,
    );
    gauge(
      'tonaiagent_uptime_ms',
      'Process uptime in milliseconds',
      snap.system.uptimeMs,
    );

    // Marketplace
    gauge(
      'tonaiagent_marketplace_active_subscriptions',
      'Number of active marketplace strategy subscriptions',
      snap.marketplace.activeSubscriptions,
    );
    gauge(
      'tonaiagent_marketplace_total_revenue',
      'Total marketplace revenue in USD',
      snap.marketplace.totalRevenue,
    );

    return reply
      .code(200)
      .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      .send(lines.join('\n') + '\n');
  });
}
