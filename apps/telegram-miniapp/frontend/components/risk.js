/**
 * TON AI Agent – Risk Dashboard Component
 * Issue #203: Risk Management Engine
 * Issue #269: Risk Engine Hardening & Capital Protection Layer
 *
 * Displays risk overview for the Telegram Mini App:
 *   - Portfolio Risk Level (with color coding)
 *   - Current Drawdown % (real-time)
 *   - Daily PnL and Daily Loss Limit progress
 *   - Open Exposure %
 *   - Rolling loss windows (24h / 7d)
 *   - High-risk warnings and trading-paused banner
 *   - Execution errors surfaced with risk reason code
 *   - Active Risk Controls Configuration
 */
(function () {
  'use strict';

  const { State, API, DemoData, Fmt, el, esc } = window.App;

  const Risk = {
    async refresh() {
      await Promise.all([this.loadRiskOverview(), this.loadRiskControls(), this.loadRollingLoss()]);
    },

    async loadRiskOverview() {
      let data = await API.get('/risk/overview');
      // Use demo mode data if enabled and no API data
      if (!data && window.DemoMode && window.DemoMode.isEnabled()) {
        data = window.DemoMode.getDemoRiskOverview();
      } else if (!data) {
        data = DemoData.riskOverview();
      }
      State.riskOverview = data;
      this.renderRiskOverview(data);
    },

    async loadRiskControls() {
      let data = await API.get('/risk/controls');
      if (!data) data = DemoData.riskControls();
      State.riskControls = data;
      this.renderRiskControls(data);
    },

    async loadRollingLoss() {
      let data = await API.get('/risk/rolling-loss');
      if (!data) data = DemoData.rollingLoss();
      State.rollingLoss = data;
      this.renderRollingLoss(data);
    },

    renderRiskOverview(d) {
      // Risk Level Hero
      const riskLevel = d.portfolio_risk_level || 'Low';
      const riskColor = d.risk_color || 'green';
      const riskScore = d.risk_score || 0;

      // Update risk level indicator
      const levelEl = el('risk-level');
      if (levelEl) {
        levelEl.textContent = riskLevel;
        levelEl.className = `risk-level ${riskColor}`;
      }

      // Update risk score
      const scoreEl = el('risk-score');
      if (scoreEl) {
        scoreEl.textContent = `${riskScore}/100`;
      }

      // Risk score progress bar
      const progressEl = el('risk-progress');
      if (progressEl) {
        progressEl.style.width = `${Math.min(100, riskScore)}%`;
        progressEl.className = `risk-progress-bar ${riskColor}`;
      }

      // Drawdown
      const drawdownEl = el('current-drawdown');
      if (drawdownEl) {
        const drawdown = d.drawdown_percent || 0;
        drawdownEl.textContent = Fmt.pct(drawdown);
        drawdownEl.className = `metric-value ${drawdown > 10 ? 'warning' : drawdown > 5 ? 'caution' : ''}`;
      }

      // Exposure
      const exposureEl = el('open-exposure');
      if (exposureEl) {
        const exposure = d.exposure_percent || 0;
        exposureEl.textContent = Fmt.pct(exposure);
      }

      // Daily loss
      const dailyLossEl = el('daily-loss');
      if (dailyLossEl) {
        const dailyLoss = d.daily_loss_usd || 0;
        const dailyLossSign = dailyLoss < 0 ? '' : '-';
        dailyLossEl.textContent = `${dailyLossSign}${Fmt.usd(Math.abs(dailyLoss))}`;
        dailyLossEl.className = `metric-value ${dailyLoss > 0 ? 'negative' : ''}`;
      }

      // Max drawdown limit
      const maxDrawdownEl = el('max-drawdown-limit');
      if (maxDrawdownEl) {
        maxDrawdownEl.textContent = Fmt.pct(d.max_drawdown_percent || 15);
      }

      // Daily loss limit
      const dailyLimitEl = el('daily-loss-limit');
      if (dailyLimitEl) {
        dailyLimitEl.textContent = Fmt.pct(d.daily_loss_limit_percent || 3);
      }

      // Trading status
      const statusEl = el('trading-status');
      if (statusEl) {
        const tradingDisabled = d.trading_disabled || false;
        statusEl.textContent = tradingDisabled ? 'Disabled' : 'Active';
        statusEl.className = `status-badge ${tradingDisabled ? 'disabled' : 'active'}`;
      }

      // Issue #269: Trading-paused banner
      this.renderTradingPausedBanner(d);

      // Issue #269: Daily PnL progress bar
      const dailyPnlBarEl = el('daily-loss-progress');
      if (dailyPnlBarEl) {
        const dailyLoss = d.daily_loss_usd || 0;
        const dailyLimit = d.daily_loss_limit_usd || (d.daily_loss_limit_percent || 3) / 100 * (d.portfolio_value_usd || 10000);
        const pct = dailyLimit > 0 ? Math.min(100, (dailyLoss / dailyLimit) * 100) : 0;
        dailyPnlBarEl.style.width = `${pct}%`;
        dailyPnlBarEl.className = `progress-bar ${pct > 80 ? 'danger' : pct > 50 ? 'warning' : 'safe'}`;
      }

      // Issue #269: Risk score category label
      const riskCategoryEl = el('risk-score-category');
      if (riskCategoryEl) {
        const score = d.risk_score || 0;
        let category = 'Low';
        if (score > 80) category = 'Critical';
        else if (score > 60) category = 'High';
        else if (score > 30) category = 'Moderate';
        riskCategoryEl.textContent = category;
        riskCategoryEl.className = `risk-category ${score > 80 ? 'critical' : score > 60 ? 'high' : score > 30 ? 'moderate' : 'low'}`;
      }

      // Render tips/warnings
      this.renderRiskTips(d.tips || []);

      // Render alerts
      this.renderAlerts(d.alerts || []);

      // Issue #269: Render execution errors with risk reason codes
      this.renderExecutionErrors(d.last_execution_errors || []);
    },

    // Issue #269: Render trading-paused banner
    renderTradingPausedBanner(d) {
      const bannerEl = el('trading-paused-banner');
      if (!bannerEl) return;

      const tradingDisabled = d.trading_disabled || false;
      const haltReason = d.halt_reason || null;
      const drawdown = d.drawdown_percent || 0;
      const maxDrawdown = d.max_drawdown_percent || 15;

      if (tradingDisabled || drawdown >= maxDrawdown) {
        bannerEl.style.display = 'block';
        const reasonText = haltReason
          ? `Reason: ${esc(haltReason)}`
          : drawdown >= maxDrawdown
            ? `Max drawdown ${maxDrawdown}% reached`
            : 'Trading has been paused by risk controls';
        bannerEl.innerHTML = `
          <div class="paused-banner warning">
            <span class="banner-icon">⚠️</span>
            <div class="banner-content">
              <strong>Trading Paused</strong>
              <span>${reasonText}</span>
            </div>
            <button class="btn-sm" onclick="window.App.Risk.resumeTrading()">Resume</button>
          </div>
        `;
      } else {
        bannerEl.style.display = 'none';
      }
    },

    // Issue #269: Render rolling 24h/7d loss windows
    renderRollingLoss(d) {
      const loss24hEl = el('rolling-loss-24h');
      if (loss24hEl) {
        const loss = d.loss_24h_usd || 0;
        const cap = d.cap_24h_usd || 0;
        loss24hEl.textContent = Fmt.usd(loss);
        loss24hEl.className = `metric-value ${cap > 0 && loss >= cap * 0.8 ? 'warning' : ''}`;
      }

      const loss7dEl = el('rolling-loss-7d');
      if (loss7dEl) {
        const loss = d.loss_7d_usd || 0;
        const cap = d.cap_7d_usd || 0;
        loss7dEl.textContent = Fmt.usd(loss);
        loss7dEl.className = `metric-value ${cap > 0 && loss >= cap * 0.8 ? 'warning' : ''}`;
      }

      const cap24hEl = el('rolling-loss-cap-24h');
      if (cap24hEl) cap24hEl.textContent = Fmt.usd(d.cap_24h_usd || 0);

      const cap7dEl = el('rolling-loss-cap-7d');
      if (cap7dEl) cap7dEl.textContent = Fmt.usd(d.cap_7d_usd || 0);
    },

    // Issue #269: Render execution errors with risk reason codes
    renderExecutionErrors(errors) {
      const container = el('execution-errors');
      if (!container) return;

      if (!errors || errors.length === 0) {
        container.style.display = 'none';
        return;
      }

      // Friendly labels for risk reason codes
      const reasonLabels = {
        RISK_MAX_DRAWDOWN: 'Max Drawdown Exceeded',
        RISK_DAILY_LOSS: 'Daily Loss Cap Reached',
        RISK_POSITION_TOO_LARGE: 'Position Too Large',
        RISK_OVEREXPOSURE: 'Portfolio Over-Exposed',
        RISK_TOO_FREQUENT: 'Trade Frequency Limit',
        RISK_SYSTEM_HALT: 'System Halted',
        RISK_SLIPPAGE_TOO_HIGH: 'Slippage Too High',
        RISK_ROLLING_LOSS_24H: '24h Loss Limit Reached',
        RISK_ROLLING_LOSS_7D: '7d Loss Limit Reached',
      };

      container.style.display = 'block';
      container.innerHTML = `
        <div class="errors-header">
          <span class="errors-title">Blocked Executions</span>
          <span class="errors-count">${errors.length}</span>
        </div>
        ${errors.slice(0, 5).map(err => `
          <div class="error-item">
            <div class="error-icon">🚫</div>
            <div class="error-content">
              <div class="error-reason">${esc(reasonLabels[err.reason] || err.reason || 'Risk Check Failed')}</div>
              <div class="error-detail">${esc(err.message || '')}</div>
              <div class="error-time">${this.formatTime(err.timestamp)}</div>
            </div>
          </div>
        `).join('')}
      `;
    },

    renderRiskControls(d) {
      // Stop-loss
      const stopLossEl = el('stop-loss-setting');
      if (stopLossEl) {
        const enabled = d.stop_loss_enabled !== false;
        const percent = d.stop_loss_percent || 5;
        stopLossEl.innerHTML = `
          <span class="control-status ${enabled ? 'enabled' : 'disabled'}">
            ${enabled ? '✓' : '○'}
          </span>
          <span>Stop-Loss: ${percent}%</span>
        `;
      }

      // Position size limit
      const positionEl = el('position-limit-setting');
      if (positionEl) {
        const percent = d.max_position_size_percent || 5;
        positionEl.innerHTML = `
          <span class="control-status enabled">✓</span>
          <span>Max Position: ${percent}%</span>
        `;
      }

      // Exposure limit
      const exposureEl = el('exposure-limit-setting');
      if (exposureEl) {
        const percent = d.max_asset_exposure_percent || 20;
        exposureEl.innerHTML = `
          <span class="control-status enabled">✓</span>
          <span>Max Exposure: ${percent}%</span>
        `;
      }

      // Auto-pause
      const autoPauseEl = el('auto-pause-setting');
      if (autoPauseEl) {
        const enabled = d.auto_pause_enabled !== false;
        autoPauseEl.innerHTML = `
          <span class="control-status ${enabled ? 'enabled' : 'disabled'}">
            ${enabled ? '✓' : '○'}
          </span>
          <span>Auto-Pause on Risk</span>
        `;
      }
    },

    renderRiskTips(tips) {
      const container = el('risk-tips');
      if (!container) return;

      if (!tips || tips.length === 0) {
        container.innerHTML = '<div class="tip-item success">All risk parameters within safe limits</div>';
        return;
      }

      container.innerHTML = tips.map(tip => `
        <div class="tip-item warning">
          <span class="tip-icon">⚠️</span>
          <span>${esc(tip)}</span>
        </div>
      `).join('');
    },

    renderAlerts(alerts) {
      const container = el('risk-alerts');
      if (!container) return;

      if (!alerts || alerts.length === 0) {
        container.style.display = 'none';
        return;
      }

      container.style.display = 'block';
      container.innerHTML = `
        <div class="alerts-header">
          <span class="alerts-title">Active Alerts</span>
          <span class="alerts-count">${alerts.length}</span>
        </div>
        ${alerts.map(alert => `
          <div class="alert-item ${alert.severity || 'warning'}">
            <div class="alert-icon">${alert.severity === 'critical' ? '🔴' : '🟡'}</div>
            <div class="alert-content">
              <div class="alert-message">${esc(alert.message)}</div>
              <div class="alert-time">${this.formatTime(alert.timestamp)}</div>
            </div>
          </div>
        `).join('')}
      `;
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    // Quick actions
    async configureRiskLimits() {
      // Show configuration modal
      const modal = el('risk-config-modal');
      if (modal) {
        modal.style.display = 'flex';
        this.loadConfigValues();
      }
    },

    async loadConfigValues() {
      const controls = State.riskControls || {};

      const stopLossInput = el('config-stop-loss');
      if (stopLossInput) stopLossInput.value = controls.stop_loss_percent || 5;

      const positionInput = el('config-max-position');
      if (positionInput) positionInput.value = controls.max_position_size_percent || 5;

      const exposureInput = el('config-max-exposure');
      if (exposureInput) exposureInput.value = controls.max_asset_exposure_percent || 20;

      const drawdownInput = el('config-max-drawdown');
      if (drawdownInput) drawdownInput.value = controls.max_drawdown_percent || 15;

      const dailyLossInput = el('config-daily-loss');
      if (dailyLossInput) dailyLossInput.value = controls.daily_loss_limit_percent || 3;
    },

    async saveRiskConfig() {
      const config = {
        stop_loss_percent: parseFloat(el('config-stop-loss')?.value) || 5,
        max_position_size_percent: parseFloat(el('config-max-position')?.value) || 5,
        max_asset_exposure_percent: parseFloat(el('config-max-exposure')?.value) || 20,
        max_drawdown_percent: parseFloat(el('config-max-drawdown')?.value) || 15,
        daily_loss_limit_percent: parseFloat(el('config-daily-loss')?.value) || 3,
        // Issue #269: new hardened config fields
        daily_loss_limit_usd: parseFloat(el('config-daily-loss-usd')?.value) || 500,
        max_slippage_bps: parseFloat(el('config-max-slippage-bps')?.value) || 100,
        max_trades_per_window: parseInt(el('config-max-trades')?.value, 10) || 10,
      };

      try {
        await API.post('/risk/config', config);
        this.closeConfigModal();
        await this.refresh();
        window.App.Toast?.show('Risk settings saved', 'success');
      } catch (err) {
        window.App.Toast?.show('Failed to save settings', 'error');
      }
    },

    closeConfigModal() {
      const modal = el('risk-config-modal');
      if (modal) modal.style.display = 'none';
    },

    async pauseAllTrading() {
      if (!confirm('Pause all trading? This will stop all agents from executing trades.')) {
        return;
      }

      try {
        await API.post('/risk/pause-all');
        await this.refresh();
        window.App.Toast?.show('All trading paused', 'warning');
      } catch (err) {
        window.App.Toast?.show('Failed to pause trading', 'error');
      }
    },

    async resumeTrading() {
      try {
        await API.post('/risk/resume');
        await this.refresh();
        window.App.Toast?.show('Trading resumed', 'success');
      } catch (err) {
        window.App.Toast?.show('Failed to resume trading', 'error');
      }
    },

    // Initialize event listeners
    init() {
      // Config modal close
      const closeBtn = el('risk-config-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeConfigModal());
      }

      // Save config button
      const saveBtn = el('risk-config-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveRiskConfig());
      }

      // Configure button
      const configBtn = el('btn-configure-risk');
      if (configBtn) {
        configBtn.addEventListener('click', () => this.configureRiskLimits());
      }

      // Pause button
      const pauseBtn = el('btn-pause-trading');
      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => this.pauseAllTrading());
      }

      // Resume button
      const resumeBtn = el('btn-resume-trading');
      if (resumeBtn) {
        resumeBtn.addEventListener('click', () => this.resumeTrading());
      }
    }
  };

  // Add demo data for risk
  if (typeof DemoData !== 'undefined') {
    DemoData.riskOverview = function () {
      return {
        portfolio_risk_level: 'Low',
        risk_color: 'green',
        risk_score: 25,
        drawdown_percent: 3.5,
        exposure_percent: 65,
        daily_loss_usd: 0,
        daily_loss_limit_usd: 500,
        daily_loss_limit_percent: 3,
        portfolio_value_usd: 10000,
        max_drawdown_percent: 15,
        trading_disabled: false,
        halt_reason: null,
        tips: [],
        alerts: [],
        // Issue #269: execution errors with risk reason codes
        last_execution_errors: []
      };
    };

    DemoData.riskControls = function () {
      return {
        stop_loss_enabled: true,
        stop_loss_percent: 5,
        max_position_size_percent: 5,
        max_asset_exposure_percent: 20,
        max_drawdown_percent: 15,
        daily_loss_limit_percent: 3,
        daily_loss_limit_usd: 500,
        max_slippage_bps: 100,
        max_trades_per_window: 10,
        auto_pause_enabled: true,
        auto_suspend_enabled: true
      };
    };

    // Issue #269: Rolling loss window demo data
    DemoData.rollingLoss = function () {
      return {
        loss_24h_usd: 35.50,
        loss_7d_usd: 120.00,
        cap_24h_usd: 600,
        cap_7d_usd: 2000
      };
    };
  }

  // Export
  window.App.Risk = Risk;
})();
