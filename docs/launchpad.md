# TONAIAgent - Agent Launchpad

Full-featured Agent Launchpad enabling DAOs, crypto funds, startups, and communities to launch, manage, and scale autonomous treasury and investment agents on The Open Network (TON).

## Overview

The Agent Launchpad transforms the platform into a capital coordination layer for the TON ecosystem, providing:

- **Treasury Agent Framework** - Deploy autonomous agents for asset allocation, yield optimization, and portfolio management
- **DAO Governance Integration** - Proposal-based strategy updates, voting-controlled execution, and role-based controls
- **Fund Infrastructure** - AI-managed funds with multi-strategy portfolios, capital inflows/outflows, and automated rebalancing
- **Capital Pooling** - Pooled capital management with multiple contributors, configurable allocation, and permissioned access
- **Risk & Control Layer** - Exposure limits, diversification rules, emergency shutdown, and strategy approvals
- **Monitoring & Analytics** - Real-time dashboards, performance metrics, and alerts
- **Monetization** - Management fees, performance fees, and revenue sharing

## Installation

```bash
npm install @tonaiagent/core
```

## Quick Start

```typescript
import { createLaunchpadService } from '@tonaiagent/core/launchpad';

// Create the launchpad service
const launchpad = createLaunchpadService();

// Create an organization (DAO, fund, etc.)
const org = await launchpad.organizations.createOrganization({
  name: 'Acme DAO',
  description: 'Community-governed treasury',
  type: 'dao',
  creatorUserId: 'user_123',
});

// Create a capital pool
const pool = await launchpad.pools.createPool({
  organizationId: org.id,
  name: 'Treasury Pool',
  description: 'Main capital pool',
  type: 'general',
});

// Accept contributions
await launchpad.pools.contribute({
  poolId: pool.id,
  userId: 'user_456',
  amount: 10000,
});

// Deploy a treasury agent
const agent = await launchpad.agents.createAgent({
  organizationId: org.id,
  name: 'Yield Optimizer',
  description: 'Autonomous yield optimization agent',
  type: 'yield',
  config: { capitalAllocated: 10000 },
  strategy: { type: 'yield_optimization', yieldTargetApy: 15 },
});

await launchpad.agents.deployAgent(agent.id);

// Allocate capital to the agent
await launchpad.pools.allocateToAgent({
  poolId: pool.id,
  agentId: agent.id,
  amount: 5000,
  purpose: 'Yield farming',
});

// Get monitoring dashboard
const dashboard = await launchpad.monitoring.getDashboard(org.id);
console.log('Total AUM:', dashboard.overview.totalAum);
```

## API Reference

### LaunchpadService

The unified entry point for all launchpad functionality.

```typescript
interface LaunchpadService {
  readonly agents: TreasuryAgentManager;
  readonly governance: GovernanceManager;
  readonly funds: FundManager;
  readonly pools: CapitalPoolManager;
  readonly organizations: OrganizationManager;
  readonly monitoring: MonitoringManager;

  getHealth(): Promise<LaunchpadHealth>;
  onEvent(callback: LaunchpadEventCallback): void;
}
```

### Organization Manager

Manage organizations (DAOs, funds, communities) and their members.

```typescript
// Create organization
const org = await launchpad.organizations.createOrganization({
  name: 'Acme DAO',
  description: 'A decentralized autonomous organization',
  type: 'dao', // dao | crypto_fund | hedge_fund | venture_fund | family_office | treasury | community | protocol | startup | enterprise
  creatorUserId: 'user_123',
  governanceConfig: {
    type: 'token_voting',
    votingPeriodHours: 72,
    quorumPercent: 10,
  },
});

// Add members
await launchpad.organizations.addMember({
  organizationId: org.id,
  userId: 'user_456',
  email: 'member@example.com',
  name: 'John Doe',
  role: 'treasury_manager', // owner | admin | treasury_manager | strategy_manager | risk_manager | contributor | viewer
  invitedBy: 'user_123',
});

// Update governance
await launchpad.organizations.updateGovernanceConfig(org.id, {
  quorumPercent: 20,
  vetoEnabled: true,
});
```

### Treasury Agent Manager

Deploy and manage autonomous treasury agents.

