/**
 * TONAIAgent - Investor Demo Step Executors
 *
 * Each function here executes one step of the 7-step investor demo flow.
 * All steps are simulation-only — no real funds, no real bot API calls.
 *
 * Issue #90: Investor-Ready End-to-End Demo Flow.
 */

import type {
  InvestorDemoConfig,
  DemoStep,
  LandingStepResult,
  AgentCreationResult,
  TelegramIntegrationResult,
  WalletCreationResult,
  StrategyActivationResult,
  LiveDashboardResult,
  SocialViralResult,
  DemoTrade,
  DemoExecutionLogEntry,
} from './types';

import { createDemoAgentManager } from '../demo-agent/agent';
import type { DemoAgentManager } from '../demo-agent/agent';

// ============================================================================
// Shared Simulation Helpers
// ============================================================================

/** Generate a deterministic-looking ID from a seed string */
function simId(prefix: string, seed: string): string {
  const hash = seed.split('').reduce((acc, c) => acc ^ c.charCodeAt(0), 0x5a5a);
  return `${prefix}_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

/** Generate a simulated TON address (EQ... format) */
function simTonAddress(seed: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let addr = 'EQ';
  let h = seed.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0x1234abcd);
  for (let i = 0; i < 46; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    addr += chars[h % chars.length];
  }
  return addr;
}

/** Generate a simulated Telegram bot username */
function simBotUsername(agentName: string): string {
  return `ton_ai_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_bot`;
}

/** Get display name for a strategy */
function strategyDisplayName(strategy: string): string {
  const names: Record<string, string> = {
    dca: 'Dollar-Cost Averaging',
    yield: 'Yield Optimization',
    grid: 'Grid Trading',
    arbitrage: 'Cross-DEX Arbitrage',
  };
  return names[strategy] ?? strategy;
}

/** Get display name for AI provider */
function providerDisplayName(provider: string): string {
  const names: Record<string, string> = {
    groq: 'Groq (Llama 3.1)',
    anthropic: 'Anthropic (Claude)',
    openai: 'OpenAI (GPT-4o)',
    google: 'Google (Gemini)',
    xai: 'xAI (Grok)',
  };
  return names[provider] ?? provider;
}

// ============================================================================
// Step 1: Landing
// ============================================================================

/**
 * Execute Step 1 — Landing / Entry Point
 *
 * Simulates a user arriving on the platform and clicking the CTA.
 */
export function executeLandingStep(
  config: InvestorDemoConfig,
  step: DemoStep,
): LandingStepResult {
  const entryPoint = config.telegramEnabled ? 'telegram_mini_app' : 'web';

  const result: LandingStepResult = {
    type: 'landing',
    entryPoint,
    persona: config.persona,
    ctaClicked: 'create_agent',
    timeToCtaMs: 12_000 + Math.floor(Math.random() * 8_000), // 12–20s simulated UX time
  };

  void step; // step metadata updated by orchestrator
  return result;
}

// ============================================================================
// Step 2: Agent Creation
// ============================================================================

/**
 * Execute Step 2 — Agent Creation Wizard
 *
 * Creates a real DemoAgentManager instance and registers the agent.
 * Returns the agent ID and configuration details.
 */
export async function executeAgentCreationStep(
  config: InvestorDemoConfig,
  sessionId: string,
  agentManager: DemoAgentManager,
): Promise<AgentCreationResult> {
  const userId = `demo_user_${sessionId}`;
  const personaNames: Record<string, string> = {
    retail: 'My First AI Agent',
    trader: 'Alpha Seeker v1',
    institutional: 'TON Yield Strategy',
    dao: 'Treasury Manager',
  };
  const agentName = personaNames[config.persona] ?? 'AI Agent';

  const start = Date.now();
  const agent = await agentManager.createAgent({
    userId,
    config: {
      name: agentName,
      budget: config.budgetTon,
      riskLevel: config.persona === 'institutional' ? 'low' : 'medium',
      strategy: config.strategy,
      executionMode: 'simulation',
      stopLoss: 5,
      maxDrawdown: 10,
      executionIntervalMs: 60_000,
    },
  });
  const creationTimeMs = Date.now() - start;

  return {
    type: 'agent_creation',
    agentId: agent.id,
    agentName,
    strategy: config.strategy,
    aiProvider: config.aiProvider,
    budgetTon: config.budgetTon,
    riskLevel: agent.config.riskLevel,
    creationTimeMs,
    userId,
  };
}

// ============================================================================
// Step 3: Telegram Integration
// ============================================================================

/**
 * Execute Step 3 — Telegram Bot Integration
 *
 * Simulates automatic bot creation via Telegram Bot API,
 * command registration, and Mini App webhook setup.
 */
export function executeTelegramIntegrationStep(
  config: InvestorDemoConfig,
  agentCreation: AgentCreationResult,
): TelegramIntegrationResult {
  if (!config.telegramEnabled) {
    return {
      type: 'telegram_integration',
      botUsername: '',
      botTokenMasked: '',
      miniAppUrl: '',
      botCreated: false,
      commandsRegistered: [],
      webhookConfigured: false,
    };
  }

  const botUsername = simBotUsername(agentCreation.agentName);
  const tokenSuffix = agentCreation.agentId.slice(-8);

  return {
    type: 'telegram_integration',
    botUsername,
    botTokenMasked: `7${tokenSuffix}:AAF***${tokenSuffix.toUpperCase()}`,
    miniAppUrl: `https://t.me/${botUsername}/app`,
    botCreated: true,
    commandsRegistered: ['/start', '/status', '/balance', '/trades', '/pause', '/stop'],
    webhookConfigured: true,
  };
}

