/**
 * TONAIAgent - Smart Spending Optimizer
 *
 * AI-driven spending optimization enabling budgeting, cost reduction,
 * dynamic payment routing, reward maximization, and intelligent spending rules.
 */

import {
  SpendingProfile,
  BudgetConfig,
  SpendingCategory,
  SpendingRule,
  SpendingRuleType,
  RuleCondition,
  RuleAction,
  OptimizationRecommendation,
  AppliedOptimization,
  SpendingInsight,
  SpendingAlert,
  SpendingHistoryEntry,
  SmartSpendingConfig,
  PaymentsEvent,
  PaymentsEventCallback,
  Payment,
} from './types';

// ============================================================================
// Smart Spending Interface
// ============================================================================

export interface SmartSpendingManager {
  readonly config: SmartSpendingConfig;

  // Profile management
  createProfile(userId: string, params: CreateProfileParams): Promise<SpendingProfile>;
  updateProfile(userId: string, updates: Partial<SpendingProfile>): Promise<SpendingProfile>;
  getProfile(userId: string): Promise<SpendingProfile | null>;
  deleteProfile(userId: string): Promise<void>;

  // Budget management
  setBudget(userId: string, budget: Partial<BudgetConfig>): Promise<SpendingProfile>;
  getCategorySpending(userId: string, category?: string): Promise<SpendingCategory[]>;
  getBudgetStatus(userId: string): Promise<BudgetStatus>;

  // Spending rules
  createRule(userId: string, rule: CreateRuleParams): Promise<SpendingRule>;
  updateRule(userId: string, ruleId: string, updates: Partial<SpendingRule>): Promise<SpendingRule>;
  deleteRule(userId: string, ruleId: string): Promise<void>;
  listRules(userId: string, type?: SpendingRuleType): Promise<SpendingRule[]>;
  evaluateRule(rule: SpendingRule, payment: Payment): Promise<RuleEvaluationResult>;

  // Payment analysis
  analyzePayment(userId: string, payment: Payment): Promise<PaymentAnalysis>;
  categorizePayment(payment: Payment): Promise<CategoryResult>;
  checkLimits(userId: string, payment: Payment): Promise<LimitCheckResult>;

  // Optimization
  getOptimizationRecommendations(userId: string): Promise<OptimizationRecommendation[]>;
  applyOptimization(userId: string, recommendationId: string): Promise<AppliedOptimization>;
  dismissRecommendation(userId: string, recommendationId: string): Promise<void>;
  getOptimizationHistory(userId: string): Promise<AppliedOptimization[]>;

  // Insights
  generateInsights(userId: string): Promise<SpendingInsight[]>;
  getInsight(userId: string, insightId: string): Promise<SpendingInsight | null>;
  acknowledgeInsight(userId: string, insightId: string): Promise<void>;

  // Alerts
  createAlert(userId: string, alert: CreateAlertParams): Promise<SpendingAlert>;
  updateAlert(userId: string, alertId: string, updates: Partial<SpendingAlert>): Promise<SpendingAlert>;
  deleteAlert(userId: string, alertId: string): Promise<void>;
  listAlerts(userId: string): Promise<SpendingAlert[]>;
  snoozeAlert(userId: string, alertId: string, until: Date): Promise<SpendingAlert>;

  // Analytics
  getSpendingHistory(userId: string, period: 'week' | 'month' | 'year'): Promise<SpendingHistoryEntry[]>;
  getSpendingTrends(userId: string): Promise<SpendingTrends>;
  compareWithBudget(userId: string): Promise<BudgetComparison>;

