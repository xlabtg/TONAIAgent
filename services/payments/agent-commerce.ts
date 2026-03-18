/**
 * TONAIAgent - Agent Commerce Framework
 *
 * Enables AI agents to perform autonomous transactions including price negotiation,
 * bulk purchasing, procurement, subscription management, and vendor management.
 */

import {
  AgentCommerceConfig,
  AgentCapability,
  AgentLimits,
  AgentAuthorization,
  AuthorizationScope,
  AgentCommercePreferences,
  AgentPerformance,
  AgentTransaction,
  AgentTransactionType,
  Negotiation,
  ProcurementOrder,
  ProcurementItem,
  VendorQuote,
  AgentDecision,
  ExecutionDetails,
  ExecutionStep,
  PaymentStatus,
  Currency,
  PaymentMethod,
  AgentsConfig,
  PaymentsEvent,
  PaymentsEventCallback,
} from './types';

// ============================================================================
// Agent Commerce Interface
// ============================================================================

export interface AgentCommerceManager {
  readonly config: AgentsConfig;

  // Agent configuration
  configureAgent(agentId: string, params: ConfigureAgentParams): Promise<AgentCommerceConfig>;
  updateAgentConfig(agentId: string, updates: Partial<AgentCommerceConfig>): Promise<AgentCommerceConfig>;
  getAgentConfig(agentId: string): Promise<AgentCommerceConfig | null>;
  disableAgent(agentId: string): Promise<void>;
  enableAgent(agentId: string): Promise<void>;

  // Authorization
  grantAuthorization(agentId: string, auth: GrantAuthorizationParams): Promise<AgentAuthorization>;
  revokeAuthorization(agentId: string): Promise<void>;
  checkAuthorization(agentId: string, transaction: AuthorizationCheck): Promise<AuthorizationResult>;
  updateLimits(agentId: string, limits: Partial<AgentLimits>): Promise<AgentLimits>;

  // Autonomous payments
  executePayment(agentId: string, params: ExecutePaymentParams): Promise<AgentTransaction>;
  schedulePayment(agentId: string, params: SchedulePaymentParams): Promise<AgentTransaction>;
  batchPayments(agentId: string, payments: ExecutePaymentParams[]): Promise<BatchPaymentResult>;

  // Negotiation
  initiateNegotiation(agentId: string, params: NegotiationParams): Promise<Negotiation>;
  submitOffer(negotiationId: string, offer: string): Promise<Negotiation>;
  respondToCounterOffer(negotiationId: string, accept: boolean): Promise<Negotiation>;
  completeNegotiation(negotiationId: string): Promise<AgentTransaction>;
  getNegotiationHistory(agentId: string): Promise<Negotiation[]>;

  // Procurement
  createProcurementOrder(agentId: string, params: ProcurementParams): Promise<ProcurementOrder>;
  requestQuotes(orderId: string, vendorIds: string[]): Promise<VendorQuote[]>;
  selectVendor(orderId: string, vendorId: string): Promise<ProcurementOrder>;
  confirmOrder(orderId: string): Promise<AgentTransaction>;
  trackOrder(orderId: string): Promise<OrderTrackingResult>;

  // Subscription management
  manageSubscription(agentId: string, action: SubscriptionAction): Promise<SubscriptionActionResult>;
  optimizeSubscriptions(agentId: string): Promise<SubscriptionOptimizationResult>;

  // Expense management
  processExpense(agentId: string, expense: ExpenseParams): Promise<AgentTransaction>;
  categorizeExpenses(agentId: string, transactionIds: string[]): Promise<ExpenseCategorizationResult[]>;
  generateExpenseReport(agentId: string, period: 'week' | 'month' | 'quarter'): Promise<ExpenseReport>;

  // Vendor management
  addVendor(agentId: string, vendor: VendorParams): Promise<Vendor>;
  removeVendor(agentId: string, vendorId: string): Promise<void>;
  listVendors(agentId: string): Promise<Vendor[]>;
  evaluateVendor(agentId: string, vendorId: string): Promise<VendorEvaluation>;

  // Performance and analytics
  getPerformance(agentId: string): Promise<AgentPerformance>;
  getTransactionHistory(agentId: string, filters?: TransactionFilters): Promise<AgentTransaction[]>;
  getDecisionExplanation(transactionId: string): Promise<AgentDecision>;

