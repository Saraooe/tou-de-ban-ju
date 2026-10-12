/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Patrick Hand"',
          '"LXGW WenKai"',
          '"Kaiti SC"',
          '"STKaiti"',
          '"PingFang SC"',
          'system-ui',
          'sans-serif',
        ],
        // 手绘风里原句和界面用同一套手写字
        serif: [
          '"Patrick Hand"',
          '"LXGW WenKai"',
          '"Kaiti SC"',
          '"STKaiti"',
          'Georgia',
          'serif',
        ],
      },
      colors: {
        // 黑白灰，像铅笔描边
        ink: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e8e8e8',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        accent: {
          DEFAULT: '#171717',
          soft: '#404040',
        },
      },
      boxShadow: {
        card: 'none',
        // 手绘风：偏移的实心阴影，像用笔又描了一笔
        cardHover: '3px 3px 0 #171717',
        sketch: '2px 2px 0 #171717',
      },
    },
  },
  plugins: [],
}
