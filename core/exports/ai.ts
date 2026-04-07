/**
 * AI Domain Exports
 *
 * AI providers, safety framework, and plugin system.
 * Import directly via subpath for tree-shaking:
 *   import { ... } from '@tonaiagent/core/ai'
 *   import { ... } from '@tonaiagent/core/ai-safety'
 *   import { ... } from '@tonaiagent/core/plugins'
 */

export * from '../ai';

// Re-export ai-safety with namespace to avoid conflicts with AI types
// (both modules define types like FraudPattern, PolicyCondition, RiskContext, etc.)
export * as AISafety from '../ai-safety';

// Re-export plugins with namespace to avoid naming conflicts with AI types
export * as Plugins from '../plugins';
