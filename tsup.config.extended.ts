import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'extended/marketplace/index': 'extended/marketplace/index.ts',
    'extended/no-code/index': 'extended/no-code/index.ts',
    'extended/mobile-ux/index': 'extended/mobile-ux/index.ts',
    'extended/superapp/index': 'extended/superapp/index.ts',
    'extended/personal-finance/index': 'extended/personal-finance/index.ts',
    'extended/growth/index': 'extended/growth/index.ts',
    'extended/launchpad/index': 'extended/launchpad/index.ts',
    'extended/mvp/index': 'extended/mvp/index.ts',
    'extended/production-miniapp/index': 'extended/production-miniapp/index.ts',
    'extended/tokenomics/index': 'extended/tokenomics/index.ts',
    'extended/institutional/index': 'extended/institutional/index.ts',
    'extended/hedgefund/index': 'extended/hedgefund/index.ts',
    'extended/rwa/index': 'extended/rwa/index.ts',
    'extended/monetary-policy/index': 'extended/monetary-policy/index.ts',
    'extended/fund-manager/index': 'extended/fund-manager/index.ts',
  },
  outDir: 'dist',
  format: ['cjs', 'esm'],
});
