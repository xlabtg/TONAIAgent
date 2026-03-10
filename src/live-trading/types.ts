/**
 * TONAIAgent - Live Trading Infrastructure Type Definitions
 *
 * Core types for the Live Trading Infrastructure that enables AI agents
 * to execute real trades through integrated liquidity venues (DEX, CEX, DeFi).
 *
 * Initially optimized for The Open Network (TON) ecosystem while remaining
 * extensible to other chains.
 */

// ============================================================================
// Exchange Connector Types
// ============================================================================

export type ExchangeType = 'dex' | 'cex' | 'defi';

export type ExchangeStatus = 'connected' | 'disconnected' | 'error' | 'rate_limited';

export interface ExchangeConnectorConfig {
  exchangeId: string;
  name: string;
  type: ExchangeType;
  /** Network/chain identifier (e.g., 'ton', 'ethereum', 'bsc') */
  network: string;
  /** Base URL for CEX API or contract address for DEX */
  endpoint: string;
  /** Optional timeout for requests in milliseconds */
  timeoutMs?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
  /** Rate limit: maximum requests per second */
  rateLimit?: number;
}

export interface ExchangeBalance {
  token: string;
  tokenAddress?: string;
  available: number;
  reserved: number;
  total: number;
  updatedAt: Date;
}

export type OrderSide = 'buy' | 'sell';

export type OrderType = 'market' | 'limit' | 'stop_limit' | 'stop_market';

export type OrderStatus =
  | 'pending'
  | 'open'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'expired'
  | 'rejected';

export interface PlaceOrderRequest {
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  /** Time in force: GTC (Good Till Cancelled), IOC (Immediate Or Cancel), FOK (Fill Or Kill) */
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  /** Maximum slippage tolerance as a percentage (0-100) */
  slippageTolerance?: number;
}

