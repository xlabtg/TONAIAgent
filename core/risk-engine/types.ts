/**
 * Risk Engine v1 — Type Definitions
 * Issue #154: Risk Engine v1
 *
 * Type definitions for strategy risk evaluation, real-time exposure monitoring,
 * risk limits enforcement, automated risk response, and risk scoring.
 */

// ─── Shared Primitives ────────────────────────────────────────────────────────

export type StrategyId = string;
export type FundId = string;
export type AgentId = string;
export type AssetId = string;

// ─── Risk Score Range ─────────────────────────────────────────────────────────

/**
 * Risk score categories:
 *   0–30   → Low Risk
 *   31–60  → Moderate Risk
 *   61–80  → High Risk
 *   81–100 → Critical Risk
 */
export type RiskCategory = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskScore {
  value: number;           // 0–100
  category: RiskCategory;
  timestamp: Date;
  explanation: string;
}

// ─── Strategy Risk Profile ────────────────────────────────────────────────────

export interface StrategyRiskProfile {
  strategyId: StrategyId;
  volatility: number;               // annualized volatility (0–1)
  maxDrawdown: number;              // max drawdown fraction (0–1)
  leverageRatio: number;            // current leverage multiplier
  assetConcentration: number;       // top asset concentration fraction (0–1)
  historicalStability: number;      // stability score (0–1, higher = more stable)
  riskScore: RiskScore;
  evaluatedAt: Date;
}

export interface StrategyRiskInput {
  strategyId: StrategyId;
  volatility: number;
  maxDrawdown: number;
  leverageRatio: number;
  assetConcentration: number;
  historicalStability: number;
}

// ─── Portfolio Exposure ───────────────────────────────────────────────────────

export interface AssetExposure {
  assetId: AssetId;
  value: number;
  percentage: number;     // fraction of total portfolio (0–1)
}

export interface StrategyAllocation {
  strategyId: StrategyId;
  fundId: FundId;
  allocatedCapital: number;
  percentage: number;     // fraction of fund capital (0–1)
}

export interface PortfolioExposureSnapshot {
  agentId: AgentId;
  fundId?: FundId;
  totalValue: number;
  assetExposures: AssetExposure[];
  strategyAllocations: StrategyAllocation[];
  unrealizedLosses: number;
  capitalConcentrationScore: number;  // 0–1, higher = more concentrated
  timestamp: Date;
}

// ─── Risk Limits ──────────────────────────────────────────────────────────────

export type RiskLimitType =
  | 'max_position_size'
  | 'max_leverage'
  | 'max_portfolio_drawdown'
  | 'max_strategy_allocation';

export type RiskLimitAction = 'block' | 'reduce' | 'warn' | 'rebalance';

export interface RiskLimit {
  id: string;
  type: RiskLimitType;
  enabled: boolean;
  value: number;
  action: RiskLimitAction;
  description?: string;
}

export interface RiskLimitViolation {
  limitId: string;
  limitType: RiskLimitType;
  currentValue: number;
  limitValue: number;
  action: RiskLimitAction;
  message: string;
}

export interface RiskLimitCheckResult {
  passed: boolean;
  violations: RiskLimitViolation[];
  warnings: RiskLimitWarning[];
  recommendedActions: RecommendedAction[];
}

export interface RiskLimitWarning {
  limitType: RiskLimitType;
  currentValue: number;
  limitValue: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RecommendedAction {
  type: 'block_trade' | 'reduce_exposure' | 'rebalance' | 'pause_strategy' | 'emergency_shutdown';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ─── Risk Response ────────────────────────────────────────────────────────────

export type RiskResponseTrigger =
  | 'limit_exceeded'
  | 'critical_score'
  | 'drawdown_breach'
  | 'manual_override';

export type RiskResponseAction =
  | 'rebalance'
  | 'reduce_position'
  | 'pause_strategy'
  | 'emergency_shutdown';

export type RiskResponseStatus = 'pending' | 'executing' | 'completed' | 'failed';

export interface RiskResponseEvent {
  id: string;
  trigger: RiskResponseTrigger;
  entityId: string;              // agentId, strategyId, or fundId
  entityType: 'agent' | 'strategy' | 'fund';
  actions: RiskResponseAction[];
  status: RiskResponseStatus;
  triggeredAt: Date;
  completedAt?: Date;
  message: string;
}

export interface AutomaticRiskResponseConfig {
  enableAutoRebalance: boolean;
  enableAutoReducePosition: boolean;
  enableAutoPauseStrategy: boolean;
  enableEmergencyShutdown: boolean;
  criticalScoreThreshold: number;    // trigger shutdown above this score (default: 81)
  highScoreThreshold: number;        // trigger pause above this score (default: 61)
  drawdownBreachPercent: number;     // trigger reduce above this drawdown (default: 0.20)
}

// ─── Risk Dashboard ───────────────────────────────────────────────────────────

export interface DrawdownAlert {
  entityId: string;
  entityType: 'agent' | 'strategy' | 'fund';
  currentDrawdown: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

export interface LeverageAlert {
  entityId: string;
  entityType: 'agent' | 'strategy' | 'fund';
  currentLeverage: number;
  maxLeverage: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

export interface RiskDashboardMetrics {
  portfolioRiskExposure: PortfolioExposureSnapshot[];
  strategyRiskRatings: StrategyRiskProfile[];
  drawdownAlerts: DrawdownAlert[];
  leverageAlerts: LeverageAlert[];
  overallSystemRiskScore: RiskScore;
  timestamp: Date;
}

// ─── Unified Risk Engine Config ───────────────────────────────────────────────

export interface StrategyEvaluatorConfig {
  volatilityWeight: number;
  drawdownWeight: number;
  leverageWeight: number;
  concentrationWeight: number;
  stabilityWeight: number;
}

export interface ExposureMonitorConfig {
  concentrationWarnThreshold: number;    // e.g. 0.30 (30%)
  concentrationCriticalThreshold: number; // e.g. 0.50 (50%)
  unrealizedLossWarnPercent: number;     // e.g. 0.10 (10%)
  unrealizedLossCriticalPercent: number; // e.g. 0.20 (20%)
}

export interface RiskLimitsConfig {
  maxPositionSizePercent: number;
  maxLeverageRatio: number;
  maxPortfolioDrawdownPercent: number;
  maxStrategyAllocationPercent: number;
}

export interface RiskEngineConfig {
  strategyEvaluator?: Partial<StrategyEvaluatorConfig>;
  exposureMonitor?: Partial<ExposureMonitorConfig>;
  riskLimits?: Partial<RiskLimitsConfig>;
  autoResponse?: Partial<AutomaticRiskResponseConfig>;
}

// ─── Risk Engine Events ───────────────────────────────────────────────────────

export type RiskEngineEventType =
  | 'strategy_evaluated'
  | 'exposure_updated'
  | 'limit_violated'
  | 'risk_score_updated'
  | 'risk_response_triggered'
  | 'risk_response_completed'
  | 'drawdown_alert'
  | 'leverage_alert';

export interface RiskEngineEvent {
  type: RiskEngineEventType;
  timestamp: Date;
  payload: unknown;
}

export type RiskEngineEventCallback = (event: RiskEngineEvent) => void;
