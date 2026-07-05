/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industry: {
          950: '#030712', // deep background slate
          900: '#0b0f19', // card background
          800: '#1e293b', // borders & panels
          700: '#334155', // highlight borders
          50: '#f8fafc'   // text light
        },
        cyber: {
          blue: '#0284c7',   // cyan accent
          teal: '#0d9488',   // system teal
          green: '#10b981',  // health normal
          amber: '#f59e0b',  // status warnings
          red: '#ef4444'     // critical failure
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 10s linear infinite',
        'spin-medium': 'spin 4s linear infinite',
        'spin-fast': 'spin 1.5s linear infinite',
      }
    },
  },
  plugins: [],
}
