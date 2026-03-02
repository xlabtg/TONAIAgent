/**
 * TONAIAgent - One-Click Agent Creation Orchestrator Types
 *
 * Type definitions for the Agent Orchestrator that provides a single API call
 * to create a fully operational AI agent with:
 * - Runtime initialization
 * - TON wallet creation
 * - Telegram bot provisioning
 * - Strategy binding
 * - Metadata persistence
 * - Security configuration
 *
 * Issue #91: Implement One-Click Agent Creation API
 */

// ============================================================================
// Strategy Types
// ============================================================================

/**
 * Supported agent strategy templates.
 * Each represents a pre-built AI-driven DeFi strategy.
 */
export type AgentStrategy =
  | 'trading'   // Algorithmic trading (DCA, grid, momentum)
  | 'yield'     // Yield farming and liquidity provision
  | 'arbitrage' // Cross-DEX and cross-chain arbitrage
  | 'demo'      // Demo/sandbox mode (no real funds, safe for demos)
  | 'custom';   // Custom configuration via strategyConfig

// ============================================================================
// Environment Types
// ============================================================================

/**
 * Deployment environment for the agent.
 * - demo: Full simulation, fake balances, no on-chain transactions
 * - testnet: TON testnet with real transactions but test tokens
 * - mainnet: Production environment with real funds
 */
export type AgentEnvironment = 'demo' | 'testnet' | 'mainnet';

// ============================================================================
// Create Agent Input
// ============================================================================

/**
 * Input for the one-click agent creation API.
 *
 * @example
 * ```typescript
 * const input: CreateAgentInput = {
 *   userId: "user_123",
 *   strategy: "trading",
 *   telegram: true,
 *   tonWallet: true,
 *   environment: "demo"
 * };
 * ```
 */
export interface CreateAgentInput {
  /** Unique user identifier (Telegram ID, wallet address, or platform-assigned) */
  userId: string;
  /** Strategy template to bind to the agent */
  strategy: AgentStrategy;
  /** Whether to provision a Telegram bot for this agent */
  telegram: boolean;
  /** Whether to create a TON wallet for this agent */
  tonWallet: boolean;
  /** Deployment environment */
  environment: AgentEnvironment;
  /** Optional human-readable agent name (auto-generated if not provided) */
  name?: string;
  /** Optional custom strategy config (only used when strategy is 'custom') */
  strategyConfig?: Record<string, unknown>;
  /** Optional initial TON budget in TON units (default: 10 in demo mode) */
  budgetTon?: number;
  /** Idempotency key to prevent duplicate agent creation (optional) */
  idempotencyKey?: string;
}

// ============================================================================
// Create Agent Result
// ============================================================================

/**
 * Result of a successful one-click agent creation.
 *
 * @example
 * ```typescript
 * {
 *   agentId: "agent_abc",
 *   telegramBot: "@MyAIAgentBot",
 *   walletAddress: "EQC...",
 *   status: "active"
 * }
 * ```
 */
export interface CreateAgentResult {
  /** Unique agent identifier */
  agentId: string;
  /** Human-readable agent name */
  agentName: string;
  /** Telegram bot username (null if telegram=false) */
  telegramBot: string | null;
  /** TON wallet address (null if tonWallet=false) */
  walletAddress: string | null;
  /** Current agent status */
  status: AgentStatus;
  /** Strategy that was bound */
  strategy: AgentStrategy;
  /** Deployment environment */
  environment: AgentEnvironment;
  /** User who owns this agent */
  userId: string;
  /** Timestamp of creation */
  createdAt: Date;
  /** Summary of what was provisioned */
  provisioningSummary: AgentProvisioningSummary;
}

// ============================================================================
// Agent Status
// ============================================================================

/**
 * Current operational status of an agent.
 */
export type AgentStatus =
  | 'initializing' // Agent creation is in progress
  | 'active'       // Agent is running and operational
  | 'paused'       // Agent is created but paused
  | 'error'        // Agent creation failed or agent encountered an error
  | 'terminated';  // Agent has been terminated

// ============================================================================
// Provisioning Summary
// ============================================================================

/**
 * Summary of what was provisioned during agent creation.
 * Includes status and details of each subsystem.
 */
export interface AgentProvisioningSummary {
  /** Runtime initialization result */
  runtime: SubsystemResult;
  /** TON wallet result (null if not requested) */
  wallet: SubsystemResult | null;
  /** Telegram bot result (null if not requested) */
  telegram: SubsystemResult | null;
  /** Strategy binding result */
  strategy: SubsystemResult;
  /** Persistence layer result */
  persistence: SubsystemResult;
  /** Security configuration result */
  security: SubsystemResult;
  /** Total time to create the agent in milliseconds */
  totalDurationMs: number;
}

/** Result of a single subsystem provisioning step */
export interface SubsystemResult {
  /** Whether this subsystem was provisioned successfully */
  success: boolean;
  /** Duration in milliseconds */
  durationMs: number;
  /** Optional details about what was provisioned */
  details?: Record<string, unknown>;
  /** Error message if provisioning failed */
  error?: string;
}

// ============================================================================
// Agent Metadata (Persistence Layer)
// ============================================================================

