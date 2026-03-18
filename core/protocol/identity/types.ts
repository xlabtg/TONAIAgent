/**
 * TONAIAgent - Open Agent Protocol Identity Types
 *
 * Types specific to the Agent Identity Standard module.
 */

import {
  AgentId,
  AgentIdentity,
  NetworkId,
  OwnerType,
  OnChainIdentity,
} from '../types';

// ============================================================================
// Identity Manager Types
// ============================================================================

/**
 * Identity manager configuration
 */
export interface IdentityManagerConfig {
  /** Network to operate on */
  network: NetworkId;

  /** RPC endpoint */
  rpcUrl?: string;

  /** Enable on-chain registration */
  enableOnChain: boolean;

  /** Enable identity caching */
  enableCache: boolean;

  /** Cache TTL in milliseconds */
  cacheTtl: number;
}

/**
 * Create identity input
 */
export interface CreateIdentityInput {
  /** Agent name */
  name: string;

  /** Owner type */
  ownerType: OwnerType;

  /** Owner identifier */
  ownerId: string;

  /** Owner address */
  ownerAddress?: string;

  /** Initial metadata */
  metadata?: Record<string, unknown>;

  /** Register on-chain */
  registerOnChain?: boolean;
}

/**
 * Update identity input
 */
export interface UpdateIdentityInput {
  /** Agent ID */
  agentId: AgentId;

  /** New name */
  name?: string;

  /** New metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Transfer ownership input
 */
export interface TransferOwnershipInput {
  /** Agent ID */
  agentId: AgentId;

  /** New owner type */
  newOwnerType: OwnerType;

  /** New owner ID */
  newOwnerId: string;

  /** New owner address */
  newOwnerAddress?: string;
}

/**
 * Delegate control input
 */
export interface DelegateControlInput {
  /** Agent ID */
  agentId: AgentId;

  /** Address to delegate to */
  delegateTo: string;

  /** Permissions to delegate */
  permissions: DelegatePermissions;

  /** Expiry date */
  expiresAt?: Date;
}

/**
 * Delegated permissions
 */
export interface DelegatePermissions {
  /** Can execute capabilities */
  canExecute: boolean;

  /** Can modify configuration */
  canConfigure: boolean;

  /** Can view data */
  canView: boolean;

  /** Allowed capabilities */
  allowedCapabilities?: string[];
}

/**
 * Delegation record
 */
export interface DelegationRecord {
  /** Delegation ID */
  id: string;

  /** Agent ID */
  agentId: AgentId;

  /** Delegator address */
  delegator: string;

  /** Delegatee address */
  delegatee: string;

  /** Permissions */
  permissions: DelegatePermissions;

  /** Created at */
  createdAt: Date;

  /** Expires at */
  expiresAt?: Date;

  /** Active status */
  active: boolean;
}

/**
 * Identity verification input
 */
export interface VerifyIdentityInput {
  /** Agent ID */
  agentId: AgentId;

  /** Challenge to sign */
  challenge: string;

  /** Signature */
  signature: string;

  /** Public key */
  publicKey: string;
}

/**
 * Identity verification result
 */
export interface VerifyIdentityResult {
  /** Valid signature */
  valid: boolean;

  /** Agent identity if valid */
  identity?: AgentIdentity;

  /** Error message if invalid */
  error?: string;
}

/**
 * Identity lookup options
 */
export interface IdentityLookupOptions {
  /** Include delegations */
  includeDelegations?: boolean;

  /** Include on-chain data */
  includeOnChain?: boolean;

  /** Skip cache */
  skipCache?: boolean;
}

/**
 * Identity search criteria
 */
export interface IdentitySearchCriteria {
  /** Filter by owner */
  ownerId?: string;

  /** Filter by owner type */
  ownerType?: OwnerType;

  /** Filter by network */
  network?: NetworkId;

  /** Filter by verification status */
  verified?: boolean;

  /** Search in name */
  nameContains?: string;

  /** Pagination offset */
  offset?: number;

  /** Pagination limit */
  limit?: number;
}

/**
 * Identity search result
 */
export interface IdentitySearchResult {
  /** Found identities */
  identities: AgentIdentity[];

  /** Total count */
  total: number;

  /** Has more results */
  hasMore: boolean;
}

// ============================================================================
// On-Chain Registration Types
// ============================================================================

/**
 * On-chain registration input
 */
export interface OnChainRegistrationInput {
  /** Agent ID */
  agentId: AgentId;

  /** Domain name to register */
  domainName?: string;

  /** Deploy agent contract */
  deployContract?: boolean;

  /** Initial contract parameters */
  contractParams?: Record<string, unknown>;
}

/**
 * On-chain registration result
 */
export interface OnChainRegistrationResult {
  /** Success status */
  success: boolean;

  /** On-chain identity */
  onChainIdentity?: OnChainIdentity;

  /** Transaction hash */
  transactionHash?: string;

  /** Error message */
  error?: string;
}

// ============================================================================
// Identity Events
// ============================================================================

/**
 * Identity event types
 */
export type IdentityEventType =
  | 'identity.created'
  | 'identity.updated'
  | 'identity.transferred'
  | 'identity.delegated'
  | 'identity.revoked'
  | 'identity.verified'
  | 'identity.registered_onchain';

/**
 * Identity event
 */
export interface IdentityEvent {
  /** Event type */
  type: IdentityEventType;

  /** Agent ID */
  agentId: AgentId;

  /** Event data */
  data: Record<string, unknown>;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Identity event handler
 */
export type IdentityEventHandler = (event: IdentityEvent) => void;
