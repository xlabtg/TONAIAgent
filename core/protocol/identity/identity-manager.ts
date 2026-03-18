/**
 * TONAIAgent - Open Agent Protocol Identity Manager
 *
 * Manages agent identities according to the Open Agent Protocol standard.
 * Handles creation, verification, ownership transfer, and delegation.
 */

import {
  AgentId,
  AgentIdentity,
  AgentOwnership,
  NetworkId,
  OwnerPermissions,
  OnChainIdentity,
} from '../types';

import {
  IdentityManagerConfig,
  CreateIdentityInput,
  UpdateIdentityInput,
  TransferOwnershipInput,
  DelegateControlInput,
  DelegationRecord,
  VerifyIdentityInput,
  VerifyIdentityResult,
  IdentityLookupOptions,
  IdentitySearchCriteria,
  IdentitySearchResult,
  OnChainRegistrationInput,
  OnChainRegistrationResult,
  IdentityEvent,
  IdentityEventHandler,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const PROTOCOL_VERSION = '1.0.0';
const DEFAULT_CACHE_TTL = 300000; // 5 minutes

// ============================================================================
// Identity Manager Interface
// ============================================================================

/**
 * Identity manager interface
 */
export interface IdentityManager {
  /** Create a new agent identity */
  createIdentity(input: CreateIdentityInput): Promise<AgentIdentity>;

  /** Get agent identity by ID */
  getIdentity(agentId: AgentId, options?: IdentityLookupOptions): Promise<AgentIdentity | undefined>;

  /** Update agent identity */
  updateIdentity(input: UpdateIdentityInput): Promise<AgentIdentity>;

  /** Delete agent identity */
  deleteIdentity(agentId: AgentId): Promise<boolean>;

  /** Transfer ownership */
  transferOwnership(input: TransferOwnershipInput): Promise<AgentIdentity>;

  /** Delegate control */
  delegateControl(input: DelegateControlInput): Promise<DelegationRecord>;

  /** Revoke delegation */
  revokeDelegation(agentId: AgentId, delegatee: string): Promise<boolean>;

  /** Get delegations for agent */
  getDelegations(agentId: AgentId): Promise<DelegationRecord[]>;

  /** Verify identity */
  verifyIdentity(input: VerifyIdentityInput): Promise<VerifyIdentityResult>;

  /** Search identities */
  searchIdentities(criteria: IdentitySearchCriteria): Promise<IdentitySearchResult>;

  /** Register identity on-chain */
  registerOnChain(input: OnChainRegistrationInput): Promise<OnChainRegistrationResult>;

  /** Generate agent ID */
  generateAgentId(): AgentId;

  /** Parse agent ID */
  parseAgentId(agentId: AgentId): ParsedAgentId | null;

  /** Subscribe to identity events */
  subscribe(handler: IdentityEventHandler): () => void;
}

/**
 * Parsed agent ID components
 */
export interface ParsedAgentId {
  network: NetworkId;
  ownerType: string;
  ownerId: string;
  agentId: string;
}

// ============================================================================
// Default Implementation
// ============================================================================

/**
 * Default identity manager implementation
 */
export class DefaultIdentityManager implements IdentityManager {
  private config: IdentityManagerConfig;
  private identities: Map<AgentId, AgentIdentity> = new Map();
  private delegations: Map<AgentId, DelegationRecord[]> = new Map();
  private cache: Map<AgentId, { identity: AgentIdentity; expiresAt: number }> = new Map();
  private eventHandlers: Set<IdentityEventHandler> = new Set();

  constructor(config: Partial<IdentityManagerConfig> = {}) {
    this.config = {
      network: config.network ?? 'ton',
      rpcUrl: config.rpcUrl,
      enableOnChain: config.enableOnChain ?? false,
      enableCache: config.enableCache ?? true,
      cacheTtl: config.cacheTtl ?? DEFAULT_CACHE_TTL,
    };
  }

  /**
   * Create a new agent identity
   */
  async createIdentity(input: CreateIdentityInput): Promise<AgentIdentity> {
    const agentId = this.generateAgentId();
    const now = new Date();

    const ownership: AgentOwnership = {
      type: input.ownerType,
      ownerId: input.ownerId,
      ownerAddress: input.ownerAddress,
      delegatedTo: [],
      permissions: this.getDefaultOwnerPermissions(),
    };

    const identity: AgentIdentity = {
      id: this.formatAgentId(agentId, input.ownerType, input.ownerId),
      name: input.name,
      protocolVersion: PROTOCOL_VERSION,
      network: this.config.network,
      ownership,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };

    // Store identity
    this.identities.set(identity.id, identity);

    // Register on-chain if requested
    if (input.registerOnChain && this.config.enableOnChain) {
      const onChainResult = await this.registerOnChain({
        agentId: identity.id,
        deployContract: true,
      });

      if (onChainResult.success && onChainResult.onChainIdentity) {
        identity.onChainIdentity = onChainResult.onChainIdentity;
      }
    }

    // Emit event
    this.emitEvent({
      type: 'identity.created',
      agentId: identity.id,
      data: { name: input.name, ownerType: input.ownerType },
      timestamp: now,
    });

    return identity;
  }

  /**
   * Get agent identity by ID
   */
  async getIdentity(
    agentId: AgentId,
    options: IdentityLookupOptions = {}
  ): Promise<AgentIdentity | undefined> {
    // Check cache first
    if (!options.skipCache && this.config.enableCache) {
      const cached = this.cache.get(agentId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.identity;
      }
    }

    const identity = this.identities.get(agentId);

    if (!identity) {
      return undefined;
    }

    // Include delegations if requested
    if (options.includeDelegations) {
      const delegations = await this.getDelegations(agentId);
      identity.ownership.delegatedTo = delegations
        .filter(d => d.active)
        .map(d => d.delegatee);
    }

    // Cache result
    if (this.config.enableCache) {
      this.cache.set(agentId, {
        identity,
        expiresAt: Date.now() + this.config.cacheTtl,
      });
    }

    return identity;
  }

  /**
   * Update agent identity
   */
  async updateIdentity(input: UpdateIdentityInput): Promise<AgentIdentity> {
    const identity = await this.getIdentity(input.agentId, { skipCache: true });

    if (!identity) {
      throw new Error(`Identity not found: ${input.agentId}`);
    }

    // Update fields
    if (input.name !== undefined) {
      identity.name = input.name;
    }

    if (input.metadata !== undefined) {
      identity.metadata = { ...identity.metadata, ...input.metadata };
    }

    identity.updatedAt = new Date();

    // Update storage
    this.identities.set(identity.id, identity);

    // Invalidate cache
    this.cache.delete(identity.id);

    // Emit event
    this.emitEvent({
      type: 'identity.updated',
      agentId: identity.id,
      data: { name: input.name, metadata: input.metadata },
      timestamp: identity.updatedAt,
    });

    return identity;
  }

  /**
   * Delete agent identity
   */
  async deleteIdentity(agentId: AgentId): Promise<boolean> {
    const identity = this.identities.get(agentId);

    if (!identity) {
      return false;
    }

    // Remove identity
    this.identities.delete(agentId);

    // Remove delegations
    this.delegations.delete(agentId);

    // Invalidate cache
    this.cache.delete(agentId);

    return true;
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(input: TransferOwnershipInput): Promise<AgentIdentity> {
    const identity = await this.getIdentity(input.agentId, { skipCache: true });

    if (!identity) {
      throw new Error(`Identity not found: ${input.agentId}`);
    }

    // Verify current owner can transfer
    if (!identity.ownership.permissions.canTransfer) {
      throw new Error('Current owner cannot transfer ownership');
    }

    const previousOwner = {
      type: identity.ownership.type,
      ownerId: identity.ownership.ownerId,
    };

    // Update ownership
    identity.ownership = {
      type: input.newOwnerType,
      ownerId: input.newOwnerId,
      ownerAddress: input.newOwnerAddress,
      delegatedTo: [],
      permissions: this.getDefaultOwnerPermissions(),
    };

    // Generate new ID with updated ownership
    identity.id = this.formatAgentId(
      this.extractAgentIdPart(input.agentId),
      input.newOwnerType,
      input.newOwnerId
    );

    identity.updatedAt = new Date();

    // Update storage (remove old, add new)
    this.identities.delete(input.agentId);
    this.identities.set(identity.id, identity);

    // Revoke all delegations
    this.delegations.delete(input.agentId);

    // Invalidate cache
    this.cache.delete(input.agentId);

    // Emit event
    this.emitEvent({
      type: 'identity.transferred',
      agentId: identity.id,
      data: {
        previousOwner,
        newOwner: { type: input.newOwnerType, ownerId: input.newOwnerId },
      },
      timestamp: identity.updatedAt,
    });

    return identity;
  }

  /**
   * Delegate control
   */
  async delegateControl(input: DelegateControlInput): Promise<DelegationRecord> {
    const identity = await this.getIdentity(input.agentId);

    if (!identity) {
      throw new Error(`Identity not found: ${input.agentId}`);
    }

    // Verify owner can delegate
    if (!identity.ownership.permissions.canDelegate) {
      throw new Error('Owner cannot delegate control');
    }

    const now = new Date();

    const delegation: DelegationRecord = {
      id: this.generateDelegationId(),
      agentId: input.agentId,
      delegator: identity.ownership.ownerAddress ?? identity.ownership.ownerId,
      delegatee: input.delegateTo,
      permissions: input.permissions,
      createdAt: now,
      expiresAt: input.expiresAt,
      active: true,
    };

    // Store delegation
    const existing = this.delegations.get(input.agentId) ?? [];
    existing.push(delegation);
    this.delegations.set(input.agentId, existing);

    // Update identity delegatedTo
    identity.ownership.delegatedTo = identity.ownership.delegatedTo ?? [];
    identity.ownership.delegatedTo.push(input.delegateTo);
    identity.updatedAt = now;

    // Invalidate cache
    this.cache.delete(input.agentId);

    // Emit event
    this.emitEvent({
      type: 'identity.delegated',
      agentId: input.agentId,
      data: { delegatee: input.delegateTo, permissions: input.permissions },
      timestamp: now,
    });

    return delegation;
  }

  /**
   * Revoke delegation
   */
  async revokeDelegation(agentId: AgentId, delegatee: string): Promise<boolean> {
    const delegations = this.delegations.get(agentId);

    if (!delegations) {
      return false;
    }

    const delegation = delegations.find(d => d.delegatee === delegatee && d.active);

    if (!delegation) {
      return false;
    }

    delegation.active = false;

    // Update identity delegatedTo
    const identity = await this.getIdentity(agentId, { skipCache: true });
    if (identity) {
      identity.ownership.delegatedTo = identity.ownership.delegatedTo?.filter(
        d => d !== delegatee
      );
      identity.updatedAt = new Date();
    }

    // Invalidate cache
    this.cache.delete(agentId);

    // Emit event
    this.emitEvent({
      type: 'identity.revoked',
      agentId,
      data: { delegatee },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get delegations for agent
   */
  async getDelegations(agentId: AgentId): Promise<DelegationRecord[]> {
    const delegations = this.delegations.get(agentId) ?? [];

    // Filter expired delegations
    const now = new Date();
    return delegations.filter(d => {
      if (!d.active) return false;
      if (d.expiresAt && d.expiresAt < now) {
        d.active = false;
        return false;
      }
      return true;
    });
  }

  /**
   * Verify identity
   */
  async verifyIdentity(input: VerifyIdentityInput): Promise<VerifyIdentityResult> {
    const identity = await this.getIdentity(input.agentId);

    if (!identity) {
      return {
        valid: false,
        error: 'Identity not found',
      };
    }

    // Verify signature
    const isValid = this.verifySignature(
      input.challenge,
      input.signature,
      input.publicKey
    );

    if (!isValid) {
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }

    // Store proof
    identity.proof = {
      type: 'signature',
      data: input.signature,
      verifier: input.publicKey,
      timestamp: new Date(),
    };

    // Emit event
    this.emitEvent({
      type: 'identity.verified',
      agentId: input.agentId,
      data: { publicKey: input.publicKey },
      timestamp: new Date(),
    });

    return {
      valid: true,
      identity,
    };
  }

  /**
   * Search identities
   */
  async searchIdentities(criteria: IdentitySearchCriteria): Promise<IdentitySearchResult> {
    let results = Array.from(this.identities.values());

    // Apply filters
    if (criteria.ownerId) {
      results = results.filter(i => i.ownership.ownerId === criteria.ownerId);
    }

    if (criteria.ownerType) {
      results = results.filter(i => i.ownership.type === criteria.ownerType);
    }

    if (criteria.network) {
      results = results.filter(i => i.network === criteria.network);
    }

    if (criteria.verified !== undefined) {
      results = results.filter(i => {
        const verified = i.onChainIdentity?.verified ?? false;
        return verified === criteria.verified;
      });
    }

    if (criteria.nameContains) {
      const search = criteria.nameContains.toLowerCase();
      results = results.filter(i => i.name.toLowerCase().includes(search));
    }

    const total = results.length;

    // Apply pagination
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return {
      identities: results,
      total,
      hasMore: offset + results.length < total,
    };
  }

  /**
   * Register identity on-chain
   */
  async registerOnChain(input: OnChainRegistrationInput): Promise<OnChainRegistrationResult> {
    if (!this.config.enableOnChain) {
      return {
        success: false,
        error: 'On-chain registration is not enabled',
      };
    }

    const identity = await this.getIdentity(input.agentId, { skipCache: true });

    if (!identity) {
      return {
        success: false,
        error: 'Identity not found',
      };
    }

    // Simulate on-chain registration
    // In production, this would interact with TON blockchain
    const contractAddress = this.generateContractAddress();
    const transactionHash = this.generateTransactionHash();

    const onChainIdentity: OnChainIdentity = {
      domainName: input.domainName,
      contractAddress: input.deployContract ? contractAddress : undefined,
      registrationTx: transactionHash,
      verified: true,
      verifiedAt: new Date(),
    };

    identity.onChainIdentity = onChainIdentity;
    identity.updatedAt = new Date();

    // Invalidate cache
    this.cache.delete(input.agentId);

    // Emit event
    this.emitEvent({
      type: 'identity.registered_onchain',
      agentId: input.agentId,
      data: { contractAddress, transactionHash },
      timestamp: new Date(),
    });

    return {
      success: true,
      onChainIdentity,
      transactionHash,
    };
  }

  /**
   * Generate agent ID
   */
  generateAgentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `agent_${timestamp}_${random}`;
  }

  /**
   * Parse agent ID
   */
  parseAgentId(agentId: AgentId): ParsedAgentId | null {
    const match = agentId.match(/^oap:\/\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);

    if (!match) {
      return null;
    }

    return {
      network: match[1] as NetworkId,
      ownerType: match[2],
      ownerId: match[3],
      agentId: match[4],
    };
  }

  /**
   * Subscribe to identity events
   */
  subscribe(handler: IdentityEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private formatAgentId(agentId: string, ownerType: string, ownerId: string): AgentId {
    return `oap://${this.config.network}/${ownerType}/${ownerId}/${agentId}`;
  }

  private extractAgentIdPart(fullId: AgentId): string {
    const parsed = this.parseAgentId(fullId);
    return parsed?.agentId ?? fullId;
  }

  private getDefaultOwnerPermissions(): OwnerPermissions {
    return {
      canTransfer: true,
      canTerminate: true,
      canModifyPermissions: true,
      canWithdraw: true,
      canDelegate: true,
    };
  }

  private generateDelegationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `del_${timestamp}_${random}`;
  }

  private generateContractAddress(): string {
    const random = Math.random().toString(36).substring(2, 15);
    return `EQ${random.toUpperCase()}`;
  }

  private generateTransactionHash(): string {
    const random = Math.random().toString(16).substring(2, 66);
    return `0x${random}`;
  }

  private verifySignature(
    _challenge: string,
    _signature: string,
    _publicKey: string
  ): boolean {
    // Simplified verification - in production, use proper crypto
    return true;
  }

  private emitEvent(event: IdentityEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in identity event handler:', error);
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create identity manager
 */
export function createIdentityManager(
  config?: Partial<IdentityManagerConfig>
): IdentityManager {
  return new DefaultIdentityManager(config);
}
