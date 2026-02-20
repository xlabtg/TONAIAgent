/**
 * TONAIAgent - Signal Marketplace Module
 *
 * Enables signal creators to publish, monetize, and share their signals
 * with subscribers in a decentralized marketplace.
 */

import {
  SignalMarketplaceConfig,
  SignalProvider,
  SignalPricing,
  SignalSubscription,
  PublishedSignal,
  SignalComment,
  Signal,
  SignalType,
  DataPlatformEvent,
  DataPlatformEventCallback,
} from './types';

// Re-export types for API consumers
export type { SignalProviderPerformance, SignalFeedback } from './types';

// ============================================================================
// Signal Marketplace Service
// ============================================================================

export interface SignalMarketplaceService {
  // Provider management
  registerProvider(params: RegisterProviderParams): Promise<SignalProvider>;
  updateProvider(providerId: string, updates: UpdateProviderParams): Promise<SignalProvider>;
  getProvider(providerId: string): SignalProvider | undefined;
  listProviders(params?: ListProvidersParams): SignalProvider[];
  deactivateProvider(providerId: string): Promise<void>;

  // Signal publishing
  publishSignal(providerId: string, signal: Signal): Promise<PublishedSignal>;
  unpublishSignal(signalId: string): Promise<void>;
  getPublishedSignals(providerId: string): PublishedSignal[];

  // Subscriptions
  subscribe(params: SubscribeParams): Promise<SignalSubscription>;
  unsubscribe(subscriptionId: string): Promise<void>;
  getSubscription(subscriptionId: string): SignalSubscription | undefined;
  getUserSubscriptions(userId: string): SignalSubscription[];
  getProviderSubscribers(providerId: string): SignalSubscription[];

  // Feedback
  addFeedback(signalId: string, userId: string, helpful: boolean): Promise<void>;
  addComment(signalId: string, userId: string, content: string, rating?: number): Promise<SignalComment>;
  reportSignal(signalId: string, userId: string, reason: string): Promise<void>;

  // Analytics
  getProviderAnalytics(providerId: string): Promise<ProviderAnalytics>;
  getMarketplaceStats(): Promise<MarketplaceStats>;
  getTopProviders(limit?: number): SignalProvider[];
  searchProviders(query: string): SignalProvider[];

  // Configuration
  configure(config: Partial<SignalMarketplaceConfig>): void;

  // Events
  onEvent(callback: DataPlatformEventCallback): void;
}

// ============================================================================
// Additional Types
// ============================================================================

export interface RegisterProviderParams {
  name: string;
  description: string;
  creator: string;
  pricing: SignalPricing;
  categories: SignalType[];
}

export interface UpdateProviderParams {
  name?: string;
  description?: string;
  pricing?: SignalPricing;
  status?: 'active' | 'paused';
}

export interface ListProvidersParams {
  category?: SignalType;
  minReputation?: number;
  verified?: boolean;
  sortBy?: 'reputation' | 'subscribers' | 'accuracy' | 'created';
  limit?: number;
}

export interface SubscribeParams {
  providerId: string;
  subscriberId: string;
  duration?: number; // months
}

export interface ProviderAnalytics {
  providerId: string;
  period: '24h' | '7d' | '30d' | 'all';
  signalsPublished: number;
  signalViews: number;
  helpfulFeedback: number;
  unhelpfulFeedback: number;
  feedbackRatio: number;
  subscriberGrowth: number;
  revenue: string;
  topSignals: PublishedSignal[];
}

export interface MarketplaceStats {
  totalProviders: number;
  activeProviders: number;
  totalSubscriptions: number;
  totalSignalsPublished: number;
  totalVolume: string;
  averageProviderRating: number;
  topCategories: CategoryStats[];
}

