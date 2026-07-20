import { toDbIds } from '@trend-diary/datastore/rdb/id'
import { activeUsers, users } from '@trend-diary/datastore/schema'
import { inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Env } from '@/env'
import requestLogger from '@/middleware/request-logger'
import TEST_ENV from '@/test/env'
import { testRdb } from '@/test/helper/rdb'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'
import { validateSession } from './validate'

type ValidateResult = Awaited<ReturnType<typeof validateSession>>

async function callValidateSession(cookies?: string): Promise<ValidateResult> {
  let captured: ValidateResult | undefined
  const app = new Hono<Env>().use(requestLogger).get('/verify', async (c) => {
    captured = await validateSession(c)
    return c.body(null, 204)
  })

  await app.request('/verify', { headers: cookies ? { Cookie: cookies } : undefined }, TEST_ENV)

  if (!captured) throw new Error('validateSession が実行されませんでした')
  return captured
}

describe('validateSession', () => {
  const TEST_EMAIL = 'validate-session-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    const { userId, authenticationId } = await userHelper.create(TEST_EMAIL, TEST_PASSWORD)
    createdIds.userIds.push(userId)
    createdIds.authIds.push(authenticationId)
  })

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  describe('正常系', () => {
    it('有効なセッションではアクティブユーザーを認可に必要な3項目へ絞り込んで返すこと', async () => {
      const { activeUserId, cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const result = await callValidateSession(cookies)
      if (result.isErr()) throw result.error

      expect(result.value.sessionUser).toEqual({
        activeUserId,
        displayName: null,
        email: TEST_EMAIL,
      })
    })
  })

  describe('準正常系', () => {
    it('セッションが無い場合は reason=no_session を返すこと', async () => {
      const result = await callValidateSession()
      if (result.isOk()) throw new Error('Ok が返りました')

      expect(result.error.reason).toBe('no_session')
    })

    it('セッションは有効だが対応するアクティブユーザーが存在しない場合は reason=validation_failed を返すこと', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)
      // 認証プロバイダにはユーザーが残るが、アプリのアカウント行だけ失われた状態を作る
      const dbUserIds = toDbIds(createdIds.userIds)
      await testRdb.delete(activeUsers).where(inArray(activeUsers.userId, dbUserIds))
      await testRdb.delete(users).where(inArray(users.userId, dbUserIds))

      const result = await callValidateSession(cookies)
      if (result.isOk()) throw new Error('Ok が返りました')

      expect(result.error.reason).toBe('validation_failed')
    })
  })
})
