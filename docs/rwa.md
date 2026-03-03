# Real World Assets (RWA) & Tokenized Funds

## Overview

The RWA module provides a comprehensive infrastructure layer for tokenization of real-world assets, AI-driven allocation, institutional-grade compliance, hybrid portfolios, liquidity management, and cross-chain integration on The Open Network.

```
Investors → Tokenized Fund Shares → Institutional Vault → AI Allocation Engine
         ↓                                                         ↓
  Compliance Layer                                    Crypto + RWA Strategies
         ↓                                                         ↓
  KYC/AML/Accreditation                              Execution Layer (TON/ETH/...)
```

## Features

- **RWA Tokenization Framework** — On-chain representation of real estate, bonds, private credit, commodities, and more
- **Legal & Compliance Mapping** — Asset-backed token standards with legal document management, audit trails, and proof of reserves
- **Compliance & Legal Layer** — KYC/AML, jurisdictional restrictions, accredited investor verification, institutional onboarding
- **AI Allocation Engine** — AI-driven yield comparison, risk-adjusted return optimization, volatility hedging
- **Hybrid Portfolio Engine** — Crypto + RWA portfolios with dynamic rebalancing, yield stacking, and analytics
- **Liquidity & Redemption** — Secondary markets, redemption queues, liquidity routing
- **Cross-Chain Integration** — Ethereum RWA protocols (Ondo, Maple, Centrifuge), multi-chain bridging, protocol registry

## Quick Start

```typescript
import { createRWAManager } from '@tonaiagent/core/rwa';

// Create the unified RWA manager
const rwa = createRWAManager({
  tokenization: { requireAuditBeforeActivation: true },
  compliance: { strictMode: true, accreditationRequired: true },
});

// 1. Tokenize a real estate asset
const result = await rwa.tokenization.tokenizeAsset({
  assetClass: 'real_estate',
  name: 'NYC Office Tower REIT',
  symbol: 'NYCOT',
  description: 'Tokenized office real estate in Manhattan',
  issuer: 'Prime Real Estate Fund',
  custodian: 'Fireblocks',
  jurisdiction: 'US',
  totalValue: 100_000_000,
  currency: 'USD',
  tokenSupply: 1_000_000,
  minimumInvestment: 10_000,
  yieldRate: 0.065, // 6.5% annual yield
});

console.log('Asset tokenized:', result.assetId);
console.log('Status:', result.status); // 'pending_legal'
console.log('Next steps:', result.nextSteps);

// 2. Add legal documents and audit
await rwa.tokenization.addLegalDocument(result.assetId, {
  type: 'prospectus',
  name: 'Offering Prospectus',
  hash: 'sha256:abc123...',
  jurisdiction: 'US',
  validFrom: new Date(),
});

await rwa.tokenization.addAuditReport(result.assetId, {
  auditor: 'KPMG',
  reportType: 'financial',
  period: 'Q4 2024',
  findings: 'All reserves verified and compliant',
  hash: 'sha256:def456...',
  publishedAt: new Date(),
});

await rwa.tokenization.updateProofOfReserves(result.assetId, {
  totalAssetValue: 105_000_000,
  totalTokenizedValue: 100_000_000,
  collateralizationRatio: 1.05,
  lastVerified: new Date(),
  verifier: 'Chainalysis',
  attestationHash: 'sha256:ghi789...',
  breakdown: [],
});

// Activate the asset
await rwa.tokenization.activateAsset(result.assetId);

// 3. Onboard an investor
const investor = await rwa.compliance.createInvestorProfile(
  'user_123',
  'accredited',
  { allowedJurisdictions: ['US', 'EU'] }
);

await rwa.compliance.approveKyc(investor.id, 'enhanced');
await rwa.compliance.approveAml(investor.id);
await rwa.compliance.verifyAccreditation(investor.id, {
  type: 'net_worth',
  verifiedBy: 'CPA Firm',
  verificationDate: new Date(),
  netWorth: 5_000_000,
});

// 4. Check investor eligibility
const access = await rwa.compliance.checkInvestorAccess(
  investor.id,
  result.assetId,
  'real_estate',
  'US',
  100_000
);

if (access.allowed) {
  console.log('Access granted!');
} else {
  console.log('Access denied:', access.reasons);
}

// 5. Get AI allocation recommendation
rwa.allocation.registerOpportunity({
  assetId: result.assetId,
  assetClass: 'real_estate',
  name: 'NYC Office Tower REIT',
  yieldRate: 0.065,
  riskScore: 35,      // 0-100 scale
  liquidityScore: 60, // 0-100 scale
  minimumInvestment: 10_000,
  availableAmount: 100_000_000,
  jurisdiction: 'US',
  aiScore: 0,   // Will be auto-calculated
  reasoning: '',
});

const recommendation = rwa.allocation.generateRecommendation(
  5_000_000, // $5M portfolio
  {
    strategy: 'balanced',
    maxRWAAllocation: 0.40,    // Max 40% in RWAs
    minCryptoAllocation: 0.40, // Min 40% in crypto
    rebalanceThreshold: 0.05,  // Rebalance when 5% drift
    riskTolerance: 'moderate',
    preferredAssetClasses: ['real_estate', 'government_bonds'],
    parameters: {},
  },
  0.08 // 8% crypto yield
);

console.log('Recommended crypto allocation:', recommendation.cryptoAllocation * 100, '%');
console.log('Recommended RWA allocation:', recommendation.rwaAllocation * 100, '%');
console.log('Expected yield:', recommendation.expectedYield * 100, '%');
console.log('Confidence:', recommendation.confidence);
```

