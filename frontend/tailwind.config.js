/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-base': '#F3F4F0',
        'panel-glass': 'rgba(255, 255, 255, 0.76)',
        'panel-glass-subtle': 'rgba(255, 255, 255, 0.60)',
        'panel-glass-border': 'rgba(255, 255, 255, 0.65)',
        'panel-dark': 'rgba(15, 23, 20, 0.88)',
        'panel-dark-subtle': 'rgba(15, 23, 20, 0.75)',
        'panel-dark-border': 'rgba(255, 255, 255, 0.12)',
        'accent-primary': '#8FD13F',
        'accent-primary-hover': '#7ec032',
        'accent-map-line': '#3E6B4F',
        'status-warning': '#E8A23D',
        'status-critical': '#D9534F',
        'text-primary': '#14170F',
        'text-inverse': '#F3F4F0',
        'text-muted': 'rgba(20, 23, 15, 0.58)',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'Space Grotesk', 'sans-serif'],
        display: ['Outfit', 'Space Grotesk', 'Plus Jakarta Sans', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(20, 23, 15, 0.08)',
        'glass-elevated': '0 16px 48px 0 rgba(20, 23, 15, 0.12)',
        'glass-dark': '0 16px 40px -4px rgba(0, 0, 0, 0.35)',
        'soft-glow': '0 0 20px -2px rgba(143, 209, 63, 0.35)',
      },
      borderRadius: {
        'panel': '24px',
        'card': '16px',
        'pill': '999px',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-3px)' },
          '40%, 80%': { transform: 'translateX(3px)' },
        },
        pulseStale: {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '0.35' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'shake': 'shake 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-stale': 'pulseStale 2s ease-in-out infinite',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-up': 'fadeUp 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
    },
  },
  plugins: [],
}
