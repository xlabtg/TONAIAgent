/**
 * AgentFactory — Blueprint / ton-sandbox tests
 *
 * Tests for the AgentFactory Tact contract (contracts/agent-factory.tact).
 *
 * Run (after Blueprint installation):
 *   npx blueprint test contracts/tests/agent-factory.spec.ts
 */

import { Blockchain, SandboxContract, TreasuryWallet } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { AgentFactory } from '../wrappers/AgentFactory';
import '@ton/test-utils';

describe('AgentFactory', () => {
  let blockchain: Blockchain;
  let owner: SandboxContract<TreasuryWallet>;
  let treasury: SandboxContract<TreasuryWallet>;
  let user1: SandboxContract<TreasuryWallet>;
  let user2: SandboxContract<TreasuryWallet>;
  let attacker: SandboxContract<TreasuryWallet>;
  let factory: SandboxContract<AgentFactory>;

  const DEPLOY_FEE = toNano('0.1');   // 0.1 TON
  const MAX_AGENTS = 3;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    owner    = await blockchain.treasury('owner');
    treasury = await blockchain.treasury('treasury');
    user1    = await blockchain.treasury('user1');
    user2    = await blockchain.treasury('user2');
    attacker = await blockchain.treasury('attacker');

    factory = blockchain.openContract(
      await AgentFactory.fromInit(
        owner.address,
        treasury.address,
        DEPLOY_FEE,
        100,          // 1% protocol fee
        MAX_AGENTS
      )
    );

    // Deploy the factory
    const deployResult = await factory.send(
      owner.getSender(),
      { value: toNano('1') },
      { $$type: 'Deploy', queryId: 0n }
    );
    expect(deployResult.transactions).toHaveTransaction({
      from: owner.address,
      to: factory.address,
      deploy: true,
      success: true,
    });
  });

  // ---- initial state ----

  it('should initialise with correct configuration', async () => {
    const [fee, bps, maxAgents, accepting] = await factory.getConfig();
    expect(fee).toBe(DEPLOY_FEE);
    expect(bps).toBe(100n);
    expect(maxAgents).toBe(BigInt(MAX_AGENTS));
    expect(accepting).toBe(true);
  });

  // ---- deploy agent ----

  it('should accept a deployment with sufficient fee', async () => {
    const agentAddr = await blockchain.treasury('agent1');
    const result = await factory.send(
      user1.getSender(),
      { value: DEPLOY_FEE + toNano('0.05') },   // fee + gas
      {
        $$type: 'DeployAgent',
        ownerAddress: user1.address,
        agentAddress: agentAddr.address,
        safeAddress: user1.address,
        maxTradeSizeNano: toNano('10'),
        dailyLimitNano: toNano('50'),
        timeLockSeconds: 0,
        referrer: null,
      }
    );
    expect(result.transactions).toHaveTransaction({
      from: user1.address,
      to: factory.address,
      success: true,
    });

    // Deployment fee should be forwarded to treasury
    expect(result.transactions).toHaveTransaction({
      from: factory.address,
      to: treasury.address,
      success: true,
    });

    const [totalDeployed] = await factory.getStats();
    expect(totalDeployed).toBe(1n);
  });

  it('should reject deployment when fee is insufficient', async () => {
    const agentAddr = await blockchain.treasury('agent_cheap');
    const result = await factory.send(
      user1.getSender(),
      { value: toNano('0.01') },    // below DEPLOY_FEE
      {
        $$type: 'DeployAgent',
        ownerAddress: user1.address,
        agentAddress: agentAddr.address,
        safeAddress: user1.address,
        maxTradeSizeNano: toNano('10'),
        dailyLimitNano: toNano('50'),
        timeLockSeconds: 0,
        referrer: null,
      }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });

  it('should enforce per-user agent limit', async () => {
    const agentAddr = await blockchain.treasury('bulk_agent');

    // Deploy MAX_AGENTS agents for user1
    for (let i = 0; i < MAX_AGENTS; i++) {
      const r = await factory.send(
        user1.getSender(),
        { value: DEPLOY_FEE + toNano('0.05') },
        {
          $$type: 'DeployAgent',
          ownerAddress: user1.address,
          agentAddress: agentAddr.address,
          safeAddress: user1.address,
          maxTradeSizeNano: toNano('10'),
          dailyLimitNano: toNano('50'),
          timeLockSeconds: 0,
          referrer: null,
        }
      );
      expect(r.transactions).toHaveTransaction({ success: true });
    }

    // (MAX_AGENTS + 1)th deployment should fail
    const overflow = await factory.send(
      user1.getSender(),
      { value: DEPLOY_FEE + toNano('0.05') },
      {
        $$type: 'DeployAgent',
        ownerAddress: user1.address,
        agentAddress: agentAddr.address,
        safeAddress: user1.address,
        maxTradeSizeNano: toNano('10'),
        dailyLimitNano: toNano('50'),
        timeLockSeconds: 0,
        referrer: null,
      }
    );
    expect(overflow.transactions).toHaveTransaction({ success: false });
  });

  it('limit is per-user: different users can each deploy up to the max', async () => {
    const agentAddr = await blockchain.treasury('shared_agent');

    for (const user of [user1, user2]) {
      for (let i = 0; i < MAX_AGENTS; i++) {
        const r = await factory.send(
          user.getSender(),
          { value: DEPLOY_FEE + toNano('0.05') },
          {
            $$type: 'DeployAgent',
            ownerAddress: user.address,
            agentAddress: agentAddr.address,
            safeAddress: user.address,
            maxTradeSizeNano: toNano('10'),
            dailyLimitNano: toNano('50'),
            timeLockSeconds: 0,
            referrer: null,
          }
        );
        expect(r.transactions).toHaveTransaction({ success: true });
      }
    }

    const [totalDeployed] = await factory.getStats();
    expect(totalDeployed).toBe(BigInt(MAX_AGENTS * 2));
  });

  // ---- pause / resume ----

  it('owner can pause and resume deployments', async () => {
    const agentAddr = await blockchain.treasury('paused_agent');

    await factory.send(
      owner.getSender(),
      { value: toNano('0.05') },
      { $$type: 'SetAcceptingDeployments', accepting: false }
    );
    const [, , , accepting] = await factory.getConfig();
    expect(accepting).toBe(false);

    // Deployment while paused should fail
    const result = await factory.send(
      user1.getSender(),
      { value: DEPLOY_FEE + toNano('0.05') },
      {
        $$type: 'DeployAgent',
        ownerAddress: user1.address,
        agentAddress: agentAddr.address,
        safeAddress: user1.address,
        maxTradeSizeNano: toNano('10'),
        dailyLimitNano: toNano('50'),
        timeLockSeconds: 0,
        referrer: null,
      }
    );
    expect(result.transactions).toHaveTransaction({ success: false });

    // Re-enable
    await factory.send(
      owner.getSender(),
      { value: toNano('0.05') },
      { $$type: 'SetAcceptingDeployments', accepting: true }
    );
    const [, , , acceptingAfter] = await factory.getConfig();
    expect(acceptingAfter).toBe(true);
  });

  it('non-owner cannot pause', async () => {
    const result = await factory.send(
      attacker.getSender(),
      { value: toNano('0.05') },
      { $$type: 'SetAcceptingDeployments', accepting: false }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });

  // ---- admin: update fee ----

  it('owner can update deployment fee', async () => {
    const newFee = toNano('0.2');
    await factory.send(
      owner.getSender(),
      { value: toNano('0.05') },
      { $$type: 'SetDeploymentFee', fee: newFee }
    );
    const [fee] = await factory.getConfig();
    expect(fee).toBe(newFee);
  });

  it('non-owner cannot update deployment fee', async () => {
    const result = await factory.send(
      attacker.getSender(),
      { value: toNano('0.05') },
      { $$type: 'SetDeploymentFee', fee: toNano('0') }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });

  // ---- upgrade proposals ----

  it('owner can propose and approve an upgrade', async () => {
    const propResult = await factory.send(
      owner.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'ProposeUpgrade',
        newCodeHash: BigInt('0xdeadbeef'),
        upgradeType: 0,
        approvalsRequired: 1,
        migrationNotes: 'v1.1.0 patch',
      }
    );
    expect(propResult.transactions).toHaveTransaction({ success: true });

    // Auto-approved because approvalsRequired = 1 and proposer counts as 1
    const proposal = await factory.getUpgradeProposal(1n);
    expect(proposal).not.toBeNull();
    expect(proposal!.executed).toBe(true);
  });

  it('non-owner cannot propose an upgrade', async () => {
    const result = await factory.send(
      attacker.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'ProposeUpgrade',
        newCodeHash: BigInt('0x1234'),
        upgradeType: 0,
        approvalsRequired: 1,
        migrationNotes: '',
      }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });
});
