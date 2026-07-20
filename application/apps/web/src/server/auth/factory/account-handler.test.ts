import { InvalidCredentialsError } from '@trend-diary/authentication'
import { ClientError } from '@trend-diary/std/errors'
import { err, ok } from 'neverthrow'
import mountAuthHandler from '@/test/helper/mount-auth-handler'
import { createAccountHandler } from './account-handler'

// resolveAccount 経路は createAccountUseCase(getRdbClient(...)) を構築するため実体依存を切る。
// resolveAccount コールバック自身が結果を返すので use-case の中身は空で十分。
vi.mock('@trend-diary/datastore/rdb', () => ({ default: vi.fn(() => ({})) }))
vi.mock('@trend-diary/domain/account', () => ({ createAccountUseCase: vi.fn(() => ({})) }))

describe('createAccountHandler', () => {
  describe('正常系', () => {
    it('認証出力ではなくアカウント出力を respond に渡すこと(log 未指定)', async () => {
      const handler = createAccountHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ id: 'auth-1' })),
        resolveAccount: (_useCase, user) =>
          Promise.resolve(ok({ authenticationId: user.id, displayName: 'テスト太郎' })),
        respond: (c, account) => c.json({ displayName: account.displayName }, 200),
      })

      const res = await mountAuthHandler(handler)()

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ displayName: 'テスト太郎' })
    })

    it('log コールバックにアカウント出力を渡して呼ぶこと', async () => {
      const log = vi.fn()
      const handler = createAccountHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ id: 'auth-1' })),
        resolveAccount: () => Promise.resolve(ok({ activeUserId: 7n })),
        log,
        respond: (c) => c.json({}, 200),
      })

      await mountAuthHandler(handler)()

      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]![0]).toEqual({ activeUserId: 7n })
    })
  })

  describe('準正常系', () => {
    it('認証ステップの err は toAuthError で変換されること', async () => {
      const handler = createAccountHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(err(new InvalidCredentialsError('invalid'))),
        resolveAccount: () => Promise.resolve(ok({})),
        respond: (c) => c.json({}, 200),
      })

      const res = await mountAuthHandler(handler)()

      expect(res.status).toBe(401)
    })

    it('アカウントステップの err は toAuthError を通さず元のステータスを保つこと', async () => {
      const handler = createAccountHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ id: 'auth-1' })),
        resolveAccount: () => Promise.resolve(err(new ClientError('User not found', 404))),
        respond: (c) => c.json({}, 200),
      })

      const res = await mountAuthHandler(handler)()

      expect(res.status).toBe(404)
    })
  })
})
