/**
 * TONAIAgent - Strategy Lifecycle Management
 *
 * Manages the complete lifecycle of strategies from draft to deployment.
 * Includes versioning, collaboration, and observability features.
 */

import {
  Strategy,
  StrategyStatus,
  StrategyVersion,
  StrategyEvent,
  StrategyEventCallback,
  SharingSettings,
  AccessLevel,
  Workspace,
  WorkspaceMember,
  LiveMetrics,
  TradeInfo,
  RiskAlert,
  AgentStatus,
  ValidationResult,
} from './types';
import { validateStrategy } from './validation';

// ============================================================================
// Lifecycle Manager
// ============================================================================

export interface LifecycleManagerConfig {
  /** Enable auto-save */
  autoSave?: boolean;
  /** Auto-save interval (ms) */
  autoSaveInterval?: number;
  /** Maximum versions to keep */
  maxVersions?: number;
  /** Enable collaboration features */
  enableCollaboration?: boolean;
  /** Enable real-time sync */
  enableRealTimeSync?: boolean;
}

const DEFAULT_LIFECYCLE_CONFIG: LifecycleManagerConfig = {
  autoSave: true,
  autoSaveInterval: 30000,
  maxVersions: 50,
  enableCollaboration: true,
  enableRealTimeSync: true,
};

/**
 * Manages strategy lifecycle from creation to deployment
 */
