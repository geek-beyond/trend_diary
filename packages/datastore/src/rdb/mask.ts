const MASKED = '***'

// Drizzle の logQuery はカラム情報を持たない順序付き params のみを渡すため、
// どの値が PII(email / display_name 等の text 列)かを判別できない。
// よって文字列の bind 値は一律マスクし、ID やタイムスタンプ等の非 PII
// （number / bigint / boolean / null）はクエリ調査に有用なため残す。
// 配列要素(例: IN 句や PostgreSQL 配列カラム)の中に文字列が含まれる場合も
// PII を取りこぼさないよう、ネストした配列は再帰的にマスクする。
// oxlint-disable-next-line typescript/no-restricted-types -- Drizzle が渡す bind 値はカラム型を持たない任意の値の配列で、具象化できないためです
export function maskQueryParams(params: unknown[]): unknown[] {
  // oxlint-disable-next-line typescript/no-restricted-types -- 各 bind 値は文字列・数値・配列など任意の型を取り得るため、具象化できないためです
  const mask = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return MASKED
    }
    if (Array.isArray(value)) {
      return value.map(mask)
    }
    return value
  }

  return params.map(mask)
}
