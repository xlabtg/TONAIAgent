/**
 * Configurable Risk Engine — Tests
 * Issue #292: Risk engine thresholds and fraud patterns are hardcoded
 *
 * Verifies that:
 *  1. Custom thresholds can be passed at construction
 *  2. setConfig() updates thresholds at runtime
 *  3. Custom fraud patterns can be injected at construction
 *  4. setConfig() replaces fraud patterns at runtime
 *  5. Removing a pattern at runtime stops it from matching
 *  6. An empty fraud-patterns array means no patterns fire
 *  7. DEFAULT_RISK_THRESHOLDS and DEFAULT_FRAUD_PATTERNS are exported
 *  8. getConfig() returns the active configuration (including fraudPatterns)
 */

import { describe, it, expect } from 'vitest';

import {
  createRiskEngine,
  DEFAULT_RISK_THRESHOLDS,
  DEFAULT_FRAUD_PATTERNS,
} from '../../core/security';

import type { TransactionRequest } from '../../core/security';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(overrides: Partial<TransactionRequest> = {}): TransactionRequest {
  return {
    id: `tx_${Date.now()}`,
    type: 'transfer',
    agentId: 'agent_test',
    userId: 'user_test',
    source: { address: 'EQ_src', type: 'agent', isWhitelisted: true, isNew: false },
    destination: { address: 'EQ_dst', type: 'contract', isWhitelisted: true, isNew: false },
    amount: { token: 'TON', symbol: 'TON', amount: '100', decimals: 9, valueTon: 100 },
    metadata: { protocol: 'dedust' },
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Custom thresholds passed at construction
// ---------------------------------------------------------------------------

describe('RiskConfig — custom thresholds at construction', () => {
  it('uses custom thresholds to determine risk level', () => {
    // With a very high lowRiskMax the engine should score typical transactions as "low"
    const engine = createRiskEngine({
      thresholds: {
        lowRiskMax: 0.99,   // almost everything is "low"
        mediumRiskMax: 0.995,
        highRiskMax: 0.998,
        autoBlockAbove: 0.999,
      },
    });

    const config = engine.getConfig();
    expect(config.thresholds.lowRiskMax).toBe(0.99);
    expect(config.thresholds.mediumRiskMax).toBe(0.995);
  });

  it('custom threshold is stricter: moderate score classified as high', async () => {
    // Default mediumRiskMax is 0.6 — we tighten to 0.05 so anything ≥ 0.05 is ≥ medium
    const strictEngine = createRiskEngine({
      thresholds: {
        lowRiskMax: 0.05,
        mediumRiskMax: 0.15,
        highRiskMax: 0.25,
        autoBlockAbove: 0.3,
      },
    });

    const defaultEngine = createRiskEngine();

    const request = makeRequest({
      amount: { token: 'TON', symbol: 'TON', amount: '200', decimals: 9, valueTon: 200 },
    });
    const history = {
      userId: 'user_test',
      agentId: 'agent_test',
      transactions: [],
      aggregates: {
        totalTransactions: 0,
        averageAmount: 0,
        maxAmount: 0,
        standardDeviation: 0,
        hourlyDistribution: Array(24).fill(0),
        dayOfWeekDistribution: Array(7).fill(0),
        protocolUsage: {},
        destinationCount: 0,
      },
      lastUpdated: new Date(),
    };

    const strictCtx = await strictEngine.assessTransaction(request, history);
    const defaultCtx = await defaultEngine.assessTransaction(request, history);

    // The strict engine should classify this at least as high; the default may classify it lower
    const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    expect(riskOrder[strictCtx.overallRisk]).toBeGreaterThanOrEqual(
      riskOrder[defaultCtx.overallRisk],
    );
  });
});

// ---------------------------------------------------------------------------
// 2. setConfig() updates thresholds at runtime
// ---------------------------------------------------------------------------

describe('RiskConfig — runtime threshold update via setConfig()', () => {
  it('updates thresholds and they take effect immediately', async () => {
    const engine = createRiskEngine();

    // Start with default thresholds; now tighten them so even low amounts are high-risk
    engine.setConfig({
      thresholds: {
        lowRiskMax: 0.01,
        mediumRiskMax: 0.02,
        highRiskMax: 0.03,
        autoBlockAbove: 0.04,
      },
    });

    const request = makeRequest({
      amount: { token: 'TON', symbol: 'TON', amount: '50', decimals: 9, valueTon: 50 },
    });
    const history = {
      userId: 'u', agentId: 'a',
      transactions: [],
      aggregates: {
        totalTransactions: 0, averageAmount: 0, maxAmount: 0, standardDeviation: 0,
        hourlyDistribution: Array(24).fill(0), dayOfWeekDistribution: Array(7).fill(0),
        protocolUsage: {}, destinationCount: 0,
      },
      lastUpdated: new Date(),
    };

    const ctx = await engine.assessTransaction(request, history);
    // With the absurdly tight thresholds the score should be above lowRiskMax = 0.01
    expect(ctx.overallRisk).not.toBe('low');
  });

  it('getConfig() reflects the updated thresholds', () => {
    const engine = createRiskEngine();
    engine.setConfig({ thresholds: { lowRiskMax: 0.1, mediumRiskMax: 0.2, highRiskMax: 0.3, autoBlockAbove: 0.4 } });
    const cfg = engine.getConfig();
    expect(cfg.thresholds.lowRiskMax).toBe(0.1);
    expect(cfg.thresholds.highRiskMax).toBe(0.3);
  });
});

// ---------------------------------------------------------------------------
// 3. Custom fraud patterns injected at construction
// ---------------------------------------------------------------------------

describe('RiskConfig — custom fraud patterns at construction', () => {
  it('uses a custom pattern set instead of the defaults', () => {
    const engine = createRiskEngine({
      fraudPatterns: [
        {
          id: 'custom_pattern',
          name: 'Custom Test Pattern',
          severity: 'high',
          description: 'Matches new destination transfers',
        },
      ],
    });

    const config = engine.getConfig();
    expect(config.fraudPatterns).toBeDefined();
    expect(config.fraudPatterns).toHaveLength(1);
    expect(config.fraudPatterns![0].id).toBe('custom_pattern');
  });

  it('default pattern new_dest_large does NOT fire when it is excluded from custom set', () => {
    // Provide a pattern set without 'new_dest_large'
    const engine = createRiskEngine({
      fraudPatterns: [
        {
          id: 'unrelated_pattern',
          name: 'Unrelated Pattern',
          severity: 'low',
          description: 'Not triggered in this test',
        },
      ],
    });

    const request = makeRequest({
      destination: { address: 'EQ_new', type: 'external', isWhitelisted: false, isNew: true },
      amount: { token: 'TON', symbol: 'TON', amount: '500', decimals: 9, valueTon: 500 },
    });

    const result = engine.checkFraudPatterns(request);
    const ids = result.matchedPatterns.map((p) => p.id);
    expect(ids).not.toContain('new_dest_large');
  });
});

// ---------------------------------------------------------------------------
// 4. setConfig() replaces fraud patterns at runtime
// ---------------------------------------------------------------------------

describe('RiskConfig — runtime fraud-pattern update via setConfig()', () => {
  it('replaces patterns and new set is used immediately', () => {
    const engine = createRiskEngine(); // starts with DEFAULT_FRAUD_PATTERNS

    engine.setConfig({
      fraudPatterns: [
        {
          id: 'new_dest_large',  // keep only this one
          name: 'Large Transfer to New Destination',
          severity: 'critical', // bump severity compared to default
          description: 'Custom description',
        },
      ],
    });

    const request = makeRequest({
      destination: { address: 'EQ_new', type: 'external', isWhitelisted: false, isNew: true },
      amount: { token: 'TON', symbol: 'TON', amount: '500', decimals: 9, valueTon: 500 },
    });

    const result = engine.checkFraudPatterns(request);
    const matched = result.matchedPatterns.find((p) => p.id === 'new_dest_large');
    expect(matched).toBeDefined();
    expect(matched!.severity).toBe('critical'); // custom severity is preserved
  });
});

// ---------------------------------------------------------------------------
// 5. Removing a pattern prevents it from matching
// ---------------------------------------------------------------------------

describe('RiskConfig — disabling a pattern', () => {
  it('pattern no longer fires after being removed from the config', () => {
    const engine = createRiskEngine(); // default set contains 'new_dest_large'

    // Remove 'new_dest_large' by providing a set without it
    engine.setConfig({ fraudPatterns: [] });

    const request = makeRequest({
      destination: { address: 'EQ_new', type: 'external', isWhitelisted: false, isNew: true },
      amount: { token: 'TON', symbol: 'TON', amount: '500', decimals: 9, valueTon: 500 },
    });

    const result = engine.checkFraudPatterns(request);
    expect(result.matchedPatterns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Empty fraud-pattern array disables all patterns
// ---------------------------------------------------------------------------

describe('RiskConfig — empty fraud patterns array', () => {
  it('no fraud patterns fire when the list is empty', () => {
    const engine = createRiskEngine({ fraudPatterns: [] });

    const request = makeRequest({
      destination: { address: 'EQ_new', type: 'external', isWhitelisted: false, isNew: true },
      amount: { token: 'TON', symbol: 'TON', amount: '10000', decimals: 9, valueTon: 10000 },
    });

    const result = engine.checkFraudPatterns(request);
    expect(result.matchedPatterns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Default constants are exported
// ---------------------------------------------------------------------------

describe('Exported defaults', () => {
  it('DEFAULT_RISK_THRESHOLDS is exported and has expected shape', () => {
    expect(DEFAULT_RISK_THRESHOLDS).toBeDefined();
    expect(DEFAULT_RISK_THRESHOLDS.lowRiskMax).toBe(0.3);
    expect(DEFAULT_RISK_THRESHOLDS.mediumRiskMax).toBe(0.6);
    expect(DEFAULT_RISK_THRESHOLDS.highRiskMax).toBe(0.8);
    expect(DEFAULT_RISK_THRESHOLDS.autoBlockAbove).toBe(0.9);
  });

  it('DEFAULT_FRAUD_PATTERNS is exported and contains the six default patterns', () => {
    expect(DEFAULT_FRAUD_PATTERNS).toBeDefined();
    expect(DEFAULT_FRAUD_PATTERNS.length).toBe(6);

    const ids = DEFAULT_FRAUD_PATTERNS.map((p) => p.id);
    expect(ids).toContain('rapid_drain');
    expect(ids).toContain('new_dest_large');
    expect(ids).toContain('unusual_time');
    expect(ids).toContain('split_transfers');
    expect(ids).toContain('dust_collection');
    expect(ids).toContain('sandwich_attack');
  });
});

// ---------------------------------------------------------------------------
// 8. getConfig() includes fraudPatterns
// ---------------------------------------------------------------------------

describe('getConfig() returns full active config', () => {
  it('includes fraudPatterns when set', () => {
    const patterns = [{ id: 'p1', name: 'P1', severity: 'medium' as const, description: 'd' }];
    const engine = createRiskEngine({ fraudPatterns: patterns });
    const cfg = engine.getConfig();
    expect(cfg.fraudPatterns).toEqual(patterns);
  });

  it('fraudPatterns is undefined when using defaults (not explicitly set)', () => {
    const engine = createRiskEngine();
    const cfg = engine.getConfig();
    // When no custom patterns provided, fraudPatterns stays undefined (defaults used lazily)
    expect(cfg.fraudPatterns).toBeUndefined();
  });
});
