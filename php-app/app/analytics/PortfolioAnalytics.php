<?php
/**
 * TONAIAgent - Portfolio Analytics Engine
 *
 * Core analytics engine for computing portfolio metrics, portfolio value,
 * trade history access, and performance analytics.
 *
 * This class acts as the data access layer between the database (tonai_trades,
 * tonai_agents) and the REST API controllers. In production it queries the
 * MySQL database. In test/demo mode it works with in-memory data structures.
 *
 * Example usage:
 *   $analytics = new PortfolioAnalytics($db);
 *   $portfolio  = PortfolioAPI::getPortfolio();
 *   $metrics    = PortfolioAnalytics::calculate($portfolio);
 */

require_once __DIR__ . '/StrategyMetrics.php';

class PortfolioAnalytics
{
    private ?object $db;
    private StrategyMetrics $strategyMetrics;

    /** Baseline asset prices in USD (used when no live prices provided) */
    private const BASELINE_PRICES = [
        'BTC'  => 65000.0,
        'ETH'  => 3500.0,
        'TON'  => 5.25,
        'SOL'  => 175.0,
        'USDT' => 1.0,
        'USD'  => 1.0,
    ];

    public function __construct(?object $db = null)
    {
        $this->db              = $db;
        $this->strategyMetrics = new StrategyMetrics($db);
    }

    // =========================================================================
    // Portfolio Overview
    // =========================================================================

    /**
     * Returns a full portfolio overview for the given agent.
     *
     * Reads the agent row from tonai_agents and aggregates trade data.
     * Falls back to demo data when no database is available.
     *
     * @param  string $agentId
     * @return array{
     *   agent_id: string,
     *   portfolio_value: float,
     *   total_cost: float,
     *   profit: float,
     *   roi: float,
     *   unrealized_pnl: float,
     *   realized_pnl: float,
     *   day_change: float,
     *   day_change_percent: float,
     *   strategy_count: int,
     *   open_position_count: int,
     *   capital_utilization: float,
     *   last_updated: string
     * }
     */
    public function getPortfolio(string $agentId): array
    {
        if ($this->db !== null) {
            return $this->getPortfolioFromDb($agentId);
        }

        // Demo/in-memory fallback
        return $this->getDemoPortfolio($agentId);
    }

    // =========================================================================
    // Portfolio Value Calculator
    //
    // Formula: Portfolio Value = Σ(asset_balance × asset_price)
    // =========================================================================

    /**
     * Calculates real-time portfolio value using provided (or baseline) prices.
     *
     * @param  string  $agentId
     * @param  float[] $prices  Map of asset symbol → price in USD
     * @return array{
     *   portfolio_value: float,
     *   quote_currency: string,
     *   assets: array,
     *   timestamp: string
     * }
     */
    public function calculatePortfolioValue(string $agentId, array $prices = []): array
    {
        $effectivePrices = array_merge(self::BASELINE_PRICES, $prices);

        $balances = $this->getAssetBalances($agentId);

        $assets = [];
        $totalValue = 0.0;

        foreach ($balances as $asset => $balance) {
            if ($balance <= 0) {
                continue;
            }

            $price = $effectivePrices[$asset] ?? 0.0;
            $value = $balance * $price;
            $totalValue += $value;

            $assets[] = [
                'asset'   => $asset,
                'balance' => $balance,
                'price'   => $price,
                'value'   => round($value, 2),
            ];
        }

        // Sort by value descending for readability
        usort($assets, fn($a, $b) => $b['value'] <=> $a['value']);

        return [
            'portfolio_value' => round($totalValue, 2),
            'quote_currency'  => 'USD',
            'assets'          => $assets,
            'timestamp'       => (new DateTime())->format(DateTime::ATOM),
        ];
    }

    // =========================================================================
    // Trade History
    // =========================================================================

    /**
     * Returns paginated trade history for an agent.
     *
     * @param  string $agentId
     * @param  int    $page
     * @param  int    $perPage
     * @param  array  $filters  Keys: asset, action, sort, from, to
     * @return array{trades: array, total: int}
     */
    public function getTradeHistory(
        string $agentId,
        int $page = 1,
        int $perPage = 20,
        array $filters = []
    ): array {
        if ($this->db !== null) {
            return $this->getTradeHistoryFromDb($agentId, $page, $perPage, $filters);
        }

        return $this->getDemoTradeHistory($agentId, $page, $perPage, $filters);
    }

