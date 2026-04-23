/**
 * AgentWallet — TypeScript wrapper
 *
 * Hand-written in Blueprint style from contracts/agent-wallet.tact.
 * Regenerate by running: npm run contracts:build (from the repo root)
 */

import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
  Sender,
  SendMode,
  StateInit,
  TupleBuilder,
  TupleReader,
} from '@ton/core';

// ---------------------------------------------------------------------------
// Opcodes
// ---------------------------------------------------------------------------

/**
 * CRC-32 opcodes for every message type accepted by AgentWallet.
 * These are derived from the Tact compiler's message-name hashing scheme.
 */
export const AgentWalletOpcodes = {
  Deposit:          0x67d869f2 as const,
  WithdrawRequest:  0xa0b9ff6b as const,
  ClaimWithdrawal:  0x5ccd48cc as const,
  AgentExecute:     0x7b4e8675 as const,
  UpdateLimits:     0x5c1d5ae8 as const,
  SetAllowedDex:    0x82cb72e1 as const,
  SetAgent:         0x8d9e7c3a as const,
  SetPaused:        0x9c7f3d24 as const,
  EmergencyDrain:   0x1de15fb0 as const,
  SetSafeAddress:   0x4d9e7f1c as const,
} as const;

// ---------------------------------------------------------------------------
// Struct types
// ---------------------------------------------------------------------------

export interface WalletLimits {
  maxTradeSizeNano: bigint;
  dailyLimitNano: bigint;
  timeLockSeconds: number;
}

export interface PendingWithdrawal {
  to: Address;
  amount: bigint;
  unlocksAt: bigint;
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export interface Deposit {
  $$type: 'Deposit';
}

export interface WithdrawRequest {
  $$type: 'WithdrawRequest';
  to: Address;
  amount: bigint;
}

export interface ClaimWithdrawal {
  $$type: 'ClaimWithdrawal';
  nonce: bigint;
}

export interface AgentExecute {
  $$type: 'AgentExecute';
  to: Address;
  amount: bigint;
  payload: Cell | null;
  opCode: number;
}

export interface UpdateLimits {
  $$type: 'UpdateLimits';
  maxTradeSizeNano: bigint;
  dailyLimitNano: bigint;
  timeLockSeconds: number;
}

export interface SetAllowedDex {
  $$type: 'SetAllowedDex';
  dex: Address;
  allowed: boolean;
}

export interface SetAgent {
  $$type: 'SetAgent';
  agent: Address;
}

export interface SetPaused {
  $$type: 'SetPaused';
  paused: boolean;
}

export interface EmergencyDrain {
  $$type: 'EmergencyDrain';
}

export interface SetSafeAddress {
  $$type: 'SetSafeAddress';
  safe: Address;
}

// ---------------------------------------------------------------------------
// Init data type
// ---------------------------------------------------------------------------

export interface AgentWalletInit {
  owner: Address;
  agent: Address;
  safeAddress: Address;
  maxTradeSizeNano: bigint;
  dailyLimitNano: bigint;
  timeLockSeconds: bigint;
}

// ---------------------------------------------------------------------------
// Cell serialisers
// ---------------------------------------------------------------------------

function storeDeposit(_msg: Deposit): Cell {
  return beginCell()
    .storeUint(AgentWalletOpcodes.Deposit, 32)
    .endCell();
}

function storeWithdrawRequest(msg: WithdrawRequest): Cell {
  return beginCell()
    .storeUint(AgentWalletOpcodes.WithdrawRequest, 32)
    .storeAddress(msg.to)
    .storeCoins(msg.amount)
    .endCell();
}

function storeClaimWithdrawal(msg: ClaimWithdrawal): Cell {
  return beginCell()
    .storeUint(AgentWalletOpcodes.ClaimWithdrawal, 32)
    .storeUint(msg.nonce, 64)
    .endCell();
}

function storeAgentExecute(msg: AgentExecute): Cell {
  const b = beginCell()
    .storeUint(AgentWalletOpcodes.AgentExecute, 32)
    .storeAddress(msg.to)
    .storeCoins(msg.amount);
  if (msg.payload !== null) {
    b.storeBit(true).storeRef(msg.payload);
  } else {
    b.storeBit(false);
  }
  return b.storeUint(msg.opCode, 32).endCell();
}

function storeUpdateLimits(msg: UpdateLimits): Cell {
  return beginCell()
    .storeUint(AgentWalletOpcodes.UpdateLimits, 32)
    .storeCoins(msg.maxTradeSizeNano)
    .storeCoins(msg.dailyLimitNano)
    .storeUint(msg.timeLockSeconds, 32)
    .endCell();
}

function storeSetAllowedDex(msg: SetAllowedDex): Cell {
  return beginCell()
    .storeUint(AgentWalletOpcodes.SetAllowedDex, 32)
    .storeAddress(msg.dex)
    .storeBit(msg.allowed)
    .endCell();
}

function storeSetAgent(msg: SetAgent): Cell {
  return beginCell()
    .storeUint(AgentWalletOpcodes.SetAgent, 32)
    .storeAddress(msg.agent)
    .endCell();
}

function storeSetPaused(msg: SetPaused): Cell {
  return beginCell()
    .storeUint(AgentWalletOpcodes.SetPaused, 32)
    .storeBit(msg.paused)
    .endCell();
}

function storeEmergencyDrain(_msg: EmergencyDrain): Cell {
  return beginCell()
    .storeUint(AgentWalletOpcodes.EmergencyDrain, 32)
    .endCell();
}

function storeSetSafeAddress(msg: SetSafeAddress): Cell {
  return beginCell()
    .storeUint(AgentWalletOpcodes.SetSafeAddress, 32)
    .storeAddress(msg.safe)
    .endCell();
}

// ---------------------------------------------------------------------------
// Getter decoders
// ---------------------------------------------------------------------------

function loadWalletLimits(reader: TupleReader): WalletLimits {
  return {
    maxTradeSizeNano: reader.readBigNumber(),
    dailyLimitNano:   reader.readBigNumber(),
    timeLockSeconds:  reader.readNumber(),
  };
}

function loadPendingWithdrawal(reader: TupleReader): PendingWithdrawal {
  return {
    to:         reader.readAddress(),
    amount:     reader.readBigNumber(),
    unlocksAt:  reader.readBigNumber(),
  };
}

// ---------------------------------------------------------------------------
// Contract class
// ---------------------------------------------------------------------------

export class AgentWallet implements Contract {
  readonly address: Address;
  readonly init?: StateInit;

