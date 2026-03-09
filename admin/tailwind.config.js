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
        surface: '#f8fafc',
        ink: '#0f172a',
        muted: '#64748b'
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        panel: '0 20px 50px rgba(37, 99, 235, 0.08)'
      }
    }
  },
  plugins: []
};
