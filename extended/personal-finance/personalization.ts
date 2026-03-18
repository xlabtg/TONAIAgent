/**
 * TONAIAgent - Life-Stage Personalization & Behavioral Finance Layer
 *
 * Adapts financial strategies to user life stages and implements behavioral finance
 * interventions to reduce emotional decisions, prevent panic selling, and guide
 * users toward better financial outcomes.
 */

import {
  UserProfile,
  LifeStage,
  RiskTolerance,
  InvestmentHorizon,
  BehavioralProfile,
  BehavioralAnalysis,
  EmotionalState,
  BiasAssessment,
  BiasDetail,
  EmotionalBias,
  BehavioralRecommendation,
  BehavioralIntervention,
  InterventionType,
  HistoricalPattern,
  BehavioralConfig,
  PersonalFinanceEvent,
  PersonalFinanceEventCallback,
} from './types';

// ============================================================================
// Life-Stage Personalization Manager Interface
// ============================================================================

export interface PersonalizationManager {
  readonly config: BehavioralConfig;

  // Profile management
  createProfile(params: CreateProfileParams): Promise<UserProfile>;
  getProfile(userId: string): Promise<UserProfile | null>;
  updateProfile(userId: string, updates: UpdateProfileParams): Promise<UserProfile>;

  // Life-stage assessment
  assessLifeStage(params: LifeStageAssessmentParams): Promise<LifeStageResult>;
  getLifeStageRecommendations(lifeStage: LifeStage): Promise<LifeStageRecommendations>;
  updateLifeStage(userId: string, lifeStage: LifeStage): Promise<UserProfile>;

  // Behavioral analysis
  analyzeBehavior(userId: string): Promise<BehavioralAnalysis>;
  assessBiases(userId: string, responses: BiasAssessmentResponses): Promise<BiasAssessment>;
  getEmotionalState(userId: string): Promise<EmotionalState>;
  updateBehavioralProfile(userId: string, profile: Partial<BehavioralProfile>): Promise<UserProfile>;

  // Interventions
  checkForIntervention(userId: string, context: InterventionContext): Promise<BehavioralIntervention | null>;
  triggerIntervention(userId: string, type: InterventionType, context: InterventionContext): Promise<InterventionResult>;
  recordInterventionOutcome(interventionId: string, outcome: InterventionOutcome): Promise<void>;
  getInterventionHistory(userId: string): Promise<InterventionRecord[]>;

  // Recommendations
  getPersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendation[]>;
  generateBehavioralNudge(userId: string, context: NudgeContext): Promise<BehavioralRecommendation>;

  // Pattern detection
  detectPatterns(userId: string): Promise<DetectedPattern[]>;
  recordDecision(userId: string, decision: DecisionRecord): Promise<void>;

  // Configuration
  updateConfig(config: Partial<BehavioralConfig>): void;

  // Events
  onEvent(callback: PersonalFinanceEventCallback): void;
}

export interface CreateProfileParams {
  userId: string;
  name: string;
  email?: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalAssets: number;
  totalLiabilities: number;
  lifeStageAnswers?: LifeStageAssessmentParams;
}

export interface UpdateProfileParams {
  name?: string;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  preferences?: Partial<UserProfile['preferences']>;
}

export interface LifeStageAssessmentParams {
  age?: number;
  employmentStatus: 'student' | 'employed' | 'self_employed' | 'unemployed' | 'retired';
  yearsToRetirement?: number;
  dependents: number;
  netWorthRange: 'negative' | 'low' | 'medium' | 'high' | 'very_high';
  investmentExperience: 'none' | 'beginner' | 'intermediate' | 'advanced';
  primaryGoal: 'learn' | 'save' | 'grow' | 'preserve' | 'income';
}

export interface LifeStageResult {
  lifeStage: LifeStage;
  confidence: number;
  rationale: string;
  suggestedRiskTolerance: RiskTolerance;
  suggestedHorizon: InvestmentHorizon;
}

export interface LifeStageRecommendations {
  lifeStage: LifeStage;
  overview: string;
  priorities: string[];
  allocations: {
    recommended: AssetClassRecommendation[];
    avoid: string[];
  };
  goals: SuggestedGoal[];
  tips: string[];
}

export interface AssetClassRecommendation {
  assetClass: string;
  percentage: number;
  rationale: string;
}

