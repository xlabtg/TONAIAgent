/**
 * TONAIAgent - AI-native Payments and Commerce Layer Type Definitions
 *
 * Comprehensive types for autonomous payments, smart subscriptions, intelligent spending,
 * merchant infrastructure, agent-driven commerce, cross-border payments, and financial analytics.
 */

// ============================================================================
// Core Payment Types
// ============================================================================

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'captured'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed';

export type PaymentMethod =
  | 'ton_wallet'
  | 'jetton'
  | 'stablecoin'
  | 'nft'
  | 'credit_line'
  | 'escrow'
  | 'multi_sig';

export type PaymentType =
  | 'one_time'
  | 'recurring'
  | 'scheduled'
  | 'conditional'
  | 'split'
  | 'escrow'
  | 'invoice';

export type Currency =
  | 'TON'
  | 'USDT'
  | 'USDC'
  | 'NOT'
  | 'DOGS'
  | 'STON'
  | 'jUSDT'
  | 'jUSDC'
  | 'custom';

export interface Payment {
  id: string;
  type: PaymentType;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: string;
  currency: Currency;
  customToken?: string;
  sender: PaymentParty;
  recipient: PaymentParty;
  description?: string;
  reference?: string;
  metadata: Record<string, unknown>;
  fees: PaymentFees;
  authorization?: PaymentAuthorization;
  schedule?: PaymentSchedule;
  conditions?: PaymentCondition[];
  splits?: PaymentSplit[];
  escrow?: EscrowDetails;
  crossBorder?: CrossBorderDetails;
  compliance: ComplianceInfo;
  audit: AuditTrail;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface PaymentParty {
  type: 'user' | 'merchant' | 'agent' | 'contract' | 'treasury';
  id: string;
  address: string;
  name?: string;
  verified: boolean;
  metadata?: Record<string, unknown>;
}

export interface PaymentFees {
  network: string;
  platform: string;
  merchant?: string;
  total: string;
  currency: Currency;
  paidBy: 'sender' | 'recipient' | 'split';
}

export interface PaymentAuthorization {
  type: 'single' | 'multi_sig' | 'agent' | 'smart_contract';
  required: number;
  collected: number;
  approvers: Approver[];
  expiresAt?: Date;
  autoApprove?: AutoApproveRule;
}

export interface Approver {
  id: string;
  type: 'user' | 'agent' | 'guardian';
  status: 'pending' | 'approved' | 'rejected';
  signature?: string;
  timestamp?: Date;
  reason?: string;
}

export interface AutoApproveRule {
  enabled: boolean;
  maxAmount: string;
  trustedRecipients: string[];
  categories: string[];
  timeWindow?: TimeWindow;
}

export interface TimeWindow {
  start: string;
  end: string;
  timezone: string;
  daysOfWeek?: number[];
}

export interface PaymentSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  executeAt?: Date;
  frequency?: ScheduleFrequency;
  interval?: number;
  startDate?: Date;
  endDate?: Date;
  maxExecutions?: number;
  executionCount: number;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  timezone?: string;
}

export type ScheduleFrequency =
  | 'minutely'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'annually';

export interface PaymentCondition {
  id: string;
  type: ConditionType;
  operator: ConditionOperator;
  value: string | number | boolean;
  field?: string;
  oracle?: OracleConfig;
  status: 'pending' | 'met' | 'not_met' | 'expired';
  evaluatedAt?: Date;
}

export type ConditionType =
  | 'balance_check'
  | 'price_threshold'
  | 'time_based'
  | 'event_trigger'
  | 'oracle_data'
  | 'approval_received'
  | 'delivery_confirmed'
  | 'custom';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'in_range';

export interface OracleConfig {
  provider: string;
  endpoint: string;
  dataPath: string;
  updateInterval: number;
  lastValue?: unknown;
  lastUpdated?: Date;
}

export interface PaymentSplit {
  recipientId: string;
  recipientAddress: string;
  amount?: string;
  percentage?: number;
  type: 'fixed' | 'percentage';
  status: PaymentStatus;
  transactionId?: string;
}

export interface EscrowDetails {
  escrowAddress: string;
  releaseConditions: PaymentCondition[];
  arbitrator?: string;
  timeout: number;
  autoRelease: boolean;
  disputeWindow: number;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  releasedAt?: Date;
}

export interface CrossBorderDetails {
  sourceCountry: string;
  destinationCountry: string;
  exchangeRate: string;
  sourceCurrency: Currency;
  destinationCurrency: Currency;
  sourceAmount: string;
  destinationAmount: string;
  corridor: string;
  provider?: string;
  regulatoryStatus: RegulatoryStatus;
}