  // Events
  onEvent(callback: PaymentsEventCallback): void;
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface CreateProfileParams {
  budget?: Partial<BudgetConfig>;
  categories?: { name: string; budget?: string }[];
  rules?: CreateRuleParams[];
  alerts?: CreateAlertParams[];
}

export interface CreateRuleParams {
  name: string;
  type: SpendingRuleType;
  priority?: number;
  condition: Partial<RuleCondition>;
  action: Partial<RuleAction>;
  metadata?: Record<string, unknown>;
}

export interface CreateAlertParams {
  type: SpendingAlert['type'];
  threshold?: number;
  message: string;
  channels: SpendingAlert['channels'];
}

// ============================================================================
// Result Types
// ============================================================================

export interface BudgetStatus {
  userId: string;
  period: string;
  totalBudget: string;
  totalSpent: string;
  remaining: string;
  utilizationPercent: number;
  projectedOverspend?: string;
  categories: {
    name: string;
    budget: string;
    spent: string;
    remaining: string;
    utilizationPercent: number;
  }[];
  alerts: string[];
  daysRemaining: number;
}

export interface RuleEvaluationResult {
  ruleId: string;
  triggered: boolean;
  action?: RuleAction;
  reason?: string;
  suggestions?: string[];
}

export interface PaymentAnalysis {
  payment: Payment;
  category: string;
  subcategory?: string;
  merchant?: {
    id: string;
    name: string;
    verified: boolean;
  };
  risk: {
    score: number;
    level: 'low' | 'medium' | 'high';
    flags: string[];
  };
  optimization: {
    potentialSavings: string;
    alternatives: { description: string; savings: string }[];
    bestPaymentMethod?: string;
    bestTiming?: string;
  };
  budgetImpact: {
    categoryBudget: string;
    categorySpent: string;
    afterPayment: string;
    overBudget: boolean;
  };
  recommendations: string[];
}

export interface CategoryResult {
  category: string;
  subcategory?: string;
  confidence: number;
  alternativeCategories?: { category: string; confidence: number }[];
}

export interface LimitCheckResult {
  allowed: boolean;
  limits: {
    type: 'daily' | 'weekly' | 'monthly' | 'category' | 'single';
    limit: string;
    used: string;
    remaining: string;
    exceeded: boolean;
  }[];
  requiresApproval: boolean;
  blockedReason?: string;
}

export interface SpendingTrends {
  userId: string;
  period: 'week' | 'month' | 'year';
  trends: {
    overall: 'increasing' | 'stable' | 'decreasing';
    percentChange: number;
    byCategory: {
      category: string;
      trend: 'increasing' | 'stable' | 'decreasing';
      percentChange: number;
    }[];
  };
  patterns: {
    peakSpendingDay: string;
    avgTransactionSize: string;
    topMerchants: { name: string; amount: string; count: number }[];
    unusualActivity: { date: Date; amount: string; description: string }[];
  };
  forecast: {
    nextMonth: string;
    confidence: number;
  };
}

export interface BudgetComparison {
  userId: string;
  period: string;
  overall: {
    budget: string;
    actual: string;
    variance: string;
    variancePercent: number;
    status: 'under' | 'on_track' | 'over';
  };
  categories: {
    category: string;
    budget: string;
    actual: string;
    variance: string;
    variancePercent: number;
    status: 'under' | 'on_track' | 'over';
  }[];
  insights: string[];
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultSmartSpendingManager implements SmartSpendingManager {
  readonly config: SmartSpendingConfig;

  private profiles: Map<string, SpendingProfile> = new Map();
  private eventCallbacks: PaymentsEventCallback[] = [];

  constructor(config?: Partial<SmartSpendingConfig>) {
    this.config = {
      enabled: true,
      aiProvider: 'groq',
      optimizationEnabled: true,
      autoApplyOptimizations: false,
      defaultBudgetPeriod: 'monthly',
      alertsEnabled: true,
      maxAlertFrequency: 3,
      ...config,
    };
  }

  // ============================================================================
  // Profile Management
  // ============================================================================

  async createProfile(userId: string, params: CreateProfileParams): Promise<SpendingProfile> {
    const now = new Date();

    const budget: BudgetConfig = {
      period: this.config.defaultBudgetPeriod,
      totalLimit: '0',
      currency: 'TON',
      categoryLimits: {},
      rollover: false,
      startDate: now,
      enforceHardLimits: false,
      ...params.budget,
    };

    const categories: SpendingCategory[] = (params.categories || []).map(c => ({
      id: this.generateId('cat'),
      name: c.name,
      budget: c.budget,
      spent: '0',
      remaining: c.budget || '0',
      transactions: 0,
      avgTransaction: '0',
      trend: 'stable',
    }));

    const rules: SpendingRule[] = (params.rules || []).map(r => this.createRuleObject(r));

    const alerts: SpendingAlert[] = (params.alerts || []).map(a => ({
      id: this.generateId('alert'),
      type: a.type,
      threshold: a.threshold,
      triggered: false,
      message: a.message,
      channels: a.channels,
    }));

    const profile: SpendingProfile = {
      userId,
      budget,
      categories,
      rules,
      optimization: {
        enabled: this.config.optimizationEnabled,
        aiProvider: this.config.aiProvider,
        lastAnalysis: now,
        potentialSavings: '0',
        recommendations: [],
        appliedOptimizations: [],
        autoApply: this.config.autoApplyOptimizations,
        targetSavingsPercent: 10,
      },
      insights: [],
      alerts,
      history: [],
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(userId, profile);
    return profile;
  }

  async updateProfile(userId: string, updates: Partial<SpendingProfile>): Promise<SpendingProfile> {
    const profile = await this.getProfileOrThrow(userId);

    const { userId: _, createdAt, ...allowedUpdates } = updates;
    Object.assign(profile, allowedUpdates);
    profile.updatedAt = new Date();

    return profile;
  }

  async getProfile(userId: string): Promise<SpendingProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async deleteProfile(userId: string): Promise<void> {
    this.profiles.delete(userId);
  }

  // ============================================================================
  // Budget Management
  // ============================================================================

  async setBudget(userId: string, budget: Partial<BudgetConfig>): Promise<SpendingProfile> {
    const profile = await this.getProfileOrThrow(userId);

    Object.assign(profile.budget, budget);
    profile.updatedAt = new Date();

    // Update category budgets if provided
    if (budget.categoryLimits) {
      for (const [categoryName, limit] of Object.entries(budget.categoryLimits)) {
        const category = profile.categories.find(c => c.name === categoryName);
        if (category) {
          category.budget = limit;
          category.remaining = (BigInt(limit) - BigInt(category.spent)).toString();
        } else {
          profile.categories.push({
            id: this.generateId('cat'),
            name: categoryName,
            budget: limit,
            spent: '0',
            remaining: limit,
            transactions: 0,
            avgTransaction: '0',
            trend: 'stable',
          });
        }
      }
    }

    return profile;
  }

  async getCategorySpending(userId: string, category?: string): Promise<SpendingCategory[]> {
    const profile = await this.getProfileOrThrow(userId);

    if (category) {
      return profile.categories.filter(c => c.name === category);
    }

    return profile.categories;
  }

  async getBudgetStatus(userId: string): Promise<BudgetStatus> {
    const profile = await this.getProfileOrThrow(userId);

    const totalBudget = profile.budget.totalLimit;
    const totalSpent = profile.categories.reduce(
      (sum, c) => (BigInt(sum) + BigInt(c.spent)).toString(),
      '0'
    );
    const remaining = (BigInt(totalBudget) - BigInt(totalSpent)).toString();
    const utilizationPercent = totalBudget === '0' ? 0 : Number(BigInt(totalSpent) * BigInt(100) / BigInt(totalBudget));

    const categories = profile.categories.map(c => ({
      name: c.name,
      budget: c.budget || '0',
      spent: c.spent,
      remaining: c.remaining,
      utilizationPercent: c.budget && c.budget !== '0'
        ? Number(BigInt(c.spent) * BigInt(100) / BigInt(c.budget))
        : 0,
    }));

    // Calculate days remaining in period
    const now = new Date();
    let periodEnd = new Date(profile.budget.startDate);
    switch (profile.budget.period) {
      case 'daily':
        periodEnd.setDate(periodEnd.getDate() + 1);
        break;
      case 'weekly':
        periodEnd.setDate(periodEnd.getDate() + 7);
        break;
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
    }
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Generate alerts
    const alerts: string[] = [];
    if (utilizationPercent > 90) {
      alerts.push('Budget nearly exhausted');
    }
    for (const cat of categories) {
      if (cat.utilizationPercent > 100) {
        alerts.push(`Over budget in ${cat.name}`);
      }
    }

    return {
      userId,
      period: profile.budget.period,
      totalBudget,
      totalSpent,
      remaining,
      utilizationPercent,
      categories,
      alerts,
      daysRemaining,
    };
  }

  // ============================================================================
  // Spending Rules
  // ============================================================================

  async createRule(userId: string, ruleParams: CreateRuleParams): Promise<SpendingRule> {
    const profile = await this.getProfileOrThrow(userId);

    const rule = this.createRuleObject(ruleParams);
    profile.rules.push(rule);
    profile.updatedAt = new Date();

    return rule;
  }

  async updateRule(userId: string, ruleId: string, updates: Partial<SpendingRule>): Promise<SpendingRule> {
    const profile = await this.getProfileOrThrow(userId);

    const rule = profile.rules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const { id, createdAt, ...allowedUpdates } = updates;
    Object.assign(rule, allowedUpdates);
    profile.updatedAt = new Date();

    return rule;
  }

  async deleteRule(userId: string, ruleId: string): Promise<void> {
    const profile = await this.getProfileOrThrow(userId);
    profile.rules = profile.rules.filter(r => r.id !== ruleId);
    profile.updatedAt = new Date();
  }

  async listRules(userId: string, type?: SpendingRuleType): Promise<SpendingRule[]> {
    const profile = await this.getProfileOrThrow(userId);

    if (type) {
      return profile.rules.filter(r => r.type === type);
    }

    return profile.rules.sort((a, b) => a.priority - b.priority);
  }

  async evaluateRule(rule: SpendingRule, payment: Payment): Promise<RuleEvaluationResult> {
    if (!rule.enabled) {
      return { ruleId: rule.id, triggered: false, reason: 'Rule is disabled' };
    }

    const conditionMet = this.evaluateCondition(rule.condition, payment);

    if (conditionMet) {
      return {
        ruleId: rule.id,
        triggered: true,
        action: rule.action,
        suggestions: this.generateRuleSuggestions(rule, payment),
      };
    }

    return { ruleId: rule.id, triggered: false };
  }

  // ============================================================================
  // Payment Analysis
  // ============================================================================

  async analyzePayment(userId: string, payment: Payment): Promise<PaymentAnalysis> {
    const profile = await this.getProfileOrThrow(userId);

    // Categorize payment
    const categoryResult = await this.categorizePayment(payment);

    // Find matching category in profile
    const category = profile.categories.find(c => c.name === categoryResult.category);

    // Risk analysis
    const riskScore = this.calculateRiskScore(payment);

    // Optimization suggestions
    const optimization = await this.analyzeOptimizationOpportunities(payment);

    // Budget impact
    const categoryBudget = category?.budget || '0';
    const categorySpent = category?.spent || '0';
    const afterPayment = (BigInt(categorySpent) + BigInt(payment.amount)).toString();
    const overBudget = categoryBudget !== '0' && BigInt(afterPayment) > BigInt(categoryBudget);

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskScore > 70) {
      recommendations.push('Consider reviewing this transaction carefully');
    }
    if (overBudget) {
      recommendations.push(`This will exceed your ${categoryResult.category} budget`);
    }
    if (optimization.potentialSavings !== '0') {
      recommendations.push(`Potential savings: ${optimization.potentialSavings}`);
    }

    return {
      payment,
      category: categoryResult.category,
      subcategory: categoryResult.subcategory,
      merchant: {
        id: payment.recipient.id,
        name: payment.recipient.name || 'Unknown',
        verified: payment.recipient.verified,
      },
      risk: {
        score: riskScore,
        level: riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high',
        flags: this.identifyRiskFlags(payment),
      },
      optimization,
      budgetImpact: {
        categoryBudget,
        categorySpent,
        afterPayment,
        overBudget,
      },
      recommendations,
    };
  }

  async categorizePayment(payment: Payment): Promise<CategoryResult> {
    // AI-powered categorization (simplified)
    const merchantName = payment.recipient.name?.toLowerCase() || '';
    const description = payment.description?.toLowerCase() || '';

    // Simple rule-based categorization
    const categories: { pattern: RegExp; category: string; subcategory?: string }[] = [
      { pattern: /restaurant|cafe|food|dining/i, category: 'Food & Dining', subcategory: 'Restaurants' },
      { pattern: /grocery|supermarket|market/i, category: 'Food & Dining', subcategory: 'Groceries' },
      { pattern: /uber|lyft|taxi|transport/i, category: 'Transportation', subcategory: 'Rideshare' },
      { pattern: /gas|fuel|petrol/i, category: 'Transportation', subcategory: 'Fuel' },
      { pattern: /netflix|spotify|subscription/i, category: 'Entertainment', subcategory: 'Subscriptions' },
      { pattern: /rent|mortgage|housing/i, category: 'Housing', subcategory: 'Rent' },
      { pattern: /utility|electric|water|gas/i, category: 'Utilities' },
      { pattern: /amazon|shopping|store/i, category: 'Shopping' },
      { pattern: /health|medical|pharmacy/i, category: 'Healthcare' },
      { pattern: /salary|income|payroll/i, category: 'Income' },
    ];

    for (const { pattern, category, subcategory } of categories) {
      if (pattern.test(merchantName) || pattern.test(description)) {
        return { category, subcategory, confidence: 0.85 };
      }
    }

    return { category: 'Other', confidence: 0.5 };
  }

  async checkLimits(userId: string, payment: Payment): Promise<LimitCheckResult> {
    const profile = await this.getProfileOrThrow(userId);

    const limits: LimitCheckResult['limits'] = [];
    let allowed = true;
    let blockedReason: string | undefined;

    // Check daily limit
    const dailySpent = await this.getDailySpent(userId);
    const dailyLimit = profile.budget.period === 'daily' ? profile.budget.totalLimit : '0';
    if (dailyLimit !== '0') {
      const afterPayment = (BigInt(dailySpent) + BigInt(payment.amount)).toString();
      const exceeded = BigInt(afterPayment) > BigInt(dailyLimit);
      limits.push({
        type: 'daily',
        limit: dailyLimit,
        used: dailySpent,
        remaining: (BigInt(dailyLimit) - BigInt(dailySpent)).toString(),
        exceeded,
      });
      if (exceeded && profile.budget.enforceHardLimits) {
        allowed = false;
        blockedReason = 'Daily limit exceeded';
      }
    }

    // Check category limit
    const category = await this.categorizePayment(payment);
    const categoryLimit = profile.budget.categoryLimits[category.category];
    if (categoryLimit) {
      const categorySpent = profile.categories.find(c => c.name === category.category)?.spent || '0';
      const afterPayment = (BigInt(categorySpent) + BigInt(payment.amount)).toString();
      const exceeded = BigInt(afterPayment) > BigInt(categoryLimit);
      limits.push({
        type: 'category',
        limit: categoryLimit,
        used: categorySpent,
        remaining: (BigInt(categoryLimit) - BigInt(categorySpent)).toString(),
        exceeded,
      });
      if (exceeded && profile.budget.enforceHardLimits) {
        allowed = false;
        blockedReason = `${category.category} category limit exceeded`;
      }
    }

    // Check single transaction limits from rules
    const singleLimitRule = profile.rules.find(r => r.type === 'limit' && r.condition.type === 'amount');
    if (singleLimitRule && singleLimitRule.enabled) {
      const limit = singleLimitRule.condition.value as string;
      const exceeded = BigInt(payment.amount) > BigInt(limit);
      limits.push({
        type: 'single',
        limit,
        used: payment.amount,
        remaining: exceeded ? '0' : (BigInt(limit) - BigInt(payment.amount)).toString(),
        exceeded,
      });
      if (exceeded) {
        const action = singleLimitRule.action;
        if (action.type === 'block') {
          allowed = false;
          blockedReason = 'Single transaction limit exceeded';
        }
      }
    }

    // Determine if approval is required
    const requiresApproval = limits.some(l => l.exceeded) && allowed;

    return {
      allowed,
      limits,
      requiresApproval,
      blockedReason,
    };
  }

  // ============================================================================
  // Optimization
  // ============================================================================

  async getOptimizationRecommendations(userId: string): Promise<OptimizationRecommendation[]> {
    const profile = await this.getProfileOrThrow(userId);

    const recommendations: OptimizationRecommendation[] = [];

    // Analyze spending patterns
    const history = profile.history;
    if (history.length > 0) {
      // Check for subscription optimization
      const subscriptionCategory = profile.categories.find(c => c.name.toLowerCase().includes('subscription'));
      if (subscriptionCategory && BigInt(subscriptionCategory.spent) > BigInt('100')) {
        recommendations.push({
          id: this.generateId('rec'),
          type: 'cancel',
          title: 'Review unused subscriptions',
          description: 'You may have subscriptions that are not being fully utilized',
          potentialSavings: (BigInt(subscriptionCategory.spent) * BigInt(20) / BigInt(100)).toString(),
          confidence: 0.7,
          effort: 'easy',
          category: 'Subscriptions',
          actionRequired: 'Review active subscriptions',
          status: 'pending',
        });
      }

      // Check for timing optimization
      const avgAmount = this.calculateAverageTransaction(history);
      if (BigInt(avgAmount) > BigInt('50')) {
        recommendations.push({
          id: this.generateId('rec'),
          type: 'timing',
          title: 'Optimize payment timing',
          description: 'Schedule payments during off-peak times for better rates',
          potentialSavings: (BigInt(avgAmount) * BigInt(5) / BigInt(100)).toString(),
          confidence: 0.6,
          effort: 'medium',
          category: 'General',
          actionRequired: 'Set up scheduled payments',
          status: 'pending',
        });
      }

      // Check for payment method optimization
      recommendations.push({
        id: this.generateId('rec'),
        type: 'payment_method',
        title: 'Use optimal payment methods',
        description: 'Switch to payment methods with lower fees or better rewards',
        potentialSavings: (BigInt(profile.budget.totalLimit) * BigInt(1) / BigInt(100)).toString(),
        confidence: 0.8,
        effort: 'easy',
        category: 'Fees',
        actionRequired: 'Configure preferred payment method',
        status: 'pending',
      });
    }

    // Update profile with recommendations
    profile.optimization.recommendations = recommendations;
    profile.optimization.lastAnalysis = new Date();
    profile.optimization.potentialSavings = recommendations.reduce(
      (sum, r) => (BigInt(sum) + BigInt(r.potentialSavings)).toString(),
      '0'
    );

    return recommendations;
  }

  async applyOptimization(userId: string, recommendationId: string): Promise<AppliedOptimization> {
    const profile = await this.getProfileOrThrow(userId);

    const recommendation = profile.optimization.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    recommendation.status = 'applied';

    const applied: AppliedOptimization = {
      recommendationId,
      appliedAt: new Date(),
      savingsRealized: '0', // Will be updated as savings accumulate
      status: 'active',
    };

    profile.optimization.appliedOptimizations.push(applied);
    profile.updatedAt = new Date();

    this.emitEvent('spending.optimization', 'spending', userId, 'optimization_applied', { recommendationId });

    return applied;
  }

  async dismissRecommendation(userId: string, recommendationId: string): Promise<void> {
    const profile = await this.getProfileOrThrow(userId);

    const recommendation = profile.optimization.recommendations.find(r => r.id === recommendationId);
    if (recommendation) {
      recommendation.status = 'dismissed';
    }

    profile.updatedAt = new Date();
  }

  async getOptimizationHistory(userId: string): Promise<AppliedOptimization[]> {
    const profile = await this.getProfileOrThrow(userId);
    return profile.optimization.appliedOptimizations;
  }

  // ============================================================================
  // Insights
  // ============================================================================

  async generateInsights(userId: string): Promise<SpendingInsight[]> {
    const profile = await this.getProfileOrThrow(userId);

    const insights: SpendingInsight[] = [];
    const now = new Date();

    // Budget utilization insight
    const budgetStatus = await this.getBudgetStatus(userId);
    if (budgetStatus.utilizationPercent > 80) {
      insights.push({
        id: this.generateId('insight'),
        type: 'warning',
        title: 'Budget Alert',
        message: `You've used ${budgetStatus.utilizationPercent}% of your budget with ${budgetStatus.daysRemaining} days remaining`,
        data: { utilizationPercent: budgetStatus.utilizationPercent },
        importance: 'high',
        actionable: true,
        action: 'Review spending',
        createdAt: now,
        acknowledged: false,
      });
    }

    // Category spending insights
    for (const category of profile.categories) {
      if (category.trend === 'increasing') {
        insights.push({
          id: this.generateId('insight'),
          type: 'trend',
          title: `Increasing ${category.name} spending`,
          message: `Your ${category.name} spending has been trending upward`,
          data: { category: category.name, trend: 'increasing' },
          importance: 'medium',
          actionable: true,
          action: 'Set category limit',
          createdAt: now,
          acknowledged: false,
        });
      }
    }

    // Savings opportunity
    if (BigInt(profile.optimization.potentialSavings) > BigInt('0')) {
      insights.push({
        id: this.generateId('insight'),
        type: 'opportunity',
        title: 'Savings Opportunity',
        message: `You could save up to ${profile.optimization.potentialSavings} by optimizing your spending`,
        data: { potentialSavings: profile.optimization.potentialSavings },
        importance: 'medium',
        actionable: true,
        action: 'View recommendations',
        createdAt: now,
        acknowledged: false,
      });
    }

    // Achievement insight
    if (budgetStatus.utilizationPercent < 50 && budgetStatus.daysRemaining < 10) {
      insights.push({
        id: this.generateId('insight'),
        type: 'achievement',
        title: 'Great Budget Control',
        message: `You're well under budget this period. Keep it up!`,
        data: { utilizationPercent: budgetStatus.utilizationPercent },
        importance: 'low',
        actionable: false,
        createdAt: now,
        acknowledged: false,
      });
    }

    profile.insights = insights;
    profile.updatedAt = now;

    return insights;
  }

  async getInsight(userId: string, insightId: string): Promise<SpendingInsight | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    return profile.insights.find(i => i.id === insightId) || null;
  }

