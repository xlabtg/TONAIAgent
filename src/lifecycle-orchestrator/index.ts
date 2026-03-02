/**
 * TONAIAgent - Agent Lifecycle Cloud Orchestrator Module
 *
 * Implements Issue #92: "Agent Lifecycle Cloud Orchestrator"
 *
 * Cloud-native orchestration layer that manages the full lifecycle of autonomous
 * agents at scale. Builds on the One-Click Agent Creation API (Issue #91) and
 * provides the core control plane of the TON AI platform.
 *
 * Architecture:
 * ```
 *               Control Plane
 *                   ↓
 * -----------------------------------------
 * | Lifecycle Manager (state machine)      |
 * | Scheduler (cron / event / on-chain)    |
 * | Runtime Allocator (resources / cost)   |
 * | Health Monitor (metrics / anomalies)   |
 * | Scaling Engine (auto-scale / policies) |
 * | Governance Engine (audit / compliance) |
 * | Alerting Engine (alerts / auto-stop)   |
 * | Migration Support (upgrade / migrate)  |
 * -----------------------------------------
 *                   ↓
 *           Agent Runtime Nodes
 * ```
 *
 * @example
 * ```typescript
 * import { createLifecycleOrchestrator } from '@tonaiagent/core/lifecycle-orchestrator';
 *
 * const orchestrator = createLifecycleOrchestrator({
 *   defaultResourceTier: 'standard',
 *   autoPauseRiskThreshold: 75,
 * });
 *
 * // Register an agent (from One-Click Agent Creation API — Issue #91)
 * const { record } = await orchestrator.registerAgent({
 *   agentId: "agent_abc",
 *   agentName: "My Trader",
 *   userId: "user_123",
 *   environment: "demo",
 *   autoActivate: true,
 * });
 *
 * // Move agent to running state
 * await orchestrator.transitionState({
 *   agentId: "agent_abc",
 *   targetState: "running",
 *   requestedBy: "user_123",
 *   reason: "User activated agent",
 * });
 *
 * // Schedule a cron job (every 5 minutes)
 * orchestrator.scheduleJob({
 *   agentId: "agent_abc",
 *   schedule: { type: "cron", expression: "* /5 * * * *" },  // every 5 minutes
 * });
 *
 * // Run a health check
 * const health = await orchestrator.runHealthCheck("agent_abc");
 * console.log(health.status);    // "healthy"
 * console.log(health.riskScore); // 0
 *
 * // Get orchestrator metrics
 * const metrics = orchestrator.getMetrics();
 * console.log(metrics.totalAgents); // 1
 * ```
 *
 * @example
 * ```typescript
 * import { createLifecycleOrchestratorApi } from '@tonaiagent/core/lifecycle-orchestrator';
 *
 * // Framework-agnostic REST API
 * const api = createLifecycleOrchestratorApi();
 *
 * // With Express:
 * app.post('/lifecycle/agents', async (req, res) => {
 *   const result = await api.handle({
 *     method: 'POST',
 *     path: '/lifecycle/agents',
 *     body: req.body,
 *   });
 *   res.status(result.status).json(result.body);
 * });
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Lifecycle state machine
  LifecycleState,
  StateTransition,
  // Scheduler
  ScheduleTriggerType,
  ScheduleConfig,
  CronSchedule,
  EventSchedule,
  MarketSchedule,
  OnChainSchedule,
  ManualSchedule,
  ScheduledJob,
  // Runtime allocation
  ResourceTier,
  ComputeEnvironment,
  CloudProvider,
  RuntimeAllocation,
  // Health monitoring
  HealthStatus,
  HealthCheckResult,
  AgentPerformanceMetrics,
  AnomalyReport,
  // Scaling
  ScalingPolicyType,
  ScalingPolicy,
  // Alerting
  AlertSeverity,
  AlertChannel,
  Alert,
  // Governance
  PermissionScope,
  GovernancePermission,
  AuditEntry,
  // Migration
  MigrationType,
  MigrationRecord,
  // Agent lifecycle record
  AgentLifecycleRecord,
  TerminationReport,
  // I/O
  RegisterAgentInput,
  RegisterAgentResult,
  TransitionStateInput,
  ScheduleJobInput,
  ScaleAgentInput,
  // Configuration
  LifecycleOrchestratorConfig,
  AlertingConfig,
  GovernanceConfig,
  // Health & Metrics
  LifecycleOrchestratorHealth,
  LifecycleOrchestratorMetrics,
  // Events
  LifecycleEventType,
  LifecycleEvent,
  LifecycleEventHandler,
  LifecycleUnsubscribe,
  // API
  LifecycleApiRequest,
  LifecycleApiResponse,
} from './types';

export {
  // Constants
  LIFECYCLE_TRANSITIONS,
  // Error class
  LifecycleOrchestratorError,
} from './types';
export type { LifecycleOrchestratorErrorCode } from './types';

// ============================================================================
// Orchestrator Exports
// ============================================================================

export {
  LifecycleOrchestrator,
  createLifecycleOrchestrator,
  DEFAULT_LIFECYCLE_CONFIG,
} from './lifecycle-orchestrator';

// ============================================================================
// API Exports
// ============================================================================

export {
  LifecycleOrchestratorApi,
  createLifecycleOrchestratorApi,
} from './api';
