/**
 * TONAIAgent - Notifications Module
 *
 * Real-time alerts for risk, performance, strategy changes, and market opportunities.
 *
 * Features:
 * - Multi-channel notifications (Telegram, push, email)
 * - Configurable notification categories
 * - Quiet hours and batching
 * - Notification history
 * - Action-based notifications
 */

import type {
  NotificationSettings,
  NotificationChannels,
  NotificationCategories,
  QuietHours,
  NotificationFrequency,
  Notification,
  NotificationType,
  NotificationAction,
  AlertSeverity,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface NotificationsConfig {
  defaultChannels: NotificationChannels;
  defaultCategories: NotificationCategories;
  rateLimitPerMinute: number;
  batchIntervalMs: number;
  maxNotificationsPerUser: number;
  retentionDays: number;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  action?: NotificationAction;
  expiresAt?: Date;
}

export interface UpdateSettingsInput {
  channels?: Partial<NotificationChannels>;
  categories?: Partial<NotificationCategories>;
  quietHours?: Partial<QuietHours>;
  frequency?: Partial<NotificationFrequency>;
}

// ============================================================================
// Notification Manager Interface
// ============================================================================

export interface NotificationManager {
  // Settings
  getSettings(userId: string): Promise<NotificationSettings>;
  updateSettings(userId: string, updates: UpdateSettingsInput): Promise<NotificationSettings>;
  resetSettings(userId: string): Promise<NotificationSettings>;

  // Notifications
  send(input: CreateNotificationInput): Promise<Notification>;
  sendBatch(inputs: CreateNotificationInput[]): Promise<Notification[]>;
  get(notificationId: string): Promise<Notification | null>;
  getAll(userId: string, options?: GetNotificationsOptions): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  delete(notificationId: string): Promise<void>;
  deleteAll(userId: string): Promise<void>;

  // Counts
  getUnreadCount(userId: string): Promise<number>;

  // Templates
  sendTradeNotification(userId: string, tradeData: TradeNotificationData): Promise<Notification>;
  sendRiskAlert(userId: string, riskData: RiskAlertData): Promise<Notification>;
  sendPerformanceUpdate(userId: string, perfData: PerformanceNotificationData): Promise<Notification>;
  sendAgentStatusNotification(userId: string, agentData: AgentStatusData): Promise<Notification>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  types?: NotificationType[];
  severities?: AlertSeverity[];
  since?: Date;
}

export interface TradeNotificationData {
  agentId: string;
  agentName: string;
  tradeType: 'buy' | 'sell' | 'swap';
  asset: string;
  amount: number;
  price: number;
  pnl?: number;
  success: boolean;
  error?: string;
}

export interface RiskAlertData {
  agentId?: string;
  agentName?: string;
  alertType: 'drawdown' | 'volatility' | 'concentration' | 'liquidity';
  currentValue: number;
  threshold: number;
  recommendation?: string;
}

export interface PerformanceNotificationData {
  agentId?: string;
  agentName?: string;
  metricType: 'daily_pnl' | 'weekly_pnl' | 'milestone' | 'new_high';
  value: number;
  change: number;
  changePercent: number;
}

export interface AgentStatusData {
  agentId: string;
  agentName: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultNotificationManager implements NotificationManager {
  private readonly config: NotificationsConfig;
  private readonly settings = new Map<string, NotificationSettings>();
  private readonly notifications = new Map<string, Notification>();
  private readonly userNotifications = new Map<string, string[]>();
  private readonly notificationCounts = new Map<string, { count: number; resetAt: number }>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<NotificationsConfig> = {}) {
    this.config = {
      defaultChannels: config.defaultChannels ?? {
        telegram: true,
        push: true,
        email: false,
        sms: false,
      },
      defaultCategories: config.defaultCategories ?? {
        trades: true,
        alerts: true,
        riskWarnings: true,
        performance: true,
        social: true,
        promotions: false,
        systemUpdates: true,
      },
      rateLimitPerMinute: config.rateLimitPerMinute ?? 30,
      batchIntervalMs: config.batchIntervalMs ?? 60000,
      maxNotificationsPerUser: config.maxNotificationsPerUser ?? 1000,
      retentionDays: config.retentionDays ?? 30,
    };
  }

  // ============================================================================
  // Settings
  // ============================================================================

  async getSettings(userId: string): Promise<NotificationSettings> {
    let userSettings = this.settings.get(userId);
    if (!userSettings) {
      userSettings = this.createDefaultSettings(userId);
      this.settings.set(userId, userSettings);
    }
    return userSettings;
  }

  async updateSettings(userId: string, updates: UpdateSettingsInput): Promise<NotificationSettings> {
    const current = await this.getSettings(userId);

    const updated: NotificationSettings = {
      ...current,
      channels: updates.channels ? { ...current.channels, ...updates.channels } : current.channels,
      categories: updates.categories
        ? { ...current.categories, ...updates.categories }
        : current.categories,
      quietHours: updates.quietHours
        ? { ...current.quietHours, ...updates.quietHours }
        : current.quietHours,
      frequency: updates.frequency
        ? { ...current.frequency, ...updates.frequency }
        : current.frequency,
    };

    this.settings.set(userId, updated);
    return updated;
  }

  async resetSettings(userId: string): Promise<NotificationSettings> {
    const defaultSettings = this.createDefaultSettings(userId);
    this.settings.set(userId, defaultSettings);
    return defaultSettings;
  }

  // ============================================================================
  // Notifications
  // ============================================================================

  async send(input: CreateNotificationInput): Promise<Notification> {
    // Check rate limit
    if (!this.checkRateLimit(input.userId)) {
      throw new Error('Rate limit exceeded');
    }

    // Check if notification type is enabled
    const settings = await this.getSettings(input.userId);
    if (!this.isNotificationEnabled(settings, input.type, input.severity)) {
      throw new Error('Notification type is disabled');
    }

    // Check quiet hours
    if (this.isQuietHours(settings) && input.severity !== 'critical') {
      // Queue for later or skip
      throw new Error('Quiet hours active');
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const notification: Notification = {
      id: notificationId,
      userId: input.userId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      data: input.data,
      action: input.action,
      read: false,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
    };

    this.notifications.set(notificationId, notification);

    // Add to user's notification list
    const userNotifs = this.userNotifications.get(input.userId) ?? [];
    userNotifs.unshift(notificationId);

    // Trim to max notifications
    while (userNotifs.length > this.config.maxNotificationsPerUser) {
      const removed = userNotifs.pop();
      if (removed) {
        this.notifications.delete(removed);
      }
    }

    this.userNotifications.set(input.userId, userNotifs);

    // Emit event
    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'notification_sent',
      severity: 'info',
      source: 'notifications',
      userId: input.userId,
      message: `Notification sent: ${input.title}`,
      data: { notificationId, type: input.type, severity: input.severity },
    });

    return notification;
  }

  async sendBatch(inputs: CreateNotificationInput[]): Promise<Notification[]> {
    const results: Notification[] = [];
    for (const input of inputs) {
      try {
        const notification = await this.send(input);
        results.push(notification);
      } catch {
        // Skip failed notifications
      }
    }
    return results;
  }

  async get(notificationId: string): Promise<Notification | null> {
    return this.notifications.get(notificationId) ?? null;
  }

  async getAll(userId: string, options: GetNotificationsOptions = {}): Promise<Notification[]> {
    const userNotifIds = this.userNotifications.get(userId) ?? [];
    let notifications: Notification[] = [];

    for (const id of userNotifIds) {
      const notif = this.notifications.get(id);
      if (notif) {
        notifications.push(notif);
      }
    }

    // Apply filters
    if (options.unreadOnly) {
      notifications = notifications.filter((n) => !n.read);
    }
    if (options.types && options.types.length > 0) {
      notifications = notifications.filter((n) => options.types!.includes(n.type));
    }
    if (options.severities && options.severities.length > 0) {
      notifications = notifications.filter((n) => options.severities!.includes(n.severity));
    }
    if (options.since) {
      notifications = notifications.filter((n) => n.createdAt >= options.since!);
    }

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    return notifications.slice(offset, offset + limit);
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date();
      this.notifications.set(notificationId, notification);

      this.emitEvent({
        id: `event_${Date.now()}`,
        timestamp: new Date(),
        type: 'notification_read',
        severity: 'info',
        source: 'notifications',
        userId: notification.userId,
        message: 'Notification marked as read',
        data: { notificationId },
      });
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const userNotifIds = this.userNotifications.get(userId) ?? [];
    for (const id of userNotifIds) {
      const notification = this.notifications.get(id);
      if (notification && !notification.read) {
        notification.read = true;
        notification.readAt = new Date();
        this.notifications.set(id, notification);
      }
    }
  }

  async delete(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      this.notifications.delete(notificationId);

      const userNotifs = this.userNotifications.get(notification.userId);
      if (userNotifs) {
        const index = userNotifs.indexOf(notificationId);
        if (index > -1) {
          userNotifs.splice(index, 1);
          this.userNotifications.set(notification.userId, userNotifs);
        }
      }
    }
  }

  async deleteAll(userId: string): Promise<void> {
    const userNotifIds = this.userNotifications.get(userId) ?? [];
    for (const id of userNotifIds) {
      this.notifications.delete(id);
    }
    this.userNotifications.set(userId, []);
  }

  // ============================================================================
  // Counts
  // ============================================================================

  async getUnreadCount(userId: string): Promise<number> {
    const userNotifIds = this.userNotifications.get(userId) ?? [];
    let count = 0;
    for (const id of userNotifIds) {
      const notif = this.notifications.get(id);
      if (notif && !notif.read) {
        count++;
      }
    }
    return count;
  }

  // ============================================================================
  // Templates
  // ============================================================================

  async sendTradeNotification(
    userId: string,
    data: TradeNotificationData
  ): Promise<Notification> {
    const title = data.success
      ? `Trade Executed: ${data.tradeType.toUpperCase()} ${data.asset}`
      : `Trade Failed: ${data.tradeType.toUpperCase()} ${data.asset}`;

    const message = data.success
      ? `${data.agentName} executed ${data.tradeType} of ${data.amount} ${data.asset} at $${data.price.toFixed(2)}${
          data.pnl !== undefined ? ` (P&L: ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)})` : ''
        }`
      : `${data.agentName} failed to ${data.tradeType} ${data.amount} ${data.asset}: ${data.error}`;

    return this.send({
      userId,
      type: data.success ? 'trade_executed' : 'trade_failed',
      severity: data.success ? 'info' : 'warning',
      title,
      message,
      data: { ...data },
      action: {
        type: 'open_agent',
        label: 'View Agent',
        data: { agentId: data.agentId },
      },
    });
  }

  async sendRiskAlert(userId: string, data: RiskAlertData): Promise<Notification> {
    const title = `Risk Alert: ${data.alertType.replace('_', ' ').toUpperCase()}`;

    let message: string;
    switch (data.alertType) {
      case 'drawdown':
        message = `Current drawdown of ${data.currentValue.toFixed(1)}% exceeds threshold of ${data.threshold}%`;
        break;
      case 'volatility':
        message = `Volatility at ${data.currentValue.toFixed(1)}% exceeds threshold of ${data.threshold}%`;
        break;
      case 'concentration':
        message = `Position concentration at ${data.currentValue.toFixed(1)}% exceeds threshold of ${data.threshold}%`;
        break;
      case 'liquidity':
        message = `Liquidity risk detected. Current exposure: ${data.currentValue.toFixed(1)}%`;
        break;
      default:
        message = `Risk threshold exceeded: ${data.currentValue} > ${data.threshold}`;
    }

    if (data.agentName) {
      message = `[${data.agentName}] ${message}`;
    }
    if (data.recommendation) {
      message += `. ${data.recommendation}`;
    }

    return this.send({
      userId,
      type: 'risk_alert',
      severity: data.currentValue > data.threshold * 1.5 ? 'critical' : 'warning',
      title,
      message,
      data: { ...data },
      action: data.agentId
        ? {
            type: 'open_agent',
            label: 'View Agent',
            data: { agentId: data.agentId },
          }
        : undefined,
    });
  }

  async sendPerformanceUpdate(
    userId: string,
    data: PerformanceNotificationData
  ): Promise<Notification> {
    let title: string;
    let message: string;

    switch (data.metricType) {
      case 'daily_pnl':
        title = `Daily P&L: ${data.change >= 0 ? '+' : ''}$${data.change.toFixed(2)}`;
        message = `${data.agentName ? `${data.agentName}: ` : ''}Today's performance: ${
          data.changePercent >= 0 ? '+' : ''
        }${data.changePercent.toFixed(2)}%`;
        break;
      case 'weekly_pnl':
        title = `Weekly P&L: ${data.change >= 0 ? '+' : ''}$${data.change.toFixed(2)}`;
        message = `${data.agentName ? `${data.agentName}: ` : ''}This week's performance: ${
          data.changePercent >= 0 ? '+' : ''
        }${data.changePercent.toFixed(2)}%`;
        break;
      case 'milestone':
        title = `Milestone Reached!`;
        message = `${data.agentName ? `${data.agentName} has ` : 'You have '}reached $${data.value.toFixed(2)} in total value`;
        break;
      case 'new_high':
        title = `New All-Time High!`;
        message = `${data.agentName ? `${data.agentName}: ` : ''}New portfolio high of $${data.value.toFixed(2)}`;
        break;
      default:
        title = 'Performance Update';
        message = `Value: $${data.value.toFixed(2)} (${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`;
    }

    return this.send({
      userId,
      type: 'performance_update',
      severity: 'info',
      title,
      message,
      data: { ...data },
      action: data.agentId
        ? {
            type: 'open_agent',
            label: 'View Details',
            data: { agentId: data.agentId },
          }
        : undefined,
    });
  }

  async sendAgentStatusNotification(userId: string, data: AgentStatusData): Promise<Notification> {
    const title = `Agent Status: ${data.agentName}`;
    const message = `Status changed from ${data.previousStatus} to ${data.newStatus}${
      data.reason ? `: ${data.reason}` : ''
    }`;

    return this.send({
      userId,
      type: 'agent_status',
      severity: data.newStatus === 'error' ? 'error' : 'info',
      title,
      message,
      data: { ...data },
      action: {
        type: 'open_agent',
        label: 'View Agent',
        data: { agentId: data.agentId },
      },
    });
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private createDefaultSettings(userId: string): NotificationSettings {
    return {
      userId,
      channels: { ...this.config.defaultChannels },
      categories: { ...this.config.defaultCategories },
      quietHours: {
        enabled: false,
        startTime: '23:00',
        endTime: '07:00',
        timezone: 'UTC',
        exceptCritical: true,
      },
      frequency: {
        instantCritical: true,
        batchNonCritical: false,
        batchIntervalMinutes: 15,
        digestEnabled: false,
        digestTime: '09:00',
      },
    };
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const counter = this.notificationCounts.get(userId);

    if (!counter || counter.resetAt < now) {
      this.notificationCounts.set(userId, {
        count: 1,
        resetAt: now + 60000,
      });
      return true;
    }

    if (counter.count >= this.config.rateLimitPerMinute) {
      return false;
    }

    counter.count++;
    return true;
  }

  private isNotificationEnabled(
    settings: NotificationSettings,
    type: NotificationType,
    severity: AlertSeverity
  ): boolean {
    // Critical notifications are always enabled
    if (severity === 'critical') return true;

    // Check if any channel is enabled
    const hasChannel = Object.values(settings.channels).some(Boolean);
    if (!hasChannel) return false;

    // Map notification type to category
    const categoryMap: Record<NotificationType, keyof NotificationCategories> = {
      trade_executed: 'trades',
      trade_failed: 'trades',
      risk_alert: 'riskWarnings',
      price_alert: 'alerts',
      drawdown_warning: 'riskWarnings',
      performance_update: 'performance',
      agent_status: 'alerts',
      social_activity: 'social',
      system_announcement: 'systemUpdates',
      approval_required: 'alerts',
      opportunity: 'promotions',
    };

    const category = categoryMap[type];
    return category ? settings.categories[category] : true;
  }

  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = settings.quietHours.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes < endMinutes) {
      return currentTime >= startMinutes && currentTime < endMinutes;
    } else {
      return currentTime >= startMinutes || currentTime < endMinutes;
    }
  }

  private emitEvent(event: SuperAppEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createNotificationManager(
  config?: Partial<NotificationsConfig>
): DefaultNotificationManager {
  return new DefaultNotificationManager(config);
}

export default DefaultNotificationManager;
