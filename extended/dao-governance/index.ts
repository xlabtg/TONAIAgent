/**
 * TONAIAgent - DAO Governance & Treasury Layer (Issue #103)
 *
 * A self-governing AI financial protocol with on-chain treasury management,
 * multi-tier voting, AI-driven capital allocation within governance constraints,
 * and institutional-grade governance — comparable to MakerDAO/Aave but powered
 * by AI agents and TON-native smart contracts.
 *
 * Architecture:
 *   Token Holders
 *         ↓
 *   Governance Layer (proposals, voting, delegation)
 *         ↓
 *   Treasury Policies (risk params, multi-sig, timelock)
 *         ↓
 *   AI Treasury Manager (rebalancing, yield optimization)
 *         ↓
 *   AI Investment Agents → Execution Layer
 *
 * Components:
 * 1. Governance Engine       — Multi-tier proposal lifecycle, voting, delegation
 * 2. DAO Treasury Vault      — On-chain multi-asset treasury management
 * 3. Risk Governance         — Exposure limits, strategy whitelist, circuit breakers
 * 4. AI Treasury Manager     — AI-driven rebalancing within governance constraints
 * 5. Multi-Sig Layer         — Multi-signature security for treasury operations
 * 6. Marketplace Governance  — Token-holder curated strategy marketplace
 * 7. Delegated Governance    — Expert delegates and institutional voting
 */

export * from './types';

export {
  DefaultGovernanceEngine,
  createGovernanceEngine,
  type GovernanceEngine,
  type GovernanceEngineConfig,
} from './governance-engine';

export {
  DefaultTreasuryVaultManager,
  createTreasuryVaultManager,
  type TreasuryVaultManager,
  type TreasuryVaultConfig,
} from './treasury-vault';

export {
  DefaultRiskGovernanceManager,
  createRiskGovernanceManager,
  type RiskGovernanceManager,
  type RiskGovernanceConfig,
  type RiskCheckReport,
  type RiskViolation,
} from './risk-governance';

export {
  DefaultAiTreasuryManager,
  createAiTreasuryManager,
  type AiTreasuryManager,
  type YieldOptimizationResult,
  type EmergencyExitPlan,
} from './ai-treasury';

export {
  DefaultMultiSigManager,
  createMultiSigManager,
  type MultiSigManager,
  type MultiSigManagerConfig,
} from './multisig';

export {
  DefaultMarketplaceGovernanceManager,
  createMarketplaceGovernanceManager,
  type MarketplaceGovernanceManager,
  type MarketplaceGovernanceStats,
} from './marketplace-governance';

export {
  DefaultDelegatedGovernanceManager,
  createDelegatedGovernanceManager,
  type DelegatedGovernanceManager,
  type DelegatedGovernanceStats,
} from './delegated-governance';

// ============================================================================
// Unified DAO Governance Layer Service
// ============================================================================

import { DefaultGovernanceEngine, createGovernanceEngine } from './governance-engine';
import { DefaultTreasuryVaultManager, createTreasuryVaultManager } from './treasury-vault';
import { DefaultRiskGovernanceManager, createRiskGovernanceManager } from './risk-governance';
import { DefaultAiTreasuryManager, createAiTreasuryManager } from './ai-treasury';
import { DefaultMultiSigManager, createMultiSigManager } from './multisig';
import { DefaultMarketplaceGovernanceManager, createMarketplaceGovernanceManager } from './marketplace-governance';
import { DefaultDelegatedGovernanceManager, createDelegatedGovernanceManager } from './delegated-governance';

import type {
  DaoGovernanceConfig,
  DaoGovernanceHealth,
  DaoEvent,
  DaoEventCallback,
  DaoProposal,
  CreateDaoProposalInput,
  DaoVoteResult,
  DaoVoteType,
  TreasuryVault,
  TreasuryAllocationRequest,
  TreasuryAllocation,
  TreasuryReport,
  TreasuryRiskParameters,
  TreasuryRiskAssessment,
  CircuitBreakerState,
  AiRebalanceRecommendation,
  MultiSigOperation,
  GovernedStrategyListing,
  InstitutionalDelegate,
  DaoProposalType,
} from './types';

export interface DaoGovernanceLayerService {
  // Sub-systems
  readonly governance: DefaultGovernanceEngine;
  readonly treasury: DefaultTreasuryVaultManager;
  readonly risk: DefaultRiskGovernanceManager;
  readonly aiTreasury: DefaultAiTreasuryManager;
  readonly multisig: DefaultMultiSigManager;
  readonly marketplace: DefaultMarketplaceGovernanceManager;
  readonly delegated: DefaultDelegatedGovernanceManager;

