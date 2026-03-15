/**
 * TONAIAgent - Production Telegram Mini App — Types
 *
 * Shared types for the cross-device production Mini App module covering:
 * internationalization, wallet connection, demo/live mode, portfolio, and
 * on-chain trading integration.
 *
 * @see Issue #239 — Production Telegram Mini App (Cross-Device UI, Wallet, Demo/Live Mode)
 */

// ============================================================================
// Internationalization
// ============================================================================

/** Supported UI languages */
export type SupportedLanguage = 'en' | 'ru';

/** Translation key-value map */
export type TranslationMap = Record<string, string>;

/** i18n translations keyed by language */
export type I18nBundle = Record<SupportedLanguage, TranslationMap>;

// ============================================================================
// Telegram WebApp
// ============================================================================

/** Safe-area insets injected via CSS env() variables */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Minimal subset of Telegram's initDataUnsafe.user */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

/** Minimal subset of Telegram WebApp initDataUnsafe */
export interface TelegramInitData {
  user?: TelegramUser;
  /** Deep-link start parameter — carries referral code when present */
  start_param?: string;
}

/** Telegram WebApp theme parameters (subset used by this module) */
export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

/** Parsed Telegram context handed to the Mini App on startup */
export interface TelegramContext {
  /** Authenticated user, if Telegram provided initData */
  user?: TelegramUser;
  /** Referral code extracted from start_param */
  referralCode?: string;
  /** Active colour scheme */
  colorScheme: 'light' | 'dark';
  /** Theme palette from Telegram */
  themeParams: TelegramThemeParams;
  /** Current viewport height in px */
  viewportHeight: number;
  /** Whether the viewport is fully expanded */
  isExpanded: boolean;
  /** Detected safe-area insets */
  safeArea: SafeAreaInsets;
}

// ============================================================================
// Mode
// ============================================================================

/** Operating mode — demo uses simulated data, live uses real wallet + swaps */
export type AppMode = 'demo' | 'live';

// ============================================================================
// Wallet
// ============================================================================

/** TON wallet provider identifiers */
export type WalletProvider = 'tonkeeper' | 'openmask' | 'mytonwallet' | 'tonspace';

/** Connection state of the TON wallet */
export type WalletConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Connected wallet state */
export interface WalletState {
  status: WalletConnectionStatus;
  provider?: WalletProvider;
  /** Raw address (bounceable) */
  address?: string;
  /** User-friendly formatted address (first 6 … last 4 chars) */
  displayAddress?: string;
  /** TON balance in nano-tons */
  balanceNano?: string;
  /** TON balance as human-readable number */
  balanceTon?: number;
  /** USDT balance (6-decimal jetton) */
  balanceUsdt?: number;
  /** Timestamp of last balance refresh (Unix, seconds) */
  lastRefreshedAt?: number;
  /** Error message when status === 'error' */
  error?: string;
}

// ============================================================================
// AI Provider Settings
// ============================================================================

/** Supported AI provider backends */
export type AIProvider = 'groq' | 'openai' | 'custom';

/** User-supplied AI API settings */
export interface AISettings {
  provider: AIProvider;
  /** API key for Groq / OpenAI */
  apiKey?: string;
  /** Model ID (e.g. 'llama3-8b-8192' for Groq) */
  model?: string;
  /** Custom endpoint URL when provider === 'custom' */
  endpoint?: string;
}

// ============================================================================
// Portfolio
// ============================================================================

/** Crypto token symbols supported in the dashboard */
export type TokenSymbol = 'BTC' | 'ETH' | 'TON' | 'USDT' | 'NOT' | string;

/** A single portfolio asset position */
export interface AssetPosition {
  symbol: TokenSymbol;
  name: string;
  /** Amount held */
  amount: number;
  /** USD value */
  valueUsd: number;
  /** Portfolio share 0-100 */
  allocationPercent: number;
  /** 24-hour price change percent */
  change24hPercent: number;
  /** Path to SVG icon, e.g. /assets/tokens/TON.svg */
  iconPath: string;
}

/** Open trading position */
export interface OpenPosition {
  id: string;
  symbol: TokenSymbol;
  /** 'long' | 'short' */
  direction: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  size: number;
  /** Unrealised PnL in USD */
  unrealisedPnlUsd: number;
  /** Unrealised PnL % */
  unrealisedPnlPercent: number;
  openedAt: number;
}