  // Events
  onEvent(callback: PaymentsEventCallback): void;
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface ConfigureAgentParams {
  ownerId?: string;
  name?: string;
  type?: string;
  capabilities: AgentCapability[];
  limits?: Partial<AgentLimits>;
  authorization?: Partial<AgentAuthorization>;
  preferences?: Partial<AgentCommercePreferences>;
}

export interface GrantAuthorizationParams {
  type: 'delegated' | 'autonomous' | 'supervised';
  delegatedBy?: string;
  scope: Partial<AuthorizationScope>;
  validUntil?: Date;
  revocable?: boolean;
  auditRequired?: boolean;
}

export interface AuthorizationCheck {
  amount: string;
  currency: Currency;
  merchantId: string;
  category?: string;
  type: AgentTransactionType;
}

export interface ExecutePaymentParams {
  recipientId: string;
  recipientAddress: string;
  amount: string;
  currency: Currency;
  method?: PaymentMethod;
  description?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface SchedulePaymentParams extends ExecutePaymentParams {
  executeAt: Date;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    endDate?: Date;
  };
}

export interface NegotiationParams {
  merchantId: string;
  merchantAddress: string;
  productId?: string;
  productName: string;
  initialPrice: string;
  targetPrice: string;
  currency: Currency;
  maxRounds?: number;
  deadline?: Date;
  strategy?: 'aggressive' | 'balanced' | 'conservative';
}

export interface ProcurementParams {
  items: Omit<ProcurementItem, 'productId'>[];
  budget?: string;
  currency: Currency;
  requiredBy?: Date;
  preferredVendors?: string[];
}

export interface SubscriptionAction {
  subscriptionId: string;
  action: 'pause' | 'resume' | 'cancel' | 'upgrade' | 'downgrade';
  planId?: string;
  reason?: string;
}

export interface ExpenseParams {
  amount: string;
  currency: Currency;
  recipientId: string;
  recipientAddress: string;
  category: string;
  description: string;
  receipt?: string;
  approvalRequired?: boolean;
}

export interface VendorParams {
  name: string;
  address: string;
  categories: string[];
  paymentTerms?: string;
  rating?: number;
  metadata?: Record<string, unknown>;
}

export interface TransactionFilters {
  status?: PaymentStatus;
  type?: AgentTransactionType;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: string;
  maxAmount?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Result Types
// ============================================================================

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  requiresApproval?: boolean;
  approvalType?: 'user' | 'guardian' | 'multi_sig';
  suggestions?: string[];
}

export interface BatchPaymentResult {
  successful: AgentTransaction[];
  failed: { params: ExecutePaymentParams; error: string }[];
  totalAmount: string;
  successRate: number;
}

export interface OrderTrackingResult {
  orderId: string;
  status: ProcurementOrder['status'];
  items: {
    productId: string;
    name: string;
    quantity: number;
    status: 'pending' | 'shipped' | 'delivered';
    trackingNumber?: string;
    estimatedDelivery?: Date;
  }[];
  lastUpdate: Date;
}

export interface SubscriptionActionResult {
  subscriptionId: string;
  action: string;
  success: boolean;
  message: string;
  newStatus?: string;
  effectiveDate?: Date;
}

export interface SubscriptionOptimizationResult {
  agentId: string;
  subscriptions: {
    subscriptionId: string;
    currentCost: string;
    recommendedPlan?: string;
    potentialSavings?: string;
    action?: string;
  }[];
  totalPotentialSavings: string;
  autoApplied: string[];
}

export interface ExpenseCategorizationResult {
  transactionId: string;
  category: string;
  subcategory?: string;
  confidence: number;
}

export interface ExpenseReport {
  agentId: string;
  period: string;
  startDate: Date;
  endDate: Date;
  totalExpenses: string;
  byCategory: { category: string; amount: string; percentage: number }[];
  byVendor: { vendorId: string; vendorName: string; amount: string }[];
  trends: { period: string; amount: string }[];
  anomalies: { transactionId: string; reason: string }[];
  recommendations: string[];
}

export interface Vendor {
  id: string;
  agentId: string;
  name: string;
  address: string;
  categories: string[];
  paymentTerms?: string;
  rating: number;
  totalSpent: string;
  transactionCount: number;
  lastTransaction?: Date;
  status: 'active' | 'inactive' | 'blocked';
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface VendorEvaluation {
  vendorId: string;
  overallScore: number;
  metrics: {
    priceCompetitiveness: number;
    deliveryReliability: number;
    qualityRating: number;
    responseTime: number;
    paymentTerms: number;
  };
  recommendation: 'preferred' | 'acceptable' | 'review' | 'avoid';
  insights: string[];
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAgentCommerceManager implements AgentCommerceManager {
  readonly config: AgentsConfig;

  private agentConfigs: Map<string, AgentCommerceConfig> = new Map();
  private transactions: Map<string, AgentTransaction> = new Map();
  private negotiations: Map<string, Negotiation> = new Map();
  private procurementOrders: Map<string, ProcurementOrder> = new Map();
  private vendors: Map<string, Vendor> = new Map();
  private eventCallbacks: PaymentsEventCallback[] = [];

  constructor(config?: Partial<AgentsConfig>) {
    this.config = {
      enabled: true,
      autonomousPayments: true,
      maxAutonomousAmount: '1000',
      negotiationEnabled: true,
      procurementEnabled: true,
      requireAudit: true,
      defaultAuthorizationType: 'supervised',
      ...config,
    };
  }

  // ============================================================================
  // Agent Configuration
  // ============================================================================

  async configureAgent(agentId: string, params: ConfigureAgentParams): Promise<AgentCommerceConfig> {
    const limits: AgentLimits = {
      maxTransactionAmount: this.config.maxAutonomousAmount,
      dailyLimit: (BigInt(this.config.maxAutonomousAmount) * BigInt(10)).toString(),
      monthlyLimit: (BigInt(this.config.maxAutonomousAmount) * BigInt(100)).toString(),
      maxNegotiationDiscount: 30,
      approvalRequired: [
        { amount: this.config.maxAutonomousAmount, requiresApproval: true, approverType: 'user' },
      ],
      blockedCategories: [],
      blockedMerchants: [],
      ...(params.limits || {}),
    };

    const authorization: AgentAuthorization = {
      type: this.config.defaultAuthorizationType,
      scope: {
        merchants: 'all',
        categories: 'all',
        currencies: 'all',
        maxAmount: limits.maxTransactionAmount,
        paymentTypes: ['one_time', 'scheduled'],
      },
      validFrom: new Date(),
      revocable: true,
      auditRequired: this.config.requireAudit,
      ...params.authorization,
    };

    const preferences: AgentCommercePreferences = {
      preferredPaymentMethod: 'ton_wallet',
      preferredCurrency: 'TON',
      negotiationStyle: 'balanced',
      autoOptimize: true,
      prioritizeCost: true,
      prioritizeSpeed: false,
      maxWaitTime: 300,
      ...params.preferences,
    };

    const agentConfig: AgentCommerceConfig = {
      agentId,
      enabled: true,
      capabilities: params.capabilities,
      limits,
      authorization,
      preferences,
      performance: {
        totalTransactions: 0,
        totalVolume: '0',
        avgSavings: 0,
        negotiationSuccessRate: 0,
        avgNegotiationSavings: 0,
        errorRate: 0,
        avgExecutionTime: 0,
      },
    };

    this.agentConfigs.set(agentId, agentConfig);
    return agentConfig;
  }

  async updateAgentConfig(agentId: string, updates: Partial<AgentCommerceConfig>): Promise<AgentCommerceConfig> {
    const config = await this.getAgentConfigOrThrow(agentId);

    const { agentId: _, ...allowedUpdates } = updates;
    Object.assign(config, allowedUpdates);

    return config;
  }

  async getAgentConfig(agentId: string): Promise<AgentCommerceConfig | null> {
    return this.agentConfigs.get(agentId) || null;
  }

  async disableAgent(agentId: string): Promise<void> {
    const config = await this.getAgentConfigOrThrow(agentId);
    config.enabled = false;
  }

  async enableAgent(agentId: string): Promise<void> {
    const config = await this.getAgentConfigOrThrow(agentId);
    config.enabled = true;
  }

  // ============================================================================
  // Authorization
  // ============================================================================

  async grantAuthorization(agentId: string, auth: GrantAuthorizationParams): Promise<AgentAuthorization> {
    const config = await this.getAgentConfigOrThrow(agentId);

    const authorization: AgentAuthorization = {
      type: auth.type,
      delegatedBy: auth.delegatedBy,
      scope: {
        merchants: 'all',
        categories: 'all',
        currencies: 'all',
        maxAmount: config.limits.maxTransactionAmount,
        paymentTypes: ['one_time'],
        ...auth.scope,
      },
      validFrom: new Date(),
      validUntil: auth.validUntil,
      revocable: auth.revocable ?? true,
      auditRequired: auth.auditRequired ?? true,
    };

    config.authorization = authorization;
    return authorization;
  }

  async revokeAuthorization(agentId: string): Promise<void> {
    const config = await this.getAgentConfigOrThrow(agentId);

    if (!config.authorization.revocable) {
      throw new Error('Authorization is not revocable');
    }

    config.enabled = false;
    config.authorization.validUntil = new Date();
  }

  async checkAuthorization(agentId: string, transaction: AuthorizationCheck): Promise<AuthorizationResult> {
    const config = await this.getAgentConfig(agentId);

    if (!config) {
      return {
        authorized: false,
        reason: 'Agent not configured',
      };
    }

    if (!config.enabled) {
      return {
        authorized: false,
        reason: 'Agent is disabled',
      };
    }

    const auth = config.authorization;

    // Check validity period
    if (auth.validUntil && auth.validUntil < new Date()) {
      return {
        authorized: false,
        reason: 'Authorization expired',
      };
    }

    // Check scope - merchants
    if (auth.scope.merchants !== 'all' && !auth.scope.merchants.includes(transaction.merchantId)) {
      return {
        authorized: false,
        reason: 'Merchant not in authorized scope',
      };
    }

    // Check scope - categories
    if (transaction.category && auth.scope.categories !== 'all' && !auth.scope.categories.includes(transaction.category)) {
      return {
        authorized: false,
        reason: 'Category not in authorized scope',
      };
    }

    // Check scope - currencies
    if (auth.scope.currencies !== 'all' && !auth.scope.currencies.includes(transaction.currency)) {
      return {
        authorized: false,
        reason: 'Currency not in authorized scope',
      };
    }

    // Check amount limits
    if (BigInt(transaction.amount) > BigInt(auth.scope.maxAmount)) {
      // Check if approval is required
      for (const threshold of config.limits.approvalRequired) {
        if (BigInt(transaction.amount) >= BigInt(threshold.amount) && threshold.requiresApproval) {
          return {
            authorized: true,
            requiresApproval: true,
            approvalType: threshold.approverType,
            reason: 'Amount exceeds autonomous limit',
          };
        }
      }

      return {
        authorized: false,
        reason: 'Amount exceeds maximum authorized amount',
      };
    }

    // Check blocked merchants
    if (config.limits.blockedMerchants.includes(transaction.merchantId)) {
      return {
        authorized: false,
        reason: 'Merchant is blocked',
      };
    }

    // Check blocked categories
    if (transaction.category && config.limits.blockedCategories.includes(transaction.category)) {
      return {
        authorized: false,
        reason: 'Category is blocked',
      };
    }

    return { authorized: true };
  }

  async updateLimits(agentId: string, limits: Partial<AgentLimits>): Promise<AgentLimits> {
    const config = await this.getAgentConfigOrThrow(agentId);

    Object.assign(config.limits, limits);
    return config.limits;
  }

  // ============================================================================
  // Autonomous Payments
  // ============================================================================

  async executePayment(agentId: string, params: ExecutePaymentParams): Promise<AgentTransaction> {
    const config = await this.getAgentConfigOrThrow(agentId);

    if (!config.capabilities.includes('autonomous_payment')) {
      throw new Error('Agent does not have autonomous_payment capability');
    }

    // Check authorization
    const authResult = await this.checkAuthorization(agentId, {
      amount: params.amount,
      currency: params.currency,
      merchantId: params.recipientId,
      category: params.category,
      type: 'direct_payment',
    });

    if (!authResult.authorized) {
      throw new Error(`Payment not authorized: ${authResult.reason}`);
    }

    const transactionId = this.generateId('atx');
    const startTime = Date.now();

    // Create decision record
    const decision = this.createDecision(params, config);

    // Execute payment
    const execution = await this.executeTransaction(params);

    const transaction: AgentTransaction = {
      id: transactionId,
      agentId,
      type: 'direct_payment',
      status: execution.steps.every(s => s.status === 'completed') ? 'completed' : 'failed',
      payment: {
        id: this.generateId('pay'),
        type: 'one_time',
        status: 'completed',
        method: params.method || config.preferences.preferredPaymentMethod,
        amount: params.amount,
        currency: params.currency,
        sender: { type: 'agent', id: agentId, address: '', verified: true },
        recipient: { type: 'merchant', id: params.recipientId, address: params.recipientAddress, verified: true },
        description: params.description,
        metadata: params.metadata || {},
        fees: { network: '0', platform: '0', total: '0', currency: params.currency, paidBy: 'sender' },
        compliance: { verified: true, level: 'standard', checks: [], riskScore: 0, flags: [] },
        audit: { events: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      },
      decision,
      execution,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    this.transactions.set(transactionId, transaction);

    // Update performance
    this.updatePerformance(config, transaction, startTime);

    this.emitEvent('agent.transaction', 'agent', agentId, 'payment_executed', transaction as unknown as Record<string, unknown>);

    return transaction;
  }

  async schedulePayment(agentId: string, params: SchedulePaymentParams): Promise<AgentTransaction> {
    const config = await this.getAgentConfigOrThrow(agentId);

    if (!config.capabilities.includes('autonomous_payment')) {
      throw new Error('Agent does not have autonomous_payment capability');
    }

    const transactionId = this.generateId('atx');

    const transaction: AgentTransaction = {
      id: transactionId,
      agentId,
      type: 'direct_payment',
      status: 'pending',
      decision: this.createDecision(params, config),
      execution: {
        startedAt: new Date(),
        steps: [
          { name: 'schedule', status: 'completed', completedAt: new Date() },
          { name: 'execute', status: 'pending' },
        ],
        retries: 0,
        errors: [],
      },
      createdAt: new Date(),
    };

    this.transactions.set(transactionId, transaction);

    // Schedule execution (in a real implementation, this would use a job queue)
    const delay = params.executeAt.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        const { executeAt, recurring, ...paymentParams } = params;
        await this.executePayment(agentId, paymentParams);
      }, delay);
    }

    return transaction;
  }

  async batchPayments(agentId: string, payments: ExecutePaymentParams[]): Promise<BatchPaymentResult> {
    const successful: AgentTransaction[] = [];
    const failed: { params: ExecutePaymentParams; error: string }[] = [];
    let totalAmount = BigInt(0);

    for (const params of payments) {
      try {
        const transaction = await this.executePayment(agentId, params);
        successful.push(transaction);
        totalAmount += BigInt(params.amount);
      } catch (error) {
        failed.push({
          params,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      successful,
      failed,
      totalAmount: totalAmount.toString(),
      successRate: payments.length > 0 ? (successful.length / payments.length) * 100 : 0,
    };
  }

  // ============================================================================
  // Negotiation
  // ============================================================================

  async initiateNegotiation(agentId: string, params: NegotiationParams): Promise<Negotiation> {
    const config = await this.getAgentConfigOrThrow(agentId);

    if (!config.capabilities.includes('negotiate_price')) {
      throw new Error('Agent does not have negotiate_price capability');
    }

    if (!this.config.negotiationEnabled) {
      throw new Error('Negotiation is disabled');
    }

    const negotiationId = this.generateId('neg');

    // Calculate initial offer based on strategy
    const initialOffer = this.calculateNegotiationOffer(
      params.initialPrice,
      params.targetPrice,
      params.strategy || config.preferences.negotiationStyle,
      0
    );

    const negotiation: Negotiation = {
      id: negotiationId,
      merchantId: params.merchantId,
      productId: params.productId,
      initialPrice: params.initialPrice,
      targetPrice: params.targetPrice,
      rounds: [
        {
          round: 1,
          agentOffer: initialOffer,
          timestamp: new Date(),
        },
      ],
      status: 'in_progress',
      strategy: params.strategy || config.preferences.negotiationStyle,
    };

    this.negotiations.set(negotiationId, negotiation);

    this.emitEvent('agent.negotiation', 'agent', agentId, 'negotiation_started', negotiation as unknown as Record<string, unknown>);

    return negotiation;
  }

  async submitOffer(negotiationId: string, offer: string): Promise<Negotiation> {
    const negotiation = await this.getNegotiationOrThrow(negotiationId);

    if (negotiation.status !== 'in_progress') {
      throw new Error(`Cannot submit offer for negotiation with status: ${negotiation.status}`);
    }

    const round = negotiation.rounds.length + 1;

    negotiation.rounds.push({
      round,
      agentOffer: offer,
      timestamp: new Date(),
    });

    return negotiation;
  }

  async respondToCounterOffer(negotiationId: string, accept: boolean): Promise<Negotiation> {
    const negotiation = await this.getNegotiationOrThrow(negotiationId);

    const lastRound = negotiation.rounds[negotiation.rounds.length - 1];

    if (accept && lastRound.merchantResponse) {
      lastRound.accepted = true;
      negotiation.status = 'accepted';
      negotiation.finalPrice = lastRound.merchantResponse;
      negotiation.savings = (BigInt(negotiation.initialPrice) - BigInt(negotiation.finalPrice)).toString();
    } else {
      // Calculate next offer
      const nextOffer = this.calculateNegotiationOffer(
        negotiation.initialPrice,
        negotiation.targetPrice,
        negotiation.strategy,
        negotiation.rounds.length
      );

      if (BigInt(nextOffer) >= BigInt(negotiation.initialPrice)) {
        // Can't improve offer, reject
        negotiation.status = 'rejected';
      } else {
        negotiation.rounds.push({
          round: negotiation.rounds.length + 1,
          agentOffer: nextOffer,
          timestamp: new Date(),
        });
      }
    }

    return negotiation;
  }

  async completeNegotiation(negotiationId: string): Promise<AgentTransaction> {
    const negotiation = await this.getNegotiationOrThrow(negotiationId);

    if (negotiation.status !== 'accepted') {
      throw new Error(`Cannot complete negotiation with status: ${negotiation.status}`);
    }

    // Execute the negotiated payment
    const transactionId = this.generateId('atx');

    const transaction: AgentTransaction = {
      id: transactionId,
      agentId: '', // Would be retrieved from negotiation context
      type: 'negotiated_purchase',
      status: 'completed',
      negotiation,
      decision: {
        reasoning: [
          `Negotiated price from ${negotiation.initialPrice} to ${negotiation.finalPrice}`,
          `Achieved savings of ${negotiation.savings}`,
        ],
        factors: [
          { name: 'price_reduction', weight: 0.6, value: negotiation.savings, impact: 'positive' },
        ],
        confidence: 0.9,
        alternatives: [],
        humanOverrideAllowed: true,
      },
      execution: {
        startedAt: new Date(),
        completedAt: new Date(),
        steps: [
          { name: 'negotiation', status: 'completed', completedAt: new Date() },
          { name: 'payment', status: 'completed', completedAt: new Date() },
        ],
        retries: 0,
        errors: [],
      },
      createdAt: new Date(),
      completedAt: new Date(),
    };

    this.transactions.set(transactionId, transaction);

    this.emitEvent('agent.negotiation', 'agent', '', 'negotiation_completed', { negotiation, transaction });

    return transaction;
  }

  async getNegotiationHistory(_agentId: string): Promise<Negotiation[]> {
    return Array.from(this.negotiations.values());
  }

  // ============================================================================
  // Procurement
  // ============================================================================

  async createProcurementOrder(agentId: string, params: ProcurementParams): Promise<ProcurementOrder> {
    const config = await this.getAgentConfigOrThrow(agentId);

    if (!config.capabilities.includes('procurement')) {
      throw new Error('Agent does not have procurement capability');
    }

    const orderId = this.generateId('po');

    const items: ProcurementItem[] = params.items.map((item, index) => ({
      ...item,
      productId: `prod_${index}`,
    }));

    const order: ProcurementOrder = {
      id: orderId,
      items,
      vendors: [],
      status: 'draft',
      totalAmount: '0',
      savingsFromOptimization: '0',
    };

    this.procurementOrders.set(orderId, order);

    this.emitEvent('agent.procurement', 'agent', config.agentId, 'order_created', order as unknown as Record<string, unknown>);

    return order;
  }

  async requestQuotes(orderId: string, vendorIds: string[]): Promise<VendorQuote[]> {
    const order = await this.getProcurementOrderOrThrow(orderId);

    order.status = 'sourcing';

    // Simulate getting quotes from vendors
    const quotes: VendorQuote[] = vendorIds.map(vendorId => {
      const vendor = this.vendors.get(vendorId);
      const basePrice = BigInt(Math.floor(Math.random() * 1000) + 100);

      return {
        vendorId,
        vendorName: vendor?.name || `Vendor ${vendorId}`,
        items: order.items.map(item => ({
          productId: item.productId,
          price: (basePrice * BigInt(item.quantity)).toString(),
          available: Math.random() > 0.1,
          deliveryDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        })),
        totalPrice: (basePrice * BigInt(order.items.reduce((sum, i) => sum + i.quantity, 0))).toString(),
        shippingCost: (BigInt(Math.floor(Math.random() * 50))).toString(),
        deliveryDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    });

    order.vendors = quotes;
    order.status = 'quoted';

    return quotes;
  }

  async selectVendor(orderId: string, vendorId: string): Promise<ProcurementOrder> {
    const order = await this.getProcurementOrderOrThrow(orderId);

    const selectedQuote = order.vendors.find(v => v.vendorId === vendorId);
    if (!selectedQuote) {
      throw new Error(`Vendor quote not found: ${vendorId}`);
    }

    order.selectedVendor = vendorId;
    order.totalAmount = (BigInt(selectedQuote.totalPrice) + BigInt(selectedQuote.shippingCost)).toString();
    order.status = 'ordered';

    // Calculate savings from optimization
    const maxPrice = order.vendors.reduce(
      (max, v) => BigInt(v.totalPrice) > BigInt(max) ? v.totalPrice : max,
      '0'
    );
    order.savingsFromOptimization = (BigInt(maxPrice) - BigInt(selectedQuote.totalPrice)).toString();

    return order;
  }

  async confirmOrder(orderId: string): Promise<AgentTransaction> {
    const order = await this.getProcurementOrderOrThrow(orderId);

    if (!order.selectedVendor) {
      throw new Error('No vendor selected');
    }

    const transactionId = this.generateId('atx');

    const transaction: AgentTransaction = {
      id: transactionId,
      agentId: '',
      type: 'bulk_order',
      status: 'completed',
      procurement: order,
      decision: {
        reasoning: [
          `Selected vendor ${order.selectedVendor} with best price`,
          `Saved ${order.savingsFromOptimization} through vendor comparison`,
        ],
        factors: [
          { name: 'price', weight: 0.5, value: order.totalAmount, impact: 'neutral' },
          { name: 'savings', weight: 0.3, value: order.savingsFromOptimization, impact: 'positive' },
        ],
        confidence: 0.85,
        alternatives: order.vendors.filter(v => v.vendorId !== order.selectedVendor).map(v => ({
          description: `Use ${v.vendorName}`,
          expectedOutcome: `Total cost: ${v.totalPrice}`,
          tradeoffs: [`Different delivery date: ${v.deliveryDate.toISOString()}`],
        })),
        humanOverrideAllowed: true,
      },
      execution: {
        startedAt: new Date(),
        completedAt: new Date(),
        steps: [
          { name: 'sourcing', status: 'completed', completedAt: new Date() },
          { name: 'quoting', status: 'completed', completedAt: new Date() },
          { name: 'selection', status: 'completed', completedAt: new Date() },
          { name: 'payment', status: 'completed', completedAt: new Date() },
        ],
        retries: 0,
        errors: [],
      },
      createdAt: new Date(),
      completedAt: new Date(),
    };

    this.transactions.set(transactionId, transaction);

    return transaction;
  }

  async trackOrder(orderId: string): Promise<OrderTrackingResult> {
    const order = await this.getProcurementOrderOrThrow(orderId);

    return {
      orderId,
      status: order.status,
      items: order.items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        status: order.status === 'completed' ? 'delivered' : 'pending',
      })),
      lastUpdate: new Date(),
    };
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  async manageSubscription(agentId: string, action: SubscriptionAction): Promise<SubscriptionActionResult> {
    const config = await this.getAgentConfigOrThrow(agentId);

    if (!config.capabilities.includes('subscription_management')) {
      throw new Error('Agent does not have subscription_management capability');
    }

    // Simulate subscription action
    return {
      subscriptionId: action.subscriptionId,
      action: action.action,
      success: true,
      message: `Subscription ${action.action} successful`,
      effectiveDate: new Date(),
    };
  }

  async optimizeSubscriptions(agentId: string): Promise<SubscriptionOptimizationResult> {
    await this.getAgentConfigOrThrow(agentId);

    // Simulate subscription optimization
    return {
      agentId,
      subscriptions: [],
      totalPotentialSavings: '0',
      autoApplied: [],
    };
  }

  // ============================================================================
  // Expense Management
  // ============================================================================

  async processExpense(agentId: string, expense: ExpenseParams): Promise<AgentTransaction> {
    await this.getAgentConfigOrThrow(agentId);

    const authResult = await this.checkAuthorization(agentId, {
      amount: expense.amount,
      currency: expense.currency,
      merchantId: expense.recipientId,
      category: expense.category,
      type: 'expense_payment',
    });

    if (!authResult.authorized && expense.approvalRequired) {
      throw new Error(`Expense not authorized: ${authResult.reason}`);
    }

    return this.executePayment(agentId, {
      recipientId: expense.recipientId,
      recipientAddress: expense.recipientAddress,
      amount: expense.amount,
      currency: expense.currency,
      description: expense.description,
      category: expense.category,
    });
  }

  async categorizeExpenses(_agentId: string, transactionIds: string[]): Promise<ExpenseCategorizationResult[]> {
    const results: ExpenseCategorizationResult[] = [];

    for (const transactionId of transactionIds) {
      const transaction = this.transactions.get(transactionId);
      if (transaction) {
        results.push({
          transactionId,
          category: 'General',
          confidence: 0.8,
        });
      }
    }

    return results;
  }

  async generateExpenseReport(agentId: string, period: 'week' | 'month' | 'quarter'): Promise<ExpenseReport> {
    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }

    const transactions = Array.from(this.transactions.values())
      .filter(t => t.agentId === agentId && t.createdAt >= startDate);

    const totalExpenses = transactions.reduce((sum, t) => {
      if (t.payment) {
        return (BigInt(sum) + BigInt(t.payment.amount)).toString();
      }
      return sum;
    }, '0');

    return {
      agentId,
      period,
      startDate,
      endDate: now,
      totalExpenses,
      byCategory: [],
      byVendor: [],
      trends: [],
      anomalies: [],
      recommendations: ['Consider consolidating vendor payments for better rates'],
    };
  }

  // ============================================================================
  // Vendor Management
  // ============================================================================

  async addVendor(agentId: string, params: VendorParams): Promise<Vendor> {
    await this.getAgentConfigOrThrow(agentId);

    const vendorId = this.generateId('vnd');

    const vendor: Vendor = {
      id: vendorId,
      agentId,
      name: params.name,
      address: params.address,
      categories: params.categories,
      paymentTerms: params.paymentTerms,
      rating: params.rating || 0,
      totalSpent: '0',
      transactionCount: 0,
      status: 'active',
      metadata: params.metadata || {},
      createdAt: new Date(),
    };

    this.vendors.set(vendorId, vendor);

    return vendor;
  }

  async removeVendor(agentId: string, vendorId: string): Promise<void> {
    const vendor = this.vendors.get(vendorId);
    if (vendor && vendor.agentId === agentId) {
      vendor.status = 'inactive';
    }
  }

  async listVendors(agentId: string): Promise<Vendor[]> {
    return Array.from(this.vendors.values())
      .filter(v => v.agentId === agentId && v.status === 'active');
  }

  async evaluateVendor(_agentId: string, vendorId: string): Promise<VendorEvaluation> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    // Simulate vendor evaluation
    const metrics = {
      priceCompetitiveness: 0.75 + Math.random() * 0.25,
      deliveryReliability: 0.8 + Math.random() * 0.2,
      qualityRating: 0.7 + Math.random() * 0.3,
      responseTime: 0.6 + Math.random() * 0.4,
      paymentTerms: 0.7 + Math.random() * 0.3,
    };

    const overallScore = Object.values(metrics).reduce((sum, m) => sum + m, 0) / 5;

    let recommendation: VendorEvaluation['recommendation'];
    if (overallScore > 0.85) recommendation = 'preferred';
    else if (overallScore > 0.7) recommendation = 'acceptable';
    else if (overallScore > 0.5) recommendation = 'review';
    else recommendation = 'avoid';

    return {
      vendorId,
      overallScore,
      metrics,
      recommendation,
      insights: [
        overallScore > 0.8 ? 'Strong overall performance' : 'Room for improvement',
        `Transaction count: ${vendor.transactionCount}`,
      ],
    };
  }

  // ============================================================================
  // Performance and Analytics
  // ============================================================================

  async getPerformance(agentId: string): Promise<AgentPerformance> {
    const config = await this.getAgentConfigOrThrow(agentId);
    return config.performance;
  }

  async getTransactionHistory(agentId: string, filters?: TransactionFilters): Promise<AgentTransaction[]> {
    let transactions = Array.from(this.transactions.values())
      .filter(t => t.agentId === agentId);

    if (filters) {
      if (filters.status) {
        transactions = transactions.filter(t => t.status === filters.status);
      }
      if (filters.type) {
        transactions = transactions.filter(t => t.type === filters.type);
      }
      if (filters.fromDate) {
        transactions = transactions.filter(t => t.createdAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        transactions = transactions.filter(t => t.createdAt <= filters.toDate!);
      }
    }

    return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getDecisionExplanation(transactionId: string): Promise<AgentDecision> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }
    return transaction.decision;
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

  private async getAgentConfigOrThrow(agentId: string): Promise<AgentCommerceConfig> {
    const config = await this.getAgentConfig(agentId);
    if (!config) {
      throw new Error(`Agent not configured: ${agentId}`);
    }
    return config;
  }

  private async getNegotiationOrThrow(negotiationId: string): Promise<Negotiation> {
    const negotiation = this.negotiations.get(negotiationId);
    if (!negotiation) {
      throw new Error(`Negotiation not found: ${negotiationId}`);
    }
    return negotiation;
  }

  private async getProcurementOrderOrThrow(orderId: string): Promise<ProcurementOrder> {
    const order = this.procurementOrders.get(orderId);
    if (!order) {
      throw new Error(`Procurement order not found: ${orderId}`);
    }
    return order;
  }

  private createDecision(params: ExecutePaymentParams, config: AgentCommerceConfig): AgentDecision {
    return {
      reasoning: [
        `Payment of ${params.amount} ${params.currency} to ${params.recipientId}`,
        `Within authorized limits (max: ${config.limits.maxTransactionAmount})`,
        params.description || 'No description provided',
      ],
      factors: [
        { name: 'amount', weight: 0.3, value: params.amount, impact: 'neutral' },
        { name: 'authorization', weight: 0.4, value: 'authorized', impact: 'positive' },
        { name: 'urgency', weight: 0.3, value: 'normal', impact: 'neutral' },
      ],
      confidence: 0.95,
      alternatives: [],
      humanOverrideAllowed: true,
    };
  }

  private async executeTransaction(_params: ExecutePaymentParams): Promise<ExecutionDetails> {
    const startedAt = new Date();

    const steps: ExecutionStep[] = [
      { name: 'validate', status: 'completed', startedAt, completedAt: new Date() },
      { name: 'authorize', status: 'completed', startedAt: new Date(), completedAt: new Date() },
      { name: 'execute', status: 'completed', startedAt: new Date(), completedAt: new Date() },
      { name: 'confirm', status: 'completed', startedAt: new Date(), completedAt: new Date() },
    ];

    return {
      startedAt,
      completedAt: new Date(),
      steps,
      retries: 0,
      errors: [],
    };
  }

  private updatePerformance(config: AgentCommerceConfig, transaction: AgentTransaction, startTime: number): void {
    const perf = config.performance;

    perf.totalTransactions++;

    if (transaction.payment) {
      perf.totalVolume = (BigInt(perf.totalVolume) + BigInt(transaction.payment.amount)).toString();
    }

    perf.avgExecutionTime = (perf.avgExecutionTime * (perf.totalTransactions - 1) + (Date.now() - startTime)) / perf.totalTransactions;

    if (transaction.status === 'failed') {
      perf.errorRate = ((perf.errorRate * (perf.totalTransactions - 1)) + 1) / perf.totalTransactions;
    } else {
      perf.errorRate = (perf.errorRate * (perf.totalTransactions - 1)) / perf.totalTransactions;
    }
  }

  private calculateNegotiationOffer(
    initialPrice: string,
    targetPrice: string,
    strategy: string,
    round: number
  ): string {
    const initial = BigInt(initialPrice);
    const target = BigInt(targetPrice);
    const range = initial - target;

    let discount: bigint;

    switch (strategy) {
      case 'aggressive':
        discount = range * BigInt(50 + round * 15) / BigInt(100);
        break;
      case 'conservative':
        discount = range * BigInt(20 + round * 10) / BigInt(100);
        break;
      default: // balanced
        discount = range * BigInt(35 + round * 12) / BigInt(100);
    }

    const offer = initial - discount;
    return (offer > target ? offer : target).toString();
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
      actor: { type: 'agent', id: resourceId },
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

export function createAgentCommerceManager(config?: Partial<AgentsConfig>): DefaultAgentCommerceManager {
  return new DefaultAgentCommerceManager(config);
}
