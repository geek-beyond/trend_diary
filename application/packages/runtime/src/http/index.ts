type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>

/**
 * fetchWithTimeout が返す Response の拡張。
 *
 * 標準の `json()` は `any` を返し型安全でないため、呼び出し側が指定する型として
 * ボディを取得する `safeJson<T>()` を追加し、型宣言やアサーションの重複を防ぐ。
 */
export interface FetchWithTimeoutResponse extends Response {
  safeJson<T>(): Promise<T>
}

// JSON は実行時まで型が確定しないため、型適用を safeJson に集約して Response へ付与する
const attachSafeJson = (response: Response): FetchWithTimeoutResponse =>
  Object.assign(response, {
    safeJson: async <T>(): Promise<T> => {
      // oxlint-disable-next-line typescript/consistent-type-assertions -- JSON デシリアライズ結果は実行時まで型が定まらず、呼び出し側が指定する T へ橋渡しする境界のため許可する
      return (await response.json()) as T
    },
  })

// 応答が遅い相手でハングするとWorkersの実行時間制限に直結するため、共通の既定値を設ける
export const DEFAULT_FETCH_TIMEOUT_MS = 5000

export interface FetchWithTimeoutOptions {
  timeoutMs?: number
}

const noop = () => undefined

// AbortSignal.any 未対応環境向けに、複数signalのいずれかの中断を伝播する合成signalを生成する。
// 中断後はリスナーを解放できるよう、解放用のクリーンアップ関数もあわせて返す。
const combineSignals = (signals: AbortSignal[]): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController()

  const alreadyAborted = signals.find((signal) => signal.aborted)
  if (alreadyAborted) {
    controller.abort(alreadyAborted.reason)
    // 既に中断済みでリスナーを登録しないため、解放処理は不要
    return { signal: controller.signal, cleanup: noop }
  }

  const removers = signals.map((signal) => {
    const onAbort = () => controller.abort(signal.reason)
    signal.addEventListener('abort', onAbort)
    return () => signal.removeEventListener('abort', onAbort)
  })

  const cleanup = () => removers.forEach((remove) => remove())
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
): Promise<FetchWithTimeoutResponse> => {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal, ...rest } = init
  const timeoutSignal = AbortSignal.timeout(timeoutMs)

  // 呼び出し元のsignalが無ければタイムアウトのみを適用する
  if (!signal) {
    return fetch(input, { ...rest, signal: timeoutSignal }).then(attachSafeJson)
  }

  // AbortSignal.any はリスナー解放まで内部で面倒を見るため、対応環境では優先利用する
  if (typeof AbortSignal.any === 'function') {
    return fetch(input, { ...rest, signal: AbortSignal.any([signal, timeoutSignal]) }).then(
      attachSafeJson,
    )
  }

  // iOS 16 等の AbortSignal.any 未対応環境ではリスナーリークを避けつつ手動で合成する
  const { signal: combinedSignal, cleanup } = combineSignals([signal, timeoutSignal])
  return fetch(input, { ...rest, signal: combinedSignal })
    .finally(cleanup)
    .then(attachSafeJson)
}
