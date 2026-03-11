/**
 * TON AI Agent - Growth Dashboard Component
 *
 * Implements the Mini App growth and viral mechanics dashboard:
 * - Referral link management and stats
 * - Invite friends functionality
 * - Leaderboard display
 * - Performance card sharing
 * - Weekly challenges
 *
 * @see Issue #200 - Viral Growth Mechanics for Telegram
 */
(function () {
  'use strict';

  const { State, Fmt, esc, el, TG } = window.App;

  // ============================================================================
  // Growth State
  // ============================================================================

  const GrowthState = {
    referralLink: null,
    referralStats: {
      clicks: 0,
      joins: 0,
      conversions: 0,
      conversionRate: 0,
    },
    leaderboard: [],
    challenges: [],
    userRank: null,
  };

  // ============================================================================
  // Demo Data
  // ============================================================================

  const GrowthDemoData = {
    getReferralLink(userId) {
      const code = 'TONAI' + Math.random().toString(36).substring(2, 8).toUpperCase();
      return {
        code,
        deepLink: `https://t.me/TONAIAgentBot?start=ref_${code}`,
        shortLink: `https://tonai.link/r/${code}`,
      };
    },

    getReferralStats() {
      return {
        clicks: Math.floor(Math.random() * 50) + 5,
        joins: Math.floor(Math.random() * 20) + 2,
        conversions: Math.floor(Math.random() * 10) + 1,
        conversionRate: parseFloat((Math.random() * 30 + 10).toFixed(1)),
      };
    },

    getLeaderboard() {
      const names = ['Alpha Trader', 'CryptoKing', 'TON Master', 'DeFi Pro', 'AI Wizard',
                     'Smart Investor', 'Token Hunter', 'Chain Expert', 'Yield Farmer', 'Bot Master'];
      return names.map((name, i) => ({
        rank: i + 1,
        displayName: name,
        score: Math.floor(Math.random() * 5000) + 1000 - (i * 300),
        roi: parseFloat((Math.random() * 30 + 5 - i * 2).toFixed(1)),
        isCurrentUser: i === Math.floor(Math.random() * 10),
      })).sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }));
    },

    getChallenges() {
      return [
        {
          id: 'weekly_roi',
          name: 'Weekly ROI Champion',
          description: 'Achieve the highest ROI this week',
          type: 'weekly_roi',
          status: 'active',
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          participants: Math.floor(Math.random() * 500) + 200,
          rewards: [
            { rank: 1, title: 'Champion Badge', xpBonus: 5000 },
            { rank: 2, title: 'Runner Up Badge', xpBonus: 3000 },
            { rank: 3, title: 'Third Place Badge', xpBonus: 1500 },
          ],
        },
        {
          id: 'most_consistent',
          name: 'Consistency Master',
          description: 'Most consistent trading performance',
          type: 'most_consistent',
          status: 'active',
          endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
          participants: Math.floor(Math.random() * 300) + 100,
          rewards: [
            { rank: 1, title: 'Consistency Badge', xpBonus: 3000 },
            { rank: 2, title: 'Steady Trader Badge', xpBonus: 2000 },
          ],
        },
      ];
    },

    getUserRank() {
      return {
        rank: Math.floor(Math.random() * 100) + 1,
        totalParticipants: Math.floor(Math.random() * 2000) + 500,
        score: Math.floor(Math.random() * 3000) + 500,
        percentile: Math.floor(Math.random() * 30) + 1,
      };
    },
  };

  // ============================================================================
  // Growth Manager
  // ============================================================================

  const Growth = {
    initialized: false,

    async init() {
      if (this.initialized) return;
      this.initialized = true;

      // Load initial data
      await this.loadReferralData();
      await this.loadLeaderboard();
      await this.loadChallenges();
    },

    async loadReferralData() {
      // In production, this would fetch from API
      const userId = State.user?.id || 'demo';
      GrowthState.referralLink = GrowthDemoData.getReferralLink(userId);
      GrowthState.referralStats = GrowthDemoData.getReferralStats();
    },

    async loadLeaderboard() {
      GrowthState.leaderboard = GrowthDemoData.getLeaderboard();
      GrowthState.userRank = GrowthDemoData.getUserRank();
    },

    async loadChallenges() {
      GrowthState.challenges = GrowthDemoData.getChallenges();
    },

    async refresh() {
      await this.loadReferralData();
      await this.loadLeaderboard();
      await this.loadChallenges();
      this.render();
    },

    render() {
      const container = el('growth-content');
      if (!container) return;

      container.innerHTML = `
        ${this.renderReferralSection()}
        ${this.renderLeaderboardSection()}
        ${this.renderChallengesSection()}
        ${this.renderShareSection()}
      `;

      this.setupEventListeners();
    },

    // ============================================================================
    // Section Renderers
    // ============================================================================

    renderReferralSection() {
      const { referralLink, referralStats } = GrowthState;

      return `
        <div class="growth-section">
          <div class="section-header">
            <span class="section-icon">🔗</span>
            <h3 class="section-title">Invite Friends</h3>
          </div>
          <div class="referral-card">
            <p class="referral-description">
              Share your referral link and earn rewards when friends join!
            </p>
            <div class="referral-link-box">
              <input type="text" readonly class="referral-link-input" id="referral-link-input"
                     value="${esc(referralLink?.shortLink || '')}" />
              <button class="copy-btn" id="copy-referral-btn" title="Copy link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div class="referral-actions">
              <button class="growth-btn primary" id="share-telegram-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Share on Telegram
              </button>
              <button class="growth-btn secondary" id="share-twitter-btn">
                Share on X
              </button>
            </div>
            <div class="referral-stats">
              <div class="referral-stat">
                <span class="stat-value">${referralStats.clicks}</span>
                <span class="stat-label">Clicks</span>
              </div>
              <div class="referral-stat">
                <span class="stat-value">${referralStats.joins}</span>
                <span class="stat-label">Signups</span>
              </div>
              <div class="referral-stat">
                <span class="stat-value">${referralStats.conversions}</span>
                <span class="stat-label">Active</span>
              </div>
              <div class="referral-stat">
                <span class="stat-value">${referralStats.conversionRate}%</span>
                <span class="stat-label">Rate</span>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    renderLeaderboardSection() {
      const { leaderboard, userRank } = GrowthState;
      const top5 = leaderboard.slice(0, 5);

      const leaderboardHTML = top5.map((entry, i) => {
        const medalEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const isUser = entry.isCurrentUser;

        return `
          <div class="leaderboard-entry ${isUser ? 'current-user' : ''}">
            <span class="entry-rank">${medalEmoji || entry.rank}</span>
            <span class="entry-name">${esc(entry.displayName)}${isUser ? ' (You)' : ''}</span>
            <span class="entry-score">${entry.score.toLocaleString()} pts</span>
            <span class="entry-roi ${entry.roi >= 0 ? 'positive' : 'negative'}">${entry.roi >= 0 ? '+' : ''}${entry.roi}%</span>
          </div>
        `;
      }).join('');

      return `
        <div class="growth-section">
          <div class="section-header">
            <span class="section-icon">🏆</span>
            <h3 class="section-title">Leaderboard</h3>
            <span class="section-badge">Weekly</span>
          </div>
          <div class="leaderboard-card">
            ${userRank ? `
              <div class="your-rank-banner">
                <span>Your Rank: #${userRank.rank}</span>
                <span class="rank-percentile">Top ${userRank.percentile}%</span>
              </div>
            ` : ''}
            <div class="leaderboard-list">
              ${leaderboardHTML}
            </div>
            <button class="view-all-btn" id="view-full-leaderboard">
              View Full Leaderboard
            </button>
          </div>
        </div>
      `;
    },

    renderChallengesSection() {
      const { challenges } = GrowthState;

      if (challenges.length === 0) {
        return `
          <div class="growth-section">
            <div class="section-header">
              <span class="section-icon">🎮</span>
              <h3 class="section-title">Challenges</h3>
            </div>
            <div class="empty-challenges">
              <p>No active challenges right now. Check back soon!</p>
            </div>
          </div>
        `;
      }

      const challengesHTML = challenges.map(challenge => {
        const endDate = new Date(challenge.endDate);
        const daysLeft = Math.ceil((endDate - new Date()) / (24 * 60 * 60 * 1000));
        const topReward = challenge.rewards[0];

        return `
          <div class="challenge-card" data-challenge-id="${challenge.id}">
            <div class="challenge-header">
              <span class="challenge-type">${this.getChallengeTypeEmoji(challenge.type)}</span>
              <div class="challenge-info">
                <h4 class="challenge-name">${esc(challenge.name)}</h4>
                <p class="challenge-desc">${esc(challenge.description)}</p>
              </div>
            </div>
            <div class="challenge-meta">
              <span class="challenge-time">⏱️ ${daysLeft} days left</span>
              <span class="challenge-participants">👥 ${challenge.participants} joined</span>
            </div>
            <div class="challenge-reward">
              <span class="reward-label">1st Place:</span>
              <span class="reward-value">${esc(topReward.title)} + ${topReward.xpBonus} XP</span>
            </div>
            <button class="join-challenge-btn" data-challenge-id="${challenge.id}">
              Join Challenge
            </button>
          </div>
        `;
      }).join('');

      return `
        <div class="growth-section">
          <div class="section-header">
            <span class="section-icon">🎮</span>
            <h3 class="section-title">Challenges</h3>
          </div>
          <div class="challenges-list">
            ${challengesHTML}
          </div>
        </div>
      `;
    },

    renderShareSection() {
      return `
        <div class="growth-section">
          <div class="section-header">
            <span class="section-icon">📊</span>
            <h3 class="section-title">Share Your Performance</h3>
          </div>
          <div class="share-card">
            <p class="share-description">
              Generate a shareable card showcasing your AI agent's performance
            </p>
            <button class="growth-btn primary full-width" id="generate-share-card">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              Generate Performance Card
            </button>
          </div>
        </div>
      `;
    },

    getChallengeTypeEmoji(type) {
      const emojis = {
        weekly_roi: '📈',
        best_strategy: '🎯',
        most_consistent: '⚖️',
        most_trades: '💹',
      };
      return emojis[type] || '🏆';
    },

    // ============================================================================
    // Event Handlers
    // ============================================================================

    setupEventListeners() {
      // Copy referral link
      el('copy-referral-btn')?.addEventListener('click', () => {
        this.copyReferralLink();
      });

      // Share on Telegram
      el('share-telegram-btn')?.addEventListener('click', () => {
        this.shareOnTelegram();
      });

      // Share on Twitter
      el('share-twitter-btn')?.addEventListener('click', () => {
        this.shareOnTwitter();
      });

      // View full leaderboard
      el('view-full-leaderboard')?.addEventListener('click', () => {
        this.showFullLeaderboard();
      });

      // Join challenge buttons
      document.querySelectorAll('.join-challenge-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const challengeId = e.target.dataset.challengeId;
          this.joinChallenge(challengeId);
        });
      });

      // Generate share card
      el('generate-share-card')?.addEventListener('click', () => {
        this.generateShareCard();
      });
    },

    copyReferralLink() {
      const input = el('referral-link-input');
      if (!input) return;

      navigator.clipboard.writeText(input.value).then(() => {
        TG.haptic.notify('success');
        this.showToast('Link copied to clipboard!');
      }).catch(() => {
        // Fallback for older browsers
        input.select();
        document.execCommand('copy');
        TG.haptic.notify('success');
        this.showToast('Link copied!');
      });
    },

    shareOnTelegram() {
      const { referralLink } = GrowthState;
      if (!referralLink) return;

      const text = encodeURIComponent(
        `🤖 Join me on TON AI Agent and launch your own AI trading bot!\n\n` +
        `Use my referral link and we both earn rewards:\n${referralLink.deepLink}`
      );
      const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink.deepLink)}&text=${text}`;

      TG.haptic.impact('light');
      window.open(url, '_blank');
    },

    shareOnTwitter() {
      const { referralLink } = GrowthState;
      if (!referralLink) return;

      const text = encodeURIComponent(
        `🤖 I'm trading with AI agents on @TONAIAgent!\n\n` +
        `Launch your own AI trading bot and join the future of automated trading.\n\n` +
        `Join here: ${referralLink.shortLink}`
      );
      const url = `https://twitter.com/intent/tweet?text=${text}`;

      TG.haptic.impact('light');
      window.open(url, '_blank');
    },

    showFullLeaderboard() {
      TG.haptic.select();
      // In production, this would navigate to a full leaderboard view
      TG.alert('Full leaderboard coming soon!');
    },

    joinChallenge(challengeId) {
      TG.haptic.impact('medium');
      const challenge = GrowthState.challenges.find(c => c.id === challengeId);
      if (!challenge) return;

      TG.confirm(
        `Join "${challenge.name}" challenge?\n\nYour agent's performance will be tracked for this competition.`,
        (confirmed) => {
          if (confirmed) {
            TG.haptic.notify('success');
            this.showToast(`Joined ${challenge.name}!`);

            // Update button state
            const btn = document.querySelector(`[data-challenge-id="${challengeId}"]`);
            if (btn) {
              btn.textContent = 'Joined ✓';
              btn.disabled = true;
              btn.classList.add('joined');
            }
          }
        }
      );
    },

    generateShareCard() {
      TG.haptic.impact('light');

      // Show loading state
      const btn = el('generate-share-card');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Generating...';
      }

      // Simulate card generation
      setTimeout(() => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            Generate Performance Card
          `;
        }

        TG.haptic.notify('success');
        this.showShareCardModal();
      }, 1500);
    },

    showShareCardModal() {
      // Get agent data (demo or real)
      const agentName = localStorage.getItem('tonai_agent_name') || 'My AI Agent';
      const strategy = localStorage.getItem('tonai_agent_strategy') || 'Momentum';
      const roi = parseFloat((Math.random() * 15 + 5).toFixed(1));
      const trades = Math.floor(Math.random() * 50) + 10;

      const modal = document.createElement('div');
      modal.id = 'share-card-modal';
      modal.className = 'growth-modal';
      modal.innerHTML = `
        <div class="modal-overlay" id="share-modal-overlay"></div>
        <div class="modal-sheet share-card-sheet">
          <div class="modal-handle"></div>
          <h3 class="modal-title">Your Performance Card</h3>

          <div class="performance-card-preview">
            <div class="card-header">
              <span class="card-logo">🤖 TONAI Agent</span>
            </div>
            <div class="card-body">
              <div class="card-agent-name">${esc(agentName)}</div>
              <div class="card-strategy">Strategy: ${esc(strategy)}</div>
              <div class="card-stats">
                <div class="card-stat">
                  <span class="card-stat-value positive">+${roi}%</span>
                  <span class="card-stat-label">ROI</span>
                </div>
                <div class="card-stat">
                  <span class="card-stat-value">${trades}</span>
                  <span class="card-stat-label">Trades</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              Launch your own AI agent: t.me/TONAIAgentBot
            </div>
          </div>

          <div class="share-card-actions">
            <button class="growth-btn primary" id="share-card-telegram">
              Share on Telegram
            </button>
            <button class="growth-btn secondary" id="share-card-copy">
              Copy Text
            </button>
          </div>

          <button class="close-modal-btn" id="close-share-modal">Close</button>
        </div>
      `;

      document.body.appendChild(modal);

      // Setup modal events
      el('share-modal-overlay')?.addEventListener('click', () => this.closeShareCardModal());
      el('close-share-modal')?.addEventListener('click', () => this.closeShareCardModal());

      el('share-card-telegram')?.addEventListener('click', () => {
        const cardText = `🤖 My AI Agent Performance\n\n` +
          `📊 Strategy: ${strategy}\n` +
          `📈 ROI: +${roi}%\n` +
          `📉 Trades: ${trades}\n\n` +
          `Launch your own AI agent:\nt.me/TONAIAgentBot`;

        const url = `https://t.me/share/url?text=${encodeURIComponent(cardText)}`;
        window.open(url, '_blank');
        TG.haptic.impact('light');
      });

      el('share-card-copy')?.addEventListener('click', () => {
        const cardText = `🤖 My AI Agent Performance\n\n` +
          `📊 Strategy: ${strategy}\n` +
          `📈 ROI: +${roi}%\n` +
          `📉 Trades: ${trades}\n\n` +
          `Launch your own AI agent:\nt.me/TONAIAgentBot`;

        navigator.clipboard.writeText(cardText).then(() => {
          TG.haptic.notify('success');
          this.showToast('Card text copied!');
        });
      });
    },

    closeShareCardModal() {
      const modal = el('share-card-modal');
      if (modal) {
        modal.classList.add('closing');
        setTimeout(() => modal.remove(), 200);
      }
    },

    showToast(message) {
      // Remove existing toast
      const existing = document.querySelector('.growth-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'growth-toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    },
  };

  // ============================================================================
  // Export
  // ============================================================================

  window.Growth = Growth;

  // Auto-initialize if Growth page exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (el('page-growth')) {
        Growth.init();
      }
    });
  } else {
    if (el('page-growth')) {
      Growth.init();
    }
  }
})();
