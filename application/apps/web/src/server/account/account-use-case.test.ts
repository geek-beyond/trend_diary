import type { LoggerType } from '@trend-diary/common/logger'
import type { Context } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import { createAccountUseCase } from './account-use-case'

const { discordCtor, discordSendMessage } = vi.hoisted(() => ({
  discordCtor: vi.fn(),
  discordSendMessage: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@trend-diary/notification', () => ({
  DiscordWebhookClient: class {
    sendMessage = discordSendMessage

    constructor(webhookUrl: string | undefined, logger: LoggerType) {
      discordCtor(webhookUrl, logger)
    }
  },
}))

const { getRdbClientMock } = vi.hoisted(() => ({ getRdbClientMock: vi.fn(() => ({ rdb: true })) }))
vi.mock('@trend-diary/datastore/rdb', () => ({ default: getRdbClientMock }))

const { createDomainAccountUseCaseMock } = vi.hoisted(() => ({
  createDomainAccountUseCaseMock: vi.fn((rdb, notifier) => ({ rdb, notifier })),
}))
vi.mock('@trend-diary/domain/account', () => ({
  createAccountUseCase: createDomainAccountUseCaseMock,
}))

const WEBHOOK_URL = 'https://discord.test/webhook'
const DB_BINDING = { db: true }
const logger = { warn: vi.fn(), error: vi.fn() }

function buildContext(): Context<Env> {
  // oxlint-disable-next-line typescript/no-restricted-types -- Hono の変数ストアを模す、任意値を保持する Map のため
  const store = new Map<string, unknown>([[CONTEXT_KEY.APP_LOG, logger]])
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  return {
    get: (key: string) => store.get(key),
    env: { DB: DB_BINDING, DISCORD_WEBHOOK_URL: WEBHOOK_URL },
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as Context<Env>
}

describe('createAccountUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('Context の DB と Notifier からドメインの AccountUseCase を生成する', () => {
      const useCase = createAccountUseCase(buildContext())

      expect(getRdbClientMock).toHaveBeenCalledWith(DB_BINDING)
      const [rdb, notifier] = createDomainAccountUseCaseMock.mock.calls[0] ?? []
      expect(rdb).toEqual({ rdb: true })
      expect(notifier).toMatchObject({ sendMessage: expect.any(Function) })
      expect(useCase).toBe(createDomainAccountUseCaseMock.mock.results[0]?.value)
    })

    it('Notifier は sendMessage 実行時にのみ DiscordWebhookClient を生成して委譲する', async () => {
      createAccountUseCase(buildContext())
      const notifier = createDomainAccountUseCaseMock.mock.calls[0]?.[1]

      // 生成時点ではクライアントを作らない（クエリ経路での毎リクエスト生成を避けるため）
      expect(discordCtor).not.toHaveBeenCalled()

      await notifier.sendMessage('整合性エラー')

      expect(discordCtor).toHaveBeenCalledWith(WEBHOOK_URL, logger)
      expect(discordSendMessage).toHaveBeenCalledWith('整合性エラー')
    })
  })
})
