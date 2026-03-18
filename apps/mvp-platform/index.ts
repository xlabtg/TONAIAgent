/**
 * TONAIAgent — MVP Platform Integration Layer
 *
 * Unified entry point that wires together all MVP core components:
 *
 * ```
 * Telegram Bot / Mini App
 *         │
 *         ▼
 * Agent Control API         ← start/stop/status agents
 *         │
 *         ▼
 * Agent Runtime             ← 9-step execution pipeline
 *         │
 *         ▼
 * Strategy Engine           ← Trend / Arbitrage / AI Signal
 *         │
 *         ▼
 * Market Data Layer         ← CoinGecko / Binance price feeds
 *         │
 *         ▼
 * Trading Engine (Simulation) ← simulate buy/sell, track PnL
 *         │
 *         ▼
 * Portfolio Analytics       ← metrics, charts, reports
 * ```
 *
 * @example
 * ```typescript
 * import { createMVPPlatform } from '@tonaiagent/core/mvp-platform';
 *
 * const platform = createMVPPlatform();
 * platform.start();
 *
 * // Create an agent
 * const agent = await platform.createAgent({
 *   userId: 'telegram_user_123',
 *   name: 'My Momentum Agent',
 *   strategy: 'trend',
 *   budgetTon: 1000,
 *   riskLevel: 'medium',
 * });
 *
 * // Start the agent
 * await platform.startAgent(agent.agentId);
 *
 * // Check portfolio
 * const status = platform.getAgentStatus(agent.agentId);
 * console.log('PnL:', status.pnlTon);
 *
 * // Run a full demo flow (for investor demos)
 * const demo = await platform.runDemoFlow();
 * console.log('Demo completed:', demo.success);
 * ```
 */

export * from './types';
export { MVPPlatform, createMVPPlatform } from './platform';