export class StrategyLifecycleManager {
  private readonly config: LifecycleManagerConfig;
  private readonly strategies: Map<string, Strategy> = new Map();
  private readonly eventCallbacks: StrategyEventCallback[] = [];
  private readonly autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<LifecycleManagerConfig> = {}) {
    this.config = { ...DEFAULT_LIFECYCLE_CONFIG, ...config };
  }

  // ============================================================================
  // Strategy CRUD Operations
  // ============================================================================

  /**
   * Create a new strategy
   */
  create(
    name: string,
    category: Strategy['category'],
    author: { id: string; name?: string }
  ): Strategy {
    const strategy: Strategy = {
      id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: '',
      category,
      version: '1.0.0',
      author,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      blocks: [],
      connections: [],
      config: this.getDefaultConfig(),
      riskParams: this.getDefaultRiskParams(),
      tags: [],
      isPublic: false,
      versionHistory: [],
    };

    this.strategies.set(strategy.id, strategy);
    this.emitEvent({ type: 'strategy_created', strategyId: strategy.id, timestamp: new Date() });

    if (this.config.autoSave) {
      this.startAutoSave(strategy.id);
    }

    return strategy;
  }

  /**
   * Get a strategy by ID
   */
  get(strategyId: string): Strategy | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Update a strategy
   */
  update(strategyId: string, updates: Partial<Strategy>): Strategy | undefined {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return undefined;

    // Track changes
    const changes: string[] = [];
    if (updates.name && updates.name !== strategy.name) changes.push('name');
    if (updates.blocks) changes.push('blocks');
    if (updates.connections) changes.push('connections');
    if (updates.config) changes.push('config');
    if (updates.riskParams) changes.push('riskParams');

    // Apply updates
    Object.assign(strategy, {
      ...updates,
      updatedAt: new Date(),
    });

    this.strategies.set(strategyId, strategy);

    if (changes.length > 0) {
      this.emitEvent({
        type: 'strategy_updated',
        strategyId,
        changes,
        timestamp: new Date(),
      });
    }

    return strategy;
  }

  /**
   * Delete a strategy
   */
  delete(strategyId: string): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    // Stop auto-save
    this.stopAutoSave(strategyId);

    // Archive instead of delete
    strategy.status = 'archived';
    strategy.updatedAt = new Date();

    this.emitEvent({
      type: 'status_changed',
      strategyId,
      previousStatus: strategy.status,
      newStatus: 'archived',
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * List all strategies
   */
  list(filter?: StrategyFilter): Strategy[] {
    let strategies = Array.from(this.strategies.values());

    if (filter) {
      if (filter.status) {
        strategies = strategies.filter((s) => s.status === filter.status);
      }
      if (filter.category) {
        strategies = strategies.filter((s) => s.category === filter.category);
      }
      if (filter.authorId) {
        strategies = strategies.filter((s) => s.author.id === filter.authorId);
      }
      if (filter.isPublic !== undefined) {
        strategies = strategies.filter((s) => s.isPublic === filter.isPublic);
      }
      if (filter.tags && filter.tags.length > 0) {
        strategies = strategies.filter((s) =>
          filter.tags!.some((tag) => s.tags.includes(tag))
        );
      }
    }

    return strategies;
  }

  // ============================================================================
  // Lifecycle Status Management
  // ============================================================================

  /**
   * Transition strategy to a new status
   */
  async transitionStatus(
    strategyId: string,
    newStatus: StrategyStatus,
    reason?: string
  ): Promise<TransitionResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }

    const previousStatus = strategy.status;

    // Validate transition
    const validTransition = this.isValidTransition(previousStatus, newStatus);
    if (!validTransition) {
      return {
        success: false,
        error: `Invalid transition from ${previousStatus} to ${newStatus}`,
      };
    }

    // Perform pre-transition checks
    if (newStatus === 'active') {
      const validation = validateStrategy(strategy);
      if (!validation.valid) {
        return {
          success: false,
          error: 'Strategy validation failed',
          validationResult: validation,
        };
      }
    }

    // Update status
    strategy.status = newStatus;
    strategy.updatedAt = new Date();

    this.emitEvent({
      type: 'status_changed',
      strategyId,
      previousStatus,
      newStatus,
      reason,
      timestamp: new Date(),
    });

    return { success: true, previousStatus, newStatus };
  }

  /**
   * Validate a strategy and optionally prepare for deployment
   */
  async validate(strategyId: string): Promise<ValidationResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return {
        valid: false,
        errors: [{ code: 'invalid_config', message: 'Strategy not found', severity: 'error' }],
        warnings: [],
        riskScore: 0,
        estimatedGas: 0,
        securityChecks: [],
      };
    }

    return validateStrategy(strategy);
  }

  /**
   * Deploy a strategy
   */
  async deploy(strategyId: string): Promise<DeploymentResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }

    // Validate first
    const validation = await this.validate(strategyId);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        validationResult: validation,
      };
    }

    // Check if testing was done
    if (strategy.status === 'draft') {
      return {
        success: false,
        error: 'Strategy must be tested before deployment',
      };
    }

    // Transition to active
    const result = await this.transitionStatus(strategyId, 'active', 'Deployed');

    if (result.success) {
      // Save version snapshot
      this.saveVersion(strategyId, 'Deployed to production');

      return {
        success: true,
        deploymentId: `deploy_${Date.now()}`,
        timestamp: new Date(),
      };
    }

    return { success: false, error: result.error };
  }

  /**
   * Pause a running strategy
   */
  async pause(strategyId: string, reason?: string): Promise<TransitionResult> {
    return this.transitionStatus(strategyId, 'paused', reason || 'Manually paused');
  }

  /**
   * Resume a paused strategy
   */
  async resume(strategyId: string): Promise<TransitionResult> {
    return this.transitionStatus(strategyId, 'active', 'Resumed');
  }

  /**
   * Stop a strategy
   */
  async stop(strategyId: string, reason?: string): Promise<TransitionResult> {
    return this.transitionStatus(strategyId, 'stopped', reason || 'Manually stopped');
  }

  // ============================================================================
  // Version Management
  // ============================================================================

  /**
   * Save a new version
   */
  saveVersion(strategyId: string, changes: string): StrategyVersion | undefined {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return undefined;

    // Increment version
    const [major, minor, patch] = strategy.version.split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    const version: StrategyVersion = {
      version: newVersion,
      createdAt: new Date(),
      changes,
      blocks: JSON.parse(JSON.stringify(strategy.blocks)),
      connections: JSON.parse(JSON.stringify(strategy.connections)),
      hash: this.generateHash(strategy),
    };

    strategy.versionHistory.push(version);
    strategy.version = newVersion;
    strategy.updatedAt = new Date();

    // Trim old versions if needed
    if (strategy.versionHistory.length > this.config.maxVersions!) {
      strategy.versionHistory = strategy.versionHistory.slice(-this.config.maxVersions!);
    }

    return version;
  }

  /**
   * Rollback to a previous version
   */
  rollback(strategyId: string, targetVersion: string): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    const version = strategy.versionHistory.find((v) => v.version === targetVersion);
    if (!version) return false;

    // Save current state first
    this.saveVersion(strategyId, `Pre-rollback to ${targetVersion}`);

    // Restore version
    strategy.blocks = JSON.parse(JSON.stringify(version.blocks));
    strategy.connections = JSON.parse(JSON.stringify(version.connections));
    strategy.updatedAt = new Date();

    // Save rollback as new version
    this.saveVersion(strategyId, `Rolled back to ${targetVersion}`);

    return true;
  }

  /**
   * Compare two versions
   */
  compareVersions(
    strategyId: string,
    versionA: string,
    versionB: string
  ): VersionComparison | undefined {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return undefined;

    const a = strategy.versionHistory.find((v) => v.version === versionA);
    const b = strategy.versionHistory.find((v) => v.version === versionB);

    if (!a || !b) return undefined;

    const addedBlocks = b.blocks.filter(
      (block) => !a.blocks.some((ab) => ab.id === block.id)
    );
    const removedBlocks = a.blocks.filter(
      (block) => !b.blocks.some((bb) => bb.id === block.id)
    );
    const modifiedBlocks = b.blocks.filter((block) => {
      const original = a.blocks.find((ab) => ab.id === block.id);
      if (!original) return false;
      return JSON.stringify(block.config) !== JSON.stringify(original.config);
    });

    const addedConnections = b.connections.filter(
      (conn) => !a.connections.some((ac) => ac.id === conn.id)
    );
    const removedConnections = a.connections.filter(
      (conn) => !b.connections.some((bc) => bc.id === conn.id)
    );

    return {
      versionA,
      versionB,
      addedBlocks: addedBlocks.length,
      removedBlocks: removedBlocks.length,
      modifiedBlocks: modifiedBlocks.length,
      addedConnections: addedConnections.length,
      removedConnections: removedConnections.length,
      summary: this.generateComparisonSummary(
        addedBlocks.length,
        removedBlocks.length,
        modifiedBlocks.length,
        addedConnections.length,
        removedConnections.length
      ),
    };
  }

  /**
   * Get version history
   */
  getVersionHistory(strategyId: string): StrategyVersion[] {
    const strategy = this.strategies.get(strategyId);
    return strategy?.versionHistory ?? [];
  }

  // ============================================================================
  // Collaboration & Sharing
  // ============================================================================

  /**
   * Share a strategy with another user
   */
  share(
    strategyId: string,
    userId: string,
    accessLevel: AccessLevel
  ): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    // Initialize sharing settings if needed
    if (!strategy.metadata) {
      strategy.metadata = {};
    }
    if (!strategy.metadata.sharing) {
      strategy.metadata.sharing = {
        isPublic: false,
        allowFork: true,
        allowCopy: true,
        sharedWith: [],
        accessLevel: 'view',
      } as SharingSettings;
    }

    const sharing = strategy.metadata.sharing as SharingSettings;

    // Check if already shared
    const existingIndex = sharing.sharedWith.findIndex((s) => s.userId === userId);
    if (existingIndex >= 0) {
      sharing.sharedWith[existingIndex].accessLevel = accessLevel;
    } else {
      sharing.sharedWith.push({
        userId,
        accessLevel,
        sharedAt: new Date(),
      });
    }

    strategy.updatedAt = new Date();
    return true;
  }

  /**
   * Revoke sharing
   */
  revokeShare(strategyId: string, userId: string): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy || !strategy.metadata?.sharing) return false;

    const sharing = strategy.metadata.sharing as SharingSettings;
    sharing.sharedWith = sharing.sharedWith.filter((s) => s.userId !== userId);

    strategy.updatedAt = new Date();
    return true;
  }

  /**
   * Fork a strategy
   */
  fork(strategyId: string, newAuthor: { id: string; name?: string }): Strategy | undefined {
    const original = this.strategies.get(strategyId);
    if (!original) return undefined;

    // Check if forking is allowed
    if (original.metadata?.sharing) {
      const sharing = original.metadata.sharing as SharingSettings;
      if (!sharing.allowFork && original.author.id !== newAuthor.id) {
        return undefined;
      }
    }

    const forked = this.create(
      `${original.name} (Fork)`,
      original.category,
      newAuthor
    );

    // Copy content
    forked.description = original.description;
    forked.blocks = JSON.parse(JSON.stringify(original.blocks));
    forked.connections = JSON.parse(JSON.stringify(original.connections));
    forked.config = JSON.parse(JSON.stringify(original.config));
    forked.riskParams = JSON.parse(JSON.stringify(original.riskParams));
    forked.tags = [...original.tags];
    forked.forkedFrom = original.id;

    this.strategies.set(forked.id, forked);

    return forked;
  }

  /**
   * Make strategy public
   */
  setPublic(strategyId: string, isPublic: boolean): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    strategy.isPublic = isPublic;
    strategy.updatedAt = new Date();

    return true;
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Subscribe to strategy events
   */
  onEvent(callback: StrategyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index >= 0) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isValidTransition(from: StrategyStatus, to: StrategyStatus): boolean {
    const transitions: Record<StrategyStatus, StrategyStatus[]> = {
      draft: ['testing', 'archived'],
      testing: ['draft', 'pending', 'archived'],
      pending: ['testing', 'active', 'archived'],
      active: ['paused', 'stopped', 'error'],
      paused: ['active', 'stopped'],
      stopped: ['draft', 'archived'],
      error: ['draft', 'stopped', 'archived'],
      archived: ['draft'],
    };

    return transitions[from]?.includes(to) ?? false;
  }

  private emitEvent(event: StrategyEvent): void {
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    });
  }

  private startAutoSave(strategyId: string): void {
    if (this.autoSaveTimers.has(strategyId)) return;

    const timer = setInterval(() => {
      const strategy = this.strategies.get(strategyId);
      if (strategy && strategy.status === 'draft') {
        this.saveVersion(strategyId, 'Auto-save');
      }
    }, this.config.autoSaveInterval!);

    this.autoSaveTimers.set(strategyId, timer);
  }

  private stopAutoSave(strategyId: string): void {
    const timer = this.autoSaveTimers.get(strategyId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(strategyId);
    }
  }

  private generateHash(strategy: Strategy): string {
    const content = JSON.stringify({
      blocks: strategy.blocks,
      connections: strategy.connections,
    });
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private generateComparisonSummary(
    added: number,
    removed: number,
    modified: number,
    addedConns: number,
    removedConns: number
  ): string {
    const parts: string[] = [];
    if (added > 0) parts.push(`+${added} blocks`);
    if (removed > 0) parts.push(`-${removed} blocks`);
    if (modified > 0) parts.push(`${modified} modified`);
    if (addedConns > 0) parts.push(`+${addedConns} connections`);
    if (removedConns > 0) parts.push(`-${removedConns} connections`);
    return parts.join(', ') || 'No changes';
  }

  private getDefaultConfig(): Strategy['config'] {
    return {
      maxGasPerExecution: 1,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: {
        onExecution: true,
        onError: true,
        onProfitTarget: true,
        onLossLimit: true,
        channels: ['telegram'],
      },
      tokenWhitelist: ['TON', 'USDT', 'USDC'],
      protocolWhitelist: ['dedust', 'stonfi'],
    };
  }

  private getDefaultRiskParams(): Strategy['riskParams'] {
    return {
      maxPositionSize: 30,
      maxDailyLoss: 5,
      maxDrawdown: 15,
      stopLossPercent: 5,
      takeProfitPercent: 10,
      maxSlippage: 2,
      maxTradesPerDay: 20,
      cooldownSeconds: 300,
    };
  }
}

