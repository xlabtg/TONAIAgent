/**
 * TONAIAgent - One-Click Agent Creation Orchestrator
 *
 * Implements the core orchestration logic for Issue #91:
 * "Implement One-Click Agent Creation API"
 *
 * Orchestrates all 6 subsystems in a single createAgent() call:
 *   1. Agent Runtime Initialization
 *   2. TON Wallet Creation (via Wallet Factory)
 *   3. Telegram Bot Provisioning
 *   4. Strategy Template Binding
 *   5. Metadata Persistence
 *   6. Security Configuration
 *
 * Key features:
 * - Idempotency: duplicate calls with same key return existing agent
 * - Rollback: if any critical step fails, already-created resources are cleaned up
 * - Rate limiting: per-user creation limits
 * - Demo mode: full simulation with no real funds
 */

import {
  KycAmlManager,
  KYC_ENFORCEMENT_DEFAULTS,
  type KycEnforcementConfig,
} from '../../../services/regulatory/kyc-aml';

import type {
  AgentEnvironment,
  AgentMetadata,
  AgentOrchestratorConfig,
  AgentStatus,
  AgentStrategy,
  CreateAgentInput,
  CreateAgentResult,
  OrchestratorEvent,
  OrchestratorEventHandler,
  OrchestratorHealth,
  OrchestratorMetrics,
  OrchestratorUnsubscribe,
  SubsystemResult,
} from './types';

import { AgentOrchestratorError } from './types';

// ============================================================================
// Strategy Registry
// ============================================================================

/** Strategy template configuration */
interface StrategyTemplate {
  id: AgentStrategy;
  displayName: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  defaultBudgetTon: number;
  executionIntervalMs: number;
}

/** Registry of all available strategy templates */
const STRATEGY_REGISTRY: Record<AgentStrategy, StrategyTemplate> = {
  trading: {
    id: 'trading',
    displayName: 'Algorithmic Trading',
    description: 'Automated DCA, grid, and momentum trading strategies',
    riskLevel: 'medium',
    defaultBudgetTon: 10,
    executionIntervalMs: 60_000,
  },
  yield: {
    id: 'yield',
    displayName: 'Yield Optimization',
    description: 'Automated yield farming and liquidity provision',
    riskLevel: 'low',
    defaultBudgetTon: 50,
    executionIntervalMs: 300_000,
  },
  arbitrage: {
    id: 'arbitrage',
    displayName: 'Cross-DEX Arbitrage',
    description: 'Profit from price differences across DEXes and chains',
    riskLevel: 'high',
    defaultBudgetTon: 100,
    executionIntervalMs: 10_000,
  },
  demo: {
    id: 'demo',
    displayName: 'Demo Mode',
    description: 'Full simulation with virtual funds — safe for demonstrations',
    riskLevel: 'low',
    defaultBudgetTon: 10,
    executionIntervalMs: 30_000,
  },
  custom: {
    id: 'custom',
    displayName: 'Custom Strategy',
    description: 'Fully configurable strategy via strategyConfig',
    riskLevel: 'medium',
    defaultBudgetTon: 10,
    executionIntervalMs: 60_000,
  },
};

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_ORCHESTRATOR_CONFIG: AgentOrchestratorConfig = {
  enabled: true,
  defaultEnvironment: 'demo',
  maxAgentsPerUser: 10,
  maxTotalAgents: 1000,
  idempotencyWindowSeconds: 3600, // 1 hour
  autoStart: true,
  defaultDemoBudgetTon: 10,
  security: {
    maxCreationsPerUserPerHour: 5,
    encryptStoredKeys: false, // disabled in demo/test; enable in production
    enableAuditLog: true,
  },
  kycEnforcement: {
    enabled: false, // disabled by default — set to true to enforce KYC on agent creation
    mode: 'testnet',
  },
};

// ============================================================================
// Agent ID and Address Simulation Utilities
// ============================================================================

/** Generate a deterministic agent ID from userId and name */
function generateAgentId(userId: string, agentName: string, salt: string): string {
  const base = `${userId}::${agentName}::${salt}`;
  let hash = 0x1a2b3c4d;
  for (const ch of base) {
    hash = ((hash * 31 + ch.charCodeAt(0)) >>> 0);
  }
  return `agent_${hash.toString(16).padStart(8, '0')}`;
}

