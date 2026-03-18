<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0088CC">

    <title>TON AI Agent - Autonomous AI Trading on TON</title>
    <meta name="description" content="Deploy AI-powered trading agents on TON blockchain. Automated strategies, copy trading, and yield optimization.">

    <!-- Open Graph -->
    <meta property="og:title" content="TON AI Agent">
    <meta property="og:description" content="Autonomous AI Trading on TON Blockchain">
    <meta property="og:type" content="website">

    <!-- Telegram WebApp -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>

    <link rel="stylesheet" href="assets/css/styles.css">
    <?php echo Security::csrfMeta(); ?>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <div class="logo">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span>TON AI Agent</span>
            </div>
            <nav class="nav">
                <a href="#features">Features</a>
                <a href="#strategies">Strategies</a>
                <a href="#how-it-works">How It Works</a>
            </nav>
        </header>

        <!-- Hero Section -->
        <section class="hero">
            <div class="hero-content">
                <h1>Autonomous AI Trading on TON</h1>
                <p class="hero-subtitle">
                    Deploy intelligent trading agents that work 24/7. Copy successful strategies, earn passive income, and grow your portfolio on TON blockchain.
                </p>
                <div class="hero-cta">
                    <a href="/app" class="btn btn-primary btn-lg">
                        Launch App
                    </a>
                    <a href="#how-it-works" class="btn btn-outline btn-lg">
                        Learn More
                    </a>
                </div>
                <div class="hero-stats">
                    <div class="stat">
                        <span class="stat-value">$2.5M+</span>
                        <span class="stat-label">Total Value Locked</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">1,200+</span>
                        <span class="stat-label">Active Agents</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">15%</span>
                        <span class="stat-label">Avg. APY</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section id="features" class="section">
            <h2 class="section-title">Why TON AI Agent?</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    </div>
                    <h3>24/7 Trading</h3>
                    <p>AI agents never sleep. They monitor markets and execute trades around the clock.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <h3>Non-Custodial</h3>
                    <p>Your keys, your coins. Agents operate with limited permissions on your wallet.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <h3>Copy Trading</h3>
                    <p>Follow top performers. Copy strategies from successful traders with one click.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                    </div>
                    <h3>Passive Income</h3>
                    <p>Earn while you sleep. Automated yield optimization across DeFi protocols.</p>
                </div>
            </div>
        </section>

        <!-- Strategies Section -->
        <section id="strategies" class="section">
            <h2 class="section-title">Trading Strategies</h2>
            <div class="strategies-grid">
                <div class="strategy-card">
                    <div class="strategy-header">
                        <span class="strategy-name">DCA</span>
                        <span class="badge badge-success">Low Risk</span>
                    </div>
                    <p>Dollar Cost Averaging - invest fixed amounts at regular intervals.</p>
                    <div class="strategy-stats">
                        <span>Min: 10 TON</span>
                        <span>Fee: 10%</span>
                    </div>
                </div>
                <div class="strategy-card">
                    <div class="strategy-header">
                        <span class="strategy-name">Yield Farming</span>
                        <span class="badge badge-warning">Medium Risk</span>
                    </div>
                    <p>Optimize returns across multiple DeFi protocols.</p>
                    <div class="strategy-stats">
                        <span>Min: 100 TON</span>
                        <span>Fee: 15%</span>
                    </div>
                </div>
                <div class="strategy-card">
                    <div class="strategy-header">
                        <span class="strategy-name">Rebalancing</span>
                        <span class="badge badge-success">Low Risk</span>
                    </div>
                    <p>Maintain target portfolio allocations automatically.</p>
                    <div class="strategy-stats">
                        <span>Min: 200 TON</span>
                        <span>Fee: 10%</span>
                    </div>
                </div>
                <div class="strategy-card">
                    <div class="strategy-header">
                        <span class="strategy-name">Arbitrage</span>
                        <span class="badge badge-danger">High Risk</span>
                    </div>
                    <p>Exploit price differences across exchanges.</p>
                    <div class="strategy-stats">
                        <span>Min: 1000 TON</span>
                        <span>Fee: 20%</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- How It Works Section -->
        <section id="how-it-works" class="section">
            <h2 class="section-title">How It Works</h2>
            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <h3>Connect Wallet</h3>
                    <p>Link your TON wallet securely via Telegram.</p>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <h3>Choose Strategy</h3>
                    <p>Pick from proven strategies or copy top performers.</p>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <h3>Fund & Deploy</h3>
                    <p>Allocate capital and launch your AI agent.</p>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <h3>Earn & Grow</h3>
                    <p>Monitor performance and withdraw anytime.</p>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="section cta-section">
            <h2>Ready to Start?</h2>
            <p>Launch your first AI agent in under 2 minutes.</p>
            <a href="/app" class="btn btn-primary btn-lg">Get Started</a>
        </section>

        <!-- Footer -->
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-logo">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <span>TON AI Agent</span>
                </div>
                <div class="footer-links">
                    <a href="https://t.me/tonaiagent" target="_blank">Telegram</a>
                    <a href="https://github.com/xlabtg/TONAIAgent" target="_blank">GitHub</a>
                    <a href="/legal/terms.html">Terms</a>
                    <a href="/legal/privacy.html">Privacy</a>
                </div>
                <p class="footer-copyright">&copy; 2024-2026 TON AI Agent. All rights reserved.</p>
            </div>
        </footer>
    </div>

    <script src="assets/js/main.js"></script>
</body>
</html>
