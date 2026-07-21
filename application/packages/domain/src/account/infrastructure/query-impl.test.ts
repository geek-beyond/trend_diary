import { beforeEach, describe, expect, it } from 'vitest'
import getRdbClient, { mockRdbExecutor } from '../../test-helper/rdb'
import QueryImpl from './query-impl'

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
): (string | number | null)[] => {
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

describe('QueryImpl', () => {
  let useCase: QueryImpl

  beforeEach(() => {
    useCase = new QueryImpl(getRdbClient())
  })

  describe('findActiveById', () => {
    it('ActiveUserをIDで検索できる', async () => {
      mockRdbExecutor.mockResolvedValue({ rows: [buildActiveUserRow()] })

      const result = await useCase.findActiveById(1n)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value?.activeUserId).toBe(1n)
        expect(result.value?.email).toBe('test@example.com')
      }
      expect(mockRdbExecutor).toHaveBeenCalled()
      const [sql, params] = mockRdbExecutor.mock.calls[0] ?? []
      expect(sql).toContain('select')
      expect(sql).toContain('"active_user_id" = ?')
      expect(params).toContain(1)
    })

    it('存在しないIDの場合nullを返す', async () => {
      mockRdbExecutor.mockResolvedValue({ rows: [] })

      const result = await useCase.findActiveById(999n)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBeNull()
      }
    })

    it('データベースエラー時は適切にエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('Database connection failed'))

      const result = await useCase.findActiveById(1n)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error)
        expect(result.error.message).toBe('Database connection failed')
      }
    })
  })

  describe('findActiveByEmail', () => {
    it('ActiveUserをメールアドレスで検索できる', async () => {
      mockRdbExecutor.mockResolvedValue({
        rows: [buildActiveUserRow({ email: 'test@example.com' })],
      })

      const result = await useCase.findActiveByEmail('test@example.com')

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value?.activeUserId).toBe(1n)
        expect(result.value?.email).toBe('test@example.com')
      }
      expect(mockRdbExecutor).toHaveBeenCalled()
      const [sql, params] = mockRdbExecutor.mock.calls[0] ?? []
      expect(sql).toContain('select')
      expect(sql).toContain('"email" = ?')
      expect(params).toContain('test@example.com')
    })

    it('存在しないメールアドレスの場合nullを返す', async () => {
      mockRdbExecutor.mockResolvedValue({ rows: [] })

      const result = await useCase.findActiveByEmail('notfound@example.com')

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBeNull()
      }
    })

    it('データベースエラー時は適切にエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('Database connection failed'))

      const result = await useCase.findActiveByEmail('test@example.com')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error)
        expect(result.error.message).toBe('Database connection failed')
      }
    })
  })

  describe('findActiveByAuthenticationId', () => {
    it('ActiveUserを認証IDで検索できる', async () => {
      mockRdbExecutor.mockResolvedValue({
        rows: [buildActiveUserRow({ authenticationId: 'auth-id-123' })],
      })

      const result = await useCase.findActiveByAuthenticationId('auth-id-123')

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value?.activeUserId).toBe(1n)
        expect(result.value?.email).toBe('test@example.com')
      }
      expect(mockRdbExecutor).toHaveBeenCalled()
      const [sql, params] = mockRdbExecutor.mock.calls[0] ?? []
      expect(sql).toContain('select')
      expect(sql).toContain('"authentication_id" = ?')
      expect(params).toContain('auth-id-123')
    })

    it('存在しない認証IDの場合nullを返す', async () => {
      mockRdbExecutor.mockResolvedValue({ rows: [] })

      const result = await useCase.findActiveByAuthenticationId('nonexistent-auth-id')

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBeNull()
      }
    })

    it('データベースエラー時は適切にエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('Database connection failed'))

      const result = await useCase.findActiveByAuthenticationId('auth-id-123')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error)
        expect(result.error.message).toBe('Database connection failed')
      }
    })
  })
})
