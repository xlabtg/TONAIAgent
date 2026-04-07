import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'packages/sdk/index': 'packages/sdk/index.ts',
    'apps/mvp-platform/index': 'apps/mvp-platform/index.ts',
    'examples/demo-agent/index': 'examples/demo-agent/index.ts',
    'examples/investor-demo/index': 'examples/investor-demo/index.ts',
  },
  outDir: 'dist',
  format: ['cjs', 'esm'],
});
