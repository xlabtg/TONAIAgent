/**
 * TON AI Agent – Wallet Connection UI Component
 *
 * Implements Issue #267 Step 2 — Frontend Integration (Telegram Mini App):
 * - Connect Wallet button with TON Connect
 * - Wallet status (connected / disconnected)
 * - Address display (shortened)
 * - Network indicator
 * - Transaction status display (pending / confirmed / failed)
 * - TX hash link to TON explorer
 */
(function () {
  'use strict';

  const { el, esc, TG } = window.App;

  // ============================================================================
  // Configuration
  // ============================================================================

  const EXPLORER_BASE = 'https://tonviewer.com';

  // ============================================================================
  // Wallet Component State
  // ============================================================================

  const WalletState = {
    connected: false,
    address: null,
    walletName: null,
    shortAddress: null,
    connecting: false,
    /** @type {'mainnet' | 'testnet'} */
    network: 'mainnet',
    /** @type {Array<{txHash: string, status: string, dex: string, timestamp: string}>} */
    recentTxs: [],
  };

  // ============================================================================
  // Wallet Component
  // ============================================================================

  const Wallet = {
    /** Initialize wallet UI and restore session */
    init() {
      // Wire up connect/disconnect buttons
      el('wallet-connect-btn')?.addEventListener('click', () => this.handleConnect());
      el('wallet-disconnect-btn')?.addEventListener('click', () => this.handleDisconnect());

      // Listen for TON Connect state changes
      if (window.TONConnect) {
        window.TONConnect.onStateChange((state) => {
          WalletState.connected = state.connected;
          WalletState.address = state.address;
          WalletState.walletName = state.walletName;
          WalletState.shortAddress = state.address
            ? this.formatAddress(state.address) : null;
          WalletState.connecting = state.connecting;
          this.render();
        });

        // Restore session on load
        const saved = window.TONConnect.getState();
        if (saved.connected) {
          WalletState.connected = true;
          WalletState.address = saved.address;
          WalletState.walletName = saved.walletName;
          WalletState.shortAddress = saved.shortAddress;
        }
      }

      this.render();
    },

    /** Format a TON address to shortened form */
    formatAddress(address) {
      if (!address || address.length < 10) return address || '';
      return address.slice(0, 6) + '\u2026' + address.slice(-4);
    },

    /** Build explorer URL for a transaction hash */
    txExplorerUrl(txHash) {
      return EXPLORER_BASE + '/transaction/' + encodeURIComponent(txHash);
    },

    /** Handle connect button click */
    async handleConnect() {
      if (WalletState.connecting || WalletState.connected) return;
      TG.haptic.impact('light');

      try {
        if (window.TONConnect) {
          await window.TONConnect.connect();
        } else {
          TG.alert('TON Connect is not available. Please open the app inside a TON wallet.');
        }
      } catch (err) {
        if (err.code === 'SHOW_WALLET_SELECTOR') {
          this.showWalletSelector();
        } else {
          console.warn('[Wallet] Connect error:', err.message);
        }
      }
    },

    /** Handle disconnect button click */
    async handleDisconnect() {
      TG.confirm('Disconnect your wallet?', async (confirmed) => {
        if (!confirmed) return;
        TG.haptic.impact('medium');
        if (window.TONConnect) {
          await window.TONConnect.disconnect();
        }
        WalletState.connected = false;
        WalletState.address = null;
        WalletState.walletName = null;
        WalletState.shortAddress = null;
        WalletState.recentTxs = [];
        this.render();
      });
    },

    /** Show wallet selector with supported wallets */
    showWalletSelector() {
      if (!window.TONConnect) return;
      const wallets = window.TONConnect.getSupportedWallets();
      const container = el('wallet-selector-list');
      if (!container) return;

      container.innerHTML = wallets.map(function (w) {
        return '<div class="wallet-option" data-wallet-id="' + esc(w.id) + '">' +
          '<img src="' + esc(w.icon) + '" alt="' + esc(w.name) + '" class="wallet-option-icon" />' +
          '<span class="wallet-option-name">' + esc(w.name) + '</span>' +
          '</div>';
      }).join('');

      container.querySelectorAll('.wallet-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          var id = opt.dataset.walletId;
          var wallet = wallets.find(function (w) { return w.id === id; });
          if (wallet && window.TONConnect) {
            window.TONConnect.connectViaUniversalLink(wallet);
          }
          el('wallet-selector').classList.add('hidden');
        });
      });

      el('wallet-selector').classList.remove('hidden');
    },

    /**
     * Add a transaction to the recent transactions list.
     * Called by the execution component after a live trade.
     */
    addTransaction(tx) {
      WalletState.recentTxs.unshift(tx);
      // Keep only the last 10 transactions
      if (WalletState.recentTxs.length > 10) {
        WalletState.recentTxs = WalletState.recentTxs.slice(0, 10);
      }
      this.renderTransactions();
    },

    /** Get current wallet state for other components */
    getState() {
      return {
        connected: WalletState.connected,
        address: WalletState.address,
        walletName: WalletState.walletName,
        network: WalletState.network,
      };
    },

    /** Check if wallet is connected (for execution engine mode switching) */
    isConnected() {
      return WalletState.connected && !!WalletState.address;
    },

    // ============================================================================
    // Render
    // ============================================================================

    /** Render the wallet connection status bar */
    render() {
      var connectBtn = el('wallet-connect-btn');
      var disconnectBtn = el('wallet-disconnect-btn');
      var statusEl = el('wallet-status');
      var addressEl = el('wallet-address');
      var networkEl = el('wallet-network');

      if (!statusEl) return;

      if (WalletState.connecting) {
        statusEl.textContent = 'Connecting...';
        statusEl.className = 'wallet-status wallet-connecting';
        if (connectBtn) connectBtn.disabled = true;
        return;
      }

      if (connectBtn) connectBtn.disabled = false;

      if (WalletState.connected) {
        statusEl.textContent = 'Connected';
        statusEl.className = 'wallet-status wallet-connected';

        if (addressEl) {
          addressEl.textContent = WalletState.shortAddress || '';
          addressEl.title = WalletState.address || '';
        }

        if (networkEl) {
          networkEl.textContent = WalletState.network === 'mainnet' ? 'Mainnet' : 'Testnet';
          networkEl.className = 'wallet-network wallet-network-' + WalletState.network;
        }

        if (connectBtn) connectBtn.classList.add('hidden');
        if (disconnectBtn) disconnectBtn.classList.remove('hidden');
      } else {
        statusEl.textContent = 'Not Connected';
        statusEl.className = 'wallet-status wallet-disconnected';

        if (addressEl) addressEl.textContent = '';
        if (networkEl) networkEl.textContent = '';

        if (connectBtn) connectBtn.classList.remove('hidden');
        if (disconnectBtn) disconnectBtn.classList.add('hidden');
      }

      this.renderTransactions();
    },

    /** Render recent transaction list */
    renderTransactions() {
      var container = el('wallet-recent-txs');
      if (!container) return;

      if (WalletState.recentTxs.length === 0) {
        container.classList.add('hidden');
        return;
      }

      container.classList.remove('hidden');
      var list = container.querySelector('.tx-list');
      if (!list) return;

      list.innerHTML = WalletState.recentTxs.map(function (tx) {
        var statusClass = 'tx-' + (tx.status || 'pending');
        var statusIcon = tx.status === 'confirmed' ? '\u2705'
          : tx.status === 'failed' ? '\u274C' : '\u23F3';
        var hashDisplay = tx.txHash
          ? tx.txHash.slice(0, 8) + '\u2026' + tx.txHash.slice(-6)
          : 'pending';
        var explorerLink = tx.txHash
          ? '<a href="' + esc(EXPLORER_BASE + '/transaction/' + tx.txHash) +
            '" target="_blank" rel="noopener" class="tx-link">' + esc(hashDisplay) + '</a>'
          : '<span class="tx-pending">' + esc(hashDisplay) + '</span>';

        return '<div class="tx-row ' + statusClass + '">' +
          '<span class="tx-status-icon">' + statusIcon + '</span>' +
          '<span class="tx-dex">' + esc((tx.dex || '').toUpperCase()) + '</span>' +
          explorerLink +
          '<span class="tx-gas">' + (tx.gasFee ? esc(tx.gasFee) + ' TON' : '') + '</span>' +
          '</div>';
      }).join('');
    },
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { Wallet.init(); });
  } else {
    Wallet.init();
  }

  window.Wallet = Wallet;
})();
