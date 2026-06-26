import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/{**,.client,.server}/**/*.{tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
