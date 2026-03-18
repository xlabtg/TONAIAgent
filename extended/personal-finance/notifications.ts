/**
 * TONAIAgent - Notifications & Nudges Module
 *
 * Smart notification system with behavioral nudges for savings reminders,
 * investment opportunities, risk warnings, goal encouragement, and celebration.
 */

import {
  NotificationConfig,
  NotificationPreferences,
  QuietHoursConfig,
  Notification,
  NotificationType,
  NotificationCategory,
  NotificationAction,
  Nudge,
  NudgeType,
  NudgeContext,
  NudgeTrigger,
  SuggestedAction,
  NotificationsConfig,
  PersonalFinanceEvent,
  PersonalFinanceEventCallback,
} from './types';

// ============================================================================
// Notification Manager Interface
// ============================================================================

export interface NotificationManager {
  readonly config: NotificationsConfig;

  // Configuration
  configureNotifications(userId: string, config: NotificationConfig): Promise<void>;
  getNotificationConfig(userId: string): Promise<NotificationConfig | null>;
  updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationConfig>;

  // Notification management
  sendNotification(notification: SendNotificationParams): Promise<Notification>;
  getNotifications(userId: string, filters?: NotificationFilters): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  dismissNotification(notificationId: string): Promise<void>;
  clearNotifications(userId: string, category?: NotificationCategory): Promise<number>;

  // Nudges
  createNudge(params: CreateNudgeParams): Promise<Nudge>;
  sendNudge(nudgeId: string): Promise<NudgeSendResult>;
  getUserNudges(userId: string, status?: string): Promise<Nudge[]>;
  recordNudgeOutcome(nudgeId: string, outcome: NudgeOutcome): Promise<void>;
  getEffectiveNudges(userId: string): Promise<NudgeAnalytics>;

  // Scheduled notifications
  scheduleNotification(params: ScheduleNotificationParams): Promise<ScheduledNotification>;
  cancelScheduledNotification(scheduleId: string): Promise<void>;
  getScheduledNotifications(userId: string): Promise<ScheduledNotification[]>;

  // Smart triggers
  registerTrigger(trigger: NotificationTrigger): Promise<string>;
  removeTrigger(triggerId: string): Promise<void>;
  evaluateTriggers(userId: string, context: TriggerContext): Promise<TriggeredNotification[]>;

  // Analytics
  getNotificationStats(userId: string): Promise<NotificationStats>;
  getNudgeEffectiveness(userId: string): Promise<NudgeEffectivenessReport>;

  // Configuration
  updateConfig(config: Partial<NotificationsConfig>): void;

  // Events
  onEvent(callback: PersonalFinanceEventCallback): void;
}

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  action?: NotificationAction;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface NotificationFilters {
  type?: NotificationType;
  category?: NotificationCategory;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'dismissed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  since?: Date;
  limit?: number;
}

export interface CreateNudgeParams {
  userId: string;
  type: NudgeType;
  message: string;
  context: NudgeContext;
  trigger: NudgeTrigger;
  action?: SuggestedAction;
  scheduledFor?: Date;
}

export interface NudgeSendResult {
  nudgeId: string;
  sent: boolean;
  channel?: string;
  error?: string;
}

export interface NudgeOutcome {
  opened: boolean;
  actedOn: boolean;
  feedback?: 'helpful' | 'not_helpful' | 'annoying';
  actualBehavior?: string;
}

export interface NudgeAnalytics {
  totalNudges: number;
  openRate: number;
  actionRate: number;
  mostEffectiveTypes: Array<{ type: NudgeType; effectiveness: number }>;
  recommendedFrequency: 'low' | 'medium' | 'high';
}

export interface ScheduleNotificationParams {
  userId: string;
  notification: Omit<SendNotificationParams, 'userId'>;
  scheduledFor: Date;
  recurring?: RecurringConfig;
}

export interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  endDate?: Date;
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  notification: Omit<SendNotificationParams, 'userId'>;
  scheduledFor: Date;
  recurring?: RecurringConfig;
  status: 'scheduled' | 'sent' | 'cancelled';
  lastSentAt?: Date;
  nextRunAt?: Date;
}

