/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fcf9f5',
          100: '#f9f2ea',
          200: '#e6c5a3',
          300: '#c79d70',
          400: '#9f7d58',
          500: '#765c40',
          600: '#604b34',
          700: '#4c3a27',
          800: '#362a1c',
          900: '#261c11',
          950: '#161009',
        },
        secondary: {
          50: '#f6f0e6',
          100: '#eddec4',
          200: '#cfb588',
          300: '#bb9f6e',
          400: '#a6916c',
          500: '#827153',
          600: '#5c4f3a',
          700: '#493f2f',
          800: '#362e20',
          900: '#221d14',
          950: '#141009',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
