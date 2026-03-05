/**
 * TONAIAgent - Sovereign Digital Asset Coordination Layer (SDACL)
 *
 * A framework enabling CBDCs, sovereign tokenized bonds, national digital
 * treasuries, and state-backed RWA instruments to integrate, interoperate,
 * and coordinate within the AIFOS stack.
 *
 * Initially built on The Open Network with multi-chain compatibility.
 *
 * > "Infrastructure designed to coordinate — not disrupt — sovereign systems."
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │            SDACL — Sovereign Digital Asset Coordination Layer           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  1. CBDC Integration Interface    │ Issuer verify, supply, settlement  │
 * │  2. Sovereign Treasury Bridge     │ Treasury alloc, bonds, reserves    │
 * │  3. Cross-Sovereign Coordination  │ AI capital flows, liquidity balance│
 * │  4. Jurisdiction Enforcement      │ Geo restrict, eligibility, sanction│
 * │  5. Sovereign Transparency        │ Exposure metrics, compliance, alerts│
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @example
 * ```typescript
 * import { createSDACLService } from '@tonaiagent/core/sdacl';
 *
 * const sdacl = createSDACLService({
 *   networkId: 'ton-mainnet',
 *   environment: 'sandbox',
 *   sanctionCheckEnabled: true,
 *   crossBorderRoutingEnabled: true,
 * });
 *
 * // Register a CBDC
 * const cbdc = sdacl.cbdcIntegration.registerSovereignAsset({
 *   issuerId: 'ECB',
 *   issuerName: 'European Central Bank',
 *   assetType: 'cbdc',
 *   symbol: 'EURC',
 *   name: 'Digital Euro',
 *   jurisdictionCode: 'EU',
 *   totalSupply: 1_000_000_000,
 *   reserveRatio: 1.0,
 *   chainId: 'ton',
 * });
 *
 * // Verify issuer
 * const verification = sdacl.cbdcIntegration.verifyIssuer('ECB', 'EU');
 * console.log('ECB verified:', verification.verified);
 *
 * // Create treasury allocation
 * const allocation = sdacl.treasuryBridge.createAllocation({
 *   sovereignFundId: 'GPFG',
 *   sovereignFundName: 'Government Pension Fund Global',
 *   jurisdictionCode: 'NO',
 *   allocationAmountUsd: 500_000_000,
 *   allocationCurrency: 'NOK',
 *   targetAssetId: cbdc.id,
 * });
 *
 * // Initiate cross-border flow
 * const flow = sdacl.crossSovereignCoordination.initiateFlow({
 *   flowType: 'capital_transfer',
 *   sourceJurisdiction: 'EU',
 *   destinationJurisdiction: 'NO',
 *   assetId: cbdc.id,
 *   amountUsd: 10_000_000,
 *   complianceVerified: true,
 * });
 *
 * // Check participant eligibility
 * const eligibility = sdacl.jurisdictionEnforcement.checkParticipantEligibility({
 *   participantId: 'inst-001',
 *   jurisdictionCode: 'EU',
 *   kycLevel: 'institutional',
 * });
 *
 * // Generate transparency dashboard
 * const dashboard = sdacl.sovereignTransparency.generateDashboardSnapshot();
 * console.log('Stability score:', dashboard.stabilityScore);
 *
 * // Get full system status
 * const status = sdacl.getSystemStatus();
 * console.log('SDACL system status:', status);
 * ```
 */

// Re-export all types
export * from './types';

// Re-export CBDC Integration Interface (Component 1)
export {
  DefaultCBDCIntegrationManager,
  createCBDCIntegrationManager,
  type SovereignAssetModule,
  type RegisterSovereignAssetParams,
  type RouteSettlementParams,
  type ReportToAuthorityParams,
  type JurisdictionRuleEnforcement,
  type SovereignAssetFilters,
  type SettlementFilters,
} from './cbdc-integration';

// Re-export Sovereign Treasury Bridge (Component 2)
export {
  DefaultSovereignTreasuryBridgeManager,
  createSovereignTreasuryBridgeManager,
  type SovereignTreasuryBridgeManager,
  type CreateAllocationParams,
  type AllocationFilters,
  type IssueBondParams,
  type BondFilters,
  type RecordReserveParams,
} from './sovereign-treasury-bridge';

// Re-export Cross-Sovereign Coordination Engine (Component 3)
export {
  DefaultCrossSovereignCoordinationManager,
  createCrossSovereignCoordinationManager,
  type CrossSovereignCoordinationManager,
  type InitiateFlowParams,
  type FlowFilters,
  type OpenSessionParams,
  type AssessRiskParams,
  type FlowRiskAssessment,
  type RebalancingSuggestion,
  type SystemicRiskSummary,
} from './cross-sovereign-coordination';