## Modules

### Tokenization Manager

Handles on-chain representation of off-chain assets.

```typescript
import { createTokenizationManager } from '@tonaiagent/core/rwa';

const tokenization = createTokenizationManager({
  requireAuditBeforeActivation: true,
  proofOfReservesFrequency: 'daily',
  auditRefreshDays: 90,
  supportedJurisdictions: ['US', 'EU', 'UK', 'SG'],
});

// Tokenize assets
const result = await tokenization.tokenizeAsset({ ... });

// Manage lifecycle
await tokenization.activateAsset(assetId);
await tokenization.updatePrice(assetId, newPrice);
await tokenization.distributeYield(assetId);
await tokenization.suspendAsset(assetId, 'Regulatory review');

// Proof of reserves
await tokenization.updateProofOfReserves(assetId, {
  collateralizationRatio: 1.05,
  ...
});
```

### Compliance Manager

KYC/AML, jurisdictional restrictions, accredited investor verification.

```typescript
import { createComplianceManager } from '@tonaiagent/core/rwa';

const compliance = createComplianceManager({
  strictMode: true,
  kycRefreshDays: 365,
  accreditationRequired: true,
});

// Investor lifecycle
const investor = await compliance.createInvestorProfile(userId, 'accredited');
await compliance.approveKyc(investor.id, 'enhanced');
await compliance.approveAml(investor.id);

// Accreditation
await compliance.verifyAccreditation(investor.id, {
  type: 'net_worth',       // or 'annual_income', 'institutional', 'professional_certification'
  netWorth: 5_000_000,
  verifiedBy: 'CPA Firm',
  verificationDate: new Date(),
});

// Access control
const access = await compliance.checkInvestorAccess(
  investorId, assetId, assetClass, jurisdiction, amount
);

// Institutional onboarding
const onboarding = await compliance.submitInstitutionalOnboarding({
  organizationName: 'Alpha Capital Fund',
  organizationType: 'fund',
  jurisdiction: 'US',
  lei: 'USABC12345678901',
  regulatoryRegistrations: ['SEC', 'FINRA'],
  aum: 500_000_000,
  documents: [],
  metadata: {},
});

await compliance.reviewInstitutionalOnboarding(onboarding.id, true);

// Regulatory audit
const report = compliance.generateAuditReport();
```

### AI Allocation Engine

AI-driven asset allocation between crypto and RWAs.

```typescript
import { createAllocationEngine } from '@tonaiagent/core/rwa';

const allocation = createAllocationEngine({
  defaultStrategy: 'balanced',
  aiEnabled: true,
  rebalanceFrequency: 'daily',
});

// Register opportunities
allocation.registerOpportunity({ assetId, assetClass, yieldRate, riskScore, ... });

// Generate allocation recommendation
const recommendation = allocation.generateRecommendation(
  portfolioValue,
  allocationConfig,
  cryptoYield
);

// Compare yields
const comparison = allocation.compareYields(cryptoYield, rwaOpportunities);
// Returns: { recommendation: 'increase_rwa' | 'increase_crypto' | 'maintain', ... }

// Optimize RWA allocation
const optimized = allocation.optimizeAllocation(budget, opportunities, config);

// Volatility hedge recommendation
const hedge = allocation.calculateVolatilityHedge(cryptoVolatility, portfolioValue);
```

