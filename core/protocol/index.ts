/**
 * TONAIAgent - Open Agent Protocol
 *
 * An open, modular, and interoperable protocol that standardizes how autonomous
 * financial agents operate, communicate, and interact across ecosystems.
 *
 * The Open Agent Protocol (OAP) establishes a universal standard for:
 * - AI agents
 * - Financial automation
 * - Strategy execution
 * - Governance
 * - Interoperability
 *
 * Key Components:
 * 1. Agent Identity Standard - Unique IDs, ownership, delegation
 * 2. Capability Framework - Standardized capabilities and execution
 * 3. Messaging & Coordination - Pub/sub, request/response, orchestration
 * 4. Security & Permissions - Policies, guardrails, authorization
 * 5. Reputation & Trust - Scoring, performance tracking, verification
 * 6. Plugin & Tool Ecosystem - Extensibility and integrations
 * 7. Cross-Chain Compatibility - Multi-chain support and bridging
 * 8. Protocol Governance - Proposals, voting, decentralized decisions
 */

// Core types
export * from './types';

// Identity module
export * as Identity from './identity';
export {
  createIdentityManager,
  DefaultIdentityManager,
  type IdentityManager,
  type IdentityManagerConfig,
  type CreateIdentityInput,
  type UpdateIdentityInput,
  type TransferOwnershipInput,
  type DelegateControlInput,
  type IdentityEvent,
  type IdentityEventHandler,
} from './identity';

// Capability module
export * as Capability from './capability';
export {
  createCapabilityRegistry,
  createCapability,
  DefaultCapabilityRegistry,
  STANDARD_CAPABILITIES,
  getStandardCapability,
  getStandardCapabilitiesByCategory,
  type CapabilityRegistry,
  type CapabilityRegistryConfig,
  type RegisterCapabilityInput,
  type CapabilityExecutor,
  type RegisteredCapability,
  type CapabilitySearchCriteria,
} from './capability';

// Messaging module
export * as Messaging from './messaging';
export {
  createProtocolMessageBus,
  createProtocolMessage,
  createOrchestration,
  DefaultProtocolMessageBus,
  type ProtocolMessageBus,
  type MessageBusConfig,
  type OrchestrationDefinition,
  type OrchestrationStep,
  type OrchestrationResult,
} from './messaging';

// Security module
export * as Security from './security';
export {
  createPermissionManager,
  createDefaultPermissions,
  DefaultPermissionManager,
  type PermissionManager,
  type PermissionManagerConfig,
  type AuthorizationRequest,
  type AuthorizationResult,
  type GuardrailCheck,
  type PermissionEvent,
  type PermissionEventHandler,
} from './security';

// Reputation module
export * as Reputation from './reputation';
export {
  createReputationManager,
  DefaultReputationManager,
  type ReputationManager,
  type ReputationManagerConfig,
  type PerformanceUpdate,
  type EndorsementInput,
  type Endorsement,
  type ReputationEvent,
  type ReputationEventHandler,
} from './reputation';

// Plugins module
export * as Plugins from './plugins';
export {
  createPluginRegistry,
  createToolRegistry,
  createTool,
  DefaultPluginRegistry,
  DefaultToolRegistry,
  type PluginRegistry,
  type PluginRegistryConfig,
  type PluginState,
  type ToolRegistry,
  type PluginEvent,
  type PluginEventHandler,
} from './plugins';

// Cross-chain module
export * as CrossChain from './cross-chain';
export {
  createChainManager,
  createBridgeManager,
  createAssetRegistry,
  createChainAdapter,
  DefaultChainManager,
  DefaultBridgeManager,
  DefaultAssetRegistry,
  COMMON_ASSETS,
  type ChainManager,
  type ChainManagerConfig,
  type BridgeManager,
  type BridgeConfig,
  type BridgeQuote,
  type BridgeTransaction,
  type AssetRegistry,
  type CrossChainEvent,
  type CrossChainEventHandler,
} from './cross-chain';

