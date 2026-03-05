/**
 * TONAIAgent - Protocol Constitution & Governance Charter Types (Issue #126)
 *
 * Core types for the Protocol Constitution & Governance Charter, defining the
 * foundational law of the protocol: governance structure, AI authority bounds,
 * risk hard limits, monetary rules, emergency powers, and amendment processes.
 */

// ============================================================================
// Foundational Principles Types
// ============================================================================

/**
 * The core economic mission categories the protocol serves
 */
export type ProtocolMission =
  | 'autonomous_asset_management'   // AI-driven portfolio management
  | 'systemic_risk_stability'       // Cross-protocol risk monitoring
  | 'monetary_policy'               // AI monetary policy & treasury
  | 'liquidity_standard'            // Inter-protocol liquidity
  | 'capital_markets';              // Autonomous capital markets

/**
 * Decentralization commitment levels
 */
export type DecentralizationTier =
  | 'fully_decentralized'    // No privileged admin keys
  | 'progressive'            // Transitioning to full decentralization
  | 'hybrid';                // Permanent multi-sig backstop

/**
 * The foundational principles document of the protocol
 */
export interface FoundationalPrinciples {
  id: string;
  version: string;
  purpose: string;
  economicMission: ProtocolMission[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  decentralizationCommitment: DecentralizationTier;
  coreValues: string[];
  immutableClauses: string[];       // Clauses that can never be changed
  adoptedAt: Date;
  ratifiedBy: string[];             // Addresses that ratified
}

// ============================================================================
// Governance Architecture Types
// ============================================================================

/**
 * Types of governance bodies in the protocol
 */
export type GovernanceBodyType =
  | 'token_holder_dao'            // All TONAI token holders
  | 'treasury_council'            // Elected treasury managers
  | 'risk_oversight_council'      // Elected risk officers
  | 'emergency_stabilization'     // Emergency response committee
  | 'ai_advisory_layer';          // AI system advisory role

/**
 * Voting threshold configuration for a governance body
 */
export interface VotingThreshold {
  quorumPercent: number;           // Minimum participation required
  approvalThreshold: number;       // Minimum approval % to pass
  supermajorityThreshold: number;  // For constitutional changes (e.g. 75%)
  timelockDays: number;            // Days in timelock before execution
  votingPeriodDays: number;        // Days voting window stays open
}

/**
 * A governance body in the protocol hierarchy
 */
export interface GovernanceBody {
  id: string;
  type: GovernanceBodyType;
  name: string;
  description: string;
  memberCount?: number;
  electionPeriodDays?: number;
  votingThreshold: VotingThreshold;
  authorities: string[];           // List of what this body can decide
  constraints: string[];           // Hard limits on this body's power
  active: boolean;
  establishedAt: Date;
}

/**
 * A proposal lifecycle stage
 */
export type ProposalLifecycleStage =
  | 'draft'           // Being written
  | 'review'          // Community review period
  | 'voting'          // Active vote
  | 'timelock'        // Passed, waiting to execute
  | 'executed'        // Implemented
  | 'rejected'        // Vote failed
  | 'withdrawn';      // Proposer withdrew

/**
 * Input for creating a constitutional proposal
 */
export interface CreateConstitutionalProposalInput {
  title: string;
  description: string;
  proposalType: 'standard' | 'constitutional' | 'emergency';
  proposerAddress: string;
  targetBody: GovernanceBodyType;
  actions: ConstitutionalAction[];
  metadata?: Record<string, unknown>;
}

/**
 * An action to be taken as result of a constitutional proposal
 */
export interface ConstitutionalAction {
  type: 'parameter_change' | 'body_creation' | 'body_dissolution' | 'clause_amendment' | 'emergency_activation';
  target: string;
  description: string;
  encodedAction: string;
}

/**
 * A constitutional governance proposal
 */
export interface ConstitutionalProposal {
  id: string;
  title: string;
  description: string;
  proposalType: 'standard' | 'constitutional' | 'emergency';
  proposerAddress: string;
  targetBody: GovernanceBodyType;
  stage: ProposalLifecycleStage;
  actions: ConstitutionalAction[];
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  aiAdvisoryScore?: number;         // AI risk/quality score 0-100
  aiAdvisoryNotes?: string[];
  auditRequired: boolean;
  auditCompleted?: boolean;
  votingStartsAt?: Date;
  votingEndsAt?: Date;
  timelockEndsAt?: Date;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AI Authority Types
// ============================================================================

/**
 * Categories of AI autonomous action authority
 */
export type AiAuthorityLevel =
  | 'fully_autonomous'     // AI acts without any approval
  | 'bounded_autonomous'   // AI acts within pre-approved parameter bounds
  | 'advisory_only'        // AI recommends, humans decide
  | 'prohibited';          // AI may never take this action

/**
 * A specific AI capability with its authority level
 */
export interface AiCapabilitySpec {
  id: string;
  name: string;
  description: string;
  authorityLevel: AiAuthorityLevel;
  bounds?: AiActionBounds;          // For bounded_autonomous actions
  requiresDAOApproval: boolean;
  requiresHumanOverride: boolean;
  auditLogged: boolean;
}

/**
 * Bounds on what a bounded-autonomous AI action can do
 */
export interface AiActionBounds {
  maxPercentageChange?: number;     // Max % change in a parameter
  maxAbsoluteValue?: number;        // Max absolute value
  minAbsoluteValue?: number;        // Min absolute value
  maxFrequencyHours?: number;       // How often AI can act
  cooldownHours?: number;           // Cooldown after action
  requiresConsecutiveSignals?: number; // Signals before acting
}

/**
 * The AI authority specification document
 */
export interface AiAuthoritySpec {
  id: string;
  version: string;
  capabilities: AiCapabilitySpec[];
  prohibitedActions: string[];      // Explicit list of never-allowed actions
  overrideAuthority: string[];      // Who can override AI decisions
  humanCheckpointTriggers: string[];// Conditions requiring human review
  transparencyRequirements: string[];
  auditFrequencyDays: number;
  adoptedAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Risk Boundary Types
// ============================================================================

/**
 * A hard limit that requires supermajority to change
 */
export interface HardLimit {
  id: string;
  name: string;
  description: string;
  parameterKey: string;
  currentValue: number;
  unit: string;
  immutable: boolean;               // True = can never be changed
  amendmentRequirement: 'supermajority' | 'unanimous' | 'immutable';
  rationale: string;
  establishedAt: Date;
  lastAmendedAt?: Date;
}

/**
 * Risk boundary definitions document
 */
export interface RiskBoundaryDefinitions {
  id: string;
  version: string;
  hardLimits: HardLimit[];
  softLimits: SoftLimit[];
  insuranceReserveMinimum: number;  // % of TVL
  treasuryReserveRatio: number;     // % kept in reserve
  maxSystemicExposure: number;      // Max cross-protocol exposure %
  adoptedAt: Date;
  updatedAt: Date;
}

/**
 * A soft limit that can be changed by standard DAO vote
 */
export interface SoftLimit {
  id: string;
  name: string;
  parameterKey: string;
  currentValue: number;
  unit: string;
  allowedRange: { min: number; max: number };
  amendmentRequirement: 'standard' | 'supermajority';
}

// ============================================================================
// Monetary Governance Types
// ============================================================================

/**
 * Emission policy type
 */
export type EmissionPolicyType =
  | 'fixed_supply'        // No new tokens ever
  | 'deflationary'        // Supply decreases over time
  | 'controlled_inflation'// Bounded inflation rate
  | 'algorithmic';        // AI-managed supply

/**
 * Monetary governance rules document
 */
export interface MonetaryGovernanceRules {
  id: string;
  version: string;
  emissionPolicy: EmissionPolicyType;
  maxInflationRatePercent: number;       // Hard ceiling on annual inflation
  maxDeflationRatePercent: number;       // Max annual deflation
  emergencyLiquidityInjectionCap: number;// Max emergency liquidity as % of supply
  treasuryAllocationApprovalThreshold: number; // % requiring DAO vote
  aiMonetaryAdjustmentBounds: AiActionBounds;
  stakeholderDistribution: StakeholderAllocation[];
  adoptedAt: Date;
  updatedAt: Date;
}

/**
 * Allocation of treasury/emissions to a stakeholder group
 */
export interface StakeholderAllocation {
  stakeholder: string;
  allocationPercent: number;
  vestingSchedule?: string;
  governanceRights: boolean;
}

// ============================================================================
// Emergency Framework Types
// ============================================================================

/**
 * Conditions that trigger emergency protocol activation
 */
export type EmergencyTriggerCondition =
  | 'systemic_risk_threshold'     // Protocol-wide risk score exceeds threshold
  | 'clearing_failure'            // Settlement/clearing system failure
  | 'oracle_failure'              // Price oracle manipulation/failure
  | 'stablecoin_depeg'            // Key stablecoin loses peg
  | 'governance_attack'           // Attempted governance takeover
  | 'smart_contract_exploit'      // Critical vulnerability exploited
  | 'regulatory_order';           // Mandatory compliance action

/**
 * Types of emergency powers that can be invoked
 */
export type EmergencyPowerType =
  | 'trading_halt'            // Pause all trading activity
  | 'leverage_freeze'         // Freeze all leverage positions
  | 'treasury_deployment'     // Emergency treasury fund deployment
  | 'circuit_breaker'         // Activate risk circuit breaker
  | 'governance_pause'        // Temporarily pause governance votes
  | 'protocol_migration';     // Emergency protocol upgrade

/**
 * An emergency activation record
 */
export interface EmergencyActivation {
  id: string;
  triggerCondition: EmergencyTriggerCondition;
  triggerDetails: string;
  triggeredBy: string;
  activatedPowers: EmergencyPowerType[];
  affectedComponents: string[];
  activatedAt: Date;
  sunsetAt: Date;              // Auto-expiration timestamp
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  active: boolean;
}

/**
 * The emergency powers framework document
 */
export interface EmergencyFramework {
  id: string;
  version: string;
  triggerConditions: EmergencyTriggerDefinition[];
  availablePowers: EmergencyPowerDefinition[];
  maxActivationDurationDays: number;   // Auto-sunset period
  requiredActivators: number;          // Min signers to activate
  emergencyCommitteeSize: number;
  postEmergencyReviewRequired: boolean;
  activeEmergencies: EmergencyActivation[];
  adoptedAt: Date;
  updatedAt: Date;
}

/**
 * Definition of an emergency trigger condition
 */
export interface EmergencyTriggerDefinition {
  condition: EmergencyTriggerCondition;
  description: string;
  thresholdMetric?: string;
  thresholdValue?: number;
  monitoringFrequencyMinutes: number;
}

/**
 * Definition of an available emergency power
 */
export interface EmergencyPowerDefinition {
  power: EmergencyPowerType;
  description: string;
  affectedSystems: string[];
  maxDurationDays: number;
  requiresDAORatification: boolean;   // Must DAO ratify within X days
  ratificationWindowDays: number;
}

// ============================================================================
// Amendment Process Types
// ============================================================================

/**
 * Types of constitutional amendments
 */
export type AmendmentType =
  | 'standard_parameter'       // Change a numeric parameter
  | 'structural'               // Change governance structure
  | 'constitutional'           // Amend a core constitutional clause
  | 'emergency_clause';        // Add/modify emergency powers

/**
 * Status of an amendment proposal
 */
export type AmendmentStatus =
  | 'draft'
  | 'community_review'
  | 'audit_pending'
  | 'audit_complete'
  | 'voting'
  | 'timelock'
  | 'enacted'
  | 'rejected'
  | 'withdrawn';

/**
 * An amendment proposal to the protocol constitution
 */
export interface AmendmentProposal {
  id: string;
  amendmentType: AmendmentType;
  status: AmendmentStatus;
  title: string;
  rationale: string;
  proposerAddress: string;
  targetSection: string;           // Section of constitution being amended
  currentText: string;             // Current clause/value
  proposedText: string;            // Proposed new clause/value
  impactAssessment: string;
  auditReport?: string;
  communityReviewStartAt?: Date;
  communityReviewEndAt?: Date;
  votingStartAt?: Date;
  votingEndAt?: Date;
  timelockEndAt?: Date;
  enactedAt?: Date;
  requiredApprovalThreshold: number;  // % of votes needed
  requiredQuorum: number;             // % of supply participating
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The amendment process rules
 */
export interface AmendmentProcessRules {
  id: string;
  version: string;
  communityReviewPeriodDays: number;
  auditRequiredForTypes: AmendmentType[];
  auditWindowDays: number;
  votingPeriodByType: Record<AmendmentType, number>;  // Days
  timelockByType: Record<AmendmentType, number>;      // Days
  approvalThresholdByType: Record<AmendmentType, number>; // %
  quorumByType: Record<AmendmentType, number>;        // %
  immutableClauses: string[];      // Clauses that cannot be amended
  adoptedAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Institutional Compliance Types
// ============================================================================

/**
 * Compliance requirement type
 */
export type ComplianceRequirementType =
  | 'kyc_aml'             // Know-your-customer / anti-money laundering
  | 'accredited_investor' // Accredited investor verification
  | 'rwa_regulatory'      // Real-world asset regulatory mapping
  | 'jurisdiction_aware'  // Jurisdiction-specific fund rules
  | 'custody_standard'    // Institutional custody requirements
  | 'reporting';          // Regulatory reporting obligations

/**
 * A compliance requirement in the institutional compliance spec
 */
export interface ComplianceRequirement {
  id: string;
  type: ComplianceRequirementType;
  description: string;
  applicableJurisdictions: string[];
  mandatory: boolean;
  enforcementMechanism: string;
  reviewFrequencyDays: number;
}

/**
 * Institutional compliance integration specification
 */
export interface InstitutionalComplianceSpec {
  id: string;
  version: string;
  requirements: ComplianceRequirement[];
  custodyStandard: string;
  kycProviders: string[];
  supportedJurisdictions: string[];
  rwaMappingFramework: string;
  adoptedAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Protocol Constitution Document (Master)
// ============================================================================

/**
 * The complete Protocol Constitution document
 */
export interface ProtocolConstitution {
  id: string;
  version: string;
  name: string;
  preamble: string;

