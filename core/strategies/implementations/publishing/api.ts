/**
 * TONAIAgent - Strategy Publishing API
 *
 * Framework-agnostic REST API handler for the Strategy Publishing System.
 *
 * Endpoints (Issue #217):
 *   POST /api/strategies/publish              - Publish a new strategy
 *   POST /api/strategies/:id/update           - Update an existing strategy
 *   GET  /api/developers/:id/strategies       - List developer's strategies
 *   GET  /api/strategies/:id                  - Get strategy details
 *   GET  /api/strategies/:id/versions         - Get version history
 *   GET  /api/strategies/:id/metrics          - Get performance metrics
 *   POST /api/strategies/:id/publish          - Change status to published
 *   POST /api/strategies/:id/deprecate        - Deprecate a strategy
 *   POST /api/strategies/:id/hide             - Hide a strategy
 *   DELETE /api/strategies/:id                - Delete a strategy (draft only)
 *
 * Implements Issue #217: Strategy Publishing System
 */

import type {
  StrategyPackage,
  StrategyMetadata,
  StrategyVersion,
  StrategyPerformanceMetrics,
  PublishStrategyRequest,
  PublishStrategyResponse,
  UpdateStrategyRequest,
  UpdateStrategyResponse,
  DeveloperStrategyFilter,
  DeveloperStrategiesResponse,
  ValidationResult,
} from './types';

import {
  StrategyValidator,
  createStrategyValidator,
} from '../validation';

import {
  StrategyRegistryStorage,
  InMemoryStrategyRegistry,
  createStrategyRegistry,
} from '../registry';

// ============================================================================
// API Types
// ============================================================================

/** Framework-agnostic API request */
export interface PublishingApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  /** Developer ID from authentication */
  developerId?: string;
}

/** Framework-agnostic API response */
export interface PublishingApiResponse<T = unknown> {
  statusCode: number;
  body: PublishingApiResponseBody<T>;
}

/** Standard response envelope */
export interface PublishingApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: PublishingErrorCode;
  validation?: ValidationResult;
}

/** Error codes for publishing operations */
export type PublishingErrorCode =
  | 'STRATEGY_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'ALREADY_EXISTS'
  | 'INVALID_STATUS'
  | 'HAS_ACTIVE_USERS'
  | 'OPERATION_FAILED';

/** Structured error for publishing operations */
export class PublishingError extends Error {
  constructor(
    message: string,
    public readonly code: PublishingErrorCode,
    public readonly validation?: ValidationResult
  ) {
    super(message);
    this.name = 'PublishingError';
  }
}

// ============================================================================
// Publishing API
// ============================================================================

/**
 * Framework-agnostic REST handler for the Strategy Publishing API.
 *
 * @example
 * ```typescript
 * const api = createPublishingApi();
 *
 * // Publish a new strategy
 * const response = await api.handle({
 *   method: 'POST',
 *   path: '/api/strategies/publish',
 *   body: {
 *     package: {
 *       name: 'My Strategy',
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
 * // Update a strategy
 * const updateResponse = await api.handle({
 *   method: 'POST',
 *   path: '/api/strategies/strategy_123/update',
 *   body: {
 *     version: '1.1',
 *     description: 'Improved entry signals',
 *   },
 *   developerId: 'dev123',
 * });
 * ```
 */
export class PublishingApi {
  private readonly registry: InMemoryStrategyRegistry;
  private readonly validator: StrategyValidator;

  constructor(registry?: InMemoryStrategyRegistry, validator?: StrategyValidator) {
    this.registry = registry ?? createStrategyRegistry();
    this.validator = validator ?? createStrategyValidator();
  }

