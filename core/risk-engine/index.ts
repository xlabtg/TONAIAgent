/**
 * TONAIAgent - Risk Management Engine
 * @mvp Core risk module — required for MVP (risk limits, trade validation, stop-loss)
 * Issue #154: Risk Engine v1
 * Issue #203: Risk Management Engine (enhanced)
 *
 * Centralized risk control system that ensures strategies operate within safe parameters.
 * The Risk Engine sits between the Strategy Engine and Trading Engine, protecting both
 * individual agents and the overall portfolio.
 *
 * Architecture:
 *   Market Data
 *        ↓
 *   Strategy Engine
 *        ↓
 *   Risk Engine (Trade Validator, Stop-Loss, Portfolio Protection)
 *        ↓
 *   Trading Engine
 *        ↓
 *   Portfolio Update
 *
 * Core Components (v1 - Issue #154):
 *   1. Strategy Risk Evaluator    — evaluates each strategy's risk profile
 *   2. Real-Time Exposure Monitor — tracks portfolio exposure continuously
 *   3. Risk Limits Enforcer       — enforces configurable risk thresholds
 *   4. Risk Response Handler      — triggers automated risk responses
 *   5. Risk Scorer                — maintains dynamic risk scores
 *   6. Risk Dashboard             — exposes metrics for transparency
 *
 * Additional Components (v2 - Issue #203):
 *   7. Trade Validator            — validates trades before execution
 *   8. Stop-Loss Manager          — automatic stop-loss protection
 *   9. Portfolio Protection       — coordinated portfolio protection system
 *  10. Risk Metrics API           — real-time metrics for dashboards
 *
 * Risk Controls:
 *   - Position Size Limits: max 5% of portfolio per trade
 *   - Portfolio Exposure Limits: max 20% per asset
 *   - Stop-Loss Protection: automatic exit at configurable levels
 *   - Max Drawdown Protection: pause agent at 15% drawdown
 *   - Daily Loss Limit: disable trading at 3% daily loss
 *
 * Risk Score Range:
 *   0–30   → Low Risk
 *   31–60  → Moderate Risk
 *   61–80  → High Risk
 *   81–100 → Critical Risk
 *
 * @example
 * ```typescript
 * import { createRiskEngine } from '@tonaiagent/core/risk-engine';
 *
 * const riskEngine = createRiskEngine({
 *   riskLimits: {
 *     maxPositionSizePercent: 20,
 *     maxLeverageRatio: 5,
 *     maxPortfolioDrawdownPercent: 15,
 *     maxStrategyAllocationPercent: 30,
 *   },
 *   autoResponse: {
 *     enableAutoRebalance: true,
 *     enableAutoPauseStrategy: true,
 *     enableEmergencyShutdown: true,
 *     criticalScoreThreshold: 81,
 *   },
 * });
 *
 * // Evaluate a strategy before deployment
 * const profile = riskEngine.strategyEvaluator.evaluate({
 *   strategyId: 'strategy_001',
 *   volatility: 0.25,
 *   maxDrawdown: 0.15,
 *   leverageRatio: 2.0,
 *   assetConcentration: 0.40,
 *   historicalStability: 0.80,
 * });
 *
 * // Monitor portfolio exposure in real-time
 * riskEngine.exposureMonitor.update({
 *   agentId: 'agent_001',
 *   totalValue: 100000,
 *   assetExposures: [
 *     { assetId: 'TON', value: 40000 },
 *     { assetId: 'USDT', value: 60000 },
 *   ],
 *   unrealizedLosses: 5000,
 * });
 *
 * // Check risk limits before trade execution
 * const limitCheck = riskEngine.riskLimits.check({
 *   entityId: 'agent_001',
 *   entityType: 'agent',
 *   positionSizePercent: 25,
 *   leverageRatio: 3,
 * });
 *
 * if (!limitCheck.passed) {
 *   console.log('Trade blocked:', limitCheck.violations);
 * }
 *
 * // Subscribe to risk events
 * riskEngine.onEvent(event => {
 *   if (event.type === 'risk_response_triggered') {
 *     console.log('Automated risk response:', event.payload);
 *   }
 * });
 * ```
 */

// ─── Re-export types ──────────────────────────────────────────────────────────

export * from './types';

// ─── Issue #269: Capital Protection Layer ────────────────────────────────────

export {
  CapitalProtectionEvaluator,
  createCapitalProtectionEvaluator,
  RollingLossTracker,
  DrawdownTracker,
  computeHHI,
  normalizedHHI,
  DEFAULT_HARDENED_RISK_CONFIG,
  type HardenedRiskConfig,
  type HardenedRiskFailureReason,
  type CapitalProtectionRequest,
  type CapitalProtectionPortfolio,
  type CapitalProtectionResult,
  type AssetExposureInput,
} from './capital-protection';

// ─── Re-export sub-modules ────────────────────────────────────────────────────

export {
  DefaultStrategyRiskEvaluator,
  createStrategyRiskEvaluator,
  type StrategyRiskEvaluator,
} from './strategy-risk-evaluator';

