import { ClientError, ServerError } from '@trend-diary/common/errors'
import type { LoggerType } from '@trend-diary/common/logger'
import type { CurrentUser } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import { err, ok, type Result } from 'neverthrow'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '../context'
import { toSessionUser, validateSession, verifySessionClaims } from './validate'

// Supabase は認証プロバイダという外部境界のため、ユニットではここだけ差し替える
vi.mock('@/infrastructure/supabase', () => ({ createSupabaseAuthClient: vi.fn() }))

interface FakeLogger {
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
}

// ログ出力の呼び出しだけを検証するため、Logger の必要メソッドのみを備えたフェイクを橋渡しする
function buildLogger(): FakeLogger & LoggerType {
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- 検証に使う warn/error/info のみを持つフェイクを Logger 型へ橋渡しする境界キャストのため
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as FakeLogger & LoggerType
}

function buildContext(logger: FakeLogger = buildLogger()): { c: Context<Env>; logger: FakeLogger } {
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

const validClaims = { data: { claims: { sub: 'auth-abc' } }, error: null }

describe('verifySessionClaims', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('検証成功時は claims の sub を認証IDとして返すこと', async () => {
      mockGetClaims(() => Promise.resolve(validClaims))

      const { c } = buildContext()
      const result = await verifySessionClaims(c)

      expect(unwrapOk(result)).toEqual({ authenticationId: 'auth-abc' })
    })
  })

  describe('準正常系', () => {
    it('セッションが検証できない場合は reason=no_session を返すこと', async () => {
      mockGetClaims(() => Promise.resolve({ data: null, error: { message: 'invalid session' } }))

      const { c } = buildContext()
      const result = await verifySessionClaims(c)

      expect(unwrapErr(result).reason).toBe('no_session')
    })
  })
})

describe('toSessionUser', () => {
  // resolveActiveUser は authenticationId 等の内部項目も返すが、SESSION_USER には漏らさない
  const currentUser: CurrentUser = {
    activeUserId: 123n,
    userId: 456n,
    authenticationId: 'auth-abc',
    email: 'active@example.com',
    displayName: 'テスト太郎',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('正常系', () => {
    it('アクティブユーザーを認可に必要な3項目へ絞り込んで返すこと', () => {
      const result = toSessionUser(ok(currentUser), buildLogger())

      expect(unwrapOk(result).sessionUser).toEqual({
        activeUserId: 123n,
        displayName: 'テスト太郎',
        email: 'active@example.com',
      })
    })
  })

  describe('準正常系', () => {
    // アカウント解決の ClientError / ServerError は想定済みの失敗として warn ログを出す
    const warnCases: Array<{ name: string; error: Error }> = [
      { name: 'ClientError', error: new ClientError('client error', 400) },
      { name: 'ServerError', error: new ServerError('server error') },
    ]

    warnCases.forEach(({ name, error }) => {
      it(`${name} の場合は reason=validation_failed を返し warn ログを出すこと`, () => {
        const logger = buildLogger()
        const result = toSessionUser(err(error), logger)

        expect(unwrapErr(result).reason).toBe('validation_failed')
        expect(logger.warn).toHaveBeenCalledWith('Session validation failed', { error })
        expect(logger.error).not.toHaveBeenCalled()
      })
    })
  })

  describe('異常系', () => {
    it('想定外のエラーの場合は reason=validation_failed を返し error ログを出すこと', () => {
      const unexpected = new Error('unexpected')
      const logger = buildLogger()
      const result = toSessionUser(err(unexpected), logger)

      expect(unwrapErr(result).reason).toBe('validation_failed')
      expect(logger.error).toHaveBeenCalledWith('Unexpected error occurred', { error: unexpected })
    })
  })
})

describe('validateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('準正常系', () => {
    it('セッションが検証できない場合は reason=no_session を返し、ログを出さないこと', async () => {
      mockGetClaims(() => Promise.resolve({ data: null, error: { message: 'invalid session' } }))

      const { c, logger } = buildContext()
      const result = await validateSession(c)

      expect(unwrapErr(result).reason).toBe('no_session')
      // no_session は想定内のため警告・エラーログを出さない
      expect(logger.warn).not.toHaveBeenCalled()
      expect(logger.error).not.toHaveBeenCalled()
    })
  })

  // 配線の正常系(実 Supabase + RDB を要するアカウント解決)は E2E(passkey)で担保し、
  // ここではドメインに触れないフェイルセーフ経路のみを検証する
  describe('異常系', () => {
    it('セッション検証が例外を投げた場合は reason=validation_failed を返し warn ログを出すこと', async () => {
      const claimsError = new Error('network down')
      mockGetClaims(() => Promise.reject(claimsError))

      const { c, logger } = buildContext()
      const result = await validateSession(c)

      expect(unwrapErr(result).reason).toBe('validation_failed')
      expect(logger.warn).toHaveBeenCalledWith('Session validation setup failed', {
        error: claimsError,
      })
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
