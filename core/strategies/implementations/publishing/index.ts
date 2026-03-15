/**
 * TONAIAgent - Strategy Publishing System
 *
 * Unified integration layer that enables developers to:
 * - Publish strategies to the marketplace
 * - Update strategy versions
 * - Provide metadata and performance statistics
 * - Manage strategy lifecycle (draft → published → deprecated)
 *
 * This module provides:
 * - Strategy validation before publishing
 * - Strategy registry for storage
 * - Publishing API endpoints
 * - Marketplace integration (#216)
 *
 * @example
 * ```typescript
 * import {
 *   createPublishingApi,
 *   createStrategyValidator,
 * } from '@tonaiagent/core/strategies/publishing';
 *
 * const api = createPublishingApi();
 *
 * // Publish a new strategy
 * const response = await api.handle({
 *   method: 'POST',
 *   path: '/api/strategies/publish',
 *   body: {
 *     package: {
 *       name: 'Momentum Trader',
 *       description: 'A momentum-based trading strategy',
 *       version: '1.0',
 *       author: 'dev123',
 *       supported_pairs: ['TON/USDT'],
 *       risk_level: 'medium',
 *       category: 'momentum',
 *     },
 *   },
 *   developerId: 'dev123',
 * });
 *
 * // Update the strategy
 * const updateResponse = await api.handle({
 *   method: 'POST',
 *   path: '/api/strategies/momentum-trader-abc123/update',
 *   body: {
 *     version: '1.1',
 *     description: 'Improved entry signals',
 *   },
 *   developerId: 'dev123',
 * });
 *
 * // List developer's strategies
 * const listResponse = await api.handle({
 *   method: 'GET',
 *   path: '/api/developers/dev123/strategies',
 * });
 * ```
 *
 * Implements Issue #217: Strategy Publishing System
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Core types
  StrategyVisibilityState,
  StrategyRiskLevel,
  StrategyPublishCategory,
  StrategyPackage,
  StrategyParameter,
  StrategyMetadata,
  StrategyVersion,
  StrategyPerformanceMetrics,

  // API types
  PublishStrategyRequest,
  PublishStrategyResponse,
  UpdateStrategyRequest,
  UpdateStrategyResponse,
  DeveloperStrategyFilter,
  DeveloperStrategiesResponse,

  // Validation types
  ValidationResult,
  ValidationError,
  ValidationWarning,

  // Event types
  PublishingEvent,
  PublishingEventType,
  PublishingEventCallback,
} from './types';

// ============================================================================
// Validation Layer
// ============================================================================

export {
  // Validator
  DefaultStrategyValidator,
  createStrategyValidator,
  // Constants
  SUPPORTED_PAIRS,
  VALID_RISK_LEVELS,
  VALID_CATEGORIES,
  LIMITS,
  // Types
  type StrategyValidator,
} from '../validation';

// ============================================================================
// Registry Storage
// ============================================================================

export {
  // Registry
  InMemoryStrategyRegistry,
  createStrategyRegistry,
  // Types
  type StrategyRegistryStorage,
} from '../registry';

// ============================================================================
// Publishing API
// ============================================================================

export {
  // API Handler
  PublishingApi,
  createPublishingApi,
  createDemoPublishingApi,
  // Error types
  PublishingError,
  // Types
  type PublishingApiRequest,
  type PublishingApiResponse,
  type PublishingApiResponseBody,
  type PublishingErrorCode,
} from './api';

// ============================================================================
// Marketplace Integration (#216)
// ============================================================================

export {
  // Integration
  DefaultMarketplaceIntegration,
  createMarketplaceIntegration,
  // Types
  type MarketplaceIntegration,
} from './marketplace-integration';

// ============================================================================
// Default Export
// ============================================================================

export { PublishingApi as default } from './api';
