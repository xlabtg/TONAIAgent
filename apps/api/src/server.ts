/**
 * HTTP server factory.
 *
 * Creates and configures a Fastify instance with the full middleware stack
 * and all routes registered. Kept separate from index.ts so it can be
 * imported by E2E tests without triggering the listen() call.
 */

import Fastify, { type FastifyError } from 'fastify';
import { middlewareChain } from './middleware/chain.js';
import { agentRoutes } from './routes/agents.js';
import { healthRoutes } from './routes/health.js';
import { metricsRoutes } from './routes/metrics.js';

export interface ServerOptions {
  /** Log level. Default: 'info'. Set to 'silent' in tests. */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
  /** Request timeout in milliseconds. Default: 30_000. */
  requestTimeout?: number;
}

export async function createServer(options: ServerOptions = {}) {
  const { logLevel = 'info', requestTimeout = 30_000 } = options;

  const app = Fastify({
    logger: logLevel === 'silent' ? false : { level: logLevel },
    requestTimeout,
    // Trust X-Forwarded-For from a reverse proxy (nginx / load balancer)
    trustProxy: true,
    // Enforce 1 MiB body limit at the framework level (mirrors the middleware check)
    bodyLimit: 1_048_576,
    // Return a structured error body on 4xx/5xx
    ajv: {
      customOptions: {
        removeAdditional: false,
        coerceTypes: false,
        allErrors: true,
      },
    },
  });

  // ── Global middleware ───────────────────────────────────────────────────────
  await app.register(middlewareChain);

  // ── Routes ──────────────────────────────────────────────────────────────────
  await app.register(healthRoutes);
  await app.register(metricsRoutes);
  await app.register(agentRoutes);

  // ── Global error handler ────────────────────────────────────────────────────
  app.setErrorHandler(async (error: FastifyError, _req, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      // eslint-disable-next-line no-console
      console.error('[server] Unhandled error:', error);
    }

    // Normalize Fastify's internal body-too-large error to our API error schema
    if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.code(413).send({
        success: false,
        error: 'Request body too large',
        code: 'BODY_TOO_LARGE',
      });
    }

    return reply.code(statusCode).send({
      success: false,
      error: statusCode >= 500 ? 'Internal server error' : error.message,
      code: 'OPERATION_FAILED',
    });
  });

  return app;
}
