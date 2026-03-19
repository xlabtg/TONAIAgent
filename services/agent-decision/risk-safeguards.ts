/**
 * TONAIAgent — Autonomous Agent Risk Safeguards
 * Issue #269: Risk Engine Hardening & Capital Protection Layer
 *
 * Provides agent-level risk protection:
 *   - Stop agent if drawdown > limit
 *   - Stop agent if consecutive losses exceed threshold
 *   - Dynamically downgrade aggressiveness on high risk (aggressive → conservative)
 *   - Per-agent risk state tracking (consecutive losses, drawdown state)
 *
 * Integration:
 *   The AutonomousLoop calls AgentRiskSafeguards.evaluate() before every
 *   execution cycle. If the safeguard blocks execution, the loop skips the
 *   trade and records the reason.
 */

import type { AgentMode } from './index';

// ============================================================================
// Safeguard Configuration
// ============================================================================

export interface AgentRiskSafeguardConfig {
  /** Max drawdown (percent) before stopping the agent (e.g. 15) */
  maxDrawdownPercent: number;
  /** Number of consecutive losses before forcing conservative mode (e.g. 3) */
  consecutiveLossThreshold: number;
  /** Number of consecutive losses before stopping agent entirely (e.g. 5) */
  consecutiveLossStopThreshold: number;
  /** Drawdown above this (percent) triggers aggressive → conservative downgrade */
  aggressivenessDowngradeDrawdownPercent: number;
}

export const DEFAULT_AGENT_RISK_SAFEGUARD_CONFIG: AgentRiskSafeguardConfig = {
  maxDrawdownPercent: 15,
  consecutiveLossThreshold: 3,
  consecutiveLossStopThreshold: 5,
  aggressivenessDowngradeDrawdownPercent: 10,
};

// ============================================================================
// Safeguard Result
// ============================================================================

export type AgentSafeguardResult =
  | {
      blocked: false;
      /** Mode the agent should run in (may be downgraded from aggressive → conservative) */
      recommendedMode: AgentMode;
    }
  | {
      blocked: true;
      reason: 'DRAWDOWN_EXCEEDED' | 'CONSECUTIVE_LOSS_STOP' | 'CONSECUTIVE_LOSS_CONSERVATIVE';
      message: string;
      /** Mode recommended if the agent is allowed to resume */
      recommendedMode: AgentMode;
    };

// ============================================================================
// Per-Agent Risk State
// ============================================================================

interface AgentRiskState {
  consecutiveLosses: number;
  stopped: boolean;
  stoppedReason?: string;
  lastUpdated: Date;
}

// ============================================================================
// Agent Risk Safeguards
// ============================================================================

/**
 * Evaluates per-agent risk conditions and returns whether the agent
 * should execute the next cycle, and in which mode.
 */
export class AgentRiskSafeguards {
  private readonly config: AgentRiskSafeguardConfig;
  private readonly agentStates = new Map<string, AgentRiskState>();