// ============================================================================
// Workspace Manager
// ============================================================================

/**
 * Manages team workspaces for collaborative strategy development
 */
export class WorkspaceManager {
  private readonly workspaces: Map<string, Workspace> = new Map();

  /**
   * Create a new workspace
   */
  create(name: string, owner: string): Workspace {
    const workspace: Workspace = {
      id: `workspace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      owner,
      members: [
        {
          userId: owner,
          role: 'owner',
          joinedAt: new Date(),
        },
      ],
      strategies: [],
      createdAt: new Date(),
    };

    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  /**
   * Get a workspace
   */
  get(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  /**
   * Add a member to workspace
   */
  addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceMember['role']
  ): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    if (workspace.members.some((m) => m.userId === userId)) return false;

    workspace.members.push({
      userId,
      role,
      joinedAt: new Date(),
    });

    return true;
  }

  /**
   * Remove a member from workspace
   */
  removeMember(workspaceId: string, userId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    // Cannot remove owner
    if (workspace.owner === userId) return false;

    workspace.members = workspace.members.filter((m) => m.userId !== userId);
    return true;
  }

  /**
   * Add a strategy to workspace
   */
  addStrategy(workspaceId: string, strategyId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    if (!workspace.strategies.includes(strategyId)) {
      workspace.strategies.push(strategyId);
    }

    return true;
  }

  /**
   * Remove a strategy from workspace
   */
  removeStrategy(workspaceId: string, strategyId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    workspace.strategies = workspace.strategies.filter((s) => s !== strategyId);
    return true;
  }

  /**
   * Get workspaces for a user
   */
  getForUser(userId: string): Workspace[] {
    return Array.from(this.workspaces.values()).filter((w) =>
      w.members.some((m) => m.userId === userId)
    );
  }
}

// ============================================================================
// Observability Manager
// ============================================================================

/**
 * Real-time metrics and observability for running strategies
 */
export class ObservabilityManager {
  private readonly metrics: Map<string, LiveMetrics> = new Map();
  private readonly updateCallbacks: Map<string, ((metrics: LiveMetrics) => void)[]> = new Map();

  /**
   * Get current metrics for a strategy
   */
  getMetrics(strategyId: string): LiveMetrics | undefined {
    return this.metrics.get(strategyId);
  }

  /**
   * Update metrics for a strategy
   */
  updateMetrics(strategyId: string, update: Partial<LiveMetrics>): void {
    const current = this.metrics.get(strategyId) || this.getDefaultMetrics(strategyId);

    const updated: LiveMetrics = {
      ...current,
      ...update,
      timestamp: new Date(),
    };

    this.metrics.set(strategyId, updated);

    // Notify subscribers
    const callbacks = this.updateCallbacks.get(strategyId);
    callbacks?.forEach((cb) => cb(updated));
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(strategyId: string, callback: (metrics: LiveMetrics) => void): () => void {
    if (!this.updateCallbacks.has(strategyId)) {
      this.updateCallbacks.set(strategyId, []);
    }

    this.updateCallbacks.get(strategyId)!.push(callback);

    return () => {
      const callbacks = this.updateCallbacks.get(strategyId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index >= 0) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Record a trade
   */
  recordTrade(strategyId: string, trade: TradeInfo): void {
    const metrics = this.metrics.get(strategyId);
    if (metrics) {
      metrics.recentTrades.unshift(trade);
      if (metrics.recentTrades.length > 50) {
        metrics.recentTrades = metrics.recentTrades.slice(0, 50);
      }
      metrics.pnl += trade.pnl;
      this.updateMetrics(strategyId, metrics);
    }
  }

  /**
   * Record a risk alert
   */
  recordAlert(strategyId: string, alert: RiskAlert): void {
    const metrics = this.metrics.get(strategyId);
    if (metrics) {
      metrics.activeRisks.push(alert);
      this.updateMetrics(strategyId, metrics);
    }
  }

  /**
   * Update agent status
   */
  updateAgentStatus(strategyId: string, status: AgentStatus): void {
    this.updateMetrics(strategyId, { agentStatus: status });
  }

  private getDefaultMetrics(strategyId: string): LiveMetrics {
    return {
      strategyId,
      timestamp: new Date(),
      pnl: 0,
      pnlPercent: 0,
      totalValue: 0,
      positions: [],
      recentTrades: [],
      activeRisks: [],
      agentStatus: 'idle',
    };
  }
}

// ============================================================================
// Helper Types
// ============================================================================

export interface StrategyFilter {
  status?: StrategyStatus;
  category?: Strategy['category'];
  authorId?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface TransitionResult {
  success: boolean;
  previousStatus?: StrategyStatus;
  newStatus?: StrategyStatus;
  error?: string;
  validationResult?: ValidationResult;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  timestamp?: Date;
  error?: string;
  validationResult?: ValidationResult;
}

export interface VersionComparison {
  versionA: string;
  versionB: string;
  addedBlocks: number;
  removedBlocks: number;
  modifiedBlocks: number;
  addedConnections: number;
  removedConnections: number;
  summary: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a strategy lifecycle manager
 */
export function createLifecycleManager(
  config?: Partial<LifecycleManagerConfig>
): StrategyLifecycleManager {
  return new StrategyLifecycleManager(config);
}

/**
 * Create a workspace manager
 */
export function createWorkspaceManager(): WorkspaceManager {
  return new WorkspaceManager();
}

/**
 * Create an observability manager
 */
export function createObservabilityManager(): ObservabilityManager {
  return new ObservabilityManager();
}
