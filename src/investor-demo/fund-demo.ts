/**
 * TONAIAgent - Fund Investor Demo Orchestrator (Issue #153)
 *
 * Orchestrates the six-stage Investor Demo Flow that demonstrates the full
 * lifecycle of the AI Fund Management platform.
 *
 * Flow:
 *   Stage 1 — Strategy Discovery   : Browse strategies in the Strategy Marketplace
 *   Stage 2 — AI Fund Creation     : Configure fund with strategies and capital
 *   Stage 3 — Agent Deployment     : Launch strategy agents via AI Fund Manager
 *   Stage 4 — Live Execution       : Simulate market events and trading activity
 *   Stage 5 — Performance Monitor  : Dashboard with portfolio value and P&L
 *   Stage 6 — Rebalancing Demo     : Automatic portfolio rebalancing
 *
 * Usage:
 *   const demo = createFundInvestorDemoManager();
 *   const session = await demo.runFullDemo();
 *   console.log(session.summary);
 */

import type {
  FundInvestorDemoConfig,
  FundInvestorDemoService,
  FundDemoEvent,
  FundDemoEventCallback,
  FundDemoSession,
  FundDemoStage,
  FundDemoStageId,
  FundDemoStageStatus,
  FundCreationResult,
  AgentDeploymentResult,
  LiveExecutionResult,
  PerformanceMonitoringResult,
  FundDemoSummary,
} from './fund-demo-types';

import { defaultFundInvestorDemoConfig } from './fund-demo-types';

import {
  executeStrategyDiscoveryStage,
  executeFundCreationStage,
  executeAgentDeploymentStage,
  executeLiveExecutionStage,
  executePerformanceMonitoringStage,
  executeRebalancingStage,
} from './fund-demo-steps';

// ============================================================================
// Stage Definitions (static metadata)
// ============================================================================

const STAGE_DEFINITIONS: Omit<FundDemoStage, 'status' | 'result'>[] = [
  {
    id: 'strategy_discovery',
    number: 1,
    title: 'Strategy Discovery',
    description:
      'Browse strategies in the Strategy Marketplace. Review key information: name, creator, performance metrics, risk level. Select strategies for the fund.',
  },
  {
    id: 'fund_creation',
    number: 2,
    title: 'AI Fund Creation',
    description:
      'Create a fund with selected strategies, allocation percentages, and initial capital. The AI Fund Manager automatically deploys the fund.',
  },
  {
    id: 'agent_deployment',
    number: 3,
    title: 'Agent Deployment',
    description:
      'Strategy agents are launched, capital is allocated, and the Production Agent Runtime begins execution. Flow: Investor → AI Fund Manager → Agent Runtime → Strategy Agents.',
  },
  {
    id: 'live_execution',
    number: 4,
    title: 'Live Execution Simulation',
    description:
      'Simulates market events, trading activity, and portfolio updates. Displays executed trades, capital allocation changes, and strategy performance.',
  },
  {
    id: 'performance_monitoring',
    number: 5,
    title: 'Performance Monitoring',
    description:
      'Investor dashboard showing portfolio value, strategy performance, allocation breakdown, and profit and loss.',
  },
  {
    id: 'rebalancing',
    number: 6,
    title: 'Rebalancing Demonstration',
    description:
      'Shows automatic portfolio rebalancing, adjustment of strategy allocations, and updated risk exposure — highlighting autonomous management capability.',
  },
];

// ============================================================================
// Session Factory
// ============================================================================

