/**
 * TONAIAgent - AI Safety, Alignment & Governance Type Definitions
 *
 * Comprehensive types for ensuring autonomous agents operate reliably,
 * ethically, and within defined constraints in the TON AI ecosystem.
 */

// ============================================================================
// Core AI Safety Types
// ============================================================================

export type SafetyLevel = 'low' | 'medium' | 'high' | 'critical';
export type AlignmentScore = number; // 0-100
export type RiskScore = number; // 0-100

export interface AISafetyConfig {
  enabled: boolean;
  alignment: AlignmentConfig;
  guardrails: GuardrailsConfig;
  modelGovernance: ModelGovernanceConfig;
  monitoring: MonitoringConfig;
  explainability: ExplainabilityConfig;
  humanOversight: HumanOversightConfig;
  ethics: EthicsConfig;
  simulation: SimulationConfig;
  daoGovernance: DAOGovernanceConfig;
}

// ============================================================================
// AI Alignment Layer Types
// ============================================================================

export interface AlignmentConfig {
  enabled: boolean;
  goalValidation: GoalValidationConfig;
  strategyConsistency: StrategyConsistencyConfig;
  boundaryEnforcement: BoundaryEnforcementConfig;
  intentVerification: IntentVerificationConfig;
}

export interface GoalValidationConfig {
  requireExplicitGoals: boolean;
  maxGoalComplexity: number;
  allowedGoalTypes: GoalType[];
  conflictResolution: 'prioritize_safety' | 'prioritize_user' | 'require_human';
  validationThreshold: number; // 0-1
}

export type GoalType =
  | 'profit_maximization'
  | 'risk_minimization'
  | 'yield_optimization'
  | 'portfolio_rebalancing'
  | 'liquidity_provision'
  | 'arbitrage'
  | 'hedging'
  | 'staking'
  | 'custom';

export interface AgentGoal {
  id: string;
  type: GoalType;
  description: string;
  priority: number;
  constraints: GoalConstraint[];
  metrics: GoalMetric[];
  validUntil?: Date;
  createdBy: string;
  createdAt: Date;
  status: 'active' | 'paused' | 'completed' | 'failed';
}

export interface GoalConstraint {
  type: 'max_loss' | 'max_exposure' | 'min_confidence' | 'time_limit' | 'asset_restriction' | 'custom';
  value: unknown;
  strict: boolean;
  description: string;
}

export interface GoalMetric {
  name: string;
  target: number;
  current: number;
  weight: number;
  direction: 'maximize' | 'minimize' | 'target';
}

export interface GoalValidationResult {
  valid: boolean;
  alignmentScore: AlignmentScore;
  issues: AlignmentIssue[];
  suggestions: string[];
  conflictingGoals: string[];
}

export interface AlignmentIssue {
  severity: SafetyLevel;
  type: 'goal_conflict' | 'constraint_violation' | 'undefined_behavior' | 'risk_exposure' | 'ethical_concern';
  description: string;
  affectedGoals: string[];
  recommendation: string;
}

export interface StrategyConsistencyConfig {
  requireConsistencyCheck: boolean;
  maxStrategyDeviation: number; // percentage
  driftDetection: boolean;
  driftThreshold: number;
}

export interface StrategyConsistencyResult {
  consistent: boolean;
  consistencyScore: number;
  deviations: StrategyDeviation[];
  driftDetected: boolean;
  driftMagnitude: number;
}

export interface StrategyDeviation {
  strategy: string;
  expectedBehavior: string;
  actualBehavior: string;
  deviationPercent: number;
  severity: SafetyLevel;
  timestamp: Date;
}

export interface BoundaryEnforcementConfig {
  enabled: boolean;
  hardLimits: HardLimit[];
  softLimits: SoftLimit[];
  defaultAction: 'block' | 'warn' | 'escalate';
}

export interface HardLimit {
  id: string;
  name: string;
  type: 'transaction_value' | 'daily_volume' | 'position_size' | 'leverage' | 'concentration' | 'custom';
  value: number;
  currency?: string;
  scope: 'agent' | 'user' | 'global';
}

