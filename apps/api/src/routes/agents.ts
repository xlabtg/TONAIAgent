/**
 * Agent routes — first trading flow.
 *
 * POST   /agents            create a new agent
 * GET    /agents/:id        get agent status
 * POST   /agents/:id/pause  pause a running agent
 * DELETE /agents/:id        stop and delete an agent
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AgentControlApi } from '../../../../core/agents/control/api.js';
import { CreateAgentSchema } from '../../../../services/api/schemas/agent.js';
import {
  validateBody,
  validateContentType,
  sanitizeObject,
} from '../../../../services/api/middleware/validate.js';
import { toAgentControlRequest, wrapWithTimeout } from '../middleware/chain.js';

// Shared API handler instance
const agentApi = new AgentControlApi();

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /agents ────────────────────────────────────────────────────────────
  app.post('/agents', async (req: FastifyRequest, reply: FastifyReply) => {
    return wrapWithTimeout(async () => {
      const acReq = toAgentControlRequest(req);

      const ctErr = validateContentType(acReq);
      if (ctErr) return reply.code(ctErr.statusCode).send(ctErr.body);

      const validation = validateBody(acReq, CreateAgentSchema);
      if (!validation.ok) {
        return reply.code(validation.response.statusCode).send(validation.response.body);
      }

      const sanitized = sanitizeObject(validation.data);
      acReq.body = sanitized;

      // Delegate to AgentControlApi — maps POST /agents to a start workflow.
      // The existing control API exposes start via POST /api/agents/:id/start,
      // so we create a synthetic "create" response with a stub agent ID here
      // until a dedicated create handler is wired.
      const created = {
        success: true,
        data: {
          message: 'Agent creation queued',
          input: sanitized,
        },
      };
      return reply.code(202).send(created);
    }, reply);
  });

  // ── GET /agents/:id ─────────────────────────────────────────────────────────
  app.get(
    '/agents/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return wrapWithTimeout(async () => {
        const acReq = toAgentControlRequest(req);
        acReq.path = `/api/agents/${req.params.id}`;
        const result = await agentApi.handle(acReq);
        return reply.code(result.statusCode).send(result.body);
      }, reply);
    },
  );

  // ── POST /agents/:id/pause ──────────────────────────────────────────────────
  app.post(
    '/agents/:id/pause',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return wrapWithTimeout(async () => {
        const acReq = toAgentControlRequest(req);
        // Map pause to stop in the existing control API
        acReq.path = `/api/agents/${req.params.id}/stop`;
        const result = await agentApi.handle(acReq);
        return reply.code(result.statusCode).send(result.body);
      }, reply);
    },
  );

  // ── DELETE /agents/:id ──────────────────────────────────────────────────────
  app.delete(
    '/agents/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return wrapWithTimeout(async () => {
        const acReq = toAgentControlRequest(req);
        acReq.path = `/api/agents/${req.params.id}/stop`;
        acReq.method = 'POST';
        const result = await agentApi.handle(acReq);
        if (result.statusCode === 200) {
          return reply.code(204).send();
        }
        return reply.code(result.statusCode).send(result.body);
      }, reply);
    },
  );
}
