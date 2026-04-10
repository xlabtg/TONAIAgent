/**
 * TONAIAgent - Multi-Channel Alerting
 *
 * Routes structured alert events to one or more delivery channels:
 *   - Console (always active, zero-config)
 *   - Telegram bot (optional, requires bot token + chat ID)
 *   - PagerDuty (optional, requires routing key)
 *   - OpsGenie (optional, requires API key + team name)
 *   - Webhook (optional, generic HTTP POST)
 *
 * Design goals:
 *   - Each channel is independently configurable.
 *   - A failing channel never blocks other channels.
 *   - The manager is synchronous-safe (async fire-and-forget delivery).
 *
 * Implements Issue #313: Monitoring, Alerting, and Incident Response
 *
 * Usage:
 *   const manager = createAlertingManager({
 *     telegram: { botToken: process.env.TG_BOT_TOKEN!, chatId: '-100...' },
 *     pagerDuty: { routingKey: process.env.PD_ROUTING_KEY! },
 *   });
 *   manager.send(alert);  // fire-and-forget
 */

import { createLogger } from './logger';
import type { Logger } from './logger';
import type { AlertEvent, AlertSeverity } from '../alerts/alerts';

// ============================================================================
// Channel configurations
// ============================================================================

/**
 * Telegram bot channel configuration.
 * Use BotFather to create a bot and obtain a token.
 * The chatId can be a private user ID, group ID, or channel ID.
 */
export interface TelegramConfig {
  /** Bot API token (format: 1234567890:ABC-…) */
  botToken: string;
  /** Target chat ID (negative for groups/channels, positive for DMs) */
  chatId: string;
  /** Optional: override Telegram API base URL (default: api.telegram.org) */
  apiBaseUrl?: string;
}

/**
 * PagerDuty Events v2 integration configuration.
 * Create an integration of type "Events API v2" in your PagerDuty service.
 */
export interface PagerDutyConfig {
  /** Integration routing key from the PagerDuty service */
  routingKey: string;
  /** Optional: override Events API URL */
  eventsApiUrl?: string;
}

/**
 * OpsGenie Alerts API configuration.
 * Create a REST API integration in your OpsGenie team.
 */
export interface OpsGenieConfig {
  /** API key from the OpsGenie REST API integration */
  apiKey: string;
  /** OpsGenie team name to route alerts to */
  teamName: string;
  /** Optional: override API base URL (default: api.opsgenie.com) */
  apiBaseUrl?: string;
}

/**
 * Generic HTTP webhook configuration.
 * The alerting manager POSTs a JSON body containing the alert event.
 */
export interface WebhookConfig {
  /** Full URL to POST alerts to */
  url: string;
  /** Optional: HTTP headers to attach (e.g. Authorization) */
  headers?: Record<string, string>;
  /** Optional: minimum severity to dispatch via this webhook */
  minSeverity?: AlertSeverity;
}

/**
 * Top-level alerting configuration.
 * Any combination of channels is valid (all are optional).
 */
export interface AlertingConfig {
  telegram?: TelegramConfig;
  pagerDuty?: PagerDutyConfig;
  opsGenie?: OpsGenieConfig;
  webhooks?: WebhookConfig[];
  /** Minimum severity to dispatch to external channels (default: 'warning') */
  minSeverity?: AlertSeverity;
}

// ============================================================================
// Delivery result
// ============================================================================

/** Result of a single channel delivery attempt. */
export interface ChannelDeliveryResult {
  channel: string;
  success: boolean;
  error?: string;
}

/** Aggregated delivery result for one alert. */
export interface AlertDeliveryResult {
  alertId: string;
  results: ChannelDeliveryResult[];
  dispatchedAt: string;
}

// ============================================================================
// Severity ordering
// ============================================================================

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

function severityMeetsMinimum(severity: AlertSeverity, min: AlertSeverity): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[min];
}

// ============================================================================
// AlertingManager
// ============================================================================

/**
 * Routes alert events to all configured delivery channels.
 *
 * Each channel is delivered concurrently; a failure in one channel does not
 * block the others.  Delivery is fire-and-forget from the caller's perspective
 * (call `send()` and do not `await` if you want non-blocking behaviour).
 */
export class AlertingManager {
  private readonly config: AlertingConfig;
  private readonly log: Logger;
  private readonly deliveryHistory: AlertDeliveryResult[] = [];