    /**
     * Returns paginated list of all trades (optionally filtered by agent).
     *
     * @param  int   $page
     * @param  int   $perPage
     * @param  array $filters  Keys: agent_id, asset, action, sort, from, to, min_value, max_value
     * @return array{trades: array, total: int}
     */
    public function getAllTrades(int $page = 1, int $perPage = 20, array $filters = []): array
    {
        $agentId = $filters['agent_id'] ?? null;

        if ($this->db !== null) {
            return $this->getAllTradesFromDb($page, $perPage, $filters);
        }

        // Demo: delegate to agent-specific history or return all demo trades
        if ($agentId !== null) {
            return $this->getDemoTradeHistory($agentId, $page, $perPage, $filters);
        }

        return $this->getDemoAllTrades($page, $perPage, $filters);
    }

    /**
     * Returns a single trade record by its ID.
     *
     * @param  string $tradeId
     * @return array|null  null when not found
     */
    public function getTradeById(string $tradeId): ?array
    {
        if ($this->db !== null) {
            return $this->getTradeByIdFromDb($tradeId);
        }

        foreach ($this->generateDemoTrades('demo_agent') as $trade) {
            if ($trade['id'] === $tradeId) {
                return $trade;
            }
        }

        return null;
    }

    // =========================================================================
    // Portfolio Metrics Engine
    // =========================================================================

    /**
     * Computes comprehensive performance metrics for an agent.
     *
     * Metrics:
     *   portfolio_value, profit, roi, total_trades, win_rate,
     *   max_drawdown, avg_trade_profit, strategies
     *
     * @param  string $agentId
     * @return array
     */
    public function getMetrics(string $agentId): array
    {
        if ($this->db !== null) {
            return $this->getMetricsFromDb($agentId);
        }

        return $this->getDemoMetrics($agentId);
    }

    // =========================================================================
    // Trade Summary
    // =========================================================================

    /**
     * Returns aggregated trade statistics.
     *
     * @param  string|null $agentId
     * @param  string|null $from
     * @param  string|null $to
     * @return array
     */
    public function getTradeSummary(?string $agentId, ?string $from, ?string $to): array
    {
        if ($this->db !== null) {
            return $this->getTradeSummaryFromDb($agentId, $from, $to);
        }

        return $this->getDemoTradeSummary($agentId);
    }

    // =========================================================================
    // Static factory (matches issue example: PortfolioAnalytics::calculate)
    // =========================================================================

    /**
     * Calculates performance metrics from a portfolio array.
     *
     * Example from issue:
     *   $portfolio = PortfolioAPI::getPortfolio();
     *   $metrics   = PortfolioAnalytics::calculate($portfolio);
     *
     * @param  array $portfolio  Output of getPortfolio()
     * @return array
     */
    public static function calculate(array $portfolio): array
    {
        $value     = (float)($portfolio['portfolio_value'] ?? 0);
        $cost      = (float)($portfolio['total_cost'] ?? $value);
        $profit    = $value - $cost;
        $roi       = $cost > 0 ? ($profit / $cost) * 100 : 0.0;
        $trades    = (int)($portfolio['total_trades'] ?? 0);
        $winRate   = (float)($portfolio['win_rate'] ?? 0);
        $drawdown  = (float)($portfolio['max_drawdown'] ?? 0);
        $avgProfit = $trades > 0 ? $profit / $trades : 0;

        return [
            'portfolio_value'   => round($value, 2),
            'profit'            => round($profit, 2),
            'roi'               => round($roi, 2) . '%',
            'total_trades'      => $trades,
            'win_rate'          => round($winRate, 1) . '%',
            'max_drawdown'      => round($drawdown, 2) . '%',
            'avg_trade_profit'  => round($avgProfit, 2),
        ];
    }

    // =========================================================================
    // Database Implementations
    // =========================================================================

    private function getPortfolioFromDb(string $agentId): array
    {
        $agent = $this->db->selectOne(
            'SELECT * FROM tonai_agents WHERE id = ?',
            [$agentId]
        );

        if (!$agent) {
            return $this->buildEmptyPortfolio($agentId);
        }

        // Aggregate trade stats
        $stats = $this->db->selectOne(
            'SELECT
                COUNT(*) AS total_trades,
                SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) AS winning_trades,
                SUM(pnl) AS total_pnl,
                SUM(CASE WHEN action = "BUY" THEN amount * price ELSE 0 END) AS total_cost
             FROM tonai_trades
             WHERE agent_id = ?',
            [$agentId]
        ) ?? [];

