/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        highlight: 'var(--highlight-color)',
        text: 'var(--text-color)',
        secondary: 'var(--text-secondary)',
      },
    },
  },
  plugins: [],
};
