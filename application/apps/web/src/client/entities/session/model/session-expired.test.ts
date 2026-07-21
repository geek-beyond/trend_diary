import { toast } from 'sonner'
import { mutate } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HttpError from '@/client/infrastructure/http-error'
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
    it('status が401の HttpError はセッション切れと判定する', () => {
      expect(isSessionExpiredError(new HttpError(401, 'Unauthorized'))).toBe(true)
    })
  })

  describe('準正常系', () => {
    it.each([
      { outline: 'status が401以外の HttpError', error: new HttpError(400, 'Bad Request') },
      { outline: 'status が500の HttpError', error: new HttpError(500, 'Internal Server Error') },
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
      notifyErrorUnlessSessionExpired(new HttpError(400, 'Bad Request'), 'エラーが発生しました', {
        id: 'example-error',
      })

      expect(toast.error).toHaveBeenCalledWith('エラーが発生しました', { id: 'example-error' })
    })
  })

  describe('準正常系', () => {
    it('セッション切れの場合は指定したメッセージのトーストを表示しない', () => {
      notifyErrorUnlessSessionExpired(new HttpError(401, 'Unauthorized'), 'エラーが発生しました')

      expect(toast.error).not.toHaveBeenCalled()
    })
  })
})
