import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InstructAI',
    short_name: 'InstructAI',
    description: 'Gestão de conhecimento com IA',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#5e6ad2',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
