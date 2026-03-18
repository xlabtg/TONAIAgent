/**
 * TONAIAgent - Mobile UX Types
 *
 * Comprehensive type definitions for Telegram-native mobile-first UX.
 */

// ============================================================================
// User & Session Types
// ============================================================================

/**
 * User experience level for personalization
 */
export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'institutional';

/**
 * User profile with preferences
 */
export interface UserProfile {
  /** Telegram user ID */
  telegramId: string;
  /** Display name */
  displayName: string;
  /** Username (optional) */
  username?: string;
  /** Profile photo URL */
  photoUrl?: string;
  /** User's language preference */
  language: string;
  /** User experience level */
  level: UserLevel;
  /** User preferences */
  preferences: UserPreferences;
  /** Onboarding status */
  onboarding: OnboardingStatus;
  /** Account creation date */
  createdAt: Date;
  /** Last activity timestamp */
  lastActiveAt: Date;
}

/**
 * User preferences for UX customization
 */
export interface UserPreferences {
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';
  /** Notification settings */
  notifications: NotificationPreferences;
  /** Dashboard layout */
  dashboardLayout: 'compact' | 'detailed' | 'minimal';
  /** Default currency display */
  displayCurrency: string;
  /** Show fiat values */
  showFiatValues: boolean;
  /** Haptic feedback enabled */
  hapticFeedback: boolean;
  /** Risk warnings level */
  riskWarnings: 'all' | 'critical' | 'none';
  /** Quick actions customization */
  quickActions: string[];
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  /** Enable push notifications */
  pushEnabled: boolean;
  /** Transaction alerts */
  transactions: boolean;
  /** Price alerts */
  priceAlerts: boolean;
  /** Strategy status changes */
  strategyUpdates: boolean;
  /** Risk warnings */
  riskAlerts: boolean;
  /** Marketing messages */
  marketing: boolean;
  /** Quiet hours */
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
  };
}

/**
 * Onboarding status tracking
 */
export interface OnboardingStatus {
  /** Whether onboarding is completed */
  completed: boolean;
  /** Current step index */
  currentStep: number;
  /** Completed steps */
  completedSteps: string[];
  /** Skipped steps */
  skippedSteps: string[];
  /** Start time */
  startedAt?: Date;
  /** Completion time */
  completedAt?: Date;
  /** Time spent in seconds */
  timeSpentSeconds: number;
}

/**
 * Session information
 */
export interface Session {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Session type */
  type: 'bot' | 'mini_app' | 'web';
  /** Creation timestamp */
  createdAt: Date;
  /** Expiration timestamp */
  expiresAt: Date;
  /** Last activity */
  lastActivityAt: Date;
  /** Device info */
  device?: DeviceInfo;
  /** IP address (hashed) */
  ipHash?: string;
  /** Is active */
  active: boolean;
}

/**
 * Device information for optimization
 */
export interface DeviceInfo {
  /** Device type */
  type: 'mobile' | 'tablet' | 'desktop';
  /** Platform */
  platform: 'ios' | 'android' | 'web' | 'tdesktop' | 'macos';
  /** Screen width */
  screenWidth?: number;
  /** Screen height */
  screenHeight?: number;
  /** Pixel ratio */
  pixelRatio?: number;
  /** Is touch device */
  isTouch: boolean;
  /** Supports haptic feedback */
  supportsHaptic: boolean;
  /** Network type */
  networkType?: 'wifi' | '4g' | '3g' | '2g' | 'slow';
  /** Low bandwidth mode */
  lowBandwidth: boolean;
}

// ============================================================================
// Onboarding Types
// ============================================================================

/**
 * Onboarding step definition
 */
export interface OnboardingStep {
  /** Step ID */
  id: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Step type */
  type: OnboardingStepType;
  /** Required to proceed */
  required: boolean;
  /** Skip allowed */
  skippable: boolean;
  /** Estimated time in seconds */
  estimatedTime: number;
  /** Step configuration */
  config: Record<string, unknown>;
  /** Validation function name */
  validation?: string;
  /** Success callback action */
  onSuccess?: string;
}

/**
 * Types of onboarding steps
 */
export type OnboardingStepType =
  | 'welcome'
  | 'wallet_create'
  | 'wallet_import'
  | 'recovery_setup'
  | 'profile_setup'
  | 'risk_assessment'
  | 'tutorial'
  | 'first_deposit'
  | 'complete';

/**
 * Onboarding flow configuration
 */
