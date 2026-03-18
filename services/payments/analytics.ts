/**
 * TONAIAgent - Payment Analytics and Financial Insights
 *
 * AI-powered analytics engine providing spending insights, cash flow analysis,
 * forecasting, and business intelligence for payments data.
 */

import {
  PaymentAnalytics,
  AnalyticsPeriod,
  AnalyticsSummary,
  VolumeAnalytics,
  PerformanceAnalytics,
  TrendAnalytics,
  BreakdownAnalytics,
  ForecastAnalytics,
  AnalyticsConfig,
  PaymentsEventCallback,
} from './types';

// ============================================================================
// Analytics Interface
// ============================================================================

export interface PaymentAnalyticsEngine {
  readonly config: AnalyticsConfig;

  // Core analytics
  getAnalytics(userId: string, period: PeriodParams): Promise<PaymentAnalytics>;
  getSummary(userId: string, period: PeriodParams): Promise<AnalyticsSummary>;
  getVolume(userId: string, period: PeriodParams): Promise<VolumeAnalytics>;
  getPerformance(userId: string, period: PeriodParams): Promise<PerformanceAnalytics>;

  // Trends and patterns
  getTrends(userId: string, period: PeriodParams): Promise<TrendAnalytics>;
  getBreakdown(userId: string, period: PeriodParams): Promise<BreakdownAnalytics>;
  detectAnomalies(userId: string, period: PeriodParams): Promise<AnomalyDetectionResult>;
  getPatterns(userId: string): Promise<SpendingPatterns>;

  // Forecasting
  getForecast(userId: string, horizon: ForecastHorizon): Promise<ForecastAnalytics>;
  predictCashFlow(userId: string, days: number): Promise<CashFlowPrediction>;
  estimateBudgetNeeds(userId: string): Promise<BudgetEstimate>;

  // Insights
  generateInsights(userId: string): Promise<PaymentInsight[]>;
  getTopInsights(userId: string, limit?: number): Promise<PaymentInsight[]>;
  dismissInsight(userId: string, insightId: string): Promise<void>;
  getInsightHistory(userId: string): Promise<PaymentInsight[]>;

  // Reports
  generateReport(userId: string, params: ReportParams): Promise<AnalyticsReport>;
  scheduleReport(userId: string, params: ScheduledReportParams): Promise<ScheduledReport>;
  listScheduledReports(userId: string): Promise<ScheduledReport[]>;
  cancelScheduledReport(userId: string, reportId: string): Promise<void>;

  // Comparisons
  compareWithPrevious(userId: string, period: PeriodParams): Promise<PeriodComparison>;
  compareWithAverage(userId: string): Promise<AverageComparison>;
  benchmarkAnalysis(userId: string, category?: string): Promise<BenchmarkResult>;

  // Real-time
  getRealTimeMetrics(userId: string): Promise<RealTimeMetrics>;
  streamMetrics(userId: string, callback: MetricsCallback): StreamSubscription;

  // Data export
  exportAnalytics(userId: string, params: ExportParams): Promise<ExportResult>;

