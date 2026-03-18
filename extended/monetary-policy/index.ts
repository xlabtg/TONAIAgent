/**
 * TONAIAgent - AI Monetary Policy & Treasury Layer (Issue #123)
 *
 * A programmable central bank layer for the TON AI Agent ecosystem,
 * combining AI-driven monetary policy with DAO governance. Manages protocol
 * liquidity, controls token emissions, stabilizes ecosystem growth, and allocates
 * strategic capital — all running autonomously on The Open Network.
 *
 * Inspired conceptually by the Federal Reserve, ECB, and IMF, but:
 * - Transparent
 * - Algorithmic
 * - AI-managed
 * - DAO-governed
 *
 * Architecture:
 *
 *   Treasury Vault
 *         ↓
 *   AI Monetary Engine
 *         ↓
 *   Emission Controller
 *         ↓
 *   Liquidity & Stability Allocation
 *         ↓
 *   Protocol-wide Economic Impact
 *
 * Governance Flow:
 *   AI Analysis → Monetary Proposal → DAO Vote → Execution Smart Contract
 *
 * Components:
 * 1. Protocol Treasury Vault        — Multi-category reserve management and revenue intake
 * 2. AI Monetary Policy Engine      — Signal analysis and policy recommendation generation
 * 3. Adaptive Emission Controller   — Token emission and burn with phase-based adjustment
 * 4. Treasury Capital Allocator     — Strategic capital deployment with governance controls
 * 5. Stability-Linked Incentive System — Reward multipliers tied to protocol health
 * 6. Monetary Governance Layer      — DAO proposals, voting, and emergency overrides
 *
 * @example
 * ```typescript
 * import { createMonetaryPolicyLayer } from '@tonaiagent/core/monetary-policy';
 *
 * const layer = createMonetaryPolicyLayer();
 *
 * // Record revenue
 * layer.treasury.recordRevenue('performance_fees', 50000, 'TON', 50000, 'Q1 performance fees');
 *
 * // Analyze protocol state and generate policy recommendation
 * const recommendation = layer.monetaryEngine.analyze({
 *   stabilityIndex: 75,
 *   liquidityDepth: 60,
 *   clearingExposure: 0.3,
 *   marketVolatility: 0.25,
 *   protocolGrowthRate: 0.4,
 *   currentEmissionRate: 100_000,
 *   tokenPrice: 2.5,
 *   stakingParticipation: 0.45,
 *   treasuryValueTon: 5_000_000,
 *   circulatingSupply: 1_000_000_000,
 *   timestamp: new Date(),
 * });
 *
 * // Apply emission adjustment
 * if (!recommendation.requiresGovernanceApproval) {
 *   layer.emissionController.applyAdjustment(recommendation.emissionAdjustment, recommendation.id);
 * } else {
 *   // Create DAO proposal
 *   const proposal = layer.governance.createProposal(
 *     'emission_adjustment',
 *     'Adjust Emission Rate Q1 2026',
 *     recommendation.policyRationale,
 *     recommendation,
 *     'ai-monetary-engine',
 *   );
 * }
 *
 * // Compute stability-linked incentive multiplier
 * const multiplier = layer.incentiveSystem.computeMultiplier({
 *   stabilityScore: 75,
 *   liquidityDepthScore: 60,
 *   riskExposureScore: 30,
 *   agentPerformanceScore: 80,
 * });
 * console.log('Effective incentive multiplier:', multiplier.effective);
 *
 * // Get system health
 * const health = layer.getHealth();
 * console.log('Monetary Policy Layer Health:', health);
 * ```
 */

// Export all types
export * from './types';

// Export Protocol Treasury Vault
export {
  DefaultProtocolTreasuryVault,
  createProtocolTreasuryVault,
  type ProtocolTreasuryVault,
} from './treasury-vault';

// Export AI Monetary Policy Engine
export {
  DefaultAiMonetaryPolicyEngine,
  createAiMonetaryPolicyEngine,
  type AiMonetaryPolicyEngine,
} from './monetary-engine';

// Export Adaptive Emission Controller
export {
  DefaultAdaptiveEmissionController,
  createAdaptiveEmissionController,
  type AdaptiveEmissionController,
} from './emission-controller';

// Export Treasury Capital Allocator
export {
  DefaultTreasuryCapitalAllocator,
  createTreasuryCapitalAllocator,
  type TreasuryCapitalAllocator,
} from './capital-allocator';

// Export Stability-Linked Incentive System
export {
  DefaultStabilityLinkedIncentiveSystem,
  createStabilityLinkedIncentiveSystem,
  type StabilityLinkedIncentiveSystem,
} from './incentive-system';

// Export Monetary Governance Layer
export {
  DefaultMonetaryGovernanceLayer,
  createMonetaryGovernanceLayer,
  DEFAULT_MONETARY_POLICY_CONFIG,
  type MonetaryGovernanceLayer,
} from './governance-layer';

// ============================================================================
// Unified Monetary Policy Layer Service
// ============================================================================

