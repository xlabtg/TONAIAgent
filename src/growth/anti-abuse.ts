/**
 * TONAIAgent - Anti-Abuse System
 *
 * Implements anti-sybil detection, reward manipulation prevention,
 * fraud detection, rate limiting, and cooldown management.
 */

import {
  AbuseType,
  AbuseDetection,
  AbuseEvidence,
  AbuseAction,
  SybilDetection,
  SybilSignal,
  LinkedAccount,
  RateLimits,
  CooldownPeriod,
  AntiAbuseConfig,
  GrowthEvent,
  GrowthEventCallback,
} from './types';

// ============================================================================
// Anti-Abuse System Interface
// ============================================================================

export interface AntiAbuseSystem {
  // Sybil detection
  checkSybilRisk(userId: string): Promise<SybilDetection>;
  getLinkedAccounts(userId: string): Promise<LinkedAccount[]>;
  flagLinkedAccounts(userId: string, linkedUserId: string, linkType: LinkedAccount['linkType']): Promise<void>;

  // Abuse detection
  detectAbuse(userId: string, activity: ActivityData): Promise<AbuseDetection | null>;
  reportAbuse(userId: string, type: AbuseType, evidence: AbuseEvidence[]): Promise<AbuseDetection>;
  getAbuseHistory(userId: string): Promise<AbuseDetection[]>;
  resolveAbuse(detectionId: string, action: AbuseAction): Promise<AbuseDetection>;

  // Rate limiting
  checkRateLimit(userId: string, action: string): Promise<RateLimitResult>;
  incrementRateLimit(userId: string, action: string): Promise<void>;
  resetRateLimit(userId: string, action: string): Promise<void>;
  getRateLimitStatus(userId: string): Promise<RateLimitStatus>;

  // Cooldowns
  setCooldown(userId: string, type: string, duration: number, reason: string): Promise<CooldownPeriod>;
  getCooldown(userId: string, type: string): Promise<CooldownPeriod | null>;
  clearCooldown(userId: string, type: string): Promise<void>;
  getActiveCooldowns(userId: string): Promise<CooldownPeriod[]>;

  // Risk scoring
  calculateRiskScore(userId: string): Promise<RiskScore>;
  updateRiskFactors(userId: string, factors: RiskFactor[]): Promise<RiskScore>;

  // Actions
  applyPenalty(userId: string, penalty: PenaltyInput): Promise<AppliedPenalty>;
  revokePenalty(penaltyId: string, reason: string): Promise<void>;
  getUserPenalties(userId: string): Promise<AppliedPenalty[]>;

  // Events
  onEvent(callback: GrowthEventCallback): void;
}

// ============================================================================
// Types
// ============================================================================

export interface ActivityData {
  type: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  waitTime?: number; // in seconds
}

export interface RateLimitStatus {
  limits: Record<string, {
    used: number;
    limit: number;
    resetAt: Date;
  }>;
}

export interface RiskScore {
  userId: string;
  overallScore: number; // 0-100, higher = more risky
  factors: RiskFactor[];
  recommendation: 'allow' | 'monitor' | 'flag' | 'block';
  lastUpdated: Date;
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
  detected: boolean;
}

export interface PenaltyInput {
  type: AbuseAction['type'];
  reason: string;
  duration?: number; // in seconds, for temporary penalties
  metadata?: Record<string, unknown>;
}

export interface AppliedPenalty {
  id: string;
  userId: string;
  type: AbuseAction['type'];
  reason: string;
  appliedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;
  metadata: Record<string, unknown>;
}

export interface AntiAbuseSystemConfig {
  sybilDetectionEnabled: boolean;
  fraudScoreThreshold: number;
  autoBlockThreshold: number;
  rateLimits: RateLimits;
  cooldownPeriods: Record<string, number>;
  deviceFingerprintingEnabled: boolean;
  ipAnalysisEnabled: boolean;
}

// ============================================================================
// Default Anti-Abuse System Implementation
// ============================================================================

export class DefaultAntiAbuseSystem implements AntiAbuseSystem {
  private readonly abuseDetections: Map<string, AbuseDetection[]> = new Map();
  private readonly linkedAccounts: Map<string, LinkedAccount[]> = new Map();
  private readonly rateLimitCounters: Map<string, Map<string, { count: number; resetAt: Date }>> = new Map();
  private readonly cooldowns: Map<string, Map<string, CooldownPeriod>> = new Map();
  private readonly riskScores: Map<string, RiskScore> = new Map();
  private readonly penalties: Map<string, AppliedPenalty[]> = new Map();
  private readonly deviceFingerprints: Map<string, Set<string>> = new Map(); // fingerprint -> userIds
  private readonly ipAddresses: Map<string, Set<string>> = new Map(); // ip -> userIds
  private readonly eventCallbacks: GrowthEventCallback[] = [];
  readonly config: AntiAbuseSystemConfig;