  constructor(config: AlertingConfig = {}, logger?: Logger) {
    this.config = config;
    this.log = logger ?? createLogger('alerting-manager');
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Dispatch the alert to all configured channels.
   * Returns a combined delivery result for observability/testing.
   */
  async send(alert: AlertEvent): Promise<AlertDeliveryResult> {
    const minSeverity = this.config.minSeverity ?? 'warning';

    const promises: Promise<ChannelDeliveryResult>[] = [];

    // Console is always active — log every alert regardless of severity.
    promises.push(this._deliverConsole(alert));

    if (severityMeetsMinimum(alert.severity, minSeverity)) {
      if (this.config.telegram) {
        promises.push(this._deliverTelegram(alert, this.config.telegram));
      }
      if (this.config.pagerDuty) {
        promises.push(this._deliverPagerDuty(alert, this.config.pagerDuty));
      }
      if (this.config.opsGenie) {
        promises.push(this._deliverOpsGenie(alert, this.config.opsGenie));
      }
      for (const webhook of this.config.webhooks ?? []) {
        const webhookMin = webhook.minSeverity ?? minSeverity;
        if (severityMeetsMinimum(alert.severity, webhookMin)) {
          promises.push(this._deliverWebhook(alert, webhook));
        }
      }
    }

    const results = await Promise.all(promises);
    const deliveryResult: AlertDeliveryResult = {
      alertId: alert.alertId,
      results,
      dispatchedAt: new Date().toISOString(),
    };

    this.deliveryHistory.push(deliveryResult);
    return deliveryResult;
  }

  /**
   * Delivery history (useful for debugging and tests).
   * Returns a shallow copy of the array.
   */
  getDeliveryHistory(): AlertDeliveryResult[] {
    return [...this.deliveryHistory];
  }

  /** Clear delivery history. */
  clearHistory(): void {
    this.deliveryHistory.length = 0;
  }

  /** Active configuration (read-only). */
  getConfig(): Readonly<AlertingConfig> {
    return this.config;
  }

  // --------------------------------------------------------------------------
  // Channel implementations
  // --------------------------------------------------------------------------

  private async _deliverConsole(alert: AlertEvent): Promise<ChannelDeliveryResult> {
    const label = `[ALERT/${alert.severity.toUpperCase()}]`;
    const msg = `${label} ${alert.type} — ${alert.message}`;
    if (alert.severity === 'critical') {
      this.log.error(msg, { alertId: alert.alertId, context: alert.context });
    } else if (alert.severity === 'warning') {
      this.log.warn(msg, { alertId: alert.alertId, context: alert.context });
    } else {
      this.log.info(msg, { alertId: alert.alertId, context: alert.context });
    }
    return { channel: 'console', success: true };
  }

  private async _deliverTelegram(
    alert: AlertEvent,
    cfg: TelegramConfig
  ): Promise<ChannelDeliveryResult> {
    const base = cfg.apiBaseUrl ?? 'https://api.telegram.org';
    const url = `${base}/bot${cfg.botToken}/sendMessage`;

    const severityEmoji: Record<AlertSeverity, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
    };

    const text =
      `${severityEmoji[alert.severity]} *TONAIAgent Alert*\n` +
      `*Type:* \`${alert.type}\`\n` +
      `*Severity:* ${alert.severity.toUpperCase()}\n` +
      `*Message:* ${alert.message}\n` +
      (alert.agentId ? `*Agent:* \`${alert.agentId}\`\n` : '') +
      `*Time:* ${alert.firedAt}`;

    return this._post('telegram', url, {
      chat_id: cfg.chatId,
      text,
      parse_mode: 'Markdown',
    });
  }

  private async _deliverPagerDuty(
    alert: AlertEvent,
    cfg: PagerDutyConfig
  ): Promise<ChannelDeliveryResult> {
    const url =
      cfg.eventsApiUrl ?? 'https://events.pagerduty.com/v2/enqueue';

    const severityMap: Record<AlertSeverity, string> = {
      info: 'info',
      warning: 'warning',
      critical: 'critical',
    };

    const body = {
      routing_key: cfg.routingKey,
      event_action: 'trigger',
      dedup_key: alert.alertId,
      payload: {
        summary: `[${alert.type}] ${alert.message}`,
        source: 'TONAIAgent',
        severity: severityMap[alert.severity],
        timestamp: alert.firedAt,
        custom_details: {
          agentId: alert.agentId,
          strategyId: alert.strategyId,
          context: alert.context,
        },
      },
    };

    return this._post('pagerduty', url, body);
  }

  private async _deliverOpsGenie(
    alert: AlertEvent,
    cfg: OpsGenieConfig
  ): Promise<ChannelDeliveryResult> {
    const base = cfg.apiBaseUrl ?? 'https://api.opsgenie.com';
    const url = `${base}/v2/alerts`;

    const priorityMap: Record<AlertSeverity, string> = {
      info: 'P5',
      warning: 'P3',
      critical: 'P1',
    };

    const body = {
      message: `[${alert.type}] ${alert.message}`,
      alias: alert.alertId,
      description: JSON.stringify(alert.context),
      responders: [{ type: 'team', name: cfg.teamName }],
      priority: priorityMap[alert.severity],
      tags: ['TONAIAgent', alert.type, alert.severity],
      details: {
        agentId: alert.agentId ?? '',
        strategyId: alert.strategyId ?? '',
        firedAt: alert.firedAt,
      },
    };

    return this._post('opsgenie', url, body, {
      Authorization: `GenieKey ${cfg.apiKey}`,
    });
  }

  private async _deliverWebhook(
    alert: AlertEvent,
    webhook: WebhookConfig
  ): Promise<ChannelDeliveryResult> {
    return this._post(`webhook:${webhook.url}`, webhook.url, alert, webhook.headers);
  }

  /** Generic JSON POST helper with error isolation. */
  private async _post(
    channel: string,
    url: string,
    body: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<ChannelDeliveryResult> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          channel,
          success: false,
          error: `HTTP ${response.status}: ${text.slice(0, 200)}`,
        };
      }

      return { channel, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.warn(`Alert delivery failed [${channel}]`, { error: msg });
      return { channel, success: false, error: msg };
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a configured AlertingManager.
 *
 * Pass an empty object (or nothing) for a console-only manager,
 * suitable for development and tests.
 */
export function createAlertingManager(
  config: AlertingConfig = {}
): AlertingManager {
  return new AlertingManager(config);
}
