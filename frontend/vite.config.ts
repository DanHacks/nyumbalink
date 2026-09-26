import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Hostnames the dev server may be reached through (LAN IP, reverse proxy, tunnel domain).
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.150.171',
      'nyumba.hytechsolution.co.ke',
      '.hytechsolution.co.ke',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
