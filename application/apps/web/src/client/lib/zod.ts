import { z } from 'zod'

/**
 * Zod v4 は最初のスキーマ構築時に、eval 可否を `new Function` の実行で判定する
 * （成否はメモ化され一度きり）。script-src に 'unsafe-eval' を持たない本CSPでは、
 * その試行が try/catch で握りつぶされても securitypolicyviolation として DevTools に報告される。
 * jitless を有効化すると判定自体を止められる。SSR（サーバ realm）側の設定はこの関数で行う。
 */
export function disableZodJitForStrictCsp(): void {
  z.config({ jitless: true })
}

/**
 * Zod は jitless 等のグローバル設定を `globalThis.__zod_globalConfig` 経由で全モジュール
 * インスタンス間で共有する。メモ化はスキーマ構築時に一度だけ走るため、ブラウザでは最初の
 * スキーマ構築より前に jitless を書けておく必要がある。z.config() を import 副作用で呼ぶ方式は
 * コード分割された各チャンクの評価順に依存し、ドメイン層のスキーマを構築するチャンクが root より
 * 先に走ると間に合わない。バンドル読込より前に実行される head 内インラインscriptでこのグローバルへ
 * 直接書けば、どのチャンクが最初にスキーマを構築しても確実に判定をスキップできる。
 */
export const ZOD_JITLESS_BOOTSTRAP_SCRIPT = 'globalThis.__zod_globalConfig={jitless:true}'