export {
  DefaultRealTimeExposureMonitor,
  createRealTimeExposureMonitor,
  type RealTimeExposureMonitor,
  type ExposureUpdateInput,
} from './exposure-monitor';

export {
  DefaultRiskLimitsEnforcer,
  createRiskLimitsEnforcer,
  type RiskLimitsEnforcer,
  type RiskLimitsCheckInput,
} from './risk-limits';

export {
  DefaultRiskResponseHandler,
  createRiskResponseHandler,
  type RiskResponseHandler,
} from './risk-response';

export {
  DefaultRiskScorer,
  createRiskScorer,
  type RiskScorer,
  type StrategyScoreInput,
  type PortfolioScoreInput,
  type FundScoreInput,
} from './risk-scorer';

export {
  DefaultRiskDashboard,
  createRiskDashboard,
  buildDrawdownAlert,
  buildLeverageAlert,
  type RiskDashboard,
} from './risk-dashboard';

// ─── Issue #203: Risk Management Engine Components ───────────────────────────

export {
  DefaultTradeValidator,
  createTradeValidator,
  DEFAULT_TRADE_VALIDATOR_CONFIG,
  type TradeValidator,
  type TradeValidatorConfig,
  type TradeValidationRequest,
  type TradeValidationResult,
  type TradeWarning,
  type TradeSuggestion,
} from './trade-validator';

export {
  DefaultStopLossManager,
  createStopLossManager,
  DEFAULT_STOP_LOSS_CONFIG,
  type StopLossManager,
  type StopLossManagerConfig,
  type StopLossConfig,
  type StopLossType,
  type Position,
  type StopLossCheck,
  type StopLossExitSignal,
} from './stop-loss-manager';

export {
  DefaultPortfolioProtection,
  createPortfolioProtection,
  DEFAULT_PORTFOLIO_PROTECTION_CONFIG,
  type PortfolioProtection,
  type PortfolioProtectionConfig,
  type ProtectedAgent,
  type ProtectionMetrics,
  type ProtectionAlert,
  type AgentStatus,
} from './portfolio-protection';

export {
  DefaultRiskMetricsAPI,
  createRiskMetricsAPI,
  type RiskMetricsAPI,
  type RiskMetricsSnapshot,
  type PortfolioRiskMetrics,
  type AgentRiskMetrics,
  type StrategyRiskMetrics,
  type RiskAlertSummary,
  type ActiveRiskControls,
  type UserRiskOverview,
  type QuickRiskAction,
  type MarketplaceRiskRating,
  type RiskFactor,
} from './risk-metrics-api';

// ─── Unified Risk Engine ──────────────────────────────────────────────────────

import { DefaultStrategyRiskEvaluator } from './strategy-risk-evaluator';
import { DefaultRealTimeExposureMonitor } from './exposure-monitor';
import { DefaultRiskLimitsEnforcer } from './risk-limits';
import { DefaultRiskResponseHandler } from './risk-response';
import { DefaultRiskScorer } from './risk-scorer';
import { DefaultRiskDashboard } from './risk-dashboard';
import { DefaultTradeValidator } from './trade-validator';
import { DefaultStopLossManager } from './stop-loss-manager';
import { DefaultPortfolioProtection } from './portfolio-protection';
import { DefaultRiskMetricsAPI } from './risk-metrics-api';
import { CapitalProtectionEvaluator } from './capital-protection';

import type { HardenedRiskConfig, CapitalProtectionRequest, CapitalProtectionPortfolio, CapitalProtectionResult } from './capital-protection';
import type { StrategyRiskEvaluator } from './strategy-risk-evaluator';
import type { RealTimeExposureMonitor } from './exposure-monitor';
import type { RiskLimitsEnforcer } from './risk-limits';
import type { RiskResponseHandler } from './risk-response';
import type { RiskScorer } from './risk-scorer';
import type { RiskDashboard } from './risk-dashboard';
import type { TradeValidator, TradeValidatorConfig } from './trade-validator';
import type { StopLossManager, StopLossManagerConfig } from './stop-loss-manager';
import type { PortfolioProtection, PortfolioProtectionConfig, ProtectionMetrics } from './portfolio-protection';
import type { RiskMetricsAPI, RiskMetricsSnapshot } from './risk-metrics-api';

import type {
  RiskEngineConfig,
  RiskEngineEvent,
  RiskEngineEventCallback,
  RiskDashboardMetrics,
} from './types';

// ─── Extended Risk Engine Configuration (Issue #203) ─────────────────────────

export interface ExtendedRiskEngineConfig extends RiskEngineConfig {
  /** Trade validator configuration */
  tradeValidator?: Partial<TradeValidatorConfig>;
  /** Stop-loss manager configuration */
  stopLossManager?: Partial<StopLossManagerConfig>;
  /** Portfolio protection configuration */
  portfolioProtection?: Partial<PortfolioProtectionConfig>;
  /** Issue #269: Capital protection configuration */
  capitalProtection?: Partial<HardenedRiskConfig>;
}

