/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Theme-driven surfaces (see index.css :root / [data-theme='light']).
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          1: 'rgb(var(--surface-1) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          muted: 'rgba(99,102,241,0.15)',
        },
        // Redefine `white` as the theme foreground token so every white/[opacity]
        // overlay (borders, dividers, muted text) flips automatically in light
        // mode — white overlays on dark, dark overlays on light.
        white: 'rgb(var(--fg) / <alpha-value>)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        // Logo tile ripple: pop the tile to full opacity + a slight scale, then settle.
        logoPulse: {
          '0%, 100%': { opacity: 'var(--tile-o, 1)', transform: 'scale(1)' },
          '35%':      { opacity: '1', transform: 'scale(1.18)' },
        },
        // Whole logo does a tiny playful spin/settle on hover.
        logoSpin: {
          '0%':   { transform: 'rotate(0deg)' },
          '60%':  { transform: 'rotate(8deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.18s ease-out both',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        logoSpin: 'logoSpin 0.6s ease-in-out',
      },
    },
  },
  plugins: [],
};
