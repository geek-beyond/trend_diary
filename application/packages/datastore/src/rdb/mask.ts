const MASKED = '***'

// Drizzle の logQuery はカラム情報を持たない順序付き params のみを渡すため、
// どの値が PII(email / display_name 等の text 列)かを判別できない。
// よって文字列の bind 値は一律マスクし、ID やタイムスタンプ等の非 PII
// （number / bigint / boolean / null）はクエリ調査に有用なため残す。
export function maskQueryParams(params: unknown[]): unknown[] {
  return params.map((param) => (typeof param === 'string' ? MASKED : param))
}
