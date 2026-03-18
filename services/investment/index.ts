/**
 * Autonomous AI Investment Layer (Issue #102)
 *
 * A programmable, AI-native financial layer within TON that allows agents to manage
 * capital programmatically and responsibly. Built on top of the lifecycle orchestrator
 * (#92), multi-tenant infrastructure (#99), and the Agent Marketplace Economy (#101).
 *
 * Architecture:
 *   User / Institution
 *         ↓
 *   Investment Vault
 *         ↓
 *   Capital Allocation Engine
 *         ↓
 *   AI Strategy Agents
 *         ↓
 *   TON Smart Contracts
 *
 * Components:
 * - Capital Vault Architecture (user, strategy, institutional, DAO treasury vaults)
 * - Risk Management Engine (drawdown limits, circuit breakers, emergency stops)
 * - Capital Allocation Framework (weighted, AI-dynamic, performance-based)
 * - AI Portfolio Optimization (Sharpe/Sortino optimization, confidence scaling)
 * - Permissioned & Institutional Mode (managed vaults, delegation, compliance)
 * - Performance Transparency Layer (APY, Sharpe, drawdown, dashboard-ready)
 */

export * from './types';

export {
  DefaultVaultManager,
  createVaultManager,
  type VaultManager,
  type VaultManagerConfig,
} from './vault';

export {
  DefaultRiskEngine,
  createRiskEngine,
  type RiskEngine,
  type RiskEngineConfig,
  type AgentRiskProfileParams,
  type RiskAction,
} from './risk-engine';

export {
  DefaultAllocationEngine,
  createAllocationEngine,
  type AllocationEngine,
  type AllocationEngineConfig,
} from './allocation';

export {
  DefaultPortfolioOptimizer,
  createPortfolioOptimizer,
  type PortfolioOptimizer,
  type PortfolioOptimizerConfig,
  type StrategyMetricsInput,
  type VolatilityInput,
} from './portfolio-optimizer';

export {
  DefaultInstitutionalModeManager,
  createInstitutionalModeManager,
  type InstitutionalModeManager,
  type InstitutionalModeConfig,
  type ComplianceCheckInput,
  type ComplianceCheckResult,
  type ComplianceViolation,
} from './institutional-mode';

export {
  DefaultPerformanceAnalyticsEngine,
  createPerformanceAnalyticsEngine,
  type PerformanceAnalyticsEngine,
  type PerformanceAnalyticsConfig,
} from './performance-analytics';

// ============================================================================
// Unified Investment Layer Service
// ============================================================================

import { DefaultVaultManager, createVaultManager } from './vault';
import { DefaultRiskEngine, createRiskEngine } from './risk-engine';
import { DefaultAllocationEngine, createAllocationEngine } from './allocation';
import { DefaultPortfolioOptimizer, createPortfolioOptimizer } from './portfolio-optimizer';
import { DefaultInstitutionalModeManager, createInstitutionalModeManager } from './institutional-mode';
import { DefaultPerformanceAnalyticsEngine, createPerformanceAnalyticsEngine } from './performance-analytics';
import type {
  InvestmentLayerConfig,
  InvestmentLayerHealth,
  InvestmentEvent,
  InvestmentEventCallback,
  Vault,
  CreateVaultInput,
  DepositResult,
  AllocationPlan,
  CreateAllocationPlanInput,
  RebalanceResult,
  AgentRiskProfile,
  ManagedVault,
  CreateManagedVaultInput,
  PerformanceDashboardData,
  VaultPerformanceMetrics,
} from './types';

export interface InvestmentLayerService {
  // Sub-systems
  readonly vault: DefaultVaultManager;
  readonly risk: DefaultRiskEngine;
  readonly allocation: DefaultAllocationEngine;
  readonly optimizer: DefaultPortfolioOptimizer;
  readonly institutional: DefaultInstitutionalModeManager;
  readonly analytics: DefaultPerformanceAnalyticsEngine;

  // Convenience methods
  createVault(input: CreateVaultInput): Promise<Vault>;
  deposit(vaultId: string, amount: number): Promise<DepositResult>;
  createAllocationPlan(input: CreateAllocationPlanInput): Promise<AllocationPlan>;
  rebalance(planId: string): Promise<RebalanceResult>;
  setupRiskProfile(agentId: string, vaultId: string): Promise<AgentRiskProfile>;
  createManagedVault(input: CreateManagedVaultInput): Promise<ManagedVault>;
  getDashboard(vaultId: string): Promise<PerformanceDashboardData>;
  getPerformanceMetrics(vaultId: string, period: VaultPerformanceMetrics['period']): Promise<VaultPerformanceMetrics>;

  // Health & events
  getHealth(): InvestmentLayerHealth;
  onEvent(callback: InvestmentEventCallback): () => void;
}

