/**
 * TON AI Agent – Portfolio Dashboard
 * Main application bootstrap, Telegram integration, routing, shared state
 */
(function () {
  'use strict';

  /* ============================================================
     Telegram WebApp Integration
     ============================================================ */
  const tg = window.Telegram?.WebApp;

  const TG = {
    init() {
      if (!tg) {
        this._standaloneMode();
        return;
      }
      tg.expand();
      tg.enableClosingConfirmation();
      this._applyTheme();
      tg.onEvent('themeChanged', () => this._applyTheme());
      tg.ready();
      window.dispatchEvent(new CustomEvent('tg:ready', {
        detail: { user: tg.initDataUnsafe?.user || null, initData: tg.initData }
      }));
    },

    _applyTheme() {
      const params = tg?.themeParams || {};
      const mappings = {
        bg_color: '--tg-theme-bg-color',
        text_color: '--tg-theme-text-color',
        hint_color: '--tg-theme-hint-color',
        link_color: '--tg-theme-link-color',
        button_color: '--tg-theme-button-color',
        button_text_color: '--tg-theme-button-text-color',
        secondary_bg_color: '--tg-theme-secondary-bg-color',
      };
      Object.entries(mappings).forEach(([k, v]) => {
        if (params[k]) document.documentElement.style.setProperty(v, params[k]);
      });
      document.documentElement.setAttribute('data-theme', tg?.colorScheme || 'dark');
    },

    _standaloneMode() {
      // Demo/standalone defaults (dark theme)
      const defaults = {
        '--tg-theme-bg-color': '#0e1117',
        '--tg-theme-secondary-bg-color': '#1a1f2e',
        '--tg-theme-text-color': '#e8edf5',
        '--tg-theme-hint-color': '#6b7a99',
        '--tg-theme-link-color': '#00A8FF',
        '--tg-theme-button-color': '#0088CC',
        '--tg-theme-button-text-color': '#ffffff',
      };
      Object.entries(defaults).forEach(([k, v]) =>
        document.documentElement.style.setProperty(k, v));
      document.documentElement.setAttribute('data-theme', 'dark');

      window.dispatchEvent(new CustomEvent('tg:ready', {
        detail: { user: { id: 'demo', first_name: 'Demo', last_name: 'User', username: 'demo' }, initData: '' }
      }));
    },

    haptic: {
      impact(s = 'light') { tg?.HapticFeedback?.impactOccurred(s); },
      select() { tg?.HapticFeedback?.selectionChanged(); },
      notify(t = 'success') { tg?.HapticFeedback?.notificationOccurred(t); },
    },

    alert(msg) { tg ? tg.showAlert(msg) : alert(msg); },
    confirm(msg, cb) { tg ? tg.showConfirm(msg, cb) : cb(confirm(msg)); },
    showBackButton(cb) { if (tg) { tg.BackButton.show(); if (cb) tg.BackButton.onClick(cb); } },
    hideBackButton() { if (tg) { tg.BackButton.hide(); tg.BackButton.offClick(() => {}); } },
  };

  /* ============================================================
     API Client – connects to Portfolio API
     ============================================================ */
  const API = {
    baseUrl: '/api',
    initData: '',

    async request(endpoint, options = {}) {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = { 'Content-Type': 'application/json', ...options.headers };
      if (this.initData) headers['X-Telegram-Init-Data'] = this.initData;
      try {
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('[API] request failed, using demo data:', err.message);
        return null;
      }
    },

    get(path) { return this.request(path); },
  };

  /* ============================================================
     Demo Data Generator
     Mirrors the PHP PortfolioAnalytics demo data
     ============================================================ */
  const DemoData = {
    portfolio() {
      return {
        agent_id: 'agent_001',
        portfolio_value: 15450.50,
        total_cost: 13000.00,
        profit: 2450.50,
        roi: 18.85,
        unrealized_pnl: 950.50,
        realized_pnl: 1500.00,
        day_change: 234.75,
        day_change_percent: 1.54,
        total_fees: 42.30,
        strategy_count: 3,
        open_position_count: 4,
        capital_utilization: 87.5,
        last_updated: new Date().toISOString(),
      };
    },

    portfolioValue() {
      return {
        portfolio_value: 15450.50,
        quote_currency: 'USD',
        assets: [
          { asset: 'BTC',  balance: 0.10,  price: 65000,  value: 6500.00  },
          { asset: 'ETH',  balance: 2.00,  price: 3500,   value: 7000.00  },
          { asset: 'TON',  balance: 500.0, price: 5.25,   value: 2625.00  },
          { asset: 'USD',  balance: 725.5, price: 1.0,    value: 725.50   },
        ],
        timestamp: new Date().toISOString(),
      };
    },

    agents() {
      return [
        {
          id: 'agent_001',
          name: 'Alpha Bot',
          strategy: 'DCA Strategy',
          status: 'active',
          value: 8200.00,
          profit: 1350.00,
          roi: 19.7,
          win_rate: 68.5,
          total_trades: 42,
        },
        {
          id: 'agent_002',
          name: 'Yield Hunter',
          strategy: 'Yield Optimizer',
          status: 'active',
          value: 4750.50,
          profit: 875.00,
          roi: 22.6,
          win_rate: 74.2,
          total_trades: 28,
        },
        {
          id: 'agent_003',
          name: 'Arbitrage X',
          strategy: 'DEX Arbitrage',
          status: 'paused',
          value: 2500.00,
          profit: 225.50,
          roi: 9.9,
          win_rate: 61.0,
          total_trades: 17,
        },
      ];
    },

    strategies(period = '30d') {
      const factor = period === '7d' ? 0.25 : period === '90d' ? 3 : period === 'all_time' ? 12 : 1;
      return [
        {
          strategy_id: 'dca_001',
          strategy_name: 'DCA Strategy',
          roi: 19.7 * factor,
          annualized_return: 28.4,
          win_rate: 68.5,
          max_drawdown: 3.2,
          total_trades: Math.round(42 * factor),
          sharpe_ratio: 1.82,
          profit_factor: 2.1,
        },
        {
          strategy_id: 'yield_001',
          strategy_name: 'Yield Optimizer',
          roi: 22.6 * factor,
          annualized_return: 35.1,
          win_rate: 74.2,
          max_drawdown: 5.8,
          total_trades: Math.round(28 * factor),
          sharpe_ratio: 2.14,
          profit_factor: 2.7,
        },
        {
          strategy_id: 'arb_001',
          strategy_name: 'DEX Arbitrage',
          roi: 9.9 * factor,
          annualized_return: 14.8,
          win_rate: 61.0,
          max_drawdown: 7.1,
          total_trades: Math.round(17 * factor),
          sharpe_ratio: 1.23,
          profit_factor: 1.6,
        },
      ];
    },

    trades(page = 1, perPage = 20, filters = {}) {
      const actions = ['BUY', 'SELL'];
      const assets = ['BTC', 'ETH', 'TON', 'SOL'];
      const all = Array.from({ length: 87 }, (_, i) => {
        const action = actions[i % 2];
        const asset = assets[i % 4];
        const price = { BTC: 65000, ETH: 3500, TON: 5.25, SOL: 175 }[asset];
        const amount = parseFloat((0.01 + Math.random() * 0.5).toFixed(4));
        const value = parseFloat((amount * price).toFixed(2));
        const pnl = action === 'SELL' ? parseFloat(((Math.random() - 0.35) * value * 0.05).toFixed(2)) : 0;
        const ts = new Date(Date.now() - (i * 3600000 * 6));
        return {
          id: `trade_${String(i + 1).padStart(3, '0')}`,
          asset,
          action,
          price,
          amount,
          value,
          fee: parseFloat((value * 0.001).toFixed(2)),
          pnl,
          timestamp: ts.toISOString(),
          strategy_name: ['DCA Strategy', 'Yield Optimizer', 'DEX Arbitrage'][i % 3],
        };
      });

      let filtered = all;
      if (filters.action && filters.action !== 'all') {
        filtered = filtered.filter(t => t.action === filters.action);
      }
      if (filters.asset && filters.asset !== 'all') {
        filtered = filtered.filter(t => t.asset === filters.asset);
      }
      if (filters.sort === 'asc') filtered = filtered.reverse();

      const total = filtered.length;
      const start = (page - 1) * perPage;
      return {
        trades: filtered.slice(start, start + perPage),
        pagination: { page, per_page: perPage, total, pages: Math.ceil(total / perPage) },
      };
    },

    metrics() {
      return {
        portfolio_value: 15450.50,
        profit: 2450.50,
        roi: '18.85%',
        total_trades: 87,
        win_rate: '68.4%',
        max_drawdown: '5.8%',
        avg_trade_profit: 28.17,
        strategies: this.strategies(),
      };
    },

    marketplace() {
      return [
        {
          id: 'strategy_001',
          name: 'Momentum Trader',
          description: 'Captures short-term price momentum using moving average crossovers and volume confirmation.',
          author: 'TradingMaster',
          author_id: 'creator_001',
          category: 'momentum',
          risk_level: 'medium',
          supported_assets: ['BTC', 'ETH', 'TON'],
          version: '1.0.0',
          verified: true,
          roi_30d: 8.2,
          win_rate: 68.5,
          total_trades: 124,
          max_drawdown: 5.8,
          sharpe_ratio: 1.82,
          reputation_score: 8.7,
          active_users: 342,
          min_capital: 10,
          published_at: '2026-02-15T10:30:00Z',
        },
        {
          id: 'strategy_002',
          name: 'Mean Reversion Pro',
          description: 'Exploits price mean reversion patterns with statistical analysis and Bollinger Bands.',
          author: 'QuantLab',
          author_id: 'creator_002',
          category: 'mean_reversion',
          risk_level: 'low',
          supported_assets: ['BTC', 'ETH'],
          version: '2.1.0',
          verified: true,
          roi_30d: 5.4,
          win_rate: 72.1,
          total_trades: 89,
          max_drawdown: 3.2,
          sharpe_ratio: 2.14,
          reputation_score: 9.1,
          active_users: 518,
          min_capital: 50,
          published_at: '2026-01-20T08:15:00Z',
        },
        {
          id: 'strategy_003',
          name: 'DEX Arbitrage Hunter',
          description: 'Identifies and executes arbitrage opportunities across TON DEX protocols.',
          author: 'ArbitrageKing',
          author_id: 'creator_003',
          category: 'arbitrage',
          risk_level: 'high',
          supported_assets: ['TON', 'USDT'],
          version: '1.2.0',
          verified: true,
          roi_30d: 12.7,
          win_rate: 61.3,
          total_trades: 456,
          max_drawdown: 8.5,
          sharpe_ratio: 1.45,
          reputation_score: 7.8,
          active_users: 156,
          min_capital: 100,
          published_at: '2026-02-01T14:45:00Z',
        },
        {
          id: 'strategy_004',
          name: 'Grid Trading Bot',
          description: 'Automated grid trading strategy for ranging markets with configurable grid levels.',
          author: 'GridMaster',
          author_id: 'creator_004',
          category: 'grid_trading',
          risk_level: 'medium',
          supported_assets: ['BTC', 'ETH', 'TON', 'SOL'],
          version: '1.5.0',
          verified: true,
          roi_30d: 6.8,
          win_rate: 65.2,
          total_trades: 312,
          max_drawdown: 4.7,
          sharpe_ratio: 1.68,
          reputation_score: 8.2,
          active_users: 289,
          min_capital: 25,
          published_at: '2026-02-10T11:20:00Z',
        },
        {
          id: 'strategy_005',
          name: 'Yield Optimizer',
          description: 'Maximizes DeFi yields by automatically rebalancing across TON yield protocols.',
          author: 'YieldHunter',
          author_id: 'creator_005',
          category: 'yield_farming',
          risk_level: 'low',
          supported_assets: ['TON', 'USDT', 'USDC'],
          version: '3.0.0',
          verified: true,
          roi_30d: 4.2,
          win_rate: 85.6,
          total_trades: 67,
          max_drawdown: 2.1,
          sharpe_ratio: 2.45,
          reputation_score: 9.4,
          active_users: 723,
          min_capital: 100,
          published_at: '2025-12-05T09:00:00Z',
        },
        {
          id: 'strategy_006',
          name: 'Trend Following Alpha',
          description: 'Multi-timeframe trend following strategy with dynamic position sizing.',
          author: 'AlphaTrader',
          author_id: 'creator_006',
          category: 'momentum',
          risk_level: 'medium',
          supported_assets: ['BTC', 'ETH'],
          version: '1.1.0',
          verified: false,
          roi_30d: 9.5,
          win_rate: 58.9,
          total_trades: 78,
          max_drawdown: 7.2,
          sharpe_ratio: 1.52,
          reputation_score: 7.2,
          active_users: 98,
          min_capital: 20,
          published_at: '2026-03-01T16:30:00Z',
        },
      ];
    },
  };

  /* ============================================================
     App State
     ============================================================ */
  const State = {
    user: null,
    currentPage: 'portfolio',
    portfolio: null,
    portfolioValue: null,
    agents: [],
    strategies: [],
    trades: { list: [], pagination: {} },
    tradeFilters: { action: 'all', asset: 'all', sort: 'desc' },
    tradePage: 1,
    tradePerPage: 20,
    strategyPeriod: '30d',
    selectedAgentId: null,
  };

  /* ============================================================
     Router / Navigation
     ============================================================ */
  function showPage(name) {
    if (State.currentPage === name) return;
    State.currentPage = name;

    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const page = document.getElementById(`page-${name}`);
    if (page) page.classList.remove('hidden');

    const navBtn = document.querySelector(`.nav-item[data-page="${name}"]`);
    if (navBtn) navBtn.classList.add('active');

    TG.haptic.select();

    // Load data on demand
    switch (name) {
      case 'portfolio': Portfolio.refresh(); break;
      case 'agents':    Agents.refresh(); break;
      case 'strategies': Strategies.refresh(); break;
      case 'trades':    Trades.refresh(); break;
      case 'marketplace': if (window.Marketplace) { Marketplace.refresh(); } break;
      case 'growth':    if (window.Growth) { Growth.init(); Growth.render(); } break;
    }
  }

  /* ============================================================
     Utilities
     ============================================================ */
  const Fmt = {
    usd(v) {
      const abs = Math.abs(v);
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
    },
    pct(v) {
      const n = parseFloat(v);
      return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
    },
    ts(iso) {
      const d = new Date(iso);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    sign(v) { return v >= 0 ? '+$' : '-$'; },
  };

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }

  function el(id) { return document.getElementById(id); }

  /* ============================================================
     Init
     ============================================================ */
  function init() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => showPage(btn.dataset.page));
    });

    // Refresh button
    el('refresh-btn')?.addEventListener('click', () => {
      TG.haptic.impact();
      Portfolio.refresh();
    });

    // Telegram ready
    window.addEventListener('tg:ready', (e) => {
      State.user = e.detail.user;
      API.initData = e.detail.initData || '';
      onReady();
    });

    TG.init();
  }

  function onReady() {
    // Show app
    el('loading').classList.add('hidden');
    el('main-content').classList.remove('hidden');

    // User info
    if (State.user) {
      const first = State.user.first_name || 'User';
      const last = State.user.last_name || '';
      el('user-name').textContent = first;
      el('avatar-initials').textContent = (first[0] + (last[0] || '')).toUpperCase();
    }

    // Check for onboarding (after all components loaded)
    setTimeout(() => {
      if (window.Onboarding && window.Onboarding.isFirstTimeUser) {
        window.Onboarding.init();
      }
    }, 100);

    // Load first page
    Portfolio.refresh();
  }

  /* ============================================================
     Public exports for components
     ============================================================ */
  window.App = { State, API, DemoData, Fmt, esc, el, TG, showPage };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
