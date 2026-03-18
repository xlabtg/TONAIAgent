/**
 * TONAIAgent - Policy and Permission Framework
 *
 * Implements comprehensive policy enforcement:
 * - Agent capability scopes
 * - Token and protocol whitelists
 * - Risk thresholds
 * - Asset restrictions
 * - User-defined policies
 * - Enterprise compliance rules
 */

import {
  AgentPermissions,
  CapabilitySet,
  AccessControl,
  SessionLimits,
  RiskLevel,
  SecurityEvent,
  SecurityEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface PolicyManager {
  // Permission management
  createPermissions(agentId: string, userId: string, template?: string): Promise<AgentPermissions>;
  getPermissions(agentId: string): Promise<AgentPermissions | null>;
  updatePermissions(
    agentId: string,
    updates: Partial<AgentPermissions>
  ): Promise<AgentPermissions>;
  revokePermissions(agentId: string, reason: string): Promise<void>;

  // Capability checks
  checkCapability(
    permissions: AgentPermissions,
    operation: string,
    context: CapabilityContext
  ): CapabilityCheckResult;

  // Policy rules
  addPolicy(policy: PolicyRule): void;
  removePolicy(policyId: string): void;
  evaluatePolicy(permissions: AgentPermissions, context: PolicyContext): PolicyEvaluationResult;

  // Templates
  registerTemplate(template: PermissionTemplate): void;
  getTemplate(templateId: string): PermissionTemplate | null;
  listTemplates(): PermissionTemplate[];

  // Events
  onEvent(callback: SecurityEventCallback): void;
}

export interface CapabilityContext {
  operation: string;
  token?: string;
  protocol?: string;
  amount?: number;
  destination?: string;
  timestamp?: Date;
}

export interface CapabilityCheckResult {
  allowed: boolean;
  reason?: string;
  requiredApprovals?: string[];
  maxAmount?: number;
  constraints?: Record<string, unknown>;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: PolicyCondition[];
  effect: 'allow' | 'deny' | 'require_approval';
  actions?: PolicyAction[];
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface PolicyCondition {
  field: string;
  operator: PolicyOperator;
  value: unknown;
}

export type PolicyOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'matches';

export interface PolicyAction {
  type: 'notify' | 'log' | 'escalate' | 'block';
  config?: Record<string, unknown>;
}

export interface PolicyContext {
  agentId: string;
  userId: string;
  operation: string;
  amount?: number;
  token?: string;
  protocol?: string;
  destination?: string;
  timestamp: Date;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  matchedRules: Array<{
    rule: PolicyRule;
    matched: boolean;
    effect: 'allow' | 'deny' | 'require_approval';
  }>;
  overallEffect: 'allow' | 'deny' | 'require_approval';
  requiredApprovals: string[];
  reasons: string[];
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'conservative' | 'balanced' | 'aggressive' | 'custom';
  capabilities: CapabilitySet;
  accessControl: AccessControl;
  sessionLimits: SessionLimits;
  riskLevel: RiskLevel;
}

// ============================================================================
// Default Permission Templates
// ============================================================================

export const DEFAULT_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Minimal permissions with strict limits',
    category: 'conservative',
    riskLevel: 'low',
    capabilities: {
      trading: {
        enabled: true,
        allowedOperations: ['swap'],
        maxSlippagePercent: 0.3,
        allowedProtocols: ['dedust', 'stonfi'],
      },
      transfers: {
        enabled: false,
        whitelistOnly: true,
        allowedDestinations: [],
        maxSingleTransfer: 0,
      },
      staking: {
        enabled: true,
        allowedValidators: [],
        maxStakePercent: 30,
        allowUnstake: true,
      },
      nft: {
        enabled: false,
        allowedOperations: [],
        allowedCollections: [],
      },
      governance: {
        enabled: false,
        allowedOperations: [],
        allowedDaos: [],
      },
    },
    accessControl: {
      allowedTokens: [
        { symbol: 'TON', maxAmount: 100 },
        { symbol: 'USDT', maxAmount: 500 },
      ],
      allowedProtocols: [
        { name: 'dedust', allowedOperations: ['swap'], riskTier: 'low' },
        { name: 'stonfi', allowedOperations: ['swap'], riskTier: 'low' },
      ],
      timeRestrictions: { tradingHours: '09:00-21:00' },
    },
    sessionLimits: {
      maxTradesPerSession: 10,
      sessionTimeoutMinutes: 30,
      maxConcurrentSessions: 1,
    },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Moderate permissions for typical usage',
    category: 'balanced',
    riskLevel: 'medium',
    capabilities: {
      trading: {
        enabled: true,
        allowedOperations: ['swap', 'limit_order'],
        maxSlippagePercent: 0.5,
        allowedProtocols: ['dedust', 'stonfi', 'evaa'],
      },
      transfers: {
        enabled: true,
        whitelistOnly: false,
        allowedDestinations: [],
        maxSingleTransfer: 100,
      },
      staking: {
        enabled: true,
        allowedValidators: [],
        maxStakePercent: 50,
        allowUnstake: true,
      },
      nft: {
        enabled: true,
        allowedOperations: ['transfer'],
        allowedCollections: [],
      },
      governance: {
        enabled: true,
        allowedOperations: ['vote'],
        allowedDaos: [],
      },
    },
    accessControl: {
      allowedTokens: [
        { symbol: 'TON', maxAmount: 500 },
        { symbol: 'USDT', maxAmount: 2500 },
        { symbol: 'SCALE', maxAmount: 10000 },
      ],
      allowedProtocols: [
        { name: 'dedust', allowedOperations: ['swap'], riskTier: 'low' },
        { name: 'stonfi', allowedOperations: ['swap'], riskTier: 'low' },
        { name: 'evaa', allowedOperations: ['supply', 'borrow'], riskTier: 'medium' },
      ],
      timeRestrictions: { tradingHours: '00:00-23:59' },
    },
    sessionLimits: {
      maxTradesPerSession: 50,
      sessionTimeoutMinutes: 60,
      maxConcurrentSessions: 2,
    },
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Extended permissions for active trading',
    category: 'aggressive',
    riskLevel: 'high',
    capabilities: {
      trading: {
        enabled: true,
        allowedOperations: ['swap', 'limit_order', 'market_order'],
        maxSlippagePercent: 1.0,
        allowedProtocols: ['dedust', 'stonfi', 'evaa', 'torch'],
      },
      transfers: {
        enabled: true,
        whitelistOnly: false,
        allowedDestinations: [],
        maxSingleTransfer: 1000,
      },
      staking: {
        enabled: true,
        allowedValidators: [],
        maxStakePercent: 80,
        allowUnstake: true,
      },
      nft: {
        enabled: true,
        allowedOperations: ['transfer', 'list', 'buy'],
        allowedCollections: [],
      },
      governance: {
        enabled: true,
        allowedOperations: ['vote', 'delegate', 'propose'],
        allowedDaos: [],
      },
    },
    accessControl: {
      allowedTokens: [{ symbol: '*', maxAmount: 10000 }],
      allowedProtocols: [
        { name: '*', allowedOperations: ['*'], riskTier: 'high' },
      ],
      timeRestrictions: { tradingHours: '00:00-23:59' },
    },
    sessionLimits: {
      maxTradesPerSession: 200,
      sessionTimeoutMinutes: 120,
      maxConcurrentSessions: 5,
    },
  },
];

