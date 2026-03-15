/**
 * TONAIAgent - Autonomous Global Financial Network (AGFN) Types
 *
 * Core type definitions for the Autonomous Global Financial Network,
 * a distributed, AI-coordinated financial network that connects multiple
 * jurisdictions, integrates sovereign and institutional nodes, routes global
 * liquidity, and executes AI-managed capital flows.
 *
 * Architecture Components:
 * 1. Global Node Architecture - Sovereign, institutional, custodian, liquidity, clearing, AI nodes
 * 2. Cross-Jurisdiction Capital Routing - Compliance-aware routing, liquidity passport validation
 * 3. Global Settlement Mesh - Multi-region settlement, cross-chain finality, atomic transfers
 * 4. AI Coordination Layer - Global liquidity balancing, risk clustering, capital reallocation
 * 5. Multi-Reserve Treasury Network - Regional reserve pools, multi-asset treasury vaults
 * 6. Global Stability Dashboard - Public-facing metrics: exposure, liquidity, stability index
 */

// ============================================================================
// ID Types
// ============================================================================

export type AGFNId = string;
export type NodeId = string;
export type RouteId = string;
export type SettlementId = string;
export type ReservePoolId = string;
export type TreasuryVaultId = string;

// ============================================================================
// Enumerations
// ============================================================================

export type NodeType =
  | 'sovereign'
  | 'institutional'
  | 'custodian'
  | 'liquidity'
  | 'clearing'
  | 'ai_computation';

export type NodeStatus =
  | 'active'
  | 'syncing'
  | 'restricted'
  | 'suspended'
  | 'offline';

export type RoutingStrategy =
  | 'lowest_cost'
  | 'fastest_settlement'
  | 'highest_liquidity'
  | 'compliance_first'
  | 'risk_minimized';

export type SettlementStatus =
  | 'pending'
  | 'processing'
  | 'finalized'
  | 'failed'
  | 'reversed';

export type SettlementType =
  | 'gross'
  | 'net'
  | 'atomic'
  | 'deferred_net';

export type ChainId =
  | 'ton'
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'solana'
  | 'avalanche'
  | 'bsc'
  | 'cosmos'
  | 'polkadot'
  | 'near';

export type JurisdictionCode = string;

export type RiskClusterType =
  | 'concentration'
  | 'correlation'
  | 'liquidity_crisis'
  | 'contagion'
  | 'geopolitical'
  | 'systemic';

export type TreasuryAssetClass =
  | 'stablecoin'
  | 'native_crypto'
  | 'treasury_bond'
  | 'rwa'
  | 'liquid_yield'
  | 'commodity';

export type StabilityIndicator =
  | 'stable'
  | 'watch'
  | 'stressed'
  | 'critical'
  | 'crisis';

export type AGFNEventType =
  | 'node_registered'
  | 'node_suspended'
  | 'node_restored'
  | 'route_computed'
  | 'route_executed'
  | 'route_failed'
  | 'settlement_initiated'
  | 'settlement_finalized'
  | 'settlement_failed'
  | 'risk_cluster_detected'
  | 'capital_reallocated'
  | 'crisis_mitigation_triggered'
  | 'liquidity_balanced'
  | 'reserve_pool_created'
  | 'reserve_rebalanced'
  | 'treasury_vault_created'
  | 'stability_alert'
  | 'stability_resolved';

// ============================================================================
// Global Node Architecture Types
// ============================================================================

export interface NetworkNode {
  id: NodeId;
  name: string;
  type: NodeType;
  jurisdiction: JurisdictionCode;
  chain: ChainId;
  operatorId: string;
  capacityUSD: number;
  availableCapacityUSD: number;
  utilizationRate: number; // 0-1
  latencyMs: number;
  uptime: number; // 0-1, 30-day average
  trustScore: number; // 0-100
  complianceLevel: 'basic' | 'standard' | 'enhanced' | 'sovereign';
  supportedSettlementTypes: SettlementType[];
  connectedNodes: NodeId[];
  status: NodeStatus;
  registeredAt: Date;
  lastHeartbeatAt: Date;
  metadata: Record<string, unknown>;
}

export interface NodeCapabilityProfile {
  nodeId: NodeId;
  canInitiateCapitalFlows: boolean;
  canClearTransactions: boolean;
  canCustodyAssets: boolean;
  canProvideLiquidity: boolean;
  canExecuteAI: boolean;
  maxSingleTransactionUSD: number;
  supportedCurrencies: string[];
  supportedChains: ChainId[];
  regulatoryApprovals: string[];
}

export interface GlobalNodeConfig {
  maxNodesPerJurisdiction: number;
  minTrustScoreForRouting: number; // 0-100
  heartbeatIntervalMs: number;
  nodeTimeoutMs: number;
  enableAutoSuspend: boolean;
  minUptimeForActive: number; // 0-1
}

