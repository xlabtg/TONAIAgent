/**
 * TONAIAgent - Production Telegram Mini App
 *
 * Transforms the existing static demo interface into a production-ready
 * Telegram WebApp with cross-device UI, TON wallet integration, Demo/Live
 * mode, internationalization (EN + RU), portfolio dashboard, and on-chain
 * trading via DeDust, STON.fi, and TONCO.
 *
 * Architecture:
 * ```
 *   Telegram WebApp (initDataUnsafe)
 *           ↓
 *   TelegramContextManager   ← safe-area, theme, referral
 *           ↓
 *   ProductionMiniApp        ← this module
 *     ├── I18nManager        ← EN / RU auto-detect + manual switch
 *     ├── WalletManager      ← TON Connect (Tonkeeper, OpenMask, …)
 *     ├── PortfolioManager   ← dashboard snapshot + asset icons
 *     ├── TradingManager     ← DeDust / STON.fi / TONCO swaps
 *     └── SettingsManager    ← mode, language, AI keys (persisted)
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createProductionMiniApp } from '@tonaiagent/core/production-miniapp';
 *
 * const app = createProductionMiniApp({
 *   defaultLanguage: 'en',
 *   defaultMode: 'demo',
 *   tokenIconBasePath: '/assets/tokens',
 *   supportedWallets: ['tonkeeper', 'openmask', 'mytonwallet', 'tonspace'],
 *   defaultAISettings: { provider: 'groq', model: 'llama3-8b-8192' },
 * });
 *
 * // Initialize with the Telegram WebApp global (or a mock)
 * const ctx = app.initializeTelegram(window.Telegram.WebApp);
 *
 * // Translate UI strings
 * console.log(app.i18n.t('nav.portfolio')); // "Portfolio"
 *
 * // Connect a wallet (demo or live)
 * const wallet = await app.wallet.connect('tonkeeper');
 *
 * // Refresh portfolio dashboard
 * const snapshot = await app.portfolio.refresh(ctx.user?.id?.toString() ?? 'demo');
 *
 * // Execute a swap
 * const result = await app.trading.swap({
 *   tokenIn: 'USDT',
 *   tokenOut: 'TON',
 *   amountIn: 100,
 *   slippageTolerance: 0.5,
 * });
 * ```
 *
 * @see Issue #239 — Production Telegram Mini App (Cross-Device UI, Wallet, Demo/Live Mode)
 */

// ============================================================================
// Types (re-exported)
// ============================================================================

export type {
  SupportedLanguage,
  TranslationMap,
  I18nBundle,
  SafeAreaInsets,
  TelegramUser,
  TelegramInitData,
  TelegramThemeParams,
  TelegramContext,
  AppMode,
  WalletProvider,
  WalletConnectionStatus,
  WalletState,
  AIProvider,
  AISettings,
  TokenSymbol,
  AssetPosition,
  OpenPosition,
  PortfolioSnapshot,
  DexId,
  SwapRequest,
  SwapResult,
  UserSettings,
  ScreenId,
  MiniAppState,
  MiniAppEventType,
  MiniAppEvent,
  MiniAppEventCallback,
  ProductionMiniAppErrorCode,
  ProductionMiniAppConfig,
} from './types';

export {
  DEFAULT_PRODUCTION_MINIAPP_CONFIG,
  ProductionMiniAppError,
} from './types';

// ============================================================================
// I18n
// ============================================================================

export {
  I18nManager,
  createI18nManager,
  type I18nManagerConfig,
} from './i18n';

// ============================================================================
// Telegram Context
// ============================================================================

export {
  TelegramContextManager,
  createTelegramContextManager,
  parseReferralCode,
  parseSafeArea,
  applyThemeVars,
  type TelegramWebAppLike,
  type TelegramContextManagerConfig,
} from './telegram-context';

// ============================================================================
// Wallet
// ============================================================================

export {
  WalletManager,
  createWalletManager,
  formatAddress,
  WALLET_PROVIDERS,
  type WalletManagerConfig,
  type WalletProviderInfo,
} from './wallet-manager';

// ============================================================================
// Portfolio
// ============================================================================

export {
  PortfolioManager,
  DemoPortfolioFetcher,
  createPortfolioManager,
  buildIconPath,
  type PortfolioManagerConfig,
  type PortfolioFetcher,
} from './portfolio-manager';

// ============================================================================
// Trading
// ============================================================================

export {
  TradingManager,
  DemoSwapExecutor,
  createTradingManager,
  selectDex,
  type TradingManagerConfig,
  type SwapExecutor,
} from './trading-manager';

