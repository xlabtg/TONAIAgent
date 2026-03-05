/**
 * Systemic Risk & Stability Framework — Demo Script
 * Issue #122
 *
 * This demo simulates:
 * 1. A volatility spike → automatic leverage reduction
 * 2. Circuit breaker activation
 * 3. Insurance fund emergency liquidity
 * 4. Updated GAAMP Stability Index
 *
 * Run: npx tsx examples/systemic-risk-demo.ts
 */

import { createSystemicRiskManager } from '../src/systemic-risk';

async function runDemo() {
  console.log('=== Systemic Risk & Stability Framework Demo ===\n');

  // ── 1. Initialize the manager ─────────────────────────────────────────────
  const manager = createSystemicRiskManager({
    leverageGovernor: { baseMaxLeverage: 10, crisisMaxLeverage: 2 },
    insuranceFund: { targetCoverageRatio: 0.05 },
  });

  // Subscribe to all events
  manager.onEvent(event => {
    const time = new Date(event.timestamp).toISOString();
    console.log(`  [EVENT ${time}] ${event.type}`);
  });

  // ── 2. Register fund exposures ────────────────────────────────────────────
  console.log('Step 1: Register fund positions...');
  manager.exposureMonitor.updateFundExposure({
    fundId: 'GAAMP-FUND-001',
    agentPositions: [
      { agentId: 'ai-agent-alpha', assetId: 'TON', value: 2_000_000, leverage: 4 },
      { agentId: 'ai-agent-alpha', assetId: 'ETH', value: 1_000_000, leverage: 2 },
      { agentId: 'ai-agent-beta', assetId: 'USDT', value: 500_000, leverage: 1 },
    ],
  });
  manager.exposureMonitor.updateFundExposure({
    fundId: 'GAAMP-FUND-002',
    agentPositions: [
      { agentId: 'ai-agent-gamma', assetId: 'BTC', value: 1_500_000, leverage: 3 },
      { agentId: 'ai-agent-delta', assetId: 'RWA_TOKEN_REAL_ESTATE', value: 800_000, leverage: 1 },
    ],
  });

  const heatMap = manager.exposureMonitor.getHeatMap();
  console.log(`   Total system exposure: $${(heatMap.totalSystemExposure / 1_000_000).toFixed(2)}M`);
  console.log(`   Funds tracked: ${heatMap.fundExposures.length}`);
  console.log(`   Agents tracked: ${heatMap.agentExposures.length}`);
  console.log(`   Overall heat level: ${heatMap.overallHeatLevel.toUpperCase()}`);
  if (heatMap.concentrationAlerts.length > 0) {
    console.log(`   Concentration alerts: ${heatMap.concentrationAlerts.length}`);
  }
  console.log();

  // ── 3. Fund the insurance pool ────────────────────────────────────────────
  console.log('Step 2: Fund insurance & stability pool...');
  manager.insuranceFund.contribute({
    contributorId: 'protocol-treasury',
    contributorType: 'protocol',
    amount: 500_000,
    tranche: 'senior',
  });
  manager.insuranceFund.contribute({
    contributorId: 'GAAMP-FUND-001',
    contributorType: 'fund',
    amount: 150_000,
    tranche: 'mezzanine',
  });
  manager.insuranceFund.contribute({
    contributorId: 'GAAMP-FUND-002',
    contributorType: 'fund',
    amount: 80_000,
    tranche: 'junior',
  });

  const poolTotal = manager.insuranceFund.getTotalPool();
  const coverageRatio = manager.insuranceFund.getCoverageRatio(heatMap.totalSystemExposure);
  console.log(`   Total insurance pool: $${(poolTotal / 1_000).toFixed(0)}K`);
  console.log(`   Coverage ratio: ${(coverageRatio * 100).toFixed(2)}%`);
  console.log();

  // ── 4. Run AI stress tests ────────────────────────────────────────────────
  console.log('Step 3: AI Stress Testing — running all 5 scenarios...');
  const portfolios = [
    {
      fundId: 'GAAMP-FUND-001',
      totalValue: 7_000_000,
      marginRequirement: 0.10,
      leverage: 3,
      agents: [
        {
          agentId: 'ai-agent-alpha',
          positions: [
            { assetId: 'TON', value: 2_000_000, leverage: 4 },
            { assetId: 'ETH', value: 1_000_000, leverage: 2 },
          ],
        },
        {
          agentId: 'ai-agent-beta',
          positions: [{ assetId: 'USDT', value: 500_000, leverage: 1 }],
        },
      ],
    },
    {
      fundId: 'GAAMP-FUND-002',
      totalValue: 2_300_000,
      marginRequirement: 0.12,
      leverage: 2,
      agents: [
        {
          agentId: 'ai-agent-gamma',
          positions: [{ assetId: 'BTC', value: 1_500_000, leverage: 3 }],
        },
        {
          agentId: 'ai-agent-delta',
          positions: [{ assetId: 'RWA_TOKEN_REAL_ESTATE', value: 800_000, leverage: 1 }],
        },
      ],
    },
  ];

  const stressResults = manager.stressTesting.runAllStressTests(portfolios);
  for (const result of stressResults) {
    const survivability = result.systemSurvivability.toUpperCase().padEnd(10);
    const loss = (result.totalPortfolioLossPct * 100).toFixed(1).padStart(6);
    console.log(`   [${survivability}] ${result.scenarioName}: ${loss}% portfolio loss`);
  }

  // Worst-case scenario
  const worstCase = stressResults.reduce((worst, r) =>
    r.totalPortfolioLossPct > worst.totalPortfolioLossPct ? r : worst,
  );
  console.log(`\n   Worst case: "${worstCase.scenarioName}"`);
  console.log(`   Capital buffer required: $${(worstCase.capitalBufferRequired / 1_000_000).toFixed(2)}M`);
  console.log(`   Adjusted margin requirement: ${(worstCase.adjustedMarginRequirement * 100).toFixed(1)}%`);
  console.log();

  // ── 5. Simulate volatility spike → leverage reduction ─────────────────────
  console.log('Step 4: Simulate VOLATILITY SPIKE...');
  const prevMax = manager.leverageGovernor.getEffectiveMaxLeverage();
  manager.leverageGovernor.updateMarketConditions(0.60, 'crisis');
  const newMax = manager.leverageGovernor.getEffectiveMaxLeverage();

  console.log(`   Market regime: CRISIS`);
  console.log(`   Volatility index: 60%`);
  console.log(`   Max leverage: ${prevMax.toFixed(1)}x → ${newMax.toFixed(1)}x`);

  // Check if agent-alpha would be allowed to take leverage
  const leverageCheck = manager.leverageGovernor.checkLeverage('ai-agent-alpha', 4);
  console.log(`   Agent alpha requesting 4x: ${leverageCheck.approved ? 'APPROVED' : 'DENIED'} (allowed: ${leverageCheck.allowedLeverage.toFixed(1)}x)`);
  console.log();

  // ── 6. Trigger circuit breaker ────────────────────────────────────────────
  console.log('Step 5: Triggering CIRCUIT BREAKER...');
  const cbEvent = manager.circuitBreaker.evaluate({
    type: 'large_liquidation_wave',
    value: 8,  // 8 simultaneous liquidations, threshold is 5
    message: '8 agents in simultaneous liquidation — cascade risk detected',
  });

  if (cbEvent) {
    console.log(`   Circuit breaker TRIGGERED: ${cbEvent.triggerType}`);
    console.log(`   Actions active: ${cbEvent.actions.join(', ')}`);
    console.log(`   Trading halted: ${manager.circuitBreaker.isTradingHalted()}`);
    console.log(`   Leverage frozen: ${manager.circuitBreaker.isLeverageFrozen()}`);
  }
  console.log();

  // ── 7. Emergency liquidity from insurance fund ───────────────────────────
  console.log('Step 6: Emergency liquidity backstop activation...');
  if (cbEvent) {
    const elEvent = manager.insuranceFund.triggerEmergencyLiquidity(
      cbEvent,
      ['GAAMP-FUND-001', 'GAAMP-FUND-002'],
      300_000,
    );
    console.log(`   Emergency liquidity provided: $${(elEvent.liquidityProvided / 1_000).toFixed(0)}K`);
    console.log(`   Funds supported: ${elEvent.fundsSupported.join(', ')}`);
    console.log(`   Insurance pool remaining: $${(manager.insuranceFund.getTotalPool() / 1_000).toFixed(0)}K`);
  }
  console.log();

  // ── 8. Compute GAAMP Stability Index ─────────────────────────────────────
  console.log('Step 7: Computing GAAMP Stability Index...');
  const updatedCoverage = manager.insuranceFund.getCoverageRatio(heatMap.totalSystemExposure);
  const stabilityIndex = manager.stabilityScore.computeScore({
    capitalAdequacyRatio: 0.09,       // slightly stressed
    currentLeverage: newMax,           // reduced by governor
    maxLeverage: newMax,
    topConcentrationPct: 0.35,        // elevated due to panic exits
    liquidityRatio: 0.45,             // reduced in crisis
    insuranceCoverageRatio: updatedCoverage,
    lastStressTestResult: worstCase.systemSurvivability,
  });

  console.log(`\n  ╔═══════════════════════════════════════════════════════════╗`);
  console.log(`  ║         GAAMP STABILITY INDEX                             ║`);
  console.log(`  ╠═══════════════════════════════════════════════════════════╣`);
  console.log(`  ║  Score:   ${String(stabilityIndex.score.toFixed(1)).padEnd(52)}║`);
  console.log(`  ║  Grade:   ${String(stabilityIndex.grade).padEnd(52)}║`);
  console.log(`  ║  Trend:   ${String(stabilityIndex.trend).padEnd(52)}║`);
  console.log(`  ╠═══════════════════════════════════════════════════════════╣`);
  console.log(`  ║  Capital Adequacy:      ${String(stabilityIndex.components.capitalAdequacy.score.toFixed(1) + '/100').padEnd(38)}║`);
  console.log(`  ║  Leverage Ratios:       ${String(stabilityIndex.components.leverageRatios.score.toFixed(1) + '/100').padEnd(38)}║`);
  console.log(`  ║  Exposure Concentration:${String(stabilityIndex.components.exposureConcentration.score.toFixed(1) + '/100').padEnd(38)}║`);
  console.log(`  ║  Liquidity Depth:       ${String(stabilityIndex.components.liquidityDepth.score.toFixed(1) + '/100').padEnd(38)}║`);
  console.log(`  ║  Insurance Coverage:    ${String(stabilityIndex.components.insuranceCoverage.score.toFixed(1) + '/100').padEnd(38)}║`);
  console.log(`  ╚═══════════════════════════════════════════════════════════╝`);
  console.log();
  console.log(`  Public summary:`);
  console.log(`  ${stabilityIndex.publicSummary}`);
  console.log();

  // ── 9. Resolution ─────────────────────────────────────────────────────────
  console.log('Step 8: Resolving circuit breaker as conditions normalize...');
  if (cbEvent) {
    manager.circuitBreaker.resolve(cbEvent.id);
    manager.leverageGovernor.updateMarketConditions(0.25, 'neutral');
    console.log(`   Circuit breaker status: ${manager.circuitBreaker.getState().status}`);
    console.log(`   New max leverage: ${manager.leverageGovernor.getEffectiveMaxLeverage().toFixed(1)}x`);
  }
  console.log();

  // ── 10. Final system status ───────────────────────────────────────────────
  console.log('=== Final System Status ===');
  const finalStatus = manager.getSystemStatus();
  console.log(`  Circuit Breaker:  ${finalStatus.circuitBreaker.status}`);
  console.log(`  Leverage Governor Regime: ${finalStatus.leverageGovernor.marketRegime}`);
  console.log(`  Insurance Pool:   $${(finalStatus.insuranceFund.totalPool / 1_000).toFixed(0)}K`);
  console.log(`  Stress Tests Run: ${finalStatus.stressTestCount}`);
  console.log(`  Stability Score:  ${finalStatus.stabilityIndex?.score.toFixed(1)} (${finalStatus.stabilityIndex?.grade})`);
  console.log();
  console.log('Demo complete. Systemic Risk & Stability Framework operational.');
}

runDemo().catch(console.error);
