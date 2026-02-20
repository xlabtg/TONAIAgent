/**
 * TONAIAgent - Institutional & Compliance Layer
 *
 * Comprehensive institutional-grade compliance, risk, and reporting infrastructure
 * enabling regulated entities, funds, DAOs, and enterprises to safely operate
 * autonomous agents on The Open Network.
 *
 * Features:
 * - Institutional Account Architecture (multi-user, role-based)
 * - KYC/AML Integration Layer
 * - Transaction Policy & Approval Workflows
 * - Regulatory Reporting System
 * - Portfolio Risk Controls (VaR, Stress Testing)
 * - AI Governance & Explainability
 *
 * @example
 * ```typescript
 * import {
 *   createInstitutionalManager,
 *   InstitutionalAccountType,
 * } from '@tonaiagent/core/institutional';
 *
 * // Create institutional manager
 * const institutional = createInstitutionalManager();
 *
 * // Create institutional account
 * const account = await institutional.accounts.createAccount(
 *   'Acme Fund',
 *   'hedge_fund',
 *   'admin_user_id'
 * );
 *
 * // Configure compliance
 * await institutional.kyc.createProfile(account.id, 'institutional');
 *
 * // Set up risk controls
 * await institutional.risk.configureRisk(account.id, {
 *   enabled: true,
 *   portfolioLimits: { maxDrawdown: 15 },
 * });
 * ```
 */

// Export all types
export * from './types';

// Export account management
export {
  DefaultAccountManager,
  createAccountManager,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_LIMITS_BY_TYPE,
  type AccountManager,
  type CreateAccountOptions,
  type AccountUpdates,
  type MemberUpdates,
  type MemberFilters,
  type AccessCheckResult,
  type AccountHierarchyNode,
} from './accounts';

// Export KYC/AML
export {
  DefaultKycAmlManager,
  createKycAmlManager,
  type KycAmlManager,
  type KycProfileUpdates,
  type TransactionData,
  type TransactionCheckResult,
  type AlertFilters,
  type SarDetails,
  type SarResult,
} from './kyc-aml';

// Export approval workflows
export {
  DefaultApprovalWorkflowManager,
  createApprovalWorkflowManager,
  DEFAULT_WORKFLOW_TEMPLATES,
  type ApprovalWorkflowManager,
  type WorkflowUpdates,
  type RequestFilters,
  type TransactionContext,
  type ApprovalEvaluation,
  type ApprovalResult,
  type EscalationResult,
} from './approval-workflow';

// Export reporting
export {
  DefaultReportingManager,
  createReportingManager,
  DEFAULT_TEMPLATES,
  type ReportingManager,
  type ReportOptions,
  type ReportFilters,
  type ExportedReport,
  type DashboardMetrics,
  type PortfolioMetrics,
  type AssetDistribution,
  type Holding,
  type ActivityMetrics,
  type RiskDashboardMetrics,
  type RiskAlert,
  type ComplianceMetrics,
  type ComplianceDashboard,
  type ComplianceOverallStatus,
  type KycComplianceStatus,
  type AmlComplianceStatus,
  type MonitoringStatus,
  type ReportingStatus,
  type ComplianceIssue,
  type ProcessingResult,
} from './reporting';

// Export risk controls
export {
  DefaultRiskControlManager,
  createRiskControlManager,
  HISTORICAL_STRESS_SCENARIOS,
  type RiskControlManager,
  type PortfolioState,
  type Position,
  type HistoricalReturn,
  type MarketDataSnapshot,
  type LimitCheckResult,
  type TransactionImpactRequest,
  type TransactionImpactResult,
  type ImpactDetail,
  type RiskControlAlert,
} from './risk-controls';

// Export AI governance
export {
  DefaultAIGovernanceManager,
  createAIGovernanceManager,
  type AIGovernanceManager,
  type DecisionRecordInput,
  type DecisionFilters,
  type HumanReviewRequirement,
  type HumanReviewInput,
  type DecisionOutcomeInput,
  type ProposedDecision,
  type SafetyCheckResult,
  type SafetyViolation,
  type SafetyWarning,
  type AnalyticsPeriod,
  type DecisionAnalytics,
  type ReviewMetrics,
  type ModelPerformanceMetrics,
  type TypePerformance,
} from './ai-governance';

