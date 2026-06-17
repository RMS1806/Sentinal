import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-maplibre': ['maplibre-gl'],
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-misc': ['zustand', 'h3-js', 'clsx'],
        },
      },
    },
  },
})
