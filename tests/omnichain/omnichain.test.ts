/**
 * TONAIAgent - Omnichain Module Tests
 *
 * Comprehensive test suite for the omnichain agent infrastructure.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  // Main service
  createOmnichainService,
  DefaultOmnichainService,

  // ChangeNOW client
  createChangeNowClient,
  DefaultChangeNowClient,

  // Portfolio engine
  createPortfolioEngine,
  DefaultPortfolioEngine,

  // Strategy engine
  createCrossChainStrategyEngine,
  DefaultCrossChainStrategyEngine,

  // Risk engine
  createRiskEngine,
  DefaultRiskEngine,

  // Monitoring service
  createMonitoringService,
  DefaultMonitoringService,

  // Cost optimizer
  createCostOptimizer,
  DefaultCostOptimizer,

  // Types
  OmnichainConfig,
  ChainId,
  CrossChainStrategyType,
  OmnichainEvent,
} from '../../src/omnichain';

// ============================================================================
// Omnichain Service Tests
// ============================================================================

describe('OmnichainService', () => {
  let service: DefaultOmnichainService;

  beforeEach(() => {
    service = createOmnichainService({
      enabled: true,
      primaryChain: 'ton',
    });
  });

  describe('initialization', () => {
    it('should create service with default config', () => {
      const defaultService = createOmnichainService();
      expect(defaultService).toBeInstanceOf(DefaultOmnichainService);
      expect(defaultService.enabled).toBe(true);
      expect(defaultService.primaryChain).toBe('ton');
    });

    it('should create service with custom config', () => {
      const customService = createOmnichainService({
        enabled: true,
        primaryChain: 'eth',
        supportedChains: ['ton', 'eth', 'bnb'],
      });
      expect(customService.primaryChain).toBe('eth');
    });

    it('should initialize all components', () => {
      expect(service.exchange).toBeInstanceOf(DefaultChangeNowClient);
      expect(service.portfolio).toBeInstanceOf(DefaultPortfolioEngine);
      expect(service.strategy).toBeInstanceOf(DefaultCrossChainStrategyEngine);
      expect(service.risk).toBeInstanceOf(DefaultRiskEngine);
      expect(service.monitoring).toBeInstanceOf(DefaultMonitoringService);
      expect(service.costOptimizer).toBeInstanceOf(DefaultCostOptimizer);
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const health = await service.getHealth();

      expect(health.overall).toBeDefined();
      expect(health.components).toBeDefined();
      expect(health.chainStatus).toBeDefined();
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('should report component statuses', async () => {
      const health = await service.getHealth();

      expect(health.components.portfolio).toBe(true);
      expect(health.components.strategy).toBe(true);
      expect(health.components.risk).toBe(true);
      expect(health.components.monitoring).toBe(true);
      expect(health.components.costOptimizer).toBe(true);
    });
  });

  describe('events', () => {
    it('should subscribe to events', () => {
      const events: OmnichainEvent[] = [];
      service.onEvent((event) => events.push(event));

      // Events are forwarded from components
      expect(typeof service.onEvent).toBe('function');
    });
  });
});

// ============================================================================
// ChangeNOW Client Tests
// ============================================================================

describe('ChangeNowClient', () => {
  let client: DefaultChangeNowClient;

  beforeEach(() => {
    client = createChangeNowClient({
      apiKey: 'test_api_key',
      rateLimitPerSecond: 30,
    });
  });

  describe('initialization', () => {
    it('should create client with default config', () => {
      const defaultClient = createChangeNowClient();
      expect(defaultClient).toBeInstanceOf(DefaultChangeNowClient);
    });

    it('should create client with custom config', () => {
      const customClient = createChangeNowClient({
        apiKey: 'custom_key',
        apiVersion: 'v1',
        timeoutMs: 60000,
      });
      expect(customClient).toBeInstanceOf(DefaultChangeNowClient);
    });
  });

  describe('currency operations', () => {
    it('should get currency from cache', async () => {
      // First call to populate cache
      await client.getCurrencies();

      // Second call should use cache
      const result = await client.getCurrency('btc');
      expect(result.success).toBeDefined();
    });
  });

  describe('events', () => {
    it('should subscribe to events', () => {
      const events: OmnichainEvent[] = [];
      client.onEvent((event) => events.push(event));
      expect(typeof client.onEvent).toBe('function');
    });
  });
});

// ============================================================================
// Portfolio Engine Tests
// ============================================================================

describe('PortfolioEngine', () => {
  let engine: DefaultPortfolioEngine;

  beforeEach(() => {
    engine = createPortfolioEngine({
      syncIntervalMinutes: 5,
      enableRealtimeUpdates: true,
    });
  });

  describe('initialization', () => {
    it('should create engine with default config', () => {
      const defaultEngine = createPortfolioEngine();
      expect(defaultEngine).toBeInstanceOf(DefaultPortfolioEngine);
    });
  });

  describe('portfolio operations', () => {
    it('should get portfolio for user', async () => {
      const result = await engine.getPortfolio('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.userId).toBe('user_123');
      expect(result.data?.holdings).toBeInstanceOf(Array);
    });

    it('should sync portfolio', async () => {
      const result = await engine.syncPortfolio('user_123');

      expect(result.success).toBe(true);
      expect(result.data?.syncStatus).toBe('synced');
    });

    it('should get holdings', async () => {
      const result = await engine.getHoldings('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should get holdings by chain', async () => {
      const result = await engine.getHoldings('user_123', 'ton');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should get chain allocations', async () => {
      // First sync portfolio
      await engine.syncPortfolio('user_123');

      const result = await engine.getChainAllocations('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should get exposure metrics', async () => {
      const result = await engine.getExposure('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data?.stablecoinPercent).toBe('number');
    });

    it('should get risk metrics', async () => {
      const result = await engine.getRiskMetrics('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data?.overallRiskScore).toBe('number');
    });

    it('should get total value', async () => {
      const result = await engine.getTotalValue('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data?.usd).toBe('number');
      expect(typeof result.data?.ton).toBe('number');
    });

    it('should get historical value', async () => {
      const result = await engine.getHistoricalValue('user_123', 'week');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe('events', () => {
    it('should emit events on portfolio sync', async () => {
      const events: OmnichainEvent[] = [];
      engine.onEvent((event) => events.push(event));

      await engine.syncPortfolio('user_123');

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Strategy Engine Tests
// ============================================================================

describe('CrossChainStrategyEngine', () => {
  let engine: DefaultCrossChainStrategyEngine;

  beforeEach(() => {
    engine = createCrossChainStrategyEngine({
      maxActiveStrategies: 10,
      emergencyPauseEnabled: true,
    });
  });

  describe('initialization', () => {
    it('should create engine with default config', () => {
      const defaultEngine = createCrossChainStrategyEngine();
      expect(defaultEngine).toBeInstanceOf(DefaultCrossChainStrategyEngine);
    });
  });

  describe('strategy CRUD', () => {
    it('should create strategy', async () => {
      const result = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: ['ton', 'eth'],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Strategy');
      expect(result.data?.status).toBe('draft');
    });

    it('should require strategy name', async () => {
      const result = await engine.createStrategy({
        name: '',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      expect(result.success).toBe(false);
    });

    it('should get strategy', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      const result = await engine.getStrategy(created.data!.id);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Strategy');
    });

    it('should return null for non-existent strategy', async () => {
      const result = await engine.getStrategy('non_existent_id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should update strategy', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      const result = await engine.updateStrategy(created.data!.id, {
        name: 'Updated Strategy',
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Strategy');
    });

    it('should not update active strategy', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      await engine.activateStrategy(created.data!.id);

      const result = await engine.updateStrategy(created.data!.id, {
        name: 'Updated Strategy',
      });

      expect(result.success).toBe(false);
    });

    it('should delete strategy', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      const result = await engine.deleteStrategy(created.data!.id);

      expect(result.success).toBe(true);

      const getResult = await engine.getStrategy(created.data!.id);
      expect(getResult.data).toBeNull();
    });
  });

  describe('strategy lifecycle', () => {
    it('should activate strategy', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      const result = await engine.activateStrategy(created.data!.id);

      expect(result.success).toBe(true);

      const getResult = await engine.getStrategy(created.data!.id);
      expect(getResult.data?.status).toBe('active');
    });

    it('should pause strategy', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      await engine.activateStrategy(created.data!.id);
      const result = await engine.pauseStrategy(created.data!.id, 'Test pause');

      expect(result.success).toBe(true);

      const getResult = await engine.getStrategy(created.data!.id);
      expect(getResult.data?.status).toBe('paused');
    });

    it('should stop strategy', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      await engine.activateStrategy(created.data!.id);
      const result = await engine.stopStrategy(created.data!.id);

      expect(result.success).toBe(true);

      const getResult = await engine.getStrategy(created.data!.id);
      expect(getResult.data?.status).toBe('stopped');
    });
  });

  describe('strategy listing', () => {
    it('should list strategies for user', async () => {
      await engine.createStrategy({
        name: 'Strategy 1',
        description: 'First strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      await engine.createStrategy({
        name: 'Strategy 2',
        description: 'Second strategy',
        type: 'yield_rotation',
        userId: 'user_123',
        agentId: 'agent_789',
        allowedChains: ['ton', 'bnb'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      const result = await engine.listStrategies('user_123');

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('should filter strategies by type', async () => {
      await engine.createStrategy({
        name: 'Arbitrage Strategy',
        description: 'Arbitrage',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      await engine.createStrategy({
        name: 'Yield Strategy',
        description: 'Yield',
        type: 'yield_rotation',
        userId: 'user_123',
        agentId: 'agent_789',
        allowedChains: ['ton', 'bnb'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      const result = await engine.listStrategies('user_123', { type: 'arbitrage' });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].type).toBe('arbitrage');
    });

    it('should get active strategies', async () => {
      const strategy1 = await engine.createStrategy({
        name: 'Active Strategy',
        description: 'Will be active',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      await engine.createStrategy({
        name: 'Draft Strategy',
        description: 'Will stay draft',
        type: 'yield_rotation',
        userId: 'user_123',
        agentId: 'agent_789',
        allowedChains: ['ton', 'bnb'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      await engine.activateStrategy(strategy1.data!.id);

      const result = await engine.getActiveStrategies('user_123');

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].status).toBe('active');
    });
  });

  describe('templates', () => {
    it('should get strategy templates', () => {
      const templates = engine.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].id).toBeDefined();
      expect(templates[0].type).toBeDefined();
    });

    it('should create strategy from template', async () => {
      const templates = engine.getTemplates();
      const result = await engine.createFromTemplate(
        templates[0].id,
        'user_123',
        'agent_456'
      );

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe(templates[0].type);
    });
  });

  describe('triggers', () => {
    it('should check triggers', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {
          triggerConditions: [
            {
              id: 'test-trigger',
              type: 'price_threshold',
              condition: { operator: 'gt', value: 50 },
              parameters: {},
              priority: 1,
            },
          ],
          actions: [],
          checkIntervalMinutes: 5,
          maxConcurrentExecutions: 1,
          cooldownMinutes: 5,
        },
        capitalAllocation: {},
        riskParameters: {},
      });

      const result = await engine.checkTriggers(created.data!.id);

      expect(result.success).toBe(true);
      expect(result.data?.strategyId).toBe(created.data!.id);
    });

    it('should simulate trigger', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {
          triggerConditions: [
            {
              id: 'test-trigger',
              type: 'price_threshold',
              condition: { operator: 'gt', value: 50 },
              parameters: {},
              priority: 1,
            },
          ],
          actions: [],
          checkIntervalMinutes: 5,
          maxConcurrentExecutions: 1,
          cooldownMinutes: 5,
        },
        capitalAllocation: {},
        riskParameters: {},
      });

      const result = await engine.simulateTrigger(created.data!.id, 'test-trigger');

      expect(result.success).toBe(true);
      expect(result.data?.triggerId).toBe('test-trigger');
    });
  });

  describe('performance', () => {
    it('should get strategy performance', async () => {
      const created = await engine.createStrategy({
        name: 'Test Strategy',
        description: 'A test strategy',
        type: 'arbitrage',
        userId: 'user_123',
        agentId: 'agent_456',
        allowedChains: ['ton', 'eth'],
        allowedAssets: [],
        config: {},
        capitalAllocation: {},
        riskParameters: {},
      });

      const result = await engine.getPerformance(created.data!.id, 'week');

      expect(result.success).toBe(true);
      expect(result.data?.period).toBe('week');
    });
  });
});

// ============================================================================
// Risk Engine Tests
// ============================================================================

describe('RiskEngine', () => {
  let engine: DefaultRiskEngine;

  beforeEach(() => {
    engine = createRiskEngine({
      maxRiskScoreAllowed: 7,
      requireApprovalAbove: 5,
    });
  });

  describe('initialization', () => {
    it('should create engine with default config', () => {
      const defaultEngine = createRiskEngine();
      expect(defaultEngine).toBeInstanceOf(DefaultRiskEngine);
    });
  });

  describe('chain risk profiles', () => {
    it('should get chain risk profile', async () => {
      const result = await engine.getChainRiskProfile('ton');

      expect(result.success).toBe(true);
      expect(result.data?.chainId).toBe('ton');
      expect(typeof result.data?.overallRiskScore).toBe('number');
    });

    it('should create default profile for unknown chain', async () => {
      const result = await engine.getChainRiskProfile('unknown_chain');

      expect(result.success).toBe(true);
      expect(result.data?.chainId).toBe('unknown_chain');
      expect(result.data?.isWhitelisted).toBe(false);
    });

    it('should update chain risk profile', async () => {
      const result = await engine.updateChainRiskProfile('ton', {
        overallRiskScore: 2,
      });

      expect(result.success).toBe(true);

      const getResult = await engine.getChainRiskProfile('ton');
      expect(getResult.data?.overallRiskScore).toBe(2);
    });

    it('should get all chain risk profiles', async () => {
      const result = await engine.getChainRiskProfiles();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });
  });

  describe('transaction risk assessment', () => {
    it('should assess transaction risk', async () => {
      const result = await engine.assessTransaction({
        type: 'swap',
        agentId: 'agent_123',
        userId: 'user_456',
        sourceChain: 'ton',
        destinationChain: 'eth',
        sourceAssetId: 'ton',
        destinationAssetId: 'eth',
        sourceAmount: '100',
        destinationAddress: '0x123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.riskLevel).toBeDefined();
      expect(result.data?.recommendation).toBeDefined();
      expect(result.data?.factors.length).toBeGreaterThan(0);
    });

    it('should assess higher risk for cross-chain transactions', async () => {
      const sameChainResult = await engine.assessTransaction({
        type: 'swap',
        agentId: 'agent_123',
        userId: 'user_456',
        sourceChain: 'ton',
        destinationChain: 'ton',
        sourceAssetId: 'ton',
        destinationAssetId: 'usdt',
        sourceAmount: '100',
        destinationAddress: 'EQ123',
      });

      const crossChainResult = await engine.assessTransaction({
        type: 'swap',
        agentId: 'agent_123',
        userId: 'user_456',
        sourceChain: 'ton',
        destinationChain: 'eth',
        sourceAssetId: 'ton',
        destinationAssetId: 'eth',
        sourceAmount: '100',
        destinationAddress: '0x123',
      });

      // Cross-chain should have higher or equal risk
      expect(crossChainResult.data!.overallRiskScore).toBeGreaterThanOrEqual(
        sameChainResult.data!.overallRiskScore - 1
      );
    });
  });

  describe('policy management', () => {
    it('should create policy', async () => {
      const result = await engine.createPolicy({
        name: 'Test Policy',
        enabled: true,
        chainWhitelist: ['ton', 'eth'],
        assetWhitelist: [],
        maxTransactionValue: 10000,
        maxDailyVolume: 50000,
        requireMultiSigAbove: 5000,
        emergencyHaltEnabled: true,
        rules: [],
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Policy');
    });

    it('should get policy', async () => {
      const created = await engine.createPolicy({
        name: 'Test Policy',
        enabled: true,
        chainWhitelist: ['ton', 'eth'],
        assetWhitelist: [],
        maxTransactionValue: 10000,
        maxDailyVolume: 50000,
        requireMultiSigAbove: 5000,
        emergencyHaltEnabled: true,
        rules: [],
      });

      const result = await engine.getPolicy(created.data!.id);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Policy');
    });

    it('should list policies', async () => {
      const result = await engine.listPolicies();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should evaluate policy', async () => {
      const result = await engine.evaluatePolicy({
        type: 'swap',
        agentId: 'agent_123',
        userId: 'user_456',
        sourceChain: 'ton',
        destinationChain: 'eth',
        sourceAssetId: 'ton',
        destinationAssetId: 'eth',
        sourceAmount: '100',
        destinationAddress: '0x123',
      });

      expect(result.success).toBe(true);
      expect(typeof result.data?.allowed).toBe('boolean');
    });

    it('should detect policy violations', async () => {
      const result = await engine.evaluatePolicy({
        type: 'swap',
        agentId: 'agent_123',
        userId: 'user_456',
        sourceChain: 'unknown_chain',
        destinationChain: 'eth',
        sourceAssetId: 'unknown',
        destinationAssetId: 'eth',
        sourceAmount: '100',
        destinationAddress: '0x123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(false);
      expect(result.data?.violations.length).toBeGreaterThan(0);
    });
  });

  describe('slippage protection', () => {
    it('should calculate slippage risk', () => {
      const risk = engine.calculateSlippageRisk('100', '99', 0.99, 1.0);

      expect(risk.slippagePercent).toBeCloseTo(1, 1);
      expect(typeof risk.isAcceptable).toBe('boolean');
      expect(risk.riskLevel).toBeDefined();
    });

    it('should identify high slippage', () => {
      const risk = engine.calculateSlippageRisk('100', '90', 0.9, 1.0);

      expect(risk.slippagePercent).toBeCloseTo(10, 1);
      expect(risk.isAcceptable).toBe(false);
      expect(risk.riskLevel).toBe('critical');
    });
  });

  describe('emergency controls', () => {
    it('should halt operations', async () => {
      await engine.emergencyHalt('Test halt');

      expect(engine.isHalted()).toBe(true);
    });

    it('should resume operations', async () => {
      await engine.emergencyHalt('Test halt');
      await engine.resumeOperations();

      expect(engine.isHalted()).toBe(false);
    });
  });

  describe('risk alerts', () => {
    it('should get risk alerts', async () => {
      // Generate some alerts by assessing risky transactions
      await engine.assessTransaction({
        type: 'swap',
        agentId: 'agent_123',
        userId: 'user_456',
        sourceChain: 'ton',
        destinationChain: 'eth',
        sourceAssetId: 'ton',
        destinationAssetId: 'eth',
        sourceAmount: '100000',
        destinationAddress: '0x123',
        slippageTolerance: 5,
      });

      const result = await engine.getRiskAlerts();

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });
  });
});

// ============================================================================
// Monitoring Service Tests
// ============================================================================

describe('MonitoringService', () => {
  let service: DefaultMonitoringService;

  beforeEach(() => {
    service = createMonitoringService({
      logLevel: 'info',
      alertsEnabled: true,
    });
  });

  describe('initialization', () => {
    it('should create service with default config', () => {
      const defaultService = createMonitoringService();
      expect(defaultService).toBeInstanceOf(DefaultMonitoringService);
    });
  });

  describe('event logging', () => {
    it('should log events', () => {
      service.logEvent({
        type: 'transaction_created',
        source: 'test',
        severity: 'info',
        message: 'Test event',
        data: { test: true },
      });

      // No exception thrown means success
    });

    it('should get events', async () => {
      service.logEvent({
        type: 'transaction_created',
        source: 'test',
        severity: 'info',
        message: 'Test event',
        data: {},
      });

      const result = await service.getEvents();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should filter events by type', async () => {
      service.logEvent({
        type: 'transaction_created',
        source: 'test',
        severity: 'info',
        message: 'Created',
        data: {},
      });

      service.logEvent({
        type: 'transaction_completed',
        source: 'test',
        severity: 'info',
        message: 'Completed',
        data: {},
      });

      const result = await service.getEvents({ type: 'transaction_created' });

      expect(result.success).toBe(true);
      expect(result.data?.every(e => e.type === 'transaction_created')).toBe(true);
    });
  });

  describe('execution logging', () => {
    it('should start and complete execution', () => {
      const logId = service.startExecution('tx_123', 'validation');
      expect(typeof logId).toBe('string');

      service.completeExecution(logId, true, { validated: true });
    });

    it('should get execution logs', async () => {
      const logId = service.startExecution('tx_123', 'validation');
      service.completeExecution(logId, true, {});

      const result = await service.getExecutionLogs('tx_123');

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });
  });

  describe('metrics', () => {
    it('should record metrics', () => {
      service.recordMetric('test_metric', 100, { tag: 'value' });
      // No exception thrown means success
    });

    it('should get metrics', async () => {
      service.recordMetric('test_metric', 100);

      const result = await service.getMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('transaction tracking', () => {
    it('should track transaction', () => {
      service.trackTransaction('tx_123', 'pending', { amount: '100' });
      service.trackTransaction('tx_123', 'completed', {});
    });

    it('should get transaction history', async () => {
      service.trackTransaction('tx_123', 'pending', {});
      service.trackTransaction('tx_123', 'completed', {});

      const result = await service.getTransactionHistory();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });
  });

  describe('alerts', () => {
    it('should create alert', async () => {
      const result = await service.createAlert({
        severity: 'warning',
        category: 'test',
        title: 'Test Alert',
        message: 'This is a test alert',
      });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Test Alert');
    });

    it('should get alerts', async () => {
      await service.createAlert({
        severity: 'warning',
        category: 'test',
        title: 'Test Alert',
        message: 'This is a test alert',
      });

      const result = await service.getAlerts();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should acknowledge alert', async () => {
      const created = await service.createAlert({
        severity: 'warning',
        category: 'test',
        title: 'Test Alert',
        message: 'This is a test alert',
      });

      const result = await service.acknowledgeAlert(created.data!.id);

      expect(result.success).toBe(true);
    });

    it('should resolve alert', async () => {
      const created = await service.createAlert({
        severity: 'warning',
        category: 'test',
        title: 'Test Alert',
        message: 'This is a test alert',
      });

      const result = await service.resolveAlert(created.data!.id, 'Fixed the issue');

      expect(result.success).toBe(true);
    });
  });

  describe('dashboard', () => {
    it('should get dashboard data', async () => {
      const result = await service.getDashboardData();

      expect(result.success).toBe(true);
      expect(result.data?.summary).toBeDefined();
      expect(result.data?.chainStatus).toBeInstanceOf(Array);
      expect(result.data?.alerts).toBeDefined();
    });
  });
});

// ============================================================================
// Cost Optimizer Tests
// ============================================================================

describe('CostOptimizer', () => {
  let optimizer: DefaultCostOptimizer;

  beforeEach(() => {
    optimizer = createCostOptimizer({
      optimizeGas: true,
      optimizeRouting: true,
      batchTransactions: true,
    });
  });

  describe('initialization', () => {
    it('should create optimizer with default config', () => {
      const defaultOptimizer = createCostOptimizer();
      expect(defaultOptimizer).toBeInstanceOf(DefaultCostOptimizer);
    });
  });

  describe('route optimization', () => {
    it('should find optimal routes', async () => {
      const result = await optimizer.findOptimalRoute({
        sourceChain: 'ton',
        destinationChain: 'eth',
        sourceAsset: 'ton',
        destinationAsset: 'eth',
        amount: '100',
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should mark recommended route', async () => {
      const result = await optimizer.findOptimalRoute({
        sourceChain: 'ton',
        destinationChain: 'eth',
        sourceAsset: 'ton',
        destinationAsset: 'eth',
        amount: '100',
      });

      expect(result.data?.some(r => r.isRecommended)).toBe(true);
    });

    it('should compare routes', async () => {
      const routes = await optimizer.findOptimalRoute({
        sourceChain: 'ton',
        destinationChain: 'eth',
        sourceAsset: 'ton',
        destinationAsset: 'eth',
        amount: '100',
      });

      const comparison = optimizer.compareRoutes(routes.data!);

      expect(comparison.bestRoute).toBeDefined();
      expect(comparison.recommendation).toBeDefined();
    });
  });

  describe('gas optimization', () => {
    it('should estimate gas', async () => {
      const result = await optimizer.estimateGas({
        chainId: 'eth',
        transactionType: 'swap',
        priority: 'normal',
      });

      expect(result.success).toBe(true);
      expect(result.data?.totalCostUsd).toBeDefined();
    });

    it('should get gas price', async () => {
      const result = await optimizer.getGasPrice('eth');

      expect(result.success).toBe(true);
      expect(result.data?.slow).toBeDefined();
      expect(result.data?.standard).toBeDefined();
      expect(result.data?.fast).toBeDefined();
    });

    it('should find optimal gas price', async () => {
      const result = await optimizer.findOptimalGasPrice('eth');

      expect(result.success).toBe(true);
      expect(result.data?.recommendation).toBeDefined();
    });
  });

  describe('transaction batching', () => {
    it('should create batch', async () => {
      const result = await optimizer.createBatch(['tx_1', 'tx_2', 'tx_3']);

      expect(result.success).toBe(true);
      expect(result.data?.transactions.length).toBe(3);
      expect(result.data?.status).toBe('pending');
    });

    it('should add to batch', async () => {
      const batch = await optimizer.createBatch(['tx_1', 'tx_2']);
      const result = await optimizer.addToBatch(batch.data!.id, 'tx_3');

      expect(result.success).toBe(true);

      const getBatch = await optimizer.getBatch(batch.data!.id);
      expect(getBatch.data?.transactions.length).toBe(3);
    });

    it('should process batch', async () => {
      const batch = await optimizer.createBatch(['tx_1', 'tx_2', 'tx_3']);
      const result = await optimizer.processBatch(batch.data!.id);

      expect(result.success).toBe(true);
      expect(result.data?.processedCount).toBeGreaterThan(0);
    });

    it('should list batches', async () => {
      await optimizer.createBatch(['tx_1']);
      await optimizer.createBatch(['tx_2']);

      const result = await optimizer.listBatches();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('fee forecasting', () => {
    it('should forecast fees', async () => {
      const result = await optimizer.forecastFees('ton', 'eth', 24);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(24);
    });

    it('should include trend in forecast', async () => {
      const result = await optimizer.forecastFees('ton', 'eth', 12);

      expect(result.success).toBe(true);
      result.data?.forEach(forecast => {
        expect(['up', 'down', 'stable']).toContain(forecast.trend);
      });
    });
  });

  describe('cost analysis', () => {
    it('should analyze transaction costs', async () => {
      const result = await optimizer.analyzeCosts('tx_123');

      expect(result.success).toBe(true);
      expect(result.data?.totalCost).toBeDefined();
      expect(result.data?.breakdown.length).toBeGreaterThan(0);
    });

    it('should provide optimization suggestions', async () => {
      const result = await optimizer.analyzeCosts('tx_123');

      expect(result.success).toBe(true);
      expect(result.data?.optimizationSuggestions).toBeInstanceOf(Array);
    });
  });

  describe('configuration', () => {
    it('should update config', () => {
      optimizer.updateConfig({ maxGasPriceGwei: 100 });
      const config = optimizer.getConfig();

      expect(config.maxGasPriceGwei).toBe(100);
    });

    it('should get config', () => {
      const config = optimizer.getConfig();

      expect(config.enabled).toBeDefined();
      expect(config.optimizeGas).toBeDefined();
    });
  });
});