// ============================================================================
// Unified Institutional Manager
// ============================================================================

import { DefaultAccountManager, createAccountManager } from './accounts';
import { DefaultKycAmlManager, createKycAmlManager } from './kyc-aml';
import { DefaultApprovalWorkflowManager, createApprovalWorkflowManager } from './approval-workflow';
import { DefaultReportingManager, createReportingManager } from './reporting';
import { DefaultRiskControlManager, createRiskControlManager } from './risk-controls';
import { DefaultAIGovernanceManager, createAIGovernanceManager } from './ai-governance';
import { InstitutionalEventCallback, InstitutionalEvent } from './types';

export interface InstitutionalManager {
  readonly accounts: DefaultAccountManager;
  readonly kyc: DefaultKycAmlManager;
  readonly workflows: DefaultApprovalWorkflowManager;
  readonly reporting: DefaultReportingManager;
  readonly risk: DefaultRiskControlManager;
  readonly aiGovernance: DefaultAIGovernanceManager;

  // Unified event handling
  onEvent(callback: InstitutionalEventCallback): void;

  // Convenience methods
  initializeAccount(
    name: string,
    type: string,
    creatorUserId: string
  ): Promise<InitializationResult>;
}

export interface InitializationResult {
  accountId: string;
  kycProfileId: string;
  monitorId: string;
  riskConfigured: boolean;
  reportingConfigured: boolean;
  workflowsInitialized: boolean;
  aiGovernanceConfigured: boolean;
}

export class DefaultInstitutionalManager implements InstitutionalManager {
  readonly accounts: DefaultAccountManager;
  readonly kyc: DefaultKycAmlManager;
  readonly workflows: DefaultApprovalWorkflowManager;
  readonly reporting: DefaultReportingManager;
  readonly risk: DefaultRiskControlManager;
  readonly aiGovernance: DefaultAIGovernanceManager;

  private readonly eventCallbacks: InstitutionalEventCallback[] = [];

  constructor() {
    this.accounts = createAccountManager();
    this.kyc = createKycAmlManager();
    this.workflows = createApprovalWorkflowManager();
    this.reporting = createReportingManager();
    this.risk = createRiskControlManager();
    this.aiGovernance = createAIGovernanceManager();

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  async initializeAccount(
    name: string,
    type: string,
    creatorUserId: string
  ): Promise<InitializationResult> {
    // Create account
    const account = await this.accounts.createAccount(
      name,
      type as any,
      creatorUserId
    );

    // Create KYC profile
    const kycProfile = await this.kyc.createProfile(account.id, 'institutional');

    // Create transaction monitor
    const monitor = await this.kyc.createMonitor(account.id);

    // Configure risk controls
    await this.risk.configureRisk(account.id, { enabled: true });

    // Configure reporting
    await this.reporting.configureReporting(account.id, { enabled: true });

    // Initialize approval workflows
    await this.workflows.initializeDefaultWorkflows(account.id, creatorUserId);

    // Configure AI governance
    await this.aiGovernance.configureGovernance(account.id, { enabled: true });

    return {
      accountId: account.id,
      kycProfileId: kycProfile.id,
      monitorId: monitor.id,
      riskConfigured: true,
      reportingConfigured: true,
      workflowsInitialized: true,
      aiGovernanceConfigured: true,
    };
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: InstitutionalEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.accounts.onEvent(forwardEvent);
    this.kyc.onEvent(forwardEvent);
    this.workflows.onEvent(forwardEvent);
    this.reporting.onEvent(forwardEvent);
    this.risk.onEvent(forwardEvent);
    this.aiGovernance.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createInstitutionalManager(): DefaultInstitutionalManager {
  return new DefaultInstitutionalManager();
}

// Default export
export default DefaultInstitutionalManager;
