import type { MetadataRoute } from 'next'

// L'app sulla schermata home del telefono (Android): nome, colori e icone
// (public/icon-*.png; «maskable» e' quella a tutto campo, per le icone tonde).
// Su iPhone l'icona e' public/apple-touch-icon.png (app/layout.tsx).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Passion CRM',
    short_name: 'Passion CRM',
    description: 'Il CRM di Passion Fitness',
    start_url: '/dashboard',
    display: 'browser',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
