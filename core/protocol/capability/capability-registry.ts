/**
 * TONAIAgent - Open Agent Protocol Capability Registry
 *
 * Central registry for managing and discovering agent capabilities.
 * Handles registration, lookup, and execution of capabilities.
 */

import {
  AgentId,
  CapabilityId,
  CapabilityCategory,
  CapabilityDeclaration,
  CapabilityManifest,
  CapabilityStatus,
  ExecuteParams,
  ExecuteResult,
  CostEstimate,
  ValidationResult,
  RiskLevel,
  JSONSchemaType,
} from '../types';

import {
  CapabilityRegistryConfig,
  RegisterCapabilityInput,
  CapabilityExecutor,
  RegisteredCapability,
  CapabilitySearchCriteria,
  CapabilitySearchResult,
  CapabilityRegistryEvent,
  CapabilityEventHandler,
  CapabilityBuilderInput,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CACHE_TTL = 60000; // 1 minute
const RISK_LEVEL_ORDER: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

// ============================================================================
// Capability Registry Interface
// ============================================================================

/**
 * Capability registry interface
 */
export interface CapabilityRegistry {
  /** Register a capability */
  register(input: RegisterCapabilityInput): Promise<void>;

  /** Unregister a capability */
  unregister(capabilityId: CapabilityId, providerId: AgentId): Promise<boolean>;

  /** Get capability by ID */
  get(capabilityId: CapabilityId): Promise<RegisteredCapability | undefined>;

  /** Check if capability exists */
  has(capabilityId: CapabilityId): boolean;

  /** Execute a capability */
  execute(params: ExecuteParams): Promise<ExecuteResult>;

  /** Estimate execution cost */
  estimate(params: ExecuteParams): Promise<CostEstimate>;

  /** Validate parameters */
  validate(params: ExecuteParams): Promise<ValidationResult>;

  /** Get capability status */
  status(capabilityId: CapabilityId): Promise<CapabilityStatus | undefined>;

  /** Search capabilities */
  search(criteria: CapabilitySearchCriteria): Promise<CapabilitySearchResult>;

  /** Get manifest for agent */
  getManifest(agentId: AgentId): Promise<CapabilityManifest>;

  /** List all capabilities */
  list(): CapabilityDeclaration[];

  /** Subscribe to events */
  subscribe(handler: CapabilityEventHandler): () => void;
}

// ============================================================================
// Default Implementation
// ============================================================================

/**
 * Default capability registry implementation
 */
export class DefaultCapabilityRegistry implements CapabilityRegistry {
  private config: CapabilityRegistryConfig;
  private capabilities: Map<CapabilityId, RegisteredCapability> = new Map();
  private byProvider: Map<AgentId, Set<CapabilityId>> = new Map();
  private byCategory: Map<CapabilityCategory, Set<CapabilityId>> = new Map();
  private eventHandlers: Set<CapabilityEventHandler> = new Set();

  constructor(config: Partial<CapabilityRegistryConfig> = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheTtl: config.cacheTtl ?? DEFAULT_CACHE_TTL,
      validateSchemas: config.validateSchemas ?? true,
      allowOverwrite: config.allowOverwrite ?? false,
    };
  }

  /**
   * Register a capability
   */
  async register(input: RegisterCapabilityInput): Promise<void> {
    const { capability, executor, providerId } = input;

    // Check if already registered
    if (this.capabilities.has(capability.id) && !this.config.allowOverwrite) {
      throw new Error(`Capability already registered: ${capability.id}`);
    }

    // Validate schema if enabled
    if (this.config.validateSchemas) {
      this.validateSchema(capability.inputSchema);
      this.validateSchema(capability.outputSchema);
    }

    // Create registered capability
    const registered: RegisteredCapability = {
      declaration: capability,
      executor,
      providerId,
      registeredAt: new Date(),
      executionCount: 0,
      successRate: 1,
      averageExecutionTime: 0,
    };

    // Store capability
    this.capabilities.set(capability.id, registered);

    // Index by provider
    const providerCaps = this.byProvider.get(providerId) ?? new Set();
    providerCaps.add(capability.id);
    this.byProvider.set(providerId, providerCaps);

    // Index by category
    const categoryCaps = this.byCategory.get(capability.category) ?? new Set();
    categoryCaps.add(capability.id);
    this.byCategory.set(capability.category, categoryCaps);

    // Emit event
    this.emitEvent({
      type: 'capability.registered',
      capabilityId: capability.id,
      providerId,
      data: {
        name: capability.name,
        category: capability.category,
        riskLevel: capability.riskLevel,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Unregister a capability
   */
  async unregister(capabilityId: CapabilityId, providerId: AgentId): Promise<boolean> {
    const registered = this.capabilities.get(capabilityId);

    if (!registered) {
      return false;
    }

    // Verify provider
    if (registered.providerId !== providerId) {
      throw new Error('Only the provider can unregister a capability');
    }

    // Remove from main storage
    this.capabilities.delete(capabilityId);

    // Remove from provider index
    const providerCaps = this.byProvider.get(providerId);
    if (providerCaps) {
      providerCaps.delete(capabilityId);
    }

    // Remove from category index
    const categoryCaps = this.byCategory.get(registered.declaration.category);
    if (categoryCaps) {
      categoryCaps.delete(capabilityId);
    }

    // Emit event
    this.emitEvent({
      type: 'capability.unregistered',
      capabilityId,
      providerId,
      data: {},
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get capability by ID
   */
  async get(capabilityId: CapabilityId): Promise<RegisteredCapability | undefined> {
    return this.capabilities.get(capabilityId);
  }

  /**
   * Check if capability exists
   */
  has(capabilityId: CapabilityId): boolean {
    return this.capabilities.has(capabilityId);
  }

  /**
   * Execute a capability
   */
  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const registered = this.capabilities.get(params.capabilityId);

    if (!registered) {
      return {
        success: false,
        error: `Capability not found: ${params.capabilityId}`,
        executionTime: 0,
      };
    }

    const startTime = Date.now();

    try {
      // Validate parameters
      const validation = await registered.executor.validate(params.params);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          executionTime: Date.now() - startTime,
        };
      }

      // Execute
      const result = await registered.executor.execute(params.params, params.options);

      // Update metrics
      this.updateMetrics(registered, true, Date.now() - startTime);

      // Emit event
      this.emitEvent({
        type: 'capability.executed',
        capabilityId: params.capabilityId,
        providerId: registered.providerId,
        data: {
          success: result.success,
          executionTime: result.executionTime,
        },
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(registered, false, executionTime);

      // Emit event
      this.emitEvent({
        type: 'capability.failed',
        capabilityId: params.capabilityId,
        providerId: registered.providerId,
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
        },
        timestamp: new Date(),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
      };
    }
  }

  /**
   * Estimate execution cost
   */
  async estimate(params: ExecuteParams): Promise<CostEstimate> {
    const registered = this.capabilities.get(params.capabilityId);

    if (!registered) {
      throw new Error(`Capability not found: ${params.capabilityId}`);
    }

    return registered.executor.estimate(params.params);
  }

  /**
   * Validate parameters
   */
  async validate(params: ExecuteParams): Promise<ValidationResult> {
    const registered = this.capabilities.get(params.capabilityId);

    if (!registered) {
      return {
        valid: false,
        errors: [{ path: '', message: `Capability not found: ${params.capabilityId}`, code: 'NOT_FOUND' }],
        warnings: [],
      };
    }

    return registered.executor.validate(params.params);
  }

  /**
   * Get capability status
   */
  async status(capabilityId: CapabilityId): Promise<CapabilityStatus | undefined> {
    const registered = this.capabilities.get(capabilityId);

    if (!registered) {
      return undefined;
    }

    return registered.executor.status();
  }

  /**
   * Search capabilities
   */
  async search(criteria: CapabilitySearchCriteria): Promise<CapabilitySearchResult> {
    let capabilityIds: Set<CapabilityId>;

    // Start with category filter if provided
    if (criteria.category) {
      capabilityIds = new Set(this.byCategory.get(criteria.category) ?? []);
    } else if (criteria.providerId) {
      capabilityIds = new Set(this.byProvider.get(criteria.providerId) ?? []);
    } else {
      capabilityIds = new Set(this.capabilities.keys());
    }

    // Apply additional filters
    let results: CapabilityDeclaration[] = [];

    for (const capId of capabilityIds) {
      const registered = this.capabilities.get(capId);
      if (!registered) continue;

      const cap = registered.declaration;

      // Filter by provider
      if (criteria.providerId && registered.providerId !== criteria.providerId) {
        continue;
      }

      // Filter by category (if not already filtered)
      if (criteria.category && cap.category !== criteria.category) {
        continue;
      }

      // Filter by risk level
      if (criteria.maxRiskLevel) {
        const maxIndex = RISK_LEVEL_ORDER.indexOf(criteria.maxRiskLevel);
        const capIndex = RISK_LEVEL_ORDER.indexOf(cap.riskLevel);
        if (capIndex > maxIndex) {
          continue;
        }
      }

      // Filter by query
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const matches =
          cap.name.toLowerCase().includes(query) ||
          cap.description.toLowerCase().includes(query) ||
          cap.id.toLowerCase().includes(query);
        if (!matches) {
          continue;
        }
      }

      results.push(cap);
    }

    const total = results.length;

    // Apply pagination
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return {
      capabilities: results,
      total,
      hasMore: offset + results.length < total,
    };
  }

  /**
   * Get manifest for agent
   */
  async getManifest(agentId: AgentId): Promise<CapabilityManifest> {
    const providerCaps = this.byProvider.get(agentId) ?? new Set();
    const capabilities: CapabilityDeclaration[] = [];

    for (const capId of providerCaps) {
      const registered = this.capabilities.get(capId);
      if (registered) {
        capabilities.push(registered.declaration);
      }
    }

    return {
      agentId,
      capabilities,
      protocols: [], // Would be populated based on capabilities
      version: '1.0.0',
      updatedAt: new Date(),
    };
  }

  /**
   * List all capabilities
   */
  list(): CapabilityDeclaration[] {
    return Array.from(this.capabilities.values()).map(r => r.declaration);
  }

  /**
   * Subscribe to events
   */
  subscribe(handler: CapabilityEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateSchema(schema: JSONSchemaType): void {
    if (!schema.type) {
      throw new Error('Schema must have a type');
    }
  }

  private updateMetrics(
    registered: RegisteredCapability,
    success: boolean,
    executionTime: number
  ): void {
    registered.executionCount++;
    registered.lastExecutedAt = new Date();

    // Update success rate (exponential moving average)
    const alpha = 0.1;
    registered.successRate =
      alpha * (success ? 1 : 0) + (1 - alpha) * registered.successRate;

    // Update average execution time (exponential moving average)
    registered.averageExecutionTime =
      alpha * executionTime + (1 - alpha) * registered.averageExecutionTime;
  }

  private emitEvent(event: CapabilityRegistryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in capability event handler:', error);
      }
    }
  }
}

// ============================================================================
// Capability Builder
// ============================================================================

/**
 * Build a capability with executor
 */
export function createCapability(input: CapabilityBuilderInput): RegisterCapabilityInput {
  const declaration: CapabilityDeclaration = {
    id: input.id,
    name: input.name,
    category: input.category,
    description: input.description,
    riskLevel: input.riskLevel,
    requiredPermissions: [],
    resourceRequirements: {},
    inputSchema: input.inputSchema,
    outputSchema: input.outputSchema,
    version: '1.0.0',
  };

  const executor: CapabilityExecutor = {
    execute: input.execute,
    estimate: input.estimate ?? (async () => ({
      fees: 0,
      feeCurrency: 'TON',
      estimatedTime: 1000,
      confidence: 0.8,
    })),
    validate: input.validate ?? (async () => ({
      valid: true,
      errors: [],
      warnings: [],
    })),
    status: async () => ({
      capabilityId: input.id,
      available: true,
      currentLoad: 0,
      maxConcurrent: 10,
    }),
  };

  return {
    capability: declaration,
    executor,
    providerId: '', // To be set by caller
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create capability registry
 */
export function createCapabilityRegistry(
  config?: Partial<CapabilityRegistryConfig>
): CapabilityRegistry {
  return new DefaultCapabilityRegistry(config);
}