export interface SoftLimit {
  id: string;
  name: string;
  type: string;
  warningThreshold: number;
  escalateThreshold: number;
  blockThreshold: number;
}

export interface IntentVerificationConfig {
  enabled: boolean;
  requireIntentDeclaration: boolean;
  verifyBeforeExecution: boolean;
  logAllIntents: boolean;
}

export interface AgentIntent {
  id: string;
  agentId: string;
  action: string;
  parameters: Record<string, unknown>;
  reasoning: string;
  expectedOutcome: ExpectedOutcome;
  riskAssessment: IntentRiskAssessment;
  timestamp: Date;
  status: 'pending' | 'verified' | 'rejected' | 'executed';
}

export interface ExpectedOutcome {
  successProbability: number;
  expectedReturn: number;
  expectedRisk: number;
  timeHorizon: string;
  assumptions: string[];
}

export interface IntentRiskAssessment {
  riskScore: RiskScore;
  riskFactors: RiskFactor[];
  mitigations: string[];
  requiresApproval: boolean;
  approvalLevel: 'auto' | 'user' | 'admin' | 'committee';
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
  category: 'market' | 'execution' | 'liquidity' | 'counterparty' | 'operational' | 'regulatory';
}

// ============================================================================
// Guardrails & Policy Engine Types
// ============================================================================

export interface GuardrailsConfig {
  enabled: boolean;
  strategyValidation: StrategyValidationConfig;
  transactionPolicy: TransactionPolicyConfig;
  riskThresholds: RiskThresholdsConfig;
  assetWhitelist: AssetWhitelistConfig;
  protocolWhitelist: ProtocolWhitelistConfig;
}

export interface StrategyValidationConfig {
  requireValidation: boolean;
  validationRules: ValidationRule[];
  blockedStrategies: string[];
  requireBacktest: boolean;
  minBacktestPeriod: number; // days
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  condition: RuleCondition;
  action: 'allow' | 'warn' | 'block' | 'escalate';
  priority: number;
  enabled: boolean;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains' | 'regex';
  value: unknown;
  logic?: 'and' | 'or';
  nested?: RuleCondition[];
}

export interface TransactionPolicyConfig {
  enabled: boolean;
  policies: TransactionPolicy[];
  defaultPolicy: 'allow' | 'deny';
  emergencyMode: boolean;
}

