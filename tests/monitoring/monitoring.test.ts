/**
 * Tests for the Agent Monitoring Dashboard (Issue #215)
 *
 * Covers:
 * - MonitoringMetricsService: dashboard overview, metrics, positions, trades, equity curve, risk
 * - MonitoringApi: all REST endpoints, error handling, routing
 * - Dashboard renderers: overview, metrics panel, positions, trades, risk, equity curve
 * - Event system: real-time updates, unsubscribe
 * - MonitoringError: instanceof, code, metadata
 * - Factory functions: createMonitoringMetricsService, createMonitoringApi, createDemoMonitoringApi
 *
 * Test cases from Issue #215:
 * - Multiple agents monitored simultaneously
 * - Large trade histories
 * - High-frequency portfolio updates
 * - Dashboard with 10+ active agents
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  MonitoringMetricsService,
  MonitoringApi,
  MonitoringError,
  createMonitoringMetricsService,
  createMonitoringApi,
  createDemoMonitoringApi,
  createDemoMonitoringMetricsService,
  DEFAULT_MONITORING_CONFIG,
  // Dashboard renderers
  renderDashboardOverview,
  renderMetricsPanel,
  renderPositionsTable,
  renderTradesTable,
  renderRiskPanel,
  renderEquityCurve,
  getStatusEmoji,
  getRiskEmoji,
  formatPnl,
  formatRoi,
  formatCurrency,
} from '../../services/monitoring';

import type {
  AgentDashboardSummary,
  AgentMetrics,
  MonitoringApiRequest,
  MonitoringUpdate,
  DashboardOverview,
  PositionsResponse,
  TradeHistoryResponse,
  RiskIndicators,
  EquityCurveResponse,
} from '../../services/monitoring';

// ============================================================================
// Test Helpers
// ============================================================================

function makeRequest(
  method: MonitoringApiRequest['method'],
  path: string,
  query?: Record<string, string>
): MonitoringApiRequest {
  return { method, path, query };
}

function makeDemoAgent(id: string, overrides?: Partial<AgentDashboardSummary>): AgentDashboardSummary {
  return {
    agentId: id,
    name: `Agent ${id}`,
    status: 'RUNNING',
    strategy: 'test_strategy',
    portfolioValue: 10000,
    roi: 0,
    ownerId: 'user_001',
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// DEFAULT_MONITORING_CONFIG
// ============================================================================

describe('DEFAULT_MONITORING_CONFIG', () => {
  it('should be enabled by default', () => {
    expect(DEFAULT_MONITORING_CONFIG.enabled).toBe(true);
  });

  it('should have a positive update interval', () => {
    expect(DEFAULT_MONITORING_CONFIG.updateIntervalMs).toBeGreaterThan(0);
  });

  it('should have real-time updates enabled', () => {
    expect(DEFAULT_MONITORING_CONFIG.enableRealTimeUpdates).toBe(true);
  });

  it('should have metrics cache enabled', () => {
    expect(DEFAULT_MONITORING_CONFIG.enableMetricsCache).toBe(true);
  });
});

// ============================================================================
// MonitoringMetricsService
// ============================================================================

describe('MonitoringMetricsService', () => {
  let service: MonitoringMetricsService;

  beforeEach(() => {
    service = createMonitoringMetricsService();
  });

  describe('Agent Registration', () => {
    it('should register a new agent', () => {
      const agent = makeDemoAgent('agent_001');
      service.registerAgent(agent);
      expect(service.hasAgent('agent_001')).toBe(true);
    });

    it('should get agent summary', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      const summary = service.getAgentSummary('agent_001');
      expect(summary.agentId).toBe('agent_001');
    });

    it('should throw for unknown agent', () => {
      expect(() => service.getAgentSummary('unknown')).toThrow(MonitoringError);
      try {
        service.getAgentSummary('unknown');
      } catch (e) {
        expect((e as MonitoringError).code).toBe('AGENT_NOT_FOUND');
      }
    });

    it('should update agent', () => {
      service.registerAgent(makeDemoAgent('agent_001', { portfolioValue: 10000 }));
      const updated = service.updateAgent('agent_001', { portfolioValue: 11000 });
      expect(updated.portfolioValue).toBe(11000);
    });

    it('should remove agent', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      service.removeAgent('agent_001');
      expect(service.hasAgent('agent_001')).toBe(false);
    });
  });

  describe('Dashboard Overview', () => {
    it('should return empty overview initially', () => {
      const overview = service.getDashboardOverview();
      expect(overview.totalAgents).toBe(0);
      expect(overview.agents).toHaveLength(0);
    });

    it('should include all registered agents', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      service.registerAgent(makeDemoAgent('agent_002'));
      service.registerAgent(makeDemoAgent('agent_003'));

      const overview = service.getDashboardOverview();
      expect(overview.totalAgents).toBe(3);
      expect(overview.agents).toHaveLength(3);
    });

    it('should count agents by status', () => {
      service.registerAgent(makeDemoAgent('agent_001', { status: 'RUNNING' }));
      service.registerAgent(makeDemoAgent('agent_002', { status: 'RUNNING' }));
      service.registerAgent(makeDemoAgent('agent_003', { status: 'PAUSED' }));
      service.registerAgent(makeDemoAgent('agent_004', { status: 'ERROR' }));

      const overview = service.getDashboardOverview();
      expect(overview.statusCounts.RUNNING).toBe(2);
      expect(overview.statusCounts.PAUSED).toBe(1);
      expect(overview.statusCounts.ERROR).toBe(1);
    });
  });

  describe('Metrics', () => {
    it('should return metrics for registered agent', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      const metrics = service.getAgentMetrics('agent_001');
      expect(metrics.agentId).toBe('agent_001');
      expect(metrics).toHaveProperty('portfolioValue');
      expect(metrics).toHaveProperty('roi');
    });

    it('should throw for unknown agent', () => {
      expect(() => service.getAgentMetrics('unknown')).toThrow(MonitoringError);
    });

    it('should cache metrics', () => {
      service.registerAgent(makeDemoAgent('agent_001'));

      // First call - should calculate
      const metrics1 = service.getAgentMetrics('agent_001');

      // Second call - should use cache
      const metrics2 = service.getAgentMetrics('agent_001');

      expect(metrics1.calculatedAt).toEqual(metrics2.calculatedAt);
    });
  });

  describe('Positions', () => {
    it('should return positions for registered agent', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      const response = service.getPositions('agent_001');
      expect(response.agentId).toBe('agent_001');
      expect(response).toHaveProperty('positions');
      expect(response).toHaveProperty('total');
    });

    it('should throw for unknown agent', () => {
      expect(() => service.getPositions('unknown')).toThrow(MonitoringError);
    });
  });

  describe('Trades', () => {
    it('should return trades for registered agent', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      const response = service.getTrades('agent_001');
      expect(response.agentId).toBe('agent_001');
      expect(response).toHaveProperty('trades');
      expect(response).toHaveProperty('total');
    });

    it('should support pagination', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      const response = service.getTrades('agent_001', 10, 0);
      expect(response.limit).toBe(10);
      expect(response.offset).toBe(0);
    });

    it('should throw for unknown agent', () => {
      expect(() => service.getTrades('unknown')).toThrow(MonitoringError);
    });
  });

  describe('Equity Curve', () => {
    it('should return equity curve for registered agent', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      const response = service.getEquityCurve('agent_001', 'day');
      expect(response.agentId).toBe('agent_001');
      expect(response.timeframe).toBe('day');
      expect(response.curve.length).toBeGreaterThan(0);
    });

    it('should support different timeframes', () => {
      service.registerAgent(makeDemoAgent('agent_001'));

      const hourly = service.getEquityCurve('agent_001', 'hour');
      const daily = service.getEquityCurve('agent_001', 'day');
      const weekly = service.getEquityCurve('agent_001', 'week');

      expect(hourly.timeframe).toBe('hour');
      expect(daily.timeframe).toBe('day');
      expect(weekly.timeframe).toBe('week');
    });

    it('should throw for invalid timeframe', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      expect(() => service.getEquityCurve('agent_001', 'invalid' as never)).toThrow(MonitoringError);
      try {
        service.getEquityCurve('agent_001', 'invalid' as never);
      } catch (e) {
        expect((e as MonitoringError).code).toBe('INVALID_TIMEFRAME');
      }
    });

    it('should throw for unknown agent', () => {
      expect(() => service.getEquityCurve('unknown')).toThrow(MonitoringError);
    });
  });

  describe('Risk Indicators', () => {
    it('should return risk indicators for registered agent', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      const risk = service.getRiskIndicators('agent_001');
      expect(risk.agentId).toBe('agent_001');
      expect(risk).toHaveProperty('riskLevel');
      expect(risk).toHaveProperty('drawdown');
      expect(risk).toHaveProperty('exposure');
    });

    it('should throw for unknown agent', () => {
      expect(() => service.getRiskIndicators('unknown')).toThrow(MonitoringError);
    });
  });

  describe('Event System', () => {
    it('should emit update on agent registration', () => {
      const updates: MonitoringUpdate[] = [];
      service.subscribe(u => updates.push(u));

      service.registerAgent(makeDemoAgent('agent_001'));

      expect(updates).toHaveLength(1);
      expect(updates[0].type).toBe('agent.status_changed');
    });

    it('should emit update on status change', () => {
      service.registerAgent(makeDemoAgent('agent_001', { status: 'RUNNING' }));

      const updates: MonitoringUpdate[] = [];
      service.subscribe(u => updates.push(u));

      service.updateAgent('agent_001', { status: 'PAUSED' });

      const statusUpdate = updates.find(u => u.type === 'agent.status_changed');
      expect(statusUpdate).toBeDefined();
    });

    it('should emit update on portfolio value change', () => {
      service.registerAgent(makeDemoAgent('agent_001', { portfolioValue: 10000 }));

      const updates: MonitoringUpdate[] = [];
      service.subscribe(u => updates.push(u));

      service.updateAgent('agent_001', { portfolioValue: 11000 });

      const valueUpdate = updates.find(u => u.type === 'portfolio.value_updated');
      expect(valueUpdate).toBeDefined();
    });

    it('should stop emitting after unsubscribe', () => {
      const updates: MonitoringUpdate[] = [];
      const unsub = service.subscribe(u => updates.push(u));
      unsub();

      service.registerAgent(makeDemoAgent('agent_001'));

      expect(updates).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should throw for empty agent ID', () => {
      expect(() => service.getAgentSummary('')).toThrow(MonitoringError);
      try {
        service.getAgentSummary('');
      } catch (e) {
        expect((e as MonitoringError).code).toBe('INVALID_AGENT_ID');
      }
    });
  });

  describe('Stats', () => {
    it('should return service statistics', () => {
      service.registerAgent(makeDemoAgent('agent_001'));
      service.registerAgent(makeDemoAgent('agent_002'));

      const stats = service.getStats();
      expect(stats.agents).toBe(2);
    });
  });
});

// ============================================================================
// MonitoringApi
// ============================================================================

describe('MonitoringApi', () => {
  let api: MonitoringApi;

  beforeEach(() => {
    api = createDemoMonitoringApi();
  });

  describe('GET /api/monitoring/dashboard', () => {
    it('should return dashboard overview', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/dashboard'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('agents');
      expect(res.body.data).toHaveProperty('totalAgents');
      expect(res.body.data).toHaveProperty('statusCounts');
    });

    it('should include all demo agents', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/dashboard'));

      const data = res.body.data as DashboardOverview;
      expect(data.totalAgents).toBeGreaterThan(0);
    });
  });

  describe('GET /api/monitoring/agents/:id/metrics', () => {
    it('should return agent metrics', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/agent_001/metrics'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('portfolioValue');
      expect(res.body.data).toHaveProperty('roi');
    });

    it('should return 404 for unknown agent', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/unknown/metrics'));

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/monitoring/agents/:id/positions', () => {
    it('should return agent positions', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/agent_001/positions'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('positions');
      expect(res.body.data).toHaveProperty('total');
    });

    it('should return 404 for unknown agent', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/unknown/positions'));

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/monitoring/agents/:id/trades', () => {
    it('should return trade history', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/agent_001/trades'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trades');
      expect(res.body.data).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      const res = await api.handle(
        makeRequest('GET', '/api/monitoring/agents/agent_001/trades', { limit: '5', offset: '0' })
      );

      expect(res.statusCode).toBe(200);
      const data = res.body.data as TradeHistoryResponse;
      expect(data.limit).toBe(5);
      expect(data.offset).toBe(0);
    });

    it('should return 404 for unknown agent', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/unknown/trades'));

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/monitoring/agents/:id/performance', () => {
    it('should return equity curve', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/agent_001/performance'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('curve');
      expect(res.body.data).toHaveProperty('timeframe');
    });

    it('should support timeframe query param', async () => {
      const res = await api.handle(
        makeRequest('GET', '/api/monitoring/agents/agent_001/performance', { timeframe: 'week' })
      );

      expect(res.statusCode).toBe(200);
      const data = res.body.data as EquityCurveResponse;
      expect(data.timeframe).toBe('week');
    });

    it('should return 404 for unknown agent', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/unknown/performance'));

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/monitoring/agents/:id/risk', () => {
    it('should return risk indicators', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/agent_001/risk'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('riskLevel');
      expect(res.body.data).toHaveProperty('drawdown');
      expect(res.body.data).toHaveProperty('exposure');
    });

    it('should return 404 for unknown agent', async () => {
      const res = await api.handle(makeRequest('GET', '/api/monitoring/agents/unknown/risk'));

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unknown path', async () => {
      const res = await api.handle(makeRequest('GET', '/api/unknown'));

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 for unsupported method', async () => {
      const res = await api.handle(makeRequest('DELETE', '/api/monitoring/dashboard'));

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getService', () => {
    it('should expose the underlying service', () => {
      expect(api.getService()).toBeInstanceOf(MonitoringMetricsService);
    });
  });
});

// ============================================================================
// MonitoringError
// ============================================================================

describe('MonitoringError', () => {
  it('should be instanceof MonitoringError and Error', () => {
    const err = new MonitoringError('test', 'AGENT_NOT_FOUND');
    expect(err).toBeInstanceOf(MonitoringError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should expose code and message', () => {
    const err = new MonitoringError('oops', 'INVALID_AGENT_ID', { agentId: '123' });
    expect(err.code).toBe('INVALID_AGENT_ID');
    expect(err.message).toBe('oops');
    expect(err.metadata).toEqual({ agentId: '123' });
  });

  it('should have name MonitoringError', () => {
    const err = new MonitoringError('x', 'OPERATION_FAILED');
    expect(err.name).toBe('MonitoringError');
  });
});

// ============================================================================
// Dashboard Renderers
// ============================================================================

describe('Dashboard Renderers', () => {
  describe('getStatusEmoji', () => {
    it('should return correct emoji for each status', () => {
      expect(getStatusEmoji('RUNNING')).toBe('🟢');
      expect(getStatusEmoji('PAUSED')).toBe('🟡');
      expect(getStatusEmoji('STOPPED')).toBe('⚫');
      expect(getStatusEmoji('ERROR')).toBe('🔴');
      expect(getStatusEmoji('CREATED')).toBe('⚪');
    });
  });

  describe('getRiskEmoji', () => {
    it('should return correct emoji for each risk level', () => {
      expect(getRiskEmoji('low')).toBe('🟢');
      expect(getRiskEmoji('medium')).toBe('🟡');
      expect(getRiskEmoji('high')).toBe('🟠');
      expect(getRiskEmoji('critical')).toBe('🔴');
    });
  });

  describe('formatPnl', () => {
    it('should format positive PnL with plus sign', () => {
      expect(formatPnl(100)).toBe('+100.00');
    });

    it('should format negative PnL', () => {
      expect(formatPnl(-50)).toBe('-50.00');
    });

    it('should format zero', () => {
      expect(formatPnl(0)).toBe('0.00');
    });
  });

  describe('formatRoi', () => {
    it('should format positive ROI with plus sign', () => {
      expect(formatRoi(5.5)).toBe('+5.5%');
    });

    it('should format negative ROI', () => {
      expect(formatRoi(-3.2)).toBe('-3.2%');
    });

    it('should format zero', () => {
      expect(formatRoi(0)).toBe('0.0%');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with default $ symbol', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format large numbers with commas', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });
  });

  describe('renderDashboardOverview', () => {
    it('should render dashboard overview as text', () => {
      const overview: DashboardOverview = {
        agents: [
          makeDemoAgent('agent_001', { name: 'Momentum Agent', status: 'RUNNING', portfolioValue: 10420, roi: 4.2 }),
          makeDemoAgent('agent_002', { name: 'Mean Reversion', status: 'PAUSED', portfolioValue: 9800, roi: -2.0 }),
        ],
        totalAgents: 2,
        statusCounts: { CREATED: 0, RUNNING: 1, PAUSED: 1, STOPPED: 0, ERROR: 0 },
        generatedAt: new Date(),
      };

      const rendered = renderDashboardOverview(overview);

      expect(rendered).toContain('AGENT MONITORING DASHBOARD');
      expect(rendered).toContain('Momentum Agent');
      expect(rendered).toContain('Mean Reversion');
      expect(rendered).toContain('🟢');
      expect(rendered).toContain('🟡');
      expect(rendered).toContain('2 agents');
    });
  });

  describe('renderMetricsPanel', () => {
    it('should render metrics panel', () => {
      const metrics: AgentMetrics = {
        agentId: 'agent_001',
        portfolioValue: 10420,
        initialCapital: 10000,
        totalProfit: 420,
        roi: 4.2,
        maxDrawdown: -3.1,
        currentDrawdown: -1.2,
        tradeCount: 24,
        winningTrades: 15,
        losingTrades: 9,
        winRate: 62.5,
        avgProfit: 35,
        avgLoss: -22,
        profitFactor: 1.89,
        totalFees: 24.50,
        calculatedAt: new Date(),
      };

      const rendered = renderMetricsPanel(metrics, 'Momentum Agent');

      expect(rendered).toContain('METRICS');
      expect(rendered).toContain('Portfolio Value');
      expect(rendered).toContain('ROI');
      expect(rendered).toContain('Trades');
    });
  });

  describe('renderPositionsTable', () => {
    it('should render positions table', () => {
      const response: PositionsResponse = {
        positions: [
          {
            positionId: 'pos_001',
            agentId: 'agent_001',
            asset: 'TON',
            size: 200,
            entryPrice: 5.21,
            currentPrice: 5.34,
            unrealizedPnl: 26,
            unrealizedPnlPct: 2.5,
            openedAt: new Date(),
          },
        ],
        total: 1,
        agentId: 'agent_001',
      };

      const rendered = renderPositionsTable(response);

      expect(rendered).toContain('ACTIVE POSITIONS');
      expect(rendered).toContain('TON');
      expect(rendered).toContain('200');
    });

    it('should handle empty positions', () => {
      const response: PositionsResponse = {
        positions: [],
        total: 0,
        agentId: 'agent_001',
      };

      const rendered = renderPositionsTable(response);

      expect(rendered).toContain('No active positions');
    });
  });

  describe('renderTradesTable', () => {
    it('should render trades table', () => {
      const response: TradeHistoryResponse = {
        trades: [
          {
            tradeId: 'trade_001',
            agentId: 'agent_001',
            pair: 'TON/USDT',
            side: 'BUY',
            price: 5.21,
            quantity: 200,
            value: 1042,
            realizedPnl: 0,
            timestamp: new Date(),
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
        agentId: 'agent_001',
      };

      const rendered = renderTradesTable(response);

      expect(rendered).toContain('RECENT TRADES');
      expect(rendered).toContain('TON/USDT');
      expect(rendered).toContain('BUY');
    });

    it('should handle empty trades', () => {
      const response: TradeHistoryResponse = {
        trades: [],
        total: 0,
        limit: 100,
        offset: 0,
        agentId: 'agent_001',
      };

      const rendered = renderTradesTable(response);

      expect(rendered).toContain('No trades executed');
    });
  });

  describe('renderRiskPanel', () => {
    it('should render risk panel', () => {
      const risk: RiskIndicators = {
        agentId: 'agent_001',
        riskLevel: 'medium',
        drawdown: -3.1,
        exposure: 18,
        concentration: 35,
        openPositions: 2,
        valueAtRisk: 520,
        dailyLossUsage: 15,
        calculatedAt: new Date(),
      };

      const rendered = renderRiskPanel(risk);

      expect(rendered).toContain('RISK INDICATORS');
      expect(rendered).toContain('Medium');
      expect(rendered).toContain('🟡');
      expect(rendered).toContain('Drawdown');
    });
  });

  describe('renderEquityCurve', () => {
    it('should render equity curve', () => {
      const curve: EquityCurveResponse = {
        agentId: 'agent_001',
        curve: Array(50).fill(null).map((_, i) => ({
          timestamp: new Date(Date.now() - (50 - i) * 3600000),
          value: 10000 + i * 10,
          cumulativePnl: i * 10,
          drawdown: 0,
        })),
        timeframe: 'day',
        pointCount: 50,
      };

      const rendered = renderEquityCurve(curve);

      expect(rendered).toContain('PORTFOLIO VALUE');
      expect(rendered).toContain('24 Hours');
    });

    it('should handle empty curve', () => {
      const curve: EquityCurveResponse = {
        agentId: 'agent_001',
        curve: [],
        timeframe: 'day',
        pointCount: 0,
      };

      const rendered = renderEquityCurve(curve);

      expect(rendered).toContain('No equity data available');
    });
  });
});

// ============================================================================
// Factory Functions
// ============================================================================

describe('Factory Functions', () => {
  describe('createMonitoringMetricsService', () => {
    it('should create an empty service', () => {
      const service = createMonitoringMetricsService();
      const stats = service.getStats();
      expect(stats.agents).toBe(0);
    });

    it('should accept custom config', () => {
      const service = createMonitoringMetricsService({ updateIntervalMs: 1000 });
      expect(service).toBeInstanceOf(MonitoringMetricsService);
    });
  });

  describe('createDemoMonitoringMetricsService', () => {
    it('should create service with demo data', () => {
      const service = createDemoMonitoringMetricsService();
      const stats = service.getStats();
      expect(stats.agents).toBeGreaterThan(0);
    });
  });

  describe('createMonitoringApi', () => {
    it('should create API with empty service', () => {
      const api = createMonitoringApi();
      expect(api).toBeInstanceOf(MonitoringApi);
    });
  });

  describe('createDemoMonitoringApi', () => {
    it('should create API with demo data', async () => {
      const api = createDemoMonitoringApi();
      const res = await api.handle(makeRequest('GET', '/api/monitoring/dashboard'));

      expect(res.statusCode).toBe(200);
      const data = res.body.data as DashboardOverview;
      expect(data.totalAgents).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Issue #215 Test Cases
// ============================================================================

describe('Issue #215 Test Cases', () => {
  describe('Multiple agents monitored simultaneously', () => {
    it('should handle 10+ agents', () => {
      const service = createMonitoringMetricsService();

      // Register 15 agents
      for (let i = 1; i <= 15; i++) {
        service.registerAgent(makeDemoAgent(`agent_${i.toString().padStart(3, '0')}`));
      }

      const overview = service.getDashboardOverview();
      expect(overview.totalAgents).toBe(15);
    });

    it('should track metrics for multiple agents independently', () => {
      const service = createMonitoringMetricsService();

      service.registerAgent(makeDemoAgent('agent_001', { portfolioValue: 10000 }));
      service.registerAgent(makeDemoAgent('agent_002', { portfolioValue: 20000 }));

      const metrics1 = service.getAgentMetrics('agent_001');
      const metrics2 = service.getAgentMetrics('agent_002');

      // Metrics are calculated independently
      expect(metrics1.agentId).toBe('agent_001');
      expect(metrics2.agentId).toBe('agent_002');
    });
  });

  describe('Large trade histories', () => {
    it('should support pagination for large trade datasets', async () => {
      const api = createDemoMonitoringApi();

      // Request with pagination
      const res = await api.handle(
        makeRequest('GET', '/api/monitoring/agents/agent_001/trades', { limit: '10', offset: '0' })
      );

      expect(res.statusCode).toBe(200);
      const data = res.body.data as TradeHistoryResponse;
      expect(data.limit).toBe(10);
    });
  });

  describe('High-frequency portfolio updates', () => {
    it('should emit updates on rapid changes', () => {
      const service = createMonitoringMetricsService();
      // Start with a different initial value so all 100 updates are captured
      service.registerAgent(makeDemoAgent('agent_001', { portfolioValue: 5000 }));

      const updates: MonitoringUpdate[] = [];
      service.subscribe(u => updates.push(u));

      // Simulate rapid updates (starting at 10000 which is different from initial 5000)
      for (let i = 0; i < 100; i++) {
        service.updateAgent('agent_001', { portfolioValue: 10000 + i });
      }

      // All updates should be captured (100 value changes)
      expect(updates.filter(u => u.type === 'portfolio.value_updated').length).toBe(100);
    });
  });

  describe('Dashboard with 10+ active agents', () => {
    it('should render dashboard with many agents', () => {
      const agents: AgentDashboardSummary[] = [];
      for (let i = 1; i <= 12; i++) {
        agents.push(makeDemoAgent(`agent_${i.toString().padStart(3, '0')}`, {
          name: `Agent ${i}`,
          status: i % 3 === 0 ? 'PAUSED' : 'RUNNING',
          portfolioValue: 10000 + i * 100,
          roi: (i - 6) * 0.5,
        }));
      }

      const overview: DashboardOverview = {
        agents,
        totalAgents: 12,
        statusCounts: { CREATED: 0, RUNNING: 8, PAUSED: 4, STOPPED: 0, ERROR: 0 },
        generatedAt: new Date(),
      };

      const rendered = renderDashboardOverview(overview);

      expect(rendered).toContain('12 agents');
      expect(rendered).toContain('8 Running');
      expect(rendered).toContain('4 Paused');
    });
  });
});
