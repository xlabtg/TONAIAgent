/**
 * TONAIAgent - Agent Runtime Orchestrator Module
 *
 * Core runtime infrastructure bridging AI decision-making with on-chain
 * execution on the TON blockchain. This module implements:
 *
 * - **Agent Lifecycle Management**: Full state machine from Created → Funded →
 *   Active ↔ Paused → Suspended | Migrated | Terminated
 * - **9-Step Execution Pipeline**: fetch_data → load_memory → call_ai →
 *   validate_risk → generate_plan → simulate_tx → execute_onchain →
 *   record_outcome → update_analytics
 * - **Simulation Mode**: Fake balances, mock execution, historical data replay —
 *   critical for safe MVP testing without real funds
 * - **Risk Controls**: Per-execution and daily limits, emergency suspension on
 *   consecutive failures
 * - **Observability**: Structured JSON logging and metrics collection
 * - **Event System**: Subscribe to all lifecycle and pipeline events
 *
 * @example
 * ```typescript
 * import {
 *   createAgentRuntimeOrchestrator,
 *   AgentRuntimeOrchestrator,
 * } from '@tonaiagent/core/agent-runtime';
 *
 * // Create and start the runtime
 * const runtime = createAgentRuntimeOrchestrator({
 *   observability: { enableLogging: true, logLevel: 'info' },
 * });
 * runtime.start();
 *
 * // Subscribe to events
 * const unsub = runtime.subscribe((event) => {
 *   console.log(`[${event.type}]`, event.data);
 * });
 *
 * // Register an agent in simulation mode
 * runtime.registerAgent({
 *   agentId: 'agent-001',
 *   name: 'DCA Bot',
 *   ownerId: 'telegram_user_123',
 *   ownerAddress: 'EQD...',
 *   strategyIds: ['dca-strategy-1'],
 *   simulation: {
 *     enabled: true,
 *     fakeBalance: BigInt(10_000_000_000), // 10 TON simulated
 *   },
 *   riskLimits: {
 *     maxLossPerExecutionNano: BigInt(1_000_000_000),
 *     maxDailyLossNano: BigInt(5_000_000_000),
 *     maxDailyGasBudgetNano: BigInt(500_000_000),
 *     maxTransactionSizeNano: BigInt(2_000_000_000),
 *     maxTransactionsPerDay: 100,
 *     maxConsecutiveFailures: 3,
 *   },
 *   maxConcurrentExecutions: 2,
 *   enableObservability: true,
 * });
 *
 * // Fund and start the agent
 * runtime.fundAgent('agent-001', BigInt(5_000_000_000));
 * await runtime.startAgent('agent-001');
 *
 * // Run a full pipeline execution
 * const result = await runtime.runPipeline('agent-001', 'dca-strategy-1');
 * console.log('Pipeline success:', result.success);
 * console.log('Steps:', result.steps.map(s => `${s.step}:${s.status}`).join(' -> '));
 *
 * // Pause, resume, terminate
 * runtime.pauseAgent('agent-001');
 * runtime.resumeAgent('agent-001');
 * runtime.terminateAgent('agent-001');
 *
 * // Check health and metrics
 * const health = runtime.getHealth();
 * const metrics = runtime.getMetrics();
 *
 * // Cleanup
 * unsub();
 * runtime.stop();
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export * from './types';

// ============================================================================
// Orchestrator Exports
// ============================================================================

export {
  AgentRuntimeOrchestrator,
  createAgentRuntimeOrchestrator,
  DEFAULT_RUNTIME_CONFIG,
} from './orchestrator';
