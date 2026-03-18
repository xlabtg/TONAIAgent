/**
 * Autonomous AI Investment Layer Tests
 *
 * Comprehensive tests for the Autonomous AI Investment Layer features added in Issue #102:
 * - Capital Vault Architecture
 * - Risk Management Engine
 * - Capital Allocation Framework
 * - AI Portfolio Optimization
 * - Permissioned & Institutional Mode
 * - Performance Transparency Layer
 * - Integration with unified InvestmentLayer service
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createVaultManager,
  createRiskEngine,
  createAllocationEngine,
  createPortfolioOptimizer,
  createInstitutionalModeManager,
  createPerformanceAnalyticsEngine,
  createInvestmentLayer,
  DefaultVaultManager,
  DefaultRiskEngine,
  DefaultAllocationEngine,
  DefaultPortfolioOptimizer,
  DefaultInstitutionalModeManager,
  DefaultPerformanceAnalyticsEngine,
  DefaultInvestmentLayer,
} from '../../services/investment';

import type {
  Vault,
  VaultType,
  DepositResult,
  WithdrawalRequest,
  AgentRiskProfile,
  RiskCheckResult,
  CircuitBreakerEvent,
  EmergencyStopEvent,
  AllocationPlan,
  RebalanceResult,
  StrategyPerformanceScore,
  OptimizationResult,
  VolatilityMetrics,
  ManagedVault,
  DelegationPermission,
  AuditEntry,
  VaultPerformanceMetrics,
  PerformanceSnapshot,
  HistoricalReturn,
  PerformanceDashboardData,
  InvestmentLayerHealth,
  InvestmentEvent,
} from '../../services/investment';

// ============================================================================
// VaultManager Tests
// ============================================================================

describe('VaultManager', () => {
  let vaultManager: DefaultVaultManager;

  beforeEach(() => {
    vaultManager = createVaultManager({ maxVaultsPerOwner: 3, minDepositAmount: 1, minWithdrawalAmount: 0.1 });
  });

  describe('createVault', () => {
    it('should create a user vault with default parameters', async () => {
      const vault = await vaultManager.createVault({
        ownerId: 'user-1',
        name: 'My Portfolio Vault',
        type: 'user',
      });

      expect(vault).toBeDefined();
      expect(vault.id).toBeTruthy();
      expect(vault.ownerId).toBe('user-1');
      expect(vault.name).toBe('My Portfolio Vault');
      expect(vault.type).toBe('user');
      expect(vault.status).toBe('active');
      expect(vault.balance).toBe(0);
      expect(vault.allocatedBalance).toBe(0);
      expect(vault.availableBalance).toBe(0);
      expect(vault.boundStrategyIds).toEqual([]);
      expect(vault.riskParameters).toBeDefined();
      expect(vault.allocationLimits).toBeDefined();
      expect(vault.createdAt).toBeInstanceOf(Date);
    });

    it('should create a vault with initial deposit', async () => {
      const vault = await vaultManager.createVault({
        ownerId: 'user-1',
        name: 'Funded Vault',
        type: 'user',
        initialDeposit: 1000,
      });

      expect(vault.balance).toBe(1000);
      expect(vault.availableBalance).toBe(1000);
    });

    it('should create a DAO treasury vault', async () => {
      const vault = await vaultManager.createVault({
        ownerId: 'dao-1',
        name: 'DAO Treasury',
        type: 'dao_treasury',
      });

      expect(vault.type).toBe('dao_treasury');
    });

    it('should apply custom risk parameters', async () => {
      const vault = await vaultManager.createVault({
        ownerId: 'user-1',
        name: 'Conservative Vault',
        type: 'user',
        riskParameters: { maxDrawdown: 10, circuitBreakerEnabled: true },
      });

      expect(vault.riskParameters.maxDrawdown).toBe(10);
      expect(vault.riskParameters.circuitBreakerEnabled).toBe(true);
    });

    it('should enforce per-owner vault limit', async () => {
      await vaultManager.createVault({ ownerId: 'user-1', name: 'Vault 1', type: 'user' });
      await vaultManager.createVault({ ownerId: 'user-1', name: 'Vault 2', type: 'user' });
      await vaultManager.createVault({ ownerId: 'user-1', name: 'Vault 3', type: 'user' });

      await expect(
        vaultManager.createVault({ ownerId: 'user-1', name: 'Vault 4', type: 'user' })
      ).rejects.toThrow('maximum vault limit');
    });

    it('should allow different owners to create vaults independently', async () => {
      const vault1 = await vaultManager.createVault({ ownerId: 'user-1', name: 'Vault 1', type: 'user' });
      const vault2 = await vaultManager.createVault({ ownerId: 'user-2', name: 'Vault 2', type: 'user' });

      expect(vault1.ownerId).toBe('user-1');
      expect(vault2.ownerId).toBe('user-2');
    });
  });

  describe('getVault / listVaults', () => {
    it('should retrieve a vault by id', async () => {
      const created = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test Vault', type: 'user' });
      const retrieved = await vaultManager.getVault(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should return null for non-existent vault', async () => {
      const vault = await vaultManager.getVault('non-existent-id');
      expect(vault).toBeNull();
    });

    it('should list all vaults for an owner', async () => {
      await vaultManager.createVault({ ownerId: 'user-1', name: 'Vault A', type: 'user' });
      await vaultManager.createVault({ ownerId: 'user-1', name: 'Vault B', type: 'strategy' });
      await vaultManager.createVault({ ownerId: 'user-2', name: 'Other User Vault', type: 'user' });

      const userVaults = await vaultManager.listVaults('user-1');
      expect(userVaults).toHaveLength(2);
      expect(userVaults.every(v => v.ownerId === 'user-1')).toBe(true);
    });
  });

  describe('deposit', () => {
    it('should deposit funds into a vault', async () => {
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user' });
      const result = await vaultManager.deposit(vault.id, 500);

      expect(result.amount).toBe(500);
      expect(result.newBalance).toBe(500);
      expect(result.previousBalance).toBe(0);
      expect(result.txHash).toBeTruthy();

      const updated = await vaultManager.getVault(vault.id);
      expect(updated!.balance).toBe(500);
      expect(updated!.availableBalance).toBe(500);
    });

    it('should reject deposit below minimum', async () => {
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user' });
      await expect(vaultManager.deposit(vault.id, 0.05)).rejects.toThrow('minimum');
    });

    it('should reject deposit to non-active vault', async () => {
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user' });
      await vaultManager.updateVaultStatus(vault.id, 'paused');
      await expect(vaultManager.deposit(vault.id, 100)).rejects.toThrow('not active');
    });
  });

  describe('withdrawal', () => {
    it('should create and process a withdrawal request', async () => {
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user', initialDeposit: 1000 });

      const request = await vaultManager.requestWithdrawal(vault.id, 200, 'Profit taking');
      expect(request.status).toBe('pending');
      expect(request.amount).toBe(200);
      expect(request.reason).toBe('Profit taking');

      const processed = await vaultManager.processWithdrawal(request.id);
      expect(processed.status).toBe('completed');
      expect(processed.txHash).toBeTruthy();

      const updatedVault = await vaultManager.getVault(vault.id);
      expect(updatedVault!.balance).toBe(800);
    });

    it('should reject withdrawal below minimum', async () => {
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user', initialDeposit: 100 });
      await expect(vaultManager.requestWithdrawal(vault.id, 0.05)).rejects.toThrow('minimum');
    });

    it('should reject withdrawal exceeding available balance', async () => {
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user', initialDeposit: 100 });
      await expect(vaultManager.requestWithdrawal(vault.id, 500)).rejects.toThrow('Insufficient available balance');
    });

    it('should reject processing a non-pending withdrawal', async () => {
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user', initialDeposit: 100 });
      const request = await vaultManager.requestWithdrawal(vault.id, 50);
      await vaultManager.processWithdrawal(request.id);

      await expect(vaultManager.processWithdrawal(request.id)).rejects.toThrow('not pending');
    });
  });

  describe('strategy binding', () => {
    it('should bind and unbind strategies', async () => {
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user' });

      const bound = await vaultManager.bindStrategy(vault.id, 'strategy-1');
      expect(bound.boundStrategyIds).toContain('strategy-1');

      const unbound = await vaultManager.unbindStrategy(vault.id, 'strategy-1');
      expect(unbound.boundStrategyIds).not.toContain('strategy-1');
    });

    it('should reject binding a duplicate strategy', async () => {
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user' });
      await vaultManager.bindStrategy(vault.id, 'strategy-1');
      await expect(vaultManager.bindStrategy(vault.id, 'strategy-1')).rejects.toThrow('already bound');
    });
  });

  describe('events', () => {
    it('should emit vault_created event', async () => {
      const events: InvestmentEvent[] = [];
      vaultManager.onEvent(e => events.push(e));

      await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user' });

      expect(events.some(e => e.type === 'vault_created')).toBe(true);
    });

    it('should emit vault_deposit event', async () => {
      const events: InvestmentEvent[] = [];
      const vault = await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user' });
      vaultManager.onEvent(e => events.push(e));

      await vaultManager.deposit(vault.id, 100);

      expect(events.some(e => e.type === 'vault_deposit')).toBe(true);
    });

    it('should unsubscribe from events', async () => {
      const events: InvestmentEvent[] = [];
      const unsub = vaultManager.onEvent(e => events.push(e));
      unsub();

      await vaultManager.createVault({ ownerId: 'user-1', name: 'Test', type: 'user' });
      expect(events).toHaveLength(0);
    });
  });
});

// ============================================================================
// RiskEngine Tests
// ============================================================================

describe('RiskEngine', () => {
  let riskEngine: DefaultRiskEngine;

  beforeEach(() => {
    riskEngine = createRiskEngine({
      defaultMaxDrawdown: 20,
      defaultExposureLimit: 40,
      defaultDailyLossLimit: 50,
    });
  });

  describe('createRiskProfile', () => {
    it('should create a risk profile for an agent', async () => {
      const profile = await riskEngine.createRiskProfile('agent-1', 'vault-1');

      expect(profile.agentId).toBe('agent-1');
      expect(profile.vaultId).toBe('vault-1');
      expect(profile.maxDrawdownLimit).toBe(20);
      expect(profile.currentDrawdown).toBe(0);
      expect(profile.circuitBreakerStatus).toBe('closed');
      expect(profile.riskLevel).toBe('low');
    });

    it('should create profile with custom parameters', async () => {
      const profile = await riskEngine.createRiskProfile('agent-1', 'vault-1', {
        maxDrawdownLimit: 10,
        exposureLimit: 30,
        dailyLossLimit: 25,
      });

      expect(profile.maxDrawdownLimit).toBe(10);
      expect(profile.exposureLimit).toBe(30);
      expect(profile.dailyLossLimit).toBe(25);
    });

    it('should reject duplicate profile creation', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');
      await expect(riskEngine.createRiskProfile('agent-1', 'vault-1')).rejects.toThrow('already exists');
    });
  });

  describe('checkRisk', () => {
    it('should pass risk check for safe action', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');

      const result = await riskEngine.checkRisk('agent-1', {
        type: 'allocate',
        proposedExposurePercent: 10,
        proposedPositionSizePercent: 5,
      });

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail risk check when exposure exceeds limit', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');

      const result = await riskEngine.checkRisk('agent-1', {
        type: 'allocate',
        proposedExposurePercent: 60, // Exceeds 40% limit
        proposedPositionSizePercent: 5,
      });

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'exposure')).toBe(true);
    });

    it('should fail risk check when circuit breaker is open', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');
      await riskEngine.triggerCircuitBreaker('agent-1', 'manual', 'Test trigger');

      const result = await riskEngine.checkRisk('agent-1', {
        type: 'allocate',
        proposedExposurePercent: 10,
        proposedPositionSizePercent: 5,
      });

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'circuit_breaker')).toBe(true);
    });

    it('should scale position size by confidence', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');

      // Position size of 30% with 50% confidence = effective 15%, which is below max 25%
      const result = await riskEngine.checkRisk('agent-1', {
        type: 'position_open',
        proposedExposurePercent: 10,
        proposedPositionSizePercent: 30,
        confidence: 0.5,
      });

      // Should pass because effective size (15%) < max (25%)
      expect(result.violations.filter(v => v.type === 'position_size')).toHaveLength(0);
    });
  });

  describe('circuit breakers', () => {
    it('should trigger and reset circuit breaker', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');

      const event = await riskEngine.triggerCircuitBreaker('agent-1', 'drawdown', 'Drawdown exceeded');
      expect(event.status).toBe('open');
      expect(event.trigger).toBe('drawdown');

      const status = await riskEngine.getCircuitBreakerStatus('agent-1');
      expect(status).toBe('open');

      const resetEvent = await riskEngine.resetCircuitBreaker('agent-1');
      expect(resetEvent.status).toBe('closed');
      expect(resetEvent.resetAt).toBeInstanceOf(Date);
    });

    it('should list circuit breaker events', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');
      await riskEngine.triggerCircuitBreaker('agent-1', 'daily_loss', 'Daily loss exceeded');

      const events = await riskEngine.listCircuitBreakerEvents('agent-1');
      expect(events).toHaveLength(1);
      expect(events[0].trigger).toBe('daily_loss');
    });

    it('should reject reset when no circuit breaker is open', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');
      await expect(riskEngine.resetCircuitBreaker('agent-1')).rejects.toThrow('No open circuit breaker');
    });

    it('should auto-trigger circuit breaker on drawdown breach', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');
      await riskEngine.recordDrawdown('agent-1', 25); // Exceeds 20% limit

      const status = await riskEngine.getCircuitBreakerStatus('agent-1');
      expect(status).toBe('open');
    });
  });

  describe('emergency stops', () => {
    it('should trigger and resolve emergency stop', async () => {
      await riskEngine.createRiskProfile('agent-1', 'vault-1');
      await riskEngine.createRiskProfile('agent-2', 'vault-1');

      const event = await riskEngine.triggerEmergencyStop('vault-1', 'admin', 'Market crash detected');
      expect(event.resolved).toBe(false);
      expect(event.affectedAgentIds).toContain('agent-1');
      expect(event.affectedAgentIds).toContain('agent-2');

      const active = await riskEngine.getActiveEmergencyStop('vault-1');
      expect(active).not.toBeNull();
      expect(active!.reason).toBe('Market crash detected');

      const resolved = await riskEngine.resolveEmergencyStop(event.id);
      expect(resolved.resolved).toBe(true);
      expect(resolved.resolvedAt).toBeInstanceOf(Date);

      const afterResolve = await riskEngine.getActiveEmergencyStop('vault-1');
      expect(afterResolve).toBeNull();
    });

    it('should return null for vault with no active emergency stop', async () => {
      const stop = await riskEngine.getActiveEmergencyStop('vault-no-stop');
      expect(stop).toBeNull();
    });
  });

  describe('events', () => {
    it('should emit risk_check_failed event on failed check', async () => {
      const events: InvestmentEvent[] = [];
      riskEngine.onEvent(e => events.push(e));

      await riskEngine.createRiskProfile('agent-1', 'vault-1');
      await riskEngine.checkRisk('agent-1', {
        type: 'allocate',
        proposedExposurePercent: 90, // Way over limit
        proposedPositionSizePercent: 5,
      });

      expect(events.some(e => e.type === 'risk_check_failed')).toBe(true);
    });

    it('should emit circuit_breaker_triggered event', async () => {
      const events: InvestmentEvent[] = [];
      riskEngine.onEvent(e => events.push(e));

      await riskEngine.createRiskProfile('agent-1', 'vault-1');
      await riskEngine.triggerCircuitBreaker('agent-1', 'manual', 'Test');

      expect(events.some(e => e.type === 'circuit_breaker_triggered')).toBe(true);
    });
  });
});

// ============================================================================
// AllocationEngine Tests
// ============================================================================

describe('AllocationEngine', () => {
  let allocationEngine: DefaultAllocationEngine;

  beforeEach(() => {
    allocationEngine = createAllocationEngine({ defaultRebalanceThreshold: 5 });
  });

  describe('createAllocationPlan', () => {
    it('should create a multi-strategy allocation plan', async () => {
      const plan = await allocationEngine.createAllocationPlan({
        vaultId: 'vault-1',
        strategy: 'weighted',
        allocations: [
          { strategyId: 'trading', agentId: 'agent-1', targetPercent: 40, weight: 0.4 },
          { strategyId: 'yield', agentId: 'agent-2', targetPercent: 30, weight: 0.3 },
          { strategyId: 'arbitrage', agentId: 'agent-3', targetPercent: 30, weight: 0.3 },
        ],
      });

      expect(plan.id).toBeTruthy();
      expect(plan.vaultId).toBe('vault-1');
      expect(plan.strategy).toBe('weighted');
      expect(plan.allocations).toHaveLength(3);
      expect(plan.status).toBe('active');
    });

    it('should reject allocations that do not sum to 100%', async () => {
      await expect(
        allocationEngine.createAllocationPlan({
          vaultId: 'vault-1',
          strategy: 'multi',
          allocations: [
            { strategyId: 'trading', agentId: 'agent-1', targetPercent: 40, weight: 0.5 },
            { strategyId: 'yield', agentId: 'agent-2', targetPercent: 40, weight: 0.5 },
          ],
        })
      ).rejects.toThrow('sum to 100%');
    });

    it('should reject allocations below minimum percent', async () => {
      await expect(
        allocationEngine.createAllocationPlan({
          vaultId: 'vault-1',
          strategy: 'multi',
          allocations: [
            { strategyId: 'trading', agentId: 'agent-1', targetPercent: 0.5, weight: 0.005 },
            { strategyId: 'yield', agentId: 'agent-2', targetPercent: 99.5, weight: 0.995 },
          ],
        })
      ).rejects.toThrow('below minimum');
    });
  });

  describe('rebalancing', () => {
    let planId: string;

    beforeEach(async () => {
      const plan = await allocationEngine.createAllocationPlan({
        vaultId: 'vault-1',
        strategy: 'weighted',
        allocations: [
          { strategyId: 'trading', agentId: 'agent-1', targetPercent: 40, weight: 0.4 },
          { strategyId: 'yield', agentId: 'agent-2', targetPercent: 60, weight: 0.6 },
        ],
      });
      planId = plan.id;
    });

    it('should rebalance allocations to target', async () => {
      const result = await allocationEngine.rebalance(planId);

      expect(result.planId).toBe(planId);
      expect(result.reason).toBe('manual');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should detect when rebalance is needed', async () => {
      // Manually shift allocations
      await allocationEngine.updateAllocations(planId, [
        { strategyId: 'trading', currentPercent: 50 }, // Drifted from 40%
      ]);

      const needed = await allocationEngine.checkRebalanceNeeded(planId);
      expect(needed).toBe(true);
    });

    it('should record rebalance history', async () => {
      await allocationEngine.rebalance(planId, 'ai_recommendation');
      await allocationEngine.rebalance(planId, 'threshold_breach');

      const history = await allocationEngine.listRebalanceHistory(planId);
      expect(history).toHaveLength(2);
      expect(history[0].reason).toBe('ai_recommendation');
      expect(history[1].reason).toBe('threshold_breach');
    });
  });

  describe('performance-based reallocation', () => {
    it('should apply performance reallocation', async () => {
      const plan = await allocationEngine.createAllocationPlan({
        vaultId: 'vault-1',
        strategy: 'performance_based',
        allocations: [
          { strategyId: 'trading', agentId: 'agent-1', targetPercent: 50, weight: 0.5 },
          { strategyId: 'yield', agentId: 'agent-2', targetPercent: 50, weight: 0.5 },
        ],
      });

      // Update performance scores: trading performs better
      await allocationEngine.updatePerformanceScores(plan.id, {
        trading: 80,
        yield: 40,
      });

      const result = await allocationEngine.applyPerformanceReallocation(plan.id);
      expect(result.reason).toBe('performance_trigger');
    });
  });

  describe('events', () => {
    it('should emit allocation_created event', async () => {
      const events: InvestmentEvent[] = [];
      allocationEngine.onEvent(e => events.push(e));

      await allocationEngine.createAllocationPlan({
        vaultId: 'vault-1',
        strategy: 'weighted',
        allocations: [
          { strategyId: 'trading', agentId: 'agent-1', targetPercent: 60, weight: 0.6 },
          { strategyId: 'yield', agentId: 'agent-2', targetPercent: 40, weight: 0.4 },
        ],
      });

      expect(events.some(e => e.type === 'allocation_created')).toBe(true);
    });

    it('should emit allocation_rebalanced event', async () => {
      const events: InvestmentEvent[] = [];
      const plan = await allocationEngine.createAllocationPlan({
        vaultId: 'vault-1',
        strategy: 'weighted',
        allocations: [
          { strategyId: 'trading', agentId: 'agent-1', targetPercent: 60, weight: 0.6 },
          { strategyId: 'yield', agentId: 'agent-2', targetPercent: 40, weight: 0.4 },
        ],
      });

      allocationEngine.onEvent(e => events.push(e));
      await allocationEngine.rebalance(plan.id);

      expect(events.some(e => e.type === 'allocation_rebalanced')).toBe(true);
    });
  });
});

// ============================================================================
// PortfolioOptimizer Tests
// ============================================================================

describe('PortfolioOptimizer', () => {
  let optimizer: DefaultPortfolioOptimizer;

  beforeEach(() => {
    optimizer = createPortfolioOptimizer();
  });

  describe('scoreStrategy', () => {
    it('should score a strategy with return data', async () => {
      const returns = Array.from({ length: 30 }, (_, i) => (Math.sin(i * 0.3) * 2 + 0.1));

      const score = await optimizer.scoreStrategy('strategy-1', 'agent-1', { returns });

      expect(score.strategyId).toBe('strategy-1');
      expect(score.compositeScore).toBeGreaterThanOrEqual(0);
      expect(score.compositeScore).toBeLessThanOrEqual(100);
      expect(score.sharpeRatio).toBeDefined();
      expect(score.calculatedAt).toBeInstanceOf(Date);
    });

    it('should reject scoring with no return data', async () => {
      await expect(
        optimizer.scoreStrategy('strategy-1', 'agent-1', { returns: [] })
      ).rejects.toThrow('no return data');
    });

    it('should return null for unscored strategy', async () => {
      const score = await optimizer.getStrategyScore('unknown-strategy');
      expect(score).toBeNull();
    });
  });

  describe('optimize', () => {
    it('should generate optimization recommendations', async () => {
      const currentAllocations = [
        { strategyId: 'trading', agentId: 'agent-1', targetPercent: 50, currentPercent: 50, allocatedAmount: 500, weight: 0.5, performanceScore: 70 },
        { strategyId: 'yield', agentId: 'agent-2', targetPercent: 50, currentPercent: 50, allocatedAmount: 500, weight: 0.5, performanceScore: 60 },
      ];

      const result = await optimizer.optimize('vault-1', currentAllocations);

      expect(result.id).toBeTruthy();
      expect(result.vaultId).toBe('vault-1');
      expect(result.recommendedAllocations).toHaveLength(2);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should reject optimization with empty allocations', async () => {
      await expect(optimizer.optimize('vault-1', [])).rejects.toThrow('no current allocations');
    });

    it('should apply optimization', async () => {
      const allocations = [
        { strategyId: 'trading', agentId: 'agent-1', targetPercent: 60, currentPercent: 60, allocatedAmount: 600, weight: 0.6, performanceScore: 75 },
        { strategyId: 'yield', agentId: 'agent-2', targetPercent: 40, currentPercent: 40, allocatedAmount: 400, weight: 0.4, performanceScore: 65 },
      ];

      const result = await optimizer.optimize('vault-1', allocations);
      const applied = await optimizer.applyOptimization(result.id);

      expect(applied.appliedAt).toBeInstanceOf(Date);
    });

    it('should track optimization history', async () => {
      const allocations = [
        { strategyId: 'trading', agentId: 'agent-1', targetPercent: 60, currentPercent: 60, allocatedAmount: 600, weight: 0.6, performanceScore: 75 },
        { strategyId: 'yield', agentId: 'agent-2', targetPercent: 40, currentPercent: 40, allocatedAmount: 400, weight: 0.4, performanceScore: 65 },
      ];

      const result = await optimizer.optimize('vault-1', allocations);
      await optimizer.applyOptimization(result.id);

      const history = await optimizer.listOptimizationHistory('vault-1');
      expect(history).toHaveLength(1);
    });
  });

  describe('volatility tracking', () => {
    it('should record and retrieve volatility metrics', async () => {
      const dailyReturns = [0.5, -0.3, 1.2, -0.8, 0.2, 0.6, -0.1];

      const metrics = await optimizer.recordVolatility('strategy-1', { dailyReturns });

      expect(metrics.strategyId).toBe('strategy-1');
      expect(metrics.dailyVolatility).toBeGreaterThan(0);
      expect(metrics.annualizedVolatility).toBeGreaterThan(metrics.dailyVolatility);
      expect(metrics.calculatedAt).toBeInstanceOf(Date);

      const retrieved = await optimizer.getVolatility('strategy-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.annualizedVolatility).toEqual(metrics.annualizedVolatility);
    });

    it('should return null for untracked strategy', async () => {
      const vol = await optimizer.getVolatility('unknown-strategy');
      expect(vol).toBeNull();
    });

    it('should reject volatility recording with empty returns', async () => {
      await expect(optimizer.recordVolatility('strategy-1', { dailyReturns: [] })).rejects.toThrow('no daily returns');
    });
  });
});

// ============================================================================
// InstitutionalModeManager Tests
// ============================================================================

describe('InstitutionalModeManager', () => {
  let manager: DefaultInstitutionalModeManager;

  beforeEach(() => {
    manager = createInstitutionalModeManager({ maxManagedVaultsPerInstitution: 3 });
  });

  describe('createManagedVault', () => {
    it('should create a managed vault', async () => {
      const mv = await manager.createManagedVault({
        vaultId: 'vault-1',
        institutionId: 'bank-1',
        tier: 'managed',
        whitelistedStrategies: ['strategy-1', 'strategy-2'],
      });

      expect(mv.id).toBeTruthy();
      expect(mv.institutionId).toBe('bank-1');
      expect(mv.tier).toBe('managed');
      expect(mv.complianceStatus).toBe('pending');
      expect(mv.whitelistedStrategies).toContain('strategy-1');
    });

    it('should enforce per-institution limit', async () => {
      await manager.createManagedVault({ vaultId: 'v1', institutionId: 'bank-1', tier: 'managed' });
      await manager.createManagedVault({ vaultId: 'v2', institutionId: 'bank-1', tier: 'managed' });
      await manager.createManagedVault({ vaultId: 'v3', institutionId: 'bank-1', tier: 'managed' });

      await expect(
        manager.createManagedVault({ vaultId: 'v4', institutionId: 'bank-1', tier: 'managed' })
      ).rejects.toThrow('managed vault limit');
    });

    it('should apply compliance constraints', async () => {
      const mv = await manager.createManagedVault({
        vaultId: 'vault-1',
        institutionId: 'bank-1',
        tier: 'compliance_required',
        complianceConstraints: [
          {
            type: 'exposure_limit',
            description: 'Max 30% per strategy',
            parameters: { maxPercent: 30 },
            enforced: true,
          },
        ],
      });

      expect(mv.complianceConstraints).toHaveLength(1);
      expect(mv.complianceConstraints[0].type).toBe('exposure_limit');
    });
  });

  describe('compliance status', () => {
    it('should update compliance status', async () => {
      const mv = await manager.createManagedVault({ vaultId: 'vault-1', institutionId: 'bank-1', tier: 'managed' });
      const updated = await manager.updateComplianceStatus(mv.id, 'approved', 'KYC passed');

      expect(updated.complianceStatus).toBe('approved');
    });

    it('should check compliance constraints', async () => {
      const mv = await manager.createManagedVault({
        vaultId: 'vault-1',
        institutionId: 'bank-1',
        tier: 'compliance_required',
        whitelistedStrategies: ['allowed-strategy'],
        complianceConstraints: [
          {
            type: 'strategy_whitelist',
            description: 'Only whitelisted strategies',
            parameters: {},
            enforced: true,
          },
        ],
      });

      const allowed = await manager.checkComplianceConstraints(mv.id, {
        type: 'strategy_use',
        strategyId: 'allowed-strategy',
      });
      expect(allowed.passed).toBe(true);

      const blocked = await manager.checkComplianceConstraints(mv.id, {
        type: 'strategy_use',
        strategyId: 'unknown-strategy',
      });
      expect(blocked.passed).toBe(false);
      expect(blocked.violations).toHaveLength(1);
    });
  });

  describe('delegation', () => {
    it('should grant and check delegation permissions', async () => {
      await manager.grantDelegation({
        managerId: 'manager-1',
        vaultId: 'vault-1',
        permissions: ['allocate', 'rebalance'],
        maxAllocationPercent: 50,
      });

      const canAllocate = await manager.checkDelegationPermission('manager-1', 'vault-1', 'allocate');
      expect(canAllocate).toBe(true);

      const canWithdraw = await manager.checkDelegationPermission('manager-1', 'vault-1', 'withdraw');
      expect(canWithdraw).toBe(false);
    });

    it('should revoke delegation', async () => {
      await manager.grantDelegation({
        managerId: 'manager-1',
        vaultId: 'vault-1',
        permissions: ['allocate'],
        maxAllocationPercent: 50,
      });

      await manager.revokeDelegation('manager-1', 'vault-1');

      const canAllocate = await manager.checkDelegationPermission('manager-1', 'vault-1', 'allocate');
      expect(canAllocate).toBe(false);
    });

    it('should list delegations for a vault', async () => {
      await manager.grantDelegation({
        managerId: 'manager-1',
        vaultId: 'vault-1',
        permissions: ['allocate'],
        maxAllocationPercent: 50,
      });
      await manager.grantDelegation({
        managerId: 'manager-2',
        vaultId: 'vault-1',
        permissions: ['rebalance'],
        maxAllocationPercent: 30,
      });

      const delegations = await manager.listDelegations('vault-1');
      expect(delegations).toHaveLength(2);
    });

    it('should return false for expired delegation', async () => {
      const pastDate = new Date(Date.now() - 1000); // Already expired
      await manager.grantDelegation({
        managerId: 'manager-1',
        vaultId: 'vault-1',
        permissions: ['allocate'],
        maxAllocationPercent: 50,
        expiresAt: pastDate,
      });

      const canAllocate = await manager.checkDelegationPermission('manager-1', 'vault-1', 'allocate');
      expect(canAllocate).toBe(false);
    });
  });

  describe('strategy whitelisting', () => {
    it('should add and remove whitelisted strategies', async () => {
      const mv = await manager.createManagedVault({ vaultId: 'vault-1', institutionId: 'bank-1', tier: 'managed' });

      await manager.addWhitelistedStrategy(mv.id, 'strategy-x');
      expect(await manager.isStrategyWhitelisted(mv.id, 'strategy-x')).toBe(true);
      expect(await manager.isStrategyWhitelisted(mv.id, 'strategy-y')).toBe(false);

      await manager.removeWhitelistedStrategy(mv.id, 'strategy-x');
      // After removing all, whitelist is empty = all allowed
      expect(await manager.isStrategyWhitelisted(mv.id, 'strategy-y')).toBe(true);
    });
  });

  describe('audit trail', () => {
    it('should record and retrieve audit entries', async () => {
      await manager.recordAuditEntry({
        vaultId: 'vault-1',
        action: 'deposit',
        actorId: 'user-1',
        actorType: 'user',
        details: { amount: 1000 },
        timestamp: new Date(),
      });

      await manager.recordAuditEntry({
        vaultId: 'vault-1',
        action: 'allocate',
        actorId: 'agent-1',
        actorType: 'agent',
        details: { strategyId: 'strategy-1', percent: 40 },
        timestamp: new Date(),
      });

      const trail = await manager.getAuditTrail('vault-1');
      expect(trail).toHaveLength(2);
      expect(trail[0].action).toBe('deposit');
      expect(trail[1].action).toBe('allocate');
    });

    it('should respect audit trail limit', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.recordAuditEntry({
          vaultId: 'vault-1',
          action: `action-${i}`,
          actorId: 'system',
          actorType: 'system',
          details: {},
          timestamp: new Date(),
        });
      }

      const trail = await manager.getAuditTrail('vault-1', 3);
      expect(trail).toHaveLength(3);
    });
  });

  describe('events', () => {
    it('should emit managed_vault_created event', async () => {
      const events: InvestmentEvent[] = [];
      manager.onEvent(e => events.push(e));

      await manager.createManagedVault({ vaultId: 'vault-1', institutionId: 'bank-1', tier: 'managed' });

      expect(events.some(e => e.type === 'managed_vault_created')).toBe(true);
    });

    it('should emit audit_entry_created event', async () => {
      const events: InvestmentEvent[] = [];
      manager.onEvent(e => events.push(e));

      await manager.recordAuditEntry({
        vaultId: 'vault-1',
        action: 'test',
        actorId: 'system',
        actorType: 'system',
        details: {},
        timestamp: new Date(),
      });

      expect(events.some(e => e.type === 'audit_entry_created')).toBe(true);
    });
  });
});

// ============================================================================
// PerformanceAnalyticsEngine Tests
// ============================================================================

describe('PerformanceAnalyticsEngine', () => {
  let analytics: DefaultPerformanceAnalyticsEngine;
  let testVault: Vault;

  beforeEach(() => {
    analytics = createPerformanceAnalyticsEngine({ riskFreeRate: 0.05 });
    testVault = {
      id: 'vault-1',
      ownerId: 'user-1',
      name: 'Test Vault',
      type: 'user',
      status: 'active',
      balance: 10000,
      allocatedBalance: 8000,
      availableBalance: 2000,
      boundStrategyIds: [],
      riskParameters: {
        maxDrawdown: 20,
        maxExposurePerStrategy: 40,
        dailyRiskThreshold: 100,
        circuitBreakerEnabled: true,
        emergencyStopEnabled: true,
      },
      allocationLimits: {
        minAllocationPercent: 5,
        maxAllocationPercent: 60,
        maxStrategies: 10,
        minBalance: 10,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };
  });

  describe('snapshots', () => {
    it('should take a vault snapshot', async () => {
      const snapshot = await analytics.takeSnapshot(testVault, 500, 200);

      expect(snapshot.vaultId).toBe('vault-1');
      expect(snapshot.totalValue).toBe(10000);
      expect(snapshot.allocatedValue).toBe(8000);
      expect(snapshot.availableValue).toBe(2000);
      expect(snapshot.unrealizedPnl).toBe(500);
      expect(snapshot.realizedPnl).toBe(200);
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate daily PnL between snapshots', async () => {
      const snap1 = await analytics.takeSnapshot(testVault);
      expect(snap1.dailyPnl).toBe(0); // First snapshot

      const updatedVault = { ...testVault, balance: 10500 };
      const snap2 = await analytics.takeSnapshot(updatedVault);
      expect(snap2.dailyPnl).toBe(500); // 10500 - 10000
    });

    it('should list snapshots with limit', async () => {
      for (let i = 0; i < 5; i++) {
        await analytics.takeSnapshot({ ...testVault, balance: 10000 + i * 100 });
      }

      const all = await analytics.listSnapshots('vault-1');
      expect(all).toHaveLength(5);

      const limited = await analytics.listSnapshots('vault-1', 3);
      expect(limited).toHaveLength(3);
    });

    it('should return null for vault with no snapshots', async () => {
      const snap = await analytics.getLatestSnapshot('no-snapshots');
      expect(snap).toBeNull();
    });
  });

  describe('historical returns', () => {
    it('should record and retrieve historical returns', async () => {
      const today = new Date();
      const record = await analytics.recordReturn('vault-1', today, 10000, 10200);

      expect(record.vaultId).toBe('vault-1');
      expect(record.dailyReturn).toBeCloseTo(2); // 2% return
      expect(record.cumulativeReturn).toBeCloseTo(2);
    });

    it('should compound cumulative returns correctly', async () => {
      const day1 = new Date('2025-01-01');
      const day2 = new Date('2025-01-02');
      const day3 = new Date('2025-01-03');

      await analytics.recordReturn('vault-1', day1, 10000, 10100); // +1%
      await analytics.recordReturn('vault-1', day2, 10100, 10201); // +1%
      await analytics.recordReturn('vault-1', day3, 10201, 10201 * 1.01); // +1%

      const returns = await analytics.getHistoricalReturns('vault-1');
      expect(returns).toHaveLength(3);
      // After 3 days of 1% returns, cumulative should be ~3.03%
      expect(returns[2].cumulativeReturn).toBeGreaterThan(2.9);
    });

    it('should filter historical returns by days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      const recentDate = new Date();

      await analytics.recordReturn('vault-1', oldDate, 10000, 10100);
      await analytics.recordReturn('vault-1', recentDate, 10100, 10200);

      const recent = await analytics.getHistoricalReturns('vault-1', undefined, 30);
      expect(recent).toHaveLength(1); // Only the recent one
    });

    it('should record strategy-specific returns', async () => {
      const today = new Date();
      await analytics.recordReturn('vault-1', today, 5000, 5100, 'strategy-1');

      const strategyReturns = await analytics.getHistoricalReturns('vault-1', 'strategy-1');
      expect(strategyReturns).toHaveLength(1);
      expect(strategyReturns[0].strategyId).toBe('strategy-1');
    });
  });

  describe('performance metrics', () => {
    it('should compute metrics with return data', async () => {
      // Record a series of returns
      const baseValue = 10000;
      const dailyReturns = [0.5, 1.2, -0.3, 0.8, -0.5, 1.0, 0.7, -0.2, 0.9, 0.3];
      let currentValue = baseValue;

      for (let i = 0; i < dailyReturns.length; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (dailyReturns.length - i));
        const newValue = currentValue * (1 + dailyReturns[i] / 100);
        await analytics.recordReturn('vault-1', date, currentValue, newValue);
        currentValue = newValue;
      }

      const metrics = await analytics.computeMetrics('vault-1', 'monthly');

      expect(metrics.vaultId).toBe('vault-1');
      expect(metrics.period).toBe('monthly');
      expect(metrics.totalReturn).toBeDefined();
      expect(metrics.apy).toBeDefined();
      expect(metrics.sharpeRatio).toBeDefined();
      expect(metrics.sortinoRatio).toBeDefined();
      expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(metrics.winRate).toBeGreaterThan(0);
      expect(metrics.calculatedAt).toBeInstanceOf(Date);
    });

    it('should return zero metrics with no return data', async () => {
      const metrics = await analytics.computeMetrics('empty-vault', 'daily');
      expect(metrics.totalReturn).toBe(0);
      expect(metrics.apy).toBe(0);
    });
  });

  describe('dashboard', () => {
    it('should generate dashboard data', async () => {
      const dashboard = await analytics.getDashboardData(testVault);

      expect(dashboard.vault.id).toBe('vault-1');
      expect(dashboard.metrics).toBeDefined();
      expect(dashboard.snapshots).toBeInstanceOf(Array);
      expect(dashboard.historicalReturns).toBeInstanceOf(Array);
      expect(dashboard.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('events', () => {
    it('should emit performance_snapshot_taken event', async () => {
      const events: InvestmentEvent[] = [];
      analytics.onEvent(e => events.push(e));

      await analytics.takeSnapshot(testVault);

      expect(events.some(e => e.type === 'performance_snapshot_taken')).toBe(true);
    });
  });
});

// ============================================================================
// Investment Layer Integration Tests
// ============================================================================

describe('InvestmentLayer - Integration', () => {
  let layer: DefaultInvestmentLayer;

  beforeEach(() => {
    layer = createInvestmentLayer();
  });

  it('should initialize all components', () => {
    expect(layer.vault).toBeInstanceOf(DefaultVaultManager);
    expect(layer.risk).toBeInstanceOf(DefaultRiskEngine);
    expect(layer.allocation).toBeInstanceOf(DefaultAllocationEngine);
    expect(layer.optimizer).toBeInstanceOf(DefaultPortfolioOptimizer);
    expect(layer.institutional).toBeInstanceOf(DefaultInstitutionalModeManager);
    expect(layer.analytics).toBeInstanceOf(DefaultPerformanceAnalyticsEngine);
  });

  it('should report healthy status', () => {
    const health = layer.getHealth();

    expect(health.overall).toBe('healthy');
    expect(health.vaultManager).toBe('healthy');
    expect(health.riskEngine).toBe('healthy');
    expect(health.allocationEngine).toBe('healthy');
    expect(health.portfolioOptimizer).toBe('healthy');
    expect(health.institutionalMode).toBe('healthy');
    expect(health.performanceAnalytics).toBe('healthy');
    expect(health.totalVaults).toBe(0);
    expect(health.activeAllocations).toBe(0);
    expect(health.managedVaults).toBe(0);
  });

  it('should forward events from all sub-systems', async () => {
    const events: InvestmentEvent[] = [];
    layer.onEvent(e => events.push(e));

    // Vault event
    const vault = await layer.createVault({ ownerId: 'user-1', name: 'Test', type: 'user' });
    // Deposit event
    await layer.deposit(vault.id, 1000);
    // Allocation event
    await layer.createAllocationPlan({
      vaultId: vault.id,
      strategy: 'weighted',
      allocations: [
        { strategyId: 'strategy-1', agentId: 'agent-1', targetPercent: 60, weight: 0.6 },
        { strategyId: 'strategy-2', agentId: 'agent-2', targetPercent: 40, weight: 0.4 },
      ],
    });
    // Risk profile + event
    await layer.setupRiskProfile('agent-1', vault.id);
    // Managed vault event
    await layer.createManagedVault({ vaultId: vault.id, institutionId: 'inst-1', tier: 'managed' });

    const eventTypes = new Set(events.map(e => e.type));
    expect(eventTypes.has('vault_created')).toBe(true);
    expect(eventTypes.has('vault_deposit')).toBe(true);
    expect(eventTypes.has('allocation_created')).toBe(true);
    expect(eventTypes.has('managed_vault_created')).toBe(true);
  });

  it('should execute end-to-end investment flow', async () => {
    // Step 1: Create vault
    const vault = await layer.createVault({
      ownerId: 'user-1',
      name: 'Investment Portfolio',
      type: 'user',
      riskParameters: { maxDrawdown: 15 },
    });
    expect(vault.status).toBe('active');

    // Step 2: Deposit capital
    const deposit = await layer.deposit(vault.id, 10000);
    expect(deposit.newBalance).toBe(10000);

    // Step 3: Setup risk profiles for agents
    const riskProfile = await layer.setupRiskProfile('trading-agent', vault.id);
    expect(riskProfile.agentId).toBe('trading-agent');

    // Step 4: Create allocation plan (40/30/30 split)
    const plan = await layer.createAllocationPlan({
      vaultId: vault.id,
      strategy: 'weighted',
      allocations: [
        { strategyId: 'trading', agentId: 'trading-agent', targetPercent: 40, weight: 0.4 },
        { strategyId: 'yield', agentId: 'yield-agent', targetPercent: 30, weight: 0.3 },
        { strategyId: 'arbitrage', agentId: 'arb-agent', targetPercent: 30, weight: 0.3 },
      ],
    });
    expect(plan.allocations).toHaveLength(3);

    // Step 5: Check risk before action
    const riskCheck = await layer.risk.checkRisk('trading-agent', {
      type: 'allocate',
      proposedExposurePercent: 35,
      proposedPositionSizePercent: 10,
    });
    expect(riskCheck.passed).toBe(true);

    // Step 6: Rebalance
    const rebalanceResult = await layer.rebalance(plan.id);
    expect(rebalanceResult.planId).toBe(plan.id);

    // Step 7: Take performance snapshot
    const updatedVault = await layer.vault.getVault(vault.id);
    const snapshot = await layer.analytics.takeSnapshot(updatedVault!);
    expect(snapshot.totalValue).toBe(10000);

    // Step 8: Get performance metrics
    const metrics = await layer.getPerformanceMetrics(vault.id, 'monthly');
    expect(metrics.vaultId).toBe(vault.id);

    // Step 9: Get dashboard
    const dashboard = await layer.getDashboard(vault.id);
    expect(dashboard.vault.id).toBe(vault.id);
    expect(dashboard.metrics).toBeDefined();
  });

  it('should handle institutional vault creation with compliance', async () => {
    const vault = await layer.createVault({
      ownerId: 'institution-1',
      name: 'Institutional Fund',
      type: 'institutional',
    });

    const mv = await layer.createManagedVault({
      vaultId: vault.id,
      institutionId: 'hedge-fund-1',
      tier: 'compliance_required',
      whitelistedStrategies: ['approved-quant-strategy'],
      complianceConstraints: [
        {
          type: 'exposure_limit',
          description: 'Conservative exposure cap',
          parameters: { maxPercent: 25 },
          enforced: true,
        },
        {
          type: 'strategy_whitelist',
          description: 'Approved strategies only',
          parameters: {},
          enforced: true,
        },
      ],
    });

    expect(mv.tier).toBe('compliance_required');
    expect(mv.whitelistedStrategies).toContain('approved-quant-strategy');

    // Update compliance status to approved
    const approved = await layer.institutional.updateComplianceStatus(mv.id, 'approved');
    expect(approved.complianceStatus).toBe('approved');

    // Grant delegation to a manager
    const delegation = await layer.institutional.grantDelegation({
      managerId: 'portfolio-manager-1',
      vaultId: vault.id,
      permissions: ['allocate', 'rebalance'],
      maxAllocationPercent: 40,
    });
    expect(delegation.permissions).toContain('allocate');

    // Check compliance — using approved strategy
    const complianceResult = await layer.institutional.checkComplianceConstraints(mv.id, {
      type: 'strategy_use',
      strategyId: 'approved-quant-strategy',
    });
    expect(complianceResult.passed).toBe(true);

    // Check compliance — using unapproved strategy
    const blocked = await layer.institutional.checkComplianceConstraints(mv.id, {
      type: 'strategy_use',
      strategyId: 'unapproved-strategy',
    });
    expect(blocked.passed).toBe(false);
  });
});
