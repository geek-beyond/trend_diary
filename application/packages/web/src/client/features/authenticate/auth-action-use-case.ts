import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import Logger from '@trend-diary/common/logger'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase } from '@trend-diary/domain/user'
import { DiscordWebhookClient } from '@trend-diary/notification'
import type { AppLoadContext } from 'react-router'

interface SupabaseAuthContext {
  cloudflare?: {
    env?: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string }
  }
}

interface TurnstileContext {
  cloudflare?: {
    env?: { TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string }
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

/**
 * Turnstileのサイトキー（公開値）を解決する。未設定の場合はundefinedを返し、ウィジェットを描画しない。
 */
export function resolveTurnstileSiteKey(context: TurnstileContext): string | undefined {
  const fromContext = readEnv(context.cloudflare?.env?.TURNSTILE_SITE_KEY)
  if (fromContext) return fromContext
  if (typeof process === 'undefined') return undefined
  return readEnv(process.env.TURNSTILE_SITE_KEY)
}

/**
 * Turnstileのシークレットキーを解決する。未設定の場合はundefinedを返し、サーバー側の検証をスキップする。
 */
export function resolveTurnstileSecret(context: TurnstileContext): string | undefined {
  const fromContext = readEnv(context.cloudflare?.env?.TURNSTILE_SECRET_KEY)
  if (fromContext) return fromContext
  if (typeof process === 'undefined') return undefined
  return readEnv(process.env.TURNSTILE_SECRET_KEY)
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
            secure: true,
            sameSite: 'lax' as const,
            ...options,
          }
          headers.append('Set-Cookie', serializeCookieHeader(name, value, mergedOptions))
        })
      },
    },
  })

  const rdb = getRdbClient(context.cloudflare.env.DB)
  const useCase = createAuthUseCase(client, rdb, resolveTurnstileSecret(context))
  const logger = new Logger(context.cloudflare.env.LOG_LEVEL ?? 'info', {
    module: 'web/client/features/authenticate/auth-action-use-case',
  })
  const notifier = new DiscordWebhookClient(context.cloudflare.env.DISCORD_WEBHOOK_URL, logger)

  return {
    headers,
    useCase,
    notifier,
  }
}
