/**
 * TONAIAgent - Agent Control API
 *
 * Public exports for the Agent Control API module (Issue #185).
 *
 * Usage:
 *   import { AgentControlApi, AgentManager, AgentRegistry } from './agent-control';
 */

export * from './types';
export { AgentRegistry, createDemoRegistry } from './registry';
export type { AgentRecord } from './registry';
export {
  AgentManager,
  createAgentManager,
  DEFAULT_AGENT_CONTROL_CONFIG,
} from './manager';
export {
  AgentControlApi,
  createAgentControlApi,
  createAgentControlApiWithConfig,
} from './api';
