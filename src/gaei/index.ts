/**
 * TONAIAgent - Global Autonomous Economic Infrastructure (GAEI)
 *
 * A distributed, AI-coordinated economic layer that:
 * - Manages capital flows
 * - Coordinates digital assets
 * - Supports sovereign systems
 * - Enables AI-driven production & allocation
 * - Operates across jurisdictions
 * - Integrates financial and real economy layers
 *
 * Initially deployed on The Open Network with cross-chain scalability.
 *
 * Macro Architecture:
 * ```txt
 * Real Economy Assets
 *         ↓
 * Sovereign & Institutional Nodes
 *         ↓
 * Financial OS (AIFOS)
 *         ↓
 * AI Orchestration Engine
 *         ↓
 * Liquidity / Clearing / Treasury
 *         ↓
 * Global Autonomous Financial Network
 * ```
 *
 * Six Core Infrastructure Domains:
 * 1. Capital Coordination Layer - Macro-level capital allocation modeling
 * 2. Real Economy Integration Layer - Tokenized RWA, commodity-backed assets
 * 3. AI Economic Orchestration Engine - Macro stress simulations, risk modeling
 * 4. Multi-Layer Monetary Coordination - Protocol token economy, sovereign assets
 * 5. Global Economic Node Architecture - Sovereign, institutional, trade-finance nodes
 * 6. Global Economic Stability Dashboard - Capital distribution, risk exposure
 *
 * @example
 * ```typescript
 * import { createGAEIManager } from '@tonaiagent/core/gaei';
 *
 * // Initialize GAEI
 * const gaei = createGAEIManager();
 *
 * // Register an economic node
 * const node = gaei.nodeArchitecture.registerSovereignNode({
 *   name: 'Federal Reserve Digital',
 *   nodeType: 'sovereign_node',
 *   jurisdiction: 'US',
 *   parentNetwork: 'AGFN',
 *   initialCapital: 100_000_000_000,
 *   sovereignType: 'central_bank',
 *   countryCode: 'US',
 *   regulatoryAuthority: 'Federal Reserve System',
 *   reserveHoldings: 50_000_000_000,
 *   monetaryPolicyRole: 'Primary monetary authority',
 * });
 *
 * // Simulate cross-border trade financing
 * const tradeFinance = gaei.realEconomyIntegration.createTradeFinanceInstrument({
 *   instrumentType: 'letter_of_credit',
 *   principalAmount: 10_000_000,
 *   currency: 'USD',
 *   issuer: 'Bank of America',
 *   beneficiary: 'Samsung Electronics',
 *   sourceJurisdiction: 'US',
 *   destinationJurisdiction: 'KR',
 *   maturityDate: new Date('2026-12-31'),
 *   interestRate: 4.5,
 *   tokenize: true,
 *   chain: 'ton',
 * });
 *
 * // Run macro stress scenario
 * const stressTest = gaei.aiOrchestration.runStressSimulation({
 *   scenarioName: 'Global Trade War Escalation',
 *   scenarioType: 'trade_war',
 *   shockMagnitude: 25,
 *   affectedRegions: ['US', 'CN', 'EU'],
 * });
 *
 * // Allocate capital to tokenized infrastructure
 * const infrastructureProject = gaei.realEconomyIntegration.createInfrastructureFinancing({
 *   projectName: 'Trans-Pacific Digital Corridor',
 *   projectType: 'digital',
 *   totalInvestment: 500_000_000,
 *   jurisdiction: 'SG',
 *   expectedReturn: 8.5,
 *   projectDurationYears: 10,
 *   riskRating: 'A',
 *   tokenize: true,
 *   chain: 'ton',
 * });
 *
 * // Get full system status
 * const status = gaei.getSystemStatus();
 * console.log('GAEI System Status:', status);
 *
 * // Generate stability dashboard
 * const dashboard = gaei.stabilityDashboard.generateDashboard();
 * console.log('Stability Score:', dashboard.overallStabilityScore);
 * console.log('Stability Level:', dashboard.stabilityLevel);
 * ```
 */

// Export all types
export * from './types';

// Export Capital Coordination Layer
export {
  DefaultCapitalCoordinationLayer,
  createCapitalCoordinationLayer,
  type CapitalCoordinationLayer,
  type InitiateCapitalFlowParams,
  type CapitalFlowFilters,
  type ComputeRoutingParams,
  type MacroModelFilters,
  type CapitalCoordinationLayerStatus,
} from './capital-coordination-layer';

