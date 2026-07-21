import {
  PasskeyClient,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UnexpectedAuthError,
} from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import { err, ok } from 'neverthrow'
import CONTEXT_KEY from '@/middleware/context'
import {
  createPasskeyActionHandler,
  type PasskeyActionContext,
  respondChallengeOptions,
} from './passkey-action'

interface FakeLogger {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

interface BuildContextOptions {
  hasAppLog?: boolean
}

function buildContext({ hasAppLog = true }: BuildContextOptions = {}): {
  c: PasskeyActionContext
  logger: FakeLogger
} {
  const logger: FakeLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストで、構造的に代入できず二重アサーションが避けられないため
  const c = {
    get: (key: string) => (hasAppLog && key === CONTEXT_KEY.APP_LOG ? logger : undefined),
    // PasskeyClient の生成（authClientConfig）が参照する最小限の環境値
    env: { SUPABASE_URL: 'http://supabase.local', SUPABASE_ANON_KEY: 'anon-key' },
    req: { header: () => undefined },
    header: vi.fn(),
    // oxlint-disable-next-line typescript/no-restricted-types -- Hono の c.json を模すモックで、任意の JSON 値を受けるため
    json: (data: unknown, status: number) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as PasskeyActionContext
  return { c, logger }
}

describe('createPasskeyActionHandler', () => {
  describe('正常系', () => {
    it('execute の成功値を respond に渡し、respond の戻り値を返すこと', async () => {
      const respond = vi.fn((_c: PasskeyActionContext, output: string) => `responded:${output}`)
      const handler = createPasskeyActionHandler({
        execute: () => Promise.resolve(ok('output-value')),
        respond,
      })

      const { c } = buildContext()
      const res = await handler(c)

      expect(res).toBe('responded:output-value')
      expect(respond).toHaveBeenCalledWith(c, 'output-value')
    })

    it('生成した PasskeyClient を execute に渡すこと', async () => {
      const execute = vi.fn((_passkeyClient: PasskeyClient) => Promise.resolve(ok(null)))
      const handler = createPasskeyActionHandler({ execute, respond: () => null })

      const { c } = buildContext()
      await handler(c)

      expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(PasskeyClient)
    })
  })

  describe('準正常系', () => {
    it.each([
      {
        name: 'PasskeyRegistrationError',
        error: new PasskeyRegistrationError('registration failed'),
        status: 400,
      },
      {
        name: 'PasskeyVerificationError',
        error: new PasskeyVerificationError('verification failed'),
        status: 401,
      },
    ])(
      'execute が $name を返すと境界で HTTPException へ写像して投げ respond を呼ばないこと',
      async ({ error, status }) => {
        const respond = vi.fn()
        const handler = createPasskeyActionHandler({
          execute: () => Promise.resolve(err(error)),
          respond,
        })

        const { c } = buildContext()
        // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
        const thrown = await handler(c).catch((e: unknown) => e)

        expect(thrown).toBeInstanceOf(HTTPException)
        expect(thrown).toMatchObject({ status })
        expect(respond).not.toHaveBeenCalled()
      },
    )
  })

  describe('異常系', () => {
    // 対応表に無い認証エラーは HTTP へ写像せず、errorHandler の 5xx 処理へ委ねる
    it('execute が写像先を持たない認証エラーを返すと元のエラーをそのまま投げ respond を呼ばないこと', async () => {
      const error = new UnexpectedAuthError('unexpected')
      const respond = vi.fn()
      const handler = createPasskeyActionHandler({
        execute: () => Promise.resolve(err(error)),
        respond,
      })

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await handler(c).catch((e: unknown) => e)

      expect(thrown).toBe(error)
      expect(respond).not.toHaveBeenCalled()
    })
  })
})

describe('respondChallengeOptions', () => {
  describe('正常系', () => {
    it('challenge_id と options を challengeId・options として 200 で返すこと', async () => {
      const { c } = buildContext()

      const res = respondChallengeOptions(c, {
        challenge_id: 'challenge-1',
        options: { rpId: 'example.com' },
      })

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        challengeId: 'challenge-1',
        options: { rpId: 'example.com' },
      })
    })
  })
})
