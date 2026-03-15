/**
 * TON AI Agent – Strategy Performance Component
 * Shows ROI, Win Rate, Total Trades, Drawdown per strategy
 */
(function () {
  'use strict';

  const { State, API, DemoData, Fmt, el, esc } = window.App;

  const Strategies = {
    async refresh() {
      await this.load(State.strategyPeriod);
    },

    async load(period) {
      State.strategyPeriod = period;

      let data = await API.get(`/portfolio/metrics?period=${period}`);
      if (!data) data = { strategies: DemoData.strategies(period) };

      const strategies = data.strategies || data;
      State.strategies = Array.isArray(strategies) ? strategies : [];
      this.renderSummary();
      this.renderList();
    },

    renderSummary() {
      const list = State.strategies;
      if (!list.length) {
        el('best-roi').textContent = '0%';
        el('avg-win-rate').textContent = '0%';
        el('total-trades-stat').textContent = '0';
        el('max-drawdown-stat').textContent = '0%';
        return;
      }

      const bestRoi = Math.max(...list.map(s => parseFloat(s.roi) || 0));
      const avgWin = list.reduce((s, x) => s + (parseFloat(x.win_rate) || 0), 0) / list.length;
      const totalTrades = list.reduce((s, x) => s + (parseInt(x.total_trades) || 0), 0);
      const maxDD = Math.max(...list.map(s => parseFloat(s.max_drawdown) || 0));

      el('best-roi').textContent = `+${bestRoi.toFixed(1)}%`;
      el('avg-win-rate').textContent = `${avgWin.toFixed(1)}%`;
      el('total-trades-stat').textContent = totalTrades;
      el('max-drawdown-stat').textContent = `-${maxDD.toFixed(1)}%`;
    },

    renderList() {
      const list = State.strategies;
      const container = el('strategies-list');
      const empty = el('strategies-empty');

      if (!list.length) {
        empty.classList.remove('hidden');
        container.innerHTML = '';
        return;
      }

      empty.classList.add('hidden');

      // Find best by ROI for highlight badge
      const bestRoi = Math.max(...list.map(s => parseFloat(s.roi) || 0));

      container.innerHTML = list.map(s => {
        const roi = parseFloat(s.roi) || 0;
        const winRate = parseFloat(s.win_rate) || 0;
        const drawdown = parseFloat(s.max_drawdown) || 0;
        const sharpe = parseFloat(s.sharpe_ratio) || 0;
        const isBest = roi === bestRoi;

        return `
          <div class="strategy-card">
            <div class="strategy-card-header">
              <span class="strategy-card-name">${esc(s.strategy_name)}</span>
              ${isBest ? '<span class="strategy-badge best">Best ROI</span>' : ''}
            </div>
            <div class="strategy-metrics-grid">
              <div class="strategy-metric">
                <div class="strategy-metric-label">ROI</div>
                <div class="strategy-metric-value ${roi >= 0 ? 'positive' : 'negative'}">
                  ${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%
                </div>
              </div>
              <div class="strategy-metric">
                <div class="strategy-metric-label">Win Rate</div>
                <div class="strategy-metric-value">${winRate.toFixed(1)}%</div>
              </div>
              <div class="strategy-metric">
                <div class="strategy-metric-label">Total Trades</div>
                <div class="strategy-metric-value">${s.total_trades ?? 0}</div>
              </div>
              <div class="strategy-metric">
                <div class="strategy-metric-label">Max Drawdown</div>
                <div class="strategy-metric-value negative">-${drawdown.toFixed(1)}%</div>
              </div>
            </div>
            <div class="strategy-card-footer">
              <span>Sharpe: ${sharpe.toFixed(2)}</span>
              <span>Annualized: ${parseFloat(s.annualized_return || roi * 12).toFixed(1)}%</span>
              ${s.profit_factor ? `<span>Profit Factor: ${parseFloat(s.profit_factor).toFixed(1)}x</span>` : ''}
            </div>
          </div>
        `;
      }).join('');
    },
  };

  /* --------------------------------------------------------
     Period tab switcher
     -------------------------------------------------------- */
  function setupPeriodTabs() {
    el('strategy-period-tabs')?.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el('strategy-period-tabs').querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Strategies.load(btn.dataset.period);
        window.App.TG.haptic.select();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPeriodTabs);
  } else {
    setupPeriodTabs();
  }

  window.Strategies = Strategies;
})();
