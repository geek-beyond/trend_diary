import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { isDevelopmentNodeEnv } from '@/common/env'
import { createAuthUseCase } from '@/domain/user'
import getRdbClient from '@/infrastructure/rdb'

type D1Database = import('@cloudflare/workers-types').D1Database

type AuthActionBindings = {
  DB?: D1Database
  DATABASE_URL?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
}

type AuthActionContext = {
  cloudflare?: {
    env?: AuthActionBindings
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

export function shouldUseSecureCookie() {
  return !isDevelopmentNodeEnv()
}

export function resolveSupabaseAuthConfig(context: AuthActionContext) {
  const env = context.cloudflare?.env
  const supabaseUrl = readEnv(env?.SUPABASE_URL) ?? readNodeEnv('SUPABASE_URL')
  const supabaseAnonKey = readEnv(env?.SUPABASE_ANON_KEY) ?? readNodeEnv('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(AUTH_CONFIG_ERROR_MESSAGE)
  }

  return { env, supabaseUrl, supabaseAnonKey }
}

export function createAuthActionUseCase(request: Request, context: AuthActionContext) {
  const headers = new Headers()
  const { env, supabaseUrl, supabaseAnonKey } = resolveSupabaseAuthConfig(context)

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
            secure: shouldUseSecureCookie(),
            sameSite: 'lax' as const,
            ...options,
          }
          headers.append('Set-Cookie', serializeCookieHeader(name, value, mergedOptions))
        })
      },
    },
  })

  const rdb = getRdbClient({ db: env?.DB, databaseUrl: env?.DATABASE_URL })
  const useCase = createAuthUseCase(client, rdb)

  return {
    headers,
    useCase,
  }
}
