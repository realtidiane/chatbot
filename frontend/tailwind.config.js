/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          950: '#07070c',
          900: '#0a0a12',
          800: '#11111b',
          700: '#1a1a26',
          600: '#252533',
        },
        accent: {
          violet: '#a78bfa',
          indigo: '#818cf8',
          cyan:   '#22d3ee',
        },
      },
      boxShadow: {
        glow:     '0 0 40px -10px rgba(139, 92, 246, 0.5)',
        'glow-lg':'0 0 60px -10px rgba(139, 92, 246, 0.65)',
        'glow-cyan': '0 0 40px -10px rgba(34, 211, 238, 0.45)',
        soft:     '0 10px 40px -20px rgba(0, 0, 0, 0.5)',
        card:     '0 32px 80px -24px rgba(0, 0, 0, 0.7)',
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease-out',
        'slide-up':  'slideUp 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'scale-in':  'scaleIn 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'gradient':  'gradientShift 12s ease infinite',
        'mesh-drift':'mesh-drift 18s ease-in-out infinite alternate',
        'logo-pulse':'logo-pulse 3.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
