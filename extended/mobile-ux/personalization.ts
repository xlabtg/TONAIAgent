/**
 * TONAIAgent - Personalization Layer
 *
 * Adapts UX to:
 * - Beginner users
 * - Advanced users
 * - Institutional users
 */

import {
  UserProfile,
  UserLevel,
  UserPreferences,
  DashboardWidget,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Personalization manager configuration
 */
export interface PersonalizationConfig {
  /** Enable adaptive UI */
  adaptiveUI?: boolean;
  /** Enable recommendations */
  enableRecommendations?: boolean;
  /** Enable learning */
  enableLearning?: boolean;
  /** Learning rate (0-1) */
  learningRate?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<PersonalizationConfig> = {
  adaptiveUI: true,
  enableRecommendations: true,
  enableLearning: true,
  learningRate: 0.1,
};

// ============================================================================
// Level-Based Configurations
// ============================================================================

/**
 * UI configuration per level
 */
interface LevelUIConfig {
  /** Complexity level (1-10) */
  complexity: number;
  /** Features to show */
  visibleFeatures: string[];
  /** Features to hide */
  hiddenFeatures: string[];
  /** Default dashboard widgets */
  dashboardWidgets: string[];
  /** Quick actions */
  quickActions: string[];
  /** Help level */
  helpLevel: 'extensive' | 'moderate' | 'minimal';
  /** Risk warnings */
  riskWarnings: 'all' | 'critical' | 'none';
  /** Confirmation level */
  confirmationLevel: 'always' | 'important' | 'minimal';
  /** Tutorial prompts */
  showTutorials: boolean;
  /** Advanced settings visible */
  advancedSettings: boolean;
}

const LEVEL_CONFIGS: Record<UserLevel, LevelUIConfig> = {
  beginner: {
    complexity: 2,
    visibleFeatures: [
      'portfolio_overview',
      'simple_swap',
      'send_receive',
      'basic_strategies',
      'help_center',
    ],
    hiddenFeatures: [
      'advanced_analytics',
      'custom_strategies',
      'api_access',
      'institutional',
      'margin_trading',
    ],
    dashboardWidgets: ['portfolio_summary', 'quick_actions', 'tutorial_cards', 'price_alerts'],
    quickActions: ['swap', 'send', 'receive'],
    helpLevel: 'extensive',
    riskWarnings: 'all',
    confirmationLevel: 'always',
    showTutorials: true,
    advancedSettings: false,
  },
  intermediate: {
    complexity: 5,
    visibleFeatures: [
      'portfolio_overview',
      'advanced_swap',
      'send_receive',
      'strategy_builder',
      'analytics',
      'staking',
      'marketplace',
    ],
    hiddenFeatures: ['institutional', 'margin_trading', 'api_access'],
    dashboardWidgets: [
      'portfolio_summary',
      'quick_actions',
      'active_strategies',
      'performance_chart',
      'price_alerts',
    ],
    quickActions: ['swap', 'send', 'receive', 'stake', 'strategies'],
    helpLevel: 'moderate',
    riskWarnings: 'critical',
    confirmationLevel: 'important',
    showTutorials: false,
    advancedSettings: true,
  },
  advanced: {
    complexity: 8,
    visibleFeatures: [
      'portfolio_overview',
      'advanced_swap',
      'send_receive',
      'custom_strategies',
      'advanced_analytics',
      'staking',
      'marketplace',
      'copy_trading',
      'api_access',
    ],
    hiddenFeatures: ['institutional'],
    dashboardWidgets: [
      'portfolio_summary',
      'quick_actions',
      'active_strategies',
      'performance_chart',
      'risk_metrics',
      'market_data',
    ],
    quickActions: ['swap', 'send', 'strategies', 'analytics', 'marketplace'],
    helpLevel: 'minimal',
    riskWarnings: 'critical',
    confirmationLevel: 'minimal',
    showTutorials: false,
    advancedSettings: true,
  },
  institutional: {
    complexity: 10,
    visibleFeatures: [
      'portfolio_overview',
      'advanced_swap',
      'send_receive',
      'custom_strategies',
      'advanced_analytics',
      'staking',
      'marketplace',
      'copy_trading',
      'api_access',
      'institutional',
      'compliance',
      'reporting',
      'multi_user',
    ],
    hiddenFeatures: [],
    dashboardWidgets: [
      'portfolio_summary',
      'compliance_status',
      'risk_dashboard',
      'active_strategies',
      'team_activity',
      'audit_log',
    ],
    quickActions: ['strategies', 'analytics', 'compliance', 'reports', 'team'],
    helpLevel: 'minimal',
    riskWarnings: 'all', // Institutional requires all warnings
    confirmationLevel: 'always', // Institutional requires all confirmations
    showTutorials: false,
    advancedSettings: true,
  },
};

// ============================================================================
// Personalization Manager
// ============================================================================

/**
 * User behavior metrics
 */
export interface UserBehavior {
  /** Most used features */
  frequentFeatures: Record<string, number>;
  /** Average session duration */
  avgSessionDuration: number;
  /** Preferred actions */
  preferredActions: string[];
  /** Error frequency */
  errorFrequency: number;
  /** Help requests */
  helpRequests: number;
  /** Successful transactions */
  successfulTransactions: number;
  /** Failed transactions */
  failedTransactions: number;
}

/**
 * Recommendation
 */
export interface Recommendation {
  id: string;
  type: 'feature' | 'strategy' | 'action' | 'tip';
  title: string;
  description: string;
  action?: string;
  priority: number;
  relevanceScore: number;
}

/**
 * Personalized UI settings
 */
export interface PersonalizedUI {
  /** Dashboard widgets */
  widgets: DashboardWidget[];
  /** Quick actions */
  quickActions: QuickAction[];
  /** Visible features */
  visibleFeatures: string[];
  /** Hidden features */
  hiddenFeatures: string[];
  /** Help level */
  helpLevel: 'extensive' | 'moderate' | 'minimal';
  /** Show tutorials */
  showTutorials: boolean;
  /** Complexity level */
  complexity: number;
}

/**
 * Quick action configuration
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  primary?: boolean;
}

/**
 * Level progression status
 */
export interface LevelProgress {
  currentLevel: UserLevel;
  nextLevel?: UserLevel;
  progressPercent: number;
  requirements: LevelRequirement[];
  estimatedTimeToNextLevel?: number;
}

/**
 * Level requirement
 */
export interface LevelRequirement {
  id: string;
  description: string;
  completed: boolean;
  progress: number;
  target: number;
}

/**
 * Manages user personalization
 */
export class PersonalizationManager {
  private readonly config: Required<PersonalizationConfig>;
  private userProfiles: Map<string, UserProfile> = new Map();
  private userBehaviors: Map<string, UserBehavior> = new Map();

  constructor(config: Partial<PersonalizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * Set user profile
   */
  setUserProfile(profile: UserProfile): void {
    this.userProfiles.set(profile.telegramId, profile);

    // Initialize behavior tracking
    if (!this.userBehaviors.has(profile.telegramId)) {
      this.userBehaviors.set(profile.telegramId, {
        frequentFeatures: {},
        avgSessionDuration: 0,
        preferredActions: [],
        errorFrequency: 0,
        helpRequests: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
      });
    }
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): UserProfile | undefined {
    return this.userProfiles.get(userId);
  }

  /**
   * Update user preferences
   */
  updatePreferences(userId: string, preferences: Partial<UserPreferences>): boolean {
    const profile = this.userProfiles.get(userId);
    if (!profile) return false;

    profile.preferences = { ...profile.preferences, ...preferences };
    return true;
  }

  /**
   * Get user level
   */
  getUserLevel(userId: string): UserLevel {
    return this.userProfiles.get(userId)?.level ?? 'beginner';
  }

  /**
   * Update user level
   */
  updateUserLevel(userId: string, level: UserLevel): boolean {
    const profile = this.userProfiles.get(userId);
    if (!profile) return false;

    profile.level = level;
    return true;
  }

  // ============================================================================
  // Personalized UI
  // ============================================================================

  /**
   * Get personalized UI configuration
   */
  getPersonalizedUI(userId: string): PersonalizedUI {
    const profile = this.userProfiles.get(userId);
    const level = profile?.level ?? 'beginner';
    const levelConfig = LEVEL_CONFIGS[level];
    const behavior = this.userBehaviors.get(userId);

    // Get base widgets for level
    const widgets = this.getWidgetsForLevel(level, behavior);

    // Get quick actions (personalized based on behavior)
    const quickActions = this.getQuickActionsForUser(levelConfig, behavior);

    return {
      widgets,
      quickActions,
      visibleFeatures: levelConfig.visibleFeatures,
      hiddenFeatures: levelConfig.hiddenFeatures,
      helpLevel: levelConfig.helpLevel,
      showTutorials: levelConfig.showTutorials,
      complexity: levelConfig.complexity,
    };
  }

  /**
   * Get widgets for level
   */
  private getWidgetsForLevel(level: UserLevel, behavior?: UserBehavior): DashboardWidget[] {
    const levelConfig = LEVEL_CONFIGS[level];
    const widgets: DashboardWidget[] = [];

    let yPos = 0;
    for (const widgetId of levelConfig.dashboardWidgets) {
      widgets.push({
        id: widgetId,
        type: widgetId,
        title: this.getWidgetTitle(widgetId),
        position: { x: 0, y: yPos, w: 2, h: 1 },
        config: {},
        minimizable: true,
        removable: widgetId !== 'portfolio_summary',
      });
      yPos++;
    }

    // Add personalized widgets based on behavior
    if (behavior && this.config.adaptiveUI) {
      const topFeatures = Object.entries(behavior.frequentFeatures)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([feature]) => feature);

      for (const feature of topFeatures) {
        if (!levelConfig.dashboardWidgets.includes(feature)) {
          widgets.push({
            id: `personalized_${feature}`,
            type: feature,
            title: this.getWidgetTitle(feature),
            position: { x: 0, y: yPos, w: 2, h: 1 },
            config: {},
            minimizable: true,
            removable: true,
          });
          yPos++;
        }
      }
    }

    return widgets;
  }

  /**
   * Get quick actions for user
   */
  private getQuickActionsForUser(
    levelConfig: LevelUIConfig,
    behavior?: UserBehavior
  ): QuickAction[] {
    const actions: QuickAction[] = [];

    // Base actions from level config
    for (const actionId of levelConfig.quickActions) {
      actions.push(this.createQuickAction(actionId));
    }

    // Add personalized actions based on behavior
    if (behavior && this.config.adaptiveUI && behavior.preferredActions.length > 0) {
      const preferredNotInBase = behavior.preferredActions
        .filter((a) => !levelConfig.quickActions.includes(a))
        .slice(0, 2);

      for (const actionId of preferredNotInBase) {
        actions.push(this.createQuickAction(actionId));
      }
    }

    return actions.slice(0, 6); // Max 6 quick actions
  }

  /**
   * Create quick action object
   */
  private createQuickAction(actionId: string): QuickAction {
    const actionMap: Record<string, QuickAction> = {
      swap: { id: 'swap', label: 'Swap', icon: '🔄', action: 'open_swap', primary: true },
      send: { id: 'send', label: 'Send', icon: '📤', action: 'open_send' },
      receive: { id: 'receive', label: 'Receive', icon: '📥', action: 'open_receive' },
      stake: { id: 'stake', label: 'Stake', icon: '🥩', action: 'open_staking' },
      strategies: { id: 'strategies', label: 'Strategies', icon: '📈', action: 'open_strategies' },
      analytics: { id: 'analytics', label: 'Analytics', icon: '📊', action: 'open_analytics' },
      marketplace: { id: 'marketplace', label: 'Explore', icon: '🏪', action: 'open_marketplace' },
      compliance: { id: 'compliance', label: 'Compliance', icon: '✅', action: 'open_compliance' },
      reports: { id: 'reports', label: 'Reports', icon: '📋', action: 'open_reports' },
      team: { id: 'team', label: 'Team', icon: '👥', action: 'open_team' },
    };

    return actionMap[actionId] ?? { id: actionId, label: actionId, icon: '⚡', action: actionId };
  }

  /**
   * Get widget title
   */
  private getWidgetTitle(widgetId: string): string {
    const titles: Record<string, string> = {
      portfolio_summary: 'Portfolio',
      quick_actions: 'Quick Actions',
      active_strategies: 'Active Strategies',
      performance_chart: 'Performance',
      tutorial_cards: 'Getting Started',
      price_alerts: 'Alerts',
      risk_metrics: 'Risk',
      market_data: 'Markets',
      compliance_status: 'Compliance',
      risk_dashboard: 'Risk Dashboard',
      team_activity: 'Team Activity',
      audit_log: 'Audit Log',
    };

    return titles[widgetId] ?? widgetId;
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  /**
   * Get recommendations for user
   */
  getRecommendations(userId: string): Recommendation[] {
    if (!this.config.enableRecommendations) return [];

    const profile = this.userProfiles.get(userId);
    const behavior = this.userBehaviors.get(userId);
    const level = profile?.level ?? 'beginner';

    const recommendations: Recommendation[] = [];

    // Level-based recommendations
    recommendations.push(...this.getLevelRecommendations(level, behavior));

    // Behavior-based recommendations
    if (behavior) {
      recommendations.push(...this.getBehaviorRecommendations(behavior, level));
    }

    // Sort by relevance
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return recommendations.slice(0, 5);
  }

  /**
   * Get level-based recommendations
   */
  private getLevelRecommendations(
    level: UserLevel,
    _behavior?: UserBehavior
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (level === 'beginner') {
      recommendations.push({
        id: 'tutorial_complete',
        type: 'tip',
        title: 'Complete the Tutorial',
        description: 'Learn the basics of autonomous finance in 5 minutes',
        action: 'open_tutorial',
        priority: 10,
        relevanceScore: 0.95,
      });

      recommendations.push({
        id: 'first_strategy',
        type: 'strategy',
        title: 'Try Your First Strategy',
        description: 'Set up a simple DCA strategy with low risk',
        action: 'create_dca_strategy',
        priority: 9,
        relevanceScore: 0.9,
      });
    }

    if (level === 'intermediate') {
      recommendations.push({
        id: 'explore_marketplace',
        type: 'feature',
        title: 'Explore the Marketplace',
        description: 'Discover proven strategies from other traders',
        action: 'open_marketplace',
        priority: 8,
        relevanceScore: 0.85,
      });
    }

    if (level === 'advanced') {
      recommendations.push({
        id: 'api_integration',
        type: 'feature',
        title: 'API Access Available',
        description: 'Integrate with your own tools using our API',
        action: 'open_api_docs',
        priority: 7,
        relevanceScore: 0.8,
      });
    }

    return recommendations;
  }

  /**
   * Get behavior-based recommendations
   */
  private getBehaviorRecommendations(
    behavior: UserBehavior,
    level: UserLevel
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // If user has many failed transactions
    if (behavior.failedTransactions > 3) {
      recommendations.push({
        id: 'tx_help',
        type: 'tip',
        title: 'Transaction Tips',
        description: 'Learn how to avoid common transaction errors',
        action: 'open_tx_help',
        priority: 9,
        relevanceScore: 0.92,
      });
    }

    // If user asks for help frequently
    if (behavior.helpRequests > 5) {
      recommendations.push({
        id: 'guided_mode',
        type: 'tip',
        title: 'Try Guided Mode',
        description: 'Get step-by-step assistance for all actions',
        action: 'enable_guided_mode',
        priority: 8,
        relevanceScore: 0.88,
      });
    }

    // Recommend features based on usage patterns
    const underusedFeatures = this.getUnderusedFeatures(behavior, level);
    for (const feature of underusedFeatures.slice(0, 2)) {
      recommendations.push({
        id: `discover_${feature}`,
        type: 'feature',
        title: `Discover ${this.featureToTitle(feature)}`,
        description: `You haven't tried ${this.featureToTitle(feature)} yet`,
        action: `open_${feature}`,
        priority: 6,
        relevanceScore: 0.75,
      });
    }

    return recommendations;
  }

  /**
   * Get underused features for level
   */
  private getUnderusedFeatures(behavior: UserBehavior, level: UserLevel): string[] {
    const levelConfig = LEVEL_CONFIGS[level];
    const usedFeatures = new Set(Object.keys(behavior.frequentFeatures));

    return levelConfig.visibleFeatures.filter(
      (f) => !usedFeatures.has(f) && !levelConfig.hiddenFeatures.includes(f)
    );
  }

  /**
   * Convert feature ID to title
   */
  private featureToTitle(feature: string): string {
    return feature
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // ============================================================================
  // Behavior Tracking
  // ============================================================================

  /**
   * Track feature usage
   */
  trackFeatureUsage(userId: string, feature: string): void {
    if (!this.config.enableLearning) return;

    const behavior = this.userBehaviors.get(userId);
    if (!behavior) return;

    behavior.frequentFeatures[feature] = (behavior.frequentFeatures[feature] ?? 0) + 1;

    // Update preferred actions
    this.updatePreferredActions(behavior);
  }

  /**
   * Track transaction result
   */
  trackTransaction(userId: string, success: boolean): void {
    if (!this.config.enableLearning) return;

    const behavior = this.userBehaviors.get(userId);
    if (!behavior) return;

    if (success) {
      behavior.successfulTransactions++;
    } else {
      behavior.failedTransactions++;
    }
  }

  /**
   * Track help request
   */
  trackHelpRequest(userId: string): void {
    if (!this.config.enableLearning) return;

    const behavior = this.userBehaviors.get(userId);
    if (behavior) {
      behavior.helpRequests++;
    }
  }

  /**
   * Track session duration
   */
  trackSessionDuration(userId: string, durationSeconds: number): void {
    if (!this.config.enableLearning) return;

    const behavior = this.userBehaviors.get(userId);
    if (!behavior) return;

    // Exponential moving average
    const alpha = this.config.learningRate;
    behavior.avgSessionDuration =
      alpha * durationSeconds + (1 - alpha) * behavior.avgSessionDuration;
  }

  /**
   * Update preferred actions based on frequency
   */
  private updatePreferredActions(behavior: UserBehavior): void {
    behavior.preferredActions = Object.entries(behavior.frequentFeatures)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature);
  }

  // ============================================================================
  // Level Progression
  // ============================================================================

  /**
   * Get level progress
   */
  getLevelProgress(userId: string): LevelProgress {
    const profile = this.userProfiles.get(userId);
    const behavior = this.userBehaviors.get(userId);
    const currentLevel = profile?.level ?? 'beginner';

    const requirements = this.getLevelRequirements(currentLevel, behavior);
    const completedRequirements = requirements.filter((r) => r.completed).length;
    const progressPercent = (completedRequirements / requirements.length) * 100;

    const nextLevel = this.getNextLevel(currentLevel);

    return {
      currentLevel,
      nextLevel,
      progressPercent,
      requirements,
      estimatedTimeToNextLevel: nextLevel ? this.estimateTimeToNextLevel(requirements) : undefined,
    };
  }

  /**
   * Get level requirements
   */
  private getLevelRequirements(level: UserLevel, behavior?: UserBehavior): LevelRequirement[] {
    const transactions = behavior?.successfulTransactions ?? 0;
    const features = Object.keys(behavior?.frequentFeatures ?? {}).length;

    if (level === 'beginner') {
      return [
        {
          id: 'complete_transactions',
          description: 'Complete 5 successful transactions',
          completed: transactions >= 5,
          progress: Math.min(transactions, 5),
          target: 5,
        },
        {
          id: 'explore_features',
          description: 'Explore 3 different features',
          completed: features >= 3,
          progress: Math.min(features, 3),
          target: 3,
        },
        {
          id: 'create_strategy',
          description: 'Create your first strategy',
          completed: (behavior?.frequentFeatures['strategies'] ?? 0) > 0,
          progress: Math.min(behavior?.frequentFeatures['strategies'] ?? 0, 1),
          target: 1,
        },
      ];
    }

    if (level === 'intermediate') {
      return [
        {
          id: 'complete_transactions',
          description: 'Complete 25 successful transactions',
          completed: transactions >= 25,
          progress: Math.min(transactions, 25),
          target: 25,
        },
        {
          id: 'active_strategies',
          description: 'Run 3 strategies simultaneously',
          completed: false, // Would check actual strategy count
          progress: 0,
          target: 3,
        },
        {
          id: 'use_analytics',
          description: 'Use advanced analytics',
          completed: (behavior?.frequentFeatures['analytics'] ?? 0) >= 5,
          progress: Math.min(behavior?.frequentFeatures['analytics'] ?? 0, 5),
          target: 5,
        },
      ];
    }

    return [];
  }

  /**
   * Get next level
   */
  private getNextLevel(currentLevel: UserLevel): UserLevel | undefined {
    const levelOrder: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'institutional'];
    const currentIndex = levelOrder.indexOf(currentLevel);

    if (currentIndex < levelOrder.length - 1) {
      return levelOrder[currentIndex + 1];
    }

    return undefined;
  }

  /**
   * Estimate time to next level (in days)
   */
  private estimateTimeToNextLevel(requirements: LevelRequirement[]): number {
    const incompleteRequirements = requirements.filter((r) => !r.completed);

    if (incompleteRequirements.length === 0) return 0;

    // Simple estimation based on progress rate
    let totalEstimate = 0;
    for (const req of incompleteRequirements) {
      const remaining = req.target - req.progress;
      const rate = req.progress > 0 ? req.progress / 7 : 0.5; // Assume 7 days of activity
      totalEstimate += remaining / rate;
    }

    return Math.ceil(totalEstimate / incompleteRequirements.length);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a PersonalizationManager
 */
export function createPersonalizationManager(
  config?: Partial<PersonalizationConfig>
): PersonalizationManager {
  return new PersonalizationManager(config);
}

/**
 * Get level configuration
 */
export function getLevelConfig(level: UserLevel): LevelUIConfig {
  return LEVEL_CONFIGS[level];
}
