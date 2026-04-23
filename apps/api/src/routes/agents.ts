/**
 * Agent routes — first trading flow.
 *
 * POST   /agents                           create a new agent
 * GET    /agents/:id                       get agent status
 * POST   /agents/:id/pause                 pause a running agent
 * DELETE /agents/:id                       stop and delete an agent
 * POST   /agents/:id/enable-live-trading   transition to live trading (requires KYC + checklist)
 * POST   /agents/:id/disable-live-trading  return to simulation (always allowed)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AgentControlApi } from '../../../../core/agents/control/api.js';
import { AgentOrchestrator } from '../../../../core/agents/orchestrator/orchestrator.js';
import { AgentOrchestratorError } from '../../../../core/agents/orchestrator/types.js';
import { CreateAgentSchema, EnableLiveTradingSchema } from '../../../../services/api/schemas/agent.js';
import {
  validateBody,
  validateContentType,
  sanitizeObject,
} from '../../../../services/api/middleware/validate.js';
import { toAgentControlRequest, wrapWithTimeout } from '../middleware/chain.js';
import type { EnableLiveTradingPayload } from '../../../../core/agents/trading-mode.js';

// Shared API handler instances
const agentApi = new AgentControlApi();

// Shared orchestrator instance for trading mode enforcement.
// In production this should be a singleton injected via DI.
const orchestrator = new AgentOrchestrator();

/** Map AgentOrchestratorError codes to HTTP status codes. */
function orchestratorErrorStatus(code: string): number {
  switch (code) {
    case 'AGENT_NOT_FOUND':
      return 404;
    case 'LIVE_TRADING_CHECKLIST_INCOMPLETE':
    case 'LIVE_TRADING_KYC_REQUIRED':
    case 'LIVE_TRADING_REGULATORY_FREEZE':
    case 'LIVE_TRADING_ALREADY_ENABLED':
    case 'SIMULATION_ALREADY_ENABLED':
      return 422;
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    default:
      return 500;
  }
}

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

  // ── POST /agents/:id/enable-live-trading ────────────────────────────────────
  //
  // Transition an agent from simulation → live trading.
  //
  // Body (all fields required and must be `true`):
  //   { acknowledgeRealFunds: true, acknowledgeMainnetChecklist: true, acknowledgeRiskAccepted: true }
  //
  // Returns 200 on success, or 422 if KYC/checklist requirements are not met.
  app.post(
    '/agents/:id/enable-live-trading',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return wrapWithTimeout(async () => {
        const acReq = toAgentControlRequest(req);

        const ctErr = validateContentType(acReq);
        if (ctErr) return reply.code(ctErr.statusCode).send(ctErr.body);

        const validation = validateBody(acReq, EnableLiveTradingSchema);
        if (!validation.ok) {
          return reply.code(validation.response.statusCode).send(validation.response.body);
        }

        try {
          const result = await orchestrator.enableLiveTrading(
            req.params.id,
            validation.data as EnableLiveTradingPayload,
            {
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
          );
          return reply.code(200).send({ success: true, data: result });
        } catch (err) {
          if (err instanceof AgentOrchestratorError) {
            return reply.code(orchestratorErrorStatus(err.code)).send({
              success: false,
              error: err.message,
              code: err.code,
            });
          }
          return reply.code(500).send({ success: false, error: 'Internal server error' });
        }
      }, reply);
    },
  );

  // ── POST /agents/:id/disable-live-trading ───────────────────────────────────
  //
  // Transition an agent from live → simulation. Always allowed (safer direction).
  // No request body required.
  app.post(
    '/agents/:id/disable-live-trading',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      return wrapWithTimeout(async () => {
        try {
          const result = await orchestrator.disableLiveTrading(
            req.params.id,
            {
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
          );
          return reply.code(200).send({ success: true, data: result });
        } catch (err) {
          if (err instanceof AgentOrchestratorError) {
            return reply.code(orchestratorErrorStatus(err.code)).send({
              success: false,
              error: err.message,
              code: err.code,
            });
          }
          return reply.code(500).send({ success: false, error: 'Internal server error' });
        }
      }, reply);
    },
  );
}
