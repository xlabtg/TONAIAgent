import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

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
    files: ['core/**/*.ts', 'apps/**/*.ts', 'extended/**/*.ts', 'services/**/*.ts', 'connectors/**/*.ts', 'packages/**/*.ts'],
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
];
