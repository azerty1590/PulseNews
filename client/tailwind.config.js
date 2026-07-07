/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          1: '#16181f',
          2: '#1e2029',
          3: '#25272f',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          muted: 'rgba(99,102,241,0.15)',
        },
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.18s ease-out both',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
