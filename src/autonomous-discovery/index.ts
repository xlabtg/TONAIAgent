/**
 * TONAIAgent - Autonomous Strategy Discovery Engine
 *
 * AI-driven engine that continuously searches for profitable investment strategies
 * by generating, testing, and evaluating candidates autonomously.
 *
 * Architecture:
 *   AI Strategy Generator → Backtesting Framework → Risk Engine → Strategy Ranking → Marketplace
 *
 * Core Components:
 *   1. Strategy Generation Engine — generates candidate strategies via multiple AI approaches
 *   2. Discovery Pipeline        — backtesting + risk filtering + performance evaluation
 *   3. Continuous Learning System — learns from successes and failures to improve over time
 *   4. Strategy Publisher        — publishes top-performing strategies to the marketplace
 *   5. Discovery Engine          — orchestrates the full autonomous discovery loop
 *
 * @example
 * ```typescript
 * import { createAutonomousDiscoveryEngine } from '@tonaiagent/core/autonomous-discovery';
 *
 * const engine = createAutonomousDiscoveryEngine({
 *   maxCandidatesPerCycle: 10,
 *   cycleIntervalMs: 3600000, // 1 hour
 *   autoPublish: true,
 *   publishThreshold: 70,
 *   evaluationThresholds: {
 *     minROI: 5,
 *     minSharpe: 0.5,
 *     maxDrawdown: 30,
 *     minWinRate: 0.4,
 *     minTrades: 5,
 *   },
 * });
 *
 * // Subscribe to events
 * engine.onEvent((event) => {
 *   console.log(`[${event.type}]`, event.data);
 * });
 *
 * // Run a single discovery cycle manually
 * const cycle = await engine.runCycle();
 * console.log(`Generated: ${cycle.candidatesGenerated}, Passed: ${cycle.evaluationsPassed}, Published: ${cycle.published}`);
 *
 * // Start automatic cycling
 * engine.start();
 *
 * // Get learning insights
 * const insights = engine.getLearningInsights();
 * console.log('Top approaches:', insights.topApproaches);
 *
 * // Get elite pool of best strategies
 * const elite = engine.getElitePool();
 * console.log(`Elite pool size: ${elite.length}`);
 *
 * // Stop when done
 * engine.stop();
 * ```
 */

// Export all types
export * from './types';

// Export Strategy Generation Engine
export {
  StrategyGenerationEngine,
  createStrategyGenerationEngine,
} from './generator';

// Export Discovery Pipeline
export {
  DiscoveryPipeline,
  createDiscoveryPipeline,
} from './pipeline';

// Export Continuous Learning System
export {
  ContinuousLearningSystem,
  createContinuousLearningSystem,
} from './learning';

// Export Strategy Publisher
export {
  StrategyPublisher,
  createStrategyPublisher,
  type MarketplacePublisher,
  type PublishStrategySpec,
} from './publisher';

// Export main engine
export {
  DefaultAutonomousDiscoveryEngine,
  createAutonomousDiscoveryEngine,
  type AutonomousDiscoveryEngine,
  type EvaluationThresholds,
  type RiskFilterConfig,
  type GenerationApproach,
} from './engine';
