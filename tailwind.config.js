/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: '#39FF14',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'VT323', 'monospace'],
      },
    },
  },
  plugins: [],
}
