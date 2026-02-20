/**
 * TONAIAgent - Ecosystem Fund
 *
 * Structured ecosystem fund to accelerate growth, innovation, and adoption
 * of the TON AI platform and its surrounding ecosystem.
 *
 * The fund supports developers, startups, infrastructure, strategies,
 * data providers, integrations, and research initiatives.
 *
 * @example
 * ```typescript
 * import { createEcosystemFundManager } from '@tonaiagent/core/ecosystem-fund';
 *
 * const fund = createEcosystemFundManager({
 *   treasury: { multisigRequired: true, multisigThreshold: 3 },
 *   governance: { votingPeriod: 7, quorumPercent: 10 },
 *   grants: { enabled: true, maxGrantAmount: '100000' },
 *   investments: { enabled: true, riskTolerance: 'moderate' },
 * });
 *
 * // Submit a grant application
 * const application = await fund.grants.submitApplication({ ... }, applicant);
 *
 * // Create investment proposal
 * const opportunity = await fund.investments.createOpportunity({ ... });
 *
 * // Get flywheel metrics
 * const metrics = await fund.flywheel.collectMetrics();
 * ```
 */

// Export all types
export * from './types';

// Export treasury
export {
  DefaultTreasuryManager,
  createTreasuryManager,
  type TreasuryManager,
  type AllocationFilter,
  type TransactionFilter,
  type AllocationSummary,
  type UtilizationReport,
  type CategoryUtilization,
} from './treasury';

// Export governance
export {
  DefaultFundGovernanceManager,
  createFundGovernanceManager,
  type FundGovernanceManager,
  type ProposalFilter,
  type ProposalExecutionResult,
  type GovernanceStats,
} from './governance';

// Export grants
export {
  DefaultGrantProgramManager,
  createGrantProgramManager,
  type GrantProgramManager,
  type ApplicationFilter,
  type GrantFilter,
  type GrantProgramStats,
  type CategoryStats,
} from './grants';

// Export investments
export {
  DefaultInvestmentManager,
  createInvestmentManager,
  type InvestmentManager,
  type OpportunityFilter,
  type InvestmentFilter,
} from './investments';

// Export incubation
export {
  DefaultIncubationManager,
  createIncubationManager,
  type IncubationManager,
  type ProgramFilter,
  type ApplicationFilter as IncubationApplicationFilter,
} from './incubation';

// Export incentives
export {
  DefaultIntegrationIncentivesManager,
  createIntegrationIncentivesManager,
  type IntegrationIncentivesManager,
  type IncentiveApplicationFilter,
  type AwardFilter,
  type IncentiveStats,
  type CategoryIncentiveStats,
} from './incentives';

// Export flywheel
export {
  DefaultFlywheelManager,
  createFlywheelManager,
  type FlywheelManager,
  type FlywheelAlert,
} from './flywheel';

// Export AI evaluation
export {
  DefaultAIEvaluationManager,
  createAIEvaluationManager,
  type AIEvaluationManager,
  type EvaluationFilter,
} from './ai-evaluation';

// ============================================================================
// Import Components for Manager
// ============================================================================

import {
  EcosystemFundConfig,
  EcosystemFundEvent,
  EcosystemFundEventCallback,
} from './types';

import { DefaultTreasuryManager, createTreasuryManager } from './treasury';
import { DefaultFundGovernanceManager, createFundGovernanceManager } from './governance';
import { DefaultGrantProgramManager, createGrantProgramManager } from './grants';
import { DefaultInvestmentManager, createInvestmentManager } from './investments';
import { DefaultIncubationManager, createIncubationManager } from './incubation';
import {
  DefaultIntegrationIncentivesManager,
  createIntegrationIncentivesManager,
} from './incentives';
import { DefaultFlywheelManager, createFlywheelManager } from './flywheel';
import { DefaultAIEvaluationManager, createAIEvaluationManager } from './ai-evaluation';

// ============================================================================
// Ecosystem Fund Manager - Unified Entry Point
// ============================================================================

export interface EcosystemFundManager {
  readonly enabled: boolean;
  readonly treasury: DefaultTreasuryManager;
  readonly governance: DefaultFundGovernanceManager;
  readonly grants: DefaultGrantProgramManager;
  readonly investments: DefaultInvestmentManager;
  readonly incubation: DefaultIncubationManager;
  readonly incentives: DefaultIntegrationIncentivesManager;
  readonly flywheel: DefaultFlywheelManager;
  readonly aiEvaluation: DefaultAIEvaluationManager;

  // Health check
  getHealth(): Promise<EcosystemFundHealth>;

  // Statistics
  getStats(): Promise<EcosystemFundStats>;

