import { ClientError, ServerError } from '@trend-diary/std/errors'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isSessionExpiredError,
  notifyErrorUnlessSessionExpired,
  notifySessionExpired,
  SESSION_EXPIRED_MESSAGE,
} from './session-expired'
import { SESSION_SWR_KEY } from './use-session'

vi.mock('swr', async (importOriginal) => {
  // oxlint-disable-next-line typescript/consistent-type-imports -- vitestのimportOriginalにモジュール型を渡す定型のため inline import 型を許可する
  const actual = await importOriginal<typeof import('swr')>()
  return { ...actual, mutate: vi.fn() }
})

describe('isSessionExpiredError', () => {
  describe('正常系', () => {
    it('statusCodeが401のClientErrorはセッション切れと判定する', () => {
      expect(isSessionExpiredError(new ClientError('Unauthorized', 401))).toBe(true)
    })
  })

  describe('準正常系', () => {
    it.each([
      { outline: 'statusCodeが401以外のClientError', error: new ClientError('Bad Request', 400) },
      { outline: 'ServerError', error: new ServerError('Internal Server Error', 500) },
      { outline: 'Errorインスタンスではない値', error: 'unauthorized' },
    ])('$outlineはセッション切れと判定しない', ({ error }) => {
      expect(isSessionExpiredError(error)).toBe(false)
    })
  })
})

describe('notifySessionExpired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('セッション切れの案内トーストを固定idで表示し、セッションキャッシュを未ログインへ更新する', () => {
    notifySessionExpired()

    expect(toast.error).toHaveBeenCalledWith(SESSION_EXPIRED_MESSAGE, { id: 'session-expired' })
    expect(mutate).toHaveBeenCalledWith(SESSION_SWR_KEY, false, { revalidate: false })
  })
})

describe('notifyErrorUnlessSessionExpired', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('セッション切れではない場合は指定したメッセージでトーストを表示する', () => {
      notifyErrorUnlessSessionExpired(new ClientError('Bad Request', 400), 'エラーが発生しました', {
        id: 'example-error',
      })

      expect(toast.error).toHaveBeenCalledWith('エラーが発生しました', { id: 'example-error' })
    })
  })

  describe('準正常系', () => {
    it('セッション切れの場合は指定したメッセージのトーストを表示しない', () => {
      notifyErrorUnlessSessionExpired(new ClientError('Unauthorized', 401), 'エラーが発生しました')

      expect(toast.error).not.toHaveBeenCalled()
    })
  })
})
