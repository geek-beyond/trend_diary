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
    activeUserId: 12345,
    userId: 67890,
    email: 'user+tag.test@sub-domain.example-site.co.jp',
    displayName: '田中太郎🎌 (営業部)',
    authenticationId: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date('2023-11-20T10:15:30.123Z'),
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
      expect(result.activeUserId).toBe(BigInt(rdbActiveUser.activeUserId))
      expect(result.userId).toBe(BigInt(rdbActiveUser.userId))
      expect(result.email).toBe(rdbActiveUser.email)
      expect(result.authenticationId).toBe(rdbActiveUser.authenticationId)
      expect(result.displayName).toBe(rdbActiveUser.displayName)
      expect(result).not.toBe(rdbActiveUser)
      expect(result.createdAt).toBe(rdbActiveUser.createdAt)
      expect(result.updatedAt).toBe(rdbActiveUser.updatedAt)
    })

    it('最小限の必須フィールドのみでActiveUserインスタンスが正常生成されること', () => {
      const rdbActiveUser = createMockRdbActiveUser({
        displayName: null,
      })

      const result = mapToActiveUser(rdbActiveUser)

      expect(result).toBeDefined()
      expect(result.activeUserId).toBe(BigInt(rdbActiveUser.activeUserId))
      expect(result.userId).toBe(BigInt(rdbActiveUser.userId))
      expect(result.email).toBe(rdbActiveUser.email)
      expect(result.authenticationId).toBe(rdbActiveUser.authenticationId)
      expect(result.displayName).toBeNull()
      expect(result.createdAt).toEqual(rdbActiveUser.createdAt)
      expect(result.updatedAt).toEqual(rdbActiveUser.updatedAt)
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
          name: 'JavaScript Number.MAX_SAFE_INTEGER超過値での処理',
          activeUserId: 9007199254740992n,
          userId: 18014398509481984n,
          description: 'JavaScript Number型の安全範囲を超えた値での正確なマッピング',
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
  })
})
