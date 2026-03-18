/**
 * TONAIAgent — MVP Platform Types
 *
 * Type definitions for the unified MVP Platform integration layer.
 */

// ============================================================================
// Configuration
// ============================================================================

export interface MVPPlatformConfig {
  /** Platform name shown in logs and reports */
  name: string;
  /** Environment: 'simulation' prevents any real on-chain transactions */
  environment: 'simulation' | 'production';
  /** Initial portfolio budget in TON for new agents */
  defaultBudgetTon: number;
  /** Market data refresh interval in milliseconds */
  marketDataRefreshMs: number;
  /** Enable verbose logging */
  verbose: boolean;
}

export const DEFAULT_MVP_PLATFORM_CONFIG: MVPPlatformConfig = {
  name: 'TONAIAgent MVP',
  environment: 'simulation',
  defaultBudgetTon: 100,
  marketDataRefreshMs: 30_000,
  verbose: false,
};

// ============================================================================
// User Flow Types
// ============================================================================

/** Strategies available in the MVP */
export type MVPStrategyId = 'trend' | 'arbitrage' | 'ai-signal';

/** Risk levels supported by the MVP */
export type MVPRiskLevel = 'low' | 'medium' | 'high';

/** Request to create an MVP agent */
export interface CreateMVPAgentRequest {
  /** Telegram user ID or any user identifier */
  userId: string;
  /** Human-readable agent name */
  name: string;
  /** Strategy to execute */
  strategy: MVPStrategyId;
  /** Initial capital allocation in TON */
  budgetTon: number;
  /** Risk tolerance level */
  riskLevel: MVPRiskLevel;
}

/** Full status of an MVP agent */
export interface MVPAgentStatus {
  agentId: string;
  name: string;
  userId: string;
  strategy: MVPStrategyId;
  riskLevel: MVPRiskLevel;
  state: 'created' | 'running' | 'paused' | 'stopped' | 'error';
  budgetTon: number;
  portfolioValueTon: number;
  pnlTon: number;
  pnlPercent: number;
  tradesExecuted: number;
  winRate: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Market snapshot used for strategy execution */
export interface MVPMarketSnapshot {
  timestamp: Date;
  prices: Record<string, number>;
  assets: string[];
}

/** Result of a single strategy execution cycle */
export interface MVPExecutionResult {
  agentId: string;
  cycleNumber: number;
  strategy: MVPStrategyId;
  signal: 'buy' | 'sell' | 'hold' | 'none';
  tradeExecuted: boolean;
  portfolioValueBefore: number;
  portfolioValueAfter: number;
  pnlDelta: number;
  timestamp: Date;
}

/** Platform-level health summary */
export interface MVPPlatformHealth {
  status: 'healthy' | 'degraded' | 'error';
  components: {
    agentRuntime: boolean;
    strategyEngine: boolean;
    marketData: boolean;
    tradingEngine: boolean;
    portfolioAnalytics: boolean;
    agentControl: boolean;
    demoAgent: boolean;
  };
  activeAgents: number;
  totalTradesExecuted: number;
  uptime: number;
  checkedAt: Date;
}

// ============================================================================
// Demo Flow Types
// ============================================================================

/** Preconfigured demo agent for investor/partner demonstrations */
export interface DemoFlowConfig {
  userId: string;
  agentName: string;
  strategy: MVPStrategyId;
  budgetTon: number;
  riskLevel: MVPRiskLevel;
  /** Number of simulated execution cycles to run */
  simulationCycles: number;
  /** Delay between cycles in milliseconds */
  cycleDelayMs: number;
}

export const DEFAULT_DEMO_FLOW_CONFIG: DemoFlowConfig = {
  userId: 'demo_user_001',
  agentName: 'Momentum Demo Agent',
  strategy: 'trend' as MVPStrategyId,
  budgetTon: 1000,
  riskLevel: 'medium',
  simulationCycles: 5,
  cycleDelayMs: 100,
};

/** Result of running the full demo flow */
export interface DemoFlowResult {
  agentId: string;
  agentName: string;
  strategy: MVPStrategyId;
  cyclesCompleted: number;
  finalPortfolioValueTon: number;
  totalPnlTon: number;
  totalPnlPercent: number;
  tradesExecuted: number;
  winRate: number;
  executionResults: MVPExecutionResult[];
  durationMs: number;
  success: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export type MVPPlatformEventType =
  | 'platform.started'
  | 'platform.stopped'
  | 'agent.created'
  | 'agent.started'
  | 'agent.stopped'
  | 'agent.cycle_completed'
  | 'market.data_updated'
  | 'demo.completed';

export interface MVPPlatformEvent {
  type: MVPPlatformEventType;
  agentId?: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type MVPPlatformEventHandler = (event: MVPPlatformEvent) => void;

// ============================================================================
// Trade Execution Request/Response (Issue #249 — End-to-End Trading Flow)
// ============================================================================

/**
 * Incoming trade execution request from the Telegram Mini App.
 *
 * Sent via: POST /api/agent/execute
 */
export interface TradeExecutionRequest {
  /** Telegram user ID */
  userId: string;
  /** Strategy to use: momentum maps to 'trend', others are passed through */
  strategy: string;
  /** Trading pair, e.g. "TON/USDT" */
  pair: string;
  /** Amount in TON to allocate */
  amount: number;
  /** Execution mode: demo (simulation) or live (on-chain) */
  mode: 'demo' | 'live';
}

/**
 * Result returned from POST /api/agent/execute.
 */
export interface TradeExecutionResponse {
  /** Whether the trade request was accepted and processed */
  success: boolean;
  /** The agent ID that was created/used for this execution */
  agentId: string;
  /** Signal produced by the strategy */
  signal: 'buy' | 'sell' | 'hold' | 'none';
  /** Whether a trade was actually executed */
  tradeExecuted: boolean;
  /** Portfolio value before execution (in TON) */
  portfolioValueBefore: number;
  /** Portfolio value after execution (in TON) */
  portfolioValueAfter: number;
  /** PnL delta from this cycle (in TON) */
  pnlDelta: number;
  /** The trading pair used */
  pair: string;
  /** The execution mode */
  mode: 'demo' | 'live';
  /** ISO timestamp of execution */
  timestamp: string;
  /** Error message if success is false */
  error?: string;
}
