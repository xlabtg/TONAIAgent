/**
 * TONAIAgent - Tokenomics Layer
 *
 * Comprehensive economic model for the autonomous AI agent ecosystem on TON blockchain.
 * Provides token utility, staking, rewards, governance, reputation, and anti-exploit mechanisms.
 *
 * @example
 * ```typescript
 * import {
 *   createTokenomicsManager,
 *   TokenomicsConfig,
 * } from '@tonaiagent/core/tokenomics';
 *
 * const config: TokenomicsConfig = {
 *   token: { symbol: 'TONAI', decimals: 9, ... },
 *   staking: { enabled: true, minStakeAmount: '100', ... },
 *   governance: { enabled: true, proposalThreshold: '10000', ... },
 *   reputation: { enabled: true, ... },
 * };
 *
 * const tokenomics = createTokenomicsManager(config);
 *
 * // Stake tokens
 * const stake = await tokenomics.staking.stake({ userId: 'user-1', amount: '1000', lockPeriod: 30 });
 *
 * // Create governance proposal
 * const proposal = await tokenomics.governance.createProposal({ ... });
 *
 * // Check reputation
 * const score = await tokenomics.reputation.getScore('user-1');
 * ```
 */

// Export all types
export * from './types';

// Export token utility
export {
  DefaultTokenUtility,
  createTokenUtility,
  type TokenUtility,
  type TokenUtilityConfig,
  type FeeDiscountParams,
  type VotingPowerParams,
} from './token-utility';

// Export staking module
export {
  DefaultStakingModule,
  createStakingModule,
  type StakingModule,
  type RewardsCalculationParams,
  type AgentStakeRequest,
  type SlashRequest,
} from './staking';

// Export rewards distributor
export {
  DefaultRewardsDistributor,
  createRewardsDistributor,
  type RewardsDistributor,
  type PerformanceFeeParams,
  type DistributionResult,
  type ClaimVestedResult,
  type VestingScheduleParams,
  type VestingSchedule,
} from './rewards';

// Export governance engine
export {
  DefaultGovernanceEngine,
  createGovernanceEngine,
  type GovernanceEngine,
  type ProposalFilter,
  type DelegationInfo,
  type ProposalExecutionResult,
  type ActionResult,
} from './governance';

// Export reputation system
export {
  DefaultReputationSystem,
  createReputationSystem,
  type ReputationSystem,
  type RecordEventParams,
} from './reputation';

// Export anti-exploit manager
export {
  DefaultAntiExploitManager,
  createAntiExploitManager,
  type AntiExploitManager,
  type AccountMetadata,
  type CooldownStatus,
  type ClaimStatus,
  type AppealResult,
} from './anti-exploit';

// ============================================================================
// Import Components for Manager
// ============================================================================

import {
  TokenomicsConfig,
  TokenomicsEvent,
  TokenomicsEventCallback,
} from './types';

import { DefaultTokenUtility, createTokenUtility } from './token-utility';
import { DefaultStakingModule, createStakingModule } from './staking';
import { DefaultRewardsDistributor, createRewardsDistributor } from './rewards';
import { DefaultGovernanceEngine, createGovernanceEngine } from './governance';
import { DefaultReputationSystem, createReputationSystem } from './reputation';
import { DefaultAntiExploitManager, createAntiExploitManager } from './anti-exploit';

// ============================================================================
// Tokenomics Manager - Unified Entry Point
// ============================================================================

export interface TokenomicsManager {
  readonly enabled: boolean;
  readonly tokenUtility: DefaultTokenUtility;
  readonly staking: DefaultStakingModule;
  readonly rewards: DefaultRewardsDistributor;
  readonly governance: DefaultGovernanceEngine;
  readonly reputation: DefaultReputationSystem;
  readonly antiExploit: DefaultAntiExploitManager;

  // Health check
  getHealth(): Promise<TokenomicsHealth>;

  // Statistics
  getStats(): Promise<TokenomicsStats>;

  // Events
  onEvent(callback: TokenomicsEventCallback): void;
}

export interface TokenomicsHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    tokenUtility: boolean;
    staking: boolean;
    rewards: boolean;
    governance: boolean;
    reputation: boolean;
    antiExploit: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export interface TokenomicsStats {
  totalStaked: string;
  totalRewardsDistributed: string;
  activeProposals: number;
  totalUsers: number;
  averageReputation: number;
  emissionRate: string;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultTokenomicsManager implements TokenomicsManager {
  readonly enabled: boolean;
  readonly tokenUtility: DefaultTokenUtility;
  readonly staking: DefaultStakingModule;
  readonly rewards: DefaultRewardsDistributor;
  readonly governance: DefaultGovernanceEngine;
  readonly reputation: DefaultReputationSystem;
  readonly antiExploit: DefaultAntiExploitManager;

  private readonly eventCallbacks: TokenomicsEventCallback[] = [];

  constructor(config: Partial<TokenomicsConfig> = {}) {
    this.enabled = true;

    // Initialize token utility
    this.tokenUtility = createTokenUtility({
      symbol: config.token?.symbol,
      name: config.token?.name,
      decimals: config.token?.decimals,
    });

    // Initialize staking module
    this.staking = createStakingModule(config.staking);

    // Initialize rewards distributor
    this.rewards = createRewardsDistributor(config.rewards);

    // Initialize governance engine
    this.governance = createGovernanceEngine(config.governance);

    // Initialize reputation system
    this.reputation = createReputationSystem(config.reputation);

    // Initialize anti-exploit manager
    this.antiExploit = createAntiExploitManager(config.antiExploit);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<TokenomicsHealth> {
    // Check each component's health
    const components = {
      tokenUtility: true, // Always available
      staking: this.staking.config.enabled,
      rewards: true, // Always available
      governance: this.governance.config.enabled,
      reputation: this.reputation.config.enabled,
      antiExploit: true, // Always available
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: TokenomicsHealth['overall'];
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
        stakingEnabled: this.staking.config.enabled,
        governanceEnabled: this.governance.config.enabled,
        reputationEnabled: this.reputation.config.enabled,
      },
    };
  }

  async getStats(): Promise<TokenomicsStats> {
    const governanceStats = await this.governance.getStats();
    // emissionStatus available for future detailed emission tracking
    // const emissionStatus = await this.antiExploit.getEmissionStatus();

    return {
      totalStaked: '0', // Would aggregate from staking
      totalRewardsDistributed: this.rewards.getTotalEmitted(),
      activeProposals: governanceStats.activeProposals,
      totalUsers: 0, // Would count from user registry
      averageReputation: 50, // Would calculate from reputation scores
      emissionRate: this.rewards.getCurrentEmissionRate(),
    };
  }

  onEvent(callback: TokenomicsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: TokenomicsEvent) => {
      // Forward to all subscribers
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.tokenUtility.onEvent(forwardEvent);
    this.staking.onEvent(forwardEvent);
    this.rewards.onEvent(forwardEvent);
    this.governance.onEvent(forwardEvent);
    this.reputation.onEvent(forwardEvent);
    this.antiExploit.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTokenomicsManager(
  config?: Partial<TokenomicsConfig>
): DefaultTokenomicsManager {
  return new DefaultTokenomicsManager(config);
}

// Default export
export default DefaultTokenomicsManager;
