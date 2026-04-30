import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/gg-api': {
        target: 'https://api.gitguardian.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/gg-api/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[GG proxy]', err))
        },
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'recharts'
          if (id.includes('node_modules/react')) return 'react-vendor'
        },
      },
    },
  },
})
