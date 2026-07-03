import { describe, expect, it } from 'vitest'
import { resolvePasskeyEnabled } from './passkey'

describe('resolvePasskeyEnabled', () => {
  it.each([
    {
      name: "PASSKEY_ENABLEDが'true'のときは有効",
      context: { cloudflare: { env: { PASSKEY_ENABLED: 'true' } } },
      expected: true,
    },
    {
      name: "'false'のときは無効",
      context: { cloudflare: { env: { PASSKEY_ENABLED: 'false' } } },
      expected: false,
    },
    {
      name: '未設定のときは無効',
      context: { cloudflare: { env: {} } },
      expected: false,
    },
    {
      name: 'contextが空でも無効を返す',
      context: {},
      expected: false,
    },
    {
      name: "'true'以外の文字列は無効",
      context: { cloudflare: { env: { PASSKEY_ENABLED: 'TRUE' } } },
      expected: false,
    },
  ])('$name', ({ context, expected }) => {
    expect(resolvePasskeyEnabled(context)).toBe(expected)
  })
})
