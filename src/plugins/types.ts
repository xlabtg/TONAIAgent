/**
 * TONAIAgent - Plugin System Type Definitions
 *
 * Core types for the modular plugin and tooling system.
 * Supports TON-native capabilities, extensibility, and AI integration.
 */

// ============================================================================
// Plugin Core Types
// ============================================================================

/**
 * Unique plugin identifier
 */
export type PluginId = string;

/**
 * Plugin version following semver
 */
export type PluginVersion = string;

/**
 * Plugin categories for organization and discovery
 */
export type PluginCategory =
  | 'ton-native'      // TON blockchain operations
  | 'defi'            // DeFi protocols and strategies
  | 'trading'         // Trading and market operations
  | 'analytics'       // Data analysis and insights
  | 'external'        // External API integrations
  | 'utility'         // General utilities
  | 'security'        // Security-related tools
  | 'communication'   // Messaging and notifications
  | 'storage'         // Data storage solutions
  | 'custom';         // User-defined plugins

/**
 * Plugin status in the registry
 */
export type PluginStatus =
  | 'active'          // Running and available
  | 'inactive'        // Loaded but not running
  | 'disabled'        // Administratively disabled
  | 'error'           // Failed to load or execute
  | 'updating'        // Being updated
  | 'pending_approval'; // Awaiting admin approval

/**
 * Plugin trust level
 */
export type PluginTrustLevel =
  | 'core'            // Built-in platform plugins
  | 'verified'        // Audited and verified
  | 'community'       // Community-contributed
  | 'experimental';   // Unverified/testing

// ============================================================================
// Plugin Manifest
// ============================================================================

/**
 * Plugin manifest describing the plugin's metadata and capabilities
 */
export interface PluginManifest {
  /** Unique plugin identifier */
  id: PluginId;

  /** Human-readable plugin name */
  name: string;

  /** Plugin version (semver) */
  version: PluginVersion;

  /** Plugin description */
  description: string;

  /** Plugin author information */
  author: PluginAuthor;

  /** Plugin category */
  category: PluginCategory;

  /** Trust level */
  trustLevel: PluginTrustLevel;

  /** Keywords for discovery */
  keywords: string[];

  /** Plugin homepage/documentation URL */
  homepage?: string;

  /** Repository URL */
  repository?: string;

  /** License identifier */
  license: string;

  /** Required permissions */
  permissions: PluginPermission[];

  /** Plugin dependencies */
  dependencies?: PluginDependency[];

  /** Minimum platform version required */
  minPlatformVersion?: string;

  /** Plugin capabilities and tools */
  capabilities: PluginCapabilities;

  /** Configuration schema */
  configSchema?: PluginConfigSchema;

  /** Plugin-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Plugin author information
 */
export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
  organization?: string;
}

/**
 * Plugin dependency specification
 */
export interface PluginDependency {
  pluginId: PluginId;
  version: string;
  optional?: boolean;
}

// ============================================================================
// Plugin Permissions
// ============================================================================

/**
 * Permission scope categories
 */
export type PermissionScope =
  | 'ton:read'            // Read TON blockchain data
  | 'ton:write'           // Write to TON blockchain
  | 'ton:sign'            // Sign transactions
  | 'wallet:read'         // Read wallet balances
  | 'wallet:transfer'     // Transfer funds
  | 'jettons:read'        // Read jetton data
  | 'jettons:transfer'    // Transfer jettons
  | 'jettons:swap'        // Swap jettons
  | 'nft:read'            // Read NFT data
  | 'nft:transfer'        // Transfer NFTs
  | 'nft:mint'            // Mint NFTs
  | 'defi:stake'          // Staking operations
  | 'defi:farm'           // Farming operations
  | 'defi:liquidity'      // Liquidity provision
  | 'network:outbound'    // Make external HTTP requests
  | 'storage:read'        // Read from storage
  | 'storage:write'       // Write to storage
  | 'secrets:read'        // Read secrets/API keys
  | 'memory:read'         // Read agent memory
  | 'memory:write'        // Write agent memory
  | 'agent:communicate'   // Communicate with other agents
  | 'admin:manage';       // Administrative operations

