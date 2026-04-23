/**
 * E2E tests for the Live Trading Confirmation Modal (security.js – LiveTradingModal)
 *
 * Covers:
 *  - Modal is hidden by default
 *  - Modal opens when "Switch to Live" is clicked in simulation mode
 *  - Confirm button is disabled while not all 3 checkboxes are ticked
 *  - Confirm button becomes enabled only after all 3 acknowledgements are ticked
 *  - Checking/unchecking individual boxes leaves button disabled
 *  - Modal closes when Cancel is clicked
 *  - Modal closes when the overlay backdrop is clicked
 *  - Successful enable-live-trading call updates the banner to LIVE TRADING
 *  - All 3 acknowledgement texts are present
 *  - Modal warning contains "irreversible"
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

async function loadPage(page: Page, tradingMode: 'simulation' | 'live' = 'simulation') {
  await stubStartupApis(page);

  await page.route('**/agents/agent-1', (route) => {
    const mock = tradingMode === 'live' ? API_MOCKS.agentLive : API_MOCKS.agentSimulation;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock) });
  });

  await page.addInitScript(TMA_SHIM_SCRIPT);
  await page.addInitScript(`
    localStorage.setItem('tonai_current_agent_id', 'agent-1');
    localStorage.setItem('tonai_live_trading_enabled', '${tradingMode === 'live' ? 'true' : 'false'}');
    // Skip the first-time onboarding overlay so it doesn't intercept clicks
    localStorage.setItem('tonai_onboarding_complete', 'true');
  `);

  await page.goto('/');
  await page.waitForSelector('#main-content:not(.hidden)', { timeout: 10_000 });
  await page.waitForSelector('#simulation-mode-banner');
}

async function openModal(page: Page) {
  await page.click('#switch-to-live-btn');
  await page.waitForSelector('#live-trading-modal:not(.hidden)', { timeout: 5_000 });
  // Wait for the slideUp CSS animation (250ms) to complete before interacting with modal content
  await page.waitForTimeout(300);
}

/**
 * Toggle a checkbox inside the live-trading modal sheet.
 *
 * The modal-overlay div (position: absolute; inset: 0) overlaps the entire
 * .modal container including the area where checkboxes render.  Although
 * .modal-sheet has z-index:1 so it paints on top, some browsers return the
 * overlay from elementFromPoint() first.  We bypass that by dispatching a
 * synthetic 'change' event, which correctly triggers security.js's
 * _updateConfirmButton() handler — the same as a real user click.
 */
async function setCheckbox(page: Page, id: string, checked: boolean) {
  await page.evaluate(({ id, checked }) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) throw new Error(`Checkbox #${id} not found`);
    if (el.checked !== checked) {
      el.checked = checked;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { id, checked });
}

/**
 * Click a button inside the modal sheet using JS dispatch to avoid overlay
 * pointer-event interference.
 */
