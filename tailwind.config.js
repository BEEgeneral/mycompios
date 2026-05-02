/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'my-navy': '#2D3261',
        'my-gold': '#FFD154',
        'my-light': '#FCF9F1',
      },
    },
  },
  plugins: [],
}
