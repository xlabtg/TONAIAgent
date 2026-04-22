import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude Blueprint / @ton/sandbox contract tests — these require the
    // Blueprint build toolchain and the compiled Tact wrappers to be present.
    // Run them separately with: npx blueprint test (locally) or via the
    // dedicated CI job in .github/workflows/contracts.yml.
    exclude: [
      '**/node_modules/**',
      '**/contracts/tests/**',
    ],
  },
});
