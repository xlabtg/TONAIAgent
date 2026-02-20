/**
 * TONAIAgent Core
 *
 * Multi-provider AI layer with production-grade security and institutional compliance
 * for autonomous agents on TON blockchain.
 *
 * Features:
 * - Multi-provider AI support (Groq, Anthropic, OpenAI, Google, xAI, OpenRouter)
 * - Production-grade security and key management
 * - Multiple custody models (Non-Custodial, Smart Contract Wallet, MPC)
 * - Multi-layer transaction authorization
 * - Risk and fraud detection
 * - Emergency controls and recovery mechanisms
 * - Comprehensive audit logging
 * - Institutional compliance (KYC/AML, regulatory reporting)
 * - Portfolio risk management (VaR, stress testing)
 * - AI governance and explainability
 */

export * from './ai';
export * from './security';
// Note: Import institutional module separately from '@tonaiagent/core/institutional'
// to avoid naming conflicts with existing exports
