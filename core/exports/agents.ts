/**
 * Agents Domain Exports
 *
 * Multi-agent coordination, agent runtime, orchestration, and lifecycle management.
 * Import directly via subpath for tree-shaking:
 *   import { ... } from '@tonaiagent/core/multi-agent'
 *   import { ... } from '@tonaiagent/core/agent-runtime'
 *   import { ... } from '@tonaiagent/core/agent-orchestrator'
 *   import { ... } from '@tonaiagent/core/lifecycle-orchestrator'
 */

// Re-export multi-agent with namespace to avoid naming conflicts with tokenomics types
// (both modules define GovernanceConfig, DelegationRequest, CapitalPool, GovernanceStats)
export * as MultiAgent from '../multi-agent';

// Production Agent Runtime (Issue #149)
export * as AgentRuntimeModule from '../agents/agent-runtime';
export {
  // Orchestrator
  AgentRuntimeOrchestrator,
  createAgentRuntimeOrchestrator,
  DEFAULT_RUNTIME_CONFIG,
  // Error
  AgentRuntimeError,
  // Types
  type AgentLifecycleState,
  type LifecycleTransitionReason,
  type LifecycleTransition,
  type PipelineStep,
  type PipelineStepStatus,
  type PipelineStepResult,
  type PipelineExecution,
  type SimulationConfig,
  type SimulatedTransaction,
  type RuntimeAgentConfig,
  type RuntimeRiskLimits,
  type RuntimeSchedule,
  type RuntimeAgentState,
  type AgentRuntimeConfig,
  // Note: exported as RuntimeObservabilityConfig to avoid conflict with ai module's ObservabilityConfig
  type ObservabilityConfig as RuntimeObservabilityConfig,
  type OrchestratorMetrics as RuntimeOrchestratorMetrics,
  type OrchestratorHealth as RuntimeOrchestratorHealth,
  type RuntimeEventType,
  type RuntimeEvent,
  type RuntimeEventHandler,
  type RuntimeUnsubscribe,
  type AgentRuntimeErrorCode,
} from '../agents/agent-runtime';

// One-Click Agent Creation Orchestrator (Issue #91)
// Note: Namespace is exported as AgentOrchestratorModule to avoid conflict with the AgentOrchestrator class.
export * as AgentOrchestratorModule from '../agents/orchestrator';
export {
  // Orchestrator
  AgentOrchestrator,
  createAgentOrchestrator,
  DEFAULT_ORCHESTRATOR_CONFIG,
  // API
  AgentOrchestratorApi,
  createAgentOrchestratorApi,
  // Error
  AgentOrchestratorError,
  // Types
  // Note: CreateAgentInput from agent-orchestrator is exported as OrchestratorCreateAgentInput
  // to avoid conflict with CreateAgentInput from ./protocol (Open Agent Protocol)
  type CreateAgentInput as OrchestratorCreateAgentInput,
  type CreateAgentResult,
  type AgentMetadata,
  type AgentStatus,
  type AgentStrategy,
  type AgentEnvironment,
  type AgentProvisioningSummary,
  type SubsystemResult,
  type AgentOrchestratorConfig,
  type OrchestratorHealth,
  type OrchestratorMetrics,
  type OrchestratorEvent,
  type OrchestratorEventType,
  type OrchestratorEventHandler,
  type OrchestratorUnsubscribe,
  type OrchestratorApiRequest,
  type OrchestratorApiResponse,
  type AgentOrchestratorErrorCode,
} from '../agents/orchestrator';

// Agent Lifecycle Cloud Orchestrator (Issue #92)
export * as LifecycleOrchestratorModule from '../agents/lifecycle';
export {
  // Orchestrator
  LifecycleOrchestrator,
  createLifecycleOrchestrator,
  DEFAULT_LIFECYCLE_CONFIG,
  // API
  LifecycleOrchestratorApi,
  createLifecycleOrchestratorApi,
  // Error
  LifecycleOrchestratorError,
  // State machine
  LIFECYCLE_TRANSITIONS,
  // Types
  type LifecycleState,
  type StateTransition,
  type ScheduleConfig,
  type ScheduledJob,
  type RuntimeAllocation,
  type ResourceTier,
  type ComputeEnvironment,
  type CloudProvider,
  type HealthCheckResult,
  type HealthStatus,
  type AgentPerformanceMetrics,
  type AnomalyReport,
  type ScalingPolicy,
  type Alert,
  type AlertSeverity,
  type AlertChannel,
  type GovernancePermission,
  type PermissionScope,
  type AuditEntry,
  type MigrationRecord,
  type MigrationType,
  type AgentLifecycleRecord,
  type TerminationReport,
  type RegisterAgentInput,
  type RegisterAgentResult,
  type TransitionStateInput,
  type ScheduleJobInput,
  type ScaleAgentInput,
  type LifecycleOrchestratorConfig,
  type LifecycleOrchestratorHealth,
  type LifecycleOrchestratorMetrics,
  type LifecycleEvent,
  type LifecycleEventType,
  type LifecycleEventHandler,
  type LifecycleUnsubscribe,
  type LifecycleApiRequest,
  type LifecycleApiResponse,
  type LifecycleOrchestratorErrorCode,
} from '../agents/lifecycle';
