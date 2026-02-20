/**
 * TONAIAgent - Multi-Agent Coordination Framework Type Definitions
 *
 * Core types for enabling autonomous agents to collaborate, delegate tasks,
 * share context, and execute complex distributed strategies on TON.
 */

// ============================================================================
// Agent Role Types
// ============================================================================

/**
 * Agent roles define specialization and capabilities
 */
export type AgentRole =
  | 'strategist'    // Generates high-level plans
  | 'executor'      // Executes transactions
  | 'risk'          // Monitors exposure and limits
  | 'data'          // Collects and processes signals
  | 'arbitrage'     // Specialized trading tasks
  | 'portfolio'     // Coordinates capital allocation
  | 'coordinator'   // Orchestrates swarm behavior
  | 'scout';        // Opportunity detection

export type AgentStatus =
  | 'initializing'
  | 'active'
  | 'paused'
  | 'executing'
  | 'waiting'
  | 'error'
  | 'terminated';

export interface MultiAgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  userId: string;
  parentId?: string;
  capabilities: AgentCapabilities;
  permissions: AgentRolePermissions;
  resourceLimits: ResourceLimits;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCapabilities {
  canSpawnAgents: boolean;
  canTerminateAgents: boolean;
  canDelegateTask: boolean;
  canAccessSharedMemory: boolean;
  canAccessCapitalPool: boolean;
  maxConcurrentTasks: number;
  supportedOperations: string[];
  protocols: string[];
}

export interface AgentRolePermissions {
  trading: boolean;
  staking: boolean;
  transfers: boolean;
  monitoring: boolean;
  execution: boolean;
  riskManagement: boolean;
  capitalAllocation: boolean;
}

export interface ResourceLimits {
  maxCapitalAllocation: number;
  maxTransactionValue: number;
  dailyTransactionLimit: number;
  maxActivePositions: number;
  maxConcurrentOperations: number;
  cpuPriority: 'low' | 'normal' | 'high';
}

// ============================================================================
// Agent State Types
// ============================================================================

export interface AgentState {
  agentId: string;
  status: AgentStatus;
  currentTask?: TaskInfo;
  activeOperations: OperationState[];
  resourceUsage: ResourceUsage;
  performance: AgentPerformance;
  lastHeartbeat: Date;
  errorCount: number;
  lastError?: AgentError;
}

export interface TaskInfo {
  taskId: string;
  type: string;
  priority: TaskPriority;
  startedAt: Date;
  estimatedCompletionTime?: Date;
  progress: number;
  metadata?: Record<string, unknown>;
}

export interface OperationState {
  operationId: string;
  type: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}

export interface ResourceUsage {
  capitalAllocated: number;
  activePositions: number;
  pendingTransactions: number;
  memoryUsageBytes: number;
  lastUpdated: Date;
}

