/**
 * TONAIAgent - Dashboard UI Components
 *
 * UI component renderers for the Agent Monitoring Dashboard.
 * These components generate HTML/text representations that can be
 * used in Telegram Mini App, web interface, or console output.
 *
 * Implements Issue #215: Agent Monitoring Dashboard
 */

import type {
  AgentDashboardSummary,
  AgentMetrics,
  AgentMonitoringStatus,
  DashboardOverview,
  EquityCurveResponse,
  MonitoringPosition,
  MonitoringTrade,
  PositionsResponse,
  RiskIndicators,
  RiskLevel,
  TradeHistoryResponse,
} from './types';

// ============================================================================
// Status Indicators
// ============================================================================

/**
 * Get status emoji indicator.
 */
export function getStatusEmoji(status: AgentMonitoringStatus): string {
  const statusEmojis: Record<AgentMonitoringStatus, string> = {
    CREATED: '⚪',
    RUNNING: '🟢',
    PAUSED: '🟡',
    STOPPED: '⚫',
    ERROR: '🔴',
  };
  return statusEmojis[status];
}

/**
 * Get risk level emoji indicator.
 */
export function getRiskEmoji(level: RiskLevel): string {
  const riskEmojis: Record<RiskLevel, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  };
  return riskEmojis[level];
}

/**
 * Format a number with sign and color indication.
 */
export function formatPnl(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}`;
  if (value < 0) return value.toFixed(2);
  return '0.00';
}

/**
 * Format ROI percentage.
 */
export function formatRoi(roi: number): string {
  if (roi > 0) return `+${roi.toFixed(1)}%`;
  if (roi < 0) return `${roi.toFixed(1)}%`;
  return '0.0%';
}

/**
 * Format currency value.
 */
export function formatCurrency(value: number, currency: string = '$'): string {
  return `${currency}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// Dashboard Renderers
// ============================================================================

/**
 * Render the main dashboard overview as text.
 *
 * @example
 * ```
 * ═══════════════════════════════════════════════════════
 *                   AGENT MONITORING DASHBOARD
 * ═══════════════════════════════════════════════════════
 *
 * Agent Name          Status     Portfolio      ROI
 * ───────────────────────────────────────────────────────
 * 🟢 Momentum Agent   RUNNING    $10,420.00    +4.2%
 * 🟡 Mean Reversion   PAUSED     $9,800.00     -2.0%
 * 🟢 AI Trader        RUNNING    $12,100.00    +21.0%
 * ⚫ Arbitrage Bot    STOPPED    $10,000.00    0.0%
 * 🔴 Yield Optimizer  ERROR      $9,500.00     -5.0%
 *
 * Summary: 5 agents | 🟢 2 Running | 🟡 1 Paused | 🔴 1 Error
 * ```
 */
export function renderDashboardOverview(overview: DashboardOverview): string {
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(55));
  lines.push('                 AGENT MONITORING DASHBOARD');
  lines.push('═'.repeat(55));
  lines.push('');

  // Column headers
  lines.push('Agent Name          Status     Portfolio      ROI');
  lines.push('─'.repeat(55));

  // Agent rows
  for (const agent of overview.agents) {
    const emoji = getStatusEmoji(agent.status);
    const name = agent.name.padEnd(18).slice(0, 18);
    const status = agent.status.padEnd(10);
    const portfolio = formatCurrency(agent.portfolioValue).padStart(12);
    const roi = formatRoi(agent.roi).padStart(8);

    lines.push(`${emoji} ${name} ${status} ${portfolio} ${roi}`);
  }

  lines.push('');

  // Summary
  const { statusCounts } = overview;
  const summaryParts = [
    `${overview.totalAgents} agents`,
    `🟢 ${statusCounts.RUNNING} Running`,
    `🟡 ${statusCounts.PAUSED} Paused`,
  ];
  if (statusCounts.ERROR > 0) {
    summaryParts.push(`🔴 ${statusCounts.ERROR} Error`);
  }
  lines.push(`Summary: ${summaryParts.join(' | ')}`);

  return lines.join('\n');
}

/**
 * Render agent performance metrics panel.
 *
 * @example
 * ```
 * ╔════════════════════════════════════╗
 * ║       MOMENTUM AGENT METRICS       ║
 * ╠════════════════════════════════════╣
 * ║ Initial Capital:    $10,000.00     ║
 * ║ Portfolio Value:    $10,420.00     ║
 * ║ Profit:             +$420.00       ║
 * ║ ROI:                +4.2%          ║
 * ║ Max Drawdown:       -3.1%          ║
 * ║ Trades:             24             ║
 * ║ Win Rate:           62.5%          ║
 * ╚════════════════════════════════════╝
 * ```
 */
