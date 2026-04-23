/**
 * AgentFactory — TypeScript wrapper
 *
 * Hand-written in Blueprint style from contracts/agent-factory.tact.
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
 * CRC-32 opcodes for every message type accepted by AgentFactory.
 */
export const AgentFactoryOpcodes = {
  DeployAgent:               0x7c9a3b4d as const,
  SetAcceptingDeployments:   0x3e8f2c17 as const,
  SetDeploymentFee:          0xa1b4e9c0 as const,
  SetProtocolFeeBps:         0x5f2d8e14 as const,
  SetMaxAgentsPerUser:       0xd3c7a591 as const,
  SetTreasury:               0x6b9f4e20 as const,
  ProposeUpgrade:            0x2c4a7f83 as const,
  ApproveUpgrade:            0x9e6b1d37 as const,
} as const;

// ---------------------------------------------------------------------------
// Struct types
// ---------------------------------------------------------------------------

export interface AgentRecord {
  contractAddress: Address;
  ownerAddress: Address;
  deployedAt: bigint;
  version: number;
}

export interface UpgradeProposal {
  proposalId: bigint;
  newCodeHash: bigint;
  upgradeType: number;
  approvalsRequired: number;
  approvalCount: number;
  executed: boolean;
  createdAt: bigint;
  migrationNotes: string;
}

export interface FactoryConfig {
  deploymentFee: bigint;
  protocolFeeBps: number;
  maxAgentsPerUser: number;
  acceptingDeployments: boolean;
}

export interface FactoryStats {
  totalAgentsDeployed: bigint;
  totalFeesCollected: bigint;
  version: number;
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export interface DeployAgent {
  $$type: 'DeployAgent';
  ownerAddress: Address;
  agentAddress: Address;
  safeAddress: Address;
  maxTradeSizeNano: bigint;
  dailyLimitNano: bigint;
  timeLockSeconds: number;
  referrer: Address | null;
}

export interface SetAcceptingDeployments {
  $$type: 'SetAcceptingDeployments';
  accepting: boolean;
}

export interface SetDeploymentFee {
  $$type: 'SetDeploymentFee';
  fee: bigint;
}

export interface SetProtocolFeeBps {
  $$type: 'SetProtocolFeeBps';
  bps: number;
}

export interface SetMaxAgentsPerUser {
  $$type: 'SetMaxAgentsPerUser';
  max: number;
}

export interface SetTreasury {
  $$type: 'SetTreasury';
  treasury: Address;
}

export interface ProposeUpgrade {
  $$type: 'ProposeUpgrade';
  newCodeHash: bigint;
  upgradeType: number;
  approvalsRequired: number;
  migrationNotes: string;
}

export interface ApproveUpgrade {
  $$type: 'ApproveUpgrade';
  proposalId: bigint;
}

// ---------------------------------------------------------------------------
// Init data type
// ---------------------------------------------------------------------------

export interface AgentFactoryInit {
  owner: Address;
  treasury: Address;
  deploymentFee: bigint;
  protocolFeeBps: number;
  maxAgentsPerUser: number;
}

// ---------------------------------------------------------------------------
// Cell serialisers
// ---------------------------------------------------------------------------

function storeDeployAgent(msg: DeployAgent): Cell {
  const b = beginCell()
    .storeUint(AgentFactoryOpcodes.DeployAgent, 32)
    .storeAddress(msg.ownerAddress)
    .storeAddress(msg.agentAddress)
    .storeAddress(msg.safeAddress)
    .storeCoins(msg.maxTradeSizeNano)
    .storeCoins(msg.dailyLimitNano)
    .storeUint(msg.timeLockSeconds, 32);
  if (msg.referrer !== null) {
    b.storeBit(true).storeAddress(msg.referrer);
  } else {
    b.storeBit(false);
  }
  return b.endCell();
}

function storeSetAcceptingDeployments(msg: SetAcceptingDeployments): Cell {
  return beginCell()
    .storeUint(AgentFactoryOpcodes.SetAcceptingDeployments, 32)
    .storeBit(msg.accepting)
    .endCell();
}

function storeSetDeploymentFee(msg: SetDeploymentFee): Cell {
  return beginCell()
    .storeUint(AgentFactoryOpcodes.SetDeploymentFee, 32)
    .storeCoins(msg.fee)
    .endCell();
}

function storeSetProtocolFeeBps(msg: SetProtocolFeeBps): Cell {
  return beginCell()
    .storeUint(AgentFactoryOpcodes.SetProtocolFeeBps, 32)
    .storeUint(msg.bps, 16)
    .endCell();
}

function storeSetMaxAgentsPerUser(msg: SetMaxAgentsPerUser): Cell {
  return beginCell()
    .storeUint(AgentFactoryOpcodes.SetMaxAgentsPerUser, 32)
    .storeUint(msg.max, 8)
    .endCell();
}

function storeSetTreasury(msg: SetTreasury): Cell {
  return beginCell()
    .storeUint(AgentFactoryOpcodes.SetTreasury, 32)
    .storeAddress(msg.treasury)
    .endCell();
}

function storeProposeUpgrade(msg: ProposeUpgrade): Cell {
  return beginCell()
    .storeUint(AgentFactoryOpcodes.ProposeUpgrade, 32)
    .storeUint(msg.newCodeHash, 256)
    .storeUint(msg.upgradeType, 8)
    .storeUint(msg.approvalsRequired, 8)
    .storeStringTail(msg.migrationNotes)
    .endCell();
}

function storeApproveUpgrade(msg: ApproveUpgrade): Cell {
  return beginCell()
    .storeUint(AgentFactoryOpcodes.ApproveUpgrade, 32)
    .storeUint(msg.proposalId, 64)
    .endCell();
}

// ---------------------------------------------------------------------------
// Getter decoders
// ---------------------------------------------------------------------------

function loadFactoryStats(reader: TupleReader): FactoryStats {
  return {
    totalAgentsDeployed: reader.readBigNumber(),
    totalFeesCollected:  reader.readBigNumber(),
    version:             reader.readNumber(),
  };
}

function loadFactoryConfig(reader: TupleReader): FactoryConfig {
  return {
    deploymentFee:        reader.readBigNumber(),
    protocolFeeBps:       reader.readNumber(),
    maxAgentsPerUser:     reader.readNumber(),
    acceptingDeployments: reader.readBoolean(),
  };
}

function loadUpgradeProposal(reader: TupleReader): UpgradeProposal {
  return {
    proposalId:        reader.readBigNumber(),
    newCodeHash:       reader.readBigNumber(),
    upgradeType:       reader.readNumber(),
    approvalsRequired: reader.readNumber(),
    approvalCount:     reader.readNumber(),
    executed:          reader.readBoolean(),
    createdAt:         reader.readBigNumber(),
    migrationNotes:    reader.readString(),
  };
}

// ---------------------------------------------------------------------------
// Contract class
// ---------------------------------------------------------------------------

export class AgentFactory implements Contract {
  readonly address: Address;
  readonly init?: StateInit;

