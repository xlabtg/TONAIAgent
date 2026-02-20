/**
 * TONAIAgent Core
 *
 * Multi-provider AI layer with production-grade security for autonomous agents on TON blockchain.
 *
 * Features:
 * - Multi-provider AI support (Groq, Anthropic, OpenAI, Google, xAI, OpenRouter)
 * - Production-grade security and key management
 * - Multiple custody models (Non-Custodial, Smart Contract Wallet, MPC)
 * - Multi-layer transaction authorization
 * - Risk and fraud detection
 * - Emergency controls and recovery mechanisms
 * - Comprehensive audit logging
 * - Strategy marketplace and copy trading
 * - Reputation and scoring system
 * - Performance analytics and monetization
 */

export * from './ai';
export * from './security';

// Marketplace exports (with explicit exports to avoid conflicts)
export {
  // Marketplace service
  createMarketplaceService,
  DefaultMarketplaceService,
  // Strategy
  createStrategyManager,
  DefaultStrategyManager,
  // Copy trading
  createCopyTradingEngine,
  DefaultCopyTradingEngine,
  // Reputation
  createReputationManager,
  DefaultReputationManager,
  // Analytics
  createAnalyticsEngine,
  DefaultAnalyticsEngine,
  // Monetization
  createMonetizationManager,
  DefaultMonetizationManager,
  // Risk transparency
  createRiskTransparencyManager,
  DefaultRiskTransparencyManager,
} from './marketplace';

// Re-export marketplace types with namespace to avoid conflicts
export type * as MarketplaceTypes from './marketplace/types';
