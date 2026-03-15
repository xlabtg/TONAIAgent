/**
 * TONAIAgent - Investor-Ready End-to-End Demo Flow Types
 *
 * Type definitions for Issue #90: Investor-Ready End-to-End Demo Flow.
 *
 * The demo narrative: "Anyone can create a fully autonomous AI crypto agent in minutes."
 *
 * Seven-step flow:
 *   1. Landing / Entry Point         — user opens platform
 *   2. Agent Creation Wizard         — select strategy + AI provider
 *   3. Telegram Integration          — auto-create bot, assign to user
 *   4. TON Wallet Creation           — agent gets wallet + key security
 *   5. Strategy Activation           — real/simulated transaction visible in UI
 *   6. Live Dashboard                — status, transactions, performance, logs
 *   7. Social & Viral Element        — share agent, leaderboard, reputation
 */

// ============================================================================
// Demo Flow Configuration
// ============================================================================

/**
 * Supported AI providers for agent creation wizard
 */
export type DemoAIProvider =
  | 'groq'        // Default — fastest, free tier
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'xai';

/**
 * Demo strategy types (matches DemoStrategyType in demo-agent)
 */
export type DemoStrategy =
  | 'dca'         // Dollar-Cost Averaging — steady, beginner-friendly
  | 'yield'       // Yield Simulation — passive income
  | 'grid'        // Grid Trading — range-bound markets
  | 'arbitrage';  // Arbitrage — price differential capture

/**
 * Demo mode: guided (step-by-step narrative) or sandbox (free exploration)
 */
export type DemoMode = 'guided' | 'sandbox';

/**
 * Demo target audience persona
 */
export type DemoPersona =
  | 'retail'         // First-time crypto user
  | 'trader'         // Experienced trader
  | 'institutional'  // Hedge fund / VC
  | 'dao';           // DAO treasury manager

/**
 * Top-level configuration for a demo session
 */
export interface InvestorDemoConfig {
  /** Demo mode */
  mode: DemoMode;
  /** Target persona (affects narrative and defaults) */
  persona: DemoPersona;
  /** Selected strategy */
  strategy: DemoStrategy;
  /** Selected AI provider */
  aiProvider: DemoAIProvider;
  /** Starting budget in TON (simulated) */
  budgetTon: number;
  /** Whether Telegram integration step is enabled */
  telegramEnabled: boolean;
  /** Whether social/viral step is enabled */
  socialEnabled: boolean;
  /** Auto-advance steps (for automated investor presentations) */
  autoAdvance: boolean;
  /** Delay between auto-advance steps in ms */
  autoAdvanceDelayMs: number;
}

/**
 * Default demo configuration — optimised for 3-5 minute investor presentation
 */
export const defaultInvestorDemoConfig: InvestorDemoConfig = {
  mode: 'guided',
  persona: 'retail',
  strategy: 'dca',
  aiProvider: 'groq',
  budgetTon: 100,
  telegramEnabled: true,
  socialEnabled: true,
  autoAdvance: false,
  autoAdvanceDelayMs: 3_000,
};

// ============================================================================
// Demo Step Definitions
// ============================================================================

/**
 * The seven demo steps
 */
export type DemoStepId =
  | 'landing'
  | 'agent_creation'
  | 'telegram_integration'
  | 'wallet_creation'
  | 'strategy_activation'
  | 'live_dashboard'
  | 'social_viral';

/**
 * Status of an individual demo step
 */
export type DemoStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'error';

/**
 * A single step in the demo flow
 */