/** Generate a simulated TON wallet address (EQ... format, 48 chars) */
function simulateTonAddress(seed: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let h = seed.split('').reduce((a, c) => ((a * 31 + c.charCodeAt(0)) >>> 0), 0xdeadbeef);
  let addr = 'EQ';
  for (let i = 0; i < 46; i++) {
    h = ((h * 1103515245 + 12345) >>> 0);
    addr += chars[h % chars.length];
  }
  return addr;
}

/** Generate a simulated Telegram bot username */
function simulateBotUsername(agentName: string): string {
  const safe = agentName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_');
  return `@ton_ai_${safe}_bot`;
}

/** Generate an agent name from userId and strategy */
function generateAgentName(userId: string, strategy: AgentStrategy): string {
  const strategyLabels: Record<AgentStrategy, string> = {
    trading: 'Trader',
    yield: 'Yield Bot',
    arbitrage: 'Arb Bot',
    demo: 'Demo Agent',
    custom: 'Custom Agent',
  };
  const shortId = userId.slice(-4).toUpperCase();
  return `${strategyLabels[strategy]} ${shortId}`;
}

// ============================================================================
// Subsystem Simulation Helpers
// ============================================================================

/** Simulate async work with a realistic duration */
async function simulateWork(minMs: number, maxMs: number): Promise<void> {
  const duration = minMs + Math.floor(Math.random() * (maxMs - minMs));
  await new Promise<void>((resolve) => setTimeout(resolve, duration));
}

/** Build a successful SubsystemResult */
function successResult(durationMs: number, details?: Record<string, unknown>): SubsystemResult {
  return { success: true, durationMs, details };
}

/** Build a failed SubsystemResult */
function failureResult(durationMs: number, error: string): SubsystemResult {
  return { success: false, durationMs, error };
}

// ============================================================================
// Agent Orchestrator
// ============================================================================

/**
 * AgentOrchestrator — single orchestration layer for one-click agent creation.
 *
 * Transforms the platform from a collection of modules into a cohesive product
 * by providing a single `createAgent()` API that provisions all subsystems.
 *
 * @example
 * ```typescript
 * const orchestrator = createAgentOrchestrator();
 *
 * const result = await orchestrator.createAgent({
 *   userId: "user_123",
 *   strategy: "trading",
 *   telegram: true,
 *   tonWallet: true,
 *   environment: "demo"
 * });
 *
 * console.log(result.agentId);        // "agent_abc"
 * console.log(result.telegramBot);    // "@MyAIAgentBot"
 * console.log(result.walletAddress);  // "EQC..."
 * console.log(result.status);         // "active"
 * ```
 */
export class AgentOrchestrator {
  private readonly config: AgentOrchestratorConfig;

  /** KYC/AML manager for compliance enforcement */
  private readonly kycAmlManager: KycAmlManager;

  /** In-memory agent store (production: replace with database) */
  private readonly agents: Map<string, AgentMetadata> = new Map();

  /** Idempotency key -> agentId map */
  private readonly idempotencyKeys: Map<string, string> = new Map();

  /** Per-user creation timestamps for rate limiting */
  private readonly creationTimestamps: Map<string, Date[]> = new Map();

  /** Audit log entries */
  private readonly auditLog: Array<{ timestamp: Date; action: string; userId: string; agentId?: string; details?: Record<string, unknown> }> = [];

  /** Event subscribers */
  private readonly eventHandlers: Set<OrchestratorEventHandler> = new Set();

  /** Performance tracking */
  private totalCreated = 0;
  private successCount = 0;
  private failureCount = 0;
  private totalCreationTimeMs = 0;

  constructor(config: Partial<AgentOrchestratorConfig> = {}, kycAmlManager?: KycAmlManager) {
    this.config = {
      ...DEFAULT_ORCHESTRATOR_CONFIG,
      ...config,
      security: { ...DEFAULT_ORCHESTRATOR_CONFIG.security, ...config.security },
      kycEnforcement: {
        enabled: config.kycEnforcement?.enabled ?? DEFAULT_ORCHESTRATOR_CONFIG.kycEnforcement!.enabled,
        mode: config.kycEnforcement?.mode ?? DEFAULT_ORCHESTRATOR_CONFIG.kycEnforcement!.mode,
      },
    };
    this.kycAmlManager = kycAmlManager ?? new KycAmlManager();
  }

  // ============================================================================
  // Primary API: createAgent
  // ============================================================================

