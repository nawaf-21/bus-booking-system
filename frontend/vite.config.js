import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // API_PROXY_TARGET has no VITE_ prefix, so it is only used by the dev
  // server here and is never bundled into the browser code.
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.API_PROXY_TARGET || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    }
  }
})
