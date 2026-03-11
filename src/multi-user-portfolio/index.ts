/**
 * TONAIAgent - Multi-User Portfolio Management
 *
 * Enables multiple users to collaborate on investment portfolios and AI funds
 * with role-based access control, collaborative strategy management, team
 * analytics, activity logging, and institutional portfolio support.
 *
 * Architecture:
 *   Users → Role-Based Access Control → Portfolio Management Layer → AI Fund Manager → Agent Runtime
 *
 * Core Components:
 *   1. Shared Portfolio Access     — multiple users view and manage shared portfolios
 *   2. Role-Based Permissions      — Owner, Manager, Analyst, Viewer roles with granular permissions
 *   3. Collaborative Strategy      — propose, review, vote on, and implement strategy changes
 *   4. Team Analytics Dashboard    — portfolio performance, risk exposure, member activity
 *   5. Activity Logs               — track all portfolio actions with platform/Telegram notifications
 *   6. Institutional Support       — team-managed funds, delegated management, reporting
 *
 * Issue #160: Multi-User Portfolio Management
 *
 * @example
 * ```typescript
 * import { createMultiUserPortfolioManager } from '@tonaiagent/core/multi-user-portfolio';
 *
 * const manager = createMultiUserPortfolioManager();
 *
 * // Create a shared portfolio
 * const portfolio = await manager.sharedPortfolio.createPortfolio({
 *   name: 'Team Alpha Fund',
 *   ownerId: 'user_owner',
 *   description: 'Collaborative hedge fund strategy',
 *   metadata: { riskTolerance: 'medium', fundType: 'hedge_fund' },
 *   initialMembers: [
 *     { userId: 'user_manager', role: 'manager' },
 *     { userId: 'user_analyst', role: 'analyst' },
 *   ],
 * });
 *
 * // Check member permissions
 * const access = manager.permissions.checkAccess(
 *   { portfolioId: portfolio.id, userId: 'user_analyst', resource: 'trade', action: 'execute' },
 *   portfolio.members,
 * );
 * console.log(access.allowed); // false — analysts can't execute trades
 *
 * // Analyst proposes a strategy change
 * const proposal = await manager.collaborativeStrategy.createProposal({
 *   portfolioId: portfolio.id,
 *   proposedBy: 'user_analyst',
 *   title: 'Increase BTC allocation',
 *   description: 'Increase BTC from 30% to 40% given bull market signals',
 *   proposedAllocations: [
 *     { assetId: 'BTC', assetName: 'Bitcoin', targetPercent: 40, currentPercent: 30 },
 *     { assetId: 'ETH', assetName: 'Ethereum', targetPercent: 30, currentPercent: 40 },
 *   ],
 *   rationale: 'BTC dominance increasing, favorable risk/return at current levels',
 * });
 *
 * // Manager approves the proposal
 * await manager.collaborativeStrategy.submitForReview(proposal.id, 'user_analyst');
 * await manager.collaborativeStrategy.approveProposal(proposal.id, 'user_manager');
 *
 * // Get team analytics dashboard
 * const dashboard = manager.teamAnalytics.getDashboard(
 *   portfolio.id,
 *   portfolio.members.map(m => ({ userId: m.userId, role: m.role })),
 *   [],
 *   '30d',
 * );
 * console.log(dashboard.portfolioPerformance.returnPercent);
 * ```
 */

// Export all types
export type {
  PortfolioRoleName,
  PortfolioRole,
  PortfolioResourceType,
  PortfolioActionType,
  PortfolioPermission,
  SharedPortfolio,
  SharedPortfolioStatus,
  SharedPortfolioSettings,
  SharedPortfolioMetadata,
  PortfolioMember,
  CreateSharedPortfolioInput,
  AddPortfolioMemberInput,
  StrategyProposal,
  StrategyProposalStatus,
  StrategyVote,
  ProposedAllocation,
  CurrentAllocation,
  StrategyImpactProjection,
  CreateStrategyProposalInput,
  TeamAnalyticsDashboard,
  AnalyticsPeriod,
  TeamPortfolioPerformance,
  StrategyContribution,
  TeamRiskExposure,
  AssetConcentration,
  MemberActivitySummary,
  ActivityLogEntry,
  ActivityType,
  ActivitySeverity,
  NotificationRecord,
  InstitutionalFund,
  InstitutionalFundStatus,
  InstitutionalReport,
  DelegatedManager,
  FeesSummary,
  CreateInstitutionalFundInput,
  PortfolioAccessCheckRequest,
  PortfolioAccessCheckResult,
  MultiUserPortfolioConfig,
  MultiUserPortfolioHealth,
  MultiUserPortfolioEventType,
  MultiUserPortfolioEvent,
  MultiUserPortfolioEventCallback,
} from './types';

// Export permissions
export {
  PORTFOLIO_ROLES,
  DefaultPortfolioPermissionsManager,
  createPortfolioPermissionsManager,
  type PortfolioPermissionsManager,
} from './permissions';

