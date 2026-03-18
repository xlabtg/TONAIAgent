/**
 * TONAIAgent - TON Smart Contract Factory Types
 *
 * Type definitions for the TON-native Smart Contract Factory system
 * covering factory contracts, agent wallets, strategy execution,
 * on-chain registry, fee management, and security.
 */

// ============================================================================
// Common Types
// ============================================================================

/** TON blockchain address (raw or user-friendly format) */
export type TonAddress = string;

/** Unique identifier for factory-managed entities */
export type FactoryId = string;

/** Agent identifier within the factory system */
export type AgentId = string;

/** Strategy identifier */
export type StrategyId = string;

/** Contract version string (semver) */
export type ContractVersion = string;

/** TON workchain identifier */
export type WorkchainId = 0 | -1;

/** Agent wallet custody mode */
export type WalletMode = 'non-custodial' | 'mpc' | 'smart-contract';

/** Agent operational status */
export type AgentStatus = 'active' | 'paused' | 'stopped' | 'error' | 'upgrading';

/** Strategy execution status */
export type StrategyStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'stopped';

/** Transaction type on TON */
export type TonTransactionType =
  | 'transfer'
  | 'jetton_transfer'
  | 'nft_transfer'
  | 'swap'
  | 'provide_liquidity'
  | 'remove_liquidity'
  | 'stake'
  | 'unstake'
  | 'farm'
  | 'dao_vote'
  | 'contract_deploy'
  | 'contract_call';

/** Risk level classification */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Fee type */
export type FeeType = 'performance' | 'protocol' | 'marketplace' | 'referral' | 'gas';

// ============================================================================
// Factory Contract Types
// ============================================================================

/** Configuration for the Factory Contract */
export interface FactoryConfig {
  /** Factory contract owner address */
  owner: TonAddress;
  /** Protocol fee recipient treasury address */
  treasury: TonAddress;
  /** Current factory contract version */
  version: ContractVersion;
  /** Minimum deployment fee in nanoTON */
  deploymentFee: bigint;
  /** Protocol fee percentage (basis points, e.g. 100 = 1%) */
  protocolFeeBps: number;
  /** Maximum agents per user */
  maxAgentsPerUser: number;
  /** Whether factory accepts new deployments */
  acceptingDeployments: boolean;
  /** Supported workchains */
  workchains: WorkchainId[];
}

/** Input for deploying an Agent Wallet Contract */
export interface DeployAgentInput {
  /** Telegram user or owner ID */
  ownerId: string;
  /** Owner's TON wallet address */
  ownerAddress: TonAddress;
  /** Desired wallet mode */
  walletMode: WalletMode;
  /** Optional custom agent name */
  name?: string;
  /** Optional MPC configuration (required for 'mpc' mode) */
  mpcConfig?: MPCConfig;
  /** Optional smart contract wallet configuration */
  scWalletConfig?: SmartContractWalletConfig;
  /** Initial strategy to deploy (optional) */
  initialStrategy?: DeployStrategyInput;
  /** Referrer address for referral rewards */
  referrer?: TonAddress;
}

/** Input for deploying a Strategy Contract */
export interface DeployStrategyInput {
  /** Agent this strategy belongs to */
  agentId: AgentId;
  /** Strategy type identifier */
  strategyType: string;
  /** Strategy parameters (serializable) */
  params: Record<string, unknown>;
  /** Strategy version */
  version: ContractVersion;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Maximum gas budget in nanoTON */
  maxGasBudget: bigint;
  /** Auto-stop conditions */
  stopConditions?: StrategyStopConditions;
  /** Optional pre-deployed on-chain contract address */
  contractAddress?: TonAddress;
}

