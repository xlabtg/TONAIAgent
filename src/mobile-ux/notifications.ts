/**
 * TONAIAgent - Real-Time Feedback & Notifications
 *
 * Shows performance, alerts, risk, and portfolio changes in real-time.
 */

import {
  RealTimeNotification,
  NotificationType,
  NotificationPreferences,
  PortfolioSummary,
  TransactionSummary,
  UserProfile,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Notification manager configuration
 */
export interface NotificationConfig {
  /** Max notifications to store */
  maxNotifications?: number;
  /** Default auto-dismiss time (ms) */
  defaultAutoDismiss?: number;
  /** Enable sound */
  enableSound?: boolean;
  /** Enable haptic feedback */
  enableHaptic?: boolean;
  /** Batch similar notifications */
  batchSimilar?: boolean;
  /** Batch window (ms) */
  batchWindow?: number;
  /** Real-time updates interval (ms) */
  realTimeInterval?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<NotificationConfig> = {
  maxNotifications: 100,
  defaultAutoDismiss: 5000,
  enableSound: true,
  enableHaptic: true,
  batchSimilar: true,
  batchWindow: 5000,
  realTimeInterval: 10000,
};

// ============================================================================
// Notification Templates
// ============================================================================

/**
 * Notification template
 */
interface NotificationTemplate {
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  severity: RealTimeNotification['severity'];
  autoDismiss?: number;
  sound?: string;
}

const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    type: 'transaction_complete',
    titleTemplate: 'Transaction Complete',
    messageTemplate: '{type} of {amount} {token} completed successfully',
    severity: 'success',
    autoDismiss: 5000,
    sound: 'success',
  },
  {
    type: 'transaction_failed',
    titleTemplate: 'Transaction Failed',
    messageTemplate: '{type} of {amount} {token} failed: {reason}',
    severity: 'error',
    autoDismiss: 0,
    sound: 'error',
  },
  {
    type: 'strategy_executed',
    titleTemplate: 'Strategy Executed',
    messageTemplate: '{strategyName} executed: {action}',
    severity: 'info',
    autoDismiss: 4000,
  },
  {
    type: 'strategy_paused',
    titleTemplate: 'Strategy Paused',
    messageTemplate: '{strategyName} has been paused: {reason}',
    severity: 'warning',
    autoDismiss: 0,
  },
  {
    type: 'price_alert',
    titleTemplate: 'Price Alert',
    messageTemplate: '{token} is now {direction} ${price}',
    severity: 'info',
    autoDismiss: 0,
    sound: 'alert',
  },
  {
    type: 'risk_warning',
    titleTemplate: 'Risk Warning',
    messageTemplate: '{message}',
    severity: 'warning',
    autoDismiss: 0,
    sound: 'warning',
  },
  {
    type: 'portfolio_update',
    titleTemplate: 'Portfolio Update',
    messageTemplate: 'Portfolio value changed by {changePercent}%',
    severity: 'info',
    autoDismiss: 3000,
  },
  {
    type: 'system_message',
    titleTemplate: 'System Message',
    messageTemplate: '{message}',
    severity: 'info',
    autoDismiss: 5000,
  },
  {
    type: 'achievement',
    titleTemplate: 'Achievement Unlocked',
    messageTemplate: '{achievementName}: {description}',
    severity: 'success',
    autoDismiss: 5000,
    sound: 'achievement',
  },
  {
    type: 'recommendation',
    titleTemplate: 'Recommendation',
    messageTemplate: '{message}',
    severity: 'info',
    autoDismiss: 0,
  },
];

// ============================================================================
// Notification Manager
// ============================================================================

/**
 * Price alert configuration
 */
export interface PriceAlert {
  id: string;
  token: string;
  condition: 'above' | 'below';
  price: number;
  triggered: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

/**
 * Portfolio alert configuration
 */
export interface PortfolioAlert {
  id: string;
  type: 'gain' | 'loss';
  threshold: number;
  triggered: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

/**
 * Real-time data update
 */
export interface RealTimeUpdate {
  type: 'portfolio' | 'price' | 'transaction' | 'strategy';
  data: unknown;
  timestamp: Date;
}

/**
 * Notification event handlers
 */
export interface NotificationHandlers {
  onNotification?: (notification: RealTimeNotification) => void;
  onPriceAlert?: (alert: PriceAlert, price: number) => void;
  onPortfolioUpdate?: (summary: PortfolioSummary) => void;
  onTransactionUpdate?: (transaction: TransactionSummary) => void;
  onRealTimeUpdate?: (update: RealTimeUpdate) => void;
}

/**
 * Manages notifications and real-time feedback
 */
export class NotificationManager {
  private readonly config: Required<NotificationConfig>;
  private readonly notifications: RealTimeNotification[] = [];
  private readonly priceAlerts: Map<string, PriceAlert> = new Map();
  private readonly portfolioAlerts: Map<string, PortfolioAlert> = new Map();
  private readonly handlers: NotificationHandlers = {};
  private preferences?: NotificationPreferences;
  private updateInterval?: ReturnType<typeof setInterval>;
  private lastPortfolio?: PortfolioSummary;

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize with user preferences
   */
  initialize(user: UserProfile, handlers?: NotificationHandlers): void {
    this.preferences = user.preferences.notifications;

    if (handlers) {
      Object.assign(this.handlers, handlers);
    }

    // Start real-time updates
    this.startRealTimeUpdates();
  }

