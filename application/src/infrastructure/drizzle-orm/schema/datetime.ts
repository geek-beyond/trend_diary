import { customType } from 'drizzle-orm/sqlite-core'

// 既存D1本番データには（Prisma時代に書き込まれた）ISO-8601 文字列、CURRENT_TIMESTAMP 由来の
// "YYYY-MM-DD HH:MM:SS"(UTC・TZなし)、過去の epochミリ秒(integer) が混在しうる。
// TZなし形式は末尾Zを補ってUTC解釈しないと、非UTC環境で Date がずれる。
export function normalizeDateTime(value: string | number | bigint): Date {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return new Date(Number(value))
  }
  const hasTimezone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value)
  if (!hasTimezone && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(`${value.replace(' ', 'T')}Z`)
  }
  return new Date(value)
}

export const dateTime = customType<{
  data: Date
  driverData: string | number | bigint
}>({
  dataType() {
    return 'DATETIME'
  },
  toDriver(value: Date): string {
    return value.toISOString()
  },
  fromDriver(value: string | number | bigint): Date {
    return normalizeDateTime(value)
  },
})
