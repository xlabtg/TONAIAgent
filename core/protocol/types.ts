/**
 * TONAIAgent - Open Agent Protocol Type Definitions
 *
 * Core types for the Open Agent Protocol that standardizes how autonomous
 * financial agents operate, communicate, and interact across ecosystems.
 */

// ============================================================================
// Agent Identity Types
// ============================================================================

/**
 * Unique agent identifier following OAP format: oap://<network>/<owner-type>/<owner-id>/<agent-id>
 */
export type AgentId = string;

/**
 * Supported network identifiers
 */
export type NetworkId =
  | 'ton'
  | 'ethereum'
  | 'bsc'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'solana';

/**
 * Agent ownership types
 */
export type OwnerType = 'user' | 'dao' | 'institution' | 'protocol';

/**
 * Agent identity representing a unique agent in the protocol
 */
export interface AgentIdentity {
  /** Unique protocol-wide identifier */
  id: AgentId;

  /** Human-readable name */
  name: string;

  /** Protocol version */
  protocolVersion: string;

  /** Network the agent operates on */
  network: NetworkId;

  /** Ownership information */
  ownership: AgentOwnership;

  /** On-chain registration (optional) */
  onChainIdentity?: OnChainIdentity;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Cryptographic proof of identity */
  proof?: IdentityProof;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent ownership details
 */
export interface AgentOwnership {
  /** Type of owner */
  type: OwnerType;

  /** Owner identifier */
  ownerId: string;

  /** Owner blockchain address */
  ownerAddress?: string;

  /** Addresses with delegated control */
  delegatedTo?: string[];

  /** Owner permissions over the agent */
  permissions: OwnerPermissions;
}

/**
 * Permissions granted to the owner
 */
export interface OwnerPermissions {
  /** Can transfer ownership */
  canTransfer: boolean;

  /** Can terminate agent */
  canTerminate: boolean;

  /** Can modify permissions */
  canModifyPermissions: boolean;

  /** Can withdraw funds */
  canWithdraw: boolean;

  /** Can delegate control */
  canDelegate: boolean;
}

/**
 * On-chain identity registration
 */
export interface OnChainIdentity {
  /** TON DNS or ENS name */
  domainName?: string;

  /** Smart contract address */
  contractAddress?: string;

  /** Registration transaction hash */
  registrationTx?: string;

  /** Verification status */
  verified: boolean;

  /** Verification timestamp */
  verifiedAt?: Date;
}

/**
 * Cryptographic identity proof
 */
export interface IdentityProof {
  /** Proof type */
  type: 'signature' | 'merkle' | 'zkp';

  /** Proof data */
  data: string;

  /** Public key or verifier */
  verifier: string;

  /** Signature timestamp */
  timestamp: Date;
}

// ============================================================================
// Capability Types
// ============================================================================

/**
 * Capability categories
 */
export type CapabilityCategory =
  | 'trading'
  | 'yield'
  | 'governance'
  | 'treasury'
  | 'data'
  | 'analytics'
  | 'notification'
  | 'custom';

/**
 * Unique capability identifier
 */
export type CapabilityId = string;

/**
 * Risk classification levels
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Capability declaration describing what an agent can do
 */
export interface CapabilityDeclaration {
  /** Unique capability identifier */
  id: CapabilityId;

  /** Human-readable name */
  name: string;

  /** Category of capability */
  category: CapabilityCategory;

  /** Detailed description */
  description: string;

  /** Required permissions to use this capability */
  requiredPermissions: string[];

  /** Resource requirements */
  resourceRequirements: ResourceRequirements;

  /** Input JSON schema */
  inputSchema: JSONSchemaType;

  /** Output JSON schema */
  outputSchema: JSONSchemaType;

  /** Risk classification */
  riskLevel: RiskLevel;

  /** Version */
  version: string;
}

/**
 * Capability manifest for an agent
 */
export interface CapabilityManifest {
  /** Agent identifier */
  agentId: AgentId;

  /** List of capabilities */
  capabilities: CapabilityDeclaration[];

  /** Supported protocols */
  protocols: ProtocolSupport[];

  /** Version information */
  version: string;

  /** Cryptographic signature */
  signature?: string;

  /** Last updated */
  updatedAt: Date;
}

/**
 * Protocol support declaration
 */
export interface ProtocolSupport {
  /** Protocol name */
  name: string;

  /** Protocol version */
  version: string;

