import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API is reached through a proxy so no CORS setup is needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:8000';
  const proxy = { '/api': { target, changeOrigin: true }, '/media': { target, changeOrigin: true } };
  return {
    plugins: [react()],
    server: { port: 5173, host: true, proxy },
    preview: { port: 5173, host: true, proxy },
  };
});
