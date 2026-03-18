/**
 * TONAIAgent - Automated Savings Module
 *
 * Smart savings automation enabling users to automate their savings through
 * various strategies including fixed amounts, percentage of income, round-ups,
 * surplus savings, and goal-driven allocations.
 */

import {
  SavingsAutomation,
  SavingsRuleType,
  AutomationStatus,
  SavingsRule,
  SavingsAllocation,
  AllocationRule,
  SavingsConfig,
  PersonalFinanceEvent,
  PersonalFinanceEventCallback,
} from './types';

// ============================================================================
// Savings Automation Manager Interface
// ============================================================================

export interface SavingsAutomationManager {
  readonly config: SavingsConfig;

  // Automation management
  createAutomation(params: CreateAutomationParams): Promise<SavingsAutomation>;
  getAutomation(automationId: string): Promise<SavingsAutomation | null>;
  getUserAutomations(userId: string): Promise<SavingsAutomation[]>;
  updateAutomation(automationId: string, updates: UpdateAutomationParams): Promise<SavingsAutomation>;
  pauseAutomation(automationId: string): Promise<SavingsAutomation>;
  resumeAutomation(automationId: string): Promise<SavingsAutomation>;
  deleteAutomation(automationId: string): Promise<void>;

  // Execution
  executeSavings(automationId: string): Promise<SavingsExecutionResult>;
  executePendingSavings(userId: string): Promise<SavingsExecutionResult[]>;
  calculateNextSavingsAmount(automationId: string): Promise<SavingsCalculation>;

  // Goal allocation
  allocateToGoals(userId: string, amount: number): Promise<GoalAllocationResult>;
  updateAllocation(automationId: string, allocation: SavingsAllocation): Promise<SavingsAutomation>;

  // Statistics
  getStatistics(userId: string): Promise<UserSavingsStatistics>;
  getSavingsHistory(userId: string, period?: string): Promise<SavingsHistoryEntry[]>;

  // Smart suggestions
  suggestSavingsAmount(userId: string, monthlyIncome: number, monthlyExpenses: number): Promise<SavingsSuggestion>;
  suggestAutomationRules(userId: string): Promise<SuggestedRule[]>;

  // Configuration
  updateConfig(config: Partial<SavingsConfig>): void;

  // Events
  onEvent(callback: PersonalFinanceEventCallback): void;
}

export interface CreateAutomationParams {
  userId: string;
  name: string;
  type: SavingsRuleType;
  rule: SavingsRule;
  allocation?: SavingsAllocation;
  startDate?: Date;
}

export interface UpdateAutomationParams {
  name?: string;
  rule?: Partial<SavingsRule>;
  allocation?: SavingsAllocation;
  status?: AutomationStatus;
}

export interface SavingsExecutionResult {
  automationId: string;
  success: boolean;
  amount: number;
  allocations: AllocationExecution[];
  timestamp: Date;
  error?: string;
  nextExecutionDate?: Date;
}

export interface AllocationExecution {
  goalId: string;
  amount: number;
  newBalance: number;
}

export interface SavingsCalculation {
  baseAmount: number;
  adjustments: SavingsAdjustment[];
  finalAmount: number;
  confidence: number;
  factors: string[];
}

export interface SavingsAdjustment {
  type: string;
  amount: number;
  reason: string;
}

export interface GoalAllocationResult {
  totalAllocated: number;
  allocations: GoalAllocation[];
  unallocated: number;
}

export interface GoalAllocation {
  goalId: string;
  goalName: string;
  amount: number;
  newProgress: number;
}

