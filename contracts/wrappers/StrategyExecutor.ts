/**
 * StrategyExecutor — TypeScript wrapper
 *
 * Hand-written in Blueprint style from contracts/strategy-executor.tact.
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
 * CRC-32 opcodes for every message type accepted by StrategyExecutor.
 */
export const StrategyExecutorOpcodes = {
  RegisterStrategy: 0x4e8a1f62 as const,
  StartStrategy:    0xb3c5d7e9 as const,
  StopStrategy:     0xf1a2b3c4 as const,
  ExecuteSignal:    0x2d9f4e7a as const,
  ReportOutcome:    0x8c6b3a12 as const,
  SetOrchestrator:  0xe4d9c7f2 as const,
  EmergencyHalt:    0x3a8f7b56 as const,
} as const;

// ---------------------------------------------------------------------------
// Strategy status and risk level constants (mirrors the Tact contract)
// ---------------------------------------------------------------------------

export const StrategyStatus = {
  Pending:   0,
  Running:   1,
  Stopped:   2,
  Completed: 3,
  Failed:    4,
} as const;

export const RiskLevel = {
  Low:      0,
  Medium:   1,
  High:     2,
  Critical: 3,
} as const;

// ---------------------------------------------------------------------------
// Struct types
// ---------------------------------------------------------------------------

export interface StrategyRecord {
  strategyId: bigint;
  agentWallet: Address;
  strategyType: string;
  riskLevel: number;
  status: number;
  maxPositionNano: bigint;
  maxLossNano: bigint;
  maxExecutions: number;
  expiresAt: bigint;
  executionCount: number;
  cumulativeLossNano: bigint;
  lastSignalNonce: bigint;
  registeredAt: bigint;
  startedAt: bigint;
  stoppedAt: bigint;
}

export interface AuditEntry {
  strategyId: bigint;
  seqno: number;
  signalNonce: bigint;
  to: Address;
  amount: bigint;
  expectedPnlNano: bigint;
  actualPnlNano: bigint;
  gasUsedNano: bigint;
  executedAt: bigint;
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export interface RegisterStrategy {
  $$type: 'RegisterStrategy';
  strategyId: bigint;
  agentWallet: Address;
  strategyType: string;
  riskLevel: number;
  maxPositionNano: bigint;
  maxLossNano: bigint;
  maxExecutions: number;
  expiresAt: bigint;
}

export interface StartStrategy {
  $$type: 'StartStrategy';
  strategyId: bigint;
}

export interface StopStrategy {
  $$type: 'StopStrategy';
  strategyId: bigint;
}

export interface ExecuteSignal {
  $$type: 'ExecuteSignal';
  strategyId: bigint;
  signalNonce: bigint;
  to: Address;
  amount: bigint;
  payload: Cell | null;
  expectedPnlNano: bigint;
}

export interface ReportOutcome {
  $$type: 'ReportOutcome';
  strategyId: bigint;
  signalNonce: bigint;
  actualPnlNano: bigint;
  gasUsedNano: bigint;
}

export interface SetOrchestrator {
  $$type: 'SetOrchestrator';
  orchestrator: Address;
}

export interface EmergencyHalt {
  $$type: 'EmergencyHalt';
}

// ---------------------------------------------------------------------------
// Cell serialisers
// ---------------------------------------------------------------------------

function storeRegisterStrategy(msg: RegisterStrategy): Cell {
  return beginCell()
    .storeUint(StrategyExecutorOpcodes.RegisterStrategy, 32)
    .storeUint(msg.strategyId, 64)
    .storeAddress(msg.agentWallet)
    .storeStringTail(msg.strategyType)
    .storeUint(msg.riskLevel, 8)
    .storeCoins(msg.maxPositionNano)
    .storeCoins(msg.maxLossNano)
    .storeUint(msg.maxExecutions, 32)
    .storeUint(msg.expiresAt, 64)
    .endCell();
}

function storeStartStrategy(msg: StartStrategy): Cell {
  return beginCell()
    .storeUint(StrategyExecutorOpcodes.StartStrategy, 32)
    .storeUint(msg.strategyId, 64)
    .endCell();
}

function storeStopStrategy(msg: StopStrategy): Cell {
  return beginCell()
    .storeUint(StrategyExecutorOpcodes.StopStrategy, 32)
    .storeUint(msg.strategyId, 64)
    .endCell();
}

function storeExecuteSignal(msg: ExecuteSignal): Cell {
  const b = beginCell()
    .storeUint(StrategyExecutorOpcodes.ExecuteSignal, 32)
    .storeUint(msg.strategyId, 64)
    .storeUint(msg.signalNonce, 64)
    .storeAddress(msg.to)
    .storeCoins(msg.amount);
  if (msg.payload !== null) {
    b.storeBit(true).storeRef(msg.payload);
  } else {
    b.storeBit(false);
  }
  return b.storeInt(msg.expectedPnlNano, 64).endCell();
}

function storeReportOutcome(msg: ReportOutcome): Cell {
  return beginCell()
    .storeUint(StrategyExecutorOpcodes.ReportOutcome, 32)
    .storeUint(msg.strategyId, 64)
    .storeUint(msg.signalNonce, 64)
    .storeInt(msg.actualPnlNano, 64)
    .storeCoins(msg.gasUsedNano)
    .endCell();
}

function storeSetOrchestrator(msg: SetOrchestrator): Cell {
  return beginCell()
    .storeUint(StrategyExecutorOpcodes.SetOrchestrator, 32)
    .storeAddress(msg.orchestrator)
    .endCell();
}

function storeEmergencyHalt(_msg: EmergencyHalt): Cell {
  return beginCell()
    .storeUint(StrategyExecutorOpcodes.EmergencyHalt, 32)
    .endCell();
}

// ---------------------------------------------------------------------------
// Getter decoders
// ---------------------------------------------------------------------------

function loadStrategyRecord(reader: TupleReader): StrategyRecord {
  return {
    strategyId:         reader.readBigNumber(),
    agentWallet:        reader.readAddress(),
    strategyType:       reader.readString(),
    riskLevel:          reader.readNumber(),
    status:             reader.readNumber(),
    maxPositionNano:    reader.readBigNumber(),
    maxLossNano:        reader.readBigNumber(),
    maxExecutions:      reader.readNumber(),
    expiresAt:          reader.readBigNumber(),
    executionCount:     reader.readNumber(),
    cumulativeLossNano: reader.readBigNumber(),
    lastSignalNonce:    reader.readBigNumber(),
    registeredAt:       reader.readBigNumber(),
    startedAt:          reader.readBigNumber(),
    stoppedAt:          reader.readBigNumber(),
  };
}

function loadAuditEntry(reader: TupleReader): AuditEntry {
  return {
    strategyId:      reader.readBigNumber(),
    seqno:           reader.readNumber(),
    signalNonce:     reader.readBigNumber(),
    to:              reader.readAddress(),
    amount:          reader.readBigNumber(),
    expectedPnlNano: reader.readBigNumber(),
    actualPnlNano:   reader.readBigNumber(),
    gasUsedNano:     reader.readBigNumber(),
    executedAt:      reader.readBigNumber(),
  };
}

// ---------------------------------------------------------------------------
// Contract class
// ---------------------------------------------------------------------------

export class StrategyExecutor implements Contract {
  readonly address: Address;
  readonly init?: StateInit;