  // High-level convenience methods

  // Governance
  createProposal(input: CreateDaoProposalInput): Promise<DaoProposal>;
  vote(proposalId: string, voter: string, voteType: DaoVoteType, reason?: string): Promise<DaoVoteResult>;

  // Treasury
  getTreasury(): TreasuryVault;
  allocateTreasury(request: TreasuryAllocationRequest, proposalId?: string): Promise<TreasuryAllocation>;
  generateTreasuryReport(periodStart: Date, periodEnd: Date): TreasuryReport;

  // Risk
  assessAllocationRisk(strategyId: string, amount: number): TreasuryRiskAssessment;
  getCircuitBreakerState(): CircuitBreakerState;
  getRiskParameters(): TreasuryRiskParameters;

  // AI Treasury
  getAiRebalanceRecommendation(): Promise<AiRebalanceRecommendation>;

  // Multi-sig
  createMultiSigOperation(
    type: MultiSigOperation['type'],
    description: string,
    data: Record<string, unknown>,
    createdBy: string
  ): MultiSigOperation;

  // Marketplace
  submitStrategy(
    strategyId: string,
    strategyName: string,
    developerAddress: string,
    riskRating: GovernedStrategyListing['riskRating']
  ): GovernedStrategyListing;
  approveStrategyListing(strategyId: string, proposalId: string): boolean;

  // Delegates
  registerDelegate(
    address: string,
    name: string,
    type: InstitutionalDelegate['type'],
    specializations: DaoProposalType[],
    tier: InstitutionalDelegate['tier']
  ): InstitutionalDelegate;

  // Health & events
  getHealth(): DaoGovernanceHealth;
  onEvent(callback: DaoEventCallback): () => void;
}

const DEFAULT_DAO_CONFIG: Partial<DaoGovernanceConfig> = {
  votingDelay: 13140,
  votingPeriod: 302400,
  proposalThreshold: 100,
  quorumPercent: 10,
  approvalThreshold: 51,
  timelockDuration: 172800,
};

export const DEFAULT_DAO_GOVERNANCE_CONFIG = DEFAULT_DAO_CONFIG;

export class DefaultDaoGovernanceLayer implements DaoGovernanceLayerService {
  readonly governance: DefaultGovernanceEngine;
  readonly treasury: DefaultTreasuryVaultManager;
  readonly risk: DefaultRiskGovernanceManager;
  readonly aiTreasury: DefaultAiTreasuryManager;
  readonly multisig: DefaultMultiSigManager;
  readonly marketplace: DefaultMarketplaceGovernanceManager;
  readonly delegated: DefaultDelegatedGovernanceManager;

  private readonly eventCallbacks: DaoEventCallback[] = [];

  constructor(config: Partial<DaoGovernanceConfig> = {}) {
    const merged = { ...DEFAULT_DAO_CONFIG, ...config };

    this.governance = createGovernanceEngine({
      votingDelay: merged.votingDelay,
      votingPeriod: merged.votingPeriod,
      proposalThreshold: merged.proposalThreshold,
      quorumPercent: merged.quorumPercent,
      approvalThreshold: merged.approvalThreshold,
      timelockDuration: merged.timelockDuration,
      proposalTypeConfigs: merged.proposalTypeConfigs,
    });

    this.treasury = createTreasuryVaultManager({
      name: 'DAO Treasury',
      maxAllocations: 20,
      minLiquidityReserve: merged.treasuryRiskParameters?.minLiquidityReserve ?? 20,
    });

    this.risk = createRiskGovernanceManager({
      initialRiskParameters: merged.treasuryRiskParameters,
    });

    this.aiTreasury = createAiTreasuryManager(merged.aiTreasuryConfig);

    this.multisig = createMultiSigManager({
      multiSigConfig: merged.treasuryMultiSig,
    });

    this.marketplace = createMarketplaceGovernanceManager();
    this.delegated = createDelegatedGovernanceManager();

    // Forward events from all sub-systems
    const forwardEvent = (event: DaoEvent): void => {
      for (const cb of this.eventCallbacks) {
        try { cb(event); } catch { /* swallow */ }
      }
    };

    this.governance.onEvent(forwardEvent);
    this.treasury.onEvent(forwardEvent);
    this.risk.onEvent(forwardEvent);
    this.aiTreasury.onEvent(forwardEvent);
    this.multisig.onEvent(forwardEvent);
    this.marketplace.onEvent(forwardEvent);
    this.delegated.onEvent(forwardEvent);
  }

  // --------------------------------------------------------------------------
  // Convenience Methods
  // --------------------------------------------------------------------------

