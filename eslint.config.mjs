import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const noAiPromptConcat = require('./eslint-local-rules/no-ai-prompt-concat.js');

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'apps/web-dashboard/**',
      'apps/marketing-website/**',
      'apps/telegram-miniapp/**',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  },
  {
    files: ['config/**/*.ts', 'core/**/*.ts', 'apps/**/*.ts', 'extended/**/*.ts', 'services/**/*.ts', 'connectors/**/*.ts', 'packages/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      ...tseslint.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-case-declarations': 'off',
      'no-constant-condition': 'off',
      'prefer-const': 'off',
    },
  },
  // AI prompt-injection safety rule: flags template-literal/concatenation in
  // system-role message content inside files that import an AI SDK.
  {
    files: ['core/ai/**/*.ts', 'services/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.spec.ts'],
    plugins: {
      local: { rules: { 'no-ai-prompt-concat': noAiPromptConcat } },
    },
    rules: {
      'local/no-ai-prompt-concat': 'error',
    },
  },
];
