import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  // In production, VITE_API_BASE points at the Render server URL.
  // In dev, the proxy above handles /api requests.
  define: mode === 'production' && process.env.VITE_API_BASE
    ? { 'import.meta.env.VITE_API_BASE': JSON.stringify(process.env.VITE_API_BASE) }
    : {},
}));
