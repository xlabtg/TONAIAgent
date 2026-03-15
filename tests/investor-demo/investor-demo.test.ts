/**
 * Investor Demo Module Tests
 *
 * Comprehensive tests for Issue #90 — Investor-Ready End-to-End Demo Flow.
 *
 * Test suites:
 *   - Types & Config defaults
 *   - Step executors (individual step functions)
 *   - InvestorDemoManager lifecycle
 *   - Full demo flow (runFullDemo)
 *   - Step-by-step advancement (nextStep)
 *   - Session management (reset, list)
 *   - Event system
 *   - All personas & strategies
 *   - Edge cases (skip telegram, skip social, error recovery)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createInvestorDemoManager,
  InvestorDemoManager,
  defaultInvestorDemoConfig,
  executeLandingStep,
  executeTelegramIntegrationStep,
  executeWalletCreationStep,
  executeSocialViralStep,
} from '../../examples/investor-demo';

import type {
  InvestorDemoConfig,
  DemoSession,
  DemoStep,
  InvestorDemoEvent,
  AgentCreationResult,
  LiveDashboardResult,
} from '../../examples/investor-demo';

// ============================================================================
// Test Helpers
// ============================================================================

function makeConfig(overrides: Partial<InvestorDemoConfig> = {}): Partial<InvestorDemoConfig> {
  return {
    mode: 'guided',
    persona: 'retail',
    strategy: 'dca',
    aiProvider: 'groq',
    budgetTon: 50,
    telegramEnabled: true,
    socialEnabled: true,
    autoAdvance: false,
    ...overrides,
  };
}

function makeAgentCreationResult(overrides: Partial<AgentCreationResult> = {}): AgentCreationResult {
  return {
    type: 'agent_creation',
    agentId: 'demo_agent_user_test_abc123',
    agentName: 'My First AI Agent',
    strategy: 'dca',
    aiProvider: 'groq',
    budgetTon: 100,
    riskLevel: 'medium',
    creationTimeMs: 5,
    userId: 'demo_user_test_session',
    ...overrides,
  };
}

function makeDashboardResult(overrides: Partial<LiveDashboardResult> = {}): LiveDashboardResult {
  return {
    type: 'live_dashboard',
    agentStatus: 'active',
    tonBalance: 98,
    usdBalance: 0,
    totalPnl: 0.5,
    roi: 0.5,
    totalTrades: 2,
    winRate: 100,
    uptime: 100,
    recentTrades: [],
    recentLogs: [],
    dashboardUrl: 'https://tonaiagent.com/dashboard/abc123',
    ...overrides,
  };
}

// ============================================================================
// Default Config
// ============================================================================

describe('defaultInvestorDemoConfig', () => {
  it('has all required fields with sensible defaults', () => {
    expect(defaultInvestorDemoConfig.mode).toBe('guided');
    expect(defaultInvestorDemoConfig.persona).toBe('retail');
    expect(defaultInvestorDemoConfig.strategy).toBe('dca');
    expect(defaultInvestorDemoConfig.aiProvider).toBe('groq');
    expect(defaultInvestorDemoConfig.budgetTon).toBe(100);
    expect(defaultInvestorDemoConfig.telegramEnabled).toBe(true);
    expect(defaultInvestorDemoConfig.socialEnabled).toBe(true);
    expect(defaultInvestorDemoConfig.autoAdvance).toBe(false);
    expect(defaultInvestorDemoConfig.autoAdvanceDelayMs).toBe(3_000);
  });
});

// ============================================================================
// Step 1: Landing
// ============================================================================

describe('executeLandingStep', () => {
  it('returns a landing result with telegram_mini_app when telegramEnabled', () => {
    const config = { ...defaultInvestorDemoConfig, telegramEnabled: true };
    const step = { id: 'landing', number: 1, title: 'Landing', description: '', status: 'pending' } as DemoStep;
    const result = executeLandingStep(config, step);
    expect(result.type).toBe('landing');
    expect(result.entryPoint).toBe('telegram_mini_app');
    expect(result.ctaClicked).toBe('create_agent');
  });

  it('returns web entry point when telegramEnabled is false', () => {
    const config = { ...defaultInvestorDemoConfig, telegramEnabled: false };
    const step = { id: 'landing', number: 1, title: 'Landing', description: '', status: 'pending' } as DemoStep;
    const result = executeLandingStep(config, step);
    expect(result.entryPoint).toBe('web');
  });

  it('preserves persona in result', () => {
    const config = { ...defaultInvestorDemoConfig, persona: 'institutional' as const };
    const step = { id: 'landing', number: 1, title: 'Landing', description: '', status: 'pending' } as DemoStep;
    const result = executeLandingStep(config, step);
    expect(result.persona).toBe('institutional');
  });

  it('has a positive timeToCtaMs', () => {
    const config = defaultInvestorDemoConfig;
    const step = { id: 'landing', number: 1, title: 'Landing', description: '', status: 'pending' } as DemoStep;
    const result = executeLandingStep(config, step);
    expect(result.timeToCtaMs).toBeGreaterThan(0);
  });
});

// ============================================================================
// Step 3: Telegram Integration
// ============================================================================

describe('executeTelegramIntegrationStep', () => {
  it('creates bot when telegramEnabled is true', () => {
    const config = defaultInvestorDemoConfig;
    const agentCreation = makeAgentCreationResult({ agentName: 'My First AI Agent' });
    const result = executeTelegramIntegrationStep(config, agentCreation);
    expect(result.type).toBe('telegram_integration');
    expect(result.botCreated).toBe(true);
    expect(result.botUsername).toContain('bot');
    expect(result.miniAppUrl).toContain('t.me');
    expect(result.webhookConfigured).toBe(true);
  });

  it('registers standard commands', () => {
    const config = defaultInvestorDemoConfig;
    const agentCreation = makeAgentCreationResult();
    const result = executeTelegramIntegrationStep(config, agentCreation);
    expect(result.commandsRegistered).toContain('/start');
    expect(result.commandsRegistered).toContain('/status');
    expect(result.commandsRegistered).toContain('/balance');
    expect(result.commandsRegistered).toContain('/trades');
    expect(result.commandsRegistered).toContain('/pause');
    expect(result.commandsRegistered).toContain('/stop');
  });

  it('masks the bot token', () => {
    const config = defaultInvestorDemoConfig;
    const agentCreation = makeAgentCreationResult();
    const result = executeTelegramIntegrationStep(config, agentCreation);
    expect(result.botTokenMasked).toContain('***');
  });

  it('returns disabled result when telegramEnabled is false', () => {
    const config = { ...defaultInvestorDemoConfig, telegramEnabled: false };
    const agentCreation = makeAgentCreationResult();
    const result = executeTelegramIntegrationStep(config, agentCreation);
    expect(result.botCreated).toBe(false);
    expect(result.botUsername).toBe('');
    expect(result.commandsRegistered).toHaveLength(0);
  });
});

// ============================================================================
// Step 4: Wallet Creation
// ============================================================================

describe('executeWalletCreationStep', () => {
  it('generates a valid TON address starting with EQ', () => {
    const agentCreation = makeAgentCreationResult();
    const result = executeWalletCreationStep(agentCreation);
    expect(result.type).toBe('wallet_creation');
    expect(result.walletAddress).toMatch(/^EQ/);
  });

  it('uses MPC wallet type', () => {
    const agentCreation = makeAgentCreationResult();
    const result = executeWalletCreationStep(agentCreation);
    expect(result.walletType).toBe('mpc');
  });

  it('deploys a smart contract', () => {
    const agentCreation = makeAgentCreationResult();
    const result = executeWalletCreationStep(agentCreation);
    expect(result.contractDeployed).toBe(true);
    expect(result.contractAddress).toMatch(/^EQ/);
    expect(result.deployTxHash).toBeDefined();
  });

  it('uses MPC threshold key security', () => {
    const agentCreation = makeAgentCreationResult();
    const result = executeWalletCreationStep(agentCreation);
    expect(result.keySecurityMechanism).toBe('mpc_threshold');
  });

  it('sets initial balance from agent budget', () => {
    const agentCreation = makeAgentCreationResult({ budgetTon: 200 });
    const result = executeWalletCreationStep(agentCreation);
    expect(result.initialBalanceTon).toBe(200);
  });

  it('generates different addresses for different agents', () => {
    const a1 = makeAgentCreationResult({ agentId: 'agent_aaa' });
    const a2 = makeAgentCreationResult({ agentId: 'agent_bbb' });
    const r1 = executeWalletCreationStep(a1);
    const r2 = executeWalletCreationStep(a2);
    expect(r1.walletAddress).not.toBe(r2.walletAddress);
  });
});

// ============================================================================
// Step 7: Social & Viral
// ============================================================================

describe('executeSocialViralStep', () => {
  it('creates share URL with agent ID', () => {
    const config = defaultInvestorDemoConfig;
    const agentCreation = makeAgentCreationResult({ agentId: 'demo_abc123' });
    const dashboard = makeDashboardResult();
    const result = executeSocialViralStep(config, agentCreation, dashboard);
    expect(result.type).toBe('social_viral');
    expect(result.shareUrl).toContain('demo_abc123');
  });

  it('generates share text with strategy and AI provider', () => {
    const config = defaultInvestorDemoConfig;
    const agentCreation = makeAgentCreationResult({ strategy: 'dca', aiProvider: 'groq' });
    const dashboard = makeDashboardResult({ roi: 1.5 });
    const result = executeSocialViralStep(config, agentCreation, dashboard);
    expect(result.shareText).toContain('Dollar-Cost Averaging');
    expect(result.shareText).toContain('Groq');
    expect(result.shareText).toContain('#TONAIAgent');
  });

  it('has a reputation score in 0-100 range', () => {
    const config = defaultInvestorDemoConfig;
    const agentCreation = makeAgentCreationResult();
    const dashboard = makeDashboardResult();
    const result = executeSocialViralStep(config, agentCreation, dashboard);
    expect(result.reputationScore).toBeGreaterThanOrEqual(0);
    expect(result.reputationScore).toBeLessThanOrEqual(100);
  });

  it('creates leaderboard entry', () => {
    const config = defaultInvestorDemoConfig;
    const agentCreation = makeAgentCreationResult();
    const dashboard = makeDashboardResult();
    const result = executeSocialViralStep(config, agentCreation, dashboard);
    expect(result.leaderboardEntryCreated).toBe(true);
    expect(result.leaderboardRank).toBeGreaterThan(0);
  });

  it('returns disabled result when socialEnabled is false', () => {
    const config = { ...defaultInvestorDemoConfig, socialEnabled: false };
    const agentCreation = makeAgentCreationResult();
    const dashboard = makeDashboardResult();
    const result = executeSocialViralStep(config, agentCreation, dashboard);
    expect(result.shareUrl).toBe('');
    expect(result.leaderboardEntryCreated).toBe(false);
    expect(result.reputationScore).toBe(0);
  });

  it('shows positive ROI in share text', () => {
    const config = defaultInvestorDemoConfig;
    const agentCreation = makeAgentCreationResult();
    const dashboard = makeDashboardResult({ roi: 2.5 });
    const result = executeSocialViralStep(config, agentCreation, dashboard);
    expect(result.shareText).toContain('+2.50%');
  });

  it('shows negative ROI in share text when roi is negative', () => {
    const config = defaultInvestorDemoConfig;
    const agentCreation = makeAgentCreationResult();
    const dashboard = makeDashboardResult({ roi: -1.0 });
    const result = executeSocialViralStep(config, agentCreation, dashboard);
    expect(result.shareText).toContain('-1.00%');
  });
});

// ============================================================================
// InvestorDemoManager — Creation
// ============================================================================

describe('createInvestorDemoManager', () => {
  it('returns an InvestorDemoManager instance', () => {
    const manager = createInvestorDemoManager();
    expect(manager).toBeInstanceOf(InvestorDemoManager);
  });

  it('starts with no sessions', () => {
    const manager = createInvestorDemoManager();
    expect(manager.listSessions()).toHaveLength(0);
  });
});

// ============================================================================
// InvestorDemoManager — Session Management
// ============================================================================

describe('InvestorDemoManager.startSession', () => {
  let manager: InvestorDemoManager;

  beforeEach(() => {
    manager = createInvestorDemoManager();
  });

  it('creates a session with a unique ID', async () => {
    const session = await manager.startSession();
    expect(session.sessionId).toMatch(/^demo_\d+_/);
  });

  it('initializes session with running status', async () => {
    const session = await manager.startSession();
    expect(session.status).toBe('running');
  });

  it('initializes 7 pending steps', async () => {
    const session = await manager.startSession();
    expect(session.steps).toHaveLength(7);
    for (const step of session.steps) {
      expect(step.status).toBe('pending');
    }
  });

  it('steps have correct IDs in order', async () => {
    const session = await manager.startSession();
    const ids = session.steps.map((s) => s.id);
    expect(ids).toEqual([
      'landing',
      'agent_creation',
      'telegram_integration',
      'wallet_creation',
      'strategy_activation',
      'live_dashboard',
      'social_viral',
    ]);
  });

  it('steps have sequential numbers 1-7', async () => {
    const session = await manager.startSession();
    const numbers = session.steps.map((s) => s.number);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('merges config overrides with defaults', async () => {
    const session = await manager.startSession({ persona: 'institutional', strategy: 'yield' });
    expect(session.config.persona).toBe('institutional');
    expect(session.config.strategy).toBe('yield');
    expect(session.config.aiProvider).toBe('groq'); // from default
  });

  it('creates two sessions with different IDs', async () => {
    const s1 = await manager.startSession();
    const s2 = await manager.startSession();
    expect(s1.sessionId).not.toBe(s2.sessionId);
  });

  it('lists both sessions after creation', async () => {
    await manager.startSession();
    await manager.startSession();
    expect(manager.listSessions()).toHaveLength(2);
  });
});

// ============================================================================
// InvestorDemoManager — getSession
// ============================================================================

describe('InvestorDemoManager.getSession', () => {
  let manager: InvestorDemoManager;

  beforeEach(() => {
    manager = createInvestorDemoManager();
  });

  it('returns the session by ID', async () => {
    const session = await manager.startSession();
    const retrieved = manager.getSession(session.sessionId);
    expect(retrieved.sessionId).toBe(session.sessionId);
  });

  it('throws if session does not exist', () => {
    expect(() => manager.getSession('nonexistent_session')).toThrow('Demo session not found');
  });
});

// ============================================================================
// InvestorDemoManager — executeStep
// ============================================================================

describe('InvestorDemoManager.executeStep', () => {
  let manager: InvestorDemoManager;
  let session: DemoSession;

  beforeEach(async () => {
    manager = createInvestorDemoManager();
    session = await manager.startSession(makeConfig());
  });

  it('completes the landing step', async () => {
    const step = await manager.executeStep(session.sessionId, 'landing');
    expect(step.status).toBe('completed');
    expect(step.result).toBeDefined();
    expect((step.result as { type: string }).type).toBe('landing');
  });

  it('records startedAt and completedAt on the step', async () => {
    const step = await manager.executeStep(session.sessionId, 'landing');
    expect(step.startedAt).toBeInstanceOf(Date);
    expect(step.completedAt).toBeInstanceOf(Date);
  });

  it('records durationMs on the step', async () => {
    const step = await manager.executeStep(session.sessionId, 'landing');
    expect(typeof step.durationMs).toBe('number');
    expect(step.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('throws when executing a step from a nonexistent session', async () => {
    await expect(manager.executeStep('bad_session', 'landing')).rejects.toThrow();
  });

  it('throws for unknown step ID', async () => {
    await expect(
      manager.executeStep(session.sessionId, 'unknown_step' as 'landing'),
    ).rejects.toThrow();
  });

  it('completes agent_creation step and produces agentId', async () => {
    await manager.executeStep(session.sessionId, 'landing');
    const step = await manager.executeStep(session.sessionId, 'agent_creation');
    expect(step.status).toBe('completed');
    const result = step.result as AgentCreationResult;
    expect(result.agentId).toMatch(/^demo_agent_/);
    expect(result.creationTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('telegram_integration step requires agent_creation first', async () => {
    await expect(
      manager.executeStep(session.sessionId, 'telegram_integration'),
    ).rejects.toThrow();
  });
});

// ============================================================================
// InvestorDemoManager — nextStep
// ============================================================================

describe('InvestorDemoManager.nextStep', () => {
  let manager: InvestorDemoManager;
  let session: DemoSession;

  beforeEach(async () => {
    manager = createInvestorDemoManager();
    session = await manager.startSession(makeConfig());
  });

  it('advances to the first step (landing)', async () => {
    const step = await manager.nextStep(session.sessionId);
    expect(step.id).toBe('landing');
    expect(step.status).toBe('completed');
  });

  it('advances to agent_creation after landing', async () => {
    await manager.nextStep(session.sessionId); // landing
    const step = await manager.nextStep(session.sessionId); // agent_creation
    expect(step.id).toBe('agent_creation');
  });

  it('throws when all steps are done', async () => {
    // Run all steps
    const config = makeConfig({ telegramEnabled: false, socialEnabled: false });
    const s = await manager.startSession(config);
    for (let i = 0; i < 7; i++) {
      await manager.nextStep(s.sessionId);
    }
    await expect(manager.nextStep(s.sessionId)).rejects.toThrow('No pending steps');
  });
});

// ============================================================================
// InvestorDemoManager — resetSession
// ============================================================================

describe('InvestorDemoManager.resetSession', () => {
  let manager: InvestorDemoManager;

  beforeEach(() => {
    manager = createInvestorDemoManager();
  });

  it('creates a new session with a different ID', async () => {
    const original = await manager.startSession();
    const reset = await manager.resetSession(original.sessionId);
    expect(reset.sessionId).not.toBe(original.sessionId);
  });

  it('new session has 7 pending steps', async () => {
    const original = await manager.startSession();
    await manager.nextStep(original.sessionId); // advance one step
    const reset = await manager.resetSession(original.sessionId);
    expect(reset.steps.every((s) => s.status === 'pending')).toBe(true);
  });

  it('preserves the original config', async () => {
    const original = await manager.startSession({ persona: 'trader', strategy: 'grid' });
    const reset = await manager.resetSession(original.sessionId);
    expect(reset.config.persona).toBe('trader');
    expect(reset.config.strategy).toBe('grid');
  });
});

// ============================================================================
// InvestorDemoManager — Full Demo Flow
// ============================================================================

describe('InvestorDemoManager.runFullDemo', () => {
  let manager: InvestorDemoManager;

  beforeEach(() => {
    manager = createInvestorDemoManager();
  });

  it('completes successfully with default config', async () => {
    const session = await manager.runFullDemo();
    expect(session.status).toBe('completed');
  });

  it('all steps are completed or skipped', async () => {
    const session = await manager.runFullDemo();
    for (const step of session.steps) {
      expect(['completed', 'skipped']).toContain(step.status);
    }
  });

  it('produces a session summary', async () => {
    const session = await manager.runFullDemo();
    expect(session.summary).toBeDefined();
    expect(session.summary!.agentId).toMatch(/^demo_agent_/);
    expect(session.summary!.walletAddress).toMatch(/^EQ/);
    expect(session.summary!.aiProvider).toBe('groq');
  });

  it('summary has a meaningful valueProposition', async () => {
    const session = await manager.runFullDemo();
    expect(session.summary!.valueProposition).toBeTruthy();
    expect(session.summary!.valueProposition.length).toBeGreaterThan(10);
  });

  it('records totalDurationMs', async () => {
    const session = await manager.runFullDemo();
    expect(typeof session.totalDurationMs).toBe('number');
    expect(session.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('has a positive timeToLiveMs in summary', async () => {
    const session = await manager.runFullDemo();
    expect(session.summary!.timeToLiveMs).toBeGreaterThanOrEqual(0);
  });

  it('bot username is in summary when telegram is enabled', async () => {
    const session = await manager.runFullDemo({ telegramEnabled: true });
    expect(session.summary!.botUsername).toBeDefined();
    expect(session.summary!.botUsername).toContain('bot');
  });

  it('works without telegram integration', async () => {
    const session = await manager.runFullDemo({ telegramEnabled: false });
    expect(session.status).toBe('completed');
    // Telegram step should be skipped
    const telegramStep = session.steps.find((s) => s.id === 'telegram_integration');
    expect(telegramStep?.status).toBe('skipped');
  });

  it('works without social/viral step', async () => {
    const session = await manager.runFullDemo({ socialEnabled: false });
    expect(session.status).toBe('completed');
    const socialStep = session.steps.find((s) => s.id === 'social_viral');
    expect(socialStep?.status).toBe('skipped');
  });

  it('all step types are represented in results', async () => {
    const session = await manager.runFullDemo();
    const completedSteps = session.steps.filter((s) => s.status === 'completed');
    const resultTypes = completedSteps.map((s) => (s.result as { type: string })?.type);
    expect(resultTypes).toContain('landing');
    expect(resultTypes).toContain('agent_creation');
    expect(resultTypes).toContain('wallet_creation');
    expect(resultTypes).toContain('strategy_activation');
    expect(resultTypes).toContain('live_dashboard');
  });
});

// ============================================================================
// Strategy Variations
// ============================================================================

describe('runFullDemo — all strategies', () => {
  const strategies = ['dca', 'yield', 'grid', 'arbitrage'] as const;

  for (const strategy of strategies) {
    it(`completes successfully with strategy=${strategy}`, async () => {
      const manager = createInvestorDemoManager();
      const session = await manager.runFullDemo({ strategy });
      expect(session.status).toBe('completed');
      const agentCreation = session.steps.find((s) => s.id === 'agent_creation')
        ?.result as AgentCreationResult;
      expect(agentCreation.strategy).toBe(strategy);
    });
  }
});

// ============================================================================
// Persona Variations
// ============================================================================

describe('runFullDemo — all personas', () => {
  const personas = ['retail', 'trader', 'institutional', 'dao'] as const;

  for (const persona of personas) {
    it(`completes successfully with persona=${persona}`, async () => {
      const manager = createInvestorDemoManager();
      const session = await manager.runFullDemo({ persona });
      expect(session.status).toBe('completed');
      expect(session.config.persona).toBe(persona);
    });
  }

  it('institutional persona uses low risk level', async () => {
    const manager = createInvestorDemoManager();
    const session = await manager.runFullDemo({ persona: 'institutional' });
    const agentCreation = session.steps.find((s) => s.id === 'agent_creation')
      ?.result as AgentCreationResult;
    expect(agentCreation.riskLevel).toBe('low');
  });

  it('retail persona uses medium risk level', async () => {
    const manager = createInvestorDemoManager();
    const session = await manager.runFullDemo({ persona: 'retail' });
    const agentCreation = session.steps.find((s) => s.id === 'agent_creation')
      ?.result as AgentCreationResult;
    expect(agentCreation.riskLevel).toBe('medium');
  });
});

// ============================================================================
// AI Provider Variations
// ============================================================================

describe('runFullDemo — all AI providers', () => {
  const providers = ['groq', 'anthropic', 'openai', 'google', 'xai'] as const;

  for (const aiProvider of providers) {
    it(`completes with aiProvider=${aiProvider}`, async () => {
      const manager = createInvestorDemoManager();
      const session = await manager.runFullDemo({ aiProvider });
      expect(session.status).toBe('completed');
      const agentCreation = session.steps.find((s) => s.id === 'agent_creation')
        ?.result as AgentCreationResult;
      expect(agentCreation.aiProvider).toBe(aiProvider);
    });
  }
});

// ============================================================================
// Event System
// ============================================================================

describe('InvestorDemoManager events', () => {
  let manager: InvestorDemoManager;
  let events: InvestorDemoEvent[];

  beforeEach(() => {
    manager = createInvestorDemoManager();
    events = [];
    manager.onEvent((e) => events.push(e));
  });

  it('emits session_started when startSession is called', async () => {
    await manager.startSession();
    const startEvent = events.find((e) => e.type === 'session_started');
    expect(startEvent).toBeDefined();
  });

  it('emits step_started and step_completed for each executed step', async () => {
    const session = await manager.startSession();
    await manager.executeStep(session.sessionId, 'landing');
    expect(events.some((e) => e.type === 'step_started' && e.stepId === 'landing')).toBe(true);
    expect(events.some((e) => e.type === 'step_completed' && e.stepId === 'landing')).toBe(true);
  });

  it('emits session_completed when all steps are done', async () => {
    await manager.runFullDemo();
    expect(events.some((e) => e.type === 'session_completed')).toBe(true);
  });

  it('emits demo_reset when resetSession is called', async () => {
    const session = await manager.startSession();
    await manager.resetSession(session.sessionId);
    expect(events.some((e) => e.type === 'demo_reset')).toBe(true);
  });

  it('all events have sessionId and timestamp', async () => {
    await manager.runFullDemo();
    for (const event of events) {
      expect(event.sessionId).toBeTruthy();
      expect(event.timestamp).toBeInstanceOf(Date);
    }
  });

  it('step events have stepId', async () => {
    const session = await manager.startSession();
    await manager.executeStep(session.sessionId, 'landing');
    const stepEvents = events.filter(
      (e) => e.type === 'step_started' || e.type === 'step_completed',
    );
    for (const e of stepEvents) {
      expect(e.stepId).toBeTruthy();
    }
  });

  it('callback errors do not propagate to the manager', async () => {
    manager.onEvent(() => { throw new Error('callback error'); });
    // Should not throw
    await expect(manager.startSession()).resolves.toBeDefined();
  });
});

// ============================================================================
// Strategy Activation — Execution Results
// ============================================================================

describe('strategy_activation step result', () => {
  let manager: InvestorDemoManager;

  beforeEach(() => {
    manager = createInvestorDemoManager();
  });

  it('has activated=true', async () => {
    const session = await manager.startSession(makeConfig());
    await manager.nextStep(session.sessionId); // landing
    await manager.nextStep(session.sessionId); // agent_creation
    await manager.nextStep(session.sessionId); // telegram
    await manager.nextStep(session.sessionId); // wallet
    const step = await manager.nextStep(session.sessionId); // strategy_activation
    expect(step.id).toBe('strategy_activation');
    const result = step.result as { type: string; activated: boolean; aiReasoning: string; tonPriceUsd: number };
    expect(result.activated).toBe(true);
    expect(result.aiReasoning).toBeTruthy();
    expect(result.tonPriceUsd).toBeGreaterThan(0);
  });

  it('has executionLogs from the 9-step pipeline', async () => {
    const session = await manager.startSession(makeConfig({ telegramEnabled: false }));
    await manager.nextStep(session.sessionId); // landing
    await manager.nextStep(session.sessionId); // agent_creation
    await manager.nextStep(session.sessionId); // telegram (skipped)
    await manager.nextStep(session.sessionId); // wallet
    const step = await manager.nextStep(session.sessionId); // strategy_activation
    const result = step.result as { executionLogs: { step: string; message: string }[] };
    expect(result.executionLogs.length).toBeGreaterThan(0);
    expect(result.executionLogs[0].step).toBeTruthy();
    expect(result.executionLogs[0].message).toBeTruthy();
  });
});

// ============================================================================
// Live Dashboard — Dashboard State
// ============================================================================

describe('live_dashboard step result', () => {
  let manager: InvestorDemoManager;

  beforeEach(() => {
    manager = createInvestorDemoManager();
  });

  it('has a dashboard URL with agent ID', async () => {
    const session = await manager.runFullDemo({ telegramEnabled: false, socialEnabled: false });
    const dashboardStep = session.steps.find((s) => s.id === 'live_dashboard');
    const result = dashboardStep?.result as LiveDashboardResult;
    expect(result.dashboardUrl).toContain('tonaiagent.com/dashboard');
    expect(result.dashboardUrl).toContain(
      (session.summary?.agentId ?? '').split('_').slice(0, 3).join('_'),
    );
  });

  it('agent status is active after successful activation', async () => {
    const session = await manager.runFullDemo({ telegramEnabled: false, socialEnabled: false });
    const dashboardStep = session.steps.find((s) => s.id === 'live_dashboard');
    const result = dashboardStep?.result as LiveDashboardResult;
    expect(result.agentStatus).toBe('active');
  });
});

// ============================================================================
// Sandbox Mode
// ============================================================================

describe('sandbox mode', () => {
  it('runs successfully in sandbox mode', async () => {
    const manager = createInvestorDemoManager();
    const session = await manager.runFullDemo({ mode: 'sandbox' });
    expect(session.status).toBe('completed');
    expect(session.config.mode).toBe('sandbox');
  });
});

// ============================================================================
// Step Titles & Descriptions (metadata completeness)
// ============================================================================

describe('step metadata', () => {
  it('all steps have non-empty titles and descriptions', async () => {
    const manager = createInvestorDemoManager();
    const session = await manager.startSession();
    for (const step of session.steps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });
});
