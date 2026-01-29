import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/TradeWar3-ts/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
