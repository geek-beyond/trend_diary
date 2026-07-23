// Zod v4 のスキーマ構築時の eval 可否判定(new Function)は、CSP(unsafe-eval なし)下で
// securitypolicyviolation を出す。jitless で判定を止められるが、判定はメモ化され最初のスキーマ構築で
// 走るため、それより前に設定する必要がある。z.config() の import 副作用ではコード分割チャンクの
// 評価順に依存して間に合わないので、Zod 共有の globalThis.__zod_globalConfig へ、バンドル読込前に
// 走る head 内インラインscriptで直接書く。
// 参考: https://github.com/colinhacks/zod/issues/5789, https://github.com/colinhacks/zod/pull/5889
export const ZOD_JITLESS_BOOTSTRAP_SCRIPT = 'globalThis.__zod_globalConfig={jitless:true}'
