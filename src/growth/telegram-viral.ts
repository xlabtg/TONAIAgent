/**
 * TONAIAgent - Telegram Viral Growth Mechanics
 *
 * Implements Telegram-native viral loops including:
 * - Deep link referral system
 * - Shareable performance cards
 * - Group integration and bot sharing
 * - Mini App launch buttons
 * - Leaderboard sharing
 * - Agent challenges
 *
 * @see Issue #200 - Viral Growth Mechanics for Telegram
 */

import {
  GrowthEvent,
  GrowthEventCallback,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardPeriod,
  Challenge,
  ChallengeType,
} from './types';

// ============================================================================
// Telegram Viral Types
// ============================================================================

export interface TelegramReferralLink {
  userId: string;
  code: string;
  deepLink: string;
  shortLink: string;
  qrCodeUrl: string;
  stats: ReferralLinkStats;
  createdAt: Date;
}

export interface ReferralLinkStats {
  clicks: number;
  joins: number;
  conversions: number;
  conversionRate: number;
}

export interface AgentPerformanceCard {
  id: string;
  agentId: string;
  userId: string;
  agentName: string;
  strategyName: string;
  roi: number;
  profitPercent: number;
  trades: number;
  winRate: number;
  period: string;
  cardImageUrl?: string;
  shareLinks: ShareableLinks;
  createdAt: Date;
  expiresAt: Date;
}

export interface ShareableLinks {
  telegram: string;
  twitter: string;
  copyLink: string;
  embedCode: string;
}

export interface LeaderboardShareCard {
  id: string;
  userId: string;
  rank: number;
  totalParticipants: number;
  score: number;
  period: LeaderboardPeriod;
  category: string;
  shareLinks: ShareableLinks;
  createdAt: Date;
}

export interface GroupIntegration {
  groupId: string;
  groupName: string;
  botEnabled: boolean;
  settings: GroupBotSettings;
  stats: GroupStats;
  joinedAt: Date;
}

export interface GroupBotSettings {
  postPerformanceUpdates: boolean;
  postLeaderboards: boolean;
  postTradingSignals: boolean;
  postChallenges: boolean;
  updateFrequency: 'realtime' | 'hourly' | 'daily';
  allowAgentCreation: boolean;
}

export interface GroupStats {
  totalMembers: number;
  activeUsers: number;
  agentsCreated: number;
  messagesPosted: number;
}

export interface AgentChallenge {
  id: string;
  name: string;
  description: string;
  type: 'weekly_roi' | 'best_strategy' | 'most_consistent' | 'most_trades';
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'completed';
  participants: ChallengeParticipant[];
  rewards: ChallengeReward[];
  rules: string[];
}

export interface ChallengeParticipant {
  userId: string;
  agentId: string;
  agentName: string;
  score: number;
  rank: number;
  joinedAt: Date;
}

export interface ChallengeReward {
  rank: number;
  badge: string;
  title: string;
  bonusAgentSlots?: number;
  premiumDays?: number;
  xpBonus: number;
}

export interface TelegramViralConfig {
  botUsername: string;
  baseDeepLink: string;
  shortLinkDomain: string;
  cardExpirationHours: number;
  groupUpdateFrequency: 'realtime' | 'hourly' | 'daily';
  challengesEnabled: boolean;
  maxGroupsPerUser: number;
}

// ============================================================================
// Telegram Viral Engine Interface
// ============================================================================

export interface TelegramViralEngine {
  // Referral links
  generateReferralLink(userId: string): Promise<TelegramReferralLink>;
  getReferralLink(userId: string): Promise<TelegramReferralLink | null>;
  trackReferralClick(code: string): Promise<void>;
  trackReferralJoin(code: string, newUserId: string): Promise<void>;
  getReferralStats(userId: string): Promise<ReferralLinkStats>;

  // Performance cards
  createPerformanceCard(agentId: string, userId: string, period?: string): Promise<AgentPerformanceCard>;
  getPerformanceCard(cardId: string): Promise<AgentPerformanceCard | null>;
  sharePerformanceCard(cardId: string, platform: 'telegram' | 'twitter' | 'copy'): Promise<string>;
  generateCardImage(cardId: string): Promise<string>;