// Export Real Economy Integration Layer
export {
  DefaultRealEconomyIntegrationLayer,
  createRealEconomyIntegrationLayer,
  type RealEconomyIntegrationLayer,
  type CreateRWAAssetParams,
  type RWAAssetFilters,
  type CreateCommodityAssetParams,
  type CommodityAssetFilters,
  type CreateTradeFinanceParams,
  type TradeFinanceFilters,
  type CreateInfrastructureFinancingParams,
  type InfrastructureFilters,
  type CreateSupplyChainLiquidityParams,
  type SupplyChainFilters,
  type RealEconomyLayerStatus,
} from './real-economy-integration-layer';

// Export AI Economic Orchestration Engine
export {
  DefaultAIEconomicOrchestrationEngine,
  createAIEconomicOrchestrationEngine,
  type AIEconomicOrchestrationEngine,
  type RunStressSimulationParams,
  type SimulationFilters,
  type ProposeRebalancingParams,
  type RebalancingFilters,
  type CreateBufferManagementParams,
  type BufferFilters,
  type ModelContagionParams,
  type ProposeMitigationParams,
  type MitigationFilters,
  type ProposeTreasuryAdjustmentParams,
  type TreasuryAdjustmentFilters,
  type AIOrchestrationLayerStatus,
} from './ai-economic-orchestration-engine';

// Export Monetary Coordination Layer
export {
  DefaultMonetaryCoordinationLayer,
  createMonetaryCoordinationLayer,
  type MonetaryCoordinationLayer,
  type CreateMonetaryLayerParams,
  type MonetaryLayerFilters,
  type CreateProtocolTokenParams,
  type CreateSovereignAssetParams,
  type SovereignAssetFilters,
  type CreateTreasuryReserveParams,
  type TreasuryReserveFilters,
  type CreateYieldInstrumentParams,
  type YieldInstrumentFilters,
  type CreateCrossChainBasketParams,
  type BasketFilters,
  type MonetaryCoordinationLayerStatus,
} from './monetary-coordination-layer';

// Export Economic Node Architecture
export {
  DefaultEconomicNodeArchitecture,
  createEconomicNodeArchitecture,
  type EconomicNodeArchitecture,
  type RegisterNodeParams,
  type RegisterSovereignNodeParams,
  type RegisterInstitutionalNodeParams,
  type RegisterTradeFinanceNodeParams,
  type RegisterCommodityNodeParams,
  type RegisterAITreasuryNodeParams,
  type NodeFilters,
  type ConnectNodesParams,
  type NodeArchitectureLayerStatus,
} from './economic-node-architecture';

// Export Stability Dashboard
export {
  DefaultStabilityDashboardLayer,
  createStabilityDashboardLayer,
  type StabilityDashboardLayer,
  type DashboardDataSources,
  type AlertFilters,
  type TrendFilters,
} from './stability-dashboard';

// ============================================================================
// Imports for Unified Manager
// ============================================================================

import { DefaultCapitalCoordinationLayer, createCapitalCoordinationLayer } from './capital-coordination-layer';
import { DefaultRealEconomyIntegrationLayer, createRealEconomyIntegrationLayer } from './real-economy-integration-layer';
import { DefaultAIEconomicOrchestrationEngine, createAIEconomicOrchestrationEngine } from './ai-economic-orchestration-engine';
import { DefaultMonetaryCoordinationLayer, createMonetaryCoordinationLayer } from './monetary-coordination-layer';
import { DefaultEconomicNodeArchitecture, createEconomicNodeArchitecture } from './economic-node-architecture';
import { DefaultStabilityDashboardLayer, createStabilityDashboardLayer } from './stability-dashboard';
import {
  GAEIConfig,
  GAEISystemStatus,
  GAEIEvent,
  GAEIEventCallback,
  GAEI_VERSION,
  EconomicNodeType,
} from './types';

// ============================================================================
// Unified GAEI Manager Interface
// ============================================================================

export interface GAEIManager {
  readonly version: string;
  readonly capitalCoordination: DefaultCapitalCoordinationLayer;
  readonly realEconomyIntegration: DefaultRealEconomyIntegrationLayer;
  readonly aiOrchestration: DefaultAIEconomicOrchestrationEngine;
  readonly monetaryCoordination: DefaultMonetaryCoordinationLayer;
  readonly nodeArchitecture: DefaultEconomicNodeArchitecture;
  readonly stabilityDashboard: DefaultStabilityDashboardLayer;

