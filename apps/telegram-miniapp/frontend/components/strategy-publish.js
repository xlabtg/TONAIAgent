/**
 * TON AI Agent — Strategy Publish & Subscribe Component (Issue #273)
 *
 * Provides UI for:
 *  - Publishing a trading strategy to the marketplace
 *  - Subscribing / unsubscribing to strategies
 *  - Viewing strategy performance & revenue for creators
 *  - Allocation slider for subscribed strategies
 */
(function () {
  'use strict';

  const { State, API, Fmt, el, esc, TG } = window.App || {};

  // =========================================================================
  // State
  // =========================================================================

  const PublishState = {
    userStrategies: [],     // strategies created by the current user
    subscriptions: [],       // user's active subscriptions
    publishModalOpen: false,
    subscribeModalStrategyId: null,
    loading: false,
  };

  // =========================================================================
  // Publish Flow
  // =========================================================================

  const StrategyPublish = {
    // Open the "Publish Strategy" modal
    openPublishModal() {
      PublishState.publishModalOpen = true;
      this.renderPublishModal();
      const overlay = el('publish-modal-overlay');
      if (overlay) overlay.style.display = 'flex';
      TG?.haptic?.light?.();
    },

    closePublishModal() {
      PublishState.publishModalOpen = false;
      const overlay = el('publish-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    },

    // Submit a new strategy publication
    async publishStrategy() {
      const nameEl = el('publish-strategy-name');
      const descEl = el('publish-strategy-desc');
      const typeEl = el('publish-strategy-type');
      const riskEl = el('publish-strategy-risk');
      const modelEl = el('publish-revenue-model');
      const feeEl = el('publish-fee-value');
      const tagsEl = el('publish-strategy-tags');

      if (!nameEl?.value?.trim()) {
        this._showError('Strategy name is required');
        return;
      }

      const body = {
        name: nameEl.value.trim(),
        description: descEl?.value?.trim() ?? '',
        type: typeEl?.value ?? 'custom',
        riskLevel: Number(riskEl?.value ?? 5),
        revenueModel: modelEl?.value ?? 'free',
        performanceFeePercent: modelEl?.value === 'performance_fee' ? Number(feeEl?.value ?? 20) : 0,
        subscriptionFeeUsd: modelEl?.value === 'subscription' ? Number(feeEl?.value ?? 9) : 0,
        tags: (tagsEl?.value ?? '').split(',').map(t => t.trim()).filter(Boolean),
        isPublic: true,
      };

      PublishState.loading = true;
      this._setPublishBtnLoading(true);

      try {
        const result = await API.post('/api/strategies/publish', body);
        if (result?.success || result?.data?.strategy) {
          this.closePublishModal();
          TG?.haptic?.success?.();
          this._showSuccess('Strategy published successfully!');
          await this.loadUserStrategies();
          this.renderUserStrategies();
        } else {
          this._showError(result?.error ?? 'Failed to publish strategy');
        }
      } catch (e) {
        this._showError('Network error. Please try again.');
      } finally {
        PublishState.loading = false;
        this._setPublishBtnLoading(false);
      }
    },

    // Load strategies created by current user
    async loadUserStrategies() {
      const creatorId = State?.userId;
      if (!creatorId) return;
      const data = await API.get(`/api/strategies?creatorId=${creatorId}&sortBy=newest&limit=20`);
      PublishState.userStrategies = data?.data?.strategies ?? data?.strategies ?? [];
    },

    // Render list of user's own strategies
    renderUserStrategies() {
      const container = el('my-strategies-list');
      if (!container) return;

      if (PublishState.userStrategies.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <p>You haven't published any strategies yet.</p>
            <button class="btn btn-primary" onclick="StrategyPublish.openPublishModal()">
              + Publish Strategy
            </button>
          </div>`;
        return;
      }

      container.innerHTML = PublishState.userStrategies.map(s => `
        <div class="strategy-creator-card" data-id="${esc(s.id)}">
          <div class="card-header">
            <span class="strategy-name">${esc(s.name)}</span>
            <span class="strategy-type badge badge-${esc(s.type)}">${esc(s.type)}</span>
            ${s.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
          </div>
          <div class="card-stats">
            <div class="stat"><span class="label">Subscribers</span><span class="value">${s.subscriberCount ?? 0}</span></div>
            <div class="stat"><span class="label">Revenue</span><span class="value">$${Fmt?.currency?.(s.totalRevenueUsd ?? 0) ?? '0.00'}</span></div>
            <div class="stat"><span class="label">Model</span><span class="value">${_revenueModelLabel(s.revenueModel)}</span></div>
          </div>
          <div class="card-actions">
            <button class="btn btn-sm btn-outline" onclick="StrategyPublish.viewPerformance('${esc(s.id)}')">
              📈 Performance
            </button>
            <button class="btn btn-sm btn-danger-outline" onclick="StrategyPublish.unpublishStrategy('${esc(s.id)}')">
              Unpublish
            </button>
          </div>
        </div>`).join('');
    },

    // View performance for a strategy
    async viewPerformance(strategyId) {
      const data = await API.get(`/api/strategies/${strategyId}/performance`);
      const perf = data?.data?.performance ?? data?.performance;
      if (!perf) {
        this._showError('Performance data not available');
        return;
      }

      const modal = el('performance-modal');
      const content = el('performance-modal-content');
      if (content) {
        content.innerHTML = `
          <h3>Strategy Performance</h3>
          <div class="perf-grid">
            <div class="perf-stat"><span>Win Rate</span><strong>${((perf.winRate ?? 0) * 100).toFixed(1)}%</strong></div>
            <div class="perf-stat"><span>ROI (30d)</span><strong>${(perf.roi30d ?? 0).toFixed(2)}%</strong></div>
            <div class="perf-stat"><span>Max Drawdown</span><strong>${((perf.maxDrawdown ?? 0) * 100).toFixed(1)}%</strong></div>
            <div class="perf-stat"><span>Total Trades</span><strong>${perf.totalTrades ?? 0}</strong></div>
            <div class="perf-stat"><span>Ranking Score</span><strong>${(perf.rankingScore ?? 0).toFixed(3)}</strong></div>
            <div class="perf-stat"><span>Revenue (USD)</span><strong>$${(perf.totalRevenueUsd ?? 0).toFixed(2)}</strong></div>
          </div>`;
      }
      if (modal) modal.style.display = 'flex';
    },

    // Unpublish / remove strategy from public listing
    async unpublishStrategy(strategyId) {
      if (!confirm('Remove this strategy from the marketplace?')) return;
      const result = await API.delete(`/api/strategies/${strategyId}`);
      if (result?.success !== false) {
        TG?.haptic?.success?.();
        this._showSuccess('Strategy unpublished');
        await this.loadUserStrategies();
        this.renderUserStrategies();
      } else {
        this._showError(result?.error ?? 'Failed to unpublish');
      }
    },

    // -----------------------------------------------------------------------
    // Render the publish modal HTML (injected dynamically)
    // -----------------------------------------------------------------------
    renderPublishModal() {
      let existing = el('publish-modal-overlay');
      if (existing) return; // already in DOM

      const div = document.createElement('div');
      div.id = 'publish-modal-overlay';
      div.className = 'modal-overlay';
      div.style.display = 'none';
      div.innerHTML = `
        <div class="modal-container publish-modal">
          <div class="modal-header">
            <h2>📤 Publish Strategy</h2>
            <button class="modal-close" id="close-publish-modal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Strategy Name *</label>
              <input id="publish-strategy-name" class="form-input" type="text" placeholder="e.g. Momentum Trend Pro" maxlength="80">
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea id="publish-strategy-desc" class="form-input" rows="3" placeholder="Describe how your strategy works..."></textarea>
            </div>
            <div class="form-row">
              <div class="form-group half">
                <label>Type</label>
                <select id="publish-strategy-type" class="form-input">
                  <option value="trend">Trend</option>
                  <option value="arbitrage">Arbitrage</option>
                  <option value="ai-signal">AI Signal</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div class="form-group half">
                <label>Risk Level (1–10)</label>
                <input id="publish-strategy-risk" class="form-input" type="number" min="1" max="10" value="5">
              </div>
            </div>
            <div class="form-group">
              <label>Revenue Model</label>
              <select id="publish-revenue-model" class="form-input" onchange="StrategyPublish.onRevenueModelChange(this.value)">
                <option value="free">Free</option>
                <option value="subscription">Monthly Subscription</option>
                <option value="performance_fee">Performance Fee</option>
              </select>
            </div>
            <div class="form-group" id="publish-fee-group" style="display:none">
              <label id="publish-fee-label">Fee (%)</label>
              <input id="publish-fee-value" class="form-input" type="number" min="0" max="50" value="20">
            </div>
            <div class="form-group">
              <label>Tags (comma-separated)</label>
              <input id="publish-strategy-tags" class="form-input" type="text" placeholder="momentum, trend, ton">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="cancel-publish-btn">Cancel</button>
            <button class="btn btn-primary" id="confirm-publish-btn">🚀 Publish</button>
          </div>
        </div>`;

      document.body.appendChild(div);
      div.style.display = 'flex';

      // Wire up events
      el('close-publish-modal')?.addEventListener('click', () => StrategyPublish.closePublishModal());
      el('cancel-publish-btn')?.addEventListener('click', () => StrategyPublish.closePublishModal());
      el('confirm-publish-btn')?.addEventListener('click', () => StrategyPublish.publishStrategy());
      div.addEventListener('click', (e) => { if (e.target === div) StrategyPublish.closePublishModal(); });
    },

    onRevenueModelChange(model) {
      const feeGroup = el('publish-fee-group');
      const feeLabel = el('publish-fee-label');
      if (!feeGroup) return;
      if (model === 'free') {
        feeGroup.style.display = 'none';
      } else {
        feeGroup.style.display = 'block';
        if (feeLabel) feeLabel.textContent = model === 'performance_fee' ? 'Performance Fee (%)' : 'Monthly Fee (USD)';
      }
    },

    _setPublishBtnLoading(loading) {
      const btn = el('confirm-publish-btn');
      if (btn) {
        btn.disabled = loading;
        btn.textContent = loading ? 'Publishing…' : '🚀 Publish';
      }
    },

    _showError(msg) {
      console.error('[StrategyPublish]', msg);
      if (window.App?.showToast) window.App.showToast(msg, 'error');
    },

    _showSuccess(msg) {
      if (window.App?.showToast) window.App.showToast(msg, 'success');
    },
  };

  // =========================================================================
  // Subscribe / Unsubscribe Flow
  // =========================================================================

  const StrategySubscribe = {
    // Load active subscriptions for current user
    async loadSubscriptions() {
      const data = await API.get('/api/strategies/subscriptions');
      PublishState.subscriptions = data?.data?.subscriptions ?? data?.subscriptions ?? [];
    },

    // Open subscribe modal for a strategy
    openSubscribeModal(strategyId, strategyName) {
      PublishState.subscribeModalStrategyId = strategyId;

      let overlay = el('subscribe-modal-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'subscribe-modal-overlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
      }

      overlay.innerHTML = `
        <div class="modal-container subscribe-modal">
          <div class="modal-header">
            <h2>📌 Subscribe to Strategy</h2>
            <button class="modal-close" id="close-subscribe-modal">✕</button>
          </div>
          <div class="modal-body">
            <p class="strategy-name-label">${esc(strategyName)}</p>
            <div class="form-group">
              <label>Portfolio Allocation</label>
              <div class="slider-row">
                <input type="range" id="allocation-slider" min="1" max="100" value="10" class="allocation-slider"
                  oninput="el('allocation-display').textContent = this.value + '%'">
                <span id="allocation-display" class="allocation-display">10%</span>
              </div>
              <p class="form-hint">Percentage of your portfolio to allocate to this strategy</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="cancel-subscribe-btn">Cancel</button>
            <button class="btn btn-primary" id="confirm-subscribe-btn">Subscribe</button>
          </div>
        </div>`;

      overlay.style.display = 'flex';

      el('close-subscribe-modal')?.addEventListener('click', () => StrategySubscribe.closeSubscribeModal());
      el('cancel-subscribe-btn')?.addEventListener('click', () => StrategySubscribe.closeSubscribeModal());
      el('confirm-subscribe-btn')?.addEventListener('click', () => StrategySubscribe.confirmSubscribe());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) StrategySubscribe.closeSubscribeModal(); });

      TG?.haptic?.light?.();
    },

    closeSubscribeModal() {
      const overlay = el('subscribe-modal-overlay');
      if (overlay) overlay.style.display = 'none';
      PublishState.subscribeModalStrategyId = null;
    },

    async confirmSubscribe() {
      const strategyId = PublishState.subscribeModalStrategyId;
      if (!strategyId) return;

      const allocation = Number(el('allocation-slider')?.value ?? 10);
      const btn = el('confirm-subscribe-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }

      try {
        const result = await API.post(`/api/strategies/${strategyId}/subscribe`, { allocation });
        if (result?.success !== false) {
          this.closeSubscribeModal();
          TG?.haptic?.success?.();
          if (window.App?.showToast) window.App.showToast('Subscribed successfully!', 'success');
          await this.loadSubscriptions();
          this.renderSubscriptions();
        } else {
          if (window.App?.showToast) window.App.showToast(result?.error ?? 'Subscription failed', 'error');
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
      }
    },

    async unsubscribe(strategyId) {
      if (!confirm('Unsubscribe from this strategy?')) return;
      const result = await API.post(`/api/strategies/${strategyId}/unsubscribe`, {});
      if (result?.success !== false) {
        TG?.haptic?.success?.();
        if (window.App?.showToast) window.App.showToast('Unsubscribed', 'success');
        await this.loadSubscriptions();
        this.renderSubscriptions();
      } else {
        if (window.App?.showToast) window.App.showToast(result?.error ?? 'Failed to unsubscribe', 'error');
      }
    },

    // Render the subscription list panel
    renderSubscriptions() {
      const container = el('my-subscriptions-list');
      if (!container) return;

      if (PublishState.subscriptions.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <p>No active subscriptions. Explore the Marketplace to find strategies.</p>
          </div>`;
        return;
      }

      container.innerHTML = PublishState.subscriptions.map(sub => `
        <div class="subscription-card" data-id="${esc(sub.strategyId)}">
          <div class="sub-info">
            <span class="sub-strategy-id">${esc(sub.strategyId)}</span>
            <span class="sub-allocation">${sub.allocation}% allocation</span>
          </div>
          <div class="sub-meta">
            <span class="sub-status badge badge-active">Active</span>
            <span class="sub-since">Since ${_formatDate(sub.createdAt)}</span>
          </div>
          <button class="btn btn-sm btn-danger-outline"
            onclick="StrategySubscribe.unsubscribe('${esc(sub.strategyId)}')">
            Unsubscribe
          </button>
        </div>`).join('');
    },
  };

  // =========================================================================
  // Helpers
  // =========================================================================

  function _revenueModelLabel(model) {
    switch (model) {
      case 'free': return 'Free';
      case 'subscription': return 'Subscription';
      case 'performance_fee': return 'Performance Fee';
      default: return model ?? 'Free';
    }
  }

  function _formatDate(iso) {
    if (!iso) return '–';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  }

  // =========================================================================
  // Init
  // =========================================================================

  async function init() {
    await Promise.all([
      StrategyPublish.loadUserStrategies(),
      StrategySubscribe.loadSubscriptions(),
    ]);
    StrategyPublish.renderUserStrategies();
    StrategySubscribe.renderSubscriptions();

    // Wire up top-level "Publish Strategy" button if present
    el('open-publish-modal-btn')?.addEventListener('click', () => {
      StrategyPublish.openPublishModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose globally for inline onclick handlers
  window.StrategyPublish = StrategyPublish;
  window.StrategySubscribe = StrategySubscribe;
  // Helper used in inline handlers
  window.el = window.el ?? ((id) => document.getElementById(id));
})();
