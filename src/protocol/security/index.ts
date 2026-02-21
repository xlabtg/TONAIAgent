/**
 * TONAIAgent - Open Agent Protocol Security Module
 *
 * Security and Permission Model for the Open Agent Protocol.
 * Handles permissions, policies, guardrails, and transaction authorization.
 */

import {
  AgentId,
  PermissionSet,
  TradingPermissions,
  TransferPermissions,
  StakingPermissions,
  GovernancePermissions,
  TimeConstraints,
  TransactionPolicy,
  PolicyRequirement,
} from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Permission manager configuration
 */
export interface PermissionManagerConfig {
  /** Default permissions for new agents */
  defaultPermissions: Partial<PermissionSet>;

  /** Enable policy enforcement */
  enablePolicies: boolean;

  /** Enable guardrails */
  enableGuardrails: boolean;
}

/**
 * Transaction authorization request
 */
export interface AuthorizationRequest {
  /** Agent requesting authorization */
  agentId: AgentId;

  /** Operation type */
  operationType: 'trading' | 'transfer' | 'staking' | 'governance';

  /** Operation parameters */
  params: Record<string, unknown>;

  /** Context */
  context?: Record<string, unknown>;
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  /** Authorized */
  authorized: boolean;

  /** Reason if denied */
  reason?: string;

  /** Required actions (e.g., approval, delay) */
  requiredActions?: PolicyRequirement[];

  /** Applied policies */
  appliedPolicies?: string[];
}

/**
 * Guardrail check
 */
export interface GuardrailCheck {
  /** Guardrail name */
  name: string;

  /** Check passed */
  passed: boolean;

  /** Message */
  message?: string;

  /** Severity */
  severity: 'warning' | 'error';
}

/**
 * Permission event types
 */
export type PermissionEventType =
  | 'permission.granted'
  | 'permission.revoked'
  | 'permission.updated'
  | 'authorization.approved'
  | 'authorization.denied'
  | 'policy.triggered';

/**
 * Permission event
 */
export interface PermissionEvent {
  /** Event type */
  type: PermissionEventType;

  /** Agent ID */
  agentId: AgentId;

  /** Event data */
  data: Record<string, unknown>;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Permission event handler
 */
export type PermissionEventHandler = (event: PermissionEvent) => void;

// ============================================================================
// Permission Manager Interface
// ============================================================================

/**
 * Permission manager interface
 */
export interface PermissionManager {
  /** Get permissions for agent */
  getPermissions(agentId: AgentId): Promise<PermissionSet | undefined>;

  /** Set permissions for agent */
  setPermissions(agentId: AgentId, permissions: PermissionSet): Promise<void>;

  /** Update permissions */
  updatePermissions(agentId: AgentId, updates: Partial<PermissionSet>): Promise<void>;

  /** Delete permissions */
  deletePermissions(agentId: AgentId): Promise<boolean>;

  /** Check if operation is permitted */
  isPermitted(request: AuthorizationRequest): Promise<boolean>;

  /** Authorize operation */
  authorize(request: AuthorizationRequest): Promise<AuthorizationResult>;

  /** Add policy */
  addPolicy(policy: TransactionPolicy): Promise<void>;

  /** Remove policy */
  removePolicy(policyId: string): Promise<boolean>;

  /** Get policies */
  getPolicies(): TransactionPolicy[];

  /** Run guardrail checks */
  checkGuardrails(request: AuthorizationRequest): Promise<GuardrailCheck[]>;

  /** Subscribe to events */
  subscribe(handler: PermissionEventHandler): () => void;
}

// ============================================================================
// Default Implementation
// ============================================================================

/**
 * Default permission manager implementation
 */
export class DefaultPermissionManager implements PermissionManager {
  private config: PermissionManagerConfig;
  private permissions: Map<AgentId, PermissionSet> = new Map();
  private policies: Map<string, TransactionPolicy> = new Map();
  private eventHandlers: Set<PermissionEventHandler> = new Set();

  constructor(config: Partial<PermissionManagerConfig> = {}) {
    this.config = {
      defaultPermissions: config.defaultPermissions ?? {},
      enablePolicies: config.enablePolicies ?? true,
      enableGuardrails: config.enableGuardrails ?? true,
    };
  }