export function renderMetricsPanel(metrics: AgentMetrics, agentName?: string): string {
  const lines: string[] = [];
  const width = 38;
  const title = agentName ? `${agentName.toUpperCase()} METRICS` : 'AGENT METRICS';

  // Header
  lines.push('╔' + '═'.repeat(width - 2) + '╗');
  lines.push('║' + title.padStart((width - 2 + title.length) / 2).padEnd(width - 2) + '║');
  lines.push('╠' + '═'.repeat(width - 2) + '╣');

  // Metrics rows
  const rows = [
    ['Initial Capital:', formatCurrency(metrics.initialCapital)],
    ['Portfolio Value:', formatCurrency(metrics.portfolioValue)],
    ['Profit:', formatPnl(metrics.totalProfit)],
    ['ROI:', formatRoi(metrics.roi)],
    ['Max Drawdown:', `${metrics.maxDrawdown.toFixed(1)}%`],
    ['Trades:', metrics.tradeCount.toString()],
    ['Win Rate:', `${metrics.winRate.toFixed(1)}%`],
  ];

  for (const [label, value] of rows) {
    const row = ` ${label.padEnd(18)} ${value.padStart(15)} `;
    lines.push('║' + row.padEnd(width - 2) + '║');
  }

  // Footer
  lines.push('╚' + '═'.repeat(width - 2) + '╝');

  return lines.join('\n');
}

/**
 * Render positions table.
 *
 * @example
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │                    ACTIVE POSITIONS                     │
 * ├──────────┬────────┬────────────┬──────────────┬─────────┤
 * │ Asset    │ Size   │ Entry      │ Current      │ PnL     │
 * ├──────────┼────────┼────────────┼──────────────┼─────────┤
 * │ TON      │ 200    │ $5.21      │ $5.34        │ +$26.00 │
 * │ BTC      │ 0.05   │ $65,000.00 │ $67,500.00   │+$125.00 │
 * └──────────┴────────┴────────────┴──────────────┴─────────┘
 * ```
 */
export function renderPositionsTable(response: PositionsResponse): string {
  const lines: string[] = [];
  const { positions } = response;

  if (positions.length === 0) {
    return 'No active positions';
  }

  // Header
  lines.push('┌' + '─'.repeat(61) + '┐');
  const title = 'ACTIVE POSITIONS';
  lines.push('│' + title.padStart((61 + title.length) / 2).padEnd(61) + '│');
  lines.push('├' + '──────────┬────────┬────────────┬──────────────┬─────────' + '┤');
  lines.push('│ Asset    │ Size   │ Entry      │ Current      │ PnL     │');
  lines.push('├' + '──────────┼────────┼────────────┼──────────────┼─────────' + '┤');

  // Position rows
  for (const pos of positions) {
    const asset = pos.asset.padEnd(8);
    const size = pos.size.toString().padEnd(6);
    const entry = formatCurrency(pos.entryPrice).padEnd(10);
    const current = formatCurrency(pos.currentPrice).padEnd(12);
    const pnl = formatPnl(pos.unrealizedPnl).padEnd(7);

    lines.push(`│ ${asset} │ ${size} │ ${entry} │ ${current} │ ${pnl} │`);
  }

  // Footer
  lines.push('└' + '──────────┴────────┴────────────┴──────────────┴─────────' + '┘');

  return lines.join('\n');
}

/**
 * Render trade history table.
 *
 * @example
 * ```
 * ┌────────────────────────────────────────────────────────────┐
 * │                      RECENT TRADES                         │
 * ├────────────┬──────────┬──────┬────────────┬────────────────┤
 * │ Time       │ Pair     │ Side │ Price      │ Quantity       │
 * ├────────────┼──────────┼──────┼────────────┼────────────────┤
 * │ 13:00      │ TON/USDT │ BUY  │ $5.21      │ 200            │
 * │ 14:30      │ TON/USDT │ SELL │ $5.35      │ 100            │
 * └────────────┴──────────┴──────┴────────────┴────────────────┘
 * ```
 */
export function renderTradesTable(response: TradeHistoryResponse): string {
  const lines: string[] = [];
  const { trades } = response;

  if (trades.length === 0) {
    return 'No trades executed';
  }

  // Header
  lines.push('┌' + '─'.repeat(62) + '┐');
  const title = 'RECENT TRADES';
  lines.push('│' + title.padStart((62 + title.length) / 2).padEnd(62) + '│');
  lines.push('├' + '────────────┬──────────┬──────┬────────────┬────────────────' + '┤');
  lines.push('│ Time       │ Pair     │ Side │ Price      │ Quantity       │');
  lines.push('├' + '────────────┼──────────┼──────┼────────────┼────────────────' + '┤');

  // Trade rows
  for (const trade of trades) {
    const time = trade.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).padEnd(10);
    const pair = trade.pair.padEnd(8);
    const side = trade.side.padEnd(4);
    const price = formatCurrency(trade.price).padEnd(10);
    const quantity = trade.quantity.toString().padEnd(14);

    lines.push(`│ ${time} │ ${pair} │ ${side} │ ${price} │ ${quantity} │`);
  }

  // Footer
  lines.push('└' + '────────────┴──────────┴──────┴────────────┴────────────────' + '┘');

  return lines.join('\n');
}

