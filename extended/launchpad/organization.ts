/**
 * TONAIAgent - Organization Manager
 *
 * Manages organization setup, member management, and configuration
 * for DAOs, funds, and communities using the Agent Launchpad.
 */

import {
  Organization,
  OrganizationType,
  OrganizationStatus,
  OrganizationMember,
  OrganizationRole,
  MemberPermissions,
  GovernanceConfig,
  TreasuryConfig,
  OrganizationCompliance,
  OrganizationMonetization,
  LaunchpadEvent,
  LaunchpadEventCallback,
} from './types';

// ============================================================================
// Organization Manager Interface
// ============================================================================

export interface OrganizationManager {
  // Organization CRUD
  createOrganization(input: CreateOrganizationInput): Promise<Organization>;
  getOrganization(orgId: string): Organization | undefined;
  updateOrganization(orgId: string, updates: UpdateOrganizationInput): Promise<Organization>;
  archiveOrganization(orgId: string, reason: string): Promise<boolean>;
  listOrganizations(filters?: OrganizationFilters): Organization[];

  // Member management
  addMember(input: AddMemberInput): Promise<OrganizationMember>;
  updateMember(orgId: string, memberId: string, updates: UpdateMemberInput): Promise<OrganizationMember>;
  removeMember(orgId: string, memberId: string, reason: string): Promise<boolean>;
  getMember(orgId: string, userId: string): OrganizationMember | undefined;
  listMembers(orgId: string): OrganizationMember[];

  // Role management
  assignRole(orgId: string, memberId: string, role: OrganizationRole): Promise<void>;
  getPermissionsForRole(role: OrganizationRole): MemberPermissions;

  // Configuration
  updateGovernanceConfig(orgId: string, config: Partial<GovernanceConfig>): Promise<Organization>;
  updateTreasuryConfig(orgId: string, config: Partial<TreasuryConfig>): Promise<Organization>;
  updateMonetization(orgId: string, config: Partial<OrganizationMonetization>): Promise<Organization>;

  // Events
  onEvent(callback: LaunchpadEventCallback): void;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CreateOrganizationInput {
  name: string;
  description: string;
  type: OrganizationType;
  creatorUserId: string;
  governanceConfig?: Partial<GovernanceConfig>;
  treasuryConfig?: Partial<TreasuryConfig>;
  compliance?: Partial<OrganizationCompliance>;
  monetization?: Partial<OrganizationMonetization>;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  status?: OrganizationStatus;
  compliance?: Partial<OrganizationCompliance>;
  metadata?: Record<string, unknown>;
}

export interface AddMemberInput {
  organizationId: string;
  userId: string;
  email: string;
  name: string;
  role: OrganizationRole;
  invitedBy: string;
  votingPower?: number;
}

export interface UpdateMemberInput {
  role?: OrganizationRole;
  permissions?: Partial<MemberPermissions>;
  votingPower?: number;
  status?: 'active' | 'suspended';
}

export interface OrganizationFilters {
  type?: OrganizationType[];
  status?: OrganizationStatus[];
  creatorUserId?: string;
}

// ============================================================================
// Default Role Permissions
// ============================================================================

export const DEFAULT_ROLE_PERMISSIONS: Record<OrganizationRole, MemberPermissions> = {
  owner: {
    canManageAgents: true,
    canManageTreasury: true,
    canManageMembers: true,
    canCreateProposals: true,
    canVote: true,
    canExecuteStrategies: true,
    canViewReports: true,
    canManageSettings: true,
  },
  admin: {
    canManageAgents: true,
    canManageTreasury: true,
    canManageMembers: true,
    canCreateProposals: true,
    canVote: true,
    canExecuteStrategies: true,
    canViewReports: true,
    canManageSettings: true,
  },
  treasury_manager: {
    canManageAgents: true,
    canManageTreasury: true,
    canManageMembers: false,
    canCreateProposals: true,
    canVote: true,
    canExecuteStrategies: true,
    canViewReports: true,
    canManageSettings: false,
  },
  strategy_manager: {
    canManageAgents: true,
    canManageTreasury: false,
    canManageMembers: false,
    canCreateProposals: true,
    canVote: true,
    canExecuteStrategies: true,
    canViewReports: true,
    canManageSettings: false,
  },
  risk_manager: {
    canManageAgents: false,
    canManageTreasury: false,
    canManageMembers: false,
    canCreateProposals: true,
    canVote: true,
    canExecuteStrategies: false,
    canViewReports: true,
    canManageSettings: false,
  },
  contributor: {
    canManageAgents: false,
    canManageTreasury: false,
    canManageMembers: false,
    canCreateProposals: true,
    canVote: true,
    canExecuteStrategies: false,
    canViewReports: true,
    canManageSettings: false,
  },
  viewer: {
    canManageAgents: false,
    canManageTreasury: false,
    canManageMembers: false,
    canCreateProposals: false,
    canVote: false,
    canExecuteStrategies: false,
    canViewReports: true,
    canManageSettings: false,
  },
};

// ============================================================================
// Default Organization Manager Implementation
// ============================================================================

export interface OrganizationManagerConfig {
  maxMembersPerOrganization?: number;
  requireKycForAdmins?: boolean;
}

export class DefaultOrganizationManager implements OrganizationManager {
  private organizations: Map<string, Organization> = new Map();
  private eventCallbacks: LaunchpadEventCallback[] = [];
  private config: OrganizationManagerConfig;

