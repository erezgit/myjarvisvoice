/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: false, // Completely disable dark mode
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}