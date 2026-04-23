/**
 * TON AI Agent – Mainnet Readiness Checklist Component
 *
 * Renders the checklist as an interactive screen with per-item "I understand"
 * buttons. Calls the server-side acknowledgement API so that the
 * simulation → live transition gate has verified, server-stored data.
 *
 * Flow:
 *   1. User opens the checklist screen (via Checklist.open()).
 *   2. Component fetches GET /users/me/checklist to show current status.
 *   3. User taps "I understand" on each item → POST /users/me/checklist/:id/acknowledge.
 *   4. Once all mandatory items are acknowledged the component emits
 *      'tonai:checklist_complete' so Security.LiveTradingModal can proceed.
 *
 * @see Issue #363 – Gate Live Trading on Mainnet Readiness Checklist Completion
 */
(function () {
  'use strict';

  const { el, esc, TG } = window.App;

  // ============================================================================
  // API helpers
  // ============================================================================

  const API_BASE = '/users/me/checklist';

  async function apiFetch(path, options) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
      ...options,
    });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data: json };
  }

  // ============================================================================
  // Category labels for UI grouping
  // ============================================================================

  const CATEGORY_LABELS = {
    'account-security': 'Account Security',
    wallet: 'Wallet Readiness',
    platform: 'Platform Understanding',
    simulation: 'Simulation Review',
    risk: 'Risk Configuration',
    monitoring: 'Monitoring Setup',
    compliance: 'Compliance Gates',
    'final-acknowledgment': 'Final Acknowledgment',
  };

  // ============================================================================
  // Checklist State
  // ============================================================================

  const ChecklistState = {
    items: [],
    checklistVersion: null,
    loading: false,
    error: null,
  };

  // ============================================================================
  // Checklist Component
  // ============================================================================

  const Checklist = {
    _overlay: null,

    async open() {
      this._createOverlay();
      await this._loadStatus();
    },

    close() {
      if (this._overlay) {
        this._overlay.classList.add('fade-out');
        setTimeout(() => {
          if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
          }
        }, 200);
      }
    },

    // --------------------------------------------------------------------------
    // Internal: overlay scaffold
    // --------------------------------------------------------------------------

    _createOverlay() {
      const existing = document.getElementById('checklist-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'checklist-overlay';
      overlay.className = 'checklist-overlay';
      overlay.innerHTML = `
        <div class="checklist-panel">
          <div class="checklist-header">
            <h2 class="checklist-title">Mainnet Readiness Checklist</h2>
            <button class="checklist-close-btn" id="checklist-close-btn" aria-label="Close">&#x2715;</button>
          </div>
          <p class="checklist-intro">
            Complete every mandatory item before enabling live trading with real funds.
          </p>
          <div id="checklist-body" class="checklist-body">
            <div class="checklist-loading">Loading checklist&hellip;</div>
          </div>
          <div class="checklist-footer" id="checklist-footer" style="display:none">
            <button class="checklist-enable-btn" id="checklist-enable-btn" disabled>
              All mandatory items acknowledged &mdash; Enable Live Trading
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      this._overlay = overlay;

      document.getElementById('checklist-close-btn')
        ?.addEventListener('click', () => this.close());
    },

    // --------------------------------------------------------------------------
    // Internal: fetch status from API
    // --------------------------------------------------------------------------

    async _loadStatus() {
      ChecklistState.loading = true;
      const { ok, data } = await apiFetch(API_BASE);
      ChecklistState.loading = false;

      if (!ok || !data?.data) {
        this._renderError('Could not load checklist. Please try again.');
        return;
      }

      const { items, checklistVersion, canEnableLiveTrading } = data.data;
      ChecklistState.items = items;
      ChecklistState.checklistVersion = checklistVersion;
      this._render(items, canEnableLiveTrading);
    },

    // --------------------------------------------------------------------------
    // Internal: render checklist grouped by category
    // --------------------------------------------------------------------------

    _render(items, canEnableLive) {
      const body = document.getElementById('checklist-body');
      const footer = document.getElementById('checklist-footer');
      const enableBtn = document.getElementById('checklist-enable-btn');
      if (!body) return;

      // Group by category
      const groups = {};
      for (const entry of items) {
        const cat = entry.item.category;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(entry);
      }

      const html = Object.entries(groups).map(([cat, entries]) => `
        <div class="checklist-group">
          <h3 class="checklist-group-title">${esc(CATEGORY_LABELS[cat] ?? cat)}</h3>
          <ul class="checklist-items">
            ${entries.map(entry => this._renderItem(entry)).join('')}
          </ul>
        </div>
      `).join('');

      body.innerHTML = html;

      // Wire up acknowledge buttons
      body.querySelectorAll('.checklist-ack-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const itemId = btn.dataset.itemId;
          await this._acknowledgeItem(itemId, btn);
        });
      });

      // Footer
      if (footer) {
        footer.style.display = 'block';
        if (enableBtn) {
          enableBtn.disabled = !canEnableLive;
          if (canEnableLive) {
            enableBtn.addEventListener('click', () => this._onEnableLive());
          }
        }
      }
    },

    _renderItem(entry) {
      const { item, acknowledged, acknowledgedAt } = entry;
      const mandatoryBadge = item.mandatoryForLive
        ? '<span class="checklist-mandatory-badge">Required</span>'
        : '';
      const ackTime = acknowledgedAt
        ? `<span class="checklist-ack-time">Acknowledged ${new Date(acknowledgedAt).toLocaleDateString()}</span>`
        : '';

      if (acknowledged) {
        return `
          <li class="checklist-item checklist-item--done" data-item-id="${esc(item.id)}">
            <span class="checklist-item-check">&#10003;</span>
            <div class="checklist-item-content">
              <span class="checklist-item-title">${esc(item.title)} ${mandatoryBadge}</span>
              <span class="checklist-item-desc">${esc(item.description)}</span>
              ${ackTime}
            </div>
          </li>
        `;
      }

      return `
        <li class="checklist-item checklist-item--pending" data-item-id="${esc(item.id)}">
          <span class="checklist-item-check checklist-item-check--empty"></span>
          <div class="checklist-item-content">
            <span class="checklist-item-title">${esc(item.title)} ${mandatoryBadge}</span>
            <span class="checklist-item-desc">${esc(item.description)}</span>
          </div>
          <button
            class="checklist-ack-btn"
            data-item-id="${esc(item.id)}"
            data-version="${esc(ChecklistState.checklistVersion ?? '')}"
          >
            I&nbsp;understand
          </button>
        </li>
      `;
    },

    _renderError(message) {
      const body = document.getElementById('checklist-body');
      if (body) {
        body.innerHTML = `<div class="checklist-error">${esc(message)}</div>`;
      }
    },

    // --------------------------------------------------------------------------
    // Internal: POST acknowledge
    // --------------------------------------------------------------------------

    async _acknowledgeItem(itemId, btn) {
      if (!itemId) return;

      btn.disabled = true;
      btn.textContent = 'Saving…';
      TG.haptic.impact('light');

      const { ok, data } = await apiFetch(
        `${API_BASE}/${encodeURIComponent(itemId)}/acknowledge`,
        {
          method: 'POST',
          body: JSON.stringify({ expectedVersion: ChecklistState.checklistVersion }),
        },
      );

      if (!ok) {
        btn.disabled = false;
        btn.textContent = 'I understand';

        if (data?.code === 'CHECKLIST_VERSION_MISMATCH') {
          TG.confirm(
            'The checklist has been updated. Please reload to see the latest version.',
            ok => { if (ok) this._loadStatus(); },
          );
        } else {
          TG.haptic.notify('error');
        }
        return;
      }

      TG.haptic.notify('success');

      const { checklistStatus } = data.data;
      ChecklistState.items = checklistStatus.items;
      ChecklistState.checklistVersion = checklistStatus.checklistVersion;

      // Re-render with updated status
      this._render(checklistStatus.items, checklistStatus.canEnableLiveTrading);

      if (checklistStatus.canEnableLiveTrading) {
        window.dispatchEvent(new CustomEvent('tonai:checklist_complete'));
      }
    },

    // --------------------------------------------------------------------------
    // Internal: enable live trading after full acknowledgement
    // --------------------------------------------------------------------------

    _onEnableLive() {
      this.close();
      window.dispatchEvent(new CustomEvent('tonai:checklist_complete'));
      if (window.Security?.LiveTradingModal) {
        window.Security.LiveTradingModal.open();
      }
    },
  };

  // ============================================================================
  // Listen for requests from other components to show the checklist
  // ============================================================================

  window.addEventListener('tonai:show_checklist', () => Checklist.open());

  // ============================================================================
  // Export
  // ============================================================================

  window.Checklist = Checklist;
})();
