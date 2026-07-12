import {
  AuthInvalidCredentialsError,
  type OAuthResponse,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js'
import { AlreadyExistsError, ClientError, ServerError } from '@trend-diary/common/errors'
import UnauthorizedError from '@trend-diary/common/errors/client-error/unauthorized-error'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { SupabaseAuthRepository } from './supabase-auth-repository'

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> | null } : T

// Supabase SDKの戻り値は判別共用体で、部分的なエラー形のモックでは正確な型を満たせないため、
// 解決値の型推論を一箇所に閉じ込めてキャストを集約する
const resolveAuthMock = <T>(
  mockFn: { mockResolvedValue: (value: T) => unknown },
  value: DeepPartial<T>,
): void => {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- Supabase SDKの判別共用体な戻り値型を、部分的なモック payload で満たす手段が他にないためです
  mockFn.mockResolvedValue(value as T)
}

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

  // linkIdentityはOAuthとIDトークンのoverloadを持ち、モックの解決値は後者の型に推論されるため、
  // OAuth側の戻り値でモックする際はここで型を橋渡しする
  const resolveLinkIdentityMock = (value: DeepPartial<OAuthResponse>): void => {
    // oxlint-disable-next-line typescript/consistent-type-assertions -- overloadの一方(OAuth)の戻り値型でモックする手段が他にないためです
    client.auth.linkIdentity.mockResolvedValue(value as never)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signup', () => {
    describe('正常系', () => {
      it('セッションを含むサインアップ結果を返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        const supabaseSession = buildSupabaseSession({ user: supabaseUser })
        resolveAuthMock(client.auth.signUp, {
          data: { user: supabaseUser, session: supabaseSession },
          error: null,
        })

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.user.id).toBe(supabaseUser.id)
          expect(result.value.user.email).toBe('test@example.com')
          expect(result.value.user.createdAt).toBeInstanceOf(Date)
          expect(result.value.user.emailConfirmedAt).toBeInstanceOf(Date)
          expect(result.value.user.createdAt.toISOString()).toBe(supabaseUser.created_at)
          expect(result.value.user.emailConfirmedAt?.toISOString()).toBe(
            supabaseUser.email_confirmed_at,
          )
          expect(result.value.session?.accessToken).toBe('access-token')
          expect(result.value.session?.refreshToken).toBe('refresh-token')
          expect(result.value.session?.expiresIn).toBe(3600)
        }
      })

      it('セッションがnullの場合もサインアップ結果を返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        resolveAuthMock(client.auth.signUp, {
          data: { user: supabaseUser, session: null },
          error: null,
        })

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.session).toBeNull()
        }
      })

      it('emailConfirmedAtが未設定の場合はnullになること', async () => {
        const supabaseUser = buildSupabaseUser({ email_confirmed_at: undefined })
        resolveAuthMock(client.auth.signUp, {
          data: { user: supabaseUser, session: null },
          error: null,
        })

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.user.emailConfirmedAt).toBeNull()
        }
      })

      it('Supabaseのemailが空でもfallbackEmailを使用すること', async () => {
        const supabaseUser = buildSupabaseUser({ email: undefined })
        const supabaseSession = buildSupabaseSession({ user: supabaseUser, expires_in: undefined })
        resolveAuthMock(client.auth.signUp, {
          data: { user: supabaseUser, session: supabaseSession },
          error: null,
        })

        const result = await repository.signup('fallback@example.com', 'Password1!')

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.user.email).toBe('fallback@example.com')
          expect(result.value.session?.expiresIn).toBe(3600)
        }
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.signUp.mockRejectedValue(new Error('network down'))

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('既に登録済みのユーザーの場合AlreadyExistsErrorを返すこと', async () => {
        resolveAuthMock(client.auth.signUp, {
          data: { user: null, session: null },
          error: { message: 'User already registered', name: 'AuthError', status: 400 },
        })

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(AlreadyExistsError)
          expect(result.error.message).toBe('User already exists')
        }
      })

      it('それ以外のエラーはServerErrorで包んで返すこと', async () => {
        resolveAuthMock(client.auth.signUp, {
          data: { user: null, session: null },
          error: { message: 'unexpected', name: 'AuthError', status: 500 },
        })

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toContain('unexpected')
        }
      })

      it('ユーザーが返却されない場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.signUp, {
          data: { user: null, session: null },
          error: null,
        })

        const result = await repository.signup('test@example.com', 'Password1!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('User registration failed')
        }
      })

      it('emailもfallbackEmailも無い場合ServerErrorを返すこと', async () => {
        const supabaseUser = buildSupabaseUser({ email: undefined })
        resolveAuthMock(client.auth.signUp, {
          data: { user: supabaseUser, session: null },
          error: null,
        })

        const result = await repository.signup('', 'Password1!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
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
        resolveAuthMock(client.auth.signInWithPassword, {
          data: { user: supabaseUser, session: supabaseSession },
          error: null,
        })

        const result = await repository.login('test@example.com', 'Password1!')

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.user.email).toBe('test@example.com')
          expect(result.value.session.accessToken).toBe('access-token')
        }
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.signInWithPassword.mockRejectedValue(new Error('network down'))

        const result = await repository.login('test@example.com', 'Password1!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('AuthInvalidCredentialsError(instanceofヒット)時はClientError(401)を返すこと', async () => {
        const authError = new AuthInvalidCredentialsError('Invalid login credentials')
        resolveAuthMock(client.auth.signInWithPassword, {
          data: { user: null, session: null },
          error: authError,
        })

        const result = await repository.login('test@example.com', 'WrongPassword!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) {
            expect(result.error.statusCode).toBe(401)
          }
          expect(result.error.message).toBe('Invalid email or password')
        }
      })

      it('Invalid login credentials メッセージのフォールバック判定でClientErrorを返すこと', async () => {
        resolveAuthMock(client.auth.signInWithPassword, {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', name: 'AuthError', status: 400 },
        })

        const result = await repository.login('test@example.com', 'WrongPassword!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) {
            expect(result.error.statusCode).toBe(401)
          }
        }
      })

      it('Invalid credentials メッセージでもClientErrorを返すこと', async () => {
        resolveAuthMock(client.auth.signInWithPassword, {
          data: { user: null, session: null },
          error: { message: 'Invalid credentials', name: 'AuthError', status: 400 },
        })

        const result = await repository.login('test@example.com', 'WrongPassword!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
        }
      })

      it('それ以外のエラーはServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.signInWithPassword, {
          data: { user: null, session: null },
          error: { message: 'database error', name: 'AuthError', status: 500 },
        })

        const result = await repository.login('test@example.com', 'Password1!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('userまたはsessionが欠落している場合ServerErrorを返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        resolveAuthMock(client.auth.signInWithPassword, {
          data: { user: supabaseUser, session: null },
          error: null,
        })

        const result = await repository.login('test@example.com', 'Password1!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('Authentication failed')
        }
      })

      it('emailが取得できない場合ServerErrorを返すこと', async () => {
        const supabaseUser = buildSupabaseUser({ email: undefined })
        resolveAuthMock(client.auth.signInWithPassword, {
          data: {
            user: supabaseUser,
            session: buildSupabaseSession({ user: supabaseUser }),
          },
          error: null,
        })

        const result = await repository.login('', 'Password1!')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toContain('User email is missing')
        }
      })
    })
  })

  describe('logout', () => {
    describe('正常系', () => {
      it('ログアウト成功時にvoidを返すこと', async () => {
        resolveAuthMock(client.auth.signOut, { error: null })

        const result = await repository.logout()

        expect(result.isOk()).toBe(true)
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.signOut.mockRejectedValue(new Error('network down'))

        const result = await repository.logout()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('errorが存在する場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.signOut, {
          error: { message: 'logout error', name: 'AuthError', status: 500 },
        })

        const result = await repository.logout()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toContain('Logout failed')
        }
      })
    })
  })

  describe('verifySession', () => {
    describe('正常系', () => {
      it('検証済みのclaimsからauthenticationIdを返すこと', async () => {
        resolveAuthMock(client.auth.getClaims, {
          data: { claims: { sub: 'auth-user-id-123', email: 'test@example.com' } },
          error: null,
        })

        const result = await repository.verifySession()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.authenticationId).toBe('auth-user-id-123')
        }
      })
    })

    describe('異常系', () => {
      it('getClaimsが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.getClaims.mockRejectedValue(new Error('network'))

        const result = await repository.verifySession()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })

      it('検証エラーの場合UnauthorizedError(sessionExists=true)を返すこと', async () => {
        resolveAuthMock(client.auth.getClaims, {
          data: null,
          error: { message: 'invalid token', name: 'AuthError', status: 401 },
        })

        const result = await repository.verifySession()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(UnauthorizedError)
          if (result.error instanceof UnauthorizedError) {
            expect(result.error.context?.sessionExists).toBe(true)
          }
        }
      })

      it('セッションが存在しない場合UnauthorizedError(sessionExists=false)を返すこと', async () => {
        resolveAuthMock(client.auth.getClaims, {
          data: null,
          error: null,
        })

        const result = await repository.verifySession()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(UnauthorizedError)
          if (result.error instanceof UnauthorizedError) {
            expect(result.error.context?.sessionExists).toBe(false)
          }
        }
      })
    })
  })

  describe('startPasskeyRegistration', () => {
    describe('正常系', () => {
      it('challengeIdとoptionsを返すこと', async () => {
        resolveAuthMock(client.auth.passkey.startRegistration, {
          data: { challenge_id: 'challenge-123', options: { challenge: 'abc' }, expires_at: 100 },
          error: null,
        })

        const result = await repository.startPasskeyRegistration()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.challengeId).toBe('challenge-123')
          expect(result.value.options).toEqual({ challenge: 'abc' })
        }
      })
    })

    describe('異常系', () => {
      it('errorが存在する場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.passkey.startRegistration, {
          data: null,
          error: { message: 'disabled', name: 'AuthError', status: 500 },
        })

        const result = await repository.startPasskeyRegistration()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('verifyPasskeyRegistration', () => {
    describe('正常系', () => {
      it('登録されたpasskeyのidを返すこと', async () => {
        resolveAuthMock(client.auth.passkey.verifyRegistration, {
          data: { id: 'passkey-1', friendly_name: 'My device', created_at: '2026-07-03' },
          error: null,
        })

        const result = await repository.verifyPasskeyRegistration({
          challengeId: 'challenge-123',
          credential: { id: 'cred', type: 'public-key' },
        })

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.id).toBe('passkey-1')
        }
      })
    })

    describe('準正常系', () => {
      it('errorが存在する場合ClientError(400)を返すこと', async () => {
        resolveAuthMock(client.auth.passkey.verifyRegistration, {
          data: null,
          error: { message: 'invalid credential', name: 'WebAuthnError', status: 400 },
        })

        const result = await repository.verifyPasskeyRegistration({
          challengeId: 'challenge-123',
          credential: { id: 'cred', type: 'public-key' },
        })

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) {
            expect(result.error.statusCode).toBe(400)
          }
        }
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.passkey.verifyRegistration.mockRejectedValue(new Error('network down'))

        const result = await repository.verifyPasskeyRegistration({
          challengeId: 'challenge-123',
          credential: { id: 'cred', type: 'public-key' },
        })

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('startPasskeyAuthentication', () => {
    describe('正常系', () => {
      it('challengeIdとoptionsを返すこと', async () => {
        resolveAuthMock(client.auth.passkey.startAuthentication, {
          data: { challenge_id: 'challenge-456', options: { challenge: 'xyz' }, expires_at: 100 },
          error: null,
        })

        const result = await repository.startPasskeyAuthentication()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.challengeId).toBe('challenge-456')
        }
      })
    })

    describe('異常系', () => {
      it('errorが存在する場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.passkey.startAuthentication, {
          data: null,
          error: { message: 'disabled', name: 'AuthError', status: 500 },
        })

        const result = await repository.startPasskeyAuthentication()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('verifyPasskeyAuthentication', () => {
    describe('正常系', () => {
      it('セッションとユーザーを含むログイン結果を返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        const supabaseSession = buildSupabaseSession({ user: supabaseUser })
        resolveAuthMock(client.auth.passkey.verifyAuthentication, {
          data: { session: supabaseSession, user: supabaseUser },
          error: null,
        })

        const result = await repository.verifyPasskeyAuthentication({
          challengeId: 'challenge-456',
          credential: { id: 'cred', type: 'public-key' },
        })

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.user.id).toBe(supabaseUser.id)
          expect(result.value.session.accessToken).toBe('access-token')
        }
      })
    })

    describe('準正常系', () => {
      it('errorが存在する場合ClientError(401)を返すこと', async () => {
        resolveAuthMock(client.auth.passkey.verifyAuthentication, {
          data: null,
          error: { message: 'invalid', name: 'WebAuthnError', status: 401 },
        })

        const result = await repository.verifyPasskeyAuthentication({
          challengeId: 'challenge-456',
          credential: { id: 'cred', type: 'public-key' },
        })

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) {
            expect(result.error.statusCode).toBe(401)
          }
        }
      })

      it('sessionまたはuserが欠落している場合ServerErrorを返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        resolveAuthMock(client.auth.passkey.verifyAuthentication, {
          data: { session: null, user: supabaseUser },
          error: null,
        })

        const result = await repository.verifyPasskeyAuthentication({
          challengeId: 'challenge-456',
          credential: { id: 'cred', type: 'public-key' },
        })

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.passkey.verifyAuthentication.mockRejectedValue(new Error('network down'))

        const result = await repository.verifyPasskeyAuthentication({
          challengeId: 'challenge-456',
          credential: { id: 'cred', type: 'public-key' },
        })

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('listPasskeys', () => {
    describe('正常系', () => {
      it('登録済みpasskeyのidだけを取り出して返すこと', async () => {
        resolveAuthMock(client.auth.passkey.list, {
          data: [
            { id: 'passkey-1', friendly_name: 'My device', created_at: '2026-07-03' },
            { id: 'passkey-2', created_at: '2026-07-03' },
          ],
          error: null,
        })

        const result = await repository.listPasskeys()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toEqual([{ id: 'passkey-1' }, { id: 'passkey-2' }])
        }
      })
    })

    describe('準正常系', () => {
      it('errorが存在する場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.passkey.list, {
          data: null,
          error: { message: 'list failed', name: 'AuthError', status: 500 },
        })

        const result = await repository.listPasskeys()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.passkey.list.mockRejectedValue(new Error('network down'))

        const result = await repository.listPasskeys()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('deletePasskey', () => {
    describe('正常系', () => {
      it('指定したidで削除を呼び出し成功すること', async () => {
        resolveAuthMock(client.auth.passkey.delete, { data: null, error: null })

        const result = await repository.deletePasskey('passkey-1')

        expect(result.isOk()).toBe(true)
        expect(client.auth.passkey.delete).toHaveBeenCalledWith({ passkeyId: 'passkey-1' })
      })
    })

    describe('準正常系', () => {
      it('errorが存在する場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.passkey.delete, {
          data: null,
          error: { message: 'delete failed', name: 'AuthError', status: 500 },
        })

        const result = await repository.deletePasskey('passkey-1')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })

    describe('異常系', () => {
      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.passkey.delete.mockRejectedValue(new Error('network down'))

        const result = await repository.deletePasskey('passkey-1')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('startOAuthAuthorization', () => {
    describe('正常系', () => {
      it('ブラウザ遷移させずに認可URLを返すこと', async () => {
        resolveAuthMock(client.auth.signInWithOAuth, {
          data: { provider: 'github', url: 'https://example.supabase.co/auth/v1/authorize' },
          error: null,
        })

        const result = await repository.startOAuthAuthorization(
          'github',
          'https://app.example.com/callback',
        )

        expect(result._unsafeUnwrap().url).toBe('https://example.supabase.co/auth/v1/authorize')
        expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'github',
          options: { redirectTo: 'https://app.example.com/callback', skipBrowserRedirect: true },
        })
      })
    })

    describe('異常系', () => {
      it('errorが存在する場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.signInWithOAuth, {
          data: { provider: 'github', url: null },
          error: { message: 'provider is not enabled', name: 'AuthError', status: 400 },
        })

        const result = await repository.startOAuthAuthorization('github', 'https://a.example.com')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })

      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.signInWithOAuth.mockRejectedValue(new Error('network down'))

        const result = await repository.startOAuthAuthorization('github', 'https://a.example.com')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })
    })
  })

  describe('exchangeOAuthCode', () => {
    describe('正常系', () => {
      it('認可コードをセッションに交換し認証ユーザーを返すこと', async () => {
        const supabaseUser = buildSupabaseUser()
        const supabaseSession = buildSupabaseSession({ user: supabaseUser })
        resolveAuthMock(client.auth.exchangeCodeForSession, {
          data: { user: supabaseUser, session: supabaseSession },
          error: null,
        })

        const result = await repository.exchangeOAuthCode('auth-code')

        expect(result._unsafeUnwrap().id).toBe(supabaseUser.id)
        expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth-code')
      })
    })

    describe('準正常系', () => {
      it('errorが存在する場合401のClientErrorを返すこと', async () => {
        resolveAuthMock(client.auth.exchangeCodeForSession, {
          data: { user: null, session: null },
          error: { message: 'invalid flow state', name: 'AuthError', status: 400 },
        })

        const result = await repository.exchangeOAuthCode('expired-code')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ClientError)
      })
    })

    describe('異常系', () => {
      it('userが欠落している場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.exchangeCodeForSession, {
          data: { user: null, session: null },
          error: null,
        })

        const result = await repository.exchangeOAuthCode('auth-code')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })

      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.exchangeCodeForSession.mockRejectedValue(new Error('network down'))

        const result = await repository.exchangeOAuthCode('auth-code')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })
    })
  })

  describe('startOAuthLink', () => {
    describe('正常系', () => {
      it('ブラウザ遷移させずに連携用の認可URLを返すこと', async () => {
        resolveLinkIdentityMock({
          data: { provider: 'github', url: 'https://example.supabase.co/auth/v1/authorize' },
          error: null,
        })

        const result = await repository.startOAuthLink('github', 'https://app.example.com/callback')

        expect(result._unsafeUnwrap().url).toBe('https://example.supabase.co/auth/v1/authorize')
        expect(client.auth.linkIdentity).toHaveBeenCalledWith({
          provider: 'github',
          options: { redirectTo: 'https://app.example.com/callback', skipBrowserRedirect: true },
        })
      })
    })

    describe('異常系', () => {
      it('errorが存在する場合ServerErrorを返すこと', async () => {
        resolveLinkIdentityMock({
          data: { provider: 'github', url: null },
          error: { message: 'manual linking is disabled', name: 'AuthError', status: 400 },
        })

        const result = await repository.startOAuthLink('github', 'https://a.example.com')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })

      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.linkIdentity.mockRejectedValue(new Error('network down'))

        const result = await repository.startOAuthLink('github', 'https://a.example.com')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })
    })
  })

  describe('listIdentities', () => {
    describe('正常系', () => {
      it('プロバイダ名の一覧に変換して返すこと', async () => {
        resolveAuthMock(client.auth.getUserIdentities, {
          data: {
            identities: [
              { identity_id: 'identity-1', provider: 'email' },
              { identity_id: 'identity-2', provider: 'github' },
            ],
          },
          error: null,
        })

        const result = await repository.listIdentities()

        expect(result._unsafeUnwrap()).toEqual([{ provider: 'email' }, { provider: 'github' }])
      })
    })

    describe('異常系', () => {
      it('errorが存在する場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.getUserIdentities, {
          data: null,
          error: { message: 'not authenticated', name: 'AuthError', status: 401 },
        })

        const result = await repository.listIdentities()

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })

      it('Supabase呼び出しが例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.getUserIdentities.mockRejectedValue(new Error('network down'))

        const result = await repository.listIdentities()

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })
    })
  })

  describe('unlinkIdentity', () => {
    const githubIdentity = { identity_id: 'identity-2', provider: 'github' }

    describe('正常系', () => {
      it('対象プロバイダのidentityを解除すること', async () => {
        resolveAuthMock(client.auth.getUserIdentities, {
          data: { identities: [{ identity_id: 'identity-1', provider: 'email' }, githubIdentity] },
          error: null,
        })
        resolveAuthMock(client.auth.unlinkIdentity, { data: null, error: null })

        const result = await repository.unlinkIdentity('github')

        expect(result.isOk()).toBe(true)
        expect(client.auth.unlinkIdentity).toHaveBeenCalledWith(githubIdentity)
      })
    })

    describe('準正常系', () => {
      it('対象プロバイダのidentityが無い場合404のClientErrorを返すこと', async () => {
        resolveAuthMock(client.auth.getUserIdentities, {
          data: { identities: [{ identity_id: 'identity-1', provider: 'email' }] },
          error: null,
        })

        const result = await repository.unlinkIdentity('github')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ClientError)
        expect(client.auth.unlinkIdentity).not.toHaveBeenCalled()
      })
    })

    describe('異常系', () => {
      it('解除がerrorを返す場合ServerErrorを返すこと', async () => {
        resolveAuthMock(client.auth.getUserIdentities, {
          data: { identities: [githubIdentity] },
          error: null,
        })
        resolveAuthMock(client.auth.unlinkIdentity, {
          data: null,
          error: { message: 'unlink failed', name: 'AuthError', status: 400 },
        })

        const result = await repository.unlinkIdentity('github')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })

      it('一覧取得が例外を投げる場合ServerErrorを返すこと', async () => {
        client.auth.getUserIdentities.mockRejectedValue(new Error('network down'))

        const result = await repository.unlinkIdentity('github')

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ServerError)
      })
    })
  })
})
