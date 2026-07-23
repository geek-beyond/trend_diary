import { describe, expect, it, vi } from 'vitest'
import { UnexpectedAuthError } from '../errors'
import { authClientConfig, type AuthRequestContext } from './supabase-client'

// Cookie の入出力とバックエンド生成は実 Supabase(supa-emu)を要するため web 統合テストで担保する。
// ここでは Supabase を起動せず検証できる authClientConfig の組み立てのみを対象にする。
function buildContext(env: AuthRequestContext['env'], cookie?: string): AuthRequestContext {
  return {
    env,
    req: { header: () => cookie },
    header: vi.fn(),
  }
}

describe('authClientConfig', () => {
  describe('正常系', () => {
    it('env と Cookie から設定を組み立てること', () => {
      const context = buildContext(
        { SUPABASE_URL: 'http://localhost:54321', SUPABASE_ANON_KEY: 'anon-key' },
        'sb-token=value',
      )

      const config = authClientConfig(context)
      config.setCookie('serialized-cookie')

      expect(config.url).toBe('http://localhost:54321')
      expect(config.anonKey).toBe('anon-key')
      expect(config.cookieHeader).toBe('sb-token=value')
      // setCookie は Set-Cookie を append で書き込むこと
      expect(context.header).toHaveBeenCalledWith('Set-Cookie', 'serialized-cookie', {
        append: true,
      })
    })

    it('Cookie ヘッダーが無いときは空文字とすること', () => {
      const config = authClientConfig(
        buildContext({ SUPABASE_URL: 'http://localhost:54321', SUPABASE_ANON_KEY: 'anon-key' }),
      )

      expect(config.cookieHeader).toBe('')
    })
  })

  describe('異常系', () => {
    it.each([
      { name: 'URL 未設定', env: { SUPABASE_ANON_KEY: 'anon-key' } },
      { name: 'anonKey 未設定', env: { SUPABASE_URL: 'http://localhost:54321' } },
      { name: '両方未設定', env: {} },
    ])('$name のとき UnexpectedAuthError を投げること', ({ env }) => {
      expect(() => authClientConfig(buildContext(env))).toThrow(UnexpectedAuthError)
    })
  })
})