export interface UserSavingsStatistics {
  userId: string;
  totalSaved: number;
  averageMonthlySavings: number;
  savingsRate: number;
  longestStreak: number;
  currentStreak: number;
  totalAutomations: number;
  activeAutomations: number;
  projectedAnnualSavings: number;
  lastSaveDate?: Date;
  monthlyTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface SavingsHistoryEntry {
  date: Date;
  amount: number;
  type: 'manual' | 'automatic';
  automationId?: string;
  goalId?: string;
  goalName?: string;
}

export interface SavingsSuggestion {
  recommendedAmount: number;
  recommendedPercentage: number;
  rationale: string;
  alternatives: SavingsAlternative[];
  impact: SavingsImpact;
}

export interface SavingsAlternative {
  amount: number;
  type: 'conservative' | 'moderate' | 'aggressive';
  description: string;
}

export interface SavingsImpact {
  monthlyImpact: number;
  yearlyProjection: number;
  fiveYearProjection: number;
  emergencyFundMonths: number;
}

export interface SuggestedRule {
  type: SavingsRuleType;
  name: string;
  description: string;
  estimatedSavings: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  rule: SavingsRule;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultSavingsAutomationManager implements SavingsAutomationManager {
  private _config: SavingsConfig;
  private readonly automations: Map<string, SavingsAutomation> = new Map();
  private readonly userAutomations: Map<string, string[]> = new Map();
  private readonly savingsHistory: Map<string, SavingsHistoryEntry[]> = new Map();
  private readonly eventCallbacks: PersonalFinanceEventCallback[] = [];

  constructor(config?: Partial<SavingsConfig>) {
    this._config = {
      enabled: true,
      minSaveAmount: 1,
      maxAutomatedSavePercent: 50,
      emergencyFundTarget: 6,
      defaultGoalType: 'savings',
      ...config,
    };
  }

  get config(): SavingsConfig {
    return this._config;
  }

  async createAutomation(params: CreateAutomationParams): Promise<SavingsAutomation> {
    const automationId = `sav_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Validate rule
    this.validateSavingsRule(params.rule);

    const automation: SavingsAutomation = {
      id: automationId,
      userId: params.userId,
      name: params.name,
      type: params.type,
      status: 'active',
      rule: params.rule,
      allocation: params.allocation ?? {
        allocations: [],
      },
      statistics: {
        totalSaved: 0,
        averageMonthlySavings: 0,
        longestStreak: 0,
        currentStreak: 0,
        savingsRate: 0,
        projectedAnnualSavings: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        startDate: params.startDate ?? new Date(),
      },
    };

    this.automations.set(automationId, automation);

    // Track user automations
    const userAutos = this.userAutomations.get(params.userId) ?? [];
    userAutos.push(automationId);
    this.userAutomations.set(params.userId, userAutos);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'savings_automated',
      userId: params.userId,
      action: 'automation_created',
      resource: 'savings_automation',
      resourceId: automationId,
      details: {
        type: params.type,
        rule: params.rule,
      },
      metadata: {},
    });

    return automation;
  }

  async getAutomation(automationId: string): Promise<SavingsAutomation | null> {
    return this.automations.get(automationId) ?? null;
  }

  async getUserAutomations(userId: string): Promise<SavingsAutomation[]> {
    const automationIds = this.userAutomations.get(userId) ?? [];
    const automations: SavingsAutomation[] = [];

    for (const id of automationIds) {
      const automation = this.automations.get(id);
      if (automation) {
        automations.push(automation);
      }
    }

    return automations;
  }

  async updateAutomation(
    automationId: string,
    updates: UpdateAutomationParams
  ): Promise<SavingsAutomation> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      throw new Error(`Automation not found: ${automationId}`);
    }

    if (updates.name) {
      automation.name = updates.name;
    }

    if (updates.rule) {
      automation.rule = { ...automation.rule, ...updates.rule };
      this.validateSavingsRule(automation.rule);
    }

    if (updates.allocation) {
      automation.allocation = updates.allocation;
    }

    if (updates.status) {
      automation.status = updates.status;
    }

    automation.updatedAt = new Date();
    this.automations.set(automationId, automation);

    return automation;
  }

  async pauseAutomation(automationId: string): Promise<SavingsAutomation> {
    return this.updateAutomation(automationId, { status: 'paused' });
  }

  async resumeAutomation(automationId: string): Promise<SavingsAutomation> {
    return this.updateAutomation(automationId, { status: 'active' });
  }

  async deleteAutomation(automationId: string): Promise<void> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      return;
    }

    this.automations.delete(automationId);

    // Remove from user automations
    const userAutos = this.userAutomations.get(automation.userId);
    if (userAutos) {
      const index = userAutos.indexOf(automationId);
      if (index > -1) {
        userAutos.splice(index, 1);
      }
    }
  }

  async executeSavings(automationId: string): Promise<SavingsExecutionResult> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      return {
        automationId,
        success: false,
        amount: 0,
        allocations: [],
        timestamp: new Date(),
        error: 'Automation not found',
      };
    }

    if (automation.status !== 'active') {
      return {
        automationId,
        success: false,
        amount: 0,
        allocations: [],
        timestamp: new Date(),
        error: 'Automation is not active',
      };
    }

    // Calculate savings amount
    const calculation = await this.calculateNextSavingsAmount(automationId);
    const amount = calculation.finalAmount;

    if (amount < this._config.minSaveAmount) {
      return {
        automationId,
        success: false,
        amount: 0,
        allocations: [],
        timestamp: new Date(),
        error: `Amount ${amount} is below minimum ${this._config.minSaveAmount}`,
      };
    }

    // Allocate to goals
    const allocationResult = await this.allocateToGoals(automation.userId, amount);

    // Update statistics
    automation.statistics.totalSaved += amount;
    automation.statistics.currentStreak += 1;
    if (automation.statistics.currentStreak > automation.statistics.longestStreak) {
      automation.statistics.longestStreak = automation.statistics.currentStreak;
    }
    automation.statistics.lastSaveDate = new Date();

    // Record in history
    const history = this.savingsHistory.get(automation.userId) ?? [];
    history.push({
      date: new Date(),
      amount,
      type: 'automatic',
      automationId,
    });
    this.savingsHistory.set(automation.userId, history);

    // Calculate next execution date
    const nextExecutionDate = this.calculateNextExecutionDate(automation.rule);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'savings_executed',
      userId: automation.userId,
      action: 'savings_executed',
      resource: 'savings_automation',
      resourceId: automationId,
      details: {
        amount,
        allocations: allocationResult.allocations,
      },
      metadata: {},
    });

    return {
      automationId,
      success: true,
      amount,
      allocations: allocationResult.allocations.map(a => ({
        goalId: a.goalId,
        amount: a.amount,
        newBalance: a.newProgress,
      })),
      timestamp: new Date(),
      nextExecutionDate,
    };
  }

  async executePendingSavings(userId: string): Promise<SavingsExecutionResult[]> {
    const automations = await this.getUserAutomations(userId);
    const results: SavingsExecutionResult[] = [];

    for (const automation of automations) {
      if (automation.status === 'active' && this.isDue(automation)) {
        const result = await this.executeSavings(automation.id);
        results.push(result);
      }
    }

    return results;
  }

  async calculateNextSavingsAmount(automationId: string): Promise<SavingsCalculation> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      throw new Error(`Automation not found: ${automationId}`);
    }

    const rule = automation.rule;
    let baseAmount = 0;
    const adjustments: SavingsAdjustment[] = [];
    const factors: string[] = [];

    switch (rule.type) {
      case 'fixed_amount':
        baseAmount = rule.amount ?? 0;
        factors.push('Fixed amount rule');
        break;

      case 'percentage_of_income':
        // Would calculate based on actual income
        const estimatedIncome = 5000; // Placeholder
        baseAmount = estimatedIncome * ((rule.percentage ?? 10) / 100);
        factors.push(`${rule.percentage}% of monthly income`);
        break;

      case 'round_up':
        // Would calculate based on transaction round-ups
        baseAmount = 0; // Accumulated from transactions
        factors.push('Round-up from transactions');
        break;

      case 'surplus':
        // Would calculate based on income - expenses
        const surplus = 500; // Placeholder
        baseAmount = surplus * ((rule.percentage ?? 50) / 100);
        factors.push('Percentage of monthly surplus');
        break;

      case 'goal_driven':
        // Would calculate based on goal requirements
        baseAmount = rule.amount ?? 100;
        factors.push('Goal-driven contribution');
        break;

      default:
        baseAmount = rule.amount ?? 0;
    }

    // Apply minimum balance check
    if (rule.minBalance) {
      // Would check actual balance
      const currentBalance = 10000; // Placeholder
      if (currentBalance - baseAmount < rule.minBalance) {
        const reduction = baseAmount - (currentBalance - rule.minBalance);
        adjustments.push({
          type: 'min_balance',
          amount: -reduction,
          reason: `Adjusted to maintain minimum balance of ${rule.minBalance}`,
        });
      }
    }

    // Apply maximum amount cap
    if (rule.maxAmount && baseAmount > rule.maxAmount) {
      adjustments.push({
        type: 'max_cap',
        amount: -(baseAmount - rule.maxAmount),
        reason: `Capped at maximum amount of ${rule.maxAmount}`,
      });
    }

    const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
    const finalAmount = Math.max(0, baseAmount + totalAdjustment);

    return {
      baseAmount,
      adjustments,
      finalAmount,
      confidence: 0.9,
      factors,
    };
  }

  async allocateToGoals(userId: string, amount: number): Promise<GoalAllocationResult> {
    const automations = await this.getUserAutomations(userId);
    const allocations: GoalAllocation[] = [];
    let totalAllocated = 0;

    // Collect all allocation rules across automations
    const allRules: Array<AllocationRule & { automationId: string }> = [];
    for (const automation of automations) {
      if (automation.allocation.allocations.length > 0) {
        for (const rule of automation.allocation.allocations) {
          allRules.push({ ...rule, automationId: automation.id });
        }
      }
    }

    // Sort by priority
    allRules.sort((a, b) => a.priority - b.priority);

    // Allocate based on percentages
    for (const rule of allRules) {
      const allocationAmount = Math.min(amount * (rule.percentage / 100), amount - totalAllocated);
      if (allocationAmount > 0) {
        allocations.push({
          goalId: rule.goalId,
          goalName: `Goal ${rule.goalId}`, // Would fetch actual name
          amount: allocationAmount,
          newProgress: allocationAmount, // Would add to existing progress
        });
        totalAllocated += allocationAmount;
      }
    }

    return {
      totalAllocated,
      allocations,
      unallocated: amount - totalAllocated,
    };
  }

  async updateAllocation(
    automationId: string,
    allocation: SavingsAllocation
  ): Promise<SavingsAutomation> {
    return this.updateAutomation(automationId, { allocation });
  }

  async getStatistics(userId: string): Promise<UserSavingsStatistics> {
    const automations = await this.getUserAutomations(userId);
    const history = this.savingsHistory.get(userId) ?? [];

    // Calculate total saved
    const totalSaved = history.reduce((sum, entry) => sum + entry.amount, 0);

    // Calculate monthly average
    const monthsWithSavings = new Set(
      history.map(e => `${e.date.getFullYear()}-${e.date.getMonth()}`)
    ).size;
    const averageMonthlySavings = monthsWithSavings > 0 ? totalSaved / monthsWithSavings : 0;

    // Count active automations
    const activeAutomations = automations.filter(a => a.status === 'active').length;

    // Calculate streaks
    let longestStreak = 0;
    let currentStreak = 0;
    for (const automation of automations) {
      if (automation.statistics.longestStreak > longestStreak) {
        longestStreak = automation.statistics.longestStreak;
      }
      currentStreak += automation.statistics.currentStreak;
    }

    // Get last save date
    const lastSaveDate = history.length > 0 ? history[history.length - 1].date : undefined;

    // Calculate trend
    const recentMonths = this.getRecentMonthlyTotals(history, 3);
    let monthlyTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentMonths.length >= 2) {
      const recent = recentMonths[recentMonths.length - 1];
      const previous = recentMonths[recentMonths.length - 2];
      if (recent > previous * 1.1) {
        monthlyTrend = 'increasing';
      } else if (recent < previous * 0.9) {
        monthlyTrend = 'decreasing';
      }
    }

    return {
      userId,
      totalSaved,
      averageMonthlySavings,
      savingsRate: 0, // Would calculate from income
      longestStreak,
      currentStreak,
      totalAutomations: automations.length,
      activeAutomations,
      projectedAnnualSavings: averageMonthlySavings * 12,
      lastSaveDate,
      monthlyTrend,
    };
  }

  async getSavingsHistory(
    userId: string,
    period: string = '12months'
  ): Promise<SavingsHistoryEntry[]> {
    const history = this.savingsHistory.get(userId) ?? [];

    // Filter by period
    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case '1month':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '3months':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '6months':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case '12months':
      default:
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    return history.filter(e => e.date >= cutoffDate);
  }

  async suggestSavingsAmount(
    _userId: string,
    monthlyIncome: number,
    monthlyExpenses: number
  ): Promise<SavingsSuggestion> {
    const surplus = monthlyIncome - monthlyExpenses;
    const savingsRate = surplus / monthlyIncome;

    // Calculate recommended amount based on financial best practices
    let recommendedPercentage: number;
    let rationale: string;

    if (savingsRate < 0.1) {
      recommendedPercentage = 10;
      rationale = 'Start with the 10% rule - pay yourself first before expenses.';
    } else if (savingsRate < 0.2) {
      recommendedPercentage = 15;
      rationale = 'You\'re doing well! Aim for 15% to accelerate wealth building.';
    } else if (savingsRate < 0.3) {
      recommendedPercentage = 20;
      rationale = 'Excellent savings rate! Push toward 20% for optimal growth.';
    } else {
      recommendedPercentage = 25;
      rationale = 'You\'re a super saver! Consider maximizing your savings potential.';
    }

    const recommendedAmount = monthlyIncome * (recommendedPercentage / 100);

    // Calculate alternatives
    const alternatives: SavingsAlternative[] = [
      {
        amount: monthlyIncome * 0.1,
        type: 'conservative',
        description: '10% of income - sustainable and steady',
      },
      {
        amount: monthlyIncome * 0.15,
        type: 'moderate',
        description: '15% of income - balanced approach',
      },
      {
        amount: monthlyIncome * 0.25,
        type: 'aggressive',
        description: '25% of income - maximize savings',
      },
    ];

    // Calculate impact
    const impact: SavingsImpact = {
      monthlyImpact: recommendedAmount,
      yearlyProjection: recommendedAmount * 12,
      fiveYearProjection: this.calculateCompoundGrowth(recommendedAmount * 12, 5, 0.05),
      emergencyFundMonths: (recommendedAmount * 6) / monthlyExpenses,
    };

    return {
      recommendedAmount,
      recommendedPercentage,
      rationale,
      alternatives,
      impact,
    };
  }

  async suggestAutomationRules(_userId: string): Promise<SuggestedRule[]> {
    const suggestions: SuggestedRule[] = [
      {
        type: 'fixed_amount',
        name: 'Weekly Fixed Savings',
        description: 'Save a fixed amount every week for consistent wealth building',
        estimatedSavings: 200 * 4, // $200/week
        difficulty: 'easy',
        rule: {
          type: 'fixed_amount',
          amount: 200,
          frequency: 'weekly',
        },
      },
      {
        type: 'percentage_of_income',
        name: 'Pay Yourself First',
        description: 'Automatically save 15% of every paycheck',
        estimatedSavings: 5000 * 0.15, // Assuming $5000 income
        difficulty: 'moderate',
        rule: {
          type: 'percentage_of_income',
          percentage: 15,
          frequency: 'monthly',
        },
      },
      {
        type: 'round_up',
        name: 'Round-Up Savings',
        description: 'Round up every transaction and save the difference',
        estimatedSavings: 50, // Estimated monthly
        difficulty: 'easy',
        rule: {
          type: 'round_up',
          frequency: 'daily',
        },
      },
      {
        type: 'surplus',
        name: 'Surplus Saver',
        description: 'Save 50% of your monthly surplus after expenses',
        estimatedSavings: 500 * 0.5, // Assuming $500 surplus
        difficulty: 'moderate',
        rule: {
          type: 'surplus',
          percentage: 50,
          frequency: 'monthly',
        },
      },
      {
        type: 'goal_driven',
        name: 'Emergency Fund Builder',
        description: 'Automated contributions toward your emergency fund goal',
        estimatedSavings: 500, // Monthly target
        difficulty: 'moderate',
        rule: {
          type: 'goal_driven',
          amount: 500,
          frequency: 'monthly',
        },
      },
    ];

    return suggestions;
  }

  updateConfig(config: Partial<SavingsConfig>): void {
    this._config = { ...this._config, ...config };
  }

  onEvent(callback: PersonalFinanceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateSavingsRule(rule: SavingsRule): void {
    if (rule.type === 'fixed_amount' && (!rule.amount || rule.amount <= 0)) {
      throw new Error('Fixed amount rule requires a positive amount');
    }

    if (rule.type === 'percentage_of_income') {
      if (!rule.percentage || rule.percentage <= 0 || rule.percentage > 100) {
        throw new Error('Percentage must be between 0 and 100');
      }
      if (rule.percentage > this._config.maxAutomatedSavePercent) {
        throw new Error(
          `Percentage exceeds maximum allowed (${this._config.maxAutomatedSavePercent}%)`
        );
      }
    }
  }

  private isDue(automation: SavingsAutomation): boolean {
    const now = new Date();
    const lastSave = automation.statistics.lastSaveDate;

    if (!lastSave) {
      return true;
    }

    const frequency = automation.rule.frequency;
    const diffMs = now.getTime() - lastSave.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    switch (frequency) {
      case 'daily':
        return diffDays >= 1;
      case 'weekly':
        return diffDays >= 7;
      case 'biweekly':
        return diffDays >= 14;
      case 'monthly':
        return diffDays >= 30;
      default:
        return false;
    }
  }

  private calculateNextExecutionDate(rule: SavingsRule): Date {
    const now = new Date();

    switch (rule.frequency) {
      case 'daily':
        return new Date(now.setDate(now.getDate() + 1));
      case 'weekly':
        return new Date(now.setDate(now.getDate() + 7));
      case 'biweekly':
        return new Date(now.setDate(now.getDate() + 14));
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      default:
        return new Date(now.setDate(now.getDate() + 30));
    }
  }

  private getRecentMonthlyTotals(history: SavingsHistoryEntry[], months: number): number[] {
    const now = new Date();
    const totals: number[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthTotal = history
        .filter(e => e.date >= monthStart && e.date <= monthEnd)
        .reduce((sum, e) => sum + e.amount, 0);

      totals.push(monthTotal);
    }

    return totals;
  }

  private calculateCompoundGrowth(annualContribution: number, years: number, rate: number): number {
    let total = 0;
    for (let i = 0; i < years; i++) {
      total = (total + annualContribution) * (1 + rate);
    }
    return Math.round(total);
  }

  private emitEvent(event: PersonalFinanceEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSavingsAutomationManager(
  config?: Partial<SavingsConfig>
): DefaultSavingsAutomationManager {
  return new DefaultSavingsAutomationManager(config);
}