export interface OnboardingConfig {
  /** Flow ID */
  id: string;
  /** Flow name */
  name: string;
  /** Target user level */
  targetLevel: UserLevel;
  /** Steps in order */
  steps: OnboardingStep[];
  /** Max time target (seconds) */
  maxTimeTarget: number;
  /** Enable skip all */
  allowSkipAll: boolean;
  /** AI assistance enabled */
  aiAssisted: boolean;
}

/**
 * Wallet creation options
 */
export interface WalletCreationOptions {
  /** Creation method */
  method: 'new' | 'import' | 'social';
  /** Social provider (if method is social) */
  socialProvider?: 'telegram' | 'google' | 'apple';
  /** Backup method */
  backupMethod: 'seed_phrase' | 'social_recovery' | 'hardware';
  /** Show seed phrase */
  showSeedPhrase: boolean;
  /** Require seed verification */
  requireSeedVerification: boolean;
}

/**
 * Recovery setup options
 */
export interface RecoverySetupOptions {
  /** Recovery methods enabled */
  methods: RecoveryMethod[];
  /** Required recovery methods count */
  requiredCount: number;
  /** Trusted contacts for social recovery */
  trustedContacts?: TrustedContact[];
}

/**
 * Recovery method types
 */
export type RecoveryMethod = 'seed_phrase' | 'telegram_cloud' | 'social_recovery' | 'hardware_key';

/**
 * Trusted contact for social recovery
 */
export interface TrustedContact {
  /** Contact telegram ID */
  telegramId: string;
  /** Display name */
  name: string;
  /** Verified status */
  verified: boolean;
  /** Added at */
  addedAt: Date;
}

// ============================================================================
// Conversational AI Interface Types
// ============================================================================

/**
 * Chat message
 */
