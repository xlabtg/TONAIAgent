/**
 * TONAIAgent - Risk Engine v1
 * Issue #154: Risk Engine v1
 *
 * Dedicated risk management engine responsible for monitoring and controlling
 * risk across individual strategies, AI-managed funds, agent portfolios,
 * and the entire platform.
 *
 * Architecture:
 *   AI Agents
 *        ↓
 *   Live Trading Infrastructure
 *        ↓
 *   Risk Engine
 *        ↓
 *   Execution Approval / Rejection
 *
 * Core Components:
 *   1. Strategy Risk Evaluator    — evaluates each strategy's risk profile
 *   2. Real-Time Exposure Monitor — tracks portfolio exposure continuously
 *   3. Risk Limits Enforcer       — enforces configurable risk thresholds
 *   4. Risk Response Handler      — triggers automated risk responses
 *   5. Risk Scorer                — maintains dynamic risk scores
 *   6. Risk Dashboard             — exposes metrics for transparency
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

// ─── Unified Risk Engine ──────────────────────────────────────────────────────

import { DefaultStrategyRiskEvaluator } from './strategy-risk-evaluator';
import { DefaultRealTimeExposureMonitor } from './exposure-monitor';
import { DefaultRiskLimitsEnforcer } from './risk-limits';
import { DefaultRiskResponseHandler } from './risk-response';
import { DefaultRiskScorer } from './risk-scorer';
import { DefaultRiskDashboard } from './risk-dashboard';

import type { StrategyRiskEvaluator } from './strategy-risk-evaluator';
import type { RealTimeExposureMonitor } from './exposure-monitor';
import type { RiskLimitsEnforcer } from './risk-limits';
import type { RiskResponseHandler } from './risk-response';
import type { RiskScorer } from './risk-scorer';
import type { RiskDashboard } from './risk-dashboard';

import type {
  RiskEngineConfig,
  RiskEngineEvent,
  RiskEngineEventCallback,
  RiskDashboardMetrics,
} from './types';

export interface RiskEngineStatus {
  activeResponses: number;
  monitoredAgents: number;
  evaluatedStrategies: number;
  dashboardMetrics: RiskDashboardMetrics;
}

export interface RiskEngine {
  readonly strategyEvaluator: StrategyRiskEvaluator;
  readonly exposureMonitor: RealTimeExposureMonitor;
  readonly riskLimits: RiskLimitsEnforcer;
  readonly riskResponse: RiskResponseHandler;
  readonly riskScorer: RiskScorer;
  readonly dashboard: RiskDashboard;
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

  private readonly globalCallbacks: RiskEngineEventCallback[] = [];

  constructor(config?: RiskEngineConfig) {
    this.strategyEvaluator = new DefaultStrategyRiskEvaluator(config?.strategyEvaluator);
    this.exposureMonitor = new DefaultRealTimeExposureMonitor(config?.exposureMonitor);
    this.riskLimits = new DefaultRiskLimitsEnforcer(config?.riskLimits);
    this.riskResponse = new DefaultRiskResponseHandler(config?.autoResponse);
    this.riskScorer = new DefaultRiskScorer();
    this.dashboard = new DefaultRiskDashboard();

    this.setupEventForwarding();
  }

  getStatus(): RiskEngineStatus {
    return {
      activeResponses: this.riskResponse.getActiveResponses().length,
      monitoredAgents: this.exposureMonitor.getAllSnapshots().length,
      evaluatedStrategies: this.strategyEvaluator.getAllProfiles().length,
      dashboardMetrics: this.dashboard.getMetrics(),
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

    this.strategyEvaluator.onEvent(forward);
    this.exposureMonitor.onEvent(forward);
    this.riskLimits.onEvent(forward);
    this.riskResponse.onEvent(forward);
    this.riskScorer.onEvent(forward);
    this.dashboard.onEvent(forward);
  }
}

export function createRiskEngine(config?: RiskEngineConfig): DefaultRiskEngine {
  return new DefaultRiskEngine(config);
}

// Default export
export default DefaultRiskEngine;
