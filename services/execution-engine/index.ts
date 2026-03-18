/** @mvp MVP service — trade execution engine (DEX, simulated buy/sell) */
// Execution Engine Service — trade execution and management
// Trade execution implementations are in core/trading/engine/ and core/trading/live/
//
// NOTE: Wildcard re-exports removed to avoid TS2308 duplicate export errors
// (PortfolioBalance is defined in both core/trading/engine/types and core/trading/live/types).
// Import directly from the specific submodule paths:
//   core/trading/engine/...
//   core/trading/live/...
