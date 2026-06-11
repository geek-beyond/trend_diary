import { describe, expect, it } from 'vitest'
import { resolveTurnstileSiteKey } from './turnstile'

describe('resolveTurnstileSiteKey', () => {
  it('context.cloudflare.envのサイトキーを返す', () => {
    const siteKey = resolveTurnstileSiteKey({
      cloudflare: { env: { TURNSTILE_SITE_KEY: 'context-site-key' } },
    })
    expect(siteKey).toBe('context-site-key')
  })

  it('未設定の場合はundefinedを返しウィジェットを描画させない', () => {
    expect(resolveTurnstileSiteKey({ cloudflare: { env: {} } })).toBeUndefined()
  })

  it('シークレット側（c.env参照）と設定ソースを揃えるため、process.envへはフォールバックしない', () => {
    expect(resolveTurnstileSiteKey({})).toBeUndefined()
  })

  it('空文字や空白のみの場合はundefinedを返す', () => {
    expect(
      resolveTurnstileSiteKey({ cloudflare: { env: { TURNSTILE_SITE_KEY: '  ' } } }),
    ).toBeUndefined()
  })
})
