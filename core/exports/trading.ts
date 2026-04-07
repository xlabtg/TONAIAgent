/**
 * Trading Domain Exports
 *
 * Strategy engine, live trading infrastructure, strategy marketplace, and portfolio engine.
 * Import directly via subpath for tree-shaking:
 *   import { ... } from '@tonaiagent/core/strategy'
 *   import { ... } from '@tonaiagent/core/live-trading'
 *   import { ... } from '@tonaiagent/core/strategy-marketplace'  (via subpath)
 *   import { ... } from '@tonaiagent/core/portfolio'             (via subpath)
 */

// Re-export strategy with namespace to avoid naming conflicts with multi-agent and tokenomics types
// (multiple modules define types like CapitalAllocation, ActionResult, and StrategyPerformance)
export * as Strategy from '../strategies/engine';

// Live Trading Infrastructure (Issue #151)
export * as LiveTrading from '../trading/live';
export {
  // Main infrastructure factory
  createLiveTradingInfrastructure,
  DefaultLiveTradingInfrastructure,
  // Connector layer
  createSimulatedConnector,
  createConnectorRegistry,
  isTerminalOrderStatus,
  ConnectorError,
  // Execution engine
  createExecutionEngine,
  ExecutionError,
  // Market data
  createMarketDataService,
  // Risk controls
  createRiskControlsService,
  buildRiskProfile,
  // Portfolio
  createPortfolioService,
  // Key management
  createKeyManagementService,
  KeyManagementError,
  // Key types
  type LiveTradingConfig,
  type LiveTradingHealth,
  type LiveTradingMetrics,
  type LiveTradingEvent,
  type LiveTradingEventCallback,
  type ExchangeConnectorConfig,
  type ExecutionRequest,
  // Note: exported as LiveTradingExecutionResult to avoid conflict with ai module's ExecutionResult
  type ExecutionResult as LiveTradingExecutionResult,
  type PortfolioState,
  type PortfolioSummary,
  type RiskProfile,
  type RiskCheckResult as LiveTradingRiskCheckResult,
} from '../trading/live';

// Strategy Marketplace MVP (Issue #201)
export * as StrategyMarketplaceMVP from '../strategies/marketplace';
export {
  // Marketplace
  DefaultStrategyMarketplace,
  createStrategyMarketplace,
  // Built-in strategies
  BUILTIN_STRATEGIES,
  // Backtesting Integration (Issue #202)
  DefaultMarketplaceBacktester,
  createMarketplaceBacktester,
  parseCLIBacktestArgs,
  runCLIBacktest,
  formatCLIBacktestResult,
  // Types
  type MarketplaceStrategyCategory,
  type MarketplaceRiskLevel,
  type MarketplaceStrategyListing,
  type DeployMarketplaceStrategyInput,
  type MarketplaceDeployedAgent,
  type MarketplaceStrategyFilter,
  type StrategyMarketplace,
  // Backtesting Types (Issue #202)
  type BacktestTimeframe,
  type MarketplaceBacktestConfig,
  type BacktestResultSummary,
  type MarketplaceBacktestResult,
  type BacktestComparisonResult,
  type MarketplaceBacktester,
  type CLIBacktestConfig,
} from '../strategies/marketplace';

// Portfolio Engine (Issue #214)
export * as PortfolioEngine from '../portfolio/base';
export {
  // Storage
  PortfolioStorage,
  createPortfolioStorage,
  createDemoPortfolioStorage,
  // Engine
  PortfolioEngine as PortfolioEngineClass,
  createPortfolioEngine,
  createDemoPortfolioEngine,
  // API
  PortfolioApi,
  createPortfolioApi,
  createDemoPortfolioApi,
  // Error
  PortfolioError,
  // Config
  DEFAULT_PORTFOLIO_ENGINE_CONFIG,
  // Key types
  type Portfolio,
  type Position,
  type Trade,
  type BalanceRecord,
  type PortfolioSummary as PortfolioEngineSummary,
  type PortfolioMetrics,
  type TradeSide,
  type PositionStatus,
  type TradeFilter,
  type PortfolioEngineConfig,
  type PortfolioEvent,
  type PortfolioEventType,
  type PortfolioEventHandler,
  type PortfolioUnsubscribe,
  type PortfolioErrorCode,
  type PortfolioApiRequest,
  type PortfolioApiResponse,
  type PortfolioOverviewResponse,
  type TradeHistoryResponse,
  type PositionsResponse,
  type ExecuteTradeRequest,
  type ExecuteTradeResult,
} from '../portfolio/base';

// Re-export data-platform with namespace to avoid naming conflicts
// (data-platform defines MarketDataService which could conflict with other modules)
export * as DataPlatform from '../market-data/data-platform';
