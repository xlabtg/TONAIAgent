/**
 * TON AI Agent – Strategy Marketplace Component
 * Browse, discover, and deploy trading strategies from the marketplace
 */
(function () {
  'use strict';

  const { State, API, DemoData, Fmt, el, esc, TG } = window.App;

  // Local marketplace state
  const MarketplaceState = {
    strategies: [],
    filteredStrategies: [],
    selectedStrategy: null,
    category: 'all',
    riskLevel: 'all',
    sortBy: 'roi',
    searchQuery: '',
    filterPanelOpen: false,
  };

  const Marketplace = {
    async refresh() {
      await this.load();
    },

    async load() {
      let data = await API.get('/marketplace/strategies');
      if (!data) data = { strategies: DemoData.marketplace() };

      const strategies = data.strategies || data;
      MarketplaceState.strategies = Array.isArray(strategies) ? strategies : [];
      this.applyFilters();
      this.renderSummary();
      this.renderList();
    },

    applyFilters() {
      let result = [...MarketplaceState.strategies];

      // Category filter
      if (MarketplaceState.category !== 'all') {
        result = result.filter(s => s.category === MarketplaceState.category);
      }

      // Risk level filter
      if (MarketplaceState.riskLevel !== 'all') {
        result = result.filter(s => s.risk_level === MarketplaceState.riskLevel);
      }

      // Search filter
      if (MarketplaceState.searchQuery) {
        const q = MarketplaceState.searchQuery.toLowerCase();
        result = result.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.author.toLowerCase().includes(q)
        );
      }

      // Sort
      result.sort((a, b) => {
        switch (MarketplaceState.sortBy) {
          case 'roi':
            return b.roi_30d - a.roi_30d;
          case 'sharpe':
            return b.sharpe_ratio - a.sharpe_ratio;
          case 'popularity':
            return b.active_users - a.active_users;
          case 'newest':
            return new Date(b.published_at) - new Date(a.published_at);
          default:
            return 0;
        }
      });

      MarketplaceState.filteredStrategies = result;
    },

    renderSummary() {
      const list = MarketplaceState.strategies;
      el('mp-total-strategies').textContent = list.length;

      if (list.length > 0) {
        const topRoi = Math.max(...list.map(s => s.roi_30d || 0));
        el('mp-top-roi').textContent = `+${topRoi.toFixed(1)}%`;

        const totalUsers = list.reduce((sum, s) => sum + (s.active_users || 0), 0);
        el('mp-active-users').textContent = totalUsers;
      } else {
        el('mp-top-roi').textContent = '0%';
        el('mp-active-users').textContent = '0';
      }
    },

    renderList() {
      const list = MarketplaceState.filteredStrategies;
      const container = el('marketplace-list');
      const empty = el('marketplace-empty');

      if (!list.length) {
        empty.classList.remove('hidden');
        container.innerHTML = '';
        return;
      }

      empty.classList.add('hidden');

      container.innerHTML = list.map(s => {
        const roi = s.roi_30d || 0;
        const riskClass = s.risk_level === 'low' ? 'risk-low' :
                          s.risk_level === 'high' ? 'risk-high' : 'risk-medium';
        const riskLabel = s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1);
        const categoryLabel = this.formatCategory(s.category);

        return `
          <div class="marketplace-card" data-strategy-id="${esc(s.id)}">
            <div class="marketplace-card-header">
              <div class="strategy-info">
                <span class="strategy-name">${esc(s.name)}</span>
                ${s.verified ? '<span class="verified-badge">Verified</span>' : ''}
              </div>
              <span class="category-tag">${esc(categoryLabel)}</span>
            </div>
            <div class="strategy-author-row">
              <span class="author-label">by ${esc(s.author)}</span>
              <span class="version-label">v${esc(s.version)}</span>
            </div>
            <div class="strategy-description-preview">${esc(s.description)}</div>
            <div class="marketplace-metrics-grid">
              <div class="marketplace-metric">
                <div class="metric-label">ROI (30d)</div>
                <div class="metric-value ${roi >= 0 ? 'positive' : 'negative'}">
                  ${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%
                </div>
              </div>
              <div class="marketplace-metric">
                <div class="metric-label">Win Rate</div>
                <div class="metric-value">${(s.win_rate || 0).toFixed(1)}%</div>
              </div>
              <div class="marketplace-metric">
                <div class="metric-label">Trades</div>
                <div class="metric-value">${s.total_trades || 0}</div>
              </div>
              <div class="marketplace-metric">
                <div class="metric-label">Risk</div>
                <div class="metric-value ${riskClass}">${riskLabel}</div>
              </div>
            </div>
            <div class="marketplace-card-footer">
              <div class="footer-stats">
                <span class="reputation-score">Score: ${(s.reputation_score || 0).toFixed(1)}/10</span>
                <span class="active-users">${s.active_users || 0} users</span>
              </div>
              <button class="deploy-btn-small" data-strategy-id="${esc(s.id)}">Deploy</button>
            </div>
          </div>
        `;
      }).join('');

      // Attach click handlers
      container.querySelectorAll('.marketplace-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.deploy-btn-small')) return;
          this.openStrategyModal(card.dataset.strategyId);
        });
      });

      container.querySelectorAll('.deploy-btn-small').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openDeployModal(btn.dataset.strategyId);
          TG.haptic.impact();
        });
      });
    },

    formatCategory(cat) {
      const labels = {
        momentum: 'Momentum',
        mean_reversion: 'Mean Reversion',
        arbitrage: 'Arbitrage',
        grid_trading: 'Grid Trading',
        yield_farming: 'Yield Farming',
        trend_following: 'Trend Following',
      };
      return labels[cat] || cat;
    },

    openStrategyModal(strategyId) {
      const strategy = MarketplaceState.strategies.find(s => s.id === strategyId);
      if (!strategy) return;

      MarketplaceState.selectedStrategy = strategy;
      TG.haptic.select();

      // Populate modal
      el('modal-strategy-name').textContent = strategy.name;
      el('modal-strategy-badge').textContent = strategy.verified ? 'Verified' : 'Unverified';
      el('modal-strategy-badge').className = 'strategy-badge ' + (strategy.verified ? 'verified' : 'unverified');

      el('modal-author-initials').textContent = strategy.author.charAt(0).toUpperCase();
      el('modal-author-name').textContent = strategy.author;
      el('modal-author-meta').textContent = `v${strategy.version} | ${this.formatCategory(strategy.category)}`;

      el('modal-strategy-description').textContent = strategy.description;

      const roi = strategy.roi_30d || 0;
      el('modal-strategy-roi').textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
      el('modal-strategy-roi').className = 'modal-stat-value ' + (roi >= 0 ? 'positive' : 'negative');

      el('modal-strategy-winrate').textContent = `${(strategy.win_rate || 0).toFixed(1)}%`;
      el('modal-strategy-trades').textContent = strategy.total_trades || 0;
      el('modal-strategy-drawdown').textContent = `-${(strategy.max_drawdown || 0).toFixed(1)}%`;
      el('modal-strategy-sharpe').textContent = (strategy.sharpe_ratio || 0).toFixed(2);
      el('modal-strategy-reputation').textContent = `${(strategy.reputation_score || 0).toFixed(1)}/10`;

      const riskClass = strategy.risk_level === 'low' ? 'risk-low' :
                        strategy.risk_level === 'high' ? 'risk-high' : 'risk-medium';
      el('modal-risk-level').textContent = strategy.risk_level.charAt(0).toUpperCase() + strategy.risk_level.slice(1);
      el('modal-risk-level').className = 'risk-value ' + riskClass;

      el('modal-supported-assets').textContent = (strategy.supported_assets || []).join(', ');
      el('modal-min-capital').textContent = `${strategy.min_capital || 10} TON`;

      // Show modal
      el('strategy-modal').classList.remove('hidden');
    },

    closeStrategyModal() {
      el('strategy-modal').classList.add('hidden');
      MarketplaceState.selectedStrategy = null;
    },

    openDeployModal(strategyId) {
      const strategy = MarketplaceState.strategies.find(s => s.id === strategyId);
      if (!strategy) return;

      MarketplaceState.selectedStrategy = strategy;

      // Populate deploy modal
      el('deploy-strategy-summary').innerHTML = `
        <div class="deploy-strategy-name">${esc(strategy.name)}</div>
        <div class="deploy-strategy-meta">
          <span>by ${esc(strategy.author)}</span>
          <span>ROI: +${(strategy.roi_30d || 0).toFixed(1)}%</span>
        </div>
      `;

      el('deploy-capital').value = '';
      el('deploy-capital').min = strategy.min_capital || 10;
      el('deploy-min-capital').textContent = strategy.min_capital || 10;
      el('deploy-simulation').checked = true;

      // Close strategy modal if open
      el('strategy-modal').classList.add('hidden');

      // Show deploy modal
      el('deploy-modal').classList.remove('hidden');
    },

    closeDeployModal() {
      el('deploy-modal').classList.add('hidden');
    },

    async deployStrategy() {
      const strategy = MarketplaceState.selectedStrategy;
      if (!strategy) return;

      const capital = parseFloat(el('deploy-capital').value);
      const minCapital = strategy.min_capital || 10;

      if (isNaN(capital) || capital < minCapital) {
        TG.alert(`Please enter a valid capital amount (minimum ${minCapital} TON)`);
        return;
      }

      const simulationMode = el('deploy-simulation').checked;

      // In production, this would call the API
      const deployData = {
        strategyId: strategy.id,
        capitalTON: capital,
        simulationMode: simulationMode,
      };

      console.log('[Marketplace] Deploying strategy:', deployData);

      // Simulate API call
      TG.haptic.notify('success');
      TG.alert(`Strategy "${strategy.name}" deployed successfully${simulationMode ? ' (Simulation Mode)' : ''}!`);

      this.closeDeployModal();
    },

    toggleFilterPanel() {
      MarketplaceState.filterPanelOpen = !MarketplaceState.filterPanelOpen;
      const panel = el('marketplace-filter-panel');
      if (MarketplaceState.filterPanelOpen) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
      TG.haptic.select();
    },

    setCategory(category) {
      MarketplaceState.category = category;
      this.applyFilters();
      this.renderList();
    },

    setRiskLevel(risk) {
      MarketplaceState.riskLevel = risk;
      this.applyFilters();
      this.renderList();
    },

    setSort(sortBy) {
      MarketplaceState.sortBy = sortBy;
      this.applyFilters();
      this.renderList();
    },

    setSearch(query) {
      MarketplaceState.searchQuery = query;
      this.applyFilters();
      this.renderList();
    },
  };

  /* --------------------------------------------------------
     Event Handlers Setup
     -------------------------------------------------------- */
  function setupEventHandlers() {
    // Filter button
    el('marketplace-filter-btn')?.addEventListener('click', () => {
      Marketplace.toggleFilterPanel();
    });

    // Search input
    el('marketplace-search-input')?.addEventListener('input', (e) => {
      Marketplace.setSearch(e.target.value);
    });

    // Category tabs
    el('marketplace-categories')?.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el('marketplace-categories').querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Marketplace.setCategory(btn.dataset.category);
        TG.haptic.select();
      });
    });

    // Risk filter chips
    el('risk-filter-chips')?.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        el('risk-filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        Marketplace.setRiskLevel(chip.dataset.risk);
        TG.haptic.select();
      });
    });

    // Sort dropdown
    el('marketplace-sort')?.addEventListener('change', (e) => {
      Marketplace.setSort(e.target.value);
    });

    // Strategy modal
    el('strategy-modal-overlay')?.addEventListener('click', () => {
      Marketplace.closeStrategyModal();
    });
    el('close-strategy-modal')?.addEventListener('click', () => {
      Marketplace.closeStrategyModal();
    });
    el('deploy-strategy-btn')?.addEventListener('click', () => {
      if (MarketplaceState.selectedStrategy) {
        Marketplace.openDeployModal(MarketplaceState.selectedStrategy.id);
      }
    });
    el('backtest-strategy-btn')?.addEventListener('click', () => {
      if (MarketplaceState.selectedStrategy && window.Backtesting) {
        Marketplace.closeStrategyModal();
        window.Backtesting.openBacktestModal(MarketplaceState.selectedStrategy.id);
      }
    });

    // Deploy modal
    el('deploy-modal-overlay')?.addEventListener('click', () => {
      Marketplace.closeDeployModal();
    });
    el('cancel-deploy-btn')?.addEventListener('click', () => {
      Marketplace.closeDeployModal();
    });
    el('confirm-deploy-btn')?.addEventListener('click', () => {
      Marketplace.deployStrategy();
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventHandlers);
  } else {
    setupEventHandlers();
  }

  window.Marketplace = Marketplace;
})();
