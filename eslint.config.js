import eslintConfigPrettier from 'eslint-config-prettier';
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    // Global ignores - these apply to all configurations
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/server-bundle/**',
      '**/*.min.js',
      '**/*.bundle.js',
      'eslint.config.js',
    ],
  },
  {
    // Custom rules go here
    rules: {
      'no-shadow': 'off',
    },
  },
]);
