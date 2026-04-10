/**
 * TON AI Agent – Security Component
 *
 * Manages:
 *  - Simulation mode banner (prominent indicator on agent dashboard)
 *  - Live trading confirmation modal with mandatory acknowledgment checklist
 *  - Safe defaults: simulation is always the default; live trading requires
 *    explicit multi-step opt-in
 *
 * @see Issue #314 - User-Facing Security Documentation and Safe Defaults
 */
(function () {
  'use strict';

  const { el, TG } = window.App;

  // ============================================================================
  // Constants
  // ============================================================================

  const STORAGE_KEY_LIVE = 'tonai_live_trading_enabled';

  // ============================================================================
  // Simulation Mode Banner
  // ============================================================================

  const SimulationBanner = {
    /**
     * Returns true when the user has explicitly enabled live trading this
     * session and confirmed the risk acknowledgment checklist.
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
          'SIMULATION MODE \u2014 No real funds at risk';
        if (switchBtn) {
          switchBtn.textContent = 'Switch to Live';
          switchBtn.className = 'simulation-switch-btn';
        }
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

    _enableLiveTrading() {
      localStorage.setItem(STORAGE_KEY_LIVE, 'true');
      this.close();
      SimulationBanner.update();
      TG.haptic.notify('success');
      // Dispatch event so other components can react
      window.dispatchEvent(new CustomEvent('tonai:live_trading_enabled'));
    },

    _switchBackToSimulation() {
      TG.confirm(
        'Switch back to Simulation Mode?\nYour agents will stop executing real trades.',
        (ok) => {
          if (!ok) return;
          localStorage.removeItem(STORAGE_KEY_LIVE);
          SimulationBanner.update();
          TG.haptic.notify('success');
          window.dispatchEvent(new CustomEvent('tonai:simulation_mode_enabled'));
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

    // Confirm live trading
    el('confirm-live-trading-btn')?.addEventListener('click', () => {
      LiveTradingModal._enableLiveTrading();
    });

    // Apply initial banner state
    SimulationBanner.update();
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
