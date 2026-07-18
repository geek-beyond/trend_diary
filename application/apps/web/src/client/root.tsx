import React from 'react'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  useRouteLoaderData,
} from 'react-router'
import './styles.css'
import { AnchorLink } from '@/client/components/ui/navigation/link'
import { ThemeProvider } from '@/client/features/theme'
import { SITE_URL } from '@/client/lib/meta'
import { ZOD_JITLESS_BOOTSTRAP_SCRIPT } from '@/client/lib/zod'
import { appLoadContext } from '@/load-context'
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
  { property: 'og:image', content: `${SITE_URL}/ogp.png` },
  { property: 'og:image:width', content: '1200' },
  { property: 'og:image:height', content: '630' },
  { property: 'og:image:alt', content: 'TrendDiary | 技術トレンドを効率的に管理' },
  { name: 'twitter:card', content: 'summary_large_image' },
  { name: 'twitter:site', content: '@TrendDiary' },
  { name: 'twitter:image', content: `${SITE_URL}/ogp.png` },
  { name: 'author', content: 'TrendDiary' },
  { name: 'robots', content: 'index, follow' },
  { tagName: 'link', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { tagName: 'link', rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
]

// secureHeaders が生成した nonce を Layout 側で参照し、インラインscriptのCSP許可に使う
export function loader({ context }: LoaderFunctionArgs) {
  return { nonce: context.get(appLoadContext).nonce }
}

export function Layout({ children }: { children: React.ReactNode }) {
  // Layoutはエラー描画時もrootのloaderData（成功済み）を参照できるため useRouteLoaderData を使う
  const nonce = useRouteLoaderData<typeof loader>('root')?.nonce
  return (
    // next-themesがハイドレーション前にhtmlへdarkクラスを付与するため、SSRとの差分警告を抑止する
    <html lang='ja' suppressHydrationWarning={true}>
      <head>
        {/* Zod のスキーマ構築(eval可否判定)より前に jitless を設定するため、バンドル読込前に走る
            インラインscriptで注入する。'unsafe-inline' 無しで許可するため nonce を付与する */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: ZOD_JITLESS_BOOTSTRAP_SCRIPT }} />
        <Meta />
        <Links />
        {/* metaに入れても反映されないため */}
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
      </head>
      <body>
        <ThemeProvider nonce={nonce}>
          {children}
          <ScrollRestoration nonce={nonce} />
          <Scripts nonce={nonce} />
          <Toaster position='top-left' visibleToasts={3} richColors={true} expand={true} />
        </ThemeProvider>
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

function BackToTopLink() {
  return (
    <p className='mt-4'>
      <AnchorLink to='/' className='text-blue-700 underline hover:text-blue-800'>
        トップへ戻る
      </AnchorLink>
    </p>
  )
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
        <BackToTopLink />
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
        <BackToTopLink />
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
        <BackToTopLink />
      </div>
    )
  }
  return (
    <div>
      <h1>Unknown Error</h1>
      <BackToTopLink />
    </div>
  )
}