/** Portfolio snapshot shown on the dashboard */
export interface PortfolioSnapshot {
  /** Total portfolio value in USD */
  totalValueUsd: number;
  /** Value change vs. 24 h ago */
  dailyPnlUsd: number;
  /** Daily PnL as percent */
  dailyPnlPercent: number;
  /** All-time ROI percent */
  roiPercent: number;
  /** Asset breakdown */
  assets: AssetPosition[];
  /** Open positions */
  openPositions: OpenPosition[];
  /** Snapshot timestamp (Unix, seconds) */
  snapshotAt: number;
}

// ============================================================================
// On-Chain Trading
// ============================================================================

/** Supported TON DEXs for on-chain swaps */
export type DexId = 'dedust' | 'stonfi' | 'tonco';

/** A swap request submitted to the trading layer */
export interface SwapRequest {
  tokenIn: TokenSymbol;
  tokenOut: TokenSymbol;
  /** Human-readable amount to spend */
  amountIn: number;
  /** Maximum slippage tolerance percent */
  slippageTolerance: number;
  /** Preferred DEX — omit to auto-route */
  preferredDex?: DexId;
}

/** Result of a submitted swap */
export interface SwapResult {
  success: boolean;
  txHash?: string;
  dex?: DexId;
  amountIn: number;
  amountOut?: number;
  fee?: number;
  error?: string;
  executedAt: number;
}

// ============================================================================
// Settings
// ============================================================================

/** Persisted user settings */
export interface UserSettings {
  mode: AppMode;
  language: SupportedLanguage;
  aiSettings: AISettings;
  /** Referral code propagated from Telegram deep link */
  referralCode?: string;
  /** Last updated timestamp (Unix, seconds) */
  updatedAt: number;
}

// ============================================================================
// Mini App State
// ============================================================================

/** Active screen / tab */
export type ScreenId = 'portfolio' | 'agents' | 'trades' | 'settings';

/** Full application state managed by the Mini App */
export interface MiniAppState {
  /** Initialisation complete */
  ready: boolean;
  telegramContext?: TelegramContext;
  wallet: WalletState;
  mode: AppMode;
  language: SupportedLanguage;
  activeScreen: ScreenId;
  portfolio?: PortfolioSnapshot;
  settings: UserSettings;
}

// ============================================================================
// Events
// ============================================================================

/** Events emitted by Mini App components */
export type MiniAppEventType =
  | 'wallet_connected'
  | 'wallet_disconnected'
  | 'mode_changed'
  | 'language_changed'
  | 'portfolio_refreshed'
  | 'swap_submitted'
  | 'swap_completed'
  | 'settings_saved'
  | 'referral_detected';

export interface MiniAppEvent {
  type: MiniAppEventType;
  payload?: unknown;
  timestamp: number;
}

export type MiniAppEventCallback = (event: MiniAppEvent) => void;

// ============================================================================
// Error
// ============================================================================

export type ProductionMiniAppErrorCode =
  | 'TELEGRAM_INIT_FAILED'
  | 'WALLET_CONNECT_FAILED'
  | 'WALLET_DISCONNECT_FAILED'
  | 'PORTFOLIO_FETCH_FAILED'
  | 'SWAP_FAILED'
  | 'SETTINGS_SAVE_FAILED'
  | 'UNSUPPORTED_LANGUAGE';

export class ProductionMiniAppError extends Error {
  readonly code: ProductionMiniAppErrorCode;
  readonly metadata?: unknown;

  constructor(
    message: string,
    code: ProductionMiniAppErrorCode,
    metadata?: unknown
  ) {
    super(message);
    this.name = 'ProductionMiniAppError';
    this.code = code;
    this.metadata = metadata;
  }
}

// ============================================================================
// Configuration
// ============================================================================

export interface ProductionMiniAppConfig {
  /** Default language if Telegram profile unavailable */
  defaultLanguage: SupportedLanguage;
  /** Default mode on first launch */
  defaultMode: AppMode;
  /** Base path for token SVG icons */
  tokenIconBasePath: string;
  /** Wallets to offer for connection */
  supportedWallets: WalletProvider[];
  /** AI settings defaults */
  defaultAISettings: AISettings;
}

export const DEFAULT_PRODUCTION_MINIAPP_CONFIG: ProductionMiniAppConfig = {
  defaultLanguage: 'en',
  defaultMode: 'demo',
  tokenIconBasePath: '/assets/tokens',
  supportedWallets: ['tonkeeper', 'openmask', 'mytonwallet', 'tonspace'],
  defaultAISettings: {
    provider: 'groq',
    model: 'llama3-8b-8192',
  },
};