  // The 8 constitutional sections
  foundationalPrinciples: FoundationalPrinciples;
  governanceBodies: GovernanceBody[];
  aiAuthoritySpec: AiAuthoritySpec;
  riskBoundaries: RiskBoundaryDefinitions;
  monetaryRules: MonetaryGovernanceRules;
  emergencyFramework: EmergencyFramework;
  amendmentRules: AmendmentProcessRules;
  complianceSpec: InstitutionalComplianceSpec;

  status: 'draft' | 'ratified' | 'amended' | 'superseded';
  ratifiedAt?: Date;
  ratifiedBy: string[];
  currentAmendmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Configuration & Health Types
// ============================================================================

/**
 * Configuration for the Protocol Constitution layer
 */
export interface ProtocolConstitutionConfig {
  constitutionVersion: string;
  enableAiAdvisory: boolean;
  enableEmergencyProtocol: boolean;
  defaultAmendmentReviewDays: number;
  defaultAmendmentAuditDays: number;
  enableInstitutionalCompliance: boolean;
}

/**
 * Health status of the Protocol Constitution layer
 */
export interface ProtocolConstitutionHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  constitutionStatus: 'ratified' | 'draft' | 'under_amendment';
  activeEmergencies: number;
  pendingAmendments: number;
  pendingProposals: number;
  aiAdvisoryActive: boolean;
  complianceStatus: 'compliant' | 'review_needed' | 'non_compliant';
  lastAuditDate?: Date;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Types of events emitted by the Protocol Constitution layer
 */
export type ConstitutionEventType =
  | 'constitution.ratified'
  | 'constitution.amended'
  | 'proposal.created'
  | 'proposal.ai_advisory_complete'
  | 'proposal.voted'
  | 'proposal.passed'
  | 'proposal.rejected'
  | 'proposal.executed'
  | 'amendment.proposed'
  | 'amendment.enacted'
  | 'amendment.rejected'
  | 'emergency.activated'
  | 'emergency.resolved'
  | 'emergency.expired'
  | 'ai_authority.action_taken'
  | 'ai_authority.override_applied'
  | 'risk_boundary.hard_limit_approached'
  | 'compliance.review_triggered';

/**
 * An event emitted by the Protocol Constitution layer
 */
export interface ConstitutionEvent {
  type: ConstitutionEventType;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Callback for constitution events
 */
export type ConstitutionEventCallback = (event: ConstitutionEvent) => void;
