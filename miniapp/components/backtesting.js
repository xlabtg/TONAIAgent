/**
 * TON AI Agent – Strategy Backtesting Component
 * Run historical backtests on marketplace strategies
 */
(function () {
  'use strict';

  const { State, API, DemoData, Fmt, el, esc, TG } = window.App;

  // Local backtesting state
  const BacktestState = {
    selectedStrategy: null,
    isRunning: false,
    results: [],
    currentResult: null,
    config: {
      asset: 'TON',
      timeframe: '1h',
      startDate: '',
      endDate: '',
      initialCapital: 10000,
    },
  };

  // Available assets and timeframes
  const AVAILABLE_ASSETS = ['TON', 'BTC', 'ETH', 'SOL'];
  const AVAILABLE_TIMEFRAMES = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
  ];

  const Backtesting = {
    /**
     * Initialize backtesting with default dates
     */
    init() {
      // Set default date range (last 6 months)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);

      BacktestState.config.startDate = this.formatDateForInput(startDate);
      BacktestState.config.endDate = this.formatDateForInput(endDate);
    },

    /**
     * Open backtest modal for a specific strategy
     */
    openBacktestModal(strategyId) {
      // Get strategy from marketplace
      const strategies = window.DemoData?.marketplace() || [];
      const strategy = strategies.find(s => s.id === strategyId);

      if (!strategy) {
        TG.alert('Strategy not found');
        return;
      }

      BacktestState.selectedStrategy = strategy;
      this.renderBacktestModal();
      el('backtest-modal').classList.remove('hidden');
      TG.haptic.select();
    },

    /**
     * Close backtest modal
     */
    closeBacktestModal() {
      el('backtest-modal').classList.add('hidden');
      BacktestState.selectedStrategy = null;
      BacktestState.currentResult = null;
    },

    /**
     * Render the backtest configuration modal
     */
    renderBacktestModal() {
      const strategy = BacktestState.selectedStrategy;
      if (!strategy) return;

      // Strategy info
      el('bt-strategy-name').textContent = strategy.name;
      el('bt-strategy-meta').textContent = `by ${strategy.author} | ${this.formatCategory(strategy.category)}`;

      // Asset selector
      const assetSelect = el('bt-asset-select');
      assetSelect.innerHTML = AVAILABLE_ASSETS.map(asset =>
        `<option value="${asset}" ${asset === BacktestState.config.asset ? 'selected' : ''}>${asset}</option>`
      ).join('');

      // Timeframe selector
      const timeframeSelect = el('bt-timeframe-select');
      timeframeSelect.innerHTML = AVAILABLE_TIMEFRAMES.map(tf =>
        `<option value="${tf.value}" ${tf.value === BacktestState.config.timeframe ? 'selected' : ''}>${tf.label}</option>`
      ).join('');

      // Date inputs
      el('bt-start-date').value = BacktestState.config.startDate;
      el('bt-end-date').value = BacktestState.config.endDate;

      // Capital input
      el('bt-capital').value = BacktestState.config.initialCapital;

      // Reset result view
      el('bt-config-section').classList.remove('hidden');
      el('bt-result-section').classList.add('hidden');
      el('bt-run-btn').disabled = false;
      el('bt-run-btn').textContent = 'Run Backtest';
    },

    /**
     * Run backtest with current configuration
     */
    async runBacktest() {
      if (BacktestState.isRunning) return;

      const strategy = BacktestState.selectedStrategy;
      if (!strategy) return;

      // Validate configuration
      const validation = this.validateConfig();
      if (!validation.valid) {
        TG.alert(validation.errors.join('\n'));
        return;
      }

      BacktestState.isRunning = true;
      TG.haptic.impact();

      // Update UI to show running state
      const runBtn = el('bt-run-btn');
      runBtn.disabled = true;
      runBtn.innerHTML = `
        <span class="spinner"></span>
        Running Backtest...
      `;

      try {
        // Simulate backtest (in production, this would call the API)
        const result = await this.simulateBacktest(strategy);

        BacktestState.currentResult = result;
        BacktestState.results.unshift(result);

        // Show results
        this.renderBacktestResults(result);

        TG.haptic.notify('success');
      } catch (err) {
        console.error('[Backtesting] Error:', err);
        TG.alert('Backtest failed: ' + err.message);
        TG.haptic.notify('error');

        runBtn.disabled = false;
        runBtn.textContent = 'Run Backtest';
      } finally {
        BacktestState.isRunning = false;
      }
    },

    /**
     * Simulate backtest result (demo implementation)
     */
    async simulateBacktest(strategy) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const config = BacktestState.config;
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);

      // Calculate days for simulation
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      // Generate simulated results based on strategy characteristics
      const baseRoi = strategy.roi_30d || 5;
      const riskMultiplier = strategy.risk_level === 'high' ? 1.5 :
                             strategy.risk_level === 'low' ? 0.6 : 1;

      // Scale ROI to period and add some variance
      const periodFactor = days / 30;
      const variance = (Math.random() - 0.5) * 0.3;
      const totalReturn = (baseRoi * periodFactor * riskMultiplier) * (1 + variance);

      const finalValue = config.initialCapital * (1 + totalReturn / 100);

      // Generate trade count based on timeframe and period
      const tradesPerDay = config.timeframe === '1m' ? 20 :
                           config.timeframe === '5m' ? 10 :
                           config.timeframe === '15m' ? 5 :
                           config.timeframe === '1h' ? 2 :
                           config.timeframe === '4h' ? 1 : 0.5;
      const totalTrades = Math.round(days * tradesPerDay);

      // Generate other metrics
      const winRate = (strategy.win_rate || 60) + (Math.random() - 0.5) * 10;
      const maxDrawdown = -(strategy.max_drawdown || 5) * riskMultiplier * (1 + Math.random() * 0.3);
      const sharpeRatio = (strategy.sharpe_ratio || 1.5) * (1 + (Math.random() - 0.5) * 0.4);
      const profitFactor = winRate > 50 ? 1 + (winRate - 50) / 30 : 0.8;

      // Generate equity curve
      const equityCurve = this.generateEquityCurve(config.initialCapital, finalValue, days);

      // Generate trade markers
      const tradeMarkers = this.generateTradeMarkers(equityCurve, totalTrades);

      // Determine risk grade
      const riskGrade = maxDrawdown > -5 && sharpeRatio > 1.5 ? 'A' :
                        maxDrawdown > -10 && sharpeRatio > 1 ? 'B' :
                        maxDrawdown > -15 && sharpeRatio > 0.5 ? 'C' :
                        maxDrawdown > -20 ? 'D' : 'F';

      return {
        backtestId: `bt_${Date.now()}`,
        strategyId: strategy.id,
        strategyName: strategy.name,
        asset: config.asset,
        period: this.formatPeriod(startDate, endDate),
        initialCapital: config.initialCapital,
        finalValue: finalValue,
        totalReturn: totalReturn,
        maxDrawdown: maxDrawdown,
        totalTrades: totalTrades,
        winRate: winRate,
        sharpeRatio: sharpeRatio,
        profitFactor: profitFactor,
        riskGrade: riskGrade,
        durationMs: 1500,
        equityCurve: equityCurve,
        tradeMarkers: tradeMarkers,
        timestamp: new Date(),
      };
    },

    /**
     * Generate simulated equity curve
     */
    generateEquityCurve(startValue, endValue, days) {
      const points = Math.min(days, 180); // Limit to 180 data points
      const curve = [];
      const trend = (endValue - startValue) / points;

      let value = startValue;
      const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

      for (let i = 0; i <= points; i++) {
        // Add some noise to make it realistic
        const noise = (Math.random() - 0.5) * (startValue * 0.02);
        value = value + trend + noise;
        value = Math.max(value, startValue * 0.7); // Floor at 70% of start

        curve.push({
          timestamp: new Date(startTime + (i * (days / points) * 24 * 60 * 60 * 1000)),
          value: value,
        });
      }

      // Ensure final value matches
      if (curve.length > 0) {
        curve[curve.length - 1].value = endValue;
      }

      return curve;
    },

    /**
     * Generate simulated trade markers
     */
    generateTradeMarkers(equityCurve, tradeCount) {
      const markers = [];
      const pointCount = equityCurve.length;

      for (let i = 0; i < Math.min(tradeCount, 50); i++) {
        const pointIndex = Math.floor(Math.random() * pointCount);
        const point = equityCurve[pointIndex];

        markers.push({
          timestamp: point.timestamp,
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          price: point.value / 100, // Simulated price
          amount: Math.random() * 100,
        });
      }

      return markers.sort((a, b) => a.timestamp - b.timestamp);
    },

    /**
     * Render backtest results
     */
    renderBacktestResults(result) {
      // Hide config, show results
      el('bt-config-section').classList.add('hidden');
      el('bt-result-section').classList.remove('hidden');

      // Summary metrics
      const roiClass = result.totalReturn >= 0 ? 'positive' : 'negative';
      const roiSign = result.totalReturn >= 0 ? '+' : '';

      el('bt-result-roi').textContent = `${roiSign}${result.totalReturn.toFixed(2)}%`;
      el('bt-result-roi').className = `result-value ${roiClass}`;

      el('bt-result-final-value').textContent = `$${result.finalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      el('bt-result-drawdown').textContent = `${result.maxDrawdown.toFixed(2)}%`;
      el('bt-result-trades').textContent = result.totalTrades;
      el('bt-result-winrate').textContent = `${result.winRate.toFixed(1)}%`;
      el('bt-result-sharpe').textContent = result.sharpeRatio.toFixed(2);
      el('bt-result-profit-factor').textContent = result.profitFactor.toFixed(2);

      // Risk grade with styling
      const gradeEl = el('bt-result-grade');
      gradeEl.textContent = result.riskGrade;
      gradeEl.className = `risk-grade grade-${result.riskGrade.toLowerCase()}`;

      // Period info
      el('bt-result-period').textContent = result.period;
      el('bt-result-asset').textContent = result.asset;

      // Render equity curve chart
      this.renderEquityCurveChart(result.equityCurve);
    },

    /**
     * Render simple equity curve chart using CSS
     */
    renderEquityCurveChart(equityCurve) {
      const container = el('bt-equity-chart');
      if (!container || equityCurve.length === 0) return;

      const values = equityCurve.map(p => p.value);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      const range = maxVal - minVal || 1;

      // Create SVG chart
      const width = container.clientWidth || 300;
      const height = 120;
      const padding = 10;

      const points = equityCurve.map((point, i) => {
        const x = padding + ((width - 2 * padding) * i / (equityCurve.length - 1));
        const y = height - padding - ((point.value - minVal) / range) * (height - 2 * padding);
        return `${x},${y}`;
      }).join(' ');

      const isPositive = values[values.length - 1] >= values[0];
      const lineColor = isPositive ? 'var(--positive)' : 'var(--negative)';

      container.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="equity-svg">
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style="stop-color:${lineColor};stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:${lineColor};stop-opacity:0" />
            </linearGradient>
          </defs>
          <polygon
            points="${padding},${height - padding} ${points} ${width - padding},${height - padding}"
            fill="url(#equityGradient)"
          />
          <polyline
            points="${points}"
            fill="none"
            stroke="${lineColor}"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <div class="chart-labels">
          <span class="chart-label-start">$${minVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span class="chart-label-end">$${maxVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      `;
    },

    /**
     * Run another backtest with same strategy
     */
    runAnotherBacktest() {
      el('bt-config-section').classList.remove('hidden');
      el('bt-result-section').classList.add('hidden');
      el('bt-run-btn').disabled = false;
      el('bt-run-btn').textContent = 'Run Backtest';
    },

    /**
     * Get recent backtest results
     */
    getRecentResults() {
      return BacktestState.results.slice(0, 10);
    },

    /**
     * Validate backtest configuration
     */
    validateConfig() {
      const errors = [];
      const config = BacktestState.config;

      if (!config.startDate) {
        errors.push('Start date is required');
      }

      if (!config.endDate) {
        errors.push('End date is required');
      }

      if (config.startDate && config.endDate) {
        const start = new Date(config.startDate);
        const end = new Date(config.endDate);

        if (start >= end) {
          errors.push('Start date must be before end date');
        }

        const days = (end - start) / (1000 * 60 * 60 * 24);
        if (days < 7) {
          errors.push('Backtest period must be at least 7 days');
        }

        if (days > 365) {
          errors.push('Backtest period cannot exceed 1 year');
        }
      }

      if (!config.initialCapital || config.initialCapital < 100) {
        errors.push('Initial capital must be at least $100');
      }

      if (config.initialCapital > 1000000) {
        errors.push('Initial capital cannot exceed $1,000,000');
      }

      return { valid: errors.length === 0, errors };
    },

    /**
     * Update configuration from inputs
     */
    updateConfig(field, value) {
      if (field === 'initialCapital') {
        BacktestState.config[field] = parseFloat(value) || 0;
      } else {
        BacktestState.config[field] = value;
      }
    },

    /**
     * Format date for input
     */
    formatDateForInput(date) {
      return date.toISOString().split('T')[0];
    },

    /**
     * Format period for display
     */
    formatPeriod(startDate, endDate) {
      const options = { month: 'short', year: 'numeric' };
      const start = startDate.toLocaleDateString('en-US', options);
      const end = endDate.toLocaleDateString('en-US', options);
      return `${start} - ${end}`;
    },

    /**
     * Format category for display
     */
    formatCategory(cat) {
      const labels = {
        momentum: 'Momentum',
        mean_reversion: 'Mean Reversion',
        arbitrage: 'Arbitrage',
        grid_trading: 'Grid Trading',
        yield_farming: 'Yield Farming',
        trend_following: 'Trend Following',
      };
      return labels[cat] || cat;
    },
  };

  /* --------------------------------------------------------
     Event Handlers Setup
     -------------------------------------------------------- */
  function setupEventHandlers() {
    // Close modal
    el('backtest-modal-overlay')?.addEventListener('click', () => {
      Backtesting.closeBacktestModal();
    });
    el('close-backtest-modal')?.addEventListener('click', () => {
      Backtesting.closeBacktestModal();
    });

    // Run backtest button
    el('bt-run-btn')?.addEventListener('click', () => {
      Backtesting.runBacktest();
    });

    // Run another backtest
    el('bt-run-another-btn')?.addEventListener('click', () => {
      Backtesting.runAnotherBacktest();
    });

    // Config inputs
    el('bt-asset-select')?.addEventListener('change', (e) => {
      Backtesting.updateConfig('asset', e.target.value);
    });
    el('bt-timeframe-select')?.addEventListener('change', (e) => {
      Backtesting.updateConfig('timeframe', e.target.value);
    });
    el('bt-start-date')?.addEventListener('change', (e) => {
      Backtesting.updateConfig('startDate', e.target.value);
    });
    el('bt-end-date')?.addEventListener('change', (e) => {
      Backtesting.updateConfig('endDate', e.target.value);
    });
    el('bt-capital')?.addEventListener('input', (e) => {
      Backtesting.updateConfig('initialCapital', e.target.value);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Backtesting.init();
      setupEventHandlers();
    });
  } else {
    Backtesting.init();
    setupEventHandlers();
  }

  window.Backtesting = Backtesting;
})();
