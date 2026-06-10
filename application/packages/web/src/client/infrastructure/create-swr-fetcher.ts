import { ClientError, ServerError } from '@trend-diary/common/errors'
import { fetchWithTimeout } from '@trend-diary/common/http'
import getApiClientForClient from '@/client/infrastructure/api'

interface ApiCallResponse {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

const toHttpError = (status: number, statusText: string) =>
  status >= 500 ? new ServerError(statusText, status) : new ClientError(statusText, status)

export const createSWRFetcher = () => {
  const client = getApiClientForClient()

  const fetcher = async <T>(url: string): Promise<T> => {
    // 応答が遅い相手で画面がハングするのを防ぐ
    const response = await fetchWithTimeout(url, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw toHttpError(response.status, response.statusText)
    }

    return response.json()
  }

  const apiCall = async <T>(apiCall: () => Promise<ApiCallResponse>): Promise<T | null> => {
    const response = await apiCall()

    if (!response.ok) {
      throw toHttpError(response.status, response.statusText)
    }

    switch (response.status) {
      case 204:
        return null
      default:
        return (await response.json()) as T
    }
  }

  return {
    fetcher,
    apiCall,
    client,
  }
}

export default createSWRFetcher
