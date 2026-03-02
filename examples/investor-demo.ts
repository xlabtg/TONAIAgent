/**
 * TONAIAgent - Investor Demo Example
 *
 * Demonstrates the full 7-step investor-ready end-to-end demo flow.
 * Issue #90: Investor-Ready End-to-End Demo Flow
 *
 * Run with:
 *   npx tsx examples/investor-demo.ts
 *
 * Or after build:
 *   node -e "require('./examples/investor-demo.js')"
 */

import { createInvestorDemoManager } from '../src/investor-demo';

// ============================================================================
// Helper: format duration
// ============================================================================

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

// ============================================================================
// Main Demo
// ============================================================================

async function main(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       TON AI Agent — Investor-Ready End-to-End Demo          ║');
  console.log('║  "Anyone can create a fully autonomous AI agent in minutes"  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const demo = createInvestorDemoManager();

  // Log each event as it happens
  demo.onEvent((event) => {
    if (event.type === 'step_started') {
      const step = event.data as { stepNumber: number; title: string };
      console.log(`\n[Step ${step.stepNumber}/7] ${step.title}`);
      console.log('─'.repeat(50));
    }
    if (event.type === 'step_completed') {
      const d = event.data as { durationMs: number };
      console.log(`  ✓ Completed in ${formatMs(d.durationMs)}`);
    }
    if (event.type === 'session_completed') {
      console.log('\n══════════════════════════════════════════════════');
      console.log('  DEMO COMPLETE');
      console.log('══════════════════════════════════════════════════');
    }
  });

  // Run the full demo
  const session = await demo.runFullDemo({
    mode: 'guided',
    persona: 'retail',
    strategy: 'dca',
    aiProvider: 'groq',
    budgetTon: 100,
    telegramEnabled: true,
    socialEnabled: true,
  });

  // Print step details
  console.log('\n=== Step Results ===\n');
  for (const step of session.steps) {
    const status = step.status === 'completed' ? '✓' : step.status === 'skipped' ? '⟳' : '✗';
    const duration = step.durationMs !== undefined ? ` (${formatMs(step.durationMs)})` : '';
    console.log(`  ${status} Step ${step.number}: ${step.title}${duration}`);
  }

  // Print summary
  const s = session.summary;
  if (s) {
    console.log('\n=== Summary for Investors ===\n');
    console.log(`  Agent:          ${s.agentName} (${s.agentId})`);
    console.log(`  Strategy:       ${s.strategyName}`);
    console.log(`  AI Provider:    ${s.aiProvider}`);
    console.log(`  Wallet:         ${s.walletAddress}`);
    if (s.botUsername) {
      console.log(`  Telegram Bot:   @${s.botUsername}`);
    }
    console.log(`  Trades:         ${s.totalTrades}`);
    console.log(`  ROI:            ${s.roi.toFixed(2)}%`);
    console.log(`  Time to Live:   ${formatMs(s.timeToLiveMs)}`);
    console.log(`\n  "${s.valueProposition}"\n`);
  }

  // Demonstrate step-by-step mode for presentations
  console.log('=== Step-by-Step Mode (for live presentations) ===\n');
  const demo2 = createInvestorDemoManager();
  const session2 = await demo2.startSession({
    strategy: 'yield',
    aiProvider: 'anthropic',
    persona: 'institutional',
    budgetTon: 500,
  });

  console.log(`  Session ID: ${session2.sessionId}`);
  console.log('  Advancing one step at a time...\n');

  const step1 = await demo2.nextStep(session2.sessionId);
  console.log(`  → ${step1.id}: ${step1.status}`);

  const step2 = await demo2.nextStep(session2.sessionId);
  console.log(`  → ${step2.id}: ${step2.status}`);

  // Reset and replay
  const reset = await demo2.resetSession(session2.sessionId);
  console.log(`\n  Session reset → new ID: ${reset.sessionId}`);
  console.log('  All steps back to pending:', reset.steps.every((s) => s.status === 'pending'));

  console.log('\n✓ Demo examples complete.\n');
}

main().catch(console.error);
