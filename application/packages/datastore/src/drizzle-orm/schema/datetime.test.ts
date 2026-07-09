import { describe, expect, it } from 'vitest'
import { normalizeDateTime, serializeDateTime } from './datetime'

describe('normalizeDateTime', () => {
  it('epoch ミリ秒(number)を Date に変換する', () => {
    const epochMs = Date.UTC(2024, 0, 2, 3, 4, 5)
    expect(normalizeDateTime(epochMs).getTime()).toBe(epochMs)
  })

  it('epoch ミリ秒(bigint)を Date に変換する', () => {
    const epochMs = Date.UTC(2024, 0, 2, 3, 4, 5)
    expect(normalizeDateTime(BigInt(epochMs)).getTime()).toBe(epochMs)
  })

  it('末尾 Z 付き ISO-8601 はそのまま UTC 解釈する', () => {
    expect(normalizeDateTime('2024-01-02T03:04:05Z').getTime()).toBe(Date.UTC(2024, 0, 2, 3, 4, 5))
  })

  it('オフセット付き ISO-8601 はオフセットを尊重する', () => {
    // +09:00 は UTC より9時間進んでいるため、UTC では9時間前になる
    expect(normalizeDateTime('2024-01-02T12:00:00+09:00').getTime()).toBe(Date.UTC(2024, 0, 2, 3))
  })

  it('TZ なし "YYYY-MM-DD HH:MM:SS"(空白区切り)は末尾 Z を補い UTC 解釈する', () => {
    expect(normalizeDateTime('2024-01-02 03:04:05').getTime()).toBe(Date.UTC(2024, 0, 2, 3, 4, 5))
  })

  it('TZ なし "YYYY-MM-DDTHH:MM:SS"(T 区切り)も UTC 解釈する', () => {
    expect(normalizeDateTime('2024-01-02T03:04:05').getTime()).toBe(Date.UTC(2024, 0, 2, 3, 4, 5))
  })

  it('日付のみの文字列は JS 既定どおり UTC 深夜として解釈する', () => {
    expect(normalizeDateTime('2024-01-02').getTime()).toBe(Date.UTC(2024, 0, 2))
  })
})

describe('serializeDateTime', () => {
  it('Date を ISO-8601(UTC) 文字列へ変換する', () => {
    expect(serializeDateTime(new Date(Date.UTC(2024, 0, 2, 3, 4, 5)))).toBe(
      '2024-01-02T03:04:05.000Z',
    )
  })
})
