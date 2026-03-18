/**
 * TONAIAgent - Accessibility & Localization
 *
 * Includes:
 * - Localization and multi-language support
 * - Low-tech device support
 * - Emerging markets optimization
 * - Accessibility features
 */

import {
  SupportedLanguage,
  NumberFormatConfig,
  CurrencyFormatConfig,
  AccessibilitySettings,
} from './types';

// ============================================================================
// Supported Languages
// ============================================================================

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false, completeness: 100 },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false, completeness: 100 },
  { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false, completeness: 95 },
  { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false, completeness: 90 },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false, completeness: 85 },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, completeness: 90 },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false, completeness: 85 },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, completeness: 80 },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, completeness: 80 },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true, completeness: 75 },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false, completeness: 70 },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false, completeness: 70 },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false, completeness: 65 },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', rtl: false, completeness: 60 },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false, completeness: 60 },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', rtl: false, completeness: 75 },
];

// ============================================================================
// Number & Currency Formats
// ============================================================================

const NUMBER_FORMATS: Record<string, NumberFormatConfig> = {
  en: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 2 },
  ru: { decimalSeparator: ',', thousandsSeparator: ' ', decimalPlaces: 2 },
  de: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
  fr: { decimalSeparator: ',', thousandsSeparator: ' ', decimalPlaces: 2 },
  es: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
  zh: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 2 },
  ja: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 0 },
  ko: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 0 },
  ar: { decimalSeparator: '٫', thousandsSeparator: '٬', decimalPlaces: 2 },
};

const CURRENCY_FORMATS: Record<string, CurrencyFormatConfig> = {
  USD: { symbolPosition: 'before', symbol: '$', code: 'USD', decimalPlaces: 2 },
  EUR: { symbolPosition: 'after', symbol: '€', code: 'EUR', decimalPlaces: 2 },
  GBP: { symbolPosition: 'before', symbol: '£', code: 'GBP', decimalPlaces: 2 },
  RUB: { symbolPosition: 'after', symbol: '₽', code: 'RUB', decimalPlaces: 2 },
  CNY: { symbolPosition: 'before', symbol: '¥', code: 'CNY', decimalPlaces: 2 },
  JPY: { symbolPosition: 'before', symbol: '¥', code: 'JPY', decimalPlaces: 0 },
  KRW: { symbolPosition: 'before', symbol: '₩', code: 'KRW', decimalPlaces: 0 },
  INR: { symbolPosition: 'before', symbol: '₹', code: 'INR', decimalPlaces: 2 },
  BRL: { symbolPosition: 'before', symbol: 'R$', code: 'BRL', decimalPlaces: 2 },
  IDR: { symbolPosition: 'before', symbol: 'Rp', code: 'IDR', decimalPlaces: 0 },
  VND: { symbolPosition: 'after', symbol: '₫', code: 'VND', decimalPlaces: 0 },
  THB: { symbolPosition: 'before', symbol: '฿', code: 'THB', decimalPlaces: 2 },
  TRY: { symbolPosition: 'before', symbol: '₺', code: 'TRY', decimalPlaces: 2 },
  UAH: { symbolPosition: 'after', symbol: '₴', code: 'UAH', decimalPlaces: 2 },
  AED: { symbolPosition: 'before', symbol: 'د.إ', code: 'AED', decimalPlaces: 2 },
};

// ============================================================================
// Configuration
// ============================================================================

/**
 * Accessibility manager configuration
 */
export interface AccessibilityManagerConfig {
  /** Default language */
  defaultLanguage?: string;
  /** Fallback language */
  fallbackLanguage?: string;
  /** Auto-detect language */
  autoDetect?: boolean;
  /** Default currency */
  defaultCurrency?: string;
  /** Default accessibility settings */
  defaultAccessibility?: Partial<AccessibilitySettings>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<AccessibilityManagerConfig> = {
  defaultLanguage: 'en',
  fallbackLanguage: 'en',
  autoDetect: true,
  defaultCurrency: 'USD',
  defaultAccessibility: {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    fontScale: 1.0,
    screenReaderOptimized: false,
    voiceControl: false,
  },
};

// ============================================================================
// Translations (Sample)
// ============================================================================

type TranslationKey = string;
type Translations = Record<string, Record<TranslationKey, string>>;

const TRANSLATIONS: Translations = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.done': 'Done',
    'common.skip': 'Skip',
    'common.retry': 'Retry',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.portfolio': 'Portfolio',
    'nav.strategies': 'Strategies',
    'nav.marketplace': 'Marketplace',
    'nav.settings': 'Settings',

    // Portfolio
    'portfolio.total_value': 'Total Value',
    'portfolio.change_24h': '24h Change',
    'portfolio.holdings': 'Holdings',
    'portfolio.no_holdings': 'No holdings yet',

