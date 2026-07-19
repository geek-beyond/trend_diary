import { apiRequest } from '@/test/helper/request'

// 対応プロバイダはparam検証(oauthProviderParamSchema)で絞り、未対応プロバイダはハンドラへ到達させず
// 422で弾く。新規プロバイダ追加時の受け入れ範囲をこの境界で担保する
describe('OAuthプロバイダのparam検証', () => {
  describe('準正常系', () => {
    it.each([
      { name: 'login', path: '/api/oauth/google/login' },
      { name: 'callback', path: '/api/oauth/google/callback' },
    ])('未対応プロバイダの$nameは422を返す', async ({ path }) => {
      const res = await apiRequest(path)

      expect(res.status).toBe(422)
    })
  })
})
