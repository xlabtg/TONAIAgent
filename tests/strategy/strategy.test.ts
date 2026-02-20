/**
 * TONAIAgent - Strategy Engine Tests
 *
 * Comprehensive tests for the autonomous strategy engine.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  // Strategy Manager
  createStrategyManager,
  StrategyManager,
  CreateStrategyOptions,

  // DSL
  createDSLParser,
  createDSLValidator,
  StrategyDSLParser,
  StrategyDSLValidator,
  StrategyDSL,

  // Execution
  createExecutionEngine,
  StrategyScheduler,
  StrategyExecutor,
  ExecutionMonitor,

  // Backtesting
  createBacktestingEngine,
  BacktestingEngine,

  // Optimization
  createOptimizationEngine,
  OptimizationEngine,

  // AI Integration
  createAIStrategyGenerator,
  AIStrategyGenerator,

  // Full Engine
  createStrategyEngine,
  DefaultStrategyEngine,

  // Types
  Strategy,
  StrategySpec,
  StrategyType,
  StrategyStatus,
  BacktestConfig,
  OptimizationConfig,
} from '../../src/strategy';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockStrategySpec(): StrategySpec {
  return {
    triggers: [{
      id: 'trigger_1',
      type: 'schedule',
      name: 'Hourly Trigger',
      enabled: true,
      config: { type: 'schedule', cron: '0 * * * *' },
    }],
    conditions: [{
      id: 'condition_1',
      name: 'Balance Check',
      type: 'portfolio',
      rules: [{
        id: 'rule_1',
        field: 'balance',
        operator: 'greater_than',
        value: 100,
        valueType: 'static',
      }],
      required: true,
    }],
    actions: [{
      id: 'action_1',
      type: 'swap',
      name: 'Buy TON',
      priority: 1,
      config: {
        type: 'swap',
        fromToken: 'USDT',
        toToken: 'TON',
        amount: { type: 'fixed', value: 100 },
        slippageTolerance: 0.5,
      },
    }],
    riskControls: [{
      id: 'risk_1',
      type: 'stop_loss',
      name: 'Stop Loss',
      enabled: true,
      config: { type: 'stop_loss', percentage: 10 },
      action: { type: 'notify' },
    }],
    parameters: [{
      id: 'param_amount',
      name: 'amount',
      type: 'number',
      value: 100,
      defaultValue: 100,
      optimizable: true,
      constraints: { min: 10, max: 1000 },
    }],
    capitalAllocation: {
      mode: 'percentage',
      allocatedPercentage: 10,
      minCapital: 50,
      reservePercentage: 20,
    },
  };
}

function createMockCreateOptions(): CreateStrategyOptions {
  return {
    name: 'Test Strategy',
    description: 'A test strategy for unit tests',
    type: 'rule_based',
    userId: 'user_test',
    agentId: 'agent_test',
    definition: createMockStrategySpec(),
    tags: ['test', 'dca'],
  };
}

function createMockDSL(): StrategyDSL {
  return {
    strategy: {
      name: 'DCA Strategy',
      description: 'Dollar-cost averaging into TON',
      triggers: [{
        type: 'schedule',
        name: 'Daily Buy',
        cron: '0 0 * * *',
      }],
      actions: [{
        type: 'swap',
        name: 'Buy TON',
        from: 'USDT',
        to: 'TON',
        amount: 100,
        slippage: 0.5,
      }],
      risk_controls: [{
        type: 'stop_loss',
        percentage: 10,
      }],
    },
  };
}

// ============================================================================
// Strategy Manager Tests
// ============================================================================

describe('Strategy Manager', () => {
  let manager: StrategyManager;

  beforeEach(() => {
    manager = createStrategyManager();
  });

  describe('Create Strategy', () => {
    it('should create a new strategy', async () => {
      const options = createMockCreateOptions();
      const strategy = await manager.createStrategy(options);

      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBe('Test Strategy');
      expect(strategy.type).toBe('rule_based');
      expect(strategy.status).toBe('draft');
      expect(strategy.version).toBe(1);
    });

    it('should validate strategy on creation', async () => {
      const options = createMockCreateOptions();
      options.definition.triggers = []; // Invalid - no triggers

      await expect(manager.createStrategy(options)).rejects.toThrow();
    });

    it('should assign tags and metadata', async () => {
      const options = createMockCreateOptions();
      options.tags = ['test', 'production'];
      options.metadata = { source: 'ai_generated' };

      const strategy = await manager.createStrategy(options);

      expect(strategy.tags).toContain('test');
      expect(strategy.tags).toContain('production');
      expect(strategy.metadata.source).toBe('ai_generated');
    });
  });

  describe('Get Strategy', () => {
    it('should retrieve an existing strategy', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      const retrieved = await manager.getStrategy(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe(created.name);
    });

    it('should return null for non-existent strategy', async () => {
      const retrieved = await manager.getStrategy('non_existent_id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Update Strategy', () => {
    it('should update strategy properties', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      const updated = await manager.updateStrategy(created.id, {
        name: 'Updated Strategy',
        description: 'Updated description',
      });

      expect(updated.name).toBe('Updated Strategy');
      expect(updated.description).toBe('Updated description');
      expect(updated.version).toBe(2);
    });

    it('should not allow updating active strategies', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(created.id);
      await manager.activateStrategy(created.id);

      await expect(manager.updateStrategy(created.id, { name: 'New Name' }))
        .rejects.toThrow();
    });

    it('should reset validation status on update', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(created.id);

      const validated = await manager.getStrategy(created.id);
      expect(validated?.status).toBe('validated');

      const updated = await manager.updateStrategy(created.id, { name: 'New Name' });
      expect(updated.status).toBe('draft');
    });
  });

  describe('Strategy Lifecycle', () => {
    it('should validate a draft strategy', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      const validation = await manager.validateStrategy(created.id);

      expect(validation.valid).toBe(true);

      const strategy = await manager.getStrategy(created.id);
      expect(strategy?.status).toBe('validated');
    });

    it('should activate a validated strategy', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(created.id);
      const activated = await manager.activateStrategy(created.id);

      expect(activated.status).toBe('active');
      expect(activated.activatedAt).toBeDefined();
    });

    it('should not activate an unvalidated strategy', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());

      await expect(manager.activateStrategy(created.id)).rejects.toThrow();
    });

    it('should pause an active strategy', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(created.id);
      await manager.activateStrategy(created.id);
      const paused = await manager.pauseStrategy(created.id, 'Testing');

      expect(paused.status).toBe('paused');
      expect(paused.metadata.pauseReason).toBe('Testing');
    });

    it('should stop a running strategy', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(created.id);
      await manager.activateStrategy(created.id);
      const stopped = await manager.stopStrategy(created.id, 'End of campaign');

      expect(stopped.status).toBe('stopped');
    });

    it('should archive a stopped strategy', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(created.id);
      await manager.activateStrategy(created.id);
      await manager.stopStrategy(created.id);
      const archived = await manager.archiveStrategy(created.id);

      expect(archived.status).toBe('archived');
    });
  });

  describe('Strategy Cloning', () => {
    it('should clone a strategy', async () => {
      const original = await manager.createStrategy(createMockCreateOptions());
      const cloned = await manager.cloneStrategy(original.id);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toContain('Copy');
      expect(cloned.parentStrategyId).toBe(original.id);
      expect(cloned.status).toBe('draft');
    });

    it('should clone with modifications', async () => {
      const original = await manager.createStrategy(createMockCreateOptions());
      const cloned = await manager.cloneStrategy(original.id, {
        newName: 'Cloned Strategy',
        modifications: {
          tags: ['cloned'],
        },
      });

      expect(cloned.name).toBe('Cloned Strategy');
      expect(cloned.tags).toContain('cloned');
    });
  });

  describe('Version History', () => {
    it('should track version history', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      await manager.updateStrategy(created.id, { name: 'V2' });
      await manager.updateStrategy(created.id, { name: 'V3' });

      const history = await manager.getVersionHistory(created.id);

      expect(history.length).toBeGreaterThanOrEqual(3);
      expect(history.map(v => v.version)).toContain(1);
      expect(history.map(v => v.version)).toContain(2);
      expect(history.map(v => v.version)).toContain(3);
    });

    it('should revert to previous version', async () => {
      const created = await manager.createStrategy(createMockCreateOptions());
      const originalName = created.name;
      await manager.updateStrategy(created.id, { name: 'New Name' });

      const reverted = await manager.revertToVersion(created.id, 1);

      expect(reverted.name).toBe(originalName);
      expect(reverted.version).toBe(3); // New version after revert
      expect(reverted.metadata.revertedFrom).toBe(2);
    });
  });

  describe('Query Strategies', () => {
    it('should query by user ID', async () => {
      await manager.createStrategy({ ...createMockCreateOptions(), userId: 'user_1' });
      await manager.createStrategy({ ...createMockCreateOptions(), userId: 'user_2' });

      const result = await manager.queryStrategies({ userId: 'user_1' });

      expect(result.strategies.length).toBe(1);
      expect(result.strategies[0].userId).toBe('user_1');
    });

    it('should query by status', async () => {
      const s1 = await manager.createStrategy(createMockCreateOptions());
      await manager.createStrategy(createMockCreateOptions());

      await manager.validateStrategy(s1.id);

      const result = await manager.queryStrategies({ status: 'validated' });

      expect(result.strategies.length).toBe(1);
      expect(result.strategies[0].status).toBe('validated');
    });

    it('should search by name', async () => {
      await manager.createStrategy({ ...createMockCreateOptions(), name: 'DCA Strategy' });
      await manager.createStrategy({ ...createMockCreateOptions(), name: 'Momentum Strategy' });

      const result = await manager.queryStrategies({ search: 'DCA' });

      expect(result.strategies.length).toBe(1);
      expect(result.strategies[0].name).toContain('DCA');
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 10; i++) {
        await manager.createStrategy({ ...createMockCreateOptions(), name: `Strategy ${i}` });
      }

      const page1 = await manager.queryStrategies({ limit: 5, offset: 0 });
      const page2 = await manager.queryStrategies({ limit: 5, offset: 5 });

      expect(page1.strategies.length).toBe(5);
      expect(page2.strategies.length).toBe(5);
      expect(page1.hasMore).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should calculate user statistics', async () => {
      await manager.createStrategy(createMockCreateOptions());
      const s2 = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(s2.id);
      await manager.activateStrategy(s2.id);

      const stats = await manager.getStatistics('user_test');

      expect(stats.totalStrategies).toBe(2);
      expect(stats.byStatus.draft).toBe(1);
      expect(stats.byStatus.active).toBe(1);
    });
  });
});

// ============================================================================
// DSL Parser Tests
// ============================================================================

describe('Strategy DSL', () => {
  let parser: StrategyDSLParser;
  let validator: StrategyDSLValidator;

  beforeEach(() => {
    parser = createDSLParser();
    validator = createDSLValidator();
  });

  describe('Parsing', () => {
    it('should parse valid DSL', () => {
      const dsl = createMockDSL();
      const definition = parser.parse(dsl);

      expect(definition.triggers.length).toBe(1);
      expect(definition.actions.length).toBe(1);
      expect(definition.riskControls.length).toBe(1);
    });

    it('should parse JSON string', () => {
      const dsl = createMockDSL();
      const definition = parser.parse(JSON.stringify(dsl));

      expect(definition.triggers.length).toBe(1);
    });

    it('should parse different trigger types', () => {
      const dsl: StrategyDSL = {
        strategy: {
          name: 'Test',
          triggers: [
            { type: 'schedule', cron: '0 * * * *' },
            { type: 'price', token: 'TON', operator: 'less_than', value: 5 },
            { type: 'portfolio', metric: 'total_value', operator: 'greater_than', value: 1000 },
          ],
          actions: [{ type: 'notify', channel: 'telegram', message: 'Test' }],
        },
      };

      const definition = parser.parse(dsl);

      expect(definition.triggers.length).toBe(3);
      expect(definition.triggers[0].config.type).toBe('schedule');
      expect(definition.triggers[1].config.type).toBe('price');
      expect(definition.triggers[2].config.type).toBe('portfolio');
    });

    it('should parse different action types', () => {
      const dsl: StrategyDSL = {
        strategy: {
          name: 'Test',
          triggers: [{ type: 'schedule', cron: '0 * * * *' }],
          actions: [
            { type: 'swap', from: 'USDT', to: 'TON', amount: 100, slippage: 0.5 },
            { type: 'stake', token: 'TON', amount: 50, pool: 'staking_pool' },
            { type: 'notify', channel: 'telegram', message: 'Done' },
          ],
        },
      };

      const definition = parser.parse(dsl);

      expect(definition.actions.length).toBe(3);
      expect(definition.actions[0].type).toBe('swap');
      expect(definition.actions[1].type).toBe('stake');
      expect(definition.actions[2].type).toBe('notify');
    });

    it('should throw on invalid DSL', () => {
      expect(() => parser.parse({} as StrategyDSL)).toThrow();
    });
  });

  describe('Serialization', () => {
    it('should serialize definition to DSL', () => {
      const definition = createMockStrategySpec();
      const dsl = parser.serialize(definition, 'Test Strategy', 'A test');

      expect(dsl.strategy.name).toBe('Test Strategy');
      expect(dsl.strategy.triggers.length).toBe(1);
      expect(dsl.strategy.actions.length).toBe(1);
    });

    it('should round-trip parse and serialize', () => {
      const original = createMockDSL();
      const definition = parser.parse(original);
      const serialized = parser.serialize(definition, original.strategy.name);

      expect(serialized.strategy.name).toBe(original.strategy.name);
      expect(serialized.strategy.triggers.length).toBe(original.strategy.triggers.length);
    });
  });

  describe('Validation', () => {
    it('should validate correct DSL', () => {
      const dsl = createMockDSL();
      const result = validator.validate(dsl);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should report missing name', () => {
      const dsl = createMockDSL();
      dsl.strategy.name = '';

      const result = validator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('name'))).toBe(true);
    });

    it('should report missing triggers', () => {
      const dsl: StrategyDSL = {
        strategy: {
          name: 'Test',
          triggers: [],
          actions: [{ type: 'notify', channel: 'telegram', message: 'Test' }],
        },
      };

      const result = validator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('triggers'))).toBe(true);
    });

    it('should warn about missing risk controls', () => {
      const dsl = createMockDSL();
      dsl.strategy.risk_controls = undefined;

      const result = validator.validate(dsl);

      expect(result.warnings.some(w => w.code === 'MISSING_RISK_CONTROL')).toBe(true);
    });
  });

  describe('Static Analysis', () => {
    it('should analyze strategy complexity', () => {
      const definition = createMockStrategySpec();
      const analysis = validator.analyze(definition);

      expect(analysis.complexity).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(analysis.complexity);
    });

    it('should estimate gas costs', () => {
      const definition = createMockStrategySpec();
      const analysis = validator.analyze(definition);

      expect(analysis.estimatedGasPerExecution).toBeGreaterThan(0);
    });

    it('should suggest adding stop-loss', () => {
      const definition = createMockStrategySpec();
      definition.riskControls = []; // Remove risk controls

      const analysis = validator.analyze(definition);

      expect(analysis.suggestions.some(s => s.type === 'risk')).toBe(true);
    });
  });
});

// ============================================================================
// Execution Engine Tests
// ============================================================================

describe('Execution Engine', () => {
  let scheduler: StrategyScheduler;
  let executor: StrategyExecutor;
  let monitor: ExecutionMonitor;

  beforeEach(() => {
    const engine = createExecutionEngine({
      enableSimulation: true,
    });
    scheduler = engine.scheduler;
    executor = engine.executor;
    monitor = engine.monitor;
  });

  describe('Scheduler', () => {
    it('should schedule a strategy', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(strategy.id);
      await manager.activateStrategy(strategy.id);

      scheduler.schedule(strategy);

      const jobs = scheduler.getScheduledJobs();
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].strategyId).toBe(strategy.id);
    });

    it('should unschedule a strategy', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(strategy.id);
      await manager.activateStrategy(strategy.id);

      scheduler.schedule(strategy);
      scheduler.unschedule(strategy.id);

      const jobs = scheduler.getScheduledJobs();
      expect(jobs.filter(j => j.strategyId === strategy.id).length).toBe(0);
    });

    it('should trigger manual execution', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(strategy.id);
      await manager.activateStrategy(strategy.id);

      const execution = await scheduler.triggerManually(strategy);

      expect(execution.strategyId).toBe(strategy.id);
      expect(execution.status).toBeDefined();
    });
  });

  describe('Executor', () => {
    it('should execute strategy actions', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(strategy.id);
      await manager.activateStrategy(strategy.id);

      const execution = await scheduler.triggerManually(strategy);

      expect(execution.actionResults.length).toBeGreaterThan(0);
    });

    it('should evaluate conditions', async () => {
      const manager = createStrategyManager();
      const options = createMockCreateOptions();
      options.definition.conditions = [{
        id: 'cond_1',
        name: 'Test Condition',
        type: 'custom',
        rules: [{
          id: 'rule_1',
          field: 'test',
          operator: 'equals',
          value: true,
          valueType: 'static',
        }],
        required: true,
      }];

      const strategy = await manager.createStrategy(options);
      await manager.validateStrategy(strategy.id);
      await manager.activateStrategy(strategy.id);

      const execution = await scheduler.triggerManually(strategy);

      expect(execution.conditionResults.length).toBeGreaterThan(0);
    });

    it('should track execution history', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(strategy.id);
      await manager.activateStrategy(strategy.id);

      await scheduler.triggerManually(strategy);
      await scheduler.triggerManually(strategy);

      const executions = executor.getExecutions(strategy.id);

      expect(executions.length).toBe(2);
    });
  });

  describe('Monitor', () => {
    it('should track execution metrics', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(strategy.id);
      await manager.activateStrategy(strategy.id);

      // Trigger some executions
      await scheduler.triggerManually(strategy);
      await scheduler.triggerManually(strategy);

      // Give time for metrics to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = monitor.getMetrics(strategy.id);

      expect(metrics).toBeDefined();
      expect(metrics?.totalExecutions).toBeGreaterThanOrEqual(0);
    });

    it('should calculate success rate', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());
      await manager.validateStrategy(strategy.id);
      await manager.activateStrategy(strategy.id);

      await scheduler.triggerManually(strategy);

      const rate = monitor.getSuccessRate(strategy.id);

      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// Backtesting Tests
// ============================================================================

describe('Backtesting Engine', () => {
  let backtester: BacktestingEngine;

  beforeEach(() => {
    backtester = createBacktestingEngine();
  });

  describe('Run Backtest', () => {
    it('should run a backtest', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const config: BacktestConfig = {
        strategyId: strategy.id,
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        initialCapital: 10000,
        slippageModel: { type: 'fixed', baseSlippage: 0.1 },
        feeModel: { tradingFee: 0.3, gasCost: 0.5 },
        dataGranularity: '1h',
      };

      const result = await backtester.runBacktest(strategy, config);

      expect(result.id).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.performance).toBeDefined();
      expect(result.equityCurve.length).toBeGreaterThan(0);
    });

    it('should calculate performance metrics', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const config: BacktestConfig = {
        strategyId: strategy.id,
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-06-30'),
        },
        initialCapital: 10000,
        slippageModel: { type: 'fixed', baseSlippage: 0.1 },
        feeModel: { tradingFee: 0.3, gasCost: 0.5 },
        dataGranularity: '1d',
      };

      const result = await backtester.runBacktest(strategy, config);

      expect(result.performance.metrics.totalReturn).toBeDefined();
      expect(result.performance.metrics.sharpeRatio).toBeDefined();
      expect(result.performance.metrics.maxDrawdown).toBeDefined();
      expect(result.performance.trades.totalTrades).toBeDefined();
    });

    it('should run Monte Carlo simulation', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const config: BacktestConfig = {
        strategyId: strategy.id,
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-06-30'),
        },
        initialCapital: 10000,
        slippageModel: { type: 'fixed', baseSlippage: 0.1 },
        feeModel: { tradingFee: 0.3, gasCost: 0.5 },
        dataGranularity: '1d',
        monteCarlo: {
          enabled: true,
          simulations: 100,
          confidenceLevel: 0.95,
        },
      };

      const result = await backtester.runBacktest(strategy, config);

      expect(result.monteCarlo).toBeDefined();
      expect(result.monteCarlo?.simulations).toBe(100);
    });
  });

  describe('Get Results', () => {
    it('should retrieve backtest results', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const config: BacktestConfig = {
        strategyId: strategy.id,
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        initialCapital: 10000,
        slippageModel: { type: 'fixed', baseSlippage: 0.1 },
        feeModel: { tradingFee: 0.3, gasCost: 0.5 },
        dataGranularity: '1d',
      };

      const result = await backtester.runBacktest(strategy, config);
      const retrieved = backtester.getResult(result.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(result.id);
    });

    it('should get all results for a strategy', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const config: BacktestConfig = {
        strategyId: strategy.id,
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        initialCapital: 10000,
        slippageModel: { type: 'fixed', baseSlippage: 0.1 },
        feeModel: { tradingFee: 0.3, gasCost: 0.5 },
        dataGranularity: '1d',
      };

      await backtester.runBacktest(strategy, config);
      await backtester.runBacktest(strategy, { ...config, initialCapital: 5000 });

      const results = backtester.getResults(strategy.id);

      expect(results.length).toBe(2);
    });
  });
});

// ============================================================================
// Optimization Tests
// ============================================================================

describe('Optimization Engine', () => {
  let optimizer: OptimizationEngine;
  let backtester: BacktestingEngine;

  beforeEach(() => {
    backtester = createBacktestingEngine();
    optimizer = createOptimizationEngine(backtester);
  });

  describe('Run Optimization', () => {
    it('should run grid search optimization', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const config: OptimizationConfig = {
        strategyId: strategy.id,
        method: 'grid_search',
        objective: 'max_sharpe',
        parameters: [{
          parameterId: 'param_amount',
          range: [50, 150],
          step: 50,
        }],
        constraints: {
          maxDrawdown: 20,
        },
        backtestConfig: {
          strategyId: strategy.id,
          period: { start: new Date('2024-01-01'), end: new Date('2024-06-30') },
          initialCapital: 10000,
          slippageModel: { type: 'fixed', baseSlippage: 0.1 },
          feeModel: { tradingFee: 0.3, gasCost: 0.5 },
          dataGranularity: '1d',
        },
        maxIterations: 10,
      };

      const result = await optimizer.optimize(strategy, config);

      expect(result.id).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.bestParameters).toBeDefined();
    });

    it('should track convergence', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const config: OptimizationConfig = {
        strategyId: strategy.id,
        method: 'random_search',
        objective: 'max_return',
        parameters: [{
          parameterId: 'param_amount',
          range: [10, 1000],
        }],
        constraints: {},
        backtestConfig: {
          strategyId: strategy.id,
          period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
          initialCapital: 10000,
          slippageModel: { type: 'fixed', baseSlippage: 0.1 },
          feeModel: { tradingFee: 0.3, gasCost: 0.5 },
          dataGranularity: '1d',
        },
        maxIterations: 5,
      };

      const result = await optimizer.optimize(strategy, config);

      expect(result.convergenceCurve.length).toBeGreaterThan(0);
    });

    it('should calculate parameter sensitivity', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const config: OptimizationConfig = {
        strategyId: strategy.id,
        method: 'grid_search',
        objective: 'max_sharpe',
        parameters: [{
          parameterId: 'param_amount',
          range: [50, 200],
          step: 50,
        }],
        constraints: {},
        backtestConfig: {
          strategyId: strategy.id,
          period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
          initialCapital: 10000,
          slippageModel: { type: 'fixed', baseSlippage: 0.1 },
          feeModel: { tradingFee: 0.3, gasCost: 0.5 },
          dataGranularity: '1d',
        },
        maxIterations: 10,
      };

      const result = await optimizer.optimize(strategy, config);

      expect(result.parameterSensitivity.length).toBeGreaterThan(0);
      expect(result.parameterSensitivity[0].importance).toBeDefined();
    });

    it('should generate recommendations', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const config: OptimizationConfig = {
        strategyId: strategy.id,
        method: 'random_search',
        objective: 'max_sharpe',
        parameters: [{
          parameterId: 'param_amount',
          range: [10, 1000],
        }],
        constraints: {},
        backtestConfig: {
          strategyId: strategy.id,
          period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
          initialCapital: 10000,
          slippageModel: { type: 'fixed', baseSlippage: 0.1 },
          feeModel: { tradingFee: 0.3, gasCost: 0.5 },
          dataGranularity: '1d',
        },
        maxIterations: 5,
      };

      const result = await optimizer.optimize(strategy, config);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });
});

// ============================================================================
// AI Integration Tests
// ============================================================================

describe('AI Strategy Generator', () => {
  let generator: AIStrategyGenerator;

  beforeEach(() => {
    generator = createAIStrategyGenerator({ enabled: true });
  });

  describe('Generate Strategy', () => {
    it('should generate a strategy based on profile', async () => {
      const response = await generator.generateStrategy({
        userProfile: {
          riskTolerance: 'medium',
          investmentHorizon: 'medium',
          experience: 'intermediate',
          preferences: ['dca'],
          availableCapital: 10000,
        },
      });

      expect(response.strategy).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.strategy?.triggers.length).toBeGreaterThan(0);
    });

    it('should adjust risk controls based on risk tolerance', async () => {
      const lowRisk = await generator.generateStrategy({
        userProfile: {
          riskTolerance: 'low',
          investmentHorizon: 'long',
          experience: 'beginner',
          preferences: [],
          availableCapital: 5000,
        },
      });

      const highRisk = await generator.generateStrategy({
        userProfile: {
          riskTolerance: 'high',
          investmentHorizon: 'short',
          experience: 'advanced',
          preferences: ['momentum'],
          availableCapital: 5000,
        },
      });

      const lowRiskStopLoss = lowRisk.strategy?.riskControls.find(r => r.type === 'stop_loss');
      const highRiskStopLoss = highRisk.strategy?.riskControls.find(r => r.type === 'stop_loss');

      // Low risk should have tighter stop-loss
      if (lowRiskStopLoss && highRiskStopLoss) {
        const lowConfig = lowRiskStopLoss.config as { percentage: number };
        const highConfig = highRiskStopLoss.config as { percentage: number };
        expect(lowConfig.percentage).toBeLessThan(highConfig.percentage);
      }
    });

    it('should respect constraints', async () => {
      const response = await generator.generateStrategy({
        userProfile: {
          riskTolerance: 'medium',
          investmentHorizon: 'medium',
          experience: 'intermediate',
          preferences: [],
          availableCapital: 10000,
        },
        constraints: {
          allowedActions: ['swap', 'notify'],
          forbiddenTokens: ['SHIB'],
        },
      });

      const actionTypes = response.strategy?.actions.map(a => a.type);
      expect(actionTypes?.every(t => ['swap', 'notify'].includes(t))).toBe(true);
    });
  });

  describe('Analyze Strategy', () => {
    it('should analyze a strategy', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const response = await generator.analyzeStrategy({ strategy });

      expect(response.analysis).toBeDefined();
      expect(response.analysis?.strengths.length).toBeGreaterThan(0);
      expect(response.analysis?.overallScore).toBeGreaterThanOrEqual(0);
      expect(response.analysis?.overallScore).toBeLessThanOrEqual(100);
    });

    it('should identify weaknesses', async () => {
      const manager = createStrategyManager();
      const options = createMockCreateOptions();
      options.definition.riskControls = []; // No risk controls
      const strategy = await manager.createStrategy(options);

      const response = await generator.analyzeStrategy({ strategy });

      expect(response.analysis?.weaknesses.some(w => w.includes('stop-loss'))).toBe(true);
    });
  });

  describe('Suggest Improvements', () => {
    it('should suggest improvements', async () => {
      const manager = createStrategyManager();
      const options = createMockCreateOptions();
      options.definition.riskControls = []; // No risk controls
      const strategy = await manager.createStrategy(options);

      const response = await generator.suggestImprovements({ strategy });

      expect(response.suggestions).toBeDefined();
      expect(response.suggestions?.length).toBeGreaterThan(0);
      expect(response.suggestions?.[0].description).toBeDefined();
      expect(response.suggestions?.[0].expectedImpact).toBeGreaterThan(0);
    });
  });

  describe('Explain Strategy', () => {
    it('should explain a strategy in natural language', async () => {
      const manager = createStrategyManager();
      const strategy = await manager.createStrategy(createMockCreateOptions());

      const explanation = generator.explainStrategy(strategy);

      expect(explanation).toContain(strategy.name);
      expect(explanation).toContain('executes');
      expect(explanation).toContain('does');
    });
  });
});

// ============================================================================
// Full Strategy Engine Tests
// ============================================================================

describe('Strategy Engine', () => {
  let engine: DefaultStrategyEngine;

  beforeEach(() => {
    engine = createStrategyEngine({
      enabled: true,
      simulationMode: true,
    });
  });

  describe('Initialization', () => {
    it('should initialize all components', () => {
      expect(engine.manager).toBeDefined();
      expect(engine.dslParser).toBeDefined();
      expect(engine.dslValidator).toBeDefined();
      expect(engine.scheduler).toBeDefined();
      expect(engine.executor).toBeDefined();
      expect(engine.monitor).toBeDefined();
      expect(engine.backtester).toBeDefined();
      expect(engine.optimizer).toBeDefined();
      expect(engine.aiGenerator).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await engine.getHealth();

      expect(health.overall).toBe('healthy');
      expect(health.components.scheduler).toBe(true);
      expect(health.components.executor).toBe(true);
    });
  });

  describe('Event Forwarding', () => {
    it('should forward events to subscribers', async () => {
      const events: any[] = [];
      engine.onEvent((event) => events.push(event));

      const strategy = await engine.manager.createStrategy(createMockCreateOptions());
      await engine.manager.validateStrategy(strategy.id);
      await engine.manager.activateStrategy(strategy.id);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'strategy_created')).toBe(true);
      expect(events.some(e => e.type === 'strategy_activated')).toBe(true);
    });
  });

  describe('End-to-End Flow', () => {
    it('should handle complete strategy lifecycle', async () => {
      // Create strategy from DSL
      const dsl = createMockDSL();
      const definition = engine.dslParser.parse(dsl);

      // Validate DSL
      const validation = engine.dslValidator.validate(dsl);
      expect(validation.valid).toBe(true);

      // Create strategy
      const strategy = await engine.manager.createStrategy({
        name: 'E2E Test Strategy',
        description: 'End-to-end test',
        type: 'rule_based',
        userId: 'user_e2e',
        agentId: 'agent_e2e',
        definition,
      });

      // Validate
      await engine.manager.validateStrategy(strategy.id);

      // Backtest
      const backtestResult = await engine.backtester.runBacktest(strategy, {
        strategyId: strategy.id,
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        initialCapital: 10000,
        slippageModel: { type: 'fixed', baseSlippage: 0.1 },
        feeModel: { tradingFee: 0.3, gasCost: 0.5 },
        dataGranularity: '1d',
      });
      expect(backtestResult.status).toBe('completed');

      // Activate
      const activated = await engine.manager.activateStrategy(strategy.id);
      expect(activated.status).toBe('active');

      // Schedule
      engine.scheduler.schedule(activated);
      const jobs = engine.scheduler.getScheduledJobs();
      expect(jobs.some(j => j.strategyId === strategy.id)).toBe(true);

      // Execute manually
      const execution = await engine.scheduler.triggerManually(activated);
      expect(execution.status).toBeDefined();

      // Stop
      const stopped = await engine.manager.stopStrategy(strategy.id);
      expect(stopped.status).toBe('stopped');
    });
  });
});
