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
 * - Multi-agent coordination framework
 * - Modular plugin and tooling system
 * - TON-native tools (wallet, jettons, NFT)
 * - AI function calling integration
 * - Autonomous Strategy Engine for DeFi automation
 * - No-code visual strategy builder
 * - AI-assisted strategy creation
 * - Historical backtesting and simulation
 */

export * from './ai';
export * from './security';
export * from './multi-agent';

// Re-export plugins with namespace to avoid naming conflicts with AI types
export * as Plugins from './plugins';

// Re-export strategy with namespace to avoid naming conflicts with multi-agent types
// (both modules define CapitalAllocation with different structures)
export * as Strategy from './strategy';

// No-code module is available as separate import: '@tonaiagent/core/no-code'
