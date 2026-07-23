// 契約違反の識別子。@trend-diary/std はクライアント（ブラウザ）からもインポートされるため、
// node:assert に依存するとブラウザバンドルでビルドが壊れる。環境非依存の自前クラスとする。
// invariant 系ライブラリは本番でメッセージを潰す設計のため採用しない
export class AssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssertionError'
  }
}

// 不変条件を表明する。破れは AssertionError で顕在化し、握りつぶさず errorHandler の 5xx 通知へ届ける
export function assert(
  // oxlint-disable-next-line typescript/no-restricted-types -- 表明対象は任意の真偽評価値であり、事前に型を確定できないため
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new AssertionError(message)
  }
}

// 非 null 契約を表明する。値が設定されている前提を NonNullable へ絞り、mustGet を一般化する
export function assertNonNull<T>(value: T, name: string): asserts value is NonNullable<T> {
  assert(value !== null && value !== undefined, `${name} is required but was not set`)
}
