/**
 * Tests for Observability Layer (Issue #275)
 *
 * Covers:
 * - Logger: levels, context, child logger, transports, test logger
 * - MetricsCollector: trading, agents, marketplace, system sub-collectors
 * - Counter / Gauge / Histogram primitives
 * - Snapshot serialization
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  Logger,
  createLogger,
  createTestLogger,
  createMemoryTransport,
  defaultConsoleTransport,
  DEFAULT_LOGGER_CONFIG,
  SimpleCounter,
  SimpleGauge,
  SimpleHistogram,
  TradingMetricsCollector,
  AgentMetricsCollector,
  MarketplaceMetricsCollector,
  SystemMetricsCollector,
  MetricsCollector,
  createMetricsCollector,
} from '../../services/observability';

import type { LogEvent, LogLevel } from '../../services/observability';

// ============================================================================
// DEFAULT_LOGGER_CONFIG
// ============================================================================

describe('DEFAULT_LOGGER_CONFIG', () => {
  it('should have minLevel info', () => {
    expect(DEFAULT_LOGGER_CONFIG.minLevel).toBe('info');
  });

  it('should not be pretty by default', () => {
    expect(DEFAULT_LOGGER_CONFIG.pretty).toBe(false);
  });
});

// ============================================================================
// Logger
// ============================================================================

describe('Logger', () => {
  describe('createLogger', () => {
    it('should create a Logger instance', () => {
      const log = createLogger('test-service');
      expect(log).toBeInstanceOf(Logger);
    });
  });

  describe('createTestLogger', () => {
    it('should capture log events in memory', () => {
      const { logger, events } = createTestLogger('svc');
      logger.info('hello');
      expect(events).toHaveLength(1);
      expect(events[0]?.message).toBe('hello');
    });

    it('should capture debug level (minLevel=debug in test logger)', () => {
      const { logger, events } = createTestLogger('svc');
      logger.debug('debug msg');
      expect(events.some((e) => e.level === 'debug')).toBe(true);
    });
  });

  describe('log levels', () => {
    it('should emit info, warn, error events', () => {
      const { logger, events } = createTestLogger('svc');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      expect(events.map((e) => e.level)).toEqual(['info', 'warn', 'error']);
    });

    it('should suppress levels below minLevel', () => {
      const { transport, events } = createMemoryTransport();
      const log = new Logger('svc', { minLevel: 'warn', pretty: false, transport });
      log.debug('d');
      log.info('i');
      log.warn('w');
      log.error('e');
      expect(events.map((e) => e.level)).toEqual(['warn', 'error']);
    });
  });

  describe('metadata', () => {
    it('should attach metadata to log events', () => {
      const { logger, events } = createTestLogger('svc');
      logger.info('trade', { agentId: 'agent_001', txHash: '0xabc' });
      expect(events[0]?.metadata?.agentId).toBe('agent_001');
      expect(events[0]?.metadata?.txHash).toBe('0xabc');
    });

    it('should include strategyId in metadata', () => {
      const { logger, events } = createTestLogger('svc');
      logger.info('strategy', { strategyId: 'dca_001' });
      expect(events[0]?.metadata?.strategyId).toBe('dca_001');
    });
  });

  describe('context', () => {
    it('withContext should return a child logger with persistent context', () => {
      const { logger, events } = createTestLogger('svc');
      const child = logger.withContext({ agentId: 'agent_99', userId: 'user_1' });
      child.info('child log');
      expect(events[0]?.metadata?.agentId).toBe('agent_99');
      expect(events[0]?.metadata?.userId).toBe('user_1');
    });

    it('setContext should merge context', () => {
      const { logger, events } = createTestLogger('svc');
      logger.setContext({ agentId: 'agent_01' });
      logger.info('msg');
      expect(events[0]?.metadata?.agentId).toBe('agent_01');
    });

    it('clearContext should remove context', () => {
      const { logger, events } = createTestLogger('svc');
      logger.setContext({ agentId: 'agent_01' });
      logger.clearContext();
      logger.info('msg');
      expect(events[0]?.metadata?.agentId).toBeUndefined();
    });

    it('child context should not bleed into parent', () => {
      const { logger, events } = createTestLogger('svc');
      logger.withContext({ agentId: 'child_agent' });
      logger.info('parent msg');
      expect(events[0]?.metadata?.agentId).toBeUndefined();
    });
  });

  describe('event shape', () => {
    it('should include service, level, message, timestamp', () => {
      const { logger, events } = createTestLogger('my-service');
      logger.info('test message');
      const e = events[0] as LogEvent;
      expect(e.service).toBe('my-service');
      expect(e.level).toBe('info');
      expect(e.message).toBe('test message');
      expect(typeof e.timestamp).toBe('string');
      expect(new Date(e.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('defaultConsoleTransport', () => {
    it('should not throw when called', () => {
      expect(() => defaultConsoleTransport({ level: 'info', service: 'x', message: 'y', timestamp: new Date().toISOString() })).not.toThrow();
    });
  });
});

// ============================================================================
// SimpleCounter
// ============================================================================

describe('SimpleCounter', () => {
  it('should start at 0', () => {
    expect(new SimpleCounter().value).toBe(0);
  });

  it('should increment by 1 by default', () => {
    const c = new SimpleCounter();
    c.increment();
    expect(c.value).toBe(1);
  });

  it('should increment by custom amount', () => {
    const c = new SimpleCounter();
    c.increment(5);
    expect(c.value).toBe(5);
  });

  it('should reset to 0', () => {
    const c = new SimpleCounter();
    c.increment(10);
    c.reset();
    expect(c.value).toBe(0);
  });
});

// ============================================================================
// SimpleGauge
// ============================================================================

describe('SimpleGauge', () => {
  it('should start at 0 by default', () => {
    expect(new SimpleGauge().value).toBe(0);
  });

  it('should accept initial value', () => {
    expect(new SimpleGauge(42).value).toBe(42);
  });

  it('should set to a value', () => {
    const g = new SimpleGauge();
    g.set(100);
    expect(g.value).toBe(100);
  });

  it('should increment and decrement', () => {
    const g = new SimpleGauge(10);
    g.increment(5);
    expect(g.value).toBe(15);
    g.decrement(3);
    expect(g.value).toBe(12);
  });
});

// ============================================================================
// SimpleHistogram
// ============================================================================

describe('SimpleHistogram', () => {
  it('should start empty', () => {
    const h = new SimpleHistogram();
    expect(h.count).toBe(0);
    expect(h.sum).toBe(0);
    expect(h.mean).toBe(0);
    expect(h.min).toBe(0);
    expect(h.max).toBe(0);
  });

  it('should record observations', () => {
    const h = new SimpleHistogram();
    h.observe(10);
    h.observe(20);
    h.observe(30);
    expect(h.count).toBe(3);
    expect(h.sum).toBe(60);
    expect(h.mean).toBe(20);
    expect(h.min).toBe(10);
    expect(h.max).toBe(30);
  });

  it('should reset', () => {
    const h = new SimpleHistogram();
    h.observe(100);
    h.reset();
    expect(h.count).toBe(0);
  });
});

// ============================================================================
// TradingMetricsCollector
// ============================================================================

describe('TradingMetricsCollector', () => {
  let collector: TradingMetricsCollector;

  beforeEach(() => {
    collector = new TradingMetricsCollector();
  });

  it('should start with zero values', () => {
    const snap = collector.snapshot();
    expect(snap.totalTrades).toBe(0);
    expect(snap.successRate).toBe(0);
  });

  it('should record successful trade', () => {
    collector.recordSuccess(120, 5);
    const snap = collector.snapshot();
    expect(snap.totalTrades).toBe(1);
    expect(snap.successfulTrades).toBe(1);
    expect(snap.failedTrades).toBe(0);
    expect(snap.successRate).toBe(100);
    expect(snap.avgExecutionTimeMs).toBe(120);
    expect(snap.avgSlippageBps).toBe(5);
  });

  it('should record failed trade', () => {
    collector.recordFailure(80);
    const snap = collector.snapshot();
    expect(snap.totalTrades).toBe(1);
    expect(snap.failedTrades).toBe(1);
    expect(snap.successfulTrades).toBe(0);
    expect(snap.successRate).toBe(0);
  });

  it('should calculate success rate correctly', () => {
    collector.recordSuccess(100, 3);
    collector.recordSuccess(120, 4);
    collector.recordFailure(90);
    const snap = collector.snapshot();
    expect(snap.successRate).toBeCloseTo(66.67, 1);
  });

  it('should reset', () => {
    collector.recordSuccess(100, 5);
    collector.reset();
    expect(collector.snapshot().totalTrades).toBe(0);
  });
});

// ============================================================================
// AgentMetricsCollector
// ============================================================================

describe('AgentMetricsCollector', () => {
  it('should track active and stopped agents', () => {
    const c = new AgentMetricsCollector();
    c.activeAgents.set(5);
    c.stoppedAgents.set(2);
    const snap = c.snapshot();
    expect(snap.activeAgents).toBe(5);
    expect(snap.stoppedAgents).toBe(2);
    expect(snap.totalAgents).toBe(7);
  });

  it('should track avg confidence score', () => {
    const c = new AgentMetricsCollector();
    c.recordConfidenceScore(0.8);
    c.recordConfidenceScore(0.9);
    const snap = c.snapshot();
    expect(snap.avgConfidenceScore).toBeCloseTo(0.85, 5);
  });

  it('should reset', () => {
    const c = new AgentMetricsCollector();
    c.activeAgents.set(10);
    c.reset();
    expect(c.snapshot().activeAgents).toBe(0);
  });
});

// ============================================================================
// MarketplaceMetricsCollector
// ============================================================================

describe('MarketplaceMetricsCollector', () => {
  it('should track subscriptions', () => {
    const c = new MarketplaceMetricsCollector();
    c.recordSubscription('dca_001');
    c.recordSubscription('dca_001');
    c.recordSubscription('grid_001');
    const snap = c.snapshot();
    expect(snap.activeSubscriptions).toBe(3);
    expect(snap.topStrategies[0]?.strategyId).toBe('dca_001');
    expect(snap.topStrategies[0]?.subscriptions).toBe(2);
  });

  it('should track unsubscriptions', () => {
    const c = new MarketplaceMetricsCollector();
    c.recordSubscription('dca_001');
    c.recordUnsubscription('dca_001');
    expect(c.snapshot().activeSubscriptions).toBe(0);
  });

  it('should track revenue per strategy', () => {
    const c = new MarketplaceMetricsCollector();
    c.recordRevenue('dca_001', 100);
    c.recordRevenue('dca_001', 50);
    c.recordRevenue('grid_001', 200);
    const snap = c.snapshot();
    expect(snap.revenuePerStrategy['dca_001']).toBe(150);
    expect(snap.revenuePerStrategy['grid_001']).toBe(200);
    expect(snap.totalRevenue).toBe(350);
  });
});

// ============================================================================
// SystemMetricsCollector
// ============================================================================

describe('SystemMetricsCollector', () => {
  it('should track API latency', () => {
    const c = new SystemMetricsCollector();
    c.recordApiLatency(50);
    c.recordApiLatency(150);
    expect(c.snapshot().avgApiLatencyMs).toBe(100);
  });

  it('should track memory usage', () => {
    const c = new SystemMetricsCollector();
    c.setMemoryUsage(1024 * 1024 * 100);
    expect(c.snapshot().memoryUsageBytes).toBe(1024 * 1024 * 100);
  });

  it('should report uptime >= 0', () => {
    const c = new SystemMetricsCollector();
    expect(c.snapshot().uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should capture process memory without throwing', () => {
    const c = new SystemMetricsCollector();
    expect(() => c.captureProcessMemory()).not.toThrow();
  });
});

// ============================================================================
// MetricsCollector (unified)
// ============================================================================

describe('MetricsCollector', () => {
  it('should create via factory', () => {
    const m = createMetricsCollector();
    expect(m).toBeInstanceOf(MetricsCollector);
  });

  it('should produce a full snapshot', () => {
    const m = createMetricsCollector();
    m.trading.recordSuccess(100, 5);
    m.agents.activeAgents.set(3);
    m.marketplace.recordSubscription('strat_001');
    m.system.recordApiLatency(80);

    const snap = m.snapshot();
    expect(snap.trading.totalTrades).toBe(1);
    expect(snap.agents.activeAgents).toBe(3);
    expect(snap.marketplace.activeSubscriptions).toBe(1);
    expect(snap.system.avgApiLatencyMs).toBe(80);
    expect(typeof snap.collectedAt).toBe('string');
  });

  it('should reset all sub-collectors', () => {
    const m = createMetricsCollector();
    m.trading.recordSuccess(100, 5);
    m.agents.activeAgents.set(5);
    m.reset();
    const snap = m.snapshot();
    expect(snap.trading.totalTrades).toBe(0);
    expect(snap.agents.activeAgents).toBe(0);
  });
});
