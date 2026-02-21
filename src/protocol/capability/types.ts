/**
 * TONAIAgent - Open Agent Protocol Capability Types
 *
 * Types specific to the Capability Framework module.
 */

import {
  AgentId,
  CapabilityId,
  CapabilityCategory,
  CapabilityDeclaration,
  CapabilityStatus,
  ExecuteResult,
  ExecuteOptions,
  CostEstimate,
  ValidationResult,
  JSONSchemaType,
  RiskLevel,
} from '../types';

// ============================================================================
// Capability Registry Types
// ============================================================================

/**
 * Capability registry configuration
 */
export interface CapabilityRegistryConfig {
  /** Enable capability caching */
  enableCache: boolean;

  /** Cache TTL in milliseconds */
  cacheTtl: number;

  /** Validate schemas on registration */
  validateSchemas: boolean;

  /** Allow capability overwriting */
  allowOverwrite: boolean;
}

/**
 * Capability registration input
 */
export interface RegisterCapabilityInput {
  /** Capability declaration */
  capability: CapabilityDeclaration;

  /** Executor instance */
  executor: CapabilityExecutor;

  /** Agent ID that provides this capability */
  providerId: AgentId;
}

/**
 * Capability executor interface
 */
export interface CapabilityExecutor {
  /** Execute the capability */
  execute(params: Record<string, unknown>, options?: ExecuteOptions): Promise<ExecuteResult>;

  /** Estimate execution cost */
  estimate(params: Record<string, unknown>): Promise<CostEstimate>;

  /** Validate parameters */
  validate(params: Record<string, unknown>): Promise<ValidationResult>;

  /** Get current status */
  status(): Promise<CapabilityStatus>;
}

/**
 * Registered capability entry
 */
export interface RegisteredCapability {
  /** Capability declaration */
  declaration: CapabilityDeclaration;

  /** Executor instance */
  executor: CapabilityExecutor;

  /** Provider agent ID */
  providerId: AgentId;

  /** Registration timestamp */
  registeredAt: Date;

  /** Last execution timestamp */
  lastExecutedAt?: Date;

  /** Execution count */
  executionCount: number;

  /** Success rate */
  successRate: number;

  /** Average execution time */
  averageExecutionTime: number;
}

/**
 * Capability search criteria
 */
export interface CapabilitySearchCriteria {
  /** Filter by category */
  category?: CapabilityCategory;

  /** Filter by provider */
  providerId?: AgentId;

  /** Filter by risk level */
  maxRiskLevel?: RiskLevel;

  /** Search in name/description */
  query?: string;

  /** Pagination offset */
  offset?: number;

  /** Pagination limit */
  limit?: number;
}

/**
 * Capability search result
 */
export interface CapabilitySearchResult {
  /** Found capabilities */
  capabilities: CapabilityDeclaration[];

  /** Total count */
  total: number;

  /** Has more results */
  hasMore: boolean;
}

// ============================================================================
// Standard Capabilities
// ============================================================================

/**
 * Standard trading capability parameters
 */
export interface TradingSwapParams {
  /** Input token */
  tokenIn: string;

  /** Output token */
  tokenOut: string;

  /** Amount to swap */
  amount: number;

  /** Maximum slippage percentage */
  maxSlippage?: number;

  /** Deadline timestamp */
  deadline?: number;
}

/**
 * Standard trading capability result
 */
export interface TradingSwapResult {
  /** Amount received */
  amountOut: number;

  /** Actual slippage */
  slippage: number;

  /** Transaction hash */
  transactionHash: string;

  /** Fees paid */
  fees: number;
}

/**
 * Standard yield capability parameters
 */
export interface YieldStakeParams {
  /** Token to stake */
  token: string;

  /** Amount to stake */
  amount: number;

  /** Validator/pool address */
  validator?: string;

  /** Lock period in seconds */
  lockPeriod?: number;
}

/**
 * Standard yield capability result
 */
export interface YieldStakeResult {
  /** Staked amount */
  stakedAmount: number;

  /** Expected APY */
  expectedApy: number;

  /** Unlock timestamp */
  unlockAt?: Date;

  /** Transaction hash */
  transactionHash: string;
}

/**
 * Standard data capability parameters
 */
export interface DataAnalyzeParams {
  /** Data type */
  dataType: 'price' | 'volume' | 'sentiment' | 'onchain';

  /** Assets to analyze */
  assets: string[];

  /** Time range */
  timeRange?: {
    start: Date;
    end: Date;
  };

  /** Analysis depth */
  depth?: 'basic' | 'detailed' | 'comprehensive';
}

/**
 * Standard data capability result
 */
export interface DataAnalyzeResult {
  /** Analysis results */
  results: Record<string, unknown>;

  /** Confidence score */
  confidence: number;

  /** Generated signals */
  signals?: Array<{
    type: 'buy' | 'sell' | 'hold';
    asset: string;
    strength: number;
    reasoning: string;
  }>;
}

// ============================================================================
// Capability Events
// ============================================================================

/**
 * Capability event types
 */
export type CapabilityEventType =
  | 'capability.registered'
  | 'capability.unregistered'
  | 'capability.executed'
  | 'capability.failed'
  | 'capability.updated';

/**
 * Capability event
 */
export interface CapabilityRegistryEvent {
  /** Event type */
  type: CapabilityEventType;

  /** Capability ID */
  capabilityId: CapabilityId;

  /** Provider ID */
  providerId?: AgentId;

  /** Event data */
  data: Record<string, unknown>;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Capability event handler
 */
export type CapabilityEventHandler = (event: CapabilityRegistryEvent) => void;

// ============================================================================
// Capability Builder Types
// ============================================================================

/**
 * Capability builder input
 */
export interface CapabilityBuilderInput {
  /** Capability ID */
  id: CapabilityId;

  /** Capability name */
  name: string;

  /** Category */
  category: CapabilityCategory;

  /** Description */
  description: string;

  /** Risk level */
  riskLevel: RiskLevel;

  /** Input schema */
  inputSchema: JSONSchemaType;

  /** Output schema */
  outputSchema: JSONSchemaType;

  /** Executor function */
  execute: (params: Record<string, unknown>, options?: ExecuteOptions) => Promise<ExecuteResult>;

  /** Optional estimator function */
  estimate?: (params: Record<string, unknown>) => Promise<CostEstimate>;

  /** Optional validator function */
  validate?: (params: Record<string, unknown>) => Promise<ValidationResult>;
}