  async createProposal(input: CreateDaoProposalInput): Promise<DaoProposal> {
    return this.governance.createProposal(input);
  }

  async vote(proposalId: string, voter: string, voteType: DaoVoteType, reason?: string): Promise<DaoVoteResult> {
    return this.governance.castVote(proposalId, voter, voteType, reason);
  }

  getTreasury(): TreasuryVault {
    return this.treasury.getVault();
  }

  async allocateTreasury(request: TreasuryAllocationRequest, proposalId?: string): Promise<TreasuryAllocation> {
    // Run risk assessment
    const vault = this.treasury.getVault();
    const currentAllocations = this.treasury.getAllAllocations();
    const assessment = this.risk.assessAllocationRisk(
      request.strategyId,
      request.requestedAmount,
      currentAllocations,
      vault.totalValueTon
    );

    if (assessment.riskLevel === 'critical') {
      throw new Error(
        `Allocation blocked: critical risk level. Warnings: ${assessment.warnings.join('; ')}`
      );
    }

    // Check circuit breaker
    if (this.risk.getCircuitBreakerState().triggered) {
      throw new Error('Allocation blocked: circuit breaker is active');
    }

    return this.treasury.allocateToStrategy(
      { ...request, riskAssessment: assessment },
      proposalId
    );
  }

  generateTreasuryReport(periodStart: Date, periodEnd: Date): TreasuryReport {
    return this.treasury.generateReport(periodStart, periodEnd);
  }

  assessAllocationRisk(strategyId: string, amount: number): TreasuryRiskAssessment {
    const vault = this.treasury.getVault();
    const currentAllocations = this.treasury.getAllAllocations();
    return this.risk.assessAllocationRisk(strategyId, amount, currentAllocations, vault.totalValueTon);
  }

  getCircuitBreakerState(): CircuitBreakerState {
    return this.risk.getCircuitBreakerState();
  }

  getRiskParameters(): TreasuryRiskParameters {
    return this.risk.getRiskParameters();
  }

  async getAiRebalanceRecommendation(): Promise<AiRebalanceRecommendation> {
    const vault = this.treasury.getVault();
    const allocations = this.treasury.getAllAllocations();
    return this.aiTreasury.generateRebalanceRecommendation(
      allocations,
      vault.totalValueTon,
      vault.availableValueTon
    );
  }

  createMultiSigOperation(
    type: MultiSigOperation['type'],
    description: string,
    data: Record<string, unknown>,
    createdBy: string
  ): MultiSigOperation {
    return this.multisig.createOperation(type, description, data, createdBy);
  }

  submitStrategy(
    strategyId: string,
    strategyName: string,
    developerAddress: string,
    riskRating: GovernedStrategyListing['riskRating']
  ): GovernedStrategyListing {
    return this.marketplace.submitStrategy(strategyId, strategyName, developerAddress, riskRating);
  }

  approveStrategyListing(strategyId: string, proposalId: string): boolean {
    return this.marketplace.approveStrategy(strategyId, proposalId);
  }

  registerDelegate(
    address: string,
    name: string,
    type: InstitutionalDelegate['type'],
    specializations: DaoProposalType[],
    tier: InstitutionalDelegate['tier']
  ): InstitutionalDelegate {
    return this.delegated.registerDelegate(address, name, type, specializations, tier);
  }

  getHealth(): DaoGovernanceHealth {
    const circuitBreaker = this.risk.getCircuitBreakerState();
    const vault = this.treasury.getVault();
    const activeProposals = 0; // Would call getActiveProposals() but sync method needed

    const circuitActive = circuitBreaker.triggered;
    const emergencies = this.risk.getActiveEmergencies();

    let overall: DaoGovernanceHealth['overall'] = 'healthy';
    if (circuitActive || emergencies.length > 0) overall = 'degraded';
    if (vault.status === 'emergency') overall = 'critical';

    return {
      overall,
      governanceEngine: 'healthy',
      treasuryVault: vault.status === 'emergency' ? 'critical' : vault.status === 'locked' ? 'degraded' : 'healthy',
      riskGovernance: circuitActive ? 'degraded' : 'healthy',
      multiSigLayer: 'healthy',
      aiTreasury: this.aiTreasury.getConfig().enabled ? 'healthy' : 'degraded',
      activeProposals,
      totalVaultValueTon: vault.totalValueTon,
      circuitBreakerActive: circuitActive,
    };
  }

  onEvent(callback: DaoEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }
}

export function createDaoGovernanceLayer(config?: Partial<DaoGovernanceConfig>): DefaultDaoGovernanceLayer {
  return new DefaultDaoGovernanceLayer(config);
}