  /** Dispatch an incoming request to the appropriate handler */
  async handle(req: PublishingApiRequest): Promise<PublishingApiResponse> {
    const { method, path } = req;

    // POST /api/strategies/publish - Publish a new strategy
    if (method === 'POST' && this.matchExact(path, '/api/strategies/publish')) {
      return this.handlePublishStrategy(req.body as PublishStrategyRequest, req.developerId);
    }

    // POST /api/strategies/:id/update - Update an existing strategy
    const updateMatch = this.matchParam(path, '/api/strategies/:id/update');
    if (method === 'POST' && updateMatch) {
      return this.handleUpdateStrategy(
        updateMatch.id,
        req.body as UpdateStrategyRequest,
        req.developerId
      );
    }

    // GET /api/developers/:id/strategies - List developer's strategies
    const devStrategiesMatch = this.matchParam(path, '/api/developers/:id/strategies');
    if (method === 'GET' && devStrategiesMatch) {
      return this.handleGetDeveloperStrategies(devStrategiesMatch.id, req.query);
    }

    // GET /api/strategies/:id - Get strategy details
    const getStrategyMatch = this.matchParam(path, '/api/strategies/:id');
    if (method === 'GET' && getStrategyMatch && !path.includes('/versions') && !path.includes('/metrics')) {
      return this.handleGetStrategy(getStrategyMatch.id, req.developerId);
    }

    // GET /api/strategies/:id/versions - Get version history
    const versionsMatch = this.matchParam(path, '/api/strategies/:id/versions');
    if (method === 'GET' && versionsMatch) {
      return this.handleGetVersions(versionsMatch.id, req.developerId);
    }

    // GET /api/strategies/:id/metrics - Get performance metrics
    const metricsMatch = this.matchParam(path, '/api/strategies/:id/metrics');
    if (method === 'GET' && metricsMatch) {
      return this.handleGetMetrics(metricsMatch.id);
    }

    // POST /api/strategies/:id/publish - Change status to published
    const publishMatch = this.matchParam(path, '/api/strategies/:id/publish');
    if (method === 'POST' && publishMatch) {
      return this.handleSetPublished(publishMatch.id, req.developerId);
    }

    // POST /api/strategies/:id/deprecate - Deprecate a strategy
    const deprecateMatch = this.matchParam(path, '/api/strategies/:id/deprecate');
    if (method === 'POST' && deprecateMatch) {
      return this.handleDeprecate(deprecateMatch.id, req.developerId);
    }

    // POST /api/strategies/:id/hide - Hide a strategy
    const hideMatch = this.matchParam(path, '/api/strategies/:id/hide');
    if (method === 'POST' && hideMatch) {
      return this.handleHide(hideMatch.id, req.developerId);
    }

    // DELETE /api/strategies/:id - Delete a strategy
    const deleteMatch = this.matchParam(path, '/api/strategies/:id');
    if (method === 'DELETE' && deleteMatch) {
      return this.handleDeleteStrategy(deleteMatch.id, req.developerId);
    }

    return this.notFound();
  }

  /** Expose the underlying registry */
  getRegistry(): InMemoryStrategyRegistry {
    return this.registry;
  }

  /** Expose the validator */
  getValidator(): StrategyValidator {
    return this.validator;
  }

  // ============================================================================
  // Request Handlers
  // ============================================================================

  private async handlePublishStrategy(
    body: PublishStrategyRequest,
    developerId?: string
  ): Promise<PublishingApiResponse<PublishStrategyResponse>> {
    try {
      if (!developerId) {
        throw new PublishingError('Authentication required', 'UNAUTHORIZED');
      }

      if (!body?.package) {
        throw new PublishingError('Strategy package is required', 'VALIDATION_FAILED');
      }

      const pkg = body.package;

      // Ensure the author matches the authenticated developer
      if (pkg.author && pkg.author !== developerId) {
        throw new PublishingError(
          'Author ID must match authenticated developer',
          'FORBIDDEN'
        );
      }

      // Set author to authenticated developer
      pkg.author = developerId;

      // Validate the strategy package
      const validation = this.validator.validate(pkg);
      if (!validation.valid) {
        throw new PublishingError('Strategy validation failed', 'VALIDATION_FAILED', validation);
      }

      // Generate strategy ID if not provided
      const strategyId = pkg.strategy_id ?? this.generateStrategyId(pkg.name);

      // Check if strategy already exists
      const existing = await this.registry.getStrategy(strategyId);
      if (existing) {
        throw new PublishingError(
          `Strategy with ID "${strategyId}" already exists`,
          'ALREADY_EXISTS'
        );
      }

      // Create metadata from package
      const now = new Date();
      const metadata: StrategyMetadata = {
        strategy_id: strategyId,
        name: pkg.name,
        author: developerId,
        author_name: pkg.author_name ?? developerId,
        description: pkg.description,
        version: pkg.version,
        risk_level: pkg.risk_level,
        category: pkg.category,
        supported_pairs: pkg.supported_pairs,
        recommended_capital: pkg.recommended_capital ?? 10,
        execution_interval: pkg.execution_interval ?? 60,
        status: 'draft', // Always start as draft
        verified: false,
        tags: pkg.tags ?? [],
        parameters: pkg.parameters ?? {},
        created_at: now,
        updated_at: now,
      };

      // Save to registry
      await this.registry.saveStrategy(metadata);

      return this.ok({
        strategy_id: strategyId,
        status: 'draft',
        message: 'Strategy saved as draft. Call /api/strategies/:id/publish to make it public.',
      });
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<PublishStrategyResponse>;
    }
  }

