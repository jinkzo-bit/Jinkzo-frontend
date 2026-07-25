import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],

  // ── Development server proxy ───────────────────────────
  // In dev, forward /api/* to the backend so you never hit CORS issues
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },

  // ── Production Build Optimizations ────────────────────
  build: {
    // Output directory (default is 'dist')
    outDir: 'dist',

    // Disable source maps in production (prevents code exposure)
    sourcemap: mode !== 'production',

    // Minify with esbuild (fastest) in production
    minify: mode === 'production' ? 'esbuild' : false,

    // Chunk splitting — large vendor libraries go into separate cached chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached separately, rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['framer-motion', 'lucide-react'],
          // State management
          'vendor-state': ['zustand'],
        }
      }
    },

    // Warn when a chunk exceeds 600KB
    chunkSizeWarningLimit: 600,

    // Asset inlining threshold (files < 4KB inlined as base64)
    assetsInlineLimit: 4096,
  },

  // ── Preview server (after build) ───────────────────────
  preview: {
    port: 4173,
    strictPort: true,
  }
}))
