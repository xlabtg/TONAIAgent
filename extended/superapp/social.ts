/**
 * TONAIAgent - Social Layer Module
 *
 * Community features including profiles, reputation, leaderboards,
 * strategy sharing, and social trading discussions.
 *
 * Features:
 * - User profiles with reputation
 * - Social feed and activity streams
 * - Discussions and comments
 * - Leaderboards and rankings
 * - Strategy reviews and ratings
 * - Following and followers
 */

import type {
  UserProfile,
  UserBadge,
  UserSocialLinks,
  PrivacySettings,
  SocialFeed,
  FeedItem,
  FeedItemType,
  FeedItemContent,
  Discussion,
  Comment,
  Leaderboard,
  LeaderboardType,
  LeaderboardPeriod,
  LeaderboardEntry,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface SocialConfig {
  profilesEnabled: boolean;
  feedEnabled: boolean;
  discussionsEnabled: boolean;
  leaderboardsEnabled: boolean;
  maxFollowersPerUser: number;
  maxFeedItems: number;
  maxCommentsPerDiscussion: number;
  contentModerationEnabled: boolean;
  leaderboardUpdateIntervalMs: number;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateProfileInput {
  userId: string;
  telegramId: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  socialLinks?: Partial<UserSocialLinks>;
  privacySettings?: Partial<PrivacySettings>;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatar?: string;
  bio?: string;
  socialLinks?: Partial<UserSocialLinks>;
  privacySettings?: Partial<PrivacySettings>;
}

export interface CreateFeedItemInput {
  userId: string;
  type: FeedItemType;
  content: FeedItemContent;
}

export interface CreateDiscussionInput {
  userId: string;
  strategyId?: string;
  agentId?: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface CreateCommentInput {
  discussionId: string;
  userId: string;
  parentId?: string;
  content: string;
}

// ============================================================================
// Social Manager Interface
// ============================================================================

export interface SocialManager {
  // Profiles
  createProfile(input: CreateProfileInput): Promise<UserProfile>;
  getProfile(userId: string): Promise<UserProfile | null>;
  getProfileByUsername(username: string): Promise<UserProfile | null>;
  updateProfile(userId: string, updates: UpdateProfileInput): Promise<UserProfile>;
  deleteProfile(userId: string): Promise<void>;

  // Following
  follow(followerId: string, followeeId: string): Promise<void>;
  unfollow(followerId: string, followeeId: string): Promise<void>;
  getFollowers(userId: string, limit?: number, offset?: number): Promise<UserProfile[]>;
  getFollowing(userId: string, limit?: number, offset?: number): Promise<UserProfile[]>;
  isFollowing(followerId: string, followeeId: string): Promise<boolean>;

  // Feed
  getFeed(userId: string, cursor?: string, limit?: number): Promise<SocialFeed>;
  getGlobalFeed(cursor?: string, limit?: number): Promise<SocialFeed>;
  createFeedItem(input: CreateFeedItemInput): Promise<FeedItem>;
  likeFeedItem(userId: string, itemId: string): Promise<void>;
  unlikeFeedItem(userId: string, itemId: string): Promise<void>;
  shareFeedItem(userId: string, itemId: string): Promise<void>;

  // Discussions
  createDiscussion(input: CreateDiscussionInput): Promise<Discussion>;
  getDiscussion(discussionId: string): Promise<Discussion | null>;
  getDiscussions(filter?: DiscussionFilter): Promise<Discussion[]>;
  updateDiscussion(discussionId: string, updates: Partial<Discussion>): Promise<Discussion>;
  deleteDiscussion(discussionId: string): Promise<void>;
  upvoteDiscussion(userId: string, discussionId: string): Promise<void>;
  downvoteDiscussion(userId: string, discussionId: string): Promise<void>;

  // Comments
  createComment(input: CreateCommentInput): Promise<Comment>;
  getComments(discussionId: string, limit?: number, offset?: number): Promise<Comment[]>;
  updateComment(commentId: string, content: string): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;
  upvoteComment(userId: string, commentId: string): Promise<void>;
  downvoteComment(userId: string, commentId: string): Promise<void>;

  // Leaderboards
  getLeaderboard(type: LeaderboardType, period: LeaderboardPeriod): Promise<Leaderboard>;
  getUserRank(userId: string, type: LeaderboardType, period: LeaderboardPeriod): Promise<number | null>;

  // Badges
  awardBadge(userId: string, badge: Omit<UserBadge, 'earnedAt'>): Promise<UserBadge>;
  getBadges(userId: string): Promise<UserBadge[]>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

export interface DiscussionFilter {
  strategyId?: string;
  agentId?: string;
  authorId?: string;
  tags?: string[];
  pinned?: boolean;
  sortBy?: 'newest' | 'popular' | 'controversial';
  limit?: number;
  offset?: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultSocialManager implements SocialManager {
  private readonly config: SocialConfig;
  private readonly profiles = new Map<string, UserProfile>();
  private readonly profilesByUsername = new Map<string, string>();
  private readonly followers = new Map<string, Set<string>>();
  private readonly following = new Map<string, Set<string>>();
  private readonly feedItems = new Map<string, FeedItem>();
  private readonly userFeedItems = new Map<string, string[]>();
  private readonly discussions = new Map<string, Discussion>();
  private readonly comments = new Map<string, Comment>();
  private readonly discussionComments = new Map<string, string[]>();
  private readonly likes = new Map<string, Set<string>>();
  private readonly votes = new Map<string, Map<string, 'up' | 'down'>>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<SocialConfig> = {}) {
    this.config = {
      profilesEnabled: config.profilesEnabled ?? true,
      feedEnabled: config.feedEnabled ?? true,
      discussionsEnabled: config.discussionsEnabled ?? true,
      leaderboardsEnabled: config.leaderboardsEnabled ?? true,
      maxFollowersPerUser: config.maxFollowersPerUser ?? 100000,
      maxFeedItems: config.maxFeedItems ?? 1000,
      maxCommentsPerDiscussion: config.maxCommentsPerDiscussion ?? 500,
      contentModerationEnabled: config.contentModerationEnabled ?? true,
      leaderboardUpdateIntervalMs: config.leaderboardUpdateIntervalMs ?? 3600000,
    };
  }

  // ============================================================================
  // Profiles
  // ============================================================================

  async createProfile(input: CreateProfileInput): Promise<UserProfile> {
    if (this.profiles.has(input.userId)) {
      throw new Error('Profile already exists for this user');
    }

    if (this.profilesByUsername.has(input.username.toLowerCase())) {
      throw new Error('Username already taken');
    }

    const profile: UserProfile = {
      id: input.userId,
      telegramId: input.telegramId,
      username: input.username,
      displayName: input.displayName,
      avatar: input.avatar,
      bio: input.bio,
      verified: false,
      badges: [],
      stats: {
        totalPnl: 0,
        totalTrades: 0,
        winRate: 0,
        followers: 0,
        following: 0,
        agentsDeployed: 0,
        strategiesPublished: 0,
        reputation: 0,
      },
      socialLinks: {
        twitter: input.socialLinks?.twitter,
        telegram: input.socialLinks?.telegram,
        discord: input.socialLinks?.discord,
        website: input.socialLinks?.website,
      },
      privacySettings: {
        profilePublic: input.privacySettings?.profilePublic ?? true,
        showPnl: input.privacySettings?.showPnl ?? true,
        showHoldings: input.privacySettings?.showHoldings ?? false,
        showActivity: input.privacySettings?.showActivity ?? true,
        allowMessages: input.privacySettings?.allowMessages ?? true,
        allowFollows: input.privacySettings?.allowFollows ?? true,
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.profiles.set(input.userId, profile);
    this.profilesByUsername.set(input.username.toLowerCase(), input.userId);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'profile_updated',
      severity: 'info',
      source: 'social',
      userId: input.userId,
      message: 'Profile created',
      data: { username: input.username },
    });

    return profile;
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    const userId = this.profilesByUsername.get(username.toLowerCase());
    if (!userId) return null;
    return this.profiles.get(userId) ?? null;
  }

  async updateProfile(userId: string, updates: UpdateProfileInput): Promise<UserProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    if (updates.displayName !== undefined) profile.displayName = updates.displayName;
    if (updates.avatar !== undefined) profile.avatar = updates.avatar;
    if (updates.bio !== undefined) profile.bio = updates.bio;
    if (updates.socialLinks) {
      profile.socialLinks = { ...profile.socialLinks, ...updates.socialLinks };
    }
    if (updates.privacySettings) {
      profile.privacySettings = { ...profile.privacySettings, ...updates.privacySettings };
    }

    profile.lastActiveAt = new Date();
    this.profiles.set(userId, profile);

    return profile;
  }

  async deleteProfile(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    this.profilesByUsername.delete(profile.username.toLowerCase());
    this.profiles.delete(userId);
    this.followers.delete(userId);
    this.following.delete(userId);

    // Clean up references in other users
    for (const [, followerSet] of this.followers) {
      followerSet.delete(userId);
    }
    for (const [, followingSet] of this.following) {
      followingSet.delete(userId);
    }
  }

  // ============================================================================
  // Following
  // ============================================================================

  async follow(followerId: string, followeeId: string): Promise<void> {
    if (followerId === followeeId) {
      throw new Error('Cannot follow yourself');
    }

    const followerProfile = this.profiles.get(followerId);
    const followeeProfile = this.profiles.get(followeeId);

    if (!followerProfile || !followeeProfile) {
      throw new Error('Profile not found');
    }

    if (!followeeProfile.privacySettings.allowFollows) {
      throw new Error('User does not allow follows');
    }

    const followeeFollowers = this.followers.get(followeeId) ?? new Set();
    if (followeeFollowers.size >= this.config.maxFollowersPerUser) {
      throw new Error('User has reached maximum followers');
    }

    // Add to following/followers
    const followerFollowing = this.following.get(followerId) ?? new Set();
    followerFollowing.add(followeeId);
    this.following.set(followerId, followerFollowing);

    followeeFollowers.add(followerId);
    this.followers.set(followeeId, followeeFollowers);

    // Update stats
    followerProfile.stats.following = followerFollowing.size;
    followeeProfile.stats.followers = followeeFollowers.size;
    this.profiles.set(followerId, followerProfile);
    this.profiles.set(followeeId, followeeProfile);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'user_followed',
      severity: 'info',
      source: 'social',
      userId: followerId,
      message: `${followerProfile.displayName} followed ${followeeProfile.displayName}`,
      data: { followerId, followeeId },
    });
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    const followerFollowing = this.following.get(followerId);
    const followeeFollowers = this.followers.get(followeeId);

    if (followerFollowing) {
      followerFollowing.delete(followeeId);
      const profile = this.profiles.get(followerId);
      if (profile) {
        profile.stats.following = followerFollowing.size;
        this.profiles.set(followerId, profile);
      }
    }

    if (followeeFollowers) {
      followeeFollowers.delete(followerId);
      const profile = this.profiles.get(followeeId);
      if (profile) {
        profile.stats.followers = followeeFollowers.size;
        this.profiles.set(followeeId, profile);
      }
    }
  }

  async getFollowers(userId: string, limit = 50, offset = 0): Promise<UserProfile[]> {
    const followerIds = this.followers.get(userId) ?? new Set();
    const profiles: UserProfile[] = [];

    const ids = Array.from(followerIds).slice(offset, offset + limit);
    for (const id of ids) {
      const profile = this.profiles.get(id);
      if (profile) {
        profiles.push(profile);
      }
    }

    return profiles;
  }

  async getFollowing(userId: string, limit = 50, offset = 0): Promise<UserProfile[]> {
    const followingIds = this.following.get(userId) ?? new Set();
    const profiles: UserProfile[] = [];

    const ids = Array.from(followingIds).slice(offset, offset + limit);
    for (const id of ids) {
      const profile = this.profiles.get(id);
      if (profile) {
        profiles.push(profile);
      }
    }

    return profiles;
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const followingSet = this.following.get(followerId);
    return followingSet?.has(followeeId) ?? false;
  }

  // ============================================================================
  // Feed
  // ============================================================================

  async getFeed(userId: string, cursor?: string, limit = 20): Promise<SocialFeed> {
    const followingIds = this.following.get(userId) ?? new Set();
    const allItemIds: string[] = [];

    // Get items from followed users
    for (const followedId of followingIds) {
      const userItems = this.userFeedItems.get(followedId) ?? [];
      allItemIds.push(...userItems);
    }

    // Add user's own items
    const ownItems = this.userFeedItems.get(userId) ?? [];
    allItemIds.push(...ownItems);

    // Sort by timestamp and paginate
    const sortedItems = allItemIds
      .map((id) => this.feedItems.get(id))
      .filter((item): item is FeedItem => item !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    let startIndex = 0;
    if (cursor) {
      startIndex = sortedItems.findIndex((item) => item.id === cursor) + 1;
    }

    const items = sortedItems.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < sortedItems.length;

    return {
      userId,
      items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };
  }

  async getGlobalFeed(cursor?: string, limit = 20): Promise<SocialFeed> {
    const allItems = Array.from(this.feedItems.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    let startIndex = 0;
    if (cursor) {
      startIndex = allItems.findIndex((item) => item.id === cursor) + 1;
    }

    const items = allItems.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allItems.length;

    return {
      userId: 'global',
      items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };
  }

  async createFeedItem(input: CreateFeedItemInput): Promise<FeedItem> {
    const profile = this.profiles.get(input.userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const itemId = `feed_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const item: FeedItem = {
      id: itemId,
      type: input.type,
      userId: input.userId,
      userName: profile.displayName,
      userAvatar: profile.avatar,
      content: input.content,
      likes: 0,
      comments: 0,
      shares: 0,
      liked: false,
      createdAt: new Date(),
    };

    this.feedItems.set(itemId, item);

    const userItems = this.userFeedItems.get(input.userId) ?? [];
    userItems.unshift(itemId);
    if (userItems.length > this.config.maxFeedItems) {
      userItems.pop();
    }
    this.userFeedItems.set(input.userId, userItems);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'content_posted',
      severity: 'info',
      source: 'social',
      userId: input.userId,
      message: `New ${input.type} posted`,
      data: { itemId, type: input.type },
    });

    return item;
  }

  async likeFeedItem(userId: string, itemId: string): Promise<void> {
    const item = this.feedItems.get(itemId);
    if (!item) {
      throw new Error('Feed item not found');
    }

    const itemLikes = this.likes.get(itemId) ?? new Set();
    if (!itemLikes.has(userId)) {
      itemLikes.add(userId);
      this.likes.set(itemId, itemLikes);
      item.likes = itemLikes.size;
      this.feedItems.set(itemId, item);
    }
  }

  async unlikeFeedItem(userId: string, itemId: string): Promise<void> {
    const item = this.feedItems.get(itemId);
    if (!item) {
      throw new Error('Feed item not found');
    }

    const itemLikes = this.likes.get(itemId);
    if (itemLikes?.has(userId)) {
      itemLikes.delete(userId);
      this.likes.set(itemId, itemLikes);
      item.likes = itemLikes.size;
      this.feedItems.set(itemId, item);
    }
  }

  async shareFeedItem(userId: string, itemId: string): Promise<void> {
    const item = this.feedItems.get(itemId);
    if (!item) {
      throw new Error('Feed item not found');
    }

    item.shares++;
    this.feedItems.set(itemId, item);

    // Create a share feed item
    const profile = this.profiles.get(userId);
    if (profile) {
      await this.createFeedItem({
        userId,
        type: item.type,
        content: {
          title: `Shared: ${item.content.title}`,
          description: item.content.description,
          links: [
            {
              type: 'external',
              url: `#item/${itemId}`,
              label: 'View original',
            },
          ],
        },
      });
    }
  }

  // ============================================================================
  // Discussions
  // ============================================================================

  async createDiscussion(input: CreateDiscussionInput): Promise<Discussion> {
    const profile = this.profiles.get(input.userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const discussionId = `disc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const discussion: Discussion = {
      id: discussionId,
      strategyId: input.strategyId,
      agentId: input.agentId,
      title: input.title,
      content: input.content,
      authorId: input.userId,
      authorName: profile.displayName,
      authorAvatar: profile.avatar,
      tags: input.tags ?? [],
      pinned: false,
      locked: false,
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.discussions.set(discussionId, discussion);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'discussion_created',
      severity: 'info',
      source: 'social',
      userId: input.userId,
      message: `Discussion created: ${input.title}`,
      data: { discussionId, title: input.title },
    });

    return discussion;
  }

  async getDiscussion(discussionId: string): Promise<Discussion | null> {
    const discussion = this.discussions.get(discussionId);
    if (discussion) {
      discussion.viewCount++;
      this.discussions.set(discussionId, discussion);
    }
    return discussion ?? null;
  }

  async getDiscussions(filter: DiscussionFilter = {}): Promise<Discussion[]> {
    let discussions = Array.from(this.discussions.values());

    if (filter.strategyId) {
      discussions = discussions.filter((d) => d.strategyId === filter.strategyId);
    }
    if (filter.agentId) {
      discussions = discussions.filter((d) => d.agentId === filter.agentId);
    }
    if (filter.authorId) {
      discussions = discussions.filter((d) => d.authorId === filter.authorId);
    }
    if (filter.tags && filter.tags.length > 0) {
      discussions = discussions.filter((d) =>
        filter.tags!.some((tag) => d.tags.includes(tag))
      );
    }
    if (filter.pinned !== undefined) {
      discussions = discussions.filter((d) => d.pinned === filter.pinned);
    }

    // Sort
    switch (filter.sortBy) {
      case 'popular':
        discussions.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
        break;
      case 'controversial':
        discussions.sort((a, b) => b.commentCount - a.commentCount);
        break;
      case 'newest':
      default:
        discussions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 20;
    return discussions.slice(offset, offset + limit);
  }

  async updateDiscussion(
    discussionId: string,
    updates: Partial<Discussion>
  ): Promise<Discussion> {
    const discussion = this.discussions.get(discussionId);
    if (!discussion) {
      throw new Error('Discussion not found');
    }

    const updated: Discussion = {
      ...discussion,
      ...updates,
      id: discussion.id,
      authorId: discussion.authorId,
      createdAt: discussion.createdAt,
      updatedAt: new Date(),
    };

    this.discussions.set(discussionId, updated);
    return updated;
  }

  async deleteDiscussion(discussionId: string): Promise<void> {
    this.discussions.delete(discussionId);

    // Delete all comments
    const commentIds = this.discussionComments.get(discussionId) ?? [];
    for (const commentId of commentIds) {
      this.comments.delete(commentId);
    }
    this.discussionComments.delete(discussionId);
  }

  async upvoteDiscussion(userId: string, discussionId: string): Promise<void> {
    const discussion = this.discussions.get(discussionId);
    if (!discussion) {
      throw new Error('Discussion not found');
    }

    const voteMap = this.votes.get(discussionId) ?? new Map();
    const currentVote = voteMap.get(userId);

    if (currentVote === 'up') {
      // Remove upvote
      voteMap.delete(userId);
      discussion.upvotes--;
    } else {
      if (currentVote === 'down') {
        discussion.downvotes--;
      }
      voteMap.set(userId, 'up');
      discussion.upvotes++;
    }

    this.votes.set(discussionId, voteMap);
    this.discussions.set(discussionId, discussion);
  }

  async downvoteDiscussion(userId: string, discussionId: string): Promise<void> {
    const discussion = this.discussions.get(discussionId);
    if (!discussion) {
      throw new Error('Discussion not found');
    }

    const voteMap = this.votes.get(discussionId) ?? new Map();
    const currentVote = voteMap.get(userId);

    if (currentVote === 'down') {
      // Remove downvote
      voteMap.delete(userId);
      discussion.downvotes--;
    } else {
      if (currentVote === 'up') {
        discussion.upvotes--;
      }
      voteMap.set(userId, 'down');
      discussion.downvotes++;
    }

    this.votes.set(discussionId, voteMap);
    this.discussions.set(discussionId, discussion);
  }

  // ============================================================================
  // Comments
  // ============================================================================

  async createComment(input: CreateCommentInput): Promise<Comment> {
    const profile = this.profiles.get(input.userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const discussion = this.discussions.get(input.discussionId);
    if (!discussion) {
      throw new Error('Discussion not found');
    }

    if (discussion.locked) {
      throw new Error('Discussion is locked');
    }

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const comment: Comment = {
      id: commentId,
      discussionId: input.discussionId,
      parentId: input.parentId,
      authorId: input.userId,
      authorName: profile.displayName,
      authorAvatar: profile.avatar,
      content: input.content,
      upvotes: 0,
      downvotes: 0,
      replyCount: 0,
      edited: false,
      createdAt: new Date(),
    };

    this.comments.set(commentId, comment);

    const discComments = this.discussionComments.get(input.discussionId) ?? [];
    discComments.push(commentId);
    this.discussionComments.set(input.discussionId, discComments);

    discussion.commentCount++;
    this.discussions.set(input.discussionId, discussion);

    // Update parent reply count
    if (input.parentId) {
      const parent = this.comments.get(input.parentId);
      if (parent) {
        parent.replyCount++;
        this.comments.set(input.parentId, parent);
      }
    }

    return comment;
  }

  async getComments(discussionId: string, limit = 50, offset = 0): Promise<Comment[]> {
    const commentIds = this.discussionComments.get(discussionId) ?? [];
    const comments: Comment[] = [];

    for (const id of commentIds) {
      const comment = this.comments.get(id);
      if (comment) {
        comments.push(comment);
      }
    }

    return comments
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async updateComment(commentId: string, content: string): Promise<Comment> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    comment.content = content;
    comment.edited = true;
    comment.editedAt = new Date();
    this.comments.set(commentId, comment);

    return comment;
  }

  async deleteComment(commentId: string): Promise<void> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      return;
    }

    this.comments.delete(commentId);

    // Update discussion comment count
    const discussion = this.discussions.get(comment.discussionId);
    if (discussion) {
      discussion.commentCount = Math.max(0, discussion.commentCount - 1);
      this.discussions.set(comment.discussionId, discussion);
    }

    // Update parent reply count
    if (comment.parentId) {
      const parent = this.comments.get(comment.parentId);
      if (parent) {
        parent.replyCount = Math.max(0, parent.replyCount - 1);
        this.comments.set(comment.parentId, parent);
      }
    }

    // Remove from discussion comments list
    const discComments = this.discussionComments.get(comment.discussionId);
    if (discComments) {
      const index = discComments.indexOf(commentId);
      if (index > -1) {
        discComments.splice(index, 1);
        this.discussionComments.set(comment.discussionId, discComments);
      }
    }
  }

  async upvoteComment(userId: string, commentId: string): Promise<void> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    const voteKey = `comment_${commentId}`;
    const voteMap = this.votes.get(voteKey) ?? new Map();
    const currentVote = voteMap.get(userId);

    if (currentVote === 'up') {
      voteMap.delete(userId);
      comment.upvotes--;
    } else {
      if (currentVote === 'down') {
        comment.downvotes--;
      }
      voteMap.set(userId, 'up');
      comment.upvotes++;
    }

    this.votes.set(voteKey, voteMap);
    this.comments.set(commentId, comment);
  }

  async downvoteComment(userId: string, commentId: string): Promise<void> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    const voteKey = `comment_${commentId}`;
    const voteMap = this.votes.get(voteKey) ?? new Map();
    const currentVote = voteMap.get(userId);

    if (currentVote === 'down') {
      voteMap.delete(userId);
      comment.downvotes--;
    } else {
      if (currentVote === 'up') {
        comment.upvotes--;
      }
      voteMap.set(userId, 'down');
      comment.downvotes++;
    }

    this.votes.set(voteKey, voteMap);
    this.comments.set(commentId, comment);
  }

  // ============================================================================
  // Leaderboards
  // ============================================================================

  async getLeaderboard(type: LeaderboardType, period: LeaderboardPeriod): Promise<Leaderboard> {
    const profiles = Array.from(this.profiles.values());
    let sortedProfiles: UserProfile[];

    switch (type) {
      case 'top_performers':
        sortedProfiles = profiles.sort((a, b) => b.stats.totalPnl - a.stats.totalPnl);
        break;
      case 'most_followed':
        sortedProfiles = profiles.sort((a, b) => b.stats.followers - a.stats.followers);
        break;
      case 'best_agents':
        sortedProfiles = profiles.sort((a, b) => b.stats.agentsDeployed - a.stats.agentsDeployed);
        break;
      case 'top_creators':
        sortedProfiles = profiles.sort(
          (a, b) => b.stats.strategiesPublished - a.stats.strategiesPublished
        );
        break;
      case 'rising_stars':
        sortedProfiles = profiles
          .filter((p) => p.stats.followers < 1000)
          .sort((a, b) => b.stats.reputation - a.stats.reputation);
        break;
      case 'most_active':
        sortedProfiles = profiles.sort((a, b) => b.stats.totalTrades - a.stats.totalTrades);
        break;
      default:
        sortedProfiles = profiles;
    }

    const entries: LeaderboardEntry[] = sortedProfiles.slice(0, 100).map((profile, index) => ({
      rank: index + 1,
      userId: profile.id,
      userName: profile.displayName,
      userAvatar: profile.avatar,
      score: this.getLeaderboardScore(profile, type),
      change: Math.floor(Math.random() * 10) - 5,
      metrics: {
        pnl: profile.stats.totalPnl,
        followers: profile.stats.followers,
        winRate: profile.stats.winRate,
      },
    }));

    return {
      id: `${type}_${period}`,
      name: this.getLeaderboardName(type),
      type,
      period,
      entries,
      updatedAt: new Date(),
      nextUpdateAt: new Date(Date.now() + this.config.leaderboardUpdateIntervalMs),
    };
  }

  async getUserRank(
    userId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod
  ): Promise<number | null> {
    const leaderboard = await this.getLeaderboard(type, period);
    const entry = leaderboard.entries.find((e) => e.userId === userId);
    return entry?.rank ?? null;
  }

  // ============================================================================
  // Badges
  // ============================================================================

  async awardBadge(userId: string, badge: Omit<UserBadge, 'earnedAt'>): Promise<UserBadge> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const fullBadge: UserBadge = {
      ...badge,
      earnedAt: new Date(),
    };

    profile.badges.push(fullBadge);
    this.profiles.set(userId, profile);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'achievement_earned',
      severity: 'info',
      source: 'social',
      userId,
      message: `Badge earned: ${badge.name}`,
      data: { badge },
    });

    return fullBadge;
  }

  async getBadges(userId: string): Promise<UserBadge[]> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    return profile.badges;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getLeaderboardScore(profile: UserProfile, type: LeaderboardType): number {
    switch (type) {
      case 'top_performers':
        return profile.stats.totalPnl;
      case 'most_followed':
        return profile.stats.followers;
      case 'best_agents':
        return profile.stats.agentsDeployed;
      case 'top_creators':
        return profile.stats.strategiesPublished;
      case 'rising_stars':
        return profile.stats.reputation;
      case 'most_active':
        return profile.stats.totalTrades;
      default:
        return 0;
    }
  }

  private getLeaderboardName(type: LeaderboardType): string {
    const names: Record<LeaderboardType, string> = {
      top_performers: 'Top Performers',
      most_followed: 'Most Followed',
      best_agents: 'Best Agents',
      top_creators: 'Top Creators',
      rising_stars: 'Rising Stars',
      most_active: 'Most Active',
    };
    return names[type];
  }

  private emitEvent(event: SuperAppEvent): void {
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

export function createSocialManager(config?: Partial<SocialConfig>): DefaultSocialManager {
  return new DefaultSocialManager(config);
}

export default DefaultSocialManager;
