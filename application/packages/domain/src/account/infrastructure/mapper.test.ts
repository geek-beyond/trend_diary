import type { ActiveUser as RdbActiveUser } from '@trend-diary/datastore/schema'
import { describe, expect, it } from 'vitest'
import { mapToActiveUser } from './mapper'

// テストデータ作成ヘルパー
// スキーマ上のID列は number 型だが、mapper が bigint を透過することを検証するため
// テストでは意図的に bigint 値を注入する。そのため override は unknown を許容する
const createMockRdbActiveUser = (
  overrides: Partial<Record<keyof RdbActiveUser, string | number | bigint | Date | null>> = {},
): RdbActiveUser => {
  const now = new Date('2024-01-15T09:30:00Z')

  const rdbActiveUser = {
    activeUserId: 12345n,
    userId: 67890n,
    email: 'john.doe@example.com',
    displayName: '田中太郎',
    authenticationId: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date('2023-11-20T10:15:30Z'),
    updatedAt: now,
    ...overrides,
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- ID列の宣言型(number)に対し bigint のテスト値を注入するため、型システムの迂回が避けられないためです
  return rdbActiveUser as unknown as RdbActiveUser
}

describe('mapToActiveUser', () => {
  describe('基本動作', () => {
    it('標準的なActiveUserデータで全フィールドが正確にマッピングされること', () => {
      const rdbActiveUser = createMockRdbActiveUser()

      const result = mapToActiveUser(rdbActiveUser)

      expect(result).toBeDefined()
      expect(result.activeUserId).toBe(rdbActiveUser.activeUserId)
      expect(result.userId).toBe(rdbActiveUser.userId)
      expect(result.email).toBe(rdbActiveUser.email)
      expect(result.displayName).toBe(rdbActiveUser.displayName)
      expect(result.createdAt).toEqual(rdbActiveUser.createdAt)
      expect(result.updatedAt).toEqual(rdbActiveUser.updatedAt)
    })

    it('最小限の必須フィールドのみでActiveUserインスタンスが正常生成されること', () => {
      const rdbActiveUser = createMockRdbActiveUser({
        displayName: null,
      })

      const result = mapToActiveUser(rdbActiveUser)

      expect(result).toBeDefined()
      expect(result.activeUserId).toBe(rdbActiveUser.activeUserId)
      expect(result.userId).toBe(rdbActiveUser.userId)
      expect(result.email).toBe(rdbActiveUser.email)
      expect(result.displayName).toBeNull()
      expect(result.createdAt).toEqual(rdbActiveUser.createdAt)
      expect(result.updatedAt).toEqual(rdbActiveUser.updatedAt)
    })

    it('結果オブジェクトがRDBオブジェクトとは独立したActiveUserインスタンスであること', () => {
      const rdbActiveUser = createMockRdbActiveUser()

      const result = mapToActiveUser(rdbActiveUser)

      expect(result).not.toBe(rdbActiveUser)
      expect(result).toBeDefined()

      // Dateオブジェクトは同じ参照を持つ（mapperの実装仕様）
      expect(result.createdAt).toBe(rdbActiveUser.createdAt)
      expect(result.updatedAt).toBe(rdbActiveUser.updatedAt)

      // プリミティブ値は値で比較される
      expect(result.activeUserId).toBe(rdbActiveUser.activeUserId)
      expect(result.userId).toBe(rdbActiveUser.userId)
      expect(result.email).toBe(rdbActiveUser.email)
      expect(result.displayName).toBe(rdbActiveUser.displayName)
    })
  })

  describe('境界値・特殊値', () => {
    describe('bigint型の境界値テスト', () => {
      const bigintTestCases = [
        {
          name: '最小値(0)での境界値処理',
          activeUserId: 0n,
          userId: 0n,
          description: 'bigintの最小値0での正確なマッピング',
        },
        {
          name: '通常の正の値での処理',
          activeUserId: 12345n,
          userId: 67890n,
          description: '一般的な正のbigint値での正確なマッピング',
        },
        {
          name: 'JavaScript Number.MAX_SAFE_INTEGER相当値での処理',
          activeUserId: 9007199254740991n,
          userId: 9007199254740990n,
          description: 'JavaScript Number型の安全な最大値での正確なマッピング',
        },
        {
          name: 'JavaScript Number.MAX_SAFE_INTEGER超過値での処理',
          activeUserId: 9007199254740992n,
          userId: 18014398509481984n,
          description: 'JavaScript Number型の安全範囲を超えた値での正確なマッピング',
        },
        {
          name: '非常に大きなbigint値での処理',
          activeUserId: 123456789012345678901234567890n,
          userId: 987654321098765432109876543210n,
          description: '非常に大きなbigint値での正確なマッピング',
        },
      ]

      it.each(bigintTestCases)('$name', ({ activeUserId, userId }) => {
        const rdbActiveUser = createMockRdbActiveUser({
          activeUserId,
          userId,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.activeUserId).toBe(activeUserId)
        expect(result.userId).toBe(userId)
        expect(typeof result.activeUserId).toBe('bigint')
        expect(typeof result.userId).toBe('bigint')

        // 数値の正確性確認（文字列変換で比較）
        expect(result.activeUserId.toString()).toBe(activeUserId.toString())
        expect(result.userId.toString()).toBe(userId.toString())
      })
    })

    describe('文字列制約の境界値テスト', () => {
      const stringConstraintTestCases = [
        {
          name: '空文字列での境界値処理',
          email: '',
          displayName: '',
          description: '空文字列での正確なマッピング（displayNameは空文字として保持）',
        },
        {
          name: 'email最大長(1024文字)での境界値処理',
          email: `${'a'.repeat(1011)}@example.com`,
          displayName: '正常な表示名',
          description: 'email最大長(1024文字)での正確なマッピング',
        },
        {
          name: 'displayName最大長(1024文字)での境界値処理',
          email: 'test@example.com',
          displayName: 'あ'.repeat(1024),
          description: 'displayName最大長(1024文字・マルチバイト文字)での正確なマッピング',
        },
        {
          name: '現実的な日本語メールアドレスでの処理',
          email: '田中.太郎+test123@日本.example.co.jp',
          displayName: '田中太郎（営業部）',
          description: '国際化ドメイン名と日本語を含む実際的なデータでの正確なマッピング',
        },
      ]

      it.each(stringConstraintTestCases)('$name', ({ email, displayName }) => {
        const rdbActiveUser = createMockRdbActiveUser({
          email,
          displayName,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.email).toBe(email)
        expect(result.displayName).toBe(displayName)

        // 文字列長制約の確認（1024文字以内）
        expect(result.email.length).toBeLessThanOrEqual(1024)
        if (result.displayName) {
          expect(result.displayName.length).toBeLessThanOrEqual(1024)
        }
      })
    })

    describe('Date型の特殊ケーステスト', () => {
      const dateTestCases = [
        {
          name: 'Unix epoch(1970-01-01)での境界値処理',
          createdAt: new Date('1970-01-01T00:00:00.000Z'),
          updatedAt: new Date('1970-01-01T00:00:00.001Z'),
          description: 'Unix epochタイムスタンプでの正確なマッピング',
        },
        {
          name: '1970年以前の日時での境界値処理',
          createdAt: new Date('1969-12-31T23:59:59.999Z'),
          updatedAt: new Date('1969-07-20T20:17:00.000Z'),
          description: 'Unix epoch以前の日時での正確なマッピング',
        },
        {
          name: '遠い未来の日時での境界値処理',
          createdAt: new Date('2099-12-31T23:59:59.999Z'),
          updatedAt: new Date('3000-01-01T00:00:00.000Z'),
          description: '遠い未来の日時での正確なマッピング',
        },
        {
          name: 'ミリ秒精度での境界値処理',
          createdAt: new Date('2024-01-15T09:30:15.123Z'),
          updatedAt: new Date('2024-01-15T09:30:15.999Z'),
          description: 'ミリ秒精度の異なる日時での正確なマッピング',
        },
        {
          name: 'タイムゾーンを含む日時での処理',
          createdAt: new Date('2024-01-15T18:30:15+09:00'),
          updatedAt: new Date('2024-01-15T09:30:15Z'),
          description: '異なるタイムゾーンだが同一時刻の日時での正確なマッピング',
        },
      ]

      it.each(dateTestCases)('$name', ({ createdAt, updatedAt }) => {
        const rdbActiveUser = createMockRdbActiveUser({
          createdAt,
          updatedAt,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.createdAt).toEqual(createdAt)
        expect(result.updatedAt).toEqual(updatedAt)
        expect(result.createdAt).toBeInstanceOf(Date)
        expect(result.updatedAt).toBeInstanceOf(Date)

        // Dateオブジェクトの参照共有（mapperの実装仕様）
        expect(result.createdAt).toBe(createdAt)
        expect(result.updatedAt).toBe(updatedAt)

        // タイムスタンプ値の正確性確認
        expect(result.createdAt.getTime()).toBe(createdAt.getTime())
        expect(result.updatedAt.getTime()).toBe(updatedAt.getTime())
      })
    })

    describe('null値の変換処理テスト', () => {
      it('authenticationIdがそのまま保持されること', () => {
        const authenticationId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
        const rdbActiveUser = createMockRdbActiveUser({
          authenticationId,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.authenticationId).toBe(authenticationId)
      })

      it('displayNameがnullの場合nullのまま保持されること', () => {
        const rdbActiveUser = createMockRdbActiveUser({
          displayName: null,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.displayName).toBeNull()
        expect(result.displayName).not.toBeUndefined()
      })

      it('displayNameが空文字列の場合そのまま保持されること', () => {
        const rdbActiveUser = createMockRdbActiveUser({
          displayName: '',
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.displayName).toBe('')
        expect(result.displayName).not.toBeNull()
        expect(result.displayName).not.toBeUndefined()
      })
    })
  })

  describe('例外・制約違反', () => {
    describe('データ一貫性とマッピング精度テスト', () => {
      it('同一タイムスタンプでのcreatedAtとupdatedAtが正確にマッピングされること', () => {
        const timestamp = '2024-01-15T09:30:15.123Z'
        const createdAt = new Date(timestamp)
        const updatedAt = new Date(timestamp)
        const rdbActiveUser = createMockRdbActiveUser({
          createdAt,
          updatedAt,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.createdAt).toEqual(createdAt)
        expect(result.updatedAt).toEqual(updatedAt)
        expect(result.createdAt.getTime()).toBe(result.updatedAt.getTime())
        expect(result.createdAt).not.toBe(result.updatedAt)
        expect(result.createdAt).toBe(createdAt)
        expect(result.updatedAt).toBe(updatedAt)
      })

      it('異なるbigint値のactiveUserIdとuserIdが正確に区別されてマッピングされること', () => {
        const activeUserId = 123456789n
        const userId = 987654321n
        const rdbActiveUser = createMockRdbActiveUser({
          activeUserId,
          userId,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.activeUserId).toBe(activeUserId)
        expect(result.userId).toBe(userId)
        expect(result.activeUserId).not.toBe(result.userId)
        expect(result.activeUserId.toString()).toBe('123456789')
        expect(result.userId.toString()).toBe('987654321')
      })

      it('特殊文字を含むemailが正確にマッピングされること', () => {
        const specialEmail = 'user+tag.test@sub-domain.example-site.co.jp'
        const rdbActiveUser = createMockRdbActiveUser({
          email: specialEmail,
          displayName: null,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.email).toBe(specialEmail)
        expect(result.email).toContain('+')
        expect(result.email).toContain('.')
        expect(result.email).toContain('-')
      })

      it('日本語・絵文字を含むdisplayNameが正確にマッピングされること', () => {
        const unicodeDisplayName = '田中太郎🎌 (営業部)'
        const rdbActiveUser = createMockRdbActiveUser({
          displayName: unicodeDisplayName,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.displayName).toBe(unicodeDisplayName)
        expect(result.displayName).toContain('田中太郎')
        expect(result.displayName).toContain('🎌')
        expect(result.displayName).toContain('営業部')
        expect(result.displayName?.length).toBe(unicodeDisplayName.length)
      })
    })

    describe('極限値でのマッピング安定性テスト', () => {
      it('64bit整数上限に近い値でのマッピング精度テスト', () => {
        const nearMaxBigInt = 9223372036854775806n
        const rdbActiveUser = createMockRdbActiveUser({
          activeUserId: nearMaxBigInt,
          userId: nearMaxBigInt - 1n,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.activeUserId).toBe(nearMaxBigInt)
        expect(result.userId).toBe(nearMaxBigInt - 1n)
        expect(typeof result.activeUserId).toBe('bigint')
        expect(typeof result.userId).toBe('bigint')
        expect(result.activeUserId.toString()).toBe('9223372036854775806')
        expect(result.userId.toString()).toBe('9223372036854775805')
      })

      it('ミリ秒境界でのDate型マッピング精度テスト', () => {
        const preciseDate1 = new Date('2024-01-15T09:30:15.000Z')
        const preciseDate2 = new Date('2024-01-15T09:30:15.001Z')

        const rdbActiveUser = createMockRdbActiveUser({
          createdAt: preciseDate1,
          updatedAt: preciseDate2,
        })

        const result = mapToActiveUser(rdbActiveUser)

        expect(result.createdAt.getTime()).toBe(preciseDate1.getTime())
        expect(result.updatedAt.getTime()).toBe(preciseDate2.getTime())

        expect(result.createdAt.getMilliseconds()).toBe(0)
        expect(result.updatedAt.getMilliseconds()).toBe(1)
      })
    })
  })
})