  constructor(config?: Partial<AntiAbuseConfig>) {
    this.config = {
      sybilDetectionEnabled: config?.sybilDetectionEnabled ?? true,
      fraudScoreThreshold: config?.fraudScoreThreshold ?? 70,
      autoBlockThreshold: config?.autoBlockThreshold ?? 90,
      rateLimits: config?.rateLimits ?? {
        referralsPerDay: 10,
        rewardsClaimPerDay: 5,
        sharesPerHour: 20,
        signalsPerDay: 10,
      },
      cooldownPeriods: config?.cooldownPeriods ?? {
        referral: 3600, // 1 hour
        reward_claim: 300, // 5 minutes
        trade: 60, // 1 minute
      },
      deviceFingerprintingEnabled: true,
      ipAnalysisEnabled: true,
    };
  }

  // ============================================================================
  // Sybil Detection
  // ============================================================================

  async checkSybilRisk(userId: string): Promise<SybilDetection> {
    const signals: SybilSignal[] = [];
    const linkedAccounts = await this.getLinkedAccounts(userId);
    let riskScore = 0;

    // Check for shared IP addresses
    if (this.config.ipAnalysisEnabled) {
      const sharedIpAccounts = this.findAccountsBySharedAttribute(userId, 'ip');
      if (sharedIpAccounts.length > 0) {
        const signal: SybilSignal = {
          type: 'shared_ip',
          description: `Shares IP with ${sharedIpAccounts.length} other accounts`,
          weight: Math.min(30, sharedIpAccounts.length * 10),
          value: sharedIpAccounts.length,
        };
        signals.push(signal);
        riskScore += signal.weight;
      }
    }

    // Check for shared device fingerprints
    if (this.config.deviceFingerprintingEnabled) {
      const sharedDeviceAccounts = this.findAccountsBySharedAttribute(userId, 'device');
      if (sharedDeviceAccounts.length > 0) {
        const signal: SybilSignal = {
          type: 'shared_device',
          description: `Shares device fingerprint with ${sharedDeviceAccounts.length} other accounts`,
          weight: Math.min(40, sharedDeviceAccounts.length * 15),
          value: sharedDeviceAccounts.length,
        };
        signals.push(signal);
        riskScore += signal.weight;
      }
    }

    // Check for referral chain patterns
    const referralPattern = this.checkReferralPattern(userId);
    if (referralPattern.suspicious) {
      signals.push({
        type: 'referral_pattern',
        description: referralPattern.description,
        weight: referralPattern.weight,
        value: referralPattern.value,
      });
      riskScore += referralPattern.weight;
    }

    // Check for behavioral similarity
    const behaviorScore = this.checkBehavioralSimilarity(userId, linkedAccounts);
    if (behaviorScore > 0) {
      signals.push({
        type: 'behavioral_similarity',
        description: 'Similar activity patterns with linked accounts',
        weight: behaviorScore,
        value: behaviorScore,
      });
      riskScore += behaviorScore;
    }

    // Determine recommendation
    let recommendation: SybilDetection['recommendation'];
    if (riskScore >= this.config.autoBlockThreshold) {
      recommendation = 'block';
    } else if (riskScore >= this.config.fraudScoreThreshold) {
      recommendation = 'flag';
    } else {
      recommendation = 'allow';
    }

    return {
      userId,
      riskScore: Math.min(100, riskScore),
      signals,
      linkedAccounts,
      recommendation,
    };
  }

