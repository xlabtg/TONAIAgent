/**
 * StrategyExecutor — Blueprint / ton-sandbox tests
 *
 * Tests for the StrategyExecutor Tact contract (contracts/strategy-executor.tact).
 *
 * Run (after Blueprint installation):
 *   npx blueprint test contracts/tests/strategy-executor.spec.ts
 */

import { Blockchain, SandboxContract, TreasuryWallet } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { StrategyExecutor } from '../wrappers/StrategyExecutor';
import '@ton/test-utils';

describe('StrategyExecutor', () => {
  let blockchain: Blockchain;
  let owner: SandboxContract<TreasuryWallet>;
  let orchestrator: SandboxContract<TreasuryWallet>;
  let agentWallet: SandboxContract<TreasuryWallet>;
  let attacker: SandboxContract<TreasuryWallet>;
  let executor: SandboxContract<StrategyExecutor>;

  const STRATEGY_ID = 1001n;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    owner        = await blockchain.treasury('owner');
    orchestrator = await blockchain.treasury('orchestrator');
    agentWallet  = await blockchain.treasury('agentWallet');
    attacker     = await blockchain.treasury('attacker');

    executor = blockchain.openContract(
      await StrategyExecutor.fromInit(owner.address, orchestrator.address)
    );

    // Deploy
    const deployResult = await executor.send(
      owner.getSender(),
      { value: toNano('1') },
      { $$type: 'Deploy', queryId: 0n }
    );
    expect(deployResult.transactions).toHaveTransaction({
      from: owner.address,
      to: executor.address,
      deploy: true,
      success: true,
    });
  });

  // ---- helpers ----

  async function registerRunningStrategy(id: bigint = STRATEGY_ID) {
    await executor.send(
      orchestrator.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'RegisterStrategy',
        strategyId: id,
        agentWallet: agentWallet.address,
        strategyType: 'dca',
        riskLevel: 0,                   // RISK_LOW
        maxPositionNano: toNano('10'),
        maxLossNano: toNano('50'),
        maxExecutions: 0,               // unlimited
        expiresAt: 0n,                  // never
      }
    );
    await executor.send(
      orchestrator.getSender(),
      { value: toNano('0.05') },
      { $$type: 'StartStrategy', strategyId: id }
    );
  }

  // ---- registration ----

  it('orchestrator can register a strategy', async () => {
    await registerRunningStrategy();
    const rec = await executor.getStrategy(STRATEGY_ID);
    expect(rec).not.toBeNull();
    expect(rec!.strategyId).toBe(STRATEGY_ID);
    expect(rec!.status).toBe(1n);   // STATUS_RUNNING
  });

  it('owner can also register a strategy', async () => {
    await executor.send(
      owner.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'RegisterStrategy',
        strategyId: 2002n,
        agentWallet: agentWallet.address,
        strategyType: 'arb',
        riskLevel: 1,
        maxPositionNano: toNano('5'),
        maxLossNano: toNano('20'),
        maxExecutions: 10,
        expiresAt: 0n,
      }
    );
    const rec = await executor.getStrategy(2002n);
    expect(rec).not.toBeNull();
  });

  it('attacker cannot register a strategy', async () => {
    const result = await executor.send(
      attacker.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'RegisterStrategy',
        strategyId: 9999n,
        agentWallet: agentWallet.address,
        strategyType: 'evil',
        riskLevel: 3,
        maxPositionNano: toNano('100'),
        maxLossNano: toNano('100'),
        maxExecutions: 0,
        expiresAt: 0n,
      }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });

  // ---- start / stop ----

  it('strategy must be started before signals can be executed', async () => {
    await executor.send(
      orchestrator.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'RegisterStrategy',
        strategyId: 3003n,
        agentWallet: agentWallet.address,
        strategyType: 'dca',
        riskLevel: 0,
        maxPositionNano: toNano('5'),
        maxLossNano: toNano('20'),
        maxExecutions: 0,
        expiresAt: 0n,
      }
    );
    // Status is PENDING — signal should be rejected
    const result = await executor.send(
      orchestrator.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'ExecuteSignal',
        strategyId: 3003n,
        signalNonce: 1n,
        to: agentWallet.address,
        amount: toNano('1'),
        payload: null,
        expectedPnlNano: toNano('0.01'),
      }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });

  it('orchestrator can stop a running strategy', async () => {
    await registerRunningStrategy();
    await executor.send(
      orchestrator.getSender(),
      { value: toNano('0.05') },
      { $$type: 'StopStrategy', strategyId: STRATEGY_ID }
    );
    const rec = await executor.getStrategy(STRATEGY_ID);
    expect(rec!.status).toBe(2n);   // STATUS_STOPPED
  });

  // ---- execute signal ----

  it('orchestrator can execute a valid signal', async () => {
    await registerRunningStrategy();

    const result = await executor.send(
      orchestrator.getSender(),
      { value: toNano('0.05') + toNano('5') },  // gas + trade value
      {
        $$type: 'ExecuteSignal',
        strategyId: STRATEGY_ID,
        signalNonce: 1n,
        to: agentWallet.address,
        amount: toNano('5'),
        payload: null,
        expectedPnlNano: BigInt(toNano('0.01')),
      }
    );
    expect(result.transactions).toHaveTransaction({
      from: executor.address,
      to: agentWallet.address,
      success: true,
    });

    const rec = await executor.getStrategy(STRATEGY_ID);
    expect(rec!.executionCount).toBe(1n);
    expect(rec!.lastSignalNonce).toBe(1n);
  });

  it('replayed signal nonce is rejected', async () => {
    await registerRunningStrategy();

    // Execute nonce 1
    await executor.send(
      orchestrator.getSender(),
      { value: toNano('5') + toNano('0.05') },
      {
        $$type: 'ExecuteSignal',
        strategyId: STRATEGY_ID,
        signalNonce: 1n,
        to: agentWallet.address,
        amount: toNano('1'),
        payload: null,
        expectedPnlNano: 0n,
      }
    );

    // Replay nonce 1 — should fail
    const replayResult = await executor.send(
      orchestrator.getSender(),
      { value: toNano('1') + toNano('0.05') },
      {
        $$type: 'ExecuteSignal',
        strategyId: STRATEGY_ID,
        signalNonce: 1n,
        to: agentWallet.address,
        amount: toNano('1'),
        payload: null,
        expectedPnlNano: 0n,
      }
    );
    expect(replayResult.transactions).toHaveTransaction({ success: false });
  });

  it('signal exceeding maxPositionNano is rejected', async () => {
    await registerRunningStrategy();

    const result = await executor.send(
      orchestrator.getSender(),
      { value: toNano('20') + toNano('0.05') },
      {
        $$type: 'ExecuteSignal',
        strategyId: STRATEGY_ID,
        signalNonce: 1n,
        to: agentWallet.address,
        amount: toNano('15'),   // > maxPositionNano (10 TON)
        payload: null,
        expectedPnlNano: 0n,
      }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });

  it('attacker cannot execute a signal', async () => {
    await registerRunningStrategy();

    const result = await executor.send(
      attacker.getSender(),
      { value: toNano('1') + toNano('0.05') },
      {
        $$type: 'ExecuteSignal',
        strategyId: STRATEGY_ID,
        signalNonce: 1n,
        to: agentWallet.address,
        amount: toNano('1'),
        payload: null,
        expectedPnlNano: 0n,
      }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });

  // ---- max executions ----

  it('strategy auto-completes when maxExecutions is reached', async () => {
    // Register strategy with maxExecutions = 3
    await executor.send(
      orchestrator.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'RegisterStrategy',
        strategyId: 4004n,
        agentWallet: agentWallet.address,
        strategyType: 'limited',
        riskLevel: 0,
        maxPositionNano: toNano('5'),
        maxLossNano: toNano('100'),
        maxExecutions: 3,
        expiresAt: 0n,
      }
    );
    await executor.send(
      orchestrator.getSender(),
      { value: toNano('0.05') },
      { $$type: 'StartStrategy', strategyId: 4004n }
    );

    for (let nonce = 1n; nonce <= 3n; nonce++) {
      await executor.send(
        orchestrator.getSender(),
        { value: toNano('1') + toNano('0.05') },
        {
          $$type: 'ExecuteSignal',
          strategyId: 4004n,
          signalNonce: nonce,
          to: agentWallet.address,
          amount: toNano('1'),
          payload: null,
          expectedPnlNano: 0n,
        }
      );
    }

    const rec = await executor.getStrategy(4004n);
    expect(rec!.status).toBe(3n);   // STATUS_COMPLETED
  });

  // ---- report outcome ----

  it('orchestrator can report actual outcome and patch audit log', async () => {
    await registerRunningStrategy();

    await executor.send(
      orchestrator.getSender(),
      { value: toNano('1') + toNano('0.05') },
      {
        $$type: 'ExecuteSignal',
        strategyId: STRATEGY_ID,
        signalNonce: 1n,
        to: agentWallet.address,
        amount: toNano('1'),
        payload: null,
        expectedPnlNano: BigInt(toNano('0.05')),
      }
    );

    const reportResult = await executor.send(
      orchestrator.getSender(),
      { value: toNano('0.05') },
      {
        $$type: 'ReportOutcome',
        strategyId: STRATEGY_ID,
        signalNonce: 1n,
        actualPnlNano: -BigInt(toNano('0.01')),   // small loss
        gasUsedNano: toNano('0.002'),
      }
    );
    expect(reportResult.transactions).toHaveTransaction({ success: true });
  });

  // ---- emergency halt ----

  it('owner can halt all strategy execution', async () => {
    await registerRunningStrategy();

    await executor.send(
      owner.getSender(),
      { value: toNano('0.05') },
      { $$type: 'EmergencyHalt' }
    );
    expect(await executor.getHalted()).toBe(true);

    // Signal while halted should fail
    const result = await executor.send(
      orchestrator.getSender(),
      { value: toNano('1') + toNano('0.05') },
      {
        $$type: 'ExecuteSignal',
        strategyId: STRATEGY_ID,
        signalNonce: 1n,
        to: agentWallet.address,
        amount: toNano('1'),
        payload: null,
        expectedPnlNano: 0n,
      }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });

  it('non-owner cannot halt', async () => {
    const result = await executor.send(
      attacker.getSender(),
      { value: toNano('0.05') },
      { $$type: 'EmergencyHalt' }
    );
    expect(result.transactions).toHaveTransaction({ success: false });
  });
});
