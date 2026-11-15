/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 設計 token：對應 src/index.css 的 CSS 變數
      colors: {
        primary: { DEFAULT: 'var(--color-primary)', light: 'var(--color-primary-light)', dark: 'var(--color-primary-dark)' },
        accent: { DEFAULT: 'var(--color-cta)', hover: 'var(--color-cta-hover)' },
        danger: { DEFAULT: 'var(--color-danger)', dark: 'var(--color-danger-dark)' },
        ink: { DEFAULT: 'var(--color-text)', soft: 'var(--color-text-light)', muted: 'var(--color-text-muted)' },
        surface: { DEFAULT: 'var(--bg-card)', page: 'var(--bg-main)' },
        line: 'var(--border-soft)',
        // 以下為遊戲內使用的舊色票
        'pokeball-red': '#FF0000',
        'hp-green': '#4CAF50',
        'deep-black': '#222222',
        'off-white': '#F0F0F0',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        'soft-hover': 'var(--shadow-soft-hover)',
      },
      fontFamily: {
        heading: ['Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
        // 只在遊戲內使用
        'pixel': ['"Press Start 2P"', 'cursive'],
      },
      animation: {
        'shake': 'shake 0.5s ease-in-out',
        'flash': 'flash 0.3s ease-in-out',
        'bounce-slow': 'bounce 1s infinite',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
}
