/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary action color — deep forest green (was brown/tan)
        brand: {
          50: '#f0f7f3',
          100: '#dcebe2',
          200: '#b7d7c6',
          300: '#8cbea7',
          400: '#5a9b7c',
          500: '#2F6F4E',
          600: '#25573D',
          700: '#1e4731',
          800: '#173627',
          900: '#11281c',
          950: '#0a1710',
        },
        // Neutral/ink scale used for text, borders, surfaces (was brown/tan)
        secondary: {
          50: '#f4f6f5',
          100: '#e8ebe9',
          200: '#d3d9d6',
          300: '#aab3ae',
          400: '#7d8a83',
          500: '#56655d',
          600: '#3f4b44',
          700: '#2d3730',
          800: '#1f2922',
          900: '#16241F',
          950: '#0c1410',
        },
        // Warm secondary accent — terracotta, for candidate-facing flows
        // and highlights that shouldn't compete with the primary green
        accent: {
          50: '#fdf3ee',
          100: '#fbe3d6',
          200: '#f3c2a8',
          300: '#e89d74',
          400: '#d87a4a',
          500: '#C0562C',
          600: '#a04521',
          700: '#7f371b',
          800: '#622a15',
          900: '#4a200f',
        },
        surface: 'var(--app-bg, #F8F9FA)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      }
    },
  },
  plugins: [],
}
