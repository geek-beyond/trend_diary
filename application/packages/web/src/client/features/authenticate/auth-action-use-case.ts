import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase } from '@trend-diary/domain/user'
import type { AppLoadContext } from 'react-router'

type SupabaseAuthContext = {
  cloudflare?: {
    env?: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string }
  }
}

const AUTH_CONFIG_ERROR_MESSAGE =
  'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.'

function readEnv(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function readNodeEnv(key: 'SUPABASE_URL' | 'SUPABASE_ANON_KEY') {
  if (typeof process === 'undefined') {
    return undefined
  }
  return readEnv(process.env[key])
}

export function resolveSupabaseAuthConfig(context: SupabaseAuthContext) {
  const env = context.cloudflare?.env
  const supabaseUrl = readEnv(env?.SUPABASE_URL) ?? readNodeEnv('SUPABASE_URL')
  const supabaseAnonKey = readEnv(env?.SUPABASE_ANON_KEY) ?? readNodeEnv('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(AUTH_CONFIG_ERROR_MESSAGE)
  }

  return { supabaseUrl, supabaseAnonKey }
}

export function createAuthActionUseCase(request: Request, context: AppLoadContext) {
  const headers = new Headers()
  const { supabaseUrl, supabaseAnonKey } = resolveSupabaseAuthConfig(context)

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').map((cookie) => ({
          name: cookie.name,
          value: cookie.value ?? '',
        }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const mergedOptions = {
            httpOnly: true,
            secure: !__IS_DEV__,
            sameSite: 'lax' as const,
            ...options,
          }
          headers.append('Set-Cookie', serializeCookieHeader(name, value, mergedOptions))
        })
      },
    },
  })

  const rdb = getRdbClient(context.cloudflare.env.DB)
  const useCase = createAuthUseCase(client, rdb)

  return {
    headers,
    useCase,
  }
}
