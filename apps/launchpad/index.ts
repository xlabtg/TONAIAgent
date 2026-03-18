/**
 * TONAIAgent - Agent Launchpad
 *
 * Full-featured Agent Launchpad enabling DAOs, crypto funds, startups, and
 * communities to launch, manage, and scale autonomous treasury and investment
 * agents on The Open Network.
 *
 * Features:
 * - Treasury Agent Framework (treasury, investment, liquidity, risk agents)
 * - DAO Governance Integration (proposals, voting, delegation)
 * - Fund Infrastructure (AI-managed funds, portfolios)
 * - Autonomous Treasury Management (24/7 operations)
 * - Risk & Control Layer (limits, emergency stop, approvals)
 * - Capital Pooling (contributors, allocations, distributions)
 * - Monitoring & Analytics (dashboards, metrics, alerts)
 * - Monetization (management fees, performance fees, revenue sharing)
 *
 * @example
 * ```typescript
 * import { createLaunchpadService } from '@tonaiagent/core/launchpad';
 *
 * // Create the launchpad service
 * const launchpad = createLaunchpadService();
 *
 * // Create an organization
 * const org = await launchpad.organizations.createOrganization({
 *   name: 'Acme DAO',
 *   description: 'Community-governed treasury',
 *   type: 'dao',
 *   creatorUserId: 'user_123',
 * });
 *
 * // Deploy a treasury agent
 * const agent = await launchpad.agents.createAgent({
 *   organizationId: org.id,
 *   name: 'Yield Optimizer',
 *   description: 'Autonomous yield optimization agent',
 *   type: 'yield',
 *   config: { capitalAllocated: 10000 },
 *   strategy: { type: 'yield_optimization', yieldTargetApy: 15 },
 * });
 *
 * // Deploy the agent
 * await launchpad.agents.deployAgent(agent.id);
 *
 * // Create a capital pool
 * const pool = await launchpad.pools.createPool({
 *   organizationId: org.id,
 *   name: 'Main Treasury Pool',
 *   description: 'Primary capital pool for DAO operations',
 *   type: 'general',
 * });
 *
 * // Contribute to the pool
 * await launchpad.pools.contribute({
 *   poolId: pool.id,
 *   userId: 'user_456',
 *   amount: 1000,
 * });
 *
 * // Get dashboard
 * const dashboard = await launchpad.monitoring.getDashboard(org.id);
 * ```
 */

// Export all types
export * from './types';

// Export treasury agent framework
export {
  DefaultTreasuryAgentManager,
  createTreasuryAgentManager,
  type TreasuryAgentManager,
  type TreasuryAgentManagerConfig,
  type CreateAgentInput,
  type UpdateAgentInput,
  type DeploymentResult,
  type RebalanceResult,
  type RebalanceAction,
  type SimulationParams,
  type SimulationResult,
  type SimulatedAction,
  type RiskCheckResult,
  type RiskViolation,
  type RiskWarning,
  type RiskMetricsSnapshot,
  type PerformanceMetrics,
} from './treasury-agent';

// Export governance
export {
  DefaultGovernanceManager,
  createGovernanceManager,
  type GovernanceManager,
  type GovernanceManagerConfig,
  type CreateProposalInput,
  type ProposalFilters,
  type CastVoteInput,
  type DelegateVotingInput,
  type ExecutionResult,
  type ExecutedAction,
  type QuorumCheck,
  type ProposalResults,
  type VotingDelegation,
} from './governance';

// Export fund infrastructure
export {
  DefaultFundManager,
  createFundManager,
  type FundManager,
  type FundManagerConfig,
  type CreateFundInput,
  type UpdateFundInput,
  type LaunchResult,
  type AddInvestorInput,
  type InvestmentResult,
  type RedemptionInput,
  type RedemptionResult,
  type NavCalculation,
  type AssetBreakdown,
  type FeeAccrual,
  type FeeCollection,
  type Returns,
  type ComplianceCheck,
} from './fund';

// Export capital pooling
export {
  DefaultCapitalPoolManager,
  createCapitalPoolManager,
  type CapitalPoolManager,
  type CapitalPoolManagerConfig,
  type CreatePoolInput,
  type UpdatePoolInput,
  type ContributeInput,
  type ContributionResult,
  type WithdrawalRequestInput,
  type WithdrawalRequest,
  type WithdrawalResult,
  type AllocationInput,
  type LiquidationResult,
  type RebalanceResult as PoolRebalanceResult,
  type PoolReturns,
} from './capital-pool';

