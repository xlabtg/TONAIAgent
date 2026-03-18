/**
 * TONAIAgent - Viral Loops Engine
 *
 * Implements shareable content generation, public dashboards,
 * social proof features, and viral coefficient tracking.
 */

import {
  ViralContent,
  ViralContentType,
  ViralMetrics,
  ShareLinks,
  PublicDashboard,
  DashboardLayout,
  DashboardWidget,
  DashboardTheme,
  DashboardStats,
  ViralLoopsConfig,
  GrowthEvent,
  GrowthEventCallback,
} from './types';

// ============================================================================
// Viral Loops Engine Interface
// ============================================================================

export interface ViralLoopsEngine {
  // Viral content
  createViralContent(input: CreateViralContentInput): Promise<ViralContent>;
  getViralContent(contentId: string): Promise<ViralContent | null>;
  trackView(contentId: string, unique: boolean): Promise<void>;
  trackClick(contentId: string): Promise<void>;
  trackConversion(contentId: string): Promise<void>;
  getViralMetrics(contentId: string): Promise<ViralMetrics>;

  // Share links
  generateShareLinks(contentId: string, baseUrl: string): Promise<ShareLinks>;
  generateShortLink(contentId: string): Promise<string>;
  generateQrCode(contentId: string): Promise<string>;
  trackShareClick(contentId: string, platform: string): Promise<void>;

  // Public dashboards
  createDashboard(input: CreateDashboardInput): Promise<PublicDashboard>;
  getDashboard(dashboardId: string): Promise<PublicDashboard | null>;
  getDashboardBySlug(slug: string): Promise<PublicDashboard | null>;
  updateDashboard(dashboardId: string, updates: UpdateDashboardInput): Promise<PublicDashboard>;
  deleteDashboard(dashboardId: string): Promise<void>;
  getUserDashboards(userId: string): Promise<PublicDashboard[]>;

  // Widgets
  addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): Promise<DashboardWidget>;
  updateWidget(dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>): Promise<DashboardWidget>;
  removeWidget(dashboardId: string, widgetId: string): Promise<void>;

  // Analytics
  getDashboardStats(dashboardId: string): Promise<DashboardStats>;
  getViralCoefficient(period?: string): Promise<number>;
  getTopViralContent(limit?: number): Promise<ViralContent[]>;

  // Events
  onEvent(callback: GrowthEventCallback): void;
}

// ============================================================================
// Types
// ============================================================================

export interface CreateViralContentInput {
  type: ViralContentType;
  creatorId: string;
  entityId: string;
  title: string;
  description: string;
  embeddable?: boolean;
}

export interface CreateDashboardInput {
  userId: string;
  title: string;
  description: string;
  visibility: PublicDashboard['visibility'];
  layout?: Partial<DashboardLayout>;
  theme?: Partial<DashboardTheme>;
}

export interface UpdateDashboardInput {
  title?: string;
  description?: string;
  visibility?: PublicDashboard['visibility'];
  layout?: Partial<DashboardLayout>;
  theme?: Partial<DashboardTheme>;
}

export interface ViralLoopsEngineConfig {
  publicDashboardsEnabled: boolean;
  shareableCardsEnabled: boolean;
  embedsEnabled: boolean;
  attributionWindow: number;
  baseUrl: string;
  shortLinkDomain: string;
}

// ============================================================================
// Default Viral Loops Engine Implementation
// ============================================================================

export class DefaultViralLoopsEngine implements ViralLoopsEngine {
  private readonly content: Map<string, ViralContent> = new Map();
  private readonly dashboards: Map<string, PublicDashboard> = new Map();
  private readonly slugToDashboard: Map<string, string> = new Map();
  private readonly shareClicks: Map<string, Record<string, number>> = new Map();
  private readonly eventCallbacks: GrowthEventCallback[] = [];
  readonly config: ViralLoopsEngineConfig;

  constructor(config?: Partial<ViralLoopsConfig>) {
    this.config = {
      publicDashboardsEnabled: config?.publicDashboardsEnabled ?? true,
      shareableCardsEnabled: config?.shareableCardsEnabled ?? true,
      embedsEnabled: config?.embedsEnabled ?? true,
      attributionWindow: config?.attributionWindow ?? 30,
      baseUrl: 'https://tonaiagent.io',
      shortLinkDomain: 'tonai.link',
    };
  }

  // ============================================================================
  // Viral Content
  // ============================================================================

