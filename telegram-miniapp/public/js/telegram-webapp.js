/**
 * TON AI Agent - Telegram WebApp Integration
 * Handles Telegram Mini App initialization and authentication.
 *
 * Compatible with Telegram WebApp SDK 6.0+ (July 2022) through the current
 * Bot API 8.x release.
 */

(function () {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────────────────
  const CONFIG = {
    apiEndpoint: '/api',
    debug: false
  };

  // ── Internal state ───────────────────────────────────────────────────────────
  const state = {
    initialized: false,
    user: null,
    initData: null,
    startParam: null,  // deep-link start parameter (?startapp=...)
    theme: 'light',
    platform: 'unknown',
    version: '0.0'
  };

  // ── Lazy accessor for window.Telegram.WebApp ─────────────────────────────────
  // The SDK script may finish loading after this module is evaluated,
  // so we resolve it lazily instead of capturing it at parse time.
  function tg() {
    return window.Telegram?.WebApp || null;
  }

  // ── Viewport height fix ───────────────────────────────────────────────────────
  // Telegram on iOS/Android reports the wrong viewport height before expand().
  // We update the --tg-viewport-height CSS variable every time it changes.
  function applyViewportHeight() {
    const app = tg();
    const height = app?.viewportStableHeight || window.innerHeight;
    document.documentElement.style.setProperty('--tg-viewport-height', height + 'px');
  }

  // ── Theme ────────────────────────────────────────────────────────────────────
  const THEME_MAPPINGS = {
    bg_color:                '--tg-theme-bg-color',
    text_color:              '--tg-theme-text-color',
    hint_color:              '--tg-theme-hint-color',
    link_color:              '--tg-theme-link-color',
    button_color:            '--tg-theme-button-color',
    button_text_color:       '--tg-theme-button-text-color',
    secondary_bg_color:      '--tg-theme-secondary-bg-color',
    // Bot API 6.6+
    header_bg_color:         '--tg-theme-header-bg-color',
    accent_text_color:       '--tg-theme-accent-text-color',
    section_bg_color:        '--tg-theme-section-bg-color',
    section_header_text_color: '--tg-theme-section-header-text-color',
    subtitle_text_color:     '--tg-theme-subtitle-text-color',
    destructive_text_color:  '--tg-theme-destructive-text-color'
  };

  function applyTelegramTheme() {
    const app = tg();
    const params = app?.themeParams || {};

    Object.entries(THEME_MAPPINGS).forEach(([param, cssVar]) => {
      if (params[param]) {
        document.documentElement.style.setProperty(cssVar, params[param]);
      }
    });

    state.theme = app?.colorScheme || 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
  }

  function applyStandaloneTheme() {
    const defaults = {
      '--tg-theme-bg-color':             '#ffffff',
      '--tg-theme-text-color':           '#000000',
      '--tg-theme-hint-color':           '#999999',
      '--tg-theme-link-color':           '#0088CC',
      '--tg-theme-button-color':         '#0088CC',
      '--tg-theme-button-text-color':    '#ffffff',
      '--tg-theme-secondary-bg-color':   '#f0f0f0',
      '--tg-theme-header-bg-color':      '#0088CC',
      '--tg-theme-accent-text-color':    '#0088CC',
      '--tg-theme-section-bg-color':     '#ffffff',
      '--tg-theme-subtitle-text-color':  '#999999',
      '--tg-theme-destructive-text-color': '#ef233c',
      '--tg-viewport-height':            window.innerHeight + 'px'
    };
    Object.entries(defaults).forEach(([cssVar, value]) => {
      document.documentElement.style.setProperty(cssVar, value);
    });
    document.documentElement.setAttribute('data-theme', 'light');
  }

  // ── Version guard ────────────────────────────────────────────────────────────
  function versionAtLeast(required) {
    const app = tg();
    if (!app) return false;
    if (typeof app.isVersionAtLeast === 'function') {
      return app.isVersionAtLeast(required);
    }
    // Fallback: manual semver comparison
    const [ma, mi] = (app.version || '0.0').split('.').map(Number);
    const [ra, ri] = required.split('.').map(Number);
    return ma > ra || (ma === ra && (mi || 0) >= (ri || 0));
  }

  // ── Event listeners ──────────────────────────────────────────────────────────
  function setupEventListeners() {
    const app = tg();
    if (!app) return;

    app.onEvent('themeChanged', () => {
      applyTelegramTheme();
      window.dispatchEvent(new CustomEvent('tg:themeChanged', {
        detail: { theme: state.theme }
      }));
    });

    app.onEvent('viewportChanged', (event) => {
      applyViewportHeight();
      window.dispatchEvent(new CustomEvent('tg:viewportChanged', {
        detail: event
      }));
    });

    app.onEvent('mainButtonClicked', () => {
      window.dispatchEvent(new CustomEvent('tg:mainButtonClicked'));
    });

    app.onEvent('backButtonClicked', () => {
      window.dispatchEvent(new CustomEvent('tg:backButtonClicked'));
    });

    // Bot API 7.0+: settings button
    if (versionAtLeast('7.0')) {
      app.onEvent('settingsButtonClicked', () => {
        window.dispatchEvent(new CustomEvent('tg:settingsButtonClicked'));
      });
    }

    // Bot API 6.1+: invoice closed
    if (versionAtLeast('6.1')) {
      app.onEvent('invoiceClosed', (event) => {
        window.dispatchEvent(new CustomEvent('tg:invoiceClosed', {
          detail: event
        }));
      });
    }
  }

  // ── Initialization ───────────────────────────────────────────────────────────
  function init() {
    const app = tg();

    if (!app) {
      if (CONFIG.debug) {
        console.warn('[TelegramMiniApp] SDK not available — running in standalone mode.');
      }
      initStandaloneMode();
      return;
    }

    // 1. Signal readiness to Telegram as early as possible so the loading
    //    indicator is dismissed.  Must come before any UI updates.
    app.ready();

    // 2. Expand to full height (no-op on desktop)
    app.expand();

    // 3. Capture init data & user
    state.initData  = app.initData  || null;
    state.user      = app.initDataUnsafe?.user || null;
    state.startParam= app.initDataUnsafe?.start_param || null;
    state.platform  = app.platform  || 'unknown';
    state.version   = app.version   || '0.0';

    // 4. Apply theme
    applyTelegramTheme();
    applyViewportHeight();

    // 5. Set up event listeners
    setupEventListeners();

    // 6. Enable closing confirmation for production safety
    if (typeof app.enableClosingConfirmation === 'function') {
      app.enableClosingConfirmation();
    }

    state.initialized = true;

    if (CONFIG.debug) {
      console.log('[TelegramMiniApp] initialized', state);
    }

    window.dispatchEvent(new CustomEvent('tg:ready', { detail: { ...state } }));
  }

  function initStandaloneMode() {
    applyStandaloneTheme();

    state.initialized = true;
    state.platform    = 'web';
    state.user = {
      id:         0,
      first_name: 'Demo',
      last_name:  'User',
      username:   'demo',
      language_code: 'en'
    };

    // Read ?startapp= from the browser URL so deep links work during local dev
    const params = new URLSearchParams(window.location.search);
    state.startParam = params.get('startapp') || null;

    window.dispatchEvent(new CustomEvent('tg:ready', { detail: { ...state } }));
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  function getUser()      { return state.user; }
  function getInitData()  { return state.initData; }
  function getStartParam(){ return state.startParam; }
  function isInTelegram() { return !!tg(); }

  function showMainButton(text, callback) {
    const app = tg();
    if (!app) return;
    app.MainButton.setText(text);
    app.MainButton.show();
    if (callback) app.MainButton.onClick(callback);
  }

  function hideMainButton() {
    tg()?.MainButton.hide();
  }

  function showBackButton(callback) {
    const app = tg();
    if (!app) return;
    app.BackButton.show();
    if (callback) app.BackButton.onClick(callback);
  }

  function hideBackButton() {
    tg()?.BackButton.hide();
  }

  function showAlert(message, callback) {
    const app = tg();
    if (app) {
      app.showAlert(message, callback);
    } else {
      alert(message);
      if (callback) callback();
    }
  }

  function showConfirm(message, callback) {
    const app = tg();
    if (app) {
      app.showConfirm(message, callback);
    } else {
      const result = confirm(message);
      if (callback) callback(result);
    }
  }

  function showPopup(params, callback) {
    const app = tg();
    if (app && versionAtLeast('6.2')) {
      app.showPopup(params, callback);
    } else {
      const result = confirm(params.message || params.title || '');
      if (callback) callback(result ? 'ok' : 'cancel');
    }
  }

  function requestContact(callback) {
    const app = tg();
    if (app && versionAtLeast('6.9') && typeof app.requestContact === 'function') {
      app.requestContact(callback);
    } else {
      if (callback) callback({ status: 'cancelled' });
    }
  }

  function openLink(url, options) {
    const app = tg();
    if (app) {
      app.openLink(url, options || {});
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function openTelegramLink(url) {
    const app = tg();
    if (app) {
      app.openTelegramLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function close() {
    tg()?.close();
  }

  function sendData(data) {
    const app = tg();
    if (app) {
      app.sendData(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  // Bot API 6.1+: switchInlineQuery
  function switchInlineQuery(query, chatTypes) {
    const app = tg();
    if (app && versionAtLeast('6.1') && typeof app.switchInlineQuery === 'function') {
      app.switchInlineQuery(query, chatTypes);
    }
  }

  const haptic = {
    impactOccurred(style) {
      tg()?.HapticFeedback?.impactOccurred(style || 'medium');
    },
    notificationOccurred(type) {
      tg()?.HapticFeedback?.notificationOccurred(type || 'success');
    },
    selectionChanged() {
      tg()?.HapticFeedback?.selectionChanged();
    }
  };

  // ── Authenticated API helper ─────────────────────────────────────────────────
  async function apiRequest(endpoint, options) {
    const opts = options || {};
    const url  = CONFIG.apiEndpoint + endpoint;

    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      opts.headers || {}
    );

    if (state.initData) {
      headers['X-Telegram-Init-Data'] = state.initData;
    }

    const response = await fetch(url, Object.assign({}, opts, { headers }));

    if (!response.ok) {
      throw new Error('API Error: ' + response.status + ' ' + response.statusText);
    }

    return response.json();
  }

  // ── Export ───────────────────────────────────────────────────────────────────
  window.TelegramMiniApp = {
    init,
    getUser,
    getInitData,
    getStartParam,
    isInTelegram,
    versionAtLeast,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    showAlert,
    showConfirm,
    showPopup,
    requestContact,
    openLink,
    openTelegramLink,
    switchInlineQuery,
    close,
    sendData,
    haptic,
    apiRequest,
    get state() { return Object.assign({}, state); }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