  constructor(config: Partial<OrganizationManagerConfig> = {}) {
    this.config = {
      maxMembersPerOrganization: config.maxMembersPerOrganization ?? 1000,
      requireKycForAdmins: config.requireKycForAdmins ?? false,
    };
  }

  // ============================================================================
  // Organization CRUD
  // ============================================================================

  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    // Create owner member
    const ownerMember: OrganizationMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: input.creatorUserId,
      organizationId: orgId,
      role: 'owner',
      email: '',
      name: 'Owner',
      permissions: DEFAULT_ROLE_PERMISSIONS.owner,
      votingPower: 100,
      joinedAt: now,
      status: 'active',
      metadata: {},
    };

    const org: Organization = {
      id: orgId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: 'pending_setup',
      governanceConfig: this.buildGovernanceConfig(input.governanceConfig),
      treasuryConfig: this.buildTreasuryConfig(input.treasuryConfig),
      members: [ownerMember],
      agents: [],
      pools: [],
      compliance: this.buildCompliance(input.compliance),
      monetization: this.buildMonetization(input.monetization),
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };

    this.organizations.set(orgId, org);

    this.emitEvent('organization_created', orgId, undefined, {
      name: input.name,
      type: input.type,
      creatorUserId: input.creatorUserId,
    });

    return org;
  }

  getOrganization(orgId: string): Organization | undefined {
    return this.organizations.get(orgId);
  }

  async updateOrganization(orgId: string, updates: UpdateOrganizationInput): Promise<Organization> {
    const org = this.organizations.get(orgId);
    if (!org) throw new Error(`Organization not found: ${orgId}`);

    if (updates.name) org.name = updates.name;
    if (updates.description) org.description = updates.description;
    if (updates.status) org.status = updates.status;
    if (updates.compliance) org.compliance = { ...org.compliance, ...updates.compliance };
    if (updates.metadata) org.metadata = { ...org.metadata, ...updates.metadata };

    org.updatedAt = new Date();

    this.emitEvent('organization_updated', orgId, undefined, { updates });

    return org;
  }

  async archiveOrganization(orgId: string, reason: string): Promise<boolean> {
    const org = this.organizations.get(orgId);
    if (!org) return false;

    org.status = 'archived';
    org.updatedAt = new Date();
    org.metadata.archiveReason = reason;

    return true;
  }

  listOrganizations(filters?: OrganizationFilters): Organization[] {
    let orgs = Array.from(this.organizations.values());

    if (filters) {
      if (filters.type && filters.type.length > 0) {
        orgs = orgs.filter((o) => filters.type!.includes(o.type));
      }
      if (filters.status && filters.status.length > 0) {
        orgs = orgs.filter((o) => filters.status!.includes(o.status));
      }
      if (filters.creatorUserId) {
        orgs = orgs.filter((o) =>
          o.members.some((m) => m.userId === filters.creatorUserId && m.role === 'owner')
        );
      }
    }

    return orgs;
  }

  // ============================================================================
  // Member Management
  // ============================================================================

  async addMember(input: AddMemberInput): Promise<OrganizationMember> {
    const org = this.organizations.get(input.organizationId);
    if (!org) throw new Error(`Organization not found: ${input.organizationId}`);

    if (org.members.length >= (this.config.maxMembersPerOrganization ?? 1000)) {
      throw new Error('Maximum members reached');
    }

    // Check if user already a member
    if (org.members.some((m) => m.userId === input.userId)) {
      throw new Error('User is already a member');
    }

    const member: OrganizationMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: input.userId,
      organizationId: input.organizationId,
      role: input.role,
      email: input.email,
      name: input.name,
      permissions: DEFAULT_ROLE_PERMISSIONS[input.role],
      votingPower: input.votingPower ?? this.getDefaultVotingPower(input.role),
      joinedAt: new Date(),
      status: 'active',
      metadata: { invitedBy: input.invitedBy },
    };

    org.members.push(member);
    org.updatedAt = new Date();

    this.emitEvent('member_added', input.organizationId, undefined, {
      memberId: member.id,
      userId: input.userId,
      role: input.role,
    });

    return member;
  }

  async updateMember(
    orgId: string,
    memberId: string,
    updates: UpdateMemberInput
  ): Promise<OrganizationMember> {
    const org = this.organizations.get(orgId);
    if (!org) throw new Error(`Organization not found: ${orgId}`);

    const member = org.members.find((m) => m.id === memberId);
    if (!member) throw new Error(`Member not found: ${memberId}`);

    if (updates.role) {
      member.role = updates.role;
      member.permissions = { ...DEFAULT_ROLE_PERMISSIONS[updates.role], ...updates.permissions };
    }
    if (updates.permissions) {
      member.permissions = { ...member.permissions, ...updates.permissions };
    }
    if (updates.votingPower !== undefined) {
      member.votingPower = updates.votingPower;
    }
    if (updates.status) {
      member.status = updates.status;
    }

    org.updatedAt = new Date();
    return member;
  }

  async removeMember(orgId: string, memberId: string, reason: string): Promise<boolean> {
    const org = this.organizations.get(orgId);
    if (!org) return false;

    const memberIndex = org.members.findIndex((m) => m.id === memberId);
    if (memberIndex === -1) return false;

    const member = org.members[memberIndex];

    // Cannot remove owner
    if (member.role === 'owner') {
      throw new Error('Cannot remove the owner');
    }

    member.status = 'removed';
    org.updatedAt = new Date();

    this.emitEvent('member_removed', orgId, undefined, {
      memberId,
      userId: member.userId,
      reason,
    });

    return true;
  }

  getMember(orgId: string, userId: string): OrganizationMember | undefined {
    const org = this.organizations.get(orgId);
    return org?.members.find((m) => m.userId === userId && m.status === 'active');
  }

  listMembers(orgId: string): OrganizationMember[] {
    return this.organizations.get(orgId)?.members ?? [];
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  async assignRole(orgId: string, memberId: string, role: OrganizationRole): Promise<void> {
    await this.updateMember(orgId, memberId, { role });
  }

  getPermissionsForRole(role: OrganizationRole): MemberPermissions {
    return { ...DEFAULT_ROLE_PERMISSIONS[role] };
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  async updateGovernanceConfig(
    orgId: string,
    config: Partial<GovernanceConfig>
  ): Promise<Organization> {
    const org = this.organizations.get(orgId);
    if (!org) throw new Error(`Organization not found: ${orgId}`);

    org.governanceConfig = { ...org.governanceConfig, ...config };
    org.updatedAt = new Date();
    return org;
  }

  async updateTreasuryConfig(
    orgId: string,
    config: Partial<TreasuryConfig>
  ): Promise<Organization> {
    const org = this.organizations.get(orgId);
    if (!org) throw new Error(`Organization not found: ${orgId}`);

    org.treasuryConfig = { ...org.treasuryConfig, ...config };
    org.updatedAt = new Date();
    return org;
  }

  async updateMonetization(
    orgId: string,
    config: Partial<OrganizationMonetization>
  ): Promise<Organization> {
    const org = this.organizations.get(orgId);
    if (!org) throw new Error(`Organization not found: ${orgId}`);

    org.monetization = { ...org.monetization, ...config };
    org.updatedAt = new Date();
    return org;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: LaunchpadEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private buildGovernanceConfig(input?: Partial<GovernanceConfig>): GovernanceConfig {
    return {
      type: input?.type ?? 'token_voting',
      votingPeriodHours: input?.votingPeriodHours ?? 72,
      quorumPercent: input?.quorumPercent ?? 10,
      approvalThresholdPercent: input?.approvalThresholdPercent ?? 50,
      vetoEnabled: input?.vetoEnabled ?? false,
      vetoThresholdPercent: input?.vetoThresholdPercent ?? 33,
      timelockHours: input?.timelockHours ?? 24,
      delegationEnabled: input?.delegationEnabled ?? true,
      executionDelay: input?.executionDelay ?? 0,
    };
  }

  private buildTreasuryConfig(input?: Partial<TreasuryConfig>): TreasuryConfig {
    return {
      multiSigRequired: input?.multiSigRequired ?? false,
      multiSigThreshold: input?.multiSigThreshold ?? 2,
      signers: input?.signers ?? [],
      withdrawalLimits: input?.withdrawalLimits ?? {
        dailyLimit: 10000,
        singleTransactionLimit: 5000,
        monthlyLimit: 100000,
        cooldownMinutes: 60,
        requiresApproval: true,
        approvalThreshold: 2,
      },
      inboundRules: input?.inboundRules ?? [],
      outboundRules: input?.outboundRules ?? [],
    };
  }

  private buildCompliance(input?: Partial<OrganizationCompliance>): OrganizationCompliance {
    return {
      kycRequired: input?.kycRequired ?? false,
      accreditedOnly: input?.accreditedOnly ?? false,
      jurisdictionRestrictions: input?.jurisdictionRestrictions ?? [],
      auditEnabled: input?.auditEnabled ?? true,
      auditFrequency: input?.auditFrequency ?? 'monthly',
    };
  }

  private buildMonetization(input?: Partial<OrganizationMonetization>): OrganizationMonetization {
    return {
      managementFeePercent: input?.managementFeePercent ?? 2,
      performanceFeePercent: input?.performanceFeePercent ?? 20,
      highWaterMark: input?.highWaterMark ?? true,
      feeRecipient: input?.feeRecipient ?? '',
      revenueShareEnabled: input?.revenueShareEnabled ?? false,
      revenueShareConfig: input?.revenueShareConfig,
    };
  }

  private getDefaultVotingPower(role: OrganizationRole): number {
    switch (role) {
      case 'owner':
        return 100;
      case 'admin':
        return 50;
      case 'treasury_manager':
        return 30;
      case 'strategy_manager':
        return 30;
      case 'risk_manager':
        return 20;
      case 'contributor':
        return 10;
      case 'viewer':
        return 0;
      default:
        return 0;
    }
  }

  private emitEvent(
    type: LaunchpadEvent['type'],
    organizationId: string,
    agentId?: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: LaunchpadEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      organizationId,
      agentId,
      timestamp: new Date(),
      data,
      severity: 'info',
      metadata: {},
    };

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

export function createOrganizationManager(
  config?: Partial<OrganizationManagerConfig>
): DefaultOrganizationManager {
  return new DefaultOrganizationManager(config);
}
