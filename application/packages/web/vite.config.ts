/// <reference types="vitest/config" />
/// <reference types="vitest" />

import { defaultOptions } from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import serverAdapter from 'hono-react-router-adapter/vite'
import { defineConfig, type Plugin } from 'vite'
import babel from 'vite-plugin-babel'

const ReactCompilerConfig = {}

// dev サーバ（command === 'serve'）でのみ true となるグローバル定数 __IS_DEV__ を
// ビルド時に静的に埋め込むプラグイン。Cookie の secure フラグ判定などに使う。
function injectIsDevPlugin(): Plugin {
  return {
    name: 'trend-diary:inject-is-dev',
    config(_config, { command }) {
      return {
        define: {
          // Vite が静的置換するビルド時定数（命名は Vite 慣習の前後アンダースコア）
          // biome-ignore lint/style/useNamingConvention: build-time injected global
          __IS_DEV__: JSON.stringify(command === 'serve'),
        },
      }
    },
  }
}

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
    injectIsDevPlugin(),
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
    serverAdapter({
      adapter,
      entry: 'src/server.ts',
      exclude: [...defaultOptions.exclude, '/assets/**', '/src/client/**'],
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
