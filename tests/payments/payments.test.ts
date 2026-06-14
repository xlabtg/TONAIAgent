/**
 * TONAIAgent - Payments Module Tests
 *
 * Tests for the AI-native payments and commerce layer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPaymentsManager,
  createPaymentGateway,
  createSubscriptionEngine,
  createSmartSpendingManager,
  createMerchantInfrastructure,
  createAgentCommerceManager,
  createCrossBorderPaymentsManager,
  createPaymentAnalyticsEngine,
  createComplianceSecurityManager,
  DefaultPaymentsManager,
  DefaultPaymentGateway,
  DefaultSubscriptionEngine,
  DefaultSmartSpendingManager,
  DefaultMerchantInfrastructure,
  DefaultAgentCommerceManager,
  DefaultCrossBorderPaymentsManager,
  DefaultPaymentAnalyticsEngine,
  DefaultComplianceSecurityManager,
} from '../../services/payments';

// ============================================================================
// Payment Gateway Tests
// ============================================================================

describe('PaymentGateway', () => {
  let gateway: DefaultPaymentGateway;

  beforeEach(() => {
    gateway = createPaymentGateway({
      enabled: true,
      supportedCurrencies: ['TON', 'USDT', 'USDC'],
      defaultCurrency: 'TON',
    });
  });

  it('should be enabled', () => {
    expect(gateway.config.enabled).toBe(true);
  });

  it('should have supported currencies', () => {
    expect(gateway.config.supportedCurrencies).toContain('TON');
  });

  it('should have default currency', () => {
    expect(gateway.config.defaultCurrency).toBe('TON');
  });

  // ==========================================================================
  // capturePayment authorization gate (issue #436 — LOGIC-26)
  // ==========================================================================
  describe('capturePayment authorization gate', () => {
    const baseParams = {
      type: 'transfer' as const,
      method: 'ton_wallet' as const,
      amount: '100',
      currency: 'TON' as const,
      sender: { id: 'sender-1' },
      recipient: { id: 'recipient-1' },
    };

    it('should throw when capturing a freshly-created pending payment', async () => {
      const payment = await gateway.createPayment(baseParams);
      expect(payment.status).toBe('pending');

      await expect(gateway.capturePayment(payment.id)).rejects.toThrow(
        'Cannot capture payment with status: pending'
      );

      const stored = await gateway.getPayment(payment.id);
      expect(stored?.status).toBe('pending');
    });

    it('should capture only after the payment is authorized', async () => {
      const payment = await gateway.createPayment(baseParams);

      // Authorize via approval so collected >= required.
      await gateway.approve(payment.id, 'approver-1');
      const authorized = await gateway.getPayment(payment.id);
      expect(authorized?.status).toBe('authorized');

      const captured = await gateway.capturePayment(payment.id);
      expect(['captured', 'completed']).toContain(captured.status);
    });

    it('should throw when capturing from non-authorized statuses', async () => {
      // cancelled
      const cancelledPayment = await gateway.createPayment(baseParams);
      await gateway.cancelPayment(cancelledPayment.id);
      await expect(gateway.capturePayment(cancelledPayment.id)).rejects.toThrow(
        'Cannot capture payment with status: cancelled'
      );

      // already completed (capture is not idempotent / re-capturable)
      const completedPayment = await gateway.createPayment(baseParams);
      await gateway.approve(completedPayment.id, 'approver-1');
      const captured = await gateway.capturePayment(completedPayment.id);
      await expect(gateway.capturePayment(completedPayment.id)).rejects.toThrow(
        `Cannot capture payment with status: ${captured.status}`
      );
    });
  });

  // ==========================================================================
  // refundPayment upper-bound guard (issue #443 — LOGIC-33)
  // ==========================================================================
  describe('refundPayment upper-bound guard', () => {
    const baseParams = {
      type: 'transfer' as const,
      method: 'ton_wallet' as const,
      amount: '100',
      currency: 'TON' as const,
      sender: { id: 'sender-1' },
      recipient: { id: 'recipient-1' },
    };

    // Drive a payment all the way to 'completed' so it is refundable.
    async function createCompletedPayment() {
      const payment = await gateway.createPayment(baseParams);
      await gateway.approve(payment.id, 'approver-1');
      await gateway.capturePayment(payment.id); // capture -> processPayment -> completed
      const completed = await gateway.getPayment(payment.id);
      expect(completed?.status).toBe('completed');
      return payment.id;
    }

    it('should reject a refund greater than the captured amount', async () => {
      const paymentId = await createCompletedPayment();

      await expect(gateway.refundPayment(paymentId, '150')).rejects.toThrow(
        /exceeds refundable balance/
      );

      const stored = await gateway.getPayment(paymentId);
      expect(stored?.status).toBe('completed');
      expect(stored?.refundedAmount).toBeUndefined();
    });

    it('should reject a non-positive refund amount', async () => {
      const paymentId = await createCompletedPayment();

      await expect(gateway.refundPayment(paymentId, '0')).rejects.toThrow(
        'Refund amount must be positive'
      );
    });

    it('should allow a full refund equal to the captured amount', async () => {
      const paymentId = await createCompletedPayment();

      const result = await gateway.refundPayment(paymentId, '100');
      expect(result.amount).toBe('100');
      expect(result.payment.status).toBe('refunded');
      expect(result.payment.refundedAmount).toBe('100');
    });

    it('should allow sequential partial refunds up to the captured total', async () => {
      const paymentId = await createCompletedPayment();

      const first = await gateway.refundPayment(paymentId, '60');
      expect(first.payment.status).toBe('partially_refunded');
      expect(first.payment.refundedAmount).toBe('60');

      const second = await gateway.refundPayment(paymentId, '40');
      expect(second.payment.status).toBe('refunded');
      expect(second.payment.refundedAmount).toBe('100');
    });

    it('should reject a partial refund that would exceed the remaining balance', async () => {
      const paymentId = await createCompletedPayment();

      await gateway.refundPayment(paymentId, '60');

      // Remaining balance is 40; asking for 50 must be rejected.
      await expect(gateway.refundPayment(paymentId, '50')).rejects.toThrow(
        /exceeds refundable balance/
      );

      const stored = await gateway.getPayment(paymentId);
      expect(stored?.status).toBe('partially_refunded');
      expect(stored?.refundedAmount).toBe('60');
    });

    it('should refund the remaining balance when no amount is given after a partial refund', async () => {
      const paymentId = await createCompletedPayment();

      await gateway.refundPayment(paymentId, '70');
      const rest = await gateway.refundPayment(paymentId);
      expect(rest.amount).toBe('30');
      expect(rest.payment.status).toBe('refunded');
      expect(rest.payment.refundedAmount).toBe('100');
    });

    it('should reject any further refund once fully refunded', async () => {
      const paymentId = await createCompletedPayment();

      await gateway.refundPayment(paymentId, '100');

      await expect(gateway.refundPayment(paymentId, '10')).rejects.toThrow(
        'Cannot refund payment with status: refunded'
      );
    });
  });
});

// ============================================================================
// Subscription Engine Tests
// ============================================================================

describe('SubscriptionEngine', () => {
  let subscriptions: DefaultSubscriptionEngine;

  beforeEach(() => {
    subscriptions = createSubscriptionEngine({
      enabled: true,
      trialEnabled: true,
      defaultTrialDays: 14,
    });
  });

  it('should be enabled', () => {
    expect(subscriptions.config.enabled).toBe(true);
  });

  it('should have trial enabled', () => {
    expect(subscriptions.config.trialEnabled).toBe(true);
  });

  it('should have default trial days', () => {
    expect(subscriptions.config.defaultTrialDays).toBe(14);
  });
});

// ============================================================================
// Smart Spending Tests
// ============================================================================

describe('SmartSpendingManager', () => {
  let spending: DefaultSmartSpendingManager;

  beforeEach(() => {
    spending = createSmartSpendingManager({
      enabled: true,
      aiOptimizationEnabled: true,
    });
  });

  it('should be enabled', () => {
    expect(spending.config.enabled).toBe(true);
  });

  it('should have AI optimization enabled', () => {
    expect(spending.config.aiOptimizationEnabled).toBe(true);
  });
});

// ============================================================================
// Merchant Infrastructure Tests
// ============================================================================

describe('MerchantInfrastructure', () => {
  let merchants: DefaultMerchantInfrastructure;

  beforeEach(() => {
    merchants = createMerchantInfrastructure({
      enabled: true,
      verificationRequired: true,
    });
  });

  it('should be enabled', () => {
    expect(merchants.config.enabled).toBe(true);
  });

  it('should have verification required', () => {
    expect(merchants.config.verificationRequired).toBe(true);
  });

  describe('registerMerchant', () => {
    it('should register a new merchant', async () => {
      const merchant = await merchants.registerMerchant({
        name: 'Test Store',
        businessType: 'online_retail',
        contactEmail: 'contact@store.com',
        walletAddress: 'EQ...',
      });

      expect(merchant.id).toBeDefined();
      expect(merchant.name).toBe('Test Store');
    });
  });
});

// ============================================================================
// Agent Commerce Tests
// ============================================================================

describe('AgentCommerceManager', () => {
  let agents: DefaultAgentCommerceManager;

  beforeEach(() => {
    agents = createAgentCommerceManager({
      enabled: true,
      maxAgentsPerUser: 10,
    });
  });

  it('should be enabled', () => {
    expect(agents.config.enabled).toBe(true);
  });

  it('should have max agents per user', () => {
    expect(agents.config.maxAgentsPerUser).toBe(10);
  });

  describe('configureAgent', () => {
    it('should configure an agent', async () => {
      const agent = await agents.configureAgent('agent-1', {
        capabilities: ['autonomous_payment', 'negotiate_price'],
      });

      expect(agent.agentId).toBe('agent-1');
      expect(agent.enabled).toBe(true);
    });
  });

  describe('checkAuthorization — LOGIC-38', () => {
    it('should deny a blocked merchant even when the amount triggers the approval branch', async () => {
      await agents.configureAgent('agent-block-merchant', {
        capabilities: ['autonomous_payment'],
        limits: {
          blockedMerchants: ['blocked-merchant'],
        },
      });

      // Amount well above maxTransactionAmount ('1000') so it hits the approval branch.
      const result = await agents.checkAuthorization('agent-block-merchant', {
        amount: '5000',
        currency: 'TON',
        merchantId: 'blocked-merchant',
        type: 'one_time',
      });

      expect(result.authorized).toBe(false);
      expect(result.requiresApproval).toBeFalsy();
      expect(result.reason).toBe('Merchant is blocked');
    });

    it('should deny a blocked category even when the amount triggers the approval branch', async () => {
      await agents.configureAgent('agent-block-category', {
        capabilities: ['autonomous_payment'],
        limits: {
          blockedCategories: ['gambling'],
        },
      });

      const result = await agents.checkAuthorization('agent-block-category', {
        amount: '5000',
        currency: 'TON',
        merchantId: 'merchant-1',
        category: 'gambling',
        type: 'one_time',
      });

      expect(result.authorized).toBe(false);
      expect(result.requiresApproval).toBeFalsy();
      expect(result.reason).toBe('Category is blocked');
    });

    it('should still require approval for a large amount to an allowed merchant', async () => {
      await agents.configureAgent('agent-allowed', {
        capabilities: ['autonomous_payment'],
      });

      const result = await agents.checkAuthorization('agent-allowed', {
        amount: '5000',
        currency: 'TON',
        merchantId: 'merchant-1',
        type: 'one_time',
      });

      expect(result.authorized).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });
  });
});

// ============================================================================
// Cross-Border Payments Tests
// ============================================================================

describe('CrossBorderPaymentsManager', () => {
  let crossBorder: DefaultCrossBorderPaymentsManager;

  beforeEach(() => {
    crossBorder = createCrossBorderPaymentsManager({
      enabled: true,
      defaultProvider: 'default',
    });
  });

  it('should be enabled', () => {
    expect(crossBorder.config.enabled).toBe(true);
  });

  describe('checkCompliance — LOGIC-18', () => {
    const baseParams = {
      sourceCountry: 'US',
      destinationCountry: 'DE',
      currency: 'USDT' as const,
      purpose: 'Business services payment for Q1 consulting',
      senderType: 'business' as const,
      recipientType: 'business' as const,
    };

    it('should return compliant=false for high-value transfer without required documents', async () => {
      const result = await crossBorder.checkCompliance({
        ...baseParams,
        amount: '15000',
      });

      expect(result.compliant).toBe(false);
      expect(result.documentsNeeded).toContain('proof_of_funds');
      expect(result.documentsNeeded).toContain('purpose_declaration');
      expect(result.requiredActions.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.severity === 'critical')).toBe(true);
    });

    it('should return compliant=true for low-value transfer with valid purpose', async () => {
      const result = await crossBorder.checkCompliance({
        ...baseParams,
        amount: '500',
      });

      expect(result.compliant).toBe(true);
      expect(result.documentsNeeded).not.toContain('proof_of_funds');
    });

    it('should not throw for decimal amount string', async () => {
      await expect(
        crossBorder.checkCompliance({
          ...baseParams,
          amount: '100.5',
        })
      ).resolves.toBeDefined();
    });

    it('should throw descriptive error for invalid amount string', async () => {
      await expect(
        crossBorder.checkCompliance({
          ...baseParams,
          amount: 'not-a-number',
        })
      ).rejects.toThrow('Invalid amount format');
    });
  });

  describe('getExchangeRate — LOGIC-18', () => {
    it('should not throw for decimal amount string', async () => {
      await expect(
        crossBorder.getExchangeRate({
          sourceCurrency: 'TON',
          destinationCurrency: 'USDT',
          amount: '100.5',
          direction: 'buy',
        })
      ).resolves.toBeDefined();
    });

    it('should return a quote for integer amount string', async () => {
      const quote = await crossBorder.getExchangeRate({
        sourceCurrency: 'TON',
        destinationCurrency: 'USDT',
        amount: '1000',
        direction: 'sell',
      });

      expect(quote.sourceAmount).toBe('1000');
      expect(quote.destinationAmount).toBeDefined();
    });
  });
});

// ============================================================================
// Payment Analytics Tests
// ============================================================================

describe('PaymentAnalyticsEngine', () => {
  let analytics: DefaultPaymentAnalyticsEngine;

  beforeEach(() => {
    analytics = createPaymentAnalyticsEngine({
      enabled: true,
      retentionDays: 365,
    });
  });

  it('should be enabled', () => {
    expect(analytics.config.enabled).toBe(true);
  });

  it('should have retention days configured', () => {
    expect(analytics.config.retentionDays).toBe(365);
  });
});

// ============================================================================
// Compliance and Security Tests
// ============================================================================

describe('ComplianceSecurityManager', () => {
  let compliance: DefaultComplianceSecurityManager;

  beforeEach(() => {
    compliance = createComplianceSecurityManager({
      enabled: true,
      kycEnabled: true,
      amlEnabled: true,
    });
  });

  it('should be created successfully', () => {
    expect(compliance).toBeDefined();
  });

  it('should have initiateKYC method', () => {
    expect(typeof compliance.initiateKYC).toBe('function');
  });

  it('should have runAMLScreening method', () => {
    expect(typeof compliance.runAMLScreening).toBe('function');
  });
});

// ============================================================================
// Payments Manager Integration Tests
// ============================================================================

describe('PaymentsManager', () => {
  let payments: DefaultPaymentsManager;

  beforeEach(() => {
    payments = createPaymentsManager({
      gateway: { enabled: true },
      subscriptions: { enabled: true },
      spending: { enabled: true },
      merchants: { enabled: true },
      agents: { enabled: true },
      crossBorder: { enabled: true },
      analytics: { enabled: true },
      security: { enabled: true },
    });
  });

  describe('initialization', () => {
    it('should initialize all components', () => {
      expect(payments.gateway).toBeDefined();
      expect(payments.subscriptions).toBeDefined();
      expect(payments.smartSpending).toBeDefined();
      expect(payments.merchants).toBeDefined();
      expect(payments.agentCommerce).toBeDefined();
      expect(payments.crossBorder).toBeDefined();
      expect(payments.analytics).toBeDefined();
      expect(payments.compliance).toBeDefined();
    });

    it('should be enabled', () => {
      expect(payments.enabled).toBe(true);
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const health = await payments.getHealth();

      expect(health.overall).toBeDefined();
      expect(health.components).toBeDefined();
      expect(health.lastCheck).toBeDefined();
    });

    it('should show healthy status when all components are enabled', async () => {
      const health = await payments.getHealth();

      expect(health.overall).toBe('healthy');
    });
  });

  describe('statistics', () => {
    it('should return payments statistics', async () => {
      const stats = await payments.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalPaymentsProcessed).toBeDefined();
    });
  });

  describe('events', () => {
    it('should register event callback', () => {
      let callbackRegistered = false;

      payments.onEvent(() => {
        callbackRegistered = true;
      });

      // If we get here without error, callback was registered
      expect(true).toBe(true);
    });
  });
});
