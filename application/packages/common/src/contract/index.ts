import { AssertionError, ok } from 'node:assert'

// 契約違反の識別子として node:assert の AssertionError を採用する。
// invariant 系ライブラリは本番でメッセージを潰す設計のため、診断出力に英語メッセージを残す
// 規約と両立せず、AssertionError なら errorHandler 側でバグ由来と識別できるため。
export { AssertionError }

// 不変条件を表明する。破れは AssertionError で顕在化し、握りつぶさず errorHandler の 5xx 通知へ届ける
export function assert(
  // oxlint-disable-next-line typescript/no-restricted-types -- 表明対象は任意の真偽評価値であり、事前に型を確定できないため
  condition: unknown,
  message: string,
): asserts condition {
  ok(condition, message)
}

// 非 null 契約を表明する。値が設定されている前提を NonNullable へ絞り、mustGet を一般化する
export function assertNonNull<T>(value: T, name: string): asserts value is NonNullable<T> {
  assert(value !== null && value !== undefined, `${name} is required but was not set`)
}