// Governance module
export * as Governance from './governance';
export {
  createGovernanceManager,
  DefaultGovernanceManager,
  type GovernanceManager,
  type GovernanceConfig,
  type ProposalConfig,
  type GovernanceDelegation,
  type GovernanceEvent,
  type GovernanceEventHandler,
} from './governance';

// ============================================================================
// Protocol Class
// ============================================================================

import { createIdentityManager, IdentityManager } from './identity';
import { createCapabilityRegistry, CapabilityRegistry } from './capability';
import { createProtocolMessageBus, ProtocolMessageBus } from './messaging';
import { createPermissionManager, PermissionManager } from './security';
import { createReputationManager, ReputationManager } from './reputation';
import { createPluginRegistry, createToolRegistry, PluginRegistry, ToolRegistry } from './plugins';
import { createChainManager, createBridgeManager, createAssetRegistry, ChainManager, BridgeManager, AssetRegistry } from './cross-chain';
import { createGovernanceManager, GovernanceManager } from './governance';
import { NetworkId, ProtocolEvent, ProtocolEventType, Unsubscribe } from './types';

/**
 * Open Agent Protocol configuration
 */
export interface OpenAgentProtocolConfig {
  /** Network to operate on */
  network: NetworkId;

  /** RPC URL */
  rpcUrl?: string;

  /** Enable on-chain features */
  enableOnChain?: boolean;

  /** Enable reputation system */
  enableReputation?: boolean;

  /** Enable governance */
  enableGovernance?: boolean;

  /** Enable cross-chain features */
  enableCrossChain?: boolean;
}

/**
 * Protocol event handler
 */
export type ProtocolEventHandler = (event: ProtocolEvent) => void;

/**
 * Open Agent Protocol main class
 *
 * Provides unified access to all protocol components.
 */
export class OpenAgentProtocol {
  readonly config: OpenAgentProtocolConfig;

  // Core components
  readonly identity: IdentityManager;
  readonly capabilities: CapabilityRegistry;
  readonly messaging: ProtocolMessageBus;
  readonly permissions: PermissionManager;
  readonly reputation: ReputationManager;
  readonly plugins: PluginRegistry;
  readonly tools: ToolRegistry;
  readonly chains: ChainManager;
  readonly bridges: BridgeManager;
  readonly assets: AssetRegistry;
  readonly governance: GovernanceManager;

  private eventHandlers: Set<ProtocolEventHandler> = new Set();

  constructor(config: OpenAgentProtocolConfig) {
    this.config = config;

    // Initialize components
    this.identity = createIdentityManager({
      network: config.network,
      rpcUrl: config.rpcUrl,
      enableOnChain: config.enableOnChain ?? false,
    });

    this.capabilities = createCapabilityRegistry();
    this.messaging = createProtocolMessageBus();
    this.permissions = createPermissionManager();

    this.reputation = createReputationManager();
    this.plugins = createPluginRegistry();
    this.tools = createToolRegistry();

    this.chains = createChainManager({
      defaultChain: config.network,
    });
    this.bridges = createBridgeManager();
    this.assets = createAssetRegistry();

    this.governance = createGovernanceManager();

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Subscribe to protocol events
   */
  subscribe(handler: ProtocolEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Get protocol version
   */
  getVersion(): string {
    return '1.0.0';
  }

  /**
   * Get protocol network
   */
  getNetwork(): NetworkId {
    return this.config.network;
  }

  private setupEventForwarding(): void {
    // Forward identity events
    this.identity.subscribe((event) => {
      this.emitEvent('agent.created', event.agentId, event.data);
    });

    // Forward reputation events
    this.reputation.subscribe((event) => {
      this.emitEvent('reputation.updated', '', event.data);
    });

    // Forward governance events
    this.governance.subscribe((event) => {
      if (event.type === 'proposal.created') {
        this.emitEvent('proposal.created', event.proposalId ?? '', event.data);
      } else if (event.type === 'proposal.voted') {
        this.emitEvent('proposal.voted', event.proposalId ?? '', event.data);
      } else if (event.type === 'proposal.executed') {
        this.emitEvent('proposal.executed', event.proposalId ?? '', event.data);
      }
    });
  }

  private emitEvent(type: ProtocolEventType, source: string, data: Record<string, unknown>): void {
    const event: ProtocolEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type,
      source,
      data,
      timestamp: new Date(),
      severity: 'info',
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in protocol event handler:', error);
      }
    }
  }
}

