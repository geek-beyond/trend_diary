// @ts-ignore Vite が dev 時に解決する仮想モジュール
import * as build from 'virtual:react-router/server-build'
import { handle } from './react-router-hono'

// dev では @hono/vite-dev-server がこの Hono アプリを実行し、仮想モジュール経由で SSR を委譲する
export default handle(build)