// ============================================================================
// Step 4: TON Wallet Creation
// ============================================================================

/**
 * Execute Step 4 — TON Wallet Creation
 *
 * Simulates wallet generation, key security setup, and smart contract
 * deployment via the TON Smart Contract Factory (Issue #41).
 */
export function executeWalletCreationStep(
  agentCreation: AgentCreationResult,
): WalletCreationResult {
  const walletAddress = simTonAddress(agentCreation.agentId);
  const contractAddress = simTonAddress(agentCreation.agentId + '_contract');
  const txHash = simId('tx', agentCreation.agentId + '_deploy');

  return {
    type: 'wallet_creation',
    walletAddress,
    walletType: 'mpc',
    initialBalanceTon: agentCreation.budgetTon,
    contractDeployed: true,
    contractAddress,
    keySecurityMechanism: 'mpc_threshold',
    deployTxHash: txHash,
  };
}

// ============================================================================
// Step 5: Strategy Activation
// ============================================================================

/**
 * Execute Step 5 — Strategy Activation
 *
 * Starts the agent and runs one execution cycle.
 * The first real trade (simulated) becomes visible in the UI.
 */
export async function executeStrategyActivationStep(
  agentCreation: AgentCreationResult,
  agentManager: DemoAgentManager,
): Promise<StrategyActivationResult> {
  // Start the agent
  await agentManager.startAgent(agentCreation.agentId);

  // Run one execution cycle
  const logs = await agentManager.executeOnce(agentCreation.agentId);

  // Get current state
  const status = agentManager.getAgentStatus(agentCreation.agentId);
  const balance = status.balance;

  // Extract first trade if any
  const trades = balance.trades;
  let firstTrade: DemoTrade | null = null;
  if (trades.length > 0) {
    const t = trades[0];
    firstTrade = {
      id: t.id,
      type: t.type,
      symbol: t.symbol,
      amount: t.amount,
      priceUsd: t.price,
      totalUsd: t.totalUsd,
      fee: t.fee,
      isSimulated: t.isSimulated,
      executedAt: t.executedAt,
    };
  }

  // Build compact execution log
  const executionLogs: DemoExecutionLogEntry[] = logs.map((l) => ({
    step: l.step,
    message: l.message,
    level: l.level,
    timestamp: l.timestamp,
  }));

  // Extract AI reasoning from logs
  const decisionLog = logs.find((l) => l.step === 'generate_decision');
  const aiReasoning = decisionLog?.message ?? `${strategyDisplayName(agentCreation.strategy)} analysis complete.`;

  // Confidence from decision log data, default 0.75
  const confidence = typeof decisionLog?.data?.confidence === 'number'
    ? decisionLog.data.confidence
    : 0.75;

  // TON price from market data log
  const marketLog = logs.find((l) => l.step === 'fetch_market_data');
  const tonPriceUsd = typeof marketLog?.data?.price === 'number'
    ? marketLog.data.price
    : 5.5;

  return {
    type: 'strategy_activation',
    activated: true,
    firstTrade,
    aiReasoning,
    confidence,
    tonPriceUsd,
    executionLogs,
  };
}

