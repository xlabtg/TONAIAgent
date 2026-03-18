/**
 * TONAIAgent — Autonomous Agent Loop (Issue #261)
 *
 * Each agent runs a continuous cycle:
 *   analyze → decide → execute → evaluate → repeat
 *
 * This module is intentionally runtime-agnostic: the `execute` and `fetchMetrics`
 * callbacks are supplied by the caller so the loop can be used in Node.js,
 * serverless, or simulation environments without modification.
 */

import type { AgentGoal, GoalProgress } from '../../core/agent/goals';
import type { AgentStrategy } from '../../core/agent/index';
import type { AgentMetrics, DecisionResult } from './index';
import { AgentDecisionEngine } from './index';
import type { AgentMode, SafeguardConfig } from './index';

// ============================================================================
// Cycle Callbacks
// ============================================================================

/**
 * Fetches the current real-time metrics for an agent.
 * Implementors should query the analytics service and portfolio state.
 */
export type FetchMetricsFn = (agentId: string) => AgentMetrics | Promise<AgentMetrics>;

/**
 * Executes a trading cycle using the selected strategy and params.
 * Returns `true` on success, `false` if the execution was skipped/failed.
 */
export type ExecuteFn = (
  agentId: string,
  strategy: AgentStrategy,
  params: Record<string, number | string | boolean>,
) => boolean | Promise<boolean>;

/**
 * Optional callback invoked after each full cycle for observability.
 */
export type OnCycleCompleteFn = (
  agentId: string,
  decision: DecisionResult,
  cycleIndex: number,
) => void | Promise<void>;

// ============================================================================
// Loop Configuration
// ============================================================================

export interface AutonomousLoopConfig {
  /** Goal the agent is pursuing. */
  goal: AgentGoal;
  /** Initial strategy to run before the first decision cycle. */
  initialStrategy: AgentStrategy;
  /** Behavior mode applied throughout the loop. */
  mode?: AgentMode;
  /** Safeguard configuration forwarded to the decision engine. */
  safeguards?: Partial<SafeguardConfig>;
  /**
   * Interval between cycles in milliseconds.
   * Default: 5000 (5 seconds).
   * Set to 0 to run cycles back-to-back (simulation mode).
   */
  intervalMs?: number;
  /**
   * Maximum number of cycles to run before stopping automatically.
   * Undefined = run indefinitely until `stop()` is called.
   */
  maxCycles?: number;
}

// ============================================================================
// Loop Result
// ============================================================================

/** Summary returned when the loop stops. */
export interface LoopSummary {
  agentId: string;
  cyclesCompleted: number;
  finalStrategy: AgentStrategy;
  finalGoalProgress: GoalProgress | null;
  stoppedAt: string;
}

// ============================================================================
// Autonomous Loop
// ============================================================================

/**
 * Manages the analyze → decide → execute → evaluate → repeat cycle for one
 * agent.
 *
 * Usage:
 * ```ts
 * const loop = new AutonomousLoop('agent-1', config, fetchMetrics, execute);
 * loop.start();
 * // ...
 * const summary = await loop.stop();
 * ```
 */
export class AutonomousLoop {
  private readonly agentId: string;
  private readonly config: Required<AutonomousLoopConfig>;
  private readonly fetchMetrics: FetchMetricsFn;
  private readonly execute: ExecuteFn;
  private readonly onCycleComplete?: OnCycleCompleteFn;
  private readonly engine: AgentDecisionEngine;

  private running = false;
  /** Set to true by stop() to break out of an infinite loop early. */
  private aborted = false;
  private cycleIndex = 0;
  private currentStrategy: AgentStrategy;
  private lastDecision: DecisionResult | null = null;
  /** Promise that resolves when _runLoop() finishes. */
  private loopDone: Promise<void> | null = null;

