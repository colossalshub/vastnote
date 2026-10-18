import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: '/',
        name: 'Vastnote',
        short_name: 'Vastnote',
        description: 'A private workspace for tasks, notes, and what matters today.',
        theme_color: '#101114',
        background_color: '#101114',
        display: 'standalone',
        display_override: ['standalone', 'browser'],
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['productivity', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Capture',
            short_name: 'Capture',
            url: '/inbox?capture=1',
            description: 'Capture a thought',
          },
          {
            name: 'Today',
            short_name: 'Today',
            url: '/',
            description: 'Open today',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        clientsClaim: true,
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    restoreMocks: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
