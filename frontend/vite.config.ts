import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/components'),
      '@css': path.resolve(__dirname, './src/css'),
      '@customTypes': path.resolve(__dirname, './src/types'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@images': path.resolve(__dirname, './src/images'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://lp.pektezol.dev/',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
  },
})