// Export organization management
export {
  DefaultOrganizationManager,
  createOrganizationManager,
  DEFAULT_ROLE_PERMISSIONS,
  type OrganizationManager,
  type OrganizationManagerConfig,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type AddMemberInput,
  type UpdateMemberInput,
  type OrganizationFilters,
} from './organization';

// Export monitoring
export {
  DefaultMonitoringManager,
  createMonitoringManager,
  type MonitoringManager,
  type MonitoringManagerConfig,
  type AlertFilters,
  type CreateAlertInput,
  type AgentDataPoint,
  type PoolDataPoint,
  type TransactionRecord,
  type HistoricalDataPoint,
} from './monitoring';

// ============================================================================
// Launchpad Service - Unified Entry Point
// ============================================================================

import { LaunchpadEvent, LaunchpadEventCallback } from './types';
import { DefaultTreasuryAgentManager, createTreasuryAgentManager, TreasuryAgentManagerConfig } from './treasury-agent';
import { DefaultGovernanceManager, createGovernanceManager, GovernanceManagerConfig } from './governance';
import { DefaultFundManager, createFundManager, FundManagerConfig } from './fund';
import { DefaultCapitalPoolManager, createCapitalPoolManager, CapitalPoolManagerConfig } from './capital-pool';
import { DefaultOrganizationManager, createOrganizationManager, OrganizationManagerConfig } from './organization';
import { DefaultMonitoringManager, createMonitoringManager, MonitoringManagerConfig } from './monitoring';

export interface LaunchpadServiceConfig {
  agents?: Partial<TreasuryAgentManagerConfig>;
  governance?: Partial<GovernanceManagerConfig>;
  funds?: Partial<FundManagerConfig>;
  pools?: Partial<CapitalPoolManagerConfig>;
  organizations?: Partial<OrganizationManagerConfig>;
  monitoring?: Partial<MonitoringManagerConfig>;
}

export interface LaunchpadService {
  readonly agents: DefaultTreasuryAgentManager;
  readonly governance: DefaultGovernanceManager;
  readonly funds: DefaultFundManager;
  readonly pools: DefaultCapitalPoolManager;
  readonly organizations: DefaultOrganizationManager;
  readonly monitoring: DefaultMonitoringManager;

  // Health check
  getHealth(): Promise<LaunchpadHealth>;

  // Events
  onEvent(callback: LaunchpadEventCallback): void;
}

export interface LaunchpadHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    agents: boolean;
    governance: boolean;
    funds: boolean;
    pools: boolean;
    organizations: boolean;
    monitoring: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export class DefaultLaunchpadService implements LaunchpadService {
  readonly agents: DefaultTreasuryAgentManager;
  readonly governance: DefaultGovernanceManager;
  readonly funds: DefaultFundManager;
  readonly pools: DefaultCapitalPoolManager;
  readonly organizations: DefaultOrganizationManager;
  readonly monitoring: DefaultMonitoringManager;

  private readonly eventCallbacks: LaunchpadEventCallback[] = [];

  constructor(config: Partial<LaunchpadServiceConfig> = {}) {
    // Initialize all managers
    this.agents = createTreasuryAgentManager(config.agents);
    this.governance = createGovernanceManager(config.governance);
    this.funds = createFundManager(config.funds);
    this.pools = createCapitalPoolManager(config.pools);
    this.organizations = createOrganizationManager(config.organizations);
    this.monitoring = createMonitoringManager(config.monitoring);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<LaunchpadHealth> {
    const components = {
      agents: true,
      governance: true,
      funds: true,
      pools: true,
      organizations: true,
      monitoring: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: LaunchpadHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      lastCheck: new Date(),
      details: {},
    };
  }

  onEvent(callback: LaunchpadEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: LaunchpadEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.agents.onEvent(forwardEvent);
    this.governance.onEvent(forwardEvent);
    this.funds.onEvent(forwardEvent);
    this.pools.onEvent(forwardEvent);
    this.organizations.onEvent(forwardEvent);
    this.monitoring.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLaunchpadService(
  config?: Partial<LaunchpadServiceConfig>
): DefaultLaunchpadService {
  return new DefaultLaunchpadService(config);
}

// Default export
export default DefaultLaunchpadService;
