/**
 * TONAIAgent - Merchant Infrastructure
 *
 * Comprehensive merchant platform enabling payment acceptance, checkout sessions,
 * product management, dashboard analytics, and business tools.
 */

import {
  Merchant,
  MerchantType,
  MerchantStatus,
  MerchantVerification,
  MerchantProfile,
  MerchantSettings,
  MerchantIntegration,
  MerchantAnalytics,
  MerchantCompliance,
  CheckoutSession,
  LineItem,
  CheckoutCustomer,
  CheckoutTotals,
  Currency,
  PaymentMethod,
  MerchantsConfig,
  PaymentsEvent,
  PaymentsEventCallback,
  WebhookConfig,
  ApiKey,
} from './types';

// ============================================================================
// Merchant Infrastructure Interface
// ============================================================================

export interface MerchantInfrastructure {
  readonly config: MerchantsConfig;

  // Merchant lifecycle
  registerMerchant(params: RegisterMerchantParams): Promise<Merchant>;
  updateMerchant(merchantId: string, updates: Partial<Merchant>): Promise<Merchant>;
  getMerchant(merchantId: string): Promise<Merchant | null>;
  listMerchants(filters?: MerchantFilters): Promise<MerchantListResult>;
  suspendMerchant(merchantId: string, reason: string): Promise<Merchant>;
  reactivateMerchant(merchantId: string): Promise<Merchant>;

  // Verification
  submitVerification(merchantId: string, documents: VerificationDocument[]): Promise<VerificationResult>;
  getVerificationStatus(merchantId: string): Promise<MerchantVerification>;
  requestVerificationUpgrade(merchantId: string, targetLevel: string): Promise<VerificationResult>;

  // Settings
  updateSettings(merchantId: string, settings: Partial<MerchantSettings>): Promise<Merchant>;
  addPaymentMethod(merchantId: string, method: PaymentMethod): Promise<Merchant>;
  removePaymentMethod(merchantId: string, method: PaymentMethod): Promise<Merchant>;

  // API Management
  createApiKey(merchantId: string, params: CreateApiKeyParams): Promise<ApiKeyResult>;
  revokeApiKey(merchantId: string, keyId: string): Promise<void>;
  listApiKeys(merchantId: string): Promise<ApiKey[]>;
  rotateApiKey(merchantId: string, keyId: string): Promise<ApiKeyResult>;

