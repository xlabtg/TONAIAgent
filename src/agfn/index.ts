/**
 * TONAIAgent - Autonomous Global Financial Network (AGFN)
 *
 * A distributed, AI-coordinated financial network that connects multiple
 * jurisdictions, integrates sovereign and institutional nodes, routes global
 * liquidity, and executes AI-managed capital flows.
 *
 * Architecture: Six Interconnected Components
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │              AGFN - Autonomous Global Financial Network                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  1. Global Node Architecture    │  Sovereign, institutional, custodian  │
 * │  2. Cross-Jurisdiction Routing  │  Compliance-aware, liquidity passport │
 * │  3. Global Settlement Mesh      │  Multi-region, atomic transfers        │
 * │  4. AI Coordination Layer       │  Liquidity balance, risk clusters      │
 * │  5. Multi-Reserve Treasury      │  Regional pools, multi-asset vaults   │
 * │  6. Global Stability Dashboard  │  Exposure, liquidity, stability index │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @example
 * ```typescript
 * import { createAGFNManager } from '@tonaiagent/core/agfn';
 *
 * // Initialize AGFN
 * const agfn = createAGFNManager();
 *
 * // Register a sovereign node
 * const node = agfn.nodeArchitecture.registerNode({
 *   name: 'ECB Primary Node',
 *   type: 'sovereign',
 *   jurisdiction: 'EU',
 *   chain: 'ethereum',
 *   operatorId: 'ecb_001',
 *   capacityUSD: 500_000_000_000, // $500B
 * });
 *
 * // Compute a cross-jurisdiction route
 * const route = agfn.capitalRouting.computeRoute({
 *   sourceNodeId: node.id,
 *   destinationNodeId: destNode.id,
 *   amount: 100_000_000,
 *   currency: 'USD',
 *   strategy: 'compliance_first',
 * });
 *
 * // Get global stability status
 * const status = agfn.getSystemStatus();
 * console.log('AGFN System Status:', status);
 * ```
 */

// Export all types
export * from './types';

// Export Global Node Architecture
export {
  DefaultGlobalNodeArchitecture,
  createGlobalNodeArchitecture,
  type GlobalNodeArchitecture,
  type RegisterNodeParams,
  type NodeFilters,
  type NetworkTopology,
  type JurisdictionNodeSummary,
  type NodeHealthReport,
  type NodeHealthIssue,
} from './global-node-architecture';

// Export Cross-Jurisdiction Capital Router
export {
  DefaultCrossJurisdictionCapitalRouter,
  createCrossJurisdictionCapitalRouter,
  type CrossJurisdictionCapitalRouter,
  type ComputeRouteParams,
  type RouteFilters,
  type IssueLiquidityPassportParams,
  type PassportFilters,
  type PassportValidationResult,
  type RouteComplianceResult,
  type HopComplianceResult,
  type JurisdictionComplianceReport,
  type RoutingMetrics,
} from './cross-jurisdiction-routing';

// Export Global Settlement Mesh
export {
  DefaultGlobalSettlementMesh,
  createGlobalSettlementMesh,
  type GlobalSettlementMesh,
  type InitiateSettlementParams,
  type SettlementFilters,
  type NettingCycleFilters,
  type NettingResult,
  type RecordFinalityParams,
  type FinalityFilters,
  type SettlementMetrics,
  type MeshStatus,
} from './global-settlement-mesh';

// Export AI Coordination Layer
export {
  DefaultAICoordinationLayer,
  createAICoordinationLayer,
  type AICoordinationLayer,
  type DetectRiskClustersParams,
  type RiskClusterFilters,
  type ProposeReallocationParams,
  type ReallocationFilters,
  type CrisisMitigationParams,
  type CrisisFilters,
  type CoordinationDashboard,
} from './ai-coordination-layer';

// Export Multi-Reserve Treasury Network
export {
  DefaultMultiReserveTreasuryNetwork,
  createMultiReserveTreasuryNetwork,
  type MultiReserveTreasuryNetwork,
  type CreateReservePoolParams,
  type ReservePoolFilters,
  type ReservePoolRebalanceResult,
  type PoolAssetAdjustment,
  type CreateTreasuryVaultParams,
  type TreasuryVaultFilters,
  type VaultRebalanceResult,
  type VaultAssetAdjustment,
  type InitiateReserveTransferParams,
  type ReserveTransferFilters,
  type NetworkReserveSummary,
  type AssetAllocationMap,
} from './multi-reserve-treasury';

// Export Global Stability Dashboard
export {
  DefaultGlobalStabilityDashboard,
  createGlobalStabilityDashboard,
  type GlobalStabilityDashboard,
  type RecordSnapshotParams,
  type SnapshotFilters,
  type StabilityAlert,
  type PublicMetricsSummary,
  type RegionalAllocationBreakdown,
  type LiquidityDepthReport,
  type StabilityTrend,
} from './global-stability-dashboard';

// ============================================================================
// Imports for Unified Manager
// ============================================================================

import { DefaultGlobalNodeArchitecture, createGlobalNodeArchitecture } from './global-node-architecture';
import { DefaultCrossJurisdictionCapitalRouter, createCrossJurisdictionCapitalRouter } from './cross-jurisdiction-routing';
import { DefaultGlobalSettlementMesh, createGlobalSettlementMesh } from './global-settlement-mesh';
import { DefaultAICoordinationLayer, createAICoordinationLayer } from './ai-coordination-layer';
import { DefaultMultiReserveTreasuryNetwork, createMultiReserveTreasuryNetwork } from './multi-reserve-treasury';
import { DefaultGlobalStabilityDashboard, createGlobalStabilityDashboard } from './global-stability-dashboard';
import {
  AGFNConfig,
  AGFNSystemStatus,
  AGFNEvent,
  AGFNEventCallback,
} from './types';

