<?php
/**
 * TONAIAgent - Portfolio Controller
 *
 * REST API controller for portfolio data access.
 * Exposes portfolio state, value, trades, and metrics.
 *
 * Endpoints:
 *   GET /api/portfolio          — portfolio overview
 *   GET /api/portfolio/value    — current portfolio value
 *   GET /api/portfolio/trades   — trade history (with pagination, filters, sorting)
 *   GET /api/portfolio/metrics  — performance metrics
 */

require_once __DIR__ . '/../analytics/PortfolioAnalytics.php';

class PortfolioController
{
    private PortfolioAnalytics $analytics;

    public function __construct(PortfolioAnalytics $analytics)
    {
        $this->analytics = $analytics;
    }

    // =========================================================================
    // GET /api/portfolio
    // =========================================================================

    /**
     * Returns a full portfolio overview for the authenticated agent.
     *
     * Response JSON:
     * {
     *   "agent_id": "agent_001",
     *   "portfolio_value": 15500,
     *   "total_cost": 13000,
     *   "profit": 2500,
     *   "roi": "19.23%",
     *   "day_change": 150,
     *   "day_change_percent": "0.98%",
     *   "strategy_count": 3,
     *   "open_position_count": 4,
     *   "last_updated": "2024-03-10T12:00:00Z"
     * }
     */
    public function getPortfolio(string $agentId): array
    {
        $portfolio = $this->analytics->getPortfolio($agentId);

        return [
            'agent_id'             => $portfolio['agent_id'],
            'portfolio_value'      => $portfolio['portfolio_value'],
            'total_cost'           => $portfolio['total_cost'],
            'profit'               => $portfolio['profit'],
            'roi'                  => $this->formatPercent($portfolio['roi']),
            'unrealized_pnl'       => $portfolio['unrealized_pnl'],
            'realized_pnl'         => $portfolio['realized_pnl'],
            'day_change'           => $portfolio['day_change'],
            'day_change_percent'   => $this->formatPercent($portfolio['day_change_percent']),
            'strategy_count'       => $portfolio['strategy_count'],
            'open_position_count'  => $portfolio['open_position_count'],
            'capital_utilization'  => $this->formatPercent($portfolio['capital_utilization']),
            'last_updated'         => $portfolio['last_updated'],
        ];
    }

    // =========================================================================
    // GET /api/portfolio/value
    // =========================================================================

    /**
     * Returns the current portfolio value breakdown by asset.
     *
     * Formula: Portfolio Value = Σ(asset_balance × asset_price)
     *
     * Response JSON:
     * {
     *   "portfolio_value": 15500,
     *   "quote_currency": "USD",
     *   "assets": [
     *     { "asset": "BTC", "balance": 0.1, "price": 65000, "value": 6500 },
     *     { "asset": "ETH", "balance": 2.0, "price": 3500, "value": 7000 },
     *     { "asset": "USD", "balance": 2000, "price": 1, "value": 2000 }
     *   ],
     *   "timestamp": "2024-03-10T12:00:00Z"
     * }
     */
    public function getPortfolioValue(string $agentId, array $prices = []): array
    {
        return $this->analytics->calculatePortfolioValue($agentId, $prices);
    }

    // =========================================================================
    // GET /api/portfolio/trades
    // =========================================================================

    /**
     * Returns paginated trade history for the agent.
     *
     * Query parameters:
     *   page       (int, default 1)
     *   per_page   (int, default 20, max 100)
     *   asset      (string, optional filter)
     *   action     (BUY|SELL, optional filter)
     *   sort       (asc|desc, default desc by timestamp)
     *   from       (ISO date, optional)
     *   to         (ISO date, optional)
     *
     * Response JSON:
     * {
     *   "trades": [
     *     {
     *       "id": "trade_001",
     *       "asset": "BTC",
     *       "action": "BUY",
     *       "price": 65000,
     *       "amount": 0.01,
     *       "value": 650,
     *       "fee": 0,
     *       "pnl": 10,
     *       "timestamp": 1710000000
     *     }
     *   ],
     *   "pagination": { "page": 1, "per_page": 20, "total": 42, "pages": 3 }
     * }
     */
    public function getTrades(string $agentId, array $params = []): array
    {
        $page    = max(1, (int)($params['page'] ?? 1));
        $perPage = min(100, max(1, (int)($params['per_page'] ?? 20)));
        $asset   = isset($params['asset']) ? trim($params['asset']) : null;
        $action  = isset($params['action']) ? strtoupper(trim($params['action'])) : null;
        $sort    = strtolower($params['sort'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $from    = isset($params['from']) ? $params['from'] : null;
        $to      = isset($params['to']) ? $params['to'] : null;

        // Validate action filter
        if ($action !== null && !in_array($action, ['BUY', 'SELL'], true)) {
            $action = null;
        }

        $filters = [
            'asset'  => $asset,
            'action' => $action,
            'sort'   => $sort,
            'from'   => $from,
            'to'     => $to,
        ];

        $result = $this->analytics->getTradeHistory($agentId, $page, $perPage, $filters);

        return [
            'trades'     => $result['trades'],
            'pagination' => [
                'page'     => $page,
                'per_page' => $perPage,
                'total'    => $result['total'],
                'pages'    => (int)ceil($result['total'] / $perPage),
            ],
        ];
    }

    // =========================================================================
    // GET /api/portfolio/metrics
    // =========================================================================

    /**
     * Returns comprehensive performance metrics for the agent portfolio.
     *
     * Response JSON:
     * {
     *   "portfolio_value": 15500,
     *   "profit": 2500,
     *   "roi": "19.23%",
     *   "total_trades": 42,
     *   "win_rate": "61.9%",
     *   "max_drawdown": "5.2%",
     *   "avg_trade_profit": 59.52,
     *   "strategies": [
     *     {
     *       "strategy_id": "dca_001",
     *       "strategy_name": "DCA Strategy",
     *       "profit": 1200,
     *       "roi": "12%",
     *       "win_rate": "65%",
     *       "trades_count": 18,
     *       "drawdown": "3.1%"
     *     }
     *   ]
     * }
     */
    public function getMetrics(string $agentId): array
    {
        return $this->analytics->getMetrics($agentId);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function formatPercent(float $value, int $decimals = 2): string
    {
        return round($value, $decimals) . '%';
    }
}
