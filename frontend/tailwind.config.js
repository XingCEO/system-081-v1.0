/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af'
        },
        slate: {
          25: '#fcfdff'
        },
        surface: '#f8fafc',
        ink: '#0f172a',
        muted: '#64748b',
        success: '#16a34a',
        warning: '#f59e0b',
        danger: '#ef4444'
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        panel: '0 24px 60px rgba(37, 99, 235, 0.08)',
        soft: '0 12px 30px rgba(15, 23, 42, 0.06)'
      },
      backgroundImage: {
        mist: 'radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 38%), radial-gradient(circle at bottom right, rgba(14,165,233,0.12), transparent 30%)'
      }
    }
  },
  plugins: []
};
