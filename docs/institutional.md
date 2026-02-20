# Institutional & Compliance Layer

## Overview

The Institutional & Compliance Layer provides comprehensive institutional-grade compliance, risk, and reporting infrastructure enabling regulated entities, funds, DAOs, and enterprises to safely operate autonomous agents on The Open Network (TON).

This module addresses the unique challenges of institutional adoption by providing:

- **Regulatory Compliance**: KYC/AML integration, sanctions screening, and regulatory reporting
- **Risk Management**: Portfolio limits, VaR calculations, and stress testing
- **Governance**: Multi-user accounts with role-based permissions and approval workflows
- **AI Oversight**: Explainability, decision traceability, and safety guardrails

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Institutional Manager                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Accounts   │ │   KYC/AML   │ │  Workflows  │ │  Reporting  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐                                            │
│  │    Risk     │ │     AI      │                                            │
│  │  Controls   │ │ Governance  │                                            │
│  └─────────────┘ └─────────────┘                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Security Layer                                      │
│         (Key Management, Encryption, HSM Integration)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```typescript
import {
  createInstitutionalManager,
  InstitutionalAccountType,
} from '@tonaiagent/core/institutional';
```

### Basic Setup

```typescript
// Create the institutional manager
const institutional = createInstitutionalManager();

// Initialize a new institutional account with all components
const result = await institutional.initializeAccount(
  'Acme Capital Fund',
  'hedge_fund',
  'admin_user_id'
);

// Result contains:
// - accountId: Unique account identifier
// - kycProfileId: KYC profile for compliance
// - monitorId: Transaction monitoring ID
// - riskConfigured: true
// - reportingConfigured: true
// - workflowsInitialized: true
// - aiGovernanceConfigured: true
```

## Components

### 1. Account Management

Multi-user institutional accounts with role-based access control.

#### Account Types

| Type | Description | Default Limits |
|------|-------------|----------------|
| `hedge_fund` | Hedge fund operations | 50M daily, 200M monthly |
| `family_office` | Family office wealth management | 20M daily, 80M monthly |
| `dao_treasury` | DAO treasury management | 100M daily, 400M monthly |
| `corporate` | Corporate treasury operations | 30M daily, 120M monthly |
| `custodian` | Custodial services | 500M daily, 2B monthly |
| `exchange` | Exchange operations | 1B daily, 5B monthly |

#### Roles and Permissions

| Role | Permissions |
|------|-------------|
| `admin` | Full access - manage members, roles, settings, approve transactions |
| `trader` | Execute trades within approved limits |
| `risk_manager` | Monitor and manage risk controls, view reports |
| `compliance_officer` | KYC/AML oversight, compliance reporting |
| `auditor` | Read-only access to all data for auditing |
| `viewer` | Read-only access to basic information |

#### Usage

```typescript
const accounts = institutional.accounts;

// Create an account
const account = await accounts.createAccount('My Fund', 'hedge_fund', 'user123');

// Add a member with specific role
await accounts.addMember(account.id, 'trader_user', 'trader');

// Check access
const access = await accounts.checkAccess(account.id, 'trader_user', 'execute_trade');
// { allowed: true, reason: 'Permission granted by role: trader' }

// Update member role
await accounts.updateMember(account.id, 'trader_user', { role: 'risk_manager' });

// Create account hierarchy (sub-accounts)
const subAccount = await accounts.createAccount('Trading Desk 1', 'hedge_fund', 'user123');
await accounts.setParentAccount(subAccount.id, account.id);
```

### 2. KYC/AML Integration

Comprehensive identity verification and anti-money laundering compliance.

#### Features

- **Document Verification**: Passport, driver's license, business registration
- **Sanctions Screening**: OFAC, EU, UN, and other sanctions lists
- **PEP Screening**: Politically Exposed Persons detection
- **Adverse Media**: News and media screening
- **Transaction Monitoring**: Real-time transaction surveillance
- **Alert Management**: Risk-based alert generation and investigation

#### Usage