  /**
   * Update preferences
   */
  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    if (this.preferences) {
      Object.assign(this.preferences, preferences);
    }
  }

  /**
   * Stop the notification manager
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  // ============================================================================
  // Notification Management
  // ============================================================================

  /**
   * Create and dispatch a notification
   */
  notify(
    type: NotificationType,
    params: Record<string, unknown>,
    options?: Partial<RealTimeNotification>
  ): RealTimeNotification {
    // Check preferences
    if (!this.shouldNotify(type)) {
      const silentNotification: RealTimeNotification = {
        id: `notif_${Date.now()}`,
        type,
        severity: 'info',
        title: '',
        message: '',
        timestamp: new Date(),
        read: true,
      };
      return silentNotification;
    }

    // Get template
    const template = NOTIFICATION_TEMPLATES.find((t) => t.type === type);

    // Create notification
    const notification: RealTimeNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity: options?.severity ?? template?.severity ?? 'info',
      title: options?.title ?? this.interpolate(template?.titleTemplate ?? type, params),
      message: options?.message ?? this.interpolate(template?.messageTemplate ?? '', params),
      timestamp: new Date(),
      read: false,
      autoDismiss: options?.autoDismiss ?? template?.autoDismiss ?? this.config.defaultAutoDismiss,
      actionUrl: options?.actionUrl,
      actionLabel: options?.actionLabel,
      relatedEntity: options?.relatedEntity,
    };

    // Add to list
    this.notifications.unshift(notification);

    // Trim if necessary
    while (this.notifications.length > this.config.maxNotifications) {
      this.notifications.pop();
    }

    // Dispatch to handlers
    if (this.handlers.onNotification) {
      this.handlers.onNotification(notification);
    }

    // Play sound and haptic
    this.playFeedback(notification);

    return notification;
  }

  /**
   * Get all notifications
   */
  getNotifications(options?: {
    unreadOnly?: boolean;
    type?: NotificationType;
    limit?: number;
  }): RealTimeNotification[] {
    let result = [...this.notifications];

    if (options?.unreadOnly) {
      result = result.filter((n) => !n.read);
    }

    if (options?.type) {
      result = result.filter((n) => n.type === options.type);
    }

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all as read
   */
  markAllAsRead(): void {
    for (const notification of this.notifications) {
      notification.read = true;
    }
  }

  /**
   * Dismiss notification
   */
  dismiss(notificationId: string): boolean {
    const index = this.notifications.findIndex((n) => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications.length = 0;
  }

  // ============================================================================
  // Price Alerts
  // ============================================================================

  /**
   * Create a price alert
   */
  createPriceAlert(
    token: string,
    condition: 'above' | 'below',
    price: number
  ): PriceAlert {
    const alert: PriceAlert = {
      id: `price_alert_${Date.now()}`,
      token,
      condition,
      price,
      triggered: false,
      createdAt: new Date(),
    };

    this.priceAlerts.set(alert.id, alert);

    return alert;
  }

  /**
   * Get all price alerts
   */
  getPriceAlerts(): PriceAlert[] {
    return Array.from(this.priceAlerts.values());
  }

  /**
   * Delete a price alert
   */
  deletePriceAlert(alertId: string): boolean {
    return this.priceAlerts.delete(alertId);
  }

  /**
   * Check price alerts against current prices
   */
  checkPriceAlerts(prices: Record<string, number>): void {
    for (const alert of this.priceAlerts.values()) {
      if (alert.triggered) continue;

      const currentPrice = prices[alert.token];
      if (currentPrice === undefined) continue;

      const triggered =
        (alert.condition === 'above' && currentPrice >= alert.price) ||
        (alert.condition === 'below' && currentPrice <= alert.price);

      if (triggered) {
        alert.triggered = true;
        alert.triggeredAt = new Date();

        // Create notification
        this.notify('price_alert', {
          token: alert.token,
          direction: alert.condition,
          price: currentPrice.toFixed(2),
        });

        // Call handler
        if (this.handlers.onPriceAlert) {
          this.handlers.onPriceAlert(alert, currentPrice);
        }
      }
    }
  }

  // ============================================================================
  // Portfolio Alerts
  // ============================================================================

  /**
   * Create a portfolio alert
   */
  createPortfolioAlert(type: 'gain' | 'loss', threshold: number): PortfolioAlert {
    const alert: PortfolioAlert = {
      id: `portfolio_alert_${Date.now()}`,
      type,
      threshold,
      triggered: false,
      createdAt: new Date(),
    };

    this.portfolioAlerts.set(alert.id, alert);

    return alert;
  }

  /**
   * Get all portfolio alerts
   */
  getPortfolioAlerts(): PortfolioAlert[] {
    return Array.from(this.portfolioAlerts.values());
  }

  /**
   * Delete a portfolio alert
   */
  deletePortfolioAlert(alertId: string): boolean {
    return this.portfolioAlerts.delete(alertId);
  }

  /**
   * Check portfolio alerts against current value
   */
  checkPortfolioAlerts(portfolio: PortfolioSummary): void {
    if (!this.lastPortfolio) {
      this.lastPortfolio = portfolio;
      return;
    }

    const changePercent =
      ((portfolio.totalValueUSD - this.lastPortfolio.totalValueUSD) /
        this.lastPortfolio.totalValueUSD) *
      100;

    for (const alert of this.portfolioAlerts.values()) {
      if (alert.triggered) continue;

      const triggered =
        (alert.type === 'gain' && changePercent >= alert.threshold) ||
        (alert.type === 'loss' && changePercent <= -alert.threshold);

      if (triggered) {
        alert.triggered = true;
        alert.triggeredAt = new Date();

        // Create notification
        this.notify('portfolio_update', {
          changePercent: changePercent.toFixed(2),
          type: alert.type,
        });
      }
    }

    this.lastPortfolio = portfolio;
  }

  // ============================================================================
  // Real-Time Updates
  // ============================================================================

  /**
   * Start real-time updates
   */
  startRealTimeUpdates(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.fetchRealTimeUpdates();
    }, this.config.realTimeInterval);
  }

