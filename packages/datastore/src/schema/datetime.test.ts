import { describe, expect, it } from 'vitest'
import { normalizeDateTime, serializeDateTime } from './datetime'

const EPOCH_MS = Date.UTC(2024, 0, 2, 3, 4, 5)

describe('normalizeDateTime', () => {
  it.each([
    { name: 'epoch ミリ秒(number)を Date に変換する', input: EPOCH_MS, expected: EPOCH_MS },
    { name: 'epoch ミリ秒(bigint)を Date に変換する', input: BigInt(EPOCH_MS), expected: EPOCH_MS },
    {
      name: '末尾 Z 付き ISO-8601 はそのまま UTC 解釈する',
      input: '2024-01-02T03:04:05Z',
      expected: EPOCH_MS,
    },
    // +09:00 は UTC より9時間進んでいるため、UTC では9時間前になる
    {
      name: 'オフセット付き ISO-8601 はオフセットを尊重する',
      input: '2024-01-02T12:00:00+09:00',
      expected: Date.UTC(2024, 0, 2, 3),
    },
    {
      name: 'TZ なし "YYYY-MM-DD HH:MM:SS"(空白区切り)は末尾 Z を補い UTC 解釈する',
      input: '2024-01-02 03:04:05',
      expected: EPOCH_MS,
    },
    {
      name: 'TZ なし "YYYY-MM-DDTHH:MM:SS"(T 区切り)も UTC 解釈する',
      input: '2024-01-02T03:04:05',
      expected: EPOCH_MS,
    },
    {
      name: '日付のみの文字列は JS 既定どおり UTC 深夜として解釈する',
      input: '2024-01-02',
      expected: Date.UTC(2024, 0, 2),
    },
  ])('$name', ({ input, expected }) => {
    expect(normalizeDateTime(input).getTime()).toBe(expected)
  })

  describe('異常系', () => {
    // DB の日時カラムはパース可能な値のみが書き込まれる契約のため、破損値は Invalid Date に
    // 変換して黙って通さず契約違反として送出する
    it.each([
      { name: 'パース不能な文字列', input: 'not-a-datetime' },
      { name: 'NaN', input: Number.NaN },
    ])('$name は契約違反として送出する', ({ input }) => {
      expect(() => normalizeDateTime(input)).toThrow('not parseable')
    })
  })
})

describe('serializeDateTime', () => {
  it('Date を ISO-8601(UTC) 文字列へ変換する', () => {
    expect(serializeDateTime(new Date(EPOCH_MS))).toBe('2024-01-02T03:04:05.000Z')
  })
})
