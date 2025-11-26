import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import { vitePluginForArco } from '@arco-plugins/vite-react'
import { inspectorServer } from '@react-dev-inspector/vite-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/BDdraw_DEV/',
  plugins: [
    svgr({
      exportAsDefault: true,
    }),
    vitePluginForArco(),
    react(),
    inspectorServer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      src: path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5000,
    proxy: {
      // 示例：将 /api 开头的请求代理到 http://localhost:3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 示例：将 /backend 开头的请求代理到远程服务器
      '/backend': {
        target: 'https://your-production-api.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, '/api'),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['lodash', 'dayjs'],
        },
      },
    },
  },
})
