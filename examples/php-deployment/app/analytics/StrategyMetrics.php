<?php
/**
 * TONAIAgent - Strategy Metrics Engine
 *
 * Computes per-strategy performance statistics:
 *   profit, ROI, win rate, trades count, drawdown
 *
 * These metrics power:
 *   - Strategy Marketplace rankings
 *   - Agent leaderboards
 *   - Investor reporting
 *
 * Example usage (from issue):
 *   $metrics = PortfolioAnalytics::calculate($portfolio);
 *   // strategies key contains per-strategy metrics from StrategyMetrics
 */

class StrategyMetrics
{
    private ?object $db;

    public function __construct(?object $db = null)
    {
        $this->db = $db;
    }

    // =========================================================================
    // Strategy Performance Stats
    // =========================================================================

    /**
     * Returns per-strategy performance metrics for a given agent.
     *
     * Each strategy entry:
     * {
     *   "strategy_id": "dca_01",
     *   "strategy_name": "DCA Strategy",
     *   "profit": 1200.00,
     *   "roi": "12.0%",
     *   "win_rate": "65.0%",
     *   "trades_count": 18,
     *   "drawdown": "3.1%",
     *   "avg_trade_profit": 66.67,
     *   "total_volume": 15000.00
     * }
     *
     * @param  string $agentId
     * @return array
     */
    public function getStrategyMetrics(string $agentId): array
    {
        if ($this->db !== null) {
            return $this->getStrategyMetricsFromDb($agentId);
        }

        return [];
    }

    /**
     * Computes strategy metrics from a preloaded array of trade records.
     * Used by PortfolioAnalytics demo mode (no DB).
     *
     * @param  string $agentId
     * @param  array  $trades   Trade records with keys: strategy_id, pnl, value
     * @return array
     */
    public function getDemoStrategyMetrics(string $agentId, array $trades): array
    {
        $byStrategy = [];

        foreach ($trades as $trade) {
            $strategyId = $trade['strategy_id'] ?? 'default';
            if (!isset($byStrategy[$strategyId])) {
                $byStrategy[$strategyId] = [
                    'strategy_id'   => $strategyId,
                    'strategy_name' => $this->guessStrategyName($strategyId),
                    'trades'        => [],
                ];
            }
            $byStrategy[$strategyId]['trades'][] = $trade;
        }

        $result = [];
        foreach ($byStrategy as $strategyId => $data) {
            $result[] = $this->computeFromTrades(
                $strategyId,
                $data['strategy_name'],
                $data['trades']
            );
        }

        // Sort by ROI descending
        usort($result, fn($a, $b) => (float)$b['roi_raw'] <=> (float)$a['roi_raw']);

        // Remove internal helper keys
        return array_map(function (array $m): array {
            unset($m['roi_raw']);
            return $m;
        }, $result);
    }

    // =========================================================================
    // Core Metrics Computation
    // =========================================================================

    /**
     * Computes metrics from an array of trade records for one strategy.
     *
     * @param  string $strategyId
     * @param  string $strategyName
     * @param  array  $trades
     * @return array
     */
    public function computeFromTrades(
        string $strategyId,
        string $strategyName,
        array $trades
    ): array {
        $totalTrades   = count($trades);
        $profit        = 0.0;
        $totalVolume   = 0.0;
        $totalCost     = 0.0;
        $winning       = 0;
        $pnlSeries     = [];

        foreach ($trades as $trade) {
            $pnl    = (float)($trade['pnl'] ?? 0);
            $value  = (float)($trade['value'] ?? 0);
            $action = strtoupper($trade['action'] ?? 'BUY');

            $profit      += $pnl;
            $totalVolume += $value;
            $pnlSeries[]  = $pnl;

            if ($action === 'BUY') {
                $totalCost += $value;
            }

            if ($pnl > 0) {
                $winning++;
            }
        }

        $roi      = $totalCost > 0 ? ($profit / $totalCost) * 100 : 0.0;
        $winRate  = $totalTrades > 0 ? ($winning / $totalTrades) * 100 : 0.0;
        $avgProfit = $totalTrades > 0 ? $profit / $totalTrades : 0.0;
        $drawdown = $this->computeMaxDrawdown($pnlSeries);

        return [
            'strategy_id'      => $strategyId,
            'strategy_name'    => $strategyName,
            'profit'           => round($profit, 2),
            'roi'              => round($roi, 1) . '%',
            'roi_raw'          => $roi,       // internal sort key
            'win_rate'         => round($winRate, 1) . '%',
            'trades_count'     => $totalTrades,
            'drawdown'         => round($drawdown, 2) . '%',
            'avg_trade_profit' => round($avgProfit, 2),
            'total_volume'     => round($totalVolume, 2),
        ];
    }

