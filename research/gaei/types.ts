/**
 * TONAIAgent - Global Autonomous Economic Infrastructure (GAEI)
 *
 * Core type definitions for the Global Autonomous Economic Infrastructure,
 * expanding from financial infrastructure to economic infrastructure.
 * A distributed, AI-coordinated economic layer that:
 * - Manages capital flows
 * - Coordinates digital assets
 * - Supports sovereign systems
 * - Enables AI-driven production & allocation
 * - Operates across jurisdictions
 * - Integrates financial and real economy layers
 *
 * Architecture:
 * Real Economy Assets → Sovereign & Institutional Nodes → Financial OS (AIFOS)
 * → AI Orchestration Engine → Liquidity / Clearing / Treasury → AGFN
 *
 * Six Core Infrastructure Domains:
 * 1. Capital Coordination Layer - Macro-level capital allocation modeling
 * 2. Real Economy Integration Layer - Tokenized RWA, commodity-backed assets
 * 3. AI Economic Orchestration Engine - Macro stress simulations, risk modeling
 * 4. Multi-Layer Monetary Coordination - Protocol token economy, sovereign assets
 * 5. Global Economic Node Architecture - Sovereign, institutional, trade-finance nodes
 * 6. Global Economic Stability Dashboard - Capital distribution, risk exposure
 */

// ============================================================================
// Base Types & Identifiers
// ============================================================================

export const GAEI_VERSION = '1.0.0';

export type GAEIId = string;
export type EconomicNodeId = string;
export type CapitalFlowId = string;
export type RWAAssetId = string;
export type CommodityId = string;
export type TradeFinanceId = string;
export type JurisdictionCode = string;

// ============================================================================
// Enumerations
// ============================================================================

export type EconomicNodeType =
  | 'sovereign_node'
  | 'institutional_capital_node'
  | 'trade_finance_node'
  | 'commodity_backed_node'
  | 'ai_treasury_node'
  | 'central_bank_node'
  | 'infrastructure_finance_node'
  | 'production_node'
  | 'supply_chain_node';

export type RealEconomyAssetType =
  | 'tokenized_rwa'
  | 'commodity_backed'
  | 'infrastructure_bond'
  | 'trade_receivable'
  | 'production_facility'
  | 'supply_chain_inventory'
  | 'agricultural_commodity'
  | 'energy_asset'
  | 'real_estate'
  | 'industrial_equipment';

export type CapitalFlowType =
  | 'macro_allocation'
  | 'cross_border_settlement'
  | 'trade_finance_flow'
  | 'infrastructure_investment'
  | 'commodity_trade'
  | 'sovereign_transfer'
  | 'production_financing'
  | 'supply_chain_liquidity';

export type MonetaryLayerType =
  | 'protocol_token_economy'
  | 'sovereign_digital_asset'
  | 'treasury_reserve'
  | 'yield_backed_instrument'
  | 'cross_chain_basket';

export type StressScenarioType =
  | 'global_credit_crunch'
  | 'commodity_shock'
  | 'supply_chain_disruption'
  | 'sovereign_default'
  | 'currency_crisis'
  | 'trade_war'
  | 'energy_crisis'
  | 'pandemic_impact'
  | 'geopolitical_conflict'
  | 'climate_disaster';

export type RiskMitigationType =
  | 'liquidity_injection'
  | 'capital_buffer_deployment'
  | 'treasury_reallocation'
  | 'cross_border_stabilization'
  | 'supply_chain_rerouting'
  | 'commodity_hedge'
  | 'sovereign_support';

export type EconomicStabilityLevel =
  | 'stable'
  | 'resilient'
  | 'moderate'
  | 'stressed'
  | 'critical'
  | 'systemic_crisis';

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

export type GAEIEventType =
  | 'capital_flow_initiated'
  | 'capital_flow_completed'
  | 'node_registered'
  | 'node_updated'
  | 'rwa_tokenized'
  | 'commodity_trade_executed'
  | 'stress_simulation_started'
  | 'stress_simulation_completed'
  | 'risk_mitigation_triggered'
  | 'monetary_coordination_action'
  | 'stability_alert'
  | 'stability_resolved'
  | 'sovereign_integration'
  | 'trade_finance_settlement'
  | 'infrastructure_financing';

// ============================================================================
// 1. Capital Coordination Layer Types
// ============================================================================

