/**
 * TON AI Agent – Trade History Component
 * BUY/SELL records with filters, pagination, sorting
 */
(function () {
  'use strict';

  const { State, API, DemoData, Fmt, el, esc } = window.App;

  const Trades = {
    async refresh() {
      await this.load(1);
    },

    async load(page) {
      State.tradePage = page;
      const f = State.tradeFilters;

      const params = new URLSearchParams({
        page: String(page),
        per_page: String(State.tradePerPage),
        sort: f.sort,
      });
      if (f.action !== 'all') params.set('action', f.action);
      if (f.asset !== 'all') params.set('asset', f.asset);

      let data = await API.get(`/portfolio/trades?${params}`);
      if (!data) {
        data = DemoData.trades(page, State.tradePerPage, f);
      }

      State.trades.list = data.trades || [];
      State.trades.pagination = data.pagination || {};

      this.renderSummary(data);
      this.renderList();
      this.renderPagination(data.pagination || {});
    },

    renderSummary(data) {
      const trades = data.trades || [];
      const total = (data.pagination || {}).total || trades.length;
      const totalPnl = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);

      el('trade-count-label').textContent = `${total} trade${total !== 1 ? 's' : ''}`;

      const pnlEl = el('trade-summary-pnl');
      pnlEl.textContent = `P&L: ${Fmt.sign(totalPnl)}${Fmt.usd(totalPnl)}`;
      pnlEl.style.color = totalPnl >= 0 ? 'var(--positive)' : 'var(--negative)';
    },

    renderList() {
      const trades = State.trades.list;
      const container = el('trades-list');
      const empty = el('trades-empty');

      if (!trades.length) {
        empty.classList.remove('hidden');
        container.classList.add('hidden');
        return;
      }

      empty.classList.add('hidden');
      container.classList.remove('hidden');

      container.innerHTML = trades.map(t => this._rowHtml(t)).join('');
    },

    _rowHtml(t) {
      const pnl = parseFloat(t.pnl) || 0;
      const pnlClass = pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : 'neutral';
      const pnlText = pnl !== 0 ? `${Fmt.sign(pnl)}${Fmt.usd(pnl)}` : '—';

      return `
        <div class="trade-row">
          <div class="trade-action-badge ${t.action.toLowerCase()}">${esc(t.action)}</div>
          <div class="trade-info">
            <div class="trade-asset">${esc(t.asset)}</div>
            <div class="trade-details">
              ${esc(t.amount)} @ $${esc(Number(t.price).toLocaleString())}
              ${t.strategy_name ? ` · ${esc(t.strategy_name)}` : ''}
            </div>
          </div>
          <div class="trade-right">
            <div class="trade-value">$${Fmt.usd(t.value)}</div>
            <div class="trade-pnl ${pnlClass}">${pnlText}</div>
            <div class="trade-time">${Fmt.ts(t.timestamp)}</div>
          </div>
        </div>
      `;
    },

    renderPagination(p) {
      const pgEl = el('pagination');
      if (!p.pages || p.pages <= 1) {
        pgEl.classList.add('hidden');
        return;
      }

      pgEl.classList.remove('hidden');
      el('page-info').textContent = `${p.page} / ${p.pages}`;

      const prevBtn = el('prev-page');
      const nextBtn = el('next-page');

      prevBtn.disabled = p.page <= 1;
      nextBtn.disabled = p.page >= p.pages;
    },
  };

  /* --------------------------------------------------------
     Filter and pagination event listeners
     -------------------------------------------------------- */
  function setupTradeFilters() {
    el('trade-action-filter')?.addEventListener('change', (e) => {
      State.tradeFilters.action = e.target.value;
      Trades.load(1);
    });

    el('trade-asset-filter')?.addEventListener('change', (e) => {
      State.tradeFilters.asset = e.target.value;
      Trades.load(1);
    });

    el('trade-sort')?.addEventListener('change', (e) => {
      State.tradeFilters.sort = e.target.value;
      Trades.load(1);
    });

    el('prev-page')?.addEventListener('click', () => {
      const page = State.tradePage;
      if (page > 1) Trades.load(page - 1);
    });

    el('next-page')?.addEventListener('click', () => {
      const page = State.tradePage;
      const total = State.trades.pagination.pages || 1;
      if (page < total) Trades.load(page + 1);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTradeFilters);
  } else {
    setupTradeFilters();
  }

  window.Trades = Trades;
})();
