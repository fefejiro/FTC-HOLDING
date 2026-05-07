/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        gc: {
          ink: '#0e1a14',
          moss: '#1f4d3a',
          leaf: '#2f7a55',
          mint: '#e8f3ec',
          cream: '#f7f5ef',
          gold: '#c89a3a'
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif']
      },
      maxWidth: {
        prose: '70ch'
      }
    }
  },
  plugins: []
};
