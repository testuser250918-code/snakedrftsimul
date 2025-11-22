/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: '#000000',
        surface: '#1F1F1F',
        primary: '#00FFA3',
        'text-main': '#FFFFFF',
        'text-sub': '#B0B0B0',
      },
    },
  },
  plugins: [],
}
