/**
 * TONAIAgent — API Server Entry Point
 *
 * Initializes secrets and configuration before any business logic runs,
 * then starts the HTTP server.
 *
 * Startup order:
 *   1. initConfig() — loads secrets from backend, wires audit callback
 *   2. Compliance gate check (production only)
 *   3. HTTP server bind
 *   4. /readyz probe begins returning 200
 */

import http from 'http';
import { initConfig, appConfig } from '../../../config/index.js';
import { createLogger } from '../../../services/observability/logger.js';
import { assertComplianceGatesEnabled } from '../../../services/regulatory/compliance-flags.js';
import type { SecretAuditEvent } from '../../../config/secrets.types.js';
import { metricsHandler } from '../../../core/observability/prometheus-exporter.js';

const logger = createLogger('api-server');

// ============================================================================
// Readiness state
// ============================================================================

let secretsReady = false;

// ============================================================================
// Startup
// ============================================================================

async function main(): Promise<void> {
  // ---- 1. Load secrets and application config ----
  await initConfig({
    strictMode: process.env['NODE_ENV'] === 'production',
  });

  // Wire the secrets audit callback to the observability logger
  appConfig.secrets.onAudit((event: SecretAuditEvent) => {
    logger.debug('secret accessed', {
      key: event.secretKey,
      fromCache: event.fromCache,
      context: event.context,
      at: event.timestamp.toISOString(),
    });
  });

  secretsReady = true;

  // ---- 2. Compliance gate (production only) ----
  if (process.env['NODE_ENV'] === 'production') {
    const compliance = assertComplianceGatesEnabled();
    if (!compliance.ok) {
      logger.error(`FATAL: compliance gate check failed — ${compliance.message}`);
      process.exit(1);
    }
  }

  // ---- 3. Start HTTP server ----
  const port = appConfig.port;

  const server = http.createServer((req, res) => {
    // Readiness probe — checked by load balancers before sending traffic
    if (req.method === 'GET' && req.url === '/readyz') {
      const secretsHealth = appConfig.secrets.getHealth();

      if (!secretsReady || !secretsHealth.healthy) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'not_ready',
            secrets: secretsHealth,
          })
        );
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ready',
          secrets: secretsHealth,
        })
      );
      return;
    }

    // Liveness probe
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'alive' }));
      return;
    }

    // Prometheus metrics
    if (req.method === 'GET' && req.url === '/metrics') {
      void metricsHandler(req, res);
      return;
    }

    // All other routes — placeholder until full router is wired (issue #08)
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, () => {
    logger.info(`API server listening on port ${port}`, {
      nodeEnv: appConfig.nodeEnv,
      tonNetwork: appConfig.tonNetwork,
    });
  });

  // ---- 4. Graceful shutdown ----
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal} — shutting down`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  // Use console.error here because logger may not be initialized yet
  console.error(`[api-server] Fatal startup error: ${message}`);
  process.exit(1);
});
