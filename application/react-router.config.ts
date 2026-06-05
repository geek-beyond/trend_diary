import type { Config } from '@react-router/dev/config'
export default {
  appDirectory: 'src/web/client',
  future: {
    // React Router v8 の future フラグ名は外部ライブラリ規約の `v8_` プレフィックス付きで固定であり
    // 命名規則を変更できないため、各フラグで useNamingConvention を抑制する。
    // ルートモジュール分割の最適化。コード変更不要。
    // biome-ignore lint/style/useNamingConvention: React Router v8 future フラグ名は固定
    v8_splitRouteModules: true,
    // client/ssr 環境を分離する Vite Environment API。Vite 8 で要件を満たす。
    // biome-ignore lint/style/useNamingConvention: React Router v8 future フラグ名は固定
    v8_viteEnvironmentApi: true,
    // 生の Request をそのまま渡す。loader/action は影響を受けない。
    // biome-ignore lint/style/useNamingConvention: React Router v8 future フラグ名は固定
    v8_passThroughRequests: true,
    // データリクエストの URL 形式変更。Hono は api パスのみのため影響なし。
    // biome-ignore lint/style/useNamingConvention: React Router v8 future フラグ名は固定
    v8_trailingSlashAwareDataRequests: true,
    // v8_middleware は明示的に false としてオプトアウトする。
    // true にすると loader/action に渡る context が plain object から
    // RouterContextProvider インスタンスへ変わるが、現状利用している
    // hono-react-router-adapter@0.6.5（npm の最新版。middleware 未対応）は
    // getLoadContext の返り値（plain object）をそのまま createRequestHandler に渡すため、
    // React Router 本体が「context は RouterContextProvider であること」を要求して例外を投げる
    // （node_modules の react-router ランタイムで該当の throw を確認済み）。
    // さらにアプリ側の auth action は context.cloudflare.env を直接参照しており、
    // RouterContextProvider 化すると undefined になって認証設定の解決に失敗する。
    // よってアダプタが middleware 対応するまで本フラグは有効化できない。
    // ただし未指定（undefined）のままだと react-router build が Future Flag Warning を出力するため、
    // 既定値と同じ false を明示することで挙動を変えずに警告のみを抑制する。
    v8_middleware: false,
  },
} satisfies Config