  constructor(config: Partial<AgentRiskSafeguardConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_RISK_SAFEGUARD_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Main evaluation
  // --------------------------------------------------------------------------

  /**
   * Evaluate whether an agent should proceed with the next execution cycle.
   *
   * @param agentId         - agent identifier
   * @param drawdownPercent - current portfolio drawdown (0–100)
   * @param currentMode     - agent's current behavior mode
   */
  evaluate(
    agentId: string,
    drawdownPercent: number,
    currentMode: AgentMode
  ): AgentSafeguardResult {
    const state = this.getOrCreateState(agentId);

    // Check if agent was already stopped
    if (state.stopped) {
      return {
        blocked: true,
        reason: 'CONSECUTIVE_LOSS_STOP',
        message: state.stoppedReason ?? 'Agent stopped due to risk limits',
        recommendedMode: 'conservative',
      };
    }

    // 1. Drawdown exceeded → stop agent
    if (drawdownPercent >= this.config.maxDrawdownPercent) {
      const message = `Agent stopped: drawdown ${drawdownPercent.toFixed(2)}% ≥ max ${this.config.maxDrawdownPercent}%`;
      state.stopped = true;
      state.stoppedReason = message;
      state.lastUpdated = new Date();
      return {
        blocked: true,
        reason: 'DRAWDOWN_EXCEEDED',
        message,
        recommendedMode: 'conservative',
      };
    }

    // 2. Consecutive losses exceeded stop threshold → stop agent
    if (state.consecutiveLosses >= this.config.consecutiveLossStopThreshold) {
      const message = `Agent stopped: ${state.consecutiveLosses} consecutive losses ≥ stop threshold ${this.config.consecutiveLossStopThreshold}`;
      state.stopped = true;
      state.stoppedReason = message;
      state.lastUpdated = new Date();
      return {
        blocked: true,
        reason: 'CONSECUTIVE_LOSS_STOP',
        message,
        recommendedMode: 'conservative',
      };
    }

    // 3. High drawdown → downgrade aggressiveness
    let recommendedMode = currentMode;
    if (
      drawdownPercent >= this.config.aggressivenessDowngradeDrawdownPercent &&
      currentMode === 'aggressive'
    ) {
      recommendedMode = 'conservative';
    }

    // 4. Consecutive losses above threshold → force conservative mode
    if (state.consecutiveLosses >= this.config.consecutiveLossThreshold) {
      if (currentMode !== 'conservative') {
        recommendedMode = 'conservative';
        return {
          blocked: true,
          reason: 'CONSECUTIVE_LOSS_CONSERVATIVE',
          message: `${state.consecutiveLosses} consecutive losses: forcing conservative mode`,
          recommendedMode,
        };
      }
    }

    return { blocked: false, recommendedMode };
  }

  // --------------------------------------------------------------------------
  // Trade outcome recording
  // --------------------------------------------------------------------------

  /**
   * Record a trade result for an agent.
   * @param agentId - agent identifier
   * @param pnl     - trade PnL (negative = loss, positive = gain)
   */
  recordTradeResult(agentId: string, pnl: number): void {
    const state = this.getOrCreateState(agentId);
    if (pnl < 0) {
      state.consecutiveLosses += 1;
    } else {
      state.consecutiveLosses = 0; // reset on win
    }
    state.lastUpdated = new Date();
  }

  // --------------------------------------------------------------------------
  // Agent management
  // --------------------------------------------------------------------------

  /**
   * Resume a stopped agent (e.g. after human review or drawdown recovery).
   */
  resumeAgent(agentId: string): void {
    const state = this.agentStates.get(agentId);
    if (state) {
      state.stopped = false;
      state.stoppedReason = undefined;
      state.consecutiveLosses = 0;
      state.lastUpdated = new Date();
    }
  }

  /**
   * Reset consecutive loss counter (e.g. at start of new day).
   */
  resetConsecutiveLosses(agentId: string): void {
    const state = this.agentStates.get(agentId);
    if (state) {
      state.consecutiveLosses = 0;
      state.lastUpdated = new Date();
    }
  }

  /** Returns the current state for an agent, or undefined if not tracked. */
  getAgentState(agentId: string): Readonly<AgentRiskState> | undefined {
    return this.agentStates.get(agentId);
  }

  /** Returns all stopped agent IDs. */
  getStoppedAgents(): string[] {
    return Array.from(this.agentStates.entries())
      .filter(([, s]) => s.stopped)
      .map(([id]) => id);
  }

  /** Returns current config. */
  getConfig(): AgentRiskSafeguardConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private getOrCreateState(agentId: string): AgentRiskState {
    let state = this.agentStates.get(agentId);
    if (!state) {
      state = {
        consecutiveLosses: 0,
        stopped: false,
        lastUpdated: new Date(),
      };
      this.agentStates.set(agentId, state);
    }
    return state;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAgentRiskSafeguards(
  config?: Partial<AgentRiskSafeguardConfig>
): AgentRiskSafeguards {
  return new AgentRiskSafeguards(config);
}

export default AgentRiskSafeguards;