/** Deployment result */
export interface DeploymentResult {
  /** Unique deployment ID */
  deploymentId: FactoryId;
  /** Deployed contract address */
  contractAddress: TonAddress;
  /** Agent ID assigned by factory */
  agentId: AgentId;
  /** Transaction hash of deployment */
  txHash: string;
  /** Block sequence number */
  blockSeqno: number;
  /** Deployment fee paid in nanoTON */
  feePaid: bigint;
  /** Timestamp of deployment */
  deployedAt: Date;
  /** Contract version deployed */
  version: ContractVersion;
}

/** Factory health statistics */
export interface FactoryStats {
  /** Total agents deployed */
  totalAgentsDeployed: number;
  /** Currently active agents */
  activeAgents: number;
  /** Total strategies deployed */
  totalStrategiesDeployed: number;
  /** Total fees collected in nanoTON */
  totalFeesCollected: bigint;
  /** Total volume processed in nanoTON */
  totalVolumeProcessed: bigint;
  /** Factory uptime in seconds */
  uptimeSeconds: number;
  /** Current factory version */
  version: ContractVersion;
}

// ============================================================================
// Agent Wallet Types
// ============================================================================

/** Agent wallet base information */
export interface AgentWallet {
  /** Unique agent identifier */
  agentId: AgentId;
  /** On-chain contract address */
  contractAddress: TonAddress;
  /** Owner's address */
  ownerAddress: TonAddress;
  /** Wallet custody mode */
  mode: WalletMode;
  /** Current balance in nanoTON */
  balance: bigint;
  /** Current operational status */
  status: AgentStatus;
  /** Contract version */
  version: ContractVersion;
  /** Creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
}

/** MPC (Multi-Party Computation) configuration */
export interface MPCConfig {
  /** Threshold for signature (e.g. 2 for 2-of-3) */
  threshold: number;
  /** Total number of parties */
  parties: number;
  /** Party public keys */
  partyPublicKeys: string[];
  /** Key derivation path */
  keyPath?: string;
}

/** Smart Contract Wallet configuration */
export interface SmartContractWalletConfig {
  /** Spending limit per transaction in nanoTON */
  txSpendingLimit: bigint;
  /** Daily spending limit in nanoTON */
  dailySpendingLimit: bigint;
  /** Whitelisted destination addresses */
  whitelistedAddresses: TonAddress[];
  /** Allowed transaction types */
  allowedTxTypes: TonTransactionType[];
  /** Require multi-sig for large transactions */
  requireMultiSigAbove: bigint;
  /** Multi-sig co-signers */
  coSigners?: TonAddress[];
  /** Time-lock delay for large transactions (seconds) */
  timeLockSeconds?: number;
  /** Emergency stop address */
  emergencyStopAddress?: TonAddress;
}

/** Non-custodial wallet configuration */
export interface NonCustodialConfig {
  /** User's public key */
  publicKey: string;
  /** Wallet type (v3, v4, v5) */
  walletType: 'v3r1' | 'v3r2' | 'v4r2' | 'v5r1';
  /** Subwallet ID */
  subwalletId?: number;
}

/** Agent transaction request */
export interface AgentTransaction {
  /** Transaction ID */
  txId: string;
  /** Source agent wallet */
  agentId: AgentId;
  /** Transaction type */
  type: TonTransactionType;
  /** Destination address */
  to: TonAddress;
  /** Amount in nanoTON */
  amount: bigint;
  /** Optional payload (base64 encoded BoC) */
  payload?: string;
  /** Jetton address (for jetton transfers) */
  jettonAddress?: TonAddress;
  /** Gas limit */
  gasLimit?: bigint;
  /** Strategy that triggered this transaction */
  strategyId?: StrategyId;
}

/** Transaction result */
export interface TransactionResult {
  /** Transaction hash */
  txHash: string;
  /** Whether transaction succeeded */
  success: boolean;
  /** Block sequence number */
  blockSeqno?: number;
  /** Gas used in nanoTON */
  gasUsed?: bigint;
  /** Exit code from contract */
  exitCode?: number;
  /** Error message if failed */
  error?: string;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Strategy Execution Types
// ============================================================================

/** Strategy definition */
export interface Strategy {
  /** Strategy ID */
  strategyId: StrategyId;
  /** Agent this strategy belongs to */
  agentId: AgentId;
  /** Strategy type */
  type: string;
  /** Strategy parameters */
  params: Record<string, unknown>;
  /** Current status */
  status: StrategyStatus;
  /** Version */
  version: ContractVersion;
  /** Risk level */
  riskLevel: RiskLevel;
  /** On-chain contract address (if deployed) */
  contractAddress?: TonAddress;
  /** Maximum gas budget */
  maxGasBudget: bigint;
  /** Gas used so far */
  gasUsed: bigint;
  /** Auto-stop conditions */
  stopConditions?: StrategyStopConditions;
  /** Performance metrics */
  performance: StrategyPerformance;
  /** Scheduled execution (cron expression or interval) */
  schedule?: StrategySchedule;
  /** Creation timestamp */
  createdAt: Date;
  /** Last execution timestamp */
  lastExecutedAt?: Date;
}

/** Conditions that trigger strategy auto-stop */
export interface StrategyStopConditions {
  /** Stop if loss exceeds this amount in nanoTON */
  maxLoss?: bigint;
  /** Stop after this many executions */
  maxExecutions?: number;
  /** Stop after this timestamp */
  expiresAt?: Date;
  /** Stop if gas budget exceeded */
  stopOnGasExhaustion?: boolean;
  /** Stop if risk level increases above threshold */
  maxRiskLevel?: RiskLevel;
}

/** Strategy performance metrics */
export interface StrategyPerformance {
  /** Total profit/loss in nanoTON */
  totalPnl: bigint;
  /** Number of successful executions */
  successfulExecutions: number;
  /** Number of failed executions */
  failedExecutions: number;
  /** Total gas spent */
  totalGasSpent: bigint;
  /** Win rate (0-100) */
  winRate: number;
  /** Average execution time (ms) */
  avgExecutionTimeMs: number;
  /** Last updated */
  updatedAt: Date;
}

/** Strategy execution schedule */
export interface StrategySchedule {
  /** Cron expression (e.g. "0 * * * *") */
  cron?: string;
  /** Fixed interval in seconds */
  intervalSeconds?: number;
  /** Next scheduled execution */
  nextRunAt?: Date;
  /** Timezone for cron */
  timezone?: string;
}

/** Strategy execution context */
export interface ExecutionContext {
  /** Execution ID */
  executionId: string;
  /** Strategy being executed */
  strategyId: StrategyId;
  /** Agent executing the strategy */
  agentId: AgentId;
  /** Market data snapshot */
  marketData?: Record<string, unknown>;
  /** Available balance for this execution */
  availableBalance: bigint;
  /** Gas budget for this execution */
  gasBudget: bigint;
  /** Execution start timestamp */
  startedAt: Date;
}

/** Strategy execution result */
export interface ExecutionResult {
  /** Execution ID */
  executionId: string;
  /** Strategy ID */
  strategyId: StrategyId;
  /** Whether execution succeeded */
  success: boolean;
  /** Transactions submitted */
  transactions: TransactionResult[];
  /** Total gas used */
  gasUsed: bigint;
  /** Profit/loss for this execution */
  pnl: bigint;
  /** Execution duration in ms */
  durationMs: number;
  /** Error message if failed */
  error?: string;
  /** Timestamp */
  completedAt: Date;
}

// ============================================================================
// On-Chain Registry Types
// ============================================================================

/** Registry entry for an agent */
export interface AgentRegistryEntry {
  /** Agent ID */
  agentId: AgentId;
  /** Owner's TON address */
  ownerAddress: TonAddress;
  /** Agent contract address */
  contractAddress: TonAddress;
  /** Strategy hash (keccak256 of strategy params) */
  strategyHash: string;
  /** Risk score (0-1000, higher = riskier) */
  riskScore: number;
  /** Performance metrics */
  performance: AgentPerformanceMetrics;
  /** Current status */
  status: AgentStatus;
  /** Contract version */
  version: ContractVersion;
  /** Telegram user ID (if applicable) */
  telegramUserId?: string;
  /** Registration timestamp */
  registeredAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Audit trail entries */
  auditTrail: AuditEntry[];
  /** Tags/labels */
  tags: string[];
}

/** Agent performance metrics in registry */
export interface AgentPerformanceMetrics {
  /** Total profit/loss in nanoTON */
  totalPnl: bigint;
  /** Total volume processed in nanoTON */
  totalVolume: bigint;
  /** Number of strategies executed */
  strategiesExecuted: number;
  /** Win rate (0-100) */
  winRate: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Maximum drawdown (basis points) */
  maxDrawdownBps: number;
  /** Last 30-day return (basis points) */
  return30dBps: number;
}

/** Audit trail entry */
export interface AuditEntry {
  /** Entry ID */
  entryId: string;
  /** Action performed */
  action: string;
  /** Actor (address or system) */
  actor: string;
  /** Details */
  details: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
  /** Transaction hash (if on-chain) */
  txHash?: string;
}

/** Registry query filters */
export interface RegistryQueryFilter {
  /** Filter by owner */
  ownerAddress?: TonAddress;
  /** Filter by status */
  status?: AgentStatus;
  /** Filter by risk level (max) */
  maxRiskScore?: number;
  /** Filter by min win rate */
  minWinRate?: number;
  /** Filter by tags */
  tags?: string[];
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ============================================================================
// Fee & Revenue Types
// ============================================================================

/** Fee configuration */
export interface FeeConfig {
  /** Performance fee percentage (basis points) */
  performanceFeeBps: number;
  /** Protocol fee percentage (basis points) */
  protocolFeeBps: number;
  /** Marketplace commission (basis points) */
  marketplaceCommissionBps: number;
  /** Referral commission percentage (basis points) */
  referralCommissionBps: number;
  /** Treasury address */
  treasury: TonAddress;
  /** Minimum fee in nanoTON */
  minFeeNano: bigint;
}

/** Fee record */
export interface FeeRecord {
  /** Fee ID */
  feeId: string;
  /** Fee type */
  type: FeeType;
  /** Agent that generated the fee */
  agentId: AgentId;
  /** Amount in nanoTON */
  amount: bigint;
  /** Recipient address */
  recipient: TonAddress;
  /** Transaction hash */
  txHash?: string;
  /** Whether fee has been collected */
  collected: boolean;
  /** Timestamp */
  timestamp: Date;
}

/** Revenue distribution */
export interface RevenueDistribution {
  /** Total revenue in nanoTON */
  total: bigint;
  /** Protocol share in nanoTON */
  protocol: bigint;
  /** Treasury share in nanoTON */
  treasury: bigint;
  /** Referral share in nanoTON */
  referral: bigint;
  /** Agent creator share in nanoTON */
  creator: bigint;
}

// ============================================================================
// Security Types
// ============================================================================

/** Upgrade proposal for factory/agent contracts */
export interface UpgradeProposal {
  /** Proposal ID */
  proposalId: string;
  /** Contract to upgrade */
  targetContract: TonAddress;
  /** New code hash */
  newCodeHash: string;
  /** Upgrade type */
  upgradeType: 'factory' | 'agent_wallet' | 'strategy';
  /** Proposer address */
  proposer: TonAddress;
  /** Multi-sig approval threshold */
  approvalsRequired: number;
  /** Current approvals */
  approvals: TonAddress[];
  /** Upgrade payload (base64 BoC) */
  payload: string;
  /** Migration instructions */
  migrationNotes?: string;
  /** Proposal status */
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  /** Scheduled execution time */
  scheduledAt?: Date;
  /** Created timestamp */
  createdAt: Date;
}

/** Emergency pause state */
export interface EmergencyState {
  /** Whether factory is paused */
  isPaused: boolean;
  /** Reason for pause */
  reason?: string;
  /** Who triggered the pause */
  triggeredBy?: TonAddress;
  /** When pause was triggered */
  pausedAt?: Date;
  /** Affected agent IDs (empty = all) */
  affectedAgents: AgentId[];
}

/** Role-based access control entry */
export interface AccessControlEntry {
  /** Role name */
  role: 'owner' | 'admin' | 'operator' | 'auditor' | 'emergency';
  /** Address with this role */
  address: TonAddress;
  /** Granted permissions */
  permissions: string[];
  /** Granted by */
  grantedBy: TonAddress;
  /** Grant timestamp */
  grantedAt: Date;
  /** Optional expiry */
  expiresAt?: Date;
}

// ============================================================================
// Backend Integration Types
// ============================================================================

/** Deployment transaction to sign and submit */
export interface DeploymentTransaction {
  /** Transaction body (base64 BoC) */
  body: string;
  /** Target address (factory contract) */
  to: TonAddress;
  /** Value to attach in nanoTON */
  value: bigint;
  /** State init if deploying new contract */
  stateInit?: string;
  /** Human-readable description */
  description: string;
  /** Estimated gas fee */
  estimatedFee: bigint;
}

/** Telegram user to wallet mapping */
export interface TelegramWalletMapping {
  /** Telegram user ID */
  telegramUserId: string;
  /** TON wallet address */
  walletAddress: TonAddress;
  /** Agent IDs owned by this user */
  agentIds: AgentId[];
  /** Registration timestamp */
  registeredAt: Date;
  /** Last active timestamp */
  lastActiveAt: Date;
}

/** Contract event from TON blockchain */
export interface ContractEvent {
  /** Event type */
  type: string;
  /** Contract that emitted the event */
  contractAddress: TonAddress;
  /** Event data */
  data: Record<string, unknown>;
  /** Transaction hash */
  txHash: string;
  /** Block sequence number */
  blockSeqno: number;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Module Configuration
// ============================================================================

/** Overall TON Factory module configuration */
export interface TonFactoryConfig {
  /** Whether the module is enabled */
  enabled: boolean;
  /** TON network (mainnet/testnet) */
  network: 'mainnet' | 'testnet';
  /** TON RPC endpoint URL */
  rpcUrl?: string;
  /** Factory contract configuration */
  factory: FactoryConfig;
  /** Fee configuration */
  fees: FeeConfig;
  /** Enable on-chain operations (false for testing) */
  enableOnChain?: boolean;
  /** Maximum concurrent strategy executions per agent */
  maxConcurrentExecutions?: number;
  /** Registry cleanup interval (hours) */
  registryCleanupIntervalHours?: number;
}

// ============================================================================
// Events
// ============================================================================

/** TON Factory event types */
export type TonFactoryEventType =
  | 'agent.deployed'
  | 'agent.paused'
  | 'agent.resumed'
  | 'agent.stopped'
  | 'agent.upgraded'
  | 'strategy.deployed'
  | 'strategy.started'
  | 'strategy.completed'
  | 'strategy.failed'
  | 'strategy.stopped'
  | 'transaction.submitted'
  | 'transaction.confirmed'
  | 'transaction.failed'
  | 'fee.collected'
  | 'registry.updated'
  | 'emergency.triggered'
  | 'emergency.resolved'
  | 'upgrade.proposed'
  | 'upgrade.executed';

/** TON Factory event */
export interface TonFactoryEvent {
  /** Event type */
  type: TonFactoryEventType;
  /** Timestamp */
  timestamp: Date;
  /** Related agent ID */
  agentId?: AgentId;
  /** Related strategy ID */
  strategyId?: StrategyId;
  /** Event payload */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type TonFactoryEventHandler = (event: TonFactoryEvent) => void;

/** Unsubscribe function */
export type Unsubscribe = () => void;
