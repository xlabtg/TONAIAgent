/**
 * TONAIAgent - Institutional Liquidity Network (Issue #119)
 *
 * Deep liquidity infrastructure layer for institutional capital routing on TON.
 * Enables aggregated liquidity pools, cross-fund capital routing, institutional-grade
 * execution, deep liquidity sourcing, and smart order routing.
 *
 * Architecture:
 * Agents/Funds → Prime Brokerage → Liquidity Network → DEX / OTC / Cross-chain
 *
 * Core Components:
 * 1. Liquidity Aggregation Layer — DEXs, OTC desks, agent liquidity, cross-chain bridges
 * 2. Smart Order Routing Engine — slippage optimization, gas-aware routing, latency optimization
 * 3. Internal Liquidity Pooling — agent-to-agent liquidity, treasury-to-fund routing, capital reuse
 * 4. Deep Liquidity Vaults — stablecoin, RWA, and hedging pools
 * 5. Risk-Controlled Execution — prime brokerage limits, real-time exposure checks
 *
 * @example
 * ```typescript
 * import { createLiquidityNetworkManager } from '@tonaiagent/core/liquidity-network';
 *
 * // Initialize the liquidity network
 * const ln = createLiquidityNetworkManager();
 *
 * // Add liquidity sources
 * const dex = ln.aggregation.addSource({ name: 'TON DEX', kind: 'dex', supportedPairs: ['TON/USDT'] });
 * ln.aggregation.activateSource(dex.id);
 *
 * // Create an aggregation pool
 * const pool = ln.aggregation.createPool({ name: 'Main Pool', sourceIds: [dex.id] });
 *
 * // Execute an order with smart routing
 * const order = { pair: 'TON/USDT', side: 'buy' as const, amount: '10000', orderType: 'market' as const };
 * const execution = ln.routing.executeOrder(order, [dex]);
 * console.log('Order filled:', execution.status, 'Average price:', execution.averagePrice);
 *
 * // Create a liquidity vault
 * const vault = ln.vaults.createVault({ name: 'USDT Stable Vault', kind: 'stablecoin', assetId: 'USDT' });
 * ln.vaults.deposit({ vaultId: vault.id, depositorId: 'fund_alpha', amount: '1000000' });
 *
 * // Set up internal liquidity pool
 * const internalPool = ln.internalPools.createPool({ name: 'Agent Liquidity Pool', assetId: 'TON' });
 * ln.internalPools.joinPool({ poolId: internalPool.id, participantId: 'agent_1', kind: 'agent', name: 'Agent 1', contributionAmount: '50000' });
 *
 * // Risk profile for execution
 * const riskProfile = ln.riskExecution.createProfile({ name: 'Fund Alpha Risk', ownerId: 'fund_alpha' });
 * const check = ln.riskExecution.checkPreTrade({ profileId: riskProfile.id, pair: 'TON/USDT', orderAmount: '10000', estimatedSlippage: 0.002, estimatedPrice: '5.0' });
 * console.log('Pre-trade check passed:', check.passed);
 *
 * // Network status
 * const status = ln.getNetworkStatus();
 * console.log('Liquidity Network Status:', status);
 * ```
 */

// Export all types
export * from './types';

// Export Liquidity Aggregation Layer
export {
  DefaultLiquidityAggregationManager,
  createLiquidityAggregationManager,
  type LiquidityAggregationManager,
  type CreateLiquiditySourceParams,
  type UpdateLiquiditySourceParams,
  type LiquiditySourceFilters,
  type CreateAggregationPoolParams,
} from './aggregation';

// Export Smart Order Routing Engine
export {
  DefaultSmartOrderRoutingEngine,
  createSmartOrderRoutingEngine,
  type SmartOrderRoutingEngine,
  type SmartRoutingConfig,
  type RouteSimulationResult,
  type RouteValidationResult,
} from './smart-routing';

// Export Internal Liquidity Pool Manager
export {
  DefaultInternalLiquidityPoolManager,
  createInternalLiquidityPoolManager,
  type InternalLiquidityPoolManager,
  type CreateInternalPoolParams,
  type JoinPoolParams,
  type BorrowFromPoolParams,
  type RepayLoanParams,
  type InternalPoolFilters,
} from './internal-pool';

// Export Deep Liquidity Vault Manager
export {
  DefaultDeepLiquidityVaultManager,
  createDeepLiquidityVaultManager,
  type DeepLiquidityVaultManager,
  type CreateVaultParams,
  type DepositToVaultParams,
  type WithdrawFromVaultParams,
  type VaultFilters,
  type VaultPortfolioSummary,
} from './vaults';

