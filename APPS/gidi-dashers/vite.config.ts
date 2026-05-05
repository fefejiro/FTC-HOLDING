import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Gidi Dashers',
        short_name: 'Gidi Dashers',
        description: 'Lagos endless runner. Dodge danfo, molue, LASTMA. Stack naira.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  build: {
    target: 'es2022',
    sourcemap: true
  },
  server: {
    host: true,
    port: 5173
  }
});
