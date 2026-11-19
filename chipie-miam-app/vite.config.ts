import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/chipie_miam/' : '/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'chipie-avatar.jpeg', 'images/**/*'],
      manifest: {
        name: 'Chipie Miam',
        short_name: 'Chipie Miam',
        description: 'Guide alimentaire pour lapin domestique',
        lang: 'fr',
        // identifiant stable de l'app, indépendant de l'adresse de départ
        id: '/chipie_miam/',
        theme_color: '#0d0d0d', // identique à la balise <meta name="theme-color"> d'index.html
        background_color: '#0d0d0d',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          // chemins relatifs : l'app est servie depuis /chipie_miam/, pas depuis la racine du site
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          // Android rogne cette version en cercle ou en carré arrondi : le visage reste au centre
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // Polices : seulement le latin (français), pas le cyrillique ni le vietnamien, pour rester léger hors-ligne
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,webp,svg,json}', '**/*-latin-*.woff2'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
}))