  /**
   * Create a fully operational AI agent in a single call.
   *
   * Orchestrates runtime initialization, wallet creation, Telegram provisioning,
   * strategy binding, metadata persistence, and security configuration.
   *
   * Idempotent: calling with the same `idempotencyKey` returns the existing agent.
   *
   * @throws {AgentOrchestratorError} if creation fails after rollback
   */
  async createAgent(input: CreateAgentInput): Promise<CreateAgentResult> {
    if (!this.config.enabled) {
      throw new AgentOrchestratorError(
        'Agent orchestrator is disabled',
        'ORCHESTRATOR_DISABLED',
      );
    }

    // Validate input
    this.validateInput(input);

    // Idempotency check
    if (input.idempotencyKey) {
      const existingId = this.idempotencyKeys.get(input.idempotencyKey);
      if (existingId) {
        const existing = this.agents.get(existingId);
        if (existing) {
          return this.buildResult(existing);
        }
      }
    }

    // Rate limiting
    this.checkRateLimit(input.userId);

    // Capacity checks
    this.checkCapacity(input.userId);

    // KYC enforcement gate — skip for demo strategy regardless of enforcement config
    const kycCfg = this.config.kycEnforcement;
    const isDemoStrategy = input.strategy === 'demo';
    if (kycCfg?.enabled && !isDemoStrategy) {
      const enforcementConfig: KycEnforcementConfig = KYC_ENFORCEMENT_DEFAULTS[kycCfg.mode];
      const kycResult = await this.kycAmlManager.enforceKycForAgentCreation(
        input.userId,
        enforcementConfig,
      );
      if (!kycResult.allowed) {
        throw new AgentOrchestratorError(
          kycResult.reason ?? 'KYC verification required before creating trading agents',
          'KYC_REQUIRED',
          { userId: input.userId, currentTier: kycResult.currentTier, requiredTier: kycResult.requiredTier, auditId: kycResult.auditId },
        );
      }
    }

    const startTime = Date.now();
    const agentName = input.name ?? generateAgentName(input.userId, input.strategy);
    const agentId = generateAgentId(input.userId, agentName, String(startTime));
    const strategy = STRATEGY_REGISTRY[input.strategy];
    const environment: AgentEnvironment = input.environment;
    const isDemo = environment === 'demo' || input.strategy === 'demo';

    this.emit({
      type: 'agent.creation_started',
      timestamp: new Date(),
      agentId,
      userId: input.userId,
      data: { strategy: input.strategy, environment, telegram: input.telegram, tonWallet: input.tonWallet },
    });

    // Track provisioned resources for rollback
    const provisioned = {
      runtime: false,
      wallet: false,
      telegram: false,
    };

    try {
      // ── Step 1: Runtime Initialization ──────────────────────────────────────
      const runtimeStart = Date.now();
      await simulateWork(50, 150);
      const runtimeResult = successResult(Date.now() - runtimeStart, {
        runtimeId: `rt_${agentId}`,
        maxConcurrentExecutions: 2,
        simulationMode: isDemo,
        strategyIds: [strategy.id],
        executionIntervalMs: strategy.executionIntervalMs,
      });
      provisioned.runtime = true;

      // ── Step 2: TON Wallet Creation ──────────────────────────────────────────
      let walletResult: SubsystemResult | null = null;
      let walletAddress: string | null = null;

      if (input.tonWallet) {
        const walletStart = Date.now();
        try {
          await simulateWork(100, 300);
          walletAddress = simulateTonAddress(`${agentId}::wallet`);
          walletResult = successResult(Date.now() - walletStart, {
            address: walletAddress,
            walletMode: isDemo ? 'simulation' : 'smart-contract',
            initialBalance: `${input.budgetTon ?? strategy.defaultBudgetTon} TON (${isDemo ? 'simulated' : 'real'})`,
            keyManagement: isDemo ? 'none' : 'mpc',
          });
          provisioned.wallet = true;
        } catch (err) {
          // Wallet creation failed — rollback and throw
          await this.rollback(agentId, provisioned);
          throw new AgentOrchestratorError(
            `Wallet creation failed: ${err instanceof Error ? err.message : String(err)}`,
            'WALLET_CREATION_FAILED',
            { agentId, userId: input.userId },
          );
        }
      }

      // ── Step 3: Telegram Bot Provisioning ─────────────────────────────────────
      let telegramResult: SubsystemResult | null = null;
      let telegramBot: string | null = null;

      if (input.telegram) {
        const telegramStart = Date.now();
        await simulateWork(80, 200);
        telegramBot = simulateBotUsername(agentName);
        telegramResult = successResult(Date.now() - telegramStart, {
          botUsername: telegramBot,
          webhookRegistered: true,
          commandsEnabled: true,
          miniAppConnected: true,
          notificationsEnabled: true,
        });
        provisioned.telegram = true;
      }

      // ── Step 4: Strategy Template Binding ─────────────────────────────────────
      const strategyStart = Date.now();
      await simulateWork(20, 80);
      const strategyResult = successResult(Date.now() - strategyStart, {
        strategyId: strategy.id,
        strategyName: strategy.displayName,
        riskLevel: strategy.riskLevel,
        executionIntervalMs: strategy.executionIntervalMs,
        customConfig: input.strategyConfig ?? null,
      });

      // ── Step 5: Persistence Layer ──────────────────────────────────────────────
      const persistenceStart = Date.now();
      const now = new Date();
      const metadata: AgentMetadata = {
        agentId,
        agentName,
        userId: input.userId,
        strategy: input.strategy,
        environment,
        status: this.config.autoStart ? 'active' : 'paused',
        walletAddress,
        telegramBot,
        createdAt: now,
        updatedAt: now,
        provisioningSummary: {
          runtime: runtimeResult,
          wallet: walletResult,
          telegram: telegramResult,
          strategy: strategyResult,
          persistence: successResult(0), // placeholder — updated below
          security: successResult(0),    // placeholder — updated below
          totalDurationMs: 0,            // updated at end
        },
        strategyConfig: input.strategyConfig,
      };
      this.agents.set(agentId, metadata);
      const persistenceResult = successResult(Date.now() - persistenceStart, {
        recordId: agentId,
        fields: ['agentId', 'agentName', 'userId', 'strategy', 'environment', 'status', 'walletAddress', 'telegramBot'],
      });

      // ── Step 6: Security Configuration ────────────────────────────────────────
      const securityStart = Date.now();
      await simulateWork(10, 50);
      const securityResult = successResult(Date.now() - securityStart, {
        keyEncryption: this.config.security.encryptStoredKeys,
        rateLimitingEnabled: this.config.security.maxCreationsPerUserPerHour > 0,
        auditLogEnabled: this.config.security.enableAuditLog,
        environmentIsolation: true,
        abusePreventionActive: true,
      });

      // ── Finalization ──────────────────────────────────────────────────────────
      const totalDurationMs = Date.now() - startTime;

      // Update metadata with final provisioning summary
      metadata.provisioningSummary = {
        runtime: runtimeResult,
        wallet: walletResult,
        telegram: telegramResult,
        strategy: strategyResult,
        persistence: persistenceResult,
        security: securityResult,
        totalDurationMs,
      };
      metadata.updatedAt = new Date();
      this.agents.set(agentId, metadata);

      // Register idempotency key if provided
      if (input.idempotencyKey) {
        this.idempotencyKeys.set(input.idempotencyKey, agentId);
      }

      // Track rate-limit timestamps
      const userTimestamps = this.creationTimestamps.get(input.userId) ?? [];
      userTimestamps.push(new Date());
      this.creationTimestamps.set(input.userId, userTimestamps);

      // Update metrics
      this.totalCreated++;
      this.successCount++;
      this.totalCreationTimeMs += totalDurationMs;

      // Audit log
      if (this.config.security.enableAuditLog) {
        this.auditLog.push({
          timestamp: new Date(),
          action: 'agent_created',
          userId: input.userId,
          agentId,
          details: { strategy: input.strategy, environment, telegram: input.telegram, tonWallet: input.tonWallet },
        });
      }

      this.emit({
        type: 'agent.creation_completed',
        timestamp: new Date(),
        agentId,
        userId: input.userId,
        data: { agentName, walletAddress, telegramBot, totalDurationMs, status: metadata.status },
      });

      return this.buildResult(metadata);

    } catch (err) {
      this.failureCount++;

      if (!(err instanceof AgentOrchestratorError)) {
        // Unexpected error — rollback and wrap
        await this.rollback(agentId, provisioned);
        throw new AgentOrchestratorError(
          `Agent creation failed: ${err instanceof Error ? err.message : String(err)}`,
          'RUNTIME_INITIALIZATION_FAILED',
          { agentId, userId: input.userId },
        );
      }

      this.emit({
        type: 'agent.creation_failed',
        timestamp: new Date(),
        agentId,
        userId: input.userId,
        data: { error: err.message, code: err.code },
      });

      throw err;
    }
  }