  async createViralContent(input: CreateViralContentInput): Promise<ViralContent> {
    const now = new Date();
    const contentId = this.generateId('content');

    const content: ViralContent = {
      id: contentId,
      type: input.type,
      creatorId: input.creatorId,
      entityId: input.entityId,
      title: input.title,
      description: input.description,
      metrics: {
        views: 0,
        uniqueViews: 0,
        shares: 0,
        clicks: 0,
        conversions: 0,
        conversionRate: 0,
        viralCoefficient: 0,
        avgSharesPerUser: 0,
      },
      shareLinks: await this.generateShareLinks(contentId, this.config.baseUrl),
      embeddable: input.embeddable ?? this.config.embedsEnabled,
      createdAt: now,
      updatedAt: now,
    };

    this.content.set(contentId, content);
    return content;
  }

  async getViralContent(contentId: string): Promise<ViralContent | null> {
    return this.content.get(contentId) ?? null;
  }

  async trackView(contentId: string, unique: boolean): Promise<void> {
    const content = this.content.get(contentId);
    if (!content) return;

    content.metrics.views++;
    if (unique) {
      content.metrics.uniqueViews++;
    }
    content.updatedAt = new Date();

    this.updateViralMetrics(content);
    this.content.set(contentId, content);
  }

  async trackClick(contentId: string): Promise<void> {
    const content = this.content.get(contentId);
    if (!content) return;

    content.metrics.clicks++;
    content.updatedAt = new Date();

    this.updateViralMetrics(content);
    this.content.set(contentId, content);
  }

  async trackConversion(contentId: string): Promise<void> {
    const content = this.content.get(contentId);
    if (!content) return;

    content.metrics.conversions++;
    content.updatedAt = new Date();

    this.updateViralMetrics(content);
    this.content.set(contentId, content);

    if (content.metrics.conversions % 10 === 0) {
      this.emitEvent({
        id: this.generateId('event'),
        timestamp: new Date(),
        type: 'content_viral',
        severity: 'info',
        source: 'viral_loops_engine',
        userId: content.creatorId,
        message: `Content reaching viral status: ${content.metrics.conversions} conversions`,
        data: { contentId, conversions: content.metrics.conversions },
      });
    }
  }

  async getViralMetrics(contentId: string): Promise<ViralMetrics> {
    const content = this.content.get(contentId);
    if (!content) {
      return {
        views: 0,
        uniqueViews: 0,
        shares: 0,
        clicks: 0,
        conversions: 0,
        conversionRate: 0,
        viralCoefficient: 0,
        avgSharesPerUser: 0,
      };
    }
    return content.metrics;
  }

  // ============================================================================
  // Share Links
  // ============================================================================

  async generateShareLinks(contentId: string, baseUrl: string): Promise<ShareLinks> {
    const directLink = `${baseUrl}/share/${contentId}`;
    const shortLink = `https://${this.config.shortLinkDomain}/${this.generateShortCode()}`;

    return {
      directLink,
      telegramLink: `https://t.me/share/url?url=${encodeURIComponent(directLink)}&text=${encodeURIComponent('Check this out!')}`,
      twitterLink: `https://twitter.com/intent/tweet?url=${encodeURIComponent(directLink)}`,
      embedCode: this.config.embedsEnabled
        ? `<iframe src="${directLink}/embed" width="400" height="300" frameborder="0"></iframe>`
        : undefined,
      qrCodeUrl: `${baseUrl}/api/qr/${contentId}`,
      shortLink,
    };
  }

  async generateShortLink(_contentId: string): Promise<string> {
    const shortCode = this.generateShortCode();
    return `https://${this.config.shortLinkDomain}/${shortCode}`;
  }

  async generateQrCode(contentId: string): Promise<string> {
    // In production, this would generate actual QR code
    return `${this.config.baseUrl}/api/qr/${contentId}`;
  }

