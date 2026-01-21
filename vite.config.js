import { defineConfig } from 'vite';

export default defineConfig({
  base: '/PayMe/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  define: {
    'process.env': {}
  }
});