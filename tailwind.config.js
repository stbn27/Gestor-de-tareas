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
        primary: {
          DEFAULT: '#12B8B2',
          600: '#0F9590',
          700: '#0B6B68',
        },
      },
    },
  },
  plugins: [],
}

