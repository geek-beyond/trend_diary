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

  describe('findActiveById', () => {
    describe('基本動作', () => {
      it('ActiveUserをIDで検索できる', async () => {
        // Arrange
        const activeUserId = 1n
        mockRdbExecutor.mockResolvedValue({ rows: [buildActiveUserRow()] })

        // Act
        const result = await useCase.findActiveById(activeUserId)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value?.activeUserId).toBe(1n)
          expect(result.value?.email).toBe('test@example.com')
        }
        expect(mockRdbExecutor).toHaveBeenCalled()
        const [sql, params] = mockRdbExecutor.mock.calls[0] ?? []
        expect(sql).toContain('select')
        expect(sql).toContain('"active_users"')
        expect(sql).toContain('"active_user_id" = ?')
        expect(params).toContain(1)
      })
    })

    describe('境界値・特殊値', () => {
      it('存在しないActiveUserの場合nullを返す', async () => {
        // Arrange
        const activeUserId = 999n
        mockRdbExecutor.mockResolvedValue({ rows: [] })

        // Act
        const result = await useCase.findActiveById(activeUserId)

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
        const activeUserId = 1n
        const dbError = new Error('Database connection failed')
        mockRdbExecutor.mockRejectedValue(dbError)

        // Act
        const result = await useCase.findActiveById(activeUserId)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          // INFO: DBエラー時はServerErrorとして返却される
          expect(result.error).toBeInstanceOf(ServerError)
          // INFO: DrizzleQueryErrorのcauseから元ドライバメッセージが伝播すること
          expect(result.error.message).toBe('Database connection failed')
        }
      })
    })
  })

  describe('findActiveByEmail', () => {
    describe('基本動作', () => {
      it('ActiveUserをメールアドレスで検索できる', async () => {
        // Arrange
        const email = 'test@example.com'
        mockRdbExecutor.mockResolvedValue({ rows: [buildActiveUserRow({ email })] })

        // Act
        const result = await useCase.findActiveByEmail(email)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value?.email).toBe(email)
          expect(result.value?.activeUserId).toBe(1n)
        }
        expect(mockRdbExecutor).toHaveBeenCalled()
        const [sql, params] = mockRdbExecutor.mock.calls[0] ?? []
        expect(sql).toContain('select')
        expect(sql).toContain('"email" = ?')
        expect(params).toContain(email)
      })
    })

    describe('境界値・特殊値', () => {
      it('存在しないメールアドレスの場合nullを返す', async () => {
        // Arrange
        const email = 'notfound@example.com'
        mockRdbExecutor.mockResolvedValue({ rows: [] })

        // Act
        const result = await useCase.findActiveByEmail(email)

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
        const email = 'test@example.com'
        const dbError = new Error('Database connection failed')
        mockRdbExecutor.mockRejectedValue(dbError)

        // Act
        const result = await useCase.findActiveByEmail(email)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          // INFO: DBエラー時はServerErrorとして返却される
          expect(result.error).toBeInstanceOf(ServerError)
          // INFO: DrizzleQueryErrorのcauseから元ドライバメッセージが伝播すること
          expect(result.error.message).toBe('Database connection failed')
        }
      })
    })
  })

  describe('findActiveByAuthenticationId', () => {
    describe('基本動作', () => {
      it('ActiveUserを認証IDで検索できる', async () => {
        // Arrange
        const authenticationId = 'auth-id-123'
        mockRdbExecutor.mockResolvedValue({
          rows: [buildActiveUserRow({ authenticationId })],
        })

        // Act
        const result = await useCase.findActiveByAuthenticationId(authenticationId)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value?.activeUserId).toBe(1n)
          expect(result.value?.email).toBe('test@example.com')
        }
        expect(mockRdbExecutor).toHaveBeenCalled()
        const [sql, params] = mockRdbExecutor.mock.calls[0] ?? []
        expect(sql).toContain('select')
        expect(sql).toContain('"authentication_id" = ?')
        expect(params).toContain(authenticationId)
      })
    })

    describe('境界値・特殊値', () => {
      it('存在しない認証IDの場合nullを返す', async () => {
        // Arrange
        const authenticationId = 'nonexistent-auth-id'
        mockRdbExecutor.mockResolvedValue({ rows: [] })

        // Act
        const result = await useCase.findActiveByAuthenticationId(authenticationId)

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
        const authenticationId = 'auth-id-123'
        const dbError = new Error('Database connection failed')
        mockRdbExecutor.mockRejectedValue(dbError)

        // Act
        const result = await useCase.findActiveByAuthenticationId(authenticationId)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          // INFO: DBエラー時はServerErrorとして返却される
          expect(result.error).toBeInstanceOf(ServerError)
          // INFO: DrizzleQueryErrorのcauseから元ドライバメッセージが伝播すること
          expect(result.error.message).toBe('Database connection failed')
        }
      })
    })
  })
})
