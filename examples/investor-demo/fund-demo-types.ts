/**
 * TONAIAgent - Investor Demo Flow Types (Issue #153)
 *
 * Type definitions for the six-stage Investor Demo Flow that showcases
 * the full lifecycle of the AI Fund Management platform:
 *
 *   Stage 1 — Strategy Discovery   : Browse strategies in the Strategy Marketplace
 *   Stage 2 — AI Fund Creation     : Configure fund with strategies and capital
 *   Stage 3 — Agent Deployment     : Launch strategy agents via AI Fund Manager
 *   Stage 4 — Live Execution       : Simulate market events and trading activity
 *   Stage 5 — Performance Monitor  : Dashboard with portfolio value and P&L
 *   Stage 6 — Rebalancing Demo     : Automatic portfolio rebalancing
 *
 * The demo runs in 5–10 minutes and is suitable for investor presentations,
 * fundraising, partnership discussions, and product demonstrations.
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * A strategy entry in the marketplace for the demo
 */
export interface DemoMarketplaceStrategy {
  /** Unique strategy identifier */
  id: string;
  /** Strategy display name */
  name: string;
  /** Strategy creator name */
  creator: string;
  /** Strategy category */
  category: 'dca' | 'yield' | 'grid' | 'arbitrage' | 'momentum';
  /** Annualized return percentage */
  annualReturn: number;
  /** Maximum drawdown percentage */
  maxDrawdown: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high';
  /** Percentage of total fund capital to allocate */
  allocationPercent: number;
  /** Brief description */
  description: string;
}

/**
 * Configuration for the Investor Demo Flow
 */
export interface FundInvestorDemoConfig {
  /** Total fund capital in USD */
  fundCapitalUsd: number;
  /** Fund name */
  fundName: string;
  /** Strategies selected for the fund */
  strategies: DemoMarketplaceStrategy[];
  /** Whether to include the rebalancing demonstration */
  includeRebalancing: boolean;
  /** Simulated duration of live execution in ms (for demo purposes) */
  executionDurationMs: number;
  /** Auto-advance steps for presentation mode */
  autoAdvance: boolean;
  /** Delay between auto-advance steps in ms */
  autoAdvanceDelayMs: number;
}

/**
 * Default strategies for the fund demo
 */
export const DEFAULT_DEMO_STRATEGIES: DemoMarketplaceStrategy[] = [
  {
    id: 'strategy_dca_001',
    name: 'TON DCA Accumulator',
    creator: 'AlphaLab',
    category: 'dca',
    annualReturn: 24.3,
    maxDrawdown: 8.2,
    sharpeRatio: 1.8,
    riskLevel: 'low',
    allocationPercent: 40,
    description: 'Systematic dollar-cost averaging into TON with volatility-adjusted intervals.',
  },
  {
    id: 'strategy_yield_002',
    name: 'DeFi Yield Optimizer',
    creator: 'YieldDAO',
    category: 'yield',
    annualReturn: 18.7,
    maxDrawdown: 5.1,
    sharpeRatio: 2.1,
    riskLevel: 'low',
    allocationPercent: 35,
    description: 'Auto-compounds yield across top TON DeFi protocols.',
  },
  {
    id: 'strategy_arb_003',
    name: 'Cross-DEX Arbitrage',
    creator: 'Quant42',
    category: 'arbitrage',
    annualReturn: 31.5,
    maxDrawdown: 12.4,
    sharpeRatio: 2.4,
    riskLevel: 'medium',
    allocationPercent: 25,
    description: 'Captures price differentials across STON.fi, DeDust, and other TON DEXs.',
  },
];

/**
 * Default fund investor demo configuration
 */
export const defaultFundInvestorDemoConfig: FundInvestorDemoConfig = {
  fundCapitalUsd: 100_000,
  fundName: 'TON AI Diversified Fund',
  strategies: DEFAULT_DEMO_STRATEGIES,
  includeRebalancing: true,
  executionDurationMs: 0,
  autoAdvance: false,
  autoAdvanceDelayMs: 2_000,
};

// ============================================================================
// Stage Definitions
// ============================================================================

/**
 * The six demo stages
 */
export type FundDemoStageId =
  | 'strategy_discovery'
  | 'fund_creation'
  | 'agent_deployment'
  | 'live_execution'
  | 'performance_monitoring'
  | 'rebalancing';

/**
 * Status of an individual demo stage
 */
export type FundDemoStageStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'error';

/**
 * A single stage in the fund demo flow
 */
