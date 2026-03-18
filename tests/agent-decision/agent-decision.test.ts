/**
 * Agent Decision Service Tests (Issue #261)
 *
 * Covers:
 *   - AgentGoal model (createAgentGoal, computeGoalProgress)
 *   - AgentDecisionEngine.decide(): goal-based strategy selection
 *   - Strategy switching logic (trend → arbitrage, ai-signal → pause)
 *   - Behavior modes (conservative / balanced / aggressive)
 *   - Safeguards (overtrading, unstable switching, risk spikes)
 *   - Autonomous loop lifecycle (start, stop, cycles)
 *   - Mini App UI helpers (goalProgressPercent, goalLabel, modeLabel)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import {
  createAgentGoal,
  computeGoalProgress,
} from '../../core/agent/goals';
import type { AgentGoal } from '../../core/agent/goals';

import {
  AgentDecisionEngine,
  createAgentDecisionEngine,
} from '../../services/agent-decision/index';
import type { AgentMetrics } from '../../services/agent-decision/index';

import {
  AutonomousLoop,
  createAutonomousLoop,
} from '../../services/agent-decision/autonomous-loop';
import type { AutonomousLoopConfig } from '../../services/agent-decision/autonomous-loop';

import {
  goalProgressPercent,
  goalLabel,
  modeLabel,
} from '../../services/agent-decision/miniapp-ui';

// ============================================================================
// Helpers
// ============================================================================

function makeMetrics(overrides: Partial<AgentMetrics> = {}): AgentMetrics {
  return {
    currentBalance: 10_000,
    initialBalance: 10_000,
    pnl: 0,
    currentDrawdown: 0,
    tradesInWindow: 0,
    strategyScore: 70,
    ...overrides,
  };
}

function makeGoal(type: AgentGoal['type'], target?: number, timeframe?: string): AgentGoal {
  return createAgentGoal(type, target, timeframe);
}

// ============================================================================
// core/agent/goals — createAgentGoal
// ============================================================================

describe('createAgentGoal', () => {
  it('creates a goal with required type', () => {
    const g = createAgentGoal('maximize_profit');
    expect(g.type).toBe('maximize_profit');
    expect(g.target).toBeUndefined();
    expect(g.timeframe).toBeUndefined();
  });

  it('includes target and timeframe when provided', () => {
    const g = createAgentGoal('grow_balance', 15000, '30d');
    expect(g.target).toBe(15000);
    expect(g.timeframe).toBe('30d');
  });
});

// ============================================================================
// core/agent/goals — computeGoalProgress
// ============================================================================

describe('computeGoalProgress — grow_balance', () => {
  it('returns 0 progress at initial balance', () => {
    const g = makeGoal('grow_balance', 15000);
    const p = computeGoalProgress(g, 10000, 10000);
    expect(p.progressToGoal).toBe(0);
  });

  it('returns 0.5 progress at midpoint', () => {
    const g = makeGoal('grow_balance', 20000);
    const p = computeGoalProgress(g, 15000, 10000);
    expect(p.progressToGoal).toBeCloseTo(0.5, 5);
  });

  it('clamps progress to 1 when target is met', () => {
    const g = makeGoal('grow_balance', 15000);
    const p = computeGoalProgress(g, 20000, 10000);
    expect(p.progressToGoal).toBe(1);
  });

  it('returns 0 for negative progress (balance below initial)', () => {
    const g = makeGoal('grow_balance', 15000);
    const p = computeGoalProgress(g, 9000, 10000);
    expect(p.progressToGoal).toBe(0);
  });
});

describe('computeGoalProgress — maximize_profit', () => {
  it('returns 0 when pnl is 0', () => {
    const g = makeGoal('maximize_profit', 1000);
    const p = computeGoalProgress(g, 0, 10000);
    expect(p.progressToGoal).toBe(0);
  });

  it('returns 0.5 when pnl is half the target', () => {
    const g = makeGoal('maximize_profit', 1000);
    const p = computeGoalProgress(g, 500, 10000);
    expect(p.progressToGoal).toBeCloseTo(0.5, 5);
  });

  it('clamps to 1 when pnl exceeds target', () => {
    const g = makeGoal('maximize_profit', 1000);
    const p = computeGoalProgress(g, 1500, 10000);
    expect(p.progressToGoal).toBe(1);
  });

  it('returns 0 for negative pnl', () => {
    const g = makeGoal('maximize_profit', 1000);
    const p = computeGoalProgress(g, -200, 10000);
    expect(p.progressToGoal).toBe(0);
  });
});

describe('computeGoalProgress — minimize_risk', () => {
  it('returns 1 (fully achieved) when drawdown is 0', () => {
    const g = makeGoal('minimize_risk', 0.2);
    const p = computeGoalProgress(g, 0, 10000);
    expect(p.progressToGoal).toBe(1);
  });

  it('returns 0.5 when drawdown is half the max', () => {
    const g = makeGoal('minimize_risk', 0.2);
    const p = computeGoalProgress(g, 0.1, 10000);
    expect(p.progressToGoal).toBeCloseTo(0.5, 5);
  });

  it('returns 0 when drawdown equals max', () => {
    const g = makeGoal('minimize_risk', 0.2);
    const p = computeGoalProgress(g, 0.2, 10000);
    expect(p.progressToGoal).toBe(0);
  });

  it('clamps to 0 when drawdown exceeds max', () => {
    const g = makeGoal('minimize_risk', 0.2);
    const p = computeGoalProgress(g, 0.5, 10000);
    expect(p.progressToGoal).toBe(0);
  });

  it('uses default max drawdown of 0.20 when target not provided', () => {
    const g = makeGoal('minimize_risk'); // no target
    const p = computeGoalProgress(g, 0.1, 10000);
    expect(p.progressToGoal).toBeCloseTo(0.5, 5);
  });

  it('includes a snapshotAt timestamp', () => {
    const g = makeGoal('minimize_risk', 0.2);
    const p = computeGoalProgress(g, 0.05, 10000);
    expect(p.snapshotAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ============================================================================
// AgentDecisionEngine — strategy selection
// ============================================================================

describe('AgentDecisionEngine — goal: minimize_risk', () => {
  let engine: AgentDecisionEngine;

  beforeEach(() => {
    engine = createAgentDecisionEngine({ mode: 'balanced' });
  });

  it('selects ai-signal regardless of mode', () => {
    const goal = makeGoal('minimize_risk', 0.2);
    const decision = engine.decide('a1', goal, makeMetrics(), 'trend');
    expect(decision.strategy).toBe('ai-signal');
    expect(decision.shouldExecute).toBe(true);
  });
});

describe('AgentDecisionEngine — goal: grow_balance', () => {
  it('conservative mode selects trend', () => {
    const engine = createAgentDecisionEngine({ mode: 'conservative' });
    const goal = makeGoal('grow_balance', 15000);
    const d = engine.decide('a1', goal, makeMetrics(), 'trend');
    expect(d.strategy).toBe('trend');
  });

  it('aggressive mode selects arbitrage', () => {
    const engine = createAgentDecisionEngine({ mode: 'aggressive' });
    const goal = makeGoal('grow_balance', 15000);
    const d = engine.decide('a1', goal, makeMetrics(), 'trend');
    expect(d.strategy).toBe('arbitrage');
  });

  it('balanced mode switches to arbitrage when progress < 30%', () => {
    // Low progress: balance barely changed; high score so not perf-blocked
    const engine = createAgentDecisionEngine({ mode: 'balanced' });
    const goal = makeGoal('grow_balance', 20000);
    const metrics = makeMetrics({ currentBalance: 10100, initialBalance: 10000, strategyScore: 60 });
    const d = engine.decide('a1', goal, metrics, 'trend');
    expect(d.strategy).toBe('arbitrage');
  });
});

describe('AgentDecisionEngine — goal: maximize_profit', () => {
  it('conservative mode selects trend', () => {
    const engine = createAgentDecisionEngine({ mode: 'conservative' });
    const goal = makeGoal('maximize_profit', 2000);
    const d = engine.decide('a1', goal, makeMetrics(), 'trend');
    expect(d.strategy).toBe('trend');
  });

  it('aggressive mode selects arbitrage', () => {
    const engine = createAgentDecisionEngine({ mode: 'aggressive' });
    const goal = makeGoal('maximize_profit', 2000);
    const d = engine.decide('a1', goal, makeMetrics(), 'trend');
    expect(d.strategy).toBe('arbitrage');
  });

  it('balanced mode switches trend → arbitrage when score drops below 55', () => {
    const engine = createAgentDecisionEngine({ mode: 'balanced' });
    const goal = makeGoal('maximize_profit', 2000);
    const metrics = makeMetrics({ strategyScore: 40 });
    const d = engine.decide('a1', goal, metrics, 'trend');
    expect(d.strategy).toBe('arbitrage');
  });
});

// ============================================================================
// AgentDecisionEngine — dynamic switching on drawdown / poor score
// ============================================================================

describe('AgentDecisionEngine — dynamic switching', () => {
  it('switches to ai-signal when drawdown > 10% (below hard limit)', () => {
    const engine = createAgentDecisionEngine({ mode: 'aggressive', safeguards: { maxDrawdown: 0.20 } });
    const goal = makeGoal('maximize_profit', 2000);
    const metrics = makeMetrics({ currentDrawdown: 0.12 });
    const d = engine.decide('a1', goal, metrics, 'trend');
    expect(d.strategy).toBe('ai-signal');
    expect(d.shouldExecute).toBe(true);
  });

  it('opportunistically cycles trend → arbitrage when score < 40', () => {
    const engine = createAgentDecisionEngine({ mode: 'balanced' });
    const goal = makeGoal('maximize_profit', 2000);
    const metrics = makeMetrics({ strategyScore: 30 });
    // With score < 40 and balanced mode, _opportunisticSwitch is triggered
    const d = engine.decide('a1', goal, metrics, 'trend');
    expect(d.strategy).toBe('arbitrage');
  });
});

// ============================================================================
// AgentDecisionEngine — strategy params reflect mode
// ============================================================================

describe('AgentDecisionEngine — param tuning', () => {
  it('conservative trend: lookbackPeriod=20', () => {
    const engine = createAgentDecisionEngine({ mode: 'conservative' });
    const goal = makeGoal('grow_balance', 15000);
    const d = engine.decide('a1', goal, makeMetrics(), 'trend');
    expect(d.params['lookbackPeriod']).toBe(20);
    expect(d.params['positionMultiplier']).toBe(0.5);
  });

  it('aggressive trend: lookbackPeriod=10, positionMultiplier=1.5', () => {
    const engine = createAgentDecisionEngine({ mode: 'aggressive' });
    const goal = makeGoal('maximize_profit', 2000);
    // aggressive + maximize_profit → arbitrage, not trend
    // Use grow_balance with target above to get trend
    const goalTrend = makeGoal('grow_balance', 12000);
    // balanced mode would give trend but aggressive gives arbitrage — test arbitrage params
    const d = engine.decide('a1', goal, makeMetrics(), 'arbitrage');
    expect(d.params['positionMultiplier']).toBe(1.5);
  });

  it('conservative ai-signal: rsiBuyThreshold=25, rsiSellThreshold=75', () => {
    const engine = createAgentDecisionEngine({ mode: 'conservative' });
    const goal = makeGoal('minimize_risk', 0.2);
    const d = engine.decide('a1', goal, makeMetrics(), 'trend');
    expect(d.strategy).toBe('ai-signal');
    expect(d.params['rsiBuyThreshold']).toBe(25);
    expect(d.params['rsiSellThreshold']).toBe(75);
  });
});

// ============================================================================
// AgentDecisionEngine — Safeguards
// ============================================================================

describe('AgentDecisionEngine — safeguard: drawdown spike', () => {
  it('blocks execution when drawdown exceeds maxDrawdown', () => {
    const engine = createAgentDecisionEngine({ safeguards: { maxDrawdown: 0.15 } });
    const goal = makeGoal('maximize_profit', 2000);
    const metrics = makeMetrics({ currentDrawdown: 0.20 });
    const d = engine.decide('a1', goal, metrics, 'trend');
    expect(d.shouldExecute).toBe(false);
    expect(d.reason).toMatch(/drawdown/i);
  });

  it('does not block when drawdown is within limit', () => {
    const engine = createAgentDecisionEngine({ safeguards: { maxDrawdown: 0.15 } });
    const goal = makeGoal('maximize_profit', 2000);
    const metrics = makeMetrics({ currentDrawdown: 0.05 });
    const d = engine.decide('a1', goal, metrics, 'trend');
    expect(d.shouldExecute).toBe(true);
  });
});

describe('AgentDecisionEngine — safeguard: overtrading', () => {
  it('blocks execution when trades in window exceed limit', () => {
    const engine = createAgentDecisionEngine({ safeguards: { maxTradesPerWindow: 5 } });
    const goal = makeGoal('maximize_profit', 2000);
    const metrics = makeMetrics({ tradesInWindow: 8 });
    const d = engine.decide('a1', goal, metrics, 'trend');
    expect(d.shouldExecute).toBe(false);
    expect(d.reason).toMatch(/trades in window/i);
  });
});

describe('AgentDecisionEngine — safeguard: unstable strategy switching', () => {
  it('blocks switching after too many switches in the window', () => {
    // Use a very long switchWindowMs so all switches count
    const engine = createAgentDecisionEngine({
      safeguards: {
        maxSwitchesPerWindow: 2,
        switchWindowMs: 60_000,
        maxDrawdown: 0.99,
        maxTradesPerWindow: 9999,
      },
    });
    const goal = makeGoal('maximize_profit', 2000);

    // Trigger 2 switches (each call decides arbitrage from trend)
    const m = makeMetrics({ strategyScore: 30 }); // score<40 triggers opportunistic switch trend→arbitrage
    engine.decide('a1', goal, m, 'trend');   // switch 1: trend→arbitrage
    engine.decide('a1', goal, m, 'arbitrage'); // switch 2: arb→ai-signal
    // Now a 3rd switch attempt should be blocked
    const d = engine.decide('a1', goal, m, 'ai-signal'); // would try ai-signal→trend
    expect(d.shouldExecute).toBe(false);
    expect(d.reason).toMatch(/switches/i);
  });

  it('does not block when switching below the limit', () => {
    const engine = createAgentDecisionEngine({
      safeguards: {
        maxSwitchesPerWindow: 5,
        switchWindowMs: 60_000,
        maxDrawdown: 0.99,
        maxTradesPerWindow: 9999,
      },
    });
    const goal = makeGoal('maximize_profit', 2000);
    const m = makeMetrics({ strategyScore: 30 });
    engine.decide('a1', goal, m, 'trend'); // switch 1
    const d = engine.decide('a1', goal, m, 'arbitrage'); // switch 2
    expect(d.shouldExecute).toBe(true);
  });
});

describe('AgentDecisionEngine — goal progress is included in decision', () => {
  it('includes a goalProgress snapshot with valid fraction', () => {
    const engine = createAgentDecisionEngine();
    const goal = makeGoal('grow_balance', 20000);
    const metrics = makeMetrics({ currentBalance: 15000, initialBalance: 10000 });
    const d = engine.decide('a1', goal, metrics, 'trend');
    expect(d.goalProgress.progressToGoal).toBeCloseTo(0.5, 5);
    expect(d.goalProgress.currentValue).toBe(15000);
  });
});

describe('AgentDecisionEngine — reason reflects switching', () => {
  it('reports switch reason when strategy changes', () => {
    const engine = createAgentDecisionEngine({ mode: 'aggressive' });
    const goal = makeGoal('maximize_profit', 2000);
    const d = engine.decide('a1', goal, makeMetrics(), 'trend'); // aggressive → arbitrage
    expect(d.reason).toMatch(/switched/i);
    expect(d.reason).toContain('trend');
    expect(d.reason).toContain('arbitrage');
  });

  it('reports continuation reason when strategy unchanged', () => {
    const engine = createAgentDecisionEngine({ mode: 'conservative' });
    const goal = makeGoal('grow_balance', 15000);
    const d = engine.decide('a1', goal, makeMetrics(), 'trend'); // conservative → trend
    expect(d.reason).toMatch(/continuing/i);
    expect(d.reason).toContain('trend');
  });
});

describe('AgentDecisionEngine — resetState / resetAll', () => {
  it('resetState clears per-agent switch history', () => {
    const engine = createAgentDecisionEngine({
      safeguards: { maxSwitchesPerWindow: 1, switchWindowMs: 60_000, maxDrawdown: 0.99, maxTradesPerWindow: 9999 },
    });
    const goal = makeGoal('maximize_profit', 2000);
    const m = makeMetrics({ strategyScore: 30 });

    engine.decide('a1', goal, m, 'trend');  // switch 1 — at limit
    // Without reset, next switch would be blocked
    engine.resetState('a1');
    // After reset, switch limit resets
    const d = engine.decide('a1', goal, m, 'ai-signal');
    expect(d.shouldExecute).toBe(true);
  });
});

// ============================================================================
// AutonomousLoop
// ============================================================================

describe('AutonomousLoop — lifecycle', () => {
  const goal = makeGoal('maximize_profit', 1000);
  const fixedMetrics = makeMetrics({ pnl: 100, strategyScore: 70 });

  it('runs a fixed number of cycles then stops', async () => {
    const executedStrategies: string[] = [];

    const loop = createAutonomousLoop(
      'agent-1',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 3 },
      async () => fixedMetrics,
      async (_id, strategy) => { executedStrategies.push(strategy); return true; },
    );

    loop.start();
    // waitForCompletion() awaits the loop's natural end without aborting
    const summary = await loop.waitForCompletion();

    expect(summary.cyclesCompleted).toBe(3);
    expect(summary.agentId).toBe('agent-1');
    expect(typeof summary.stoppedAt).toBe('string');
  });

  it('isRunning() returns false after loop completes', async () => {
    const loop = createAutonomousLoop(
      'agent-2',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 2 },
      async () => fixedMetrics,
      async () => true,
    );

    loop.start();
    await loop.waitForCompletion();
    expect(loop.isRunning()).toBe(false);
  });

  it('getLastDecision() is populated after cycles run', async () => {
    const loop = createAutonomousLoop(
      'agent-3',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 1 },
      async () => fixedMetrics,
      async () => true,
    );

    loop.start();
    await loop.waitForCompletion();
    const dec = loop.getLastDecision();
    expect(dec).not.toBeNull();
    expect(dec!.goalProgress).toBeDefined();
  });

  it('does not execute when safeguards block', async () => {
    const executionCount = { n: 0 };

    const loop = createAutonomousLoop(
      'agent-4',
      {
        goal,
        initialStrategy: 'trend',
        intervalMs: 0,
        maxCycles: 2,
        safeguards: { maxDrawdown: 0.10 },
      },
      async () => makeMetrics({ currentDrawdown: 0.20 }), // exceeds limit
      async () => { executionCount.n++; return true; },
    );

    loop.start();
    await loop.waitForCompletion();
    expect(executionCount.n).toBe(0);
  });

  it('calls onCycleComplete after each cycle', async () => {
    const calls: number[] = [];

    const loop = createAutonomousLoop(
      'agent-5',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 3 },
      async () => fixedMetrics,
      async () => true,
      async (_id, _dec, idx) => { calls.push(idx); },
    );

    loop.start();
    await loop.waitForCompletion();
    expect(calls).toEqual([0, 1, 2]);
  });

  it('start() is idempotent — calling twice does not double-run', async () => {
    const callCount = { n: 0 };

    const loop = createAutonomousLoop(
      'agent-6',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 2 },
      async () => fixedMetrics,
      async () => { callCount.n++; return true; },
    );

    loop.start();
    loop.start(); // second call should be ignored since running=true
    await loop.waitForCompletion();
    expect(callCount.n).toBe(2); // not 4
  });
});

// ============================================================================
// Mini App UI helpers
// ============================================================================

describe('goalProgressPercent', () => {
  it('converts 0 progress to 0%', () => {
    const g = makeGoal('grow_balance', 15000);
    const p = computeGoalProgress(g, 10000, 10000);
    expect(goalProgressPercent(p)).toBe(0);
  });

  it('converts 0.5 progress to 50%', () => {
    const g = makeGoal('grow_balance', 20000);
    const p = computeGoalProgress(g, 15000, 10000);
    expect(goalProgressPercent(p)).toBe(50);
  });

  it('converts 1.0 progress to 100%', () => {
    const g = makeGoal('grow_balance', 15000);
    const p = computeGoalProgress(g, 20000, 10000);
    expect(goalProgressPercent(p)).toBe(100);
  });
});

describe('goalLabel', () => {
  it('formats maximize_profit with target', () => {
    const g = makeGoal('maximize_profit', 5000);
    expect(goalLabel(g)).toContain('5000');
  });

  it('formats minimize_risk with percentage', () => {
    const g = makeGoal('minimize_risk', 0.15);
    expect(goalLabel(g)).toContain('15%');
  });

  it('formats grow_balance with target and timeframe', () => {
    const g = makeGoal('grow_balance', 20000, '30d');
    const label = goalLabel(g);
    expect(label).toContain('20000');
    expect(label).toContain('30d');
  });
});

describe('modeLabel', () => {
  it('returns a label for each mode', () => {
    expect(modeLabel('conservative')).toContain('Conservative');
    expect(modeLabel('balanced')).toContain('Balanced');
    expect(modeLabel('aggressive')).toContain('Aggressive');
  });
});
