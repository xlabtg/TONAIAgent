import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'research/acms/index': 'research/acms/index.ts',
    'research/agfi/index': 'research/agfi/index.ts',
    'research/agfn/index': 'research/agfn/index.ts',
    'research/gaamp/index': 'research/gaamp/index.ts',
    'research/gaei/index': 'research/gaei/index.ts',
    'research/grif/index': 'research/grif/index.ts',
    'research/sgia/index': 'research/sgia/index.ts',
    'research/aifos/index': 'research/aifos/index.ts',
  },
  outDir: 'dist',
  format: ['cjs', 'esm'],
});
