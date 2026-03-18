/**
 * TONAIAgent - Institutional Liquidity Network Type Definitions
 *
 * Comprehensive types for the Institutional Liquidity Network enabling:
 * - Aggregated liquidity pools (DEXs, OTC desks, cross-chain bridges, agent liquidity)
 * - Smart order routing engine (slippage optimization, gas-aware, latency optimization)
 * - Internal liquidity pooling (agent-to-agent, treasury-to-fund, capital reuse)
 * - Deep liquidity vaults (stablecoin, RWA, hedging pools)
 * - Risk-controlled execution (prime brokerage limits, margin engine, exposure checks)
 *
 * Architecture:
 * Agents/Funds → Prime Brokerage → Liquidity Network → DEX / OTC / Cross-chain
 */

// ============================================================================
// Liquidity Source Types
// ============================================================================

export type LiquiditySourceKind =
  | 'dex'
  | 'otc_desk'
  | 'agent_liquidity'
  | 'cross_chain_bridge'
  | 'market_maker'
  | 'internal_pool'
  | 'rwa_pool'
  | 'stablecoin_vault'
  | 'hedging_pool';

export type LiquiditySourceStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface LiquiditySourceMetrics {
  totalVolume24h: string;
  totalVolume7d: string;
  averageSpread: number;
  averageDepth: string;
  fillRate: number;
  averageSlippage: number;
  uptime: number;
  latencyMs: number;
  lastTradeAt: Date;
  updatedAt: Date;
}

export interface LiquiditySourceRoutingConfig {
  priority: number;
  weight: number;
  maxAllocationPercent: number;
  minAllocationPercent: number;
  excludedPairs: string[];
  enableSmartRouting: boolean;
}

export interface LiquiditySourceFees {
  makerFee: number;
  takerFee: number;
  settlementFee: number;
  bridgeFee?: number;
}

export interface LiquiditySourceLimits {
  dailyLimit: string;
  weeklyLimit: string;
  monthlyLimit: string;
  perTradeLimit: string;
  maxExposure: string;
}

