/**
 * TONAIAgent Core
 *
 * AI-native Global Financial Infrastructure (AGFI) — global capital coordination at
 * institutional scale, comparable to SWIFT, IMF, and BIS but with AI-coordination,
 * on-chain transparency, programmability, and borderless design. Includes multi-provider
 * AI layer with production-grade security, plugin system, strategy engine, no-code strategy
 * builder, marketplace, copy trading, institutional compliance, omnichain infrastructure,
 * agent launchpad, autonomous hedge fund infrastructure, viral consumer growth engine,
 * AI safety/alignment framework, ecosystem fund, TON Super App (wallet, AI agents, social
 * layer, Telegram Mini App), Telegram-native mobile-first UX, AI-native personal finance,
 * Open Agent Protocol, Enterprise SDK & Developer Platform, token strategy (launch, liquidity
 * flywheel, valuation, simulation), AI-native payments and commerce layer, global regulatory
 * strategy framework, and global institutional network for autonomous finance on TON blockchain.
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
 * - Global data and signal platform for AI agents
 * - Viral consumer growth engine (referrals, social trading, gamification)
 * - Growth analytics and A/B testing
 * - Anti-abuse and sybil detection
 * - AI Safety, Alignment & Governance Framework
 * - Ecosystem fund (treasury, grants, investments, incubation, incentives)
 * - Super App: Smart Wallet with MPC recovery
 * - Super App: Agent Dashboard for monitoring and automation
 * - Super App: Social Layer with profiles, leaderboards, discussions
 * - Super App: Financial Dashboard with portfolio, risk, analytics
 * - Super App: Notifications and real-time alerts
 * - Super App: Telegram Mini App integration
 * - Super App: Gamification and growth mechanisms
 * - Super App: Embedded AI Assistant powered by Groq
 * - Super App: Premium subscriptions and monetization
 * - Telegram-native mobile-first UX with conversational AI
 * - AI-native personal finance (savings automation, wealth management)
 * - Life-stage personalization and behavioral finance
 * - Financial education with gamification
 * - Open Agent Protocol (OAP) for autonomous agent interoperability
 * - Enterprise SDK & Developer Platform
 * - Token strategy (launch, liquidity flywheel, valuation, simulation)
 * - AI-native payments and commerce layer (autonomous payments, subscriptions)
 * - Smart spending with AI optimization
 * - Merchant infrastructure (SDK, checkout, webhooks)
 * - Agent-driven commerce (negotiations, procurement, B2B)
 * - Cross-border payments with route optimization
 * - Payment analytics and fraud detection
 * - Global regulatory strategy and jurisdictional framework
 * - Tiered KYC/AML compliance for retail, professional, and institutional clients
 * - EU AI Act alignment with AI governance and system classification
 * - Cross-border compliance architecture
 * - Regulatory risk monitoring and SAR detection
 * - Global institutional network (partner registry, custody, liquidity, treasury)
 * - Institutional onboarding framework with due diligence
 * - DAO Governance & Treasury Layer (proposals, voting, delegation, AI treasury, multi-sig)
 * - Global expansion strategy and roadmap
 * - AI-powered institutional advantage (risk modeling, anomaly detection)
 * - Institutional governance (advisory boards, committees, policies)
 * - Cross-Chain Liquidity Integration Layer (multi-chain connector framework, liquidity
 *   aggregation, cross-chain trade execution, multi-chain portfolio tracking, risk controls,
 *   agent plugin system integration for arbitrage, analytics, and liquidity scanning)
 *
 * @remarks
 * This file is a backward-compatible aggregator. All exports are delegated to
 * focused domain barrel files under `./exports/`. For optimal tree-shaking,
 * consumers should import from specific subpaths instead of the main entry point:
 *
 * @example
 * // Instead of (pulls entire module graph):
 * import { SecurityManager } from '@tonaiagent/core'
 *
 * // Prefer (tree-shakeable):
 * import { SecurityManager } from '@tonaiagent/core/security'
 *
 * Available subpaths (see package.json exports for the full list):
 *   @tonaiagent/core/ai               — AI providers, safety, plugins
 *   @tonaiagent/core/security         — Security & key management
 *   @tonaiagent/core/multi-agent      — Multi-agent coordination
 *   @tonaiagent/core/strategy         — Strategy engine
 *   @tonaiagent/core/live-trading     — Live trading infrastructure
 *   @tonaiagent/core/agent-runtime    — Production agent runtime
 *   @tonaiagent/core/protocol         — Open Agent Protocol
 *   @tonaiagent/core/omnichain        — Omnichain infrastructure
 *   @tonaiagent/core/investment       — Investment layer
 *   @tonaiagent/core/monitoring       — Agent monitoring dashboard
 *   @tonaiagent/core/reputation       — Strategy reputation & ranking
 *   @tonaiagent/core/revenue          — Revenue sharing system
 *   @tonaiagent/core/regulatory       — Global regulatory framework
 *   @tonaiagent/core/acms             — Autonomous capital markets stack
 *   @tonaiagent/core/agfi             — Global financial infrastructure
 *   @tonaiagent/core/aifos            — AI financial operating system
 *   @tonaiagent/core/grif             — Regulatory integration framework
 *   @tonaiagent/core/sdacl            — Sovereign digital asset coordination
 *
 * @mvp-boundary: extended/ modules are NOT exported from core/index.ts.
 * Import them directly via their dedicated paths, e.g.:
 *   import { ... } from '@tonaiagent/core/tokenomics'
 *   import { ... } from '@tonaiagent/core/marketplace'
 *   import { ... } from '@tonaiagent/core/dao-governance'
 *   import { ... } from '@tonaiagent/core/hedgefund'
 *   import { ... } from '@tonaiagent/core/launchpad'
 *   import { ... } from '@tonaiagent/core/growth'
 *   import { ... } from '@tonaiagent/core/fund-manager'
 */

// Re-export all domains from focused barrel files.
// Each file in ./exports/ covers one logical domain and can be independently
// imported or lazy-loaded by bundlers that support tree-shaking.
export * from './exports/ai';
export * from './exports/security';
export * from './exports/agents';
export * from './exports/trading';
export * from './exports/protocol';
export * from './exports/finance';
export * from './exports/services';
export * from './exports/research';
export * from './exports/demos';