```typescript
// Create agent
const agent = await launchpad.agents.createAgent({
  organizationId: org.id,
  name: 'Yield Optimizer',
  description: 'Optimizes yield across DeFi protocols',
  type: 'yield', // treasury | investment | liquidity | risk | yield | hedging | diversification
  config: {
    capitalAllocated: 10000,
    autoRebalance: true,
    rebalanceInterval: 60, // minutes
    allowedTokens: ['TON', 'USDT', 'USDC'],
    executionMode: 'automatic',
  },
  strategy: {
    type: 'yield_optimization',
    yieldTargetApy: 15,
    allocationRules: [
      { id: 'stable', name: 'Stablecoin', targetPercent: 30, assetClass: 'stablecoin', rebalanceAction: 'auto' },
      { id: 'yield', name: 'Yield Bearing', targetPercent: 50, assetClass: 'yield_bearing', rebalanceAction: 'auto' },
      { id: 'native', name: 'Native Token', targetPercent: 20, assetClass: 'native_token', rebalanceAction: 'auto' },
    ],
  },
  riskControls: {
    maxDrawdown: 15,
    maxSingleTradePercent: 5,
    dailyLossLimit: 5,
    concentrationLimit: 30,
  },
});

// Deploy agent
const deployment = await launchpad.agents.deployAgent(agent.id);
console.log('Wallet address:', deployment.walletAddress);

// Execute rebalance
const rebalance = await launchpad.agents.executeRebalance(agent.id);

// Simulate strategy
const simulation = await launchpad.agents.simulateStrategy(agent.id, {
  days: 30,
  initialCapital: 10000,
  marketScenario: 'bullish',
});

// Check risk limits
const riskCheck = await launchpad.agents.checkRiskLimits(agent.id);
if (!riskCheck.passed) {
  console.log('Risk violations:', riskCheck.violations);
}

// Emergency stop
await launchpad.agents.triggerEmergencyStop(agent.id, 'Critical risk detected');
```

### Governance Manager

DAO governance with proposals, voting, and delegation.

```typescript
// Configure governance
await launchpad.governance.configureGovernance(org.id, {
  type: 'token_voting',
  votingPeriodHours: 72,
  quorumPercent: 10,
  approvalThresholdPercent: 50,
  vetoEnabled: true,
  delegationEnabled: true,
  timelockHours: 24,
});

// Set voting power
launchpad.governance.setMemberVotingPower(org.id, 'user_123', 100);

// Create proposal
const proposal = await launchpad.governance.createProposal({
  organizationId: org.id,
  agentId: agent.id,
  type: 'strategy_change',
  title: 'Increase yield target to 20%',
  description: 'Proposal to increase the target APY from 15% to 20%',
  proposer: 'user_123',
  actions: [
    { type: 'parameter_change', target: 'yield_target', parameters: { value: 20 } },
  ],
});

// Cast vote
await launchpad.governance.castVote({
  proposalId: proposal.id,
  voter: 'user_456',
  support: 'for',
  reason: 'Higher yield is beneficial',
});

// Check results
const results = launchpad.governance.calculateResults(proposal.id);
console.log('Votes for:', results.votesFor);
console.log('Approved:', results.approved);

// Execute proposal
const execution = await launchpad.governance.executeProposal(proposal.id, 'user_123');

// Delegate voting power
await launchpad.governance.delegateVotingPower({
  fromUserId: 'user_789',
  toUserId: 'user_123',
  organizationId: org.id,
  percentage: 100,
});
```

### Fund Manager

Create and manage AI-powered investment funds.

```typescript
// Create fund
const fund = await launchpad.funds.createFund({
  organizationId: org.id,
  name: 'Alpha Yield Fund',
  description: 'AI-managed yield optimization fund',
  type: 'yield_fund', // hedge_fund | venture_fund | index_fund | yield_fund | balanced_fund | custom
  strategy: {
    name: 'Multi-Strategy AI',
    targetApy: 25,
    riskLevel: 'moderate',
    rebalanceFrequency: 'weekly',
  },
  fees: {
    managementFeePercent: 2,
    performanceFeePercent: 20,
    entryFeePercent: 0,
    exitFeePercent: 0,
    hurdleRate: 5,
  },
  compliance: {
    accreditedOnly: false,
    minInvestment: 100,
    maxInvestors: 1000,
    lockPeriodDays: 30,
    redemptionNoticeDays: 7,
    kycRequired: false,
  },
});

// Launch fund
await launchpad.funds.launchFund(fund.id);

// Add investors
const investor = await launchpad.funds.addInvestor({
  fundId: fund.id,
  userId: 'investor_1',
  initialInvestment: 10000,
});

// Process additional investment
await launchpad.funds.processInvestment(fund.id, investor.id, 5000);

// Calculate NAV
const nav = await launchpad.funds.calculateNav(fund.id);
console.log('NAV per share:', nav.navPerShare);

// Update NAV (after portfolio valuation)
await launchpad.funds.updateNav(fund.id, 110);

// Process redemption
const redemption = await launchpad.funds.processRedemption({
  fundId: fund.id,
  investorId: investor.id,
  percentage: 50,
});

// Collect fees
const fees = await launchpad.funds.collectFees(fund.id);
console.log('Fees collected:', fees.totalCollected);

// Get performance
const returns = launchpad.funds.calculateReturns(fund.id, 'monthly');
```