export interface AgentPerformance {
  tasksCompleted: number;
  tasksSuccessful: number;
  averageTaskDurationMs: number;
  profitLossTon: number;
  riskScore: number;
  uptime: number;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export interface AgentError {
  code: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

// ============================================================================
// Communication Protocol Types
// ============================================================================

export type MessageType =
  | 'task_request'
  | 'task_response'
  | 'task_assignment'
  | 'task_completion'
  | 'task_failure'
  | 'execution_report'
  | 'risk_alert'
  | 'performance_update'
  | 'state_sync'
  | 'heartbeat'
  | 'control_command'
  | 'resource_request'
  | 'resource_grant'
  | 'conflict_notification'
  | 'shutdown_request';

export interface AgentMessage {
  id: string;
  type: MessageType;
  senderId: string;
  senderRole: AgentRole;
  targetId?: string;           // Specific agent or undefined for broadcast
  targetRole?: AgentRole;      // Route to agents with this role
  payload: MessagePayload;
  priority: MessagePriority;
  timestamp: Date;
  expiresAt?: Date;
  correlationId?: string;      // For request/response tracking
  replyTo?: string;            // Message ID to reply to
  metadata?: Record<string, unknown>;
}

export type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

export type MessagePayload =
  | TaskRequestPayload
  | TaskResponsePayload
  | ExecutionReportPayload
  | RiskAlertPayload
  | StateSyncPayload
  | ControlCommandPayload
  | ResourceRequestPayload
  | ConflictNotificationPayload;

export interface TaskRequestPayload {
  type: 'task_request';
  taskId: string;
  taskType: AgentTaskType;
  description: string;
  parameters: Record<string, unknown>;
  constraints?: TaskConstraints;
  deadline?: Date;
}

export interface TaskResponsePayload {
  type: 'task_response';
  taskId: string;
  accepted: boolean;
  reason?: string;
  estimatedCompletion?: Date;
}

export interface ExecutionReportPayload {
  type: 'execution_report';
  operationId: string;
  operationType: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
  gasUsed?: number;
  transactionHash?: string;
}

export interface RiskAlertPayload {
  type: 'risk_alert';
  alertId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: RiskCategory;
  description: string;
  affectedAgents: string[];
  suggestedAction: string;
  requiresHalt: boolean;
  metrics?: Record<string, number>;
}

export interface StateSyncPayload {
  type: 'state_sync';
  scope: 'full' | 'partial';
  stateType: 'position' | 'capital' | 'task' | 'signal' | 'all';
  data: Record<string, unknown>;
  version: number;
  previousVersion?: number;
}

export interface ControlCommandPayload {
  type: 'control_command';
  command: ControlCommand;
  parameters?: Record<string, unknown>;
  reason?: string;
  initiator: string;
}

export type ControlCommand =
  | 'pause'
  | 'resume'
  | 'terminate'
  | 'restart'
  | 'update_config'
  | 'force_sync'
  | 'emergency_stop';

export interface ResourceRequestPayload {
  type: 'resource_request';
  resourceType: 'capital' | 'priority' | 'slot';
  amount: number;
  duration?: number;
  justification: string;
}

export interface ConflictNotificationPayload {
  type: 'conflict_notification';
  conflictId: string;
  conflictType: ConflictType;
  parties: string[];
  resource: string;
  description: string;
  proposedResolution?: string;
}

export type RiskCategory =
  | 'exposure_limit'
  | 'drawdown'
  | 'volatility'
  | 'liquidity'
  | 'execution_failure'
  | 'anomaly_detected'
  | 'market_condition';

// ============================================================================
// Task Management Types
// ============================================================================

export type AgentTaskType =
  | 'trade_execution'
  | 'position_management'
  | 'risk_assessment'
  | 'market_analysis'
  | 'opportunity_scan'
  | 'rebalance'
  | 'yield_optimization'
  | 'arbitrage_execution'
  | 'data_collection'
  | 'reporting'
  | 'maintenance';

export type TaskPriority = 1 | 2 | 3 | 4 | 5; // 1 = highest

export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_dependency'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface Task {
  id: string;
  type: AgentTaskType;
  priority: TaskPriority;
  status: TaskStatus;
  creatorId: string;
  assigneeId?: string;
  description: string;
  parameters: Record<string, unknown>;
  constraints: TaskConstraints;
  dependencies: string[];
  result?: TaskResult;
  createdAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  deadline?: Date;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, unknown>;
}

export interface TaskConstraints {
  maxDuration?: number;
  requiredCapabilities?: string[];
  requiredRole?: AgentRole;
  maxCapitalUsage?: number;
  maxRisk?: number;
  deadline?: Date;
  exclusive?: boolean;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
  resourcesUsed: ResourceUsage;
  metrics?: Record<string, number>;
}

export interface TaskQueue {
  add(task: Task): Promise<void>;
  remove(taskId: string): Promise<boolean>;
  get(taskId: string): Promise<Task | undefined>;
  peek(): Promise<Task | undefined>;
  pop(): Promise<Task | undefined>;
  size(): number;
  clear(): void;
  prioritize(taskId: string, newPriority: TaskPriority): Promise<boolean>;
  getByStatus(status: TaskStatus): Promise<Task[]>;
  getByAssignee(agentId: string): Promise<Task[]>;
}

// ============================================================================
// Delegation Types
// ============================================================================

export interface DelegationRequest {
  id: string;
  taskId: string;
  fromAgentId: string;
  toAgentId?: string;
  toRole?: AgentRole;
  task: Task;
  constraints: DelegationConstraints;
  status: DelegationStatus;
  createdAt: Date;
  respondedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
}

export interface DelegationConstraints {
  allowSubDelegation: boolean;
  maxDepth: number;
  timeout: number;
  mustAccept: boolean;
  escalationAgentId?: string;
  capitalLimit?: number;
}

export type DelegationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'escalated';

export interface DelegationResponse {
  delegationId: string;
  accepted: boolean;
  agentId: string;
  reason?: string;
  estimatedCompletion?: Date;
  conditions?: string[];
}

// ============================================================================
// Shared Memory Types
// ============================================================================

export interface SharedMemoryEntry {
  id: string;
  key: string;
  value: unknown;
  type: SharedMemoryType;
  scope: MemoryScope;
  ownerId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  accessList?: string[];
  metadata?: Record<string, unknown>;
}

export type SharedMemoryType =
  | 'position'
  | 'signal'
  | 'market_data'
  | 'strategy_state'
  | 'risk_metrics'
  | 'performance'
  | 'config'
  | 'custom';

export type MemoryScope =
  | 'global'
  | 'swarm'
  | 'team'
  | 'agent';

export interface MemoryLock {
  key: string;
  holderId: string;
  acquiredAt: Date;
  expiresAt: Date;
  type: 'read' | 'write';
}

export interface SharedMemoryStore {
  get(key: string): Promise<SharedMemoryEntry | undefined>;
  set(key: string, entry: SharedMemoryEntry): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  list(pattern?: string): Promise<SharedMemoryEntry[]>;
  acquireLock(key: string, holderId: string, type: 'read' | 'write', ttlMs: number): Promise<MemoryLock | null>;
  releaseLock(key: string, holderId: string): Promise<boolean>;
  subscribe(pattern: string, callback: (key: string, entry: SharedMemoryEntry) => void): () => void;
  getVersion(key: string): Promise<number>;
  compareAndSet(key: string, expectedVersion: number, entry: SharedMemoryEntry): Promise<boolean>;
}

// ============================================================================
// Capital Management Types
// ============================================================================

export interface CapitalPool {
  id: string;
  totalCapital: number;
  availableCapital: number;
  reservedCapital: number;
  allocations: CapitalAllocation[];
  limits: CapitalLimits;
  lastUpdated: Date;
}

export interface CapitalAllocation {
  agentId: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'active' | 'released';
  allocatedAt: Date;
  expiresAt?: Date;
  performance: number;
}

export interface CapitalLimits {
  maxPerAgent: number;
  maxPerOperation: number;
  dailyLimit: number;
  reserveRatio: number;
  rebalanceThreshold: number;
}

export interface CapitalRequest {
  id: string;
  agentId: string;
  amount: number;
  purpose: string;
  priority: TaskPriority;
  duration?: number;
  expectedReturn?: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
  reason?: string;
}

export interface CapitalManager {
  getPool(poolId: string): Promise<CapitalPool | undefined>;
  requestCapital(request: CapitalRequest): Promise<CapitalAllocation | null>;
  releaseCapital(agentId: string, amount: number): Promise<boolean>;
  getAgentAllocation(agentId: string): Promise<number>;
  rebalance(): Promise<void>;
  getUtilization(): Promise<number>;
  updatePerformance(agentId: string, pnl: number): Promise<void>;
}

// ============================================================================
// Conflict Resolution Types
// ============================================================================

export type ConflictType =
  | 'resource_contention'
  | 'capital_contention'
  | 'position_conflict'
  | 'execution_race'
  | 'signal_contradiction'
  | 'priority_dispute';

export type ResolutionStrategy =
  | 'priority_based'
  | 'first_come_first_served'
  | 'master_override'
  | 'consensus'
  | 'random'
  | 'weighted_random'
  | 'rollback';

export interface Conflict {
  id: string;
  type: ConflictType;
  parties: string[];
  resource: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: ConflictStatus;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: ConflictResolution;
  metadata?: Record<string, unknown>;
}

export type ConflictStatus =
  | 'detected'
  | 'analyzing'
  | 'awaiting_resolution'
  | 'resolved'
  | 'escalated';

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  winner?: string;
  actions: ConflictAction[];
  reasoning: string;
  resolvedBy: string;
}