export interface LiquiditySource {
  id: string;
  name: string;
  kind: LiquiditySourceKind;
  status: LiquiditySourceStatus;
  supportedPairs: string[];
  metrics: LiquiditySourceMetrics;
  routing: LiquiditySourceRoutingConfig;
  fees: LiquiditySourceFees;
  limits: LiquiditySourceLimits;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Aggregation Layer Types
// ============================================================================

export type AggregationStrategy =
  | 'best_execution'
  | 'lowest_fees'
  | 'lowest_slippage'
  | 'fastest_execution'
  | 'split_weighted'
  | 'vwap'
  | 'twap';

export interface AggregationPool {
  id: string;
  name: string;
  sourceIds: string[];
  strategy: AggregationStrategy;
  totalLiquidity: string;
  weightedSpread: number;
  status: 'active' | 'paused' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Smart Order Routing Types
// ============================================================================

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'ioc' | 'fok' | 'twap' | 'vwap';

export interface OrderRequest {
  id?: string;
  pair: string;
  side: OrderSide;
  amount: string;
  orderType: OrderType;
  limitPrice?: string;
  slippageTolerance?: number;
  preferredSources?: string[];
  excludedSources?: string[];
  aggregationPoolId?: string;
  clientOrderId?: string;
  metadata?: Record<string, unknown>;
}

export interface RouteLeg {
  sourceId: string;
  sourceName: string;
  sourceKind: LiquiditySourceKind;
  amount: string;
  allocationPercent: number;
  estimatedPrice: string;
  estimatedFees: string;
  estimatedLatencyMs: number;
  priority: number;
}

export interface OrderRoute {
  id: string;
  order: OrderRequest;
  legs: RouteLeg[];
  estimatedPrice: string;
  estimatedTotalFees: string;
  estimatedSlippage: number;
  confidence: number;
  validUntil: Date;
}

export interface OrderFill {
  id: string;
  legIndex: number;
  sourceId: string;
  filledAmount: string;
  fillPrice: string;
  fees: string;
  timestamp: Date;
}

export type OrderExecutionStatus =
  | 'pending'
  | 'routing'
  | 'executing'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'failed';

export interface OrderExecution {
  id: string;
  order: OrderRequest;
  route: OrderRoute;
  status: OrderExecutionStatus;
  fills: OrderFill[];
  totalFilled: string;
  totalFees: string;
  averagePrice: string;
  slippage: number;
  executionTimeMs: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

// ============================================================================
// Internal Liquidity Pool Types
// ============================================================================

export type InternalPoolParticipantKind = 'agent' | 'fund' | 'treasury';

export interface InternalPoolParticipant {
  participantId: string;
  kind: InternalPoolParticipantKind;
  name: string;
  contributedAmount: string;
  availableAmount: string;
  borrowedAmount: string;
  joinedAt: Date;
}

export interface InternalLiquidityPool {
  id: string;
  name: string;
  assetId: string;
  totalLiquidity: string;
  availableLiquidity: string;
  utilizationRate: number;
  participants: InternalPoolParticipant[];
  interestRate: number;
  status: 'active' | 'paused' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface InternalLiquidityLoan {
  id: string;
  poolId: string;
  borrowerId: string;
  borrowerKind: InternalPoolParticipantKind;
  lenderId: string;
  lenderKind: InternalPoolParticipantKind;
  amount: string;
  interestRate: number;
  dueAt: Date;
  status: 'active' | 'repaid' | 'overdue' | 'defaulted';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Deep Liquidity Vault Types
// ============================================================================

export type VaultKind = 'stablecoin' | 'rwa' | 'hedging' | 'mixed';

export interface VaultDepositRecord {
  id: string;
  vaultId: string;
  depositorId: string;
  amount: string;
  sharesMinted: string;
  depositedAt: Date;
}

export interface VaultWithdrawalRecord {
  id: string;
  vaultId: string;
  withdrawerId: string;
  sharesBurned: string;
  amountReceived: string;
  withdrawnAt: Date;
}

export interface LiquidityVault {
  id: string;
  name: string;
  kind: VaultKind;
  assetId: string;
  totalAssets: string;
  totalShares: string;
  sharePrice: string;
  apy: number;
  utilizationRate: number;
  status: 'active' | 'paused' | 'deprecated';
  deposits: VaultDepositRecord[];
  withdrawals: VaultWithdrawalRecord[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Risk-Controlled Execution Types
// ============================================================================

export interface ExecutionRiskLimits {
  maxOrderSize: string;
  maxDailyVolume: string;
  maxExposurePerPair: string;
  maxSlippage: number;
  maxConcentrationPercent: number;
  priceDeviationThreshold: number;
}

export interface ExecutionRiskCheck {
  passed: boolean;
  violations: string[];
  warnings: string[];
  checkedAt: Date;
}

export interface ExecutionRiskProfile {
  id: string;
  name: string;
  ownerId: string;
  limits: ExecutionRiskLimits;
  currentDailyVolume: string;
  currentExposures: Record<string, string>;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Network Analytics Types
// ============================================================================

export interface LiquidityNetworkStats {
  totalSources: number;
  activeSources: number;
  totalPools: number;
  totalVaults: number;
  totalLiquidity: string;
  total24hVolume: string;
  averageSpread: number;
  averageSlippage: number;
  generatedAt: Date;
}

export interface PairLiquiditySnapshot {
  pair: string;
  totalLiquidity: string;
  bestBid: string;
  bestAsk: string;
  spread: number;
  depth24h: string;
  topSources: string[];
  updatedAt: Date;
}

// ============================================================================
// Events
// ============================================================================

export type LiquidityNetworkEventType =
  | 'source_added'
  | 'source_updated'
  | 'source_removed'
  | 'source_activated'
  | 'source_deactivated'
  | 'pool_created'
  | 'pool_updated'
  | 'vault_created'
  | 'vault_deposit'
  | 'vault_withdrawal'
  | 'order_submitted'
  | 'order_filled'
  | 'order_cancelled'
  | 'order_failed'
  | 'internal_loan_created'
  | 'internal_loan_repaid'
  | 'risk_limit_exceeded'
  | 'risk_warning';

export interface LiquidityNetworkEvent {
  id: string;
  type: LiquidityNetworkEventType;
  entityId: string;
  entityKind: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export type LiquidityNetworkEventCallback = (event: LiquidityNetworkEvent) => void;

// ============================================================================
// Configuration
// ============================================================================

export interface AggregationConfig {
  enabled: boolean;
  defaultStrategy: AggregationStrategy;
  maxSourcesPerOrder: number;
  minSourcesForSplit: number;
  splitOrdersEnabled: boolean;
}

export interface RoutingConfig {
  enabled: boolean;
  slippageTolerance: number;
  gasAwareRouting: boolean;
  latencyOptimization: boolean;
  priceImprovementEnabled: boolean;
}

export interface VaultConfig {
  enabled: boolean;
  defaultApy: number;
  minDepositAmount: string;
  withdrawalDelayMs: number;
}

export interface InternalPoolConfig {
  enabled: boolean;
  defaultInterestRate: number;
  maxLoanDurationMs: number;
  autoRepayEnabled: boolean;
}

export interface RiskConfig {
  enabled: boolean;
  defaultMaxOrderSize: string;
  defaultMaxDailyVolume: string;
  defaultMaxSlippage: number;
  hardLimitsEnabled: boolean;
}

export interface LiquidityNetworkConfig {
  aggregation: AggregationConfig;
  routing: RoutingConfig;
  vaults: VaultConfig;
  internalPools: InternalPoolConfig;
  risk: RiskConfig;
}