  // Leaderboard sharing
  createLeaderboardShareCard(userId: string, leaderboardType: string, period: LeaderboardPeriod): Promise<LeaderboardShareCard>;
  getLeaderboardShareCard(cardId: string): Promise<LeaderboardShareCard | null>;
  shareLeaderboardCard(cardId: string, platform: 'telegram' | 'twitter' | 'copy'): Promise<string>;

  // Group integration
  registerGroup(groupId: string, groupName: string, settings?: Partial<GroupBotSettings>): Promise<GroupIntegration>;
  getGroupIntegration(groupId: string): Promise<GroupIntegration | null>;
  updateGroupSettings(groupId: string, settings: Partial<GroupBotSettings>): Promise<GroupIntegration>;
  postToGroup(groupId: string, message: GroupMessage): Promise<void>;
  getGroupStats(groupId: string): Promise<GroupStats>;
  getUserGroups(userId: string): Promise<GroupIntegration[]>;

  // Agent challenges
  createChallenge(input: CreateAgentChallengeInput): Promise<AgentChallenge>;
  getChallenge(challengeId: string): Promise<AgentChallenge | null>;
  joinChallenge(challengeId: string, userId: string, agentId: string): Promise<ChallengeParticipant>;
  updateChallengeScores(challengeId: string): Promise<AgentChallenge>;
  listActiveChallenges(): Promise<AgentChallenge[]>;
  getChallengeLeaderboard(challengeId: string): Promise<ChallengeParticipant[]>;
  shareChallengeResult(challengeId: string, userId: string): Promise<ShareableLinks>;

  // Mini App buttons
  generateMiniAppButton(action: MiniAppAction): string;
  generateInlineKeyboard(buttons: InlineButton[][]): InlineKeyboard;

  // Events
  onEvent(callback: GrowthEventCallback): void;
}

export interface GroupMessage {
  type: 'performance_update' | 'leaderboard' | 'trading_signal' | 'challenge' | 'announcement';
  content: string;
  data?: Record<string, unknown>;
}

export interface CreateAgentChallengeInput {
  name: string;
  description: string;
  type: AgentChallenge['type'];
  startDate: Date;
  endDate: Date;
  rewards: ChallengeReward[];
  rules: string[];
}

export type MiniAppAction = 'create_agent' | 'view_dashboard' | 'invite_friends' | 'view_leaderboard' | 'join_challenge';

export interface InlineButton {
  text: string;
  url?: string;
  callbackData?: string;
  webApp?: { url: string };
}

export interface InlineKeyboard {
  inline_keyboard: InlineButton[][];
}

// ============================================================================
// Default Telegram Viral Engine Implementation
// ============================================================================

export class DefaultTelegramViralEngine implements TelegramViralEngine {
  private readonly referralLinks: Map<string, TelegramReferralLink> = new Map();
  private readonly performanceCards: Map<string, AgentPerformanceCard> = new Map();
  private readonly leaderboardCards: Map<string, LeaderboardShareCard> = new Map();
  private readonly groups: Map<string, GroupIntegration> = new Map();
  private readonly challenges: Map<string, AgentChallenge> = new Map();
  private readonly userGroups: Map<string, string[]> = new Map();
  private readonly eventCallbacks: GrowthEventCallback[] = [];
  readonly config: TelegramViralConfig;

  constructor(config?: Partial<TelegramViralConfig>) {
    this.config = {
      botUsername: config?.botUsername ?? 'TONAIAgentBot',
      baseDeepLink: config?.baseDeepLink ?? 'https://t.me/TONAIAgentBot',
      shortLinkDomain: config?.shortLinkDomain ?? 'tonai.link',
      cardExpirationHours: config?.cardExpirationHours ?? 168, // 7 days
      groupUpdateFrequency: config?.groupUpdateFrequency ?? 'daily',
      challengesEnabled: config?.challengesEnabled ?? true,
      maxGroupsPerUser: config?.maxGroupsPerUser ?? 10,
    };
  }

  // ============================================================================
  // Referral Links
  // ============================================================================

