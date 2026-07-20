import { fetchWithTimeout } from '@trend-diary/runtime/http'
import { ClientError, ServerError } from '@trend-diary/std/errors'
import { notifySessionExpired } from '@/client/entities/session'
import getApiClientForClient from '@/client/infrastructure/api'

interface ApiCallResponse {
  ok: boolean
  status: number
  statusText: string
  // oxlint-disable-next-line typescript/no-restricted-types -- 検証前の JSON は型が定まらず、呼び出し側のジェネリック T へ橋渡しするため
  json: () => Promise<unknown>
}

const toHttpError = (status: number, statusText: string) => {
  // 認証必須APIの401はセッション切れとして一箇所で案内する
  if (status === 401) {
    notifySessionExpired()
  }

  return status >= 500 ? new ServerError(statusText, status) : new ClientError(statusText, status)
}

const fetcher = async <T>(url: string): Promise<T> => {
  // 応答が遅い相手で画面がハングするのを防ぐ
  const response = await fetchWithTimeout(url, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw toHttpError(response.status, response.statusText)
  }

  return response.safeJson<T>()
}

const apiCall = async <T>(request: () => Promise<ApiCallResponse>): Promise<T | null> => {
  const response = await request()

  if (!response.ok) {
    throw toHttpError(response.status, response.statusText)
  }

  switch (response.status) {
    case 204:
      return null
    default:
      // oxlint-disable-next-line typescript/consistent-type-assertions -- JSON デシリアライズ結果は実行時まで型が定まらず、呼び出し側が指定するジェネリック T へ橋渡しする境界のため許可する
      return (await response.json()) as T
  }
}

// fetcher / apiCall はモジュールスコープで定義済み、client も getApiClientForClient 側でシングルトン化されているため、軽量なオブジェクトリテラルを返すだけでよい
const createSWRFetcher = () => ({
  fetcher,
  apiCall,
  client: getApiClientForClient(),
})

export default createSWRFetcher
