/**
 * TON AI Agent – Portfolio Overview Component
 * Displays total value, P&L, ROI, asset allocation
 */
(function () {
  'use strict';

  const { State, API, DemoData, Fmt, el, esc } = window.App;

  const Portfolio = {
    async refresh() {
      await Promise.all([this.loadPortfolio(), this.loadAssets()]);
    },

    async loadPortfolio() {
      let data = await API.get('/portfolio');
      if (!data) data = DemoData.portfolio();
      State.portfolio = data;
      this.renderPortfolio(data);
    },

    async loadAssets() {
      let data = await API.get('/portfolio/value');
      if (!data) data = DemoData.portfolioValue();
      State.portfolioValue = data;
      this.renderAssets(data);
    },

    renderPortfolio(d) {
      // Hero
      el('portfolio-total').textContent = Fmt.usd(d.portfolio_value);

      const pnl = d.profit ?? 0;
      const pnlBadge = el('portfolio-pnl-badge');
      pnlBadge.textContent = `${Fmt.sign(pnl)}${Fmt.usd(pnl)}`;
      pnlBadge.className = `pnl-badge ${pnl >= 0 ? '' : 'negative'}`;

      const roi = parseFloat(d.roi) || 0;
      el('portfolio-roi-badge').textContent = `${Fmt.pct(roi)} ROI`;

      const dayChange = d.day_change ?? 0;
      const dayChangePct = d.day_change_percent ?? 0;
      el('day-change-val').textContent = `${Fmt.sign(dayChange)}${Fmt.usd(dayChange)}`;
      el('day-change-val').style.color = dayChange >= 0 ? 'var(--positive)' : 'var(--negative)';
      el('day-change-pct').textContent = Fmt.pct(dayChangePct);
      el('day-change-pct').style.color = dayChangePct >= 0 ? 'var(--positive)' : 'var(--negative)';

      // Stats row — use agents list if loaded, otherwise fall back to API data
      const activeCount = State.agents.length
        ? State.agents.filter(a => a.status === 'active').length
        : (d.strategy_count ?? 0);
      el('stat-active-agents').textContent = activeCount;
      el('stat-open-positions').textContent = d.open_position_count ?? 0;
      el('stat-strategies').textContent = d.strategy_count ?? 0;
      el('stat-capital').textContent = `${Math.round(d.capital_utilization ?? 0)}%`;

      // P&L Summary
      const realPnl = d.realized_pnl ?? 0;
      const unrealPnl = d.unrealized_pnl ?? 0;
      const totalPnl = pnl;
      const fees = d.total_fees ?? 0;

      el('realized-pnl').textContent = `${Fmt.sign(realPnl)}${Fmt.usd(realPnl)}`;
      el('realized-pnl').className = `pnl-item-value ${realPnl >= 0 ? 'positive' : 'negative'}`;

      el('unrealized-pnl').textContent = `${Fmt.sign(unrealPnl)}${Fmt.usd(unrealPnl)}`;
      el('unrealized-pnl').className = `pnl-item-value ${unrealPnl >= 0 ? 'positive' : 'negative'}`;

      el('total-pnl').textContent = `${Fmt.sign(totalPnl)}${Fmt.usd(totalPnl)}`;
      el('total-pnl').className = `pnl-item-value highlight ${totalPnl >= 0 ? 'positive' : 'negative'}`;

      el('total-fees').textContent = `-$${Fmt.usd(fees)}`;
    },

    renderAssets(d) {
      const container = el('asset-allocation-list');
      if (!d || !d.assets || d.assets.length === 0) {
        container.innerHTML = '<div class="empty-hint">No assets yet</div>';
        return;
      }

      const total = d.portfolio_value || 1;
      container.innerHTML = d.assets
        .filter(a => a.value > 0)
        .map(a => {
          const pct = Math.min(100, (a.value / total) * 100);
          const colors = { BTC: '#F7931A', ETH: '#627EEA', TON: '#0088CC', SOL: '#9945FF', USD: '#28C76F', USDT: '#26A17B' };
          const color = colors[a.asset] || '#0088CC';
          return `
            <div class="allocation-item">
              <div class="allocation-symbol" style="background: linear-gradient(135deg, ${color}cc, ${color}66);">
                ${esc(a.asset.slice(0, 3))}
              </div>
              <div class="allocation-info">
                <div class="allocation-name">${esc(a.asset)}</div>
                <div class="allocation-bar-wrap">
                  <div class="allocation-bar" style="width:${pct.toFixed(1)}%; background: linear-gradient(90deg, ${color}, ${color}99);"></div>
                </div>
              </div>
              <div class="allocation-right">
                <div class="allocation-value">$${Fmt.usd(a.value)}</div>
                <div class="allocation-pct">${pct.toFixed(1)}%</div>
              </div>
            </div>
          `;
        })
        .join('');
    },
  };

  window.Portfolio = Portfolio;
})();
