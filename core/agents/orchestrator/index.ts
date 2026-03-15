/**
 * TONAIAgent - One-Click Agent Creation Orchestrator Module
 *
 * Implements Issue #91: "Implement One-Click Agent Creation API"
 *
 * A single orchestration layer that transforms the platform from a collection
 * of modules into a cohesive product. One call provisions everything:
 * runtime, wallet, Telegram bot, strategy, persistence, and security.
 *
 * @example
 * ```typescript
 * import { createAgentOrchestrator } from '@tonaiagent/core/agent-orchestrator';
 *
 * const orchestrator = createAgentOrchestrator();
 *
 * // One-click agent creation
 * const result = await orchestrator.createAgent({
 *   userId: "user_123",
 *   strategy: "trading",
 *   telegram: true,
 *   tonWallet: true,
 *   environment: "demo"
 * });
 *
 * console.log(result.agentId);       // "agent_abc"
 * console.log(result.telegramBot);   // "@MyAIAgentBot"
 * console.log(result.walletAddress); // "EQC..."
 * console.log(result.status);        // "active"
 * ```
 *
 * @example
 * ```typescript
 * import { createAgentOrchestratorApi } from '@tonaiagent/core/agent-orchestrator';
 *
 * // Framework-agnostic REST API (POST /agents)
 * const api = createAgentOrchestratorApi();
 *
 * // With Express:
 * app.post('/agents', async (req, res) => {
 *   const result = await api.handle({
 *     method: 'POST',
 *     path: '/agents',
 *     body: req.body
 *   });
 *   res.status(result.status).json(result.body);
 * });
 *
 * // With Hono/Bun or any other framework — same pattern.
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Input / Output
  CreateAgentInput,
  CreateAgentResult,
  // Agent data
  AgentMetadata,
  AgentStatus,
  AgentStrategy,
  AgentEnvironment,
  AgentProvisioningSummary,
  SubsystemResult,
  // Configuration
  AgentOrchestratorConfig,
  OrchestratorSecurityConfig,
  // Health & Metrics
  OrchestratorHealth,
  OrchestratorMetrics,
  // Events
  OrchestratorEvent,
  OrchestratorEventType,
  OrchestratorEventHandler,
  OrchestratorUnsubscribe,
  // API
  OrchestratorApiRequest,
  OrchestratorApiResponse,
} from './types';

export { AgentOrchestratorError } from './types';
export type { AgentOrchestratorErrorCode } from './types';

// ============================================================================
// Orchestrator Exports
// ============================================================================

export {
  AgentOrchestrator,
  createAgentOrchestrator,
  DEFAULT_ORCHESTRATOR_CONFIG,
} from './orchestrator';

// ============================================================================
// API Exports
// ============================================================================

export {
  AgentOrchestratorApi,
  createAgentOrchestratorApi,
} from './api';
