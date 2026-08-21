import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Vite Configuration with Enterprise PWA Integration
 * 
 * Configures Workbox service worker caching strategies:
 * - SAFE CACHING: Static application shell (HTML, CSS, JS, Fonts, Brand SVGs)
 * - SECURITY RULE: Financial API routes (/api/*) are strictly NetworkOnly to ensure zero caching of sensitive data.
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'FinanceFlow AI Logo.png',
        'FinanceFlow AI Logo-favicon.png',
        'favicon.svg',
        'icons.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'apple-touch-icon.png'
      ],
      manifest: {
        name: 'FinanceFlow AI — Agentic Financial Operations Platform',
        short_name: 'FinanceFlow AI',
        description: 'Agentic Repayment & Financial Operations Platform with AI-driven reconciliation, risk assessment, and human-in-the-loop workflows.',
        theme_color: '#4f46e5',
        background_color: '#0b0f17',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Security constraint: Explicitly prevent caching financial backend APIs
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // STRICT NETWORK-ONLY FOR ALL FINANCIAL & AI API CALLS
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: {
              backgroundSync: undefined // Strictly no automated background sync queueing of sensitive writes
            }
          },
          {
            // Google Fonts stylesheets (StaleWhileRevalidate)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            // Google Fonts webfont files (CacheFirst)
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Year
              }
            }
          },
          {
            // Static image & icon assets
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-image-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ]
});
