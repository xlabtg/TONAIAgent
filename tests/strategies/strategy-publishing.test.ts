/**
 * Strategy Publishing System Tests (Issue #217)
 *
 * Comprehensive test coverage for the Strategy Publishing System including:
 * - Strategy validation
 * - Strategy registry storage
 * - Publishing API endpoints
 * - Marketplace integration
 * - Full publishing workflow
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  // Validation
  createStrategyValidator,
  DefaultStrategyValidator,
  SUPPORTED_PAIRS,
  VALID_RISK_LEVELS,
  VALID_CATEGORIES,
  LIMITS,
  // Registry
  createStrategyRegistry,
  InMemoryStrategyRegistry,
  // Publishing API
  createPublishingApi,
  PublishingApi,
  PublishingError,
  // Marketplace Integration
  createMarketplaceIntegration,
  DefaultMarketplaceIntegration,
  // Types
  type StrategyPackage,
  type StrategyMetadata,
  type ValidationResult,
} from '../../core/strategies/implementations/publishing';

// ============================================================================
// Strategy Validation Tests
// ============================================================================

describe('DefaultStrategyValidator', () => {
  let validator: DefaultStrategyValidator;

  beforeEach(() => {
    validator = createStrategyValidator();
  });

  describe('validate', () => {
    it('should pass validation for a complete valid package', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'A test trading strategy for validation testing purposes',
        version: '1.0',
        author: 'dev123',
        supported_pairs: ['TON/USDT'],
        risk_level: 'medium',
        category: 'momentum',
        recommended_capital: 100,
        execution_interval: 300,
        tags: ['test', 'momentum'],
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const pkg: Partial<StrategyPackage> = {
        name: 'Test Strategy',
        // Missing: description, version, author, supported_pairs, risk_level, category
      };

      const result = validator.validate(pkg as StrategyPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'MISSING_DESCRIPTION')).toBe(true);
      expect(result.errors.some(e => e.code === 'MISSING_VERSION')).toBe(true);
      expect(result.errors.some(e => e.code === 'MISSING_AUTHOR')).toBe(true);
    });

    it('should fail validation for short name', () => {
      const pkg: StrategyPackage = {
        name: 'AB', // Too short
        description: 'A test trading strategy for validation testing purposes',
        version: '1.0',
        author: 'dev123',
        supported_pairs: ['TON/USDT'],
        risk_level: 'medium',
        category: 'momentum',
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NAME_TOO_SHORT')).toBe(true);
    });

    it('should fail validation for short description', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'Too short', // Less than 20 characters
        version: '1.0',
        author: 'dev123',
        supported_pairs: ['TON/USDT'],
        risk_level: 'medium',
        category: 'momentum',
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DESCRIPTION_TOO_SHORT')).toBe(true);
    });

    it('should fail validation for invalid version format', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'A test trading strategy for validation testing purposes',
        version: 'v1', // Invalid format
        author: 'dev123',
        supported_pairs: ['TON/USDT'],
        risk_level: 'medium',
        category: 'momentum',
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_VERSION_FORMAT')).toBe(true);
    });

    it('should fail validation for invalid risk level', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'A test trading strategy for validation testing purposes',
        version: '1.0',
        author: 'dev123',
        supported_pairs: ['TON/USDT'],
        risk_level: 'extreme' as any, // Invalid risk level
        category: 'momentum',
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_RISK_LEVEL')).toBe(true);
    });

    it('should fail validation for invalid category', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'A test trading strategy for validation testing purposes',
        version: '1.0',
        author: 'dev123',
        supported_pairs: ['TON/USDT'],
        risk_level: 'medium',
        category: 'invalid_category' as any,
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CATEGORY')).toBe(true);
    });

    it('should fail validation for empty supported pairs', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'A test trading strategy for validation testing purposes',
        version: '1.0',
        author: 'dev123',
        supported_pairs: [],
        risk_level: 'medium',
        category: 'momentum',
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_SUPPORTED_PAIRS')).toBe(true);
    });

    it('should warn about unsupported trading pairs', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'A test trading strategy for validation testing purposes',
        version: '1.0',
        author: 'dev123',
        supported_pairs: ['TON/USDT', 'CUSTOM/TOKEN'],
        risk_level: 'medium',
        category: 'momentum',
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(true); // Still valid, just has warnings
      expect(result.warnings.some(w => w.code === 'UNSUPPORTED_PAIRS')).toBe(true);
    });

    it('should warn about missing recommended capital', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'A test trading strategy for validation testing purposes',
        version: '1.0',
        author: 'dev123',
        supported_pairs: ['TON/USDT'],
        risk_level: 'medium',
        category: 'momentum',
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'MISSING_RECOMMENDED_CAPITAL')).toBe(true);
    });

    it('should validate strategy parameters', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'A test trading strategy for validation testing purposes',
        version: '1.0',
        author: 'dev123',
        supported_pairs: ['TON/USDT'],
        risk_level: 'medium',
        category: 'momentum',
        parameters: {
          threshold: {
            name: 'Threshold',
            description: 'Entry threshold percentage',
            type: 'number',
            default_value: 5,
            min_value: 1,
            max_value: 20,
            required: true,
          },
        },
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(true);
    });

    it('should fail validation for select parameter without options', () => {
      const pkg: StrategyPackage = {
        name: 'Test Strategy',
        description: 'A test trading strategy for validation testing purposes',
        version: '1.0',
        author: 'dev123',
        supported_pairs: ['TON/USDT'],
        risk_level: 'medium',
        category: 'momentum',
        parameters: {
          mode: {
            name: 'Mode',
            description: 'Trading mode',
            type: 'select',
            default_value: 'normal',
            required: true,
            // Missing: options
          },
        },
      };

      const result = validator.validate(pkg);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_SELECT_OPTIONS')).toBe(true);
    });
  });

  describe('validateUpdate', () => {
    it('should validate updates with new version', () => {
      const result = validator.validateUpdate('strategy_123', {
        version: '1.1',
        description: 'Updated description with more details',
      });

      expect(result.valid).toBe(true);
    });

    it('should fail update validation without version', () => {
      const result = validator.validateUpdate('strategy_123', {
        description: 'Updated description',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_VERSION')).toBe(true);
    });
  });

  describe('isPairSupported', () => {
    it('should return true for supported pairs', () => {
      expect(validator.isPairSupported('TON/USDT')).toBe(true);
      expect(validator.isPairSupported('BTC/USDT')).toBe(true);
      expect(validator.isPairSupported('ETH/USDT')).toBe(true);
    });

    it('should return false for unsupported pairs', () => {
      expect(validator.isPairSupported('UNKNOWN/TOKEN')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(validator.isPairSupported('ton/usdt')).toBe(true);
      expect(validator.isPairSupported('TON/usdt')).toBe(true);
    });
  });

  describe('getSupportedPairs', () => {
    it('should return list of supported pairs', () => {
      const pairs = validator.getSupportedPairs();
      expect(pairs.length).toBeGreaterThan(0);
      expect(pairs).toContain('TON/USDT');
    });
  });
});

// ============================================================================
// Strategy Registry Tests
// ============================================================================

describe('InMemoryStrategyRegistry', () => {
  let registry: InMemoryStrategyRegistry;

  const createTestMetadata = (id: string, author: string): StrategyMetadata => ({
    strategy_id: id,
    name: 'Test Strategy',
    author,
    author_name: author,
    description: 'A test trading strategy',
    version: '1.0',
    risk_level: 'medium',
    category: 'momentum',
    supported_pairs: ['TON/USDT'],
    recommended_capital: 100,
    execution_interval: 300,
    status: 'draft',
    verified: false,
    tags: ['test'],
    parameters: {},
    created_at: new Date(),
    updated_at: new Date(),
  });

  beforeEach(() => {
    registry = createStrategyRegistry();
  });

  describe('saveStrategy', () => {
    it('should save a new strategy', async () => {
      const metadata = createTestMetadata('test_1', 'dev123');
      await registry.saveStrategy(metadata);

      const saved = await registry.getStrategy('test_1');
      expect(saved).not.toBeNull();
      expect(saved!.name).toBe('Test Strategy');
    });

    it('should initialize metrics for new strategy', async () => {
      const metadata = createTestMetadata('test_2', 'dev123');
      await registry.saveStrategy(metadata);

      const metrics = await registry.getMetrics('test_2');
      expect(metrics).not.toBeNull();
      expect(metrics!.agents_using).toBe(0);
    });

    it('should save initial version', async () => {
      const metadata = createTestMetadata('test_3', 'dev123');
      await registry.saveStrategy(metadata);

      const versions = await registry.getVersionHistory('test_3');
      expect(versions.length).toBe(1);
      expect(versions[0].version).toBe('1.0');
    });
  });

  describe('updateStrategy', () => {
    it('should update strategy metadata', async () => {
      const metadata = createTestMetadata('test_4', 'dev123');
      await registry.saveStrategy(metadata);

      const updated = await registry.updateStrategy('test_4', {
        description: 'Updated description',
        version: '1.1',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.version).toBe('1.1');
    });

    it('should save new version on version change', async () => {
      const metadata = createTestMetadata('test_5', 'dev123');
      await registry.saveStrategy(metadata);

      await registry.updateStrategy('test_5', { version: '1.1' });
      await registry.updateStrategy('test_5', { version: '1.2' });

      const versions = await registry.getVersionHistory('test_5');
      expect(versions.length).toBe(3);
    });

    it('should throw error for non-existent strategy', async () => {
      await expect(
        registry.updateStrategy('nonexistent', { description: 'test' })
      ).rejects.toThrow('Strategy not found');
    });
  });

  describe('publishStrategy', () => {
    it('should change status to published', async () => {
      const metadata = createTestMetadata('test_6', 'dev123');
      await registry.saveStrategy(metadata);

      const published = await registry.publishStrategy('test_6');
      expect(published.status).toBe('published');
      expect(published.published_at).toBeInstanceOf(Date);
    });

    it('should throw error if already published', async () => {
      const metadata = createTestMetadata('test_7', 'dev123');
      await registry.saveStrategy(metadata);
      await registry.publishStrategy('test_7');

      await expect(registry.publishStrategy('test_7')).rejects.toThrow('already published');
    });
  });

  describe('deprecateStrategy', () => {
    it('should change status to deprecated', async () => {
      const metadata = createTestMetadata('test_8', 'dev123');
      await registry.saveStrategy(metadata);

      const deprecated = await registry.deprecateStrategy('test_8');
      expect(deprecated.status).toBe('deprecated');
    });

    it('should mark all versions as deprecated', async () => {
      const metadata = createTestMetadata('test_9', 'dev123');
      await registry.saveStrategy(metadata);
      await registry.updateStrategy('test_9', { version: '1.1' });

      await registry.deprecateStrategy('test_9');

      const versions = await registry.getVersionHistory('test_9');
      expect(versions.every(v => v.deprecated)).toBe(true);
    });
  });

  describe('getStrategiesByDeveloper', () => {
    it('should return strategies for a developer', async () => {
      await registry.saveStrategy(createTestMetadata('s1', 'dev123'));
      await registry.saveStrategy(createTestMetadata('s2', 'dev123'));
      await registry.saveStrategy(createTestMetadata('s3', 'dev456'));

      const strategies = await registry.getStrategiesByDeveloper('dev123');
      expect(strategies.length).toBe(2);
      expect(strategies.every(s => s.author === 'dev123')).toBe(true);
    });

    it('should filter by status', async () => {
      await registry.saveStrategy(createTestMetadata('s4', 'dev123'));
      await registry.saveStrategy(createTestMetadata('s5', 'dev123'));
      await registry.publishStrategy('s4');

      const published = await registry.getStrategiesByDeveloper('dev123', { status: 'published' });
      expect(published.length).toBe(1);
      expect(published[0].strategy_id).toBe('s4');
    });

    it('should support pagination', async () => {
      await registry.saveStrategy(createTestMetadata('s6', 'dev123'));
      await registry.saveStrategy(createTestMetadata('s7', 'dev123'));
      await registry.saveStrategy(createTestMetadata('s8', 'dev123'));

      const page1 = await registry.getStrategiesByDeveloper('dev123', { limit: 2, offset: 0 });
      const page2 = await registry.getStrategiesByDeveloper('dev123', { limit: 2, offset: 2 });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(1);
    });
  });

  describe('listPublishedStrategies', () => {
    it('should list only published strategies', async () => {
      await registry.saveStrategy(createTestMetadata('p1', 'dev123'));
      await registry.saveStrategy(createTestMetadata('p2', 'dev123'));
      await registry.publishStrategy('p1');

      const published = await registry.listPublishedStrategies();
      expect(published.length).toBe(1);
      expect(published[0].strategy_id).toBe('p1');
    });
  });

  describe('updateMetrics', () => {
    it('should update strategy metrics', async () => {
      await registry.saveStrategy(createTestMetadata('m1', 'dev123'));

      await registry.updateMetrics('m1', {
        agents_using: 10,
        avg_roi: 15.5,
      });

      const metrics = await registry.getMetrics('m1');
      expect(metrics!.agents_using).toBe(10);
      expect(metrics!.avg_roi).toBe(15.5);
    });
  });

  describe('getStats', () => {
    it('should return registry statistics', async () => {
      await registry.saveStrategy(createTestMetadata('st1', 'dev123'));
      await registry.saveStrategy(createTestMetadata('st2', 'dev456'));
      await registry.publishStrategy('st1');

      const stats = registry.getStats();
      expect(stats.totalStrategies).toBe(2);
      expect(stats.publishedStrategies).toBe(1);
      expect(stats.draftStrategies).toBe(1);
      expect(stats.totalDevelopers).toBe(2);
    });
  });
});

// ============================================================================
// Publishing API Tests
// ============================================================================

describe('PublishingApi', () => {
  let api: PublishingApi;

  beforeEach(() => {
    api = createPublishingApi();
  });

  describe('POST /api/strategies/publish', () => {
    it('should publish a new strategy as draft', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'My Strategy',
            description: 'A momentum-based trading strategy for testing',
            version: '1.0',
            author: 'dev123',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data?.status).toBe('draft');
      expect(response.body.data?.strategy_id).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'My Strategy',
            description: 'A momentum-based trading strategy for testing',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should fail validation for invalid package', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'AB', // Too short
            description: 'Short', // Too short
            version: 'v1', // Invalid format
            supported_pairs: [],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(response.body.validation).toBeDefined();
      expect(response.body.validation!.errors.length).toBeGreaterThan(0);
    });

    it('should fail when author does not match developer', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'My Strategy',
            description: 'A momentum-based trading strategy for testing',
            version: '1.0',
            author: 'other_dev', // Different from developerId
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      expect(response.statusCode).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/strategies/:id/update', () => {
    it('should update an existing strategy', async () => {
      // First, publish a strategy
      const publishResponse = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Update Test Strategy',
            description: 'A strategy for testing updates functionality',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      const strategyId = publishResponse.body.data?.strategy_id;

      // Then update it
      const updateResponse = await api.handle({
        method: 'POST',
        path: `/api/strategies/${strategyId}/update`,
        body: {
          version: '1.1',
          description: 'Updated description with improved signals',
        },
        developerId: 'dev123',
      });

      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.body.data?.version).toBe('1.1');
      expect(updateResponse.body.data?.status).toBe('updated');
    });

    it('should fail for non-existent strategy', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/nonexistent/update',
        body: { version: '1.1' },
        developerId: 'dev123',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should fail when updating another developer\'s strategy', async () => {
      // Publish as dev123
      const publishResponse = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Owner Test Strategy',
            description: 'A strategy for testing ownership validation',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      const strategyId = publishResponse.body.data?.strategy_id;

      // Try to update as dev456
      const updateResponse = await api.handle({
        method: 'POST',
        path: `/api/strategies/${strategyId}/update`,
        body: { version: '1.1' },
        developerId: 'dev456',
      });

      expect(updateResponse.statusCode).toBe(403);
    });
  });

  describe('GET /api/developers/:id/strategies', () => {
    it('should list developer strategies', async () => {
      // Publish some strategies
      await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Dev Strategy 1',
            description: 'First strategy for listing test purposes',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev789',
      });

      await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Dev Strategy 2',
            description: 'Second strategy for listing test purposes',
            version: '1.0',
            supported_pairs: ['BTC/USDT'],
            risk_level: 'low',
            category: 'arbitrage',
          },
        },
        developerId: 'dev789',
      });

      const response = await api.handle({
        method: 'GET',
        path: '/api/developers/dev789/strategies',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data?.strategies.length).toBe(2);
      expect(response.body.data?.total).toBe(2);
    });
  });

  describe('GET /api/strategies/:id', () => {
    it('should get strategy details', async () => {
      // Publish a strategy
      const publishResponse = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Details Test Strategy',
            description: 'A strategy for testing detail retrieval',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      const strategyId = publishResponse.body.data?.strategy_id;

      const response = await api.handle({
        method: 'GET',
        path: `/api/strategies/${strategyId}`,
        developerId: 'dev123', // Owner can see draft
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data?.name).toBe('Details Test Strategy');
    });

    it('should hide draft strategies from non-owners', async () => {
      const publishResponse = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Hidden Draft Strategy',
            description: 'A draft strategy that should be hidden',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      const strategyId = publishResponse.body.data?.strategy_id;

      // Try to view as different developer
      const response = await api.handle({
        method: 'GET',
        path: `/api/strategies/${strategyId}`,
        developerId: 'dev456',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/strategies/:id/publish', () => {
    it('should change status to published', async () => {
      // Create draft strategy
      const createResponse = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Publish Status Test',
            description: 'A strategy for testing publish status change',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      const strategyId = createResponse.body.data?.strategy_id;

      // Publish it
      const publishResponse = await api.handle({
        method: 'POST',
        path: `/api/strategies/${strategyId}/publish`,
        developerId: 'dev123',
      });

      expect(publishResponse.statusCode).toBe(200);
      expect(publishResponse.body.data?.status).toBe('published');
    });
  });

  describe('POST /api/strategies/:id/deprecate', () => {
    it('should deprecate a strategy', async () => {
      // Create and publish strategy
      const createResponse = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Deprecate Test Strategy',
            description: 'A strategy for testing deprecation functionality',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      const strategyId = createResponse.body.data?.strategy_id;

      // Deprecate
      const deprecateResponse = await api.handle({
        method: 'POST',
        path: `/api/strategies/${strategyId}/deprecate`,
        developerId: 'dev123',
      });

      expect(deprecateResponse.statusCode).toBe(200);
      expect(deprecateResponse.body.data?.status).toBe('deprecated');
    });
  });

  describe('DELETE /api/strategies/:id', () => {
    it('should delete a draft strategy', async () => {
      const createResponse = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Delete Test Strategy',
            description: 'A strategy for testing deletion functionality',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      const strategyId = createResponse.body.data?.strategy_id;

      const deleteResponse = await api.handle({
        method: 'DELETE',
        path: `/api/strategies/${strategyId}`,
        developerId: 'dev123',
      });

      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.body.data?.deleted).toBe(true);
    });

    it('should not delete published strategies', async () => {
      const createResponse = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Published Delete Test',
            description: 'A published strategy that cannot be deleted',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      const strategyId = createResponse.body.data?.strategy_id;

      // Publish first
      await api.handle({
        method: 'POST',
        path: `/api/strategies/${strategyId}/publish`,
        developerId: 'dev123',
      });

      // Try to delete
      const deleteResponse = await api.handle({
        method: 'DELETE',
        path: `/api/strategies/${strategyId}`,
        developerId: 'dev123',
      });

      expect(deleteResponse.statusCode).toBe(400);
      expect(deleteResponse.body.code).toBe('INVALID_STATUS');
    });
  });

  describe('GET /api/strategies/:id/versions', () => {
    it('should return version history', async () => {
      const createResponse = await api.handle({
        method: 'POST',
        path: '/api/strategies/publish',
        body: {
          package: {
            name: 'Version History Test',
            description: 'A strategy for testing version history retrieval',
            version: '1.0',
            supported_pairs: ['TON/USDT'],
            risk_level: 'medium',
            category: 'momentum',
          },
        },
        developerId: 'dev123',
      });

      const strategyId = createResponse.body.data?.strategy_id;

      // Update to create new version
      await api.handle({
        method: 'POST',
        path: `/api/strategies/${strategyId}/update`,
        body: { version: '1.1' },
        developerId: 'dev123',
      });

      const versionsResponse = await api.handle({
        method: 'GET',
        path: `/api/strategies/${strategyId}/versions`,
        developerId: 'dev123',
      });

      expect(versionsResponse.statusCode).toBe(200);
      expect(versionsResponse.body.data?.versions.length).toBe(2);
    });
  });
});

// ============================================================================
// Marketplace Integration Tests
// ============================================================================

describe('DefaultMarketplaceIntegration', () => {
  let registry: InMemoryStrategyRegistry;
  let integration: DefaultMarketplaceIntegration;

  beforeEach(() => {
    registry = createStrategyRegistry();
    integration = createMarketplaceIntegration(registry);
  });

  describe('syncToMarketplace', () => {
    it('should sync a published strategy to marketplace', async () => {
      // Create and publish a strategy
      const metadata: StrategyMetadata = {
        strategy_id: 'sync_test_1',
        name: 'Sync Test Strategy',
        author: 'dev123',
        author_name: 'Developer 123',
        description: 'A strategy for testing marketplace sync',
        version: '1.0',
        risk_level: 'medium',
        category: 'momentum',
        supported_pairs: ['TON/USDT', 'BTC/USDT'],
        recommended_capital: 100,
        execution_interval: 300,
        status: 'draft',
        verified: false,
        tags: ['test', 'sync'],
        parameters: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      await registry.saveStrategy(metadata);
      await registry.publishStrategy('sync_test_1');

      const listing = await integration.syncToMarketplace('sync_test_1');

      expect(listing.id).toBe('sync_test_1');
      expect(listing.name).toBe('Sync Test Strategy');
      expect(listing.category).toBe('momentum');
      expect(listing.riskLevel).toBe('medium');
      expect(listing.supportedAssets).toContain('TON');
      expect(listing.supportedAssets).toContain('USDT');
    });

    it('should throw error for unpublished strategies', async () => {
      const metadata: StrategyMetadata = {
        strategy_id: 'sync_test_2',
        name: 'Draft Strategy',
        author: 'dev123',
        author_name: 'Developer 123',
        description: 'A draft strategy that should not sync',
        version: '1.0',
        risk_level: 'medium',
        category: 'momentum',
        supported_pairs: ['TON/USDT'],
        recommended_capital: 100,
        execution_interval: 300,
        status: 'draft',
        verified: false,
        tags: [],
        parameters: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      await registry.saveStrategy(metadata);

      await expect(integration.syncToMarketplace('sync_test_2')).rejects.toThrow('published');
    });
  });

  describe('listMarketplaceStrategies', () => {
    it('should list all marketplace strategies including synced ones', async () => {
      // The marketplace comes with built-in strategies
      const strategies = await integration.listMarketplaceStrategies();
      expect(strategies.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Full Publishing Workflow Test
// ============================================================================

describe('Full Publishing Workflow (Issue #217)', () => {
  it('should complete the full strategy publishing workflow', async () => {
    const api = createPublishingApi();
    const registry = api.getRegistry();
    const integration = createMarketplaceIntegration(registry);

    // Step 1: Developer publishes a new strategy (saved as draft)
    const publishResponse = await api.handle({
      method: 'POST',
      path: '/api/strategies/publish',
      body: {
        package: {
          name: 'Workflow Test Strategy',
          description: 'A complete strategy for testing the full publishing workflow',
          version: '1.0',
          supported_pairs: ['TON/USDT', 'ETH/USDT'],
          risk_level: 'medium',
          category: 'momentum',
          recommended_capital: 100,
          execution_interval: 300,
          tags: ['workflow', 'test', 'momentum'],
        },
      },
      developerId: 'workflow_dev',
    });

    expect(publishResponse.statusCode).toBe(200);
    const strategyId = publishResponse.body.data?.strategy_id;
    expect(strategyId).toBeDefined();

    // Step 2: Developer views their draft strategies
    const listResponse = await api.handle({
      method: 'GET',
      path: '/api/developers/workflow_dev/strategies',
      query: { status: 'draft' },
    });

    expect(listResponse.body.data?.strategies.length).toBe(1);
    expect(listResponse.body.data?.strategies[0].status).toBe('draft');

    // Step 3: Developer updates the strategy
    const updateResponse = await api.handle({
      method: 'POST',
      path: `/api/strategies/${strategyId}/update`,
      body: {
        version: '1.1',
        description: 'Improved momentum strategy with better entry signals',
        changelog: 'Added RSI confirmation for entries',
      },
      developerId: 'workflow_dev',
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.data?.version).toBe('1.1');

    // Step 4: Developer makes the strategy public
    const makePublicResponse = await api.handle({
      method: 'POST',
      path: `/api/strategies/${strategyId}/publish`,
      developerId: 'workflow_dev',
    });

    expect(makePublicResponse.statusCode).toBe(200);
    expect(makePublicResponse.body.data?.status).toBe('published');

    // Step 5: Strategy appears in marketplace (via integration)
    const listing = await integration.syncToMarketplace(strategyId!);
    expect(listing.name).toBe('Workflow Test Strategy');

    // Step 6: Check version history
    const versionsResponse = await api.handle({
      method: 'GET',
      path: `/api/strategies/${strategyId}/versions`,
      developerId: 'workflow_dev',
    });

    expect(versionsResponse.body.data?.versions.length).toBe(2);

    // Step 7: Check metrics are initialized
    const metricsResponse = await api.handle({
      method: 'GET',
      path: `/api/strategies/${strategyId}/metrics`,
    });

    expect(metricsResponse.statusCode).toBe(200);
    expect(metricsResponse.body.data?.strategy_id).toBe(strategyId);
    expect(metricsResponse.body.data?.agents_using).toBe(0);

    // Step 8: Eventually deprecate the strategy
    const deprecateResponse = await api.handle({
      method: 'POST',
      path: `/api/strategies/${strategyId}/deprecate`,
      developerId: 'workflow_dev',
    });

    expect(deprecateResponse.statusCode).toBe(200);
    expect(deprecateResponse.body.data?.status).toBe('deprecated');
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  it('should have supported trading pairs', () => {
    expect(SUPPORTED_PAIRS.length).toBeGreaterThan(0);
    expect(SUPPORTED_PAIRS).toContain('TON/USDT');
    expect(SUPPORTED_PAIRS).toContain('BTC/USDT');
  });

  it('should have valid risk levels', () => {
    expect(VALID_RISK_LEVELS).toEqual(['low', 'medium', 'high']);
  });

  it('should have valid categories', () => {
    expect(VALID_CATEGORIES.length).toBeGreaterThan(5);
    expect(VALID_CATEGORIES).toContain('momentum');
    expect(VALID_CATEGORIES).toContain('arbitrage');
  });

  it('should have reasonable limits', () => {
    expect(LIMITS.NAME_MIN_LENGTH).toBeGreaterThan(0);
    expect(LIMITS.NAME_MAX_LENGTH).toBeGreaterThan(LIMITS.NAME_MIN_LENGTH);
    expect(LIMITS.DESCRIPTION_MIN_LENGTH).toBeGreaterThan(0);
    expect(LIMITS.MAX_PARAMETERS).toBeGreaterThan(0);
  });
});
