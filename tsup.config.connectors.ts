import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'connectors/ton-factory/index': 'connectors/ton-factory/index.ts',
    'connectors/liquidity-network/index': 'connectors/liquidity-network/index.ts',
    'connectors/liquidity-router/index': 'connectors/liquidity-router/index.ts',
    'connectors/cross-chain-liquidity/index': 'connectors/cross-chain-liquidity/index.ts',
    'connectors/ipls/index': 'connectors/ipls/index.ts',
    'connectors/signals/index': 'connectors/signals/index.ts',
  },
  outDir: 'dist',
  format: ['cjs', 'esm'],
});
