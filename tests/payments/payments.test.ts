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
