/**
 * TONAIAgent - AI-native Payments and Commerce Layer
 *
 * Comprehensive payments infrastructure enabling autonomous financial operations
 * for AI agents, merchants, and users in the TON ecosystem.
 *
 * Features:
 * - Autonomous Payments (scheduled, conditional, escrow, split)
 * - Smart Subscriptions with AI-driven optimization
 * - Intelligent Spending with budget management
 * - Merchant Infrastructure (SDK, checkout, dashboard)
 * - Agent-Driven Commerce (negotiations, procurement, B2B)
 * - Cross-Border Payments with currency optimization
 * - Financial Insights and Analytics
 * - Compliance and Security (KYC/AML, fraud detection)
 *
 * @example
 * ```typescript
 * import {
 *   createPaymentsManager,
 *   PaymentsConfig,
 * } from '@tonaiagent/core/payments';
 *
 * // Create the payments manager
 * const payments = createPaymentsManager();
 *
 * // Process a payment
 * const payment = await payments.gateway.createPayment({
 *   type: 'one_time',
 *   method: { type: 'ton_wallet', walletAddress: 'EQ...' },
 *   amount: '1000000000',
 *   currency: 'TON',
 *   sender: { id: 'user-1' },
 *   recipient: { id: 'merchant-1' },
 *   description: 'Product purchase',
 * });
 * ```
 */

// ============================================================================
// Export all types
// ============================================================================
export * from './types';

// ============================================================================
// Export Payment Gateway
// ============================================================================
export {
  DefaultPaymentGateway,
  createPaymentGateway,
  type PaymentGateway,
  type CreatePaymentParams,
  type SchedulePaymentParams,
  type ConditionalPaymentParams,
  type SplitPaymentParams,
  type EscrowPaymentParams,
  type PaymentFilters,
  type PaymentListResult,
  type RefundResult,
  type ConditionEvaluationResult,
  type DisputeResult,
  type PaymentEstimate,
} from './payment-gateway';

// ============================================================================
// Export Subscription Engine
// ============================================================================
export {
  DefaultSubscriptionEngine,
  createSubscriptionEngine,
  type SubscriptionEngine,
  type CreatePlanParams,
  type CreateSubscriptionParams,
  type BillingResult,
  type UsageReport,
  type SubscriptionListResult,
  type RenewalResult,
  type PlanChangeResult,
  type SubscriptionOptimization,
} from './subscription-engine';

// ============================================================================
// Export Smart Spending Manager
// ============================================================================
export {
  DefaultSmartSpendingManager,
  createSmartSpendingManager,
  type SmartSpendingManager,
  type CreateProfileParams as SmartSpendingCreateProfileParams,
  type CreateRuleParams as SmartSpendingCreateRuleParams,
  type CreateAlertParams as SmartSpendingCreateAlertParams,
  type BudgetStatus,
  type PaymentAnalysis,
  type CategoryResult,
  type LimitCheckResult,
  type SpendingTrends,
  type BudgetComparison,
  type RuleEvaluationResult as SmartSpendingRuleEvaluationResult,
} from './smart-spending';

// ============================================================================
// Export Merchant Infrastructure
// ============================================================================
export {
  DefaultMerchantInfrastructure,
  createMerchantInfrastructure,
  type MerchantInfrastructure,
  type RegisterMerchantParams,
  type MerchantFilters,
  type VerificationDocument,
  type CreateApiKeyParams,
  type CreateWebhookParams,
  type CreateCheckoutParams,
  type CreateProductParams,
  type ProductFilters,
  type PayoutRequest,
  type MerchantListResult,
  type VerificationResult,
  type ApiKeyResult,
  type WebhookTestResult,
  type Product,
  type RevenueReport,
  type Payout,
} from './merchant-infrastructure';

// ============================================================================
// Export Agent Commerce Manager
// ============================================================================
export {
  DefaultAgentCommerceManager,
  createAgentCommerceManager,
  type AgentCommerceManager,
  type ConfigureAgentParams,
  type GrantAuthorizationParams,
  type AuthorizationCheck,
  type ExecutePaymentParams,
  type NegotiationParams,
  type ProcurementParams,
  type SubscriptionAction,
  type ExpenseParams,
  type VendorParams,
  type TransactionFilters,
  type AuthorizationResult,
  type BatchPaymentResult,
  type OrderTrackingResult,
  type SubscriptionActionResult,
  type ExpenseCategorizationResult,
  type ExpenseReport,
  type Vendor,
  type VendorEvaluation,
} from './agent-commerce';

