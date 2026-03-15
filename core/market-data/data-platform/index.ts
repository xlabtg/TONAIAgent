/**
 * TONAIAgent - Global Data and Signal Platform
 *
 * Scalable, real-time data and signal platform powering autonomous AI agents
 * across the TON ecosystem. Aggregates, processes, and analyzes global financial
 * and on-chain data to generate actionable intelligence for AI-driven strategies.
 *
 * @example
 * ```typescript
 * import { createDataPlatformManager, DataPlatformConfig } from '@tonaiagent/core/data-platform';
 *
 * const platform = createDataPlatformManager({
 *   signalEngine: { enabled: true, aiInferenceProvider: 'groq' },
 *   marketData: { updateInterval: 1000 },
 *   onChainData: { realtimeEnabled: true },
 * });
 *
 * // Get real-time price data
 * const price = await platform.marketData.getPrice('TON/USDT');
 *
 * // Generate trading signals
 * const signals = await platform.signals.generateSignals('TON', ['price', 'momentum']);
 *
 * // Detect anomalies
 * const anomalies = await platform.signals.detectAnomalies('TON');
 *
 * // Get portfolio recommendations
 * const recommendations = await platform.intelligence.getRecommendations('portfolio-1');
 * ```
 */

// Export all types
export * from './types';

// Export data ingestion
export {
  DefaultDataSourceManager,
  DefaultDataPipelineManager,
  DefaultBatchProcessor,
  DefaultStreamProcessor,
  createDataSourceManager,
  createDataPipelineManager,
  createBatchProcessor,
  createStreamProcessor,
  type DataSourceManager,
  type DataPipelineManager,
  type BatchProcessor,
  type StreamProcessor,
  type HealthCheckResult,
  type BatchProcessorOptions,
  type BatchProcessResult,
  type FailedRecord,
  type StreamHandler,
  type StreamProcessorOptions,
  type WindowConfig,
  type StreamSubscription,
  type StreamMetrics,
} from './data-ingestion';

// Export on-chain data
export {
  DefaultOnChainDataService,
  createOnChainDataService,
  type OnChainDataService,
  type TransactionQueryParams,
  type TransactionResult,
  type JettonHolder,
  type JettonTransfer,
  type PoolStats,
  type NetworkStats,
  type WhaleMovement,
} from './on-chain-data';

// Export cross-chain data
export {
  DefaultCrossChainDataService,
  createCrossChainDataService,
  type CrossChainDataService,
  type ChainStatus,
  type BridgeTransactionQuery,
  type BridgeTransactionResult,
  type CrossChainFlow,
  type TokenFlow,
  type CrossChainArbitrage,
  type ChainTVLComparison,
  type ProtocolTVL,
} from './cross-chain';

// Export market data
export {
  DefaultMarketDataService,
  createMarketDataService,
  type MarketDataService,
  type VolatilityPeriod,
  type HistoricalPriceParams,
  type VolatilityHistoryParams,
  type SlippageEstimate,
  type FundingRate,
  type LiquidationData,
  type MarketSummary,
  type ProviderStatus,
  type Subscription,
  type PriceCallback,
  type OrderBookCallback,
  type TradeCallback,
} from './market-data';

// Export signal engine
export {
  DefaultSignalEngineService,
  createSignalEngineService,
  type SignalEngineService,
  type SignalQueryParams,
  type AnomalyDetectionConfig,
  type ArbitrageDetectionConfig,
  type TimeHorizon,
  type SignalPrediction,
  type PredictionFeature,
  type SignalExplanation,
  type ExplanationFactor,
  type BacktestParams,
  type BacktestResult,
  type BacktestTrade,
  type EquityPoint,
  type SignalCallback,
} from './signal-engine';

// Export strategy intelligence
export {
  DefaultStrategyIntelligenceService,
  createStrategyIntelligenceService,
  type StrategyIntelligenceService,
  type RecommendationParams,
  type RecommendationConstraints,
  type RecommendationResult,
  type PositionChange,
  type AllocationParams,
  type AllocationConstraints,
  type OptimizationResult,
  type StrategyAnalysis,
  type PerformanceMetrics,
  type RiskMetrics,
  type MarketConditionFit,
  type StrategyComparison,
  type StrategyRanking,
  type StrategyImprovement,
} from './strategy-intelligence';

