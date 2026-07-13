import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DATE_RESOLVE_ERROR_MESSAGE,
  dismissDateResolveError,
  notifyDateResolveError,
} from './notify-date-resolve-error'

describe('notifyDateResolveError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('日付解決エラーを id で集約した無期限トーストで通知する', () => {
    notifyDateResolveError()

    expect(toast.error).toHaveBeenCalledWith(
      DATE_RESOLVE_ERROR_MESSAGE,
      expect.objectContaining({ id: 'date-resolve-error', duration: Infinity }),
    )
  })
})

describe('dismissDateResolveError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('日付解決エラーのトーストを閉じる', () => {
    dismissDateResolveError()

    expect(toast.dismiss).toHaveBeenCalledWith('date-resolve-error')
  })
})
