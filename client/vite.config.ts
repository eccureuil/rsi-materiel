import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const host = env.VITE_HOST === undefined || env.VITE_HOST === 'true'
    ? true
    : env.VITE_HOST === 'false'
      ? false
      : env.VITE_HOST;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host,
      port: env.VITE_PORT ? Number(env.VITE_PORT) : 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET ?? 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});