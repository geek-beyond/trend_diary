import { describe, expect, it, vi } from 'vitest'
import { resolveSupabaseAuthConfig, shouldUseSecureCookie } from './auth-action-use-case'

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

describe('shouldUseSecureCookie', () => {
  it('NODE_ENVがdevelopmentのときはsecure=false', () => {
    vi.stubEnv('NODE_ENV', 'development')
    try {
      expect(shouldUseSecureCookie()).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('NODE_ENVがdevelopment以外のときはsecure=true', () => {
    vi.stubEnv('NODE_ENV', 'test')
    try {
      expect(shouldUseSecureCookie()).toBe(true)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
