/**
 * TONAIAgent - Personal Financial Dashboard
 *
 * Comprehensive financial dashboard providing net worth, allocation, risk,
 * performance, goals, and actionable insights.
 */

import {
  FinancialDashboard,
  NetWorthSummary,
  CashFlowSummary,
  GoalsSummary,
  PortfolioSummary,
  SavingsSummary,
  RiskSummary,
  DashboardInsight,
  DashboardRecommendation,
  AssetBreakdown,
  LiabilityBreakdown,
  NetWorthHistoryPoint,
  ExpenseCategory,
  GoalSummaryItem,
  AllocationSummaryItem,
  PerformerItem,
  RecentSaveItem,
  RiskAlertItem,
  UserProfile,
  InvestmentPortfolio,
  FinancialGoal,
  SavingsAutomation,
  PersonalFinanceEvent,
  PersonalFinanceEventCallback,
} from './types';

// ============================================================================
// Dashboard Manager Interface
// ============================================================================

export interface DashboardManager {
  // Dashboard generation
  generateDashboard(userId: string): Promise<FinancialDashboard>;
  refreshDashboard(userId: string): Promise<FinancialDashboard>;

  // Section data
  getNetWorthSummary(userId: string): Promise<NetWorthSummary>;
  getCashFlowSummary(userId: string): Promise<CashFlowSummary>;
  getGoalsSummary(userId: string): Promise<GoalsSummary>;
  getPortfolioSummary(userId: string): Promise<PortfolioSummary>;
  getSavingsSummary(userId: string): Promise<SavingsSummary>;
  getRiskSummary(userId: string): Promise<RiskSummary>;

  // Insights
  generateInsights(userId: string): Promise<DashboardInsight[]>;
  generateRecommendations(userId: string): Promise<DashboardRecommendation[]>;

  // Historical data
  getNetWorthHistory(userId: string, period?: string): Promise<NetWorthHistoryPoint[]>;
  getPerformanceHistory(userId: string, period?: string): Promise<PerformancePoint[]>;

  // Data sources (for dependency injection)
  setDataSources(sources: DashboardDataSources): void;

  // Events
  onEvent(callback: PersonalFinanceEventCallback): void;
}

export interface DashboardDataSources {
  getProfile: (userId: string) => Promise<UserProfile | null>;
  getPortfolios: (userId: string) => Promise<InvestmentPortfolio[]>;
  getGoals: (userId: string) => Promise<FinancialGoal[]>;
  getSavingsAutomations: (userId: string) => Promise<SavingsAutomation[]>;
}

