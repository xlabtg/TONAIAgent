/**
 * TON AI Agent - Telegram WebApp Integration
 * Handles Telegram Mini App initialization and authentication.
 *
 * Compatible with Telegram WebApp SDK 6.0+ through Bot API 9.5 (March 2026).
 *
 * Changelog by Bot API version:
 *   6.1  — invoiceClosed, switchInlineQuery
 *   6.2  — showPopup
 *   6.6  — Extended theme params (header_bg_color, accent_text_color, …)
 *   6.9  — requestContact
 *   7.0  — settingsButtonClicked, SettingsButton
 *   7.10 — SecondaryButton (BottomButton), bottomBarColor, setBottomBarColor
 *   8.0  — Full-screen, home-screen shortcuts, emoji status, file/message sharing,
 *           Accelerometer, DeviceOrientation, Gyroscope, LocationManager,
 *           orientation lock, downloadFile, safeAreaInset, isActive
 *   9.0  — DeviceStorage, SecureStorage
 *   9.1  — hideKeyboard()
 *   9.5  — BottomButton.iconCustomEmojiId
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
    version: '0.0',
    isFullscreen: false,
    isActive: true
  };

  // ── Lazy accessor for window.Telegram.WebApp ─────────────────────────────────
  // The SDK script may finish loading after this module is evaluated,
  // so we resolve it lazily instead of capturing it at parse time.
  function tg() {
    return window.Telegram?.WebApp || null;
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

  // ── Viewport height fix ───────────────────────────────────────────────────────
  // Telegram on iOS/Android reports the wrong viewport height before expand().
  // We update the --tg-viewport-height CSS variable every time it changes.
  function applyViewportHeight() {
    const app = tg();
    const height = app?.viewportStableHeight || window.innerHeight;
    document.documentElement.style.setProperty('--tg-viewport-height', height + 'px');

    // Bot API 8.0: safe area insets for full-screen mode
    if (versionAtLeast('8.0') && app?.safeAreaInset) {
      const s = app.safeAreaInset;
      document.documentElement.style.setProperty('--tg-safe-area-inset-top',    (s.top    || 0) + 'px');
      document.documentElement.style.setProperty('--tg-safe-area-inset-right',  (s.right  || 0) + 'px');
      document.documentElement.style.setProperty('--tg-safe-area-inset-bottom', (s.bottom || 0) + 'px');
      document.documentElement.style.setProperty('--tg-safe-area-inset-left',   (s.left   || 0) + 'px');
    }
    if (versionAtLeast('8.0') && app?.contentSafeAreaInset) {
      const c = app.contentSafeAreaInset;
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-top',    (c.top    || 0) + 'px');
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-right',  (c.right  || 0) + 'px');
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-bottom', (c.bottom || 0) + 'px');
      document.documentElement.style.setProperty('--tg-content-safe-area-inset-left',   (c.left   || 0) + 'px');
    }
  }

  // ── Theme ────────────────────────────────────────────────────────────────────
  const THEME_MAPPINGS = {
    // Available since Bot API 6.0
    bg_color:                '--tg-theme-bg-color',
    text_color:              '--tg-theme-text-color',
    hint_color:              '--tg-theme-hint-color',
    link_color:              '--tg-theme-link-color',
    button_color:            '--tg-theme-button-color',
    button_text_color:       '--tg-theme-button-text-color',
    secondary_bg_color:      '--tg-theme-secondary-bg-color',
    // Bot API 6.6+
    header_bg_color:              '--tg-theme-header-bg-color',
    accent_text_color:            '--tg-theme-accent-text-color',
    section_bg_color:             '--tg-theme-section-bg-color',
    section_header_text_color:    '--tg-theme-section-header-text-color',
    subtitle_text_color:          '--tg-theme-subtitle-text-color',
    destructive_text_color:       '--tg-theme-destructive-text-color',
    // Bot API 7.10+
    bottom_bar_bg_color:          '--tg-theme-bottom-bar-bg-color',
    section_separator_color:      '--tg-theme-section-separator-color'
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
      '--tg-theme-bg-color':               '#ffffff',
      '--tg-theme-text-color':             '#000000',
      '--tg-theme-hint-color':             '#999999',
      '--tg-theme-link-color':             '#0088CC',
      '--tg-theme-button-color':           '#0088CC',
      '--tg-theme-button-text-color':      '#ffffff',
      '--tg-theme-secondary-bg-color':     '#f0f0f0',
      '--tg-theme-header-bg-color':        '#0088CC',
      '--tg-theme-accent-text-color':      '#0088CC',
      '--tg-theme-section-bg-color':       '#ffffff',
      '--tg-theme-subtitle-text-color':    '#999999',
      '--tg-theme-destructive-text-color': '#ef233c',
      '--tg-theme-bottom-bar-bg-color':    '#ffffff',
      '--tg-viewport-height':              window.innerHeight + 'px',
      '--tg-safe-area-inset-top':          '0px',
      '--tg-safe-area-inset-right':        '0px',
      '--tg-safe-area-inset-bottom':       '0px',
      '--tg-safe-area-inset-left':         '0px',
      '--tg-content-safe-area-inset-top':    '0px',
      '--tg-content-safe-area-inset-right':  '0px',
      '--tg-content-safe-area-inset-bottom': '0px',
      '--tg-content-safe-area-inset-left':   '0px'
    };
    Object.entries(defaults).forEach(([cssVar, value]) => {
      document.documentElement.style.setProperty(cssVar, value);
    });
    document.documentElement.setAttribute('data-theme', 'light');
  }

  // ── Event listeners ──────────────────────────────────────────────────────────
  function setupEventListeners() {
    const app = tg();
    if (!app) return;

    // ── Always-available events (Bot API 6.0+) ─────────────────────────────────
    app.onEvent('themeChanged', () => {
      applyTelegramTheme();
      window.dispatchEvent(new CustomEvent('tg:themeChanged', {
        detail: { theme: state.theme }
      }));
    });

    app.onEvent('viewportChanged', (event) => {
      applyViewportHeight();
      window.dispatchEvent(new CustomEvent('tg:viewportChanged', { detail: event }));
    });

    app.onEvent('mainButtonClicked', () => {
      window.dispatchEvent(new CustomEvent('tg:mainButtonClicked'));
    });

    app.onEvent('backButtonClicked', () => {
      window.dispatchEvent(new CustomEvent('tg:backButtonClicked'));
    });

    // ── Bot API 6.1+ ───────────────────────────────────────────────────────────
    if (versionAtLeast('6.1')) {
      app.onEvent('invoiceClosed', (event) => {
        window.dispatchEvent(new CustomEvent('tg:invoiceClosed', { detail: event }));
      });
    }

    // ── Bot API 7.0+ ───────────────────────────────────────────────────────────
    if (versionAtLeast('7.0')) {
      app.onEvent('settingsButtonClicked', () => {
        window.dispatchEvent(new CustomEvent('tg:settingsButtonClicked'));
      });
    }

    // ── Bot API 7.10+ ──────────────────────────────────────────────────────────
    if (versionAtLeast('7.10')) {
      app.onEvent('secondaryButtonClicked', () => {
        window.dispatchEvent(new CustomEvent('tg:secondaryButtonClicked'));
      });
    }

    // ── Bot API 8.0+ ───────────────────────────────────────────────────────────
    if (versionAtLeast('8.0')) {
      app.onEvent('fullscreenChanged', () => {
        state.isFullscreen = app.isFullscreen || false;
        applyViewportHeight();
        window.dispatchEvent(new CustomEvent('tg:fullscreenChanged', {
          detail: { isFullscreen: state.isFullscreen }
        }));
      });

      app.onEvent('fullscreenFailed', (event) => {
        window.dispatchEvent(new CustomEvent('tg:fullscreenFailed', { detail: event }));
      });

      app.onEvent('homeScreenAdded', () => {
        window.dispatchEvent(new CustomEvent('tg:homeScreenAdded'));
      });

      app.onEvent('homeScreenChecked', (event) => {
        window.dispatchEvent(new CustomEvent('tg:homeScreenChecked', { detail: event }));
      });

      app.onEvent('emojiStatusSet', (event) => {
        window.dispatchEvent(new CustomEvent('tg:emojiStatusSet', { detail: event }));
      });

      app.onEvent('emojiStatusFailed', (event) => {
        window.dispatchEvent(new CustomEvent('tg:emojiStatusFailed', { detail: event }));
      });

      app.onEvent('emojiStatusAccessRequested', (event) => {
        window.dispatchEvent(new CustomEvent('tg:emojiStatusAccessRequested', { detail: event }));
      });

      app.onEvent('fileDownloadRequested', (event) => {
        window.dispatchEvent(new CustomEvent('tg:fileDownloadRequested', { detail: event }));
      });

      app.onEvent('messageSent', (event) => {
        window.dispatchEvent(new CustomEvent('tg:messageSent', { detail: event }));
      });

      app.onEvent('shareMessageSent', (event) => {
        window.dispatchEvent(new CustomEvent('tg:shareMessageSent', { detail: event }));
      });

      app.onEvent('shareMessageFailed', (event) => {
        window.dispatchEvent(new CustomEvent('tg:shareMessageFailed', { detail: event }));
      });

      app.onEvent('activated', () => {
        state.isActive = true;
        window.dispatchEvent(new CustomEvent('tg:activated'));
      });

      app.onEvent('deactivated', () => {
        state.isActive = false;
        window.dispatchEvent(new CustomEvent('tg:deactivated'));
      });

      app.onEvent('safeAreaChanged', () => {
        applyViewportHeight();
        window.dispatchEvent(new CustomEvent('tg:safeAreaChanged'));
      });

      app.onEvent('contentSafeAreaChanged', () => {
        applyViewportHeight();
        window.dispatchEvent(new CustomEvent('tg:contentSafeAreaChanged'));
      });

      // Device sensors
      app.onEvent('accelerometerChanged', (event) => {
        window.dispatchEvent(new CustomEvent('tg:accelerometerChanged', { detail: event }));
      });

      app.onEvent('accelerometerFailed', (event) => {
        window.dispatchEvent(new CustomEvent('tg:accelerometerFailed', { detail: event }));
      });

      app.onEvent('deviceOrientationChanged', (event) => {
        window.dispatchEvent(new CustomEvent('tg:deviceOrientationChanged', { detail: event }));
      });

      app.onEvent('deviceOrientationFailed', (event) => {
        window.dispatchEvent(new CustomEvent('tg:deviceOrientationFailed', { detail: event }));
      });

      app.onEvent('gyroscopeChanged', (event) => {
        window.dispatchEvent(new CustomEvent('tg:gyroscopeChanged', { detail: event }));
      });

      app.onEvent('gyroscopeFailed', (event) => {
        window.dispatchEvent(new CustomEvent('tg:gyroscopeFailed', { detail: event }));
      });

      app.onEvent('locationManagerUpdated', (event) => {
        window.dispatchEvent(new CustomEvent('tg:locationManagerUpdated', { detail: event }));
      });

      app.onEvent('locationRequested', (event) => {
        window.dispatchEvent(new CustomEvent('tg:locationRequested', { detail: event }));
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
    state.initData   = app.initData  || null;
    state.user       = app.initDataUnsafe?.user || null;
    state.startParam = app.initDataUnsafe?.start_param || null;
    state.platform   = app.platform  || 'unknown';
    state.version    = app.version   || '0.0';

    // 4. Bot API 8.0: capture active/fullscreen state
    if (versionAtLeast('8.0')) {
      state.isActive     = app.isActive     !== undefined ? app.isActive     : true;
      state.isFullscreen = app.isFullscreen !== undefined ? app.isFullscreen : false;
    }

    // 5. Apply theme & viewport
    applyTelegramTheme();
    applyViewportHeight();

    // 6. Set up event listeners
    setupEventListeners();

    // 7. Enable closing confirmation for production safety
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
    state.isActive    = true;
    state.user = {
      id:            0,
      first_name:    'Demo',
      last_name:     'User',
      username:      'demo',
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

  // ── MainButton / BottomButton (Bot API 7.10 renamed to BottomButton) ─────────
  function showMainButton(text, callback, options) {
    const app = tg();
    if (!app) return;
    const btn = app.MainButton;
    btn.setText(text);
    // Bot API 9.5: iconCustomEmojiId on BottomButton
    if (options?.iconCustomEmojiId && versionAtLeast('9.5') && typeof btn.setParams === 'function') {
      btn.setParams({ icon_custom_emoji_id: options.iconCustomEmojiId });
    }
    btn.show();
    if (callback) btn.onClick(callback);
  }

  function hideMainButton() {
    tg()?.MainButton.hide();
  }

  // ── SecondaryButton (Bot API 7.10+) ─────────────────────────────────────────
  function showSecondaryButton(text, callback, options) {
    const app = tg();
    if (!app || !versionAtLeast('7.10')) return;
    const btn = app.SecondaryButton;
    if (!btn) return;
    btn.setText(text);
    if (options?.position && typeof btn.setParams === 'function') {
      btn.setParams({ position: options.position });
    }
    // Bot API 9.5: iconCustomEmojiId
    if (options?.iconCustomEmojiId && versionAtLeast('9.5') && typeof btn.setParams === 'function') {
      btn.setParams({ icon_custom_emoji_id: options.iconCustomEmojiId });
    }
    btn.show();
    if (callback) btn.onClick(callback);
  }

  function hideSecondaryButton() {
    const app = tg();
    if (app && versionAtLeast('7.10')) app.SecondaryButton?.hide();
  }

  // ── BackButton ────────────────────────────────────────────────────────────────
  function showBackButton(callback) {
    const app = tg();
    if (!app) return;
    app.BackButton.show();
    if (callback) app.BackButton.onClick(callback);
  }

  function hideBackButton() {
    tg()?.BackButton.hide();
  }

  // ── Bottom bar color (Bot API 7.10+) ─────────────────────────────────────────
  function setBottomBarColor(color) {
    const app = tg();
    if (app && versionAtLeast('7.10') && typeof app.setBottomBarColor === 'function') {
      app.setBottomBarColor(color);
    }
  }

  // ── Dialogs ──────────────────────────────────────────────────────────────────
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

  // ── Contact & input ──────────────────────────────────────────────────────────
  function requestContact(callback) {
    const app = tg();
    if (app && versionAtLeast('6.9') && typeof app.requestContact === 'function') {
      app.requestContact(callback);
    } else {
      if (callback) callback({ status: 'cancelled' });
    }
  }

  // Bot API 9.1: hide the on-screen keyboard
  function hideKeyboard() {
    const app = tg();
    if (app && versionAtLeast('9.1') && typeof app.hideKeyboard === 'function') {
      app.hideKeyboard();
    }
  }

  // ── Navigation / links ───────────────────────────────────────────────────────
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

  // ── Full-screen (Bot API 8.0+) ───────────────────────────────────────────────
  function requestFullscreen() {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.requestFullscreen === 'function') {
      app.requestFullscreen();
    }
  }

  function exitFullscreen() {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.exitFullscreen === 'function') {
      app.exitFullscreen();
    }
  }

  // ── Home-screen shortcuts (Bot API 8.0+) ─────────────────────────────────────
  function addToHomeScreen() {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.addToHomeScreen === 'function') {
      app.addToHomeScreen();
    }
  }

  function checkHomeScreenStatus(callback) {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.checkHomeScreenStatus === 'function') {
      app.checkHomeScreenStatus(callback);
    } else {
      if (callback) callback('unsupported');
    }
  }

  // ── Emoji status (Bot API 8.0+) ──────────────────────────────────────────────
  function setEmojiStatus(customEmojiId, params, callback) {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.setEmojiStatus === 'function') {
      app.setEmojiStatus(customEmojiId, params || {}, callback);
    }
  }

  function requestEmojiStatusAccess(callback) {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.requestEmojiStatusAccess === 'function') {
      app.requestEmojiStatusAccess(callback);
    } else {
      if (callback) callback({ status: 'cancelled' });
    }
  }

  // ── File sharing (Bot API 8.0+) ──────────────────────────────────────────────
  function shareMessage(msgId, callback) {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.shareMessage === 'function') {
      app.shareMessage(msgId, callback);
    }
  }

  function downloadFile(params, callback) {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.downloadFile === 'function') {
      app.downloadFile(params, callback);
    }
  }

  // ── Orientation lock (Bot API 8.0+) ──────────────────────────────────────────
  function lockOrientation() {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.lockOrientation === 'function') {
      app.lockOrientation();
    }
  }

  function unlockOrientation() {
    const app = tg();
    if (app && versionAtLeast('8.0') && typeof app.unlockOrientation === 'function') {
      app.unlockOrientation();
    }
  }

  // ── Device sensors (Bot API 8.0+) ────────────────────────────────────────────
  const accelerometer = {
    start(params, callback) {
      const app = tg();
      if (app && versionAtLeast('8.0')) app.Accelerometer?.start(params || {}, callback);
    },
    stop(callback) {
      const app = tg();
      if (app && versionAtLeast('8.0')) app.Accelerometer?.stop(callback);
    },
    get x()         { return tg()?.Accelerometer?.x         || 0; },
    get y()         { return tg()?.Accelerometer?.y         || 0; },
    get z()         { return tg()?.Accelerometer?.z         || 0; },
    get isStarted() { return tg()?.Accelerometer?.isStarted || false; }
  };

  const deviceOrientation = {
    start(params, callback) {
      const app = tg();
      if (app && versionAtLeast('8.0')) app.DeviceOrientation?.start(params || {}, callback);
    },
    stop(callback) {
      const app = tg();
      if (app && versionAtLeast('8.0')) app.DeviceOrientation?.stop(callback);
    },
    get alpha()     { return tg()?.DeviceOrientation?.alpha     || 0; },
    get beta()      { return tg()?.DeviceOrientation?.beta      || 0; },
    get gamma()     { return tg()?.DeviceOrientation?.gamma     || 0; },
    get isStarted() { return tg()?.DeviceOrientation?.isStarted || false; }
  };

  const gyroscope = {
    start(params, callback) {
      const app = tg();
      if (app && versionAtLeast('8.0')) app.Gyroscope?.start(params || {}, callback);
    },
    stop(callback) {
      const app = tg();
      if (app && versionAtLeast('8.0')) app.Gyroscope?.stop(callback);
    },
    get x()         { return tg()?.Gyroscope?.x         || 0; },
    get y()         { return tg()?.Gyroscope?.y         || 0; },
    get z()         { return tg()?.Gyroscope?.z         || 0; },
    get isStarted() { return tg()?.Gyroscope?.isStarted || false; }
  };

  // ── Location (Bot API 8.0+) ──────────────────────────────────────────────────
  const location = {
    init(callback) {
      const app = tg();
      if (app && versionAtLeast('8.0')) app.LocationManager?.init(callback);
      else if (callback) callback();
    },
    getLocation(callback) {
      const app = tg();
      if (app && versionAtLeast('8.0') && app.LocationManager?.isInited) {
        app.LocationManager.getLocation(callback);
      } else {
        if (callback) callback(null);
      }
    },
    openSettings() {
      const app = tg();
      if (app && versionAtLeast('8.0')) app.LocationManager?.openSettings();
    },
    get isInited()           { return tg()?.LocationManager?.isInited           || false; },
    get isLocationAvailable(){ return tg()?.LocationManager?.isLocationAvailable || false; },
    get isAccessRequested()  { return tg()?.LocationManager?.isAccessRequested   || false; },
    get isAccessGranted()    { return tg()?.LocationManager?.isAccessGranted     || false; }
  };

  // ── Storage (Bot API 9.0+) ───────────────────────────────────────────────────
  // DeviceStorage — persistent local storage (up to 5 MB per user)
  const deviceStorage = {
    setItem(key, value, callback) {
      const app = tg();
      if (app && versionAtLeast('9.0') && app.DeviceStorage) {
        app.DeviceStorage.setItem(key, value, callback);
      } else {
        try { localStorage.setItem(key, value); } catch (_) {}
        if (callback) callback(null, true);
      }
    },
    getItem(key, callback) {
      const app = tg();
      if (app && versionAtLeast('9.0') && app.DeviceStorage) {
        app.DeviceStorage.getItem(key, callback);
      } else {
        const value = localStorage.getItem(key);
        if (callback) callback(null, value);
      }
    },
    removeItem(key, callback) {
      const app = tg();
      if (app && versionAtLeast('9.0') && app.DeviceStorage) {
        app.DeviceStorage.removeItem(key, callback);
      } else {
        localStorage.removeItem(key);
        if (callback) callback(null, true);
      }
    },
    clear(callback) {
      const app = tg();
      if (app && versionAtLeast('9.0') && app.DeviceStorage) {
        app.DeviceStorage.clear(callback);
      } else {
        localStorage.clear();
        if (callback) callback(null, true);
      }
    }
  };

  // SecureStorage — encrypted storage via system Keychain / Keystore
  const secureStorage = {
    setItem(key, value, callback) {
      const app = tg();
      if (app && versionAtLeast('9.0') && app.SecureStorage) {
        app.SecureStorage.setItem(key, value, callback);
      } else {
        if (callback) callback({ type: 'UNSUPPORTED' }, null);
      }
    },
    getItem(key, callback) {
      const app = tg();
      if (app && versionAtLeast('9.0') && app.SecureStorage) {
        app.SecureStorage.getItem(key, callback);
      } else {
        if (callback) callback({ type: 'UNSUPPORTED' }, null);
      }
    },
    restoreItem(key, callback) {
      const app = tg();
      if (app && versionAtLeast('9.0') && app.SecureStorage) {
        app.SecureStorage.restoreItem(key, callback);
      } else {
        if (callback) callback({ type: 'UNSUPPORTED' }, null);
      }
    },
    removeItem(key, callback) {
      const app = tg();
      if (app && versionAtLeast('9.0') && app.SecureStorage) {
        app.SecureStorage.removeItem(key, callback);
      } else {
        if (callback) callback({ type: 'UNSUPPORTED' }, null);
      }
    },
    clear(callback) {
      const app = tg();
      if (app && versionAtLeast('9.0') && app.SecureStorage) {
        app.SecureStorage.clear(callback);
      } else {
        if (callback) callback({ type: 'UNSUPPORTED' }, null);
      }
    }
  };

  // ── Haptic feedback ───────────────────────────────────────────────────────────
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
    // Core
    init,
    getUser,
    getInitData,
    getStartParam,
    isInTelegram,
    versionAtLeast,

    // Buttons
    showMainButton,
    hideMainButton,
    showSecondaryButton,      // Bot API 7.10+
    hideSecondaryButton,      // Bot API 7.10+
    showBackButton,
    hideBackButton,
    setBottomBarColor,        // Bot API 7.10+

    // Dialogs
    showAlert,
    showConfirm,
    showPopup,                // Bot API 6.2+
    requestContact,           // Bot API 6.9+
    hideKeyboard,             // Bot API 9.1+

    // Navigation
    openLink,
    openTelegramLink,
    switchInlineQuery,        // Bot API 6.1+
    close,
    sendData,

    // Full-screen (Bot API 8.0+)
    requestFullscreen,
    exitFullscreen,

    // Home screen (Bot API 8.0+)
    addToHomeScreen,
    checkHomeScreenStatus,

    // Emoji status (Bot API 8.0+)
    setEmojiStatus,
    requestEmojiStatusAccess,

    // File / message sharing (Bot API 8.0+)
    shareMessage,
    downloadFile,

    // Orientation (Bot API 8.0+)
    lockOrientation,
    unlockOrientation,

    // Device sensors (Bot API 8.0+)
    accelerometer,
    deviceOrientation,
    gyroscope,

    // Location (Bot API 8.0+)
    location,

    // Storage (Bot API 9.0+)
    deviceStorage,
    secureStorage,

    // Haptic
    haptic,

    // API helper
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
