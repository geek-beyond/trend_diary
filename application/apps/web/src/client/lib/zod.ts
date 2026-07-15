import { z } from 'zod'

/**
 * Zod v4 はバリデータをJITコンパイルするため、起動後最初の parse で eval 可否を
 * `Function('')` により試行する。script-src に 'unsafe-eval' を持たない本CSPでは、
 * その試行が try/catch で握りつぶされても securitypolicyviolation として DevTools に報告される。
 * jitless を有効化して試行自体を止める。試行結果はメモ化され一度きりのため、
 * 最初の parse より前（クライアント起動の最初）に呼ぶ必要がある。
 */
export function disableZodJitForStrictCsp(): void {
  z.config({ jitless: true })
}
