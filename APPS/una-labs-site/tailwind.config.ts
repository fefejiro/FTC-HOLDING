import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#4DB8A8',
          'teal-light': '#E6F7F5',
          orange: '#FF3D00',
          'orange-light': '#FFF0EC',
          'orange-hover': '#E63500',
        },
        bg: {
          white: '#FFFFFF',
          offwhite: '#F8FAFB',
          subtle: '#F5F7FA',
          hover: '#F0F2F5',
        },
        tx: {
          heading: '#0B0E11',
          body: '#3D424B',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        border: {
          DEFAULT: '#E5E7EB',
          hover: '#D1D5DB',
          focus: '#4DB8A8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['64px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display': ['48px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-sm': ['40px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'h2': ['32px', { lineHeight: '1.25', fontWeight: '700' }],
        'h3': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'h4': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.7', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'eyebrow': ['12px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.08em' }],
      },
      spacing: {
        '18': '72px',
        '22': '88px',
        '26': '104px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0,0,0,0.04)',
        'sm': '0 2px 8px rgba(0,0,0,0.06)',
        'md': '0 4px 16px rgba(0,0,0,0.08)',
        'lg': '0 8px 32px rgba(0,0,0,0.10)',
        'xl': '0 20px 48px rgba(0,0,0,0.12)',
        'teal': '0 4px 16px rgba(77,184,168,0.25)',
        'orange': '0 4px 16px rgba(255,61,0,0.25)',
      },
      maxWidth: {
        'content': '1180px',
        'narrow': '720px',
        'tight': '540px',
      },
    },
  },
  plugins: [],
};

export default config;
