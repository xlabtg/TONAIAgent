/**
 * TONAIAgent - AI-native Global Financial Infrastructure (AGFI)
 *
 * The formalization of the TON AI Agent platform as institutional-grade global capital
 * coordination infrastructure. Comparable in systemic importance to SWIFT, IMF, and BIS —
 * but with AI-coordination, on-chain transparency, programmability, and borderless design.
 *
 * Architecture: Six Interconnected Pillars
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    AGFI - AI-native Global Financial Infrastructure      │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  1. Global Capital Layer      │  Sovereign funds, institutional allocators│
 * │  2. Global Liquidity Fabric   │  Cross-chain liquidity, RWA bridges       │
 * │  3. AI Systemic Coordination  │  Exposure mapping, capital adequacy        │
 * │  4. Autonomous Monetary       │  Multi-asset treasury, emission control    │
 * │  5. Governance & Alignment    │  Jurisdiction modules, sovereign onboarding│
 * │  6. Interoperability          │  Cross-chain messaging, bank connectors    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Strategic Equivalences:
 * - SWIFT analog: Global Liquidity Fabric + Interoperability Integration
 * - IMF analog: AI Systemic Coordination Layer
 * - BIS analog: Autonomous Monetary Infrastructure + Governance Alignment
 * - DTCC analog: Global Capital Layer (custody & clearing)
 *
 * @example
 * ```typescript
 * import { createAGFIManager } from '@tonaiagent/core/agfi';
 *
 * // Initialize AGFI
 * const agfi = createAGFIManager();
 *
 * // Onboard a sovereign wealth fund
 * const fund = agfi.globalCapital.onboardInstitution({
 *   name: 'Norges Bank Investment Management',
 *   type: 'sovereign_fund',
 *   jurisdiction: 'NO',
 *   aum: 1_400_000_000_000, // $1.4T
 *   complianceTier: 'sovereign',
 * });
 *
 * // Open a cross-chain liquidity corridor
 * const corridor = agfi.globalLiquidity.openCorridor({
 *   name: 'TON-ETH Institutional',
 *   sourceChain: 'ton',
 *   destinationChain: 'ethereum',
 *   sourceProtocol: 'TON DEX',
 *   destinationProtocol: 'Uniswap V3',
 *   corridorType: 'institutional_corridor',
 *   initialLiquidity: 50_000_000,
 * });
 *
 * // Run a systemic risk simulation
 * const stressTest = agfi.systemicCoordination.runStressSimulation({
 *   scenarioName: 'Global Credit Event',
 *   scenarioType: 'market_crash',
 *   shockMagnitude: 30,
 * });
 *
 * // Get global status
 * const status = agfi.getSystemStatus();
 * console.log('AGFI System Status:', status);
 * ```
 */

// Export all types
export * from './types';

// Export Global Capital Layer
export {
  DefaultGlobalCapitalLayer,
  createGlobalCapitalLayer,
  type GlobalCapitalLayer,
  type OnboardInstitutionParams,
  type InstitutionFilters,
  type InitiateCapitalFlowParams,
  type CapitalFlowFilters,
  type RebalanceResult,
  type AllocationAdjustment,
  type JurisdictionCapitalSummary,
} from './global-capital-layer';

// Export Global Liquidity Fabric
export {
  DefaultGlobalLiquidityFabric,
  createGlobalLiquidityFabric,
  type GlobalLiquidityFabric,
  type OpenCorridorParams,
  type CorridorFilters,
  type ComputeRouteParams,
  type RouteFilters,
  type CreatePoolParams,
  type RegisterRWABridgeParams,
  type RWABridgeFilters,
  type LiquidityFabricMetrics,
  type ChainLiquidityProfile,
} from './global-liquidity-fabric';

// Export AI Systemic Coordination Layer
export {
  DefaultAISystemicCoordinationLayer,
  createAISystemicCoordinationLayer,
  type AISystemicCoordinationLayer,
  type ExposurePosition,
  type CapitalAdequacyParams,
  type StressSimulationParams,
  type StressSimulationFilters,
  type StabilizationActionParams,
  type StabilizationFilters,
  type ContagionRiskResult,
  type SystemicRiskDashboard,
  type RiskFactor,
} from './ai-systemic-coordination';

