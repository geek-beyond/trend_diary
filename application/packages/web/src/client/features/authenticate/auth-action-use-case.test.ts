import { describe, expect, it, vi } from 'vitest'
import { resolveSupabaseAuthConfig } from './auth-action-use-case'

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
