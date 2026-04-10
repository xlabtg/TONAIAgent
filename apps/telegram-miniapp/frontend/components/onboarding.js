/**
 * TON AI Agent - Onboarding Component
 *
 * Implements the Mini App onboarding screen and agent creation wizard.
 * Provides a smooth first-time user experience in under 2 minutes.
 *
 * @see Issue #199 - Telegram User Onboarding & First Agent Experience
 */
(function () {
  'use strict';

  const { State, Fmt, esc, el, TG } = window.App;

  // ============================================================================
  // Onboarding State
  // ============================================================================

  const OnboardingState = {
    step: 'welcome', // 'welcome' | 'name' | 'strategy' | 'confirm' | 'complete'
    agentName: 'My First AI Agent',
    selectedStrategy: null,
    isComplete: false,
  };

  // ============================================================================
  // Available Strategies
  // ============================================================================

  const STRATEGIES = [
    {
      id: 'momentum',
      name: 'Momentum',
      icon: '📈',
      description: 'Follows market trends and buys assets showing upward momentum',
      riskLevel: 'medium',
      riskColor: '#FF9F43',
      expectedBehavior: 'Buys when price rises, sells when momentum weakens',
    },
    {
      id: 'mean_reversion',
      name: 'Mean Reversion',
      icon: '📊',
      description: 'Buys when prices dip below average, sells when they rise above',
      riskLevel: 'low',
      riskColor: '#28C76F',
      expectedBehavior: 'Contrarian approach - buys dips, sells rallies',
    },
    {
      id: 'trend_following',
      name: 'Trend Following',
      icon: '🎯',
      description: 'Identifies and follows long-term market trends',
      riskLevel: 'high',
      riskColor: '#EA5455',
      expectedBehavior: 'Holds positions longer, follows major trend directions',
    },
  ];

  // ============================================================================
  // Onboarding Manager
  // ============================================================================

  const Onboarding = {
    isFirstTimeUser: true,

    init() {
      // Check if user has completed onboarding before
      const completed = localStorage.getItem('tonai_onboarding_complete');
      this.isFirstTimeUser = !completed;

      if (this.isFirstTimeUser) {
        this.showOnboarding();
      }
    },

    showOnboarding() {
      // Create onboarding overlay
      this.createOnboardingUI();
      this.goToStep('welcome');
    },

    createOnboardingUI() {
      // Remove existing onboarding if present
      const existing = el('onboarding-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'onboarding-overlay';
      overlay.className = 'onboarding-overlay';
      overlay.innerHTML = `
        <div class="onboarding-container">
          <div id="onboarding-content"></div>
        </div>
      `;

      document.body.appendChild(overlay);
    },

    goToStep(step) {
      OnboardingState.step = step;
      const content = el('onboarding-content');
      if (!content) return;

      TG.haptic.select();

      switch (step) {
        case 'welcome':
          content.innerHTML = this.renderWelcomeStep();
          break;
        case 'name':
          content.innerHTML = this.renderNameStep();
          this.setupNameInput();
          break;
        case 'strategy':
          content.innerHTML = this.renderStrategyStep();
          this.setupStrategySelection();
          break;
        case 'confirm':
          content.innerHTML = this.renderConfirmStep();
          this.setupConfirmButtons();
          break;
        case 'complete':
          content.innerHTML = this.renderCompleteStep();
          this.setupCompleteButton();
          break;
      }
    },

    // ============================================================================
    // Step Renderers
    // ============================================================================

    renderWelcomeStep() {
      return `
        <div class="onboarding-step onboarding-welcome">
          <div class="onboarding-icon">🤖</div>
          <h1 class="onboarding-title">Welcome to AI Trading Agents</h1>
          <p class="onboarding-subtitle">Create your first agent in seconds.</p>
          <p class="onboarding-description">
            Your personal AI will monitor markets 24/7 and execute strategies automatically.
          </p>
          <button class="onboarding-btn primary" onclick="Onboarding.goToStep('name')">
            Create Agent
          </button>
        </div>
      `;
    },

    renderNameStep() {
      return `
        <div class="onboarding-step onboarding-name">
          <div class="onboarding-step-indicator">Step 1 of 3</div>
          <h2 class="onboarding-title">Name Your Agent</h2>
          <p class="onboarding-subtitle">Give your AI trading agent a name</p>
          <div class="onboarding-input-group">
            <input
              type="text"
              id="agent-name-input"
              class="onboarding-input"
              value="${esc(OnboardingState.agentName)}"
              placeholder="My First AI Agent"
              maxlength="50"
            />
            <span class="input-hint">You can change this later</span>
          </div>
          <div class="onboarding-nav">
            <button class="onboarding-btn secondary" onclick="Onboarding.goToStep('welcome')">
              Back
            </button>
            <button class="onboarding-btn primary" id="name-next-btn">
              Next
            </button>
          </div>
        </div>
      `;
    },

    renderStrategyStep() {
      const strategiesHTML = STRATEGIES.map((s) => `
        <div class="strategy-card ${OnboardingState.selectedStrategy === s.id ? 'selected' : ''}"
             data-strategy="${s.id}">
          <div class="strategy-header">
            <span class="strategy-icon">${s.icon}</span>
            <span class="strategy-name">${esc(s.name)}</span>
            <span class="strategy-risk" style="background: ${s.riskColor}20; color: ${s.riskColor}">
              ${s.riskLevel.charAt(0).toUpperCase() + s.riskLevel.slice(1)} Risk
            </span>
          </div>
          <p class="strategy-description">${esc(s.description)}</p>
          <p class="strategy-behavior">${esc(s.expectedBehavior)}</p>
        </div>
      `).join('');

      return `
        <div class="onboarding-step onboarding-strategy">
          <div class="onboarding-step-indicator">Step 2 of 3</div>
          <h2 class="onboarding-title">Select Strategy</h2>
          <p class="onboarding-subtitle">Choose how your AI agent will trade</p>
          <div class="strategy-list">
            ${strategiesHTML}
          </div>
          <div class="onboarding-nav">
            <button class="onboarding-btn secondary" onclick="Onboarding.goToStep('name')">
              Back
            </button>
            <button class="onboarding-btn primary" id="strategy-next-btn" ${!OnboardingState.selectedStrategy ? 'disabled' : ''}>
              Next
            </button>
          </div>
        </div>
      `;
    },

    renderConfirmStep() {
      const strategy = STRATEGIES.find((s) => s.id === OnboardingState.selectedStrategy);

      return `
        <div class="onboarding-step onboarding-confirm">
          <div class="onboarding-step-indicator">Step 3 of 3</div>
          <h2 class="onboarding-title">Ready to Start</h2>
          <p class="onboarding-subtitle">Review your agent configuration</p>
          <div class="confirm-card">
            <div class="confirm-row">
              <span class="confirm-label">Agent Name</span>
              <span class="confirm-value">${esc(OnboardingState.agentName)}</span>
            </div>
            <div class="confirm-row">
              <span class="confirm-label">Strategy</span>
              <span class="confirm-value">${strategy ? strategy.icon + ' ' + esc(strategy.name) : '-'}</span>
            </div>
            <div class="confirm-row">
              <span class="confirm-label">Risk Level</span>
              <span class="confirm-value risk-${strategy?.riskLevel || 'medium'}">${strategy ? strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1) : '-'}</span>
            </div>
            <div class="confirm-row">
              <span class="confirm-label">Mode</span>
              <span class="confirm-value demo-mode">Demo Mode</span>
            </div>
          </div>
          <div class="risk-warning-box">
            <div class="risk-warning-title">&#9888;&#65039; Risk Disclosure</div>
            <ul class="risk-warning-list">
              <li>AI agents can and do lose money</li>
              <li>Past simulation results do not guarantee live performance</li>
              <li>Only invest what you can afford to lose entirely</li>
            </ul>
          </div>
          <p class="demo-notice">
            Your agent will start in <strong>simulation mode</strong> &mdash; no real funds required.
            You can switch to live trading later after reviewing the
            <a href="#" onclick="return false;" class="demo-notice-link">security guide</a>.
          </p>
          <div class="onboarding-nav">
            <button class="onboarding-btn secondary" onclick="Onboarding.goToStep('strategy')">
              Back
            </button>
            <button class="onboarding-btn primary" id="start-agent-btn">
              Start Agent in Simulation
            </button>
          </div>
        </div>
      `;
    },

    renderCompleteStep() {
      const strategy = STRATEGIES.find((s) => s.id === OnboardingState.selectedStrategy);

      return `
        <div class="onboarding-step onboarding-complete">
          <div class="success-animation">
            <div class="success-icon">🚀</div>
          </div>
          <h2 class="onboarding-title">Agent Running!</h2>
          <p class="onboarding-subtitle">"${esc(OnboardingState.agentName)}" is now active</p>
          <div class="agent-status-card">
            <div class="status-row">
              <span class="status-indicator active"></span>
              <span>Monitoring market</span>
            </div>
            <div class="status-row">
              <span class="status-indicator active"></span>
              <span>Executing ${strategy ? esc(strategy.name) : ''} strategy</span>
            </div>
            <div class="status-row">
              <span class="status-indicator pending"></span>
              <span>Waiting for trading signals</span>
            </div>
          </div>
          <p class="notification-hint">
            You'll receive Telegram notifications when trades are executed.
          </p>
          <button class="onboarding-btn primary full-width" id="view-dashboard-btn">
            View Dashboard
          </button>
        </div>
      `;
    },

    // ============================================================================
    // Event Setup
    // ============================================================================

    setupNameInput() {
      const input = el('agent-name-input');
      const nextBtn = el('name-next-btn');

      if (input) {
        input.focus();
        input.addEventListener('input', (e) => {
          OnboardingState.agentName = e.target.value.trim() || 'My First AI Agent';
        });
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && OnboardingState.agentName) {
            this.goToStep('strategy');
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (OnboardingState.agentName) {
            this.goToStep('strategy');
          }
        });
      }
    },

    setupStrategySelection() {
      const cards = document.querySelectorAll('.strategy-card');
      const nextBtn = el('strategy-next-btn');

      cards.forEach((card) => {
        card.addEventListener('click', () => {
          cards.forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          OnboardingState.selectedStrategy = card.dataset.strategy;
          TG.haptic.impact('light');

          if (nextBtn) nextBtn.disabled = false;
        });
      });

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (OnboardingState.selectedStrategy) {
            this.goToStep('confirm');
          }
        });
      }
    },

    setupConfirmButtons() {
      const startBtn = el('start-agent-btn');

      if (startBtn) {
        startBtn.addEventListener('click', () => {
          TG.haptic.notify('success');
          this.createAgent();
        });
      }
    },

    setupCompleteButton() {
      const viewBtn = el('view-dashboard-btn');

      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          this.completeOnboarding();
        });
      }
    },

    // ============================================================================
    // Agent Creation
    // ============================================================================

    async createAgent() {
      const startBtn = el('start-agent-btn');
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="loading-spinner"></span> Starting...';
      }

      // Simulate agent creation (in production, this would call the API)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      OnboardingState.isComplete = true;
      this.goToStep('complete');
    },

    completeOnboarding() {
      // Mark onboarding as complete
      localStorage.setItem('tonai_onboarding_complete', 'true');
      localStorage.setItem('tonai_demo_mode', 'true');
      localStorage.setItem('tonai_agent_name', OnboardingState.agentName);
      localStorage.setItem('tonai_agent_strategy', OnboardingState.selectedStrategy);

      // Remove onboarding overlay
      const overlay = el('onboarding-overlay');
      if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 300);
      }

      // Enable demo mode in the app
      window.DemoMode.enable();

      // Refresh portfolio with demo data
      if (window.Portfolio) {
        window.Portfolio.refresh();
      }

      this.isFirstTimeUser = false;
    },

    // ============================================================================
    // Reset (for testing)
    // ============================================================================

    reset() {
      localStorage.removeItem('tonai_onboarding_complete');
      localStorage.removeItem('tonai_demo_mode');
      localStorage.removeItem('tonai_agent_name');
      localStorage.removeItem('tonai_agent_strategy');
      OnboardingState.step = 'welcome';
      OnboardingState.agentName = 'My First AI Agent';
      OnboardingState.selectedStrategy = null;
      OnboardingState.isComplete = false;
      this.isFirstTimeUser = true;
    },
  };

  // ============================================================================
  // Demo Mode Manager
  // ============================================================================

  const DemoMode = {
    enabled: false,

    enable() {
      this.enabled = true;
      localStorage.setItem('tonai_demo_mode', 'true');
    },

    disable() {
      this.enabled = false;
      localStorage.removeItem('tonai_demo_mode');
    },

    isEnabled() {
      return localStorage.getItem('tonai_demo_mode') === 'true';
    },

    getAgentName() {
      return localStorage.getItem('tonai_agent_name') || 'My First AI Agent';
    },

    getAgentStrategy() {
      return localStorage.getItem('tonai_agent_strategy') || 'momentum';
    },

    getStrategyDetails() {
      const strategyId = this.getAgentStrategy();
      return STRATEGIES.find((s) => s.id === strategyId) || STRATEGIES[0];
    },

    // Generate demo portfolio data
    getDemoPortfolio() {
      const strategy = this.getStrategyDetails();
      const baseValue = 10000;
      const pnl = parseFloat((Math.random() * 800 + 200).toFixed(2));
      const pnlPercent = (pnl / baseValue) * 100;

      return {
        agent_id: 'demo_agent_001',
        portfolio_value: baseValue + pnl,
        total_cost: baseValue,
        profit: pnl,
        roi: pnlPercent,
        unrealized_pnl: pnl * 0.4,
        realized_pnl: pnl * 0.6,
        day_change: parseFloat((Math.random() * 50 + 10).toFixed(2)),
        day_change_percent: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
        total_fees: parseFloat((Math.random() * 10 + 2).toFixed(2)),
        strategy_count: 1,
        open_position_count: Math.floor(Math.random() * 3) + 1,
        capital_utilization: parseFloat((Math.random() * 30 + 60).toFixed(1)),
        last_updated: new Date().toISOString(),
      };
    },

    // Generate demo agents list
    getDemoAgents() {
      const agentName = this.getAgentName();
      const strategy = this.getStrategyDetails();

      return [
        {
          id: 'demo_agent_001',
          name: agentName,
          strategy: strategy.name,
          status: 'active',
          value: 10000 + parseFloat((Math.random() * 800 + 200).toFixed(2)),
          profit: parseFloat((Math.random() * 800 + 200).toFixed(2)),
          roi: parseFloat((Math.random() * 10 + 2).toFixed(1)),
          win_rate: parseFloat((Math.random() * 20 + 60).toFixed(1)),
          total_trades: Math.floor(Math.random() * 20) + 5,
        },
      ];
    },
  };

  // ============================================================================
  // Export
  // ============================================================================

  window.Onboarding = Onboarding;
  window.DemoMode = DemoMode;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (DemoMode.isEnabled()) {
        DemoMode.enable();
      }
    });
  } else {
    if (DemoMode.isEnabled()) {
      DemoMode.enable();
    }
  }
})();
