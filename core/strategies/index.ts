// Core Strategies — consolidated from:
//   src/strategy → core/strategies/engine
//   src/strategies → core/strategies/implementations
//   src/strategy-engine → core/strategies/strategy-engine
//   src/strategy-marketplace → core/strategies/marketplace
//   src/backtesting → core/strategies/backtesting

// engine — defines canonical StrategyParameter, StrategyRiskLevel, ValidationError,
// ValidationWarning, StrategyEngineConfig, StrategyStatus, BenchmarkComparison
export * from './engine';

// implementations — exclude types already exported from engine
// (StrategyRiskLevel, StrategyParameter, StrategyMetadata, ValidationError, ValidationWarning)
export type {
  StrategyVisibilityState,
  StrategyPublishCategory,
  StrategyPackage,
  StrategyVersion,
  StrategyPerformanceMetrics,
  PublishStrategyRequest,
  PublishStrategyResponse,
  UpdateStrategyRequest,
  UpdateStrategyResponse,
  DeveloperStrategyFilter,
  DeveloperStrategiesResponse,
  ValidationResult,
  PublishingEvent,
  PublishingEventType,
  PublishingEventCallback,
  StrategyValidator,
  StrategyRegistryStorage,
  PublishingApiRequest,
  PublishingApiResponse,
  PublishingApiResponseBody,
  PublishingErrorCode,
  MarketplaceIntegration,
} from './implementations';
export {
  DefaultStrategyValidator,
  createStrategyValidator,
  SUPPORTED_PAIRS,
  VALID_RISK_LEVELS,
  VALID_CATEGORIES,
  LIMITS,
  InMemoryStrategyRegistry,
  createStrategyRegistry as createPublishingStrategyRegistry,
  PublishingApi,
  createPublishingApi,
  createDemoPublishingApi,
  PublishingError,
  DefaultMarketplaceIntegration,
  createMarketplaceIntegration,
} from './implementations';

// strategy-engine (v1) — exclude StrategyStatus, StrategyMetadata, StrategyEngineConfig
// (already from engine). Keep unique exports only.
export type {
  StrategyParamValue,
  StrategyParam,
  StrategyParams,
  BuiltInStrategyType,
  StrategyExecutionResult,
  StrategyEngineMetrics,
  RegisteredStrategyClass,
  StrategyEngineEventType,
  StrategyEngineEvent,
  StrategyEngineEventHandler,
  StrategyEngineUnsubscribe,
  StrategyEngineErrorCode,
  StrategyInterface,
  StrategyRegistry,
  StrategyLoader,
} from './strategy-engine';
export {
  StrategyEngineError,
  BaseStrategy,
  DefaultStrategyRegistry,
  createStrategyRegistry,
  DefaultStrategyLoader,
  createStrategyLoader,
  StrategyExecutionEngine,
  createStrategyExecutionEngine,
  DEFAULT_ENGINE_CONFIG,
  TrendStrategy,
  ArbitrageStrategy,
  AISignalStrategy,
} from './strategy-engine';

// marketplace
export * from './marketplace';

// backtesting — exclude BenchmarkComparison (already in engine/types)
// also exclude TradeRecord (may conflict with other modules)
export {
  DefaultBacktestingFramework,
  createBacktestingFramework,
  DEFAULT_FRAMEWORK_CONFIG,
} from './backtesting';
export type {
  AssetSymbol,
  BacktestId,
  ReportId,
  SessionId,
  DataGranularity,
  OHLCVCandle,
  OrderBookSnapshot,
  VolatilityIndicator,
  MarketDataSnapshot as BacktestMarketDataSnapshot,
  DataSourceConfig as BacktestDataSourceConfig,
  SyntheticDataConfig,
  DataValidationResult as BacktestDataValidationResult,
  ReplaySpeed,
  ReplayConfig,
  ReplayState,
  ReplayStatus,
  ReplayEvent,
  ReplayEventType,
  ReplayEventCallback,
  SimulationConfig,
  SlippageModel,
  FeeModel,
  FillModel,
  SimulatedOrder,
  OrderStatus,
  SimulatedPosition,
  PortfolioState,
  PerformanceReport,
} from './backtesting/types';
