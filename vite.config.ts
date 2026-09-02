import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Il sito viene pubblicato su https://<utente>.github.io/<repo>/ (non alla radice),
// quindi base/scope/start_url devono combaciare con il nome del repo GitHub.
// Aggiornare BASE_PATH se in futuro cambia il nome del repo (ora: tricca/Carson).
const BASE_PATH = '/Carson/'

export default defineConfig({
  base: BASE_PATH,
  server: {
    // 6000 è bloccata dai browser Chromium (ERR_UNSAFE_PORT, storicamente riservata a X11).
    port: 6001,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: BASE_PATH,
      scope: BASE_PATH,
      manifest: {
        id: BASE_PATH,
        name: 'Carson',
        short_name: 'Carson',
        description: 'Ore, pagamenti, contributi INPS, tredicesima e ferie di una collaboratrice domestica.',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        background_color: '#c9d8c1',
        theme_color: '#c9d8c1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