  constructor(
    agentId: string,
    config: AutonomousLoopConfig,
    fetchMetrics: FetchMetricsFn,
    execute: ExecuteFn,
    onCycleComplete?: OnCycleCompleteFn,
  ) {
    this.agentId = agentId;
    this.config = {
      goal: config.goal,
      initialStrategy: config.initialStrategy,
      mode: config.mode ?? 'balanced',
      safeguards: config.safeguards ?? {},
      intervalMs: config.intervalMs ?? 5000,
      maxCycles: config.maxCycles ?? Infinity,
    };
    this.fetchMetrics = fetchMetrics;
    this.execute = execute;
    this.onCycleComplete = onCycleComplete;
    this.currentStrategy = config.initialStrategy;
    this.engine = new AgentDecisionEngine({
      mode: this.config.mode,
      safeguards: this.config.safeguards,
    });
  }

  // --------------------------------------------------------------------------
  // Control
  // --------------------------------------------------------------------------

  /**
   * Start the autonomous loop.  Returns immediately; cycles run asynchronously.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.aborted = false;
    this.loopDone = this._runLoop();
  }

  /**
   * Stop the loop after the current cycle completes.
   * For infinite loops (`maxCycles` unset) this signals an early exit.
   * For finite loops, prefer `waitForCompletion()` to let all cycles finish.
   * Returns a summary of the run.
   */
  async stop(): Promise<LoopSummary> {
    // Signal the loop to exit after the current cycle
    this.aborted = true;
    // Wait for the loop coroutine to actually finish
    if (this.loopDone) {
      await this.loopDone;
    }
    return this._buildSummary();
  }

  /**
   * Wait for the loop to complete all its cycles naturally (without aborting).
   * Useful in tests and finite-cycle scenarios.
   * Returns a summary of the run.
   */
  async waitForCompletion(): Promise<LoopSummary> {
    if (this.loopDone) {
      await this.loopDone;
    }
    return this._buildSummary();
  }

  /** Whether the loop is currently active. */
  isRunning(): boolean {
    return this.running;
  }

  /** Number of cycles completed so far. */
  getCycleCount(): number {
    return this.cycleIndex;
  }

  /** Last decision made by the decision engine. */
  getLastDecision(): DecisionResult | null {
    return this.lastDecision;
  }

  // --------------------------------------------------------------------------
  // Core Loop
  // --------------------------------------------------------------------------

  private async _runLoop(): Promise<void> {
    while (!this.aborted && this.cycleIndex < this.config.maxCycles) {
      await this._runCycle();

      // Wait for next interval unless immediate (simulation mode)
      if (this.config.intervalMs > 0 && !this.aborted) {
        await this._sleep(this.config.intervalMs);
      }
    }

    this.running = false;
  }

  private async _runCycle(): Promise<void> {
    // Step 1 — Analyze: fetch current metrics
    const metrics = await this.fetchMetrics(this.agentId);

    // Step 2 — Decide: run the decision engine
    const decision = this.engine.decide(
      this.agentId,
      this.config.goal,
      metrics,
      this.currentStrategy,
    );
    this.lastDecision = decision;

    // Step 3 — Execute: run strategy if not blocked by safeguards
    if (decision.shouldExecute) {
      await this.execute(this.agentId, decision.strategy, decision.params);
    }

    // Step 4 — Evaluate: update current strategy for next cycle
    this.currentStrategy = decision.strategy;

    // Notify observers
    if (this.onCycleComplete) {
      await this.onCycleComplete(this.agentId, decision, this.cycleIndex);
    }

    this.cycleIndex += 1;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private _buildSummary(): LoopSummary {
    return {
      agentId: this.agentId,
      cyclesCompleted: this.cycleIndex,
      finalStrategy: this.currentStrategy,
      finalGoalProgress: this.lastDecision?.goalProgress ?? null,
      stoppedAt: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAutonomousLoop(
  agentId: string,
  config: AutonomousLoopConfig,
  fetchMetrics: FetchMetricsFn,
  execute: ExecuteFn,
  onCycleComplete?: OnCycleCompleteFn,
): AutonomousLoop {
  return new AutonomousLoop(agentId, config, fetchMetrics, execute, onCycleComplete);
}
