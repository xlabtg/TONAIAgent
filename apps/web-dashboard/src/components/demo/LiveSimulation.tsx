'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldIcon } from '@/components/icons';

// Simulated market data
interface MarketData {
  price: number;
  change24h: number;
  volume: number;
  high24h: number;
  low24h: number;
}

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  asset: string;
  amount: number;
  price: number;
  timestamp: Date;
  profit?: number;
}

interface PortfolioAsset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  change: number;
  allocation: number;
}

// Mock price generator
const generatePrice = (basePrice: number, volatility: number = 0.02): number => {
  const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
  return Math.max(0.01, basePrice + change);
};

export function LiveSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [selectedAsset, setSelectedAsset] = useState('TON');

  // Market state
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({
    TON: { price: 5.85, change24h: 2.34, volume: 125000000, high24h: 6.12, low24h: 5.45 },
    NOT: { price: 0.0089, change24h: -1.2, volume: 45000000, high24h: 0.0095, low24h: 0.0085 },
    DOGS: { price: 0.00045, change24h: 5.67, volume: 78000000, high24h: 0.00048, low24h: 0.00042 },
    USDT: { price: 1.0, change24h: 0.01, volume: 500000000, high24h: 1.001, low24h: 0.999 },
  });

  // Portfolio state
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([
    { symbol: 'TON', name: 'Toncoin', amount: 150, value: 877.5, change: 2.34, allocation: 45 },
    { symbol: 'NOT', name: 'Notcoin', amount: 50000, value: 445, change: -1.2, allocation: 23 },
    { symbol: 'DOGS', name: 'Dogs', amount: 500000, value: 225, change: 5.67, allocation: 12 },
    { symbol: 'USDT', name: 'Tether', amount: 400, value: 400, change: 0, allocation: 20 },
  ]);

  // Trade history - use deterministic values for SSR
  const [trades, setTrades] = useState<Trade[]>(() => [
    { id: '1', type: 'buy', asset: 'TON', amount: 10, price: 5.72, timestamp: new Date(1708612500000), profit: 1.3 },
    { id: '2', type: 'sell', asset: 'NOT', amount: 5000, price: 0.0091, timestamp: new Date(1708612200000), profit: 2.1 },
  ]);

  // Price history for chart - use deterministic initial values for SSR
  const [priceHistory, setPriceHistory] = useState<number[]>(() => [
    5.65, 5.72, 5.68, 5.75, 5.82, 5.78, 5.85, 5.91, 5.88, 5.95,
    5.92, 5.89, 5.96, 6.02, 5.98, 5.94, 5.87, 5.93, 5.99, 6.05,
    6.01, 5.97, 5.91, 5.88, 5.94, 6.00, 5.96, 5.89, 5.95, 6.02,
    5.98, 5.92, 5.86, 5.82, 5.88, 5.94, 5.90, 5.84, 5.78, 5.85,
    5.91, 5.87, 5.81, 5.75, 5.82, 5.88, 5.84, 5.79, 5.85, 5.90,
  ]);

  // Performance metrics
  const [metrics, setMetrics] = useState({
    totalValue: 1947.5,
    totalPnL: 147.5,
    pnlPercent: 8.2,
    winRate: 68,
    sharpeRatio: 1.85,
    maxDrawdown: 4.2,
  });

  // Simulation tick
  const tick = useCallback(() => {
    // Update market prices
    setMarketData((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((symbol) => {
        if (symbol !== 'USDT') {
          const newPrice = generatePrice(updated[symbol].price, 0.005);
          const change = ((newPrice - prev[symbol].price) / prev[symbol].price) * 100;
          updated[symbol] = {
            ...updated[symbol],
            price: newPrice,
            change24h: updated[symbol].change24h + change * 0.1,
            high24h: Math.max(updated[symbol].high24h, newPrice),
            low24h: Math.min(updated[symbol].low24h, newPrice),
          };
        }
      });
      return updated;
    });

    // Update price history
    setPriceHistory((prev) => {
      const newHistory = [...prev.slice(1)];
      newHistory.push(marketData[selectedAsset]?.price || 5.85);
      return newHistory;
    });

    // Update portfolio values
    setPortfolio((prev) =>
      prev.map((asset) => ({
        ...asset,
        value: asset.amount * (marketData[asset.symbol]?.price || 1),
        change: marketData[asset.symbol]?.change24h || 0,
      }))
    );

    // Simulate occasional trades
    if (Math.random() < 0.1) {
      const assets = ['TON', 'NOT', 'DOGS'];
      const asset = assets[Math.floor(Math.random() * assets.length)];
      const type = Math.random() > 0.5 ? 'buy' : 'sell';
      const amount = type === 'buy' ? Math.floor(Math.random() * 20) + 5 : Math.floor(Math.random() * 10000) + 1000;
      const price = marketData[asset]?.price || 1;

      const newTrade: Trade = {
        id: Date.now().toString(),
        type,
        asset,
        amount,
        price,
        timestamp: new Date(),
        profit: (Math.random() - 0.3) * 5,
      };

      setTrades((prev) => [newTrade, ...prev.slice(0, 9)]);
    }

    // Update metrics
    setMetrics((prev) => ({
      ...prev,
      totalValue: portfolio.reduce((sum, a) => sum + a.value, 0),
      totalPnL: prev.totalPnL + (Math.random() - 0.45) * 2,
      winRate: Math.min(100, Math.max(50, prev.winRate + (Math.random() - 0.5) * 0.5)),
    }));
  }, [marketData, portfolio, selectedAsset]);

  // Run simulation
  useEffect(() => {
    if (!isRunning) return;

    const intervals = { slow: 2000, normal: 1000, fast: 500 };
    const interval = setInterval(tick, intervals[speed]);

    return () => clearInterval(interval);
  }, [isRunning, speed, tick]);

  const totalValue = portfolio.reduce((sum, a) => sum + a.value, 0);

  return (
    <section className="py-20">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <Badge variant="primary" className="mb-4">
              Live Simulation
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Real-Time Trading Simulation
            </h2>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
              Watch AI agents execute trades based on market conditions.
              Simulated data updates in real-time — no real funds involved.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <Button
              variant={isRunning ? 'danger' : 'primary'}
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? 'Stop Simulation' : 'Start Simulation'}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-muted">Speed:</span>
              {(['slow', 'normal', 'fast'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    speed === s
                      ? 'bg-ton-blue text-white'
                      : 'bg-background-secondary text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 space-y-6">
              {/* Price Chart */}
              <Card variant="feature" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <select
                      value={selectedAsset}
                      onChange={(e) => setSelectedAsset(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-background-secondary border border-border text-foreground"
                    >
                      {Object.keys(marketData).map((symbol) => (
                        <option key={symbol} value={symbol}>
                          {symbol}/USDT
                        </option>
                      ))}
                    </select>
                    <div>
                      <span className="text-2xl font-bold text-foreground">
                        ${marketData[selectedAsset]?.price.toFixed(selectedAsset === 'TON' ? 2 : 6)}
                      </span>
                      <span
                        className={`ml-2 text-sm ${
                          (marketData[selectedAsset]?.change24h || 0) >= 0
                            ? 'text-success'
                            : 'text-error'
                        }`}
                      >
                        {(marketData[selectedAsset]?.change24h || 0) >= 0 ? '+' : ''}
                        {(marketData[selectedAsset]?.change24h || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  {isRunning && (
                    <Badge variant="success" className="animate-pulse">
                      LIVE
                    </Badge>
                  )}
                </div>

                {/* Chart */}
                <div className="h-64 flex items-end justify-between gap-0.5">
                  {priceHistory.map((price, i) => {
                    const min = Math.min(...priceHistory);
                    const max = Math.max(...priceHistory);
                    const range = max - min || 1;
                    const height = ((price - min) / range) * 100;
                    const isUp = i > 0 && price >= priceHistory[i - 1];

                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all duration-300 ${
                          isUp ? 'bg-success' : 'bg-error'
                        }`}
                        style={{ height: `${Math.max(5, height)}%` }}
                      />
                    );
                  })}
                </div>

                {/* Market Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-foreground-muted">24h High</p>
                    <p className="font-medium text-foreground">
                      ${marketData[selectedAsset]?.high24h.toFixed(selectedAsset === 'TON' ? 2 : 6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">24h Low</p>
                    <p className="font-medium text-foreground">
                      ${marketData[selectedAsset]?.low24h.toFixed(selectedAsset === 'TON' ? 2 : 6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">24h Volume</p>
                    <p className="font-medium text-foreground">
                      ${(marketData[selectedAsset]?.volume / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">Volatility</p>
                    <p className="font-medium text-foreground">Medium</p>
                  </div>
                </div>
              </Card>

              {/* Recent Trades */}
              <Card variant="feature" className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Recent Agent Trades</h3>
                <div className="space-y-2">
                  {trades.slice(0, 5).map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background-secondary"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 text-xs rounded font-medium ${
                            trade.type === 'buy'
                              ? 'bg-success/10 text-success'
                              : 'bg-error/10 text-error'
                          }`}
                        >
                          {trade.type.toUpperCase()}
                        </span>
                        <div>
                          <span className="font-medium text-foreground">{trade.asset}</span>
                          <span className="text-foreground-muted ml-2">
                            {trade.amount.toLocaleString()} @ ${trade.price.toFixed(6)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {trade.profit !== undefined && (
                          <span
                            className={`text-sm ${
                              trade.profit >= 0 ? 'text-success' : 'text-error'
                            }`}
                          >
                            {trade.profit >= 0 ? '+' : ''}
                            {trade.profit.toFixed(2)}%
                          </span>
                        )}
                        <p className="text-xs text-foreground-muted">
                          {trade.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Portfolio Summary */}
              <Card variant="feature" className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Portfolio</h3>
                <div className="mb-4">
                  <p className="text-sm text-foreground-muted">Total Value</p>
                  <p className="text-3xl font-bold text-foreground">
                    ${totalValue.toFixed(2)}
                  </p>
                  <p
                    className={`text-sm ${
                      metrics.totalPnL >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)} (
                    {metrics.pnlPercent.toFixed(2)}%)
                  </p>
                </div>

                <div className="space-y-3">
                  {portfolio.map((asset) => (
                    <div key={asset.symbol} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-ton-blue/20 flex items-center justify-center text-xs font-medium text-ton-blue">
                          {asset.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{asset.symbol}</p>
                          <p className="text-xs text-foreground-muted">
                            {asset.allocation.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          ${asset.value.toFixed(2)}
                        </p>
                        <p
                          className={`text-xs ${
                            asset.change >= 0 ? 'text-success' : 'text-error'
                          }`}
                        >
                          {asset.change >= 0 ? '+' : ''}
                          {asset.change.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Performance Metrics */}
              <Card variant="feature" className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Performance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Win Rate</span>
                    <span className="font-medium text-success">
                      {metrics.winRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Sharpe Ratio</span>
                    <span className="font-medium text-foreground">
                      {metrics.sharpeRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Max Drawdown</span>
                    <span className="font-medium text-warning">
                      -{metrics.maxDrawdown.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Card>

              {/* Risk Indicator */}
              <Card variant="feature" className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldIcon size={20} className="text-success" />
                  <h3 className="font-semibold text-foreground">Risk Status</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground-muted">Exposure</span>
                    <Badge variant="success">Safe</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground-muted">Diversification</span>
                    <Badge variant="success">Good</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground-muted">Volatility</span>
                    <Badge variant="warning">Medium</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
