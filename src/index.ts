/**
 * TONAIAgent Core
 *
 * Multi-provider AI layer with production-grade security, plugin system, strategy engine,
 * no-code strategy builder, marketplace, copy trading, institutional compliance, and
 * viral consumer growth engine for autonomous agents on TON blockchain.
 *
 * Features:
 * - Multi-provider AI support (Groq, Anthropic, OpenAI, Google, xAI, OpenRouter)
 * - Production-grade security and key management
 * - Multiple custody models (Non-Custodial, Smart Contract Wallet, MPC)
 * - Multi-layer transaction authorization
 * - Risk and fraud detection
 * - Emergency controls and recovery mechanisms
 * - Comprehensive audit logging
 * - Multi-agent coordination framework
 * - Modular plugin and tooling system
 * - TON-native tools (wallet, jettons, NFT)
 * - AI function calling integration
 * - Autonomous Strategy Engine for DeFi automation
 * - No-code visual strategy builder
 * - AI-assisted strategy creation
 * - Historical backtesting and simulation
 * - Strategy marketplace and copy trading
 * - Reputation and scoring system
 * - Performance analytics and monetization
 * - Tokenomics and agent economy (staking, governance, rewards, reputation)
 * - Institutional compliance (KYC/AML, regulatory reporting)
 * - Portfolio risk management (VaR, stress testing)
 * - AI governance and explainability
 * - Viral consumer growth engine (referrals, social trading, gamification)
 * - Growth analytics and A/B testing
 * - Anti-abuse and sybil detection
 */

export * from './ai';
export * from './security';
export * from './tokenomics';

// Re-export plugins with namespace to avoid naming conflicts with AI types
export * as Plugins from './plugins';

// Re-export strategy with namespace to avoid naming conflicts with multi-agent and tokenomics types
// (multiple modules define types like CapitalAllocation, ActionResult, and StrategyPerformance)
export * as Strategy from './strategy';

// Re-export multi-agent with namespace to avoid naming conflicts with tokenomics types
// (both modules define GovernanceConfig, DelegationRequest, CapitalPool, GovernanceStats)
export * as MultiAgent from './multi-agent';

// No-code module is available as separate import: '@tonaiagent/core/no-code'

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

// Note: Import institutional module separately from '@tonaiagent/core/institutional'
// to avoid naming conflicts with existing exports

// Growth Engine exports (referral, social trading, gamification, viral loops, analytics, anti-abuse)
export {
  // Main engine
  createGrowthEngine,
  DefaultGrowthEngine,
  // Referral system
  createReferralSystem,
  DefaultReferralSystem,
  // Social trading
  createSocialTradingEngine,
  DefaultSocialTradingEngine,
  // Gamification
  createGamificationEngine,
  DefaultGamificationEngine,
  // Viral loops
  createViralLoopsEngine,
  DefaultViralLoopsEngine,
  // Growth analytics
  createGrowthAnalyticsEngine,
  DefaultGrowthAnalyticsEngine,
  // Anti-abuse
  createAntiAbuseSystem,
  DefaultAntiAbuseSystem,
} from './growth';

// Re-export growth types with namespace to avoid conflicts
export type * as GrowthTypes from './growth/types';
