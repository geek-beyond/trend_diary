import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HttpError from '@/client/infrastructure/http-error'
import { dismissFetchError, FETCH_ERROR_MESSAGE, notifyFetchError } from './notify-fetch-error'
import { TOAST_ID } from './toast-id'

describe('notifyFetchError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('固定id・無期限・再試行アクション付きでエラートーストを表示する', () => {
      const retry = vi.fn()

      notifyFetchError(new HttpError(400, 'Bad Request'), TOAST_ID.ARTICLES_ERROR, retry)

      expect(toast.error).toHaveBeenCalledWith(FETCH_ERROR_MESSAGE, {
        id: TOAST_ID.ARTICLES_ERROR,
        duration: Infinity,
        action: { label: '再試行', onClick: retry },
      })
    })
  })

  describe('準正常系', () => {
    it('セッション切れ(401)の場合はエラートーストを表示しない', () => {
      notifyFetchError(new HttpError(401, 'Unauthorized'), TOAST_ID.ARTICLES_ERROR, vi.fn())

      expect(toast.error).not.toHaveBeenCalled()
    })
  })
})

describe('dismissFetchError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('指定したidのトーストを閉じる', () => {
    dismissFetchError(TOAST_ID.DIARY_ERROR)

    expect(toast.dismiss).toHaveBeenCalledWith(TOAST_ID.DIARY_ERROR)
  })
})