// Export Autonomous Monetary Infrastructure
export {
  DefaultAutonomousMonetaryInfrastructure,
  createAutonomousMonetaryInfrastructure,
  type AutonomousMonetaryInfrastructure,
  type CreateReserveParams,
  type AddReserveAssetParams,
  type RebalanceReserveResult,
  type AssetAdjustment,
  type ReserveSummary,
  type CreateChainPositionParams,
  type ChainPositionFilters,
  type CreateStabilizationPoolParams,
  type StabilizationDeployment,
  type YieldHarvestResult,
  type CreateEmissionControlParams,
  type EmissionAdjustmentResult,
  type MonetaryAdjustmentParams,
  type MonetaryAdjustmentResult,
  type MonetaryHealthScore,
} from './autonomous-monetary-infrastructure';

// Export Governance & Institutional Alignment
export {
  DefaultGovernanceInstitutionalAlignment,
  createGovernanceInstitutionalAlignment,
  type GovernanceInstitutionalAlignment,
  type RegisterJurisdictionModuleParams,
  type JurisdictionModuleFilters,
  type SovereignOnboardingParams,
  type SovereignProfileFilters,
  type RegisterComplianceBridgeParams,
  type ComplianceBridgeFilters,
  type ComplianceSyncResult,
  type ProposeGovernanceActionParams,
  type ProposalFilters,
  type VoteResult,
  type ComplianceAssessment,
  type ComplianceViolation,
  type ComplianceWarning,
} from './governance-institutional-alignment';

// Export Interoperability & Global Integration
export {
  DefaultInteroperabilityGlobalIntegration,
  createInteroperabilityGlobalIntegration,
  type InteroperabilityGlobalIntegration,
  type SendMessageParams,
  type MessageFilters,
  type MessageQueueStatus,
  type RegisterAPIEndpointParams,
  type APIEndpointFilters,
  type APIHealthResult,
  type AddBankConnectorParams,
  type BankConnectorFilters,
  type BankConnectionTestResult,
  type RegisterCustodianParams,
  type CustodianFilters,
  type RegisterRWACustodialParams,
  type RWACustodialFilters,
  type RWACustodyVerification,
  type IntegrationSummary,
  type GlobalConnectivityMap,
  type ChainConnectivity,
  type JurisdictionConnectivity,
} from './interoperability-global-integration';

// ============================================================================
// Imports for Unified Manager
// ============================================================================

import { DefaultGlobalCapitalLayer, createGlobalCapitalLayer } from './global-capital-layer';
import { DefaultGlobalLiquidityFabric, createGlobalLiquidityFabric } from './global-liquidity-fabric';
import { DefaultAISystemicCoordinationLayer, createAISystemicCoordinationLayer } from './ai-systemic-coordination';
import { DefaultAutonomousMonetaryInfrastructure, createAutonomousMonetaryInfrastructure } from './autonomous-monetary-infrastructure';
import { DefaultGovernanceInstitutionalAlignment, createGovernanceInstitutionalAlignment } from './governance-institutional-alignment';
import { DefaultInteroperabilityGlobalIntegration, createInteroperabilityGlobalIntegration } from './interoperability-global-integration';
import {
  AGFIConfig,
  AGFISystemStatus,
  AGFIEvent,
  AGFIEventCallback,
} from './types';

// ============================================================================
// Unified AGFI Manager Interface
// ============================================================================

export interface AGFIManager {
  readonly globalCapital: DefaultGlobalCapitalLayer;
  readonly globalLiquidity: DefaultGlobalLiquidityFabric;
  readonly systemicCoordination: DefaultAISystemicCoordinationLayer;
  readonly autonomousMonetary: DefaultAutonomousMonetaryInfrastructure;
  readonly governance: DefaultGovernanceInstitutionalAlignment;
  readonly integration: DefaultInteroperabilityGlobalIntegration;

  onEvent(callback: AGFIEventCallback): void;
  getSystemStatus(): AGFISystemStatus;
}

// ============================================================================
// Unified AGFI Manager Implementation
// ============================================================================

export class DefaultAGFIManager implements AGFIManager {
  readonly globalCapital: DefaultGlobalCapitalLayer;
  readonly globalLiquidity: DefaultGlobalLiquidityFabric;
  readonly systemicCoordination: DefaultAISystemicCoordinationLayer;
  readonly autonomousMonetary: DefaultAutonomousMonetaryInfrastructure;
  readonly governance: DefaultGovernanceInstitutionalAlignment;
  readonly integration: DefaultInteroperabilityGlobalIntegration;

