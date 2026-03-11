/**
 * TON AI Agent – Active Agents Component
 * Displays agent list with Status, Strategy, Profit
 * Provides Start / Stop / Restart / Stop Permanently controls
 */
(function () {
  'use strict';

  const { State, API, DemoData, Fmt, el, esc, TG } = window.App;

  const Agents = {
    async refresh() {
      let data = await API.get('/agents');
      if (!data) data = DemoData.agents();
      else if (Array.isArray(data.agents)) data = data.agents;
      State.agents = Array.isArray(data) ? data : [];
      this.render();
    },

    render() {
      const agents = State.agents;
      el('agents-count-badge').textContent = agents.length;

      if (agents.length === 0) {
        el('agents-empty').classList.remove('hidden');
        el('agents-list').classList.add('hidden');
        return;
      }

      el('agents-empty').classList.add('hidden');
      el('agents-list').classList.remove('hidden');

      el('agents-list').innerHTML = agents.map(a => this._cardHtml(a)).join('');

      // Bind click to open detail modal
      el('agents-list').querySelectorAll('.agent-card').forEach(card => {
        card.addEventListener('click', () => this.openModal(card.dataset.agentId));
      });
    },

    _cardHtml(a) {
      const pnl = a.profit ?? a.pnl ?? 0;
      return `
        <div class="agent-card" data-agent-id="${esc(a.id)}">
          <div class="agent-card-top">
            <span class="agent-card-name">${esc(a.name)}</span>
            <span class="agent-status-badge ${esc(a.status)}">${esc(a.status)}</span>
          </div>
          <div class="agent-card-strategy">${esc(a.strategy || a.strategy_name || '—')}</div>
          <div class="agent-card-stats">
            <div class="agent-stat">
              <span class="agent-stat-label">Value</span>
              <span class="agent-stat-value">$${Fmt.usd(a.value)}</span>
            </div>
            <div class="agent-stat">
              <span class="agent-stat-label">Profit</span>
              <span class="agent-stat-value ${pnl >= 0 ? 'positive' : 'negative'}">
                ${Fmt.sign(pnl)}${Fmt.usd(pnl)}
              </span>
            </div>
            <div class="agent-stat">
              <span class="agent-stat-label">ROI</span>
              <span class="agent-stat-value positive">${parseFloat(a.roi || 0).toFixed(1)}%</span>
            </div>
          </div>
          <div class="agent-card-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      `;
    },

    /* --------------------------------------------------------
       Agent Detail Modal
       -------------------------------------------------------- */
    openModal(agentId) {
      const agent = State.agents.find(a => a.id === agentId);
      if (!agent) return;

      State.selectedAgentId = agentId;
      TG.haptic.impact();

      // Populate modal
      el('modal-agent-name').textContent = agent.name;
      el('modal-agent-status').textContent = agent.status;
      el('modal-agent-status').className = `agent-status-badge ${agent.status}`;
      el('modal-agent-strategy').textContent = agent.strategy || agent.strategy_name || '—';
      el('modal-agent-value').textContent = `$${Fmt.usd(agent.value)}`;
      const pnl = agent.profit ?? agent.pnl ?? 0;
      el('modal-agent-pnl').textContent = `${Fmt.sign(pnl)}${Fmt.usd(pnl)}`;
      el('modal-agent-pnl').className = `modal-stat-value ${pnl >= 0 ? 'positive' : 'negative'}`;
      el('modal-agent-roi').textContent = `${parseFloat(agent.roi || 0).toFixed(1)}%`;
      el('modal-agent-winrate').textContent = `${parseFloat(agent.win_rate || 0).toFixed(1)}%`;
      el('modal-agent-trades').textContent = agent.total_trades || 0;

      // Update control button states
      this._updateControlButtons(agent.status);

      // Show modal
      el('agent-modal').classList.remove('hidden');
      TG.showBackButton(() => this.closeModal());
    },

    _updateControlButtons(status) {
      const startBtn = el('ctrl-start');
      const stopBtn = el('ctrl-stop');
      const restartBtn = el('ctrl-restart');

      // 'running' is the canonical active state (Issue #185 Agent Control API)
      const isRunning = status === 'running' || status === 'active';
      startBtn.disabled = isRunning;
      stopBtn.disabled = status === 'stopped';
      restartBtn.disabled = status === 'stopped';

      startBtn.style.opacity = startBtn.disabled ? '0.4' : '1';
      stopBtn.style.opacity = stopBtn.disabled ? '0.4' : '1';
      restartBtn.style.opacity = restartBtn.disabled ? '0.4' : '1';
    },

    closeModal() {
      el('agent-modal').classList.add('hidden');
      State.selectedAgentId = null;
      TG.hideBackButton();
    },

    /* --------------------------------------------------------
       Agent Control Actions
       -------------------------------------------------------- */
    async _controlAction(action) {
      const agentId = State.selectedAgentId;
      if (!agentId) return;

      TG.haptic.impact();

      const labels = { start: 'Starting', pause: 'Pausing', restart: 'Restarting', stop: 'Stopping' };
      // Use canonical statuses from Agent Control API (Issue #185): running/stopped/paused/error
      const newStatus = { start: 'running', pause: 'paused', restart: 'running', stop: 'stopped' };

      // Optimistic UI update
      const agent = State.agents.find(a => a.id === agentId);
      if (agent) {
        agent.status = newStatus[action];
        el('modal-agent-status').textContent = agent.status;
        el('modal-agent-status').className = `agent-status-badge ${agent.status}`;
        this._updateControlButtons(agent.status);
      }

      // API call (ignored in demo mode)
      const result = await API.request(`/agents/${agentId}/${action}`, { method: 'POST' });

      TG.haptic.notify('success');

      // Update list
      this.render();

      if (action === 'stop') {
        setTimeout(() => this.closeModal(), 600);
      }
    },
  };

  /* --------------------------------------------------------
     Wire up modal buttons (once DOM is ready)
     -------------------------------------------------------- */
  function setupModalButtons() {
    el('close-agent-modal')?.addEventListener('click', () => Agents.closeModal());
    el('modal-overlay')?.addEventListener('click', () => Agents.closeModal());
    el('ctrl-start')?.addEventListener('click', () => Agents._controlAction('start'));
    // 'stop' maps to POST /api/agents/:id/stop (Agent Control API, Issue #185)
    el('ctrl-stop')?.addEventListener('click', () => Agents._controlAction('stop'));
    el('ctrl-restart')?.addEventListener('click', () => Agents._controlAction('restart'));
    el('ctrl-stop-fully')?.addEventListener('click', () => {
      TG.confirm('Permanently stop this agent? All positions will remain unchanged.', (ok) => {
        if (ok) Agents._controlAction('stop');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupModalButtons);
  } else {
    setupModalButtons();
  }

  window.Agents = Agents;
})();