  /** Supported operations */
  operations: string[];
}

/**
 * Resource requirements for capability execution
 */
export interface ResourceRequirements {
  /** Minimum capital required */
  minCapital?: number;

  /** Maximum capital allowed */
  maxCapital?: number;

  /** Estimated gas/fees */
  estimatedFees?: number;

  /** Required tokens */
  requiredTokens?: string[];

  /** Required approvals */
  requiredApprovals?: string[];
}

/**
 * Capability execution parameters
 */
export interface ExecuteParams {
  /** Capability ID */
  capabilityId: CapabilityId;

  /** Execution parameters */
  params: Record<string, unknown>;

  /** Execution options */
  options?: ExecuteOptions;
}

/**
 * Capability execution options
 */
export interface ExecuteOptions {
  /** Timeout in milliseconds */
  timeout?: number;

  /** Priority level */
  priority?: 'low' | 'normal' | 'high' | 'critical';

  /** Maximum retries */
  maxRetries?: number;

  /** Dry run (simulate only) */
  dryRun?: boolean;
}

/**
 * Capability execution result
 */
export interface ExecuteResult {
  /** Success status */
  success: boolean;

  /** Result data */
  data?: unknown;

  /** Error message if failed */
  error?: string;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Transaction hash if applicable */
  transactionHash?: string;

  /** Gas/fees used */
  feesUsed?: number;
}

/**
 * Capability status
 */
export interface CapabilityStatus {
  /** Capability ID */
  capabilityId: CapabilityId;

  /** Available for use */
  available: boolean;

  /** Current load */
  currentLoad: number;

  /** Maximum concurrent executions */
  maxConcurrent: number;

  /** Rate limits */
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
}

/**
 * Cost estimate for capability execution
 */
export interface CostEstimate {
  /** Estimated gas/transaction fees */
  fees: number;

  /** Fee currency */
  feeCurrency: string;

  /** Estimated execution time */
  estimatedTime: number;

  /** Price impact (for swaps) */
  priceImpact?: number;

  /** Confidence level */
  confidence: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Valid parameters */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Warnings */
  warnings: string[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Parameter path */
  path: string;

  /** Error message */
  message: string;

  /** Error code */
  code: string;
}

// ============================================================================
// Messaging Types
// ============================================================================

/**
 * Message identifier
 */
export type MessageId = string;

/**
 * Message priority levels
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Protocol message types
 */
export type ProtocolMessageType =
  | 'capability.request'
  | 'capability.response'
  | 'task.delegate'
  | 'task.accept'
  | 'task.reject'
  | 'task.complete'
  | 'signal.publish'
  | 'risk.alert'
  | 'state.sync'
  | 'heartbeat'
  | 'discovery.query'
  | 'discovery.response';

/**
 * Broadcast scope
 */
export type BroadcastScope = 'swarm' | 'network' | 'global';

/**
 * Message target types
 */
export type MessageTarget =
  | { type: 'agent'; agentId: AgentId }
  | { type: 'role'; role: string }
  | { type: 'broadcast'; scope: BroadcastScope }
  | { type: 'topic'; topic: string };

/**
 * Protocol message header
 */
export interface MessageHeader {
  /** Unique message identifier */
  id: MessageId;

  /** Protocol version */
  version: string;

  /** Message type */
  type: ProtocolMessageType;

  /** Sender identity */
  sender: AgentId;

  /** Target(s) */
  target: MessageTarget;

  /** Creation timestamp */
  timestamp: Date;

  /** Expiration timestamp */
  expiresAt?: Date;

  /** Correlation ID for request/response */
  correlationId?: string;

  /** Reply-to message ID */
  replyTo?: string;

  /** Priority level */
  priority: MessagePriority;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Protocol message
 */
export interface ProtocolMessage {
  /** Message header */
  header: MessageHeader;

  /** Message payload */
  payload: unknown;

  /** Cryptographic signature */
  signature?: string;
}

/**
 * Message subscriber
 */
export interface MessageSubscriber {
  /** Subscriber ID */
  id: string;

  /** Subscribed topics/filters */
  filters: MessageFilter[];

  /** Handler function */
  handler: (message: ProtocolMessage) => Promise<void>;
}

/**
 * Message filter
 */
export interface MessageFilter {
  /** Filter by message type */
  type?: ProtocolMessageType | ProtocolMessageType[];

  /** Filter by sender */
  sender?: AgentId | AgentId[];

