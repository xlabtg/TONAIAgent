/**
 * AI Fund Manager Demo
 *
 * Demonstrates the full lifecycle of an AI-managed investment fund:
 * 1. Creating an AI fund with multi-strategy allocation
 * 2. Allocating capital to multiple strategies
 * 3. Accepting investor deposits
 * 4. Executing trades via strategy agents
 * 5. Triggering automatic rebalancing
 * 6. Tracking fund performance metrics
 * 7. Distributing fees
 *
 * This matches the demo requirements from Issue #152.
 */

import { createAIFundManager } from '../src/fund-manager';

async function main() {
  console.log('========================================');
  console.log('  TON AI Agent — AI Fund Manager Demo');
  console.log('========================================\n');

  // ============================================================
  // Step 1: Initialize the AI Fund Manager
  // ============================================================

  console.log('Step 1: Initializing AI Fund Manager...');
  const manager = createAIFundManager({
    enabled: true,
    defaultRiskLimits: {
      maxStrategyExposurePercent: 60,
      maxDrawdownPercent: 20,
      maxAssetConcentrationPercent: 50,
      dailyLossLimitPercent: 5,
      volatilityWindowDays: 30,
    },
    observability: { enableLogging: false, logLevel: 'error' },
  });
  manager.start();

  // Subscribe to all fund events
  const eventLog: string[] = [];
  manager.onEvent((event) => {
    eventLog.push(`  [${event.type}] fundId=${event.fundId}`);
  });

  console.log('  ✓ Fund Manager started\n');

  // ============================================================
  // Step 2: Create an AI Fund
  // ============================================================

  console.log('Step 2: Creating AI Fund...');
  const fund = manager.funds.createFund({
    name: 'Alpha Growth Fund',
    description: 'AI-managed diversified DeFi fund with 3 strategy agents on TON',
    creatorId: 'creator_001',
    type: 'open',
    baseAsset: 'TON',
    strategyAllocations: [
      { strategyId: 'dca-strategy-1',    targetWeightPercent: 40 },
      { strategyId: 'yield-optimizer-1', targetWeightPercent: 35 },
      { strategyId: 'grid-trading-1',    targetWeightPercent: 25 },
    ],
    riskProfile: 'moderate',
    managementFeePercent: 2.0,
    performanceFeePercent: 20.0,
    minInvestmentAmount: BigInt(1_000_000_000), // 1 TON minimum
    rebalancingRules: {
      driftThresholdPercent: 5,
      minIntervalSeconds: 3600,
      maxIntervalSeconds: 86400,
      rebalanceOnVolatility: true,
      volatilityThresholdPercent: 30,
    },
  });

  console.log(`  ✓ Fund created: ${fund.name} (${fund.fundId})`);
  console.log(`  ✓ Strategies: ${fund.strategyAllocations.map(s => `${s.strategyId}@${s.targetWeightPercent}%`).join(', ')}`);
  console.log(`  ✓ Fee model: ${fund.fees.managementFeePercent}% mgmt / ${fund.fees.performanceFeePercent}% perf\n`);

  // ============================================================
  // Step 3: Activate the Fund
  // ============================================================

  console.log('Step 3: Activating fund for investor deposits...');
  manager.funds.activateFund(fund.fundId);
  console.log(`  ✓ Fund state: ${manager.funds.getFundState(fund.fundId)}\n`);

  // ============================================================
  // Step 4: Accept Investor Deposits
  // ============================================================

  console.log('Step 4: Accepting investor deposits...');
  let portfolio = manager.funds.getFundPortfolio(fund.fundId)!;

  const investors = [
    { id: 'investor_alice', address: 'EQD_alice_000', amount: BigInt(100_000_000_000) },   // 100 TON
    { id: 'investor_bob',   address: 'EQD_bob_000',   amount: BigInt(50_000_000_000) },    // 50 TON
    { id: 'investor_carol', address: 'EQD_carol_000', amount: BigInt(75_000_000_000) },    // 75 TON
  ];

  let totalDeposited = BigInt(0);
  for (const inv of investors) {
    const deposit = manager.investors.deposit(
      { fundId: fund.fundId, investorId: inv.id, investorAddress: inv.address, amount: inv.amount },
      fund,
      portfolio
    );
    totalDeposited += inv.amount;
    const tonAmount = Number(inv.amount) / 1e9;
    console.log(`  ✓ ${inv.id}: deposited ${tonAmount} TON → ${deposit.sharesIssued} shares`);
  }

  console.log(`  ✓ Total deposited: ${Number(totalDeposited) / 1e9} TON`);
  console.log(`  ✓ Active investors: ${manager.investors.getInvestorCount(fund.fundId)}\n`);

  // ============================================================
  // Step 5: Allocate Capital to Multiple Strategies
  // ============================================================

  console.log('Step 5: Allocating capital to strategy agents...');
  const { updatedPortfolio, result: allocResult } = manager.allocation.allocateDeposit(
    portfolio,
    fund,
    totalDeposited
  );
  manager.funds.updateFundPortfolio(updatedPortfolio);
  portfolio = updatedPortfolio;

  console.log(`  ✓ Total allocated: ${Number(allocResult.totalAllocated) / 1e9} TON`);
  console.log(`  ✓ Cash reserved: ${Number(allocResult.cashRetained) / 1e9} TON`);
  for (const alloc of allocResult.allocations) {
    console.log(`  ✓ ${alloc.strategyId}: ${Number(alloc.amountAllocated) / 1e9} TON (${alloc.weightPercent}%)`);
  }
  console.log();

  // ============================================================
  // Step 6: Simulate Performance & Trigger Rebalancing
  // ============================================================

  console.log('Step 6: Simulating strategy performance + triggering rebalancing...');

  // Simulate drift: strategy-a over-performed (+15% weight drift)
  const driftedAllocations = [
    { strategyId: 'dca-strategy-1',    targetWeightPercent: 40, currentWeightPercent: 55, allocatedCapital: BigInt(Math.round(Number(allocResult.totalAllocated) * 0.55)) },
    { strategyId: 'yield-optimizer-1', targetWeightPercent: 35, currentWeightPercent: 28, allocatedCapital: BigInt(Math.round(Number(allocResult.totalAllocated) * 0.28)) },
    { strategyId: 'grid-trading-1',    targetWeightPercent: 25, currentWeightPercent: 17, allocatedCapital: BigInt(Math.round(Number(allocResult.totalAllocated) * 0.17)) },
  ];
  const driftedPortfolio = { ...portfolio, allocations: driftedAllocations };

  // Detect rebalancing trigger
  const trigger = manager.rebalancing.shouldRebalance(fund, driftedPortfolio);
  console.log(`  ✓ Rebalancing trigger detected: ${trigger}`);

  if (trigger) {
    // Generate plan
    const plan = manager.rebalancing.generatePlan(fund, driftedPortfolio, trigger);
    console.log(`  ✓ Plan generated: ${plan.actions.length} actions, estimated gas: ${Number(plan.estimatedGasCost) / 1e9} TON`);

    for (const action of plan.actions) {
      console.log(`    → Move ${Number(action.amountToMove) / 1e9} TON: ${action.fromStrategyId} → ${action.toStrategyId}`);
    }

    // Execute rebalancing
    const { result: rebalResult } = await manager.rebalancing.executePlan(plan, driftedPortfolio);
    console.log(`  ✓ Rebalancing complete: ${rebalResult.actionsCompleted} actions, ${Number(rebalResult.gasUsed) / 1e9} TON gas used`);
  }
  console.log();

  // ============================================================
  // Step 7: Risk Assessment
  // ============================================================

  console.log('Step 7: Assessing fund risk...');
  const riskStatus = manager.riskManagement.assessRisk(fund, portfolio);
  console.log(`  ✓ Risk score: ${riskStatus.riskScore} / 100`);
  console.log(`  ✓ Current drawdown: ${riskStatus.currentDrawdownPercent.toFixed(2)}%`);
  console.log(`  ✓ Risk limits breached: ${riskStatus.isBreached ? riskStatus.breachedLimits.join(', ') : 'none'}`);
  console.log();

  // ============================================================
  // Step 8: Track Fund Performance Metrics
  // ============================================================

  console.log('Step 8: Recording performance snapshots...');

  // Simulate multiple NAV snapshots (growing portfolio)
  const navHistory = [1_000_000_000, 1_020_000_000, 1_050_000_000, 1_030_000_000, 1_080_000_000];
  for (let i = 0; i < navHistory.length; i++) {
    const snapshotPortfolio = {
      ...portfolio,
      navPerShare: BigInt(navHistory[i]),
      totalAum: BigInt(Math.round(Number(totalDeposited) * (navHistory[i] / 1_000_000_000))),
    };
    manager.performance.recordSnapshot(snapshotPortfolio, investors.length);
  }

  const metrics = manager.performance.calculateMetrics(fund.fundId, 'all_time');
  console.log(`  ✓ Total return: ${metrics.totalReturnPercent.toFixed(2)}%`);
  console.log(`  ✓ Annualized return: ${metrics.annualizedReturnPercent.toFixed(2)}%`);
  console.log(`  ✓ Sharpe ratio: ${metrics.sharpeRatio.toFixed(3)}`);
  console.log(`  ✓ Sortino ratio: ${metrics.sortinoRatio.toFixed(3)}`);
  console.log(`  ✓ Max drawdown: ${metrics.maxDrawdownPercent.toFixed(2)}%`);
  console.log(`  ✓ Win rate: ${metrics.winRatePercent.toFixed(1)}%`);
  console.log();

  // ============================================================
  // Step 9: Fee Distribution
  // ============================================================

  console.log('Step 9: Distributing fees...');

  // Set HWM below current NAV to trigger performance fee
  manager.fees.setHighWaterMark(fund.fundId, BigInt(900_000_000));
  const portfolioForFees = { ...portfolio, navPerShare: BigInt(1_080_000_000), totalSharesOutstanding: totalDeposited };

  const mgmtFee = manager.fees.collectManagementFee(fund, portfolioForFees);
  if (mgmtFee) {
    console.log(`  ✓ Management fee: ${Number(mgmtFee.totalAmount) / 1e9} TON`);
    for (const dist of mgmtFee.distributions) {
      console.log(`    → ${dist.recipientType}: ${Number(dist.amount) / 1e9} TON (${dist.sharePercent}%)`);
    }
  }

  const perfFee = manager.fees.collectPerformanceFee(fund, portfolioForFees);
  if (perfFee) {
    console.log(`  ✓ Performance fee: ${Number(perfFee.totalAmount) / 1e9} TON`);
    for (const dist of perfFee.distributions) {
      console.log(`    → ${dist.recipientType}: ${Number(dist.amount) / 1e9} TON (${dist.sharePercent}%)`);
    }
  }

  const totalFees = manager.fees.getTotalFeesCollected(fund.fundId);
  console.log(`  ✓ Total fees collected: ${Number(totalFees) / 1e9} TON\n`);

  // ============================================================
  // Step 10: Investor Withdrawal
  // ============================================================

  console.log('Step 10: Processing investor withdrawal (Alice exits)...');
  const aliceWithdraw = manager.investors.withdraw(
    { fundId: fund.fundId, investorId: 'investor_alice', amount: BigInt(0) }, // 0 = full withdrawal
    fund,
    portfolio
  );
  console.log(`  ✓ Alice withdrew: ${Number(aliceWithdraw.amountWithdrawn) / 1e9} TON`);
  console.log(`  ✓ Shares redeemed: ${aliceWithdraw.sharesRedeemed}`);
  console.log(`  ✓ Performance fees charged: ${Number(aliceWithdraw.feesCharged) / 1e9} TON\n`);

  // ============================================================
  // Summary
  // ============================================================

  const health = manager.getHealth();
  console.log('========================================');
  console.log('  Fund Manager Health Summary');
  console.log('========================================');
  console.log(`  Status: ${health.overall}`);
  console.log(`  Active funds: ${health.metrics.activeFunds}`);
  console.log(`  Total AUM: ${Number(health.metrics.totalAum) / 1e9} TON`);
  console.log(`  Total investors: ${health.metrics.totalInvestors}`);
  console.log(`  Total fees: ${Number(health.metrics.totalFeesCollected) / 1e9} TON`);
  console.log();
  console.log('  Events emitted:');
  for (const log of eventLog.slice(0, 10)) {
    console.log(log);
  }
  if (eventLog.length > 10) {
    console.log(`  ... and ${eventLog.length - 10} more events`);
  }
  console.log();
  console.log('✓ Demo completed successfully!');
}

main().catch(console.error);
