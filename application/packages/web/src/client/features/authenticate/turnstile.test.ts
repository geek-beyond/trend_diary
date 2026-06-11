import { describe, expect, it, vi } from 'vitest'
import { resolveTurnstileSiteKey } from './turnstile'

describe('resolveTurnstileSiteKey', () => {
  it('context.cloudflare.envにあるサイトキーを優先する', () => {
    const siteKey = resolveTurnstileSiteKey({
      cloudflare: { env: { TURNSTILE_SITE_KEY: 'context-site-key' } },
    })
    expect(siteKey).toBe('context-site-key')
  })

  it('contextに設定がなければprocess.envを使う', () => {
    vi.stubEnv('TURNSTILE_SITE_KEY', 'process-site-key')
    try {
      expect(resolveTurnstileSiteKey({})).toBe('process-site-key')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('未設定の場合はundefinedを返す', () => {
    vi.unstubAllEnvs()
    expect(resolveTurnstileSiteKey({ cloudflare: { env: {} } })).toBeUndefined()
  })

  it('空文字や空白のみの場合はundefinedを返す', () => {
    expect(
      resolveTurnstileSiteKey({ cloudflare: { env: { TURNSTILE_SITE_KEY: '  ' } } }),
    ).toBeUndefined()
  })
})
