import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the same build works on GitHub Pages (/<repo>/) and locally.
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Proofs From the Ground Up',
        short_name: 'Proofs',
        description: 'An interactive web edition of Proofs From the Ground Up.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6f3ee',
        theme_color: '#D2553C',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // Text, maths and code are precached so every chapter reads offline.
        // Book figures (about 700 SVGs) are cached as they are first viewed.
        globPatterns: ['**/*.{js,css,html,woff2,json}', 'icon.svg'],
        globIgnores: ['figures/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/figures/'),
            handler: 'CacheFirst',
            options: { cacheName: 'book-figures', expiration: { maxEntries: 1000 } },
          },
        ],
      },
    }),
  ],
});