    // =========================================================================
    // Database Implementation
    // =========================================================================

    private function getStrategyMetricsFromDb(string $agentId): array
    {
        $rows = $this->db->select(
            "SELECT
                strategy_id,
                COUNT(*) AS trades_count,
                SUM(pnl) AS profit,
                SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) AS winning_trades,
                SUM(CASE WHEN action = 'BUY' THEN amount * price ELSE 0 END) AS total_cost,
                SUM(amount * price) AS total_volume
             FROM tonai_trades
             WHERE agent_id = ? AND strategy_id IS NOT NULL
             GROUP BY strategy_id",
            [$agentId]
        ) ?? [];

        $strategies = $this->db->select(
            "SELECT id, name FROM tonai_strategies",
            []
        ) ?? [];

        $nameMap = [];
        foreach ($strategies as $s) {
            $nameMap[$s['id']] = $s['name'];
        }

        $result = [];
        foreach ($rows as $row) {
            $strategyId   = $row['strategy_id'];
            $strategyName = $nameMap[$strategyId] ?? $this->guessStrategyName($strategyId);
            $totalTrades  = (int)$row['trades_count'];
            $profit       = (float)$row['profit'];
            $totalCost    = (float)$row['total_cost'];
            $winning      = (int)$row['winning_trades'];
            $totalVolume  = (float)$row['total_volume'];

            $roi      = $totalCost > 0 ? ($profit / $totalCost) * 100 : 0.0;
            $winRate  = $totalTrades > 0 ? ($winning / $totalTrades) * 100 : 0.0;
            $avgProfit = $totalTrades > 0 ? $profit / $totalTrades : 0.0;

            // Drawdown requires the equity series — fetch it
            $pnlSeries = $this->fetchStrategyPnlSeries($agentId, $strategyId);
            $drawdown  = $this->computeMaxDrawdown($pnlSeries);

            $result[] = [
                'strategy_id'      => $strategyId,
                'strategy_name'    => $strategyName,
                'profit'           => round($profit, 2),
                'roi'              => round($roi, 1) . '%',
                'win_rate'         => round($winRate, 1) . '%',
                'trades_count'     => $totalTrades,
                'drawdown'         => round($drawdown, 2) . '%',
                'avg_trade_profit' => round($avgProfit, 2),
                'total_volume'     => round($totalVolume, 2),
            ];
        }

        // Sort by profit descending
        usort($result, fn($a, $b) => $b['profit'] <=> $a['profit']);

        return $result;
    }

    private function fetchStrategyPnlSeries(string $agentId, string $strategyId): array
    {
        $rows = $this->db->select(
            'SELECT pnl FROM tonai_trades WHERE agent_id = ? AND strategy_id = ? ORDER BY created_at ASC',
            [$agentId, $strategyId]
        ) ?? [];

        return array_column($rows, 'pnl');
    }

    // =========================================================================
    // Max Drawdown Helper
    //
    // Same algorithm as PortfolioAnalytics::computeMaxDrawdown but
    // kept here for self-containment (StrategyMetrics has no dependency
    // on PortfolioAnalytics to avoid circular includes).
    // =========================================================================

    /**
     * Computes maximum drawdown percentage from a PnL series.
     *
     * @param  float[] $pnlSeries  Per-trade PnL values (not cumulative)
     * @return float  Percentage (0–100)
     */
    public function computeMaxDrawdown(array $pnlSeries): float
    {
        if (count($pnlSeries) < 2) {
            return 0.0;
        }

        // Build cumulative equity curve from PnL series
        $equity  = [];
        $running = 0.0;
        foreach ($pnlSeries as $pnl) {
            $running  += (float)$pnl;
            $equity[]  = $running;
        }

        $peak        = PHP_FLOAT_MIN;
        $maxDrawdown = 0.0;

        foreach ($equity as $value) {
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

    private function guessStrategyName(string $strategyId): string
    {
        $map = [
            'dca'                => 'DCA Strategy',
            'yield_farming'      => 'Yield Farming',
            'liquidity'          => 'Liquidity Management',
            'rebalancing'        => 'Rebalancing',
            'arbitrage'          => 'Arbitrage',
            'momentum'           => 'Momentum',
            'trend'              => 'Trend Following',
            'mean_reversion'     => 'Mean Reversion',
            'default'            => 'Default Strategy',
        ];

        foreach ($map as $key => $name) {
            if (stripos($strategyId, $key) !== false) {
                return $name;
            }
        }

        return ucwords(str_replace(['_', '-'], ' ', $strategyId));
    }
}