  private constructor(address: Address, init?: StateInit) {
    this.address = address;
    this.init = init;
  }

  /** Derive contract address from an already-deployed instance. */
  static fromAddress(address: Address): AgentFactory {
    return new AgentFactory(address);
  }

  /** Derive contract address and StateInit from constructor arguments. */
  static async fromInit(
    owner: Address,
    treasury: Address,
    deploymentFee: bigint,
    protocolFeeBps: number,
    maxAgentsPerUser: number,
  ): Promise<AgentFactory> {
    const init = await AgentFactory.getInit(
      owner, treasury, deploymentFee, protocolFeeBps, maxAgentsPerUser,
    );
    const address = contractAddress(0, init);
    return new AgentFactory(address, init);
  }

  /** Build the StateInit cell. */
  static async getInit(
    owner: Address,
    treasury: Address,
    deploymentFee: bigint,
    protocolFeeBps: number,
    maxAgentsPerUser: number,
  ): Promise<StateInit> {
    const data = beginCell()
      .storeAddress(owner)
      .storeAddress(treasury)
      .storeUint(100, 16)               // version = 1.0.0
      .storeCoins(deploymentFee)
      .storeUint(protocolFeeBps, 16)
      .storeUint(maxAgentsPerUser, 8)
      .storeBit(true)                   // acceptingDeployments
      .storeDict(Dictionary.empty())    // agentRegistry
      .storeDict(Dictionary.empty())    // userAgentCount
      .storeDict(Dictionary.empty())    // upgradeProposals
      .storeUint(0, 64)                 // upgradeNonce
      .storeUint(0, 64)                 // totalAgentsDeployed
      .storeCoins(0n)                   // totalFeesCollected
      .storeBit(false)                  // isPaused
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

  async sendDeployAgent(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: DeployAgent,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeDeployAgent(msg),
    });
  }

  async sendSetAcceptingDeployments(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetAcceptingDeployments,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetAcceptingDeployments(msg),
    });
  }

  async sendSetDeploymentFee(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetDeploymentFee,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetDeploymentFee(msg),
    });
  }

  async sendSetProtocolFeeBps(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetProtocolFeeBps,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetProtocolFeeBps(msg),
    });
  }

  async sendSetMaxAgentsPerUser(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetMaxAgentsPerUser,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetMaxAgentsPerUser(msg),
    });
  }

  async sendSetTreasury(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: SetTreasury,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeSetTreasury(msg),
    });
  }

  async sendProposeUpgrade(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: ProposeUpgrade,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeProposeUpgrade(msg),
    });
  }

  async sendApproveUpgrade(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    msg: ApproveUpgrade,
  ): Promise<void> {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: storeApproveUpgrade(msg),
    });
  }

  // --------------------------------------------------------------------------
  // get* methods
  // --------------------------------------------------------------------------

  async getStats(provider: ContractProvider): Promise<FactoryStats> {
    const result = await provider.get('stats', []);
    return loadFactoryStats(result.stack);
  }

  async getConfig(provider: ContractProvider): Promise<FactoryConfig> {
    const result = await provider.get('config', []);
    return loadFactoryConfig(result.stack);
  }

  async getUserAgentCount(provider: ContractProvider, ownerAddress: Address): Promise<bigint> {
    const tb = new TupleBuilder();
    tb.writeAddress(ownerAddress);
    const result = await provider.get('userAgentCount', tb.build());
    return result.stack.readBigNumber();
  }

  async getUpgradeProposal(
    provider: ContractProvider,
    proposalId: bigint,
  ): Promise<UpgradeProposal | null> {
    const tb = new TupleBuilder();
    tb.writeNumber(proposalId);
    const result = await provider.get('upgradeProposal', tb.build());
    const cell = result.stack.readCellOpt();
    if (cell === null) return null;
    const reader = new TupleReader(result.stack.readTuple());
    return loadUpgradeProposal(reader);
  }
}
