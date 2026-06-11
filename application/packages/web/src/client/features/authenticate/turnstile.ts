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
 * サイトキー未設定の環境ではCAPTCHAをエラーにせずウィジェット非表示で運用するため、undefinedを返す。
 */
export function resolveTurnstileSiteKey(context: TurnstileContext): string | undefined {
  const fromContext = readEnv(context.cloudflare?.env?.TURNSTILE_SITE_KEY)
  if (fromContext) return fromContext
  if (typeof process === 'undefined') return undefined
  return readEnv(process.env.TURNSTILE_SITE_KEY)
}
