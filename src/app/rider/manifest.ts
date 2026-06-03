import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CampusBites Rider App',
    short_name: 'Rider App',
    description: 'Food Delivery App for Riders',
    start_url: '/rider/login',
    display: 'standalone',
    background_color: '#F0FDF4',
    theme_color: '#16A34A',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
