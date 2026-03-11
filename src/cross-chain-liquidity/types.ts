/**
 * TONAIAgent - Cross-Chain Liquidity Integration Layer
 *
 * Type definitions for the Cross-Chain Liquidity Integration system, enabling
 * AI agents and strategies to access liquidity from multiple blockchain ecosystems
 * (TON, Ethereum, BNB Chain, Solana, and more).
 *
 * Components:
 *   CrossChainConnector   — Modular connector framework for each blockchain
 *   LiquidityAggregator   — Aggregates DEX pools, bridges, and DeFi protocols
 *   TradeExecutor         — Cross-chain swaps, routing, and arbitrage execution
 *   PortfolioTracker      — Multi-chain portfolio and LP position tracking
 *   RiskMonitor           — Bridge risks, slippage, and fragmentation controls
 *   PluginLayer           — Agent plugin system integration (arbitrage, analytics)
 */

// ============================================================================
// Chain and Network Types
// ============================================================================

/** Supported blockchain identifiers */
export type SupportedChainId =
  | 'ton'
  | 'ethereum'
  | 'bnb'
  | 'solana'
  | 'polygon'
  | 'avalanche'
  | 'arbitrum'
  | 'optimism'
  | string;

/** Blockchain category */
export type ChainCategory = 'evm' | 'non-evm' | 'solana' | 'ton';

/** Chain connection status */
export type ChainConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/** Metadata about a supported blockchain network */
export interface ChainMetadata {
  id: SupportedChainId;
  name: string;
  category: ChainCategory;
  nativeCurrency: string;
  blockTimeMs: number;
  averageGasUsd: number;
  rpcEndpoint?: string;
  explorerUrl?: string;
}

// ============================================================================
// Token and Asset Types
// ============================================================================

