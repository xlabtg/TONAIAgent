/**
 * TONAIAgent - Shared Portfolio Access Framework
 *
 * Manages shared portfolios that multiple users can collaborate on.
 * Handles portfolio creation, member management, and access control
 * for institutional and collaborative investment use cases.
 */

import {
  SharedPortfolio,
  SharedPortfolioStatus,
  SharedPortfolioSettings,
  PortfolioMember,
  CreateSharedPortfolioInput,
  AddPortfolioMemberInput,
  PortfolioRoleName,
  MultiUserPortfolioEvent,
  MultiUserPortfolioEventCallback,
} from './types';
import {
  DefaultPortfolioPermissionsManager,
  createPortfolioPermissionsManager,
} from './permissions';

const DEFAULT_PORTFOLIO_SETTINGS: SharedPortfolioSettings = {
  requireApprovalForTrades: false,
  requireApprovalAboveUsd: 10000,
  allowAnalystProposals: true,
  notifyOnTrades: true,
  notifyOnStrategyChanges: true,
  reportingFrequency: 'monthly',
};

// ============================================================================
// Shared Portfolio Manager Interface
// ============================================================================

export interface SharedPortfolioManager {
  createPortfolio(input: CreateSharedPortfolioInput): Promise<SharedPortfolio>;
  getPortfolio(portfolioId: string): SharedPortfolio | undefined;
  listPortfolios(ownerId?: string): SharedPortfolio[];
  updatePortfolio(
    portfolioId: string,
    updates: Partial<Pick<SharedPortfolio, 'name' | 'description' | 'settings' | 'metadata'>>,
    actorId: string,
  ): Promise<SharedPortfolio>;
  archivePortfolio(portfolioId: string, actorId: string): Promise<SharedPortfolio>;

  addMember(input: AddPortfolioMemberInput): Promise<PortfolioMember>;
  removeMember(portfolioId: string, userId: string, actorId: string): Promise<void>;
  updateMemberRole(
    portfolioId: string,
    userId: string,
    newRole: PortfolioRoleName,
    actorId: string,
  ): Promise<PortfolioMember>;
  getMembers(portfolioId: string): PortfolioMember[];
  getMember(portfolioId: string, userId: string): PortfolioMember | undefined;
  suspendMember(portfolioId: string, userId: string, actorId: string): Promise<PortfolioMember>;
  reactivateMember(portfolioId: string, userId: string, actorId: string): Promise<PortfolioMember>;

  updatePortfolioValue(portfolioId: string, totalValueUsd: number): Promise<SharedPortfolio>;
  updatePortfolioStatus(
    portfolioId: string,
    status: SharedPortfolioStatus,
    actorId: string,
  ): Promise<SharedPortfolio>;
  recordMemberActivity(portfolioId: string, userId: string): void;

  onEvent(callback: MultiUserPortfolioEventCallback): void;
}

// ============================================================================
// Default Shared Portfolio Manager Implementation
// ============================================================================

export class DefaultSharedPortfolioManager implements SharedPortfolioManager {
  private readonly portfolios = new Map<string, SharedPortfolio>();
  private readonly eventCallbacks: MultiUserPortfolioEventCallback[] = [];
  readonly permissions: DefaultPortfolioPermissionsManager;

  constructor() {
    this.permissions = createPortfolioPermissionsManager();
    this.permissions.onEvent(event => this.emitEvent(event));
  }

