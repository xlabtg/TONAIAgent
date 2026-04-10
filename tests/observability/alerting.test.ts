/**
 * Tests for AlertingManager (Issue #313)
 *
 * Covers:
 * - createAlertingManager factory
 * - Console channel always active (all severities)
 * - minSeverity filtering: alerts below min are delivered only to console
 * - getDeliveryHistory / clearHistory
 * - AlertDeliveryResult shape
 * - Telegram / PagerDuty / OpsGenie / Webhook channels (mocked via fetch)
 * - A failing channel does not block others
 * - Webhook minSeverity override
 * - getConfig returns active configuration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import {
  AlertingManager,
  createAlertingManager,
} from '../../services/observability/alerting';

import type {
  AlertingConfig,
  AlertDeliveryResult,
  ChannelDeliveryResult,
} from '../../services/observability/alerting';

import type { AlertEvent } from '../../services/alerts';

// ============================================================================
// Helpers
// ============================================================================

let fetchSpy: ReturnType<typeof vi.spyOn>;

function mockFetchSuccess() {
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 })
  );
}

function mockFetchFailure(status = 500) {
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('Internal Server Error', { status })
  );
}

function mockFetchNetworkError() {
  fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('network error'));
}

function makeAlert(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    alertId: `alert_${Date.now()}`,
    type: 'high_drawdown',
    severity: 'warning',
    message: 'Test alert',
    context: { drawdownPct: -6 },
    firedAt: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// createAlertingManager factory
// ============================================================================

describe('createAlertingManager', () => {
  it('should return an AlertingManager instance', () => {
    const mgr = createAlertingManager();
    expect(mgr).toBeInstanceOf(AlertingManager);
  });

  it('should accept empty config (console-only)', () => {
    const mgr = createAlertingManager({});
    expect(mgr).toBeInstanceOf(AlertingManager);
  });

  it('should store config via getConfig()', () => {
    const mgr = createAlertingManager({ minSeverity: 'critical' });
    expect(mgr.getConfig().minSeverity).toBe('critical');
  });
});

// ============================================================================
// Console channel
// ============================================================================

describe('console channel', () => {
  it('should always deliver to console regardless of severity', async () => {
    const mgr = createAlertingManager({ minSeverity: 'critical' });
    const result = await mgr.send(makeAlert({ severity: 'info' }));
    const console_ = result.results.find((r) => r.channel === 'console');
    expect(console_).toBeDefined();
    expect(console_?.success).toBe(true);
  });

  it('should deliver warning alerts to console', async () => {
    const mgr = createAlertingManager();
    const result = await mgr.send(makeAlert({ severity: 'warning' }));
    const console_ = result.results.find((r) => r.channel === 'console');
    expect(console_?.success).toBe(true);
  });

  it('should deliver critical alerts to console', async () => {
    const mgr = createAlertingManager();
    const result = await mgr.send(makeAlert({ severity: 'critical' }));
    const console_ = result.results.find((r) => r.channel === 'console');
    expect(console_?.success).toBe(true);
  });
});

// ============================================================================
// minSeverity filtering
// ============================================================================

describe('minSeverity filtering', () => {
  it('should NOT dispatch to external channels when severity < minSeverity', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      minSeverity: 'critical',
      telegram: { botToken: 'token', chatId: '-100' },
    });
    const result = await mgr.send(makeAlert({ severity: 'info' }));
    // Only console should be in results; no telegram
    expect(result.results.some((r) => r.channel === 'telegram')).toBe(false);
  });

  it('should dispatch to external channels when severity >= minSeverity', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      minSeverity: 'warning',
      telegram: { botToken: 'token', chatId: '-100' },
    });
    const result = await mgr.send(makeAlert({ severity: 'warning' }));
    expect(result.results.some((r) => r.channel === 'telegram')).toBe(true);
  });

  it('default minSeverity should be warning', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      telegram: { botToken: 'token', chatId: '-100' },
    });
    // info should NOT reach telegram
    const infoResult = await mgr.send(makeAlert({ severity: 'info' }));
    expect(infoResult.results.some((r) => r.channel === 'telegram')).toBe(false);
    // warning SHOULD reach telegram
    const warnResult = await mgr.send(makeAlert({ severity: 'warning' }));
    expect(warnResult.results.some((r) => r.channel === 'telegram')).toBe(true);
  });
});

// ============================================================================
// Delivery history
// ============================================================================

describe('delivery history', () => {
  it('should accumulate delivery results', async () => {
    const mgr = createAlertingManager();
    await mgr.send(makeAlert());
    await mgr.send(makeAlert());
    expect(mgr.getDeliveryHistory()).toHaveLength(2);
  });

  it('should clear history', async () => {
    const mgr = createAlertingManager();
    await mgr.send(makeAlert());
    mgr.clearHistory();
    expect(mgr.getDeliveryHistory()).toHaveLength(0);
  });

  it('getDeliveryHistory should return a copy (mutation does not affect internal state)', async () => {
    const mgr = createAlertingManager();
    await mgr.send(makeAlert());
    const history = mgr.getDeliveryHistory();
    history.pop();
    expect(mgr.getDeliveryHistory()).toHaveLength(1);
  });
});

// ============================================================================
// AlertDeliveryResult shape
// ============================================================================

describe('AlertDeliveryResult shape', () => {
  it('should have alertId, results, and dispatchedAt', async () => {
    const mgr = createAlertingManager();
    const alert = makeAlert();
    const result = await mgr.send(alert);
    expect(result.alertId).toBe(alert.alertId);
    expect(Array.isArray(result.results)).toBe(true);
    expect(typeof result.dispatchedAt).toBe('string');
    expect(new Date(result.dispatchedAt).getTime()).toBeGreaterThan(0);
  });

  it('ChannelDeliveryResult should have channel and success', async () => {
    const mgr = createAlertingManager();
    const result = await mgr.send(makeAlert());
    const first = result.results[0] as ChannelDeliveryResult;
    expect(typeof first.channel).toBe('string');
    expect(typeof first.success).toBe('boolean');
  });
});

// ============================================================================
// Telegram channel
// ============================================================================

describe('Telegram channel', () => {
  it('should call the Telegram API with correct parameters', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      telegram: { botToken: 'TEST_TOKEN', chatId: '-100test' },
    });
    await mgr.send(makeAlert({ severity: 'warning' }));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('TEST_TOKEN/sendMessage'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should report success when Telegram returns 200', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      telegram: { botToken: 'token', chatId: '-100' },
    });
    const result = await mgr.send(makeAlert({ severity: 'warning' }));
    const tg = result.results.find((r) => r.channel === 'telegram');
    expect(tg?.success).toBe(true);
  });

  it('should report failure when Telegram returns 5xx', async () => {
    mockFetchFailure(500);
    const mgr = createAlertingManager({
      telegram: { botToken: 'token', chatId: '-100' },
    });
    const result = await mgr.send(makeAlert({ severity: 'warning' }));
    const tg = result.results.find((r) => r.channel === 'telegram');
    expect(tg?.success).toBe(false);
    expect(tg?.error).toBeDefined();
  });

  it('should support custom apiBaseUrl', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      telegram: { botToken: 'token', chatId: '-100', apiBaseUrl: 'https://custom.example.com' },
    });
    await mgr.send(makeAlert({ severity: 'warning' }));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('custom.example.com'),
      expect.anything()
    );
  });
});

// ============================================================================
// PagerDuty channel
// ============================================================================

describe('PagerDuty channel', () => {
  it('should call the PagerDuty Events API', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      pagerDuty: { routingKey: 'ROUTING_KEY_123' },
    });
    await mgr.send(makeAlert({ severity: 'critical' }));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('pagerduty.com'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should report success when PagerDuty returns 202', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'success' }), { status: 202 })
    );
    const mgr = createAlertingManager({
      pagerDuty: { routingKey: 'key' },
    });
    const result = await mgr.send(makeAlert({ severity: 'critical' }));
    const pd = result.results.find((r) => r.channel === 'pagerduty');
    expect(pd?.success).toBe(true);
  });

  it('should report failure when PagerDuty returns 4xx', async () => {
    mockFetchFailure(400);
    const mgr = createAlertingManager({
      pagerDuty: { routingKey: 'bad_key' },
    });
    const result = await mgr.send(makeAlert({ severity: 'critical' }));
    const pd = result.results.find((r) => r.channel === 'pagerduty');
    expect(pd?.success).toBe(false);
  });
});

// ============================================================================
// OpsGenie channel
// ============================================================================

describe('OpsGenie channel', () => {
  it('should call the OpsGenie Alerts API', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      opsGenie: { apiKey: 'OG_KEY', teamName: 'platform-team' },
    });
    await mgr.send(makeAlert({ severity: 'critical' }));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('opsgenie.com'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should include GenieKey Authorization header', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      opsGenie: { apiKey: 'MY_KEY', teamName: 'team' },
    });
    await mgr.send(makeAlert({ severity: 'critical' }));
    const [, init] = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('opsgenie')
    )!;
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('GenieKey MY_KEY');
  });

  it('should support custom apiBaseUrl', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      opsGenie: { apiKey: 'key', teamName: 'team', apiBaseUrl: 'https://api.eu.opsgenie.com' },
    });
    await mgr.send(makeAlert({ severity: 'critical' }));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('api.eu.opsgenie.com'),
      expect.anything()
    );
  });
});

// ============================================================================
// Webhook channel
// ============================================================================

describe('Webhook channel', () => {
  it('should POST to the configured webhook URL', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      webhooks: [{ url: 'https://hooks.example.com/alert' }],
    });
    await mgr.send(makeAlert({ severity: 'warning' }));
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://hooks.example.com/alert',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should attach custom headers to webhook request', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      webhooks: [{ url: 'https://hooks.example.com/alert', headers: { 'X-Secret': 'abc' } }],
    });
    await mgr.send(makeAlert({ severity: 'warning' }));
    const [, init] = fetchSpy.mock.calls[0]!;
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['X-Secret']).toBe('abc');
  });

  it('should respect per-webhook minSeverity', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      minSeverity: 'warning',
      webhooks: [{ url: 'https://hooks.example.com/critical', minSeverity: 'critical' }],
    });
    const result = await mgr.send(makeAlert({ severity: 'warning' }));
    // Webhook should NOT be called for warning (webhook minSeverity is critical)
    expect(result.results.some((r) => r.channel.includes('hooks.example.com'))).toBe(false);
  });

  it('should dispatch to webhook when severity meets per-webhook minSeverity', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      webhooks: [{ url: 'https://hooks.example.com/critical', minSeverity: 'critical' }],
    });
    const result = await mgr.send(makeAlert({ severity: 'critical' }));
    expect(result.results.some((r) => r.channel.includes('hooks.example.com'))).toBe(true);
  });

  it('should support multiple webhooks', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      webhooks: [
        { url: 'https://hook1.example.com' },
        { url: 'https://hook2.example.com' },
      ],
    });
    const result = await mgr.send(makeAlert({ severity: 'warning' }));
    const webhookResults = result.results.filter((r) => r.channel.includes('example.com'));
    expect(webhookResults).toHaveLength(2);
  });
});

// ============================================================================
// Channel failure isolation
// ============================================================================

describe('channel failure isolation', () => {
  it('should continue delivering to other channels when one fails (network error)', async () => {
    mockFetchNetworkError();
    const mgr = createAlertingManager({
      telegram: { botToken: 'token', chatId: '-100' },
      pagerDuty: { routingKey: 'key' },
    });
    const result = await mgr.send(makeAlert({ severity: 'critical' }));
    // Console should still succeed
    const console_ = result.results.find((r) => r.channel === 'console');
    expect(console_?.success).toBe(true);
    // Telegram and PagerDuty both fail, but overall send() should not throw
    expect(result.results).toBeDefined();
  });

  it('should report individual channel failures without throwing', async () => {
    mockFetchNetworkError();
    const mgr = createAlertingManager({
      telegram: { botToken: 'token', chatId: '-100' },
    });
    const result = await mgr.send(makeAlert({ severity: 'warning' }));
    const tg = result.results.find((r) => r.channel === 'telegram');
    expect(tg?.success).toBe(false);
    expect(typeof tg?.error).toBe('string');
  });

  it('should not throw when all external channels fail', async () => {
    mockFetchNetworkError();
    const mgr = createAlertingManager({
      telegram: { botToken: 'token', chatId: '-100' },
      pagerDuty: { routingKey: 'key' },
      opsGenie: { apiKey: 'key', teamName: 'team' },
    });
    await expect(mgr.send(makeAlert({ severity: 'critical' }))).resolves.not.toThrow();
  });
});

// ============================================================================
// All channels active
// ============================================================================

describe('all channels active', () => {
  it('should deliver to console + telegram + pagerduty + opsgenie + webhook', async () => {
    mockFetchSuccess();
    const mgr = createAlertingManager({
      minSeverity: 'info',
      telegram: { botToken: 'tok', chatId: '-100' },
      pagerDuty: { routingKey: 'key' },
      opsGenie: { apiKey: 'key', teamName: 'team' },
      webhooks: [{ url: 'https://hook.example.com' }],
    });
    const result = await mgr.send(makeAlert({ severity: 'critical' }));
    const channels = result.results.map((r) => r.channel);
    expect(channels).toContain('console');
    expect(channels).toContain('telegram');
    expect(channels).toContain('pagerduty');
    expect(channels).toContain('opsgenie');
    expect(channels.some((c) => c.includes('hook.example.com'))).toBe(true);
  });
});