// Export signal marketplace
export {
  DefaultSignalMarketplaceService,
  createSignalMarketplaceService,
  type SignalMarketplaceService,
  type RegisterProviderParams,
  type UpdateProviderParams,
  type ListProvidersParams,
  type SubscribeParams,
  type ProviderAnalytics,
  type MarketplaceStats,
  type CategoryStats,
} from './signal-marketplace';

// Export continuous learning
export {
  DefaultContinuousLearningService,
  createContinuousLearningService,
  type ContinuousLearningService,
  type RegisterModelParams,
  type TrainingParams,
  type RecordFeedbackParams,
  type FeedbackProcessingResult,
  type PerformanceTrend,
  type TrendDataPoint,
  type ModelEvaluation,
  type BenchmarkResult,
  type RetrainingSuggestion,
  type DataRequirements,
  type ModelComparison,
  type ModelRanking,
} from './continuous-learning';

// Export security and governance
export {
  DefaultSecurityGovernanceService,
  createSecurityGovernanceService,
  type SecurityGovernanceService,
  type ValidationSchema,
  type PriceData,
  type TransactionData,
  type ManipulationDetectionParams,
  type SuspiciousActivityReport,
  type AccessCheckParams,
  type AccessCheckResult,
  type AuditLogQuery,
} from './security-governance';

// ============================================================================
// Import Components for Manager
// ============================================================================

import { DataPlatformConfig, DataPlatformEvent, DataPlatformEventCallback } from './types';
import { createDataSourceManager, createDataPipelineManager, DefaultDataSourceManager, DefaultDataPipelineManager } from './data-ingestion';
import { createOnChainDataService, DefaultOnChainDataService } from './on-chain-data';
import { createCrossChainDataService, DefaultCrossChainDataService } from './cross-chain';
import { createMarketDataService, DefaultMarketDataService } from './market-data';
import { createSignalEngineService, DefaultSignalEngineService } from './signal-engine';
import { createStrategyIntelligenceService, DefaultStrategyIntelligenceService } from './strategy-intelligence';
import { createSignalMarketplaceService, DefaultSignalMarketplaceService } from './signal-marketplace';
import { createContinuousLearningService, DefaultContinuousLearningService } from './continuous-learning';
import { createSecurityGovernanceService, DefaultSecurityGovernanceService } from './security-governance';

// ============================================================================
// Data Platform Manager - Unified Entry Point
// ============================================================================

export interface DataPlatformManager {
  readonly enabled: boolean;

  // Core services
  readonly dataSources: DefaultDataSourceManager;
  readonly pipelines: DefaultDataPipelineManager;
  readonly onChainData: DefaultOnChainDataService;
  readonly crossChainData: DefaultCrossChainDataService;
  readonly marketData: DefaultMarketDataService;
  readonly signals: DefaultSignalEngineService;
  readonly intelligence: DefaultStrategyIntelligenceService;
  readonly marketplace: DefaultSignalMarketplaceService;
  readonly learning: DefaultContinuousLearningService;
  readonly security: DefaultSecurityGovernanceService;

  // Health and status
  getHealth(): Promise<DataPlatformHealth>;
  getStats(): Promise<DataPlatformStats>;

  // Events
  onEvent(callback: DataPlatformEventCallback): void;
}

