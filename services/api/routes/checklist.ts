/**
 * Checklist routes — mainnet readiness checklist enforcement.
 *
 * GET  /users/me/checklist              — return the user's per-item status
 * POST /users/me/checklist/:id/acknowledge — attest a single checklist item
 *
 * Issue #363: Gate Live Trading on Mainnet Readiness Checklist Completion
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  getChecklistStatusManager,
} from '../../../core/user/checklist-status.js';
import {
  validateBody,
  validateContentType,
} from '../middleware/validate.js';
import { withTimeout, RequestTimeoutError } from '../middleware/index.js';

// ── Timeout helper (mirrors apps/api/src/middleware/chain.ts) ───────────────
const REQUEST_TIMEOUT_MS = 30_000;

async function wrapWithTimeout<T>(
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

// ============================================================================
// Schemas
// ============================================================================

const AcknowledgeItemSchema = z.object({
  // No required body fields; userId comes from the authenticated session.
  // Optional: allow the client to echo the checklist version it is working
  // with to detect races when the checklist is updated mid-session.
  expectedVersion: z.string().optional(),
});

// ============================================================================
// Route helpers
// ============================================================================

function getUserId(req: FastifyRequest): string | undefined {
  // In production this would be extracted from the verified session/JWT.
  // For now we accept it from the x-user-id header (set by auth middleware).
  return (req.headers['x-user-id'] as string | undefined)?.trim() || undefined;
}

function getClientIp(req: FastifyRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress;
}

// ============================================================================
// Routes
// ============================================================================

export async function checklistRoutes(app: FastifyInstance): Promise<void> {
  const manager = getChecklistStatusManager();

  // ── GET /users/me/checklist ─────────────────────────────────────────────────
  app.get('/users/me/checklist', async (req: FastifyRequest, reply: FastifyReply) => {
    return wrapWithTimeout(async () => {
      const userId = getUserId(req);
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHENTICATED',
        });
      }

      const status = manager.getStatus(userId);
      return reply.code(200).send({ success: true, data: status });
    }, reply);
  });

  // ── POST /users/me/checklist/:id/acknowledge ────────────────────────────────
  app.post(
    '/users/me/checklist/:id/acknowledge',
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      return wrapWithTimeout(async () => {
        const userId = getUserId(req);
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHENTICATED',
          });
        }

        // Validate content-type for POST
        const ctReq = {
          method: req.method as 'POST',
          path: req.url,
          headers: req.headers as Record<string, string>,
          body: req.body,
          params: req.params as Record<string, string>,
          query: req.query as Record<string, string>,
        };
        const ctErr = validateContentType(ctReq);
        if (ctErr) return reply.code(ctErr.statusCode).send(ctErr.body);

        // Validate optional body
        const validation = validateBody(ctReq, AcknowledgeItemSchema);
        if (!validation.ok) {
          return reply.code(validation.response.statusCode).send(validation.response.body);
        }

        const { expectedVersion } = validation.data;
        const itemId = req.params.id;

        // Version race detection
        if (expectedVersion && expectedVersion !== manager.getVersion()) {
          return reply.code(409).send({
            success: false,
            error: 'Checklist version mismatch — please refresh the checklist and re-acknowledge',
            code: 'CHECKLIST_VERSION_MISMATCH',
            data: {
              serverVersion: manager.getVersion(),
              clientVersion: expectedVersion,
            },
          });
        }

        let record;
        try {
          record = manager.acknowledge(userId, itemId, {
            ipAddress: getClientIp(req),
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.message.startsWith('Unknown checklist item')) {
            return reply.code(404).send({
              success: false,
              error: err.message,
              code: 'CHECKLIST_ITEM_NOT_FOUND',
            });
          }
          throw err;
        }

        // Return updated status so the client can refresh its UI in one round-trip
        const status = manager.getStatus(userId);
        return reply.code(200).send({
          success: true,
          data: {
            acknowledgement: record,
            checklistStatus: status,
          },
        });
      }, reply);
    },
  );

  // ── GET /users/me/checklist/gate ────────────────────────────────────────────
  // Explicit gate check — returns whether the user may enable live trading.
  // Used by the simulation → live transition endpoint before allowing the switch.
  app.get(
    '/users/me/checklist/gate',
    async (req: FastifyRequest, reply: FastifyReply) => {
      return wrapWithTimeout(async () => {
        const userId = getUserId(req);
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHENTICATED',
          });
        }

        const result = manager.checkLiveTradingGate(userId);
        if (result.allowed) {
          return reply.code(200).send({ success: true, data: { allowed: true } });
        }

        // 403 when the gate is blocked — not an authentication failure
        return reply.code(403).send({
          success: false,
          error: result.reason === 'version_mismatch'
            ? 'Checklist re-acknowledgement required after update'
            : 'Mandatory checklist items not yet acknowledged',
          code: 'CHECKLIST_GATE_BLOCKED',
          data: result,
        });
      }, reply);
    },
  );
}
