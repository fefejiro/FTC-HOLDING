import type { Config } from 'tailwindcss';

export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dispatch: {
          bg: '#0a0f1a',
          surface: '#111827',
          border: '#1e2d40',
          orange: '#f97316',
          'orange-dim': 'rgba(249,115,22,0.15)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