export interface TransactionPolicy {
  id: string;
  name: string;
  description: string;
  conditions: PolicyCondition[];
  action: PolicyAction;
  priority: number;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface PolicyCondition {
  type: 'amount' | 'destination' | 'asset' | 'time' | 'frequency' | 'risk_score' | 'custom';
  operator: string;
  value: unknown;
}

export interface PolicyAction {
  type: 'allow' | 'deny' | 'require_approval' | 'rate_limit' | 'delay' | 'modify';
  parameters?: Record<string, unknown>;
  notification?: NotificationConfig;
}

export interface NotificationConfig {
  channels: ('email' | 'webhook' | 'telegram' | 'slack')[];
  recipients: string[];
  template: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
}

export interface RiskThresholdsConfig {
  maxTransactionRisk: number;
  maxPortfolioRisk: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxConcentration: number;
  maxLeverage: number;
}

export interface AssetWhitelistConfig {
  enabled: boolean;
  mode: 'whitelist' | 'blacklist';
  assets: AssetEntry[];
  autoUpdate: boolean;
  updateSource?: string;
}

export interface AssetEntry {
  address: string;
  symbol: string;
  name: string;
  type: 'native' | 'jetton' | 'nft' | 'lp_token';
  riskRating: SafetyLevel;
  maxExposure?: number;
  notes?: string;
}

export interface ProtocolWhitelistConfig {
  enabled: boolean;
  mode: 'whitelist' | 'blacklist';
  protocols: ProtocolEntry[];
  autoUpdate: boolean;
}

export interface ProtocolEntry {
  id: string;
  name: string;
  address: string;
  type: 'dex' | 'lending' | 'staking' | 'bridge' | 'nft' | 'other';
  riskRating: SafetyLevel;
  audited: boolean;
  auditReports?: string[];
  maxExposure?: number;
}

// ============================================================================
// Model Governance Types
// ============================================================================

export interface ModelGovernanceConfig {
  enabled: boolean;
  versioning: ModelVersioningConfig;
  evaluation: ModelEvaluationConfig;
  performance: PerformanceMonitoringConfig;
  rollback: RollbackConfig;
  providers: ProviderConfig[];
}

export interface ModelVersioningConfig {
  trackVersions: boolean;
  retainVersions: number;
  requireApprovalForUpdate: boolean;
  changeLog: boolean;
}

export interface ModelVersion {
  id: string;
  version: string;
  modelId: string;
  provider: string;
  deployedAt: Date;
  deployedBy: string;
  status: 'active' | 'deprecated' | 'rolled_back' | 'testing';
  performance: ModelPerformanceSnapshot;
  changeNotes: string;
  config: Record<string, unknown>;
}

export interface ModelPerformanceSnapshot {
  accuracy: number;
  latencyMs: number;
  errorRate: number;
  costPerRequest: number;
  throughput: number;
  sampledAt: Date;
}

export interface ModelEvaluationConfig {
  enabled: boolean;
  benchmarks: BenchmarkConfig[];
  evaluationFrequency: string; // cron expression
  minAccuracyThreshold: number;
  autoDisable: boolean;
}

export interface BenchmarkConfig {
  id: string;
  name: string;
  type: 'accuracy' | 'latency' | 'cost' | 'safety' | 'alignment';
  dataset?: string;
  expectedScore: number;
  weight: number;
}

export interface ModelEvaluationResult {
  modelId: string;
  version: string;
  evaluatedAt: Date;
  overallScore: number;
  benchmarkResults: BenchmarkResult[];
  passed: boolean;
  recommendations: string[];
}

export interface BenchmarkResult {
  benchmarkId: string;
  score: number;
  passed: boolean;
  details: Record<string, unknown>;
}

export interface PerformanceMonitoringConfig {
  enabled: boolean;
  metrics: PerformanceMetric[];
  alertThresholds: Record<string, number>;
  aggregationPeriod: string;
}

export interface PerformanceMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  description: string;
  labels: string[];
}

export interface RollbackConfig {
  enabled: boolean;
  autoRollback: boolean;
  rollbackTriggers: RollbackTrigger[];
  notifyOnRollback: boolean;
}

export interface RollbackTrigger {
  type: 'error_rate' | 'latency' | 'accuracy' | 'cost' | 'safety_violation';
  threshold: number;
  duration: string; // e.g., '5m', '1h'
  action: 'alert' | 'rollback';
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'groq' | 'anthropic' | 'openai' | 'google' | 'xai' | 'openrouter' | 'local';
  priority: number;
  enabled: boolean;
  fallbackTo?: string;
  rateLimits: RateLimit[];
}

export interface RateLimit {
  type: 'requests_per_minute' | 'tokens_per_minute' | 'requests_per_day';
  limit: number;
  current: number;
}

// ============================================================================
// Monitoring & Anomaly Detection Types
// ============================================================================

export interface MonitoringConfig {
  enabled: boolean;
  realTime: boolean;
  anomalyDetection: AnomalyDetectionConfig;
  behaviorAnalysis: BehaviorAnalysisConfig;
  alerting: AlertingConfig;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  methods: AnomalyMethod[];
  sensitivityLevel: 'low' | 'medium' | 'high';
  learningPeriod: number; // days
  baselineUpdateFrequency: string;
}

export type AnomalyMethod =
  | 'statistical'
  | 'machine_learning'
  | 'rule_based'
  | 'pattern_matching'
  | 'behavioral';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: SafetyLevel;
  agentId: string;
  description: string;
  detectedAt: Date;
  evidence: AnomalyEvidence[];
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  resolution?: AnomalyResolution;
}

export type AnomalyType =
  | 'trading_volume_spike'
  | 'unusual_timing'
  | 'risk_spike'
  | 'execution_anomaly'
  | 'pattern_deviation'
  | 'suspicious_destination'
  | 'strategy_drift'
  | 'performance_degradation'
  | 'unauthorized_action';

