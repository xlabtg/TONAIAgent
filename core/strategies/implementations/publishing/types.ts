/**
 * TONAIAgent - Strategy Publishing System Types
 *
 * Type definitions for the Strategy Publishing System (Issue #217).
 * These types define the data structures for publishing, updating,
 * and managing strategies in the marketplace.
 */

// ============================================================================
// Core Types
// ============================================================================

/** Strategy visibility states */
export type StrategyVisibilityState = 'draft' | 'published' | 'hidden' | 'deprecated';

/** Risk level for strategies */
export type StrategyRiskLevel = 'low' | 'medium' | 'high';

/** Strategy category for marketplace */
export type StrategyPublishCategory =
  | 'momentum'
  | 'mean_reversion'
  | 'arbitrage'
  | 'grid_trading'
  | 'yield_farming'
  | 'trend_following'
  | 'dca'
  | 'scalping'
  | 'swing_trading'
  | 'experimental';

// ============================================================================
// Strategy Package Format
// ============================================================================

/**
 * Strategy package format for publishing.
 * This is the core data structure developers submit when publishing.
 */
export interface StrategyPackage {
  /** Unique strategy identifier (auto-generated if not provided) */
  strategy_id?: string;
  /** Display name */
  name: string;
  /** Strategy description */
  description: string;
  /** Semantic version */
  version: string;
  /** Author/developer ID */
  author: string;
  /** Display name of the author */
  author_name?: string;
  /** Supported trading pairs */
  supported_pairs: string[];
  /** Risk level assessment */
  risk_level: StrategyRiskLevel;
  /** Strategy category */
  category: StrategyPublishCategory;
  /** Recommended minimum capital in TON */
  recommended_capital?: number;
  /** Execution interval in seconds */
  execution_interval?: number;
  /** Tags for search and discovery */
  tags?: string[];
  /** Custom strategy parameters */
  parameters?: Record<string, StrategyParameter>;
}

/**
 * Strategy parameter definition
 */
export interface StrategyParameter {
  /** Parameter name */
  name: string;
  /** Parameter description */
  description: string;
  /** Parameter type */
  type: 'number' | 'string' | 'boolean' | 'select';
  /** Default value */
  default_value: unknown;
  /** Minimum value (for numbers) */
  min_value?: number;
  /** Maximum value (for numbers) */
  max_value?: number;
  /** Options (for select type) */
  options?: string[];
  /** Whether the parameter is required */
  required: boolean;
}

// ============================================================================
// Strategy Metadata
// ============================================================================

/**
 * Full strategy metadata stored in the registry
 */
export interface StrategyMetadata {
  /** Unique strategy identifier */
  strategy_id: string;
  /** Display name */
  name: string;
  /** Author/developer ID */
  author: string;
  /** Display name of the author */
  author_name: string;
  /** Strategy description */
  description: string;
  /** Current semantic version */
  version: string;
  /** Risk level */
  risk_level: StrategyRiskLevel;
  /** Strategy category */
  category: StrategyPublishCategory;
  /** Supported trading pairs */
  supported_pairs: string[];
  /** Recommended minimum capital */
  recommended_capital: number;
  /** Execution interval in seconds */
  execution_interval: number;
  /** Visibility state */
  status: StrategyVisibilityState;
  /** Whether the strategy is verified */
  verified: boolean;
  /** Tags for discovery */
  tags: string[];
  /** Strategy parameters */
  parameters: Record<string, StrategyParameter>;
  /** Creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
  /** Publication timestamp (if published) */
  published_at?: Date;
}

// ============================================================================
// Strategy Version
// ============================================================================

/**
 * Strategy version entry for version history
 */
export interface StrategyVersion {
  /** Strategy ID */
  strategy_id: string;
  /** Version string */
  version: string;
  /** Configuration at this version */
  config: StrategyPackage;
  /** Changelog for this version */
  changelog?: string;
  /** Version creation timestamp */
  created_at: Date;
  /** Whether this version is deprecated */
  deprecated: boolean;
}

// ============================================================================
// Strategy Performance Metrics
// ============================================================================

/**
 * Performance metrics tracked for each strategy
 */
export interface StrategyPerformanceMetrics {
  /** Strategy ID */
  strategy_id: string;
  /** Number of agents currently using this strategy */
  agents_using: number;
  /** Average ROI across all agents */
  avg_roi: number;
  /** Average maximum drawdown */
  avg_drawdown: number;
  /** Total number of trades executed */
  trade_count: number;
  /** Average win rate */
  avg_win_rate: number;
  /** Sharpe ratio */
  sharpe_ratio: number;
  /** Total capital under management */
  total_aum: number;
  /** Average user rating (1-5) */
  avg_rating: number;
  /** Number of ratings */
  rating_count: number;
  /** Last metrics update */
  updated_at: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to publish a new strategy
 */
export interface PublishStrategyRequest {
  /** Strategy package data */
  package: StrategyPackage;
}

/**
 * Response from publishing a strategy
 */
export interface PublishStrategyResponse {
  /** Generated or provided strategy ID */
  strategy_id: string;
  /** Publication status */
  status: 'published' | 'draft';
  /** Success message */
  message: string;
}

/**
 * Request to update an existing strategy
 */
export interface UpdateStrategyRequest {
  /** New version string */
  version: string;
  /** Updated description */
  description?: string;
  /** Changelog for this update */
  changelog?: string;
  /** Updated parameters */
  parameters?: Record<string, StrategyParameter>;
  /** Updated supported pairs */
  supported_pairs?: string[];
  /** Updated risk level */
  risk_level?: StrategyRiskLevel;
  /** Updated tags */
  tags?: string[];
  /** Updated recommended capital */
  recommended_capital?: number;
  /** Updated execution interval */
  execution_interval?: number;
}

/**
 * Response from updating a strategy
 */
export interface UpdateStrategyResponse {
  /** Strategy ID */
  strategy_id: string;
  /** New version */
  version: string;
  /** Update status */
  status: 'updated';
  /** Success message */
  message: string;
}

/**
 * Filter options for listing developer strategies
 */
export interface DeveloperStrategyFilter {
  /** Filter by status */
  status?: StrategyVisibilityState;
  /** Filter by category */
  category?: StrategyPublishCategory;
  /** Sort field */
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'agents_using';
  /** Sort order */
  sort_order?: 'asc' | 'desc';
  /** Result limit */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Response listing developer strategies
 */
export interface DeveloperStrategiesResponse {
  /** List of strategies */
  strategies: StrategyMetadata[];
  /** Total count */
  total: number;
  /** Current offset */
  offset: number;
  /** Page limit */
  limit: number;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result for strategy packages
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** List of validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field that caused the error */
  field?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Field that caused the warning */
  field?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event emitted by the publishing system
 */
export interface PublishingEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: PublishingEventType;
  /** Event timestamp */
  timestamp: Date;
  /** Strategy ID (if applicable) */
  strategy_id?: string;
  /** Developer ID */
  developer_id: string;
  /** Event data */
  data: Record<string, unknown>;
}

/**
 * Publishing event types
 */
export type PublishingEventType =
  | 'strategy_submitted'
  | 'strategy_validated'
  | 'strategy_published'
  | 'strategy_updated'
  | 'strategy_deprecated'
  | 'strategy_hidden'
  | 'validation_failed'
  | 'metrics_updated';

/**
 * Callback for publishing events
 */
export type PublishingEventCallback = (event: PublishingEvent) => void;
