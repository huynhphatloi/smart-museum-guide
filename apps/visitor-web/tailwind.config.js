/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      colors: {
        museum: {
          bg: '#faf8f5',
          ink: '#1c1917',
          muted: '#78716c',
          line: '#e7e2da',
          accent: '#7c5c3e',
        },
      },
    },
  },
  plugins: [],
};
