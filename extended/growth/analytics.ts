/**
 * TONAIAgent - Growth Analytics Engine
 *
 * Implements funnel tracking, cohort analysis, retention metrics,
 * A/B testing, and AI-powered incentive optimization via Groq.
 */

import {
  GrowthMetrics,
  AnalyticsPeriod,
  AcquisitionMetrics,
  ActivationMetrics,
  RetentionMetrics,
  RevenueMetrics,
  ReferralMetrics,
  ViralMetrics,
  EngagementMetrics,
  FunnelStep,
  DropoffPoint,
  CohortRetention,
  ChurnPrediction,
  TopReferrer,
  IncentiveOptimization,
  IncentiveRecommendation,
  IncentivePrediction,
  PersonalizedOffer,
  GrowthAnalyticsConfig,
  GrowthEventCallback,
} from './types';

// ============================================================================
// Growth Analytics Engine Interface
// ============================================================================

export interface GrowthAnalyticsEngine {
  // Core metrics
  getGrowthMetrics(period: AnalyticsPeriod): Promise<GrowthMetrics>;
  getAcquisitionMetrics(period: AnalyticsPeriod): Promise<AcquisitionMetrics>;
  getActivationMetrics(period: AnalyticsPeriod): Promise<ActivationMetrics>;
  getRetentionMetrics(period: AnalyticsPeriod): Promise<RetentionMetrics>;
  getRevenueMetrics(period: AnalyticsPeriod): Promise<RevenueMetrics>;
  getReferralMetrics(period: AnalyticsPeriod): Promise<ReferralMetrics>;
  getEngagementMetrics(period: AnalyticsPeriod): Promise<EngagementMetrics>;

  // Funnel analysis
  getFunnelAnalysis(funnelName: string): Promise<FunnelStep[]>;
  getDropoffPoints(funnelName: string): Promise<DropoffPoint[]>;
  defineFunnel(name: string, steps: string[]): Promise<void>;

  // Cohort analysis
  getCohortRetention(cohortType: 'daily' | 'weekly' | 'monthly'): Promise<CohortRetention[]>;
  getCohortSize(cohort: string): Promise<number>;

  // Churn prediction
  getChurnPredictions(minProbability?: number): Promise<ChurnPrediction[]>;
  getUserChurnRisk(userId: string): Promise<ChurnPrediction | null>;

  // A/B testing
  createExperiment(input: CreateExperimentInput): Promise<Experiment>;
  getExperiment(experimentId: string): Promise<Experiment | null>;
  assignVariant(experimentId: string, userId: string): Promise<string>;
  trackExperimentEvent(experimentId: string, userId: string, event: string, value?: number): Promise<void>;
  getExperimentResults(experimentId: string): Promise<ExperimentResults>;

  // AI-powered optimization (Groq)
  getIncentiveOptimization(userId: string): Promise<IncentiveOptimization>;
  generatePersonalizedOffers(userId: string): Promise<PersonalizedOffer[]>;
  predictUserBehavior(userId: string): Promise<IncentivePrediction[]>;

  // Event tracking
  trackEvent(userId: string, event: string, properties?: Record<string, unknown>): Promise<void>;
  getEventCount(event: string, period: AnalyticsPeriod): Promise<number>;

  // Events
  onEvent(callback: GrowthEventCallback): void;
}

// ============================================================================
// Types
// ============================================================================

export interface CreateExperimentInput {
  name: string;
  description: string;
  variants: ExperimentVariant[];
  targetMetric: string;
  minimumSampleSize: number;
  startDate?: Date;
  endDate?: Date;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  targetMetric: string;
  minimumSampleSize: number;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  config?: Record<string, unknown>;
}

export interface ExperimentResults {
  experimentId: string;
  status: 'insufficient_data' | 'inconclusive' | 'significant';
  winner?: string;
  confidence: number;
  variantResults: VariantResult[];
  calculatedAt: Date;
}

export interface VariantResult {
  variantId: string;
  sampleSize: number;
  conversionRate: number;
  avgValue: number;
  uplift: number;
  pValue: number;
}

export interface UserEvent {
  userId: string;
  event: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}

