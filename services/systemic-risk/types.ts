/**
 * Systemic Risk & Stability Framework — Type Definitions
 * Issue #122: System-wide risk containment and stability controls
 */

// ─── Shared Primitives ────────────────────────────────────────────────────────

export type FundId = string;
export type AgentId = string;
export type AssetId = string;
export type ProtocolId = string;

// ─── Global Exposure Monitoring ───────────────────────────────────────────────

export type ExposureCategory = 'asset' | 'fund' | 'agent' | 'protocol' | 'chain' | 'strategy';

export type RiskHeatLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

export interface AssetExposure {
  assetId: AssetId;
  totalValue: number;
  fundBreakdown: Record<FundId, number>;
  agentBreakdown: Record<AgentId, number>;
  concentrationPct: number;
  heatLevel: RiskHeatLevel;
}

export interface FundSystemicExposure {
  fundId: FundId;
  totalExposure: number;
  leverageRatio: number;
  topAssets: Array<{ assetId: AssetId; value: number; pct: number }>;
  heatLevel: RiskHeatLevel;
  correlationWithSystem: number;
}

export interface AgentSystemicExposure {
  agentId: AgentId;
  fundId: FundId;
  totalExposure: number;
  leverageRatio: number;
  riskContributionPct: number;
  heatLevel: RiskHeatLevel;
}

export interface ExposureHeatMap {
  timestamp: number;
  totalSystemExposure: number;
  topAssets: AssetExposure[];
  fundExposures: FundSystemicExposure[];
  agentExposures: AgentSystemicExposure[];
  concentrationAlerts: ConcentrationAlert[];
  riskClusters: RiskCluster[];
  overallHeatLevel: RiskHeatLevel;
}

export interface ConcentrationAlert {
  id: string;
  category: ExposureCategory;
  entityId: string;
  concentrationPct: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
}

export interface RiskCluster {
  id: string;
  label: string;
  entities: string[];
  correlationScore: number;
  combinedExposure: number;
  systemicRiskContribution: number;
}

export interface ExposureMonitoringConfig {
  concentrationWarnThreshold: number;  // e.g. 0.20 (20%)
  concentrationCriticalThreshold: number;  // e.g. 0.30 (30%)
  correlationClusterThreshold: number;  // e.g. 0.70
  updateIntervalMs: number;
}

// ─── Dynamic Leverage Governor ────────────────────────────────────────────────

export type MarketRegime = 'bull' | 'neutral' | 'bear' | 'crisis';

export type LeverageAdjustmentReason =
  | 'volatility_spike'
  | 'market_stress'
  | 'correlation_increase'
  | 'liquidity_drop'
  | 'manual_override'
  | 'circuit_breaker_active'
  | 'normal_operations';

export interface ProtocolLeverageLimit {
  assetId: AssetId;
  maxLeverage: number;
  currentVolatility: number;
  volatilityAdjustedMaxLeverage: number;
  marketRegime: MarketRegime;
}

export interface LeverageGovernorState {
  globalMaxLeverage: number;
  currentEffectiveMaxLeverage: number;
  marketRegime: MarketRegime;
  volatilityIndex: number;
  adjustmentReason: LeverageAdjustmentReason;
  assetLimits: ProtocolLeverageLimit[];
  lastUpdated: number;
}

export interface LeverageAdjustmentEvent {
  id: string;
  timestamp: number;
  previousMaxLeverage: number;
  newMaxLeverage: number;
  reason: LeverageAdjustmentReason;
  marketRegime: MarketRegime;
  volatilityIndex: number;
  affectedFunds: FundId[];
  affectedAgents: AgentId[];
}

export interface LeverageGovernorConfig {
  baseMaxLeverage: number;          // e.g. 10
  crisisMaxLeverage: number;        // e.g. 2
  bearMaxLeverage: number;          // e.g. 5
  neutralMaxLeverage: number;       // e.g. 8
  bullMaxLeverage: number;          // e.g. 10
  volatilityScalingFactor: number;  // multiplier applied to daily vol
  correlationScalingFactor: number;
}

// ─── Circuit Breaker System ───────────────────────────────────────────────────

export type CircuitBreakerTriggerType =
  | 'extreme_volatility'
  | 'liquidity_evaporation'
  | 'oracle_failure'
  | 'large_liquidation_wave'
  | 'cascade_risk'
  | 'insurance_fund_depleted'
  | 'manual_trigger';

export type CircuitBreakerAction =
  | 'leverage_freeze'
  | 'partial_trading_halt'
  | 'margin_requirement_increase'
  | 'emergency_governance_trigger'
  | 'full_trading_halt';

export type CircuitBreakerStatus = 'inactive' | 'monitoring' | 'triggered' | 'cooldown';

export interface CircuitBreakerRule {
  id: string;
  name: string;
  triggerType: CircuitBreakerTriggerType;
  threshold: number;
  actions: CircuitBreakerAction[];
  cooldownMs: number;
  enabled: boolean;
}

export interface CircuitBreakerEvent {
  id: string;
  ruleId: string;
  triggerType: CircuitBreakerTriggerType;
  actions: CircuitBreakerAction[];
  triggeredAt: number;
  resolvedAt?: number;
  status: CircuitBreakerStatus;
  triggerValue: number;
  threshold: number;
  message: string;
}

export interface CircuitBreakerState {
  status: CircuitBreakerStatus;
  activeEvents: CircuitBreakerEvent[];
  history: CircuitBreakerEvent[];
  currentRestrictions: CircuitBreakerAction[];
  tradingHalted: boolean;
  leverageFrozen: boolean;
  lastTriggered?: number;
  lastResolved?: number;
}

export interface CircuitBreakerConfig {
  rules: CircuitBreakerRule[];
  autoResolveMs: number;  // time before auto-resolving if conditions normalize
  governanceNotificationEnabled: boolean;
}

