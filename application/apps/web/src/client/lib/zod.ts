import { z } from 'zod'

/**
 * Zod v4 は最初の `z.object()` 構築時に、eval 可否を `new Function` の実行で判定する
 * （成否はメモ化され一度きり）。script-src に 'unsafe-eval' を持たない本CSPでは、
 * その試行が try/catch で握りつぶされても securitypolicyviolation として DevTools に報告される。
 * jitless を有効化すると判定自体を止められる。ただしメモ化前、すなわち最初のスキーマ構築より
 * 前に呼ぶ必要がある。ルートモジュールは他ルートのモジュールより先に評価されるため、
 * その先頭で副作用として呼ぶ（configure-zod 経由）。
 */
export function disableZodJitForStrictCsp(): void {
  z.config({ jitless: true })
}
