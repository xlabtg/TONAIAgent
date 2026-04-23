/**
 * E2E tests for the Simulation Mode Banner (security.js – SimulationBanner)
 *
 * Covers:
 *  - Banner renders with "SIMULATION MODE" text when tradingMode === 'simulation'
 *  - Banner renders with "LIVE TRADING" text when tradingMode === 'live'
 *  - "Switch to Live" CTA label regression (simulation mode)
 *  - "Back to Simulation" CTA label regression (live mode)
 *  - Banner is always present in the DOM regardless of mode
 *
 * API calls are intercepted so no backend is required.
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { TMA_SHIM_SCRIPT, API_MOCKS } from './helpers/tma-shim';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../../docs/screenshots');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stub out API calls that app.js fires on startup so they resolve quickly. */
async function stubStartupApis(page: Page) {
  // app.js fires API.request('/healthz') and Portfolio.refresh() on startup
  await page.route('**/healthz', (route) =>
    route.fulfill({ status: 200, body: 'ok' }));
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{}}' }));
}

/**
 * Load the mini-app page with the TMA shim and a pre-set localStorage agentId.
 * Waits for app.js to finish its startup and reveal #main-content.
 */
async function loadPage(page: Page, tradingMode: 'simulation' | 'live') {
  await stubStartupApis(page);

  // Intercept the agent API so the banner reflects the mocked mode
  await page.route('**/agents/agent-1', (route) => {
    const mock = tradingMode === 'live' ? API_MOCKS.agentLive : API_MOCKS.agentSimulation;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock) });
  });

  // Inject TMA shim before any page script runs
  await page.addInitScript(TMA_SHIM_SCRIPT);

  // Seed localStorage: agentId so syncFromServer() fires; live flag as initial cache
  await page.addInitScript(`
    localStorage.setItem('tonai_current_agent_id', 'agent-1');
    localStorage.setItem('tonai_live_trading_enabled', '${tradingMode === 'live' ? 'true' : 'false'}');
    // Skip the first-time onboarding overlay
    localStorage.setItem('tonai_onboarding_complete', 'true');
  `);

  await page.goto('/');

  // Wait for app.js startup: it fires tg:ready which unhides #main-content
  await page.waitForSelector('#main-content:not(.hidden)', { timeout: 10_000 });
  await page.waitForSelector('#simulation-mode-banner');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Simulation Mode Banner', () => {
  test('renders SIMULATION MODE text when tradingMode is simulation', async ({ page }) => {
    await loadPage(page, 'simulation');

    const bannerText = await page.locator('#simulation-mode-banner .simulation-banner-text').textContent();
    expect(bannerText).toContain('SIMULATION MODE');
    expect(bannerText).toContain('No real funds at risk');

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'banner-simulation-mode.png'),
      fullPage: false,
      clip: { x: 0, y: 0, width: 390, height: 200 },
    });
  });

  test('renders LIVE TRADING text when tradingMode is live', async ({ page }) => {
    await loadPage(page, 'live');

    // Wait for syncFromServer to update the banner after the API response
    await page.waitForFunction(() => {
      const text = document.querySelector('#simulation-mode-banner .simulation-banner-text')?.textContent ?? '';
      return text.includes('LIVE TRADING');
    }, undefined, { timeout: 10_000 });

    const bannerText = await page.locator('#simulation-mode-banner .simulation-banner-text').textContent();
    expect(bannerText).toContain('LIVE TRADING');
    expect(bannerText).toContain('Real funds in use');

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'banner-live-trading-mode.png'),
      fullPage: false,
      clip: { x: 0, y: 0, width: 390, height: 200 },
    });
  });

  test('banner is always present in the DOM', async ({ page }) => {
    await loadPage(page, 'simulation');
    const banner = page.locator('#simulation-mode-banner');
    await expect(banner).toBeVisible();
  });

  test('does not show LIVE TRADING when tradingMode is simulation', async ({ page }) => {
    await loadPage(page, 'simulation');
    const bannerText = await page.locator('#simulation-mode-banner .simulation-banner-text').textContent();
    expect(bannerText).not.toContain('LIVE TRADING');
  });

  test('does not show SIMULATION MODE when tradingMode is live', async ({ page }) => {
    await loadPage(page, 'live');

    await page.waitForFunction(() => {
      const text = document.querySelector('#simulation-mode-banner .simulation-banner-text')?.textContent ?? '';
      return text.includes('LIVE TRADING');
    }, undefined, { timeout: 10_000 });

    const bannerText = await page.locator('#simulation-mode-banner .simulation-banner-text').textContent();
    expect(bannerText).not.toContain('SIMULATION MODE');
  });

  test.describe('CTA label regression', () => {
    test('"Switch to Live" button label is present in simulation mode', async ({ page }) => {
      await loadPage(page, 'simulation');
      const btn = page.locator('#switch-to-live-btn');
      await expect(btn).toBeVisible();
      await expect(btn).toHaveText('Switch to Live');
    });

    test('"Back to Simulation" button label is present in live mode', async ({ page }) => {
      await loadPage(page, 'live');

      await page.waitForFunction(() => {
        const btn = document.getElementById('switch-to-live-btn');
        return btn?.textContent?.includes('Back to Simulation');
      }, undefined, { timeout: 10_000 });

      const btn = page.locator('#switch-to-live-btn');
      await expect(btn).toHaveText('Back to Simulation');

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'banner-cta-back-to-simulation.png'),
        fullPage: false,
        clip: { x: 0, y: 0, width: 390, height: 200 },
      });
    });
  });

  test('banner has live-mode-banner CSS class in live mode', async ({ page }) => {
    await loadPage(page, 'live');

    await page.waitForFunction(() => {
      const banner = document.getElementById('simulation-mode-banner');
      return banner?.classList.contains('live-mode-banner');
    }, undefined, { timeout: 10_000 });

    const banner = page.locator('#simulation-mode-banner');
    await expect(banner).toHaveClass(/live-mode-banner/);
  });

  test('banner does NOT have live-mode-banner CSS class in simulation mode', async ({ page }) => {
    await loadPage(page, 'simulation');
    const banner = page.locator('#simulation-mode-banner');
    await expect(banner).not.toHaveClass(/live-mode-banner/);
  });
});
