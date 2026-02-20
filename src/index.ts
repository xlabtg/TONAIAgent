/**
 * TONAIAgent Core
 *
 * Multi-provider AI layer with production-grade security, plugin system, strategy engine,
 * no-code strategy builder, marketplace, copy trading, institutional compliance,
 * omnichain infrastructure, agent launchpad, autonomous hedge fund infrastructure,
 * and TON Super App (wallet, AI agents, social layer, Telegram Mini App)
 * for autonomous finance on TON blockchain.
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
 * - Omnichain infrastructure (cross-chain capital movement, arbitrage, yield rotation)
 * - ChangeNOW integration (200+ chains, 1200+ assets)
 * - Cross-chain portfolio management and risk assessment
 * - Agent Launchpad for DAOs, funds, and autonomous treasuries
 * - Autonomous Hedge Fund Architecture (portfolio, execution, risk agents)
 * - AI-driven investment framework (signals, predictions, RL)
 * - Institutional portfolio engine (diversification, rebalancing)
 * - Continuous learning system (backtesting, live adaptation)
 * - AI Safety, Alignment & Governance Framework
 * - Super App: Smart Wallet with MPC recovery
 * - Super App: Agent Dashboard for monitoring and automation
 * - Super App: Social Layer with profiles, leaderboards, discussions
 * - Super App: Financial Dashboard with portfolio, risk, analytics
 * - Super App: Notifications and real-time alerts
 * - Super App: Telegram Mini App integration
 * - Super App: Gamification and growth mechanisms
 * - Super App: Embedded AI Assistant powered by Groq
 * - Super App: Premium subscriptions and monetization
 */

export * from './ai';

// Re-export ai-safety with namespace to avoid conflicts with AI types
// (both modules define types like FraudPattern, PolicyCondition, RiskContext, etc.)
export * as AISafety from './ai-safety';
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

// Re-export omnichain with namespace to avoid naming conflicts
// (omnichain defines its own ActionResult, ChainId, and other common types)
export * as Omnichain from './omnichain';

// Note: Import institutional module separately from '@tonaiagent/core/institutional'
// to avoid naming conflicts with existing exports

// Note: Import omnichain module separately from '@tonaiagent/core/omnichain'
// for full access to all omnichain types and interfaces

// Re-export launchpad with namespace to avoid naming conflicts
// (launchpad has its own GovernanceConfig, CapitalPool, and similar types)
export * as Launchpad from './launchpad';

// Re-export hedgefund with namespace to avoid naming conflicts
// (hedgefund module defines StrategyAllocation, PortfolioPerformance, etc.)
export * as HedgeFund from './hedgefund';

// Note: Import hedgefund module separately from '@tonaiagent/core/hedgefund'
// for direct access to hedge fund types and managers

// Note: Import superapp module separately from '@tonaiagent/core/superapp'
// to access the full Super App functionality (wallet, agents, social, financial, etc.)
