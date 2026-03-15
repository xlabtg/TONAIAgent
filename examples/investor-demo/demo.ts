/**
 * TONAIAgent - Investor Demo Orchestrator
 *
 * Orchestrates the seven-step investor-ready end-to-end demo flow.
 *
 * Issue #90: Investor-Ready End-to-End Demo Flow
 *
 * Flow:
 *   Step 1 — Landing / Entry Point
 *   Step 2 — Agent Creation Wizard
 *   Step 3 — Telegram Integration
 *   Step 4 — TON Wallet Creation
 *   Step 5 — Strategy Activation
 *   Step 6 — Live Dashboard
 *   Step 7 — Social & Viral Element (optional)
 *
 * Usage:
 *   const demo = createInvestorDemoManager();
 *   const session = await demo.runFullDemo();
 *   console.log(session.summary);
 */

import type {
  InvestorDemoConfig,
  InvestorDemoService,
  InvestorDemoEvent,
  InvestorDemoEventCallback,
  DemoSession,
  DemoStep,
  DemoStepId,
  DemoStepStatus,
  AgentCreationResult,
  TelegramIntegrationResult,
  WalletCreationResult,
  StrategyActivationResult,
  LiveDashboardResult,
  DemoSummary,
} from './types';

import { defaultInvestorDemoConfig } from './types';

import {
  executeLandingStep,
  executeAgentCreationStep,
  executeTelegramIntegrationStep,
  executeWalletCreationStep,
  executeStrategyActivationStep,
  executeLiveDashboardStep,
  executeSocialViralStep,
} from './steps';

import { createDemoAgentManager } from '../demo-agent/agent';
import type { DemoAgentManager } from '../demo-agent/agent';

// ============================================================================
// Step Definitions (static metadata)
// ============================================================================

const STEP_DEFINITIONS: Omit<DemoStep, 'status' | 'result'>[] = [
  {
    id: 'landing',
    number: 1,
    title: 'Landing / Entry Point',
    description: 'User opens the platform with a clean, modern UX and clicks "Create Your AI Agent".',
  },
  {
    id: 'agent_creation',
    number: 2,
    title: 'Agent Creation Wizard',
    description: 'Step-by-step wizard to select strategy (DCA, Yield, Grid, Arbitrage) and AI provider (Groq, Anthropic, OpenAI, Google, xAI).',
  },
  {
    id: 'telegram_integration',
    number: 3,
    title: 'Telegram Integration',
    description: 'Automatically create Telegram bot via Telegram Bot API, assign to user, configure commands, connect Mini App.',
  },
  {
    id: 'wallet_creation',
    number: 4,
    title: 'TON Wallet Creation',
    description: 'Agent automatically gets a TON wallet with MPC key security, funding flow, and on-chain smart contract deployment.',
  },
  {
    id: 'strategy_activation',
    number: 5,
    title: 'Strategy Activation',
    description: 'Agent performs its first simulated trade — strategy action is visible in the UI with AI reasoning.',
  },
  {
    id: 'live_dashboard',
    number: 6,
    title: 'Live Dashboard',
    description: 'User sees agent status, transactions, performance metrics, execution logs, and wallet balance in real time.',
  },
  {
    id: 'social_viral',
    number: 7,
    title: 'Social & Viral Element',
    description: 'Share agent publicly, join the leaderboard, build reputation score, and invite others to copy the strategy.',
  },
];

// ============================================================================
// Session Factory
// ============================================================================

function createSession(config: InvestorDemoConfig): DemoSession {
  const sessionId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const steps: DemoStep[] = STEP_DEFINITIONS.map((def) => ({
    ...def,
    status: 'pending' as DemoStepStatus,
  }));

  return {
    sessionId,
    config,
    status: 'not_started',
    steps,
    currentStep: null,
  };
}

// ============================================================================
// Investor Demo Manager
// ============================================================================

/**
 * InvestorDemoManager orchestrates the full 7-step investor demo flow.
 */
export class InvestorDemoManager implements InvestorDemoService {
  private readonly sessions: Map<string, DemoSession> = new Map();
  private readonly agentManagers: Map<string, DemoAgentManager> = new Map();
  private readonly eventCallbacks: InvestorDemoEventCallback[] = [];

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start a new demo session with optional config overrides.
   */
  async startSession(config?: Partial<InvestorDemoConfig>): Promise<DemoSession> {
    const mergedConfig: InvestorDemoConfig = { ...defaultInvestorDemoConfig, ...config };
    const session = createSession(mergedConfig);
    const agentManager = createDemoAgentManager();

    this.sessions.set(session.sessionId, session);
    this.agentManagers.set(session.sessionId, agentManager);

    session.status = 'running';
    session.startedAt = new Date();

    this.emit({
      type: 'session_started',
      sessionId: session.sessionId,
      timestamp: new Date(),
      data: { config: mergedConfig },
    });

    return this.snapshotSession(session);
  }

