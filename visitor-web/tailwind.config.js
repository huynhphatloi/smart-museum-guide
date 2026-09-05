/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Avenir Next', 'Avenir', 'Segoe UI', 'sans-serif'],
        serif: ['Iowan Old Style', 'Baskerville', 'Georgia', 'serif'],
      },
      colors: {
        museum: {
          bg: '#f1ede4',
          paper: '#faf7f0',
          ink: '#201d19',
          muted: '#70695f',
          line: '#d7cfc2',
          accent: '#8c392f',
          deep: '#5e261f',
          brass: '#a77c42',
          'brass-soft': '#e8ddca',
        },
      },
    },
  },
  plugins: [],
};