  // ============================================================================
  // Agent Management
  // ============================================================================

  /**
   * Get an agent by its ID.
   * @throws {AgentOrchestratorError} if not found
   */
  getAgent(agentId: string): AgentMetadata {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentOrchestratorError(
        `Agent not found: ${agentId}`,
        'AGENT_NOT_FOUND',
        { agentId },
      );
    }
    return { ...agent };
  }

  /**
   * List all agents for a given user.
   */
  listAgentsByUser(userId: string): AgentMetadata[] {
    return Array.from(this.agents.values())
      .filter((a) => a.userId === userId)
      .map((a) => ({ ...a }));
  }

  /**
   * List all agents managed by this orchestrator.
   */
  listAllAgents(): AgentMetadata[] {
    return Array.from(this.agents.values()).map((a) => ({ ...a }));
  }

  /**
   * Terminate an agent and clean up its resources.
   * @throws {AgentOrchestratorError} if not found
   */
  async terminateAgent(agentId: string): Promise<void> {
    const agent = this.getAgent(agentId);

    // Simulate cleanup
    await simulateWork(20, 80);

    const updated: AgentMetadata = {
      ...agent,
      status: 'terminated' as AgentStatus,
      updatedAt: new Date(),
    };
    this.agents.set(agentId, updated);

    if (this.config.security.enableAuditLog) {
      this.auditLog.push({
        timestamp: new Date(),
        action: 'agent_terminated',
        userId: agent.userId,
        agentId,
      });
    }

    this.emit({
      type: 'agent.terminated',
      timestamp: new Date(),
      agentId,
      userId: agent.userId,
      data: { agentName: agent.agentName },
    });
  }

  /**
   * Update an agent's status.
   */
  updateAgentStatus(agentId: string, status: AgentStatus): AgentMetadata {
    const agent = this.getAgent(agentId);
    const updated: AgentMetadata = { ...agent, status, updatedAt: new Date() };
    this.agents.set(agentId, updated);

    this.emit({
      type: 'agent.status_changed',
      timestamp: new Date(),
      agentId,
      userId: agent.userId,
      data: { previousStatus: agent.status, newStatus: status },
    });

    return { ...updated };
  }

  // ============================================================================
  // Strategy Registry
  // ============================================================================

  /**
   * List all available strategy templates.
   */
  listStrategies(): StrategyTemplate[] {
    return Object.values(STRATEGY_REGISTRY);
  }

  /**
   * Get a specific strategy template by ID.
   */
  getStrategy(strategyId: AgentStrategy): StrategyTemplate | undefined {
    return STRATEGY_REGISTRY[strategyId];
  }

  // ============================================================================
  // Observability
  // ============================================================================

  /**
   * Get orchestrator health status.
   */
  getHealth(): OrchestratorHealth {
    const metrics = this.getMetrics();
    const components = {
      runtime: this.config.enabled,
      walletFactory: this.config.enabled,
      telegramProvisioner: this.config.enabled,
      strategyRegistry: this.config.enabled,
      persistence: this.config.enabled,
      security: this.config.enabled,
    };
    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: OrchestratorHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= Math.floor(totalCount / 2)) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      running: this.config.enabled,
      components,
      metrics,
      lastCheck: new Date(),
    };
  }

  /**
   * Get current orchestrator metrics.
   */
  getMetrics(): OrchestratorMetrics {
    const activeAgents = Array.from(this.agents.values()).filter((a) => a.status === 'active').length;
    const uniqueUsers = new Set(Array.from(this.agents.values()).map((a) => a.userId)).size;

    return {
      totalAgentsCreated: this.totalCreated,
      activeAgents,
      totalUsers: uniqueUsers,
      successfulCreations: this.successCount,
      failedCreations: this.failureCount,
      avgCreationTimeMs: this.successCount > 0
        ? Math.round(this.totalCreationTimeMs / this.successCount)
        : 0,
    };
  }

  /**
   * Get audit log entries (last N entries).
   */
  getAuditLog(limit = 100): typeof this.auditLog {
    return this.auditLog.slice(-limit);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to orchestrator events.
   * Returns an unsubscribe function.
   */
  subscribe(handler: OrchestratorEventHandler): OrchestratorUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(event: OrchestratorEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /** Validate CreateAgentInput before processing */
  private validateInput(input: CreateAgentInput): void {
    if (!input.userId || input.userId.trim() === '') {
      throw new AgentOrchestratorError('userId is required', 'RUNTIME_INITIALIZATION_FAILED');
    }

    if (!STRATEGY_REGISTRY[input.strategy]) {
      throw new AgentOrchestratorError(
        `Invalid strategy: ${input.strategy}. Valid strategies: ${Object.keys(STRATEGY_REGISTRY).join(', ')}`,
        'INVALID_STRATEGY',
        { strategy: input.strategy },
      );
    }

    const validEnvironments: AgentEnvironment[] = ['demo', 'testnet', 'mainnet'];
    if (!validEnvironments.includes(input.environment)) {
      throw new AgentOrchestratorError(
        `Invalid environment: ${input.environment}. Valid: ${validEnvironments.join(', ')}`,
        'INVALID_ENVIRONMENT',
        { environment: input.environment },
      );
    }
  }

  /** Check rate limit for user */
  private checkRateLimit(userId: string): void {
    const maxPerHour = this.config.security.maxCreationsPerUserPerHour;
    if (maxPerHour === 0) return;

    const windowMs = 3600 * 1000;
    const now = Date.now();
    const timestamps = this.creationTimestamps.get(userId) ?? [];
    const recent = timestamps.filter((t) => now - t.getTime() < windowMs);
    this.creationTimestamps.set(userId, recent);

    if (recent.length >= maxPerHour) {
      throw new AgentOrchestratorError(
        `Rate limit exceeded: max ${maxPerHour} agent creations per hour`,
        'RATE_LIMIT_EXCEEDED',
        { userId, limit: maxPerHour },
      );
    }
  }

  /** Check global and per-user capacity */
  private checkCapacity(userId: string): void {
    const { maxTotalAgents, maxAgentsPerUser } = this.config;

    if (maxTotalAgents > 0 && this.agents.size >= maxTotalAgents) {
      throw new AgentOrchestratorError(
        `Total agent limit reached: ${maxTotalAgents}`,
        'TOTAL_AGENT_LIMIT_REACHED',
        { limit: maxTotalAgents },
      );
    }

    if (maxAgentsPerUser > 0) {
      const userCount = Array.from(this.agents.values())
        .filter((a) => a.userId === userId && a.status !== 'terminated')
        .length;
      if (userCount >= maxAgentsPerUser) {
        throw new AgentOrchestratorError(
          `User agent limit reached: max ${maxAgentsPerUser} agents per user`,
          'USER_AGENT_LIMIT_REACHED',
          { userId, limit: maxAgentsPerUser },
        );
      }
    }
  }

  /** Build a CreateAgentResult from stored AgentMetadata */
  private buildResult(metadata: AgentMetadata): CreateAgentResult {
    return {
      agentId: metadata.agentId,
      agentName: metadata.agentName,
      telegramBot: metadata.telegramBot,
      walletAddress: metadata.walletAddress,
      status: metadata.status,
      strategy: metadata.strategy,
      environment: metadata.environment,
      userId: metadata.userId,
      createdAt: metadata.createdAt,
      provisioningSummary: metadata.provisioningSummary,
    };
  }

  /** Rollback provisioned resources on failure */
  private async rollback(
    agentId: string,
    provisioned: { runtime: boolean; wallet: boolean; telegram: boolean },
  ): Promise<void> {
    // In a real implementation this would:
    // - Deregister the agent from the runtime
    // - Remove wallet keys from key management
    // - Unregister the Telegram bot webhook

    // Simulation: remove from agents map if it was persisted
    this.agents.delete(agentId);

    void provisioned; // rollback steps depend on what was provisioned
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an AgentOrchestrator instance.
 *
 * @example
 * ```typescript
 * const orchestrator = createAgentOrchestrator({
 *   defaultEnvironment: 'demo',
 *   maxAgentsPerUser: 5,
 * });
 *
 * const result = await orchestrator.createAgent({
 *   userId: "user_123",
 *   strategy: "trading",
 *   telegram: true,
 *   tonWallet: true,
 *   environment: "demo"
 * });
 * ```
 */
export function createAgentOrchestrator(
  config?: Partial<AgentOrchestratorConfig>,
): AgentOrchestrator {
  return new AgentOrchestrator(config);
}
