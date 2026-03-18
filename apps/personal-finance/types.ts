/**
 * TONAIAgent - Personal Finance Layer Type Definitions
 *
 * Core types for AI-native personal finance platform enabling everyday users
 * to automate savings, investments, and financial decisions through intelligent agents.
 */

// ============================================================================
// User Profile Types
// ============================================================================

export type LifeStage =
  | 'beginner'
  | 'early_career'
  | 'mid_career'
  | 'advanced'
  | 'high_net_worth'
  | 'pre_retirement'
  | 'retired';

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive';

export type InvestmentHorizon = 'short_term' | 'medium_term' | 'long_term' | 'very_long_term';

export type FinancialGoalType =
  | 'emergency_fund'
  | 'savings'
  | 'investment'
  | 'retirement'
  | 'education'
  | 'home_purchase'
  | 'debt_payoff'
  | 'travel'
  | 'major_purchase'
  | 'wealth_building'
  | 'custom';

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  email?: string;
  lifeStage: LifeStage;
  riskTolerance: RiskTolerance;
  investmentHorizon: InvestmentHorizon;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalAssets: number;
  totalLiabilities: number;
  financialLiteracyScore: number;
  preferences: UserPreferences;
  goals: FinancialGoal[];
  behavioralProfile: BehavioralProfile;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface UserPreferences {
  currency: string;
  language: string;
  timezone: string;
  notificationEnabled: boolean;
  nudgesEnabled: boolean;
  autoInvestEnabled: boolean;
  autoSaveEnabled: boolean;
  privacyLevel: 'minimal' | 'standard' | 'full';
  communicationStyle: 'simple' | 'detailed' | 'expert';
}

export interface BehavioralProfile {
  emotionalBias: EmotionalBias;
  decisionPatterns: DecisionPattern[];
  panicSellRisk: number;
  fomoBuyRisk: number;
  lossAversionScore: number;
  overconfidenceScore: number;
  lastAssessmentDate: Date;
}

export type EmotionalBias =
  | 'loss_aversion'
  | 'overconfidence'
  | 'anchoring'
  | 'confirmation'
  | 'herding'
  | 'recency'
  | 'balanced';

