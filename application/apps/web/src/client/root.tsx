import React from 'react'
import type { MetaFunction } from 'react-router'
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from 'react-router'
import './styles.css'
import { Toaster } from './components/shadcn/sonner'

export const meta: MetaFunction = () => [
  { charSet: 'utf-8' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  { title: 'TrendDiary | 技術トレンドを効率的に管理' },
  {
    name: 'description',
    content:
      'QiitaやZennの記事を日記のように管理し、技術トレンドを見逃さない。技術者向けのトレンド管理ブラウザアプリです。',
  },
  {
    name: 'keywords',
    content: 'TrendDiary,技術トレンド,Qiita,Zenn,記事管理,技術者,プログラミング,エンジニア',
  },
  { property: 'og:site_name', content: 'TrendDiary' },
  { property: 'og:type', content: 'website' },
  { property: 'og:locale', content: 'ja_JP' },
  { name: 'twitter:card', content: 'summary_large_image' },
  { name: 'twitter:site', content: '@TrendDiary' },
  { name: 'author', content: 'TrendDiary' },
  { name: 'robots', content: 'index, follow' },
  { tagName: 'link', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='ja'>
      <head>
        <Meta />
        <Links />
        {/* metaに入れても反映されないため */}
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Toaster
          position='top-left'
          visibleToasts={3}
          theme='system'
          richColors={true}
          expand={true}
        />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

// 400台のエラーは不要なのでログ出力しないようにする
// 参考: https://zenn.dev/mkizka/articles/0db9bc30e1f707#(3)-errorresponseimpl
export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    )
  }
  // 本番はスタックトレース等の内部情報を画面に晒さず、詳細はログにのみ残す
  if (import.meta.env.PROD) {
    // useRouteError() は Error 以外（文字列やオブジェクト等）も返し得るため、
    // 監視ツールで取りこぼさないよう存在すれば一律ログに残す
    if (error != null) {
      // oxlint-disable-next-line no-console -- 本番のクライアント側エラーをログに残すため
      console.error(error)
    }
    return (
      <div>
        <h1>Error</h1>
        <p>予期しないエラーが発生しました。時間をおいて再度お試しください。</p>
      </div>
    )
  }

  if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    )
  }
  return <h1>Unknown Error</h1>
}