    // Strategies
    'strategies.active': 'Active',
    'strategies.paused': 'Paused',
    'strategies.create': 'Create Strategy',
    'strategies.no_strategies': 'No strategies yet',

    // Transactions
    'tx.swap': 'Swap',
    'tx.send': 'Send',
    'tx.receive': 'Receive',
    'tx.stake': 'Stake',
    'tx.unstake': 'Unstake',
    'tx.pending': 'Pending',
    'tx.confirmed': 'Confirmed',
    'tx.failed': 'Failed',

    // Errors
    'error.network': 'Network error. Please try again.',
    'error.insufficient_funds': 'Insufficient funds',
    'error.invalid_amount': 'Invalid amount',
    'error.transaction_failed': 'Transaction failed',

    // Onboarding
    'onboarding.welcome': 'Welcome to TONAIAgent',
    'onboarding.create_wallet': 'Create Your Wallet',
    'onboarding.secure_account': 'Secure Your Account',
    'onboarding.complete': "You're All Set!",

    // Accessibility
    'a11y.skip_to_content': 'Skip to content',
    'a11y.menu_open': 'Open menu',
    'a11y.menu_close': 'Close menu',
    'a11y.loading_complete': 'Loading complete',
  },
  ru: {
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.success': 'Успешно',
    'common.cancel': 'Отмена',
    'common.confirm': 'Подтвердить',
    'common.save': 'Сохранить',
    'common.back': 'Назад',
    'common.next': 'Далее',
    'common.done': 'Готово',
    'common.skip': 'Пропустить',
    'common.retry': 'Повторить',

    'nav.dashboard': 'Главная',
    'nav.portfolio': 'Портфель',
    'nav.strategies': 'Стратегии',
    'nav.marketplace': 'Маркетплейс',
    'nav.settings': 'Настройки',

    'portfolio.total_value': 'Общая стоимость',
    'portfolio.change_24h': 'Изменение за 24ч',
    'portfolio.holdings': 'Активы',
    'portfolio.no_holdings': 'Нет активов',

    'strategies.active': 'Активные',
    'strategies.paused': 'Приостановлены',
    'strategies.create': 'Создать стратегию',
    'strategies.no_strategies': 'Нет стратегий',

    'tx.swap': 'Обмен',
    'tx.send': 'Отправить',
    'tx.receive': 'Получить',
    'tx.stake': 'Стейкинг',
    'tx.unstake': 'Вывод из стейкинга',
    'tx.pending': 'В обработке',
    'tx.confirmed': 'Подтверждено',
    'tx.failed': 'Ошибка',

    'error.network': 'Ошибка сети. Попробуйте снова.',
    'error.insufficient_funds': 'Недостаточно средств',
    'error.invalid_amount': 'Неверная сумма',
    'error.transaction_failed': 'Транзакция не удалась',

    'onboarding.welcome': 'Добро пожаловать в TONAIAgent',
    'onboarding.create_wallet': 'Создайте кошелёк',
    'onboarding.secure_account': 'Защитите аккаунт',
    'onboarding.complete': 'Всё готово!',

    'a11y.skip_to_content': 'Перейти к содержимому',
    'a11y.menu_open': 'Открыть меню',
    'a11y.menu_close': 'Закрыть меню',
    'a11y.loading_complete': 'Загрузка завершена',
  },
  zh: {
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.save': '保存',
    'common.back': '返回',
    'common.next': '下一步',
    'common.done': '完成',
    'common.skip': '跳过',
    'common.retry': '重试',

    'nav.dashboard': '主页',
    'nav.portfolio': '投资组合',
    'nav.strategies': '策略',
    'nav.marketplace': '市场',
    'nav.settings': '设置',

    'portfolio.total_value': '总价值',
    'portfolio.change_24h': '24小时变化',
    'portfolio.holdings': '持有',
    'portfolio.no_holdings': '暂无持有',

    'onboarding.welcome': '欢迎使用 TONAIAgent',
    'onboarding.create_wallet': '创建钱包',
    'onboarding.secure_account': '保护您的账户',
    'onboarding.complete': '设置完成！',
  },
};

// ============================================================================
// Accessibility Manager
// ============================================================================

/**
 * Manages accessibility and localization
 */
export class AccessibilityManager {
  private readonly config: Required<AccessibilityManagerConfig>;
  private currentLanguage: string;
  private currentCurrency: string;
  private accessibilitySettings: AccessibilitySettings;
  private customTranslations: Translations = {};

  constructor(config: Partial<AccessibilityManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentLanguage = this.config.defaultLanguage;
    this.currentCurrency = this.config.defaultCurrency;
    this.accessibilitySettings = {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      fontScale: 1.0,
      screenReaderOptimized: false,
      voiceControl: false,
      ...this.config.defaultAccessibility,
    };
  }

