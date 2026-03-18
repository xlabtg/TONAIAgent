/**
 * Agent Memory & Context Awareness Tests (Issue #263)
 *
 * Covers:
 *   - AgentMemoryStore: accumulation, ring-buffer eviction, clear
 *   - Pattern detection: consecutive losses, repeated strategy failure, win rate
 *   - AgentContextBuilder: trendState, volatilityLevel, confidenceScore, recentPerformance
 *   - AgentDecisionEngine: decisions influenced by context (memory overrides)
 *   - AutonomousLoop: memory cycle integration (memory populated after cycles)
 *   - Mini App UI helpers: confidencePercent, confidenceLabel, trendStateLabel,
 *                          volatilityLabel, buildMemoryInsightPanel
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  AgentMemoryStore,
  createAgentMemoryStore,
  createTrade,
  createDecisionRecord,
  createMetricSnapshot,
} from '../../core/agent/memory';
import type { Trade, Decision, MetricSnapshot } from '../../core/agent/memory';

import {
  AgentContextBuilder,
  createAgentContextBuilder,
} from '../../services/agent-context/index';
import type { AgentContext } from '../../services/agent-context/index';

import {
  AgentDecisionEngine,
  createAgentDecisionEngine,
} from '../../services/agent-decision/index';
import type { AgentMetrics } from '../../services/agent-decision/index';

import {
  createAutonomousLoop,
} from '../../services/agent-decision/autonomous-loop';

import {
  confidencePercent,
  confidenceLabel,
  trendStateLabel,
  volatilityLabel,
  buildMemoryInsightPanel,
} from '../../services/agent-decision/miniapp-ui';

import { createAgentGoal } from '../../core/agent/goals';

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

function profitTrade(strategy = 'trend', pnl = 100): Trade {
  return createTrade(strategy, 'profit', pnl);
}

function lossTrade(strategy = 'trend', pnl = -100): Trade {
  return createTrade(strategy, 'loss', pnl);
}

function neutralTrade(strategy = 'trend'): Trade {
  return createTrade(strategy, 'neutral', 0);
}

function makeSnapshot(balance = 10_000, pnl = 0, drawdown = 0, score = 70): MetricSnapshot {
  return createMetricSnapshot(balance, pnl, drawdown, score);
}

// ============================================================================
// AgentMemoryStore — basic accumulation
// ============================================================================

describe('AgentMemoryStore — trade accumulation', () => {
  it('records trades and retrieves them', () => {
    const store = createAgentMemoryStore();
    store.recordTrade('a1', profitTrade());
    store.recordTrade('a1', lossTrade());
    const memory = store.getMemory('a1');
    expect(memory.recentTrades).toHaveLength(2);
  });

  it('evicts oldest trade when ring buffer is full', () => {
    const store = createAgentMemoryStore({ maxTrades: 3 });
    store.recordTrade('a1', profitTrade('trend', 1));
    store.recordTrade('a1', profitTrade('trend', 2));
    store.recordTrade('a1', profitTrade('trend', 3));
    store.recordTrade('a1', profitTrade('trend', 4)); // evicts pnl=1
    const memory = store.getMemory('a1');
    expect(memory.recentTrades).toHaveLength(3);
    expect(memory.recentTrades[0].pnl).toBe(2);
    expect(memory.recentTrades[2].pnl).toBe(4);
  });

  it('returns empty memory for unknown agent', () => {
    const store = createAgentMemoryStore();
    const memory = store.getMemory('unknown');
    expect(memory.recentTrades).toHaveLength(0);
    expect(memory.recentDecisions).toHaveLength(0);
    expect(memory.performanceHistory).toHaveLength(0);
  });

  it('clearMemory removes all agent data', () => {
    const store = createAgentMemoryStore();
    store.recordTrade('a1', profitTrade());
    store.clearMemory('a1');
    const memory = store.getMemory('a1');
    expect(memory.recentTrades).toHaveLength(0);
  });
});

describe('AgentMemoryStore — decision accumulation', () => {
  it('records decisions up to maxDecisions', () => {
    const store = createAgentMemoryStore({ maxDecisions: 2 });
    store.recordDecision('a1', createDecisionRecord('trend', true, 'ok', 0.8));
    store.recordDecision('a1', createDecisionRecord('arbitrage', true, 'ok', 0.7));
    store.recordDecision('a1', createDecisionRecord('ai-signal', false, 'paused', 0.3));
    const memory = store.getMemory('a1');
    expect(memory.recentDecisions).toHaveLength(2);
    expect(memory.recentDecisions[0].strategy).toBe('arbitrage');
  });
});

describe('AgentMemoryStore — snapshot accumulation', () => {
  it('records snapshots up to maxSnapshots', () => {
    const store = createAgentMemoryStore({ maxSnapshots: 2 });
    store.recordSnapshot('a1', makeSnapshot(10_000));
    store.recordSnapshot('a1', makeSnapshot(10_100));
    store.recordSnapshot('a1', makeSnapshot(10_200));
    const memory = store.getMemory('a1');
    expect(memory.performanceHistory).toHaveLength(2);
    expect(memory.performanceHistory[0].balance).toBe(10_100);
  });
});

// ============================================================================
// AgentMemoryStore — pattern detection
// ============================================================================

describe('AgentMemoryStore.detectPatterns — win rate', () => {
  it('returns 0.5 win rate when no trades', () => {
    const store = createAgentMemoryStore();
    const p = store.detectPatterns('a1');
    expect(p.winRate).toBe(0.5);
  });

  it('computes correct win rate with mixed trades', () => {
    const store = createAgentMemoryStore();
    store.recordTrade('a1', profitTrade());
    store.recordTrade('a1', profitTrade());
    store.recordTrade('a1', lossTrade());
    store.recordTrade('a1', lossTrade());
    const p = store.detectPatterns('a1');
    expect(p.winRate).toBe(0.5);
  });
});

describe('AgentMemoryStore.detectPatterns — consecutive losses', () => {
  it('flags consecutive losses when >= threshold (default 3)', () => {
    const store = createAgentMemoryStore({ consecutiveLossThreshold: 3 });
    store.recordTrade('a1', profitTrade());
    store.recordTrade('a1', lossTrade());
    store.recordTrade('a1', lossTrade());
    store.recordTrade('a1', lossTrade());
    const p = store.detectPatterns('a1');
    expect(p.consecutiveLosses).toBe(true);
    expect(p.consecutiveLossCount).toBe(3);
  });

  it('does not flag when last trade was a profit', () => {
    const store = createAgentMemoryStore();
    store.recordTrade('a1', lossTrade());
    store.recordTrade('a1', lossTrade());
    store.recordTrade('a1', lossTrade());
    store.recordTrade('a1', profitTrade()); // breaks streak
    const p = store.detectPatterns('a1');
    expect(p.consecutiveLosses).toBe(false);
    expect(p.consecutiveLossCount).toBe(0);
  });

  it('counts consecutive losses correctly', () => {
    const store = createAgentMemoryStore({ consecutiveLossThreshold: 2 });
    store.recordTrade('a1', lossTrade());
    store.recordTrade('a1', lossTrade());
    const p = store.detectPatterns('a1');
    expect(p.consecutiveLosses).toBe(true);
    expect(p.consecutiveLossCount).toBe(2);
  });
});

describe('AgentMemoryStore.detectPatterns — repeated strategy failure', () => {
  it('detects repeated failure for a strategy with > 60% loss rate', () => {
    const store = createAgentMemoryStore({ minTradesForPatternDetection: 5 });
    // 4 losses + 1 profit for 'trend' = 80% loss rate
    for (let i = 0; i < 4; i++) store.recordTrade('a1', lossTrade('trend'));
    store.recordTrade('a1', profitTrade('trend'));
    const p = store.detectPatterns('a1');
    expect(p.repeatedStrategyFailure).toBe(true);
    expect(p.failingStrategy).toBe('trend');
  });

  it('does not flag failure when loss rate <= 60%', () => {
    const store = createAgentMemoryStore({ minTradesForPatternDetection: 5 });
    store.recordTrade('a1', lossTrade('trend'));
    store.recordTrade('a1', lossTrade('trend'));
    store.recordTrade('a1', profitTrade('trend'));
    store.recordTrade('a1', profitTrade('trend'));
    store.recordTrade('a1', profitTrade('trend'));
    const p = store.detectPatterns('a1');
    expect(p.repeatedStrategyFailure).toBe(false);
  });

  it('does not flag when below minTradesForPatternDetection', () => {
    const store = createAgentMemoryStore({ minTradesForPatternDetection: 10 });
    for (let i = 0; i < 4; i++) store.recordTrade('a1', lossTrade('arbitrage'));
    const p = store.detectPatterns('a1');
    expect(p.repeatedStrategyFailure).toBe(false);
  });
});

// ============================================================================
// createTrade / createDecisionRecord / createMetricSnapshot
// ============================================================================

describe('createTrade', () => {
  it('creates a trade with correct fields', () => {
    const t = createTrade('trend', 'profit', 250);
    expect(t.strategy).toBe('trend');
    expect(t.outcome).toBe('profit');
    expect(t.pnl).toBe(250);
    expect(t.id).toMatch(/^trade_/);
    expect(t.executedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('createDecisionRecord', () => {
  it('clamps confidence to [0,1]', () => {
    const d = createDecisionRecord('trend', true, 'ok', 1.5);
    expect(d.confidence).toBe(1);
    const d2 = createDecisionRecord('trend', false, 'nope', -0.5);
    expect(d2.confidence).toBe(0);
  });
});

// ============================================================================
// AgentContextBuilder
// ============================================================================

describe('AgentContextBuilder — trend state', () => {
  it('returns neutral when no snapshots', () => {
    const store = createAgentMemoryStore();
    const builder = createAgentContextBuilder();
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics());
    expect(ctx.trendState).toBe('neutral');
  });

  it('returns rising when balance trend is upward', () => {
    const store = createAgentMemoryStore();
    const builder = createAgentContextBuilder({ trendWindow: 5 });
    // Add ascending balance snapshots
    for (let i = 0; i < 5; i++) {
      store.recordSnapshot('a1', makeSnapshot(10_000 + i * 500));
    }
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics({ currentBalance: 12_000 }));
    expect(ctx.trendState).toBe('rising');
  });

  it('returns falling when balance trend is downward', () => {
    const store = createAgentMemoryStore();
    const builder = createAgentContextBuilder({ trendWindow: 5 });
    for (let i = 0; i < 5; i++) {
      store.recordSnapshot('a1', makeSnapshot(12_000 - i * 500));
    }
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics({ currentBalance: 9_500 }));
    expect(ctx.trendState).toBe('falling');
  });
});

describe('AgentContextBuilder — volatility level', () => {
  it('returns low with consistent profitable small trades', () => {
    const store = createAgentMemoryStore();
    const builder = createAgentContextBuilder();
    for (let i = 0; i < 5; i++) store.recordTrade('a1', profitTrade('trend', 10));
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics());
    expect(ctx.volatilityLevel).toBe('low');
  });

  it('returns high with wildly varying PnL', () => {
    const store = createAgentMemoryStore();
    const builder = createAgentContextBuilder();
    store.recordTrade('a1', profitTrade('trend', 5000));
    store.recordTrade('a1', lossTrade('trend', -4900));
    store.recordTrade('a1', profitTrade('trend', 4800));
    store.recordTrade('a1', lossTrade('trend', -4700));
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics());
    expect(ctx.volatilityLevel).toBe('high');
  });
});

describe('AgentContextBuilder — confidence score', () => {
  it('returns strategyScore proxy when no trades', () => {
    const store = createAgentMemoryStore();
    const builder = createAgentContextBuilder();
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics({ strategyScore: 80 }));
    expect(ctx.confidenceScore).toBeCloseTo(0.8, 5);
  });

  it('is higher with all profitable trades (high win rate)', () => {
    const store = createAgentMemoryStore();
    const builder = createAgentContextBuilder();
    for (let i = 0; i < 10; i++) store.recordTrade('a1', profitTrade());
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics());
    expect(ctx.confidenceScore).toBeGreaterThan(0.7);
  });

  it('is lower with consecutive losses', () => {
    const store = createAgentMemoryStore({ consecutiveLossThreshold: 3 });
    const builder = createAgentContextBuilder();
    for (let i = 0; i < 8; i++) store.recordTrade('a1', lossTrade());
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics());
    // With 0% win rate and -3+ streak the confidence formula yields ~0.41
    // which is already well below a normal balanced score of ~0.7+
    expect(ctx.confidenceScore).toBeLessThan(0.5);
  });

  it('is within [0, 1]', () => {
    const store = createAgentMemoryStore();
    const builder = createAgentContextBuilder();
    for (let i = 0; i < 5; i++) store.recordTrade('a1', profitTrade('trend', i % 2 === 0 ? 100 : -50));
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics());
    expect(ctx.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(ctx.confidenceScore).toBeLessThanOrEqual(1);
  });
});

describe('AgentContextBuilder — patterns included', () => {
  it('includes pattern detection results in context', () => {
    const store = createAgentMemoryStore({ consecutiveLossThreshold: 3 });
    const builder = createAgentContextBuilder();
    for (let i = 0; i < 3; i++) store.recordTrade('a1', lossTrade());
    const memory = store.getMemory('a1');
    const patterns = store.detectPatterns('a1');
    const ctx = builder.build(memory, patterns, makeMetrics());
    expect(ctx.patterns.consecutiveLosses).toBe(true);
  });
});

// ============================================================================
// AgentDecisionEngine — context-aware decisions (Issue #263)
// ============================================================================

describe('AgentDecisionEngine — consecutive loss pattern forces ai-signal', () => {
  it('switches to ai-signal when context reports 3+ consecutive losses', () => {
    const engine = createAgentDecisionEngine({ mode: 'aggressive' });
    const goal = createAgentGoal('maximize_profit', 2000);

    // Build context with consecutive loss flag
    const store = createAgentMemoryStore({ consecutiveLossThreshold: 3 });
    const builder = createAgentContextBuilder();
    for (let i = 0; i < 3; i++) store.recordTrade('x1', lossTrade('arbitrage'));
    const memory = store.getMemory('x1');
    const patterns = store.detectPatterns('x1');
    const ctx = builder.build(memory, patterns, makeMetrics());

    expect(ctx.patterns.consecutiveLosses).toBe(true);

    const d = engine.decide('x1', goal, makeMetrics(), 'arbitrage', ctx);
    expect(d.strategy).toBe('ai-signal');
  });
});

describe('AgentDecisionEngine — falling trend + low confidence switches to ai-signal', () => {
  it('switches to ai-signal in balanced mode when trend is falling and confidence is low', () => {
    const engine = createAgentDecisionEngine({ mode: 'balanced' });
    const goal = createAgentGoal('maximize_profit', 2000);

    // Fake a falling context with low confidence
    const ctx: AgentContext = {
      trendState: 'falling',
      confidenceScore: 0.20,
      volatilityLevel: 'medium',
      recentPerformance: { winRate: 0.2, avgPnlPerTrade: -50, tradeCount: 5, streak: -3 },
      patterns: {
        consecutiveLosses: false,
        consecutiveLossCount: 0,
        repeatedStrategyFailure: false,
        failingStrategy: null,
        winRate: 0.2,
      },
      builtAt: new Date().toISOString(),
    };

    const d = engine.decide('x2', goal, makeMetrics(), 'trend', ctx);
    expect(d.strategy).toBe('ai-signal');
  });
});

describe('AgentDecisionEngine — confidence score in result', () => {
  it('includes context.confidenceScore in DecisionResult when context is provided', () => {
    const engine = createAgentDecisionEngine({ mode: 'balanced' });
    const goal = createAgentGoal('grow_balance', 15000);

    const ctx: AgentContext = {
      trendState: 'rising',
      confidenceScore: 0.75,
      volatilityLevel: 'low',
      recentPerformance: { winRate: 0.75, avgPnlPerTrade: 80, tradeCount: 10, streak: 3 },
      patterns: {
        consecutiveLosses: false,
        consecutiveLossCount: 0,
        repeatedStrategyFailure: false,
        failingStrategy: null,
        winRate: 0.75,
      },
      builtAt: new Date().toISOString(),
    };

    const d = engine.decide('x3', goal, makeMetrics(), 'trend', ctx);
    expect(d.confidenceScore).toBe(0.75);
  });

  it('derives confidenceScore from strategyScore when no context', () => {
    const engine = createAgentDecisionEngine();
    const goal = createAgentGoal('grow_balance', 15000);
    const d = engine.decide('x4', goal, makeMetrics({ strategyScore: 60 }), 'trend');
    expect(d.confidenceScore).toBeCloseTo(0.6, 5);
  });
});

describe('AgentDecisionEngine — context adjusts position multiplier', () => {
  it('reduces positionMultiplier when confidence is low', () => {
    const engine = createAgentDecisionEngine({ mode: 'balanced' });
    const goal = createAgentGoal('grow_balance', 15000);

    const lowConfCtx: AgentContext = {
      trendState: 'neutral',
      confidenceScore: 0.30, // < 0.4 → reduce by 20%
      volatilityLevel: 'low',
      recentPerformance: { winRate: 0.3, avgPnlPerTrade: -10, tradeCount: 5, streak: -2 },
      patterns: {
        consecutiveLosses: false,
        consecutiveLossCount: 0,
        repeatedStrategyFailure: false,
        failingStrategy: null,
        winRate: 0.3,
      },
      builtAt: new Date().toISOString(),
    };

    const noCtxDecision = engine.decide('y1', goal, makeMetrics(), 'trend');
    const ctxDecision = engine.decide('y2', goal, makeMetrics(), 'trend', lowConfCtx);

    // With low confidence context, position multiplier should be 20% smaller
    const noCtxMult = noCtxDecision.params['positionMultiplier'] as number;
    const ctxMult = ctxDecision.params['positionMultiplier'] as number;
    expect(ctxMult).toBeCloseTo(noCtxMult * 0.8, 5);
  });
});

describe('AgentDecisionEngine — context reason includes confidence and trend', () => {
  it('reason includes confidence and trend label when context is provided', () => {
    const engine = createAgentDecisionEngine({ mode: 'conservative' });
    const goal = createAgentGoal('grow_balance', 15000);

    const ctx: AgentContext = {
      trendState: 'rising',
      confidenceScore: 0.85,
      volatilityLevel: 'low',
      recentPerformance: { winRate: 0.85, avgPnlPerTrade: 50, tradeCount: 10, streak: 5 },
      patterns: {
        consecutiveLosses: false,
        consecutiveLossCount: 0,
        repeatedStrategyFailure: false,
        failingStrategy: null,
        winRate: 0.85,
      },
      builtAt: new Date().toISOString(),
    };

    const d = engine.decide('z1', goal, makeMetrics(), 'trend', ctx);
    expect(d.reason).toContain('confidence');
    expect(d.reason).toContain('trend');
    expect(d.reason).toContain('rising');
  });
});

// ============================================================================
// AutonomousLoop — memory integration (Issue #263)
// ============================================================================

describe('AutonomousLoop — memory is populated after cycles', () => {
  it('records metric snapshots for each cycle', async () => {
    const goal = createAgentGoal('maximize_profit', 1000);
    const loop = createAutonomousLoop(
      'loop-mem-1',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 3 },
      async () => makeMetrics({ pnl: 50, strategyScore: 70 }),
      async () => true,
    );

    loop.start();
    await loop.waitForCompletion();

    const memory = loop.getMemoryStore().getMemory('loop-mem-1');
    expect(memory.performanceHistory).toHaveLength(3);
    expect(memory.recentDecisions).toHaveLength(3);
  });

  it('records Trade objects returned by execute callback', async () => {
    const goal = createAgentGoal('maximize_profit', 1000);
    const loop = createAutonomousLoop(
      'loop-mem-2',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 2 },
      async () => makeMetrics({ pnl: 100, strategyScore: 75 }),
      async (_id, strategy) => createTrade(strategy, 'profit', 100),
    );

    loop.start();
    await loop.waitForCompletion();

    const memory = loop.getMemoryStore().getMemory('loop-mem-2');
    expect(memory.recentTrades).toHaveLength(2);
    expect(memory.recentTrades[0].outcome).toBe('profit');
  });

  it('does NOT record a trade when execute returns true (boolean)', async () => {
    const goal = createAgentGoal('maximize_profit', 1000);
    const loop = createAutonomousLoop(
      'loop-mem-3',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 2 },
      async () => makeMetrics(),
      async () => true,
    );

    loop.start();
    await loop.waitForCompletion();

    const memory = loop.getMemoryStore().getMemory('loop-mem-3');
    // Decisions and snapshots recorded; trades NOT recorded for boolean result
    expect(memory.recentTrades).toHaveLength(0);
    expect(memory.recentDecisions).toHaveLength(2);
  });

  it('loop summary includes finalConfidenceScore', async () => {
    const goal = createAgentGoal('maximize_profit', 1000);
    const loop = createAutonomousLoop(
      'loop-mem-4',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 1 },
      async () => makeMetrics({ strategyScore: 80 }),
      async () => true,
    );

    loop.start();
    const summary = await loop.waitForCompletion();
    expect(summary.finalConfidenceScore).toBeGreaterThanOrEqual(0);
    expect(summary.finalConfidenceScore).toBeLessThanOrEqual(1);
  });

  it('loop summary includes finalContext after cycles', async () => {
    const goal = createAgentGoal('maximize_profit', 1000);
    const loop = createAutonomousLoop(
      'loop-mem-5',
      { goal, initialStrategy: 'trend', intervalMs: 0, maxCycles: 2 },
      async () => makeMetrics(),
      async () => true,
    );

    loop.start();
    const summary = await loop.waitForCompletion();
    expect(summary.finalContext).not.toBeNull();
    expect(summary.finalContext!.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ============================================================================
// Mini App UI helpers (Issue #263)
// ============================================================================

describe('confidencePercent', () => {
  it('converts 0 to 0%', () => expect(confidencePercent(0)).toBe(0));
  it('converts 0.5 to 50%', () => expect(confidencePercent(0.5)).toBe(50));
  it('converts 1 to 100%', () => expect(confidencePercent(1)).toBe(100));
  it('clamps above 1', () => expect(confidencePercent(1.5)).toBe(100));
  it('clamps below 0', () => expect(confidencePercent(-0.5)).toBe(0));
});

describe('confidenceLabel', () => {
  it('returns Low for <= 33%', () => expect(confidenceLabel(0.33)).toBe('Low'));
  it('returns Moderate for <= 66%', () => expect(confidenceLabel(0.55)).toBe('Moderate'));
  it('returns High for > 66%', () => expect(confidenceLabel(0.80)).toBe('High'));
});

describe('trendStateLabel', () => {
  it('labels each trend state', () => {
    expect(trendStateLabel('rising')).toContain('Rising');
    expect(trendStateLabel('falling')).toContain('Falling');
    expect(trendStateLabel('neutral')).toContain('Neutral');
  });
});

describe('volatilityLabel', () => {
  it('labels each volatility level', () => {
    expect(volatilityLabel('low')).toContain('Low');
    expect(volatilityLabel('medium')).toContain('Medium');
    expect(volatilityLabel('high')).toContain('High');
  });
});

describe('buildMemoryInsightPanel', () => {
  it('builds a panel with correct fields', () => {
    const perf = { winRate: 0.6, avgPnlPerTrade: 30, tradeCount: 10, streak: 2 };
    const panel = buildMemoryInsightPanel(perf, 'rising', 'low', false, false);
    expect(panel.winRate).toBe(0.6);
    expect(panel.trendState).toBe('rising');
    expect(panel.volatilityLevel).toBe('low');
    expect(panel.tradeCount).toBe(10);
    expect(panel.streak).toBe(2);
    expect(panel.consecutiveLossAlert).toBe(false);
    expect(panel.strategyFailureAlert).toBe(false);
  });

  it('sets alert flags correctly', () => {
    const perf = { winRate: 0.2, avgPnlPerTrade: -40, tradeCount: 5, streak: -3 };
    const panel = buildMemoryInsightPanel(perf, 'falling', 'high', true, true);
    expect(panel.consecutiveLossAlert).toBe(true);
    expect(panel.strategyFailureAlert).toBe(true);
    expect(panel.volatilityLevel).toBe('high');
  });
});
