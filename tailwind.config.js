/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'greenyellow': '#34d399',
        // BlackIris Brand Colors
        'iris': {
          50: '#f9f7fe',
          100: '#f3effd',
          200: '#e8dffb',
          300: '#d4bcf9',
          400: '#b794f6',
          500: '#9f6aee',
          600: '#8b5cf6',
          700: '#7c3aed',
          800: '#6d28d9',
          900: '#581c87',
        },
        // Enhanced Dark Mode
        'dark': {
          50: '#f8f9fa',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      backgroundColor: {
        'primary': 'var(--bg-primary, #ffffff)',
        'secondary': 'var(--bg-secondary, #f8f9fa)',
        'tertiary': 'var(--bg-tertiary, #f1f5f9)',
      },
      textColor: {
        'primary': 'var(--text-primary, #0f172a)',
        'secondary': 'var(--text-secondary, #475569)',
        'tertiary': 'var(--text-tertiary, #94a3b8)',
      },
    },
  },
  plugins: [],
};