  /**
   * Process real-time update
   */
  processUpdate(update: RealTimeUpdate): void {
    switch (update.type) {
      case 'portfolio':
        this.handlePortfolioUpdate(update.data as PortfolioSummary);
        break;

      case 'price':
        this.handlePriceUpdate(update.data as Record<string, number>);
        break;

      case 'transaction':
        this.handleTransactionUpdate(update.data as TransactionSummary);
        break;

      case 'strategy':
        this.handleStrategyUpdate(update.data as StrategyUpdate);
        break;
    }

    // Notify handler
    if (this.handlers.onRealTimeUpdate) {
      this.handlers.onRealTimeUpdate(update);
    }
  }

  /**
   * Simulate transaction completion notification
   */
  notifyTransactionComplete(transaction: TransactionSummary): void {
    this.notify('transaction_complete', {
      type: transaction.type,
      amount: transaction.amount,
      token: transaction.token,
    }, {
      relatedEntity: {
        type: 'transaction',
        id: transaction.id,
      },
    });
  }

  /**
   * Simulate transaction failure notification
   */
  notifyTransactionFailed(
    transaction: Partial<TransactionSummary>,
    reason: string
  ): void {
    this.notify('transaction_failed', {
      type: transaction.type ?? 'Transaction',
      amount: transaction.amount ?? 0,
      token: transaction.token ?? 'tokens',
      reason,
    });
  }

  /**
   * Notify strategy execution
   */
  notifyStrategyExecution(strategyName: string, action: string): void {
    this.notify('strategy_executed', {
      strategyName,
      action,
    });
  }

  /**
   * Notify risk warning
   */
  notifyRiskWarning(message: string): void {
    this.notify('risk_warning', { message });
  }