  onEvent(callback: GAEIEventCallback): void;
  getSystemStatus(): GAEISystemStatus;
}

// ============================================================================
// Unified GAEI Manager Implementation
// ============================================================================

export class DefaultGAEIManager implements GAEIManager {
  readonly version = GAEI_VERSION;
  readonly capitalCoordination: DefaultCapitalCoordinationLayer;
  readonly realEconomyIntegration: DefaultRealEconomyIntegrationLayer;
  readonly aiOrchestration: DefaultAIEconomicOrchestrationEngine;
  readonly monetaryCoordination: DefaultMonetaryCoordinationLayer;
  readonly nodeArchitecture: DefaultEconomicNodeArchitecture;
  readonly stabilityDashboard: DefaultStabilityDashboardLayer;

  private readonly eventCallbacks: GAEIEventCallback[] = [];

  constructor(config?: GAEIConfig) {
    this.capitalCoordination = createCapitalCoordinationLayer(config?.capitalCoordination);
    this.realEconomyIntegration = createRealEconomyIntegrationLayer(config?.realEconomyIntegration);
    this.aiOrchestration = createAIEconomicOrchestrationEngine(config?.aiOrchestration);
    this.monetaryCoordination = createMonetaryCoordinationLayer(config?.monetaryCoordination);
    this.nodeArchitecture = createEconomicNodeArchitecture(config?.nodeArchitecture);
    this.stabilityDashboard = createStabilityDashboardLayer(config?.stabilityDashboard);

    this.setupEventForwarding();
  }

  onEvent(callback: GAEIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getSystemStatus(): GAEISystemStatus {
    // Capital Coordination metrics
    const capitalStatus = this.capitalCoordination.getLayerStatus();

    // Real Economy metrics
    const realEconomyStatus = this.realEconomyIntegration.getLayerStatus();

    // AI Orchestration metrics
    const aiStatus = this.aiOrchestration.getLayerStatus();

    // Monetary Coordination metrics
    const monetaryStatus = this.monetaryCoordination.getLayerStatus();

    // Node Architecture metrics
    const nodeStatus = this.nodeArchitecture.getLayerStatus();

    // Stability Dashboard
    const dashboard = this.stabilityDashboard.getLatestDashboard() ?? this.stabilityDashboard.generateDashboard();

    // Build nodesByType record
    const nodesByType: Record<EconomicNodeType, number> = nodeStatus.nodesByType;

    return {
      version: this.version,
      // Capital Coordination
      totalCapitalManaged: capitalStatus.totalCapitalManaged,
      activeCapitalFlows: capitalStatus.activeCapitalFlows,
      capitalAllocationEfficiency: capitalStatus.allocationEfficiencyIndex,
      // Real Economy
      totalRWATokenized: realEconomyStatus.totalRWATokenized,
      activeCommodityAssets: realEconomyStatus.activeCommodityAssets,
      tradeFinanceVolume: realEconomyStatus.totalTradeFinanceVolume,
      infrastructureFinanced: realEconomyStatus.totalInfrastructureFinanced,
      // AI Orchestration
      activeStressSimulations: aiStatus.activeSimulations,
      riskMitigationActions: aiStatus.pendingMitigationActions + aiStatus.executedMitigationActions,
      aiOrchestrationHealth: aiStatus.aiHealthScore,
      // Monetary Coordination
      monetaryLayersActive: monetaryStatus.activeMonetaryLayers,
      totalMonetarySupply: monetaryStatus.totalMonetarySupply,
      stabilityScore: monetaryStatus.systemStabilityScore,
      // Node Architecture
      totalEconomicNodes: nodeStatus.totalNodes,
      activeNodes: nodeStatus.activeNodes,
      nodesByType,
      // Stability Dashboard
      globalStabilityScore: dashboard.overallStabilityScore,
      stabilityLevel: dashboard.stabilityLevel,
      activeAlerts: dashboard.alerts.filter((a) => !a.resolvedAt).length,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private: Event Forwarding
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: GAEIEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.capitalCoordination.onEvent(forwardEvent);
    this.realEconomyIntegration.onEvent(forwardEvent);
    this.aiOrchestration.onEvent(forwardEvent);
    this.monetaryCoordination.onEvent(forwardEvent);
    this.nodeArchitecture.onEvent(forwardEvent);
    this.stabilityDashboard.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGAEIManager(config?: GAEIConfig): DefaultGAEIManager {
  return new DefaultGAEIManager(config);
}

// Default export
export default DefaultGAEIManager;
