interface TurnstileContext {
  cloudflare?: {
    env?: { TURNSTILE_SITE_KEY?: string }
  }
}

function readEnv(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Turnstileのサイトキー（公開値）をcontext優先・なければprocess.envの順で解決する。
 * 未設定の場合はundefinedを返し、ウィジェットを描画しない。
 */
export function resolveTurnstileSiteKey(context: TurnstileContext): string | undefined {
  const fromContext = readEnv(context.cloudflare?.env?.TURNSTILE_SITE_KEY)
  if (fromContext) return fromContext
  if (typeof process === 'undefined') return undefined
  return readEnv(process.env.TURNSTILE_SITE_KEY)
}
