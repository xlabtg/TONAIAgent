/**
 * TON AI Agent – Smart Execution UI Component
 *
 * Implements Issue #253 Step 7 — Mini App UI:
 * - Slippage tolerance selector (0.1% / 0.5% / 1% / Custom)
 * - Execution preview (best DEX, expected output, slippage, price impact)
 * - DEX comparison table
 * - Warning messages for high slippage / low liquidity / high price impact
 * - Execution result display
 */
(function () {
  'use strict';

  const { State, API, DemoData, Fmt, el, esc, TG } = window.App;

  // ============================================================================
  // Slippage Configuration (mirrors SlippageConfig in smart-execution.ts)
  // ============================================================================

  const SLIPPAGE_PRESETS = [
    { label: '0.1%', bps: 10 },
    { label: '0.5%', bps: 50 },
    { label: '1%',   bps: 100 },
  ];

  const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
  const WARNING_SLIPPAGE_BPS = 50;  // warn above 0.5%
  const MAX_PRICE_IMPACT_PCT = 3.0;

  // ============================================================================
  // Execution Component State
  // ============================================================================

  const ExecState = {
    action: 'BUY',
    pair: 'TON/USDT',
    amount: '',
    mode: 'market',
    slippageBps: DEFAULT_SLIPPAGE_BPS,
    customSlippage: null,
    preview: null,
    lastResult: null,
  };

  // ============================================================================
  // Utility — bps/percent conversion
  // ============================================================================

  function bpsToPercent(bps) { return bps / 100; }
  function percentToBps(pct) { return Math.round(pct * 100); }

  // ============================================================================
  // Demo Data — simulate smart execution preview from backend/engine
  // ============================================================================

  const DemoExecution = {
    /**
     * Simulates preview results including DEX comparison and slippage data.
     * In production this calls the execution engine API.
     */
    preview(pair, action, amount, slippageBps) {
      const amountNum = parseFloat(amount) || 0;
      if (amountNum <= 0) return null;

      const slippagePct = bpsToPercent(slippageBps);
      const [base] = pair.split('/');

      // Simulate quotes from three DEXes with slight variance
      const basePrice = { TON: 5.25, NOT: 0.012, DOGS: 0.0008 }[base] ?? 5.25;
      const dedustOut   = amountNum / basePrice * (1 + 0.001);
      const stonfiOut   = amountNum / basePrice * (1 + 0.003); // slightly better
      const toncoOut    = amountNum / basePrice * (1 - 0.001);

      const liquidity = { dedust: 180_000, stonfi: 250_000, tonco: 75_000 };
      const feePercent = { dedust: 0.3, stonfi: 0.3, tonco: 0.25 };

      // Estimate price impact: orderSize / (poolLiquidity + orderSize)
      function impact(poolUsd) {
        return (amountNum / (poolUsd + amountNum)) * 100;
      }

      const quotes = [
        { dex: 'dedust', expectedOut: dedustOut, liquidityUsd: liquidity.dedust,
          feePercent: feePercent.dedust, priceImpact: impact(liquidity.dedust),
          slippagePct: slippagePct },
        { dex: 'stonfi', expectedOut: stonfiOut, liquidityUsd: liquidity.stonfi,
          feePercent: feePercent.stonfi, priceImpact: impact(liquidity.stonfi),
          slippagePct: slippagePct },
        { dex: 'tonco',  expectedOut: toncoOut,  liquidityUsd: liquidity.tonco,
          feePercent: feePercent.tonco,  priceImpact: impact(liquidity.tonco),
          slippagePct: slippagePct },
      ].sort((a, b) => b.expectedOut - a.expectedOut);

      const best = quotes[0];

      // Slippage validation
      const actualSlippagePct = slippagePct;
      const blocked = slippageBps > 200   // > 2%: reject (simulating high market slippage)
        || amountNum > 50_000             // huge order
        || best.liquidityUsd < 10_000;

      const warnings = [];
      if (slippageBps > WARNING_SLIPPAGE_BPS) {
        warnings.push({ code: 'HIGH_SLIPPAGE', severity: 'medium',
          message: `Slippage tolerance ${bpsToPercent(slippageBps).toFixed(1)}% is above recommended 0.5%` });
      }
      if (best.priceImpact > MAX_PRICE_IMPACT_PCT * 0.5) {
        warnings.push({ code: 'HIGH_PRICE_IMPACT', severity: best.priceImpact > MAX_PRICE_IMPACT_PCT ? 'high' : 'medium',
          message: `Price impact ~${best.priceImpact.toFixed(2)}% — consider splitting the order` });
      }
      if (best.liquidityUsd < 50_000) {
        warnings.push({ code: 'LOW_LIQUIDITY', severity: 'low',
          message: `Pool liquidity is relatively low ($${Fmt.abbr(best.liquidityUsd)})` });
      }
      if (blocked) {
        warnings.push({ code: 'BLOCKED', severity: 'high',
          message: `Trade would be blocked: slippage or liquidity conditions not met` });
      }

      return {
        success: !blocked,
        dex: best.dex,
        expectedOut: best.expectedOut,
        estimatedSlippagePct: actualSlippagePct,
        estimatedPriceImpact: best.priceImpact,
        wouldBeBlocked: blocked,
        dexComparison: quotes,
        warnings,
      };
    },

    /**
     * Simulates execution result.
     */
    execute(pair, action, amount, slippageBps) {
      const preview = this.preview(pair, action, amount, slippageBps);
      if (!preview || preview.wouldBeBlocked) {
        return {
          success: false,
          reason: preview?.warnings[preview.warnings.length - 1]?.code ?? 'UNKNOWN_ERROR',
          errorMessage: 'Trade rejected: conditions not met',
        };
      }

      const variance = (Math.random() * 0.006) - 0.003;
      const actualSlippage = Math.max(0, preview.estimatedSlippagePct + variance);
      const fillRatio = Math.random() < 0.1 ? 0.90 + Math.random() * 0.09 : 1.0;

      return {
        success: true,
        simulated: true,
        dex: preview.dex,
        fillAmount: preview.expectedOut * (1 - actualSlippage / 100) * fillRatio,
        actualSlippagePct: actualSlippage,
        priceImpact: preview.estimatedPriceImpact,
        fillRatio,
        txHash: `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      };
    },
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  function severityColor(sev) {
    return { low: 'var(--hint)', medium: 'var(--warning)', high: 'var(--negative)' }[sev] ?? 'var(--hint)';
  }

  function warningIcon(code) {
    if (code === 'BLOCKED') return '🚫';
    if (code === 'HIGH_SLIPPAGE') return '⚠️';
    if (code === 'HIGH_PRICE_IMPACT') return '📉';
    if (code === 'LOW_LIQUIDITY') return '💧';
    return 'ℹ️';
  }

  // ============================================================================
  // Execution Component
  // ============================================================================

  const Execution = {
    /** Initialize event listeners */
    init() {
      // Toggle execution panel
      el('new-trade-btn')?.addEventListener('click', () => this.togglePanel());

      // Action tabs (BUY / SELL)
      el('exec-action-tabs')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        ExecState.action = btn.dataset.action;
        el('exec-action-tabs').querySelectorAll('.exec-action-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        TG.haptic.select();
        this.hidePreview();
      });

      // Slippage selector
      el('slippage-selector')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-bps]');
        if (!btn) return;
        el('slippage-selector').querySelectorAll('.slippage-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        TG.haptic.select();

        if (btn.dataset.bps === 'custom') {
          el('slippage-custom').classList.remove('hidden');
        } else {
          el('slippage-custom').classList.add('hidden');
          ExecState.slippageBps = parseInt(btn.dataset.bps, 10);
          this.hidePreview();
        }
      });

      // Custom slippage input
      el('slippage-custom-input')?.addEventListener('input', (e) => {
        const pct = parseFloat(e.target.value);
        if (!isNaN(pct) && pct > 0 && pct <= 50) {
          ExecState.slippageBps = percentToBps(pct);
          this.hidePreview();
        }
      });

      // Preview button
      el('exec-preview-btn')?.addEventListener('click', () => {
        ExecState.pair   = el('exec-pair').value;
        ExecState.amount = el('exec-amount').value;
        ExecState.mode   = el('exec-mode').value;
        this.loadPreview();
        TG.haptic.impact('light');
      });

      // Execute button
      el('exec-submit-btn')?.addEventListener('click', () => {
        this.executeOrder();
        TG.haptic.impact('medium');
      });
    },

    togglePanel() {
      const panel = el('execution-panel');
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        el('exec-amount').focus();
        TG.haptic.impact('light');
      } else {
        panel.classList.add('hidden');
        this.hidePreview();
      }
    },

    hidePreview() {
      el('exec-preview')?.classList.add('hidden');
      el('exec-result')?.classList.add('hidden');
      el('exec-submit-btn').disabled = true;
    },

    async loadPreview() {
      const amount = el('exec-amount').value;
      if (!amount || parseFloat(amount) <= 0) {
        this.showError('Please enter a valid amount.');
        return;
      }

      el('exec-preview-btn').disabled = true;
      el('exec-preview-btn').textContent = 'Loading…';

      // Try real API, fall back to demo simulation
      let data = await API.get(
        `/execution/preview?pair=${ExecState.pair}&action=${ExecState.action}` +
        `&amount=${encodeURIComponent(amount)}&slippage_bps=${ExecState.slippageBps}` +
        `&mode=${ExecState.mode}`
      );

      if (!data) {
        data = DemoExecution.preview(ExecState.pair, ExecState.action, amount, ExecState.slippageBps);
      }

      el('exec-preview-btn').disabled = false;
      el('exec-preview-btn').textContent = 'Preview';

      if (!data) {
        this.showError('Could not fetch execution preview. Try again.');
        return;
      }

      ExecState.preview = data;
      this.renderPreview(data);
      el('exec-submit-btn').disabled = data.wouldBeBlocked;
    },

    renderPreview(data) {
      const [, quote] = ExecState.pair.split('/');
      const outLabel  = ExecState.action === 'BUY'
        ? ExecState.pair.split('/')[0]
        : quote;

      el('prev-dex').textContent = (data.dex ?? '—').toUpperCase();

      const expectedOut = typeof data.expectedOut === 'number'
        ? `${data.expectedOut.toFixed(4)} ${outLabel}` : '—';
      el('prev-expected-out').textContent = expectedOut;

      const slipPct = typeof data.estimatedSlippagePct === 'number'
        ? `${data.estimatedSlippagePct.toFixed(2)}%` : '—';
      const slipEl = el('prev-slippage');
      slipEl.textContent = slipPct;
      slipEl.style.color = ExecState.slippageBps > WARNING_SLIPPAGE_BPS
        ? 'var(--warning)' : 'var(--positive)';

      const impactPct = typeof data.estimatedPriceImpact === 'number'
        ? `${data.estimatedPriceImpact.toFixed(3)}%` : '—';
      const impactEl = el('prev-impact');
      impactEl.textContent = impactPct;
      impactEl.style.color = (data.estimatedPriceImpact ?? 0) > MAX_PRICE_IMPACT_PCT
        ? 'var(--negative)' : (data.estimatedPriceImpact ?? 0) > MAX_PRICE_IMPACT_PCT * 0.5
          ? 'var(--warning)' : 'inherit';

      // DEX Comparison
      if (Array.isArray(data.dexComparison) && data.dexComparison.length > 1) {
        this.renderDexComparison(data.dexComparison, data.dex, outLabel);
        el('dex-comparison').classList.remove('hidden');
      } else {
        el('dex-comparison').classList.add('hidden');
      }

      // Warnings
      const warningsContainer = el('exec-warnings');
      warningsContainer.innerHTML = '';
      (data.warnings ?? []).forEach(w => {
        const div = document.createElement('div');
        div.className = 'exec-warning';
        div.style.borderColor = severityColor(w.severity);
        div.innerHTML = `<span class="exec-warning-icon">${warningIcon(w.code)}</span>
          <span class="exec-warning-msg" style="color:${severityColor(w.severity)}">${esc(w.message)}</span>`;
        warningsContainer.appendChild(div);
      });

      el('exec-result').classList.add('hidden');
      el('exec-preview').classList.remove('hidden');
    },

    renderDexComparison(rows, selectedDex, outToken) {
      const container = el('dex-comparison-rows');
      container.innerHTML = rows.map(row => {
        const isBest = row.dex === selectedDex;
        return `
          <div class="dex-comparison-row ${isBest ? 'dex-best' : ''}">
            <span class="dex-name">${esc(row.dex.toUpperCase())}${isBest ? ' ✓' : ''}</span>
            <span class="dex-out">${row.expectedOut.toFixed(4)} ${esc(outToken)}</span>
            <span class="dex-impact" title="Price Impact">${row.priceImpact.toFixed(2)}%</span>
            <span class="dex-fee" title="Fee">${row.feePercent.toFixed(2)}%</span>
          </div>`;
      }).join('');
    },

    async executeOrder() {
      const amount = el('exec-amount').value;
      if (!amount || parseFloat(amount) <= 0) return;

      el('exec-submit-btn').disabled = true;
      el('exec-submit-btn').textContent = 'Executing…';

      // Try real API, fall back to demo
      let data = await API.request('/execution/execute', {
        method: 'POST',
        body: JSON.stringify({
          pair: ExecState.pair,
          action: ExecState.action,
          amount,
          slippage_bps: ExecState.slippageBps,
          mode: ExecState.mode,
        }),
      });

      if (!data) {
        data = DemoExecution.execute(ExecState.pair, ExecState.action, amount, ExecState.slippageBps);
      }

      el('exec-submit-btn').disabled = false;
      el('exec-submit-btn').textContent = 'Execute';

      ExecState.lastResult = data;
      this.renderResult(data);

      if (data.success) {
        TG.haptic.notify('success');
        // Refresh trade list
        if (window.Trades) window.Trades.refresh();
      } else {
        TG.haptic.notify('error');
      }
    },

    renderResult(data) {
      const resultEl = el('exec-result');
      resultEl.classList.remove('hidden');

      if (data.success) {
        const [base, quote] = ExecState.pair.split('/');
        const outToken = ExecState.action === 'BUY' ? base : quote;
        resultEl.className = 'exec-result exec-result-success';
        resultEl.innerHTML = `
          <div class="exec-result-icon">✅</div>
          <div class="exec-result-title">Order Executed (Simulated)</div>
          <div class="exec-result-detail">
            <span>DEX: <strong>${esc((data.dex ?? '—').toUpperCase())}</strong></span>
            <span>Filled: <strong>${(data.fillAmount ?? 0).toFixed(4)} ${esc(outToken)}</strong></span>
            ${data.fillRatio < 1 ? `<span class="warn">Partial fill: ${((data.fillRatio ?? 0) * 100).toFixed(0)}%</span>` : ''}
            <span>Slippage: <strong>${(data.actualSlippagePct ?? 0).toFixed(3)}%</strong></span>
            <span class="tx-hash">TX: ${esc(data.txHash ?? '—')}</span>
          </div>`;
      } else {
        resultEl.className = 'exec-result exec-result-fail';
        resultEl.innerHTML = `
          <div class="exec-result-icon">❌</div>
          <div class="exec-result-title">Trade Rejected</div>
          <div class="exec-result-reason">${esc(data.errorMessage ?? data.reason ?? 'Unknown error')}</div>`;
      }
    },

    showError(msg) {
      const resultEl = el('exec-result');
      resultEl.className = 'exec-result exec-result-fail';
      resultEl.innerHTML = `<div class="exec-result-reason">⚠️ ${esc(msg)}</div>`;
      resultEl.classList.remove('hidden');
    },
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Execution.init());
  } else {
    Execution.init();
  }

  window.Execution = Execution;
})();
