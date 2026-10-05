import type { Config } from 'tailwindcss'

export default {
  content: ['./src/popup/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#090b10',
          900: '#10141b',
          800: '#171d27',
          700: '#222a36',
          600: '#313a49',
        },
        mist: {
          50: '#f7f8fa',
          100: '#e6ebf2',
          300: '#c5ceda',
          400: '#93a0b3',
          500: '#6d7b8f',
        },
        signal: {
          DEFAULT: '#eb1000',
          bright: '#ff4d3a',
        },
        live: '#3dd68c',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04), 0 10px 24px rgba(0,0,0,0.22)',
      },
    },
  },
  plugins: [],
} satisfies Config
