/**
 * TONAIAgent - Telegram Mini App Framework
 *
 * Build a powerful Telegram Mini App with:
 * - Dashboards
 * - Strategy management
 * - Analytics
 * - Marketplace
 * - Social features
 */

import {
  MiniAppPage,
  PageComponent,
  ComponentType,
  DashboardWidget,
  CacheConfig,
  UserProfile,
  UserLevel,
  PortfolioSummary,
  DeviceInfo,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Mini App manager configuration
 */
export interface MiniAppManagerConfig {
  /** App version */
  version?: string;
  /** Enable offline mode */
  offlineMode?: boolean;
  /** Cache configuration */
  caching?: Partial<CacheConfig>;
  /** Analytics enabled */
  analyticsEnabled?: boolean;
  /** Debug mode */
  debug?: boolean;
  /** Custom pages */
  customPages?: MiniAppPage[];
  /** Theme configuration */
  theme?: ThemeConfig;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  /** Primary color */
  primaryColor: string;
  /** Secondary color */
  secondaryColor: string;
  /** Background color */
  backgroundColor: string;
  /** Text color */
  textColor: string;
  /** Accent color */
  accentColor: string;
  /** Border radius */
  borderRadius: number;
  /** Font family */
  fontFamily: string;
}

/**
 * Default theme
 */
const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#0088cc', // Telegram blue
  secondaryColor: '#5bc0eb',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  accentColor: '#ff6b35',
  borderRadius: 12,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

/**
 * Default pages configuration
 */
const DEFAULT_PAGES: MiniAppPage[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    route: '/',
    icon: '📊',
    showInNav: true,
    components: [
      {
        id: 'portfolio_summary',
        type: 'portfolio_summary',
        config: { showChart: true, showHoldings: true },
        loading: { skeleton: 'pulse', timeout: 5000 },
        errorBoundary: { showRetry: true, reportErrors: true },
      },
      {
        id: 'quick_actions',
        type: 'quick_actions',
        config: { actions: ['swap', 'send', 'receive', 'stake'] },
      },
      {
        id: 'active_strategies',
        type: 'strategy_list',
        config: { filter: 'active', limit: 3 },
        loading: { skeleton: 'wave' },
      },
      {
        id: 'recent_alerts',
        type: 'alert_banner',
        config: { limit: 3 },
      },
    ],
  },
  {
    id: 'portfolio',
    title: 'Portfolio',
    route: '/portfolio',
    icon: '💼',
    showInNav: true,
    components: [
      {
        id: 'balance_display',
        type: 'balance_display',
        config: { showChange: true },
      },
      {
        id: 'performance_chart',
        type: 'performance_chart',
        config: { timeframes: ['1D', '1W', '1M', '3M', '1Y', 'ALL'] },
        loading: { skeleton: 'pulse' },
      },
      {
        id: 'token_list',
        type: 'token_list',
        config: { sortBy: 'value', showSmallBalances: false },
      },
      {
        id: 'risk_meter',
        type: 'risk_meter',
        config: { showDetails: true },
      },
    ],
  },
  {
    id: 'strategies',
    title: 'Strategies',
    route: '/strategies',
    icon: '📈',
    showInNav: true,
    components: [
      {
        id: 'strategy_list',
        type: 'strategy_list',
        config: { showAll: true, enableFilters: true },
      },
    ],
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    route: '/marketplace',
    icon: '🏪',
    showInNav: true,
    components: [
      {
        id: 'marketplace_browser',
        type: 'marketplace_browser',
        config: { categories: ['trending', 'top_performers', 'new', 'low_risk'] },
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    route: '/analytics',
    icon: '📉',
    showInNav: true,
    requiredLevel: 'intermediate',
    components: [
      {
        id: 'analytics_dashboard',
        type: 'analytics_dashboard',
        config: { metrics: ['pnl', 'roi', 'sharpe', 'drawdown'] },
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    route: '/settings',
    icon: '⚙️',
    showInNav: true,
    components: [
      {
        id: 'settings_panel',
        type: 'settings_panel',
        config: {},
      },
    ],
  },
  {
    id: 'staking',
    title: 'Staking',
    route: '/staking',
    icon: '🥩',
    showInNav: false,
    components: [
      {
        id: 'staking_overview',
        type: 'staking_overview',
        config: { showPools: true, showRewards: true },
      },
    ],
  },
];

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  duration: 300, // 5 minutes
  strategy: 'stale_while_revalidate',
  maxSize: 50, // MB
  cacheKeys: ['portfolio', 'strategies', 'analytics', 'marketplace'],
};

// ============================================================================
// Mini App Manager
// ============================================================================

/**
 * Navigation state
 */
export interface NavigationState {
  /** Current page ID */
  currentPage: string;
  /** Navigation history */
  history: string[];
  /** Can go back */
  canGoBack: boolean;
  /** Modal open */
  modalOpen: boolean;
  /** Modal content */
  modalContent?: ModalContent;
}

/**
 * Modal content configuration
 */
export interface ModalContent {
  /** Modal ID */
  id: string;
  /** Modal title */
  title: string;
  /** Modal type */
  type: 'full' | 'sheet' | 'popup';
  /** Content component */
  component: string;
  /** Component props */
  props?: Record<string, unknown>;
  /** Can close */
  canClose: boolean;
}

/**
 * Page render result
 */
export interface PageRenderResult {
  /** Page configuration */
  page: MiniAppPage;
  /** Rendered components */
  components: RenderedComponent[];
  /** Page metadata */
  metadata: PageMetadata;
  /** Loading states */
  loadingStates: Record<string, boolean>;
  /** Error states */
  errorStates: Record<string, string | undefined>;
}

/**
 * Rendered component data
 */
export interface RenderedComponent {
  /** Component ID */
  id: string;
  /** Component type */
  type: ComponentType;
  /** Component data */
  data: unknown;
  /** Is loading */
  loading: boolean;
  /** Error message */
  error?: string;
  /** Last updated */
  lastUpdated?: Date;
}

/**
 * Page metadata
 */
export interface PageMetadata {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Show back button */
  showBackButton: boolean;
  /** Show header */
  showHeader: boolean;
  /** Header actions */
  headerActions?: HeaderAction[];
  /** Footer visible */
  showFooter: boolean;
}

/**
 * Header action button
 */
export interface HeaderAction {
  /** Action ID */
  id: string;
  /** Icon */
  icon: string;
  /** Action to trigger */
  action: string;
  /** Badge count */
  badge?: number;
}

/**
 * Manages the Telegram Mini App experience
 */
export class MiniAppManager {
  private readonly config: Required<MiniAppManagerConfig>;
  private readonly pages: Map<string, MiniAppPage> = new Map();
  private readonly cache: Map<string, CachedData> = new Map();
  private readonly eventListeners: Map<string, EventHandler[]> = new Map();
  private navigationState: NavigationState;
  private device?: DeviceInfo;
  private user?: UserProfile;

  constructor(config: Partial<MiniAppManagerConfig> = {}) {
    this.config = {
      version: config.version ?? '1.0.0',
      offlineMode: config.offlineMode ?? true,
      caching: { ...DEFAULT_CACHE_CONFIG, ...config.caching },
      analyticsEnabled: config.analyticsEnabled ?? true,
      debug: config.debug ?? false,
      customPages: config.customPages ?? [],
      theme: { ...DEFAULT_THEME, ...config.theme },
    };

    // Initialize pages
    const allPages = [...DEFAULT_PAGES, ...this.config.customPages];
    for (const page of allPages) {
      this.pages.set(page.id, page);
    }

    // Initialize navigation state
    this.navigationState = {
      currentPage: 'dashboard',
      history: ['dashboard'],
      canGoBack: false,
      modalOpen: false,
    };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the Mini App
   */
  async initialize(initData: TelegramWebAppInitData): Promise<InitializationResult> {
    const startTime = Date.now();

    try {
      // Validate init data (in production, verify with Telegram)
      if (!this.validateInitData(initData)) {
        return {
          success: false,
          error: 'Invalid initialization data',
          initTime: Date.now() - startTime,
        };
      }

      // Detect device capabilities
      this.device = this.detectDevice(initData);

      // Initialize theme based on Telegram theme
      if (initData.themeParams) {
        this.applyTelegramTheme(initData.themeParams);
      }

      // Load cached data if offline mode enabled
      if (this.config.offlineMode) {
        await this.loadCachedData();
      }

      // Emit initialization event
      this.emit('initialized', { device: this.device });

      return {
        success: true,
        device: this.device,
        theme: this.config.theme,
        offlineData: this.config.offlineMode,
        initTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        initTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Set current user
   */
  setUser(user: UserProfile): void {
    this.user = user;
    this.emit('user_changed', { user });
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  /**
   * Navigate to a page
   */
  navigate(pageId: string, params?: Record<string, unknown>): boolean {
    const page = this.pages.get(pageId);

    if (!page) {
      this.log('warn', `Page not found: ${pageId}`);
      return false;
    }

    // Check access level
    if (page.requiredLevel && this.user) {
      if (!this.checkAccessLevel(this.user.level, page.requiredLevel)) {
        this.emit('access_denied', { page: pageId, requiredLevel: page.requiredLevel });
        return false;
      }
    }

    // Update navigation state
    this.navigationState.history.push(pageId);
    this.navigationState.currentPage = pageId;
    this.navigationState.canGoBack = this.navigationState.history.length > 1;

    // Close any open modal
    if (this.navigationState.modalOpen) {
      this.closeModal();
    }

    // Emit navigation event
    this.emit('navigated', { page: pageId, params });

    // Track analytics
    if (this.config.analyticsEnabled) {
      this.trackPageView(pageId);
    }

    return true;
  }

  /**
   * Go back in navigation history
   */
  goBack(): boolean {
    if (!this.navigationState.canGoBack) {
      return false;
    }

    // Remove current page from history
    this.navigationState.history.pop();

    // Get previous page
    const previousPage = this.navigationState.history[this.navigationState.history.length - 1];

    if (previousPage) {
      this.navigationState.currentPage = previousPage;
      this.navigationState.canGoBack = this.navigationState.history.length > 1;

      this.emit('navigated_back', { page: previousPage });
      return true;
    }

    return false;
  }

  /**
   * Get current navigation state
   */
  getNavigationState(): NavigationState {
    return { ...this.navigationState };
  }

  /**
   * Get navigation items for bottom nav
   */
  getNavigationItems(): NavigationItem[] {
    const items: NavigationItem[] = [];

    for (const page of this.pages.values()) {
      if (!page.showInNav) continue;

      // Check access level
      if (page.requiredLevel && this.user) {
        if (!this.checkAccessLevel(this.user.level, page.requiredLevel)) {
          continue;
        }
      }

      items.push({
        id: page.id,
        title: page.title,
        icon: page.icon,
        route: page.route,
        active: this.navigationState.currentPage === page.id,
        badge: this.getPageBadge(page.id),
      });
    }

    return items;
  }

  // ============================================================================
  // Modal Management
  // ============================================================================

  /**
   * Open a modal
   */
  openModal(content: ModalContent): void {
    this.navigationState.modalOpen = true;
    this.navigationState.modalContent = content;

    this.emit('modal_opened', { modal: content });
  }

  /**
   * Close the modal
   */
  closeModal(): void {
    const modal = this.navigationState.modalContent;

    this.navigationState.modalOpen = false;
    this.navigationState.modalContent = undefined;

    if (modal) {
      this.emit('modal_closed', { modal });
    }
  }

  /**
   * Open action sheet (bottom sheet with options)
   */
  openActionSheet(options: ActionSheetOptions): void {
    this.openModal({
      id: 'action_sheet',
      title: options.title,
      type: 'sheet',
      component: 'action_sheet',
      props: { options: options.options },
      canClose: true,
    });
  }

  // ============================================================================
  // Page Rendering
  // ============================================================================

  /**
   * Render current page
   */
  async renderCurrentPage(): Promise<PageRenderResult> {
    const pageId = this.navigationState.currentPage;
    return this.renderPage(pageId);
  }

  /**
   * Render a specific page
   */
  async renderPage(pageId: string): Promise<PageRenderResult> {
    const page = this.pages.get(pageId);

    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const components: RenderedComponent[] = [];
    const loadingStates: Record<string, boolean> = {};
    const errorStates: Record<string, string | undefined> = {};

    // Render each component
    for (const componentConfig of page.components) {
      try {
        loadingStates[componentConfig.id] = true;

        const data = await this.loadComponentData(componentConfig);

        components.push({
          id: componentConfig.id,
          type: componentConfig.type,
          data,
          loading: false,
          lastUpdated: new Date(),
        });

        loadingStates[componentConfig.id] = false;
      } catch (error) {
        const errorMessage = (error as Error).message;
        errorStates[componentConfig.id] = errorMessage;

        components.push({
          id: componentConfig.id,
          type: componentConfig.type,
          data: null,
          loading: false,
          error: errorMessage,
        });

        loadingStates[componentConfig.id] = false;
      }
    }

    // Generate metadata
    const metadata = this.generatePageMetadata(page);

    return {
      page,
      components,
      metadata,
      loadingStates,
      errorStates,
    };
  }

  /**
   * Load data for a component
   */
  private async loadComponentData(component: PageComponent): Promise<unknown> {
    // Check cache first
    const cacheKey = `${component.type}_${component.id}`;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    // Load fresh data (in production, this would call APIs)
    const data = await this.fetchComponentData(component);

    // Cache the result
    this.setInCache(cacheKey, data);

    return data;
  }

  /**
   * Fetch component data (mock implementation)
   */
  private async fetchComponentData(component: PageComponent): Promise<unknown> {
    // Simulate API delay
    await this.simulateDelay(100);

    switch (component.type) {
      case 'portfolio_summary':
        return this.getMockPortfolioSummary();

      case 'quick_actions':
        return this.getMockQuickActions(component.config);

      case 'strategy_list':
        return this.getMockStrategies(component.config);

      case 'token_list':
        return this.getMockTokenList();

      case 'performance_chart':
        return this.getMockPerformanceData();

      case 'risk_meter':
        return this.getMockRiskData();

      case 'analytics_dashboard':
        return this.getMockAnalytics();

      case 'marketplace_browser':
        return this.getMockMarketplace();

      case 'staking_overview':
        return this.getMockStakingData();

      default:
        return {};
    }
  }

  // ============================================================================
  // Dashboard Widgets
  // ============================================================================

  /**
   * Get dashboard widgets for user
   */
  getDashboardWidgets(): DashboardWidget[] {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'portfolio_value',
        type: 'portfolio_summary',
        title: 'Portfolio Value',
        position: { x: 0, y: 0, w: 2, h: 1 },
        config: { compact: true },
        refreshInterval: 30000,
        minimizable: true,
        removable: false,
      },
      {
        id: 'quick_actions',
        type: 'quick_actions',
        title: 'Quick Actions',
        position: { x: 0, y: 1, w: 2, h: 1 },
        config: {},
        minimizable: false,
        removable: false,
      },
      {
        id: 'active_strategies',
        type: 'strategy_cards',
        title: 'Active Strategies',
        position: { x: 0, y: 2, w: 2, h: 2 },
        config: { limit: 3 },
        refreshInterval: 60000,
        minimizable: true,
        removable: true,
      },
      {
        id: 'price_chart',
        type: 'price_chart',
        title: 'TON Price',
        position: { x: 0, y: 4, w: 2, h: 1 },
        config: { token: 'TON', timeframe: '1D' },
        refreshInterval: 60000,
        minimizable: true,
        removable: true,
      },
    ];

    return defaultWidgets;
  }

  /**
   * Update widget configuration
   */
  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): boolean {
    // In production, this would persist to storage
    this.emit('widget_updated', { widgetId, updates });
    return true;
  }

  // ============================================================================
  // Events & Callbacks
  // ============================================================================

  /**
   * Add event listener
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: unknown): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          this.log('error', `Error in event handler for ${event}:`, error);
        }
      }
    }
  }

  // ============================================================================
  // Telegram Integration
  // ============================================================================

  /**
   * Expand the Mini App
   */
  expand(): void {
    // In production, this would call Telegram.WebApp.expand()
    this.emit('expanded');
  }

  /**
   * Close the Mini App
   */
  close(): void {
    // In production, this would call Telegram.WebApp.close()
    this.emit('closing');
  }

  /**
   * Show main button
   */
  showMainButton(text: string, callback: () => void): void {
    this.emit('main_button_shown', { text, callback });
  }

  /**
   * Hide main button
   */
  hideMainButton(): void {
    this.emit('main_button_hidden');
  }

  /**
   * Enable haptic feedback
   */
  hapticFeedback(type: 'impact' | 'notification' | 'selection'): void {
    if (this.device?.supportsHaptic) {
      this.emit('haptic_feedback', { type });
    }
  }

  /**
   * Show popup
   */
  showPopup(params: PopupParams): Promise<string | undefined> {
    return new Promise((resolve) => {
      this.emit('popup_shown', {
        params,
        callback: (buttonId: string | undefined) => resolve(buttonId),
      });
    });
  }

  /**
   * Show confirm dialog
   */
  async showConfirm(message: string): Promise<boolean> {
    const result = await this.showPopup({
      title: 'Confirm',
      message,
      buttons: [
        { id: 'cancel', type: 'cancel', text: 'Cancel' },
        { id: 'confirm', type: 'ok', text: 'Confirm' },
      ],
    });

    return result === 'confirm';
  }

  /**
   * Show alert
   */
  showAlert(message: string): Promise<void> {
    return new Promise((resolve) => {
      this.emit('alert_shown', { message, callback: resolve });
    });
  }

  // ============================================================================
  // Caching
  // ============================================================================

  /**
   * Get from cache
   */
  private getFromCache(key: string): unknown | undefined {
    if (!this.config.caching.enabled) return undefined;

    const cached = this.cache.get(key);
    if (!cached) return undefined;

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.data;
  }

  /**
   * Set in cache
   */
  private setInCache(key: string, data: unknown): void {
    if (!this.config.caching.enabled) return;

    const duration = (this.config.caching as CacheConfig).duration ?? 300;

    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + duration * 1000,
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache_cleared');
  }

  /**
   * Load cached data for offline mode
   */
  private async loadCachedData(): Promise<void> {
    // In production, this would load from IndexedDB or localStorage
    this.log('info', 'Loading cached data for offline mode');
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Track page view
   */
  private trackPageView(pageId: string): void {
    this.emit('analytics_event', {
      type: 'page_view',
      page: pageId,
      timestamp: new Date(),
    });
  }

  /**
   * Track action
   */
  trackAction(action: string, data?: Record<string, unknown>): void {
    if (!this.config.analyticsEnabled) return;

    this.emit('analytics_event', {
      type: 'action',
      action,
      data,
      timestamp: new Date(),
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private validateInitData(initData: TelegramWebAppInitData): boolean {
    // In production, validate hash with bot token
    return Boolean(initData.user?.id);
  }

  private detectDevice(initData: TelegramWebAppInitData): DeviceInfo {
    const platform = initData.platform ?? 'unknown';

    return {
      type: platform === 'tdesktop' || platform === 'macos' ? 'desktop' : 'mobile',
      platform: platform as DeviceInfo['platform'],
      screenWidth: initData.viewportWidth,
      screenHeight: initData.viewportHeight,
      isTouch: platform !== 'tdesktop' && platform !== 'macos',
      supportsHaptic: platform === 'ios' || platform === 'android',
      lowBandwidth: false,
    };
  }

  private applyTelegramTheme(themeParams: TelegramThemeParams): void {
    if (themeParams.bg_color) {
      this.config.theme.backgroundColor = themeParams.bg_color;
    }
    if (themeParams.text_color) {
      this.config.theme.textColor = themeParams.text_color;
    }
    if (themeParams.button_color) {
      this.config.theme.primaryColor = themeParams.button_color;
    }
    if (themeParams.secondary_bg_color) {
      this.config.theme.secondaryColor = themeParams.secondary_bg_color;
    }
  }

  private checkAccessLevel(userLevel: UserLevel, requiredLevel: UserLevel): boolean {
    const levels: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'institutional'];
    return levels.indexOf(userLevel) >= levels.indexOf(requiredLevel);
  }

  private getPageBadge(_pageId: string): number | undefined {
    // In production, this would check for unread notifications, etc.
    return undefined;
  }

  private generatePageMetadata(page: MiniAppPage): PageMetadata {
    return {
      title: page.title,
      showBackButton: this.navigationState.canGoBack,
      showHeader: true,
      showFooter: true,
      headerActions: this.getHeaderActionsForPage(page.id),
    };
  }

  private getHeaderActionsForPage(pageId: string): HeaderAction[] {
    const actions: HeaderAction[] = [];

    if (pageId === 'dashboard') {
      actions.push({
        id: 'notifications',
        icon: '🔔',
        action: 'open_notifications',
        badge: 3, // Example badge
      });
    }

    if (pageId !== 'settings') {
      actions.push({
        id: 'settings',
        icon: '⚙️',
        action: 'navigate_settings',
      });
    }

    return actions;
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private log(level: 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console[level](`[MiniApp] ${message}`, ...args);
    }
  }

  // ============================================================================
  // Mock Data (for development)
  // ============================================================================

  private getMockPortfolioSummary(): PortfolioSummary {
    return {
      totalValueTON: 1234.56,
      totalValueUSD: 7890.12,
      change24h: 5.67,
      change7d: 12.34,
      change30d: -3.21,
      activeStrategies: 3,
      holdings: [
        {
          symbol: 'TON',
          name: 'Toncoin',
          balance: 500,
          valueTON: 500,
          valueUSD: 3200,
          change24h: 4.5,
          portfolioPercent: 40.5,
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          balance: 2000,
          valueTON: 312.5,
          valueUSD: 2000,
          change24h: 0.01,
          portfolioPercent: 25.3,
        },
        {
          symbol: 'NOT',
          name: 'Notcoin',
          balance: 100000,
          valueTON: 200,
          valueUSD: 1280,
          change24h: 15.2,
          portfolioPercent: 16.2,
        },
      ],
      lastUpdated: new Date(),
    };
  }

  private getMockQuickActions(_config: Record<string, unknown>): unknown {
    return {
      actions: [
        { id: 'swap', icon: '🔄', label: 'Swap', action: 'open_swap' },
        { id: 'send', icon: '📤', label: 'Send', action: 'open_send' },
        { id: 'receive', icon: '📥', label: 'Receive', action: 'open_receive' },
        { id: 'stake', icon: '🥩', label: 'Stake', action: 'open_staking' },
      ],
    };
  }

  private getMockStrategies(_config: Record<string, unknown>): unknown {
    return {
      strategies: [
        {
          id: 'strat_1',
          name: 'TON DCA',
          status: 'active',
          performance: 12.5,
          allocatedValue: 500,
        },
        {
          id: 'strat_2',
          name: 'Yield Farm',
          status: 'active',
          performance: 8.3,
          allocatedValue: 300,
        },
        {
          id: 'strat_3',
          name: 'Grid Trading',
          status: 'paused',
          performance: -2.1,
          allocatedValue: 200,
        },
      ],
    };
  }

  private getMockTokenList(): unknown {
    return {
      tokens: [
        { symbol: 'TON', name: 'Toncoin', balance: 500, value: 3200, change: 4.5 },
        { symbol: 'USDT', name: 'Tether USD', balance: 2000, value: 2000, change: 0.01 },
        { symbol: 'NOT', name: 'Notcoin', balance: 100000, value: 1280, change: 15.2 },
        { symbol: 'DOGS', name: 'Dogs', balance: 500000, value: 750, change: -5.3 },
      ],
    };
  }

  private getMockPerformanceData(): unknown {
    return {
      timeframes: {
        '1D': { change: 2.3, data: [] },
        '1W': { change: 5.6, data: [] },
        '1M': { change: 12.4, data: [] },
        '3M': { change: 25.8, data: [] },
        '1Y': { change: 156.2, data: [] },
        ALL: { change: 412.5, data: [] },
      },
    };
  }

  private getMockRiskData(): unknown {
    return {
      overallRisk: 45,
      riskLevel: 'medium',
      factors: [
        { name: 'Concentration', score: 60, description: '3 tokens > 10%' },
        { name: 'Volatility', score: 40, description: 'Moderate exposure' },
        { name: 'Strategy Risk', score: 35, description: 'Conservative strategies' },
      ],
    };
  }

  private getMockAnalytics(): unknown {
    return {
      totalPnL: 1234.56,
      totalPnLPercent: 15.6,
      roi: 18.2,
      sharpeRatio: 1.45,
      maxDrawdown: -8.3,
      winRate: 65.2,
      trades: 156,
    };
  }

  private getMockMarketplace(): unknown {
    return {
      categories: {
        trending: [
          { id: 'mp_1', name: 'High Yield TON', author: 'CryptoMaster', performance: 45.2, copies: 1234 },
          { id: 'mp_2', name: 'Safe DCA', author: 'SafeTrader', performance: 12.5, copies: 5678 },
        ],
        top_performers: [
          { id: 'mp_3', name: 'Aggressive Growth', author: 'RiskTaker', performance: 89.5, copies: 890 },
        ],
      },
    };
  }

  private getMockStakingData(): unknown {
    return {
      totalStaked: 250,
      totalRewards: 12.5,
      apy: 5.2,
      pools: [
        { name: 'TON Whales', staked: 150, rewards: 7.5, apy: 5.0 },
        { name: 'Bemo', staked: 100, rewards: 5.0, apy: 5.5 },
      ],
    };
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Telegram Web App init data
 */
export interface TelegramWebAppInitData {
  user?: {
    id: string;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  auth_date: number;
  hash: string;
  platform?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  viewportStableHeight?: number;
  themeParams?: TelegramThemeParams;
}

/**
 * Telegram theme parameters
 */
export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

/**
 * Initialization result
 */
export interface InitializationResult {
  success: boolean;
  device?: DeviceInfo;
  theme?: ThemeConfig;
  offlineData?: boolean;
  error?: string;
  initTime: number;
}

/**
 * Navigation item for bottom nav
 */
export interface NavigationItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  active: boolean;
  badge?: number;
}

/**
 * Action sheet options
 */
export interface ActionSheetOptions {
  title: string;
  options: ActionSheetOption[];
}

/**
 * Action sheet option
 */
export interface ActionSheetOption {
  id: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  action: string;
}

/**
 * Popup parameters
 */
export interface PopupParams {
  title?: string;
  message: string;
  buttons?: PopupButton[];
}

/**
 * Popup button
 */
export interface PopupButton {
  id: string;
  type: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
  text?: string;
}

/**
 * Event handler type
 */
export type EventHandler = (data?: unknown) => void;

/**
 * Cached data structure
 */
interface CachedData {
  data: unknown;
  cachedAt: number;
  expiresAt: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a MiniAppManager with default configuration
 */
export function createMiniAppManager(
  config?: Partial<MiniAppManagerConfig>
): MiniAppManager {
  return new MiniAppManager(config);
}

/**
 * Get default Mini App pages
 */
export function getDefaultPages(): MiniAppPage[] {
  return [...DEFAULT_PAGES];
}

/**
 * Get default theme
 */
export function getDefaultTheme(): ThemeConfig {
  return { ...DEFAULT_THEME };
}