export interface FundDemoStage {
  /** Stage identifier */
  id: FundDemoStageId;
  /** Stage number (1–6) */
  number: number;
  /** Display title */
  title: string;
  /** Investor-facing description */
  description: string;
  /** Current status */
  status: FundDemoStageStatus;
  /** Timestamp when stage started */
  startedAt?: Date;
  /** Timestamp when stage completed */
  completedAt?: Date;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Stage-specific result data */
  result?: FundDemoStageResult;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

/**
 * Union of all stage result payloads
 */
export type FundDemoStageResult =
  | StrategyDiscoveryResult
  | FundCreationResult
  | AgentDeploymentResult
  | LiveExecutionResult
  | PerformanceMonitoringResult
  | RebalancingResult;

// ============================================================================
// Stage 1: Strategy Discovery
// ============================================================================

export interface StrategyDiscoveryResult {
  type: 'strategy_discovery';
  /** Total strategies available in the marketplace */
  totalStrategiesAvailable: number;
  /** Strategies browsed during discovery */
  strategiesBrowsed: DemoMarketplaceStrategy[];
  /** Strategies selected for the fund */
  strategiesSelected: DemoMarketplaceStrategy[];
  /** Performance metrics shown to investor */
  topPerformer: DemoMarketplaceStrategy;
  /** Total allocation percentage (should be ~100%) */
  totalAllocationPercent: number;
  /** Discovery duration in ms */
  discoveryDurationMs: number;
}

// ============================================================================
// Stage 2: Fund Creation
// ============================================================================

export interface FundCreationResult {
  type: 'fund_creation';
  /** Unique fund identifier */
  fundId: string;
  /** Fund display name */
  fundName: string;
  /** Initial capital in USD */
  capitalUsd: number;
  /** Strategy allocations (name → percent) */
  allocationBreakdown: { strategyName: string; percent: number; amountUsd: number }[];
  /** Timestamp when fund was created */
  createdAt: Date;
  /** AI Fund Manager agent ID */
  fundManagerAgentId: string;
  /** Whether fund was successfully deployed */
  deployed: boolean;
  /** On-chain fund contract address (simulated) */
  contractAddress: string;
}

// ============================================================================
// Stage 3: Agent Deployment
// ============================================================================

export interface DeployedStrategyAgent {
  /** Agent identifier */
  agentId: string;
  /** Strategy this agent executes */
  strategyId: string;
  /** Strategy display name */
  strategyName: string;
  /** Capital allocated to this agent in USD */
  capitalUsd: number;
  /** Allocation as percentage of total fund */
  allocationPercent: number;
  /** Agent runtime status */
  status: 'active' | 'initializing';
}

export interface AgentDeploymentResult {
  type: 'agent_deployment';
  /** Fund ID these agents belong to */
  fundId: string;
  /** All deployed strategy agents */
  deployedAgents: DeployedStrategyAgent[];
  /** Total agents deployed */
  agentCount: number;
  /** Total capital deployed across all agents in USD */
  totalCapitalDeployedUsd: number;
  /** Deployment duration in ms */
  deploymentDurationMs: number;
  /** Whether all agents started successfully */
  allAgentsActive: boolean;
}

// ============================================================================
// Stage 4: Live Execution Simulation
// ============================================================================

export interface SimulatedTrade {
  id: string;
  agentId: string;
  strategyName: string;
  type: 'buy' | 'sell';
  symbol: string;
  amountUsd: number;
  priceUsd: number;
  isSimulated: boolean;
  executedAt: Date;
  pnlUsd?: number;
}

export interface SimulatedMarketEvent {
  type: 'price_change' | 'yield_accrual' | 'arbitrage_opportunity' | 'rebalance_trigger';
  description: string;
  impact: 'positive' | 'neutral' | 'negative';
  timestamp: Date;
}

export interface LiveExecutionResult {
  type: 'live_execution';
  /** Simulated trades executed */
  tradesExecuted: SimulatedTrade[];
  /** Market events that occurred */
  marketEvents: SimulatedMarketEvent[];
  /** Total trade volume in USD */
  totalVolumeUsd: number;
  /** Current portfolio value (after execution) */
  currentValueUsd: number;
  /** Unrealized P&L in USD */
  unrealizedPnlUsd: number;
  /** Execution duration in ms */
  executionDurationMs: number;
}

// ============================================================================
// Stage 5: Performance Monitoring
// ============================================================================

export interface StrategyPerformanceSnapshot {
  strategyId: string;
  strategyName: string;
  allocatedCapitalUsd: number;
  currentValueUsd: number;
  pnlUsd: number;
  returnPercent: number;
  tradesCount: number;
}

export interface PerformanceMonitoringResult {
  type: 'performance_monitoring';
  /** Total initial capital */
  totalCapitalUsd: number;
  /** Current portfolio value */
  currentValueUsd: number;
  /** Total P&L in USD */
  totalPnlUsd: number;
  /** Overall return percentage */
  totalReturnPercent: number;
  /** Per-strategy performance breakdown */
  strategyPerformance: StrategyPerformanceSnapshot[];
  /** Portfolio allocation breakdown (for chart display) */
  allocationBreakdown: { strategyName: string; currentPercent: number; targetPercent: number }[];
  /** Best performing strategy */
  bestPerformingStrategy: string;
  /** Dashboard URL (simulated) */
  dashboardUrl: string;
}

// ============================================================================
// Stage 6: Rebalancing
// ============================================================================

export interface RebalancingAction {
  strategyId: string;
  strategyName: string;
  previousPercent: number;
  newPercent: number;
  capitalMovedUsd: number;
  direction: 'increase' | 'decrease' | 'unchanged';
}

export interface RebalancingResult {
  type: 'rebalancing';
  /** Reason for rebalance */
  rebalanceReason: 'performance_drift' | 'risk_exposure' | 'scheduled';
  /** Actions taken during rebalancing */
  rebalancingActions: RebalancingAction[];
  /** Portfolio value before rebalancing */
  portfolioValueBeforeUsd: number;
  /** Portfolio value after rebalancing */
  portfolioValueAfterUsd: number;
  /** New allocation percentages */
  newAllocations: { strategyName: string; newPercent: number }[];
  /** Risk exposure before and after */
  riskExposureBefore: 'low' | 'medium' | 'high';
  /** Risk exposure after rebalancing */
  riskExposureAfter: 'low' | 'medium' | 'high';
  /** Rebalancing completed successfully */
  successful: boolean;
}

// ============================================================================
// Demo Session
// ============================================================================

/**
 * Overall session status
 */
export type FundDemoSessionStatus =
  | 'not_started'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused';

/**
 * Summary shown to investors at demo completion
 */
export interface FundDemoSummary {
  /** Fund identifier */
  fundId: string;
  /** Fund name */
  fundName: string;
  /** Initial capital in USD */
  initialCapitalUsd: number;
  /** Final portfolio value in USD */
  finalValueUsd: number;
  /** Total return percentage */
  totalReturnPercent: number;
  /** Total P&L in USD */
  totalPnlUsd: number;
  /** Number of strategy agents deployed */
  agentCount: number;
  /** Total simulated trades executed */
  totalTrades: number;
  /** Whether rebalancing was demonstrated */
  rebalancingDemonstrated: boolean;
  /** Total demo duration in ms */
  demoDurationMs: number;
  /** Key value proposition */
  valueProposition: string;
}

/**
 * Full fund demo session state
 */
export interface FundDemoSession {
  /** Unique session ID */
  sessionId: string;
  /** Session configuration */
  config: FundInvestorDemoConfig;
  /** Session status */
  status: FundDemoSessionStatus;
  /** All 6 demo stages */
  stages: FundDemoStage[];
  /** Current active stage */
  currentStage: FundDemoStageId | null;
  /** Session start time */
  startedAt?: Date;
  /** Session completion time */
  completedAt?: Date;
  /** Total session duration in ms */
  totalDurationMs?: number;
  /** Summary for investors */
  summary?: FundDemoSummary;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Events emitted during the fund demo flow
 */
export type FundDemoEventType =
  | 'session_started'
  | 'stage_started'
  | 'stage_completed'
  | 'stage_failed'
  | 'session_completed'
  | 'session_failed'
  | 'demo_reset';

/**
 * A fund demo event
 */
export interface FundDemoEvent {
  type: FundDemoEventType;
  sessionId: string;
  stageId?: FundDemoStageId;
  timestamp: Date;
  data: Record<string, unknown>;
}

/**
 * Event callback function
 */
export type FundDemoEventCallback = (event: FundDemoEvent) => void;

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Fund Investor Demo Service — main interface for the 6-stage fund demo flow
 */
export interface FundInvestorDemoService {
  /** Start a new demo session */
  startSession(config?: Partial<FundInvestorDemoConfig>): Promise<FundDemoSession>;

  /** Advance to the next pending stage */
  nextStage(sessionId: string): Promise<FundDemoStage>;

  /** Execute a specific stage by ID */
  executeStage(sessionId: string, stageId: FundDemoStageId): Promise<FundDemoStage>;

  /** Get current session state */
  getSession(sessionId: string): FundDemoSession;

  /** List all sessions */
  listSessions(): FundDemoSession[];

  /** Reset a session to the beginning */
  resetSession(sessionId: string): Promise<FundDemoSession>;

  /** Run the full demo flow from start to finish */
  runFullDemo(config?: Partial<FundInvestorDemoConfig>): Promise<FundDemoSession>;

  /** Subscribe to demo events */
  onEvent(callback: FundDemoEventCallback): void;
}
