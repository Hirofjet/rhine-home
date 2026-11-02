import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // 把不常变化的运行时拆成独立 chunk，利用浏览器长期缓存
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router')
          ) {
            return 'react'
          }
          if (
            id.includes('framer-motion') ||
            id.includes('node_modules/motion-dom') ||
            id.includes('node_modules/motion-utils')
          ) {
            return 'motion'
          }
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
    // 本地开发把接口与上传文件转发到后端（server/index.mjs）
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
})