export interface GlobalCapitalAllocation {
  id: CapitalFlowId;
  sourceNodeId: EconomicNodeId;
  destinationNodeId: EconomicNodeId;
  flowType: CapitalFlowType;
  amount: number;
  currency: string;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  allocationPurpose: string;
  efficiencyScore: number; // 0-100
  riskAdjustedReturn: number;
  status: 'pending' | 'routing' | 'settled' | 'failed' | 'cancelled';
  aiOptimized: boolean;
  routingPath: string[];
  estimatedSettlementTime: number; // Minutes
  actualSettlementTime?: number;
  initiatedAt: Date;
  settledAt?: Date;
  metadata: Record<string, unknown>;
}

export interface MacroCapitalModel {
  id: string;
  name: string;
  totalCapitalManaged: number;
  capitalByRegion: RegionalCapitalDistribution[];
  capitalBySector: SectorCapitalDistribution[];
  allocationEfficiencyIndex: number; // 0-100
  crossBorderFlowVolume: number;
  averageSettlementTime: number;
  capitalVelocity: number;
  utilizationRate: number;
  lastOptimizedAt: Date;
  nextOptimizationAt: Date;
}

export interface RegionalCapitalDistribution {
  region: string;
  jurisdictions: JurisdictionCode[];
  totalCapital: number;
  percentOfGlobal: number;
  netFlowDirection: 'inflow' | 'outflow' | 'balanced';
  averageYield: number;
  riskScore: number;
}

export interface SectorCapitalDistribution {
  sector: string;
  totalCapital: number;
  percentOfGlobal: number;
  growthRate: number;
  riskAdjustedReturn: number;
  liquidityScore: number;
}

export interface CapitalRoutingOptimization {
  routeId: string;
  sourceNodeId: EconomicNodeId;
  destinationNodeId: EconomicNodeId;
  amount: number;
  optimalPath: string[];
  alternativePaths: string[][];
  estimatedCost: number;
  estimatedTime: number;
  efficiencyGain: number; // % improvement over default
  riskFactors: string[];
  computedAt: Date;
}

export interface CapitalCoordinationLayerConfig {
  enableMacroModeling: boolean;
  enableAIOptimization: boolean;
  maxCrossBorderSettlementMinutes: number;
  minAllocationEfficiencyScore: number;
  capitalVelocityTarget: number;
  reoptimizationFrequency: 'hourly' | 'daily' | 'weekly';
}

// ============================================================================
// 2. Real Economy Integration Layer Types
// ============================================================================

export interface RealEconomyAsset {
  id: RWAAssetId;
  name: string;
  assetType: RealEconomyAssetType;
  underlyingValue: number;
  tokenizedValue: number;
  tokenContract?: string;
  chain?: ChainId;
  custodian: string;
  jurisdiction: JurisdictionCode;
  yieldRate: number;
  liquidityScore: number; // 0-100
  maturityDate?: Date;
  collateralizationRatio: number;
  verificationStatus: 'pending' | 'verified' | 'audited' | 'expired';
  lastVerifiedAt?: Date;
  proofOfReserveUrl?: string;
  metadata: Record<string, unknown>;
}

export interface CommodityBackedAsset {
  id: CommodityId;
  commodityType: 'gold' | 'silver' | 'oil' | 'gas' | 'agricultural' | 'metals' | 'energy';
  commodityName: string;
  underlyingQuantity: number;
  unit: string;
  spotPrice: number;
  tokenizedUnits: number;
  tokenContract?: string;
  chain?: ChainId;
  storageLocation: string;
  custodian: string;
  verificationFrequency: 'daily' | 'weekly' | 'monthly';
  lastVerifiedAt: Date;
  deliverySupported: boolean;
  settlementCurrency: string;
}

export interface TradeFinanceInstrument {
  id: TradeFinanceId;
  instrumentType: 'letter_of_credit' | 'trade_receivable' | 'invoice_finance' | 'supply_chain_finance' | 'export_credit';
  principalAmount: number;
  currency: string;
  issuer: string;
  beneficiary: string;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  maturityDate: Date;
  interestRate: number;
  collateral?: string;
  insuranceCoverage: number;
  tokenized: boolean;
  tokenContract?: string;
  chain?: ChainId;
  status: 'draft' | 'issued' | 'active' | 'settled' | 'defaulted';
  createdAt: Date;
}

