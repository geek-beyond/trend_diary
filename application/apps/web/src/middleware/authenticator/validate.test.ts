import { ClientError, ServerError } from '@trend-diary/common/errors'
import { createAccountUseCase } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import { err, ok, type Result } from 'neverthrow'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '../context'
import { validateSession } from './validate'

vi.mock('@trend-diary/domain/user', () => ({ createAccountUseCase: vi.fn() }))
vi.mock('@/infrastructure/supabase', () => ({ createSupabaseAuthClient: vi.fn() }))
vi.mock('@trend-diary/datastore/rdb', () => ({ default: vi.fn(() => ({})) }))

interface FakeLogger {
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
}

function buildContext(): { c: Context<Env>; logger: FakeLogger } {
  const logger: FakeLogger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  const c = {
    get: (key: string) => (key === CONTEXT_KEY.APP_LOG ? logger : undefined),
    env: { DB: {} },
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as Context<Env>
  return { c, logger }
}

// 想定と異なる分岐に落ちたら即座に失敗させ、取り違えを検知する
function unwrapOk<T, E>(result: Result<T, E>): T {
  if (result.isErr()) throw result.error
  return result.value
}

function unwrapErr<T, E>(result: Result<T, E>): E {
  if (result.isOk()) throw new Error('Result が Ok でした')
  return result.error
}

// getClaimsは認証プロバイダの署名検証結果を返す。テストごとに戻り値/例外を差し替える
// oxlint-disable-next-line typescript/no-restricted-types -- テストごとに任意の戻り値を返すスタブを差し替えるため
function mockGetClaims(impl: () => Promise<unknown>) {
  vi.mocked(createSupabaseAuthClient).mockReturnValue(
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- テストで必要な auth.getClaims のみを差し替えるための境界キャストのため
    { auth: { getClaims: impl } } as unknown as ReturnType<typeof createSupabaseAuthClient>,
  )
}

// oxlint-disable-next-line typescript/no-restricted-types -- テストごとに任意の Result を返すスタブ実装を差し替えるため
function mockResolveActiveUser(impl: () => Promise<unknown>) {
  vi.mocked(createAccountUseCase).mockReturnValue(
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- テストで必要な resolveActiveUser のみを差し替えるための境界キャストのため
    { resolveActiveUser: impl } as unknown as ReturnType<typeof createAccountUseCase>,
  )
}

const validClaims = { data: { claims: { sub: 'auth-abc' } }, error: null }

describe('validateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetClaims(() => Promise.resolve(validClaims))
    mockResolveActiveUser(() => Promise.resolve(ok(null)))
  })

  describe('正常系', () => {
    it('アクティブユーザーを認可に必要な3項目へ絞り込んで返すこと', async () => {
      // resolveActiveUser は authenticationId 等の内部項目も返すが、SESSION_USER には漏らさない
      const currentUser = {
        activeUserId: 123n,
        userId: 456n,
        authenticationId: 'auth-abc',
        email: 'active@example.com',
        displayName: 'テスト太郎',
      }
      mockResolveActiveUser(() => Promise.resolve(ok(currentUser)))

      const { c } = buildContext()
      const result = await validateSession(c)

      expect(unwrapOk(result).sessionUser).toEqual({
        activeUserId: 123n,
        displayName: 'テスト太郎',
        email: 'active@example.com',
      })
    })
  })

  describe('準正常系', () => {
    it('セッションが検証できない場合は reason=no_session を返すこと', async () => {
      mockGetClaims(() => Promise.resolve({ data: null, error: { message: 'invalid session' } }))

      const { c, logger } = buildContext()
      const result = await validateSession(c)

      expect(unwrapErr(result).reason).toBe('no_session')
      // no_session は想定内のため警告・エラーログを出さない
      expect(logger.warn).not.toHaveBeenCalled()
      expect(logger.error).not.toHaveBeenCalled()
    })

    // アカウント解決の ClientError / ServerError は想定済みの失敗として warn ログを出す
    const warnCases: Array<{ name: string; error: Error }> = [
      { name: 'ClientError', error: new ClientError('client error', 400) },
      { name: 'ServerError', error: new ServerError('server error') },
    ]

    warnCases.forEach(({ name, error }) => {
      it(`${name} の場合は reason=validation_failed を返し warn ログを出すこと`, async () => {
        mockResolveActiveUser(() => Promise.resolve(err(error)))

        const { c, logger } = buildContext()
        const result = await validateSession(c)

        expect(unwrapErr(result).reason).toBe('validation_failed')
        expect(logger.warn).toHaveBeenCalledWith('Session validation failed', { error })
        expect(logger.error).not.toHaveBeenCalled()
      })
    })
  })

  describe('異常系', () => {
    it('想定外のエラーの場合は reason=validation_failed を返し error ログを出すこと', async () => {
      const unexpected = new Error('unexpected')
      mockResolveActiveUser(() => Promise.resolve(err(unexpected)))

      const { c, logger } = buildContext()
      const result = await validateSession(c)

      expect(unwrapErr(result).reason).toBe('validation_failed')
      expect(logger.error).toHaveBeenCalledWith('Unexpected error occurred', { error: unexpected })
    })

    it('セッション検証が例外を投げた場合は reason=validation_failed を返し warn ログを出すこと', async () => {
      const claimsError = new Error('network down')
      mockGetClaims(() => Promise.reject(claimsError))

      const { c, logger } = buildContext()
      const result = await validateSession(c)

      expect(unwrapErr(result).reason).toBe('validation_failed')
      expect(logger.warn).toHaveBeenCalledWith('Session validation failed', { error: claimsError })
    })

    it('セットアップで例外が発生した場合はフェイルセーフで reason=validation_failed を返すこと', async () => {
      const setupError = new Error('supabase client creation failed')
      vi.mocked(createSupabaseAuthClient).mockImplementation(() => {
        throw setupError
      })

      const { c, logger } = buildContext()
      const result = await validateSession(c)

      expect(unwrapErr(result).reason).toBe('validation_failed')
      expect(logger.warn).toHaveBeenCalledWith('Session validation setup failed', {
        error: setupError,
      })
    })
  })
})
