/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./*.{html,js,ts}",
    "./src/**/*.{html,js,ts}",
    './src/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#15A3D1',
          600: '#0b7ca1',
          700: '#05546E',
        },
      },
    },
  },
  plugins: [],
}

