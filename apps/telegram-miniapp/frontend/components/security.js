/**
 * TON AI Agent – Security Component
 *
 * Manages:
 *  - Simulation mode banner (prominent indicator on agent dashboard)
 *  - Live trading confirmation modal with mandatory acknowledgment checklist
 *  - Safe defaults: simulation is always the default; live trading requires
 *    explicit multi-step opt-in
 *
 * Server-side enforcement (Issue #361):
 *  - Mode transitions call the backend API; localStorage is a read-cache only.
 *  - The UI reads the server-side tradingMode on init and after every transition.
 *  - A malicious or modified client cannot bypass the server gate.
 *
 * @see Issue #314 - User-Facing Security Documentation and Safe Defaults
 * @see Issue #361 - Enforce Simulation / Live Mode Server-Side
 */
(function () {
  'use strict';

  const { el, TG } = window.App;

  // ============================================================================
  // Constants
  // ============================================================================

  /** localStorage cache key — reflects last known server state, not authoritative. */
  const STORAGE_KEY_LIVE = 'tonai_live_trading_enabled';
  /** localStorage cache key for the agent ID this session is managing. */
  const STORAGE_KEY_AGENT_ID = 'tonai_current_agent_id';

  // ============================================================================
  // Server API helpers
  // ============================================================================

  /**
   * Read the authoritative trading mode from the server for the given agent.
   * Falls back to localStorage cache on network error so the UI is never blank.
   */
  async function fetchServerMode(agentId) {
    try {
      const resp = await fetch(`/agents/${encodeURIComponent(agentId)}`);
      if (!resp.ok) return null;
      const json = await resp.json();
      const mode = json?.data?.tradingMode ?? null;
      if (mode === 'live' || mode === 'simulation') {
        // Update cache
        localStorage.setItem(STORAGE_KEY_LIVE, mode === 'live' ? 'true' : 'false');
      }
      return mode;
    } catch {
      return null;
    }
  }

  /**
   * Ask the server to enable live trading for the given agent.
   * The three acknowledgement flags are sent as a JSON body so the server
   * can validate them independently of the client UI state.
   */
  async function requestEnableLive(agentId, payload) {
    const resp = await fetch(`/agents/${encodeURIComponent(agentId)}/enable-live-trading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json?.error ?? `Server error ${resp.status}`);
    }
    return json;
  }

  /**
   * Ask the server to switch the agent back to simulation mode.
   * No body required — this transition is always allowed.
   */
  async function requestDisableLive(agentId) {
    const resp = await fetch(`/agents/${encodeURIComponent(agentId)}/disable-live-trading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await resp.json();
    if (!resp.ok) {
      throw new Error(json?.error ?? `Server error ${resp.status}`);
    }
    return json;
  }

  // ============================================================================
  // Simulation Mode Banner
  // ============================================================================

  const SimulationBanner = {
    /**
     * Returns true when the last known server state is live.
     * This is a cache — always refresh from server on startup.
     */
    isLiveMode() {
      return localStorage.getItem(STORAGE_KEY_LIVE) === 'true';
    },

    /** Update the banner to reflect the current trading mode. */
    update() {
      const banner = el('simulation-mode-banner');
      const switchBtn = el('switch-to-live-btn');
      if (!banner) return;

      if (this.isLiveMode()) {
        banner.className = 'simulation-banner live-mode-banner';
        banner.querySelector('.simulation-banner-text').textContent =
          'LIVE TRADING — Real funds in use';
        if (switchBtn) {
          switchBtn.textContent = 'Back to Simulation';
          switchBtn.className = 'simulation-switch-btn switch-to-sim-btn';
        }
      } else {
        banner.className = 'simulation-banner';
        banner.querySelector('.simulation-banner-text').textContent =
          'SIMULATION MODE — No real funds at risk';
        if (switchBtn) {
          switchBtn.textContent = 'Switch to Live';
          switchBtn.className = 'simulation-switch-btn';
        }
      }
    },

    /** Refresh the banner from the authoritative server state. */
    async syncFromServer() {
      const agentId = localStorage.getItem(STORAGE_KEY_AGENT_ID);
      if (!agentId) return;
      const mode = await fetchServerMode(agentId);
      if (mode !== null) {
        localStorage.setItem(STORAGE_KEY_LIVE, mode === 'live' ? 'true' : 'false');
        this.update();
      }
    },
  };

  // ============================================================================
  // Live Trading Confirmation Modal
  // ============================================================================

  const LiveTradingModal = {
    open() {
      const modal = el('live-trading-modal');
      if (!modal) return;

      // Reset checklist state
      ['live-check-1', 'live-check-2', 'live-check-3'].forEach((id) => {
        const checkbox = el(id);
        if (checkbox) checkbox.checked = false;
      });
      this._updateConfirmButton();

      modal.classList.remove('hidden');
      TG.haptic.impact('medium');
    },

    close() {
      const modal = el('live-trading-modal');
      if (modal) modal.classList.add('hidden');
    },

    _updateConfirmButton() {
      const allChecked = ['live-check-1', 'live-check-2', 'live-check-3'].every((id) => {
        const cb = el(id);
        return cb && cb.checked;
      });
      const confirmBtn = el('confirm-live-trading-btn');
      if (confirmBtn) confirmBtn.disabled = !allChecked;
    },

    async _enableLiveTrading() {
      const agentId = localStorage.getItem(STORAGE_KEY_AGENT_ID);
      if (!agentId) {
        TG.showAlert('No agent selected. Please reload the page.');
        return;
      }

      const confirmBtn = el('confirm-live-trading-btn');
      if (confirmBtn) confirmBtn.disabled = true;

      try {
        // Send all three acknowledgements to the server for validation.
        // The server enforces KYC tier and checklist requirements independently.
        await requestEnableLive(agentId, {
          acknowledgeRealFunds: true,
          acknowledgeMainnetChecklist: true,
          acknowledgeRiskAccepted: true,
        });

        // Server accepted — update local cache and UI
        localStorage.setItem(STORAGE_KEY_LIVE, 'true');
        this.close();
        SimulationBanner.update();
        TG.haptic.notify('success');
        window.dispatchEvent(new CustomEvent('tonai:live_trading_enabled'));
      } catch (err) {
        // Restore button and surface the server's rejection reason
        if (confirmBtn) confirmBtn.disabled = false;
        TG.showAlert(`Could not enable live trading: ${err.message}`);
      }
    },

    async _switchBackToSimulation() {
      const agentId = localStorage.getItem(STORAGE_KEY_AGENT_ID);
      if (!agentId) {
        TG.showAlert('No agent selected. Please reload the page.');
        return;
      }

      TG.confirm(
        'Switch back to Simulation Mode?\nYour agents will stop executing real trades.',
        async (ok) => {
          if (!ok) return;
          try {
            await requestDisableLive(agentId);
            localStorage.setItem(STORAGE_KEY_LIVE, 'false');
            SimulationBanner.update();
            TG.haptic.notify('success');
            window.dispatchEvent(new CustomEvent('tonai:simulation_mode_enabled'));
          } catch (err) {
            TG.showAlert(`Could not switch to simulation: ${err.message}`);
          }
        }
      );
    },
  };

  // ============================================================================
  // Wire Up Events
  // ============================================================================

  function setup() {
    // Switch to Live button in the banner
    const switchBtn = el('switch-to-live-btn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        if (SimulationBanner.isLiveMode()) {
          LiveTradingModal._switchBackToSimulation();
        } else {
          LiveTradingModal.open();
        }
      });
    }

    // Close modal on overlay click or cancel
    el('live-trading-modal-overlay')?.addEventListener('click', () => LiveTradingModal.close());
    el('cancel-live-trading-btn')?.addEventListener('click', () => LiveTradingModal.close());

    // Enable confirm button only when all checkboxes are ticked
    ['live-check-1', 'live-check-2', 'live-check-3'].forEach((id) => {
      el(id)?.addEventListener('change', () => LiveTradingModal._updateConfirmButton());
    });

    // Confirm live trading — calls server, not just localStorage
    el('confirm-live-trading-btn')?.addEventListener('click', () => {
      LiveTradingModal._enableLiveTrading();
    });

    // Apply initial banner state from cache, then refresh from server
    SimulationBanner.update();
    SimulationBanner.syncFromServer();
  }

  // ============================================================================
  // Export
  // ============================================================================

  window.Security = { SimulationBanner, LiveTradingModal };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
