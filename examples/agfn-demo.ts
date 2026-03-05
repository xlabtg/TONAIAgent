/**
 * Autonomous Global Financial Network (AGFN) — Demo Script
 * Issue #141
 *
 * This demo simulates:
 * 1. Multi-regional node registration (sovereign, institutional, custodian, liquidity)
 * 2. Cross-jurisdiction capital routing
 * 3. Global settlement with atomic finality
 * 4. AI coordination: liquidity balancing and risk cluster detection
 * 5. Multi-reserve treasury operations
 * 6. Global stability dashboard monitoring
 *
 * Run: npx tsx examples/agfn-demo.ts
 */

import { createAGFNManager } from '../src/agfn';

async function runDemo() {
  console.log('=== Autonomous Global Financial Network (AGFN) Demo ===\n');

  // ── 1. Initialize the AGFN Manager ───────────────────────────────────────
  console.log('Step 1: Initialize AGFN Manager...');
  const agfn = createAGFNManager();

  // Subscribe to all events
  agfn.onEvent(event => {
    const time = new Date(event.timestamp).toISOString();
    console.log(`  [EVENT ${time}] ${event.type}: ${event.message}`);
  });

  console.log('   AGFN Manager initialized with all 6 components');
  console.log();

  // ── 2. Register Network Nodes ────────────────────────────────────────────
  console.log('Step 2: Register multi-regional network nodes...');

  // Sovereign nodes
  const ecbNode = agfn.nodeArchitecture.registerNode({
    name: 'European Central Bank Node',
    type: 'sovereign',
    jurisdiction: 'EU',
    chain: 'ethereum',
    operatorId: 'ecb_primary',
    capacityUSD: 500_000_000_000, // $500B
    complianceLevel: 'sovereign',
  });
  console.log(`   ✓ Sovereign node registered: ${ecbNode.name} (${ecbNode.jurisdiction})`);

  const fedNode = agfn.nodeArchitecture.registerNode({
    name: 'Federal Reserve Node',
    type: 'sovereign',
    jurisdiction: 'US',
    chain: 'ton',
    operatorId: 'fed_primary',
    capacityUSD: 800_000_000_000, // $800B
    complianceLevel: 'sovereign',
  });
  console.log(`   ✓ Sovereign node registered: ${fedNode.name} (${fedNode.jurisdiction})`);

  // Institutional nodes
  const jpMorganNode = agfn.nodeArchitecture.registerNode({
    name: 'JPMorgan Custody',
    type: 'institutional',
    jurisdiction: 'US',
    chain: 'ton',
    operatorId: 'jpm_custody_001',
    capacityUSD: 100_000_000_000, // $100B
    complianceLevel: 'enhanced',
  });
  console.log(`   ✓ Institutional node registered: ${jpMorganNode.name}`);

  const hsbc = agfn.nodeArchitecture.registerNode({
    name: 'HSBC Asia Pacific',
    type: 'institutional',
    jurisdiction: 'HK',
    chain: 'ton',
    operatorId: 'hsbc_apac',
    capacityUSD: 80_000_000_000, // $80B
    complianceLevel: 'enhanced',
  });
  console.log(`   ✓ Institutional node registered: ${hsbc.name}`);

  // Custodian node
  const stateStreet = agfn.nodeArchitecture.registerNode({
    name: 'State Street Custody',
    type: 'custodian',
    jurisdiction: 'US',
    chain: 'ethereum',
    operatorId: 'stt_global',
    capacityUSD: 40_000_000_000, // $40B
    complianceLevel: 'enhanced',
  });
  console.log(`   ✓ Custodian node registered: ${stateStreet.name}`);

  // Liquidity node
  const citadel = agfn.nodeArchitecture.registerNode({
    name: 'Citadel Securities',
    type: 'liquidity',
    jurisdiction: 'US',
    chain: 'ton',
    operatorId: 'citadel_mm',
    capacityUSD: 50_000_000_000, // $50B
    complianceLevel: 'standard',
  });
  console.log(`   ✓ Liquidity node registered: ${citadel.name}`);

  // Clearing node
  const dtcc = agfn.nodeArchitecture.registerNode({
    name: 'DTCC Clearing',
    type: 'clearing',
    jurisdiction: 'US',
    chain: 'ton',
    operatorId: 'dtcc_ccp',
    capacityUSD: 200_000_000_000, // $200B
    complianceLevel: 'enhanced',
  });
  console.log(`   ✓ Clearing node registered: ${dtcc.name}`);

  const topology = agfn.nodeArchitecture.getNetworkTopology();
  console.log(`\n   Network Summary:`);
  console.log(`     Total nodes: ${topology.totalNodes}`);
  console.log(`     Active nodes: ${topology.activeNodes}`);
  console.log(`     Total capacity: $${(topology.totalCapacityUSD / 1_000_000_000_000).toFixed(2)}T`);
  console.log();

  // ── 3. Issue Liquidity Passports ─────────────────────────────────────────
  console.log('Step 3: Issue cross-jurisdiction liquidity passports...');

  const euUsPassport = agfn.capitalRouting.issueLiquidityPassport({
    holderId: jpMorganNode.id,
    holderName: 'JPMorgan Chase',
    allowedJurisdictions: ['US', 'EU', 'UK', 'HK', 'SG', 'JP'],
    maxCapitalFlowPerDayUSD: 10_000_000_000, // $10B/day
    complianceTier: 'institutional',
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  });
  console.log(`   ✓ Passport issued: ${euUsPassport.id} for JPMorgan (6 jurisdictions)`);

  const asiaPassport = agfn.capitalRouting.issueLiquidityPassport({
    holderId: hsbc.id,
    holderName: 'HSBC Holdings',
    allowedJurisdictions: ['HK', 'SG', 'JP', 'CN', 'AU'],
    maxCapitalFlowPerDayUSD: 5_000_000_000, // $5B/day
    complianceTier: 'institutional',
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });
  console.log(`   ✓ Passport issued: ${asiaPassport.id} for HSBC (5 jurisdictions)`);
  console.log();

  // ── 4. Cross-Jurisdiction Capital Routing ────────────────────────────────
  console.log('Step 4: Compute cross-jurisdiction capital routes...');

  const route1 = agfn.capitalRouting.computeRoute({
    sourceNodeId: ecbNode.id,
    destinationNodeId: jpMorganNode.id,
    amount: 1_000_000_000, // $1B
    currency: 'USD',
    strategy: 'compliance_first',
  });
  console.log(`   ✓ Route computed: EU → US, $1B, ${route1.hops.length} hops, ${route1.estimatedLatencyMs}ms`);

  const route2 = agfn.capitalRouting.computeRoute({
    sourceNodeId: jpMorganNode.id,
    destinationNodeId: hsbc.id,
    amount: 500_000_000, // $500M
    currency: 'USD',
    strategy: 'fastest_settlement',
  });
  console.log(`   ✓ Route computed: US → HK, $500M, ${route2.hops.length} hops, ${route2.estimatedLatencyMs}ms`);
  console.log();

  // ── 5. Global Settlement ─────────────────────────────────────────────────
  console.log('Step 5: Execute global settlements...');

  const settlement1 = agfn.settlementMesh.initiateSettlement({
    routeId: route1.id,
    settlementType: 'atomic',
    sourceNodeId: route1.sourceNodeId,
    destinationNodeId: route1.destinationNodeId,
    amount: route1.finalAmount,
    currency: route1.currency,
  });
  console.log(`   ✓ Settlement initiated: ${settlement1.id} (atomic, $${(settlement1.amount / 1_000_000_000).toFixed(1)}B)`);

  // Finalize the settlement
  agfn.settlementMesh.recordFinality({
    settlementId: settlement1.id,
    chain: 'ton',
    txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
    blockNumber: 12345678,
    blockTimestamp: new Date(),
  });
  console.log(`   ✓ Settlement finalized: ${settlement1.id}`);

  const meshStatus = agfn.settlementMesh.getMeshStatus();
  console.log(`\n   Settlement Mesh Status:`);
  console.log(`     Pending: ${meshStatus.pendingSettlements}`);
  console.log(`     Processing: ${meshStatus.processingSettlements}`);
  console.log(`     Finalized: ${meshStatus.finalizedSettlements}`);
  console.log(`     Total volume: $${(meshStatus.totalVolumeProcessedUSD / 1_000_000_000).toFixed(2)}B`);
  console.log();

  // ── 6. AI Coordination: Liquidity Balancing ──────────────────────────────
  console.log('Step 6: AI Coordination — Liquidity balancing...');

  // Simulate node liquidity snapshots with some imbalance
  const nodeSnapshots = [
    { nodeId: ecbNode.id, availableLiquidityUSD: 400_000_000_000, utilization: 0.20, liquidityGapUSD: 100_000_000_000 },
    { nodeId: fedNode.id, availableLiquidityUSD: 600_000_000_000, utilization: 0.25, liquidityGapUSD: 200_000_000_000 },
    { nodeId: jpMorganNode.id, availableLiquidityUSD: 20_000_000_000, utilization: 0.80, liquidityGapUSD: -30_000_000_000 },
    { nodeId: hsbc.id, availableLiquidityUSD: 15_000_000_000, utilization: 0.85, liquidityGapUSD: -25_000_000_000 },
    { nodeId: citadel.id, availableLiquidityUSD: 45_000_000_000, utilization: 0.10, liquidityGapUSD: 5_000_000_000 },
    { nodeId: dtcc.id, availableLiquidityUSD: 180_000_000_000, utilization: 0.10, liquidityGapUSD: 20_000_000_000 },
  ];

  const liquidityBalance = agfn.aiCoordination.computeGlobalLiquidityBalance(nodeSnapshots);
  console.log(`   ✓ Global liquidity computed:`);
  console.log(`     Total network liquidity: $${(liquidityBalance.totalNetworkLiquidityUSD / 1_000_000_000_000).toFixed(2)}T`);
  console.log(`     Imbalance score: ${liquidityBalance.imbalanceScore.toFixed(1)}/100`);
  console.log(`     Recommended rebalance actions: ${liquidityBalance.recommendedRebalanceActions.length}`);

  if (liquidityBalance.recommendedRebalanceActions.length > 0) {
    console.log(`\n   Rebalance recommendations:`);
    for (const action of liquidityBalance.recommendedRebalanceActions.slice(0, 3)) {
      console.log(`     • ${action.fromNodeId} → ${action.toNodeId}: $${(action.amountUSD / 1_000_000).toFixed(0)}M (${action.priority})`);
    }
  }
  console.log();

  // ── 7. AI Coordination: Risk Cluster Detection ───────────────────────────
  console.log('Step 7: AI Coordination — Risk cluster detection...');

  const clusters = agfn.aiCoordination.detectRiskClusters({
    nodeIds: [jpMorganNode.id, hsbc.id, stateStreet.id, citadel.id, dtcc.id],
    jurisdictions: ['US'],  // High concentration in US
    chains: ['ton'],
    sensitivityLevel: 'medium',
  });

  if (clusters.length > 0) {
    console.log(`   ⚠️ ${clusters.length} risk cluster(s) detected:`);
    for (const cluster of clusters) {
      console.log(`     • ${cluster.clusterType.toUpperCase()}: Risk score ${cluster.riskScore}/100`);
      console.log(`       Exposure: $${(cluster.estimatedExposureUSD / 1_000_000_000).toFixed(1)}B`);
      console.log(`       Mitigation: ${cluster.mitigationActions[0]}`);
    }
  } else {
    console.log(`   ✓ No significant risk clusters detected`);
  }
  console.log();

  // ── 8. Multi-Reserve Treasury ────────────────────────────────────────────
  console.log('Step 8: Multi-Reserve Treasury — Create regional pools...');

  const usPool = agfn.treasuryNetwork.createReservePool({
    name: 'US Dollar Reserve Pool',
    region: 'americas',
    targetValueUSD: 50_000_000_000, // $50B
    stabilityThreshold: 0.95,
  });
  // Add assets to the pool
  agfn.treasuryNetwork.depositToPool(usPool.id, {
    assetClass: 'stablecoin',
    assetId: 'USDC',
    amount: 20_000_000_000,
    valueUSD: 20_000_000_000,
  });
  agfn.treasuryNetwork.depositToPool(usPool.id, {
    assetClass: 'treasury_bond',
    assetId: 'UST_10Y',
    amount: 25_000_000_000,
    valueUSD: 25_000_000_000,
  });
  console.log(`   ✓ US Reserve Pool: $${(usPool.totalValueUSD / 1_000_000_000).toFixed(0)}B → $45B after deposits`);

  const euPool = agfn.treasuryNetwork.createReservePool({
    name: 'Euro Reserve Pool',
    region: 'emea',
    targetValueUSD: 40_000_000_000, // $40B
    stabilityThreshold: 0.95,
  });
  agfn.treasuryNetwork.depositToPool(euPool.id, {
    assetClass: 'stablecoin',
    assetId: 'EURC',
    amount: 15_000_000_000,
    valueUSD: 15_000_000_000,
  });
  console.log(`   ✓ EU Reserve Pool: $15B`);

  // Create a multi-asset treasury vault
  const globalVault = agfn.treasuryNetwork.createTreasuryVault({
    name: 'Global Stability Vault',
    jurisdiction: 'CH', // Switzerland for neutrality
    vaultType: 'stability_buffer',
    targetAllocation: [
      { assetClass: 'stablecoin', targetPct: 40 },
      { assetClass: 'treasury_bond', targetPct: 35 },
      { assetClass: 'native_crypto', targetPct: 15 },
      { assetClass: 'commodity', targetPct: 10 },
    ],
  });
  console.log(`   ✓ Global Stability Vault created in ${globalVault.jurisdiction}`);

  const reserveSummary = agfn.treasuryNetwork.getNetworkReserveSummary();
  console.log(`\n   Treasury Network Summary:`);
  console.log(`     Reserve pools: ${reserveSummary.totalPools}`);
  console.log(`     Total reserves: $${(reserveSummary.totalReserveValueUSD / 1_000_000_000).toFixed(1)}B`);
  console.log(`     Treasury vaults: ${reserveSummary.totalVaults}`);
  console.log();

  // ── 9. Global Stability Dashboard ────────────────────────────────────────
  console.log('Step 9: Global Stability Dashboard — Monitor system health...');

  // Record a stability snapshot
  agfn.stabilityDashboard.recordSnapshot({
    totalExposureUSD: 1_800_000_000_000, // $1.8T
    totalLiquidityUSD: liquidityBalance.totalNetworkLiquidityUSD,
    averageLeverageRatio: 2.5,
    riskClusterCount: clusters.length,
    settlementBacklogCount: meshStatus.pendingSettlements,
    nodeHealthScore: 95,
  });

  const publicMetrics = agfn.stabilityDashboard.getPublicMetricsSummary();
  console.log(`   Global Stability Dashboard:`);
  console.log(`     ╔════════════════════════════════════════╗`);
  console.log(`     ║  AGFN STABILITY INDEX: ${publicMetrics.stabilityIndex}/100        ║`);
  console.log(`     ║  Status: ${publicMetrics.stabilityIndicator.toUpperCase().padEnd(28)}║`);
  console.log(`     ╠════════════════════════════════════════╣`);
  console.log(`     ║  Total Exposure:    $${(publicMetrics.totalExposureUSD / 1_000_000_000_000).toFixed(2)}T            ║`);
  console.log(`     ║  Total Liquidity:   $${(publicMetrics.totalLiquidityUSD / 1_000_000_000_000).toFixed(2)}T            ║`);
  console.log(`     ║  Avg Leverage:      ${publicMetrics.averageLeverageRatio.toFixed(1)}x               ║`);
  console.log(`     ║  Active Risk Clusters: ${publicMetrics.activeRiskClusters}              ║`);
  console.log(`     ╚════════════════════════════════════════╝`);
  console.log();

  // ── 10. Full AGFN System Status ──────────────────────────────────────────
  console.log('Step 10: Full AGFN System Status...');

  const systemStatus = agfn.getSystemStatus();
  console.log(`\n   ┌─────────────────────────────────────────────────────────┐`);
  console.log(`   │       AUTONOMOUS GLOBAL FINANCIAL NETWORK (AGFN)       │`);
  console.log(`   │                    SYSTEM STATUS                        │`);
  console.log(`   ├─────────────────────────────────────────────────────────┤`);
  console.log(`   │  NODE ARCHITECTURE                                      │`);
  console.log(`   │    Total Nodes:        ${String(systemStatus.totalNodes).padStart(5)}                        │`);
  console.log(`   │    Active Nodes:       ${String(systemStatus.activeNodes).padStart(5)}                        │`);
  console.log(`   │    Sovereign Nodes:    ${String(systemStatus.sovereignNodes).padStart(5)}                        │`);
  console.log(`   │    Institutional:      ${String(systemStatus.institutionalNodes).padStart(5)}                        │`);
  console.log(`   ├─────────────────────────────────────────────────────────┤`);
  console.log(`   │  CAPITAL ROUTING                                        │`);
  console.log(`   │    Active Routes:      ${String(systemStatus.activeRoutes).padStart(5)}                        │`);
  console.log(`   │    Completed Routes:   ${String(systemStatus.completedRoutes).padStart(5)}                        │`);
  console.log(`   │    Active Passports:   ${String(systemStatus.activeLiquidityPassports).padStart(5)}                        │`);
  console.log(`   ├─────────────────────────────────────────────────────────┤`);
  console.log(`   │  SETTLEMENT MESH                                        │`);
  console.log(`   │    Pending:            ${String(systemStatus.pendingSettlements).padStart(5)}                        │`);
  console.log(`   │    Finalized:          ${String(systemStatus.finalizedSettlements).padStart(5)}                        │`);
  console.log(`   │    Netting Efficiency: ${(systemStatus.nettingEfficiency * 100).toFixed(1)}%                       │`);
  console.log(`   ├─────────────────────────────────────────────────────────┤`);
  console.log(`   │  AI COORDINATION                                        │`);
  console.log(`   │    Risk Clusters:      ${String(systemStatus.riskClustersDetected).padStart(5)}                        │`);
  console.log(`   │    Active Clusters:    ${String(systemStatus.activeRiskClusters).padStart(5)}                        │`);
  console.log(`   │    Reallocations:      ${String(systemStatus.capitalReallocationsExecuted).padStart(5)}                        │`);
  console.log(`   ├─────────────────────────────────────────────────────────┤`);
  console.log(`   │  TREASURY NETWORK                                       │`);
  console.log(`   │    Reserve Pools:      ${String(systemStatus.totalReservePools).padStart(5)}                        │`);
  console.log(`   │    Reserve Value:      $${(systemStatus.totalReserveValueUSD / 1_000_000_000).toFixed(0)}B                       │`);
  console.log(`   │    Treasury Vaults:    ${String(systemStatus.totalTreasuryVaults).padStart(5)}                        │`);
  console.log(`   ├─────────────────────────────────────────────────────────┤`);
  console.log(`   │  STABILITY                                              │`);
  console.log(`   │    Stability Index:    ${String(systemStatus.stabilityIndex).padStart(5)}/100                    │`);
  console.log(`   │    Indicator:          ${systemStatus.stabilityIndicator.toUpperCase().padEnd(10)}                   │`);
  console.log(`   │    Total Liquidity:    $${(systemStatus.totalLiquidityUSD / 1_000_000_000_000).toFixed(2)}T                      │`);
  console.log(`   └─────────────────────────────────────────────────────────┘`);
  console.log();

  console.log('=== AGFN Demo Complete ===');
  console.log('\nThe Autonomous Global Financial Network is now operational,');
  console.log('connecting jurisdictions, routing capital, and coordinating');
  console.log('global financial flows with AI-managed stability safeguards.\n');
}

// Run the demo
runDemo().catch(console.error);
