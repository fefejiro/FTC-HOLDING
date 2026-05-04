import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Una Labs — AI Launchpad for Founders',
    short_name: 'Una Labs',
    description:
      'Una Labs is an AI-powered professional service platform for founders. Structured intake, clear proposals, governed delivery, and measurable proof.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F7FA',
    theme_color: '#4DB8A8',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
