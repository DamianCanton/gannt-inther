/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gantt-bar': '#4472C4',
        'gantt-weekend': '#F2F2F2',
        'gantt-header': '#D9E1F2',
        'gantt-border': '#D0D0D0',
        'gantt-critical': '#FF0000',
      },
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      print: { raw: 'print' },
    },
  },
  plugins: [],
}
