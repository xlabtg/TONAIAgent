/**
 * TONAIAgent - Global Expansion Strategy Manager
 *
 * Manages global expansion strategies including regional expansion planning,
 * partnership planning, prospect management, timeline and milestone tracking,
 * budget allocation, KPI monitoring, and risk assessment.
 */

import {
  ExpansionStrategy,
  RegionExpansionPlan,
  PartnershipPlan,
  ExpansionTimeline,
  ExpansionBudget,
  ExpansionKPI,
  ExpansionRisk,
  ExpansionProgress,
  PartnerProspect,
  GeographicRegion,
  InstitutionalPartnerType,
  InstitutionalNetworkEvent,
  InstitutionalNetworkEventCallback,
  ExpansionConfig,
  PhaseMilestone,
  PhasedTimeline,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface ExpansionManager {
  // Strategy CRUD
  createExpansionStrategy(config: CreateExpansionStrategyRequest): Promise<ExpansionStrategy>;
  getStrategy(strategyId: string): Promise<ExpansionStrategy | null>;
  updateStrategy(strategyId: string, updates: ExpansionStrategyUpdates): Promise<ExpansionStrategy>;
  deleteStrategy(strategyId: string): Promise<void>;

  // Strategy queries
  listStrategies(filters?: ExpansionStrategyFilters): Promise<ExpansionStrategy[]>;
  getActiveStrategies(): Promise<ExpansionStrategy[]>;
  getStrategiesByStatus(status: ExpansionStrategy['status']): Promise<ExpansionStrategy[]>;

  // Regional expansion management
  addRegionalPlan(strategyId: string, plan: Omit<RegionExpansionPlan, 'timeline'>): Promise<RegionExpansionPlan>;
  updateRegionalPlan(strategyId: string, region: GeographicRegion, updates: Partial<RegionExpansionPlan>): Promise<RegionExpansionPlan>;
  updateRegionalStatus(strategyId: string, region: GeographicRegion, status: RegionExpansionPlan['status']): Promise<void>;
  removeRegionalPlan(strategyId: string, region: GeographicRegion): Promise<void>;
  getRegionalPlans(strategyId: string): Promise<RegionExpansionPlan[]>;

  // Partnership planning
  addPartnershipPlan(strategyId: string, plan: Omit<PartnershipPlan, 'prospects'>): Promise<PartnershipPlan>;
  updatePartnershipPlan(strategyId: string, targetType: InstitutionalPartnerType, updates: Partial<PartnershipPlan>): Promise<PartnershipPlan>;
  removePartnershipPlan(strategyId: string, targetType: InstitutionalPartnerType): Promise<void>;
  getPartnershipPlans(strategyId: string): Promise<PartnershipPlan[]>;

  // Prospect management
  addProspect(strategyId: string, prospect: Omit<PartnerProspect, 'id'>): Promise<PartnerProspect>;
  updateProspect(prospectId: string, updates: Partial<PartnerProspect>): Promise<PartnerProspect>;
  updateProspectStatus(prospectId: string, status: PartnerProspect['status']): Promise<void>;
  removeProspect(prospectId: string): Promise<void>;
  getProspects(strategyId: string, filters?: ProspectFilters): Promise<PartnerProspect[]>;
  getProspectsByStatus(status: PartnerProspect['status']): Promise<PartnerProspect[]>;

  // Milestone tracking
  recordMilestone(strategyId: string, milestone: RecordMilestoneRequest): Promise<PhaseMilestone>;
  updateMilestone(strategyId: string, milestoneName: string, updates: Partial<PhaseMilestone>): Promise<PhaseMilestone>;
  getMilestones(strategyId: string): Promise<PhaseMilestone[]>;
  getUpcomingMilestones(daysAhead: number): Promise<MilestoneAlert[]>;
  getMissedMilestones(): Promise<MilestoneAlert[]>;

  // Budget management
  updateBudget(strategyId: string, category: string, amount: string): Promise<void>;
  recordExpense(strategyId: string, category: string, amount: string, description?: string): Promise<ExpenseRecord>;
  getBudgetSummary(strategyId: string): Promise<ExpansionBudget>;
  getBudgetVariance(strategyId: string): Promise<BudgetVarianceReport>;

  // KPI monitoring
  updateKPI(strategyId: string, kpiName: string, value: string | number): Promise<ExpansionKPI>;
  getKPIs(strategyId: string): Promise<ExpansionKPI[]>;
  getKPIsByStatus(status: ExpansionKPI['status']): Promise<ExpansionKPI[]>;
  getKPITrends(strategyId: string): Promise<KPITrendReport>;

  // Risk management
  addRisk(strategyId: string, risk: Omit<ExpansionRisk, 'id'>): Promise<ExpansionRisk>;
  updateRisk(strategyId: string, riskId: string, updates: Partial<ExpansionRisk>): Promise<ExpansionRisk>;
  mitigateRisk(strategyId: string, riskId: string, mitigation: string): Promise<void>;
  closeRisk(strategyId: string, riskId: string, resolution: string): Promise<void>;
  getRisks(strategyId: string, filters?: RiskFilters): Promise<ExpansionRisk[]>;
  getRiskAssessment(strategyId: string): Promise<RiskAssessmentReport>;

  // Progress tracking
  getExpansionProgress(): Promise<GlobalExpansionProgress>;
  getRegionalProgress(region: GeographicRegion): Promise<RegionalProgressReport>;
  getStrategyProgress(strategyId: string): Promise<ExpansionProgress>;
  updateProgress(strategyId: string, updates: Partial<ExpansionProgress>): Promise<ExpansionProgress>;

  // Health and analytics
  getExpansionHealth(): Promise<ExpansionHealthReport>;
  getExpansionAnalytics(): Promise<ExpansionAnalytics>;

  // Event handling
  onEvent(callback: InstitutionalNetworkEventCallback): void;

  // Health check
  getHealth(): ExpansionManagerHealth;
}

export interface CreateExpansionStrategyRequest {
  name: string;
  status?: ExpansionStrategy['status'];
  initialRegions?: Omit<RegionExpansionPlan, 'timeline'>[];
  initialPartnerships?: Omit<PartnershipPlan, 'prospects'>[];
  timeline?: Partial<ExpansionTimeline>;
  budget?: Partial<ExpansionBudget>;
  kpis?: Omit<ExpansionKPI, 'lastUpdated'>[];
  metadata?: Record<string, unknown>;
}

export interface ExpansionStrategyUpdates {
  name?: string;
  status?: ExpansionStrategy['status'];
  timeline?: Partial<ExpansionTimeline>;
  budget?: Partial<ExpansionBudget>;
  metadata?: Record<string, unknown>;
}

export interface ExpansionStrategyFilters {
  statuses?: ExpansionStrategy['status'][];
  regions?: GeographicRegion[];
  minProgress?: number;
  maxProgress?: number;
  hasActiveRisks?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProspectFilters {
  statuses?: PartnerProspect['status'][];
  types?: InstitutionalPartnerType[];
  regions?: GeographicRegion[];
  priorities?: ('high' | 'medium' | 'low')[];
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export interface RiskFilters {
  categories?: ExpansionRisk['category'][];
  statuses?: ExpansionRisk['status'][];
  likelihoods?: ExpansionRisk['likelihood'][];
  impacts?: ExpansionRisk['impact'][];
}

export interface RecordMilestoneRequest {
  name: string;
  targetDate: Date;
  actualDate?: Date;
  status?: PhaseMilestone['status'];
  notes?: string;
}

export interface MilestoneAlert {
  strategyId: string;
  strategyName: string;
  milestone: PhaseMilestone;
  daysUntilTarget: number;
  severity: 'info' | 'warning' | 'critical';
}

export interface ExpenseRecord {
  id: string;
  strategyId: string;
  category: string;
  amount: string;
  description?: string;
  recordedAt: Date;
  recordedBy?: string;
}

export interface BudgetVarianceReport {
  strategyId: string;
  totalBudget: string;
  totalSpent: string;
  totalVariance: string;
  variancePercent: number;
  categories: BudgetCategoryVariance[];
  overBudgetCategories: string[];
  underBudgetCategories: string[];
  projectedOverrun?: string;
  recommendations: string[];
}

export interface BudgetCategoryVariance {
  name: string;
  budgeted: string;
  spent: string;
  variance: string;
  variancePercent: number;
  status: 'on_budget' | 'under_budget' | 'over_budget' | 'critical';
}

export interface KPITrendReport {
  strategyId: string;
  kpis: KPITrend[];
  overallTrend: 'improving' | 'stable' | 'declining';
  highlights: string[];
  concerns: string[];
}

export interface KPITrend {
  name: string;
  currentValue: string | number;
  targetValue: string | number;
  historicalValues: { date: Date; value: string | number }[];
  trend: 'up' | 'down' | 'stable';
  trendStrength: number;
  projectedAchievement?: Date;
}

export interface RiskAssessmentReport {
  strategyId: string;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  totalRisks: number;
  openRisks: number;
  mitigatedRisks: number;
  closedRisks: number;
  risksByCategory: Record<string, number>;
  risksByImpact: Record<string, number>;
  criticalRisks: ExpansionRisk[];
  highPriorityActions: string[];
  riskScore: number;
  recommendations: string[];
}

export interface GlobalExpansionProgress {
  totalStrategies: number;
  activeStrategies: number;
  completedStrategies: number;
  averageProgress: number;
  regionsEntered: number;
  totalRegionsTarget: number;
  partnersOnboarded: number;
  totalPartnersTarget: number;
  milestonesAchieved: number;
  totalMilestones: number;
  budgetUtilization: number;
  overallHealth: 'healthy' | 'at_risk' | 'critical';
  topPerformingRegions: GeographicRegion[];
  underperformingRegions: GeographicRegion[];
  recentMilestones: PhaseMilestone[];
  upcomingMilestones: PhaseMilestone[];
}

export interface RegionalProgressReport {
  region: GeographicRegion;
  status: RegionExpansionPlan['status'];
  progress: number;
  partnersOnboarded: number;
  partnersTarget: number;
  prospectsInPipeline: number;
  regulatoryStatus: string;
  investmentSpent: string;
  investmentBudget: string;
  milestonesAchieved: number;
  milestonesTotal: number;
  risks: ExpansionRisk[];
  kpis: ExpansionKPI[];
  timeline: PhasedTimeline;
  recommendations: string[];
}

export interface ExpansionHealthReport {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  healthScore: number;
  strategiesHealth: StrategyHealthSummary[];
  regionalHealth: RegionalHealthSummary[];
  budgetHealth: BudgetHealthSummary;
  riskHealth: RiskHealthSummary;
  kpiHealth: KPIHealthSummary;
  issues: HealthIssue[];
  recommendations: string[];
}

export interface StrategyHealthSummary {
  strategyId: string;
  strategyName: string;
  health: 'healthy' | 'at_risk' | 'critical';
  progress: number;
  onSchedule: boolean;
  withinBudget: boolean;
  issues: string[];
}

export interface RegionalHealthSummary {
  region: GeographicRegion;
  health: 'healthy' | 'at_risk' | 'critical';
  progress: number;
  partnerProgress: number;
  regulatoryProgress: number;
  issues: string[];
}

export interface BudgetHealthSummary {
  health: 'healthy' | 'warning' | 'critical';
  totalAllocated: string;
  totalSpent: string;
  utilizationPercent: number;
  overBudgetStrategies: number;
  projectedOverrun: string;
}

export interface RiskHealthSummary {
  health: 'healthy' | 'warning' | 'critical';
  totalRisks: number;
  criticalRisks: number;
  highRisks: number;
  unmitigatedRisks: number;
  riskTrend: 'improving' | 'stable' | 'worsening';
}

export interface KPIHealthSummary {
  health: 'healthy' | 'warning' | 'critical';
  totalKPIs: number;
  onTrackKPIs: number;
  atRiskKPIs: number;
  behindKPIs: number;
  achievedKPIs: number;
}

export interface HealthIssue {
  category: 'strategy' | 'region' | 'budget' | 'risk' | 'kpi' | 'timeline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEntity: string;
  recommendation?: string;
}

export interface ExpansionAnalytics {
  periodStart: Date;
  periodEnd: Date;
  metrics: {
    strategiesCreated: number;
    strategiesCompleted: number;
    regionsEntered: number;
    partnersOnboarded: number;
    prospectsConverted: number;
    milestonesAchieved: number;
    budgetSpent: string;
    risksIdentified: number;
    risksMitigated: number;
  };
  trends: {
    expansionVelocity: 'accelerating' | 'stable' | 'decelerating';
    partnerAcquisition: 'accelerating' | 'stable' | 'decelerating';
    budgetEfficiency: 'improving' | 'stable' | 'declining';
    riskProfile: 'improving' | 'stable' | 'worsening';
  };
  insights: string[];
  recommendations: string[];
}

export interface ExpansionManagerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  strategyCount: number;
  activeStrategies: number;
  lastUpdatedAt: Date;
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultExpansionManager implements ExpansionManager {
  private strategies: Map<string, ExpansionStrategy> = new Map();
  private prospects: Map<string, PartnerProspect> = new Map();
  private prospectToStrategy: Map<string, string> = new Map();
  private expenses: Map<string, ExpenseRecord[]> = new Map();
  private eventCallbacks: InstitutionalNetworkEventCallback[] = [];
  private config: ExpansionConfig;
  private lastUpdatedAt: Date = new Date();

  constructor(config?: Partial<ExpansionConfig>) {
    this.config = {
      enabled: true,
      priorityRegions: ['north_america', 'europe', 'asia_pacific'],
      targetPartnerTypes: ['hedge_fund', 'crypto_fund', 'custodian', 'bank'],
      budgetAllocation: '10000000',
      ...config,
    };
  }

  getConfig(): ExpansionConfig {
    return this.config;
  }

  async createExpansionStrategy(request: CreateExpansionStrategyRequest): Promise<ExpansionStrategy> {
    const strategyId = this.generateId('strategy');

    const strategy: ExpansionStrategy = {
      id: strategyId,
      name: request.name,
      status: request.status || 'planning',
      regions: [],
      partnerships: [],
      timeline: {
        totalDurationMonths: request.timeline?.totalDurationMonths || 24,
        phases: request.timeline?.phases || [],
        criticalPath: request.timeline?.criticalPath || [],
        dependencies: request.timeline?.dependencies || [],
      },
      budget: {
        totalBudget: request.budget?.totalBudget || '0',
        allocated: request.budget?.allocated || '0',
        spent: request.budget?.spent || '0',
        remaining: request.budget?.remaining || request.budget?.totalBudget || '0',
        categories: request.budget?.categories || [],
        contingency: request.budget?.contingency || '0',
        contingencyUsed: request.budget?.contingencyUsed || '0',
      },
      kpis: (request.kpis || []).map((kpi) => ({
        ...kpi,
        lastUpdated: new Date(),
      })),
      risks: [],
      progress: {
        overallProgress: 0,
        phaseProgress: {},
        milestonesAchieved: 0,
        milestonesTotal: 0,
        partnersOnboarded: 0,
        partnersTarget: 0,
        regionsEntered: 0,
        regionsTarget: 0,
        lastUpdated: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add initial regional plans
    if (request.initialRegions) {
      for (const regionPlan of request.initialRegions) {
        const fullPlan: RegionExpansionPlan = {
          ...regionPlan,
          timeline: {
            phases: [],
            startDate: new Date(),
            targetEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        };
        strategy.regions.push(fullPlan);
        strategy.progress.regionsTarget++;
      }
    }

    // Add initial partnership plans
    if (request.initialPartnerships) {
      for (const partnershipPlan of request.initialPartnerships) {
        const fullPlan: PartnershipPlan = {
          ...partnershipPlan,
          prospects: [],
        };
        strategy.partnerships.push(fullPlan);
        strategy.progress.partnersTarget += fullPlan.count;
      }
    }

    this.strategies.set(strategyId, strategy);
    this.expenses.set(strategyId, []);
    this.lastUpdatedAt = new Date();
    this.emitEvent('expansion_milestone', 'expansion', strategyId, 'strategy_created', { name: request.name });

    return strategy;
  }

  async getStrategy(strategyId: string): Promise<ExpansionStrategy | null> {
    return this.strategies.get(strategyId) || null;
  }

  async updateStrategy(strategyId: string, updates: ExpansionStrategyUpdates): Promise<ExpansionStrategy> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const previousStatus = strategy.status;
    const updatedStrategy: ExpansionStrategy = {
      ...strategy,
      ...updates,
      timeline: updates.timeline ? { ...strategy.timeline, ...updates.timeline } : strategy.timeline,
      budget: updates.budget ? { ...strategy.budget, ...updates.budget } : strategy.budget,
      updatedAt: new Date(),
    };

    this.strategies.set(strategyId, updatedStrategy);
    this.lastUpdatedAt = new Date();

    if (updates.status && updates.status !== previousStatus) {
      this.emitEvent('expansion_milestone', 'expansion', strategyId, 'status_changed', {
        previousStatus,
        newStatus: updates.status,
      });
    }

    return updatedStrategy;
  }

  async deleteStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    // Remove associated prospects
    for (const [prospectId, sId] of this.prospectToStrategy.entries()) {
      if (sId === strategyId) {
        this.prospects.delete(prospectId);
        this.prospectToStrategy.delete(prospectId);
      }
    }

    this.strategies.delete(strategyId);
    this.expenses.delete(strategyId);
    this.lastUpdatedAt = new Date();
  }

  async listStrategies(filters?: ExpansionStrategyFilters): Promise<ExpansionStrategy[]> {
    let strategies = Array.from(this.strategies.values());

    if (filters) {
      if (filters.statuses?.length) {
        strategies = strategies.filter((s) => filters.statuses!.includes(s.status));
      }
      if (filters.regions?.length) {
        strategies = strategies.filter((s) =>
          s.regions.some((r) => filters.regions!.includes(r.region))
        );
      }
      if (filters.minProgress !== undefined) {
        strategies = strategies.filter((s) => s.progress.overallProgress >= filters.minProgress!);
      }
      if (filters.maxProgress !== undefined) {
        strategies = strategies.filter((s) => s.progress.overallProgress <= filters.maxProgress!);
      }
      if (filters.hasActiveRisks) {
        strategies = strategies.filter((s) =>
          s.risks.some((r) => r.status === 'open')
        );
      }

      // Sorting
      if (filters.sortBy) {
        strategies.sort((a, b) => {
          const aVal = this.getNestedValue(a, filters.sortBy!);
          const bVal = this.getNestedValue(b, filters.sortBy!);
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          return aVal > bVal ? order : aVal < bVal ? -order : 0;
        });
      }

      // Pagination
      if (filters.offset !== undefined) {
        strategies = strategies.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        strategies = strategies.slice(0, filters.limit);
      }
    }

    return strategies;
  }

  async getActiveStrategies(): Promise<ExpansionStrategy[]> {
    return this.listStrategies({ statuses: ['in_progress', 'approved'] });
  }

  async getStrategiesByStatus(status: ExpansionStrategy['status']): Promise<ExpansionStrategy[]> {
    return this.listStrategies({ statuses: [status] });
  }

  async addRegionalPlan(
    strategyId: string,
    plan: Omit<RegionExpansionPlan, 'timeline'>
  ): Promise<RegionExpansionPlan> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    // Check if region already exists
    const existingIndex = strategy.regions.findIndex((r) => r.region === plan.region);
    if (existingIndex !== -1) {
      throw new Error(`Regional plan already exists for region: ${plan.region}`);
    }

    const fullPlan: RegionExpansionPlan = {
      ...plan,
      timeline: {
        phases: [],
        startDate: new Date(),
        targetEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    };

    strategy.regions.push(fullPlan);
    strategy.progress.regionsTarget++;
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    this.emitEvent('expansion_milestone', 'expansion', strategyId, 'region_added', {
      region: plan.region,
      priority: plan.priority,
    });

    return fullPlan;
  }

  async updateRegionalPlan(
    strategyId: string,
    region: GeographicRegion,
    updates: Partial<RegionExpansionPlan>
  ): Promise<RegionExpansionPlan> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const regionIndex = strategy.regions.findIndex((r) => r.region === region);
    if (regionIndex === -1) {
      throw new Error(`Regional plan not found for region: ${region}`);
    }

    strategy.regions[regionIndex] = {
      ...strategy.regions[regionIndex],
      ...updates,
    };
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    return strategy.regions[regionIndex];
  }

  async updateRegionalStatus(
    strategyId: string,
    region: GeographicRegion,
    status: RegionExpansionPlan['status']
  ): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const regionPlan = strategy.regions.find((r) => r.region === region);
    if (!regionPlan) {
      throw new Error(`Regional plan not found for region: ${region}`);
    }

    const previousStatus = regionPlan.status;
    regionPlan.status = status;
    strategy.updatedAt = new Date();

    // Update regions entered count
    if (status === 'entry' || status === 'growth' || status === 'mature') {
      if (previousStatus === 'research' || previousStatus === 'planning') {
        strategy.progress.regionsEntered++;
      }
    }

    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    this.emitEvent('expansion_milestone', 'expansion', strategyId, 'region_status_changed', {
      region,
      previousStatus,
      newStatus: status,
    });
  }

  async removeRegionalPlan(strategyId: string, region: GeographicRegion): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const regionIndex = strategy.regions.findIndex((r) => r.region === region);
    if (regionIndex === -1) {
      throw new Error(`Regional plan not found for region: ${region}`);
    }

    strategy.regions.splice(regionIndex, 1);
    strategy.progress.regionsTarget--;
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();
  }

  async getRegionalPlans(strategyId: string): Promise<RegionExpansionPlan[]> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    return strategy.regions;
  }

  async addPartnershipPlan(
    strategyId: string,
    plan: Omit<PartnershipPlan, 'prospects'>
  ): Promise<PartnershipPlan> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    // Check if partnership plan for this type already exists
    const existingIndex = strategy.partnerships.findIndex((p) => p.targetType === plan.targetType);
    if (existingIndex !== -1) {
      throw new Error(`Partnership plan already exists for type: ${plan.targetType}`);
    }

    const fullPlan: PartnershipPlan = {
      ...plan,
      prospects: [],
    };

    strategy.partnerships.push(fullPlan);
    strategy.progress.partnersTarget += plan.count;
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    return fullPlan;
  }

  async updatePartnershipPlan(
    strategyId: string,
    targetType: InstitutionalPartnerType,
    updates: Partial<PartnershipPlan>
  ): Promise<PartnershipPlan> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const planIndex = strategy.partnerships.findIndex((p) => p.targetType === targetType);
    if (planIndex === -1) {
      throw new Error(`Partnership plan not found for type: ${targetType}`);
    }

    const oldCount = strategy.partnerships[planIndex].count;
    strategy.partnerships[planIndex] = {
      ...strategy.partnerships[planIndex],
      ...updates,
    };

    // Update target if count changed
    if (updates.count !== undefined && updates.count !== oldCount) {
      strategy.progress.partnersTarget += updates.count - oldCount;
    }

    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    return strategy.partnerships[planIndex];
  }

  async removePartnershipPlan(strategyId: string, targetType: InstitutionalPartnerType): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const planIndex = strategy.partnerships.findIndex((p) => p.targetType === targetType);
    if (planIndex === -1) {
      throw new Error(`Partnership plan not found for type: ${targetType}`);
    }

    strategy.progress.partnersTarget -= strategy.partnerships[planIndex].count;
    strategy.partnerships.splice(planIndex, 1);
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();
  }

  async getPartnershipPlans(strategyId: string): Promise<PartnershipPlan[]> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    return strategy.partnerships;
  }

  async addProspect(strategyId: string, prospect: Omit<PartnerProspect, 'id'>): Promise<PartnerProspect> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const prospectId = this.generateId('prospect');
    const newProspect: PartnerProspect = {
      id: prospectId,
      ...prospect,
    };

    this.prospects.set(prospectId, newProspect);
    this.prospectToStrategy.set(prospectId, strategyId);

    // Add to appropriate partnership plan
    const partnershipPlan = strategy.partnerships.find((p) => p.targetType === prospect.type);
    if (partnershipPlan) {
      partnershipPlan.prospects.push(newProspect);
    }

    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    return newProspect;
  }

  async updateProspect(prospectId: string, updates: Partial<PartnerProspect>): Promise<PartnerProspect> {
    const prospect = this.prospects.get(prospectId);
    if (!prospect) {
      throw new Error(`Prospect not found: ${prospectId}`);
    }

    const updatedProspect: PartnerProspect = {
      ...prospect,
      ...updates,
    };

    this.prospects.set(prospectId, updatedProspect);

    // Update in strategy partnership plan
    const strategyId = this.prospectToStrategy.get(prospectId);
    if (strategyId) {
      const strategy = this.strategies.get(strategyId);
      if (strategy) {
        for (const plan of strategy.partnerships) {
          const index = plan.prospects.findIndex((p) => p.id === prospectId);
          if (index !== -1) {
            plan.prospects[index] = updatedProspect;
            break;
          }
        }
        strategy.updatedAt = new Date();
        this.strategies.set(strategyId, strategy);
      }
    }

    this.lastUpdatedAt = new Date();
    return updatedProspect;
  }

  async updateProspectStatus(prospectId: string, status: PartnerProspect['status']): Promise<void> {
    const prospect = this.prospects.get(prospectId);
    if (!prospect) {
      throw new Error(`Prospect not found: ${prospectId}`);
    }

    const previousStatus = prospect.status;
    prospect.status = status;
    this.prospects.set(prospectId, prospect);

    const strategyId = this.prospectToStrategy.get(prospectId);
    if (strategyId) {
      const strategy = this.strategies.get(strategyId);
      if (strategy) {
        // Update partners onboarded if closed
        if (status === 'closed' && previousStatus !== 'closed') {
          strategy.progress.partnersOnboarded++;
        } else if (previousStatus === 'closed' && status !== 'closed') {
          strategy.progress.partnersOnboarded--;
        }

        // Update in partnership plan
        for (const plan of strategy.partnerships) {
          const index = plan.prospects.findIndex((p) => p.id === prospectId);
          if (index !== -1) {
            plan.prospects[index].status = status;
            break;
          }
        }

        strategy.updatedAt = new Date();
        this.strategies.set(strategyId, strategy);
      }
    }

    this.lastUpdatedAt = new Date();
  }

  async removeProspect(prospectId: string): Promise<void> {
    const prospect = this.prospects.get(prospectId);
    if (!prospect) {
      throw new Error(`Prospect not found: ${prospectId}`);
    }

    const strategyId = this.prospectToStrategy.get(prospectId);
    if (strategyId) {
      const strategy = this.strategies.get(strategyId);
      if (strategy) {
        for (const plan of strategy.partnerships) {
          const index = plan.prospects.findIndex((p) => p.id === prospectId);
          if (index !== -1) {
            plan.prospects.splice(index, 1);
            break;
          }
        }
        strategy.updatedAt = new Date();
        this.strategies.set(strategyId, strategy);
      }
    }

    this.prospects.delete(prospectId);
    this.prospectToStrategy.delete(prospectId);
    this.lastUpdatedAt = new Date();
  }

  async getProspects(strategyId: string, filters?: ProspectFilters): Promise<PartnerProspect[]> {
    let prospects: PartnerProspect[] = [];

    for (const [prospectId, sId] of this.prospectToStrategy.entries()) {
      if (sId === strategyId) {
        const prospect = this.prospects.get(prospectId);
        if (prospect) {
          prospects.push(prospect);
        }
      }
    }

    if (filters) {
      if (filters.statuses?.length) {
        prospects = prospects.filter((p) => filters.statuses!.includes(p.status));
      }
      if (filters.types?.length) {
        prospects = prospects.filter((p) => filters.types!.includes(p.type));
      }
      if (filters.regions?.length) {
        prospects = prospects.filter((p) => filters.regions!.includes(p.region));
      }
      if (filters.priorities?.length) {
        prospects = prospects.filter((p) => filters.priorities!.includes(p.priority));
      }
      if (filters.assignedTo) {
        prospects = prospects.filter((p) => p.assignedTo === filters.assignedTo);
      }

      // Pagination
      if (filters.offset !== undefined) {
        prospects = prospects.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        prospects = prospects.slice(0, filters.limit);
      }
    }

    return prospects;
  }

  async getProspectsByStatus(status: PartnerProspect['status']): Promise<PartnerProspect[]> {
    return Array.from(this.prospects.values()).filter((p) => p.status === status);
  }

  async recordMilestone(strategyId: string, milestone: RecordMilestoneRequest): Promise<PhaseMilestone> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const newMilestone: PhaseMilestone = {
      name: milestone.name,
      targetDate: milestone.targetDate,
      actualDate: milestone.actualDate,
      status: milestone.status || 'pending',
      notes: milestone.notes,
    };

    // Add to timeline phases
    if (strategy.timeline.phases.length === 0) {
      strategy.timeline.phases.push({
        name: 'Main Phase',
        order: 1,
        status: 'in_progress',
        startDate: new Date(),
        endDate: new Date(Date.now() + strategy.timeline.totalDurationMonths * 30 * 24 * 60 * 60 * 1000),
        deliverables: [],
        milestones: [newMilestone],
      });
    } else {
      strategy.timeline.phases[0].milestones.push(newMilestone);
    }

    strategy.progress.milestonesTotal++;
    if (newMilestone.status === 'achieved') {
      strategy.progress.milestonesAchieved++;
    }

    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    if (newMilestone.status === 'achieved') {
      this.emitEvent('expansion_milestone', 'expansion', strategyId, 'milestone_achieved', {
        milestone: milestone.name,
      });
    }

    return newMilestone;
  }

  async updateMilestone(
    strategyId: string,
    milestoneName: string,
    updates: Partial<PhaseMilestone>
  ): Promise<PhaseMilestone> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    let milestone: PhaseMilestone | null = null;
    for (const phase of strategy.timeline.phases) {
      const index = phase.milestones.findIndex((m) => m.name === milestoneName);
      if (index !== -1) {
        const previousStatus = phase.milestones[index].status;
        phase.milestones[index] = {
          ...phase.milestones[index],
          ...updates,
        };
        milestone = phase.milestones[index];

        // Update achieved count
        if (updates.status === 'achieved' && previousStatus !== 'achieved') {
          strategy.progress.milestonesAchieved++;
          this.emitEvent('expansion_milestone', 'expansion', strategyId, 'milestone_achieved', {
            milestone: milestoneName,
          });
        } else if (previousStatus === 'achieved' && updates.status !== 'achieved') {
          strategy.progress.milestonesAchieved--;
        }

        break;
      }
    }

    if (!milestone) {
      throw new Error(`Milestone not found: ${milestoneName}`);
    }

    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    return milestone;
  }

  async getMilestones(strategyId: string): Promise<PhaseMilestone[]> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const milestones: PhaseMilestone[] = [];
    for (const phase of strategy.timeline.phases) {
      milestones.push(...phase.milestones);
    }
    return milestones;
  }

  async getUpcomingMilestones(daysAhead: number): Promise<MilestoneAlert[]> {
    const alerts: MilestoneAlert[] = [];
    const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    for (const strategy of this.strategies.values()) {
      for (const phase of strategy.timeline.phases) {
        for (const milestone of phase.milestones) {
          if (milestone.status === 'pending' || milestone.status === 'at_risk') {
            if (milestone.targetDate <= cutoffDate) {
              const daysUntilTarget = Math.ceil(
                (milestone.targetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
              );
              alerts.push({
                strategyId: strategy.id,
                strategyName: strategy.name,
                milestone,
                daysUntilTarget,
                severity: daysUntilTarget <= 7 ? 'critical' : daysUntilTarget <= 14 ? 'warning' : 'info',
              });
            }
          }
        }
      }
    }

    return alerts.sort((a, b) => a.daysUntilTarget - b.daysUntilTarget);
  }

  async getMissedMilestones(): Promise<MilestoneAlert[]> {
    const alerts: MilestoneAlert[] = [];
    const now = new Date();

    for (const strategy of this.strategies.values()) {
      for (const phase of strategy.timeline.phases) {
        for (const milestone of phase.milestones) {
          if (milestone.status === 'missed' ||
              (milestone.status === 'pending' && milestone.targetDate < now)) {
            const daysUntilTarget = Math.ceil(
              (milestone.targetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            );
            alerts.push({
              strategyId: strategy.id,
              strategyName: strategy.name,
              milestone,
              daysUntilTarget,
              severity: 'critical',
            });
          }
        }
      }
    }

    return alerts;
  }

  async updateBudget(strategyId: string, category: string, amount: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const categoryIndex = strategy.budget.categories.findIndex((c) => c.name === category);
    if (categoryIndex === -1) {
      strategy.budget.categories.push({
        name: category,
        budgeted: amount,
        spent: '0',
        variance: amount,
        variancePercent: 100,
      });
    } else {
      const cat = strategy.budget.categories[categoryIndex];
      cat.budgeted = amount;
      const budgeted = parseFloat(amount.replace(/[^0-9.-]/g, '') || '0');
      const spent = parseFloat(cat.spent.replace(/[^0-9.-]/g, '') || '0');
      cat.variance = (budgeted - spent).toString();
      cat.variancePercent = budgeted > 0 ? ((budgeted - spent) / budgeted) * 100 : 0;
    }

    // Recalculate totals
    this.recalculateBudget(strategy);
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();
  }

  async recordExpense(
    strategyId: string,
    category: string,
    amount: string,
    description?: string
  ): Promise<ExpenseRecord> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const expense: ExpenseRecord = {
      id: this.generateId('expense'),
      strategyId,
      category,
      amount,
      description,
      recordedAt: new Date(),
    };

    // Update category spending
    const categoryIndex = strategy.budget.categories.findIndex((c) => c.name === category);
    if (categoryIndex === -1) {
      strategy.budget.categories.push({
        name: category,
        budgeted: '0',
        spent: amount,
        variance: `-${amount}`,
        variancePercent: -100,
      });
    } else {
      const cat = strategy.budget.categories[categoryIndex];
      const currentSpent = parseFloat(cat.spent.replace(/[^0-9.-]/g, '') || '0');
      const expenseAmount = parseFloat(amount.replace(/[^0-9.-]/g, '') || '0');
      const newSpent = currentSpent + expenseAmount;
      cat.spent = newSpent.toString();

      const budgeted = parseFloat(cat.budgeted.replace(/[^0-9.-]/g, '') || '0');
      cat.variance = (budgeted - newSpent).toString();
      cat.variancePercent = budgeted > 0 ? ((budgeted - newSpent) / budgeted) * 100 : 0;
    }

    // Track expense
    const strategyExpenses = this.expenses.get(strategyId) || [];
    strategyExpenses.push(expense);
    this.expenses.set(strategyId, strategyExpenses);

    // Recalculate totals
    this.recalculateBudget(strategy);
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    return expense;
  }

  async getBudgetSummary(strategyId: string): Promise<ExpansionBudget> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    return strategy.budget;
  }

  async getBudgetVariance(strategyId: string): Promise<BudgetVarianceReport> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const budget = strategy.budget;
    const totalBudget = parseFloat(budget.totalBudget.replace(/[^0-9.-]/g, '') || '0');
    const totalSpent = parseFloat(budget.spent.replace(/[^0-9.-]/g, '') || '0');
    const totalVariance = totalBudget - totalSpent;
    const variancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

    const categories: BudgetCategoryVariance[] = budget.categories.map((cat) => {
      const budgeted = parseFloat(cat.budgeted.replace(/[^0-9.-]/g, '') || '0');
      const spent = parseFloat(cat.spent.replace(/[^0-9.-]/g, '') || '0');
      const variance = budgeted - spent;
      const catVariancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      let status: BudgetCategoryVariance['status'] = 'on_budget';
      if (catVariancePercent < -20) status = 'critical';
      else if (catVariancePercent < 0) status = 'over_budget';
      else if (catVariancePercent > 20) status = 'under_budget';

      return {
        name: cat.name,
        budgeted: cat.budgeted,
        spent: cat.spent,
        variance: variance.toString(),
        variancePercent: catVariancePercent,
        status,
      };
    });

    const overBudgetCategories = categories
      .filter((c) => c.status === 'over_budget' || c.status === 'critical')
      .map((c) => c.name);
    const underBudgetCategories = categories
      .filter((c) => c.status === 'under_budget')
      .map((c) => c.name);

    const recommendations: string[] = [];
    if (overBudgetCategories.length > 0) {
      recommendations.push(`Review spending in categories: ${overBudgetCategories.join(', ')}`);
    }
    if (variancePercent < -10) {
      recommendations.push('Consider requesting additional budget allocation');
    }

    return {
      strategyId,
      totalBudget: budget.totalBudget,
      totalSpent: budget.spent,
      totalVariance: totalVariance.toString(),
      variancePercent,
      categories,
      overBudgetCategories,
      underBudgetCategories,
      projectedOverrun: variancePercent < 0 ? Math.abs(totalVariance).toString() : undefined,
      recommendations,
    };
  }

  async updateKPI(strategyId: string, kpiName: string, value: string | number): Promise<ExpansionKPI> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    let kpi = strategy.kpis.find((k) => k.name === kpiName);
    if (!kpi) {
      // Create new KPI
      kpi = {
        name: kpiName,
        target: value,
        current: value,
        unit: typeof value === 'number' ? 'number' : 'string',
        status: 'on_track',
        trend: 'stable',
        lastUpdated: new Date(),
      };
      strategy.kpis.push(kpi);
    } else {
      // Update existing KPI
      const previousValue = kpi.current;
      kpi.current = value;
      kpi.lastUpdated = new Date();

      // Determine trend
      const prevNum = typeof previousValue === 'number' ? previousValue : parseFloat(String(previousValue).replace(/[^0-9.-]/g, '') || '0');
      const currNum = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '') || '0');

      if (currNum > prevNum) {
        kpi.trend = 'up';
      } else if (currNum < prevNum) {
        kpi.trend = 'down';
      } else {
        kpi.trend = 'stable';
      }

      // Determine status
      const targetNum = typeof kpi.target === 'number' ? kpi.target : parseFloat(String(kpi.target).replace(/[^0-9.-]/g, '') || '0');
      const progressPercent = targetNum > 0 ? (currNum / targetNum) * 100 : 0;

      if (progressPercent >= 100) {
        kpi.status = 'achieved';
      } else if (progressPercent >= 80) {
        kpi.status = 'on_track';
      } else if (progressPercent >= 50) {
        kpi.status = 'at_risk';
      } else {
        kpi.status = 'behind';
      }
    }

    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    return kpi;
  }

  async getKPIs(strategyId: string): Promise<ExpansionKPI[]> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    return strategy.kpis;
  }

  async getKPIsByStatus(status: ExpansionKPI['status']): Promise<ExpansionKPI[]> {
    const kpis: ExpansionKPI[] = [];
    for (const strategy of this.strategies.values()) {
      kpis.push(...strategy.kpis.filter((k) => k.status === status));
    }
    return kpis;
  }

  async getKPITrends(strategyId: string): Promise<KPITrendReport> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const kpiTrends: KPITrend[] = strategy.kpis.map((kpi) => ({
      name: kpi.name,
      currentValue: kpi.current,
      targetValue: kpi.target,
      historicalValues: [], // Would need historical tracking
      trend: kpi.trend,
      trendStrength: kpi.trend === 'up' ? 1 : kpi.trend === 'down' ? -1 : 0,
      projectedAchievement: kpi.status === 'on_track' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
    }));

    const upTrends = kpiTrends.filter((k) => k.trend === 'up').length;
    const downTrends = kpiTrends.filter((k) => k.trend === 'down').length;

    let overallTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (upTrends > downTrends * 1.5) {
      overallTrend = 'improving';
    } else if (downTrends > upTrends * 1.5) {
      overallTrend = 'declining';
    }

    const highlights: string[] = [];
    const concerns: string[] = [];

    for (const kpi of strategy.kpis) {
      if (kpi.status === 'achieved') {
        highlights.push(`${kpi.name} has achieved its target`);
      } else if (kpi.status === 'behind') {
        concerns.push(`${kpi.name} is behind target`);
      }
    }

    return {
      strategyId,
      kpis: kpiTrends,
      overallTrend,
      highlights,
      concerns,
    };
  }

  async addRisk(strategyId: string, risk: Omit<ExpansionRisk, 'id'>): Promise<ExpansionRisk> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const newRisk: ExpansionRisk = {
      id: this.generateId('risk'),
      ...risk,
    };

    strategy.risks.push(newRisk);
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    if (risk.impact === 'critical' || risk.impact === 'high') {
      this.emitEvent('risk_alert', 'risk', strategyId, 'risk_identified', {
        riskId: newRisk.id,
        category: risk.category,
        impact: risk.impact,
      });
    }

    return newRisk;
  }

  async updateRisk(
    strategyId: string,
    riskId: string,
    updates: Partial<ExpansionRisk>
  ): Promise<ExpansionRisk> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const riskIndex = strategy.risks.findIndex((r) => r.id === riskId);
    if (riskIndex === -1) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    strategy.risks[riskIndex] = {
      ...strategy.risks[riskIndex],
      ...updates,
    };

    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    return strategy.risks[riskIndex];
  }

  async mitigateRisk(strategyId: string, riskId: string, mitigation: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const risk = strategy.risks.find((r) => r.id === riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    risk.mitigation = mitigation;
    risk.status = 'mitigated';
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    this.emitEvent('risk_alert', 'risk', strategyId, 'risk_mitigated', {
      riskId,
      mitigation,
    });
  }

  async closeRisk(strategyId: string, riskId: string, resolution: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const risk = strategy.risks.find((r) => r.id === riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    risk.status = 'closed';
    risk.mitigation = resolution;
    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();
  }

  async getRisks(strategyId: string, filters?: RiskFilters): Promise<ExpansionRisk[]> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    let risks = [...strategy.risks];

    if (filters) {
      if (filters.categories?.length) {
        risks = risks.filter((r) => filters.categories!.includes(r.category));
      }
      if (filters.statuses?.length) {
        risks = risks.filter((r) => filters.statuses!.includes(r.status));
      }
      if (filters.likelihoods?.length) {
        risks = risks.filter((r) => filters.likelihoods!.includes(r.likelihood));
      }
      if (filters.impacts?.length) {
        risks = risks.filter((r) => filters.impacts!.includes(r.impact));
      }
    }

    return risks;
  }

  async getRiskAssessment(strategyId: string): Promise<RiskAssessmentReport> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const risks = strategy.risks;
    const openRisks = risks.filter((r) => r.status === 'open');
    const mitigatedRisks = risks.filter((r) => r.status === 'mitigated');
    const closedRisks = risks.filter((r) => r.status === 'closed');

    const risksByCategory: Record<string, number> = {};
    const risksByImpact: Record<string, number> = {};

    for (const risk of risks) {
      risksByCategory[risk.category] = (risksByCategory[risk.category] || 0) + 1;
      risksByImpact[risk.impact] = (risksByImpact[risk.impact] || 0) + 1;
    }

    const criticalRisks = risks.filter((r) => r.impact === 'critical' && r.status === 'open');

    // Calculate risk score (simple weighted average)
    const impactWeights = { low: 1, medium: 2, high: 3, critical: 4 };
    const likelihoodWeights = { low: 1, medium: 2, high: 3 };
    let riskScore = 0;
    for (const risk of openRisks) {
      riskScore += impactWeights[risk.impact] * likelihoodWeights[risk.likelihood];
    }
    riskScore = openRisks.length > 0 ? riskScore / (openRisks.length * 12) * 100 : 0;

    let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore > 75 || criticalRisks.length > 0) {
      overallRiskLevel = 'critical';
    } else if (riskScore > 50) {
      overallRiskLevel = 'high';
    } else if (riskScore > 25) {
      overallRiskLevel = 'medium';
    }

    const highPriorityActions: string[] = [];
    for (const risk of criticalRisks) {
      highPriorityActions.push(`Mitigate critical risk: ${risk.description}`);
    }

    const recommendations: string[] = [];
    if (openRisks.length > mitigatedRisks.length) {
      recommendations.push('Focus on mitigating open risks');
    }
    if (criticalRisks.length > 0) {
      recommendations.push('Prioritize critical risks for immediate attention');
    }

    return {
      strategyId,
      overallRiskLevel,
      totalRisks: risks.length,
      openRisks: openRisks.length,
      mitigatedRisks: mitigatedRisks.length,
      closedRisks: closedRisks.length,
      risksByCategory,
      risksByImpact,
      criticalRisks,
      highPriorityActions,
      riskScore,
      recommendations,
    };
  }

  async getExpansionProgress(): Promise<GlobalExpansionProgress> {
    const strategies = Array.from(this.strategies.values());
    const activeStrategies = strategies.filter(
      (s) => s.status === 'in_progress' || s.status === 'approved'
    );
    const completedStrategies = strategies.filter((s) => s.status === 'completed');

    let totalProgress = 0;
    let totalRegionsEntered = 0;
    let totalRegionsTarget = 0;
    let totalPartnersOnboarded = 0;
    let totalPartnersTarget = 0;
    let totalMilestonesAchieved = 0;
    let totalMilestones = 0;
    let totalBudget = 0;
    let totalSpent = 0;

    const regionProgress: Record<GeographicRegion, number> = {} as any;

    for (const strategy of strategies) {
      totalProgress += strategy.progress.overallProgress;
      totalRegionsEntered += strategy.progress.regionsEntered;
      totalRegionsTarget += strategy.progress.regionsTarget;
      totalPartnersOnboarded += strategy.progress.partnersOnboarded;
      totalPartnersTarget += strategy.progress.partnersTarget;
      totalMilestonesAchieved += strategy.progress.milestonesAchieved;
      totalMilestones += strategy.progress.milestonesTotal;
      totalBudget += parseFloat(strategy.budget.totalBudget.replace(/[^0-9.-]/g, '') || '0');
      totalSpent += parseFloat(strategy.budget.spent.replace(/[^0-9.-]/g, '') || '0');

      for (const region of strategy.regions) {
        const progress = this.calculateRegionProgress(region);
        regionProgress[region.region] = (regionProgress[region.region] || 0) + progress;
      }
    }

    const averageProgress = strategies.length > 0 ? totalProgress / strategies.length : 0;
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Determine overall health
    let overallHealth: 'healthy' | 'at_risk' | 'critical' = 'healthy';
    if (averageProgress < 30 || budgetUtilization > 90) {
      overallHealth = 'critical';
    } else if (averageProgress < 60 || budgetUtilization > 80) {
      overallHealth = 'at_risk';
    }

    // Get top and underperforming regions
    const sortedRegions = Object.entries(regionProgress).sort((a, b) => b[1] - a[1]);
    const topPerformingRegions = sortedRegions.slice(0, 3).map(([r]) => r as GeographicRegion);
    const underperformingRegions = sortedRegions.slice(-3).map(([r]) => r as GeographicRegion);

    // Get recent and upcoming milestones
    const allMilestones: PhaseMilestone[] = [];
    for (const strategy of strategies) {
      for (const phase of strategy.timeline.phases) {
        allMilestones.push(...phase.milestones);
      }
    }

    const recentMilestones = allMilestones
      .filter((m) => m.status === 'achieved' && m.actualDate)
      .sort((a, b) => (b.actualDate?.getTime() || 0) - (a.actualDate?.getTime() || 0))
      .slice(0, 5);

    const upcomingMilestones = allMilestones
      .filter((m) => m.status === 'pending' || m.status === 'at_risk')
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
      .slice(0, 5);

    return {
      totalStrategies: strategies.length,
      activeStrategies: activeStrategies.length,
      completedStrategies: completedStrategies.length,
      averageProgress,
      regionsEntered: totalRegionsEntered,
      totalRegionsTarget,
      partnersOnboarded: totalPartnersOnboarded,
      totalPartnersTarget,
      milestonesAchieved: totalMilestonesAchieved,
      totalMilestones,
      budgetUtilization,
      overallHealth,
      topPerformingRegions,
      underperformingRegions,
      recentMilestones,
      upcomingMilestones,
    };
  }

  async getRegionalProgress(region: GeographicRegion): Promise<RegionalProgressReport> {
    let regionPlan: RegionExpansionPlan | null = null;
    let strategyId: string | null = null;

    for (const strategy of this.strategies.values()) {
      const plan = strategy.regions.find((r) => r.region === region);
      if (plan) {
        regionPlan = plan;
        strategyId = strategy.id;
        break;
      }
    }

    if (!regionPlan || !strategyId) {
      throw new Error(`No expansion plan found for region: ${region}`);
    }

    const strategy = this.strategies.get(strategyId)!;
    const prospects = await this.getProspects(strategyId, { regions: [region] });
    const partnersOnboarded = prospects.filter((p) => p.status === 'closed').length;
    const prospectsInPipeline = prospects.filter(
      (p) => p.status !== 'closed' && p.status !== 'lost'
    ).length;

    const regionKPIs = strategy.kpis.filter((k) => k.name.toLowerCase().includes(region.toLowerCase()));
    const regionRisks = strategy.risks.filter(
      (r) => r.description.toLowerCase().includes(region.toLowerCase())
    );

    const progress = this.calculateRegionProgress(regionPlan);

    const recommendations: string[] = [];
    if (progress < 50) {
      recommendations.push(`Accelerate expansion activities in ${region}`);
    }
    if (prospectsInPipeline < 5) {
      recommendations.push(`Increase prospect pipeline for ${region}`);
    }

    return {
      region,
      status: regionPlan.status,
      progress,
      partnersOnboarded,
      partnersTarget: regionPlan.targetMetrics.partnerCount,
      prospectsInPipeline,
      regulatoryStatus: regionPlan.regulatoryApproach.currentStatus,
      investmentSpent: '0', // Would need tracking
      investmentBudget: regionPlan.investmentRequired,
      milestonesAchieved: regionPlan.timeline.phases.filter(
        (p) => p.status === 'completed'
      ).length,
      milestonesTotal: regionPlan.timeline.phases.length,
      risks: regionRisks,
      kpis: regionKPIs,
      timeline: regionPlan.timeline,
      recommendations,
    };
  }

  async getStrategyProgress(strategyId: string): Promise<ExpansionProgress> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    return strategy.progress;
  }

  async updateProgress(strategyId: string, updates: Partial<ExpansionProgress>): Promise<ExpansionProgress> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    strategy.progress = {
      ...strategy.progress,
      ...updates,
      lastUpdated: new Date(),
    };

    strategy.updatedAt = new Date();
    this.strategies.set(strategyId, strategy);
    this.lastUpdatedAt = new Date();

    return strategy.progress;
  }

  async getExpansionHealth(): Promise<ExpansionHealthReport> {
    const strategies = Array.from(this.strategies.values());
    const strategiesHealth: StrategyHealthSummary[] = [];
    const regionalHealth: RegionalHealthSummary[] = [];
    const issues: HealthIssue[] = [];

    let totalBudget = 0;
    let totalSpent = 0;
    let totalRisks = 0;
    let criticalRisks = 0;
    let highRisks = 0;
    let unmitigatedRisks = 0;
    let totalKPIs = 0;
    let onTrackKPIs = 0;
    let atRiskKPIs = 0;
    let behindKPIs = 0;
    let achievedKPIs = 0;

    const regionHealthMap: Map<GeographicRegion, { progress: number; count: number; issues: string[] }> = new Map();

    for (const strategy of strategies) {
      // Strategy health
      const strategyIssues: string[] = [];
      const progress = strategy.progress.overallProgress;
      const budgetSpent = parseFloat(strategy.budget.spent.replace(/[^0-9.-]/g, '') || '0');
      const budgetTotal = parseFloat(strategy.budget.totalBudget.replace(/[^0-9.-]/g, '') || '0');
      const withinBudget = budgetTotal === 0 || budgetSpent <= budgetTotal;
      const onSchedule = progress >= 50; // Simplified

      if (!withinBudget) {
        strategyIssues.push('Over budget');
        issues.push({
          category: 'budget',
          severity: 'high',
          description: `Strategy ${strategy.name} is over budget`,
          affectedEntity: strategy.id,
        });
      }

      const openRisks = strategy.risks.filter((r) => r.status === 'open');
      if (openRisks.some((r) => r.impact === 'critical')) {
        strategyIssues.push('Has critical risks');
        issues.push({
          category: 'risk',
          severity: 'critical',
          description: `Strategy ${strategy.name} has critical open risks`,
          affectedEntity: strategy.id,
        });
      }

      let strategyHealth: 'healthy' | 'at_risk' | 'critical' = 'healthy';
      if (strategyIssues.length > 2 || !withinBudget) {
        strategyHealth = 'critical';
      } else if (strategyIssues.length > 0) {
        strategyHealth = 'at_risk';
      }

      strategiesHealth.push({
        strategyId: strategy.id,
        strategyName: strategy.name,
        health: strategyHealth,
        progress,
        onSchedule,
        withinBudget,
        issues: strategyIssues,
      });

      // Aggregate budget
      totalBudget += budgetTotal;
      totalSpent += budgetSpent;

      // Aggregate risks
      for (const risk of strategy.risks) {
        totalRisks++;
        if (risk.status === 'open') {
          unmitigatedRisks++;
          if (risk.impact === 'critical') criticalRisks++;
          if (risk.impact === 'high') highRisks++;
        }
      }

      // Aggregate KPIs
      for (const kpi of strategy.kpis) {
        totalKPIs++;
        switch (kpi.status) {
          case 'on_track':
            onTrackKPIs++;
            break;
          case 'at_risk':
            atRiskKPIs++;
            break;
          case 'behind':
            behindKPIs++;
            break;
          case 'achieved':
            achievedKPIs++;
            break;
        }
      }

      // Regional health
      for (const region of strategy.regions) {
        const existing = regionHealthMap.get(region.region) || { progress: 0, count: 0, issues: [] };
        const regionProgress = this.calculateRegionProgress(region);
        existing.progress += regionProgress;
        existing.count++;
        if (regionProgress < 30) {
          existing.issues.push(`Low progress in ${strategy.name}`);
        }
        regionHealthMap.set(region.region, existing);
      }
    }

    // Build regional health summaries
    for (const [region, data] of regionHealthMap.entries()) {
      const avgProgress = data.count > 0 ? data.progress / data.count : 0;
      let health: 'healthy' | 'at_risk' | 'critical' = 'healthy';
      if (avgProgress < 30) health = 'critical';
      else if (avgProgress < 60) health = 'at_risk';

      regionalHealth.push({
        region,
        health,
        progress: avgProgress,
        partnerProgress: avgProgress, // Simplified
        regulatoryProgress: avgProgress, // Simplified
        issues: data.issues,
      });
    }

    // Budget health
    const utilizationPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const overBudgetStrategies = strategiesHealth.filter((s) => !s.withinBudget).length;
    let budgetHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (utilizationPercent > 100 || overBudgetStrategies > 0) {
      budgetHealth = 'critical';
    } else if (utilizationPercent > 80) {
      budgetHealth = 'warning';
    }

    // Risk health
    let riskHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalRisks > 0) {
      riskHealth = 'critical';
    } else if (highRisks > 2 || unmitigatedRisks > 5) {
      riskHealth = 'warning';
    }

    // KPI health
    let kpiHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (behindKPIs > onTrackKPIs) {
      kpiHealth = 'critical';
    } else if (atRiskKPIs > onTrackKPIs) {
      kpiHealth = 'warning';
    }

    // Overall health
    let healthScore = 100;
    healthScore -= criticalRisks * 10;
    healthScore -= highRisks * 5;
    healthScore -= overBudgetStrategies * 10;
    healthScore -= behindKPIs * 5;
    healthScore = Math.max(0, healthScore);

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (healthScore < 50 || budgetHealth === 'critical' || riskHealth === 'critical') {
      overallHealth = 'critical';
    } else if (healthScore < 75) {
      overallHealth = 'degraded';
    }

    const recommendations: string[] = [];
    if (criticalRisks > 0) {
      recommendations.push('Address critical risks immediately');
    }
    if (overBudgetStrategies > 0) {
      recommendations.push('Review budget allocations for over-budget strategies');
    }
    if (behindKPIs > 0) {
      recommendations.push('Focus on improving KPIs that are behind target');
    }

    return {
      overallHealth,
      healthScore,
      strategiesHealth,
      regionalHealth,
      budgetHealth: {
        health: budgetHealth,
        totalAllocated: totalBudget.toString(),
        totalSpent: totalSpent.toString(),
        utilizationPercent,
        overBudgetStrategies,
        projectedOverrun: totalSpent > totalBudget ? (totalSpent - totalBudget).toString() : '0',
      },
      riskHealth: {
        health: riskHealth,
        totalRisks,
        criticalRisks,
        highRisks,
        unmitigatedRisks,
        riskTrend: 'stable',
      },
      kpiHealth: {
        health: kpiHealth,
        totalKPIs,
        onTrackKPIs,
        atRiskKPIs,
        behindKPIs,
        achievedKPIs,
      },
      issues,
      recommendations,
    };
  }

  async getExpansionAnalytics(): Promise<ExpansionAnalytics> {
    const strategies = Array.from(this.strategies.values());
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let strategiesCreated = 0;
    let strategiesCompleted = 0;
    let regionsEntered = 0;
    let partnersOnboarded = 0;
    let prospectsConverted = 0;
    let milestonesAchieved = 0;
    let budgetSpent = 0;
    let risksIdentified = 0;
    let risksMitigated = 0;

    for (const strategy of strategies) {
      if (strategy.createdAt >= thirtyDaysAgo) {
        strategiesCreated++;
      }
      if (strategy.status === 'completed' && strategy.updatedAt >= thirtyDaysAgo) {
        strategiesCompleted++;
      }

      regionsEntered += strategy.progress.regionsEntered;
      partnersOnboarded += strategy.progress.partnersOnboarded;
      milestonesAchieved += strategy.progress.milestonesAchieved;
      budgetSpent += parseFloat(strategy.budget.spent.replace(/[^0-9.-]/g, '') || '0');

      for (const risk of strategy.risks) {
        risksIdentified++;
        if (risk.status === 'mitigated' || risk.status === 'closed') {
          risksMitigated++;
        }
      }
    }

    // Calculate prospects converted
    for (const prospect of this.prospects.values()) {
      if (prospect.status === 'closed') {
        prospectsConverted++;
      }
    }

    // Determine trends
    const previousProgress = strategies.reduce((sum, s) => sum + s.progress.overallProgress, 0) / Math.max(strategies.length, 1);
    const expansionVelocity: 'accelerating' | 'stable' | 'decelerating' =
      previousProgress > 60 ? 'accelerating' : previousProgress > 30 ? 'stable' : 'decelerating';

    const insights: string[] = [];
    if (strategiesCreated > 2) {
      insights.push(`${strategiesCreated} new strategies created this period`);
    }
    if (partnersOnboarded > 5) {
      insights.push(`Strong partner acquisition with ${partnersOnboarded} partners onboarded`);
    }

    const recommendations: string[] = [];
    if (risksMitigated < risksIdentified * 0.5) {
      recommendations.push('Focus on mitigating identified risks');
    }

    return {
      periodStart: thirtyDaysAgo,
      periodEnd: now,
      metrics: {
        strategiesCreated,
        strategiesCompleted,
        regionsEntered,
        partnersOnboarded,
        prospectsConverted,
        milestonesAchieved,
        budgetSpent: budgetSpent.toString(),
        risksIdentified,
        risksMitigated,
      },
      trends: {
        expansionVelocity,
        partnerAcquisition: partnersOnboarded > 5 ? 'accelerating' : 'stable',
        budgetEfficiency: 'stable',
        riskProfile: risksMitigated > risksIdentified * 0.5 ? 'improving' : 'stable',
      },
      insights,
      recommendations,
    };
  }

  onEvent(callback: InstitutionalNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): ExpansionManagerHealth {
    const issues: string[] = [];
    const strategies = Array.from(this.strategies.values());
    const activeStrategies = strategies.filter(
      (s) => s.status === 'in_progress' || s.status === 'approved'
    ).length;

    // Check for stale data
    const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - this.lastUpdatedAt.getTime() > staleThreshold) {
      issues.push('Expansion data is stale');
    }

    // Check for critical risks
    let criticalRiskCount = 0;
    for (const strategy of strategies) {
      criticalRiskCount += strategy.risks.filter(
        (r) => r.status === 'open' && r.impact === 'critical'
      ).length;
    }
    if (criticalRiskCount > 0) {
      issues.push(`${criticalRiskCount} critical risks require attention`);
    }

    return {
      status: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'degraded' : 'unhealthy',
      strategyCount: strategies.length,
      activeStrategies,
      lastUpdatedAt: this.lastUpdatedAt,
      issues,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    type: InstitutionalNetworkEvent['type'],
    category: InstitutionalNetworkEvent['category'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: InstitutionalNetworkEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      category,
      severity: 'info',
      source: 'expansion_manager',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedEntities: [{ type: 'strategy', id: sourceId, impact: 'direct' }],
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

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj) || 0;
  }

  private recalculateBudget(strategy: ExpansionStrategy): void {
    let totalAllocated = 0;
    let totalSpent = 0;

    for (const category of strategy.budget.categories) {
      totalAllocated += parseFloat(category.budgeted.replace(/[^0-9.-]/g, '') || '0');
      totalSpent += parseFloat(category.spent.replace(/[^0-9.-]/g, '') || '0');
    }

    strategy.budget.allocated = totalAllocated.toString();
    strategy.budget.spent = totalSpent.toString();

    const totalBudget = parseFloat(strategy.budget.totalBudget.replace(/[^0-9.-]/g, '') || '0');
    strategy.budget.remaining = (totalBudget - totalSpent).toString();
  }

  private calculateRegionProgress(region: RegionExpansionPlan): number {
    // Calculate progress based on status
    const statusProgress: Record<RegionExpansionPlan['status'], number> = {
      research: 10,
      planning: 25,
      entry: 50,
      growth: 75,
      mature: 100,
    };

    let progress = statusProgress[region.status] || 0;

    // Factor in regulatory status
    if (region.regulatoryApproach.currentStatus === 'obtained') {
      progress += 10;
    } else if (region.regulatoryApproach.currentStatus === 'in_progress') {
      progress += 5;
    }

    // Factor in partner count
    if (region.localPartners.length > 0) {
      progress += Math.min(15, region.localPartners.length * 3);
    }

    return Math.min(100, progress);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createExpansionManager(config?: Partial<ExpansionConfig>): DefaultExpansionManager {
  return new DefaultExpansionManager(config);
}

// Default export
export default DefaultExpansionManager;