  async createPortfolio(input: CreateSharedPortfolioInput): Promise<SharedPortfolio> {
    const portfolioId = `portfolio_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const ownerMemberId = `member_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ownerMember: PortfolioMember = {
      id: ownerMemberId,
      portfolioId,
      userId: input.ownerId,
      role: 'owner',
      invitedBy: input.ownerId,
      joinedAt: now,
      status: 'active',
      permissions: this.permissions.resolvePermissions('owner'),
      lastActivityAt: now,
    };

    const members: PortfolioMember[] = [ownerMember];

    // Add initial members if provided
    if (input.initialMembers) {
      for (const initMember of input.initialMembers) {
        if (initMember.userId === input.ownerId) continue; // Skip if same as owner
        const memberId = `member_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        members.push({
          id: memberId,
          portfolioId,
          userId: initMember.userId,
          role: initMember.role,
          invitedBy: input.ownerId,
          joinedAt: now,
          status: 'active',
          permissions: this.permissions.resolvePermissions(initMember.role),
        });
      }
    }

    const portfolio: SharedPortfolio = {
      id: portfolioId,
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      status: 'active',
      members,
      totalValueUsd: 0,
      currency: 'USD',
      createdAt: now,
      updatedAt: now,
      metadata: {
        tags: [],
        riskTolerance: 'medium',
        ...input.metadata,
      },
      settings: {
        ...DEFAULT_PORTFOLIO_SETTINGS,
        ...input.settings,
      },
    };

    this.portfolios.set(portfolioId, portfolio);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: 'portfolio_created',
      portfolioId,
      actorId: input.ownerId,
      severity: 'info',
      source: 'SharedPortfolioManager',
      message: `Portfolio '${input.name}' created`,
      data: { portfolioId, name: input.name, memberCount: members.length },
    });

    return portfolio;
  }

  getPortfolio(portfolioId: string): SharedPortfolio | undefined {
    return this.portfolios.get(portfolioId);
  }

  listPortfolios(ownerId?: string): SharedPortfolio[] {
    const all = Array.from(this.portfolios.values());
    if (ownerId) {
      return all.filter(p => p.ownerId === ownerId || p.members.some(m => m.userId === ownerId));
    }
    return all;
  }

  async updatePortfolio(
    portfolioId: string,
    updates: Partial<Pick<SharedPortfolio, 'name' | 'description' | 'settings' | 'metadata'>>,
    actorId: string,
  ): Promise<SharedPortfolio> {
    const portfolio = this.requirePortfolio(portfolioId);

    const updated: SharedPortfolio = {
      ...portfolio,
      ...updates,
      settings: updates.settings ? { ...portfolio.settings, ...updates.settings } : portfolio.settings,
      metadata: updates.metadata ? { ...portfolio.metadata, ...updates.metadata } : portfolio.metadata,
      updatedAt: new Date(),
    };

    this.portfolios.set(portfolioId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'portfolio_updated',
      portfolioId,
      actorId,
      severity: 'info',
      source: 'SharedPortfolioManager',
      message: `Portfolio '${portfolio.name}' updated`,
      data: { portfolioId, updates: Object.keys(updates) },
    });

    return updated;
  }

  async archivePortfolio(portfolioId: string, actorId: string): Promise<SharedPortfolio> {
    return this.updatePortfolioStatus(portfolioId, 'archived', actorId);
  }

  async addMember(input: AddPortfolioMemberInput): Promise<PortfolioMember> {
    const portfolio = this.requirePortfolio(input.portfolioId);

    // Check if already a member
    const existing = portfolio.members.find(m => m.userId === input.userId);
    if (existing) {
      throw new Error(`User ${input.userId} is already a member of portfolio ${input.portfolioId}`);
    }

    const now = new Date();
    const member: PortfolioMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      portfolioId: input.portfolioId,
      userId: input.userId,
      role: input.role,
      invitedBy: input.invitedBy,
      joinedAt: now,
      status: 'active',
      permissions: this.permissions.resolvePermissions(input.role),
    };

    const updatedPortfolio: SharedPortfolio = {
      ...portfolio,
      members: [...portfolio.members, member],
      updatedAt: now,
    };

    this.portfolios.set(input.portfolioId, updatedPortfolio);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: 'member_added',
      portfolioId: input.portfolioId,
      actorId: input.invitedBy,
      severity: 'info',
      source: 'SharedPortfolioManager',
      message: `Member ${input.userId} added with role '${input.role}'`,
      data: { memberId: member.id, userId: input.userId, role: input.role },
    });

    return member;
  }

  async removeMember(portfolioId: string, userId: string, actorId: string): Promise<void> {
    const portfolio = this.requirePortfolio(portfolioId);

    const member = portfolio.members.find(m => m.userId === userId);
    if (!member) {
      throw new Error(`User ${userId} is not a member of portfolio ${portfolioId}`);
    }

    if (member.role === 'owner') {
      throw new Error('Cannot remove the portfolio owner. Transfer ownership first.');
    }

    const updatedPortfolio: SharedPortfolio = {
      ...portfolio,
      members: portfolio.members.filter(m => m.userId !== userId),
      updatedAt: new Date(),
    };

    this.portfolios.set(portfolioId, updatedPortfolio);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'member_removed',
      portfolioId,
      actorId,
      severity: 'info',
      source: 'SharedPortfolioManager',
      message: `Member ${userId} removed from portfolio`,
      data: { userId, removedBy: actorId },
    });
  }

  async updateMemberRole(
    portfolioId: string,
    userId: string,
    newRole: PortfolioRoleName,
    actorId: string,
  ): Promise<PortfolioMember> {
    const portfolio = this.requirePortfolio(portfolioId);

    const memberIndex = portfolio.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      throw new Error(`User ${userId} is not a member of portfolio ${portfolioId}`);
    }

    const member = portfolio.members[memberIndex];
    if (member.role === 'owner' && newRole !== 'owner') {
      throw new Error('Cannot change the owner role. Transfer ownership explicitly.');
    }

    const updatedMember: PortfolioMember = {
      ...member,
      role: newRole,
      permissions: this.permissions.resolvePermissions(newRole),
    };

    const updatedMembers = [...portfolio.members];
    updatedMembers[memberIndex] = updatedMember;

    this.portfolios.set(portfolioId, {
      ...portfolio,
      members: updatedMembers,
      updatedAt: new Date(),
    });

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'member_added', // reuse for role change event
      portfolioId,
      actorId,
      severity: 'info',
      source: 'SharedPortfolioManager',
      message: `Member ${userId} role updated from '${member.role}' to '${newRole}'`,
      data: { userId, oldRole: member.role, newRole },
    });

    return updatedMember;
  }

  getMembers(portfolioId: string): PortfolioMember[] {
    return this.requirePortfolio(portfolioId).members;
  }

  getMember(portfolioId: string, userId: string): PortfolioMember | undefined {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return undefined;
    return portfolio.members.find(m => m.userId === userId);
  }

  async suspendMember(
    portfolioId: string,
    userId: string,
    actorId: string,
  ): Promise<PortfolioMember> {
    return this.changeMemberStatus(portfolioId, userId, 'suspended', actorId);
  }

  async reactivateMember(
    portfolioId: string,
    userId: string,
    actorId: string,
  ): Promise<PortfolioMember> {
    return this.changeMemberStatus(portfolioId, userId, 'active', actorId);
  }

  async updatePortfolioValue(
    portfolioId: string,
    totalValueUsd: number,
  ): Promise<SharedPortfolio> {
    const portfolio = this.requirePortfolio(portfolioId);

    const updated: SharedPortfolio = {
      ...portfolio,
      totalValueUsd,
      updatedAt: new Date(),
    };

    this.portfolios.set(portfolioId, updated);
    return updated;
  }

  async updatePortfolioStatus(
    portfolioId: string,
    status: SharedPortfolioStatus,
    actorId: string,
  ): Promise<SharedPortfolio> {
    const portfolio = this.requirePortfolio(portfolioId);

    const updated: SharedPortfolio = {
      ...portfolio,
      status,
      updatedAt: new Date(),
    };

    this.portfolios.set(portfolioId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'portfolio_updated',
      portfolioId,
      actorId,
      severity: 'info',
      source: 'SharedPortfolioManager',
      message: `Portfolio '${portfolio.name}' status changed to '${status}'`,
      data: { portfolioId, oldStatus: portfolio.status, newStatus: status },
    });

    return updated;
  }

  recordMemberActivity(portfolioId: string, userId: string): void {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return;

    const memberIndex = portfolio.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) return;

    const updatedMembers = [...portfolio.members];
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      lastActivityAt: new Date(),
    };

    this.portfolios.set(portfolioId, {
      ...portfolio,
      members: updatedMembers,
    });
  }

  onEvent(callback: MultiUserPortfolioEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private requirePortfolio(portfolioId: string): SharedPortfolio {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }
    return portfolio;
  }

  private async changeMemberStatus(
    portfolioId: string,
    userId: string,
    status: PortfolioMember['status'],
    actorId: string,
  ): Promise<PortfolioMember> {
    const portfolio = this.requirePortfolio(portfolioId);

    const memberIndex = portfolio.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      throw new Error(`User ${userId} is not a member of portfolio ${portfolioId}`);
    }

    const updatedMember: PortfolioMember = {
      ...portfolio.members[memberIndex],
      status,
    };

    const updatedMembers = [...portfolio.members];
    updatedMembers[memberIndex] = updatedMember;

    this.portfolios.set(portfolioId, {
      ...portfolio,
      members: updatedMembers,
      updatedAt: new Date(),
    });

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'portfolio_updated',
      portfolioId,
      actorId,
      severity: 'info',
      source: 'SharedPortfolioManager',
      message: `Member ${userId} status changed to '${status}'`,
      data: { userId, status, changedBy: actorId },
    });

    return updatedMember;
  }

  private emitEvent(event: MultiUserPortfolioEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore callback errors */ }
    }
  }
}

export function createSharedPortfolioManager(): DefaultSharedPortfolioManager {
  return new DefaultSharedPortfolioManager();
}