### Hybrid Portfolio Engine

Manages crypto + RWA hybrid portfolios.

```typescript
import { createHybridPortfolioEngine } from '@tonaiagent/core/rwa';

const engine = createHybridPortfolioEngine();

// Create portfolio
const portfolio = await engine.createPortfolio(name, ownerId, allocationConfig, initialCash);

// Add positions
await engine.addCryptoPosition(portfolio.id, { asset: 'TON', marketValue: 50000, ... });
await engine.addRWAPosition(portfolio.id, { assetId, assetName, assetClass: 'real_estate', ... });

// Rebalancing
const check = engine.checkRebalanceNeeded(portfolio.id);
if (check.needsRebalance) {
  const orders = engine.generateRebalanceOrders(portfolio.id);
  const result = await engine.executeRebalance(portfolio.id, orders);
}

// Analytics
const performance = engine.calculatePerformance(portfolio.id, '30d');
const risk = engine.calculateRiskMetrics(portfolio.id);
const yieldDashboard = engine.getYieldDashboard(portfolio.id);

// Tokenized funds
const fund = await engine.createTokenizedFund({
  name: 'TON Hybrid Fund',
  symbol: 'THF',
  fundType: 'open_ended',
  strategy: 'balanced',
  managementFee: 0.015,
  performanceFee: 0.20,
  minimumInvestment: 100_000,
  ...
});

const subscription = await engine.subscribeFund(fund.id, investorId, amount, currency);
await engine.processSubscriptions(fund.id);
```

### Liquidity Manager

Secondary markets, redemption frameworks, and liquidity routing.

```typescript
import { createLiquidityManager } from '@tonaiagent/core/rwa';

const liquidity = createLiquidityManager({
  minimumLiquidityBuffer: 0.10,
  earlyRedemptionPenaltyRate: 0.02,
  emergencyRedemptionEnabled: true,
});

// Create liquidity pool
const pool = await liquidity.createPool(assetId, assetName, initialLiquidity);

// Add liquidity sources
await liquidity.addLiquiditySource(pool.id, {
  type: 'secondary_market',
  name: 'OTC Market',
  availableLiquidity: 5_000_000,
  priceImpact: 0.005,
  settlementDays: 2,
  minimumSize: 10_000,
  isActive: true,
});

// Redemptions
const redemption = await liquidity.submitRedemption(
  investorId, assetId, tokenAmount, currency, 'standard'
);

await liquidity.processRedemptions(assetId);

// Liquidity routing
const routing = await liquidity.routeLiquidity(assetId, amount, 'medium');

// Secondary market
const listing = await liquidity.createSecondaryListing(assetId, sellerId, amount, price);
const trade = await liquidity.executeSecondaryTrade(listing.id, buyerId, tradeAmount);
```

### Cross-Chain Manager

Multi-chain RWA integration and bridging.

```typescript
import { createCrossChainManager } from '@tonaiagent/core/rwa';

const crossChain = createCrossChainManager({
  enabledChains: ['ton', 'ethereum', 'polygon'],
  maxBridgeFee: 100,        // 1% in basis points
  minSecurityScore: 70,
});

// Register and use bridges
const bridge = await crossChain.registerBridge({
  name: 'TON-ETH Bridge',
  sourceChain: 'ton',
  targetChain: 'ethereum',
  bridgeFee: 30,            // 0.3%
  estimatedTime: 30,        // Minutes
  securityScore: 85,
  isActive: true,
  ...
});

// Initiate cross-chain transfer
const tx = await crossChain.initiateBridge(
  bridge.id, assetId, amount, fromAddress, toAddress
);

// Find optimal bridge
const recommendation = crossChain.findOptimalBridge('ton', 'ethereum', 100_000);

// RWA protocol registry (pre-loaded with Ondo, Maple, Centrifuge, TrueFi, Goldfinch)
const protocols = crossChain.listProtocols({
  riskRating: ['low', 'medium'],
  audited: true,
  assetClass: ['treasury_bills'],
});
```

