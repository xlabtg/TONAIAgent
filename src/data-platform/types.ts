/**
 * TONAIAgent - Global Data and Signal Platform Type Definitions
 *
 * Core types for the data infrastructure, signal generation, and intelligence layer
 * powering autonomous AI agents on The Open Network (TON) blockchain.
 */

// ============================================================================
// Data Source Types
// ============================================================================

export type DataSourceType =
  | 'on_chain'
  | 'off_chain'
  | 'market'
  | 'alternative'
  | 'cross_chain';

export type DataSourceStatus = 'active' | 'inactive' | 'degraded' | 'error';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  provider: string;
  endpoint?: string;
  status: DataSourceStatus;
  latencyMs: number;
  reliability: number; // 0-100
  lastUpdate: Date;
  metadata: Record<string, unknown>;
}

export interface DataSourceConfig {
  id: string;
  type: DataSourceType;
  provider: string;
  endpoint?: string;
  apiKey?: string;
  refreshInterval: number; // ms
  batchSize: number;
  retryPolicy: RetryPolicy;
  transformers?: DataTransformer[];
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface DataTransformer {
  name: string;
  type: 'filter' | 'map' | 'aggregate' | 'enrich' | 'normalize';
  config: Record<string, unknown>;
}

// ============================================================================
// Data Pipeline Types
// ============================================================================

export type PipelineMode = 'streaming' | 'batch' | 'hybrid';

export type PipelineStatus = 'running' | 'paused' | 'stopped' | 'error';

export interface DataPipeline {
  id: string;
  name: string;
  mode: PipelineMode;
  status: PipelineStatus;
  sources: string[]; // DataSource IDs
  processors: DataProcessor[];
  sinks: DataSink[];
  metrics: PipelineMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataPipelineConfig {
  name: string;
  mode: PipelineMode;
  sources: DataSourceConfig[];
  processors: DataProcessor[];
  sinks: DataSinkConfig[];
  parallelism: number;
  checkpointInterval: number; // ms
  errorHandling: ErrorHandlingStrategy;
}

export interface DataProcessor {
  id: string;
  name: string;
  type: ProcessorType;
  config: Record<string, unknown>;
  inputSchema?: DataSchema;
  outputSchema?: DataSchema;
}

export type ProcessorType =
  | 'filter'
  | 'transform'
  | 'aggregate'
  | 'join'
  | 'window'
  | 'deduplicate'
  | 'enrich'
  | 'ai_inference';

export interface DataSink {
  id: string;
  name: string;
  type: SinkType;
  status: DataSourceStatus;
  config: DataSinkConfig;
}

export interface DataSinkConfig {
  type: SinkType;
  endpoint?: string;
  batchSize: number;
  flushInterval: number; // ms
  retryPolicy: RetryPolicy;
}

export type SinkType =
  | 'database'
  | 'cache'
  | 'message_queue'
  | 'api'
  | 'file'
  | 'event_bus';

export interface PipelineMetrics {
  recordsProcessed: number;
  recordsFailed: number;
  bytesProcessed: number;
  avgLatencyMs: number;
  throughputPerSecond: number;
  errorRate: number;
  lastProcessedAt?: Date;
  checkpointId?: string;
}

export interface ErrorHandlingStrategy {
  onError: 'skip' | 'retry' | 'dead_letter' | 'fail';
  deadLetterQueue?: string;
  maxRetries: number;
  alertThreshold: number;
}

export interface DataSchema {
  name: string;
  version: string;
  fields: SchemaField[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'timestamp';
  required: boolean;
  description?: string;
}

// ============================================================================
// On-Chain Data Types (TON-native)
// ============================================================================

export interface OnChainDataConfig {
  networks: NetworkConfig[];
  indexers: IndexerConfig[];
  cacheConfig: CacheConfig;
  realtimeEnabled: boolean;
}

export interface NetworkConfig {
  id: string;
  name: string;
  chainId: string;
  rpcEndpoints: string[];
  wsEndpoints?: string[];
  blockTime: number; // ms
  confirmations: number;
}

export interface IndexerConfig {
  type: 'transactions' | 'events' | 'state' | 'nft' | 'jetton';
  startBlock?: number;
  batchSize: number;
  parallelism: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

// TON-specific types
export interface TONTransaction {
  hash: string;
  lt: string; // Logical time
  timestamp: Date;
  sender: string;
  receiver: string;
  value: string;
  fee: string;
  success: boolean;
  exitCode: number;
  messageType: 'internal' | 'external_in' | 'external_out';
  opCode?: string;
  comment?: string;
  body?: string;
}

export interface TONWallet {
  address: string;
  balance: string;
  seqno: number;
  lastActivity: Date;
  type: 'v3r2' | 'v4r2' | 'highload' | 'multisig' | 'unknown';
  status: 'active' | 'uninit' | 'frozen';
  jettonBalances: JettonBalance[];
  nftCount: number;
}

export interface JettonBalance {
  jettonAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usdValue?: number;
}

export interface JettonInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
  adminAddress?: string;
  metadata: JettonMetadata;
  holders: number;
  transfers24h: number;
  volume24h: string;
}

export interface JettonMetadata {
  description?: string;
  image?: string;
  imageData?: string;
  social?: Record<string, string>;
}

export interface NFTCollection {
  address: string;
  name: string;
  description?: string;
  image?: string;
  itemsCount: number;
  ownersCount: number;
  floorPrice?: string;
  volume24h?: string;
}

export interface NFTItem {
  address: string;
  collection: string;
  index: number;
  owner: string;
  name?: string;
  description?: string;
  image?: string;
  attributes: NFTAttribute[];
  lastSalePrice?: string;
  lastSaleDate?: Date;
}

export interface NFTAttribute {
  trait: string;
  value: string;
  rarity?: number;
}

export interface DeFiProtocol {
  id: string;
  name: string;
  type: DeFiProtocolType;
  tvl: string;
  tvlChange24h: number;
  volume24h: string;
  fees24h: string;
  users24h: number;
  contracts: string[];
  pools: LiquidityPool[];
}

export type DeFiProtocolType =
  | 'dex'
  | 'lending'
  | 'staking'
  | 'yield'
  | 'bridge'
  | 'derivatives'
  | 'launchpad';

export interface LiquidityPool {
  id: string;
  protocol: string;
  tokenA: string;
  tokenB: string;
  reserveA: string;
  reserveB: string;
  tvl: string;
  volume24h: string;
  apy: number;
  fee: number;
}

export interface GovernanceActivity {
  protocolId: string;
  proposalId: string;
  title: string;
  status: 'active' | 'passed' | 'failed' | 'pending' | 'executed';
  votesFor: string;
  votesAgainst: string;
  quorum: number;
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// Cross-Chain Data Types
// ============================================================================

export interface CrossChainConfig {
  enabled: boolean;
  chains: ChainConfig[];
  bridges: BridgeConfig[];
  omnichainProvider?: string;
}

export interface ChainConfig {
  id: string;
  name: string;
  type: ChainType;
  rpcEndpoint: string;
  nativeCurrency: string;
  explorerUrl?: string;
}

export type ChainType = 'evm' | 'ton' | 'solana' | 'cosmos' | 'move';

export interface BridgeConfig {
  id: string;
  name: string;
  sourceChain: string;
  targetChain: string;
  supportedTokens: string[];
  fees: BridgeFees;
}

export interface BridgeFees {
  fixedFee: string;
  percentFee: number;
  minAmount: string;
  maxAmount: string;
}

export interface CrossChainAsset {
  symbol: string;
  name: string;
  chains: AssetChainInfo[];
  totalSupply: string;
  circulatingSupply: string;
  marketCap: string;
}

export interface AssetChainInfo {
  chainId: string;
  contractAddress: string;
  decimals: number;
  balance: string;
  wrapped: boolean;
}

export interface BridgeTransaction {
  id: string;
  sourceChain: string;
  targetChain: string;
  sourceHash: string;
  targetHash?: string;
  token: string;
  amount: string;
  sender: string;
  receiver: string;
  status: BridgeStatus;
  initiatedAt: Date;
  completedAt?: Date;
}

export type BridgeStatus =
  | 'pending'
  | 'confirming'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';

// ============================================================================
// Market Data Types
// ============================================================================

export interface MarketDataConfig {
  providers: MarketDataProvider[];
  updateInterval: number;
  cacheConfig: CacheConfig;
  alertsEnabled: boolean;
}

export interface MarketDataProvider {
  id: string;
  name: string;
  type: 'exchange' | 'aggregator' | 'oracle';
  endpoint: string;
  apiKey?: string;
  priority: number;
  supportedPairs: string[];
}

export interface PriceFeed {
  pair: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
  source: string;
  confidence: number; // 0-1
}

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  pair: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midPrice: number;
  timestamp: Date;
  depth: OrderBookDepth;
}

export interface OrderBookDepth {
  bidLiquidity: number;
  askLiquidity: number;
  imbalance: number; // -1 to 1, negative = more sells
}

export interface TradeData {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  value: number;
  timestamp: Date;
  maker: boolean;
}

export interface VolatilityMetrics {
  pair: string;
  period: '1h' | '4h' | '24h' | '7d' | '30d';
  volatility: number;
  atr: number; // Average True Range
  standardDeviation: number;
  percentile: number;
  regime: 'low' | 'normal' | 'high' | 'extreme';
}

export interface LiquidityMetrics {
  pair: string;
  spreadBps: number;
  depth1Percent: number;
  depth2Percent: number;
  slippage1k: number;
  slippage10k: number;
  slippage100k: number;
  score: number; // 0-100
}

export interface DerivativesData {
  pair: string;
  openInterest: number;
  fundingRate: number;
  nextFundingTime: Date;
  markPrice: number;
  indexPrice: number;
  longShortRatio: number;
  liquidations24h: number;
  liquidationVolume24h: number;
}

// ============================================================================
// Alternative Data Types
// ============================================================================

export interface AlternativeDataConfig {
  sentimentEnabled: boolean;
  socialEnabled: boolean;
  newsEnabled: boolean;
  macroEnabled: boolean;
  providers: AltDataProvider[];
}

export interface AltDataProvider {
  id: string;
  name: string;
  type: 'sentiment' | 'social' | 'news' | 'macro' | 'on_chain_metrics';
  endpoint?: string;
  apiKey?: string;
}

export interface SentimentData {
  asset: string;
  source: string;
  score: number; // -1 to 1
  magnitude: number; // 0 to 1
  volume: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  timestamp: Date;
  breakdown: SentimentBreakdown;
}

export interface SentimentBreakdown {
  positive: number;
  negative: number;
  neutral: number;
  keywords: KeywordSentiment[];
}

export interface KeywordSentiment {
  keyword: string;
  count: number;
  sentiment: number;
}

export interface SocialMetrics {
  asset: string;
  platform: 'twitter' | 'telegram' | 'discord' | 'reddit' | 'youtube';
  followers: number;
  followersChange24h: number;
  posts24h: number;
  engagement24h: number;
  mentions24h: number;
  sentiment: number;
  influencerMentions: InfluencerMention[];
}

export interface InfluencerMention {
  handle: string;
  platform: string;
  followers: number;
  sentiment: number;
  timestamp: Date;
  reach: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
  assets: string[];
  sentiment: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
  categories: string[];
}

export interface MacroIndicator {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastUpdate: Date;
  nextUpdate?: Date;
  impact: 'low' | 'medium' | 'high';
}

// ============================================================================
// Signal Types
// ============================================================================

export type SignalType =
  | 'price'
  | 'volume'
  | 'volatility'
  | 'trend'
  | 'momentum'
  | 'anomaly'
  | 'arbitrage'
  | 'risk'
  | 'sentiment'
  | 'on_chain'
  | 'composite';

export type SignalStrength = 'weak' | 'moderate' | 'strong' | 'very_strong';

export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

export interface Signal {
  id: string;
  type: SignalType;
  asset: string;
  direction: SignalDirection;
  strength: SignalStrength;
  confidence: number; // 0-1
  value: number;
  threshold: number;
  triggered: boolean;
  timestamp: Date;
  expiresAt?: Date;
  metadata: SignalMetadata;
}

export interface SignalMetadata {
  source: string;
  model?: string;
  features?: string[];
  explanation?: string;
  historicalAccuracy?: number;
  relatedSignals?: string[];
  acknowledged?: boolean;
}

export interface SignalConfig {
  type: SignalType;
  asset: string;
  parameters: SignalParameters;
  thresholds: SignalThresholds;
  filters?: SignalFilter[];
  notifications: NotificationConfig;
}

export interface SignalParameters {
  lookbackPeriod: number;
  aggregationMethod: 'mean' | 'median' | 'max' | 'min' | 'sum';
  smoothing?: number;
  customParams?: Record<string, unknown>;
}

export interface SignalThresholds {
  weak: number;
  moderate: number;
  strong: number;
  veryStrong: number;
}

export interface SignalFilter {
  type: 'volume' | 'volatility' | 'liquidity' | 'time' | 'correlation';
  condition: 'above' | 'below' | 'between' | 'equals';
  value: number | number[];
}

export interface NotificationConfig {
  enabled: boolean;
  channels: ('webhook' | 'email' | 'telegram' | 'discord')[];
  minStrength: SignalStrength;
  cooldownMinutes: number;
}

// Anomaly Detection
export interface AnomalySignal extends Signal {
  type: 'anomaly';
  anomalyType: AnomalyType;
  deviation: number;
  expectedValue: number;
  actualValue: number;
  zscore: number;
}

export type AnomalyType =
  | 'price_spike'
  | 'volume_spike'
  | 'liquidity_drain'
  | 'whale_activity'
  | 'unusual_flow'
  | 'pattern_break'
  | 'correlation_break';

// Arbitrage Detection
export interface ArbitrageSignal extends Signal {
  type: 'arbitrage';
  arbitrageType: ArbitrageType;
  profitBps: number;
  venues: ArbitrageVenue[];
  estimatedSize: number;
  estimatedProfit: number;
  gasEstimate?: number;
  netProfit?: number;
}

export type ArbitrageType =
  | 'cross_exchange'
  | 'triangular'
  | 'cross_chain'
  | 'dex_cex'
  | 'flash_loan';

export interface ArbitrageVenue {
  exchange: string;
  chain?: string;
  pair: string;
  side: 'buy' | 'sell';
  price: number;
  liquidity: number;
}

// Risk Signals
export interface RiskSignal extends Signal {
  type: 'risk';
  riskType: RiskType;
  severity: RiskSeverity;
  impact: number;
  probability: number;
  mitigations: string[];
}

export type RiskType =
  | 'market_crash'
  | 'liquidity_crisis'
  | 'smart_contract'
  | 'regulatory'
  | 'counterparty'
  | 'operational'
  | 'concentration'
  | 'leverage';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Strategy Intelligence Types
// ============================================================================

export interface StrategyIntelligenceConfig {
  enabled: boolean;
  rebalanceThreshold: number;
  riskBudget: number;
  optimizationFrequency: number; // hours
  backtestingEnabled: boolean;
}

export interface PortfolioRecommendation {
  id: string;
  type: RecommendationType;
  asset: string;
  action: 'buy' | 'sell' | 'hold' | 'rebalance';
  currentWeight: number;
  targetWeight: number;
  reasoning: string;
  signals: string[]; // Signal IDs
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export type RecommendationType =
  | 'allocation'
  | 'rebalance'
  | 'risk_reduction'
  | 'opportunity'
  | 'exit';

export interface CapitalAllocationSuggestion {
  strategy: string;
  currentAllocation: number;
  suggestedAllocation: number;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  reasoning: string;
}

export interface RiskAssessment {
  portfolioId: string;
  timestamp: Date;
  overallRisk: number; // 0-100
  riskBreakdown: RiskBreakdown;
  alerts: RiskAlert[];
  recommendations: string[];
}

export interface RiskBreakdown {
  marketRisk: number;
  concentrationRisk: number;
  liquidityRisk: number;
  volatilityRisk: number;
  correlationRisk: number;
  leverageRisk: number;
}

export interface RiskAlert {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  message: string;
  asset?: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

// ============================================================================
// Signal Marketplace Types
// ============================================================================

export interface SignalMarketplaceConfig {
  enabled: boolean;
  platformFeePercent: number;
  minSubscriptionPrice: string;
  reputationRequired: number;
  verificationRequired: boolean;
}

export interface SignalProvider {
  id: string;
  name: string;
  description: string;
  creator: string;
  status: 'active' | 'paused' | 'suspended';
  verified: boolean;
  reputation: number;
  subscriberCount: number;
  signalsPublished: number;
  accuracy: number;
  pricing: SignalPricing;
  performance: SignalProviderPerformance;
  categories: SignalType[];
  createdAt: Date;
}

export interface SignalPricing {
  model: 'free' | 'subscription' | 'per_signal' | 'performance';
  monthlyPrice?: string;
  perSignalPrice?: string;
  performanceFeePercent?: number;
  trialPeriodDays?: number;
}

export interface SignalProviderPerformance {
  totalSignals: number;
  profitableSignals: number;
  accuracy: number;
  avgReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  lastSignalAt?: Date;
  trackRecordDays: number;
}

export interface SignalSubscription {
  id: string;
  providerId: string;
  subscriberId: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  pricing: SignalPricing;
  startDate: Date;
  endDate?: Date;
  signalsReceived: number;
  lastSignalAt?: Date;
}

export interface PublishedSignal extends Signal {
  providerId: string;
  subscribers: number;
  views: number;
  feedback: SignalFeedback;
}

export interface SignalFeedback {
  helpful: number;
  notHelpful: number;
  reports: number;
  comments: SignalComment[];
}

export interface SignalComment {
  id: string;
  userId: string;
  content: string;
  rating?: number;
  timestamp: Date;
}

// ============================================================================
// Continuous Learning Types
// ============================================================================

export interface ContinuousLearningConfig {
  enabled: boolean;
  feedbackLoopEnabled: boolean;
  retrainingFrequency: number; // hours
  minSamplesForUpdate: number;
  performanceThreshold: number;
}

export interface ModelPerformance {
  modelId: string;
  name: string;
  version: string;
  type: ModelType;
  metrics: ModelMetrics;
  trainingHistory: TrainingRun[];
  lastTrainedAt: Date;
  nextRetrainingAt?: Date;
}

export type ModelType =
  | 'signal_generator'
  | 'anomaly_detector'
  | 'price_predictor'
  | 'risk_assessor'
  | 'sentiment_analyzer'
  | 'portfolio_optimizer';

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse?: number;
  mae?: number;
  sharpeRatio?: number;
  customMetrics?: Record<string, number>;
}

export interface TrainingRun {
  id: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  samplesUsed: number;
  epochsCompleted: number;
  metrics: ModelMetrics;
  improvements: Record<string, number>;
}

export interface FeedbackRecord {
  id: string;
  signalId: string;
  modelId?: string;
  type: 'outcome' | 'user' | 'system';
  outcome: 'correct' | 'incorrect' | 'partial';
  expectedValue?: number;
  actualValue?: number;
  profit?: number;
  userRating?: number;
  comments?: string;
  timestamp: Date;
}

export interface AgentLearningState {
  agentId: string;
  signalsProcessed: number;
  correctPredictions: number;
  totalProfit: number;
  performanceTrend: 'improving' | 'stable' | 'declining';
  lastFeedbackAt?: Date;
  modelVersions: Record<string, string>;
}

// ============================================================================
// Security & Governance Types
// ============================================================================

export interface SecurityConfig {
  validationEnabled: boolean;
  manipulationDetectionEnabled: boolean;
  accessControlEnabled: boolean;
  encryptionEnabled: boolean;
  auditLoggingEnabled: boolean;
}

export interface DataValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: Date;
  source: string;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
}

export interface ManipulationAlert {
  id: string;
  type: ManipulationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  asset: string;
  description: string;
  evidence: Evidence[];
  timestamp: Date;
  acknowledged: boolean;
}

export type ManipulationType =
  | 'wash_trading'
  | 'spoofing'
  | 'pump_dump'
  | 'front_running'
  | 'data_poisoning'
  | 'oracle_manipulation';

export interface Evidence {
  type: 'transaction' | 'pattern' | 'statistical' | 'behavioral';
  data: Record<string, unknown>;
  confidence: number;
}

export interface AccessPolicy {
  id: string;
  name: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  principals: string[];
  conditions?: AccessCondition[];
}

export interface AccessCondition {
  type: 'time' | 'ip' | 'role' | 'subscription';
  operator: 'equals' | 'contains' | 'between' | 'in';
  value: unknown;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  resource: string;
  principal: string;
  outcome: 'success' | 'failure' | 'denied';
  details: Record<string, unknown>;
  ipAddress?: string;
}

// ============================================================================
// Platform Configuration Types
// ============================================================================

export interface DataPlatformConfig {
  dataIngestion: DataIngestionConfig;
  onChainData: OnChainDataConfig;
  crossChain: CrossChainConfig;
  marketData: MarketDataConfig;
  alternativeData: AlternativeDataConfig;
  signalEngine: SignalEngineConfig;
  strategyIntelligence: StrategyIntelligenceConfig;
  signalMarketplace: SignalMarketplaceConfig;
  continuousLearning: ContinuousLearningConfig;
  security: SecurityConfig;
}

export interface DataIngestionConfig {
  enabled: boolean;
  pipelines: DataPipelineConfig[];
  defaultBatchSize: number;
  defaultRetryPolicy: RetryPolicy;
  monitoringEnabled: boolean;
}

export interface SignalEngineConfig {
  enabled: boolean;
  defaultProvider: string;
  signals: SignalConfig[];
  anomalyDetectionEnabled: boolean;
  arbitrageDetectionEnabled: boolean;
  riskMonitoringEnabled: boolean;
  aiInferenceProvider: 'groq' | 'openai' | 'anthropic';
}

// ============================================================================
// Event Types
// ============================================================================

export interface DataPlatformEvent {
  id: string;
  timestamp: Date;
  type: DataPlatformEventType;
  category: DataPlatformEventCategory;
  data: Record<string, unknown>;
  source: string;
}

export type DataPlatformEventType =
  | 'data_ingested'
  | 'data_processed'
  | 'signal_generated'
  | 'signal_triggered'
  | 'anomaly_detected'
  | 'arbitrage_found'
  | 'risk_alert'
  | 'model_updated'
  | 'pipeline_error'
  | 'validation_failed'
  | 'manipulation_detected'
  | 'subscription_created'
  | 'signal_published';

export type DataPlatformEventCategory =
  | 'ingestion'
  | 'processing'
  | 'signals'
  | 'learning'
  | 'security'
  | 'marketplace';

export type DataPlatformEventCallback = (event: DataPlatformEvent) => void;
