/**
 * TONAIAgent - Token Utility & Agent Economy (Issue #104)
 *
 * A comprehensive token utility model and economic layer powering the
 * entire TONAIAgent ecosystem. Enables a decentralized AI economy where
 * autonomous agents earn, pay, stake, and govern using the native token.
 *
 * Architecture:
 *   Token Layer -> Agent Economy -> Marketplace + Treasury + Governance -> Autonomous AI Network
 *
 * Core Components:
 * 1. Token Utility Framework     — Fee schedules, tier discounts, premium features
 * 2. Agent Staking & Reputation  — Developer staking for agent publication, trust scoring
 * 3. Autonomous Agent Economy    — Agents pay/earn/reinvest autonomously
 * 4. Revenue Sharing Model       — Creator fees, protocol revenue, DAO treasury
 * 5. Buyback, Burn & Treasury    — Deflationary loop with protocol revenue recycling
 * 6. Liquidity & DeFi Integration — Staking pools, yield farming, TON DeFi
 * 7. Developer Incentive Layer   — Grants, growth mining, agent creation rewards
 * 8. Economic Simulation         — Stress tests, velocity modeling, scenarios
 * 9. Cross-Agent Payments        — Agent-to-agent payments, autonomous workflows
 *
 * @example
 * ```typescript
 * import { createTokenUtilityEconomy } from '@tonaiagent/core/token-utility-economy';
 *
 * const economy = createTokenUtilityEconomy({
 *   tokenSymbol: 'TONAI',
 *   tokenDecimals: 9,
 *   totalSupply: '10000000000000000000', // 10 billion
 * });
 *
 * // Calculate fee with tier discount
 * const fee = economy.tokenUtilityFramework.calculateFee('agent_creation', '10000000000000');
 *
 * // Publish agent with stake
 * const stake = economy.agentStaking.publishWithStake({
 *   agentId: 'agent-1',
 *   developerId: 'dev-1',
 *   agentType: 'trading',
 *   stakeAmount: '10000000000000',
 * });
 *
 * // Distribute strategy revenue
 * const distribution = economy.revenueSharing.distributeRevenue(
 *   'strategy-1', '1000000000000', 'dev-1', '2026-03'
 * );
 *
 * // Run economic simulation
 * const simulation = economy.economicSimulation.runSimulation({
 *   simulationId: 'sim-1',
 *   name: 'Base Case Scenario',
 *   durationDays: 365,
 *   initialTokenPrice: 0.50,
 *   initialCirculatingSupply: '1000000000000000000',
 *   initialStakingRate: 0.35,
 *   initialActiveAgents: 1000,
 *   scenarioType: 'base_case',
 *   parameters: { agentGrowthRate: 0.05, userGrowthRate: 0.08, ... },
 * });
 * ```
 */

// Export all types
export * from './types';

// Export token utility framework
export {
  DefaultTokenUtilityFramework,
  createTokenUtilityFramework,
  type TokenUtilityFramework,
  type TokenUtilityFrameworkConfig,
} from './token-utility-framework';

// Export agent staking module
export {
  DefaultAgentStakingModule,
  createAgentStakingModule,
  type AgentStakingModule,
  type AgentStakingConfig,
  type SlashAgentRequest,
} from './agent-staking';

// Export agent economy module
export {
  DefaultAgentEconomyModule,
  createAgentEconomyModule,
  type AgentEconomyModule,
  type AgentEconomyConfig,
  type RegisterAgentRequest,
  type RecordComputeUsageRequest,
  type AgentEarningRequest,
} from './agent-economy';

// Export revenue sharing module
export {
  DefaultRevenueSharingModule,
  createRevenueSharingModule,
  type RevenueSharingModule,
} from './revenue-sharing';

// Export buyback burn module
export {
  DefaultBuybackBurnModule,
  createBuybackBurnModule,
  type BuybackBurnModule,
  type BuybackBurnModuleConfig,
  type TriggerBuybackRequest,
} from './buyback-burn';

// Export DeFi integration module
export {
  DefaultDeFiIntegrationModule,
  createDeFiIntegrationModule,
  type DeFiIntegrationModule,
  type DeFiIntegrationConfig,
  type AddLiquidityRequest,
  type RemoveLiquidityRequest,
} from './defi-integration';

// Export developer incentives module
export {
  DefaultDeveloperIncentivesModule,
  createDeveloperIncentivesModule,
  type DeveloperIncentivesModule,
  type DeveloperIncentivesConfig,
  type AwardIncentiveRequest,
} from './developer-incentives';

// Export economic simulation module
export {
  DefaultEconomicSimulationModule,
  createEconomicSimulationModule,
  type EconomicSimulationModule,
} from './economic-simulation';

// Export cross-agent payments module
export {
  DefaultCrossAgentPaymentsModule,
  createCrossAgentPaymentsModule,
  type CrossAgentPaymentsModule,
  type CrossAgentPaymentsConfig,
  type OpenChannelRequest,
} from './cross-agent-payments';

// ============================================================================
// Import components for the unified service
// ============================================================================

import { DefaultTokenUtilityFramework, createTokenUtilityFramework } from './token-utility-framework';
import { DefaultAgentStakingModule, createAgentStakingModule } from './agent-staking';
import { DefaultAgentEconomyModule, createAgentEconomyModule } from './agent-economy';
import { DefaultRevenueSharingModule, createRevenueSharingModule } from './revenue-sharing';
import { DefaultBuybackBurnModule, createBuybackBurnModule } from './buyback-burn';
import { DefaultDeFiIntegrationModule, createDeFiIntegrationModule } from './defi-integration';
import { DefaultDeveloperIncentivesModule, createDeveloperIncentivesModule } from './developer-incentives';
import { DefaultEconomicSimulationModule, createEconomicSimulationModule } from './economic-simulation';
import { DefaultCrossAgentPaymentsModule, createCrossAgentPaymentsModule } from './cross-agent-payments';

