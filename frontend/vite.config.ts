import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@api': resolve(__dirname, 'src/api'),
      '@state': resolve(__dirname, 'src/state'),
      '@map': resolve(__dirname, 'src/map'),
      '@layers': resolve(__dirname, 'src/layers'),
      '@panels': resolve(__dirname, 'src/panels'),
      '@components': resolve(__dirname, 'src/components'),
    },
  },
  server: {
    port: 5200,
    strictPort: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
      '/events': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          preact: ['preact', '@preact/signals'],
          deckgl: ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/geo-layers'],
          maplibre: ['maplibre-gl'],
          d3: ['d3-force', 'd3-scale'],
        },
      },
    },
  },
});