export interface DecisionPattern {
  type: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

// ============================================================================
// Financial Goal Types
// ============================================================================

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  type: FinancialGoalType;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: GoalStatus;
  strategy: GoalStrategy;
  milestones: GoalMilestone[];
  contributions: GoalContribution[];
  projections: GoalProjection;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export type GoalStatus =
  | 'draft'
  | 'active'
  | 'on_track'
  | 'behind'
  | 'at_risk'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface GoalStrategy {
  type: 'aggressive' | 'balanced' | 'conservative';
  monthlyContribution: number;
  autoAdjust: boolean;
  rebalanceFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  allocationTargets: AllocationTarget[];
}

export interface AllocationTarget {
  assetClass: string;
  percentage: number;
  minPercentage?: number;
  maxPercentage?: number;
}

export interface GoalMilestone {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: Date;
  status: 'pending' | 'achieved' | 'missed';
  achievedAt?: Date;
  reward?: string;
}

export interface GoalContribution {
  id: string;
  amount: number;
  type: 'manual' | 'automatic' | 'bonus' | 'interest';
  date: Date;
  source: string;
  notes?: string;
}

export interface GoalProjection {
  projectedCompletionDate: Date;
  projectedFinalAmount: number;
  probabilityOfSuccess: number;
  bestCaseScenario: number;
  worstCaseScenario: number;
  monthlyRequiredContribution: number;
  lastCalculatedAt: Date;
}

// ============================================================================
// Savings Automation Types
// ============================================================================

export interface SavingsAutomation {
  id: string;
  userId: string;
  name: string;
  type: SavingsRuleType;
  status: AutomationStatus;
  rule: SavingsRule;
  allocation: SavingsAllocation;
  statistics: SavingsStatistics;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export type SavingsRuleType =
  | 'fixed_amount'
  | 'percentage_of_income'
  | 'round_up'
  | 'surplus'
  | 'milestone_based'
  | 'goal_driven'
  | 'custom';

export type AutomationStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface SavingsRule {
  type: SavingsRuleType;
  amount?: number;
  percentage?: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  triggerCondition?: TriggerCondition;
  maxAmount?: number;
  minBalance?: number;
}

export interface TriggerCondition {
  type: 'balance_above' | 'income_received' | 'expense_below' | 'date' | 'custom';
  value: number | string | Date;
  operator?: 'equals' | 'greater_than' | 'less_than';
}

export interface SavingsAllocation {
  defaultGoalId?: string;
  allocations: AllocationRule[];
}

export interface AllocationRule {
  goalId: string;
  percentage: number;
  priority: number;
}

export interface SavingsStatistics {
  totalSaved: number;
  averageMonthlySavings: number;
  longestStreak: number;
  currentStreak: number;
  savingsRate: number;
  lastSaveDate?: Date;
  projectedAnnualSavings: number;
}

// ============================================================================
// Investment Portfolio Types
// ============================================================================

export interface InvestmentPortfolio {
  id: string;
  userId: string;
  name: string;
  type: PortfolioType;
  status: 'active' | 'paused' | 'liquidating' | 'closed';
  riskProfile: RiskProfile;
  allocation: PortfolioAllocation;
  holdings: PortfolioHolding[];
  performance: PortfolioPerformance;
  rebalancing: RebalancingConfig;
  automation: InvestmentAutomation;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export type PortfolioType =
  | 'growth'
  | 'income'
  | 'balanced'
  | 'conservative'
  | 'aggressive'
  | 'custom';

export interface RiskProfile {
  score: number;
  tolerance: RiskTolerance;
  capacity: 'low' | 'medium' | 'high';
  volatilityTolerance: number;
  maxDrawdownTolerance: number;
  assessmentDate: Date;
}

export interface PortfolioAllocation {
  targetAllocation: AssetAllocation[];
  currentAllocation: AssetAllocation[];
  driftTolerance: number;
  rebalanceThreshold: number;
}

export interface AssetAllocation {
  assetClass: AssetClass;
  targetPercentage: number;
  currentPercentage: number;
  currentValue: number;
}

export type AssetClass =
  | 'crypto'
  | 'stablecoins'
  | 'defi_yield'
  | 'nft'
  | 'liquid_staking'
  | 'lending'
  | 'cash';

export interface PortfolioHolding {
  id: string;
  asset: string;
  assetClass: AssetClass;
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  weight: number;
  lastUpdated: Date;
}

export interface PortfolioPerformance {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercent: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  yearlyReturn: number;
  allTimeReturn: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  lastCalculatedAt: Date;
  benchmarkComparison?: BenchmarkComparison;
}

export interface BenchmarkComparison {
  benchmark: string;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  correlations: number;
}

export interface RebalancingConfig {
  enabled: boolean;
  strategy: 'threshold' | 'calendar' | 'hybrid';
  thresholdPercent: number;
  frequency?: 'weekly' | 'monthly' | 'quarterly';
  lastRebalanceDate?: Date;
  nextScheduledDate?: Date;
  autoExecute: boolean;
}

export interface InvestmentAutomation {
  dollarCostAveraging: DCAConfig;
  autoRebalance: boolean;
  taxLossHarvesting: boolean;
  dividendReinvestment: boolean;
}

export interface DCAConfig {
  enabled: boolean;
  amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  assets: DCAAsset[];
  nextExecutionDate?: Date;
}

export interface DCAAsset {
  symbol: string;
  allocation: number;
}

// ============================================================================
// AI Assistant Types
// ============================================================================

export interface AIAssistantConfig {
  enabled: boolean;
  primaryProvider: string;
  personality: AssistantPersonality;
  capabilities: AssistantCapability[];
  constraints: AssistantConstraints;
  conversationMemory: boolean;
  proactiveInsights: boolean;
}

export type AssistantPersonality = 'friendly' | 'professional' | 'educational' | 'concise';

export type AssistantCapability =
  | 'portfolio_advice'
  | 'savings_planning'
  | 'goal_setting'
  | 'market_insights'
  | 'risk_assessment'
  | 'education'
  | 'behavioral_coaching'
  | 'transaction_assistance';

export interface AssistantConstraints {
  maxSuggestionAmount: number;
  requireConfirmation: boolean;
  riskLevelLimit: RiskTolerance;
  allowedAssetClasses: AssetClass[];
}

export interface AIConversation {
  id: string;
  userId: string;
  messages: AIMessage[];
  context: ConversationContext;
  insights: ConversationInsight[];
  actions: SuggestedAction[];
  startedAt: Date;
  lastMessageAt: Date;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  intent?: MessageIntent;
  entities?: MessageEntity[];
  confidence?: number;
}

export interface MessageIntent {
  type: string;
  confidence: number;
  parameters: Record<string, unknown>;
}

export interface MessageEntity {
  type: string;
  value: string;
  position: { start: number; end: number };
}

export interface ConversationContext {
  currentTopic?: string;
  userSentiment: 'positive' | 'neutral' | 'negative' | 'anxious';
  urgencyLevel: 'low' | 'medium' | 'high';
  relevantGoals: string[];
  recentActivity: string[];
}

export interface ConversationInsight {
  type: string;
  message: string;
  importance: 'low' | 'medium' | 'high';
  actionable: boolean;
  relatedGoalId?: string;
}

export interface SuggestedAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  impact: ActionImpact;
  parameters: Record<string, unknown>;
  requiresConfirmation: boolean;
  expiresAt?: Date;
}

export type ActionType =
  | 'save'
  | 'invest'
  | 'rebalance'
  | 'goal_create'
  | 'goal_adjust'
  | 'alert_set'
  | 'education'
  | 'custom';

export interface ActionImpact {
  description: string;
  projectedBenefit?: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeToImpact: string;
}

// ============================================================================
// Behavioral Finance Types
// ============================================================================

export interface BehavioralAnalysis {
  userId: string;
  analysisDate: Date;
  emotionalState: EmotionalState;
  biasAssessment: BiasAssessment;
  recommendations: BehavioralRecommendation[];
  interventions: BehavioralIntervention[];
  historicalPatterns: HistoricalPattern[];
}

export interface EmotionalState {
  current: 'calm' | 'anxious' | 'excited' | 'fearful' | 'confident';
  trend: 'improving' | 'stable' | 'declining';
  triggers: string[];
  confidence: number;
}

export interface BiasAssessment {
  dominantBiases: BiasDetail[];
  riskScore: number;
  lastUpdated: Date;
}

export interface BiasDetail {
  type: EmotionalBias;
  severity: 'low' | 'medium' | 'high';
  frequency: number;
  recentExamples: string[];
  mitigation: string;
}

export interface BehavioralRecommendation {
  id: string;
  type: 'warning' | 'suggestion' | 'encouragement';
  message: string;
  context: string;
  priority: 'low' | 'medium' | 'high';
  triggerCondition?: string;
}

export interface BehavioralIntervention {
  id: string;
  type: InterventionType;
  trigger: string;
  message: string;
  action?: SuggestedAction;
  cooldownPeriod: number;
  lastTriggeredAt?: Date;
}

export type InterventionType =
  | 'panic_sell_prevention'
  | 'fomo_buy_prevention'
  | 'loss_aversion_coaching'
  | 'overtrading_warning'
  | 'confirmation_bias_alert'
  | 'patience_encouragement';

export interface HistoricalPattern {
  type: string;
  description: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  lastOccurrence: Date;
}

// ============================================================================
// Financial Education Types
// ============================================================================

export interface EducationModule {
  id: string;
  title: string;
  description: string;
  category: EducationCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  lessons: Lesson[];
  quizzes: Quiz[];
  simulations: Simulation[];
  prerequisites: string[];
  rewards: EducationReward[];
}

export type EducationCategory =
  | 'basics'
  | 'investing'
  | 'crypto'
  | 'defi'
  | 'risk_management'
  | 'tax_planning'
  | 'retirement'
  | 'behavioral_finance';

export interface Lesson {
  id: string;
  title: string;
  content: string;
  format: 'text' | 'video' | 'interactive';
  duration: number;
  keyTakeaways: string[];
  resources: LessonResource[];
}

export interface LessonResource {
  type: 'article' | 'video' | 'tool' | 'calculator';
  title: string;
  url: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank';
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
}

export interface Simulation {
  id: string;
  title: string;
  description: string;
  type: 'portfolio' | 'market' | 'scenario';
  parameters: SimulationParameters;
  learningObjectives: string[];
}

export interface SimulationParameters {
  initialCapital: number;
  duration: string;
  marketConditions: 'bull' | 'bear' | 'volatile' | 'random';
  availableAssets: string[];
}

export interface EducationReward {
  type: 'badge' | 'certificate' | 'points' | 'unlock';
  value: string | number;
  condition: string;
}

export interface UserEducationProgress {
  userId: string;
  completedModules: string[];
  currentModule?: string;
  totalPoints: number;
  badges: Badge[];
  certificates: Certificate[];
  literacyScore: number;
  streak: number;
  lastActivityDate: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earnedAt: Date;
  category: string;
}

export interface Certificate {
  id: string;
  moduleId: string;
  title: string;
  issuedAt: Date;
  score: number;
}

// ============================================================================
// Notification & Nudge Types
// ============================================================================

export interface NotificationConfig {
  userId: string;
  enabled: boolean;
  channels: NotificationChannel[];
  preferences: NotificationPreferences;
  quietHours: QuietHoursConfig;
}

export interface NotificationChannel {
  type: 'push' | 'email' | 'telegram' | 'in_app';
  enabled: boolean;
  identifier?: string;
}

export interface NotificationPreferences {
  marketAlerts: boolean;
  goalProgress: boolean;
  savingsReminders: boolean;
  investmentOpportunities: boolean;
  riskWarnings: boolean;
  educationalContent: boolean;
  behavioralNudges: boolean;
  weeklyDigest: boolean;
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
  excludeUrgent: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action?: NotificationAction;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'dismissed';
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

export type NotificationType =
  | 'alert'
  | 'reminder'
  | 'insight'
  | 'opportunity'
  | 'warning'
  | 'achievement'
  | 'nudge';

export type NotificationCategory =
  | 'savings'
  | 'investment'
  | 'goal'
  | 'market'
  | 'risk'
  | 'education'
  | 'behavioral';

export interface NotificationAction {
  type: 'open_app' | 'view_goal' | 'view_portfolio' | 'take_action' | 'learn_more';
  label: string;
  deepLink?: string;
  parameters?: Record<string, unknown>;
}

export interface Nudge {
  id: string;
  userId: string;
  type: NudgeType;
  message: string;
  context: NudgeContext;
  trigger: NudgeTrigger;
  action?: SuggestedAction;
  effectiveness: NudgeEffectiveness;
  status: 'scheduled' | 'sent' | 'acted_on' | 'dismissed' | 'expired';
  createdAt: Date;
  sentAt?: Date;
}

export type NudgeType =
  | 'savings_reminder'
  | 'investment_opportunity'
  | 'goal_encouragement'
  | 'risk_warning'
  | 'behavioral_guidance'
  | 'celebration'
  | 'education_prompt';

export interface NudgeContext {
  relevantGoalId?: string;
  marketCondition?: string;
  userBehavior?: string;
  timing: string;
}

export interface NudgeTrigger {
  type: 'time' | 'event' | 'condition' | 'pattern';
  condition: string;
  parameters: Record<string, unknown>;
}

export interface NudgeEffectiveness {
  opened: boolean;
  actedOn: boolean;
  feedback?: 'helpful' | 'not_helpful' | 'annoying';
  impact?: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface FinancialDashboard {
  userId: string;
  generatedAt: Date;
  netWorth: NetWorthSummary;
  cashFlow: CashFlowSummary;
  goals: GoalsSummary;
  portfolio: PortfolioSummary;
  savings: SavingsSummary;
  risk: RiskSummary;
  insights: DashboardInsight[];
  recommendations: DashboardRecommendation[];
}

export interface NetWorthSummary {
  total: number;
  change24h: number;
  changePercent24h: number;
  change30d: number;
  changePercent30d: number;
  assets: AssetBreakdown[];
  liabilities: LiabilityBreakdown[];
  history: NetWorthHistoryPoint[];
}

export interface AssetBreakdown {
  category: string;
  value: number;
  percentage: number;
  change: number;
}

export interface LiabilityBreakdown {
  category: string;
  value: number;
  interestRate?: number;
  monthlyPayment?: number;
}

export interface NetWorthHistoryPoint {
  date: Date;
  value: number;
  assets: number;
  liabilities: number;
}

export interface CashFlowSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  trend: 'improving' | 'stable' | 'declining';
  projectedSurplus: number;
  categoryBreakdown: ExpenseCategory[];
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  budget?: number;
}

export interface GoalsSummary {
  totalGoals: number;
  onTrack: number;
  behind: number;
  atRisk: number;
  completed: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  topGoals: GoalSummaryItem[];
}

export interface GoalSummaryItem {
  goalId: string;
  name: string;
  progress: number;
  status: GoalStatus;
  daysRemaining?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  allocation: AllocationSummaryItem[];
  topPerformers: PerformerItem[];
  bottomPerformers: PerformerItem[];
}

export interface AllocationSummaryItem {
  assetClass: string;
  value: number;
  percentage: number;
  targetPercentage: number;
  drift: number;
}

export interface PerformerItem {
  symbol: string;
  name: string;
  returnPercent: number;
  value: number;
}

export interface SavingsSummary {
  totalSaved: number;
  monthlyAverage: number;
  currentStreak: number;
  savingsRate: number;
  automationStatus: 'active' | 'paused' | 'none';
  nextScheduledSave?: Date;
  recentSaves: RecentSaveItem[];
}

export interface RecentSaveItem {
  date: Date;
  amount: number;
  goalName?: string;
  type: 'manual' | 'automatic';
}

export interface RiskSummary {
  overallScore: number;
  status: 'low' | 'moderate' | 'elevated' | 'high';
  portfolioRisk: number;
  concentrationRisk: number;
  volatilityRisk: number;
  alerts: RiskAlertItem[];
}

export interface RiskAlertItem {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestedAction?: string;
}

export interface DashboardInsight {
  id: string;
  type: 'positive' | 'neutral' | 'warning';
  title: string;
  message: string;
  metric?: {
    label: string;
    value: number | string;
    change?: number;
  };
  action?: {
    label: string;
    type: string;
  };
}

export interface DashboardRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  effort: 'easy' | 'medium' | 'complex';
  category: string;
  actionLabel?: string;
}

// ============================================================================
// Privacy & Trust Types
// ============================================================================

export interface PrivacySettings {
  userId: string;
  dataSharing: DataSharingPreferences;
  aiDecisionTransparency: TransparencyLevel;
  dataRetention: DataRetentionConfig;
  exportHistory: DataExportRecord[];
}

export interface DataSharingPreferences {
  anonymizedAnalytics: boolean;
  personalizedRecommendations: boolean;
  thirdPartyIntegrations: boolean;
  researchParticipation: boolean;
}

export type TransparencyLevel = 'minimal' | 'standard' | 'detailed' | 'full';

export interface DataRetentionConfig {
  transactionHistory: number;
  conversationHistory: number;
  analyticsData: number;
  deletedAccountRetention: number;
}

export interface DataExportRecord {
  id: string;
  requestedAt: Date;
  completedAt?: Date;
  format: 'json' | 'csv' | 'pdf';
  dataTypes: string[];
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface AIDecisionExplanation {
  decisionId: string;
  timestamp: Date;
  type: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  reasoning: string[];
  factors: DecisionFactor[];
  confidence: number;
  alternatives: AlternativeDecision[];
  userCanOverride: boolean;
}

export interface DecisionFactor {
  name: string;
  weight: number;
  value: unknown;
  contribution: number;
  explanation: string;
}

export interface AlternativeDecision {
  description: string;
  impact: string;
  tradeoffs: string[];
}

// ============================================================================
// Event Types
// ============================================================================

export interface PersonalFinanceEvent {
  id: string;
  timestamp: Date;
  type: PersonalFinanceEventType;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export type PersonalFinanceEventType =
  | 'profile_created'
  | 'profile_updated'
  | 'goal_created'
  | 'goal_updated'
  | 'goal_completed'
  | 'savings_automated'
  | 'savings_executed'
  | 'investment_made'
  | 'portfolio_rebalanced'
  | 'notification_sent'
  | 'nudge_sent'
  | 'education_completed'
  | 'ai_interaction'
  | 'behavioral_intervention'
  | 'dashboard_viewed';

export type PersonalFinanceEventCallback = (event: PersonalFinanceEvent) => void;

// ============================================================================
// Configuration Types
// ============================================================================

export interface PersonalFinanceConfig {
  aiAssistant: Partial<AIAssistantConfig>;
  savings: Partial<SavingsConfig>;
  investment: Partial<InvestmentConfig>;
  education: Partial<EducationConfig>;
  notifications: Partial<NotificationsConfig>;
  behavioral: Partial<BehavioralConfig>;
  privacy: Partial<PrivacyConfig>;
}

export interface SavingsConfig {
  enabled: boolean;
  minSaveAmount: number;
  maxAutomatedSavePercent: number;
  emergencyFundTarget: number;
  defaultGoalType: FinancialGoalType;
}

export interface InvestmentConfig {
  enabled: boolean;
  minInvestmentAmount: number;
  allowedAssetClasses: AssetClass[];
  maxConcentration: number;
  rebalanceThreshold: number;
  dcaEnabled: boolean;
}

export interface EducationConfig {
  enabled: boolean;
  adaptiveLearning: boolean;
  gamificationEnabled: boolean;
  simulationsEnabled: boolean;
}

export interface NotificationsConfig {
  enabled: boolean;
  maxDailyNotifications: number;
  nudgeFrequency: 'low' | 'medium' | 'high';
  digestEnabled: boolean;
}

export interface BehavioralConfig {
  enabled: boolean;
  interventionLevel: 'passive' | 'moderate' | 'active';
  panicSellProtection: boolean;
  fomoBuyProtection: boolean;
}

export interface PrivacyConfig {
  defaultTransparencyLevel: TransparencyLevel;
  dataRetentionDays: number;
  allowAnonymizedAnalytics: boolean;
}