// ============================================================================
// Unified AGFN Manager Interface
// ============================================================================

export interface AGFNManager {
  readonly nodeArchitecture: DefaultGlobalNodeArchitecture;
  readonly capitalRouting: DefaultCrossJurisdictionCapitalRouter;
  readonly settlementMesh: DefaultGlobalSettlementMesh;
  readonly aiCoordination: DefaultAICoordinationLayer;
  readonly treasuryNetwork: DefaultMultiReserveTreasuryNetwork;
  readonly stabilityDashboard: DefaultGlobalStabilityDashboard;

  onEvent(callback: AGFNEventCallback): void;
  getSystemStatus(): AGFNSystemStatus;
}

// ============================================================================
// Unified AGFN Manager Implementation
// ============================================================================

export class DefaultAGFNManager implements AGFNManager {
  readonly nodeArchitecture: DefaultGlobalNodeArchitecture;
  readonly capitalRouting: DefaultCrossJurisdictionCapitalRouter;
  readonly settlementMesh: DefaultGlobalSettlementMesh;
  readonly aiCoordination: DefaultAICoordinationLayer;
  readonly treasuryNetwork: DefaultMultiReserveTreasuryNetwork;
  readonly stabilityDashboard: DefaultGlobalStabilityDashboard;

  private readonly eventCallbacks: AGFNEventCallback[] = [];

  constructor(config?: AGFNConfig) {
    this.nodeArchitecture = createGlobalNodeArchitecture(config?.globalNodeArchitecture);
    this.capitalRouting = createCrossJurisdictionCapitalRouter(config?.crossJurisdictionRouting);
    this.settlementMesh = createGlobalSettlementMesh(config?.globalSettlementMesh);
    this.aiCoordination = createAICoordinationLayer(config?.aiCoordination);
    this.treasuryNetwork = createMultiReserveTreasuryNetwork(config?.multiReserveTreasury);
    this.stabilityDashboard = createGlobalStabilityDashboard(config?.globalStabilityDashboard);

    this.setupEventForwarding();
  }

  onEvent(callback: AGFNEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getSystemStatus(): AGFNSystemStatus {
    // Node Architecture metrics
    const topology = this.nodeArchitecture.getNetworkTopology();
    const sovereignNodes = this.nodeArchitecture.listNodes({ type: 'sovereign' });
    const institutionalNodes = this.nodeArchitecture.listNodes({ type: 'institutional' });

    // Capital Routing metrics
    const activeRoutes = this.capitalRouting.listRoutes({ status: 'executing' });
    const completedRoutes = this.capitalRouting.listRoutes({ status: 'completed' });
    const activePassports = this.capitalRouting.listLiquidityPassports({ status: 'active' });

    // Settlement Mesh metrics
    const settlementMetrics = this.settlementMesh.getSettlementMetrics();

    // AI Coordination metrics
    const activeRiskClusters = this.aiCoordination.listRiskClusters({ status: 'active' });
    const allRiskClusters = this.aiCoordination.listRiskClusters();
    const completedReallocations = this.aiCoordination.listCapitalReallocations({ status: 'completed' });
    const activeCrises = this.aiCoordination.listCrisisMitigationPlans({ status: 'active' });

    // Treasury Network metrics
    const reserveSummary = this.treasuryNetwork.getNetworkReserveSummary();

    // Stability Dashboard metrics
    const publicMetrics = this.stabilityDashboard.getPublicMetricsSummary();

    return {
      // Node Architecture
      totalNodes: topology.totalNodes,
      activeNodes: topology.activeNodes,
      sovereignNodes: sovereignNodes.length,
      institutionalNodes: institutionalNodes.length,
      // Capital Routing
      activeRoutes: activeRoutes.length,
      completedRoutes: completedRoutes.length,
      activeLiquidityPassports: activePassports.length,
      // Settlement Mesh
      pendingSettlements: settlementMetrics.pendingSettlements,
      finalizedSettlements: settlementMetrics.finalizedSettlements,
      nettingEfficiency: settlementMetrics.nettingEfficiency,
      // AI Coordination
      riskClustersDetected: allRiskClusters.length,
      activeRiskClusters: activeRiskClusters.length,
      capitalReallocationsExecuted: completedReallocations.length,
      activeCrisisMitigations: activeCrises.length,
      // Treasury Network
      totalReservePools: reserveSummary.totalPools,
      totalReserveValueUSD: reserveSummary.totalReserveValueUSD,
      totalTreasuryVaults: reserveSummary.totalVaults,
      totalTreasuryValueUSD: reserveSummary.totalVaultValueUSD,
      // Stability
      stabilityIndex: publicMetrics.stabilityIndex,
      stabilityIndicator: publicMetrics.stabilityIndicator,
      totalLiquidityUSD: publicMetrics.totalLiquidityUSD,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private: Event Forwarding
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: AGFNEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.nodeArchitecture.onEvent(forwardEvent);
    this.capitalRouting.onEvent(forwardEvent);
    this.settlementMesh.onEvent(forwardEvent);
    this.aiCoordination.onEvent(forwardEvent);
    this.treasuryNetwork.onEvent(forwardEvent);
    this.stabilityDashboard.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAGFNManager(config?: AGFNConfig): DefaultAGFNManager {
  return new DefaultAGFNManager(config);
}

// Default export
export default DefaultAGFNManager;
