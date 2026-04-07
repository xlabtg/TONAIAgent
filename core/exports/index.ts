/**
 * Domain-Specific Barrel Exports Index
 *
 * This module re-exports all domain barrel files, allowing the root core/index.ts
 * to delegate to focused, tree-shakeable domain modules instead of directly
 * importing from every module in the codebase.
 *
 * For optimal tree-shaking, consumers should import from the specific subpath:
 *   import { ... } from '@tonaiagent/core/ai'          // AI providers, safety, plugins
 *   import { ... } from '@tonaiagent/core/security'    // Security & key management
 *   import { ... } from '@tonaiagent/core/multi-agent' // Multi-agent coordination
 *   import { ... } from '@tonaiagent/core/strategy'    // Strategy engine
 *   import { ... } from '@tonaiagent/core/protocol'    // Open Agent Protocol
 *   import { ... } from '@tonaiagent/core/omnichain'   // Omnichain infrastructure
 *   import { ... } from '@tonaiagent/core/investment'  // Investment layer
 *   import { ... } from '@tonaiagent/core/monitoring'  // Agent monitoring
 *   import { ... } from '@tonaiagent/core/reputation'  // Strategy reputation
 *   import { ... } from '@tonaiagent/core/revenue'     // Revenue sharing
 *   import { ... } from '@tonaiagent/core/acms'        // Autonomous capital markets
 *   import { ... } from '@tonaiagent/core/agfi'        // Global financial infrastructure
 *   import { ... } from '@tonaiagent/core/aifos'       // AI financial OS
 *   import { ... } from '@tonaiagent/core/grif'        // Regulatory integration
 *   // (and many more — see package.json exports field)
 */

export * from './ai';
export * from './security';
export * from './agents';
export * from './trading';
export * from './protocol';
export * from './finance';
export * from './services';
export * from './research';
export * from './demos';