  private async handleUpdateStrategy(
    strategyId: string,
    body: UpdateStrategyRequest,
    developerId?: string
  ): Promise<PublishingApiResponse<UpdateStrategyResponse>> {
    try {
      if (!developerId) {
        throw new PublishingError('Authentication required', 'UNAUTHORIZED');
      }

      const strategy = await this.registry.getStrategy(strategyId);
      if (!strategy) {
        throw new PublishingError(`Strategy not found: ${strategyId}`, 'STRATEGY_NOT_FOUND');
      }

      // Verify ownership
      if (strategy.author !== developerId) {
        throw new PublishingError(
          'You can only update your own strategies',
          'FORBIDDEN'
        );
      }

      // Cannot update deprecated strategies
      if (strategy.status === 'deprecated') {
        throw new PublishingError(
          'Cannot update deprecated strategies',
          'INVALID_STATUS'
        );
      }

      // Validate the update
      const updatePkg: Partial<StrategyPackage> = {
        version: body.version,
        description: body.description,
        risk_level: body.risk_level,
        supported_pairs: body.supported_pairs,
        recommended_capital: body.recommended_capital,
        execution_interval: body.execution_interval,
        tags: body.tags,
        parameters: body.parameters,
      };

      const validation = this.validator.validateUpdate(strategyId, updatePkg);
      if (!validation.valid) {
        throw new PublishingError('Update validation failed', 'VALIDATION_FAILED', validation);
      }

      // Apply updates
      const updates: Partial<StrategyMetadata> = {};
      if (body.version) updates.version = body.version;
      if (body.description) updates.description = body.description;
      if (body.risk_level) updates.risk_level = body.risk_level;
      if (body.supported_pairs) updates.supported_pairs = body.supported_pairs;
      if (body.recommended_capital) updates.recommended_capital = body.recommended_capital;
      if (body.execution_interval) updates.execution_interval = body.execution_interval;
      if (body.tags) updates.tags = body.tags;
      if (body.parameters) updates.parameters = body.parameters;

      const updated = await this.registry.updateStrategy(strategyId, updates);

      return this.ok({
        strategy_id: strategyId,
        version: updated.version,
        status: 'updated',
        message: 'Strategy updated successfully',
      });
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<UpdateStrategyResponse>;
    }
  }

  private async handleGetDeveloperStrategies(
    developerId: string,
    query?: Record<string, string>
  ): Promise<PublishingApiResponse<DeveloperStrategiesResponse>> {
    try {
      const filter: DeveloperStrategyFilter = {};

      if (query?.status) {
        filter.status = query.status as DeveloperStrategyFilter['status'];
      }
      if (query?.category) {
        filter.category = query.category as DeveloperStrategyFilter['category'];
      }
      if (query?.sort_by) {
        filter.sort_by = query.sort_by as DeveloperStrategyFilter['sort_by'];
      }
      if (query?.sort_order) {
        filter.sort_order = query.sort_order as 'asc' | 'desc';
      }

      const limit = query?.limit ? parseInt(query.limit, 10) : 20;
      const offset = query?.offset ? parseInt(query.offset, 10) : 0;
      filter.limit = limit;
      filter.offset = offset;

      const strategies = await this.registry.getStrategiesByDeveloper(developerId, filter);
      const total = await this.registry.countStrategiesByDeveloper(developerId);

      return this.ok({
        strategies,
        total,
        offset,
        limit,
      });
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<DeveloperStrategiesResponse>;
    }
  }