  // ============================================================================
  // Language Management
  // ============================================================================

  /**
   * Get supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get current language info
   */
  getCurrentLanguageInfo(): SupportedLanguage | undefined {
    return SUPPORTED_LANGUAGES.find((l) => l.code === this.currentLanguage);
  }

  /**
   * Set language
   */
  setLanguage(languageCode: string): boolean {
    const language = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);

    if (!language) {
      return false;
    }

    this.currentLanguage = languageCode;
    return true;
  }

  /**
   * Detect language from Telegram or browser
   */
  detectLanguage(telegramLanguage?: string): string {
    if (!this.config.autoDetect) {
      return this.config.defaultLanguage;
    }

    // Try Telegram language
    if (telegramLanguage) {
      const lang = SUPPORTED_LANGUAGES.find(
        (l) => l.code === telegramLanguage || l.code.startsWith(telegramLanguage.split('-')[0])
      );
      if (lang) {
        return lang.code;
      }
    }

    // Fallback to default
    return this.config.defaultLanguage;
  }

  /**
   * Check if current language is RTL
   */
  isRTL(): boolean {
    const language = SUPPORTED_LANGUAGES.find((l) => l.code === this.currentLanguage);
    return language?.rtl ?? false;
  }

  // ============================================================================
  // Translation
  // ============================================================================

  /**
   * Translate a key
   */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    // Try current language
    let translation =
      this.customTranslations[this.currentLanguage]?.[key] ??
      TRANSLATIONS[this.currentLanguage]?.[key];

    // Try fallback language
    if (!translation && this.currentLanguage !== this.config.fallbackLanguage) {
      translation =
        this.customTranslations[this.config.fallbackLanguage]?.[key] ??
        TRANSLATIONS[this.config.fallbackLanguage]?.[key];
    }

    // Return key if no translation found
    if (!translation) {
      return key;
    }

    // Interpolate parameters
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translation = translation.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      }
    }

    return translation;
  }

  /**
   * Add custom translations
   */
  addTranslations(languageCode: string, translations: Record<string, string>): void {
    if (!this.customTranslations[languageCode]) {
      this.customTranslations[languageCode] = {};
    }
    Object.assign(this.customTranslations[languageCode], translations);
  }

  /**
   * Check if translation exists
   */
  hasTranslation(key: TranslationKey): boolean {
    return Boolean(
      this.customTranslations[this.currentLanguage]?.[key] ??
        TRANSLATIONS[this.currentLanguage]?.[key] ??
        TRANSLATIONS[this.config.fallbackLanguage]?.[key]
    );
  }

  // ============================================================================
  // Number & Currency Formatting
  // ============================================================================

  /**
   * Get number format for current language
   */
  getNumberFormat(): NumberFormatConfig {
    return NUMBER_FORMATS[this.currentLanguage] ?? NUMBER_FORMATS.en;
  }

  /**
   * Format number
   */
  formatNumber(value: number, decimals?: number): string {
    const format = this.getNumberFormat();
    const places = decimals ?? format.decimalPlaces;

    const [intPart, decPart] = value.toFixed(places).split('.');

    // Add thousands separators
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousandsSeparator);

    if (places === 0 || !decPart) {
      return formattedInt;
    }

    return `${formattedInt}${format.decimalSeparator}${decPart}`;
  }

  /**
   * Get currency format
   */
  getCurrencyFormat(currencyCode?: string): CurrencyFormatConfig {
    const code = currencyCode ?? this.currentCurrency;
    return CURRENCY_FORMATS[code] ?? CURRENCY_FORMATS.USD;
  }

  /**
   * Set current currency
   */
  setCurrency(currencyCode: string): boolean {
    if (!CURRENCY_FORMATS[currencyCode]) {
      return false;
    }
    this.currentCurrency = currencyCode;
    return true;
  }

  /**
   * Format currency
   */
  formatCurrency(value: number, currencyCode?: string): string {
    const format = this.getCurrencyFormat(currencyCode);
    const formattedNumber = this.formatNumber(value, format.decimalPlaces);

    if (format.symbolPosition === 'before') {
      return `${format.symbol}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${format.symbol}`;
    }
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 2): string {
    const formatted = this.formatNumber(value, decimals);
    return `${formatted}%`;
  }

  /**
   * Format date for current locale
   */
  formatDate(date: Date, style: 'short' | 'medium' | 'long' = 'medium'): string {
    const optionsMap: Record<'short' | 'medium' | 'long', Intl.DateTimeFormatOptions> = {
      short: { month: 'numeric', day: 'numeric' },
      medium: { month: 'short', day: 'numeric', year: 'numeric' },
      long: { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' },
    };
    const options = optionsMap[style];

    return date.toLocaleDateString(this.currentLanguage, options);
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return this.t('time.just_now') || 'Just now';
    }
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }
    if (diffHour < 24) {
      return `${diffHour}h ago`;
    }
    if (diffDay < 7) {
      return `${diffDay}d ago`;
    }

    return this.formatDate(date, 'short');
  }

  // ============================================================================
  // Accessibility Settings
  // ============================================================================

  /**
   * Get accessibility settings
   */
  getAccessibilitySettings(): AccessibilitySettings {
    return { ...this.accessibilitySettings };
  }

  /**
   * Update accessibility settings
   */
  updateAccessibilitySettings(settings: Partial<AccessibilitySettings>): void {
    Object.assign(this.accessibilitySettings, settings);
  }

  /**
   * Get font scale
   */
  getFontScale(): number {
    let scale = this.accessibilitySettings.fontScale;

    if (this.accessibilitySettings.largeText) {
      scale *= 1.25;
    }

    return scale;
  }

  /**
   * Check if reduced motion is enabled
   */
  shouldReduceMotion(): boolean {
    return this.accessibilitySettings.reducedMotion;
  }

  /**
   * Check if high contrast is enabled
   */
  isHighContrast(): boolean {
    return this.accessibilitySettings.highContrast;
  }

  /**
   * Check if screen reader optimizations should be used
   */
  isScreenReaderOptimized(): boolean {
    return this.accessibilitySettings.screenReaderOptimized;
  }

  /**
   * Get aria label for element
   */
  getAriaLabel(key: string, params?: Record<string, string | number>): string {
    const ariaKey = `a11y.${key}`;
    if (this.hasTranslation(ariaKey)) {
      return this.t(ariaKey, params);
    }
    return this.t(key, params);
  }

  // ============================================================================
  // Low-Tech Device Support
  // ============================================================================

  /**
   * Get optimizations for low-tech devices
   */
  getLowTechOptimizations(): LowTechOptimizations {
    return {
      disableAnimations: true,
      reduceImageQuality: true,
      maxImageWidth: 512,
      simplifyUI: true,
      disableAutoRefresh: true,
      reduceFontComplexity: true,
      useSystemFonts: true,
      minimizeNetworkRequests: true,
      enableDataSaver: true,
    };
  }

  /**
   * Check if should use simplified UI
   */
  shouldSimplifyUI(networkType?: string, deviceMemory?: number): boolean {
    // Simplify for slow networks
    if (networkType === '2g' || networkType === 'slow-2g') {
      return true;
    }

    // Simplify for low memory devices
    if (deviceMemory && deviceMemory < 2) {
      return true;
    }

    return false;
  }

  // ============================================================================
  // Emerging Markets Support
  // ============================================================================

  /**
   * Get market-specific settings
   */
  getMarketSettings(countryCode: string): MarketSettings {
    const emergingMarkets = ['IN', 'ID', 'VN', 'PH', 'NG', 'KE', 'BD', 'PK'];
    const isEmergingMarket = emergingMarkets.includes(countryCode.toUpperCase());

    return {
      isEmergingMarket,
      dataSaverDefault: isEmergingMarket,
      lowBandwidthMode: isEmergingMarket,
      simplifiedOnboarding: isEmergingMarket,
      localCurrencyDisplay: true,
      mobileMoneySupport: isEmergingMarket,
      offlineModeImportant: isEmergingMarket,
    };
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Low-tech device optimizations
 */
export interface LowTechOptimizations {
  disableAnimations: boolean;
  reduceImageQuality: boolean;
  maxImageWidth: number;
  simplifyUI: boolean;
  disableAutoRefresh: boolean;
  reduceFontComplexity: boolean;
  useSystemFonts: boolean;
  minimizeNetworkRequests: boolean;
  enableDataSaver: boolean;
}

/**
 * Market-specific settings
 */
export interface MarketSettings {
  isEmergingMarket: boolean;
  dataSaverDefault: boolean;
  lowBandwidthMode: boolean;
  simplifiedOnboarding: boolean;
  localCurrencyDisplay: boolean;
  mobileMoneySupport: boolean;
  offlineModeImportant: boolean;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an AccessibilityManager
 */
export function createAccessibilityManager(
  config?: Partial<AccessibilityManagerConfig>
): AccessibilityManager {
  return new AccessibilityManager(config);
}

/**
 * Get all supported languages
 */
export function getAllSupportedLanguages(): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES;
}

/**
 * Get all supported currencies
 */
export function getAllSupportedCurrencies(): string[] {
  return Object.keys(CURRENCY_FORMATS);
}
