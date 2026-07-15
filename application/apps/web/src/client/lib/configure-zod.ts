import { disableZodJitForStrictCsp } from './zod'

// 副作用モジュール。ルートモジュールの先頭で読み込むことで、いずれかのルートチャンクが
// トップレベルで z.object() を構築するより前に JIT を無効化し、CSP(unsafe-eval なし)下での
// new Function 由来 securitypolicyviolation を防ぐ。import 副作用は本体より先に評価されるため、
// ルートモジュール内の他 import がスキーマを構築しても間に合う。
disableZodJitForStrictCsp()
