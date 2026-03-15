/**
 * TONAIAgent - Portfolio Activity Log and Notifications
 *
 * Tracks all portfolio-related activities including strategy deployments,
 * capital allocation changes, and trade executions. Supports platform
 * notifications and Telegram integration for team awareness.
 */

import {
  ActivityLogEntry,
  ActivityType,
  ActivitySeverity,
  NotificationRecord,
  PortfolioRoleName,
  MultiUserPortfolioEvent,
  MultiUserPortfolioEventCallback,
} from './types';

// ============================================================================
// Activity Log Input Types
// ============================================================================

export interface RecordActivityInput {
  portfolioId: string;
  actorId: string;
  actorRole: PortfolioRoleName;
  type: ActivityType;
  title: string;
  description: string;
  severity?: ActivitySeverity;
  metadata?: Record<string, unknown>;
  notifyUserIds?: string[];
}

export interface ActivityLogFilter {
  portfolioId?: string;
  actorId?: string;
  types?: ActivityType[];
  severity?: ActivitySeverity[];
  since?: Date;
  until?: Date;
  limit?: number;
}

export interface NotificationConfig {
  telegramChatId?: string;
  enablePlatformNotifications: boolean;
  enableTelegramNotifications: boolean;
  notifyOnSeverity: ActivitySeverity[];
}

// ============================================================================
// Activity Log Manager Interface
// ============================================================================

export interface ActivityLogManager {
  recordActivity(input: RecordActivityInput): Promise<ActivityLogEntry>;
  getEntry(entryId: string): ActivityLogEntry | undefined;
  listEntries(filter: ActivityLogFilter): ActivityLogEntry[];
  getPortfolioActivity(
    portfolioId: string,
    options?: { limit?: number; since?: Date },
  ): ActivityLogEntry[];
  getUserActivity(userId: string, portfolioId?: string): ActivityLogEntry[];

  setNotificationConfig(portfolioId: string, config: NotificationConfig): void;
  getNotificationConfig(portfolioId: string): NotificationConfig | undefined;

  onEvent(callback: MultiUserPortfolioEventCallback): void;
}

// ============================================================================
// Default Activity Log Manager Implementation
// ============================================================================

const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  enablePlatformNotifications: true,
  enableTelegramNotifications: false,
  notifyOnSeverity: ['warning', 'critical'],
};

export class DefaultActivityLogManager implements ActivityLogManager {
  private readonly entries = new Map<string, ActivityLogEntry>();
  private readonly portfolioEntryIds = new Map<string, string[]>();
  private readonly notificationConfigs = new Map<string, NotificationConfig>();
  private readonly eventCallbacks: MultiUserPortfolioEventCallback[] = [];
  private sequence = 0;

