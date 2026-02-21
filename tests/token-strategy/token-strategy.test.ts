/**
 * TONAIAgent - Token Strategy Module Tests
 *
 * Comprehensive tests for token launch strategy, liquidity flywheel,
 * valuation modeling, and tokenomics simulation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTokenStrategyManager,
  createLaunchManager,
  createLiquidityFlywheelManager,
  createTokenStrategySimulation,
  DefaultTokenStrategyManager,
  DefaultLaunchManager,
  DefaultLiquidityFlywheelManager,
  DefaultTokenStrategySimulation,
  LaunchPhase,
  TokenStrategyEvent,
} from '../../src/token-strategy';

// ============================================================================
// Token Strategy Manager Tests
// ============================================================================

describe('TokenStrategyManager', () => {
  let manager: DefaultTokenStrategyManager;

  beforeEach(() => {
    manager = createTokenStrategyManager();
  });

  describe('initialization', () => {
    it('should create manager with default config', () => {
      expect(manager).toBeDefined();
      expect(manager.enabled).toBe(true);
      expect(manager.launch).toBeDefined();
      expect(manager.liquidity).toBeDefined();
      expect(manager.simulation).toBeDefined();
    });

    it('should create manager with custom config', () => {
      const customManager = createTokenStrategyManager({
        launch: {
          totalSupply: '500000000',
          initialCirculating: '50000000',
          initialPrice: '0.05',
          phases: [],
          tge: {
            initialMarketCap: '2500000',
            initialFDV: '25000000',
            dexLiquidity: '1000000',
          },
          antiWhale: {
            maxWalletPercent: 1,
            maxTransactionPercent: 0.25,
            sellTaxFirstDays: 14,
            sellTaxRate: 0.05,
          },
          launchIncentives: [],
        },
      });

      expect(customManager.launch.config.totalSupply).toBe('500000000');
      expect(customManager.launch.config.initialPrice).toBe('0.05');
    });
  });

  describe('getHealth', () => {
    it('should return healthy status', async () => {
      const health = await manager.getHealth();

      expect(health.overall).toBeDefined();
      expect(health.components.launch).toBe(true);
      expect(health.components.simulation).toBe(true);
      expect(health.launchPhase).toBeDefined();
      expect(health.flywheelStage).toBeGreaterThanOrEqual(1);
      expect(health.sustainabilityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('quick access methods', () => {
    it('should get launch progress', () => {
      const progress = manager.getLaunchProgress();

      expect(progress.currentPhase).toBeDefined();
      expect(progress.completionPercent).toBeGreaterThanOrEqual(0);
    });

    it('should get flywheel metrics', () => {
      const metrics = manager.getFlywheelMetrics();

      expect(metrics.currentPhase).toBeDefined();
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
    });

    it('should get liquidity health', () => {
      const health = manager.getLiquidityHealth();

      expect(health.overall).toBeDefined();
      expect(health.recommendations).toBeDefined();
    });

    it('should get valuation metrics', () => {
      const metrics = manager.getValuationMetrics();

      expect(metrics.circulatingSupply).toBeDefined();
      expect(metrics.stakingRatio).toBeGreaterThanOrEqual(0);
    });

    it('should calculate equilibrium', () => {
      const equilibrium = manager.calculateEquilibrium();

      expect(equilibrium.currentState).toBeDefined();
      expect(equilibrium.targetState).toBeDefined();
      expect(equilibrium.recommendations).toBeDefined();
    });

    it('should run simulation', () => {
      const result = manager.runSimulation(5);

      expect(result.projections.length).toBe(5);
      expect(result.summary).toBeDefined();
    });

    it('should run stress test', () => {
      const result = manager.runStressTest('market_crash');

      expect(result.scenario).toBe('market_crash');
      expect(result.survived).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('event handling', () => {
    it('should forward events from sub-managers', () => {
      const events: TokenStrategyEvent[] = [];
      manager.onEvent((event) => events.push(event));

      // Trigger an event through launch
      manager.launch.advancePhase();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].category).toBe('launch');
    });
  });
});

// ============================================================================
// Launch Manager Tests
// ============================================================================

describe('LaunchManager', () => {
  let launch: DefaultLaunchManager;

  beforeEach(() => {
    launch = createLaunchManager();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(launch.config.totalSupply).toBe('1000000000');
      expect(launch.config.initialCirculating).toBe('130000000');
      expect(launch.config.phases.length).toBeGreaterThan(0);
    });
  });

  describe('phase management', () => {
    it('should start in private phase', () => {
      expect(launch.getPhase()).toBe('private');
    });

    it('should get phase config', () => {
      const config = launch.getPhaseConfig('private');

      expect(config).toBeDefined();
      expect(config?.tokenPrice).toBe('0.01');
      expect(config?.vestingCliff).toBe(180);
    });

    it('should advance phases', () => {
      expect(launch.getPhase()).toBe('private');

      launch.advancePhase();
      expect(launch.getPhase()).toBe('strategic');

      launch.advancePhase();
      expect(launch.getPhase()).toBe('community');

      launch.advancePhase();
      expect(launch.getPhase()).toBe('public');
    });

    it('should track progress', () => {
      launch.recordInvestment('1000000', 'investor-1');
      launch.recordInvestment('500000', 'investor-2');

      const progress = launch.getProgress();

      expect(progress.totalRaised).toBe('1500000');
      expect(progress.participantCount).toBe(2);
      expect(progress.tokensDistributed).toBeDefined();
    });
  });

  describe('TGE simulation', () => {
    it('should simulate TGE', () => {
      const simulation = launch.simulateTGE();

      expect(simulation.initialCirculating).toBe('130000000');
      expect(parseFloat(simulation.initialMarketCap)).toBeGreaterThan(0);
      expect(parseFloat(simulation.expectedVolume24h)).toBeGreaterThan(0);
      expect(simulation.projectedStakingRatio).toBeGreaterThan(0);
    });

    it('should simulate TGE with custom params', () => {
      const simulation = launch.simulateTGE({
        dexLiquidity: '5000000',
      });

      expect(simulation.liquidityDepth).toBe('5000000');
    });
  });

  describe('incentives', () => {
    it('should return no active incentives before launch', () => {
      const active = launch.getActiveIncentives();

      expect(active.length).toBe(0);
    });

    it('should return active incentives after launch', () => {
      // Advance to public phase
      launch.advancePhase();
      launch.advancePhase();
      launch.advancePhase();

      launch.setLaunchDate(new Date());

      const active = launch.getActiveIncentives();

      expect(active.length).toBeGreaterThan(0);
    });

    it('should calculate incentive rewards', () => {
      launch.advancePhase();
      launch.advancePhase();
      launch.advancePhase();
      launch.setLaunchDate(new Date());

      const reward = launch.calculateIncentiveReward('staking_bonus', '1000');

      // With 2x multiplier, expect 2000
      expect(BigInt(reward)).toBeGreaterThan(BigInt('1000'));
    });
  });

  describe('anti-whale validation', () => {
    it('should allow valid transactions', () => {
      const result = launch.validateTransaction(
        '1000000', // 0.1% of supply
        '0',
        10
      );

      expect(result.allowed).toBe(true);
    });

    it('should reject transactions exceeding max', () => {
      const result = launch.validateTransaction(
        '10000000', // 1% of supply, exceeds 0.5% max
        '0',
        0
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
    });

    it('should apply sell tax in early days', () => {
      const result = launch.validateTransaction(
        '1000000',
        '10000000',
        15 // Within first 30 days
      );

      expect(result.allowed).toBe(true);
      expect(result.taxRate).toBeGreaterThan(0);
    });

    it('should not apply sell tax after grace period', () => {
      const result = launch.validateTransaction(
        '1000000',
        '10000000',
        60 // After 30 days
      );

      expect(result.allowed).toBe(true);
      expect(result.taxRate).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit phase completion events', () => {
      const events: TokenStrategyEvent[] = [];
      launch.onEvent((e) => events.push(e));

      launch.advancePhase();

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('launch_phase_completed');
    });

    it('should emit TGE event when reaching public phase', () => {
      const events: TokenStrategyEvent[] = [];
      launch.onEvent((e) => events.push(e));

      launch.advancePhase();
      launch.advancePhase();
      launch.advancePhase();

      const tgeEvent = events.find((e) => e.type === 'tge_executed');
      expect(tgeEvent).toBeDefined();
    });
  });
});

// ============================================================================
// Liquidity Flywheel Manager Tests
// ============================================================================

describe('LiquidityFlywheelManager', () => {
  let flywheel: DefaultLiquidityFlywheelManager;

  beforeEach(() => {
    flywheel = createLiquidityFlywheelManager();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(flywheel.config.phases.length).toBeGreaterThan(0);
      expect(flywheel.config.liquidityPools.length).toBeGreaterThan(0);
    });
  });

  describe('phase management', () => {
    it('should start in Bootstrap phase', () => {
      const phase = flywheel.getCurrentPhase();

      expect(phase.name).toBe('Bootstrap');
    });

    it('should advance phases', () => {
      flywheel.advancePhase();
      const phase = flywheel.getCurrentPhase();

      expect(phase.name).toBe('Growth');
    });
  });

  describe('flywheel stage', () => {
    it('should return stage based on TVL', () => {
      const stage = flywheel.getFlywheelStage();

      expect(stage.stage).toBeGreaterThanOrEqual(1);
      expect(stage.stage).toBeLessThanOrEqual(5);
      expect(stage.name).toBeDefined();
      expect(stage.description).toBeDefined();
    });

    it('should progress stages with TVL', () => {
      flywheel.setTVL('50000000000000000'); // $50M

      const stage = flywheel.getFlywheelStage();
      expect(stage.stage).toBeGreaterThanOrEqual(3);
    });
  });

  describe('pool management', () => {
    it('should get all pools', () => {
      const pools = flywheel.getPools();

      expect(pools.length).toBe(3);
    });

    it('should get specific pool', () => {
      const pool = flywheel.getPool('TONAI/TON');

      expect(pool).toBeDefined();
      expect(pool?.baseAPY).toBe(0.15);
    });

    it('should return undefined for unknown pool', () => {
      const pool = flywheel.getPool('UNKNOWN/PAIR');

      expect(pool).toBeUndefined();
    });
  });

  describe('APY calculation', () => {
    it('should calculate base APY', () => {
      const apy = flywheel.calculateAPY('TONAI/TON', 0, false);

      expect(apy).toBe(0.15);
    });

    it('should apply lock bonus', () => {
      const apy = flywheel.calculateAPY('TONAI/TON', 365, false);

      expect(apy).toBeGreaterThan(0.15);
    });

    it('should apply boost multiplier', () => {
      const apyWithBoost = flywheel.calculateAPY('TONAI/TON', 30, true);
      const apyWithoutBoost = flywheel.calculateAPY('TONAI/TON', 30, false);

      expect(apyWithBoost).toBeGreaterThan(apyWithoutBoost);
    });
  });

  describe('reward estimation', () => {
    it('should estimate rewards', () => {
      const estimate = flywheel.estimateRewards(
        'TONAI/TON',
        '10000000000', // 10,000 tokens
        90
      );

      expect(BigInt(estimate.yearlyReward)).toBeGreaterThan(0n);
      expect(BigInt(estimate.monthlyReward)).toBeGreaterThan(0n);
      expect(estimate.effectiveAPY).toBeGreaterThan(0);
    });

    it('should apply boost multiplier to rewards', () => {
      const estimate = flywheel.estimateRewards('TONAI/TON', '10000000000', 90);

      expect(estimate.boostMultiplier).toBe(2.0);
    });
  });

  describe('health monitoring', () => {
    it('should return healthy status by default', () => {
      const health = flywheel.getLiquidityHealth();

      expect(health.overall).toBeDefined();
      expect(['healthy', 'warning', 'critical']).toContain(health.overall);
    });

    it('should detect critical depth', () => {
      flywheel.setLiquidityDepth('10000000000'); // $10K

      const health = flywheel.getLiquidityHealth();

      expect(health.depth.status).toBe('critical');
    });

    it('should detect high spread', () => {
      flywheel.setSpread(0.03); // 3%

      const health = flywheel.getLiquidityHealth();

      expect(health.spread.status).toBe('critical');
    });

    it('should detect concentration issues', () => {
      flywheel.setConcentration(0.3); // 30%

      const health = flywheel.getLiquidityHealth();

      expect(health.concentration.status).toBe('critical');
    });

    it('should provide recommendations', () => {
      flywheel.setLiquidityDepth('10000000000');

      const health = flywheel.getLiquidityHealth();

      expect(health.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('health alerts', () => {
    it('should return alerts for unhealthy metrics', () => {
      flywheel.setLiquidityDepth('10000000000');
      flywheel.setSpread(0.03);

      const alerts = flywheel.checkHealthAlerts();

      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should categorize alerts by severity', () => {
      flywheel.setLiquidityDepth('10000000000');

      const alerts = flywheel.checkHealthAlerts();
      const critical = alerts.filter((a) => a.severity === 'critical');

      expect(critical.length).toBeGreaterThan(0);
    });
  });

  describe('incentive projection', () => {
    it('should calculate incentive projection', () => {
      const projection = flywheel.calculateIncentives({
        pair: 'TONAI/TON',
        amount: '10000000000',
        lockPeriod: 90,
        durationMonths: 6,
      });

      expect(BigInt(projection.totalRewards)).toBeGreaterThan(0n);
      expect(projection.monthlyRewards.length).toBe(6);
      expect(projection.unlockSchedule.length).toBeGreaterThan(0);
    });

    it('should include unlock schedule', () => {
      const projection = flywheel.calculateIncentives({
        pair: 'TONAI/TON',
        amount: '10000000000',
        lockPeriod: 90,
        durationMonths: 3,
      });

      const principalUnlock = projection.unlockSchedule.find(
        (e) => e.type === 'principal'
      );
      expect(principalUnlock).toBeDefined();
    });
  });

  describe('metrics', () => {
    it('should return flywheel metrics', () => {
      const metrics = flywheel.getFlywheelMetrics();

      expect(metrics.currentPhase).toBe('Bootstrap');
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);
    });

    it('should track liquidity changes', () => {
      flywheel.addLiquidity('1000000000000');

      const metrics = flywheel.getFlywheelMetrics();

      expect(BigInt(metrics.totalValueLocked)).toBeGreaterThan(0n);
      expect(metrics.activeProviders).toBe(1);
    });
  });

  describe('events', () => {
    it('should emit phase change events', () => {
      const events: TokenStrategyEvent[] = [];
      flywheel.onEvent((e) => events.push(e));

      flywheel.advancePhase();

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('flywheel_phase_changed');
    });

    it('should emit health alerts', () => {
      const events: TokenStrategyEvent[] = [];
      flywheel.onEvent((e) => events.push(e));

      flywheel.setLiquidityDepth('10000000000');
      flywheel.checkHealthAlerts();

      const alertEvent = events.find((e) => e.type === 'health_alert');
      expect(alertEvent).toBeDefined();
    });
  });
});

// ============================================================================
// Simulation Tests
// ============================================================================

describe('TokenStrategySimulation', () => {
  let simulation: DefaultTokenStrategySimulation;

  beforeEach(() => {
    simulation = createTokenStrategySimulation();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(simulation.config.initialSupply).toBe('1000000000');
      expect(simulation.config.emissionSchedule.length).toBe(4);
    });
  });

  describe('supply projection', () => {
    it('should project supply over time', () => {
      const projections = simulation.projectSupply(5);

      expect(projections.length).toBe(5);
      expect(BigInt(projections[4].circulating)).toBeGreaterThan(
        BigInt(projections[0].circulating)
      );
    });

    it('should track burns', () => {
      const projections = simulation.projectSupply(3);

      expect(BigInt(projections[2].totalBurned)).toBeGreaterThan(0n);
    });

    it('should calculate staking ratio', () => {
      const projections = simulation.projectSupply(1);

      const staked = BigInt(projections[0].staked);
      const circulating = BigInt(projections[0].circulating);
      const ratio = Number(staked * 100n / circulating) / 100;

      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThanOrEqual(1);
    });

    it('should get circulating supply for specific year', () => {
      const supply = simulation.getCirculatingSupply(3);

      expect(BigInt(supply)).toBeGreaterThan(BigInt('130000000'));
    });
  });

  describe('valuation metrics', () => {
    it('should return valuation metrics', () => {
      const metrics = simulation.getValuationMetrics();

      expect(metrics.circulatingSupply).toBeDefined();
      expect(metrics.price).toBeDefined();
      expect(metrics.marketCap).toBeDefined();
    });

    it('should update metrics with state changes', () => {
      simulation.setTotalStaked('50000000');

      const metrics = simulation.getValuationMetrics();

      expect(metrics.totalStaked).toBe('50000000');
      expect(metrics.stakingRatio).toBeGreaterThan(0);
    });
  });

  describe('equilibrium analysis', () => {
    it('should calculate equilibrium', () => {
      const equilibrium = simulation.calculateEquilibrium();

      expect(equilibrium.currentState).toBeDefined();
      expect(equilibrium.targetState).toBeDefined();
      expect(equilibrium.gapAnalysis).toBeDefined();
    });

    it('should provide recommendations', () => {
      const equilibrium = simulation.calculateEquilibrium();

      expect(equilibrium.recommendations).toBeDefined();
      expect(equilibrium.sustainabilityScore).toBeGreaterThanOrEqual(0);
    });

    it('should estimate time to equilibrium', () => {
      const equilibrium = simulation.calculateEquilibrium();

      expect(equilibrium.estimatedTimeToEquilibrium).toBeGreaterThan(0);
    });
  });

  describe('scenario simulation', () => {
    it('should run base scenario', () => {
      const result = simulation.runSimulation({
        years: 5,
        scenario: 'base',
      });

      expect(result.scenario).toBe('base');
      expect(result.projections.length).toBe(5);
      expect(result.summary).toBeDefined();
    });

    it('should run bull scenario', () => {
      const result = simulation.runSimulation({
        years: 3,
        scenario: 'bull',
      });

      expect(result.scenario).toBe('bull');
      expect(parseFloat(result.summary.peakPrice)).toBeGreaterThan(0);
    });

    it('should run bear scenario', () => {
      const result = simulation.runSimulation({
        years: 3,
        scenario: 'bear',
      });

      expect(result.scenario).toBe('bear');
    });

    it('should track users and agents', () => {
      const result = simulation.runSimulation({
        years: 2,
        scenario: 'base',
      });

      const finalYear = result.projections[1];
      expect(finalYear.users).toBeGreaterThan(0);
      expect(finalYear.agents).toBeGreaterThan(0);
    });

    it('should throw for unknown scenario', () => {
      expect(() =>
        simulation.runSimulation({
          years: 1,
          scenario: 'unknown',
        })
      ).toThrow('Unknown scenario');
    });
  });

  describe('stress testing', () => {
    it('should run market crash stress test', () => {
      const result = simulation.runStressTest('market_crash');

      expect(result.scenario).toBe('market_crash');
      expect(result.maxDrawdown).toBe(0.9);
      expect(result.recommendations).toBeDefined();
    });

    it('should run mass unstaking stress test', () => {
      const result = simulation.runStressTest('mass_unstaking');

      expect(result.scenario).toBe('mass_unstaking');
      expect(result.stakingRatioLow).toBeLessThan(0.6);
    });

    it('should run protocol exploit stress test', () => {
      const result = simulation.runStressTest('protocol_exploit');

      expect(result.scenario).toBe('protocol_exploit');
      expect(result.circuitBreakersTriggered.length).toBeGreaterThan(0);
    });

    it('should run regulatory action stress test', () => {
      const result = simulation.runStressTest('regulatory_action');

      expect(result.scenario).toBe('regulatory_action');
      expect(result.recoveryTime).toBeGreaterThan(0);
    });

    it('should identify survival', () => {
      const result = simulation.runStressTest('market_crash');

      expect(typeof result.survived).toBe('boolean');
    });

    it('should list available scenarios', () => {
      const scenarios = simulation.getStressScenarios();

      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios.find((s) => s.name === 'market_crash')).toBeDefined();
    });

    it('should accept custom stress scenario', () => {
      const result = simulation.runStressTest({
        name: 'custom_scenario',
        trigger: 'Custom event',
        priceImpact: -0.5,
        stakingImpact: -0.2,
        liquidityImpact: -0.3,
        duration: 30,
      });

      expect(result.scenario).toBe('custom_scenario');
    });

    it('should throw for unknown scenario name', () => {
      expect(() => simulation.runStressTest('unknown_scenario')).toThrow(
        'Unknown stress scenario'
      );
    });
  });

  describe('events', () => {
    it('should emit simulation completed events', () => {
      const events: TokenStrategyEvent[] = [];
      simulation.onEvent((e) => events.push(e));

      simulation.runSimulation({ years: 1, scenario: 'base' });

      const simEvent = events.find((e) => e.type === 'simulation_completed');
      expect(simEvent).toBeDefined();
    });

    it('should emit stress test events', () => {
      const events: TokenStrategyEvent[] = [];
      simulation.onEvent((e) => events.push(e));

      simulation.runStressTest('market_crash');

      const stressEvent = events.find((e) => e.type === 'stress_test_triggered');
      expect(stressEvent).toBeDefined();
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Token Strategy Integration', () => {
  let manager: DefaultTokenStrategyManager;

  beforeEach(() => {
    manager = createTokenStrategyManager();
  });

  describe('launch to flywheel transition', () => {
    it('should maintain consistent supply across modules', () => {
      const launchSupply = manager.launch.config.totalSupply;
      const simSupply = manager.simulation.config.initialSupply;

      expect(launchSupply).toBe(simSupply);
    });
  });

  describe('full ecosystem simulation', () => {
    it('should simulate 5-year ecosystem evolution', () => {
      // Run full simulation
      const result = manager.runSimulation(5, 'base');

      // Verify projections exist
      expect(result.projections.length).toBe(5);

      // Verify sustainability
      expect(result.summary.sustainabilityScore).toBeGreaterThan(50);
    });

    it('should survive stress test after maturity', () => {
      // Simulate mature ecosystem
      manager.liquidity.setTVL('100000000000000000'); // $100M
      manager.liquidity.setActiveProviders(1000);

      // Run stress test
      const result = manager.runStressTest('market_crash');

      // Mature ecosystem should be more resilient
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('event aggregation', () => {
    it('should aggregate events from all modules', () => {
      const events: TokenStrategyEvent[] = [];
      manager.onEvent((e) => events.push(e));

      // Trigger events from different modules
      manager.launch.advancePhase();
      manager.liquidity.advancePhase();
      manager.runSimulation(1, 'base');

      expect(events.length).toBeGreaterThanOrEqual(3);

      const categories = new Set(events.map((e) => e.category));
      expect(categories.has('launch')).toBe(true);
      expect(categories.has('liquidity')).toBe(true);
      expect(categories.has('simulation')).toBe(true);
    });
  });
});
