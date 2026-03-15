/**
 * TONAIAgent - Multi-User Portfolio Management Type Definitions
 *
 * Core types for the Multi-User Portfolio Management system.
 * Supports shared portfolio access, role-based permissions, collaborative
 * strategy management, team analytics, activity logging, and institutional
 * portfolio support.
 *
 * Issue #160: Multi-User Portfolio Management
 */

// ============================================================================
// Portfolio Role Types
// ============================================================================

export type PortfolioRoleName =
  | 'owner'
  | 'manager'
  | 'analyst'
  | 'viewer';

export interface PortfolioRole {
  name: PortfolioRoleName;
  displayName: string;
  description: string;
  permissions: PortfolioPermission[];
  inherits?: PortfolioRoleName[];
}

export type PortfolioResourceType =
  | 'portfolio'
  | 'fund'
  | 'strategy'
  | 'allocation'
  | 'trade'
  | 'analytics'
  | 'activity_log'
  | 'member'
  | 'report';

export type PortfolioActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'approve'
  | 'propose'
  | 'invite'
  | 'export';

export interface PortfolioPermission {
  resource: PortfolioResourceType;
  action: PortfolioActionType;
}

// ============================================================================
// Shared Portfolio Types
// ============================================================================

export type SharedPortfolioStatus =
  | 'active'
  | 'suspended'
  | 'archived'
  | 'pending_review';

export interface SharedPortfolio {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: SharedPortfolioStatus;
  members: PortfolioMember[];
  totalValueUsd: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: SharedPortfolioMetadata;
  settings: SharedPortfolioSettings;
}

export interface SharedPortfolioMetadata {
  tags?: string[];
  investmentObjective?: string;
  riskTolerance?: 'low' | 'medium' | 'high' | 'aggressive';
  targetReturnPercent?: number;
  fundType?: 'hedge_fund' | 'index_fund' | 'venture' | 'private_equity' | 'custom';
}

export interface SharedPortfolioSettings {
  requireApprovalForTrades: boolean;
  requireApprovalAboveUsd?: number;
  allowAnalystProposals: boolean;
  notifyOnTrades: boolean;
  notifyOnStrategyChanges: boolean;
  telegramChatId?: string;
  reportingFrequency: 'daily' | 'weekly' | 'monthly' | 'none';
}

export interface PortfolioMember {
  id: string;
  portfolioId: string;
  userId: string;
  role: PortfolioRoleName;
  invitedBy: string;
  joinedAt: Date;
  status: 'active' | 'suspended' | 'pending';
  permissions: PortfolioPermission[];
  lastActivityAt?: Date;
}

export interface CreateSharedPortfolioInput {
  name: string;
  ownerId: string;
  description?: string;
  metadata?: Partial<SharedPortfolioMetadata>;
  settings?: Partial<SharedPortfolioSettings>;
  initialMembers?: Array<{
    userId: string;
    role: PortfolioRoleName;
  }>;
}

export interface AddPortfolioMemberInput {
  portfolioId: string;
  userId: string;
  role: PortfolioRoleName;
  invitedBy: string;
}

// ============================================================================
// Collaborative Strategy Types
// ============================================================================

export type StrategyProposalStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'implemented'
  | 'withdrawn';