  async recordActivity(input: RecordActivityInput): Promise<ActivityLogEntry> {
    const seq = ++this.sequence;
    const entryId = `activity_${Date.now()}_${seq}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const severity = input.severity ?? 'info';

    // Determine which notifications to send
    const notifications: NotificationRecord[] = [];
    const config = this.notificationConfigs.get(input.portfolioId) ?? DEFAULT_NOTIFICATION_CONFIG;

    if (config.notifyOnSeverity.includes(severity) && input.notifyUserIds) {
      for (const recipientId of input.notifyUserIds) {
        if (config.enablePlatformNotifications) {
          notifications.push({
            channel: 'platform',
            sentAt: now,
            recipientId,
            success: true, // In a real implementation, this would call a notification service
          });
        }

        if (config.enableTelegramNotifications && config.telegramChatId) {
          notifications.push({
            channel: 'telegram',
            sentAt: now,
            recipientId,
            success: true, // In a real implementation, this would call the Telegram Bot API
          });
        }
      }
    }

    const entry: ActivityLogEntry = {
      id: entryId,
      portfolioId: input.portfolioId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      type: input.type,
      severity,
      title: input.title,
      description: input.description,
      metadata: input.metadata ?? {},
      timestamp: now,
      notificationsSent: notifications,
    };

    this.entries.set(entryId, entry);

    // Track by portfolio
    const portfolioIds = this.portfolioEntryIds.get(input.portfolioId) ?? [];
    this.portfolioEntryIds.set(input.portfolioId, [...portfolioIds, entryId]);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: this.activityTypeToEventType(input.type),
      portfolioId: input.portfolioId,
      actorId: input.actorId,
      severity: severity === 'info' ? 'info' : severity === 'warning' ? 'warning' : 'critical',
      source: 'ActivityLogManager',
      message: input.title,
      data: {
        entryId,
        type: input.type,
        notificationsSent: notifications.length,
      },
    });

    return entry;
  }

  getEntry(entryId: string): ActivityLogEntry | undefined {
    return this.entries.get(entryId);
  }

  listEntries(filter: ActivityLogFilter): ActivityLogEntry[] {
    let entries = Array.from(this.entries.values());

    if (filter.portfolioId) {
      entries = entries.filter(e => e.portfolioId === filter.portfolioId);
    }
    if (filter.actorId) {
      entries = entries.filter(e => e.actorId === filter.actorId);
    }
    if (filter.types && filter.types.length > 0) {
      entries = entries.filter(e => filter.types!.includes(e.type));
    }
    if (filter.severity && filter.severity.length > 0) {
      entries = entries.filter(e => filter.severity!.includes(e.severity));
    }
    if (filter.since) {
      entries = entries.filter(e => e.timestamp >= filter.since!);
    }
    if (filter.until) {
      entries = entries.filter(e => e.timestamp <= filter.until!);
    }

    // Sort by most recent first; use sequence number as stable tiebreaker
    entries.sort((a, b) => {
      const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      // Extract sequence number from ID format: activity_<timestamp>_<seq>_<random>
      const seqA = parseInt(a.id.split('_')[2] ?? '0', 10);
      const seqB = parseInt(b.id.split('_')[2] ?? '0', 10);
      return seqB - seqA;
    });

    if (filter.limit && filter.limit > 0) {
      entries = entries.slice(0, filter.limit);
    }

    return entries;
  }

  getPortfolioActivity(
    portfolioId: string,
    options?: { limit?: number; since?: Date },
  ): ActivityLogEntry[] {
    return this.listEntries({
      portfolioId,
      since: options?.since,
      limit: options?.limit,
    });
  }

  getUserActivity(userId: string, portfolioId?: string): ActivityLogEntry[] {
    return this.listEntries({
      actorId: userId,
      portfolioId,
    });
  }

  setNotificationConfig(portfolioId: string, config: NotificationConfig): void {
    this.notificationConfigs.set(portfolioId, config);
  }

  getNotificationConfig(portfolioId: string): NotificationConfig | undefined {
    return this.notificationConfigs.get(portfolioId);
  }

  onEvent(callback: MultiUserPortfolioEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private activityTypeToEventType(
    type: ActivityType,
  ): MultiUserPortfolioEvent['type'] {
    const typeMap: Partial<Record<ActivityType, MultiUserPortfolioEvent['type']>> = {
      portfolio_created: 'portfolio_created',
      portfolio_updated: 'portfolio_updated',
      member_added: 'member_added',
      member_removed: 'member_removed',
      strategy_proposed: 'strategy_proposed',
      strategy_approved: 'strategy_approved',
      strategy_rejected: 'strategy_rejected',
      trade_executed: 'trade_executed',
      fund_created: 'fund_created',
      report_generated: 'report_generated',
    };
    return typeMap[type] ?? 'portfolio_updated';
  }

  private emitEvent(event: MultiUserPortfolioEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore callback errors */ }
    }
  }
}

export function createActivityLogManager(): DefaultActivityLogManager {
  return new DefaultActivityLogManager();
}