### Capital Pool Manager

Manage pooled capital from multiple contributors.

```typescript
// Create pool
const pool = await launchpad.pools.createPool({
  organizationId: org.id,
  name: 'Treasury Pool',
  description: 'Main capital pool',
  type: 'general', // general | investment | liquidity | reserve | operational
  limits: {
    maxCapital: 10000000,
    minContribution: 100,
    maxContribution: 100000,
    maxContributors: 1000,
    maxAllocationPercent: 80,
    lockPeriodDays: 30,
    withdrawalNoticeDays: 7,
  },
});

// Accept contributions
const contribution = await launchpad.pools.contribute({
  poolId: pool.id,
  userId: 'user_123',
  amount: 5000,
  lockDays: 90,
});
console.log('Share percent:', contribution.sharePercent);

// Allocate to agent
const allocation = await launchpad.pools.allocateToAgent({
  poolId: pool.id,
  agentId: agent.id,
  amount: 3000,
  purpose: 'Yield optimization',
});

// Request withdrawal
const withdrawRequest = await launchpad.pools.requestWithdrawal({
  poolId: pool.id,
  contributorId: contribution.contributorId,
  percentage: 50,
});

// Process withdrawal (after notice period)
await launchpad.pools.processWithdrawal(withdrawRequest.id);

// Rebalance allocations
await launchpad.pools.rebalanceAllocations(pool.id);

// Get pool performance
const poolReturns = launchpad.pools.calculateReturns(pool.id);
```

### Monitoring Manager

Real-time dashboards, metrics, and alerts.

```typescript
// Get full dashboard
const dashboard = await launchpad.monitoring.getDashboard(org.id);
console.log('Total AUM:', dashboard.overview.totalAum);
console.log('Active agents:', dashboard.agentMetrics.activeAgents);
console.log('Risk score:', dashboard.riskMetrics.overallRiskScore);

// Get specific metrics
const treasuryMetrics = launchpad.monitoring.getTreasuryMetrics(org.id);
const agentMetrics = launchpad.monitoring.getAgentMetrics(org.id);
const capitalMetrics = launchpad.monitoring.getCapitalMetrics(org.id);
const governanceMetrics = launchpad.monitoring.getGovernanceMetrics(org.id);
const riskMetrics = launchpad.monitoring.getRiskMetrics(org.id);

// Create alert
const alert = launchpad.monitoring.createAlert({
  organizationId: org.id,
  type: 'risk_threshold',
  severity: 'warning',
  title: 'Concentration risk detected',
  message: 'Single asset exceeds 30% of portfolio',
  source: 'risk_engine',
  actionRequired: true,
});

// Get alerts
const alerts = launchpad.monitoring.getAlerts(org.id, {
  severity: ['warning', 'error', 'critical'],
  acknowledged: false,
});

// Acknowledge alert
await launchpad.monitoring.acknowledgeAlert(alert.id);

// Record data for tracking
launchpad.monitoring.recordTreasuryTransaction(org.id, {
  id: 'tx_123',
  type: 'swap',
  amount: 1000,
  token: 'TON',
  timestamp: new Date(),
  status: 'confirmed',
});

// Get historical data
const history = launchpad.monitoring.getHistoricalMetrics(org.id, 'totalValue', 30);
```

## Event System

All components emit events for real-time monitoring:

```typescript
launchpad.onEvent((event) => {
  console.log(`[${event.type}] ${event.organizationId}:`, event.data);

  switch (event.type) {
    case 'organization_created':
      // New organization created
      break;
    case 'agent_deployed':
      // Agent deployed to blockchain
      break;
    case 'capital_contributed':
      // New capital contribution
      break;
    case 'proposal_created':
      // New governance proposal
      break;
    case 'risk_alert':
      // Risk threshold breached
      break;
    case 'emergency_stop':
      // Agent emergency stop triggered
      break;
  }
});
```

## Organization Types