  async acknowledgeInsight(userId: string, insightId: string): Promise<void> {
    const profile = await this.getProfileOrThrow(userId);

    const insight = profile.insights.find(i => i.id === insightId);
    if (insight) {
      insight.acknowledged = true;
    }

    profile.updatedAt = new Date();
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  async createAlert(userId: string, alertParams: CreateAlertParams): Promise<SpendingAlert> {
    const profile = await this.getProfileOrThrow(userId);

    const alert: SpendingAlert = {
      id: this.generateId('alert'),
      type: alertParams.type,
      threshold: alertParams.threshold,
      triggered: false,
      message: alertParams.message,
      channels: alertParams.channels,
    };

    profile.alerts.push(alert);
    profile.updatedAt = new Date();

    return alert;
  }

  async updateAlert(userId: string, alertId: string, updates: Partial<SpendingAlert>): Promise<SpendingAlert> {
    const profile = await this.getProfileOrThrow(userId);

    const alert = profile.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    const { id, ...allowedUpdates } = updates;
    Object.assign(alert, allowedUpdates);
    profile.updatedAt = new Date();

    return alert;
  }

  async deleteAlert(userId: string, alertId: string): Promise<void> {
    const profile = await this.getProfileOrThrow(userId);
    profile.alerts = profile.alerts.filter(a => a.id !== alertId);
    profile.updatedAt = new Date();
  }

  async listAlerts(userId: string): Promise<SpendingAlert[]> {
    const profile = await this.getProfileOrThrow(userId);
    return profile.alerts;
  }

  async snoozeAlert(userId: string, alertId: string, until: Date): Promise<SpendingAlert> {
    const profile = await this.getProfileOrThrow(userId);

    const alert = profile.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.snoozedUntil = until;
    profile.updatedAt = new Date();

    return alert;
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getSpendingHistory(userId: string, _period: 'week' | 'month' | 'year'): Promise<SpendingHistoryEntry[]> {
    const profile = await this.getProfileOrThrow(userId);

    // Return stored history or generate sample data
    return profile.history;
  }

  async getSpendingTrends(userId: string): Promise<SpendingTrends> {
    const profile = await this.getProfileOrThrow(userId);

    const categoryTrends = profile.categories.map(c => ({
      category: c.name,
      trend: c.trend,
      percentChange: c.trend === 'increasing' ? 15 : c.trend === 'decreasing' ? -10 : 0,
    }));

    return {
      userId,
      period: 'month',
      trends: {
        overall: 'stable',
        percentChange: 5,
        byCategory: categoryTrends,
      },
      patterns: {
        peakSpendingDay: 'Friday',
        avgTransactionSize: this.calculateAverageTransaction(profile.history),
        topMerchants: [],
        unusualActivity: [],
      },
      forecast: {
        nextMonth: profile.budget.totalLimit,
        confidence: 0.75,
      },
    };
  }

  async compareWithBudget(userId: string): Promise<BudgetComparison> {
    const profile = await this.getProfileOrThrow(userId);
    const budgetStatus = await this.getBudgetStatus(userId);

    const totalVariance = (BigInt(budgetStatus.totalSpent) - BigInt(budgetStatus.totalBudget)).toString();
    const totalVariancePercent = budgetStatus.totalBudget === '0'
      ? 0
      : Number(BigInt(totalVariance) * BigInt(100) / BigInt(budgetStatus.totalBudget));

    const categories = budgetStatus.categories.map(c => {
      const variance = (BigInt(c.spent) - BigInt(c.budget)).toString();
      const variancePercent = c.budget === '0' ? 0 : Number(BigInt(variance) * BigInt(100) / BigInt(c.budget));
      return {
        category: c.name,
        budget: c.budget,
        actual: c.spent,
        variance,
        variancePercent,
        status: variancePercent > 10 ? 'over' as const : variancePercent < -10 ? 'under' as const : 'on_track' as const,
      };
    });

    const insights: string[] = [];
    const overBudgetCategories = categories.filter(c => c.status === 'over');
    if (overBudgetCategories.length > 0) {
      insights.push(`Over budget in ${overBudgetCategories.map(c => c.category).join(', ')}`);
    }
    const underBudgetCategories = categories.filter(c => c.status === 'under');
    if (underBudgetCategories.length > 0) {
      insights.push(`Under budget in ${underBudgetCategories.map(c => c.category).join(', ')}`);
    }

    return {
      userId,
      period: profile.budget.period,
      overall: {
        budget: budgetStatus.totalBudget,
        actual: budgetStatus.totalSpent,
        variance: totalVariance,
        variancePercent: totalVariancePercent,
        status: totalVariancePercent > 10 ? 'over' : totalVariancePercent < -10 ? 'under' : 'on_track',
      },
      categories,
      insights,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PaymentsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async getProfileOrThrow(userId: string): Promise<SpendingProfile> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error(`Spending profile not found for user: ${userId}`);
    }
    return profile;
  }

  private createRuleObject(params: CreateRuleParams): SpendingRule {
    return {
      id: this.generateId('rule'),
      name: params.name,
      type: params.type,
      enabled: true,
      priority: params.priority || 0,
      condition: {
        type: 'amount',
        operator: 'greater_than',
        value: '0',
        ...params.condition,
      },
      action: {
        type: 'warn',
        parameters: {},
        ...params.action,
      },
      metadata: params.metadata || {},
      createdAt: new Date(),
      triggerCount: 0,
    };
  }

  private evaluateCondition(condition: RuleCondition, payment: Payment): boolean {
    switch (condition.type) {
      case 'amount':
        const amountValue = BigInt(payment.amount);
        const threshold = BigInt(condition.value as string);
        switch (condition.operator) {
          case 'greater_than': return amountValue > threshold;
          case 'less_than': return amountValue < threshold;
          case 'equals': return amountValue === threshold;
          case 'greater_or_equal': return amountValue >= threshold;
          case 'less_or_equal': return amountValue <= threshold;
        }
        break;

      case 'category':
        // Would check payment category
        return false;

      case 'merchant':
        const merchantId = payment.recipient.id;
        return merchantId === condition.value;

      case 'time':
        const hour = new Date().getHours();
        const targetHour = condition.value as number;
        switch (condition.operator) {
          case 'greater_than': return hour > targetHour;
          case 'less_than': return hour < targetHour;
          case 'equals': return hour === targetHour;
        }
        break;
    }

    return false;
  }

  private generateRuleSuggestions(rule: SpendingRule, _payment: Payment): string[] {
    const suggestions: string[] = [];

    switch (rule.type) {
      case 'limit':
        suggestions.push('Consider splitting this purchase into smaller transactions');
        break;
      case 'approval':
        suggestions.push('This transaction requires approval');
        break;
      case 'round_up':
        suggestions.push('Round up amount will be saved automatically');
        break;
    }

    return suggestions;
  }

  private calculateRiskScore(payment: Payment): number {
    let score = 0;

    // Large amount
    if (BigInt(payment.amount) > BigInt('1000')) score += 20;

    // New recipient
    if (!payment.recipient.verified) score += 25;

    // Unusual time
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) score += 15;

    // Cross-border
    if (payment.crossBorder) score += 20;

    return Math.min(100, score);
  }

  private identifyRiskFlags(payment: Payment): string[] {
    const flags: string[] = [];

    if (BigInt(payment.amount) > BigInt('1000')) {
      flags.push('large_amount');
    }
    if (!payment.recipient.verified) {
      flags.push('unverified_recipient');
    }
    if (payment.crossBorder) {
      flags.push('cross_border');
    }

    return flags;
  }

  private async analyzeOptimizationOpportunities(payment: Payment): Promise<PaymentAnalysis['optimization']> {
    const alternatives: { description: string; savings: string }[] = [];

    // Check for better payment methods
    if (payment.method !== 'stablecoin') {
      alternatives.push({
        description: 'Use stablecoin for lower fees',
        savings: (BigInt(payment.amount) * BigInt(1) / BigInt(100)).toString(),
      });
    }

    // Check for timing
    alternatives.push({
      description: 'Schedule during off-peak for better rates',
      savings: (BigInt(payment.amount) * BigInt(5) / BigInt(1000)).toString(),
    });

    const potentialSavings = alternatives.reduce(
      (sum, a) => (BigInt(sum) + BigInt(a.savings)).toString(),
      '0'
    );

    return {
      potentialSavings,
      alternatives,
      bestPaymentMethod: 'stablecoin',
      bestTiming: 'off-peak',
    };
  }

  private async getDailySpent(userId: string): Promise<string> {
    const profile = await this.getProfile(userId);
    if (!profile) return '0';

    // Sum today's spending from history
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEntry = profile.history.find(h => {
      const entryDate = new Date(h.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });

    return todayEntry?.totalSpent || '0';
  }

  private calculateAverageTransaction(history: SpendingHistoryEntry[]): string {
    if (history.length === 0) return '0';

    const totalSpent = history.reduce(
      (sum, h) => (BigInt(sum) + BigInt(h.totalSpent)).toString(),
      '0'
    );
    const totalTransactions = history.reduce((sum, h) => sum + h.transactionCount, 0);

    if (totalTransactions === 0) return '0';

    return (BigInt(totalSpent) / BigInt(totalTransactions)).toString();
  }

  private emitEvent(
    type: PaymentsEvent['type'],
    resourceType: PaymentsEvent['resourceType'],
    resourceId: string,
    action: string,
    data: unknown
  ): void {
    const event: PaymentsEvent = {
      id: this.generateId('evt'),
      timestamp: new Date(),
      type,
      resourceType,
      resourceId,
      action,
      actor: { type: 'system', id: 'smart-spending' },
      data,
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSmartSpendingManager(config?: Partial<SmartSpendingConfig>): DefaultSmartSpendingManager {
  return new DefaultSmartSpendingManager(config);
}