// ============================================================================
// Agent Creation Helper
// ============================================================================

import { AgentIdentity, CapabilityId, AgentId } from './types';

/**
 * Create agent input
 */
export interface CreateAgentInput {
  /** Agent name */
  name: string;

  /** Owner configuration */
  owner: {
    type: 'user' | 'dao' | 'institution' | 'protocol';
    ownerId: string;
    ownerAddress?: string;
  };

  /** Capabilities to register */
  capabilities?: CapabilityId[];

  /** Initial permissions */
  permissions?: {
    trading?: {
      enabled: boolean;
      maxTransactionValue?: number;
    };
    transfers?: {
      enabled: boolean;
      whitelistOnly?: boolean;
    };
    staking?: {
      enabled: boolean;
    };
    governance?: {
      enabled: boolean;
    };
  };

  /** Register on-chain */
  registerOnChain?: boolean;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent instance with protocol access
 */
export interface ProtocolAgent {
  /** Agent identity */
  identity: AgentIdentity;

  /** Execute a capability */
  execute(capabilityId: CapabilityId, params: Record<string, unknown>): Promise<unknown>;

  /** Start the agent */
  start(): Promise<void>;

  /** Stop the agent */
  stop(): Promise<void>;

  /** Add capability */
  addCapability(capabilityId: CapabilityId): Promise<void>;

  /** Remove capability */
  removeCapability(capabilityId: CapabilityId): Promise<void>;

  /** Get agent ID */
  getId(): AgentId;
}

/**
 * Create an agent on the protocol
 */
export async function createAgent(
  protocol: OpenAgentProtocol,
  input: CreateAgentInput
): Promise<ProtocolAgent> {
  // Create identity
  const identity = await protocol.identity.createIdentity({
    name: input.name,
    ownerType: input.owner.type,
    ownerId: input.owner.ownerId,
    ownerAddress: input.owner.ownerAddress,
    registerOnChain: input.registerOnChain,
    metadata: input.metadata,
  });

  // Set up permissions
  if (input.permissions) {
    const perms = await import('./security/index.js').then(m => m.createDefaultPermissions(identity.id));

    if (input.permissions.trading) {
      perms.trading.enabled = input.permissions.trading.enabled;
      if (input.permissions.trading.maxTransactionValue) {
        perms.trading.maxTransactionValue = input.permissions.trading.maxTransactionValue;
      }
    }

    if (input.permissions.transfers) {
      perms.transfers.enabled = input.permissions.transfers.enabled;
      if (input.permissions.transfers.whitelistOnly !== undefined) {
        perms.transfers.whitelistOnly = input.permissions.transfers.whitelistOnly;
      }
    }

    if (input.permissions.staking) {
      perms.staking.enabled = input.permissions.staking.enabled;
    }

    if (input.permissions.governance) {
      perms.governance.enabled = input.permissions.governance.enabled;
    }

    await protocol.permissions.setPermissions(identity.id, perms);
  }

  // Create agent instance
  const agent: ProtocolAgent = {
    identity,

    async execute(capabilityId: CapabilityId, params: Record<string, unknown>): Promise<unknown> {
      const result = await protocol.capabilities.execute({
        capabilityId,
        params,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Execution failed');
      }

      return result.data;
    },

    async start(): Promise<void> {
      // Initialize reputation
      await protocol.reputation.getReputation(identity.id);
    },

    async stop(): Promise<void> {
      // Cleanup
    },

    async addCapability(_capabilityId: CapabilityId): Promise<void> {
      // Register capability for this agent (would register in production)
      void _capabilityId;
    },

    async removeCapability(_capabilityId: CapabilityId): Promise<void> {
      // Unregister capability (would unregister in production)
      void _capabilityId;
    },

    getId(): AgentId {
      return identity.id;
    },
  };

  return agent;
}