export interface InfrastructureFinancing {
  id: string;
  projectName: string;
  projectType: 'transport' | 'energy' | 'telecommunications' | 'water' | 'social' | 'digital';
  totalInvestment: number;
  financedAmount: number;
  jurisdiction: JurisdictionCode;
  expectedReturn: number;
  projectDurationYears: number;
  riskRating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
  tokenized: boolean;
  tokenContract?: string;
  chain?: ChainId;
  investors: string[];
  status: 'planning' | 'financing' | 'construction' | 'operational' | 'completed';
  createdAt: Date;
}

export interface SupplyChainLiquidity {
  id: string;
  supplyChainId: string;
  participants: string[];
  totalFinanced: number;
  outstandingAmount: number;
  averagePaymentTerm: number; // Days
  defaultRate: number;
  liquidityPool?: string;
  chain?: ChainId;
  status: 'active' | 'paused' | 'closed';
}

export interface RealEconomyIntegrationConfig {
  enableRWATokenization: boolean;
  enableCommodityBacking: boolean;
  enableTradeFinance: boolean;
  enableInfrastructureFinancing: boolean;
  enableSupplyChainLiquidity: boolean;
  minCollateralizationRatio: number;
  verificationFrequency: 'daily' | 'weekly' | 'monthly';
}

// ============================================================================
// 3. AI Economic Orchestration Engine Types
// ============================================================================

export interface MacroStressSimulation {
  id: string;
  scenarioName: string;
  scenarioType: StressScenarioType;
  shockMagnitude: number; // % impact
  duration: number; // Days
  affectedRegions: JurisdictionCode[];
  affectedSectors: string[];
  affectedNodes: EconomicNodeId[];
  capitalImpact: number;
  liquidityImpact: number;
  supplyChainImpact: number;
  tradeFlowImpact: number;
  contagionProbability: number; // 0-1
  recoveryTimeEstimate: number; // Days
  mitigationRecommendations: RiskMitigationAction[];
  simulatedAt: Date;
  status: 'running' | 'completed' | 'failed';
}

export interface LiquidityRebalancingAction {
  id: string;
  sourceNodeId: EconomicNodeId;
  targetNodeId: EconomicNodeId;
  amount: number;
  currency: string;
  trigger: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  expectedImpact: number; // % improvement
  status: 'proposed' | 'approved' | 'executing' | 'completed' | 'cancelled';
  aiConfidenceScore: number; // 0-100
  proposedAt: Date;
  executedAt?: Date;
}

export interface CapitalBufferManagement {
  id: string;
  nodeId: EconomicNodeId;
  currentBuffer: number;
  targetBuffer: number;
  minBuffer: number;
  maxBuffer: number;
  utilizationRate: number;
  replenishmentRate: number;
  drawdownHistory: BufferDrawdown[];
  lastAdjustedAt: Date;
  nextReviewAt: Date;
}

export interface BufferDrawdown {
  timestamp: Date;
  amount: number;
  reason: string;
  replenishedAt?: Date;
}

export interface RiskContagionModel {
  id: string;
  sourceNode: EconomicNodeId;
  affectedNodes: ContagionPath[];
  totalExposure: number;
  propagationSpeed: number; // % per hour
  systemicRiskScore: number; // 0-100
  circuitBreakerTriggered: boolean;
  modeledAt: Date;
}

