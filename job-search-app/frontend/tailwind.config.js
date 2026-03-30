/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0e0e0e',
          1: '#1a1a1a',
          2: '#242424',
          3: '#2e2e2e',
        },
        outline: {
          DEFAULT: '#2c2c2c',
          subtle: '#1e1e1e',
          bold: '#3a3a3a',
        },
        accent: {
          DEFAULT: '#c9462a',
          light: '#e05030',
          ghost: 'rgba(201,70,42,0.12)',
        },
        ink: {
          DEFAULT: '#ebebeb',
          muted: '#7f7f7f',
          faint: '#404040',
        },
        ok:   '#22c55e',
        warn: '#f59e0b',
        fail: '#ef4444',
        info: '#60a5fa',
      },
      fontFamily: {
        display: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
