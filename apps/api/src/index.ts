/**
 * TONAIAgent — API Server Entry Point
 *
 * Startup order:
 *   1. initConfig() — loads secrets from backend, wires audit callback
 *   2. Compliance gate check (production only)
 *   3. HTTP server bind (Fastify with full middleware stack)
 *   4. /readyz probe begins returning 200
 */

import { initConfig, appConfig } from '../../../config/index.js';
import { createServer } from './server.js';
import type { SecretAuditEvent } from '../../../config/secrets.types.js';
import { assertComplianceGatesEnabled } from '../../../services/regulatory/compliance-flags.js';
import { createLogger } from '../../../services/observability/logger.js';

const logger = createLogger('api-server');

const HOST = process.env['HOST'] ?? '0.0.0.0';
const LOG_LEVEL = (process.env['LOG_LEVEL'] ?? 'info') as
  | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

async function main(): Promise<void> {
  // ── 1. Load secrets and application config ──────────────────────────────────
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

  // ── 2. Compliance gate (production only) ────────────────────────────────────
  if (process.env['NODE_ENV'] === 'production') {
    const compliance = assertComplianceGatesEnabled();
    if (!compliance.ok) {
      logger.error(`FATAL: compliance gate check failed — ${compliance.message}`);
      process.exit(1);
    }
  }

  // ── 3. Build and start Fastify HTTP server ──────────────────────────────────
  const port = parseInt(process.env['PORT'] ?? String(appConfig.port ?? 3000), 10);
  const app = await createServer({ logLevel: LOG_LEVEL });

  await app.listen({ port, host: HOST });
  logger.info(`API server listening on http://${HOST}:${port}`, {
    nodeEnv: appConfig.nodeEnv,
    tonNetwork: appConfig.tonNetwork,
  });

  // ── 4. Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — shutting down`);
    await app.close();
    logger.info('HTTP server closed');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[api-server] Fatal startup error: ${message}`);
  process.exit(1);
});