import type {
  TokenUtilityEconomyConfig,
  TokenUtilityEconomyHealth,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Unified Token Utility & Agent Economy Service
// ============================================================================

export interface TokenUtilityEconomyService {
  readonly tokenUtilityFramework: DefaultTokenUtilityFramework;
  readonly agentStaking: DefaultAgentStakingModule;
  readonly agentEconomy: DefaultAgentEconomyModule;
  readonly revenueSharing: DefaultRevenueSharingModule;
  readonly buybackBurn: DefaultBuybackBurnModule;
  readonly defiIntegration: DefaultDeFiIntegrationModule;
  readonly developerIncentives: DefaultDeveloperIncentivesModule;
  readonly economicSimulation: DefaultEconomicSimulationModule;
  readonly crossAgentPayments: DefaultCrossAgentPaymentsModule;

  getHealth(): TokenUtilityEconomyHealth;
  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultTokenUtilityEconomyService implements TokenUtilityEconomyService {
  readonly tokenUtilityFramework: DefaultTokenUtilityFramework;
  readonly agentStaking: DefaultAgentStakingModule;
  readonly agentEconomy: DefaultAgentEconomyModule;
  readonly revenueSharing: DefaultRevenueSharingModule;
  readonly buybackBurn: DefaultBuybackBurnModule;
  readonly defiIntegration: DefaultDeFiIntegrationModule;
  readonly developerIncentives: DefaultDeveloperIncentivesModule;
  readonly economicSimulation: DefaultEconomicSimulationModule;
  readonly crossAgentPayments: DefaultCrossAgentPaymentsModule;

  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];

  constructor(config: Partial<TokenUtilityEconomyConfig> = {}) {
    this.tokenUtilityFramework = createTokenUtilityFramework({
      tokenSymbol: config.tokenSymbol,
      feeSchedule: config.feeSchedule,
      tiers: config.tiers,
    });

    this.agentStaking = createAgentStakingModule();
    this.agentEconomy = createAgentEconomyModule();
    this.revenueSharing = createRevenueSharingModule(config.revenueSharing);
    this.buybackBurn = createBuybackBurnModule({
      ...config.buyback,
      initialTotalSupply: config.totalSupply,
    });
    this.defiIntegration = createDeFiIntegrationModule();
    this.developerIncentives = createDeveloperIncentivesModule();
    this.economicSimulation = createEconomicSimulationModule();
    this.crossAgentPayments = createCrossAgentPaymentsModule();

    // Wire up event forwarding
    const forwardEvent = (event: TokenUtilityEconomyEvent): void => {
      for (const cb of this.eventCallbacks) {
        try { cb(event); } catch { /* swallow */ }
      }
    };

    this.tokenUtilityFramework.onEvent(forwardEvent);
    this.agentStaking.onEvent(forwardEvent);
    this.agentEconomy.onEvent(forwardEvent);
    this.revenueSharing.onEvent(forwardEvent);
    this.buybackBurn.onEvent(forwardEvent);
    this.defiIntegration.onEvent(forwardEvent);
    this.developerIncentives.onEvent(forwardEvent);
    this.economicSimulation.onEvent(forwardEvent);
    this.crossAgentPayments.onEvent(forwardEvent);
  }

  getHealth(): TokenUtilityEconomyHealth {
    const tokenUtilityHealth = this.tokenUtilityFramework.getHealth();
    const agentStakingHealth = this.agentStaking.getHealth();
    const agentEconomyHealth = this.agentEconomy.getHealth();
    const defiHealth = this.defiIntegration.getHealth();
    const devHealth = this.developerIncentives.getHealth();

    const componentStatuses = [
      tokenUtilityHealth.overall,
      agentStakingHealth.overall,
      agentEconomyHealth.overall,
      defiHealth.overall,
      devHealth.overall,
    ];

    const criticalCount = componentStatuses.filter(s => s === 'critical').length;
    const degradedCount = componentStatuses.filter(s => s === 'degraded').length;

    const overall: TokenUtilityEconomyHealth['overall'] =
      criticalCount > 0 ? 'critical' : degradedCount > 1 ? 'degraded' : 'healthy';

    return {
      overall,
      tokenUtilityFramework: tokenUtilityHealth.overall,
      agentStaking: agentStakingHealth.overall,
      agentEconomy: agentEconomyHealth.overall,
      revenueSharing: 'healthy',
      buybackBurn: this.buybackBurn.config.enabled ? 'healthy' : 'degraded',
      defiIntegration: defiHealth.overall,
      developerIncentives: devHealth.overall,
      crossAgentPayments: 'healthy',
      totalValueLocked: defiHealth.totalLiquidityProvided,
      totalActiveAgents: agentEconomyHealth.totalActiveAgents,
      totalDevelopers: devHealth.activeDevelopers,
    };
  }

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTokenUtilityEconomy(
  config?: Partial<TokenUtilityEconomyConfig>
): DefaultTokenUtilityEconomyService {
  return new DefaultTokenUtilityEconomyService(config);
}

export default DefaultTokenUtilityEconomyService;
