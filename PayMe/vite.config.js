import { defineConfig } from 'vite';

export default defineConfig({
  base: '/PayMe/',  // Base path for GitHub Pages deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          }
          return `${extType}/[name]-[hash][extname]`;
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});