/**
 * TONAIAgent - Portfolio Engine
 *
 * Public exports for the Portfolio Engine module (Issue #214).
 *
 * The Portfolio Engine provides persistent portfolio tracking including:
 * - Balances
 * - Positions
 * - Trade History
 * - PnL Metrics
 *
 * Usage:
 *   import {
 *     PortfolioEngine,
 *     PortfolioApi,
 *     PortfolioStorage,
 *     createPortfolioEngine,
 *     createPortfolioApi,
 *   } from './portfolio';
 *
 * Quick Start:
 *   const engine = createPortfolioEngine();
 *
 *   // Create portfolio for an agent
 *   const portfolio = engine.getOrCreatePortfolio('agent_001');
 *
 *   // Execute a trade
 *   const result = engine.executeTrade({
 *     agentId: 'agent_001',
 *     pair: 'TON/USDT',
 *     side: 'BUY',
 *     quantity: 100,
 *     price: 5.21,
 *   });
 *
 *   // Get portfolio summary
 *   const summary = engine.getPortfolioSummary('agent_001');
 *
 * API Usage:
 *   const api = createPortfolioApi();
 *
 *   // Handle REST request
 *   const response = await api.handle({
 *     method: 'GET',
 *     path: '/api/portfolio/agent_001',
 *   });
 */

// Types
export * from './types';

// Storage
export {
  PortfolioStorage,
  createPortfolioStorage,
  createDemoPortfolioStorage,
} from './storage';

// Engine
export {
  PortfolioEngine,
  createPortfolioEngine,
  createDemoPortfolioEngine,
} from './engine';
export type { ExecuteTradeRequest, ExecuteTradeResult } from './engine';

// API
export {
  PortfolioApi,
  createPortfolioApi,
  createDemoPortfolioApi,
} from './api';