/**
 * Persisted agent metadata record.
 * Stored in-memory (can be backed by database in production).
 */
export interface AgentMetadata {
  /** Unique agent identifier */
  agentId: string;
  /** Human-readable name */
  agentName: string;
  /** Owning user */
  userId: string;
  /** Active strategy */
  strategy: AgentStrategy;
  /** Deployment environment */
  environment: AgentEnvironment;
  /** Agent status */
  status: AgentStatus;
  /** Wallet address (null if not created) */
  walletAddress: string | null;
  /** Telegram bot username (null if not provisioned) */
  telegramBot: string | null;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Full provisioning summary */
  provisioningSummary: AgentProvisioningSummary;
  /** Optional strategy configuration */
  strategyConfig?: Record<string, unknown>;
}

// ============================================================================
// Orchestrator Configuration
// ============================================================================

/**
 * Configuration for the Agent Orchestrator.
 */
export interface AgentOrchestratorConfig {
  /** Whether the orchestrator is enabled */
  enabled: boolean;
  /** Default environment for new agents */
  defaultEnvironment: AgentEnvironment;
  /** Maximum agents per user (0 = unlimited) */
  maxAgentsPerUser: number;
  /** Maximum total agents managed (0 = unlimited) */
  maxTotalAgents: number;
  /** Idempotency window in seconds (0 = disabled) */
  idempotencyWindowSeconds: number;
  /** Whether to automatically start agents after creation */
  autoStart: boolean;
  /** Default TON budget in demo mode */
  defaultDemoBudgetTon: number;
  /** Security configuration */
  security: OrchestratorSecurityConfig;
}

/** Security configuration for the orchestrator */
export interface OrchestratorSecurityConfig {
  /** Rate limit: max agent creations per user per hour (0 = unlimited) */
  maxCreationsPerUserPerHour: number;
  /** Whether to encrypt stored keys */
  encryptStoredKeys: boolean;
  /** Whether to enable audit logging */
  enableAuditLog: boolean;
}

// ============================================================================
// Orchestrator Health
// ============================================================================

/**
 * Orchestrator health status.
 */
export interface OrchestratorHealth {
  /** Overall health */
  overall: 'healthy' | 'degraded' | 'unhealthy';
  /** Whether the orchestrator is running */
  running: boolean;
  /** Component health map */
  components: {
    runtime: boolean;
    walletFactory: boolean;
    telegramProvisioner: boolean;
    strategyRegistry: boolean;
    persistence: boolean;
    security: boolean;
  };
  /** Key metrics */
  metrics: OrchestratorMetrics;
  /** Last health check time */
  lastCheck: Date;
}

/**
 * Orchestrator metrics snapshot.
 */
export interface OrchestratorMetrics {
  /** Total agents ever created */
  totalAgentsCreated: number;
  /** Currently active agents */
  activeAgents: number;
  /** Total users served */
  totalUsers: number;
  /** Successful creations */
  successfulCreations: number;
  /** Failed creations */
  failedCreations: number;
  /** Average creation time in ms */
  avgCreationTimeMs: number;
}

// ============================================================================
// Orchestrator Events
// ============================================================================

/** Event types emitted by the orchestrator */
export type OrchestratorEventType =
  | 'agent.creation_started'
  | 'agent.creation_completed'
  | 'agent.creation_failed'
  | 'agent.status_changed'
  | 'agent.terminated';

/** Orchestrator event */
export interface OrchestratorEvent {
  /** Event type */
  type: OrchestratorEventType;
  /** Timestamp */
  timestamp: Date;
  /** Related agent ID */
  agentId?: string;
  /** Related user ID */
  userId?: string;
  /** Event payload */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type OrchestratorEventHandler = (event: OrchestratorEvent) => void;

/** Unsubscribe function */
export type OrchestratorUnsubscribe = () => void;

// ============================================================================
// Orchestrator Error Types
// ============================================================================

/** Error codes for orchestrator operations */
export type AgentOrchestratorErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'AGENT_ALREADY_EXISTS'
  | 'USER_AGENT_LIMIT_REACHED'
  | 'TOTAL_AGENT_LIMIT_REACHED'
  | 'INVALID_STRATEGY'
  | 'INVALID_ENVIRONMENT'
  | 'WALLET_CREATION_FAILED'
  | 'TELEGRAM_PROVISIONING_FAILED'
  | 'RUNTIME_INITIALIZATION_FAILED'
  | 'STRATEGY_BINDING_FAILED'
  | 'PERSISTENCE_FAILED'
  | 'SECURITY_SETUP_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ORCHESTRATOR_DISABLED';

/** Structured error for orchestrator operations */
export class AgentOrchestratorError extends Error {
  constructor(
    message: string,
    public readonly code: AgentOrchestratorErrorCode,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AgentOrchestratorError';
  }
}

// ============================================================================
// API Layer Types
// ============================================================================

/** Standard API request wrapper (framework-agnostic) */
export interface OrchestratorApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

/** Standard API response envelope */
export interface OrchestratorApiResponse<T = unknown> {
  status: number;
  body: {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
  };
}