  // Events
  onEvent(callback: PaymentsEventCallback): void;
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface PeriodParams {
  type: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  start?: Date;
  end?: Date;
  comparison?: boolean;
}

export type ForecastHorizon = 'week' | 'month' | 'quarter' | 'year';

export interface ReportParams {
  type: 'summary' | 'detailed' | 'executive';
  period: PeriodParams;
  sections: ReportSection[];
  format: 'json' | 'pdf' | 'csv';
  includeCharts?: boolean;
}

export type ReportSection =
  | 'overview'
  | 'volume'
  | 'performance'
  | 'trends'
  | 'breakdown'
  | 'forecast'
  | 'insights'
  | 'recommendations';

export interface ScheduledReportParams extends ReportParams {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  enabled?: boolean;
}

export interface ExportParams {
  period: PeriodParams;
  format: 'json' | 'csv' | 'xlsx';
  includeRaw?: boolean;
  aggregation?: 'none' | 'daily' | 'weekly' | 'monthly';
}

// ============================================================================
// Result Types
// ============================================================================

export interface AnomalyDetectionResult {
  userId: string;
  period: PeriodParams;
  anomalies: Anomaly[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface Anomaly {
  id: string;
  type: 'spending_spike' | 'unusual_merchant' | 'pattern_deviation' | 'frequency_change' | 'amount_outlier';
  severity: 'low' | 'medium' | 'high';
  date: Date;
  description: string;
  expectedValue?: string;
  actualValue: string;
  deviation: number;
  transactionIds?: string[];
}

export interface SpendingPatterns {
  userId: string;
  patterns: {
    dailyPattern: { hour: number; avgSpending: string }[];
    weeklyPattern: { dayOfWeek: number; avgSpending: string }[];
    monthlyPattern: { dayOfMonth: number; avgSpending: string }[];
    categoryPatterns: { category: string; frequency: number; avgAmount: string; trend: string }[];
    merchantPatterns: { merchantId: string; name: string; frequency: number; avgAmount: string }[];
  };
  insights: string[];
}

export interface CashFlowPrediction {
  userId: string;
  horizon: number;
  predictions: {
    date: Date;
    predictedInflow: string;
    predictedOutflow: string;
    netFlow: string;
    confidence: number;
  }[];
  summary: {
    totalInflow: string;
    totalOutflow: string;
    netChange: string;
    lowestBalance?: string;
    lowestBalanceDate?: Date;
  };
  assumptions: string[];
}

export interface BudgetEstimate {
  userId: string;
  period: 'month';
  recommendedBudget: string;
  breakdown: {
    category: string;
    recommended: string;
    historical: string;
    trend: 'increasing' | 'stable' | 'decreasing';
  }[];
  confidence: number;
  factors: string[];
}

export interface PaymentInsight {
  id: string;
  userId: string;
  type: InsightType;
  category: 'spending' | 'savings' | 'trends' | 'opportunities' | 'risks';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  action?: {
    type: string;
    label: string;
    parameters?: Record<string, unknown>;
  };
  data: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
}

export type InsightType =
  | 'spending_trend'
  | 'savings_opportunity'
  | 'unusual_activity'
  | 'subscription_optimization'
  | 'merchant_recommendation'
  | 'budget_warning'
  | 'goal_progress'
  | 'cashback_available'
  | 'payment_optimization';

export interface AnalyticsReport {
  id: string;
  userId: string;
  type: ReportParams['type'];
  period: PeriodParams;
  generatedAt: Date;
  sections: {
    name: ReportSection;
    data: Record<string, unknown>;
    charts?: ChartData[];
  }[];
  summary: string;
  recommendations: string[];
  format: ReportParams['format'];
  downloadUrl?: string;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: { label: string; value: number }[];
  options?: Record<string, unknown>;
}

export interface ScheduledReport {
  id: string;
  userId: string;
  name: string;
  params: ScheduledReportParams;
  enabled: boolean;
  lastGeneratedAt?: Date;
  nextGenerationAt: Date;
  createdAt: Date;
}

export interface PeriodComparison {
  currentPeriod: {
    start: Date;
    end: Date;
    volume: string;
    transactions: number;
    avgTransaction: string;
  };
  previousPeriod: {
    start: Date;
    end: Date;
    volume: string;
    transactions: number;
    avgTransaction: string;
  };
  changes: {
    volume: { absolute: string; percent: number };
    transactions: { absolute: number; percent: number };
    avgTransaction: { absolute: string; percent: number };
  };
  categoryChanges: {
    category: string;
    currentAmount: string;
    previousAmount: string;
    change: number;
  }[];
  insights: string[];
}

export interface AverageComparison {
  userId: string;
  period: 'month';
  userMetrics: {
    avgMonthlySpending: string;
    avgTransactionSize: string;
    topCategories: { category: string; percentage: number }[];
  };
  averageMetrics: {
    avgMonthlySpending: string;
    avgTransactionSize: string;
    topCategories: { category: string; percentage: number }[];
  };
  comparison: {
    spendingDifference: number;
    transactionSizeDifference: number;
    categoryDifferences: { category: string; difference: number }[];
  };
  insights: string[];
}

export interface BenchmarkResult {
  userId: string;
  category?: string;
  userPercentile: number;
  metrics: {
    name: string;
    userValue: string;
    benchmarkValue: string;
    percentile: number;
  }[];
  recommendations: string[];
}

export interface RealTimeMetrics {
  userId: string;
  timestamp: Date;
  today: {
    totalSpent: string;
    transactionCount: number;
    avgTransaction: string;
    topCategory: string;
  };
  week: {
    totalSpent: string;
    dayByDay: { date: Date; amount: string }[];
    trend: 'up' | 'down' | 'stable';
  };
  alerts: {
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }[];
}

export type MetricsCallback = (metrics: RealTimeMetrics) => void;

export interface StreamSubscription {
  unsubscribe: () => void;
}

export interface ExportResult {
  id: string;
  userId: string;
  format: ExportParams['format'];
  status: 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  recordCount: number;
  fileSize?: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultPaymentAnalyticsEngine implements PaymentAnalyticsEngine {
  readonly config: AnalyticsConfig;

  private insights: Map<string, PaymentInsight[]> = new Map();
  private scheduledReports: Map<string, ScheduledReport[]> = new Map();
  private eventCallbacks: PaymentsEventCallback[] = [];

  constructor(config?: Partial<AnalyticsConfig>) {
    this.config = {
      enabled: true,
      retention: 365,
      realtimeEnabled: true,
      forecastingEnabled: true,
      aiInsightsEnabled: true,
      ...config,
    };
  }

  // ============================================================================
  // Core Analytics
  // ============================================================================

  async getAnalytics(userId: string, period: PeriodParams): Promise<PaymentAnalytics> {
    const periodInfo = this.calculatePeriod(period);

    const [summary, volume, performance, trends, breakdown, forecasts] = await Promise.all([
      this.getSummary(userId, period),
      this.getVolume(userId, period),
      this.getPerformance(userId, period),
      this.getTrends(userId, period),
      this.getBreakdown(userId, period),
      this.config.forecastingEnabled ? this.getForecast(userId, 'month') : null,
    ]);

    return {
      period: periodInfo,
      summary,
      volume,
      performance,
      trends,
      breakdown,
      forecasts: forecasts || {
        nextPeriod: {
          expectedVolume: '0',
          expectedTransactions: 0,
          confidence: 0,
          range: { low: '0', high: '0' },
        },
        projectedGrowth: 0,
        riskFactors: [],
      },
    };
  }

  async getSummary(_userId: string, _period: PeriodParams): Promise<AnalyticsSummary> {
    // Simulate analytics data
    const baseVolume = BigInt(Math.floor(Math.random() * 100000) + 10000);
    const transactions = Math.floor(Math.random() * 100) + 20;
    const avgTransaction = (baseVolume / BigInt(transactions)).toString();

    return {
      totalVolume: baseVolume.toString(),
      totalTransactions: transactions,
      avgTransactionSize: avgTransaction,
      successRate: 95 + Math.random() * 5,
      totalFees: (baseVolume * BigInt(25) / BigInt(10000)).toString(),
      netVolume: (baseVolume * BigInt(9975) / BigInt(10000)).toString(),
      growth: (Math.random() - 0.3) * 30,
    };
  }

  async getVolume(_userId: string, period: PeriodParams): Promise<VolumeAnalytics> {
    const { start, end } = this.calculatePeriod(period);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const byDay = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      return {
        date,
        volume: (BigInt(Math.floor(Math.random() * 5000) + 1000)).toString(),
        count: Math.floor(Math.random() * 10) + 1,
      };
    });

    return {
      byDay,
      byCurrency: {
        TON: (BigInt(Math.floor(Math.random() * 50000))).toString(),
        USDT: (BigInt(Math.floor(Math.random() * 30000))).toString(),
        USDC: (BigInt(Math.floor(Math.random() * 20000))).toString(),
      },
      byMethod: {
        ton_wallet: (BigInt(Math.floor(Math.random() * 40000))).toString(),
        stablecoin: (BigInt(Math.floor(Math.random() * 35000))).toString(),
        jetton: (BigInt(Math.floor(Math.random() * 25000))).toString(),
      },
      byType: {
        one_time: (BigInt(Math.floor(Math.random() * 60000))).toString(),
        recurring: (BigInt(Math.floor(Math.random() * 30000))).toString(),
        scheduled: (BigInt(Math.floor(Math.random() * 10000))).toString(),
      },
      byCategory: {
        'Food & Dining': (BigInt(Math.floor(Math.random() * 15000))).toString(),
        Shopping: (BigInt(Math.floor(Math.random() * 20000))).toString(),
        Entertainment: (BigInt(Math.floor(Math.random() * 10000))).toString(),
        Transportation: (BigInt(Math.floor(Math.random() * 8000))).toString(),
        Utilities: (BigInt(Math.floor(Math.random() * 5000))).toString(),
      },
    };
  }

  async getPerformance(_userId: string, _period: PeriodParams): Promise<PerformanceAnalytics> {
    return {
      avgProcessingTime: 2.5 + Math.random() * 2,
      medianProcessingTime: 2.0 + Math.random() * 1.5,
      successRate: 95 + Math.random() * 5,
      failureRate: Math.random() * 3,
      refundRate: Math.random() * 2,
      disputeRate: Math.random() * 0.5,
      chargebackRate: Math.random() * 0.1,
      failureReasons: [
        { reason: 'Insufficient balance', count: Math.floor(Math.random() * 10), percentage: 40 },
        { reason: 'Network timeout', count: Math.floor(Math.random() * 5), percentage: 25 },
        { reason: 'Invalid address', count: Math.floor(Math.random() * 3), percentage: 15 },
        { reason: 'User cancelled', count: Math.floor(Math.random() * 3), percentage: 15 },
        { reason: 'Other', count: Math.floor(Math.random() * 2), percentage: 5 },
      ],
    };
  }

  // ============================================================================
  // Trends and Patterns
  // ============================================================================

  async getTrends(_userId: string, _period: PeriodParams): Promise<TrendAnalytics> {
    const volumeChange = (Math.random() - 0.5) * 20;
    const transactionChange = (Math.random() - 0.5) * 15;

    return {
      volumeTrend: volumeChange > 5 ? 'increasing' : volumeChange < -5 ? 'decreasing' : 'stable',
      transactionTrend: transactionChange > 3 ? 'increasing' : transactionChange < -3 ? 'decreasing' : 'stable',
      avgSizeTrend: 'stable',
      seasonality: [
        { period: 'Monday', factor: 0.9 },
        { period: 'Tuesday', factor: 0.95 },
        { period: 'Wednesday', factor: 1.0 },
        { period: 'Thursday', factor: 1.05 },
        { period: 'Friday', factor: 1.15 },
        { period: 'Saturday', factor: 1.2 },
        { period: 'Sunday', factor: 0.75 },
      ],
      anomalies: [],
    };
  }

  async getBreakdown(_userId: string, _period: PeriodParams): Promise<BreakdownAnalytics> {
    return {
      topMerchants: [
        { id: 'mch_1', name: 'Coffee Shop', volume: '2500', count: 25 },
        { id: 'mch_2', name: 'Grocery Store', volume: '5000', count: 8 },
        { id: 'mch_3', name: 'Gas Station', volume: '3000', count: 10 },
      ],
      topCategories: [
        { category: 'Shopping', volume: '15000', count: 20 },
        { category: 'Food & Dining', volume: '12000', count: 40 },
        { category: 'Transportation', volume: '8000', count: 15 },
      ],
      topCurrencies: [
        { currency: 'TON', volume: '50000', count: 50 },
        { currency: 'USDT', volume: '30000', count: 25 },
        { currency: 'USDC', volume: '20000', count: 25 },
      ],
      geographicDistribution: [
        { country: 'US', volume: '40000', count: 40 },
        { country: 'EU', volume: '30000', count: 35 },
        { country: 'ASIA', volume: '30000', count: 25 },
      ],
    };
  }

  async detectAnomalies(userId: string, period: PeriodParams): Promise<AnomalyDetectionResult> {
    const anomalies: Anomaly[] = [];

    // Simulate anomaly detection
    if (Math.random() > 0.7) {
      anomalies.push({
        id: this.generateId('anom'),
        type: 'spending_spike',
        severity: 'medium',
        date: new Date(),
        description: 'Spending 50% higher than usual',
        expectedValue: '1000',
        actualValue: '1500',
        deviation: 50,
      });
    }

    if (Math.random() > 0.8) {
      anomalies.push({
        id: this.generateId('anom'),
        type: 'unusual_merchant',
        severity: 'low',
        date: new Date(),
        description: 'First transaction with new merchant',
        actualValue: '250',
        deviation: 0,
      });
    }

    return {
      userId,
      period,
      anomalies,
      riskLevel: anomalies.some(a => a.severity === 'high') ? 'high' :
                 anomalies.some(a => a.severity === 'medium') ? 'medium' : 'low',
      recommendations: anomalies.length > 0
        ? ['Review flagged transactions', 'Consider setting spending alerts']
        : ['No anomalies detected'],
    };
  }

  async getPatterns(userId: string): Promise<SpendingPatterns> {
    const hourlyPattern = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      avgSpending: (BigInt(Math.floor(Math.sin((hour - 6) * Math.PI / 12) * 500 + 600))).toString(),
    }));

