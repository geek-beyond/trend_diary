import { assert } from '@trend-diary/std/contract'
import { customType } from 'drizzle-orm/sqlite-core'

// 既存D1本番データには（Prisma時代に書き込まれた）ISO-8601 文字列、CURRENT_TIMESTAMP 由来の
// "YYYY-MM-DD HH:MM:SS"(UTC・TZなし)、過去の epochミリ秒(integer) が混在しうる。
// TZなし形式は末尾Zを補ってUTC解釈しないと、非UTC環境で Date がずれる。
export function normalizeDateTime(value: string | number | bigint): Date {
  let normalized: Date
  if (typeof value === 'number' || typeof value === 'bigint') {
    normalized = new Date(Number(value))
  } else {
    const hasTimezone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value)
    normalized =
      !hasTimezone && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)
        ? new Date(`${value.replace(' ', 'T')}Z`)
        : new Date(value)
  }
  // DB の日時カラムはパース可能な値のみが書き込まれる契約のため、
  // Invalid Date を黙って返すとデータ破損が下流へ静かに伝播する。ここで顕在化させる
  assert(
    !Number.isNaN(normalized.getTime()),
    `Datetime value from database is not parseable: ${String(value)}`,
  )
  return normalized
}

export function serializeDateTime(value: Date): string {
  return value.toISOString()
}

export const dateTime = customType<{
  data: Date
  driverData: string | number | bigint
}>({
  dataType() {
    return 'DATETIME'
  },
  toDriver: serializeDateTime,
  fromDriver: normalizeDateTime,
})