export type RegulatoryStatus =
  | 'compliant'
  | 'pending_review'
  | 'requires_documentation'
  | 'restricted'
  | 'blocked';

// ============================================================================
// Compliance Types
// ============================================================================

export interface ComplianceInfo {
  verified: boolean;
  level: ComplianceLevel;
  checks: ComplianceCheck[];
  riskScore: number;
  flags: ComplianceFlag[];
  restrictions?: PaymentRestriction[];
  lastReviewAt?: Date;
  nextReviewAt?: Date;
}

export type ComplianceLevel = 'none' | 'basic' | 'standard' | 'enhanced' | 'full';

export interface ComplianceCheck {
  type: ComplianceCheckType;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  timestamp: Date;
  details?: Record<string, unknown>;
  score?: number;
}

export type ComplianceCheckType =
  | 'kyc_verified'
  | 'aml_screening'
  | 'sanctions_check'
  | 'pep_screening'
  | 'fraud_detection'
  | 'velocity_check'
  | 'amount_limit'
  | 'geographic_restriction'
  | 'device_fingerprint'
  | 'behavior_analysis';

export interface ComplianceFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: 'monitor' | 'review' | 'block' | 'escalate';
  raisedAt: Date;
  resolvedAt?: Date;
}

export interface PaymentRestriction {
  type: 'amount' | 'frequency' | 'recipient' | 'category' | 'geographic';
  value: string | number;
  reason: string;
  expiresAt?: Date;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditTrail {
  events: AuditEvent[];
  hash?: string;
  onChainRef?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  actorType: 'user' | 'agent' | 'system' | 'contract';
  details: Record<string, unknown>;
  ipAddress?: string;
  deviceFingerprint?: string;
  signature?: string;
}

// ============================================================================
// Subscription Types
// ============================================================================

export type SubscriptionStatus =
  | 'draft'
  | 'pending_activation'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'suspended';

export type BillingCycle = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';

export interface Subscription {
  id: string;
  subscriberId: string;
  merchantId: string;
  planId: string;
  status: SubscriptionStatus;
  billing: BillingDetails;
  pricing: SubscriptionPricing;
  trial?: TrialDetails;
  usage?: UsageTracking;
  preferences: SubscriptionPreferences;
  automation: SubscriptionAutomation;
  history: SubscriptionHistoryEntry[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  cancelledAt?: Date;
  expiresAt?: Date;
}

export interface BillingDetails {
  cycle: BillingCycle;
  anchor: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  billingAttempts: number;
  maxRetries: number;
  lastPaymentId?: string;
  lastPaymentAt?: Date;
  lastPaymentStatus?: PaymentStatus;
}

export interface SubscriptionPricing {
  type: 'fixed' | 'tiered' | 'usage_based' | 'hybrid';
  baseAmount: string;
  currency: Currency;
  tiers?: PricingTier[];
  usageRates?: UsageRate[];
  discounts?: PricingDiscount[];
  taxes?: TaxConfig;
  effectiveAmount?: string;
}

export interface PricingTier {
  name: string;
  minUnits: number;
  maxUnits?: number;
  pricePerUnit: string;
  flatFee?: string;
}

export interface UsageRate {
  metric: string;
  unit: string;
  pricePerUnit: string;
  includedUnits?: number;
  overage?: string;
}

export interface PricingDiscount {
  type: 'percentage' | 'fixed' | 'trial';
  value: string;
  reason: string;
  validUntil?: Date;
  code?: string;
}

export interface TaxConfig {
  enabled: boolean;
  rate: number;
  jurisdiction: string;
  inclusive: boolean;
}

export interface TrialDetails {
  enabled: boolean;
  duration: number;
  durationUnit: 'days' | 'weeks' | 'months';
  startDate: Date;
  endDate: Date;
  converted: boolean;
  conversionDate?: Date;
}

export interface UsageTracking {
  metrics: UsageMetric[];
  currentPeriodUsage: Record<string, number>;
  billedUsage: Record<string, number>;
  lastReportedAt: Date;
}

export interface UsageMetric {
  name: string;
  unit: string;
  aggregation: 'sum' | 'max' | 'last';
  resetOnBilling: boolean;
}

export interface SubscriptionPreferences {
  autoRenew: boolean;
  reminderDays: number;
  paymentMethod: PaymentMethod;
  fallbackMethods: PaymentMethod[];
  notifyOnRenewal: boolean;
  notifyOnFailure: boolean;
  allowPause: boolean;
  maxPauseDuration?: number;
}

export interface SubscriptionAutomation {
  enabled: boolean;
  aiOptimization: boolean;
  autoUpgrade: boolean;
  autoDowngrade: boolean;
  usageAlerts: UsageAlert[];
  costOptimization: CostOptimizationConfig;
}

export interface UsageAlert {
  metric: string;
  threshold: number;
  operator: 'above' | 'below' | 'approaching';
  notification: 'email' | 'push' | 'in_app' | 'telegram';
  triggered: boolean;
  lastTriggeredAt?: Date;
}

export interface CostOptimizationConfig {
  enabled: boolean;
  targetBudget?: string;
  recommendations: boolean;
  autoApplyOptimizations: boolean;
  thresholdPercent: number;
}

export interface SubscriptionHistoryEntry {
  id: string;
  timestamp: Date;
  action: SubscriptionAction;
  previousState?: Partial<Subscription>;
  newState?: Partial<Subscription>;
  reason?: string;
  actor: string;
  actorType: 'user' | 'agent' | 'system' | 'merchant';
}

export type SubscriptionAction =
  | 'created'
  | 'activated'
  | 'upgraded'
  | 'downgraded'
  | 'paused'
  | 'resumed'
  | 'renewed'
  | 'payment_failed'
  | 'payment_succeeded'
  | 'cancelled'
  | 'expired'
  | 'reactivated';

// ============================================================================
// Subscription Plan Types
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  features: PlanFeature[];
  pricing: SubscriptionPricing;
  limits: PlanLimits;
  trial?: TrialConfig;
  status: 'draft' | 'active' | 'archived';
  visibility: 'public' | 'private' | 'invite_only';
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeature {
  name: string;
  description?: string;
  included: boolean;
  limit?: number | string;
  overage?: boolean;
}

export interface PlanLimits {
  maxSubscribers?: number;
  minSubscriptionDuration?: number;
  maxPauseDuration?: number;
  cancellationNoticeDays?: number;
}

export interface TrialConfig {
  enabled: boolean;
  duration: number;
  durationUnit: 'days' | 'weeks' | 'months';
  requirePaymentMethod: boolean;
}

// ============================================================================
// Smart Spending Types
// ============================================================================

export interface SpendingProfile {
  userId: string;
  budget: BudgetConfig;
  categories: SpendingCategory[];
  rules: SpendingRule[];
  optimization: SpendingOptimization;
  insights: SpendingInsight[];
  alerts: SpendingAlert[];
  history: SpendingHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetConfig {
  period: 'daily' | 'weekly' | 'monthly';
  totalLimit: string;
  currency: Currency;
  categoryLimits: Record<string, string>;
  rollover: boolean;
  carryOverAmount?: string;
  startDate: Date;
  enforceHardLimits: boolean;
}

export interface SpendingCategory {
  id: string;
  name: string;
  icon?: string;
  budget?: string;
  spent: string;
  remaining: string;
  transactions: number;
  avgTransaction: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  subcategories?: SpendingCategory[];
}

export interface SpendingRule {
  id: string;
  name: string;
  type: SpendingRuleType;
  enabled: boolean;
  priority: number;
  condition: RuleCondition;
  action: RuleAction;
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastTriggeredAt?: Date;
  triggerCount: number;
}

export type SpendingRuleType =
  | 'limit'
  | 'approval'
  | 'block'
  | 'alert'
  | 'redirect'
  | 'optimize'
  | 'cashback'
  | 'round_up';

export interface RuleCondition {
  type: 'amount' | 'category' | 'merchant' | 'time' | 'frequency' | 'composite';
  operator: ConditionOperator;
  value: unknown;
  subConditions?: RuleCondition[];
  logicalOperator?: 'and' | 'or';
}

export interface RuleAction {
  type: 'block' | 'warn' | 'require_approval' | 'apply_discount' | 'redirect_savings' | 'notify';
  parameters: Record<string, unknown>;
  fallback?: RuleAction;
}

export interface SpendingOptimization {
  enabled: boolean;
  aiProvider: string;
  lastAnalysis: Date;
  potentialSavings: string;
  recommendations: OptimizationRecommendation[];
  appliedOptimizations: AppliedOptimization[];
  autoApply: boolean;
  targetSavingsPercent: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'switch_provider' | 'bundle' | 'timing' | 'payment_method' | 'negotiate' | 'cancel';
  title: string;
  description: string;
  potentialSavings: string;
  confidence: number;
  effort: 'easy' | 'medium' | 'complex';
  category: string;
  merchantId?: string;
  actionRequired: string;
  expiresAt?: Date;
  status: 'pending' | 'applied' | 'dismissed' | 'expired';
}

export interface AppliedOptimization {
  recommendationId: string;
  appliedAt: Date;
  savingsRealized: string;
  status: 'active' | 'reverted' | 'expired';
}

export interface SpendingInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'warning' | 'achievement';
  title: string;
  message: string;
  data: Record<string, unknown>;
  importance: 'low' | 'medium' | 'high';
  actionable: boolean;
  action?: string;
  createdAt: Date;
  expiresAt?: Date;
  acknowledged: boolean;
}

export interface SpendingAlert {
  id: string;
  type: 'budget_warning' | 'unusual_activity' | 'subscription_renewal' | 'price_change' | 'opportunity';
  threshold?: number;
  triggered: boolean;
  message: string;
  channels: ('push' | 'email' | 'telegram' | 'in_app')[];
  lastTriggeredAt?: Date;
  snoozedUntil?: Date;
}

export interface SpendingHistoryEntry {
  date: Date;
  period: 'day' | 'week' | 'month';
  totalSpent: string;
  categoryBreakdown: Record<string, string>;
  transactionCount: number;
  avgTransactionSize: string;
  savingsApplied: string;
  budgetUtilization: number;
}

// ============================================================================
// Merchant Types
// ============================================================================

export interface Merchant {
  id: string;
  name: string;
  displayName: string;
  type: MerchantType;
  status: MerchantStatus;
  verification: MerchantVerification;
  profile: MerchantProfile;
  settings: MerchantSettings;
  integration: MerchantIntegration;
  analytics: MerchantAnalytics;
  compliance: MerchantCompliance;
  createdAt: Date;
  updatedAt: Date;
}

export type MerchantType =
  | 'individual'
  | 'small_business'
  | 'enterprise'
  | 'marketplace'
  | 'saas'
  | 'agency';

export type MerchantStatus =
  | 'pending'
  | 'under_review'
  | 'active'
  | 'suspended'
  | 'terminated';

export interface MerchantVerification {
  level: 'none' | 'basic' | 'verified' | 'premium';
  kybCompleted: boolean;
  documentsSubmitted: string[];
  documentsVerified: string[];
  lastVerificationDate?: Date;
  expiryDate?: Date;
  flags: string[];
}

export interface MerchantProfile {
  logo?: string;
  website?: string;
  description?: string;
  categories: string[];
  address?: MerchantAddress;
  contact: MerchantContact;
  social?: Record<string, string>;
  operatingHours?: OperatingHours;
}

export interface MerchantAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
}

export interface MerchantContact {
  email: string;
  phone?: string;
  supportEmail?: string;
  supportUrl?: string;
}

export interface OperatingHours {
  timezone: string;
  schedule: Record<string, { open: string; close: string } | null>;
}

export interface MerchantSettings {
  currencies: Currency[];
  defaultCurrency: Currency;
  paymentMethods: PaymentMethod[];
  checkout: CheckoutSettings;
  notifications: MerchantNotificationSettings;
  webhooks: WebhookConfig[];
  api: ApiSettings;
  fees: MerchantFeeConfig;
}

export interface CheckoutSettings {
  theme: 'light' | 'dark' | 'auto' | 'custom';
  customCss?: string;
  logo?: string;
  brandColor?: string;
  redirectUrl?: string;
  cancelUrl?: string;
  collectEmail: boolean;
  collectPhone: boolean;
  collectAddress: boolean;
  termsUrl?: string;
  privacyUrl?: string;
}

export interface MerchantNotificationSettings {
  paymentReceived: boolean;
  paymentFailed: boolean;
  subscriptionEvents: boolean;
  disputeOpened: boolean;
  settlementCompleted: boolean;
  channels: ('email' | 'webhook' | 'telegram')[];
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  retries: number;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: 'success' | 'failed';
}

export interface ApiSettings {
  enabled: boolean;
  keys: ApiKey[];
  rateLimit: number;
  allowedOrigins: string[];
  ipWhitelist: string[];
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  enabled: boolean;
}

export interface MerchantFeeConfig {
  platformFeePercent: number;
  minFee: string;
  maxFee?: string;
  customRates: Record<string, number>;
  payoutSchedule: 'instant' | 'daily' | 'weekly' | 'monthly';
  payoutMinimum: string;
}

export interface MerchantIntegration {
  sdkVersion?: string;
  plugins: string[];
  connectedApps: ConnectedApp[];
  apiUsage: ApiUsageStats;
}

export interface ConnectedApp {
  id: string;
  name: string;
  type: string;
  connectedAt: Date;
  permissions: string[];
  status: 'active' | 'disconnected' | 'error';
}

export interface ApiUsageStats {
  period: 'day' | 'month';
  requests: number;
  successRate: number;
  avgLatency: number;
  errors: number;
  topEndpoints: { endpoint: string; count: number }[];
}

export interface MerchantAnalytics {
  revenue: RevenueStats;
  transactions: TransactionStats;
  customers: CustomerStats;
  subscriptions: SubscriptionStats;
  churn: ChurnStats;
}

export interface RevenueStats {
  total: string;
  period: 'day' | 'week' | 'month' | 'year';
  growth: number;
  byCategory: Record<string, string>;
  byCurrency: Record<string, string>;
  projectedMonthly: string;
}

export interface TransactionStats {
  count: number;
  avgValue: string;
  successRate: number;
  refundRate: number;
  disputeRate: number;
  topPaymentMethods: { method: PaymentMethod; count: number }[];
}

export interface CustomerStats {
  total: number;
  newThisPeriod: number;
  returning: number;
  avgLifetimeValue: string;
  topCustomers: { id: string; revenue: string }[];
}

export interface SubscriptionStats {
  active: number;
  mrr: string;
  arr: string;
  growth: number;
  avgRevenue: string;
  conversionRate: number;
}

export interface ChurnStats {
  rate: number;
  count: number;
  revenue: string;
  reasons: { reason: string; count: number }[];
}

export interface MerchantCompliance {
  level: ComplianceLevel;
  certifications: string[];
  lastAudit?: Date;
  nextAudit?: Date;
  riskScore: number;
  restrictions: PaymentRestriction[];
}

// ============================================================================
// Checkout Types
// ============================================================================

export interface CheckoutSession {
  id: string;
  merchantId: string;
  status: CheckoutStatus;
  mode: 'payment' | 'subscription' | 'setup';
  lineItems: LineItem[];
  customer?: CheckoutCustomer;
  billing?: BillingAddress;
  shipping?: ShippingAddress;
  totals: CheckoutTotals;
  payment?: PaymentIntent;
  subscription?: SubscriptionIntent;
  metadata: Record<string, unknown>;
  urls: CheckoutUrls;
  expiresAt: Date;
  createdAt: Date;
  completedAt?: Date;
}

export type CheckoutStatus =
  | 'open'
  | 'complete'
  | 'expired'
  | 'abandoned';

export interface LineItem {
  id: string;
  name: string;
  description?: string;
  image?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  currency: Currency;
  productId?: string;
  variantId?: string;
  taxRate?: number;
  metadata?: Record<string, unknown>;
}

export interface CheckoutCustomer {
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface BillingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
}

export interface ShippingAddress extends BillingAddress {
  phone?: string;
  instructions?: string;
}

export interface CheckoutTotals {
  subtotal: string;
  tax: string;
  shipping: string;
  discount: string;
  total: string;
  currency: Currency;
}

export interface PaymentIntent {
  id: string;
  amount: string;
  currency: Currency;
  status: 'requires_payment' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  paymentMethod?: PaymentMethod;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionIntent {
  planId: string;
  trialDays?: number;
  coupon?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutUrls {
  success: string;
  cancel: string;
  checkout?: string;
}

// ============================================================================
// Agent Commerce Types
// ============================================================================

export interface AgentCommerceConfig {
  agentId: string;
  enabled: boolean;
  capabilities: AgentCapability[];
  limits: AgentLimits;
  authorization: AgentAuthorization;
  preferences: AgentCommercePreferences;
  performance: AgentPerformance;
}

export type AgentCapability =
  | 'autonomous_payment'
  | 'negotiate_price'
  | 'bulk_purchase'
  | 'subscription_management'
  | 'procurement'
  | 'invoice_processing'
  | 'expense_optimization'
  | 'vendor_management';

export interface AgentLimits {
  maxTransactionAmount: string;
  dailyLimit: string;
  monthlyLimit: string;
  maxNegotiationDiscount: number;
  approvalRequired: ApprovalThreshold[];
  blockedCategories: string[];
  blockedMerchants: string[];
}

export interface ApprovalThreshold {
  amount: string;
  requiresApproval: boolean;
  approverType: 'user' | 'guardian' | 'multi_sig';
  minApprovers?: number;
}

export interface AgentAuthorization {
  type: 'delegated' | 'autonomous' | 'supervised';
  delegatedBy?: string;
  scope: AuthorizationScope;
  validFrom: Date;
  validUntil?: Date;
  revocable: boolean;
  auditRequired: boolean;
}

export interface AuthorizationScope {
  merchants: string[] | 'all';
  categories: string[] | 'all';
  currencies: Currency[] | 'all';
  maxAmount: string;
  paymentTypes: PaymentType[];
}

export interface AgentCommercePreferences {
  preferredPaymentMethod: PaymentMethod;
  preferredCurrency: Currency;
  negotiationStyle: 'aggressive' | 'balanced' | 'conservative';
  autoOptimize: boolean;
  prioritizeCost: boolean;
  prioritizeSpeed: boolean;
  maxWaitTime: number;
}

export interface AgentPerformance {
  totalTransactions: number;
  totalVolume: string;
  avgSavings: number;
  negotiationSuccessRate: number;
  avgNegotiationSavings: number;
  errorRate: number;
  avgExecutionTime: number;
}

export interface AgentTransaction {
  id: string;
  agentId: string;
  type: AgentTransactionType;
  status: PaymentStatus;
  payment?: Payment;
  negotiation?: Negotiation;
  procurement?: ProcurementOrder;
  decision: AgentDecision;
  execution: ExecutionDetails;
  createdAt: Date;
  completedAt?: Date;
}

export type AgentTransactionType =
  | 'direct_payment'
  | 'negotiated_purchase'
  | 'bulk_order'
  | 'subscription_action'
  | 'expense_payment'
  | 'vendor_payment';

export interface Negotiation {
  id: string;
  merchantId: string;
  productId?: string;
  initialPrice: string;
  targetPrice: string;
  finalPrice?: string;
  rounds: NegotiationRound[];
  status: 'in_progress' | 'accepted' | 'rejected' | 'expired';
  savings?: string;
  strategy: string;
}

export interface NegotiationRound {
  round: number;
  agentOffer: string;
  merchantResponse?: string;
  timestamp: Date;
  accepted?: boolean;
}

export interface ProcurementOrder {
  id: string;
  items: ProcurementItem[];
  vendors: VendorQuote[];
  selectedVendor?: string;
  status: 'draft' | 'sourcing' | 'quoted' | 'ordered' | 'delivered' | 'completed';
  totalAmount: string;
  savingsFromOptimization: string;
}

export interface ProcurementItem {
  productId: string;
  name: string;
  quantity: number;
  specifications?: Record<string, unknown>;
  maxPrice?: string;
  requiredBy?: Date;
}

export interface VendorQuote {
  vendorId: string;
  vendorName: string;
  items: { productId: string; price: string; available: boolean; deliveryDate: Date }[];
  totalPrice: string;
  shippingCost: string;
  deliveryDate: Date;
  validUntil: Date;
  terms?: string;
}

export interface AgentDecision {
  reasoning: string[];
  factors: DecisionFactor[];
  confidence: number;
  alternatives: AlternativeAction[];
  humanOverrideAllowed: boolean;
}

export interface DecisionFactor {
  name: string;
  weight: number;
  value: unknown;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface AlternativeAction {
  description: string;
  expectedOutcome: string;
  tradeoffs: string[];
}

export interface ExecutionDetails {
  startedAt: Date;
  completedAt?: Date;
  steps: ExecutionStep[];
  retries: number;
  errors: ExecutionError[];
}

export interface ExecutionStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: unknown;
}

export interface ExecutionError {
  step: string;
  code: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
  resolution?: string;
}

// ============================================================================
// Cross-border Payment Types
// ============================================================================

export interface CrossBorderPayment extends Payment {
  corridor: PaymentCorridor;
  exchange: ExchangeDetails;
  routing: RoutingInfo;
  settlement: SettlementInfo;
  regulatory: RegulatoryInfo;
}

export interface PaymentCorridor {
  source: CorridorEndpoint;
  destination: CorridorEndpoint;
  name: string;
  supported: boolean;
  avgSettlementTime: number;
  avgFeePercent: number;
}

export interface CorridorEndpoint {
  country: string;
  currency: Currency;
  region: string;
  timezone: string;
}

export interface ExchangeDetails {
  provider: string;
  rate: string;
  rateType: 'spot' | 'locked' | 'estimated';
  lockedUntil?: Date;
  markup: string;
  sourceAmount: string;
  destinationAmount: string;
  quotedAt: Date;
}

export interface RoutingInfo {
  provider: string;
  method: 'direct' | 'correspondent' | 'crypto_rails' | 'hybrid';
  intermediaries: string[];
  estimatedTime: number;
  priority: 'standard' | 'express' | 'instant';
}

export interface SettlementInfo {
  status: 'pending' | 'in_transit' | 'arrived' | 'settled' | 'failed';
  expectedDate: Date;
  actualDate?: Date;
  confirmationNumber?: string;
  receivedAmount?: string;
}

export interface RegulatoryInfo {
  sourceCompliance: ComplianceStatus;
  destinationCompliance: ComplianceStatus;
  purposeCode: string;
  purposeDescription: string;
  documentsRequired: string[];
  documentsProvided: string[];
  approvals: RegulatoryApproval[];
}

export interface ComplianceStatus {
  status: 'compliant' | 'pending' | 'requires_action' | 'blocked';
  requirements: string[];
  completedRequirements: string[];
  blockers?: string[];
}

export interface RegulatoryApproval {
  authority: string;
  status: 'pending' | 'approved' | 'rejected';
  reference?: string;
  timestamp?: Date;
  expiresAt?: Date;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface PaymentAnalytics {
  period: AnalyticsPeriod;
  summary: AnalyticsSummary;
  volume: VolumeAnalytics;
  performance: PerformanceAnalytics;
  trends: TrendAnalytics;
  breakdown: BreakdownAnalytics;
  forecasts: ForecastAnalytics;
}

export interface AnalyticsPeriod {
  type: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  start: Date;
  end: Date;
  comparison?: AnalyticsPeriod;
}

export interface AnalyticsSummary {
  totalVolume: string;
  totalTransactions: number;
  avgTransactionSize: string;
  successRate: number;
  totalFees: string;
  netVolume: string;
  growth: number;
}

export interface VolumeAnalytics {
  byDay: { date: Date; volume: string; count: number }[];
  byCurrency: Record<string, string>;
  byMethod: Record<string, string>;
  byType: Record<string, string>;
  byCategory: Record<string, string>;
}

export interface PerformanceAnalytics {
  avgProcessingTime: number;
  medianProcessingTime: number;
  successRate: number;
  failureRate: number;
  refundRate: number;
  disputeRate: number;
  chargebackRate: number;
  failureReasons: { reason: string; count: number; percentage: number }[];
}

export interface TrendAnalytics {
  volumeTrend: 'increasing' | 'stable' | 'decreasing';
  transactionTrend: 'increasing' | 'stable' | 'decreasing';
  avgSizeTrend: 'increasing' | 'stable' | 'decreasing';
  seasonality: { period: string; factor: number }[];
  anomalies: { date: Date; metric: string; expected: number; actual: number }[];
}

export interface BreakdownAnalytics {
  topMerchants: { id: string; name: string; volume: string; count: number }[];
  topCategories: { category: string; volume: string; count: number }[];
  topCurrencies: { currency: Currency; volume: string; count: number }[];
  geographicDistribution: { country: string; volume: string; count: number }[];
}

export interface ForecastAnalytics {
  nextPeriod: {
    expectedVolume: string;
    expectedTransactions: number;
    confidence: number;
    range: { low: string; high: string };
  };
  projectedGrowth: number;
  riskFactors: string[];
}

// ============================================================================
// Security and Fraud Types
// ============================================================================

export interface FraudDetection {
  enabled: boolean;
  provider: string;
  rules: FraudRule[];
  mlModel: MLModelConfig;
  thresholds: FraudThresholds;
  actions: FraudAction[];
}

export interface FraudRule {
  id: string;
  name: string;
  type: 'velocity' | 'amount' | 'pattern' | 'location' | 'device' | 'behavior';
  condition: RuleCondition;
  action: 'flag' | 'review' | 'block' | 'challenge';
  score: number;
  enabled: boolean;
}

export interface MLModelConfig {
  enabled: boolean;
  modelId: string;
  version: string;
  threshold: number;
  features: string[];
  lastTrainedAt: Date;
  accuracy: number;
}

export interface FraudThresholds {
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  autoBlock: number;
  autoApprove: number;
}

export interface FraudAction {
  trigger: 'score_above' | 'rule_match' | 'ml_flag';
  threshold?: number;
  ruleId?: string;
  action: 'block' | 'review' | '3ds_challenge' | 'additional_verification' | 'notify' | 'flag' | 'challenge';
  parameters?: Record<string, unknown>;
}

export interface FraudAssessment {
  paymentId: string;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  signals: FraudSignal[];
  recommendation: 'approve' | 'review' | 'challenge' | 'decline';
  mlScore?: number;
  rulesTriggered: string[];
  assessedAt: Date;
}

export interface FraudSignal {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: Record<string, unknown>;
  score: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface PaymentsEvent {
  id: string;
  timestamp: Date;
  type: PaymentsEventType;
  resourceType: 'payment' | 'subscription' | 'merchant' | 'checkout' | 'agent' | 'spending';
  resourceId: string;
  action: string;
  actor: {
    type: 'user' | 'agent' | 'system' | 'merchant' | 'webhook';
    id: string;
  };
  data: unknown;
  metadata?: Record<string, unknown>;
}

export type PaymentsEventType =
  // Payment events
  | 'payment.created'
  | 'payment.authorized'
  | 'payment.captured'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.disputed'
  // Subscription events
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.renewed'
  | 'subscription.paused'
  | 'subscription.cancelled'
  | 'subscription.payment_failed'
  // Merchant events
  | 'merchant.created'
  | 'merchant.verified'
  | 'merchant.suspended'
  | 'merchant.payout'
  // Checkout events
  | 'checkout.created'
  | 'checkout.completed'
  | 'checkout.abandoned'
  // Agent events
  | 'agent.transaction'
  | 'agent.negotiation'
  | 'agent.procurement'
  // Spending events
  | 'spending.alert'
  | 'spending.limit_reached'
  | 'spending.optimization';

export type PaymentsEventCallback = (event: PaymentsEvent) => void;

// ============================================================================
// Configuration Types
// ============================================================================

export interface PaymentsConfig {
  gateway: GatewayConfig;
  subscriptions: SubscriptionsConfig;
  spending: SmartSpendingConfig;
  merchants: MerchantsConfig;
  agents: AgentsConfig;
  crossBorder: CrossBorderConfig;
  analytics: AnalyticsConfig;
  compliance: ComplianceConfigPayments;
  security: SecurityConfig;
}

export interface GatewayConfig {
  enabled: boolean;
  supportedCurrencies: Currency[];
  supportedMethods: PaymentMethod[];
  defaultCurrency: Currency;
  networkFeeMultiplier: number;
  platformFeePercent: number;
  escrowEnabled: boolean;
  maxTransactionAmount: string;
  authorizationTimeout: number;
}

export interface SubscriptionsConfig {
  enabled: boolean;
  trialEnabled: boolean;
  maxTrialDays: number;
  gracePeriodDays: number;
  maxRetries: number;
  retryInterval: number;
  dunningEnabled: boolean;
}

export interface SmartSpendingConfig {
  enabled: boolean;
  aiProvider: string;
  optimizationEnabled: boolean;
  autoApplyOptimizations: boolean;
  defaultBudgetPeriod: 'daily' | 'weekly' | 'monthly';
  alertsEnabled: boolean;
  maxAlertFrequency: number;
}

export interface MerchantsConfig {
  enabled: boolean;
  verificationRequired: boolean;
  minVerificationLevel: 'none' | 'basic' | 'verified';
  defaultFeePercent: number;
  payoutSchedule: 'instant' | 'daily' | 'weekly';
  holdPeriodDays: number;
}

export interface AgentsConfig {
  enabled: boolean;
  autonomousPayments: boolean;
  maxAutonomousAmount: string;
  negotiationEnabled: boolean;
  procurementEnabled: boolean;
  requireAudit: boolean;
  defaultAuthorizationType: 'delegated' | 'supervised';
}

export interface CrossBorderConfig {
  enabled: boolean;
  supportedCorridors: string[];
  defaultProvider: string;
  maxTransactionAmount: string;
  requireDocumentation: boolean;
  complianceLevel: ComplianceLevel;
}

export interface AnalyticsConfig {
  enabled: boolean;
  retention: number;
  realtimeEnabled: boolean;
  forecastingEnabled: boolean;
  aiInsightsEnabled: boolean;
}

export interface ComplianceConfigPayments {
  enabled: boolean;
  defaultLevel: ComplianceLevel;
  kycRequired: boolean;
  amlScreening: boolean;
  sanctionsChecking: boolean;
  transactionMonitoring: boolean;
  reportingEnabled: boolean;
}

export interface SecurityConfig {
  fraudDetection: boolean;
  mlFraudScoring: boolean;
  velocityChecking: boolean;
  deviceFingerprinting: boolean;
  challengeThreshold: number;
  autoBlockThreshold: number;
}