    const weeklyPattern = [
      { dayOfWeek: 0, avgSpending: '800' },
      { dayOfWeek: 1, avgSpending: '1200' },
      { dayOfWeek: 2, avgSpending: '1100' },
      { dayOfWeek: 3, avgSpending: '1300' },
      { dayOfWeek: 4, avgSpending: '1400' },
      { dayOfWeek: 5, avgSpending: '2000' },
      { dayOfWeek: 6, avgSpending: '1800' },
    ];

    return {
      userId,
      patterns: {
        dailyPattern: hourlyPattern,
        weeklyPattern,
        monthlyPattern: Array.from({ length: 28 }, (_, day) => ({
          dayOfMonth: day + 1,
          avgSpending: (BigInt(Math.floor(Math.random() * 500) + 800)).toString(),
        })),
        categoryPatterns: [
          { category: 'Food & Dining', frequency: 30, avgAmount: '45', trend: 'stable' },
          { category: 'Shopping', frequency: 12, avgAmount: '120', trend: 'increasing' },
          { category: 'Transportation', frequency: 20, avgAmount: '25', trend: 'stable' },
        ],
        merchantPatterns: [
          { merchantId: 'mch_1', name: 'Daily Coffee', frequency: 25, avgAmount: '8' },
          { merchantId: 'mch_2', name: 'Grocery Store', frequency: 8, avgAmount: '150' },
        ],
      },
      insights: [
        'You spend most on Fridays and Saturdays',
        'Your peak spending hours are 12-14 and 18-20',
        'Food & Dining is your most frequent expense category',
      ],
    };
  }

  // ============================================================================
  // Forecasting
  // ============================================================================

  async getForecast(_userId: string, _horizon: ForecastHorizon): Promise<ForecastAnalytics> {
    if (!this.config.forecastingEnabled) {
      throw new Error('Forecasting is disabled');
    }

    const baseVolume = 50000;
    const growth = (Math.random() - 0.3) * 20;
    const expectedVolume = Math.floor(baseVolume * (1 + growth / 100));

    return {
      nextPeriod: {
        expectedVolume: expectedVolume.toString(),
        expectedTransactions: Math.floor(expectedVolume / 500),
        confidence: 0.75 + Math.random() * 0.2,
        range: {
          low: Math.floor(expectedVolume * 0.85).toString(),
          high: Math.floor(expectedVolume * 1.15).toString(),
        },
      },
      projectedGrowth: growth,
      riskFactors: growth < 0
        ? ['Declining spending trend', 'Seasonal slowdown expected']
        : [],
    };
  }

  async predictCashFlow(userId: string, days: number): Promise<CashFlowPrediction> {
    const predictions = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);

      const dayOfWeek = date.getDay();
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;

      const baseInflow = 1000 + Math.random() * 500;
      const baseOutflow = 800 + Math.random() * 400;

      return {
        date,
        predictedInflow: Math.floor(baseInflow).toString(),
        predictedOutflow: Math.floor(baseOutflow * weekendFactor).toString(),
        netFlow: Math.floor(baseInflow - baseOutflow * weekendFactor).toString(),
        confidence: 0.7 + Math.random() * 0.2,
      };
    });

    const totalInflow = predictions.reduce(
      (sum, p) => (BigInt(sum) + BigInt(p.predictedInflow)).toString(),
      '0'
    );
    const totalOutflow = predictions.reduce(
      (sum, p) => (BigInt(sum) + BigInt(p.predictedOutflow)).toString(),
      '0'
    );

    return {
      userId,
      horizon: days,
      predictions,
      summary: {
        totalInflow,
        totalOutflow,
        netChange: (BigInt(totalInflow) - BigInt(totalOutflow)).toString(),
      },
      assumptions: [
        'Based on historical spending patterns',
        'Assumes no major one-time expenses',
        'Weekends typically have 30% higher spending',
      ],
    };
  }

  async estimateBudgetNeeds(userId: string): Promise<BudgetEstimate> {
    const patterns = await this.getPatterns(userId);

    const categoryBreakdown = patterns.patterns.categoryPatterns.map(cp => ({
      category: cp.category,
      recommended: (BigInt(cp.avgAmount) * BigInt(cp.frequency) * BigInt(115) / BigInt(100)).toString(),
      historical: (BigInt(cp.avgAmount) * BigInt(cp.frequency)).toString(),
      trend: cp.trend as 'increasing' | 'stable' | 'decreasing',
    }));

    const totalRecommended = categoryBreakdown.reduce(
      (sum, c) => (BigInt(sum) + BigInt(c.recommended)).toString(),
      '0'
    );

    return {
      userId,
      period: 'month',
      recommendedBudget: totalRecommended,
      breakdown: categoryBreakdown,
      confidence: 0.8,
      factors: [
        'Based on last 3 months of spending',
        'Includes 15% buffer for unexpected expenses',
        'Adjusted for detected spending trends',
      ],
    };
  }

  // ============================================================================
  // Insights
  // ============================================================================

  async generateInsights(userId: string): Promise<PaymentInsight[]> {
    if (!this.config.aiInsightsEnabled) {
      return [];
    }

    const newInsights: PaymentInsight[] = [];
    const now = new Date();

    // Spending trend insight
    newInsights.push({
      id: this.generateId('ins'),
      userId,
      type: 'spending_trend',
      category: 'trends',
      title: 'Spending Pattern Detected',
      description: 'Your spending on Food & Dining has increased by 15% this month',
      impact: 'medium',
      actionable: true,
      action: {
        type: 'set_budget',
        label: 'Set Category Budget',
        parameters: { category: 'Food & Dining' },
      },
      data: { category: 'Food & Dining', change: 15 },
      createdAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      dismissed: false,
    });

    // Savings opportunity
    newInsights.push({
      id: this.generateId('ins'),
      userId,
      type: 'savings_opportunity',
      category: 'savings',
      title: 'Subscription Savings Available',
      description: 'You have 3 overlapping subscriptions that could be consolidated',
      impact: 'high',
      actionable: true,
      action: {
        type: 'review_subscriptions',
        label: 'Review Subscriptions',
      },
      data: { potentialSavings: '50', subscriptionCount: 3 },
      createdAt: now,
      dismissed: false,
    });

    // Store insights
    const existingInsights = this.insights.get(userId) || [];
    this.insights.set(userId, [...existingInsights, ...newInsights]);

    return newInsights;
  }

  async getTopInsights(userId: string, limit: number = 5): Promise<PaymentInsight[]> {
    const allInsights = this.insights.get(userId) || [];
    const activeInsights = allInsights.filter(i => !i.dismissed && (!i.expiresAt || i.expiresAt > new Date()));

    return activeInsights
      .sort((a, b) => {
        const impactOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      })
      .slice(0, limit);
  }

  async dismissInsight(userId: string, insightId: string): Promise<void> {
    const userInsights = this.insights.get(userId) || [];
    const insight = userInsights.find(i => i.id === insightId);
    if (insight) {
      insight.dismissed = true;
    }
  }

  async getInsightHistory(userId: string): Promise<PaymentInsight[]> {
    return this.insights.get(userId) || [];
  }

  // ============================================================================
  // Reports
  // ============================================================================

  async generateReport(userId: string, params: ReportParams): Promise<AnalyticsReport> {
    const reportId = this.generateId('rpt');
    const now = new Date();

    const sections: AnalyticsReport['sections'] = [];

    for (const section of params.sections) {
      let data: Record<string, unknown> = {};

      switch (section) {
        case 'overview':
          data = await this.getSummary(userId, params.period) as unknown as Record<string, unknown>;
          break;
        case 'volume':
          data = await this.getVolume(userId, params.period) as unknown as Record<string, unknown>;
          break;
        case 'performance':
          data = await this.getPerformance(userId, params.period) as unknown as Record<string, unknown>;
          break;
        case 'trends':
          data = await this.getTrends(userId, params.period) as unknown as Record<string, unknown>;
          break;
        case 'breakdown':
          data = await this.getBreakdown(userId, params.period) as unknown as Record<string, unknown>;
          break;
        case 'forecast':
          if (this.config.forecastingEnabled) {
            data = await this.getForecast(userId, 'month') as unknown as Record<string, unknown>;
          }
          break;
        case 'insights':
          data = { insights: await this.getTopInsights(userId) };
          break;
      }

      sections.push({
        name: section,
        data,
        charts: params.includeCharts ? this.generateCharts(section, data) : undefined,
      });
    }

    return {
      id: reportId,
      userId,
      type: params.type,
      period: params.period,
      generatedAt: now,
      sections,
      summary: 'This report provides a comprehensive overview of your payment activity.',
      recommendations: [
        'Consider setting up automated savings rules',
        'Review recurring subscriptions for optimization',
      ],
      format: params.format,
    };
  }

  async scheduleReport(userId: string, params: ScheduledReportParams): Promise<ScheduledReport> {
    const reportId = this.generateId('srpt');
    const now = new Date();

    const scheduledReport: ScheduledReport = {
      id: reportId,
      userId,
      name: params.name,
      params,
      enabled: params.enabled ?? true,
      nextGenerationAt: this.calculateNextGeneration(params.frequency),
      createdAt: now,
    };

    const userReports = this.scheduledReports.get(userId) || [];
    userReports.push(scheduledReport);
    this.scheduledReports.set(userId, userReports);

    return scheduledReport;
  }

  async listScheduledReports(userId: string): Promise<ScheduledReport[]> {
    return this.scheduledReports.get(userId) || [];
  }

  async cancelScheduledReport(userId: string, reportId: string): Promise<void> {
    const userReports = this.scheduledReports.get(userId) || [];
    const index = userReports.findIndex(r => r.id === reportId);
    if (index !== -1) {
      userReports.splice(index, 1);
      this.scheduledReports.set(userId, userReports);
    }
  }

  // ============================================================================
  // Comparisons
  // ============================================================================

  async compareWithPrevious(userId: string, period: PeriodParams): Promise<PeriodComparison> {
    const current = await this.getSummary(userId, period);
    const { start: currentStart, end: currentEnd } = this.calculatePeriod(period);

    const periodLength = currentEnd.getTime() - currentStart.getTime();
    const previousStart = new Date(currentStart.getTime() - periodLength);
    const previousEnd = new Date(currentEnd.getTime() - periodLength);

    const previousPeriod: PeriodParams = {
      type: 'custom',
      start: previousStart,
      end: previousEnd,
    };
    const previous = await this.getSummary(userId, previousPeriod);

    const volumeChange = BigInt(current.totalVolume) - BigInt(previous.totalVolume);
    const volumePercent = previous.totalVolume !== '0'
      ? Number(volumeChange * BigInt(100) / BigInt(previous.totalVolume))
      : 0;

    return {
      currentPeriod: {
        start: currentStart,
        end: currentEnd,
        volume: current.totalVolume,
        transactions: current.totalTransactions,
        avgTransaction: current.avgTransactionSize,
      },
      previousPeriod: {
        start: previousStart,
        end: previousEnd,
        volume: previous.totalVolume,
        transactions: previous.totalTransactions,
        avgTransaction: previous.avgTransactionSize,
      },
      changes: {
        volume: { absolute: volumeChange.toString(), percent: volumePercent },
        transactions: {
          absolute: current.totalTransactions - previous.totalTransactions,
          percent: previous.totalTransactions !== 0
            ? ((current.totalTransactions - previous.totalTransactions) / previous.totalTransactions) * 100
            : 0,
        },
        avgTransaction: {
          absolute: (BigInt(current.avgTransactionSize) - BigInt(previous.avgTransactionSize)).toString(),
          percent: previous.avgTransactionSize !== '0'
            ? Number((BigInt(current.avgTransactionSize) - BigInt(previous.avgTransactionSize)) * BigInt(100) / BigInt(previous.avgTransactionSize))
            : 0,
        },
      },
      categoryChanges: [],
      insights: [
        volumePercent > 0
          ? `Your spending increased by ${volumePercent.toFixed(1)}%`
          : `Your spending decreased by ${Math.abs(volumePercent).toFixed(1)}%`,
      ],
    };
  }

  async compareWithAverage(userId: string): Promise<AverageComparison> {
    const userSummary = await this.getSummary(userId, { type: 'month' });

    return {
      userId,
      period: 'month',
      userMetrics: {
        avgMonthlySpending: userSummary.totalVolume,
        avgTransactionSize: userSummary.avgTransactionSize,
        topCategories: [
          { category: 'Shopping', percentage: 30 },
          { category: 'Food & Dining', percentage: 25 },
          { category: 'Transportation', percentage: 15 },
        ],
      },
      averageMetrics: {
        avgMonthlySpending: '45000',
        avgTransactionSize: '500',
        topCategories: [
          { category: 'Food & Dining', percentage: 35 },
          { category: 'Shopping', percentage: 20 },
          { category: 'Utilities', percentage: 18 },
        ],
      },
      comparison: {
        spendingDifference: Number((BigInt(userSummary.totalVolume) - BigInt('45000')) * BigInt(100) / BigInt('45000')),
        transactionSizeDifference: Number((BigInt(userSummary.avgTransactionSize) - BigInt('500')) * BigInt(100) / BigInt('500')),
        categoryDifferences: [
          { category: 'Shopping', difference: 10 },
          { category: 'Food & Dining', difference: -10 },
        ],
      },
      insights: ['Your spending patterns are within normal ranges'],
    };
  }

  async benchmarkAnalysis(userId: string, category?: string): Promise<BenchmarkResult> {
    return {
      userId,
      category,
      userPercentile: 65 + Math.random() * 20,
      metrics: [
        { name: 'Monthly Spending', userValue: '50000', benchmarkValue: '45000', percentile: 55 },
        { name: 'Transaction Frequency', userValue: '45', benchmarkValue: '40', percentile: 60 },
        { name: 'Average Transaction', userValue: '1100', benchmarkValue: '1125', percentile: 48 },
      ],
      recommendations: [
        'Your spending efficiency is above average',
        'Consider automating recurring payments for better cash flow management',
      ],
    };
  }

  // ============================================================================
  // Real-time
  // ============================================================================

  async getRealTimeMetrics(userId: string): Promise<RealTimeMetrics> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    return {
      userId,
      timestamp: now,
      today: {
        totalSpent: (BigInt(Math.floor(Math.random() * 5000))).toString(),
        transactionCount: Math.floor(Math.random() * 10),
        avgTransaction: '500',
        topCategory: 'Food & Dining',
      },
      week: {
        totalSpent: (BigInt(Math.floor(Math.random() * 25000))).toString(),
        dayByDay: Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - i));
          return {
            date,
            amount: (BigInt(Math.floor(Math.random() * 5000))).toString(),
          };
        }),
        trend: 'stable',
      },
      alerts: [],
    };
  }

  streamMetrics(userId: string, callback: MetricsCallback): StreamSubscription {
    if (!this.config.realtimeEnabled) {
      throw new Error('Real-time metrics are disabled');
    }

    const intervalId = setInterval(async () => {
      const metrics = await this.getRealTimeMetrics(userId);
      callback(metrics);
    }, 5000);

    return {
      unsubscribe: () => clearInterval(intervalId),
    };
  }

  // ============================================================================
  // Data Export
  // ============================================================================

  async exportAnalytics(userId: string, params: ExportParams): Promise<ExportResult> {
    const exportId = this.generateId('exp');

    // Simulate export processing
    return {
      id: exportId,
      userId,
      format: params.format,
      status: 'completed',
      downloadUrl: `https://exports.tonaiagent.com/${exportId}.${params.format}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      recordCount: Math.floor(Math.random() * 1000) + 100,
      fileSize: Math.floor(Math.random() * 1000000) + 10000,
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

  private calculatePeriod(period: PeriodParams): AnalyticsPeriod {
    const now = new Date();
    let start: Date;
    let end = now;

    if (period.start && period.end) {
      start = period.start;
      end = period.end;
    } else {
      switch (period.type) {
        case 'day':
          start = new Date(now);
          start.setDate(start.getDate() - 1);
          break;
        case 'week':
          start = new Date(now);
          start.setDate(start.getDate() - 7);
          break;
        case 'month':
          start = new Date(now);
          start.setMonth(start.getMonth() - 1);
          break;
        case 'quarter':
          start = new Date(now);
          start.setMonth(start.getMonth() - 3);
          break;
        case 'year':
          start = new Date(now);
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start = new Date(now);
          start.setMonth(start.getMonth() - 1);
      }
    }

    return { type: period.type, start, end };
  }

  private generateCharts(section: ReportSection, data: Record<string, unknown>): ChartData[] {
    const charts: ChartData[] = [];

    switch (section) {
      case 'volume':
        const volumeData = data as unknown as VolumeAnalytics;
        if (volumeData.byDay) {
          charts.push({
            type: 'line',
            title: 'Daily Volume',
            data: volumeData.byDay.map(d => ({
              label: d.date.toLocaleDateString(),
              value: parseInt(d.volume),
            })),
          });
        }
        break;

      case 'breakdown':
        const breakdownData = data as unknown as BreakdownAnalytics;
        if (breakdownData.topCategories) {
          charts.push({
            type: 'pie',
            title: 'Spending by Category',
            data: breakdownData.topCategories.map(c => ({
              label: c.category,
              value: parseInt(c.volume),
            })),
          });
        }
        break;
    }

    return charts;
  }

  private calculateNextGeneration(frequency: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(8, 0, 0, 0);
        break;
      case 'weekly':
        next.setDate(next.getDate() + (7 - next.getDay() + 1));
        next.setHours(8, 0, 0, 0);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1, 1);
        next.setHours(8, 0, 0, 0);
        break;
    }

    return next;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPaymentAnalyticsEngine(config?: Partial<AnalyticsConfig>): DefaultPaymentAnalyticsEngine {
  return new DefaultPaymentAnalyticsEngine(config);
}
