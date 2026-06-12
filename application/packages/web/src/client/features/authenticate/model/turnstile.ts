interface TurnstileContext {
  cloudflare?: {
    env?: { TURNSTILE_SITE_KEY?: string }
  }
}

/**
 * サイトキー未設定の環境ではCAPTCHAをエラーにせずウィジェット非表示で運用するため、undefinedを返す。
 * シークレット側（API handlerのc.env参照）と設定ソースを揃えるため、process.envへはフォールバックしない。
 */
export function resolveTurnstileSiteKey(context: TurnstileContext): string | undefined {
  const value = context.cloudflare?.env?.TURNSTILE_SITE_KEY?.trim()
  return value ? value : undefined
}