  // Webhooks
  createWebhook(merchantId: string, params: CreateWebhookParams): Promise<WebhookConfig>;
  updateWebhook(merchantId: string, webhookId: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig>;
  deleteWebhook(merchantId: string, webhookId: string): Promise<void>;
  listWebhooks(merchantId: string): Promise<WebhookConfig[]>;
  testWebhook(merchantId: string, webhookId: string): Promise<WebhookTestResult>;

  // Checkout
  createCheckoutSession(merchantId: string, params: CreateCheckoutParams): Promise<CheckoutSession>;
  getCheckoutSession(sessionId: string): Promise<CheckoutSession | null>;
  expireCheckoutSession(sessionId: string): Promise<CheckoutSession>;
  completeCheckoutSession(sessionId: string, paymentId: string): Promise<CheckoutSession>;

  // Products (for checkout)
  createProduct(merchantId: string, product: CreateProductParams): Promise<Product>;
  updateProduct(merchantId: string, productId: string, updates: Partial<Product>): Promise<Product>;
  deleteProduct(merchantId: string, productId: string): Promise<void>;
  listProducts(merchantId: string, filters?: ProductFilters): Promise<Product[]>;

  // Analytics
  getAnalytics(merchantId: string, period: AnalyticsPeriod): Promise<MerchantAnalytics>;
  getRevenueReport(merchantId: string, period: AnalyticsPeriod): Promise<RevenueReport>;
  getTransactionReport(merchantId: string, period: AnalyticsPeriod): Promise<TransactionReport>;

  // Payouts
  requestPayout(merchantId: string, params: PayoutRequest): Promise<Payout>;
  getPayoutHistory(merchantId: string): Promise<Payout[]>;
  getPayoutSchedule(merchantId: string): Promise<PayoutSchedule>;
  updatePayoutSchedule(merchantId: string, schedule: Partial<PayoutSchedule>): Promise<PayoutSchedule>;

  // Events
  onEvent(callback: PaymentsEventCallback): void;
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface RegisterMerchantParams {
  name: string;
  displayName?: string;
  type: MerchantType;
  email: string;
  profile?: Partial<MerchantProfile>;
  currencies?: Currency[];
  paymentMethods?: PaymentMethod[];
  metadata?: Record<string, unknown>;
}

export interface MerchantFilters {
  status?: MerchantStatus;
  type?: MerchantType;
  verificationLevel?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface VerificationDocument {
  type: 'business_license' | 'tax_id' | 'identity' | 'address_proof' | 'bank_statement' | 'other';
  documentId: string;
  url?: string;
  content?: string;
  expiryDate?: Date;
}

export interface CreateApiKeyParams {
  name: string;
  permissions: string[];
  expiresAt?: Date;
}

export interface CreateWebhookParams {
  url: string;
  events: string[];
  enabled?: boolean;
}

export interface CreateCheckoutParams {
  mode: 'payment' | 'subscription' | 'setup';
  lineItems: Omit<LineItem, 'id' | 'totalPrice'>[];
  customer?: Partial<CheckoutCustomer>;
  currency?: Currency;
  successUrl: string;
  cancelUrl: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
  subscriptionPlanId?: string;
}

export interface CreateProductParams {
  name: string;
  description?: string;
  images?: string[];
  price: string;
  currency: Currency;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ProductFilters {
  active?: boolean;
  type?: 'one_time' | 'recurring';
  limit?: number;
  offset?: number;
}

export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface PayoutRequest {
  amount?: string;
  currency?: Currency;
  destination: string;
  description?: string;
}

// ============================================================================
// Result Types
// ============================================================================

export interface MerchantListResult {
  merchants: Merchant[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface VerificationResult {
  merchantId: string;
  status: 'pending' | 'approved' | 'rejected';
  level: string;
  message?: string;
  requiredDocuments?: string[];
  estimatedReviewTime?: string;
}

export interface ApiKeyResult {
  key: ApiKey;
  secret: string;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
  latency: number;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  images: string[];
  price: string;
  currency: Currency;
  active: boolean;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
  };
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueReport {
  merchantId: string;
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  totalRevenue: string;
  netRevenue: string;
  fees: string;
  refunds: string;
  currency: Currency;
  byDay: { date: Date; revenue: string; transactions: number }[];
  byProduct: { productId: string; name: string; revenue: string; quantity: number }[];
  comparison?: {
    previousPeriodRevenue: string;
    change: number;
    changePercent: number;
  };
}

export interface TransactionReport {
  merchantId: string;
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
  averageTransactionValue: string;
  byStatus: { status: string; count: number; amount: string }[];
  byMethod: { method: PaymentMethod; count: number; amount: string }[];
  byHour: { hour: number; count: number; amount: string }[];
}

export interface Payout {
  id: string;
  merchantId: string;
  amount: string;
  currency: Currency;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  destination: string;
  description?: string;
  fees: string;
  netAmount: string;
  createdAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

export interface PayoutSchedule {
  merchantId: string;
  frequency: 'instant' | 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  minimumAmount: string;
  holdPeriodDays: number;
  nextPayoutDate?: Date;
  enabled: boolean;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultMerchantInfrastructure implements MerchantInfrastructure {
  readonly config: MerchantsConfig;

  private merchants: Map<string, Merchant> = new Map();
  private checkoutSessions: Map<string, CheckoutSession> = new Map();
  private products: Map<string, Product> = new Map();
  private payouts: Map<string, Payout> = new Map();
  private payoutSchedules: Map<string, PayoutSchedule> = new Map();
  private eventCallbacks: PaymentsEventCallback[] = [];

  constructor(config?: Partial<MerchantsConfig>) {
    this.config = {
      enabled: true,
      verificationRequired: true,
      minVerificationLevel: 'basic',
      defaultFeePercent: 2.5,
      payoutSchedule: 'daily',
      holdPeriodDays: 2,
      ...config,
    };
  }

  // ============================================================================
  // Merchant Lifecycle
  // ============================================================================

  async registerMerchant(params: RegisterMerchantParams): Promise<Merchant> {
    const merchantId = this.generateId('mch');
    const now = new Date();

    const profile: MerchantProfile = {
      categories: [],
      contact: {
        email: params.email,
      },
      ...params.profile,
    };

    const settings: MerchantSettings = {
      currencies: params.currencies || ['TON'],
      defaultCurrency: params.currencies?.[0] || 'TON',
      paymentMethods: params.paymentMethods || ['ton_wallet'],
      checkout: {
        theme: 'auto',
        collectEmail: true,
        collectPhone: false,
        collectAddress: false,
      },
      notifications: {
        paymentReceived: true,
        paymentFailed: true,
        subscriptionEvents: true,
        disputeOpened: true,
        settlementCompleted: true,
        channels: ['email'],
      },
      webhooks: [],
      api: {
        enabled: true,
        keys: [],
        rateLimit: 1000,
        allowedOrigins: [],
        ipWhitelist: [],
      },
      fees: {
        platformFeePercent: this.config.defaultFeePercent,
        minFee: '0',
        customRates: {},
        payoutSchedule: this.config.payoutSchedule,
        payoutMinimum: '10',
      },
    };

    const verification: MerchantVerification = {
      level: 'none',
      kybCompleted: false,
      documentsSubmitted: [],
      documentsVerified: [],
      flags: [],
    };

    const integration: MerchantIntegration = {
      plugins: [],
      connectedApps: [],
      apiUsage: {
        period: 'day',
        requests: 0,
        successRate: 100,
        avgLatency: 0,
        errors: 0,
        topEndpoints: [],
      },
    };

    const analytics: MerchantAnalytics = {
      revenue: {
        total: '0',
        period: 'month',
        growth: 0,
        byCategory: {},
        byCurrency: {},
        projectedMonthly: '0',
      },
      transactions: {
        count: 0,
        avgValue: '0',
        successRate: 100,
        refundRate: 0,
        disputeRate: 0,
        topPaymentMethods: [],
      },
      customers: {
        total: 0,
        newThisPeriod: 0,
        returning: 0,
        avgLifetimeValue: '0',
        topCustomers: [],
      },
      subscriptions: {
        active: 0,
        mrr: '0',
        arr: '0',
        growth: 0,
        avgRevenue: '0',
        conversionRate: 0,
      },
      churn: {
        rate: 0,
        count: 0,
        revenue: '0',
        reasons: [],
      },
    };

    const compliance: MerchantCompliance = {
      level: 'none',
      certifications: [],
      riskScore: 0,
      restrictions: [],
    };

    const merchant: Merchant = {
      id: merchantId,
      name: params.name,
      displayName: params.displayName || params.name,
      type: params.type,
      status: this.config.verificationRequired ? 'pending' : 'active',
      verification,
      profile,
      settings,
      integration,
      analytics,
      compliance,
      createdAt: now,
      updatedAt: now,
    };

    this.merchants.set(merchantId, merchant);

    // Initialize payout schedule
    this.payoutSchedules.set(merchantId, {
      merchantId,
      frequency: this.config.payoutSchedule,
      minimumAmount: '10',
      holdPeriodDays: this.config.holdPeriodDays,
      enabled: true,
    });

    this.emitEvent('merchant.created', 'merchant', merchantId, 'created', merchant);

    return merchant;
  }

  async updateMerchant(merchantId: string, updates: Partial<Merchant>): Promise<Merchant> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const { id, createdAt, ...allowedUpdates } = updates;
    Object.assign(merchant, allowedUpdates);
    merchant.updatedAt = new Date();

    return merchant;
  }

  async getMerchant(merchantId: string): Promise<Merchant | null> {
    return this.merchants.get(merchantId) || null;
  }

  async listMerchants(filters?: MerchantFilters): Promise<MerchantListResult> {
    let merchants = Array.from(this.merchants.values());

    if (filters) {
      if (filters.status) {
        merchants = merchants.filter(m => m.status === filters.status);
      }
      if (filters.type) {
        merchants = merchants.filter(m => m.type === filters.type);
      }
      if (filters.verificationLevel) {
        merchants = merchants.filter(m => m.verification.level === filters.verificationLevel);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        merchants = merchants.filter(m =>
          m.name.toLowerCase().includes(search) ||
          m.displayName.toLowerCase().includes(search)
        );
      }
    }

    const total = merchants.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const paginatedMerchants = merchants.slice(offset, offset + limit);

    return {
      merchants: paginatedMerchants,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : undefined,
    };
  }

  async suspendMerchant(merchantId: string, reason: string): Promise<Merchant> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    merchant.status = 'suspended';
    merchant.updatedAt = new Date();

    this.emitEvent('merchant.suspended', 'merchant', merchantId, 'suspended', { reason });

    return merchant;
  }

  async reactivateMerchant(merchantId: string): Promise<Merchant> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    if (merchant.status !== 'suspended') {
      throw new Error(`Cannot reactivate merchant with status: ${merchant.status}`);
    }

    merchant.status = 'active';
    merchant.updatedAt = new Date();

    return merchant;
  }

  // ============================================================================
  // Verification
  // ============================================================================

  async submitVerification(merchantId: string, documents: VerificationDocument[]): Promise<VerificationResult> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    for (const doc of documents) {
      merchant.verification.documentsSubmitted.push(doc.type);
    }

    merchant.status = 'under_review';
    merchant.updatedAt = new Date();

    // Simulate verification process
    return {
      merchantId,
      status: 'pending',
      level: 'basic',
      message: 'Documents submitted for review',
      estimatedReviewTime: '1-2 business days',
    };
  }

  async getVerificationStatus(merchantId: string): Promise<MerchantVerification> {
    const merchant = await this.getMerchantOrThrow(merchantId);
    return merchant.verification;
  }

  async requestVerificationUpgrade(merchantId: string, targetLevel: string): Promise<VerificationResult> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const requiredDocuments: string[] = [];
    if (targetLevel === 'verified') {
      if (!merchant.verification.documentsSubmitted.includes('business_license')) {
        requiredDocuments.push('business_license');
      }
      if (!merchant.verification.documentsSubmitted.includes('tax_id')) {
        requiredDocuments.push('tax_id');
      }
    }

    return {
      merchantId,
      status: requiredDocuments.length > 0 ? 'pending' : 'approved',
      level: targetLevel,
      requiredDocuments: requiredDocuments.length > 0 ? requiredDocuments : undefined,
      message: requiredDocuments.length > 0
        ? 'Additional documents required'
        : 'Verification upgrade approved',
    };
  }

  // ============================================================================
  // Settings
  // ============================================================================

  async updateSettings(merchantId: string, settings: Partial<MerchantSettings>): Promise<Merchant> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    Object.assign(merchant.settings, settings);
    merchant.updatedAt = new Date();

    return merchant;
  }

  async addPaymentMethod(merchantId: string, method: PaymentMethod): Promise<Merchant> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    if (!merchant.settings.paymentMethods.includes(method)) {
      merchant.settings.paymentMethods.push(method);
      merchant.updatedAt = new Date();
    }

    return merchant;
  }

  async removePaymentMethod(merchantId: string, method: PaymentMethod): Promise<Merchant> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    merchant.settings.paymentMethods = merchant.settings.paymentMethods.filter(m => m !== method);
    merchant.updatedAt = new Date();

    return merchant;
  }

