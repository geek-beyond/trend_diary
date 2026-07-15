/**
 * Zod v4 は最初のスキーマ構築時に、eval 可否を `new Function` の実行で判定し結果をメモ化する
 * （一度きり）。script-src に 'unsafe-eval' を持たない本CSPでは、その試行が try/catch で
 * 握りつぶされても securitypolicyviolation として DevTools に報告される。jitless を有効化すると
 * 判定自体を止められるが、メモ化より前（最初のスキーマ構築より前）に設定しておく必要がある。
 *
 * Zod は jitless 等のグローバル設定を `globalThis.__zod_globalConfig` 経由で全モジュール
 * インスタンス間で共有する。z.config() を import 副作用で呼ぶ方式はコード分割された各チャンクの
 * 評価順に依存し、ドメイン層のスキーマを構築するチャンクが root より先に走ると間に合わない。
 * バンドル読込より前に実行される head 内インラインscriptでこのグローバルへ直接書けば、どのチャンクが
 * 最初にスキーマを構築しても確実に判定をスキップできる。
 */
export const ZOD_JITLESS_BOOTSTRAP_SCRIPT = 'globalThis.__zod_globalConfig={jitless:true}'