/**
 * Permission definition with constraints
 */
export interface PluginPermission {
  /** Permission scope */
  scope: PermissionScope;

  /** Permission reason/justification */
  reason: string;

  /** Optional constraints */
  constraints?: PermissionConstraints;

  /** Whether this permission is required */
  required: boolean;
}

/**
 * Permission constraints for fine-grained control
 */
export interface PermissionConstraints {
  /** Maximum transaction value (in TON) */
  maxTransactionValue?: number;

  /** Daily spending limit (in TON) */
  dailyLimit?: number;

  /** Allowed token addresses */
  allowedTokens?: string[];

  /** Allowed contract addresses */
  allowedContracts?: string[];

  /** Allowed external domains */
  allowedDomains?: string[];

  /** Rate limit (requests per minute) */
  rateLimit?: number;

  /** Custom constraints */
  custom?: Record<string, unknown>;
}

// ============================================================================
// Plugin Capabilities
// ============================================================================

/**
 * Plugin capabilities and exposed tools
 */
export interface PluginCapabilities {
  /** Tools exposed by this plugin */
  tools: ToolDefinition[];

  /** Event handlers */
  events?: EventHandler[];

  /** Scheduled tasks */
  scheduledTasks?: ScheduledTask[];

  /** Webhooks */
  webhooks?: WebhookDefinition[];

  /** Admin commands */
  adminCommands?: AdminCommand[];
}

/**
 * Tool definition for AI integration
 */
export interface ToolDefinition {
  /** Unique tool name */
  name: string;

  /** Tool description for AI */
  description: string;

  /** Tool category */
  category: ToolCategory;

  /** JSON Schema for parameters */
  parameters: ToolParameterSchema;

  /** JSON Schema for return value */
  returns?: ToolReturnSchema;

  /** Required permissions */
  requiredPermissions: PermissionScope[];

  /** Whether tool requires user confirmation */
  requiresConfirmation?: boolean;

  /** Estimated execution time (ms) */
  estimatedDurationMs?: number;

  /** Whether tool can be retried on failure */
  retryable?: boolean;

  /** Maximum retries */
  maxRetries?: number;

  /** Usage examples for AI */
  examples?: ToolExample[];

  /** Safety constraints */
  safetyConstraints?: ToolSafetyConstraints;
}

/**
 * Tool categories
 */
export type ToolCategory =
  | 'wallet'
  | 'transaction'
  | 'defi'
  | 'nft'
  | 'analytics'
  | 'trading'
  | 'communication'
  | 'storage'
  | 'utility';

/**
 * JSON Schema for tool parameters
 */
export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, ParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Parameter property definition
 */
export interface ParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: ParameterProperty;
  properties?: Record<string, ParameterProperty>;
  format?: string;
  examples?: unknown[];
}

/**
 * Tool return schema
 */
export interface ToolReturnSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  description?: string;
  properties?: Record<string, ParameterProperty>;
  items?: ParameterProperty;
}

/**
 * Tool usage example
 */
export interface ToolExample {
  description: string;
  input: Record<string, unknown>;
  output: unknown;
}

/**
 * Tool safety constraints
 */
export interface ToolSafetyConstraints {
  /** Maximum value per execution */
  maxValuePerExecution?: number;

  /** Require multi-sig above this value */
  requireMultiSigAbove?: number;

  /** Blocked addresses */
  blockedAddresses?: string[];

  /** Allowed addresses only */
  allowedAddressesOnly?: string[];

  /** Time window restrictions */
  timeWindowRestrictions?: TimeWindowRestriction[];

  /** Custom validation function name */
  customValidator?: string;
}

/**
 * Time window restriction
 */
export interface TimeWindowRestriction {
  /** Days of week (0-6, Sunday=0) */
  daysOfWeek?: number[];

  /** Start hour (0-23) */
  startHour?: number;

  /** End hour (0-23) */
  endHour?: number;

  /** Timezone */
  timezone?: string;
}

/**
 * Event handler definition
 */
export interface EventHandler {
  /** Event type to handle */
  eventType: string;

  /** Handler name */
  handler: string;

  /** Event filter */
  filter?: Record<string, unknown>;
}