  async generateReferralLink(userId: string): Promise<TelegramReferralLink> {
    // Check if user already has a referral link
    const existing = this.referralLinks.get(userId);
    if (existing) {
      return existing;
    }

    const code = this.generateReferralCode(userId);
    const now = new Date();

    const link: TelegramReferralLink = {
      userId,
      code,
      deepLink: `${this.config.baseDeepLink}?start=ref_${code}`,
      shortLink: `https://${this.config.shortLinkDomain}/r/${code}`,
      qrCodeUrl: `${this.config.baseDeepLink}/api/qr/ref_${code}`,
      stats: {
        clicks: 0,
        joins: 0,
        conversions: 0,
        conversionRate: 0,
      },
      createdAt: now,
    };

    this.referralLinks.set(userId, link);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'referral_created',
      severity: 'info',
      source: 'telegram_viral_engine',
      userId,
      message: `Referral link created for user ${userId}`,
      data: { code, deepLink: link.deepLink },
    });

    return link;
  }

  async getReferralLink(userId: string): Promise<TelegramReferralLink | null> {
    return this.referralLinks.get(userId) ?? null;
  }

  async trackReferralClick(code: string): Promise<void> {
    // Find the link by code
    for (const link of this.referralLinks.values()) {
      if (link.code === code) {
        link.stats.clicks++;
        this.updateConversionRate(link.stats);
        return;
      }
    }
  }

  async trackReferralJoin(code: string, newUserId: string): Promise<void> {
    for (const link of this.referralLinks.values()) {
      if (link.code === code) {
        link.stats.joins++;
        this.updateConversionRate(link.stats);

        this.emitEvent({
          id: this.generateId('event'),
          timestamp: new Date(),
          type: 'referral_activated',
          severity: 'info',
          source: 'telegram_viral_engine',
          userId: link.userId,
          message: `New user ${newUserId} joined via referral`,
          data: { referrerId: link.userId, refereeId: newUserId, code },
        });

        return;
      }
    }
  }

  async getReferralStats(userId: string): Promise<ReferralLinkStats> {
    const link = this.referralLinks.get(userId);
    if (!link) {
      return { clicks: 0, joins: 0, conversions: 0, conversionRate: 0 };
    }
    return link.stats;
  }

  // ============================================================================
  // Performance Cards
  // ============================================================================

  async createPerformanceCard(
    agentId: string,
    userId: string,
    period: string = '7d'
  ): Promise<AgentPerformanceCard> {
    const cardId = this.generateId('card');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.cardExpirationHours * 60 * 60 * 1000);

    // Generate demo performance data (in production, this would fetch real data)
    const roi = parseFloat((Math.random() * 20 + 2).toFixed(1));
    const profitPercent = parseFloat((Math.random() * 15 + 1).toFixed(1));
    const trades = Math.floor(Math.random() * 50) + 10;
    const winRate = parseFloat((Math.random() * 30 + 55).toFixed(1));

    const card: AgentPerformanceCard = {
      id: cardId,
      agentId,
      userId,
      agentName: `Agent ${agentId.slice(-4)}`,
      strategyName: ['Momentum', 'Mean Reversion', 'Trend Following'][Math.floor(Math.random() * 3)],
      roi,
      profitPercent,
      trades,
      winRate,
      period,
      shareLinks: this.generateShareLinks(cardId, 'performance'),
      createdAt: now,
      expiresAt,
    };

    this.performanceCards.set(cardId, card);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'content_shared',
      severity: 'info',
      source: 'telegram_viral_engine',
      userId,
      message: `Performance card created for agent ${agentId}`,
      data: { cardId, agentId, roi },
    });

    return card;
  }

  async getPerformanceCard(cardId: string): Promise<AgentPerformanceCard | null> {
    const card = this.performanceCards.get(cardId);
    if (!card) return null;

    // Check expiration
    if (card.expiresAt < new Date()) {
      this.performanceCards.delete(cardId);
      return null;
    }

    return card;
  }

  async sharePerformanceCard(
    cardId: string,
    platform: 'telegram' | 'twitter' | 'copy'
  ): Promise<string> {
    const card = await this.getPerformanceCard(cardId);
    if (!card) {
      throw new Error(`Performance card not found: ${cardId}`);
    }

    switch (platform) {
      case 'telegram':
        return card.shareLinks.telegram;
      case 'twitter':
        return card.shareLinks.twitter;
      case 'copy':
        return card.shareLinks.copyLink;
      default:
        return card.shareLinks.copyLink;
    }
  }

  async generateCardImage(cardId: string): Promise<string> {
    // In production, this would generate an actual image
    return `${this.config.baseDeepLink}/api/cards/${cardId}/image.png`;
  }

  // ============================================================================
  // Leaderboard Sharing
  // ============================================================================

  async createLeaderboardShareCard(
    userId: string,
    _leaderboardType: string,
    period: LeaderboardPeriod
  ): Promise<LeaderboardShareCard> {
    const cardId = this.generateId('lb_card');
    const now = new Date();

    // Generate demo leaderboard position (in production, fetch real data)
    const rank = Math.floor(Math.random() * 100) + 1;
    const totalParticipants = Math.floor(Math.random() * 5000) + 1000;
    const score = Math.floor(Math.random() * 10000) + 1000;

    const card: LeaderboardShareCard = {
      id: cardId,
      userId,
      rank,
      totalParticipants,
      score,
      period,
      category: 'global',
      shareLinks: this.generateShareLinks(cardId, 'leaderboard'),
      createdAt: now,
    };

    this.leaderboardCards.set(cardId, card);
    return card;
  }

  async getLeaderboardShareCard(cardId: string): Promise<LeaderboardShareCard | null> {
    return this.leaderboardCards.get(cardId) ?? null;
  }

  async shareLeaderboardCard(
    cardId: string,
    platform: 'telegram' | 'twitter' | 'copy'
  ): Promise<string> {
    const card = await this.getLeaderboardShareCard(cardId);
    if (!card) {
      throw new Error(`Leaderboard card not found: ${cardId}`);
    }

    switch (platform) {
      case 'telegram':
        return card.shareLinks.telegram;
      case 'twitter':
        return card.shareLinks.twitter;
      case 'copy':
        return card.shareLinks.copyLink;
      default:
        return card.shareLinks.copyLink;
    }
  }

  // ============================================================================
  // Group Integration
  // ============================================================================

  async registerGroup(
    groupId: string,
    groupName: string,
    settings?: Partial<GroupBotSettings>
  ): Promise<GroupIntegration> {
    const now = new Date();

    const defaultSettings: GroupBotSettings = {
      postPerformanceUpdates: true,
      postLeaderboards: true,
      postTradingSignals: false,
      postChallenges: true,
      updateFrequency: this.config.groupUpdateFrequency,
      allowAgentCreation: true,
    };

    const integration: GroupIntegration = {
      groupId,
      groupName,
      botEnabled: true,
      settings: { ...defaultSettings, ...settings },
      stats: {
        totalMembers: 0,
        activeUsers: 0,
        agentsCreated: 0,
        messagesPosted: 0,
      },
      joinedAt: now,
    };

    this.groups.set(groupId, integration);
    return integration;
  }

  async getGroupIntegration(groupId: string): Promise<GroupIntegration | null> {
    return this.groups.get(groupId) ?? null;
  }

  async updateGroupSettings(
    groupId: string,
    settings: Partial<GroupBotSettings>
  ): Promise<GroupIntegration> {
    const integration = this.groups.get(groupId);
    if (!integration) {
      throw new Error(`Group not found: ${groupId}`);
    }

    integration.settings = { ...integration.settings, ...settings };
    this.groups.set(groupId, integration);
    return integration;
  }

  async postToGroup(groupId: string, message: GroupMessage): Promise<void> {
    const integration = this.groups.get(groupId);
    if (!integration) {
      throw new Error(`Group not found: ${groupId}`);
    }

    if (!integration.botEnabled) {
      throw new Error(`Bot is disabled in group: ${groupId}`);
    }

    // Check settings for message type
    const { settings } = integration;
    switch (message.type) {
      case 'performance_update':
        if (!settings.postPerformanceUpdates) return;
        break;
      case 'leaderboard':
        if (!settings.postLeaderboards) return;
        break;
      case 'trading_signal':
        if (!settings.postTradingSignals) return;
        break;
      case 'challenge':
        if (!settings.postChallenges) return;
        break;
    }

    // In production, this would send a message via Telegram Bot API
    integration.stats.messagesPosted++;
    this.groups.set(groupId, integration);
  }

  async getGroupStats(groupId: string): Promise<GroupStats> {
    const integration = this.groups.get(groupId);
    if (!integration) {
      return { totalMembers: 0, activeUsers: 0, agentsCreated: 0, messagesPosted: 0 };
    }
    return integration.stats;
  }

  async getUserGroups(userId: string): Promise<GroupIntegration[]> {
    const groupIds = this.userGroups.get(userId) ?? [];
    return groupIds
      .map(id => this.groups.get(id))
      .filter((g): g is GroupIntegration => g !== undefined);
  }

  // ============================================================================
  // Agent Challenges
  // ============================================================================

  async createChallenge(input: CreateAgentChallengeInput): Promise<AgentChallenge> {
    if (!this.config.challengesEnabled) {
      throw new Error('Challenges are disabled');
    }

    const challengeId = this.generateId('challenge');

    const challenge: AgentChallenge = {
      id: challengeId,
      name: input.name,
      description: input.description,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      status: new Date() < input.startDate ? 'upcoming' : 'active',
      participants: [],
      rewards: input.rewards,
      rules: input.rules,
    };

    this.challenges.set(challengeId, challenge);
    return challenge;
  }

  async getChallenge(challengeId: string): Promise<AgentChallenge | null> {
    return this.challenges.get(challengeId) ?? null;
  }

  async joinChallenge(
    challengeId: string,
    userId: string,
    agentId: string
  ): Promise<ChallengeParticipant> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    if (challenge.status !== 'active' && challenge.status !== 'upcoming') {
      throw new Error(`Challenge is not active: ${challengeId}`);
    }

    // Check if already participating
    if (challenge.participants.some(p => p.userId === userId)) {
      throw new Error(`Already participating in challenge: ${challengeId}`);
    }

    const participant: ChallengeParticipant = {
      userId,
      agentId,
      agentName: `Agent ${agentId.slice(-4)}`,
      score: 0,
      rank: challenge.participants.length + 1,
      joinedAt: new Date(),
    };

    challenge.participants.push(participant);
    this.challenges.set(challengeId, challenge);

    return participant;
  }

  async updateChallengeScores(challengeId: string): Promise<AgentChallenge> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    // Update scores based on challenge type (demo implementation)
    for (const participant of challenge.participants) {
      switch (challenge.type) {
        case 'weekly_roi':
          participant.score = parseFloat((Math.random() * 20 - 5).toFixed(2));
          break;
        case 'best_strategy':
          participant.score = parseFloat((Math.random() * 100).toFixed(2));
          break;
        case 'most_consistent':
          participant.score = parseFloat((Math.random() * 50 + 50).toFixed(2));
          break;
        case 'most_trades':
          participant.score = Math.floor(Math.random() * 100);
          break;
      }
    }

    // Sort and update ranks
    challenge.participants.sort((a, b) => b.score - a.score);
    challenge.participants.forEach((p, i) => {
      p.rank = i + 1;
    });

    this.challenges.set(challengeId, challenge);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'leaderboard_updated',
      severity: 'info',
      source: 'telegram_viral_engine',
      message: `Challenge scores updated: ${challenge.name}`,
      data: { challengeId, participants: challenge.participants.length },
    });

    return challenge;
  }

  async listActiveChallenges(): Promise<AgentChallenge[]> {
    const now = new Date();
    return Array.from(this.challenges.values()).filter(c => {
      if (c.status === 'active') return true;
      if (c.status === 'upcoming' && c.startDate <= now) {
        c.status = 'active';
        return true;
      }
      if (c.status === 'active' && c.endDate < now) {
        c.status = 'completed';
        return false;
      }
      return false;
    });
  }

  async getChallengeLeaderboard(challengeId: string): Promise<ChallengeParticipant[]> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return [];
    }
    return [...challenge.participants].sort((a, b) => a.rank - b.rank);
  }

  async shareChallengeResult(challengeId: string, userId: string): Promise<ShareableLinks> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    const participant = challenge.participants.find(p => p.userId === userId);
    if (!participant) {
      throw new Error(`User not participating in challenge: ${challengeId}`);
    }

    const shareId = `challenge_${challengeId}_${userId}`;
    return this.generateShareLinks(shareId, 'challenge');
  }

  // ============================================================================
  // Mini App Buttons
  // ============================================================================

  generateMiniAppButton(action: MiniAppAction): string {
    const buttonTexts: Record<MiniAppAction, string> = {
      create_agent: 'Create AI Agent',
      view_dashboard: 'Open Dashboard',
      invite_friends: 'Invite Friends',
      view_leaderboard: 'View Leaderboard',
      join_challenge: 'Join Challenge',
    };

    return buttonTexts[action] ?? 'Open App';
  }

  generateInlineKeyboard(buttons: InlineButton[][]): InlineKeyboard {
    return { inline_keyboard: buttons };
  }

  onEvent(callback: GrowthEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateReferralCode(userId: string): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  private updateConversionRate(stats: ReferralLinkStats): void {
    stats.conversionRate = stats.clicks > 0
      ? (stats.joins / stats.clicks) * 100
      : 0;
  }

  private generateShareLinks(contentId: string, type: string): ShareableLinks {
    const baseUrl = `${this.config.baseDeepLink}/share/${type}/${contentId}`;
    const text = this.getShareText(type);

    return {
      telegram: `https://t.me/share/url?url=${encodeURIComponent(baseUrl)}&text=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(baseUrl)}&text=${encodeURIComponent(text)}`,
      copyLink: baseUrl,
      embedCode: `<iframe src="${baseUrl}/embed" width="400" height="300" frameborder="0"></iframe>`,
    };
  }

  private getShareText(type: string): string {
    switch (type) {
      case 'performance':
        return 'Check out my AI trading agent performance! Launch your own: t.me/TONAIAgentBot';
      case 'leaderboard':
        return 'Check my ranking on the TON AI Agent leaderboard! Join: t.me/TONAIAgentBot';
      case 'challenge':
        return 'I just completed an AI agent challenge! Try it yourself: t.me/TONAIAgentBot';
      default:
        return 'Launch your own AI trading agent: t.me/TONAIAgentBot';
    }
  }

  private emitEvent(event: GrowthEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTelegramViralEngine(
  config?: Partial<TelegramViralConfig>
): DefaultTelegramViralEngine {
  return new DefaultTelegramViralEngine(config);
}

// ============================================================================
// Performance Card Text Generator
// ============================================================================

export function generatePerformanceCardText(card: AgentPerformanceCard): string {
  const roiSign = card.roi >= 0 ? '+' : '';
  const profitSign = card.profitPercent >= 0 ? '+' : '';

  return `
🤖 My AI Agent Performance

📊 Strategy: ${card.strategyName}
📈 ROI: ${roiSign}${card.roi.toFixed(1)}%
💰 Profit: ${profitSign}${card.profitPercent.toFixed(1)}%
📉 Trades: ${card.trades}
🎯 Win Rate: ${card.winRate.toFixed(1)}%

Launch your own AI agent:
t.me/TONAIAgentBot
  `.trim();
}

// ============================================================================
// Group Message Generators
// ============================================================================

export function generateGroupPerformanceMessage(
  agentName: string,
  action: string,
  asset: string,
  position: string
): string {
  return `
🤖 TONAI Agent Update

${agentName} executed trade
Asset: ${asset}
Position: ${position}
Action: ${action}

Launch your own agent:
t.me/TONAIAgentBot
  `.trim();
}

export function generateGroupLeaderboardMessage(
  entries: LeaderboardEntry[],
  period: string
): string {
  const top5 = entries.slice(0, 5);
  const leaderboardText = top5
    .map((e, i) => `${i + 1}. ${e.displayName} - ${e.score} pts`)
    .join('\n');

  return `
🏆 ${period} Leaderboard

${leaderboardText}

Join the competition:
t.me/TONAIAgentBot
  `.trim();
}

export function generateChallengeAnnouncementMessage(challenge: AgentChallenge): string {
  const rewardText = challenge.rewards
    .slice(0, 3)
    .map(r => `${r.rank}. ${r.title}`)
    .join('\n');

  return `
🎮 New Challenge: ${challenge.name}

${challenge.description}

Rewards:
${rewardText}

Join now:
t.me/TONAIAgentBot
  `.trim();
}
