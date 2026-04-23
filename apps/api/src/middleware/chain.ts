/**
 * Middleware chain — wires all PR #320 middleware in the prescribed order.
 *
 * Order:
 *   1. Request ID / correlation ID (generated here)
 *   2. Security headers
 *   3. Body-size guard
 *   4. Request timeout
 *   5. Rate limiter
 *   6. CSRF validation
 *   7. Zod body validation (called per-route with a schema)
 *   8. XSS sanitization (called per-route after validation)
 */

import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import {
  getSecurityHeaders,
  isBodySizeAllowed,
  verifyCsrfToken,
  withTimeout,
  RequestTimeoutError,
} from '../../../../services/api/middleware/index.js';
import { createStandardRateLimit, createTradeRateLimit } from '../../../../services/api/middleware/rate-limit.js';
import type { AgentControlRequest } from '../../../../core/agents/control/index.js';

// ============================================================================
// Constants
// ============================================================================

/** Maximum request body size: 1 MiB */
const MAX_BODY_BYTES = 1_048_576;

/** Default request timeout: 30 seconds */
const REQUEST_TIMEOUT_MS = 30_000;

/** CSRF bypass: safe methods that do not mutate state */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// ============================================================================
// Rate limiters (shared across requests)
// ============================================================================

const standardLimiter = createStandardRateLimit();
const tradeLimiter = createTradeRateLimit();

// ============================================================================
// Helper: build a framework-agnostic request object from Fastify
// ============================================================================

export function toAgentControlRequest(req: FastifyRequest): AgentControlRequest {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k] = v;
    else if (Array.isArray(v)) headers[k] = v.join(', ');
  }
  return {
    method: req.method as AgentControlRequest['method'],
    path: req.url.split('?')[0],
    params: req.params as Record<string, string>,
    query: req.query as Record<string, string>,
    body: req.body,
    headers,
  };
}

// ============================================================================
// Plugin: registers all global middleware hooks
// ============================================================================

async function middlewareChainPlugin(app: FastifyInstance): Promise<void> {
  // ── 1. Correlation ID ──────────────────────────────────────────────────────
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const id =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    req.headers['x-request-id'] = id;
    reply.header('x-request-id', id);
  });

  // ── 2. Security headers ────────────────────────────────────────────────────
  app.addHook('onSend', async (_req: FastifyRequest, reply: FastifyReply, payload) => {
    const headers = getSecurityHeaders({
      enableHSTS: process.env['NODE_ENV'] === 'production',
    });
    for (const [k, v] of Object.entries(headers)) {
      reply.header(k, v);
    }
    return payload;
  });

  // ── 3. Body-size guard ─────────────────────────────────────────────────────
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers[k] = v;
    }
    if (!isBodySizeAllowed(headers, MAX_BODY_BYTES)) {
      return reply.code(413).send({
        success: false,
        error: 'Request body too large',
        code: 'BODY_TOO_LARGE',
      });
    }
  });

  // ── 4. Request timeout ─────────────────────────────────────────────────────
  // Implemented per-route via wrapWithTimeout helper (see below).
  // A global timeout is set via Fastify's connectionTimeout / requestTimeout
  // options in server.ts.

  // ── 5. Rate limiter ─────────────────────────────────────────────────────────
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const acReq = toAgentControlRequest(req);

    // Trade/mutation endpoints get the stricter limiter
    const isMutation = !SAFE_METHODS.has(req.method.toUpperCase());
    const limiter = isMutation ? tradeLimiter : standardLimiter;

    const limitResult = await limiter.check(acReq);
    if (limitResult) {
      reply.header('Retry-After', String((limitResult.body as { retryAfter?: number }).retryAfter ?? 60));
      return reply.code(429).send(limitResult.body);
    }
  });

  // ── 6. CSRF validation ─────────────────────────────────────────────────────
  //
  // Double-submit cookie pattern:
  //   1. Client reads csrf_token cookie (HttpOnly=false) issued by GET /healthz.
  //   2. Client echoes cookie value in X-CSRF-Token request header.
  //   3. Server verifies: header present, HMAC signature valid, not expired.
  //
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    if (SAFE_METHODS.has(req.method.toUpperCase())) return;

    // Skip CSRF on /healthz and /readyz (used by infrastructure probes)
    if (req.url.startsWith('/healthz') || req.url.startsWith('/readyz')) return;

    const csrfSecret = process.env['CSRF_SECRET'];
    if (!csrfSecret) {
      if (process.env['NODE_ENV'] === 'production') {
        return reply.code(403).send({
          success: false,
          error: 'CSRF_SECRET is not configured',
          code: 'CSRF_INVALID',
        });
      }
      // Dev mode: allow without token
      return;
    }

    const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
    const result = verifyCsrfToken(csrfHeader, csrfSecret);
    if (!result.valid) {
      const messages: Record<string, string> = {
        missing: 'Missing x-csrf-token header',
        malformed: 'Malformed CSRF token',
        expired: 'Expired CSRF token',
        signature_mismatch: 'Invalid CSRF token',
      };
      return reply.code(403).send({
        success: false,
        error: messages[result.reason ?? 'signature_mismatch'] ?? 'Invalid CSRF token',
        code: 'CSRF_INVALID',
      });
    }
  });
}

// Export as a fastify-plugin so its hooks are not encapsulated and apply to
// all routes registered in the parent scope (including routes/ plugins).
export const middlewareChain = fp(middlewareChainPlugin);

// ============================================================================
// Per-route timeout wrapper
// ============================================================================

/** Wrap a route handler with a request timeout. */
export async function wrapWithTimeout<T>(
  handler: () => Promise<T>,
  reply: FastifyReply,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T | void> {
  try {
    return await withTimeout(handler, timeoutMs);
  } catch (err: unknown) {
    if (err instanceof RequestTimeoutError) {
      await reply.code(504).send({
        success: false,
        error: 'Request timed out',
        code: 'REQUEST_TIMEOUT',
      });
      return;
    }
    throw err;
  }
}
