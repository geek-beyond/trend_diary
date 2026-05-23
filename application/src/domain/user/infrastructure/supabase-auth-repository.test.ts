import {
  AuthInvalidCredentialsError,
  AuthSessionMissingError,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AlreadyExistsError, ClientError, ServerError } from '@/common/errors'
import UnauthorizedError from '@/common/errors/client-error/unauthorized-error'
import { isFailure, isSuccess } from '@/common/result'
import { SupabaseAuthRepository } from './supabase-auth-repository'

const buildSupabaseUser = (overrides: Partial<User> = {}): User => ({
  id: 'auth-user-id-123',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2026-03-07T08:00:00.000Z',
  created_at: '2026-03-07T08:00:00.000Z',
  ...overrides,
})

const buildSupabaseSession = (overrides: Partial<Session> = {}): Session => ({
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  expires_at: 1234567890,
  token_type: 'bearer',
  user: buildSupabaseUser(),
  ...overrides,
})

describe('SupabaseAuthRepository', () => {
  const client = mockDeep<SupabaseClient>()
  const repository = new SupabaseAuthRepository(client)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signup', () => {
    describe('正常系', () => {
      it('セッションを含むサインアップ結果を返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        const supabaseSession = buildSupabaseSession({ user: supabaseUser })
        client.auth.signUp.mockResolvedValue({
          data: { user: supabaseUser, session: supabaseSession },
          error: null,
        } as never)

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(isSuccess(result)).toBe(true)
        if (isSuccess(result)) {
          expect(result.data.user.id).toBe(supabaseUser.id)
          expect(result.data.user.email).toBe('test@example.com')
          expect(result.data.user.createdAt).toBeInstanceOf(Date)
          expect(result.data.user.emailConfirmedAt).toBeInstanceOf(Date)
          expect(result.data.user.createdAt.toISOString()).toBe(supabaseUser.created_at)
          expect(result.data.user.emailConfirmedAt?.toISOString()).toBe(
            supabaseUser.email_confirmed_at,
          )
          expect(result.data.session?.accessToken).toBe('access-token')
          expect(result.data.session?.refreshToken).toBe('refresh-token')
          expect(result.data.session?.expiresIn).toBe(3600)
        }
      })

      it('セッションがnullの場合もサインアップ結果を返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        client.auth.signUp.mockResolvedValue({
          data: { user: supabaseUser, session: null },
          error: null,
        } as never)

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(isSuccess(result)).toBe(true)
        if (isSuccess(result)) {
          expect(result.data.session).toBeNull()
        }
      })

      it('emailConfirmedAtが未設定の場合はnullになること', async () => {
        const supabaseUser = buildSupabaseUser({ email_confirmed_at: undefined })
        client.auth.signUp.mockResolvedValue({
          data: { user: supabaseUser, session: null },
          error: null,
        } as never)

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(isSuccess(result)).toBe(true)
        if (isSuccess(result)) {
          expect(result.data.user.emailConfirmedAt).toBeNull()
        }
      })

      it('Supabaseのemailが空でもfallbackEmailを使用すること', async () => {
        const supabaseUser = buildSupabaseUser({ email: undefined })
        const supabaseSession = buildSupabaseSession({ user: supabaseUser, expires_in: undefined })
        client.auth.signUp.mockResolvedValue({
          data: { user: supabaseUser, session: supabaseSession },
          error: null,
        } as never)

        const result = await repository.signup('fallback@example.com', 'Password1!')

        expect(isSuccess(result)).toBe(true)
        if (isSuccess(result)) {
          expect(result.data.user.email).toBe('fallback@example.com')
          expect(result.data.session?.expiresIn).toBe(3600)
        }
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.signUp.mockRejectedValue(new Error('network down'))

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('既に登録済みのユーザーの場合AlreadyExistsErrorを返すこと', async () => {
        client.auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'User already registered', name: 'AuthError', status: 400 },
        } as never)

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(AlreadyExistsError)
          expect(result.error.message).toBe('User already exists')
        }
      })

      it('それ以外のエラーはServerErrorで包んで返すこと', async () => {
        client.auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'unexpected', name: 'AuthError', status: 500 },
        } as never)

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toContain('unexpected')
        }
      })

      it('ユーザーが返却されない場合ServerErrorを返すこと', async () => {
        client.auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        } as never)

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('User registration failed')
        }
      })

      it('emailもfallbackEmailも無い場合ServerErrorを返すこと', async () => {
        const supabaseUser = buildSupabaseUser({ email: undefined })
        client.auth.signUp.mockResolvedValue({
          data: { user: supabaseUser, session: null },
          error: null,
        } as never)

        const result = await repository.signup('', 'Password1!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toContain('User email is missing')
        }
      })
    })
  })

  describe('login', () => {
    describe('正常系', () => {
      it('ログイン結果を返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        const supabaseSession = buildSupabaseSession({ user: supabaseUser })
        client.auth.signInWithPassword.mockResolvedValue({
          data: { user: supabaseUser, session: supabaseSession },
          error: null,
        } as never)

        const result = await repository.login('test@example.com', 'Password1!')

        expect(isSuccess(result)).toBe(true)
        if (isSuccess(result)) {
          expect(result.data.user.email).toBe('test@example.com')
          expect(result.data.session.accessToken).toBe('access-token')
        }
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.signInWithPassword.mockRejectedValue(new Error('network down'))

        const result = await repository.login('test@example.com', 'Password1!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('AuthInvalidCredentialsError(instanceofヒット)時はClientError(401)を返すこと', async () => {
        const authError = new AuthInvalidCredentialsError('Invalid login credentials')
        client.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: authError,
        } as never)

        const result = await repository.login('test@example.com', 'WrongPassword!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ClientError)
          expect((result.error as ClientError).statusCode).toBe(401)
          expect(result.error.message).toBe('Invalid email or password')
        }
      })

      it('Invalid login credentials メッセージのフォールバック判定でClientErrorを返すこと', async () => {
        client.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', name: 'AuthError', status: 400 },
        } as never)

        const result = await repository.login('test@example.com', 'WrongPassword!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ClientError)
          expect((result.error as ClientError).statusCode).toBe(401)
        }
      })

      it('Invalid credentials メッセージでもClientErrorを返すこと', async () => {
        client.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials', name: 'AuthError', status: 400 },
        } as never)

        const result = await repository.login('test@example.com', 'WrongPassword!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ClientError)
        }
      })

      it('それ以外のエラーはServerErrorを返すこと', async () => {
        client.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'database error', name: 'AuthError', status: 500 },
        } as never)

        const result = await repository.login('test@example.com', 'Password1!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('userまたはsessionが欠落している場合ServerErrorを返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        client.auth.signInWithPassword.mockResolvedValue({
          data: { user: supabaseUser, session: null },
          error: null,
        } as never)

        const result = await repository.login('test@example.com', 'Password1!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('Authentication failed')
        }
      })

      it('emailが取得できない場合ServerErrorを返すこと', async () => {
        const supabaseUser = buildSupabaseUser({ email: undefined })
        client.auth.signInWithPassword.mockResolvedValue({
          data: {
            user: supabaseUser,
            session: buildSupabaseSession({ user: supabaseUser }),
          },
          error: null,
        } as never)

        const result = await repository.login('', 'Password1!')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toContain('User email is missing')
        }
      })
    })
  })

  describe('logout', () => {
    describe('正常系', () => {
      it('ログアウト成功時にvoidを返すこと', async () => {
        client.auth.signOut.mockResolvedValue({ error: null } as never)

        const result = await repository.logout()

        expect(isSuccess(result)).toBe(true)
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.signOut.mockRejectedValue(new Error('network down'))

        const result = await repository.logout()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('errorが存在する場合ServerErrorを返すこと', async () => {
        client.auth.signOut.mockResolvedValue({
          error: { message: 'logout error', name: 'AuthError', status: 500 },
        } as never)

        const result = await repository.logout()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toContain('Logout failed')
        }
      })
    })
  })

  describe('getCurrentUser', () => {
    describe('正常系', () => {
      it('現在のユーザーを返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        client.auth.getUser.mockResolvedValue({
          data: { user: supabaseUser },
          error: null,
        } as never)

        const result = await repository.getCurrentUser()

        expect(isSuccess(result)).toBe(true)
        if (isSuccess(result)) {
          expect(result.data.id).toBe(supabaseUser.id)
          expect(result.data.email).toBe('test@example.com')
        }
      })
    })

    describe('異常系', () => {
      it('AuthSessionMissingErrorの場合UnauthorizedError(sessionExists=false)を返すこと', async () => {
        client.auth.getUser.mockRejectedValue(new AuthSessionMissingError())

        const result = await repository.getCurrentUser()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(UnauthorizedError)
          const unauthorized = result.error as UnauthorizedError
          expect(unauthorized.context?.sessionExists).toBe(false)
        }
      })

      it('それ以外の例外はServerErrorで包んで返すこと', async () => {
        client.auth.getUser.mockRejectedValue(new Error('network'))

        const result = await repository.getCurrentUser()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('userがnullの場合UnauthorizedError(sessionExists=true)を返すこと', async () => {
        client.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        } as never)

        const result = await repository.getCurrentUser()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(UnauthorizedError)
          const unauthorized = result.error as UnauthorizedError
          expect(unauthorized.context?.sessionExists).toBe(true)
        }
      })

      it('emailが取得できない場合ServerErrorを返すこと', async () => {
        const supabaseUser = buildSupabaseUser({ email: undefined })
        client.auth.getUser.mockResolvedValue({
          data: { user: supabaseUser },
          error: null,
        } as never)

        const result = await repository.getCurrentUser()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('refreshSession', () => {
    describe('正常系', () => {
      it('セッション更新成功時に新セッションを返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        const supabaseSession = buildSupabaseSession({ user: supabaseUser })
        client.auth.refreshSession.mockResolvedValue({
          data: { user: supabaseUser, session: supabaseSession },
          error: null,
        } as never)

        const result = await repository.refreshSession()

        expect(isSuccess(result)).toBe(true)
        if (isSuccess(result)) {
          expect(result.data.user.id).toBe(supabaseUser.id)
          expect(result.data.session.accessToken).toBe('access-token')
        }
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.refreshSession.mockRejectedValue(new Error('network'))

        const result = await repository.refreshSession()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('errorが存在する場合ServerErrorを返すこと', async () => {
        client.auth.refreshSession.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'refresh failed', name: 'AuthError', status: 401 },
        } as never)

        const result = await repository.refreshSession()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('sessionがnullの場合ServerErrorを返すこと', async () => {
        client.auth.refreshSession.mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        } as never)

        const result = await repository.refreshSession()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('emailが取得できない場合ServerErrorを返すこと', async () => {
        const supabaseUser = buildSupabaseUser({ email: undefined })
        client.auth.refreshSession.mockResolvedValue({
          data: {
            user: supabaseUser,
            session: buildSupabaseSession({ user: supabaseUser }),
          },
          error: null,
        } as never)

        const result = await repository.refreshSession()

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('deleteUser', () => {
    describe('正常系', () => {
      it('削除成功時にvoidを返すこと', async () => {
        client.auth.admin.deleteUser.mockResolvedValue({
          data: { user: null },
          error: null,
        } as never)

        const result = await repository.deleteUser('auth-user-id-123')

        expect(isSuccess(result)).toBe(true)
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.admin.deleteUser.mockRejectedValue(new Error('network'))

        const result = await repository.deleteUser('auth-user-id-123')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('errorが存在する場合ServerErrorを返すこと', async () => {
        client.auth.admin.deleteUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'delete failed', name: 'AuthError', status: 500 },
        } as never)

        const result = await repository.deleteUser('auth-user-id-123')

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toContain('User deletion failed')
        }
      })
    })
  })
})
