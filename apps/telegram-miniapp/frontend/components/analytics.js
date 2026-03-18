/**
 * TON AI Agent — Analytics Dashboard Component (Issue #255)
 *
 * Displays performance metrics, strategy breakdown, and equity curve
 * for the authenticated user's trade history.
 *
 * Tabs: 7d | 30d | 90d | All
 * Sections:
 *   - Performance summary stats row
 *   - Detailed P&L grid (best/worst trade, avg, drawdown, profit factor)
 *   - Per-strategy breakdown
 *   - Equity curve (portfolio history)
 */
(function () {
  'use strict';

  const { State, API, DemoData, Fmt, el, esc } = window.App;

  // ============================================================================
  // Demo data fallback
  // ============================================================================
  function demoMetrics(period) {
    const factor = period === '7d' ? 0.25 : period === '90d' ? 3 : period === 'all' ? 12 : 1;
    return {
      totalTrades:    Math.round(87 * factor),
      executedTrades: Math.round(72 * factor),
      winRate:        68.4,
      totalPnL:       2450.5 * factor,
      avgPnL:         28.17,
      bestTrade:      142.5,
      worstTrade:     -38.2,
      sharpeRatio:    1.82,
      maxDrawdown:    5.8,
      profitFactor:   2.1,
    };
  }

  function demoByStrategy(period) {
    return DemoData.strategies(period).map(s => ({
      strategy:  s.strategy_name,
      count:     s.total_trades,
      totalPnl:  s.roi * 100,
      winRate:   s.win_rate,
    }));
  }

  function demoHistory(period) {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === 'all' ? 180 : 30;
    const now   = Date.now();
    let value   = 13000;
    const history = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * 86400000).toISOString().slice(0, 10);
      value = value * (1 + (Math.random() * 0.012 - 0.004));
      history.push({
        date,
        portfolio_value: parseFloat(value.toFixed(2)),
        realized_pnl:    parseFloat((value - 13000).toFixed(2)),
        unrealized_pnl:  0,
        total_pnl:       parseFloat((value - 13000).toFixed(2)),
      });
    }
    return history;
  }

  // ============================================================================
  // Analytics component
  // ============================================================================
  const Analytics = {
    period: '7d',

    async refresh() {
      this.period = State.analyticsPeriod || '7d';
      await Promise.all([this.loadMetrics(), this.loadHistory()]);
    },

    async loadMetrics() {
      let data = await API.get(`/analytics?period=${this.period}`);
      if (!data || !data.success) {
        data = {
          metrics:    demoMetrics(this.period),
          byStrategy: demoByStrategy(this.period),
        };
      }
      this.renderMetrics(data.metrics);
      this.renderByStrategy(data.byStrategy || []);
    },

    async loadHistory() {
      let data = await API.get(`/portfolio/history?period=${this.period}`);
      if (!data || !data.success) {
        data = { history: demoHistory(this.period) };
      }
      this.renderEquityCurve(data.history || []);
    },

    renderMetrics(m) {
      // Stats row
      const pnl = m.totalPnL ?? 0;
      const pnlEl = el('an-total-pnl');
      pnlEl.textContent = `${Fmt.sign(pnl)}${Fmt.usd(pnl)}`;
      pnlEl.className   = `stat-value ${pnl >= 0 ? 'positive' : 'negative'}`;

      el('an-win-rate').textContent    = `${(m.winRate ?? 0).toFixed(1)}%`;
      el('an-total-trades').textContent = String(m.totalTrades ?? 0);
      el('an-sharpe').textContent       = (m.sharpeRatio ?? 0).toFixed(2);

      // Detail grid
      const best  = m.bestTrade  ?? 0;
      const worst = m.worstTrade ?? 0;
      const avg   = m.avgPnL     ?? 0;
      const dd    = m.maxDrawdown ?? 0;
      const pf    = m.profitFactor ?? 0;

      const bestEl  = el('an-best-trade');
      bestEl.textContent = `${Fmt.sign(best)}${Fmt.usd(best)}`;
      bestEl.className   = 'pnl-item-value positive';

      const worstEl = el('an-worst-trade');
      worstEl.textContent = `${Fmt.sign(worst)}${Fmt.usd(worst)}`;
      worstEl.className   = `pnl-item-value ${worst < 0 ? 'negative' : 'neutral'}`;

      const avgEl = el('an-avg-pnl');
      avgEl.textContent = `${Fmt.sign(avg)}${Fmt.usd(avg)}`;
      avgEl.className   = `pnl-item-value ${avg >= 0 ? 'positive' : 'negative'}`;

      el('an-max-drawdown').textContent  = `-${dd.toFixed(2)}%`;
      el('an-profit-factor').textContent = pf >= 999 ? '∞' : pf.toFixed(2);
      el('an-exec-trades').textContent   = String(m.executedTrades ?? 0);
    },

    renderByStrategy(list) {
      const container = el('an-strategy-breakdown');
      if (!list.length) {
        container.innerHTML = '<div class="empty-hint">No strategy data yet</div>';
        return;
      }

      container.innerHTML = list.map(s => {
        const pnl     = parseFloat(s.totalPnl) || 0;
        const pnlCls  = pnl >= 0 ? 'positive' : 'negative';
        const winRate = parseFloat(s.winRate) || 0;
        return `
          <div class="analytics-strategy-row">
            <div class="analytics-strategy-info">
              <div class="analytics-strategy-name">${esc(s.strategy)}</div>
              <div class="analytics-strategy-meta">${s.count} trade${s.count !== 1 ? 's' : ''} · Win ${winRate.toFixed(1)}%</div>
            </div>
            <div class="analytics-strategy-pnl ${pnlCls}">
              ${Fmt.sign(pnl)}${Fmt.usd(pnl)}
            </div>
          </div>
        `;
      }).join('');
    },

    renderEquityCurve(history) {
      const container = el('an-equity-curve');
      if (!history.length) {
        container.innerHTML = '<div class="empty-hint">No history yet</div>';
        return;
      }

      // Show last few entries as a simple list + min/max indicator
      const last20 = history.slice(-20);
      const first  = history[0];
      const latest = history[history.length - 1];
      const change = latest.portfolio_value - first.portfolio_value;
      const changePct = first.portfolio_value > 0
        ? (change / first.portfolio_value) * 100
        : 0;

      const summaryClass = change >= 0 ? 'positive' : 'negative';

      container.innerHTML = `
        <div class="equity-summary">
          <span class="equity-label">Start: $${Fmt.usd(first.portfolio_value)}</span>
          <span class="equity-arrow">→</span>
          <span class="equity-label">Now: $${Fmt.usd(latest.portfolio_value)}</span>
          <span class="equity-change ${summaryClass}">${Fmt.sign(change)}${Fmt.usd(change)} (${Fmt.pct(changePct)})</span>
        </div>
        <div class="equity-rows">
          ${last20.map(row => {
            const pnl    = row.total_pnl ?? 0;
            const pnlCls = pnl >= 0 ? 'positive' : 'negative';
            return `
              <div class="equity-row">
                <span class="equity-date">${esc(row.date)}</span>
                <span class="equity-value">$${Fmt.usd(row.portfolio_value)}</span>
                <span class="equity-pnl ${pnlCls}">${Fmt.sign(pnl)}${Fmt.usd(pnl)}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    },
  };

  // ============================================================================
  // Period tab wiring
  // ============================================================================
  function setupPeriodTabs() {
    const tabs = document.getElementById('analytics-period-tabs');
    if (!tabs) return;

    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.period-btn');
      if (!btn) return;

      tabs.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      State.analyticsPeriod = btn.dataset.period;
      Analytics.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPeriodTabs);
  } else {
    setupPeriodTabs();
  }

  window.Analytics = Analytics;
})();
