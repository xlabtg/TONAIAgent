/**
 * TON AI Agent - Telegram Mini App
 * Main Application Logic
 */

(function() {
  'use strict';

  // App State
  const state = {
    user: null,
    wallet: null,
    agents: [],
    strategies: [],
    selectedGoal: null,
    selectedStrategy: null,
    currentSection: 'main'
  };

  // Strategy Marketplace Strategies (Issue #216)
  // These map to the marketplace strategies from src/strategy-marketplace
  const MARKETPLACE_STRATEGIES = [
    {
      id: 'momentum-trader',
      name: 'Momentum Trader',
      category: 'trading',
      description: 'Captures short-term price momentum using moving average crossovers and volume confirmation. Ideal for trending markets.',
      minInvestment: 10,
      riskLevel: 'medium',
      expectedApy: { min: 20, max: 35 },
      creatorName: 'TONAIAgent',
      roi30d: 8.2,
      winRate: 68.5,
      totalTrades: 124,
      maxDrawdown: -5.8,
      sharpeRatio: 1.82,
      rating: 8.7,
      activeUsers: 342,
      verified: true,
      supportedAssets: ['TON', 'BTC', 'ETH'],
      tags: ['momentum', 'trend', 'beginner-friendly']
    },
    {
      id: 'mean-reversion-pro',
      name: 'Mean Reversion Pro',
      category: 'yield',
      description: 'Exploits price mean reversion patterns using statistical analysis and Bollinger Bands. Best for range-bound markets.',
      minInvestment: 50,
      riskLevel: 'low',
      expectedApy: { min: 12, max: 25 },
      creatorName: 'QuantLab',
      roi30d: 5.4,
      winRate: 72.1,
      totalTrades: 89,
      maxDrawdown: -3.2,
      sharpeRatio: 2.14,
      rating: 9.1,
      activeUsers: 518,
      verified: true,
      supportedAssets: ['TON', 'BTC', 'ETH'],
      tags: ['mean-reversion', 'low-risk', 'statistical']
    },
    {
      id: 'dex-arbitrage-hunter',
      name: 'DEX Arbitrage Hunter',
      category: 'arbitrage',
      description: 'Identifies and executes arbitrage opportunities across TON DEX protocols (STON.fi, DeDust). Requires higher capital.',
      minInvestment: 100,
      riskLevel: 'high',
      expectedApy: { min: 35, max: 80 },
      creatorName: 'ArbitrageKing',
      roi30d: 12.7,
      winRate: 61.3,
      totalTrades: 456,
      maxDrawdown: -8.5,
      sharpeRatio: 1.45,
      rating: 7.8,
      activeUsers: 156,
      verified: true,
      supportedAssets: ['TON', 'USDT', 'USDC'],
      tags: ['arbitrage', 'dex', 'advanced']
    },
    {
      id: 'grid-trading-bot',
      name: 'Grid Trading Bot',
      category: 'trading',
      description: 'Automated grid trading strategy for ranging markets. Places buy and sell orders at predefined price levels.',
      minInvestment: 25,
      riskLevel: 'medium',
      expectedApy: { min: 18, max: 40 },
      creatorName: 'GridMaster',
      roi30d: 6.8,
      winRate: 65.2,
      totalTrades: 312,
      maxDrawdown: -4.7,
      sharpeRatio: 1.68,
      rating: 8.2,
      activeUsers: 289,
      verified: true,
      supportedAssets: ['TON', 'BTC', 'ETH', 'SOL'],
      tags: ['grid', 'automated', 'passive']
    },
    {
      id: 'yield-optimizer',
      name: 'Yield Optimizer',
      category: 'yield',
      description: 'Maximizes DeFi yields by automatically rebalancing across TON yield protocols. Focuses on stable returns.',
      minInvestment: 100,
      riskLevel: 'low',
      expectedApy: { min: 10, max: 25 },
      creatorName: 'YieldHunter',
      roi30d: 4.2,
      winRate: 85.6,
      totalTrades: 67,
      maxDrawdown: -2.1,
      sharpeRatio: 2.45,
      rating: 9.4,
      activeUsers: 723,
      verified: true,
      supportedAssets: ['TON', 'USDT', 'USDC'],
      tags: ['yield', 'defi', 'passive', 'stable']
    },
    {
      id: 'trend-following-alpha',
      name: 'Trend Following Alpha',
      category: 'trading',
      description: 'Multi-timeframe trend following strategy with dynamic position sizing. Adapts to market conditions.',
      minInvestment: 20,
      riskLevel: 'medium',
      expectedApy: { min: 25, max: 50 },
      creatorName: 'AlphaTrader',
      roi30d: 9.5,
      winRate: 58.9,
      totalTrades: 78,
      maxDrawdown: -7.2,
      sharpeRatio: 1.52,
      rating: 7.2,
      activeUsers: 98,
      verified: false,
      supportedAssets: ['TON', 'BTC', 'ETH'],
      tags: ['trend', 'adaptive', 'intermediate']
    },
    {
      id: 'dca-basic',
      name: 'DCA Basic',
      category: 'dca',
      description: 'Dollar-cost averaging into selected assets. Perfect for long-term accumulation with minimal risk.',
      minInvestment: 10,
      riskLevel: 'low',
      expectedApy: { min: 5, max: 15 },
      creatorName: 'TONAIAgent',
      roi30d: 3.5,
      winRate: 90.0,
      totalTrades: 52,
      maxDrawdown: -1.5,
      sharpeRatio: 1.95,
      rating: 8.9,
      activeUsers: 845,
      verified: true,
      supportedAssets: ['TON', 'BTC', 'ETH'],
      tags: ['dca', 'beginner', 'passive']
    },
    {
      id: 'liquidity-manager',
      name: 'Liquidity Manager',
      category: 'liquidity',
      description: 'Manage liquidity positions across DEXes. Automatically rebalances for optimal fee collection.',
      minInvestment: 100,
      riskLevel: 'medium',
      expectedApy: { min: 20, max: 50 },
      creatorName: 'TONAIAgent',
      roi30d: 7.5,
      winRate: 70.0,
      totalTrades: 45,
      maxDrawdown: -6.0,
      sharpeRatio: 1.75,
      rating: 8.0,
      activeUsers: 234,
      verified: true,
      supportedAssets: ['TON', 'USDT'],
      tags: ['liquidity', 'defi', 'lp']
    }
  ];

  // Sample ranking data
  const SAMPLE_RANKINGS = [
    { rank: 1, name: 'AlphaBot', score: 98.5, details: 'APY: 45.2% | Win Rate: 78%' },
    { rank: 2, name: 'YieldMaster', score: 95.3, details: 'APY: 38.7% | Win Rate: 82%' },
    { rank: 3, name: 'DCA Pro', score: 92.1, details: 'APY: 22.5% | Win Rate: 91%' },
    { rank: 4, name: 'LiquidityKing', score: 89.7, details: 'APY: 35.1% | Win Rate: 75%' },
    { rank: 5, name: 'ArbitrageX', score: 87.2, details: 'APY: 52.3% | Win Rate: 68%' }
  ];

  // DOM Elements
  const elements = {};

  /**
   * Initialize the application
   */
  function init() {
    // Cache DOM elements
    cacheElements();

    // Set up event listeners
    setupEventListeners();

    // Wait for Telegram WebApp to be ready
    window.addEventListener('tg:ready', onTelegramReady);

    // Initialize strategies from marketplace
    state.strategies = MARKETPLACE_STRATEGIES;

    // Initialize TON Connect wallet module
    initWallet();
  }

  /**
   * Cache DOM elements for performance
   */
  function cacheElements() {
    elements.loading = document.getElementById('loading');
    elements.mainContent = document.getElementById('main-content');
    elements.userAvatar = document.getElementById('user-avatar');
    elements.avatarInitials = document.getElementById('avatar-initials');
    elements.userName = document.getElementById('user-name');
    elements.userBalance = document.getElementById('user-balance');
    elements.walletConnectBtn = document.getElementById('wallet-connect-btn');
    elements.walletModal = document.getElementById('wallet-modal');
    elements.walletSelector = document.getElementById('wallet-selector');
    elements.walletList = document.getElementById('wallet-list');
    elements.walletConnectedView = document.getElementById('wallet-connected-view');
    elements.walletConnectingView = document.getElementById('wallet-connecting-view');
    elements.connectedWalletName = document.getElementById('connected-wallet-name');
    elements.connectedWalletAddress = document.getElementById('connected-wallet-address');
    elements.connectingWalletName = document.getElementById('connecting-wallet-name');
    elements.portfolioAmount = document.getElementById('portfolio-amount');
    elements.portfolioChange = document.getElementById('portfolio-change');
    elements.activeAgents = document.getElementById('active-agents');
    elements.totalYield = document.getElementById('total-yield');
    elements.agentsSection = document.getElementById('agents-section');
    elements.emptyState = document.getElementById('empty-state');
    elements.agentsList = document.getElementById('agents-list');
    elements.agentsCount = document.getElementById('agents-count');
    elements.createAgentModal = document.getElementById('create-agent-modal');
    elements.marketplaceSection = document.getElementById('marketplace-section');
    elements.marketplaceList = document.getElementById('marketplace-list');
    elements.rankingsSection = document.getElementById('rankings-section');
    elements.rankingsList = document.getElementById('rankings-list');

    // Wizard elements
    elements.step1 = document.getElementById('step-1');
    elements.step2 = document.getElementById('step-2');
    elements.step3 = document.getElementById('step-3');
    elements.strategyOptions = document.getElementById('strategy-options');
    elements.strategySummary = document.getElementById('strategy-summary');
    elements.fundAmount = document.getElementById('fund-amount');
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Wallet button
    elements.walletConnectBtn?.addEventListener('click', openWalletModal);

    // Wallet modal controls
    document.getElementById('close-wallet-modal-btn')?.addEventListener('click', closeWalletModal);
    document.getElementById('copy-address-btn')?.addEventListener('click', copyWalletAddress);
    document.getElementById('view-explorer-btn')?.addEventListener('click', viewOnExplorer);
    document.getElementById('disconnect-wallet-btn')?.addEventListener('click', disconnectWallet);

    // Quick action buttons
    document.getElementById('create-agent-btn')?.addEventListener('click', openCreateAgentModal);
    document.getElementById('empty-create-btn')?.addEventListener('click', openCreateAgentModal);
    document.getElementById('marketplace-btn')?.addEventListener('click', showMarketplace);
    document.getElementById('rankings-btn')?.addEventListener('click', showRankings);
    document.getElementById('settings-btn')?.addEventListener('click', openSettings);

    // Modal controls
    document.getElementById('close-modal-btn')?.addEventListener('click', closeCreateAgentModal);

    // Goal selection
    document.querySelectorAll('.goal-option').forEach(btn => {
      btn.addEventListener('click', () => selectGoal(btn.dataset.goal));
    });

    // Wizard navigation
    document.getElementById('back-to-step-1')?.addEventListener('click', () => showStep(1));
    document.getElementById('back-to-step-2')?.addEventListener('click', () => showStep(2));
    document.getElementById('deploy-agent-btn')?.addEventListener('click', deployAgent);

    // Section back buttons
    document.getElementById('marketplace-back')?.addEventListener('click', showMainSection);
    document.getElementById('rankings-back')?.addEventListener('click', showMainSection);

    // Filters
    document.getElementById('category-filter')?.addEventListener('change', filterMarketplace);
    document.getElementById('risk-filter')?.addEventListener('change', filterMarketplace);

    // Ranking tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchRankingTab(btn.dataset.tab));
    });

    // Telegram back button
    window.addEventListener('tg:backButtonClicked', handleBackButton);
  }

  /**
   * Handle Telegram WebApp ready event
   */
  function onTelegramReady(event) {
    const { user } = event.detail;
    state.user = user;

    // Update UI with user data
    updateUserInfo();

    // Hide loading, show main content
    elements.loading.classList.add('hidden');
    elements.mainContent.classList.remove('hidden');

    // Load user data from API (if available)
    loadUserData();
  }

  /**
   * Update user info in UI
   */
  function updateUserInfo() {
    if (!state.user) return;

    const firstName = state.user.first_name || 'User';
    const lastName = state.user.last_name || '';

    // Set name
    elements.userName.textContent = firstName;

    // Set avatar initials
    const initials = (firstName[0] + (lastName[0] || '')).toUpperCase();
    elements.avatarInitials.textContent = initials;
  }

  /**
   * Load user data from API
   */
  async function loadUserData() {
    try {
      // In production, this would call the backend API
      // For demo, we use mock data
      await simulateApiCall();

      // Update portfolio display
      updatePortfolio();
      updateAgentsList();
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  /**
   * Simulate API call delay
   */
  function simulateApiCall(delay = 500) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Update portfolio display
   */
  function updatePortfolio() {
    const totalValue = state.agents.reduce((sum, agent) => sum + agent.value, 0);
    const totalPnl = state.agents.reduce((sum, agent) => sum + agent.pnl, 0);
    const pnlPercentage = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;

    elements.portfolioAmount.textContent = formatCurrency(totalValue);
    elements.portfolioChange.textContent = `${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%`;
    elements.portfolioChange.className = `portfolio-change ${pnlPercentage >= 0 ? 'positive' : 'negative'}`;

    const activeCount = state.agents.filter(a => a.status === 'active').length;
    elements.activeAgents.textContent = activeCount;

    const avgYield = state.agents.length > 0
      ? state.agents.reduce((sum, a) => sum + a.apy, 0) / state.agents.length
      : 0;
    elements.totalYield.textContent = `${avgYield.toFixed(2)}%`;
  }

  /**
   * Update agents list
   */
  function updateAgentsList() {
    elements.agentsCount.textContent = state.agents.length;

    if (state.agents.length === 0) {
      elements.emptyState.classList.remove('hidden');
      elements.agentsList.classList.add('hidden');
      return;
    }

    elements.emptyState.classList.add('hidden');
    elements.agentsList.classList.remove('hidden');

    elements.agentsList.innerHTML = state.agents.map(agent => `
      <div class="agent-card" data-agent-id="${agent.id}">
        <div class="agent-card-header">
          <span class="agent-name">${escapeHtml(agent.name)}</span>
          <span class="agent-status ${agent.status}">${agent.status}</span>
        </div>
        <div class="agent-strategy">${escapeHtml(agent.strategyName)}</div>
        <div class="agent-stats">
          <div class="agent-stat">
            <span class="agent-stat-label">Value</span>
            <span class="agent-stat-value">$${formatCurrency(agent.value)}</span>
          </div>
          <div class="agent-stat">
            <span class="agent-stat-label">PnL</span>
            <span class="agent-stat-value ${agent.pnl >= 0 ? 'positive' : 'negative'}">
              ${agent.pnl >= 0 ? '+' : ''}$${formatCurrency(Math.abs(agent.pnl))}
            </span>
          </div>
          <div class="agent-stat">
            <span class="agent-stat-label">APY</span>
            <span class="agent-stat-value positive">${agent.apy.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Open create agent modal
   */
  function openCreateAgentModal() {
    TelegramMiniApp.haptic.impactOccurred('light');
    elements.createAgentModal.classList.remove('hidden');
    showStep(1);
    TelegramMiniApp.showBackButton(closeCreateAgentModal);
  }

  /**
   * Close create agent modal
   */
  function closeCreateAgentModal() {
    elements.createAgentModal.classList.add('hidden');
    state.selectedGoal = null;
    state.selectedStrategy = null;
    TelegramMiniApp.hideBackButton();
  }

  /**
   * Select goal in wizard
   */
  function selectGoal(goal) {
    TelegramMiniApp.haptic.selectionChanged();
    state.selectedGoal = goal;

    // Update UI
    document.querySelectorAll('.goal-option').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.goal === goal);
    });

    // Filter strategies by goal
    const filteredStrategies = filterStrategiesByGoal(goal);
    renderStrategyOptions(filteredStrategies);

    // Move to step 2
    showStep(2);
  }

  /**
   * Filter strategies by goal
   */
  function filterStrategiesByGoal(goal) {
    const goalToCategory = {
      'passive-income': ['yield', 'dca'],
      'trading': ['trading', 'arbitrage'],
      'dca': ['dca'],
      'liquidity': ['liquidity']
    };

    const categories = goalToCategory[goal] || [];
    return state.strategies.filter(s => categories.includes(s.category));
  }

  /**
   * Render strategy options
   */
  function renderStrategyOptions(strategies) {
    elements.strategyOptions.innerHTML = strategies.map(strategy => `
      <button class="strategy-option" data-strategy-id="${strategy.id}">
        <div class="strategy-info">
          <span class="strategy-name">${escapeHtml(strategy.name)}</span>
          <span class="strategy-apy">APY: ${strategy.expectedApy.min}-${strategy.expectedApy.max}%</span>
        </div>
        <span class="strategy-risk ${strategy.riskLevel}">${strategy.riskLevel}</span>
      </button>
    `).join('');

    // Add click handlers
    elements.strategyOptions.querySelectorAll('.strategy-option').forEach(btn => {
      btn.addEventListener('click', () => selectStrategy(btn.dataset.strategyId));
    });
  }

  /**
   * Select strategy
   */
  function selectStrategy(strategyId) {
    TelegramMiniApp.haptic.selectionChanged();
    state.selectedStrategy = state.strategies.find(s => s.id === strategyId);

    // Update UI
    elements.strategyOptions.querySelectorAll('.strategy-option').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.strategyId === strategyId);
    });

    // Update strategy summary
    if (state.selectedStrategy) {
      elements.strategySummary.innerHTML = `
        <div><strong>${escapeHtml(state.selectedStrategy.name)}</strong></div>
        <div>${escapeHtml(state.selectedStrategy.description)}</div>
        <div>Expected APY: ${state.selectedStrategy.expectedApy.min}-${state.selectedStrategy.expectedApy.max}%</div>
        <div>Min Investment: ${state.selectedStrategy.minInvestment} TON</div>
      `;
      elements.fundAmount.min = state.selectedStrategy.minInvestment;
      elements.fundAmount.value = Math.max(state.selectedStrategy.minInvestment, 10);
    }

    // Move to step 3
    showStep(3);
  }

  /**
   * Show wizard step
   */
  function showStep(step) {
    elements.step1.classList.toggle('hidden', step !== 1);
    elements.step2.classList.toggle('hidden', step !== 2);
    elements.step3.classList.toggle('hidden', step !== 3);
  }

  /**
   * Deploy agent
   */
  async function deployAgent() {
    if (!state.selectedStrategy) {
      TelegramMiniApp.showAlert('Please select a strategy');
      return;
    }

    const amount = parseFloat(elements.fundAmount.value);
    if (isNaN(amount) || amount < state.selectedStrategy.minInvestment) {
      TelegramMiniApp.showAlert(`Minimum investment is ${state.selectedStrategy.minInvestment} TON`);
      return;
    }

    TelegramMiniApp.haptic.notificationOccurred('success');

    // Show loading state
    const deployBtn = document.getElementById('deploy-agent-btn');
    const originalText = deployBtn.textContent;
    deployBtn.textContent = 'Deploying...';
    deployBtn.disabled = true;

    try {
      // Simulate API call
      await simulateApiCall(1500);

      // Create new agent
      const newAgent = {
        id: `agent-${Date.now()}`,
        name: `Agent ${state.agents.length + 1}`,
        strategyId: state.selectedStrategy.id,
        strategyName: state.selectedStrategy.name,
        status: 'active',
        value: amount * 2.5, // Mock USD value
        pnl: 0,
        apy: state.selectedStrategy.expectedApy.min
      };

      state.agents.push(newAgent);

      // Update UI
      closeCreateAgentModal();
      updatePortfolio();
      updateAgentsList();

      TelegramMiniApp.showAlert('Agent deployed successfully!');
    } catch (error) {
      TelegramMiniApp.showAlert('Failed to deploy agent. Please try again.');
    } finally {
      deployBtn.textContent = originalText;
      deployBtn.disabled = false;
    }
  }

  /**
   * Show marketplace section
   */
  function showMarketplace() {
    TelegramMiniApp.haptic.impactOccurred('light');
    hideAllSections();
    elements.marketplaceSection.classList.remove('hidden');
    state.currentSection = 'marketplace';
    TelegramMiniApp.showBackButton(showMainSection);
    renderMarketplace();
  }

  /**
   * Render marketplace strategies (Issue #216: Strategy Marketplace UI)
   */
  function renderMarketplace() {
    const categoryFilter = document.getElementById('category-filter').value;
    const riskFilter = document.getElementById('risk-filter').value;

    let filtered = [...state.strategies];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter(s => s.riskLevel === riskFilter);
    }

    // Sort by rating (popularity) by default
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    elements.marketplaceList.innerHTML = filtered.map(strategy => {
      const riskEmoji = getRiskEmoji(strategy.riskLevel);
      const starRating = getStarRating(strategy.rating || 0);
      const verifiedBadge = strategy.verified ? '<span class="verified-badge" title="Verified Strategy">✓</span>' : '';

      return `
        <div class="marketplace-card" onclick="showStrategyDetails('${strategy.id}')">
          <div class="marketplace-card-header">
            <div class="marketplace-card-info">
              <span class="marketplace-card-name">${escapeHtml(strategy.name)} ${verifiedBadge}</span>
              <span class="marketplace-card-creator">by ${escapeHtml(strategy.creatorName)}</span>
            </div>
            <span class="strategy-risk ${strategy.riskLevel}">${riskEmoji} ${strategy.riskLevel}</span>
          </div>
          <p class="marketplace-card-desc">${escapeHtml(strategy.description)}</p>
          <div class="marketplace-card-metrics">
            <div class="metric">
              <span class="metric-label">30d ROI</span>
              <span class="metric-value ${(strategy.roi30d || 0) >= 0 ? 'positive' : 'negative'}">
                ${(strategy.roi30d || 0) >= 0 ? '+' : ''}${(strategy.roi30d || 0).toFixed(1)}%
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">Win Rate</span>
              <span class="metric-value">${(strategy.winRate || 0).toFixed(0)}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Trades</span>
              <span class="metric-value">${strategy.totalTrades || 0}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Users</span>
              <span class="metric-value">${formatCompactNumber(strategy.activeUsers || 0)}</span>
            </div>
          </div>
          <div class="marketplace-card-footer">
            <div class="strategy-rating">
              <span class="stars">${starRating}</span>
              <span class="rating-value">${(strategy.rating || 0).toFixed(1)}/10</span>
            </div>
            <span class="min-capital">${strategy.minInvestment} TON min</span>
          </div>
          <div class="marketplace-card-actions">
            <button class="btn secondary" onclick="event.stopPropagation(); showStrategyDetails('${strategy.id}')">
              Details
            </button>
            <button class="btn primary" onclick="event.stopPropagation(); copyStrategy('${strategy.id}')">
              Deploy
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Get risk level emoji
   */
  function getRiskEmoji(level) {
    const emojis = { low: '🟢', medium: '🟡', high: '🔴' };
    return emojis[level] || '⚪';
  }

  /**
   * Get star rating display
   */
  function getStarRating(rating) {
    const normalizedRating = rating / 2; // Convert 0-10 to 0-5
    const fullStars = Math.floor(normalizedRating);
    const halfStar = normalizedRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
  }

  /**
   * Format number compactly (e.g., 1.2K, 5.3M)
   */
  function formatCompactNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  /**
   * Show strategy details modal (Issue #216)
   */
  window.showStrategyDetails = function(strategyId) {
    const strategy = state.strategies.find(s => s.id === strategyId);
    if (!strategy) return;

    TelegramMiniApp.haptic.impactOccurred('light');

    const riskEmoji = getRiskEmoji(strategy.riskLevel);
    const starRating = getStarRating(strategy.rating || 0);
    const verifiedText = strategy.verified ? '✓ Verified' : 'Unverified';

    // Create modal content
    const detailsHtml = `
      <div class="strategy-details-modal">
        <div class="strategy-details-header">
          <h2>${escapeHtml(strategy.name)}</h2>
          <span class="verified-status ${strategy.verified ? 'verified' : ''}">${verifiedText}</span>
        </div>
        <p class="strategy-details-author">by ${escapeHtml(strategy.creatorName)}</p>
        <p class="strategy-details-desc">${escapeHtml(strategy.description)}</p>

        <div class="strategy-details-section">
          <h3>Performance Metrics</h3>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="label">30-Day ROI</span>
              <span class="value ${(strategy.roi30d || 0) >= 0 ? 'positive' : 'negative'}">
                ${(strategy.roi30d || 0) >= 0 ? '+' : ''}${(strategy.roi30d || 0).toFixed(1)}%
              </span>
            </div>
            <div class="metric-item">
              <span class="label">Win Rate</span>
              <span class="value">${(strategy.winRate || 0).toFixed(1)}%</span>
            </div>
            <div class="metric-item">
              <span class="label">Max Drawdown</span>
              <span class="value negative">${(strategy.maxDrawdown || 0).toFixed(1)}%</span>
            </div>
            <div class="metric-item">
              <span class="label">Sharpe Ratio</span>
              <span class="value">${(strategy.sharpeRatio || 0).toFixed(2)}</span>
            </div>
            <div class="metric-item">
              <span class="label">Total Trades</span>
              <span class="value">${strategy.totalTrades || 0}</span>
            </div>
            <div class="metric-item">
              <span class="label">Active Users</span>
              <span class="value">${formatCompactNumber(strategy.activeUsers || 0)}</span>
            </div>
          </div>
        </div>

        <div class="strategy-details-section">
          <h3>Risk Profile</h3>
          <div class="risk-info">
            <span class="risk-badge ${strategy.riskLevel}">${riskEmoji} ${strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1)} Risk</span>
            <span class="min-capital-badge">${strategy.minInvestment} TON minimum</span>
          </div>
          <div class="supported-assets">
            <span class="label">Supported Assets:</span>
            <span class="assets">${(strategy.supportedAssets || []).join(', ')}</span>
          </div>
        </div>

        <div class="strategy-details-section">
          <h3>Rating</h3>
          <div class="rating-display">
            <span class="stars large">${starRating}</span>
            <span class="rating-score">${(strategy.rating || 0).toFixed(1)} / 10</span>
          </div>
        </div>

        <div class="strategy-details-section">
          <h3>Tags</h3>
          <div class="tags-list">
            ${(strategy.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;

    TelegramMiniApp.showPopup({
      title: 'Strategy Details',
      message: detailsHtml,
      buttons: [
        { id: 'deploy', type: 'default', text: 'Deploy Strategy' },
        { id: 'close', type: 'cancel', text: 'Close' }
      ]
    }, (buttonId) => {
      if (buttonId === 'deploy') {
        copyStrategy(strategyId);
      }
    });
  };

  /**
   * Filter marketplace
   */
  function filterMarketplace() {
    renderMarketplace();
  }

  /**
   * Copy strategy (create agent with it)
   */
  window.copyStrategy = function(strategyId) {
    state.selectedStrategy = state.strategies.find(s => s.id === strategyId);
    showMainSection();
    openCreateAgentModal();
    showStep(3);
  };

  /**
   * Show rankings section
   */
  function showRankings() {
    TelegramMiniApp.haptic.impactOccurred('light');
    hideAllSections();
    elements.rankingsSection.classList.remove('hidden');
    state.currentSection = 'rankings';
    TelegramMiniApp.showBackButton(showMainSection);
    renderRankings();
  }

  /**
   * Render rankings
   */
  function renderRankings() {
    elements.rankingsList.innerHTML = SAMPLE_RANKINGS.map(item => `
      <div class="ranking-item">
        <div class="ranking-position ${item.rank <= 3 ? 'top-3' : ''}">${item.rank}</div>
        <div class="ranking-info">
          <span class="ranking-name">${escapeHtml(item.name)}</span>
          <span class="ranking-details">${escapeHtml(item.details)}</span>
        </div>
        <span class="ranking-score">${item.score}</span>
      </div>
    `).join('');
  }

  /**
   * Switch ranking tab
   */
  function switchRankingTab(tab) {
    TelegramMiniApp.haptic.selectionChanged();
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    // In production, this would load different rankings
    renderRankings();
  }

  /**
   * Show main section
   */
  function showMainSection() {
    hideAllSections();
    elements.agentsSection.classList.remove('hidden');
    state.currentSection = 'main';
    TelegramMiniApp.hideBackButton();
  }

  /**
   * Hide all sections
   */
  function hideAllSections() {
    elements.agentsSection.classList.add('hidden');
    elements.marketplaceSection.classList.add('hidden');
    elements.rankingsSection.classList.add('hidden');
  }

  /**
   * Handle back button
   */
  function handleBackButton() {
    if (state.currentSection !== 'main') {
      showMainSection();
    } else if (!elements.createAgentModal.classList.contains('hidden')) {
      closeCreateAgentModal();
    }
  }

  // ---------------------------------------------------------------------------
  // TON Wallet integration
  // ---------------------------------------------------------------------------

  /**
   * Initialize TON Connect and restore any saved session.
   */
  function initWallet() {
    if (!window.TONConnect) return;

    TONConnect.init();

    // Subscribe to wallet state changes
    TONConnect.onStateChange(function(walletState) {
      state.wallet = walletState.connected ? walletState : null;
      updateWalletUI(walletState);
    });

    // Apply current state (may be restored from session storage)
    updateWalletUI(TONConnect.getState());
  }

  /**
   * Update all wallet-related UI elements based on current wallet state.
   * @param {{ connected: boolean, address: string|null, shortAddress: string|null, walletName: string|null, connecting: boolean }} walletState
   */
  function updateWalletUI(walletState) {
    if (!elements.userBalance) return;

    if (walletState.connecting) {
      elements.userBalance.textContent = 'Connecting…';
      if (elements.walletConnectBtn) {
        elements.walletConnectBtn.classList.add('connecting');
        elements.walletConnectBtn.disabled = true;
      }
      return;
    }

    if (elements.walletConnectBtn) {
      elements.walletConnectBtn.disabled = false;
      elements.walletConnectBtn.classList.remove('connecting');
    }

    if (walletState.connected && walletState.address) {
      elements.userBalance.textContent = walletState.shortAddress || TONConnect.formatAddress(walletState.address);
      if (elements.walletConnectBtn) {
        elements.walletConnectBtn.classList.add('wallet-connected');
      }
    } else {
      elements.userBalance.textContent = 'Connect Wallet';
      if (elements.walletConnectBtn) {
        elements.walletConnectBtn.classList.remove('wallet-connected');
      }
    }
  }

  /**
   * Open the wallet modal.
   * Shows the connected state if already connected, otherwise the selector.
   */
  function openWalletModal() {
    TelegramMiniApp.haptic.impactOccurred('light');

    const walletState = TONConnect ? TONConnect.getState() : { connected: false };

    if (walletState.connected) {
      showWalletConnectedView(walletState);
    } else {
      showWalletSelectorView();
    }

    elements.walletModal.classList.remove('hidden');
    TelegramMiniApp.showBackButton(closeWalletModal);
  }

  /**
   * Close the wallet modal.
   */
  function closeWalletModal() {
    elements.walletModal.classList.add('hidden');
    TelegramMiniApp.hideBackButton();
  }

  /**
   * Show the wallet selector inside the modal.
   */
  function showWalletSelectorView() {
    elements.walletSelector.classList.remove('hidden');
    elements.walletConnectedView.classList.add('hidden');
    elements.walletConnectingView.classList.add('hidden');

    if (!TONConnect) return;

    const wallets = TONConnect.getSupportedWallets();
    elements.walletList.innerHTML = wallets.map(function(w) {
      return `
        <button class="wallet-item" data-wallet-id="${escapeHtml(w.id)}">
          <img class="wallet-item-icon" src="${escapeHtml(w.icon)}" alt="${escapeHtml(w.name)}" onerror="this.style.display='none'">
          <span class="wallet-item-name">${escapeHtml(w.name)}</span>
          <svg class="wallet-item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      `;
    }).join('');

    elements.walletList.querySelectorAll('.wallet-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const walletId = btn.dataset.walletId;
        const wallet = TONConnect.getSupportedWallets().find(function(w) { return w.id === walletId; });
        if (wallet) initiateWalletConnection(wallet);
      });
    });
  }

  /**
   * Show the connected wallet view inside the modal.
   * @param {{ address: string, walletName: string|null }} walletState
   */
  function showWalletConnectedView(walletState) {
    elements.walletSelector.classList.add('hidden');
    elements.walletConnectingView.classList.add('hidden');
    elements.walletConnectedView.classList.remove('hidden');

    if (elements.connectedWalletName) {
      elements.connectedWalletName.textContent = walletState.walletName || 'TON Wallet';
    }
    if (elements.connectedWalletAddress) {
      elements.connectedWalletAddress.textContent = walletState.shortAddress
        || (walletState.address ? TONConnect.formatAddress(walletState.address) : '');
    }
  }

  /**
   * Initiate a connection attempt with the given wallet.
   * @param {object} wallet - Wallet descriptor
   */
  async function initiateWalletConnection(wallet) {
    if (!TONConnect) return;

    elements.walletSelector.classList.add('hidden');
    elements.walletConnectedView.classList.add('hidden');
    elements.walletConnectingView.classList.remove('hidden');
    if (elements.connectingWalletName) {
      elements.connectingWalletName.textContent = wallet.name;
    }

    try {
      let result;
      try {
        result = await TONConnect.connect(wallet);
      } catch (err) {
        if (err.code === 'SHOW_WALLET_SELECTOR') {
          // JS bridge not available — open universal link
          TONConnect.connectViaUniversalLink(wallet);
          // Show a message to the user
          elements.walletConnectingView.classList.add('hidden');
          elements.walletSelector.classList.remove('hidden');
          TelegramMiniApp.showAlert(
            'Opening ' + wallet.name + '…\nAfter approving in your wallet, come back to the app.'
          );
          return;
        }
        throw err;
      }

      // Connection succeeded — persist on backend
      try {
        await TONConnect.saveWalletToBackend(result.address, result.walletName);
      } catch (backendErr) {
        console.warn('[App] Backend wallet save failed:', backendErr.message);
        // Non-fatal: wallet is still connected client-side
      }

      showWalletConnectedView(TONConnect.getState());
      TelegramMiniApp.haptic.notificationOccurred('success');
    } catch (err) {
      console.error('[App] Wallet connection failed:', err);
      elements.walletConnectingView.classList.add('hidden');
      elements.walletSelector.classList.remove('hidden');
      TelegramMiniApp.showAlert('Failed to connect wallet: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Copy the connected wallet address to clipboard.
   */
  function copyWalletAddress() {
    const walletState = TONConnect ? TONConnect.getState() : null;
    if (!walletState || !walletState.address) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(walletState.address).then(function() {
        TelegramMiniApp.haptic.notificationOccurred('success');
        TelegramMiniApp.showAlert('Address copied to clipboard!');
      }).catch(function() {
        TelegramMiniApp.showAlert(walletState.address);
      });
    } else {
      TelegramMiniApp.showAlert(walletState.address);
    }
  }

  /**
   * Open the TON explorer for the connected wallet address.
   */
  function viewOnExplorer() {
    const walletState = TONConnect ? TONConnect.getState() : null;
    if (!walletState || !walletState.address) return;

    const explorerUrl = 'https://tonscan.org/address/' + encodeURIComponent(walletState.address);
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) {
      window.Telegram.WebApp.openLink(explorerUrl);
    } else {
      window.open(explorerUrl, '_blank');
    }
  }

  /**
   * Disconnect the wallet.
   */
  async function disconnectWallet() {
    if (!TONConnect) return;

    TelegramMiniApp.haptic.impactOccurred('medium');
    await TONConnect.disconnect();
    closeWalletModal();
    TelegramMiniApp.showAlert('Wallet disconnected.');
  }

  /**
   * Open settings
   */
  function openSettings() {
    TelegramMiniApp.haptic.impactOccurred('light');
    TelegramMiniApp.showPopup({
      title: 'Settings',
      message: 'Settings coming soon!',
      buttons: [{ type: 'ok' }]
    });
  }

  /**
   * Format currency
   */
  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
