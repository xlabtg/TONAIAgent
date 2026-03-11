/**
 * TONAIAgent - User Feedback & Reputation System
 *
 * Collects and aggregates user ratings, reviews, and votes for strategies.
 * Verified reviews (from users who have actually deployed and used a strategy)
 * carry higher weight in the reputation model.
 *
 * Reputation model:
 *   Reputation Score = User Rating + Active Investors + Strategy Age
 */

import {
  UserFeedback,
  FeedbackSummary,
  FeedbackVote,
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// User Feedback Manager Interface
// ============================================================================

export interface SubmitFeedbackInput {
  strategyId: string;
  userId: string;
  rating: number; // 1-5
  title: string;
  content: string;
  capitalAllocated?: number;
  holdingDays?: number;
  verified?: boolean; // If the platform has verified the user deployed the strategy
}

export interface UpdateFeedbackInput {
  rating?: number;
  title?: string;
  content?: string;
}

export interface UserFeedbackManager {
  // Feedback CRUD
  submitFeedback(input: SubmitFeedbackInput): Promise<UserFeedback>;
  updateFeedback(feedbackId: string, userId: string, updates: UpdateFeedbackInput): Promise<UserFeedback>;
  deleteFeedback(feedbackId: string, userId: string): Promise<void>;
  getFeedback(feedbackId: string): Promise<UserFeedback | null>;

  // Strategy feedback
  getStrategyFeedback(strategyId: string, limit?: number, offset?: number): Promise<UserFeedback[]>;
  getFeedbackSummary(strategyId: string): Promise<FeedbackSummary>;

  // Voting
  voteFeedback(feedbackId: string, userId: string, helpful: boolean): Promise<void>;
  removeVote(feedbackId: string, userId: string): Promise<void>;

  // Moderation
  markVerified(feedbackId: string): Promise<void>;
  flagFeedback(feedbackId: string, reason: string): Promise<void>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Default User Feedback Manager Implementation
// ============================================================================

export interface UserFeedbackManagerConfig {
  minRating: number;
  maxRating: number;
  minContentLength: number;
  maxContentLength: number;
  minTitleLength: number;
  maxTitleLength: number;
  allowOneReviewPerUser: boolean; // Prevent duplicate reviews per strategy
  verifiedReviewWeightMultiplier: number; // Multiplier for verified review rating weight
}

export class DefaultUserFeedbackManager implements UserFeedbackManager {
  private readonly feedbacks: Map<string, UserFeedback> = new Map();
  private readonly votes: Map<string, FeedbackVote[]> = new Map();
  private readonly flagged: Set<string> = new Set();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: UserFeedbackManagerConfig;

  constructor(config?: Partial<UserFeedbackManagerConfig>) {
    this.config = {
      minRating: config?.minRating ?? 1,
      maxRating: config?.maxRating ?? 5,
      minContentLength: config?.minContentLength ?? 10,
      maxContentLength: config?.maxContentLength ?? 2000,
      minTitleLength: config?.minTitleLength ?? 3,
      maxTitleLength: config?.maxTitleLength ?? 100,
      allowOneReviewPerUser: config?.allowOneReviewPerUser ?? true,
      verifiedReviewWeightMultiplier: config?.verifiedReviewWeightMultiplier ?? 1.5,
    };
  }

  async submitFeedback(input: SubmitFeedbackInput): Promise<UserFeedback> {
    this.validateFeedbackInput(input);

    if (this.config.allowOneReviewPerUser) {
      const existing = this.getUserFeedbackForStrategy(input.userId, input.strategyId);
      if (existing) {
        throw new Error(`User ${input.userId} has already submitted feedback for strategy ${input.strategyId}`);
      }
    }

    const feedback: UserFeedback = {
      id: this.generateId('feedback'),
      strategyId: input.strategyId,
      userId: input.userId,
      rating: input.rating,
      title: input.title.trim(),
      content: input.content.trim(),
      capitalAllocated: input.capitalAllocated,
      holdingDays: input.holdingDays,
      verified: input.verified ?? false,
      helpfulVotes: 0,
      unhelpfulVotes: 0,
      createdAt: new Date(),
    };

    this.feedbacks.set(feedback.id, feedback);
    this.votes.set(feedback.id, []);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'feedback_submitted',
      severity: 'info',
      source: 'user_feedback_manager',
      message: `User ${input.userId} submitted ${input.rating}-star review for strategy ${input.strategyId}`,
      data: {
        feedbackId: feedback.id,
        strategyId: input.strategyId,
        userId: input.userId,
        rating: input.rating,
        verified: feedback.verified,
      },
    });

    return feedback;
  }

  async updateFeedback(
    feedbackId: string,
    userId: string,
    updates: UpdateFeedbackInput,
  ): Promise<UserFeedback> {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }
    if (feedback.userId !== userId) {
      throw new Error(`User ${userId} is not authorized to update feedback ${feedbackId}`);
    }

    if (updates.rating !== undefined) {
      if (updates.rating < this.config.minRating || updates.rating > this.config.maxRating) {
        throw new Error(`Rating must be between ${this.config.minRating} and ${this.config.maxRating}`);
      }
    }

    if (updates.title !== undefined && (
      updates.title.trim().length < this.config.minTitleLength ||
      updates.title.trim().length > this.config.maxTitleLength
    )) {
      throw new Error(`Title must be between ${this.config.minTitleLength} and ${this.config.maxTitleLength} characters`);
    }

    if (updates.content !== undefined && (
      updates.content.trim().length < this.config.minContentLength ||
      updates.content.trim().length > this.config.maxContentLength
    )) {
      throw new Error(`Content must be between ${this.config.minContentLength} and ${this.config.maxContentLength} characters`);
    }

    const updated: UserFeedback = {
      ...feedback,
      rating: updates.rating ?? feedback.rating,
      title: updates.title?.trim() ?? feedback.title,
      content: updates.content?.trim() ?? feedback.content,
      updatedAt: new Date(),
    };

    this.feedbacks.set(feedbackId, updated);
    return updated;
  }

  async deleteFeedback(feedbackId: string, userId: string): Promise<void> {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }
    if (feedback.userId !== userId) {
      throw new Error(`User ${userId} is not authorized to delete feedback ${feedbackId}`);
    }

    this.feedbacks.delete(feedbackId);
    this.votes.delete(feedbackId);
    this.flagged.delete(feedbackId);
  }

  async getFeedback(feedbackId: string): Promise<UserFeedback | null> {
    return this.feedbacks.get(feedbackId) ?? null;
  }

  async getStrategyFeedback(
    strategyId: string,
    limit = 20,
    offset = 0,
  ): Promise<UserFeedback[]> {
    const all = Array.from(this.feedbacks.values())
      .filter(f => f.strategyId === strategyId && !this.flagged.has(f.id))
      .sort((a, b) => {
        // Sort: verified first, then by helpful votes, then by date
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        if (b.helpfulVotes !== a.helpfulVotes) return b.helpfulVotes - a.helpfulVotes;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

    return all.slice(offset, offset + limit);
  }

  async getFeedbackSummary(strategyId: string): Promise<FeedbackSummary> {
    const feedbacks = Array.from(this.feedbacks.values()).filter(
      f => f.strategyId === strategyId && !this.flagged.has(f.id),
    );

    if (feedbacks.length === 0) {
      return {
        strategyId,
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedReviewCount: 0,
        recentTrend: 'stable',
        updatedAt: new Date(),
      };
    }

    // Calculate weighted average (verified reviews count more)
    const multiplier = this.config.verifiedReviewWeightMultiplier;
    let totalWeight = 0;
    let weightedSum = 0;

    const ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const f of feedbacks) {
      const weight = f.verified ? multiplier : 1;
      weightedSum += f.rating * weight;
      totalWeight += weight;
      const r = Math.round(f.rating) as 1 | 2 | 3 | 4 | 5;
      if (r >= 1 && r <= 5) ratingDistribution[r]++;
    }

    const averageRating = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const verifiedReviewCount = feedbacks.filter(f => f.verified).length;

    // Trend: compare last 5 vs previous 5 reviews
    const recentTrend = this.calcRecentTrend(feedbacks);

    return {
      strategyId,
      totalReviews: feedbacks.length,
      averageRating: Math.round(averageRating * 100) / 100,
      ratingDistribution,
      verifiedReviewCount,
      recentTrend,
      updatedAt: new Date(),
    };
  }

  async voteFeedback(feedbackId: string, userId: string, helpful: boolean): Promise<void> {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }

    // Remove existing vote if any
    const feedbackVotes = this.votes.get(feedbackId) ?? [];
    const existingIdx = feedbackVotes.findIndex(v => v.userId === userId);

    if (existingIdx >= 0) {
      const oldVote = feedbackVotes[existingIdx];
      // Reverse old vote
      if (oldVote.helpful) {
        feedback.helpfulVotes = Math.max(0, feedback.helpfulVotes - 1);
      } else {
        feedback.unhelpfulVotes = Math.max(0, feedback.unhelpfulVotes - 1);
      }
      feedbackVotes.splice(existingIdx, 1);
    }

    // Add new vote
    feedbackVotes.push({ feedbackId, userId, helpful, createdAt: new Date() });
    this.votes.set(feedbackId, feedbackVotes);

    if (helpful) {
      feedback.helpfulVotes++;
    } else {
      feedback.unhelpfulVotes++;
    }
    this.feedbacks.set(feedbackId, feedback);
  }

  async removeVote(feedbackId: string, userId: string): Promise<void> {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }

    const feedbackVotes = this.votes.get(feedbackId) ?? [];
    const idx = feedbackVotes.findIndex(v => v.userId === userId);
    if (idx < 0) return;

    const vote = feedbackVotes[idx];
    if (vote.helpful) {
      feedback.helpfulVotes = Math.max(0, feedback.helpfulVotes - 1);
    } else {
      feedback.unhelpfulVotes = Math.max(0, feedback.unhelpfulVotes - 1);
    }

    feedbackVotes.splice(idx, 1);
    this.votes.set(feedbackId, feedbackVotes);
    this.feedbacks.set(feedbackId, feedback);
  }

  async markVerified(feedbackId: string): Promise<void> {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }
    this.feedbacks.set(feedbackId, { ...feedback, verified: true });
  }

  async flagFeedback(feedbackId: string, _reason: string): Promise<void> {
    if (!this.feedbacks.has(feedbackId)) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }
    this.flagged.add(feedbackId);
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getUserFeedbackForStrategy(userId: string, strategyId: string): UserFeedback | undefined {
    return Array.from(this.feedbacks.values()).find(
      f => f.userId === userId && f.strategyId === strategyId,
    );
  }

  private calcRecentTrend(feedbacks: UserFeedback[]): FeedbackSummary['recentTrend'] {
    if (feedbacks.length < 4) return 'stable';

    const sorted = [...feedbacks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const recent = sorted.slice(0, Math.floor(sorted.length / 2));
    const older = sorted.slice(Math.floor(sorted.length / 2));

    const recentAvg = recent.reduce((s, f) => s + f.rating, 0) / recent.length;
    const olderAvg = older.reduce((s, f) => s + f.rating, 0) / older.length;

    if (recentAvg - olderAvg > 0.3) return 'improving';
    if (olderAvg - recentAvg > 0.3) return 'declining';
    return 'stable';
  }

  private validateFeedbackInput(input: SubmitFeedbackInput): void {
    if (input.rating < this.config.minRating || input.rating > this.config.maxRating) {
      throw new Error(`Rating must be between ${this.config.minRating} and ${this.config.maxRating}`);
    }
    if (
      input.title.trim().length < this.config.minTitleLength ||
      input.title.trim().length > this.config.maxTitleLength
    ) {
      throw new Error(`Title must be between ${this.config.minTitleLength} and ${this.config.maxTitleLength} characters`);
    }
    if (
      input.content.trim().length < this.config.minContentLength ||
      input.content.trim().length > this.config.maxContentLength
    ) {
      throw new Error(`Content must be between ${this.config.minContentLength} and ${this.config.maxContentLength} characters`);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(event: MarketplaceEvent): void {
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

export function createUserFeedbackManager(
  config?: Partial<UserFeedbackManagerConfig>,
): DefaultUserFeedbackManager {
  return new DefaultUserFeedbackManager(config);
}