  /**
   * Get permissions for agent
   */
  async getPermissions(agentId: AgentId): Promise<PermissionSet | undefined> {
    return this.permissions.get(agentId);
  }

  /**
   * Set permissions for agent
   */
  async setPermissions(agentId: AgentId, permissions: PermissionSet): Promise<void> {
    this.permissions.set(agentId, permissions);

    this.emitEvent({
      type: 'permission.granted',
      agentId,
      data: { permissions },
      timestamp: new Date(),
    });
  }

  /**
   * Update permissions
   */
  async updatePermissions(agentId: AgentId, updates: Partial<PermissionSet>): Promise<void> {
    const existing = this.permissions.get(agentId);

    if (!existing) {
      throw new Error(`Permissions not found for agent: ${agentId}`);
    }

    const updated: PermissionSet = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.permissions.set(agentId, updated);

    this.emitEvent({
      type: 'permission.updated',
      agentId,
      data: { updates },
      timestamp: new Date(),
    });
  }

  /**
   * Delete permissions
   */
  async deletePermissions(agentId: AgentId): Promise<boolean> {
    const existed = this.permissions.delete(agentId);

    if (existed) {
      this.emitEvent({
        type: 'permission.revoked',
        agentId,
        data: {},
        timestamp: new Date(),
      });
    }

    return existed;
  }

  /**
   * Check if operation is permitted
   */
  async isPermitted(request: AuthorizationRequest): Promise<boolean> {
    const result = await this.authorize(request);
    return result.authorized;
  }

  /**
   * Authorize operation
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const permissions = this.permissions.get(request.agentId);

    if (!permissions) {
      return {
        authorized: false,
        reason: 'No permissions configured for agent',
      };
    }

    // Check time constraints
    if (permissions.timeConstraints) {
      const timeCheck = this.checkTimeConstraints(permissions.timeConstraints);
      if (!timeCheck.valid) {
        return {
          authorized: false,
          reason: timeCheck.reason,
        };
      }
    }

    // Check operation-specific permissions
    const operationCheck = this.checkOperationPermissions(request, permissions);
    if (!operationCheck.valid) {
      return {
        authorized: false,
        reason: operationCheck.reason,
      };
    }

    // Check guardrails
    if (this.config.enableGuardrails) {
      const guardrailChecks = await this.checkGuardrails(request);
      const failed = guardrailChecks.filter(c => !c.passed && c.severity === 'error');
      if (failed.length > 0) {
        return {
          authorized: false,
          reason: failed.map(c => c.message).join('; '),
        };
      }
    }

    // Check policies
    if (this.config.enablePolicies) {
      const policyResult = this.evaluatePolicies(request, permissions);
      if (policyResult.requiredActions && policyResult.requiredActions.length > 0) {
        return {
          authorized: true,
          requiredActions: policyResult.requiredActions,
          appliedPolicies: policyResult.appliedPolicies,
        };
      }
    }

    this.emitEvent({
      type: 'authorization.approved',
      agentId: request.agentId,
      data: { operationType: request.operationType },
      timestamp: new Date(),
    });

    return { authorized: true };
  }

  /**
   * Add policy
   */
  async addPolicy(policy: TransactionPolicy): Promise<void> {
    this.policies.set(policy.id, policy);
  }

  /**
   * Remove policy
   */
  async removePolicy(policyId: string): Promise<boolean> {
    return this.policies.delete(policyId);
  }

