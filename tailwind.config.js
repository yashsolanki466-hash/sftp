/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'unigenome': {
          navy: '#2B4570',
          'navy-dark': '#21374F',
          'navy-light': '#3B5E8A',
          orange: '#FF8C42',
          'orange-dark': '#E6752C',
          'orange-light': '#FFB380',
          gold: '#FFA500',
        },
        primary: {
          50: '#EBF2FF',
          100: '#D7E5FF',
          200: '#AECDFF',
          300: '#78AEF0',
          400: '#4A93EB',
          500: '#1D78E6',
          600: '#1560BD',
          700: '#11509D',
          800: '#0E407D',
          900: '#0A305E',
        },
        accent: {
          50: '#F7F9FA',
          100: '#EDF0F2',
          200: '#DBE0E5',
          300: '#C8D1D7',
          400: '#B6C2CA',
          500: '#A4B2BD',
          600: '#91A3B0',
          700: '#728999',
          800: '#5A6E7C',
          900: '#43525D',
        },
        slate: {
          50: '#F8F9FA',
          100: '#F1F3F5',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        }
      },
      fontFamily: {
        sans: ['Source Sans 3', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        'display-italic': ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        none: 'none',
      },
      backgroundImage: {
        'gradient-unigenome': 'linear-gradient(135deg, #2B4570 0%, #3B5E8A 100%)',
        'gradient-unigenome-accent': 'linear-gradient(135deg, #2B4570 0%, #FF8C42 100%)',
        'gradient-subtle': 'linear-gradient(180deg, rgba(43, 69, 112, 0.02) 0%, transparent 100%)',
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      spacing: {
        'safe': 'max(1rem, env(safe-area-inset-left))',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