export interface ConflictAction {
  agentId: string;
  action: 'proceed' | 'wait' | 'rollback' | 'modify' | 'cancel';
  parameters?: Record<string, unknown>;
}

export interface ConflictResolver {
  detect(context: ConflictContext): Promise<Conflict[]>;
  resolve(conflict: Conflict): Promise<ConflictResolution>;
  getActiveConflicts(): Conflict[];
  getResolutionHistory(limit?: number): Conflict[];
  registerStrategy(type: ConflictType, strategy: ResolutionStrategy): void;
}

export interface ConflictContext {
  agents: AgentState[];
  pendingOperations: OperationState[];
  sharedResources: Map<string, string[]>;
  capitalAllocations: CapitalAllocation[];
}

// ============================================================================
// Swarm Intelligence Types
// ============================================================================

export interface SwarmConfig {
  id: string;
  name: string;
  description: string;
  coordinatorId: string;
  agentConfigs: SwarmAgentConfig[];
  communication: SwarmCommunicationConfig;
  resourceSharing: SwarmResourceConfig;
  goals: SwarmGoal[];
  constraints: SwarmConstraints;
  createdAt: Date;
}

export interface SwarmAgentConfig {
  role: AgentRole;
  count: number;
  capabilities: string[];
  initialCapitalShare: number;
}