export interface DemoStep {
  /** Step identifier */
  id: DemoStepId;
  /** Step number (1–7) */
  number: number;
  /** Display title */
  title: string;
  /** Investor-facing description */
  description: string;
  /** Current status */
  status: DemoStepStatus;
  /** Timestamp when step started */
  startedAt?: Date;
  /** Timestamp when step completed */
  completedAt?: Date;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Step-specific result data */
  result?: DemoStepResult;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

/**
 * Union of all step result payloads
 */
export type DemoStepResult =
  | LandingStepResult
  | AgentCreationResult
  | TelegramIntegrationResult
  | WalletCreationResult
  | StrategyActivationResult
  | LiveDashboardResult
  | SocialViralResult;

// ============================================================================
// Step 1: Landing
// ============================================================================

export interface LandingStepResult {
  type: 'landing';
  /** Platform entry point used */
  entryPoint: 'web' | 'telegram_mini_app';
  /** Persona selected by user */
  persona: DemoPersona;
  /** CTA clicked */
  ctaClicked: 'create_agent' | 'watch_demo' | 'view_strategies';
  /** Time to CTA click (simulated, ms) */
  timeToCtaMs: number;
}

// ============================================================================
// Step 2: Agent Creation
// ============================================================================

export interface AgentCreationResult {
  type: 'agent_creation';
  /** Created agent ID */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Strategy selected */
  strategy: DemoStrategy;
  /** AI provider selected */
  aiProvider: DemoAIProvider;
  /** Starting budget in TON */
  budgetTon: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high';
  /** Time to create agent (ms) */
  creationTimeMs: number;
  /** User ID for this demo session */
  userId: string;
}

// ============================================================================
// Step 3: Telegram Integration
// ============================================================================

export interface TelegramIntegrationResult {
  type: 'telegram_integration';
  /** Simulated Telegram bot username */
  botUsername: string;
  /** Bot token (masked for demo) */
  botTokenMasked: string;
  /** Mini App URL */
  miniAppUrl: string;
  /** Whether bot was successfully created */
  botCreated: boolean;
  /** Commands registered */
  commandsRegistered: string[];
  /** Webhook configured */
  webhookConfigured: boolean;
}

// ============================================================================
// Step 4: TON Wallet Creation
// ============================================================================

export interface WalletCreationResult {
  type: 'wallet_creation';
  /** Simulated TON wallet address */
  walletAddress: string;
  /** Wallet type */
  walletType: 'non_custodial' | 'mpc' | 'smart_contract';
  /** Initial balance in TON */
  initialBalanceTon: number;
  /** Whether smart contract was deployed */
  contractDeployed: boolean;
  /** Simulated contract address */
  contractAddress?: string;
  /** Key security mechanism */
  keySecurityMechanism: 'mpc_threshold' | 'hsm' | 'user_managed';
  /** On-chain transaction hash (simulated) */
  deployTxHash?: string;
}

// ============================================================================
// Step 5: Strategy Activation
// ============================================================================

export interface StrategyActivationResult {
  type: 'strategy_activation';
  /** Whether activation succeeded */
  activated: boolean;
  /** Initial trade executed */
  firstTrade: DemoTrade | null;
  /** AI reasoning for the first decision */
  aiReasoning: string;
  /** Confidence score 0–1 */
  confidence: number;
  /** TON price at activation (USD) */
  tonPriceUsd: number;
  /** Execution logs from the first cycle */
  executionLogs: DemoExecutionLogEntry[];
}

/**
 * A simulated trade in the demo
 */
export interface DemoTrade {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  amount: number;
  priceUsd: number;
  totalUsd: number;
  fee: number;
  isSimulated: boolean;
  executedAt: Date;
}

/**
 * A compact execution log entry for the demo
 */
export interface DemoExecutionLogEntry {
  step: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  timestamp: Date;
}

// ============================================================================
// Step 6: Live Dashboard
// ============================================================================

export interface LiveDashboardResult {
  type: 'live_dashboard';
  /** Agent current status */
  agentStatus: 'active' | 'paused' | 'stopped';
  /** Current TON balance */
  tonBalance: number;
  /** Current USD equivalent */
  usdBalance: number;
  /** Total PnL in USD */
  totalPnl: number;
  /** ROI percentage */
  roi: number;
  /** Total trades executed */
  totalTrades: number;
  /** Win rate percentage */
  winRate: number;
  /** Agent uptime percentage */
  uptime: number;
  /** Recent trades */
  recentTrades: DemoTrade[];
  /** Recent log messages */
  recentLogs: DemoExecutionLogEntry[];
  /** Dashboard URL (simulated) */
  dashboardUrl: string;
}

// ============================================================================
// Step 7: Social & Viral
// ============================================================================

export interface SocialViralResult {
  type: 'social_viral';
  /** Public shareable agent URL */
  shareUrl: string;
  /** Agent leaderboard position */
  leaderboardRank: number;
  /** Agent reputation score 0–100 */
  reputationScore: number;
  /** Followers (simulated) */
  followers: number;
  /** Social sharing text */
  shareText: string;
  /** Whether leaderboard entry was created */
  leaderboardEntryCreated: boolean;
}

// ============================================================================
// Demo Session
// ============================================================================

/**
 * Status of the overall demo session
 */
export type DemoSessionStatus =
  | 'not_started'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused';

/**
 * Full demo session state
 */
export interface DemoSession {
  /** Unique session ID */
  sessionId: string;
  /** Session configuration */
  config: InvestorDemoConfig;
  /** Session status */
  status: DemoSessionStatus;
  /** All 7 demo steps */
  steps: DemoStep[];
  /** Current active step */
  currentStep: DemoStepId | null;
  /** Session start time */
  startedAt?: Date;
  /** Session completion time */
  completedAt?: Date;
  /** Total session duration in ms */
  totalDurationMs?: number;
  /** Summary metrics for the investor */
  summary?: DemoSummary;
}

/**
 * High-level summary shown to investors at demo completion
 */
export interface DemoSummary {
  /** Total time from start to live dashboard (ms) */
  timeToLiveMs: number;
  /** Agent ID created */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Wallet address */
  walletAddress: string;
  /** Telegram bot username */
  botUsername?: string;
  /** Current ROI percentage */
  roi: number;
  /** Total trades */
  totalTrades: number;
  /** Strategy name */
  strategyName: string;
  /** AI provider used */
  aiProvider: DemoAIProvider;
  /** Key value proposition shown */
  valueProposition: string;
}

// ============================================================================
// Demo Events
// ============================================================================

/**
 * Events emitted during the demo flow
 */
export type InvestorDemoEventType =
  | 'session_started'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'session_completed'
  | 'session_failed'
  | 'demo_reset';

/**
 * An investor demo event
 */
export interface InvestorDemoEvent {
  type: InvestorDemoEventType;
  sessionId: string;
  stepId?: DemoStepId;
  timestamp: Date;
  data: Record<string, unknown>;
}

/**
 * Event callback function
 */
export type InvestorDemoEventCallback = (event: InvestorDemoEvent) => void;

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Investor Demo Service — main interface for the end-to-end demo flow
 */
export interface InvestorDemoService {
  /** Start a new demo session */
  startSession(config?: Partial<InvestorDemoConfig>): Promise<DemoSession>;

  /** Advance to the next demo step */
  nextStep(sessionId: string): Promise<DemoStep>;

  /** Execute a specific step by ID */
  executeStep(sessionId: string, stepId: DemoStepId): Promise<DemoStep>;

  /** Get current session state */
  getSession(sessionId: string): DemoSession;

  /** List all active sessions */
  listSessions(): DemoSession[];

  /** Reset a session to the beginning */
  resetSession(sessionId: string): Promise<DemoSession>;

  /** Run the full demo flow from start to finish */
  runFullDemo(config?: Partial<InvestorDemoConfig>): Promise<DemoSession>;

  /** Subscribe to demo events */
  onEvent(callback: InvestorDemoEventCallback): void;
}
