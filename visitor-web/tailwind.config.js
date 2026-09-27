/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Be Vietnam Pro', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      colors: {
        museum: {
          bg: '#f5f2eb',
          paper: '#fbfaf6',
          ink: '#22211e',
          muted: '#66635e',
          line: '#d9d5cd',
          accent: '#803e31',
          deep: '#522c26',
          brass: '#a77c42',
          'brass-soft': '#e8ddca',
        },
      },
    },
  },
  plugins: [],
};
