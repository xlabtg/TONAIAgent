/** @mvp Core agents module — required for MVP (agent runtime, orchestrator, control, lifecycle) */
// Core Agents — consolidated from:
//   src/agents → core/agents/runtime
//   src/agent-runtime → core/agents/agent-runtime
//   src/agent-orchestrator → core/agents/orchestrator
//   src/agent-control → core/agents/control
//   src/lifecycle-orchestrator → core/agents/lifecycle

// Agent Manager API — AgentRecord, AgentSummary, AgentPerformanceMetrics defined here
export * from './runtime';

// Agent Runtime Orchestrator — OrchestratorHealth, OrchestratorMetrics defined here
export * from './agent-runtime';

// One-Click Agent Creation Orchestrator
// Exclude OrchestratorHealth and OrchestratorMetrics (already exported from agent-runtime)
export type {
  CreateAgentInput,
  CreateAgentResult,
  AgentMetadata,
  AgentStatus,
  AgentStrategy,
  AgentEnvironment,
  AgentProvisioningSummary,
  SubsystemResult,
  AgentOrchestratorConfig,
  OrchestratorSecurityConfig,
  OrchestratorEvent,
  OrchestratorEventType,
  OrchestratorEventHandler,
  OrchestratorUnsubscribe,
  OrchestratorApiRequest,
  OrchestratorApiResponse,
  AgentOrchestratorErrorCode,
} from './orchestrator';
export {
  AgentOrchestratorError,
  AgentOrchestrator,
  createAgentOrchestrator,
  DEFAULT_ORCHESTRATOR_CONFIG,
  AgentOrchestratorApi,
  createAgentOrchestratorApi,
} from './orchestrator';

// Agent Control API
// Exclude AgentStatus (already from orchestrator), AgentRecord and AgentSummary (already from runtime)
export type {
  AgentControlState,
  AgentControlRequest,
  AgentControlResponse,
  AgentControlResponseBody,
  AgentActionResult,
  ListAgentsResult,
  AgentControlConfig,
  AgentControlEventType,
  AgentControlEvent,
  AgentControlEventHandler,
  AgentControlUnsubscribe,
  AgentControlErrorCode,
} from './control';
export {
  AgentControlError,
  AgentRegistry,
  createDemoRegistry,
  AgentManager,
  createAgentManager,
  DEFAULT_AGENT_CONTROL_CONFIG,
  AgentControlApi,
  createAgentControlApi,
  createAgentControlApiWithConfig,
} from './control';

// Agent Lifecycle Cloud Orchestrator
// Exclude AgentPerformanceMetrics (already from runtime)
export type {
  LifecycleState,
  StateTransition,
  ScheduleTriggerType,
  ScheduleConfig,
  CronSchedule,
  EventSchedule,
  MarketSchedule,
  OnChainSchedule,
  ManualSchedule,
  ScheduledJob,
  ResourceTier,
  ComputeEnvironment,
  CloudProvider,
  RuntimeAllocation,
  HealthStatus,
  HealthCheckResult,
  AnomalyReport,
  ScalingPolicyType,
  ScalingPolicy,
  AlertSeverity,
  AlertChannel,
  Alert,
  PermissionScope,
  GovernancePermission,
  AuditEntry,
  MigrationType,
  MigrationRecord,
  AgentLifecycleRecord,
  TerminationReport,
  RegisterAgentInput,
  RegisterAgentResult,
  TransitionStateInput,
  ScheduleJobInput,
  ScaleAgentInput,
  LifecycleOrchestratorConfig,
  AlertingConfig,
  GovernanceConfig,
  LifecycleOrchestratorHealth,
  LifecycleOrchestratorMetrics,
  LifecycleEventType,
  LifecycleEvent,
  LifecycleEventHandler,
  LifecycleUnsubscribe,
  LifecycleApiRequest,
  LifecycleApiResponse,
  LifecycleOrchestratorErrorCode,
} from './lifecycle';
export {
  LIFECYCLE_TRANSITIONS,
  LifecycleOrchestratorError,
  LifecycleOrchestrator,
  createLifecycleOrchestrator,
  DEFAULT_LIFECYCLE_CONFIG,
  LifecycleOrchestratorApi,
  createLifecycleOrchestratorApi,
} from './lifecycle';
