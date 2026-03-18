/** @mvp MVP connector — market data price feeds (CoinGecko, Binance) and real-time streaming (Issue #251) */
// Market Data Connectors — price feeds, oracle integrations, and real-time streaming
// Market data provider implementations are in core/market-data/base/providers/
export { CoinGeckoProvider } from '../../core/market-data/base/providers/coingecko';
export { BinanceProvider } from '../../core/market-data/base/providers/binance';

// TON DEX Connectors (DeDust, STON.fi, TONCO)
export { DedustProvider, createDedustProvider } from '../../core/market-data/base/connectors/dedust';
export { StonfiProvider, createStonfiProvider } from '../../core/market-data/base/connectors/stonfi';
export { ToncoProvider, createToncoProvider } from '../../core/market-data/base/connectors/tonco';
export { MarketDataAggregator, createMarketDataAggregator } from '../../core/market-data/base/connectors/aggregator';

// Real-time streaming (Issue #251)
export {
  MarketDataStream,
  createMarketDataStream,
  DEFAULT_STREAM_CONFIG,
} from '../../core/market-data/base/streaming';
export type {
  PriceTick,
  PriceTickHandler,
  StreamUnsubscribe,
  MarketDataStreamConfig,
  MarketDataStreamEvent,
  MarketDataStreamEventHandler,
  MarketDataStreamEventType,
} from '../../core/market-data/base/streaming';

// Market Data Stream Service
export {
  MarketDataStreamService,
  createMarketDataStreamService,
  DEFAULT_SERVICE_CONFIG as DEFAULT_STREAM_SERVICE_CONFIG,
} from '../../services/market-data-stream';
export type { MarketDataStreamServiceConfig } from '../../services/market-data-stream';