// Export shared portfolio manager
export {
  DefaultSharedPortfolioManager,
  createSharedPortfolioManager,
  type SharedPortfolioManager,
} from './shared-portfolio';

// Export collaborative strategy manager
export {
  DefaultCollaborativeStrategyManager,
  createCollaborativeStrategyManager,
  type CollaborativeStrategyManager,
} from './collaborative-strategy';

// Export team analytics manager
export {
  DefaultTeamAnalyticsManager,
  createTeamAnalyticsManager,
  type TeamAnalyticsManager,
  type TradeRecord,
  type PortfolioSnapshot,
  type StrategyRecord,
} from './team-analytics';

// Export activity log manager
export {
  DefaultActivityLogManager,
  createActivityLogManager,
  type ActivityLogManager,
  type RecordActivityInput,
  type ActivityLogFilter,
  type NotificationConfig,
} from './activity-log';

// Export institutional portfolio manager
export {
  DefaultInstitutionalPortfolioManager,
  createInstitutionalPortfolioManager,
  type InstitutionalPortfolioManager,
  type GenerateReportInput,
} from './institutional';

// ============================================================================
// Multi-User Portfolio Manager — Unified Entry Point
// ============================================================================

import { MultiUserPortfolioConfig, MultiUserPortfolioHealth, MultiUserPortfolioEventCallback, MultiUserPortfolioEvent } from './types';
import { DefaultPortfolioPermissionsManager, createPortfolioPermissionsManager } from './permissions';
import { DefaultSharedPortfolioManager, createSharedPortfolioManager } from './shared-portfolio';
import { DefaultCollaborativeStrategyManager, createCollaborativeStrategyManager } from './collaborative-strategy';
import { DefaultTeamAnalyticsManager, createTeamAnalyticsManager } from './team-analytics';
import { DefaultActivityLogManager, createActivityLogManager } from './activity-log';
import { DefaultInstitutionalPortfolioManager, createInstitutionalPortfolioManager } from './institutional';

const DEFAULT_CONFIG: MultiUserPortfolioConfig = {
  enableActivityLogging: true,
  enableNotifications: true,
  defaultRequireApprovalForTrades: false,
  defaultApprovalThresholdUsd: 10000,
  maxMembersPerPortfolio: 50,
};

/**
 * Unified Multi-User Portfolio Manager
 *
 * Provides a single entry point to all multi-user portfolio management
 * capabilities: shared portfolios, permissions, collaborative strategy,
 * team analytics, activity logging, and institutional support.
 */
export class MultiUserPortfolioManager {
  readonly sharedPortfolio: DefaultSharedPortfolioManager;
  readonly permissions: DefaultPortfolioPermissionsManager;
  readonly collaborativeStrategy: DefaultCollaborativeStrategyManager;
  readonly teamAnalytics: DefaultTeamAnalyticsManager;
  readonly activityLog: DefaultActivityLogManager;
  readonly institutional: DefaultInstitutionalPortfolioManager;

  private readonly config: MultiUserPortfolioConfig;
  private readonly eventCallbacks: MultiUserPortfolioEventCallback[] = [];

  constructor(config: Partial<MultiUserPortfolioConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.permissions = createPortfolioPermissionsManager();
    this.sharedPortfolio = createSharedPortfolioManager();
    this.collaborativeStrategy = createCollaborativeStrategyManager();
    this.teamAnalytics = createTeamAnalyticsManager();
    this.activityLog = createActivityLogManager();
    this.institutional = createInstitutionalPortfolioManager();

    // Forward events from all sub-components
    this.sharedPortfolio.onEvent(event => this.emitEvent(event));
    this.permissions.onEvent(event => this.emitEvent(event));
    this.collaborativeStrategy.onEvent(event => this.emitEvent(event));
    this.teamAnalytics.onEvent(event => this.emitEvent(event));
    this.activityLog.onEvent(event => this.emitEvent(event));
    this.institutional.onEvent(event => this.emitEvent(event));
  }

  getHealth(): MultiUserPortfolioHealth {
    const portfolios = this.sharedPortfolio.listPortfolios();
    const totalMembers = portfolios.reduce((sum, p) => sum + p.members.length, 0);

    return {
      overall: 'healthy',
      components: {
        sharedPortfolio: true,
        permissions: true,
        collaborativeStrategy: true,
        teamAnalytics: true,
        activityLog: true,
        institutional: true,
      },
      activePortfolios: portfolios.filter(p => p.status === 'active').length,
      totalMembers,
      lastCheck: new Date(),
    };
  }

  onEvent(callback: MultiUserPortfolioEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: MultiUserPortfolioEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore callback errors */ }
    }
  }
}

/**
 * Create a new MultiUserPortfolioManager instance
 */
export function createMultiUserPortfolioManager(
  config: Partial<MultiUserPortfolioConfig> = {},
): MultiUserPortfolioManager {
  return new MultiUserPortfolioManager(config);
}
