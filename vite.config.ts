import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/static/react/',
  root: resolve(__dirname, 'frontend'),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'static/react'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'frontend/index.html'),
        accounts: resolve(__dirname, 'frontend/accounts.html'),
        cashFlow: resolve(__dirname, 'frontend/cash-flow.html'),
        mortgage: resolve(__dirname, 'frontend/mortgage.html')
      }
    }
  }
});
