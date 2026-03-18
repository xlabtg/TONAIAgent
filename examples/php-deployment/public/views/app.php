<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0088CC">

    <title>TON AI Agent - Mini App</title>
    <meta name="description" content="Deploy and manage AI trading agents on TON blockchain">

    <!-- Telegram WebApp SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>

    <link rel="stylesheet" href="assets/css/styles.css">
    <?php echo Security::csrfMeta(); ?>
    <style>
        /* Mini App specific styles */
        .mini-app {
            min-height: 100vh;
            padding-bottom: env(safe-area-inset-bottom, 20px);
        }

        .app-header {
            position: sticky;
            top: 0;
            background: var(--background);
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            z-index: 100;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--ton-blue);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }

        .user-name {
            font-weight: 600;
        }

        .user-balance {
            font-size: 0.875rem;
            color: var(--text-muted);
        }

        .portfolio-card {
            background: linear-gradient(135deg, var(--ton-blue) 0%, var(--deep-navy) 100%);
            color: white;
            border-radius: 1rem;
            padding: 1.5rem;
            margin: 1rem;
        }

        .portfolio-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.25rem;
        }

        .portfolio-label {
            opacity: 0.8;
            font-size: 0.875rem;
        }

        .portfolio-change {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.5rem;
            background: rgba(255,255,255,0.2);
            border-radius: 0.5rem;
            font-size: 0.875rem;
            margin-top: 0.5rem;
        }

        .portfolio-change.positive {
            color: #4ade80;
        }

        .portfolio-change.negative {
            color: #f87171;
        }

        .quick-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
            padding: 0 1rem;
            margin-bottom: 1.5rem;
        }

        .quick-action {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem;
            background: var(--card-bg);
            border-radius: 0.75rem;
            border: 1px solid var(--border);
            text-decoration: none;
            color: inherit;
        }

        .quick-action-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--ton-blue);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .quick-action-label {
            font-size: 0.75rem;
            text-align: center;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 1rem;
            margin-bottom: 0.75rem;
        }

        .section-title-sm {
            font-size: 1rem;
            font-weight: 600;
        }

        .see-all {
            font-size: 0.875rem;
            color: var(--ton-blue);
            text-decoration: none;
        }

        .agents-list {
            padding: 0 1rem;
        }

        .agent-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            margin-bottom: 0.75rem;
        }

        .agent-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .agent-icon {
            width: 44px;
            height: 44px;
            border-radius: 0.75rem;
            background: var(--ton-blue);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .agent-name {
            font-weight: 600;
            margin-bottom: 0.125rem;
        }

        .agent-strategy {
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .agent-stats {
            text-align: right;
        }

        .agent-pnl {
            font-weight: 600;
        }

        .agent-pnl.positive {
            color: #4ade80;
        }

        .agent-pnl.negative {
            color: #f87171;
        }

        .agent-balance {
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .tab-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--background);
            border-top: 1px solid var(--border);
            padding: 0.5rem 0;
            padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
            display: flex;
            justify-content: space-around;
        }

        .tab-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            padding: 0.5rem 1rem;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.625rem;
        }

        .tab-item.active {
            color: var(--ton-blue);
        }

        .tab-icon {
            width: 24px;
            height: 24px;
        }

        .empty-state {
            text-align: center;
            padding: 3rem 2rem;
        }

        .empty-state-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 1rem;
            color: var(--text-muted);
        }

        .empty-state-title {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .empty-state-text {
            color: var(--text-muted);
            margin-bottom: 1.5rem;
        }

        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            gap: 1rem;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border);
            border-top-color: var(--ton-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .auth-error {
            text-align: center;
            padding: 3rem 2rem;
        }
    </style>
</head>
<body class="mini-app-body">
    <div id="app" class="mini-app">
        <!-- Loading State -->
        <div id="loading-state" class="loading-state">
            <div class="spinner"></div>
            <p>Connecting to Telegram...</p>
        </div>

        <!-- Auth Error State -->
        <div id="auth-error" class="auth-error" style="display: none;">
            <h2>Authentication Required</h2>
            <p>Please open this app from Telegram.</p>
            <a href="https://t.me/TONAIAgentBot" class="btn btn-primary">Open in Telegram</a>
        </div>

        <!-- Main App Content -->
        <div id="main-content" style="display: none;">
            <!-- Header -->
            <header class="app-header">
                <div class="user-info">
                    <div class="user-avatar" id="user-avatar">U</div>
                    <div>
                        <div class="user-name" id="user-name">User</div>
                        <div class="user-balance" id="user-balance">Loading...</div>
                    </div>
                </div>
            </header>

            <!-- Portfolio Card -->
            <div class="portfolio-card">
                <div class="portfolio-label">Total Portfolio Value</div>
                <div class="portfolio-value" id="portfolio-value">0.00 TON</div>
                <div class="portfolio-change positive" id="portfolio-change">
                    <span>+0.00%</span>
                    <span>24h</span>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
                <a href="#deploy" class="quick-action" onclick="showDeployModal()">
                    <div class="quick-action-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </div>
                    <span class="quick-action-label">Deploy Agent</span>
                </a>
                <a href="#strategies" class="quick-action" onclick="showStrategies()">
                    <div class="quick-action-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                    </div>
                    <span class="quick-action-label">Strategies</span>
                </a>
                <a href="#rankings" class="quick-action" onclick="showRankings()">
                    <div class="quick-action-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20V10M18 20V4M6 20v-4"/>
                        </svg>
                    </div>
                    <span class="quick-action-label">Rankings</span>
                </a>
            </div>

            <!-- Active Agents Section -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title-sm">Your Agents</h3>
                    <a href="#agents" class="see-all">See All</a>
                </div>

                <div id="agents-list" class="agents-list">
                    <!-- Empty state -->
                    <div id="no-agents" class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        <h3 class="empty-state-title">No Active Agents</h3>
                        <p class="empty-state-text">Deploy your first AI agent to start earning.</p>
                        <button class="btn btn-primary" onclick="showDeployModal()">Deploy Agent</button>
                    </div>
                </div>
            </div>

            <!-- Bottom Tab Bar -->
            <nav class="tab-bar">
                <a href="#home" class="tab-item active">
                    <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                    Home
                </a>
                <a href="#marketplace" class="tab-item">
                    <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    Marketplace
                </a>
                <a href="#portfolio" class="tab-item">
                    <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    Portfolio
                </a>
                <a href="#settings" class="tab-item">
                    <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    Settings
                </a>
            </nav>
        </div>
    </div>

    <script>
        // Initialize Telegram WebApp
        const tg = window.Telegram?.WebApp;

        // CSRF token for API requests
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

        // App state
        let user = null;
        let sessionToken = null;

        // DOM elements
        const loadingState = document.getElementById('loading-state');
        const authError = document.getElementById('auth-error');
        const mainContent = document.getElementById('main-content');

        // Initialize app
        async function initApp() {
            if (!tg) {
                // Not in Telegram
                showAuthError();
                return;
            }

            // Expand to full height
            tg.expand();

            // Set theme
            if (tg.colorScheme === 'dark') {
                document.body.classList.add('dark-mode');
            }

            // Get init data
            const initData = tg.initData;

            if (!initData) {
                showAuthError();
                return;
            }

            try {
                // Authenticate with backend
                const response = await fetch('/api/auth/telegram', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    },
                    body: JSON.stringify({ initData })
                });

                const data = await response.json();

                if (!data.success) {
                    showAuthError();
                    return;
                }

                user = data.data.user;
                sessionToken = data.data.token;

                // Update UI
                showMainContent();
                updateUserInfo();
                loadPortfolio();
                loadAgents();

                // Setup main button
                tg.MainButton.setText('Deploy Agent');
                tg.MainButton.onClick(showDeployModal);

            } catch (error) {
                console.error('Auth error:', error);
                showAuthError();
            }
        }

        function showAuthError() {
            loadingState.style.display = 'none';
            authError.style.display = 'block';
        }

        function showMainContent() {
            loadingState.style.display = 'none';
            mainContent.style.display = 'block';
        }

        function updateUserInfo() {
            if (!user) return;

            const firstName = user.first_name || 'User';
            document.getElementById('user-name').textContent = firstName;
            document.getElementById('user-avatar').textContent = firstName.charAt(0).toUpperCase();
        }

        async function loadPortfolio() {
            // Demo data - in production, fetch from API
            document.getElementById('portfolio-value').textContent = '125.50 TON';
            document.getElementById('user-balance').textContent = '125.50 TON';

            const changeEl = document.getElementById('portfolio-change');
            changeEl.innerHTML = '<span>+5.2%</span><span>24h</span>';
            changeEl.classList.add('positive');
        }

        async function loadAgents() {
            // Demo - show empty state
            // In production, fetch from API and render agent list
        }

        function showDeployModal() {
            if (tg) {
                tg.showAlert('Deploy Agent feature coming soon!');
            } else {
                alert('Deploy Agent feature coming soon!');
            }
        }

        function showStrategies() {
            if (tg) {
                tg.showAlert('Strategy Marketplace coming soon!');
            }
        }

        function showRankings() {
            if (tg) {
                tg.showAlert('Agent Rankings coming soon!');
            }
        }

        // API helper
        async function api(endpoint, options = {}) {
            const headers = {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            };

            if (sessionToken) {
                headers['Authorization'] = `Bearer ${sessionToken}`;
            }

            const response = await fetch(endpoint, {
                ...options,
                headers: { ...headers, ...options.headers }
            });

            return response.json();
        }

        // Initialize on load
        document.addEventListener('DOMContentLoaded', initApp);

        // Handle Telegram theme changes
        if (tg) {
            tg.onEvent('themeChanged', () => {
                if (tg.colorScheme === 'dark') {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            });
        }
    </script>
</body>
</html>
