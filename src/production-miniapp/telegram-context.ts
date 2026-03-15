/**
 * Telegram WebApp context manager.
 *
 * Parses initDataUnsafe, detects safe-area insets, colour scheme, viewport
 * size, and referral code from the start_param deep-link parameter.
 */

import {
  TelegramContext,
  TelegramInitData,
  TelegramThemeParams,
  SafeAreaInsets,
  ProductionMiniAppError,
} from './types';

// ============================================================================
// TelegramContextManager
// ============================================================================

export interface TelegramContextManagerConfig {
  /** Called when viewport changes (resize / expand) */
  onViewportChanged?: (ctx: TelegramContext) => void;
}

export class TelegramContextManager {
  private context?: TelegramContext;
  private readonly config: TelegramContextManagerConfig;

  constructor(config: TelegramContextManagerConfig = {}) {
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // Initialisation
  // --------------------------------------------------------------------------

  /**
   * Parse the raw Telegram WebApp object (window.Telegram?.WebApp) and build
   * a typed TelegramContext.  Accepts a plain object so unit tests can pass a
   * mock without needing a real Telegram environment.
   */
  initialize(webApp: TelegramWebAppLike): TelegramContext {
    // Expand to full screen
    if (typeof webApp.expand === 'function') {
      webApp.expand();
    }

    const initData: TelegramInitData = webApp.initDataUnsafe ?? {};
    const themeParams: TelegramThemeParams = webApp.themeParams ?? {};
    const colorScheme: 'light' | 'dark' =
      webApp.colorScheme === 'dark' ? 'dark' : 'light';

    const safeArea = parseSafeArea(webApp);
    const viewportHeight = webApp.viewportHeight ?? 0;
    const isExpanded = webApp.isExpanded ?? false;

    const referralCode = initData.start_param
      ? parseReferralCode(initData.start_param)
      : undefined;

    this.context = {
      user: initData.user,
      referralCode,
      colorScheme,
      themeParams,
      viewportHeight,
      isExpanded,
      safeArea,
    };

    // Apply CSS variables
    applyThemeVars(themeParams);

    // Listen for viewport events
    if (typeof webApp.onEvent === 'function') {
      webApp.onEvent('viewportChanged', () => {
        if (this.context) {
          this.context = {
            ...this.context,
            viewportHeight: webApp.viewportHeight ?? this.context.viewportHeight,
            isExpanded: webApp.isExpanded ?? this.context.isExpanded,
          };
          this.config.onViewportChanged?.(this.context);
        }
      });
    }

    return this.context;
  }

  getContext(): TelegramContext {
    if (!this.context) {
      throw new ProductionMiniAppError(
        'TelegramContextManager not initialized — call initialize() first',
        'TELEGRAM_INIT_FAILED'
      );
    }
    return this.context;
  }

  isInitialized(): boolean {
    return this.context !== undefined;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract a referral code from the Telegram start_param string.
 * Convention: start_param may be raw code or prefixed with "ref_".
 */
export function parseReferralCode(startParam: string): string | undefined {
  if (!startParam) return undefined;
  const cleaned = startParam.trim();
  if (cleaned.startsWith('ref_')) return cleaned.slice(4);
  return cleaned || undefined;
}

/**
 * Attempt to read safe-area insets via the Bot API 7.x safe_area_inset_*
 * properties.  Falls back to zero when unavailable (older clients or desktop).
 */
export function parseSafeArea(webApp: TelegramWebAppLike): SafeAreaInsets {
  return {
    top: webApp.safeAreaInset?.top ?? 0,
    bottom: webApp.safeAreaInset?.bottom ?? 0,
    left: webApp.safeAreaInset?.left ?? 0,
    right: webApp.safeAreaInset?.right ?? 0,
  };
}

/**
 * Map Telegram theme params to CSS custom properties on :root so that the
 * Mini App automatically inherits the user's Telegram colour scheme.
 */
export function applyThemeVars(params: TelegramThemeParams): void {
  // Guard for non-browser environments (tests / SSR)
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const map: Array<[keyof TelegramThemeParams, string]> = [
    ['bg_color', '--tg-theme-bg-color'],
    ['text_color', '--tg-theme-text-color'],
    ['hint_color', '--tg-theme-hint-color'],
    ['link_color', '--tg-theme-link-color'],
    ['button_color', '--tg-theme-button-color'],
    ['button_text_color', '--tg-theme-button-text-color'],
    ['secondary_bg_color', '--tg-theme-secondary-bg-color'],
  ];

  for (const [key, cssVar] of map) {
    const value = params[key];
    if (value) root.style.setProperty(cssVar, value);
  }
}

// ============================================================================
// Loose type for the Telegram WebApp object
// ============================================================================

/** Minimal interface over the real Telegram WebApp global */
export interface TelegramWebAppLike {
  initDataUnsafe?: TelegramInitData;
  themeParams?: TelegramThemeParams;
  colorScheme?: string;
  viewportHeight?: number;
  isExpanded?: boolean;
  safeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
  expand?(): void;
  onEvent?(eventType: string, handler: () => void): void;
}

// ============================================================================
// Factory
// ============================================================================

export function createTelegramContextManager(
  config?: TelegramContextManagerConfig
): TelegramContextManager {
  return new TelegramContextManager(config);
}