/**
 * Scheduled task definition
 */
export interface ScheduledTask {
  /** Task name */
  name: string;

  /** Cron expression */
  schedule: string;

  /** Handler name */
  handler: string;

  /** Whether task is enabled */
  enabled: boolean;
}

/**
 * Webhook definition
 */
export interface WebhookDefinition {
  /** Webhook path */
  path: string;

  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /** Handler name */
  handler: string;

  /** Whether authentication is required */
  requiresAuth: boolean;
}

/**
 * Admin command definition
 */
export interface AdminCommand {
  /** Command name */
  name: string;

  /** Command description */
  description: string;

  /** Handler name */
  handler: string;

  /** Required admin role */
  requiredRole: 'admin' | 'superadmin';
}

// ============================================================================
// Plugin Configuration
// ============================================================================

/**
 * Plugin configuration schema
 */
export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

/**
 * Configuration property
 */
export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  default?: unknown;
  enum?: (string | number)[];
  secret?: boolean;
  required?: boolean;
  environmentVariable?: string;
}

/**
 * Plugin runtime configuration
 */
export interface PluginConfig {
  /** Whether plugin is enabled */
  enabled: boolean;

  /** Plugin-specific settings */
  settings: Record<string, unknown>;

  /** Permission overrides */
  permissionOverrides?: PermissionOverride[];

  /** Rate limit overrides */
  rateLimitOverrides?: RateLimitOverride;

  /** Resource limits */
  resourceLimits?: ResourceLimits;
}

/**
 * Permission override
 */
export interface PermissionOverride {
  scope: PermissionScope;
  action: 'allow' | 'deny' | 'restrict';
  constraints?: PermissionConstraints;
}

/**
 * Rate limit override
 */
export interface RateLimitOverride {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstLimit?: number;
}

/**
 * Resource limits for sandboxed execution
 */
export interface ResourceLimits {
  /** Maximum memory (MB) */
  maxMemoryMb: number;

  /** Maximum CPU time (ms) */
  maxCpuTimeMs: number;

  /** Maximum execution time (ms) */
  maxExecutionTimeMs: number;

  /** Maximum network requests per execution */
  maxNetworkRequests: number;

  /** Maximum storage operations per execution */
  maxStorageOperations: number;
}

// ============================================================================
// Plugin Instance
// ============================================================================

/**
 * Plugin instance representing a loaded and running plugin
 */
export interface PluginInstance {
  /** Plugin manifest */
  manifest: PluginManifest;

  /** Current status */
  status: PluginStatus;

  /** Runtime configuration */
  config: PluginConfig;

  /** Installation timestamp */
  installedAt: Date;

  /** Last activation timestamp */
  activatedAt?: Date;

  /** Last update timestamp */
  updatedAt?: Date;

  /** Error details if status is 'error' */
  error?: PluginError;

  /** Runtime metrics */
  metrics: PluginMetrics;

  /** Health status */
  health: PluginHealth;
}

/**
 * Plugin error information
 */
export interface PluginError {
  code: PluginErrorCode;
  message: string;
  stack?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

/**
 * Plugin error codes
 */
export type PluginErrorCode =
  | 'LOAD_FAILED'
  | 'INITIALIZATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'DEPENDENCY_MISSING'
  | 'CONFIGURATION_INVALID'
  | 'RUNTIME_ERROR'
  | 'TIMEOUT'
  | 'RESOURCE_EXHAUSTED'
  | 'SECURITY_VIOLATION'
  | 'VERSION_MISMATCH'
  | 'UNKNOWN_ERROR';

/**
 * Plugin runtime metrics
 */
export interface PluginMetrics {
  /** Total tool executions */
  totalExecutions: number;

  /** Successful executions */
  successfulExecutions: number;

  /** Failed executions */
  failedExecutions: number;

  /** Total execution time (ms) */
  totalExecutionTimeMs: number;

  /** Average execution time (ms) */
  avgExecutionTimeMs: number;

  /** Memory usage (bytes) */
  memoryUsageBytes: number;

  /** Last execution timestamp */
  lastExecutionAt?: Date;

