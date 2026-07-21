import Logger from '@trend-diary/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import getRdbClient, { mockRdbExecutor } from '../../test-helper/rdb'
import type { Notifier } from '../port'
import CommandImpl from './command-impl'

// INFO: Drizzleのinsert returningは「カラム順の配列」で行を返す
// users:        user_id, created_at
// active_users: active_user_id, email, display_name, authentication_id, created_at, updated_at, user_id
const buildUserRow = (userId: number): (string | number | null)[] => [
  userId,
  '2024-01-15T09:30:00.000Z',
]
const buildActiveUserRow = (data: {
  activeUserId: number
  email: string
  displayName: string | null
  authenticationId: string | null
  userId: number
}): (string | number | null)[] => [
  data.activeUserId,
  data.email,
  data.displayName,
  data.authenticationId,
  '2024-01-15T09:30:00.000Z',
  '2024-01-15T09:30:00.000Z',
  data.userId,
]

describe('CommandImpl', () => {
  let useCase: CommandImpl
  let logger: Logger
  let notifier: Notifier

  beforeEach(() => {
    logger = new Logger('silent')
    notifier = { sendMessage: vi.fn().mockResolvedValue(undefined) }
    useCase = new CommandImpl(getRdbClient(), logger)
  })

  describe('createActiveWithAuthenticationId', () => {
    it('displayName付きでActiveUserを作成できる', async () => {
      // Arrange: 呼び出し順 1)users insert returning 2)active_users insert returning
      mockRdbExecutor.mockResolvedValueOnce({ rows: [buildUserRow(2)] }).mockResolvedValueOnce({
        rows: [
          buildActiveUserRow({
            activeUserId: 1,
            email: 'test@example.com',
            displayName: '表示名',
            authenticationId: 'auth-id-123',
            userId: 2,
          }),
        ],
      })

      // Act
      const result = await useCase.createActiveWithAuthenticationId(
        'test@example.com',
        'auth-id-123',
        notifier,
        '表示名',
      )

      // Assert: 成功時はCurrentUserを返す
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.email).toBe('test@example.com')
        expect(result.value.displayName).toBe('表示名')
        expect(result.value.activeUserId).toBe(1n)
        expect(result.value.userId).toBe(2n)
      }

      // usersへのinsert後にactive_usersへinsertする逐次実行であること
      const usersInsertCall = mockRdbExecutor.mock.calls.find(([sql]) =>
        sql.includes('insert into "users"'),
      )
      const activeUsersInsertCall = mockRdbExecutor.mock.calls.find(([sql]) =>
        sql.includes('insert into "active_users"'),
      )
      expect(usersInsertCall).toBeDefined()
      expect(activeUsersInsertCall).toBeDefined()

      // active_users insertには取得したuserId(=2)とemail/authenticationId/displayNameが渡されること
      const [, activeUsersParams] = activeUsersInsertCall ?? []
      expect(activeUsersParams).toContain('test@example.com')
      expect(activeUsersParams).toContain('auth-id-123')
      expect(activeUsersParams).toContain('表示名')
      expect(activeUsersParams).toContain(2)

      // 補償のdeleteは呼ばれないこと
      const deleteCall = mockRdbExecutor.mock.calls.find(([sql]) =>
        sql.includes('delete from "users"'),
      )
      expect(deleteCall).toBeUndefined()
    })

    it('displayNameなし(null)でもActiveUserを作成できる', async () => {
      // Arrange: 呼び出し順 1)users insert 2)active_users insert
      mockRdbExecutor.mockResolvedValueOnce({ rows: [buildUserRow(2)] }).mockResolvedValueOnce({
        rows: [
          buildActiveUserRow({
            activeUserId: 1,
            email: 'test@example.com',
            displayName: null,
            authenticationId: 'auth-id-123',
            userId: 2,
          }),
        ],
      })

      // Act
      const result = await useCase.createActiveWithAuthenticationId(
        'test@example.com',
        'auth-id-123',
        notifier,
      )

      // Assert
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.displayName).toBeNull()
        expect(result.value.activeUserId).toBe(1n)
        expect(result.value.userId).toBe(2n)
      }
    })

    it('users作成失敗時にエラーを返す', async () => {
      // Arrange: 1回目のusers insertで失敗
      mockRdbExecutor.mockRejectedValueOnce(new Error('create user failed'))

      // Act
      const result = await useCase.createActiveWithAuthenticationId(
        'test@example.com',
        'auth-id-123',
        notifier,
      )

      // Assert: エラーを返す
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error)
        expect(result.error.message).toBe('Failed to create active user')
      }

      // users作成自体が失敗しているので、active_users insertも補償deleteも行われないこと
      const activeUsersInsertCall = mockRdbExecutor.mock.calls.find(([sql]) =>
        sql.includes('insert into "active_users"'),
      )
      const deleteCall = mockRdbExecutor.mock.calls.find(([sql]) =>
        sql.includes('delete from "users"'),
      )
      expect(activeUsersInsertCall).toBeUndefined()
      expect(deleteCall).toBeUndefined()
    })

    it('activeUser作成失敗時にエラーを返し、補償としてusersを削除する', async () => {
      // Arrange: 呼び出し順 1)users insert成功 2)active_users insert失敗 3)補償delete成功
      mockRdbExecutor
        .mockResolvedValueOnce({ rows: [buildUserRow(2)] })
        .mockRejectedValueOnce(new Error('create active failed'))
        .mockResolvedValueOnce({ rows: [] })

      // Act
      const result = await useCase.createActiveWithAuthenticationId(
        'test@example.com',
        'auth-id-123',
        notifier,
      )

      // Assert: エラーを返す
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error)
        expect(result.error.message).toBe('Failed to create active user')
      }

      // 補償として作成済みのusers(user_id=2)をdeleteすること
      const deleteCall = mockRdbExecutor.mock.calls.find(([sql]) =>
        sql.includes('delete from "users"'),
      )
      expect(deleteCall).toBeDefined()
      const [, deleteParams] = deleteCall ?? []
      expect(deleteParams).toContain(2)
    })

    it('activeUser作成失敗かつ補償delete失敗時も元のエラーを返す', async () => {
      // Arrange: 呼び出し順 1)users insert成功 2)active_users insert失敗 3)補償delete失敗
      mockRdbExecutor
        .mockResolvedValueOnce({ rows: [buildUserRow(2)] })
        .mockRejectedValueOnce(new Error('create active failed'))
        .mockRejectedValueOnce(new Error('compensation delete failed'))

      // Act
      const result = await useCase.createActiveWithAuthenticationId(
        'test@example.com',
        'auth-id-123',
        notifier,
      )

      // Assert: 補償が失敗しても元のエラーを返す
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error)
        expect(result.error.message).toBe('Failed to create active user')
      }

      // 補償deleteの試行自体は行われていること
      const deleteCall = mockRdbExecutor.mock.calls.find(([sql]) =>
        sql.includes('delete from "users"'),
      )
      expect(deleteCall).toBeDefined()
    })

    it('補償delete失敗時はusersレコード孤立検知のためuserIdと補償エラーをerrorログに出力する', async () => {
      // Arrange: 呼び出し順 1)users insert成功 2)active_users insert失敗 3)補償delete失敗
      const errorSpy = vi.spyOn(logger, 'error')
      const compensationError = new Error('compensation delete failed')
      mockRdbExecutor
        .mockResolvedValueOnce({ rows: [buildUserRow(2)] })
        .mockRejectedValueOnce(new Error('create active failed'))
        .mockRejectedValueOnce(compensationError)

      // Act
      await useCase.createActiveWithAuthenticationId('test@example.com', 'auth-id-123', notifier)

      // Assert: 手動対応に必要なuserId(=2)と補償エラーをerrorログに残すこと
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'signup compensation failed: orphaned user may remain',
          userId: 2,
        }),
        compensationError,
      )
    })

    it('補償delete失敗時は孤立したusersレコードをnotifierへ通知する', async () => {
      // Arrange: 呼び出し順 1)users insert成功 2)active_users insert失敗 3)補償delete失敗
      const compensationError = new Error('compensation delete failed')
      mockRdbExecutor
        .mockResolvedValueOnce({ rows: [buildUserRow(2)] })
        .mockRejectedValueOnce(new Error('create active failed'))
        .mockRejectedValueOnce(compensationError)

      // Act
      await useCase.createActiveWithAuthenticationId('test@example.com', 'auth-id-123', notifier)

      // Assert: userId(=2)と補償エラーを含むメッセージを通知すること
      expect(notifier.sendMessage).toHaveBeenCalledWith(expect.stringContaining('userId: 2'))
      expect(notifier.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('compensation delete failed'),
      )
    })

    it('補償delete成功時はerrorログ出力も通知も行わない', async () => {
      // Arrange: 呼び出し順 1)users insert成功 2)active_users insert失敗 3)補償delete成功
      const errorSpy = vi.spyOn(logger, 'error')
      mockRdbExecutor
        .mockResolvedValueOnce({ rows: [buildUserRow(2)] })
        .mockRejectedValueOnce(new Error('create active failed'))
        .mockResolvedValueOnce({ rows: [] })

      // Act
      await useCase.createActiveWithAuthenticationId('test@example.com', 'auth-id-123', notifier)

      // Assert: 補償が成功した場合はログも通知も出さないこと
      expect(errorSpy).not.toHaveBeenCalled()
      expect(notifier.sendMessage).not.toHaveBeenCalled()
    })
  })
})
