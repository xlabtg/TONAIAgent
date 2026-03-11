/**
 * TONAIAgent - Investor Demo Flow Example (Issue #153)
 *
 * Demonstrates the full 6-stage Investor Demo Flow showcasing
 * the end-to-end lifecycle of the AI Fund Management platform:
 *
 *   Stage 1 — Strategy Discovery
 *   Stage 2 — AI Fund Creation
 *   Stage 3 — Agent Deployment
 *   Stage 4 — Live Execution Simulation
 *   Stage 5 — Performance Monitoring
 *   Stage 6 — Rebalancing Demonstration
 *
 * Run with:
 *   npx tsx examples/fund-investor-demo.ts
 */

import { createFundInvestorDemoManager } from '../src/investor-demo';
import type {
  StrategyDiscoveryResult,
  FundCreationResult,
  AgentDeploymentResult,
  LiveExecutionResult,
  PerformanceMonitoringResult,
  RebalancingResult,
} from '../src/investor-demo';

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function printDivider(): void {
  console.log('─'.repeat(60));
}

async function main(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        TON AI Agent — Investor Demo Flow                     ║');
  console.log('║  "From strategy discovery to live AI-managed fund in         ║');
  console.log('║   minutes — autonomous, transparent, institutional-grade."   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const demo = createFundInvestorDemoManager();

  demo.onEvent((event) => {
    if (event.type === 'stage_started') {
      const data = event.data as { stageNumber: number; title: string };
      console.log(`\n[Stage ${data.stageNumber}/6] ${data.title}`);
      printDivider();
    }
    if (event.type === 'stage_completed') {
      const data = event.data as { durationMs: number };
      console.log(`  ✓ Completed in ${formatMs(data.durationMs)}`);
    }
    if (event.type === 'session_completed') {
      console.log('\n✓ Demo completed.');
    }
  });

  const session = await demo.runFullDemo({
    fundName: 'TON AI Diversified Fund',
    fundCapitalUsd: 100_000,
    includeRebalancing: true,
  });

  // Print stage results
  for (const stage of session.stages) {
    if (stage.status !== 'completed' || !stage.result) continue;

    switch (stage.id) {
      case 'strategy_discovery': {
        const r = stage.result as StrategyDiscoveryResult;
        console.log(`\n  Marketplace: ${r.totalStrategiesAvailable} strategies available`);
        console.log(`  Selected ${r.strategiesSelected.length} strategies:`);
        for (const s of r.strategiesSelected) {
          console.log(`    • ${s.name} (${s.creator}) — ${formatPercent(s.annualReturn)} annual return, ${s.riskLevel} risk → ${s.allocationPercent}% allocation`);
        }
        console.log(`  Top performer: ${r.topPerformer.name} (${formatPercent(r.topPerformer.annualReturn)} annual)`);
        break;
      }

      case 'fund_creation': {
        const r = stage.result as FundCreationResult;
        console.log(`\n  Fund ID:        ${r.fundId}`);
        console.log(`  Fund Name:      ${r.fundName}`);
        console.log(`  Capital:        ${formatUsd(r.capitalUsd)}`);
        console.log(`  Contract:       ${r.contractAddress.slice(0, 20)}...`);
        console.log(`  Allocations:`);
        for (const a of r.allocationBreakdown) {
          console.log(`    • ${a.strategyName}: ${a.percent}% (${formatUsd(a.amountUsd)})`);
        }
        break;
      }

      case 'agent_deployment': {
        const r = stage.result as AgentDeploymentResult;
        console.log(`\n  ${r.agentCount} strategy agents deployed:`);
        for (const agent of r.deployedAgents) {
          console.log(`    • ${agent.strategyName} — Agent: ${agent.agentId.slice(0, 20)}... [${agent.status.toUpperCase()}]`);
          console.log(`      Capital: ${formatUsd(agent.capitalUsd)} (${agent.allocationPercent}%)`);
        }
        console.log(`\n  Flow: Investor → AI Fund Manager → Agent Runtime → Strategy Agents`);
        break;
      }

      case 'live_execution': {
        const r = stage.result as LiveExecutionResult;
        console.log(`\n  Market events:`);
        for (const event of r.marketEvents) {
          const icon = event.impact === 'positive' ? '📈' : event.impact === 'negative' ? '📉' : '➡️';
          console.log(`    ${icon} ${event.description}`);
        }
        console.log(`\n  Trades executed: ${r.tradesExecuted.length}`);
        for (const trade of r.tradesExecuted.slice(0, 3)) {
          const pnl = trade.pnlUsd !== undefined ? ` | PnL: ${formatUsd(trade.pnlUsd)}` : '';
          console.log(`    • [${trade.type.toUpperCase()}] ${trade.symbol} — ${formatUsd(trade.amountUsd)} (${trade.strategyName})${pnl}`);
        }
        console.log(`\n  Portfolio value: ${formatUsd(r.currentValueUsd)}`);
        console.log(`  Unrealized P&L:  ${formatUsd(r.unrealizedPnlUsd)}`);
        break;
      }

      case 'performance_monitoring': {
        const r = stage.result as PerformanceMonitoringResult;
        console.log('');
        console.log('  ┌─────────────────────────────────────────┐');
        console.log('  │         PORTFOLIO DASHBOARD              │');
        console.log('  ├─────────────────────────────────────────┤');
        console.log(`  │  Total Capital:  ${formatUsd(r.totalCapitalUsd).padStart(15)}         │`);
        console.log(`  │  Current Value:  ${formatUsd(r.currentValueUsd).padStart(15)}         │`);
        console.log(`  │  Total P&L:      ${formatUsd(r.totalPnlUsd).padStart(15)}         │`);
        console.log(`  │  Return:         ${formatPercent(r.totalReturnPercent).padStart(15)}         │`);
        console.log('  └─────────────────────────────────────────┘');
        console.log(`\n  Per-strategy performance:`);
        for (const sp of r.strategyPerformance) {
          console.log(`    • ${sp.strategyName}: ${formatPercent(sp.returnPercent)} | P&L: ${formatUsd(sp.pnlUsd)} | Trades: ${sp.tradesCount}`);
        }
        console.log(`\n  Best performing: ${r.bestPerformingStrategy}`);
        console.log(`  Dashboard URL:   ${r.dashboardUrl}`);
        break;
      }

      case 'rebalancing': {
        const r = stage.result as RebalancingResult;
        console.log(`\n  Rebalance trigger: ${r.rebalanceReason.replace(/_/g, ' ')}`);
        console.log(`  Risk: ${r.riskExposureBefore} → ${r.riskExposureAfter}`);
        console.log(`\n  Allocation changes:`);
        for (const action of r.rebalancingActions) {
          if (action.direction === 'unchanged') {
            console.log(`    • ${action.strategyName}: ${action.previousPercent.toFixed(1)}% (unchanged)`);
          } else {
            const arrow = action.direction === 'increase' ? '↑' : '↓';
            console.log(`    • ${action.strategyName}: ${action.previousPercent.toFixed(1)}% ${arrow} ${action.newPercent}% (moved ${formatUsd(action.capitalMovedUsd)})`);
          }
        }
        break;
      }
    }
  }

  // Final summary
  if (session.summary) {
    const s = session.summary;
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    DEMO SUMMARY                              ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Fund:             ${s.fundName.padEnd(40)}║`);
    console.log(`║  Initial Capital:  ${formatUsd(s.initialCapitalUsd).padEnd(40)}║`);
    console.log(`║  Final Value:      ${formatUsd(s.finalValueUsd).padEnd(40)}║`);
    console.log(`║  Total Return:     ${formatPercent(s.totalReturnPercent).padEnd(40)}║`);
    console.log(`║  Total P&L:        ${formatUsd(s.totalPnlUsd).padEnd(40)}║`);
    console.log(`║  Strategy Agents:  ${String(s.agentCount).padEnd(40)}║`);
    console.log(`║  Simulated Trades: ${String(s.totalTrades).padEnd(40)}║`);
    console.log(`║  Rebalancing:      ${(s.rebalancingDemonstrated ? 'Demonstrated' : 'Skipped').padEnd(40)}║`);
    console.log(`║  Demo Duration:    ${formatMs(s.demoDurationMs).padEnd(40)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  "${s.valueProposition.slice(0, 56)}"  ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
  }
}

main().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
