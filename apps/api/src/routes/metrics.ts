/**
 * Metrics route — exposes Prometheus text format via prom-client.
 *
 * GET /metrics
 *
 * Serialises the central Prometheus registry (core/observability/metrics.ts)
 * to the standard text exposition format (version 0.0.4).
 *
 * Implements Issue #353: Wire CircuitBreakerMetrics and Add Prometheus Exporter
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registry } from '../../../../core/observability/metrics.js';

// ── Route ────────────────────────────────────────────────────────────────────

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/metrics', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = await registry.metrics();
      return reply
        .code(200)
        .header('Content-Type', registry.contentType)
        .send(metrics);
    } catch {
      return reply
        .code(500)
        .header('Content-Type', 'text/plain')
        .send('# Error collecting metrics\n');
    }
  });
}
