/**
 * Sovereign Digital Asset Coordination Layer (SDACL) — Types
 *
 * Comprehensive type definitions for the sovereign digital asset coordination
 * infrastructure on The Open Network (TON).
 *
 * SDACL Architecture — 5 Components:
 * Component 1: CBDC Integration Interface   — Issuer verification, supply validation, settlement routing
 * Component 2: Sovereign Treasury Bridge    — National treasury allocations, bond issuance, reserve visibility
 * Component 3: Cross-Sovereign Coordination — AI-assisted cross-border capital flows, liquidity balancing
 * Component 4: Jurisdiction Enforcement     — Geographic restrictions, participant eligibility, sanction routing
 * Component 5: Sovereign Transparency       — Exposure metrics, compliance reporting, observer/allocator modes
 */

// ============================================================================
// Core Identifiers
// ============================================================================

export type SovereignAssetId = string;
export type IssuerId = string;
export type JurisdictionCode = string;
export type ParticipantId = string;
export type SettlementId = string;
export type BridgeId = string;
export type CoordinationId = string;
export type EnforcementRuleId = string;
export type ReportId = string;

// ============================================================================
// SDACL Configuration
// ============================================================================

export interface SDACLConfig {
  networkId: string;
  environment: 'mainnet' | 'testnet' | 'sandbox';
  sanctionCheckEnabled?: boolean;
  crossBorderRoutingEnabled?: boolean;
  transparencyMode?: TransparencyMode;
  stabilityMonitoringEnabled?: boolean;
  multiChainEnabled?: boolean;
  complianceReportingEnabled?: boolean;
}

export const DEFAULT_SDACL_CONFIG: SDACLConfig = {
  networkId: 'ton-mainnet',
  environment: 'sandbox',
  sanctionCheckEnabled: true,
  crossBorderRoutingEnabled: true,
  transparencyMode: 'observer',
  stabilityMonitoringEnabled: true,
  multiChainEnabled: true,
  complianceReportingEnabled: true,
};

// ============================================================================
// Component 1: CBDC Integration Interface Types
// ============================================================================

export type SovereignAssetType =
  | 'cbdc'
  | 'sovereign_bond'
  | 'national_treasury'
  | 'state_backed_rwa'
  | 'reserve_asset';

export type AssetStatus = 'active' | 'suspended' | 'retired' | 'pending_activation';

export type SettlementStatus =
  | 'pending'
  | 'routing'
  | 'clearing'
  | 'settled'
  | 'failed'
  | 'rejected';

