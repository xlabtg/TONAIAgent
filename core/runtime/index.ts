/**
 * TONAIAgent - Agent Execution Loop (Core Runtime Engine)
 * Issue #212: Agent Execution Loop (Core Runtime Engine)
 *
 * Production-ready runtime loop that continuously processes:
 * market data -> strategy signals -> risk validation -> trade execution -> portfolio updates
 *
 * Architecture:
 * ```
 *   Agent Manager
 *        ↓
 *   Agent Runtime (State Manager)
 *        ↓
 *   Execution Loop
 *        ↓
 *   ┌─────────────────────────────────────────┐
 *   │ 1. Fetch Market Data                    │
 *   │ 2. Execute Strategy                     │
 *   │ 3. Validate Risk                        │
 *   │ 4. Execute Trade                        │
 *   │ 5. Update Portfolio                     │
 *   │ 6. Update Metrics                       │
 *   └─────────────────────────────────────────┘
 *        ↓
 *   Scheduler (configurable intervals)
 *        ↓
 *   Runtime Monitor (telemetry & alerts)
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createAgentManager } from '@tonaiagent/core/runtime';
 *
 * // Create and start the manager
 * const manager = createAgentManager();
 * manager.start();
 *
 * // Create an agent
 * await manager.createAgent({
 *   agentId: 'agent-001',
 *   name: 'Momentum Bot',
 *   ownerId: 'user-123',
 *   strategyId: 'momentum',
 *   tradingPair: 'TON/USDT',
 *   interval: { value: 10, unit: 'seconds' },
 *   initialBalance: { USDT: 10000 },
 *   riskLimits: {
 *     maxPositionSizePercent: 5,
 *     maxPortfolioExposurePercent: 20,
 *     stopLossPercent: 10,
 *     maxDailyLossPercent: 3,
 *     maxTradesPerDay: 100,
 *   },
 *   simulationMode: true,
 * });
 *
 * // Start the agent
 * await manager.startAgent('agent-001');
 *
 * // Monitor agents
 * const telemetry = manager.getTelemetry();
 * console.log(`Running agents: ${telemetry.runningAgents}`);
 * console.log(`Total trades: ${telemetry.totalTrades}`);
 *
 * // Subscribe to events
 * manager.subscribe((event) => {
 *   if (event.type === 'trade.executed') {
 *     console.log('Trade executed:', event.data);
 *   }
 * });
 *
 * // Control agents
 * await manager.pauseAgent('agent-001');
 * await manager.resumeAgent('agent-001');
 * await manager.stopAgent('agent-001');
 *
 * // Shutdown
 * manager.stop();
 * ```
 *
 * ## Multi-Agent Support
 *
 * The runtime supports running multiple agents in parallel:
 *
 * ```typescript
 * // Create multiple agents
 * await manager.createAgent({ agentId: 'agent-001', strategyId: 'momentum', ... });
 * await manager.createAgent({ agentId: 'agent-002', strategyId: 'arbitrage', ... });
 * await manager.createAgent({ agentId: 'agent-003', strategyId: 'ai-signal', ... });
 *
 * // Start all agents
 * await manager.startAgent('agent-001');
 * await manager.startAgent('agent-002');
 * await manager.startAgent('agent-003');
 *
 * // Get all agent statuses
 * const statuses = manager.getAllAgentStatuses();
 * for (const status of statuses) {
 *   console.log(`${status.name}: ${status.state}, ROI: ${status.roi}%`);
 * }
 * ```
 *
 * ## Integration with Strategy Engine
 *
 * ```typescript
 * import { createAgentManager } from '@tonaiagent/core/runtime';
 * import { createStrategyExecutionEngine } from '@tonaiagent/core/strategy-engine';
 * import { createMarketDataService } from '@tonaiagent/core/market-data';
 *
 * // Create strategy engine
 * const strategyEngine = createStrategyExecutionEngine();
 * strategyEngine.start();
 *
 * // Create market data service
 * const marketDataService = createMarketDataService();
 * marketDataService.start();
 *
 * // Create agent manager with custom providers
 * const manager = createAgentManager({
 *   marketDataProvider: {
 *     getPrice: async (asset) => marketDataService.getPrice(asset),
 *     getSnapshot: async (assets) => marketDataService.getSnapshot(),
 *   },
 *   strategyExecutor: {
 *     execute: async (strategyId, marketData, params) => {
 *       const result = await strategyEngine.execute({
 *         strategyId,
 *         agentId: 'runtime',
 *         marketData,
 *         params,
 *       });
 *       return result.signal;
 *     },
 *   },
 * });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Agent State Types
  AgentState,
  ExecutionAction,
  ExecutionInterval,
  AgentRiskLimits,
  AgentConfig,
  AgentRuntimeState,
  // Execution Cycle Types
  TradeSignal,
  RiskValidationResult,
  RiskCheck,
  TradeRecord,
  ExecutionCycleResult,
  ExecutionStep,
  MarketDataSnapshot,
  AssetPrice,
  PortfolioUpdate,
  // Metrics Types
  AgentMetrics,
  // Scheduler Types
  ScheduledAgent,
  SchedulerConfig,
  // Monitor Types
  RuntimeTelemetry,
  AgentStatus,
  // Event Types
  RuntimeEventType,
  RuntimeEvent,
  RuntimeEventHandler,
  RuntimeUnsubscribe,
  // Error Types
  RuntimeErrorCode,
  // Configuration Types
  AgentManagerConfig,
} from './types';

export { RuntimeError } from './types';

// ============================================================================
// Agent State Manager
// ============================================================================

export { AgentStateManager, createAgentStateManager } from './agent-state';

// ============================================================================
// Execution Loop
// ============================================================================

export type {
  ExecutionLoopConfig,
  MarketDataProvider,
  StrategyExecutor,
  RiskValidator,
  TradeExecutor,
} from './execution-loop';

export {
  ExecutionLoop,
  createExecutionLoop,
  DEFAULT_EXECUTION_LOOP_CONFIG,
  DefaultMarketDataProvider,
  DefaultStrategyExecutor,
  DefaultRiskValidator,
  DefaultTradeExecutor,
} from './execution-loop';

// ============================================================================
// Agent Scheduler
// ============================================================================

export {
  AgentScheduler,
  createAgentScheduler,
  DEFAULT_SCHEDULER_CONFIG,
  intervalToMs,
  parseInterval,
} from './agent-scheduler';

// ============================================================================
// Runtime Monitor
// ============================================================================

export type { RuntimeMonitorConfig, RuntimeAlert, AlertHandler } from './runtime-monitor';

export {
  RuntimeMonitor,
  createRuntimeMonitor,
  DEFAULT_MONITOR_CONFIG,
} from './runtime-monitor';

// ============================================================================
// Agent Manager (Main Entry Point)
// ============================================================================

export {
  AgentManager,
  createAgentManager,
  DEFAULT_AGENT_MANAGER_CONFIG,
} from './agent-manager';