export interface NotificationTrigger {
  id?: string;
  userId: string;
  name: string;
  condition: TriggerCondition;
  notification: Omit<SendNotificationParams, 'userId'>;
  cooldownMinutes: number;
  enabled: boolean;
}

export interface TriggerCondition {
  type: 'market_change' | 'goal_progress' | 'savings_reminder' | 'risk_alert' | 'inactivity' | 'custom';
  parameters: Record<string, unknown>;
}

export interface TriggerContext {
  marketChange?: number;
  goalProgress?: Record<string, number>;
  lastActivity?: Date;
  portfolioValue?: number;
  riskLevel?: number;
}

export interface TriggeredNotification {
  triggerId: string;
  notification: Notification;
  triggerReason: string;
}

export interface NotificationStats {
  totalSent: number;
  totalRead: number;
  totalDismissed: number;
  readRate: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  avgResponseTimeMs: number;
}

export interface NudgeEffectivenessReport {
  totalNudges: number;
  responseRate: number;
  actionRate: number;
  helpfulRate: number;
  byType: NudgeTypeStats[];
  recommendations: string[];
}

export interface NudgeTypeStats {
  type: NudgeType;
  count: number;
  openRate: number;
  actionRate: number;
  helpfulRate: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultNotificationManager implements NotificationManager {
  private _config: NotificationsConfig;
  private readonly userConfigs: Map<string, NotificationConfig> = new Map();
  private readonly notifications: Map<string, Notification> = new Map();
  private readonly userNotifications: Map<string, string[]> = new Map();
  private readonly nudges: Map<string, Nudge> = new Map();
  private readonly userNudges: Map<string, string[]> = new Map();
  private readonly scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private readonly triggers: Map<string, NotificationTrigger> = new Map();
  private readonly triggerCooldowns: Map<string, Date> = new Map();
  private readonly eventCallbacks: PersonalFinanceEventCallback[] = [];

  constructor(config?: Partial<NotificationsConfig>) {
    this._config = {
      enabled: true,
      maxDailyNotifications: 10,
      nudgeFrequency: 'medium',
      digestEnabled: true,
      ...config,
    };
  }

  get config(): NotificationsConfig {
    return this._config;
  }

  async configureNotifications(userId: string, config: NotificationConfig): Promise<void> {
    this.userConfigs.set(userId, config);
  }

  async getNotificationConfig(userId: string): Promise<NotificationConfig | null> {
    return this.userConfigs.get(userId) ?? null;
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationConfig> {
    let config = this.userConfigs.get(userId);
    if (!config) {
      config = this.createDefaultConfig(userId);
    }

    config.preferences = { ...config.preferences, ...preferences };
    this.userConfigs.set(userId, config);

    return config;
  }

  async sendNotification(params: SendNotificationParams): Promise<Notification> {
    // Check if notifications are enabled for this user
    const config = this.userConfigs.get(params.userId);
    if (config && !config.enabled) {
      throw new Error('Notifications are disabled for this user');
    }

    // Check quiet hours
    if (config && this.isInQuietHours(config.quietHours)) {
      if (params.priority !== 'urgent') {
        throw new Error('Cannot send non-urgent notification during quiet hours');
      }
    }

    // Check daily limit
    const todayNotifications = await this.getNotifications(params.userId, {
      since: new Date(new Date().setHours(0, 0, 0, 0)),
    });
    if (todayNotifications.length >= this._config.maxDailyNotifications) {
      throw new Error('Daily notification limit reached');
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const notification: Notification = {
      id: notificationId,
      userId: params.userId,
      type: params.type,
      category: params.category,
      title: params.title,
      message: params.message,
      priority: params.priority ?? 'medium',
      action: params.action,
      status: 'sent',
      createdAt: new Date(),
      sentAt: new Date(),
      expiresAt: params.expiresAt,
      metadata: params.metadata ?? {},
    };

    this.notifications.set(notificationId, notification);

    // Track user notifications
    const userNotifs = this.userNotifications.get(params.userId) ?? [];
    userNotifs.push(notificationId);
    this.userNotifications.set(params.userId, userNotifs);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'notification_sent',
      userId: params.userId,
      action: 'notification_sent',
      resource: 'notification',
      resourceId: notificationId,
      details: {
        type: params.type,
        category: params.category,
        priority: params.priority,
      },
      metadata: {},
    });

    return notification;
  }

  async getNotifications(
    userId: string,
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    const notificationIds = this.userNotifications.get(userId) ?? [];
    let notifications: Notification[] = [];

    for (const id of notificationIds) {
      const notification = this.notifications.get(id);
      if (notification) {
        notifications.push(notification);
      }
    }

    // Apply filters
    if (filters) {
      if (filters.type) {
        notifications = notifications.filter(n => n.type === filters.type);
      }
      if (filters.category) {
        notifications = notifications.filter(n => n.category === filters.category);
      }
      if (filters.status) {
        notifications = notifications.filter(n => n.status === filters.status);
      }
      if (filters.priority) {
        notifications = notifications.filter(n => n.priority === filters.priority);
      }
      if (filters.since) {
        notifications = notifications.filter(n => n.createdAt >= filters.since!);
      }
      if (filters.limit) {
        notifications = notifications.slice(-filters.limit);
      }
    }

    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'read';
      notification.readAt = new Date();
      this.notifications.set(notificationId, notification);
    }
  }