const DEFAULT_INVESTMENT_CONFIG: InvestmentLayerConfig = {
  defaultRiskParameters: {
    maxDrawdown: 20,
    maxExposurePerStrategy: 40,
    dailyRiskThreshold: 100,
    circuitBreakerEnabled: true,
    emergencyStopEnabled: true,
  },
  defaultAllocationLimits: {
    minAllocationPercent: 5,
    maxAllocationPercent: 60,
    maxStrategies: 10,
    minBalance: 10,
  },
  optimizationConfig: {
    objective: 'sharpe_ratio',
    rebalanceFrequency: 'weekly',
    minConfidenceThreshold: 0.6,
    useMachineLearning: false,
    lookbackPeriodDays: 30,
  },
  maxVaultsPerOwner: 10,
  minDepositAmount: 1,
  minWithdrawalAmount: 0.1,
  performanceSnapshotIntervalMs: 3600000, // 1 hour
  rebalanceCheckIntervalMs: 900000, // 15 minutes
  auditRetentionDays: 2555,
};

export const DEFAULT_INVESTMENT_LAYER_CONFIG = DEFAULT_INVESTMENT_CONFIG;

export class DefaultInvestmentLayer implements InvestmentLayerService {
  readonly vault: DefaultVaultManager;
  readonly risk: DefaultRiskEngine;
  readonly allocation: DefaultAllocationEngine;
  readonly optimizer: DefaultPortfolioOptimizer;
  readonly institutional: DefaultInstitutionalModeManager;
  readonly analytics: DefaultPerformanceAnalyticsEngine;

  private readonly eventCallbacks: InvestmentEventCallback[] = [];

  constructor(config: Partial<InvestmentLayerConfig> = {}) {
    const merged: InvestmentLayerConfig = { ...DEFAULT_INVESTMENT_CONFIG, ...config };

    this.vault = createVaultManager({
      maxVaultsPerOwner: merged.maxVaultsPerOwner,
      minDepositAmount: merged.minDepositAmount,
      minWithdrawalAmount: merged.minWithdrawalAmount,
      defaultRiskParameters: {
        maxDrawdown: 20,
        maxExposurePerStrategy: 40,
        dailyRiskThreshold: 100,
        circuitBreakerEnabled: true,
        emergencyStopEnabled: true,
        ...merged.defaultRiskParameters,
      },
      defaultAllocationLimits: {
        minAllocationPercent: 5,
        maxAllocationPercent: 60,
        maxStrategies: 10,
        minBalance: 10,
        ...merged.defaultAllocationLimits,
      },
    });

    this.risk = createRiskEngine();
    this.allocation = createAllocationEngine();
    this.optimizer = createPortfolioOptimizer();
    this.institutional = createInstitutionalModeManager({
      auditRetentionDays: merged.auditRetentionDays,
    });
    this.analytics = createPerformanceAnalyticsEngine();

    // Forward events from all sub-systems
    const forwardEvent = (event: InvestmentEvent): void => {
      for (const cb of this.eventCallbacks) {
        try { cb(event); } catch { /* Swallow */ }
      }
    };

    this.vault.onEvent(forwardEvent);
    this.risk.onEvent(forwardEvent);
    this.allocation.onEvent(forwardEvent);
    this.optimizer.onEvent(forwardEvent);
    this.institutional.onEvent(forwardEvent);
    this.analytics.onEvent(forwardEvent);
  }

  async createVault(input: CreateVaultInput): Promise<Vault> {
    return this.vault.createVault(input);
  }

  async deposit(vaultId: string, amount: number): Promise<DepositResult> {
    return this.vault.deposit(vaultId, amount);
  }

  async createAllocationPlan(input: CreateAllocationPlanInput): Promise<AllocationPlan> {
    return this.allocation.createAllocationPlan(input);
  }

  async rebalance(planId: string): Promise<RebalanceResult> {
    return this.allocation.rebalance(planId, 'manual');
  }

  async setupRiskProfile(agentId: string, vaultId: string): Promise<AgentRiskProfile> {
    return this.risk.createRiskProfile(agentId, vaultId);
  }

  async createManagedVault(input: CreateManagedVaultInput): Promise<ManagedVault> {
    return this.institutional.createManagedVault(input);
  }

  async getDashboard(vaultId: string): Promise<PerformanceDashboardData> {
    const vault = await this.vault.getVault(vaultId);
    if (!vault) throw new Error(`Vault ${vaultId} not found`);
    return this.analytics.getDashboardData(vault);
  }

  async getPerformanceMetrics(
    vaultId: string,
    period: VaultPerformanceMetrics['period']
  ): Promise<VaultPerformanceMetrics> {
    return this.analytics.computeMetrics(vaultId, period);
  }

  getHealth(): InvestmentLayerHealth {
    const vaultStats = this.vault.getStats();
    const riskStats = this.risk.getStats();
    const allocationStats = this.allocation.getStats();
    const institutionalStats = this.institutional.getStats();

    return {
      overall: 'healthy',
      vaultManager: 'healthy',
      riskEngine: 'healthy',
      allocationEngine: 'healthy',
      portfolioOptimizer: 'healthy',
      institutionalMode: 'healthy',
      performanceAnalytics: 'healthy',
      totalVaults: vaultStats.totalVaults,
      totalAllocatedTon: vaultStats.totalAllocatedTon,
      activeAllocations: allocationStats.activeAllocations,
      managedVaults: institutionalStats.managedVaults,
    };
  }

  onEvent(callback: InvestmentEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }
}

export function createInvestmentLayer(config?: Partial<InvestmentLayerConfig>): DefaultInvestmentLayer {
  return new DefaultInvestmentLayer(config);
}