// ============================================================================
// Step 6: Live Dashboard
// ============================================================================

/**
 * Execute Step 6 — Live Dashboard
 *
 * Pulls the current agent state and formats it as a live dashboard snapshot
 * suitable for investor presentation.
 */
export function executeLiveDashboardStep(
  agentCreation: AgentCreationResult,
  walletCreation: WalletCreationResult,
  agentManager: DemoAgentManager,
): LiveDashboardResult {
  const status = agentManager.getAgentStatus(agentCreation.agentId);
  const metrics = agentManager.getAgentMetrics(agentCreation.agentId);
  const balance = status.balance;

  const recentTrades: DemoTrade[] = balance.trades.slice(-5).map((t) => ({
    id: t.id,
    type: t.type,
    symbol: t.symbol,
    amount: t.amount,
    priceUsd: t.price,
    totalUsd: t.totalUsd,
    fee: t.fee,
    isSimulated: t.isSimulated,
    executedAt: t.executedAt,
  }));

  const recentLogs: DemoExecutionLogEntry[] = metrics.recentLogs.slice(-10).map((l) => ({
    step: l.step,
    message: l.message,
    level: l.level,
    timestamp: l.timestamp,
  }));

  const dashboardUrl = `https://tonaiagent.com/dashboard/${agentCreation.agentId}`;

  return {
    type: 'live_dashboard',
    agentStatus: status.agent.status === 'active' ? 'active'
      : status.agent.status === 'paused' ? 'paused' : 'stopped',
    tonBalance: balance.tonBalance,
    usdBalance: balance.usdBalance,
    totalPnl: balance.totalPnl,
    roi: balance.roi,
    totalTrades: balance.trades.length,
    winRate: status.metrics.winRate,
    uptime: status.metrics.uptime,
    recentTrades,
    recentLogs,
    dashboardUrl,
  };
}

// ============================================================================
// Step 7: Social & Viral
// ============================================================================

/**
 * Execute Step 7 — Social & Viral Element (Optional)
 *
 * Generates shareable links, leaderboard position, and reputation score
 * to demonstrate the platform's viral / community growth layer.
 */
export function executeSocialViralStep(
  config: InvestorDemoConfig,
  agentCreation: AgentCreationResult,
  dashboard: LiveDashboardResult,
): SocialViralResult {
  if (!config.socialEnabled) {
    return {
      type: 'social_viral',
      shareUrl: '',
      leaderboardRank: 0,
      reputationScore: 0,
      followers: 0,
      shareText: '',
      leaderboardEntryCreated: false,
    };
  }

  const shareUrl = `https://tonaiagent.com/agents/${agentCreation.agentId}`;
  const strategyName = strategyDisplayName(agentCreation.strategy);
  const providerName = providerDisplayName(agentCreation.aiProvider);
  const roiStr = dashboard.roi >= 0
    ? `+${dashboard.roi.toFixed(2)}%`
    : `${dashboard.roi.toFixed(2)}%`;

  const shareText =
    `🤖 Just deployed my AI crypto agent on TON!\n` +
    `Strategy: ${strategyName} | AI: ${providerName}\n` +
    `ROI: ${roiStr} | Trades: ${dashboard.totalTrades}\n` +
    `${shareUrl}\n` +
    `#TONAIAgent #DeFi #AutonomousFinance`;

  // Simulated leaderboard position — lower ROI = lower rank
  const leaderboardRank = dashboard.roi >= 1 ? 42
    : dashboard.roi >= 0 ? 150
    : 500;

  // Reputation score: 0-100 based on win rate and ROI
  const reputationScore = Math.min(
    100,
    Math.round(dashboard.winRate * 0.5 + Math.max(0, dashboard.roi) * 10 + 30),
  );

  return {
    type: 'social_viral',
    shareUrl,
    leaderboardRank,
    reputationScore,
    followers: leaderboardRank < 100 ? 12 : 3,
    shareText,
    leaderboardEntryCreated: true,
  };
}
