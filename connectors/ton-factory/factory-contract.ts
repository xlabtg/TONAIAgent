/**
 * TONAIAgent - Factory Contract
 *
 * Deploys Agent Wallet Contracts and Strategy Contracts,
 * registers agents on-chain, provides deterministic address generation,
 * version control, upgrade patterns, and deployment fee management.
 */

import {
  FactoryConfig,
  DeployAgentInput,
  DeployStrategyInput,
  DeploymentResult,
  DeploymentTransaction,
  FactoryStats,
  UpgradeProposal,
  EmergencyState,
  AccessControlEntry,
  ContractVersion,
  TonAddress,
  AgentId,
  FactoryId,
  TonFactoryEvent,
  TonFactoryEventHandler,
  Unsubscribe,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_FACTORY_CONFIG: FactoryConfig = {
  owner: '0:0000000000000000000000000000000000000000000000000000000000000000',
  treasury: '0:0000000000000000000000000000000000000000000000000000000000000000',
  version: '1.0.0',
  deploymentFee: BigInt(100_000_000), // 0.1 TON
  protocolFeeBps: 100, // 1%
  maxAgentsPerUser: 10,
  acceptingDeployments: true,
  workchains: [0],
};

// ============================================================================
// Helper: Deterministic Address Generation
// ============================================================================

/**
 * Generate a deterministic contract address from owner and salt.
 * In production this would use TON's actual address derivation with StateInit.
 * Here we simulate it with a reproducible hash-like string.
 */
export function deriveContractAddress(
  ownerAddress: TonAddress,
  salt: string,
  workchain: 0 | -1 = 0
): TonAddress {
  // Simulate deterministic address: in real TON this uses hash(StateInit)
  const combined = `${ownerAddress}:${salt}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hexHash = Math.abs(hash).toString(16).padStart(16, '0').padEnd(64, '0');
  return `${workchain}:${hexHash}`;
}

/**
 * Generate deployment transaction body for agent wallet.
 * In production this would serialize a TON BoC (Bag of Cells).
 */
export function buildDeploymentTransaction(
  factoryAddress: TonAddress,
  input: DeployAgentInput,
  deploymentFee: bigint
): DeploymentTransaction {
  return {
    body: Buffer.from(JSON.stringify({ type: 'deploy_agent', ...input })).toString('base64'),
    to: factoryAddress,
    value: deploymentFee,
    stateInit: undefined,
    description: `Deploy agent wallet for owner ${input.ownerAddress} in ${input.walletMode} mode`,
    estimatedFee: deploymentFee,
  };
}

// ============================================================================
// Factory Contract Manager
// ============================================================================

/**
 * Manages factory contract operations: deploying agents, managing upgrades,
 * emergency controls, and access control.
 */
export class FactoryContractManager {
  private readonly config: FactoryConfig;
  private readonly deployments: Map<FactoryId, DeploymentResult> = new Map();
  private readonly agentOwners: Map<AgentId, string> = new Map();
  private readonly userAgentCount: Map<string, number> = new Map();
  private readonly upgradeProposals: Map<string, UpgradeProposal> = new Map();
  private readonly accessControl: Map<TonAddress, AccessControlEntry> = new Map();
  private emergencyState: EmergencyState = {
    isPaused: false,
    affectedAgents: [],
  };
  private deploymentCounter = 0;
  private strategyCounter = 0;
  private totalFeesCollected = BigInt(0);
  private totalVolumeProcessed = BigInt(0);
  private readonly startTime = Date.now();
  private readonly eventHandlers: Set<TonFactoryEventHandler> = new Set();

  constructor(config: Partial<FactoryConfig> = {}) {
    this.config = { ...DEFAULT_FACTORY_CONFIG, ...config };

    // Grant owner full access
    if (this.config.owner) {
      this.accessControl.set(this.config.owner, {
        role: 'owner',
        address: this.config.owner,
        permissions: ['deploy', 'pause', 'upgrade', 'admin', 'emergency'],
        grantedBy: this.config.owner,
        grantedAt: new Date(),
      });
    }
  }

  // ============================================================================
  // Agent Deployment
  // ============================================================================

  /**
   * Deploy a new Agent Wallet Contract.
   * Returns a deployment result with on-chain address and metadata.
   */
  async deployAgent(input: DeployAgentInput): Promise<DeploymentResult> {
    if (!this.config.acceptingDeployments) {
      throw new Error('Factory is not accepting new deployments');
    }

    if (this.emergencyState.isPaused) {
      throw new Error(`Factory is paused: ${this.emergencyState.reason}`);
    }

    // Check per-user agent limit
    const currentCount = this.userAgentCount.get(input.ownerId) ?? 0;
    if (currentCount >= this.config.maxAgentsPerUser) {
      throw new Error(
        `User ${input.ownerId} has reached max agents limit (${this.config.maxAgentsPerUser})`
      );
    }

    // Validate wallet mode requirements
    if (input.walletMode === 'mpc' && !input.mpcConfig) {
      throw new Error('MPC wallet mode requires mpcConfig');
    }
    if (input.walletMode === 'smart-contract' && !input.scWalletConfig) {
      throw new Error('Smart contract wallet mode requires scWalletConfig');
    }

    this.deploymentCounter++;
    const deploymentId: FactoryId = `dep_${Date.now()}_${this.deploymentCounter}`;
    const agentId: AgentId = `agent_${input.ownerId}_${this.deploymentCounter}`;
    const salt = `${input.ownerId}:${this.deploymentCounter}`;

    const workchain = this.config.workchains[0] ?? 0;
    const contractAddress = deriveContractAddress(input.ownerAddress, salt, workchain);

    const feePaid = this.config.deploymentFee;
    this.totalFeesCollected += feePaid;

    const result: DeploymentResult = {
      deploymentId,
      contractAddress,
      agentId,
      txHash: `tx_${deploymentId}`,
      blockSeqno: 1000000 + this.deploymentCounter,
      feePaid,
      deployedAt: new Date(),
      version: this.config.version,
    };

    this.deployments.set(deploymentId, result);
    this.agentOwners.set(agentId, input.ownerId);
    this.userAgentCount.set(input.ownerId, currentCount + 1);

    this.emitEvent({
      type: 'agent.deployed',
      timestamp: new Date(),
      agentId,
      data: {
        deploymentId,
        contractAddress,
        walletMode: input.walletMode,
        ownerId: input.ownerId,
        feePaid: feePaid.toString(),
      },
    });

    return result;
  }

  /**
   * Deploy a new Strategy Contract for an existing agent.
   */
  async deployStrategy(input: DeployStrategyInput): Promise<DeploymentResult> {
    if (!this.config.acceptingDeployments) {
      throw new Error('Factory is not accepting new deployments');
    }

    if (this.emergencyState.isPaused) {
      throw new Error(`Factory is paused: ${this.emergencyState.reason}`);
    }

    if (!this.agentOwners.has(input.agentId)) {
      throw new Error(`Agent ${input.agentId} not found in factory registry`);
    }

    this.strategyCounter++;
    const deploymentId: FactoryId = `sdep_${Date.now()}_${this.strategyCounter}`;
    const strategyAddress = deriveContractAddress(
      input.agentId,
      `strategy:${input.strategyType}:${this.strategyCounter}`,
      0
    );

    const result: DeploymentResult = {
      deploymentId,
      contractAddress: strategyAddress,
      agentId: input.agentId,
      txHash: `tx_${deploymentId}`,
      blockSeqno: 1000000 + this.deploymentCounter + this.strategyCounter,
      feePaid: BigInt(0),
      deployedAt: new Date(),
      version: input.version,
    };

    this.deployments.set(deploymentId, result);

    this.emitEvent({
      type: 'strategy.deployed',
      timestamp: new Date(),
      agentId: input.agentId,
      strategyId: `strat_${this.strategyCounter}`,
      data: {
        deploymentId,
        contractAddress: strategyAddress,
        strategyType: input.strategyType,
        riskLevel: input.riskLevel,
      },
    });

    return result;
  }

  /**
   * Build an unsigned deployment transaction for client-side signing.
   */
  buildDeploymentTx(input: DeployAgentInput): DeploymentTransaction {
    const factoryAddress = deriveContractAddress(this.config.owner, 'factory', -1);
    return buildDeploymentTransaction(factoryAddress, input, this.config.deploymentFee);
  }

  // ============================================================================
  // Deployment Queries
  // ============================================================================

  getDeployment(deploymentId: FactoryId): DeploymentResult | undefined {
    return this.deployments.get(deploymentId);
  }

  getDeploymentsByOwner(ownerId: string): DeploymentResult[] {
    const agentIds = Array.from(this.agentOwners.entries())
      .filter(([, owner]) => owner === ownerId)
      .map(([agentId]) => agentId);

    return Array.from(this.deployments.values()).filter((d) =>
      agentIds.includes(d.agentId)
    );
  }

  getAllDeployments(): DeploymentResult[] {
    return Array.from(this.deployments.values());
  }

  // ============================================================================
  // Upgrade Management
  // ============================================================================

  /**
   * Propose a contract upgrade. Requires multi-sig approval.
   */
  async proposeUpgrade(
    proposal: Omit<UpgradeProposal, 'proposalId' | 'approvals' | 'status' | 'createdAt'>
  ): Promise<UpgradeProposal> {
    const proposalId = `upgrade_${Date.now()}`;
    const fullProposal: UpgradeProposal = {
      ...proposal,
      proposalId,
      approvals: [proposal.proposer],
      status: 'pending',
      createdAt: new Date(),
    };

    this.upgradeProposals.set(proposalId, fullProposal);

    this.emitEvent({
      type: 'upgrade.proposed',
      timestamp: new Date(),
      data: { proposalId, upgradeType: proposal.upgradeType, targetContract: proposal.targetContract },
    });

    return fullProposal;
  }

  /**
   * Approve an upgrade proposal (multi-sig step).
   */
  async approveUpgrade(proposalId: string, approver: TonAddress): Promise<UpgradeProposal> {
    const proposal = this.upgradeProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Upgrade proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'pending') {
      throw new Error(`Proposal ${proposalId} is not in pending status`);
    }

    if (!proposal.approvals.includes(approver)) {
      proposal.approvals.push(approver);
    }

    // Auto-execute if threshold reached
    if (proposal.approvals.length >= proposal.approvalsRequired) {
      proposal.status = 'approved';
      await this.executeUpgrade(proposalId);
    }

    this.upgradeProposals.set(proposalId, proposal);
    return proposal;
  }

  /**
   * Execute an approved upgrade.
   */
  async executeUpgrade(proposalId: string): Promise<void> {
    const proposal = this.upgradeProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Upgrade proposal ${proposalId} not found`);
    }

    if (proposal.approvals.length < proposal.approvalsRequired) {
      throw new Error(
        `Insufficient approvals: ${proposal.approvals.length}/${proposal.approvalsRequired}`
      );
    }

    proposal.status = 'executed';
    this.upgradeProposals.set(proposalId, proposal);

    // In production: broadcast upgrade transaction to TON

    this.emitEvent({
      type: 'upgrade.executed',
      timestamp: new Date(),
      data: {
        proposalId,
        upgradeType: proposal.upgradeType,
        targetContract: proposal.targetContract,
        newCodeHash: proposal.newCodeHash,
      },
    });
  }

  getUpgradeProposal(proposalId: string): UpgradeProposal | undefined {
    return this.upgradeProposals.get(proposalId);
  }

  getAllUpgradeProposals(): UpgradeProposal[] {
    return Array.from(this.upgradeProposals.values());
  }

  // ============================================================================
  // Emergency Controls
  // ============================================================================

  /**
   * Pause the factory (emergency stop). Affects all or specific agents.
   */
  async triggerEmergency(
    reason: string,
    triggeredBy: TonAddress,
    affectedAgents: AgentId[] = []
  ): Promise<void> {
    this.emergencyState = {
      isPaused: true,
      reason,
      triggeredBy,
      pausedAt: new Date(),
      affectedAgents,
    };

    this.emitEvent({
      type: 'emergency.triggered',
      timestamp: new Date(),
      data: { reason, triggeredBy, affectedAgents },
    });
  }

  /**
   * Resolve emergency and resume factory operations.
   */
  async resolveEmergency(resolvedBy: TonAddress): Promise<void> {
    if (!this.emergencyState.isPaused) {
      throw new Error('Factory is not in emergency state');
    }

    this.emergencyState = {
      isPaused: false,
      affectedAgents: [],
    };

    this.emitEvent({
      type: 'emergency.resolved',
      timestamp: new Date(),
      data: { resolvedBy },
    });
  }

  getEmergencyState(): EmergencyState {
    return { ...this.emergencyState };
  }

  // ============================================================================
  // Access Control
  // ============================================================================

  /**
   * Grant a role to an address.
   */
  grantRole(entry: Omit<AccessControlEntry, 'grantedAt'>): void {
    this.accessControl.set(entry.address, {
      ...entry,
      grantedAt: new Date(),
    });
  }

  /**
   * Revoke a role from an address.
   */
  revokeRole(address: TonAddress): void {
    this.accessControl.delete(address);
  }

  /**
   * Check if an address has a specific permission.
   */
  hasPermission(address: TonAddress, permission: string): boolean {
    const entry = this.accessControl.get(address);
    if (!entry) return false;
    return entry.permissions.includes(permission);
  }

  getAccessControlEntry(address: TonAddress): AccessControlEntry | undefined {
    return this.accessControl.get(address);
  }

  // ============================================================================
  // Factory Statistics
  // ============================================================================

  getStats(): FactoryStats {
    const activeAgents = Array.from(this.agentOwners.keys()).length;

    return {
      totalAgentsDeployed: this.deploymentCounter,
      activeAgents,
      totalStrategiesDeployed: this.strategyCounter,
      totalFeesCollected: this.totalFeesCollected,
      totalVolumeProcessed: this.totalVolumeProcessed,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.config.version,
    };
  }

  getConfig(): FactoryConfig {
    return { ...this.config };
  }

  /**
   * Update factory configuration. Owner-only in production.
   */
  updateConfig(updates: Partial<Pick<FactoryConfig, 'deploymentFee' | 'protocolFeeBps' | 'maxAgentsPerUser' | 'acceptingDeployments'>>): void {
    Object.assign(this.config, updates);
  }

  recordVolumeProcessed(amount: bigint): void {
    this.totalVolumeProcessed += amount;
  }

  // ============================================================================
  // Version Management
  // ============================================================================

  getCurrentVersion(): ContractVersion {
    return this.config.version;
  }

  getSupportedVersions(): ContractVersion[] {
    return ['1.0.0'];
  }

  // ============================================================================
  // Event System
  // ============================================================================

  subscribe(handler: TonFactoryEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: TonFactoryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFactoryContractManager(
  config?: Partial<FactoryConfig>
): FactoryContractManager {
  return new FactoryContractManager(config);
}

export default FactoryContractManager;