export interface OrderResult {
  orderId: string;
  clientOrderId?: string;
  exchangeOrderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  requestedQuantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  price?: number;
  averageFilledPrice?: number;
  fees: number;
  feeToken: string;
  transactionIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderStatusResult {
  orderId: string;
  exchangeOrderId: string;
  status: OrderStatus;
  filledQuantity: number;
  remainingQuantity: number;
  averageFilledPrice?: number;
  fees: number;
  updatedAt: Date;
}

export interface ExchangeConnector {
  readonly config: ExchangeConnectorConfig;
  readonly status: ExchangeStatus;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getBalances(): Promise<ExchangeBalance[]>;
  placeOrder(request: PlaceOrderRequest): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<boolean>;
  getOrderStatus(orderId: string): Promise<OrderStatusResult>;
}

// ============================================================================
// Order Execution Engine Types
// ============================================================================

export type ExecutionStrategy = 'direct' | 'twap' | 'vwap' | 'iceberg' | 'best_price';

export interface ExecutionRequest {
  id: string;
  agentId: string;
  strategyId?: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  /** Maximum price (for buy) or minimum price (for sell) */
  priceLimit?: number;
  /** Maximum slippage tolerance as a percentage */
  slippageTolerance: number;
  executionStrategy: ExecutionStrategy;
  /** Preferred exchange IDs in order of preference */
  preferredExchanges?: string[];
  /** Whether to split the order across multiple exchanges */
  splitAcrossExchanges?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  metadata?: Record<string, unknown>;
}

export type ExecutionStatus =
  | 'pending'
  | 'routing'
  | 'executing'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionResult {
  executionId: string;
  agentId: string;
  strategyId?: string;
  status: ExecutionStatus;
  request: ExecutionRequest;
  orders: OrderResult[];
  totalQuantity: number;
  filledQuantity: number;
  averagePrice: number;
  totalFees: number;
  totalSlippage: number;
  executionTimeMs: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

export interface RoutingDecision {
  selectedExchangeId: string;
  expectedPrice: number;
  expectedSlippage: number;
  estimatedFees: number;
  confidence: number;
  alternatives: RoutingAlternative[];
}

export interface RoutingAlternative {
  exchangeId: string;
  expectedPrice: number;
  expectedSlippage: number;
  estimatedFees: number;
}

// ============================================================================
// Market Data Types
// ============================================================================

export interface PriceFeed {
  symbol: string;
  exchangeId: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  volume24h: number;
  change24h: number;
  changePercent24h: number;
  timestamp: Date;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  exchangeId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: Date;
}

export interface TradeHistory {
  symbol: string;
  exchangeId: string;
  tradeId: string;
  side: OrderSide;
  price: number;
  quantity: number;
  timestamp: Date;
}

export interface VolatilityMetrics {
  symbol: string;
  period: '1h' | '4h' | '24h' | '7d' | '30d';
  volatility: number;
  averageVolume: number;
  priceRange: { high: number; low: number };
  atr: number;
  updatedAt: Date;
}

export type MarketDataFeedType = 'price' | 'orderbook' | 'trades' | 'volatility';

export interface MarketDataSubscription {
  id: string;
  feedType: MarketDataFeedType;
  symbol: string;
  exchangeId?: string;
  callback: (data: PriceFeed | OrderBookSnapshot | TradeHistory | VolatilityMetrics) => void;
  active: boolean;
  createdAt: Date;
}

// ============================================================================
// Risk Control Types
// ============================================================================

export type RiskViolationType =
  | 'max_position_size'
  | 'slippage_limit'
  | 'stop_loss'
  | 'exposure_limit'
  | 'daily_loss_limit'
  | 'velocity_limit'
  | 'drawdown_limit';

export interface RiskLimit {
  type: RiskViolationType;
  enabled: boolean;
  value: number;
  /** Action to take when limit is hit */
  action: 'block' | 'warn' | 'reduce' | 'close_all';
}

export interface RiskProfile {
  agentId: string;
  limits: RiskLimit[];
  /** Maximum single position size as percentage of portfolio */
  maxPositionSizePercent: number;
  /** Maximum total exposure per strategy as percentage of portfolio */
  maxStrategyExposurePercent: number;
  /** Maximum slippage tolerance in percentage */
  maxSlippageTolerance: number;
  /** Daily loss limit as percentage of portfolio */
  maxDailyLossPercent: number;
  /** Maximum number of trades per hour */
  maxTradesPerHour: number;
  updatedAt: Date;
}

export interface RiskCheckRequest {
  agentId: string;
  executionRequest: ExecutionRequest;
  currentPortfolio: PortfolioState;
  marketData: PriceFeed;
}

export interface RiskCheckResult {
  passed: boolean;
  violations: RiskViolation[];
  warnings: RiskWarning[];
  adjustedQuantity?: number;
  adjustedSlippage?: number;
}

export interface RiskViolation {
  type: RiskViolationType;
  message: string;
  currentValue: number;
  limitValue: number;
  action: 'block' | 'warn' | 'reduce' | 'close_all';
}

export interface RiskWarning {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// ============================================================================
// Portfolio Synchronization Types
// ============================================================================

export interface PortfolioBalance {
  token: string;
  tokenAddress?: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  value: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  weight: number;
  lastUpdated: Date;
}

export interface PortfolioPosition {
  id: string;
  agentId: string;
  symbol: string;
  exchangeId: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  openedAt: Date;
  lastUpdated: Date;
}

export interface PortfolioState {
  agentId: string;
  totalValue: number;
  totalCost: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  totalFeesPaid: number;
  balances: PortfolioBalance[];
  openPositions: PortfolioPosition[];
  lastSyncedAt: Date;
}

export interface PnLRecord {
  id: string;
  agentId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  feesPaid: number;
  tradeCount: number;
}

export interface PortfolioSyncResult {
  agentId: string;
  success: boolean;
  balancesUpdated: number;
  positionsUpdated: number;
  error?: string;
  syncedAt: Date;
}

// ============================================================================
// Secure Key Management Types
// ============================================================================

export type KeyType = 'api_key' | 'private_key' | 'mnemonic' | 'jwt' | 'webhook_secret';

export type PermissionScope =
  | 'read_balance'
  | 'read_orders'
  | 'place_orders'
  | 'cancel_orders'
  | 'withdraw'
  | 'full_access';

export interface TradingCredential {
  id: string;
  agentId: string;
  exchangeId: string;
  keyType: KeyType;
  /** Encrypted key value — never stored or returned in plain text */
  encryptedValue: string;
  /** Initialization vector for encryption */
  iv: string;
  permissions: PermissionScope[];
  /** IP whitelist for API keys (where supported) */
  ipWhitelist?: string[];
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  rotatedAt?: Date;
}

export interface CredentialStoreConfig {
  /** Encryption algorithm to use */
  algorithm: 'aes-256-gcm' | 'chacha20-poly1305';
  /** Key derivation function */
  kdf: 'pbkdf2' | 'argon2';
  /** Whether to enable audit logging for credential access */
  enableAuditLog: boolean;
  /** Maximum credential age in days before rotation is required */
  maxCredentialAgeDays?: number;
}

export interface CredentialAccessLog {
  id: string;
  credentialId: string;
  agentId: string;
  exchangeId: string;
  operation: 'read' | 'create' | 'rotate' | 'revoke';
  ipAddress?: string;
  timestamp: Date;
  success: boolean;
  reason?: string;
}

// ============================================================================
// Live Trading Infrastructure Config
// ============================================================================

export interface LiveTradingConfig {
  /** Whether live trading is enabled */
  enabled: boolean;
  /** Default slippage tolerance as a percentage */
  defaultSlippageTolerance: number;
  /** Default order type */
  defaultOrderType: OrderType;
  /** Whether to enable simulation mode (no real orders placed) */
  simulationMode: boolean;
  /** Market data configuration */
  marketData: MarketDataConfig;
  /** Risk control defaults */
  riskDefaults: RiskControlDefaults;
  /** Portfolio sync interval in seconds */
  portfolioSyncIntervalSeconds: number;
  /** Credential store configuration */
  credentialStore: CredentialStoreConfig;
}

export interface MarketDataConfig {
  /** Polling interval for price feeds in milliseconds */
  pricePollingIntervalMs: number;
  /** Order book depth to fetch */
  orderBookDepth: number;
  /** Trade history window in minutes */
  tradeHistoryWindowMinutes: number;
  /** Whether to cache market data */
  enableCache: boolean;
  /** Cache TTL in seconds */
  cacheTtlSeconds: number;
}

export interface RiskControlDefaults {
  maxPositionSizePercent: number;
  maxStrategyExposurePercent: number;
  maxSlippageTolerance: number;
  maxDailyLossPercent: number;
  maxTradesPerHour: number;
}

// ============================================================================
// Infrastructure Health & Metrics
// ============================================================================

export interface LiveTradingHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    exchangeConnectors: boolean;
    executionEngine: boolean;
    marketData: boolean;
    riskControls: boolean;
    portfolio: boolean;
    keyManagement: boolean;
  };
  connectedExchanges: number;
  totalExchanges: number;
  lastCheck: Date;
}

export interface LiveTradingMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalVolumeTraded: number;
  totalFeesPaid: number;
  activeAgents: number;
  connectedExchanges: number;
  riskViolationsToday: number;
  averageExecutionTimeMs: number;
  updatedAt: Date;
}

// ============================================================================
// Event Types
// ============================================================================

export type LiveTradingEventType =
  | 'connector.connected'
  | 'connector.disconnected'
  | 'connector.error'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.partial'
  | 'order.placed'
  | 'order.filled'
  | 'order.cancelled'
  | 'order.rejected'
  | 'market_data.updated'
  | 'risk.violation'
  | 'risk.warning'
  | 'portfolio.synced'
  | 'portfolio.updated'
  | 'credential.created'
  | 'credential.rotated'
  | 'credential.revoked';

export interface LiveTradingEvent {
  id: string;
  type: LiveTradingEventType;
  timestamp: Date;
  agentId?: string;
  exchangeId?: string;
  data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export type LiveTradingEventCallback = (event: LiveTradingEvent) => void;