```typescript
const kyc = institutional.kyc;

// Create KYC profile
const profile = await kyc.createProfile(accountId, 'institutional');

// Submit document for verification
await kyc.submitDocument(profile.id, {
  type: 'articles_of_incorporation',
  documentId: 'doc_123',
  issuingCountry: 'US',
  expiryDate: new Date('2030-01-01'),
});

// Run screening
const screeningResult = await kyc.runScreening(profile.id, {
  sanctions: true,
  pep: true,
  adverseMedia: true,
});

// Create transaction monitor
const monitor = await kyc.createMonitor(accountId);

// Check transaction for AML risks
const checkResult = await kyc.checkTransaction(monitor.id, {
  transactionId: 'tx_123',
  type: 'withdrawal',
  amount: 500000,
  currency: 'USD',
  counterparty: 'external_wallet',
  timestamp: new Date(),
});
// Returns: { approved, riskScore, flags, alerts, requiresReview }

// Handle alerts
const alerts = await kyc.getAlerts(accountId, { status: 'open' });
await kyc.updateAlertStatus(alerts[0].id, 'investigating', 'analyst_123');
```

### 3. Approval Workflows

Configurable transaction approval workflows with multi-step processes.

#### Workflow Templates

- **Large Transaction**: Multi-step approval for high-value transactions
- **New Counterparty**: Verification workflow for new trading partners
- **Emergency**: Expedited approval for urgent operations
- **Custody Transfer**: Asset custody change workflows

#### Usage

```typescript
const workflows = institutional.workflows;

// Initialize default workflows
await workflows.initializeDefaultWorkflows(accountId, adminUserId);

// Create custom workflow
const workflow = await workflows.createWorkflow({
  name: 'High Value Trade Approval',
  accountId,
  triggerConditions: {
    transactionTypes: ['trade', 'swap'],
    minAmount: 1000000, // 1M USD threshold
  },
  steps: [
    {
      name: 'Risk Review',
      requiredApprovals: 1,
      approverRoles: ['risk_manager'],
      timeoutHours: 4,
    },
    {
      name: 'Compliance Check',
      requiredApprovals: 1,
      approverRoles: ['compliance_officer'],
      timeoutHours: 2,
    },
    {
      name: 'Final Approval',
      requiredApprovals: 2,
      approverRoles: ['admin'],
      timeoutHours: 8,
    },
  ],
  escalationPolicy: {
    enabled: true,
    escalateAfterHours: 12,
    escalateTo: ['senior_admin'],
    maxEscalations: 2,
  },
  createdBy: adminUserId,
});

// Evaluate transaction against workflows
const evaluation = await workflows.evaluateTransaction(accountId, {
  transactionId: 'tx_456',
  type: 'trade',
  amount: 2000000,
  currency: 'USD',
});

// If workflow required, create approval request
if (evaluation.requiresApproval) {
  const request = await workflows.createApprovalRequest(
    evaluation.applicableWorkflows[0].id,
    'tx_456',
    { reason: 'Large trade execution' }
  );

  // Submit approval
  await workflows.submitApproval(request.id, 'risk_manager_user', {
    approved: true,
    comment: 'Risk within acceptable limits',
  });
}
```

### 4. Regulatory Reporting

Automated report generation and compliance dashboards.

#### Report Types

| Type | Description | Frequency |
|------|-------------|-----------|
| `performance` | Portfolio performance and returns | Daily/Monthly |
| `risk` | Risk metrics, VaR, exposure | Daily/Weekly |
| `compliance` | KYC/AML status, alerts | Weekly/Monthly |
| `regulatory` | Regulatory filings | Monthly/Quarterly |
| `audit` | Full audit trail | On-demand |
| `custom` | Customizable reports | Configurable |

#### Usage

```typescript
const reporting = institutional.reporting;

// Configure reporting
await reporting.configureReporting(accountId, {
  enabled: true,
  retentionDays: 2555, // 7 years
  defaultTimezone: 'America/New_York',
  complianceFrameworks: ['MiCA', 'FATF'],
});

// Generate a report
const report = await reporting.generateReport(accountId, {
  type: 'risk',
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  },
  format: 'pdf',
});

// Schedule recurring reports
await reporting.scheduleReport(accountId, {
  type: 'compliance',
  name: 'Weekly Compliance Summary',
  frequency: 'weekly',
  dayOfWeek: 1, // Monday
  recipients: ['compliance@example.com'],
  format: 'pdf',
});

// Get dashboard metrics
const dashboard = await reporting.getDashboardMetrics(accountId, '30d');
// Returns: portfolio, activity, risk, and compliance metrics

// Get compliance dashboard
const compliance = await reporting.getComplianceDashboard(accountId);
// Returns: KYC status, AML monitoring, pending reviews, issues
```

### 5. Risk Controls

Portfolio risk management with VaR calculations and stress testing.

#### Risk Metrics

- **Value at Risk (VaR)**: Historical, Parametric, Monte Carlo methods
- **Conditional VaR (CVaR)**: Expected shortfall
- **Sharpe Ratio**: Risk-adjusted returns
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Position Concentration**: Single asset exposure limits

