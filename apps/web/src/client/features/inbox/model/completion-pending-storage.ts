import { Result } from 'neverthrow'

const StorageKey = 'inbox-completion-pending'

// sessionStorage はストレージ無効環境（プライベートモード等）で例外を投げうるため Result で包む
const writeFlag = Result.fromThrowable((pending: boolean) => {
  if (pending) {
    window.sessionStorage.setItem(StorageKey, '1')
    return
  }

  window.sessionStorage.removeItem(StorageKey)
})

const readFlag = Result.fromThrowable(() => window.sessionStorage.getItem(StorageKey) === '1')

export const completionPendingStorage = {
  set(pending: boolean) {
    // ストレージ無効環境では完了フラグを永続化しないだけでよい（意図的な縮退）ため、失敗の Result は破棄する
    writeFlag(pending)
  },
  has() {
    return readFlag().unwrapOr(false)
  },
}
