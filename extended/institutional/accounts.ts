/**
 * TONAIAgent - Institutional Account Architecture
 *
 * Implements institutional account management with:
 * - Multi-user access
 * - Role-based permissions
 * - Organizational hierarchies
 * - Delegated controls
 */

import {
  InstitutionalAccount,
  InstitutionalAccountType,
  InstitutionalMember,
  InstitutionalRole,
  MemberPermissions,
  MemberStatus,
  InstitutionalPermissions,
  OrganizationHierarchy,
  InstitutionalLimits,
  InstitutionalSettings,
  ComplianceStatus,
  OnboardingStatus,
  InstitutionalEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface AccountManager {
  // Account operations
  createAccount(
    name: string,
    type: InstitutionalAccountType,
    creatorUserId: string,
    options?: CreateAccountOptions
  ): Promise<InstitutionalAccount>;
  getAccount(accountId: string): Promise<InstitutionalAccount | null>;
  updateAccount(accountId: string, updates: Partial<AccountUpdates>): Promise<InstitutionalAccount>;
  suspendAccount(accountId: string, reason: string, suspendedBy: string): Promise<void>;
  reactivateAccount(accountId: string, reactivatedBy: string): Promise<void>;
  closeAccount(accountId: string, reason: string, closedBy: string): Promise<void>;

  // Member operations
  addMember(
    accountId: string,
    userId: string,
    email: string,
    name: string,
    role: InstitutionalRole,
    invitedBy: string,
    permissions?: Partial<MemberPermissions>
  ): Promise<InstitutionalMember>;
  getMember(accountId: string, userId: string): Promise<InstitutionalMember | null>;
  updateMember(accountId: string, userId: string, updates: Partial<MemberUpdates>): Promise<InstitutionalMember>;
  removeMember(accountId: string, userId: string, removedBy: string, reason?: string): Promise<void>;
  listMembers(accountId: string, filters?: MemberFilters): Promise<InstitutionalMember[]>;

  // Role management
  updateMemberRole(
    accountId: string,
    userId: string,
    newRole: InstitutionalRole,
    updatedBy: string
  ): Promise<InstitutionalMember>;
  updateMemberPermissions(
    accountId: string,
    userId: string,
    permissions: Partial<MemberPermissions>,
    updatedBy: string
  ): Promise<InstitutionalMember>;

  // Hierarchy operations
  setParentAccount(accountId: string, parentAccountId: string): Promise<void>;
  getChildAccounts(accountId: string): Promise<InstitutionalAccount[]>;
  getAccountHierarchy(accountId: string): Promise<AccountHierarchyNode>;

  // Access control
  checkAccess(accountId: string, userId: string, permission: string): Promise<AccessCheckResult>;
  getEffectivePermissions(accountId: string, userId: string): Promise<MemberPermissions>;

  // Events
  onEvent(callback: InstitutionalEventCallback): void;
}

export interface CreateAccountOptions {
  organizationId?: string;
  parentAccountId?: string;
  department?: string;
  region?: string;
  customLimits?: Partial<InstitutionalLimits>;
  customSettings?: Partial<InstitutionalSettings>;
}

export interface AccountUpdates {
  name: string;
  type: InstitutionalAccountType;
  permissions: Partial<InstitutionalPermissions>;
  limits: Partial<InstitutionalLimits>;
  settings: Partial<InstitutionalSettings>;
  metadata: Record<string, unknown>;
}

export interface MemberUpdates {
  name: string;
  email: string;
  permissions: Partial<MemberPermissions>;
  mfaEnabled: boolean;
  metadata: Record<string, unknown>;
}

export interface MemberFilters {
  role?: InstitutionalRole;
  status?: MemberStatus;
  hasPermission?: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: InstitutionalRole;
  missingPermission?: string;
}

export interface AccountHierarchyNode {
  account: InstitutionalAccount;
  children: AccountHierarchyNode[];
  level: number;
}

// ============================================================================
// Default Role Permissions
// ============================================================================

const DEFAULT_ROLE_PERMISSIONS: Record<InstitutionalRole, MemberPermissions> = {
  admin: {
    canTrade: true,
    canTransfer: true,
    canViewReports: true,
    canManageMembers: true,
    canManageSettings: true,
    canApproveTransactions: true,
    canAccessAuditLogs: true,
    customPermissions: ['all'],
  },
  trader: {
    canTrade: true,
    canTransfer: false,
    canViewReports: true,
    canManageMembers: false,
    canManageSettings: false,
    canApproveTransactions: false,
    canAccessAuditLogs: false,
    customPermissions: ['execute_trades', 'view_positions'],
  },
  risk_manager: {
    canTrade: false,
    canTransfer: false,
    canViewReports: true,
    canManageMembers: false,
    canManageSettings: false,
    canApproveTransactions: true,
    canAccessAuditLogs: true,
    customPermissions: ['view_risk_metrics', 'set_risk_limits', 'view_positions'],
  },
  compliance_officer: {
    canTrade: false,
    canTransfer: false,
    canViewReports: true,
    canManageMembers: false,
    canManageSettings: false,
    canApproveTransactions: true,
    canAccessAuditLogs: true,
    customPermissions: ['view_kyc', 'manage_compliance', 'generate_reports'],
  },
  auditor: {
    canTrade: false,
    canTransfer: false,
    canViewReports: true,
    canManageMembers: false,
    canManageSettings: false,
    canApproveTransactions: false,
    canAccessAuditLogs: true,
    customPermissions: ['view_audit_logs', 'generate_reports'],
  },
  viewer: {
    canTrade: false,
    canTransfer: false,
    canViewReports: true,
    canManageMembers: false,
    canManageSettings: false,
    canApproveTransactions: false,
    canAccessAuditLogs: false,
    customPermissions: ['view_dashboard'],
  },
};

// Helper to check if permission exists and is true
function hasPermission(permissions: MemberPermissions, permission: string): boolean {
  const booleanPerms: Record<string, boolean> = {
    canTrade: permissions.canTrade,
    canTransfer: permissions.canTransfer,
    canViewReports: permissions.canViewReports,
    canManageMembers: permissions.canManageMembers,
    canManageSettings: permissions.canManageSettings,
    canApproveTransactions: permissions.canApproveTransactions,
    canAccessAuditLogs: permissions.canAccessAuditLogs,
  };
  return booleanPerms[permission] === true;
}

// ============================================================================
// Default Limits by Account Type
// ============================================================================

const DEFAULT_LIMITS_BY_TYPE: Record<InstitutionalAccountType, InstitutionalLimits> = {
  hedge_fund: {
    dailyTransactionLimit: 10000000,
    weeklyTransactionLimit: 50000000,
    monthlyTransactionLimit: 200000000,
    singleTransactionLimit: 5000000,
    largeTransactionThreshold: 1000000,
    approvalRequiredAbove: 500000,
  },
  family_office: {
    dailyTransactionLimit: 5000000,
    weeklyTransactionLimit: 20000000,
    monthlyTransactionLimit: 80000000,
    singleTransactionLimit: 2000000,
    largeTransactionThreshold: 500000,
    approvalRequiredAbove: 250000,
  },
  crypto_fund: {
    dailyTransactionLimit: 10000000,
    weeklyTransactionLimit: 50000000,
    monthlyTransactionLimit: 200000000,
    singleTransactionLimit: 5000000,
    largeTransactionThreshold: 1000000,
    approvalRequiredAbove: 500000,
  },
  fintech: {
    dailyTransactionLimit: 2000000,
    weeklyTransactionLimit: 10000000,
    monthlyTransactionLimit: 40000000,
    singleTransactionLimit: 500000,
    largeTransactionThreshold: 100000,
    approvalRequiredAbove: 50000,
  },
  asset_manager: {
    dailyTransactionLimit: 20000000,
    weeklyTransactionLimit: 100000000,
    monthlyTransactionLimit: 400000000,
    singleTransactionLimit: 10000000,
    largeTransactionThreshold: 2000000,
    approvalRequiredAbove: 1000000,
  },
  dao: {
    dailyTransactionLimit: 5000000,
    weeklyTransactionLimit: 25000000,
    monthlyTransactionLimit: 100000000,
    singleTransactionLimit: 2500000,
    largeTransactionThreshold: 500000,
    approvalRequiredAbove: 250000,
  },
  enterprise: {
    dailyTransactionLimit: 1000000,
    weeklyTransactionLimit: 5000000,
    monthlyTransactionLimit: 20000000,
    singleTransactionLimit: 250000,
    largeTransactionThreshold: 50000,
    approvalRequiredAbove: 25000,
  },
  other: {
    dailyTransactionLimit: 500000,
    weeklyTransactionLimit: 2000000,
    monthlyTransactionLimit: 8000000,
    singleTransactionLimit: 100000,
    largeTransactionThreshold: 25000,
    approvalRequiredAbove: 10000,
  },
};

// ============================================================================
// Default Account Manager Implementation
// ============================================================================

export class DefaultAccountManager implements AccountManager {
  private readonly accounts = new Map<string, InstitutionalAccount>();
  private readonly membersByAccount = new Map<string, Map<string, InstitutionalMember>>();
  private readonly eventCallbacks: InstitutionalEventCallback[] = [];
  private accountCounter = 0;
  private memberCounter = 0;

  async createAccount(
    name: string,
    type: InstitutionalAccountType,
    creatorUserId: string,
    options?: CreateAccountOptions
  ): Promise<InstitutionalAccount> {
    const accountId = this.generateAccountId();
    const organizationId = options?.organizationId ?? accountId;

    const hierarchy: OrganizationHierarchy = {
      parentAccountId: options?.parentAccountId,
      childAccountIds: [],
      level: options?.parentAccountId ? this.getParentLevel(options.parentAccountId) + 1 : 0,
      department: options?.department,
      region: options?.region,
    };

    const defaultLimits = DEFAULT_LIMITS_BY_TYPE[type];
    const limits: InstitutionalLimits = {
      ...defaultLimits,
      ...options?.customLimits,
    };

    const defaultSettings: InstitutionalSettings = {
      timezone: 'UTC',
      currency: 'USD',
      language: 'en',
      notifications: {
        email: true,
        slack: false,
        telegram: false,
        webhook: false,
        alertTypes: ['transaction', 'risk', 'compliance'],
      },
      security: {
        mfaRequired: true,
        ipWhitelist: [],
        sessionTimeout: 3600,
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecial: true,
          expiryDays: 90,
          historyCount: 5,
        },
        apiKeyRotation: 90,
      },
      integration: {
        apiEnabled: true,
        allowedOrigins: [],
      },
    };

    const settings: InstitutionalSettings = {
      ...defaultSettings,
      ...options?.customSettings,
      notifications: {
        ...defaultSettings.notifications,
        ...options?.customSettings?.notifications,
      },
      security: {
        ...defaultSettings.security,
        ...options?.customSettings?.security,
      },
      integration: {
        ...defaultSettings.integration,
        ...options?.customSettings?.integration,
      },
    };

    const compliance: ComplianceStatus = {
      kycStatus: 'not_started',
      kycLevel: 'basic',
      amlStatus: 'pending_review',
      sanctionsStatus: 'clear',
      riskRating: 'medium',
      restrictions: [],
    };

    const onboardingStatus: OnboardingStatus = {
      stage: 'initial_application',
      completedSteps: [],
      pendingSteps: [
        'document_collection',
        'kyc_verification',
        'compliance_review',
        'agreement_signing',
        'account_setup',
      ],
      documents: [],
      reviewStatus: 'pending',
      startedAt: new Date(),
    };

    const permissions: InstitutionalPermissions = {
      tradingEnabled: false, // Disabled until onboarding complete
      transfersEnabled: false,
      stakingEnabled: false,
      defiEnabled: false,
      nftEnabled: false,
      apiAccessEnabled: false,
      whitelistRequired: true,
      approvalWorkflowEnabled: true,
      multiSigRequired: false,
      multiSigThreshold: 2,
    };

    const account: InstitutionalAccount = {
      id: accountId,
      name,
      type,
      status: 'pending_verification',
      organizationId,
      hierarchy,
      members: [],
      permissions,
      compliance,
      onboardingStatus,
      limits,
      settings,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.accounts.set(accountId, account);
    this.membersByAccount.set(accountId, new Map());

    // Update parent's child accounts if applicable
    if (options?.parentAccountId) {
      const parent = this.accounts.get(options.parentAccountId);
      if (parent) {
        parent.hierarchy.childAccountIds.push(accountId);
      }
    }

    // Add creator as admin
    await this.addMember(
      accountId,
      creatorUserId,
      `admin@${name.toLowerCase().replace(/\s+/g, '-')}.com`,
      'Account Administrator',
      'admin',
      creatorUserId
    );

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'account_created',
      accountId,
      actorId: creatorUserId,
      actorRole: 'admin',
      action: 'create_account',
      resource: 'account',
      resourceId: accountId,
      details: { name, type },
      metadata: {},
    });

    return account;
  }

  async getAccount(accountId: string): Promise<InstitutionalAccount | null> {
    return this.accounts.get(accountId) ?? null;
  }

  async updateAccount(
    accountId: string,
    updates: Partial<AccountUpdates>
  ): Promise<InstitutionalAccount> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    if (updates.name !== undefined) {
      account.name = updates.name;
    }
    if (updates.type !== undefined) {
      account.type = updates.type;
    }
    if (updates.permissions !== undefined) {
      account.permissions = { ...account.permissions, ...updates.permissions };
    }
    if (updates.limits !== undefined) {
      account.limits = { ...account.limits, ...updates.limits };
    }
    if (updates.settings !== undefined) {
      account.settings = { ...account.settings, ...updates.settings };
    }
    if (updates.metadata !== undefined) {
      account.metadata = { ...account.metadata, ...updates.metadata };
    }

    account.updatedAt = new Date();

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'account_updated',
      accountId,
      actorId: 'system',
      actorRole: 'admin',
      action: 'update_account',
      resource: 'account',
      resourceId: accountId,
      details: { updates },
      metadata: {},
    });

    return account;
  }

  async suspendAccount(accountId: string, reason: string, suspendedBy: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    account.status = 'suspended';
    account.permissions = {
      ...account.permissions,
      tradingEnabled: false,
      transfersEnabled: false,
      stakingEnabled: false,
      defiEnabled: false,
    };
    account.updatedAt = new Date();

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'account_updated',
      accountId,
      actorId: suspendedBy,
      actorRole: 'admin',
      action: 'suspend_account',
      resource: 'account',
      resourceId: accountId,
      details: { reason, previousStatus: 'active' },
      metadata: {},
    });
  }

  async reactivateAccount(accountId: string, reactivatedBy: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    if (account.status !== 'suspended') {
      throw new Error(`Account is not suspended: ${accountId}`);
    }

    account.status = 'active';
    account.permissions = {
      ...account.permissions,
      tradingEnabled: true,
      transfersEnabled: true,
    };
    account.updatedAt = new Date();

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'account_updated',
      accountId,
      actorId: reactivatedBy,
      actorRole: 'admin',
      action: 'reactivate_account',
      resource: 'account',
      resourceId: accountId,
      details: { previousStatus: 'suspended' },
      metadata: {},
    });
  }

  async closeAccount(accountId: string, reason: string, closedBy: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    account.status = 'closed';
    account.permissions = {
      tradingEnabled: false,
      transfersEnabled: false,
      stakingEnabled: false,
      defiEnabled: false,
      nftEnabled: false,
      apiAccessEnabled: false,
      whitelistRequired: true,
      approvalWorkflowEnabled: false,
      multiSigRequired: false,
      multiSigThreshold: 0,
    };
    account.updatedAt = new Date();

    // Remove from parent's children
    if (account.hierarchy.parentAccountId) {
      const parent = this.accounts.get(account.hierarchy.parentAccountId);
      if (parent) {
        parent.hierarchy.childAccountIds = parent.hierarchy.childAccountIds.filter(
          (id) => id !== accountId
        );
      }
    }

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'account_updated',
      accountId,
      actorId: closedBy,
      actorRole: 'admin',
      action: 'close_account',
      resource: 'account',
      resourceId: accountId,
      details: { reason },
      metadata: {},
    });
  }

  async addMember(
    accountId: string,
    userId: string,
    email: string,
    name: string,
    role: InstitutionalRole,
    invitedBy: string,
    permissions?: Partial<MemberPermissions>
  ): Promise<InstitutionalMember> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const membersMap = this.membersByAccount.get(accountId);
    if (!membersMap) {
      throw new Error(`Members map not initialized for account: ${accountId}`);
    }

    if (membersMap.has(userId)) {
      throw new Error(`User ${userId} is already a member of account ${accountId}`);
    }

    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[role];
    const memberPermissions: MemberPermissions = {
      ...defaultPermissions,
      ...permissions,
    };

    const memberId = this.generateMemberId();
    const member: InstitutionalMember = {
      id: memberId,
      userId,
      accountId,
      role,
      email,
      name,
      permissions: memberPermissions,
      status: 'active', // Members are active by default; admins can suspend them if needed
      mfaEnabled: false,
      invitedBy,
      joinedAt: new Date(),
      metadata: {},
    };

    membersMap.set(userId, member);
    account.members.push(member);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'member_added',
      accountId,
      actorId: invitedBy,
      actorRole: 'admin',
      action: 'add_member',
      resource: 'member',
      resourceId: memberId,
      details: { userId, role, email, name },
      metadata: {},
    });

    return member;
  }

  async getMember(accountId: string, userId: string): Promise<InstitutionalMember | null> {
    const membersMap = this.membersByAccount.get(accountId);
    if (!membersMap) {
      return null;
    }
    return membersMap.get(userId) ?? null;
  }

  async updateMember(
    accountId: string,
    userId: string,
    updates: Partial<MemberUpdates>
  ): Promise<InstitutionalMember> {
    const member = await this.getMember(accountId, userId);
    if (!member) {
      throw new Error(`Member not found: ${userId} in account ${accountId}`);
    }

    if (updates.name !== undefined) {
      member.name = updates.name;
    }
    if (updates.email !== undefined) {
      member.email = updates.email;
    }
    if (updates.permissions !== undefined) {
      member.permissions = { ...member.permissions, ...updates.permissions };
    }
    if (updates.mfaEnabled !== undefined) {
      member.mfaEnabled = updates.mfaEnabled;
    }
    if (updates.metadata !== undefined) {
      member.metadata = { ...member.metadata, ...updates.metadata };
    }

    return member;
  }

  async removeMember(
    accountId: string,
    userId: string,
    removedBy: string,
    reason?: string
  ): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const membersMap = this.membersByAccount.get(accountId);
    if (!membersMap) {
      throw new Error(`Members map not initialized for account: ${accountId}`);
    }

    const member = membersMap.get(userId);
    if (!member) {
      throw new Error(`Member not found: ${userId} in account ${accountId}`);
    }

    // Cannot remove the last admin
    const admins = account.members.filter((m) => m.role === 'admin' && m.status === 'active');
    if (member.role === 'admin' && admins.length <= 1) {
      throw new Error('Cannot remove the last admin from the account');
    }

    member.status = 'removed';
    account.members = account.members.filter((m) => m.userId !== userId);
    membersMap.delete(userId);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'member_removed',
      accountId,
      actorId: removedBy,
      actorRole: 'admin',
      action: 'remove_member',
      resource: 'member',
      resourceId: member.id,
      details: { userId, reason },
      metadata: {},
    });
  }

  async listMembers(accountId: string, filters?: MemberFilters): Promise<InstitutionalMember[]> {
    const membersMap = this.membersByAccount.get(accountId);
    if (!membersMap) {
      return [];
    }

    let members = Array.from(membersMap.values());

    if (filters?.role) {
      members = members.filter((m) => m.role === filters.role);
    }
    if (filters?.status) {
      members = members.filter((m) => m.status === filters.status);
    }
    if (filters?.hasPermission) {
      const perm = filters.hasPermission;
      members = members.filter(
        (m) =>
          hasPermission(m.permissions, perm) ||
          m.permissions.customPermissions.includes(perm)
      );
    }

    return members;
  }

  async updateMemberRole(
    accountId: string,
    userId: string,
    newRole: InstitutionalRole,
    updatedBy: string
  ): Promise<InstitutionalMember> {
    const member = await this.getMember(accountId, userId);
    if (!member) {
      throw new Error(`Member not found: ${userId} in account ${accountId}`);
    }

    const oldRole = member.role;

    // Cannot demote the last admin
    if (oldRole === 'admin' && newRole !== 'admin') {
      const account = this.accounts.get(accountId);
      if (account) {
        const admins = account.members.filter((m) => m.role === 'admin' && m.status === 'active');
        if (admins.length <= 1) {
          throw new Error('Cannot demote the last admin');
        }
      }
    }

    member.role = newRole;
    member.permissions = DEFAULT_ROLE_PERMISSIONS[newRole];

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'member_role_changed',
      accountId,
      actorId: updatedBy,
      actorRole: 'admin',
      action: 'update_role',
      resource: 'member',
      resourceId: member.id,
      details: { userId, oldRole, newRole },
      metadata: {},
    });

    return member;
  }

  async updateMemberPermissions(
    accountId: string,
    userId: string,
    permissions: Partial<MemberPermissions>,
    updatedBy: string
  ): Promise<InstitutionalMember> {
    const member = await this.getMember(accountId, userId);
    if (!member) {
      throw new Error(`Member not found: ${userId} in account ${accountId}`);
    }

    const oldPermissions = { ...member.permissions };
    member.permissions = { ...member.permissions, ...permissions };

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'member_role_changed',
      accountId,
      actorId: updatedBy,
      actorRole: 'admin',
      action: 'update_permissions',
      resource: 'member',
      resourceId: member.id,
      details: { userId, oldPermissions, newPermissions: member.permissions },
      metadata: {},
    });

    return member;
  }

  async setParentAccount(accountId: string, parentAccountId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const parent = this.accounts.get(parentAccountId);
    if (!parent) {
      throw new Error(`Parent account not found: ${parentAccountId}`);
    }

    // Remove from old parent
    if (account.hierarchy.parentAccountId) {
      const oldParent = this.accounts.get(account.hierarchy.parentAccountId);
      if (oldParent) {
        oldParent.hierarchy.childAccountIds = oldParent.hierarchy.childAccountIds.filter(
          (id) => id !== accountId
        );
      }
    }

    // Add to new parent
    account.hierarchy.parentAccountId = parentAccountId;
    account.hierarchy.level = parent.hierarchy.level + 1;
    parent.hierarchy.childAccountIds.push(accountId);
  }

  async getChildAccounts(accountId: string): Promise<InstitutionalAccount[]> {
    const account = this.accounts.get(accountId);
    if (!account) {
      return [];
    }

    return account.hierarchy.childAccountIds
      .map((id) => this.accounts.get(id))
      .filter((a): a is InstitutionalAccount => a !== undefined);
  }

  async getAccountHierarchy(accountId: string): Promise<AccountHierarchyNode> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const buildNode = async (acc: InstitutionalAccount, level: number): Promise<AccountHierarchyNode> => {
      const children = await this.getChildAccounts(acc.id);
      const childNodes = await Promise.all(
        children.map((child) => buildNode(child, level + 1))
      );

      return {
        account: acc,
        children: childNodes,
        level,
      };
    };

    return buildNode(account, 0);
  }

  async checkAccess(
    accountId: string,
    userId: string,
    permission: string
  ): Promise<AccessCheckResult> {
    const member = await this.getMember(accountId, userId);
    if (!member) {
      return {
        allowed: false,
        reason: 'User is not a member of this account',
      };
    }

    if (member.status !== 'active') {
      return {
        allowed: false,
        reason: `Member status is ${member.status}`,
      };
    }

    const permissions = member.permissions;

    // Check specific permission
    if (hasPermission(permissions, permission)) {
      return { allowed: true };
    }

    // Check custom permissions
    if (permissions.customPermissions.includes(permission)) {
      return { allowed: true };
    }

    // Check 'all' permission for admins
    if (permissions.customPermissions.includes('all')) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Permission denied',
      missingPermission: permission,
      requiredRole: this.findRoleWithPermission(permission),
    };
  }

  async getEffectivePermissions(accountId: string, userId: string): Promise<MemberPermissions> {
    const member = await this.getMember(accountId, userId);
    if (!member) {
      throw new Error(`Member not found: ${userId} in account ${accountId}`);
    }

    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Combine member permissions with account restrictions
    const effective: MemberPermissions = {
      canTrade: member.permissions.canTrade && account.permissions.tradingEnabled,
      canTransfer: member.permissions.canTransfer && account.permissions.transfersEnabled,
      canViewReports: member.permissions.canViewReports,
      canManageMembers: member.permissions.canManageMembers,
      canManageSettings: member.permissions.canManageSettings,
      canApproveTransactions: member.permissions.canApproveTransactions,
      canAccessAuditLogs: member.permissions.canAccessAuditLogs,
      maxTransactionAmount: Math.min(
        member.permissions.maxTransactionAmount ?? Infinity,
        account.limits.singleTransactionLimit
      ),
      approvalThreshold: member.permissions.approvalThreshold ?? account.limits.approvalRequiredAbove,
      customPermissions: member.permissions.customPermissions,
    };

    return effective;
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private generateAccountId(): string {
    this.accountCounter++;
    return `inst_${Date.now()}_${this.accountCounter.toString(36)}`;
  }

  private generateMemberId(): string {
    this.memberCounter++;
    return `member_${Date.now()}_${this.memberCounter.toString(36)}`;
  }

  private getParentLevel(parentAccountId: string): number {
    const parent = this.accounts.get(parentAccountId);
    return parent?.hierarchy.level ?? 0;
  }

  private findRoleWithPermission(permission: string): InstitutionalRole | undefined {
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      if (
        hasPermission(perms, permission) ||
        perms.customPermissions.includes(permission)
      ) {
        return role as InstitutionalRole;
      }
    }
    return undefined;
  }

  private emitEvent(event: Parameters<InstitutionalEventCallback>[0]): void {
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

export function createAccountManager(): DefaultAccountManager {
  return new DefaultAccountManager();
}

export { DEFAULT_ROLE_PERMISSIONS, DEFAULT_LIMITS_BY_TYPE };
