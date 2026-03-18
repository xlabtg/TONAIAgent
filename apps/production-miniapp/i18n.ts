/**
 * Internationalization manager — English + Russian, auto-detected from
 * Telegram user profile with manual override.
 */

import {
  SupportedLanguage,
  TranslationMap,
  I18nBundle,
  ProductionMiniAppError,
} from './types';

// ============================================================================
// Built-in translations
// ============================================================================

const TRANSLATIONS: I18nBundle = {
  en: {
    // Navigation
    'nav.portfolio': 'Portfolio',
    'nav.agents': 'Agents',
    'nav.trades': 'Trades',
    'nav.settings': 'Settings',

    // Portfolio
    'portfolio.title': 'Portfolio',
    'portfolio.total_value': 'Total Value',
    'portfolio.daily_pnl': 'Daily PnL',
    'portfolio.roi': 'ROI',
    'portfolio.assets': 'Assets',
    'portfolio.open_positions': 'Open Positions',
    'portfolio.no_positions': 'No open positions',
    'portfolio.allocation': 'Allocation',

    // Wallet
    'wallet.connect': 'Connect Wallet',
    'wallet.disconnect': 'Disconnect',
    'wallet.connecting': 'Connecting…',
    'wallet.connected': 'Connected',
    'wallet.balance': 'Balance',
    'wallet.address': 'Address',
    'wallet.select_provider': 'Select Wallet',
    'wallet.error': 'Connection failed',

    // Mode
    'mode.demo': 'Demo Mode',
    'mode.live': 'Live Mode',
    'mode.switch_to_live': 'Switch to Live',
    'mode.switch_to_demo': 'Switch to Demo',
    'mode.demo_description': 'Simulated trading — no real funds',
    'mode.live_description': 'Real wallet — real on-chain swaps',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.mode': 'Trading Mode',
    'settings.ai_provider': 'AI Provider',
    'settings.api_key': 'API Key',
    'settings.model': 'Model',
    'settings.endpoint': 'Custom Endpoint',
    'settings.save': 'Save',
    'settings.saved': 'Saved!',

    // Trades
    'trades.title': 'Trades',
    'trades.swap': 'Swap',
    'trades.token_in': 'Sell',
    'trades.token_out': 'Buy',
    'trades.amount': 'Amount',
    'trades.slippage': 'Slippage',
    'trades.confirm': 'Confirm Swap',
    'trades.success': 'Swap Successful',
    'trades.failed': 'Swap Failed',

    // Referral
    'referral.welcome': 'Welcome! Referred by a friend.',

    // Common
    'common.loading': 'Loading…',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
  },
  ru: {
    // Navigation
    'nav.portfolio': 'Портфель',
    'nav.agents': 'Агенты',
    'nav.trades': 'Сделки',
    'nav.settings': 'Настройки',

    // Portfolio
    'portfolio.title': 'Портфель',
    'portfolio.total_value': 'Общая стоимость',
    'portfolio.daily_pnl': 'PnL за день',
    'portfolio.roi': 'ROI',
    'portfolio.assets': 'Активы',
    'portfolio.open_positions': 'Открытые позиции',
    'portfolio.no_positions': 'Нет открытых позиций',
    'portfolio.allocation': 'Распределение',

    // Wallet
    'wallet.connect': 'Подключить кошелёк',
    'wallet.disconnect': 'Отключить',
    'wallet.connecting': 'Подключение…',
    'wallet.connected': 'Подключён',
    'wallet.balance': 'Баланс',
    'wallet.address': 'Адрес',
    'wallet.select_provider': 'Выберите кошелёк',
    'wallet.error': 'Ошибка подключения',

    // Mode
    'mode.demo': 'Демо-режим',
    'mode.live': 'Боевой режим',
    'mode.switch_to_live': 'Перейти в боевой',
    'mode.switch_to_demo': 'Перейти в демо',
    'mode.demo_description': 'Симуляция сделок — реальных средств нет',
    'mode.live_description': 'Реальный кошелёк — реальные свопы on-chain',

    // Settings
    'settings.title': 'Настройки',
    'settings.language': 'Язык',
    'settings.mode': 'Режим торговли',
    'settings.ai_provider': 'AI-провайдер',
    'settings.api_key': 'API-ключ',
    'settings.model': 'Модель',
    'settings.endpoint': 'Кастомный эндпоинт',
    'settings.save': 'Сохранить',
    'settings.saved': 'Сохранено!',

    // Trades
    'trades.title': 'Сделки',
    'trades.swap': 'Обмен',
    'trades.token_in': 'Продать',
    'trades.token_out': 'Купить',
    'trades.amount': 'Сумма',
    'trades.slippage': 'Проскальзывание',
    'trades.confirm': 'Подтвердить обмен',
    'trades.success': 'Обмен выполнен',
    'trades.failed': 'Обмен не удался',

    // Referral
    'referral.welcome': 'Добро пожаловать! Вас пригласил друг.',

    // Common
    'common.loading': 'Загрузка…',
    'common.error': 'Ошибка',
    'common.retry': 'Повторить',
    'common.close': 'Закрыть',
    'common.cancel': 'Отмена',
    'common.confirm': 'Подтвердить',
  },
};

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'ru'];

// ============================================================================
// I18nManager
// ============================================================================

export interface I18nManagerConfig {
  defaultLanguage?: SupportedLanguage;
  extraTranslations?: Partial<I18nBundle>;
}

export class I18nManager {
  private language: SupportedLanguage;
  private translations: I18nBundle;

  constructor(config: I18nManagerConfig = {}) {
    this.language = config.defaultLanguage ?? 'en';

    // Merge extra translations over built-ins
    this.translations = {
      en: { ...TRANSLATIONS.en, ...(config.extraTranslations?.en ?? {}) },
      ru: { ...TRANSLATIONS.ru, ...(config.extraTranslations?.ru ?? {}) },
    };
  }

  // --------------------------------------------------------------------------
  // Language detection
  // --------------------------------------------------------------------------

  /**
   * Detect the best language from a Telegram language_code string.
   * Falls back to the configured default when the code is not supported.
   */
  detectLanguage(telegramLanguageCode?: string): SupportedLanguage {
    if (!telegramLanguageCode) return this.language;

    const code = telegramLanguageCode.toLowerCase().split('-')[0] as SupportedLanguage;
    return SUPPORTED_LANGUAGES.includes(code) ? code : this.language;
  }

  // --------------------------------------------------------------------------
  // Language switching
  // --------------------------------------------------------------------------

  setLanguage(language: SupportedLanguage): void {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      throw new ProductionMiniAppError(
        `Unsupported language: ${language}`,
        'UNSUPPORTED_LANGUAGE',
        { language }
      );
    }
    this.language = language;
  }

  getLanguage(): SupportedLanguage {
    return this.language;
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return [...SUPPORTED_LANGUAGES];
  }

  // --------------------------------------------------------------------------
  // Translation
  // --------------------------------------------------------------------------

  /**
   * Translate a key.  Returns the key itself when no translation is found
   * so the UI degrades gracefully.
   */
  t(key: string, params?: Record<string, string | number>): string {
    const map: TranslationMap = this.translations[this.language];
    let text = map[key] ?? key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }

    return text;
  }

  /** Expose the full translation map for the current language */
  getTranslationMap(): TranslationMap {
    return { ...this.translations[this.language] };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createI18nManager(config?: I18nManagerConfig): I18nManager {
  return new I18nManager(config);
}
