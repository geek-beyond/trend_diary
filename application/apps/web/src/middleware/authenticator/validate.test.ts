import { ClientError, ServerError } from '@trend-diary/common/errors'
import UnauthorizedError from '@trend-diary/common/errors/client-error/unauthorized-error'
import { createAuthUseCase } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import { err, ok, type Result } from 'neverthrow'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '../context'
import { validateSession } from './validate'

vi.mock('@trend-diary/domain/user', () => ({ createAuthUseCase: vi.fn() }))
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

function mockGetCurrentActiveUser(impl: () => Promise<unknown>) {
  vi.mocked(createAuthUseCase).mockReturnValue(
    // oxlint-disable-next-line typescript/consistent-type-assertions -- テストで必要な getCurrentActiveUser のみを差し替えるため
    { getCurrentActiveUser: impl } as unknown as ReturnType<typeof createAuthUseCase>,
  )
}

describe('validateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSupabaseAuthClient).mockReturnValue(
      // oxlint-disable-next-line typescript/consistent-type-assertions -- テストでは実クライアントを必要としないため
      {} as unknown as ReturnType<typeof createSupabaseAuthClient>,
    )
  })

  describe('正常系', () => {
    it('アクティブユーザーを認可に必要な3項目へ絞り込んで返すこと', async () => {
      // getCurrentActiveUser は authenticationId 等の内部項目も返すが、SESSION_USER には漏らさない
      const currentUser = {
        activeUserId: 123n,
        userId: 456n,
        authenticationId: 'auth-abc',
        email: 'active@example.com',
        displayName: 'テスト太郎',
      }
      mockGetCurrentActiveUser(() => Promise.resolve(ok(currentUser)))

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
    it('UnauthorizedError の場合は reason=no_session を返すこと', async () => {
      mockGetCurrentActiveUser(() => Promise.resolve(err(new UnauthorizedError('unauthorized'))))

      const { c, logger } = buildContext()
      const result = await validateSession(c)

      expect(unwrapErr(result).reason).toBe('no_session')
      // no_session は想定内のため警告・エラーログを出さない
      expect(logger.warn).not.toHaveBeenCalled()
      expect(logger.error).not.toHaveBeenCalled()
    })

    // ClientError / ServerError は想定済みの失敗として warn ログを出す
    const warnCases: Array<{ name: string; error: Error }> = [
      { name: 'ClientError', error: new ClientError('client error', 400) },
      { name: 'ServerError', error: new ServerError('server error') },
    ]

    warnCases.forEach(({ name, error }) => {
      it(`${name} の場合は reason=validation_failed を返し warn ログを出すこと`, async () => {
        mockGetCurrentActiveUser(() => Promise.resolve(err(error)))

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
      mockGetCurrentActiveUser(() => Promise.resolve(err(unexpected)))

      const { c, logger } = buildContext()
      const result = await validateSession(c)

      expect(unwrapErr(result).reason).toBe('validation_failed')
      expect(logger.error).toHaveBeenCalledWith('Unexpected error occurred', { error: unexpected })
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