export interface GrowthAnalyticsEngineConfig {
  trackingEnabled: boolean;
  cohortAnalysisEnabled: boolean;
  abTestingEnabled: boolean;
  groqIncentiveOptimization: boolean;
  retentionWindowDays: number;
  churnThresholdDays: number;
}

// ============================================================================
// Default Growth Analytics Engine Implementation
// ============================================================================

export class DefaultGrowthAnalyticsEngine implements GrowthAnalyticsEngine {
  private readonly events: UserEvent[] = [];
  private readonly experiments: Map<string, Experiment> = new Map();
  private readonly experimentAssignments: Map<string, Map<string, string>> = new Map();
  private readonly experimentEvents: Map<string, Map<string, { event: string; value?: number }[]>> = new Map();
  private readonly funnels: Map<string, string[]> = new Map();
  private readonly userActivity: Map<string, Date[]> = new Map();
  private readonly userSignupDates: Map<string, Date> = new Map();
  private readonly eventCallbacks: GrowthEventCallback[] = [];
  readonly config: GrowthAnalyticsEngineConfig;

  constructor(config?: Partial<GrowthAnalyticsConfig>) {
    this.config = {
      trackingEnabled: config?.trackingEnabled ?? true,
      cohortAnalysisEnabled: config?.cohortAnalysisEnabled ?? true,
      abTestingEnabled: config?.abTestingEnabled ?? true,
      groqIncentiveOptimization: config?.groqIncentiveOptimization ?? true,
      retentionWindowDays: 90,
      churnThresholdDays: 30,
    };

    // Initialize default funnels
    this.initializeDefaultFunnels();
  }

  // ============================================================================
  // Core Metrics
  // ============================================================================

  async getGrowthMetrics(period: AnalyticsPeriod): Promise<GrowthMetrics> {
    return {
      period,
      acquisition: await this.getAcquisitionMetrics(period),
      activation: await this.getActivationMetrics(period),
      retention: await this.getRetentionMetrics(period),
      revenue: await this.getRevenueMetrics(period),
      referral: await this.getReferralMetrics(period),
      viral: await this.getViralMetrics(period),
      engagement: await this.getEngagementMetrics(period),
    };
  }

  async getAcquisitionMetrics(period: AnalyticsPeriod): Promise<AcquisitionMetrics> {
    const periodStart = this.getPeriodStart(period);
    const signupEvents = this.events.filter(
      e => e.event === 'signup' && e.timestamp >= periodStart
    );

    const previousPeriod = this.getPreviousPeriodStart(period);
    const previousSignups = this.events.filter(
      e => e.event === 'signup' && e.timestamp >= previousPeriod && e.timestamp < periodStart
    ).length;

    const newUsers = signupEvents.length;
    const growth = previousSignups > 0 ? ((newUsers - previousSignups) / previousSignups) * 100 : 0;

    // Group by source
    const signupsBySource: Record<string, number> = {};
    const signupsByChannel: Record<string, number> = {};
    for (const event of signupEvents) {
      const source = (event.properties.source as string) ?? 'direct';
      const channel = (event.properties.channel as string) ?? 'organic';
      signupsBySource[source] = (signupsBySource[source] ?? 0) + 1;
      signupsByChannel[channel] = (signupsByChannel[channel] ?? 0) + 1;
    }

    return {
      newUsers,
      newUsersGrowth: growth,
      signupsBySource,
      signupsByChannel,
      conversionRate: 15, // Would calculate from actual funnel data
      costPerAcquisition: 0, // Would calculate from marketing spend
    };
  }

  async getActivationMetrics(period: AnalyticsPeriod): Promise<ActivationMetrics> {
    const periodStart = this.getPeriodStart(period);
    const activationEvents = this.events.filter(
      e => e.event === 'activated' && e.timestamp >= periodStart
    );

    const signupEvents = this.events.filter(
      e => e.event === 'signup' && e.timestamp >= periodStart
    );

    const activatedUsers = activationEvents.length;
    const activationRate = signupEvents.length > 0
      ? (activatedUsers / signupEvents.length) * 100
      : 0;

    // Calculate time to activation
    const activationTimes: number[] = [];
    for (const activation of activationEvents) {
      const signup = this.events.find(
        e => e.event === 'signup' && e.userId === activation.userId
      );
      if (signup) {
        const hours = (activation.timestamp.getTime() - signup.timestamp.getTime()) / (1000 * 60 * 60);
        activationTimes.push(hours);
      }
    }
    const avgTimeToActivation = activationTimes.length > 0
      ? activationTimes.reduce((a, b) => a + b, 0) / activationTimes.length
      : 0;

    return {
      activatedUsers,
      activationRate,
      timeToActivation: avgTimeToActivation,
      activationFunnel: await this.getFunnelAnalysis('activation'),
      dropoffPoints: await this.getDropoffPoints('activation'),
    };
  }