  private constructor(address: Address, init?: StateInit) {
    this.address = address;
    this.init = init;
  }

  /** Derive contract address from an already-deployed instance. */
  static fromAddress(address: Address): AgentWallet {
    return new AgentWallet(address);
  }

  /** Derive contract address and StateInit from constructor arguments. */
  static async fromInit(
    owner: Address,
    agent: Address,
    safeAddress: Address,
    maxTradeSizeNano: bigint,
    dailyLimitNano: bigint,
    timeLockSeconds: bigint,
  ): Promise<AgentWallet> {
    const init = await AgentWallet.getInit(
      owner, agent, safeAddress, maxTradeSizeNano, dailyLimitNano, timeLockSeconds,
    );
    const address = contractAddress(0, init);
    return new AgentWallet(address, init);
  }

  /** Build the StateInit cell. */
  static async getInit(
    owner: Address,
    agent: Address,
    safeAddress: Address,
    maxTradeSizeNano: bigint,
    dailyLimitNano: bigint,
    timeLockSeconds: bigint,
  ): Promise<StateInit> {
    // Data cell matches the Tact-compiled storage layout
    const data = beginCell()
      .storeAddress(owner)
      .storeAddress(agent)
      .storeAddress(safeAddress)
      .storeCoins(maxTradeSizeNano)
      .storeCoins(dailyLimitNano)
      .storeUint(timeLockSeconds, 32)
      // dailySpent, dayStart, withdrawalNonce, isPaused, whitelistActive
      .storeCoins(0n)
      .storeUint(0, 64)
      .storeDict(Dictionary.empty())
      .storeBit(false)
      .storeBit(false)
      .storeDict(Dictionary.empty())
      .storeUint(0, 64)
      .endCell();

    // In a real Blueprint build the code cell is taken from the compiled .boc.
    // The placeholder below keeps the TypeScript types fully usable while
    // making the compile-time dependency on a Tact toolchain optional.
    const code = Cell.EMPTY;

    return { code, data };
  }

  // --------------------------------------------------------------------------
  // send* methods — one per receive() handler in the Tact contract
  // --------------------------------------------------------------------------

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendDeposit(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: Deposit,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeDeposit(msg),
    });
  }

  async sendWithdrawRequest(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: WithdrawRequest,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeWithdrawRequest(msg),
    });
  }

  async sendClaimWithdrawal(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: ClaimWithdrawal,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeClaimWithdrawal(msg),
    });
  }

  async sendAgentExecute(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: AgentExecute,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeAgentExecute(msg),
    });
  }

  async sendUpdateLimits(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: UpdateLimits,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeUpdateLimits(msg),
    });
  }

  async sendSetAllowedDex(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetAllowedDex,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetAllowedDex(msg),
    });
  }

  async sendSetAgent(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetAgent,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetAgent(msg),
    });
  }

  async sendSetPaused(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetPaused,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetPaused(msg),
    });
  }

  async sendEmergencyDrain(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: EmergencyDrain,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeEmergencyDrain(msg),
    });
  }

  async sendSetSafeAddress(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetSafeAddress,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetSafeAddress(msg),
    });
  }

  // --------------------------------------------------------------------------
  // get* methods — one per get fun in the Tact contract
  // --------------------------------------------------------------------------

  async getBalance(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('balance', []);
    return result.stack.readBigNumber();
  }

  async getAgentAddress(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('agentAddress', []);
    return result.stack.readAddress();
  }

  async getSafeAddr(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('safeAddr', []);
    return result.stack.readAddress();
  }

  async getLimits(provider: ContractProvider): Promise<WalletLimits> {
    const result = await provider.get('limits', []);
    return loadWalletLimits(result.stack);
  }

  async getPaused(provider: ContractProvider): Promise<boolean> {
    const result = await provider.get('paused', []);
    return result.stack.readBoolean();
  }

  async getDailySpentToday(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('dailySpentToday', []);
    return result.stack.readBigNumber();
  }

  async getPendingWithdrawal(
    provider: ContractProvider,
    nonce: bigint,
  ): Promise<PendingWithdrawal | null> {
    const tb = new TupleBuilder();
    tb.writeNumber(nonce);
    const result = await provider.get('pendingWithdrawal', tb.build());
    const cell = result.stack.readCellOpt();
    if (cell === null) return null;
    const reader = new TupleReader(result.stack.readTuple());
    return loadPendingWithdrawal(reader);
  }
}