/** A token on a specific chain */
export interface CrossChainToken {
  address: string;
  chainId: SupportedChainId;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

/** A liquidity pool on a specific chain and DEX */
export interface LiquidityPool {
  id: string;
  chainId: SupportedChainId;
  dex: string;
  tokenA: CrossChainToken;
  tokenB: CrossChainToken;
  reserveA: number;
  reserveB: number;
  totalLiquidityUsd: number;
  apy: number;
  fee: number;
  updatedAt: Date;
}

/** Token price across chains */
export interface CrossChainTokenPrice {
  token: CrossChainToken;
  priceUsd: number;
  priceChange24h: number;
  volume24hUsd: number;
  sources: PriceSource[];
  updatedAt: Date;
}

/** Source of a price quote */
export interface PriceSource {
  dex: string;
  chainId: SupportedChainId;
  priceUsd: number;
  liquidityUsd: number;
}

// ============================================================================
// Connector Types
// ============================================================================

/** Configuration for a cross-chain connector */
export interface ConnectorConfig {
  chainId: SupportedChainId;
  rpcEndpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
  retryAttempts?: number;
  enabled: boolean;
}

/** Result of a cross-chain connection attempt */
export interface ConnectorStatus {
  chainId: SupportedChainId;
  status: ChainConnectionStatus;
  latencyMs: number;
  blockHeight?: number;
  connectedAt?: Date;
  lastError?: string;
}

/** Parameters for executing a swap on a specific chain */
export interface SwapParams {
  fromToken: CrossChainToken;
  toToken: CrossChainToken;
  amountIn: number;
  slippageTolerance: number;
  deadline?: number;
  recipient?: string;
}

/** Result of a swap execution */
export interface SwapResult {
  transactionHash: string;
  chainId: SupportedChainId;
  fromToken: CrossChainToken;
  toToken: CrossChainToken;
  amountIn: number;
  amountOut: number;
  gasUsed: number;
  gasUsd: number;
  priceImpact: number;
  executedAt: Date;
  status: TransactionStatus;
}

/** Status of an on-chain transaction */
export type TransactionStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'dropped'
  | 'replaced';

/** Details about a submitted cross-chain transaction */
export interface TransactionDetails {
  hash: string;
  chainId: SupportedChainId;
  status: TransactionStatus;
  blockNumber?: number;
  confirmations: number;
  submittedAt: Date;
  confirmedAt?: Date;
  gasUsed?: number;
  gasUsd?: number;
}

// ============================================================================
// Liquidity Aggregation Types
// ============================================================================

/** Strategy for aggregating liquidity across sources */
export type AggregationMode =
  | 'best_price'        // Route to the single best price
  | 'lowest_gas'        // Minimize gas costs
  | 'split_optimal'     // Split across sources for best net result
  | 'max_liquidity'     // Use deepest pool
  | 'min_slippage';     // Minimize price impact

/** An available liquidity source for routing */
export interface LiquiditySource {
  id: string;
  name: string;
  chainId: SupportedChainId;
  type: 'dex' | 'bridge' | 'aggregator' | 'cex' | 'lending';
  supportsNativeSwaps: boolean;
  supportsCrossChain: boolean;
  feePercent: number;
  minTradeUsd: number;
  maxTradeUsd: number;
  liquidityUsd: number;
  responseTimeMs: number;
  successRate: number;
}

/** A single leg in a multi-hop route */
export interface RouteLeg {
  sourceId: string;
  fromChainId: SupportedChainId;
  toChainId: SupportedChainId;
  fromToken: CrossChainToken;
  toToken: CrossChainToken;
  amountIn: number;
  amountOut: number;
  feeUsd: number;
  estimatedTimeMs: number;
  priceImpact: number;
}

/** A complete route for a cross-chain trade */
export interface TradeRoute {
  id: string;
  legs: RouteLeg[];
  totalAmountIn: number;
  totalAmountOut: number;
  totalFeeUsd: number;
  totalGasUsd: number;
  estimatedTimeMs: number;
  priceImpact: number;
  mode: AggregationMode;
  score: number;
  createdAt: Date;
}

/** Quote for a potential cross-chain trade */
export interface AggregatedQuote {
  inputToken: CrossChainToken;
  outputToken: CrossChainToken;
  inputAmount: number;
  routes: TradeRoute[];
  bestRoute: TradeRoute;
  quotedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// Trade Execution Types
// ============================================================================

/** Type of cross-chain trade */
export type TradeType =
  | 'same_chain_swap'        // Single-chain DEX swap
  | 'cross_chain_swap'       // Bridge + swap across chains
  | 'atomic_swap'            // Atomic cross-chain swap
  | 'bridge_transfer'        // Pure bridge transfer
  | 'arbitrage'              // Arbitrage across chains
  | 'liquidity_provision'    // Add liquidity to a pool
  | 'liquidity_removal';     // Remove liquidity from a pool

/** Priority level for trade execution */
export type TradePriority = 'low' | 'medium' | 'high' | 'urgent';

/** Request to execute a cross-chain trade */
export interface TradeRequest {
  id: string;
  type: TradeType;
  fromToken: CrossChainToken;
  toToken: CrossChainToken;
  amountIn: number;
  minAmountOut: number;
  slippageTolerance: number;
  priority: TradePriority;
  agentId?: string;
  strategyId?: string;
  metadata?: Record<string, unknown>;
}

/** Status of a trade execution */
export type TradeStatus =
  | 'pending'
  | 'routing'
  | 'executing'
  | 'bridging'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Complete execution record for a cross-chain trade */
export interface TradeExecution {
  id: string;
  request: TradeRequest;
  route: TradeRoute;
  status: TradeStatus;
  transactions: TransactionDetails[];
  amountIn: number;
  amountOut: number;
  totalFeeUsd: number;
  totalGasUsd: number;
  priceImpact: number;
  slippage: number;
  executedAt: Date;
  completedAt?: Date;
  error?: string;
}

/** Result of an arbitrage opportunity scan */
export interface ArbitrageOpportunity {
  id: string;
  token: CrossChainToken;
  buyChainId: SupportedChainId;
  sellChainId: SupportedChainId;
  buyDex: string;
  sellDex: string;
  buyPriceUsd: number;
  sellPriceUsd: number;
  spreadPercent: number;
  estimatedProfitUsd: number;
  estimatedCostUsd: number;
  netProfitUsd: number;
  confidence: number;
  discoveredAt: Date;
  expiresAt: Date;
}

// ============================================================================
// Portfolio Tracking Types
// ============================================================================

/** Balance of a token on a chain */
export interface ChainBalance {
  token: CrossChainToken;
  chainId: SupportedChainId;
  balance: number;
  balanceUsd: number;
  lockedBalance: number;
  lastUpdated: Date;
}

/** LP position in a liquidity pool */
export interface LpPosition {
  pool: LiquidityPool;
  sharePercent: number;
  tokenAAmount: number;
  tokenBAmount: number;
  positionValueUsd: number;
  unclaimedFeesUsd: number;
  enteredAt: Date;
  impermanentLossPercent: number;
}

/** Multi-chain portfolio snapshot */
export interface MultiChainPortfolio {
  agentId: string;
  chains: SupportedChainId[];
  balances: ChainBalance[];
  lpPositions: LpPosition[];
  totalValueUsd: number;
  chainAllocations: ChainAllocation[];
  crossChainTransactions: TransactionDetails[];
  performanceByChain: ChainPerformance[];
  lastSyncedAt: Date;
}

/** Allocation percentage per chain */
export interface ChainAllocation {
  chainId: SupportedChainId;
  valueUsd: number;
  percent: number;
}

/** Strategy performance metrics per chain */
export interface ChainPerformance {
  chainId: SupportedChainId;
  strategyId: string;
  pnlUsd: number;
  pnlPercent: number;
  tradesExecuted: number;
  feesUsd: number;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

// ============================================================================
// Risk Control Types
// ============================================================================

/** Category of cross-chain risk */
export type RiskCategory =
  | 'bridge_risk'             // Bridge smart contract or liquidity risk
  | 'liquidity_fragmentation' // Fragmented liquidity across chains
  | 'transaction_delay'       // Slow cross-chain confirmations
  | 'slippage_risk'           // Excessive price impact
  | 'oracle_deviation'        // Price oracle discrepancy
  | 'smart_contract_risk'     // DEX/bridge contract vulnerability
  | 'counterparty_risk';      // Counterparty default

/** Severity of a risk assessment */
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

/** A detected risk event */
export interface RiskAlert {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  chainId?: SupportedChainId;
  description: string;
  recommendation: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

/** Risk limits for cross-chain execution */
export interface CrossChainRiskLimits {
  maxSlippagePercent: number;
  maxBridgeTimeMs: number;
  maxSingleTradeUsd: number;
  maxDailyVolumeUsd: number;
  maxPositionConcentrationPercent: number;
  minLiquidityPoolUsd: number;
  blacklistedBridges: string[];
  blacklistedChains: SupportedChainId[];
}

/** Real-time risk metrics for a chain or trade */
export interface RiskMetrics {
  chainId: SupportedChainId;
  currentSlippage: number;
  bridgeLatencyMs: number;
  liquidityDepthUsd: number;
  volatility24h: number;
  riskScore: number;
  alerts: RiskAlert[];
  updatedAt: Date;
}

// ============================================================================
// Plugin Layer Types
// ============================================================================

/** Type of cross-chain plugin */
export type CrossChainPluginType =
  | 'arbitrage'        // Arbitrage opportunity scanner
  | 'analytics'        // Cross-chain analytics
  | 'liquidity_scan'   // Liquidity pool scanner
  | 'bridge_monitor'   // Bridge health monitor
  | 'custom';          // Custom plugin

/** Manifest for a cross-chain plugin */
export interface CrossChainPluginManifest {
  id: string;
  name: string;
  version: string;
  type: CrossChainPluginType;
  supportedChains: SupportedChainId[];
  description: string;
  capabilities: CrossChainPluginCapabilities;
}

/** Capabilities exposed by a cross-chain plugin */
export interface CrossChainPluginCapabilities {
  scanArbitrage: boolean;
  trackLiquidity: boolean;
  monitorBridges: boolean;
  executeStrategies: boolean;
  reportAnalytics: boolean;
}

/** Result from a plugin execution */
export interface PluginExecutionResult {
  pluginId: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  executedAt: Date;
  durationMs: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Configuration for the cross-chain liquidity manager */
export interface CrossChainLiquidityConfig {
  /** Enabled chain connectors */
  connectors: ConnectorConfig[];