export interface StrategyProposal {
  id: string;
  portfolioId: string;
  proposedBy: string;
  title: string;
  description: string;
  status: StrategyProposalStatus;
  proposedAllocations: ProposedAllocation[];
  currentAllocations: CurrentAllocation[];
  rationale: string;
  expectedImpact: StrategyImpactProjection;
  votes: StrategyVote[];
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  implementedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposedAllocation {
  assetId: string;
  assetName: string;
  targetPercent: number;
  currentPercent: number;
  changePercent: number;
}

export interface CurrentAllocation {
  assetId: string;
  assetName: string;
  currentPercent: number;
  currentValueUsd: number;
}

export interface StrategyImpactProjection {
  expectedReturnChangePercent?: number;
  expectedRiskChangePercent?: number;
  expectedSharpeRatioChange?: number;
  notes?: string;
}

export interface StrategyVote {
  id: string;
  proposalId: string;
  voterId: string;
  vote: 'approve' | 'reject' | 'abstain';
  comment?: string;
  votedAt: Date;
}

export interface CreateStrategyProposalInput {
  portfolioId: string;
  proposedBy: string;
  title: string;
  description: string;
  proposedAllocations: Omit<ProposedAllocation, 'changePercent'>[];
  rationale: string;
  expectedImpact?: Partial<StrategyImpactProjection>;
}

// ============================================================================
// Team Analytics Types
// ============================================================================

export interface TeamAnalyticsDashboard {
  portfolioId: string;
  generatedAt: Date;
  period: AnalyticsPeriod;
  portfolioPerformance: TeamPortfolioPerformance;
  strategyContributions: StrategyContribution[];
  riskExposure: TeamRiskExposure;
  memberActivity: MemberActivitySummary[];
  recentActivities: ActivityLogEntry[];
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  label: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
}

export interface TeamPortfolioPerformance {
  totalValueUsd: number;
  returnPercent: number;
  returnUsd: number;
  benchmarkReturnPercent?: number;
  sharpeRatio: number;
  maxDrawdownPercent: number;
  volatilityPercent: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
}

export interface StrategyContribution {
  strategyId: string;
  strategyName: string;
  allocationPercent: number;
  returnContributionPercent: number;
  riskContributionPercent: number;
  proposedBy?: string;
  implementedAt?: Date;
}

export interface TeamRiskExposure {
  overallRiskScore: number; // 0-100
  concentrationRisk: number; // 0-100
  liquidityRisk: number; // 0-100
  marketRisk: number; // 0-100
  topConcentrations: AssetConcentration[];
  diversificationScore: number; // 0-100
}

export interface AssetConcentration {
  assetId: string;
  assetName: string;
  allocationPercent: number;
  riskContributionPercent: number;
}

export interface MemberActivitySummary {
  userId: string;
  role: PortfolioRoleName;
  totalActions: number;
  tradesExecuted: number;
  strategiesProposed: number;
  strategiesApproved: number;
  lastActivityAt?: Date;
}

// ============================================================================
// Activity Log Types
// ============================================================================

export type ActivityType =
  | 'portfolio_created'
  | 'portfolio_updated'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'strategy_proposed'
  | 'strategy_approved'
  | 'strategy_rejected'
  | 'strategy_implemented'
  | 'trade_executed'
  | 'allocation_changed'
  | 'fund_created'
  | 'fund_updated'
  | 'report_generated'
  | 'settings_changed';

export type ActivitySeverity = 'info' | 'warning' | 'critical';

export interface ActivityLogEntry {
  id: string;
  portfolioId: string;
  actorId: string;
  actorRole: PortfolioRoleName;
  type: ActivityType;
  severity: ActivitySeverity;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  notificationsSent: NotificationRecord[];
}

export interface NotificationRecord {
  channel: 'platform' | 'telegram' | 'email';
  sentAt: Date;
  recipientId: string;
  success: boolean;
}

// ============================================================================
// Institutional Portfolio Types
// ============================================================================

export type InstitutionalFundStatus =
  | 'setup'
  | 'active'
  | 'paused'
  | 'winding_down'
  | 'closed';

export interface InstitutionalFund {
  id: string;
  portfolioId: string;
  name: string;
  description?: string;
  fundType: 'hedge_fund' | 'index_fund' | 'venture' | 'private_equity' | 'managed_account';
  status: InstitutionalFundStatus;
  aum: number; // Assets under management in USD
  currency: string;
  minimumInvestmentUsd: number;
  managementFeePercent: number;
  performanceFeePercent: number;
  highWaterMark: number;
  delegatedManagers: DelegatedManager[];
  investorCount: number;
  inceptionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DelegatedManager {
  userId: string;
  portfolioId: string;
  permissions: PortfolioPermission[];
  delegatedAt: Date;
  delegatedBy: string;
  status: 'active' | 'revoked';
  managedAllocationPercent?: number;
}

export interface InstitutionalReport {
  id: string;
  fundId: string;
  portfolioId: string;
  reportType: 'monthly' | 'quarterly' | 'annual' | 'custom';
  period: AnalyticsPeriod;
  generatedAt: Date;
  generatedBy: string;
  performance: TeamPortfolioPerformance;
  riskMetrics: TeamRiskExposure;
  feesSummary: FeesSummary;
  complianceNotes?: string;
  distributionList: string[]; // User IDs to receive the report
}

export interface FeesSummary {
  managementFeesUsd: number;
  performanceFeesUsd: number;
  totalFeesUsd: number;
  netReturnPercent: number;
  grossReturnPercent: number;
}

export interface CreateInstitutionalFundInput {
  portfolioId: string;
  name: string;
  description?: string;
  fundType: InstitutionalFund['fundType'];
  currency?: string;
  minimumInvestmentUsd?: number;
  managementFeePercent?: number;
  performanceFeePercent?: number;
}

// ============================================================================
// Permission Check Types
// ============================================================================

export interface PortfolioAccessCheckRequest {
  portfolioId: string;
  userId: string;
  resource: PortfolioResourceType;
  action: PortfolioActionType;
}

export interface PortfolioAccessCheckResult {
  allowed: boolean;
  reason: string;
  requiredRoles?: PortfolioRoleName[];
  userRole?: PortfolioRoleName;
}

// ============================================================================
// Multi-User Portfolio Manager Types
// ============================================================================

export interface MultiUserPortfolioConfig {
  enableActivityLogging: boolean;
  enableNotifications: boolean;
  defaultRequireApprovalForTrades: boolean;
  defaultApprovalThresholdUsd: number;
  maxMembersPerPortfolio: number;
}

export interface MultiUserPortfolioHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    sharedPortfolio: boolean;
    permissions: boolean;
    collaborativeStrategy: boolean;
    teamAnalytics: boolean;
    activityLog: boolean;
    institutional: boolean;
  };
  activePortfolios: number;
  totalMembers: number;
  lastCheck: Date;
}

export type MultiUserPortfolioEventType =
  | 'portfolio_created'
  | 'portfolio_updated'
  | 'member_added'
  | 'member_removed'
  | 'strategy_proposed'
  | 'strategy_approved'
  | 'strategy_rejected'
  | 'trade_approved'
  | 'trade_executed'
  | 'fund_created'
  | 'report_generated'
  | 'access_denied';

export interface MultiUserPortfolioEvent {
  id: string;
  timestamp: Date;
  type: MultiUserPortfolioEventType;
  portfolioId: string;
  actorId: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
}

export type MultiUserPortfolioEventCallback = (event: MultiUserPortfolioEvent) => void;
