import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/static/react/',
  root: resolve(__dirname, 'ui'),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'static/react'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'ui/index.html'),
        accounts: resolve(__dirname, 'ui/accounts.html'),
        cashFlow: resolve(__dirname, 'ui/cash-flow.html'),
        mortgage: resolve(__dirname, 'ui/mortgage.html')
      }
    }
  }
});
