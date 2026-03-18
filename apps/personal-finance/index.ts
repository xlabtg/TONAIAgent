/**
 * TONAIAgent - Personal Finance Layer
 *
 * AI-native personal finance platform that enables everyday users to automate
 * savings, investments, and financial decisions through intelligent agents.
 *
 * Features:
 * - AI Financial Assistant (powered by Groq)
 * - Automated Savings with smart allocation
 * - Personalized Investment and Portfolio Management
 * - Life-Stage Personalization
 * - Behavioral Finance Layer
 * - Financial Education with gamification
 * - Smart Notifications and Nudges
 * - Comprehensive Financial Dashboard
 *
 * @example
 * ```typescript
 * import {
 *   createPersonalFinanceManager,
 *   PersonalFinanceConfig,
 * } from '@tonaiagent/core/personal-finance';
 *
 * // Create the personal finance manager
 * const finance = createPersonalFinanceManager();
 *
 * // Create user profile
 * const profile = await finance.personalization.createProfile({
 *   userId: 'user-1',
 *   name: 'John Doe',
 *   monthlyIncome: 5000,
 *   monthlyExpenses: 3500,
 *   totalAssets: 50000,
 *   totalLiabilities: 10000,
 * });
 *
 * // Start AI conversation
 * const conversation = await finance.aiAssistant.startConversation('user-1');
 * const response = await finance.aiAssistant.sendMessage(
 *   conversation.id,
 *   'Help me save more money'
 * );
 *
 * // Set up automated savings
 * const automation = await finance.savings.createAutomation({
 *   userId: 'user-1',
 *   name: 'Weekly Savings',
 *   type: 'fixed_amount',
 *   rule: { type: 'fixed_amount', amount: 100, frequency: 'weekly' },
 * });
 *
 * // Get financial dashboard
 * const dashboard = await finance.dashboard.generateDashboard('user-1');
 * ```
 */

// Export all types
export * from './types';

// Export AI Assistant
export {
  DefaultAIAssistantManager,
  createAIAssistantManager,
  type AIAssistantManager,
  type AIAssistantResponse,
  type ActionExecutionResult,
  type IntentAnalysis,
} from './ai-assistant';

// Export Savings Automation
export {
  DefaultSavingsAutomationManager,
  createSavingsAutomationManager,
  type SavingsAutomationManager,
  type CreateAutomationParams,
  type UpdateAutomationParams,
  type SavingsExecutionResult,
  type SavingsCalculation,
  type GoalAllocationResult,
  type UserSavingsStatistics,
  type SavingsHistoryEntry,
  type SavingsSuggestion,
  type SuggestedRule,
} from './savings-automation';

// Export Portfolio Manager
export {
  DefaultPortfolioManager,
  createPortfolioManager,
  type PortfolioManager,
  type CreatePortfolioParams,
  type UpdatePortfolioParams,
  type AddHoldingParams,
  type RiskAssessmentAnswers,
  type SuggestedAllocation,
  type OptimizationResult,
  type DriftAnalysis,
  type RebalanceCheck,
  type RebalancePlan,
  type RebalanceResult,
  type DCAExecutionResult,
  type PortfolioAnalysis,
  type PortfolioRecommendation,
} from './portfolio-manager';

// Export Personalization Manager
export {
  DefaultPersonalizationManager,
  createPersonalizationManager,
  type PersonalizationManager,
  type CreateProfileParams,
  type UpdateProfileParams,
  type LifeStageAssessmentParams,
  type LifeStageResult,
  type LifeStageRecommendations,
  type BiasAssessmentResponses,
  type InterventionContext,
  type InterventionResult,
  type PersonalizedRecommendation,
  type DetectedPattern,
  type DecisionRecord,
} from './personalization';

// Export Education Manager
export {
  DefaultEducationManager,
  createEducationManager,
  type EducationManager,
  type LearningSession,
  type LessonCompletion,
  type QuizSession,
  type QuizResult,
  type SimulationSession,
  type SimulationState,
  type SimulationResult,
  type LeaderboardEntry,
  type Achievement,
  type LearningPath,
} from './education';

// Export Notification Manager
export {
  DefaultNotificationManager,
  createNotificationManager,
  type NotificationManager,
  type SendNotificationParams,
  type NotificationFilters,
  type CreateNudgeParams,
  type NudgeSendResult,
  type NudgeOutcome,
  type NudgeAnalytics,
  type ScheduledNotification,
  type NotificationTrigger,
  type NotificationStats,
  type NudgeEffectivenessReport,
} from './notifications';

// Export Dashboard Manager
export {
  DefaultDashboardManager,
  createDashboardManager,
  type DashboardManager,
  type DashboardDataSources,
  type PerformancePoint,
} from './dashboard';

// ============================================================================
// Import Components for Unified Manager
// ============================================================================