| Type | Description |
|------|-------------|
| `dao` | Decentralized Autonomous Organization |
| `crypto_fund` | Cryptocurrency investment fund |
| `hedge_fund` | Hedge fund structure |
| `venture_fund` | Venture capital fund |
| `family_office` | Family office |
| `treasury` | Protocol or project treasury |
| `community` | Community-managed pool |
| `protocol` | Protocol-owned treasury |
| `startup` | Startup treasury management |
| `enterprise` | Enterprise treasury |

## Treasury Agent Types

| Type | Description |
|------|-------------|
| `treasury` | General treasury management |
| `investment` | Active investment strategies |
| `liquidity` | Liquidity provision and management |
| `risk` | Risk monitoring and hedging |
| `yield` | Yield optimization across protocols |
| `hedging` | Hedging and risk mitigation |
| `diversification` | Portfolio diversification |

## Risk Controls

```typescript
const riskControls = {
  enabled: true,
  maxDrawdown: 15,              // Max 15% drawdown
  maxSingleTradePercent: 5,     // Max 5% of portfolio per trade
  dailyLossLimit: 5,            // Max 5% daily loss
  concentrationLimit: 30,       // Max 30% in single asset
  liquidityRequirements: {
    minLiquidPercent: 20,       // Keep 20% liquid
    minLiquidAmount: 1000,      // Min 1000 TON liquid
    liquidAssets: ['TON', 'USDT', 'USDC'],
  },
  emergencyStopConditions: [
    {
      type: 'drawdown',
      threshold: 20,
      action: 'stop',
      cooldownMinutes: 1440,
    },
  ],
  approvalThresholds: [
    {
      type: 'single_transaction',
      amount: 10000,
      requiredApprovals: 2,
      approverRoles: ['admin', 'treasury_manager'],
    },
  ],
};
```

## Fee Structure

### Management Fees
- Charged annually, accrued daily
- Typical range: 1-2%

### Performance Fees
- Charged on profits above high water mark
- Typical range: 15-20%
- Can include hurdle rate

```typescript
const fees = {
  managementFeePercent: 2,      // 2% annual
  performanceFeePercent: 20,    // 20% of profits
  entryFeePercent: 0,           // No entry fee
  exitFeePercent: 1,            // 1% early exit penalty
  highWaterMark: 100,           // Initial NAV
  hurdleRate: 5,                // 5% hurdle before performance fee
};
```

## Security Considerations

- All agents operate with scoped permissions
- Multi-sig support for treasury operations
- Emergency stop capabilities
- Full audit trail for all actions
- Role-based access control
- Governance timelock for critical changes

## Integration with Other Modules

The Launchpad integrates with other TONAIAgent modules:

- **Institutional Module**: KYC/AML compliance for regulated funds
- **Multi-Agent**: Coordinate multiple specialized agents
- **Strategy Engine**: Use pre-built strategies
- **Marketplace**: Publish and share strategies
- **Tokenomics**: Staking and governance token integration

```typescript
import { createLaunchpadService } from '@tonaiagent/core/launchpad';
import { createInstitutionalManager } from '@tonaiagent/core/institutional';

// Use institutional compliance with launchpad
const institutional = createInstitutionalManager();
const launchpad = createLaunchpadService();

// Create compliant fund
const org = await launchpad.organizations.createOrganization({
  name: 'Regulated Fund',
  type: 'hedge_fund',
  creatorUserId: 'user_123',
  compliance: {
    kycRequired: true,
    accreditedOnly: true,
  },
});

// Configure institutional compliance
await institutional.initializeAccount(org.name, 'hedge_fund', 'user_123');
```

## Best Practices

1. **Start with simulation**: Always simulate strategies before deploying
2. **Set conservative limits**: Start with conservative risk limits and adjust
3. **Monitor actively**: Set up alerts for key thresholds
4. **Use governance**: Let the community vote on significant changes
5. **Diversify agents**: Deploy multiple agents with different strategies
6. **Maintain reserves**: Keep sufficient liquidity for redemptions
7. **Audit regularly**: Review agent performance and audit logs

## Troubleshooting

### Agent Not Executing
- Check agent status is 'active'
- Verify capital allocation
- Check risk limits aren't exceeded
- Review gas settings

### Governance Proposal Stuck
- Check if voting period has ended
- Verify quorum has been reached
- Check timelock period
- Ensure executor has permission

### Withdrawal Failed
- Check lock period has expired
- Verify notice period has elapsed
- Ensure sufficient available capital
- Check contributor status

## Version History

- **1.0.0**: Initial release with full launchpad functionality
  - Treasury Agent Framework
  - DAO Governance Integration
  - Fund Infrastructure
  - Capital Pooling
  - Monitoring & Analytics
  - Monetization Support