  private async handleGetStrategy(
    strategyId: string,
    developerId?: string
  ): Promise<PublishingApiResponse<StrategyMetadata>> {
    try {
      const strategy = await this.registry.getStrategy(strategyId);
      if (!strategy) {
        throw new PublishingError(`Strategy not found: ${strategyId}`, 'STRATEGY_NOT_FOUND');
      }

      // If strategy is not published, only the owner can view it
      if (strategy.status !== 'published' && strategy.author !== developerId) {
        throw new PublishingError('Strategy not found', 'STRATEGY_NOT_FOUND');
      }

      return this.ok(strategy);
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<StrategyMetadata>;
    }
  }

  private async handleGetVersions(
    strategyId: string,
    developerId?: string
  ): Promise<PublishingApiResponse<{ versions: StrategyVersion[] }>> {
    try {
      const strategy = await this.registry.getStrategy(strategyId);
      if (!strategy) {
        throw new PublishingError(`Strategy not found: ${strategyId}`, 'STRATEGY_NOT_FOUND');
      }

      // If strategy is not published, only the owner can view versions
      if (strategy.status !== 'published' && strategy.author !== developerId) {
        throw new PublishingError('Strategy not found', 'STRATEGY_NOT_FOUND');
      }

      const versions = await this.registry.getVersionHistory(strategyId);

      return this.ok({ versions });
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<{ versions: StrategyVersion[] }>;
    }
  }

  private async handleGetMetrics(
    strategyId: string
  ): Promise<PublishingApiResponse<StrategyPerformanceMetrics>> {
    try {
      const strategy = await this.registry.getStrategy(strategyId);
      if (!strategy) {
        throw new PublishingError(`Strategy not found: ${strategyId}`, 'STRATEGY_NOT_FOUND');
      }

      const metrics = await this.registry.getMetrics(strategyId);
      if (!metrics) {
        throw new PublishingError(`Metrics not found for strategy: ${strategyId}`, 'STRATEGY_NOT_FOUND');
      }

      return this.ok(metrics);
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<StrategyPerformanceMetrics>;
    }
  }

  private async handleSetPublished(
    strategyId: string,
    developerId?: string
  ): Promise<PublishingApiResponse<StrategyMetadata>> {
    try {
      if (!developerId) {
        throw new PublishingError('Authentication required', 'UNAUTHORIZED');
      }

      const strategy = await this.registry.getStrategy(strategyId);
      if (!strategy) {
        throw new PublishingError(`Strategy not found: ${strategyId}`, 'STRATEGY_NOT_FOUND');
      }

      if (strategy.author !== developerId) {
        throw new PublishingError('You can only publish your own strategies', 'FORBIDDEN');
      }

      const published = await this.registry.publishStrategy(strategyId);

      return this.ok(published);
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<StrategyMetadata>;
    }
  }

  private async handleDeprecate(
    strategyId: string,
    developerId?: string
  ): Promise<PublishingApiResponse<StrategyMetadata>> {
    try {
      if (!developerId) {
        throw new PublishingError('Authentication required', 'UNAUTHORIZED');
      }

      const strategy = await this.registry.getStrategy(strategyId);
      if (!strategy) {
        throw new PublishingError(`Strategy not found: ${strategyId}`, 'STRATEGY_NOT_FOUND');
      }

      if (strategy.author !== developerId) {
        throw new PublishingError('You can only deprecate your own strategies', 'FORBIDDEN');
      }

      const deprecated = await this.registry.deprecateStrategy(strategyId);

      return this.ok(deprecated);
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<StrategyMetadata>;
    }
  }