export interface PerformancePoint {
  date: Date;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultDashboardManager implements DashboardManager {
  private dataSources: DashboardDataSources | null = null;
  private readonly dashboardCache: Map<string, { dashboard: FinancialDashboard; timestamp: Date }> = new Map();
  private readonly netWorthHistory: Map<string, NetWorthHistoryPoint[]> = new Map();
  private readonly eventCallbacks: PersonalFinanceEventCallback[] = [];

  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  setDataSources(sources: DashboardDataSources): void {
    this.dataSources = sources;
  }

  async generateDashboard(userId: string): Promise<FinancialDashboard> {
    // Check cache
    const cached = this.dashboardCache.get(userId);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_TTL_MS) {
      return cached.dashboard;
    }

    // Generate fresh dashboard
    const [
      netWorth,
      cashFlow,
      goals,
      portfolio,
      savings,
      risk,
      insights,
      recommendations,
    ] = await Promise.all([
      this.getNetWorthSummary(userId),
      this.getCashFlowSummary(userId),
      this.getGoalsSummary(userId),
      this.getPortfolioSummary(userId),
      this.getSavingsSummary(userId),
      this.getRiskSummary(userId),
      this.generateInsights(userId),
      this.generateRecommendations(userId),
    ]);

    const dashboard: FinancialDashboard = {
      userId,
      generatedAt: new Date(),
      netWorth,
      cashFlow,
      goals,
      portfolio,
      savings,
      risk,
      insights,
      recommendations,
    };

    // Cache the dashboard
    this.dashboardCache.set(userId, { dashboard, timestamp: new Date() });

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'dashboard_viewed',
      userId,
      action: 'dashboard_generated',
      resource: 'financial_dashboard',
      resourceId: userId,
      details: {},
      metadata: {},
    });

    return dashboard;
  }

  async refreshDashboard(userId: string): Promise<FinancialDashboard> {
    // Clear cache and regenerate
    this.dashboardCache.delete(userId);
    return this.generateDashboard(userId);
  }

  async getNetWorthSummary(userId: string): Promise<NetWorthSummary> {
    const profile = await this.getProfile(userId);
    const portfolios = await this.getPortfolios(userId);

    // Calculate total assets
    let totalAssets = profile?.totalAssets ?? 0;
    const assetBreakdown: AssetBreakdown[] = [];

    // Add portfolio values
    let portfolioTotal = 0;
    for (const portfolio of portfolios) {
      portfolioTotal += portfolio.performance.totalValue;
    }

    if (portfolioTotal > 0) {
      assetBreakdown.push({
        category: 'Investments',
        value: portfolioTotal,
        percentage: 0, // Calculated below
        change: 0,
      });
    }

    // Add other assets
    const otherAssets = totalAssets - portfolioTotal;
    if (otherAssets > 0) {
      assetBreakdown.push({
        category: 'Other Assets',
        value: otherAssets,
        percentage: 0,
        change: 0,
      });
    }

    // Recalculate total assets including portfolios
    totalAssets = portfolioTotal + Math.max(0, otherAssets);

    // Calculate percentages
    for (const asset of assetBreakdown) {
      asset.percentage = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0;
    }

    // Liabilities
    const totalLiabilities = profile?.totalLiabilities ?? 0;
    const liabilities: LiabilityBreakdown[] = [];
    if (totalLiabilities > 0) {
      liabilities.push({
        category: 'Total Liabilities',
        value: totalLiabilities,
      });
    }

    // Net worth
    const total = totalAssets - totalLiabilities;

    // Get historical data for changes
    const history = await this.getNetWorthHistory(userId, '30d');
    let change24h = 0;
    let change30d = 0;

    if (history.length > 0) {
      const yesterday = history.find(h =>
        h.date.getTime() >= Date.now() - 2 * 24 * 60 * 60 * 1000 &&
        h.date.getTime() < Date.now() - 24 * 60 * 60 * 1000
      );
      if (yesterday) {
        change24h = total - yesterday.value;
      }

      const thirtyDaysAgo = history[0];
      change30d = total - thirtyDaysAgo.value;
    }

    return {
      total,
      change24h,
      changePercent24h: total !== 0 ? (change24h / (total - change24h)) * 100 : 0,
      change30d,
      changePercent30d: total !== 0 ? (change30d / (total - change30d)) * 100 : 0,
      assets: assetBreakdown,
      liabilities,
      history: history.slice(-30),
    };
  }

  async getCashFlowSummary(userId: string): Promise<CashFlowSummary> {
    const profile = await this.getProfile(userId);

    const monthlyIncome = profile?.monthlyIncome ?? 0;
    const monthlyExpenses = profile?.monthlyExpenses ?? 0;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    // Default expense categories (would be calculated from actual transactions)
    const categoryBreakdown: ExpenseCategory[] = [
      { category: 'Housing', amount: monthlyExpenses * 0.35, percentage: 35, trend: 'stable' },
      { category: 'Food', amount: monthlyExpenses * 0.15, percentage: 15, trend: 'stable' },
      { category: 'Transportation', amount: monthlyExpenses * 0.12, percentage: 12, trend: 'stable' },
      { category: 'Utilities', amount: monthlyExpenses * 0.08, percentage: 8, trend: 'stable' },
      { category: 'Entertainment', amount: monthlyExpenses * 0.10, percentage: 10, trend: 'stable' },
      { category: 'Other', amount: monthlyExpenses * 0.20, percentage: 20, trend: 'stable' },
    ];

    return {
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      savingsRate,
      trend: savingsRate >= 20 ? 'improving' : savingsRate >= 10 ? 'stable' : 'declining',
      projectedSurplus: monthlySavings,
      categoryBreakdown,
    };
  }

  async getGoalsSummary(userId: string): Promise<GoalsSummary> {
    const goals = await this.getGoals(userId);

    let onTrack = 0;
    let behind = 0;
    let atRisk = 0;
    let completed = 0;
    let totalTargetAmount = 0;
    let totalCurrentAmount = 0;

    const topGoals: GoalSummaryItem[] = [];

    for (const goal of goals) {
      totalTargetAmount += goal.targetAmount;
      totalCurrentAmount += goal.currentAmount;

      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

      switch (goal.status) {
        case 'on_track':
          onTrack++;
          break;
        case 'behind':
          behind++;
          break;
        case 'at_risk':
          atRisk++;
          break;
        case 'completed':
          completed++;
          break;
      }

      // Add to top goals if not completed
      if (goal.status !== 'completed' && topGoals.length < 5) {
        const daysRemaining = goal.deadline
          ? Math.max(0, Math.ceil((goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : undefined;

        topGoals.push({
          goalId: goal.id,
          name: goal.name,
          progress,
          status: goal.status,
          daysRemaining,
        });
      }
    }

    const overallProgress = totalTargetAmount > 0
      ? (totalCurrentAmount / totalTargetAmount) * 100
      : 0;

    return {
      totalGoals: goals.length,
      onTrack,
      behind,
      atRisk,
      completed,
      totalTargetAmount,
      totalCurrentAmount,
      overallProgress,
      topGoals,
    };
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const portfolios = await this.getPortfolios(userId);

    let totalValue = 0;
    let totalCost = 0;
    const allocationMap: Map<string, number> = new Map();
    const performers: Array<{ symbol: string; name: string; returnPercent: number; value: number }> = [];

    for (const portfolio of portfolios) {
      totalValue += portfolio.performance.totalValue;
      totalCost += portfolio.performance.totalCost;

      // Aggregate holdings
      for (const holding of portfolio.holdings) {
        const current = allocationMap.get(holding.assetClass) ?? 0;
        allocationMap.set(holding.assetClass, current + holding.currentValue);

        performers.push({
          symbol: holding.symbol,
          name: holding.asset,
          returnPercent: holding.unrealizedPnLPercent,
          value: holding.currentValue,
        });
      }
    }

    // Create allocation summary
    const allocation: AllocationSummaryItem[] = [];
    for (const [assetClass, value] of allocationMap) {
      allocation.push({
        assetClass,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        targetPercentage: 0, // Would come from target allocation
        drift: 0,
      });
    }

    // Sort performers
    performers.sort((a, b) => b.returnPercent - a.returnPercent);
    const topPerformers: PerformerItem[] = performers.slice(0, 3);
    const bottomPerformers: PerformerItem[] = performers.slice(-3).reverse();

    const totalReturn = totalValue - totalCost;
    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    // Calculate daily change from portfolios
    let dayChange = 0;
    for (const portfolio of portfolios) {
      dayChange += portfolio.performance.dailyReturn * portfolio.performance.totalValue / 100;
    }
    const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

    return {
      totalValue,
      totalReturn,
      totalReturnPercent,
      dayChange,
      dayChangePercent,
      allocation,
      topPerformers,
      bottomPerformers,
    };
  }

  async getSavingsSummary(userId: string): Promise<SavingsSummary> {
    const automations = await this.getSavingsAutomations(userId);

    let totalSaved = 0;
    let monthlyTotal = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let lastSaveDate: Date | undefined;
    let nextScheduledSave: Date | undefined;
    const recentSaves: RecentSaveItem[] = [];

    for (const automation of automations) {
      totalSaved += automation.statistics.totalSaved;
      monthlyTotal += automation.statistics.averageMonthlySavings;

      if (automation.statistics.longestStreak > longestStreak) {
        longestStreak = automation.statistics.longestStreak;
      }
      currentStreak += automation.statistics.currentStreak;

      if (automation.statistics.lastSaveDate) {
        if (!lastSaveDate || automation.statistics.lastSaveDate > lastSaveDate) {
          lastSaveDate = automation.statistics.lastSaveDate;
        }
      }
    }

    // Calculate savings rate
    const profile = await this.getProfile(userId);
    const savingsRate = profile && profile.monthlyIncome > 0
      ? (monthlyTotal / profile.monthlyIncome) * 100
      : 0;

    // Automation status
    const activeAutomations = automations.filter(a => a.status === 'active');
    const automationStatus: 'active' | 'paused' | 'none' = activeAutomations.length > 0
      ? 'active'
      : automations.length > 0
        ? 'paused'
        : 'none';

    return {
      totalSaved,
      monthlyAverage: monthlyTotal,
      currentStreak,
      savingsRate,
      automationStatus,
      nextScheduledSave,
      recentSaves,
    };
  }

  async getRiskSummary(userId: string): Promise<RiskSummary> {
    const portfolios = await this.getPortfolios(userId);
    const alerts: RiskAlertItem[] = [];

    let portfolioRisk = 0;
    let concentrationRisk = 0;
    let volatilityRisk = 0;

    // Analyze each portfolio
    for (const portfolio of portfolios) {
      // Portfolio volatility
      if (portfolio.performance.volatility > 30) {
        volatilityRisk = Math.max(volatilityRisk, portfolio.performance.volatility / 100);
        alerts.push({
          type: 'volatility',
          severity: portfolio.performance.volatility > 50 ? 'critical' : 'warning',
          message: `${portfolio.name} has high volatility (${portfolio.performance.volatility.toFixed(1)}%)`,
          suggestedAction: 'Consider rebalancing to reduce volatility',
        });
      }

      // Concentration check
      for (const holding of portfolio.holdings) {
        if (holding.weight > 30) {
          concentrationRisk = Math.max(concentrationRisk, holding.weight / 100);
          alerts.push({
            type: 'concentration',
            severity: holding.weight > 50 ? 'critical' : 'warning',
            message: `${holding.symbol} represents ${holding.weight.toFixed(1)}% of your portfolio`,
            suggestedAction: 'Consider diversifying to reduce concentration risk',
          });
        }
      }

      // Drawdown check
      if (portfolio.performance.maxDrawdown > portfolio.riskProfile.maxDrawdownTolerance) {
        portfolioRisk = Math.max(portfolioRisk, 0.8);
        alerts.push({
          type: 'drawdown',
          severity: 'warning',
          message: `${portfolio.name} has exceeded your maximum drawdown tolerance`,
          suggestedAction: 'Review your risk tolerance and portfolio allocation',
        });
      }
    }

    // Calculate overall risk score (0-100)
    const overallScore = Math.round(
      (portfolioRisk * 40 + concentrationRisk * 30 + volatilityRisk * 30) * 100
    );

    // Determine risk status
    let status: 'low' | 'moderate' | 'elevated' | 'high';
    if (overallScore < 25) {
      status = 'low';
    } else if (overallScore < 50) {
      status = 'moderate';
    } else if (overallScore < 75) {
      status = 'elevated';
    } else {
      status = 'high';
    }

    return {
      overallScore,
      status,
      portfolioRisk: portfolioRisk * 100,
      concentrationRisk: concentrationRisk * 100,
      volatilityRisk: volatilityRisk * 100,
      alerts,
    };
  }

  async generateInsights(userId: string): Promise<DashboardInsight[]> {
    const insights: DashboardInsight[] = [];

    // Net worth insight
    const netWorth = await this.getNetWorthSummary(userId);
    if (netWorth.changePercent30d > 5) {
      insights.push({
        id: `insight_${Date.now()}_nw_growth`,
        type: 'positive',
        title: 'Strong Growth',
        message: `Your net worth grew ${netWorth.changePercent30d.toFixed(1)}% in the last 30 days`,
        metric: {
          label: 'Net Worth',
          value: `$${netWorth.total.toLocaleString()}`,
          change: netWorth.changePercent30d,
        },
      });
    } else if (netWorth.changePercent30d < -5) {
      insights.push({
        id: `insight_${Date.now()}_nw_decline`,
        type: 'warning',
        title: 'Portfolio Decline',
        message: `Your net worth decreased ${Math.abs(netWorth.changePercent30d).toFixed(1)}% in the last 30 days`,
        metric: {
          label: 'Net Worth',
          value: `$${netWorth.total.toLocaleString()}`,
          change: netWorth.changePercent30d,
        },
        action: {
          label: 'Review Portfolio',
          type: 'view_portfolio',
        },
      });
    }

    // Savings rate insight
    const cashFlow = await this.getCashFlowSummary(userId);
    if (cashFlow.savingsRate >= 20) {
      insights.push({
        id: `insight_${Date.now()}_savings`,
        type: 'positive',
        title: 'Excellent Savings Rate',
        message: `You're saving ${cashFlow.savingsRate.toFixed(0)}% of your income - keep it up!`,
      });
    } else if (cashFlow.savingsRate < 10) {
      insights.push({
        id: `insight_${Date.now()}_savings_low`,
        type: 'warning',
        title: 'Low Savings Rate',
        message: `Your savings rate is ${cashFlow.savingsRate.toFixed(0)}%. Consider ways to increase it.`,
        action: {
          label: 'Set Up Automation',
          type: 'automate_savings',
        },
      });
    }

    // Goal progress insights
    const goalsSummary = await this.getGoalsSummary(userId);
    if (goalsSummary.completed > 0) {
      insights.push({
        id: `insight_${Date.now()}_goals`,
        type: 'positive',
        title: 'Goals Achieved!',
        message: `You've completed ${goalsSummary.completed} financial goal${goalsSummary.completed > 1 ? 's' : ''}!`,
      });
    }

    if (goalsSummary.atRisk > 0) {
      insights.push({
        id: `insight_${Date.now()}_goals_risk`,
        type: 'warning',
        title: 'Goals at Risk',
        message: `${goalsSummary.atRisk} of your goals need attention to stay on track`,
        action: {
          label: 'Review Goals',
          type: 'view_goals',
        },
      });
    }

    // Portfolio performance insight
    const portfolioSummary = await this.getPortfolioSummary(userId);
    if (portfolioSummary.totalReturnPercent > 10) {
      insights.push({
        id: `insight_${Date.now()}_portfolio`,
        type: 'positive',
        title: 'Strong Portfolio Performance',
        message: `Your portfolio is up ${portfolioSummary.totalReturnPercent.toFixed(1)}% overall`,
        metric: {
          label: 'Total Return',
          value: `$${portfolioSummary.totalReturn.toLocaleString()}`,
          change: portfolioSummary.totalReturnPercent,
        },
      });
    }

    return insights;
  }

  async generateRecommendations(userId: string): Promise<DashboardRecommendation[]> {
    const recommendations: DashboardRecommendation[] = [];
    const profile = await this.getProfile(userId);
    const portfolios = await this.getPortfolios(userId);
    const goals = await this.getGoals(userId);
    const automations = await this.getSavingsAutomations(userId);

    // Emergency fund recommendation
    const hasEmergencyGoal = goals.some(g => g.type === 'emergency_fund');
    if (!hasEmergencyGoal) {
      recommendations.push({
        id: `rec_${Date.now()}_emergency`,
        priority: 'high',
        title: 'Build Emergency Fund',
        description: 'Start building a 3-6 month emergency fund for financial security',
        impact: 'Provides safety net for unexpected expenses',
        effort: 'medium',
        category: 'savings',
        actionLabel: 'Create Goal',
      });
    }

    // Automation recommendation
    if (automations.filter(a => a.status === 'active').length === 0) {
      recommendations.push({
        id: `rec_${Date.now()}_automate`,
        priority: 'medium',
        title: 'Automate Your Savings',
        description: 'Set up automatic savings to build wealth consistently',
        impact: 'Consistent saving without manual effort',
        effort: 'easy',
        category: 'automation',
        actionLabel: 'Set Up Automation',
      });
    }

    // Diversification recommendation
    for (const portfolio of portfolios) {
      const assetClasses = new Set(portfolio.holdings.map(h => h.assetClass));
      if (assetClasses.size < 3 && portfolio.holdings.length > 0) {
        recommendations.push({
          id: `rec_${Date.now()}_diversify_${portfolio.id}`,
          priority: 'medium',
          title: `Diversify ${portfolio.name}`,
          description: 'Add more asset classes to reduce risk',
          impact: 'Better risk-adjusted returns',
          effort: 'medium',
          category: 'investment',
        });
        break; // Only one diversification recommendation
      }
    }

    // Rebalancing recommendation
    for (const portfolio of portfolios) {
      if (portfolio.rebalancing.enabled && !portfolio.rebalancing.autoExecute) {
        const daysSinceRebalance = portfolio.rebalancing.lastRebalanceDate
          ? Math.floor((Date.now() - portfolio.rebalancing.lastRebalanceDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceRebalance > 90) {
          recommendations.push({
            id: `rec_${Date.now()}_rebalance_${portfolio.id}`,
            priority: 'low',
            title: `Review ${portfolio.name} Allocation`,
            description: `It's been ${daysSinceRebalance} days since your last rebalance`,
            impact: 'Maintain target risk level',
            effort: 'easy',
            category: 'maintenance',
          });
          break; // Only one rebalance recommendation
        }
      }
    }

    // Savings rate recommendation
    if (profile) {
      const savingsRate = (profile.monthlyIncome - profile.monthlyExpenses) / profile.monthlyIncome;
      if (savingsRate < 0.15) {
        recommendations.push({
          id: `rec_${Date.now()}_savings_rate`,
          priority: 'medium',
          title: 'Increase Savings Rate',
          description: `Your savings rate is ${(savingsRate * 100).toFixed(0)}%. Aim for at least 15%.`,
          impact: 'Faster wealth accumulation',
          effort: 'medium',
          category: 'budgeting',
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  async getNetWorthHistory(userId: string, period: string = '1y'): Promise<NetWorthHistoryPoint[]> {
    // Get cached history or generate sample data
    let history = this.netWorthHistory.get(userId);

    if (!history) {
      // Generate sample historical data
      history = this.generateSampleHistory(userId, period);
      this.netWorthHistory.set(userId, history);
    }

    return history;
  }

  async getPerformanceHistory(userId: string, period: string = '1y'): Promise<PerformancePoint[]> {
    const netWorthHistory = await this.getNetWorthHistory(userId, period);

    return netWorthHistory.map((point, index) => ({
      date: point.date,
      portfolioValue: point.assets,
      dailyReturn: index > 0
        ? ((point.value - netWorthHistory[index - 1].value) / netWorthHistory[index - 1].value) * 100
        : 0,
      cumulativeReturn: index > 0
        ? ((point.value - netWorthHistory[0].value) / netWorthHistory[0].value) * 100
        : 0,
    }));
  }

  onEvent(callback: PersonalFinanceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getProfile(userId: string): Promise<UserProfile | null> {
    if (this.dataSources) {
      return this.dataSources.getProfile(userId);
    }
    // Return mock data for standalone use
    return {
      id: userId,
      userId,
      name: 'User',
      lifeStage: 'mid_career',
      riskTolerance: 'moderate',
      investmentHorizon: 'long_term',
      monthlyIncome: 5000,
      monthlyExpenses: 3500,
      totalAssets: 50000,
      totalLiabilities: 10000,
      financialLiteracyScore: 60,
      preferences: {
        currency: 'USD',
        language: 'en',
        timezone: 'UTC',
        notificationEnabled: true,
        nudgesEnabled: true,
        autoInvestEnabled: false,
        autoSaveEnabled: true,
        privacyLevel: 'standard',
        communicationStyle: 'simple',
      },
      goals: [],
      behavioralProfile: {
        emotionalBias: 'balanced',
        decisionPatterns: [],
        panicSellRisk: 0.3,
        fomoBuyRisk: 0.3,
        lossAversionScore: 0.5,
        overconfidenceScore: 0.3,
        lastAssessmentDate: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };
  }

  private async getPortfolios(userId: string): Promise<InvestmentPortfolio[]> {
    if (this.dataSources) {
      return this.dataSources.getPortfolios(userId);
    }
    return [];
  }

  private async getGoals(userId: string): Promise<FinancialGoal[]> {
    if (this.dataSources) {
      return this.dataSources.getGoals(userId);
    }
    return [];
  }

  private async getSavingsAutomations(userId: string): Promise<SavingsAutomation[]> {
    if (this.dataSources) {
      return this.dataSources.getSavingsAutomations(userId);
    }
    return [];
  }

  private generateSampleHistory(_userId: string, period: string): NetWorthHistoryPoint[] {
    const history: NetWorthHistoryPoint[] = [];
    const now = new Date();

    let days = 365;
    switch (period) {
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
      case '6m':
        days = 180;
        break;
      case '1y':
      default:
        days = 365;
        break;
    }

    // Start with initial values
    let baseAssets = 45000;
    let baseLiabilities = 12000;

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Add some realistic variation
      const growthRate = 0.0003; // 0.03% daily average growth
      const volatility = 0.01; // 1% daily volatility
      const randomFactor = 1 + (Math.random() - 0.5) * 2 * volatility;

      baseAssets = baseAssets * (1 + growthRate) * randomFactor;
      baseLiabilities = baseLiabilities * (1 - 0.0001); // Slow debt paydown

      history.push({
        date,
        value: baseAssets - baseLiabilities,
        assets: baseAssets,
        liabilities: baseLiabilities,
      });
    }

    return history;
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

export function createDashboardManager(): DefaultDashboardManager {
  return new DefaultDashboardManager();
}