export interface SuggestedGoal {
  type: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export interface BiasAssessmentResponses {
  scenarioResponses: ScenarioResponse[];
  selfAssessment: SelfAssessment;
}

export interface ScenarioResponse {
  scenarioId: string;
  choice: string;
  confidence: number;
}

export interface SelfAssessment {
  emotionalInvesting: 1 | 2 | 3 | 4 | 5;
  lossReaction: 1 | 2 | 3 | 4 | 5;
  marketTiming: 1 | 2 | 3 | 4 | 5;
  herdBehavior: 1 | 2 | 3 | 4 | 5;
  overconfidence: 1 | 2 | 3 | 4 | 5;
}

export interface InterventionContext {
  trigger: string;
  marketCondition?: 'bull' | 'bear' | 'volatile' | 'stable';
  portfolioChange?: number;
  userAction?: string;
  emotionalIndicators?: string[];
  urgency?: 'low' | 'medium' | 'high';
}

export interface InterventionResult {
  interventionId: string;
  type: InterventionType;
  delivered: boolean;
  message: string;
  suggestedAction?: string;
  alternatives?: string[];
  cooldownUntil?: Date;
}

export interface InterventionOutcome {
  followed: boolean;
  feedback?: 'helpful' | 'not_helpful' | 'annoying';
  actualAction?: string;
  notes?: string;
}

export interface InterventionRecord {
  id: string;
  type: InterventionType;
  timestamp: Date;
  context: InterventionContext;
  message: string;
  outcome?: InterventionOutcome;
}

export interface PersonalizedRecommendation {
  id: string;
  category: 'investment' | 'savings' | 'education' | 'behavior' | 'goal';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  reason: string;
  action?: string;
  impact: string;
}

export interface NudgeContext {
  situation: string;
  recentBehavior?: string;
  portfolioState?: string;
  goalProgress?: number;
}

export interface DetectedPattern {
  type: string;
  description: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  recommendation?: string;
}

export interface DecisionRecord {
  type: 'buy' | 'sell' | 'hold' | 'rebalance' | 'withdraw' | 'deposit';
  asset?: string;
  amount?: number;
  marketCondition: 'up' | 'down' | 'stable';
  emotionalState?: 'calm' | 'anxious' | 'excited' | 'fearful';
  reason: string;
  timestamp: Date;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultPersonalizationManager implements PersonalizationManager {
  private _config: BehavioralConfig;
  private readonly profiles: Map<string, UserProfile> = new Map();
  private readonly behavioralAnalyses: Map<string, BehavioralAnalysis> = new Map();
  private readonly decisionHistory: Map<string, DecisionRecord[]> = new Map();
  private readonly interventionHistory: Map<string, InterventionRecord[]> = new Map();
  private readonly interventionCooldowns: Map<string, Map<InterventionType, Date>> = new Map();
  private readonly eventCallbacks: PersonalFinanceEventCallback[] = [];

  // Life stage configurations
  private readonly lifeStageConfigs: Record<LifeStage, LifeStageRecommendations> = {
    beginner: {
      lifeStage: 'beginner',
      overview: 'Focus on learning fundamentals and building good financial habits.',
      priorities: ['Build emergency fund', 'Learn investment basics', 'Start small and consistent'],
      allocations: {
        recommended: [
          { assetClass: 'stablecoins', percentage: 50, rationale: 'Low risk while learning' },
          { assetClass: 'crypto', percentage: 30, rationale: 'Learn market dynamics' },
          { assetClass: 'cash', percentage: 20, rationale: 'Emergency fund' },
        ],
        avoid: ['High-risk DeFi', 'Leveraged positions', 'NFT speculation'],
      },
      goals: [
        { type: 'emergency_fund', name: 'Emergency Fund', priority: 'high', description: 'Build 3 months expenses' },
        { type: 'education', name: 'Financial Education', priority: 'high', description: 'Complete basic courses' },
      ],
      tips: ['Start with small amounts', 'Focus on education', 'Avoid chasing trends'],
    },
    early_career: {
      lifeStage: 'early_career',
      overview: 'Maximize growth potential with long time horizon.',
      priorities: ['Aggressive growth', 'Build investment habits', 'Career development'],
      allocations: {
        recommended: [
          { assetClass: 'crypto', percentage: 50, rationale: 'Long horizon allows risk' },
          { assetClass: 'defi_yield', percentage: 25, rationale: 'Passive income generation' },
          { assetClass: 'stablecoins', percentage: 15, rationale: 'Stability and opportunities' },
          { assetClass: 'liquid_staking', percentage: 10, rationale: 'Additional yield' },
        ],
        avoid: ['Over-concentration', 'Ignoring emergency fund'],
      },
      goals: [
        { type: 'wealth_building', name: 'Wealth Building', priority: 'high', description: 'Long-term growth portfolio' },
        { type: 'emergency_fund', name: 'Emergency Fund', priority: 'medium', description: 'Maintain 6 months expenses' },
      ],
      tips: ['Time is your greatest asset', 'Stay consistent', 'Avoid lifestyle inflation'],
    },
    mid_career: {
      lifeStage: 'mid_career',
      overview: 'Balance growth with increasing responsibility.',
      priorities: ['Balanced growth', 'Risk management', 'Goal alignment'],
      allocations: {
        recommended: [
          { assetClass: 'crypto', percentage: 40, rationale: 'Still growth-focused' },
          { assetClass: 'defi_yield', percentage: 25, rationale: 'Income generation' },
          { assetClass: 'stablecoins', percentage: 25, rationale: 'Stability' },
          { assetClass: 'liquid_staking', percentage: 10, rationale: 'Diversified yield' },
        ],
        avoid: ['High speculation', 'Insufficient diversification'],
      },
      goals: [
        { type: 'retirement', name: 'Retirement Planning', priority: 'high', description: 'Build retirement fund' },
        { type: 'major_purchase', name: 'Major Goals', priority: 'medium', description: 'Home, education, etc.' },
      ],
      tips: ['Review portfolio regularly', 'Consider increasing stability', 'Plan for major expenses'],
    },
    advanced: {
      lifeStage: 'advanced',
      overview: 'Experienced investor with sophisticated strategies.',
      priorities: ['Optimization', 'Tax efficiency', 'Complex strategies'],
      allocations: {
        recommended: [
          { assetClass: 'crypto', percentage: 45, rationale: 'Experience allows higher allocation' },
          { assetClass: 'defi_yield', percentage: 30, rationale: 'Advanced yield strategies' },
          { assetClass: 'liquid_staking', percentage: 15, rationale: 'Protocol participation' },
          { assetClass: 'stablecoins', percentage: 10, rationale: 'Opportunity fund' },
        ],
        avoid: ['Overconfidence', 'Ignoring risk management'],
      },
      goals: [
        { type: 'wealth_building', name: 'Portfolio Optimization', priority: 'high', description: 'Maximize risk-adjusted returns' },
      ],
      tips: ['Stay humble', 'Continue learning', 'Mentor others'],
    },
    high_net_worth: {
      lifeStage: 'high_net_worth',
      overview: 'Focus on wealth preservation and optimization.',
      priorities: ['Wealth preservation', 'Tax optimization', 'Diversification'],
      allocations: {
        recommended: [
          { assetClass: 'crypto', percentage: 35, rationale: 'Controlled exposure' },
          { assetClass: 'stablecoins', percentage: 30, rationale: 'Preservation' },
          { assetClass: 'defi_yield', percentage: 20, rationale: 'Income generation' },
          { assetClass: 'liquid_staking', percentage: 15, rationale: 'Protocol governance' },
        ],
        avoid: ['Unnecessary risks', 'Over-concentration'],
      },
      goals: [
        { type: 'wealth_building', name: 'Wealth Preservation', priority: 'high', description: 'Protect and grow wealth' },
      ],
      tips: ['Focus on preservation', 'Consider generational wealth', 'Philanthropic planning'],
    },
    pre_retirement: {
      lifeStage: 'pre_retirement',
      overview: 'Transition to income-focused strategies.',
      priorities: ['Capital preservation', 'Income generation', 'Risk reduction'],
      allocations: {
        recommended: [
          { assetClass: 'stablecoins', percentage: 40, rationale: 'Capital preservation' },
          { assetClass: 'defi_yield', percentage: 30, rationale: 'Income generation' },
          { assetClass: 'crypto', percentage: 20, rationale: 'Moderate growth' },
          { assetClass: 'cash', percentage: 10, rationale: 'Liquidity' },
        ],
        avoid: ['High volatility', 'Speculative assets'],
      },
      goals: [
        { type: 'retirement', name: 'Retirement Income', priority: 'high', description: 'Establish income streams' },
      ],
      tips: ['Reduce risk gradually', 'Plan income sources', 'Healthcare planning'],
    },
    retired: {
      lifeStage: 'retired',
      overview: 'Prioritize income and capital preservation.',
      priorities: ['Income stability', 'Capital preservation', 'Longevity planning'],
      allocations: {
        recommended: [
          { assetClass: 'stablecoins', percentage: 50, rationale: 'Capital safety' },
          { assetClass: 'defi_yield', percentage: 30, rationale: 'Stable income' },
          { assetClass: 'crypto', percentage: 10, rationale: 'Inflation hedge' },
          { assetClass: 'cash', percentage: 10, rationale: 'Immediate needs' },
        ],
        avoid: ['Volatility', 'Illiquid assets', 'Complex strategies'],
      },
      goals: [
        { type: 'retirement', name: 'Income Sustainability', priority: 'high', description: 'Maintain income streams' },
      ],
      tips: ['Prioritize stability', 'Maintain liquidity', 'Estate planning'],
    },
  };

  constructor(config?: Partial<BehavioralConfig>) {
    this._config = {
      enabled: true,
      interventionLevel: 'moderate',
      panicSellProtection: true,
      fomoBuyProtection: true,
      ...config,
    };
  }

  get config(): BehavioralConfig {
    return this._config;
  }

  async createProfile(params: CreateProfileParams): Promise<UserProfile> {
    // Assess life stage if answers provided
    let lifeStage: LifeStage = 'beginner';
    let riskTolerance: RiskTolerance = 'moderate';
    let investmentHorizon: InvestmentHorizon = 'medium_term';

    if (params.lifeStageAnswers) {
      const result = await this.assessLifeStage(params.lifeStageAnswers);
      lifeStage = result.lifeStage;
      riskTolerance = result.suggestedRiskTolerance;
      investmentHorizon = result.suggestedHorizon;
    }

    const profile: UserProfile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId: params.userId,
      name: params.name,
      email: params.email,
      lifeStage,
      riskTolerance,
      investmentHorizon,
      monthlyIncome: params.monthlyIncome,
      monthlyExpenses: params.monthlyExpenses,
      totalAssets: params.totalAssets,
      totalLiabilities: params.totalLiabilities,
      financialLiteracyScore: 50, // Default, will be updated
      preferences: {
        currency: 'USD',
        language: 'en',
        timezone: 'UTC',
        notificationEnabled: true,
        nudgesEnabled: true,
        autoInvestEnabled: false,
        autoSaveEnabled: false,
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

    this.profiles.set(params.userId, profile);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'profile_created',
      userId: params.userId,
      action: 'profile_created',
      resource: 'user_profile',
      resourceId: profile.id,
      details: { lifeStage },
      metadata: {},
    });

    return profile;
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async updateProfile(userId: string, updates: UpdateProfileParams): Promise<UserProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error(`Profile not found: ${userId}`);
    }