export interface ContagionPath {
  nodeId: EconomicNodeId;
  exposureAmount: number;
  exposurePercentage: number;
  timeToImpact: number; // Hours
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface TreasuryReserveAdjustment {
  id: string;
  adjustmentType: 'increase' | 'decrease' | 'reallocation';
  sourceReserve?: string;
  targetReserve?: string;
  amount: number;
  currency: string;
  trigger: string;
  aiRecommended: boolean;
  governanceApproved: boolean;
  expectedOutcome: string;
  status: 'proposed' | 'approved' | 'executing' | 'completed' | 'rejected';
  proposedAt: Date;
  executedAt?: Date;
}

export interface RiskMitigationAction {
  id: string;
  actionType: RiskMitigationType;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  estimatedCost: number;
  estimatedEffectiveness: number; // 0-100
  affectedNodes: EconomicNodeId[];
  autoExecute: boolean;
  requiresGovernance: boolean;
  status: 'proposed' | 'approved' | 'executing' | 'completed' | 'failed';
  proposedAt: Date;
  executedAt?: Date;
}

export interface AIOrchestrationConfig {
  enableMacroSimulations: boolean;
  enableLiquidityRebalancing: boolean;
  enableCapitalBufferManagement: boolean;
  enableContagionModeling: boolean;
  enableAutoMitigation: boolean;
  simulationFrequency: 'hourly' | 'daily' | 'weekly';
  riskThreshold: number; // 0-100
  aiConfidenceMinimum: number; // 0-100
}

// ============================================================================
// 4. Multi-Layer Monetary Coordination Types
// ============================================================================

export interface MonetaryLayer {
  id: string;
  layerType: MonetaryLayerType;
  name: string;
  totalSupply: number;
  circulatingSupply: number;
  reserveBacking: number;
  collateralizationRatio: number;
  inflationRate: number;
  deflationMechanism?: string;
  yieldRate: number;
  stabilityMechanism: string;
  chains: ChainId[];
  governanceModel: 'dao' | 'council' | 'hybrid' | 'sovereign';
  status: 'active' | 'paused' | 'deprecated';
  createdAt: Date;
}

export interface ProtocolTokenEconomy {
  tokenAddress: string;
  chain: ChainId;
  totalSupply: number;
  circulatingSupply: number;
  stakedSupply: number;
  treasuryHoldings: number;
  emissionRate: number;
  burnRate: number;
  inflationTarget: number;
  currentInflation: number;
  velocityMetric: number;
  utilityDemand: number;
  governanceWeight: number;
}

export interface SovereignDigitalAsset {
  id: string;
  name: string;
  symbol: string;
  issuingAuthority: string;
  jurisdiction: JurisdictionCode;
  totalSupply: number;
  reserves: SovereignReserve[];
  peggingMechanism: 'fiat_peg' | 'basket_peg' | 'algorithmic' | 'collateralized';
  pegTarget: string;
  pegDeviation: number; // %
  crossBorderEnabled: boolean;
  interoperableChains: ChainId[];
  status: 'pilot' | 'active' | 'restricted';
}

export interface SovereignReserve {
  assetType: string;
  amount: number;
  percentOfTotal: number;
  custodian: string;
  verifiedAt: Date;
}

export interface TreasuryReserveLayer {
  id: string;
  name: string;
  totalValue: number;
  composition: TreasuryAsset[];
  targetAllocation: TreasuryAllocationTarget[];
  rebalanceThreshold: number; // %
  stabilityScore: number; // 0-100
  liquidityScore: number; // 0-100
  yieldGeneration: number;
  lastRebalancedAt: Date;
  nextReviewAt: Date;
}

export interface TreasuryAsset {
  assetId: string;
  assetName: string;
  assetType: string;
  amount: number;
  value: number;
  percentOfTotal: number;
  yieldRate: number;
  liquidityClass: 'instant' | 'same_day' | 'multi_day' | 'locked';
}

export interface TreasuryAllocationTarget {
  category: string;
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
  currentPercent: number;
}

export interface YieldBackedInstrument {
  id: string;
  name: string;
  principalAmount: number;
  yieldSource: string;
  yieldRate: number;
  maturityDate?: Date;
  collateral: string;
  collateralRatio: number;
  tokenContract?: string;
  chain?: ChainId;
  status: 'active' | 'maturing' | 'matured' | 'defaulted';
}

export interface CrossChainAssetBasket {
  id: string;
  name: string;
  totalValue: number;
  assets: BasketAsset[];
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  managementFee: number;
  chains: ChainId[];
  tokenContract: string;
  primaryChain: ChainId;
  status: 'active' | 'rebalancing' | 'closed';
}

export interface BasketAsset {
  assetId: string;
  chain: ChainId;
  weight: number;
  targetWeight: number;
  value: number;
}

export interface MonetaryCoordinationConfig {
  enableProtocolTokenEconomy: boolean;
  enableSovereignDigitalAssets: boolean;
  enableTreasuryReserves: boolean;
  enableYieldBackedInstruments: boolean;
  enableCrossChainBaskets: boolean;
  inflationTarget: number;
  stabilityThreshold: number;
}

// ============================================================================
// 5. Global Economic Node Architecture Types
// ============================================================================

export interface EconomicNode {
  id: EconomicNodeId;
  name: string;
  nodeType: EconomicNodeType;
  jurisdiction: JurisdictionCode;
  parentNetwork: string; // AIFOS or AGFN reference
  capitalManaged: number;
  capitalDeployed: number;
  capitalAvailable: number;
  connections: NodeConnection[];
  capabilities: NodeCapability[];
  riskProfile: NodeRiskProfile;
  complianceStatus: 'compliant' | 'pending_review' | 'restricted' | 'suspended';
  operationalStatus: 'active' | 'limited' | 'maintenance' | 'offline';
  registeredAt: Date;
  lastActivityAt: Date;
  metadata: Record<string, unknown>;
}

export interface NodeConnection {
  targetNodeId: EconomicNodeId;
  connectionType: 'capital_flow' | 'data_sync' | 'governance' | 'liquidity' | 'trade';
  bandwidth: number; // Volume capacity
  latency: number; // Ms
  status: 'active' | 'degraded' | 'offline';
}

export interface NodeCapability {
  capability: string;
  enabled: boolean;
  limits?: Record<string, number>;
}

export interface NodeRiskProfile {
  creditRisk: number; // 0-100
  liquidityRisk: number; // 0-100
  operationalRisk: number; // 0-100
  complianceRisk: number; // 0-100
  counterpartyRisk: number; // 0-100
  overallRiskScore: number; // 0-100
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  lastAssessedAt: Date;
}

export interface SovereignNode extends EconomicNode {
  nodeType: 'sovereign_node';
  sovereignType: 'central_bank' | 'treasury' | 'sovereign_fund' | 'government_agency';
  countryCode: string;
  regulatoryAuthority: string;
  reserveHoldings: number;
  monetaryPolicyRole: string;
  crossBorderAgreements: string[];
}

export interface InstitutionalCapitalNode extends EconomicNode {
  nodeType: 'institutional_capital_node';
  institutionType: 'pension_fund' | 'insurance' | 'endowment' | 'hedge_fund' | 'family_office';
  aum: number;
  investmentMandate: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  redemptionTerms: string;
}

export interface TradeFinanceNode extends EconomicNode {
  nodeType: 'trade_finance_node';
  tradeRoutes: string[];
  financedVolume: number;
  defaultRate: number;
  insuranceCoverage: number;
  partnerBanks: string[];
}

export interface CommodityBackedNode extends EconomicNode {
  nodeType: 'commodity_backed_node';
  commodityTypes: string[];
  totalReserves: number;
  storageLocations: string[];
  verificationPartner: string;
  deliveryNetwork: string[];
}

export interface AITreasuryNode extends EconomicNode {
  nodeType: 'ai_treasury_node';
  aiModel: string;
  autonomyLevel: 'advisory' | 'semi_autonomous' | 'fully_autonomous';
  governanceBounds: Record<string, number>;
  performanceMetrics: AIPerformanceMetrics;
}

export interface AIPerformanceMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  annualizedReturn: number;
  riskAdjustedReturn: number;
  decisionAccuracy: number;
  responseTime: number;
}

