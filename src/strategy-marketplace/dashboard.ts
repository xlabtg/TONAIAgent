/**
 * TONAIAgent - Strategy Marketplace Dashboard UI Components
 *
 * UI component renderers for the Strategy Marketplace Dashboard.
 * These components generate HTML/text representations that can be
 * used in Telegram Mini App, web interface, or console output.
 *
 * Implements Issue #216: Strategy Marketplace UI
 */

import type {
  MarketplaceStrategyListing,
  MarketplaceRiskLevel,
  MarketplaceDeployedAgent,
  MarketplaceStrategyCategory,
} from './index';

import type {
  MarketplaceStats,
  StrategyCategoryInfo,
  StrategyReview,
} from './types';

import type { StrategyPerformanceData } from './api';

// ============================================================================
// Status Indicators
// ============================================================================

/**
 * Get risk level emoji indicator.
 */
export function getRiskLevelEmoji(level: MarketplaceRiskLevel): string {
  const riskEmojis: Record<MarketplaceRiskLevel, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
  };
  return riskEmojis[level];
}

/**
 * Get risk level display text.
 */
export function getRiskLevelText(level: MarketplaceRiskLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Get category emoji indicator.
 */
export function getCategoryEmoji(category: MarketplaceStrategyCategory): string {
  const categoryEmojis: Record<MarketplaceStrategyCategory, string> = {
    momentum: '🚀',
    mean_reversion: '🔄',
    arbitrage: '⚡',
    grid_trading: '📊',
    yield_farming: '🌾',
    trend_following: '📈',
    experimental: '🧪',
  };
  return categoryEmojis[category];
}

/**
 * Get star rating display.
 */
export function getStarRating(rating: number, maxStars: number = 5): string {
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5 ? 1 : 0;
  const emptyStars = maxStars - fullStars - halfStar;

  return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
}

/**
 * Format percentage with sign.
 */
export function formatPercent(value: number): string {
  if (value > 0) return `+${value.toFixed(1)}%`;
  if (value < 0) return `${value.toFixed(1)}%`;
  return '0.0%';
}

/**
 * Format currency value.
 */
export function formatCurrency(value: number, currency: string = '$'): string {
  return `${currency}${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format number with K/M suffix.
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Get agent status emoji.
 */
export function getAgentStatusEmoji(status: MarketplaceDeployedAgent['status']): string {
  const statusEmojis: Record<MarketplaceDeployedAgent['status'], string> = {
    running: '🟢',
    paused: '🟡',
    stopped: '⚫',
    error: '🔴',
  };
  return statusEmojis[status];
}

// ============================================================================
// Strategy Listing Renderers
// ============================================================================

/**
 * Render the main marketplace listing as text.
 *
 * @example
 * ```
 * ═══════════════════════════════════════════════════════════
 *                   STRATEGY MARKETPLACE
 * ═══════════════════════════════════════════════════════════
 *
 * Strategy Name          ROI      Risk      Trades    Rating
 * ───────────────────────────────────────────────────────────
 * 🚀 Momentum Trader     +8.2%    🟡 Med    124       ★★★★☆
 * 🔄 Mean Reversion Pro  +5.4%    🟢 Low    89        ★★★★★
 * ⚡ DEX Arbitrage       +12.7%   🔴 High   456       ★★★★☆
 *
 * Showing 3 of 6 strategies | Use filters to narrow results
 * ```
 */
export function renderMarketplaceListing(
  strategies: MarketplaceStrategyListing[],
  total?: number
): string {
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(60));
  lines.push('                  STRATEGY MARKETPLACE');
  lines.push('═'.repeat(60));
  lines.push('');

  // Column headers
  lines.push('Strategy Name          ROI      Risk      Trades    Rating');
  lines.push('─'.repeat(60));

  // Strategy rows
  for (const strategy of strategies) {
    const emoji = getCategoryEmoji(strategy.category);
    const name = strategy.name.slice(0, 18).padEnd(18);
    const roi = formatPercent(strategy.roi30d).padStart(7);
    const riskEmoji = getRiskLevelEmoji(strategy.riskLevel);
    const riskText = strategy.riskLevel.slice(0, 3).charAt(0).toUpperCase() +
                     strategy.riskLevel.slice(0, 3).slice(1);
    const risk = `${riskEmoji} ${riskText}`.padEnd(9);
    const trades = strategy.totalTrades.toString().padStart(6);
    const rating = getStarRating(strategy.reputationScore / 2); // Convert 0-10 to 0-5

    lines.push(`${emoji} ${name} ${roi}    ${risk}   ${trades}    ${rating}`);
  }

  lines.push('');

  // Footer
  const totalCount = total ?? strategies.length;
  lines.push(`Showing ${strategies.length} of ${totalCount} strategies | Use filters to narrow results`);

  return lines.join('\n');
}

/**
 * Render a compact strategy card for mobile view.
 *
 * @example
 * ```
 * ┌───────────────────────────────────────┐
 * │ 🚀 Momentum Trader           ★★★★☆   │
 * │ ROI: +8.2%  |  Risk: 🟡 Medium        │
 * │ 124 trades  |  342 users              │
 * │ [Deploy Strategy]                     │
 * └───────────────────────────────────────┘
 * ```
 */
export function renderStrategyCard(strategy: MarketplaceStrategyListing): string {
  const lines: string[] = [];
  const width = 41;

  const emoji = getCategoryEmoji(strategy.category);
  const rating = getStarRating(strategy.reputationScore / 2);

  // Top border
  lines.push('┌' + '─'.repeat(width - 2) + '┐');

  // Title line
  const titlePart = `${emoji} ${strategy.name}`;
  const titleLine = ` ${titlePart.padEnd(width - 12)}${rating} `;
  lines.push('│' + titleLine.padEnd(width - 2) + '│');

  // Stats line 1
  const riskEmoji = getRiskLevelEmoji(strategy.riskLevel);
  const riskText = getRiskLevelText(strategy.riskLevel);
  const statsLine1 = ` ROI: ${formatPercent(strategy.roi30d)}  |  Risk: ${riskEmoji} ${riskText}`;
  lines.push('│' + statsLine1.padEnd(width - 2) + '│');

  // Stats line 2
  const statsLine2 = ` ${strategy.totalTrades} trades  |  ${formatNumber(strategy.activeUsers)} users`;
  lines.push('│' + statsLine2.padEnd(width - 2) + '│');

  // Action button
  const buttonLine = ' [Deploy Strategy]';
  lines.push('│' + buttonLine.padEnd(width - 2) + '│');

  // Bottom border
  lines.push('└' + '─'.repeat(width - 2) + '┘');

  return lines.join('\n');
}

// ============================================================================
// Strategy Details Renderers
// ============================================================================

/**
 * Render detailed strategy information page.
 *
 * @example
 * ```
 * ╔════════════════════════════════════════════════════════╗
 * ║            🚀 MOMENTUM TRADER                          ║
 * ╠════════════════════════════════════════════════════════╣
 * ║ Author: TONAIAgent        Version: 1.0.0    ✓ Verified ║
 * ╠════════════════════════════════════════════════════════╣
 * ║                                                        ║
 * ║ Captures short-term price momentum using moving        ║
 * ║ average crossovers and volume confirmation.            ║
 * ║                                                        ║
 * ╠════════════════════════════════════════════════════════╣
 * ║ PERFORMANCE METRICS                                    ║
 * ║ ────────────────────────────────────────────────────── ║
 * ║ 30-Day ROI:        +8.2%                               ║
 * ║ Win Rate:          68.5%                               ║
 * ║ Max Drawdown:      -5.8%                               ║
 * ║ Sharpe Ratio:      1.82                                ║
 * ║ Total Trades:      124                                 ║
 * ╠════════════════════════════════════════════════════════╣
 * ║ RISK PROFILE                                           ║
 * ║ ────────────────────────────────────────────────────── ║
 * ║ Risk Level:        🟡 Medium                           ║
 * ║ Min Capital:       10 TON                              ║
 * ║ Assets:            TON, BTC, ETH                       ║
 * ╠════════════════════════════════════════════════════════╣
 * ║ Rating: ★★★★☆ (8.7/10)  |  342 active users           ║
 * ╚════════════════════════════════════════════════════════╝
 * ```
 */
export function renderStrategyDetails(strategy: MarketplaceStrategyListing): string {
  const lines: string[] = [];
  const width = 58;
  const innerWidth = width - 4;

  // Header
  lines.push('╔' + '═'.repeat(width - 2) + '╗');
  const emoji = getCategoryEmoji(strategy.category);
  const title = `${emoji} ${strategy.name.toUpperCase()}`;
  lines.push('║' + title.padStart((width - 2 + title.length) / 2).padEnd(width - 2) + '║');
  lines.push('╠' + '═'.repeat(width - 2) + '╣');

  // Author line
  const verifiedBadge = strategy.verified ? '✓ Verified' : '';
  const authorLine = ` Author: ${strategy.author.padEnd(14)} Version: ${strategy.version.padEnd(8)} ${verifiedBadge}`;
  lines.push('║' + authorLine.padEnd(width - 2) + '║');
  lines.push('╠' + '═'.repeat(width - 2) + '╣');

  // Description
  lines.push('║' + ' '.repeat(width - 2) + '║');
  const descWords = strategy.description.split(' ');
  let descLine = ' ';
  for (const word of descWords) {
    if ((descLine + word).length > innerWidth) {
      lines.push('║' + descLine.padEnd(width - 2) + '║');
      descLine = ' ' + word + ' ';
    } else {
      descLine += word + ' ';
    }
  }
  if (descLine.trim()) {
    lines.push('║' + descLine.padEnd(width - 2) + '║');
  }
  lines.push('║' + ' '.repeat(width - 2) + '║');

  // Performance Metrics section
  lines.push('╠' + '═'.repeat(width - 2) + '╣');
  lines.push('║' + ' PERFORMANCE METRICS'.padEnd(width - 2) + '║');
  lines.push('║' + ' ' + '─'.repeat(innerWidth) + ' ║');

  const performanceRows = [
    ['30-Day ROI:', formatPercent(strategy.roi30d)],
    ['Win Rate:', `${strategy.winRate.toFixed(1)}%`],
    ['Max Drawdown:', `${strategy.maxDrawdown.toFixed(1)}%`],
    ['Sharpe Ratio:', strategy.sharpeRatio.toFixed(2)],
    ['Total Trades:', strategy.totalTrades.toString()],
  ];

  for (const [label, value] of performanceRows) {
    const row = ` ${label.padEnd(18)} ${value}`;
    lines.push('║' + row.padEnd(width - 2) + '║');
  }

  // Risk Profile section
  lines.push('╠' + '═'.repeat(width - 2) + '╣');
  lines.push('║' + ' RISK PROFILE'.padEnd(width - 2) + '║');
  lines.push('║' + ' ' + '─'.repeat(innerWidth) + ' ║');

  const riskEmoji = getRiskLevelEmoji(strategy.riskLevel);
  const riskText = getRiskLevelText(strategy.riskLevel);
  const riskRows = [
    ['Risk Level:', `${riskEmoji} ${riskText}`],
    ['Min Capital:', `${strategy.minCapital} TON`],
    ['Assets:', strategy.supportedAssets.join(', ')],
  ];

  for (const [label, value] of riskRows) {
    const row = ` ${label.padEnd(18)} ${value}`;
    lines.push('║' + row.padEnd(width - 2) + '║');
  }

  // Footer with rating
  lines.push('╠' + '═'.repeat(width - 2) + '╣');
  const rating = getStarRating(strategy.reputationScore / 2);
  const footerLine = ` Rating: ${rating} (${strategy.reputationScore}/10)  |  ${formatNumber(strategy.activeUsers)} active users`;
  lines.push('║' + footerLine.padEnd(width - 2) + '║');
  lines.push('╚' + '═'.repeat(width - 2) + '╝');

  return lines.join('\n');
}

// ============================================================================
// Performance Chart Renderers
// ============================================================================

/**
 * Render a simple ASCII equity curve chart.
 */
export function renderEquityCurve(
  performance: StrategyPerformanceData,
  title: string = 'EQUITY CURVE (30 Days)'
): string {
  const { equityCurve } = performance;
  const lines: string[] = [];

  if (equityCurve.length === 0) {
    return 'No equity data available';
  }

  // Get min/max values
  const values = equityCurve.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Chart dimensions
  const height = 8;
  const width = Math.min(40, equityCurve.length);

  // Sample points to fit width
  const sampledCurve: number[] = [];
  const step = Math.max(1, Math.floor(equityCurve.length / width));
  for (let i = 0; i < equityCurve.length; i += step) {
    sampledCurve.push(equityCurve[i].value);
    if (sampledCurve.length >= width) break;
  }

  // Header
  lines.push(title);
  lines.push('─'.repeat(title.length));

  // Chart grid
  const chart: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(' '));

  // Plot points
  for (let x = 0; x < sampledCurve.length; x++) {
    const value = sampledCurve[x];
    const y = Math.floor(((value - minValue) / range) * (height - 1));
    const invertedY = height - 1 - y;
    if (invertedY >= 0 && invertedY < height) {
      chart[invertedY][x] = '█';
    }
  }

  // Render chart with Y-axis labels
  for (let y = 0; y < height; y++) {
    const yValue = maxValue - (y / (height - 1)) * range;
    const label = formatCurrency(yValue).padStart(10);
    const row = chart[y].join('');
    const connector = y === height - 1 ? '┴' : '┤';
    lines.push(`${label} ${connector}${row}`);
  }

  // X-axis
  lines.push(' '.repeat(11) + '└' + '─'.repeat(width));

  // Final value indicator
  const finalValue = equityCurve[equityCurve.length - 1].value;
  const initialValue = equityCurve[0].value;
  const change = ((finalValue - initialValue) / initialValue) * 100;
  lines.push(`Current: ${formatCurrency(finalValue)} (${formatPercent(change)})`);

  return lines.join('\n');
}

/**
 * Render drawdown chart.
 */
export function renderDrawdownChart(
  performance: StrategyPerformanceData,
  title: string = 'DRAWDOWN CHART'
): string {
  const { drawdownCurve } = performance;
  const lines: string[] = [];

  if (drawdownCurve.length === 0) {
    return 'No drawdown data available';
  }

  // Header
  lines.push(title);
  lines.push('─'.repeat(title.length));

  // Get min/max values
  const values = drawdownCurve.map((p) => p.value);
  const minValue = Math.min(...values, 0);
  const maxValue = 0; // Drawdown is always <= 0

  // Chart dimensions
  const height = 5;
  const width = Math.min(40, drawdownCurve.length);

  // Sample points
  const sampledCurve: number[] = [];
  const step = Math.max(1, Math.floor(drawdownCurve.length / width));
  for (let i = 0; i < drawdownCurve.length; i += step) {
    sampledCurve.push(drawdownCurve[i].value);
    if (sampledCurve.length >= width) break;
  }

  const range = maxValue - minValue || 1;

  // Chart grid
  const chart: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(' '));

  // Plot points
  for (let x = 0; x < sampledCurve.length; x++) {
    const value = sampledCurve[x];
    const y = Math.floor(((value - minValue) / range) * (height - 1));
    const invertedY = height - 1 - y;
    if (invertedY >= 0 && invertedY < height) {
      chart[invertedY][x] = '▼';
    }
  }

  // Render chart
  for (let y = 0; y < height; y++) {
    const yValue = maxValue - (y / (height - 1)) * range;
    const label = `${yValue.toFixed(1)}%`.padStart(7);
    const row = chart[y].join('');
    lines.push(`${label} │${row}`);
  }

  lines.push(' '.repeat(8) + '└' + '─'.repeat(width));

  // Max drawdown indicator
  const maxDrawdown = Math.min(...values);
  lines.push(`Max Drawdown: ${maxDrawdown.toFixed(1)}%`);

  return lines.join('\n');
}

/**
 * Render trade distribution chart.
 */
export function renderTradeDistribution(
  performance: StrategyPerformanceData
): string {
  const { tradeDistribution } = performance;
  const { wins, losses, breakeven } = tradeDistribution;
  const total = wins + losses + breakeven;

  if (total === 0) {
    return 'No trade data available';
  }

  const lines: string[] = [];
  lines.push('TRADE DISTRIBUTION');
  lines.push('──────────────────');

  const maxBarWidth = 30;
  const winWidth = Math.round((wins / total) * maxBarWidth);
  const lossWidth = Math.round((losses / total) * maxBarWidth);
  const beWidth = maxBarWidth - winWidth - lossWidth;

  lines.push(`Wins:      ${'█'.repeat(winWidth)}${'░'.repeat(maxBarWidth - winWidth)} ${wins} (${((wins / total) * 100).toFixed(1)}%)`);
  lines.push(`Losses:    ${'█'.repeat(lossWidth)}${'░'.repeat(maxBarWidth - lossWidth)} ${losses} (${((losses / total) * 100).toFixed(1)}%)`);
  if (breakeven > 0) {
    lines.push(`Breakeven: ${'█'.repeat(beWidth)}${'░'.repeat(maxBarWidth - beWidth)} ${breakeven} (${((breakeven / total) * 100).toFixed(1)}%)`);
  }

  lines.push(`Total Trades: ${total}`);

  return lines.join('\n');
}

/**
 * Render monthly returns table.
 */
export function renderMonthlyReturns(
  performance: StrategyPerformanceData
): string {
  const { monthlyReturns } = performance;
  const lines: string[] = [];

  lines.push('MONTHLY RETURNS');
  lines.push('───────────────');

  for (const { month, return: ret } of monthlyReturns) {
    const bar = ret > 0
      ? '█'.repeat(Math.min(Math.round(ret), 10))
      : '░'.repeat(Math.min(Math.abs(Math.round(ret)), 10));
    const indicator = ret > 0 ? '🟢' : ret < 0 ? '🔴' : '⚪';
    lines.push(`${month.padEnd(4)} ${indicator} ${formatPercent(ret).padStart(7)} ${bar}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Review Renderers
// ============================================================================

/**
 * Render a list of strategy reviews.
 */
export function renderReviews(reviews: StrategyReview[]): string {
  const lines: string[] = [];

  lines.push('USER REVIEWS');
  lines.push('════════════');

  if (reviews.length === 0) {
    lines.push('No reviews yet. Be the first to review!');
    return lines.join('\n');
  }

  for (const review of reviews) {
    const stars = getStarRating(review.rating);
    const verifiedBadge = review.verified ? ' ✓' : '';
    const date = review.createdAt.toLocaleDateString();

    lines.push('');
    lines.push(`${stars}${verifiedBadge}  ${date}`);
    if (review.title) {
      lines.push(`"${review.title}"`);
    }
    if (review.content) {
      lines.push(review.content);
    }
    lines.push(`👍 ${review.helpfulVotes} helpful`);
    lines.push('─'.repeat(40));
  }

  return lines.join('\n');
}

// ============================================================================
// Deployed Agents Renderers
// ============================================================================

/**
 * Render list of user's deployed agents.
 */
export function renderDeployedAgents(agents: MarketplaceDeployedAgent[]): string {
  const lines: string[] = [];

  lines.push('MY DEPLOYED AGENTS');
  lines.push('══════════════════');

  if (agents.length === 0) {
    lines.push('No agents deployed yet.');
    lines.push('Browse the marketplace to deploy your first strategy!');
    return lines.join('\n');
  }

  for (const agent of agents) {
    const statusEmoji = getAgentStatusEmoji(agent.status);
    const statusText = agent.status.charAt(0).toUpperCase() + agent.status.slice(1);
    const mode = agent.simulationMode ? '(Simulation)' : '(Live)';

    lines.push('');
    lines.push(`${statusEmoji} ${agent.name} ${mode}`);
    lines.push(`   Strategy: ${agent.strategyName}`);
    lines.push(`   Capital: ${agent.capitalAllocated} TON`);
    lines.push(`   Status: ${statusText}`);
    lines.push(`   Deployed: ${agent.deployedAt.toLocaleDateString()}`);
    lines.push('─'.repeat(40));
  }

  return lines.join('\n');
}

// ============================================================================
// Category and Stats Renderers
// ============================================================================

/**
 * Render category list with stats.
 */
export function renderCategories(categories: StrategyCategoryInfo[]): string {
  const lines: string[] = [];

  lines.push('STRATEGY CATEGORIES');
  lines.push('═══════════════════');
  lines.push('');

  for (const category of categories) {
    const emoji = getCategoryEmoji(category.id);
    lines.push(`${emoji} ${category.name}`);
    lines.push(`   ${category.description}`);
    lines.push(`   ${category.strategyCount} strategies | Avg ROI: ${formatPercent(category.averageRoi)}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Render marketplace statistics.
 */
export function renderMarketplaceStats(stats: MarketplaceStats): string {
  const lines: string[] = [];

  lines.push('╔════════════════════════════════════════╗');
  lines.push('║        MARKETPLACE STATISTICS          ║');
  lines.push('╠════════════════════════════════════════╣');
  lines.push(`║ Total Strategies:     ${stats.totalStrategies.toString().padStart(15)} ║`);
  lines.push(`║ Active Users:         ${formatNumber(stats.totalActiveUsers).padStart(15)} ║`);
  lines.push(`║ Total AUM:            ${formatCurrency(stats.totalAUM).padStart(15)} ║`);
  lines.push(`║ Top ROI:              ${formatPercent(stats.topRoi).padStart(15)} ║`);
  lines.push(`║ Average ROI:          ${formatPercent(stats.averageRoi).padStart(15)} ║`);
  lines.push('╚════════════════════════════════════════╝');

  return lines.join('\n');
}

// ============================================================================
// Dashboard Component Factory
// ============================================================================

/**
 * Dashboard component that combines all UI elements.
 */
export class MarketplaceDashboard {
  /**
   * Render the complete marketplace overview.
   */
  renderOverview(
    strategies: MarketplaceStrategyListing[],
    stats: MarketplaceStats,
    categories: StrategyCategoryInfo[]
  ): string {
    const sections: string[] = [];

    // Stats panel
    sections.push(renderMarketplaceStats(stats));
    sections.push('');

    // Strategy listing
    sections.push(renderMarketplaceListing(strategies, stats.totalStrategies));
    sections.push('');

    // Categories summary
    const topCategories = categories.slice(0, 3);
    sections.push('TOP CATEGORIES');
    sections.push('──────────────');
    for (const cat of topCategories) {
      const emoji = getCategoryEmoji(cat.id);
      sections.push(`${emoji} ${cat.name}: ${cat.strategyCount} strategies`);
    }

    return sections.join('\n');
  }

  /**
   * Render complete strategy details page.
   */
  renderStrategyPage(
    strategy: MarketplaceStrategyListing,
    performance: StrategyPerformanceData,
    reviews: StrategyReview[]
  ): string {
    const sections: string[] = [];

    // Strategy details
    sections.push(renderStrategyDetails(strategy));
    sections.push('');

    // Equity curve
    sections.push(renderEquityCurve(performance));
    sections.push('');

    // Trade distribution
    sections.push(renderTradeDistribution(performance));
    sections.push('');

    // Monthly returns
    sections.push(renderMonthlyReturns(performance));
    sections.push('');

    // Reviews
    sections.push(renderReviews(reviews.slice(-3)));

    return sections.join('\n');
  }
}

/**
 * Create a MarketplaceDashboard instance.
 */
export function createMarketplaceDashboard(): MarketplaceDashboard {
  return new MarketplaceDashboard();
}