import { DefaultAIAssistantManager, createAIAssistantManager } from './ai-assistant';
import { DefaultSavingsAutomationManager, createSavingsAutomationManager } from './savings-automation';
import { DefaultPortfolioManager, createPortfolioManager } from './portfolio-manager';
import { DefaultPersonalizationManager, createPersonalizationManager } from './personalization';
import { DefaultEducationManager, createEducationManager } from './education';
import { DefaultNotificationManager, createNotificationManager } from './notifications';
import { DefaultDashboardManager, createDashboardManager } from './dashboard';
import {
  PersonalFinanceConfig,
  PersonalFinanceEvent,
  PersonalFinanceEventCallback,
} from './types';

// ============================================================================
// Unified Personal Finance Manager
// ============================================================================

export interface PersonalFinanceManager {
  readonly enabled: boolean;
  readonly aiAssistant: DefaultAIAssistantManager;
  readonly savings: DefaultSavingsAutomationManager;
  readonly portfolio: DefaultPortfolioManager;
  readonly personalization: DefaultPersonalizationManager;
  readonly education: DefaultEducationManager;
  readonly notifications: DefaultNotificationManager;
  readonly dashboard: DefaultDashboardManager;

  // Health check
  getHealth(): Promise<PersonalFinanceHealth>;

  // Statistics
  getStats(): Promise<PersonalFinanceStats>;

  // Events
  onEvent(callback: PersonalFinanceEventCallback): void;
}

export interface PersonalFinanceHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    aiAssistant: boolean;
    savings: boolean;
    portfolio: boolean;
    personalization: boolean;
    education: boolean;
    notifications: boolean;
    dashboard: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export interface PersonalFinanceStats {
  activeUsers: number;
  totalSavings: number;
  activeGoals: number;
  completedGoals: number;
  totalPortfolioValue: number;
  educationModulesCompleted: number;
  nudgesSent: number;
  avgEngagementScore: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultPersonalFinanceManager implements PersonalFinanceManager {
  readonly enabled: boolean;
  readonly aiAssistant: DefaultAIAssistantManager;
  readonly savings: DefaultSavingsAutomationManager;
  readonly portfolio: DefaultPortfolioManager;
  readonly personalization: DefaultPersonalizationManager;
  readonly education: DefaultEducationManager;
  readonly notifications: DefaultNotificationManager;
  readonly dashboard: DefaultDashboardManager;

  private readonly eventCallbacks: PersonalFinanceEventCallback[] = [];

  constructor(config?: Partial<PersonalFinanceConfig>) {
    this.enabled = true;

    // Initialize all components
    this.aiAssistant = createAIAssistantManager(config?.aiAssistant);
    this.savings = createSavingsAutomationManager(config?.savings);
    this.portfolio = createPortfolioManager(config?.investment);
    this.personalization = createPersonalizationManager(config?.behavioral);
    this.education = createEducationManager(config?.education);
    this.notifications = createNotificationManager(config?.notifications);
    this.dashboard = createDashboardManager();

    // Wire up dashboard data sources
    this.dashboard.setDataSources({
      getProfile: (userId) => this.personalization.getProfile(userId),
      getPortfolios: (userId) => this.portfolio.getUserPortfolios(userId),
      getGoals: async (userId) => {
        const profile = await this.personalization.getProfile(userId);
        return profile?.goals ?? [];
      },
      getSavingsAutomations: (userId) => this.savings.getUserAutomations(userId),
    });

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<PersonalFinanceHealth> {
    const components = {
      aiAssistant: true,
      savings: this.savings.config.enabled,
      portfolio: this.portfolio.config.enabled,
      personalization: this.personalization.config.enabled,
      education: this.education.config.enabled,
      notifications: this.notifications.config.enabled,
      dashboard: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: PersonalFinanceHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      lastCheck: new Date(),
      details: {
        aiAssistantEnabled: this.aiAssistant.config.enabled,
        savingsEnabled: this.savings.config.enabled,
        portfolioEnabled: this.portfolio.config.enabled,
        personalizationEnabled: this.personalization.config.enabled,
        educationEnabled: this.education.config.enabled,
        notificationsEnabled: this.notifications.config.enabled,
      },
    };
  }

  async getStats(): Promise<PersonalFinanceStats> {
    // In a real implementation, these would be aggregated from the database
    return {
      activeUsers: 0,
      totalSavings: 0,
      activeGoals: 0,
      completedGoals: 0,
      totalPortfolioValue: 0,
      educationModulesCompleted: 0,
      nudgesSent: 0,
      avgEngagementScore: 0,
    };
  }

  onEvent(callback: PersonalFinanceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: PersonalFinanceEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.aiAssistant.onEvent(forwardEvent);
    this.savings.onEvent(forwardEvent);
    this.portfolio.onEvent(forwardEvent);
    this.personalization.onEvent(forwardEvent);
    this.education.onEvent(forwardEvent);
    this.notifications.onEvent(forwardEvent);
    this.dashboard.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPersonalFinanceManager(
  config?: Partial<PersonalFinanceConfig>
): DefaultPersonalFinanceManager {
  return new DefaultPersonalFinanceManager(config);
}

// Default export
export default DefaultPersonalFinanceManager;
