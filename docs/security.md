# TONAIAgent - Security & Key Management

## Overview

The TONAIAgent Security Layer provides production-grade security and key management for autonomous agents operating on the TON blockchain. The system ensures complete separation between AI decision-making and private key access, following zero-trust architecture principles.

### Key Features

- **Secure Key Management**: MPC, HSM, and BIP-32/44 key derivation
- **Multiple Custody Models**: Non-Custodial, Smart Contract Wallet, MPC
- **Multi-Layer Authorization**: 8-step transaction validation pipeline
- **Policy Framework**: Flexible permissions with preset templates
- **Risk & Fraud Detection**: Behavioral analysis and anomaly detection
- **Emergency Controls**: Kill switch, pause, and recovery mechanisms
- **Comprehensive Audit**: Tamper-proof logging and compliance reporting

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Key Management](#key-management)
4. [Custody Models](#custody-models)
5. [Transaction Authorization](#transaction-authorization)
6. [Policy & Permissions](#policy--permissions)
7. [Risk Engine](#risk-engine)
8. [Emergency & Recovery](#emergency--recovery)
9. [Audit & Compliance](#audit--compliance)
10. [Configuration](#configuration)
11. [API Reference](#api-reference)
12. [Best Practices](#best-practices)

---

## Quick Start

### Basic Usage

```typescript
import { createSecurityManager } from '@tonaiagent/core/security';

// Create security manager
const security = createSecurityManager({
  enabled: true,
  custody: {
    mode: 'mpc',
    userOwned: true,
    platformManaged: true,
    recoveryEnabled: true,
  },
  risk: {
    enabled: true,
    maxRiskScore: 80,
  },
});

// Create wallet for agent
const wallet = await security.custody.createWallet('user-1', 'agent-1');

// Authorize a transaction
const request = {
  id: 'tx-001',
  agentId: 'agent-1',
  userId: 'user-1',
  type: 'transfer',
  amount: '100',
  currency: 'TON',
  destination: 'EQC...',
  timestamp: new Date(),
  context: {
    intent: 'Send payment to user',
    strategy: 'swap',
    confidence: 0.95,
  },
};

const result = await security.authorization.authorize(request, {
  agentId: 'agent-1',
  userId: 'user-1',
  sessionId: 'session-1',
  permissions: wallet.permissions,
});

if (result.approved) {
  // Execute transaction
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Security Manager                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │    Key      │  │   Custody   │  │      Authorization          │  │
│  │  Manager    │  │  Provider   │  │         Engine              │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────────┘  │
│         │                │                      │                    │
│  ┌──────▼────────────────▼──────────────────────▼─────────────────┐  │
│  │                    Policy Manager                               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │    Risk     │  │  Emergency  │  │          Audit              │  │
│  │   Engine    │  │  Controller │  │         Logger              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Zero-Trust** | AI never has direct access to private keys |
| **Defense in Depth** | Multiple validation layers for every transaction |
| **Least Privilege** | Agents receive minimal required permissions |
| **Fail Secure** | System defaults to blocking on errors |
| **Auditability** | All actions are logged with tamper-proof signatures |

### Component Overview

| Component | Purpose |
|-----------|---------|
| **Key Manager** | Secure key generation, storage, and derivation |
| **Custody Provider** | Wallet management and transaction signing |
| **Authorization Engine** | Multi-layer transaction validation |
| **Policy Manager** | Permission and capability enforcement |
| **Risk Engine** | Transaction and behavioral risk scoring |
| **Emergency Controller** | Kill switch and pause functionality |
| **Recovery Manager** | Account recovery procedures |
| **Audit Logger** | Compliance logging and reporting |

---

## Key Management

### Overview

The key management system provides secure key generation, storage, and cryptographic operations while ensuring AI components never access private key material directly.

### Storage Backends

#### Software Storage (Development)

```typescript
import { createKeyManager, SoftwareKeyStorage } from '@tonaiagent/core/security';

const storage = new SoftwareKeyStorage({
  encryptionKey: process.env.KEY_ENCRYPTION_KEY,
  storagePath: './keys',
});

const keyManager = createKeyManager({ storage });
```

#### HSM Storage (Production)

```typescript
import { HSMKeyStorage } from '@tonaiagent/core/security';

const storage = new HSMKeyStorage({
  provider: 'aws-cloudhsm',
  clusterId: 'cluster-xyz',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
```

### Key Derivation (BIP-32/44)

Keys are derived using hierarchical deterministic paths for TON (coin type 607):

```typescript
import { KeyDerivationService } from '@tonaiagent/core/security';

const derivation = new KeyDerivationService();

// Standard TON path: m/44'/607'/account'/change/index
const path = derivation.getPath({
  purpose: 44,
  coinType: 607,
  account: 0,
  change: 0,
  index: 0,
});

// Derive a child key
const childKey = await derivation.derive(masterKey, path);
```

### MPC Coordination

Multi-Party Computation allows distributed key management without any single party holding the complete key:

```typescript
import { MPCCoordinator } from '@tonaiagent/core/security';

const mpc = new MPCCoordinator({
  threshold: 2,
  totalParties: 3,
  parties: [
    { id: 'user', endpoint: 'https://user-device' },
    { id: 'platform', endpoint: 'https://platform-hsm' },
    { id: 'backup', endpoint: 'https://backup-service' },
  ],
});

// Generate distributed key shares
const shareStatus = await mpc.getSharesStatus(keyId);

// Request signing (requires threshold parties)
const signature = await keyManager.requestSigning(keyId, message);
```

### Key Lifecycle

```typescript
// Generate a new key
const key = await keyManager.generateKey({
  algorithm: 'ed25519',
  purpose: 'signing',
  tags: ['agent-wallet'],
  autoRotate: true,
  rotationIntervalDays: 90,
});

// Rotate a key
const rotationResult = await keyManager.rotateKey(key.id);

// Revoke a key
await keyManager.revokeKey(key.id, 'compromised');
```

---

## Custody Models

### Overview

Three custody models provide different tradeoffs between security, user control, and automation:

| Model | User Control | Automation | Security | Use Case |
|-------|-------------|------------|----------|----------|
| **Non-Custodial** | Full | Manual approval | Highest | High-value assets |
| **Smart Contract Wallet** | High | Rule-based | High | Programmatic limits |
| **MPC** | Shared | Threshold-based | High | Team wallets |

### Non-Custodial Provider

User controls all keys; agent can only propose transactions:

```typescript
import { createCustodyProvider } from '@tonaiagent/core/security';

const custody = createCustodyProvider('non-custodial');

// Create wallet (user holds keys)
const wallet = await custody.createWallet('user-1', 'agent-1');

// Agent prepares transaction
const prepared = await custody.prepareTransaction(wallet.address, {
  to: 'EQC...',
  value: '100',
  data: '',
});

// User must approve and sign
const approval = await custody.requestApproval(wallet.address, prepared);

// User signs with their key
const signed = await custody.signTransaction(wallet.address, prepared, approval);
```

### Smart Contract Wallet Provider

On-chain rules enforce spending limits and allowed operations:

```typescript
const custody = createCustodyProvider('smart-contract');

// Create wallet with on-chain limits
const wallet = await custody.createWallet('user-1', 'agent-1', {
  dailyLimit: '1000',
  perTransactionLimit: '100',
  allowedDestinations: ['EQC...', 'EQD...'],
  allowedOperations: ['transfer', 'stake'],
});

// Transactions within limits auto-approve
const prepared = await custody.prepareTransaction(wallet.address, {
  to: 'EQC...',
  value: '50', // Under limit
});

// Simulate before execution
const simulation = await custody.simulateTransaction(wallet.address, prepared);
if (simulation.success) {
  const signed = await custody.signTransaction(wallet.address, prepared);
}
```

### MPC Custody Provider

Distributed signing requires threshold of parties:

```typescript
const custody = createCustodyProvider('mpc');

// Create MPC wallet (2-of-3 threshold)
const wallet = await custody.createWallet('user-1', 'agent-1', {
  threshold: 2,
  parties: ['user', 'platform', 'backup'],
});

// Prepare transaction
const prepared = await custody.prepareTransaction(wallet.address, txData);

// Gather approvals from threshold parties
const approvals = [];
approvals.push(await custody.requestApproval(wallet.address, prepared, 'user'));
approvals.push(await custody.requestApproval(wallet.address, prepared, 'platform'));

// Sign with combined approvals
const signed = await custody.signTransaction(wallet.address, prepared, approvals);
```

---

## Transaction Authorization

### Overview

Every transaction passes through an 8-layer validation pipeline before approval:

```
┌─────────────────────────────────────────────────────────────┐
│                    Transaction Request                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Layer 1: Intent Validation                                   │
│ - Verify AI reasoning is coherent                           │
│ - Check intent matches declared action                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Layer 2: Strategy Validation                                 │
│ - Verify trading/execution strategy                         │
│ - Check strategy parameters are valid                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Layer 3: Risk Engine                                         │
│ - Transaction risk scoring                                   │
│ - Behavioral analysis                                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Layer 4: Policy Engine                                       │
│ - Check permissions and capabilities                        │
│ - Evaluate policy rules                                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Layer 5: Limit Checks                                        │
│ - Per-transaction limits                                     │
│ - Daily/weekly/monthly limits                                │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Layer 6: Rate Limiting                                       │
│ - Transaction frequency                                      │
│ - Cooldown enforcement                                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Layer 7: Anomaly Detection                                   │
│ - Pattern analysis                                           │
│ - Historical comparison                                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Layer 8: Simulation                                          │
│ - Dry-run execution                                          │
│ - Verify expected outcomes                                   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    Authorization Result
                  (approved/denied/escalated)
```

### Usage

```typescript
import { createAuthorizationEngine } from '@tonaiagent/core/security';

const authorization = createAuthorizationEngine({
  enableSimulation: true,
  requireIntentValidation: true,
  defaultLimits: {
    perTransaction: 1000,
    daily: 5000,
    weekly: 20000,
    monthly: 50000,
  },
  rateLimiting: {
    maxPerHour: 10,
    cooldownSeconds: 60,
  },
});

// Authorize a transaction
const result = await authorization.authorize(request, context);

if (result.approved) {
  console.log('Transaction approved');
  console.log('Layers passed:', result.layerResults.map(l => l.layer));
} else if (result.escalated) {
  console.log('Requires human approval');
  console.log('Reason:', result.escalationReason);
} else {
  console.log('Transaction denied');
  console.log('Failed layer:', result.failedLayer);
  console.log('Reason:', result.denialReason);
}
```

### Custom Validators

```typescript
import { IntentValidator, StrategyValidator } from '@tonaiagent/core/security';

// Custom intent validator
class MyIntentValidator implements IntentValidator {
  async validate(request, context) {
    // Custom validation logic
    const isValid = await myCustomCheck(request.context.intent);

    return {
      valid: isValid,
      confidence: 0.95,
      reasoning: 'Intent aligns with user goals',
      warnings: [],
    };
  }
}

const authorization = createAuthorizationEngine({
  intentValidator: new MyIntentValidator(),
});
```

---

## Policy & Permissions

### Overview

The policy framework provides granular control over agent capabilities and transaction permissions.

### Permission Templates

Three preset templates cover common use cases:

```typescript
import { createPolicyManager, DEFAULT_TEMPLATES } from '@tonaiagent/core/security';

const policy = createPolicyManager();

// Conservative: Minimal permissions, requires approval
await policy.createAgent('agent-1', DEFAULT_TEMPLATES.conservative);

// Balanced: Standard trading with sensible limits
await policy.createAgent('agent-2', DEFAULT_TEMPLATES.balanced);

// Aggressive: Maximum automation for advanced users
await policy.createAgent('agent-3', DEFAULT_TEMPLATES.aggressive);
```

### Template Comparison

| Capability | Conservative | Balanced | Aggressive |
|------------|-------------|----------|------------|
| **Trading** | Read-only | Limited | Full |
| **Transfers** | Disabled | Whitelist only | Enabled |
| **Staking** | Read-only | Enabled | Full + Unstake |
| **NFT** | View only | Buy/Sell | Full + Create |
| **Governance** | Disabled | Vote only | Full |
| **Max Transaction** | 10 TON | 100 TON | 1000 TON |
| **Daily Limit** | 50 TON | 500 TON | 5000 TON |

### Custom Policies

```typescript
// Create custom permission set
const customPermissions = {
  capabilities: {
    trading: { enabled: true, maxSlippage: 0.01 },
    transfers: { enabled: true, whitelistOnly: true },
    staking: { enabled: true },
    nft: { enabled: false },
    governance: { enabled: false },
  },
  limits: {
    perTransaction: 500,
    daily: 2000,
    weekly: 10000,
    monthly: 30000,
  },
  allowedTokens: ['TON', 'USDT', 'NOT'],
  allowedDestinations: ['EQC...', 'EQD...'],
  requireApprovalAbove: 100,
};

await policy.createAgent('agent-4', customPermissions);
```

### Policy Rules

Define conditional rules for dynamic permission evaluation:

```typescript
// Add rule: Block large transfers to new addresses
await policy.addRule('agent-1', {
  id: 'new-dest-limit',
  name: 'New Destination Limit',
  conditions: [
    { field: 'amount', operator: 'gt', value: 50 },
    { field: 'isNewDestination', operator: 'eq', value: true },
  ],
  action: 'deny',
  priority: 100,
});

// Add rule: Require approval for after-hours trading
await policy.addRule('agent-1', {
  id: 'after-hours',
  name: 'After Hours Approval',
  conditions: [
    { field: 'hour', operator: 'gte', value: 22 },
    { field: 'amount', operator: 'gt', value: 10 },
  ],
  action: 'escalate',
  priority: 50,
});
```

### Capability Checks

```typescript
// Check if agent can perform an action
const canTrade = await policy.checkCapability('agent-1', 'trade', {
  amount: 100,
  token: 'TON',
  pair: 'TON/USDT',
});

if (!canTrade.allowed) {
  console.log('Trading blocked:', canTrade.reason);
  console.log('Violation:', canTrade.violatedRule);
}
```

---

## Risk Engine

### Overview

The risk engine provides real-time transaction risk assessment using multiple scoring dimensions:

- **Transaction Risk**: Inherent risk of the specific transaction
- **Behavioral Risk**: Deviation from historical patterns
- **Market Risk**: Current market conditions and volatility
- **Aggregate Risk**: Combined weighted score

### Risk Assessment

```typescript
import { createRiskEngine } from '@tonaiagent/core/security';

const risk = createRiskEngine({
  enabled: true,
  maxRiskScore: 80,
  anomalyThreshold: 2.0,  // Standard deviations
  weights: {
    transaction: 0.4,
    behavioral: 0.3,
    market: 0.3,
  },
});

// Assess transaction risk
const history = await getTransactionHistory('agent-1');
const assessment = await risk.assessTransaction(request, history);

console.log('Risk Score:', assessment.score);
console.log('Risk Level:', assessment.level);  // low, medium, high, critical
console.log('Breakdown:', assessment.breakdown);

if (assessment.score > 80) {
  console.log('Transaction blocked due to high risk');
}
```

### Anomaly Detection

```typescript
// Check for behavioral anomalies
const anomaly = await risk.detectAnomalies(request, history);

if (anomaly.isAnomaly) {
  console.log('Anomaly detected!');
  console.log('Type:', anomaly.type);
  console.log('Deviation:', anomaly.deviationScore, 'standard deviations');
  console.log('Details:', anomaly.details);
}
```

### Fraud Patterns

Built-in fraud pattern detection:

```typescript
// Check for known fraud patterns
const fraudCheck = await risk.checkFraudPatterns(request, history);

for (const pattern of fraudCheck.matchedPatterns) {
  console.log('Pattern:', pattern.name);
  console.log('Confidence:', pattern.confidence);
  console.log('Action:', pattern.recommendedAction);
}
```

| Pattern | Description | Action |
|---------|-------------|--------|
| `rapid_drain` | Many transactions in short time | Block |
| `new_dest_large` | Large transfer to new address | Escalate |
| `round_numbers` | Unusual round amounts | Flag |
| `timing_attack` | Transactions at unusual hours | Monitor |
| `gradual_increase` | Steadily increasing amounts | Alert |

### Blacklist Management

```typescript
// Add address to blacklist
await risk.addToBlacklist('EQC...malicious', {
  reason: 'Known scam address',
  source: 'community_report',
  severity: 'high',
});

// Check if address is blacklisted
const isBlacklisted = await risk.isBlacklisted('EQC...');
```

---

## Emergency & Recovery

### Emergency Controller

The emergency controller provides mechanisms to halt agent operations in case of security incidents:

```typescript
import { createEmergencyController } from '@tonaiagent/core/security';

const emergency = createEmergencyController({
  killSwitchEnabled: true,
  autoResponseEnabled: true,
  autoResponseTriggers: [
    { event: 'multiple_failures', threshold: 5, action: 'pause' },
    { event: 'anomaly_detected', threshold: 3, action: 'pause' },
    { event: 'fraud_detected', threshold: 1, action: 'kill' },
  ],
});

// Activate kill switch (stops ALL agent operations)
await emergency.activateKillSwitch({
  reason: 'Security incident detected',
  triggeredBy: 'security-team',
});

// Check status
if (emergency.isKillSwitchActive()) {
  console.log('System is in emergency mode');
}

// Pause specific agent
await emergency.pauseAgent('agent-1', {
  reason: 'Suspicious activity',
  duration: 3600, // 1 hour
});

// Resume after investigation
await emergency.resumeAgent('agent-1', {
  approvedBy: 'security-team',
  notes: 'False positive, resuming operations',
});

// Deactivate kill switch
await emergency.deactivateKillSwitch({
  approvedBy: 'admin',
  notes: 'Incident resolved',
});
```

### Recovery Manager

The recovery manager handles account recovery for lost access:

```typescript
import { createRecoveryManager } from '@tonaiagent/core/security';

const recovery = createRecoveryManager({
  verificationRequired: ['email', 'phone', 'identity'],
  cooldownPeriod: 86400, // 24 hours
  maxAttempts: 3,
});

// Initiate recovery
const session = await recovery.initiateRecovery('user-1', {
  method: 'social',
  contacts: ['guardian-1', 'guardian-2', 'guardian-3'],
});

// Submit verification
const verified = await recovery.submitVerification(session.id, {
  step: 'email',
  code: '123456',
});

// Complete recovery after all verifications
if (verified.allStepsComplete) {
  const result = await recovery.completeRecovery(session.id, {
    newCredentials: { /* ... */ },
  });

  if (result.success) {
    console.log('Recovery successful');
    console.log('New wallet:', result.newWalletAddress);
  }
}
```

---

## Audit & Compliance

### Overview

The audit system provides comprehensive logging with tamper-proof signatures for compliance and forensic analysis.

### Audit Logging

```typescript
import { createAuditLogger } from '@tonaiagent/core/security';

const audit = createAuditLogger({
  enabled: true,
  retentionDays: 365,
  signEvents: true,
  compressionEnabled: true,
});

// Log a security event
audit.log({
  eventType: 'transaction_authorized',
  actor: { type: 'agent', id: 'agent-1' },
  action: 'transfer',
  resource: { type: 'wallet', id: 'EQC...' },
  outcome: 'success',
  severity: 'info',
  details: {
    amount: '100',
    destination: 'EQD...',
    riskScore: 25,
  },
  context: {
    requestId: 'req-001',
    sessionId: 'session-001',
    ipAddress: '192.168.1.1',
  },
});
```

### Querying Audit Logs

```typescript
// Query recent events
const events = await audit.query({
  startDate: new Date('2026-02-01'),
  endDate: new Date(),
  eventTypes: ['transaction_authorized', 'transaction_denied'],
  actors: ['agent-1'],
  severity: ['warning', 'error', 'critical'],
  limit: 100,
});

for (const event of events.entries) {
  console.log(`${event.timestamp}: ${event.action} - ${event.outcome}`);
}
```

### Compliance Reports

```typescript
// Generate compliance report
const report = await audit.generateReport({
  type: 'monthly',
  startDate: new Date('2026-02-01'),
  endDate: new Date('2026-02-28'),
  includeDetails: true,
});

console.log('Report Summary:');
console.log('- Total Events:', report.summary.totalEvents);
console.log('- Success Rate:', report.summary.successRate);
console.log('- Risk Events:', report.summary.riskEvents);
console.log('- Compliance Score:', report.summary.complianceScore);

// Export to CSV
const csv = await audit.export({
  format: 'csv',
  filter: { severity: ['error', 'critical'] },
  fields: ['timestamp', 'actor', 'action', 'outcome', 'details'],
});

await fs.writeFile('audit-report.csv', csv.data);
```

### Integrity Verification

```typescript
// Verify log integrity
const integrity = await audit.verifyIntegrity({
  startDate: new Date('2026-02-01'),
  endDate: new Date(),
});

if (integrity.valid) {
  console.log('All logs verified');
  console.log('Chain hash:', integrity.chainHash);
} else {
  console.error('Integrity violation detected!');
  console.error('Invalid entries:', integrity.invalidEntries);
}
```

---

## Configuration

### Full Configuration Example

```typescript
import { createSecurityManager, SecurityConfig } from '@tonaiagent/core/security';

const config: SecurityConfig = {
  // Global enable/disable
  enabled: true,

  // Custody configuration
  custody: {
    mode: 'mpc',
    userOwned: true,
    platformManaged: true,
    recoveryEnabled: true,
    mpcThreshold: 2,
    mpcParties: 3,
  },

  // MPC configuration
  mpc: {
    threshold: 2,
    totalParties: 3,
    parties: [
      { id: 'user', type: 'user_device' },
      { id: 'platform', type: 'platform_hsm' },
      { id: 'backup', type: 'backup_service' },
    ],
    signatureScheme: 'ed25519',
    timeoutMs: 30000,
  },

  // Key derivation
  keyDerivation: {
    scheme: 'bip44',
    coinType: 607,  // TON
    hardened: true,
    cacheEnabled: true,
  },

  // Authorization configuration
  authorization: {
    enableSimulation: true,
    requireIntentValidation: true,
    defaultLimits: {
      perTransaction: 1000,
      daily: 5000,
      weekly: 20000,
      monthly: 50000,
    },
    rateLimiting: {
      maxPerHour: 10,
      cooldownSeconds: 60,
    },
  },

  // Risk configuration
  risk: {
    enabled: true,
    maxRiskScore: 80,
    anomalyThreshold: 2.0,
    weights: {
      transaction: 0.4,
      behavioral: 0.3,
      market: 0.3,
    },
    fraudDetectionEnabled: true,
  },

  // Emergency configuration
  emergency: {
    killSwitchEnabled: true,
    autoResponseEnabled: true,
    autoResponseTriggers: [
      { event: 'fraud_detected', threshold: 1, action: 'kill' },
      { event: 'anomaly_detected', threshold: 3, action: 'pause' },
    ],
    notificationEndpoints: [
      { type: 'webhook', url: 'https://alerts.example.com' },
      { type: 'email', address: 'security@example.com' },
    ],
  },

  // Audit configuration
  audit: {
    enabled: true,
    retentionDays: 365,
    signEvents: true,
    compressionEnabled: true,
    exportFormats: ['json', 'csv'],
  },
};

const security = createSecurityManager(config);
```

### Environment Variables

```bash
# Key Management
KEY_ENCRYPTION_KEY=your-encryption-key-here
HSM_PROVIDER=aws-cloudhsm
HSM_CLUSTER_ID=cluster-xyz

# MPC Configuration
MPC_THRESHOLD=2
MPC_TOTAL_PARTIES=3

# Security Thresholds
MAX_TRANSACTION_TON=1000
MAX_DAILY_TON=5000
MAX_RISK_SCORE=80

# Emergency Contacts
SECURITY_WEBHOOK_URL=https://alerts.example.com
SECURITY_EMAIL=security@example.com
```

---

## API Reference

### SecurityManager

| Method | Description |
|--------|-------------|
| `getHealth()` | Get overall security system health |
| `onEvent(callback)` | Subscribe to security events |

### KeyManagementService

| Method | Description |
|--------|-------------|
| `generateKey(config)` | Generate a new key |
| `getKey(keyId)` | Retrieve key metadata |
| `listKeys(options)` | List keys with filtering |
| `rotateKey(keyId)` | Rotate a key |
| `revokeKey(keyId, reason)` | Revoke a key |
| `requestSigning(keyId, message)` | Request MPC signing |
| `getHealth()` | Get key management health |

### CustodyProvider

| Method | Description |
|--------|-------------|
| `createWallet(userId, agentId)` | Create a new wallet |
| `getWallet(address)` | Get wallet details |
| `listWallets(userId)` | List user's wallets |
| `prepareTransaction(address, tx)` | Prepare transaction |
| `simulateTransaction(address, tx)` | Simulate transaction |
| `requestApproval(address, tx)` | Request signing approval |
| `signTransaction(address, tx, approval)` | Sign transaction |
| `initiateRecovery(address)` | Start recovery process |

### AuthorizationEngine

| Method | Description |
|--------|-------------|
| `authorize(request, context)` | Authorize a transaction |
| `validateIntent(request, context)` | Validate transaction intent |
| `validateStrategy(request, context)` | Validate execution strategy |
| `simulate(request)` | Simulate transaction |
| `onEvent(callback)` | Subscribe to authorization events |

### PolicyManager

| Method | Description |
|--------|-------------|
| `createAgent(agentId, permissions)` | Create agent with permissions |
| `getAgent(agentId)` | Get agent permissions |
| `updateAgent(agentId, permissions)` | Update agent permissions |
| `deleteAgent(agentId)` | Remove agent |
| `addRule(agentId, rule)` | Add policy rule |
| `removeRule(agentId, ruleId)` | Remove policy rule |
| `checkCapability(agentId, capability, context)` | Check capability |

### RiskEngine

| Method | Description |
|--------|-------------|
| `assessTransaction(request, history)` | Assess transaction risk |
| `detectAnomalies(request, history)` | Detect behavioral anomalies |
| `checkFraudPatterns(request, history)` | Check fraud patterns |
| `addToBlacklist(address, details)` | Add to blacklist |
| `removeFromBlacklist(address)` | Remove from blacklist |
| `isBlacklisted(address)` | Check blacklist status |

### EmergencyController

| Method | Description |
|--------|-------------|
| `activateKillSwitch(details)` | Activate kill switch |
| `deactivateKillSwitch(approval)` | Deactivate kill switch |
| `isKillSwitchActive()` | Check kill switch status |
| `pauseAgent(agentId, details)` | Pause specific agent |
| `resumeAgent(agentId, approval)` | Resume agent |
| `getActiveEmergencies()` | List active emergencies |

### AuditLogger

| Method | Description |
|--------|-------------|
| `log(event)` | Log audit event |
| `query(filter)` | Query audit logs |
| `generateReport(options)` | Generate compliance report |
| `export(options)` | Export logs |
| `verifyIntegrity(options)` | Verify log integrity |

---

## Best Practices

### 1. Use MPC for Production

Always use MPC custody for production deployments:

```typescript
const security = createSecurityManager({
  custody: { mode: 'mpc' },
  mpc: {
    threshold: 2,
    totalParties: 3,
  },
});
```

### 2. Start with Conservative Permissions

Begin with conservative templates and gradually expand:

```typescript
// Start conservative
await policy.createAgent('agent-1', DEFAULT_TEMPLATES.conservative);

// Expand after trust is established
await policy.updateAgent('agent-1', {
  ...DEFAULT_TEMPLATES.balanced,
  limits: { perTransaction: 200 },  // Still lower than default
});
```

### 3. Enable All Monitoring

Enable comprehensive monitoring in production:

```typescript
const security = createSecurityManager({
  risk: { enabled: true, fraudDetectionEnabled: true },
  emergency: { autoResponseEnabled: true },
  audit: { enabled: true, signEvents: true },
});
```

### 4. Set Appropriate Limits

Configure limits based on your use case:

```typescript
authorization: {
  defaultLimits: {
    perTransaction: 100,   // Conservative
    daily: 500,
    weekly: 2000,
    monthly: 5000,
  },
}
```

### 5. Handle Escalations

Always implement escalation handling:

```typescript
const result = await security.authorization.authorize(request, context);

if (result.escalated) {
  // Notify user for approval
  await notifyUser(context.userId, {
    type: 'approval_required',
    request,
    reason: result.escalationReason,
  });

  // Wait for user decision
  const decision = await waitForUserDecision(request.id);

  if (decision.approved) {
    // Re-authorize with user approval
    const finalResult = await security.authorization.authorize(request, {
      ...context,
      userApproved: true,
    });
  }
}
```

### 6. Regular Key Rotation

Enable automatic key rotation:

```typescript
const key = await keyManager.generateKey({
  autoRotate: true,
  rotationIntervalDays: 90,
});
```

### 7. Audit Log Retention

Maintain adequate log retention for compliance:

```typescript
audit: {
  enabled: true,
  retentionDays: 365,  // 1 year minimum
  signEvents: true,    // Tamper-proof
}
```

### 8. Emergency Preparedness

Configure auto-response triggers:

```typescript
emergency: {
  autoResponseEnabled: true,
  autoResponseTriggers: [
    { event: 'fraud_detected', threshold: 1, action: 'kill' },
    { event: 'anomaly_detected', threshold: 3, action: 'pause' },
    { event: 'multiple_failures', threshold: 5, action: 'pause' },
  ],
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-20 | Initial release with full security layer |

---

## License

MIT License - Copyright (c) 2026 TONAIAgent Team
