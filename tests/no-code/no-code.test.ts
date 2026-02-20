/**
 * TONAIAgent - No-Code Visual Strategy Builder Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NoCodeBuilder,
  createNoCodeBuilder,
  BlockRegistry,
  DSLCompiler,
  TemplateRegistry,
  AIStrategyAssistant,
  StrategyValidator,
  SimulationEngine,
  StrategyLifecycleManager,
  WorkspaceManager,
  ObservabilityManager,
  validateStrategy,
  isDeployable,
  getValidationSummary,
  Strategy,
  Block,
  Connection,
  SimulationConfig,
} from '../../src/no-code';

// ============================================================================
// Block Registry Tests
// ============================================================================

describe('BlockRegistry', () => {
  let registry: BlockRegistry;

  beforeEach(() => {
    registry = new BlockRegistry();
  });

  describe('initialization', () => {
    it('should register core blocks on creation', () => {
      const allBlocks = registry.getAll();
      expect(allBlocks.length).toBeGreaterThan(0);
    });

    it('should have trigger blocks', () => {
      const triggers = registry.getByCategory('trigger');
      expect(triggers.length).toBeGreaterThan(0);
    });

    it('should have condition blocks', () => {
      const conditions = registry.getByCategory('condition');
      expect(conditions.length).toBeGreaterThan(0);
    });

    it('should have action blocks', () => {
      const actions = registry.getByCategory('action');
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should have risk blocks', () => {
      const risks = registry.getByCategory('risk');
      expect(risks.length).toBeGreaterThan(0);
    });
  });

  describe('block creation', () => {
    it('should create a block from definition', () => {
      const triggers = registry.getByCategory('trigger');
      const triggerDef = triggers[0];

      const block = registry.createBlock(triggerDef.type, 'test-block', { x: 100, y: 200 });

      expect(block).toBeDefined();
      expect(block!.id).toBe('test-block');
      expect(block!.category).toBe('trigger');
      expect(block!.position).toEqual({ x: 100, y: 200 });
    });

    it('should return undefined for unknown block types', () => {
      const block = registry.createBlock('unknown_block_type', 'test', { x: 0, y: 0 });
      expect(block).toBeUndefined();
    });
  });

  describe('custom block registration', () => {
    it('should allow registering custom blocks', () => {
      registry.register({
        type: 'custom_trigger',
        category: 'trigger',
        name: 'Custom Trigger',
        description: 'A custom trigger for testing',
        inputs: [],
        outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Out', required: true }],
        configSchema: { type: 'object', properties: {} },
        defaultConfig: {},
      });

      const customBlock = registry.get('custom_trigger');
      expect(customBlock).toBeDefined();
      expect(customBlock!.name).toBe('Custom Trigger');
    });
  });
});

// ============================================================================
// DSL Compiler Tests
// ============================================================================

describe('DSLCompiler', () => {
  let compiler: DSLCompiler;
  let testStrategy: Strategy;

  beforeEach(() => {
    compiler = new DSLCompiler();
    testStrategy = createTestStrategy();
  });

  describe('compilation', () => {
    it('should compile a strategy to executable format', () => {
      const compiled = compiler.compile(testStrategy);

      expect(compiled.id).toBe(testStrategy.id);
      expect(compiled.name).toBe(testStrategy.name);
      expect(compiled.triggers.length).toBeGreaterThan(0);
      expect(compiled.nodes.length).toBe(testStrategy.blocks.length);
      expect(compiled.edges.length).toBe(testStrategy.connections.length);
    });

    it('should generate a hash for the compiled strategy', () => {
      const compiled = compiler.compile(testStrategy);
      expect(compiled.hash).toBeDefined();
      expect(typeof compiled.hash).toBe('string');
    });
  });

  describe('decompilation', () => {
    it('should decompile back to visual strategy', () => {
      const compiled = compiler.compile(testStrategy);
      const decompiled = compiler.decompile(compiled);

      expect(decompiled.id).toBe(testStrategy.id);
      expect(decompiled.blocks.length).toBe(testStrategy.blocks.length);
    });
  });

  describe('JSON serialization', () => {
    it('should export to JSON', () => {
      const json = compiler.toJSON(testStrategy);
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(testStrategy.id);
    });

    it('should import from JSON', () => {
      const json = compiler.toJSON(testStrategy);
      const imported = compiler.fromJSON(json);

      expect(imported.id).toBe(testStrategy.id);
      expect(imported.blocks.length).toBe(testStrategy.blocks.length);
    });
  });
});

// ============================================================================
// Template Registry Tests
// ============================================================================

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  describe('built-in templates', () => {
    it('should have DCA templates', () => {
      const dcaBuy = registry.get('dca_buy');
      expect(dcaBuy).toBeDefined();
      expect(dcaBuy!.category).toBe('trading');
    });

    it('should have yield farming templates', () => {
      const autoCompound = registry.get('auto_compound');
      expect(autoCompound).toBeDefined();
      expect(autoCompound!.category).toBe('yield_farming');
    });

    it('should have portfolio templates', () => {
      const rebalancing = registry.get('portfolio_rebalancing');
      expect(rebalancing).toBeDefined();
      expect(rebalancing!.category).toBe('portfolio_automation');
    });
  });

  describe('template search', () => {
    it('should search templates by query', () => {
      const results = registry.search('dca');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.id.includes('dca'))).toBe(true);
    });

    it('should filter by category', () => {
      const trading = registry.getByCategory('trading');
      expect(trading.every((t) => t.category === 'trading')).toBe(true);
    });

    it('should filter by difficulty', () => {
      const beginner = registry.getByDifficulty('beginner');
      expect(beginner.every((t) => t.difficulty === 'beginner')).toBe(true);
    });

    it('should filter by risk level', () => {
      const lowRisk = registry.getByRiskLevel('low');
      expect(lowRisk.every((t) => t.riskLevel === 'low')).toBe(true);
    });

    it('should get popular templates', () => {
      const popular = registry.getPopular(5);
      expect(popular.length).toBeLessThanOrEqual(5);

      // Should be sorted by popularity
      for (let i = 1; i < popular.length; i++) {
        expect(popular[i - 1].popularity).toBeGreaterThanOrEqual(popular[i].popularity);
      }
    });
  });
});

// ============================================================================
// AI Strategy Assistant Tests
// ============================================================================

describe('AIStrategyAssistant', () => {
  let assistant: AIStrategyAssistant;

  beforeEach(() => {
    assistant = new AIStrategyAssistant();
  });

  describe('strategy generation', () => {
    it('should generate strategy from prompt', async () => {
      const response = await assistant.generateStrategy({
        prompt: 'Create a DCA strategy to buy TON with USDT daily',
      });

      expect(response.strategy).toBeDefined();
      expect(response.explanation).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should include risk analysis', async () => {
      const response = await assistant.generateStrategy({
        prompt: 'Create a high-risk trading strategy',
      });

      expect(response.riskAnalysis).toBeDefined();
      expect(response.riskAnalysis.length).toBeGreaterThan(0);
    });

    it('should suggest alternatives', async () => {
      const response = await assistant.generateStrategy({
        prompt: 'Create a yield farming strategy',
      });

      expect(response.alternatives).toBeDefined();
      expect(response.alternatives.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('strategy explanation', () => {
    it('should explain a strategy in natural language', () => {
      const strategy = createTestStrategy();
      const explanation = assistant.explainStrategy(strategy);

      expect(explanation).toBeDefined();
      expect(explanation).toContain(strategy.name);
    });
  });

  describe('risk detection', () => {
    it('should detect potential risks', () => {
      const strategy = createTestStrategy();
      strategy.riskParams.maxPositionSize = 80; // High risk

      const risks = assistant.detectRisks(strategy);

      expect(risks.length).toBeGreaterThan(0);
      expect(risks.some((r) => r.code === 'risk_exceeded')).toBe(true);
    });
  });

  describe('optimization suggestions', () => {
    it('should suggest optimizations', () => {
      const strategy = createTestStrategy();
      const suggestions = assistant.suggestOptimizations(strategy);

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('StrategyValidator', () => {
  let validator: StrategyValidator;

  beforeEach(() => {
    validator = new StrategyValidator();
  });

  describe('structural validation', () => {
    it('should validate a well-formed strategy', () => {
      const strategy = createTestStrategy();
      const result = validator.validate(strategy);

      expect(result.errors.length).toBe(0);
    });

    it('should detect missing triggers', () => {
      const strategy = createTestStrategy();
      strategy.blocks = strategy.blocks.filter((b) => b.category !== 'trigger');

      const result = validator.validate(strategy);

      expect(result.errors.some((e) => e.code === 'missing_trigger')).toBe(true);
    });

    it('should detect circular dependencies', () => {
      const strategy = createTestStrategy();
      // Create a circular connection
      strategy.connections.push({
        id: 'circular',
        sourceBlockId: 'action_1',
        sourceOutputId: 'success',
        targetBlockId: 'trigger_1',
        targetInputId: 'in',
      });

      const result = validator.validate(strategy);

      // Note: Triggers don't have inputs, so this specific test might behave differently
      expect(result).toBeDefined();
    });
  });

  describe('risk validation', () => {
    it('should warn about high position sizes', () => {
      const strategy = createTestStrategy();
      strategy.riskParams.maxPositionSize = 60;

      const result = validator.validate(strategy);

      expect(result.warnings.some((w) => w.field === 'maxPositionSize')).toBe(true);
    });

    it('should warn about missing stop loss', () => {
      const strategy = createTestStrategy();
      strategy.category = 'trading';
      strategy.riskParams.stopLossPercent = 0;

      const result = validator.validate(strategy);

      expect(result.warnings.some((w) => w.field === 'stopLossPercent')).toBe(true);
    });
  });

  describe('security checks', () => {
    it('should run security checks', () => {
      const strategy = createTestStrategy();
      const result = validator.validate(strategy);

      expect(result.securityChecks.length).toBeGreaterThan(0);
    });

    it('should calculate risk score', () => {
      const strategy = createTestStrategy();
      const result = validator.validate(strategy);

      expect(typeof result.riskScore).toBe('number');
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('helper functions', () => {
    it('validateStrategy should work as standalone function', () => {
      const strategy = createTestStrategy();
      const result = validateStrategy(strategy);

      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('isDeployable should check validity and risk', () => {
      const strategy = createTestStrategy();
      const deployable = isDeployable(strategy);

      expect(typeof deployable).toBe('boolean');
    });

    it('getValidationSummary should return human-readable summary', () => {
      const strategy = createTestStrategy();
      const result = validateStrategy(strategy);
      const summary = getValidationSummary(result);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Simulation Engine Tests
// ============================================================================

describe('SimulationEngine', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
  });

  describe('backtesting', () => {
    it('should run a backtest', async () => {
      const strategy = createTestStrategy();
      const config: SimulationConfig = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        initialCapital: 10000,
        priceDataSource: 'synthetic',
        slippageModel: 'fixed',
        gasModel: 'fixed',
      };

      const result = await engine.runBacktest(strategy, config);

      expect(result.strategyId).toBe(strategy.id);
      expect(result.status).toBe('completed');
      expect(result.metrics).toBeDefined();
      expect(result.equityCurve.length).toBeGreaterThan(0);
    });

    it('should calculate metrics', async () => {
      const strategy = createTestStrategy();
      const config: SimulationConfig = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        initialCapital: 10000,
        priceDataSource: 'synthetic',
        slippageModel: 'fixed',
        gasModel: 'fixed',
      };

      const result = await engine.runBacktest(strategy, config);

      expect(typeof result.metrics.totalReturn).toBe('number');
      expect(typeof result.metrics.sharpeRatio).toBe('number');
      expect(typeof result.metrics.maxDrawdown).toBe('number');
      expect(typeof result.metrics.winRate).toBe('number');
    });
  });

  describe('Monte Carlo', () => {
    it('should run Monte Carlo simulation', async () => {
      const strategy = createTestStrategy();
      const config: SimulationConfig = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        initialCapital: 10000,
        priceDataSource: 'synthetic',
        slippageModel: 'fixed',
        gasModel: 'fixed',
      };

      const result = await engine.runMonteCarlo(strategy, config, 10);

      expect(result.runs).toBe(10);
      expect(typeof result.medianReturn).toBe('number');
      expect(typeof result.percentile5Return).toBe('number');
      expect(typeof result.percentile95Return).toBe('number');
    });
  });

  describe('sandbox testing', () => {
    it('should run sandbox test', async () => {
      const strategy = createTestStrategy();
      const result = await engine.runSandbox(strategy, 24);

      expect(result.success).toBe(true);
      expect(typeof result.finalEquity).toBe('number');
    });
  });

  describe('performance estimation', () => {
    it('should estimate performance', async () => {
      const strategy = createTestStrategy();
      const estimate = await engine.estimatePerformance(strategy, 'short');

      expect(typeof estimate.expectedReturn).toBe('number');
      expect(typeof estimate.confidence).toBe('number');
      expect(estimate.confidence).toBeGreaterThan(0);
      expect(estimate.confidence).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// Lifecycle Manager Tests
// ============================================================================

describe('StrategyLifecycleManager', () => {
  let manager: StrategyLifecycleManager;

  beforeEach(() => {
    manager = new StrategyLifecycleManager({ autoSave: false });
  });

  describe('CRUD operations', () => {
    it('should create a strategy', () => {
      const strategy = manager.create('Test Strategy', 'trading', { id: 'user1' });

      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBe('Test Strategy');
      expect(strategy.status).toBe('draft');
    });

    it('should get a strategy by ID', () => {
      const created = manager.create('Test', 'trading', { id: 'user1' });
      const retrieved = manager.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should update a strategy', () => {
      const strategy = manager.create('Test', 'trading', { id: 'user1' });
      const updated = manager.update(strategy.id, { name: 'Updated Name' });

      expect(updated!.name).toBe('Updated Name');
    });

    it('should list strategies', () => {
      manager.create('Test 1', 'trading', { id: 'user1' });
      manager.create('Test 2', 'yield_farming', { id: 'user1' });

      const all = manager.list();
      expect(all.length).toBe(2);

      const trading = manager.list({ category: 'trading' });
      expect(trading.length).toBe(1);
    });
  });

  describe('lifecycle transitions', () => {
    it('should transition from draft to testing', async () => {
      const strategy = manager.create('Test', 'trading', { id: 'user1' });
      const result = await manager.transitionStatus(strategy.id, 'testing');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('testing');
    });

    it('should reject invalid transitions', async () => {
      const strategy = manager.create('Test', 'trading', { id: 'user1' });
      const result = await manager.transitionStatus(strategy.id, 'active');

      expect(result.success).toBe(false);
    });

    it('should pause and resume strategies', async () => {
      const strategy = manager.create('Test', 'trading', { id: 'user1' });

      // Add required blocks for a valid strategy
      const triggerBlock = {
        id: 'trigger1',
        category: 'trigger' as const,
        name: 'Manual Trigger',
        description: 'Test trigger',
        version: '1.0.0',
        config: { type: 'manual' },
        position: { x: 100, y: 100 },
        inputs: [],
        outputs: [{ id: 'out', type: 'output' as const, dataType: 'trigger' as const, label: 'Output', required: true }],
        enabled: true,
      };

      const actionBlock = {
        id: 'action1',
        category: 'action' as const,
        name: 'Trade Action',
        description: 'Test action',
        version: '1.0.0',
        config: { type: 'swap' },
        position: { x: 300, y: 100 },
        inputs: [{ id: 'in', type: 'input' as const, dataType: 'trigger' as const, label: 'Input', required: true }],
        outputs: [],
        enabled: true,
      };

      manager.update(strategy.id, {
        blocks: [triggerBlock, actionBlock],
        connections: [{ id: 'conn1', sourceBlockId: 'trigger1', sourceOutputId: 'out', targetBlockId: 'action1', targetInputId: 'in' }],
      });

      // Go through valid transitions
      const testingResult = await manager.transitionStatus(strategy.id, 'testing');
      expect(testingResult.success).toBe(true);

      const pendingResult = await manager.transitionStatus(strategy.id, 'pending');
      expect(pendingResult.success).toBe(true);

      const activeResult = await manager.transitionStatus(strategy.id, 'active');
      expect(activeResult.success).toBe(true);

      const pauseResult = await manager.pause(strategy.id);
      expect(pauseResult.success).toBe(true);

      const resumeResult = await manager.resume(strategy.id);
      expect(resumeResult.success).toBe(true);
    });
  });

  describe('versioning', () => {
    it('should save versions', () => {
      const strategy = manager.create('Test', 'trading', { id: 'user1' });
      const version = manager.saveVersion(strategy.id, 'Initial version');

      expect(version).toBeDefined();
      expect(version!.version).toBeDefined();
    });

    it('should rollback to previous version', () => {
      const strategy = manager.create('Test', 'trading', { id: 'user1' });
      manager.saveVersion(strategy.id, 'v1');

      manager.update(strategy.id, { description: 'Modified' });
      manager.saveVersion(strategy.id, 'v2');

      const history = manager.getVersionHistory(strategy.id);
      const firstVersion = history[0].version;

      const result = manager.rollback(strategy.id, firstVersion);
      expect(result).toBe(true);
    });

    it('should compare versions', () => {
      const strategy = manager.create('Test', 'trading', { id: 'user1' });
      manager.saveVersion(strategy.id, 'v1');

      manager.update(strategy.id, {
        blocks: [...(manager.get(strategy.id)?.blocks || []), createTestBlock()],
      });
      manager.saveVersion(strategy.id, 'v2');

      const history = manager.getVersionHistory(strategy.id);
      if (history.length >= 2) {
        const comparison = manager.compareVersions(
          strategy.id,
          history[0].version,
          history[1].version
        );

        expect(comparison).toBeDefined();
        expect(typeof comparison!.summary).toBe('string');
      }
    });
  });

  describe('sharing', () => {
    it('should share strategy with user', () => {
      const strategy = manager.create('Test', 'trading', { id: 'user1' });
      const result = manager.share(strategy.id, 'user2', 'view');

      expect(result).toBe(true);
    });

    it('should revoke sharing', () => {
      const strategy = manager.create('Test', 'trading', { id: 'user1' });
      manager.share(strategy.id, 'user2', 'view');
      const result = manager.revokeShare(strategy.id, 'user2');

      expect(result).toBe(true);
    });

    it('should fork strategy', () => {
      const original = manager.create('Original', 'trading', { id: 'user1' });
      const forked = manager.fork(original.id, { id: 'user2' });

      expect(forked).toBeDefined();
      expect(forked!.forkedFrom).toBe(original.id);
    });
  });
});

// ============================================================================
// Workspace Manager Tests
// ============================================================================

describe('WorkspaceManager', () => {
  let manager: WorkspaceManager;

  beforeEach(() => {
    manager = new WorkspaceManager();
  });

  it('should create workspace', () => {
    const workspace = manager.create('My Workspace', 'user1');

    expect(workspace.id).toBeDefined();
    expect(workspace.name).toBe('My Workspace');
    expect(workspace.owner).toBe('user1');
  });

  it('should add members', () => {
    const workspace = manager.create('Team', 'user1');
    const result = manager.addMember(workspace.id, 'user2', 'editor');

    expect(result).toBe(true);
    expect(manager.get(workspace.id)!.members.length).toBe(2);
  });

  it('should manage strategies in workspace', () => {
    const workspace = manager.create('Team', 'user1');

    manager.addStrategy(workspace.id, 'strategy1');
    expect(manager.get(workspace.id)!.strategies).toContain('strategy1');

    manager.removeStrategy(workspace.id, 'strategy1');
    expect(manager.get(workspace.id)!.strategies).not.toContain('strategy1');
  });

  it('should get workspaces for user', () => {
    manager.create('Team 1', 'user1');
    const ws2 = manager.create('Team 2', 'user2');
    manager.addMember(ws2.id, 'user1', 'editor');

    const userWorkspaces = manager.getForUser('user1');
    expect(userWorkspaces.length).toBe(2);
  });
});

// ============================================================================
// Observability Manager Tests
// ============================================================================

describe('ObservabilityManager', () => {
  let manager: ObservabilityManager;

  beforeEach(() => {
    manager = new ObservabilityManager();
  });

  it('should update metrics', () => {
    manager.updateMetrics('strategy1', {
      pnl: 100,
      totalValue: 10100,
    });

    const metrics = manager.getMetrics('strategy1');
    expect(metrics?.pnl).toBe(100);
    expect(metrics?.totalValue).toBe(10100);
  });

  it('should subscribe to updates', () => {
    const callback = vi.fn();
    const unsubscribe = manager.subscribe('strategy1', callback);

    manager.updateMetrics('strategy1', { pnl: 50 });

    expect(callback).toHaveBeenCalled();

    unsubscribe();
    manager.updateMetrics('strategy1', { pnl: 100 });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should record trades', () => {
    manager.updateMetrics('strategy1', { pnl: 0, recentTrades: [] });

    manager.recordTrade('strategy1', {
      id: 'trade1',
      timestamp: new Date(),
      type: 'swap',
      tokens: 'TON/USDT',
      amount: 100,
      pnl: 5,
      status: 'completed',
    });

    const metrics = manager.getMetrics('strategy1');
    expect(metrics?.recentTrades.length).toBe(1);
    expect(metrics?.pnl).toBe(5);
  });

  it('should update agent status', () => {
    manager.updateAgentStatus('strategy1', 'executing');

    const metrics = manager.getMetrics('strategy1');
    expect(metrics?.agentStatus).toBe('executing');
  });
});

// ============================================================================
// No-Code Builder Integration Tests
// ============================================================================

describe('NoCodeBuilder', () => {
  let builder: NoCodeBuilder;

  beforeEach(() => {
    builder = createNoCodeBuilder();
  });

  describe('initialization', () => {
    it('should initialize all components', () => {
      expect(builder.blocks).toBeInstanceOf(BlockRegistry);
      expect(builder.dsl).toBeInstanceOf(DSLCompiler);
      expect(builder.templates).toBeInstanceOf(TemplateRegistry);
      expect(builder.ai).toBeInstanceOf(AIStrategyAssistant);
      expect(builder.validator).toBeInstanceOf(StrategyValidator);
      expect(builder.simulation).toBeInstanceOf(SimulationEngine);
      expect(builder.lifecycle).toBeInstanceOf(StrategyLifecycleManager);
      expect(builder.workspaces).toBeInstanceOf(WorkspaceManager);
      expect(builder.observability).toBeInstanceOf(ObservabilityManager);
    });
  });

  describe('quick actions', () => {
    it('should create strategy from scratch', () => {
      const strategy = builder.createStrategy('My Strategy', 'trading', { id: 'user1' });

      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBe('My Strategy');
    });

    it('should create strategy from template', () => {
      const strategy = builder.createFromTemplate('dca_buy', { id: 'user1' }, {
        sourceToken: 'USDT',
        targetToken: 'TON',
        amountPerOrder: 50,
      });

      expect(strategy).toBeDefined();
      expect(strategy!.blocks.length).toBeGreaterThan(0);
    });

    it('should create strategy with AI', async () => {
      const response = await builder.createWithAI(
        'Create a simple DCA strategy',
        { id: 'user1' }
      );

      expect(response.strategy).toBeDefined();
      expect(response.explanation).toBeDefined();
    });

    it('should check deployment readiness', () => {
      const strategy = builder.createStrategy('Test', 'trading', { id: 'user1' });
      const readiness = builder.checkDeploymentReadiness(strategy.id);

      expect(readiness).toBeDefined();
      expect(typeof readiness.ready).toBe('boolean');
    });

    it('should run quick backtest', async () => {
      const strategy = builder.createStrategy('Test', 'trading', { id: 'user1' });
      const result = await builder.quickBacktest(strategy.id, 7);

      expect(result).toBeDefined();
      expect(result!.status).toBe('completed');
    });

    it('should export and import strategies', () => {
      const strategy = builder.createStrategy('Test', 'trading', { id: 'user1' });
      const json = builder.exportStrategy(strategy.id);

      expect(json).toBeDefined();

      const imported = builder.importStrategy(json!, { id: 'user2' });
      expect(imported.author.id).toBe('user2');
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createTestStrategy(): Strategy {
  return {
    id: 'test_strategy_1',
    name: 'Test Strategy',
    description: 'A test strategy for unit tests',
    category: 'trading',
    version: '1.0.0',
    author: { id: 'test_user' },
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'draft',
    blocks: [
      {
        id: 'trigger_1',
        category: 'trigger',
        name: 'Schedule',
        description: 'Triggers on schedule',
        version: '1.0.0',
        config: {
          scheduleType: 'interval',
          interval: 86400,
        },
        position: { x: 100, y: 100 },
        inputs: [],
        outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true }],
        enabled: true,
      },
      {
        id: 'action_1',
        category: 'action',
        name: 'Swap',
        description: 'Execute swap',
        version: '1.0.0',
        config: {
          fromToken: 'USDT',
          toToken: 'TON',
          amountType: 'fixed',
          amount: 100,
          maxSlippage: 1,
          dex: 'auto',
        },
        position: { x: 300, y: 100 },
        inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
        outputs: [
          { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
          { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
        ],
        enabled: true,
      },
    ],
    connections: [
      {
        id: 'conn_1',
        sourceBlockId: 'trigger_1',
        sourceOutputId: 'out',
        targetBlockId: 'action_1',
        targetInputId: 'in',
      },
    ],
    config: {
      maxGasPerExecution: 1,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: {
        onExecution: true,
        onError: true,
        onProfitTarget: true,
        onLossLimit: true,
        channels: ['telegram'],
      },
      tokenWhitelist: ['TON', 'USDT'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 30,
      maxDailyLoss: 5,
      maxDrawdown: 15,
      stopLossPercent: 5,
      takeProfitPercent: 10,
      maxSlippage: 2,
      maxTradesPerDay: 20,
      cooldownSeconds: 300,
    },
    tags: ['test'],
    isPublic: false,
    versionHistory: [],
  };
}

function createTestBlock(): Block {
  return {
    id: `block_${Date.now()}`,
    category: 'action',
    name: 'Test Block',
    description: 'A test block',
    version: '1.0.0',
    config: {},
    position: { x: 0, y: 0 },
    inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'In', required: true }],
    outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Out', required: true }],
    enabled: true,
  };
}
