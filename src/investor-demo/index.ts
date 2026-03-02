/**
 * TONAIAgent - Investor-Ready End-to-End Demo Flow
 *
 * Issue #90: Investor-Ready End-to-End Demo Flow
 *
 * Implements a fully working, repeatable investor demo covering:
 *   1. Landing / Entry Point
 *   2. Agent Creation Wizard (strategy + AI provider selection)
 *   3. Telegram Bot Integration (auto-create, assign, configure)
 *   4. TON Wallet Creation (MPC key security + smart contract)
 *   5. Strategy Activation (first real simulated trade)
 *   6. Live Dashboard (status, metrics, logs, balance)
 *   7. Social & Viral Element (leaderboard, sharing, reputation)
 *
 * @example
 * ```typescript
 * import { createInvestorDemoManager } from '@tonaiagent/core/investor-demo';
 *
 * const demo = createInvestorDemoManager();
 *
 * // Run the full demo flow (investor presentation mode)
 * const session = await demo.runFullDemo({
 *   persona: 'institutional',
 *   strategy: 'yield',
 *   aiProvider: 'groq',
 * });
 *
 * console.log('Demo completed in', session.totalDurationMs, 'ms');
 * console.log('Agent ID:', session.summary?.agentId);
 * console.log('ROI:', session.summary?.roi + '%');
 * ```
 */

export { InvestorDemoManager, createInvestorDemoManager } from './demo';
export {
  executeLandingStep,
  executeAgentCreationStep,
  executeTelegramIntegrationStep,
  executeWalletCreationStep,
  executeStrategyActivationStep,
  executeLiveDashboardStep,
  executeSocialViralStep,
} from './steps';
export type {
  // Configuration
  InvestorDemoConfig,
  DemoAIProvider,
  DemoStrategy,
  DemoMode,
  DemoPersona,
  // Steps
  DemoStepId,
  DemoStepStatus,
  DemoStep,
  DemoStepResult,
  // Step results
  LandingStepResult,
  AgentCreationResult,
  TelegramIntegrationResult,
  WalletCreationResult,
  StrategyActivationResult,
  LiveDashboardResult,
  SocialViralResult,
  // Supporting types
  DemoTrade,
  DemoExecutionLogEntry,
  // Session
  DemoSessionStatus,
  DemoSession,
  DemoSummary,
  // Events
  InvestorDemoEventType,
  InvestorDemoEvent,
  InvestorDemoEventCallback,
  // Service
  InvestorDemoService,
} from './types';
export { defaultInvestorDemoConfig } from './types';