export interface SovereignAsset {
  id: SovereignAssetId;
  issuerId: IssuerId;
  issuerName: string;
  assetType: SovereignAssetType;
  symbol: string;
  name: string;
  jurisdictionCode: JurisdictionCode;
  totalSupply: number;
  circulatingSupply: number;
  reserveRatio: number;
  status: AssetStatus;
  chainId: string;
  settlementChains: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssuerVerificationResult {
  issuerId: IssuerId;
  verified: boolean;
  issuerType: 'central_bank' | 'treasury' | 'sovereign_fund' | 'state_entity';
  jurisdictionCode: JurisdictionCode;
  creditRating?: string;
  baisScorecard?: number;
  verifiedAt: Date;
  reason?: string;
}

export interface SupplyValidationResult {
  assetId: SovereignAssetId;
  valid: boolean;
  reportedSupply: number;
  verifiedSupply: number;
  reserveRatio: number;
  reserveAdequate: boolean;
  validatedAt: Date;
  reason?: string;
}

export interface SettlementRoute {
  id: SettlementId;
  assetId: SovereignAssetId;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  amount: number;
  routingPath: string[];
  estimatedFeeBps: number;
  estimatedSettlementMs: number;
  complianceChecked: boolean;
  status: SettlementStatus;
  createdAt: Date;
  settledAt?: Date;
}

export interface AuthorityReport {
  id: ReportId;
  assetId: SovereignAssetId;
  reportingIssuerId: IssuerId;
  reportType: 'daily_position' | 'settlement_summary' | 'compliance_audit' | 'reserve_attestation';
  period: { from: Date; to: Date };
  totalSettlements: number;
  totalVolumeUsd: number;
  crossBorderVolume: number;
  complianceViolations: number;
  generatedAt: Date;
}

export interface CBDCIntegrationStatus {
  totalSovereignAssets: number;
  activeSovereignAssets: number;
  verifiedIssuers: number;
  pendingSettlements: number;
  settledVolumeUsd: number;
  totalReportsGenerated: number;
}

// ============================================================================
// Component 2: Sovereign Treasury Bridge Types
// ============================================================================

export type TreasuryAllocationStatus = 'pending' | 'active' | 'redeemed' | 'cancelled';

export type BondStatus = 'draft' | 'issued' | 'trading' | 'matured' | 'defaulted';

export interface TreasuryAllocation {
  id: BridgeId;
  sovereignFundId: IssuerId;
  sovereignFundName: string;
  jurisdictionCode: JurisdictionCode;
  allocationAmountUsd: number;
  allocationCurrency: string;
  targetAssetId: SovereignAssetId;
  status: TreasuryAllocationStatus;
  privacyLevel: 'public' | 'private' | 'confidential';
  reserveVisible: boolean;
  createdAt: Date;
  activatedAt?: Date;
  maturityDate?: Date;
}

export interface SovereignBond {
  id: string;
  issuerId: IssuerId;
  issuerJurisdiction: JurisdictionCode;
  name: string;
  symbol: string;
  faceValueUsd: number;
  couponRatePercent: number;
  maturityDate: Date;
  issueDate: Date;
  totalIssuance: number;
  outstandingAmount: number;
  creditRating: string;
  status: BondStatus;
  chainId: string;
  liquidityPoolId?: string;
  clearingLayerRef?: string;
}

export interface ReserveSnapshot {
  assetId: SovereignAssetId;
  jurisdictionCode: JurisdictionCode;
  totalReserveUsd: number;
  goldReserveUsd: number;
  foreignCurrencyReserveUsd: number;
  digitalAssetReserveUsd: number;
  reserveRatio: number;
  visibility: 'public' | 'restricted' | 'confidential';
  snapshotAt: Date;
}

export interface SovereignTreasuryBridgeStatus {
  totalAllocations: number;
  activeAllocations: number;
  totalAllocatedUsd: number;
  issuedBonds: number;
  totalBondValueUsd: number;
  reserveSnapshotsAvailable: number;
}

// ============================================================================
// Component 3: Cross-Sovereign Coordination Types
// ============================================================================

export type FlowType = 'capital_transfer' | 'settlement' | 'liquidity_swap' | 'reserve_rebalance';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CrossBorderFlow {
  id: CoordinationId;
  flowType: FlowType;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  assetId: SovereignAssetId;
  amountUsd: number;
  riskScore: number;
  riskLevel: RiskLevel;
  aiRecommendation: string;
  complianceVerified: boolean;
  systemicRiskChecked: boolean;
  stabilityIndexImpact: number;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'blocked';
  createdAt: Date;
  completedAt?: Date;
}

export interface LiquidityBalance {
  jurisdictionCode: JurisdictionCode;
  availableLiquidityUsd: number;
  requiredLiquidityUsd: number;
  liquidityRatio: number;
  imbalanceUsd: number;
  rebalancingRecommended: boolean;
  aiSuggestedAction?: string;
}

export interface CoordinationSession {
  id: string;
  participatingJurisdictions: JurisdictionCode[];
  sessionType: 'bilateral' | 'multilateral' | 'emergency';
  objective: string;
  status: 'active' | 'concluded' | 'suspended';
  stabilityIndexBefore: number;
  stabilityIndexAfter?: number;
  startedAt: Date;
  concludedAt?: Date;
}

export interface CrossSovereignCoordinationStatus {
  activeFlows: number;
  completedFlows: number;
  totalCoordinatedVolumeUsd: number;
  activeSessions: number;
  jurisdictionsMonitored: number;
  averageRiskScore: number;
  systemicSpilloverEvents: number;
}

// ============================================================================
// Component 4: Jurisdiction Enforcement Types
// ============================================================================

export type RestrictionType =
  | 'geographic'
  | 'participant_eligibility'
  | 'asset_isolation'
  | 'sanction'
  | 'volume_limit'
  | 'kyc_threshold';

export type EnforcementAction = 'block' | 'flag' | 'require_approval' | 'limit' | 'report';

export interface JurisdictionRule {
  id: EnforcementRuleId;
  jurisdictionCode: JurisdictionCode;
  restrictionType: RestrictionType;
  description: string;
  targetAssets: SovereignAssetId[] | '*';
  targetParticipants?: ParticipantId[] | '*';
  enforcementAction: EnforcementAction;
  volumeLimitUsd?: number;
  kycThreshold?: number;
  sanctionListRef?: string;
  enabled: boolean;
  optIn: boolean;
  createdAt: Date;
}

export interface ParticipantEligibility {
  participantId: ParticipantId;
  jurisdictionCode: JurisdictionCode;
  eligible: boolean;
  kycLevel: 'none' | 'basic' | 'enhanced' | 'institutional';
  sanctionChecked: boolean;
  sanctionClear: boolean;
  restrictedAssets: SovereignAssetId[];
  eligibilityCheckedAt: Date;
  reason?: string;
}

export interface EnforcementEvent {
  id: string;
  ruleId: EnforcementRuleId;
  participantId?: ParticipantId;
  assetId?: SovereignAssetId;
  jurisdictionCode: JurisdictionCode;
  action: EnforcementAction;
  triggered: boolean;
  details: string;
  timestamp: Date;
}

export interface JurisdictionEnforcementStatus {
  totalRules: number;
  activeRules: number;
  enforcementEventsToday: number;
  participantsChecked: number;
  blockedTransactions: number;
  flaggedTransactions: number;
}

// ============================================================================
// Component 5: Sovereign Transparency Dashboard Types
// ============================================================================

export type TransparencyMode = 'observer' | 'allocator' | 'strategic_partner';

export interface ExposureMetric {
  jurisdictionCode: JurisdictionCode;
  assetId: SovereignAssetId;
  exposureUsd: number;
  exposurePercent: number;
  concentrationRisk: RiskLevel;
  liquidityDepthUsd: number;
  riskIndex: number;
  lastUpdated: Date;
}

export interface ComplianceReport {
  id: ReportId;
  reportingPeriod: { from: Date; to: Date };
  jurisdictionCode: JurisdictionCode;
  totalTransactions: number;
  compliantTransactions: number;
  flaggedTransactions: number;
  blockedTransactions: number;
  complianceRate: number;
  enforcementActions: number;
  generatedAt: Date;
}

export interface DashboardSnapshot {
  mode: TransparencyMode;
  generatedAt: Date;
  totalExposureUsd: number;
  totalLiquidityDepthUsd: number;
  overallRiskIndex: number;
  stabilityScore: number;
  activeJurisdictions: number;
  complianceRate: number;
  exposureMetrics: ExposureMetric[];
  recentAlerts: DashboardAlert[];
}

export interface DashboardAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'risk' | 'compliance' | 'liquidity' | 'systemic';
  message: string;
  jurisdictionCode?: JurisdictionCode;
  assetId?: SovereignAssetId;
  timestamp: Date;
  acknowledged: boolean;
}