  /** Filter by topic */
  topic?: string;
}

/**
 * Capability event callback
 */
export type CapabilityEventCallback = (event: CapabilityEvent) => void;

/**
 * Capability event
 */
export interface CapabilityEvent {
  /** Event type */
  type: 'started' | 'progress' | 'completed' | 'failed';

  /** Capability ID */
  capabilityId: CapabilityId;

  /** Event data */
  data: unknown;

  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Security Types
// ============================================================================

/**
 * Permission set for an agent
 */
export interface PermissionSet {
  /** Unique identifier */
  id: string;

  /** Subject of permissions */
  subject: AgentId;

  /** Trading permissions */
  trading: TradingPermissions;

  /** Transfer permissions */
  transfers: TransferPermissions;

  /** Staking permissions */
  staking: StakingPermissions;

  /** Governance permissions */
  governance: GovernancePermissions;

  /** Resource limits */
  limits: ProtocolResourceLimits;

  /** Time constraints */
  timeConstraints?: TimeConstraints;

  /** Created timestamp */
  createdAt: Date;

  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Trading permissions
 */
export interface TradingPermissions {
  /** Trading enabled */
  enabled: boolean;

  /** Allowed operations */
  allowedOperations: ('swap' | 'limit' | 'market' | 'stop')[];

  /** Allowed tokens ('*' for all) */
  allowedTokens: string[] | '*';

  /** Allowed protocols ('*' for all) */
  allowedProtocols: string[] | '*';

  /** Maximum slippage percentage */
  maxSlippage: number;

  /** Maximum transaction value */
  maxTransactionValue: number;

  /** Daily limit */
  dailyLimit: number;
}

/**
 * Transfer permissions
 */
export interface TransferPermissions {
  /** Transfers enabled */
  enabled: boolean;

  /** Whitelist only mode */
  whitelistOnly: boolean;

  /** Allowed destinations */
  allowedDestinations: string[];

  /** Maximum transfer value */
  maxTransferValue: number;

  /** Daily limit */
  dailyLimit: number;

  /** Requires approval above threshold */
  requiresApproval: boolean;

  /** Approval threshold */
  approvalThreshold: number;
}

/**
 * Staking permissions
 */
export interface StakingPermissions {
  /** Staking enabled */
  enabled: boolean;

  /** Allowed validators */
  allowedValidators: string[] | '*';

  /** Maximum stake percentage */
  maxStakePercent: number;

  /** Minimum lock period */
  minLockPeriod?: number;
}

/**
 * Governance permissions
 */
export interface GovernancePermissions {
  /** Governance participation enabled */
  enabled: boolean;

  /** Can vote */
  canVote: boolean;

  /** Can propose */
  canPropose: boolean;

  /** Can delegate */
  canDelegate: boolean;

  /** Allowed protocols */
  allowedProtocols: string[] | '*';
}

/**
 * Resource limits
 */
export interface ProtocolResourceLimits {
  /** Maximum capital allocation */
  maxCapitalAllocation: number;

  /** Maximum positions */
  maxPositions: number;

  /** Maximum leverage */
  maxLeverage: number;

  /** Maximum drawdown percentage */
  maxDrawdown: number;

  /** Daily transaction count limit */
  dailyTransactionCount: number;
}

/**
 * Time constraints
 */
export interface TimeConstraints {
  /** Valid from timestamp */
  validFrom?: Date;

  /** Valid until timestamp */
  validUntil?: Date;

  /** Operating hours */
  operatingHours?: {
    start: string;
    end: string;
    timezone: string;
    daysOfWeek: number[];
  };
}

/**
 * Transaction policy
 */
export interface TransactionPolicy {
  /** Policy identifier */
  id: string;

  /** Policy name */
  name: string;

  /** Conditions for policy to apply */
  conditions: PolicyCondition[];

  /** Required actions */
  requirements: PolicyRequirement[];

  /** Priority (higher = checked first) */
  priority: number;

  /** Active status */
  active: boolean;
}

/**
 * Policy condition
 */
export interface PolicyCondition {
  /** Condition type */
  type: 'amount' | 'token' | 'protocol' | 'time' | 'frequency' | 'destination';

  /** Operator */
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'in' | 'not_in';

  /** Value to compare */
  value: unknown;
}

/**
 * Policy requirement
 */
export interface PolicyRequirement {
  /** Requirement type */
  type: 'approval' | 'delay' | 'limit' | 'notification' | 'multisig';

