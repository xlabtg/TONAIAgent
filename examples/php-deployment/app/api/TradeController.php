<?php
/**
 * TONAIAgent - Trade Controller
 *
 * REST API controller for trade history access.
 * Exposes full trade records with pagination, filters, and sorting.
 *
 * Endpoints:
 *   GET /api/trades               — all trades (paginated)
 *   GET /api/trades/{id}          — single trade by ID
 *   GET /api/trades/summary       — trade summary statistics
 */

require_once __DIR__ . '/../analytics/PortfolioAnalytics.php';

class TradeController
{
    private PortfolioAnalytics $analytics;

    public function __construct(PortfolioAnalytics $analytics)
    {
        $this->analytics = $analytics;
    }

    // =========================================================================
    // GET /api/trades
    // =========================================================================

    /**
     * Returns paginated list of all trades across all agents, or for a
     * specific agent when agent_id query param is provided.
     *
     * Query parameters:
     *   agent_id   (string, optional — filter to one agent)
     *   page       (int, default 1)
     *   per_page   (int, default 20, max 100)
     *   asset      (string, optional — e.g. "BTC")
     *   action     (BUY|SELL, optional)
     *   sort       (asc|desc, default desc by timestamp)
     *   from       (ISO-8601 date string, optional)
     *   to         (ISO-8601 date string, optional)
     *   min_value  (float, optional — minimum trade value)
     *   max_value  (float, optional — maximum trade value)
     *
     * Response JSON:
     * {
     *   "trades": [
     *     {
     *       "id": "trade_001",
     *       "agent_id": "agent_001",
     *       "asset": "BTC",
     *       "action": "BUY",
     *       "price": 65000,
     *       "amount": 0.01,
     *       "value": 650,
     *       "fee": 0,
     *       "pnl": null,
     *       "timestamp": 1710000000,
     *       "strategy_id": "trend_01"
     *     }
     *   ],
     *   "pagination": { "page": 1, "per_page": 20, "total": 42, "pages": 3 }
     * }
     */
    public function listTrades(array $params = []): array
    {
        $agentId  = isset($params['agent_id']) ? trim($params['agent_id']) : null;
        $page     = max(1, (int)($params['page'] ?? 1));
        $perPage  = min(100, max(1, (int)($params['per_page'] ?? 20)));
        $asset    = isset($params['asset']) ? trim($params['asset']) : null;
        $action   = isset($params['action']) ? strtoupper(trim($params['action'])) : null;
        $sort     = strtolower($params['sort'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $from     = $params['from'] ?? null;
        $to       = $params['to'] ?? null;
        $minValue = isset($params['min_value']) ? (float)$params['min_value'] : null;
        $maxValue = isset($params['max_value']) ? (float)$params['max_value'] : null;

        // Validate action filter
        if ($action !== null && !in_array($action, ['BUY', 'SELL'], true)) {
            $action = null;
        }

        $filters = [
            'agent_id'  => $agentId,
            'asset'     => $asset,
            'action'    => $action,
            'sort'      => $sort,
            'from'      => $from,
            'to'        => $to,
            'min_value' => $minValue,
            'max_value' => $maxValue,
        ];

        $result = $this->analytics->getAllTrades($page, $perPage, $filters);

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
    // GET /api/trades/{id}
    // =========================================================================

    /**
     * Returns a single trade by its ID.
     *
     * Response JSON:
     * {
     *   "id": "trade_001",
     *   "agent_id": "agent_001",
     *   "asset": "BTC",
     *   "action": "BUY",
     *   "price": 65000,
     *   "amount": 0.01,
     *   "value": 650,
     *   "fee": 0,
     *   "pnl": null,
     *   "timestamp": 1710000000,
     *   "strategy_id": "trend_01",
     *   "confidence": 0.85
     * }
     *
     * Returns null when not found (caller should respond with 404).
     */
    public function getTrade(string $tradeId): ?array
    {
        return $this->analytics->getTradeById($tradeId);
    }

    // =========================================================================
    // GET /api/trades/summary
    // =========================================================================

    /**
     * Returns aggregated trade statistics for an agent (or all agents).
     *
     * Query parameters:
     *   agent_id   (string, optional)
     *   from       (ISO date, optional)
     *   to         (ISO date, optional)
     *
     * Response JSON:
     * {
     *   "total_trades": 42,
     *   "total_volume": 85000,
     *   "total_fees": 0,
     *   "total_pnl": 2500,
     *   "winning_trades": 26,
     *   "losing_trades": 16,
     *   "win_rate": "61.9%",
     *   "avg_trade_value": 2023.81,
     *   "avg_profit_per_trade": 59.52,
     *   "best_trade_pnl": 1200,
     *   "worst_trade_pnl": -340,
     *   "most_traded_asset": "TON"
     * }
     */
    public function getTradeSummary(array $params = []): array
    {
        $agentId = isset($params['agent_id']) ? trim($params['agent_id']) : null;
        $from    = $params['from'] ?? null;
        $to      = $params['to'] ?? null;

        $summary = $this->analytics->getTradeSummary($agentId, $from, $to);

        return [
            'total_trades'         => $summary['total_trades'],
            'total_volume'         => $summary['total_volume'],
            'total_fees'           => $summary['total_fees'],
            'total_pnl'            => $summary['total_pnl'],
            'winning_trades'       => $summary['winning_trades'],
            'losing_trades'        => $summary['losing_trades'],
            'win_rate'             => $this->formatPercent($summary['win_rate']),
            'avg_trade_value'      => round($summary['avg_trade_value'], 2),
            'avg_profit_per_trade' => round($summary['avg_profit_per_trade'], 2),
            'best_trade_pnl'       => $summary['best_trade_pnl'],
            'worst_trade_pnl'      => $summary['worst_trade_pnl'],
            'most_traded_asset'    => $summary['most_traded_asset'],
        ];
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function formatPercent(float $value, int $decimals = 1): string
    {
        return round($value, $decimals) . '%';
    }
}