export interface ChatMessage {
  /** Message ID */
  id: string;
  /** Sender type */
  sender: 'user' | 'agent' | 'system';
  /** Message content */
  content: string;
  /** Rich content blocks */
  richContent?: RichContentBlock[];
  /** Message type */
  type: ChatMessageType;
  /** Quick reply options */
  quickReplies?: QuickReply[];
  /** Inline actions */
  actions?: InlineAction[];
  /** Timestamp */
  timestamp: Date;
  /** Status */
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  /** Referenced message ID */
  replyTo?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Message types
 */
export type ChatMessageType =
  | 'text'
  | 'command'
  | 'strategy_suggestion'
  | 'transaction_request'
  | 'confirmation'
  | 'alert'
  | 'report'
  | 'error';

/**
 * Rich content block types
 */
export interface RichContentBlock {
  /** Block type */
  type: 'text' | 'card' | 'chart' | 'table' | 'image' | 'button_group' | 'progress';
  /** Block content */
  content: unknown;
}

/**
 * Quick reply option
 */
export interface QuickReply {
  /** Reply ID */
  id: string;
  /** Display text */
  text: string;
  /** Icon (emoji or icon name) */
  icon?: string;
  /** Action payload */
  payload: string;
}

/**
 * Inline action button
 */
export interface InlineAction {
  /** Action ID */
  id: string;
  /** Button text */
  text: string;
  /** Action type */
  type: 'primary' | 'secondary' | 'danger';
  /** Action payload */
  action: string;
  /** Requires confirmation */
  requiresConfirmation?: boolean;
}

/**
 * Conversation context for AI
 */
export interface ConversationContext {
  /** Conversation ID */
  conversationId: string;
  /** User profile */
  user: UserProfile;
  /** Active strategy IDs */
  activeStrategies: string[];
  /** Portfolio summary */
  portfolioSummary?: PortfolioSummary;
  /** Recent transactions */
  recentTransactions?: TransactionSummary[];
  /** Current intent (if detected) */
  currentIntent?: DetectedIntent;
  /** Context variables */
  variables: Record<string, unknown>;
}

/**
 * Detected user intent
 */
export interface DetectedIntent {
  /** Intent type */
  type: IntentType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Extracted entities */
  entities: IntentEntity[];
  /** Suggested action */
  suggestedAction?: string;
}

/**
 * Intent types for command parsing
 */
export type IntentType =
  | 'create_strategy'
  | 'modify_strategy'
  | 'pause_strategy'
  | 'resume_strategy'
  | 'delete_strategy'
  | 'view_portfolio'
  | 'view_performance'
  | 'transfer_funds'
  | 'swap_tokens'
  | 'stake_tokens'
  | 'unstake_tokens'
  | 'set_alert'
  | 'get_help'
  | 'adjust_risk'
  | 'view_analytics'
  | 'unknown';

/**
 * Extracted entity from user input
 */
export interface IntentEntity {
  /** Entity type */
  type: 'token' | 'amount' | 'percentage' | 'strategy_name' | 'time_period' | 'risk_level';
  /** Entity value */
  value: string | number;
  /** Confidence */
  confidence: number;
}

// ============================================================================
// Mini App Types
// ============================================================================

/**
 * Mini App page definition
 */
export interface MiniAppPage {
  /** Page ID */
  id: string;
  /** Page title */
  title: string;
  /** Page route */
  route: string;
  /** Page icon */
  icon: string;
  /** Visible in navigation */
  showInNav: boolean;
  /** Required user level */
  requiredLevel?: UserLevel;
  /** Components to render */
  components: PageComponent[];
}

/**
 * Page component configuration
 */
export interface PageComponent {
  /** Component ID */
  id: string;
  /** Component type */
  type: ComponentType;
  /** Component configuration */
  config: Record<string, unknown>;
  /** Loading state config */
  loading?: LoadingConfig;
  /** Error boundary config */
  errorBoundary?: ErrorBoundaryConfig;
}

/**
 * Available component types
 */
export type ComponentType =
  | 'portfolio_summary'
  | 'strategy_list'
  | 'strategy_card'
  | 'performance_chart'
  | 'transaction_list'
  | 'quick_actions'
  | 'alert_banner'
  | 'balance_display'
  | 'token_list'
  | 'staking_overview'
  | 'risk_meter'
  | 'analytics_dashboard'
  | 'marketplace_browser'
  | 'settings_panel'
  | 'custom';

/**
 * Loading state configuration
 */
export interface LoadingConfig {
  /** Skeleton type */
  skeleton: 'pulse' | 'wave' | 'none';
  /** Minimum loading time (ms) */
  minLoadingTime?: number;
  /** Timeout (ms) */
  timeout?: number;
}

/**
 * Error boundary configuration
 */
export interface ErrorBoundaryConfig {
  /** Show retry button */
  showRetry: boolean;
  /** Fallback component */
  fallbackComponent?: string;
  /** Report errors */
  reportErrors: boolean;
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  /** Widget ID */
  id: string;
  /** Widget type */
  type: string;
  /** Widget title */
  title: string;
  /** Grid position */
  position: { x: number; y: number; w: number; h: number };
  /** Widget configuration */
  config: Record<string, unknown>;
  /** Refresh interval (ms) */
  refreshInterval?: number;
  /** Can be minimized */
  minimizable: boolean;
  /** Can be removed */
  removable: boolean;
}

// ============================================================================
// Visual Control Types
// ============================================================================

/**
 * Visual workflow node (simplified for mobile)
 */
export interface MobileWorkflowNode {
  /** Node ID */
  id: string;
  /** Node type */
  type: 'trigger' | 'condition' | 'action';
  /** Node label */
  label: string;
  /** Node icon */
  icon: string;
  /** Node configuration */
  config: Record<string, unknown>;
  /** Connected nodes */
  connections: string[];
  /** Is expanded */
  expanded: boolean;
}

/**
 * Simplified strategy builder for mobile
 */
export interface MobileStrategyBuilder {
  /** Strategy name */
  name: string;
  /** Strategy template */
  template?: string;
  /** Workflow nodes */
  nodes: MobileWorkflowNode[];
  /** Risk settings */
  riskSettings: MobileRiskSettings;
  /** Is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
}

/**
 * Mobile-friendly risk settings
 */
export interface MobileRiskSettings {
  /** Risk level (1-10 scale) */
  riskLevel: number;
  /** Maximum loss percentage */
  maxLossPercent: number;
  /** Stop loss enabled */
  stopLossEnabled: boolean;
  /** Stop loss percentage */
  stopLossPercent?: number;
  /** Take profit enabled */
  takeProfitEnabled: boolean;
  /** Take profit percentage */
  takeProfitPercent?: number;
}

// ============================================================================
// Real-Time Feedback Types
// ============================================================================

/**
 * Real-time notification
 */
export interface RealTimeNotification {
  /** Notification ID */
  id: string;
  /** Notification type */
  type: NotificationType;
  /** Severity level */
  severity: 'info' | 'success' | 'warning' | 'error';
  /** Title */
  title: string;
  /** Message body */
  message: string;
  /** Timestamp */
  timestamp: Date;
  /** Is read */
  read: boolean;
  /** Action URL */
  actionUrl?: string;
  /** Action label */
  actionLabel?: string;
  /** Auto dismiss (ms) */
  autoDismiss?: number;
  /** Related entity */
  relatedEntity?: {
    type: 'strategy' | 'transaction' | 'alert' | 'portfolio';
    id: string;
  };
}

/**
 * Notification types
 */
export type NotificationType =
  | 'transaction_complete'
  | 'transaction_failed'
  | 'strategy_executed'
  | 'strategy_paused'
  | 'price_alert'
  | 'risk_warning'
  | 'portfolio_update'
  | 'system_message'
  | 'achievement'
  | 'recommendation';

/**
 * Portfolio summary for real-time updates
 */
export interface PortfolioSummary {
  /** Total value in TON */
  totalValueTON: number;
  /** Total value in USD */
  totalValueUSD: number;
  /** 24h change percentage */
  change24h: number;
  /** 7d change percentage */
  change7d: number;
  /** 30d change percentage */
  change30d: number;
  /** Active strategies count */
  activeStrategies: number;
  /** Token holdings */
  holdings: TokenHolding[];
  /** Last updated */
  lastUpdated: Date;
}

/**
 * Token holding
 */
export interface TokenHolding {
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Balance */
  balance: number;
  /** Value in TON */
  valueTON: number;
  /** Value in USD */
  valueUSD: number;
  /** 24h change */
  change24h: number;
  /** Percentage of portfolio */
  portfolioPercent: number;
  /** Token icon URL */
  iconUrl?: string;
}

/**
 * Transaction summary
 */
export interface TransactionSummary {
  /** Transaction ID */
  id: string;
  /** Transaction type */
  type: 'swap' | 'transfer' | 'stake' | 'unstake' | 'strategy_execution';
  /** Status */
  status: 'pending' | 'confirmed' | 'failed';
  /** Amount */
  amount: number;
  /** Token symbol */
  token: string;
  /** Timestamp */
  timestamp: Date;
  /** Description */
  description: string;
}

// ============================================================================
// Performance & Optimization Types
// ============================================================================

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Time to interactive (ms) */
  tti: number;
  /** First contentful paint (ms) */
  fcp: number;
  /** Largest contentful paint (ms) */
  lcp: number;
  /** Cumulative layout shift */
  cls: number;
  /** First input delay (ms) */
  fid: number;
  /** Total blocking time (ms) */
  tbt: number;
  /** API response times */
  apiLatency: Record<string, number>;
  /** Memory usage (MB) */
  memoryUsage: number;
}

/**
 * Caching configuration
 */
export interface CacheConfig {
  /** Enable caching */
  enabled: boolean;
  /** Cache duration (seconds) */
  duration: number;
  /** Cache strategy */
  strategy: 'cache_first' | 'network_first' | 'stale_while_revalidate';
  /** Max cache size (MB) */
  maxSize: number;
  /** Keys to cache */
  cacheKeys: string[];
}

/**
 * Lazy loading configuration
 */
export interface LazyLoadConfig {
  /** Enable lazy loading */
  enabled: boolean;
  /** Threshold for visibility */
  threshold: number;
  /** Root margin */
  rootMargin: string;
  /** Placeholder type */
  placeholder: 'skeleton' | 'blur' | 'none';
}

// ============================================================================
// Accessibility & Localization Types
// ============================================================================

/**
 * Localization configuration
 */
export interface LocalizationConfig {
  /** Default language */
  defaultLanguage: string;
  /** Supported languages */
  supportedLanguages: SupportedLanguage[];
  /** Fallback language */
  fallbackLanguage: string;
  /** Date format */
  dateFormat: string;
  /** Number format */
  numberFormat: NumberFormatConfig;
  /** Currency format */
  currencyFormat: CurrencyFormatConfig;
}

/**
 * Supported language
 */
export interface SupportedLanguage {
  /** Language code (ISO 639-1) */
  code: string;
  /** Language name in English */
  name: string;
  /** Native name */
  nativeName: string;
  /** RTL support */
  rtl: boolean;
  /** Translation completeness (0-100) */
  completeness: number;
}

/**
 * Number format configuration
 */
export interface NumberFormatConfig {
  /** Decimal separator */
  decimalSeparator: string;
  /** Thousands separator */
  thousandsSeparator: string;
  /** Decimal places */
  decimalPlaces: number;
}

/**
 * Currency format configuration
 */
export interface CurrencyFormatConfig {
  /** Currency symbol position */
  symbolPosition: 'before' | 'after';
  /** Currency symbol */
  symbol: string;
  /** Currency code */
  code: string;
  /** Decimal places */
  decimalPlaces: number;
}

/**
 * Accessibility settings
 */
export interface AccessibilitySettings {
  /** High contrast mode */
  highContrast: boolean;
  /** Reduced motion */
  reducedMotion: boolean;
  /** Large text */
  largeText: boolean;
  /** Font scale (1.0 = default) */
  fontScale: number;
  /** Screen reader optimizations */
  screenReaderOptimized: boolean;
  /** Voice control enabled */
  voiceControl: boolean;
}

// ============================================================================
// Security UX Types
// ============================================================================

/**
 * Confirmation dialog configuration
 */
export interface ConfirmationConfig {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirmation type */
  type: 'simple' | 'biometric' | 'pin' | 'two_factor';
  /** Show amount */
  showAmount?: boolean;
  /** Amount value */
  amount?: number;
  /** Token symbol */
  token?: string;
  /** Risk level */
  riskLevel?: 'low' | 'medium' | 'high';
  /** Risk warnings */
  warnings?: string[];
  /** Confirm button text */
  confirmText: string;
  /** Cancel button text */
  cancelText: string;
  /** Timeout (seconds) */
  timeout?: number;
}

/**
 * Biometric authentication options
 */
export interface BiometricOptions {
  /** Biometric types available */
  availableTypes: BiometricType[];
  /** Preferred type */
  preferredType: BiometricType;
  /** Fallback to PIN */
  fallbackToPin: boolean;
  /** Session duration (seconds) */
  sessionDuration: number;
}

/**
 * Biometric type
 */
export type BiometricType = 'fingerprint' | 'face_id' | 'iris' | 'none';

/**
 * Security warning
 */
export interface SecurityWarning {
  /** Warning ID */
  id: string;
  /** Warning type */
  type: 'phishing' | 'high_risk' | 'unusual_activity' | 'contract_risk' | 'scam_token';
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Title */
  title: string;
  /** Message */
  message: string;
  /** Requires acknowledgment */
  requiresAcknowledgment: boolean;
  /** Can proceed */
  canProceed: boolean;
}

/**
 * Anti-phishing settings
 */
export interface AntiPhishingSettings {
  /** Secret code for verification */
  secretCode?: string;
  /** Secret image */
  secretImage?: string;
  /** Show verification on sensitive actions */
  showOnSensitiveActions: boolean;
  /** Known phishing patterns */
  phishingPatterns: string[];
}

// ============================================================================
// Module Configuration Types
// ============================================================================

/**
 * Mobile UX configuration
 */
export interface MobileUXConfig {
  /** Onboarding configuration */
  onboarding: OnboardingConfig;
  /** Mini App configuration */
  miniApp: MiniAppConfig;
  /** Conversation AI configuration */
  conversationAI: ConversationAIConfig;
  /** Performance configuration */
  performance: PerformanceConfig;
  /** Localization configuration */
  localization: LocalizationConfig;
  /** Security UX configuration */
  security: SecurityUXConfig;
}

/**
 * Mini App configuration
 */
export interface MiniAppConfig {
  /** App version */
  version: string;
  /** Pages */
  pages: MiniAppPage[];
  /** Default page */
  defaultPage: string;
  /** Enable offline mode */
  offlineMode: boolean;
  /** Cache configuration */
  caching: CacheConfig;
  /** Analytics enabled */
  analyticsEnabled: boolean;
}

/**
 * Conversation AI configuration
 */
export interface ConversationAIConfig {
  /** AI provider */
  provider: 'groq' | 'anthropic' | 'openai';
  /** Model to use */
  model: string;
  /** System prompt */
  systemPrompt: string;
  /** Max tokens per response */
  maxTokens: number;
  /** Temperature */
  temperature: number;
  /** Enable intent detection */
  intentDetection: boolean;
  /** Enable entity extraction */
  entityExtraction: boolean;
  /** Typing indicator delay (ms) */
  typingDelay: number;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /** Enable lazy loading */
  lazyLoading: LazyLoadConfig;
  /** Image optimization */
  imageOptimization: boolean;
  /** Compression level */
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  /** Prefetch enabled */
  prefetchEnabled: boolean;
  /** Bundle splitting */
  bundleSplitting: boolean;
  /** Target frame rate */
  targetFrameRate: number;
}

/**
 * Security UX configuration
 */
export interface SecurityUXConfig {
  /** Biometric options */
  biometric: BiometricOptions;
  /** Anti-phishing settings */
  antiPhishing: AntiPhishingSettings;
  /** Session timeout (seconds) */
  sessionTimeout: number;
  /** Require confirmation for transactions above */
  confirmationThreshold: number;
  /** Show security tips */
  showSecurityTips: boolean;
}