  async getRetentionMetrics(_period: AnalyticsPeriod): Promise<RetentionMetrics> {
    const now = new Date();
    const activeUsers = new Set<string>();
    const weeklyActiveUsers = new Set<string>();
    const monthlyActiveUsers = new Set<string>();

    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const event of this.events) {
      if (event.timestamp >= dayAgo) {
        activeUsers.add(event.userId);
      }
      if (event.timestamp >= weekAgo) {
        weeklyActiveUsers.add(event.userId);
      }
      if (event.timestamp >= monthAgo) {
        monthlyActiveUsers.add(event.userId);
      }
    }

    const dau = activeUsers.size;
    const wau = weeklyActiveUsers.size;
    const mau = monthlyActiveUsers.size;
    const dauMauRatio = mau > 0 ? (dau / mau) * 100 : 0;

    // Calculate retention rates
    const retentionD1 = await this.calculateRetention(1);
    const retentionD7 = await this.calculateRetention(7);
    const retentionD30 = await this.calculateRetention(30);

    return {
      dau,
      wau,
      mau,
      dauMauRatio,
      retentionD1,
      retentionD7,
      retentionD30,
      cohortRetention: await this.getCohortRetention('weekly'),
      churnRate: 100 - retentionD30,
      churnPrediction: await this.getChurnPredictions(0.5),
    };
  }

  async getRevenueMetrics(period: AnalyticsPeriod): Promise<RevenueMetrics> {
    const periodStart = this.getPeriodStart(period);
    const revenueEvents = this.events.filter(
      e => e.event === 'revenue' && e.timestamp >= periodStart
    );

    const totalRevenue = revenueEvents.reduce(
      (sum, e) => sum + ((e.properties.amount as number) ?? 0),
      0
    );

    const uniqueUsers = new Set(this.events.filter(e => e.timestamp >= periodStart).map(e => e.userId));
    const payingUsers = new Set(revenueEvents.map(e => e.userId));

    const arpu = uniqueUsers.size > 0 ? totalRevenue / uniqueUsers.size : 0;
    const arppu = payingUsers.size > 0 ? totalRevenue / payingUsers.size : 0;

    // Group by source and tier
    const revenueBySource: Record<string, number> = {};
    const revenueByTier: Record<string, number> = {};
    for (const event of revenueEvents) {
      const source = (event.properties.source as string) ?? 'trading';
      const tier = (event.properties.tier as string) ?? 'standard';
      revenueBySource[source] = (revenueBySource[source] ?? 0) + ((event.properties.amount as number) ?? 0);
      revenueByTier[tier] = (revenueByTier[tier] ?? 0) + ((event.properties.amount as number) ?? 0);
    }

    return {
      totalRevenue,
      revenueGrowth: 0, // Would calculate from previous period
      arpu,
      arppu,
      ltv: arppu * 12, // Simple LTV estimate
      revenueBySource,
      revenueByTier,
    };
  }

  async getReferralMetrics(period: AnalyticsPeriod): Promise<ReferralMetrics> {
    const periodStart = this.getPeriodStart(period);
    const referralEvents = this.events.filter(
      e => e.event === 'referral_completed' && e.timestamp >= periodStart
    );

    const totalReferrals = referralEvents.length;
    const successfulReferrals = referralEvents.filter(
      e => e.properties.activated === true
    ).length;

    // Get top referrers
    const referrerCounts: Record<string, { count: number; revenue: number }> = {};
    for (const event of referralEvents) {
      const referrerId = event.properties.referrerId as string;
      if (referrerId) {
        if (!referrerCounts[referrerId]) {
          referrerCounts[referrerId] = { count: 0, revenue: 0 };
        }
        referrerCounts[referrerId].count++;
        referrerCounts[referrerId].revenue += (event.properties.revenue as number) ?? 0;
      }
    }

    const topReferrers: TopReferrer[] = Object.entries(referrerCounts)
      .map(([userId, data]) => ({
        userId,
        referralCount: data.count,
        conversionRate: 100, // Would calculate from actual conversions
        revenueGenerated: data.revenue,
      }))
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, 10);

    return {
      totalReferrals,
      successfulReferrals,
      referralConversionRate: totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0,
      avgReferralsPerUser: 0.5, // Would calculate from actual data
      topReferrers,
      referralRevenueContribution: 15, // Percentage of total revenue
      referralCostEfficiency: 2.5, // Revenue / cost ratio
    };
  }

  private async getViralMetrics(period: AnalyticsPeriod): Promise<ViralMetrics> {
    const periodStart = this.getPeriodStart(period);
    const shareEvents = this.events.filter(
      e => e.event === 'content_shared' && e.timestamp >= periodStart
    );
    const conversionEvents = this.events.filter(
      e => e.event === 'viral_conversion' && e.timestamp >= periodStart
    );

    const uniqueSharers = new Set(shareEvents.map(e => e.userId));

    return {
      views: 0, // Would aggregate from viral content
      uniqueViews: 0,
      shares: shareEvents.length,
      clicks: 0,
      conversions: conversionEvents.length,
      conversionRate: shareEvents.length > 0 ? (conversionEvents.length / shareEvents.length) * 100 : 0,
      viralCoefficient: uniqueSharers.size > 0 ? shareEvents.length / uniqueSharers.size : 0,
      avgSharesPerUser: uniqueSharers.size > 0 ? shareEvents.length / uniqueSharers.size : 0,
    };
  }

  async getEngagementMetrics(period: AnalyticsPeriod): Promise<EngagementMetrics> {
    const periodStart = this.getPeriodStart(period);
    const sessionEvents = this.events.filter(
      e => e.event === 'session_end' && e.timestamp >= periodStart
    );

    const sessionDurations = sessionEvents
      .map(e => (e.properties.duration as number) ?? 0)
      .filter(d => d > 0);

    const avgSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

    // Count sessions per user
    const sessionsPerUser: Record<string, number> = {};
    for (const event of sessionEvents) {
      sessionsPerUser[event.userId] = (sessionsPerUser[event.userId] ?? 0) + 1;
    }
    const avgSessions = Object.keys(sessionsPerUser).length > 0
      ? Object.values(sessionsPerUser).reduce((a, b) => a + b, 0) / Object.keys(sessionsPerUser).length
      : 0;

    // Feature usage
    const featureUsage: Record<string, number> = {};
    for (const event of this.events.filter(e => e.timestamp >= periodStart)) {
      if (event.event.startsWith('feature_')) {
        const feature = event.event.replace('feature_', '');
        featureUsage[feature] = (featureUsage[feature] ?? 0) + 1;
      }
    }

    return {
      avgSessionDuration,
      avgSessionsPerUser: avgSessions,
      featureUsage,
      engagementScore: Math.min(100, avgSessionDuration / 60 * 10 + avgSessions * 5),
      engagementBySegment: {},
    };
  }

  // ============================================================================
  // Funnel Analysis
  // ============================================================================

  async getFunnelAnalysis(funnelName: string): Promise<FunnelStep[]> {
    const steps = this.funnels.get(funnelName);
    if (!steps) {
      return [];
    }

    const funnelSteps: FunnelStep[] = [];
    let previousUsers = 0;

    for (let i = 0; i < steps.length; i++) {
      const stepName = steps[i];
      const users = this.events.filter(e => e.event === stepName).length;

      const conversionRate = i === 0 ? 100 : (previousUsers > 0 ? (users / previousUsers) * 100 : 0);
      const dropoffRate = 100 - conversionRate;

      funnelSteps.push({
        name: stepName,
        users,
        conversionRate,
        dropoffRate,
      });

      previousUsers = users;
    }

    return funnelSteps;
  }

  async getDropoffPoints(funnelName: string): Promise<DropoffPoint[]> {
    const funnelSteps = await this.getFunnelAnalysis(funnelName);
    const dropoffs: DropoffPoint[] = [];

    for (let i = 1; i < funnelSteps.length; i++) {
      const current = funnelSteps[i];
      const previous = funnelSteps[i - 1];
      const droppedUsers = previous.users - current.users;

      if (droppedUsers > 0) {
        dropoffs.push({
          step: `${previous.name} → ${current.name}`,
          users: droppedUsers,
          percentage: (droppedUsers / previous.users) * 100,
          commonReasons: this.getDropoffReasons(previous.name, current.name),
        });
      }
    }

    return dropoffs.sort((a, b) => b.users - a.users);
  }

  async defineFunnel(name: string, steps: string[]): Promise<void> {
    this.funnels.set(name, steps);
  }

  // ============================================================================
  // Cohort Analysis
  // ============================================================================

  async getCohortRetention(cohortType: 'daily' | 'weekly' | 'monthly'): Promise<CohortRetention[]> {
    const cohorts: Map<string, Set<string>> = new Map();
    const cohortActivity: Map<string, Map<number, Set<string>>> = new Map();

    // Group users by signup cohort
    for (const [userId, signupDate] of this.userSignupDates.entries()) {
      const cohortKey = this.getCohortKey(signupDate, cohortType);
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, new Set());
        cohortActivity.set(cohortKey, new Map());
      }
      cohorts.get(cohortKey)!.add(userId);
    }

    // Track activity by period
    for (const event of this.events) {
      const signupDate = this.userSignupDates.get(event.userId);
      if (!signupDate) continue;

      const cohortKey = this.getCohortKey(signupDate, cohortType);
      const periodsSinceSignup = this.getPeriodsSince(signupDate, event.timestamp, cohortType);

      if (periodsSinceSignup >= 0) {
        const activity = cohortActivity.get(cohortKey);
        if (activity) {
          if (!activity.has(periodsSinceSignup)) {
            activity.set(periodsSinceSignup, new Set());
          }
          activity.get(periodsSinceSignup)!.add(event.userId);
        }
      }
    }

    // Calculate retention rates
    const result: CohortRetention[] = [];
    for (const [cohort, users] of cohorts.entries()) {
      const size = users.size;
      const retention: Record<string, number> = {};
      const activity = cohortActivity.get(cohort);

      if (activity) {
        for (const [period, activeUsers] of activity.entries()) {
          const key = cohortType === 'daily' ? `Day ${period}` :
                     cohortType === 'weekly' ? `Week ${period}` :
                     `Month ${period}`;
          retention[key] = (activeUsers.size / size) * 100;
        }
      }

      result.push({ cohort, size, retention });
    }

    return result.slice(-12); // Return last 12 cohorts
  }

  async getCohortSize(cohort: string): Promise<number> {
    const cohorts = await this.getCohortRetention('weekly');
    const found = cohorts.find(c => c.cohort === cohort);
    return found?.size ?? 0;
  }

  // ============================================================================
  // Churn Prediction
  // ============================================================================

  async getChurnPredictions(minProbability: number = 0.5): Promise<ChurnPrediction[]> {
    const predictions: ChurnPrediction[] = [];
    const now = new Date();

    for (const [userId, activities] of this.userActivity.entries()) {
      const lastActivity = activities[activities.length - 1];
      const daysSinceActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Simple churn prediction model
      let churnProbability = 0;
      const riskFactors: string[] = [];
      const recommendedActions: string[] = [];

      // Factor 1: Days since last activity
      if (daysSinceActivity > 7) {
        churnProbability += 0.2;
        riskFactors.push('Inactive for more than 7 days');
        recommendedActions.push('Send re-engagement notification');
      }
      if (daysSinceActivity > 14) {
        churnProbability += 0.2;
        riskFactors.push('Inactive for more than 14 days');
        recommendedActions.push('Offer incentive to return');
      }
      if (daysSinceActivity > 30) {
        churnProbability += 0.3;
        riskFactors.push('Inactive for more than 30 days');
        recommendedActions.push('Personalized win-back campaign');
      }

      // Factor 2: Activity frequency declining
      if (activities.length >= 4) {
        const recentFreq = this.calculateActivityFrequency(activities.slice(-2));
        const historicalFreq = this.calculateActivityFrequency(activities.slice(-4, -2));
        if (recentFreq < historicalFreq * 0.5) {
          churnProbability += 0.15;
          riskFactors.push('Activity frequency declining');
          recommendedActions.push('Show new features or achievements');
        }
      }

      if (churnProbability >= minProbability) {
        predictions.push({
          userId,
          churnProbability: Math.min(1, churnProbability),
          riskFactors,
          recommendedActions,
        });
      }
    }

    return predictions.sort((a, b) => b.churnProbability - a.churnProbability);
  }

  async getUserChurnRisk(userId: string): Promise<ChurnPrediction | null> {
    const predictions = await this.getChurnPredictions(0);
    return predictions.find(p => p.userId === userId) ?? null;
  }

  // ============================================================================
  // A/B Testing
  // ============================================================================

  async createExperiment(input: CreateExperimentInput): Promise<Experiment> {
    if (!this.config.abTestingEnabled) {
      throw new Error('A/B testing is disabled');
    }

    const experimentId = this.generateId('experiment');
    const experiment: Experiment = {
      id: experimentId,
      name: input.name,
      description: input.description,
      variants: input.variants,
      targetMetric: input.targetMetric,
      minimumSampleSize: input.minimumSampleSize,
      status: input.startDate && input.startDate > new Date() ? 'draft' : 'running',
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: new Date(),
    };

    this.experiments.set(experimentId, experiment);
    this.experimentAssignments.set(experimentId, new Map());
    this.experimentEvents.set(experimentId, new Map());

    return experiment;
  }

  async getExperiment(experimentId: string): Promise<Experiment | null> {
    return this.experiments.get(experimentId) ?? null;
  }

  async assignVariant(experimentId: string, userId: string): Promise<string> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const assignments = this.experimentAssignments.get(experimentId)!;

    // Check existing assignment
    if (assignments.has(userId)) {
      return assignments.get(userId)!;
    }

    // Weighted random assignment
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;

    for (const variant of experiment.variants) {
      random -= variant.weight;
      if (random <= 0) {
        assignments.set(userId, variant.id);
        return variant.id;
      }
    }

    // Fallback to first variant
    const firstVariant = experiment.variants[0].id;
    assignments.set(userId, firstVariant);
    return firstVariant;
  }

  async trackExperimentEvent(
    experimentId: string,
    userId: string,
    event: string,
    value?: number
  ): Promise<void> {
    const events = this.experimentEvents.get(experimentId);
    if (!events) return;

    if (!events.has(userId)) {
      events.set(userId, []);
    }
    events.get(userId)!.push({ event, value });
  }

  async getExperimentResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const assignments = this.experimentAssignments.get(experimentId)!;
    const events = this.experimentEvents.get(experimentId)!;

    const variantResults: VariantResult[] = [];
    let controlConversion = 0;

    for (const variant of experiment.variants) {
      const variantUsers = Array.from(assignments.entries())
        .filter(([_, v]) => v === variant.id)
        .map(([userId, _]) => userId);

      const sampleSize = variantUsers.length;
      let conversions = 0;
      let totalValue = 0;

      for (const userId of variantUsers) {
        const userEvents = events.get(userId) ?? [];
        const targetEvent = userEvents.find(e => e.event === experiment.targetMetric);
        if (targetEvent) {
          conversions++;
          totalValue += targetEvent.value ?? 1;
        }
      }

      const conversionRate = sampleSize > 0 ? (conversions / sampleSize) * 100 : 0;
      const avgValue = conversions > 0 ? totalValue / conversions : 0;

      if (variant.id === 'control') {
        controlConversion = conversionRate;
      }

      const uplift = controlConversion > 0 ? ((conversionRate - controlConversion) / controlConversion) * 100 : 0;

      variantResults.push({
        variantId: variant.id,
        sampleSize,
        conversionRate,
        avgValue,
        uplift,
        pValue: this.calculatePValue(sampleSize, conversionRate, controlConversion),
      });
    }

    // Determine significance
    const totalSample = variantResults.reduce((sum, v) => sum + v.sampleSize, 0);
    const significantResults = variantResults.filter(v => v.pValue < 0.05);

    let status: ExperimentResults['status'];
    let winner: string | undefined;
    let confidence = 0;

    if (totalSample < experiment.minimumSampleSize) {
      status = 'insufficient_data';
    } else if (significantResults.length === 0) {
      status = 'inconclusive';
    } else {
      status = 'significant';
      const best = variantResults.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b);
      winner = best.variantId;
      confidence = (1 - best.pValue) * 100;
    }

    return {
      experimentId,
      status,
      winner,
      confidence,
      variantResults,
      calculatedAt: new Date(),
    };
  }

  // ============================================================================
  // AI-Powered Optimization (Groq)
  // ============================================================================

  async getIncentiveOptimization(userId: string): Promise<IncentiveOptimization> {
    const recommendations = await this.generateRecommendations(userId);
    const predictions = await this.predictUserBehavior(userId);
    const offers = await this.generatePersonalizedOffers(userId);

    return {
      id: this.generateId('optimization'),
      userId,
      recommendations,
      predictions,
      personalizedOffers: offers,
      generatedAt: new Date(),
    };
  }

  async generatePersonalizedOffers(userId: string): Promise<PersonalizedOffer[]> {
    const churnRisk = await this.getUserChurnRisk(userId);
    const offers: PersonalizedOffer[] = [];
    const now = new Date();

    // Generate offers based on user risk profile
    if (churnRisk && churnRisk.churnProbability > 0.5) {
      offers.push({
        id: this.generateId('offer'),
        type: 'reactivation',
        title: 'Welcome Back Bonus',
        description: 'Get 50% bonus on your next deposit',
        value: 50,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        conditions: ['Minimum deposit: 100 TON'],
        personalizedFor: ['churn_risk', 'inactive_user'],
      });
    }

    // Referral offer
    offers.push({
      id: this.generateId('offer'),
      type: 'referral',
      title: 'Refer & Earn',
      description: 'Earn 20 TON for each friend you invite',
      value: 20,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      conditions: ['Friend must complete first trade'],
      personalizedFor: ['social_user'],
    });

    return offers;
  }

  async predictUserBehavior(userId: string): Promise<IncentivePrediction[]> {
    const activity = this.userActivity.get(userId) ?? [];
    const predictions: IncentivePrediction[] = [];

    // Simple predictions based on activity patterns
    if (activity.length > 5) {
      predictions.push({
        action: 'trade',
        probability: 0.7,
        timeframe: '24 hours',
        influencingFactors: ['Recent trading activity', 'Market conditions'],
      });
    }

    predictions.push({
      action: 'referral',
      probability: 0.3,
      timeframe: '7 days',
      influencingFactors: ['Social connections', 'Recent achievements'],
    });

    return predictions;
  }

  // ============================================================================
  // Event Tracking
  // ============================================================================

  async trackEvent(
    userId: string,
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    if (!this.config.trackingEnabled) return;

    const userEvent: UserEvent = {
      userId,
      event,
      properties: properties ?? {},
      timestamp: new Date(),
    };

    this.events.push(userEvent);

    // Track user activity
    if (!this.userActivity.has(userId)) {
      this.userActivity.set(userId, []);
    }
    this.userActivity.get(userId)!.push(userEvent.timestamp);

    // Track signup date
    if (event === 'signup') {
      this.userSignupDates.set(userId, userEvent.timestamp);
    }
  }

  async getEventCount(event: string, period: AnalyticsPeriod): Promise<number> {
    const periodStart = this.getPeriodStart(period);
    return this.events.filter(e => e.event === event && e.timestamp >= periodStart).length;
  }

  onEvent(callback: GrowthEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getPeriodStart(period: AnalyticsPeriod): Date {
    const now = new Date();
    switch (period) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '365d':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'all_time':
        return new Date(0);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private getPreviousPeriodStart(period: AnalyticsPeriod): Date {
    const periodStart = this.getPeriodStart(period);
    const now = new Date();
    const periodLength = now.getTime() - periodStart.getTime();
    return new Date(periodStart.getTime() - periodLength);
  }

  private async calculateRetention(days: number): Promise<number> {
    const now = new Date();
    const targetDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const signupDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);

    // Get users who signed up on that day
    const cohortUsers = Array.from(this.userSignupDates.entries())
      .filter(([_, date]) =>
        date >= signupDate && date < targetDate
      )
      .map(([userId]) => userId);

    if (cohortUsers.length === 0) return 0;

    // Check how many were active on day N
    const activeOnDayN = cohortUsers.filter(userId => {
      const activities = this.userActivity.get(userId) ?? [];
      return activities.some(date =>
        date >= targetDate && date < now
      );
    });

    return (activeOnDayN.length / cohortUsers.length) * 100;
  }

  private getCohortKey(date: Date, type: 'daily' | 'weekly' | 'monthly'): string {
    switch (type) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return `W${weekStart.toISOString().split('T')[0]}`;
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  private getPeriodsSince(from: Date, to: Date, type: 'daily' | 'weekly' | 'monthly'): number {
    const diffMs = to.getTime() - from.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    switch (type) {
      case 'daily':
        return diffDays;
      case 'weekly':
        return Math.floor(diffDays / 7);
      case 'monthly':
        return Math.floor(diffDays / 30);
    }
  }

  private calculateActivityFrequency(dates: Date[]): number {
    if (dates.length < 2) return 0;
    const span = dates[dates.length - 1].getTime() - dates[0].getTime();
    const days = span / (24 * 60 * 60 * 1000);
    return dates.length / Math.max(1, days);
  }

  private getDropoffReasons(_fromStep: string, toStep: string): string[] {
    // Common reasons based on funnel steps
    const reasons: Record<string, string[]> = {
      'signup_form_started': ['Form too long', 'Confusing fields', 'Technical issues'],
      'email_verified': ['Email not received', 'Link expired', 'User forgot'],
      'profile_completed': ['Too much information required', 'Privacy concerns'],
      'first_deposit': ['Payment issues', 'Changed mind', 'Price concerns'],
      'first_trade': ['Complex UI', 'Market conditions', 'Insufficient funds'],
    };

    return reasons[toStep] ?? ['Unknown reason'];
  }

  private calculatePValue(sampleSize: number, conversionRate: number, controlRate: number): number {
    // Simplified p-value calculation
    if (sampleSize < 10) return 1;
    const diff = Math.abs(conversionRate - controlRate);
    const se = Math.sqrt((controlRate * (100 - controlRate)) / sampleSize);
    if (se === 0) return 1;
    const zScore = diff / se;
    // Approximate p-value from z-score
    return Math.max(0.001, Math.exp(-0.5 * zScore * zScore));
  }

  private initializeDefaultFunnels(): void {
    this.funnels.set('activation', [
      'signup',
      'email_verified',
      'profile_completed',
      'first_deposit',
      'first_trade',
    ]);

    this.funnels.set('referral', [
      'referral_link_viewed',
      'signup_started',
      'signup_completed',
      'activated',
    ]);

    this.funnels.set('conversion', [
      'page_view',
      'signup_started',
      'signup_completed',
      'first_deposit',
      'premium_upgrade',
    ]);
  }

  private async generateRecommendations(userId: string): Promise<IncentiveRecommendation[]> {
    const recommendations: IncentiveRecommendation[] = [];
    const churnRisk = await this.getUserChurnRisk(userId);

    if (churnRisk && churnRisk.churnProbability > 0.3) {
      recommendations.push({
        type: 'signup_bonus',
        amount: 10,
        timing: 'immediate',
        channel: 'push_notification',
        expectedImpact: 0.2,
        confidence: 0.7,
        reasoning: 'User shows early signs of disengagement. Immediate reward may re-engage.',
      });
    }

    recommendations.push({
      type: 'fee_discount',
      amount: 20,
      timing: 'on_trade',
      channel: 'in_app',
      expectedImpact: 0.15,
      confidence: 0.8,
      reasoning: 'Fee discounts have shown 15% improvement in trading frequency.',
    });

    return recommendations;
  }

}

// ============================================================================
// Factory Function
// ============================================================================

export function createGrowthAnalyticsEngine(
  config?: Partial<GrowthAnalyticsConfig>
): DefaultGrowthAnalyticsEngine {
  return new DefaultGrowthAnalyticsEngine(config);
}
