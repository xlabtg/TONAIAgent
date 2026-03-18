/**
 * TONAIAgent - TON Smart Contract Factory Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTonFactoryService,
  DefaultTonFactoryService,
  FactoryContractManager,
  createFactoryContractManager,
  AgentWalletManager,
  createAgentWalletManager,
  NonCustodialProvider,
  MPCProvider,
  SmartContractWalletProvider,
  StrategyExecutor,
  createStrategyExecutor,
  AgentRegistry,
  createAgentRegistry,
  FeeManager,
  createFeeManager,
  deriveContractAddress,
  buildDeploymentTransaction,
  DEFAULT_FACTORY_CONFIG,
  DEFAULT_FEE_CONFIG,
} from '../../connectors/ton-factory';

// ============================================================================
// TonFactoryService Integration Tests
// ============================================================================

describe('TonFactoryService', () => {
  let service: DefaultTonFactoryService;

  beforeEach(() => {
    service = createTonFactoryService({
      network: 'testnet',
      enabled: true,
    });
  });

  describe('initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service.enabled).toBe(true);
    });

    it('should have all components initialized', () => {
      expect(service.factory).toBeDefined();
      expect(service.wallets).toBeDefined();
      expect(service.executor).toBeDefined();
      expect(service.registry).toBeDefined();
      expect(service.fees).toBeDefined();
    });
  });

  describe('health check', () => {
    it('should report healthy status', async () => {
      const health = await service.getHealth();
      expect(health.overall).toBe('healthy');
      expect(health.components.factory).toBe(true);
      expect(health.components.wallets).toBe(true);
      expect(health.components.executor).toBe(true);
      expect(health.components.registry).toBe(true);
      expect(health.components.fees).toBe(true);
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('should include accurate stats', async () => {
      const health = await service.getHealth();
      expect(health.stats.totalAgents).toBe(0);
      expect(health.stats.activeAgents).toBe(0);
      expect(health.stats.totalStrategies).toBe(0);
      expect(health.stats.totalFeesPending).toBe(BigInt(0));
    });
  });

  describe('event system', () => {
    it('should subscribe to and receive events from all components', async () => {
      const events: any[] = [];
      const unsub = service.subscribe((event) => events.push(event));

      // Trigger an event via factory deployment
      await service.factory.deployAgent({
        ownerId: 'user_1',
        ownerAddress: '0:abc123',
        walletMode: 'non-custodial',
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('agent.deployed');

      unsub();
    });

    it('should unsubscribe correctly', async () => {
      const events: any[] = [];
      const unsub = service.subscribe((event) => events.push(event));
      unsub();

      await service.factory.deployAgent({
        ownerId: 'user_2',
        ownerAddress: '0:def456',
        walletMode: 'non-custodial',
      });

      expect(events).toHaveLength(0);
    });
  });

  describe('end-to-end workflow', () => {
    it('should deploy agent, register, create strategy, and execute', async () => {
      const events: any[] = [];
      service.subscribe((event) => events.push(event));

      // 1. Deploy agent wallet
      const deployment = await service.factory.deployAgent({
        ownerId: 'user_e2e',
        ownerAddress: '0:e2e_owner',
        walletMode: 'smart-contract',
        scWalletConfig: {
          txSpendingLimit: BigInt(1_000_000_000),
          dailySpendingLimit: BigInt(5_000_000_000),
          whitelistedAddresses: [],
          allowedTxTypes: ['transfer', 'swap', 'stake'],
          requireMultiSigAbove: BigInt(10_000_000_000),
        },
      });

      expect(deployment.agentId).toBeDefined();
      expect(deployment.contractAddress).toBeDefined();

      // 2. Register in registry
      service.registry.registerAgent(
        deployment.agentId,
        '0:e2e_owner',
        deployment.contractAddress,
        {},
        { telegramUserId: 'tg_e2e_user' }
      );

      const regEntry = service.registry.getAgent(deployment.agentId);
      expect(regEntry).toBeDefined();
      expect(regEntry!.telegramUserId).toBe('tg_e2e_user');

      // 3. Create and execute strategy
      const strategy = service.executor.createStrategy({
        agentId: deployment.agentId,
        strategyType: 'dca',
        params: { amount: '100000000', interval: 'daily' },
        version: '1.0.0',
        riskLevel: 'low',
        maxGasBudget: BigInt(50_000_000),
      });

      await service.executor.startStrategy(strategy.strategyId);

      const result = await service.executor.executeStrategy(
        strategy.strategyId,
        BigInt(1_000_000_000)
      );

      expect(result.success).toBe(true);
      expect(result.gasUsed).toBeGreaterThan(BigInt(0));

      // 4. Check events were emitted
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('agent.deployed');
      expect(eventTypes).toContain('strategy.deployed');
      expect(eventTypes).toContain('strategy.started');
      expect(eventTypes).toContain('strategy.completed');
    });
  });
});

// ============================================================================
// Factory Contract Tests
// ============================================================================

describe('FactoryContractManager', () => {
  let factory: FactoryContractManager;

  beforeEach(() => {
    factory = createFactoryContractManager({
      owner: '0:factory_owner',
      treasury: '0:factory_treasury',
      deploymentFee: BigInt(100_000_000),
      maxAgentsPerUser: 3,
    });
  });

  describe('agent deployment', () => {
    it('should deploy a non-custodial agent wallet', async () => {
      const result = await factory.deployAgent({
        ownerId: 'user_nc',
        ownerAddress: '0:user_nc_addr',
        walletMode: 'non-custodial',
      });

      expect(result.deploymentId).toBeDefined();
      expect(result.agentId).toBeDefined();
      expect(result.contractAddress).toBeDefined();
      expect(result.contractAddress).toMatch(/^0:[\da-f]+$/);
      expect(result.feePaid).toBe(BigInt(100_000_000));
      expect(result.deployedAt).toBeInstanceOf(Date);
      expect(result.version).toBe('1.0.0');
    });

    it('should deploy an MPC agent wallet', async () => {
      const result = await factory.deployAgent({
        ownerId: 'user_mpc',
        ownerAddress: '0:user_mpc_addr',
        walletMode: 'mpc',
        mpcConfig: {
          threshold: 2,
          parties: 3,
          partyPublicKeys: ['pk1', 'pk2', 'pk3'],
        },
      });

      expect(result.agentId).toBeDefined();
      expect(result.contractAddress).toBeDefined();
    });

    it('should deploy a smart contract wallet agent', async () => {
      const result = await factory.deployAgent({
        ownerId: 'user_scw',
        ownerAddress: '0:user_scw_addr',
        walletMode: 'smart-contract',
        scWalletConfig: {
          txSpendingLimit: BigInt(1_000_000_000),
          dailySpendingLimit: BigInt(5_000_000_000),
          whitelistedAddresses: ['0:allowed_addr'],
          allowedTxTypes: ['transfer', 'swap'],
          requireMultiSigAbove: BigInt(10_000_000_000),
        },
      });

      expect(result.agentId).toBeDefined();
    });

    it('should reject MPC deployment without mpcConfig', async () => {
      await expect(
        factory.deployAgent({
          ownerId: 'user_bad_mpc',
          ownerAddress: '0:addr',
          walletMode: 'mpc',
        })
      ).rejects.toThrow('MPC wallet mode requires mpcConfig');
    });

    it('should reject smart-contract deployment without scWalletConfig', async () => {
      await expect(
        factory.deployAgent({
          ownerId: 'user_bad_scw',
          ownerAddress: '0:addr',
          walletMode: 'smart-contract',
        })
      ).rejects.toThrow('Smart contract wallet mode requires scWalletConfig');
    });

    it('should enforce max agents per user limit', async () => {
      for (let i = 0; i < 3; i++) {
        await factory.deployAgent({
          ownerId: 'user_limit',
          ownerAddress: '0:user_limit_addr',
          walletMode: 'non-custodial',
        });
      }

      await expect(
        factory.deployAgent({
          ownerId: 'user_limit',
          ownerAddress: '0:user_limit_addr',
          walletMode: 'non-custodial',
        })
      ).rejects.toThrow('reached max agents limit');
    });

    it('should generate unique addresses for different users', async () => {
      const r1 = await factory.deployAgent({
        ownerId: 'user_a',
        ownerAddress: '0:addr_a',
        walletMode: 'non-custodial',
      });

      const r2 = await factory.deployAgent({
        ownerId: 'user_b',
        ownerAddress: '0:addr_b',
        walletMode: 'non-custodial',
      });

      expect(r1.contractAddress).not.toBe(r2.contractAddress);
      expect(r1.agentId).not.toBe(r2.agentId);
    });
  });

  describe('strategy deployment', () => {
    it('should deploy strategy for existing agent', async () => {
      const agentResult = await factory.deployAgent({
        ownerId: 'user_strat',
        ownerAddress: '0:strat_owner',
        walletMode: 'non-custodial',
      });

      const stratResult = await factory.deployStrategy({
        agentId: agentResult.agentId,
        strategyType: 'dca',
        params: { amount: '100000000' },
        version: '1.0.0',
        riskLevel: 'low',
        maxGasBudget: BigInt(50_000_000),
      });

      expect(stratResult.deploymentId).toBeDefined();
      expect(stratResult.contractAddress).toBeDefined();
      expect(stratResult.agentId).toBe(agentResult.agentId);
    });

    it('should reject strategy for unknown agent', async () => {
      await expect(
        factory.deployStrategy({
          agentId: 'nonexistent_agent',
          strategyType: 'dca',
          params: {},
          version: '1.0.0',
          riskLevel: 'low',
          maxGasBudget: BigInt(50_000_000),
        })
      ).rejects.toThrow('not found in factory registry');
    });
  });

  describe('deterministic address generation', () => {
    it('should generate deterministic addresses', () => {
      const addr1 = deriveContractAddress('0:owner1', 'salt1', 0);
      const addr2 = deriveContractAddress('0:owner1', 'salt1', 0);
      expect(addr1).toBe(addr2);
    });

    it('should generate different addresses for different inputs', () => {
      const addr1 = deriveContractAddress('0:owner1', 'salt1', 0);
      const addr2 = deriveContractAddress('0:owner2', 'salt1', 0);
      const addr3 = deriveContractAddress('0:owner1', 'salt2', 0);
      expect(addr1).not.toBe(addr2);
      expect(addr1).not.toBe(addr3);
    });

    it('should respect workchain in address format', () => {
      const baseAddr = deriveContractAddress('0:owner', 'salt', 0);
      const masterAddr = deriveContractAddress('0:owner', 'salt', -1);
      expect(baseAddr).toMatch(/^0:/);
      expect(masterAddr).toMatch(/^-1:/);
    });
  });

  describe('emergency controls', () => {
    it('should pause and resume the factory', async () => {
      await factory.triggerEmergency('Security issue', '0:admin_addr');
      const state = factory.getEmergencyState();
      expect(state.isPaused).toBe(true);
      expect(state.reason).toBe('Security issue');
      expect(state.triggeredBy).toBe('0:admin_addr');

      await expect(
        factory.deployAgent({ ownerId: 'u', ownerAddress: '0:u', walletMode: 'non-custodial' })
      ).rejects.toThrow('Factory is paused');

      await factory.resolveEmergency('0:admin_addr');
      const resolvedState = factory.getEmergencyState();
      expect(resolvedState.isPaused).toBe(false);
    });

    it('should reject resolving when not paused', async () => {
      await expect(factory.resolveEmergency('0:admin')).rejects.toThrow(
        'Factory is not in emergency state'
      );
    });
  });

  describe('upgrade management', () => {
    it('should create and approve an upgrade proposal', async () => {
      const proposal = await factory.proposeUpgrade({
        targetContract: '0:contract_addr',
        newCodeHash: '0xabcdef',
        upgradeType: 'agent_wallet',
        proposer: '0:proposer',
        approvalsRequired: 2,
        payload: 'base64payload',
        migrationNotes: 'Minor bug fix',
      });

      expect(proposal.proposalId).toBeDefined();
      expect(proposal.status).toBe('pending');
      expect(proposal.approvals).toHaveLength(1);

      // Second approval should trigger execution
      const updated = await factory.approveUpgrade(proposal.proposalId, '0:approver_2');
      expect(updated.approvals).toHaveLength(2);
      expect(updated.status).toBe('executed');
    });

    it('should not duplicate approvals', async () => {
      const proposal = await factory.proposeUpgrade({
        targetContract: '0:contract',
        newCodeHash: '0xabc',
        upgradeType: 'factory',
        proposer: '0:proposer',
        approvalsRequired: 3,
        payload: 'payload',
      });

      await factory.approveUpgrade(proposal.proposalId, '0:proposer'); // duplicate
      const retrieved = factory.getUpgradeProposal(proposal.proposalId);
      expect(retrieved!.approvals).toHaveLength(1); // not duplicated
    });
  });

  describe('access control', () => {
    it('should grant and check permissions', () => {
      factory.grantRole({
        role: 'admin',
        address: '0:admin_addr',
        permissions: ['deploy', 'pause'],
        grantedBy: '0:factory_owner',
      });

      expect(factory.hasPermission('0:admin_addr', 'deploy')).toBe(true);
      expect(factory.hasPermission('0:admin_addr', 'upgrade')).toBe(false);
      expect(factory.hasPermission('0:unknown_addr', 'deploy')).toBe(false);
    });

    it('should revoke roles', () => {
      factory.grantRole({
        role: 'operator',
        address: '0:operator_addr',
        permissions: ['deploy'],
        grantedBy: '0:factory_owner',
      });

      expect(factory.hasPermission('0:operator_addr', 'deploy')).toBe(true);
      factory.revokeRole('0:operator_addr');
      expect(factory.hasPermission('0:operator_addr', 'deploy')).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should track deployment statistics', async () => {
      await factory.deployAgent({
        ownerId: 'u1',
        ownerAddress: '0:u1',
        walletMode: 'non-custodial',
      });
      await factory.deployAgent({
        ownerId: 'u2',
        ownerAddress: '0:u2',
        walletMode: 'non-custodial',
      });

      const stats = factory.getStats();
      expect(stats.totalAgentsDeployed).toBe(2);
      expect(stats.activeAgents).toBe(2);
      expect(stats.totalFeesCollected).toBe(BigInt(200_000_000));
      expect(stats.version).toBe('1.0.0');
    });
  });

  describe('build deployment transaction', () => {
    it('should build a deployment transaction for client signing', () => {
      const tx = factory.buildDeploymentTx({
        ownerId: 'user_tx',
        ownerAddress: '0:user_tx_addr',
        walletMode: 'non-custodial',
      });

      expect(tx.body).toBeDefined();
      expect(tx.to).toBeDefined();
      expect(tx.value).toBe(BigInt(100_000_000));
      expect(tx.estimatedFee).toBeGreaterThan(BigInt(0));
      expect(tx.description).toContain('Deploy agent wallet');
    });
  });
});

// ============================================================================
// Agent Wallet Tests
// ============================================================================

describe('AgentWalletManager', () => {
  let walletManager: AgentWalletManager;

  beforeEach(() => {
    walletManager = createAgentWalletManager();
  });

  describe('wallet creation', () => {
    it('should create a non-custodial wallet', () => {
      const wallet = walletManager.createWallet(
        'agent_nc_1',
        '0:nc_contract',
        '0:nc_owner',
        'non-custodial'
      );

      expect(wallet.agentId).toBe('agent_nc_1');
      expect(wallet.mode).toBe('non-custodial');
      expect(wallet.status).toBe('active');
      expect(wallet.balance).toBe(BigInt(0));
    });

    it('should create an MPC wallet', () => {
      const wallet = walletManager.createWallet(
        'agent_mpc_1',
        '0:mpc_contract',
        '0:mpc_owner',
        'mpc'
      );

      expect(wallet.mode).toBe('mpc');
    });

    it('should create a smart contract wallet', () => {
      const wallet = walletManager.createWallet(
        'agent_scw_1',
        '0:scw_contract',
        '0:scw_owner',
        'smart-contract'
      );

      expect(wallet.mode).toBe('smart-contract');
    });

    it('should reject duplicate wallet creation', () => {
      walletManager.createWallet('agent_dup', '0:c', '0:o', 'non-custodial');

      expect(() =>
        walletManager.createWallet('agent_dup', '0:c2', '0:o2', 'mpc')
      ).toThrow('already exists');
    });
  });

  describe('NonCustodialProvider', () => {
    it('should setup and sign transactions', async () => {
      walletManager.createWallet('nc_agent', '0:nc_contract', '0:nc_owner', 'non-custodial');
      const provider = walletManager.setupNonCustodial('nc_agent', {
        publicKey: 'pub_key_hex',
        walletType: 'v4r2',
      });

      expect(provider).toBeInstanceOf(NonCustodialProvider);
      expect(provider.getPublicKey()).toBe('pub_key_hex');
      expect(provider.getWalletType()).toBe('v4r2');

      const result = await provider.signAndSubmit({
        txId: 'tx_1',
        agentId: 'nc_agent',
        type: 'transfer',
        to: '0:recipient',
        amount: BigInt(100_000_000),
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.gasUsed).toBeGreaterThan(BigInt(0));
    });
  });

  describe('MPCProvider', () => {
    it('should setup MPC signing with threshold', async () => {
      walletManager.createWallet('mpc_agent', '0:mpc_contract', '0:mpc_owner', 'mpc');
      const provider = walletManager.setupMPC('mpc_agent', {
        threshold: 2,
        parties: 3,
        partyPublicKeys: ['pk0', 'pk1', 'pk2'],
      });

      expect(provider).toBeInstanceOf(MPCProvider);
      expect(provider.getThreshold()).toBe(2);
      expect(provider.getPartyCount()).toBe(3);
    });

    it('should complete threshold signing session', async () => {
      walletManager.createWallet('mpc_agent2', '0:mpc2', '0:owner', 'mpc');
      const provider = walletManager.setupMPC('mpc_agent2', {
        threshold: 2,
        parties: 3,
        partyPublicKeys: ['pk0', 'pk1', 'pk2'],
      });

      const tx = { txId: 'mpc_tx', agentId: 'mpc_agent2', type: 'transfer' as const, to: '0:to', amount: BigInt(100_000_000) };
      const sessionId = await provider.initiateSigningSession(tx);
      expect(sessionId).toBeDefined();

      const ready1 = await provider.submitShare(sessionId, 0, 'share_0');
      expect(ready1).toBe(false); // 1/2 threshold

      const ready2 = await provider.submitShare(sessionId, 1, 'share_1');
      expect(ready2).toBe(true); // 2/2 threshold reached

      const result = await provider.finalizeAndSubmit(sessionId, tx);
      expect(result.success).toBe(true);
    });

    it('should reject invalid threshold config', () => {
      walletManager.createWallet('mpc_bad', '0:c', '0:o', 'mpc');
      expect(() =>
        walletManager.setupMPC('mpc_bad', {
          threshold: 4, // > parties
          parties: 3,
          partyPublicKeys: ['pk0', 'pk1', 'pk2'],
        })
      ).toThrow('Threshold 4 cannot exceed parties 3');
    });
  });

  describe('SmartContractWalletProvider', () => {
    let provider: SmartContractWalletProvider;

    beforeEach(() => {
      walletManager.createWallet('scw_agent', '0:scw', '0:owner', 'smart-contract');
      provider = walletManager.setupSmartContractWallet('scw_agent', {
        txSpendingLimit: BigInt(1_000_000_000),
        dailySpendingLimit: BigInt(5_000_000_000),
        whitelistedAddresses: ['0:allowed'],
        allowedTxTypes: ['transfer', 'swap'],
        requireMultiSigAbove: BigInt(10_000_000_000),
        coSigners: ['0:cosigner1'],
      });
    });

    it('should execute allowed transactions', async () => {
      const result = await provider.executeTransaction({
        txId: 'scw_tx',
        agentId: 'scw_agent',
        type: 'transfer',
        to: '0:allowed',
        amount: BigInt(100_000_000),
      });

      expect(result.success).toBe(true);
    });

    it('should reject disallowed transaction types', async () => {
      await expect(
        provider.executeTransaction({
          txId: 'bad_tx',
          agentId: 'scw_agent',
          type: 'stake', // not in allowedTxTypes
          to: '0:allowed',
          amount: BigInt(100_000_000),
        })
      ).rejects.toThrow("not allowed");
    });

    it('should enforce per-transaction spending limit', async () => {
      await expect(
        provider.executeTransaction({
          txId: 'over_limit',
          agentId: 'scw_agent',
          type: 'transfer',
          to: '0:allowed',
          amount: BigInt(2_000_000_000), // > 1 TON limit
        })
      ).rejects.toThrow('exceeds per-tx limit');
    });

    it('should enforce whitelist', async () => {
      await expect(
        provider.executeTransaction({
          txId: 'not_whitelisted',
          agentId: 'scw_agent',
          type: 'transfer',
          to: '0:not_allowed',
          amount: BigInt(100_000_000),
        })
      ).rejects.toThrow('not whitelisted');
    });

    it('should check multi-sig requirement', () => {
      expect(provider.requiresMultiSig(BigInt(5_000_000_000))).toBe(false);
      expect(provider.requiresMultiSig(BigInt(20_000_000_000))).toBe(true);
    });

    it('should manage whitelist', () => {
      provider.addToWhitelist('0:new_addr');
      const config = provider.getConfig();
      expect(config.whitelistedAddresses).toContain('0:new_addr');

      provider.removeFromWhitelist('0:new_addr');
      const updated = provider.getConfig();
      expect(updated.whitelistedAddresses).not.toContain('0:new_addr');
    });
  });

  describe('wallet lifecycle', () => {
    it('should pause and resume wallet', () => {
      walletManager.createWallet('lifecycle_agent', '0:c', '0:o', 'non-custodial');
      walletManager.pauseWallet('lifecycle_agent');

      const wallet = walletManager.getWallet('lifecycle_agent');
      expect(wallet!.status).toBe('paused');

      walletManager.resumeWallet('lifecycle_agent');
      expect(walletManager.getWallet('lifecycle_agent')!.status).toBe('active');
    });

    it('should stop wallet', () => {
      walletManager.createWallet('stop_agent', '0:c', '0:o', 'non-custodial');
      walletManager.stopWallet('stop_agent');
      expect(walletManager.getWallet('stop_agent')!.status).toBe('stopped');
    });

    it('should reject transactions from paused wallet', async () => {
      walletManager.createWallet('paused_agent', '0:c', '0:o', 'non-custodial');
      walletManager.setupNonCustodial('paused_agent', { publicKey: 'pk', walletType: 'v4r2' });
      walletManager.pauseWallet('paused_agent');

      await expect(
        walletManager.transferJetton('paused_agent', '0:jetton', '0:to', BigInt(100))
      ).rejects.toThrow('not active');
    });
  });

  describe('TON-specific operations', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = 'ton_ops_agent';
      walletManager.createWallet(agentId, '0:c', '0:o', 'smart-contract');
      walletManager.setupSmartContractWallet(agentId, {
        txSpendingLimit: BigInt(100_000_000_000),
        dailySpendingLimit: BigInt(1_000_000_000_000),
        whitelistedAddresses: [], // No whitelist = all addresses allowed
        allowedTxTypes: [
          'transfer', 'jetton_transfer', 'nft_transfer',
          'swap', 'provide_liquidity', 'remove_liquidity',
          'stake', 'unstake', 'dao_vote'
        ],
        requireMultiSigAbove: BigInt(1_000_000_000_000),
      });
    });

    it('should transfer Jettons', async () => {
      const result = await walletManager.transferJetton(
        agentId, '0:jetton_addr', '0:recipient', BigInt(1_000_000_000)
      );
      expect(result.success).toBe(true);
    });

    it('should execute DEX swap', async () => {
      const result = await walletManager.swapTokens(
        agentId, '0:dex_addr', 'TON', '0:usdt_jetton',
        BigInt(1_000_000_000), BigInt(900_000_000)
      );
      expect(result.success).toBe(true);
    });

    it('should provide liquidity', async () => {
      const result = await walletManager.provideLiquidity(
        agentId, '0:pool_addr', BigInt(500_000_000), BigInt(500_000_000)
      );
      expect(result.success).toBe(true);
    });

    it('should stake tokens', async () => {
      const result = await walletManager.stake(
        agentId, '0:staking_contract', BigInt(2_000_000_000)
      );
      expect(result.success).toBe(true);
    });

    it('should unstake tokens', async () => {
      const result = await walletManager.unstake(
        agentId, '0:staking_contract', BigInt(1_000_000_000)
      );
      expect(result.success).toBe(true);
    });

    it('should vote in DAO', async () => {
      const result = await walletManager.voteInDAO(
        agentId, '0:dao_contract', 'proposal_123', 'for'
      );
      expect(result.success).toBe(true);
    });

    it('should transfer NFT', async () => {
      const result = await walletManager.transferNFT(
        agentId, '0:nft_addr', '0:new_owner'
      );
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Strategy Executor Tests
// ============================================================================

describe('StrategyExecutor', () => {
  let executor: StrategyExecutor;
  const agentId = 'strategy_test_agent';

  beforeEach(() => {
    executor = createStrategyExecutor();
  });

  describe('strategy creation', () => {
    it('should create a strategy', () => {
      const strategy = executor.createStrategy({
        agentId,
        strategyType: 'dca',
        params: { amount: '100000000', interval: 'daily' },
        version: '1.0.0',
        riskLevel: 'low',
        maxGasBudget: BigInt(50_000_000),
      });

      expect(strategy.strategyId).toBeDefined();
      expect(strategy.agentId).toBe(agentId);
      expect(strategy.type).toBe('dca');
      expect(strategy.status).toBe('pending');
      expect(strategy.riskLevel).toBe('low');
      expect(strategy.performance.successfulExecutions).toBe(0);
    });

    it('should create multiple strategies for same agent', () => {
      const s1 = executor.createStrategy({
        agentId, strategyType: 'dca', params: {}, version: '1.0.0',
        riskLevel: 'low', maxGasBudget: BigInt(50_000_000),
      });
      const s2 = executor.createStrategy({
        agentId, strategyType: 'arbitrage', params: {}, version: '1.0.0',
        riskLevel: 'high', maxGasBudget: BigInt(100_000_000),
      });

      expect(s1.strategyId).not.toBe(s2.strategyId);
    });
  });

  describe('strategy lifecycle', () => {
    it('should start and execute strategy successfully', async () => {
      const strategy = executor.createStrategy({
        agentId, strategyType: 'dca', params: {}, version: '1.0.0',
        riskLevel: 'low', maxGasBudget: BigInt(100_000_000),
      });

      await executor.startStrategy(strategy.strategyId);

      const updated = executor.getStrategy(strategy.strategyId)!;
      expect(updated.status).toBe('running');

      const result = await executor.executeStrategy(
        strategy.strategyId, BigInt(1_000_000_000)
      );

      expect(result.success).toBe(true);
      expect(result.executionId).toBeDefined();
      expect(result.gasUsed).toBeGreaterThan(BigInt(0));
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should reject execution of non-running strategy', async () => {
      const strategy = executor.createStrategy({
        agentId, strategyType: 'dca', params: {}, version: '1.0.0',
        riskLevel: 'low', maxGasBudget: BigInt(50_000_000),
      });

      // Not started yet
      await expect(
        executor.executeStrategy(strategy.strategyId, BigInt(1_000_000_000))
      ).rejects.toThrow('not running');
    });

    it('should stop a running strategy', async () => {
      const strategy = executor.createStrategy({
        agentId, strategyType: 'dca', params: {}, version: '1.0.0',
        riskLevel: 'low', maxGasBudget: BigInt(50_000_000),
      });

      await executor.startStrategy(strategy.strategyId);
      await executor.stopStrategy(strategy.strategyId, 'Test stop');

      const stopped = executor.getStrategy(strategy.strategyId)!;
      expect(stopped.status).toBe('stopped');
    });

    it('should reject restarting a stopped strategy', async () => {
      const strategy = executor.createStrategy({
        agentId, strategyType: 'dca', params: {}, version: '1.0.0',
        riskLevel: 'low', maxGasBudget: BigInt(50_000_000),
      });

      await executor.startStrategy(strategy.strategyId);
      await executor.stopStrategy(strategy.strategyId);

      await expect(
        executor.startStrategy(strategy.strategyId)
      ).rejects.toThrow('cannot be restarted');
    });
  });

  describe('auto-stop conditions', () => {
    it('should auto-stop after max executions', async () => {
      const strategy = executor.createStrategy({
        agentId, strategyType: 'dca', params: {}, version: '1.0.0',
        riskLevel: 'low', maxGasBudget: BigInt(1_000_000_000),
        stopConditions: { maxExecutions: 2 },
      });

      await executor.startStrategy(strategy.strategyId);

      await executor.executeStrategy(strategy.strategyId, BigInt(1_000_000_000));
      await executor.executeStrategy(strategy.strategyId, BigInt(1_000_000_000));

      const stopped = executor.getStrategy(strategy.strategyId)!;
      expect(stopped.status).toBe('stopped');
    });

    it('should auto-stop when strategy expires', async () => {
      const pastDate = new Date(Date.now() - 1000); // Already expired

      const strategy = executor.createStrategy({
        agentId, strategyType: 'dca', params: {}, version: '1.0.0',
        riskLevel: 'low', maxGasBudget: BigInt(100_000_000),
        stopConditions: { expiresAt: pastDate },
      });

      await executor.startStrategy(strategy.strategyId);
      await executor.executeStrategy(strategy.strategyId, BigInt(1_000_000_000));

      const stopped = executor.getStrategy(strategy.strategyId)!;
      expect(stopped.status).toBe('stopped');
    });
  });

  describe('performance tracking', () => {
    it('should track execution performance', async () => {
      const strategy = executor.createStrategy({
        agentId, strategyType: 'yield_farming', params: {}, version: '1.0.0',
        riskLevel: 'medium', maxGasBudget: BigInt(500_000_000),
      });

      await executor.startStrategy(strategy.strategyId);

      await executor.executeStrategy(strategy.strategyId, BigInt(1_000_000_000));
      await executor.executeStrategy(strategy.strategyId, BigInt(1_000_000_000));

      const updated = executor.getStrategy(strategy.strategyId)!;
      expect(updated.performance.successfulExecutions).toBe(2);
      expect(updated.performance.totalPnl).toBeGreaterThan(BigInt(0));
      expect(updated.performance.winRate).toBe(100);
    });

    it('should provide agent performance summary', async () => {
      const s1 = executor.createStrategy({
        agentId, strategyType: 'dca', params: {}, version: '1.0.0',
        riskLevel: 'low', maxGasBudget: BigInt(100_000_000),
      });
      const s2 = executor.createStrategy({
        agentId, strategyType: 'arbitrage', params: {}, version: '1.0.0',
        riskLevel: 'high', maxGasBudget: BigInt(200_000_000),
      });

      await executor.startStrategy(s1.strategyId);
      await executor.startStrategy(s2.strategyId);

      const summary = executor.getPerformanceSummary(agentId);
      expect(summary.totalStrategies).toBe(2);
      expect(summary.activeStrategies).toBe(2);
    });
  });

  describe('scheduling', () => {
    it('should attach schedule to strategy', () => {
      const strategy = executor.createStrategy({
        agentId, strategyType: 'dca', params: {}, version: '1.0.0',
        riskLevel: 'low', maxGasBudget: BigInt(50_000_000),
      });

      executor.scheduleStrategy(strategy.strategyId, {
        cron: '0 * * * *',
        timezone: 'UTC',
      });

      const updated = executor.getStrategy(strategy.strategyId)!;
      expect(updated.schedule!.cron).toBe('0 * * * *');
    });
  });
});

// ============================================================================
// Agent Registry Tests
// ============================================================================

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = createAgentRegistry();
  });

  describe('agent registration', () => {
    it('should register an agent', () => {
      const entry = registry.registerAgent(
        'reg_agent_1',
        '0:owner_addr',
        '0:contract_addr',
        { strategyType: 'dca' },
        { telegramUserId: 'tg_123', tags: ['automated', 'dca'] }
      );

      expect(entry.agentId).toBe('reg_agent_1');
      expect(entry.ownerAddress).toBe('0:owner_addr');
      expect(entry.contractAddress).toBe('0:contract_addr');
      expect(entry.telegramUserId).toBe('tg_123');
      expect(entry.tags).toContain('dca');
      expect(entry.strategyHash).toBeDefined();
      expect(entry.status).toBe('active');
      expect(entry.riskScore).toBe(100);
      expect(entry.auditTrail).toHaveLength(1);
    });

    it('should reject duplicate registration', () => {
      registry.registerAgent('dup_agent', '0:o', '0:c');
      expect(() =>
        registry.registerAgent('dup_agent', '0:o2', '0:c2')
      ).toThrow('already registered');
    });
  });

  describe('status and performance updates', () => {
    beforeEach(() => {
      registry.registerAgent('update_agent', '0:owner', '0:contract');
    });

    it('should update agent status', () => {
      registry.updateStatus('update_agent', 'paused', '0:owner');
      const entry = registry.getAgent('update_agent')!;
      expect(entry.status).toBe('paused');
      expect(entry.auditTrail).toHaveLength(2); // register + status update
    });

    it('should update performance metrics', () => {
      registry.updatePerformance('update_agent', {
        totalPnl: BigInt(500_000_000),
        totalVolume: BigInt(10_000_000_000),
        strategiesExecuted: 10,
        winRate: 80,
        sharpeRatio: 1.5,
        maxDrawdownBps: 500,
        return30dBps: 1000,
      });

      const entry = registry.getAgent('update_agent')!;
      expect(entry.performance.totalPnl).toBe(BigInt(500_000_000));
      expect(entry.performance.winRate).toBe(80);
    });

    it('should update risk score', () => {
      registry.updateRiskScore('update_agent', 350, '0:owner');
      const entry = registry.getAgent('update_agent')!;
      expect(entry.riskScore).toBe(350);
    });

    it('should reject invalid risk score', () => {
      expect(() =>
        registry.updateRiskScore('update_agent', 1500, '0:owner')
      ).toThrow('between 0 and 1000');
    });
  });

  describe('Telegram user mapping', () => {
    it('should map Telegram user to wallet and agent', () => {
      registry.registerAgent('tg_mapped_agent', '0:o', '0:c');

      const mapping = registry.mapTelegramUser('tg_user_42', '0:wallet_addr', 'tg_mapped_agent');
      expect(mapping.telegramUserId).toBe('tg_user_42');
      expect(mapping.walletAddress).toBe('0:wallet_addr');
      expect(mapping.agentIds).toContain('tg_mapped_agent');
    });

    it('should add agents to existing Telegram mapping', () => {
      registry.registerAgent('agent_x', '0:o', '0:c');
      registry.registerAgent('agent_y', '0:o', '0:c2');

      registry.mapTelegramUser('tg_user_multi', '0:wallet', 'agent_x');
      registry.mapTelegramUser('tg_user_multi', '0:wallet', 'agent_y');

      const mapping = registry.getTelegramMapping('tg_user_multi')!;
      expect(mapping.agentIds).toContain('agent_x');
      expect(mapping.agentIds).toContain('agent_y');
    });

    it('should get agents by Telegram user', () => {
      registry.registerAgent('tg_agent_1', '0:o', '0:c1');
      registry.registerAgent('tg_agent_2', '0:o', '0:c2');
      registry.mapTelegramUser('tg_test_user', '0:wallet', 'tg_agent_1');
      registry.mapTelegramUser('tg_test_user', '0:wallet', 'tg_agent_2');

      const agents = registry.getAgentsByTelegramUser('tg_test_user');
      expect(agents).toHaveLength(2);
    });
  });

  describe('queries and filtering', () => {
    beforeEach(() => {
      registry.registerAgent('a1', '0:owner1', '0:c1', {}, { tags: ['dca'] });
      registry.registerAgent('a2', '0:owner1', '0:c2', {}, { tags: ['arbitrage'] });
      registry.registerAgent('a3', '0:owner2', '0:c3', {}, { tags: ['dca'] });

      registry.updateStatus('a2', 'paused', '0:owner1');
      registry.updateRiskScore('a1', 200, '0:owner1');
      registry.updateRiskScore('a3', 500, '0:owner2');
    });

    it('should query by owner', () => {
      const results = registry.queryAgents({ ownerAddress: '0:owner1' });
      expect(results).toHaveLength(2);
    });

    it('should query by status', () => {
      const paused = registry.queryAgents({ status: 'paused' });
      expect(paused).toHaveLength(1);
      expect(paused[0].agentId).toBe('a2');
    });

    it('should query by max risk score', () => {
      const lowRisk = registry.queryAgents({ maxRiskScore: 300 });
      expect(lowRisk.every((a) => a.riskScore <= 300)).toBe(true);
    });

    it('should query by tags', () => {
      const dcaAgents = registry.queryAgents({ tags: ['dca'] });
      expect(dcaAgents).toHaveLength(2);
    });

    it('should respect limit and offset', () => {
      const page1 = registry.queryAgents({ limit: 2, offset: 0 });
      const page2 = registry.queryAgents({ limit: 2, offset: 2 });
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
    });

    it('should get top performers', () => {
      registry.updatePerformance('a1', { totalPnl: BigInt(1_000_000_000) } as any);
      registry.updatePerformance('a3', { totalPnl: BigInt(500_000_000) } as any);

      const top = registry.getTopPerformers(5);
      expect(top[0].performance.totalPnl).toBeGreaterThanOrEqual(
        top[top.length - 1].performance.totalPnl
      );
    });
  });

  describe('contract event tracking', () => {
    it('should record and retrieve contract events', () => {
      registry.registerAgent('event_agent', '0:owner', '0:event_contract');

      registry.recordContractEvent({
        type: 'transfer',
        contractAddress: '0:event_contract',
        data: { amount: '100000000' },
        txHash: 'tx_abc',
        blockSeqno: 1000001,
        timestamp: new Date(),
      });

      const events = registry.getContractEvents('0:event_contract');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('transfer');
    });
  });

  describe('audit trail', () => {
    it('should maintain audit trail', () => {
      registry.registerAgent('audit_agent', '0:owner', '0:contract');
      registry.addAuditEntry('audit_agent', 'custom.action', '0:owner', { detail: 'test' }, 'tx_hash');
      registry.updateStatus('audit_agent', 'paused', '0:owner');

      const trail = registry.getAuditTrail('audit_agent');
      expect(trail.length).toBeGreaterThanOrEqual(3); // register + custom + status
      expect(trail.some((e) => e.action === 'custom.action')).toBe(true);
    });
  });
});

// ============================================================================
// Fee Manager Tests
// ============================================================================

describe('FeeManager', () => {
  let feeManager: FeeManager;

  beforeEach(() => {
    feeManager = createFeeManager({
      performanceFeeBps: 1000, // 10%
      protocolFeeBps: 50,       // 0.5%
      marketplaceCommissionBps: 200, // 2%
      referralCommissionBps: 100, // 1%
      treasury: '0:treasury_addr',
      minFeeNano: BigInt(1_000_000),
    });
  });

  describe('fee calculations', () => {
    it('should calculate performance fee', () => {
      const fee = feeManager.calculatePerformanceFee(BigInt(1_000_000_000)); // 1 TON profit
      expect(fee).toBe(BigInt(100_000_000)); // 10% = 0.1 TON
    });

    it('should return zero performance fee for zero profit', () => {
      expect(feeManager.calculatePerformanceFee(BigInt(0))).toBe(BigInt(0));
      expect(feeManager.calculatePerformanceFee(BigInt(-100))).toBe(BigInt(0));
    });

    it('should calculate protocol fee', () => {
      const fee = feeManager.calculateProtocolFee(BigInt(1_000_000_000)); // 1 TON volume
      expect(fee).toBe(BigInt(5_000_000)); // 0.5% = 0.005 TON
    });

    it('should apply minimum fee', () => {
      const smallFee = feeManager.calculateProtocolFee(BigInt(100_000)); // tiny volume
      expect(smallFee).toBe(BigInt(1_000_000)); // minimum fee applied
    });

    it('should calculate marketplace commission', () => {
      const commission = feeManager.calculateMarketplaceCommission(BigInt(1_000_000_000));
      expect(commission).toBe(BigInt(20_000_000)); // 2% = 0.02 TON
    });

    it('should calculate referral commission', () => {
      const referral = feeManager.calculateReferralCommission(BigInt(100_000_000));
      expect(referral).toBe(BigInt(1_000_000)); // 1% = 0.001 TON
    });
  });

  describe('fee recording', () => {
    it('should record a fee', () => {
      const record = feeManager.recordFee(
        'performance',
        'agent_1',
        BigInt(100_000_000),
        '0:treasury_addr'
      );

      expect(record.feeId).toBeDefined();
      expect(record.type).toBe('performance');
      expect(record.amount).toBe(BigInt(100_000_000));
      expect(record.collected).toBe(false);
    });

    it('should mark fee as collected', () => {
      const record = feeManager.recordFee(
        'protocol',
        'agent_2',
        BigInt(5_000_000),
        '0:treasury_addr'
      );

      feeManager.markFeeCollected(record.feeId, 'tx_collect_hash');

      const updated = feeManager.getFeeRecord(record.feeId)!;
      expect(updated.collected).toBe(true);
      expect(updated.txHash).toBe('tx_collect_hash');
    });

    it('should reject zero or negative fees', () => {
      expect(() =>
        feeManager.recordFee('protocol', 'agent', BigInt(0), '0:addr')
      ).toThrow('must be positive');
    });
  });

  describe('revenue distribution', () => {
    it('should distribute revenue correctly', () => {
      const distribution = feeManager.distributeRevenue(
        'agent_rev',
        BigInt(1_000_000_000), // 1 TON profit
        '0:creator_addr'
      );

      expect(distribution.total).toBe(BigInt(100_000_000)); // 10% of 1 TON
      expect(distribution.protocol + distribution.treasury + distribution.creator).toBe(
        distribution.total
      );
    });

    it('should include referral commission when referrer registered', () => {
      feeManager.registerReferral('ref_agent', '0:referrer_addr');

      const distribution = feeManager.distributeRevenue(
        'ref_agent',
        BigInt(1_000_000_000),
        '0:creator_addr'
      );

      expect(distribution.referral).toBeGreaterThan(BigInt(0));
    });

    it('should process marketplace commission', () => {
      const distribution = feeManager.processMarketplaceCommission(
        'market_agent',
        BigInt(1_000_000_000),
        '0:seller_addr'
      );

      expect(distribution.total).toBe(BigInt(20_000_000)); // 2%
      expect(distribution.creator).toBeGreaterThan(BigInt(0));
    });
  });

  describe('creator balances and payouts', () => {
    it('should credit and payout creator earnings', () => {
      feeManager.creditCreator('0:creator', BigInt(50_000_000));
      feeManager.creditCreator('0:creator', BigInt(30_000_000));

      const balance = feeManager.getCreatorBalance('0:creator');
      expect(balance.totalEarned).toBe(BigInt(80_000_000));
      expect(balance.pendingPayout).toBe(BigInt(80_000_000));

      const paidOut = feeManager.processPayout('0:creator', 'tx_payout');
      expect(paidOut).toBe(BigInt(80_000_000));

      const afterPayout = feeManager.getCreatorBalance('0:creator');
      expect(afterPayout.pendingPayout).toBe(BigInt(0));
      expect(afterPayout.totalPaidOut).toBe(BigInt(80_000_000));
      expect(afterPayout.lastPayoutAt).toBeInstanceOf(Date);
    });

    it('should return zero for unknown creator', () => {
      const balance = feeManager.getCreatorBalance('0:unknown_creator');
      expect(balance.totalEarned).toBe(BigInt(0));
    });
  });

  describe('fee queries', () => {
    beforeEach(() => {
      feeManager.recordFee('performance', 'agent_a', BigInt(100_000_000), '0:t');
      feeManager.recordFee('protocol', 'agent_a', BigInt(5_000_000), '0:t');
      feeManager.recordFee('marketplace', 'agent_b', BigInt(20_000_000), '0:t');
      const rec = feeManager.recordFee('performance', 'agent_b', BigInt(50_000_000), '0:t');
      feeManager.markFeeCollected(rec.feeId, 'tx_hash');
    });

    it('should get fees by agent', () => {
      const agentAFees = feeManager.getFeesByAgent('agent_a');
      expect(agentAFees).toHaveLength(2);
    });

    it('should get fees by type', () => {
      const perfFees = feeManager.getFeesByType('performance');
      expect(perfFees).toHaveLength(2);
    });

    it('should get pending fees', () => {
      const pending = feeManager.getPendingFees();
      expect(pending.every((f) => !f.collected)).toBe(true);
    });

    it('should calculate revenue by type', () => {
      const revenue = feeManager.getRevenueByType();
      expect(revenue.performance).toBe(BigInt(50_000_000)); // Only the collected one
      expect(revenue.marketplace).toBe(BigInt(0)); // Not collected
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Helper Functions', () => {
  describe('deriveContractAddress', () => {
    it('should be deterministic', () => {
      const a1 = deriveContractAddress('0:owner', 'salt:123', 0);
      const a2 = deriveContractAddress('0:owner', 'salt:123', 0);
      expect(a1).toBe(a2);
    });

    it('should produce valid address format', () => {
      const addr = deriveContractAddress('0:owner', 'salt', 0);
      expect(addr).toMatch(/^0:[0-9a-f]{64}$/);
    });

    it('should produce masterchain address for workchain -1', () => {
      const addr = deriveContractAddress('0:owner', 'salt', -1);
      expect(addr).toMatch(/^-1:[0-9a-f]{64}$/);
    });
  });

  describe('buildDeploymentTransaction', () => {
    it('should build a valid deployment transaction', () => {
      const tx = buildDeploymentTransaction(
        '0:factory_addr',
        { ownerId: 'u1', ownerAddress: '0:o1', walletMode: 'non-custodial' },
        BigInt(100_000_000)
      );

      expect(tx.to).toBe('0:factory_addr');
      expect(tx.value).toBe(BigInt(100_000_000));
      expect(tx.body).toBeDefined();
      expect(tx.description).toContain('Deploy agent wallet');
      expect(tx.estimatedFee).toBe(BigInt(100_000_000));
    });
  });
});
