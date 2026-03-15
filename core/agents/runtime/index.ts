/**
 * TONAIAgent - Agent Manager API Module
 *
 * Centralized API layer for managing AI agents, including:
 * - Agent creation and configuration
 * - Lifecycle management (start, pause, resume, stop, delete)
 * - Agent queries and status monitoring
 * - Event system for observability
 *
 * This module enables:
 * - Telegram Mini App integration
 * - Web dashboard
 * - CLI tools
 * - External integrations
 *
 * @example
 * ```typescript
 * import {
 *   createAgentManagerApi,
 *   AgentManagerApi,
 *   AgentManagerService,
 * } from '@tonaiagent/core/agents';
 *
 * // Create the API
 * const api = createAgentManagerApi();
 *
 * // Subscribe to events
 * const unsub = api.getService().subscribe((event) => {
 *   console.log(`[${event.type}] Agent: ${event.agent_id}`);
 * });
 *
 * // Create an agent
 * const createResult = await api.handle({
 *   method: 'POST',
 *   path: '/agents',
 *   body: {
 *     name: 'Momentum Trader',
 *     strategy: 'momentum',
 *     initial_balance: 10000,
 *     base_asset: 'USDT',
 *     pairs: ['TON/USDT'],
 *   },
 * });
 *
 * const agentId = createResult.body.data.agent_id;
 *
 * // Configure the agent
 * await api.handle({
 *   method: 'POST',
 *   path: `/agents/${agentId}/config`,
 *   body: {
 *     strategy_params: { lookback_period: 20, entry_threshold: 0.03 },
 *     risk_params: { max_position_size: 0.1, stop_loss: 0.05 },
 *   },
 * });
 *
 * // Start the agent
 * await api.handle({
 *   method: 'POST',
 *   path: `/agents/${agentId}/start`,
 * });
 *
 * // List all agents
 * const listResult = await api.handle({
 *   method: 'GET',
 *   path: '/agents',
 * });
 * console.log(`Total agents: ${listResult.body.data.total}`);
 *
 * // Get agent details
 * const detailsResult = await api.handle({
 *   method: 'GET',
 *   path: `/agents/${agentId}`,
 * });
 * console.log(`Status: ${detailsResult.body.data.status}`);
 *
 * // Pause the agent
 * await api.handle({
 *   method: 'POST',
 *   path: `/agents/${agentId}/pause`,
 * });
 *
 * // Resume the agent
 * await api.handle({
 *   method: 'POST',
 *   path: `/agents/${agentId}/resume`,
 * });
 *
 * // Stop the agent
 * await api.handle({
 *   method: 'POST',
 *   path: `/agents/${agentId}/stop`,
 * });
 *
 * // Delete the agent
 * await api.handle({
 *   method: 'DELETE',
 *   path: `/agents/${agentId}`,
 * });
 *
 * // Cleanup
 * unsub();
 * ```
 *
 * Implements Issue #213: Agent Manager API (Agent Lifecycle Management)
 */

// ============================================================================
// Type Exports
// ============================================================================

export * from './types';

// ============================================================================
// Storage Exports
// ============================================================================

export {
  InMemoryAgentStorage,
  createAgentStorage,
  createDemoAgentStorage,
  toAgentSummary,
} from './storage';

export type { AgentStorage } from './storage';

// ============================================================================
// Service Exports
// ============================================================================

export {
  AgentManagerService,
  createAgentManagerService,
  DEFAULT_AGENT_MANAGER_CONFIG,
} from './service';

// ============================================================================
// API Exports
// ============================================================================

export {
  AgentManagerApi,
  createAgentManagerApi,
  createAgentManagerApiWithConfig,
} from './api';
