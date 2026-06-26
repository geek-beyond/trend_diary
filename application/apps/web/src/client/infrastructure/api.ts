import getApiClient from '@/infrastructure/api'

let apiUrl = ''

// useEffectとかの中で実行するか、このファイルが読み込まれるタイミングを制御する
if (typeof document !== 'undefined') {
  apiUrl = `${window.location.protocol}//${window.location.host}`
}

// レンダーごとの再生成を避けるため、モジュールスコープで単一インスタンスを遅延生成して保持する
let apiClient: ReturnType<typeof getApiClient> | undefined

const getApiClientForClient = () => {
  apiClient ??= getApiClient(apiUrl)
  return apiClient
}
export default getApiClientForClient
