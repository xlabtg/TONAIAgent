/**
 * TONAIAgent - Production Telegram Mini App Tests
 *
 * Comprehensive tests covering:
 * - I18nManager (language detection, translation, switching)
 * - TelegramContextManager (init, safe-area, referral, theme)
 * - WalletManager (demo/live connect, state, providers)
 * - PortfolioManager (snapshot, formatting, sorting)
 * - TradingManager (demo swaps, DEX selection, history)
 * - SettingsManager (persistence, mode/language events)
 * - ProductionMiniApp (unified entry point, event forwarding)
 *
 * @see Issue #239 — Production Telegram Mini App (Cross-Device UI, Wallet, Demo/Live Mode)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  // I18n
  I18nManager,
  createI18nManager,
  // Telegram
  TelegramContextManager,
  createTelegramContextManager,
  parseReferralCode,
  parseSafeArea,
  // Wallet
  WalletManager,
  createWalletManager,
  formatAddress,
  WALLET_PROVIDERS,
  // Portfolio
  PortfolioManager,
  createPortfolioManager,
  buildIconPath,
  DemoPortfolioFetcher,
  // Trading
  TradingManager,
  createTradingManager,
  selectDex,
  DemoSwapExecutor,
  // Settings
  SettingsManager,
  createSettingsManager,
  MemorySettingsStorage,
  // Unified
  createProductionMiniApp,
  // Error
  ProductionMiniAppError,
  DEFAULT_PRODUCTION_MINIAPP_CONFIG,
  // Types
  type TelegramWebAppLike,
  type SwapRequest,
  type WalletProvider,
  type DexId,
} from '../../extended/production-miniapp/index';

// ============================================================================
// Test Fixtures
// ============================================================================

function makeMockWebApp(overrides: Partial<TelegramWebAppLike> = {}): TelegramWebAppLike {
  return {
    initDataUnsafe: {
      user: {
        id: 123456,
        first_name: 'Alice',
        language_code: 'ru',
      },
      start_param: 'ref_FRIEND42',
    },
    themeParams: {
      bg_color: '#1c1c1e',
      text_color: '#ffffff',
      button_color: '#0088cc',
      button_text_color: '#ffffff',
    },
    colorScheme: 'dark',
    viewportHeight: 640,
    isExpanded: true,
    safeAreaInset: { top: 44, bottom: 34, left: 0, right: 0 },
    expand: vi.fn(),
    onEvent: vi.fn(),
    ...overrides,
  };
}

function makeSwapRequest(overrides: Partial<SwapRequest> = {}): SwapRequest {
  return {
    tokenIn: 'USDT',
    tokenOut: 'TON',
    amountIn: 100,
    slippageTolerance: 0.5,
    ...overrides,
  };
}

// ============================================================================
// I18nManager Tests
// ============================================================================

describe('I18nManager', () => {
  describe('language detection', () => {
    it('detects Russian from Telegram language code', () => {
      const i18n = createI18nManager({ defaultLanguage: 'en' });
      expect(i18n.detectLanguage('ru')).toBe('ru');
    });

    it('detects English from Telegram language code', () => {
      const i18n = createI18nManager({ defaultLanguage: 'ru' });
      expect(i18n.detectLanguage('en')).toBe('en');
    });

    it('falls back to default when language code is unsupported', () => {
      const i18n = createI18nManager({ defaultLanguage: 'en' });
      expect(i18n.detectLanguage('zh')).toBe('en');
    });

    it('handles locale variants like "ru-RU"', () => {
      const i18n = createI18nManager({ defaultLanguage: 'en' });
      expect(i18n.detectLanguage('ru-RU')).toBe('ru');
    });

    it('returns default when no code provided', () => {
      const i18n = createI18nManager({ defaultLanguage: 'ru' });
      expect(i18n.detectLanguage(undefined)).toBe('ru');
    });
  });

  describe('translation', () => {
    it('translates nav.portfolio to English', () => {
      const i18n = createI18nManager({ defaultLanguage: 'en' });
      expect(i18n.t('nav.portfolio')).toBe('Portfolio');
    });

    it('translates nav.portfolio to Russian', () => {
      const i18n = createI18nManager({ defaultLanguage: 'ru' });
      expect(i18n.t('nav.portfolio')).toBe('Портфель');
    });

    it('returns key when translation is missing', () => {
      const i18n = createI18nManager({ defaultLanguage: 'en' });
      expect(i18n.t('unknown.key')).toBe('unknown.key');
    });

    it('interpolates template parameters', () => {
      const i18n = createI18nManager({
        defaultLanguage: 'en',
        extraTranslations: {
          en: { 'greeting': 'Hello, {{name}}!' },
        },
      });
      expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });
  });

  describe('language switching', () => {
    it('switches from English to Russian and reflects in translations', () => {
      const i18n = createI18nManager({ defaultLanguage: 'en' });
      expect(i18n.t('nav.agents')).toBe('Agents');
      i18n.setLanguage('ru');
      expect(i18n.t('nav.agents')).toBe('Агенты');
    });

    it('throws for unsupported language', () => {
      const i18n = createI18nManager();
      expect(() => i18n.setLanguage('zh' as 'en')).toThrow(ProductionMiniAppError);
      expect(() => i18n.setLanguage('zh' as 'en')).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_LANGUAGE' })
      );
    });

    it('returns current language after switch', () => {
      const i18n = createI18nManager({ defaultLanguage: 'en' });
      i18n.setLanguage('ru');
      expect(i18n.getLanguage()).toBe('ru');
    });

    it('lists both supported languages', () => {
      const i18n = createI18nManager();
      expect(i18n.getSupportedLanguages()).toEqual(expect.arrayContaining(['en', 'ru']));
    });
  });
});

// ============================================================================
// TelegramContextManager Tests
// ============================================================================

describe('TelegramContextManager', () => {
  describe('initialization', () => {
    it('calls expand() on the WebApp', () => {
      const webApp = makeMockWebApp();
      const mgr = createTelegramContextManager();
      mgr.initialize(webApp);
      expect(webApp.expand).toHaveBeenCalled();
    });

    it('parses user from initDataUnsafe', () => {
      const mgr = createTelegramContextManager();
      const ctx = mgr.initialize(makeMockWebApp());
      expect(ctx.user?.id).toBe(123456);
      expect(ctx.user?.first_name).toBe('Alice');
    });

    it('extracts referral code from start_param', () => {
      const mgr = createTelegramContextManager();
      const ctx = mgr.initialize(makeMockWebApp({ initDataUnsafe: { start_param: 'ref_FRIEND42' } }));
      expect(ctx.referralCode).toBe('FRIEND42');
    });

    it('sets colorScheme to dark', () => {
      const mgr = createTelegramContextManager();
      const ctx = mgr.initialize(makeMockWebApp({ colorScheme: 'dark' }));
      expect(ctx.colorScheme).toBe('dark');
    });

    it('sets colorScheme to light', () => {
      const mgr = createTelegramContextManager();
      const ctx = mgr.initialize(makeMockWebApp({ colorScheme: 'light' }));
      expect(ctx.colorScheme).toBe('light');
    });

    it('reads safe-area insets', () => {
      const mgr = createTelegramContextManager();
      const ctx = mgr.initialize(makeMockWebApp());
      expect(ctx.safeArea.top).toBe(44);
      expect(ctx.safeArea.bottom).toBe(34);
    });

    it('sets isInitialized() to true after init', () => {
      const mgr = createTelegramContextManager();
      expect(mgr.isInitialized()).toBe(false);
      mgr.initialize(makeMockWebApp());
      expect(mgr.isInitialized()).toBe(true);
    });
  });

  describe('getContext', () => {
    it('throws TELEGRAM_INIT_FAILED when not initialized', () => {
      const mgr = createTelegramContextManager();
      expect(() => mgr.getContext()).toThrow(ProductionMiniAppError);
      expect(() => mgr.getContext()).toThrow(
        expect.objectContaining({ code: 'TELEGRAM_INIT_FAILED' })
      );
    });

    it('returns context after initialization', () => {
      const mgr = createTelegramContextManager();
      mgr.initialize(makeMockWebApp());
      expect(mgr.getContext()).toBeDefined();
    });
  });

  describe('parseReferralCode', () => {
    it('strips ref_ prefix', () => {
      expect(parseReferralCode('ref_ABC123')).toBe('ABC123');
    });

    it('returns raw code when no prefix', () => {
      expect(parseReferralCode('PLAIN')).toBe('PLAIN');
    });

    it('returns undefined for empty string', () => {
      expect(parseReferralCode('')).toBeUndefined();
    });
  });

  describe('parseSafeArea', () => {
    it('reads insets from webApp object', () => {
      const webApp = makeMockWebApp();
      const insets = parseSafeArea(webApp);
      expect(insets.top).toBe(44);
      expect(insets.bottom).toBe(34);
      expect(insets.left).toBe(0);
      expect(insets.right).toBe(0);
    });

    it('returns zero insets when safeAreaInset is absent', () => {
      const webApp = makeMockWebApp({ safeAreaInset: undefined });
      const insets = parseSafeArea(webApp);
      expect(insets.top).toBe(0);
      expect(insets.bottom).toBe(0);
    });
  });
});

// ============================================================================
// WalletManager Tests
// ============================================================================

describe('WalletManager', () => {
  describe('demo mode', () => {
    it('connects immediately with a simulated address', async () => {
      const mgr = createWalletManager({ mode: 'demo' });
      const state = await mgr.connect('tonkeeper');
      expect(state.status).toBe('connected');
      expect(state.address).toBeDefined();
      expect(state.provider).toBe('tonkeeper');
    });

    it('sets balanceTon in demo mode', async () => {
      const mgr = createWalletManager({ mode: 'demo' });
      const state = await mgr.connect('tonkeeper');
      expect(state.balanceTon).toBeGreaterThan(0);
    });

    it('formats displayAddress as abbreviated form', async () => {
      const mgr = createWalletManager({ mode: 'demo' });
      const state = await mgr.connect('tonkeeper');
      expect(state.displayAddress).toContain('…');
    });

    it('reports isConnected() as true after connect', async () => {
      const mgr = createWalletManager({ mode: 'demo' });
      await mgr.connect('tonkeeper');
      expect(mgr.isConnected()).toBe(true);
    });

    it('disconnects and reports disconnected state', async () => {
      const mgr = createWalletManager({ mode: 'demo' });
      await mgr.connect('tonkeeper');
      await mgr.disconnect();
      expect(mgr.getState().status).toBe('disconnected');
      expect(mgr.isConnected()).toBe(false);
    });

    it('emits wallet_connected event on connect', async () => {
      const mgr = createWalletManager({ mode: 'demo' });
      const events: string[] = [];
      mgr.onEvent((e) => events.push(e.type));
      await mgr.connect('tonkeeper');
      expect(events).toContain('wallet_connected');
    });

    it('emits wallet_disconnected event on disconnect', async () => {
      const mgr = createWalletManager({ mode: 'demo' });
      const events: string[] = [];
      mgr.onEvent((e) => events.push(e.type));
      await mgr.connect('tonkeeper');
      await mgr.disconnect();
      expect(events).toContain('wallet_disconnected');
    });
  });

  describe('provider info', () => {
    it('returns available providers matching config', () => {
      const mgr = createWalletManager({
        mode: 'demo',
        supportedWallets: ['tonkeeper', 'openmask'],
      });
      const providers = mgr.getAvailableProviders();
      expect(providers).toHaveLength(2);
      expect(providers.map((p) => p.id)).toContain('tonkeeper');
      expect(providers.map((p) => p.id)).toContain('openmask');
    });

    it('all four default providers have name and universalLink', () => {
      const wallets: WalletProvider[] = ['tonkeeper', 'openmask', 'mytonwallet', 'tonspace'];
      for (const id of wallets) {
        const info = WALLET_PROVIDERS[id];
        expect(info.name).toBeTruthy();
        expect(info.universalLink).toContain('http');
      }
    });
  });

  describe('formatAddress', () => {
    it('abbreviates long addresses', () => {
      const addr = 'EQAbcdef1234567890abcdef1234567890DEADBEEF';
      expect(formatAddress(addr)).toContain('…');
      expect(formatAddress(addr).length).toBeLessThan(addr.length);
    });

    it('returns short addresses unchanged', () => {
      expect(formatAddress('EQ12')).toBe('EQ12');
    });
  });
});

// ============================================================================
// PortfolioManager Tests
// ============================================================================

describe('PortfolioManager', () => {
  describe('demo snapshot', () => {
    it('returns a snapshot with positive totalValueUsd', async () => {
      const mgr = createPortfolioManager({
        mode: 'demo',
        tokenIconBasePath: '/assets/tokens',
      });
      const snap = await mgr.refresh('user_1');
      expect(snap.totalValueUsd).toBeGreaterThan(0);
    });

    it('returns at least one asset', async () => {
      const mgr = createPortfolioManager({ mode: 'demo', tokenIconBasePath: '/assets/tokens' });
      const snap = await mgr.refresh('user_1');
      expect(snap.assets.length).toBeGreaterThan(0);
    });

    it('all assets have a non-empty iconPath', async () => {
      const mgr = createPortfolioManager({ mode: 'demo', tokenIconBasePath: '/assets/tokens' });
      const snap = await mgr.refresh('user_1');
      for (const asset of snap.assets) {
        expect(asset.iconPath).toBeTruthy();
        expect(asset.iconPath).toContain('/assets/tokens');
      }
    });

    it('all asset allocationPercent values sum close to 100', async () => {
      const mgr = createPortfolioManager({ mode: 'demo', tokenIconBasePath: '/assets/tokens' });
      const snap = await mgr.refresh('user_1');
      const sum = snap.assets.reduce((s, a) => s + a.allocationPercent, 0);
      expect(sum).toBeGreaterThan(95);
      expect(sum).toBeLessThanOrEqual(101);
    });

    it('stores snapshot and returns it via getSnapshot()', async () => {
      const mgr = createPortfolioManager({ mode: 'demo', tokenIconBasePath: '/assets/tokens' });
      await mgr.refresh('user_1');
      const cached = mgr.getSnapshot();
      expect(cached).toBeDefined();
      expect(cached!.totalValueUsd).toBeGreaterThan(0);
    });

    it('getSnapshot() returns undefined before first refresh', () => {
      const mgr = createPortfolioManager({ mode: 'demo', tokenIconBasePath: '/assets/tokens' });
      expect(mgr.getSnapshot()).toBeUndefined();
    });
  });

  describe('formatting', () => {
    it('formats totalValue as a dollar string', async () => {
      const mgr = createPortfolioManager({ mode: 'demo', tokenIconBasePath: '/assets/tokens' });
      const snap = await mgr.refresh('user_1');
      const formatted = mgr.formatTotalValue(snap);
      expect(formatted).toMatch(/^\$/);
    });

    it('formats dailyPnl with + sign for positive', async () => {
      const mgr = createPortfolioManager({ mode: 'demo', tokenIconBasePath: '/assets/tokens' });
      const snap = await mgr.refresh('user_1');
      const formatted = mgr.formatDailyPnl(snap);
      expect(formatted).toContain('+');
    });
  });

  describe('sortedAssets', () => {
    it('returns assets sorted by valueUsd descending', async () => {
      const mgr = createPortfolioManager({ mode: 'demo', tokenIconBasePath: '/assets/tokens' });
      const snap = await mgr.refresh('user_1');
      const sorted = mgr.sortedAssets(snap);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].valueUsd).toBeGreaterThanOrEqual(sorted[i].valueUsd);
      }
    });
  });

  describe('buildIconPath', () => {
    it('builds correct path for known token', () => {
      expect(buildIconPath('TON', '/assets/tokens')).toBe('/assets/tokens/TON.svg');
      expect(buildIconPath('USDT', '/assets/tokens')).toBe('/assets/tokens/USDT.svg');
    });

    it('builds generic path for unknown token', () => {
      expect(buildIconPath('XYZ', '/assets/tokens')).toBe('/assets/tokens/GENERIC.svg');
    });
  });

  describe('error handling', () => {
    it('throws PORTFOLIO_FETCH_FAILED when fetcher throws', async () => {
      const failingFetcher = {
        fetchSnapshot: async () => { throw new Error('network error'); },
      };
      const mgr = createPortfolioManager({
        mode: 'demo',
        tokenIconBasePath: '/assets/tokens',
        fetcher: failingFetcher,
      });

      await expect(mgr.refresh('user_1')).rejects.toThrow(ProductionMiniAppError);
      await expect(mgr.refresh('user_1')).rejects.toMatchObject({ code: 'PORTFOLIO_FETCH_FAILED' });
    });
  });
});

// ============================================================================
// TradingManager Tests
// ============================================================================

describe('TradingManager', () => {
  describe('demo mode swaps', () => {
    it('executes USDT→TON swap successfully', async () => {
      const mgr = createTradingManager({ mode: 'demo' });
      const result = await mgr.swap(makeSwapRequest());
      expect(result.success).toBe(true);
      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.txHash).toBeDefined();
    });

    it('computes amountOut using exchange rate and slippage', async () => {
      const mgr = createTradingManager({ mode: 'demo' });
      const result = await mgr.swap(makeSwapRequest({ amountIn: 100, slippageTolerance: 0 }));
      // 100 USDT * (1/4.8) ≈ 20.83 TON
      expect(result.amountOut).toBeCloseTo(100 / 4.8, 1);
    });

    it('records swap in history', async () => {
      const mgr = createTradingManager({ mode: 'demo' });
      await mgr.swap(makeSwapRequest());
      expect(mgr.getHistory()).toHaveLength(1);
    });

    it('accumulates multiple swaps in history', async () => {
      const mgr = createTradingManager({ mode: 'demo' });
      await mgr.swap(makeSwapRequest());
      await mgr.swap(makeSwapRequest({ tokenIn: 'TON', tokenOut: 'USDT', amountIn: 10 }));
      expect(mgr.getHistory()).toHaveLength(2);
    });

    it('emits swap_submitted and swap_completed events', async () => {
      const mgr = createTradingManager({ mode: 'demo' });
      const events: string[] = [];
      mgr.onEvent((e) => events.push(e.type));
      await mgr.swap(makeSwapRequest());
      expect(events).toContain('swap_submitted');
      expect(events).toContain('swap_completed');
    });

    it('throws SWAP_FAILED for unsupported pair', async () => {
      const mgr = createTradingManager({ mode: 'demo' });
      await expect(
        mgr.swap(makeSwapRequest({ tokenIn: 'BTC', tokenOut: 'NOT' }))
      ).rejects.toMatchObject({ code: 'SWAP_FAILED' });
    });
  });

  describe('getSupportedPairs', () => {
    it('returns at least one pair', () => {
      const mgr = createTradingManager({ mode: 'demo' });
      expect(mgr.getSupportedPairs().length).toBeGreaterThan(0);
    });
  });

  describe('getEnabledDexes', () => {
    it('defaults to all three DEXs', () => {
      const mgr = createTradingManager({ mode: 'demo' });
      expect(mgr.getEnabledDexes()).toEqual(
        expect.arrayContaining(['dedust', 'stonfi', 'tonco'])
      );
    });

    it('respects custom enabledDexes config', () => {
      const mgr = createTradingManager({ mode: 'demo', enabledDexes: ['stonfi'] });
      expect(mgr.getEnabledDexes()).toEqual(['stonfi']);
    });
  });

  describe('selectDex helper', () => {
    it('prefers stonfi by default priority', () => {
      const dex = selectDex(undefined, ['dedust', 'stonfi', 'tonco']);
      expect(dex).toBe('stonfi');
    });

    it('respects preferred DEX when available', () => {
      const dex = selectDex('tonco', ['dedust', 'stonfi', 'tonco'] as DexId[]);
      expect(dex).toBe('tonco');
    });

    it('falls back to priority when preferred unavailable', () => {
      const dex = selectDex('tonco', ['dedust', 'stonfi'] as DexId[]);
      expect(dex).toBe('stonfi');
    });
  });
});

// ============================================================================
// SettingsManager Tests
// ============================================================================

describe('SettingsManager', () => {
  describe('defaults', () => {
    it('defaults to demo mode', () => {
      const mgr = createSettingsManager();
      expect(mgr.getMode()).toBe('demo');
    });

    it('defaults to English', () => {
      const mgr = createSettingsManager();
      expect(mgr.getLanguage()).toBe('en');
    });

    it('defaults to groq AI provider', () => {
      const mgr = createSettingsManager();
      expect(mgr.getAISettings().provider).toBe('groq');
    });
  });

  describe('mode switching', () => {
    it('switches to live mode and emits event', () => {
      const mgr = createSettingsManager();
      const events: string[] = [];
      mgr.onEvent((e) => events.push(e.type));
      mgr.setMode('live');
      expect(mgr.getMode()).toBe('live');
      expect(events).toContain('mode_changed');
    });

    it('does not emit event when mode unchanged', () => {
      const mgr = createSettingsManager();
      const events: string[] = [];
      mgr.onEvent((e) => events.push(e.type));
      mgr.setMode('demo'); // already demo
      expect(events).toHaveLength(0);
    });
  });

  describe('language switching', () => {
    it('switches language and emits event', () => {
      const mgr = createSettingsManager();
      const events: string[] = [];
      mgr.onEvent((e) => events.push(e.type));
      mgr.setLanguage('ru');
      expect(mgr.getLanguage()).toBe('ru');
      expect(events).toContain('language_changed');
    });
  });

  describe('AI settings', () => {
    it('saves and retrieves AI settings', () => {
      const mgr = createSettingsManager();
      mgr.setAISettings({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4' });
      const ai = mgr.getAISettings();
      expect(ai.provider).toBe('openai');
      expect(ai.apiKey).toBe('sk-test');
    });
  });

  describe('referral code', () => {
    it('saves referral code and emits event', () => {
      const mgr = createSettingsManager();
      const events: string[] = [];
      mgr.onEvent((e) => events.push(e.type));
      mgr.setReferralCode('FRIEND42');
      expect(mgr.getReferralCode()).toBe('FRIEND42');
      expect(events).toContain('referral_detected');
    });
  });

  describe('persistence', () => {
    it('persists settings to MemorySettingsStorage and reloads', () => {
      const storage = new MemorySettingsStorage();
      const mgr1 = createSettingsManager({ storage });
      mgr1.setMode('live');
      mgr1.setLanguage('ru');

      const mgr2 = createSettingsManager({ storage });
      expect(mgr2.getMode()).toBe('live');
      expect(mgr2.getLanguage()).toBe('ru');
    });
  });

  describe('saveAll', () => {
    it('emits settings_saved event', () => {
      const mgr = createSettingsManager();
      const events: string[] = [];
      mgr.onEvent((e) => events.push(e.type));
      mgr.saveAll({ mode: 'live' });
      expect(events).toContain('settings_saved');
    });
  });
});

// ============================================================================
// ProductionMiniApp (Unified) Tests
// ============================================================================

describe('ProductionMiniApp', () => {
  describe('initialization', () => {
    it('creates app with default config', () => {
      const app = createProductionMiniApp();
      expect(app.i18n).toBeDefined();
      expect(app.wallet).toBeDefined();
      expect(app.portfolio).toBeDefined();
      expect(app.trading).toBeDefined();
      expect(app.settings).toBeDefined();
    });

    it('exposes correct default config values', () => {
      const app = createProductionMiniApp();
      const cfg = app.getConfig();
      expect(cfg.defaultMode).toBe(DEFAULT_PRODUCTION_MINIAPP_CONFIG.defaultMode);
      expect(cfg.defaultLanguage).toBe(DEFAULT_PRODUCTION_MINIAPP_CONFIG.defaultLanguage);
      expect(cfg.tokenIconBasePath).toBe(DEFAULT_PRODUCTION_MINIAPP_CONFIG.tokenIconBasePath);
    });
  });

  describe('initializeTelegram', () => {
    it('returns a TelegramContext', () => {
      const app = createProductionMiniApp();
      const ctx = app.initializeTelegram(makeMockWebApp());
      expect(ctx.user?.id).toBe(123456);
      expect(ctx.colorScheme).toBe('dark');
    });

    it('auto-detects Russian from Telegram profile', () => {
      const app = createProductionMiniApp({ defaultLanguage: 'en' });
      app.initializeTelegram(makeMockWebApp());
      // user has language_code: 'ru'
      expect(app.i18n.getLanguage()).toBe('ru');
    });

    it('propagates referral code to settings', () => {
      const app = createProductionMiniApp();
      app.initializeTelegram(makeMockWebApp({ initDataUnsafe: { start_param: 'ref_FRIEND42' } }));
      expect(app.settings.getReferralCode()).toBe('FRIEND42');
    });
  });

  describe('switchMode', () => {
    it('updates settings mode', () => {
      const app = createProductionMiniApp();
      app.switchMode('live');
      expect(app.settings.getMode()).toBe('live');
    });
  });

  describe('switchLanguage', () => {
    it('updates both i18n and settings language', () => {
      const app = createProductionMiniApp({ defaultLanguage: 'en' });
      app.switchLanguage('ru');
      expect(app.i18n.getLanguage()).toBe('ru');
      expect(app.settings.getLanguage()).toBe('ru');
    });
  });

  describe('event forwarding', () => {
    it('forwards wallet events through the unified app', async () => {
      const app = createProductionMiniApp();
      const events: string[] = [];
      app.onEvent((e) => events.push(e.type));
      await app.wallet.connect('tonkeeper');
      expect(events).toContain('wallet_connected');
    });

    it('forwards settings events through the unified app', () => {
      const app = createProductionMiniApp();
      const events: string[] = [];
      app.onEvent((e) => events.push(e.type));
      app.settings.setMode('live');
      expect(events).toContain('mode_changed');
    });

    it('forwards trading events through the unified app', async () => {
      const app = createProductionMiniApp();
      const events: string[] = [];
      app.onEvent((e) => events.push(e.type));
      await app.trading.swap(makeSwapRequest());
      expect(events).toContain('swap_completed');
    });
  });

  describe('end-to-end demo flow', () => {
    it('completes full demo: init → connect wallet → refresh portfolio → swap', async () => {
      const app = createProductionMiniApp({ defaultMode: 'demo' });

      // 1. Initialize Telegram context
      const ctx = app.initializeTelegram(makeMockWebApp());
      expect(ctx.user?.id).toBe(123456);

      // 2. Connect wallet in demo mode
      const wallet = await app.wallet.connect('tonkeeper');
      expect(wallet.status).toBe('connected');

      // 3. Refresh portfolio
      const userId = ctx.user?.id?.toString() ?? 'demo';
      const snapshot = await app.portfolio.refresh(userId);
      expect(snapshot.totalValueUsd).toBeGreaterThan(0);

      // 4. Execute a swap
      const result = await app.trading.swap(makeSwapRequest());
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// ProductionMiniAppError Tests
// ============================================================================

describe('ProductionMiniAppError', () => {
  it('creates error with correct properties', () => {
    const err = new ProductionMiniAppError(
      'Wallet failed',
      'WALLET_CONNECT_FAILED',
      { provider: 'tonkeeper' }
    );
    expect(err.message).toBe('Wallet failed');
    expect(err.code).toBe('WALLET_CONNECT_FAILED');
    expect(err.metadata).toEqual({ provider: 'tonkeeper' });
    expect(err.name).toBe('ProductionMiniAppError');
  });

  it('is an instance of Error', () => {
    const err = new ProductionMiniAppError('test', 'SWAP_FAILED');
    expect(err instanceof Error).toBe(true);
  });
});
