import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'mascots/*.svg'],
      manifest: {
        name: 'WriFe Interactive Practice',
        short_name: 'WriFe',
        description: 'Gamified writing and grammar practice for pupils aged 7–14',
        theme_color: '#4A90E2',
        background_color: '#F5F7FA',
        display: 'standalone',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globIgnores: ['mascots/**', '**/*.png'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/rxmitjrbrsqjeymsycoj\.supabase\.co\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
})
