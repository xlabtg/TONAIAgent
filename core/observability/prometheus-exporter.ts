/**
 * TONAIAgent - Prometheus Metrics Exporter
 *
 * Provides a handler that serialises the central registry to the Prometheus
 * text format, ready to be mounted at GET /metrics in the HTTP server.
 *
 * Implements Issue #353: Wire CircuitBreakerMetrics and Add Prometheus Exporter
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { registry } from './metrics.js';

/**
 * Node.js http.RequestListener that responds with the Prometheus text exposition.
 *
 * Mount in an http.createServer handler:
 *   if (req.method === 'GET' && req.url === '/metrics') {
 *     return metricsHandler(req, res);
 *   }
 */
export async function metricsHandler(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const metrics = await registry.metrics();
    res.writeHead(200, { 'Content-Type': registry.contentType });
    res.end(metrics);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('# Error collecting metrics\n');
  }
}
