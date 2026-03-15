/**
 * GAAMP v1 Demo
 *
 * Demonstrates the full Global Autonomous Asset Management Protocol lifecycle:
 *
 * 1. Initialize GAAMP protocol
 * 2. Register institutional participant (KYC + AML)
 * 3. Create AI-managed hedge fund
 * 4. Deploy trading and risk agents
 * 5. Execute capital allocation
 * 6. Submit trade → clear → settle
 * 7. Governance parameter change via DAO vote
 * 8. View audit trail + compliance report
 * 9. Show system status
 */

import { createGAAMPProtocol } from '../research/gaamp/index';

async function runGAAMPDemo() {
  console.log('=== GAAMP v1 Protocol Demo ===\n');

  // ============================================================================
  // 1. Initialize GAAMP protocol
  // ============================================================================
  const protocol = createGAAMPProtocol({
    chainId: 'ton',
    protocolParameters: {
      maxAgentsPerFund: 10,
      minMarginRatio: 0.1,
    },
    liquidityLayer: {
      enableInternalNetting: true,
      smartRoutingEnabled: true,
      crossChainEnabled: true,
    },
    governanceLayer: {
      daoEnabled: true,
      votingPeriodDays: 7,
      quorumPercent: 10,
      approvalThresholdPercent: 51,
    },
  });

  const events: Array<{ type: string; ts: Date }> = [];
  protocol.onEvent((e) => events.push({ type: e.type, ts: e.timestamp }));

  console.log(`Protocol version: ${protocol.version}`);
  console.log(`Chain: ton\n`);

  // ============================================================================
  // 2. Register participant (KYC + AML)
  // ============================================================================
  console.log('--- Compliance & Identity Layer ---');

  const participant = protocol.compliance.registerParticipant({
    name: 'Apex Capital Partners',
    type: 'institution',
    institutionalType: 'hedge_fund',
    primaryJurisdiction: 'SG',
  });
  console.log(`Registered participant: ${participant.name} (${participant.id})`);

  // Approve KYC
  protocol.compliance.approveKYC(participant.id, 'institutional');
  console.log(`KYC approved: ${protocol.compliance.getParticipant(participant.id)!.kyc.status}`);

  // Run AML screening
  const aml = protocol.compliance.screenParticipant(participant.id);
  console.log(`AML risk level: ${aml.riskLevel}`);

  // Check fund class access
  const canAccessInstitutional = protocol.compliance.canAccessFundClass(participant.id, 'institutional');
  console.log(`Can access institutional fund class: ${canAccessInstitutional}\n`);

  // ============================================================================
  // 3. Create AI-managed hedge fund
  // ============================================================================
  console.log('--- Fund Layer ---');

  const fund = protocol.fundLayer.createFund({
    name: 'TON Alpha AI Fund',
    description: 'AI-native multi-strategy hedge fund on TON blockchain',
    type: 'hedge',
    fundClass: 'institutional',
    chain: 'ton',
    initialCapital: 10_000_000,
    fees: {
      managementFeePercent: 1.0,
      performanceFeePercent: 20,
    },
    riskProfile: {
      riskCategory: 'medium',
      maxDrawdownLimit: 0.2,
      maxLeverage: 2.0,
      varLimit: 0.1,
    },
  });

  console.log(`Created fund: ${fund.name} (${fund.id})`);
  console.log(`  Initial AUM: $${fund.aum.toLocaleString()}`);
  console.log(`  NAV/Share: $${fund.navPerShare}`);
  console.log(`  Total shares: ${fund.totalShares.toLocaleString()}`);

  // Process investment
  const investment = protocol.fundLayer.processInvestment({
    fundId: fund.id,
    participantId: participant.id,
    amount: 2_000_000,
  });
  console.log(`  Investment processed: $${investment.amount.toLocaleString()}`);
  console.log(`  Shares issued: ${investment.sharesIssued.toFixed(2)}\n`);

  // ============================================================================
  // 4. Deploy AI agents
  // ============================================================================
  console.log('--- Agent Layer ---');

  const tradingAgent = protocol.agentLayer.registerAgent({
    name: 'TON Alpha Trading Bot v1',
    type: 'trading',
    version: '1.0.0',
    fundId: fund.id,
  });
  protocol.agentLayer.activateAgent(tradingAgent.id);

  const riskAgent = protocol.agentLayer.registerAgent({
    name: 'Risk Guardian v1',
    type: 'risk',
    version: '1.0.0',
    fundId: fund.id,
  });
  protocol.agentLayer.activateAgent(riskAgent.id);

  console.log(`Deployed trading agent: ${tradingAgent.name}`);
  console.log(`  Capabilities: ${tradingAgent.capabilities.join(', ')}`);
  console.log(`Deployed risk agent: ${riskAgent.name}`);
  console.log(`  Capabilities: ${riskAgent.capabilities.join(', ')}\n`);

  // ============================================================================
  // 5. Capital allocation
  // ============================================================================
  console.log('--- Capital Allocation ---');

  const allocation = protocol.agentLayer.executeAllocate(tradingAgent.id, {
    totalCapital: 10_000_000,
    targetAllocations: {
      'TON': 0.40,
      'USDT': 0.30,
      'BTC': 0.20,
      'ETH': 0.10,
    },
  });

  console.log('Capital allocation:');
  for (const [asset, amount] of Object.entries(allocation.allocations)) {
    console.log(`  ${asset}: $${amount.toLocaleString()}`);
  }

  // Rebalance example
  const rebalance = protocol.agentLayer.executeRebalance(tradingAgent.id, {
    currentAllocations: { 'TON': 0.45, 'USDT': 0.25, 'BTC': 0.20, 'ETH': 0.10 },
    targetAllocations: { 'TON': 0.40, 'USDT': 0.30, 'BTC': 0.20, 'ETH': 0.10 },
    threshold: 0.03,
  });
  console.log(`\nRebalance trades: ${rebalance.trades.length} trades needed`);
  for (const trade of rebalance.trades) {
    console.log(`  ${trade.side.toUpperCase()} ${trade.asset}: ${(trade.amount * 100).toFixed(1)}%`);
  }

  // Hedging
  const hedge = protocol.agentLayer.executeHedge(riskAgent.id, {
    exposures: { 'TON': 500_000, 'BTC': 200_000 },
    targetNetExposure: 0,
    hedgingInstruments: ['TON_perpetual', 'BTC_perpetual'],
  });
  console.log(`\nHedged ${hedge.hedges.length} positions`);

  // ============================================================================
  // 6. Trade → Clear → Settle
  // ============================================================================
  console.log('\n--- Clearing & Settlement Layer ---');

  // Register liquidity pools
  protocol.liquidityLayer.registerPool({
    name: 'TON/USDT Primary Pool',
    type: 'automated_market_maker',
    assets: ['TON', 'USDT'],
    totalLiquidity: 50_000_000,
    chain: 'ton',
    apy: 0.08,
  });

  // Submit clearing
  const clearingRecord = protocol.clearingLayer.submitTrade({
    tradeId: 'trade_demo_001',
    buyerFundId: fund.id,
    sellerFundId: 'counterparty_fund_xyz',
    asset: 'TON',
    quantity: 100_000,
    price: 5.50,
    chain: 'ton',
  });

  console.log(`Trade submitted for clearing: ${clearingRecord.id}`);
  console.log(`  Notional: $${clearingRecord.notionalValue.toLocaleString()}`);
  console.log(`  Margin required: $${clearingRecord.marginRequired.toLocaleString()}`);

  // Run AI netting
  const netting = protocol.clearingLayer.runNettingEngine([fund.id, 'counterparty_fund_xyz']);
  console.log(`\nAI netting result:`);
  console.log(`  Gross obligations: ${netting.grossObligations}`);
  console.log(`  Net obligations: ${netting.netObligations}`);
  console.log(`  Efficiency rate: ${(netting.efficiencyRate * 100).toFixed(1)}%`);

  // Fund insurance pool
  protocol.clearingLayer.fundInsurancePool(500_000, fund.id);
  console.log(`\nInsurance pool funded: $500,000`);
  console.log(`  Available reserves: $${protocol.clearingLayer.getInsurancePool().availableReserves.toLocaleString()}`);

  // Settle
  protocol.clearingLayer.updateClearingStatus(clearingRecord.id, 'approved');
  const settlement = protocol.clearingLayer.initiateSettlement(clearingRecord.id);
  const confirmed = protocol.clearingLayer.confirmSettlement(settlement.id, 'ton_tx_abc123456');
  console.log(`\nTrade settled: ${confirmed.id}`);
  console.log(`  Tx hash: ${confirmed.transactionHash}`);
  console.log(`  Status: ${confirmed.status}`);

  // ============================================================================
  // 7. Governance parameter change via DAO vote
  // ============================================================================
  console.log('\n--- Governance Layer ---');

  // Give participant voting power
  protocol.governanceLayer.setVotingPower(participant.id, 10_000);
  console.log(`Voting power assigned: ${protocol.governanceLayer.getVotingPower(participant.id).toLocaleString()} TONAI`);

  // Submit proposal
  const proposal = protocol.governanceLayer.submitProposal({
    title: 'Reduce protocol fee to 0.05%',
    description: 'Lower protocol trading fee to increase competitiveness',
    type: 'fee_structure_change',
    proposerId: participant.id,
    parameters: { protocolFeePercent: 0.05 },
  });
  console.log(`\nGovernance proposal submitted: ${proposal.id}`);
  console.log(`  Title: ${proposal.title}`);
  console.log(`  Status: ${proposal.status}`);

  // Vote
  const vote = protocol.governanceLayer.castVote({
    proposalId: proposal.id,
    voterId: participant.id,
    decision: 'yes',
    rationale: 'Lower fees will attract more institutional participants',
  });
  console.log(`\nVote cast: ${vote.decision.toUpperCase()} (${vote.votingPower.toLocaleString()} power)`);

  // Finalize
  const finalized = protocol.governanceLayer.finalizeProposal(proposal.id);
  console.log(`Proposal finalized: ${finalized.status}`);

  if (finalized.status === 'passed') {
    const executed = protocol.governanceLayer.executeProposal(proposal.id);
    console.log(`Proposal executed: ${executed.status}`);
    const params = protocol.governanceLayer.getParameters();
    console.log(`  New protocol fee: ${params.protocolFeePercent}%`);
  }

  // ============================================================================
  // 8. Audit trail + compliance report
  // ============================================================================
  console.log('\n--- Compliance Report ---');

  const auditTrail = protocol.compliance.getAuditTrail({ participantId: participant.id });
  console.log(`Audit trail entries: ${auditTrail.length}`);
  for (const entry of auditTrail.slice(0, 3)) {
    console.log(`  [${entry.timestamp.toISOString()}] ${entry.action}`);
  }

  const complianceReport = protocol.compliance.generateComplianceReport({
    participantId: participant.id,
    jurisdiction: 'SG',
    period: { from: new Date('2026-01-01'), to: new Date('2026-03-31') },
    reportType: 'regulatory',
  });
  console.log(`\nCompliance report generated: ${complianceReport.id}`);
  console.log(`  Findings: ${complianceReport.findings.length}`);
  console.log(`  Status: ${complianceReport.status}`);

  // ============================================================================
  // 9. System status
  // ============================================================================
  console.log('\n--- GAAMP System Status ---');

  const status = protocol.getSystemStatus();
  console.log(`Version: ${status.version}`);
  console.log(`Chain: ${status.chain}`);
  console.log(`Protocol paused: ${status.isPaused}`);
  console.log(`Registered agents: ${status.agents}`);
  console.log(`Active funds: ${status.activeFunds}`);
  console.log(`Total AUM: $${status.totalAUM.toLocaleString()}`);
  console.log(`Liquidity pools: ${status.liquidityPools}`);
  console.log(`Available liquidity: $${status.availableLiquidity.toLocaleString()}`);
  console.log(`Pending clearing: ${status.pendingClearing}`);
  console.log(`Insurance pool: $${status.insurancePoolBalance.toLocaleString()}`);
  console.log(`Governance proposals: ${status.governanceProposals}`);
  console.log(`Registered participants: ${status.registeredParticipants}`);

  console.log('\n--- Protocol Events Emitted ---');
  const uniqueEventTypes = [...new Set(events.map(e => e.type))];
  for (const type of uniqueEventTypes) {
    const count = events.filter(e => e.type === type).length;
    console.log(`  ${type}: ${count} event(s)`);
  }

  console.log('\n=== GAAMP v1 Demo Complete ===');
}

runGAAMPDemo().catch(console.error);
