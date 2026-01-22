/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-lime': '#CCFF00',
        'chrome': '#C0C0C0',
      },
    },
  },
  plugins: [],
}
