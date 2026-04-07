/**
 * Research Domain Exports
 *
 * Advanced research modules: ACMS, AGFI, GRIF, AIFOS, SDACL, AGFN.
 * These are cutting-edge, non-production research modules.
 * Import directly via subpath for tree-shaking:
 *   import { ... } from '@tonaiagent/core/acms'
 *   import { ... } from '@tonaiagent/core/agfi'
 *   import { ... } from '@tonaiagent/core/grif'
 *   import { ... } from '@tonaiagent/core/aifos'
 *   import { ... } from '@tonaiagent/core/sdacl'
 *   import { ... } from '@tonaiagent/core/agfn'
 */

// Autonomous Capital Markets Stack (ACMS) — Issue #125
export * as ACMS from '../../research/acms';
export {
  // Unified manager
  DefaultACMSManager,
  createACMSManager,
  DEFAULT_ACMS_CONFIG,
  // Layer 1: Asset Layer
  DefaultAssetLayerManager,
  createAssetLayerManager,
  // Layer 2: Agent & Fund Layer
  DefaultAgentFundLayerManager,
  createAgentFundLayerManager,
  // Layer 3: Liquidity Layer
  DefaultLiquidityLayerManager,
  createLiquidityLayerManager,
  // Layer 4: Prime Brokerage Layer (ACMS)
  DefaultPrimeBrokerageLayerManager,
  createPrimeBrokerageLayerManager,
  // Layer 5: Clearing & Settlement Layer
  DefaultClearingSettlementLayerManager,
  createClearingSettlementLayerManager,
  // Layer 6: Risk & Stability Layer
  DefaultRiskStabilityLayerManager,
  createRiskStabilityLayerManager,
  // Layer 7: Monetary & Treasury Layer
  DefaultMonetaryTreasuryLayerManager,
  createMonetaryTreasuryLayerManager,
  // Layer 8: Inter-Protocol Layer
  DefaultInterProtocolLayerManager,
  createInterProtocolLayerManager,
  // Layer 9: Governance Layer (ACMS)
  DefaultGovernanceLayerManager,
  createGovernanceLayerManager,
  // Types
  type ACMSManager,
  type ACMSConfig,
  type ACMSStackStatus,
  type ACMSEvent,
  type ACMSEventCallback,
} from '../../research/acms';

// AI-native Global Financial Infrastructure (AGFI)
export * as AGFI from '../../research/agfi';

// Global Regulatory Integration Framework (GRIF)
export * as GRIF from '../../research/grif';
export {
  // Main GRIF manager
  GRIFManager,
  createGRIFManager,
  type GRIFManagerConfig,
  // Component factories
  createJurisdictionDeploymentLayer,
  createRegulatoryMappingMatrix,
  createComplianceModuleInterface,
  createTransparencyPortal,
  createAuditAttestationLayer,
  createRegulatoryDialogueFramework,
  // Component classes
  JurisdictionDeploymentLayer,
  RegulatoryMappingMatrix,
  ComplianceModuleInterface,
  TransparencyPortal,
  AuditAttestationLayer,
  RegulatoryDialogueFramework,
  // Key types
  type GRIFConfig,
  type GRIFStatusReport,
  type GRIFJurisdictionCode,
  type GRIFRegionCode,
  type GRIFRiskLevel,
  type RegulatoryStatus as GRIFRegulatoryStatus,
  type ComplianceModule,
  type RegulatoryMapping,
  type Attestation,
  type AuditRecord,
  type RegulatoryDocument,
  type RegulatorEngagement,
  type TransparencyPortalData,
  type GRIFEvent,
  type GRIFEventCallback,
} from '../../research/grif';

// AI-native Financial Operating System (AIFOS)
export * as AIFOS from '../../research/aifos';
export {
  // Main AIFOS manager
  DefaultAIFOSManager,
  createAIFOSManager,
  type AIFOSManager,
  type AIFOSConfig,
  type AIFOSSystemStatus,
  // Financial Kernel
  DefaultFinancialKernel,
  createFinancialKernel,
  type FinancialKernel,
  type FinancialKernelConfig,
  type KernelValidationResult,
  type KernelBoundaryResult,
  // Financial Modules
  DefaultFinancialModules,
  createFinancialModules,
  type FinancialModules,
  type FinancialModulesConfig,
  type ModulesHealthSummary,
  // AI Orchestration Layer
  DefaultAIOrchestrationLayer,
  createAIOrchestrationLayer,
  type AIOrchestrationLayer,
  type AIOrchestrationConfig,
  type OrchestrationMetrics,
  // Application Layer
  DefaultApplicationLayer,
  createApplicationLayer,
  type ApplicationLayer,
  type ApplicationLayerConfig,
  type EcosystemMetrics,
  // Permission & Identity Layer
  DefaultPermissionIdentityLayer,
  createPermissionIdentityLayer,
  type PermissionIdentityLayer,
  type PermissionIdentityConfig,
  // Interoperability Layer
  DefaultInteroperabilityLayer,
  createInteroperabilityLayer,
  type InteroperabilityLayer,
  type InteropSummary,
  // Key types
  type KernelState,
  type KernelParameters,
  type AIFOSEvent,
  type AIFOSEventCallback,
} from '../../research/aifos';

// Sovereign Digital Asset Coordination Layer (SDACL)
export * as SDACL from '../../services/sdacl';
export {
  // Main SDACL manager
  DefaultSDACLService,
  createSDACLService,
  // Component factories
  createCBDCIntegrationManager,
  createSovereignTreasuryBridgeManager,
  createCrossSovereignCoordinationManager,
  createJurisdictionEnforcementManager,
  createSovereignTransparencyManager,
  // Component classes
  DefaultCBDCIntegrationManager,
  DefaultSovereignTreasuryBridgeManager,
  DefaultCrossSovereignCoordinationManager,
  DefaultJurisdictionEnforcementManager,
  DefaultSovereignTransparencyManager,
  // Key types
  type SDACLConfig,
  type SDACLService,
  type SDACLSystemStatus,
  type SDACLEvent,
  type SDACLEventCallback,
  type SovereignAsset,
  type SovereignAssetId,
  type IssuerVerificationResult,
  type SettlementRoute,
  type TreasuryAllocation as SDACLTreasuryAllocation,
  type SovereignBond,
  type CrossBorderFlow,
  type LiquidityBalance,
  type JurisdictionRule,
  type ParticipantEligibility,
  type ExposureMetric,
  // Note: exported as SDACLComplianceReport to avoid conflict with security module's ComplianceReport
  type ComplianceReport as SDACLComplianceReport,
  type DashboardSnapshot,
  type DashboardAlert,
} from '../../services/sdacl';
