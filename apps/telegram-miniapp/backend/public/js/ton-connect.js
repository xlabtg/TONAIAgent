/**
 * TON AI Agent - TON Connect Integration
 * Implements TON wallet authentication via TON Connect protocol.
 *
 * Supported wallets: Tonkeeper, OpenMask, MyTonWallet, TON Space
 *
 * Flow:
 *   1. User clicks "Connect Wallet"
 *   2. TON Connect opens wallet selector
 *   3. User selects wallet and approves connection
 *   4. Wallet address returned and stored
 *   5. Platform associates wallet with Telegram user account
 */

(function(window) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  /** TON Connect manifest URL — served from the same origin as the Mini App */
  const MANIFEST_URL = (function() {
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    return base + '/tonconnect-manifest.json';
  })();

  /** Supported wallet list for the custom wallet selector */
  const SUPPORTED_WALLETS = [
    {
      id: 'tonkeeper',
      name: 'Tonkeeper',
      icon: 'https://tonkeeper.com/assets/tonconnect-icon.png',
      universalLink: 'https://app.tonkeeper.com/ton-connect',
      bridgeUrl: 'https://bridge.tonapi.io/bridge',
      jsBridgeKey: 'tonkeeper',
    },
    {
      id: 'openmask',
      name: 'OpenMask',
      icon: 'https://raw.githubusercontent.com/OpenProduct/openmask-extension/main/public/logo.png',
      jsBridgeKey: 'openmask',
    },
    {
      id: 'mytonwallet',
      name: 'MyTonWallet',
      icon: 'https://mytonwallet.io/icon-256.png',
      universalLink: 'https://connect.mytonwallet.org',
      bridgeUrl: 'https://tonconnectbridge.mytonwallet.org/bridge',
      jsBridgeKey: 'mytonwallet',
    },
    {
      id: 'tonspace',
      name: 'TON Space',
      icon: 'https://ton.space/img/logo.png',
      universalLink: 'https://ton.space/ton-connect',
      bridgeUrl: 'https://tonspace.co/tonconnect/bridge',
      jsBridgeKey: 'tonspace',
    },
  ];

  /** Session storage keys */
  const STORAGE_KEYS = {
    WALLET_ADDRESS: 'taa_wallet_address',
    WALLET_NAME: 'taa_wallet_name',
    WALLET_STATE_INIT: 'taa_wallet_state_init',
    CONNECTION_TIMESTAMP: 'taa_wallet_connected_at',
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const state = {
    /** @type {string|null} Connected wallet address in user-friendly format */
    address: null,
    /** @type {string|null} Name of the connected wallet app */
    walletName: null,
    /** @type {boolean} Whether a connection attempt is in progress */
    connecting: false,
    /** @type {Function[]} Listeners called when wallet state changes */
    listeners: [],
  };

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Persist wallet session to sessionStorage so it survives page refreshes
   * within the same Telegram Mini App session.
   */
  function persistSession(address, walletName) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, address || '');
      sessionStorage.setItem(STORAGE_KEYS.WALLET_NAME, walletName || '');
      sessionStorage.setItem(STORAGE_KEYS.CONNECTION_TIMESTAMP, Date.now().toString());
    } catch (e) {
      // sessionStorage unavailable — silent fail
    }
  }

  /**
   * Clear persisted wallet session.
   */
  function clearSession() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
    } catch (e) {
      // silent fail
    }
  }

  /**
   * Restore wallet session from sessionStorage on page load.
   * Returns { address, walletName } or null.
   */
  function restoreSession() {
    try {
      const address = sessionStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
      const walletName = sessionStorage.getItem(STORAGE_KEYS.WALLET_NAME);
      if (address) {
        return { address, walletName };
      }
    } catch (e) {
      // silent fail
    }
    return null;
  }

  /**
   * Notify all registered listeners of a wallet state change.
   */
  function notifyListeners() {
    const snapshot = {
      connected: !!state.address,
      address: state.address,
      walletName: state.walletName,
      connecting: state.connecting,
    };
    state.listeners.forEach(function(fn) {
      try { fn(snapshot); } catch (e) { /* ignore listener errors */ }
    });
  }

  /**
   * Format a raw TON address to a short display form: "EQC…A1B2".
   * @param {string} address - Full wallet address
   * @returns {string} Shortened address
   */
  function formatAddress(address) {
    if (!address || address.length < 10) return address || '';
    return address.slice(0, 6) + '…' + address.slice(-4);
  }

  /**
   * Validate that a string looks like a valid TON address (basic check).
   * TON user-friendly addresses are 48 characters, base64url encoded.
   * @param {string} address
   * @returns {boolean}
   */
  function isValidTonAddress(address) {
    return typeof address === 'string' && /^[A-Za-z0-9_\-+/]{48}$/.test(address);
  }

  // ---------------------------------------------------------------------------
  // TON Connect protocol — lightweight implementation
  //
  // The @tonconnect/sdk NPM package requires a bundler. Instead we implement
  // the core handshake compatible with the TON Connect 2.0 protocol directly,
  // using only the browser JS Bridge API that wallets inject into the page when
  // the Mini App runs inside a wallet browser (e.g., Tonkeeper in-app browser).
  //
  // For wallets opened via universal link (QR / deep link) we generate a
  // connection URL and open it; the wallet redirects back and we read the
  // result from the URL fragment.
  // ---------------------------------------------------------------------------

  /**
   * Attempt to connect via the injected JS Bridge (works inside wallet browsers).
   * Returns the wallet address string or throws if the bridge is unavailable.
   * @param {object} wallet - Wallet descriptor from SUPPORTED_WALLETS
   * @returns {Promise<string>} Wallet address
   */
  async function connectViaJsBridge(wallet) {
    const bridge = window[wallet.jsBridgeKey] || (window.ton && window.ton[wallet.jsBridgeKey]);
    if (!bridge || typeof bridge.send !== 'function') {
      throw new Error('JS bridge not available for ' + wallet.name);
    }

    return new Promise(function(resolve, reject) {
      // Send ton_requestAccounts using the injected bridge
      bridge.send('ton_requestAccounts').then(function(accounts) {
        if (Array.isArray(accounts) && accounts.length > 0) {
          resolve(accounts[0]);
        } else {
          reject(new Error('No accounts returned from ' + wallet.name));
        }
      }).catch(reject);
    });
  }

  /**
   * Build a TON Connect deep link URL for wallets that support universal links.
   * @param {object} wallet - Wallet descriptor with universalLink
   * @returns {string} Deep link URL
   */
  function buildUniversalLink(wallet) {
    const returnUrl = encodeURIComponent(window.location.href);
    return wallet.universalLink
      + '?v=2'
      + '&id=' + encodeURIComponent(wallet.id)
      + '&r=' + returnUrl
      + '&manifest=' + encodeURIComponent(MANIFEST_URL);
  }

  /**
   * Detect if we're running inside a Telegram Mini App context where Telegram
   * itself can relay the wallet connection result.
   */
  function isInsideTelegram() {
    return !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Initialize the TON Connect module.
   * Attempts to restore any existing session from storage.
   */
  function init() {
    const saved = restoreSession();
    if (saved && isValidTonAddress(saved.address)) {
      state.address = saved.address;
      state.walletName = saved.walletName;
      notifyListeners();
    }
  }

  /**
   * Register a callback that is invoked whenever the wallet connection state changes.
   * The callback receives an object: { connected, address, walletName, connecting }
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  function onStateChange(listener) {
    state.listeners.push(listener);
    return function() {
      state.listeners = state.listeners.filter(function(l) { return l !== listener; });
    };
  }

  /**
   * Connect to a TON wallet.
   * Strategy:
   *   1. Try injected JS Bridge (works inside wallet browsers)
   *   2. Fall back to Telegram Mini App wallet connector (if available)
   *   3. Fall back to showing wallet selector with universal links
   *
   * @param {object} [walletDescriptor] - Optional specific wallet to connect to.
   *   If omitted, the user is shown the wallet selector UI first.
   * @returns {Promise<{address: string, walletName: string}>}
   */
  async function connect(walletDescriptor) {
    if (state.connecting) {
      throw new Error('Connection already in progress');
    }
    if (state.address) {
      return { address: state.address, walletName: state.walletName };
    }

    state.connecting = true;
    notifyListeners();

    try {
      let address = null;
      let walletName = walletDescriptor ? walletDescriptor.name : null;

      // Strategy 1: JS Bridge (injected by wallet browser)
      if (walletDescriptor) {
        try {
          address = await connectViaJsBridge(walletDescriptor);
        } catch (bridgeErr) {
          // Bridge not available — will try universal link below
          address = null;
        }
      } else {
        // Try all known bridges
        for (const w of SUPPORTED_WALLETS) {
          try {
            address = await connectViaJsBridge(w);
            if (address) { walletName = w.name; break; }
          } catch (_) {
            // try next
          }
        }
      }

      // Strategy 2: Telegram Mini App native wallet
      if (!address && isInsideTelegram()) {
        const tg = window.Telegram.WebApp;
        if (typeof tg.requestWalletConnection === 'function') {
          // Bot API 7.x+ native wallet connection
          address = await new Promise(function(resolve, reject) {
            tg.requestWalletConnection(function(result) {
              if (result && result.address) {
                walletName = result.walletName || 'Telegram Wallet';
                resolve(result.address);
              } else {
                reject(new Error('Wallet connection declined'));
              }
            });
          });
        }
      }

      if (!address) {
        // Strategy 3: Universal link — show selector and open deep link
        // This is handled by the UI layer (showWalletSelector); we signal
        // that a selector should be shown by rejecting with a known code.
        const err = new Error('SHOW_WALLET_SELECTOR');
        err.code = 'SHOW_WALLET_SELECTOR';
        throw err;
      }

      if (!isValidTonAddress(address)) {
        throw new Error('Invalid wallet address received: ' + address);
      }

      state.address = address;
      state.walletName = walletName;
      persistSession(address, walletName);
      notifyListeners();

      return { address, walletName };
    } finally {
      state.connecting = false;
      notifyListeners();
    }
  }

  /**
   * Connect to a specific wallet via its universal link (opens the wallet app).
   * The address is expected to be returned via the redirect URL or deep link.
   * For demo/MVP purposes this opens the link and polls for injected bridge.
   *
   * @param {object} wallet - Wallet descriptor from SUPPORTED_WALLETS
   */
  function connectViaUniversalLink(wallet) {
    if (!wallet.universalLink) {
      console.warn('[TONConnect] No universal link for', wallet.name);
      return;
    }
    const url = buildUniversalLink(wallet);
    window.open(url, '_blank');
  }

  /**
   * Disconnect the current wallet.
   * Clears state, storage, and notifies listeners.
   * Also notifies the backend API to clear the association.
   *
   * @returns {Promise<void>}
   */
  async function disconnect() {
    const previousAddress = state.address;
    state.address = null;
    state.walletName = null;
    clearSession();
    notifyListeners();

    // Notify backend (fire-and-forget)
    if (previousAddress) {
      try {
        await notifyBackend({ action: 'disconnect', wallet_address: previousAddress });
      } catch (e) {
        console.warn('[TONConnect] Backend disconnect notification failed:', e.message);
      }
    }
  }

  /**
   * Notify the backend API about a wallet event.
   * @param {object} payload
   * @returns {Promise<object>} API response
   */
  async function notifyBackend(payload) {
    let initData = '';
    if (isInsideTelegram()) {
      initData = window.Telegram.WebApp.initData || '';
    }

    const response = await fetch('/api/wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error('Backend error ' + response.status + ': ' + text);
    }
    return response.json();
  }

  /**
   * After a successful wallet connection, persist the address on the backend
   * and associate it with the current Telegram user.
   *
   * @param {string} address - Connected wallet address
   * @param {string} [walletName] - Name of wallet app
   * @returns {Promise<object>} Backend response
   */
  async function saveWalletToBackend(address, walletName) {
    return notifyBackend({
      action: 'connect',
      wallet_address: address,
      wallet_name: walletName || 'unknown',
    });
  }

  /**
   * Get the current wallet connection state.
   * @returns {{ connected: boolean, address: string|null, walletName: string|null, shortAddress: string|null }}
   */
  function getState() {
    return {
      connected: !!state.address,
      address: state.address,
      walletName: state.walletName,
      shortAddress: state.address ? formatAddress(state.address) : null,
      connecting: state.connecting,
    };
  }

  /**
   * Get the list of supported wallets.
   * @returns {object[]}
   */
  function getSupportedWallets() {
    return SUPPORTED_WALLETS.slice();
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  window.TONConnect = {
    init: init,
    onStateChange: onStateChange,
    connect: connect,
    connectViaUniversalLink: connectViaUniversalLink,
    disconnect: disconnect,
    saveWalletToBackend: saveWalletToBackend,
    getState: getState,
    getSupportedWallets: getSupportedWallets,
    formatAddress: formatAddress,
  };

})(window);
