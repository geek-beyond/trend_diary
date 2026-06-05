/// <reference types="vitest/config" />
/// <reference types="vitest" />

import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'

const ReactCompilerConfig = {}

export default defineConfig(async ({ command }) => {
  const plugins = [
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
  ]

  // Cloudflare 用の dev サーバアダプタは wrangler（および内部にバンドルされた
  // whatwg-url@5.0.0 が非推奨の punycode 組み込みを require する）を読み込む。
  // これは `react-router dev` でのみ必要なため、serve 時だけ動的に読み込む。
  // build 時に wrangler バンドルを評価させないことで DEP0040 警告を根本から防ぐ。
  if (command === 'serve') {
    const { defaultOptions } = await import('@hono/vite-dev-server')
    const { default: adapter } = await import('@hono/vite-dev-server/cloudflare')
    const { default: serverAdapter } = await import('hono-react-router-adapter/vite')
    plugins.push(
      serverAdapter({
        adapter,
        entry: 'src/web/server.ts',
        exclude: [...defaultOptions.exclude, '/assets/**', '/src/web/client/**'],
      }),
    )
  }

  return {
    resolve: {
      tsconfigPaths: true,
    },
    ssr: {
      resolve: {
        externalConditions: ['workerd', 'worker'],
      },
    },
    plugins,
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
  }
})
