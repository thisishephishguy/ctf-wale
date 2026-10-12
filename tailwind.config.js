/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#030712',
          gray: '#111827',
          card: '#1f2937',
          accent: '#22c55e',
          glow: '#4ade80',
          danger: '#ef4444',
          warning: '#f59e0b',
          info: '#06b6d4',
          purple: '#a855f7'
        }
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace', 'ui-monospace'],
      }
    },
  },
  plugins: [],
}