export interface CategoryStats {
  category: SignalType;
  providerCount: number;
  signalCount: number;
  subscriberCount: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultSignalMarketplaceService implements SignalMarketplaceService {
  private config: SignalMarketplaceConfig;
  private readonly providers: Map<string, SignalProvider> = new Map();
  private readonly publishedSignals: Map<string, PublishedSignal> = new Map();
  private readonly subscriptions: Map<string, SignalSubscription> = new Map();
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];

  constructor(config?: Partial<SignalMarketplaceConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      platformFeePercent: config?.platformFeePercent ?? 10,
      minSubscriptionPrice: config?.minSubscriptionPrice ?? '1',
      reputationRequired: config?.reputationRequired ?? 50,
      verificationRequired: config?.verificationRequired ?? false,
    };

    this.initializeMockProviders();
  }

  // Provider Management
  async registerProvider(params: RegisterProviderParams): Promise<SignalProvider> {
    const id = `provider_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const provider: SignalProvider = {
      id,
      name: params.name,
      description: params.description,
      creator: params.creator,
      status: 'active',
      verified: false,
      reputation: 50,
      subscriberCount: 0,
      signalsPublished: 0,
      accuracy: 0,
      pricing: params.pricing,
      performance: {
        totalSignals: 0,
        profitableSignals: 0,
        accuracy: 0,
        avgReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        trackRecordDays: 0,
      },
      categories: params.categories,
      createdAt: new Date(),
    };

    this.providers.set(id, provider);

    this.emitEvent('subscription_created', 'marketplace', {
      action: 'provider_registered',
      providerId: id,
      name: params.name,
    });

    return provider;
  }

  async updateProvider(providerId: string, updates: UpdateProviderParams): Promise<SignalProvider> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    if (updates.name) provider.name = updates.name;
    if (updates.description) provider.description = updates.description;
    if (updates.pricing) provider.pricing = updates.pricing;
    if (updates.status) provider.status = updates.status;

    return provider;
  }

  getProvider(providerId: string): SignalProvider | undefined {
    return this.providers.get(providerId);
  }

  listProviders(params?: ListProvidersParams): SignalProvider[] {
    let providers = Array.from(this.providers.values());

    if (params?.category) {
      providers = providers.filter((p) => p.categories.includes(params.category!));
    }
    if (params?.minReputation) {
      providers = providers.filter((p) => p.reputation >= params.minReputation!);
    }
    if (params?.verified !== undefined) {
      providers = providers.filter((p) => p.verified === params.verified);
    }

    const sortBy = params?.sortBy ?? 'reputation';
    providers.sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputation - a.reputation;
        case 'subscribers':
          return b.subscriberCount - a.subscriberCount;
        case 'accuracy':
          return b.accuracy - a.accuracy;
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });

    if (params?.limit) {
      providers = providers.slice(0, params.limit);
    }

    return providers;
  }

  async deactivateProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.status = 'suspended';
    }
  }

  // Signal Publishing
  async publishSignal(providerId: string, signal: Signal): Promise<PublishedSignal> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const publishedSignal: PublishedSignal = {
      ...signal,
      providerId,
      subscribers: provider.subscriberCount,
      views: 0,
      feedback: {
        helpful: 0,
        notHelpful: 0,
        reports: 0,
        comments: [],
      },
    };

    this.publishedSignals.set(signal.id, publishedSignal);

    // Update provider stats
    provider.signalsPublished++;
    provider.performance.totalSignals++;
    provider.performance.lastSignalAt = new Date();

    this.emitEvent('signal_published', 'marketplace', {
      providerId,
      signalId: signal.id,
      type: signal.type,
    });

    return publishedSignal;
  }

  async unpublishSignal(signalId: string): Promise<void> {
    this.publishedSignals.delete(signalId);
  }

  getPublishedSignals(providerId: string): PublishedSignal[] {
    return Array.from(this.publishedSignals.values()).filter(
      (s) => s.providerId === providerId
    );
  }

  // Subscriptions
  async subscribe(params: SubscribeParams): Promise<SignalSubscription> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new Error(`Provider ${params.providerId} not found`);
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const duration = params.duration ?? 1;

    const subscription: SignalSubscription = {
      id,
      providerId: params.providerId,
      subscriberId: params.subscriberId,
      status: 'active',
      pricing: provider.pricing,
      startDate: new Date(),
      endDate: new Date(Date.now() + duration * 30 * 86400000),
      signalsReceived: 0,
    };

    this.subscriptions.set(id, subscription);

    // Update provider stats
    provider.subscriberCount++;

    this.emitEvent('subscription_created', 'marketplace', {
      subscriptionId: id,
      providerId: params.providerId,
      subscriberId: params.subscriberId,
    });

    return subscription;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.status = 'cancelled';
      subscription.endDate = new Date();

      const provider = this.providers.get(subscription.providerId);
      if (provider) {
        provider.subscriberCount = Math.max(0, provider.subscriberCount - 1);
      }
    }
  }

  getSubscription(subscriptionId: string): SignalSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  getUserSubscriptions(userId: string): SignalSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (s) => s.subscriberId === userId
    );
  }

  getProviderSubscribers(providerId: string): SignalSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (s) => s.providerId === providerId && s.status === 'active'
    );
  }

  // Feedback
  async addFeedback(signalId: string, _userId: string, helpful: boolean): Promise<void> {
    const signal = this.publishedSignals.get(signalId);
    if (signal) {
      if (helpful) {
        signal.feedback.helpful++;
      } else {
        signal.feedback.notHelpful++;
      }

      // Update provider accuracy based on feedback
      const provider = this.providers.get(signal.providerId);
      if (provider) {
        const totalFeedback = signal.feedback.helpful + signal.feedback.notHelpful;
        if (totalFeedback > 0) {
          provider.accuracy = signal.feedback.helpful / totalFeedback;
          provider.performance.accuracy = provider.accuracy;
        }
      }
    }
  }

  async addComment(
    signalId: string,
    userId: string,
    content: string,
    rating?: number
  ): Promise<SignalComment> {
    const signal = this.publishedSignals.get(signalId);
    if (!signal) {
      throw new Error(`Signal ${signalId} not found`);
    }

    const comment: SignalComment = {
      id: `comment_${Date.now()}`,
      userId,
      content,
      rating,
      timestamp: new Date(),
    };

    signal.feedback.comments.push(comment);
    return comment;
  }

  async reportSignal(signalId: string, _userId: string, _reason: string): Promise<void> {
    const signal = this.publishedSignals.get(signalId);
    if (signal) {
      signal.feedback.reports++;

      // If too many reports, flag for review
      if (signal.feedback.reports >= 5) {
        const provider = this.providers.get(signal.providerId);
        if (provider) {
          provider.reputation = Math.max(0, provider.reputation - 5);
        }
      }
    }
  }

  // Analytics
  async getProviderAnalytics(providerId: string): Promise<ProviderAnalytics> {
    const provider = this.providers.get(providerId);
    const signals = this.getPublishedSignals(providerId);

    const totalHelpful = signals.reduce((sum, s) => sum + s.feedback.helpful, 0);
    const totalUnhelpful = signals.reduce((sum, s) => sum + s.feedback.notHelpful, 0);
    const totalViews = signals.reduce((sum, s) => sum + s.views, 0);

    return {
      providerId,
      period: '30d',
      signalsPublished: signals.length,
      signalViews: totalViews,
      helpfulFeedback: totalHelpful,
      unhelpfulFeedback: totalUnhelpful,
      feedbackRatio: totalHelpful + totalUnhelpful > 0
        ? totalHelpful / (totalHelpful + totalUnhelpful)
        : 0,
      subscriberGrowth: provider?.subscriberCount ?? 0,
      revenue: String((provider?.subscriberCount ?? 0) * 10), // Mock revenue
      topSignals: signals.sort((a, b) => b.feedback.helpful - a.feedback.helpful).slice(0, 5),
    };
  }

  async getMarketplaceStats(): Promise<MarketplaceStats> {
    const providers = Array.from(this.providers.values());
    const activeProviders = providers.filter((p) => p.status === 'active');
    const subscriptions = Array.from(this.subscriptions.values());
    const signals = Array.from(this.publishedSignals.values());

    const categoryStats = new Map<SignalType, CategoryStats>();
    for (const provider of providers) {
      for (const category of provider.categories) {
        const existing = categoryStats.get(category) ?? {
          category,
          providerCount: 0,
          signalCount: 0,
          subscriberCount: 0,
        };
        existing.providerCount++;
        existing.subscriberCount += provider.subscriberCount;
        categoryStats.set(category, existing);
      }
    }

    for (const signal of signals) {
      const existing = categoryStats.get(signal.type);
      if (existing) {
        existing.signalCount++;
      }
    }

    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      totalSubscriptions: subscriptions.length,
      totalSignalsPublished: signals.length,
      totalVolume: String(subscriptions.length * 100), // Mock volume
      averageProviderRating: providers.reduce((sum, p) => sum + p.reputation, 0) / providers.length,
      topCategories: Array.from(categoryStats.values()).sort(
        (a, b) => b.providerCount - a.providerCount
      ),
    };
  }

  getTopProviders(limit = 10): SignalProvider[] {
    return this.listProviders({ sortBy: 'reputation', limit });
  }

  searchProviders(query: string): SignalProvider[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.providers.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
    );
  }

  configure(config: Partial<SignalMarketplaceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeMockProviders(): void {
    const mockProviders = [
      {
        name: 'Alpha Signals',
        description: 'High-quality trading signals for TON ecosystem',
        creator: 'creator_1',
        categories: ['price', 'momentum'] as SignalType[],
      },
      {
        name: 'DeFi Intelligence',
        description: 'On-chain analytics and DeFi opportunities',
        creator: 'creator_2',
        categories: ['on_chain', 'arbitrage'] as SignalType[],
      },
      {
        name: 'Risk Monitor Pro',
        description: 'Risk alerts and portfolio protection signals',
        creator: 'creator_3',
        categories: ['risk', 'anomaly'] as SignalType[],
      },
    ];

    for (const mock of mockProviders) {
      const id = `provider_${Math.random().toString(36).slice(2, 9)}`;
      this.providers.set(id, {
        id,
        name: mock.name,
        description: mock.description,
        creator: mock.creator,
        status: 'active',
        verified: Math.random() > 0.5,
        reputation: 60 + Math.floor(Math.random() * 30),
        subscriberCount: Math.floor(Math.random() * 500) + 50,
        signalsPublished: Math.floor(Math.random() * 100) + 10,
        accuracy: 0.6 + Math.random() * 0.3,
        pricing: {
          model: 'subscription',
          monthlyPrice: String(10 + Math.floor(Math.random() * 90)),
          trialPeriodDays: 7,
        },
        performance: {
          totalSignals: Math.floor(Math.random() * 100) + 10,
          profitableSignals: Math.floor(Math.random() * 70) + 5,
          accuracy: 0.6 + Math.random() * 0.3,
          avgReturn: 0.05 + Math.random() * 0.15,
          maxDrawdown: 0.05 + Math.random() * 0.1,
          sharpeRatio: 0.5 + Math.random() * 1.5,
          trackRecordDays: Math.floor(Math.random() * 365) + 30,
        },
        categories: mock.categories,
        createdAt: new Date(Date.now() - Math.random() * 180 * 86400000),
      });
    }
  }

  private emitEvent(
    type: DataPlatformEvent['type'],
    category: DataPlatformEvent['category'],
    data: Record<string, unknown>
  ): void {
    const event: DataPlatformEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      category,
      data,
      source: 'signal-marketplace',
    };

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

export function createSignalMarketplaceService(
  config?: Partial<SignalMarketplaceConfig>
): DefaultSignalMarketplaceService {
  return new DefaultSignalMarketplaceService(config);
}