  private async handleHide(
    strategyId: string,
    developerId?: string
  ): Promise<PublishingApiResponse<StrategyMetadata>> {
    try {
      if (!developerId) {
        throw new PublishingError('Authentication required', 'UNAUTHORIZED');
      }

      const strategy = await this.registry.getStrategy(strategyId);
      if (!strategy) {
        throw new PublishingError(`Strategy not found: ${strategyId}`, 'STRATEGY_NOT_FOUND');
      }

      if (strategy.author !== developerId) {
        throw new PublishingError('You can only hide your own strategies', 'FORBIDDEN');
      }

      const hidden = await this.registry.hideStrategy(strategyId);

      return this.ok(hidden);
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<StrategyMetadata>;
    }
  }

  private async handleDeleteStrategy(
    strategyId: string,
    developerId?: string
  ): Promise<PublishingApiResponse<{ deleted: boolean }>> {
    try {
      if (!developerId) {
        throw new PublishingError('Authentication required', 'UNAUTHORIZED');
      }

      const strategy = await this.registry.getStrategy(strategyId);
      if (!strategy) {
        throw new PublishingError(`Strategy not found: ${strategyId}`, 'STRATEGY_NOT_FOUND');
      }

      if (strategy.author !== developerId) {
        throw new PublishingError('You can only delete your own strategies', 'FORBIDDEN');
      }

      // Can only delete draft strategies
      if (strategy.status !== 'draft') {
        throw new PublishingError(
          'Can only delete draft strategies. Use deprecate instead.',
          'INVALID_STATUS'
        );
      }

      await this.registry.deleteStrategy(strategyId);

      return this.ok({ deleted: true });
    } catch (err) {
      return this.handleError(err) as PublishingApiResponse<{ deleted: boolean }>;
    }
  }

  // ============================================================================
  // Response Helpers
  // ============================================================================

  private ok<T>(data: T): PublishingApiResponse<T> {
    return {
      statusCode: 200,
      body: { success: true, data },
    };
  }

  private notFound(): PublishingApiResponse {
    return {
      statusCode: 404,
      body: { success: false, error: 'Route not found', code: 'STRATEGY_NOT_FOUND' },
    };
  }

  private handleError(err: unknown): PublishingApiResponse {
    if (err instanceof PublishingError) {
      const statusCode = this.errorCodeToStatus(err.code);
      return {
        statusCode,
        body: {
          success: false,
          error: err.message,
          code: err.code,
          validation: err.validation,
        },
      };
    }
    if (err instanceof Error && err.message.includes('not found')) {
      return {
        statusCode: 404,
        body: { success: false, error: err.message, code: 'STRATEGY_NOT_FOUND' },
      };
    }
    if (err instanceof Error && err.message.includes('Cannot delete')) {
      return {
        statusCode: 400,
        body: { success: false, error: err.message, code: 'HAS_ACTIVE_USERS' },
      };
    }
    return {
      statusCode: 500,
      body: { success: false, error: 'Internal server error', code: 'OPERATION_FAILED' },
    };
  }

  private errorCodeToStatus(code: PublishingErrorCode): number {
    switch (code) {
      case 'STRATEGY_NOT_FOUND':
        return 404;
      case 'VALIDATION_FAILED':
      case 'ALREADY_EXISTS':
      case 'INVALID_STATUS':
      case 'HAS_ACTIVE_USERS':
        return 400;
      case 'UNAUTHORIZED':
        return 401;
      case 'FORBIDDEN':
        return 403;
      default:
        return 500;
    }
  }

  // ============================================================================
  // Path Matching Helpers
  // ============================================================================

  private matchExact(actual: string, pattern: string): boolean {
    return actual === pattern || actual === pattern + '/';
  }

  private matchParam(actual: string, pattern: string): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const actualParts = actual.split('/');

    if (patternParts.length !== actualParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      const pp = patternParts[i];
      const ap = actualParts[i];
      if (pp.startsWith(':')) {
        params[pp.slice(1)] = ap;
      } else if (pp !== ap) {
        return null;
      }
    }
    return params;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateStrategyId(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${slug}-${suffix}`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a PublishingApi instance
 */
export function createPublishingApi(
  registry?: InMemoryStrategyRegistry,
  validator?: StrategyValidator
): PublishingApi {
  return new PublishingApi(registry, validator);
}

/**
 * Create a PublishingApi with demo data
 */
export function createDemoPublishingApi(): PublishingApi {
  return new PublishingApi();
}