  /** Metrics per tool */
  toolMetrics: Record<string, ToolMetrics>;
}

/**
 * Per-tool metrics
 */
export interface ToolMetrics {
  executions: number;
  successes: number;
  failures: number;
  avgDurationMs: number;
  lastExecutedAt?: Date;
}

/**
 * Plugin health status
 */
export interface PluginHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  checks: HealthCheck[];
}

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration?: number;
}

// ============================================================================
// Plugin Events
// ============================================================================

/**
 * Plugin event types
 */
export type PluginEventType =
  | 'plugin:installed'
  | 'plugin:activated'
  | 'plugin:deactivated'
  | 'plugin:updated'
  | 'plugin:uninstalled'
  | 'plugin:error'
  | 'plugin:config_changed'
  | 'tool:executed'
  | 'tool:failed'
  | 'permission:granted'
  | 'permission:denied'
  | 'permission:revoked';

/**
 * Plugin event
 */
export interface PluginEvent {
  id: string;
  type: PluginEventType;
  pluginId: PluginId;
  timestamp: Date;
  actor: EventActor;
  data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Event actor
 */
export interface EventActor {
  type: 'user' | 'agent' | 'system' | 'admin';
  id: string;
  name?: string;
}

/**
 * Plugin event callback
 */
export type PluginEventCallback = (event: PluginEvent) => void;

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  /** Request ID */
  requestId: string;

  /** Plugin ID */
  pluginId: PluginId;

  /** Tool name */
  toolName: string;

  /** Tool parameters */
  parameters: Record<string, unknown>;

  /** Execution context */
  context: ToolExecutionContext;

  /** Execution options */
  options?: ToolExecutionOptions;
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  /** User ID */
  userId: string;

  /** Agent ID */
  agentId: string;

  /** Session ID */
  sessionId: string;

  /** Request timestamp */
  timestamp: Date;

  /** Caller information */
  caller: 'ai' | 'user' | 'system' | 'scheduled';

  /** Transaction context if applicable */
  transactionContext?: TransactionContext;

  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Transaction context for financial operations
 */
export interface TransactionContext {
  /** Wallet address */
  walletAddress: string;

  /** Available balance */
  availableBalance: string;

  /** Daily spending used */
  dailySpendingUsed: string;

  /** Daily spending limit */
  dailySpendingLimit: string;

  /** Requires multi-sig */
  requiresMultiSig: boolean;
}

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  /** Timeout in milliseconds */
  timeoutMs?: number;

  /** Skip confirmation */
  skipConfirmation?: boolean;

  /** Dry run (simulate only) */
  dryRun?: boolean;

  /** Priority level */
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Request ID */
  requestId: string;

  /** Execution success */
  success: boolean;

  /** Result data */
  data?: unknown;

  /** Error if failed */
  error?: ToolExecutionError;

  /** Execution duration (ms) */
  durationMs: number;

  /** Resources used */
  resourcesUsed: ResourceUsage;

  /** Audit trail */
  auditTrail: AuditEntry[];
}

/**
 * Tool execution error
 */
export interface ToolExecutionError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * Resource usage metrics
 */
export interface ResourceUsage {
  cpuTimeMs: number;
  memoryPeakBytes: number;
  networkRequests: number;
  storageReads: number;
  storageWrites: number;
}

/**
 * Audit entry
 */
export interface AuditEntry {
  timestamp: Date;
  action: string;
  details: Record<string, unknown>;
}

// ============================================================================
// Plugin Lifecycle
// ============================================================================

/**
 * Plugin lifecycle interface that all plugins must implement
 */
export interface PluginLifecycle {
  /** Initialize plugin */
  initialize(context: PluginContext): Promise<void>;

  /** Start plugin */
  start(): Promise<void>;

  /** Stop plugin */
  stop(): Promise<void>;

  /** Health check */
  healthCheck(): Promise<PluginHealth>;

  /** Handle configuration change */
  onConfigChange?(config: PluginConfig): Promise<void>;

  /** Cleanup before uninstall */
  cleanup?(): Promise<void>;
}

/**
 * Plugin context provided during initialization
 */
export interface PluginContext {
  /** Plugin configuration */
  config: PluginConfig;

  /** Logger instance */
  logger: PluginLogger;