  // ============================================================================
  // API Management
  // ============================================================================

  async createApiKey(merchantId: string, params: CreateApiKeyParams): Promise<ApiKeyResult> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const keyId = this.generateId('key');
    const secret = this.generateSecret();
    const prefix = `sk_${merchant.id.slice(0, 8)}`;

    const key: ApiKey = {
      id: keyId,
      name: params.name,
      prefix,
      permissions: params.permissions,
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      enabled: true,
    };

    merchant.settings.api.keys.push(key);
    merchant.updatedAt = new Date();

    return { key, secret };
  }

  async revokeApiKey(merchantId: string, keyId: string): Promise<void> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const key = merchant.settings.api.keys.find(k => k.id === keyId);
    if (key) {
      key.enabled = false;
    }

    merchant.updatedAt = new Date();
  }

  async listApiKeys(merchantId: string): Promise<ApiKey[]> {
    const merchant = await this.getMerchantOrThrow(merchantId);
    return merchant.settings.api.keys;
  }

  async rotateApiKey(merchantId: string, keyId: string): Promise<ApiKeyResult> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const oldKey = merchant.settings.api.keys.find(k => k.id === keyId);
    if (!oldKey) {
      throw new Error(`API key not found: ${keyId}`);
    }

    // Disable old key
    oldKey.enabled = false;

    // Create new key with same permissions
    return this.createApiKey(merchantId, {
      name: oldKey.name,
      permissions: oldKey.permissions,
      expiresAt: oldKey.expiresAt,
    });
  }

  // ============================================================================
  // Webhooks
  // ============================================================================

  async createWebhook(merchantId: string, params: CreateWebhookParams): Promise<WebhookConfig> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const webhook: WebhookConfig = {
      id: this.generateId('whk'),
      url: params.url,
      events: params.events,
      secret: this.generateSecret(),
      enabled: params.enabled ?? true,
      retries: 3,
    };

    merchant.settings.webhooks.push(webhook);
    merchant.updatedAt = new Date();

    return webhook;
  }

  async updateWebhook(merchantId: string, webhookId: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const webhook = merchant.settings.webhooks.find(w => w.id === webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    const { id, secret, ...allowedUpdates } = updates;
    Object.assign(webhook, allowedUpdates);
    merchant.updatedAt = new Date();

    return webhook;
  }

  async deleteWebhook(merchantId: string, webhookId: string): Promise<void> {
    const merchant = await this.getMerchantOrThrow(merchantId);
    merchant.settings.webhooks = merchant.settings.webhooks.filter(w => w.id !== webhookId);
    merchant.updatedAt = new Date();
  }

  async listWebhooks(merchantId: string): Promise<WebhookConfig[]> {
    const merchant = await this.getMerchantOrThrow(merchantId);
    return merchant.settings.webhooks;
  }

  async testWebhook(merchantId: string, webhookId: string): Promise<WebhookTestResult> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const webhook = merchant.settings.webhooks.find(w => w.id === webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    // Simulate webhook test
    const startTime = Date.now();

    // In a real implementation, this would actually call the webhook URL
    const success = Math.random() > 0.1;

    return {
      success,
      statusCode: success ? 200 : 500,
      response: success ? '{"status": "ok"}' : undefined,
      error: success ? undefined : 'Connection refused',
      latency: Date.now() - startTime + Math.random() * 100,
    };
  }

  // ============================================================================
  // Checkout
  // ============================================================================

  async createCheckoutSession(merchantId: string, params: CreateCheckoutParams): Promise<CheckoutSession> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    if (merchant.status !== 'active') {
      throw new Error('Merchant is not active');
    }

    const sessionId = this.generateId('cs');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.expiresIn || 30 * 60) * 1000);

    const currency = params.currency || merchant.settings.defaultCurrency;

    // Process line items
    const lineItems: LineItem[] = params.lineItems.map((item, index) => ({
      id: `li_${index}`,
      name: item.name,
      description: item.description,
      image: item.image,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: (BigInt(item.unitPrice) * BigInt(item.quantity)).toString(),
      currency,
      productId: item.productId,
      metadata: item.metadata,
    }));

    // Calculate totals
    const subtotal = lineItems.reduce(
      (sum, item) => (BigInt(sum) + BigInt(item.totalPrice)).toString(),
      '0'
    );

    const totals: CheckoutTotals = {
      subtotal,
      tax: '0',
      shipping: '0',
      discount: '0',
      total: subtotal,
      currency,
    };

    const session: CheckoutSession = {
      id: sessionId,
      merchantId,
      status: 'open',
      mode: params.mode,
      lineItems,
      customer: params.customer,
      totals,
      metadata: params.metadata || {},
      urls: {
        success: params.successUrl,
        cancel: params.cancelUrl,
        checkout: `https://checkout.tonaiagent.com/${sessionId}`,
      },
      expiresAt,
      createdAt: now,
    };

    this.checkoutSessions.set(sessionId, session);

    this.emitEvent('checkout.created', 'checkout', sessionId, 'created', session);

    return session;
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    const session = this.checkoutSessions.get(sessionId);

    // Check expiration
    if (session && session.status === 'open' && session.expiresAt < new Date()) {
      session.status = 'expired';
    }

    return session || null;
  }

  async expireCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    const session = await this.getCheckoutSessionOrThrow(sessionId);

    if (session.status !== 'open') {
      throw new Error(`Cannot expire checkout session with status: ${session.status}`);
    }

    session.status = 'expired';

    return session;
  }

  async completeCheckoutSession(sessionId: string, paymentId: string): Promise<CheckoutSession> {
    const session = await this.getCheckoutSessionOrThrow(sessionId);

    if (session.status !== 'open') {
      throw new Error(`Cannot complete checkout session with status: ${session.status}`);
    }

    session.status = 'complete';
    session.completedAt = new Date();
    session.payment = {
      id: paymentId,
      amount: session.totals.total,
      currency: session.totals.currency,
      status: 'succeeded',
    };

    this.emitEvent('checkout.completed', 'checkout', sessionId, 'completed', session);

    return session;
  }

  // ============================================================================
  // Products
  // ============================================================================

  async createProduct(merchantId: string, params: CreateProductParams): Promise<Product> {
    await this.getMerchantOrThrow(merchantId);

    const productId = this.generateId('prod');
    const now = new Date();

    const product: Product = {
      id: productId,
      merchantId,
      name: params.name,
      description: params.description,
      images: params.images || [],
      price: params.price,
      currency: params.currency,
      active: true,
      recurring: params.recurring,
      metadata: params.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.products.set(productId, product);

    return product;
  }

  async updateProduct(merchantId: string, productId: string, updates: Partial<Product>): Promise<Product> {
    const product = await this.getProductOrThrow(productId);

    if (product.merchantId !== merchantId) {
      throw new Error('Product does not belong to this merchant');
    }

    const { id, merchantId: _, createdAt, ...allowedUpdates } = updates;
    Object.assign(product, allowedUpdates);
    product.updatedAt = new Date();

    return product;
  }

  async deleteProduct(merchantId: string, productId: string): Promise<void> {
    const product = await this.getProductOrThrow(productId);

    if (product.merchantId !== merchantId) {
      throw new Error('Product does not belong to this merchant');
    }

    this.products.delete(productId);
  }

  async listProducts(merchantId: string, filters?: ProductFilters): Promise<Product[]> {
    let products = Array.from(this.products.values()).filter(p => p.merchantId === merchantId);

    if (filters) {
      if (filters.active !== undefined) {
        products = products.filter(p => p.active === filters.active);
      }
      if (filters.type) {
        if (filters.type === 'recurring') {
          products = products.filter(p => p.recurring !== undefined);
        } else {
          products = products.filter(p => p.recurring === undefined);
        }
      }
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;

    return products.slice(offset, offset + limit);
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getAnalytics(merchantId: string, _period: AnalyticsPeriod): Promise<MerchantAnalytics> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    // Return current analytics (in a real implementation, this would aggregate data)
    return merchant.analytics;
  }

  async getRevenueReport(merchantId: string, period: AnalyticsPeriod): Promise<RevenueReport> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const now = new Date();
    const startDate = this.calculatePeriodStart(now, period);

    return {
      merchantId,
      period,
      startDate,
      endDate: now,
      totalRevenue: merchant.analytics.revenue.total,
      netRevenue: (BigInt(merchant.analytics.revenue.total) * BigInt(975) / BigInt(1000)).toString(),
      fees: (BigInt(merchant.analytics.revenue.total) * BigInt(25) / BigInt(1000)).toString(),
      refunds: '0',
      currency: merchant.settings.defaultCurrency,
      byDay: [],
      byProduct: [],
    };
  }

  async getTransactionReport(merchantId: string, period: AnalyticsPeriod): Promise<TransactionReport> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const now = new Date();
    const startDate = this.calculatePeriodStart(now, period);

    return {
      merchantId,
      period,
      startDate,
      endDate: now,
      totalTransactions: merchant.analytics.transactions.count,
      successfulTransactions: Math.floor(merchant.analytics.transactions.count * merchant.analytics.transactions.successRate / 100),
      failedTransactions: Math.floor(merchant.analytics.transactions.count * (100 - merchant.analytics.transactions.successRate) / 100),
      refundedTransactions: 0,
      averageTransactionValue: merchant.analytics.transactions.avgValue,
      byStatus: [],
      byMethod: merchant.analytics.transactions.topPaymentMethods.map(m => ({
        method: m.method,
        count: m.count,
        amount: (BigInt(m.count) * BigInt(merchant.analytics.transactions.avgValue)).toString(),
      })),
      byHour: [],
    };
  }

  // ============================================================================
  // Payouts
  // ============================================================================

  async requestPayout(merchantId: string, params: PayoutRequest): Promise<Payout> {
    const merchant = await this.getMerchantOrThrow(merchantId);

    const payoutId = this.generateId('po');
    const now = new Date();

    const amount = params.amount || merchant.analytics.revenue.total;
    const currency = params.currency || merchant.settings.defaultCurrency;
    const feePercent = merchant.settings.fees.platformFeePercent;
    const fees = (BigInt(amount) * BigInt(Math.floor(feePercent * 100)) / BigInt(10000)).toString();
    const netAmount = (BigInt(amount) - BigInt(fees)).toString();

    const payout: Payout = {
      id: payoutId,
      merchantId,
      amount,
      currency,
      status: 'pending',
      destination: params.destination,
      description: params.description,
      fees,
      netAmount,
      createdAt: now,
    };

    this.payouts.set(payoutId, payout);

    this.emitEvent('merchant.payout', 'merchant', merchantId, 'payout_requested', payout);

    return payout;
  }

  async getPayoutHistory(merchantId: string): Promise<Payout[]> {
    return Array.from(this.payouts.values())
      .filter(p => p.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPayoutSchedule(merchantId: string): Promise<PayoutSchedule> {
    const schedule = this.payoutSchedules.get(merchantId);
    if (!schedule) {
      throw new Error(`Payout schedule not found for merchant: ${merchantId}`);
    }
    return schedule;
  }

  async updatePayoutSchedule(merchantId: string, schedule: Partial<PayoutSchedule>): Promise<PayoutSchedule> {
    const currentSchedule = await this.getPayoutSchedule(merchantId);

    const { merchantId: _, ...allowedUpdates } = schedule;
    Object.assign(currentSchedule, allowedUpdates);

    return currentSchedule;
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

  private async getMerchantOrThrow(merchantId: string): Promise<Merchant> {
    const merchant = await this.getMerchant(merchantId);
    if (!merchant) {
      throw new Error(`Merchant not found: ${merchantId}`);
    }
    return merchant;
  }

  private async getCheckoutSessionOrThrow(sessionId: string): Promise<CheckoutSession> {
    const session = await this.getCheckoutSession(sessionId);
    if (!session) {
      throw new Error(`Checkout session not found: ${sessionId}`);
    }
    return session;
  }

  private async getProductOrThrow(productId: string): Promise<Product> {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    return product;
  }

  private calculatePeriodStart(now: Date, period: AnalyticsPeriod): Date {
    const start = new Date(now);

    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return start;
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
      actor: { type: 'system', id: 'merchant-infrastructure' },
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

  private generateSecret(): string {
    return `whsec_${Math.random().toString(36).substr(2, 32)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMerchantInfrastructure(config?: Partial<MerchantsConfig>): DefaultMerchantInfrastructure {
  return new DefaultMerchantInfrastructure(config);
}
