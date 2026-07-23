/// <reference types="vitest/config" />
/// <reference types="vitest" />

import devServer, { defaultOptions } from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'

const ReactCompilerConfig = {}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    resolve: {
      externalConditions: ['workerd', 'worker'],
    },
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    babel({
      include: [/\.[jt]sx?$/],
      exclude: [/node_modules/],
      babelConfig: {
        presets: ['@babel/preset-typescript'],
        plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
      },
    }),
    devServer({
      adapter,
      entry: 'src/dev-server.ts',
      exclude: [
        ...defaultOptions.exclude,
        '/assets/**',
        '/src/client/**',
        // Vite のアセット読込サフィックス（?url, ?raw 等）は dev サーバに渡さず Vite に処理させる
        /\?(?:inline|url|no-inline|raw|import(?:&(?:inline|url|no-inline|raw)?)?)$/,
      ],
    }),
  ],
  optimizeDeps: {
    entries: [],
    include: [
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tooltip',
      'next-themes',
      'sonner',
      'swr',
      'swr/mutation',
      'vaul',
    ],
  },
  test: {
    globals: true,
  },
})
