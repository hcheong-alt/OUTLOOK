import flowbitePlugin from 'flowbite/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,ts}',
    './node_modules/flowbite/lib/esm/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: [
          '"Inter Variable"',
          'Roboto',
          'sans-serif',
          '-apple-system',
          'system-ui',
        ],
        headline: [
          '"Montserrat Variable"',
          'Roboto',
          'sans-serif',
          '-apple-system',
          'system-ui',
        ],
      },
      colors: {
        accent: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
      },
    },
  },
  plugins: [flowbitePlugin],
}