import { DefaultProtocolTreasuryVault, createProtocolTreasuryVault } from './treasury-vault';
import { DefaultAiMonetaryPolicyEngine, createAiMonetaryPolicyEngine } from './monetary-engine';
import { DefaultAdaptiveEmissionController, createAdaptiveEmissionController } from './emission-controller';
import { DefaultTreasuryCapitalAllocator, createTreasuryCapitalAllocator } from './capital-allocator';
import { DefaultStabilityLinkedIncentiveSystem, createStabilityLinkedIncentiveSystem } from './incentive-system';
import { DefaultMonetaryGovernanceLayer, createMonetaryGovernanceLayer } from './governance-layer';

import type {
  MonetaryPolicyConfig,
  MonetaryPolicyHealth,
  MonetaryPolicyEvent,
  MonetaryPolicyEventCallback,
} from './types';

// ============================================================================
// Unified Layer Interface
// ============================================================================

export interface MonetaryPolicyLayer {
  readonly treasury: DefaultProtocolTreasuryVault;
  readonly monetaryEngine: DefaultAiMonetaryPolicyEngine;
  readonly emissionController: DefaultAdaptiveEmissionController;
  readonly capitalAllocator: DefaultTreasuryCapitalAllocator;
  readonly incentiveSystem: DefaultStabilityLinkedIncentiveSystem;
  readonly governance: DefaultMonetaryGovernanceLayer;

  getHealth(): MonetaryPolicyHealth;
  onEvent(callback: MonetaryPolicyEventCallback): () => void;
}

// ============================================================================
// Unified Layer Implementation
// ============================================================================

export class DefaultMonetaryPolicyLayer implements MonetaryPolicyLayer {
  readonly treasury: DefaultProtocolTreasuryVault;
  readonly monetaryEngine: DefaultAiMonetaryPolicyEngine;
  readonly emissionController: DefaultAdaptiveEmissionController;
  readonly capitalAllocator: DefaultTreasuryCapitalAllocator;
  readonly incentiveSystem: DefaultStabilityLinkedIncentiveSystem;
  readonly governance: DefaultMonetaryGovernanceLayer;

  private readonly eventCallbacks: MonetaryPolicyEventCallback[] = [];

  constructor(config?: Partial<MonetaryPolicyConfig>) {
    this.treasury = createProtocolTreasuryVault();
    this.monetaryEngine = createAiMonetaryPolicyEngine();
    this.emissionController = createAdaptiveEmissionController(config?.emissionControl);
    this.capitalAllocator = createTreasuryCapitalAllocator(config?.capitalAllocation);
    this.incentiveSystem = createStabilityLinkedIncentiveSystem();
    this.governance = createMonetaryGovernanceLayer(config);

    // Propagate events from all sub-components
    const propagate = (event: MonetaryPolicyEvent) => {
      for (const cb of this.eventCallbacks) cb(event);
    };

    this.treasury.onEvent(propagate);
    this.monetaryEngine.onEvent(propagate);
    this.emissionController.onEvent(propagate);
    this.capitalAllocator.onEvent(propagate);
    this.incentiveSystem.onEvent(propagate);
    this.governance.onEvent(propagate);
  }

  getHealth(): MonetaryPolicyHealth {
    const emissionState = this.emissionController.getEmissionState();
    const activeOverrides = this.governance.getActiveOverrides();
    const activeProposals = this.governance.getActiveProposals();
    const latestMultiplier = this.incentiveSystem.getLatestMultiplier();
    const latestRecommendation = this.monetaryEngine.getLatestRecommendation();

    const treasuryValue = this.treasury.getTotalValueTon();
    const stabilityScore = latestMultiplier
      ? (latestMultiplier.stabilityBonus / 0.5) * 100
      : 50;

    // Determine component health
    const treasuryHealth = treasuryValue > 0 ? 'healthy' : 'degraded';
    const emissionHealth: MonetaryPolicyHealth['emissionController'] =
      emissionState.currentDailyRate > 0 ? 'healthy' : 'degraded';
    const engineHealth: MonetaryPolicyHealth['monetaryEngine'] =
      latestRecommendation ? 'healthy' : 'degraded';
    const emergencyActive = activeOverrides.length > 0;

    const overall: MonetaryPolicyHealth['overall'] =
      emergencyActive || treasuryValue === 0 ? 'degraded' : 'healthy';

    return {
      overall,
      treasuryVault: treasuryHealth,
      monetaryEngine: engineHealth,
      emissionController: emissionHealth,
      capitalAllocator: 'healthy',
      incentiveSystem: latestMultiplier ? 'healthy' : 'degraded',
      governanceLayer: 'healthy',
      activeEmergencyOverrides: activeOverrides.length,
      pendingProposals: activeProposals.length,
      treasuryValueTon: treasuryValue,
      currentDailyEmissionRate: emissionState.currentDailyRate,
      currentStabilityScore: stabilityScore,
    };
  }

  onEvent(callback: MonetaryPolicyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }
}

/**
 * Create a fully-initialized AI Monetary Policy & Treasury Layer
 */
export function createMonetaryPolicyLayer(
  config?: Partial<MonetaryPolicyConfig>
): DefaultMonetaryPolicyLayer {
  return new DefaultMonetaryPolicyLayer(config);
}