#### Stress Testing Scenarios

Built-in historical scenarios:
- 2008 Financial Crisis
- 2020 COVID Crash
- 2022 Terra Luna Collapse
- 2022 FTX Collapse

#### Usage

```typescript
const risk = institutional.risk;

// Configure risk controls
await risk.configureRisk(accountId, {
  enabled: true,
  portfolioLimits: {
    maxDrawdown: 15, // 15% max drawdown
    maxConcentration: 25, // 25% max single position
    maxLeverage: 2.0,
    minLiquidity: 20, // 20% minimum liquid assets
  },
  varConfig: {
    confidenceLevel: 0.99, // 99% VaR
    timeHorizon: 1, // 1 day
    method: 'historical',
    lookbackPeriod: 252, // 1 year
  },
  stressTestConfig: {
    enabled: true,
    scenarios: ['financial_crisis_2008', 'covid_crash_2020'],
    frequency: 'daily',
  },
  alertThresholds: {
    varBreachPercent: 80,
    drawdownWarning: 10,
    concentrationWarning: 20,
  },
});

// Update portfolio state
await risk.updatePortfolio(accountId, {
  timestamp: new Date(),
  totalValue: 10000000,
  positions: [
    { assetId: 'TON', quantity: 100000, currentPrice: 50, marketValue: 5000000 },
    { assetId: 'USDT', quantity: 5000000, currentPrice: 1, marketValue: 5000000 },
  ],
  historicalReturns: [
    { date: new Date('2024-01-01'), returnPercent: 1.2 },
    { date: new Date('2024-01-02'), returnPercent: -0.5 },
    // ... more historical data
  ],
});

// Calculate VaR
const metrics = await risk.calculateRiskMetrics(accountId);
// Returns: VaR, CVaR, sharpe ratio, max drawdown, concentration

// Run stress test
const stressResults = await risk.runStressTest(accountId, 'financial_crisis_2008');
// Returns: scenario details, portfolio impact, position impacts

// Check transaction impact before execution
const impact = await risk.analyzeTransactionImpact(accountId, {
  assetId: 'TON',
  side: 'buy',
  quantity: 50000,
  estimatedPrice: 52,
});
// Returns: whether transaction would violate any limits

// Check all limits
const limitCheck = await risk.checkLimits(accountId);
// Returns: overall status and individual limit statuses
```

### 6. AI Governance

AI decision transparency, explainability, and oversight.

#### Features

- **Decision Recording**: Full audit trail of AI decisions
- **Explainability**: Human-readable explanations of AI reasoning
- **Human Review**: Configurable triggers for human oversight
- **Safety Constraints**: Configurable guardrails and limits
- **Analytics**: Performance tracking and analysis

#### Usage

```typescript
const ai = institutional.aiGovernance;

// Configure AI governance
await ai.configureGovernance(accountId, {
  enabled: true,
  humanReviewThresholds: {
    transactionAmount: 500000, // Require review above 500K
    riskScore: 0.7, // High-risk decisions
    noveltyScore: 0.8, // Novel situations
  },
  safetyConstraints: {
    maxTransactionSize: 1000000,
    prohibitedActions: ['margin_trading', 'derivatives'],
    requiredConfidenceLevel: 0.8,
    cooldownPeriods: {
      largeTransaction: 3600, // 1 hour between large transactions
      counterpartyChange: 86400, // 24 hours for counterparty changes
    },
  },
  explainabilityLevel: 'detailed',
  auditRetentionDays: 2555, // 7 years
});

// Record an AI decision
const decision = await ai.recordDecision({
  accountId,
  decisionType: 'trade_execution',
  modelId: 'trading_agent_v2',
  modelVersion: '2.1.0',
  input: {
    marketConditions: { /* ... */ },
    portfolioState: { /* ... */ },
  },
  output: {
    action: 'buy',
    asset: 'TON',
    amount: 10000,
  },
  confidence: 0.92,
  reasoning: [
    'Market momentum positive based on 7-day trend',
    'Position within allocation limits',
    'Favorable risk-reward ratio of 2.5:1',
  ],
  alternativesConsidered: [
    { action: 'hold', reason: 'Lower potential return' },
    { action: 'sell', reason: 'Counter to trend' },
  ],
  riskAssessment: {
    level: 'medium',
    factors: ['market_volatility', 'position_size'],
  },
});

// Generate explanation
const explanation = await ai.generateExplanation(decision.id);
// Returns: summary, reasoning, risks, alternatives in human-readable format

// Check if human review is required
const reviewRequired = await ai.checkHumanReviewRequired(accountId, {
  type: 'trade_execution',
  amount: 750000, // Above threshold
  riskScore: 0.5,
});
// Returns: { required: true, reasons: ['Amount exceeds threshold of 500000'] }

// Submit human review
await ai.submitHumanReview(decision.id, {
  reviewerId: 'analyst_user',
  approved: true,
  comments: 'Trade aligns with investment thesis',
  adjustments: null,
});

// Check safety constraints
const safetyCheck = await ai.checkSafetyConstraints(accountId, {
  type: 'trade_execution',
  amount: 1500000, // Exceeds max
  action: 'margin_trading', // Prohibited
  confidence: 0.6, // Below required
});
// Returns: { passed: false, violations: [...], warnings: [...] }

// Get decision analytics
const analytics = await ai.getDecisionAnalytics(accountId, '30d');
// Returns: total decisions, approval rates, review metrics, model performance
```

