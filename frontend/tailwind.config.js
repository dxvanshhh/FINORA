/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finora: {
          dark: '#0F172A',
          gold: '#D4AF37',
          slate: '#1E293B',
          light: '#F8FAFC',
          card: '#1e293b'
        }
      }
    },
  },
  plugins: [],
}