export interface DataPlatformHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    dataSources: boolean;
    pipelines: boolean;
    onChainData: boolean;
    crossChainData: boolean;
    marketData: boolean;
    signals: boolean;
    intelligence: boolean;
    marketplace: boolean;
    learning: boolean;
    security: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export interface DataPlatformStats {
  activePipelines: number;
  dataSources: number;
  signalsGenerated: number;
  anomaliesDetected: number;
  arbitrageOpportunities: number;
  activeRiskAlerts: number;
  marketplaceProviders: number;
  modelsActive: number;
  timestamp: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultDataPlatformManager implements DataPlatformManager {
  readonly enabled: boolean;
  readonly dataSources: DefaultDataSourceManager;
  readonly pipelines: DefaultDataPipelineManager;
  readonly onChainData: DefaultOnChainDataService;
  readonly crossChainData: DefaultCrossChainDataService;
  readonly marketData: DefaultMarketDataService;
  readonly signals: DefaultSignalEngineService;
  readonly intelligence: DefaultStrategyIntelligenceService;
  readonly marketplace: DefaultSignalMarketplaceService;
  readonly learning: DefaultContinuousLearningService;
  readonly security: DefaultSecurityGovernanceService;

  private readonly eventCallbacks: DataPlatformEventCallback[] = [];

  constructor(config: Partial<DataPlatformConfig> = {}) {
    this.enabled = true;

    // Initialize data ingestion
    this.dataSources = createDataSourceManager();
    this.pipelines = createDataPipelineManager(this.dataSources);

    // Initialize data services
    this.onChainData = createOnChainDataService(config.onChainData);
    this.crossChainData = createCrossChainDataService(config.crossChain);
    this.marketData = createMarketDataService(config.marketData);

    // Initialize signal and intelligence services
    this.signals = createSignalEngineService(config.signalEngine);
    this.intelligence = createStrategyIntelligenceService(config.strategyIntelligence);

    // Initialize marketplace and learning
    this.marketplace = createSignalMarketplaceService(config.signalMarketplace);
    this.learning = createContinuousLearningService(config.continuousLearning);

    // Initialize security
    this.security = createSecurityGovernanceService(config.security);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<DataPlatformHealth> {
    const sources = this.dataSources.listSources();
    const pipelines = this.pipelines.listPipelines();

    const components = {
      dataSources: sources.length > 0 && sources.some((s) => s.status === 'active'),
      pipelines: pipelines.length === 0 || pipelines.some((p) => p.status === 'running'),
      onChainData: true, // Always available
      crossChainData: true,
      marketData: true,
      signals: true,
      intelligence: true,
      marketplace: true,
      learning: true,
      security: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: DataPlatformHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount * 0.7) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      lastCheck: new Date(),
      details: {
        activeDataSources: sources.filter((s) => s.status === 'active').length,
        runningPipelines: pipelines.filter((p) => p.status === 'running').length,
      },
    };
  }

  async getStats(): Promise<DataPlatformStats> {
    const pipelines = this.pipelines.listPipelines('running');
    const sources = this.dataSources.listSources();
    const signals = this.signals.getSignals({});
    const anomalies = signals.filter((s) => s.type === 'anomaly');
    const arbitrage = signals.filter((s) => s.type === 'arbitrage');
    const riskAlerts = this.signals.getActiveRiskAlerts();
    const providers = this.marketplace.listProviders();
    const models = this.learning.listModels();

    return {
      activePipelines: pipelines.length,
      dataSources: sources.length,
      signalsGenerated: signals.length,
      anomaliesDetected: anomalies.length,
      arbitrageOpportunities: arbitrage.length,
      activeRiskAlerts: riskAlerts.length,
      marketplaceProviders: providers.length,
      modelsActive: models.length,
      timestamp: new Date(),
    };
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: DataPlatformEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.dataSources.onEvent(forwardEvent);
    this.pipelines.onEvent(forwardEvent);
    this.onChainData.onEvent(forwardEvent);
    this.crossChainData.onEvent(forwardEvent);
    this.marketData.onEvent(forwardEvent);
    this.signals.onEvent(forwardEvent);
    this.intelligence.onEvent(forwardEvent);
    this.marketplace.onEvent(forwardEvent);
    this.learning.onEvent(forwardEvent);
    this.security.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDataPlatformManager(
  config?: Partial<DataPlatformConfig>
): DefaultDataPlatformManager {
  return new DefaultDataPlatformManager(config);
}

// Default export
export default DefaultDataPlatformManager;
