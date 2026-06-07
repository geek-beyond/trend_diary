import getApiClient from '@/infrastructure/api'

let apiUrl = ''

// useEffectとかの中で実行するか、このファイルが読み込まれるタイミングを制御する
if (typeof document !== 'undefined') {
  apiUrl = `${window.location.protocol}//${window.location.host}`
}

const getApiClientForClient = () => getApiClient(apiUrl)
export default getApiClientForClient