export interface NodeArchitectureConfig {
  enableSovereignNodes: boolean;
  enableInstitutionalNodes: boolean;
  enableTradeFinanceNodes: boolean;
  enableCommodityNodes: boolean;
  enableAITreasuryNodes: boolean;
  maxNodesPerNetwork: number;
  minCapitalPerNode: number;
}

// ============================================================================
// 6. Global Economic Stability Dashboard Types
// ============================================================================

export interface GlobalEconomicStabilityDashboard {
  generatedAt: Date;
  overallStabilityScore: number; // 0-100
  stabilityLevel: EconomicStabilityLevel;
  capitalDistribution: GlobalCapitalDistribution;
  crossBorderLiquidity: CrossBorderLiquidityMetrics;
  riskExposure: GlobalRiskExposure;
  leverageConcentration: LeverageConcentrationMetrics;
  treasuryReserveRatios: TreasuryReserveRatioMetrics;
  alerts: StabilityAlert[];
  trends: StabilityTrend[];
}

export interface GlobalCapitalDistribution {
  totalCapital: number;
  byRegion: RegionalDistribution[];
  bySector: SectorDistribution[];
  byNodeType: NodeTypeDistribution[];
  concentrationIndex: number; // Herfindahl-Hirschman Index
  diversificationScore: number;
}

