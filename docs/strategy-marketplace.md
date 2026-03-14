# Strategy Marketplace

The Strategy Marketplace is a decentralized ecosystem where strategy developers publish algorithmic trading strategies, users discover and deploy them, and developers earn revenue based on usage.

For comprehensive marketplace documentation see [marketplace.md](marketplace.md).

## Strategy Lifecycle

```
Developer creates strategy using Developer SDK
         ↓
Strategy is backtested and validated
         ↓
Developer publishes strategy to marketplace
         ↓
Strategy appears in marketplace with metadata
         ↓
Users browse and deploy strategy to their agents
         ↓
Performance is tracked and reputation score updated
         ↓
Developer earns revenue share from deployed strategies
```

## Reputation & Ranking

Every strategy accumulates a reputation score based on:

- **Risk-adjusted return** — Sharpe ratio, max drawdown
- **Consistency** — performance across different market conditions
- **Adoption** — number of active deployments
- **Longevity** — duration the strategy has been live

Strategies are ranked in the marketplace based on their reputation score.

## Revenue Sharing

Strategy authors define a `revenueSharePercent` when publishing. Each time a user deploys a strategy and the strategy generates activity, the platform distributes fees according to the configured revenue share.

## Source

- `src/strategy-marketplace/` — marketplace implementation
- `src/reputation/` — reputation engine
- `src/revenue/` — revenue sharing system

## Related Documentation

- [Marketplace Details](marketplace.md)
- [Strategy Development](strategy-development.md)
- [Developer Guide](developer.md)