  /**
   * Advance to the next pending step and execute it.
   */
  async nextStep(sessionId: string): Promise<DemoStep> {
    const session = this.getSession(sessionId);

    const nextStep = session.steps.find((s) => s.status === 'pending');
    if (!nextStep) {
      throw new Error(`No pending steps in session ${sessionId}. Demo is complete.`);
    }

    return this.executeStep(sessionId, nextStep.id);
  }

  /**
   * Execute a specific demo step by ID.
   */
  async executeStep(sessionId: string, stepId: DemoStepId): Promise<DemoStep> {
    const session = this.getSession(sessionId);
    const agentManager = this.getAgentManager(sessionId);

    const step = session.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Step '${stepId}' not found in session ${sessionId}.`);
    }

    // Mark step as in progress
    step.status = 'in_progress';
    step.startedAt = new Date();
    session.currentStep = stepId;

    this.emit({
      type: 'step_started',
      sessionId,
      stepId,
      timestamp: new Date(),
      data: { stepNumber: step.number, title: step.title },
    });

    try {
      await this.runStep(session, step, agentManager);

      const duration = step.startedAt
        ? Date.now() - step.startedAt.getTime()
        : 0;

      // runStep may have mutated step.status to 'skipped' — preserve that status.
      // Cast through unknown so TypeScript re-widens from the narrowed 'in_progress' type.
      const currentStatus = (step as unknown as { status: string }).status;
      if (currentStatus !== 'skipped') {
        step.status = 'completed';
      }
      step.completedAt = new Date();
      step.durationMs = duration;

      this.emit({
        type: 'step_completed',
        sessionId,
        stepId,
        timestamp: new Date(),
        data: { stepNumber: step.number, durationMs: duration, result: step.result },
      });

      // Check if all steps are done
      if (session.steps.every((s) => s.status === 'completed' || s.status === 'skipped')) {
        await this.finalizeSession(session);
      }

    } catch (err) {
      step.status = 'error';
      step.errorMessage = err instanceof Error ? err.message : String(err);
      session.status = 'failed';

      this.emit({
        type: 'step_failed',
        sessionId,
        stepId,
        timestamp: new Date(),
        data: { stepNumber: step.number, error: step.errorMessage },
      });

      throw err;
    }

    return { ...step };
  }

  /**
   * Get the current session state.
   */
  getSession(sessionId: string): DemoSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Demo session not found: ${sessionId}`);
    }
    return session;
  }

  /**
   * List all active sessions.
   */
  listSessions(): DemoSession[] {
    return Array.from(this.sessions.values()).map((s) => this.snapshotSession(s));
  }

  /**
   * Reset a session to the beginning (useful for replay).
   */
  async resetSession(sessionId: string): Promise<DemoSession> {
    const session = this.getSession(sessionId);
    const config = session.config;

    // Remove old session
    this.sessions.delete(sessionId);
    this.agentManagers.delete(sessionId);

    // Create a fresh session with the same config but a new ID
    const newSession = await this.startSession(config);

    this.emit({
      type: 'demo_reset',
      sessionId: newSession.sessionId,
      timestamp: new Date(),
      data: { previousSessionId: sessionId },
    });

    return newSession;
  }

  /**
   * Run the complete demo flow from start to finish.
   *
   * This is the primary method for investor presentations — runs all 7 steps
   * in sequence and returns the completed session with summary.
   */
  async runFullDemo(config?: Partial<InvestorDemoConfig>): Promise<DemoSession> {
    const sessionSnapshot = await this.startSession(config);
    const { sessionId } = sessionSnapshot;

    // Iterate step IDs from the definition order (snapshot has all 7 in correct order)
    for (const stepSnapshot of sessionSnapshot.steps) {
      await this.executeStep(sessionId, stepSnapshot.id);

      if (sessionSnapshot.config.autoAdvance && sessionSnapshot.config.autoAdvanceDelayMs > 0) {
        await delay(sessionSnapshot.config.autoAdvanceDelayMs);
      }
    }

    // Return the live session state (not the initial snapshot)
    return this.snapshotSession(this.getSession(sessionId));
  }

  /**
   * Subscribe to demo events.
   */
  onEvent(callback: InvestorDemoEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Step Execution Routing
  // ============================================================================

  private async runStep(
    session: DemoSession,
    step: DemoStep,
    agentManager: DemoAgentManager,
  ): Promise<void> {
    const { config } = session;

    switch (step.id) {
      case 'landing': {
        step.result = executeLandingStep(config, step);
        break;
      }

      case 'agent_creation': {
        step.result = await executeAgentCreationStep(config, session.sessionId, agentManager);
        break;
      }

      case 'telegram_integration': {
        const agentCreation = this.getStepResult<AgentCreationResult>(session, 'agent_creation');
        if (!config.telegramEnabled) {
          step.status = 'skipped';
          step.result = executeTelegramIntegrationStep(config, agentCreation);
          return;
        }
        step.result = executeTelegramIntegrationStep(config, agentCreation);
        break;
      }

      case 'wallet_creation': {
        const agentCreation = this.getStepResult<AgentCreationResult>(session, 'agent_creation');
        step.result = executeWalletCreationStep(agentCreation);
        break;
      }

      case 'strategy_activation': {
        const agentCreation = this.getStepResult<AgentCreationResult>(session, 'agent_creation');
        step.result = await executeStrategyActivationStep(agentCreation, agentManager);
        break;
      }

      case 'live_dashboard': {
        const agentCreation = this.getStepResult<AgentCreationResult>(session, 'agent_creation');
        const walletCreation = this.getStepResult<WalletCreationResult>(session, 'wallet_creation');
        step.result = executeLiveDashboardStep(agentCreation, walletCreation, agentManager);
        break;
      }

      case 'social_viral': {
        const agentCreation = this.getStepResult<AgentCreationResult>(session, 'agent_creation');
        if (!config.socialEnabled) {
          step.status = 'skipped';
          const dashboard = this.getStepResult<LiveDashboardResult>(session, 'live_dashboard');
          step.result = executeSocialViralStep(config, agentCreation, dashboard);
          return;
        }
        const dashboard = this.getStepResult<LiveDashboardResult>(session, 'live_dashboard');
        step.result = executeSocialViralStep(config, agentCreation, dashboard);
        break;
      }

      default: {
        throw new Error(`Unknown step ID: ${step.id}`);
      }
    }
  }

  // ============================================================================
  // Session Finalization
  // ============================================================================

  private async finalizeSession(session: DemoSession): Promise<void> {
    const endTime = Date.now();
    session.status = 'completed';
    session.completedAt = new Date();
    session.totalDurationMs = session.startedAt
      ? endTime - session.startedAt.getTime()
      : 0;
    session.currentStep = null;

    // Build summary
    try {
      session.summary = this.buildSummary(session);
    } catch {
      // Summary is optional — don't fail session completion
    }

    this.emit({
      type: 'session_completed',
      sessionId: session.sessionId,
      timestamp: new Date(),
      data: {
        totalDurationMs: session.totalDurationMs,
        summary: session.summary,
      },
    });
  }

  private buildSummary(session: DemoSession): DemoSummary {
    const agentCreation = this.getStepResult<AgentCreationResult>(session, 'agent_creation');
    const walletCreation = this.getStepResult<WalletCreationResult>(session, 'wallet_creation');
    const dashboard = this.getStepResult<LiveDashboardResult>(session, 'live_dashboard');
    const telegramStep = session.steps.find((s) => s.id === 'telegram_integration');
    const telegramResult = telegramStep?.result as TelegramIntegrationResult | undefined;
    const activationStep = session.steps.find((s) => s.id === 'strategy_activation');
    const strategyActivation = activationStep?.result as StrategyActivationResult | undefined;

    // Time from session start to live dashboard step completion
    const landingStep = session.steps.find((s) => s.id === 'landing');
    const dashboardStep = session.steps.find((s) => s.id === 'live_dashboard');
    const timeToLiveMs = (dashboardStep?.completedAt && landingStep?.startedAt)
      ? dashboardStep.completedAt.getTime() - landingStep.startedAt.getTime()
      : session.totalDurationMs ?? 0;

    const strategyNames: Record<string, string> = {
      dca: 'Dollar-Cost Averaging',
      yield: 'Yield Optimization',
      grid: 'Grid Trading',
      arbitrage: 'Cross-DEX Arbitrage',
    };

    void strategyActivation; // may be used in future enrichments

    return {
      timeToLiveMs,
      agentId: agentCreation.agentId,
      agentName: agentCreation.agentName,
      walletAddress: walletCreation.walletAddress,
      botUsername: telegramResult?.botUsername,
      roi: dashboard.roi,
      totalTrades: dashboard.totalTrades,
      strategyName: strategyNames[agentCreation.strategy] ?? agentCreation.strategy,
      aiProvider: agentCreation.aiProvider,
      valueProposition: 'AI-native autonomous finance — from zero to live agent in minutes.',
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getStepResult<T>(session: DemoSession, stepId: DemoStepId): T {
    const step = session.steps.find((s) => s.id === stepId);
    if (!step || !step.result) {
      throw new Error(`Step '${stepId}' has not been executed yet in session ${session.sessionId}.`);
    }
    return step.result as T;
  }

  private getAgentManager(sessionId: string): DemoAgentManager {
    const manager = this.agentManagers.get(sessionId);
    if (!manager) {
      throw new Error(`Agent manager not found for session ${sessionId}.`);
    }
    return manager;
  }

  private snapshotSession(session: DemoSession): DemoSession {
    return {
      ...session,
      steps: session.steps.map((s) => ({ ...s })),
    };
  }

  private emit(event: InvestorDemoEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new InvestorDemoManager instance.
 */
export function createInvestorDemoManager(): InvestorDemoManager {
  return new InvestorDemoManager();
}
