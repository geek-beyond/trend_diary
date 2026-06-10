import { describe, expect, it, vi } from 'vitest'
import {
  resolveSupabaseAuthConfig,
  resolveTurnstileSecret,
  resolveTurnstileSiteKey,
} from './auth-action-use-case'

describe('resolveSupabaseAuthConfig', () => {
  it('context.cloudflare.envにあるSupabase設定を優先する', () => {
    const config = resolveSupabaseAuthConfig({
      cloudflare: {
        env: {
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_ANON_KEY: 'anon-key',
        },
      },
    })

    expect(config.supabaseUrl).toBe('https://example.supabase.co')
    expect(config.supabaseAnonKey).toBe('anon-key')
  })

  it('contextに設定がなければprocess.envを使う', () => {
    vi.stubEnv('SUPABASE_URL', 'https://process.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'process-anon-key')

    try {
      const config = resolveSupabaseAuthConfig({})
      expect(config.supabaseUrl).toBe('https://process.supabase.co')
      expect(config.supabaseAnonKey).toBe('process-anon-key')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('Supabase設定が両方そろわない場合はエラーにする', () => {
    vi.unstubAllEnvs()
    expect(() =>
      resolveSupabaseAuthConfig({
        cloudflare: {
          env: {
            SUPABASE_URL: 'https://example.supabase.co',
          },
        },
      }),
    ).toThrow('Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.')
  })
})

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

describe('resolveTurnstileSecret', () => {
  it('context.cloudflare.envにあるシークレットキーを優先する', () => {
    const secret = resolveTurnstileSecret({
      cloudflare: { env: { TURNSTILE_SECRET_KEY: 'context-secret' } },
    })
    expect(secret).toBe('context-secret')
  })

  it('contextに設定がなければprocess.envを使う', () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'process-secret')
    try {
      expect(resolveTurnstileSecret({})).toBe('process-secret')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('未設定の場合はundefinedを返す', () => {
    vi.unstubAllEnvs()
    expect(resolveTurnstileSecret({ cloudflare: { env: {} } })).toBeUndefined()
  })
})