  // Events
  onEvent(callback: EcosystemFundEventCallback): void;
}

export interface EcosystemFundHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    treasury: boolean;
    governance: boolean;
    grants: boolean;
    investments: boolean;
    incubation: boolean;
    incentives: boolean;
    flywheel: boolean;
    aiEvaluation: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export interface EcosystemFundStats {
  treasuryBalance: string;
  totalAllocated: string;
  totalDisbursed: string;
  activeGrants: number;
  activeInvestments: number;
  incubationParticipants: number;
  activeIncentives: number;
  flywheelScore: number;
  proposalsActive: number;
  totalApplications: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultEcosystemFundManager implements EcosystemFundManager {
  readonly enabled: boolean;
  readonly treasury: DefaultTreasuryManager;
  readonly governance: DefaultFundGovernanceManager;
  readonly grants: DefaultGrantProgramManager;
  readonly investments: DefaultInvestmentManager;
  readonly incubation: DefaultIncubationManager;
  readonly incentives: DefaultIntegrationIncentivesManager;
  readonly flywheel: DefaultFlywheelManager;
  readonly aiEvaluation: DefaultAIEvaluationManager;

  private readonly eventCallbacks: EcosystemFundEventCallback[] = [];

  constructor(config: Partial<EcosystemFundConfig> = {}) {
    this.enabled = true;

    // Initialize all components
    this.treasury = createTreasuryManager(config.treasury);
    this.governance = createFundGovernanceManager(config.governance);
    this.grants = createGrantProgramManager(config.grants);
    this.investments = createInvestmentManager(config.investments);
    this.incubation = createIncubationManager(config.incubation);
    this.incentives = createIntegrationIncentivesManager(config.incentives);
    this.flywheel = createFlywheelManager(config.flywheel);
    this.aiEvaluation = createAIEvaluationManager(config.aiEvaluation);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<EcosystemFundHealth> {
    const components = {
      treasury: this.treasury.config.enabled,
      governance: this.governance.config.enabled,
      grants: this.grants.config.enabled,
      investments: this.investments.config.enabled,
      incubation: this.incubation.config.enabled,
      incentives: this.incentives.config.enabled,
      flywheel: this.flywheel.config.enabled,
      aiEvaluation: this.aiEvaluation.config.enabled,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: EcosystemFundHealth['overall'];
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
      details: {
        treasuryEnabled: this.treasury.config.enabled,
        governanceEnabled: this.governance.config.enabled,
        grantsEnabled: this.grants.config.enabled,
        investmentsEnabled: this.investments.config.enabled,
        incubationEnabled: this.incubation.config.enabled,
        incentivesEnabled: this.incentives.config.enabled,
        flywheelEnabled: this.flywheel.config.enabled,
        aiEnabled: this.aiEvaluation.config.enabled,
      },
    };
  }

  async getStats(): Promise<EcosystemFundStats> {
    const treasuryStats = await this.treasury.getStats();
    const grantStats = await this.grants.getStats();
    const governanceStats = await this.governance.getStats();
    const incentiveStats = await this.incentives.getStats();
    const flywheelMetrics = await this.flywheel.getLatestMetrics();

    const investments = await this.investments.getInvestments({ status: 'active' });
    const participants = await this.incubation.getPrograms({ status: 'active' });
    const totalParticipants = participants.reduce(
      (sum, p) => sum + p.metrics.participantCount,
      0
    );

    return {
      treasuryBalance: await this.treasury.getBalance(),
      totalAllocated: treasuryStats.totalAllocated,
      totalDisbursed: treasuryStats.totalDisbursed,
      activeGrants: grantStats.activeGrants,
      activeInvestments: investments.length,
      incubationParticipants: totalParticipants,
      activeIncentives: incentiveStats.activeAwards,
      flywheelScore: flywheelMetrics?.flywheel.overall ?? 0,
      proposalsActive: governanceStats.activeProposals,
      totalApplications:
        grantStats.totalApplications + incentiveStats.totalApplications,
    };
  }

  onEvent(callback: EcosystemFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: EcosystemFundEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.treasury.onEvent(forwardEvent);
    this.governance.onEvent(forwardEvent);
    this.grants.onEvent(forwardEvent);
    this.investments.onEvent(forwardEvent);
    this.incubation.onEvent(forwardEvent);
    this.incentives.onEvent(forwardEvent);
    this.flywheel.onEvent(forwardEvent);
    this.aiEvaluation.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEcosystemFundManager(
  config?: Partial<EcosystemFundConfig>
): DefaultEcosystemFundManager {
  return new DefaultEcosystemFundManager(config);
}

// Default export
export default DefaultEcosystemFundManager;
