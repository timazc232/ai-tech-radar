import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#6366f1', // indigo-500
          dark: '#4f46e5',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Microsoft YaHei', 'sans-serif'],
        mono: ['Consolas', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