  /** Requirement parameters */
  params: Record<string, unknown>;
}

// ============================================================================
// Reputation Types
// ============================================================================

/**
 * Agent reputation
 */
export interface AgentReputation {
  /** Agent identifier */
  agentId: AgentId;

  /** Overall reputation score (0-1000) */
  overallScore: number;

  /** Component scores */
  components: ReputationComponents;

  /** Historical data */
  history: ReputationHistory[];

  /** Verification status */
  verification: VerificationStatus;

  /** Last updated */
  updatedAt: Date;
}

/**
 * Reputation components
 */
export interface ReputationComponents {
  /** Performance score (returns, consistency) */
  performance: ComponentScore;

  /** Reliability score (uptime, task completion) */
  reliability: ComponentScore;

  /** Risk management score */
  riskManagement: ComponentScore;

  /** Protocol adherence */
  compliance: ComponentScore;

  /** Community endorsements */
  endorsements: ComponentScore;
}

/**
 * Component score
 */
export interface ComponentScore {
  /** Score (0-1000) */
  score: number;

  /** Confidence level (0-1) */
  confidence: number;

  /** Sample size */
  sampleSize: number;

  /** Score trend */
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Reputation history entry
 */
export interface ReputationHistory {
  /** Timestamp */
  timestamp: Date;

  /** Overall score at time */
  score: number;

  /** Event that affected score */
  event?: string;

  /** Score delta */
  delta: number;
}

/**
 * Verification status
 */
export interface VerificationStatus {
  /** Identity verified */
  identityVerified: boolean;

  /** Code audited */
  codeAudited: boolean;

  /** Performance verified */
  performanceVerified: boolean;

  /** Verification badges */
  badges: VerificationBadge[];
}

/**
 * Verification badge
 */
export interface VerificationBadge {
  /** Badge type */
  type: 'identity' | 'audit' | 'performance' | 'community' | 'protocol';

  /** Badge name */
  name: string;

  /** Awarded by */
  issuedBy: string;

  /** Issued at */
  issuedAt: Date;

  /** Expiry date */
  expiresAt?: Date;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Total return percentage */
  totalReturn: number;

  /** Sharpe ratio */
  sharpeRatio: number;

  /** Sortino ratio */
  sortinoRatio: number;

  /** Maximum drawdown percentage */
  maxDrawdown: number;

  /** Win rate percentage */
  winRate: number;

  /** Average winning trade */
  averageWin: number;

  /** Average losing trade */
  averageLoss: number;

  /** Profit factor */
  profitFactor: number;

  /** Total number of trades */
  totalTrades: number;

  /** Trading frequency per day */
  tradingFrequency: number;

  /** Average holding time in hours */
  averageHoldTime: number;

  /** Volatility percentage */
  volatility: number;

  /** Daily Value at Risk */
  varDaily: number;

  /** Beta to market */
  betaToMarket: number;

  /** Time period */
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';

  /** Start date */
  startDate: Date;

  /** End date */
  endDate: Date;
}

// ============================================================================
// Plugin Types
// ============================================================================

/**
 * Protocol plugin
 */
export interface ProtocolPlugin {
  /** Plugin metadata */
  metadata: PluginMetadata;

  /** Provided capabilities */
  capabilities: CapabilityDeclaration[];

  /** Required dependencies */
  dependencies: PluginDependency[];

  /** Configuration schema */
  configSchema: JSONSchemaType;

  /** Plugin lifecycle hooks */
  lifecycle: PluginLifecycle;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Unique plugin ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Version */
  version: string;

  /** Description */
  description: string;

  /** Author */
  author: string;

  /** License */
  license: string;

  /** Repository URL */
  repository?: string;

  /** Tags */
  tags: string[];
}

/**
 * Plugin dependency
 */
export interface PluginDependency {
  /** Plugin ID */
  pluginId: string;

  /** Version constraint */
  version: string;

  /** Optional dependency */
  optional: boolean;
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginLifecycle {
  /** Called when plugin is loaded */
  onLoad(context: PluginContext): Promise<void>;

  /** Called when plugin is enabled */
  onEnable(config: unknown): Promise<void>;

  /** Called when plugin is disabled */
  onDisable(): Promise<void>;

  /** Called when plugin is unloaded */
  onUnload(): Promise<void>;
}

/**
 * Plugin context provided to plugins
 */
export interface PluginContext {
  /** Protocol instance */
  protocol: unknown;

