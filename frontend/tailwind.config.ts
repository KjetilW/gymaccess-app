import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#0A1B0F',
          900: '#1B4332',
          800: '#245C3F',
          700: '#2D744D',
          600: '#3A8C5B',
          500: '#4DA669',
          400: '#62C07A',
          300: '#81D293',
          200: '#A8E2B2',
          100: '#D1F0D7',
          50: '#ECF8EE',
        },
        sage: {
          DEFAULT: '#52B788',
          light: '#74C69D',
          dark: '#3A9168',
        },
        warm: {
          50: '#F7F5EE',
          100: '#EDE9DF',
          200: '#DDD6C8',
          300: '#CCC0AC',
        },
      },
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
