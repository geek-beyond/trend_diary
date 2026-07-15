import { disableZodJitForStrictCsp } from './zod'

// ルートモジュールの先頭で読み込むことで、いずれかのルートチャンクが z.object() を構築するより
// 前に JIT を無効化し、CSP(unsafe-eval なし)下での new Function 由来 securitypolicyviolation を防ぐ。
// import 副作用は取り込み側の本体より先に評価されるため、ルートモジュール内の他 import が
// スキーマを構築しても間に合う。
disableZodJitForStrictCsp()
