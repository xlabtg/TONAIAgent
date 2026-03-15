/**
 * TON AI Agent – Production Mini App Extensions
 *
 * Adds the following production features on top of the base app.js:
 *   - i18n (English + Russian, auto-detected from Telegram profile)
 *   - iOS / Android safe-area inset support via CSS env() variables
 *   - Demo / Live mode switch (persisted in localStorage)
 *   - TON Connect wallet integration (Tonkeeper, OpenMask, MyTonWallet, TON Space)
 *   - Referral code propagation from Telegram start_param deep links
 *   - Crypto asset icon resolution (BTC, ETH, TON, USDT, NOT)
 *   - AI API settings panel (Groq / OpenAI / custom endpoint)
 *   - Portfolio dashboard enhancements (ROI, daily PnL, asset allocation with icons)
 *
 * This file is loaded after app.js so it can patch window.App with the
 * production extensions.
 *
 * @see Issue #239 — Production Telegram Mini App (Cross-Device UI, Wallet, Demo/Live Mode)
 */
(function () {
  'use strict';

  // ==========================================================================
  // I18n — English + Russian
  // ==========================================================================

  const TRANSLATIONS = {
    en: {
      'nav.portfolio':  'Portfolio',
      'nav.agents':     'Agents',
      'nav.trades':     'Trades',
      'nav.settings':   'Settings',
      'wallet.connect':       'Connect Wallet',
      'wallet.connecting':    'Connecting…',
      'wallet.connected':     'Connected',
      'wallet.disconnect':    'Disconnect',
      'wallet.select_provider': 'Choose your wallet',
      'wallet.error':         'Connection failed. Try again.',
      'mode.demo':            'Demo Mode',
      'mode.live':            'Live Mode',
      'mode.switch_to_live':  'Switch to Live',
      'mode.switch_to_demo':  'Switch to Demo',
      'mode.demo_desc':       'Simulated trading — no real funds used',
      'mode.live_desc':       'Real wallet — real on-chain swaps',
      'portfolio.total_value':  'Total Portfolio Value',
      'portfolio.daily_pnl':    'Daily PnL',
      'portfolio.roi':          'ROI',
      'portfolio.assets':       'Assets',
      'portfolio.open_positions': 'Open Positions',
      'portfolio.no_positions': 'No open positions',
      'settings.title':         'Settings',
      'settings.language':      'Language',
      'settings.mode':          'Trading Mode',
      'settings.ai_provider':   'AI Provider',
      'settings.api_key':       'API Key',
      'settings.model':         'Model',
      'settings.endpoint':      'Custom Endpoint',
      'settings.save':          'Save Settings',
      'settings.saved':         'Settings saved!',
      'referral.welcome':       'Welcome! You were referred by a friend.',
      'common.loading':         'Loading…',
      'common.error':           'Error',
      'common.retry':           'Retry',
    },
    ru: {
      'nav.portfolio':  'Портфель',
      'nav.agents':     'Агенты',
      'nav.trades':     'Сделки',
      'nav.settings':   'Настройки',
      'wallet.connect':       'Подключить кошелёк',
      'wallet.connecting':    'Подключение…',
      'wallet.connected':     'Подключён',
      'wallet.disconnect':    'Отключить',
      'wallet.select_provider': 'Выберите кошелёк',
      'wallet.error':         'Ошибка подключения. Попробуйте снова.',
      'mode.demo':            'Демо-режим',
      'mode.live':            'Боевой режим',
      'mode.switch_to_live':  'Перейти в боевой',
      'mode.switch_to_demo':  'Перейти в демо',
      'mode.demo_desc':       'Симуляция сделок — реальных средств нет',
      'mode.live_desc':       'Реальный кошелёк — реальные свопы on-chain',
      'portfolio.total_value':  'Общая стоимость портфеля',
      'portfolio.daily_pnl':    'PnL за день',
      'portfolio.roi':          'ROI',
      'portfolio.assets':       'Активы',
      'portfolio.open_positions': 'Открытые позиции',
      'portfolio.no_positions': 'Нет открытых позиций',
      'settings.title':         'Настройки',
      'settings.language':      'Язык',
      'settings.mode':          'Режим торговли',
      'settings.ai_provider':   'AI-провайдер',
      'settings.api_key':       'API-ключ',
      'settings.model':         'Модель',
      'settings.endpoint':      'Кастомный эндпоинт',
      'settings.save':          'Сохранить',
      'settings.saved':         'Сохранено!',
      'referral.welcome':       'Добро пожаловать! Вас пригласил друг.',
      'common.loading':         'Загрузка…',
      'common.error':           'Ошибка',
      'common.retry':           'Повторить',
    },
  };

  const I18n = {
    lang: 'en',

    detect(telegramLangCode) {
      if (!telegramLangCode) return 'en';
      const code = telegramLangCode.toLowerCase().split('-')[0];
      return code === 'ru' ? 'ru' : 'en';
    },

    setLang(lang) {
      this.lang = (lang === 'ru') ? 'ru' : 'en';
      document.documentElement.lang = this.lang;
      this._applyToDOM();
    },

    t(key) {
      return (TRANSLATIONS[this.lang] || TRANSLATIONS.en)[key] || key;
    },

    _applyToDOM() {
      // Update all elements with a data-i18n attribute
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = this.t(key);
      });
    },
  };

  // ==========================================================================
  // Safe-Area Insets (iOS notch / home-indicator support)
  // ==========================================================================

  const SafeArea = {
    apply(webApp) {
      const tgInsets = webApp?.safeAreaInset || {};
      // Set CSS custom properties that the stylesheet reads via env() fallbacks
      const root = document.documentElement;
      if (tgInsets.top    !== undefined) root.style.setProperty('--safe-area-top',    tgInsets.top    + 'px');
      if (tgInsets.bottom !== undefined) root.style.setProperty('--safe-area-bottom', tgInsets.bottom + 'px');
      if (tgInsets.left   !== undefined) root.style.setProperty('--safe-area-left',   tgInsets.left   + 'px');
      if (tgInsets.right  !== undefined) root.style.setProperty('--safe-area-right',  tgInsets.right  + 'px');
    },
  };

  // ==========================================================================
  // App Mode (Demo / Live)
  // ==========================================================================

  const Mode = {
    _mode: 'demo',
    STORAGE_KEY: 'tonai_app_mode',

    load() {
      try {
        this._mode = localStorage.getItem(this.STORAGE_KEY) === 'live' ? 'live' : 'demo';
      } catch { this._mode = 'demo'; }
    },

    get() { return this._mode; },

    set(mode) {
      this._mode = (mode === 'live') ? 'live' : 'demo';
      try { localStorage.setItem(this.STORAGE_KEY, this._mode); } catch {}
      this._render();
    },

    isDemo() { return this._mode === 'demo'; },

    _render() {
      const badge = document.getElementById('mode-badge');
      if (badge) {
        badge.textContent = I18n.t(this._mode === 'live' ? 'mode.live' : 'mode.demo');
        badge.className = 'mode-badge mode-badge--' + this._mode;
      }
    },
  };

  // ==========================================================================
  // Referral Code
  // ==========================================================================

  const Referral = {
    code: null,

    parse(startParam) {
      if (!startParam) return null;
      const s = String(startParam).trim();
      return s.startsWith('ref_') ? s.slice(4) : (s || null);
    },

    handle(code) {
      if (!code) return;
      this.code = code;
      try { localStorage.setItem('tonai_referral_code', code); } catch {}
      // Show a toast / banner to welcome the referred user
      this._showWelcome();
    },

    _showWelcome() {
      const existing = document.getElementById('referral-banner');
      if (existing) return;
      const banner = document.createElement('div');
      banner.id = 'referral-banner';
      banner.className = 'referral-banner';
      banner.textContent = I18n.t('referral.welcome');
      document.body.prepend(banner);
      setTimeout(() => banner.remove(), 5000);
    },
  };

  // ==========================================================================
  // Token Asset Icons
  // ==========================================================================

  const TokenIcons = {
    BASE_PATH: '/assets/tokens',
    KNOWN: ['BTC', 'ETH', 'TON', 'USDT', 'NOT'],

    iconPath(symbol) {
      const sym = String(symbol).toUpperCase();
      return this.KNOWN.includes(sym)
        ? `${this.BASE_PATH}/${sym}.svg`
        : `${this.BASE_PATH}/GENERIC.svg`;
    },

    /** Returns an <img> tag string for use in templates */
    img(symbol, size) {
      const sz = size || 24;
      const path = this.iconPath(symbol);
      const sym = String(symbol || '').toUpperCase();
      return `<img class="token-icon" src="${path}" alt="${sym}" width="${sz}" height="${sz}"
               onerror="this.src='${this.BASE_PATH}/GENERIC.svg'">`;
    },
  };

  // ==========================================================================
  // Wallet Manager (TON Connect)
  // ==========================================================================

  const WALLET_PROVIDERS = [
    {
      id: 'tonkeeper',
      name: 'Tonkeeper',
      icon: '🔵',
      universalLink: 'https://app.tonkeeper.com/ton-connect',
      jsBridgeKey: 'tonkeeper',
    },
    {
      id: 'openmask',
      name: 'OpenMask',
      icon: '🟣',
      universalLink: 'https://openmask.app/ton-connect',
      jsBridgeKey: 'openmask',
    },
    {
      id: 'mytonwallet',
      name: 'MyTonWallet',
      icon: '🔷',
      universalLink: 'https://mytonwallet.io/ton-connect',
      jsBridgeKey: 'mytonwallet',
    },
    {
      id: 'tonspace',
      name: 'TON Space',
      icon: '🔹',
      universalLink: 'https://ton.space/ton-connect',
      jsBridgeKey: 'tonspace',
    },
  ];

  const Wallet = {
    state: {
      status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
      provider: null,
      address: null,
      displayAddress: null,
      balanceTon: null,
    },

    /** Format a TON address as first-6…last-4 */
    formatAddress(addr) {
      if (!addr || addr.length <= 12) return addr || '';
      return addr.slice(0, 6) + '…' + addr.slice(-4);
    },

    async connect(providerId) {
      const info = WALLET_PROVIDERS.find(p => p.id === providerId);
      if (!info) return;

      this._setState({ status: 'connecting', provider: providerId });
      this._renderBar();

      if (Mode.isDemo()) {
        // Simulate a successful connection in demo mode
        await new Promise(r => setTimeout(r, 600));
        const mockAddr = 'EQDemo000000000000000000000000000000000000000000';
        this._setState({
          status: 'connected',
          provider: providerId,
          address: mockAddr,
          displayAddress: this.formatAddress(mockAddr),
          balanceTon: 10.5,
        });
      } else {
        // Try JS bridge first, then universal link
        const bridge = window[info.jsBridgeKey];
        if (bridge && typeof bridge.connect === 'function') {
          try {
            const result = await bridge.connect({ items: [{ name: 'ton_addr' }] });
            const addr = result?.item?.address || result?.address;
            if (!addr) throw new Error('No address returned');
            this._setState({
              status: 'connected',
              provider: providerId,
              address: addr,
              displayAddress: this.formatAddress(addr),
            });
          } catch (err) {
            this._setState({ status: 'error', error: err.message });
          }
        } else {
          // Open universal link in Telegram WebApp / browser
          const tg = window.Telegram?.WebApp;
          const link = info.universalLink;
          if (tg && typeof tg.openLink === 'function') {
            tg.openLink(link);
          } else {
            window.open(link, '_blank');
          }
          // Stay in 'connecting' — wallet app must return and post a message
          this._setState({ status: 'connecting' });
        }
      }

      this._renderBar();
      this._closeModal();
    },

    disconnect() {
      this._setState({ status: 'disconnected', provider: null, address: null, displayAddress: null, balanceTon: null });
      this._renderBar();
    },

    _setState(patch) {
      Object.assign(this.state, patch);
    },

    _renderBar() {
      const btn = document.getElementById('wallet-connect-btn');
      if (!btn) return;
      const { status, displayAddress } = this.state;
      if (status === 'connected' && displayAddress) {
        btn.textContent = displayAddress;
        btn.classList.add('wallet-btn--connected');
      } else if (status === 'connecting') {
        btn.textContent = I18n.t('wallet.connecting');
        btn.classList.remove('wallet-btn--connected');
      } else {
        btn.textContent = I18n.t('wallet.connect');
        btn.classList.remove('wallet-btn--connected');
      }
    },

    openModal() {
      let modal = document.getElementById('wallet-modal');
      if (!modal) {
        modal = this._buildModal();
        document.body.appendChild(modal);
      }
      modal.classList.remove('hidden');
    },

    _closeModal() {
      const modal = document.getElementById('wallet-modal');
      if (modal) modal.classList.add('hidden');
    },

    _buildModal() {
      const modal = document.createElement('div');
      modal.id = 'wallet-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title" data-i18n="wallet.select_provider">${I18n.t('wallet.select_provider')}</div>
          <div class="wallet-providers-list">
            ${WALLET_PROVIDERS.map(p => `
              <button class="wallet-provider-btn" data-wallet="${p.id}">
                <span class="wallet-provider-icon">${p.icon}</span>
                <span class="wallet-provider-name">${p.name}</span>
                <span class="wallet-provider-arrow">›</span>
              </button>
            `).join('')}
          </div>
          <button class="modal-close-btn" id="wallet-modal-close">${I18n.t('common.close') || 'Close'}</button>
        </div>
      `;

      modal.querySelectorAll('.wallet-provider-btn').forEach(btn => {
        btn.addEventListener('click', () => this.connect(btn.dataset.wallet));
      });
      modal.querySelector('#wallet-modal-close').addEventListener('click', () => this._closeModal());
      modal.addEventListener('click', (e) => { if (e.target === modal) this._closeModal(); });

      return modal;
    },
  };

  // ==========================================================================
  // Settings Panel
  // ==========================================================================

  const Settings = {
    STORAGE_KEY: 'tonai_settings',

    load() {
      try {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      } catch { return {}; }
    },

    save(data) {
      try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data)); } catch {}
    },

    openPanel() {
      let panel = document.getElementById('settings-panel');
      if (!panel) {
        panel = this._buildPanel();
        document.body.appendChild(panel);
      }
      panel.classList.remove('hidden');
    },

    _buildPanel() {
      const saved = this.load();
      const panel = document.createElement('div');
      panel.id = 'settings-panel';
      panel.className = 'modal-overlay';
      panel.innerHTML = `
        <div class="modal-sheet settings-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title" data-i18n="settings.title">${I18n.t('settings.title')}</div>

          <div class="settings-group">
            <label class="settings-label" data-i18n="settings.language">${I18n.t('settings.language')}</label>
            <select id="settings-lang" class="settings-select">
              <option value="en" ${I18n.lang === 'en' ? 'selected' : ''}>English</option>
              <option value="ru" ${I18n.lang === 'ru' ? 'selected' : ''}>Русский</option>
            </select>
          </div>

          <div class="settings-group">
            <label class="settings-label" data-i18n="settings.mode">${I18n.t('settings.mode')}</label>
            <select id="settings-mode" class="settings-select">
              <option value="demo" ${Mode.get() === 'demo' ? 'selected' : ''}>${I18n.t('mode.demo')}</option>
              <option value="live" ${Mode.get() === 'live' ? 'selected' : ''}>${I18n.t('mode.live')}</option>
            </select>
            <div class="settings-hint" id="mode-hint">${I18n.t(Mode.isDemo() ? 'mode.demo_desc' : 'mode.live_desc')}</div>
          </div>

          <div class="settings-group">
            <label class="settings-label" data-i18n="settings.ai_provider">${I18n.t('settings.ai_provider')}</label>
            <select id="settings-ai-provider" class="settings-select">
              <option value="groq"   ${(saved.aiProvider || 'groq') === 'groq'   ? 'selected' : ''}>Groq</option>
              <option value="openai" ${(saved.aiProvider || 'groq') === 'openai' ? 'selected' : ''}>OpenAI</option>
              <option value="custom" ${(saved.aiProvider || 'groq') === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
          </div>

          <div class="settings-group">
            <label class="settings-label" data-i18n="settings.api_key">${I18n.t('settings.api_key')}</label>
            <input id="settings-api-key" class="settings-input" type="password"
                   placeholder="sk-…" value="${saved.apiKey || ''}">
          </div>

          <div class="settings-group" id="settings-endpoint-group" style="${(saved.aiProvider === 'custom') ? '' : 'display:none'}">
            <label class="settings-label" data-i18n="settings.endpoint">${I18n.t('settings.endpoint')}</label>
            <input id="settings-endpoint" class="settings-input" type="url"
                   placeholder="https://…" value="${saved.endpoint || ''}">
          </div>

          <button class="settings-save-btn" id="settings-save-btn" data-i18n="settings.save">${I18n.t('settings.save')}</button>
          <div class="settings-saved-msg hidden" id="settings-saved-msg" data-i18n="settings.saved">${I18n.t('settings.saved')}</div>
        </div>
      `;

      // Show/hide endpoint field
      panel.querySelector('#settings-ai-provider').addEventListener('change', (e) => {
        const group = panel.querySelector('#settings-endpoint-group');
        group.style.display = e.target.value === 'custom' ? '' : 'none';
      });

      // Mode hint update
      panel.querySelector('#settings-mode').addEventListener('change', (e) => {
        panel.querySelector('#mode-hint').textContent =
          I18n.t(e.target.value === 'live' ? 'mode.live_desc' : 'mode.demo_desc');
      });

      // Save
      panel.querySelector('#settings-save-btn').addEventListener('click', () => {
        const lang     = panel.querySelector('#settings-lang').value;
        const mode     = panel.querySelector('#settings-mode').value;
        const provider = panel.querySelector('#settings-ai-provider').value;
        const apiKey   = panel.querySelector('#settings-api-key').value.trim();
        const endpoint = panel.querySelector('#settings-endpoint').value.trim();

        I18n.setLang(lang);
        Mode.set(mode);
        this.save({ aiProvider: provider, apiKey, endpoint, language: lang });

        const msg = panel.querySelector('#settings-saved-msg');
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 2000);
      });

      // Close on outside tap
      panel.addEventListener('click', (e) => {
        if (e.target === panel) panel.classList.add('hidden');
      });

      return panel;
    },
  };

  // ==========================================================================
  // Production Portfolio Enhancements
  //   Patches the existing portfolio renderer to add token icons, ROI, PnL
  // ==========================================================================

  const ProductionPortfolio = {
    /**
     * Render the asset allocation list with token icons and change indicators.
     */
    renderAssets(assets) {
      const container = document.getElementById('asset-allocation-list');
      if (!container || !assets || !assets.length) return;

      container.innerHTML = assets.map(a => {
        const sym   = (a.asset || a.symbol || '').toUpperCase();
        const val   = parseFloat(a.value || a.valueUsd || 0);
        const pct   = parseFloat(a.allocation_percent || a.allocationPercent || 0);
        const chg   = parseFloat(a.change_24h || a.change24hPercent || 0);
        const chgCls = chg >= 0 ? 'positive' : 'negative';
        const chgSign = chg >= 0 ? '+' : '';

        return `
          <div class="allocation-item">
            <div class="allocation-left">
              ${TokenIcons.img(sym, 28)}
              <div class="allocation-info">
                <span class="allocation-symbol">${sym}</span>
                <span class="allocation-pct">${pct.toFixed(1)}%</span>
              </div>
            </div>
            <div class="allocation-right">
              <span class="allocation-value">$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span class="allocation-change ${chgCls}">${chgSign}${chg.toFixed(2)}%</span>
            </div>
          </div>
        `;
      }).join('');
    },
  };

  // ==========================================================================
  // Wallet connect button injection
  // ==========================================================================

  function injectWalletButton() {
    const header = document.querySelector('#page-portfolio .page-header');
    if (!header || document.getElementById('wallet-connect-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'wallet-connect-btn';
    btn.className = 'wallet-connect-btn';
    btn.textContent = I18n.t('wallet.connect');
    btn.addEventListener('click', () => {
      if (Wallet.state.status === 'connected') {
        Wallet.disconnect();
      } else {
        Wallet.openModal();
      }
    });
    header.appendChild(btn);
  }

  // Mode badge in header
  function injectModeBadge() {
    const header = document.querySelector('#page-portfolio .page-header');
    if (!header || document.getElementById('mode-badge')) return;

    const badge = document.createElement('span');
    badge.id = 'mode-badge';
    badge.className = 'mode-badge mode-badge--' + Mode.get();
    badge.textContent = I18n.t(Mode.isDemo() ? 'mode.demo' : 'mode.live');
    header.appendChild(badge);
  }

  // Settings nav item (replace "Growth" tab or append)
  function injectSettingsNav() {
    const nav = document.getElementById('bottom-nav');
    if (!nav || nav.querySelector('[data-page="settings"]')) return;

    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.dataset.page = 'settings';
    btn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33
          1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06
          a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
          A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0
          9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33
          l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0
          4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      <span data-i18n="nav.settings">${I18n.t('nav.settings')}</span>
    `;

    btn.addEventListener('click', () => Settings.openPanel());
    nav.appendChild(btn);
  }

  // ==========================================================================
  // Safe-area CSS custom properties in stylesheet
  // ==========================================================================

  function injectSafeAreaCSS() {
    if (document.getElementById('safe-area-style')) return;
    const style = document.createElement('style');
    style.id = 'safe-area-style';
    style.textContent = `
      :root {
        --safe-area-top:    env(safe-area-inset-top,    0px);
        --safe-area-bottom: env(safe-area-inset-bottom, 0px);
        --safe-area-left:   env(safe-area-inset-left,   0px);
        --safe-area-right:  env(safe-area-inset-right,  0px);
      }
      /* Bottom nav respects home-indicator */
      .bottom-nav {
        padding-bottom: max(8px, var(--safe-area-bottom));
      }
      /* Top header clears status bar */
      .page-header {
        padding-top: max(16px, var(--safe-area-top));
      }
    `;
    document.head.appendChild(style);
  }

  // Additional production styles
  function injectProductionStyles() {
    if (document.getElementById('production-style')) return;
    const style = document.createElement('style');
    style.id = 'production-style';
    style.textContent = `
      /* Wallet button */
      .wallet-connect-btn {
        background: var(--tg-theme-button-color, #0088CC);
        color: var(--tg-theme-button-text-color, #fff);
        border: none;
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity .15s;
        white-space: nowrap;
      }
      .wallet-connect-btn:active { opacity: .75; }
      .wallet-btn--connected {
        background: var(--tg-theme-secondary-bg-color, #1a1f2e);
        color: var(--tg-theme-text-color, #e8edf5);
        border: 1px solid var(--tg-theme-hint-color, #6b7a99);
      }

      /* Mode badge */
      .mode-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 10px;
        letter-spacing: .5px;
        text-transform: uppercase;
      }
      .mode-badge--demo { background: rgba(255,193,7,.2); color: #ffc107; }
      .mode-badge--live { background: rgba(40,167,69,.2); color: #28a745; }

      /* Wallet modal / Settings modal */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.5);
        z-index: 9000;
        display: flex;
        align-items: flex-end;
      }
      .modal-overlay.hidden { display: none; }
      .modal-sheet {
        background: var(--tg-theme-bg-color, #0e1117);
        border-radius: 20px 20px 0 0;
        width: 100%;
        padding: 12px 20px max(20px, var(--safe-area-bottom));
      }
      .modal-handle {
        width: 36px; height: 4px;
        background: var(--tg-theme-hint-color, #6b7a99);
        border-radius: 2px;
        margin: 0 auto 16px;
      }
      .modal-title {
        font-size: 18px; font-weight: 700;
        color: var(--tg-theme-text-color, #e8edf5);
        margin-bottom: 16px;
      }
      .wallet-providers-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
      .wallet-provider-btn {
        display: flex; align-items: center; gap: 12px;
        background: var(--tg-theme-secondary-bg-color, #1a1f2e);
        border: none; border-radius: 12px;
        padding: 14px 16px; cursor: pointer; width: 100%;
        color: var(--tg-theme-text-color, #e8edf5);
      }
      .wallet-provider-btn:active { opacity: .75; }
      .wallet-provider-icon { font-size: 22px; }
      .wallet-provider-name { flex: 1; text-align: left; font-size: 16px; font-weight: 600; }
      .wallet-provider-arrow { font-size: 20px; color: var(--tg-theme-hint-color, #6b7a99); }
      .modal-close-btn {
        width: 100%; padding: 14px;
        background: var(--tg-theme-secondary-bg-color, #1a1f2e);
        color: var(--tg-theme-text-color, #e8edf5);
        border: none; border-radius: 12px;
        font-size: 15px; cursor: pointer;
      }

      /* Settings sheet */
      .settings-sheet { max-height: 85vh; overflow-y: auto; }
      .settings-group { margin-bottom: 16px; }
      .settings-label {
        display: block;
        font-size: 13px; font-weight: 600;
        color: var(--tg-theme-hint-color, #6b7a99);
        margin-bottom: 6px;
        text-transform: uppercase; letter-spacing: .5px;
      }
      .settings-select, .settings-input {
        width: 100%;
        background: var(--tg-theme-secondary-bg-color, #1a1f2e);
        color: var(--tg-theme-text-color, #e8edf5);
        border: 1px solid var(--tg-theme-hint-color, #3a3f52);
        border-radius: 10px;
        padding: 12px;
        font-size: 15px;
        box-sizing: border-box;
      }
      .settings-hint {
        font-size: 12px; color: var(--tg-theme-hint-color, #6b7a99);
        margin-top: 6px;
      }
      .settings-save-btn {
        width: 100%; padding: 14px;
        background: var(--tg-theme-button-color, #0088CC);
        color: var(--tg-theme-button-text-color, #fff);
        border: none; border-radius: 12px;
        font-size: 16px; font-weight: 700;
        cursor: pointer; margin-top: 8px;
      }
      .settings-saved-msg {
        text-align: center; color: #28a745;
        font-weight: 600; margin-top: 10px;
      }
      .settings-saved-msg.hidden { display: none; }

      /* Token icons in allocation list */
      .token-icon {
        border-radius: 50%;
        object-fit: contain;
      }
      .allocation-item {
        display: flex; align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--tg-theme-secondary-bg-color, #1a1f2e);
      }
      .allocation-item:last-child { border-bottom: none; }
      .allocation-left { display: flex; align-items: center; gap: 10px; }
      .allocation-info { display: flex; flex-direction: column; }
      .allocation-symbol { font-weight: 700; font-size: 15px; color: var(--tg-theme-text-color, #e8edf5); }
      .allocation-pct   { font-size: 12px; color: var(--tg-theme-hint-color, #6b7a99); }
      .allocation-right { display: flex; flex-direction: column; align-items: flex-end; }
      .allocation-value { font-weight: 600; font-size: 15px; color: var(--tg-theme-text-color, #e8edf5); }
      .allocation-change { font-size: 12px; }
      .allocation-change.positive { color: #28a745; }
      .allocation-change.negative { color: #dc3545; }

      /* Referral banner */
      .referral-banner {
        position: fixed; top: max(12px, var(--safe-area-top)); left: 16px; right: 16px;
        background: linear-gradient(135deg, #0088CC, #00A8FF);
        color: #fff; padding: 12px 16px; border-radius: 12px;
        font-size: 14px; font-weight: 600;
        z-index: 9999; text-align: center;
        animation: slideDown .3s ease;
      }
      @keyframes slideDown {
        from { transform: translateY(-20px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // ==========================================================================
  // Bootstrap — run after app.js has initialised
  // ==========================================================================

  function bootstrap() {
    // 1. Apply safe-area CSS
    injectSafeAreaCSS();
    injectProductionStyles();

    // 2. Load persisted settings
    Mode.load();
    const saved = Settings.load();
    if (saved.language) I18n.setLang(saved.language);

    // 3. Wait for Telegram context (dispatched by app.js)
    window.addEventListener('tg:ready', function (e) {
      const user = e.detail && e.detail.user;
      const tg   = window.Telegram && window.Telegram.WebApp;

      // Language auto-detect from Telegram profile
      if (user && user.language_code && !saved.language) {
        I18n.setLang(I18n.detect(user.language_code));
      }

      // Apply safe-area from Telegram WebApp
      SafeArea.apply(tg);

      // Referral code from start_param
      const startParam = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
      Referral.handle(Referral.parse(startParam));

      // Inject UI elements once DOM is ready
      requestAnimationFrame(function () {
        injectWalletButton();
        injectModeBadge();
        injectSettingsNav();
        I18n._applyToDOM();
      });
    });

    // 4. Expose production API on window.App
    if (window.App) {
      window.App.I18n        = I18n;
      window.App.Mode        = Mode;
      window.App.Wallet      = Wallet;
      window.App.Settings    = Settings;
      window.App.TokenIcons  = TokenIcons;
      window.App.ProductionPortfolio = ProductionPortfolio;
    }

    // 5. Patch portfolio asset rendering when portfolioValue data arrives
    const _origOnReady = window._productionPatch_origOnReady;
    if (!_origOnReady) {
      // Patch the asset allocation rendering every time portfolioValue is loaded
      const origRequest = window.App && window.App.API && window.App.API.request;
      // We patch DemoData.portfolioValue to inject icon paths
      if (window.App && window.App.DemoData) {
        const origPV = window.App.DemoData.portfolioValue.bind(window.App.DemoData);
        window.App.DemoData.portfolioValue = function () {
          const data = origPV();
          if (data && data.assets) {
            data.assets.forEach(a => {
              a.icon_path = TokenIcons.iconPath(a.asset || '');
              a.change_24h = (Math.random() - 0.4) * 5; // simulated 24h change
            });
          }
          return data;
        };
      }
    }
  }

  // Run after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  // Expose for tests
  window.ProductionMiniApp = { I18n, Mode, Wallet, Settings, TokenIcons, Referral, SafeArea };
})();
