/**
 * TON AI Agent – Multi-Agent Portfolio Component (Issue #259)
 *
 * Displays:
 *  - Agent list with allocation indicators
 *  - Allocation sliders (read-only view; edit triggers API call)
 *  - Portfolio breakdown: portfolioPnL, diversificationScore, riskExposure
 */
(function () {
  'use strict';

  const { State, API, Fmt, el, esc } = window.App;

  // Default demo portfolio data used when the API is unavailable
  const DEMO_PORTFOLIO = {
    agents: [
      { id: 'agent_trend',     name: 'Trend Agent',     strategy: 'trend',      allocation: 0.40, score: 72, status: 'active' },
      { id: 'agent_arb',       name: 'Arbitrage Agent', strategy: 'arbitrage',  allocation: 0.30, score: 65, status: 'active' },
      { id: 'agent_signal',    name: 'AI Signal Agent', strategy: 'ai-signal',  allocation: 0.30, score: 68, status: 'active' },
    ],
    metrics: {
      portfolioPnL: 1240.50,
      diversificationScore: 67,
      riskExposure: 18,
      activeAgents: 3,
    },
  };

  // ============================================================================
  // Strategy colour palette (same tokens used across the app)
  // ============================================================================
  const STRATEGY_COLORS = {
    'trend':      '#0088CC',
    'arbitrage':  '#28C76F',
    'ai-signal':  '#9945FF',
  };

  function strategyColor(strategy) {
    return STRATEGY_COLORS[strategy] || '#8A9BB0';
  }

  // ============================================================================
  // PortfolioMultiAgent component
  // ============================================================================
  const PortfolioMultiAgent = {

    async refresh() {
      await Promise.all([
        this.loadAgents(),
        this.loadMetrics(),
      ]);
    },

    // --------------------------------------------------------------------------
    // Data loading
    // --------------------------------------------------------------------------

    async loadAgents() {
      const data = await API.get('/portfolio/agents');
      const agents = data?.agents ?? DEMO_PORTFOLIO.agents;
      State.portfolioAgents = Array.isArray(agents) ? agents : DEMO_PORTFOLIO.agents;
      this.renderAgentList();
    },

    async loadMetrics() {
      const data = await API.get('/portfolio/metrics');
      const metrics = data ?? DEMO_PORTFOLIO.metrics;
      State.portfolioMetrics = metrics;
      this.renderMetrics();
    },

    // --------------------------------------------------------------------------
    // Rendering — Agent list
    // --------------------------------------------------------------------------

    renderAgentList() {
      const agents = State.portfolioAgents ?? DEMO_PORTFOLIO.agents;
      const container = el('portfolio-agent-list');
      if (!container) return;

      if (agents.length === 0) {
        container.innerHTML = '<div class="empty-hint">No agents configured</div>';
        return;
      }

      container.innerHTML = agents.map(a => this._agentCardHtml(a)).join('');

      // Bind allocation slider changes
      container.querySelectorAll('.allocation-slider').forEach(slider => {
        slider.addEventListener('change', () => {
          this._onAllocationChange(slider.dataset.agentId, parseFloat(slider.value));
        });
      });
    },

    _agentCardHtml(agent) {
      const pct = Math.round((agent.allocation ?? 0) * 100);
      const color = strategyColor(agent.strategy);
      const scoreClass = (agent.score ?? 50) >= 70 ? 'positive' : (agent.score ?? 50) >= 40 ? '' : 'negative';

      return `
        <div class="portfolio-agent-card" data-agent-id="${esc(agent.id)}">
          <div class="portfolio-agent-header">
            <div class="portfolio-agent-icon" style="background: linear-gradient(135deg, ${color}cc, ${color}44);">
              ${esc((agent.strategy ?? '?').slice(0, 2).toUpperCase())}
            </div>
            <div class="portfolio-agent-info">
              <div class="portfolio-agent-name">${esc(agent.name)}</div>
              <div class="portfolio-agent-strategy">${esc(agent.strategy)}</div>
            </div>
            <div class="portfolio-agent-score ${scoreClass}">${agent.score ?? '—'}</div>
          </div>

          <div class="portfolio-agent-allocation">
            <div class="allocation-label">
              <span>Allocation</span>
              <span class="allocation-pct" id="alloc-pct-${esc(agent.id)}">${pct}%</span>
            </div>
            <input
              type="range"
              class="allocation-slider"
              data-agent-id="${esc(agent.id)}"
              min="0" max="100" step="5"
              value="${pct}"
            />
            <div class="allocation-bar">
              <div class="allocation-bar-fill" style="width: ${pct}%; background: ${color};"></div>
            </div>
          </div>

          <div class="portfolio-agent-status">
            <span class="agent-status-badge ${esc(agent.status ?? 'active')}">${esc(agent.status ?? 'active')}</span>
          </div>
        </div>
      `;
    },

    // --------------------------------------------------------------------------
    // Rendering — Portfolio metrics
    // --------------------------------------------------------------------------

    renderMetrics() {
      const m = State.portfolioMetrics ?? DEMO_PORTFOLIO.metrics;

      const pnlEl = el('portfolio-multi-pnl');
      if (pnlEl) {
        pnlEl.textContent = `${Fmt.sign(m.portfolioPnL)}${Fmt.usd(m.portfolioPnL)}`;
        pnlEl.className = `portfolio-metric-value ${m.portfolioPnL >= 0 ? 'positive' : 'negative'}`;
      }

      const divEl = el('portfolio-diversification-score');
      if (divEl) {
        divEl.textContent = `${m.diversificationScore}/100`;
        const scoreClass = m.diversificationScore >= 60 ? 'positive' : m.diversificationScore >= 30 ? '' : 'negative';
        divEl.className = `portfolio-metric-value ${scoreClass}`;
      }

      const riskEl = el('portfolio-risk-exposure');
      if (riskEl) {
        riskEl.textContent = `${m.riskExposure}%`;
        const riskClass = m.riskExposure <= 20 ? 'positive' : m.riskExposure <= 50 ? '' : 'negative';
        riskEl.className = `portfolio-metric-value ${riskClass}`;
      }

      const agentsEl = el('portfolio-active-agents');
      if (agentsEl) agentsEl.textContent = m.activeAgents;
    },

    // --------------------------------------------------------------------------
    // Interaction — allocation slider changed
    // --------------------------------------------------------------------------

    async _onAllocationChange(agentId, newPct) {
      // Optimistic UI update
      const pctEl = el(`alloc-pct-${agentId}`);
      if (pctEl) pctEl.textContent = `${newPct}%`;

      // Persist via API
      await API.post('/portfolio/agents/allocation', {
        agentId,
        allocationPercent: newPct,
      });

      // Reload metrics after reallocation
      await this.loadMetrics();
    },
  };

  // Attach to global App namespace
  window.App = window.App || {};
  window.App.PortfolioMultiAgent = PortfolioMultiAgent;

})();
