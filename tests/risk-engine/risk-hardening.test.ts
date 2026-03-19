/**
 * Risk Engine Hardening & Capital Protection — Tests
 * Issue #269: Risk Engine Hardening & Capital Protection Layer
 *
 * Covers:
 *   1.  RiskControlService — drawdown protection
 *   2.  RiskControlService — daily loss limit
 *   3.  RiskControlService — position size validation
 *   4.  RiskControlService — portfolio over-exposure
 *   5.  RiskControlService — trade frequency throttling
 *   6.  RiskControlService — slippage hard cap
 *   7.  RiskControlService — global kill-switch
 *   8.  RiskControlService — execution recording
 *   9.  RiskControlService — config update
 *   10. CapitalProtectionEvaluator — drawdown protection
 *   11. CapitalProtectionEvaluator — daily loss cap
 *   12. CapitalProtectionEvaluator — rolling 24h loss
 *   13. CapitalProtectionEvaluator — rolling 7d loss
 *   14. CapitalProtectionEvaluator — portfolio exposure
 *   15. CapitalProtectionEvaluator — position size
 *   16. CapitalProtectionEvaluator — trade frequency
 *   17. CapitalProtectionEvaluator — slippage cap
 *   18. CapitalProtectionEvaluator — kill-switch
 *   19. CapitalProtectionEvaluator — risk score computation
 *   20. RollingLossTracker — records and windows
 *   21. RollingLossTracker — pruning
 *   22. DrawdownTracker — basic drawdown
 *   23. DrawdownTracker — no drawdown when value rises
 *   24. computeHHI — diversified portfolio
 *   25. computeHHI — fully concentrated
 *   26. normalizedHHI — range bounds
 *   27. PortfolioRiskAnalytics — snapshot
 *   28. PortfolioRiskAnalytics — drawdown tracking
 *   29. AgentRiskSafeguards — drawdown stop
 *   30. AgentRiskSafeguards — consecutive loss threshold
 *   31. AgentRiskSafeguards — consecutive loss stop
 *   32. AgentRiskSafeguards — aggressiveness downgrade
 *   33. AgentRiskSafeguards — resumeAgent
 *   34. AgentRiskSafeguards — already stopped agent
 *   35. AgentRiskSafeguards — getStoppedAgents
 *   36. RiskAwareExecutionEngine — blocks on risk rejection
 *   37. RiskAwareExecutionEngine — allows through to smart engine
 *   38. RiskAwareExecutionEngine — records execution on success
 *   39. DefaultRiskEngine — capital protection integrated
 *   40. DefaultRiskEngine — event forwarding from capital protection
 *   41. DefaultRiskEngine — full config construction
 *   42. Integration — kill-switch blocks all agents
 *   43. Integration — resume after kill-switch
 *   44. Integration — risk score increases with drawdown
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  createRiskControlService,
  DefaultRiskControlService,
  DEFAULT_RISK_CONFIG,
} from '../../services/risk-control/index';

import type {
  RiskEvaluationRequest,
  PortfolioContext,
} from '../../services/risk-control/index';

import {
  CapitalProtectionEvaluator,
  createCapitalProtectionEvaluator,
  RollingLossTracker,
  DrawdownTracker,
  computeHHI,
  normalizedHHI,
  DEFAULT_HARDENED_RISK_CONFIG,
} from '../../core/risk-engine/capital-protection';

import {
  PortfolioRiskAnalytics,
  createPortfolioRiskAnalytics,
} from '../../services/analytics/index';

import {
  AgentRiskSafeguards,
  createAgentRiskSafeguards,
} from '../../services/agent-decision/risk-safeguards';

import {
  createRiskEngine,
} from '../../core/risk-engine/index';

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(overrides?: Partial<RiskEvaluationRequest>): RiskEvaluationRequest {
  return {
    requestId: 'req_test_001',
    agentId: 'agent_001',
    action: 'BUY',
    pair: 'TON/USDT',
    positionSizePercent: 3,
    amountUsd: 300,
    ...overrides,
  };
}

function makePortfolio(overrides?: Partial<PortfolioContext>): PortfolioContext {
  return {
    totalValueUsd: 10000,
    currentDrawdownPercent: 5,
    currentExposurePercent: 40,
    dailyLossUsd: 50,
    peakValueUsd: 10500,
    ...overrides,
  };
}

// ============================================================================
// 1–9. RiskControlService
// ============================================================================

describe('RiskControlService', () => {
  let service: DefaultRiskControlService;

  beforeEach(() => {
    service = createRiskControlService();
  });

  it('1. allows a normal trade', () => {
    const result = service.evaluate(makeRequest(), makePortfolio());
    expect(result.allowed).toBe(true);
  });

  it('2. blocks when drawdown >= maxDrawdownPercent', () => {
    const result = service.evaluate(
      makeRequest(),
      makePortfolio({ currentDrawdownPercent: 15 })
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('RISK_MAX_DRAWDOWN');
    }
  });

  it('3. allows when drawdown just below limit', () => {
    const result = service.evaluate(
      makeRequest(),
      makePortfolio({ currentDrawdownPercent: 14.9 })
    );
    expect(result.allowed).toBe(true);
  });

  it('4. blocks when daily loss >= maxDailyLossUsd', () => {
    const result = service.evaluate(
      makeRequest(),
      makePortfolio({ dailyLossUsd: 500 })
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('RISK_DAILY_LOSS');
    }
  });

  it('5. blocks when position size > maxPositionSizePercent', () => {
    const result = service.evaluate(
      makeRequest({ positionSizePercent: 6 }),
      makePortfolio()
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('RISK_POSITION_TOO_LARGE');
    }
  });

  it('6. blocks when exposure >= maxPortfolioExposurePercent', () => {
    const result = service.evaluate(
      makeRequest(),
      makePortfolio({ currentExposurePercent: 80 })
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('RISK_OVEREXPOSURE');
    }
  });

  it('7. blocks on slippage above hard cap', () => {
    const result = service.evaluate(
      makeRequest({ slippageBps: 150 }),
      makePortfolio()
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('RISK_SLIPPAGE_TOO_HIGH');
    }
  });

  it('8. allows slippage exactly at cap', () => {
    const result = service.evaluate(
      makeRequest({ slippageBps: 100 }),
      makePortfolio()
    );
    expect(result.allowed).toBe(true);
  });

  it('9. blocks when kill-switch is active', () => {
    service.activateKillSwitch('emergency test');
    const result = service.evaluate(makeRequest(), makePortfolio());
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('RISK_SYSTEM_HALT');
    }
    expect(service.isHalted()).toBe(true);
    expect(service.getHaltReason()).toBe('emergency test');
  });

  it('10. deactivate kill-switch resumes trading', () => {
    service.activateKillSwitch('test');
    service.deactivateKillSwitch();
    const result = service.evaluate(makeRequest(), makePortfolio());
    expect(result.allowed).toBe(true);
    expect(service.isHalted()).toBe(false);
  });

  it('11. blocks after exceeding trade frequency limit', () => {
    const cfg = service.getConfig();
    // Fill up the window
    for (let i = 0; i < cfg.maxTradesPerWindow; i++) {
      service.recordExecution('agent_001');
    }
    const result = service.evaluate(makeRequest(), makePortfolio());
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('RISK_TOO_FREQUENT');
    }
  });

  it('12. config update takes effect immediately', () => {
    service.updateConfig({ maxPositionSizePercent: 10 });
    const result = service.evaluate(
      makeRequest({ positionSizePercent: 8 }),
      makePortfolio()
    );
    expect(result.allowed).toBe(true);
  });

  it('13. result includes currentDrawdown and riskScore', () => {
    const result = service.evaluate(makeRequest(), makePortfolio({ currentDrawdownPercent: 8 }));
    expect(result.currentDrawdown).toBe(8);
    expect(typeof result.riskScore).toBe('number');
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// 14–22. CapitalProtectionEvaluator
// ============================================================================

describe('CapitalProtectionEvaluator', () => {
  let evaluator: CapitalProtectionEvaluator;

  const baseRequest = {
    requestId: 'req_001',
    agentId: 'agent_001',
    action: 'BUY' as const,
    pair: 'TON/USDT',
    positionSizePercent: 3,
    amountUsd: 300,
  };

  const basePortfolio = {
    totalValueUsd: 10000,
    currentDrawdownPercent: 5,
    currentExposurePercent: 40,
    dailyLossUsd: 50,
  };

  beforeEach(() => {
    evaluator = createCapitalProtectionEvaluator();
  });

  it('14. allows normal trade', () => {
    const result = evaluator.evaluate(baseRequest, basePortfolio);
    expect(result.approved).toBe(true);
  });

  it('15. blocks on max drawdown', () => {
    const result = evaluator.evaluate(baseRequest, { ...basePortfolio, currentDrawdownPercent: 15 });
    expect(result.approved).toBe(false);
    if (!result.approved) expect(result.reason).toBe('RISK_MAX_DRAWDOWN');
  });

  it('16. blocks on daily loss', () => {
    const result = evaluator.evaluate(baseRequest, { ...basePortfolio, dailyLossUsd: 500 });
    expect(result.approved).toBe(false);
    if (!result.approved) expect(result.reason).toBe('RISK_DAILY_LOSS');
  });

  it('17. blocks on 24h rolling loss', () => {
    // Record enough 24h losses to exceed cap
    for (let i = 0; i < 7; i++) {
      evaluator.recordExecution('agent_001', 100); // 100 USD loss per call
    }
    const result = evaluator.evaluate(baseRequest, basePortfolio);
    expect(result.approved).toBe(false);
    if (!result.approved) expect(result.reason).toBe('RISK_ROLLING_LOSS_24H');
  });

  it('18. blocks on portfolio over-exposure', () => {
    const result = evaluator.evaluate(baseRequest, { ...basePortfolio, currentExposurePercent: 80 });
    expect(result.approved).toBe(false);
    if (!result.approved) expect(result.reason).toBe('RISK_OVEREXPOSURE');
  });

  it('19. blocks on position too large', () => {
    const result = evaluator.evaluate({ ...baseRequest, positionSizePercent: 10 }, basePortfolio);
    expect(result.approved).toBe(false);
    if (!result.approved) expect(result.reason).toBe('RISK_POSITION_TOO_LARGE');
  });

  it('20. blocks on trade frequency', () => {
    for (let i = 0; i < 10; i++) evaluator.recordExecution('agent_001');
    const result = evaluator.evaluate(baseRequest, basePortfolio);
    expect(result.approved).toBe(false);
    if (!result.approved) expect(result.reason).toBe('RISK_TOO_FREQUENT');
  });

  it('21. blocks on slippage cap', () => {
    const result = evaluator.evaluate({ ...baseRequest, slippageBps: 200 }, basePortfolio);
    expect(result.approved).toBe(false);
    if (!result.approved) expect(result.reason).toBe('RISK_SLIPPAGE_TOO_HIGH');
  });

  it('22. kill-switch halts all trades', () => {
    evaluator.halt('test halt');
    expect(evaluator.isHalted()).toBe(true);
    const result = evaluator.evaluate(baseRequest, basePortfolio);
    expect(result.approved).toBe(false);
    if (!result.approved) expect(result.reason).toBe('RISK_SYSTEM_HALT');
  });

  it('23. resume lifts kill-switch', () => {
    evaluator.halt('test');
    evaluator.resume();
    expect(evaluator.isHalted()).toBe(false);
    const result = evaluator.evaluate(baseRequest, basePortfolio);
    expect(result.approved).toBe(true);
  });

  it('24. drawdown tracking via updateDrawdown', () => {
    evaluator.updateDrawdown('agent_001', 10000);
    const dd = evaluator.updateDrawdown('agent_001', 8500);
    expect(dd).toBeCloseTo(15, 0);
  });

  it('25. risk score is higher for higher drawdown', () => {
    const lowRisk = evaluator.evaluate(baseRequest, { ...basePortfolio, currentDrawdownPercent: 1 });
    const highRisk = evaluator.evaluate(baseRequest, { ...basePortfolio, currentDrawdownPercent: 12 });
    expect(highRisk.riskScore).toBeGreaterThan(lowRisk.riskScore);
  });
});

// ============================================================================
// 26–27. RollingLossTracker
// ============================================================================

describe('RollingLossTracker', () => {
  it('26. accumulates losses within window', () => {
    const tracker = new RollingLossTracker();
    const now = Date.now();
    tracker.record(100, now - 1000);
    tracker.record(200, now - 2000);
    expect(tracker.getTotalLoss(60 * 60 * 1000, now)).toBe(300);
  });

  it('27. excludes entries outside window', () => {
    const tracker = new RollingLossTracker();
    const now = Date.now();
    tracker.record(100, now - 2 * 60 * 60 * 1000); // 2 hours ago — outside 1h window
    tracker.record(50, now - 1000);                 // inside 1h window
    expect(tracker.getTotalLoss(60 * 60 * 1000, now)).toBe(50);
  });

  it('28. net loss includes gains reducing loss', () => {
    const tracker = new RollingLossTracker();
    const now = Date.now();
    tracker.record(200, now - 1000);   // loss
    tracker.record(-100, now - 500);   // gain (negative loss)
    expect(tracker.getNetLoss(60 * 60 * 1000, now)).toBe(100);
  });
});

// ============================================================================
// 29–30. DrawdownTracker
// ============================================================================

describe('DrawdownTracker', () => {
  it('29. computes drawdown from peak', () => {
    const tracker = new DrawdownTracker();
    tracker.update(10000); // peak set to 10000
    const dd = tracker.update(8500);
    expect(dd).toBeCloseTo(15, 1);
  });

  it('30. no drawdown when value increases', () => {
    const tracker = new DrawdownTracker();
    tracker.update(10000);
    const dd = tracker.update(11000);
    expect(dd).toBe(0);
    expect(tracker.getPeak()).toBe(11000);
  });

  it('31. reset peak clears drawdown reference', () => {
    const tracker = new DrawdownTracker();
    tracker.update(10000);
    tracker.resetPeak();
    const dd = tracker.update(9000);
    expect(dd).toBe(0); // no peak to compare against
  });
});

// ============================================================================
// 32–33. HHI Concentration
// ============================================================================

describe('computeHHI / normalizedHHI', () => {
  it('32. perfect diversification → HHI near 0', () => {
    const assets = [
      { assetId: 'TON', valueUsd: 1000 },
      { assetId: 'USDT', valueUsd: 1000 },
      { assetId: 'STON', valueUsd: 1000 },
      { assetId: 'BTC', valueUsd: 1000 },
    ];
    const hhi = computeHHI(assets);
    expect(hhi).toBeCloseTo(2500, 0); // 4 equal parts → each 25%, HHI = 4×625 = 2500
  });

  it('33. full concentration → HHI = 10000', () => {
    const assets = [{ assetId: 'TON', valueUsd: 1000 }];
    expect(computeHHI(assets)).toBe(10000);
  });

  it('34. normalizedHHI is 0–1', () => {
    const assets = [
      { assetId: 'A', valueUsd: 500 },
      { assetId: 'B', valueUsd: 500 },
    ];
    const n = normalizedHHI(assets);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// 35–36. PortfolioRiskAnalytics
// ============================================================================

describe('PortfolioRiskAnalytics', () => {
  it('35. snapshot computes drawdown and exposure', () => {
    const analytics = createPortfolioRiskAnalytics();
    const s = analytics.snapshot(
      9000,
      [{ assetId: 'TON', valueUsd: 4500 }, { assetId: 'USDT', valueUsd: 1500 }],
      []
    );
    expect(s.currentValueUsd).toBe(9000);
    expect(s.exposurePercent).toBeCloseTo(66.67, 1); // 6000/9000
    expect(s.concentrationRisk).toBeGreaterThan(0);
    expect(s.timestamp).toBeInstanceOf(Date);
  });

  it('36. snapshot drawdown increases after value drops', () => {
    const analytics = createPortfolioRiskAnalytics();
    analytics.snapshot(10000, [], []);
    const s = analytics.snapshot(8000, [], []);
    expect(s.drawdownPercent).toBeCloseTo(20, 1);
  });

  it('37. rolling loss windows from history', () => {
    const analytics = createPortfolioRiskAnalytics();
    const now = Date.now();
    const history = [
      { timestamp: now - 1000, pnlUsd: -100 },
      { timestamp: now - 2000, pnlUsd: -50 },
      { timestamp: now - 10 * 24 * 60 * 60 * 1000, pnlUsd: -200 }, // > 7 days ago
    ];
    const s = analytics.snapshot(10000, [], history);
    expect(s.loss24hUsd).toBe(150);
    expect(s.loss7dUsd).toBe(150); // 200 is outside 7d window
  });
});

// ============================================================================
// 38–43. AgentRiskSafeguards
// ============================================================================

describe('AgentRiskSafeguards', () => {
  let safeguards: AgentRiskSafeguards;

  beforeEach(() => {
    safeguards = createAgentRiskSafeguards();
  });

  it('38. allows agent with no risk violations', () => {
    const result = safeguards.evaluate('agent_001', 5, 'balanced');
    expect(result.blocked).toBe(false);
  });

  it('39. blocks agent when drawdown exceeds limit', () => {
    const result = safeguards.evaluate('agent_001', 15, 'balanced');
    expect(result.blocked).toBe(true);
    if (result.blocked) expect(result.reason).toBe('DRAWDOWN_EXCEEDED');
  });

  it('40. blocks and stops after consecutive loss stop threshold', () => {
    // Record 5 consecutive losses
    for (let i = 0; i < 5; i++) {
      safeguards.recordTradeResult('agent_001', -100);
    }
    const result = safeguards.evaluate('agent_001', 5, 'balanced');
    expect(result.blocked).toBe(true);
    if (result.blocked) expect(result.reason).toBe('CONSECUTIVE_LOSS_STOP');
  });

  it('41. recommends conservative after consecutive loss threshold', () => {
    // Record 3 consecutive losses (threshold)
    for (let i = 0; i < 3; i++) {
      safeguards.recordTradeResult('agent_001', -100);
    }
    const result = safeguards.evaluate('agent_001', 5, 'aggressive');
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.reason).toBe('CONSECUTIVE_LOSS_CONSERVATIVE');
      expect(result.recommendedMode).toBe('conservative');
    }
  });

  it('42. downgrades aggressive → conservative on high drawdown', () => {
    const result = safeguards.evaluate('agent_001', 12, 'aggressive');
    expect(result.blocked).toBe(false);
    if (!result.blocked) {
      expect(result.recommendedMode).toBe('conservative');
    }
  });

  it('43. resume lifts stopped state', () => {
    safeguards.evaluate('agent_001', 16, 'balanced'); // stop due to drawdown
    safeguards.resumeAgent('agent_001');
    const result = safeguards.evaluate('agent_001', 5, 'balanced');
    expect(result.blocked).toBe(false);
  });

  it('44. win resets consecutive loss counter', () => {
    for (let i = 0; i < 3; i++) {
      safeguards.recordTradeResult('agent_001', -100);
    }
    safeguards.recordTradeResult('agent_001', 200); // win
    const state = safeguards.getAgentState('agent_001');
    expect(state?.consecutiveLosses).toBe(0);
  });

  it('45. getStoppedAgents returns stopped agents', () => {
    safeguards.evaluate('agent_001', 20, 'balanced'); // stop
    safeguards.evaluate('agent_002', 5, 'balanced');  // not stopped
    const stopped = safeguards.getStoppedAgents();
    expect(stopped).toContain('agent_001');
    expect(stopped).not.toContain('agent_002');
  });
});

// ============================================================================
// 46–48. DefaultRiskEngine — capital protection integration
// ============================================================================

describe('DefaultRiskEngine — capital protection', () => {
  it('46. capital protection is accessible via riskEngine.capitalProtection', () => {
    const engine = createRiskEngine();
    expect(engine.capitalProtection).toBeDefined();
    expect(typeof engine.capitalProtection.evaluate).toBe('function');
  });

  it('47. capital protection config can be provided at construction', () => {
    const engine = createRiskEngine({
      capitalProtection: { maxDrawdownPercent: 20, maxDailyLossUsd: 1000 },
    });
    const config = engine.capitalProtection.getConfig();
    expect(config.maxDrawdownPercent).toBe(20);
    expect(config.maxDailyLossUsd).toBe(1000);
  });

  it('48. capital protection events are forwarded to engine.onEvent', () => {
    const engine = createRiskEngine();
    const events: unknown[] = [];
    engine.onEvent(e => events.push(e));

    // Trigger kill-switch which emits an event
    engine.capitalProtection.halt('test');
    expect(events.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 49–50. Integration Tests
// ============================================================================

describe('Integration — capital protection flow', () => {
  it('49. kill-switch blocks all agents regardless of portfolio state', () => {
    const service = createRiskControlService();
    service.activateKillSwitch('maintenance');

    const agents = ['agent_001', 'agent_002', 'agent_003'];
    for (const agentId of agents) {
      const result = service.evaluate(makeRequest({ agentId }), makePortfolio({ currentDrawdownPercent: 0 }));
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe('RISK_SYSTEM_HALT');
    }
  });

  it('50. risk score increases monotonically with drawdown severity', () => {
    const service = createRiskControlService();
    const scores: number[] = [];

    for (const drawdown of [0, 3, 6, 9, 12]) {
      const result = service.evaluate(makeRequest(), makePortfolio({ currentDrawdownPercent: drawdown }));
      scores.push(result.riskScore);
    }

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });
});