// ============================================================================
// Policy Manager Implementation
// ============================================================================

export class DefaultPolicyManager implements PolicyManager {
  private readonly permissions = new Map<string, AgentPermissions>();
  private readonly policies: PolicyRule[] = [];
  private readonly templates = new Map<string, PermissionTemplate>();
  private readonly eventCallbacks: SecurityEventCallback[] = [];

  constructor() {
    // Register default templates
    for (const template of DEFAULT_TEMPLATES) {
      this.templates.set(template.id, template);
    }

    // Add default policies
    this.initializeDefaultPolicies();
  }

  async createPermissions(
    agentId: string,
    userId: string,
    templateId?: string
  ): Promise<AgentPermissions> {
    const template = templateId ? this.templates.get(templateId) : this.templates.get('balanced');

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const permissions: AgentPermissions = {
      agentId,
      userId,
      capabilities: { ...template.capabilities },
      accessControl: { ...template.accessControl },
      sessionLimits: { ...template.sessionLimits },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    this.permissions.set(agentId, permissions);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'permission_changed',
      severity: 'low',
      source: 'policy',
      message: `Permissions created for agent ${agentId} using template ${template.id}`,
      data: { agentId, userId, template: template.id },
    });

    return permissions;
  }

  async getPermissions(agentId: string): Promise<AgentPermissions | null> {
    return this.permissions.get(agentId) ?? null;
  }

  async updatePermissions(
    agentId: string,
    updates: Partial<AgentPermissions>
  ): Promise<AgentPermissions> {
    const existing = this.permissions.get(agentId);
    if (!existing) {
      throw new Error(`Permissions not found for agent: ${agentId}`);
    }

    const updated: AgentPermissions = {
      ...existing,
      ...updates,
      capabilities: updates.capabilities
        ? { ...existing.capabilities, ...updates.capabilities }
        : existing.capabilities,
      accessControl: updates.accessControl
        ? { ...existing.accessControl, ...updates.accessControl }
        : existing.accessControl,
      sessionLimits: updates.sessionLimits
        ? { ...existing.sessionLimits, ...updates.sessionLimits }
        : existing.sessionLimits,
      updatedAt: new Date(),
      version: existing.version + 1,
    };

    this.permissions.set(agentId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'permission_changed',
      severity: 'medium',
      source: 'policy',
      message: `Permissions updated for agent ${agentId}`,
      data: { agentId, changes: updates, version: updated.version },
    });

    return updated;
  }

  async revokePermissions(agentId: string, reason: string): Promise<void> {
    const existing = this.permissions.get(agentId);
    if (!existing) {
      throw new Error(`Permissions not found for agent: ${agentId}`);
    }

    // Disable all capabilities
    existing.capabilities = {
      trading: { enabled: false, allowedOperations: [], maxSlippagePercent: 0, allowedProtocols: [] },
      transfers: { enabled: false, whitelistOnly: true, allowedDestinations: [], maxSingleTransfer: 0 },
      staking: { enabled: false, allowedValidators: [], maxStakePercent: 0, allowUnstake: false },
      nft: { enabled: false, allowedOperations: [], allowedCollections: [] },
      governance: { enabled: false, allowedOperations: [], allowedDaos: [] },
    };

    existing.updatedAt = new Date();
    existing.version++;

    this.permissions.set(agentId, existing);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'permission_changed',
      severity: 'high',
      source: 'policy',
      message: `Permissions revoked for agent ${agentId}: ${reason}`,
      data: { agentId, reason },
    });
  }

  checkCapability(
    permissions: AgentPermissions,
    operation: string,
    context: CapabilityContext
  ): CapabilityCheckResult {
    // Check trading capability
    if (this.isTradingOperation(operation)) {
      const trading = permissions.capabilities.trading;
      if (!trading.enabled) {
        return { allowed: false, reason: 'Trading is disabled' };
      }
      if (!trading.allowedOperations.includes(operation as 'swap' | 'limit_order' | 'market_order')) {
        return { allowed: false, reason: `Operation ${operation} is not allowed` };
      }
      if (context.protocol && !trading.allowedProtocols.includes(context.protocol)) {
        return { allowed: false, reason: `Protocol ${context.protocol} is not allowed` };
      }
      return {
        allowed: true,
        maxAmount: this.getMaxAmountForToken(permissions, context.token),
        constraints: { maxSlippage: trading.maxSlippagePercent },
      };
    }

    // Check transfer capability
    if (operation === 'transfer') {
      const transfers = permissions.capabilities.transfers;
      if (!transfers.enabled) {
        return { allowed: false, reason: 'Transfers are disabled' };
      }
      if (context.destination && transfers.whitelistOnly) {
        if (!transfers.allowedDestinations.includes(context.destination)) {
          return { allowed: false, reason: 'Destination not in whitelist' };
        }
      }
      if (context.amount && context.amount > transfers.maxSingleTransfer) {
        return {
          allowed: false,
          reason: `Amount exceeds limit of ${transfers.maxSingleTransfer}`,
        };
      }
      return { allowed: true, maxAmount: transfers.maxSingleTransfer };
    }

    // Check staking capability
    if (this.isStakingOperation(operation)) {
      const staking = permissions.capabilities.staking;
      if (!staking.enabled) {
        return { allowed: false, reason: 'Staking is disabled' };
      }
      if (operation === 'unstake' && !staking.allowUnstake) {
        return { allowed: false, reason: 'Unstaking is disabled' };
      }
      return {
        allowed: true,
        constraints: { maxStakePercent: staking.maxStakePercent },
      };
    }

    // Check NFT capability
    if (this.isNftOperation(operation)) {
      const nft = permissions.capabilities.nft;
      if (!nft.enabled) {
        return { allowed: false, reason: 'NFT operations are disabled' };
      }
      if (!nft.allowedOperations.includes(operation as 'transfer' | 'list' | 'buy' | 'mint')) {
        return { allowed: false, reason: `NFT operation ${operation} is not allowed` };
      }
      return { allowed: true };
    }

    // Check governance capability
    if (this.isGovernanceOperation(operation)) {
      const governance = permissions.capabilities.governance;
      if (!governance.enabled) {
        return { allowed: false, reason: 'Governance operations are disabled' };
      }
      if (!governance.allowedOperations.includes(operation as 'vote' | 'delegate' | 'propose')) {
        return { allowed: false, reason: `Governance operation ${operation} is not allowed` };
      }
      return { allowed: true };
    }

    // Unknown operation - deny by default
    return { allowed: false, reason: `Unknown operation: ${operation}` };
  }

  addPolicy(policy: PolicyRule): void {
    // Remove existing policy with same ID
    const existingIndex = this.policies.findIndex((p) => p.id === policy.id);
    if (existingIndex >= 0) {
      this.policies.splice(existingIndex, 1);
    }

    // Add and sort by priority
    this.policies.push(policy);
    this.policies.sort((a, b) => b.priority - a.priority);
  }

  removePolicy(policyId: string): void {
    const index = this.policies.findIndex((p) => p.id === policyId);
    if (index >= 0) {
      this.policies.splice(index, 1);
    }
  }

  evaluatePolicy(
    _permissions: AgentPermissions,
    context: PolicyContext
  ): PolicyEvaluationResult {
    const matchedRules: PolicyEvaluationResult['matchedRules'] = [];
    const requiredApprovals: string[] = [];
    const reasons: string[] = [];

    for (const policy of this.policies) {
      if (!policy.enabled) continue;

      const matched = this.evaluateConditions(policy.conditions, context);
      matchedRules.push({ rule: policy, matched, effect: policy.effect });

      if (matched) {
        if (policy.effect === 'deny') {
          reasons.push(`Blocked by policy: ${policy.name}`);
        } else if (policy.effect === 'require_approval') {
          requiredApprovals.push(policy.name);
          reasons.push(`Requires approval: ${policy.name}`);
        }
      }
    }

    // Determine overall effect (deny takes precedence)
    let overallEffect: 'allow' | 'deny' | 'require_approval' = 'allow';
    const deniedRules = matchedRules.filter((r) => r.matched && r.effect === 'deny');
    const approvalRules = matchedRules.filter((r) => r.matched && r.effect === 'require_approval');

    if (deniedRules.length > 0) {
      overallEffect = 'deny';
    } else if (approvalRules.length > 0) {
      overallEffect = 'require_approval';
    }

    return {
      allowed: overallEffect !== 'deny',
      matchedRules,
      overallEffect,
      requiredApprovals,
      reasons,
    };
  }

  registerTemplate(template: PermissionTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(templateId: string): PermissionTemplate | null {
    return this.templates.get(templateId) ?? null;
  }

  listTemplates(): PermissionTemplate[] {
    return Array.from(this.templates.values());
  }

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private initializeDefaultPolicies(): void {
    // Large transaction policy
    this.addPolicy({
      id: 'large_transaction',
      name: 'Large Transaction Review',
      description: 'Require approval for large transactions',
      priority: 100,
      conditions: [
        { field: 'amount', operator: 'greater_than', value: 1000 },
      ],
      effect: 'require_approval',
      enabled: true,
    });

    // New destination policy
    this.addPolicy({
      id: 'new_destination',
      name: 'New Destination Review',
      description: 'Require approval for transfers to new destinations',
      priority: 90,
      conditions: [
        { field: 'operation', operator: 'equals', value: 'transfer' },
        { field: 'metadata.isNewDestination', operator: 'equals', value: true },
        { field: 'amount', operator: 'greater_than', value: 50 },
      ],
      effect: 'require_approval',
      enabled: true,
    });

    // Night trading restriction (example)
    this.addPolicy({
      id: 'night_restriction',
      name: 'Night Trading Restriction',
      description: 'Restrict trading during late hours for conservative agents',
      priority: 80,
      conditions: [
        { field: 'hour', operator: 'greater_than', value: 23 },
        { field: 'metadata.riskLevel', operator: 'equals', value: 'low' },
      ],
      effect: 'deny',
      enabled: false, // Disabled by default
    });
  }

  private evaluateConditions(conditions: PolicyCondition[], context: PolicyContext): boolean {
    return conditions.every((condition) => this.evaluateCondition(condition, context));
  }

  private evaluateCondition(condition: PolicyCondition, context: PolicyContext): boolean {
    const value = this.getFieldValue(condition.field, context);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return typeof value === 'number' && value > (condition.value as number);
      case 'less_than':
        return typeof value === 'number' && value < (condition.value as number);
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string);
      case 'not_contains':
        return typeof value === 'string' && !value.includes(condition.value as string);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'matches':
        return typeof value === 'string' && new RegExp(condition.value as string).test(value);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: PolicyContext): unknown {
    const parts = field.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[part];
    }

    // Special handling for timestamp-derived fields
    if (field === 'hour' && context.timestamp) {
      return context.timestamp.getHours();
    }

    return value;
  }

  private isTradingOperation(operation: string): boolean {
    return ['swap', 'limit_order', 'market_order'].includes(operation);
  }

  private isStakingOperation(operation: string): boolean {
    return ['stake', 'unstake'].includes(operation);
  }

  private isNftOperation(operation: string): boolean {
    return ['nft_transfer', 'nft_list', 'nft_buy', 'nft_mint'].includes(operation);
  }

  private isGovernanceOperation(operation: string): boolean {
    return ['vote', 'delegate', 'propose'].includes(operation);
  }

  private getMaxAmountForToken(permissions: AgentPermissions, token?: string): number | undefined {
    if (!token) return undefined;

    const tokenAccess = permissions.accessControl.allowedTokens.find(
      (t) => t.symbol === token || t.symbol === '*'
    );

    return tokenAccess?.maxAmount;
  }

  private emitEvent(event: SecurityEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPolicyManager(): DefaultPolicyManager {
  return new DefaultPolicyManager();
}