export interface AnomalyEvidence {
  type: string;
  value: unknown;
  expectedRange: { min: number; max: number };
  deviation: number;
  timestamp: Date;
}

export interface AnomalyResolution {
  resolvedBy: string;
  resolvedAt: Date;
  resolution: 'confirmed_anomaly' | 'false_positive' | 'expected_behavior';
  action: string;
  notes: string;
}

export interface BehaviorAnalysisConfig {
  enabled: boolean;
  trackingPeriod: number; // days
  metrics: BehaviorMetric[];
  profileUpdateFrequency: string;
}

export interface BehaviorMetric {
  name: string;
  type: 'frequency' | 'volume' | 'timing' | 'pattern' | 'risk';
  aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count';
  window: string;
}

export interface AgentBehaviorProfile {
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  tradingPatterns: TradingPattern[];
  riskProfile: BehavioralRiskProfile;
  anomalyHistory: AnomalySummary[];
  trustScore: number;
}

export interface TradingPattern {
  type: string;
  frequency: number;
  avgSize: number;
  preferredTimes: string[];
  preferredAssets: string[];
  avgHoldingPeriod: string;
}

export interface BehavioralRiskProfile {
  overallRisk: SafetyLevel;
  riskTolerance: number;
  volatilityPreference: 'low' | 'medium' | 'high';
  concentrationTendency: number;
  tradingAggressiveness: number;
}

export interface AnomalySummary {
  type: AnomalyType;
  count: number;
  lastOccurrence: Date;
  avgSeverity: SafetyLevel;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannel[];
  escalationPolicy: EscalationPolicy;
  quietHours?: QuietHoursConfig;
}

export interface AlertChannel {
  type: 'email' | 'webhook' | 'telegram' | 'slack' | 'sms';
  config: Record<string, string>;
  severityFilter: SafetyLevel[];
  enabled: boolean;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  defaultTimeout: number; // minutes
}

export interface EscalationLevel {
  level: number;
  recipients: string[];
  timeout: number;
  actions: string[];
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
  exceptCritical: boolean;
}

// ============================================================================
// Explainability & Transparency Types
// ============================================================================

export interface ExplainabilityConfig {
  enabled: boolean;
  level: 'minimal' | 'standard' | 'detailed' | 'full';
  logging: ExplainabilityLoggingConfig;
  traceability: TraceabilityConfig;
  reporting: ExplainabilityReportingConfig;
}

export interface ExplainabilityLoggingConfig {
  logDecisions: boolean;
  logReasoning: boolean;
  logAlternatives: boolean;
  retentionDays: number;
  compression: boolean;
}

export interface TraceabilityConfig {
  enabled: boolean;
  traceDepth: number;
  includeInputs: boolean;
  includeOutputs: boolean;
  includeIntermediateSteps: boolean;
}

export interface ExplainabilityReportingConfig {
  generateReports: boolean;
  reportFrequency: string;
  includeStatistics: boolean;
  includeExamples: boolean;
}

