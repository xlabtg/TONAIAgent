# Agent Runtime

The Agent Runtime is the core execution engine of TONAIAgent. Each AI agent follows a deterministic 9-step pipeline that fetches market data, applies a strategy, validates risk, and records the outcome.

## Execution Pipeline

```
fetch_market_data      → retrieve latest prices from market data providers
load_agent_memory      → load agent state, position history, and context
call_ai_model          → invoke AI model to interpret market signals
validate_risk          → enforce risk limits (position size, drawdown, exposure)
generate_trade_plan    → produce a trade action (buy / sell / hold)
simulate_transaction   → dry-run the trade against the simulated engine
execute_trade          → submit the trade (simulation or live)
record_results         → persist trade outcome to portfolio database
update_analytics       → recalculate portfolio metrics (PnL, ROI, equity curve)
```

## Agent States

An agent transitions through the following states during its lifecycle:

```
created → starting → running → stopping → stopped
                        ↓
                     error → stopped
```

## Source

- `src/agent-runtime/` — core runtime implementation
- `src/agent-runtime/index.ts` — main entry point
- `src/agent-runtime/types.ts` — type definitions

## Related Documentation

- [Architecture Overview](architecture.md)
- [Strategy Development](strategy-development.md)
- [MVP Architecture](mvp-architecture.md)
