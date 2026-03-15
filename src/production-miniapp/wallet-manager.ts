/**
 * TON Connect wallet manager.
 *
 * Handles connection to Tonkeeper, OpenMask, MyTonWallet, and TON Space
 * via the TON Connect JS bridge / universal link protocol.  Supports demo
 * mode (no real wallet required) and live mode (real on-chain funds).
 */

import {
  WalletState,
  WalletProvider,
  WalletConnectionStatus,
  AppMode,
  ProductionMiniAppError,
  MiniAppEvent,
  MiniAppEventCallback,
} from './types';

// ============================================================================
// Wallet provider metadata
// ============================================================================

export interface WalletProviderInfo {
  id: WalletProvider;
  name: string;
  iconUrl: string;
  /** Universal link base for deep-link connection */
  universalLink: string;
  /** JS bridge key available on window */
  jsBridgeKey?: string;
}

export const WALLET_PROVIDERS: Record<WalletProvider, WalletProviderInfo> = {
  tonkeeper: {
    id: 'tonkeeper',
    name: 'Tonkeeper',
    iconUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png',
    universalLink: 'https://app.tonkeeper.com/ton-connect',
    jsBridgeKey: 'tonkeeper',
  },
  openmask: {
    id: 'openmask',
    name: 'OpenMask',
    iconUrl: 'https://openmask.app/img/openmask.svg',
    universalLink: 'https://openmask.app/ton-connect',
    jsBridgeKey: 'openmask',
  },
  mytonwallet: {
    id: 'mytonwallet',
    name: 'MyTonWallet',
    iconUrl: 'https://mytonwallet.io/icon-256.png',
    universalLink: 'https://mytonwallet.io/ton-connect',
    jsBridgeKey: 'mytonwallet',
  },
  tonspace: {
    id: 'tonspace',
    name: 'TON Space',
    iconUrl: 'https://ton.space/favicon.ico',
    universalLink: 'https://ton.space/ton-connect',
    jsBridgeKey: 'tonspace',
  },
};

// ============================================================================
// WalletManager
// ============================================================================

export interface WalletManagerConfig {
  mode: AppMode;
  supportedWallets?: WalletProvider[];
}

export class WalletManager {
  private state: WalletState = { status: 'disconnected' };
  private readonly config: WalletManagerConfig;
  private readonly eventCallbacks: MiniAppEventCallback[] = [];

  constructor(config: WalletManagerConfig) {
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------

  getState(): WalletState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.status === 'connected';
  }

  // --------------------------------------------------------------------------
  // Connection
  // --------------------------------------------------------------------------

  /**
   * Initiate connection to the given wallet provider.
   *
   * In demo mode this immediately resolves with a simulated wallet address.
   * In live mode this triggers the real TON Connect bridge handshake.
   */
  async connect(provider: WalletProvider): Promise<WalletState> {
    this.setState({ status: 'connecting', provider });

    try {
      if (this.config.mode === 'demo') {
        return this.connectDemo(provider);
      }
      return await this.connectLive(provider);
    } catch (err) {
      const error = (err as Error).message;
      this.setState({ status: 'error', provider, error });
      throw new ProductionMiniAppError(
        `Wallet connection failed: ${error}`,
        'WALLET_CONNECT_FAILED',
        { provider }
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.setState({ status: 'disconnected' });
      this.emit({ type: 'wallet_disconnected', payload: undefined, timestamp: now() });
    } catch (err) {
      throw new ProductionMiniAppError(
        `Wallet disconnect failed: ${(err as Error).message}`,
        'WALLET_DISCONNECT_FAILED'
      );
    }
  }

  // --------------------------------------------------------------------------
  // Demo connection
  // --------------------------------------------------------------------------

  private connectDemo(provider: WalletProvider): WalletState {
    const address = 'EQDemo000000000000000000000000000000000000000000';
    const newState: WalletState = {
      status: 'connected',
      provider,
      address,
      displayAddress: formatAddress(address),
      balanceNano: '10500000000', // 10.5 TON
      balanceTon: 10.5,
      balanceUsdt: 52.4,
      lastRefreshedAt: now(),
    };
    this.setState(newState);
    this.emit({ type: 'wallet_connected', payload: { provider, mode: 'demo' }, timestamp: now() });
    return { ...newState };
  }

  // --------------------------------------------------------------------------
  // Live connection (TON Connect bridge)
  // --------------------------------------------------------------------------

  private async connectLive(provider: WalletProvider): Promise<WalletState> {
    const info = WALLET_PROVIDERS[provider];

    // Prefer JS bridge when available in the current browser / WebView
    const bridge = getBridge(info.jsBridgeKey);
    if (bridge) {
      return this.connectViaBridge(provider, bridge);
    }

    // Fall back to universal link (opens wallet app)
    return this.connectViaUniversalLink(provider, info.universalLink);
  }

  private async connectViaBridge(
    provider: WalletProvider,
    bridge: TONConnectBridge
  ): Promise<WalletState> {
    const result = await bridge.connect({ items: [{ name: 'ton_addr' }] });

    if (!result?.item?.address) {
      throw new Error('No address returned from bridge');
    }

    const address: string = result.item.address;
    const newState: WalletState = {
      status: 'connected',
      provider,
      address,
      displayAddress: formatAddress(address),
      lastRefreshedAt: now(),
    };
    this.setState(newState);
    this.emit({ type: 'wallet_connected', payload: { provider, mode: 'live' }, timestamp: now() });
    return { ...newState };
  }

  private async connectViaUniversalLink(
    provider: WalletProvider,
    universalLink: string
  ): Promise<WalletState> {
    // In a real Telegram Mini App this would open the wallet via Telegram.WebApp.openLink
    // We record a pending state — the wallet app must approve and return
    const pending: WalletState = {
      status: 'connecting',
      provider,
      error: `Universal link opened: ${universalLink} — awaiting wallet approval`,
    };
    this.setState(pending);
    return { ...pending };
  }

  // --------------------------------------------------------------------------
  // Provider info
  // --------------------------------------------------------------------------

  getAvailableProviders(): WalletProviderInfo[] {
    const supported = this.config.supportedWallets ?? Object.keys(WALLET_PROVIDERS) as WalletProvider[];
    return supported.map((id) => WALLET_PROVIDERS[id]);
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: MiniAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private setState(partial: Partial<WalletState>): void {
    this.state = { ...this.state, ...partial };
  }

  private emit(event: MiniAppEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

/** Format a TON address as first-6 … last-4 */
export function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

/** Attempt to retrieve a TON Connect JS bridge from window */
function getBridge(key?: string): TONConnectBridge | undefined {
  if (!key || typeof window === 'undefined') return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)[key] as TONConnectBridge | undefined;
}

// Minimal TON Connect bridge interface
interface TONConnectBridge {
  connect(request: {
    items: Array<{ name: string }>;
  }): Promise<{ item?: { address?: string } }>;
}

// ============================================================================
// Factory
// ============================================================================

export function createWalletManager(config: WalletManagerConfig): WalletManager {
  return new WalletManager(config);
}
