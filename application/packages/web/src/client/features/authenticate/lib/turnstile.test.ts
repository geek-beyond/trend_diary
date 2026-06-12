import { describe, expect, it } from 'vitest'
import { resolveTurnstileSiteKey } from './turnstile'

describe('resolveTurnstileSiteKey', () => {
  it.each([
    {
      name: 'context.cloudflare.envのサイトキーを返す',
      context: { cloudflare: { env: { TURNSTILE_SITE_KEY: 'context-site-key' } } },
      expected: 'context-site-key',
    },
    {
      name: '未設定の場合はundefinedを返しウィジェットを描画させない',
      context: { cloudflare: { env: {} } },
      expected: undefined,
    },
    {
      name: 'シークレット側（c.env参照）と設定ソースを揃えるため、process.envへはフォールバックしない',
      context: {},
      expected: undefined,
    },
    {
      name: '空文字や空白のみの場合はundefinedを返す',
      context: { cloudflare: { env: { TURNSTILE_SITE_KEY: '  ' } } },
      expected: undefined,
    },
  ])('$name', ({ context, expected }) => {
    expect(resolveTurnstileSiteKey(context)).toBe(expected)
  })
})
