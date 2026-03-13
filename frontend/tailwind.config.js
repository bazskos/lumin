/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'shine': 'shine 1.5s infinite',
      },
      keyframes: {
        shine: {
          '100%': { left: '125%' },
        }
      }
    },
  },
  plugins: [],
}