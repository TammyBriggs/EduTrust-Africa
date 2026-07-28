/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        darkBg: '#0B0F19', // Deep sleek dark background
        accentCyan: '#06b6d4',
        accentPurple: '#8b5cf6',
      }
    },
  },
  plugins: [],
}