// Re-export Jurisdiction Enforcement Layer (Component 4)
export {
  DefaultJurisdictionEnforcementManager,
  createJurisdictionEnforcementManager,
  type JurisdictionEnforcementManager,
  type CreateRuleParams,
  type UpdateRuleParams,
  type RuleFilters,
  type CheckEligibilityParams,
  type EvaluateTransactionParams,
  type TransactionEvaluation,
  type EnforcementEventFilters,
} from './jurisdiction-enforcement';

// Re-export Sovereign Transparency Dashboard (Component 5)
export {
  DefaultSovereignTransparencyManager,
  createSovereignTransparencyManager,
  type SovereignTransparencyManager,
  type RecordExposureParams,
  type ExposureFilters,
  type GenerateReportParams,
  type ComplianceReportFilters,
  type RaiseAlertParams,
  type AlertFilters,
} from './sovereign-transparency';

// ============================================================================
// Unified SDACL Service
// ============================================================================

import {
  SDACLConfig,
  DEFAULT_SDACL_CONFIG,
  SDACLSystemStatus,
  SDACLEvent,
  SDACLEventCallback,
} from './types';

import { DefaultCBDCIntegrationManager, createCBDCIntegrationManager } from './cbdc-integration';
import { DefaultSovereignTreasuryBridgeManager, createSovereignTreasuryBridgeManager } from './sovereign-treasury-bridge';
import { DefaultCrossSovereignCoordinationManager, createCrossSovereignCoordinationManager } from './cross-sovereign-coordination';
import { DefaultJurisdictionEnforcementManager, createJurisdictionEnforcementManager } from './jurisdiction-enforcement';
import { DefaultSovereignTransparencyManager, createSovereignTransparencyManager } from './sovereign-transparency';

export interface SDACLService {
  readonly config: SDACLConfig;
  readonly cbdcIntegration: DefaultCBDCIntegrationManager;
  readonly treasuryBridge: DefaultSovereignTreasuryBridgeManager;
  readonly crossSovereignCoordination: DefaultCrossSovereignCoordinationManager;
  readonly jurisdictionEnforcement: DefaultJurisdictionEnforcementManager;
  readonly sovereignTransparency: DefaultSovereignTransparencyManager;

  getSystemStatus(): SDACLSystemStatus;
  onEvent(callback: SDACLEventCallback): void;
}

export class DefaultSDACLService implements SDACLService {
  readonly config: SDACLConfig;
  readonly cbdcIntegration: DefaultCBDCIntegrationManager;
  readonly treasuryBridge: DefaultSovereignTreasuryBridgeManager;
  readonly crossSovereignCoordination: DefaultCrossSovereignCoordinationManager;
  readonly jurisdictionEnforcement: DefaultJurisdictionEnforcementManager;
  readonly sovereignTransparency: DefaultSovereignTransparencyManager;

  private readonly eventCallbacks: SDACLEventCallback[] = [];

  constructor(config: Partial<SDACLConfig> = {}) {
    this.config = { ...DEFAULT_SDACL_CONFIG, ...config };

    // Initialize all components
    this.cbdcIntegration = createCBDCIntegrationManager();
    this.treasuryBridge = createSovereignTreasuryBridgeManager();
    this.crossSovereignCoordination = createCrossSovereignCoordinationManager();
    this.jurisdictionEnforcement = createJurisdictionEnforcementManager();
    this.sovereignTransparency = createSovereignTransparencyManager();

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  getSystemStatus(): SDACLSystemStatus {
    const component1 = this.cbdcIntegration.getComponentStatus();
    const component2 = this.treasuryBridge.getComponentStatus();
    const component3 = this.crossSovereignCoordination.getComponentStatus();
    const component4 = this.jurisdictionEnforcement.getComponentStatus();
    const component5 = this.sovereignTransparency.getComponentStatus();

    // Calculate total sovereign assets value
    const totalSovereignAssetsUsd =
      component1.settledVolumeUsd +
      component2.totalAllocatedUsd +
      component3.totalCoordinatedVolumeUsd;

    // Calculate system stability index (0-100)
    const stabilityScore = this.sovereignTransparency.computeStabilityScore();
    const systemicRisk = this.crossSovereignCoordination.getSystemicRiskSummary();
    const systemStabilityIndex = Math.round(
      (stabilityScore + (100 - systemicRisk.overallRiskScore)) / 2
    );

    return {
      component1CbdcIntegration: component1,
      component2TreasuryBridge: component2,
      component3CrossSovereignCoordination: component3,
      component4JurisdictionEnforcement: component4,
      component5SovereignTransparency: component5,
      totalSovereignAssetsUsd,
      systemStabilityIndex,
      generatedAt: new Date(),
    };
  }

  onEvent(callback: SDACLEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: SDACLEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.cbdcIntegration.onEvent(forwardEvent);
    this.treasuryBridge.onEvent(forwardEvent);
    this.crossSovereignCoordination.onEvent(forwardEvent);
    this.jurisdictionEnforcement.onEvent(forwardEvent);
    this.sovereignTransparency.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSDACLService(config?: Partial<SDACLConfig>): DefaultSDACLService {
  return new DefaultSDACLService(config);
}

// Default export
export default DefaultSDACLService;
