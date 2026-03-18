/** @mvp Core trading module — required for MVP (trading base, engine, live trading) */
// Core Trading — consolidated from:
//   src/trading → core/trading/base
//   src/trading-engine → core/trading/engine
//   src/live-trading → core/trading/live
//
// NOTE: Wildcard re-exports removed to avoid TS2308 duplicate export errors
// (PortfolioBalance is defined in both ./engine/types and ./live/types).
// Import directly from the specific submodule paths:
//   core/trading/base/...
//   core/trading/engine/...
//   core/trading/live/...
