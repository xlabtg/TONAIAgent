/** @mvp MVP service — trade execution engine (DEX, simulated buy/sell) */
// Execution Engine Service — trade execution and management
// Trade execution implementations are in core/trading/engine/ and core/trading/live/
//
// NOTE: Wildcard re-exports removed to avoid TS2308 duplicate export errors
// (PortfolioBalance is defined in both core/trading/engine/types and core/trading/live/types).
// Import directly from the specific submodule paths:
//   core/trading/engine/...
//   core/trading/live/...

// Smart Execution Engine (Issue #253 — Smart Order Execution & Slippage Control)
export {
  // Core engine
  DefaultSmartExecutionEngine,
  createSmartExecutionEngine,
  // Slippage utilities
  bpsToPercent,
  percentToBps,
  estimatePriceImpact,
  estimateQuoteSlippage,
  // Configuration
  DEFAULT_SLIPPAGE_CONFIG,
  DEFAULT_SMART_EXECUTION_CONFIG,
} from './smart-execution';

export type {
  SlippageConfig,
  SmartExecutionMode,
  SmartExecutionRequest,
  SmartExecutionResult,
  SmartExecutionPreview,
  SmartExecutionEngine,
  SmartExecutionEngineConfig,
  SimulationConfig,
  SimulationDetails,
  DexComparisonRow,
  ExecutionWarning,
  ExecutionFailureReason,
  TwapParams,
} from './smart-execution';
