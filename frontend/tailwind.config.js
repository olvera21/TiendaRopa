/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A1220',
          900: '#101B34',
          800: '#182544',
          700: '#213157',
          600: '#2C3F6E',
        },
        parchment: {
          50: '#F8FAFC',
          100: '#EEF2F8',
          200: '#E1E8F2',
        },
        copper: {
          500: '#3457D5',
          600: '#2A46B0',
          700: '#22398D',
        },
        moss: {
          500: '#2F8F6D',
          600: '#237056',
        },
        rose: {
          500: '#D14343',
          600: '#B23636',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,37,65,0.06), 0 8px 24px -12px rgba(28,37,65,0.18)',
      },
      borderRadius: {
        xl2: '14px',
      },
    },
  },
  plugins: [],
};