  async dismissNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'dismissed';
      this.notifications.set(notificationId, notification);
    }
  }

  async clearNotifications(userId: string, category?: NotificationCategory): Promise<number> {
    const notificationIds = this.userNotifications.get(userId) ?? [];
    let cleared = 0;

    for (const id of notificationIds) {
      const notification = this.notifications.get(id);
      if (notification) {
        if (!category || notification.category === category) {
          notification.status = 'dismissed';
          this.notifications.set(id, notification);
          cleared++;
        }
      }
    }

    return cleared;
  }

  async createNudge(params: CreateNudgeParams): Promise<Nudge> {
    const nudgeId = `nudge_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const nudge: Nudge = {
      id: nudgeId,
      userId: params.userId,
      type: params.type,
      message: params.message,
      context: params.context,
      trigger: params.trigger,
      action: params.action,
      effectiveness: {
        opened: false,
        actedOn: false,
      },
      status: params.scheduledFor ? 'scheduled' : 'sent',
      createdAt: new Date(),
    };

    this.nudges.set(nudgeId, nudge);

    // Track user nudges
    const userNudgeIds = this.userNudges.get(params.userId) ?? [];
    userNudgeIds.push(nudgeId);
    this.userNudges.set(params.userId, userNudgeIds);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'nudge_sent',
      userId: params.userId,
      action: 'nudge_created',
      resource: 'nudge',
      resourceId: nudgeId,
      details: {
        type: params.type,
        trigger: params.trigger.type,
      },
      metadata: {},
    });

    return nudge;
  }

  async sendNudge(nudgeId: string): Promise<NudgeSendResult> {
    const nudge = this.nudges.get(nudgeId);
    if (!nudge) {
      return {
        nudgeId,
        sent: false,
        error: 'Nudge not found',
      };
    }

    // Check user config
    const config = this.userConfigs.get(nudge.userId);
    if (config && !config.preferences.behavioralNudges) {
      return {
        nudgeId,
        sent: false,
        error: 'Behavioral nudges disabled for user',
      };
    }

    // Send the nudge (would integrate with actual notification channels)
    nudge.status = 'sent';
    nudge.sentAt = new Date();
    this.nudges.set(nudgeId, nudge);

    return {
      nudgeId,
      sent: true,
      channel: 'in_app',
    };
  }

  async getUserNudges(userId: string, status?: string): Promise<Nudge[]> {
    const nudgeIds = this.userNudges.get(userId) ?? [];
    let nudges: Nudge[] = [];

    for (const id of nudgeIds) {
      const nudge = this.nudges.get(id);
      if (nudge) {
        nudges.push(nudge);
      }
    }

    if (status) {
      nudges = nudges.filter(n => n.status === status);
    }

    return nudges;
  }

  async recordNudgeOutcome(nudgeId: string, outcome: NudgeOutcome): Promise<void> {
    const nudge = this.nudges.get(nudgeId);
    if (nudge) {
      nudge.effectiveness = {
        opened: outcome.opened,
        actedOn: outcome.actedOn,
        feedback: outcome.feedback,
      };
      if (outcome.actedOn) {
        nudge.status = 'acted_on';
      } else if (outcome.feedback === 'not_helpful' || outcome.feedback === 'annoying') {
        nudge.status = 'dismissed';
      }
      this.nudges.set(nudgeId, nudge);
    }
  }

  async getEffectiveNudges(userId: string): Promise<NudgeAnalytics> {
    const nudges = await this.getUserNudges(userId);

    const totalNudges = nudges.length;
    const opened = nudges.filter(n => n.effectiveness.opened).length;
    const actedOn = nudges.filter(n => n.effectiveness.actedOn).length;

    // Calculate effectiveness by type
    const typeStats: Map<NudgeType, { total: number; effective: number }> = new Map();
    for (const nudge of nudges) {
      const stat = typeStats.get(nudge.type) ?? { total: 0, effective: 0 };
      stat.total++;
      if (nudge.effectiveness.actedOn) {
        stat.effective++;
      }
      typeStats.set(nudge.type, stat);
    }

    const mostEffectiveTypes = Array.from(typeStats.entries())
      .map(([type, stat]) => ({
        type,
        effectiveness: stat.total > 0 ? stat.effective / stat.total : 0,
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness);

    // Determine recommended frequency
    const openRate = totalNudges > 0 ? opened / totalNudges : 0;
    let recommendedFrequency: 'low' | 'medium' | 'high' = 'medium';
    if (openRate > 0.7) {
      recommendedFrequency = 'high';
    } else if (openRate < 0.3) {
      recommendedFrequency = 'low';
    }

    return {
      totalNudges,
      openRate,
      actionRate: totalNudges > 0 ? actedOn / totalNudges : 0,
      mostEffectiveTypes,
      recommendedFrequency,
    };
  }

  async scheduleNotification(params: ScheduleNotificationParams): Promise<ScheduledNotification> {
    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const scheduled: ScheduledNotification = {
      id: scheduleId,
      userId: params.userId,
      notification: params.notification,
      scheduledFor: params.scheduledFor,
      recurring: params.recurring,
      status: 'scheduled',
      nextRunAt: params.scheduledFor,
    };

    this.scheduledNotifications.set(scheduleId, scheduled);

    return scheduled;
  }

  async cancelScheduledNotification(scheduleId: string): Promise<void> {
    const scheduled = this.scheduledNotifications.get(scheduleId);
    if (scheduled) {
      scheduled.status = 'cancelled';
      this.scheduledNotifications.set(scheduleId, scheduled);
    }
  }

  async getScheduledNotifications(userId: string): Promise<ScheduledNotification[]> {
    const scheduled: ScheduledNotification[] = [];

    for (const sched of this.scheduledNotifications.values()) {
      if (sched.userId === userId && sched.status === 'scheduled') {
        scheduled.push(sched);
      }
    }

    return scheduled;
  }

  async registerTrigger(trigger: NotificationTrigger): Promise<string> {
    const triggerId = trigger.id ?? `trigger_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    trigger.id = triggerId;

    this.triggers.set(triggerId, trigger);

    return triggerId;
  }

  async removeTrigger(triggerId: string): Promise<void> {
    this.triggers.delete(triggerId);
  }

  async evaluateTriggers(userId: string, context: TriggerContext): Promise<TriggeredNotification[]> {
    const triggered: TriggeredNotification[] = [];

    for (const [triggerId, trigger] of this.triggers) {
      if (trigger.userId !== userId || !trigger.enabled) {
        continue;
      }

      // Check cooldown
      const cooldownKey = `${userId}_${triggerId}`;
      const cooldownUntil = this.triggerCooldowns.get(cooldownKey);
      if (cooldownUntil && cooldownUntil.getTime() > Date.now()) {
        continue;
      }

      // Evaluate condition
      const shouldTrigger = this.evaluateCondition(trigger.condition, context);
      if (shouldTrigger) {
        const notification = await this.sendNotification({
          userId,
          ...trigger.notification,
        });

        triggered.push({
          triggerId,
          notification,
          triggerReason: this.getTriggerReason(trigger.condition, context),
        });

        // Set cooldown
        this.triggerCooldowns.set(
          cooldownKey,
          new Date(Date.now() + trigger.cooldownMinutes * 60 * 1000)
        );
      }
    }

    return triggered;
  }

  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const notifications = await this.getNotifications(userId);

    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalRead = 0;
    let totalDismissed = 0;
    let totalResponseTime = 0;
    let readCount = 0;

    for (const notification of notifications) {
      byCategory[notification.category] = (byCategory[notification.category] ?? 0) + 1;
      byType[notification.type] = (byType[notification.type] ?? 0) + 1;

      if (notification.status === 'read') {
        totalRead++;
        if (notification.sentAt && notification.readAt) {
          totalResponseTime += notification.readAt.getTime() - notification.sentAt.getTime();
          readCount++;
        }
      } else if (notification.status === 'dismissed') {
        totalDismissed++;
      }
    }

    return {
      totalSent: notifications.length,
      totalRead,
      totalDismissed,
      readRate: notifications.length > 0 ? totalRead / notifications.length : 0,
      byCategory,
      byType,
      avgResponseTimeMs: readCount > 0 ? totalResponseTime / readCount : 0,
    };
  }

  async getNudgeEffectiveness(userId: string): Promise<NudgeEffectivenessReport> {
    const nudges = await this.getUserNudges(userId);

    const typeStatsMap: Map<NudgeType, NudgeTypeStats> = new Map();
    let totalOpened = 0;
    let totalActedOn = 0;
    let totalHelpful = 0;

    for (const nudge of nudges) {
      // Get or create type stats
      let typeStats = typeStatsMap.get(nudge.type);
      if (!typeStats) {
        typeStats = {
          type: nudge.type,
          count: 0,
          openRate: 0,
          actionRate: 0,
          helpfulRate: 0,
        };
        typeStatsMap.set(nudge.type, typeStats);
      }

      typeStats.count++;
      if (nudge.effectiveness.opened) {
        totalOpened++;
      }
      if (nudge.effectiveness.actedOn) {
        totalActedOn++;
      }
      if (nudge.effectiveness.feedback === 'helpful') {
        totalHelpful++;
      }
    }

    // Calculate rates for each type
    const byType: NudgeTypeStats[] = [];
    for (const [type, _typeNudges] of typeStatsMap) {
      const nudgesOfType = nudges.filter(n => n.type === type);
      const stats: NudgeTypeStats = {
        type,
        count: nudgesOfType.length,
        openRate: nudgesOfType.filter(n => n.effectiveness.opened).length / nudgesOfType.length,
        actionRate: nudgesOfType.filter(n => n.effectiveness.actedOn).length / nudgesOfType.length,
        helpfulRate: nudgesOfType.filter(n => n.effectiveness.feedback === 'helpful').length / nudgesOfType.length,
      };
      byType.push(stats);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (totalOpened / nudges.length < 0.3) {
      recommendations.push('Consider reducing nudge frequency - users are not engaging');
    }
    if (totalActedOn / nudges.length > 0.5) {
      recommendations.push('Nudges are effective! Consider adding more targeted nudges');
    }

    const lowPerformingTypes = byType.filter(t => t.actionRate < 0.2);
    for (const type of lowPerformingTypes) {
      recommendations.push(`Consider adjusting ${type.type} nudges - low action rate`);
    }

    return {
      totalNudges: nudges.length,
      responseRate: nudges.length > 0 ? totalOpened / nudges.length : 0,
      actionRate: nudges.length > 0 ? totalActedOn / nudges.length : 0,
      helpfulRate: nudges.length > 0 ? totalHelpful / nudges.length : 0,
      byType,
      recommendations,
    };
  }

  updateConfig(config: Partial<NotificationsConfig>): void {
    this._config = { ...this._config, ...config };
  }

  onEvent(callback: PersonalFinanceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Convenience Methods for Common Notifications
  // ============================================================================

  async sendSavingsReminder(userId: string, amount: number, goalName?: string): Promise<Notification> {
    return this.sendNotification({
      userId,
      type: 'reminder',
      category: 'savings',
      title: 'Time to Save!',
      message: goalName
        ? `Don't forget to save $${amount} toward your "${goalName}" goal.`
        : `Consider saving $${amount} today to stay on track.`,
      priority: 'medium',
      action: {
        type: 'take_action',
        label: 'Save Now',
        parameters: { action: 'save', amount },
      },
    });
  }

  async sendGoalProgress(userId: string, goalName: string, progress: number): Promise<Notification> {
    const type: NotificationType = progress >= 100 ? 'achievement' : 'insight';
    const title = progress >= 100
      ? 'Goal Achieved!'
      : `You're ${progress}% to your goal!`;
    const message = progress >= 100
      ? `Congratulations! You've reached your "${goalName}" goal!`
      : `Keep going! You're making great progress on "${goalName}".`;

    return this.sendNotification({
      userId,
      type,
      category: 'goal',
      title,
      message,
      priority: progress >= 100 ? 'high' : 'low',
      action: {
        type: 'view_goal',
        label: 'View Goal',
      },
    });
  }

  async sendRiskWarning(userId: string, message: string, severity: 'low' | 'medium' | 'high'): Promise<Notification> {
    const priority = severity === 'high' ? 'urgent' : severity === 'medium' ? 'high' : 'medium';

    return this.sendNotification({
      userId,
      type: 'warning',
      category: 'risk',
      title: 'Risk Alert',
      message,
      priority,
      action: {
        type: 'view_portfolio',
        label: 'Review Portfolio',
      },
    });
  }

  async sendInvestmentOpportunity(userId: string, title: string, description: string): Promise<Notification> {
    return this.sendNotification({
      userId,
      type: 'opportunity',
      category: 'investment',
      title,
      message: description,
      priority: 'medium',
      action: {
        type: 'take_action',
        label: 'Learn More',
      },
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private createDefaultConfig(userId: string): NotificationConfig {
    return {
      userId,
      enabled: true,
      channels: [
        { type: 'in_app', enabled: true },
        { type: 'push', enabled: true },
        { type: 'email', enabled: false },
      ],
      preferences: {
        marketAlerts: true,
        goalProgress: true,
        savingsReminders: true,
        investmentOpportunities: true,
        riskWarnings: true,
        educationalContent: true,
        behavioralNudges: true,
        weeklyDigest: true,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
        excludeUrgent: true,
      },
    };
  }

  private isInQuietHours(quietHours: QuietHoursConfig): boolean {
    if (!quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;

    const [startHour, startMinutes] = quietHours.start.split(':').map(Number);
    const [endHour, endMinutes] = quietHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMinutes;
    const endTime = endHour * 60 + endMinutes;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  private evaluateCondition(condition: TriggerCondition, context: TriggerContext): boolean {
    switch (condition.type) {
      case 'market_change':
        if (context.marketChange !== undefined) {
          const threshold = condition.parameters.threshold as number ?? 5;
          return Math.abs(context.marketChange) >= threshold;
        }
        return false;

      case 'goal_progress':
        if (context.goalProgress) {
          const targetProgress = condition.parameters.threshold as number ?? 90;
          return Object.values(context.goalProgress).some(p => p >= targetProgress);
        }
        return false;

      case 'inactivity':
        if (context.lastActivity) {
          const daysSinceActivity = condition.parameters.days as number ?? 7;
          const msPerDay = 24 * 60 * 60 * 1000;
          return Date.now() - context.lastActivity.getTime() > daysSinceActivity * msPerDay;
        }
        return false;

      case 'risk_alert':
        if (context.riskLevel !== undefined) {
          const threshold = condition.parameters.threshold as number ?? 70;
          return context.riskLevel >= threshold;
        }
        return false;

      case 'savings_reminder':
        // Always trigger on configured days
        const dayOfMonth = new Date().getDate();
        const triggerDays = condition.parameters.days as number[] ?? [1, 15];
        return triggerDays.includes(dayOfMonth);

      default:
        return false;
    }
  }

  private getTriggerReason(condition: TriggerCondition, context: TriggerContext): string {
    switch (condition.type) {
      case 'market_change':
        return `Market changed by ${context.marketChange?.toFixed(1)}%`;
      case 'goal_progress':
        return 'Goal progress milestone reached';
      case 'inactivity':
        return 'User has been inactive';
      case 'risk_alert':
        return 'Risk level exceeded threshold';
      case 'savings_reminder':
        return 'Scheduled savings reminder';
      default:
        return 'Trigger condition met';
    }
  }

  private emitEvent(event: PersonalFinanceEvent): void {
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
