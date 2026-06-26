import type { Config } from '@react-router/dev/config'
export default {
  appDirectory: 'src/client',
  future: {
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
    // true にすると context が RouterContextProvider インスタンス必須になるが、
    // hono-react-router-adapter@0.6.5 は plain object を渡すため全ルートが 500 になる。
    // アダプタが middleware 対応するまで有効化できないため、
    // 既定値と同じ false を明示して挙動を変えずに Future Flag Warning のみ抑制する。
    v8_middleware: false,
  },
} satisfies Config
