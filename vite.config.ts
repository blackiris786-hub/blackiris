import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    // Disable sourcemaps in production for security
    sourcemap: false,
    // Enable minification and obfuscation
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
      mangle: true, // Mangle variable names
      format: {
        comments: false, // Remove comments
      },
    },
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown required function format
        manualChunks(id: string) {
          if (id.includes('firebase')) return 'firebase-ai-core';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});