  async getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
    return this.linkedAccounts.get(userId) ?? [];
  }

  async flagLinkedAccounts(
    userId: string,
    linkedUserId: string,
    linkType: LinkedAccount['linkType']
  ): Promise<void> {
    // Add to user's linked accounts
    if (!this.linkedAccounts.has(userId)) {
      this.linkedAccounts.set(userId, []);
    }
    const userLinks = this.linkedAccounts.get(userId)!;

    // Check if already linked
    if (userLinks.some(l => l.userId === linkedUserId && l.linkType === linkType)) {
      return;
    }

    userLinks.push({
      userId: linkedUserId,
      linkType,
      confidence: 0.8,
      sharedData: [],
    });

    // Add reverse link
    if (!this.linkedAccounts.has(linkedUserId)) {
      this.linkedAccounts.set(linkedUserId, []);
    }
    this.linkedAccounts.get(linkedUserId)!.push({
      userId,
      linkType,
      confidence: 0.8,
      sharedData: [],
    });
  }

  // ============================================================================
  // Abuse Detection
  // ============================================================================

  async detectAbuse(userId: string, activity: ActivityData): Promise<AbuseDetection | null> {
    const evidence: AbuseEvidence[] = [];
    let detectedType: AbuseType | null = null;
    // Severity is calculated in reportAbuse based on type and confidence
    // Local tracking is for future enhancements

    // Track device and IP
    if (activity.deviceFingerprint) {
      if (!this.deviceFingerprints.has(activity.deviceFingerprint)) {
        this.deviceFingerprints.set(activity.deviceFingerprint, new Set());
      }
      this.deviceFingerprints.get(activity.deviceFingerprint)!.add(userId);
    }

    if (activity.ipAddress) {
      if (!this.ipAddresses.has(activity.ipAddress)) {
        this.ipAddresses.set(activity.ipAddress, new Set());
      }
      this.ipAddresses.get(activity.ipAddress)!.add(userId);
    }

    // Check for self-referral
    if (activity.type === 'referral') {
      const referrerId = activity.metadata.referrerId as string;
      if (referrerId) {
        const linkedAccounts = await this.getLinkedAccounts(userId);
        if (linkedAccounts.some(l => l.userId === referrerId)) {
          detectedType = 'self_referral';
          evidence.push({
            type: 'linked_account_referral',
            description: 'Referral from linked account detected',
            value: referrerId,
            weight: 0.9,
            timestamp: activity.timestamp,
          });
        }
      }
    }

    // Check for reward farming
    if (activity.type === 'reward_claim') {
      const recentClaims = this.getRecentActivity(userId, 'reward_claim', 24);
      if (recentClaims > this.config.rateLimits.rewardsClaimPerDay) {
        detectedType = 'reward_farming';
        evidence.push({
          type: 'excessive_claims',
          description: `${recentClaims} claims in 24 hours`,
          value: recentClaims,
          weight: 0.7,
          timestamp: activity.timestamp,
        });
      }
    }

    // Check for bot activity
    if (this.checkBotPatterns(userId, activity)) {
      detectedType = 'bot_activity';
      evidence.push({
        type: 'bot_pattern',
        description: 'Activity patterns consistent with automated behavior',
        value: 'automated',
        weight: 0.85,
        timestamp: activity.timestamp,
      });
    }

    if (detectedType) {
      return this.reportAbuse(userId, detectedType, evidence);
    }

    return null;
  }

  async reportAbuse(
    userId: string,
    type: AbuseType,
    evidence: AbuseEvidence[]
  ): Promise<AbuseDetection> {
    const now = new Date();
    const confidence = this.calculateConfidence(evidence);
    const severity = this.determineSeverity(type, confidence);

    const detection: AbuseDetection = {
      id: this.generateId('abuse'),
      userId,
      type,
      severity,
      confidence,
      evidence,
      status: 'detected',
      actions: [],
      detectedAt: now,
    };

    if (!this.abuseDetections.has(userId)) {
      this.abuseDetections.set(userId, []);
    }
    this.abuseDetections.get(userId)!.push(detection);

    // Auto-apply penalties for high severity
    if (severity === 'critical' || (severity === 'high' && confidence > 0.9)) {
      const action: AbuseAction = {
        type: 'reward_hold',
        reason: `Automatic hold due to ${type} detection`,
        executedAt: now,
        executedBy: 'system',
        reversible: true,
      };
      detection.actions.push(action);
    }

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'abuse_detected',
      severity: 'warning',
      source: 'anti_abuse_system',
      userId,
      message: `${type} detected for user ${userId}`,
      data: { detectionId: detection.id, type, severity, confidence },
    });

    return detection;
  }

  async getAbuseHistory(userId: string): Promise<AbuseDetection[]> {
    return this.abuseDetections.get(userId) ?? [];
  }

  async resolveAbuse(detectionId: string, action: AbuseAction): Promise<AbuseDetection> {
    // Find the detection
    for (const [userId, detections] of this.abuseDetections.entries()) {
      const detection = detections.find(d => d.id === detectionId);
      if (detection) {
        detection.actions.push(action);
        detection.status = action.type === 'account_ban' ? 'confirmed' : 'investigating';
        detection.resolvedAt = new Date();

        this.emitEvent({
          id: this.generateId('event'),
          timestamp: new Date(),
          type: 'abuse_confirmed',
          severity: 'info',
          source: 'anti_abuse_system',
          userId,
          message: `Abuse case resolved: ${action.type}`,
          data: { detectionId, action },
        });

        return detection;
      }
    }

    throw new Error(`Detection not found: ${detectionId}`);
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  async checkRateLimit(userId: string, action: string): Promise<RateLimitResult> {
    const limit = this.getLimit(action);
    const window = this.getWindow(action);
    const now = new Date();

    if (!this.rateLimitCounters.has(userId)) {
      this.rateLimitCounters.set(userId, new Map());
    }
    const userCounters = this.rateLimitCounters.get(userId)!;

    if (!userCounters.has(action)) {
      userCounters.set(action, { count: 0, resetAt: new Date(now.getTime() + window) });
    }

    const counter = userCounters.get(action)!;

    // Reset if window expired
    if (now >= counter.resetAt) {
      counter.count = 0;
      counter.resetAt = new Date(now.getTime() + window);
    }

    const remaining = Math.max(0, limit - counter.count);
    const allowed = remaining > 0;
    const waitTime = allowed ? 0 : Math.ceil((counter.resetAt.getTime() - now.getTime()) / 1000);

    return {
      allowed,
      remaining,
      resetAt: counter.resetAt,
      waitTime: waitTime > 0 ? waitTime : undefined,
    };
  }

  async incrementRateLimit(userId: string, action: string): Promise<void> {
    const result = await this.checkRateLimit(userId, action);
    if (!result.allowed) {
      throw new Error(`Rate limit exceeded for ${action}`);
    }

    const counter = this.rateLimitCounters.get(userId)!.get(action)!;
    counter.count++;
  }

  async resetRateLimit(userId: string, action: string): Promise<void> {
    const userCounters = this.rateLimitCounters.get(userId);
    if (userCounters) {
      userCounters.delete(action);
    }
  }

  async getRateLimitStatus(userId: string): Promise<RateLimitStatus> {
    const limits: RateLimitStatus['limits'] = {};
    const userCounters = this.rateLimitCounters.get(userId);

    for (const [action, limit] of Object.entries(this.config.rateLimits)) {
      const counter = userCounters?.get(action);
      limits[action] = {
        used: counter?.count ?? 0,
        limit: limit,
        resetAt: counter?.resetAt ?? new Date(),
      };
    }

    return { limits };
  }

  // ============================================================================
  // Cooldowns
  // ============================================================================

  async setCooldown(
    userId: string,
    type: string,
    duration: number,
    reason: string
  ): Promise<CooldownPeriod> {
    const now = new Date();
    const cooldown: CooldownPeriod = {
      type,
      duration,
      reason,
      startsAt: now,
      endsAt: new Date(now.getTime() + duration * 1000),
    };

    if (!this.cooldowns.has(userId)) {
      this.cooldowns.set(userId, new Map());
    }
    this.cooldowns.get(userId)!.set(type, cooldown);

    return cooldown;
  }

  async getCooldown(userId: string, type: string): Promise<CooldownPeriod | null> {
    const userCooldowns = this.cooldowns.get(userId);
    if (!userCooldowns) return null;

    const cooldown = userCooldowns.get(type);
    if (!cooldown) return null;

    // Check if expired
    if (new Date() >= cooldown.endsAt) {
      userCooldowns.delete(type);
      return null;
    }

    return cooldown;
  }

  async clearCooldown(userId: string, type: string): Promise<void> {
    const userCooldowns = this.cooldowns.get(userId);
    if (userCooldowns) {
      userCooldowns.delete(type);
    }
  }

  async getActiveCooldowns(userId: string): Promise<CooldownPeriod[]> {
    const userCooldowns = this.cooldowns.get(userId);
    if (!userCooldowns) return [];

    const now = new Date();
    const active: CooldownPeriod[] = [];

    for (const [type, cooldown] of userCooldowns.entries()) {
      if (now < cooldown.endsAt) {
        active.push(cooldown);
      } else {
        userCooldowns.delete(type);
      }
    }

    return active;
  }

  // ============================================================================
  // Risk Scoring
  // ============================================================================

  async calculateRiskScore(userId: string): Promise<RiskScore> {
    const now = new Date();
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Factor 1: Sybil risk
    const sybilDetection = await this.checkSybilRisk(userId);
    factors.push({
      name: 'sybil_risk',
      weight: 0.3,
      value: sybilDetection.riskScore,
      description: `Sybil detection score: ${sybilDetection.riskScore}`,
      detected: sybilDetection.riskScore > 50,
    });
    totalScore += sybilDetection.riskScore * 0.3;

    // Factor 2: Abuse history
    const abuseHistory = await this.getAbuseHistory(userId);
    const recentAbuse = abuseHistory.filter(
      a => a.detectedAt.getTime() > now.getTime() - 30 * 24 * 60 * 60 * 1000
    );
    const abuseScore = Math.min(100, recentAbuse.length * 20);
    factors.push({
      name: 'abuse_history',
      weight: 0.25,
      value: abuseScore,
      description: `${recentAbuse.length} abuse incidents in last 30 days`,
      detected: recentAbuse.length > 0,
    });
    totalScore += abuseScore * 0.25;

    // Factor 3: Account age
    // Newer accounts are higher risk
    const accountAgeScore = 50; // Would calculate from actual signup date
    factors.push({
      name: 'account_age',
      weight: 0.15,
      value: accountAgeScore,
      description: 'Account age factor',
      detected: accountAgeScore > 70,
    });
    totalScore += accountAgeScore * 0.15;

    // Factor 4: Activity patterns
    const activityScore = this.calculateActivityRisk(userId);
    factors.push({
      name: 'activity_patterns',
      weight: 0.15,
      value: activityScore,
      description: 'Suspicious activity pattern score',
      detected: activityScore > 50,
    });
    totalScore += activityScore * 0.15;

    // Factor 5: Linked accounts
    const linkedAccounts = await this.getLinkedAccounts(userId);
    const linkedScore = Math.min(100, linkedAccounts.length * 25);
    factors.push({
      name: 'linked_accounts',
      weight: 0.15,
      value: linkedScore,
      description: `${linkedAccounts.length} linked accounts detected`,
      detected: linkedAccounts.length > 0,
    });
    totalScore += linkedScore * 0.15;

    // Determine recommendation
    let recommendation: RiskScore['recommendation'];
    if (totalScore >= this.config.autoBlockThreshold) {
      recommendation = 'block';
    } else if (totalScore >= this.config.fraudScoreThreshold) {
      recommendation = 'flag';
    } else if (totalScore >= 40) {
      recommendation = 'monitor';
    } else {
      recommendation = 'allow';
    }

    const riskScore: RiskScore = {
      userId,
      overallScore: Math.round(totalScore),
      factors,
      recommendation,
      lastUpdated: now,
    };

    this.riskScores.set(userId, riskScore);
    return riskScore;
  }

  async updateRiskFactors(userId: string, newFactors: RiskFactor[]): Promise<RiskScore> {
    const existingScore = this.riskScores.get(userId);
    if (!existingScore) {
      return this.calculateRiskScore(userId);
    }

    // Merge factors
    for (const newFactor of newFactors) {
      const existingIndex = existingScore.factors.findIndex(f => f.name === newFactor.name);
      if (existingIndex >= 0) {
        existingScore.factors[existingIndex] = newFactor;
      } else {
        existingScore.factors.push(newFactor);
      }
    }

    // Recalculate overall score
    existingScore.overallScore = Math.round(
      existingScore.factors.reduce((sum, f) => sum + f.value * f.weight, 0)
    );
    existingScore.lastUpdated = new Date();

    this.riskScores.set(userId, existingScore);
    return existingScore;
  }

  // ============================================================================
  // Actions
  // ============================================================================

  async applyPenalty(userId: string, penalty: PenaltyInput): Promise<AppliedPenalty> {
    const now = new Date();
    const appliedPenalty: AppliedPenalty = {
      id: this.generateId('penalty'),
      userId,
      type: penalty.type,
      reason: penalty.reason,
      appliedAt: now,
      expiresAt: penalty.duration
        ? new Date(now.getTime() + penalty.duration * 1000)
        : undefined,
      metadata: penalty.metadata ?? {},
    };

    if (!this.penalties.has(userId)) {
      this.penalties.set(userId, []);
    }
    this.penalties.get(userId)!.push(appliedPenalty);

    // Apply associated cooldown if temporary
    if (penalty.duration) {
      await this.setCooldown(userId, `penalty_${penalty.type}`, penalty.duration, penalty.reason);
    }

    return appliedPenalty;
  }

  async revokePenalty(penaltyId: string, reason: string): Promise<void> {
    for (const [userId, userPenalties] of this.penalties.entries()) {
      const penalty = userPenalties.find(p => p.id === penaltyId);
      if (penalty) {
        penalty.revokedAt = new Date();
        penalty.revokedReason = reason;

        // Clear associated cooldown
        await this.clearCooldown(userId, `penalty_${penalty.type}`);
        return;
      }
    }

    throw new Error(`Penalty not found: ${penaltyId}`);
  }

  async getUserPenalties(userId: string): Promise<AppliedPenalty[]> {
    const penalties = this.penalties.get(userId) ?? [];
    const now = new Date();

    // Filter active penalties
    return penalties.filter(p => {
      if (p.revokedAt) return false;
      if (p.expiresAt && p.expiresAt < now) return false;
      return true;
    });
  }

  onEvent(callback: GrowthEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private findAccountsBySharedAttribute(userId: string, type: 'ip' | 'device'): string[] {
    const attributeMap = type === 'ip' ? this.ipAddresses : this.deviceFingerprints;
    const sharedAccounts: Set<string> = new Set();

    for (const [_, userIds] of attributeMap.entries()) {
      if (userIds.has(userId) && userIds.size > 1) {
        for (const id of userIds) {
          if (id !== userId) {
            sharedAccounts.add(id);
          }
        }
      }
    }

    return Array.from(sharedAccounts);
  }

  private checkReferralPattern(_userId: string): { suspicious: boolean; description: string; weight: number; value: number } {
    // Check for circular referral patterns
    // This would analyze the referral tree in production
    return {
      suspicious: false,
      description: 'No suspicious referral patterns detected',
      weight: 0,
      value: 0,
    };
  }

  private checkBehavioralSimilarity(_userId: string, linkedAccounts: LinkedAccount[]): number {
    // Would analyze activity timing, patterns, and behavior
    // Returns similarity score 0-30
    return linkedAccounts.length * 5;
  }

  private getRecentActivity(_userId: string, _type: string, _hours: number): number {
    // Would count recent activities from activity log
    return 0;
  }

  private checkBotPatterns(_userId: string, activity: ActivityData): boolean {
    // Simplified check for bot patterns
    // In production, would analyze:
    // - Rapid repeated actions
    // - Consistent timing patterns
    // - Missing user agent or suspicious UA
    if (!activity.userAgent || activity.userAgent.includes('bot')) {
      return true;
    }

    return false;
  }

  private calculateConfidence(evidence: AbuseEvidence[]): number {
    if (evidence.length === 0) return 0;
    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    return Math.min(1, totalWeight / evidence.length);
  }

  private determineSeverity(type: AbuseType, confidence: number): AbuseDetection['severity'] {
    const highSeverityTypes: AbuseType[] = ['sybil_attack', 'collusion', 'fake_volume'];
    const criticalTypes: AbuseType[] = ['collusion'];

    if (criticalTypes.includes(type) || confidence > 0.95) {
      return 'critical';
    }
    if (highSeverityTypes.includes(type) || confidence > 0.8) {
      return 'high';
    }
    if (confidence > 0.5) {
      return 'medium';
    }
    return 'low';
  }

  private calculateActivityRisk(_userId: string): number {
    // Would analyze actual activity patterns
    return 20; // Default low risk
  }

  private getLimit(action: string): number {
    const limits: Record<string, number> = {
      referral: this.config.rateLimits.referralsPerDay,
      reward_claim: this.config.rateLimits.rewardsClaimPerDay,
      share: this.config.rateLimits.sharesPerHour,
      signal: this.config.rateLimits.signalsPerDay,
    };
    return limits[action] ?? 100;
  }

  private getWindow(action: string): number {
    const windows: Record<string, number> = {
      referral: 24 * 60 * 60 * 1000, // 24 hours
      reward_claim: 24 * 60 * 60 * 1000,
      share: 60 * 60 * 1000, // 1 hour
      signal: 24 * 60 * 60 * 1000,
    };
    return windows[action] ?? 60 * 60 * 1000;
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

export function createAntiAbuseSystem(
  config?: Partial<AntiAbuseConfig>
): DefaultAntiAbuseSystem {
  return new DefaultAntiAbuseSystem(config);
}