  private constructor(address: Address, init?: StateInit) {
    this.address = address;
    this.init = init;
  }

  /** Derive contract address from an already-deployed instance. */
  static fromAddress(address: Address): StrategyExecutor {
    return new StrategyExecutor(address);
  }

  /** Derive contract address and StateInit from constructor arguments. */
  static async fromInit(
    owner: Address,
    orchestrator: Address,
  ): Promise<StrategyExecutor> {
    const init = await StrategyExecutor.getInit(owner, orchestrator);
    const address = contractAddress(0, init);
    return new StrategyExecutor(address, init);
  }

  /** Build the StateInit cell. */
  static async getInit(
    owner: Address,
    orchestrator: Address,
  ): Promise<StateInit> {
    const data = beginCell()
      .storeAddress(owner)
      .storeAddress(orchestrator)
      .storeDict(Dictionary.empty())    // strategies
      .storeDict(Dictionary.empty())    // auditLog
      .storeBit(false)                  // isHalted
      .storeUint(0, 64)                 // totalStrategiesRegistered
      .endCell();

    const code = Cell.EMPTY;

    return { code, data };
  }

  // --------------------------------------------------------------------------
  // send* methods
  // --------------------------------------------------------------------------

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendRegisterStrategy(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: RegisterStrategy,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeRegisterStrategy(msg),
    });
  }

  async sendStartStrategy(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: StartStrategy,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeStartStrategy(msg),
    });
  }

  async sendStopStrategy(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: StopStrategy,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeStopStrategy(msg),
    });
  }

  async sendExecuteSignal(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: ExecuteSignal,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeExecuteSignal(msg),
    });
  }

  async sendReportOutcome(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: ReportOutcome,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeReportOutcome(msg),
    });
  }

  async sendSetOrchestrator(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetOrchestrator,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetOrchestrator(msg),
    });
  }

  async sendEmergencyHalt(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: EmergencyHalt,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeEmergencyHalt(msg),
    });
  }

  // --------------------------------------------------------------------------
  // get* methods
  // --------------------------------------------------------------------------

  async getStrategy(
    provider: ContractProvider,
    strategyId: bigint,
  ): Promise<StrategyRecord | null> {
    const tb = new TupleBuilder();
    tb.writeNumber(strategyId);
    const result = await provider.get('strategy', tb.build());
    const cell = result.stack.readCellOpt();
    if (cell === null) return null;
    const reader = new TupleReader(result.stack.readTuple());
    return loadStrategyRecord(reader);
  }

  async getAuditEntry(
    provider: ContractProvider,
    strategyId: bigint,
    seqno: number,
  ): Promise<AuditEntry | null> {
    const tb = new TupleBuilder();
    tb.writeNumber(strategyId);
    tb.writeNumber(seqno);
    const result = await provider.get('auditEntry', tb.build());
    const cell = result.stack.readCellOpt();
    if (cell === null) return null;
    const reader = new TupleReader(result.stack.readTuple());
    return loadAuditEntry(reader);
  }

  async getHalted(provider: ContractProvider): Promise<boolean> {
    const result = await provider.get('halted', []);
    return result.stack.readBoolean();
  }

  async getTotalStrategies(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('totalStrategies', []);
    return result.stack.readBigNumber();
  }

  async getOrchestrator(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('orchestrator', []);
    return result.stack.readAddress();
  }
}
