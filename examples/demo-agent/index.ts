/**
 * TONAIAgent - Demo Agent Module
 *
 * MVP Demo Agent: an autonomous TON strategy execution engine.
 *
 * Implements Issue #83 — MVP Demo Agent (Autonomous TON Strategy Engine):
 *   - Four demo strategies: DCA, Yield, Grid, Arbitrage
 *   - 9-step autonomous execution cycle
 *   - Simulation mode with virtual balances, PnL tracking, trade history
 *   - Risk controls: stop-loss, max drawdown, kill switch, auto-pause
 *   - REST API endpoints: create, start, pause, status, metrics, history
 *   - Event system for Telegram Mini App integration
 *
 * @example
 * ```typescript
 * import { createDemoAgentManager, createDemoAgentApi } from '@tonaiagent/core/demo-agent';
 *
 * // Create service
 * const service = createDemoAgentManager();
 *
 * // Create API layer
 * const api = createDemoAgentApi(service);
 *
 * // Create a DCA agent
 * const agent = await service.createAgent({
 *   userId: 'telegram_user_123',
 *   config: {
 *     name: 'My DCA Agent',
 *     budget: 100,
 *     riskLevel: 'medium',
 *     strategy: 'dca',
 *     executionMode: 'simulation',
 *     stopLoss: 5,
 *     maxDrawdown: 10,
 *     executionIntervalMs: 60_000,
 *   },
 * });
 *
 * // Start the agent
 * await service.startAgent(agent.id);
 *
 * // Get status
 * const status = service.getAgentStatus(agent.id);
 * console.log('ROI:', status.balance.roi, '%');
 *
 * // Subscribe to events (for Telegram notifications)
 * service.onEvent((event) => {
 *   if (event.type === 'trade_executed') {
 *     console.log('Trade executed:', event.data);
 *   }
 * });
 * ```
 */

// Export all types
export * from './types';

// Export strategies
export {
  dcaStrategy,
  yieldStrategy,
  gridStrategy,
  arbitrageStrategy,
  getStrategy,
  STRATEGY_METADATA,
  type StrategyContext,
  type StrategyFn,
  type GridState,
} from './strategies';

// Export simulation engine
export {
  MarketSimulator,
  SimulationBalanceManager,
  createMarketSimulator,
  createSimulationBalanceManager,
} from './simulation';

// Export risk manager
export {
  RiskManager,
  createRiskManager,
} from './risk';

// Export agent runtime
export {
  DemoAgentManager,
  createDemoAgentManager,
} from './agent';

// Export API layer
export {
  DemoAgentApi,
  createDemoAgentApi,
  type ApiRequest,
  type ApiResponse,
  type ApiResponseBody,
} from './api';

// ============================================================================
// Default Export — Convenience Factory
// ============================================================================

import { DemoAgentManager, createDemoAgentManager } from './agent';
import { createDemoAgentApi } from './api';
import type { DemoAgentEventCallback } from './types';

/**
 * DemoAgentService — unified entry point that bundles the manager and API.
 */
export interface DemoAgentBundle {
  /** Service layer — direct TypeScript API */
  service: DemoAgentManager;
  /** HTTP API layer — framework-agnostic request handler */
  api: ReturnType<typeof createDemoAgentApi>;
  /** Subscribe to agent events */
  onEvent: (callback: DemoAgentEventCallback) => void;
}

/**
 * Create the full Demo Agent bundle (service + API)
 *
 * @example
 * ```typescript
 * const { service, api, onEvent } = createDemoAgentBundle();
 * onEvent((e) => console.log(e.type, e.data));
 * ```
 */
export function createDemoAgentBundle(): DemoAgentBundle {
  const service = createDemoAgentManager();
  const api = createDemoAgentApi(service);

  return {
    service,
    api,
    onEvent: (callback) => service.onEvent(callback),
  };
}

export default DemoAgentManager;
