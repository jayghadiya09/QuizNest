/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // User Requested Custom Palette
        brand: {
          50: '#F3F9FD',
          100: '#E5F1FB',
          200: '#B8E1FF',
          300: '#4CC2FF', // Accent Sky Cyan (#4CC2FF)
          400: '#2899F5', // Secondary Azure (#2899F5)
          500: '#0F6CBD', // Primary Deep Blue (#0F6CBD)
          600: '#0C5697',
          700: '#094171',
          800: '#062B4B',
          900: '#041C33',
          950: '#0B131B',
        },
        slate: {
          850: '#121E2A',
          950: '#0B131B'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