  /**
   * Get policies
   */
  getPolicies(): TransactionPolicy[] {
    return Array.from(this.policies.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Run guardrail checks
   */
  async checkGuardrails(request: AuthorizationRequest): Promise<GuardrailCheck[]> {
    const checks: GuardrailCheck[] = [];
    const params = request.params;

    // Transaction value check
    if (params.amount !== undefined) {
      const amount = Number(params.amount);
      const permissions = this.permissions.get(request.agentId);
      const maxValue = permissions?.limits?.maxCapitalAllocation ?? 10000;

      if (amount > maxValue) {
        checks.push({
          name: 'transaction_value',
          passed: false,
          message: `Transaction value ${amount} exceeds maximum ${maxValue}`,
          severity: 'error',
        });
      } else {
        checks.push({
          name: 'transaction_value',
          passed: true,
          severity: 'warning',
        });
      }
    }

    // Slippage check
    if (params.maxSlippage !== undefined) {
      const slippage = Number(params.maxSlippage);
      if (slippage > 5) {
        checks.push({
          name: 'slippage',
          passed: false,
          message: `Slippage ${slippage}% exceeds safe threshold of 5%`,
          severity: 'warning',
        });
      }
    }

    // Destination check for transfers
    if (request.operationType === 'transfer' && params.to) {
      const permissions = this.permissions.get(request.agentId);
      const transferPerms = permissions?.transfers;

      if (transferPerms?.whitelistOnly) {
        const allowed = transferPerms.allowedDestinations ?? [];
        if (!allowed.includes(String(params.to))) {
          checks.push({
            name: 'destination_whitelist',
            passed: false,
            message: `Destination ${params.to} is not in whitelist`,
            severity: 'error',
          });
        }
      }
    }

    return checks;
  }

  /**
   * Subscribe to events
   */
  subscribe(handler: PermissionEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private checkTimeConstraints(constraints: TimeConstraints): { valid: boolean; reason?: string } {
    const now = new Date();

    if (constraints.validFrom && now < constraints.validFrom) {
      return { valid: false, reason: 'Permissions not yet active' };
    }

    if (constraints.validUntil && now > constraints.validUntil) {
      return { valid: false, reason: 'Permissions have expired' };
    }

    if (constraints.operatingHours) {
      const hours = constraints.operatingHours;
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 100 + currentMinute;

      const startTime = parseInt(hours.start.replace(':', ''));
      const endTime = parseInt(hours.end.replace(':', ''));

      if (currentTime < startTime || currentTime > endTime) {
        return { valid: false, reason: 'Outside operating hours' };
      }

      if (hours.daysOfWeek) {
        const currentDay = now.getDay();
        if (!hours.daysOfWeek.includes(currentDay)) {
          return { valid: false, reason: 'Not an operating day' };
        }
      }
    }

    return { valid: true };
  }

  private checkOperationPermissions(
    request: AuthorizationRequest,
    permissions: PermissionSet
  ): { valid: boolean; reason?: string } {
    switch (request.operationType) {
      case 'trading':
        return this.checkTradingPermissions(request.params, permissions.trading);
      case 'transfer':
        return this.checkTransferPermissions(request.params, permissions.transfers);
      case 'staking':
        return this.checkStakingPermissions(request.params, permissions.staking);
      case 'governance':
        return this.checkGovernancePermissions(request.params, permissions.governance);
      default:
        return { valid: false, reason: 'Unknown operation type' };
    }
  }

  private checkTradingPermissions(
    params: Record<string, unknown>,
    perms: TradingPermissions
  ): { valid: boolean; reason?: string } {
    if (!perms.enabled) {
      return { valid: false, reason: 'Trading is not enabled' };
    }

    const amount = Number(params.amount ?? 0);
    if (amount > perms.maxTransactionValue) {
      return { valid: false, reason: `Amount ${amount} exceeds max ${perms.maxTransactionValue}` };
    }

    const slippage = Number(params.maxSlippage ?? 0);
    if (slippage > perms.maxSlippage) {
      return { valid: false, reason: `Slippage ${slippage}% exceeds max ${perms.maxSlippage}%` };
    }

    if (perms.allowedTokens !== '*') {
      const tokenIn = String(params.tokenIn ?? '');
      const tokenOut = String(params.tokenOut ?? '');
      if (!perms.allowedTokens.includes(tokenIn) || !perms.allowedTokens.includes(tokenOut)) {
        return { valid: false, reason: 'Token not in allowed list' };
      }
    }

    return { valid: true };
  }

  private checkTransferPermissions(
    params: Record<string, unknown>,
    perms: TransferPermissions
  ): { valid: boolean; reason?: string } {
    if (!perms.enabled) {
      return { valid: false, reason: 'Transfers are not enabled' };
    }

    const amount = Number(params.amount ?? 0);
    if (amount > perms.maxTransferValue) {
      return { valid: false, reason: `Amount ${amount} exceeds max ${perms.maxTransferValue}` };
    }

    if (perms.whitelistOnly && params.to) {
      if (!perms.allowedDestinations.includes(String(params.to))) {
        return { valid: false, reason: 'Destination not in whitelist' };
      }
    }

    return { valid: true };
  }

  private checkStakingPermissions(
    params: Record<string, unknown>,
    perms: StakingPermissions
  ): { valid: boolean; reason?: string } {
    if (!perms.enabled) {
      return { valid: false, reason: 'Staking is not enabled' };
    }

    if (perms.allowedValidators !== '*' && params.validator) {
      if (!perms.allowedValidators.includes(String(params.validator))) {
        return { valid: false, reason: 'Validator not in allowed list' };
      }
    }

    return { valid: true };
  }

  private checkGovernancePermissions(
    params: Record<string, unknown>,
    perms: GovernancePermissions
  ): { valid: boolean; reason?: string } {
    if (!perms.enabled) {
      return { valid: false, reason: 'Governance is not enabled' };
    }

    const operation = String(params.operation ?? '');
    if (operation === 'vote' && !perms.canVote) {
      return { valid: false, reason: 'Voting is not permitted' };
    }

    if (operation === 'propose' && !perms.canPropose) {
      return { valid: false, reason: 'Proposing is not permitted' };
    }

    if (operation === 'delegate' && !perms.canDelegate) {
      return { valid: false, reason: 'Delegation is not permitted' };
    }

    return { valid: true };
  }

  private evaluatePolicies(
    request: AuthorizationRequest,
    _permissions: PermissionSet
  ): { requiredActions?: PolicyRequirement[]; appliedPolicies?: string[] } {
    const requiredActions: PolicyRequirement[] = [];
    const appliedPolicies: string[] = [];

    const sortedPolicies = this.getPolicies().filter(p => p.active);

    for (const policy of sortedPolicies) {
      if (this.policyMatches(request, policy)) {
        appliedPolicies.push(policy.id);
        requiredActions.push(...policy.requirements);
      }
    }

    return { requiredActions, appliedPolicies };
  }

  private policyMatches(request: AuthorizationRequest, policy: TransactionPolicy): boolean {
    return policy.conditions.every(condition => {
      const value = request.params[condition.type];

      switch (condition.operator) {
        case 'gt': return Number(value) > Number(condition.value);
        case 'lt': return Number(value) < Number(condition.value);
        case 'gte': return Number(value) >= Number(condition.value);
        case 'lte': return Number(value) <= Number(condition.value);
        case 'eq': return value === condition.value;
        case 'in': return (condition.value as unknown[]).includes(value);
        case 'not_in': return !(condition.value as unknown[]).includes(value);
        default: return false;
      }
    });
  }

  private emitEvent(event: PermissionEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in permission event handler:', error);
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create permission manager
 */
export function createPermissionManager(
  config?: Partial<PermissionManagerConfig>
): PermissionManager {
  return new DefaultPermissionManager(config);
}

/**
 * Create default permission set
 */
export function createDefaultPermissions(agentId: AgentId): PermissionSet {
  return {
    id: `perm_${agentId}`,
    subject: agentId,
    trading: {
      enabled: true,
      allowedOperations: ['swap'],
      allowedTokens: '*',
      allowedProtocols: '*',
      maxSlippage: 1,
      maxTransactionValue: 1000,
      dailyLimit: 5000,
    },
    transfers: {
      enabled: true,
      whitelistOnly: false,
      allowedDestinations: [],
      maxTransferValue: 1000,
      dailyLimit: 5000,
      requiresApproval: false,
      approvalThreshold: 1000,
    },
    staking: {
      enabled: true,
      allowedValidators: '*',
      maxStakePercent: 50,
    },
    governance: {
      enabled: true,
      canVote: true,
      canPropose: false,
      canDelegate: true,
      allowedProtocols: '*',
    },
    limits: {
      maxCapitalAllocation: 10000,
      maxPositions: 10,
      maxLeverage: 1,
      maxDrawdown: 20,
      dailyTransactionCount: 100,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
