/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Patrick Hand"', '"Ma Shan Zheng"', '"Kaiti SC"', '"STKaiti"', '"PingFang SC"', 'sans-serif'],
        serif: ['"Patrick Hand"', '"Ma Shan Zheng"', '"Kaiti SC"', '"STKaiti"', 'serif'],
      },
      colors: {
        // 设计变量在 src/index.css 的 :root；这里是给旧界面过渡用的灰阶映射
        ink: {
          50: '#ffffff',
          100: '#ffffff',
          200: '#111111',
          300: '#8a8a8a',
          400: '#8a8a8a',
          500: '#8a8a8a',
          600: '#111111',
          700: '#111111',
          800: '#111111',
          900: '#111111',
        },
      },
      boxShadow: {
        // grug 风：一律无阴影
        card: 'none',
        cardHover: 'none',
        sketch: 'none',
      },
    },
  },
  plugins: [],
}
