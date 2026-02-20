/**
 * TONAIAgent - Ecosystem Fund Type Definitions
 *
 * Core types for the TON AI Ecosystem Fund and Strategic Capital Allocation Framework.
 * Supports on-chain treasury, governance, grants, investments, incubation, and flywheel mechanisms.
 */

// ============================================================================
// Fund Structure Types
// ============================================================================

export interface EcosystemFundConfig {
  treasury: TreasuryConfig;
  governance: FundGovernanceConfig;
  grants: GrantProgramConfig;
  investments: InvestmentConfig;
  incubation: IncubationConfig;
  incentives: IntegrationIncentivesConfig;
  aiEvaluation: AIEvaluationConfig;
  flywheel: FlywheelConfig;
}

export interface TreasuryConfig {
  enabled: boolean;
  contractAddress?: string;
  multisigRequired: boolean;
  multisigThreshold: number;
  maxSingleAllocation: string; // Maximum single allocation without DAO vote
  allocationCooldown: number; // Hours between allocations
  reserveRatio: number; // Minimum reserve to maintain (0-1)
  allowedAssets: string[];
}

export interface Treasury {
  id: string;
  balance: string;
  reserveBalance: string;
  availableBalance: string;
  allocatedBalance: string;
  pendingBalance: string;
  assets: TreasuryAsset[];
  allocations: TreasuryAllocation[];
  transactions: TreasuryTransaction[];
  stats: TreasuryStats;
  lastAuditDate?: Date;
  nextAuditDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreasuryAsset {
  symbol: string;
  name: string;
  contractAddress?: string;
  balance: string;
  valueInTON: string;
  percentage: number;
}

export interface TreasuryAllocation {
  id: string;
  category: AllocationCategory;
  recipientId: string;
  recipientType: RecipientType;
  amount: string;
  purpose: string;
  status: AllocationStatus;
  proposalId?: string;
  approvedBy: string[];
  milestones?: AllocationMilestone[];
  disbursements: Disbursement[];
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

export type AllocationCategory =
  | 'grant'
  | 'investment'
  | 'incubation'
  | 'incentive'
  | 'infrastructure'
  | 'research'
  | 'marketing'
  | 'operations'
  | 'emergency';

export type RecipientType =
  | 'individual'
  | 'startup'
  | 'project'
  | 'protocol'
  | 'dao'
  | 'infrastructure'
  | 'research_institution';

export type AllocationStatus =
  | 'proposed'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'milestone_pending'
  | 'completed'
  | 'cancelled'
  | 'clawback';

export interface AllocationMilestone {
  id: string;
  description: string;
  targetDate: Date;
  amount: string;
  deliverables: string[];
  status: MilestoneStatus;
  completedAt?: Date;
  proofUrl?: string;
  reviewNotes?: string;
}

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'completed';

export interface Disbursement {
  id: string;
  allocationId: string;
  milestoneId?: string;
  amount: string;
  txHash?: string;
  status: DisbursementStatus;
  scheduledAt: Date;
  disbursedAt?: Date;
}

export type DisbursementStatus =
  | 'scheduled'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TreasuryTransaction {
  id: string;
  type: TransactionType;
  category: AllocationCategory;
  amount: string;
  asset: string;
  from: string;
  to: string;
  txHash?: string;
  status: TransactionStatus;
  description: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'allocation'
  | 'disbursement'
  | 'clawback'
  | 'fee'
  | 'reward'
  | 'rebalance';

export type TransactionStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'reverted';

export interface TreasuryStats {
  totalDeposited: string;
  totalDisbursed: string;
  totalAllocated: string;
  activeAllocations: number;
  completedAllocations: number;
  averageAllocationSize: string;
  fundUtilization: number;
  growthRate30d: number;
  returnOnInvestment: number;
}

// ============================================================================
// Fund Governance Types
// ============================================================================

export interface FundGovernanceConfig {
  enabled: boolean;
  votingPeriod: number; // days
  executionDelay: number; // days
  quorumPercent: number;
  supermajorityPercent: number;
  proposalThreshold: string; // tokens required to create proposal
  committeesEnabled: boolean;
  emergencyMultisig: string[];
}

export interface FundProposal {
  id: string;
  type: FundProposalType;
  title: string;
  description: string;
  proposer: string;
  category: AllocationCategory;
  amount: string;
  recipient?: FundRecipient;
  terms?: AllocationTerms;
  status: FundProposalStatus;
  votes: FundVotes;
  votingStartsAt: Date;
  votingEndsAt: Date;
  executionDeadline: Date;
  executedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export type FundProposalType =
  | 'grant_allocation'
  | 'investment_allocation'
  | 'incubation_allocation'
  | 'incentive_program'
  | 'parameter_change'
  | 'committee_appointment'
  | 'emergency_action';

export type FundProposalStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'passed'
  | 'failed'
  | 'queued'
  | 'executed'
  | 'cancelled'
  | 'expired';

export interface FundRecipient {
  id: string;
  name: string;
  type: RecipientType;
  walletAddress: string;
  contactEmail?: string;
  website?: string;
  description: string;
  kycVerified: boolean;
  reputation: number;
  pastAllocations: string[];
}

export interface AllocationTerms {
  totalAmount: string;
  vestingSchedule?: VestingSchedule;
  milestones: AllocationMilestone[];
  clawbackConditions: ClawbackCondition[];
  reportingRequirements: ReportingRequirement[];
  successMetrics: SuccessMetric[];
}

export interface VestingSchedule {
  cliff: number; // days
  duration: number; // days
  immediateRelease: number; // percentage
  linearRelease: number; // percentage
}

export interface ClawbackCondition {
  id: string;
  condition: string;
  triggerThreshold: number;
  clawbackPercent: number;
  gracePeriod: number; // days
}

export interface ReportingRequirement {
  type: ReportingType;
  frequency: ReportingFrequency;
  template?: string;
  dueDate?: Date;
}

export type ReportingType =
  | 'progress_update'
  | 'financial_report'
  | 'milestone_completion'
  | 'metrics_dashboard'
  | 'audit_report';

export type ReportingFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'on_milestone';

export interface SuccessMetric {
  name: string;
  description: string;
  target: number;
  unit: string;
  weight: number; // 0-1
}

export interface FundVotes {
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  totalVotes: string;
  voterCount: number;
  participation: number;
}

export interface FundVote {
  id: string;
  proposalId: string;
  voter: string;
  support: boolean | 'abstain';
  votingPower: string;
  reason?: string;
  timestamp: Date;
}

export interface FundCommittee {
  id: string;
  name: string;
  type: CommitteeType;
  members: CommitteeMember[];
  permissions: CommitteePermissions;
  budget: string;
  spentBudget: string;
  decisions: CommitteeDecision[];
  createdAt: Date;
}

export type CommitteeType =
  | 'grant_review'
  | 'investment'
  | 'technical'
  | 'compliance'
  | 'emergency';

export interface CommitteeMember {
  id: string;
  userId: string;
  name: string;
  role: CommitteeRole;
  votingPower: number;
  joinedAt: Date;
  term?: Date; // End of term
}

export type CommitteeRole =
  | 'chair'
  | 'member'
  | 'advisor'
  | 'observer';

export interface CommitteePermissions {
  maxDecisionAmount: string;
  canApproveGrants: boolean;
  canApproveInvestments: boolean;
  canModifyPrograms: boolean;
  requiresDAOApproval: string; // Amount threshold
}

export interface CommitteeDecision {
  id: string;
  committeeId: string;
  type: DecisionType;
  description: string;
  amount?: string;
  recipientId?: string;
  votes: { memberId: string; support: boolean }[];
  outcome: 'approved' | 'rejected' | 'deferred';
  executedAt?: Date;
  createdAt: Date;
}

export type DecisionType =
  | 'grant_approval'
  | 'investment_approval'
  | 'milestone_approval'
  | 'clawback_initiation'
  | 'program_modification';

// ============================================================================
// Grant Program Types
// ============================================================================

export interface GrantProgramConfig {
  enabled: boolean;
  categories: GrantCategory[];
  applicationFee?: string;
  maxGrantAmount: string;
  reviewPeriod: number; // days
  disbursementSchedule: 'milestone' | 'monthly' | 'quarterly';
}

export interface GrantCategory {
  id: string;
  name: string;
  description: string;
  budget: string;
  allocatedBudget: string;
  minAmount: string;
  maxAmount: string;
  priorities: string[];
  requirements: string[];
  active: boolean;
}

export interface GrantApplication {
  id: string;
  applicantId: string;
  applicant: ApplicantProfile;
  categoryId: string;
  title: string;
  description: string;
  problemStatement: string;
  proposedSolution: string;
  requestedAmount: string;
  milestones: GrantMilestone[];
  team: TeamMember[];
  budget: BudgetBreakdown;
  timeline: string;
  expectedOutcomes: string[];
  metrics: SuccessMetric[];
  previousWork?: string;
  references?: string[];
  status: GrantApplicationStatus;
  reviewScore?: number;
  reviewComments?: ReviewComment[];
  aiEvaluation?: AIEvaluationResult;
  submittedAt: Date;
  reviewedAt?: Date;
  decidedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface ApplicantProfile {
  id: string;
  name: string;
  type: 'individual' | 'team' | 'organization';
  description: string;
  website?: string;
  github?: string;
  twitter?: string;
  telegram?: string;
  walletAddress: string;
  country?: string;
  previousGrants: string[];
  reputation: number;
}

export interface GrantMilestone {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  amount: string;
  duration: number; // weeks
  dependencies?: string[];
}

export interface TeamMember {
  name: string;
  role: string;
  experience: string;
  linkedIn?: string;
  github?: string;
  commitment: string; // e.g., "full-time", "part-time"
}

export interface BudgetBreakdown {
  development: string;
  design: string;
  marketing: string;
  operations: string;
  other: string;
  total: string;
  justification: string;
}

export type GrantApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'committee_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'active'
  | 'completed'
  | 'terminated';

export interface ReviewComment {
  reviewerId: string;
  category: 'technical' | 'business' | 'team' | 'budget' | 'general';
  comment: string;
  score?: number;
  timestamp: Date;
}

export interface Grant {
  id: string;
  applicationId: string;
  recipientId: string;
  recipient: FundRecipient;
  categoryId: string;
  title: string;
  description: string;
  totalAmount: string;
  disbursedAmount: string;
  remainingAmount: string;
  milestones: GrantMilestoneStatus[];
  reports: GrantReport[];
  status: GrantStatus;
  startDate: Date;
  endDate: Date;
  lastActivityDate: Date;
  metadata: Record<string, unknown>;
}

export type GrantStatus =
  | 'active'
  | 'milestone_pending'
  | 'on_hold'
  | 'completed'
  | 'terminated'
  | 'clawback';

export interface GrantMilestoneStatus extends GrantMilestone {
  status: MilestoneStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  disbursedAt?: Date;
  proofUrl?: string;
  feedback?: string;
}

export interface GrantReport {
  id: string;
  grantId: string;
  type: ReportingType;
  period: string;
  content: ReportContent;
  attachments: string[];
  submittedAt: Date;
  reviewedAt?: Date;
  status: 'submitted' | 'reviewed' | 'approved' | 'revision_required';
}

export interface ReportContent {
  summary: string;
  progress: string;
  challenges?: string;
  nextSteps: string;
  metricsUpdate: { metric: string; current: number; target: number }[];
  financialSummary?: string;
}

// ============================================================================
// Strategic Investment Types
// ============================================================================

export interface InvestmentConfig {
  enabled: boolean;
  maxInvestmentSize: string;
  minInvestmentSize: string;
  maxPortfolioConcentration: number; // percentage
  investmentHorizon: InvestmentHorizon[];
  targetSectors: string[];
  riskTolerance: RiskTolerance;
  diligenceRequired: boolean;
}

export type InvestmentHorizon = 'short' | 'medium' | 'long';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';

export interface InvestmentOpportunity {
  id: string;
  name: string;
  type: InvestmentType;
  sector: string;
  stage: InvestmentStage;
  description: string;
  fundingRound?: string;
  valuation?: string;
  targetRaise: string;
  minInvestment: string;
  maxInvestment: string;
  terms: InvestmentTerms;
  team: TeamMember[];
  metrics: InvestmentMetrics;
  dueDiligence?: DueDiligenceReport;
  aiEvaluation?: AIEvaluationResult;
  status: OpportunityStatus;
  leadInvestor?: string;
  coInvestors?: string[];
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InvestmentType =
  | 'equity'
  | 'token'
  | 'convertible_note'
  | 'safe'
  | 'revenue_share'
  | 'protocol_treasury';

export type InvestmentStage =
  | 'pre_seed'
  | 'seed'
  | 'series_a'
  | 'series_b'
  | 'growth'
  | 'protocol';

export type OpportunityStatus =
  | 'sourced'
  | 'evaluating'
  | 'due_diligence'
  | 'committee_review'
  | 'term_sheet'
  | 'closing'
  | 'invested'
  | 'passed'
  | 'withdrawn';

export interface InvestmentTerms {
  instrumentType: InvestmentType;
  amount: string;
  ownership?: number; // percentage
  tokenAllocation?: string;
  pricePerToken?: string;
  vestingSchedule?: VestingSchedule;
  lockup?: number; // months
  proRataRights?: boolean;
  boardSeat?: boolean;
  informationRights?: boolean;
  antiDilution?: boolean;
  liquidationPreference?: number;
  specialRights?: string[];
}

export interface InvestmentMetrics {
  tvl?: string;
  users?: number;
  transactions?: number;
  revenue?: string;
  growthRate?: number;
  tokenPrice?: string;
  marketCap?: string;
  fullyDilutedValuation?: string;
  runway?: number; // months
  burnRate?: string;
}

export interface DueDiligenceReport {
  id: string;
  opportunityId: string;
  status: 'in_progress' | 'completed' | 'flagged';
  sections: DueDiligenceSection[];
  overallScore: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
  completedAt?: Date;
}

export interface DueDiligenceSection {
  name: string;
  score: number;
  weight: number;
  findings: string[];
  redFlags: string[];
  notes: string;
}

export interface RiskFactor {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation?: string;
}

export interface Investment {
  id: string;
  opportunityId: string;
  name: string;
  type: InvestmentType;
  sector: string;
  investedAmount: string;
  currentValue: string;
  ownership?: number;
  tokenAmount?: string;
  terms: InvestmentTerms;
  performance: InvestmentPerformance;
  status: InvestmentStatus;
  investedAt: Date;
  maturityDate?: Date;
  exitedAt?: Date;
  exitDetails?: ExitDetails;
  reports: InvestmentReport[];
  metadata: Record<string, unknown>;
}

export type InvestmentStatus =
  | 'active'
  | 'vesting'
  | 'mature'
  | 'impaired'
  | 'written_off'
  | 'partially_exited'
  | 'fully_exited';

export interface InvestmentPerformance {
  unrealizedGain: string;
  unrealizedGainPercent: number;
  realizedGain: string;
  irr: number;
  tvpi: number; // Total Value to Paid-In
  moic: number; // Multiple on Invested Capital
  lastValuationDate: Date;
}

export interface ExitDetails {
  type: 'acquisition' | 'ipo' | 'secondary_sale' | 'token_sale' | 'write_off';
  amount: string;
  multiplier: number;
  buyer?: string;
  date: Date;
}

export interface InvestmentReport {
  id: string;
  investmentId: string;
  period: string;
  metricsUpdate: InvestmentMetrics;
  narrative: string;
  concerns?: string;
  recommendations?: string;
  submittedAt: Date;
}

export interface PortfolioSummary {
  totalInvested: string;
  currentValue: string;
  unrealizedGain: string;
  realizedGain: string;
  portfolioIRR: number;
  investmentCount: number;
  activeInvestments: number;
  exitedInvestments: number;
  sectorAllocation: { sector: string; amount: string; percentage: number }[];
  stageAllocation: { stage: InvestmentStage; amount: string; percentage: number }[];
  topPerformers: Investment[];
  underperformers: Investment[];
}

// ============================================================================
// Incubation & Acceleration Types
// ============================================================================

export interface IncubationConfig {
  enabled: boolean;
  programDuration: number; // months
  cohortSize: number;
  applicationPeriod: number; // days
  stipend: string;
  equity?: number; // percentage
  mentorCount: number;
  officeHours: boolean;
}

export interface IncubationProgram {
  id: string;
  name: string;
  description: string;
  cohort: string;
  status: ProgramStatus;
  startDate: Date;
  endDate: Date;
  applicationDeadline: Date;
  tracks: IncubationTrack[];
  mentors: Mentor[];
  partners: Partner[];
  participants: IncubationParticipant[];
  events: ProgramEvent[];
  resources: ProgramResource[];
  metrics: ProgramMetrics;
  createdAt: Date;
}

export type ProgramStatus =
  | 'upcoming'
  | 'applications_open'
  | 'selection'
  | 'active'
  | 'demo_day'
  | 'completed'
  | 'cancelled';

export interface IncubationTrack {
  id: string;
  name: string;
  focus: string;
  description: string;
  curriculum: CurriculumModule[];
  mentors: string[];
  maxParticipants: number;
}

export interface CurriculumModule {
  week: number;
  title: string;
  description: string;
  topics: string[];
  deliverables?: string[];
  workshop?: boolean;
}

export interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  expertise: string[];
  bio: string;
  linkedIn?: string;
  twitter?: string;
  availability: 'full' | 'limited' | 'advisory';
}

export interface Partner {
  id: string;
  name: string;
  type: 'sponsor' | 'technical' | 'service' | 'investor';
  logo?: string;
  website: string;
  perks: string[];
}

export interface IncubationApplication {
  id: string;
  programId: string;
  trackId: string;
  applicant: ApplicantProfile;
  team: TeamMember[];
  project: ProjectDetails;
  vision: string;
  traction?: string;
  askFromProgram: string;
  coachability: string;
  status: IncubationApplicationStatus;
  scores: ApplicationScore[];
  aiEvaluation?: AIEvaluationResult;
  interviewNotes?: string;
  submittedAt: Date;
  decidedAt?: Date;
}

export interface ProjectDetails {
  name: string;
  tagline: string;
  description: string;
  stage: 'idea' | 'prototype' | 'mvp' | 'launched';
  website?: string;
  demo?: string;
  github?: string;
  techStack: string[];
  uniqueValue: string;
}

export type IncubationApplicationStatus =
  | 'submitted'
  | 'screening'
  | 'interview_scheduled'
  | 'interviewed'
  | 'accepted'
  | 'waitlisted'
  | 'rejected'
  | 'withdrawn';

export interface ApplicationScore {
  criterion: string;
  score: number;
  maxScore: number;
  reviewerId: string;
  comments?: string;
}

export interface IncubationParticipant {
  id: string;
  programId: string;
  trackId: string;
  applicationId: string;
  project: ProjectDetails;
  team: TeamMember[];
  mentor?: string;
  progress: ParticipantProgress;
  milestones: ParticipantMilestone[];
  meetings: MeetingRecord[];
  funding?: ParticipantFunding;
  status: ParticipantStatus;
  joinedAt: Date;
  graduatedAt?: Date;
}

export type ParticipantStatus =
  | 'onboarding'
  | 'active'
  | 'at_risk'
  | 'graduated'
  | 'dropped';

export interface ParticipantProgress {
  weeklyCheckIns: number;
  mentorMeetings: number;
  workshopsAttended: number;
  milestonesCompleted: number;
  overallProgress: number; // percentage
}

export interface ParticipantMilestone {
  week: number;
  title: string;
  description: string;
  status: MilestoneStatus;
  feedback?: string;
  completedAt?: Date;
}

export interface MeetingRecord {
  id: string;
  type: 'mentor' | 'office_hours' | 'workshop' | 'check_in';
  date: Date;
  attendees: string[];
  notes: string;
  actionItems: string[];
}

export interface ParticipantFunding {
  stipendAmount: string;
  stipendDisbursed: string;
  followOnFunding?: string;
  investorIntros: number;
}

export interface ProgramEvent {
  id: string;
  name: string;
  type: 'workshop' | 'demo_day' | 'networking' | 'pitch_practice' | 'speaker_session';
  date: Date;
  description: string;
  speakers?: string[];
  location?: string;
  virtual: boolean;
}

export interface ProgramResource {
  id: string;
  name: string;
  type: 'document' | 'video' | 'tool' | 'template' | 'link';
  category: string;
  url: string;
  description: string;
}

export interface ProgramMetrics {
  applicationsReceived: number;
  acceptanceRate: number;
  participantCount: number;
  completionRate: number;
  fundingRaised: string;
  followOnRate: number;
  averageGrowth: number;
  successStories: number;
}

// ============================================================================
// Integration Incentives Types
// ============================================================================

export interface IntegrationIncentivesConfig {
  enabled: boolean;
  categories: IncentiveCategory[];
  maxIncentivePerProject: string;
  verificationRequired: boolean;
  paymentSchedule: 'immediate' | 'milestone' | 'monthly';
}

export interface IncentiveCategory {
  id: string;
  name: string;
  description: string;
  budget: string;
  allocatedBudget: string;
  incentiveType: IncentiveType;
  requirements: IncentiveRequirement[];
  rewards: IncentiveReward[];
  active: boolean;
}

export type IncentiveType =
  | 'wallet_integration'
  | 'plugin_development'
  | 'agent_extension'
  | 'signal_provider'
  | 'data_provider'
  | 'infrastructure'
  | 'sdk_integration'
  | 'referral';

export interface IncentiveRequirement {
  id: string;
  description: string;
  verification: 'manual' | 'automated' | 'oracle';
  mandatory: boolean;
}

export interface IncentiveReward {
  tier: string;
  amount: string;
  conditions: string;
  recurring?: boolean;
  recurrencePeriod?: 'monthly' | 'quarterly';
}

export interface IncentiveApplication {
  id: string;
  categoryId: string;
  applicantId: string;
  applicant: ApplicantProfile;
  projectName: string;
  description: string;
  integrationDetails: IntegrationDetails;
  expectedImpact: string;
  requestedAmount: string;
  timeline: string;
  status: IncentiveApplicationStatus;
  verifications: Verification[];
  aiEvaluation?: AIEvaluationResult;
  submittedAt: Date;
  approvedAt?: Date;
}

export interface IntegrationDetails {
  type: IncentiveType;
  technicalSpec: string;
  repository?: string;
  documentation?: string;
  testnet?: boolean;
  mainnet?: boolean;
  userCount?: number;
  transactionVolume?: string;
}

export type IncentiveApplicationStatus =
  | 'submitted'
  | 'technical_review'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'verification_pending'
  | 'completed'
  | 'terminated';

export interface Verification {
  id: string;
  requirementId: string;
  status: 'pending' | 'verified' | 'failed';
  verifiedBy?: string;
  verifiedAt?: Date;
  evidence?: string;
  notes?: string;
}

export interface IncentiveAward {
  id: string;
  applicationId: string;
  recipientId: string;
  categoryId: string;
  amount: string;
  disbursedAmount: string;
  schedule: DisbursementSchedule[];
  status: AwardStatus;
  performance: IncentivePerformance;
  createdAt: Date;
}

export type AwardStatus =
  | 'active'
  | 'suspended'
  | 'completed'
  | 'terminated';

export interface DisbursementSchedule {
  date: Date;
  amount: string;
  status: DisbursementStatus;
  txHash?: string;
}

export interface IncentivePerformance {
  usersReferred?: number;
  transactionsGenerated?: number;
  tvlContributed?: string;
  integrationsEnabled: number;
  uptime?: number;
  qualityScore: number;
}

// ============================================================================
// AI Evaluation Types
// ============================================================================

export interface AIEvaluationConfig {
  enabled: boolean;
  provider: 'groq' | 'anthropic' | 'openai';
  modelId: string;
  evaluationCriteria: EvaluationCriterion[];
  autoReject: boolean;
  autoRejectThreshold: number;
  humanReviewRequired: boolean;
}

export interface EvaluationCriterion {
  name: string;
  weight: number;
  description: string;
  rubric: { score: number; description: string }[];
}

export interface AIEvaluationRequest {
  type: 'grant' | 'investment' | 'incubation' | 'incentive';
  applicationId: string;
  applicationData: Record<string, unknown>;
  additionalContext?: string;
}

export interface AIEvaluationResult {
  id: string;
  applicationId: string;
  type: 'grant' | 'investment' | 'incubation' | 'incentive';
  overallScore: number;
  recommendation: 'strongly_approve' | 'approve' | 'consider' | 'reject' | 'strongly_reject';
  criteriaScores: CriteriaScore[];
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  questions: string[];
  summary: string;
  confidence: number;
  modelId: string;
  evaluatedAt: Date;
  processingTime: number;
}

export interface CriteriaScore {
  criterion: string;
  score: number;
  maxScore: number;
  reasoning: string;
}

// ============================================================================
// Flywheel & Metrics Types
// ============================================================================

export interface FlywheelConfig {
  enabled: boolean;
  metricsUpdateFrequency: 'hourly' | 'daily' | 'weekly';
  dashboardEnabled: boolean;
  alertsEnabled: boolean;
  alertThresholds: FlywheelAlertThresholds;
}

export interface FlywheelAlertThresholds {
  capitalDeploymentRate: number;
  innovationIndex: number;
  userGrowthRate: number;
  dataQuality: number;
  agentPerformance: number;
}

export interface FlywheelMetrics {
  timestamp: Date;
  capital: CapitalMetrics;
  innovation: InnovationMetrics;
  users: UserMetrics;
  data: DataMetrics;
  agents: AgentMetrics;
  network: NetworkMetrics;
  flywheel: FlywheelScore;
}

export interface CapitalMetrics {
  totalFundSize: string;
  deployedCapital: string;
  availableCapital: string;
  capitalInflow30d: string;
  capitalOutflow30d: string;
  deploymentRate: number;
  returnOnCapital: number;
  capitalEfficiency: number;
}

export interface InnovationMetrics {
  activeGrants: number;
  activeInvestments: number;
  incubationParticipants: number;
  projectsLaunched: number;
  patentsOrResearch: number;
  openSourceContributions: number;
  technologiesIntegrated: number;
  innovationIndex: number;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers30d: number;
  newUsers30d: number;
  userRetention: number;
  userGrowthRate: number;
  developerCount: number;
  partnerCount: number;
}

export interface DataMetrics {
  dataProviders: number;
  signalProviders: number;
  dataQuality: number;
  dataVolume: string;
  uniqueDataSources: number;
  dataFreshness: number;
}

export interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  averagePerformance: number;
  tvlManaged: string;
  transactionsExecuted: number;
  successRate: number;
}

export interface NetworkMetrics {
  protocolIntegrations: number;
  walletIntegrations: number;
  pluginsAvailable: number;
  ecosystemProjects: number;
  networkEffect: number;
}

export interface FlywheelScore {
  overall: number;
  capitalToInnovation: number;
  innovationToUsers: number;
  usersToData: number;
  dataToAgents: number;
  agentsToCapital: number;
  momentum: 'accelerating' | 'stable' | 'decelerating';
  bottleneck?: string;
}

export interface FlywheelReport {
  id: string;
  period: string;
  metrics: FlywheelMetrics;
  trends: FlywheelTrends;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  generatedAt: Date;
}

export interface FlywheelTrends {
  capitalTrend: TrendData;
  innovationTrend: TrendData;
  usersTrend: TrendData;
  dataTrend: TrendData;
  agentsTrend: TrendData;
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  period: string;
  dataPoints: { date: Date; value: number }[];
}

// ============================================================================
// Event Types
// ============================================================================

export interface EcosystemFundEvent {
  id: string;
  timestamp: Date;
  type: EcosystemFundEventType;
  category: EcosystemFundEventCategory;
  data: Record<string, unknown>;
  actorId?: string;
  relatedId?: string;
}

export type EcosystemFundEventType =
  | 'treasury_deposit'
  | 'treasury_withdrawal'
  | 'allocation_created'
  | 'allocation_approved'
  | 'allocation_disbursed'
  | 'allocation_completed'
  | 'allocation_cancelled'
  | 'grant_submitted'
  | 'grant_approved'
  | 'grant_rejected'
  | 'grant_milestone_completed'
  | 'investment_made'
  | 'investment_exited'
  | 'incubation_application'
  | 'incubation_accepted'
  | 'incubation_graduated'
  | 'incentive_awarded'
  | 'incentive_verified'
  | 'proposal_created'
  | 'proposal_voted'
  | 'proposal_executed'
  | 'committee_decision'
  | 'metrics_updated'
  | 'flywheel_alert';

export type EcosystemFundEventCategory =
  | 'treasury'
  | 'governance'
  | 'grants'
  | 'investments'
  | 'incubation'
  | 'incentives'
  | 'metrics';

export type EcosystemFundEventCallback = (event: EcosystemFundEvent) => void;

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateAllocationRequest {
  category: AllocationCategory;
  recipientId: string;
  amount: string;
  purpose: string;
  terms?: AllocationTerms;
  proposalId?: string;
}

export interface SubmitGrantApplicationRequest {
  categoryId: string;
  title: string;
  description: string;
  problemStatement: string;
  proposedSolution: string;
  requestedAmount: string;
  milestones: GrantMilestone[];
  team: TeamMember[];
  budget: BudgetBreakdown;
  timeline: string;
  expectedOutcomes: string[];
  metrics: SuccessMetric[];
  previousWork?: string;
  references?: string[];
}

export interface CreateInvestmentProposalRequest {
  opportunityId: string;
  amount: string;
  terms: InvestmentTerms;
  rationale: string;
}

export interface ApplyToIncubationRequest {
  programId: string;
  trackId: string;
  team: TeamMember[];
  project: ProjectDetails;
  vision: string;
  traction?: string;
  askFromProgram: string;
  coachability: string;
}

export interface ApplyForIncentiveRequest {
  categoryId: string;
  projectName: string;
  description: string;
  integrationDetails: IntegrationDetails;
  expectedImpact: string;
  requestedAmount: string;
  timeline: string;
}

export interface FundProposalRequest {
  type: FundProposalType;
  title: string;
  description: string;
  category: AllocationCategory;
  amount: string;
  recipient?: FundRecipient;
  terms?: AllocationTerms;
}

export interface VoteFundProposalRequest {
  proposalId: string;
  voter: string;
  support: boolean | 'abstain';
  votingPower?: string;
  reason?: string;
}