export interface RiskEngineStatus {
  activeResponses: number;
  monitoredAgents: number;
  evaluatedStrategies: number;
  dashboardMetrics: RiskDashboardMetrics;
  /** Issue #203: Additional status fields */
  protectionMetrics: ProtectionMetrics;
  metricsSnapshot: RiskMetricsSnapshot;
  disabledAgents: string[];
  activePositions: number;
}

export interface RiskEngine {
  readonly strategyEvaluator: StrategyRiskEvaluator;
  readonly exposureMonitor: RealTimeExposureMonitor;
  readonly riskLimits: RiskLimitsEnforcer;
  readonly riskResponse: RiskResponseHandler;
  readonly riskScorer: RiskScorer;
  readonly dashboard: RiskDashboard;
  /** Issue #203: Trade validation layer */
  readonly tradeValidator: TradeValidator;
  /** Issue #203: Stop-loss protection */
  readonly stopLossManager: StopLossManager;
  /** Issue #203: Portfolio protection system */
  readonly portfolioProtection: PortfolioProtection;
  /** Issue #203: Risk metrics API */
  readonly metricsAPI: RiskMetricsAPI;
  /** Issue #269: Capital protection evaluator */
  readonly capitalProtection: CapitalProtectionEvaluator;
  getStatus(): RiskEngineStatus;
  onEvent(callback: RiskEngineEventCallback): void;
}

export class DefaultRiskEngine implements RiskEngine {
  readonly strategyEvaluator: StrategyRiskEvaluator;
  readonly exposureMonitor: RealTimeExposureMonitor;
  readonly riskLimits: RiskLimitsEnforcer;
  readonly riskResponse: RiskResponseHandler;
  readonly riskScorer: RiskScorer;
  readonly dashboard: RiskDashboard;
  /** Issue #203: Trade validation layer */
  readonly tradeValidator: TradeValidator;
  /** Issue #203: Stop-loss protection */
  readonly stopLossManager: StopLossManager;
  /** Issue #203: Portfolio protection system */
  readonly portfolioProtection: PortfolioProtection;
  /** Issue #203: Risk metrics API */
  readonly metricsAPI: RiskMetricsAPI;
  /** Issue #269: Capital protection evaluator */
  readonly capitalProtection: CapitalProtectionEvaluator;

  private readonly globalCallbacks: RiskEngineEventCallback[] = [];

  constructor(config?: ExtendedRiskEngineConfig) {
    // v1 Components (Issue #154)
    this.strategyEvaluator = new DefaultStrategyRiskEvaluator(config?.strategyEvaluator);
    this.exposureMonitor = new DefaultRealTimeExposureMonitor(config?.exposureMonitor);
    this.riskLimits = new DefaultRiskLimitsEnforcer(config?.riskLimits);
    this.riskResponse = new DefaultRiskResponseHandler(config?.autoResponse);
    this.riskScorer = new DefaultRiskScorer();
    this.dashboard = new DefaultRiskDashboard();

    // v2 Components (Issue #203)
    this.tradeValidator = new DefaultTradeValidator(config?.tradeValidator);
    this.stopLossManager = new DefaultStopLossManager(config?.stopLossManager);
    this.portfolioProtection = new DefaultPortfolioProtection(config?.portfolioProtection);
    this.metricsAPI = new DefaultRiskMetricsAPI();

    // v3 Components (Issue #269)
    this.capitalProtection = new CapitalProtectionEvaluator(config?.capitalProtection);

    this.setupEventForwarding();
  }

  getStatus(): RiskEngineStatus {
    return {
      activeResponses: this.riskResponse.getActiveResponses().length,
      monitoredAgents: this.exposureMonitor.getAllSnapshots().length,
      evaluatedStrategies: this.strategyEvaluator.getAllProfiles().length,
      dashboardMetrics: this.dashboard.getMetrics(),
      // Issue #203: Extended status
      protectionMetrics: this.portfolioProtection.getMetrics(),
      metricsSnapshot: this.metricsAPI.getSnapshot(),
      disabledAgents: this.tradeValidator.getDisabledAgents(),
      activePositions: this.stopLossManager.getAllPositions().length,
    };
  }

  onEvent(callback: RiskEngineEventCallback): void {
    this.globalCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forward = (event: RiskEngineEvent) => {
      for (const cb of this.globalCallbacks) {
        try {
          cb(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // v1 Components
    this.strategyEvaluator.onEvent(forward);
    this.exposureMonitor.onEvent(forward);
    this.riskLimits.onEvent(forward);
    this.riskResponse.onEvent(forward);
    this.riskScorer.onEvent(forward);
    this.dashboard.onEvent(forward);

    // v2 Components (Issue #203)
    this.tradeValidator.onEvent(forward);
    this.stopLossManager.onEvent(forward);
    this.portfolioProtection.onEvent(forward);

    // v3 Components (Issue #269)
    this.capitalProtection.onEvent(forward);
  }
}

export function createRiskEngine(config?: ExtendedRiskEngineConfig): DefaultRiskEngine {
  return new DefaultRiskEngine(config);
}

// Default export
export default DefaultRiskEngine;