export interface RegionalDistribution {
  region: string;
  amount: number;
  percentage: number;
  changePercent24h: number;
}

export interface SectorDistribution {
  sector: string;
  amount: number;
  percentage: number;
  changePercent24h: number;
}

export interface NodeTypeDistribution {
  nodeType: EconomicNodeType;
  count: number;
  totalCapital: number;
  percentage: number;
}

export interface CrossBorderLiquidityMetrics {
  totalCrossBorderFlow24h: number;
  totalCrossBorderFlow7d: number;
  topCorridors: LiquidityCorridor[];
  settlementEfficiency: number;
  averageSettlementTime: number;
  failedSettlements24h: number;
}

export interface LiquidityCorridor {
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  volume24h: number;
  averageLatency: number;
  utilizationRate: number;
}

export interface GlobalRiskExposure {
  totalExposure: number;
  creditExposure: number;
  marketExposure: number;
  operationalExposure: number;
  liquidityExposure: number;
  counterpartyExposure: number;
  concentrationRisk: number;
  systemicRiskScore: number;
  topRiskFactors: RiskFactor[];
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  exposure: number;
  mitigationStatus: 'unmitigated' | 'partial' | 'mitigated';
}

export interface LeverageConcentrationMetrics {
  systemWideLeverage: number;
  maxNodeLeverage: number;
  averageLeverage: number;
  leverageDistribution: LeverageBucket[];
  overleveragedNodes: number;
  deleveragingPressure: number;
}

export interface LeverageBucket {
  range: string; // e.g., "1x-2x", "2x-5x"
  nodeCount: number;
  capitalAmount: number;
}

export interface TreasuryReserveRatioMetrics {
  globalReserveRatio: number;
  minReserveRatio: number;
  maxReserveRatio: number;
  averageReserveRatio: number;
  underReservedNodes: number;
  totalReserves: number;
  reserveCoverage: number;
}

export interface StabilityAlert {
  id: string;
  alertType: 'warning' | 'critical' | 'emergency';
  category: string;
  message: string;
  affectedNodes: EconomicNodeId[];
  affectedJurisdictions: JurisdictionCode[];
  recommendedActions: string[];
  triggeredAt: Date;
  resolvedAt?: Date;
}

export interface StabilityTrend {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  direction: 'improving' | 'stable' | 'deteriorating';
  forecast: string;
}

export interface StabilityDashboardConfig {
  refreshInterval: number; // Seconds
  alertThresholds: AlertThreshold[];
  publicViewEnabled: boolean;
  institutionalViewEnabled: boolean;
  granularity: 'realtime' | 'hourly' | 'daily';
}

export interface AlertThreshold {
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  emergencyThreshold: number;
}

// ============================================================================
// GAEI System-Level Types
// ============================================================================

export interface GAEISystemStatus {
  version: string;
  // Capital Coordination
  totalCapitalManaged: number;
  activeCapitalFlows: number;
  capitalAllocationEfficiency: number;
  // Real Economy
  totalRWATokenized: number;
  activeCommodityAssets: number;
  tradeFinanceVolume: number;
  infrastructureFinanced: number;
  // AI Orchestration
  activeStressSimulations: number;
  riskMitigationActions: number;
  aiOrchestrationHealth: number;
  // Monetary Coordination
  monetaryLayersActive: number;
  totalMonetarySupply: number;
  stabilityScore: number;
  // Node Architecture
  totalEconomicNodes: number;
  activeNodes: number;
  nodesByType: Record<EconomicNodeType, number>;
  // Stability Dashboard
  globalStabilityScore: number;
  stabilityLevel: EconomicStabilityLevel;
  activeAlerts: number;
  generatedAt: Date;
}

export interface GAEIConfig {
  capitalCoordination?: Partial<CapitalCoordinationLayerConfig>;
  realEconomyIntegration?: Partial<RealEconomyIntegrationConfig>;
  aiOrchestration?: Partial<AIOrchestrationConfig>;
  monetaryCoordination?: Partial<MonetaryCoordinationConfig>;
  nodeArchitecture?: Partial<NodeArchitectureConfig>;
  stabilityDashboard?: Partial<StabilityDashboardConfig>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface GAEIEvent {
  id: string;
  type: GAEIEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type GAEIEventCallback = (event: GAEIEvent) => void;