  /**
   * Notify achievement
   */
  notifyAchievement(achievementName: string, description: string): void {
    this.notify('achievement', {
      achievementName,
      description,
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private shouldNotify(type: NotificationType): boolean {
    if (!this.preferences?.pushEnabled) {
      return false;
    }

    switch (type) {
      case 'transaction_complete':
      case 'transaction_failed':
        return this.preferences.transactions;
      case 'price_alert':
        return this.preferences.priceAlerts;
      case 'strategy_executed':
      case 'strategy_paused':
        return this.preferences.strategyUpdates;
      case 'risk_warning':
        return this.preferences.riskAlerts;
      default:
        return true;
    }
  }

  private interpolate(template: string, params: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : `{${key}}`;
    });
  }

  private playFeedback(notification: RealTimeNotification): void {
    // Sound
    if (this.config.enableSound && this.shouldNotify(notification.type)) {
      // In production, this would play actual sounds
      // console.log(`[Sound] ${notification.type}`);
    }

    // Haptic
    if (this.config.enableHaptic && notification.severity !== 'info') {
      // In production, this would trigger device haptic feedback
      // console.log(`[Haptic] ${notification.severity}`);
    }
  }

  private async fetchRealTimeUpdates(): Promise<void> {
    // In production, this would fetch from WebSocket or polling API
    // For now, simulate periodic updates
  }

  private handlePortfolioUpdate(portfolio: PortfolioSummary): void {
    this.checkPortfolioAlerts(portfolio);

    if (this.handlers.onPortfolioUpdate) {
      this.handlers.onPortfolioUpdate(portfolio);
    }
  }

  private handlePriceUpdate(prices: Record<string, number>): void {
    this.checkPriceAlerts(prices);
  }

  private handleTransactionUpdate(transaction: TransactionSummary): void {
    if (this.handlers.onTransactionUpdate) {
      this.handlers.onTransactionUpdate(transaction);
    }

    // Auto-notify based on status
    if (transaction.status === 'confirmed') {
      this.notifyTransactionComplete(transaction);
    } else if (transaction.status === 'failed') {
      this.notifyTransactionFailed(transaction, 'Transaction failed');
    }
  }

  private handleStrategyUpdate(update: StrategyUpdate): void {
    if (update.event === 'executed') {
      this.notifyStrategyExecution(update.strategyName, update.details);
    } else if (update.event === 'paused') {
      this.notify('strategy_paused', {
        strategyName: update.strategyName,
        reason: update.details,
      });
    }
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Strategy update event
 */
interface StrategyUpdate {
  strategyId: string;
  strategyName: string;
  event: 'executed' | 'paused' | 'resumed' | 'stopped' | 'error';
  details: string;
}

// ============================================================================
// Toast Manager (For UI)
// ============================================================================

/**
 * Toast configuration
 */
export interface ToastConfig {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

/**
 * Toast manager for displaying transient messages
 */
export class ToastManager {
  private readonly toasts: Toast[] = [];
  private readonly maxToasts: number = 3;
  private onToastAdded?: (toast: Toast) => void;
  private onToastRemoved?: (toastId: string) => void;

  /**
   * Set handlers
   */
  setHandlers(handlers: {
    onToastAdded?: (toast: Toast) => void;
    onToastRemoved?: (toastId: string) => void;
  }): void {
    this.onToastAdded = handlers.onToastAdded;
    this.onToastRemoved = handlers.onToastRemoved;
  }

  /**
   * Show a toast
   */
  show(config: ToastConfig): string {
    const toast: Toast = {
      id: `toast_${Date.now()}`,
      ...config,
      duration: config.duration ?? 3000,
      createdAt: new Date(),
    };

    this.toasts.push(toast);

    // Remove oldest if over max
    while (this.toasts.length > this.maxToasts) {
      const removed = this.toasts.shift();
      if (removed && this.onToastRemoved) {
        this.onToastRemoved(removed.id);
      }
    }

    // Notify
    if (this.onToastAdded) {
      this.onToastAdded(toast);
    }

    // Auto-dismiss
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(toast.id);
      }, toast.duration);
    }

    return toast.id;
  }

  /**
   * Show success toast
   */
  success(message: string, duration?: number): string {
    return this.show({ message, type: 'success', duration });
  }

  /**
   * Show error toast
   */
  error(message: string, duration?: number): string {
    return this.show({ message, type: 'error', duration: duration ?? 5000 });
  }

  /**
   * Show warning toast
   */
  warning(message: string, duration?: number): string {
    return this.show({ message, type: 'warning', duration });
  }

  /**
   * Show info toast
   */
  info(message: string, duration?: number): string {
    return this.show({ message, type: 'info', duration });
  }

  /**
   * Dismiss a toast
   */
  dismiss(toastId: string): void {
    const index = this.toasts.findIndex((t) => t.id === toastId);
    if (index !== -1) {
      this.toasts.splice(index, 1);
      if (this.onToastRemoved) {
        this.onToastRemoved(toastId);
      }
    }
  }

  /**
   * Get all active toasts
   */
  getToasts(): Toast[] {
    return [...this.toasts];
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    const ids = this.toasts.map((t) => t.id);
    this.toasts.length = 0;
    for (const id of ids) {
      if (this.onToastRemoved) {
        this.onToastRemoved(id);
      }
    }
  }
}

/**
 * Toast instance
 */
export interface Toast extends ToastConfig {
  id: string;
  createdAt: Date;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a NotificationManager
 */
export function createNotificationManager(
  config?: Partial<NotificationConfig>
): NotificationManager {
  return new NotificationManager(config);
}

/**
 * Create a ToastManager
 */
export function createToastManager(): ToastManager {
  return new ToastManager();
}
