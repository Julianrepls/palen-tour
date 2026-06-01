import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// En dev, Vite necesita 'unsafe-inline' y 'unsafe-eval' para HMR; en producción
// vercel.json sirve una CSP más estricta sin esos relajamientos.
const devCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.unsplash.com",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https://*.supabase.co wss://*.supabase.co https://images.unsplash.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Content-Security-Policy': devCSP,
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: el SW nuevo se instala y toma control sin pedir confirmación.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'icons.svg'],
      manifest: {
        name: 'Palen Tour — Viajes y excursiones en grupo',
        short_name: 'Palen Tour',
        description: 'Viajes y excursiones en grupo. Montaña, mar y naturaleza.',
        lang: 'es',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        // Precachea el app shell (HTML/JS/CSS/imágenes del build) para arranque offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // SPA: cualquier navegación offline devuelve index.html (React Router resuelve la ruta).
        navigateFallback: '/index.html',
        // No interceptar rutas de API ni del propio SW.
        navigateFallbackDenylist: [/^\/api/, /^\/functions/],
        runtimeCaching: [
          {
            // Imágenes de viajes servidas desde Unsplash: cache-first, válidas 30 días.
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Lecturas REST de Supabase (viajes, etc.): network-first con fallback a caché.
            // Si hay red, datos frescos; si no, lo último que se vio.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // En dev el SW está activado para poder probarlo con `npm run dev`.
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: { headers: securityHeaders },
  preview: { headers: securityHeaders },
})
