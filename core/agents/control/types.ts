/**
 * TONAIAgent - Agent Control API Types
 *
 * Type definitions for the Agent Control API that enables lifecycle management
 * of agents via external interfaces (Telegram Mini App, admin panel, etc.).
 *
 * Implements Issue #185: Agent Control API
 */

// ============================================================================
// Agent State Types
// ============================================================================

/**
 * Agent control states as defined in Issue #185.
 * Maps to the broader AgentLifecycleState from agent-runtime.
 */
export type AgentControlState = 'running' | 'stopped' | 'paused' | 'error';

// ============================================================================
// Agent Summary & Status Types
// ============================================================================

/** Lightweight agent summary returned in list responses */
export interface AgentSummary {
  /** Unique agent identifier */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** Current control state */
  status: AgentControlState;
  /** Strategy being executed */
  strategy: string;
  /** Agent owner identifier */
  ownerId: string;
  /** Timestamp when the agent was created */
  createdAt: Date;
  /** Timestamp of the last status change */
  updatedAt: Date;
}

/** Full agent status response including runtime metrics */
export interface AgentStatus {
  /** Unique agent identifier */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** Current control state */
  status: AgentControlState;
  /** Strategy being executed */
  strategy: string;
  /** Agent owner identifier */
  ownerId: string;
  /** Uptime in seconds (null when stopped) */
  uptimeSeconds: number | null;
  /** Total number of trades executed */
  tradesExecuted: number;
  /** Timestamp when the agent was created */
  createdAt: Date;
  /** Timestamp of last status change */
  updatedAt: Date;
  /** Timestamp of last successful execution (null if never) */
  lastExecutedAt: Date | null;
  /** Error message if status is 'error' */
  errorMessage: string | null;
}

// ============================================================================
// Request & Response Types
// ============================================================================

/** Framework-agnostic API request */
export interface AgentControlRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Framework-agnostic API response */
export interface AgentControlResponse<T = unknown> {
  statusCode: number;
  body: AgentControlResponseBody<T>;
}

/** Standard response envelope */
export interface AgentControlResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: AgentControlErrorCode;
  /** Seconds until the client may retry (used with RATE_LIMIT_EXCEEDED) */
  retryAfter?: number;
  /** Field-level validation issues (used with VALIDATION_ERROR) */
  details?: Array<{ path: string; message: string }>;
}

/** Response for lifecycle action endpoints (start/stop/restart) */
export interface AgentActionResult {
  /** Agent identifier */
  agentId: string;
  /** New status after the action */
  status: AgentControlState;
  /** Human-readable result message */
  message: string;
}

/** Response for the list agents endpoint */
export interface ListAgentsResult {
  agents: AgentSummary[];
  total: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Configuration for the Agent Control API */
export interface AgentControlConfig {
  /** Whether the API is enabled */
  enabled: boolean;
  /** Maximum number of agents tracked in the in-memory registry */
  maxAgents: number;
  /** Whether to emit detailed events */
  enableEvents: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

/** Agent control event types */
export type AgentControlEventType =
  | 'agent.started'
  | 'agent.stopped'
  | 'agent.restarted'
  | 'agent.error';

/** Agent control event */
export interface AgentControlEvent {
  /** Event type */
  type: AgentControlEventType;
  /** Agent identifier */
  agentId: string;
  /** Previous status */
  previousStatus: AgentControlState;
  /** New status */
  newStatus: AgentControlState;
  /** Event timestamp */
  timestamp: Date;
}

/** Event handler callback */
export type AgentControlEventHandler = (event: AgentControlEvent) => void;

/** Unsubscribe function */
export type AgentControlUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for agent control operations */
export type AgentControlErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'AGENT_ALREADY_RUNNING'
  | 'AGENT_ALREADY_STOPPED'
  | 'AGENT_IN_ERROR_STATE'
  | 'INVALID_AGENT_ID'
  | 'OPERATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'UNSUPPORTED_MEDIA_TYPE';

/** Structured error for agent control operations */
export class AgentControlError extends Error {
  constructor(
    message: string,
    public readonly code: AgentControlErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentControlError';
  }
}
