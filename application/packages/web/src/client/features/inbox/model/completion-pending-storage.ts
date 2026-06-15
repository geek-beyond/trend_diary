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

// 完了演出を後で再生するための保留状態。保存できない環境では諦めるだけなので結果は問わない
export function setCompletionPending(pending: boolean) {
  writeFlag(pending)
}

export function hasCompletionPending() {
  return readFlag().unwrapOr(false)
}
