# TONAIAgent - Tokenomics & Agent Economy

## Overview

The TONAIAgent Tokenomics Layer provides a comprehensive economic model for the autonomous AI agent ecosystem on TON blockchain. This system aligns incentives between users, strategy creators, liquidity providers, developers, agent operators, and platform governance.

### Key Features

- **Token Utility**: Governance, staking, fee discounts, and access control
- **Agent Staking**: Reputation collateral and trust mechanisms
- **Creator Incentives**: Revenue sharing and performance rewards
- **User Rewards**: Liquidity incentives and loyalty programs
- **Governance Model**: DAO structure with delegated voting
- **Reputation System**: On-chain performance-based reputation
- **Revenue Distribution**: Fair allocation across stakeholders
- **Anti-Exploit Mechanisms**: Sybil resistance and rate limiting

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Token Utility](#token-utility)
4. [Staking System](#staking-system)
5. [Rewards Distribution](#rewards-distribution)
6. [Governance Framework](#governance-framework)
7. [Reputation System](#reputation-system)
8. [Agent Economy](#agent-economy)
9. [Anti-Exploit Mechanisms](#anti-exploit-mechanisms)
10. [Configuration](#configuration)
11. [API Reference](#api-reference)
12. [Economic Model](#economic-model)
13. [Best Practices](#best-practices)

---

## Quick Start

### Basic Usage

```typescript
import { createTokenomicsManager } from '@tonaiagent/core/tokenomics';

// Create tokenomics manager
const tokenomics = createTokenomicsManager({
  token: {
    symbol: 'TONAI',
    decimals: 9,
    totalSupply: '1000000000', // 1 billion tokens
  },
  staking: {
    minStakeAmount: '100',
    lockPeriods: [7, 30, 90, 365], // days
    rewardRates: [0.05, 0.08, 0.12, 0.20], // APY
  },
  governance: {
    proposalThreshold: '10000', // tokens required to create proposal
    votingPeriod: 7, // days
    quorumPercent: 10,
  },
});

// Stake tokens for an agent
const stake = await tokenomics.staking.stake({
  userId: 'user-1',
  agentId: 'agent-1',
  amount: '1000',
  lockPeriod: 30,
});

// Get user reputation
const reputation = await tokenomics.reputation.getScore('user-1');

// Create governance proposal
const proposal = await tokenomics.governance.createProposal({
  proposer: 'user-1',
  title: 'Increase staking rewards',
  description: 'Proposal to increase base staking APY by 2%',
  type: 'parameter_change',
  parameters: { baseRewardRate: 0.07 },
});
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Tokenomics Manager                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │   Token     │  │   Staking   │  │         Rewards             │  │
│  │  Utility    │  │   Module    │  │       Distribution          │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────────┘  │
│         │                │                      │                    │
│  ┌──────▼────────────────▼──────────────────────▼─────────────────┐  │
│  │                    Governance Engine                            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ Reputation  │  │   Agent     │  │       Anti-Exploit          │  │
│  │   System    │  │  Economy    │  │        Mechanisms           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Incentive Alignment** | All stakeholders benefit from ecosystem growth |
| **Sustainable Economics** | Token model prevents inflation spiral |
| **Fair Distribution** | Rewards proportional to value contribution |
| **Anti-Gaming** | Robust mechanisms prevent exploitation |
| **Transparency** | All economic activity is on-chain verifiable |

### Component Overview

| Component | Purpose |
|-----------|---------|
| **Token Utility** | Core token functions and use cases |
| **Staking Module** | Lock tokens for rewards and privileges |
| **Rewards Distribution** | Calculate and distribute earnings |
| **Governance Engine** | DAO proposals and voting |
| **Reputation System** | Performance-based trust scores |
| **Agent Economy** | Capital pools and funding mechanisms |
| **Anti-Exploit** | Sybil resistance and rate limiting |

---

## Token Utility

### Overview

The TONAI token serves multiple utility functions within the ecosystem:

### Core Utilities

| Utility | Description | Benefit |
|---------|-------------|---------|
| **Governance** | Vote on protocol decisions | Shape ecosystem direction |
| **Staking** | Lock tokens for rewards | Earn passive income |
| **Fee Discounts** | Reduced platform fees | Lower trading costs |
| **Access Control** | Premium features access | Enhanced capabilities |
| **Reputation Collateral** | Stake for agent deployment | Build trust |
| **Creator Rewards** | Earn from strategy usage | Monetize expertise |

### Token Functions

```typescript
import { createTokenUtility } from '@tonaiagent/core/tokenomics';

const tokenUtility = createTokenUtility({
  symbol: 'TONAI',
  decimals: 9,
});

// Check fee discount for staker
const discount = tokenUtility.calculateFeeDiscount({
  stakedAmount: '10000',
  stakeDuration: 90, // days
  tier: 'gold',
});
// Returns { discountPercent: 25, tier: 'gold' }

// Check premium access
const access = tokenUtility.checkPremiumAccess('user-1');
// Returns { hasAccess: true, features: ['analytics', 'priority_execution'] }

// Calculate voting power
const votingPower = tokenUtility.calculateVotingPower({
  stakedAmount: '10000',
  stakeDuration: 365,
  delegatedAmount: '5000',
});
// Returns { votingPower: 17500, multiplier: 1.5 }
```

### Tier System

| Tier | Min Stake | Fee Discount | Features |
|------|-----------|--------------|----------|
| **Bronze** | 100 TONAI | 5% | Basic analytics |
| **Silver** | 1,000 TONAI | 10% | Advanced analytics |
| **Gold** | 10,000 TONAI | 25% | Priority execution |
| **Platinum** | 100,000 TONAI | 50% | Institutional features |
| **Diamond** | 1,000,000 TONAI | 75% | Custom strategies |

---

## Staking System

### Overview

The staking system enables token holders to lock tokens in exchange for rewards, governance rights, and ecosystem privileges.

### Staking Operations

```typescript
import { createStakingModule } from '@tonaiagent/core/tokenomics';

const staking = createStakingModule({
  minStakeAmount: '100',
  maxStakeAmount: '10000000',
  lockPeriods: [7, 30, 90, 365],
  rewardRates: [0.05, 0.08, 0.12, 0.20],
  slashingEnabled: true,
  compoundingEnabled: true,
});

// Stake tokens
const stake = await staking.stake({
  userId: 'user-1',
  amount: '10000',
  lockPeriod: 90, // days
  autoCompound: true,
});

console.log('Stake ID:', stake.id);
console.log('Lock until:', stake.unlockDate);
console.log('Expected APY:', stake.expectedApy);

// Get staking position
const position = await staking.getPosition('user-1');
console.log('Total staked:', position.totalStaked);
console.log('Pending rewards:', position.pendingRewards);

// Claim rewards
const claimed = await staking.claimRewards('user-1');
console.log('Claimed:', claimed.amount);

// Unstake (after lock period)
const unstake = await staking.unstake({
  userId: 'user-1',
  stakeId: stake.id,
  amount: '5000',
});
```

### Agent Staking

Agents must stake tokens to deploy public strategies:

```typescript
// Stake for agent deployment
const agentStake = await staking.stakeForAgent({
  userId: 'user-1',
  agentId: 'agent-1',
  amount: '5000',
  purpose: 'strategy_deployment',
});

// Check agent staking requirements
const requirements = staking.getAgentRequirements('trading');
// Returns { minStake: 1000, requiredDuration: 30, slashable: true }

// Get agent staking status
const status = await staking.getAgentStakeStatus('agent-1');
// Returns { staked: 5000, locked: true, slashRisk: 0.02 }
```

### Slashing Conditions

| Condition | Slash Amount | Description |
|-----------|--------------|-------------|
| **Malicious Strategy** | 50-100% | Strategy causes user losses |
| **False Reporting** | 25-50% | Manipulated performance data |
| **Protocol Violation** | 10-25% | Breaking platform rules |
| **Inactivity** | 5-10% | Extended strategy downtime |

### Reward Calculations

```typescript
// Calculate expected rewards
const rewards = staking.calculateRewards({
  amount: '10000',
  lockPeriod: 90,
  duration: 30, // days staked so far
});

console.log('Base reward:', rewards.baseReward);
console.log('Bonus reward:', rewards.bonusReward);
console.log('Total pending:', rewards.totalPending);
console.log('APY:', rewards.currentApy);
```

---

## Rewards Distribution

### Overview

The rewards system distributes value across the ecosystem based on contributions.

### Reward Types

| Type | Recipients | Source |
|------|------------|--------|
| **Staking Rewards** | Token stakers | Emission + fees |
| **Performance Fees** | Strategy creators | User profits |
| **Platform Fees** | DAO treasury | Trading volume |
| **Referral Rewards** | Referrers | New user activity |
| **Liquidity Mining** | LPs | Emission schedule |

### Distribution Flow

```typescript
import { createRewardsDistributor } from '@tonaiagent/core/tokenomics';

const rewards = createRewardsDistributor({
  distributionSchedule: 'daily',
  feeDistribution: {
    creators: 0.40, // 40% to strategy creators
    stakers: 0.30, // 30% to stakers
    treasury: 0.20, // 20% to DAO treasury
    liquidity: 0.10, // 10% to liquidity incentives
  },
  emissionSchedule: {
    year1: '100000000', // 100M tokens
    year2: '75000000',  // 75M tokens
    year3: '50000000',  // 50M tokens
    year4: '25000000',  // 25M tokens
  },
});

// Calculate creator earnings
const earnings = await rewards.calculateCreatorEarnings({
  creatorId: 'creator-1',
  strategyId: 'strategy-1',
  period: 'month',
});

console.log('Performance fees:', earnings.performanceFees);
console.log('Platform rewards:', earnings.platformRewards);
console.log('Total earnings:', earnings.total);

// Get distribution summary
const summary = await rewards.getDistributionSummary('2026-02');
console.log('Total distributed:', summary.totalDistributed);
console.log('By category:', summary.byCategory);
```

### Performance Fee Structure

```typescript
// Configure performance fees
const feeStructure = {
  baseFee: 0.001, // 0.1% base platform fee
  performanceFee: 0.10, // 10% of profits
  highWaterMark: true, // Only charge on new profits
  hurdleRate: 0.05, // 5% minimum return before fees
};

// Calculate fees for a strategy
const fees = rewards.calculatePerformanceFees({
  strategyId: 'strategy-1',
  profitAmount: '1000',
  previousHighWaterMark: '10000',
  currentValue: '11500',
});

console.log('Eligible profit:', fees.eligibleProfit);
console.log('Creator fee:', fees.creatorFee);
console.log('Platform fee:', fees.platformFee);
console.log('User receives:', fees.userReceives);
```

### Vesting Schedules

```typescript
// Creator rewards vesting
const vestingSchedule = {
  cliff: 30, // 30 day cliff
  duration: 365, // 1 year total vesting
  immediateRelease: 0.25, // 25% immediate
  linearRelease: 0.75, // 75% linear vesting
};

// Check vested amount
const vested = await rewards.getVestedAmount('creator-1');
console.log('Vested:', vested.vestedAmount);
console.log('Claimable:', vested.claimableAmount);
console.log('Locked:', vested.lockedAmount);
```

---

## Governance Framework

### Overview

The governance system implements a DAO structure for decentralized protocol management.

### Governance Operations

```typescript
import { createGovernanceEngine } from '@tonaiagent/core/tokenomics';

const governance = createGovernanceEngine({
  proposalThreshold: '10000',
  votingPeriod: 7, // days
  executionDelay: 2, // days
  quorumPercent: 10,
  supermajorityPercent: 67,
});

// Create proposal
const proposal = await governance.createProposal({
  proposer: 'user-1',
  title: 'Adjust fee structure',
  description: 'Reduce base platform fee from 0.1% to 0.08%',
  type: 'parameter_change',
  category: 'fees',
  parameters: {
    baseFee: 0.0008,
  },
  discussionUrl: 'https://forum.tonaiagent.com/proposals/123',
});

console.log('Proposal ID:', proposal.id);
console.log('Status:', proposal.status);
console.log('Voting starts:', proposal.votingStartsAt);

// Vote on proposal
const vote = await governance.vote({
  proposalId: proposal.id,
  voter: 'user-2',
  support: true,
  votingPower: '15000',
  reason: 'Lower fees will attract more users',
});

// Delegate voting power
await governance.delegate({
  delegator: 'user-3',
  delegatee: 'user-1',
  amount: '5000',
});

// Execute passed proposal
const execution = await governance.executeProposal(proposal.id);
```

### Proposal Types

| Type | Quorum | Threshold | Delay |
|------|--------|-----------|-------|
| **Parameter Change** | 10% | 50%+1 | 2 days |
| **Treasury Spend** | 15% | 60% | 3 days |
| **Protocol Upgrade** | 20% | 67% | 7 days |
| **Emergency** | 5% | 75% | 0 days |
| **Grant** | 10% | 50%+1 | 2 days |

### Voting Power Calculation

```typescript
// Calculate voting power
const votingPower = governance.calculateVotingPower({
  stakedAmount: '10000',
  stakeDuration: 365, // days
  delegatedAmount: '5000',
  reputationScore: 85,
});

// Voting power multipliers:
// - Base: 1x per staked token
// - Lock bonus: up to 2x for 365-day lock
// - Delegation: 1x per delegated token
// - Reputation: up to 1.5x for high reputation
```

### Governance Parameters

```typescript
// Get current governance parameters
const params = governance.getParameters();
// {
//   proposalThreshold: '10000',
//   votingPeriod: 7,
//   executionDelay: 2,
//   quorumPercent: 10,
//   supermajorityPercent: 67,
//   gracePeriod: 3,
//   maxActionsPerProposal: 10,
// }

// Get voting statistics
const stats = await governance.getStats();
// {
//   totalProposals: 45,
//   passedProposals: 38,
//   activeProposals: 2,
//   totalVotesCast: 1250000,
//   uniqueVoters: 850,
// }
```

---

## Reputation System

### Overview

The reputation system provides on-chain performance-based trust scores.

### Reputation Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| **Performance** | 30% | Strategy returns and consistency |
| **Reliability** | 25% | Uptime and execution quality |
| **History** | 20% | Track record duration |
| **Community** | 15% | User ratings and feedback |
| **Compliance** | 10% | Rule adherence |

### Reputation Operations

```typescript
import { createReputationSystem } from '@tonaiagent/core/tokenomics';

const reputation = createReputationSystem({
  minScore: 0,
  maxScore: 100,
  decayRate: 0.01, // 1% monthly decay
  updateFrequency: 'daily',
});

// Get reputation score
const score = await reputation.getScore('user-1');
console.log('Overall score:', score.overall);
console.log('Breakdown:', score.breakdown);
console.log('Tier:', score.tier);
console.log('Percentile:', score.percentile);

// Get reputation history
const history = await reputation.getHistory('user-1', {
  period: '90d',
  granularity: 'daily',
});

// Update reputation (internal use)
await reputation.recordEvent({
  userId: 'user-1',
  eventType: 'strategy_performance',
  impact: 5, // positive impact
  details: { returnPercent: 15, period: '30d' },
});
```

### Reputation Tiers

| Tier | Score Range | Benefits |
|------|-------------|----------|
| **Newcomer** | 0-20 | Basic access |
| **Established** | 21-40 | Reduced fees |
| **Trusted** | 41-60 | Priority execution |
| **Expert** | 61-80 | Institutional access |
| **Elite** | 81-100 | Maximum benefits |

### Reputation-Based Access

```typescript
// Check access based on reputation
const access = reputation.checkAccess({
  userId: 'user-1',
  feature: 'institutional_copying',
  requiredTier: 'expert',
});

if (!access.allowed) {
  console.log('Required score:', access.requiredScore);
  console.log('Current score:', access.currentScore);
  console.log('Score needed:', access.scoreNeeded);
}

// Get reputation requirements for actions
const requirements = reputation.getRequirements('deploy_public_strategy');
// { minScore: 40, minTier: 'trusted', minHistory: 30 }
```

---

## Agent Economy

### Overview

The agent economy enables capital pooling, funding mechanisms, and automated yield generation.

### Capital Pools

```typescript
import { createAgentEconomy } from '@tonaiagent/core/tokenomics';

const agentEconomy = createAgentEconomy({
  minPoolSize: '1000',
  maxPoolSize: '10000000',
  managementFee: 0.02, // 2% annual
  performanceFee: 0.20, // 20% of profits
});

// Create capital pool
const pool = await agentEconomy.createPool({
  managerId: 'user-1',
  name: 'Alpha Strategy Pool',
  description: 'High-yield DeFi strategies',
  minInvestment: '100',
  maxCapacity: '1000000',
  strategy: {
    riskLevel: 'medium',
    targetReturn: 0.15, // 15% APY target
    rebalanceFrequency: 'weekly',
  },
});

// Invest in pool
const investment = await agentEconomy.invest({
  poolId: pool.id,
  investorId: 'user-2',
  amount: '5000',
});

// Get pool performance
const performance = await agentEconomy.getPoolPerformance(pool.id);
console.log('Total TVL:', performance.tvl);
console.log('30d return:', performance.return30d);
console.log('Sharpe ratio:', performance.sharpeRatio);

// Withdraw from pool
const withdrawal = await agentEconomy.withdraw({
  poolId: pool.id,
  investorId: 'user-2',
  amount: '2000',
});
```

### Agent Marketplace

```typescript
// List strategy in marketplace
const listing = await agentEconomy.listStrategy({
  strategyId: 'strategy-1',
  creatorId: 'user-1',
  pricing: {
    copyFee: '10', // one-time fee
    performanceFee: 0.15, // 15% of profits
    monthlyFee: '5', // subscription
  },
  terms: {
    minInvestment: '100',
    lockPeriod: 0,
    maxCopiers: 1000,
  },
});

// Copy a strategy
const copy = await agentEconomy.copyStrategy({
  strategyId: 'strategy-1',
  copierId: 'user-3',
  allocation: '1000',
  settings: {
    slippageTolerance: 0.01,
    maxDrawdown: 0.10,
  },
});

// Get marketplace rankings
const rankings = await agentEconomy.getMarketplaceRankings({
  category: 'defi',
  sortBy: 'sharpe_ratio',
  period: '90d',
  limit: 10,
});
```

### Funding Mechanisms

```typescript
// Request funding for agent development
const funding = await agentEconomy.requestFunding({
  requesterId: 'user-1',
  projectName: 'Advanced DEX Arbitrage Agent',
  description: 'Multi-hop arbitrage across TON DEXes',
  requestedAmount: '50000',
  milestones: [
    { description: 'Architecture design', amount: '10000', deadline: '2026-03-01' },
    { description: 'MVP development', amount: '20000', deadline: '2026-04-01' },
    { description: 'Testing & launch', amount: '20000', deadline: '2026-05-01' },
  ],
  equity: 0.10, // 10% revenue share
});

// Contribute to funding
const contribution = await agentEconomy.contributeFunding({
  fundingId: funding.id,
  contributorId: 'user-4',
  amount: '5000',
});
```

---

## Anti-Exploit Mechanisms

### Overview

Robust mechanisms to prevent gaming, sybil attacks, and economic exploits.

### Sybil Resistance

```typescript
import { createAntiExploitManager } from '@tonaiagent/core/tokenomics';

const antiExploit = createAntiExploitManager({
  sybilDetection: {
    enabled: true,
    minAccountAge: 7, // days
    minStakeRequired: '100',
    behaviorAnalysis: true,
  },
  rateLimit: {
    maxClaimsPerDay: 10,
    maxVotesPerProposal: 1,
    cooldownPeriod: 3600, // seconds
  },
  rewardCaps: {
    maxDailyReward: '1000',
    maxWeeklyReward: '5000',
    maxMonthlyReward: '15000',
  },
});

// Check if user is potentially sybil
const sybilCheck = await antiExploit.checkSybil('user-1');
if (sybilCheck.isSuspicious) {
  console.log('Risk factors:', sybilCheck.riskFactors);
  console.log('Recommendation:', sybilCheck.recommendation);
}

// Validate reward claim
const claimValidation = await antiExploit.validateClaim({
  userId: 'user-1',
  rewardType: 'staking',
  amount: '500',
});

if (!claimValidation.allowed) {
  console.log('Reason:', claimValidation.reason);
  console.log('Cooldown remaining:', claimValidation.cooldownRemaining);
}
```

### Rate Limiting

```typescript
// Configure rate limits
const rateLimits = {
  operations: {
    stake: { maxPerHour: 5, maxPerDay: 20 },
    unstake: { maxPerHour: 3, maxPerDay: 10 },
    claim: { maxPerHour: 10, maxPerDay: 50 },
    vote: { maxPerProposal: 1, maxPerDay: 20 },
    delegate: { maxPerHour: 2, maxPerDay: 5 },
  },
  cooldowns: {
    afterUnstake: 86400, // 24 hours
    afterSlash: 604800, // 7 days
    afterVote: 60, // 1 minute
  },
};

// Check rate limit
const rateCheck = antiExploit.checkRateLimit('user-1', 'stake');
console.log('Allowed:', rateCheck.allowed);
console.log('Remaining:', rateCheck.remaining);
console.log('Resets at:', rateCheck.resetsAt);
```

### Emission Controls

```typescript
// Configure emission limits
const emissionControls = {
  maxDailyEmission: '1000000',
  maxWeeklyEmission: '5000000',
  maxMonthlyEmission: '15000000',
  inflationCap: 0.05, // 5% annual max inflation
  burnMechanism: {
    enabled: true,
    burnRate: 0.01, // 1% of fees burned
  },
};

// Get emission status
const emissionStatus = await antiExploit.getEmissionStatus();
console.log('Today emitted:', emissionStatus.dailyEmitted);
console.log('Daily cap:', emissionStatus.dailyCap);
console.log('Remaining:', emissionStatus.dailyRemaining);
```

### Slashing Mechanisms

```typescript
// Configure slashing
const slashingConfig = {
  conditions: [
    {
      type: 'malicious_strategy',
      severity: 'critical',
      slashPercent: 100,
      evidence: ['user_reports', 'loss_analysis'],
    },
    {
      type: 'false_reporting',
      severity: 'high',
      slashPercent: 50,
      evidence: ['data_mismatch', 'audit_trail'],
    },
    {
      type: 'inactivity',
      severity: 'low',
      slashPercent: 10,
      grace_period: 30, // days
    },
  ],
  appealProcess: {
    enabled: true,
    appealWindow: 7, // days
    arbitrationRequired: true,
  },
};

// Execute slash (admin only)
const slash = await antiExploit.executeSlash({
  targetId: 'agent-1',
  condition: 'malicious_strategy',
  evidence: ['user_report_123', 'loss_analysis_456'],
  amount: '5000',
  approvedBy: 'governance',
});
```

---

## Configuration

### Full Configuration Example

```typescript
import { createTokenomicsManager, TokenomicsConfig } from '@tonaiagent/core/tokenomics';

const config: TokenomicsConfig = {
  // Token configuration
  token: {
    symbol: 'TONAI',
    name: 'TON AI Agent Token',
    decimals: 9,
    totalSupply: '1000000000',
    contractAddress: 'EQC...',
  },

  // Staking configuration
  staking: {
    enabled: true,
    minStakeAmount: '100',
    maxStakeAmount: '10000000',
    lockPeriods: [7, 30, 90, 365],
    rewardRates: [0.05, 0.08, 0.12, 0.20],
    slashingEnabled: true,
    compoundingEnabled: true,
    cooldownPeriod: 86400, // 24 hours
  },

  // Rewards configuration
  rewards: {
    distributionSchedule: 'daily',
    feeDistribution: {
      creators: 0.40,
      stakers: 0.30,
      treasury: 0.20,
      liquidity: 0.10,
    },
    vestingEnabled: true,
    vestingCliff: 30,
    vestingDuration: 365,
  },

  // Governance configuration
  governance: {
    enabled: true,
    proposalThreshold: '10000',
    votingPeriod: 7,
    executionDelay: 2,
    quorumPercent: 10,
    supermajorityPercent: 67,
    delegationEnabled: true,
  },

  // Reputation configuration
  reputation: {
    enabled: true,
    minScore: 0,
    maxScore: 100,
    decayRate: 0.01,
    updateFrequency: 'daily',
    factors: {
      performance: 0.30,
      reliability: 0.25,
      history: 0.20,
      community: 0.15,
      compliance: 0.10,
    },
  },

  // Agent economy configuration
  agentEconomy: {
    enabled: true,
    minPoolSize: '1000',
    maxPoolSize: '10000000',
    managementFee: 0.02,
    performanceFee: 0.20,
    fundingEnabled: true,
  },

  // Anti-exploit configuration
  antiExploit: {
    sybilDetectionEnabled: true,
    rateLimitingEnabled: true,
    emissionControlEnabled: true,
    slashingEnabled: true,
    rewardCaps: {
      daily: '1000',
      weekly: '5000',
      monthly: '15000',
    },
  },
};

const tokenomics = createTokenomicsManager(config);
```

### Environment Variables

```bash
# Token Configuration
TONAI_TOKEN_ADDRESS=EQC...
TONAI_TREASURY_ADDRESS=EQD...

# Staking Parameters
STAKING_MIN_AMOUNT=100
STAKING_MAX_APY=0.20

# Governance Parameters
GOVERNANCE_PROPOSAL_THRESHOLD=10000
GOVERNANCE_VOTING_PERIOD=7

# Anti-Exploit Limits
MAX_DAILY_REWARD=1000
SYBIL_MIN_ACCOUNT_AGE=7
```

---

## API Reference

### TokenomicsManager

| Method | Description |
|--------|-------------|
| `getHealth()` | Get overall tokenomics system health |
| `getStats()` | Get ecosystem statistics |
| `onEvent(callback)` | Subscribe to tokenomics events |

### TokenUtility

| Method | Description |
|--------|-------------|
| `calculateFeeDiscount(params)` | Calculate fee discount for staker |
| `checkPremiumAccess(userId)` | Check premium feature access |
| `calculateVotingPower(params)` | Calculate governance voting power |
| `getTier(userId)` | Get user's token tier |

### StakingModule

| Method | Description |
|--------|-------------|
| `stake(params)` | Stake tokens |
| `unstake(params)` | Unstake tokens |
| `getPosition(userId)` | Get staking position |
| `claimRewards(userId)` | Claim pending rewards |
| `stakeForAgent(params)` | Stake for agent deployment |
| `calculateRewards(params)` | Calculate expected rewards |

### RewardsDistributor

| Method | Description |
|--------|-------------|
| `calculateCreatorEarnings(params)` | Calculate creator earnings |
| `getDistributionSummary(period)` | Get distribution summary |
| `calculatePerformanceFees(params)` | Calculate performance fees |
| `getVestedAmount(userId)` | Get vested reward amount |

### GovernanceEngine

| Method | Description |
|--------|-------------|
| `createProposal(params)` | Create governance proposal |
| `vote(params)` | Cast vote on proposal |
| `delegate(params)` | Delegate voting power |
| `executeProposal(proposalId)` | Execute passed proposal |
| `getProposal(proposalId)` | Get proposal details |
| `getStats()` | Get governance statistics |

### ReputationSystem

| Method | Description |
|--------|-------------|
| `getScore(userId)` | Get reputation score |
| `getHistory(userId, options)` | Get reputation history |
| `checkAccess(params)` | Check reputation-based access |
| `getRequirements(action)` | Get reputation requirements |
| `recordEvent(params)` | Record reputation event |

### AgentEconomy

| Method | Description |
|--------|-------------|
| `createPool(params)` | Create capital pool |
| `invest(params)` | Invest in pool |
| `withdraw(params)` | Withdraw from pool |
| `listStrategy(params)` | List strategy in marketplace |
| `copyStrategy(params)` | Copy a strategy |
| `getMarketplaceRankings(params)` | Get marketplace rankings |

### AntiExploitManager

| Method | Description |
|--------|-------------|
| `checkSybil(userId)` | Check for sybil behavior |
| `validateClaim(params)` | Validate reward claim |
| `checkRateLimit(userId, operation)` | Check rate limit status |
| `getEmissionStatus()` | Get emission status |
| `executeSlash(params)` | Execute slashing |

---

## Economic Model

### Token Distribution

| Allocation | Percentage | Vesting |
|------------|------------|---------|
| **Community Rewards** | 40% | 4 years linear |
| **Team & Advisors** | 15% | 4 years with 1 year cliff |
| **Investors** | 15% | 2 years linear |
| **Treasury** | 15% | DAO controlled |
| **Ecosystem Grants** | 10% | As needed |
| **Liquidity** | 5% | Immediate |

### Value Capture Mechanisms

| Mechanism | Flow |
|-----------|------|
| **Platform Fees** | 0.1% of trading volume → Treasury + Stakers |
| **Performance Fees** | 10-20% of profits → Creators + Platform |
| **Premium Subscriptions** | Monthly fees → Treasury |
| **NFT Sales** | Mint fees → Treasury + Creators |

### Emission Schedule

| Year | Annual Emission | Total Supply % |
|------|-----------------|----------------|
| 1 | 100M TONAI | 10% |
| 2 | 75M TONAI | 7.5% |
| 3 | 50M TONAI | 5% |
| 4 | 25M TONAI | 2.5% |
| 5+ | DAO Controlled | Variable |

---

## Best Practices

### 1. Stake for Long-Term Benefits

```typescript
// Long-term staking provides maximum benefits
await staking.stake({
  amount: '10000',
  lockPeriod: 365, // Maximum rewards and voting power
});
```

### 2. Diversify Agent Allocations

```typescript
// Spread risk across multiple strategies
const allocations = [
  { strategyId: 'strategy-1', amount: '3000' },
  { strategyId: 'strategy-2', amount: '4000' },
  { strategyId: 'strategy-3', amount: '3000' },
];
```

### 3. Build Reputation Gradually

```typescript
// Start with smaller strategies, build track record
// Reputation unlocks higher allocations and visibility
```

### 4. Participate in Governance

```typescript
// Active participation increases voting power
await governance.vote({
  proposalId: 'proposal-1',
  support: true,
  reason: 'Clear rationale increases community trust',
});
```

### 5. Monitor Slashing Risk

```typescript
// Keep agent stake adequate and monitor performance
const status = await staking.getAgentStakeStatus('agent-1');
if (status.slashRisk > 0.1) {
  // Take corrective action
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-20 | Initial release with tokenomics layer |

---

## License

MIT License - Copyright (c) 2026 TONAIAgent Team