  /** Logger */
  logger: PluginLogger;

  /** Storage */
  storage: PluginStorage;

  /** Event emitter */
  events: PluginEvents;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * Plugin events interface
 */
export interface PluginEvents {
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): () => void;
}

/**
 * Tool category
 */
export type ToolCategory =
  | 'blockchain'
  | 'defi'
  | 'data'
  | 'analytics'
  | 'notification'
  | 'storage'
  | 'external_api';

/**
 * Protocol tool
 */
export interface ProtocolTool {
  /** Tool identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description */
  description: string;

  /** Category */
  category: ToolCategory;

  /** Input schema */
  inputSchema: JSONSchemaType;

  /** Output schema */
  outputSchema: JSONSchemaType;

  /** Execute tool */
  execute(input: unknown): Promise<ToolResult>;

  /** Estimate cost */
  estimateCost(input: unknown): Promise<CostEstimate>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  /** Success status */
  success: boolean;

  /** Result data */
  data?: unknown;

  /** Error message */
  error?: string;

  /** Execution time */
  executionTime: number;
}

// ============================================================================
// Cross-Chain Types
// ============================================================================

/**
 * Chain identifier
 */
export type ChainId = NetworkId;

/**
 * Bridge identifier
 */
export type BridgeId = string;

/**
 * Chain adapter interface
 */
export interface ChainAdapter {
  /** Chain identifier */
  chainId: ChainId;

  /** Chain name */
  name: string;

  /** Native token */
  nativeToken: TokenInfo;

  /** Supported operations */
  operations: ChainOperation[];

  /** Get wallet balance */
  getBalance(address: string, token?: string): Promise<Balance>;

  /** Execute transaction */
  executeTransaction(tx: Transaction): Promise<TransactionResult>;

  /** Query state */
  queryState(query: StateQuery): Promise<unknown>;
}

/**
 * Token information
 */
export interface TokenInfo {
  /** Token symbol */
  symbol: string;

  /** Token name */
  name: string;

  /** Decimals */
  decimals: number;

  /** Contract address */
  address?: string;
}

/**
 * Chain operation
 */
export interface ChainOperation {
  /** Operation name */
  name: string;

  /** Operation type */
  type: 'read' | 'write';

  /** Description */
  description: string;
}

/**
 * Balance information
 */
export interface Balance {
  /** Token */
  token: TokenInfo;

  /** Balance amount */
  amount: string;

  /** USD value */
  valueUsd?: number;
}

/**
 * Transaction
 */
export interface Transaction {
  /** Chain ID */
  chainId: ChainId;

  /** Sender address */
  from: string;

  /** Recipient address */
  to: string;

  /** Value */
  value: string;

  /** Data */
  data?: string;

  /** Gas limit */
  gasLimit?: string;
}

/**
 * Transaction result
 */
export interface TransactionResult {
  /** Success status */
  success: boolean;

  /** Transaction hash */
  hash?: string;

  /** Block number */
  blockNumber?: number;

  /** Gas used */
  gasUsed?: string;

  /** Error message */
  error?: string;
}

/**
 * State query
 */
export interface StateQuery {
  /** Query type */
  type: string;

  /** Query parameters */
  params: Record<string, unknown>;
}

/**
 * Cross-chain message type
 */
export type CrossChainMessageType =
  | 'asset_transfer'
  | 'data_sync'
  | 'capability_request'
  | 'coordination';

/**
 * Cross-chain message
 */
export interface CrossChainMessage {
  /** Source chain */
  sourceChain: ChainId;

  /** Source agent */
  sourceAgent: AgentId;

  /** Destination chain */
  destChain: ChainId;

  /** Destination agent or address */
  destination: string;

  /** Message type */
  type: CrossChainMessageType;

  /** Payload */
  payload: unknown;

  /** Bridge to use */
  bridge?: BridgeId;
}

/**
 * Unified asset
 */
export interface UnifiedAsset {
  /** Protocol-wide asset identifier */
  assetId: string;

  /** Asset symbol */
  symbol: string;

  /** Asset name */
  name: string;

  /** Decimals */
  decimals: number;

  /** Chain representations */
  chains: ChainAsset[];

  /** Price (USD) */
  priceUsd?: number;

  /** Market cap */
  marketCap?: number;
}

/**
 * Chain-specific asset representation
 */
export interface ChainAsset {
  /** Chain ID */
  chainId: ChainId;