## Event System

All components emit events that can be subscribed to for real-time monitoring.

```typescript
// Subscribe to all institutional events
institutional.onEvent((event) => {
  console.log(`[${event.type}] ${event.timestamp}`, event.payload);

  // Handle specific events
  switch (event.type) {
    case 'kyc.alert_created':
      notifyComplianceTeam(event.payload);
      break;
    case 'risk.limit_breached':
      triggerEmergencyProtocol(event.payload);
      break;
    case 'ai.decision_recorded':
      logToAuditTrail(event.payload);
      break;
  }
});

// Or subscribe to individual components
institutional.kyc.onEvent((event) => {
  if (event.type === 'kyc.screening_completed') {
    processScreeningResult(event.payload);
  }
});
```

## Integration with Security Layer

The Institutional module integrates with the Security Layer for:

- **Key Management**: Secure storage of signing keys
- **Encryption**: Data at rest and in transit
- **HSM Support**: Hardware security module integration
- **Audit Logging**: Tamper-evident audit trails

```typescript
import { createSecurityManager } from '@tonaiagent/core/security';
import { createInstitutionalManager } from '@tonaiagent/core/institutional';

const security = createSecurityManager();
const institutional = createInstitutionalManager();

// Security layer handles cryptographic operations
// Institutional layer handles compliance and governance
```

## Best Practices

### 1. Account Setup

- Always use `initializeAccount()` for new institutional accounts
- Configure appropriate account type based on entity classification
- Set up role hierarchy before adding team members

### 2. KYC/AML

- Run full screening on all new counterparties
- Configure transaction monitoring rules based on risk appetite
- Regularly review and update sanctions lists
- Maintain proper documentation for audits

### 3. Approval Workflows

- Define clear escalation paths
- Set reasonable timeout periods
- Test emergency workflows regularly
- Document all approval decisions

### 4. Risk Management

- Update portfolio state frequently for accurate VaR
- Run stress tests at least weekly
- Review and adjust limits based on market conditions
- Set appropriate alert thresholds

### 5. AI Governance

- Enable human review for high-value decisions
- Maintain detailed decision logs
- Regularly review AI performance metrics
- Update safety constraints based on new risks

## Compliance Frameworks

The module supports common regulatory frameworks:

- **MiCA** (Markets in Crypto-Assets Regulation)
- **FATF** (Financial Action Task Force guidelines)
- **GDPR** (Data protection for EU entities)
- **SOC 2** (Security and availability controls)

## API Reference

For detailed API documentation, see the TypeScript types exported from the module:

```typescript
import type {
  // Account types
  InstitutionalAccount,
  InstitutionalAccountType,
  InstitutionalRole,
  AccountMember,

  // KYC/AML types
  KycProfile,
  KycDocument,
  ScreeningResult,
  TransactionMonitor,
  AmlAlert,

  // Workflow types
  ApprovalWorkflow,
  WorkflowStep,
  ApprovalRequest,

  // Reporting types
  ReportConfig,
  ReportTemplate,
  ScheduledReport,

  // Risk types
  RiskConfig,
  RiskMetrics,
  VarConfig,
  StressTestResult,

  // AI Governance types
  AIGovernanceConfig,
  AIDecisionRecord,
  HumanReviewRecord,
  SafetyConstraints,
} from '@tonaiagent/core/institutional';
```

## Changelog

### v1.1.0

- Initial release of Institutional & Compliance Layer
- Account management with RBAC
- KYC/AML integration
- Approval workflows
- Regulatory reporting
- Risk controls with VaR
- AI governance and explainability