export interface SovereignTransparencyStatus {
  totalExposureMetrics: number;
  totalComplianceReports: number;
  unresolvedAlerts: number;
  criticalAlerts: number;
  currentMode: TransparencyMode;
  lastSnapshotAt?: Date;
}

// ============================================================================
// SDACL System-Level Types
// ============================================================================

export interface SDACLSystemStatus {
  component1CbdcIntegration: CBDCIntegrationStatus;
  component2TreasuryBridge: SovereignTreasuryBridgeStatus;
  component3CrossSovereignCoordination: CrossSovereignCoordinationStatus;
  component4JurisdictionEnforcement: JurisdictionEnforcementStatus;
  component5SovereignTransparency: SovereignTransparencyStatus;
  totalSovereignAssetsUsd: number;
  systemStabilityIndex: number;
  generatedAt: Date;
}

// ============================================================================
// SDACL Events
// ============================================================================

export type SDACLEventType =
  | 'sovereign_asset_registered'
  | 'issuer_verified'
  | 'supply_validated'
  | 'settlement_routed'
  | 'settlement_completed'
  | 'authority_report_generated'
  | 'treasury_allocation_created'
  | 'bond_issued'
  | 'cross_border_flow_initiated'
  | 'cross_border_flow_completed'
  | 'enforcement_triggered'
  | 'participant_eligibility_checked'
  | 'compliance_report_generated'
  | 'dashboard_alert_raised'
  | 'stability_warning';

export interface SDACLEvent {
  type: SDACLEventType;
  component: 1 | 2 | 3 | 4 | 5;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type SDACLEventCallback = (event: SDACLEvent) => void;