// ============================================================================
// Export Cross-Border Payments Manager
// ============================================================================
export {
  DefaultCrossBorderPaymentsManager,
  createCrossBorderPaymentsManager,
  type CrossBorderPaymentsManager,
  type ExchangeRateParams,
  type CreateCrossBorderParams,
  type ComplianceCheckParams,
  type DocumentSubmission,
  type RouteOptimizationParams,
  type FeeEstimationParams,
  type CrossBorderFilters,
  type ExchangeQuote,
  type LockedRate,
  type PaymentTrackingResult,
  type SettlementResult,
  type ComplianceResult,
  type RouteOption,
  type FeeEstimate,
  type CorridorAnalytics,
} from './cross-border';

// ============================================================================
// Export Payment Analytics Engine
// ============================================================================
export {
  DefaultPaymentAnalyticsEngine,
  createPaymentAnalyticsEngine,
  type PaymentAnalyticsEngine,
  type PeriodParams,
  type ForecastHorizon,
  type ReportParams,
  type ReportSection,
  type ScheduledReportParams,
  type ExportParams,
  type AnomalyDetectionResult,
  type Anomaly,
  type SpendingPatterns,
  type CashFlowPrediction,
  type BudgetEstimate,
  type PaymentInsight,
  type InsightType,
  type AnalyticsReport,
  type ChartData,
  type PeriodComparison,
  type BenchmarkResult,
  type RealTimeMetrics,
  type ExportResult,
} from './analytics';

// ============================================================================
// Export Compliance and Security Manager
// ============================================================================
export {
  DefaultComplianceSecurityManager,
  createComplianceSecurityManager,
  type ComplianceSecurityManager,
  type KYCParams,
  type KYCDocument,
  type AMLScreeningParams,
  type SanctionsParams,
  type PolicyParams,
  type PolicyType,
  type PolicyRule,
  type RiskScoreParams,
  type AuditFilters,
  type TransactionFlag,
  type ReviewDecision,
  type KYCSession,
  type KYCResult,
  type ComplianceCheckResult,
  type AMLResult,
  type SanctionsResult,
  type VelocityCheckResult,
  type FraudMetrics,
  type MonitoringResult,
  type CompliancePolicy,
  type PolicyEvaluationResult,
  type RiskScore,
  type RiskProfile,
  type ComplianceReport,
} from './compliance-security';

// ============================================================================
// Import Components for Unified Manager
// ============================================================================

import { DefaultPaymentGateway, createPaymentGateway } from './payment-gateway';
import { DefaultSubscriptionEngine, createSubscriptionEngine } from './subscription-engine';
import { DefaultSmartSpendingManager, createSmartSpendingManager } from './smart-spending';
import { DefaultMerchantInfrastructure, createMerchantInfrastructure } from './merchant-infrastructure';
import { DefaultAgentCommerceManager, createAgentCommerceManager } from './agent-commerce';
import { DefaultCrossBorderPaymentsManager, createCrossBorderPaymentsManager } from './cross-border';
import { DefaultPaymentAnalyticsEngine, createPaymentAnalyticsEngine } from './analytics';
import { DefaultComplianceSecurityManager, createComplianceSecurityManager } from './compliance-security';
import {
  PaymentsConfig,
  PaymentsEvent,
  PaymentsEventCallback,
} from './types';

// ============================================================================
// Unified Payments Manager Interface
// ============================================================================

export interface PaymentsManager {
  readonly enabled: boolean;
  readonly gateway: DefaultPaymentGateway;
  readonly subscriptions: DefaultSubscriptionEngine;
  readonly smartSpending: DefaultSmartSpendingManager;
  readonly merchants: DefaultMerchantInfrastructure;
  readonly agentCommerce: DefaultAgentCommerceManager;
  readonly crossBorder: DefaultCrossBorderPaymentsManager;
  readonly analytics: DefaultPaymentAnalyticsEngine;
  readonly compliance: DefaultComplianceSecurityManager;

