type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>

// 応答が遅い相手でハングするとWorkersの実行時間制限に直結するため、共通の既定値を設ける
export const DEFAULT_FETCH_TIMEOUT_MS = 5000

export interface FetchWithTimeoutOptions {
  timeoutMs?: number
}

// AbortSignal.any 未対応環境向けに、複数signalのいずれかの中断を伝播する合成signalを生成する。
// 中断後はリスナーを解放できるよう、解放用のクリーンアップ関数もあわせて返す。
const combineSignals = (
  signal: AbortSignal,
  timeoutSignal: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController()
  const onSignalAbort = () => controller.abort(signal.reason)
  const onTimeoutAbort = () => controller.abort(timeoutSignal.reason)

  if (signal.aborted) {
    controller.abort(signal.reason)
  } else {
    signal.addEventListener('abort', onSignalAbort)
    timeoutSignal.addEventListener('abort', onTimeoutAbort)
  }

  const cleanup = () => {
    signal.removeEventListener('abort', onSignalAbort)
    timeoutSignal.removeEventListener('abort', onTimeoutAbort)
  }
  return { signal: controller.signal, cleanup }
}

/**
 * タイムアウト付きの fetch ラッパ。
 *
 * 外部HTTP呼び出しのタイムアウト処理を一箇所に集約し、各所での
 * AbortController + setTimeout のボイラープレート増殖を防ぐ。
 */
export const fetchWithTimeout = (
  input: FetchInput,
  init: FetchInit & FetchWithTimeoutOptions = {},
): Promise<Response> => {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal, ...rest } = init
  const timeoutSignal = AbortSignal.timeout(timeoutMs)

  // 呼び出し元のsignalが無ければタイムアウトのみを適用する
  if (!signal) {
    return fetch(input, { ...rest, signal: timeoutSignal })
  }

  // AbortSignal.any はリスナー解放まで内部で面倒を見るため、対応環境では優先利用する
  if (typeof AbortSignal.any === 'function') {
    return fetch(input, { ...rest, signal: AbortSignal.any([signal, timeoutSignal]) })
  }

  // iOS 16 等の AbortSignal.any 未対応環境ではリスナーリークを避けつつ手動で合成する
  const { signal: combinedSignal, cleanup } = combineSignals(signal, timeoutSignal)
  return fetch(input, { ...rest, signal: combinedSignal }).finally(cleanup)
}