  async trackShareClick(contentId: string, platform: string): Promise<void> {
    const content = this.content.get(contentId);
    if (!content) return;

    content.metrics.shares++;
    content.updatedAt = new Date();

    // Track by platform
    const clicks = this.shareClicks.get(contentId) ?? {};
    clicks[platform] = (clicks[platform] ?? 0) + 1;
    this.shareClicks.set(contentId, clicks);

    this.updateViralMetrics(content);
    this.content.set(contentId, content);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'content_shared',
      severity: 'info',
      source: 'viral_loops_engine',
      userId: content.creatorId,
      message: `Content shared on ${platform}`,
      data: { contentId, platform, totalShares: content.metrics.shares },
    });
  }

  // ============================================================================
  // Public Dashboards
  // ============================================================================

  async createDashboard(input: CreateDashboardInput): Promise<PublicDashboard> {
    if (!this.config.publicDashboardsEnabled) {
      throw new Error('Public dashboards are disabled');
    }

    const now = new Date();
    const dashboardId = this.generateId('dashboard');
    const slug = this.generateSlug(input.title);

    const defaultLayout: DashboardLayout = {
      type: 'grid',
      columns: 3,
      gap: 16,
    };

    const defaultTheme: DashboardTheme = {
      colorScheme: 'dark',
      primaryColor: '#0088CC',
      accentColor: '#00C853',
      fontFamily: 'Inter, sans-serif',
    };

    const dashboard: PublicDashboard = {
      id: dashboardId,
      userId: input.userId,
      slug,
      title: input.title,
      description: input.description,
      layout: { ...defaultLayout, ...input.layout },
      widgets: [],
      theme: { ...defaultTheme, ...input.theme },
      visibility: input.visibility,
      stats: {
        totalViews: 0,
        uniqueVisitors: 0,
        avgTimeOnPage: 0,
        bounceRate: 0,
        conversionRate: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.dashboards.set(dashboardId, dashboard);
    this.slugToDashboard.set(slug, dashboardId);

    return dashboard;
  }

  async getDashboard(dashboardId: string): Promise<PublicDashboard | null> {
    return this.dashboards.get(dashboardId) ?? null;
  }

  async getDashboardBySlug(slug: string): Promise<PublicDashboard | null> {
    const dashboardId = this.slugToDashboard.get(slug);
    if (!dashboardId) return null;
    return this.dashboards.get(dashboardId) ?? null;
  }

  async updateDashboard(
    dashboardId: string,
    updates: UpdateDashboardInput
  ): Promise<PublicDashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    if (updates.title) {
      // Update slug if title changes
      const oldSlug = dashboard.slug;
      dashboard.title = updates.title;
      dashboard.slug = this.generateSlug(updates.title);
      this.slugToDashboard.delete(oldSlug);
      this.slugToDashboard.set(dashboard.slug, dashboardId);
    }
    if (updates.description) dashboard.description = updates.description;
    if (updates.visibility) dashboard.visibility = updates.visibility;
    if (updates.layout) dashboard.layout = { ...dashboard.layout, ...updates.layout };
    if (updates.theme) dashboard.theme = { ...dashboard.theme, ...updates.theme };

    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);

    return dashboard;
  }

  async deleteDashboard(dashboardId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    this.slugToDashboard.delete(dashboard.slug);
    this.dashboards.delete(dashboardId);
  }

  async getUserDashboards(userId: string): Promise<PublicDashboard[]> {
    return Array.from(this.dashboards.values()).filter(d => d.userId === userId);
  }

  // ============================================================================
  // Widgets
  // ============================================================================

  async addWidget(
    dashboardId: string,
    widget: Omit<DashboardWidget, 'id'>
  ): Promise<DashboardWidget> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const fullWidget: DashboardWidget = {
      ...widget,
      id: this.generateId('widget'),
    };

    dashboard.widgets.push(fullWidget);
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);

    return fullWidget;
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<DashboardWidget> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    dashboard.widgets[widgetIndex] = {
      ...dashboard.widgets[widgetIndex],
      ...updates,
    };
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);

    return dashboard.widgets[widgetIndex];
  }

  async removeWidget(dashboardId: string, widgetId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    dashboard.widgets = dashboard.widgets.filter(w => w.id !== widgetId);
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getDashboardStats(dashboardId: string): Promise<DashboardStats> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return {
        totalViews: 0,
        uniqueVisitors: 0,
        avgTimeOnPage: 0,
        bounceRate: 0,
        conversionRate: 0,
      };
    }
    return dashboard.stats;
  }

  async getViralCoefficient(_period?: string): Promise<number> {
    // K = invites sent * conversion rate
    // Aggregated across all content
    let totalShares = 0;
    let totalConversions = 0;

    for (const content of this.content.values()) {
      totalShares += content.metrics.shares;
      totalConversions += content.metrics.conversions;
    }

    if (totalShares === 0) return 0;
    return totalConversions / totalShares;
  }

  async getTopViralContent(limit: number = 10): Promise<ViralContent[]> {
    return Array.from(this.content.values())
      .sort((a, b) => b.metrics.viralCoefficient - a.metrics.viralCoefficient)
      .slice(0, limit);
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

  private generateShortCode(): string {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Ensure uniqueness
    let slug = baseSlug;
    let counter = 1;
    while (this.slugToDashboard.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private updateViralMetrics(content: ViralContent): void {
    const { uniqueViews, shares, clicks, conversions } = content.metrics;

    // Conversion rate = conversions / clicks
    content.metrics.conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

    // Viral coefficient K = shares * conversion rate
    content.metrics.viralCoefficient = shares > 0
      ? shares * (content.metrics.conversionRate / 100)
      : 0;

    // Average shares per unique viewer
    content.metrics.avgSharesPerUser = uniqueViews > 0 ? shares / uniqueViews : 0;
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

export function createViralLoopsEngine(
  config?: Partial<ViralLoopsConfig>
): DefaultViralLoopsEngine {
  return new DefaultViralLoopsEngine(config);
}
