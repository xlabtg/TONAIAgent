/**
 * TONAIAgent - AI-native Financial Operating System (AIFOS)
 *
 * A programmable, modular, AI-coordinated financial OS that manages capital,
 * allocates liquidity, executes strategies, controls risk, enforces governance,
 * and interfaces with global financial systems.
 *
 * Comparable in abstraction to:
 * - Microsoft Windows (OS layer for applications)
 * - Apple iOS (ecosystem OS model)
 * - Linux Foundation Linux (modular open architecture)
 *
 * But for capital markets & global finance.
 *
 * OS Architecture (bottom-up):
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │                 AIFOS - AI-native Financial Operating System                 │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │  Applications (Funds / DAOs / Sovereigns)                                    │
 * │                        ↓                                                    │
 * │  Financial Modules (Asset / Liquidity / Clearing / Treasury / Compliance)   │
 * │                        ↓                                                    │
 * │  AI Orchestration Layer (Agent decisions / Risk / Crisis response)           │
 * │                        ↓                                                    │
 * │  Financial Kernel (Capital state / Risk / Monetary / Governance)            │
 * │                        ↓                                                    │
 * │  Blockchain Infrastructure (TON + cross-chain)                              │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │  Permission & Identity Layer (across all layers)                            │
 * │  Interoperability Layer (cross-chain / external APIs / protocol bridges)    │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * @example
 * ```typescript
 * import { createAIFOSManager } from '@tonaiagent/core/aifos';
 *
 * // Initialize the Financial OS
 * const aifos = createAIFOSManager();
 *
 * // Deploy a minimal kernel
 * console.log('Kernel state:', aifos.kernel.getState());
 *
 * // Plug the liquidity module
 * const modules = aifos.modules.listModules({ moduleType: 'liquidity' });
 * console.log('Liquidity module:', modules[0].name);
 *
 * // Plug the treasury module
 * const treasury = aifos.modules.listModules({ moduleType: 'treasury' });
 * console.log('Treasury module:', treasury[0].name);
 *
 * // Run AI orchestration
 * const decision = aifos.orchestration.proposeDecision({
 *   agentId: 'agent-001',
 *   decisionType: 'capital_reallocation',
 *   rationale: 'Optimize yield across modules',
 *   targetModules: [modules[0].id, treasury[0].id],
 *   proposedActions: [],
 *   estimatedRiskImpact: -5,
 *   estimatedCapitalImpact: 1_000_000,
 * });
 *
 * // Execute governance parameter update
 * const override = aifos.kernel.applyGovernanceOverride({
 *   overrideType: 'parameter_update',
 *   proposedBy: 'governance-council',
 *   approvalPercent: 67,
 *   targetParameter: 'globalRiskCap',
 *   targetValue: 'elevated',
 *   reason: 'Temporary risk appetite increase for market opportunity',
 * });
 *
 * // Launch a demo application
 * const app = aifos.applications.registerApp({
 *   name: 'AI Hedge Fund Alpha',
 *   appType: 'ai_hedge_fund',
 *   developer: 'dev-001',
 *   version: '1.0.0',
 *   description: 'Autonomous hedge fund running on AIFOS',
 *   capitalBudget: 100_000_000,
 * });
 *
 * // Get full system status
 * const status = aifos.getSystemStatus();
 * console.log('AIFOS System Status:', status);
 * ```
 */

// Export all types
export * from './types';

// Export Financial Kernel
export {
  DefaultFinancialKernel,
  createFinancialKernel,
  type FinancialKernel,
  type KernelValidationResult,
  type KernelBoundaryResult,
  type MonetaryAdjustmentParams,
  type MonetaryAdjustmentResult,
  type GovernanceOverrideParams,
  type GovernanceOverrideResult,
} from './financial-kernel';

// Export Financial Modules
export {
  DefaultFinancialModules,
  createFinancialModules,
  type FinancialModules,
  type RegisterModuleParams,
  type ModuleFilters,
  type APIValidationResult,
  type ExecuteOperationParams,
  type ModuleHealthReport,
  type ModulesHealthSummary,
  type LimitCheckResult,
} from './financial-modules';

// Export AI Orchestration Layer
export {
  DefaultAIOrchestrationLayer,
  createAIOrchestrationLayer,
  type AIOrchestrationLayer,
  type ProposeDecisionParams,
  type DecisionFilters,
  type DecisionExecutionResult,
  type RecalibrationParams,
  type RecalibrationFilters,
  type CapitalReallocationParams,
  type CapitalReallocationProposal,
  type CapitalReallocationResult,
  type RegisterCrisisParams,
  type CrisisActivationResult,
  type CrisisPlanFilters,
  type BoundaryCheckResult,
  type OrchestrationMetrics,
} from './ai-orchestration-layer';

// Export Application Layer
export {
  DefaultApplicationLayer,
  createApplicationLayer,
  type ApplicationLayer,
  type RegisterAppParams,
  type AppFilters,
  type MarketplaceFilters,
  type PublishMarketplaceParams,
  type AppValidationResult,
  type EcosystemMetrics,
} from './application-layer';

// Export Permission & Identity Layer
export {
  DefaultPermissionIdentityLayer,
  createPermissionIdentityLayer,
  type PermissionIdentityLayer,
  type CreateIdentityParams,
  type IdentityFilters,
  type AccessCheckResult,
  type CreateDelegationParams,
  type DelegationFilters,
  type ComplianceCheckResult,
} from './permission-identity-layer';