async function clickModalButton(page: Page, id: string) {
  await page.evaluate((id) => {
    const el = document.getElementById(id) as HTMLButtonElement | null;
    if (!el) throw new Error(`Button #${id} not found`);
    el.click();
  }, id);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Live Trading Confirmation Modal', () => {
  test('modal is hidden by default on page load', async ({ page }) => {
    await loadPage(page, 'simulation');
    const modal = page.locator('#live-trading-modal');
    await expect(modal).toHaveClass(/hidden/);
  });

  test('modal opens when Switch to Live button is clicked', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    const modal = page.locator('#live-trading-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'modal-open-all-unchecked.png'),
    });
  });

  test('confirm button is disabled when no checkboxes are ticked', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    const confirmBtn = page.locator('#confirm-live-trading-btn');
    await expect(confirmBtn).toBeDisabled();
  });

  test('confirm button is disabled when only 1 of 3 checkboxes is ticked', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    await setCheckbox(page, 'live-check-1', true);

    const confirmBtn = page.locator('#confirm-live-trading-btn');
    await expect(confirmBtn).toBeDisabled();
  });

  test('confirm button is disabled when only 2 of 3 checkboxes are ticked', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    await setCheckbox(page, 'live-check-1', true);
    await setCheckbox(page, 'live-check-2', true);

    const confirmBtn = page.locator('#confirm-live-trading-btn');
    await expect(confirmBtn).toBeDisabled();
  });

  test('confirm button becomes enabled when all 3 checkboxes are ticked', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    await setCheckbox(page, 'live-check-1', true);
    await setCheckbox(page, 'live-check-2', true);
    await setCheckbox(page, 'live-check-3', true);

    const confirmBtn = page.locator('#confirm-live-trading-btn');
    await expect(confirmBtn).toBeEnabled();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'modal-all-checked-confirm-enabled.png'),
    });
  });

  test('confirm button becomes disabled again when a checkbox is unchecked', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    await setCheckbox(page, 'live-check-1', true);
    await setCheckbox(page, 'live-check-2', true);
    await setCheckbox(page, 'live-check-3', true);
    await setCheckbox(page, 'live-check-2', false);

    const confirmBtn = page.locator('#confirm-live-trading-btn');
    await expect(confirmBtn).toBeDisabled();
  });

  test('modal closes when Cancel button is clicked', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    await clickModalButton(page, 'cancel-live-trading-btn');

    const modal = page.locator('#live-trading-modal');
    await expect(modal).toHaveClass(/hidden/);
  });

  test('modal closes when overlay backdrop is clicked', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    await page.click('#live-trading-modal-overlay');

    const modal = page.locator('#live-trading-modal');
    await expect(modal).toHaveClass(/hidden/);
  });

  test('checkboxes are reset to unchecked each time the modal is reopened', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    await setCheckbox(page, 'live-check-1', true);
    await setCheckbox(page, 'live-check-2', true);
    await setCheckbox(page, 'live-check-3', true);
    await clickModalButton(page, 'cancel-live-trading-btn');
    // Wait for modal to be hidden (display:none — waitForSelector needs state:'attached' to match hidden elements)
    await page.waitForFunction(() =>
      document.getElementById('live-trading-modal')?.classList.contains('hidden'), undefined, { timeout: 5_000 });

    await openModal(page);

    await expect(page.locator('#live-check-1')).not.toBeChecked();
    await expect(page.locator('#live-check-2')).not.toBeChecked();
    await expect(page.locator('#live-check-3')).not.toBeChecked();

    const confirmBtn = page.locator('#confirm-live-trading-btn');
    await expect(confirmBtn).toBeDisabled();
  });

  test('confirming live trading updates banner to LIVE TRADING', async ({ page }) => {
    await page.route('**/agents/agent-1/enable-live-trading', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(API_MOCKS.enableLiveSuccess),
      });
    });

    await loadPage(page, 'simulation');
    await openModal(page);

    await setCheckbox(page, 'live-check-1', true);
    await setCheckbox(page, 'live-check-2', true);
    await setCheckbox(page, 'live-check-3', true);
    await clickModalButton(page, 'confirm-live-trading-btn');

    // Modal should close
    await page.waitForFunction(() =>
      document.getElementById('live-trading-modal')?.classList.contains('hidden'),
      undefined, { timeout: 5_000 });

    // Banner should update to live trading
    const bannerText = page.locator('#simulation-mode-banner .simulation-banner-text');
    await expect(bannerText).toHaveText(/LIVE TRADING/, { timeout: 5_000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'modal-confirmed-banner-live.png'),
    });
  });

  test('modal warning contains "irreversible" word for blockchain transactions', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    const warning = page.locator('.live-trading-warning');
    await expect(warning).toContainText('irreversible');
  });

  test('modal contains all 3 acknowledgement checkboxes', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    await expect(page.locator('#live-check-1')).toBeVisible();
    await expect(page.locator('#live-check-2')).toBeVisible();
    await expect(page.locator('#live-check-3')).toBeVisible();
  });

  test('acknowledgement 1: financial loss risk disclosure is present', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    const label = page.locator('label:has(#live-check-1)');
    await expect(label).toContainText('lose money');
  });

  test('acknowledgement 2: wallet address verification is present', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    const label = page.locator('label:has(#live-check-2)');
    await expect(label).toContainText('wallet address');
  });

  test('acknowledgement 3: risk limits and security guide is present', async ({ page }) => {
    await loadPage(page, 'simulation');
    await openModal(page);

    const label = page.locator('label:has(#live-check-3)');
    await expect(label).toContainText('security guide');
  });
});
