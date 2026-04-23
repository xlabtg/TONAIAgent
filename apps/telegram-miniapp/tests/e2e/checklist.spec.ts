/**
 * E2E tests for the Mainnet Readiness Checklist (checklist.js – Checklist)
 *
 * Covers:
 *  - Checklist panel opens when tonai:show_checklist event is dispatched
 *  - Panel renders all mandatory items
 *  - Each mandatory item shows a "Required" badge
 *  - "I understand" button is present for un-acknowledged items
 *  - Acknowledged items show a checkmark and no "I understand" button
 *  - Enable Live Trading button is disabled when checklist is incomplete
 *  - Enable Live Trading button becomes enabled when all mandatory items are acknowledged
 *  - Acknowledging an item sends POST to correct API endpoint
 *  - Checklist close button dismisses the panel
 *  - Risk disclosures reference is present in the page
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

async function stubStartupApis(page: Page) {
  await page.route('**/healthz', (route) =>
    route.fulfill({ status: 200, body: 'ok' }));
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{}}' }));
}

async function loadPage(page: Page) {
  await stubStartupApis(page);

  await page.route('**/agents/agent-1', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(API_MOCKS.agentSimulation),
    });
  });

  await page.addInitScript(TMA_SHIM_SCRIPT);
  await page.addInitScript(`
    localStorage.setItem('tonai_current_agent_id', 'agent-1');
    localStorage.setItem('tonai_live_trading_enabled', 'false');
    // Skip the first-time onboarding overlay
    localStorage.setItem('tonai_onboarding_complete', 'true');
  `);

  await page.goto('/');
  await page.waitForSelector('#main-content:not(.hidden)', { timeout: 10_000 });
}

async function openChecklist(page: Page, mockData = API_MOCKS.checklistPending) {
  await page.route('**/users/me/checklist', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData),
      });
    } else {
      route.continue();
    }
  });

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('tonai:show_checklist'));
  });

  await page.waitForSelector('#checklist-overlay', { timeout: 5_000 });
  // Wait for the loading spinner to disappear and actual items to render
  await page.waitForSelector('#checklist-body .checklist-group', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Mainnet Readiness Checklist', () => {
  test('checklist panel opens on tonai:show_checklist event', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    const overlay = page.locator('#checklist-overlay');
    await expect(overlay).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'checklist-open-pending.png'),
    });
  });

  test('checklist title reads "Mainnet Readiness Checklist"', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    const title = page.locator('.checklist-title');
    await expect(title).toHaveText('Mainnet Readiness Checklist');
  });

  test('intro text reminds user to complete mandatory items before live trading', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    const intro = page.locator('.checklist-intro');
    await expect(intro).toContainText('mandatory');
  });

  test('renders all mandatory checklist items', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    // 3 mandatory items in the mock
    const mandatoryBadges = page.locator('.checklist-mandatory-badge');
    await expect(mandatoryBadges).toHaveCount(3);
  });

  test('mandatory items show a "Required" badge', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    const firstBadge = page.locator('.checklist-mandatory-badge').first();
    await expect(firstBadge).toHaveText('Required');
  });

  test('un-acknowledged items show "I understand" button', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    // All 4 items are un-acknowledged in the mock
    const ackButtons = page.locator('.checklist-ack-btn');
    await expect(ackButtons).toHaveCount(4);
    await expect(ackButtons.first()).toContainText('I understand');
  });

  test('Enable Live Trading button is disabled when checklist is incomplete', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    const enableBtn = page.locator('#checklist-enable-btn');
    await expect(enableBtn).toBeDisabled();
  });

  test('acknowledged items show a checkmark and no "I understand" button', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page, API_MOCKS.checklistComplete);

    // 3 mandatory items acknowledged → 3 done items
    const doneItems = page.locator('.checklist-item--done');
    await expect(doneItems).toHaveCount(3);

    // 1 un-acknowledged non-mandatory item still shows "I understand"
    const ackButtons = page.locator('.checklist-ack-btn');
    await expect(ackButtons).toHaveCount(1);
  });

  test('Enable Live Trading button is enabled when all mandatory items are acknowledged', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page, API_MOCKS.checklistComplete);

    const enableBtn = page.locator('#checklist-enable-btn');
    await expect(enableBtn).toBeEnabled();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'checklist-all-mandatory-complete.png'),
    });
  });

  test('acknowledging an item sends POST to correct endpoint', async ({ page }) => {
    await loadPage(page);

    let acknowledgedItemId: string | null = null;
    let ackRequestBody: Record<string, unknown> | null = null;

    await page.route('**/users/me/checklist', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(API_MOCKS.checklistPending),
        });
      } else {
        route.continue();
      }
    });

    await page.route('**/users/me/checklist/*/acknowledge', async (route) => {
      const url = route.request().url();
      const match = url.match(/\/checklist\/([^/]+)\/acknowledge/);
      acknowledgedItemId = match ? decodeURIComponent(match[1]) : null;
      ackRequestBody = JSON.parse(route.request().postData() ?? '{}');

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            checklistStatus: {
              ...API_MOCKS.checklistPending.data,
              items: API_MOCKS.checklistPending.data.items.map((entry, i) =>
                i === 0
                  ? { ...entry, acknowledged: true, acknowledgedAt: '2024-01-01T00:00:00Z' }
                  : entry,
              ),
            },
          },
        }),
      });
    });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('tonai:show_checklist'));
    });
    await page.waitForSelector('#checklist-overlay', { timeout: 5_000 });
    await page.waitForSelector('#checklist-body .checklist-group', { timeout: 10_000 });

    await page.locator('.checklist-ack-btn').first().click();

    await page.waitForFunction(() => {
      return document.querySelectorAll('.checklist-item--done').length >= 1;
    }, undefined, { timeout: 5_000 });

    expect(acknowledgedItemId).toBe('enable-2fa');
    expect(ackRequestBody).toMatchObject({ expectedVersion: 'v1' });
  });

  test('checklist panel closes when close button is clicked', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    await page.click('#checklist-close-btn');

    // Overlay is removed from DOM after fade-out animation (200ms)
    await page.waitForFunction(() => !document.getElementById('checklist-overlay'),
      undefined, { timeout: 2_000 });

    const overlay = page.locator('#checklist-overlay');
    await expect(overlay).toHaveCount(0);
  });

  test('checklist groups items by category', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    // Mock data has 4 different categories: account-security, wallet, risk, simulation
    const groups = page.locator('.checklist-group');
    await expect(groups).toHaveCount(4);
  });

  test('checklist category headers are rendered for each group', async ({ page }) => {
    await loadPage(page);
    await openChecklist(page);

    const groupTitles = page.locator('.checklist-group-title');
    const count = await groupTitles.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test.describe('Risk Disclosures', () => {
    test('page contains a risk disclosures section or link', async ({ page }) => {
      await loadPage(page);

      // The security.js modal warning and checklist intro reference risk and security guide
      const pageContent = await page.content();
      const hasRiskRef =
        pageContent.toLowerCase().includes('risk') ||
        pageContent.toLowerCase().includes('security guide') ||
        pageContent.toLowerCase().includes('disclosure');

      expect(hasRiskRef).toBe(true);
    });
  });
});