// Export Interoperability Layer
export {
  DefaultInteroperabilityLayer,
  createInteroperabilityLayer,
  type InteroperabilityLayer,
  type OpenChannelParams,
  type ChannelFilters,
  type ChannelHealthResult,
  type RegisterAPIParams,
  type APIFilters,
  type ExternalAPICallResult,
  type RegisterBridgeParams,
  type BridgeFilters,
  type TranslateMessageParams,
  type TranslateMessageResult,
  type CrossChainRouteParams,
  type CrossChainRouteResult,
  type RouteHop,
  type ChainConnectivityReport,
  type InteropSummary,
} from './interoperability-layer';

// ============================================================================
// Imports for Unified Manager
// ============================================================================

import { DefaultFinancialKernel, createFinancialKernel } from './financial-kernel';
import { DefaultFinancialModules, createFinancialModules } from './financial-modules';
import { DefaultAIOrchestrationLayer, createAIOrchestrationLayer } from './ai-orchestration-layer';
import { DefaultApplicationLayer, createApplicationLayer } from './application-layer';
import { DefaultPermissionIdentityLayer, createPermissionIdentityLayer } from './permission-identity-layer';
import { DefaultInteroperabilityLayer, createInteroperabilityLayer } from './interoperability-layer';
import {
  AIFOSConfig,
  AIFOSSystemStatus,
  AIFOSEvent,
  AIFOSEventCallback,
} from './types';

// ============================================================================
// Unified AIFOS Manager Interface
// ============================================================================

export interface AIFOSManager {
  readonly kernel: DefaultFinancialKernel;
  readonly modules: DefaultFinancialModules;
  readonly orchestration: DefaultAIOrchestrationLayer;
  readonly applications: DefaultApplicationLayer;
  readonly identity: DefaultPermissionIdentityLayer;
  readonly interoperability: DefaultInteroperabilityLayer;

  onEvent(callback: AIFOSEventCallback): void;
  getSystemStatus(): AIFOSSystemStatus;
}

// ============================================================================
// Unified AIFOS Manager Implementation
// ============================================================================

export class DefaultAIFOSManager implements AIFOSManager {
  readonly kernel: DefaultFinancialKernel;
  readonly modules: DefaultFinancialModules;
  readonly orchestration: DefaultAIOrchestrationLayer;
  readonly applications: DefaultApplicationLayer;
  readonly identity: DefaultPermissionIdentityLayer;
  readonly interoperability: DefaultInteroperabilityLayer;

  private readonly eventCallbacks: AIFOSEventCallback[] = [];
  private readonly startedAt = Date.now();

  constructor(config?: AIFOSConfig) {
    this.kernel = createFinancialKernel(config?.kernel);
    this.modules = createFinancialModules(config?.modules);
    this.orchestration = createAIOrchestrationLayer(config?.orchestration);
    this.applications = createApplicationLayer(config?.applications);
    this.identity = createPermissionIdentityLayer(config?.permissionIdentity);
    this.interoperability = createInteroperabilityLayer(config?.interoperability);

    this.setupEventForwarding();
  }

  onEvent(callback: AIFOSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getSystemStatus(): AIFOSSystemStatus {
    // Kernel state
    const capitalState = this.kernel.getCapitalState();
    const riskState = this.kernel.getRiskState();

    // Modules
    const modulesHealth = this.modules.getModulesHealth();

    // Orchestration
    const orchestrationMetrics = this.orchestration.getOrchestrationMetrics();
    const crisisPlans = this.orchestration.listCrisisPlans({ isActive: true });

    // Applications
    const ecosystemMetrics = this.applications.getEcosystemMetrics();

    // Identity
    const identities = this.identity.listIdentities();
    const delegations = this.identity.listDelegations({ isActive: true });
    const gates = this.identity.listComplianceGates();

    // Interoperability
    const interopSummary = this.interoperability.getInteropSummary();

    return {
      kernelState: this.kernel.getState(),
      kernelVersion: '1.0.0',
      // Capital & Risk
      totalManagedCapitalUSD: capitalState.totalManagedCapital,
      currentRiskLevel: riskState.currentRiskLevel,
      stabilityIndex: riskState.stabilityIndex,
      activeRiskBreaches: riskState.activeBreaches,
      // Modules
      totalModules: modulesHealth.totalModules,
      activeModules: modulesHealth.activeModules,
      moduleErrors: modulesHealth.errorModules,
      // Orchestration
      orchestrationMode: orchestrationMetrics.currentMode,
      activeAgentDecisions: this.orchestration.listDecisions({ status: 'executing' }).length,
      completedAgentDecisions: orchestrationMetrics.totalDecisions,
      crisisResponsePlansActive: crisisPlans.length,
      // Applications
      registeredApps: ecosystemMetrics.totalApps,
      activeApps: ecosystemMetrics.activeApps,
      // Identity & Permissions
      totalIdentities: identities.length,
      activeGovernanceDelegations: delegations.length,
      activeComplianceGates: gates.filter(g => g.isActive).length,
      // Interoperability
      activeInteropChannels: interopSummary.activeChannels,
      registeredExternalAPIs: interopSummary.registeredAPIs,
      activeProtocolBridges: interopSummary.activeProtocolBridges,
      // Meta
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private: Event Forwarding
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: AIFOSEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.kernel.onEvent(forwardEvent);
    this.modules.onEvent(forwardEvent);
    this.orchestration.onEvent(forwardEvent);
    this.applications.onEvent(forwardEvent);
    this.identity.onEvent(forwardEvent);
    this.interoperability.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAIFOSManager(config?: AIFOSConfig): DefaultAIFOSManager {
  return new DefaultAIFOSManager(config);
}

// Default export
export default DefaultAIFOSManager;
