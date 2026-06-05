import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServerError } from '@/common/errors'
import getRdbClient, { mockRdbExecutor } from '@/test/__mocks__/rdb'
import QueryImpl from './query-impl'

vi.mock('@/infrastructure/rdb')

describe('QueryImpl', () => {
  let useCase: QueryImpl

  // INFO: Drizzleのselectは「カラム順の配列」で行を返す
  // 並び順: active_user_id, email, display_name, authentication_id, created_at, updated_at, user_id
  const buildActiveUserRow = (
    overrides: Partial<{
      activeUserId: number
      email: string
      displayName: string | null
      authenticationId: string | null
      createdAt: string
      updatedAt: string
      userId: number
    }> = {},
  ): unknown[] => {
    const data = {
      activeUserId: 1,
      email: 'test@example.com',
      displayName: 'テストユーザー',
      authenticationId: null,
      createdAt: '2024-01-15T09:30:00.000Z',
      updatedAt: '2024-01-15T09:30:00.000Z',
      userId: 2,
      ...overrides,
    }
    return [
      data.activeUserId,
      data.email,
      data.displayName,
      data.authenticationId,
      data.createdAt,
      data.updatedAt,
      data.userId,
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useCase = new QueryImpl(getRdbClient('file::memory:'))
  })

  const finderCases = [
    {
      describeName: 'findActiveById',
      label: 'ID',
      sqlColumn: '"active_user_id" = ?',
      expectedParam: 1 as string | number,
      rowOverrides: (): Parameters<typeof buildActiveUserRow>[0] => ({}),
      invoke: (target: QueryImpl, found: boolean) => target.findActiveById(found ? 1n : 999n),
    },
    {
      describeName: 'findActiveByEmail',
      label: 'メールアドレス',
      sqlColumn: '"email" = ?',
      expectedParam: 'test@example.com' as string | number,
      rowOverrides: (): Parameters<typeof buildActiveUserRow>[0] => ({ email: 'test@example.com' }),
      invoke: (target: QueryImpl, found: boolean) =>
        target.findActiveByEmail(found ? 'test@example.com' : 'notfound@example.com'),
    },
    {
      describeName: 'findActiveByAuthenticationId',
      label: '認証ID',
      sqlColumn: '"authentication_id" = ?',
      expectedParam: 'auth-id-123' as string | number,
      rowOverrides: (): Parameters<typeof buildActiveUserRow>[0] => ({
        authenticationId: 'auth-id-123',
      }),
      invoke: (target: QueryImpl, found: boolean) =>
        target.findActiveByAuthenticationId(found ? 'auth-id-123' : 'nonexistent-auth-id'),
    },
  ]

  describe.each(finderCases)(
    '$describeName',
    ({ label, sqlColumn, expectedParam, rowOverrides, invoke }) => {
      describe('基本動作', () => {
        it(`ActiveUserを${label}で検索できる`, async () => {
          // Arrange
          mockRdbExecutor.mockResolvedValue({
            rows: [buildActiveUserRow(rowOverrides())],
          })

          // Act
          const result = await invoke(useCase, true)

          // Assert
          expect(result.isOk()).toBe(true)
          if (result.isOk()) {
            expect(result.value?.activeUserId).toBe(1n)
            expect(result.value?.email).toBe('test@example.com')
          }
          expect(mockRdbExecutor).toHaveBeenCalled()
          const [sql, params] = mockRdbExecutor.mock.calls[0] ?? []
          expect(sql).toContain('select')
          expect(sql).toContain(sqlColumn)
          expect(params).toContain(expectedParam)
        })
      })

      describe('境界値・特殊値', () => {
        it(`存在しない${label}の場合nullを返す`, async () => {
          // Arrange
          mockRdbExecutor.mockResolvedValue({ rows: [] })

          // Act
          const result = await invoke(useCase, false)

          // Assert
          expect(result.isOk()).toBe(true)
          if (result.isOk()) {
            expect(result.value).toBeNull()
          }
        })
      })

      describe('例外・制約違反', () => {
        it('データベースエラー時は適切にエラーを返す', async () => {
          // Arrange
          const dbError = new Error('Database connection failed')
          mockRdbExecutor.mockRejectedValue(dbError)

          // Act
          const result = await invoke(useCase, true)

          // Assert
          expect(result.isErr()).toBe(true)
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ServerError)
            expect(result.error.message).toBe('Database connection failed')
          }
        })
      })
    },
  )
})
