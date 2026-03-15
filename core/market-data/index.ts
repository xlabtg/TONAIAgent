// Core Market Data — consolidated from:
//   src/market-data → core/market-data/base
//   src/data-platform → core/market-data/data-platform
//
// Note: data-platform types are available via 'core/market-data/data-platform' direct import
// to avoid naming conflicts with base exports.

// Base market data — CacheConfig, LiquidityPool, MarketDataProvider, DefaultMarketDataService defined here
export * from './base';

// Data Platform — explicit re-exports to avoid ambiguity with base exports
// Excluded conflicting names: CacheConfig, LiquidityPool, MarketDataProvider,
//   DefaultMarketDataService, createMarketDataService, HealthCheckResult
export {
  DefaultDataSourceManager,
  DefaultDataPipelineManager,
  DefaultBatchProcessor,
  DefaultStreamProcessor,
  createDataSourceManager,
  createDataPipelineManager,
  createBatchProcessor,
  createStreamProcessor,
} from './data-platform/data-ingestion';
export type {
  DataSourceManager,
  DataPipelineManager,
  BatchProcessor,
  StreamProcessor,
  BatchProcessorOptions,
  BatchProcessResult,
  FailedRecord,
  StreamHandler,
  StreamProcessorOptions,
  WindowConfig,
  StreamSubscription,
  StreamMetrics,
} from './data-platform/data-ingestion';
export { DefaultOnChainDataService, createOnChainDataService } from './data-platform/on-chain-data';
export type {
  OnChainDataService,
  TransactionQueryParams,
  TransactionResult,
  JettonHolder,
  JettonTransfer,
  PoolStats,
  NetworkStats,
  WhaleMovement,
} from './data-platform/on-chain-data';
export { DefaultCrossChainDataService, createCrossChainDataService } from './data-platform/cross-chain';
export type {
  CrossChainDataService,
  ChainStatus,
  BridgeTransactionQuery,
  BridgeTransactionResult,
  CrossChainFlow,
  TokenFlow,
  CrossChainArbitrage,
  ChainTVLComparison,
  ProtocolTVL,
} from './data-platform/cross-chain';
export { DefaultSignalEngineService, createSignalEngineService } from './data-platform/signal-engine';
export type {
  SignalEngineService,
  SignalQueryParams,
  AnomalyDetectionConfig,
  ArbitrageDetectionConfig,
  TimeHorizon,
  SignalPrediction,
  PredictionFeature,
  SignalExplanation,
  ExplanationFactor,
  BacktestParams,
  BacktestResult,
  BacktestTrade,
  EquityPoint,
  SignalCallback,
} from './data-platform/signal-engine';
export { DefaultStrategyIntelligenceService, createStrategyIntelligenceService } from './data-platform/strategy-intelligence';
export type {
  StrategyIntelligenceService,
  RecommendationParams,
  RecommendationConstraints,
  RecommendationResult,
  PositionChange,
  AllocationParams,
  AllocationConstraints,
  OptimizationResult,
  StrategyAnalysis,
  PerformanceMetrics,
  RiskMetrics,
  MarketConditionFit,
  StrategyComparison,
  StrategyRanking,
  StrategyImprovement,
} from './data-platform/strategy-intelligence';
export { DefaultSignalMarketplaceService, createSignalMarketplaceService } from './data-platform/signal-marketplace';
export type {
  SignalMarketplaceService,
  RegisterProviderParams,
  UpdateProviderParams,
  ListProvidersParams,
  SubscribeParams,
  ProviderAnalytics,
  MarketplaceStats,
  CategoryStats,
} from './data-platform/signal-marketplace';
export { DefaultContinuousLearningService, createContinuousLearningService } from './data-platform/continuous-learning';
export type {
  ContinuousLearningService,
  RegisterModelParams,
  TrainingParams,
  RecordFeedbackParams,
  FeedbackProcessingResult,
  PerformanceTrend,
  TrendDataPoint,
  ModelEvaluation,
  BenchmarkResult,
  RetrainingSuggestion,
  DataRequirements,
  ModelComparison,
  ModelRanking,
} from './data-platform/continuous-learning';
export { DefaultSecurityGovernanceService, createSecurityGovernanceService } from './data-platform/security-governance';
export type {
  SecurityGovernanceService,
  ValidationSchema,
  PriceData,
  TransactionData,
  ManipulationDetectionParams,
  SuspiciousActivityReport,
  AccessCheckParams,
  AccessCheckResult,
  AuditLogQuery,
} from './data-platform/security-governance';
// Data platform non-conflicting types
export type {
  DataSourceType,
  DataSourceStatus,
  DataSource,
  DataSourceConfig,
  RetryPolicy,
  DataTransformer,
  PipelineMode,
  PipelineStatus,
  DataPipeline,
  DataPipelineConfig,
  DataProcessor,
  ProcessorType,
  DataSink,
  DataSinkConfig,
  SinkType,
  PipelineMetrics,
  ErrorHandlingStrategy,
  DataSchema,
  SchemaField,
  OnChainDataConfig,
  NetworkConfig,
  IndexerConfig,
  TONTransaction,
  TONWallet,
  JettonBalance,
  JettonInfo,
  JettonMetadata,
  NFTCollection,
  NFTItem,
  NFTAttribute,
  DeFiProtocol,
  DeFiProtocolType,
  GovernanceActivity,
  CrossChainConfig,
  ChainConfig,
  ChainType,
  BridgeConfig,
  BridgeFees,
  CrossChainAsset,
  AssetChainInfo,
  BridgeTransaction,
  BridgeStatus,
  MarketDataConfig,
  PriceFeed,
  OHLCV,
  OrderBookLevel,
  OrderBook,
} from './data-platform/types';
// Data platform manager
export { DefaultDataPlatformManager, createDataPlatformManager } from './data-platform';
export type { DataPlatformManager, DataPlatformHealth, DataPlatformStats } from './data-platform';