        $totalTrades   = (int)($stats['total_trades'] ?? 0);
        $winningTrades = (int)($stats['winning_trades'] ?? 0);
        $totalPnl      = (float)($stats['total_pnl'] ?? 0);
        $totalCost     = (float)($stats['total_cost'] ?? 0);
        $portfolioVal  = $totalCost + $totalPnl;
        $roi           = $totalCost > 0 ? ($totalPnl / $totalCost) * 100 : 0;
        $winRate       = $totalTrades > 0 ? ($winningTrades / $totalTrades) * 100 : 0;

        return [
            'agent_id'            => $agentId,
            'portfolio_value'     => round($portfolioVal, 2),
            'total_cost'          => round($totalCost, 2),
            'profit'              => round($totalPnl, 2),
            'roi'                 => round($roi, 2),
            'unrealized_pnl'      => 0.0,
            'realized_pnl'        => round($totalPnl, 2),
            'day_change'          => 0.0,
            'day_change_percent'  => 0.0,
            'strategy_count'      => (int)($agent['strategy_count'] ?? 1),
            'open_position_count' => 0,
            'capital_utilization' => 100.0,
            'total_trades'        => $totalTrades,
            'win_rate'            => round($winRate, 1),
            'last_updated'        => (new DateTime())->format(DateTime::ATOM),
        ];
    }

    private function getAssetBalances(string $agentId): array
    {
        if ($this->db === null) {
            return [
                'USD'  => 2000.0,
                'BTC'  => 0.1,
                'ETH'  => 2.0,
                'TON'  => 500.0,
                'SOL'  => 0.0,
                'USDT' => 0.0,
            ];
        }

        $rows = $this->db->select(
            'SELECT asset, SUM(CASE WHEN action = "BUY" THEN amount ELSE -amount END) AS balance
             FROM tonai_trades
             WHERE agent_id = ?
             GROUP BY asset',
            [$agentId]
        ) ?? [];

        $balances = ['USD' => 10000.0]; // initial balance
        foreach ($rows as $row) {
            $balances[$row['asset']] = (float)$row['balance'];
        }

        return $balances;
    }

    private function getTradeHistoryFromDb(
        string $agentId,
        int $page,
        int $perPage,
        array $filters
    ): array {
        $conditions = ['agent_id = ?'];
        $bindings   = [$agentId];

        $this->applyTradeFilters($conditions, $bindings, $filters);

        $sort   = ($filters['sort'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
        $offset = ($page - 1) * $perPage;

        $total = (int)($this->db->selectOne(
            'SELECT COUNT(*) AS cnt FROM tonai_trades WHERE ' . implode(' AND ', $conditions),
            $bindings
        )['cnt'] ?? 0);

        $rows = $this->db->select(
            'SELECT * FROM tonai_trades WHERE ' . implode(' AND ', $conditions) .
            " ORDER BY created_at {$sort} LIMIT {$perPage} OFFSET {$offset}",
            $bindings
        ) ?? [];

        return [
            'trades' => array_map([$this, 'formatTradeRow'], $rows),
            'total'  => $total,
        ];
    }

    private function getAllTradesFromDb(int $page, int $perPage, array $filters): array
    {
        $conditions = ['1=1'];
        $bindings   = [];

        if (!empty($filters['agent_id'])) {
            $conditions[] = 'agent_id = ?';
            $bindings[]   = $filters['agent_id'];
        }

        $this->applyTradeFilters($conditions, $bindings, $filters);

        $sort   = ($filters['sort'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
        $offset = ($page - 1) * $perPage;

        $total = (int)($this->db->selectOne(
            'SELECT COUNT(*) AS cnt FROM tonai_trades WHERE ' . implode(' AND ', $conditions),
            $bindings
        )['cnt'] ?? 0);

        $rows = $this->db->select(
            'SELECT * FROM tonai_trades WHERE ' . implode(' AND ', $conditions) .
            " ORDER BY created_at {$sort} LIMIT {$perPage} OFFSET {$offset}",
            $bindings
        ) ?? [];

        return [
            'trades' => array_map([$this, 'formatTradeRow'], $rows),
            'total'  => $total,
        ];
    }

    private function applyTradeFilters(array &$conditions, array &$bindings, array $filters): void
    {
        if (!empty($filters['asset'])) {
            $conditions[] = 'asset = ?';
            $bindings[]   = $filters['asset'];
        }
        if (!empty($filters['action'])) {
            $conditions[] = 'action = ?';
            $bindings[]   = $filters['action'];
        }
        if (!empty($filters['from'])) {
            $conditions[] = 'created_at >= ?';
            $bindings[]   = $filters['from'];
        }
        if (!empty($filters['to'])) {
            $conditions[] = 'created_at <= ?';
            $bindings[]   = $filters['to'];
        }
        if (isset($filters['min_value'])) {
            $conditions[] = '(amount * price) >= ?';
            $bindings[]   = (float)$filters['min_value'];
        }
        if (isset($filters['max_value'])) {
            $conditions[] = '(amount * price) <= ?';
            $bindings[]   = (float)$filters['max_value'];
        }
    }

    private function getTradeByIdFromDb(string $tradeId): ?array
    {
        $row = $this->db->selectOne(
            'SELECT * FROM tonai_trades WHERE id = ?',
            [$tradeId]
        );

        return $row ? $this->formatTradeRow($row) : null;
    }

    private function formatTradeRow(array $row): array
    {
        $amount = (float)($row['amount'] ?? 0);
        $price  = (float)($row['price'] ?? 0);

        return [
            'id'          => $row['id'],
            'agent_id'    => $row['agent_id'] ?? null,
            'asset'       => $row['asset'],
            'action'      => strtoupper($row['action'] ?? $row['type'] ?? ''),
            'price'       => $price,
            'amount'      => $amount,
            'value'       => round($amount * $price, 2),
            'fee'         => round((float)($row['fee'] ?? 0), 8),
            'pnl'         => isset($row['pnl']) ? round((float)$row['pnl'], 2) : null,
            'strategy_id' => $row['strategy_id'] ?? null,
            'confidence'  => isset($row['confidence']) ? (float)$row['confidence'] : null,
            'timestamp'   => isset($row['created_at'])
                ? (new DateTime($row['created_at']))->getTimestamp()
                : null,
        ];
    }

    private function getMetricsFromDb(string $agentId): array
    {
        $portfolio = $this->getPortfolioFromDb($agentId);
        $equityCurve = $this->getEquityCurveFromDb($agentId);
        $maxDrawdown = $this->computeMaxDrawdown($equityCurve);
        $strategies  = $this->strategyMetrics->getStrategyMetrics($agentId);

        $totalTrades   = (int)$portfolio['total_trades'];
        $winningTrades = (int)round($totalTrades * ($portfolio['win_rate'] / 100));
        $profit        = (float)$portfolio['profit'];
        $avgProfit     = $totalTrades > 0 ? $profit / $totalTrades : 0;

        return [
            'portfolio_value'  => $portfolio['portfolio_value'],
            'profit'           => $portfolio['profit'],
            'roi'              => round($portfolio['roi'], 2) . '%',
            'total_trades'     => $totalTrades,
            'win_rate'         => round($portfolio['win_rate'], 1) . '%',
            'max_drawdown'     => round($maxDrawdown, 2) . '%',
            'avg_trade_profit' => round($avgProfit, 2),
            'strategies'       => $strategies,
        ];
    }

    private function getEquityCurveFromDb(string $agentId): array
    {
        $rows = $this->db->select(
            'SELECT created_at, pnl FROM tonai_trades WHERE agent_id = ? ORDER BY created_at ASC',
            [$agentId]
        ) ?? [];

        $curve  = [];
        $running = 0.0;
        foreach ($rows as $row) {
            $running += (float)($row['pnl'] ?? 0);
            $curve[]  = $running;
        }

        return $curve;
    }

    private function getTradeSummaryFromDb(?string $agentId, ?string $from, ?string $to): array
    {
        $conditions = ['1=1'];
        $bindings   = [];

        if ($agentId !== null) {
            $conditions[] = 'agent_id = ?';
            $bindings[]   = $agentId;
        }
        if ($from !== null) {
            $conditions[] = 'created_at >= ?';
            $bindings[]   = $from;
        }
        if ($to !== null) {
            $conditions[] = 'created_at <= ?';
            $bindings[]   = $to;
        }

        $where = implode(' AND ', $conditions);

        $stats = $this->db->selectOne(
            "SELECT
                COUNT(*) AS total_trades,
                SUM(amount * price) AS total_volume,
                SUM(fee) AS total_fees,
                SUM(pnl) AS total_pnl,
                SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) AS winning_trades,
                SUM(CASE WHEN pnl <= 0 THEN 1 ELSE 0 END) AS losing_trades,
                MAX(pnl) AS best_trade_pnl,
                MIN(pnl) AS worst_trade_pnl
             FROM tonai_trades WHERE {$where}",
            $bindings
        ) ?? [];

        $totalTrades   = (int)($stats['total_trades'] ?? 0);
        $winningTrades = (int)($stats['winning_trades'] ?? 0);
        $totalVolume   = (float)($stats['total_volume'] ?? 0);
        $totalPnl      = (float)($stats['total_pnl'] ?? 0);
        $winRate       = $totalTrades > 0 ? ($winningTrades / $totalTrades) * 100 : 0;
        $avgVolume     = $totalTrades > 0 ? $totalVolume / $totalTrades : 0;
        $avgProfit     = $totalTrades > 0 ? $totalPnl / $totalTrades : 0;

        $mostTradedRow = $this->db->selectOne(
            "SELECT asset, COUNT(*) AS cnt FROM tonai_trades WHERE {$where} GROUP BY asset ORDER BY cnt DESC LIMIT 1",
            $bindings
        );

        return [
            'total_trades'         => $totalTrades,
            'total_volume'         => round($totalVolume, 2),
            'total_fees'           => round((float)($stats['total_fees'] ?? 0), 8),
            'total_pnl'            => round($totalPnl, 2),
            'winning_trades'       => $winningTrades,
            'losing_trades'        => (int)($stats['losing_trades'] ?? 0),
            'win_rate'             => round($winRate, 1),
            'avg_trade_value'      => round($avgVolume, 2),
            'avg_profit_per_trade' => round($avgProfit, 2),
            'best_trade_pnl'       => round((float)($stats['best_trade_pnl'] ?? 0), 2),
            'worst_trade_pnl'      => round((float)($stats['worst_trade_pnl'] ?? 0), 2),
            'most_traded_asset'    => $mostTradedRow['asset'] ?? 'N/A',
        ];
    }

    // =========================================================================
    // Demo / in-memory data (fallback when no DB)
    // =========================================================================

    private function getDemoPortfolio(string $agentId): array
    {
        $trades     = $this->generateDemoTrades($agentId);
        $totalCost  = 0.0;
        $totalPnl   = 0.0;
        $winning    = 0;

        foreach ($trades as $trade) {
            $totalCost += (float)$trade['value'];
            $pnl = (float)($trade['pnl'] ?? 0);
            $totalPnl += $pnl;
            if ($pnl > 0) {
                $winning++;
            }
        }

        $portfolioVal = $totalCost + $totalPnl;
        $roi          = $totalCost > 0 ? ($totalPnl / $totalCost) * 100 : 0;
        $winRate      = count($trades) > 0 ? ($winning / count($trades)) * 100 : 0;

        return [
            'agent_id'            => $agentId,
            'portfolio_value'     => round($portfolioVal, 2),
            'total_cost'          => round($totalCost, 2),
            'profit'              => round($totalPnl, 2),
            'roi'                 => round($roi, 2),
            'unrealized_pnl'      => 0.0,
            'realized_pnl'        => round($totalPnl, 2),
            'day_change'          => 150.0,
            'day_change_percent'  => 0.98,
            'strategy_count'      => 2,
            'open_position_count' => 3,
            'capital_utilization' => 80.0,
            'total_trades'        => count($trades),
            'win_rate'            => round($winRate, 1),
            'last_updated'        => (new DateTime())->format(DateTime::ATOM),
        ];
    }

    private function getDemoTradeHistory(
        string $agentId,
        int $page,
        int $perPage,
        array $filters
    ): array {
        $trades = $this->generateDemoTrades($agentId);
        $trades = $this->filterTrades($trades, $filters);

        $sort = ($filters['sort'] ?? 'desc');
        if ($sort === 'asc') {
            usort($trades, fn($a, $b) => $a['timestamp'] <=> $b['timestamp']);
        } else {
            usort($trades, fn($a, $b) => $b['timestamp'] <=> $a['timestamp']);
        }

        $total  = count($trades);
        $offset = ($page - 1) * $perPage;
        $paged  = array_slice($trades, $offset, $perPage);

        return ['trades' => $paged, 'total' => $total];
    }

    private function getDemoAllTrades(int $page, int $perPage, array $filters): array
    {
        $agents = ['agent_001', 'agent_002'];
        $all    = [];

        foreach ($agents as $agentId) {
            $all = array_merge($all, $this->generateDemoTrades($agentId));
        }

        $all = $this->filterTrades($all, $filters);

        $sort = ($filters['sort'] ?? 'desc');
        if ($sort === 'asc') {
            usort($all, fn($a, $b) => $a['timestamp'] <=> $b['timestamp']);
        } else {
            usort($all, fn($a, $b) => $b['timestamp'] <=> $a['timestamp']);
        }

        $total  = count($all);
        $offset = ($page - 1) * $perPage;
        $paged  = array_slice($all, $offset, $perPage);

        return ['trades' => $paged, 'total' => $total];
    }

    private function getDemoMetrics(string $agentId): array
    {
        $portfolio   = $this->getDemoPortfolio($agentId);
        $trades      = $this->generateDemoTrades($agentId);
        $equityCurve = array_column($trades, 'pnl');
        $maxDrawdown = $this->computeMaxDrawdown($equityCurve);
        $totalTrades = count($trades);
        $profit      = (float)$portfolio['profit'];
        $avgProfit   = $totalTrades > 0 ? $profit / $totalTrades : 0;
        $strategies  = $this->strategyMetrics->getDemoStrategyMetrics($agentId, $trades);

        return [
            'portfolio_value'  => $portfolio['portfolio_value'],
            'profit'           => $portfolio['profit'],
            'roi'              => $portfolio['roi'] . '%',
            'total_trades'     => $totalTrades,
            'win_rate'         => $portfolio['win_rate'] . '%',
            'max_drawdown'     => round($maxDrawdown, 2) . '%',
            'avg_trade_profit' => round($avgProfit, 2),
            'strategies'       => $strategies,
        ];
    }

    private function getDemoTradeSummary(?string $agentId): array
    {
        $agentId = $agentId ?? 'agent_001';
        $trades  = $this->generateDemoTrades($agentId);

        $totalTrades   = count($trades);
        $winning       = 0;
        $totalVolume   = 0.0;
        $totalFees     = 0.0;
        $totalPnl      = 0.0;
        $bestPnl       = null;
        $worstPnl      = null;
        $assetCounts   = [];

        foreach ($trades as $t) {
            $pnl    = (float)($t['pnl'] ?? 0);
            $volume = (float)($t['value'] ?? 0);
            $fee    = (float)($t['fee'] ?? 0);

            $totalPnl    += $pnl;
            $totalVolume += $volume;
            $totalFees   += $fee;

            if ($pnl > 0) {
                $winning++;
            }

            if ($bestPnl === null || $pnl > $bestPnl) {
                $bestPnl = $pnl;
            }
            if ($worstPnl === null || $pnl < $worstPnl) {
                $worstPnl = $pnl;
            }

            $asset = $t['asset'];
            $assetCounts[$asset] = ($assetCounts[$asset] ?? 0) + 1;
        }

        arsort($assetCounts);
        $mostTraded = array_key_first($assetCounts) ?? 'N/A';
        $winRate    = $totalTrades > 0 ? ($winning / $totalTrades) * 100 : 0;
        $avgVolume  = $totalTrades > 0 ? $totalVolume / $totalTrades : 0;
        $avgProfit  = $totalTrades > 0 ? $totalPnl / $totalTrades : 0;

        return [
            'total_trades'         => $totalTrades,
            'total_volume'         => round($totalVolume, 2),
            'total_fees'           => round($totalFees, 8),
            'total_pnl'            => round($totalPnl, 2),
            'winning_trades'       => $winning,
            'losing_trades'        => $totalTrades - $winning,
            'win_rate'             => round($winRate, 1),
            'avg_trade_value'      => round($avgVolume, 2),
            'avg_profit_per_trade' => round($avgProfit, 2),
            'best_trade_pnl'       => round((float)($bestPnl ?? 0), 2),
            'worst_trade_pnl'      => round((float)($worstPnl ?? 0), 2),
            'most_traded_asset'    => $mostTraded,
        ];
    }

    /**
     * Generates a deterministic set of demo trades for a given agent.
     * The agentId is used to seed variation so different agents look different.
     */
    private function generateDemoTrades(string $agentId): array
    {
        $seed   = crc32($agentId);
        $assets = ['BTC', 'ETH', 'TON', 'SOL', 'TON', 'BTC'];
        $now    = time();
        $trades = [];

        for ($i = 0; $i < 15; $i++) {
            $asset     = $assets[$i % count($assets)];
            $price     = self::BASELINE_PRICES[$asset] ?? 1.0;
            $amount    = round(0.01 + ($seed % 100) * 0.001 + $i * 0.005, 4);
            $value     = round($amount * $price, 2);
            $pnl       = ($i % 3 === 0) ? -round($value * 0.04, 2) : round($value * 0.08, 2);
            $action    = ($i % 2 === 0) ? 'BUY' : 'SELL';
            $timestamp = $now - ($i * 6 * 3600) - ($seed % 3600);

            $trades[] = [
                'id'          => 'trade_' . $agentId . '_' . $i,
                'agent_id'    => $agentId,
                'asset'       => $asset,
                'action'      => $action,
                'price'       => $price,
                'amount'      => $amount,
                'value'       => $value,
                'fee'         => 0.0,
                'pnl'         => $pnl,
                'strategy_id' => 'strategy_' . ($i % 2),
                'confidence'  => round(0.65 + ($i % 4) * 0.08, 2),
                'timestamp'   => $timestamp,
            ];
        }

        return $trades;
    }

    private function filterTrades(array $trades, array $filters): array
    {
        return array_values(array_filter($trades, function (array $t) use ($filters): bool {
            if (!empty($filters['asset']) && $t['asset'] !== $filters['asset']) {
                return false;
            }
            if (!empty($filters['action']) && $t['action'] !== strtoupper($filters['action'])) {
                return false;
            }
            if (!empty($filters['from'])) {
                $from = strtotime($filters['from']);
                if ($from !== false && $t['timestamp'] < $from) {
                    return false;
                }
            }
            if (!empty($filters['to'])) {
                $to = strtotime($filters['to']);
                if ($to !== false && $t['timestamp'] > $to) {
                    return false;
                }
            }
            if (isset($filters['min_value']) && $t['value'] < (float)$filters['min_value']) {
                return false;
            }
            if (isset($filters['max_value']) && $t['value'] > (float)$filters['max_value']) {
                return false;
            }
            return true;
        }));
    }

    // =========================================================================
    // Max Drawdown Computation
    // =========================================================================

    /**
     * Computes maximum drawdown percentage from an equity curve (array of values).
     *
     * Max Drawdown = max(peak - trough) / peak × 100
     *
     * @param  float[] $equityCurve  Sequence of portfolio values or cumulative PnL
     * @return float  Percentage (0–100)
     */
    public function computeMaxDrawdown(array $equityCurve): float
    {
        if (count($equityCurve) < 2) {
            return 0.0;
        }

        $peak        = PHP_FLOAT_MIN;
        $maxDrawdown = 0.0;

        foreach ($equityCurve as $value) {
            $value = (float)$value;
            if ($value > $peak) {
                $peak = $value;
            }
            if ($peak > 0) {
                $drawdown = (($peak - $value) / $peak) * 100;
                if ($drawdown > $maxDrawdown) {
                    $maxDrawdown = $drawdown;
                }
            }
        }

        return $maxDrawdown;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function buildEmptyPortfolio(string $agentId): array
    {
        return [
            'agent_id'            => $agentId,
            'portfolio_value'     => 0.0,
            'total_cost'          => 0.0,
            'profit'              => 0.0,
            'roi'                 => 0.0,
            'unrealized_pnl'      => 0.0,
            'realized_pnl'        => 0.0,
            'day_change'          => 0.0,
            'day_change_percent'  => 0.0,
            'strategy_count'      => 0,
            'open_position_count' => 0,
            'capital_utilization' => 0.0,
            'total_trades'        => 0,
            'win_rate'            => 0.0,
            'last_updated'        => (new DateTime())->format(DateTime::ATOM),
        ];
    }
}