  private readonly eventCallbacks: AGFIEventCallback[] = [];

  constructor(config?: AGFIConfig) {
    this.globalCapital = createGlobalCapitalLayer(config?.globalCapitalLayer);
    this.globalLiquidity = createGlobalLiquidityFabric(config?.globalLiquidityFabric);
    this.systemicCoordination = createAISystemicCoordinationLayer(config?.aiSystemicCoordination);
    this.autonomousMonetary = createAutonomousMonetaryInfrastructure(config?.autonomousMonetary);
    this.governance = createGovernanceInstitutionalAlignment(config?.governanceInstitutionalAlignment);
    this.integration = createInteroperabilityGlobalIntegration(config?.globalIntegration);

    this.setupEventForwarding();
  }

  onEvent(callback: AGFIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getSystemStatus(): AGFISystemStatus {
    // Global Capital Layer metrics
    const institutions = this.globalCapital.listInstitutions();
    const totalAUM = institutions.reduce((sum, i) => sum + i.aum, 0);
    const activeFlows = this.globalCapital.listCapitalFlows({ status: 'in_transit' });
    const settledFlows = this.globalCapital.listCapitalFlows({ status: 'settled' });

    // Global Liquidity Fabric metrics
    const corridors = this.globalLiquidity.listCorridors({ status: 'active' });
    const fabricMetrics = this.globalLiquidity.getFabricMetrics();
    const rwaBridges = this.globalLiquidity.listRWABridges({ status: 'active' });

    // AI Systemic Coordination metrics
    const riskDashboard = this.systemicCoordination.getSystemicRiskDashboard();
    const breaches = this.systemicCoordination.listCapitalAdequacyBreaches();
    const simulations = this.systemicCoordination.listStressSimulations();

    // Autonomous Monetary metrics
    const monetaryHealth = this.autonomousMonetary.getMonetaryHealthScore();
    const reserveSummary = this.autonomousMonetary.getReserveSummary();
    const emissionControls = this.autonomousMonetary.listEmissionControls();

    // Governance metrics
    const jurisdictionModules = this.governance.listJurisdictionModules({ status: 'active' });
    const pendingProposals = this.governance.listProposals({ status: 'voting' });
    const sovereignOnboarding = this.governance.listSovereignProfiles({ completed: false });

    // Integration metrics
    const integrationSummary = this.integration.getIntegrationSummary();
    const messageQueue = this.integration.getMessageQueueStatus();

    return {
      // Global Capital Layer
      onboardedInstitutions: institutions.length,
      totalAUMManaged: totalAUM,
      activeCapitalFlows: activeFlows.length,
      settledCapitalFlows: settledFlows.length,
      // Global Liquidity Fabric
      activeLiquidityCorridors: corridors.length,
      totalLiquidityInFabric: fabricMetrics.activeLiquidity,
      activeRWABridges: rwaBridges.length,
      // AI Systemic Coordination
      systemicRiskLevel: riskDashboard.riskLevel,
      systemicRiskScore: riskDashboard.overallRiskScore,
      capitalAdequacyBreaches: breaches.length,
      activeStressSimulations: simulations.length,
      // Autonomous Monetary
      reserveStabilityScore: monetaryHealth.reserveStability,
      totalReserveValueUSD: reserveSummary.totalValueUSD,
      activeEmissionControls: emissionControls.length,
      // Governance
      activeJurisdictionModules: jurisdictionModules.length,
      pendingGovernanceProposals: pendingProposals.length,
      sovereignOnboardingInProgress: sovereignOnboarding.length,
      // Interoperability
      activeIntegrations: integrationSummary.institutionalAPIs.active,
      messagesInFlight: messageQueue.sending + messageQueue.queued,
      connectedBanks: integrationSummary.bankConnectors.connected,
      mappedCustodians: integrationSummary.custodians.total,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private: Event Forwarding
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: AGFIEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.globalCapital.onEvent(forwardEvent);
    this.globalLiquidity.onEvent(forwardEvent);
    this.systemicCoordination.onEvent(forwardEvent);
    this.autonomousMonetary.onEvent(forwardEvent);
    this.governance.onEvent(forwardEvent);
    this.integration.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAGFIManager(config?: AGFIConfig): DefaultAGFIManager {
  return new DefaultAGFIManager(config);
}

// Default export
export default DefaultAGFIManager;
