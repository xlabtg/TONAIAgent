/**
 * Portfolio Allocator & Coordination Layer Tests (Issue #259)
 *
 * Covers:
 *   - Agent abstraction (createAgent, createAgentRecord)
 *   - PortfolioAllocatorService.allocate(): score weighting, caps, edge cases
 *   - PortfolioAllocatorService.allocateCapital(): integration with AgentRecord
 *   - CoordinationLayer.validate(): exposure limits, conflict detection, priority
 *   - AnalyticsService.computePortfolioMetrics(): pnl, diversification, risk
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { createAgent, createAgentRecord } from '../../core/agent/index';
import {
  PortfolioAllocatorService,
} from '../../services/portfolio-allocator/index';
import type { AgentScoreInput } from '../../services/portfolio-allocator/index';
import {
  CoordinationLayer,
  createCoordinationLayer,
} from '../../services/portfolio-allocator/coordination';
import type { TradeProposal } from '../../services/portfolio-allocator/coordination';
import { AnalyticsService } from '../../services/analytics/index';
import type { TradeRecord, AgentAllocationEntry } from '../../services/analytics/index';

// ============================================================================
// Helpers
// ============================================================================

function makeProposal(overrides: Partial<TradeProposal> & Pick<TradeProposal, 'id' | 'agentId' | 'strategy'>): TradeProposal {
  return {
    pair: 'TON/USDT',
    side: 'buy',
    notional: 1000,
    priority: 1,
    ...overrides,
  };
}

function makeTrade(
  strategy: string,
  side: 'buy' | 'sell' | 'hold' | 'none',
  pnl: number,
): TradeRecord {
  return {
    id: Math.floor(Math.random() * 10000),
    userId: 1,
    strategy,
    pair: 'TON/USDT',
    side,
    amount: 100,
    executionPrice: 2.5,
    pnl,
    slippageBps: 10,
    dex: 'dedust',
    status: 'completed',
    mode: 'demo',
    createdAt: new Date(),
  };
}

// ============================================================================
// core/agent
// ============================================================================

describe('createAgent', () => {
  it('creates a minimal agent descriptor', () => {
    const a = createAgent('a1', 'trend', 0.4);
    expect(a.id).toBe('a1');
    expect(a.strategy).toBe('trend');
    expect(a.allocation).toBe(0.4);
  });
});

describe('createAgentRecord', () => {
  it('applies default values', () => {
    const r = createAgentRecord({ id: 'r1', strategy: 'arbitrage', name: 'Arb Agent' });
    expect(r.status).toBe('active');
    expect(r.score).toBe(50);
    expect(r.allocation).toBe(0);
    expect(r.maxExposure).toBe(0.5);
  });

  it('allows overriding defaults', () => {
    const r = createAgentRecord({ id: 'r2', strategy: 'trend', name: 'T', score: 80, maxExposure: 0.3 });
    expect(r.score).toBe(80);
    expect(r.maxExposure).toBe(0.3);
  });
});

// ============================================================================
// PortfolioAllocatorService
// ============================================================================

describe('PortfolioAllocatorService.allocate', () => {
  let svc: PortfolioAllocatorService;

  beforeEach(() => {
    svc = new PortfolioAllocatorService();
  });

  it('returns empty result for empty agents array', () => {
    const r = svc.allocate([], 10000);
    expect(r.allocations).toHaveLength(0);
    expect(r.unallocated).toBe(10000);
  });

  it('returns empty result for zero balance', () => {
    const agents: AgentScoreInput[] = [{ agentId: 'a1', strategy: 'trend', score: 70 }];
    const r = svc.allocate(agents, 0);
    expect(r.allocations).toHaveLength(0);
  });

  it('higher score → higher allocation fraction', () => {
    const agents: AgentScoreInput[] = [
      { agentId: 'a1', strategy: 'trend',     score: 80 },
      { agentId: 'a2', strategy: 'arbitrage', score: 40 },
    ];
    const r = svc.allocate(agents, 10000);
    const a1 = r.allocations.find(a => a.agentId === 'a1')!;
    const a2 = r.allocations.find(a => a.agentId === 'a2')!;
    expect(a1.allocationFraction).toBeGreaterThan(a2.allocationFraction);
  });

  it('allocation fractions sum to ≈1', () => {
    const agents: AgentScoreInput[] = [
      { agentId: 'a1', strategy: 'trend',     score: 72 },
      { agentId: 'a2', strategy: 'arbitrage', score: 65 },
      { agentId: 'a3', strategy: 'ai-signal', score: 68 },
    ];
    const r = svc.allocate(agents, 10000);
    const total = r.allocations.reduce((s, a) => s + a.allocationFraction, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('capital amounts sum to totalBalance', () => {
    const agents: AgentScoreInput[] = [
      { agentId: 'a1', strategy: 'trend',    score: 72 },
      { agentId: 'a2', strategy: 'arb',      score: 65 },
      { agentId: 'a3', strategy: 'signal',   score: 68 },
    ];
    const r = svc.allocate(agents, 10000);
    const totalCapital = r.allocations.reduce((s, a) => s + a.capitalAmount, 0) + r.unallocated;
    expect(totalCapital).toBeCloseTo(10000, 2);
  });

  it('respects per-agent maxExposure cap', () => {
    const agents: AgentScoreInput[] = [
      { agentId: 'a1', strategy: 'trend', score: 99, maxExposure: 0.3 },
      { agentId: 'a2', strategy: 'arb',   score: 1,  maxExposure: 0.5 },
    ];
    const r = svc.allocate(agents, 10000);
    const a1 = r.allocations.find(a => a.agentId === 'a1')!;
    expect(a1.allocationFraction).toBeLessThanOrEqual(0.3 + 1e-9);
  });

  it('equal weights when all scores are 0', () => {
    const agents: AgentScoreInput[] = [
      { agentId: 'a1', strategy: 'trend', score: 0 },
      { agentId: 'a2', strategy: 'arb',   score: 0 },
    ];
    const r = svc.allocate(agents, 10000);
    const a1 = r.allocations.find(a => a.agentId === 'a1')!;
    const a2 = r.allocations.find(a => a.agentId === 'a2')!;
    expect(a1.allocationFraction).toBeCloseTo(a2.allocationFraction, 5);
  });
});

describe('PortfolioAllocatorService.allocateCapital', () => {
  it('skips paused agents', () => {
    const svc = new PortfolioAllocatorService();
    const records = [
      createAgentRecord({ id: 'a1', strategy: 'trend',     name: 'T', score: 80, status: 'active'  }),
      createAgentRecord({ id: 'a2', strategy: 'arbitrage', name: 'A', score: 70, status: 'paused'  }),
    ];
    records[1]!.status = 'paused';
    const { result } = svc.allocateCapital(records, 10000);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]!.agentId).toBe('a1');
  });

  it('returns Agent descriptors with updated allocation', () => {
    const svc = new PortfolioAllocatorService();
    const records = [
      createAgentRecord({ id: 'a1', strategy: 'trend',     name: 'T', score: 80 }),
      createAgentRecord({ id: 'a2', strategy: 'arbitrage', name: 'A', score: 40 }),
    ];
    const { agents } = svc.allocateCapital(records, 10000);
    const a1 = agents.find(a => a.id === 'a1')!;
    const a2 = agents.find(a => a.id === 'a2')!;
    expect(a1.allocation).toBeGreaterThan(a2.allocation);
    expect(a1.allocation + a2.allocation).toBeCloseTo(1, 5);
  });
});

// ============================================================================
// CoordinationLayer
// ============================================================================

describe('CoordinationLayer.validate — exposure limits', () => {
  it('approves a trade within all limits', () => {
    const coord = createCoordinationLayer({ maxTotalExposure: 10000, maxExposurePerPair: 5000, maxExposurePerAgent: 5000 });
    const results = coord.validate([
      makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', notional: 1000 }),
    ]);
    expect(results[0]!.approved).toBe(true);
  });

  it('rejects a trade exceeding per-agent limit', () => {
    const coord = createCoordinationLayer({ maxExposurePerAgent: 500 });
    const results = coord.validate([
      makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', notional: 1000 }),
    ]);
    expect(results[0]!.approved).toBe(false);
    expect(results[0]!.reason).toMatch(/per-agent/);
  });

  it('rejects a trade exceeding per-pair limit', () => {
    const coord = createCoordinationLayer({ maxExposurePerPair: 500, maxExposurePerAgent: 10000 });
    const results = coord.validate([
      makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', notional: 1000, pair: 'TON/USDT' }),
    ]);
    expect(results[0]!.approved).toBe(false);
    expect(results[0]!.reason).toMatch(/per-pair/);
  });

  it('rejects a trade exceeding total portfolio limit', () => {
    const coord = createCoordinationLayer({ maxTotalExposure: 500, maxExposurePerPair: 10000, maxExposurePerAgent: 10000 });
    const results = coord.validate([
      makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', notional: 1000 }),
    ]);
    expect(results[0]!.approved).toBe(false);
    expect(results[0]!.reason).toMatch(/total portfolio/);
  });
});

describe('CoordinationLayer.validate — conflict detection', () => {
  it('rejects a conflicting opposing trade on the same pair within window', () => {
    const coord = createCoordinationLayer({ conflictWindowMs: 60000, maxTotalExposure: 100000, maxExposurePerPair: 100000, maxExposurePerAgent: 100000 });

    // Agent A buys TON/USDT
    coord.validate([makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', side: 'buy', pair: 'TON/USDT' })]);

    // Agent B immediately sells TON/USDT — should be rejected
    const results = coord.validate([
      makeProposal({ id: 'p2', agentId: 'a2', strategy: 'arbitrage', side: 'sell', pair: 'TON/USDT' }),
    ]);
    expect(results[0]!.approved).toBe(false);
    expect(results[0]!.reason).toMatch(/Conflicting trade/);
  });

  it('allows trades on different pairs without conflict', () => {
    const coord = createCoordinationLayer({ conflictWindowMs: 60000, maxTotalExposure: 100000, maxExposurePerPair: 100000, maxExposurePerAgent: 100000 });

    coord.validate([makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', side: 'buy', pair: 'TON/USDT' })]);

    const results = coord.validate([
      makeProposal({ id: 'p2', agentId: 'a2', strategy: 'arbitrage', side: 'sell', pair: 'BTC/USDT' }),
    ]);
    expect(results[0]!.approved).toBe(true);
  });

  it('allows same agent to trade opposite side on same pair', () => {
    const coord = createCoordinationLayer({ conflictWindowMs: 60000, maxTotalExposure: 100000, maxExposurePerPair: 100000, maxExposurePerAgent: 100000 });

    coord.validate([makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', side: 'buy', pair: 'TON/USDT' })]);

    // Clearing: same agent sells (closes position)
    const results = coord.validate([
      makeProposal({ id: 'p2', agentId: 'a1', strategy: 'trend', side: 'sell', pair: 'TON/USDT' }),
    ]);
    // The same agent doesn't trigger a conflict (conflict only across different agents)
    expect(results[0]!.approved).toBe(true);
  });
});

describe('CoordinationLayer.validate — priority ordering', () => {
  it('processes higher-priority (lower number) trades first', () => {
    const coord = createCoordinationLayer({
      maxTotalExposure: 1500, // only enough for one of the 1000-notional trades
      maxExposurePerPair: 100000,
      maxExposurePerAgent: 100000,
    });

    // p1 has lower priority number = higher priority
    const results = coord.validate([
      makeProposal({ id: 'p2', agentId: 'a2', strategy: 'arb',   priority: 2, notional: 1000 }),
      makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', priority: 1, notional: 1000 }),
    ]);

    const r1 = results.find(r => r.proposalId === 'p1')!;
    const r2 = results.find(r => r.proposalId === 'p2')!;
    expect(r1.approved).toBe(true);
    expect(r2.approved).toBe(false);
  });
});

describe('CoordinationLayer.getExposureMetrics', () => {
  it('returns zero exposure when no trades approved', () => {
    const coord = createCoordinationLayer();
    const m = coord.getExposureMetrics();
    expect(m.totalExposure).toBe(0);
  });

  it('reflects approved trade exposure', () => {
    const coord = createCoordinationLayer({ maxTotalExposure: 100000, maxExposurePerPair: 100000, maxExposurePerAgent: 100000 });
    coord.validate([makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', notional: 2500 })]);
    const m = coord.getExposureMetrics();
    expect(m.totalExposure).toBe(2500);
    expect(m.byAgent['a1']).toBe(2500);
    expect(m.byPair['TON/USDT']).toBe(2500);
  });

  it('clears on clearAll()', () => {
    const coord = createCoordinationLayer({ maxTotalExposure: 100000, maxExposurePerPair: 100000, maxExposurePerAgent: 100000 });
    coord.validate([makeProposal({ id: 'p1', agentId: 'a1', strategy: 'trend', notional: 2500 })]);
    coord.clearAll();
    expect(coord.getExposureMetrics().totalExposure).toBe(0);
  });
});

// ============================================================================
// AnalyticsService.computePortfolioMetrics
// ============================================================================

describe('AnalyticsService.computePortfolioMetrics', () => {
  let svc: AnalyticsService;

  beforeEach(() => {
    svc = new AnalyticsService();
  });

  const allocations: AgentAllocationEntry[] = [
    { agentId: 'a1', strategy: 'trend',     allocationFraction: 0.4 },
    { agentId: 'a2', strategy: 'arbitrage', allocationFraction: 0.3 },
    { agentId: 'a3', strategy: 'ai-signal', allocationFraction: 0.3 },
  ];

  it('returns zero metrics for empty trades', () => {
    const m = svc.computePortfolioMetrics([], allocations);
    expect(m.portfolioPnL).toBe(0);
    expect(m.activeAgents).toBe(3);
  });

  it('computes portfolioPnL as sum of all strategy PnLs', () => {
    const trades: TradeRecord[] = [
      makeTrade('trend',     'buy',  100),
      makeTrade('trend',     'sell', 50),
      makeTrade('arbitrage', 'buy',  200),
    ];
    const m = svc.computePortfolioMetrics(trades, allocations);
    expect(m.portfolioPnL).toBe(350);
  });

  it('diversificationScore is lower when allocation is unequal', () => {
    const equalAlloc: AgentAllocationEntry[] = [
      { agentId: 'a1', strategy: 'trend',     allocationFraction: 1/3 },
      { agentId: 'a2', strategy: 'arbitrage', allocationFraction: 1/3 },
      { agentId: 'a3', strategy: 'ai-signal', allocationFraction: 1/3 },
    ];
    const unequalAlloc: AgentAllocationEntry[] = [
      { agentId: 'a1', strategy: 'trend',     allocationFraction: 0.9 },
      { agentId: 'a2', strategy: 'arbitrage', allocationFraction: 0.05 },
      { agentId: 'a3', strategy: 'ai-signal', allocationFraction: 0.05 },
    ];

    const mEqual   = svc.computePortfolioMetrics([], equalAlloc);
    const mUnequal = svc.computePortfolioMetrics([], unequalAlloc);

    expect(mEqual.diversificationScore).toBeGreaterThan(mUnequal.diversificationScore);
  });

  it('diversificationScore is 0 for single-strategy portfolio', () => {
    const single: AgentAllocationEntry[] = [
      { agentId: 'a1', strategy: 'trend', allocationFraction: 1.0 },
    ];
    const m = svc.computePortfolioMetrics([], single);
    expect(m.diversificationScore).toBe(0);
  });

  it('riskExposure reflects weighted drawdown', () => {
    // Build a sequence with a peak then a decline so drawdown is non-zero.
    // Trade 1: +200 (peak), Trade 2: -150 (drawdown from peak).
    const trades: TradeRecord[] = [
      makeTrade('trend', 'buy', 200),
      makeTrade('trend', 'sell', -150),
    ];
    const m = svc.computePortfolioMetrics(trades, allocations);
    expect(m.riskExposure).toBeGreaterThan(0);
  });

  it('activeAgents equals number of allocation entries', () => {
    const m = svc.computePortfolioMetrics([], allocations);
    expect(m.activeAgents).toBe(3);
  });

  it('byStrategy includes contribution per strategy', () => {
    const trades: TradeRecord[] = [
      makeTrade('trend', 'buy', 400),
    ];
    const m = svc.computePortfolioMetrics(trades, allocations);
    const trendEntry = m.byStrategy.find(b => b.strategy === 'trend');
    expect(trendEntry).toBeDefined();
    expect(trendEntry!.pnl).toBe(400);
    expect(trendEntry!.contribution).toBeCloseTo(400 * 0.4, 5);
  });
});