/**
 * Render risk indicators panel.
 *
 * @example
 * ```
 * ╔══════════════════════════════╗
 * ║       RISK INDICATORS        ║
 * ╠══════════════════════════════╣
 * ║ Risk Level: 🟡 Medium        ║
 * ║ Drawdown:   -3.1%            ║
 * ║ Exposure:   18%              ║
 * ║ VaR (95%):  $520.00          ║
 * ╚══════════════════════════════╝
 * ```
 */
export function renderRiskPanel(risk: RiskIndicators): string {
  const lines: string[] = [];
  const width = 32;

  // Header
  lines.push('╔' + '═'.repeat(width - 2) + '╗');
  const title = 'RISK INDICATORS';
  lines.push('║' + title.padStart((width - 2 + title.length) / 2).padEnd(width - 2) + '║');
  lines.push('╠' + '═'.repeat(width - 2) + '╣');

  // Risk level with emoji
  const levelEmoji = getRiskEmoji(risk.riskLevel);
  const levelText = risk.riskLevel.charAt(0).toUpperCase() + risk.riskLevel.slice(1);

  const rows = [
    ['Risk Level:', `${levelEmoji} ${levelText}`],
    ['Drawdown:', `${risk.drawdown.toFixed(1)}%`],
    ['Exposure:', `${risk.exposure}%`],
    ['VaR (95%):', formatCurrency(risk.valueAtRisk)],
  ];

  for (const [label, value] of rows) {
    const row = ` ${label.padEnd(12)} ${value.padStart(15)} `;
    lines.push('║' + row.padEnd(width - 2) + '║');
  }

  // Footer
  lines.push('╚' + '═'.repeat(width - 2) + '╝');

  return lines.join('\n');
}

/**
 * Render a simple ASCII equity curve.
 *
 * @example
 * ```
 *     PORTFOLIO VALUE (7 Days)
 *     ────────────────────────
 *     $12,100 ┤      ╭───╮
 *     $11,000 ┤   ╭──╯   │
 *     $10,000 ┼───╯      ╰──
 *             └─────────────
 *               1d  2d  3d
 * ```
 */
export function renderEquityCurve(response: EquityCurveResponse): string {
  const { curve, timeframe } = response;
  const lines: string[] = [];

  if (curve.length === 0) {
    return 'No equity data available';
  }

  // Get min/max values
  const values = curve.map(p => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Chart dimensions
  const height = 8;
  const width = Math.min(40, curve.length);

  // Sample points to fit width
  const sampledCurve: number[] = [];
  const step = Math.max(1, Math.floor(curve.length / width));
  for (let i = 0; i < curve.length; i += step) {
    sampledCurve.push(curve[i].value);
    if (sampledCurve.length >= width) break;
  }

  // Header
  const timeframeLabels: Record<string, string> = {
    hour: '1 Hour',
    day: '24 Hours',
    week: '7 Days',
    month: '30 Days',
    all: 'All Time',
  };
  const title = `PORTFOLIO VALUE (${timeframeLabels[timeframe]})`;
  lines.push(title);
  lines.push('─'.repeat(title.length));

  // Chart grid
  const chart: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '));

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

  return lines.join('\n');
}

// ============================================================================
// Dashboard Component Factory
// ============================================================================

/**
 * Dashboard component that combines all UI elements.
 */
export class DashboardRenderer {
  /**
   * Render complete dashboard for an agent.
   */
  renderAgentDashboard(
    summary: AgentDashboardSummary,
    metrics: AgentMetrics,
    positions: PositionsResponse,
    trades: TradeHistoryResponse,
    risk: RiskIndicators,
    equityCurve: EquityCurveResponse
  ): string {
    const sections: string[] = [];

    // Agent header
    const statusEmoji = getStatusEmoji(summary.status);
    sections.push(`${statusEmoji} ${summary.name} (${summary.strategy})`);
    sections.push('═'.repeat(50));
    sections.push('');

    // Metrics panel
    sections.push(renderMetricsPanel(metrics, summary.name));
    sections.push('');

    // Risk panel
    sections.push(renderRiskPanel(risk));
    sections.push('');

    // Positions
    sections.push(renderPositionsTable(positions));
    sections.push('');

    // Trades
    sections.push(renderTradesTable(trades));
    sections.push('');

    // Equity curve
    sections.push(renderEquityCurve(equityCurve));

    return sections.join('\n');
  }
}

/**
 * Create a DashboardRenderer instance.
 */
export function createDashboardRenderer(): DashboardRenderer {
  return new DashboardRenderer();
}