// ============================================================================
// Cross-Jurisdiction Capital Routing Types
// ============================================================================

export interface CapitalRoute {
  id: RouteId;
  sourceNodeId: NodeId;
  destinationNodeId: NodeId;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  amount: number;
  currency: string;
  strategy: RoutingStrategy;
  hops: RouteHop[];
  totalFeeUSD: number;
  estimatedSettlementTimeMs: number;
  complianceScore: number; // 0-100
  liquidityPassportId?: string;
  status: 'computed' | 'approved' | 'executing' | 'completed' | 'failed';
  computedAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface RouteHop {
  sequence: number;
  nodeId: NodeId;
  jurisdiction: JurisdictionCode;
  chain: ChainId;
  feeUSD: number;
  estimatedLatencyMs: number;
  complianceCheckRequired: boolean;
  compliancePassed?: boolean;
}

export interface LiquidityPassport {
  id: string;
  issuedTo: string; // operator or institution ID
  jurisdiction: JurisdictionCode;
  approvedJurisdictions: JurisdictionCode[];
  maxCapitalPerTransferUSD: number;
  maxDailyCapitalUSD: number;
  currentDailyUsageUSD: number;
  validFrom: Date;
  validUntil: Date;
  kycLevel: 'basic' | 'standard' | 'enhanced' | 'sovereign';
  amlApproved: boolean;
  sanctionsCleared: boolean;
  issuedAt: Date;
  revokedAt?: Date;
  status: 'active' | 'suspended' | 'expired' | 'revoked';
}

export interface CrossJurisdictionRoutingConfig {
  enableComplianceAwareRouting: boolean;
  enableLiquidityPassportValidation: boolean;
  maxRouteHops: number;
  routeComputationTimeoutMs: number;
  defaultRoutingStrategy: RoutingStrategy;
  minComplianceScoreForExecution: number; // 0-100
}

// ============================================================================
// Global Settlement Mesh Types
// ============================================================================

export interface SettlementTransaction {
  id: SettlementId;
  routeId: RouteId;
  settlementType: SettlementType;
  sourceNodeId: NodeId;
  destinationNodeId: NodeId;
  amount: number;
  currency: string;
  chain: ChainId;
  netAmount?: number; // After netting for net/deferred_net
  grossAmount: number;
  feesPaid: number;
  onChainTxHash?: string;
  finalityBlockNumber?: number;
  finalityConfirmations: number;
  requiredConfirmations: number;
  status: SettlementStatus;
  initiatedAt: Date;
  finalizedAt?: Date;
  failureReason?: string;
  metadata: Record<string, unknown>;
}

export interface SettlementNettingCycle {
  id: string;
  participatingNodes: NodeId[];
  grossTransactionCount: number;
  grossVolumeUSD: number;
  netTransactionCount: number;
  netVolumeUSD: number;
  nettingEfficiency: number; // % reduction from gross to net
  cycleStartAt: Date;
  cycleEndAt: Date;
  status: 'open' | 'netting' | 'settled' | 'failed';
}

export interface CrossChainFinalityRecord {
  id: string;
  transactionId: SettlementId;
  sourceChain: ChainId;
  destinationChain: ChainId;
  bridgeProtocol: string;
  sourceTxHash: string;
  destinationTxHash?: string;
  sourceConfirmations: number;
  destinationConfirmations: number;
  crossChainLatencyMs?: number;
  atomicSwapUsed: boolean;
  finalityStatus: 'pending_source' | 'pending_destination' | 'finalized' | 'contested';
  recordedAt: Date;
  finalizedAt?: Date;
}

export interface GlobalSettlementMeshConfig {
  enableAtomicCrossJurisdictionTransfers: boolean;
  enableNettingEngine: boolean;
  nettingCycleIntervalMs: number;
  requiredFinalityConfirmations: number;
  maxSettlementRetries: number;
  settlementTimeoutMs: number;
}

// ============================================================================
// AI Coordination Layer Types
// ============================================================================

export interface GlobalLiquidityBalance {
  id: string;
  timestamp: Date;
  totalNetworkLiquidityUSD: number;
  byNode: NodeLiquiditySnapshot[];
  byJurisdiction: JurisdictionLiquiditySnapshot[];
  byChain: ChainLiquiditySnapshot[];
  imbalanceScore: number; // 0-100, higher = more imbalance
  recommendedRebalanceActions: LiquidityRebalanceAction[];
  autoRebalanceTriggered: boolean;
}

export interface NodeLiquiditySnapshot {
  nodeId: NodeId;
  nodeName: string;
  availableLiquidityUSD: number;
  utilization: number; // 0-1
  liquidityGapUSD: number; // Positive = surplus, negative = deficit
}

export interface JurisdictionLiquiditySnapshot {
  jurisdiction: JurisdictionCode;
  totalLiquidityUSD: number;
  activeNodesCount: number;
  averageUtilization: number;
  liquidityStatus: 'abundant' | 'adequate' | 'tight' | 'scarce';
}

export interface ChainLiquiditySnapshot {
  chain: ChainId;
  totalLiquidityUSD: number;
  bridgeLiquidityUSD: number;
  nativeLiquidityUSD: number;
  utilizationRate: number;
}

export interface LiquidityRebalanceAction {
  actionId: string;
  fromNodeId: NodeId;
  toNodeId: NodeId;
  amountUSD: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedImprovementScore: number; // 0-100
  reason: string;
}

export interface RiskCluster {
  id: string;
  clusterType: RiskClusterType;
  affectedNodes: NodeId[];
  affectedJurisdictions: JurisdictionCode[];
  affectedChains: ChainId[];
  riskScore: number; // 0-100
  contagionProbability: number; // 0-1
  estimatedExposureUSD: number;
  detectedAt: Date;
  resolvedAt?: Date;
  mitigationActions: string[];
  status: 'active' | 'mitigating' | 'resolved' | 'escalated';
}

export interface CapitalReallocation {
  id: string;
  trigger: string;
  sourceNodes: NodeId[];
  destinationNodes: NodeId[];
  totalCapitalMovedUSD: number;
  reallocationReason: string;
  aiConfidenceScore: number; // 0-100
  expectedImpactScore: number; // 0-100
  requiresGovernanceApproval: boolean;
  approvedAt?: Date;
  executedAt?: Date;
  status: 'proposed' | 'approved' | 'executing' | 'completed' | 'cancelled';
}

export interface CrisisMitigationPlan {
  id: string;
  crisisTrigger: string;
  severity: 'moderate' | 'severe' | 'critical' | 'systemic';
  affectedNodes: NodeId[];
  estimatedImpactUSD: number;
  mitigationSteps: MitigationStep[];
  activatedAt: Date;
  resolvedAt?: Date;
  status: 'planning' | 'active' | 'resolved' | 'failed';
}

export interface MitigationStep {
  stepNumber: number;
  action: string;
  targetNodeIds: NodeId[];
  capitalInvolvedUSD: number;
  completedAt?: Date;
  outcome?: string;
}

export interface AICoordinationConfig {
  enableAutoLiquidityBalancing: boolean;
  enableRiskClusterDetection: boolean;
  enableAutoCapitalReallocation: boolean;
  enableCrisisMitigation: boolean;
  liquidityImbalanceThreshold: number; // 0-100 score threshold
  riskClusterAlertThreshold: number; // 0-100 risk score
  autoRebalanceMaxAmountUSD: number;
  coordinationCycleMs: number;
}

// ============================================================================
// Multi-Reserve Treasury Network Types
// ============================================================================

export interface RegionalReservePool {
  id: ReservePoolId;
  name: string;
  region: string;
  jurisdictions: JurisdictionCode[];
  participatingNodes: NodeId[];
  totalValueUSD: number;
  availableValueUSD: number;
  reservedValueUSD: number;
  assets: ReservePoolAsset[];
  targetAllocationUSD: number;
  minimumReserveRatio: number; // 0-1
  currentReserveRatio: number;
  lastRebalancedAt?: Date;
  nextReviewAt: Date;
  status: 'active' | 'rebalancing' | 'depleted' | 'suspended';
  createdAt: Date;
}

export interface ReservePoolAsset {
  assetId: string;
  assetName: string;
  assetClass: TreasuryAssetClass;
  chain: ChainId;
  amount: number;
  usdValue: number;
  targetPercent: number;
  currentPercent: number;
  yieldRate: number; // APY
  liquidityDepth: 'high' | 'medium' | 'low';
}

export interface MultiAssetTreasuryVault {
  id: TreasuryVaultId;
  name: string;
  vaultType: 'primary' | 'operational' | 'emergency' | 'yield';
  managingNodeIds: NodeId[];
  totalValueUSD: number;
  assets: TreasuryVaultAsset[];
  multisigThreshold: number; // N of M
  multisigParticipants: number; // M
  crossChainEnabled: boolean;
  supportedChains: ChainId[];
  rebalanceThresholdPercent: number;
  lastRebalancedAt?: Date;
  yieldEarned: number;
  createdAt: Date;
  status: 'active' | 'locked' | 'rebalancing' | 'emergency_locked';
}

export interface TreasuryVaultAsset {
  assetId: string;
  assetName: string;
  assetClass: TreasuryAssetClass;
  chain: ChainId;
  amount: number;
  usdValue: number;
  targetPercent: number;
  currentPercent: number;
  lockupDays: number; // 0 = liquid
  custodian?: string;
  proofOfReserveUrl?: string;
}

export interface CrossChainReserveTransfer {
  id: string;
  sourcePoolId: ReservePoolId;
  destinationPoolId: ReservePoolId;
  assetId: string;
  amountUSD: number;
  sourceChain: ChainId;
  destinationChain: ChainId;
  bridgeProtocol: string;
  transferFeeUSD: number;
  estimatedTimeMs: number;
  initiatedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
}

export interface MultiReserveTreasuryConfig {
  enableCrossChainReserveManagement: boolean;
  enableAutoRebalancing: boolean;
  rebalanceThresholdPercent: number;
  minimumReserveRatio: number; // 0-1
  maxSingleAssetPercent: number; // 0-1
  crossChainRebalanceCooldownMs: number;
}

// ============================================================================
// Global Stability Dashboard Types
// ============================================================================

export interface GlobalStabilitySnapshot {
  id: string;
  timestamp: Date;
  // Network health
  totalNetworkNodes: number;
  activeNodes: number;
  networkUptimePercent: number;
  // Exposure metrics
  totalGlobalExposureUSD: number;
  crossBorderExposureUSD: number;
  concentrationRiskScore: number; // 0-100
  // Capital allocation
  regionalCapitalAllocation: RegionalCapitalAllocation[];
  // Liquidity depth
  totalLiquidityUSD: number;
  liquidityDepthScore: number; // 0-100
  liquidityByJurisdiction: JurisdictionLiquidityMetric[];
  // Leverage and risk
  averageNetworkLeverage: number;
  maxNodeLeverage: number;
  leverageRiskScore: number; // 0-100
  // Stability index
  stabilityIndex: number; // 0-100
  stabilityIndicator: StabilityIndicator;
  riskFactors: StabilityRiskFactor[];
  generatedAt: Date;
}

export interface RegionalCapitalAllocation {
  region: string;
  jurisdictions: JurisdictionCode[];
  capitalAllocatedUSD: number;
  percentOfTotal: number;
  nodeCount: number;
  averageLeverageRatio: number;
  stabilityScore: number; // 0-100
}

export interface JurisdictionLiquidityMetric {
  jurisdiction: JurisdictionCode;
  totalLiquidityUSD: number;
  liquidityDepth: 'deep' | 'moderate' | 'shallow' | 'critical';
  utilizationPercent: number;
  netLiquidityFlowUSD: number; // Positive = net inflow, negative = outflow
}

export interface StabilityRiskFactor {
  factorName: string;
  category: 'liquidity' | 'concentration' | 'leverage' | 'geopolitical' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impactScore: number; // 0-100
  description: string;
  affectedJurisdictions: JurisdictionCode[];
}

export interface DashboardMetricHistory {
  metricName: string;
  dataPoints: MetricDataPoint[];
  trend: 'improving' | 'stable' | 'deteriorating';
  alertThreshold?: number;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

export interface GlobalStabilityDashboardConfig {
  enablePublicMetrics: boolean;
  snapshotIntervalMs: number;
  historyRetentionDays: number;
  alertOnStabilityBelow: number; // 0-100 stability index
  alertOnConcentrationAbove: number; // 0-100 risk score
  enableRealTimeUpdates: boolean;
}

// ============================================================================
// AGFN System-Level Types
// ============================================================================

export interface AGFNSystemStatus {
  // Node Architecture
  totalNodes: number;
  activeNodes: number;
  sovereignNodes: number;
  institutionalNodes: number;
  // Capital Routing
  activeRoutes: number;
  completedRoutes: number;
  activeLiquidityPassports: number;
  // Settlement Mesh
  pendingSettlements: number;
  finalizedSettlements: number;
  nettingEfficiency: number;
  // AI Coordination
  riskClustersDetected: number;
  activeRiskClusters: number;
  capitalReallocationsExecuted: number;
  activeCrisisMitigations: number;
  // Treasury Network
  totalReservePools: number;
  totalReserveValueUSD: number;
  totalTreasuryVaults: number;
  totalTreasuryValueUSD: number;
  // Stability
  stabilityIndex: number;
  stabilityIndicator: StabilityIndicator;
  totalLiquidityUSD: number;
  generatedAt: Date;
}

export interface AGFNConfig {
  globalNodeArchitecture?: Partial<GlobalNodeConfig>;
  crossJurisdictionRouting?: Partial<CrossJurisdictionRoutingConfig>;
  globalSettlementMesh?: Partial<GlobalSettlementMeshConfig>;
  aiCoordination?: Partial<AICoordinationConfig>;
  multiReserveTreasury?: Partial<MultiReserveTreasuryConfig>;
  globalStabilityDashboard?: Partial<GlobalStabilityDashboardConfig>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface AGFNEvent {
  id: string;
  type: AGFNEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type AGFNEventCallback = (event: AGFNEvent) => void;