function createFundDemoSession(config: FundInvestorDemoConfig): FundDemoSession {
  const sessionId = `fund_demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const stages: FundDemoStage[] = STAGE_DEFINITIONS.map((def) => ({
    ...def,
    status: 'pending' as FundDemoStageStatus,
  }));

  return {
    sessionId,
    config,
    status: 'not_started',
    stages,
    currentStage: null,
  };
}

// ============================================================================
// Fund Investor Demo Manager
// ============================================================================

/**
 * FundInvestorDemoManager orchestrates the full 6-stage Investor Demo Flow.
 *
 * Designed for investor presentations, fundraising, partnership discussions,
 * community onboarding, and product demonstrations.
 */
export class FundInvestorDemoManager implements FundInvestorDemoService {
  private readonly sessions: Map<string, FundDemoSession> = new Map();
  private readonly eventCallbacks: FundDemoEventCallback[] = [];

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start a new fund demo session with optional config overrides.
   */
  async startSession(config?: Partial<FundInvestorDemoConfig>): Promise<FundDemoSession> {
    const mergedConfig: FundInvestorDemoConfig = {
      ...defaultFundInvestorDemoConfig,
      ...config,
      // Preserve nested defaults for strategies when not overridden
      strategies: config?.strategies ?? defaultFundInvestorDemoConfig.strategies,
    };

    const session = createFundDemoSession(mergedConfig);
    this.sessions.set(session.sessionId, session);

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
   * Advance to the next pending stage and execute it.
   */
  async nextStage(sessionId: string): Promise<FundDemoStage> {
    const session = this.getSession(sessionId);

    const nextStage = session.stages.find((s) => s.status === 'pending');
    if (!nextStage) {
      throw new Error(`No pending stages in session ${sessionId}. Demo is complete.`);
    }

    return this.executeStage(sessionId, nextStage.id);
  }

  /**
   * Execute a specific demo stage by ID.
   */
  async executeStage(sessionId: string, stageId: FundDemoStageId): Promise<FundDemoStage> {
    const session = this.getSession(sessionId);

    const stage = session.stages.find((s) => s.id === stageId);
    if (!stage) {
      throw new Error(`Stage '${stageId}' not found in session ${sessionId}.`);
    }

    // Mark stage as in progress
    stage.status = 'in_progress';
    stage.startedAt = new Date();
    session.currentStage = stageId;

    this.emit({
      type: 'stage_started',
      sessionId,
      stageId,
      timestamp: new Date(),
      data: { stageNumber: stage.number, title: stage.title },
    });

    try {
      await this.runStage(session, stage);

      const duration = stage.startedAt ? Date.now() - stage.startedAt.getTime() : 0;

      // runStage may have set status to 'skipped' — preserve that
      const currentStatus = (stage as unknown as { status: string }).status;
      if (currentStatus !== 'skipped') {
        stage.status = 'completed';
      }
      stage.completedAt = new Date();
      stage.durationMs = duration;

      this.emit({
        type: 'stage_completed',
        sessionId,
        stageId,
        timestamp: new Date(),
        data: { stageNumber: stage.number, durationMs: duration, result: stage.result },
      });

      // Check if all stages are done
      if (session.stages.every((s) => s.status === 'completed' || s.status === 'skipped')) {
        await this.finalizeSession(session);
      }

    } catch (err) {
      stage.status = 'error';
      stage.errorMessage = err instanceof Error ? err.message : String(err);
      session.status = 'failed';

      this.emit({
        type: 'stage_failed',
        sessionId,
        stageId,
        timestamp: new Date(),
        data: { stageNumber: stage.number, error: stage.errorMessage },
      });

      throw err;
    }

    return { ...stage };
  }

  /**
   * Get the current session state.
   */
  getSession(sessionId: string): FundDemoSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Fund demo session not found: ${sessionId}`);
    }
    return session;
  }

  /**
   * List all sessions.
   */
  listSessions(): FundDemoSession[] {
    return Array.from(this.sessions.values()).map((s) => this.snapshotSession(s));
  }

  /**
   * Reset a session to the beginning (useful for replay).
   */
  async resetSession(sessionId: string): Promise<FundDemoSession> {
    const session = this.getSession(sessionId);
    const config = session.config;

    this.sessions.delete(sessionId);

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
   * Run the complete 6-stage demo flow from start to finish.
   *
   * This is the primary method for investor presentations.
   */
  async runFullDemo(config?: Partial<FundInvestorDemoConfig>): Promise<FundDemoSession> {
    const sessionSnapshot = await this.startSession(config);
    const { sessionId } = sessionSnapshot;

    for (const stageSnapshot of sessionSnapshot.stages) {
      await this.executeStage(sessionId, stageSnapshot.id);

      if (sessionSnapshot.config.autoAdvance && sessionSnapshot.config.autoAdvanceDelayMs > 0) {
        await delay(sessionSnapshot.config.autoAdvanceDelayMs);
      }
    }

    return this.snapshotSession(this.getSession(sessionId));
  }

  /**
   * Subscribe to demo events.
   */
  onEvent(callback: FundDemoEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Stage Execution Routing
  // ============================================================================

  private async runStage(session: FundDemoSession, stage: FundDemoStage): Promise<void> {
    const { config } = session;

    switch (stage.id) {
      case 'strategy_discovery': {
        stage.result = executeStrategyDiscoveryStage(config);
        break;
      }

      case 'fund_creation': {
        stage.result = executeFundCreationStage(config);
        break;
      }

      case 'agent_deployment': {
        const fundCreation = this.getStageResult<FundCreationResult>(session, 'fund_creation');
        stage.result = executeAgentDeploymentStage(fundCreation, config);
        break;
      }

      case 'live_execution': {
        const agentDeployment = this.getStageResult<AgentDeploymentResult>(session, 'agent_deployment');
        stage.result = executeLiveExecutionStage(agentDeployment, config);
        break;
      }

      case 'performance_monitoring': {
        const fundCreation = this.getStageResult<FundCreationResult>(session, 'fund_creation');
        const agentDeployment = this.getStageResult<AgentDeploymentResult>(session, 'agent_deployment');
        const liveExecution = this.getStageResult<LiveExecutionResult>(session, 'live_execution');
        stage.result = executePerformanceMonitoringStage(fundCreation, agentDeployment, liveExecution);
        break;
      }

      case 'rebalancing': {
        const performanceMonitoring = this.getStageResult<PerformanceMonitoringResult>(session, 'performance_monitoring');
        if (!config.includeRebalancing) {
          stage.status = 'skipped';
          stage.result = executeRebalancingStage(performanceMonitoring, config);
          return;
        }
        stage.result = executeRebalancingStage(performanceMonitoring, config);
        break;
      }

      default: {
        throw new Error(`Unknown stage ID: ${stage.id}`);
      }
    }
  }

  // ============================================================================
  // Session Finalization
  // ============================================================================

  private async finalizeSession(session: FundDemoSession): Promise<void> {
    const endTime = Date.now();
    session.status = 'completed';
    session.completedAt = new Date();
    session.totalDurationMs = session.startedAt ? endTime - session.startedAt.getTime() : 0;
    session.currentStage = null;

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

  private buildSummary(session: FundDemoSession): FundDemoSummary {
    const fundCreation = this.getStageResult<FundCreationResult>(session, 'fund_creation');
    const agentDeployment = this.getStageResult<AgentDeploymentResult>(session, 'agent_deployment');
    const perfMonitoring = this.getStageResult<PerformanceMonitoringResult>(session, 'performance_monitoring');
    const liveExecution = this.getStageResult<LiveExecutionResult>(session, 'live_execution');

    const rebalancingStage = session.stages.find((s) => s.id === 'rebalancing');
    const rebalancingDemonstrated =
      rebalancingStage?.status === 'completed' && session.config.includeRebalancing;

    return {
      fundId: fundCreation.fundId,
      fundName: fundCreation.fundName,
      initialCapitalUsd: fundCreation.capitalUsd,
      finalValueUsd: perfMonitoring.currentValueUsd,
      totalReturnPercent: perfMonitoring.totalReturnPercent,
      totalPnlUsd: perfMonitoring.totalPnlUsd,
      agentCount: agentDeployment.agentCount,
      totalTrades: liveExecution.tradesExecuted.length,
      rebalancingDemonstrated,
      demoDurationMs: session.totalDurationMs ?? 0,
      valueProposition:
        'From strategy discovery to live AI-managed fund in minutes — autonomous, transparent, institutional-grade.',
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getStageResult<T>(session: FundDemoSession, stageId: FundDemoStageId): T {
    const stage = session.stages.find((s) => s.id === stageId);
    if (!stage || !stage.result) {
      throw new Error(
        `Stage '${stageId}' has not been executed yet in session ${session.sessionId}.`,
      );
    }
    return stage.result as T;
  }

  private snapshotSession(session: FundDemoSession): FundDemoSession {
    return {
      ...session,
      stages: session.stages.map((s) => ({ ...s })),
    };
  }

  private emit(event: FundDemoEvent): void {
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
 * Create a new FundInvestorDemoManager instance.
 *
 * @example
 * ```typescript
 * import { createFundInvestorDemoManager } from '@tonaiagent/core/investor-demo';
 *
 * const demo = createFundInvestorDemoManager();
 *
 * const session = await demo.runFullDemo({
 *   fundName: 'My AI Fund',
 *   fundCapitalUsd: 100_000,
 * });
 *
 * console.log('Fund ID:', session.summary?.fundId);
 * console.log('Return:', session.summary?.totalReturnPercent + '%');
 * ```
 */
export function createFundInvestorDemoManager(): FundInvestorDemoManager {
  return new FundInvestorDemoManager();
}
