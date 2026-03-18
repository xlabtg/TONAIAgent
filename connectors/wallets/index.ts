/** @mvp MVP connector — TON wallet adapters (TON Connect, MPC, smart contract wallet) */
// Wallet Connectors — TON Connect and wallet adapter integrations
// Wallet adapter implementations are in src/security/ and src/ton-factory/

// TON Connect Adapter (Issue #267 — Real Wallet Integration & On-Chain Execution)
export {
  DefaultTonConnectAdapter,
  createTonConnectAdapter,
  DEFAULT_TON_CONNECT_CONFIG,
} from './ton-connect-adapter';

export type {
  TonConnectAdapter,
  TonConnectAdapterConfig,
  WalletSession,
  OnChainTransaction,
  TxResult,
  TxStatus,
  TxStatusInfo,
} from './ton-connect-adapter';