export interface SwarmCommunicationConfig {
  protocol: 'event_driven' | 'polling' | 'hybrid';
  latencyTarget: number;
  messageRetention: number;
  broadcastEnabled: boolean;
}

export interface SwarmResourceConfig {
  capitalPoolMode: 'shared' | 'isolated' | 'hierarchical';
  riskLimitsMode: 'global' | 'per_agent';
  profitDistribution: 'equal' | 'proportional' | 'performance_weighted';
}

export interface SwarmGoal {
  id: string;
  type: 'profit' | 'yield' | 'arbitrage' | 'hedging' | 'custom';
  target: number;
  metric: string;
  deadline?: Date;
  priority: TaskPriority;
}

export interface SwarmConstraints {
  maxAgents: number;
  maxCapital: number;
  maxDrawdown: number;
  allowedProtocols: string[];
  allowedTokens: string[];
  operatingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface SwarmState {
  swarmId: string;
  status: 'initializing' | 'active' | 'paused' | 'terminating' | 'terminated';
  agents: AgentState[];
  capital: CapitalPool;
  performance: SwarmPerformance;
  activeGoals: SwarmGoal[];
  lastUpdated: Date;
}

export interface SwarmPerformance {
  totalProfitLoss: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  tasksCompleted: number;
  averageTaskDuration: number;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

// ============================================================================
// Observability Types
// ============================================================================

export interface MultiAgentEvent {
  id: string;
  timestamp: Date;
  type: MultiAgentEventType;
  source: string;
  sourceRole: AgentRole;
  target?: string;
  swarmId?: string;
  data: Record<string, unknown>;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  tags?: string[];
}

export type MultiAgentEventType =
  | 'agent_created'
  | 'agent_started'
  | 'agent_stopped'
  | 'agent_error'
  | 'task_created'
  | 'task_assigned'
  | 'task_completed'
  | 'task_failed'
  | 'delegation_requested'
  | 'delegation_accepted'
  | 'delegation_rejected'
  | 'message_sent'
  | 'message_received'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'capital_allocated'
  | 'capital_released'
  | 'risk_alert'
  | 'performance_update'
  | 'swarm_created'
  | 'swarm_updated'
  | 'swarm_terminated';

export interface MultiAgentMetrics {
  activeAgents: number;
  activeSwarms: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  messagesPerMinute: number;
  conflictsDetected: number;
  conflictsResolved: number;
  totalCapitalAllocated: number;
  totalProfitLoss: number;
  systemLatency: number;
  timestamp: Date;
}

export interface MultiAgentObservabilityConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  samplingRate: number;
  retentionDays: number;
  eventCallback?: (event: MultiAgentEvent) => void;
}

// ============================================================================
// Governance Types
// ============================================================================

export interface GovernanceConfig {
  enabled: boolean;
  emergencyStopEnabled: boolean;
  requireApprovalForSpawn: boolean;
  maxAgentsPerUser: number;
  maxSwarmsPerUser: number;
  auditLogging: boolean;
}

export interface GovernanceAction {
  id: string;
  type: GovernanceActionType;
  targetType: 'agent' | 'swarm' | 'system';
  targetId: string;
  initiator: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: Date;
  executedAt?: Date;
  executedBy?: string;
}

export type GovernanceActionType =
  | 'spawn_agent'
  | 'terminate_agent'
  | 'pause_agent'
  | 'resume_agent'
  | 'create_swarm'
  | 'dissolve_swarm'
  | 'update_config'
  | 'emergency_stop'
  | 'capital_reallocation';

export interface GovernanceController {
  requestAction(action: Omit<GovernanceAction, 'id' | 'status' | 'createdAt'>): Promise<GovernanceAction>;
  approveAction(actionId: string, approver: string): Promise<boolean>;
  rejectAction(actionId: string, reason: string): Promise<boolean>;
  executeAction(actionId: string): Promise<boolean>;
  getPendingActions(): GovernanceAction[];
  getActionHistory(limit?: number): GovernanceAction[];
  emergencyStop(reason: string, initiator: string): Promise<void>;
  resume(initiator: string): Promise<void>;
  isEmergencyStopActive(): boolean;
}
