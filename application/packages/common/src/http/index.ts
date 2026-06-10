type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>

// 応答が遅い相手でハングするとWorkersの実行時間制限に直結するため、共通の既定値を設ける
export const DEFAULT_FETCH_TIMEOUT_MS = 5000

export interface FetchWithTimeoutOptions {
  timeoutMs?: number
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
  // 呼び出し元が渡したsignalによる中断とタイムアウトの両方を尊重する
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
  return fetch(input, { ...rest, signal: combinedSignal })
}
