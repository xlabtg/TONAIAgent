/**
 * TONAIAgent - Autonomous Hedge Fund Module
 *
 * First fully autonomous, AI-native hedge fund infrastructure built on
 * The Open Network (TON). Enables AI agents to operate as portfolio managers,
 * execution specialists, and risk controllers in a coordinated multi-agent system.
 *
 * Features:
 * - Multi-Agent Hedge Fund Architecture (portfolio, execution, risk, data agents)
 * - AI-Driven Investment Framework (signals, predictions, RL agents)
 * - Institutional Portfolio Engine (diversification, rebalancing, optimization)
 * - Real-Time Risk Management (VaR, stress testing, hedging)
 * - Continuous Learning System (backtesting, live adaptation)
 * - Transparency & Explainability (decision logs, audit trails)
 * - Capital Access Model (investor management, redemptions)
 * - Compliance Integration (KYC/AML, regulatory reporting)
 *
 * @example
 * ```typescript
 * import { createHedgeFundManager } from '@tonaiagent/core/hedgefund';
 *
 * // Create the hedge fund manager
 * const fund = createHedgeFundManager();
 *
 * // Initialize the fund
 * await fund.initialize({
 *   name: 'TON Alpha Fund',
 *   type: 'autonomous',
 *   initialCapital: 10000000,
 *   fees: { managementFeePercent: 0.5, performanceFeePercent: 10 },
 * });
 *
 * // Configure agents
 * await fund.configurePortfolioAgent({
 *   targetAllocation: {
 *     'delta_neutral': 0.30,
 *     'trend_following': 0.25,
 *     'arbitrage': 0.20,
 *     'yield_farming': 0.15,
 *   },
 *   rebalanceThreshold: 0.05,
 * });
 *
 * await fund.configureRiskAgent({
 *   limits: { maxDrawdown: 0.15, maxVaR: 0.10, maxLeverage: 2.0 },
 * });
 *
 * // Start autonomous operations
 * await fund.start();
 *
 * // Monitor performance
 * const performance = fund.getPerformance();
 * console.log('AUM:', performance.aum);
 * console.log('Sharpe:', performance.riskMetrics.sharpe);
 * ```
 */

// Export all types
export * from './types';

// Export Portfolio Agent
export {
  DefaultPortfolioAgent,
  createPortfolioAgent,
  type PortfolioAgent,
  type RebalanceCheck,
  type AllocationDrift,
  type RebalanceResult,
  type PortfolioMetrics,
  type OptimizationConstraints,
  type OptimalAllocation,
} from './portfolio-agent';

// Export Execution Agent
export {
  DefaultExecutionAgent,
  createExecutionAgent,
  type ExecutionAgent,
  type OrderRequest,
  type OrderFilters,
  type ExecutionResult,
  type BatchExecutionResult,
  type RouteRequest,
  type OptimalRoute,
  type RouteSegment,
  type EstimateRequest,
  type ExecutionEstimate,
} from './execution-agent';

// Export Risk Agent
export {
  DefaultRiskAgent,
  createRiskAgent,
  STRESS_SCENARIOS,
  type RiskAgent,
  type VaRResult,
  type LimitCheckResult,
  type LimitViolation,
  type LimitWarning,
  type TransactionRiskRequest,
  type TransactionImpactResult,
  type HedgingRecommendation,
  type HedgePosition,
  type AlertFilters,
} from './risk-agent';

// Export Fund Manager
export {
  DefaultHedgeFundManager,
  createHedgeFundManager,
  type HedgeFundManager,
  type FundInitConfig,
  type FundRiskConfig,
  type PartialPortfolioConfig,
  type PartialExecutionConfig,
  type PartialRiskConfig,
  type InvestmentResult,
  type RedemptionResult,
  type RebalanceOutcome,
  type RiskCheckOutcome,
  type StressTestOutcome,
  type DecisionLogFilters,
  type DecisionExplanation,
} from './fund-manager';

// Default export
export { DefaultHedgeFundManager as default } from './fund-manager';