export interface DecisionTrace {
  id: string;
  agentId: string;
  timestamp: Date;
  decision: AgentDecision;
  reasoning: ReasoningChain;
  inputs: DecisionInput;
  output: DecisionOutput;
  alternatives: AlternativeDecision[];
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface AgentDecision {
  type: string;
  action: string;
  parameters: Record<string, unknown>;
  outcome: 'pending' | 'executed' | 'failed' | 'cancelled';
}

export interface ReasoningChain {
  steps: ReasoningStep[];
  summary: string;
  confidence: number;
  limitations: string[];
}

export interface ReasoningStep {
  step: number;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  reasoning: string;
  confidence: number;
}

export interface DecisionInput {
  marketData: Record<string, unknown>;
  portfolioState: Record<string, unknown>;
  signals: Signal[];
  constraints: Record<string, unknown>;
  context: Record<string, unknown>;
}

export interface Signal {
  source: string;
  type: string;
  value: number;
  confidence: number;
  timestamp: Date;
}

export interface DecisionOutput {
  action: string;
  parameters: Record<string, unknown>;
  expectedOutcome: ExpectedOutcome;
  riskAssessment: IntentRiskAssessment;
}

export interface AlternativeDecision {
  action: string;
  parameters: Record<string, unknown>;
  expectedOutcome: ExpectedOutcome;
  reasonNotSelected: string;
  score: number;
}

export interface ExplainabilityReport {
  id: string;
  period: { start: Date; end: Date };
  agentId?: string;
  totalDecisions: number;
  decisionBreakdown: Record<string, number>;
  avgConfidence: number;
  avgRiskScore: number;
  topReasons: ReasonSummary[];
  anomalies: AnomalySummary[];
  recommendations: string[];
}

export interface ReasonSummary {
  reason: string;
  frequency: number;
  avgConfidence: number;
}

// ============================================================================
// Human Oversight & Control Types
// ============================================================================

export interface HumanOversightConfig {
  enabled: boolean;
  overrides: OverrideConfig;
  emergencyControls: EmergencyControlConfig;
  approvalWorkflow: ApprovalWorkflowConfig;
  dashboard: DashboardConfig;
}

export interface OverrideConfig {
  enabled: boolean;
  allowedActions: OverrideAction[];
  requireReason: boolean;
  auditLog: boolean;
}

export type OverrideAction =
  | 'pause_agent'
  | 'resume_agent'
  | 'cancel_transaction'
  | 'modify_parameters'
  | 'force_execution'
  | 'emergency_stop';

export interface HumanOverride {
  id: string;
  action: OverrideAction;
  agentId: string;
  operatorId: string;
  reason: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  timestamp: Date;
  expiresAt?: Date;
}

export interface EmergencyControlConfig {
  enabled: boolean;
  killSwitchEnabled: boolean;
  pauseAllEnabled: boolean;
  triggers: EmergencyTrigger[];
  notifications: NotificationConfig;
}

export interface EmergencyTrigger {
  type: 'manual' | 'automatic';
  condition?: RuleCondition;
  action: 'pause' | 'stop' | 'alert';
  cooldown: number; // seconds
}

export interface EmergencyState {
  active: boolean;
  type: 'none' | 'pause' | 'stop';
  triggeredBy: string;
  triggeredAt?: Date;
  reason: string;
  affectedAgents: string[];
  expectedResolution?: Date;
}

export interface ApprovalWorkflowConfig {
  enabled: boolean;
  levels: ApprovalLevel[];
  timeouts: ApprovalTimeout[];
  escalation: boolean;
}

export interface ApprovalLevel {
  level: number;
  name: string;
  requiredApprovers: number;
  approverRoles: string[];
  threshold: ApprovalThreshold;
}

export interface ApprovalThreshold {
  type: 'value' | 'risk' | 'frequency' | 'custom';
  min: number;
  max?: number;
}

export interface ApprovalTimeout {
  level: number;
  timeout: number; // minutes
  action: 'escalate' | 'deny' | 'auto_approve';
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  action: string;
  parameters: Record<string, unknown>;
  requestedAt: Date;
  level: number;
  status: 'pending' | 'approved' | 'denied' | 'escalated' | 'expired';
  approvals: Approval[];
  expiresAt: Date;
}

export interface Approval {
  approverId: string;
  decision: 'approved' | 'denied';
  reason?: string;
  timestamp: Date;
}

export interface DashboardConfig {
  enabled: boolean;
  refreshInterval: number; // seconds
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'status';
  title: string;
  dataSource: string;
  config: Record<string, unknown>;
}

// ============================================================================
// Ethics & Risk Framework Types
// ============================================================================

export interface EthicsConfig {
  enabled: boolean;
  principles: EthicalPrinciple[];
  guidelines: EthicsGuideline[];
  escalationProcedures: EscalationProcedure[];
  complianceStandards: ComplianceStandard[];
}

export interface EthicalPrinciple {
  id: string;
  name: string;
  description: string;
  priority: number;
  enforced: boolean;
  violations: ViolationConfig;
}

export interface ViolationConfig {
  detection: 'automatic' | 'manual' | 'both';
  action: 'warn' | 'block' | 'escalate';
  notification: boolean;
}

export interface EthicsGuideline {
  id: string;
  category: 'trading' | 'communication' | 'data_handling' | 'decision_making' | 'interaction';
  title: string;
  description: string;
  rules: string[];
  examples: GuidelineExample[];
}

export interface GuidelineExample {
  type: 'acceptable' | 'unacceptable';
  scenario: string;
  reasoning: string;
}

export interface EscalationProcedure {
  id: string;
  trigger: string;
  severity: SafetyLevel;
  steps: EscalationStep[];
  timeLimit: number; // minutes
}

export interface EscalationStep {
  order: number;
  action: string;
  responsible: string[];
  timeLimit: number;
  fallback?: string;
}

export interface ComplianceStandard {
  id: string;
  name: string;
  version: string;
  requirements: ComplianceRequirement[];
  lastAudit?: Date;
  nextAudit?: Date;
  status: 'compliant' | 'partial' | 'non_compliant' | 'pending_audit';
}

export interface ComplianceRequirement {
  id: string;
  description: string;
  mandatory: boolean;
  implemented: boolean;
  evidence?: string;
}

export interface EthicsViolation {
  id: string;
  principleId: string;
  agentId: string;
  description: string;
  severity: SafetyLevel;
  detectedAt: Date;
  evidence: Record<string, unknown>;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolution?: EthicsResolution;
}

export interface EthicsResolution {
  resolvedBy: string;
  resolvedAt: Date;
  action: string;
  preventiveMeasures: string[];
  notes: string;
}

// ============================================================================
// Simulation & Stress Testing Types
// ============================================================================

export interface SimulationConfig {
  enabled: boolean;
  adversarialTesting: AdversarialTestingConfig;
  stressScenarios: StressScenarioConfig;
  failureRecovery: FailureRecoveryConfig;
}

export interface AdversarialTestingConfig {
  enabled: boolean;
  testTypes: AdversarialTestType[];
  frequency: string;
  autoFix: boolean;
}

export type AdversarialTestType =
  | 'input_manipulation'
  | 'goal_hijacking'
  | 'reward_hacking'
  | 'boundary_testing'
  | 'edge_cases'
  | 'adversarial_inputs';

export interface AdversarialTest {
  id: string;
  type: AdversarialTestType;
  description: string;
  inputs: Record<string, unknown>;
  expectedBehavior: string;
  actualBehavior?: string;
  passed?: boolean;
  vulnerabilities: Vulnerability[];
  runAt?: Date;
}

export interface Vulnerability {
  id: string;
  type: string;
  severity: SafetyLevel;
  description: string;
  exploitability: 'low' | 'medium' | 'high';
  mitigation?: string;
  status: 'open' | 'mitigated' | 'accepted';
}

export interface StressScenarioConfig {
  enabled: boolean;
  scenarios: StressScenario[];
  customScenarios: CustomScenario[];
  runFrequency: string;
}

export interface StressScenario {
  id: string;
  name: string;
  type: 'market_crash' | 'flash_crash' | 'liquidity_crisis' | 'volatility_spike' | 'black_swan' | 'custom';
  description: string;
  parameters: StressParameters;
  historicalReference?: string;
  enabled: boolean;
}

export interface StressParameters {
  priceShocks: PriceShock[];
  volumeMultiplier: number;
  liquidityReduction: number;
  volatilityMultiplier: number;
  correlationShift: number;
  duration: string;
}

export interface PriceShock {
  asset: string;
  changePercent: number;
  timeframe: string;
}

export interface CustomScenario {
  id: string;
  name: string;
  description: string;
  parameters: StressParameters;
  createdBy: string;
  createdAt: Date;
}

export interface StressTestResult {
  id: string;
  scenarioId: string;
  runAt: Date;
  duration: number;
  portfolioImpact: PortfolioImpact;
  agentBehavior: AgentBehaviorUnderStress;
  passed: boolean;
  failures: StressFailure[];
  recommendations: string[];
}

export interface PortfolioImpact {
  initialValue: number;
  finalValue: number;
  maxDrawdown: number;
  volatility: number;
  recoveryTime?: string;
}

export interface AgentBehaviorUnderStress {
  decisionsCount: number;
  correctDecisions: number;
  incorrectDecisions: number;
  avgResponseTime: number;
  emergencyActionsTriggered: number;
  anomaliesDetected: number;
}

export interface StressFailure {
  type: string;
  description: string;
  severity: SafetyLevel;
  timestamp: Date;
}

export interface FailureRecoveryConfig {
  enabled: boolean;
  recoveryStrategies: RecoveryStrategy[];
  autoRecovery: boolean;
  maxRecoveryAttempts: number;
}

export interface RecoveryStrategy {
  type: 'rollback' | 'failover' | 'graceful_degradation' | 'human_intervention';
  priority: number;
  conditions: RuleCondition[];
  actions: string[];
}

// ============================================================================
// DAO Governance Integration Types
// ============================================================================

export interface DAOGovernanceConfig {
  enabled: boolean;
  oversight: DAOOversightConfig;
  voting: VotingConfig;
  upgrades: UpgradeConfig;
  treasury: TreasuryConfig;
}

export interface DAOOversightConfig {
  enabled: boolean;
  oversightLevel: 'minimal' | 'standard' | 'comprehensive';
  reportingFrequency: string;
  escalationToDAO: boolean;
}

export interface VotingConfig {
  enabled: boolean;
  proposalTypes: ProposalType[];
  votingPeriod: number; // hours
  quorum: number; // percentage
  approvalThreshold: number; // percentage
}

export type ProposalType =
  | 'parameter_change'
  | 'policy_update'
  | 'safety_upgrade'
  | 'risk_adjustment'
  | 'emergency_action'
  | 'governance_change';

export interface Proposal {
  id: string;
  type: ProposalType;
  title: string;
  description: string;
  proposer: string;
  proposedAt: Date;
  votingEndsAt: Date;
  status: 'active' | 'passed' | 'rejected' | 'executed' | 'cancelled';
  votes: ProposalVote[];
  quorumReached: boolean;
  changes: ProposedChange[];
}

export interface ProposalVote {
  voter: string;
  votingPower: number;
  decision: 'for' | 'against' | 'abstain';
  timestamp: Date;
  reason?: string;
}

export interface ProposedChange {
  target: string;
  field: string;
  currentValue: unknown;
  proposedValue: unknown;
  impact: string;
}

export interface UpgradeConfig {
  enabled: boolean;
  requireProposal: boolean;
  testingPeriod: number; // days
  rollbackWindow: number; // hours
}

export interface SafetyUpgrade {
  id: string;
  version: string;
  proposalId?: string;
  description: string;
  changes: UpgradeChange[];
  status: 'proposed' | 'testing' | 'approved' | 'deployed' | 'rolled_back';
  deployedAt?: Date;
  deployedBy?: string;
}

export interface UpgradeChange {
  component: string;
  type: 'add' | 'modify' | 'remove';
  description: string;
  breakingChange: boolean;
}

export interface TreasuryConfig {
  enabled: boolean;
  safetyFund: SafetyFundConfig;
  insurancePool: InsurancePoolConfig;
}

export interface SafetyFundConfig {
  enabled: boolean;
  targetBalance: number;
  autoReplenish: boolean;
  useCases: string[];
}

export interface InsurancePoolConfig {
  enabled: boolean;
  coverage: InsuranceCoverage[];
  claimProcess: string;
}

export interface InsuranceCoverage {
  type: string;
  maxAmount: number;
  deductible: number;
  conditions: string[];
}

// ============================================================================
// Event Types
// ============================================================================

export interface AISafetyEvent {
  id: string;
  timestamp: Date;
  type: AISafetyEventType;
  agentId?: string;
  severity: SafetyLevel;
  description: string;
  details: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export type AISafetyEventType =
  | 'alignment_check'
  | 'goal_validation'
  | 'guardrail_triggered'
  | 'policy_violation'
  | 'anomaly_detected'
  | 'human_override'
  | 'emergency_action'
  | 'ethics_violation'
  | 'stress_test_completed'
  | 'model_update'
  | 'proposal_created'
  | 'proposal_executed'
  | 'safety_upgrade';

export type AISafetyEventCallback = (event: AISafetyEvent) => void;