// ─── Insurance & Stability Fund ───────────────────────────────────────────────

export type InsuranceTranche = 'junior' | 'mezzanine' | 'senior';

export type InsuranceClaimStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface InsuranceContribution {
  id: string;
  contributorId: string;
  contributorType: 'fund' | 'agent' | 'protocol';
  amount: number;
  tranche: InsuranceTranche;
  timestamp: number;
  lockPeriodDays: number;
}

export interface InsuranceClaim {
  id: string;
  claimantId: string;
  claimantType: 'fund' | 'agent';
  amount: number;
  reason: string;
  triggerEvent: string;
  status: InsuranceClaimStatus;
  approvedAmount?: number;
  timestamp: number;
  resolvedAt?: number;
}

export interface InsuranceFundState {
  totalPool: number;
  trancheBreakdown: Record<InsuranceTranche, number>;
  utilizationPct: number;
  pendingClaims: number;
  activeClaims: InsuranceClaim[];
  contributions: InsuranceContribution[];
  coverageRatio: number;    // pool / total system exposure
  lastUpdated: number;
}

export interface EmergencyLiquidityEvent {
  id: string;
  triggeredBy: CircuitBreakerEvent;
  liquidityProvided: number;
  fundsSupported: FundId[];
  timestamp: number;
  resolved: boolean;
}

export interface InsuranceFundConfig {
  targetCoverageRatio: number;   // e.g. 0.05 (5% of total system)
  juniorTranchePct: number;      // absorbs first losses
  mezzanineTranchePct: number;
  seniorTranchePct: number;
  maxSingleClaimPct: number;     // max payout per claim as % of pool
  minPoolSize: number;
}

// ─── AI Stress Testing Engine ─────────────────────────────────────────────────

export type StressScenarioType =
  | 'liquidity_crisis'
  | 'exchange_failure'
  | 'stablecoin_depeg'
  | 'rwa_illiquidity'
  | 'black_swan_correlation'
  | 'custom';

export interface SystemStressScenario {
  id: string;
  name: string;
  type: StressScenarioType;
  description: string;
  shocks: Record<AssetId | 'ALL_ASSETS', number>;  // price shock multipliers
  liquidityImpact: number;       // 0-1 reduction in available liquidity
  correlationSpike: number;      // additional correlation added to all pairs
  volatilityMultiplier: number;
  durationDays: number;
}

export interface SystemStressTestResult {
  scenarioId: string;
  scenarioName: string;
  timestamp: number;
  totalPortfolioLoss: number;
  totalPortfolioLossPct: number;
  fundImpacts: FundStressImpact[];
  agentImpacts: AgentStressImpact[];
  insuranceFundDraw: number;
  leverageBreaches: number;
  estimatedLiquidations: number;
  capitalBufferRequired: number;
  adjustedMarginRequirement: number;
  systemSurvivability: 'passes' | 'marginal' | 'fails';
  recommendations: string[];
}

export interface FundStressImpact {
  fundId: FundId;
  initialValue: number;
  stressedValue: number;
  lossPct: number;
  marginBreached: boolean;
  leverageBreached: boolean;
}

export interface AgentStressImpact {
  agentId: AgentId;
  fundId: FundId;
  initialValue: number;
  stressedValue: number;
  lossPct: number;
  liquidated: boolean;
}

export interface StressTestingConfig {
  runFrequencyMs: number;
  confidenceLevel: number;   // e.g. 0.99
  capitalBufferMultiplier: number;
  autoAdjustMargins: boolean;
}

// ─── GAAMP Stability Index ────────────────────────────────────────────────────

export type StabilityGrade = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'D';

export interface StabilityComponent {
  name: string;
  score: number;        // 0-100
  weight: number;       // contribution weight
  weightedScore: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  details: string;
}

export interface StabilityIndex {
  score: number;         // 0-100
  grade: StabilityGrade;
  timestamp: number;
  components: {
    capitalAdequacy: StabilityComponent;
    leverageRatios: StabilityComponent;
    exposureConcentration: StabilityComponent;
    liquidityDepth: StabilityComponent;
    insuranceCoverage: StabilityComponent;
  };
  trend: 'improving' | 'stable' | 'deteriorating';
  publicSummary: string;
  lastStressTestResult?: string;
}

export interface StabilityScoreConfig {
  capitalAdequacyWeight: number;
  leverageRatiosWeight: number;
  exposureConcentrationWeight: number;
  liquidityDepthWeight: number;
  insuranceCoverageWeight: number;
  historySize: number;
}

// ─── Systemic Risk Framework Events ───────────────────────────────────────────

export type SystemicRiskEventType =
  | 'exposure_alert'
  | 'concentration_alert'
  | 'leverage_adjusted'
  | 'circuit_breaker_triggered'
  | 'circuit_breaker_resolved'
  | 'insurance_claim_submitted'
  | 'insurance_claim_resolved'
  | 'emergency_liquidity_triggered'
  | 'stress_test_completed'
  | 'stability_index_updated'
  | 'risk_cluster_detected';

export interface SystemicRiskEvent {
  type: SystemicRiskEventType;
  timestamp: number;
  payload: unknown;
}

export type SystemicRiskEventCallback = (event: SystemicRiskEvent) => void;

// ─── Unified Config ───────────────────────────────────────────────────────────

export interface SystemicRiskConfig {
  exposureMonitoring?: Partial<ExposureMonitoringConfig>;
  leverageGovernor?: Partial<LeverageGovernorConfig>;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  insuranceFund?: Partial<InsuranceFundConfig>;
  stressTesting?: Partial<StressTestingConfig>;
  stabilityScore?: Partial<StabilityScoreConfig>;
}