// Export Risk-Controlled Execution Manager
export {
  DefaultRiskControlledExecutionManager,
  createRiskControlledExecutionManager,
  type RiskControlledExecutionManager,
  type CreateRiskProfileParams,
  type UpdateRiskLimitsParams,
  type PreTradeRiskCheckParams,
  type PostTradeUpdateParams,
  type RiskSummary,
} from './risk-execution';

// ============================================================================
// Unified Liquidity Network Manager
// ============================================================================

import {
  DefaultLiquidityAggregationManager,
  createLiquidityAggregationManager,
} from './aggregation';
import {
  DefaultSmartOrderRoutingEngine,
  createSmartOrderRoutingEngine,
} from './smart-routing';
import {
  DefaultInternalLiquidityPoolManager,
  createInternalLiquidityPoolManager,
} from './internal-pool';
import {
  DefaultDeepLiquidityVaultManager,
  createDeepLiquidityVaultManager,
} from './vaults';
import {
  DefaultRiskControlledExecutionManager,
  createRiskControlledExecutionManager,
} from './risk-execution';
import {
  LiquidityNetworkConfig,
  LiquidityNetworkEvent,
  LiquidityNetworkEventCallback,
} from './types';

export interface LiquidityNetworkSystemStatus {
  liquiditySources: number;
  activeLiquiditySources: number;
  aggregationPools: number;
  internalPools: number;
  activeLoans: number;
  vaults: number;
  totalValueLocked: string;
  riskProfiles: number;
  activeRiskProfiles: number;
  generatedAt: Date;
}

export interface LiquidityNetworkManager {
  readonly aggregation: DefaultLiquidityAggregationManager;
  readonly routing: DefaultSmartOrderRoutingEngine;
  readonly internalPools: DefaultInternalLiquidityPoolManager;
  readonly vaults: DefaultDeepLiquidityVaultManager;
  readonly riskExecution: DefaultRiskControlledExecutionManager;

  onEvent(callback: LiquidityNetworkEventCallback): void;
  getNetworkStatus(): LiquidityNetworkSystemStatus;
}

export class DefaultLiquidityNetworkManager implements LiquidityNetworkManager {
  readonly aggregation: DefaultLiquidityAggregationManager;
  readonly routing: DefaultSmartOrderRoutingEngine;
  readonly internalPools: DefaultInternalLiquidityPoolManager;
  readonly vaults: DefaultDeepLiquidityVaultManager;
  readonly riskExecution: DefaultRiskControlledExecutionManager;

  private readonly eventCallbacks: LiquidityNetworkEventCallback[] = [];

  constructor(config?: Partial<LiquidityNetworkConfig>) {
    this.aggregation = createLiquidityAggregationManager();
    this.routing = createSmartOrderRoutingEngine(config?.routing);
    this.internalPools = createInternalLiquidityPoolManager();
    this.vaults = createDeepLiquidityVaultManager();
    this.riskExecution = createRiskControlledExecutionManager();

    this.setupEventForwarding();
  }

  onEvent(callback: LiquidityNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getNetworkStatus(): LiquidityNetworkSystemStatus {
    const allSources = this.aggregation.listSources();
    const activeSources = this.aggregation.listSources({ statuses: ['active'] });
    const pools = this.aggregation.listPools();
    const internalPools = this.internalPools.listPools();
    const activeLoans = this.internalPools.listLoans({ status: 'active' });
    const vaults = this.vaults.listVaults();
    const totalValueLocked = this.vaults.getTotalValueLocked();
    const riskProfiles = this.riskExecution.listProfiles();
    const activeRiskProfiles = riskProfiles.filter(p => p.status === 'active');

    return {
      liquiditySources: allSources.length,
      activeLiquiditySources: activeSources.length,
      aggregationPools: pools.length,
      internalPools: internalPools.length,
      activeLoans: activeLoans.length,
      vaults: vaults.length,
      totalValueLocked,
      riskProfiles: riskProfiles.length,
      activeRiskProfiles: activeRiskProfiles.length,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: LiquidityNetworkEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.aggregation.onEvent(forwardEvent);
    this.routing.onEvent(forwardEvent);
    this.internalPools.onEvent(forwardEvent);
    this.vaults.onEvent(forwardEvent);
    this.riskExecution.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLiquidityNetworkManager(
  config?: Partial<LiquidityNetworkConfig>
): DefaultLiquidityNetworkManager {
  return new DefaultLiquidityNetworkManager(config);
}

// Default export
export default DefaultLiquidityNetworkManager;