// ============================================================================
// Settings
// ============================================================================

export {
  SettingsManager,
  createSettingsManager,
  MemorySettingsStorage,
  LocalSettingsStorage,
  type SettingsManagerConfig,
  type SettingsStorage,
} from './settings-manager';

// ============================================================================
// ProductionMiniApp — Unified Entry Point
// ============================================================================

import { ProductionMiniAppConfig, DEFAULT_PRODUCTION_MINIAPP_CONFIG, MiniAppEventCallback, MiniAppEvent, TelegramContext, AppMode, SupportedLanguage } from './types';
import { I18nManager } from './i18n';
import { TelegramContextManager, TelegramWebAppLike } from './telegram-context';
import { WalletManager } from './wallet-manager';
import { PortfolioManager } from './portfolio-manager';
import { TradingManager } from './trading-manager';
import { SettingsManager, MemorySettingsStorage } from './settings-manager';

export interface ProductionMiniAppService {
  readonly i18n: I18nManager;
  readonly telegram: TelegramContextManager;
  readonly wallet: WalletManager;
  readonly portfolio: PortfolioManager;
  readonly trading: TradingManager;
  readonly settings: SettingsManager;

  initializeTelegram(webApp: TelegramWebAppLike): TelegramContext;
  switchMode(mode: AppMode): void;
  switchLanguage(language: SupportedLanguage): void;
  onEvent(callback: MiniAppEventCallback): void;
  getConfig(): ProductionMiniAppConfig;
}

export class DefaultProductionMiniApp implements ProductionMiniAppService {
  readonly i18n: I18nManager;
  readonly telegram: TelegramContextManager;
  readonly wallet: WalletManager;
  readonly portfolio: PortfolioManager;
  readonly trading: TradingManager;
  readonly settings: SettingsManager;

  private readonly config: ProductionMiniAppConfig;
  private readonly eventCallbacks: MiniAppEventCallback[] = [];

  constructor(config: Partial<ProductionMiniAppConfig> = {}) {
    this.config = { ...DEFAULT_PRODUCTION_MINIAPP_CONFIG, ...config };

    // Settings (provides mode & language state)
    this.settings = new SettingsManager({
      storage: new MemorySettingsStorage(),
      defaults: {
        mode: this.config.defaultMode,
        language: this.config.defaultLanguage,
        aiSettings: this.config.defaultAISettings,
      },
    });

    // I18n
    this.i18n = new I18nManager({
      defaultLanguage: this.config.defaultLanguage,
    });

    // Telegram context
    this.telegram = new TelegramContextManager({
      onViewportChanged: () => { /* could trigger re-render */ },
    });

    // Wallet
    this.wallet = new WalletManager({
      mode: this.settings.getMode(),
      supportedWallets: this.config.supportedWallets,
    });

    // Portfolio
    this.portfolio = new PortfolioManager({
      mode: this.settings.getMode(),
      tokenIconBasePath: this.config.tokenIconBasePath,
    });

    // Trading
    this.trading = new TradingManager({
      mode: this.settings.getMode(),
    });

    // Forward sub-manager events upward
    this.wallet.onEvent((e) => this.forwardEvent(e));
    this.settings.onEvent((e) => this.forwardEvent(e));
    this.trading.onEvent((e) => this.forwardEvent(e));
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  initializeTelegram(webApp: TelegramWebAppLike): TelegramContext {
    const ctx = this.telegram.initialize(webApp);

    // Auto-detect language from Telegram profile
    const detectedLang = this.i18n.detectLanguage(ctx.user?.language_code);
    this.i18n.setLanguage(detectedLang);
    this.settings.setLanguage(detectedLang);

    // Propagate referral code
    if (ctx.referralCode) {
      this.settings.setReferralCode(ctx.referralCode);
    }

    return ctx;
  }

  // --------------------------------------------------------------------------
  // Mode & Language switching
  // --------------------------------------------------------------------------

  switchMode(mode: AppMode): void {
    this.settings.setMode(mode);
  }

  switchLanguage(language: SupportedLanguage): void {
    this.i18n.setLanguage(language);
    this.settings.setLanguage(language);
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: MiniAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private forwardEvent(event: MiniAppEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }

  // --------------------------------------------------------------------------
  // Config
  // --------------------------------------------------------------------------

  getConfig(): ProductionMiniAppConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createProductionMiniApp(
  config?: Partial<ProductionMiniAppConfig>
): DefaultProductionMiniApp {
  return new DefaultProductionMiniApp(config);
}

// Default export
export default DefaultProductionMiniApp;