  /** Storage interface */
  storage: PluginStorage;

  /** Secrets manager */
  secrets: SecretsManager;

  /** Event emitter */
  events: PluginEventEmitter;

  /** HTTP client (sandboxed) */
  http: SandboxedHttpClient;

  /** TON client interface */
  ton: TonClientInterface;

  /** Other plugin interfaces */
  plugins: PluginInterop;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error, data?: Record<string, unknown>): void;
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * Secrets manager interface
 */
export interface SecretsManager {
  get(key: string): Promise<string | undefined>;
  has(key: string): Promise<boolean>;
}

/**
 * Plugin event emitter
 */
export interface PluginEventEmitter {
  emit(event: string, data: Record<string, unknown>): void;
  on(event: string, handler: (data: Record<string, unknown>) => void): void;
  off(event: string, handler: (data: Record<string, unknown>) => void): void;
}

/**
 * Sandboxed HTTP client
 */
export interface SandboxedHttpClient {
  get(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
  post(url: string, body: unknown, options?: HttpRequestOptions): Promise<HttpResponse>;
  put(url: string, body: unknown, options?: HttpRequestOptions): Promise<HttpResponse>;
  delete(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: number;
}

/**
 * HTTP response
 */
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  data: unknown;
}

/**
 * TON client interface for plugins
 */
export interface TonClientInterface {
  /** Get wallet balance */
  getBalance(address: string): Promise<string>;

  /** Get account info */
  getAccountInfo(address: string): Promise<AccountInfo>;

  /** Get transaction history */
  getTransactions(address: string, limit?: number): Promise<TonTransaction[]>;

  /** Prepare transaction */
  prepareTransaction(params: TransactionParams): Promise<PreparedTransaction>;

  /** Simulate transaction */
  simulateTransaction(tx: PreparedTransaction): Promise<SimulationResult>;

  /** Get jetton info */
  getJettonInfo(address: string): Promise<JettonInfo>;

  /** Get jetton balance */
  getJettonBalance(walletAddress: string, jettonAddress: string): Promise<string>;

  /** Get NFT info */
  getNftInfo(address: string): Promise<NftInfo>;

  /** Get contract state */
  getContractState(address: string): Promise<ContractState>;
}

/**
 * Account info
 */
export interface AccountInfo {
  address: string;
  balance: string;
  status: 'active' | 'frozen' | 'uninit';
  lastTransactionLt: string;
  code?: string;
  data?: string;
}

/**
 * TON transaction
 */
export interface TonTransaction {
  hash: string;
  lt: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  fee: string;
  status: 'success' | 'failed';
  message?: string;
}

/**
 * Transaction parameters
 */
export interface TransactionParams {
  to: string;
  value: string;
  payload?: string;
  stateInit?: string;
}

/**
 * Prepared transaction
 */
export interface PreparedTransaction {
  id: string;
  from: string;
  to: string;
  value: string;
  payload?: string;
  estimatedFee: string;
  validUntil: number;
}

/**
 * Simulation result
 */
export interface SimulationResult {
  success: boolean;
  exitCode: number;
  gasUsed: string;
  resultMessage?: string;
  trace?: string[];
}

/**
 * Jetton info
 */
export interface JettonInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  mintable: boolean;
  admin?: string;
  metadata?: Record<string, unknown>;
}

/**
 * NFT info
 */
export interface NftInfo {
  address: string;
  collectionAddress?: string;
  index: number;
  ownerAddress: string;
  metadata: NftMetadata;
}

/**
 * NFT metadata
 */
export interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

/**
 * Contract state
 */
export interface ContractState {
  address: string;
  balance: string;
  status: 'active' | 'frozen' | 'uninit';
  codeHash?: string;
  dataHash?: string;
}

/**
 * Plugin interoperability interface
 */
export interface PluginInterop {
  /** Call a tool from another plugin */
  callTool(pluginId: PluginId, toolName: string, params: Record<string, unknown>): Promise<unknown>;

  /** Check if plugin is available */
  isAvailable(pluginId: PluginId): boolean;

  /** Get plugin manifest */
  getManifest(pluginId: PluginId): PluginManifest | undefined;
}