    if (updates.name) profile.name = updates.name;
    if (updates.monthlyIncome !== undefined) profile.monthlyIncome = updates.monthlyIncome;
    if (updates.monthlyExpenses !== undefined) profile.monthlyExpenses = updates.monthlyExpenses;
    if (updates.totalAssets !== undefined) profile.totalAssets = updates.totalAssets;
    if (updates.totalLiabilities !== undefined) profile.totalLiabilities = updates.totalLiabilities;
    if (updates.preferences) {
      profile.preferences = { ...profile.preferences, ...updates.preferences };
    }

    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'profile_updated',
      userId,
      action: 'profile_updated',
      resource: 'user_profile',
      resourceId: profile.id,
      details: updates as Record<string, unknown>,
      metadata: {},
    });

    return profile;
  }

  async assessLifeStage(params: LifeStageAssessmentParams): Promise<LifeStageResult> {
    let lifeStage: LifeStage;
    let confidence = 0.8;
    let rationale: string;
    let suggestedRiskTolerance: RiskTolerance;
    let suggestedHorizon: InvestmentHorizon;

    // Primary classification based on experience and goals
    if (params.investmentExperience === 'none') {
      lifeStage = 'beginner';
      rationale = 'No prior investment experience';
      suggestedRiskTolerance = 'conservative';
      suggestedHorizon = 'medium_term';
    } else if (params.employmentStatus === 'retired') {
      lifeStage = 'retired';
      rationale = 'Retired with focus on income';
      suggestedRiskTolerance = 'conservative';
      suggestedHorizon = 'short_term';
    } else if (params.yearsToRetirement !== undefined && params.yearsToRetirement <= 5) {
      lifeStage = 'pre_retirement';
      rationale = 'Approaching retirement';
      suggestedRiskTolerance = 'moderate';
      suggestedHorizon = 'medium_term';
    } else if (params.netWorthRange === 'very_high') {
      lifeStage = 'high_net_worth';
      rationale = 'High net worth with preservation focus';
      suggestedRiskTolerance = 'moderate';
      suggestedHorizon = 'long_term';
    } else if (params.investmentExperience === 'advanced') {
      lifeStage = 'advanced';
      rationale = 'Advanced investment experience';
      suggestedRiskTolerance = 'aggressive';
      suggestedHorizon = 'long_term';
    } else if (params.primaryGoal === 'grow' && params.dependents === 0) {
      lifeStage = 'early_career';
      rationale = 'Growth-focused with flexibility';
      suggestedRiskTolerance = 'aggressive';
      suggestedHorizon = 'very_long_term';
    } else if (params.dependents > 0 || params.primaryGoal === 'save') {
      lifeStage = 'mid_career';
      rationale = 'Balanced approach with responsibilities';
      suggestedRiskTolerance = 'moderate';
      suggestedHorizon = 'long_term';
    } else {
      lifeStage = 'beginner';
      rationale = 'Default classification for new users';
      suggestedRiskTolerance = 'moderate';
      suggestedHorizon = 'medium_term';
      confidence = 0.6;
    }

    return {
      lifeStage,
      confidence,
      rationale,
      suggestedRiskTolerance,
      suggestedHorizon,
    };
  }

  async getLifeStageRecommendations(lifeStage: LifeStage): Promise<LifeStageRecommendations> {
    return this.lifeStageConfigs[lifeStage];
  }

  async updateLifeStage(userId: string, lifeStage: LifeStage): Promise<UserProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error(`Profile not found: ${userId}`);
    }

    profile.lifeStage = lifeStage;
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    return profile;
  }

  async analyzeBehavior(userId: string): Promise<BehavioralAnalysis> {
    const profile = this.profiles.get(userId);
    const decisions = this.decisionHistory.get(userId) ?? [];

    // Analyze emotional state based on recent decisions
    const emotionalState = this.analyzeEmotionalState(decisions);

    // Assess biases from decision patterns
    const biasAssessment = this.detectBiasesFromDecisions(decisions);

    // Generate recommendations
    const recommendations = this.generateBehavioralRecommendations(profile, biasAssessment);

    // Get active interventions
    const interventions = this.getActiveInterventions(userId, biasAssessment);

    // Detect historical patterns
    const historicalPatterns = this.identifyHistoricalPatterns(decisions);

    const analysis: BehavioralAnalysis = {
      userId,
      analysisDate: new Date(),
      emotionalState,
      biasAssessment,
      recommendations,
      interventions,
      historicalPatterns,
    };

    this.behavioralAnalyses.set(userId, analysis);

    return analysis;
  }

  async assessBiases(_userId: string, responses: BiasAssessmentResponses): Promise<BiasAssessment> {
    const biases: BiasDetail[] = [];
    const selfAssessment = responses.selfAssessment;

    // Analyze emotional investing
    if (selfAssessment.emotionalInvesting >= 4) {
      biases.push({
        type: 'loss_aversion',
        severity: selfAssessment.emotionalInvesting === 5 ? 'high' : 'medium',
        frequency: selfAssessment.emotionalInvesting / 5,
        recentExamples: [],
        mitigation: 'Use automated rules to reduce emotional decision-making',
      });
    }

    // Analyze loss reaction
    if (selfAssessment.lossReaction >= 4) {
      biases.push({
        type: 'loss_aversion',
        severity: 'medium',
        frequency: selfAssessment.lossReaction / 5,
        recentExamples: [],
        mitigation: 'Set predefined exit strategies before investing',
      });
    }

    // Analyze market timing
    if (selfAssessment.marketTiming >= 4) {
      biases.push({
        type: 'overconfidence',
        severity: selfAssessment.marketTiming === 5 ? 'high' : 'medium',
        frequency: selfAssessment.marketTiming / 5,
        recentExamples: [],
        mitigation: 'Consider dollar-cost averaging instead of timing',
      });
    }

    // Analyze herd behavior
    if (selfAssessment.herdBehavior >= 4) {
      biases.push({
        type: 'herding',
        severity: selfAssessment.herdBehavior === 5 ? 'high' : 'medium',
        frequency: selfAssessment.herdBehavior / 5,
        recentExamples: [],
        mitigation: 'Research independently before following trends',
      });
    }

    // Analyze overconfidence
    if (selfAssessment.overconfidence >= 4) {
      biases.push({
        type: 'overconfidence',
        severity: selfAssessment.overconfidence === 5 ? 'high' : 'medium',
        frequency: selfAssessment.overconfidence / 5,
        recentExamples: [],
        mitigation: 'Keep a decision journal to track accuracy',
      });
    }

    const riskScore = biases.reduce((sum, b) => sum + (b.severity === 'high' ? 3 : b.severity === 'medium' ? 2 : 1), 0);

    return {
      dominantBiases: biases,
      riskScore: Math.min(100, riskScore * 10),
      lastUpdated: new Date(),
    };
  }

  async getEmotionalState(userId: string): Promise<EmotionalState> {
    const decisions = this.decisionHistory.get(userId) ?? [];
    return this.analyzeEmotionalState(decisions);
  }

  async updateBehavioralProfile(
    userId: string,
    profileUpdates: Partial<BehavioralProfile>
  ): Promise<UserProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error(`Profile not found: ${userId}`);
    }

    profile.behavioralProfile = {
      ...profile.behavioralProfile,
      ...profileUpdates,
      lastAssessmentDate: new Date(),
    };
    profile.updatedAt = new Date();

    this.profiles.set(userId, profile);
    return profile;
  }

  async checkForIntervention(
    userId: string,
    context: InterventionContext
  ): Promise<BehavioralIntervention | null> {
    if (!this._config.enabled) {
      return null;
    }

    const profile = this.profiles.get(userId);
    if (!profile) {
      return null;
    }

    // Check cooldowns
    const cooldowns = this.interventionCooldowns.get(userId);

    // Check for panic sell scenario
    if (
      this._config.panicSellProtection &&
      context.userAction === 'sell_all' &&
      context.marketCondition === 'bear' &&
      context.emotionalIndicators?.includes('panic')
    ) {
      const type: InterventionType = 'panic_sell_prevention';
      if (!this.isOnCooldown(cooldowns, type)) {
        return this.createIntervention(type, 'Selling during market fear often leads to regret. Consider holding or reducing position gradually.');
      }
    }

    // Check for FOMO buy scenario
    if (
      this._config.fomoBuyProtection &&
      context.userAction === 'buy' &&
      context.marketCondition === 'bull' &&
      context.emotionalIndicators?.includes('fomo')
    ) {
      const type: InterventionType = 'fomo_buy_prevention';
      if (!this.isOnCooldown(cooldowns, type)) {
        return this.createIntervention(type, 'Buying during market euphoria can be risky. Consider your investment plan and entry strategy.');
      }
    }

    // Check for overtrading
    const recentDecisions = (this.decisionHistory.get(userId) ?? []).filter(
      d => d.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    if (recentDecisions.length > 5) {
      const type: InterventionType = 'overtrading_warning';
      if (!this.isOnCooldown(cooldowns, type)) {
        return this.createIntervention(type, 'You\'ve made several trades today. Frequent trading often reduces returns. Consider your strategy.');
      }
    }

    return null;
  }

  async triggerIntervention(
    userId: string,
    type: InterventionType,
    context: InterventionContext
  ): Promise<InterventionResult> {
    const intervention = this.createIntervention(type, this.getInterventionMessage(type));

    // Record the intervention
    const record: InterventionRecord = {
      id: `int_${Date.now()}`,
      type,
      timestamp: new Date(),
      context,
      message: intervention.message,
    };

    const history = this.interventionHistory.get(userId) ?? [];
    history.push(record);
    this.interventionHistory.set(userId, history);

    // Set cooldown
    const cooldownMs = intervention.cooldownPeriod * 60 * 60 * 1000;
    const cooldowns = this.interventionCooldowns.get(userId) ?? new Map();
    cooldowns.set(type, new Date(Date.now() + cooldownMs));
    this.interventionCooldowns.set(userId, cooldowns);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'behavioral_intervention',
      userId,
      action: 'intervention_triggered',
      resource: 'behavioral_intervention',
      resourceId: record.id,
      details: { type, context },
      metadata: {},
    });

    return {
      interventionId: record.id,
      type,
      delivered: true,
      message: intervention.message,
      suggestedAction: intervention.action?.title,
      cooldownUntil: new Date(Date.now() + cooldownMs),
    };
  }

  async recordInterventionOutcome(
    interventionId: string,
    outcome: InterventionOutcome
  ): Promise<void> {
    // Find and update the intervention record
    for (const [_userId, history] of this.interventionHistory) {
      const record = history.find(r => r.id === interventionId);
      if (record) {
        record.outcome = outcome;
        break;
      }
    }
  }

  async getInterventionHistory(userId: string): Promise<InterventionRecord[]> {
    return this.interventionHistory.get(userId) ?? [];
  }

  async getPersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendation[]> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return [];
    }

    const recommendations: PersonalizedRecommendation[] = [];
    const lifeStageRecs = this.lifeStageConfigs[profile.lifeStage];

    // Life-stage based recommendations
    for (const goal of lifeStageRecs.goals) {
      recommendations.push({
        id: `rec_${Date.now()}_${goal.type}`,
        category: 'goal',
        priority: goal.priority,
        title: goal.name,
        description: goal.description,
        reason: `Recommended for ${profile.lifeStage} life stage`,
        impact: 'Aligns with your current financial situation',
      });
    }

    // Behavioral recommendations
    const behavioral = profile.behavioralProfile;
    if (behavioral.panicSellRisk > 0.5) {
      recommendations.push({
        id: `rec_${Date.now()}_panic`,
        category: 'behavior',
        priority: 'high',
        title: 'Set Up Automated Rules',
        description: 'Create automatic stop-loss and take-profit rules to reduce emotional decisions',
        reason: 'Your profile suggests higher susceptibility to panic selling',
        impact: 'Reduces emotional trading and protects gains',
      });
    }

    // Savings rate recommendation
    const savingsRate = (profile.monthlyIncome - profile.monthlyExpenses) / profile.monthlyIncome;
    if (savingsRate < 0.15) {
      recommendations.push({
        id: `rec_${Date.now()}_savings`,
        category: 'savings',
        priority: 'medium',
        title: 'Increase Savings Rate',
        description: 'Consider ways to increase your monthly savings to at least 15% of income',
        reason: `Current savings rate is ${(savingsRate * 100).toFixed(1)}%`,
        impact: 'Accelerates wealth building and financial security',
      });
    }

    return recommendations;
  }

  async generateBehavioralNudge(
    userId: string,
    context: NudgeContext
  ): Promise<BehavioralRecommendation> {
    const profile = this.profiles.get(userId);

    let message: string;
    let type: 'warning' | 'suggestion' | 'encouragement' = 'suggestion';
    let priority: 'low' | 'medium' | 'high' = 'medium';

    if (context.goalProgress !== undefined && context.goalProgress > 0.8) {
      message = 'You\'re so close to your goal! Stay consistent and you\'ll reach it soon.';
      type = 'encouragement';
      priority = 'low';
    } else if (context.situation.includes('market_down') && (profile?.behavioralProfile.panicSellRisk ?? 0) > 0.5) {
      message = 'Markets fluctuate. Remember your long-term strategy and avoid reactive decisions.';
      type = 'warning';
      priority = 'high';
    } else if (context.recentBehavior === 'inactive') {
      message = 'Consider reviewing your financial plan. Small consistent actions lead to big results.';
      type = 'suggestion';
      priority = 'low';
    } else {
      message = 'Keep up the good work on your financial journey!';
      type = 'encouragement';
      priority = 'low';
    }

    return {
      id: `nudge_${Date.now()}`,
      type,
      message,
      context: context.situation,
      priority,
    };
  }

  async detectPatterns(userId: string): Promise<DetectedPattern[]> {
    const decisions = this.decisionHistory.get(userId) ?? [];
    const patterns: DetectedPattern[] = [];

    // Detect panic selling pattern
    const panicSells = decisions.filter(
      d => d.type === 'sell' && d.emotionalState === 'fearful' && d.marketCondition === 'down'
    );
    if (panicSells.length >= 2) {
      patterns.push({
        type: 'panic_selling',
        description: 'Tendency to sell during market downturns',
        frequency: panicSells.length / decisions.length,
        impact: 'negative',
        confidence: 0.8,
        recommendation: 'Consider setting automated rules to prevent emotional selling',
      });
    }

    // Detect FOMO buying pattern
    const fomoBuys = decisions.filter(
      d => d.type === 'buy' && d.emotionalState === 'excited' && d.marketCondition === 'up'
    );
    if (fomoBuys.length >= 2) {
      patterns.push({
        type: 'fomo_buying',
        description: 'Tendency to buy during market euphoria',
        frequency: fomoBuys.length / decisions.length,
        impact: 'negative',
        confidence: 0.75,
        recommendation: 'Consider dollar-cost averaging instead of timing the market',
      });
    }

    // Detect consistent investing pattern
    const consistentInvesting = decisions.filter(
      d => d.type === 'buy' && d.emotionalState === 'calm'
    );
    if (consistentInvesting.length > decisions.length * 0.5) {
      patterns.push({
        type: 'consistent_investing',
        description: 'Regular, calm investment behavior',
        frequency: consistentInvesting.length / decisions.length,
        impact: 'positive',
        confidence: 0.85,
        recommendation: 'Keep up the disciplined approach!',
      });
    }

    return patterns;
  }

  async recordDecision(userId: string, decision: DecisionRecord): Promise<void> {
    const history = this.decisionHistory.get(userId) ?? [];
    history.push(decision);
    this.decisionHistory.set(userId, history);

    // Check for intervention triggers
    const context: InterventionContext = {
      trigger: decision.type,
      marketCondition: decision.marketCondition === 'up' ? 'bull' : decision.marketCondition === 'down' ? 'bear' : 'stable',
      userAction: decision.type,
      emotionalIndicators: decision.emotionalState ? [decision.emotionalState] : [],
    };

    await this.checkForIntervention(userId, context);
  }

  updateConfig(config: Partial<BehavioralConfig>): void {
    this._config = { ...this._config, ...config };
  }

  onEvent(callback: PersonalFinanceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private analyzeEmotionalState(decisions: DecisionRecord[]): EmotionalState {
    const recentDecisions = decisions.slice(-10);
    const emotionalCounts: Record<string, number> = {};

    for (const decision of recentDecisions) {
      if (decision.emotionalState) {
        emotionalCounts[decision.emotionalState] = (emotionalCounts[decision.emotionalState] ?? 0) + 1;
      }
    }

    // Find dominant emotion
    let dominant: EmotionalState['current'] = 'calm';
    let maxCount = 0;
    for (const [emotion, count] of Object.entries(emotionalCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = emotion as EmotionalState['current'];
      }
    }

    // Determine trend
    const recentEmotions = recentDecisions.slice(-5).map(d => d.emotionalState);
    const olderEmotions = recentDecisions.slice(-10, -5).map(d => d.emotionalState);
    const recentStress = recentEmotions.filter(e => e === 'anxious' || e === 'fearful').length;
    const olderStress = olderEmotions.filter(e => e === 'anxious' || e === 'fearful').length;

    let trend: EmotionalState['trend'] = 'stable';
    if (recentStress < olderStress) trend = 'improving';
    if (recentStress > olderStress) trend = 'declining';

    return {
      current: dominant,
      trend,
      triggers: this.identifyTriggers(recentDecisions),
      confidence: maxCount > 0 ? maxCount / recentDecisions.length : 0.5,
    };
  }

  private identifyTriggers(decisions: DecisionRecord[]): string[] {
    const triggers: string[] = [];

    const fearfulInDown = decisions.filter(
      d => d.emotionalState === 'fearful' && d.marketCondition === 'down'
    );
    if (fearfulInDown.length > 0) {
      triggers.push('Market downturns trigger fear');
    }

    const excitedInUp = decisions.filter(
      d => d.emotionalState === 'excited' && d.marketCondition === 'up'
    );
    if (excitedInUp.length > 0) {
      triggers.push('Market rallies trigger excitement');
    }

    return triggers;
  }

  private detectBiasesFromDecisions(decisions: DecisionRecord[]): BiasAssessment {
    const biases: BiasDetail[] = [];

    // Detect loss aversion
    const sellsInDown = decisions.filter(d => d.type === 'sell' && d.marketCondition === 'down');
    if (sellsInDown.length / decisions.length > 0.3) {
      biases.push({
        type: 'loss_aversion',
        severity: 'medium',
        frequency: sellsInDown.length / decisions.length,
        recentExamples: sellsInDown.slice(-3).map(d => `Sold during downturn: ${d.reason}`),
        mitigation: 'Consider longer holding periods and predefined exit strategies',
      });
    }

    // Detect herding
    const buysInUp = decisions.filter(d => d.type === 'buy' && d.marketCondition === 'up');
    if (buysInUp.length / decisions.length > 0.4) {
      biases.push({
        type: 'herding',
        severity: 'medium',
        frequency: buysInUp.length / decisions.length,
        recentExamples: buysInUp.slice(-3).map(d => `Bought during rally: ${d.reason}`),
        mitigation: 'Research independently and consider contrarian strategies',
      });
    }

    return {
      dominantBiases: biases,
      riskScore: biases.reduce((sum, b) => sum + (b.severity === 'high' ? 30 : 20), 0),
      lastUpdated: new Date(),
    };
  }

  private generateBehavioralRecommendations(
    _profile: UserProfile | undefined,
    biasAssessment: BiasAssessment
  ): BehavioralRecommendation[] {
    const recommendations: BehavioralRecommendation[] = [];

    for (const bias of biasAssessment.dominantBiases) {
      recommendations.push({
        id: `rec_${Date.now()}_${bias.type}`,
        type: 'suggestion',
        message: bias.mitigation,
        context: `Detected ${bias.type} bias`,
        priority: bias.severity === 'high' ? 'high' : 'medium',
      });
    }

    return recommendations;
  }

  private getActiveInterventions(
    _userId: string,
    biasAssessment: BiasAssessment
  ): BehavioralIntervention[] {
    const interventions: BehavioralIntervention[] = [];

    for (const bias of biasAssessment.dominantBiases) {
      if (bias.severity === 'high') {
        const interventionType = this.mapBiasToIntervention(bias.type);
        interventions.push({
          id: `int_${Date.now()}_${bias.type}`,
          type: interventionType,
          trigger: bias.type,
          message: bias.mitigation,
          cooldownPeriod: 24, // 24 hours
        });
      }
    }

    return interventions;
  }

  private mapBiasToIntervention(bias: EmotionalBias): InterventionType {
    const mapping: Record<EmotionalBias, InterventionType> = {
      loss_aversion: 'loss_aversion_coaching',
      overconfidence: 'overtrading_warning',
      anchoring: 'confirmation_bias_alert',
      confirmation: 'confirmation_bias_alert',
      herding: 'fomo_buy_prevention',
      recency: 'patience_encouragement',
      balanced: 'patience_encouragement',
    };
    return mapping[bias];
  }

  private identifyHistoricalPatterns(decisions: DecisionRecord[]): HistoricalPattern[] {
    const patterns: HistoricalPattern[] = [];

    if (decisions.length < 5) {
      return patterns;
    }

    // Analyze decision frequency
    const decisionsPerMonth = decisions.length / 12; // Simplified
    if (decisionsPerMonth > 10) {
      patterns.push({
        type: 'high_activity',
        description: 'High trading frequency detected',
        frequency: decisionsPerMonth,
        impact: 'negative',
        lastOccurrence: decisions[decisions.length - 1].timestamp,
      });
    }

    return patterns;
  }

  private createIntervention(type: InterventionType, message: string): BehavioralIntervention {
    return {
      id: `int_${Date.now()}_${type}`,
      type,
      trigger: type,
      message,
      cooldownPeriod: 24,
    };
  }

  private getInterventionMessage(type: InterventionType): string {
    const messages: Record<InterventionType, string> = {
      panic_sell_prevention: 'Markets recover over time. Consider your long-term strategy before selling in a downturn.',
      fomo_buy_prevention: 'Buying at peaks can be risky. Consider waiting for a better entry point or using DCA.',
      loss_aversion_coaching: 'Temporary losses are part of investing. Focus on your long-term goals.',
      overtrading_warning: 'Frequent trading often reduces returns. Consider a more patient approach.',
      confirmation_bias_alert: 'Consider alternative viewpoints before making this decision.',
      patience_encouragement: 'Patience is key to investment success. Trust your strategy.',
    };
    return messages[type];
  }

  private isOnCooldown(
    cooldowns: Map<InterventionType, Date> | undefined,
    type: InterventionType
  ): boolean {
    if (!cooldowns) return false;
    const cooldownEnd = cooldowns.get(type);
    if (!cooldownEnd) return false;
    return cooldownEnd.getTime() > Date.now();
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

export function createPersonalizationManager(
  config?: Partial<BehavioralConfig>
): DefaultPersonalizationManager {
  return new DefaultPersonalizationManager(config);
}