## Supported Asset Classes

| Asset Class | Description | Typical Yield | Risk Level |
|-------------|-------------|---------------|------------|
| `treasury_bills` | Short-term government securities | 4-6% | Very Low |
| `government_bonds` | Long-term government bonds | 3-5% | Low |
| `money_market` | Money market instruments | 4-5% | Very Low |
| `corporate_bonds` | Investment-grade corporate debt | 5-8% | Low-Medium |
| `private_credit` | Private lending and credit | 7-12% | Medium |
| `real_estate` | Tokenized real estate / REITs | 5-9% | Medium |
| `commodities` | Gold, silver, other commodities | Varies | Medium |
| `infrastructure` | Infrastructure projects | 6-9% | Medium |
| `private_equity` | Private company equity | 10-20%+ | High |
| `structured_products` | CDOs, CLOs, structured notes | 6-15% | Medium-High |

## Supported Protocols

| Protocol | Chain | Type | TVL | Risk |
|----------|-------|------|-----|------|
| Ondo Finance | Ethereum | Tokenization | $500M+ | Low |
| Maple Finance | Ethereum | Lending | $200M+ | Medium |
| Centrifuge | Ethereum | Tokenization | $150M+ | Medium |
| TrueFi | Ethereum | Lending | $100M+ | Medium |
| Goldfinch | Ethereum | Lending | $80M+ | High |

## Supported Chains

| Chain | Status | Use Case |
|-------|--------|----------|
| TON | Active | Primary chain, native integration |
| Ethereum | Active | RWA protocol ecosystem hub |
| Polygon | Active | Low-cost transactions |
| Arbitrum | Active | L2 efficiency |
| Solana | Planned | High-speed institutional settlements |
| Avalanche | Planned | Institutional subnet integration |

## Jurisdiction Support

| Jurisdiction | Investor Types Allowed | KYC Required | Accreditation |
|-------------|------------------------|--------------|---------------|
| US | Accredited, Qualified Institutional | Enhanced | Required |
| EU | All professional | Enhanced | Not required |
| UK | All professional | Enhanced | Not required |
| SG | Accredited, Qualified Institutional | Enhanced | Required |
| CH | All types | Basic | Not required |

## Event System

All managers emit events that can be subscribed to:

```typescript
const rwa = createRWAManager();

// Subscribe to all events
rwa.onEvent((event) => {
  console.log(`[${event.severity}] ${event.source}: ${event.message}`);
  // event.type: 'asset_tokenized' | 'compliance_approved' | 'allocation_updated' | ...
});

// Or subscribe to individual managers
rwa.tokenization.onEvent(event => { ... });
rwa.compliance.onEvent(event => { ... });
```

## System Status

```typescript
const status = rwa.getSystemStatus();
console.log({
  tokenizedAssets: status.tokenizedAssets,
  activeAssets: status.activeAssets,
  registeredInvestors: status.registeredInvestors,
  approvedInvestors: status.approvedInvestors,
  liquidityPools: status.liquidityPools,
  registeredProtocols: status.registeredProtocols,
  activeBridges: status.activeBridges,
});
```

## Architecture

```
src/rwa/
├── types.ts           # Core type definitions
├── tokenization.ts    # RWA tokenization framework
├── compliance.ts      # KYC/AML, accreditation, jurisdiction rules
├── allocation.ts      # AI allocation engine
├── portfolio.ts       # Hybrid portfolio + tokenized fund management
├── liquidity.ts       # Liquidity pools, redemptions, secondary market
├── cross-chain.ts     # Multi-chain bridges and RWA protocol registry
└── index.ts           # Unified RWA manager + all exports
```

## Related Modules

- **`@tonaiagent/core/institutional`** — Institutional accounts, custody, AI governance
- **`@tonaiagent/core/hedgefund`** — Autonomous AI hedge fund infrastructure
- **`@tonaiagent/core/investment`** — Autonomous AI investment layer
- **`@tonaiagent/core/omnichain`** — Cross-chain portfolio management
- **`@tonaiagent/core/regulatory`** — Regulatory strategy and compliance framework
