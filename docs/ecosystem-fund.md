# TONAIAgent - Ecosystem Fund

## Overview

The TON AI Ecosystem Fund is a structured capital allocation framework designed to accelerate growth, innovation, and adoption of the TON AI platform and its surrounding ecosystem.

The fund supports:
- Developers
- Startups
- Infrastructure projects
- Trading strategies
- Data providers
- Integrations
- Research initiatives

### Key Features

- **On-Chain Treasury**: Transparent, multi-sig controlled fund management
- **DAO Governance**: Community-driven decision making with committee oversight
- **Grant Programs**: Developer grants, research funding, and hackathons
- **Strategic Investments**: Equity, token, and revenue share investments
- **Incubation**: Accelerator programs with mentorship and resources
- **Integration Incentives**: Rewards for wallet, plugin, and data integrations
- **Flywheel Metrics**: Real-time tracking of ecosystem health
- **AI Evaluation**: Groq-powered application assessment

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Treasury Management](#treasury-management)
4. [Fund Governance](#fund-governance)
5. [Grant Programs](#grant-programs)
6. [Strategic Investments](#strategic-investments)
7. [Incubation & Acceleration](#incubation--acceleration)
8. [Integration Incentives](#integration-incentives)
9. [Ecosystem Flywheel](#ecosystem-flywheel)
10. [AI Evaluation](#ai-evaluation)
11. [Configuration](#configuration)
12. [API Reference](#api-reference)

---

## Quick Start

### Basic Usage

```typescript
import { createEcosystemFundManager } from '@tonaiagent/core/ecosystem-fund';

// Create the ecosystem fund manager
const fund = createEcosystemFundManager({
  treasury: {
    multisigRequired: true,
    multisigThreshold: 3,
    maxSingleAllocation: '100000',
  },
  governance: {
    votingPeriod: 7,
    quorumPercent: 10,
    supermajorityPercent: 67,
  },
  grants: {
    enabled: true,
    maxGrantAmount: '100000',
  },
  investments: {
    enabled: true,
    riskTolerance: 'moderate',
  },
});

// Deposit funds to treasury
await fund.treasury.deposit('1000000', 'TON');

// Submit a grant application
const application = await fund.grants.submitApplication({
  categoryId: 'developer-tools',
  title: 'TypeScript SDK Enhancement',
  description: 'Add new modules to the SDK',
  requestedAmount: '15000',
  milestones: [...],
  team: [...],
}, applicant);

// Get flywheel health
const metrics = await fund.flywheel.collectMetrics();
console.log('Flywheel Score:', metrics.flywheel.overall);
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Ecosystem Fund Manager                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │    Treasury     │  │   Governance    │  │     Grant Programs      │  │
│  │   Management    │  │     Engine      │  │                         │  │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘  │
│           │                    │                        │                │
│  ┌────────▼────────────────────▼────────────────────────▼─────────────┐  │
│  │                    Strategic Investments                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   Incubation    │  │   Integration   │  │    Ecosystem Flywheel   │  │
│  │  & Acceleration │  │   Incentives    │  │       & Metrics         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                  AI-Powered Evaluation (Groq)                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Purpose |
|-----------|---------|
| **Treasury** | Multi-sig controlled fund custody and allocation |
| **Governance** | DAO proposals, voting, and committee decisions |
| **Grants** | Developer grants, research funding, hackathons |
| **Investments** | Strategic investments in ecosystem projects |
| **Incubation** | Accelerator programs with mentorship |
| **Incentives** | Integration rewards and bounties |
| **Flywheel** | Ecosystem health metrics and alerts |
| **AI Evaluation** | Automated application assessment |

---

## Treasury Management

### Overview

The treasury provides secure custody and transparent allocation of ecosystem funds.

### Features

- Multi-signature approval for withdrawals
- Configurable reserve ratios
- Allocation tracking and milestone-based disbursements
- Real-time balance and utilization reporting

### Usage

```typescript
import { createTreasuryManager } from '@tonaiagent/core/ecosystem-fund';

const treasury = createTreasuryManager({
  multisigRequired: true,
  multisigThreshold: 3,
  maxSingleAllocation: '100000',
  reserveRatio: 0.2, // Keep 20% in reserve
});

// Deposit funds
await treasury.deposit('500000', 'TON');

// Create an allocation
const allocation = await treasury.createAllocation({
  category: 'grant',
  recipientId: 'project-1',
  amount: '25000',
  purpose: 'Developer tools grant',
});

// Approve allocation (requires multiple signers)
await treasury.approveAllocation(allocation.id, 'signer-1');
await treasury.approveAllocation(allocation.id, 'signer-2');
await treasury.approveAllocation(allocation.id, 'signer-3');

// Get treasury stats
const stats = await treasury.getStats();
console.log('Total Deposited:', stats.totalDeposited);
console.log('Total Allocated:', stats.totalAllocated);
console.log('Utilization:', stats.fundUtilization + '%');
```

### Allocation Categories

| Category | Description |
|----------|-------------|
| `grant` | Developer and research grants |
| `investment` | Strategic investments |
| `incubation` | Accelerator program funding |
| `incentive` | Integration rewards |
| `infrastructure` | Core infrastructure |
| `research` | Research initiatives |
| `marketing` | Ecosystem marketing |
| `operations` | Operational expenses |
| `emergency` | Emergency fund |

---

## Fund Governance

### Overview

DAO-based governance for transparent, community-driven decision making.

### Features

- Proposal creation with voting power threshold
- Time-locked voting periods
- Quorum and supermajority requirements
- Committee-based fast-track decisions
- Emergency multi-sig actions

### Usage

```typescript
import { createFundGovernanceManager } from '@tonaiagent/core/ecosystem-fund';

const governance = createFundGovernanceManager({
  votingPeriod: 7, // days
  quorumPercent: 10,
  supermajorityPercent: 67,
  proposalThreshold: '10000', // tokens needed to propose
});

// Create a proposal
const proposal = await governance.createProposal({
  type: 'grant_allocation',
  title: 'Fund Developer Tools Initiative',
  description: 'Allocate 100,000 TON for developer tooling',
  category: 'grant',
  amount: '100000',
}, 'proposer-address');

// Vote on proposal
await governance.vote({
  proposalId: proposal.id,
  voter: 'voter-1',
  support: true,
  reason: 'Strong ecosystem impact',
});

// Execute passed proposal
const result = await governance.executeProposal(proposal.id);
```

### Proposal Types

| Type | Quorum | Threshold | Delay |
|------|--------|-----------|-------|
| Grant Allocation | 10% | 50%+1 | 2 days |
| Investment Allocation | 15% | 60% | 3 days |
| Parameter Change | 10% | 50%+1 | 2 days |
| Committee Appointment | 15% | 60% | 3 days |
| Emergency Action | 5% | 75% | 0 days |

### Committees

```typescript
// Create a grant review committee
const committee = await governance.createCommittee('Grant Review', 'grant_review', {
  maxDecisionAmount: '25000',
  canApproveGrants: true,
  canApproveInvestments: false,
  requiresDAOApproval: '50000',
});

// Add committee members
await governance.addCommitteeMember(committee.id, {
  userId: 'expert-1',
  name: 'Alice',
  role: 'chair',
  votingPower: 2,
});

// Record committee decision
await governance.recordCommitteeDecision(committee.id, {
  committeeId: committee.id,
  type: 'grant_approval',
  description: 'Approved SDK improvement grant',
  amount: '15000',
  recipientId: 'project-1',
  votes: [
    { memberId: 'member-1', support: true },
    { memberId: 'member-2', support: true },
  ],
  outcome: 'approved',
});
```

---

## Grant Programs

### Overview

Developer grants, research funding, open-source support, and hackathons.

### Features

- Multiple grant categories with dedicated budgets
- Milestone-based disbursements
- Progress reporting and tracking
- AI-assisted application evaluation

### Categories

| Category | Budget | Grant Range | Focus |
|----------|--------|-------------|-------|
| Developer Tools | 500K | 1K-50K | SDKs, libraries, developer experience |
| Infrastructure | 1M | 10K-100K | Protocol improvements, scalability |
| Research | 300K | 5K-50K | AI/ML, cryptography, economics |
| Community | 200K | 500-20K | Education, events, content |

### Usage

```typescript
import { createGrantProgramManager } from '@tonaiagent/core/ecosystem-fund';

const grants = createGrantProgramManager({
  enabled: true,
  maxGrantAmount: '100000',
  reviewPeriod: 14,
  disbursementSchedule: 'milestone',
});

// Get available categories
const categories = await grants.getCategories();

// Submit application
const application = await grants.submitApplication({
  categoryId: categories[0].id,
  title: 'TypeScript SDK Enhancement',
  description: 'Add new modules and improve developer experience',
  problemStatement: 'Current SDK lacks key features',
  proposedSolution: 'Add wallet management and NFT modules',
  requestedAmount: '25000',
  milestones: [
    {
      id: 'm1',
      title: 'Wallet Module',
      description: 'Implement wallet management',
      deliverables: ['Code', 'Tests', 'Documentation'],
      amount: '10000',
      duration: 4,
    },
    {
      id: 'm2',
      title: 'NFT Module',
      description: 'Implement NFT support',
      deliverables: ['Code', 'Tests'],
      amount: '10000',
      duration: 4,
    },
    {
      id: 'm3',
      title: 'Documentation',
      description: 'Complete documentation',
      deliverables: ['Docs', 'Tutorials'],
      amount: '5000',
      duration: 2,
    },
  ],
  team: [
    { name: 'Alice', role: 'Lead Developer', experience: '5 years TypeScript', commitment: 'full-time' },
  ],
  budget: {
    development: '20000',
    design: '0',
    marketing: '2000',
    operations: '1000',
    other: '2000',
    total: '25000',
    justification: 'Standard development rates',
  },
  timeline: '10 weeks',
  expectedOutcomes: ['Improved SDK adoption', '50% fewer integration issues'],
  metrics: [
    { name: 'SDK Downloads', description: 'Monthly downloads', target: 5000, unit: 'downloads', weight: 0.5 },
    { name: 'GitHub Stars', description: 'Repository stars', target: 500, unit: 'stars', weight: 0.5 },
  ],
}, applicant);

// Add review
await grants.addReview(application.id, {
  reviewerId: 'reviewer-1',
  category: 'technical',
  comment: 'Strong technical approach',
  score: 4,
});

// Approve and create grant
await grants.updateApplicationStatus(application.id, 'approved');
const grant = await grants.createGrant(application.id);

// Submit milestone
await grants.submitMilestone(grant.id, 'm1', 'https://github.com/project/pr/123');

// Approve and disburse
await grants.reviewMilestone(grant.id, 'm1', true, 'Excellent work');
await grants.disburseMilestone(grant.id, 'm1');
```

---

## Strategic Investments

### Overview

Equity, token, and revenue share investments in ecosystem projects.

### Features

- Due diligence framework
- Portfolio tracking and valuation
- Exit management
- Risk assessment and monitoring

### Usage

```typescript
import { createInvestmentManager } from '@tonaiagent/core/ecosystem-fund';

const investments = createInvestmentManager({
  enabled: true,
  maxInvestmentSize: '500000',
  minInvestmentSize: '25000',
  maxPortfolioConcentration: 20,
  riskTolerance: 'moderate',
});

// Create investment opportunity
const opportunity = await investments.createOpportunity({
  name: 'DeFi Protocol X',
  type: 'token',
  sector: 'DeFi',
  stage: 'seed',
  description: 'Innovative lending protocol on TON',
  fundingRound: 'Seed',
  valuation: '10000000',
  targetRaise: '2000000',
  minInvestment: '50000',
  maxInvestment: '500000',
  terms: {
    instrumentType: 'token',
    amount: '200000',
    tokenAllocation: '2000000',
    pricePerToken: '0.1',
    vestingSchedule: { cliff: 180, duration: 730, immediateRelease: 0.1, linearRelease: 0.9 },
    lockup: 12,
  },
  team: [
    { name: 'Bob', role: 'CEO', experience: '10 years fintech', commitment: 'full-time' },
  ],
  metrics: {
    tvl: '5000000',
    users: 15000,
    transactions: 250000,
    growthRate: 0.25,
  },
});

// Start due diligence
const ddReport = await investments.startDueDiligence(opportunity.id);

// Update due diligence sections
await investments.updateDueDiligence(ddReport.id, {
  name: 'Team Assessment',
  score: 85,
  weight: 0.25,
  findings: ['Strong founding team', 'Previous exits'],
  redFlags: [],
  notes: 'Experienced team with relevant background',
});

// Add risk factors
await investments.addRiskFactor(ddReport.id, {
  category: 'Market',
  description: 'DeFi market volatility',
  severity: 'medium',
  mitigation: 'Diversified revenue streams',
});

// Complete due diligence
await investments.completeDueDiligence(ddReport.id, [
  'Proceed with investment',
  'Negotiate board observer seat',
]);

// Make investment
const investment = await investments.makeInvestment(opportunity.id, '200000', {
  instrumentType: 'token',
  amount: '200000',
  tokenAllocation: '2000000',
  boardSeat: false,
  informationRights: true,
});

// Update valuation
await investments.updateInvestmentValue(investment.id, '300000');

// Get portfolio summary
const portfolio = await investments.getPortfolioSummary();
console.log('Total Invested:', portfolio.totalInvested);
console.log('Current Value:', portfolio.currentValue);
console.log('Portfolio IRR:', portfolio.portfolioIRR);
```

---

## Incubation & Acceleration

### Overview

Accelerator programs providing mentorship, technical support, co-marketing, and capital access.

### Features

- Cohort-based programs
- Track-specific curricula
- Mentor matching
- Demo days and investor intros

### Usage

```typescript
import { createIncubationManager } from '@tonaiagent/core/ecosystem-fund';

const incubation = createIncubationManager({
  enabled: true,
  programDuration: 3, // months
  cohortSize: 10,
  stipend: '5000',
  mentorCount: 3,
});

// Create program
const program = await incubation.createProgram({
  name: 'TON Builders Accelerator',
  description: 'Build the future of TON',
  cohort: '2026-Q2',
  status: 'upcoming',
  startDate: new Date('2026-04-01'),
  endDate: new Date('2026-07-01'),
  applicationDeadline: new Date('2026-03-15'),
  tracks: [],
  mentors: [],
  partners: [],
  events: [],
  resources: [],
});

// Add track
const track = await incubation.addTrack(program.id, {
  name: 'DeFi Track',
  focus: 'DeFi protocols and applications',
  description: 'Build innovative DeFi products',
  curriculum: [
    { week: 1, title: 'TON Fundamentals', description: 'TON architecture and tools', topics: ['FunC', 'TVM', 'Cells'] },
    { week: 2, title: 'Smart Contracts', description: 'Building secure contracts', topics: ['Security', 'Testing'] },
    // ...
  ],
  mentors: [],
  maxParticipants: 5,
});

// Add mentors
await incubation.addMentor(program.id, {
  name: 'Alice Expert',
  title: 'CTO',
  company: 'DeFi Labs',
  expertise: ['DeFi', 'Smart Contracts', 'Token Economics'],
  bio: 'Building DeFi since 2018',
  availability: 'full',
});

// Submit application
const application = await incubation.submitApplication({
  programId: program.id,
  trackId: track.id,
  team: [
    { name: 'Charlie', role: 'CEO', experience: '3 years blockchain', commitment: 'full-time' },
  ],
  project: {
    name: 'LiquidSwap',
    tagline: 'Next-gen AMM on TON',
    description: 'Concentrated liquidity AMM',
    stage: 'mvp',
    website: 'https://liquidswap.io',
    techStack: ['FunC', 'TypeScript', 'React'],
    uniqueValue: 'First concentrated liquidity on TON',
  },
  vision: 'Become the leading DEX on TON',
  traction: '10K testnet users',
  askFromProgram: 'Mentorship on tokenomics, investor intros',
  coachability: 'Very open to feedback, pivoted twice based on user research',
}, applicant);

// Accept and onboard
const participant = await incubation.acceptApplication(application.id);
await incubation.assignMentor(participant.id, 'mentor-1');

// Track progress
await incubation.recordMeeting(participant.id, {
  type: 'mentor',
  date: new Date(),
  attendees: ['participant-1', 'mentor-1'],
  notes: 'Discussed tokenomics strategy',
  actionItems: ['Create token distribution model', 'Research competitors'],
});

// Complete milestone
await incubation.updateMilestone(participant.id, 1, 'completed', 'Excellent progress');

// Graduate
await incubation.graduateParticipant(participant.id);
```

---

## Integration Incentives

### Overview

Rewards for wallet integrations, plugins, agent extensions, and data providers.

### Categories

| Category | Budget | Description |
|----------|--------|-------------|
| Wallet Integration | 200K | TON wallet integrations |
| Plugin Development | 300K | Ecosystem plugins |
| Signal Provider | 150K | Trading signals |
| Data Provider | 200K | On/off-chain data feeds |

### Usage

```typescript
import { createIntegrationIncentivesManager } from '@tonaiagent/core/ecosystem-fund';

const incentives = createIntegrationIncentivesManager({
  enabled: true,
  maxIncentivePerProject: '50000',
  verificationRequired: true,
  paymentSchedule: 'milestone',
});

// Submit integration application
const application = await incentives.submitApplication({
  categoryId: 'wallet-integration',
  projectName: 'TonKeeper Integration',
  description: 'Full integration with TonKeeper wallet',
  integrationDetails: {
    type: 'wallet_integration',
    technicalSpec: 'Full read/write API integration',
    repository: 'https://github.com/project/integration',
    mainnet: true,
    testnet: true,
    userCount: 50000,
  },
  expectedImpact: 'Access to 50K+ TonKeeper users',
  requestedAmount: '30000',
  timeline: '6 weeks',
}, applicant);

// Review and approve
await incentives.updateApplicationStatus(application.id, 'approved');

// Create award
const award = await incentives.createAward(application.id);

// Process disbursements
await incentives.processDisbursement(award.id, 0);

// Update performance metrics
await incentives.updatePerformance(award.id, {
  usersReferred: 5000,
  transactionsGenerated: 25000,
  integrationsEnabled: 1,
  qualityScore: 0.95,
});
```

---

## Ecosystem Flywheel

### Overview

Real-time tracking of ecosystem health using the flywheel model:

**Capital → Innovation → Users → Data → Better Agents → More Capital**

### Metrics

| Component | Key Metrics |
|-----------|-------------|
| Capital | Fund size, deployment rate, ROC |
| Innovation | Active grants, projects launched |
| Users | Growth rate, retention, developers |
| Data | Providers, quality, freshness |
| Agents | Count, performance, TVL managed |
| Network | Integrations, plugins, partners |

### Usage

```typescript
import { createFlywheelManager } from '@tonaiagent/core/ecosystem-fund';

const flywheel = createFlywheelManager({
  enabled: true,
  dashboardEnabled: true,
  alertsEnabled: true,
  alertThresholds: {
    capitalDeploymentRate: 0.15,
    innovationIndex: 60,
    userGrowthRate: 0.08,
    dataQuality: 0.8,
    agentPerformance: 0.7,
  },
});

// Collect current metrics
const metrics = await flywheel.collectMetrics();
console.log('Flywheel Score:', metrics.flywheel.overall);
console.log('Momentum:', metrics.flywheel.momentum);
console.log('Bottleneck:', metrics.flywheel.bottleneck);

// Check for alerts
const alerts = await flywheel.checkAlerts();
for (const alert of alerts) {
  console.log(`Alert: ${alert.message} (${alert.severity})`);
}

// Generate report
const report = await flywheel.generateReport('2026-Q1');
console.log('Highlights:', report.highlights);
console.log('Concerns:', report.concerns);
console.log('Recommendations:', report.recommendations);

// Get trends
const trends = await flywheel.getTrends('30d');
console.log('Capital trend:', trends.capitalTrend.direction);
console.log('User trend:', trends.usersTrend.direction);
```

---

## AI Evaluation

### Overview

AI-powered evaluation of applications using Groq for fast inference.

### Features

- Automated scoring against configurable criteria
- Strength and weakness identification
- Risk assessment
- Follow-up question generation
- Recommendation with confidence score

### Usage

```typescript
import { createAIEvaluationManager } from '@tonaiagent/core/ecosystem-fund';

const ai = createAIEvaluationManager({
  enabled: true,
  provider: 'groq',
  modelId: 'llama-3.3-70b-versatile',
  autoReject: false,
  autoRejectThreshold: 25,
  humanReviewRequired: true,
});

// Evaluate grant application
const result = await ai.evaluate({
  type: 'grant',
  applicationId: 'app-123',
  applicationData: {
    title: 'SDK Enhancement',
    description: 'Improve TypeScript SDK',
    requestedAmount: '25000',
    team: [{ name: 'Alice', role: 'Lead', experience: '5 years' }],
    milestones: [...],
    budget: {...},
  },
});

console.log('Overall Score:', result.overallScore);
console.log('Recommendation:', result.recommendation);
console.log('Confidence:', result.confidence);

console.log('\nStrengths:');
result.strengths.forEach(s => console.log('- ' + s));

console.log('\nWeaknesses:');
result.weaknesses.forEach(w => console.log('- ' + w));

console.log('\nRisks:');
result.risks.forEach(r => console.log('- ' + r));

console.log('\nFollow-up Questions:');
result.questions.forEach(q => console.log('- ' + q));

// Batch evaluation
const results = await ai.evaluateBatch([
  { type: 'grant', applicationId: 'app-1', applicationData: {...} },
  { type: 'grant', applicationId: 'app-2', applicationData: {...} },
]);
```

---

## Configuration

### Full Configuration Example

```typescript
import { createEcosystemFundManager, EcosystemFundConfig } from '@tonaiagent/core/ecosystem-fund';

const config: Partial<EcosystemFundConfig> = {
  treasury: {
    enabled: true,
    multisigRequired: true,
    multisigThreshold: 3,
    maxSingleAllocation: '100000',
    allocationCooldown: 24, // hours
    reserveRatio: 0.2,
    allowedAssets: ['TON', 'TONAI', 'USDT'],
  },

  governance: {
    enabled: true,
    votingPeriod: 7, // days
    executionDelay: 2, // days
    quorumPercent: 10,
    supermajorityPercent: 67,
    proposalThreshold: '10000',
    committeesEnabled: true,
    emergencyMultisig: ['addr1', 'addr2', 'addr3'],
  },

  grants: {
    enabled: true,
    categories: [],
    maxGrantAmount: '100000',
    reviewPeriod: 14,
    disbursementSchedule: 'milestone',
  },

  investments: {
    enabled: true,
    maxInvestmentSize: '500000',
    minInvestmentSize: '25000',
    maxPortfolioConcentration: 20,
    investmentHorizon: ['medium', 'long'],
    targetSectors: ['DeFi', 'AI', 'Infrastructure'],
    riskTolerance: 'moderate',
    diligenceRequired: true,
  },

  incubation: {
    enabled: true,
    programDuration: 3,
    cohortSize: 10,
    applicationPeriod: 30,
    stipend: '5000',
    mentorCount: 3,
    officeHours: true,
  },

  incentives: {
    enabled: true,
    categories: [],
    maxIncentivePerProject: '50000',
    verificationRequired: true,
    paymentSchedule: 'milestone',
  },

  flywheel: {
    enabled: true,
    metricsUpdateFrequency: 'daily',
    dashboardEnabled: true,
    alertsEnabled: true,
    alertThresholds: {
      capitalDeploymentRate: 0.15,
      innovationIndex: 60,
      userGrowthRate: 0.08,
      dataQuality: 0.8,
      agentPerformance: 0.7,
    },
  },

  aiEvaluation: {
    enabled: true,
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    evaluationCriteria: [],
    autoReject: false,
    autoRejectThreshold: 25,
    humanReviewRequired: true,
  },
};

const fund = createEcosystemFundManager(config);
```

---

## API Reference

### EcosystemFundManager

| Method | Description |
|--------|-------------|
| `getHealth()` | Get overall fund health status |
| `getStats()` | Get fund statistics |
| `onEvent(callback)` | Subscribe to fund events |

### TreasuryManager

| Method | Description |
|--------|-------------|
| `deposit(amount, asset)` | Deposit funds |
| `getBalance()` | Get total balance |
| `getAvailableBalance()` | Get available balance |
| `createAllocation(request)` | Create allocation |
| `approveAllocation(id, approver)` | Approve allocation |
| `getStats()` | Get treasury statistics |

### FundGovernanceManager

| Method | Description |
|--------|-------------|
| `createProposal(request, proposer)` | Create proposal |
| `vote(request)` | Cast vote |
| `executeProposal(id)` | Execute passed proposal |
| `createCommittee(name, type, permissions)` | Create committee |
| `getStats()` | Get governance statistics |

### GrantProgramManager

| Method | Description |
|--------|-------------|
| `getCategories()` | Get grant categories |
| `submitApplication(request, applicant)` | Submit application |
| `createGrant(applicationId)` | Create grant from application |
| `submitMilestone(grantId, milestoneId, proof)` | Submit milestone |
| `getStats()` | Get grant statistics |

### InvestmentManager

| Method | Description |
|--------|-------------|
| `createOpportunity(opportunity)` | Create opportunity |
| `startDueDiligence(opportunityId)` | Start due diligence |
| `makeInvestment(opportunityId, amount, terms)` | Make investment |
| `recordExit(investmentId, exitDetails)` | Record exit |
| `getPortfolioSummary()` | Get portfolio summary |

### IncubationManager

| Method | Description |
|--------|-------------|
| `createProgram(program)` | Create program |
| `addTrack(programId, track)` | Add track |
| `submitApplication(request, applicant)` | Submit application |
| `acceptApplication(applicationId)` | Accept application |
| `graduateParticipant(participantId)` | Graduate participant |

### IntegrationIncentivesManager

| Method | Description |
|--------|-------------|
| `getCategories()` | Get incentive categories |
| `submitApplication(request, applicant)` | Submit application |
| `createAward(applicationId)` | Create award |
| `processDisbursement(awardId, index)` | Process disbursement |
| `getStats()` | Get incentive statistics |

### FlywheelManager

| Method | Description |
|--------|-------------|
| `collectMetrics()` | Collect current metrics |
| `calculateFlywheelScore()` | Calculate flywheel score |
| `checkAlerts()` | Check for alerts |
| `generateReport(period)` | Generate report |
| `getTrends(period)` | Get trend data |

### AIEvaluationManager

| Method | Description |
|--------|-------------|
| `evaluate(request)` | Evaluate application |
| `evaluateBatch(requests)` | Batch evaluation |
| `getCriteria(type)` | Get evaluation criteria |

---

## Business Value

- **Strengthens ecosystem moat** through strategic capital deployment
- **Accelerates adoption** by funding key infrastructure and tools
- **Builds long-term defensibility** through incubation of new projects
- **Attracts developers and partners** with clear incentive programs
- **Expands network effects** through the ecosystem flywheel

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-20 | Initial release with ecosystem fund framework |

---

## License

MIT License - Copyright (c) 2026 TONAIAgent Team