  // Health check
  getHealth(): Promise<PaymentsHealth>;

  // Statistics
  getStats(): Promise<PaymentsStats>;

  // Events
  onEvent(callback: PaymentsEventCallback): void;
}

export interface PaymentsHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    gateway: boolean;
    subscriptions: boolean;
    smartSpending: boolean;
    merchants: boolean;
    agentCommerce: boolean;
    crossBorder: boolean;
    analytics: boolean;
    compliance: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export interface PaymentsStats {
  totalPaymentsProcessed: number;
  totalVolume: bigint;
  activeSubscriptions: number;
  activeMerchants: number;
  activeAgents: number;
  crossBorderTransactions: number;
  fraudDetected: number;
  complianceScore: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultPaymentsManager implements PaymentsManager {
  readonly enabled: boolean;
  readonly gateway: DefaultPaymentGateway;
  readonly subscriptions: DefaultSubscriptionEngine;
  readonly smartSpending: DefaultSmartSpendingManager;
  readonly merchants: DefaultMerchantInfrastructure;
  readonly agentCommerce: DefaultAgentCommerceManager;
  readonly crossBorder: DefaultCrossBorderPaymentsManager;
  readonly analytics: DefaultPaymentAnalyticsEngine;
  readonly compliance: DefaultComplianceSecurityManager;

  private readonly eventCallbacks: PaymentsEventCallback[] = [];

  constructor(config?: Partial<PaymentsConfig>) {
    this.enabled = true;

    // Initialize all components
    this.gateway = createPaymentGateway(config?.gateway);
    this.subscriptions = createSubscriptionEngine(config?.subscriptions);
    this.smartSpending = createSmartSpendingManager(config?.spending);
    this.merchants = createMerchantInfrastructure(config?.merchants);
    this.agentCommerce = createAgentCommerceManager(config?.agents);
    this.crossBorder = createCrossBorderPaymentsManager(config?.crossBorder);
    this.analytics = createPaymentAnalyticsEngine(config?.analytics);
    this.compliance = createComplianceSecurityManager(config?.security);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<PaymentsHealth> {
    const components = {
      gateway: this.gateway.config.enabled,
      subscriptions: this.subscriptions.config.enabled,
      smartSpending: this.smartSpending.config.enabled,
      merchants: this.merchants.config.enabled,
      agentCommerce: this.agentCommerce.config.enabled,
      crossBorder: this.crossBorder.config.enabled,
      analytics: this.analytics.config.enabled,
      compliance: true, // Compliance is always enabled if initialized
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: PaymentsHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      lastCheck: new Date(),
      details: {
        gatewayEnabled: this.gateway.config.enabled,
        subscriptionsEnabled: this.subscriptions.config.enabled,
        smartSpendingEnabled: this.smartSpending.config.enabled,
        merchantsEnabled: this.merchants.config.enabled,
        agentCommerceEnabled: this.agentCommerce.config.enabled,
        crossBorderEnabled: this.crossBorder.config.enabled,
        analyticsEnabled: this.analytics.config.enabled,
        supportedCurrencies: this.gateway.config.supportedCurrencies,
        defaultCurrency: this.gateway.config.defaultCurrency,
      },
    };
  }

  async getStats(): Promise<PaymentsStats> {
    // In a real implementation, these would be aggregated from actual data
    return {
      totalPaymentsProcessed: 0,
      totalVolume: BigInt(0),
      activeSubscriptions: 0,
      activeMerchants: 0,
      activeAgents: 0,
      crossBorderTransactions: 0,
      fraudDetected: 0,
      complianceScore: 100,
    };
  }

  onEvent(callback: PaymentsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: PaymentsEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.gateway.onEvent(forwardEvent);
    this.subscriptions.onEvent(forwardEvent);
    this.smartSpending.onEvent(forwardEvent);
    this.merchants.onEvent(forwardEvent);
    this.agentCommerce.onEvent(forwardEvent);
    this.crossBorder.onEvent(forwardEvent);
    this.analytics.onEvent(forwardEvent);
    this.compliance.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPaymentsManager(
  config?: Partial<PaymentsConfig>
): DefaultPaymentsManager {
  return new DefaultPaymentsManager(config);
}

// Default export
export default DefaultPaymentsManager;
