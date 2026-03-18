/**
 * Autonomous AI Investment Layer - Type Definitions
 *
 * Core types for the programmable, AI-native financial layer on TON that allows
 * agents to manage capital programmatically and responsibly.
 */

// ============================================================================
// Vault Types
// ============================================================================

export type VaultType = 'user' | 'strategy' | 'institutional' | 'dao_treasury';

export type VaultStatus = 'active' | 'paused' | 'suspended' | 'closed';

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface VaultRiskParameters {
  maxDrawdown: number; // Percentage (0-100)
  maxExposurePerStrategy: number; // Percentage (0-100)
  dailyRiskThreshold: number; // In TON
  circuitBreakerEnabled: boolean;
  emergencyStopEnabled: boolean;
}

export interface VaultAllocationLimits {
  minAllocationPercent: number; // Minimum % per strategy
  maxAllocationPercent: number; // Maximum % per strategy
  maxStrategies: number;
  minBalance: number; // Minimum TON balance to keep unallocated
}

export interface Vault {
  id: string;
  ownerId: string;
  name: string;
  type: VaultType;
  status: VaultStatus;
  balance: number; // In TON
  allocatedBalance: number; // Currently allocated
  availableBalance: number; // Available for allocation
  boundStrategyIds: string[];
  riskParameters: VaultRiskParameters;
  allocationLimits: VaultAllocationLimits;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface CreateVaultInput {
  ownerId: string;
  name: string;
  type: VaultType;
  initialDeposit?: number;
  riskParameters?: Partial<VaultRiskParameters>;
  allocationLimits?: Partial<VaultAllocationLimits>;
  metadata?: Record<string, unknown>;
}

export interface DepositResult {
  vaultId: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  txHash: string;
  timestamp: Date;
}

export interface WithdrawalRequest {
  id: string;
  vaultId: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: Date;
  processedAt?: Date;
  txHash?: string;
  reason?: string;
}

// ============================================================================
// Risk Engine Types
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type CircuitBreakerStatus = 'open' | 'closed' | 'half_open';

export interface AgentRiskProfile {
  agentId: string;
  vaultId: string;
  maxDrawdownLimit: number; // Percentage
  currentDrawdown: number; // Percentage
  exposureLimit: number; // Percentage of vault
  currentExposure: number;
  positionSizingRule: PositionSizingRule;
  dailyLossLimit: number; // In TON
  currentDailyLoss: number;
  riskLevel: RiskLevel;
  circuitBreakerStatus: CircuitBreakerStatus;
  lastRiskCheck: Date;
}

export type PositionSizingMethod = 'fixed' | 'kelly_criterion' | 'risk_parity' | 'equal_weight';

export interface PositionSizingRule {
  method: PositionSizingMethod;
  maxPositionSize: number; // Percentage of allocated capital
  minPositionSize: number;
  confidenceScaling: boolean; // Scale size by AI confidence
}

export interface RiskCheckResult {
  passed: boolean;
  riskLevel: RiskLevel;
  violations: RiskViolation[];
  recommendations: string[];
  timestamp: Date;
}

export interface RiskViolation {
  type: 'drawdown' | 'exposure' | 'daily_loss' | 'position_size' | 'circuit_breaker';
  severity: RiskLevel;
  message: string;
  currentValue: number;
  limitValue: number;
}

export interface CircuitBreakerEvent {
  id: string;
  agentId: string;
  vaultId: string;
  trigger: 'drawdown' | 'daily_loss' | 'exposure' | 'manual';
  status: CircuitBreakerStatus;
  triggeredAt: Date;
  resetAt?: Date;
  details: string;
}

export interface EmergencyStopEvent {
  id: string;
  vaultId: string;
  triggeredBy: string; // agentId or 'system' or 'admin'
  reason: string;
  affectedAgentIds: string[];
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// ============================================================================
// Capital Allocation Types
// ============================================================================

export type AllocationStrategy = 'single' | 'multi' | 'weighted' | 'ai_dynamic' | 'performance_based';

export type AllocationStatus = 'active' | 'rebalancing' | 'paused' | 'terminated';

export interface StrategyAllocation {
  strategyId: string;
  agentId: string;
  targetPercent: number; // Target allocation %
  currentPercent: number; // Current allocation %
  allocatedAmount: number; // In TON
  weight: number; // Weight in multi-strategy
  performanceScore: number; // 0-100
}

export interface AllocationPlan {
  id: string;
  vaultId: string;
  strategy: AllocationStrategy;
  status: AllocationStatus;
  allocations: StrategyAllocation[];
  totalAllocated: number;
  rebalanceThreshold: number; // % drift before rebalance
  lastRebalancedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAllocationPlanInput {
  vaultId: string;
  strategy: AllocationStrategy;
  allocations: Omit<StrategyAllocation, 'currentPercent' | 'allocatedAmount' | 'performanceScore'>[];
  rebalanceThreshold?: number;
}

export interface RebalanceResult {
  planId: string;
  previousAllocations: StrategyAllocation[];
  newAllocations: StrategyAllocation[];
  totalRebalanced: number;
  reason: 'threshold_breach' | 'performance_trigger' | 'ai_recommendation' | 'manual';
  timestamp: Date;
}

// ============================================================================
// Portfolio Optimization Types
// ============================================================================

export type OptimizationObjective = 'max_return' | 'min_risk' | 'sharpe_ratio' | 'sortino_ratio' | 'custom';

export interface PortfolioOptimizationConfig {
  objective: OptimizationObjective;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'threshold';
  volatilityTarget?: number; // Target annualized volatility
  minConfidenceThreshold: number; // AI confidence score to scale execution
  useMachineLearning: boolean;
  lookbackPeriodDays: number;
}

export interface StrategyPerformanceScore {
  strategyId: string;
  agentId: string;
  returnScore: number; // 0-100
  riskScore: number; // 0-100 (lower risk = higher score)
  consistencyScore: number; // 0-100
  compositeScore: number; // Weighted composite
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  calculatedAt: Date;
}

export interface OptimizationResult {
  id: string;
  vaultId: string;
  objective: OptimizationObjective;
  previousAllocations: StrategyAllocation[];
  recommendedAllocations: StrategyAllocation[];
  expectedReturn: number; // Annualized %
  expectedVolatility: number; // Annualized %
  expectedSharpe: number;
  confidence: number; // 0-1
  reasoning: string[];
  appliedAt?: Date;
  createdAt: Date;
}

export interface VolatilityMetrics {
  strategyId: string;
  dailyVolatility: number;
  weeklyVolatility: number;
  monthlyVolatility: number;
  annualizedVolatility: number;
  calculatedAt: Date;
}

// ============================================================================
// Institutional Mode Types
// ============================================================================

export type InstitutionalTier = 'managed' | 'delegated' | 'whitelisted' | 'compliance_required';

export type ComplianceStatus = 'pending' | 'approved' | 'rejected' | 'under_review' | 'expired';

export interface ManagedVault {
  id: string;
  vaultId: string;
  institutionId: string;
  tier: InstitutionalTier;
  delegatedManagers: string[]; // Manager agent IDs
  whitelistedStrategies: string[];
  complianceStatus: ComplianceStatus;
  complianceConstraints: ComplianceConstraint[];
  auditTrail: AuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceConstraint {
  id: string;
  type: 'strategy_whitelist' | 'exposure_limit' | 'jurisdiction' | 'asset_class' | 'counterparty';
  description: string;
  parameters: Record<string, unknown>;
  enforced: boolean;
}

export interface AuditEntry {
  id: string;
  vaultId: string;
  action: string;
  actorId: string;
  actorType: 'user' | 'agent' | 'system';
  details: Record<string, unknown>;
  ipAddress?: string;
  timestamp: Date;
}

export interface DelegationPermission {
  managerId: string;
  vaultId: string;
  permissions: ('allocate' | 'rebalance' | 'deposit' | 'withdraw' | 'risk_override')[];
  maxAllocationPercent: number;
  expiresAt?: Date;
  grantedAt: Date;
}

export interface CreateManagedVaultInput {
  vaultId: string;
  institutionId: string;
  tier: InstitutionalTier;
  delegatedManagers?: string[];
  whitelistedStrategies?: string[];
  complianceConstraints?: Omit<ComplianceConstraint, 'id'>[];
}

// ============================================================================
// Performance Analytics Types
// ============================================================================

export interface VaultPerformanceMetrics {
  vaultId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'all_time';
  totalReturn: number; // Percentage
  absoluteReturn: number; // In TON
  apy: number; // Annualized %
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number; // Percentage
  currentDrawdown: number;
  volatility: number; // Annualized %
  winRate: number; // Percentage of profitable periods
  strategyContributions: StrategyContribution[];
  calculatedAt: Date;
}

export interface StrategyContribution {
  strategyId: string;
  agentId: string;
  contribution: number; // Percentage of total return
  absoluteContribution: number; // In TON
  period: string;
}

export interface PerformanceSnapshot {
  id: string;
  vaultId: string;
  timestamp: Date;
  totalValue: number; // In TON
  allocatedValue: number;
  availableValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dailyPnl: number;
}

export interface HistoricalReturn {
  vaultId: string;
  strategyId?: string;
  date: Date;
  openValue: number;
  closeValue: number;
  dailyReturn: number; // Percentage
  cumulativeReturn: number; // Percentage from inception
}

export interface PerformanceDashboardData {
  vault: Vault;
  metrics: VaultPerformanceMetrics;
  snapshots: PerformanceSnapshot[];
  historicalReturns: HistoricalReturn[];
  strategyBreakdown: StrategyPerformanceScore[];
  lastUpdated: Date;
}

// ============================================================================
// Investment Layer Events
// ============================================================================

export type InvestmentEventType =
  | 'vault_created'
  | 'vault_deposit'
  | 'vault_withdrawal'
  | 'vault_status_changed'
  | 'allocation_created'
  | 'allocation_rebalanced'
  | 'risk_check_failed'
  | 'circuit_breaker_triggered'
  | 'emergency_stop'
  | 'optimization_applied'
  | 'performance_snapshot_taken'
  | 'audit_entry_created'
  | 'managed_vault_created'
  | 'compliance_status_changed';

export interface InvestmentEvent {
  type: InvestmentEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type InvestmentEventCallback = (event: InvestmentEvent) => void;

// ============================================================================
// Investment Layer Config
// ============================================================================

export interface InvestmentLayerConfig {
  defaultRiskParameters: Partial<VaultRiskParameters>;
  defaultAllocationLimits: Partial<VaultAllocationLimits>;
  optimizationConfig: Partial<PortfolioOptimizationConfig>;
  maxVaultsPerOwner: number;
  minDepositAmount: number; // In TON
  minWithdrawalAmount: number; // In TON
  performanceSnapshotIntervalMs: number;
  rebalanceCheckIntervalMs: number;
  auditRetentionDays: number;
}

export interface InvestmentLayerHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  vaultManager: 'healthy' | 'degraded' | 'unhealthy';
  riskEngine: 'healthy' | 'degraded' | 'unhealthy';
  allocationEngine: 'healthy' | 'degraded' | 'unhealthy';
  portfolioOptimizer: 'healthy' | 'degraded' | 'unhealthy';
  institutionalMode: 'healthy' | 'degraded' | 'unhealthy';
  performanceAnalytics: 'healthy' | 'degraded' | 'unhealthy';
  totalVaults: number;
  totalAllocatedTon: number;
  activeAllocations: number;
  managedVaults: number;
}