  /** Contract address */
  address: string;

  /** Verified status */
  verified: boolean;

  /** Supported bridges */
  bridgeSupport: BridgeId[];
}

// ============================================================================
// Governance Types
// ============================================================================

/**
 * Proposal type
 */
export type ProposalType =
  | 'protocol_upgrade'
  | 'parameter_change'
  | 'treasury_allocation'
  | 'emergency_action'
  | 'plugin_approval';

/**
 * Proposal status
 */
export type ProposalStatus =
  | 'draft'
  | 'active'
  | 'succeeded'
  | 'defeated'
  | 'executed'
  | 'cancelled'
  | 'expired';

/**
 * Vote type
 */
export type VoteType = 'for' | 'against' | 'abstain';

/**
 * Proposal
 */
export interface Proposal {
  /** Proposal ID */
  id: string;

  /** Proposal type */
  type: ProposalType;

  /** Title */
  title: string;

  /** Description */
  description: string;

  /** Proposer */
  proposer: string;

  /** Actions to execute */
  actions: ProposalAction[];

  /** Voting start time */
  votingStart: Date;

  /** Voting end time */
  votingEnd: Date;

  /** Execution delay in seconds */
  executionDelay: number;

  /** Current status */
  status: ProposalStatus;

  /** Vote tally */
  votes: VoteTally;

  /** Required quorum */
  quorum: number;

  /** Required threshold */
  threshold: number;

  /** Created at */
  createdAt: Date;

  /** Executed at */
  executedAt?: Date;
}

/**
 * Proposal action
 */
export interface ProposalAction {
  /** Target contract/address */
  target: string;

  /** Function/method to call */
  method: string;

  /** Parameters */
  params: unknown[];

  /** Value to send */
  value?: string;
}

/**
 * Vote tally
 */
export interface VoteTally {
  /** Votes for */
  forVotes: number;

  /** Votes against */
  againstVotes: number;

  /** Abstain votes */
  abstainVotes: number;

  /** Total votes */
  totalVotes: number;

  /** Total voting power at snapshot */
  totalVotingPower: number;
}

/**
 * Vote
 */
export interface Vote {
  /** Voter address */
  voter: string;

  /** Proposal ID */
  proposalId: string;

  /** Vote type */
  vote: VoteType;

  /** Voting power */
  votingPower: number;

  /** Reason */
  reason?: string;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Proposal input
 */
export interface ProposalInput {
  /** Proposal type */
  type: ProposalType;

  /** Title */
  title: string;

  /** Description */
  description: string;

  /** Actions */
  actions: ProposalAction[];

  /** Voting duration in seconds */
  votingDuration?: number;
}

/**
 * Vote result
 */
export interface VoteResult {
  /** Success status */
  success: boolean;

  /** Transaction hash */
  transactionHash?: string;

  /** Error message */
  error?: string;
}

/**
 * Execution result
 */
export interface ProtocolExecutionResult {
  /** Success status */
  success: boolean;

  /** Results from each action */
  actionResults: ActionResult[];

  /** Error message */
  error?: string;
}

/**
 * Action result
 */
export interface ActionResult {
  /** Action index */
  index: number;

  /** Success status */
  success: boolean;

  /** Return data */
  returnData?: unknown;

  /** Error message */
  error?: string;
}

// ============================================================================
// Protocol Events
// ============================================================================

/**
 * Protocol event types
 */
export type ProtocolEventType =
  | 'agent.created'
  | 'agent.updated'
  | 'agent.terminated'
  | 'capability.registered'
  | 'capability.executed'
  | 'message.sent'
  | 'message.received'
  | 'permission.granted'
  | 'permission.revoked'
  | 'reputation.updated'
  | 'plugin.loaded'
  | 'plugin.unloaded'
  | 'proposal.created'
  | 'proposal.voted'
  | 'proposal.executed';

/**
 * Protocol event
 */
export interface ProtocolEvent {
  /** Event ID */
  id: string;

  /** Event type */
  type: ProtocolEventType;

  /** Event source */
  source: string;

  /** Event data */
  data: Record<string, unknown>;

  /** Timestamp */
  timestamp: Date;

  /** Severity */
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * JSON Schema type (simplified)
 */
export interface JSONSchemaType {
  type: string;
  properties?: Record<string, JSONSchemaType>;
  required?: string[];
  items?: JSONSchemaType;
  enum?: unknown[];
  description?: string;
  default?: unknown;
}

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;