  /** Default aggregation mode */
  defaultAggregationMode: AggregationMode;

  /** Risk limits for all operations */
  riskLimits: CrossChainRiskLimits;

  /** Portfolio sync interval in milliseconds */
  portfolioSyncIntervalMs: number;

  /** Arbitrage scan interval in milliseconds */
  arbitrageScanIntervalMs: number;

  /** Enable automatic arbitrage execution */
  autoArbitrage: boolean;

  /** Minimum net profit in USD to execute arbitrage */
  minArbitrageProfitUsd: number;

  /** Enable cross-chain risk monitoring */
  riskMonitoringEnabled: boolean;

  /** Maximum concurrent trades */
  maxConcurrentTrades: number;

  /** Quote expiry in milliseconds */
  quoteExpiryMs: number;
}

// ============================================================================
// Health and Stats Types
// ============================================================================

/** Health status of the cross-chain liquidity system */
export interface CrossChainLiquidityHealth {
  isHealthy: boolean;
  connectedChains: SupportedChainId[];
  disconnectedChains: SupportedChainId[];
  totalLiquidityUsd: number;
  activeTrades: number;
  pendingArbitrageOpportunities: number;
  lastPortfolioSync?: Date;
  riskAlerts: RiskAlert[];
}

/** Aggregate stats for the cross-chain liquidity system */
export interface CrossChainLiquidityStats {
  totalTradesExecuted: number;
  totalVolumeUsd: number;
  totalProfitUsd: number;
  totalFeesUsd: number;
  totalGasUsd: number;
  arbitrageOpportunitiesFound: number;
  arbitrageExecuted: number;
  averageTradeTimeMs: number;
  successRate: number;
}

// ============================================================================
// Event Types
// ============================================================================

/** Types of events emitted by the cross-chain liquidity system */
export type CrossChainLiquidityEventType =
  | 'connector_connected'
  | 'connector_disconnected'
  | 'connector_error'
  | 'quote_received'
  | 'trade_started'
  | 'trade_completed'
  | 'trade_failed'
  | 'arbitrage_found'
  | 'arbitrage_executed'
  | 'portfolio_synced'
  | 'risk_alert'
  | 'risk_resolved'
  | 'plugin_loaded'
  | 'plugin_executed';

/** An event emitted by the cross-chain liquidity system */
export interface CrossChainLiquidityEvent {
  id: string;
  type: CrossChainLiquidityEventType;
  timestamp: Date;
  data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error';
}

/** Callback for cross-chain liquidity events */
export type CrossChainLiquidityEventCallback = (
  event: CrossChainLiquidityEvent
) => void;
